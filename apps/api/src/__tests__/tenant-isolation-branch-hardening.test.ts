import { createHash } from 'node:crypto'
import type { QueryResult, QueryResultRow } from 'pg'
import { describe, expect, it } from 'vitest'
import {
  readPostgresMigrationSql,
  type PostgresQueryable
} from '@cvg/persistence'
import {
  assertTenantIsolationMigrationState,
  assertTenantIsolationSchema
} from '../server/tenant-isolation.ts'

const migrationVersions = [
  '0000_initial',
  '0001_tenant_isolation',
  '0002_capability_approvals',
  '0003_test_suite_catalog',
  '0004_plugin_manifest_catalog',
  '0005_knowledge_source_catalog',
  '0006_release_candidate_evidence',
  '0007_audit_evidence_checkpoint',
  '0008_session_agent_version_pin',
  '0009_release_candidate_validator_integrity',
  '0010_outbox_durability',
  '0011_outbox_payload_redaction',
  '0012_channel_effect_journal',
  '0013_runtime_effect_journal',
  '0014_journeys',
  '0015_runtime_approval_store',
  '0016_runtime_continuation_trace',
  '0017_runtime_audit_chain',
  '0018_outbox_lease_fencing',
  '0019_orchestrator_state',
  '0020_orchestrator_lineage_hardening',
  '0021_orchestrator_iteration_budget',
  '0022_orchestrator_evaluation_lineage',
  '0023_orchestrator_replan_fencing',
  '0024_tenant_isolation_constraint_validation',
  '0025_retention_ledger',
  '0026_operator_replay_events'
] as const

const tenantOnlyRlsTables = new Set([
  'outbox_effects',
  'outbox_attempts',
  'outbox_quarantine',
  'channel_effect_journal',
  'effect_journal',
  'journey_owner_drafts',
  'journey_patient_drafts',
  'journey_appointment_drafts',
  'runtime_approvals',
  'runtime_audit_events',
  'orchestrator_goals',
  'orchestrator_plans',
  'orchestrator_steps',
  'orchestrator_attempts',
  'orchestrator_observations',
  'orchestrator_evaluations'
])

const expectedExpression =
  "tenant_isolation_quarantined = false AND tenant_id = NULLIF(current_setting('cvg.tenant_id', true), '')"
const expectedTenantOnlyExpression =
  "tenant_id = NULLIF(current_setting('cvg.tenant_id', true), '')"

function queryResult<T extends QueryResultRow>(rows: T[]): QueryResult<T> {
  return {
    command: 'SELECT',
    fields: [],
    oid: 0,
    rowCount: rows.length,
    rows
  }
}

interface CatalogOptions {
  omitColumn?: (table: string, column: string) => boolean
  unvalidatedConstraint?: (name: string) => boolean
  omitIndex?: (name: string) => boolean
  policyQual?: (table: string, fallback: string) => string | null
  policyWithCheck?: (table: string, fallback: string) => string | null
}

function catalogClient(options: CatalogOptions = {}): PostgresQueryable {
  const defaultExpression = (table: string): string =>
    tenantOnlyRlsTables.has(table)
      ? expectedTenantOnlyExpression
      : expectedExpression

  return {
    async query<T extends QueryResultRow = QueryResultRow>(
      text: string,
      values?: unknown[]
    ): Promise<QueryResult<T>> {
      const names = (values?.[0] as string[] | undefined) ?? []
      if (text.includes('pg_attribute')) {
        const columnNames = (values?.[1] as string[] | undefined) ?? []
        return queryResult(
          names.flatMap((table_name) =>
            columnNames
              .filter(
                (column_name) => !options.omitColumn?.(table_name, column_name)
              )
              .map((column_name) => ({ table_name, column_name }))
          )
        ) as unknown as QueryResult<T>
      }
      if (text.includes('FROM pg_policies')) {
        return queryResult(
          names.map((tablename) => ({
            tablename,
            policyname: `${tablename}_tenant_isolation`,
            permissive: 'PERMISSIVE',
            roles: '{public}',
            cmd: 'ALL',
            qual: options.policyQual
              ? options.policyQual(tablename, defaultExpression(tablename))
              : defaultExpression(tablename),
            with_check: options.policyWithCheck
              ? options.policyWithCheck(tablename, defaultExpression(tablename))
              : defaultExpression(tablename)
          }))
        ) as unknown as QueryResult<T>
      }
      if (text.includes('FROM pg_class') && !text.includes('pg_attribute')) {
        return queryResult(
          names.map((relname) => ({
            relname,
            relrowsecurity: true,
            relforcerowsecurity: true
          }))
        ) as unknown as QueryResult<T>
      }
      if (text.includes('FROM pg_constraint')) {
        return queryResult(
          names.map((conname) => ({
            conname,
            convalidated: !(options.unvalidatedConstraint?.(conname) ?? false)
          }))
        ) as unknown as QueryResult<T>
      }
      if (text.includes('FROM pg_indexes')) {
        return queryResult(
          names
            .filter((indexname) => !(options.omitIndex?.(indexname) ?? false))
            .map((indexname) => ({ indexname }))
        ) as unknown as QueryResult<T>
      }
      throw new Error(`unexpected tenant-isolation catalog query: ${text}`)
    }
  }
}

async function migrationStateClient(
  baseline: (version: string) => {
    baseline_actor: string | null
    baseline_reference: string | null
    baseline_at: Date | null | undefined
  }
): Promise<PostgresQueryable> {
  const rows: Array<{
    version: string
    checksum: string
    applied_at: Date
    baseline_actor: string | null
    baseline_reference: string | null
    baseline_at: Date | null | undefined
  }> = []
  for (const [index, version] of migrationVersions.entries()) {
    const sql = await readPostgresMigrationSql(version)
    rows.push({
      version,
      checksum: createHash('sha256').update(sql).digest('hex'),
      applied_at: new Date(2026, 8, 20, 10, index),
      ...baseline(version)
    })
  }
  return {
    async query<T extends QueryResultRow = QueryResultRow>(): Promise<
      QueryResult<T>
    > {
      return queryResult(rows) as unknown as QueryResult<T>
    }
  }
}

const absentBaseline = () => ({
  baseline_actor: null,
  baseline_reference: null,
  baseline_at: null
})

const completeBaseline = () => ({
  baseline_actor: 'synthetic-baseline-actor',
  baseline_reference: 'synthetic-baseline-reference',
  baseline_at: new Date('2026-09-20T10:00:00.000Z')
})

describe('tenant isolation migration baseline branches', () => {
  it('accepts a fully populated baseline tuple', async () => {
    const client = await migrationStateClient(completeBaseline)

    await expect(
      assertTenantIsolationMigrationState(client)
    ).resolves.toBeUndefined()
  })

  it('rejects a baseline tuple with an explicit null field', async () => {
    const client = await migrationStateClient(() => ({
      baseline_actor: 'synthetic-baseline-actor',
      baseline_reference: null,
      baseline_at: null
    }))

    await expect(assertTenantIsolationMigrationState(client)).rejects.toThrow(
      'tenant-isolation migration state is not verified'
    )
  })

  it('rejects a baseline tuple with an undefined field', async () => {
    const client = await migrationStateClient(() => ({
      baseline_actor: 'synthetic-baseline-actor',
      baseline_reference: 'synthetic-baseline-reference',
      baseline_at: undefined
    }))

    await expect(assertTenantIsolationMigrationState(client)).rejects.toThrow(
      'tenant-isolation migration state is not verified'
    )
  })

  it('accepts an absent baseline tuple on every migration', async () => {
    const client = await migrationStateClient(absentBaseline)

    await expect(
      assertTenantIsolationMigrationState(client)
    ).resolves.toBeUndefined()
  })
})

describe('tenant isolation catalog branches', () => {
  it('accepts the complete synthetic catalog', async () => {
    await expect(
      assertTenantIsolationSchema(catalogClient())
    ).resolves.toBeUndefined()
  })

  it('rejects a table that lost its tenant_id column', async () => {
    const client = catalogClient({
      omitColumn: (table, column) =>
        table === 'conversations' && column === 'tenant_id'
    })

    await expect(assertTenantIsolationSchema(client)).rejects.toThrow(
      /tenant isolation columns are incomplete: conversations/
    )
  })

  it('rejects a session table without the version pinning columns', async () => {
    const client = catalogClient({
      omitColumn: (table, column) =>
        table === 'sessions' && column === 'agent_version_id'
    })

    await expect(assertTenantIsolationSchema(client)).rejects.toThrow(
      'session version pinning columns are incomplete'
    )
  })

  it('rejects an outbox table without payload protection columns', async () => {
    const client = catalogClient({
      omitColumn: (table, column) =>
        table === 'outbox_effects' && column === 'result_protection_version'
    })

    await expect(assertTenantIsolationSchema(client)).rejects.toThrow(
      'outbox payload protection columns are incomplete'
    )
  })

  it('rejects an outbox event without orchestration lineage columns', async () => {
    const client = catalogClient({
      omitColumn: (table, column) =>
        table === 'outbox_events' && column === 'orchestration_attempt_id'
    })

    await expect(assertTenantIsolationSchema(client)).rejects.toThrow(
      /orchestration lineage columns are incomplete: outbox_events\.orchestration_attempt_id/
    )
  })

  it('rejects an unvalidated constraint', async () => {
    const client = catalogClient({
      unvalidatedConstraint: (name) => name === 'messages_tenant_id_not_null'
    })

    await expect(assertTenantIsolationSchema(client)).rejects.toThrow(
      /constraints are missing or unvalidated: .*messages_tenant_id_not_null/
    )
  })

  it('rejects a missing index', async () => {
    const client = catalogClient({
      omitIndex: (name) => name === 'idx_conversations_tenant_id'
    })

    await expect(assertTenantIsolationSchema(client)).rejects.toThrow(
      /indexes are incomplete: idx_conversations_tenant_id/
    )
  })

  it('rejects a policy whose expression cannot be normalized', async () => {
    const client = catalogClient({
      policyQual: (table, fallback) =>
        table === 'conversations' ? null : fallback
    })

    await expect(assertTenantIsolationSchema(client)).rejects.toThrow(
      'tenant isolation policies are not fully installed'
    )
  })
})
