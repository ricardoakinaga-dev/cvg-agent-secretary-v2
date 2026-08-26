import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { AgentConfigSchema } from '../contracts.ts'
import {
  CapabilityGateway,
  PluginRegistry,
  type CapabilityActorAuthorizer,
  type CapabilityExecutionInput,
  type PluginHandler,
  type RegisteredPlugin
} from '../plugin-gateway.ts'
import { InMemoryCapabilityApprovalAuthority } from '../approval-authority.ts'

const tenantId = 'tenant_00000000-0000-4000-8000-000000000401' as const
const agentId = 'agent_00000000-0000-4000-8000-000000000401' as const
const versionId = 'agent_version_00000000-0000-4000-8000-000000000401' as const

const inputSchema = z.object({ value: z.string().min(1).max(80) }).strict()
const outputSchema = z.union([
  z.string().max(4000),
  z
    .object({
      safe: z.string().max(4000).optional(),
      shouldNotRun: z.boolean().optional(),
      token: z.string().max(4000).optional(),
      nested: z
        .object({ authorization: z.string().max(4000).optional() })
        .strict()
        .optional()
    })
    .strict()
])

const config = AgentConfigSchema.parse({
  persona: { name: 'Boundary fixture', role: 'assistant', tone: 'calm' },
  greeting: 'Resposta controlada.',
  promptBlocks: [],
  responseTemplates: {},
  model: {
    provider: 'fake',
    model: 'deterministic-v1',
    temperature: 0,
    maxTokens: 128,
    timeoutMs: 1000,
    retries: 0,
    secretRef: 'secret://controlled/tool-boundary'
  },
  featureFlags: { testLab: true, realChannels: false },
  policies: {
    version: 'tool-boundary-v1',
    minConfidence: 0.7,
    lowConfidence: 'clarify',
    maxClarifications: 2,
    enabledActions: ['respond'],
    approvalActions: [],
    blockedActions: []
  },
  plugins: [
    {
      plugin: 'fixture.tool-boundary',
      version: '1.0.0',
      enabled: true,
      allowedTools: ['read'],
      config: {}
    }
  ],
  knowledge: [],
  handoff: {
    lowConfidenceDestination: 'controlled-reception',
    destinations: ['controlled-reception'],
    maxClarifications: 2
  }
})

type BoundaryPlugin = RegisteredPlugin & {
  inputValidators: Record<string, z.ZodType>
  outputValidators: Record<string, z.ZodType>
}

const fixtureActorAuthorizer: CapabilityActorAuthorizer = ({
  actor,
  requiredPermission
}) =>
  actor.id.startsWith('operator.') || actor.id === 'admin'
    ? [requiredPermission]
    : []

function fixturePlugin(
  handler: PluginHandler,
  validator: z.ZodType = inputSchema
): BoundaryPlugin {
  return {
    manifest: {
      name: 'fixture.tool-boundary',
      version: '1.0.0',
      capabilities: ['fixture.read'],
      permissions: ['fixture:read'],
      tools: [
        {
          name: 'read',
          permission: 'fixture:read',
          risk: 'low',
          requiresApproval: false
        }
      ],
      hooks: [],
      dependencies: [],
      configSchemaVersion: '1'
    },
    handlers: { read: handler },
    inputValidators: { read: validator },
    outputValidators: { read: outputSchema }
  }
}

function executionInput(
  overrides: Partial<CapabilityExecutionInput> = {}
): CapabilityExecutionInput {
  return {
    tenantId,
    agentId,
    versionId,
    config,
    toolName: 'read',
    input: { value: 'controlled' },
    actor: {
      id: 'operator.tool-boundary',
      role: 'Operator',
      permissions: ['fixture:read']
    },
    policy: { decision: 'allowed', reason: 'controlled' },
    dryRun: true,
    ...overrides
  }
}

function approval() {
  return {
    id: 'approval_00000000-0000-4000-8000-000000000401',
    tenantId,
    agentId,
    versionId,
    toolName: 'read',
    actorId: 'operator.tool-boundary',
    expiresAt: new Date(Date.now() + 60_000)
  }
}

describe('controlled tool invocation boundary', () => {
  it('requires exactly one server-side input validator for every manifest tool', () => {
    const handler = vi.fn<PluginHandler>(async () => ({
      status: 'succeeded'
    }))
    const plugin = fixturePlugin(handler)
    const withoutValidator = Object.fromEntries(
      Object.entries(plugin).filter(([key]) => key !== 'inputValidators')
    ) as unknown as RegisteredPlugin

    expect(() => new PluginRegistry([withoutValidator])).toThrow(
      /input validator/i
    )
    expect(
      () => new PluginRegistry([{ ...plugin, outputValidators: {} }])
    ).toThrow(/output validator/i)
    expect(
      () =>
        new PluginRegistry([
          {
            ...plugin,
            inputValidators: {
              read: inputSchema,
              unexpected: inputSchema
            }
          }
        ])
    ).toThrow(/input validator/i)
    expect(
      () =>
        new PluginRegistry([
          {
            ...plugin,
            inputValidators: { read: { safeParse: 'not-a-function' } }
          } as never
        ])
    ).toThrow(/input validator/i)
  })

  it('rejects invalid input before approval consumption or handler execution', async () => {
    const handler = vi.fn<PluginHandler>(async () => ({
      status: 'succeeded',
      data: { shouldNotRun: true }
    }))
    const approvalAuthority = new InMemoryCapabilityApprovalAuthority()
    const issued = await approvalAuthority.issue({
      tenantId,
      agentId,
      versionId,
      toolName: 'read',
      input: { value: 'raw-sentinel', unexpected: 'raw-sentinel' },
      actorId: 'operator.tool-boundary',
      issuer: 'approver.tool-boundary',
      expiresAt: new Date(Date.now() + 60_000)
    })
    const verifyAndConsume = vi.spyOn(approvalAuthority, 'verifyAndConsume')
    const onAudit = vi.fn()
    const gateway = new CapabilityGateway(
      new PluginRegistry().register(fixturePlugin(handler)),
      { actorAuthorizer: fixtureActorAuthorizer, approvalAuthority }
    )
    const result = await gateway.execute(
      executionInput({
        input: {
          value: 'raw-sentinel',
          unexpected: 'raw-sentinel'
        },
        requireApproval: true,
        approval: { ...approval(), id: issued.id },
        onAudit
      })
    )

    expect(result).toMatchObject({
      status: 'blocked',
      reason: 'tool_input_invalid'
    })
    expect(handler).not.toHaveBeenCalled()
    expect(verifyAndConsume).not.toHaveBeenCalled()
    expect(JSON.stringify(onAudit.mock.calls)).not.toContain('raw-sentinel')
  })

  it('rejects oversized, null and cyclic tool inputs within bounded limits', async () => {
    const handler = vi.fn<PluginHandler>(async () => ({
      status: 'succeeded'
    }))
    const gateway = new CapabilityGateway(
      new PluginRegistry().register(fixturePlugin(handler)),
      { actorAuthorizer: fixtureActorAuthorizer }
    )
    const cyclicInput: Record<string, unknown> = { value: 'controlled' }
    cyclicInput.self = cyclicInput

    for (const invalidInput of [
      null,
      { value: 'x'.repeat(4001) },
      cyclicInput
    ]) {
      await expect(
        gateway.execute(executionInput({ input: invalidInput }))
      ).resolves.toMatchObject({
        status: 'blocked',
        reason: 'tool_input_invalid'
      })
    }
    expect(handler).not.toHaveBeenCalled()
  })

  it('fails closed for malformed actors and malformed approvals without throwing', async () => {
    const handler = vi.fn<PluginHandler>(async () => ({
      status: 'succeeded'
    }))
    const gateway = new CapabilityGateway(
      new PluginRegistry().register(fixturePlugin(handler)),
      { actorAuthorizer: fixtureActorAuthorizer }
    )

    await expect(
      gateway.execute(
        executionInput({
          actor: {
            id: 'operator.tool-boundary',
            role: 'Operator',
            permissions: undefined as never
          }
        })
      )
    ).resolves.toMatchObject({ status: 'blocked', reason: 'invalid_actor' })

    await expect(
      gateway.execute(
        executionInput({
          requireApproval: true,
          approval: { ...approval(), expiresAt: undefined as never }
        })
      )
    ).resolves.toMatchObject({
      status: 'blocked',
      reason: 'approval_required'
    })
    expect(handler).not.toHaveBeenCalled()
  })

  it('passes a bounded parsed clone to the handler and projects sanitized results', async () => {
    let receivedInput: unknown
    let receivedSnapshot: unknown
    const handler = vi.fn<PluginHandler>(async (received) => {
      receivedInput = received
      receivedSnapshot = JSON.parse(JSON.stringify(received))
      const parsed = received as { value: string }
      parsed.value = 'handler-local-mutation'
      return {
        status: 'succeeded',
        data: {
          safe: 'ok',
          token: 'secret-token-must-not-return',
          nested: { authorization: 'Bearer secret' }
        },
        error: 'internal detail must not return'
      } as never
    })
    const gateway = new CapabilityGateway(
      new PluginRegistry().register(fixturePlugin(handler)),
      { actorAuthorizer: fixtureActorAuthorizer }
    )
    const originalInput = { value: 'caller-owned' }
    const result = await gateway.execute(
      executionInput({ input: originalInput })
    )

    expect(result).toMatchObject({
      status: 'succeeded',
      data: { safe: 'ok', nested: {} }
    })
    expect(result).not.toHaveProperty('error')
    expect(JSON.stringify(result)).not.toContain('secret-token-must-not-return')
    expect(handler).toHaveBeenCalledTimes(1)
    expect(receivedSnapshot).toEqual(originalInput)
    expect(receivedInput).not.toBe(originalInput)
    expect(originalInput).toEqual({ value: 'caller-owned' })
  })

  it('fails closed when a handler returns an invalid or cyclic result', async () => {
    const cyclicResult: Record<string, unknown> = {}
    cyclicResult.self = cyclicResult
    const handler = vi.fn<PluginHandler>(async () => ({
      status: 'succeeded',
      data: cyclicResult
    }))
    const gateway = new CapabilityGateway(
      new PluginRegistry().register(fixturePlugin(handler)),
      { actorAuthorizer: fixtureActorAuthorizer }
    )

    await expect(gateway.execute(executionInput())).resolves.toMatchObject({
      status: 'failed',
      reason: 'tool_result_invalid'
    })
  })

  it('rejects undeclared output fields before raw secrets can cross the boundary', async () => {
    const handler = vi.fn<PluginHandler>(async () => ({
      status: 'succeeded',
      data: {
        safe: 'ok',
        raw: 'raw-sentinel',
        apiKey: 'sk-live-looking-secret',
        note: 'Bearer live-looking-secret'
      }
    }))
    const gateway = new CapabilityGateway(
      new PluginRegistry().register(fixturePlugin(handler)),
      { actorAuthorizer: fixtureActorAuthorizer }
    )

    const result = await gateway.execute(executionInput())

    expect(result).toMatchObject({
      status: 'failed',
      reason: 'tool_result_invalid'
    })
    expect(JSON.stringify(result)).not.toMatch(
      /raw-sentinel|sk-live-looking-secret|live-looking-secret/
    )
  })

  it('fails closed when actor authorization is unavailable', async () => {
    const handler = vi.fn<PluginHandler>(async () => ({
      status: 'succeeded'
    }))
    const gateway = new CapabilityGateway(
      new PluginRegistry().register(fixturePlugin(handler))
    )

    const result = await gateway.execute(
      executionInput({
        actor: {
          id: 'operator.tool-boundary',
          role: 'Operator',
          permissions: ['fixture:read']
        }
      })
    )

    expect(result).toMatchObject({
      status: 'blocked',
      reason: 'actor_authorization_unavailable'
    })
    expect(handler).not.toHaveBeenCalled()
  })

  it('reports audit unavailability without replaying execution', async () => {
    const handler = vi.fn<PluginHandler>(async () => ({
      status: 'succeeded',
      data: { safe: 'ok' }
    }))
    const onAudit = vi.fn().mockRejectedValue(new Error('audit storage down'))
    const gateway = new CapabilityGateway(
      new PluginRegistry().register(fixturePlugin(handler)),
      { actorAuthorizer: fixtureActorAuthorizer }
    )

    const result = await gateway.execute(executionInput({ onAudit }))

    expect(result).toMatchObject({
      status: 'succeeded',
      reason: 'audit_unavailable',
      data: { safe: 'ok' }
    })
    expect(handler).toHaveBeenCalledTimes(1)
    expect(onAudit).toHaveBeenCalledTimes(1)
  })

  it('propagates one execution trace parent to tool audit without replacing call correlation', async () => {
    const handler = vi.fn<PluginHandler>(async () => ({
      status: 'succeeded',
      data: { safe: 'ok' }
    }))
    const audits: Array<{ traceId?: string; correlationId: string }> = []
    const traceId = 'trace_00000000-0000-4000-8000-000000000402'
    const gateway = new CapabilityGateway(
      new PluginRegistry().register(fixturePlugin(handler)),
      { actorAuthorizer: fixtureActorAuthorizer }
    )

    const result = await gateway.execute(
      executionInput({
        traceId: traceId as never,
        onAudit: (event) => {
          audits.push(event)
        }
      })
    )

    expect(result.status).toBe('succeeded')
    expect(audits).toHaveLength(1)
    expect(audits[0]?.traceId).toBe(traceId)
    expect(audits[0]?.correlationId).toMatch(/^corr_/)
    expect(audits[0]?.correlationId).not.toBe(traceId)
  })

  it('rejects an invalid execution trace before authorization, handler or audit', async () => {
    const handler = vi.fn<PluginHandler>(async () => ({
      status: 'succeeded'
    }))
    const authorizer = vi.fn(fixtureActorAuthorizer)
    const onAudit = vi.fn()
    const gateway = new CapabilityGateway(
      new PluginRegistry().register(fixturePlugin(handler)),
      { actorAuthorizer: authorizer }
    )

    await expect(
      gateway.execute(
        executionInput({
          traceId: 'trace-invalid' as never,
          onAudit
        })
      )
    ).resolves.toMatchObject({
      status: 'blocked',
      reason: 'invalid_execution_input'
    })
    expect(authorizer).not.toHaveBeenCalled()
    expect(handler).not.toHaveBeenCalled()
    expect(onAudit).not.toHaveBeenCalled()
  })

  it('creates a controlled standalone trace parent when gateway input omits it', async () => {
    const audits: Array<{ traceId?: string }> = []
    const gateway = new CapabilityGateway(
      new PluginRegistry().register(
        fixturePlugin(async () => ({ status: 'succeeded' }))
      ),
      { actorAuthorizer: fixtureActorAuthorizer }
    )

    await gateway.execute(
      executionInput({
        onAudit: (event) => {
          audits.push(event)
        }
      })
    )

    expect(audits[0]?.traceId).toMatch(/^trace_[0-9a-f-]{36}$/)
  })

  it('rejects revoked object traps before entering the execution boundary', async () => {
    const handler = vi.fn<PluginHandler>(async () => ({
      status: 'succeeded'
    }))
    const gateway = new CapabilityGateway(
      new PluginRegistry().register(fixturePlugin(handler)),
      { actorAuthorizer: fixtureActorAuthorizer }
    )
    const target = executionInput()
    const hostile = new Proxy(target, {
      getPrototypeOf() {
        throw new Error('prototype access denied')
      }
    })

    await expect(
      gateway.execute(hostile as unknown as CapabilityExecutionInput)
    ).resolves.toMatchObject({
      status: 'blocked',
      reason: 'invalid_execution_input'
    })
    expect(handler).not.toHaveBeenCalled()
  })

  it('rejects cyclic plugin configuration without recursing indefinitely', async () => {
    const handler = vi.fn<PluginHandler>(async () => ({
      status: 'succeeded'
    }))
    const gateway = new CapabilityGateway(
      new PluginRegistry().register(fixturePlugin(handler)),
      { actorAuthorizer: fixtureActorAuthorizer }
    )
    const cyclicConfig: Record<string, unknown> = {}
    cyclicConfig.self = cyclicConfig
    const hostileConfig = {
      ...config,
      plugins: config.plugins.map((binding) => ({
        ...binding,
        config: cyclicConfig
      }))
    }

    await expect(
      gateway.execute(
        executionInput({
          config: hostileConfig
        })
      )
    ).resolves.toMatchObject({
      status: 'blocked',
      reason: 'invalid_execution_input'
    })
    expect(handler).not.toHaveBeenCalled()
  })
})
