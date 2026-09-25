import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import type { TenantId } from '@cvg/platform'
import {
  CVG_TENANT_CONTEXT_SETTING,
  readPostgresMigrationSql,
  type PostgresPoolLike
} from '@cvg/persistence'
import {
  assertPostgresWorkerPreflight,
  WORKER_CRITICAL_TABLES,
  WORKER_REQUIRED_CONSTRAINTS,
  WORKER_REQUIRED_MIGRATIONS
} from '../postgres-role-preflight.ts'

type Row = Record<string, unknown>

const TENANT = 'tenant_00000000-0000-4000-8000-000000000901' as TenantId
const RUNTIME_ROLE = 'cvg_worker_runtime'
const ADMIN_ROLE = 'cvg_worker_admin'

const TENANT_EXPRESSION =
  "tenant_id = NULLIF(current_setting('cvg.tenant_id', true), '')"
// Mirrors the source list: these tables carry the plain tenant expression;
// every other critical table also requires the quarantine flag to be false.
const PLAIN_EXPRESSION_TABLES = [
  'outbox_effects',
  'outbox_attempts',
  'effect_journal',
  'runtime_approvals',
  'runtime_audit_events',
  'orchestrator_goals',
  'orchestrator_plans',
  'orchestrator_steps',
  'orchestrator_attempts',
  'orchestrator_observations',
  'orchestrator_evaluations'
]

function policyExpression(table: string): string {
  return PLAIN_EXPRESSION_TABLES.includes(table)
    ? TENANT_EXPRESSION
    : `tenant_isolation_quarantined = false AND ${TENANT_EXPRESSION}`
}

function policyRow(table: string): Row {
  const expression = policyExpression(table)
  return {
    tablename: table,
    policyname: `${table}_tenant_isolation`,
    permissive: 'PERMISSIVE',
    roles: '{public}',
    cmd: 'ALL',
    qual: expression,
    with_check: expression
  }
}

function roleRow(overrides: Row = {}): Row {
  return {
    rolname: RUNTIME_ROLE,
    rolsuper: false,
    rolbypassrls: false,
    rolcreatedb: false,
    rolcreaterole: false,
    rolreplication: false,
    ...overrides
  }
}

async function migrationRows(): Promise<Row[]> {
  let appliedAt = Date.parse('2026-01-01T00:00:00Z')
  const rows: Row[] = []
  for (const version of WORKER_REQUIRED_MIGRATIONS) {
    const checksum = createHash('sha256')
      .update(await readPostgresMigrationSql(version))
      .digest('hex')
    appliedAt += 60_000
    rows.push({ version, checksum, applied_at: new Date(appliedAt) })
  }
  return rows
}

async function baseHandler(
  text: string,
  values: readonly unknown[]
): Promise<Row[]> {
  if (text.includes('set_config')) return []
  if (text.includes('FROM pg_roles')) return [roleRow()]
  if (text.includes('FROM pg_auth_members')) return [{ count: 0 }]
  if (text.includes('FROM pg_database')) return [{ owner: ADMIN_ROLE }]
  if (text.includes('has_schema_privilege')) return [{ can_create: false }]
  if (text.includes('FROM pg_class')) {
    const tables = (values[0] as string[] | undefined) ?? [
      ...WORKER_CRITICAL_TABLES
    ]
    return tables.map((relname) => ({
      relname,
      owner: ADMIN_ROLE,
      relrowsecurity: true,
      relforcerowsecurity: true
    }))
  }
  if (text.includes('FROM schema_migrations')) return migrationRows()
  if (text.includes('FROM pg_constraint')) {
    return WORKER_REQUIRED_CONSTRAINTS.map((conname) => ({
      conname,
      convalidated: true
    }))
  }
  if (text.includes('FROM pg_policies')) {
    const tables = (values[0] as string[] | undefined) ?? [
      ...WORKER_CRITICAL_TABLES
    ]
    return tables.map(policyRow)
  }
  if (text.includes('AS table_name')) {
    const tables = (values[0] as string[] | undefined) ?? [
      ...WORKER_CRITICAL_TABLES
    ]
    return tables.map(() => ({
      can_select: true,
      can_insert: true,
      can_update: true,
      can_delete: false,
      can_truncate: false,
      can_trigger: false,
      can_references: false
    }))
  }
  if (text.includes('current_setting($1, true)')) return [{ tenant_id: null }]
  throw new Error(`unexpected preflight query: ${text.slice(0, 48)}`)
}

type Override = (text: string, rows: Row[]) => Row[] | null

function withOverride(override: Override) {
  return async (text: string, values: readonly unknown[]): Promise<Row[]> => {
    const rows = await baseHandler(text, values)
    return override(text, rows) ?? rows
  }
}

type FakeHandler = (
  text: string,
  values: readonly unknown[]
) => Promise<Row[]> | Row[]

function makeFakePool(handler: FakeHandler) {
  const releases: Array<Error | undefined> = []
  const client = {
    async query<T>(text: string, values?: unknown[]) {
      const rows = await handler(text, values ?? [])
      return { rows: rows as unknown as T[] }
    },
    release(error?: Error) {
      releases.push(error)
    }
  }
  const pool = { connect: async () => client }
  return { pool: pool as unknown as PostgresPoolLike, releases }
}

const run = (handler: FakeHandler, criticalTables?: readonly string[]) => {
  const { pool, releases } = makeFakePool(handler)
  const options =
    criticalTables === undefined
      ? { tenantId: TENANT }
      : { tenantId: TENANT, criticalTables }
  return {
    releases,
    promise: assertPostgresWorkerPreflight(pool, options)
  }
}

describe('worker preflight fake-pool contract (no database)', () => {
  it('accepts a minimal role, extra critical tables and releases cleanly', async () => {
    const { releases, promise } = run(baseHandler, ['extra_table'])

    await expect(promise).resolves.toBeUndefined()
    expect(releases).toEqual([undefined])
  })

  it('keeps the tenant context setting name stable for the cleanup check', () => {
    expect(CVG_TENANT_CONTEXT_SETTING).toBe('cvg.tenant_id')
  })

  for (const flag of [
    'rolsuper',
    'rolbypassrls',
    'rolcreatedb',
    'rolcreaterole',
    'rolreplication'
  ] as const) {
    it(`rejects a role flagged ${flag}`, async () => {
      const { releases, promise } = run(
        withOverride((text) =>
          text.includes('FROM pg_roles') ? [roleRow({ [flag]: true })] : null
        )
      )

      await expect(promise).rejects.toThrow(/non-superuser without BYPASSRLS/)
      expect(releases).toEqual([undefined])
    })
  }

  it('rejects an empty role result and non-Error failures', async () => {
    const empty = run(
      withOverride((text) => (text.includes('FROM pg_roles') ? [] : null))
    )
    await expect(empty.promise).rejects.toThrow(
      /non-superuser without BYPASSRLS/
    )

    const thrown = run(async (text) => {
      if (text.includes('FROM pg_roles')) throw 'synthetic-string-failure'
      return baseHandler(text, [])
    })
    await expect(thrown.promise).rejects.toThrow(
      'PostgreSQL worker role preflight failed'
    )
  })

  it('rejects a role that inherits other roles and tolerates an empty count', async () => {
    const inherited = run(
      withOverride((text) =>
        text.includes('FROM pg_auth_members') ? [{ count: 1 }] : null
      )
    )
    await expect(inherited.promise).rejects.toThrow(
      /must not inherit other roles/
    )

    const emptyCount = run(
      withOverride((text) =>
        text.includes('FROM pg_auth_members') ? [] : null
      )
    )
    await expect(emptyCount.promise).resolves.toBeUndefined()
  })

  it('rejects the database owner but tolerates a missing owner row', async () => {
    const owner = run(
      withOverride((text) =>
        text.includes('FROM pg_database') ? [{ owner: RUNTIME_ROLE }] : null
      )
    )
    await expect(owner.promise).rejects.toThrow(/must not own the database/)

    const missingOwner = run(
      withOverride((text) => (text.includes('FROM pg_database') ? [] : null))
    )
    await expect(missingOwner.promise).resolves.toBeUndefined()
  })

  it('rejects schema CREATE privilege but tolerates a missing privilege row', async () => {
    const canCreate = run(
      withOverride((text) =>
        text.includes('has_schema_privilege') ? [{ can_create: true }] : null
      )
    )
    await expect(canCreate.promise).rejects.toThrow(/must not create schema/)

    const missing = run(
      withOverride((text) =>
        text.includes('has_schema_privilege') ? [] : null
      )
    )
    await expect(missing.promise).resolves.toBeUndefined()
  })

  it('rejects missing tables, runtime ownership, and missing RLS flags', async () => {
    const missing = run(
      withOverride((text, rows) =>
        text.includes('FROM pg_class') ? rows.slice(1) : null
      )
    )
    await expect(missing.promise).rejects.toThrow(/missing tenant-isolated/)

    const owned = run(
      withOverride((text, rows) =>
        text.includes('FROM pg_class')
          ? [{ ...rows[0], owner: RUNTIME_ROLE }, ...rows.slice(1)]
          : null
      )
    )
    await expect(owned.promise).rejects.toThrow(/tenant-isolated and not owned/)

    const noRls = run(
      withOverride((text, rows) =>
        text.includes('FROM pg_class')
          ? [{ ...rows[0], relrowsecurity: false }, ...rows.slice(1)]
          : null
      )
    )
    await expect(noRls.promise).rejects.toThrow(/tenant-isolated and not owned/)

    const noForceRls = run(
      withOverride((text, rows) =>
        text.includes('FROM pg_class')
          ? [{ ...rows[0], relforcerowsecurity: false }, ...rows.slice(1)]
          : null
      )
    )
    await expect(noForceRls.promise).rejects.toThrow(
      /tenant-isolated and not owned/
    )
  })

  it('rejects missing, stale, invalid and out-of-order migrations', async () => {
    const missing = run(
      withOverride((text, rows) =>
        text.includes('FROM schema_migrations') ? rows.slice(1) : null
      )
    )
    await expect(missing.promise).rejects.toThrow(
      /missing, stale or out of order/
    )

    const stale = run(
      withOverride((text, rows) =>
        text.includes('FROM schema_migrations')
          ? [{ ...rows[0], checksum: 'f'.repeat(64) }, ...rows.slice(1)]
          : null
      )
    )
    await expect(stale.promise).rejects.toThrow(
      /missing, stale or out of order/
    )

    const invalidDate = run(
      withOverride((text, rows) =>
        text.includes('FROM schema_migrations')
          ? [{ ...rows[0], applied_at: 'not-a-date' }, ...rows.slice(1)]
          : null
      )
    )
    await expect(invalidDate.promise).rejects.toThrow(
      /missing, stale or out of order/
    )

    const outOfOrder = run(
      withOverride((text, rows) =>
        text.includes('FROM schema_migrations')
          ? [
              { ...rows[0], applied_at: new Date('2030-01-01T00:00:00Z') },
              { ...rows[1], applied_at: new Date('2026-01-01T00:00:00Z') },
              ...rows.slice(2)
            ]
          : null
      )
    )
    await expect(outOfOrder.promise).rejects.toThrow(
      /missing, stale or out of order/
    )
  })

  it('accepts string applied_at timestamps in ascending order', async () => {
    const strings = run(
      withOverride((text, rows) =>
        text.includes('FROM schema_migrations')
          ? rows.map((row) => ({
              ...row,
              applied_at: (row.applied_at as Date).toISOString()
            }))
          : null
      )
    )
    await expect(strings.promise).resolves.toBeUndefined()
  })

  it('rejects missing or unvalidated constraints', async () => {
    const missing = run(
      withOverride((text, rows) =>
        text.includes('FROM pg_constraint') ? rows.slice(1) : null
      )
    )
    await expect(missing.promise).rejects.toThrow(/missing or unvalidated/)

    const unvalidated = run(
      withOverride((text, rows) =>
        text.includes('FROM pg_constraint')
          ? [{ ...rows[0], convalidated: false }, ...rows.slice(1)]
          : null
      )
    )
    await expect(unvalidated.promise).rejects.toThrow(/missing or unvalidated/)
  })

  it('rejects missing, duplicated or malformed tenant isolation policies', async () => {
    const none = run(
      withOverride((text, rows) =>
        text.includes('FROM pg_policies') ? rows.slice(1) : null
      )
    )
    await expect(none.promise).rejects.toThrow(/policies are not verified/)

    const duplicated = run(
      withOverride((text, rows) =>
        text.includes('FROM pg_policies') ? rows.slice(0, 2) : null
      )
    )
    await expect(duplicated.promise).rejects.toThrow(
      /policies are not verified/
    )

    const named = run(
      withOverride((text, rows) =>
        text.includes('FROM pg_policies')
          ? [{ ...rows[0], policyname: 'wrong_name' }, ...rows.slice(1)]
          : null
      )
    )
    await expect(named.promise).rejects.toThrow(/policies are not verified/)

    const permissive = run(
      withOverride((text, rows) =>
        text.includes('FROM pg_policies')
          ? [{ ...rows[0], permissive: 'RESTRICTIVE' }, ...rows.slice(1)]
          : null
      )
    )
    await expect(permissive.promise).rejects.toThrow(
      /policies are not verified/
    )

    const roles = run(
      withOverride((text, rows) =>
        text.includes('FROM pg_policies')
          ? [{ ...rows[0], roles: `{${RUNTIME_ROLE}}` }, ...rows.slice(1)]
          : null
      )
    )
    await expect(roles.promise).rejects.toThrow(/policies are not verified/)

    const command = run(
      withOverride((text, rows) =>
        text.includes('FROM pg_policies')
          ? [{ ...rows[0], cmd: 'SELECT' }, ...rows.slice(1)]
          : null
      )
    )
    await expect(command.promise).rejects.toThrow(/policies are not verified/)

    const noQual = run(
      withOverride((text, rows) =>
        text.includes('FROM pg_policies')
          ? [{ ...rows[0], qual: null }, ...rows.slice(1)]
          : null
      )
    )
    await expect(noQual.promise).rejects.toThrow(/policies are not verified/)

    const noCheck = run(
      withOverride((text, rows) =>
        text.includes('FROM pg_policies')
          ? [{ ...rows[0], with_check: null }, ...rows.slice(1)]
          : null
      )
    )
    await expect(noCheck.promise).rejects.toThrow(/policies are not verified/)
  })

  it('accepts deparsed policy expressions in the documented forms', async () => {
    const singleParen = run(
      withOverride((text, rows) => {
        if (!text.includes('FROM pg_policies')) return null
        return rows.map((row) => {
          const table = row.tablename as string
          const expression = PLAIN_EXPRESSION_TABLES.includes(table)
            ? "(tenant_id = NULLIF(current_setting('cvg.tenant_id'::text, true), ''::text))"
            : "(tenant_isolation_quarantined = false AND tenant_id = NULLIF(current_setting('cvg.tenant_id'::text, true), ''::text))"
          return { ...row, qual: expression, with_check: expression }
        })
      })
    )
    await expect(singleParen.promise).resolves.toBeUndefined()

    const splitParen = run(
      withOverride((text, rows) => {
        if (!text.includes('FROM pg_policies')) return null
        return rows.map((row) => {
          const table = row.tablename as string
          const expression = PLAIN_EXPRESSION_TABLES.includes(table)
            ? `((tenant_id = NULLIF(current_setting('cvg.tenant_id', true), '')))`
            : `(tenant_isolation_quarantined = false) AND (tenant_id = NULLIF(current_setting('cvg.tenant_id', true), ''))`
          return { ...row, qual: expression, with_check: expression }
        })
      })
    )
    await expect(splitParen.promise).resolves.toBeUndefined()
  })

  it('rejects missing and forbidden table privileges', async () => {
    const missing = run(
      withOverride((text, rows) =>
        text.includes('AS table_name') ? rows.slice(1) : null
      )
    )
    await expect(missing.promise).rejects.toThrow(/privileges must be minimal/)

    for (const forbidden of [
      'can_delete',
      'can_truncate',
      'can_trigger',
      'can_references'
    ]) {
      const { promise } = run(
        withOverride((text, rows) =>
          text.includes('AS table_name')
            ? [{ ...rows[0], [forbidden]: true }, ...rows.slice(1)]
            : null
        )
      )
      await expect(promise).rejects.toThrow(/privileges must be minimal/)
    }

    for (const required of ['can_select', 'can_insert', 'can_update']) {
      const { promise } = run(
        withOverride((text, rows) =>
          text.includes('AS table_name')
            ? [{ ...rows[0], [required]: false }, ...rows.slice(1)]
            : null
        )
      )
      await expect(promise).rejects.toThrow(/privileges must be minimal/)
    }
  })

  it('skips cleanup when the tenant context was never set', async () => {
    const { releases, promise } = run(async (text, values) => {
      if (text.includes('set_config')) {
        throw new Error('set_config unavailable')
      }
      return baseHandler(text, values)
    })

    await expect(promise).rejects.toThrow('set_config unavailable')
    expect(releases).toEqual([undefined])
  })

  it('flags unverified tenant context cleanup', async () => {
    const emptyLeak = run(async (text, values) => {
      if (text.includes('current_setting($1, true)')) return []
      return baseHandler(text, values)
    })
    const emptyFailure = await emptyLeak.promise.catch(
      (error: unknown) => error
    )
    expect(emptyFailure).toBeInstanceOf(Error)
    expect((emptyFailure as Error).message).toMatch(/cleanup was not verified/)
    expect(emptyLeak.releases).toEqual([emptyFailure])

    const leaked = run(async (text, values) => {
      if (text.includes('current_setting($1, true)')) {
        return [{ tenant_id: 'tenant_leaked' }]
      }
      return baseHandler(text, values)
    })
    await expect(leaked.promise).rejects.toThrow(/cleanup was not verified/)
    expect(leaked.releases[0]).toBeInstanceOf(Error)
  })

  it('destroys the connection when cleanup fails after another failure', async () => {
    let clearCalls = 0
    const { releases, promise } = run(async (text, values) => {
      if (text.includes('set_config')) {
        clearCalls += 1
        if (clearCalls === 2) throw new Error('clear failed')
        return []
      }
      if (text.includes('FROM pg_roles')) return [roleRow({ rolsuper: true })]
      return baseHandler(text, values)
    })

    await expect(promise).rejects.toThrow(/non-superuser without BYPASSRLS/)
    expect(releases).toHaveLength(1)
    expect((releases[0] as Error).message).toBe('clear failed')
  })

  it('destroys the connection when only cleanup fails', async () => {
    let clearCalls = 0
    const { releases, promise } = run(async (text, values) => {
      if (text.includes('set_config')) {
        clearCalls += 1
        if (clearCalls === 2) throw new Error('only clear failed')
        return []
      }
      return baseHandler(text, values)
    })

    await expect(promise).rejects.toThrow('only clear failed')
    expect((releases[0] as Error).message).toBe('only clear failed')
  })
})
