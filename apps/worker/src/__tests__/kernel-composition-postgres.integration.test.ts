import { createHash, randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Client, Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  InMemoryEffectJournal,
  RuntimeCompositionError,
  createGovernedRuntimeComposition,
  resolveWorkflowCoordinator,
  toGovernedTurnInput,
  type GovernedRuntimeCompositionInput,
  type WorkflowPlan,
  type WorkflowStep
} from '@cvg/agent-runtime'
import { ApprovalEngine, InMemoryApprovalStore } from '@cvg/approval-engine'
import {
  DeterministicModelProvider,
  ModelGateway,
  PromptRegistry
} from '@cvg/model-gateway'
import { HashChainedAuditLedger, InMemoryTelemetry } from '@cvg/observability'
import { PolicyEngine } from '@cvg/policy-engine'
import {
  PostgresEffectJournal,
  runPostgresMigrations,
  withTenantContext
} from '@cvg/persistence'
import { canonicalizeJson } from '@cvg/shared'
import { buildServer } from '../../../api/src/server.ts'
import {
  CONTROLLED_KERNEL_POLICY_DOCUMENT,
  KERNEL_WORKER_RUNTIME,
  KernelRuntimeConfigurationError,
  PUBLISHED_AGENT_WORKER_RUNTIME,
  assertPostgresKernelPrerequisites,
  createPostgresKernelHandlers,
  createPostgresKernelRuntime,
  resolveWorkerRuntimeKind,
  type PostgresKernelRuntime
} from '../kernel-composition.ts'
import {
  createPostgresControlledHandlers,
  createPostgresControlledWorker
} from '../postgres-controlled.ts'

const testDatabaseUrl = process.env.TEST_DATABASE_URL
const TENANT = 'tenant_00000000-0000-4000-8000-000000000921'
const AGENT = 'agent_00000000-0000-4000-8000-000000000921'

interface JournalRow {
  operation_key: string
  state: string
  proposal_hash: string
  revision: number | string
}

interface OutboxRow {
  id: string
  idempotency_key: string
  status: string
  trace_id?: string | null
}

interface InboundResponse {
  data: {
    conversationId: string
    sessionId: string
    messageId: string
    correlationId?: string
    outbox: {
      id: string
      status: string
      conversationId: string
      sessionId: string
      inboundMessageId: string
    }
  }
}

function captureError(run: () => unknown): unknown {
  try {
    run()
    return undefined
  } catch (error) {
    return error
  }
}

function validCompositionInput(
  overrides: Partial<GovernedRuntimeCompositionInput> = {}
): GovernedRuntimeCompositionInput {
  return {
    policy: new PolicyEngine(),
    approvals: new ApprovalEngine({ store: new InMemoryApprovalStore() }),
    modelGateway: new ModelGateway({
      providers: [new DeterministicModelProvider()],
      profiles: {},
      prompts: new PromptRegistry()
    }),
    telemetry: new InMemoryTelemetry(),
    audit: new HashChainedAuditLedger(),
    toolExecutor: async () => ({ result: { synthetic: true } }),
    outbox: async () => ({ eventId: 'evt_synthetic' }),
    ...overrides
  }
}

function kernelOperationKey(tenantId: string, idempotencyKey: string): string {
  const canonical = canonicalizeJson({
    tenantId,
    callerIdempotencyKey: idempotencyKey
  })
  return `op:${createHash('sha256').update(canonical, 'utf8').digest('hex')}`
}

function envelopeBodyForUnitTest(): string {
  return JSON.stringify({
    cvgTurn: {
      capability: 'appointment.modify',
      action: 'appointment.modify',
      resource: { type: 'appointment_draft', id: 'draft_from_body' },
      message: 'body-intent-must-not-replace-frontier-plan'
    }
  })
}

describe('AAA-21 fail-closed coordinator and composition selection', () => {
  it('defaults to the governed kernel and rejects a frontier without adapter', () => {
    expect(resolveWorkflowCoordinator({})).toEqual({
      kind: 'governed-kernel',
      coordinator: null
    })
    expect(
      resolveWorkflowCoordinator({ WORKFLOW_COORDINATOR: 'governed-kernel' })
    ).toEqual({ kind: 'governed-kernel', coordinator: null })

    const frontierError = captureError(() =>
      resolveWorkflowCoordinator({ WORKFLOW_COORDINATOR: 'langgraph-frontier' })
    )
    expect(frontierError).toBeInstanceOf(RuntimeCompositionError)
    expect((frontierError as RuntimeCompositionError).code).toBe(
      'frontier_not_configured'
    )

    const unknownError = captureError(() =>
      resolveWorkflowCoordinator({ WORKFLOW_COORDINATOR: 'mystery-frontier' })
    )
    expect((unknownError as RuntimeCompositionError).code).toBe(
      'unknown_coordinator'
    )
  })

  it('accepts an injected frontier adapter without importing LangGraph', () => {
    const plan: WorkflowPlan = {
      planId: 'plan_synthetic',
      tenantId: TENANT,
      conversationId: 'conv_synthetic',
      correlationId: 'corr_00000000-0000-4000-8000-000000000921',
      steps: []
    }
    const adapter = { planStep: async () => plan }
    const resolved = resolveWorkflowCoordinator(
      { WORKFLOW_COORDINATOR: 'langgraph-frontier' },
      { 'langgraph-frontier': adapter }
    )
    expect(resolved.kind).toBe('langgraph-frontier')
    expect(resolved.coordinator).toBe(adapter)

    const source = readFileSync(
      resolve(process.cwd(), 'packages/agent-runtime/src/composition.ts'),
      'utf8'
    )
    expect(source).not.toMatch(/from ['"](?:langgraph|@langchain)/)
  })

  it('executes the injected frontier plan through the governed mapping', async () => {
    const plan: WorkflowPlan = {
      planId: 'plan_frontier_synthetic',
      tenantId: TENANT,
      conversationId: 'conv_frontier_synthetic',
      sessionId: 'sess_frontier_synthetic',
      correlationId: 'corr_00000000-0000-4000-8000-000000000921',
      steps: [
        {
          stepId: 'step_frontier_synthetic',
          capability: 'schedule.read',
          action: 'schedule.read',
          resource: { type: 'appointment_draft', id: 'draft_frontier' },
          dataClassification: 'INTERNAL',
          modelMessages: {
            messages: [{ role: 'user', content: 'frontier-controlled-step' }]
          }
        }
      ]
    }
    const createdAt = new Date('2026-09-13T12:00:00.000Z')
    const context = {
      message: {
        id: 'msg_frontier_synthetic',
        conversationId: plan.conversationId,
        externalMessageId: 'frontier-message',
        direction: 'inbound' as const,
        body: envelopeBodyForUnitTest(),
        runtimeStatus: 'pending' as const,
        createdAt
      },
      channel: 'web' as const,
      senderRef: 'frontier-sender',
      correlationId: plan.correlationId,
      session: {
        id: plan.sessionId,
        conversationId: plan.conversationId,
        status: 'open' as const,
        takeoverState: 'BOT_ACTIVE' as const,
        createdAt,
        updatedAt: createdAt
      }
    }
    const planStep = vi.fn().mockResolvedValue(plan)
    const runTurn = vi.fn().mockResolvedValue({
      outcome: 'denied',
      reason: 'synthetic_frontier_probe',
      traceId: 'trace_frontier_synthetic',
      correlationId: plan.correlationId,
      auditChainValid: true,
      costUsd: 0,
      durationMs: 0
    })
    const runtime = {
      tenantId: TENANT,
      agentId: AGENT,
      workflowCoordinator: {
        kind: 'langgraph-frontier' as const,
        coordinator: { planStep }
      },
      conversations: {
        findInboundRuntimeContext: vi.fn().mockResolvedValue(context),
        appendAudit: vi.fn().mockResolvedValue({}),
        markInboundRuntimeCompleted: vi.fn().mockResolvedValue(true)
      },
      runTurn
    } as unknown as PostgresKernelRuntime

    const handlers = createPostgresKernelHandlers(
      { CVG_WORKER_AGENT_ID: AGENT },
      runtime
    )
    await handlers.inboundProcess({
      id: 'outbox_frontier_synthetic',
      type: 'inbound.process',
      payload: {},
      tenantId: TENANT,
      correlationId: plan.correlationId,
      traceId: '0123456789abcdef0123456789abcdef',
      conversationId: plan.conversationId,
      sessionId: plan.sessionId,
      inboundMessageId: context.message.id,
      status: 'processing',
      createdAt
    } as never)

    expect(planStep).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT,
        conversationId: plan.conversationId,
        correlationId: plan.correlationId
      })
    )
    expect(runTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        capability: 'schedule.read',
        action: 'schedule.read',
        conversationId: plan.conversationId,
        sessionId: plan.sessionId,
        correlationId: plan.correlationId,
        modelMessages: {
          messages: [{ role: 'user', content: 'frontier-controlled-step' }]
        }
      })
    )
    expect(runtime.conversations.appendAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'integration_event',
        correlationId: plan.correlationId,
        payload: expect.objectContaining({ runtimePath: 'governed-kernel' })
      }),
      TENANT
    )
  })

  it('rejects a frontier plan that adds a session to an inbound without one', async () => {
    const correlationId = 'corr_00000000-0000-4000-8000-000000000922'
    const context = {
      message: {
        id: 'msg_frontier_session_injection',
        conversationId: 'conv_frontier_session_injection',
        externalMessageId: 'frontier-session-message',
        direction: 'inbound' as const,
        body: envelopeBodyForUnitTest(),
        runtimeStatus: 'pending' as const,
        createdAt: new Date('2026-09-13T12:00:00.000Z')
      },
      channel: 'web' as const,
      senderRef: 'frontier-session-sender',
      correlationId,
      session: null
    }
    const plan: WorkflowPlan = {
      planId: 'plan_frontier_session_injection',
      tenantId: TENANT,
      conversationId: context.message.conversationId,
      sessionId: 'session_added_by_frontier',
      correlationId,
      steps: [
        {
          stepId: 'step_frontier_session_injection',
          capability: 'schedule.read',
          action: 'schedule.read',
          resource: { type: 'appointment_draft', id: 'draft_frontier' },
          dataClassification: 'INTERNAL'
        }
      ]
    }
    const runTurn = vi.fn()
    const runtime = {
      tenantId: TENANT,
      agentId: AGENT,
      workflowCoordinator: {
        kind: 'langgraph-frontier' as const,
        coordinator: { planStep: vi.fn().mockResolvedValue(plan) }
      },
      conversations: {
        findInboundRuntimeContext: vi.fn().mockResolvedValue(context),
        appendAudit: vi.fn(),
        markInboundRuntimeCompleted: vi.fn()
      },
      runTurn
    } as unknown as PostgresKernelRuntime

    const handlers = createPostgresKernelHandlers(
      { CVG_WORKER_AGENT_ID: AGENT },
      runtime
    )
    await expect(
      handlers.inboundProcess({
        id: 'outbox_frontier_session_injection',
        type: 'inbound.process',
        payload: {},
        tenantId: TENANT,
        correlationId,
        traceId: '11111111111111111111111111111111',
        conversationId: context.message.conversationId,
        sessionId: null,
        inboundMessageId: context.message.id,
        status: 'processing',
        createdAt: context.message.createdAt
      } as never)
    ).rejects.toThrow(/session/)
    expect(runTurn).not.toHaveBeenCalled()
  })

  it('rejects an inbound event whose correlation differs from persisted context', async () => {
    const persistedCorrelationId = 'corr_00000000-0000-4000-8000-000000000923'
    const eventCorrelationId = 'corr_00000000-0000-4000-8000-000000000924'
    const context = {
      message: {
        id: 'msg_frontier_correlation_mismatch',
        conversationId: 'conv_frontier_correlation_mismatch',
        externalMessageId: 'frontier-correlation-message',
        direction: 'inbound' as const,
        body: envelopeBodyForUnitTest(),
        runtimeStatus: 'pending' as const,
        createdAt: new Date('2026-09-13T12:00:00.000Z')
      },
      channel: 'web' as const,
      senderRef: 'frontier-correlation-sender',
      correlationId: persistedCorrelationId,
      session: null
    }
    const runTurn = vi.fn()
    const runtime = {
      tenantId: TENANT,
      agentId: AGENT,
      workflowCoordinator: {
        kind: 'governed-kernel' as const,
        coordinator: null
      },
      conversations: {
        findInboundRuntimeContext: vi.fn().mockResolvedValue(context),
        appendAudit: vi.fn(),
        markInboundRuntimeCompleted: vi.fn()
      },
      runTurn
    } as unknown as PostgresKernelRuntime

    const handlers = createPostgresKernelHandlers(
      { CVG_WORKER_AGENT_ID: AGENT },
      runtime
    )
    await expect(
      handlers.inboundProcess({
        id: 'outbox_frontier_correlation_mismatch',
        type: 'inbound.process',
        payload: {},
        tenantId: TENANT,
        correlationId: eventCorrelationId,
        traceId: '22222222222222222222222222222222',
        conversationId: context.message.conversationId,
        sessionId: null,
        inboundMessageId: context.message.id,
        status: 'processing',
        createdAt: context.message.createdAt
      } as never)
    ).rejects.toThrow(/correlation/)
    expect(runTurn).not.toHaveBeenCalled()
  })

  it('rejects incomplete or non-durable runtime compositions', () => {
    const missingPort = { ...validCompositionInput() }
    delete (missingPort as { policy?: unknown }).policy
    const portError = captureError(() =>
      createGovernedRuntimeComposition(
        missingPort as GovernedRuntimeCompositionInput
      )
    )
    expect((portError as RuntimeCompositionError).code).toBe(
      'runtime_composition_invalid'
    )

    const journalError = captureError(() =>
      createGovernedRuntimeComposition(
        validCompositionInput({ requireDurable: true })
      )
    )
    expect((journalError as RuntimeCompositionError).code).toBe(
      'durable_runtime_configuration_required'
    )

    const attestationError = captureError(() =>
      createGovernedRuntimeComposition(
        validCompositionInput({
          requireDurable: true,
          effectJournal: new InMemoryEffectJournal()
        })
      )
    )
    expect((attestationError as RuntimeCompositionError).code).toBe(
      'durable_runtime_configuration_required'
    )

    const composed = createGovernedRuntimeComposition(
      validCompositionInput({
        requireDurable: true,
        durableApprovals: true,
        effectJournal: new InMemoryEffectJournal()
      })
    )
    expect(composed.requireDurable).toBe(true)
    expect(composed.runtime).toBeDefined()
  })

  it('maps workflow steps to GovernedTurnInput without inventing payloads', () => {
    const plan: WorkflowPlan = {
      planId: 'plan_synthetic',
      tenantId: TENANT,
      conversationId: 'conv_synthetic',
      sessionId: 'sess_synthetic',
      correlationId: 'corr_00000000-0000-4000-8000-000000000921',
      steps: []
    }
    const step: WorkflowStep = {
      stepId: 'step_synthetic',
      capability: 'appointment.modify',
      action: 'appointment.modify',
      resource: { type: 'appointment_draft', id: 'draft_synthetic' },
      dataClassification: 'INTERNAL',
      idempotencyKey: 'kernel-step-key-1'
    }
    const input = toGovernedTurnInput(plan, step, {
      operatorId: 'op_synthetic',
      operatorRole: 'Operator',
      agentId: AGENT,
      agentVersion: 'synthetic-v1',
      agentProfile: 'secretary',
      prompt: { promptId: 'synthetic-prompt', version: '1.0.0' },
      modelProfile: 'fast'
    })
    expect(input).toMatchObject({
      tenantId: TENANT,
      conversationId: 'conv_synthetic',
      sessionId: 'sess_synthetic',
      correlationId: plan.correlationId,
      capability: 'appointment.modify',
      action: 'appointment.modify',
      resource: { type: 'appointment_draft', id: 'draft_synthetic' },
      idempotencyKey: 'kernel-step-key-1',
      operatorId: 'op_synthetic',
      agentId: AGENT
    })
    expect(input.modelMessages.messages).toHaveLength(1)
  })

  it('exposes one synthetic controlled policy document', () => {
    expect(CONTROLLED_KERNEL_POLICY_DOCUMENT.policyId).toContain('synthetic')
    const capabilities = CONTROLLED_KERNEL_POLICY_DOCUMENT.rules.flatMap(
      (rule) => rule.capabilities ?? []
    )
    expect(capabilities).toEqual(
      expect.arrayContaining(['schedule.read', 'appointment.modify'])
    )
    expect(
      CONTROLLED_KERNEL_POLICY_DOCUMENT.rules.some(
        (rule) =>
          rule.effect === 'REQUIRE_APPROVAL' &&
          rule.capabilities?.includes('appointment.modify') === true &&
          rule.resourceTypes?.includes('appointment_draft') === true
      )
    ).toBe(true)
  })

  it('fails closed when the kernel runtime kind or selection prerequisites are missing', () => {
    expect(resolveWorkerRuntimeKind({})).toBe(KERNEL_WORKER_RUNTIME)
    expect(
      resolveWorkerRuntimeKind({
        CVG_WORKER_RUNTIME: PUBLISHED_AGENT_WORKER_RUNTIME
      })
    ).toBe(PUBLISHED_AGENT_WORKER_RUNTIME)
    expect(
      resolveWorkerRuntimeKind({ CVG_WORKER_RUNTIME: KERNEL_WORKER_RUNTIME })
    ).toBe('kernel')
    const unknownRuntime = captureError(() =>
      resolveWorkerRuntimeKind({ CVG_WORKER_RUNTIME: 'mystery' })
    )
    expect((unknownRuntime as KernelRuntimeConfigurationError).code).toBe(
      'unknown_worker_runtime'
    )

    const coordinatorError = captureError(() =>
      createPostgresControlledHandlers(
        {
          WORKFLOW_COORDINATOR: 'langgraph-frontier',
          CVG_WORKER_RUNTIME: KERNEL_WORKER_RUNTIME,
          CVG_WORKER_TENANT_ID: TENANT,
          CVG_WORKER_AGENT_ID: AGENT
        },
        {} as never,
        {} as never
      )
    )
    expect((coordinatorError as RuntimeCompositionError).code).toBe(
      'frontier_not_configured'
    )

    const poolError = captureError(() =>
      createPostgresControlledHandlers(
        {
          CVG_WORKER_RUNTIME: KERNEL_WORKER_RUNTIME,
          CVG_WORKER_TENANT_ID: TENANT,
          CVG_WORKER_AGENT_ID: AGENT
        },
        {} as never,
        {} as never
      )
    )
    expect((poolError as KernelRuntimeConfigurationError).code).toBe(
      'kernel_runtime_prerequisites_missing'
    )

    const agentError = captureError(() =>
      createPostgresControlledHandlers(
        {
          CVG_WORKER_RUNTIME: KERNEL_WORKER_RUNTIME,
          CVG_WORKER_TENANT_ID: TENANT
        },
        {} as never,
        {} as never,
        {
          pool: {
            connect: async () => {
              throw new Error('unused synthetic pool')
            }
          }
        }
      )
    )
    expect((agentError as KernelRuntimeConfigurationError).code).toBe(
      'kernel_runtime_prerequisites_missing'
    )
  })
})

describe('AAA-21 composed kernel path over API → outbox → worker (PostgreSQL)', () => {
  const itWithPostgres = testDatabaseUrl ? it : it.skip
  let schemaName: string
  let migrationClient: Client
  let apiPool: Pool
  let kernelPool1: Pool
  let kernelPool2: Pool
  let app: Awaited<ReturnType<typeof buildServer>> | undefined
  let kernelRuntime1: PostgresKernelRuntime
  let kernelRuntime2: PostgresKernelRuntime
  let worker1: ReturnType<typeof createPostgresControlledWorker> | undefined
  let worker2: ReturnType<typeof createPostgresControlledWorker> | undefined
  let durableWorker:
    | ReturnType<typeof createPostgresControlledWorker>
    | undefined

  function kernelEnv(
    workerId: string,
    durableOrchestrator = false
  ): NodeJS.ProcessEnv {
    return {
      DATABASE_URL: testDatabaseUrl as string,
      POSTGRES_SCHEMA: schemaName,
      POSTGRES_RLS_ENFORCEMENT: 'true',
      CVG_WORKER_CONTROLLED_MODE: 'true',
      CVG_WORKER_TENANT_ID: TENANT,
      CVG_WORKER_AGENT_ID: AGENT,
      CVG_WORKER_RUNTIME: KERNEL_WORKER_RUNTIME,
      CVG_WORKER_ID: workerId,
      ...(durableOrchestrator
        ? { CVG_DURABLE_KERNEL_ORCHESTRATOR: 'true' }
        : {})
    }
  }

  function envelopeBody(overrides: Record<string, unknown> = {}): string {
    return JSON.stringify({
      cvgTurn: {
        capability: 'appointment.modify',
        action: 'appointment.modify',
        resource: { type: 'appointment_draft', id: 'draft_synthetic_alpha' },
        dataClassification: 'INTERNAL',
        operatorId: 'op_synthetic_kernel',
        operatorRole: 'Operator',
        agentVersion: 'synthetic-v1',
        agentProfile: 'secretary',
        modelProfile: 'fast',
        message: 'synthetic controlled appointment draft update',
        idempotencyKey: 'kernel-op-alpha',
        ...overrides
      }
    })
  }

  async function injectInbound(input: {
    externalMessageId: string
    body: string
    conversationId?: string
    sessionId?: string
  }): Promise<InboundResponse> {
    const response = await app!.inject({
      method: 'POST',
      url: '/v1/webhooks/channels/web/messages',
      payload: {
        senderRef: 'synthetic-kernel-sender',
        externalMessageId: input.externalMessageId,
        body: input.body,
        receivedAt: '2026-09-13T12:00:00.000Z',
        ...(input.conversationId !== undefined
          ? { conversationId: input.conversationId }
          : {}),
        ...(input.sessionId !== undefined ? { sessionId: input.sessionId } : {})
      }
    })
    expect(response.statusCode).toBe(200)
    return response.json<InboundResponse>()
  }

  async function queryRows<T>(
    pool: Pool,
    sql: string,
    values: unknown[]
  ): Promise<T[]> {
    return withTenantContext(pool, TENANT, async (client) => {
      const result = await client.query<T & Record<string, unknown>>(
        sql,
        values
      )
      return result.rows as T[]
    })
  }

  async function seedUncertainJournal(
    pool: Pool,
    operationKey: string,
    proposalHash: string
  ): Promise<void> {
    await withTenantContext(pool, TENANT, async (client) => {
      const journal = new PostgresEffectJournal(client)
      const attemptId = 'att_synthetic_uncertain'
      const reserved = await journal.reserve({
        tenantId: TENANT,
        operationKey,
        proposalHash,
        attemptId,
        expiresAt: new Date(Date.now() + 60_000).toISOString()
      })
      if (reserved.outcome !== 'reserved') {
        throw new Error(`synthetic journal seed failed: ${reserved.outcome}`)
      }
      await journal.markEffectStarted({
        tenantId: TENANT,
        operationKey,
        attemptId
      })
      await journal.markUncertain({
        tenantId: TENANT,
        operationKey,
        attemptId,
        reason: 'synthetic crash after effect start'
      })
    })
  }

  beforeAll(async () => {
    const databaseUrl = testDatabaseUrl as string
    schemaName = `cvg_kernel_${Date.now()}_${randomBytes(3).toString('hex')}`
    migrationClient = new Client({ connectionString: databaseUrl })
    await migrationClient.connect()
    await runPostgresMigrations(migrationClient, { schemaName })
    const poolOptions = {
      connectionString: databaseUrl,
      options: `-c search_path=${schemaName}`
    }
    apiPool = new Pool(poolOptions)
    kernelPool1 = new Pool(poolOptions)
    kernelPool2 = new Pool(poolOptions)
    app = buildServer({
      persistence: { kind: 'postgres-pool', pool: apiPool },
      durableInbound: true,
      inboundTenantResolver: () => TENANT
    })
    const env = kernelEnv('worker-kernel-composed')
    kernelRuntime1 = createPostgresKernelRuntime({
      pool: kernelPool1,
      tenantId: TENANT,
      env,
      agentId: AGENT
    })
    kernelRuntime2 = createPostgresKernelRuntime({
      pool: kernelPool2,
      tenantId: TENANT,
      env,
      agentId: AGENT
    })
    worker1 = createPostgresControlledWorker(
      kernelEnv('worker-kernel-1'),
      createPostgresKernelHandlers(env, kernelRuntime1)
    )
    worker2 = createPostgresControlledWorker(
      kernelEnv('worker-kernel-2'),
      createPostgresKernelHandlers(env, kernelRuntime2)
    )
    const durableEnv = kernelEnv('worker-kernel-durable', true)
    durableWorker = createPostgresControlledWorker(
      durableEnv,
      createPostgresKernelHandlers(durableEnv, kernelRuntime1)
    )
    await kernelRuntime1.preflight()
    await kernelRuntime2.preflight()
  })

  afterAll(async () => {
    await app?.close()
    await worker1?.pool.end()
    await worker2?.pool.end()
    await durableWorker?.pool.end()
    await kernelPool1?.end()
    await kernelPool2?.end()
    await apiPool?.end()
    await migrationClient
      .query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`)
      .catch(() => undefined)
    await migrationClient.end()
  })

  itWithPostgres(
    'runs the approved draft write once and replays without a second effect',
    async () => {
      const first = await injectInbound({
        externalMessageId: 'kernel-msg-1',
        body: envelopeBody()
      })
      expect(first.data.outbox.status).toBe('pending')
      expect(first.data.correlationId).toMatch(/^corr_/)
      const inboundOutboxRows = await queryRows<Pick<OutboxRow, 'trace_id'>>(
        kernelPool1,
        'SELECT trace_id FROM outbox_events WHERE tenant_id = $1 AND id = $2',
        [TENANT, first.data.outbox.id]
      )
      expect(inboundOutboxRows[0]?.trace_id).toMatch(/^[0-9a-f]{32}$/)

      const processedFirst = await worker1!.worker.processNext(
        first.data.outbox.id
      )
      expect(processedFirst).toMatchObject({
        id: first.data.outbox.id,
        type: 'inbound.process',
        status: 'processed'
      })
      expect(kernelRuntime1.toolInvocations).toHaveLength(0)

      const requested = await kernelRuntime1.approvals.list(TENANT, 'REQUESTED')
      expect(requested).toHaveLength(1)
      const approval = requested[0]!
      expect(approval.correlationId).toBe(first.data.correlationId)
      expect(approval.proposalHash).toMatch(/^[0-9a-f]{64}$/)

      const journalBefore = await queryRows<JournalRow>(
        kernelPool1,
        'SELECT operation_key, state, proposal_hash, revision FROM effect_journal WHERE tenant_id = $1',
        [TENANT]
      )
      expect(journalBefore).toHaveLength(0)

      const contextAfterFirst =
        await worker1!.adapter.findInboundRuntimeContext(
          TENANT,
          first.data.outbox.conversationId,
          first.data.outbox.sessionId,
          first.data.outbox.inboundMessageId
        )
      expect(contextAfterFirst?.message.runtimeStatus).toBe('waiting_approval')
      expect(contextAfterFirst?.message.runtimeApprovalId).toBe(
        approval.approvalId
      )

      const approvalDecision = await app!.inject({
        method: 'POST',
        url: `/v1/runtime-approvals/${approval.approvalId}/decision`,
        headers: {
          'x-operator-id': 'op_synthetic_approver',
          'x-operator-role': 'Supervisor',
          'x-tenant-id': TENANT
        },
        payload: { decision: 'approve', reason: 'synthetic integration review' }
      })
      expect(approvalDecision.statusCode).toBe(200)
      expect(approvalDecision.json().data.approval.status).toBe('APPROVED')
      expect(approvalDecision.json().data.continuationEventId).toBeTruthy()

      const approvalAuditRows = await queryRows<{
        correlation_id: string
        payload: Record<string, unknown>
      }>(
        kernelPool1,
        `SELECT correlation_id, payload
           FROM audit_events
          WHERE tenant_id = $1 AND type = 'approval_decision'
            AND payload->>'approvalId' = $2
          ORDER BY created_at DESC
          LIMIT 1`,
        [TENANT, approval.approvalId]
      )
      expect(approvalAuditRows[0]?.correlation_id).toBe(
        first.data.correlationId
      )

      const continuationEventId =
        approvalDecision.json().data.continuationEventId
      const processedSecond =
        await worker1!.worker.processNext(continuationEventId)
      expect(processedSecond).toMatchObject({ status: 'processed' })
      const executionTurn = kernelRuntime1.turnResults.at(-1)
      const executionTraceId = executionTurn?.traceId

      expect(kernelRuntime1.toolInvocations).toHaveLength(1)
      const invocation = kernelRuntime1.toolInvocations[0]!
      expect(invocation.capability).toBe('appointment.modify')
      expect(invocation.action).toBe('appointment.modify')
      expect(invocation.payload).toEqual({
        text: 'SYNTHETIC_CONTROLLED_KERNEL_PAYLOAD'
      })
      expect(invocation.correlationId).toBe(first.data.correlationId)
      expect(invocation.traceId).toBe(inboundOutboxRows[0]?.trace_id)
      expect(executionTraceId).toBe(inboundOutboxRows[0]?.trace_id)

      const journalRows = await queryRows<JournalRow>(
        kernelPool1,
        'SELECT operation_key, state, proposal_hash, revision FROM effect_journal WHERE tenant_id = $1',
        [TENANT]
      )
      expect(journalRows).toHaveLength(1)
      const journalRow = journalRows[0]!
      expect(journalRow.state).toBe('CONFIRMED')
      expect(journalRow.proposal_hash).toBe(approval.proposalHash)
      expect(journalRow.operation_key).toBe(
        kernelOperationKey(TENANT, 'kernel-op-alpha')
      )

      const executed = await kernelRuntime1.approvals.get(
        TENANT,
        approval.approvalId
      )
      expect(executed.status).toBe('EXECUTED')

      expect(executionTurn).toMatchObject({
        outcome: 'executed',
        correlationId: first.data.correlationId,
        auditChainValid: true
      })
      expect(executionTraceId).toMatch(/^[0-9a-f]{16,}$/)
      expect(kernelRuntime1.audit.verify()).toEqual({ valid: true })
      const auditRecords = kernelRuntime1.audit.records()
      expect(auditRecords.length).toBeGreaterThan(0)
      expect(
        auditRecords.some((record) =>
          record.eventId.startsWith(`evt_${executionTraceId}_`)
        )
      ).toBe(true)
      expect(
        auditRecords.every(
          (record) => record.correlationId === first.data.correlationId
        )
      ).toBe(true)

      const durableAuditRows = await queryRows<{
        type: string
        correlation_id: string
        payload: Record<string, unknown>
      }>(
        kernelPool1,
        `SELECT type, correlation_id, payload
           FROM audit_events
          WHERE tenant_id = $1 AND payload->>'runtimePath' = $2
          ORDER BY created_at ASC`,
        [TENANT, 'governed-kernel']
      )
      expect(durableAuditRows.length).toBeGreaterThanOrEqual(2)
      expect(
        durableAuditRows.some(
          (row) =>
            row.type === 'integration_event' &&
            row.payload.traceId === executionTraceId
        )
      ).toBe(true)
      expect(
        durableAuditRows.every(
          (row) => row.correlation_id === first.data.correlationId
        )
      ).toBe(true)

      const outboundRows = await queryRows<OutboxRow>(
        kernelPool1,
        "SELECT id, idempotency_key, status, trace_id FROM outbox_events WHERE tenant_id = $1 AND type = 'message.outbound'",
        [TENANT]
      )
      expect(outboundRows).toHaveLength(1)
      expect(outboundRows[0]!.idempotency_key).toBe(
        `kernel-outbox:${journalRow.operation_key}`
      )
      expect(outboundRows[0]!.status).toBe('pending')

      const third = await injectInbound({
        externalMessageId: 'kernel-msg-3',
        body: envelopeBody({ approvalId: approval.approvalId }),
        conversationId: first.data.outbox.conversationId,
        sessionId: first.data.outbox.sessionId
      })
      const processedThird = await worker2!.worker.processNext(
        third.data.outbox.id
      )
      expect(processedThird).toMatchObject({ status: 'processed' })
      expect(kernelRuntime2.toolInvocations).toHaveLength(0)
      const replayTurn = kernelRuntime2.turnResults.at(-1)
      expect(replayTurn).toMatchObject({
        outcome: 'executed',
        reason: 'idempotent_replay',
        replayed: true,
        correlationId: first.data.correlationId
      })

      const journalAfterReplay = await queryRows<JournalRow>(
        kernelPool2,
        'SELECT operation_key, state, revision FROM effect_journal WHERE tenant_id = $1',
        [TENANT]
      )
      expect(journalAfterReplay).toHaveLength(1)
      expect(journalAfterReplay[0]!.state).toBe('CONFIRMED')
      expect(Number(journalAfterReplay[0]!.revision)).toBe(
        Number(journalRow.revision)
      )
      const outboundAfterReplay = await queryRows<OutboxRow>(
        kernelPool2,
        "SELECT id, idempotency_key FROM outbox_events WHERE tenant_id = $1 AND type = 'message.outbound'",
        [TENANT]
      )
      expect(outboundAfterReplay).toHaveLength(1)
      expect(kernelRuntime2.audit.verify()).toEqual({ valid: true })
      const durableAuditAfterReplay = await queryRows<{
        payload: Record<string, unknown>
      }>(
        kernelPool2,
        `SELECT payload
           FROM audit_events
          WHERE tenant_id = $1 AND payload->>'runtimePath' = $2`,
        [TENANT, 'governed-kernel']
      )
      expect(durableAuditAfterReplay.length).toBeGreaterThanOrEqual(3)
    }
  )

  itWithPostgres('never auto-retries an UNCERTAIN journal state', async () => {
    const fourth = await injectInbound({
      externalMessageId: 'kernel-msg-4',
      body: envelopeBody({ idempotencyKey: 'kernel-op-uncertain' })
    })
    const processedFourth = await worker2!.worker.processNext(
      fourth.data.outbox.id
    )
    expect(processedFourth).toMatchObject({ status: 'processed' })
    const requested = await kernelRuntime2.approvals.list(TENANT, 'REQUESTED')
    expect(requested).toHaveLength(1)
    const approval = requested[0]!
    expect(approval.proposalHash).toMatch(/^[0-9a-f]{64}$/)

    const operationKey = kernelOperationKey(TENANT, 'kernel-op-uncertain')
    await seedUncertainJournal(
      kernelPool2,
      operationKey,
      approval.proposalHash as string
    )
    await kernelRuntime2.approvals.submit(
      TENANT,
      approval.approvalId,
      'op_synthetic_kernel'
    )
    await kernelRuntime2.approvals.approve(TENANT, approval.approvalId, {
      approverId: 'op_synthetic_approver'
    })

    const toolCountBefore = kernelRuntime2.toolInvocations.length
    const fifth = await injectInbound({
      externalMessageId: 'kernel-msg-5',
      body: envelopeBody({
        idempotencyKey: 'kernel-op-uncertain',
        approvalId: approval.approvalId
      }),
      conversationId: fourth.data.outbox.conversationId,
      sessionId: fourth.data.outbox.sessionId
    })
    const processedFifth = await worker2!.worker.processNext(
      fifth.data.outbox.id
    )
    expect(processedFifth).toMatchObject({ status: 'processed' })
    expect(kernelRuntime2.toolInvocations).toHaveLength(toolCountBefore)
    expect(kernelRuntime2.turnResults.at(-1)).toMatchObject({
      outcome: 'denied',
      reason: 'operation_uncertain'
    })
    const journalUncertain = await queryRows<JournalRow>(
      kernelPool2,
      'SELECT operation_key, state, revision FROM effect_journal WHERE tenant_id = $1 AND operation_key = $2',
      [TENANT, operationKey]
    )
    expect(journalUncertain).toHaveLength(1)
    expect(journalUncertain[0]!.state).toBe('UNCERTAIN')
    expect(
      (await kernelRuntime2.approvals.get(TENANT, approval.approvalId)).status
    ).toBe('UNCERTAIN')

    const sixth = await injectInbound({
      externalMessageId: 'kernel-msg-6',
      body: envelopeBody({
        idempotencyKey: 'kernel-op-uncertain',
        approvalId: approval.approvalId
      }),
      conversationId: fourth.data.outbox.conversationId,
      sessionId: fourth.data.outbox.sessionId
    })
    const processedSixth = await worker2!.worker.processNext(
      sixth.data.outbox.id
    )
    expect(processedSixth).toMatchObject({ status: 'processed' })
    expect(kernelRuntime2.toolInvocations).toHaveLength(toolCountBefore)
    expect(kernelRuntime2.turnResults.at(-1)).toMatchObject({
      outcome: 'denied',
      reason: 'operation_uncertain'
    })
    const journalAfter = await queryRows<JournalRow>(
      kernelPool2,
      'SELECT operation_key, state, revision FROM effect_journal WHERE tenant_id = $1 AND operation_key = $2',
      [TENANT, operationKey]
    )
    expect(journalAfter[0]!.state).toBe('UNCERTAIN')
    expect(Number(journalAfter[0]!.revision)).toBe(
      Number(journalUncertain[0]!.revision)
    )
  })

  itWithPostgres(
    'routes the API outbox through the opt-in durable orchestrator and resumes the same Goal after approval',
    async () => {
      const beforeToolCount = kernelRuntime1.toolInvocations.length
      const inbound = await injectInbound({
        externalMessageId: 'kernel-msg-durable-orchestrator',
        body: envelopeBody({ idempotencyKey: 'kernel-op-durable-orchestrator' })
      })

      const processed = await durableWorker!.worker.processNext(
        inbound.data.outbox.id
      )
      expect(processed).toMatchObject({
        type: 'inbound.process',
        status: 'processed'
      })

      const waitingContext =
        await durableWorker!.adapter.findInboundRuntimeContext(
          TENANT,
          inbound.data.outbox.conversationId,
          inbound.data.outbox.sessionId,
          inbound.data.outbox.inboundMessageId
        )
      expect(waitingContext?.message.runtimeStatus).toBe('waiting_approval')

      const waitingGoal =
        await kernelRuntime1.goalStore.getGoalByInboundMessage(
          TENANT,
          inbound.data.outbox.inboundMessageId
        )
      expect(waitingGoal).toMatchObject({
        inboundMessageId: inbound.data.outbox.inboundMessageId,
        status: 'WAITING_APPROVAL'
      })

      const approval = (
        await kernelRuntime1.approvals.list(TENANT, 'REQUESTED')
      ).find(
        (candidate) => candidate.correlationId === inbound.data.correlationId
      )
      expect(approval).toBeDefined()

      const decision = await app!.inject({
        method: 'POST',
        url: `/v1/runtime-approvals/${approval!.approvalId}/decision`,
        headers: {
          'x-operator-id': 'op_synthetic_durable_approver',
          'x-operator-role': 'Supervisor',
          'x-tenant-id': TENANT
        },
        payload: {
          decision: 'approve',
          reason: 'synthetic durable integration review'
        }
      })
      expect(decision.statusCode).toBe(200)
      const continuationEventId = decision.json().data.continuationEventId
      expect(continuationEventId).toBeTruthy()

      const resumed =
        await durableWorker!.worker.processNext(continuationEventId)
      expect(resumed).toMatchObject({
        type: 'inbound.process',
        status: 'processed'
      })

      const completedContext =
        await durableWorker!.adapter.findInboundRuntimeContext(
          TENANT,
          inbound.data.outbox.conversationId,
          inbound.data.outbox.sessionId,
          inbound.data.outbox.inboundMessageId
        )
      expect(completedContext?.message.runtimeStatus).toBe('completed')

      const completedGoal =
        await kernelRuntime1.goalStore.getGoalByInboundMessage(
          TENANT,
          inbound.data.outbox.inboundMessageId
        )
      expect(completedGoal?.status).toBe('COMPLETED')
      expect(kernelRuntime1.toolInvocations).toHaveLength(beforeToolCount + 1)
    }
  )

  itWithPostgres(
    'composes kernel handlers when the runtime kind is selected',
    async () => {
      const selected = createPostgresControlledWorker(
        kernelEnv('worker-kernel-selected')
      )
      try {
        expect(selected.worker).toBeDefined()
      } finally {
        await selected.pool.end()
      }
    }
  )

  itWithPostgres(
    'fails closed when durable kernel tables are missing',
    async () => {
      const emptySchema = `cvg_kernel_empty_${Date.now()}_${randomBytes(3).toString('hex')}`
      await migrationClient.query(`CREATE SCHEMA ${emptySchema}`)
      const emptyPool = new Pool({
        connectionString: testDatabaseUrl as string,
        options: `-c search_path=${emptySchema}`
      })
      try {
        await expect(
          assertPostgresKernelPrerequisites(emptyPool, TENANT)
        ).rejects.toMatchObject({
          code: 'kernel_runtime_prerequisites_missing'
        })
      } finally {
        await emptyPool.end()
        await migrationClient.query(
          `DROP SCHEMA IF EXISTS ${emptySchema} CASCADE`
        )
      }
    }
  )
})
