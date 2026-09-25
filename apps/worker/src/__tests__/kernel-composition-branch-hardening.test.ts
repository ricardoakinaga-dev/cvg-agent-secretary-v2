import { createHash, randomBytes } from 'node:crypto'
import { Client, Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  EXECUTION_PROPOSAL_SCHEMA_VERSION,
  OrchestrationError,
  computeExecutionProposalHash,
  validatePlanGraph,
  type GovernedTurnInput,
  type GovernedTurnResult,
  type OrchestrationRunResult,
  type Plan,
  type PlanStepDraft,
  type WorkflowPlan
} from '@cvg/agent-runtime'
import {
  PostgresEffectJournal,
  runPostgresMigrations,
  withTenantContext,
  type InboundRuntimeContext,
  type PostgresPoolLike
} from '@cvg/persistence'
import { TenantIdSchema } from '@cvg/platform'
import { canonicalizeJson } from '@cvg/shared'
import {
  CONTROLLED_KERNEL_PAYLOAD_SCHEMA,
  CONTROLLED_KERNEL_PROMPT_ID,
  CONTROLLED_KERNEL_PROMPT_VERSION,
  DURABLE_KERNEL_ORCHESTRATOR_ENV,
  KERNEL_WORKER_RUNTIME,
  KernelRuntimeConfigurationError,
  assertPostgresKernelPrerequisites,
  createPostgresKernelHandlers,
  createPostgresKernelRuntime,
  durableTurnResult,
  parseKernelTurnEnvelope,
  type PostgresKernelRuntime
} from '../kernel-composition.ts'

const TENANT = TenantIdSchema.parse(
  'tenant_00000000-0000-4000-8000-0000000000c3'
)
const AGENT = 'agent_00000000-0000-4000-8000-0000000000c3'
const OTHER_AGENT = 'agent_00000000-0000-4000-8000-0000000000c4'
const CORRELATION = 'corr_00000000-0000-4000-8000-0000000000c3'
const CONVERSATION = 'conv_kernel_branch_c3'
const SESSION = 'sess_kernel_branch_c3'
const MESSAGE = 'msg_kernel_branch_c3'
const TRACE = 'abcdef0123456789abcdef0123456789'
const CREATED_AT = new Date('2026-09-16T12:00:00.000Z')

function turnEnvelope(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    cvgTurn: {
      capability: 'appointment.modify',
      action: 'appointment.modify',
      resource: { type: 'appointment_draft', id: 'draft_branch_c3' },
      dataClassification: 'INTERNAL',
      message: 'synthetic kernel branch hardening',
      idempotencyKey: 'kernel-branch-c3',
      ...overrides
    }
  })
}

function governedResult(
  outcome: GovernedTurnResult['outcome'],
  overrides: Partial<GovernedTurnResult> = {}
): GovernedTurnResult {
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
      evaluatedAt: CREATED_AT.toISOString()
    },
    traceId: TRACE,
    spanId: '0123456789abcdef',
    correlationId: CORRELATION,
    auditChainValid: true,
    costUsd: 0,
    durationMs: 1,
    ...overrides
  }
}

function durableResult(
  overrides: {
    goalStatus?: string
    reason?: string
    plan?: { id: string } | null
    steps?: Array<{ id: string; status: string; approvalId?: string }>
    executedStepIds?: string[]
  } = {}
): OrchestrationRunResult {
  const goalStatus = overrides.goalStatus ?? 'COMPLETED'
  return {
    goal: {
      id: 'goal_kernel_branch_c3',
      status: goalStatus
    },
    plan:
      overrides.plan === undefined
        ? { id: 'plan_kernel_branch_c3' }
        : overrides.plan,
    steps: overrides.steps ?? [],
    reason: overrides.reason ?? 'synthetic durable result',
    executedStepIds: overrides.executedStepIds ?? []
  } as unknown as OrchestrationRunResult
}

interface FakeRuntimeOptions {
  message?: Record<string, unknown>
  session?: Record<string, unknown> | null
  correlationId?: string
  runTurn?: (input: GovernedTurnInput) => Promise<GovernedTurnResult>
  runDurableGoal?: (input: unknown) => Promise<OrchestrationRunResult>
  workflowCoordinator?: unknown
  approvals?: Record<string, unknown>
  audit?: Record<string, unknown>
  conversations?: Record<string, unknown>
  recoverDurableGoals?: () => Promise<unknown>
}

function fakeRuntime(options: FakeRuntimeOptions = {}) {
  const session =
    options.session === undefined
      ? {
          id: SESSION,
          conversationId: CONVERSATION,
          status: 'open' as const,
          takeoverState: 'BOT_ACTIVE' as const,
          createdAt: CREATED_AT,
          updatedAt: CREATED_AT
        }
      : options.session
  const context = {
    message: {
      id: MESSAGE,
      conversationId: CONVERSATION,
      externalMessageId: 'external_kernel_branch_c3',
      direction: 'inbound' as const,
      body: turnEnvelope(),
      runtimeStatus: 'pending' as const,
      createdAt: CREATED_AT,
      ...options.message
    },
    channel: 'web' as const,
    senderRef: 'synthetic-sender-c3',
    correlationId: options.correlationId ?? CORRELATION,
    session
  }
  const runTurn =
    options.runTurn ?? vi.fn().mockResolvedValue(governedResult('executed'))
  const conversations = {
    findInboundRuntimeContext: vi.fn().mockResolvedValue(context),
    appendAudit: vi.fn().mockResolvedValue(undefined),
    markInboundRuntimeCompleted: vi.fn().mockResolvedValue(true),
    markInboundRuntimeWaitingForApproval: vi.fn().mockResolvedValue(true),
    ...options.conversations
  }
  return {
    tenantId: TENANT,
    agentId: AGENT,
    conversations,
    workflowCoordinator: options.workflowCoordinator ?? {
      kind: 'governed-kernel' as const,
      coordinator: null
    },
    runTurn,
    directRunTurn: runTurn,
    ...(options.runDurableGoal !== undefined
      ? { runDurableGoal: options.runDurableGoal }
      : {}),
    ...(options.recoverDurableGoals !== undefined
      ? { recoverDurableGoals: options.recoverDurableGoals }
      : {}),
    approvals: {
      get: vi.fn().mockResolvedValue({ status: 'APPROVED' }),
      findByContinuation: vi.fn().mockResolvedValue(undefined),
      ...options.approvals
    },
    ...(options.audit !== undefined ? { audit: options.audit } : {}),
    policy: {},
    telemetry: {},
    toolInvocations: [],
    turnResults: [],
    preflight: vi.fn()
  }
}

type FakeRuntime = ReturnType<typeof fakeRuntime>

function baseEvent(
  runtime: FakeRuntime,
  overrides: Record<string, unknown> = {}
) {
  return {
    id: 'outbox_kernel_branch_c3',
    type: 'inbound.process',
    payload: {},
    tenantId: TENANT,
    correlationId: runtime.conversations.findInboundRuntimeContext.mock.calls
      .length
      ? CORRELATION
      : CORRELATION,
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

describe('kernel turn envelope and prerequisite configuration branches', () => {
  it('rejects a JSON body without a turn envelope and an invalid envelope shape', () => {
    expect(() => parseKernelTurnEnvelope('42')).toThrow(
      /kernel_turn_envelope_invalid/
    )
    expect(() =>
      parseKernelTurnEnvelope(
        JSON.stringify({
          cvgTurn: { capability: 'not-a-capability', action: 'x' }
        })
      )
    ).toThrow(/capability/)
  })

  it('fails closed when migrations are missing and maps non-Error failures', async () => {
    const client = {
      query: vi.fn(async (text: string) => {
        if (text === 'SHOW search_path') {
          return { rows: [{ search_path: '"$user", public' }] }
        }
        if (text.includes('FROM schema_migrations')) {
          return { rows: [{ version: '0019_orchestrator_state' }] }
        }
        return { rows: [] }
      }),
      release: vi.fn()
    }
    const pool = { connect: vi.fn(async () => client) }

    await expect(
      assertPostgresKernelPrerequisites(pool as never, TENANT)
    ).rejects.toMatchObject({
      code: 'kernel_runtime_prerequisites_missing'
    })
    await expect(
      assertPostgresKernelPrerequisites(pool as never, TENANT)
    ).rejects.toThrow(/missing migrations/)

    const throwingClient = {
      query: vi.fn(async (text: string) => {
        if (text === 'SHOW search_path') {
          return { rows: [{ search_path: '"$user", public' }] }
        }
        throw 'synthetic non-error prerequisite failure'
      }),
      release: vi.fn()
    }
    const throwingPool = { connect: vi.fn(async () => throwingClient) }
    await expect(
      assertPostgresKernelPrerequisites(throwingPool as never, TENANT)
    ).rejects.toThrow(/synthetic non-error prerequisite failure/)
  })

  it('requires a connectable pool and falls back to the process worker id', () => {
    const env = {
      CVG_WORKER_RUNTIME: KERNEL_WORKER_RUNTIME,
      CVG_WORKER_ID: '   '
    }
    for (const pool of [undefined, null, {}]) {
      expect(() =>
        createPostgresKernelRuntime({
          pool: pool as never,
          tenantId: TENANT,
          env,
          agentId: AGENT
        })
      ).toThrow(KernelRuntimeConfigurationError)
    }

    const runtime = createPostgresKernelRuntime({
      pool: { connect: async () => ({}) } as unknown as PostgresPoolLike,
      tenantId: TENANT,
      env,
      agentId: AGENT
    })
    expect(runtime.tenantId).toBe(TENANT)
    expect(runtime.orchestrator).toBeDefined()
  })

  it('fails closed on an unknown production runtime before any composition', () => {
    expect(() =>
      createPostgresKernelRuntime({
        pool: { connect: async () => ({}) } as unknown as PostgresPoolLike,
        tenantId: TENANT,
        env: {
          NODE_ENV: 'production',
          CVG_WORKER_RUNTIME: 'mystery',
          [DURABLE_KERNEL_ORCHESTRATOR_ENV]: 'true'
        },
        agentId: AGENT
      })
    ).toThrow(/Unknown CVG_WORKER_RUNTIME value: mystery/)
  })

  it('rejects handlers configured with a different agent id', () => {
    const runtime = fakeRuntime()
    expect(() =>
      createPostgresKernelHandlers(
        { CVG_WORKER_AGENT_ID: OTHER_AGENT },
        runtime as unknown as PostgresKernelRuntime
      )
    ).toThrow(/does not match the composed runtime/)
  })

  it('rejects an inbound event without runtime identifiers', async () => {
    const runtime = fakeRuntime()
    const handlers = createPostgresKernelHandlers(
      {},
      runtime as unknown as PostgresKernelRuntime
    )

    await expect(
      handlers.inboundProcess(
        baseEvent(runtime, { conversationId: null, inboundMessageId: null })
      )
    ).rejects.toThrow(/missing runtime identifiers/)
    expect(
      runtime.conversations.findInboundRuntimeContext
    ).not.toHaveBeenCalled()
  })

  it('rejects an inbound event whose runtime context is missing', async () => {
    const runtime = fakeRuntime()
    runtime.conversations.findInboundRuntimeContext.mockResolvedValue(null)
    const handlers = createPostgresKernelHandlers(
      {},
      runtime as unknown as PostgresKernelRuntime
    )

    await expect(handlers.inboundProcess(baseEvent(runtime))).rejects.toThrow(
      /Inbound runtime context was not found/
    )
  })

  it('rejects an inbound event whose trace differs from the persisted message', async () => {
    const runtime = fakeRuntime({
      message: { runtimeTraceId: 'ffffffffffffffffffffffffffffffff' }
    })
    const handlers = createPostgresKernelHandlers(
      {},
      runtime as unknown as PostgresKernelRuntime
    )

    await expect(handlers.inboundProcess(baseEvent(runtime))).rejects.toThrow(
      /trace does not match the persisted conversation/
    )
    expect(runtime.directRunTurn).not.toHaveBeenCalled()
  })
})

describe('kernel non-durable continuation and recovery branches', () => {
  it('runs the synthetic plan for a session-less inbound without resource id or task', async () => {
    const runtime = fakeRuntime({
      session: null,
      message: {
        body: turnEnvelope({ resource: { type: 'appointment_draft' } })
      }
    })
    const runTurn = vi.fn().mockResolvedValue(governedResult('executed'))
    runtime.runTurn = runTurn
    const handlers = createPostgresKernelHandlers(
      {},
      runtime as unknown as PostgresKernelRuntime
    )

    const outcome = await handlers.inboundProcess(
      baseEvent(runtime, { sessionId: null })
    )

    expect(outcome).toMatchObject({
      status: 'completed',
      runtimeStatus: 'executed'
    })
    const input = runTurn.mock.calls[0]?.[0] as GovernedTurnInput
    expect(input.sessionId).toBeUndefined()
    expect(input.resource.id).toBeUndefined()
    expect(input.approvalId).toBeUndefined()
  })

  it('carries an optional task into the governed turn input', async () => {
    const runtime = fakeRuntime({
      message: { body: turnEnvelope({ task: 'synthetic-kernel-task' }) }
    })
    const runTurn = vi.fn().mockResolvedValue(governedResult('executed'))
    runtime.runTurn = runTurn
    const handlers = createPostgresKernelHandlers(
      {},
      runtime as unknown as PostgresKernelRuntime
    )

    await handlers.inboundProcess(baseEvent(runtime))

    const input = runTurn.mock.calls[0]?.[0] as GovernedTurnInput
    expect(input.task).toBe('synthetic-kernel-task')
  })

  it('returns already_completed for a terminal inbound message', async () => {
    const runtime = fakeRuntime({ message: { runtimeStatus: 'completed' } })
    const handlers = createPostgresKernelHandlers(
      {},
      runtime as unknown as PostgresKernelRuntime
    )

    const outcome = await handlers.inboundProcess(baseEvent(runtime))

    expect(outcome).toMatchObject({
      status: 'already_completed',
      externalEffects: false
    })
    expect(runtime.directRunTurn).not.toHaveBeenCalled()
  })

  it('rejects a continuation trace that does not match the durable event trace', async () => {
    const runtime = fakeRuntime()
    const handlers = createPostgresKernelHandlers(
      {},
      runtime as unknown as PostgresKernelRuntime
    )

    await expect(
      handlers.inboundProcess(
        baseEvent(runtime, {
          payload: {
            kind: 'runtime_approval.continue',
            approvalId: 'appr_synthetic_c3',
            traceId: 'ffffffffffffffffffffffffffffffff'
          }
        })
      )
    ).rejects.toThrow(/continuation trace does not match/)
  })

  it('accepts a continuation trace equal to the event trace', async () => {
    const runtime = fakeRuntime({
      message: {
        runtimeStatus: 'waiting_approval',
        runtimeApprovalId: 'appr_synthetic_c3',
        runtimeTraceId: TRACE
      }
    })
    const runTurn = vi.fn().mockResolvedValue(governedResult('executed'))
    runtime.runTurn = runTurn
    const handlers = createPostgresKernelHandlers(
      {},
      runtime as unknown as PostgresKernelRuntime
    )

    const outcome = await handlers.inboundProcess(
      baseEvent(runtime, {
        payload: {
          kind: 'runtime_approval.continue',
          approvalId: 'appr_synthetic_c3',
          traceId: TRACE
        }
      })
    )

    expect(outcome).toMatchObject({ status: 'completed' })
  })

  it('rejects an invalid continuation payload before any runtime call', async () => {
    const runtime = fakeRuntime()
    const handlers = createPostgresKernelHandlers(
      {},
      runtime as unknown as PostgresKernelRuntime
    )

    await expect(
      handlers.inboundProcess(
        baseEvent(runtime, {
          payload: { kind: 'runtime_approval.continue', approvalId: 7 }
        })
      )
    ).rejects.toThrow(/continuation payload is invalid/)
  })

  it('returns approval_required_pending for a waiting message without a continuation', async () => {
    const runtime = fakeRuntime({
      message: {
        runtimeStatus: 'waiting_approval',
        runtimeApprovalId: 'appr_synthetic_c3'
      }
    })
    const handlers = createPostgresKernelHandlers(
      {},
      runtime as unknown as PostgresKernelRuntime
    )

    const outcome = await handlers.inboundProcess(baseEvent(runtime))

    expect(outcome).toMatchObject({
      status: 'approval_required_pending',
      runtimeStatus: 'approval_required',
      approvalId: 'appr_synthetic_c3',
      externalEffects: false
    })
    expect(runtime.directRunTurn).not.toHaveBeenCalled()
  })

  it('rejects a continuation for an approval that does not match the waiting marker', async () => {
    const runtime = fakeRuntime({
      message: {
        runtimeStatus: 'waiting_approval',
        runtimeApprovalId: 'appr_waiting_c3'
      }
    })
    const handlers = createPostgresKernelHandlers(
      {},
      runtime as unknown as PostgresKernelRuntime
    )

    await expect(
      handlers.inboundProcess(
        baseEvent(runtime, {
          payload: {
            kind: 'runtime_approval.continue',
            approvalId: 'appr_other_c3'
          }
        })
      )
    ).rejects.toThrow(/does not match the persisted approval/)
  })

  it('rejects a continuation whose decision does not match the durable approval', async () => {
    const runtime = fakeRuntime({
      message: {
        runtimeStatus: 'waiting_approval',
        runtimeApprovalId: 'appr_synthetic_c3'
      },
      approvals: { get: vi.fn().mockResolvedValue({ status: 'REQUESTED' }) }
    })
    const handlers = createPostgresKernelHandlers(
      {},
      runtime as unknown as PostgresKernelRuntime
    )

    await expect(
      handlers.inboundProcess(
        baseEvent(runtime, {
          payload: {
            kind: 'runtime_approval.continue',
            approvalId: 'appr_synthetic_c3',
            decision: 'approve'
          }
        })
      )
    ).rejects.toThrow(/does not match the durable approval decision/)
  })

  it('rejects a continuation delivered for a message that is not waiting', async () => {
    const runtime = fakeRuntime()
    const handlers = createPostgresKernelHandlers(
      {},
      runtime as unknown as PostgresKernelRuntime
    )

    await expect(
      handlers.inboundProcess(
        baseEvent(runtime, {
          payload: {
            kind: 'runtime_approval.continue',
            approvalId: 'appr_synthetic_c3'
          }
        })
      )
    ).rejects.toThrow(/requires a waiting message/)
  })

  it('pauses processing while a human takeover is active', async () => {
    const runtime = fakeRuntime({
      session: {
        id: SESSION,
        conversationId: CONVERSATION,
        status: 'open',
        takeoverState: 'HUMAN_TAKEOVER',
        createdAt: CREATED_AT,
        updatedAt: CREATED_AT
      }
    })
    const handlers = createPostgresKernelHandlers(
      {},
      runtime as unknown as PostgresKernelRuntime
    )

    const outcome = await handlers.inboundProcess(baseEvent(runtime))

    expect(outcome).toMatchObject({
      status: 'paused_human_takeover',
      externalEffects: false
    })
    expect(runtime.directRunTurn).not.toHaveBeenCalled()
  })

  it('rejects a rejected continuation when the completion marker cannot be written', async () => {
    const runtime = fakeRuntime({
      message: {
        runtimeStatus: 'waiting_approval',
        runtimeApprovalId: 'appr_synthetic_c3',
        runtimeTraceId: TRACE
      },
      approvals: { get: vi.fn().mockResolvedValue({ status: 'REJECTED' }) },
      conversations: {
        markInboundRuntimeCompleted: vi.fn().mockResolvedValue(false)
      }
    })
    const handlers = createPostgresKernelHandlers(
      {},
      runtime as unknown as PostgresKernelRuntime
    )

    await expect(
      handlers.inboundProcess(
        baseEvent(runtime, {
          payload: {
            kind: 'runtime_approval.continue',
            approvalId: 'appr_synthetic_c3',
            decision: 'reject'
          }
        })
      )
    ).rejects.toThrow(/rejection completion marker was not updated/)
  })
})

describe('kernel crash-recovery approval branches', () => {
  function recoveryRuntime(
    approval: Record<string, unknown>,
    conversations: Record<string, unknown> = {}
  ) {
    return fakeRuntime({
      approvals: {
        findByContinuation: vi.fn().mockResolvedValue(approval)
      },
      conversations
    })
  }

  it('rejects a pending recovery when the waiting marker cannot be written', async () => {
    const runtime = recoveryRuntime(
      {
        approvalId: 'appr_recovery_c3',
        status: 'REQUESTED',
        continuation: {
          conversationId: CONVERSATION,
          sessionId: SESSION,
          inboundMessageId: MESSAGE
        }
      },
      { markInboundRuntimeWaitingForApproval: vi.fn().mockResolvedValue(false) }
    )
    const handlers = createPostgresKernelHandlers(
      {},
      runtime as unknown as PostgresKernelRuntime
    )

    await expect(handlers.inboundProcess(baseEvent(runtime))).rejects.toThrow(
      /approval recovery marker was not updated/
    )
  })

  it('completes a rejected recovery and rejects an unwritable marker', async () => {
    const approval = {
      approvalId: 'appr_recovery_c3',
      status: 'REJECTED',
      continuation: {
        conversationId: CONVERSATION,
        sessionId: SESSION,
        inboundMessageId: MESSAGE
      }
    }
    const completed = recoveryRuntime(approval)
    const handlers = createPostgresKernelHandlers(
      {},
      completed as unknown as PostgresKernelRuntime
    )
    const outcome = await handlers.inboundProcess(baseEvent(completed))
    expect(outcome).toMatchObject({
      status: 'denied',
      reason: 'approval_rejected',
      externalEffects: false
    })

    const failing = recoveryRuntime(approval, {
      markInboundRuntimeCompleted: vi.fn().mockResolvedValue(false)
    })
    const failingHandlers = createPostgresKernelHandlers(
      {},
      failing as unknown as PostgresKernelRuntime
    )
    await expect(
      failingHandlers.inboundProcess(baseEvent(failing))
    ).rejects.toThrow(/rejection recovery marker was not updated/)
  })

  it('recovers an approved approval with and without a continuation trace', async () => {
    for (const withTrace of [true, false]) {
      const runtime = recoveryRuntime({
        approvalId: 'appr_recovery_c3',
        status: 'APPROVED',
        continuation: {
          conversationId: CONVERSATION,
          sessionId: SESSION,
          inboundMessageId: MESSAGE,
          ...(withTrace ? { traceId: TRACE } : {})
        }
      })
      const runTurn = vi.fn().mockResolvedValue(governedResult('executed'))
      runtime.runTurn = runTurn
      const handlers = createPostgresKernelHandlers(
        {},
        runtime as unknown as PostgresKernelRuntime
      )

      const outcome = await handlers.inboundProcess(baseEvent(runtime))

      expect(outcome).toMatchObject({ status: 'completed' })
      const input = runTurn.mock.calls[0]?.[0] as GovernedTurnInput
      expect(input.approvalId).toBe('appr_recovery_c3')
      if (withTrace) {
        expect(input.traceContext?.traceId).toBe(TRACE)
      }
    }
  })

  it('re-enters recovery for an executing approval without a continuation trace', async () => {
    const runtime = recoveryRuntime({
      approvalId: 'appr_recovery_c3',
      status: 'EXECUTING',
      continuation: {
        conversationId: CONVERSATION,
        sessionId: SESSION,
        inboundMessageId: MESSAGE
      }
    })
    const runTurn = vi.fn().mockResolvedValue(governedResult('executed'))
    runtime.runTurn = runTurn
    const handlers = createPostgresKernelHandlers(
      {},
      runtime as unknown as PostgresKernelRuntime
    )

    const outcome = await handlers.inboundProcess(baseEvent(runtime))

    expect(outcome).toMatchObject({ status: 'completed' })
    expect(runTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        approvalId: 'appr_recovery_c3',
        traceContext: expect.objectContaining({ traceId: TRACE })
      })
    )
  })

  it('marks an executed recovery completed and rejects an unwritable marker', async () => {
    const approval = {
      approvalId: 'appr_recovery_c3',
      status: 'EXECUTED',
      continuation: {
        conversationId: CONVERSATION,
        sessionId: SESSION,
        inboundMessageId: MESSAGE
      }
    }
    const completed = recoveryRuntime(approval)
    const handlers = createPostgresKernelHandlers(
      {},
      completed as unknown as PostgresKernelRuntime
    )
    const outcome = await handlers.inboundProcess(baseEvent(completed))
    expect(outcome).toMatchObject({
      status: 'already_completed',
      runtimeStatus: 'executed'
    })

    const failing = recoveryRuntime(approval, {
      markInboundRuntimeCompleted: vi.fn().mockResolvedValue(false)
    })
    const failingHandlers = createPostgresKernelHandlers(
      {},
      failing as unknown as PostgresKernelRuntime
    )
    await expect(
      failingHandlers.inboundProcess(baseEvent(failing))
    ).rejects.toThrow(/executed recovery marker was not updated/)
  })

  it('fails closed on a non-resumable terminal approval state', async () => {
    const runtime = recoveryRuntime({
      approvalId: 'appr_recovery_c3',
      status: 'CANCELLED',
      continuation: {
        conversationId: CONVERSATION,
        sessionId: SESSION,
        inboundMessageId: MESSAGE
      }
    })
    const handlers = createPostgresKernelHandlers(
      {},
      runtime as unknown as PostgresKernelRuntime
    )

    await expect(handlers.inboundProcess(baseEvent(runtime))).rejects.toThrow(
      /non-resumable terminal state/
    )
  })
})

describe('kernel handler audit and marker writing branches', () => {
  it('fails closed when the durable runtime audit chain is invalid', async () => {
    const runtime = fakeRuntime({
      audit: { recordsForTrace: () => [{ eventId: 'evt_synthetic' }] },
      conversations: {
        appendRuntimeAuditRecords: vi.fn().mockResolvedValue(1),
        verifyRuntimeAuditChain: vi.fn().mockResolvedValue({
          valid: false,
          brokenAt: 2,
          reason: 'sequence_mismatch'
        })
      }
    })
    const handlers = createPostgresKernelHandlers(
      {},
      runtime as unknown as PostgresKernelRuntime
    )

    await expect(handlers.inboundProcess(baseEvent(runtime))).rejects.toThrow(
      /Durable runtime audit chain verification failed at 2: sequence_mismatch/
    )
  })

  it('uses stable audit-chain fallbacks when a verdict omits its location', async () => {
    const runtime = fakeRuntime({
      audit: { recordsForTrace: () => [{ eventId: 'evt_synthetic' }] },
      conversations: {
        appendRuntimeAuditRecords: vi.fn().mockResolvedValue(1),
        verifyRuntimeAuditChain: vi
          .fn()
          .mockResolvedValue({ valid: false, count: 0 })
      }
    })
    const handlers = createPostgresKernelHandlers(
      {},
      runtime as unknown as PostgresKernelRuntime
    )

    await expect(handlers.inboundProcess(baseEvent(runtime))).rejects.toThrow(
      /Durable runtime audit chain verification failed at unknown: invalid/
    )
  })

  it('skips audit persistence when no runtime audit ledger is composed', async () => {
    const runtime = fakeRuntime()
    const handlers = createPostgresKernelHandlers(
      {},
      runtime as unknown as PostgresKernelRuntime
    )

    const outcome = await handlers.inboundProcess(baseEvent(runtime))

    expect(outcome).toMatchObject({ status: 'completed' })
    expect(runtime.conversations.appendAudit).toHaveBeenCalled()
  })

  it('maps a shadowed governed outcome without producing external effects', async () => {
    const runtime = fakeRuntime({
      runTurn: vi.fn().mockResolvedValue(governedResult('shadowed'))
    })
    const handlers = createPostgresKernelHandlers(
      {},
      runtime as unknown as PostgresKernelRuntime
    )

    const outcome = await handlers.inboundProcess(baseEvent(runtime))

    expect(outcome).toMatchObject({
      status: 'shadowed',
      runtimeStatus: 'shadowed',
      externalEffects: false
    })
    expect(
      runtime.conversations.markInboundRuntimeCompleted
    ).toHaveBeenCalledWith(MESSAGE, TENANT)
  })

  it('maps shadowed durable outcomes and suppresses outbound effects', () => {
    const withEvidence = durableTurnResult(
      governedResult('shadowed', {
        resultDigest: 'd'.repeat(64),
        modelResult: {} as never
      })
    )
    expect(withEvidence).toMatchObject({
      outcome: 'waiting_external',
      resultDigest: 'd'.repeat(64),
      modelCalls: 1,
      toolCalls: 0
    })

    const withoutEvidence = durableTurnResult(governedResult('shadowed'))
    expect(withoutEvidence).toMatchObject({
      outcome: 'waiting_external',
      modelCalls: 0,
      toolCalls: 0
    })

    const handlers = createPostgresKernelHandlers(
      {},
      fakeRuntime() as unknown as PostgresKernelRuntime
    )
    expect(handlers.messageOutbound({} as never)).toEqual({
      status: 'controlled_outbound_suppressed',
      externalEffects: false
    })
  })

  it('carries the effect confirmation into the durable integration audit payload', async () => {
    const runtime = fakeRuntime({
      runTurn: vi.fn().mockResolvedValue(
        governedResult('executed', {
          effectConfirmed: true,
          outboxEventId: 'evt_outbox_c3',
          executionRef: 'exec_c3',
          resultDigest: 'a'.repeat(64),
          replayed: true
        })
      )
    })
    const handlers = createPostgresKernelHandlers(
      {},
      runtime as unknown as PostgresKernelRuntime
    )

    await handlers.inboundProcess(baseEvent(runtime))

    expect(runtime.conversations.appendAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          effectConfirmed: true,
          replayed: true,
          outboxEventId: 'evt_outbox_c3',
          executionRef: 'exec_c3',
          resultDigest: 'a'.repeat(64)
        })
      }),
      TENANT
    )
  })

  it('rejects an approval_required outcome without an approval id', async () => {
    const runtime = fakeRuntime({
      runTurn: vi.fn().mockResolvedValue(governedResult('approval_required'))
    })
    const handlers = createPostgresKernelHandlers(
      {},
      runtime as unknown as PostgresKernelRuntime
    )

    await expect(handlers.inboundProcess(baseEvent(runtime))).rejects.toThrow(
      /requested approval without an approval id/
    )
  })

  it('rejects approval outcomes whose waiting marker cannot be written', async () => {
    const runtime = fakeRuntime({
      runTurn: vi.fn().mockResolvedValue(
        governedResult('approval_required', {
          approvalId: 'appr_synthetic_c3'
        })
      ),
      conversations: {
        markInboundRuntimeWaitingForApproval: vi.fn().mockResolvedValue(false)
      }
    })
    const handlers = createPostgresKernelHandlers(
      {},
      runtime as unknown as PostgresKernelRuntime
    )

    await expect(handlers.inboundProcess(baseEvent(runtime))).rejects.toThrow(
      /approval waiting marker was not updated/
    )
  })

  it('rejects completed outcomes whose completion marker cannot be written', async () => {
    const runtime = fakeRuntime({
      conversations: {
        markInboundRuntimeCompleted: vi.fn().mockResolvedValue(false)
      }
    })
    const handlers = createPostgresKernelHandlers(
      {},
      runtime as unknown as PostgresKernelRuntime
    )

    await expect(handlers.inboundProcess(baseEvent(runtime))).rejects.toThrow(
      /completion marker was not updated/
    )
  })
})

describe('kernel durable orchestrator handler branches', () => {
  const durableEnv = { [DURABLE_KERNEL_ORCHESTRATOR_ENV]: 'true' }

  it('rejects a durable continuation trace that does not match the event trace', async () => {
    const runtime = fakeRuntime({
      runDurableGoal: vi.fn().mockResolvedValue(durableResult())
    })
    const handlers = createPostgresKernelHandlers(
      durableEnv,
      runtime as unknown as PostgresKernelRuntime
    )

    await expect(
      handlers.inboundProcess(
        baseEvent(runtime, {
          payload: {
            kind: 'runtime_approval.continue',
            approvalId: 'appr_synthetic_c3',
            traceId: 'ffffffffffffffffffffffffffffffff'
          }
        })
      )
    ).rejects.toThrow(
      /continuation trace does not match the durable event trace/
    )
  })

  it('accepts a durable continuation with an equal trace and skips a completed message', async () => {
    const runtime = fakeRuntime({
      runDurableGoal: vi.fn().mockResolvedValue(durableResult())
    })
    const handlers = createPostgresKernelHandlers(
      durableEnv,
      runtime as unknown as PostgresKernelRuntime
    )
    const accepted = await handlers.inboundProcess(
      baseEvent(runtime, {
        payload: {
          kind: 'runtime_approval.continue',
          approvalId: 'appr_synthetic_c3',
          traceId: TRACE
        }
      })
    )
    expect(accepted).toMatchObject({ status: 'completed' })
    expect(runtime.runDurableGoal).toHaveBeenCalledWith(
      expect.objectContaining({
        approvalDecision: 'approve'
      })
    )

    const completed = fakeRuntime({
      message: { runtimeStatus: 'completed' },
      runDurableGoal: vi.fn().mockResolvedValue(durableResult())
    })
    const completedHandlers = createPostgresKernelHandlers(
      durableEnv,
      completed as unknown as PostgresKernelRuntime
    )
    const outcome = await completedHandlers.inboundProcess(baseEvent(completed))
    expect(outcome).toMatchObject({ status: 'already_completed' })
    expect(completed.runDurableGoal).not.toHaveBeenCalled()
  })

  it('pauses durable processing during a human takeover', async () => {
    const runtime = fakeRuntime({
      session: {
        id: SESSION,
        conversationId: CONVERSATION,
        status: 'open',
        takeoverState: 'HUMAN_TAKEOVER',
        createdAt: CREATED_AT,
        updatedAt: CREATED_AT
      },
      runDurableGoal: vi.fn().mockResolvedValue(durableResult())
    })
    const handlers = createPostgresKernelHandlers(
      durableEnv,
      runtime as unknown as PostgresKernelRuntime
    )

    const outcome = await handlers.inboundProcess(baseEvent(runtime))

    expect(outcome).toMatchObject({ status: 'paused_human_takeover' })
    expect(runtime.runDurableGoal).not.toHaveBeenCalled()
  })

  it('returns approval_required_pending for durable redelivery without continuation', async () => {
    const runtime = fakeRuntime({
      message: {
        runtimeStatus: 'waiting_approval',
        runtimeApprovalId: 'appr_waiting_c3'
      },
      runDurableGoal: vi.fn().mockResolvedValue(durableResult())
    })
    const handlers = createPostgresKernelHandlers(
      durableEnv,
      runtime as unknown as PostgresKernelRuntime
    )

    const outcome = await handlers.inboundProcess(baseEvent(runtime))

    expect(outcome).toMatchObject({
      status: 'approval_required_pending',
      runtimeStatus: 'approval_required',
      approvalId: 'appr_waiting_c3',
      externalEffects: false
    })
    expect(runtime.runDurableGoal).not.toHaveBeenCalled()
  })

  it('rejects a durable continuation that disagrees with the waiting approval marker', async () => {
    const runtime = fakeRuntime({
      message: {
        runtimeStatus: 'waiting_approval',
        runtimeApprovalId: 'appr_waiting_c3'
      },
      runDurableGoal: vi.fn().mockResolvedValue(durableResult())
    })
    const handlers = createPostgresKernelHandlers(
      durableEnv,
      runtime as unknown as PostgresKernelRuntime
    )

    await expect(
      handlers.inboundProcess(
        baseEvent(runtime, {
          payload: {
            kind: 'runtime_approval.continue',
            approvalId: 'appr_other_c3'
          }
        })
      )
    ).rejects.toThrow(/does not match the inbound waiting marker/)
  })

  it('rejects a durable approval request without an approval id', async () => {
    const runtime = fakeRuntime({
      runDurableGoal: vi.fn().mockResolvedValue(
        durableResult({
          goalStatus: 'WAITING_APPROVAL',
          steps: [{ id: 'step_synthetic', status: 'WAITING_APPROVAL' }]
        })
      )
    })
    const handlers = createPostgresKernelHandlers(
      durableEnv,
      runtime as unknown as PostgresKernelRuntime
    )

    await expect(handlers.inboundProcess(baseEvent(runtime))).rejects.toThrow(
      /requested approval without an approval id/
    )
  })

  it('maps terminal durable goal statuses and null plans to runtime outcomes', async () => {
    const cancelled = fakeRuntime({
      runDurableGoal: vi.fn().mockResolvedValue(
        durableResult({
          goalStatus: 'CANCELLED',
          plan: null
        })
      )
    })
    const cancelledHandlers = createPostgresKernelHandlers(
      durableEnv,
      cancelled as unknown as PostgresKernelRuntime
    )
    const cancelledOutcome = await cancelledHandlers.inboundProcess(
      baseEvent(cancelled)
    )
    expect(cancelledOutcome).toMatchObject({
      status: 'cancelled',
      runtimeStatus: 'completed'
    })

    const pending = fakeRuntime({
      runDurableGoal: vi
        .fn()
        .mockResolvedValue(durableResult({ goalStatus: 'ACTIVE' }))
    })
    const pendingHandlers = createPostgresKernelHandlers(
      durableEnv,
      pending as unknown as PostgresKernelRuntime
    )
    const pendingOutcome = await pendingHandlers.inboundProcess(
      baseEvent(pending)
    )
    expect(pendingOutcome).toMatchObject({
      status: 'active',
      runtimeStatus: 'pending'
    })
    expect(
      pending.conversations.markInboundRuntimeCompleted
    ).not.toHaveBeenCalled()
  })

  it('omits the trace session when the inbound event carries none', async () => {
    const runtime = fakeRuntime({
      session: null,
      runDurableGoal: vi.fn().mockResolvedValue(durableResult())
    })
    const handlers = createPostgresKernelHandlers(
      durableEnv,
      runtime as unknown as PostgresKernelRuntime
    )

    const outcome = await handlers.inboundProcess(
      baseEvent(runtime, { sessionId: null })
    )

    expect(outcome).toMatchObject({ status: 'completed' })
    expect(runtime.runDurableGoal).toHaveBeenCalledWith(
      expect.objectContaining({
        traceContext: expect.not.objectContaining({
          sessionId: expect.anything()
        })
      })
    )
  })
})

describe('kernel workflow plan validation branches', () => {
  function planFor(overrides: Record<string, unknown>): WorkflowPlan {
    return {
      planId: 'plan_synthetic_c3',
      tenantId: TENANT,
      conversationId: CONVERSATION,
      sessionId: SESSION,
      correlationId: CORRELATION,
      steps: [
        {
          stepId: 'step_synthetic_c3',
          capability: 'schedule.read',
          action: 'schedule.read',
          resource: { type: 'appointment_draft', id: 'draft_c3' },
          dataClassification: 'INTERNAL',
          modelMessages: {
            messages: [{ role: 'user', content: 'synthetic' }]
          }
        }
      ],
      ...overrides
    } as unknown as WorkflowPlan
  }

  function coordinatorFor(plan: WorkflowPlan) {
    return {
      kind: 'langgraph-frontier' as const,
      coordinator: { planStep: vi.fn().mockResolvedValue(plan) }
    }
  }

  async function invokeWithPlan(
    plan: WorkflowPlan
  ): Promise<{ error: unknown; runTurn: ReturnType<typeof vi.fn> }> {
    const runtime = fakeRuntime({ workflowCoordinator: coordinatorFor(plan) })
    const handlers = createPostgresKernelHandlers(
      {},
      runtime as unknown as PostgresKernelRuntime
    )
    try {
      await handlers.inboundProcess(baseEvent(runtime))
      return { error: undefined, runTurn: runtime.runTurn as never }
    } catch (error) {
      return { error, runTurn: runtime.runTurn as never }
    }
  }

  it('rejects plans with a missing identity or wrong step count', async () => {
    const empty = await invokeWithPlan(planFor({ planId: '  ' }))
    expect((empty.error as Error).message).toMatch(/exactly one step/)
    const many = await invokeWithPlan(
      planFor({
        steps: [
          ...planFor({}).steps,
          {
            stepId: 'step_extra_c3',
            capability: 'schedule.read',
            action: 'schedule.read',
            resource: { type: 'appointment_draft' },
            dataClassification: 'INTERNAL'
          }
        ]
      })
    )
    expect((many.error as Error).message).toMatch(/exactly one step/)
  })

  it('rejects plans whose step identity is incomplete', async () => {
    const result = await invokeWithPlan(
      planFor({ steps: [{ action: '', resource: {} }] })
    )
    expect((result.error as Error).message).toMatch(
      /invalid action or resource/
    )
  })

  it('rejects a step resource bound to another tenant', async () => {
    const result = await invokeWithPlan(
      planFor({
        steps: [
          {
            stepId: 'step_synthetic_c3',
            capability: 'schedule.read',
            action: 'schedule.read',
            resource: { type: 'appointment_draft', tenantId: 'tenant_other' },
            dataClassification: 'INTERNAL'
          }
        ]
      })
    )
    expect((result.error as Error).message).toMatch(
      /resource tenant does not match/
    )
  })

  it('rejects invalid capability and data classification values', async () => {
    const capability = await invokeWithPlan(
      planFor({
        steps: [
          {
            stepId: 'step_synthetic_c3',
            capability: 'not-a-capability',
            action: 'not-a-capability',
            resource: { type: 'appointment_draft' },
            dataClassification: 'INTERNAL'
          }
        ]
      })
    )
    expect((capability.error as Error).message).toMatch(/capability is invalid/)

    const classification = await invokeWithPlan(
      planFor({
        steps: [
          {
            stepId: 'step_synthetic_c3',
            capability: 'schedule.read',
            action: 'schedule.read',
            resource: { type: 'appointment_draft' },
            dataClassification: 'BOGUS'
          }
        ]
      })
    )
    expect((classification.error as Error).message).toMatch(
      /data classification is invalid/
    )
  })

  it('rejects invalid model messages and accepts a minimal normalized plan', async () => {
    const invalid = await invokeWithPlan(
      planFor({
        steps: [
          {
            stepId: 'step_synthetic_c3',
            capability: 'schedule.read',
            action: 'schedule.read',
            resource: { type: 'appointment_draft' },
            dataClassification: 'INTERNAL',
            modelMessages: {
              messages: [{ role: 'invalid-role', content: 'x' }]
            }
          }
        ]
      })
    )
    expect((invalid.error as Error).message).toMatch(
      /model messages are invalid/
    )

    const runtime = fakeRuntime({
      session: {
        id: SESSION,
        conversationId: CONVERSATION,
        status: 'open',
        takeoverState: 'BOT_ACTIVE',
        createdAt: CREATED_AT,
        updatedAt: CREATED_AT
      },
      workflowCoordinator: coordinatorFor(
        planFor({
          sessionId: undefined,
          steps: [
            {
              stepId: 'step_synthetic_c3',
              capability: 'schedule.read',
              action: 'schedule.read',
              resource: { type: 'appointment_draft', tenantId: TENANT },
              dataClassification: 'INTERNAL'
            }
          ]
        })
      )
    })
    const runTurn = vi.fn().mockResolvedValue(governedResult('executed'))
    runtime.runTurn = runTurn
    const handlers = createPostgresKernelHandlers(
      {},
      runtime as unknown as PostgresKernelRuntime
    )

    const outcome = await handlers.inboundProcess(baseEvent(runtime))

    expect(outcome).toMatchObject({ status: 'completed' })
    const input = runTurn.mock.calls[0]?.[0] as GovernedTurnInput
    expect(input.sessionId).toBe(SESSION)
    expect(input.resource.id).toBeUndefined()
    expect(input.resource.tenantId).toBe(TENANT)
    expect(input.modelMessages.messages).toHaveLength(1)
  })
})

describe('kernel runtime audit flush failure branches', () => {
  function flushInput(traceId?: string): GovernedTurnInput {
    return {
      tenantId: TENANT,
      operatorId: 'op_synthetic_kernel',
      operatorRole: 'Operator',
      agentId: AGENT,
      agentVersion: 'synthetic-v1',
      agentProfile: 'secretary',
      conversationId: 'conv_flush_branch',
      correlationId: CORRELATION,
      capability: 'schedule.read',
      action: 'schedule.read',
      resource: { type: 'appointment_draft', id: 'draft_flush_branch' },
      dataClassification: 'INTERNAL',
      prompt: {
        promptId: CONTROLLED_KERNEL_PROMPT_ID,
        version: CONTROLLED_KERNEL_PROMPT_VERSION
      },
      modelProfile: 'fast',
      modelMessages: { messages: [{ role: 'user', content: 'synthetic' }] },
      ...(traceId !== undefined
        ? {
            traceContext: {
              traceId,
              spanId: '0123456789abcdef',
              correlationId: CORRELATION
            }
          }
        : {})
    }
  }

  function brokenRuntime() {
    return createPostgresKernelRuntime({
      pool: {
        connect: async () => {
          throw new Error('synthetic pool outage')
        }
      } as unknown as PostgresPoolLike,
      tenantId: TENANT,
      agentId: AGENT,
      env: { CVG_WORKER_RUNTIME: KERNEL_WORKER_RUNTIME }
    })
  }

  it('fails a turn without a trace before any audit flush', async () => {
    await expect(brokenRuntime().runTurn(flushInput())).rejects.toThrow(
      /synthetic pool outage/
    )
  })

  it('fails a turn whose trace has no audit records yet', async () => {
    await expect(
      brokenRuntime().runTurn(flushInput('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb1'))
    ).rejects.toThrow(/synthetic pool outage/)
  })
})

const testDatabaseUrl = process.env.TEST_DATABASE_URL
const describeWithPostgres = testDatabaseUrl ? describe : describe.skip

const DURABLE_SNAPSHOT = {
  agentVersion: 'synthetic-v1',
  promptVersion: CONTROLLED_KERNEL_PROMPT_VERSION,
  policyVersion: 'synthetic.controlled-kernel@1.0.0',
  modelProfile: 'fast',
  toolVersions: { 'controlled-kernel-tool': '1.0.0' },
  runtimeMode: 'kernel' as const,
  runtimeVersion: 'aaa21-kernel-v1'
}

describeWithPostgres(
  'kernel durable composition branch hardening (PostgreSQL)',
  () => {
    const schema = `cvg_kernel_c2_${Date.now()}_${randomBytes(2).toString('hex')}`
    let admin: Client
    let pool: Pool
    let runtime: PostgresKernelRuntime
    let sequence = 0

    function correlationId(): string {
      sequence += 1
      return `corr_00000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`
    }

    function messageId(prefix: string): string {
      sequence += 1
      return `${prefix}_${sequence}`
    }

    function envelope(overrides: Record<string, unknown> = {}) {
      return parseKernelTurnEnvelope(
        JSON.stringify({
          cvgTurn: {
            capability: 'appointment.modify',
            action: 'appointment.modify',
            resource: { type: 'appointment_draft', id: 'draft_pg_c2' },
            message: 'synthetic durable branch hardening',
            ...overrides
          }
        })
      )
    }

    function goalInput(options: {
      messageId: string
      correlationId?: string
      conversationId?: string
      envelope?: ReturnType<typeof envelope>
      session?: InboundRuntimeContext['session']
      traceId?: string
    }): Parameters<PostgresKernelRuntime['runDurableGoal']>[0] {
      const correlation = options.correlationId ?? correlationId()
      return {
        context: {
          message: {
            id: options.messageId,
            conversationId:
              options.conversationId ?? `conv_${options.messageId}`,
            externalMessageId: `external_${options.messageId}`,
            direction: 'inbound',
            body: '{}',
            runtimeStatus: 'pending',
            createdAt: new Date('2026-09-16T12:00:00.000Z')
          },
          channel: 'web',
          senderRef: 'synthetic-branch-sender',
          correlationId: correlation,
          session: options.session ?? null
        },
        envelope: options.envelope ?? envelope(),
        correlationId: correlation,
        ...(options.traceId !== undefined
          ? {
              traceContext: {
                traceId: options.traceId,
                spanId: '0123456789abcdef',
                correlationId: correlation
              }
            }
          : {})
      }
    }

    async function seedWaitingGoal(prefix: string): Promise<{
      goalId: string
      stepId: string
      approvalId: string
      input: Parameters<PostgresKernelRuntime['runDurableGoal']>[0]
    }> {
      const input = goalInput({ messageId: messageId(prefix) })
      const result = await runtime.runDurableGoal(input)
      if (result.goal.status !== 'WAITING_APPROVAL') {
        throw new Error(`synthetic seed did not wait: ${result.goal.status}`)
      }
      const step = result.steps[0]
      if (step === undefined || step.approvalId === null) {
        throw new Error('synthetic seed step has no approval')
      }
      return {
        goalId: result.goal.id,
        stepId: step.id,
        approvalId: step.approvalId,
        input
      }
    }

    async function expireLease(
      stepId: string,
      status: 'WAITING_APPROVAL' | 'EXECUTING'
    ): Promise<void> {
      await pool.query(
        `UPDATE orchestrator_steps
          SET status = $2, lease_until = $3, lease_token = 'synthetic_token',
              lease_owner = 'synthetic_worker'
        WHERE tenant_id = $1 AND id = $4`,
        [TENANT, status, new Date(Date.now() - 60_000), stepId]
      )
    }

    async function setGoalStatus(
      goalId: string,
      status: string
    ): Promise<void> {
      await pool.query(
        `UPDATE orchestrator_goals SET status = $2 WHERE tenant_id = $1 AND id = $3`,
        [TENANT, status, goalId]
      )
    }

    async function createCanonicalGoal(
      input: Parameters<PostgresKernelRuntime['runDurableGoal']>[0]
    ) {
      return runtime.goalStore.createGoal({
        tenantId: TENANT,
        inboundMessageId: input.context.message.id,
        ...(input.context.session?.id !== undefined
          ? { sessionId: input.context.session.id }
          : {}),
        conversationId: input.context.message.conversationId,
        objective: input.envelope.message,
        successCriteria: [
          {
            kind: 'EVENT',
            eventType: `${input.envelope.capability}.executed`,
            source: 'outbox',
            correlationId: input.correlationId
          }
        ],
        correlationId: input.correlationId,
        plannerContext: {
          messageId: input.context.message.id,
          sessionId: input.context.session?.id ?? null,
          envelope: input.envelope,
          ...(input.traceContext !== undefined
            ? { traceId: input.traceContext.traceId }
            : {})
        },
        executionSnapshot: {
          ...DURABLE_SNAPSHOT,
          agentVersion: input.envelope.agentVersion,
          modelProfile: input.envelope.modelProfile
        }
      })
    }

    async function updateApproval(
      approvalId: string,
      fields: {
        status?: string
        operationKey?: string | null
        reservationId?: string | null
      }
    ): Promise<void> {
      const assignments: string[] = []
      const values: unknown[] = [TENANT, approvalId]
      if (fields.status !== undefined) {
        values.push(fields.status)
        assignments.push(`status = $${values.length}`)
      }
      if (fields.operationKey !== undefined) {
        values.push(fields.operationKey)
        assignments.push(`operation_key = $${values.length}`)
      }
      if (fields.reservationId !== undefined) {
        values.push(fields.reservationId)
        assignments.push(`reservation_id = $${values.length}`)
      }
      if (assignments.length === 0) return
      await pool.query(
        `UPDATE runtime_approvals SET ${assignments.join(', ')}
        WHERE tenant_id = $1 AND approval_id = $2`,
        values
      )
    }

    async function stepStatus(stepId: string): Promise<string | null> {
      const result = await pool.query<{ status: string }>(
        `SELECT status FROM orchestrator_steps WHERE tenant_id = $1 AND id = $2`,
        [TENANT, stepId]
      )
      return result.rows[0]?.status ?? null
    }

    async function seedJournalRecord(input: {
      operationKey: string
      proposalHash: string
      state: 'CONFIRMED' | 'EFFECT_FAILED' | 'ABANDONED' | 'UNCERTAIN'
      resultDigest?: string | null
    }): Promise<void> {
      await withTenantContext(pool, TENANT, async (client) => {
        const journal = new PostgresEffectJournal(client)
        const attemptId = `att_${sequence}`
        const reserved = await journal.reserve({
          tenantId: TENANT,
          operationKey: input.operationKey,
          proposalHash: input.proposalHash,
          attemptId,
          expiresAt: new Date(Date.now() + 60_000).toISOString()
        })
        if (reserved.outcome !== 'reserved') {
          throw new Error(`synthetic journal seed failed: ${reserved.outcome}`)
        }
        if (input.state === 'EFFECT_FAILED') {
          await journal.failEffect({
            tenantId: TENANT,
            operationKey: input.operationKey,
            attemptId,
            errorCode: 'synthetic_effect_failed'
          })
          return
        }
        await journal.markEffectStarted({
          tenantId: TENANT,
          operationKey: input.operationKey,
          attemptId
        })
        if (input.state === 'ABANDONED') {
          await journal.markUncertain({
            tenantId: TENANT,
            operationKey: input.operationKey,
            attemptId,
            reason: 'synthetic abandonment seed'
          })
          await journal.reconcile({
            tenantId: TENANT,
            operationKey: input.operationKey,
            actorId: 'op_synthetic_kernel',
            outcome: 'no_effect',
            evidenceRef: 'synthetic'
          })
          return
        }
        if (input.state === 'UNCERTAIN') {
          await journal.markUncertain({
            tenantId: TENANT,
            operationKey: input.operationKey,
            attemptId,
            reason: 'synthetic uncertain seed'
          })
          return
        }
        await journal.confirmEffect({
          tenantId: TENANT,
          operationKey: input.operationKey,
          attemptId,
          executionRef: `exec_${input.operationKey}`,
          resultDigest: input.resultDigest ?? 'd'.repeat(64)
        })
      })
      if (input.resultDigest === null) {
        await pool.query(
          `UPDATE effect_journal SET result_digest = NULL
          WHERE tenant_id = $1 AND operation_key = $2`,
          [TENANT, input.operationKey]
        )
      }
    }

    function callerOperationKey(callerIdempotencyKey: string): string {
      const canonical = canonicalizeJson({
        tenantId: TENANT,
        callerIdempotencyKey
      })
      return `op:${createHash('sha256').update(canonical, 'utf8').digest('hex')}`
    }

    function draftProposalHash(resource: {
      type: string
      id?: string
    }): string {
      return computeExecutionProposalHash({
        schemaVersion: EXECUTION_PROPOSAL_SCHEMA_VERSION,
        tenantId: TENANT,
        operatorId: 'op_synthetic_kernel',
        agentId: AGENT,
        agentVersion: 'synthetic-v1',
        agentProfile: 'secretary',
        capability: 'message.draft',
        action: 'message.draft',
        resource,
        dataClassification: 'INTERNAL',
        payload: {
          text: JSON.stringify({ text: 'SYNTHETIC_CONTROLLED_KERNEL_PAYLOAD' })
        }
      })
    }

    async function seedReadyGoalStep(input: {
      messageId: string
      intentOverrides?: Record<string, unknown>
      inputValue?: unknown
      withConversation?: boolean
    }): Promise<{ goalId: string; stepId: string }> {
      const goal = await runtime.goalStore.createGoal({
        tenantId: TENANT,
        inboundMessageId: input.messageId,
        ...(input.withConversation === false
          ? {}
          : { conversationId: `conv_${input.messageId}` }),
        objective: 'synthetic seeded plan',
        successCriteria: [],
        correlationId: correlationId(),
        executionSnapshot: DURABLE_SNAPSHOT
      })
      const draft: PlanStepDraft = {
        id: `step_${input.messageId}`,
        type: 'governed_kernel_turn',
        description: 'synthetic seeded step',
        dependencies: [],
        requiredCapabilities: ['schedule.read'],
        riskLevel: 'READ_ONLY',
        approvalRequirement: 'none',
        input: input.inputValue ?? { messageId: input.messageId },
        expectedOutcome: { governedRuntime: 'executed' },
        timeoutMs: 30_000,
        intent: {
          capability: 'schedule.read',
          action: 'schedule.read',
          resource: {
            type: 'appointment_draft',
            id: `draft_${input.messageId}`
          },
          dataClassification: 'INTERNAL',
          modelMessages: {
            messages: [{ role: 'user', content: 'synthetic seeded turn' }]
          },
          structuredOutput: null,
          idempotencyKey: null,
          ...input.intentOverrides
        }
      }
      const fingerprint = planFingerprint(goal.id, [draft])
      const activated = await runtime.goalStore.activatePlan({
        tenantId: TENANT,
        goalId: goal.id,
        expectedGoalVersion: goal.version,
        planVersion: 1,
        parentPlanId: null,
        reason: 'synthetic seed',
        steps: [draft],
        consumeReplan: false,
        fingerprint
      })
      await setGoalStatus(goal.id, 'GOVERNING')
      return { goalId: goal.id, stepId: activated.steps[0]?.id ?? '' }
    }

    function planFingerprint(goalId: string, drafts: PlanStepDraft[]): string {
      const plan: Plan = {
        id: 'plan_fingerprint',
        goalId,
        tenantId: TENANT,
        version: 1,
        parentPlanId: null,
        reason: 'synthetic fingerprint',
        triggeringEvaluationId: null,
        status: 'ACTIVE',
        createdAt: new Date('2026-09-16T12:00:00.000Z'),
        updatedAt: new Date('2026-09-16T12:00:00.000Z'),
        fingerprint: ''
      }
      return validatePlanGraph(plan, drafts).fingerprint
    }

    it('rethrows an unrelated durable orchestrator error', async () => {
      const input = goalInput({ messageId: messageId('msg_run_error') })
      const run = vi
        .spyOn(runtime.orchestrator, 'run')
        .mockRejectedValue(new Error('synthetic orchestrator outage'))
      try {
        await expect(runtime.runDurableGoal(input)).rejects.toThrow(
          /synthetic orchestrator outage/
        )
      } finally {
        run.mockRestore()
      }
    })

    it('does not convert a lease-lost error when the goal was deleted', async () => {
      const input = goalInput({
        messageId: messageId('msg_lease_lost_missing')
      })
      const run = vi
        .spyOn(runtime.orchestrator, 'run')
        .mockRejectedValue(
          new OrchestrationError('lease_lost', 'synthetic lease lost')
        )
      const getGoal = vi
        .spyOn(runtime.goalStore, 'getGoal')
        .mockResolvedValue(null)
      try {
        await expect(runtime.runDurableGoal(input)).rejects.toThrow(
          /synthetic lease lost/
        )
      } finally {
        getGoal.mockRestore()
        run.mockRestore()
      }
    })

    it('returns a fenced result with the active plan after a conflict', async () => {
      const input = goalInput({ messageId: messageId('msg_conflict_active') })
      const run = vi
        .spyOn(runtime.orchestrator, 'run')
        .mockRejectedValue(
          new OrchestrationError('conflict', 'synthetic conflict')
        )
      const activePlan = { id: 'plan_synthetic_fenced' } as never
      const getActivePlan = vi
        .spyOn(runtime.goalStore, 'getActivePlan')
        .mockResolvedValue(activePlan)
      const listSteps = vi
        .spyOn(runtime.goalStore, 'listSteps')
        .mockResolvedValue([])
      try {
        const result = await runtime.runDurableGoal(input)
        expect(result.reason).toBe('goal_run_fenced')
        expect(result.plan).toBe(activePlan)
        expect(result.steps).toEqual([])
      } finally {
        listSteps.mockRestore()
        getActivePlan.mockRestore()
        run.mockRestore()
      }
    })

    beforeAll(async () => {
      if (!testDatabaseUrl) return
      admin = new Client({ connectionString: testDatabaseUrl })
      await admin.connect()
      await runPostgresMigrations(admin, { schemaName: schema })
      pool = new Pool({
        connectionString: testDatabaseUrl,
        options: `-c search_path=${schema}`
      })
      runtime = createPostgresKernelRuntime({
        pool,
        tenantId: TENANT,
        agentId: AGENT,
        env: {
          CVG_WORKER_RUNTIME: KERNEL_WORKER_RUNTIME,
          CVG_WORKER_AGENT_ID: AGENT,
          CVG_WORKER_ID: 'kernel-branch-hardening-worker'
        }
      })
      await runtime.preflight()
    })

    afterAll(async () => {
      if (!testDatabaseUrl) return
      await pool?.end().catch(() => undefined)
      await admin
        ?.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
        .catch(() => undefined)
      await admin?.end().catch(() => undefined)
    })

    it('recovers an expired lease with no approval using the requirement decision', async () => {
      const retry = await seedWaitingGoal('msg_lease_none_retry')
      await pool.query(
        `UPDATE orchestrator_steps SET approval_id = NULL, approval_requirement = 'none'
        WHERE tenant_id = $1 AND id = $2`,
        [TENANT, retry.stepId]
      )
      await expireLease(retry.stepId, 'EXECUTING')
      await setGoalStatus(retry.goalId, 'UNCERTAIN')
      await runtime.orchestrator.run(TENANT, retry.goalId)
      expect(await stepStatus(retry.stepId)).toBe('READY')

      const uncertain = await seedWaitingGoal('msg_lease_none_uncertain')
      await pool.query(
        `UPDATE orchestrator_steps SET approval_id = NULL, approval_requirement = 'approval'
        WHERE tenant_id = $1 AND id = $2`,
        [TENANT, uncertain.stepId]
      )
      await expireLease(uncertain.stepId, 'EXECUTING')
      await setGoalStatus(uncertain.goalId, 'UNCERTAIN')
      await runtime.orchestrator.run(TENANT, uncertain.goalId)
      expect(await stepStatus(uncertain.stepId)).toBe('UNCERTAIN')
    })

    it('treats an unreadable approval or missing operation key as uncertain', async () => {
      const missing = await seedWaitingGoal('msg_lease_approval_missing')
      await pool.query(
        `DELETE FROM runtime_approvals WHERE tenant_id = $1 AND approval_id = $2`,
        [TENANT, missing.approvalId]
      )
      await expireLease(missing.stepId, 'EXECUTING')
      await setGoalStatus(missing.goalId, 'UNCERTAIN')
      await runtime.orchestrator.run(TENANT, missing.goalId)
      expect(await stepStatus(missing.stepId)).toBe('UNCERTAIN')

      const keyless = await seedWaitingGoal('msg_lease_keyless')
      await updateApproval(keyless.approvalId, { operationKey: null })
      await expireLease(keyless.stepId, 'EXECUTING')
      await setGoalStatus(keyless.goalId, 'UNCERTAIN')
      await runtime.orchestrator.run(TENANT, keyless.goalId)
      expect(await stepStatus(keyless.stepId)).toBe('UNCERTAIN')
    })

    it('decides replay safety from the persisted journal and approval state', async () => {
      const executed = await seedWaitingGoal('msg_lease_confirmed_executed')
      const executedKey = callerOperationKey('msg_lease_confirmed_executed_key')
      await seedJournalRecord({
        operationKey: executedKey,
        proposalHash: 'a'.repeat(64),
        state: 'CONFIRMED'
      })
      await updateApproval(executed.approvalId, {
        status: 'EXECUTED',
        operationKey: executedKey
      })
      await expireLease(executed.stepId, 'EXECUTING')
      await setGoalStatus(executed.goalId, 'UNCERTAIN')
      await runtime.orchestrator.run(TENANT, executed.goalId)
      expect(await stepStatus(executed.stepId)).toBe('READY')

      const reserved = await seedWaitingGoal('msg_lease_confirmed_reserved')
      const reservedKey = callerOperationKey('msg_lease_confirmed_reserved_key')
      await seedJournalRecord({
        operationKey: reservedKey,
        proposalHash: 'b'.repeat(64),
        state: 'CONFIRMED'
      })
      await updateApproval(reserved.approvalId, {
        status: 'RESERVED',
        operationKey: reservedKey,
        reservationId: 'res_synthetic'
      })
      await expireLease(reserved.stepId, 'EXECUTING')
      await setGoalStatus(reserved.goalId, 'UNCERTAIN')
      await runtime.orchestrator.run(TENANT, reserved.goalId)
      expect(await stepStatus(reserved.stepId)).toBe('READY')

      const approved = await seedWaitingGoal('msg_lease_confirmed_approved')
      const approvedKey = callerOperationKey('msg_lease_confirmed_approved_key')
      await seedJournalRecord({
        operationKey: approvedKey,
        proposalHash: 'c'.repeat(64),
        state: 'CONFIRMED'
      })
      await updateApproval(approved.approvalId, {
        status: 'APPROVED',
        operationKey: approvedKey,
        reservationId: null
      })
      await expireLease(approved.stepId, 'EXECUTING')
      await setGoalStatus(approved.goalId, 'UNCERTAIN')
      await runtime.orchestrator.run(TENANT, approved.goalId)
      expect(await stepStatus(approved.stepId)).toBe('UNCERTAIN')
    })

    it('retries terminal no-effect journal states only for re-armable approvals', async () => {
      const failed = await seedWaitingGoal('msg_lease_failed_retry')
      const failedKey = callerOperationKey('msg_lease_failed_retry_key')
      await seedJournalRecord({
        operationKey: failedKey,
        proposalHash: 'd'.repeat(64),
        state: 'EFFECT_FAILED'
      })
      await updateApproval(failed.approvalId, {
        status: 'APPROVED',
        operationKey: failedKey,
        reservationId: null
      })
      await expireLease(failed.stepId, 'EXECUTING')
      await setGoalStatus(failed.goalId, 'UNCERTAIN')
      await runtime.orchestrator.run(TENANT, failed.goalId)
      expect(await stepStatus(failed.stepId)).toBe('READY')

      const abandoned = await seedWaitingGoal('msg_lease_abandoned_uncertain')
      const abandonedKey = callerOperationKey(
        'msg_lease_abandoned_uncertain_key'
      )
      await seedJournalRecord({
        operationKey: abandonedKey,
        proposalHash: 'e'.repeat(64),
        state: 'ABANDONED'
      })
      await updateApproval(abandoned.approvalId, {
        status: 'REQUESTED',
        operationKey: abandonedKey,
        reservationId: null
      })
      await expireLease(abandoned.stepId, 'EXECUTING')
      await setGoalStatus(abandoned.goalId, 'UNCERTAIN')
      await runtime.orchestrator.run(TENANT, abandoned.goalId)
      expect(await stepStatus(abandoned.stepId)).toBe('UNCERTAIN')
    })

    it('retries an absent journal only for an approved reservation', async () => {
      const retry = await seedWaitingGoal('msg_lease_absent_retry')
      await updateApproval(retry.approvalId, {
        status: 'APPROVED',
        operationKey: callerOperationKey('msg_lease_absent_retry_key'),
        reservationId: null
      })
      await expireLease(retry.stepId, 'EXECUTING')
      await setGoalStatus(retry.goalId, 'UNCERTAIN')
      await runtime.orchestrator.run(TENANT, retry.goalId)
      expect(await stepStatus(retry.stepId)).toBe('READY')

      const uncertain = await seedWaitingGoal('msg_lease_absent_uncertain')
      await updateApproval(uncertain.approvalId, {
        status: 'REQUESTED',
        operationKey: callerOperationKey('msg_lease_absent_uncertain_key'),
        reservationId: null
      })
      await expireLease(uncertain.stepId, 'EXECUTING')
      await setGoalStatus(uncertain.goalId, 'UNCERTAIN')
      await runtime.orchestrator.run(TENANT, uncertain.goalId)
      expect(await stepStatus(uncertain.stepId)).toBe('UNCERTAIN')
    })

    it('resolves an expired waiting approval and skips pending ones', async () => {
      const expired = await seedWaitingGoal('msg_waiting_expired')
      await updateApproval(expired.approvalId, { status: 'EXPIRED' })
      const sweep = await runtime.recoverDurableGoals()
      expect(sweep.failures).toBe(0)
      expect(await stepStatus(expired.stepId)).toBe('CANCELLED')

      const pending = await seedWaitingGoal('msg_waiting_pending')
      const pendingSweep = await runtime.recoverDurableGoals()
      expect(pendingSweep.skipped).toBeGreaterThanOrEqual(1)
      expect(await stepStatus(pending.stepId)).toBe('WAITING_APPROVAL')
    })

    it('skips waiting goals without a plan, without a waiting step or without an approval identity', async () => {
      const noPlan = await runtime.goalStore.createGoal({
        tenantId: TENANT,
        inboundMessageId: messageId('msg_waiting_no_plan'),
        conversationId: 'conv_waiting_no_plan',
        objective: 'synthetic',
        successCriteria: [],
        correlationId: correlationId(),
        executionSnapshot: DURABLE_SNAPSHOT
      })
      await setGoalStatus(noPlan.id, 'WAITING_APPROVAL')

      const noWaitingStep = await seedWaitingGoal('msg_waiting_no_step')
      await pool.query(
        `UPDATE orchestrator_steps SET status = 'PENDING', approval_id = NULL
        WHERE tenant_id = $1 AND id = $2`,
        [TENANT, noWaitingStep.stepId]
      )

      const noApprovalIdentity = await seedWaitingGoal(
        'msg_waiting_no_identity'
      )
      await pool.query(
        `UPDATE orchestrator_steps SET approval_id = NULL
        WHERE tenant_id = $1 AND id = $2`,
        [TENANT, noApprovalIdentity.stepId]
      )
      await setGoalStatus(noWaitingStep.goalId, 'WAITING_APPROVAL')
      await setGoalStatus(noApprovalIdentity.goalId, 'WAITING_APPROVAL')

      const sweep = await runtime.recoverDurableGoals()
      expect(sweep.failures).toBe(0)
      expect(await stepStatus(noWaitingStep.stepId)).toBe('PENDING')
      expect(await stepStatus(noApprovalIdentity.stepId)).toBe(
        'WAITING_APPROVAL'
      )
    })

    it('skips a waiting goal whose approval cannot be read', async () => {
      const missing = await seedWaitingGoal('msg_waiting_missing_approval')
      await pool.query(
        `DELETE FROM runtime_approvals WHERE tenant_id = $1 AND approval_id = $2`,
        [TENANT, missing.approvalId]
      )
      const sweep = await runtime.recoverDurableGoals()
      expect(sweep.failures).toBe(0)
      expect(await stepStatus(missing.stepId)).toBe('WAITING_APPROVAL')
    })

    it('rejects reuse when persisted planner context has unexpected lineage fields', async () => {
      const sessionMessageId = messageId('msg_planner_runtime_session')
      const sessionCorrelation = correlationId()
      const sessionConversationId = `conv_${sessionMessageId}`
      const sessionInput = goalInput({
        messageId: sessionMessageId,
        correlationId: sessionCorrelation,
        conversationId: sessionConversationId,
        envelope: envelope({
          capability: 'schedule.read',
          action: 'schedule.read'
        }),
        session: {
          id: 'sess_planner_runtime',
          conversationId: sessionConversationId,
          status: 'open',
          takeoverState: 'BOT_ACTIVE',
          createdAt: new Date('2026-09-16T12:00:00.000Z'),
          updatedAt: new Date('2026-09-16T12:00:00.000Z')
        }
      })
      const sessionGoal = await createCanonicalGoal(sessionInput)
      await pool.query(
        `UPDATE orchestrator_goals
            SET planner_context = planner_context || '{"unexpected":true}'::jsonb
          WHERE tenant_id = $1 AND id = $2`,
        [TENANT, sessionGoal.id]
      )
      await expect(runtime.runDurableGoal(sessionInput)).rejects.toMatchObject({
        code: 'conflict'
      })

      const traceMessageId = messageId('msg_planner_runtime_trace')
      const traceCorrelation = correlationId()
      const traceConversationId = `conv_${traceMessageId}`
      const traceInput = goalInput({
        messageId: traceMessageId,
        correlationId: traceCorrelation,
        conversationId: traceConversationId,
        envelope: envelope({
          capability: 'schedule.read',
          action: 'schedule.read'
        }),
        traceId: TRACE
      })
      const traceGoal = await createCanonicalGoal(traceInput)
      await pool.query(
        `UPDATE orchestrator_goals
            SET planner_context = planner_context || '{"unexpected":true}'::jsonb
          WHERE tenant_id = $1 AND id = $2`,
        [TENANT, traceGoal.id]
      )
      await expect(runtime.runDurableGoal(traceInput)).rejects.toMatchObject({
        code: 'conflict'
      })
    })

    it('fails closed when no persisted or runtime planner context exists', async () => {
      const goal = await runtime.goalStore.createGoal({
        tenantId: TENANT,
        inboundMessageId: messageId('msg_planner_missing'),
        conversationId: 'conv_planner_missing',
        objective: 'synthetic',
        successCriteria: [],
        correlationId: correlationId(),
        plannerContext: {},
        executionSnapshot: DURABLE_SNAPSHOT
      })

      await expect(runtime.orchestrator.run(TENANT, goal.id)).rejects.toThrow(
        /planner context is unavailable/
      )
    })

    it('rejects a persisted runtime snapshot that does not match the controlled kernel', async () => {
      const goal = await runtime.goalStore.createGoal({
        tenantId: TENANT,
        inboundMessageId: messageId('msg_snapshot_mismatch'),
        conversationId: 'conv_snapshot_mismatch',
        objective: 'synthetic',
        successCriteria: [],
        correlationId: correlationId(),
        executionSnapshot: {
          ...DURABLE_SNAPSHOT,
          runtimeMode: 'published-agent'
        }
      })

      await expect(runtime.orchestrator.run(TENANT, goal.id)).rejects.toThrow(
        /does not match the controlled kernel/
      )
    })

    it('executes a seeded step with a null conversation and session lineage', async () => {
      const seeded = await seedReadyGoalStep({
        messageId: 'msg_seeded_minimal',
        withConversation: false,
        inputValue: { traceId: TRACE }
      })

      const result = await runtime.orchestrator.run(TENANT, seeded.goalId)

      expect(result.goal.status).toBe('COMPLETED')
      expect(await stepStatus(seeded.stepId)).toBe('SUCCEEDED')
    })

    it('executes a seeded step with a non-object input and absent model messages', async () => {
      const seeded = await seedReadyGoalStep({
        messageId: 'msg_seeded_input',
        inputValue: 'synthetic-non-object-input',
        intentOverrides: { modelMessages: null }
      })

      const result = await runtime.orchestrator.run(TENANT, seeded.goalId)

      expect(result.goal.status).toBe('COMPLETED')
      expect(await stepStatus(seeded.stepId)).toBe('SUCCEEDED')
    })

    it('executes a seeded step with a null idempotency key and tool identity', async () => {
      const seeded = await seedReadyGoalStep({
        messageId: 'msg_seeded_key',
        intentOverrides: { idempotencyKey: null }
      })

      const result = await runtime.orchestrator.run(TENANT, seeded.goalId)

      expect(result.goal.status).toBe('COMPLETED')
    })

    it('re-evaluates a recovered plan and executes the recovered step', async () => {
      const goal = await runtime.goalStore.createGoal({
        tenantId: TENANT,
        inboundMessageId: messageId('msg_recovered_plan'),
        objective: 'synthetic',
        successCriteria: [],
        correlationId: correlationId(),
        plannerContext: {},
        executionSnapshot: DURABLE_SNAPSHOT
      })
      const draft: PlanStepDraft = {
        id: 'step_recovered_plan',
        type: 'governed_kernel_turn',
        description: 'synthetic recovered step',
        dependencies: [],
        requiredCapabilities: ['schedule.read'],
        riskLevel: 'READ_ONLY',
        approvalRequirement: 'none',
        input: { traceId: TRACE },
        expectedOutcome: { governedRuntime: 'executed' },
        timeoutMs: 30_000,
        toolId: 'controlled-kernel-tool',
        toolVersion: '1.0.0',
        intent: {
          capability: 'schedule.read',
          action: 'schedule.read',
          resource: { type: 'appointment_draft' },
          dataClassification: 'INTERNAL',
          modelMessages: {
            messages: [{ role: 'user', content: 'synthetic recovered turn' }]
          },
          structuredOutput: null,
          idempotencyKey: null
        }
      }
      const activated = await runtime.goalStore.activatePlan({
        tenantId: TENANT,
        goalId: goal.id,
        expectedGoalVersion: goal.version,
        planVersion: 1,
        parentPlanId: null,
        reason: 'synthetic seed',
        steps: [draft],
        consumeReplan: false,
        fingerprint: planFingerprint(goal.id, [draft])
      })
      await pool.query(
        `UPDATE orchestrator_steps SET status = 'FAILED' WHERE tenant_id = $1 AND id = $2`,
        [TENANT, activated.steps[0]?.id ?? '']
      )
      await setGoalStatus(goal.id, 'EVALUATING')

      const result = await runtime.orchestrator.run(TENANT, goal.id)

      expect(result.goal.status).toBe('LOOP_DETECTED')
      expect(result.reason).toBe('replan_fingerprint_repeated')
      expect(result.plan?.version).toBe(1)
    })

    it('re-evaluates a recovered plan without tool identity', async () => {
      const goal = await runtime.goalStore.createGoal({
        tenantId: TENANT,
        inboundMessageId: messageId('msg_recovered_plan_notool'),
        objective: 'synthetic',
        successCriteria: [],
        correlationId: correlationId(),
        plannerContext: {},
        executionSnapshot: DURABLE_SNAPSHOT
      })
      const draft: PlanStepDraft = {
        id: 'step_recovered_plan_notool',
        type: 'governed_kernel_turn',
        description: 'synthetic recovered step without tool identity',
        dependencies: [],
        requiredCapabilities: ['schedule.read'],
        riskLevel: 'READ_ONLY',
        approvalRequirement: 'none',
        input: { traceId: TRACE },
        expectedOutcome: { governedRuntime: 'executed' },
        timeoutMs: 30_000,
        intent: {
          capability: 'schedule.read',
          action: 'schedule.read',
          resource: { type: 'appointment_draft' },
          dataClassification: 'INTERNAL',
          modelMessages: {
            messages: [{ role: 'user', content: 'synthetic recovered turn' }]
          },
          structuredOutput: null,
          idempotencyKey: null
        }
      }
      const activated = await runtime.goalStore.activatePlan({
        tenantId: TENANT,
        goalId: goal.id,
        expectedGoalVersion: goal.version,
        planVersion: 1,
        parentPlanId: null,
        reason: 'synthetic seed',
        steps: [draft],
        consumeReplan: false,
        fingerprint: planFingerprint(goal.id, [draft])
      })
      await pool.query(
        `UPDATE orchestrator_steps SET status = 'FAILED' WHERE tenant_id = $1 AND id = $2`,
        [TENANT, activated.steps[0]?.id ?? '']
      )
      await setGoalStatus(goal.id, 'EVALUATING')

      const result = await runtime.orchestrator.run(TENANT, goal.id)

      expect(result.goal.status).toBe('LOOP_DETECTED')
      expect(result.reason).toBe('replan_fingerprint_repeated')
    })

    it('resolves a rejected durable approval continuation and fails closed on a mismatch', async () => {
      const rejected = await seedWaitingGoal('msg_durable_reject')
      await runtime.approvals.decideAndEnqueueContinuation({
        tenantId: TENANT,
        approvalId: rejected.approvalId,
        decision: 'reject',
        approverId: 'op_synthetic_approver',
        actorType: 'Supervisor',
        requestCorrelationId: rejected.input.correlationId
      })
      const rejectedRun = await runtime.runDurableGoal({
        ...rejected.input,
        envelope: {
          ...rejected.input.envelope,
          approvalId: rejected.approvalId
        },
        approvalDecision: 'reject'
      })
      expect(rejectedRun.goal.id).toBe(rejected.goalId)

      const mismatch = await seedWaitingGoal('msg_durable_reject_mismatch')
      await runtime.approvals.decideAndEnqueueContinuation({
        tenantId: TENANT,
        approvalId: mismatch.approvalId,
        decision: 'approve',
        approverId: 'op_synthetic_approver',
        actorType: 'Supervisor',
        requestCorrelationId: mismatch.input.correlationId
      })
      await expect(
        runtime.runDurableGoal({
          ...mismatch.input,
          envelope: {
            ...mismatch.input.envelope,
            approvalId: mismatch.approvalId
          },
          approvalDecision: 'reject'
        })
      ).rejects.toThrow(/does not match the persisted decision/)
    })

    it('resumes a durable approval continuation and ignores an undecided approval', async () => {
      const approved = await seedWaitingGoal('msg_durable_approve')
      await runtime.approvals.decideAndEnqueueContinuation({
        tenantId: TENANT,
        approvalId: approved.approvalId,
        decision: 'approve',
        approverId: 'op_synthetic_approver',
        actorType: 'Supervisor',
        requestCorrelationId: approved.input.correlationId
      })
      const approvedRun = await runtime.runDurableGoal({
        ...approved.input,
        envelope: {
          ...approved.input.envelope,
          approvalId: approved.approvalId
        },
        approvalDecision: 'approve'
      })
      expect(approvedRun.goal.status).toBe('COMPLETED')

      const undecided = await seedWaitingGoal('msg_durable_undecided')
      const undecidedRun = await runtime.runDurableGoal({
        ...undecided.input,
        envelope: {
          ...undecided.input.envelope,
          approvalId: undecided.approvalId
        },
        approvalDecision: 'approve'
      })
      expect(undecidedRun.goal.status).toBe('WAITING_APPROVAL')
      expect(await stepStatus(undecided.stepId)).toBe('WAITING_APPROVAL')
    })

    it('rejects a durable continuation whose approval does not match a waiting step', async () => {
      const waiting = await seedWaitingGoal('msg_durable_guard')
      await expect(
        runtime.runDurableGoal({
          ...waiting.input,
          envelope: {
            ...waiting.input.envelope,
            approvalId: 'appr_synthetic_missing'
          },
          approvalDecision: 'approve'
        })
      ).rejects.toThrow(/does not match a waiting plan step/)
      expect(await stepStatus(waiting.stepId)).toBe('WAITING_APPROVAL')
    })

    it('fails closed when a waiting goal has no active plan for a continuation', async () => {
      const inboundMessageId = messageId('msg_durable_no_plan')
      const correlation = correlationId()
      const conversationId = `conv_${inboundMessageId}`
      const input = goalInput({
        messageId: inboundMessageId,
        correlationId: correlation,
        conversationId
      })
      const goal = await createCanonicalGoal(input)
      await setGoalStatus(goal.id, 'WAITING_APPROVAL')

      await expect(
        runtime.runDurableGoal({
          ...input,
          envelope: {
            ...input.envelope,
            approvalId: 'appr_synthetic_missing'
          },
          approvalDecision: 'approve'
        })
      ).rejects.toThrow(/does not match a waiting plan step/)
    })

    it('completes a message.draft goal through the durable journal and reports the effect', async () => {
      const result = await runtime.runDurableGoal(
        goalInput({
          messageId: messageId('msg_draft_effect'),
          envelope: envelope({
            capability: 'message.draft',
            action: 'message.draft',
            resource: { type: 'conversation' },
            idempotencyKey: 'synthetic-draft-effect'
          })
        })
      )

      expect(result.goal.status).not.toBe('COMPLETED')
      expect(result.steps[0]?.status).toBe('SUCCEEDED')
      const journalRows = await pool.query<{ state: string }>(
        `SELECT state FROM effect_journal WHERE tenant_id = $1 AND operation_key = $2`,
        [TENANT, callerOperationKey('synthetic-draft-effect')]
      )
      expect(journalRows.rows[0]?.state).toBe('CONFIRMED')
    })

    it('replays a confirmed message.draft effect without a tool call', async () => {
      await seedJournalRecord({
        operationKey: callerOperationKey('synthetic-draft-replay'),
        proposalHash: draftProposalHash({
          type: 'conversation',
          id: 'conv_draft_replay'
        }),
        state: 'CONFIRMED',
        resultDigest: null
      })
      const before = runtime.toolInvocations.length

      const result = await runtime.runDurableGoal(
        goalInput({
          messageId: messageId('msg_draft_replay'),
          envelope: envelope({
            capability: 'message.draft',
            action: 'message.draft',
            resource: { type: 'conversation', id: 'conv_draft_replay' },
            idempotencyKey: 'synthetic-draft-replay'
          })
        })
      )

      expect(result.goal.status).not.toBe('COMPLETED')
      expect(runtime.turnResults.at(-1)).toMatchObject({
        outcome: 'executed',
        replayed: true
      })
      expect(runtime.toolInvocations).toHaveLength(before)
      const journalRows = await pool.query<{ state: string }>(
        `SELECT state FROM effect_journal WHERE tenant_id = $1 AND operation_key = $2`,
        [TENANT, callerOperationKey('synthetic-draft-replay')]
      )
      expect(journalRows.rows[0]?.state).toBe('CONFIRMED')
    })

    it('denies a message.draft goal when the caller operation is uncertain', async () => {
      const operationKey = callerOperationKey('synthetic-draft-uncertain')
      await seedJournalRecord({
        operationKey,
        proposalHash: draftProposalHash({
          type: 'conversation',
          id: 'conv_draft_uncertain'
        }),
        state: 'UNCERTAIN'
      })

      const result = await runtime.runDurableGoal(
        goalInput({
          messageId: messageId('msg_draft_uncertain'),
          envelope: envelope({
            capability: 'message.draft',
            action: 'message.draft',
            resource: { type: 'conversation', id: 'conv_draft_uncertain' },
            idempotencyKey: 'synthetic-draft-uncertain'
          })
        })
      )

      expect(result.goal.status).not.toBe('COMPLETED')
      const journalRows = await pool.query<{ state: string }>(
        `SELECT state FROM effect_journal WHERE tenant_id = $1 AND operation_key = $2`,
        [TENANT, operationKey]
      )
      expect(journalRows.rows[0]?.state).toBe('UNCERTAIN')
    })

    it('drives a denied capability to a terminal goal without evidence', async () => {
      const result = await runtime.runDurableGoal(
        goalInput({
          messageId: messageId('msg_denied_capability'),
          envelope: envelope({
            capability: 'appointment.create',
            action: 'appointment.confirm',
            resource: { type: 'appointment_draft', id: 'draft_denied' }
          })
        })
      )

      expect(result.goal.status).not.toBe('COMPLETED')
      expect(result.steps.some((step) => step.status === 'FAILED')).toBe(true)
      expect(runtime.turnResults.at(-1)?.outcome).toBe('denied')
      expect(runtime.turnResults.at(-1)?.modelResult).toBeUndefined()
    })

    it('keeps a step successful when the outbox is unavailable after the effect', async () => {
      const waiting = await seedWaitingGoal('msg_outbox_hidden')
      await runtime.approvals.decideAndEnqueueContinuation({
        tenantId: TENANT,
        approvalId: waiting.approvalId,
        decision: 'approve',
        approverId: 'op_synthetic_approver',
        actorType: 'Supervisor',
        requestCorrelationId: waiting.input.correlationId
      })
      await pool.query(
        'ALTER TABLE outbox_events RENAME TO outbox_events_hidden'
      )
      try {
        const run = await runtime.runDurableGoal({
          ...waiting.input,
          envelope: {
            ...waiting.input.envelope,
            approvalId: waiting.approvalId
          },
          approvalDecision: 'approve'
        })

        const outboxTurn = runtime.turnResults.find(
          (turn) => turn.reason === 'outbox_pending'
        )
        expect(outboxTurn).toBeDefined()
        expect(outboxTurn?.outcome).toBe('executed')
        expect(outboxTurn?.outboxPending).toBe(true)
        expect(outboxTurn?.effectConfirmed).toBeUndefined()
        expect(run.steps[0]?.status).toBe('SUCCEEDED')
      } finally {
        await pool.query(
          'ALTER TABLE outbox_events_hidden RENAME TO outbox_events'
        )
      }
    })

    it('fails closed when the durable runtime audit chain is invalid', async () => {
      const input = {
        tenantId: TENANT,
        operatorId: 'op_synthetic_kernel',
        operatorRole: 'Operator' as const,
        agentId: AGENT,
        agentVersion: 'synthetic-v1',
        agentProfile: 'secretary' as const,
        conversationId: 'conv_flush_audit',
        correlationId: correlationId(),
        capability: 'schedule.read' as const,
        action: 'schedule.read',
        resource: { type: 'appointment_draft', id: 'draft_flush_audit' },
        dataClassification: 'INTERNAL' as const,
        prompt: {
          promptId: CONTROLLED_KERNEL_PROMPT_ID,
          version: CONTROLLED_KERNEL_PROMPT_VERSION
        },
        modelProfile: 'fast' as const,
        modelMessages: {
          messages: [{ role: 'user' as const, content: 'synthetic' }]
        },
        structuredOutput: {
          schemaName: 'ControlledKernelPayload',
          schema: CONTROLLED_KERNEL_PAYLOAD_SCHEMA
        },
        traceContext: {
          traceId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1',
          spanId: '0123456789abcdef',
          correlationId: 'corr_00000000-0000-4000-8000-000000009001'
        }
      } satisfies GovernedTurnInput

      const first = await runtime.runTurn(input)
      expect(first.outcome).toBe('executed')

      await pool.query(
        `UPDATE runtime_audit_events SET payload_hash = repeat('0', 64)
        WHERE tenant_id = $1 AND event_key = (
          SELECT event_key FROM runtime_audit_events
           WHERE tenant_id = $1 ORDER BY sequence LIMIT 1
        )`,
        [TENANT]
      )

      await expect(
        runtime.runTurn({
          ...input,
          traceContext: {
            traceId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa2',
            spanId: '0123456789abcdef',
            correlationId: 'corr_00000000-0000-4000-8000-000000009002'
          }
        })
      ).rejects.toThrow(/Durable runtime audit chain verification failed at 0/)
    })
  }
)
