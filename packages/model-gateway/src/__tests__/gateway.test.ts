import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { DeterministicModelProvider } from '../providers/deterministic.ts'
import {
  BudgetGuard,
  InMemoryCostBudgetStore,
  budgetScopeKeys
} from '../budget.ts'
import { CircuitBreaker } from '../circuit-breaker.ts'
import { computeRetryDelayMs, isRetryable } from '../retry.ts'
import { ModelGatewayError, ModelProviderError } from '../errors.ts'
import { ModelRouter } from '../router.ts'
import {
  PromptRegistry,
  PromptRegistryError,
  computePromptSha256
} from '../prompt-registry.ts'
import { ModelGateway } from '../gateway.ts'
import type {
  ModelGatewayRequest,
  ModelProfile,
  ProviderRequest
} from '../contracts.ts'

const TENANT = 'tenant_00000000-0000-4000-8000-000000000001'
const NOW = new Date('2026-09-11T12:00:00.000Z')

function baseRequest(
  overrides: Partial<ModelGatewayRequest> = {}
): ModelGatewayRequest {
  return {
    requestId: 'req_test_00000001',
    tenantId: TENANT,
    correlationId: 'corr_00000000-0000-4000-8000-000000000001',
    promptId: 'secretary-core',
    promptVersion: '1.0.0',
    modelProfile: 'fast',
    dataClassification: 'INTERNAL',
    input: { messages: [{ role: 'user', content: 'ola' }] },
    ...overrides
  }
}

function approvedPromptRegistry(): PromptRegistry {
  const registry = new PromptRegistry()
  registry.register({
    promptId: 'secretary-core',
    version: '1.0.0',
    content: 'You are the CVG secretary assistant.',
    owner: 'platform',
    approvedBy: 'reviewer',
    status: 'approved',
    effectiveFrom: '2026-09-01T00:00:00.000Z',
    classification: 'INTERNAL',
    tenantId: TENANT
  })
  return registry
}

function profile(
  name: ModelProfile['name'],
  overrides: Partial<ModelProfile> = {}
): ModelProfile {
  return {
    name,
    providerId: 'deterministic',
    model: 'deterministic-v1',
    location: 'local',
    temperature: 0,
    maxTokens: 512,
    timeoutMs: 1_000,
    maxCostUsd: 1,
    estimatedCostUsd: 0.001,
    maxRetries: 2,
    pricing: { inputPer1kUsd: 0.01, outputPer1kUsd: 0.02 },
    ...overrides
  }
}

describe('model gateway', () => {
  it('returns structured output, usage and cost on the happy path', async () => {
    const events: string[] = []
    const provider = new DeterministicModelProvider({
      respond: () => ({
        text: JSON.stringify({ intent: 'agendar', confidence: 0.9 }),
        usage: { inputTokens: 1000, outputTokens: 500 },
        providerId: 'deterministic',
        model: 'deterministic-v1',
        externalCall: false
      })
    })
    const gateway = new ModelGateway({
      providers: [provider],
      profiles: { fast: profile('fast') },
      prompts: approvedPromptRegistry(),
      clock: () => NOW,
      onEvent: (event) => events.push(event.type)
    })

    const result = await gateway.generate({
      ...baseRequest(),
      structuredOutput: {
        schemaName: 'AgentDecision',
        schema: z.object({ intent: z.string(), confidence: z.number() })
      }
    })

    expect(result.output.structured).toEqual({
      intent: 'agendar',
      confidence: 0.9
    })
    expect(result.usage).toEqual({ inputTokens: 1000, outputTokens: 500 })
    expect(result.costUsd).toBeCloseTo(0.02, 6)
    expect(result.attempts).toBe(1)
    expect(result.promptSha256).toHaveLength(64)
    expect(result.fallbackUsed).toBe(false)
    expect(events).toContain('model.call.started')
    expect(events).toContain('model.call.completed')
  })

  it('fails closed when structured output is invalid JSON or shape', async () => {
    const gatewayFor = (text: string) =>
      new ModelGateway({
        providers: [
          new DeterministicModelProvider({
            respond: () => ({
              text,
              usage: { inputTokens: 0, outputTokens: 0 },
              providerId: 'deterministic',
              model: 'deterministic-v1',
              externalCall: false
            })
          })
        ],
        profiles: { fast: profile('fast', { maxRetries: 2 }) },
        prompts: approvedPromptRegistry(),
        clock: () => NOW
      })
    const contract = {
      schemaName: 'AgentDecision',
      schema: z.object({ intent: z.string() })
    }

    await expect(
      gatewayFor('not-json').generate({
        ...baseRequest(),
        structuredOutput: contract
      })
    ).rejects.toMatchObject({ code: 'schema_invalid' })
    await expect(
      gatewayFor('{"other":true}').generate({
        ...baseRequest(),
        structuredOutput: contract
      })
    ).rejects.toMatchObject({ code: 'schema_invalid' })
  })

  it('enforces a real deadline and retries only bounded times', async () => {
    let calls = 0
    const provider = new DeterministicModelProvider({
      respond: (request: ProviderRequest) => {
        calls += 1
        return new Promise((_resolve, reject) => {
          request.signal.addEventListener('abort', () => {
            const error = new Error('aborted')
            error.name = 'AbortError'
            reject(error)
          })
        })
      }
    })
    const sleep = vi.fn(async () => undefined)
    const gateway = new ModelGateway({
      providers: [provider],
      profiles: { fast: profile('fast', { timeoutMs: 200, maxRetries: 2 }) },
      prompts: approvedPromptRegistry(),
      clock: () => NOW,
      sleep
    })

    await expect(
      gateway.generate(baseRequest({ timeoutMs: 200 }))
    ).rejects.toMatchObject({ code: 'provider_timeout', retryable: true })
    expect(calls).toBe(3)
    expect(sleep).toHaveBeenCalledTimes(2)
  })

  it('cancels immediately when the caller aborts', async () => {
    const provider = new DeterministicModelProvider({
      respond: (request: ProviderRequest) =>
        new Promise((_resolve, reject) => {
          request.signal.addEventListener('abort', () => {
            const error = new Error('aborted')
            error.name = 'AbortError'
            reject(error)
          })
        })
    })
    const gateway = new ModelGateway({
      providers: [provider],
      profiles: { fast: profile('fast', { timeoutMs: 5_000 }) },
      prompts: approvedPromptRegistry(),
      clock: () => NOW
    })
    const controller = new AbortController()
    const pending = gateway.generate({
      ...baseRequest(),
      signal: controller.signal
    })
    controller.abort()
    await expect(pending).rejects.toMatchObject({ code: 'cancelled' })
  })

  it('retries retryable provider errors with bounded backoff and jitter', async () => {
    let calls = 0
    const provider = new DeterministicModelProvider({
      respond: () => {
        calls += 1
        if (calls < 3) {
          throw new ModelProviderError(
            'deterministic',
            'rate_limited',
            'slow down',
            429
          )
        }
        return {
          text: 'ok',
          usage: { inputTokens: 10, outputTokens: 5 },
          providerId: 'deterministic',
          model: 'deterministic-v1',
          externalCall: false
        }
      }
    })
    const delays: number[] = []
    const gateway = new ModelGateway({
      providers: [provider],
      profiles: { fast: profile('fast') },
      prompts: approvedPromptRegistry(),
      clock: () => NOW,
      random: () => 0.5,
      retry: { baseDelayMs: 100, maxDelayMs: 1_000, jitterRatio: 0.2 },
      sleep: async (ms) => {
        delays.push(ms)
      }
    })

    const result = await gateway.generate(baseRequest())
    expect(result.attempts).toBe(3)
    expect(delays).toEqual([90, 180])
  })

  it('never retries auth, invalid request or schema errors', async () => {
    let calls = 0
    const provider = new DeterministicModelProvider({
      respond: () => {
        calls += 1
        throw new ModelProviderError('deterministic', 'auth', 'nope', 401)
      }
    })
    const gateway = new ModelGateway({
      providers: [provider],
      profiles: { fast: profile('fast') },
      prompts: approvedPromptRegistry(),
      clock: () => NOW,
      sleep: async () => undefined
    })
    await expect(gateway.generate(baseRequest())).rejects.toMatchObject({
      code: 'provider_auth_failed',
      retryable: false
    })
    expect(calls).toBe(1)
  })

  it('denies over-budget calls before invoking the provider', async () => {
    const execute = vi.fn()
    const provider = new DeterministicModelProvider({ respond: execute })
    const store = new InMemoryCostBudgetStore()
    store.consume(budgetScopeKeys(baseRequest(), NOW).tenant ?? '', 0.9)
    const gateway = new ModelGateway({
      providers: [provider],
      profiles: { fast: profile('fast', { estimatedCostUsd: 0.2 }) },
      prompts: approvedPromptRegistry(),
      clock: () => NOW,
      budget: { store, limits: { tenant: 1 } }
    })

    await expect(gateway.generate(baseRequest())).rejects.toMatchObject({
      code: 'budget_exceeded'
    })
    expect(execute).not.toHaveBeenCalled()
  })

  it('settles actual cost above the reserved estimate conservatively', async () => {
    const store = new InMemoryCostBudgetStore()
    const gateway = new ModelGateway({
      providers: [
        new DeterministicModelProvider({
          respond: () => ({
            text: 'ok',
            usage: { inputTokens: 1000, outputTokens: 1000 },
            providerId: 'deterministic',
            model: 'deterministic-v1',
            externalCall: false
          })
        })
      ],
      profiles: { fast: profile('fast', { estimatedCostUsd: 0.001 }) },
      prompts: approvedPromptRegistry(),
      clock: () => NOW,
      budget: { store, limits: { tenant: 1, request: 1, day: 1 } }
    })

    await gateway.generate(baseRequest())
    expect(store.consumed(`tenant:${TENANT}`)).toBeCloseTo(0.03, 6)
  })

  it('opens the circuit, blocks abusive calls and recovers through half-open', async () => {
    let nowMs = NOW.getTime()
    const breaker = new CircuitBreaker({
      failureThreshold: 2,
      openMs: 1_000,
      halfOpenSuccesses: 1,
      clock: () => nowMs
    })
    let mode: 'fail' | 'succeed' = 'fail'
    let calls = 0
    const provider = new DeterministicModelProvider({
      respond: () => {
        calls += 1
        if (mode === 'fail') {
          throw new ModelProviderError(
            'deterministic',
            'unavailable',
            'down',
            503
          )
        }
        return {
          text: 'recovered',
          usage: { inputTokens: 0, outputTokens: 0 },
          providerId: 'deterministic',
          model: 'deterministic-v1',
          externalCall: false
        }
      }
    })
    const gateway = new ModelGateway({
      providers: [provider],
      profiles: { fast: profile('fast', { maxRetries: 0 }) },
      prompts: approvedPromptRegistry(),
      clock: () => new Date(nowMs),
      circuitBreaker: breaker,
      sleep: async () => undefined
    })

    await expect(gateway.generate(baseRequest())).rejects.toMatchObject({
      code: 'provider_unavailable'
    })
    await expect(gateway.generate(baseRequest())).rejects.toMatchObject({
      code: 'provider_unavailable'
    })
    expect(breaker.state('deterministic:deterministic-v1')).toBe('OPEN')
    const callsBeforeOpen = calls
    await expect(gateway.generate(baseRequest())).rejects.toMatchObject({
      code: 'circuit_open'
    })
    expect(calls).toBe(callsBeforeOpen)

    nowMs += 1_001
    mode = 'succeed'
    const result = await gateway.generate(baseRequest())
    expect(result.output.text).toBe('recovered')
    expect(breaker.state('deterministic:deterministic-v1')).toBe('CLOSED')
  })

  it('rejects invalid requests before touching providers', async () => {
    const respond = vi.fn()
    const gateway = new ModelGateway({
      providers: [new DeterministicModelProvider({ respond })],
      profiles: { fast: profile('fast') },
      prompts: approvedPromptRegistry(),
      clock: () => NOW
    })
    await expect(
      gateway.generate({ ...baseRequest(), tenantId: 'evil' })
    ).rejects.toMatchObject({ code: 'invalid_request' })
    expect(respond).not.toHaveBeenCalled()
  })

  it('truncates oversized model output to the configured budget', async () => {
    const gateway = new ModelGateway({
      providers: [
        new DeterministicModelProvider({
          respond: () => ({
            text: 'x'.repeat(500),
            usage: { inputTokens: 0, outputTokens: 0 },
            providerId: 'deterministic',
            model: 'deterministic-v1',
            externalCall: false
          })
        })
      ],
      profiles: { fast: profile('fast') },
      prompts: approvedPromptRegistry(),
      clock: () => NOW,
      maxOutputChars: 32
    })
    const result = await gateway.generate(baseRequest())
    expect(result.output.text).toHaveLength(32)
  })
})

describe('prompt registry', () => {
  it('fails closed for unknown, unapproved, revoked, expired and mismatched prompts', () => {
    const registry = new PromptRegistry()
    registry.register({
      promptId: 'p',
      version: '1',
      content: 'draft',
      owner: 'o',
      status: 'draft',
      effectiveFrom: '2026-01-01T00:00:00.000Z',
      tenantId: TENANT
    })
    registry.register({
      promptId: 'p',
      version: '2',
      content: 'revoked',
      owner: 'o',
      status: 'revoked',
      effectiveFrom: '2026-01-01T00:00:00.000Z',
      tenantId: TENANT
    })
    registry.register({
      promptId: 'p',
      version: '3',
      content: 'expired',
      owner: 'o',
      status: 'approved',
      approvedBy: 'r',
      effectiveFrom: '2026-01-01T00:00:00.000Z',
      effectiveUntil: '2026-02-01T00:00:00.000Z',
      tenantId: TENANT
    })
    registry.register({
      promptId: 'p',
      version: '4',
      content: 'future',
      owner: 'o',
      status: 'approved',
      approvedBy: 'r',
      effectiveFrom: '2027-01-01T00:00:00.000Z',
      tenantId: TENANT
    })

    expect(() =>
      registry.resolve({ promptId: 'x', version: '1' }, { at: NOW })
    ).toThrow(PromptRegistryError)
    expect(() =>
      registry.resolve({ promptId: 'p', version: '1' }, { at: NOW })
    ).toThrowError(/not approved/)
    expect(() =>
      registry.resolve({ promptId: 'p', version: '2' }, { at: NOW })
    ).toThrowError(/revoked/)
    expect(() =>
      registry.resolve({ promptId: 'p', version: '3' }, { at: NOW })
    ).toThrowError(/expired/)
    expect(() =>
      registry.resolve({ promptId: 'p', version: '4' }, { at: NOW })
    ).toThrowError(/not effective yet/)
    expect(() =>
      registry.resolve(
        { promptId: 'p', version: '4', sha256: 'a'.repeat(64) },
        { at: NOW }
      )
    ).toThrowError(/not effective yet/)

    const approved = registry.register({
      promptId: 'p',
      version: '5',
      content: 'approved',
      owner: 'o',
      status: 'approved',
      approvedBy: 'r',
      effectiveFrom: '2026-01-01T00:00:00.000Z',
      tenantId: TENANT
    })
    expect(computePromptSha256('approved')).toBe(approved.sha256)
    expect(() =>
      registry.resolve(
        { promptId: 'p', version: '5', sha256: 'b'.repeat(64) },
        { at: NOW, tenantId: TENANT }
      )
    ).toThrowError(/hash/)
    expect(() =>
      registry.resolve(
        { promptId: 'p', version: '5' },
        { at: NOW, tenantId: 'tenant_00000000-0000-4000-8000-0000000000ff' }
      )
    ).toThrowError(/tenant/)
  })

  it('rejects duplicate prompt versions with different content', () => {
    const registry = new PromptRegistry()
    const input = {
      promptId: 'p',
      version: '1',
      content: 'a',
      owner: 'o',
      status: 'approved' as const,
      approvedBy: 'r',
      effectiveFrom: '2026-01-01T00:00:00.000Z'
    }
    registry.register(input)
    expect(() => registry.register({ ...input, content: 'b' })).toThrow(
      /different content/
    )
  })
})

describe('retry, budget and router units', () => {
  it('computes deterministic bounded backoff with jitter', () => {
    const policy = {
      maxRetries: 3,
      baseDelayMs: 100,
      maxDelayMs: 250,
      jitterRatio: 0.2
    }
    expect(computeRetryDelayMs({ attempt: 1, policy, random: () => 0.5 })).toBe(
      90
    )
    expect(computeRetryDelayMs({ attempt: 2, policy, random: () => 0.5 })).toBe(
      180
    )
    expect(computeRetryDelayMs({ attempt: 3, policy, random: () => 0.5 })).toBe(
      225
    )
    expect(
      isRetryable(
        new ModelGatewayError('provider_unavailable', 'x', { retryable: true })
      )
    ).toBe(true)
    expect(isRetryable(new Error('x'))).toBe(false)
  })

  it('reserves and settles budget atomically per scope', () => {
    const store = new InMemoryCostBudgetStore()
    const guard = new BudgetGuard({
      store,
      limits: { tenant: 1, request: 0.1 },
      clock: () => NOW
    })
    const request = baseRequest()
    const first = guard.authorize({ request, estimatedCostUsd: 0.05 })
    expect(first.allowed).toBe(true)
    expect(store.consumed(`tenant:${TENANT}`)).toBeCloseTo(0.05, 6)
    const second = guard.authorize({ request, estimatedCostUsd: 0.08 })
    expect(second.allowed).toBe(false)
    guard.settle({
      reservedKeys: first.reservedKeys,
      estimatedCostUsd: 0.05,
      actualCostUsd: 0.02
    })
    expect(store.consumed(`tenant:${TENANT}`)).toBeCloseTo(0.05, 6)
  })

  it('denies external profiles for clinical data and never falls back to a weaker location', () => {
    const external = profile('balanced', {
      location: 'external',
      providerId: 'openai'
    })
    const local = profile('local', { location: 'local' })
    const strictRouter = new ModelRouter(
      { balanced: external, local },
      { allowFallback: true }
    )
    expect(() =>
      strictRouter.resolve({
        requestedProfile: 'balanced',
        dataClassification: 'CLINICAL'
      })
    ).toThrowError(/not allowed/)
    expect(strictRouter.fallbackFor(local)).toBeUndefined()

    const permissive = new ModelRouter(
      { balanced: external, local },
      { allowLocalSubstitution: true }
    )
    const route = permissive.resolve({
      requestedProfile: 'balanced',
      dataClassification: 'CONFIDENTIAL'
    })
    expect(route.profile.name).toBe('local')
    expect(route.substitutedProfile).toBe('balanced')
  })
})
