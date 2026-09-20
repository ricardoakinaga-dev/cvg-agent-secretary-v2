import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import {
  ApprovalEngine,
  ApprovalError,
  InMemoryApprovalStore,
  type ApprovalAuthority,
  type ApprovalRecord
} from '@cvg/approval-engine'
import {
  DeterministicModelProvider,
  ModelGateway,
  PromptRegistry
} from '@cvg/model-gateway'
import type { ModelProfile, ModelResult } from '@cvg/model-gateway'
import { PolicyEngine, type Capability } from '@cvg/policy-engine'
import { HashChainedAuditLedger, InMemoryTelemetry } from '@cvg/observability'
import { GovernedAgentRuntime } from '../runtime.ts'
import {
  EffectJournalError,
  type EffectConfirmRef,
  type EffectFailRef,
  type EffectJournalPort,
  type EffectRecord,
  type EffectReserveInput,
  type EffectReserveOutcome,
  type EffectUncertainRef
} from '../effect-journal.ts'
import { ToolExecutionError } from '../contracts.ts'
import type {
  EffectScope,
  GovernedTurnInput,
  OutboxEnqueueInput,
  ToolInvocation
} from '../contracts.ts'

const TENANT = 'tenant_00000000-0000-4000-8000-0000000000c2'
const AGENT = 'agent_00000000-0000-4000-8000-0000000000c2'
const CORRELATION = 'corr_00000000-0000-4000-8000-0000000000c2'
const NOW = new Date('2026-09-16T12:00:00.000Z')
const PAYLOAD_SCHEMA = z.object({ text: z.string() })

const MODIFY_SCOPE: Partial<Record<Capability, EffectScope>> = {
  'appointment.modify': 'controlled_fake'
}

function policyDocument(
  rule: {
    id: string
    effect: 'ALLOW' | 'DENY' | 'REQUIRE_APPROVAL'
    capabilities: Capability[]
    resourceTypes?: string[]
  },
  version = '1.0.0'
) {
  return {
    policyId: 'tenant.branch-hardening',
    version,
    tenantId: TENANT,
    effectiveFrom: '2026-09-01T00:00:00.000Z',
    rules: [
      {
        priority: 10,
        reason: `synthetic ${rule.effect}`,
        ...rule
      }
    ]
  }
}

function effectRecord(overrides: Partial<EffectRecord> = {}): EffectRecord {
  return {
    tenantId: TENANT,
    operationKey: 'op:synthetic',
    proposalHash: 'a'.repeat(64),
    attemptId: 'att_synthetic',
    state: 'CONFIRMED',
    executionRef: 'exec_synthetic',
    resultDigest: 'b'.repeat(64),
    errorCode: null,
    reason: null,
    expiresAt: new Date(NOW.getTime() + 60_000).toISOString(),
    reconciledBy: null,
    reconciliationEvidenceRef: null,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    revision: 1,
    ...overrides
  }
}

/**
 * Scriptable journal: every outcome/error arm can be exercised without a
 * database while the runtime still sees the real EffectJournalPort contract.
 */
class ProgrammableJournal implements EffectJournalPort {
  readonly reserveInputs: EffectReserveInput[] = []
  readonly reserveQueue: Array<EffectReserveOutcome | Error> = []
  readonly getQueue: Array<EffectRecord | undefined> = []
  readonly uncertainReasons: string[] = []
  readonly failedEffectCodes: string[] = []
  readonly confirmedInputs: EffectConfirmRef[] = []
  fallbackRecord: EffectRecord | undefined
  fallbackReserve: EffectReserveOutcome = { outcome: 'reserved' }
  markEffectStartedError: unknown
  confirmError: unknown

  private record(): EffectRecord {
    return this.fallbackRecord ?? effectRecord()
  }

  async reserve(input: EffectReserveInput): Promise<EffectReserveOutcome> {
    this.reserveInputs.push(input)
    if (this.reserveQueue.length > 0) {
      const next = this.reserveQueue.shift()
      if (next instanceof Error) throw next
      if (next !== undefined) return next
    }
    return this.fallbackReserve
  }

  async markEffectStarted(): Promise<EffectRecord> {
    if (this.markEffectStartedError !== undefined) {
      throw this.markEffectStartedError
    }
    return this.record()
  }

  async confirmEffect(ref: EffectConfirmRef): Promise<EffectRecord> {
    this.confirmedInputs.push(ref)
    if (this.confirmError !== undefined) throw this.confirmError
    return this.record()
  }

  async failEffect(ref: EffectFailRef): Promise<EffectRecord> {
    this.failedEffectCodes.push(ref.errorCode)
    return this.record()
  }

  async markUncertain(ref: EffectUncertainRef): Promise<EffectRecord> {
    this.uncertainReasons.push(ref.reason)
    return this.record()
  }

  async get(): Promise<EffectRecord | undefined> {
    if (this.getQueue.length > 0) return this.getQueue.shift()
    return this.fallbackRecord
  }

  async releaseExpired(): Promise<number> {
    return 0
  }

  async reconcile(): Promise<EffectRecord> {
    return this.record()
  }
}

function wrapAuthority(
  engine: ApprovalEngine,
  overrides: Partial<ApprovalAuthority> = {}
): ApprovalAuthority {
  return {
    request: (input) => engine.request(input),
    submit: (tenantId, approvalId, actorId) =>
      engine.submit(tenantId, approvalId, actorId),
    approve: (tenantId, approvalId, input) =>
      engine.approve(tenantId, approvalId, input),
    reject: (tenantId, approvalId, input) =>
      engine.reject(tenantId, approvalId, input),
    cancel: (tenantId, approvalId, actorId) =>
      engine.cancel(tenantId, approvalId, actorId),
    verifyAndConsume: (input) => engine.verifyAndConsume(input),
    reserve: (input) => engine.reserve(input),
    markExecuting: (input) => engine.markExecuting(input),
    confirm: (input) => engine.confirm(input),
    release: (input) => engine.release(input),
    fail: (input) => engine.fail(input),
    markUncertain: (input) => engine.markUncertain(input),
    reconcile: (input) => engine.reconcile(input),
    expireStale: (now?: Date) => engine.expireStale(now),
    releaseExpired: (input) => engine.releaseExpired(input),
    list: (tenantId, status) => engine.list(tenantId, status),
    get: (tenantId, approvalId) => engine.get(tenantId, approvalId),
    ...overrides
  }
}

interface HarnessOptions {
  documents?: NonNullable<
    ConstructorParameters<typeof PolicyEngine>[0]
  >['documents']
  effectScopes?: Partial<Record<Capability, EffectScope>>
  requireDurable?: boolean
  journal?: EffectJournalPort
  reservationTtlMs?: number
  toolExecutor?: (invocation: ToolInvocation) => Promise<{ result: unknown }>
  outbox?: (event: OutboxEnqueueInput) => Promise<{ eventId: string }>
  authorityOverrides?: Partial<ApprovalAuthority>
  modelGateway?: ModelGateway
}

function buildHarness(options: HarnessOptions = {}) {
  const clock = () => NOW
  const prompts = new PromptRegistry()
  prompts.register({
    promptId: 'branch-hardening-core',
    version: '1.0.0',
    content: 'You are the CVG secretary.',
    owner: 'platform',
    approvedBy: 'reviewer',
    status: 'approved',
    effectiveFrom: '2026-09-01T00:00:00.000Z',
    classification: 'INTERNAL',
    tenantId: TENANT
  })
  const provider = new DeterministicModelProvider({
    respond: () => ({
      text: JSON.stringify({ text: 'APPROVED_PAYLOAD' }),
      usage: { inputTokens: 10, outputTokens: 5 },
      providerId: 'deterministic',
      model: 'deterministic-v1',
      externalCall: false
    })
  })
  const profile: ModelProfile = {
    name: 'fast',
    providerId: 'deterministic',
    model: 'deterministic-v1',
    location: 'local',
    temperature: 0,
    maxTokens: 256,
    timeoutMs: 5_000,
    maxCostUsd: 1,
    estimatedCostUsd: 0,
    maxRetries: 0,
    pricing: { inputPer1kUsd: 0, outputPer1kUsd: 0 }
  }
  const modelGateway =
    options.modelGateway ??
    new ModelGateway({
      providers: [provider],
      profiles: { fast: profile },
      prompts,
      clock,
      retry: { maxRetries: 0 }
    })
  const policy = new PolicyEngine({
    documents: options.documents ?? [],
    clock
  })
  const store = new InMemoryApprovalStore()
  const engine = new ApprovalEngine({ store, clock })
  const approvals = wrapAuthority(engine, options.authorityOverrides)
  const telemetry = new InMemoryTelemetry({ clock })
  const audit = new HashChainedAuditLedger()
  const toolExecutor = vi.fn(
    options.toolExecutor ?? (async () => ({ result: { synthetic: true } }))
  )
  const outbox = vi.fn(
    options.outbox ??
      (async (event: OutboxEnqueueInput) => ({
        eventId: `evt_${event.idempotencyKey}`
      }))
  )
  const runtime = new GovernedAgentRuntime({
    policy,
    approvals,
    modelGateway,
    telemetry,
    audit,
    toolExecutor,
    outbox,
    clock,
    effectScopes: options.effectScopes ?? MODIFY_SCOPE,
    ...(options.requireDurable !== undefined
      ? { requireDurable: options.requireDurable }
      : {}),
    ...(options.journal !== undefined
      ? { effectJournal: options.journal }
      : {}),
    ...(options.reservationTtlMs !== undefined
      ? { reservationTtlMs: options.reservationTtlMs }
      : {})
  })
  return {
    runtime,
    engine,
    store,
    journal: options.journal,
    toolExecutor,
    outbox
  }
}

type Harness = ReturnType<typeof buildHarness>

function turnInput(
  overrides: Partial<GovernedTurnInput> = {}
): GovernedTurnInput {
  return {
    tenantId: TENANT,
    operatorId: 'op_1',
    operatorRole: 'Supervisor',
    agentId: AGENT,
    agentVersion: 'v1',
    agentProfile: 'secretary',
    conversationId: 'conv_1',
    correlationId: CORRELATION,
    capability: 'appointment.modify',
    action: 'appointment.modify',
    resource: { type: 'appointment_draft', id: 'draft_1', tenantId: TENANT },
    dataClassification: 'INTERNAL',
    prompt: { promptId: 'branch-hardening-core', version: '1.0.0' },
    modelProfile: 'fast',
    modelMessages: { messages: [{ role: 'user', content: 'atualizar' }] },
    structuredOutput: { schemaName: 'PayloadContract', schema: PAYLOAD_SCHEMA },
    ...overrides
  }
}

function requireApprovalPolicy(capability: Capability) {
  return [
    policyDocument({
      id: `require-${capability}`,
      effect: 'REQUIRE_APPROVAL',
      capabilities: [capability],
      resourceTypes: ['appointment_draft']
    })
  ]
}

function allowPolicy(capability: Capability) {
  return [
    policyDocument({
      id: `allow-${capability}`,
      effect: 'ALLOW',
      capabilities: [capability],
      resourceTypes: ['appointment_draft']
    })
  ]
}

async function requestAndApprove(
  harness: Harness,
  input: Partial<GovernedTurnInput> = {}
): Promise<ApprovalRecord> {
  const requested = await harness.runtime.runTurn(turnInput(input))
  expect(requested.outcome).toBe('approval_required')
  const approvalId = requested.approvalId ?? ''
  expect(approvalId).not.toBe('')
  harness.engine.submit(TENANT, approvalId, 'op_1')
  harness.engine.approve(TENANT, approvalId, { approverId: 'op_2' })
  return harness.engine.get(TENANT, approvalId)
}

function expireReservation(
  harness: Harness,
  approvalId: string
): ApprovalRecord {
  const record = harness.store.get(TENANT, approvalId)
  if (record === undefined) throw new Error('synthetic approval missing')
  const expired: ApprovalRecord = {
    ...record,
    reservationExpiresAt: new Date(NOW.getTime() - 1_000).toISOString()
  }
  harness.store.insert(expired)
  return expired
}

function noSweep(harness: Harness): void {
  harness.engine.releaseExpired = () => ({ released: 0, uncertain: 0 })
}

describe('runtime request-turn durable journal branches', () => {
  it('reserves with caller key and orchestration lineage and replays without a tool call', async () => {
    const journal = new ProgrammableJournal()
    journal.reserveQueue.push({
      outcome: 'replay',
      record: effectRecord({
        executionRef: 'exec_replay',
        resultDigest: 'c'.repeat(64)
      })
    })
    const harness = buildHarness({
      documents: allowPolicy('appointment.modify'),
      requireDurable: true,
      journal
    })

    const result = await harness.runtime.runTurn(
      turnInput({
        idempotencyKey: 'caller-replay-key',
        orchestrationContext: {
          goalId: 'goal_synthetic',
          planId: 'plan_synthetic',
          stepId: 'step_synthetic'
        }
      })
    )

    expect(result.outcome).toBe('executed')
    expect(result.replayed).toBe(true)
    expect(result.effectConfirmed).toBe(true)
    expect(result.executionRef).toBe('exec_replay')
    expect(result.resultDigest).toBe('c'.repeat(64))
    expect(harness.toolExecutor).not.toHaveBeenCalled()
    expect(journal.reserveInputs[0]).toMatchObject({
      orchestrationContext: {
        goalId: 'goal_synthetic',
        planId: 'plan_synthetic',
        stepId: 'step_synthetic'
      }
    })
    expect(harness.outbox).toHaveBeenCalledWith(
      expect.objectContaining({
        orchestrationContext: {
          goalId: 'goal_synthetic',
          planId: 'plan_synthetic',
          stepId: 'step_synthetic'
        }
      })
    )
  })

  it('falls back to the trace id when a replay record has no execution ref or digest', async () => {
    const journal = new ProgrammableJournal()
    journal.reserveQueue.push({
      outcome: 'replay',
      record: effectRecord({ executionRef: null, resultDigest: null })
    })
    const harness = buildHarness({
      documents: allowPolicy('appointment.modify'),
      requireDurable: true,
      journal
    })

    const result = await harness.runtime.runTurn(turnInput())

    expect(result.outcome).toBe('executed')
    expect(result.replayed).toBe(true)
    expect(result.executionRef).toBe(`exec_${result.traceId}`)
    expect(result.resultDigest).toBeUndefined()
    expect(harness.toolExecutor).not.toHaveBeenCalled()
  })

  it('denies with operation_in_progress when the journal holds a live reservation', async () => {
    const journal = new ProgrammableJournal()
    journal.reserveQueue.push({ outcome: 'in_progress' })
    const harness = buildHarness({
      documents: allowPolicy('appointment.modify'),
      requireDurable: true,
      journal
    })

    const result = await harness.runtime.runTurn(turnInput())

    expect(result.outcome).toBe('denied')
    expect(result.reason).toBe('operation_in_progress')
    expect(harness.toolExecutor).not.toHaveBeenCalled()
  })

  it('denies with operation_uncertain when the journal is uncertain', async () => {
    const journal = new ProgrammableJournal()
    journal.reserveQueue.push({
      outcome: 'uncertain',
      record: effectRecord({ state: 'UNCERTAIN' })
    })
    const harness = buildHarness({
      documents: allowPolicy('appointment.modify'),
      requireDurable: true,
      journal
    })

    const result = await harness.runtime.runTurn(turnInput())

    expect(result.outcome).toBe('denied')
    expect(result.reason).toBe('operation_uncertain')
    expect(harness.toolExecutor).not.toHaveBeenCalled()
  })

  it('fails closed with the journal error code when markEffectStarted fails', async () => {
    const journal = new ProgrammableJournal()
    journal.markEffectStartedError = new EffectJournalError(
      'invalid_transition',
      'synthetic transition failure'
    )
    const harness = buildHarness({
      documents: allowPolicy('appointment.modify'),
      requireDurable: true,
      journal
    })

    const result = await harness.runtime.runTurn(turnInput())

    expect(result.outcome).toBe('denied')
    expect(result.reason).toBe('invalid_transition')
    expect(journal.failedEffectCodes).toEqual(['effect_reservation_failed'])
    expect(harness.toolExecutor).not.toHaveBeenCalled()
  })

  it('maps a non-Error journal failure to journal_unavailable and fails closed', async () => {
    const journal = new ProgrammableJournal()
    journal.markEffectStartedError = 'synthetic unknown failure'
    const harness = buildHarness({
      documents: allowPolicy('appointment.modify'),
      requireDurable: true,
      journal
    })

    const result = await harness.runtime.runTurn(turnInput())

    expect(result.outcome).toBe('denied')
    expect(result.reason).toBe('journal_unavailable')
    expect(harness.toolExecutor).not.toHaveBeenCalled()
  })

  it('never calls failEffect when the reserve itself failed without an attempt identity', async () => {
    const journal = new ProgrammableJournal()
    journal.reserveQueue.push(
      new EffectJournalError('journal_unavailable', 'synthetic reserve failure')
    )
    const harness = buildHarness({
      documents: allowPolicy('appointment.modify'),
      requireDurable: true,
      journal
    })

    const result = await harness.runtime.runTurn(turnInput())

    expect(result.outcome).toBe('denied')
    expect(result.reason).toBe('journal_unavailable')
    expect(journal.failedEffectCodes).toEqual([])
  })

  it('releases the effect reservation when the tool budget denies execution', async () => {
    const journal = new ProgrammableJournal()
    const harness = buildHarness({
      documents: allowPolicy('appointment.modify'),
      requireDurable: true,
      journal
    })

    const result = await harness.runtime.runTurn(
      turnInput({ limits: { maxToolCalls: 0 } })
    )

    expect(result.outcome).toBe('denied')
    expect(result.reason).toBe('tool_calls_exhausted')
    expect(journal.failedEffectCodes).toEqual(['tool_calls_exhausted'])
    expect(harness.toolExecutor).not.toHaveBeenCalled()
  })

  it('marks the effect uncertain when the tool stalls past cancellation with a durable journal', async () => {
    const journal = new ProgrammableJournal()
    const controller = new AbortController()
    const harness = buildHarness({
      documents: allowPolicy('appointment.modify'),
      requireDurable: true,
      journal,
      toolExecutor: async () => {
        controller.abort()
        return { result: { synthetic: true } }
      }
    })

    const result = await harness.runtime.runTurn(
      turnInput({ cancelSignal: controller.signal })
    )

    expect(result.outcome).toBe('denied')
    expect(result.reason).toBe('turn_cancelled')
    expect(journal.uncertainReasons).toEqual(['turn_cancelled'])
  })

  it('fails the effect when the tool reports no_effect certainty', async () => {
    const journal = new ProgrammableJournal()
    const harness = buildHarness({
      documents: allowPolicy('appointment.modify'),
      requireDurable: true,
      journal,
      toolExecutor: async () => {
        throw new ToolExecutionError('draft_write_rejected', 'no effect', {
          certainty: 'no_effect'
        })
      }
    })

    const result = await harness.runtime.runTurn(turnInput())

    expect(result.outcome).toBe('denied')
    expect(result.reason).toBe('draft_write_rejected')
    expect(journal.failedEffectCodes).toEqual(['draft_write_rejected'])
    expect(journal.uncertainReasons).toEqual([])
  })

  it('keeps the effect uncertain on a non-Error tool failure', async () => {
    const journal = new ProgrammableJournal()
    const harness = buildHarness({
      documents: allowPolicy('appointment.modify'),
      requireDurable: true,
      journal,
      toolExecutor: async () => {
        throw 'synthetic non-error tool failure'
      }
    })

    const result = await harness.runtime.runTurn(turnInput())

    expect(result.outcome).toBe('denied')
    expect(result.reason).toBe('effect_uncertain')
    expect(
      journal.uncertainReasons.some((reason) =>
        reason.includes('tool failure without proof of no effect')
      )
    ).toBe(true)
  })

  it('maps an Error tool failure to effect_uncertain for durable effects', async () => {
    const journal = new ProgrammableJournal()
    const harness = buildHarness({
      documents: allowPolicy('appointment.modify'),
      requireDurable: true,
      journal,
      toolExecutor: async () => {
        throw new Error('synthetic tool exploded')
      }
    })

    const result = await harness.runtime.runTurn(turnInput())

    expect(result.outcome).toBe('denied')
    expect(result.reason).toBe('effect_uncertain')
    expect(journal.uncertainReasons).toHaveLength(1)
  })

  it('denies effect_uncertain when the journal confirm throws an Error', async () => {
    const journal = new ProgrammableJournal()
    journal.confirmError = new Error('synthetic confirm exploded')
    const harness = buildHarness({
      documents: allowPolicy('appointment.modify'),
      requireDurable: true,
      journal
    })

    const result = await harness.runtime.runTurn(turnInput())

    expect(result.outcome).toBe('denied')
    expect(result.reason).toBe('effect_uncertain')
    expect(
      journal.uncertainReasons.some((reason) =>
        reason.includes('effect confirm failed: synthetic confirm exploded')
      )
    ).toBe(true)
  })

  it('denies effect_uncertain when the journal confirm throws a non-Error', async () => {
    const journal = new ProgrammableJournal()
    journal.confirmError = 'synthetic confirm string'
    const harness = buildHarness({
      documents: allowPolicy('appointment.modify'),
      requireDurable: true,
      journal
    })

    const result = await harness.runtime.runTurn(turnInput())

    expect(result.outcome).toBe('denied')
    expect(result.reason).toBe('effect_uncertain')
    expect(
      journal.uncertainReasons.some((reason) =>
        reason.includes('effect confirm failed: unknown')
      )
    ).toBe(true)
  })

  it('reports outbox_pending when the outbox budget denies after a confirmed effect', async () => {
    const journal = new ProgrammableJournal()
    const harness = buildHarness({
      documents: allowPolicy('appointment.modify'),
      requireDurable: true,
      journal
    })

    const result = await harness.runtime.runTurn(
      turnInput({ limits: { maxSteps: 2 } })
    )

    expect(result.outcome).toBe('denied')
    expect(result.reason).toBe('steps_budget_exceeded')
    expect(result.outboxPending).toBe(true)
    expect(result.effectConfirmed).toBe(true)
    expect(result.executionRef).toBe(`exec_${result.traceId}`)
    expect(result.resultDigest).toMatch(/^[0-9a-f]{64}$/)
  })

  it('returns an executed turn with pending outbox when the outbox throws after a confirmed effect', async () => {
    const journal = new ProgrammableJournal()
    const harness = buildHarness({
      documents: allowPolicy('appointment.modify'),
      requireDurable: true,
      journal,
      outbox: async () => {
        throw new Error('synthetic outbox failure')
      }
    })

    const result = await harness.runtime.runTurn(turnInput())

    expect(result.outcome).toBe('executed')
    expect(result.reason).toBe('outbox_pending')
    expect(result.outboxPending).toBe(true)
    expect(result.effectConfirmed).toBe(true)
    expect(result.executionRef).toBe(`exec_${result.traceId}`)
    expect(result.resultDigest).toMatch(/^[0-9a-f]{64}$/)
  })

  it('omits the result digest when a replayed effect fails the outbox', async () => {
    const journal = new ProgrammableJournal()
    journal.reserveQueue.push({
      outcome: 'replay',
      record: effectRecord({
        executionRef: 'exec_replay',
        resultDigest: null
      })
    })
    const harness = buildHarness({
      documents: allowPolicy('appointment.modify'),
      requireDurable: true,
      journal,
      outbox: async () => {
        throw new Error('synthetic outbox failure')
      }
    })

    const result = await harness.runtime.runTurn(turnInput())

    expect(result.outcome).toBe('executed')
    expect(result.reason).toBe('outbox_pending')
    expect(result.effectConfirmed).toBe(true)
    expect(result.executionRef).toBe('exec_replay')
    expect(result.resultDigest).toBeUndefined()
  })

  it('runs the tenant expiry hook and records the inbound continuation before approval', async () => {
    let expired = 0
    const harness = buildHarness({
      documents: requireApprovalPolicy('appointment.modify'),
      authorityOverrides: {
        expireStaleForTenant: async () => {
          expired += 1
          return 0
        }
      }
    })

    const withoutSession = await harness.runtime.runTurn(
      turnInput({ inboundMessageId: 'msg_synthetic_without_session' })
    )
    expect(withoutSession.outcome).toBe('approval_required')
    const first = harness.engine.get(TENANT, withoutSession.approvalId ?? '')
    expect(first.continuation).toMatchObject({
      conversationId: 'conv_1',
      sessionId: null,
      inboundMessageId: 'msg_synthetic_without_session'
    })

    const withSession = await harness.runtime.runTurn(
      turnInput({
        inboundMessageId: 'msg_synthetic_with_session',
        sessionId: 'sess_synthetic'
      })
    )
    const second = harness.engine.get(TENANT, withSession.approvalId ?? '')
    expect(second.continuation).toMatchObject({
      sessionId: 'sess_synthetic',
      inboundMessageId: 'msg_synthetic_with_session'
    })
    expect(expired).toBe(2)
  })

  it('denies approval_invalid when the authority cannot reserve the approval', async () => {
    const store = new InMemoryApprovalStore()
    const engine = new ApprovalEngine({ store, clock: () => NOW })
    const policy = new PolicyEngine({
      documents: requireApprovalPolicy('appointment.modify'),
      clock: () => NOW
    })
    const prompts = new PromptRegistry()
    prompts.register({
      promptId: 'branch-hardening-core',
      version: '1.0.0',
      content: 'synthetic',
      owner: 'platform',
      approvedBy: 'reviewer',
      status: 'approved',
      effectiveFrom: '2026-09-01T00:00:00.000Z',
      classification: 'INTERNAL',
      tenantId: TENANT
    })
    const runtime = new GovernedAgentRuntime({
      policy,
      approvals: wrapAuthority(engine, { reserve: () => undefined as never }),
      modelGateway: new ModelGateway({
        providers: [
          new DeterministicModelProvider({
            respond: () => ({
              text: JSON.stringify({ text: 'APPROVED_PAYLOAD' }),
              usage: { inputTokens: 10, outputTokens: 5 },
              providerId: 'deterministic',
              model: 'deterministic-v1',
              externalCall: false
            })
          })
        ],
        profiles: {
          fast: {
            name: 'fast',
            providerId: 'deterministic',
            model: 'deterministic-v1',
            location: 'local',
            temperature: 0,
            maxTokens: 256,
            timeoutMs: 5_000,
            maxCostUsd: 1,
            estimatedCostUsd: 0,
            maxRetries: 0,
            pricing: { inputPer1kUsd: 0, outputPer1kUsd: 0 }
          }
        },
        prompts,
        clock: () => NOW,
        retry: { maxRetries: 0 }
      }),
      telemetry: new InMemoryTelemetry({ clock: () => NOW }),
      audit: new HashChainedAuditLedger(),
      toolExecutor: async () => ({ result: { synthetic: true } }),
      outbox: async () => ({ eventId: 'evt_synthetic' }),
      clock: () => NOW,
      effectScopes: MODIFY_SCOPE
    })

    const requested = await runtime.runTurn(turnInput())
    expect(requested.outcome).toBe('approval_required')
    const approvalId = requested.approvalId ?? ''
    engine.submit(TENANT, approvalId, 'op_1')
    engine.approve(TENANT, approvalId, { approverId: 'op_2' })

    const execution = await runtime.runTurn(turnInput({ approvalId }))
    expect(execution.outcome).toBe('denied')
    expect(execution.reason).toBe('approval_invalid')
  })
})

describe('runtime proposal and execution-turn branch edges', () => {
  function mockGateway(result: Partial<ModelResult>): ModelGateway {
    return {
      generate: async () => ({
        requestId: 'req_synthetic',
        tenantId: TENANT,
        correlationId: CORRELATION,
        providerId: 'synthetic',
        model: 'synthetic',
        profile: 'fast',
        output: { text: '{}' },
        usage: { inputTokens: 1, outputTokens: 1 },
        costUsd: 0,
        attempts: 1,
        latencyMs: 1,
        promptSha256: 'f'.repeat(64),
        createdAt: NOW.toISOString(),
        fallbackUsed: false,
        ...result
      })
    } as unknown as ModelGateway
  }

  it('denies with the proposal error code when the payload is not canonicalizable', async () => {
    const harness = buildHarness({
      documents: requireApprovalPolicy('appointment.modify'),
      modelGateway: mockGateway({
        output: { text: '{}', structured: { big: BigInt(42) } }
      })
    })

    const result = await harness.runtime.runTurn(turnInput())

    expect(result.outcome).toBe('denied')
    expect(result.reason).toBe('proposal_payload_invalid')
  })

  it('maps an unexpected proposal failure to the generic proposal_invalid code', async () => {
    const harness = buildHarness({
      documents: requireApprovalPolicy('appointment.modify'),
      modelGateway: mockGateway({
        output: { text: '{}', structured: { text: 'SYNTHETIC' } }
      })
    })
    let versionReads = 0
    const prompt = {
      promptId: 'branch-hardening-core',
      get version(): string {
        versionReads += 1
        if (versionReads > 1) {
          throw new TypeError('synthetic prompt version failure')
        }
        return '1.0.0'
      }
    }

    const result = await harness.runtime.runTurn(
      turnInput({ prompt: prompt as GovernedTurnInput['prompt'] })
    )

    expect(result.outcome).toBe('denied')
    expect(result.reason).toBe('proposal_invalid')
  })

  it('requests an approval without a prompt version when none was declared', async () => {
    const harness = buildHarness({
      documents: requireApprovalPolicy('appointment.modify'),
      modelGateway: mockGateway({
        output: { text: '{}', structured: { text: 'SYNTHETIC' } }
      })
    })

    const result = await harness.runtime.runTurn(
      turnInput({
        prompt: {
          promptId: 'branch-hardening-core'
        } as GovernedTurnInput['prompt']
      })
    )

    expect(result.outcome).toBe('approval_required')
    const record = harness.engine.get(TENANT, result.approvalId ?? '')
    expect(record.promptVersion).toBeUndefined()
  })

  it('denies an execution turn without a journal when the tool budget is exhausted', async () => {
    const harness = buildHarness({
      documents: requireApprovalPolicy('schedule.read')
    })
    const approved = await requestAndApprove(harness, {
      capability: 'schedule.read',
      action: 'schedule.read',
      resource: { type: 'appointment_draft', id: 'draft_read' }
    })

    const result = await harness.runtime.runTurn(
      turnInput({
        capability: 'schedule.read',
        action: 'schedule.read',
        resource: { type: 'appointment_draft', id: 'draft_read' },
        approvalId: approved.approvalId,
        limits: { maxToolCalls: 0 }
      })
    )

    expect(result.outcome).toBe('denied')
    expect(result.reason).toBe('tool_calls_exhausted')
    expect(harness.toolExecutor).not.toHaveBeenCalled()
  })

  it('omits the result digest when approval confirmation fails without a journal', async () => {
    const harness = buildHarness({
      documents: requireApprovalPolicy('schedule.read'),
      authorityOverrides: {
        confirm: () => {
          throw new ApprovalError(
            'invalid_state',
            'synthetic confirmation failure'
          )
        }
      }
    })
    const approved = await requestAndApprove(harness, {
      capability: 'schedule.read',
      action: 'schedule.read',
      resource: { type: 'appointment_draft', id: 'draft_read' }
    })

    const result = await harness.runtime.runTurn(
      turnInput({
        capability: 'schedule.read',
        action: 'schedule.read',
        resource: { type: 'appointment_draft', id: 'draft_read' },
        approvalId: approved.approvalId
      })
    )

    expect(result.outcome).toBe('denied')
    expect(result.reason).toBe('approval_confirm_failed')
    expect(result.effectConfirmed).toBe(true)
    expect(result.executionRef).toBe(`exec_${result.traceId}`)
    expect(result.resultDigest).toBeUndefined()
  })
})

describe('runtime replay and reservation recovery branches', () => {
  it('denies already_executed when a replay record has no proposal hash', async () => {
    const journal = new ProgrammableJournal()
    const harness = buildHarness({
      documents: requireApprovalPolicy('appointment.modify'),
      journal
    })
    const requested = await harness.runtime.runTurn(turnInput())
    const approvalId = requested.approvalId ?? ''
    const record = harness.engine.get(TENANT, approvalId)
    const executed = { ...record, status: 'EXECUTED' as const }
    delete executed.proposalHash
    delete executed.proposalPayload
    harness.store.insert(executed)

    const result = await harness.runtime.runTurn(turnInput({ approvalId }))

    expect(result.outcome).toBe('denied')
    expect(result.reason).toBe('already_executed')
  })

  it('replays a legacy executed approval through the recomputed operation key', async () => {
    const journal = new ProgrammableJournal()
    const harness = buildHarness({
      documents: requireApprovalPolicy('appointment.modify'),
      journal
    })
    const requested = await harness.runtime.runTurn(turnInput())
    const approvalId = requested.approvalId ?? ''
    const record = harness.engine.get(TENANT, approvalId)
    const legacy = { ...record, status: 'EXECUTED' as const }
    delete legacy.operationKey
    harness.store.insert(legacy)
    const proposalHash = record.proposalHash ?? ''
    journal.fallbackRecord = effectRecord({
      operationKey: 'op:legacy-replay',
      proposalHash,
      state: 'CONFIRMED',
      executionRef: 'exec_legacy_replay',
      resultDigest: 'd'.repeat(64)
    })

    const result = await harness.runtime.runTurn(
      turnInput({
        approvalId,
        orchestrationContext: {
          goalId: 'goal_legacy_replay',
          planId: 'plan_legacy_replay',
          stepId: 'step_legacy_replay'
        }
      })
    )

    expect(result.outcome).toBe('executed')
    expect(result.reason).toBe('idempotent_replay')
    expect(result.replayed).toBe(true)
    expect(result.executionRef).toBe('exec_legacy_replay')
    expect(harness.toolExecutor).not.toHaveBeenCalled()
    expect(journal.uncertainReasons).toEqual([])
    expect(harness.outbox).toHaveBeenCalledWith(
      expect.objectContaining({
        orchestrationContext: {
          goalId: 'goal_legacy_replay',
          planId: 'plan_legacy_replay',
          stepId: 'step_legacy_replay'
        }
      })
    )
  })

  it('denies an expired legacy approval with no persisted operation key', async () => {
    const journal = new ProgrammableJournal()
    const harness = buildHarness({
      documents: requireApprovalPolicy('appointment.modify'),
      journal,
      reservationTtlMs: 60_000
    })
    noSweep(harness)
    const requested = await harness.runtime.runTurn(turnInput())
    const approvalId = requested.approvalId ?? ''
    const record = harness.engine.get(TENANT, approvalId)
    harness.engine.submit(TENANT, approvalId, 'op_1')
    harness.engine.approve(TENANT, approvalId, { approverId: 'op_2' })
    harness.engine.reserve({
      tenantId: TENANT,
      approvalId,
      action: record.action,
      resource: record.resource,
      payload: record.proposalPayload,
      proposalHash: record.proposalHash,
      agentId: AGENT,
      agentVersion: 'v1',
      policyVersion: record.policyVersion,
      capability: 'appointment.modify',
      ttlMs: 60_000
    })
    harness.engine.markExecuting({
      tenantId: TENANT,
      approvalId,
      reservationId: harness.engine.get(TENANT, approvalId).reservationId ?? ''
    })
    expireReservation(harness, approvalId)

    const result = await harness.runtime.runTurn(turnInput({ approvalId }))

    expect(result.outcome).toBe('denied')
    expect(result.reason).toBe('operation_uncertain')
    expect(harness.toolExecutor).not.toHaveBeenCalled()
    expect(journal.reserveInputs).toEqual([])
  })

  it('denies an expired executing approval without a journal record', async () => {
    const journal = new ProgrammableJournal()
    const harness = buildHarness({
      documents: requireApprovalPolicy('appointment.modify'),
      journal,
      reservationTtlMs: 60_000
    })
    noSweep(harness)
    const requested = await harness.runtime.runTurn(turnInput())
    const approvalId = requested.approvalId ?? ''
    const record = harness.engine.get(TENANT, approvalId)
    harness.engine.submit(TENANT, approvalId, 'op_1')
    harness.engine.approve(TENANT, approvalId, { approverId: 'op_2' })
    harness.engine.reserve({
      tenantId: TENANT,
      approvalId,
      action: record.action,
      resource: record.resource,
      payload: record.proposalPayload,
      proposalHash: record.proposalHash,
      agentId: AGENT,
      agentVersion: 'v1',
      policyVersion: record.policyVersion,
      capability: 'appointment.modify',
      operationKey: 'op:executing-missing',
      ttlMs: 60_000
    })
    const reserved = harness.engine.get(TENANT, approvalId)
    harness.engine.markExecuting({
      tenantId: TENANT,
      approvalId,
      reservationId: reserved.reservationId ?? ''
    })
    expireReservation(harness, approvalId)

    const result = await harness.runtime.runTurn(turnInput({ approvalId }))

    expect(result.outcome).toBe('denied')
    expect(result.reason).toBe('operation_uncertain')
    expect(harness.toolExecutor).not.toHaveBeenCalled()
  })

  it('never re-arms a live reservation whose journal record binds another proposal', async () => {
    const journal = new ProgrammableJournal()
    const harness = buildHarness({
      documents: requireApprovalPolicy('appointment.modify'),
      journal,
      reservationTtlMs: 60_000
    })
    const requested = await harness.runtime.runTurn(turnInput())
    const approvalId = requested.approvalId ?? ''
    const record = harness.engine.get(TENANT, approvalId)
    harness.engine.submit(TENANT, approvalId, 'op_1')
    harness.engine.approve(TENANT, approvalId, { approverId: 'op_2' })
    const reservation = harness.engine.reserve({
      tenantId: TENANT,
      approvalId,
      action: record.action,
      resource: record.resource,
      payload: record.proposalPayload,
      proposalHash: record.proposalHash,
      agentId: AGENT,
      agentVersion: 'v1',
      policyVersion: record.policyVersion,
      capability: 'appointment.modify',
      operationKey: 'op:mismatched',
      ttlMs: 60_000
    })
    expect(reservation.reservationId).not.toBe('')
    journal.getQueue.push(undefined)
    journal.getQueue.push(undefined)
    journal.getQueue.push(
      effectRecord({
        operationKey: 'op:mismatched',
        proposalHash: 'e'.repeat(64),
        state: 'ABANDONED'
      })
    )

    const result = await harness.runtime.runTurn(turnInput({ approvalId }))

    expect(result.outcome).toBe('denied')
    expect(result.reason).toBe('operation_uncertain')
    expect(harness.toolExecutor).not.toHaveBeenCalled()
    expect(journal.reserveInputs).toEqual([])
  })

  it('marks a legacy reservation uncertain when the candidate journal record is uncertain', async () => {
    const journal = new ProgrammableJournal()
    const harness = buildHarness({
      documents: requireApprovalPolicy('appointment.modify'),
      journal,
      reservationTtlMs: 60_000
    })
    const requested = await harness.runtime.runTurn(turnInput())
    const approvalId = requested.approvalId ?? ''
    const record = harness.engine.get(TENANT, approvalId)
    harness.engine.submit(TENANT, approvalId, 'op_1')
    harness.engine.approve(TENANT, approvalId, { approverId: 'op_2' })
    harness.engine.reserve({
      tenantId: TENANT,
      approvalId,
      action: record.action,
      resource: record.resource,
      payload: record.proposalPayload,
      proposalHash: record.proposalHash,
      agentId: AGENT,
      agentVersion: 'v1',
      policyVersion: record.policyVersion,
      capability: 'appointment.modify',
      ttlMs: 60_000
    })
    journal.getQueue.push(undefined)
    journal.getQueue.push(undefined)
    journal.getQueue.push(
      effectRecord({
        proposalHash: record.proposalHash ?? '',
        state: 'UNCERTAIN'
      })
    )

    const result = await harness.runtime.runTurn(turnInput({ approvalId }))

    expect(result.outcome).toBe('denied')
    expect(result.reason).toBe('operation_uncertain')
    expect(harness.engine.get(TENANT, approvalId).status).toBe('UNCERTAIN')
    expect(harness.toolExecutor).not.toHaveBeenCalled()
  })

  it('marks a keyed reservation uncertain when its journal record is uncertain', async () => {
    const journal = new ProgrammableJournal()
    const harness = buildHarness({
      documents: requireApprovalPolicy('appointment.modify'),
      journal,
      reservationTtlMs: 60_000
    })
    const requested = await harness.runtime.runTurn(turnInput())
    const approvalId = requested.approvalId ?? ''
    const record = harness.engine.get(TENANT, approvalId)
    harness.engine.submit(TENANT, approvalId, 'op_1')
    harness.engine.approve(TENANT, approvalId, { approverId: 'op_2' })
    harness.engine.reserve({
      tenantId: TENANT,
      approvalId,
      action: record.action,
      resource: record.resource,
      payload: record.proposalPayload,
      proposalHash: record.proposalHash,
      agentId: AGENT,
      agentVersion: 'v1',
      policyVersion: record.policyVersion,
      capability: 'appointment.modify',
      operationKey: 'op:keyed-uncertain',
      ttlMs: 60_000
    })
    journal.getQueue.push(undefined)
    journal.getQueue.push(undefined)
    journal.getQueue.push(
      effectRecord({
        operationKey: 'op:keyed-uncertain',
        proposalHash: record.proposalHash ?? '',
        state: 'UNCERTAIN'
      })
    )

    const result = await harness.runtime.runTurn(turnInput({ approvalId }))

    expect(result.outcome).toBe('denied')
    expect(result.reason).toBe('operation_uncertain')
    expect(harness.engine.get(TENANT, approvalId).status).toBe('UNCERTAIN')
  })

  it('re-arms a released reservation with orchestration lineage after a no-effect journal state', async () => {
    const journal = new ProgrammableJournal()
    const harness = buildHarness({
      documents: requireApprovalPolicy('appointment.modify'),
      journal,
      reservationTtlMs: 60_000
    })
    const requested = await harness.runtime.runTurn(turnInput())
    const approvalId = requested.approvalId ?? ''
    const record = harness.engine.get(TENANT, approvalId)
    harness.engine.submit(TENANT, approvalId, 'op_1')
    harness.engine.approve(TENANT, approvalId, { approverId: 'op_2' })
    harness.engine.reserve({
      tenantId: TENANT,
      approvalId,
      action: record.action,
      resource: record.resource,
      payload: record.proposalPayload,
      proposalHash: record.proposalHash,
      agentId: AGENT,
      agentVersion: 'v1',
      policyVersion: record.policyVersion,
      capability: 'appointment.modify',
      operationKey: 'op:rearmed',
      ttlMs: 60_000
    })
    journal.getQueue.push(undefined)
    journal.getQueue.push(
      effectRecord({
        operationKey: 'op:rearmed',
        proposalHash: record.proposalHash ?? '',
        state: 'ABANDONED'
      })
    )

    const result = await harness.runtime.runTurn(
      turnInput({
        approvalId,
        orchestrationContext: {
          goalId: 'goal_rearmed',
          planId: 'plan_rearmed',
          stepId: 'step_rearmed'
        }
      })
    )

    expect(result.outcome).toBe('executed')
    expect(journal.reserveInputs[0]).toMatchObject({
      operationKey: 'op:rearmed',
      orchestrationContext: {
        goalId: 'goal_rearmed',
        planId: 'plan_rearmed',
        stepId: 'step_rearmed'
      }
    })
    expect(harness.toolExecutor).toHaveBeenCalledTimes(1)
  })

  it('denies operation_in_progress when the re-arm finds an in-flight journal attempt', async () => {
    const journal = new ProgrammableJournal()
    journal.reserveQueue.push({ outcome: 'in_progress' })
    const harness = buildHarness({
      documents: requireApprovalPolicy('appointment.modify'),
      journal,
      reservationTtlMs: 60_000
    })
    const requested = await harness.runtime.runTurn(turnInput())
    const approvalId = requested.approvalId ?? ''
    const record = harness.engine.get(TENANT, approvalId)
    harness.engine.submit(TENANT, approvalId, 'op_1')
    harness.engine.approve(TENANT, approvalId, { approverId: 'op_2' })
    harness.engine.reserve({
      tenantId: TENANT,
      approvalId,
      action: record.action,
      resource: record.resource,
      payload: record.proposalPayload,
      proposalHash: record.proposalHash,
      agentId: AGENT,
      agentVersion: 'v1',
      policyVersion: record.policyVersion,
      capability: 'appointment.modify',
      operationKey: 'op:in-flight',
      ttlMs: 60_000
    })
    journal.getQueue.push(undefined)
    journal.getQueue.push(undefined)

    const result = await harness.runtime.runTurn(turnInput({ approvalId }))

    expect(result.outcome).toBe('denied')
    expect(result.reason).toBe('operation_in_progress')
    expect(harness.toolExecutor).not.toHaveBeenCalled()
  })
})

describe('runtime execution-turn journal recovery branches', () => {
  it('marks the effect uncertain when the post-tool stop interrupts a durable execution', async () => {
    const journal = new ProgrammableJournal()
    const controller = new AbortController()
    const harness = buildHarness({
      documents: requireApprovalPolicy('appointment.modify'),
      journal,
      reservationTtlMs: 60_000,
      toolExecutor: async () => {
        controller.abort()
        return { result: { synthetic: true } }
      }
    })
    const requested = await harness.runtime.runTurn(turnInput())
    const approvalId = requested.approvalId ?? ''
    harness.engine.submit(TENANT, approvalId, 'op_1')
    harness.engine.approve(TENANT, approvalId, { approverId: 'op_2' })

    const result = await harness.runtime.runTurn(
      turnInput({
        approvalId,
        cancelSignal: controller.signal,
        orchestrationContext: {
          goalId: 'goal_execution',
          planId: 'plan_execution',
          stepId: 'step_execution'
        }
      })
    )

    expect(result.outcome).toBe('denied')
    expect(result.reason).toBe('turn_cancelled')
    expect(
      journal.uncertainReasons.some((reason) =>
        reason.includes('turn interrupted after tool')
      )
    ).toBe(true)
    expect(harness.outbox).not.toHaveBeenCalled()
    expect(journal.reserveInputs[0]).toMatchObject({
      orchestrationContext: {
        goalId: 'goal_execution',
        planId: 'plan_execution',
        stepId: 'step_execution'
      }
    })
  })

  it('denies a stop that lands between approval reservation and tool start without a journal', async () => {
    const controller = new AbortController()
    const harness = buildHarness({
      documents: requireApprovalPolicy('schedule.read'),
      authorityOverrides: {
        reserve: (input) => {
          controller.abort()
          return harness.engine.reserve(input)
        }
      }
    })
    const approved = await requestAndApprove(harness, {
      capability: 'schedule.read',
      action: 'schedule.read',
      resource: { type: 'appointment_draft', id: 'draft_read' }
    })

    const result = await harness.runtime.runTurn(
      turnInput({
        capability: 'schedule.read',
        action: 'schedule.read',
        resource: { type: 'appointment_draft', id: 'draft_read' },
        approvalId: approved.approvalId,
        cancelSignal: controller.signal
      })
    )

    expect(result.outcome).toBe('denied')
    expect(result.reason).toBe('turn_cancelled')
    expect(harness.toolExecutor).not.toHaveBeenCalled()
    expect(harness.outbox).not.toHaveBeenCalled()
  })
})
