import { TenantIdSchema, type TenantId } from '@cvg/platform'
import {
  CVG_TENANT_CONTEXT_SETTING,
  type PostgresPoolLike
} from '@cvg/persistence'

/**
 * Tables the PostgreSQL worker reads or writes during a controlled drain. Each
 * one must exist in the runtime schema with RLS + FORCE RLS enabled, and the
 * runtime role must not own them.
 */
export const WORKER_CRITICAL_TABLES = [
  'conversations',
  'messages',
  'sessions',
  'agent_runs',
  'tool_calls',
  'approval_requests',
  'tasks',
  'audit_events',
  'outbox_events',
  'outbox_attempts',
  'outbox_effects',
  'effect_journal',
  'runtime_approvals',
  'runtime_audit_events',
  'orchestrator_goals',
  'orchestrator_plans',
  'orchestrator_steps',
  'orchestrator_attempts',
  'orchestrator_observations',
  'orchestrator_evaluations'
] as const

export interface PostgresWorkerPreflightOptions {
  tenantId: TenantId
  /** Additional tables may be checked; the critical baseline is always kept. */
  criticalTables?: readonly string[]
}

interface RoleRow {
  rolname: string
  rolsuper: boolean
  rolbypassrls: boolean
  rolcreatedb: boolean
  rolcreaterole: boolean
  rolreplication: boolean
}

const ROLE_QUERY = `SELECT rolname, rolsuper, rolbypassrls, rolcreatedb,
                            rolcreaterole, rolreplication
                       FROM pg_roles
                      WHERE rolname = current_user
                      LIMIT 1`

/**
 * Verifies the effective PostgreSQL role and tenant-isolation schema before the
 * worker claims its first event. Environment flags never replace this query.
 *
 * The preflight borrows one pool connection, sets the tenant context, runs the
 * checks and clears the context before releasing the connection; a connection
 * whose context cannot be cleared is destroyed instead of being reused.
 */
export async function assertPostgresWorkerPreflight(
  pool: PostgresPoolLike,
  options: PostgresWorkerPreflightOptions
): Promise<void> {
  const tenantId = TenantIdSchema.parse(options.tenantId)
  const criticalTables = Array.from(
    new Set([...WORKER_CRITICAL_TABLES, ...(options.criticalTables ?? [])])
  )
  const client = await pool.connect()
  let contextSet = false
  let failure: Error | undefined

  try {
    await client.query('SELECT set_config($1, $2, false)', [
      CVG_TENANT_CONTEXT_SETTING,
      tenantId
    ])
    contextSet = true

    const roleResult = await client.query<RoleRow>(ROLE_QUERY)
    const role = roleResult.rows[0]
    if (
      !role ||
      role.rolsuper ||
      role.rolbypassrls ||
      role.rolcreatedb ||
      role.rolcreaterole ||
      role.rolreplication
    ) {
      throw new Error(
        'PostgreSQL worker role must be a non-superuser without BYPASSRLS'
      )
    }

    const memberships = await client.query<{ count: number }>(
      `SELECT count(*)::int AS count
         FROM pg_auth_members AS membership
         INNER JOIN pg_roles AS member ON member.oid = membership.member
        WHERE member.rolname = current_user`
    )
    if (Number(memberships.rows[0]?.count ?? 0) > 0) {
      throw new Error('PostgreSQL worker role must not inherit other roles')
    }

    const databaseOwner = await client.query<{ owner: string }>(
      `SELECT pg_get_userbyid(datdba) AS owner
         FROM pg_database
        WHERE datname = current_database()`
    )
    if (databaseOwner.rows[0]?.owner === role.rolname) {
      throw new Error('PostgreSQL worker role must not own the database')
    }

    const schemaPrivilege = await client.query<{ can_create: boolean }>(
      `SELECT has_schema_privilege(current_user, current_schema(), 'CREATE')
         AS can_create`
    )
    if (schemaPrivilege.rows[0]?.can_create) {
      throw new Error('PostgreSQL worker role must not create schema objects')
    }

    const tables = await client.query<{
      relname: string
      owner: string
      relrowsecurity: boolean
      relforcerowsecurity: boolean
    }>(
      `SELECT c.relname,
              pg_get_userbyid(c.relowner) AS owner,
              c.relrowsecurity,
              c.relforcerowsecurity
         FROM pg_class AS c
         INNER JOIN pg_namespace AS n ON n.oid = c.relnamespace
        WHERE n.nspname = current_schema()
          AND c.relname = ANY($1::text[])`,
      [criticalTables]
    )
    if (tables.rows.length !== criticalTables.length) {
      throw new Error(
        'PostgreSQL worker schema is missing tenant-isolated tables'
      )
    }
    if (
      tables.rows.some(
        (table) =>
          table.owner === role.rolname ||
          !table.relrowsecurity ||
          !table.relforcerowsecurity
      )
    ) {
      throw new Error(
        'PostgreSQL worker tables must be tenant-isolated and not owned by the runtime role'
      )
    }

    const policies = await client.query<{
      tablename: string
      policyname: string
      permissive: string
      roles: string
      cmd: string
      qual: string | null
      with_check: string | null
    }>(
      `SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
         FROM pg_policies
        WHERE schemaname = current_schema() AND tablename = ANY($1::text[])`,
      [criticalTables]
    )
    for (const table of criticalTables) {
      const tablePolicies = policies.rows.filter(
        (policy) => policy.tablename === table
      )
      const policy = tablePolicies[0]
      const tenantExpression =
        "tenant_id = NULLIF(current_setting('cvg.tenant_id', true), '')"
      const expected = [
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
      ].includes(table)
        ? tenantExpression
        : `tenant_isolation_quarantined = false AND ${tenantExpression}`
      if (
        tablePolicies.length !== 1 ||
        !policy ||
        policy.policyname !== `${table}_tenant_isolation` ||
        policy.permissive !== 'PERMISSIVE' ||
        policy.roles !== '{public}' ||
        policy.cmd !== 'ALL' ||
        normalizePolicyExpression(policy.qual) !== expected ||
        normalizePolicyExpression(policy.with_check) !== expected
      ) {
        throw new Error(
          'PostgreSQL worker tenant isolation policies are not verified'
        )
      }
    }

    const tablePrivileges = await client.query<{
      can_select: boolean
      can_insert: boolean
      can_update: boolean
      can_delete: boolean
      can_truncate: boolean
      can_trigger: boolean
      can_references: boolean
    }>(
      `SELECT has_table_privilege(current_user, format('%I.%I', current_schema(), table_name), 'SELECT') AS can_select,
              has_table_privilege(current_user, format('%I.%I', current_schema(), table_name), 'INSERT') AS can_insert,
              has_table_privilege(current_user, format('%I.%I', current_schema(), table_name), 'UPDATE') AS can_update,
              has_table_privilege(current_user, format('%I.%I', current_schema(), table_name), 'DELETE') AS can_delete,
              has_table_privilege(current_user, format('%I.%I', current_schema(), table_name), 'TRUNCATE') AS can_truncate,
              has_table_privilege(current_user, format('%I.%I', current_schema(), table_name), 'TRIGGER') AS can_trigger,
              has_table_privilege(current_user, format('%I.%I', current_schema(), table_name), 'REFERENCES') AS can_references
         FROM unnest($1::text[]) AS table_name`,
      [criticalTables]
    )
    if (
      tablePrivileges.rows.length !== criticalTables.length ||
      tablePrivileges.rows.some(
        (privileges) =>
          !privileges.can_select ||
          !privileges.can_insert ||
          !privileges.can_update ||
          privileges.can_delete ||
          privileges.can_truncate ||
          privileges.can_trigger ||
          privileges.can_references
      )
    ) {
      throw new Error(
        'PostgreSQL worker table privileges must be minimal (select/insert/update only)'
      )
    }
  } catch (error) {
    failure = toError(error)
  }

  let cleanupFailed = false
  if (contextSet) {
    try {
      await client.query('SELECT set_config($1, $2, false)', [
        CVG_TENANT_CONTEXT_SETTING,
        ''
      ])
      const leaked = await client.query<{ tenant_id: string | null }>(
        `SELECT NULLIF(current_setting($1, true), '') AS tenant_id`,
        [CVG_TENANT_CONTEXT_SETTING]
      )
      if (leaked.rows.length !== 1 || leaked.rows[0]?.tenant_id !== null) {
        failure ??= new Error(
          'PostgreSQL tenant context cleanup was not verified'
        )
        cleanupFailed = true
      }
    } catch (cleanupError) {
      client.release(toError(cleanupError))
      throw failure ?? toError(cleanupError)
    }
  }
  if (cleanupFailed && failure) {
    client.release(failure)
  } else {
    client.release()
  }
  if (failure) throw failure
}

function toError(error: unknown): Error {
  return error instanceof Error
    ? error
    : new Error('PostgreSQL worker role preflight failed')
}

// Matches the deparsed expressions installed by the repository migrations.
// Reject unknown policies rather than attempting arbitrary SQL equivalence.
function normalizePolicyExpression(expression: string | null): string {
  return (expression ?? '')
    .replace(/::text/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\((tenant_isolation_quarantined = false)\)/g, '$1')
    .replace(
      /\((tenant_id = NULLIF\(current_setting\('cvg\.tenant_id', true\), ''\))\)/g,
      '$1'
    )
    .replace(/^\((.*)\)$/, '$1')
}
