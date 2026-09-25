import { randomBytes } from 'node:crypto'
import { Client, Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  OUTBOX_MAX_ATTEMPTS,
  runPostgresMigrations,
  withTenantContext
} from '@cvg/persistence'
import { OrchestrationError } from '@cvg/agent-runtime'
import { TenantIdSchema } from '@cvg/platform'
import {
  createPostgresKernelRuntime,
  KERNEL_WORKER_RUNTIME,
  parseKernelTurnEnvelope,
  type DurableKernelGoalInput
} from '../kernel-composition.ts'
import { processOutboxEvent } from '../jobs/process-outbox-event.ts'

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

  function durableReadInput(messageId: string): DurableKernelGoalInput {
    return {
      context: {
        message: {
          id: messageId,
          conversationId: `${messageId}_conversation`,
          externalMessageId: `${messageId}_external`,
          direction: 'inbound',
          body: JSON.stringify({}),
          runtimeStatus: 'pending',
          createdAt: new Date('2026-09-15T12:00:00.000Z')
        },
        channel: 'web',
        senderRef: 'synthetic-aud20-sender',
        correlationId: CORRELATION,
        session: null
      },
      envelope: parseKernelTurnEnvelope(
        JSON.stringify({
          cvgTurn: {
            capability: 'schedule.read',
            action: 'schedule.read',
            resource: {
              type: 'appointment_draft',
              id: `${messageId}_resource`
            },
            message: 'synthetic AUD20 concurrent durable read',
            dataClassification: 'INTERNAL',
            modelProfile: 'fast',
            idempotencyKey: `${messageId}_operation`
          }
        })
      ),
      correlationId: CORRELATION
    }
  }

  async function queryRows<T>(text: string, values: unknown[] = []) {
    return withTenantContext(pool, TENANT, async (client) => {
      const result = await client.query<T & Record<string, unknown>>(
        text,
        values
      )
      return result.rows
    })
  }

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
    ).rejects.toMatchObject({ code: 'conflict' })

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

  it('acknowledges a fenced durable-goal loser instead of retrying it', async () => {
    const runtime = createPostgresKernelRuntime({
      pool,
      tenantId: TENANT,
      agentId: AGENT,
      env: {
        CVG_WORKER_RUNTIME: KERNEL_WORKER_RUNTIME,
        CVG_WORKER_ID: 'aud20-fenced-loser-worker'
      }
    })
    const input = durableReadInput('msg_aud20_fenced_loser')
    await runtime.goalStore.getOrCreateGoal({
      tenantId: TENANT,
      inboundMessageId: input.context.message.id,
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
        sessionId: null,
        envelope: input.envelope
      },
      executionSnapshot: {
        agentVersion: input.envelope.agentVersion,
        promptVersion: '1.0.0',
        policyVersion: 'synthetic.controlled-kernel@1.0.0',
        modelProfile: input.envelope.modelProfile,
        toolVersions: { 'controlled-kernel-tool': '1.0.0' },
        runtimeMode: 'kernel',
        runtimeVersion: 'aaa21-kernel-v1'
      }
    })
    const originalRun = runtime.orchestrator.run
    runtime.orchestrator.run = async () => {
      throw new OrchestrationError(
        'conflict',
        'synthetic concurrent winner advanced the canonical Goal'
      )
    }
    try {
      const event = await runtime.conversations.enqueue({
        tenantId: TENANT,
        type: 'message.outbound',
        payload: { fixture: 'aud20-fenced-loser' },
        idempotencyKey: 'aud20-fenced-loser-event',
        correlationId: input.correlationId
      })
      const processed = await processOutboxEvent({
        tenantId: TENANT,
        workerId: 'aud20-fenced-loser-worker',
        adapter: runtime.conversations,
        eventId: event.id,
        effect: () => runtime.runDurableGoal(input)
      })
      expect(processed).toMatchObject({ status: 'processed', attempts: 1 })
      expect(
        await queryRows<{ count: number }>(
          `SELECT count(*)::int AS count
             FROM outbox_events
            WHERE tenant_id = $1 AND status = 'dead_letter'`,
          [TENANT]
        )
      ).toEqual([{ count: 0 }])
    } finally {
      runtime.orchestrator.run = originalRun
    }
  })

  it('converges two concurrent outbox journeys on one Goal and one effect', async () => {
    const runtimeA = createPostgresKernelRuntime({
      pool,
      tenantId: TENANT,
      agentId: AGENT,
      env: {
        CVG_WORKER_RUNTIME: KERNEL_WORKER_RUNTIME,
        CVG_WORKER_ID: 'aud20-concurrent-worker-a'
      }
    })
    const runtimeB = createPostgresKernelRuntime({
      pool,
      tenantId: TENANT,
      agentId: AGENT,
      env: {
        CVG_WORKER_RUNTIME: KERNEL_WORKER_RUNTIME,
        CVG_WORKER_ID: 'aud20-concurrent-worker-b'
      }
    })
    await Promise.all([runtimeA.preflight(), runtimeB.preflight()])
    const input = durableReadInput('msg_aud20_concurrent_outbox')
    const [eventA, eventB] = await Promise.all([
      runtimeA.conversations.enqueue({
        tenantId: TENANT,
        type: 'message.outbound',
        payload: { fixture: 'aud20-concurrent-a' },
        idempotencyKey: 'aud20-concurrent-outbox-a',
        correlationId: input.correlationId
      }),
      runtimeB.conversations.enqueue({
        tenantId: TENANT,
        type: 'message.outbound',
        payload: { fixture: 'aud20-concurrent-b' },
        idempotencyKey: 'aud20-concurrent-outbox-b',
        correlationId: input.correlationId
      })
    ])

    const [processedA, processedB] = await Promise.all([
      processOutboxEvent({
        tenantId: TENANT,
        workerId: 'aud20-concurrent-worker-a',
        adapter: runtimeA.conversations,
        eventId: eventA.id,
        effect: () => runtimeA.runDurableGoal(input)
      }),
      processOutboxEvent({
        tenantId: TENANT,
        workerId: 'aud20-concurrent-worker-b',
        adapter: runtimeB.conversations,
        eventId: eventB.id,
        effect: () => runtimeB.runDurableGoal(input)
      })
    ])
    expect(processedA).toMatchObject({ status: 'processed', attempts: 1 })
    expect(processedB).toMatchObject({ status: 'processed', attempts: 1 })

    const goal = await runtimeA.goalStore.getGoalByInboundMessage(
      TENANT,
      input.context.message.id
    )
    expect(goal?.status).toBe('COMPLETED')
    const plans = await runtimeA.goalStore.listPlans(TENANT, goal!.id)
    const steps = await runtimeA.goalStore.listSteps(TENANT, plans[0]!.id)
    const attempts = await runtimeA.goalStore.listAttempts(TENANT, steps[0]!.id)
    expect(plans).toHaveLength(1)
    expect(steps).toHaveLength(1)
    expect(attempts).toHaveLength(1)
    expect(
      runtimeA.toolInvocations.length + runtimeB.toolInvocations.length
    ).toBe(1)

    expect(
      await queryRows<{ status: string; attempts: number }>(
        `SELECT status, attempts
           FROM outbox_events
          WHERE tenant_id = $1 AND id = ANY($2::text[])
          ORDER BY id`,
        [TENANT, [eventA.id, eventB.id]]
      )
    ).toEqual([
      { status: 'processed', attempts: 1 },
      { status: 'processed', attempts: 1 }
    ])
    expect(
      await queryRows<{ count: number }>(
        `SELECT count(*)::int AS count
           FROM outbox_events
          WHERE tenant_id = $1 AND status = 'dead_letter'`,
        [TENANT]
      )
    ).toEqual([{ count: 0 }])
  })

  it('redelivers after a crash following Goal creation and never duplicates the effect', async () => {
    const runtime = createPostgresKernelRuntime({
      pool,
      tenantId: TENANT,
      agentId: AGENT,
      env: {
        CVG_WORKER_RUNTIME: KERNEL_WORKER_RUNTIME,
        CVG_WORKER_ID: 'aud20-crash-redelivery-worker'
      }
    })
    const input = durableReadInput('msg_aud20_crash_redelivery')
    let effectCalls = 0
    const event = await runtime.conversations.enqueue({
      tenantId: TENANT,
      type: 'message.outbound',
      payload: { fixture: 'aud20-crash-redelivery' },
      idempotencyKey: 'aud20-crash-redelivery-event',
      correlationId: input.correlationId
    })

    const first = await processOutboxEvent({
      tenantId: TENANT,
      workerId: 'aud20-crash-redelivery-worker',
      adapter: runtime.conversations,
      eventId: event.id,
      effect: async () => {
        effectCalls += 1
        if (effectCalls === 1) {
          await runtime.goalStore.getOrCreateGoal({
            tenantId: TENANT,
            inboundMessageId: input.context.message.id,
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
              sessionId: null,
              envelope: input.envelope
            },
            executionSnapshot: {
              agentVersion: input.envelope.agentVersion,
              promptVersion: '1.0.0',
              policyVersion: 'synthetic.controlled-kernel@1.0.0',
              modelProfile: input.envelope.modelProfile,
              toolVersions: { 'controlled-kernel-tool': '1.0.0' },
              runtimeMode: 'kernel',
              runtimeVersion: 'aaa21-kernel-v1'
            }
          })
          throw new Error('synthetic crash after Goal creation')
        }
        return runtime.runDurableGoal(input)
      }
    })
    expect(first).toMatchObject({ status: 'failed', attempts: 1 })

    await withTenantContext(pool, TENANT, async (client) => {
      await client.query(
        'UPDATE outbox_events SET available_at = now() WHERE tenant_id = $1 AND id = $2',
        [TENANT, event.id]
      )
    })
    const redelivered = await processOutboxEvent({
      tenantId: TENANT,
      workerId: 'aud20-crash-redelivery-worker',
      adapter: runtime.conversations,
      eventId: event.id,
      effect: async () => {
        effectCalls += 1
        return runtime.runDurableGoal(input)
      }
    })
    expect(redelivered).toMatchObject({ status: 'processed', attempts: 2 })
    expect(effectCalls).toBe(2)

    const goal = await runtime.goalStore.getGoalByInboundMessage(
      TENANT,
      input.context.message.id
    )
    expect(goal).not.toBeNull()
    const plans = await runtime.goalStore.listPlans(TENANT, goal!.id)
    const steps = await runtime.goalStore.listSteps(TENANT, plans[0]!.id)
    expect(plans).toHaveLength(1)
    expect(steps).toHaveLength(1)
    expect(
      await runtime.goalStore.listAttempts(TENANT, steps[0]!.id)
    ).toHaveLength(1)
    expect(runtime.toolInvocations).toHaveLength(1)
    expect(
      await queryRows<{ count: number }>(
        `SELECT count(*)::int AS count
           FROM outbox_events
          WHERE tenant_id = $1 AND status = 'dead_letter'`,
        [TENANT]
      )
    ).toEqual([{ count: 0 }])
  })

  it('combines lease-expiry redelivery, final DLQ and durable effect recovery', async () => {
    const runtime = createPostgresKernelRuntime({
      pool,
      tenantId: TENANT,
      agentId: AGENT,
      env: {
        CVG_WORKER_RUNTIME: KERNEL_WORKER_RUNTIME,
        CVG_WORKER_ID: 'aud20-final-attempt-worker'
      }
    })
    const input = durableReadInput('msg_aud20_final_attempt')
    const event = await runtime.conversations.enqueue({
      tenantId: TENANT,
      type: 'message.outbound',
      payload: { fixture: 'aud20-final-attempt' },
      idempotencyKey: 'aud20-final-attempt-event',
      correlationId: input.correlationId
    })
    const abandoned = await runtime.conversations.claimNext({
      tenantId: TENANT,
      workerId: 'aud20-crashed-worker',
      leaseMs: 1_000,
      eventId: event.id
    })
    if (!abandoned) throw new Error('expected abandoned claim')

    await withTenantContext(pool, TENANT, async (client) => {
      await client.query(
        `UPDATE outbox_events
            SET lease_until = now() - interval '1 second',
                available_at = now()
          WHERE tenant_id = $1 AND id = $2`,
        [TENANT, event.id]
      )
    })
    expect(
      await queryRows<{ status: string; attempts: number }>(
        `SELECT status, attempts
           FROM outbox_events
          WHERE tenant_id = $1 AND id = $2`,
        [TENANT, event.id]
      )
    ).toEqual([{ status: 'processing', attempts: 1 }])

    let current = await processOutboxEvent({
      tenantId: TENANT,
      workerId: 'aud20-final-attempt-worker',
      adapter: runtime.conversations,
      eventId: event.id,
      effect: () => {
        throw new Error('synthetic final-attempt failure')
      }
    })
    expect(current).toMatchObject({ status: 'failed', attempts: 2 })

    for (let attempt = 2; attempt <= OUTBOX_MAX_ATTEMPTS; attempt += 1) {
      await withTenantContext(pool, TENANT, async (client) => {
        await client.query(
          `UPDATE outbox_events
              SET available_at = now()
            WHERE tenant_id = $1 AND id = $2`,
          [TENANT, event.id]
        )
      })
      current = await processOutboxEvent({
        tenantId: TENANT,
        workerId: 'aud20-final-attempt-worker',
        adapter: runtime.conversations,
        eventId: event.id,
        effect: () => {
          throw new Error('synthetic final-attempt failure')
        }
      })
      if (current?.status === 'dead_letter') break
    }

    expect(current).toMatchObject({
      status: 'dead_letter',
      attempts: OUTBOX_MAX_ATTEMPTS
    })
    expect(await runtime.conversations.listDeadLetters(TENANT)).toHaveLength(1)
    expect(
      await queryRows<{ count: number }>(
        `SELECT count(*)::int AS count
           FROM outbox_effects
          WHERE tenant_id = $1 AND idempotency_key = $2`,
        [TENANT, event.idempotencyKey]
      )
    ).toEqual([{ count: 0 }])

    const requeued = await runtime.conversations.requeueDeadLetter({
      tenantId: TENANT,
      eventId: event.id,
      operatorId: 'operator-aud20-final-attempt',
      correlationId: input.correlationId
    })
    expect(requeued).toMatchObject({ status: 'pending', attempts: 0 })

    const recovered = await processOutboxEvent({
      tenantId: TENANT,
      workerId: 'aud20-recovery-worker',
      adapter: runtime.conversations,
      eventId: event.id,
      effect: () => runtime.runDurableGoal(input)
    })
    expect(recovered).toMatchObject({ status: 'processed', attempts: 1 })
    expect(
      await queryRows<{ count: number }>(
        `SELECT count(*)::int AS count
           FROM outbox_effects
          WHERE tenant_id = $1 AND idempotency_key = $2`,
        [TENANT, event.idempotencyKey]
      )
    ).toEqual([{ count: 1 }])
    expect(
      await runtime.goalStore.getGoalByInboundMessage(
        TENANT,
        input.context.message.id
      )
    ).not.toBeNull()
    expect(await runtime.conversations.listDeadLetters(TENANT)).toHaveLength(0)
  })
})
