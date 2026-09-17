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
  validatePlanGraph,
  type CreateGoalInput,
  type PlanStepDraft
} from '@cvg/agent-runtime'

const testDatabaseUrl = process.env.TEST_DATABASE_URL
const describeWithPostgres = testDatabaseUrl ? describe : describe.skip
const TENANT = 'tenant_00000000-0000-4000-8000-0000000000a1'
const OTHER_TENANT = 'tenant_00000000-0000-4000-8000-0000000000a2'
const CORRELATION = 'corr_00000000-0000-4000-8000-0000000000a1'

function createGoalInput(
  tenantId = TENANT,
  inboundMessageId?: string
): CreateGoalInput {
  return {
    tenantId,
    ...(inboundMessageId !== undefined ? { inboundMessageId } : {}),
    objective: 'Synthetic durable orchestration fixture',
    successCriteria: [
      {
        kind: 'STATE',
        resourceType: 'synthetic_appointment',
        resourceId: 'apt_1',
        field: 'status',
        expected: 'created',
        source: 'operational_state'
      }
    ],
    correlationId: CORRELATION,
    executionSnapshot: {
      agentVersion: 'agent-v1',
      promptVersion: 'prompt-v1',
      policyVersion: 'policy-v1',
      modelProfile: 'deterministic',
      toolVersions: { synthetic: '1.0.0' }
    }
  }
}

function draft(id: string, dependencies: string[] = []): PlanStepDraft {
  return {
    id,
    type: 'synthetic',
    description: `step ${id}`,
    dependencies,
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

describeWithPostgres('durable orchestrator PostgreSQL store', () => {
  const schema = `cvg_orchestrator_${Date.now()}_${randomBytes(2).toString('hex')}`
  let admin: Client
  let pool: Pool
  let store: PostgresGoalPlanStore

  beforeAll(async () => {
    if (!testDatabaseUrl) return
    admin = new Client({ connectionString: testDatabaseUrl })
    await admin.connect()
    await runPostgresMigrations(admin, { schemaName: schema })
    pool = new Pool({
      connectionString: testDatabaseUrl,
      options: `-c search_path=${schema}`
    })
    store = new PostgresGoalPlanStore(
      pool,
      () => new Date('2026-09-15T12:00:00.000Z')
    )
  })

  afterAll(async () => {
    if (!testDatabaseUrl) return
    await pool?.end().catch(() => undefined)
    await admin
      ?.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
      .catch(() => undefined)
    await admin?.end().catch(() => undefined)
  })

  it('applies the orchestrator migration and preserves tenant-scoped Goal/Plan/Step lineage', async () => {
    const migration = await readPostgresMigrationSql('0019_orchestrator_state')
    expect(migration).toContain('orchestrator_goals')
    const goal = await store.createGoal(
      createGoalInput(TENANT, 'msg_orchestrator_pg_1')
    )
    expect((await store.getGoal(TENANT, goal.id))?.id).toBe(goal.id)
    expect(
      (await store.getGoalByInboundMessage(TENANT, 'msg_orchestrator_pg_1'))?.id
    ).toBe(goal.id)
    expect(await store.getGoal(OTHER_TENANT, goal.id)).toBeNull()
    expect(await store.listRunnableGoals(OTHER_TENANT)).toEqual([])

    const steps = [draft('a'), draft('b', ['a'])]
    const graph = validatePlanGraph(
      { id: 'plan_draft', goalId: goal.id, tenantId: TENANT, version: 1 },
      steps
    )
    const activated = await store.activatePlan({
      tenantId: TENANT,
      goalId: goal.id,
      expectedGoalVersion: goal.version,
      planVersion: 1,
      parentPlanId: null,
      reason: 'initial plan',
      steps,
      consumeReplan: false,
      fingerprint: graph.fingerprint
    })
    expect(
      (await store.listSteps(TENANT, activated.plan.id)).map(
        (step) => step.status
      )
    ).toEqual(['READY', 'PENDING'])
    expect(
      (await store.listPlans(TENANT, goal.id)).map((plan) => plan.version)
    ).toEqual([1])
  })

  it('rejects orphan effect and outbox orchestration lineage', async () => {
    await expect(
      withTenantContext(pool, TENANT, (client) =>
        client.query(
          `INSERT INTO effect_journal
             (tenant_id, operation_key, proposal_hash, state, attempt_id,
              expires_at, orchestration_goal_id, orchestration_plan_id,
              orchestration_step_id)
           VALUES ($1, $2, $3, 'RESERVED', $4, now() + interval '1 hour',
                   'missing_goal', 'missing_plan', 'missing_step')`,
          [TENANT, 'orphan_effect_lineage', 'proposal_hash', 'effect_attempt']
        )
      )
    ).rejects.toThrow(/orchestration_(step|attempt)_lineage_fk/)

    await expect(
      withTenantContext(pool, TENANT, (client) =>
        client.query(
          `INSERT INTO outbox_events
             (id, type, payload, status, tenant_id, envelope_version,
              correlation_id, idempotency_key, available_at, attempts,
              tenant_isolation_quarantined, orchestration_goal_id,
              orchestration_plan_id, orchestration_step_id)
           VALUES ($1, 'synthetic.orphan', '{}'::jsonb, 'pending', $2, 1,
                   $3, $4, now(), 0, false,
                   'missing_goal', 'missing_plan', 'missing_step')`,
          [
            'outbox_orphan_lineage',
            TENANT,
            CORRELATION,
            'outbox_orphan_lineage'
          ]
        )
      )
    ).rejects.toThrow(/outbox_events_orchestration_step_lineage_fk/)
  })

  it('enforces CAS, claim fencing, attempt history and recovery in PostgreSQL', async () => {
    const goal = await store.createGoal(createGoalInput())
    const steps = [draft('leased')]
    const graph = validatePlanGraph(
      { id: 'plan_draft', goalId: goal.id, tenantId: TENANT, version: 1 },
      steps
    )
    const activated = await store.activatePlan({
      tenantId: TENANT,
      goalId: goal.id,
      expectedGoalVersion: goal.version,
      planVersion: 1,
      parentPlanId: null,
      reason: 'lease plan',
      steps,
      consumeReplan: false,
      fingerprint: graph.fingerprint
    })
    let executing = await store.transitionGoal({
      tenantId: TENANT,
      goalId: goal.id,
      expectedVersion: activated.goal.version,
      target: 'UNDERSTANDING',
      reason: 'setup'
    })
    executing = await store.transitionGoal({
      tenantId: TENANT,
      goalId: goal.id,
      expectedVersion: executing.version,
      target: 'PLANNING',
      reason: 'setup'
    })
    executing = await store.transitionGoal({
      tenantId: TENANT,
      goalId: goal.id,
      expectedVersion: executing.version,
      target: 'GOVERNING',
      reason: 'setup'
    })
    executing = await store.transitionGoal({
      tenantId: TENANT,
      goalId: goal.id,
      expectedVersion: executing.version,
      target: 'EXECUTING',
      reason: 'setup'
    })
    const now = new Date('2026-09-15T12:00:00.000Z')
    const first = await store.claimStep({
      tenantId: TENANT,
      goalId: goal.id,
      planId: activated.plan.id,
      stepId: 'leased',
      workerId: 'reused-worker',
      expectedGoalVersion: executing.version,
      now,
      leaseMs: 100
    })
    expect(first).not.toBeNull()
    const renewed = await store.heartbeatStep({
      lease: first!.lease,
      now: new Date(now.getTime() + 50),
      leaseMs: 100
    })
    expect(renewed?.stepVersion).toBe(first!.lease.stepVersion + 1)
    await expect(
      store.settleStep({
        lease: first!.lease,
        outcome: 'succeeded',
        resultDigest: 'pre-heartbeat-stale',
        reason: 'stale lease after heartbeat',
        approvalId: null,
        now: new Date(now.getTime() + 50),
        modelCalls: 0,
        toolCalls: 1,
        costUsd: 0
      })
    ).rejects.toMatchObject({ code: 'lease_lost' })
    const recovered = await store.recoverExpiredLease({
      tenantId: TENANT,
      stepId: 'leased',
      leaseToken: first!.lease.leaseToken,
      stepVersion: renewed!.stepVersion,
      now: new Date(now.getTime() + 151),
      decision: 'retry',
      reason: 'worker crashed before controlled effect'
    })
    const second = await store.claimStep({
      tenantId: TENANT,
      goalId: goal.id,
      planId: activated.plan.id,
      stepId: 'leased',
      workerId: 'reused-worker',
      expectedGoalVersion: recovered.goal.version,
      now: new Date(now.getTime() + 151),
      leaseMs: 100
    })
    expect(second?.lease.leaseToken).not.toBe(first?.lease.leaseToken)
    await expect(
      store.settleStep({
        lease: first!.lease,
        outcome: 'succeeded',
        resultDigest: 'stale',
        reason: 'stale worker',
        approvalId: null,
        now: new Date(now.getTime() + 151),
        modelCalls: 0,
        toolCalls: 1,
        costUsd: 0
      })
    ).rejects.toMatchObject({ code: 'lease_lost' })
    const settled = await store.settleStep({
      lease: second!.lease,
      outcome: 'succeeded',
      resultDigest: 'fresh',
      reason: 'fresh worker',
      approvalId: null,
      now: new Date(now.getTime() + 152),
      modelCalls: 0,
      toolCalls: 1,
      costUsd: 0.01,
      observation: {
        kind: 'step_result',
        resultDigest: 'fresh',
        evidence: []
      }
    })
    expect(settled.goal.budget.usage.steps).toBe(2)
    expect(settled.goal.budget.usage.toolCalls).toBe(1)
    expect(await store.listAttempts(TENANT, 'leased')).toHaveLength(2)
    expect(await store.listObservations(TENANT, goal.id)).toHaveLength(1)

    await expect(
      store.transitionGoal({
        tenantId: TENANT,
        goalId: goal.id,
        expectedVersion: executing.version,
        target: 'OBSERVING_RESULT',
        reason: 'stale CAS'
      })
    ).rejects.toMatchObject({ code: 'conflict' })
  })

  it('persists the iteration guard and observation in PostgreSQL', async () => {
    const goal = await store.createGoal({
      ...createGoalInput(),
      budget: { maxIterations: 1 }
    })
    const first = await store.consumeIteration({
      tenantId: TENANT,
      goalId: goal.id,
      expectedVersion: goal.version,
      now: new Date('2026-09-15T12:05:00.000Z')
    })
    expect(first.budget.usage.iterations).toBe(1)
    const restarted = await store.getGoal(TENANT, goal.id)
    const stopped = await store.consumeIteration({
      tenantId: TENANT,
      goalId: goal.id,
      expectedVersion: restarted!.version,
      now: new Date('2026-09-15T12:05:01.000Z')
    })
    expect(stopped.status).toBe('LOOP_DETECTED')
    expect(stopped.budget.usage.iterations).toBe(1)
  })
})
