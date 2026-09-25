import { describe, expect, it, vi } from 'vitest'
import { TenantIdSchema } from '@cvg/platform'
import { InMemoryTelemetry } from '@cvg/observability'
import {
  InMemoryDatabase,
  OutboxRepository,
  type InboundRuntimeContext,
  type OutboxEventRecord
} from '@cvg/persistence'
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
  createPostgresKernelHandlers,
  createPostgresKernelRuntime,
  durableTurnResult,
  parseKernelTurnEnvelope,
  resolveWorkerRuntimeKind,
  type PostgresKernelRuntime
} from '../kernel-composition.ts'
import {
  CONTINUOUS_WORKER_RUN_MODE,
  DEFAULT_CONTINUOUS_WORKER_TUNING,
  createContinuousWorker,
  parseContinuousWorkerSettings,
  type ContinuousWorkerHandlers,
  type ContinuousWorkerOptions
} from '../continuous-worker.ts'
import { createControlledOutboxRevalidator } from '../outbox-revalidation.ts'
import { OutboxDispatchRejectedError } from '../jobs/process-outbox-event.ts'

const TENANT = TenantIdSchema.parse(
  'tenant_00000000-0000-4000-8000-0000000000c3'
)
const OTHER_TENANT = TenantIdSchema.parse(
  'tenant_11111111-1111-4111-8111-111111111111'
)
const AGENT = 'agent_00000000-0000-4000-8000-0000000000c3'
const OTHER_AGENT = 'agent_00000000-0000-4000-8000-0000000000d4'
const CORRELATION = 'corr_00000000-0000-4000-8000-0000000000c3'
const OTHER_CORRELATION = 'corr_00000000-0000-4000-8000-0000000000d4'
const CONVERSATION = 'conv_branches_b'
const SESSION = 'sess_branches_b'
const MESSAGE = 'msg_branches_b'
const TRACE = 'abcdef0123456789abcdef0123456789'
const CREATED_AT = new Date('2026-09-25T12:00:00.000Z')

function governedBase(
  outcome: string,
  overrides: Record<string, unknown> = {}
) {
  return {
    outcome,
    reason: `synthetic_${outcome}`,
    decision: {
      decision: outcome === 'approval_required' ? 'REQUIRE_APPROVAL' : 'ALLOW',
      reason: 'synthetic branches-b test',
      policyId: 'synthetic.controlled-kernel',
      policyVersion: 'synthetic.controlled-kernel@1.0.0',
      correlationId: CORRELATION,
      capability: 'appointment.modify',
      risk: 'MEDIUM_RISK_WRITE',
      evaluatedAt: CREATED_AT.toISOString()
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

function successfulEvidenceOf(mapped: unknown) {
  const evidence = (
    mapped as unknown as { evidence: Array<Record<string, unknown>> }
  ).evidence
  expect(evidence).toHaveLength(1)
  return evidence[0]!
}

describe('branches-b worker runtime selection guards', () => {
  it('exposes the runtime environment constants', () => {
    expect(WORKER_RUNTIME_ENV).toBe('CVG_WORKER_RUNTIME')
    expect(DURABLE_KERNEL_ORCHESTRATOR_ENV).toBe(
      'CVG_DURABLE_KERNEL_ORCHESTRATOR'
    )
    expect(KERNEL_WORKER_RUNTIME).toBe('kernel')
    expect(PUBLISHED_AGENT_WORKER_RUNTIME).toBe('published-agent')
  })

  it('defaults to the governed kernel and trims configured values', () => {
    expect(resolveWorkerRuntimeKind({})).toBe('kernel')
    expect(resolveWorkerRuntimeKind({ [WORKER_RUNTIME_ENV]: undefined })).toBe(
      'kernel'
    )
    expect(resolveWorkerRuntimeKind({ [WORKER_RUNTIME_ENV]: '' })).toBe(
      'kernel'
    )
    expect(resolveWorkerRuntimeKind({ [WORKER_RUNTIME_ENV]: '   ' })).toBe(
      'kernel'
    )
    expect(resolveWorkerRuntimeKind({ [WORKER_RUNTIME_ENV]: '  kernel  ' })).toBe(
      'kernel'
    )
    expect(
      resolveWorkerRuntimeKind({
        [WORKER_RUNTIME_ENV]: '  published-agent  '
      })
    ).toBe('published-agent')
  })

  it('fails closed on unknown runtime values with a typed error', () => {
    for (const configured of ['mystery', 'Kernel', 'KERNEL', 'kernel-v2']) {
      try {
        resolveWorkerRuntimeKind({ [WORKER_RUNTIME_ENV]: configured })
        expect.unreachable(`expected ${configured} to fail closed`)
      } catch (error) {
        expect(error).toBeInstanceOf(KernelRuntimeConfigurationError)
        const typed = error as KernelRuntimeConfigurationError
        expect(typed.name).toBe('KernelRuntimeConfigurationError')
        expect(typed.code).toBe('unknown_worker_runtime')
        expect(typed.message).toContain(
          `Unknown ${WORKER_RUNTIME_ENV} value: ${configured}`
        )
      }
    }
  })

  it('exposes every configuration error code', () => {
    for (const code of [
      'kernel_runtime_prerequisites_missing',
      'production_durable_kernel_required',
      'unknown_worker_runtime'
    ] as const) {
      const error = new KernelRuntimeConfigurationError(
        code,
        `synthetic ${code}`
      )
      expect(error).toBeInstanceOf(Error)
      expect(error.name).toBe('KernelRuntimeConfigurationError')
      expect(error.code).toBe(code)
    }
  })

  it('skips production enforcement outside production', () => {
    for (const nodeEnv of ['test', 'development', '', undefined]) {
      expect(
        resolveWorkerRuntimeKind({
          ...(nodeEnv === undefined ? {} : { NODE_ENV: nodeEnv })
        })
      ).toBe('kernel')
    }
  })

  it('requires the durable orchestrator flag for production kernel runs', () => {
    expect(
      resolveWorkerRuntimeKind({
        NODE_ENV: 'production',
        [DURABLE_KERNEL_ORCHESTRATOR_ENV]: 'true'
      })
    ).toBe('kernel')
    expect(
      resolveWorkerRuntimeKind({
        NODE_ENV: 'production',
        [WORKER_RUNTIME_ENV]: KERNEL_WORKER_RUNTIME,
        [DURABLE_KERNEL_ORCHESTRATOR_ENV]: 'TRUE'
      })
    ).toBe('kernel')
    expect(
      resolveWorkerRuntimeKind({
        NODE_ENV: 'production',
        [WORKER_RUNTIME_ENV]: KERNEL_WORKER_RUNTIME,
        [DURABLE_KERNEL_ORCHESTRATOR_ENV]: ' true '
      })
    ).toBe('kernel')
    for (const flag of [undefined, '', 'false', '1', 'yes']) {
      expect(() =>
        resolveWorkerRuntimeKind({
          NODE_ENV: 'production',
          [WORKER_RUNTIME_ENV]: KERNEL_WORKER_RUNTIME,
          ...(flag === undefined
            ? {}
            : { [DURABLE_KERNEL_ORCHESTRATOR_ENV]: flag })
        })
      ).toThrow(/CVG_DURABLE_KERNEL_ORCHESTRATOR=true/)
    }
  })

  it('forbids the published agent and unknown runtimes in production', () => {
    expect(() =>
      resolveWorkerRuntimeKind({
        NODE_ENV: 'production',
        [WORKER_RUNTIME_ENV]: PUBLISHED_AGENT_WORKER_RUNTIME,
        [DURABLE_KERNEL_ORCHESTRATOR_ENV]: 'true'
      })
    ).toThrow(/published-agent runtime is forbidden/)
    try {
      resolveWorkerRuntimeKind({
        NODE_ENV: 'production',
        [WORKER_RUNTIME_ENV]: PUBLISHED_AGENT_WORKER_RUNTIME,
        [DURABLE_KERNEL_ORCHESTRATOR_ENV]: 'true'
      })
    } catch (error) {
      expect((error as KernelRuntimeConfigurationError).code).toBe(
        'production_durable_kernel_required'
      )
    }
    expect(() =>
      resolveWorkerRuntimeKind({
        NODE_ENV: 'production',
        [WORKER_RUNTIME_ENV]: 'mystery',
        [DURABLE_KERNEL_ORCHESTRATOR_ENV]: 'true'
      })
    ).toThrow(/Unknown CVG_WORKER_RUNTIME value: mystery/)
  })
})

describe('branches-b controlled kernel constants', () => {
  it('pins synthetic policy prompt and runtime versions', () => {
    expect(CONTROLLED_KERNEL_POLICY_ID).toBe('synthetic.controlled-kernel')
    expect(CONTROLLED_KERNEL_POLICY_VERSION).toBe('1.0.0')
    expect(CONTROLLED_KERNEL_PROMPT_ID).toBe(
      'synthetic.controlled-kernel-prompt'
    )
    expect(CONTROLLED_KERNEL_PROMPT_VERSION).toBe('1.0.0')
    expect(CONTROLLED_KERNEL_RUNTIME_VERSION).toBe('aaa21-kernel-v1')
  })

  it('declares the full synthetic policy document shape', () => {
    expect(CONTROLLED_KERNEL_POLICY_DOCUMENT.policyId).toBe(
      CONTROLLED_KERNEL_POLICY_ID
    )
    expect(CONTROLLED_KERNEL_POLICY_DOCUMENT.version).toBe(
      CONTROLLED_KERNEL_POLICY_VERSION
    )
    expect(CONTROLLED_KERNEL_POLICY_DOCUMENT.effectiveFrom).toBe(
      '2026-09-01T00:00:00.000Z'
    )
    expect(CONTROLLED_KERNEL_POLICY_DOCUMENT.rules).toHaveLength(2)
    const readRule = CONTROLLED_KERNEL_POLICY_DOCUMENT.rules[0]!
    const writeRule = CONTROLLED_KERNEL_POLICY_DOCUMENT.rules[1]!
    expect(readRule).toMatchObject({
      id: 'synthetic-allow-schedule-read-appointment-draft',
      effect: 'ALLOW',
      priority: 10,
      capabilities: ['schedule.read'],
      resourceTypes: ['appointment_draft'],
      reason: 'Synthetic controlled read of an appointment draft'
    })
    expect(writeRule).toMatchObject({
      id: 'synthetic-require-approval-appointment-modify',
      effect: 'REQUIRE_APPROVAL',
      priority: 20,
      capabilities: ['appointment.modify'],
      resourceTypes: ['appointment_draft'],
      reason: 'Synthetic controlled write requires human approval'
    })
  })

  it('restricts effect scopes and validates the payload shape', () => {
    expect(CONTROLLED_KERNEL_EFFECT_SCOPES).toEqual({
      'schedule.read': 'controlled_fake',
      'appointment.modify': 'controlled_fake'
    })
    expect(
      CONTROLLED_KERNEL_PAYLOAD_SCHEMA.safeParse({ text: 'synthetic' }).success
    ).toBe(true)
    expect(
      CONTROLLED_KERNEL_PAYLOAD_SCHEMA.safeParse({ text: 7 }).success
    ).toBe(false)
    expect(
      CONTROLLED_KERNEL_PAYLOAD_SCHEMA.safeParse({}).success
    ).toBe(false)
    expect(
      CONTROLLED_KERNEL_PAYLOAD_SCHEMA.parse({ text: 'x', extra: 1 })
    ).toEqual({ text: 'x' })
  })
})

describe('branches-b kernel turn envelope parsing', () => {
  it('applies every controlled default on a minimal envelope', () => {
    const parsed = parseKernelTurnEnvelope(
      JSON.stringify({
        capability: 'schedule.read',
        action: 'schedule.read',
        resource: { type: 'appointment_draft' }
      })
    )

    expect(parsed).toMatchObject({
      capability: 'schedule.read',
      action: 'schedule.read',
      resource: { type: 'appointment_draft' },
      dataClassification: 'INTERNAL',
      operatorId: 'op_synthetic_kernel',
      operatorRole: 'Operator',
      agentVersion: 'synthetic-v1',
      agentProfile: 'secretary',
      modelProfile: 'fast',
      message: 'synthetic controlled kernel turn'
    })
    expect(parsed.idempotencyKey).toBeUndefined()
    expect(parsed.approvalId).toBeUndefined()
    expect(parsed.task).toBeUndefined()
  })

  it('keeps every explicitly provided optional field', () => {
    const parsed = parseKernelTurnEnvelope(
      JSON.stringify({
        capability: 'appointment.modify',
        action: 'appointment.modify',
        resource: { type: 'appointment_draft', id: 'draft_branches_b' },
        dataClassification: 'CONFIDENTIAL',
        operatorId: 'op_other',
        operatorRole: 'Approver',
        agentVersion: 'synthetic-v2',
        agentProfile: 'secretary',
        modelProfile: 'balanced',
        message: 'synthetic full envelope',
        idempotencyKey: 'idem-branches-b-001',
        approvalId: 'appr_branches_b',
        task: 'synthetic-task'
      })
    )

    expect(parsed.resource.id).toBe('draft_branches_b')
    expect(parsed.dataClassification).toBe('CONFIDENTIAL')
    expect(parsed.idempotencyKey).toBe('idem-branches-b-001')
    expect(parsed.approvalId).toBe('appr_branches_b')
    expect(parsed.task).toBe('synthetic-task')
    expect(parsed.message).toBe('synthetic full envelope')
  })

  it('unwraps cvgTurn envelopes and rejects null or missing turns', () => {
    const wrapped = parseKernelTurnEnvelope(
      JSON.stringify({
        cvgTurn: {
          capability: 'schedule.read',
          action: 'schedule.read',
          resource: { type: 'appointment_draft' }
        }
      })
    )
    expect(wrapped.capability).toBe('schedule.read')

    for (const body of [
      JSON.stringify({ cvgTurn: null }),
      JSON.stringify({ cvgTurn: { capability: 'schedule.read' } }),
      '42',
      'null',
      '[1,2]',
      '"just-a-string"'
    ]) {
      expect(() => parseKernelTurnEnvelope(body)).toThrow(
        /kernel_turn_envelope_invalid/
      )
    }
  })

  it('rejects bodies that are not JSON', () => {
    expect(() => parseKernelTurnEnvelope('not-json')).toThrow(
      /kernel_turn_envelope_invalid: inbound body is not a JSON turn envelope/
    )
    expect(() => parseKernelTurnEnvelope('')).toThrow(
      /kernel_turn_envelope_invalid: inbound body is not a JSON turn envelope/
    )
  })

  it('rejects strict violations at the top level and inside resource', () => {
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
    expect(() =>
      parseKernelTurnEnvelope(
        JSON.stringify({
          capability: 'schedule.read',
          action: 'schedule.read',
          resource: { type: 'appointment_draft', extra: 'x' }
        })
      )
    ).toThrow(/kernel_turn_envelope_invalid/)
    expect(() =>
      parseKernelTurnEnvelope(
        JSON.stringify({
          capability: 'schedule.read',
          action: 'schedule.read',
          resource: {}
        })
      )
    ).toThrow(/kernel_turn_envelope_invalid/)
    expect(() =>
      parseKernelTurnEnvelope(
        JSON.stringify({
          capability: 'not-a-capability',
          action: 'schedule.read',
          resource: { type: 'appointment_draft' }
        })
      )
    ).toThrow(/kernel_turn_envelope_invalid/)
  })

  it('rejects empty actions and out-of-range optional fields', () => {
    const base = {
      capability: 'schedule.read',
      action: 'schedule.read',
      resource: { type: 'appointment_draft' }
    }
    expect(() =>
      parseKernelTurnEnvelope(JSON.stringify({ ...base, action: '' }))
    ).toThrow(/kernel_turn_envelope_invalid/)
    expect(() =>
      parseKernelTurnEnvelope(
        JSON.stringify({ ...base, action: 'a'.repeat(121) })
      )
    ).toThrow(/kernel_turn_envelope_invalid/)
    expect(() =>
      parseKernelTurnEnvelope(
        JSON.stringify({ ...base, idempotencyKey: 'short' })
      )
    ).toThrow(/kernel_turn_envelope_invalid/)
    expect(() =>
      parseKernelTurnEnvelope(JSON.stringify({ ...base, approvalId: '' }))
    ).toThrow(/kernel_turn_envelope_invalid/)
    expect(() =>
      parseKernelTurnEnvelope(JSON.stringify({ ...base, message: '' }))
    ).toThrow(/kernel_turn_envelope_invalid/)
  })

  it('joins multiple schema issues into one message', () => {
    try {
      parseKernelTurnEnvelope(
        JSON.stringify({
          capability: 'not-a-capability',
          action: '',
          resource: {}
        })
      )
      expect.unreachable('expected the envelope to fail closed')
    } catch (error) {
      const message = (error as Error).message
      expect(message).toMatch(/^kernel_turn_envelope_invalid: /)
      expect(message).toContain('; ')
    }
  })

  it('exposes envelope defaults through the zod schema', () => {
    const parsed = KernelTurnEnvelopeSchema.parse({
      capability: 'schedule.read',
      action: 'schedule.read',
      resource: { type: 'appointment_draft' }
    })
    expect(parsed.agentProfile).toBe('secretary')
    expect(parsed.modelProfile).toBe('fast')
    expect(parsed.operatorRole).toBe('Operator')
  })
})

describe('branches-b kernel continuation payload schema', () => {
  it('defaults an omitted decision to approve', () => {
    const parsed = KernelContinuationPayloadSchema.parse({
      kind: 'runtime_approval.continue',
      approvalId: 'appr_branches_b'
    })
    expect(parsed).toMatchObject({
      kind: 'runtime_approval.continue',
      approvalId: 'appr_branches_b',
      decision: 'approve'
    })
    expect(parsed.traceId).toBeUndefined()
  })

  it('accepts reject decisions with a valid trace id', () => {
    const parsed = KernelContinuationPayloadSchema.parse({
      kind: 'runtime_approval.continue',
      approvalId: 'appr_branches_b',
      decision: 'reject',
      traceId: TRACE
    })
    expect(parsed.decision).toBe('reject')
    expect(parsed.traceId).toBe(TRACE)
  })

  it('rejects invalid kinds decisions approval ids and traces', () => {
    expect(
      KernelContinuationPayloadSchema.safeParse({
        kind: 'other',
        approvalId: 'appr_branches_b'
      }).success
    ).toBe(false)
    expect(
      KernelContinuationPayloadSchema.safeParse({
        kind: 'runtime_approval.continue',
        approvalId: 'appr_branches_b',
        decision: 'maybe'
      }).success
    ).toBe(false)
    expect(
      KernelContinuationPayloadSchema.safeParse({
        kind: 'runtime_approval.continue',
        approvalId: ''
      }).success
    ).toBe(false)
    expect(
      KernelContinuationPayloadSchema.safeParse({
        kind: 'runtime_approval.continue',
        approvalId: 'a'.repeat(161)
      }).success
    ).toBe(false)
    expect(
      KernelContinuationPayloadSchema.safeParse({
        kind: 'runtime_approval.continue',
        approvalId: 'a'.repeat(160)
      }).success
    ).toBe(true)
    expect(
      KernelContinuationPayloadSchema.safeParse({
        kind: 'runtime_approval.continue',
        approvalId: 'appr_branches_b',
        traceId: 'not-hex'
      }).success
    ).toBe(false)
    expect(
      KernelContinuationPayloadSchema.safeParse({
        kind: 'runtime_approval.continue',
        approvalId: 'appr_branches_b',
        extra: true
      }).success
    ).toBe(false)
    expect(KernelContinuationPayloadSchema.safeParse(null).success).toBe(false)
  })
})

describe('branches-b durable turn result mapping', () => {
  it('maps approval_required with optional approval and digest branches', () => {
    const full = durableTurnResult(
      governedBase('approval_required', {
        approvalId: 'appr_branches_b',
        resultDigest: 'd'.repeat(64),
        modelResult: { text: 'synthetic' }
      })
    )
    expect(full).toMatchObject({
      outcome: 'approval_required',
      approvalId: 'appr_branches_b',
      resultDigest: 'd'.repeat(64),
      toolCalls: 0,
      modelCalls: 1
    })

    const minimal = durableTurnResult(governedBase('approval_required'))
    expect(minimal).toMatchObject({
      outcome: 'approval_required',
      toolCalls: 0,
      modelCalls: 0
    })
    expect(minimal).not.toHaveProperty('approvalId')
    expect(minimal).not.toHaveProperty('resultDigest')

    const approvalOnly = durableTurnResult(
      governedBase('approval_required', { approvalId: 'appr_branches_b' })
    )
    expect(approvalOnly).toMatchObject({
      outcome: 'approval_required',
      approvalId: 'appr_branches_b',
      modelCalls: 0
    })
    expect(approvalOnly).not.toHaveProperty('resultDigest')
  })

  it('maps denied to failed with optional digest branches', () => {
    const full = durableTurnResult(
      governedBase('denied', {
        resultDigest: 'e'.repeat(64),
        modelResult: { text: 'synthetic' }
      })
    )
    expect(full).toMatchObject({
      outcome: 'failed',
      resultDigest: 'e'.repeat(64),
      toolCalls: 0,
      modelCalls: 1
    })

    const minimal = durableTurnResult(governedBase('denied'))
    expect(minimal).toMatchObject({
      outcome: 'failed',
      toolCalls: 0,
      modelCalls: 0
    })
    expect(minimal).not.toHaveProperty('resultDigest')
  })

  it('maps shadowed to waiting_external with optional digest branches', () => {
    const full = durableTurnResult(
      governedBase('shadowed', {
        resultDigest: 'f'.repeat(64),
        modelResult: { text: 'synthetic' }
      })
    )
    expect(full).toMatchObject({
      outcome: 'waiting_external',
      resultDigest: 'f'.repeat(64),
      toolCalls: 0,
      modelCalls: 1
    })

    const minimal = durableTurnResult(governedBase('shadowed'))
    expect(minimal).toMatchObject({
      outcome: 'waiting_external',
      toolCalls: 0,
      modelCalls: 0
    })
    expect(minimal).not.toHaveProperty('resultDigest')
  })

  it('prefers execution references then digests then trace ids as evidence', () => {
    const byExecutionRef = durableTurnResult(
      governedBase('executed', {
        effectConfirmed: true,
        executionRef: 'exec_branches_b',
        resultDigest: 'a'.repeat(64),
        eventType: 'appointment.modify.executed',
        toolResult: { synthetic: true },
        modelResult: { text: 'synthetic' }
      })
    )
    expect(byExecutionRef).toMatchObject({
      outcome: 'succeeded',
      toolCalls: 1,
      modelCalls: 1
    })
    expect(successfulEvidenceOf(byExecutionRef)).toMatchObject({
      source: 'effect_journal',
      reference: 'exec_branches_b',
      verified: true,
      eventType: 'appointment.modify.executed',
      key: 'appointment.modify.executed',
      digest: 'a'.repeat(64)
    })

    const byDigest = durableTurnResult(
      governedBase('executed', {
        effectConfirmed: true,
        resultDigest: 'b'.repeat(64),
        correlationId: CORRELATION
      })
    )
    expect(successfulEvidenceOf(byDigest)).toMatchObject({
      source: 'effect_journal',
      reference: 'b'.repeat(64)
    })

    const byTrace = durableTurnResult(
      governedBase('executed', { effectConfirmed: true })
    )
    expect(successfulEvidenceOf(byTrace)).toMatchObject({
      source: 'effect_journal',
      reference: TRACE
    })
    expect(successfulEvidenceOf(byTrace)).not.toHaveProperty('eventType')
    expect(successfulEvidenceOf(byTrace)).not.toHaveProperty('digest')
  })

  it('carries outbox evidence with optional event type and digest branches', () => {
    const full = durableTurnResult(
      governedBase('executed', {
        outboxEventId: 'evt_branches_b',
        eventType: 'appointment.modify.executed',
        resultDigest: 'c'.repeat(64)
      })
    )
    expect(full).toMatchObject({ outcome: 'succeeded', toolCalls: 0 })
    expect(successfulEvidenceOf(full)).toMatchObject({
      source: 'outbox',
      reference: 'evt_branches_b',
      verified: true,
      eventType: 'appointment.modify.executed',
      digest: 'c'.repeat(64)
    })

    const minimal = durableTurnResult(
      governedBase('executed', { outboxEventId: 'evt_branches_b' })
    )
    expect(successfulEvidenceOf(minimal)).toMatchObject({
      source: 'outbox',
      reference: 'evt_branches_b'
    })
    expect(successfulEvidenceOf(minimal)).not.toHaveProperty('eventType')
  })

  it('succeeds with empty evidence and accounts tool and model calls', () => {
    const empty = durableTurnResult(governedBase('executed'))
    expect(empty).toMatchObject({
      outcome: 'succeeded',
      toolCalls: 0,
      modelCalls: 0
    })
    expect((empty as { evidence: unknown[] }).evidence).toEqual([])

    const unconfirmed = durableTurnResult(
      governedBase('executed', { effectConfirmed: false })
    )
    expect((unconfirmed as { evidence: unknown[] }).evidence).toEqual([])

    const withCalls = durableTurnResult(
      governedBase('executed', {
        outboxEventId: 'evt_branches_b',
        toolResult: { synthetic: true },
        modelResult: { text: 'synthetic' },
        resultDigest: 'd'.repeat(64)
      })
    )
    expect(withCalls).toMatchObject({
      outcome: 'succeeded',
      resultDigest: 'd'.repeat(64),
      toolCalls: 1,
      modelCalls: 1
    })
  })
})

const ALL_DURABLE_MIGRATIONS = [
  '0019_orchestrator_state',
  '0020_orchestrator_lineage_hardening',
  '0021_orchestrator_iteration_budget',
  '0022_orchestrator_evaluation_lineage',
  '0023_orchestrator_replan_fencing',
  '0024_tenant_isolation_constraint_validation'
]

function prerequisitePool(
  migrationVersions: string[],
  onQuery?: (text: string) => void,
  failTablesWith?: unknown
) {
  const client = {
    query: async (text: string) => {
      onQuery?.(text)
      if (
        typeof text === 'string' &&
        text.includes('FROM schema_migrations')
      ) {
        return { rows: migrationVersions.map((version) => ({ version })) }
      }
      if (text === 'SHOW search_path') {
        return { rows: [{ search_path: '"$user", public' }] }
      }
      if (
        failTablesWith !== undefined &&
        typeof text === 'string' &&
        text.startsWith('SELECT 1 FROM')
      ) {
        throw failTablesWith
      }
      return { rows: [] }
    },
    release: () => undefined
  }
  return { connect: async () => client }
}

describe('branches-b kernel postgres prerequisites without a database', () => {
  it('fails closed when the pool cannot connect', async () => {
    const pool = {
      connect: async () => {
        throw new Error('synthetic branches-b pool outage')
      }
    }

    await expect(
      assertPostgresKernelPrerequisites(pool as never, TENANT)
    ).rejects.toMatchObject({ code: 'kernel_runtime_prerequisites_missing' })
    await expect(
      assertPostgresKernelPrerequisites(pool as never, TENANT)
    ).rejects.toThrow(/synthetic branches-b pool outage/)
  })

  it('fails closed when a required table probe throws', async () => {
    const pool = prerequisitePool(
      ALL_DURABLE_MIGRATIONS,
      undefined,
      new Error('synthetic branches-b table probe outage')
    )

    await expect(
      assertPostgresKernelPrerequisites(pool as never, TENANT)
    ).rejects.toMatchObject({ code: 'kernel_runtime_prerequisites_missing' })
    await expect(
      assertPostgresKernelPrerequisites(pool as never, TENANT)
    ).rejects.toThrow(/synthetic branches-b table probe outage/)
  })

  it('fails closed on non-error table probe failures', async () => {
    const pool = prerequisitePool(
      ALL_DURABLE_MIGRATIONS,
      undefined,
      'synthetic branches-b string probe failure'
    )

    await expect(
      assertPostgresKernelPrerequisites(pool as never, TENANT)
    ).rejects.toThrow(/synthetic branches-b string probe failure/)
  })

  it('fails closed when durable migrations are missing', async () => {
    const pool = prerequisitePool(['0019_orchestrator_state'])

    await expect(
      assertPostgresKernelPrerequisites(pool as never, TENANT)
    ).rejects.toMatchObject({ code: 'kernel_runtime_prerequisites_missing' })
    await expect(
      assertPostgresKernelPrerequisites(pool as never, TENANT)
    ).rejects.toThrow(/missing migrations: 0020_orchestrator_lineage_hardening/)
  })

  it('probes every durable table before checking migrations', async () => {
    const seen: string[] = []
    const pool = prerequisitePool(ALL_DURABLE_MIGRATIONS, (text) =>
      seen.push(text)
    )

    await expect(
      assertPostgresKernelPrerequisites(pool as never, TENANT)
    ).resolves.toBeUndefined()
    for (const table of [
      'effect_journal',
      'outbox_events',
      'runtime_approvals',
      'runtime_audit_events',
      'orchestrator_goals',
      'orchestrator_plans',
      'orchestrator_steps',
      'orchestrator_attempts',
      'orchestrator_observations',
      'orchestrator_evaluations'
    ]) {
      expect(seen.some((text) => text.includes(table))).toBe(true)
    }
  })
})

describe('branches-b kernel runtime composition without a database', () => {
  it('fails closed without a connectable pool', () => {
    for (const pool of [undefined, null, {}, { connect: 'x' }]) {
      expect(() =>
        createPostgresKernelRuntime({
          pool: pool as never,
          tenantId: TENANT,
          env: {},
          agentId: AGENT
        })
      ).toThrow(KernelRuntimeConfigurationError)
      try {
        createPostgresKernelRuntime({
          pool: pool as never,
          tenantId: TENANT,
          env: {},
          agentId: AGENT
        })
        expect.unreachable('expected pool validation to fail closed')
      } catch (error) {
        expect((error as KernelRuntimeConfigurationError).code).toBe(
          'kernel_runtime_prerequisites_missing'
        )
      }
    }
  })

  it('fails closed on production guards before any composition', () => {
    const pool = { connect: async () => ({}) }
    expect(() =>
      createPostgresKernelRuntime({
        pool: pool as never,
        tenantId: TENANT,
        env: {
          NODE_ENV: 'production',
          [WORKER_RUNTIME_ENV]: 'mystery',
          [DURABLE_KERNEL_ORCHESTRATOR_ENV]: 'true'
        },
        agentId: AGENT
      })
    ).toThrow(/Unknown CVG_WORKER_RUNTIME value: mystery/)
    expect(() =>
      createPostgresKernelRuntime({
        pool: pool as never,
        tenantId: TENANT,
        env: {
          NODE_ENV: 'production',
          [WORKER_RUNTIME_ENV]: PUBLISHED_AGENT_WORKER_RUNTIME,
          [DURABLE_KERNEL_ORCHESTRATOR_ENV]: 'true'
        },
        agentId: AGENT
      })
    ).toThrow(/published-agent runtime is forbidden/)
    expect(() =>
      createPostgresKernelRuntime({
        pool: pool as never,
        tenantId: TENANT,
        env: {
          NODE_ENV: 'production',
          [WORKER_RUNTIME_ENV]: KERNEL_WORKER_RUNTIME
        },
        agentId: AGENT
      })
    ).toThrow(/CVG_DURABLE_KERNEL_ORCHESTRATOR=true/)
  })

  it('composes a durable runtime without opening a connection', () => {
    const runtime = createPostgresKernelRuntime({
      pool: { connect: async () => ({}) } as never,
      tenantId: TENANT,
      env: {},
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
    expect(runtime.workflowCoordinator.coordinator).toBeNull()
    expect(runtime.toolInvocations).toEqual([])
    expect(runtime.turnResults).toEqual([])
    expect(runtime.runTurn).toBeTypeOf('function')
    expect(runtime.runDurableGoal).toBeTypeOf('function')
    expect(runtime.recoverDurableGoals).toBeTypeOf('function')
    expect(runtime.preflight).toBeTypeOf('function')
  })

  it('honours an explicit worker id or falls back to the process worker', () => {
    const pool = { connect: async () => ({}) } as never
    const explicit = createPostgresKernelRuntime({
      pool,
      tenantId: TENANT,
      env: { CVG_WORKER_ID: 'worker-branches-b' },
      agentId: AGENT
    })
    expect(explicit.orchestrator).toBeDefined()

    const fallback = createPostgresKernelRuntime({
      pool,
      tenantId: TENANT,
      env: { CVG_WORKER_ID: '   ' },
      agentId: AGENT
    })
    expect(fallback.orchestrator).toBeDefined()
  })

  it('uses provided runtime telemetry instead of the local collector', () => {
    const telemetry = new InMemoryTelemetry()
    const runtime = createPostgresKernelRuntime({
      pool: { connect: async () => ({}) } as never,
      tenantId: TENANT,
      env: {},
      agentId: AGENT,
      runtimeTelemetry: telemetry
    })
    expect(runtime.telemetry).toBe(telemetry)
  })

  it('resolves the default and explicit governed coordinators', () => {
    const pool = { connect: async () => ({}) } as never
    const implicit = createPostgresKernelRuntime({
      pool,
      tenantId: TENANT,
      env: {},
      agentId: AGENT
    })
    expect(implicit.workflowCoordinator.coordinator).toBeNull()

    const explicit = createPostgresKernelRuntime({
      pool,
      tenantId: TENANT,
      env: { WORKFLOW_COORDINATOR: '  governed-kernel  ' },
      agentId: AGENT
    })
    expect(explicit.workflowCoordinator.coordinator).toBeNull()
  })

  it('fails closed when the frontier coordinator has no injected adapter', () => {
    expect(() =>
      createPostgresKernelRuntime({
        pool: { connect: async () => ({}) } as never,
        tenantId: TENANT,
        env: { WORKFLOW_COORDINATOR: 'langgraph-frontier' },
        agentId: AGENT
      })
    ).toThrow(/requires an injected frontier adapter/)
    expect(() =>
      createPostgresKernelRuntime({
        pool: { connect: async () => ({}) } as never,
        tenantId: TENANT,
        env: { WORKFLOW_COORDINATOR: 'mystery-coordinator' },
        agentId: AGENT
      })
    ).toThrow(/Unknown WORKFLOW_COORDINATOR value: mystery-coordinator/)
  })

  it('composes with an injected frontier adapter without a connection', () => {
    const runtime = createPostgresKernelRuntime({
      pool: { connect: async () => ({}) } as never,
      tenantId: TENANT,
      env: { WORKFLOW_COORDINATOR: 'langgraph-frontier' },
      agentId: AGENT,
      workflowCoordinatorAdapters: {
        'langgraph-frontier': { planStep: async () => ({}) }
      } as never
    })
    expect(runtime.workflowCoordinator.coordinator).not.toBeNull()
  })
})

function fakeKernelRuntime(
  conversations: Record<string, unknown>,
  extra: Record<string, unknown> = {}
) {
  const runTurn = vi.fn()
  return {
    runtime: {
      tenantId: TENANT,
      agentId: AGENT,
      conversations,
      workflowCoordinator: {
        kind: 'governed-kernel' as const,
        coordinator: null
      },
      runTurn,
      approvals: {
        get: vi.fn(),
        findByContinuation: vi.fn().mockResolvedValue(undefined)
      },
      ...extra
    } as unknown as PostgresKernelRuntime,
    runTurn
  }
}

function kernelInboundEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'outbox_branches_b',
    type: 'inbound.process',
    payload: {},
    tenantId: TENANT,
    correlationId: CORRELATION,
    traceId: TRACE,
    conversationId: CONVERSATION,
    sessionId: SESSION,
    inboundMessageId: MESSAGE,
    status: 'processing' as const,
    createdAt: CREATED_AT,
    ...overrides
  } as unknown as Parameters<
    ReturnType<typeof createPostgresKernelHandlers>['inboundProcess']
  >[0]
}

describe('branches-b kernel handler construction guards', () => {
  it('creates handlers with a revalidator and a suppressed outbound seam', () => {
    const { runtime } = fakeKernelRuntime({
      findInboundRuntimeContext: vi.fn()
    })
    const handlers = createPostgresKernelHandlers({}, runtime)

    expect(handlers.revalidateOutbox).toBeTypeOf('function')
    expect(handlers.messageOutbound({} as never)).toEqual({
      status: 'controlled_outbound_suppressed',
      externalEffects: false
    })
  })

  it('accepts matching agent ids from either environment variable', () => {
    const { runtime } = fakeKernelRuntime({ findInboundRuntimeContext: vi.fn() })
    expect(() =>
      createPostgresKernelHandlers({ CVG_WORKER_AGENT_ID: AGENT }, runtime)
    ).not.toThrow()
    expect(() =>
      createPostgresKernelHandlers({ INBOUND_AGENT_ID: AGENT }, runtime)
    ).not.toThrow()
    expect(() =>
      createPostgresKernelHandlers(
        { CVG_WORKER_AGENT_ID: '', INBOUND_AGENT_ID: AGENT },
        runtime
      )
    ).not.toThrow()
    expect(() =>
      createPostgresKernelHandlers(
        { CVG_WORKER_AGENT_ID: '   ', INBOUND_AGENT_ID: '   ' },
        runtime
      )
    ).not.toThrow()
  })

  it('rejects mismatched or malformed agent ids', () => {
    const { runtime } = fakeKernelRuntime({ findInboundRuntimeContext: vi.fn() })
    for (const env of [
      { CVG_WORKER_AGENT_ID: OTHER_AGENT },
      { INBOUND_AGENT_ID: OTHER_AGENT }
    ]) {
      expect(() => createPostgresKernelHandlers(env, runtime)).toThrow(
        /does not match the composed runtime/
      )
      try {
        createPostgresKernelHandlers(env, runtime)
        expect.unreachable('expected agent id validation to fail closed')
      } catch (error) {
        expect((error as KernelRuntimeConfigurationError).code).toBe(
          'kernel_runtime_prerequisites_missing'
        )
      }
    }
    expect(() =>
      createPostgresKernelHandlers({ CVG_WORKER_AGENT_ID: 'not-an-agent' }, runtime)
    ).toThrow()
  })

  it('enforces the production durable kernel guard on handler creation', () => {
    const { runtime } = fakeKernelRuntime({ findInboundRuntimeContext: vi.fn() })
    expect(() =>
      createPostgresKernelHandlers({ NODE_ENV: 'production' }, runtime)
    ).toThrow(/CVG_DURABLE_KERNEL_ORCHESTRATOR=true/)
    expect(() =>
      createPostgresKernelHandlers(
        {
          NODE_ENV: 'production',
          [DURABLE_KERNEL_ORCHESTRATOR_ENV]: 'true'
        },
        runtime
      )
    ).not.toThrow()
  })

  it('exposes durable recovery only when enabled and composed', () => {
    const recoverDurableGoals = vi.fn()
    const withRecovery = fakeKernelRuntime(
      { findInboundRuntimeContext: vi.fn() },
      { recoverDurableGoals }
    )
    const enabled = createPostgresKernelHandlers(
      { [DURABLE_KERNEL_ORCHESTRATOR_ENV]: 'true' },
      withRecovery.runtime
    )
    expect('recoverDurableGoals' in enabled).toBe(true)

    const withoutRuntimeHook = fakeKernelRuntime({
      findInboundRuntimeContext: vi.fn()
    })
    const enabledWithoutHook = createPostgresKernelHandlers(
      { [DURABLE_KERNEL_ORCHESTRATOR_ENV]: 'TRUE' },
      withoutRuntimeHook.runtime
    )
    expect('recoverDurableGoals' in enabledWithoutHook).toBe(false)

    const disabled = createPostgresKernelHandlers(
      {},
      withRecovery.runtime
    )
    expect('recoverDurableGoals' in disabled).toBe(false)
  })
})

describe('branches-b kernel inbound guard branches', () => {
  it('rejects events without runtime identifiers before any lookup', async () => {
    const findInboundRuntimeContext = vi.fn()
    const { runtime, runTurn } = fakeKernelRuntime({
      findInboundRuntimeContext
    })
    const handlers = createPostgresKernelHandlers({}, runtime)

    await expect(
      handlers.inboundProcess(
        kernelInboundEvent({ conversationId: null, inboundMessageId: null })
      )
    ).rejects.toThrow(/missing runtime identifiers/)
    await expect(
      handlers.inboundProcess(
        kernelInboundEvent({ conversationId: '', inboundMessageId: MESSAGE })
      )
    ).rejects.toThrow(/missing runtime identifiers/)
    expect(findInboundRuntimeContext).not.toHaveBeenCalled()
    expect(runTurn).not.toHaveBeenCalled()
  })

  it('rejects malformed tenant correlation and trace identifiers', async () => {
    const { runtime } = fakeKernelRuntime({
      findInboundRuntimeContext: vi.fn()
    })
    const handlers = createPostgresKernelHandlers({}, runtime)

    await expect(
      handlers.inboundProcess(kernelInboundEvent({ tenantId: 'not-a-tenant' }))
    ).rejects.toThrow()
    await expect(
      handlers.inboundProcess(kernelInboundEvent({ correlationId: 'bad' }))
    ).rejects.toThrow()
    await expect(
      handlers.inboundProcess(kernelInboundEvent({ traceId: 'bad' }))
    ).rejects.toThrow()
  })

  it('rejects a tenant that does not match the composed worker tenant', async () => {
    const findInboundRuntimeContext = vi.fn()
    const { runtime, runTurn } = fakeKernelRuntime({
      findInboundRuntimeContext
    })
    const handlers = createPostgresKernelHandlers({}, runtime)

    await expect(
      handlers.inboundProcess(kernelInboundEvent({ tenantId: OTHER_TENANT }))
    ).rejects.toThrow(
      /does not match the configured kernel worker tenant/
    )
    expect(findInboundRuntimeContext).not.toHaveBeenCalled()
    expect(runTurn).not.toHaveBeenCalled()
  })

  it('rejects a missing runtime context', async () => {
    const findInboundRuntimeContext = vi.fn().mockResolvedValue(null)
    const { runtime, runTurn } = fakeKernelRuntime({
      findInboundRuntimeContext
    })
    const handlers = createPostgresKernelHandlers({}, runtime)

    await expect(
      handlers.inboundProcess(kernelInboundEvent())
    ).rejects.toThrow(/Inbound runtime context was not found/)
    expect(runTurn).not.toHaveBeenCalled()
  })

  it('rejects a correlation that differs from the persisted conversation', async () => {
    const findInboundRuntimeContext = vi.fn().mockResolvedValue({
      message: { id: MESSAGE },
      channel: 'web',
      senderRef: 'synthetic',
      correlationId: OTHER_CORRELATION,
      session: null
    })
    const { runtime, runTurn } = fakeKernelRuntime({
      findInboundRuntimeContext
    })
    const handlers = createPostgresKernelHandlers({}, runtime)

    await expect(
      handlers.inboundProcess(kernelInboundEvent())
    ).rejects.toThrow(/does not match the persisted conversation/)
    expect(runTurn).not.toHaveBeenCalled()
  })

  it('rejects a trace that differs from the persisted message trace', async () => {
    const findInboundRuntimeContext = vi.fn().mockResolvedValue({
      message: {
        id: MESSAGE,
        runtimeTraceId: 'ffffffffffffffffffffffffffffffff'
      },
      channel: 'web',
      senderRef: 'synthetic',
      correlationId: CORRELATION,
      session: null
    })
    const { runtime, runTurn } = fakeKernelRuntime({
      findInboundRuntimeContext
    })
    const handlers = createPostgresKernelHandlers({}, runtime)

    await expect(
      handlers.inboundProcess(kernelInboundEvent())
    ).rejects.toThrow(/trace does not match the persisted conversation/)
    expect(runTurn).not.toHaveBeenCalled()
  })
})

function stubWorkerHandlers(
  overrides: Partial<ContinuousWorkerHandlers> = {}
): ContinuousWorkerHandlers {
  return {
    inboundProcess: () => ({ status: 'controlled_noop' }),
    messageOutbound: () => ({ status: 'controlled_noop' }),
    ...overrides
  }
}

function workerOptions(
  overrides: Partial<ContinuousWorkerOptions> = {}
): ContinuousWorkerOptions {
  return {
    tenantId: TENANT,
    workerId: 'worker-branches-b',
    adapter: new OutboxRepository(new InMemoryDatabase()),
    handlers: stubWorkerHandlers(),
    pollIntervalMs: 5,
    leaseMs: 1_000,
    drainMs: 50,
    summaryIntervalMs: 60_000,
    ...overrides
  }
}

describe('branches-b continuous worker settings', () => {
  it('exposes the run mode and default tuning', () => {
    expect(CONTINUOUS_WORKER_RUN_MODE).toBe('continuous')
    expect(DEFAULT_CONTINUOUS_WORKER_TUNING).toMatchObject({
      pollIntervalMs: 250,
      idleMaxBackoffMs: 5_000,
      errorBackoffMs: 500,
      errorMaxBackoffMs: 30_000,
      concurrency: 2,
      leaseMs: 30_000,
      drainMs: 10_000,
      summaryIntervalMs: 30_000
    })
  })

  it('parses defaults and every documented override', () => {
    expect(parseContinuousWorkerSettings({})).toEqual(
      DEFAULT_CONTINUOUS_WORKER_TUNING
    )
    const parsed = parseContinuousWorkerSettings({
      CVG_WORKER_POLL_INTERVAL_MS: '50',
      CVG_WORKER_IDLE_MAX_BACKOFF_MS: '60',
      CVG_WORKER_ERROR_BACKOFF_MS: '70',
      CVG_WORKER_ERROR_MAX_BACKOFF_MS: '80',
      CVG_WORKER_CONCURRENCY: '3',
      CVG_WORKER_LEASE_MS: '5_000'.replace('_', ''),
      CVG_WORKER_DRAIN_MS: '100',
      CVG_WORKER_SUMMARY_INTERVAL_MS: '200'
    })
    expect(parsed).toMatchObject({
      pollIntervalMs: 50,
      idleMaxBackoffMs: 60,
      errorBackoffMs: 70,
      errorMaxBackoffMs: 80,
      concurrency: 3,
      leaseMs: 5000,
      drainMs: 100,
      summaryIntervalMs: 200
    })
  })

  it('falls back on empty values and accepts boundary settings', () => {
    expect(
      parseContinuousWorkerSettings({
        CVG_WORKER_CONCURRENCY: '',
        CVG_WORKER_POLL_INTERVAL_MS: '   '
      }).concurrency
    ).toBe(2)
    expect(
      parseContinuousWorkerSettings({ CVG_WORKER_CONCURRENCY: '1' }).concurrency
    ).toBe(1)
    expect(
      parseContinuousWorkerSettings({ CVG_WORKER_CONCURRENCY: '10' }).concurrency
    ).toBe(10)
    expect(parseContinuousWorkerSettings({ CVG_WORKER_DRAIN_MS: '0' }).drainMs).toBe(
      0
    )
    expect(
      parseContinuousWorkerSettings({ CVG_WORKER_DRAIN_MS: '600000' }).drainMs
    ).toBe(600_000)
    expect(
      parseContinuousWorkerSettings({
        CVG_WORKER_POLL_INTERVAL_MS: '50',
        CVG_WORKER_IDLE_MAX_BACKOFF_MS: '50'
      }).idleMaxBackoffMs
    ).toBe(50)
    expect(
      parseContinuousWorkerSettings({
        CVG_WORKER_ERROR_BACKOFF_MS: '50',
        CVG_WORKER_ERROR_MAX_BACKOFF_MS: '50'
      }).errorMaxBackoffMs
    ).toBe(50)
  })

  it('rejects malformed values with the owning variable name', () => {
    expect(() =>
      parseContinuousWorkerSettings({ CVG_WORKER_POLL_INTERVAL_MS: 'x' })
    ).toThrow(/CVG_WORKER_POLL_INTERVAL_MS must be a positive integer/)
    expect(() =>
      parseContinuousWorkerSettings({ CVG_WORKER_POLL_INTERVAL_MS: '2.5' })
    ).toThrow(/CVG_WORKER_POLL_INTERVAL_MS must be a positive integer/)
    expect(() =>
      parseContinuousWorkerSettings({ CVG_WORKER_POLL_INTERVAL_MS: '0' })
    ).toThrow(/CVG_WORKER_POLL_INTERVAL_MS must be a positive integer/)
    expect(() =>
      parseContinuousWorkerSettings({ CVG_WORKER_CONCURRENCY: '0' })
    ).toThrow(/CVG_WORKER_CONCURRENCY must be an integer between 1 and 10/)
    expect(() =>
      parseContinuousWorkerSettings({ CVG_WORKER_CONCURRENCY: '11' })
    ).toThrow(/CVG_WORKER_CONCURRENCY must be an integer between 1 and 10/)
    expect(() =>
      parseContinuousWorkerSettings({ CVG_WORKER_LEASE_MS: '999' })
    ).toThrow(/CVG_WORKER_LEASE_MS must be an integer between/)
    expect(() =>
      parseContinuousWorkerSettings({ CVG_WORKER_LEASE_MS: '3600001' })
    ).toThrow(/CVG_WORKER_LEASE_MS must be an integer between/)
    expect(() =>
      parseContinuousWorkerSettings({ CVG_WORKER_DRAIN_MS: '-1' })
    ).toThrow(/CVG_WORKER_DRAIN_MS must be an integer between/)
    expect(() =>
      parseContinuousWorkerSettings({ CVG_WORKER_DRAIN_MS: '600001' })
    ).toThrow(/CVG_WORKER_DRAIN_MS must be an integer between/)
  })

  it('rejects inconsistent idle and error backoff pairs', () => {
    expect(() =>
      parseContinuousWorkerSettings({
        CVG_WORKER_POLL_INTERVAL_MS: '50',
        CVG_WORKER_IDLE_MAX_BACKOFF_MS: '10'
      })
    ).toThrow(
      /CVG_WORKER_IDLE_MAX_BACKOFF_MS must be greater than or equal to CVG_WORKER_POLL_INTERVAL_MS/
    )
    expect(() =>
      parseContinuousWorkerSettings({
        CVG_WORKER_ERROR_BACKOFF_MS: '100',
        CVG_WORKER_ERROR_MAX_BACKOFF_MS: '10'
      })
    ).toThrow(
      /CVG_WORKER_ERROR_MAX_BACKOFF_MS must be greater than or equal to CVG_WORKER_ERROR_BACKOFF_MS/
    )
  })
})

describe('branches-b continuous worker construction guards', () => {
  it('requires a worker id and valid handlers', () => {
    for (const workerId of ['', '   ']) {
      expect(() =>
        createContinuousWorker(workerOptions({ workerId }))
      ).toThrow(/worker id is required/)
    }
    expect(() =>
      createContinuousWorker({
        ...workerOptions(),
        workerId: '  worker-branches-b  '
      })
    ).not.toThrow()
    expect(() =>
      createContinuousWorker(
        workerOptions({
          handlers: {
            inboundProcess: 'not-a-function',
            messageOutbound: () => undefined
          } as never
        })
      )
    ).toThrow(/handlers are required/)
  })

  it('rejects out-of-range numeric options before starting', () => {
    expect(() => createContinuousWorker(workerOptions({ concurrency: 0 }))).toThrow(
      /concurrency must be an integer between 1 and 10/
    )
    expect(() => createContinuousWorker(workerOptions({ concurrency: 11 }))).toThrow(
      /concurrency must be an integer between 1 and 10/
    )
    expect(() => createContinuousWorker(workerOptions({ leaseMs: 999 }))).toThrow(
      /leaseMs must be an integer between/
    )
    expect(() => createContinuousWorker(workerOptions({ leaseMs: 3_600_001 }))).toThrow(
      /leaseMs must be an integer between/
    )
    expect(() => createContinuousWorker(workerOptions({ drainMs: -1 }))).toThrow(
      /drainMs must be an integer between/
    )
    expect(() => createContinuousWorker(workerOptions({ drainMs: 600_001 }))).toThrow(
      /drainMs must be an integer between/
    )
    expect(() =>
      createContinuousWorker(workerOptions({ pollIntervalMs: 0 }))
    ).toThrow(/pollIntervalMs must be a positive integer/)
    expect(() =>
      createContinuousWorker(workerOptions({ pollIntervalMs: 1.5 }))
    ).toThrow(/pollIntervalMs must be a positive integer/)
    expect(() =>
      createContinuousWorker(workerOptions({ idleMaxBackoffMs: 0 }))
    ).toThrow(/idleMaxBackoffMs must be a positive integer/)
    expect(() =>
      createContinuousWorker(workerOptions({ errorBackoffMs: 0 }))
    ).toThrow(/errorBackoffMs must be a positive integer/)
    expect(() =>
      createContinuousWorker(workerOptions({ errorMaxBackoffMs: 0 }))
    ).toThrow(/errorMaxBackoffMs must be a positive integer/)
    expect(() =>
      createContinuousWorker(workerOptions({ summaryIntervalMs: 0 }))
    ).toThrow(/summaryIntervalMs must be a positive integer/)
    expect(() =>
      createContinuousWorker(workerOptions({ heartbeatIntervalMs: 0 }))
    ).toThrow(/heartbeatIntervalMs must be a positive integer/)
    expect(() =>
      createContinuousWorker(workerOptions({ heartbeatIntervalMs: -5 }))
    ).toThrow(/heartbeatIntervalMs must be a positive integer/)
    expect(() =>
      createContinuousWorker(workerOptions({ lagSampleIntervalMs: 0 }))
    ).toThrow(/lagSampleIntervalMs must be a positive integer/)
  })

  it('rejects inconsistent tuning pairs before starting', () => {
    expect(() =>
      createContinuousWorker(
        workerOptions({ pollIntervalMs: 100, idleMaxBackoffMs: 50 })
      )
    ).toThrow(
      /idleMaxBackoffMs must be greater than or equal to pollIntervalMs/
    )
    expect(() =>
      createContinuousWorker(
        workerOptions({ errorBackoffMs: 100, errorMaxBackoffMs: 50 })
      )
    ).toThrow(
      /errorMaxBackoffMs must be greater than or equal to errorBackoffMs/
    )
  })

  it('accepts boundary tuning values', () => {
    expect(() =>
      createContinuousWorker(
        workerOptions({
          concurrency: 10,
          leaseMs: 1_000,
          drainMs: 0,
          heartbeatIntervalMs: 1,
          lagSampleIntervalMs: 1
        })
      )
    ).not.toThrow()
  })
})

describe('branches-b continuous worker lifecycle without input output', () => {
  it('reports zeroed metrics copies before starting', () => {
    const worker = createContinuousWorker(workerOptions())

    expect(worker.isRunning()).toBe(false)
    expect(worker.metrics()).toEqual({
      claimed: 0,
      processed: 0,
      failed: 0,
      deadLettered: 0,
      handoffs: 0,
      errors: 0,
      claimFailures: 0,
      leaseLost: 0,
      heartbeats: 0,
      idlePolls: 0,
      released: 0,
      lag: null
    })

    const snapshot = worker.metrics()
    snapshot.claimed = 99
    expect(worker.metrics().claimed).toBe(0)
  })

  it('stops cleanly without ever starting', async () => {
    const worker = createContinuousWorker(workerOptions())

    await expect(worker.stop()).resolves.toMatchObject({
      drained: true,
      released: 0,
      releaseFailed: 0
    })
    expect(worker.isRunning()).toBe(false)
  })

  it('starts and stops an idle worker', async () => {
    const worker = createContinuousWorker(workerOptions())

    worker.start()
    expect(worker.isRunning()).toBe(true)
    const result = await worker.stop()
    expect(result).toMatchObject({
      drained: true,
      released: 0,
      releaseFailed: 0
    })
    expect(result.metrics.lag).toBe(0)
    expect(worker.isRunning()).toBe(false)
  })

  it('ignores a second start while running', async () => {
    const worker = createContinuousWorker(workerOptions())

    worker.start()
    worker.start()
    expect(worker.isRunning()).toBe(true)
    await expect(worker.stop()).resolves.toMatchObject({ drained: true })
  })

  it('is idempotent on stop and refuses to restart after stopping', async () => {
    const worker = createContinuousWorker(workerOptions())

    worker.start()
    const first = worker.stop()
    const second = worker.stop()
    await expect(first).resolves.toMatchObject({ drained: true })
    await expect(second).resolves.toMatchObject({ drained: true })
    expect(() => worker.start()).toThrow(/cannot be restarted/)
  })

  it('honours an explicit stop drain budget', async () => {
    const worker = createContinuousWorker(workerOptions())

    worker.start()
    await expect(worker.stop({ drainMs: 0 })).resolves.toMatchObject({
      drained: true
    })
  })

  it('reports idle immediately when nothing is in flight', async () => {
    const worker = createContinuousWorker(workerOptions())

    await expect(worker.waitForIdle(50)).resolves.toBe(true)
    worker.start()
    await expect(worker.waitForIdle(200)).resolves.toBe(true)
    await worker.stop()
  })

  it('starts and stops configured sweep handles', async () => {
    const sweeps = {
      start: vi.fn(),
      stop: vi.fn().mockResolvedValue(undefined)
    }
    const worker = createContinuousWorker(workerOptions({ sweeps }))

    worker.start()
    expect(sweeps.start).toHaveBeenCalledTimes(1)
    await worker.stop()
    expect(sweeps.stop).toHaveBeenCalledTimes(1)
  })

  it('survives a failing sweep stop without failing worker shutdown', async () => {
    const sweeps = {
      start: vi.fn(),
      stop: vi.fn().mockRejectedValue(new Error('synthetic sweep failure'))
    }
    const worker = createContinuousWorker(workerOptions({ sweeps }))

    worker.start()
    await expect(worker.stop()).resolves.toMatchObject({ drained: true })
    expect(sweeps.stop).toHaveBeenCalledTimes(1)
  })
})

function revalidationEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'evt_branches_b',
    type: 'inbound.process',
    payload: {},
    tenantId: TENANT,
    correlationId: CORRELATION,
    conversationId: CONVERSATION,
    sessionId: SESSION,
    inboundMessageId: MESSAGE,
    status: 'pending' as const,
    createdAt: CREATED_AT,
    ...overrides
  } as unknown as OutboxEventRecord
}

function revalidationContext(overrides: Record<string, unknown> = {}) {
  return {
    message: { id: MESSAGE },
    channel: 'web',
    senderRef: 'synthetic',
    correlationId: CORRELATION,
    session: { id: SESSION, takeoverState: 'BOT_ACTIVE' },
    ...overrides
  } as unknown as InboundRuntimeContext
}

describe('branches-b controlled outbox revalidation', () => {
  it('rejects events whose tenant does not match with a typed error', async () => {
    const findInboundRuntimeContext = vi.fn()
    const revalidate = createControlledOutboxRevalidator(
      { findInboundRuntimeContext },
      TENANT
    )

    for (const tenantId of ['not-a-tenant', OTHER_TENANT]) {
      try {
        await revalidate(revalidationEvent({ tenantId }))
        expect.unreachable('expected tenant validation to fail closed')
      } catch (error) {
        expect(error).toBeInstanceOf(OutboxDispatchRejectedError)
        const typed = error as OutboxDispatchRejectedError
        expect(typed.name).toBe('OutboxDispatchRejectedError')
        expect(typed.code).toBe('outbox_dispatch_rejected')
        expect(typed.message).toBe(
          'outbox tenant does not match the controlled worker tenant'
        )
      }
    }
    expect(findInboundRuntimeContext).not.toHaveBeenCalled()
  })

  it('suppresses controlled outbound events without external effects', async () => {
    const findInboundRuntimeContext = vi.fn()
    const revalidate = createControlledOutboxRevalidator(
      { findInboundRuntimeContext },
      TENANT
    )

    await expect(
      revalidate(revalidationEvent({ type: 'message.outbound', payload: {} }))
    ).resolves.toBeUndefined()
    await expect(
      revalidate(
        revalidationEvent({
          type: 'message.outbound',
          payload: { externalEffects: false }
        })
      )
    ).resolves.toBeUndefined()
    await expect(
      revalidate(
        revalidationEvent({
          type: 'message.outbound',
          payload: { externalEffects: 'true' }
        })
      )
    ).resolves.toBeUndefined()
    for (const payload of [null, [], 'synthetic']) {
      await expect(
        revalidate(revalidationEvent({ type: 'message.outbound', payload }))
      ).resolves.toBeUndefined()
    }
    expect(findInboundRuntimeContext).not.toHaveBeenCalled()
  })

  it('rejects controlled outbound events that request external effects', async () => {
    const revalidate = createControlledOutboxRevalidator(
      { findInboundRuntimeContext: vi.fn() },
      TENANT
    )

    await expect(
      revalidate(
        revalidationEvent({
          type: 'message.outbound',
          payload: { externalEffects: true }
        })
      )
    ).rejects.toThrow(
      /controlled outbound event requests an external effect/
    )
  })

  it('rejects uncontrolled event types', async () => {
    const revalidate = createControlledOutboxRevalidator(
      { findInboundRuntimeContext: vi.fn() },
      TENANT
    )

    await expect(
      revalidate(revalidationEvent({ type: 'synthetic.unknown' }))
    ).rejects.toThrow(/outbox event type is not controlled: synthetic.unknown/)
  })

  it('rejects inbound events without runtime identifiers', async () => {
    const findInboundRuntimeContext = vi.fn()
    const revalidate = createControlledOutboxRevalidator(
      { findInboundRuntimeContext },
      TENANT
    )

    await expect(
      revalidate(
        revalidationEvent({ conversationId: null, inboundMessageId: null })
      )
    ).rejects.toThrow(/missing runtime identifiers/)
    await expect(
      revalidate(
        revalidationEvent({ conversationId: CONVERSATION, inboundMessageId: null })
      )
    ).rejects.toThrow(/missing runtime identifiers/)
    await expect(
      revalidate(
        revalidationEvent({ conversationId: '', inboundMessageId: MESSAGE })
      )
    ).rejects.toThrow(/missing runtime identifiers/)
    expect(findInboundRuntimeContext).not.toHaveBeenCalled()
  })

  it('rejects inbound events whose runtime context is gone', async () => {
    const findInboundRuntimeContext = vi.fn().mockResolvedValue(null)
    const revalidate = createControlledOutboxRevalidator(
      { findInboundRuntimeContext },
      TENANT
    )

    await expect(revalidate(revalidationEvent())).rejects.toThrow(
      /inbound runtime context is no longer available/
    )
    expect(findInboundRuntimeContext).toHaveBeenCalledWith(
      TENANT,
      CONVERSATION,
      SESSION,
      MESSAGE
    )
  })

  it('passes a null session through when the event carries none', async () => {
    const findInboundRuntimeContext = vi
      .fn()
      .mockResolvedValue(revalidationContext({ session: null }))
    const revalidate = createControlledOutboxRevalidator(
      { findInboundRuntimeContext },
      TENANT
    )

    await expect(
      revalidate(revalidationEvent({ sessionId: undefined }))
    ).resolves.toBeUndefined()
    expect(findInboundRuntimeContext).toHaveBeenCalledWith(
      TENANT,
      CONVERSATION,
      null,
      MESSAGE
    )
  })

  it('rejects correlations that differ from the persisted context', async () => {
    const findInboundRuntimeContext = vi
      .fn()
      .mockResolvedValue(revalidationContext({ correlationId: OTHER_CORRELATION }))
    const revalidate = createControlledOutboxRevalidator(
      { findInboundRuntimeContext },
      TENANT
    )

    await expect(revalidate(revalidationEvent())).rejects.toThrow(
      /inbound correlation does not match the persisted runtime context/
    )
  })

  it('skips the correlation check when the event carries none', async () => {
    const findInboundRuntimeContext = vi
      .fn()
      .mockResolvedValue(revalidationContext({ correlationId: OTHER_CORRELATION }))
    const revalidate = createControlledOutboxRevalidator(
      { findInboundRuntimeContext },
      TENANT
    )

    await expect(
      revalidate(revalidationEvent({ correlationId: undefined }))
    ).resolves.toBeUndefined()
  })

  it('suppresses recovered inbound automation during human takeover', async () => {
    for (const takeoverState of [
      'HANDOFF_REQUESTED',
      'HUMAN_ACTIVE',
      'RESOLVED'
    ]) {
      const findInboundRuntimeContext = vi.fn().mockResolvedValue(
        revalidationContext({
          session: { id: SESSION, takeoverState }
        })
      )
      const revalidate = createControlledOutboxRevalidator(
        { findInboundRuntimeContext },
        TENANT
      )

      await expect(revalidate(revalidationEvent())).rejects.toThrow(
        /human takeover is active; recovered inbound automation is suppressed/
      )
    }
  })

  it('accepts inbound events for active bots and session-less contexts', async () => {
    const active = vi.fn().mockResolvedValue(revalidationContext())
    await expect(
      createControlledOutboxRevalidator(
        { findInboundRuntimeContext: active },
        TENANT
      )(revalidationEvent())
    ).resolves.toBeUndefined()

    const sessionless = vi
      .fn()
      .mockResolvedValue(revalidationContext({ session: null }))
    await expect(
      createControlledOutboxRevalidator(
        { findInboundRuntimeContext: sessionless },
        TENANT
      )(revalidationEvent())
    ).resolves.toBeUndefined()
  })
})
