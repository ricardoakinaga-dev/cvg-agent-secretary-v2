import { randomBytes } from 'node:crypto'
import { Client, Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  RETENTION_REDACTED_JSON,
  RETENTION_REDACTED_TEXT,
  INBOUND_TOMBSTONE_HORIZON_DAYS,
  INBOUND_TOMBSTONE_POLICY_APPROVAL_REF,
  INBOUND_TOMBSTONE_POLICY_APPROVED_AT,
  INBOUND_TOMBSTONE_POLICY_OWNER,
  INBOUND_TOMBSTONE_POLICY_VERSION,
  INBOUND_TOMBSTONE_POLICY_VALID_UNTIL,
  assertInboundTombstonePolicyEffective,
  createPostgresRetentionSweepStore,
  readPostgresMigrationSql,
  runPostgresMigrations,
  runTenantInboundTombstoneMinimization,
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

      const batchMigration = await readPostgresMigrationSql(
        '0028_retention_batch_semantics'
      )
      expect(batchMigration).toContain(
        'ADD COLUMN IF NOT EXISTS tombstoned_count'
      )
      expect(batchMigration).toContain('ADD COLUMN IF NOT EXISTS batch_number')
      expect(batchMigration).not.toContain('DROP TABLE')

      const applied = await admin.query<{ version: string; checksum: string }>(
        `SELECT version, checksum FROM schema_migrations WHERE version = $1`,
        ['0025_retention_ledger']
      )
      expect(applied.rows).toHaveLength(1)
      expect(applied.rows[0]?.checksum).toMatch(/^[0-9a-f]{64}$/)
      const batchApplied = await admin.query<{
        version: string
        checksum: string
      }>(`SELECT version, checksum FROM schema_migrations WHERE version = $1`, [
        '0028_retention_batch_semantics'
      ])
      expect(batchApplied.rows).toHaveLength(1)
      expect(batchApplied.rows[0]?.checksum).toMatch(/^[0-9a-f]{64}$/)
      const columns = await admin.query<{ column_name: string }>(
        `SELECT column_name
           FROM information_schema.columns
          WHERE table_schema = $1
            AND table_name = 'retention_erasure_ledger'
            AND column_name = ANY($2::text[])`,
        [schema, ['tombstoned_count', 'batch_number']]
      )
      expect(columns.rows.map((row) => row.column_name).sort()).toEqual([
        'batch_number',
        'tombstoned_count'
      ])
    }, 30_000)

    it('bounds the migration advisory lock with an explicit timeout', async () => {
      const blocker = new Client({ connectionString: testDatabaseUrl })
      await blocker.connect()
      try {
        await blocker.query('BEGIN')
        await blocker.query(
          `SELECT pg_advisory_xact_lock(hashtext('cvg-agent-secretary:migrations'))`
        )
        await expect(
          runPostgresMigrations(admin, {
            schemaName: schema,
            migrations: ['0028_retention_batch_semantics'],
            lockTimeoutMs: 50,
            statementTimeoutMs: 1_000
          })
        ).rejects.toThrow(/lock timeout|canceling statement/i)
      } finally {
        await blocker.query('ROLLBACK').catch(() => undefined)
        await blocker.end().catch(() => undefined)
      }
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

describeWithPostgres('AUD20-04 inbound dedupe retention', () => {
  const schema = `cvg_aud20_04_${Date.now()}_${randomBytes(2).toString('hex')}`
  const roleName = `cvg_aud20_04_role_${Date.now()}_${randomBytes(2).toString('hex')}`
  const rolePassword = randomBytes(18).toString('hex')
  const tenant = 'tenant_00000000-0000-4000-8000-0000000000d1'
  const tenantB = 'tenant_00000000-0000-4000-8000-0000000000d2'
  const now = new Date('2026-09-19T12:00:00.000Z')
  const old = new Date('2026-07-01T12:00:00.000Z')
  const key = `inbound:whatsapp:sha256:${'a'.repeat(64)}`
  const heldKey = `inbound:whatsapp:sha256:${'b'.repeat(64)}`
  const tenantBKey = `inbound:whatsapp:sha256:${'c'.repeat(64)}`
  const rollbackKey = `inbound:whatsapp:sha256:${'d'.repeat(64)}`
  const statementTimeoutKey = `inbound:whatsapp:sha256:${'e'.repeat(64)}`
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
    await admin.query(`GRANT USAGE ON SCHEMA ${schema} TO ${roleName}`)
    await admin.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON
       ${schema}.idempotency,
       ${schema}.retention_holds,
       ${schema}.retention_erasure_ledger
       TO ${roleName}`
    )
    await admin.query(`ALTER ROLE ${roleName} SET search_path TO ${schema}`)
    pool = new Pool({ connectionString: roleUrl, max: 2 })
    await admin.query(
      `INSERT INTO idempotency (tenant_id, key, resource_id, created_at)
       VALUES ($1, $2, $3, $4), ($5, $6, $7, $8), ($9, $10, $11, $12)`,
      [
        tenant,
        key,
        'msg_expired_fixture',
        old,
        tenant,
        heldKey,
        'msg_held_fixture',
        old,
        tenantB,
        tenantBKey,
        'msg_tenant_b_fixture',
        old
      ]
    )
    await admin.query(
      `INSERT INTO retention_holds
         (tenant_id, id, target_id, record_id, reason, authorization_ref,
          approved_by, approved_at)
       VALUES ($1, $2, 'inbound_idempotency', $3, $4, $5, $6, $7)`,
      [
        tenant,
        'hold_inbound_fixture',
        heldKey,
        'synthetic legal hold',
        'fixture-hold-order-aud20-04',
        'fixture.operator',
        new Date('2026-09-01T00:00:00.000Z')
      ]
    )
  }, 60_000)

  afterAll(async () => {
    if (!testDatabaseUrl) return
    await pool?.end().catch(() => undefined)
    await admin
      ?.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
      .catch(() => undefined)
    await admin?.query(`DROP ROLE IF EXISTS ${roleName}`).catch(() => undefined)
    await admin?.end().catch(() => undefined)
  })

  it('keeps a durable tombstone and rejects late replay after TTL', async () => {
    const policy: RetentionPolicyDeclaration = {
      targetId: 'inbound_idempotency',
      policyId: 'POL-AUD20-04-INBOUND',
      approvalRef: 'AUD20-04 synthetic retention approval',
      approvedBy: 'fixture.operator',
      approvedAt: '2026-09-01T00:00:00.000Z'
    }

    const report = await runTenantRetentionSweep(pool, {
      tenantId: tenant,
      executedBy: 'fixture.operator',
      clock: () => now,
      policies: [policy]
    })
    expect(
      report.outcomes.find(
        (outcome) => outcome.targetId === 'inbound_idempotency'
      )
    ).toMatchObject({
      status: 'EXECUTED',
      action: 'delete',
      deletedCount: 0,
      tombstonedCount: 1,
      preservedHoldCount: 1,
      batchHash: expect.stringMatching(/^[0-9a-f]{64}$/)
    })

    const tombstone = await admin.query<{
      key: string
      tombstone_digest: string | null
      tombstoned_at: Date | null
    }>(
      `SELECT key, tombstone_digest, tombstoned_at
         FROM idempotency
        WHERE tenant_id = $1 AND key = $2`,
      [tenant, key]
    )
    expect(tombstone.rows).toHaveLength(1)
    expect(tombstone.rows[0]?.tombstone_digest).toMatch(/^[0-9a-f]{64}$/)
    expect(tombstone.rows[0]?.tombstoned_at).toBeInstanceOf(Date)

    const held = await admin.query<{ tombstone_digest: string | null }>(
      `SELECT tombstone_digest
         FROM idempotency
        WHERE tenant_id = $1 AND key = $2`,
      [tenant, heldKey]
    )
    expect(held.rows[0]?.tombstone_digest).toBeNull()

    const otherTenant = await admin.query<{ tombstone_digest: string | null }>(
      `SELECT tombstone_digest
         FROM idempotency
        WHERE tenant_id = $1 AND key = $2`,
      [tenantB, tenantBKey]
    )
    expect(otherTenant.rows[0]?.tombstone_digest).toBeNull()

    await expect(
      admin.query(
        `INSERT INTO idempotency (tenant_id, key, resource_id, created_at)
         VALUES ($1, $2, $3, $4)`,
        [tenant, key, 'msg_late_replay', now]
      )
    ).rejects.toMatchObject({ code: '23505' })

    const rerun = await runTenantRetentionSweep(pool, {
      tenantId: tenant,
      executedBy: 'fixture.operator',
      clock: () => now,
      policies: [policy]
    })
    expect(
      rerun.outcomes.find(
        (outcome) => outcome.targetId === 'inbound_idempotency'
      )
    ).toMatchObject({
      status: 'EXECUTED',
      deletedCount: 0,
      tombstonedCount: 0
    })

    await admin.query(
      `INSERT INTO idempotency (tenant_id, key, resource_id, created_at)
       VALUES ($1, $2, $3, $4)`,
      [tenant, rollbackKey, 'msg_rollback_fixture', old]
    )
    const functionName = 'aud20_04_fail_inbound_ledger'
    await admin.query(`
      CREATE OR REPLACE FUNCTION ${schema}.${functionName}()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $function$
      BEGIN
        IF NEW.target_id = 'inbound_idempotency' THEN
          RAISE EXCEPTION 'synthetic AUD20-04 ledger failure';
        END IF;
        RETURN NEW;
      END
      $function$
    `)
    await admin.query(
      `CREATE TRIGGER ${functionName}_trigger
       BEFORE INSERT ON ${schema}.retention_erasure_ledger
       FOR EACH ROW EXECUTE FUNCTION ${schema}.${functionName}()`
    )
    await expect(
      runTenantRetentionSweep(pool, {
        tenantId: tenant,
        executedBy: 'fixture.operator',
        clock: () => now,
        policies: [policy]
      })
    ).rejects.toThrow('synthetic AUD20-04 ledger failure')
    await admin.query(
      `DROP TRIGGER ${functionName}_trigger ON ${schema}.retention_erasure_ledger`
    )
    await admin.query(`DROP FUNCTION ${schema}.${functionName}()`)

    const rolledBack = await admin.query<{ tombstone_digest: string | null }>(
      `SELECT tombstone_digest
         FROM idempotency
        WHERE tenant_id = $1 AND key = $2`,
      [tenant, rollbackKey]
    )
    expect(rolledBack.rows[0]?.tombstone_digest).toBeNull()

    await runTenantRetentionSweep(pool, {
      tenantId: tenant,
      executedBy: 'fixture.operator',
      clock: () => now,
      policies: [policy]
    })
    const committed = await admin.query<{ tombstone_digest: string | null }>(
      `SELECT tombstone_digest
         FROM idempotency
        WHERE tenant_id = $1 AND key = $2`,
      [tenant, rollbackKey]
    )
    expect(committed.rows[0]?.tombstone_digest).toMatch(/^[0-9a-f]{64}$/)
  })

  it('rolls back the current batch when statement timeout is exceeded', async () => {
    const policy: RetentionPolicyDeclaration = {
      targetId: 'inbound_idempotency',
      policyId: 'POL-AUD20-04-STATEMENT-TIMEOUT',
      approvalRef: 'AUD20-04 synthetic retention approval',
      approvedBy: 'fixture.operator',
      approvedAt: '2026-09-01T00:00:00.000Z'
    }
    await admin.query(
      `INSERT INTO idempotency (tenant_id, key, resource_id, created_at)
       VALUES ($1, $2, $3, $4)`,
      [tenant, statementTimeoutKey, 'msg_statement_timeout_fixture', old]
    )
    const ledgerBefore = await admin.query<{ count: string }>(
      `SELECT count(*)::text AS count
         FROM retention_erasure_ledger
        WHERE tenant_id = $1 AND target_id = 'inbound_idempotency'`,
      [tenant]
    )
    const functionName = 'aud20_04_sleep_inbound_ledger'
    const triggerName = `${functionName}_trigger`
    await admin.query(`
      CREATE OR REPLACE FUNCTION ${schema}.${functionName}()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $function$
      BEGIN
        IF NEW.target_id = 'inbound_idempotency' THEN
          PERFORM pg_sleep(0.2);
        END IF;
        RETURN NEW;
      END
      $function$
    `)
    await admin.query(`
      CREATE TRIGGER ${triggerName}
      BEFORE INSERT ON ${schema}.retention_erasure_ledger
      FOR EACH ROW EXECUTE FUNCTION ${schema}.${functionName}()
    `)

    try {
      await expect(
        runTenantRetentionSweep(pool, {
          tenantId: tenant,
          executedBy: 'fixture.operator',
          clock: () => now,
          batchSize: 1,
          maxBatches: 1,
          lockTimeoutMs: 1_000,
          statementTimeoutMs: 50,
          policies: [policy]
        })
      ).rejects.toThrow(/statement timeout|canceling statement/i)
    } finally {
      await admin
        .query(
          `DROP TRIGGER IF EXISTS ${triggerName} ON ${schema}.retention_erasure_ledger`
        )
        .catch(() => undefined)
      await admin
        .query(`DROP FUNCTION IF EXISTS ${schema}.${functionName}()`)
        .catch(() => undefined)
    }

    const row = await admin.query<{ tombstone_digest: string | null }>(
      `SELECT tombstone_digest
         FROM idempotency
        WHERE tenant_id = $1 AND key = $2`,
      [tenant, statementTimeoutKey]
    )
    expect(row.rows[0]?.tombstone_digest).toBeNull()
    const ledgerAfter = await admin.query<{ count: string }>(
      `SELECT count(*)::text AS count
         FROM retention_erasure_ledger
        WHERE tenant_id = $1 AND target_id = 'inbound_idempotency'`,
      [tenant]
    )
    expect(ledgerAfter.rows[0]?.count).toBe(ledgerBefore.rows[0]?.count)
    await admin.query(
      `DELETE FROM idempotency WHERE tenant_id = $1 AND key = $2`,
      [tenant, statementTimeoutKey]
    )
  }, 30_000)

  it('processes inbound tombstones in bounded ordered batches', async () => {
    const batchKeys = Array.from(
      { length: 5 },
      (_, index) =>
        `inbound:whatsapp:sha256:${String(index + 10).padStart(64, '0')}`
    )
    await admin.query(
      `INSERT INTO idempotency (tenant_id, key, resource_id, created_at)
       SELECT $1, key, 'msg_batch_fixture_' || row_number() OVER (), $2
       FROM unnest($3::text[]) AS rows(key)`,
      [tenant, old, batchKeys]
    )

    const report = await runTenantRetentionSweep(pool, {
      tenantId: tenant,
      executedBy: 'fixture.operator',
      clock: () => now,
      batchSize: 2,
      maxBatches: 10,
      policies: [
        {
          targetId: 'inbound_idempotency',
          policyId: 'POL-AUD20-04-BATCH',
          approvalRef: 'AUD20-04 synthetic retention approval',
          approvedBy: 'fixture.operator',
          approvedAt: '2026-09-01T00:00:00.000Z'
        }
      ]
    })

    const outcome = report.outcomes.find(
      (item) => item.targetId === 'inbound_idempotency'
    )!
    expect(outcome).toMatchObject({
      status: 'EXECUTED',
      action: 'delete',
      batchesProcessed: 3,
      complete: true,
      deletedCount: 0,
      tombstonedCount: 5
    })

    const rows = await admin.query<{
      key: string
      tombstone_digest: string | null
    }>(
      `SELECT key, tombstone_digest
         FROM idempotency
        WHERE tenant_id = $1 AND key = ANY($2::text[])
        ORDER BY key`,
      [tenant, batchKeys]
    )
    expect(rows.rows).toHaveLength(batchKeys.length)
    expect(
      rows.rows.every((row) =>
        /^[0-9a-f]{64}$/.test(row.tombstone_digest ?? '')
      )
    ).toBe(true)
  })

  it('reports an incomplete checkpoint and converges on restart', async () => {
    const batchKeys = Array.from(
      { length: 5 },
      (_, index) =>
        `inbound:whatsapp:sha256:${String(index + 100).padStart(64, '0')}`
    )
    await admin.query(
      `INSERT INTO idempotency (tenant_id, key, resource_id, created_at)
       SELECT $1, key, 'msg_restart_fixture_' || row_number() OVER (), $2
       FROM unnest($3::text[]) AS rows(key)`,
      [tenant, old, batchKeys]
    )

    const policy: RetentionPolicyDeclaration = {
      targetId: 'inbound_idempotency',
      policyId: 'POL-AUD20-04-RESTART',
      approvalRef: 'AUD20-04 synthetic retention approval',
      approvedBy: 'fixture.operator',
      approvedAt: '2026-09-01T00:00:00.000Z'
    }
    const first = await runTenantRetentionSweep(pool, {
      tenantId: tenant,
      executedBy: 'fixture.operator',
      clock: () => now,
      batchSize: 2,
      maxBatches: 1,
      policies: [policy]
    })
    expect(
      first.outcomes.find((item) => item.targetId === 'inbound_idempotency')
    ).toMatchObject({
      complete: false,
      batchesProcessed: 1,
      tombstonedCount: 2
    })

    const second = await runTenantRetentionSweep(pool, {
      tenantId: tenant,
      executedBy: 'fixture.operator',
      clock: () => now,
      batchSize: 2,
      maxBatches: 10,
      policies: [policy]
    })
    expect(
      second.outcomes.find((item) => item.targetId === 'inbound_idempotency')
    ).toMatchObject({
      complete: true,
      batchesProcessed: 2,
      tombstonedCount: 3
    })

    const rows = await admin.query<{ tombstone_digest: string | null }>(
      `SELECT tombstone_digest
         FROM idempotency
        WHERE tenant_id = $1 AND key = ANY($2::text[])`,
      [tenant, batchKeys]
    )
    expect(rows.rows).toHaveLength(batchKeys.length)
    expect(
      rows.rows.every((row) =>
        /^[0-9a-f]{64}$/.test(row.tombstone_digest ?? '')
      )
    ).toBe(true)
  })

  it('lets concurrent sweepers split rows without duplicate tombstones', async () => {
    const batchKeys = Array.from(
      { length: 7 },
      (_, index) =>
        `inbound:whatsapp:sha256:${String(index + 200).padStart(64, '0')}`
    )
    await admin.query(
      `INSERT INTO idempotency (tenant_id, key, resource_id, created_at)
       SELECT $1, key, 'msg_concurrent_fixture_' || row_number() OVER (), $2
       FROM unnest($3::text[]) AS rows(key)`,
      [tenant, old, batchKeys]
    )
    const policy: RetentionPolicyDeclaration = {
      targetId: 'inbound_idempotency',
      policyId: 'POL-AUD20-04-CONCURRENT',
      approvalRef: 'AUD20-04 synthetic retention approval',
      approvedBy: 'fixture.operator',
      approvedAt: '2026-09-01T00:00:00.000Z'
    }
    const reports = await Promise.all([
      runTenantRetentionSweep(pool, {
        tenantId: tenant,
        executedBy: 'fixture.sweeper.a',
        clock: () => now,
        batchSize: 2,
        maxBatches: 10,
        lockTimeoutMs: 1_000,
        policies: [policy]
      }),
      runTenantRetentionSweep(pool, {
        tenantId: tenant,
        executedBy: 'fixture.sweeper.b',
        clock: () => now,
        batchSize: 2,
        maxBatches: 10,
        lockTimeoutMs: 1_000,
        policies: [policy]
      })
    ])
    const inboundOutcomes = reports.map(
      (report) =>
        report.outcomes.find((item) => item.targetId === 'inbound_idempotency')!
    )
    expect(inboundOutcomes.every((outcome) => outcome.complete)).toBe(true)
    expect(
      inboundOutcomes.reduce(
        (total, outcome) => total + outcome.tombstonedCount,
        0
      )
    ).toBe(batchKeys.length)

    const rows = await admin.query<{ count: string }>(
      `SELECT count(*)::text AS count
         FROM idempotency
        WHERE tenant_id = $1
          AND key = ANY($2::text[])
          AND tombstone_digest IS NOT NULL`,
      [tenant, batchKeys]
    )
    expect(Number(rows.rows[0]?.count ?? '0')).toBe(batchKeys.length)
  }, 30_000)

  it('minimizes mature tombstones in restartable batches without reopening replay', async () => {
    expect(INBOUND_TOMBSTONE_HORIZON_DAYS).toBe(30)
    const lifecycleKeys = Array.from(
      { length: 5 },
      (_, index) =>
        `inbound:whatsapp:sha256:${String(index + 300).padStart(64, '0')}`
    )
    const recentKey = `inbound:whatsapp:sha256:${'f'.repeat(64)}`
    await admin.query(
      `INSERT INTO idempotency
         (tenant_id, key, resource_id, created_at, tombstone_digest, tombstoned_at)
       SELECT $1, key, 'msg_lifecycle_' || row_number() OVER (), $2,
              repeat('a', 64), $3
         FROM unnest($4::text[]) AS rows(key)`,
      [tenant, old, new Date('2026-07-15T12:00:00.000Z'), lifecycleKeys]
    )
    await admin.query(
      `INSERT INTO idempotency
         (tenant_id, key, resource_id, created_at, tombstone_digest, tombstoned_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        tenant,
        recentKey,
        'msg_recent_tombstone',
        old,
        'f'.repeat(64),
        new Date('2026-09-01T12:00:00.000Z')
      ]
    )

    const request = {
      tenantId: tenant,
      policyVersion: INBOUND_TOMBSTONE_POLICY_VERSION,
      batchSize: 2
    } as const
    const first = await runTenantInboundTombstoneMinimization(pool, {
      ...request,
      maxBatches: 1
    })
    expect(first).toMatchObject({
      minimizedCount: 2,
      batchesProcessed: 1,
      complete: false
    })
    const resumed = await runTenantInboundTombstoneMinimization(pool, {
      ...request,
      maxBatches: 10
    })
    expect(resumed).toMatchObject({
      minimizedCount: 3,
      batchesProcessed: 2,
      complete: true
    })

    const mature = await admin.query<{
      resource_id: string | null
      tombstone_digest: string
      tombstone_policy_version: string
    }>(
      `SELECT resource_id, tombstone_digest, tombstone_policy_version
         FROM idempotency
        WHERE tenant_id = $1 AND key = ANY($2::text[])`,
      [tenant, lifecycleKeys]
    )
    expect(mature.rows).toHaveLength(5)
    expect(
      mature.rows.every(
        (row) =>
          row.resource_id === null &&
          /^[0-9a-f]{64}$/.test(row.tombstone_digest) &&
          row.tombstone_policy_version === INBOUND_TOMBSTONE_POLICY_VERSION
      )
    ).toBe(true)
    const recent = await admin.query<{ resource_id: string | null }>(
      `SELECT resource_id FROM idempotency WHERE tenant_id = $1 AND key = $2`,
      [tenant, recentKey]
    )
    expect(recent.rows[0]?.resource_id).toBe('msg_recent_tombstone')
    const audit = await admin.query<{
      redacted_count: number
      policy_ref: string
      policy_approved_by: string
      policy_approved_at: Date
    }>(
      `SELECT redacted_count, policy_ref, policy_approved_by,
              policy_approved_at
         FROM retention_erasure_ledger
        WHERE tenant_id = $1
          AND target_id = 'inbound_idempotency'
          AND policy_id = $2
          AND reason = 'post_tombstone_resource_minimization'`,
      [tenant, INBOUND_TOMBSTONE_POLICY_VERSION]
    )
    expect(audit.rows.reduce((sum, row) => sum + row.redacted_count, 0)).toBe(5)
    expect(
      audit.rows.every(
        (row) =>
          row.policy_ref === INBOUND_TOMBSTONE_POLICY_APPROVAL_REF &&
          row.policy_approved_by === INBOUND_TOMBSTONE_POLICY_OWNER &&
          row.policy_approved_at.toISOString() ===
            INBOUND_TOMBSTONE_POLICY_APPROVED_AT
      )
    ).toBe(true)

    // An old writer can still insert resource_id, while both pre- and
    // post-minimization duplicate attempts remain fail-closed on the PK.
    const forwardKey = `inbound:whatsapp:sha256:${'9'.repeat(64)}`
    await admin.query(
      `INSERT INTO idempotency (tenant_id, key, resource_id, created_at)
       VALUES ($1, $2, $3, $4)`,
      [tenant, forwardKey, 'msg_old_writer', now]
    )
    await expect(
      admin.query(
        `INSERT INTO idempotency (tenant_id, key, resource_id, created_at)
         VALUES ($1, $2, $3, $4)`,
        [tenant, lifecycleKeys[0], 'msg_late_replay_after_minimization', now]
      )
    ).rejects.toMatchObject({ code: '23505' })
  })

  it('keeps prepared old reader/writer statements compatible across migration 0029', async () => {
    const compatSchema = `cvg_aud20_16_compat_${Date.now()}_${randomBytes(2).toString('hex')}`
    const preparedReader = 'aud20_16_old_reader'
    const preparedWriter = 'aud20_16_old_writer'
    const compatTenant = 'tenant_00000000-0000-4000-8000-0000000000e1'
    const compatKey = `inbound:whatsapp:sha256:${'8'.repeat(64)}`
    try {
      await admin.query(`CREATE SCHEMA ${compatSchema}`)
      await admin.query(`
        CREATE TABLE ${compatSchema}.idempotency (
          tenant_id text NOT NULL,
          key text NOT NULL,
          resource_id text NOT NULL,
          created_at timestamptz NOT NULL,
          tombstone_digest text,
          tombstoned_at timestamptz,
          PRIMARY KEY (tenant_id, key)
        );
        CREATE TABLE ${compatSchema}.retention_holds (
          tenant_id text NOT NULL,
          target_id text NOT NULL
        )
      `)
      await admin.query(
        `PREPARE ${preparedReader}(text, text) AS
         SELECT tenant_id, key, resource_id, created_at
           FROM ${compatSchema}.idempotency
          WHERE tenant_id = $1 AND key = $2`
      )
      await admin.query(
        `PREPARE ${preparedWriter}(text, text, text, timestamptz) AS
         INSERT INTO ${compatSchema}.idempotency
           (tenant_id, key, resource_id, created_at)
         VALUES ($1, $2, $3, $4)`
      )
      await runPostgresMigrations(admin, {
        schemaName: compatSchema,
        createSchema: false,
        migrations: ['0029_inbound_tombstone_lifecycle']
      })
      await admin.query(
        `EXECUTE ${preparedWriter}('${compatTenant}', '${compatKey}', 'msg_old_binary', '2026-07-01T00:00:00Z')`
      )
      await admin.query(
        `UPDATE ${compatSchema}.idempotency
            SET tombstone_digest = repeat('8', 64),
                tombstoned_at = '2026-07-15T00:00:00Z',
                resource_id = NULL,
                tombstone_minimized_at = '2026-09-22T01:20:00Z',
                tombstone_policy_version = 'AUD20-16-LIFECYCLE-v1'
          WHERE tenant_id = $1 AND key = $2`,
        [compatTenant, compatKey]
      )
      const oldRead = await admin.query<{ resource_id: string | null }>(
        `EXECUTE ${preparedReader}('${compatTenant}', '${compatKey}')`
      )
      expect(oldRead.rows[0]?.resource_id).toBeNull()
      await expect(
        admin.query(
          `EXECUTE ${preparedWriter}('${compatTenant}', '${compatKey}', 'msg_replay', '2026-09-22T01:30:00Z')`
        )
      ).rejects.toMatchObject({ code: '23505' })
    } finally {
      await admin.query(`DEALLOCATE ${preparedReader}`).catch(() => undefined)
      await admin.query(`DEALLOCATE ${preparedWriter}`).catch(() => undefined)
      await admin.query(`SET search_path TO ${schema}`)
      await admin.query(`DROP SCHEMA IF EXISTS ${compatSchema} CASCADE`)
    }
  })

  it('serializes inbound hold changes with lifecycle minimization', async () => {
    const contender = new Client({ connectionString: testDatabaseUrl })
    await contender.connect()
    await contender.query(`SET search_path TO ${schema}`)
    await admin.query('BEGIN')
    try {
      await admin.query(
        `SELECT pg_advisory_xact_lock(
           hashtext('AUD20-16:inbound_idempotency'), hashtext($1)
         )`,
        [tenant]
      )
      await contender.query(`SET statement_timeout = '50ms'`)
      await expect(
        contender.query(
          `INSERT INTO retention_holds
             (tenant_id, id, target_id, record_id, reason, authorization_ref,
              approved_by, approved_at)
           VALUES ($1, $2, 'inbound_idempotency', $3, $4, $5, $6, $7)`,
          [
            tenant,
            'hold_race_fixture',
            `inbound:whatsapp:sha256:${'7'.repeat(64)}`,
            'synthetic race hold',
            'AUD20-16-race-test',
            'fixture.operator',
            new Date('2026-09-22T01:09:10Z')
          ]
        )
      ).rejects.toMatchObject({ code: '57014' })
    } finally {
      await admin.query('ROLLBACK')
      await contender.end()
    }
  })

  it('fails closed outside the immutable lifecycle approval window', () => {
    expect(() =>
      assertInboundTombstonePolicyEffective(
        new Date(INBOUND_TOMBSTONE_POLICY_VALID_UNTIL)
      )
    ).not.toThrow()
    expect(() =>
      assertInboundTombstonePolicyEffective(
        new Date('2027-01-01T03:00:00.000Z')
      )
    ).toThrow('approval has expired')
    expect(() =>
      assertInboundTombstonePolicyEffective(new Date('2026-09-22T01:09:09Z'))
    ).toThrow('approval is not effective')
  })
})
