import { randomBytes } from 'node:crypto'
import { Client, Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { runPostgresMigrations } from '@cvg/persistence'
import { TenantIdSchema } from '@cvg/platform'
import {
  createPostgresKernelRuntime,
  KERNEL_WORKER_RUNTIME,
  parseKernelTurnEnvelope,
  type DurableKernelGoalInput
} from '../kernel-composition.ts'

const testDatabaseUrl = process.env.TEST_DATABASE_URL
const describeWithPostgres = testDatabaseUrl ? describe : describe.skip
const TENANT = TenantIdSchema.parse(
  'tenant_00000000-0000-4000-8000-0000000009a1'
)
const AGENT = 'agent_00000000-0000-4000-8000-0000000009a1'
const CORRELATION = 'corr_00000000-0000-4000-8000-0000000009a1'

describeWithPostgres('durable worker Goal orchestration', () => {
  const schema = `cvg_durable_goal_${Date.now()}_${randomBytes(2).toString('hex')}`
  let admin: Client
  let pool: Pool

  beforeAll(async () => {
    if (!testDatabaseUrl) return
    admin = new Client({ connectionString: testDatabaseUrl })
    await admin.connect()
    await runPostgresMigrations(admin, { schemaName: schema })
    pool = new Pool({
      connectionString: testDatabaseUrl,
      options: `-c search_path=${schema}`
    })
  })

  afterAll(async () => {
    if (!testDatabaseUrl) return
    await pool?.end().catch(() => undefined)
    await admin
      ?.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
      .catch(() => undefined)
    await admin?.end().catch(() => undefined)
  })

  it('creates a durable Goal and stops at WAITING_APPROVAL through the governed kernel', async () => {
    const runtime = createPostgresKernelRuntime({
      pool,
      tenantId: TENANT,
      agentId: AGENT,
      env: {
        CVG_WORKER_RUNTIME: KERNEL_WORKER_RUNTIME,
        CVG_WORKER_ID: 'durable-goal-worker'
      }
    })
    await runtime.preflight()
    const input: DurableKernelGoalInput = {
      context: {
        message: {
          id: 'msg_durable_goal_1',
          conversationId: 'conv_durable_goal_1',
          externalMessageId: 'external_durable_goal_1',
          direction: 'inbound',
          body: JSON.stringify({}),
          runtimeStatus: 'pending',
          createdAt: new Date('2026-09-15T12:00:00.000Z')
        },
        channel: 'web',
        senderRef: 'synthetic-durable-goal-sender',
        correlationId: CORRELATION,
        session: null
      },
      envelope: parseKernelTurnEnvelope(
        JSON.stringify({
          cvgTurn: {
            capability: 'appointment.modify',
            action: 'appointment.modify',
            resource: {
              type: 'appointment_draft',
              id: 'draft_durable_goal_1'
            },
            message: 'synthetic controlled approval request',
            dataClassification: 'INTERNAL',
            modelProfile: 'fast'
          }
        })
      ),
      correlationId: CORRELATION
    }

    const result = await runtime.runDurableGoal(input)
    expect(result.goal.status).toBe('WAITING_APPROVAL')
    expect(result.plan?.status).toBe('ACTIVE')
    expect(result.steps[0]).toMatchObject({
      status: 'WAITING_APPROVAL',
      approvalId: expect.any(String),
      attemptCount: 1
    })
    expect(
      await runtime.goalStore.listPlans(TENANT, result.goal.id)
    ).toHaveLength(1)
    expect(
      await runtime.goalStore.listAttempts(TENANT, result.steps[0]!.id)
    ).toHaveLength(1)
    await expect(
      runtime.runDurableGoal({
        ...input,
        envelope: { ...input.envelope, agentVersion: 'synthetic-v2' }
      })
    ).rejects.toThrow(/does not match the persisted runtime snapshot/)

    const second = await runtime.runDurableGoal({
      ...input,
      context: {
        ...input.context,
        message: {
          ...input.context.message,
          id: 'msg_durable_goal_2'
        }
      },
      envelope: {
        ...input.envelope,
        resource: {
          type: 'appointment_draft',
          id: 'draft_durable_goal_2'
        }
      }
    })
    expect(second.goal.id).not.toBe(result.goal.id)
    expect(second.goal.status).toBe('WAITING_APPROVAL')

    const restarted = createPostgresKernelRuntime({
      pool,
      tenantId: TENANT,
      agentId: AGENT,
      env: {
        CVG_WORKER_RUNTIME: KERNEL_WORKER_RUNTIME,
        CVG_WORKER_ID: 'durable-goal-worker-restarted'
      }
    })
    const resumed = await restarted.orchestrator.run(TENANT, result.goal.id)
    expect(resumed.goal.status).toBe('WAITING_APPROVAL')
    expect(resumed.executedStepIds).toEqual([])

    const approvalId = result.steps[0]!.approvalId!
    const approved = await restarted.approvals.decideAndEnqueueContinuation({
      tenantId: TENANT,
      approvalId,
      decision: 'approve',
      approverId: 'op_synthetic_approver',
      actorType: 'Supervisor',
      requestCorrelationId: CORRELATION
    })
    expect(approved.approval.status).toBe('APPROVED')
    const afterApproval = await restarted.runDurableGoal({
      ...input,
      envelope: { ...input.envelope, approvalId },
      approvalDecision: 'approve'
    })
    expect(afterApproval.goal.status).toBe('COMPLETED')
    expect(afterApproval.steps[0]?.status).toBe('SUCCEEDED')
    expect(restarted.toolInvocations).toHaveLength(1)
    expect(restarted.toolInvocations[0]?.signal).toBeInstanceOf(AbortSignal)
  })

  it('rebuilds the first plan from persisted planner context after restart', async () => {
    const runtime = createPostgresKernelRuntime({
      pool,
      tenantId: TENANT,
      agentId: AGENT,
      env: {
        CVG_WORKER_RUNTIME: KERNEL_WORKER_RUNTIME,
        CVG_WORKER_ID: 'durable-planning-worker'
      }
    })
    const messageId = 'msg_durable_planning_restart'
    const envelope = parseKernelTurnEnvelope(
      JSON.stringify({
        cvgTurn: {
          capability: 'schedule.read',
          action: 'schedule.read',
          resource: {
            type: 'appointment_draft',
            id: 'draft_durable_planning_restart'
          },
          message: 'synthetic controlled planning restart',
          dataClassification: 'INTERNAL',
          modelProfile: 'fast'
        }
      })
    )
    const goal = await runtime.goalStore.createGoal({
      tenantId: TENANT,
      inboundMessageId: messageId,
      conversationId: 'conv_durable_planning_restart',
      objective: envelope.message,
      successCriteria: [
        {
          kind: 'EVENT',
          eventType: 'schedule.read.executed',
          source: 'outbox',
          correlationId: CORRELATION
        }
      ],
      correlationId: CORRELATION,
      plannerContext: {
        messageId,
        sessionId: null,
        envelope
      },
      executionSnapshot: {
        agentVersion: envelope.agentVersion,
        promptVersion: '1.0.0',
        policyVersion: 'synthetic.controlled-kernel@1.0.0',
        modelProfile: envelope.modelProfile,
        toolVersions: { 'controlled-kernel-tool': '1.0.0' },
        runtimeMode: 'kernel',
        runtimeVersion: 'aaa21-kernel-v1'
      }
    })

    const restarted = createPostgresKernelRuntime({
      pool,
      tenantId: TENANT,
      agentId: AGENT,
      env: {
        CVG_WORKER_RUNTIME: KERNEL_WORKER_RUNTIME,
        CVG_WORKER_ID: 'durable-planning-worker-restarted'
      }
    })
    const resumed = await restarted.orchestrator.run(TENANT, goal.id)

    expect(resumed.goal.status).toBe('COMPLETED')
    expect(resumed.plan?.version).toBe(1)
    expect(resumed.steps[0]?.status).toBe('SUCCEEDED')
    expect(resumed.executedStepIds).toHaveLength(1)
  })
})
