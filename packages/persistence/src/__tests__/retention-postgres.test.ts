import { randomBytes } from 'node:crypto'
import { Client, Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  RETENTION_REDACTED_JSON,
  RETENTION_REDACTED_TEXT,
  createPostgresRetentionSweepStore,
  readPostgresMigrationSql,
  runPostgresMigrations,
  runTenantRetentionSweep,
  type RetentionPolicyDeclaration
} from '../index.ts'
import { withTenantContext } from '../tenant-scoped-postgres.ts'

const testDatabaseUrl = process.env.TEST_DATABASE_URL
const describeWithPostgres = testDatabaseUrl ? describe : describe.skip

const TENANT_A = 'tenant_00000000-0000-4000-8000-0000000000b1'
const TENANT_B = 'tenant_00000000-0000-4000-8000-0000000000b2'
const NOW = new Date('2026-09-19T12:00:00.000Z')
const OLD = new Date('2026-07-01T12:00:00.000Z')
const RECENT = new Date('2026-09-10T12:00:00.000Z')

function effectJournalPolicy(): RetentionPolicyDeclaration {
  return {
    targetId: 'effect_journal',
    policyId: 'POL-D05-3-JOURNAL',
    approvalRef: 'docs/02_spec/prod20260913_decision_packet.md#D05-3/4',
    approvedBy: 'fixture.operator',
    approvedAt: '2026-09-13T17:00:13.688Z',
    eligibleStates: ['CONFIRMED', 'EFFECT_FAILED', 'ABANDONED']
  }
}

function goalPolicy(): RetentionPolicyDeclaration {
  return {
    targetId: 'orchestrator_goals',
    policyId: 'POL-AUD19-05-GOALS',
    approvalRef: 'AUD19-05 fixture policy (human approval pending)',
    approvedBy: 'fixture.operator',
    approvedAt: '2026-09-13T17:00:13.688Z',
    action: 'redact',
    eligibleStates: ['COMPLETED', 'FAILED', 'CANCELLED']
  }
}

describeWithPostgres(
  'retention sweep on PostgreSQL (synthetic fixtures)',
  () => {
    const schema = `cvg_retention_${Date.now()}_${randomBytes(2).toString('hex')}`
    const roleName = `cvg_retention_role_${Date.now()}_${randomBytes(2).toString('hex')}`
    const rolePassword = randomBytes(18).toString('hex')
    let admin: Client
    let pool: Pool
    let roleUrl: string

    beforeAll(async () => {
      if (!testDatabaseUrl) return
      admin = new Client({ connectionString: testDatabaseUrl })
      await admin.connect()
      roleUrl = (() => {
        const url = new URL(testDatabaseUrl)
        url.username = roleName
        url.password = rolePassword
        return url.toString()
      })()
      await admin.query(
        `CREATE ROLE ${roleName} LOGIN PASSWORD '${rolePassword}' NOSUPERUSER NOCREATEDB NOCREATEROLE`
      )
      await runPostgresMigrations(admin, { schemaName: schema })
      await runPostgresMigrations(admin, { schemaName: schema })
      await admin.query(`GRANT USAGE ON SCHEMA ${schema} TO ${roleName}`)
      await admin.query(
        `GRANT SELECT, INSERT, UPDATE, DELETE ON
         ${schema}.effect_journal,
         ${schema}.orchestrator_goals,
         ${schema}.retention_holds,
         ${schema}.retention_erasure_ledger
       TO ${roleName}`
      )
      await admin.query(`ALTER ROLE ${roleName} SET search_path TO ${schema}`)
      pool = new Pool({ connectionString: roleUrl, max: 1 })
      await seedFixtures(admin)
    }, 60_000)

    afterAll(async () => {
      if (!testDatabaseUrl) return
      await pool?.end().catch(() => undefined)
      if (admin) {
        await admin
          .query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
          .catch(() => undefined)
        await admin
          .query(`DROP ROLE IF EXISTS ${roleName}`)
          .catch(() => undefined)
        await admin.end().catch(() => undefined)
      }
    })

    it('ships an additive, tenant-isolated retention ledger migration with checksum', async () => {
      const migration = await readPostgresMigrationSql('0025_retention_ledger')
      expect(migration).toContain('CREATE TABLE IF NOT EXISTS retention_holds')
      expect(migration).toContain(
        'CREATE TABLE IF NOT EXISTS retention_erasure_ledger'
      )
      expect(migration).toContain('FORCE ROW LEVEL SECURITY')
      expect(migration).toContain("current_setting('cvg.tenant_id', true)")
      expect(migration).toContain('REVOKE ALL ON retention_holds FROM PUBLIC')
      expect(migration).toContain(
        'REVOKE ALL ON retention_erasure_ledger FROM PUBLIC'
      )
      expect(migration).not.toContain('DROP TABLE')
      expect(migration).not.toContain('ALTER TABLE effect_journal')

      const applied = await admin.query<{ version: string; checksum: string }>(
        `SELECT version, checksum FROM schema_migrations WHERE version = $1`,
        ['0025_retention_ledger']
      )
      expect(applied.rows).toHaveLength(1)
      expect(applied.rows[0]?.checksum).toMatch(/^[0-9a-f]{64}$/)
    }, 30_000)

    it('expires tenant A, preserves tenant B and held records, and is idempotent', async () => {
      const request = {
        tenantId: TENANT_A,
        executedBy: 'fixture.operator',
        clock: () => NOW,
        policies: [
          effectJournalPolicy(),
          goalPolicy(),
          {
            targetId: 'runtime_approvals',
            policyId: 'POL-PENDING-APPROVAL',
            approvalRef: 'AUD19-05 pending human approval',
            approvedBy: '',
            approvedAt: '2026-09-13T00:00:00.000Z',
            action: 'redact',
            eligibleStates: ['EXECUTED']
          }
        ] as const
      }

      const first = await runTenantRetentionSweep(pool, request)
      const journal = first.outcomes.find(
        (outcome) => outcome.targetId === 'effect_journal'
      )!
      const goals = first.outcomes.find(
        (outcome) => outcome.targetId === 'orchestrator_goals'
      )!
      const approvals = first.outcomes.find(
        (outcome) => outcome.targetId === 'runtime_approvals'
      )!

      expect(journal).toMatchObject({
        status: 'EXECUTED',
        action: 'delete',
        deletedCount: 1,
        redactedCount: 0,
        preservedHoldCount: 1,
        windowEnd: '2026-08-20T12:00:00.000Z'
      })
      expect(goals).toMatchObject({
        status: 'EXECUTED',
        action: 'redact',
        deletedCount: 0,
        redactedCount: 1,
        preservedHoldCount: 1
      })
      expect(approvals).toMatchObject({
        status: 'SKIPPED_NO_POLICY',
        reason: 'missing_approval',
        action: 'none',
        deletedCount: 0
      })
      expect(
        first.outcomes.find((outcome) => outcome.targetId === 'outbox_events')
      ).toMatchObject({
        status: 'SKIPPED_NO_POLICY',
        reason: 'no_policy_configured'
      })

      const journalRows = await admin.query<{ operation_key: string }>(
        `SELECT operation_key FROM effect_journal ORDER BY operation_key`
      )
      expect(journalRows.rows.map((row) => row.operation_key)).toEqual(
        [
          'fx_a_recent_confirmed',
          'fx_a_old_held',
          'fx_a_old_uncertain',
          'fx_b_old_confirmed',
          'fx_b_old_held'
        ].sort()
      )

      const goalRows = await admin.query<{
        id: string
        objective: string
        planner_context: unknown
        last_reason: string | null
      }>(
        `SELECT id, objective, planner_context, last_reason
         FROM orchestrator_goals ORDER BY id`
      )
      const goalsById = new Map(goalRows.rows.map((row) => [row.id, row]))
      expect(goalsById.get('goal_a_old_completed')).toMatchObject({
        objective: RETENTION_REDACTED_TEXT,
        planner_context: RETENTION_REDACTED_JSON,
        last_reason: RETENTION_REDACTED_TEXT
      })
      expect(goalsById.get('goal_a_old_uncertain')?.objective).toBe(
        'KEEP-UNCERTAIN-A'
      )
      expect(goalsById.get('goal_a_old_held')?.objective).toBe(
        'KEEP-HELD-GOAL-A'
      )
      expect(goalsById.get('goal_b_old_completed')?.objective).toBe(
        'KEEP-TENANT-B-GOAL'
      )

      const approvalsRow = await admin.query<{ proposal_payload: unknown }>(
        `SELECT proposal_payload FROM runtime_approvals WHERE tenant_id = $1`,
        [TENANT_A]
      )
      expect(approvalsRow.rows[0]?.proposal_payload).toEqual({
        secret: 'SENSITIVE-APPROVAL-A'
      })

      const countsBefore = await snapshotCounts(admin)
      const ledgerBefore = await countLedger(admin)
      const second = await runTenantRetentionSweep(pool, request)
      expect(
        second.outcomes.find((outcome) => outcome.targetId === 'effect_journal')
      ).toMatchObject({ status: 'EXECUTED', deletedCount: 0, redactedCount: 0 })
      expect(
        second.outcomes.find(
          (outcome) => outcome.targetId === 'orchestrator_goals'
        )
      ).toMatchObject({ status: 'EXECUTED', deletedCount: 0, redactedCount: 0 })
      const countsAfter = await snapshotCounts(admin)
      expect(countsAfter).toEqual(countsBefore)
      expect((await countLedger(admin)) - ledgerBefore).toBe(5)

      const ledger = await admin.query<{
        tenant_id: string
        target_id: string
        action: string
        outcome: string
        reason: string | null
        policy_id: string | null
        policy_approved_by: string | null
        policy_approved_at: Date | null
        window_end: Date
        deleted_count: number
        redacted_count: number
        preserved_hold_count: number
        batch_hash: string
        executed_by: string
      }>(`SELECT * FROM retention_erasure_ledger`)
      const serialized = JSON.stringify(ledger.rows)
      expect(serialized).not.toContain('SENSITIVE-')
      expect(serialized).not.toContain('fx_a_old_confirmed')
      expect(serialized).not.toContain('KEEP-HELD-GOAL-A')
      expect(
        ledger.rows.every((row) => /^[0-9a-f]{64}$/.test(row.batch_hash))
      ).toBe(true)
      expect(
        ledger.rows
          .filter((row) => row.outcome === 'EXECUTED')
          .every(
            (row) =>
              row.policy_approved_by === 'fixture.operator' &&
              row.policy_approved_at instanceof Date
          )
      ).toBe(true)
      expect(
        ledger.rows
          .filter((row) => row.outcome !== 'EXECUTED')
          .every(
            (row) =>
              row.policy_approved_by === null && row.policy_approved_at === null
          )
      ).toBe(true)
      expect(ledger.rows.every((row) => row.tenant_id === TENANT_A)).toBe(true)
      expect(
        ledger.rows.filter(
          (row) =>
            row.target_id === 'effect_journal' && row.outcome === 'EXECUTED'
        )
      ).toHaveLength(2)
      expect(
        ledger.rows.filter(
          (row) =>
            row.target_id === 'runtime_approvals' &&
            row.reason === 'missing_approval'
        )
      ).toHaveLength(2)
    }, 60_000)

    it('keeps the ledger invisible outside the target tenant and rejects context mismatch', async () => {
      const scoped = await withTenantContext(pool, TENANT_B, async (client) => {
        const ledgerCount = await client.query<{ count: string }>(
          `SELECT count(*)::text AS count FROM retention_erasure_ledger`
        )
        const journalCount = await client.query<{ count: string }>(
          `SELECT count(*)::text AS count FROM effect_journal`
        )
        return {
          ledger: ledgerCount.rows[0]?.count,
          journal: journalCount.rows[0]?.count
        }
      })
      expect(scoped).toEqual({ ledger: '0', journal: '2' })

      await expect(
        withTenantContext(pool, TENANT_B, (client) =>
          createPostgresRetentionSweepStore(client).listActiveHolds(
            TENANT_A,
            'effect_journal'
          )
        )
      ).rejects.toThrow('tenant context mismatch')

      const contextAfter = await withTenantContext(
        pool,
        TENANT_B,
        async (client) => {
          const result = await client.query<{ tenant_id: string | null }>(
            `SELECT NULLIF(current_setting('cvg.tenant_id', true), '') AS tenant_id`
          )
          return result.rows[0]?.tenant_id
        }
      )
      expect(contextAfter).toBe(TENANT_B)
    }, 30_000)
  }
)

async function seedFixtures(client: Client): Promise<void> {
  const insertEffect = `INSERT INTO effect_journal
      (tenant_id, operation_key, proposal_hash, state, attempt_id,
       execution_ref, expires_at, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $7)`
  await client.query(insertEffect, [
    TENANT_A,
    'fx_a_old_confirmed',
    'proposal_hash_fixture',
    'CONFIRMED',
    'attempt_a1',
    'effect-ref-a1',
    OLD
  ])
  await client.query(insertEffect, [
    TENANT_A,
    'fx_a_old_uncertain',
    'proposal_hash_fixture',
    'UNCERTAIN',
    'attempt_a2',
    null,
    OLD
  ])
  await client.query(insertEffect, [
    TENANT_A,
    'fx_a_old_held',
    'proposal_hash_fixture',
    'CONFIRMED',
    'attempt_a3',
    'effect-ref-a3',
    OLD
  ])
  await client.query(insertEffect, [
    TENANT_A,
    'fx_a_recent_confirmed',
    'proposal_hash_fixture',
    'CONFIRMED',
    'attempt_a4',
    'effect-ref-a4',
    RECENT
  ])
  await client.query(insertEffect, [
    TENANT_B,
    'fx_b_old_confirmed',
    'proposal_hash_fixture',
    'CONFIRMED',
    'attempt_b1',
    'effect-ref-b1',
    OLD
  ])
  await client.query(insertEffect, [
    TENANT_B,
    'fx_b_old_held',
    'proposal_hash_fixture',
    'CONFIRMED',
    'attempt_b2',
    'effect-ref-b2',
    OLD
  ])

  const insertGoal = `INSERT INTO orchestrator_goals
      (tenant_id, id, objective, success_criteria, status, budget, budget_usage,
       correlation_id, execution_snapshot, planner_context, last_reason,
       created_at, updated_at)
    VALUES ($1, $2, $3, '[]'::jsonb, $4, '{}'::jsonb, '{}'::jsonb, $5,
            '{}'::jsonb, $6::jsonb, $7, $8, $8)`
  await client.query(insertGoal, [
    TENANT_A,
    'goal_a_old_completed',
    'SENSITIVE-OBJECTIVE-A',
    'COMPLETED',
    'corr_00000000-0000-4000-8000-0000000000b1',
    JSON.stringify({ secret: 'SENSITIVE-PLANNER-A' }),
    'SENSITIVE-REASON-A',
    OLD
  ])
  await client.query(insertGoal, [
    TENANT_A,
    'goal_a_old_uncertain',
    'KEEP-UNCERTAIN-A',
    'UNCERTAIN',
    'corr_00000000-0000-4000-8000-0000000000b2',
    JSON.stringify({ secret: 'KEEP-UNCERTAIN-PLANNER-A' }),
    'uncertain requires reconciliation',
    OLD
  ])
  await client.query(insertGoal, [
    TENANT_A,
    'goal_a_old_held',
    'KEEP-HELD-GOAL-A',
    'COMPLETED',
    'corr_00000000-0000-4000-8000-0000000000b3',
    null,
    null,
    OLD
  ])
  await client.query(insertGoal, [
    TENANT_B,
    'goal_b_old_completed',
    'KEEP-TENANT-B-GOAL',
    'COMPLETED',
    'corr_00000000-0000-4000-8000-0000000000b4',
    null,
    null,
    OLD
  ])

  await client.query(
    `INSERT INTO runtime_approvals
       (tenant_id, approval_id, operator_id, agent_id, agent_version, action,
        resource_type, payload_hash, policy_version, correlation_id, status,
        single_use, requested_at, expires_at, proposal_payload)
     VALUES ($1, 'approval_a_old', 'fixture.operator', 'agent_fixture', 'v1',
             'synthetic.action', 'synthetic_resource', $2, 'policy-v1',
             'corr_00000000-0000-4000-8000-0000000000b5', 'EXECUTED', true,
             $3, $4, $5::jsonb)`,
    [
      TENANT_A,
      'a'.repeat(64),
      OLD,
      new Date('2026-08-01T00:00:00.000Z'),
      JSON.stringify({ secret: 'SENSITIVE-APPROVAL-A' })
    ]
  )

  const insertHold = `INSERT INTO retention_holds
      (tenant_id, id, target_id, record_id, reason, authorization_ref,
       approved_by, approved_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`
  await client.query(insertHold, [
    TENANT_A,
    'hold_a_journal',
    'effect_journal',
    'fx_a_old_held',
    'synthetic hold fixture',
    'fixture-hold-order-a',
    'fixture.operator',
    new Date('2026-09-01T00:00:00.000Z')
  ])
  await client.query(insertHold, [
    TENANT_A,
    'hold_a_goal',
    'orchestrator_goals',
    'goal_a_old_held',
    'synthetic hold fixture',
    'fixture-hold-order-a',
    'fixture.operator',
    new Date('2026-09-01T00:00:00.000Z')
  ])
  await client.query(insertHold, [
    TENANT_B,
    'hold_b_journal',
    'effect_journal',
    'fx_b_old_held',
    'synthetic hold fixture',
    'fixture-hold-order-b',
    'fixture.operator',
    new Date('2026-09-01T00:00:00.000Z')
  ])
}

async function snapshotCounts(client: Client): Promise<Record<string, number>> {
  const result = await client.query<{
    effect_journal: string
    orchestrator_goals: string
  }>(
    `SELECT
       (SELECT count(*)::text FROM effect_journal) AS effect_journal,
       (SELECT count(*)::text FROM orchestrator_goals) AS orchestrator_goals`
  )
  const row = result.rows[0]!
  return {
    effect_journal: Number(row.effect_journal),
    orchestrator_goals: Number(row.orchestrator_goals)
  }
}

async function countLedger(client: Client): Promise<number> {
  const result = await client.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM retention_erasure_ledger`
  )
  return Number(result.rows[0]?.count ?? '0')
}
