import { randomBytes } from 'node:crypto'
import { Client, Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  PostgresGoalPlanStore,
  readPostgresMigrationSql,
  runPostgresMigrations,
  withTenantContext
} from '../index.ts'
import {
  OrchestrationError,
  validatePlanGraph,
  type CreateGoalInput,
  type Goal,
  type PlanStepDraft
} from '@cvg/agent-runtime'

const testDatabaseUrl = process.env.TEST_DATABASE_URL
const describeWithPostgres = testDatabaseUrl ? describe : describe.skip
const TENANT = 'tenant_00000000-0000-4000-8000-0000000000c1'
const OTHER_TENANT = 'tenant_00000000-0000-4000-8000-0000000000c2'
const CORRELATION = 'corr_00000000-0000-4000-8000-0000000000c1'
const OTHER_CORRELATION = 'corr_00000000-0000-4000-8000-0000000000c2'
const NOW = new Date('2026-09-15T12:00:00.000Z')

function createGoalInput(
  options: {
    tenantId?: string
    inboundMessageId?: string
    correlationId?: string
    plannerContext?: unknown
    objective?: string
  } = {}
): CreateGoalInput {
  const correlationId = options.correlationId ?? CORRELATION
  return {
    tenantId: options.tenantId ?? TENANT,
    ...(options.inboundMessageId !== undefined
      ? { inboundMessageId: options.inboundMessageId }
      : {}),
    conversationId: 'conv_goal_concurrency',
    objective: options.objective ?? 'Synthetic concurrent Goal fixture',
    successCriteria: [
      {
        kind: 'EVENT',
        eventType: 'schedule.read.executed',
        source: 'outbox',
        correlationId
      }
    ],
    correlationId,
    ...(options.plannerContext !== undefined
      ? { plannerContext: options.plannerContext }
      : {}),
    executionSnapshot: {
      agentVersion: 'agent-v1',
      promptVersion: 'prompt-v1',
      policyVersion: 'policy-v1',
      modelProfile: 'deterministic',
      toolVersions: { synthetic: '1.0.0' },
      runtimeMode: 'kernel',
      runtimeVersion: 'aaa21-kernel-v1'
    }
  }
}

function stepDraft(id: string): PlanStepDraft {
  return {
    id,
    type: 'synthetic',
    description: `step ${id}`,
    requiredCapabilities: ['appointment.create'],
    riskLevel: 'MEDIUM_RISK_WRITE',
    approvalRequirement: 'none',
    input: { id },
    expectedOutcome: { verified: true },
    timeoutMs: 1_000,
    intent: {
      capability: 'appointment.create',
      action: `synthetic.${id}`,
      resource: {
        type: 'synthetic_appointment',
        id: 'apt_1',
        tenantId: TENANT
      },
      dataClassification: 'INTERNAL',
      modelMessages: null,
      structuredOutput: null,
      idempotencyKey: `synthetic:${id}`
    },
    toolId: 'synthetic',
    toolVersion: '1.0.0'
  }
}

async function queryRows<T>(
  pool: Pool,
  tenant: string,
  text: string,
  values: unknown[] = []
): Promise<T[]> {
  return withTenantContext(pool, tenant, async (client) => {
    const result = await client.query(text, values)
    return result.rows as T[]
  })
}

interface GoalCounts {
  goals: number
  distinct_ids: number
  correlations: string[] | null
}

async function goalCounts(
  pool: Pool,
  tenant: string,
  inboundMessageId: string
): Promise<GoalCounts> {
  const rows = await queryRows<GoalCounts>(
    pool,
    tenant,
    `SELECT count(*)::int AS goals,
            count(DISTINCT id)::int AS distinct_ids,
            array_agg(DISTINCT correlation_id) AS correlations
       FROM orchestrator_goals
      WHERE tenant_id = $1 AND inbound_message_id = $2`,
    [tenant, inboundMessageId]
  )
  return rows[0]!
}

async function transitionToExecuting(
  store: PostgresGoalPlanStore,
  goal: Goal
): Promise<Goal> {
  let executing = goal
  for (const target of [
    'UNDERSTANDING',
    'PLANNING',
    'GOVERNING',
    'EXECUTING'
  ] as const) {
    executing = await store.transitionGoal({
      tenantId: TENANT,
      goalId: goal.id,
      expectedVersion: executing.version,
      target,
      reason: 'synthetic concurrency setup'
    })
  }
  return executing
}

describeWithPostgres('Goal get-or-create concurrency over PostgreSQL', () => {
  const schema = `cvg_goal_concurrency_${Date.now()}_${randomBytes(2).toString('hex')}`
  let admin: Client
  let poolA: Pool
  let poolB: Pool
  let storeA: PostgresGoalPlanStore
  let storeB: PostgresGoalPlanStore

  beforeAll(async () => {
    if (!testDatabaseUrl) return
    admin = new Client({ connectionString: testDatabaseUrl })
    await admin.connect()
    await runPostgresMigrations(admin, { schemaName: schema })
    const poolOptions = {
      connectionString: testDatabaseUrl,
      options: `-c search_path=${schema}`
    }
    poolA = new Pool(poolOptions)
    poolB = new Pool(poolOptions)
    storeA = new PostgresGoalPlanStore(poolA, () => NOW)
    storeB = new PostgresGoalPlanStore(poolB, () => NOW)
  })

  afterAll(async () => {
    if (!testDatabaseUrl) return
    await poolA?.end().catch(() => undefined)
    await poolB?.end().catch(() => undefined)
    await admin
      ?.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
      .catch(() => undefined)
    await admin?.end().catch(() => undefined)
  })

  it('relies on the existing partial unique index instead of a new migration', async () => {
    const migration = await readPostgresMigrationSql('0019_orchestrator_state')
    expect(migration).toMatch(
      /UNIQUE INDEX IF NOT EXISTS uq_orchestrator_goals_inbound_message/
    )
    expect(migration).toContain('WHERE inbound_message_id IS NOT NULL')
    const indexes = await queryRows<{ indexdef: string }>(
      poolA,
      TENANT,
      `SELECT indexdef FROM pg_indexes
        WHERE schemaname = current_schema()
          AND indexname = 'uq_orchestrator_goals_inbound_message'`
    )
    expect(indexes).toHaveLength(1)
    expect(indexes[0]!.indexdef).toContain('UNIQUE')
    expect(indexes[0]!.indexdef).toContain(
      'WHERE (inbound_message_id IS NOT NULL)'
    )
  })

  it('converges concurrent first deliveries on one canonical Goal without a unique violation', async () => {
    const inboundMessageId = 'msg_goal_concurrency_first_delivery'
    const input = createGoalInput({ inboundMessageId })
    const outcomes = await Promise.allSettled(
      Array.from({ length: 6 }, (_, index) =>
        (index % 2 === 0 ? storeA : storeB).getOrCreateGoal(input)
      )
    )
    expect(
      outcomes.some(
        (outcome) =>
          outcome.status === 'rejected' &&
          (outcome.reason as { code?: string }).code === '23505'
      )
    ).toBe(false)
    expect(outcomes.filter((outcome) => outcome.status === 'rejected')).toEqual(
      []
    )
    const goals = outcomes.map((outcome) => {
      if (outcome.status !== 'fulfilled') throw new Error('unreachable')
      return outcome.value
    })
    expect(new Set(goals.map((goal) => goal.id)).size).toBe(1)
    expect(goals.every((goal) => goal.correlationId === CORRELATION)).toBe(true)

    const counts = await goalCounts(poolA, TENANT, inboundMessageId)
    expect(counts).toEqual({
      goals: 1,
      distinct_ids: 1,
      correlations: [CORRELATION]
    })
  })

  it('creates distinct Goals for the same inbound message id in different tenants', async () => {
    const inboundMessageId = 'msg_goal_concurrency_tenant_scope'
    const [primary, secondary] = await Promise.all([
      storeA.getOrCreateGoal(createGoalInput({ inboundMessageId })),
      storeB.getOrCreateGoal(
        createGoalInput({ tenantId: OTHER_TENANT, inboundMessageId })
      )
    ])
    expect(primary.id).not.toBe(secondary.id)
    expect(primary.tenantId).toBe(TENANT)
    expect(secondary.tenantId).toBe(OTHER_TENANT)
    expect(await goalCounts(poolA, TENANT, inboundMessageId)).toMatchObject({
      goals: 1,
      distinct_ids: 1
    })
    expect(
      await goalCounts(poolB, OTHER_TENANT, inboundMessageId)
    ).toMatchObject({ goals: 1, distinct_ids: 1 })
    expect(await storeA.getGoal(OTHER_TENANT, primary.id)).toBeNull()
    expect(await storeB.getGoal(TENANT, secondary.id)).toBeNull()
  })

  it('converges redelivery on the winner lineage and rejects incompatible reuse', async () => {
    const inboundMessageId = 'msg_goal_concurrency_redelivery'
    const input = createGoalInput({
      inboundMessageId,
      plannerContext: { messageId: inboundMessageId, envelope: 'winner' }
    })
    const first = await storeA.getOrCreateGoal(input)
    const redelivered = await storeB.getOrCreateGoal({
      ...input,
      objective: 'Synthetic redelivery must not overwrite the canonical Goal'
    })
    expect(redelivered.id).toBe(first.id)
    expect(redelivered.objective).toBe(input.objective)
    expect(redelivered.plannerContext).toEqual({
      messageId: inboundMessageId,
      envelope: 'winner'
    })
    expect(redelivered.createdAt).toEqual(first.createdAt)
    expect(redelivered.updatedAt).toEqual(first.updatedAt)
    expect(redelivered.version).toBe(1)

    const correlationConflict = await storeB
      .getOrCreateGoal({ ...input, correlationId: OTHER_CORRELATION })
      .catch((error: unknown) => error)
    expect(correlationConflict).toBeInstanceOf(OrchestrationError)
    expect(correlationConflict).toMatchObject({ code: 'conflict' })
    const conflictMessage = (correlationConflict as Error).message
    expect(conflictMessage).not.toContain(first.id)
    expect(conflictMessage).not.toContain(CORRELATION)
    expect(conflictMessage).not.toContain(OTHER_CORRELATION)

    // A stored Goal whose planner_context.messageId diverges from its own
    // inbound message must never be adopted, even with matching correlation.
    const divergentMessageId = 'msg_goal_concurrency_divergent_context'
    await storeA.createGoal(
      createGoalInput({
        inboundMessageId: divergentMessageId,
        plannerContext: {
          messageId: 'msg_goal_concurrency_other_context',
          envelope: 'divergent'
        }
      })
    )
    const contextConflict = await storeA
      .getOrCreateGoal(
        createGoalInput({
          inboundMessageId: divergentMessageId,
          plannerContext: { messageId: divergentMessageId }
        })
      )
      .catch((error: unknown) => error)
    expect(contextConflict).toMatchObject({ code: 'conflict' })
    expect(await goalCounts(poolA, TENANT, divergentMessageId)).toMatchObject({
      goals: 1,
      distinct_ids: 1
    })

    const rows = await queryRows<{
      id: string
      correlation_id: string
      planner_context: { messageId?: string }
      objective: string
    }>(
      poolA,
      TENANT,
      `SELECT id, correlation_id, planner_context, objective
         FROM orchestrator_goals
        WHERE tenant_id = $1 AND inbound_message_id = $2`,
      [TENANT, inboundMessageId]
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      id: first.id,
      correlation_id: CORRELATION,
      objective: input.objective,
      planner_context: { messageId: inboundMessageId }
    })
  })

  it('bounds the creation and claim race to one lease and one effect attempt', async () => {
    const inboundMessageId = 'msg_goal_concurrency_claim_race'
    const input = createGoalInput({ inboundMessageId })
    const goal = await storeA.getOrCreateGoal(input)
    const drafts = [stepDraft('step_claim_race')]
    const graph = validatePlanGraph(
      { id: 'plan_draft', goalId: goal.id, tenantId: TENANT, version: 1 },
      drafts
    )
    const activated = await storeA.activatePlan({
      tenantId: TENANT,
      goalId: goal.id,
      expectedGoalVersion: goal.version,
      planVersion: 1,
      parentPlanId: null,
      reason: 'synthetic claim race plan',
      steps: drafts,
      consumeReplan: false,
      fingerprint: graph.fingerprint
    })
    const executing = await transitionToExecuting(storeA, activated.goal)
    const [redelivered, claimA, claimB] = await Promise.allSettled([
      storeB.getOrCreateGoal(input),
      storeA.claimStep({
        tenantId: TENANT,
        goalId: goal.id,
        planId: activated.plan.id,
        stepId: 'step_claim_race',
        workerId: 'worker-race-a',
        expectedGoalVersion: executing.version,
        now: NOW,
        leaseMs: 1_000
      }),
      storeB.claimStep({
        tenantId: TENANT,
        goalId: goal.id,
        planId: activated.plan.id,
        stepId: 'step_claim_race',
        workerId: 'worker-race-b',
        expectedGoalVersion: executing.version,
        now: NOW,
        leaseMs: 1_000
      })
    ])
    expect(redelivered.status).toBe('fulfilled')
    expect(
      redelivered.status === 'fulfilled' ? redelivered.value.id : null
    ).toBe(goal.id)

    const claimOutcomes = [claimA, claimB]
    const won = claimOutcomes.filter(
      (outcome) => outcome.status === 'fulfilled' && outcome.value !== null
    )
    const lost = claimOutcomes.filter(
      (outcome) => outcome.status === 'rejected'
    )
    expect(won).toHaveLength(1)
    expect(lost).toHaveLength(1)
    expect(lost[0]!.reason).toMatchObject({ code: 'conflict' })

    const attempts = await queryRows<{ count: number }>(
      poolA,
      TENANT,
      `SELECT count(*)::int AS count FROM orchestrator_attempts
        WHERE tenant_id = $1 AND goal_id = $2`,
      [TENANT, goal.id]
    )
    expect(attempts[0]!.count).toBe(1)
    const reloaded = await storeB.getGoal(TENANT, goal.id)
    expect(reloaded?.budget.usage.steps).toBe(1)
    const steps = await storeA.listSteps(TENANT, activated.plan.id)
    expect(steps).toHaveLength(1)
    expect(steps[0]?.status).toBe('EXECUTING')
    expect(steps[0]?.attemptCount).toBe(1)
  })

  it('does not produce retry or dead-letter side effects for a benign conflict', async () => {
    const inboundMessageId = 'msg_goal_concurrency_benign_conflict'
    const input = createGoalInput({ inboundMessageId })
    const outcomes = await Promise.allSettled(
      Array.from({ length: 4 }, (_, index) =>
        (index % 2 === 0 ? storeA : storeB).getOrCreateGoal(input)
      )
    )
    expect(outcomes.every((outcome) => outcome.status === 'fulfilled')).toBe(
      true
    )
    const goalId = (outcomes[0] as PromiseFulfilledResult<Goal>).value.id
    const effects = await queryRows<{
      attempts: number
      observations: number
      evaluations: number
    }>(
      poolA,
      TENANT,
      `SELECT
         (SELECT count(*)::int FROM orchestrator_attempts
           WHERE tenant_id = $1 AND goal_id = $2) AS attempts,
         (SELECT count(*)::int FROM orchestrator_observations
           WHERE tenant_id = $1 AND goal_id = $2) AS observations,
         (SELECT count(*)::int FROM orchestrator_evaluations
           WHERE tenant_id = $1 AND goal_id = $2) AS evaluations`,
      [TENANT, goalId]
    )
    expect(effects[0]).toEqual({
      attempts: 0,
      observations: 0,
      evaluations: 0
    })
    const deadLetters = await queryRows<{ count: number }>(
      poolB,
      TENANT,
      `SELECT count(*)::int AS count FROM outbox_events
        WHERE tenant_id = $1 AND status = 'dead_letter'`,
      [TENANT]
    )
    expect(deadLetters[0]!.count).toBe(0)
  })

  it('rejects settlement from an expired lease holder and accepts only the fresh fencing token', async () => {
    const goal = await storeA.createGoal(createGoalInput())
    const drafts = [stepDraft('step_lease_fencing')]
    const graph = validatePlanGraph(
      { id: 'plan_draft', goalId: goal.id, tenantId: TENANT, version: 1 },
      drafts
    )
    const activated = await storeA.activatePlan({
      tenantId: TENANT,
      goalId: goal.id,
      expectedGoalVersion: goal.version,
      planVersion: 1,
      parentPlanId: null,
      reason: 'synthetic fencing plan',
      steps: drafts,
      consumeReplan: false,
      fingerprint: graph.fingerprint
    })
    const executing = await transitionToExecuting(storeA, activated.goal)
    const first = await storeA.claimStep({
      tenantId: TENANT,
      goalId: goal.id,
      planId: activated.plan.id,
      stepId: 'step_lease_fencing',
      workerId: 'worker-expired',
      expectedGoalVersion: executing.version,
      now: NOW,
      leaseMs: 100
    })
    expect(first).not.toBeNull()
    const recovered = await storeB.recoverExpiredLease({
      tenantId: TENANT,
      stepId: 'step_lease_fencing',
      leaseToken: first!.lease.leaseToken,
      stepVersion: first!.lease.stepVersion,
      now: new Date(NOW.getTime() + 151),
      decision: 'retry',
      reason: 'synthetic expired worker crash'
    })
    const second = await storeB.claimStep({
      tenantId: TENANT,
      goalId: goal.id,
      planId: recovered.step.planId,
      stepId: 'step_lease_fencing',
      workerId: 'worker-fresh',
      expectedGoalVersion: recovered.goal.version,
      now: new Date(NOW.getTime() + 151),
      leaseMs: 1_000
    })
    expect(second?.lease.leaseToken).not.toBe(first?.lease.leaseToken)

    await expect(
      storeA.settleStep({
        lease: first!.lease,
        outcome: 'succeeded',
        resultDigest: 'stale',
        reason: 'stale fencing token',
        approvalId: null,
        now: new Date(NOW.getTime() + 152),
        modelCalls: 0,
        toolCalls: 1,
        costUsd: 0
      })
    ).rejects.toMatchObject({ code: 'lease_lost' })

    const settled = await storeB.settleStep({
      lease: second!.lease,
      outcome: 'succeeded',
      resultDigest: 'fresh',
      reason: 'fresh fencing token',
      approvalId: null,
      now: new Date(NOW.getTime() + 152),
      modelCalls: 0,
      toolCalls: 1,
      costUsd: 0
    })
    expect(settled.step.status).toBe('SUCCEEDED')

    const attempts = await queryRows<{ outcome: string | null }>(
      poolA,
      TENANT,
      `SELECT outcome FROM orchestrator_attempts
        WHERE tenant_id = $1 AND goal_id = $2
        ORDER BY started_at, id`,
      [TENANT, goal.id]
    )
    expect(attempts.map((row) => row.outcome)).toEqual([
      'lease_expired',
      'SUCCEEDED'
    ])
  })
})
