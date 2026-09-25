import { describe, expect, it } from 'vitest'
import { TenantIdSchema } from '@cvg/platform'
import {
  CONTROLLED_KERNEL_EFFECT_SCOPES,
  CONTROLLED_KERNEL_PAYLOAD_SCHEMA,
  CONTROLLED_KERNEL_POLICY_DOCUMENT,
  CONTROLLED_KERNEL_POLICY_ID,
  CONTROLLED_KERNEL_POLICY_VERSION,
  CONTROLLED_KERNEL_PROMPT_ID,
  CONTROLLED_KERNEL_PROMPT_VERSION,
  CONTROLLED_KERNEL_RUNTIME_VERSION,
  DURABLE_KERNEL_ORCHESTRATOR_ENV,
  KERNEL_WORKER_RUNTIME,
  KernelContinuationPayloadSchema,
  KernelRuntimeConfigurationError,
  KernelTurnEnvelopeSchema,
  PUBLISHED_AGENT_WORKER_RUNTIME,
  WORKER_RUNTIME_ENV,
  assertPostgresKernelPrerequisites,
  createPostgresKernelRuntime,
  durableTurnResult,
  parseKernelTurnEnvelope,
  resolveWorkerRuntimeKind
} from '../kernel-composition.ts'

const TENANT = TenantIdSchema.parse(
  'tenant_00000000-0000-4000-8000-0000000000c3'
)
const AGENT = 'agent_00000000-0000-4000-8000-0000000000c3'
const CORRELATION = 'corr_00000000-0000-4000-8000-0000000000c3'
const TRACE = 'abcdef0123456789abcdef0123456789'
const CREATED_AT = '2026-09-16T12:00:00.000Z'

function governedBase(
  outcome: string,
  overrides: Record<string, unknown> = {}
) {
  return {
    outcome,
    reason: `synthetic_${outcome}`,
    decision: {
      decision: outcome === 'approval_required' ? 'REQUIRE_APPROVAL' : 'ALLOW',
      reason: 'synthetic controlled test',
      policyId: 'synthetic.controlled-kernel',
      policyVersion: 'synthetic.controlled-kernel@1.0.0',
      correlationId: CORRELATION,
      capability: 'appointment.modify',
      risk: 'MEDIUM_RISK_WRITE',
      evaluatedAt: CREATED_AT
    },
    traceId: TRACE,
    spanId: '0123456789abcdef',
    correlationId: CORRELATION,
    auditChainValid: true,
    costUsd: 0,
    durationMs: 1,
    ...overrides
  } as never
}

function minimalEnvelopeBody(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    capability: 'schedule.read',
    action: 'schedule.read',
    resource: { type: 'appointment_draft' },
    ...overrides
  })
}

describe('kernel runtime selection without database', () => {
  it('defaults to the governed kernel outside production', () => {
    expect(resolveWorkerRuntimeKind({})).toBe('kernel')
    expect(resolveWorkerRuntimeKind({ [WORKER_RUNTIME_ENV]: '' })).toBe(
      'kernel'
    )
    expect(resolveWorkerRuntimeKind({ [WORKER_RUNTIME_ENV]: 'kernel' })).toBe(
      'kernel'
    )
    expect(
      resolveWorkerRuntimeKind({ [WORKER_RUNTIME_ENV]: '  kernel  ' })
    ).toBe('kernel')
    expect(
      resolveWorkerRuntimeKind({ [WORKER_RUNTIME_ENV]: 'published-agent' })
    ).toBe('published-agent')
  })

  it('fails closed on an unknown runtime value', () => {
    expect(() =>
      resolveWorkerRuntimeKind({ [WORKER_RUNTIME_ENV]: 'mystery' })
    ).toThrowError(KernelRuntimeConfigurationError)
    expect(() =>
      resolveWorkerRuntimeKind({ [WORKER_RUNTIME_ENV]: 'mystery' })
    ).toThrow(/Unknown CVG_WORKER_RUNTIME value: mystery/)
    try {
      resolveWorkerRuntimeKind({ [WORKER_RUNTIME_ENV]: 'mystery' })
    } catch (error) {
      expect((error as KernelRuntimeConfigurationError).code).toBe(
        'unknown_worker_runtime'
      )
      expect((error as KernelRuntimeConfigurationError).name).toBe(
        'KernelRuntimeConfigurationError'
      )
    }
  })

  it('enforces the durable governed kernel in production', () => {
    expect(
      resolveWorkerRuntimeKind({
        NODE_ENV: 'production',
        [WORKER_RUNTIME_ENV]: KERNEL_WORKER_RUNTIME,
        [DURABLE_KERNEL_ORCHESTRATOR_ENV]: 'true'
      })
    ).toBe('kernel')
    expect(() =>
      resolveWorkerRuntimeKind({
        NODE_ENV: 'production',
        [WORKER_RUNTIME_ENV]: PUBLISHED_AGENT_WORKER_RUNTIME,
        [DURABLE_KERNEL_ORCHESTRATOR_ENV]: 'true'
      })
    ).toThrow(/published-agent runtime is forbidden/)
    expect(() =>
      resolveWorkerRuntimeKind({
        NODE_ENV: 'production',
        [WORKER_RUNTIME_ENV]: KERNEL_WORKER_RUNTIME
      })
    ).toThrow(/CVG_DURABLE_KERNEL_ORCHESTRATOR=true/)
  })

  it('exposes a typed configuration error', () => {
    const error = new KernelRuntimeConfigurationError(
      'kernel_runtime_prerequisites_missing',
      'synthetic prerequisites'
    )

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('KernelRuntimeConfigurationError')
    expect(error.code).toBe('kernel_runtime_prerequisites_missing')
    expect(error.message).toBe('synthetic prerequisites')
  })
})

describe('kernel controlled constants without database', () => {
  it('pins synthetic policy prompt and runtime versions', () => {
    expect(CONTROLLED_KERNEL_POLICY_ID).toBe('synthetic.controlled-kernel')
    expect(CONTROLLED_KERNEL_POLICY_VERSION).toBe('1.0.0')
    expect(CONTROLLED_KERNEL_PROMPT_ID).toBe(
      'synthetic.controlled-kernel-prompt'
    )
    expect(CONTROLLED_KERNEL_PROMPT_VERSION).toBe('1.0.0')
    expect(CONTROLLED_KERNEL_RUNTIME_VERSION).toBe('aaa21-kernel-v1')
    expect(KERNEL_WORKER_RUNTIME).toBe('kernel')
    expect(PUBLISHED_AGENT_WORKER_RUNTIME).toBe('published-agent')
  })

  it('declares a synthetic-only policy document', () => {
    expect(CONTROLLED_KERNEL_POLICY_DOCUMENT.policyId).toBe(
      CONTROLLED_KERNEL_POLICY_ID
    )
    expect(CONTROLLED_KERNEL_POLICY_DOCUMENT.rules).toHaveLength(2)
    const capabilities = CONTROLLED_KERNEL_POLICY_DOCUMENT.rules.flatMap(
      (rule) => rule.capabilities
    )
    expect(capabilities).toEqual(
      expect.arrayContaining(['schedule.read', 'appointment.modify'])
    )
    expect(
      CONTROLLED_KERNEL_POLICY_DOCUMENT.rules.find(
        (rule) => rule.effect === 'REQUIRE_APPROVAL'
      )?.capabilities
    ).toEqual(['appointment.modify'])
  })

  it('restricts composed capabilities to synthetic effect scopes', () => {
    expect(CONTROLLED_KERNEL_EFFECT_SCOPES).toMatchObject({
      'schedule.read': 'controlled_fake',
      'appointment.modify': 'controlled_fake'
    })
  })

  it('validates the synthetic text payload shape', () => {
    expect(
      CONTROLLED_KERNEL_PAYLOAD_SCHEMA.safeParse({ text: 'synthetic' }).success
    ).toBe(true)
    expect(
      CONTROLLED_KERNEL_PAYLOAD_SCHEMA.safeParse({ text: 42 }).success
    ).toBe(false)
    expect(CONTROLLED_KERNEL_PAYLOAD_SCHEMA.safeParse({}).success).toBe(false)
  })
})

describe('kernel turn envelope parsing without database', () => {
  it('parses a minimal envelope with controlled defaults', () => {
    const parsed = parseKernelTurnEnvelope(minimalEnvelopeBody())

    expect(parsed.capability).toBe('schedule.read')
    expect(parsed.action).toBe('schedule.read')
    expect(parsed.resource).toEqual({ type: 'appointment_draft' })
    expect(parsed.dataClassification).toBe('INTERNAL')
    expect(parsed.operatorId).toBe('op_synthetic_kernel')
    expect(parsed.operatorRole).toBe('Operator')
    expect(parsed.agentVersion).toBe('synthetic-v1')
    expect(parsed.modelProfile).toBe('fast')
  })

  it('accepts both direct and cvgTurn-wrapped envelopes', () => {
    const direct = parseKernelTurnEnvelope(
      JSON.stringify({
        capability: 'appointment.modify',
        action: 'appointment.modify',
        resource: { type: 'appointment_draft', id: 'draft_1' },
        message: 'synthetic direct'
      })
    )
    const wrapped = parseKernelTurnEnvelope(
      JSON.stringify({
        cvgTurn: {
          capability: 'appointment.modify',
          action: 'appointment.modify',
          resource: { type: 'appointment_draft', id: 'draft_1' },
          message: 'synthetic wrapped'
        }
      })
    )

    expect(direct.resource.id).toBe('draft_1')
    expect(wrapped.resource.id).toBe('draft_1')
    expect(wrapped.message).toBe('synthetic wrapped')
  })

  it('rejects non-JSON bodies', () => {
    expect(() => parseKernelTurnEnvelope('not-json')).toThrow(
      /kernel_turn_envelope_invalid: inbound body is not a JSON turn envelope/
    )
    expect(() => parseKernelTurnEnvelope('42')).toThrow(
      /kernel_turn_envelope_invalid/
    )
  })

  it('rejects invalid capability and strict violations', () => {
    expect(() =>
      parseKernelTurnEnvelope(
        JSON.stringify({
          capability: 'not-a-capability',
          action: 'x',
          resource: { type: 'appointment_draft' }
        })
      )
    ).toThrow(/kernel_turn_envelope_invalid/)
    expect(() =>
      parseKernelTurnEnvelope(
        JSON.stringify({
          capability: 'schedule.read',
          action: 'schedule.read',
          resource: { type: 'appointment_draft' },
          unexpected: true
        })
      )
    ).toThrow(/kernel_turn_envelope_invalid/)
  })

  it('exposes envelope defaults through the zod schema', () => {
    const parsed = KernelTurnEnvelopeSchema.parse({
      capability: 'schedule.read',
      action: 'schedule.read',
      resource: { type: 'appointment_draft' }
    })

    expect(parsed.agentProfile).toBe('secretary')
    expect(parsed.message).toBe('synthetic controlled kernel turn')
  })
})

describe('kernel continuation payload without database', () => {
  it('defaults an omitted decision to approve', () => {
    const parsed = KernelContinuationPayloadSchema.parse({
      kind: 'runtime_approval.continue',
      approvalId: 'appr_synthetic'
    })

    expect(parsed).toMatchObject({
      kind: 'runtime_approval.continue',
      approvalId: 'appr_synthetic',
      decision: 'approve'
    })
  })

  it('accepts an explicit reject and optional trace', () => {
    const parsed = KernelContinuationPayloadSchema.parse({
      kind: 'runtime_approval.continue',
      approvalId: 'appr_synthetic',
      decision: 'reject',
      traceId: TRACE
    })

    expect(parsed.decision).toBe('reject')
    expect(parsed.traceId).toBe(TRACE)
  })

  it('rejects wrong kinds and empty approval ids', () => {
    expect(
      KernelContinuationPayloadSchema.safeParse({
        kind: 'other',
        approvalId: 'appr_synthetic'
      }).success
    ).toBe(false)
    expect(
      KernelContinuationPayloadSchema.safeParse({
        kind: 'runtime_approval.continue',
        approvalId: ''
      }).success
    ).toBe(false)
  })
})

describe('kernel durable turn mapping without database', () => {
  it('maps approval_required with digest and model accounting', () => {
    const withEvidence = durableTurnResult(
      governedBase('approval_required', {
        approvalId: 'appr_synthetic',
        resultDigest: 'd'.repeat(64),
        modelResult: { text: 'synthetic' },
        costUsd: 0
      })
    )

    expect(withEvidence).toMatchObject({
      outcome: 'approval_required',
      approvalId: 'appr_synthetic',
      resultDigest: 'd'.repeat(64),
      toolCalls: 0,
      modelCalls: 1
    })

    const withoutEvidence = durableTurnResult(governedBase('approval_required'))
    expect(withoutEvidence).toMatchObject({
      outcome: 'approval_required',
      toolCalls: 0,
      modelCalls: 0
    })
  })

  it('maps denied to failed', () => {
    const mapped = durableTurnResult(
      governedBase('denied', {
        resultDigest: 'e'.repeat(64),
        modelResult: { text: 'synthetic' }
      })
    )

    expect(mapped).toMatchObject({
      outcome: 'failed',
      resultDigest: 'e'.repeat(64),
      toolCalls: 0,
      modelCalls: 1
    })
  })

  it('maps shadowed to waiting_external', () => {
    const withDigest = durableTurnResult(
      governedBase('shadowed', {
        resultDigest: 'f'.repeat(64),
        modelResult: { text: 'synthetic' }
      })
    )
    const withoutDigest = durableTurnResult(governedBase('shadowed'))

    expect(withDigest).toMatchObject({
      outcome: 'waiting_external',
      resultDigest: 'f'.repeat(64),
      modelCalls: 1,
      toolCalls: 0
    })
    expect(withoutDigest).toMatchObject({
      outcome: 'waiting_external',
      modelCalls: 0,
      toolCalls: 0
    })
  })

  it('carries effect confirmation as journal evidence', () => {
    const mapped = durableTurnResult(
      governedBase('executed', {
        effectConfirmed: true,
        executionRef: 'exec_synthetic',
        resultDigest: 'a'.repeat(64),
        eventType: 'appointment.modify.executed',
        correlationId: CORRELATION,
        toolResult: { synthetic: true },
        modelResult: { text: 'synthetic' },
        costUsd: 0
      })
    )

    expect(mapped).toMatchObject({ outcome: 'succeeded', toolCalls: 1 })
    const evidence = (
      mapped as unknown as { evidence: Array<Record<string, unknown>> }
    ).evidence
    expect(evidence).toHaveLength(1)
    expect(evidence[0]).toMatchObject({
      source: 'effect_journal',
      reference: 'exec_synthetic',
      verified: true
    })
  })

  it('carries outbox identity when no effect was confirmed', () => {
    const mapped = durableTurnResult(
      governedBase('executed', {
        outboxEventId: 'evt_synthetic',
        resultDigest: 'b'.repeat(64),
        correlationId: CORRELATION,
        costUsd: 0
      })
    )

    const evidence = (
      mapped as unknown as { evidence: Array<Record<string, unknown>> }
    ).evidence
    expect(mapped).toMatchObject({ outcome: 'succeeded', toolCalls: 0 })
    expect(evidence).toHaveLength(1)
    expect(evidence[0]).toMatchObject({
      source: 'outbox',
      reference: 'evt_synthetic',
      verified: true
    })
  })

  it('succeeds with empty evidence when neither journal nor outbox applies', () => {
    const mapped = durableTurnResult(
      governedBase('executed', { correlationId: CORRELATION })
    )

    expect(mapped).toMatchObject({ outcome: 'succeeded' })
    expect((mapped as { evidence: unknown[] }).evidence).toEqual([])
  })
})

describe('kernel postgres composition without database', () => {
  it('fails closed without a connectable pool', () => {
    for (const pool of [undefined, null, {}]) {
      expect(() =>
        createPostgresKernelRuntime({
          pool: pool as never,
          tenantId: TENANT,
          env: { [WORKER_RUNTIME_ENV]: 'kernel' },
          agentId: AGENT
        })
      ).toThrow(KernelRuntimeConfigurationError)
    }
  })

  it('composes a durable runtime without opening a connection', () => {
    const runtime = createPostgresKernelRuntime({
      pool: { connect: async () => ({}) } as never,
      tenantId: TENANT,
      env: { [WORKER_RUNTIME_ENV]: 'kernel' },
      agentId: AGENT
    })

    expect(runtime.tenantId).toBe(TENANT)
    expect(runtime.agentId).toBe(AGENT)
    expect(runtime.policy).toBeDefined()
    expect(runtime.approvals).toBeDefined()
    expect(runtime.audit).toBeDefined()
    expect(runtime.telemetry).toBeDefined()
    expect(runtime.conversations).toBeDefined()
    expect(runtime.goalStore).toBeDefined()
    expect(runtime.orchestrator).toBeDefined()
    expect(runtime.workflowCoordinator).toBeDefined()
    expect(runtime.toolInvocations).toEqual([])
    expect(runtime.turnResults).toEqual([])
    expect(runtime.runTurn).toBeTypeOf('function')
    expect(runtime.runDurableGoal).toBeTypeOf('function')
    expect(runtime.recoverDurableGoals).toBeTypeOf('function')
    expect(runtime.preflight).toBeTypeOf('function')
  })

  it('fails closed on an unknown production runtime before any composition', () => {
    expect(() =>
      createPostgresKernelRuntime({
        pool: { connect: async () => ({}) } as never,
        tenantId: TENANT,
        env: {
          NODE_ENV: 'production',
          [WORKER_RUNTIME_ENV]: 'mystery',
          [DURABLE_KERNEL_ORCHESTRATOR_ENV]: 'true'
        },
        agentId: AGENT
      })
    ).toThrow(/Unknown CVG_WORKER_RUNTIME value: mystery/)
  })

  it('fails prerequisites closed when the pool cannot connect', async () => {
    const pool = {
      connect: async () => {
        throw new Error('synthetic pool outage')
      }
    }

    await expect(
      assertPostgresKernelPrerequisites(pool as never, TENANT)
    ).rejects.toMatchObject({ code: 'kernel_runtime_prerequisites_missing' })
    await expect(
      assertPostgresKernelPrerequisites(pool as never, TENANT)
    ).rejects.toThrow(/synthetic pool outage/)
  })

  it('fails prerequisites closed on a non-error rejection', async () => {
    const client = {
      query: async () => {
        throw 'synthetic non-error prerequisite failure'
      },
      release: () => undefined
    }
    const pool = { connect: async () => client }

    await expect(
      assertPostgresKernelPrerequisites(pool as never, TENANT)
    ).rejects.toThrow(/synthetic non-error prerequisite failure/)
  })
})
