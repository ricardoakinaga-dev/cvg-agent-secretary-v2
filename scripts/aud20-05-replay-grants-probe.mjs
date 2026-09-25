#!/usr/bin/env node

import crypto from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from 'pg'

const PROBE_SCHEMA_VERSION = 1
const PROBE_KIND = 'aud20-05-postgres-replay-grants-probe'
const TABLE_NAME = 'operator_replay_events'
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])
const REQUIRED_TABLE_PRIVILEGES = Object.freeze([
  'SELECT',
  'INSERT',
  'UPDATE',
  'DELETE'
])
const FORBIDDEN_TABLE_PRIVILEGES = Object.freeze([
  'REFERENCES',
  'TRIGGER',
  'TRUNCATE'
])
const PROBE_SCENARIOS = Object.freeze([
  'valid',
  'missing_delete',
  'schema_create_granted',
  'table_truncate_granted',
  'runtime_owns_table',
  'bypass_rls',
  'role_membership'
])

class ProbeError extends Error {
  constructor(code) {
    super(code)
    this.name = 'ProbeError'
    this.code = code
  }
}

function contract(condition, code) {
  if (!condition) throw new ProbeError(code)
}

function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex')
}

function stableBoolean(value) {
  return value === true
}

function validateScenario(value) {
  const scenario = value ?? 'valid'
  contract(PROBE_SCENARIOS.includes(scenario), 'probe.scenario_invalid')
  return scenario
}

function quoteIdentifier(identifier) {
  contract(
    typeof identifier === 'string' &&
      /^[a-z_][a-z0-9_]{0,62}$/.test(identifier),
    'probe.identifier_invalid'
  )
  return `"${identifier}"`
}

function tableReference(schema) {
  return `${quoteIdentifier(schema)}.${quoteIdentifier(TABLE_NAME)}`
}

function localOnlyMetadata(parsed) {
  return {
    hostClass: 'loopback',
    port: parsed.port ? Number(parsed.port) : null,
    databaseSha256: sha256(decodeURIComponent(parsed.pathname.slice(1)))
  }
}

export function validateLocalPostgresUrl(connectionString) {
  contract(
    typeof connectionString === 'string' && connectionString.trim().length > 0,
    'connection.url_required'
  )

  let parsed
  try {
    parsed = new URL(connectionString)
  } catch {
    throw new ProbeError('connection.url_invalid')
  }

  contract(
    parsed.protocol === 'postgres:' || parsed.protocol === 'postgresql:',
    'connection.protocol_invalid'
  )
  const normalizedHost = parsed.hostname.toLowerCase()
  contract(LOCAL_HOSTS.has(normalizedHost), 'connection.local_only_required')
  contract(parsed.pathname.length > 1, 'connection.database_required')
  for (const forbiddenParameter of ['host', 'hostaddr', 'service']) {
    contract(
      !parsed.searchParams.has(forbiddenParameter),
      'connection.indirect_host_forbidden'
    )
  }
  return parsed
}

function makeNames() {
  const suffix = `${Date.now().toString(36)}_${crypto.randomBytes(5).toString('hex')}`
  return {
    schema: `aud20_05_probe_${suffix}`,
    ownerRole: `aud20_05_owner_${suffix}`,
    runtimeRole: `aud20_05_runtime_${suffix}`,
    password: crypto.randomBytes(24).toString('hex'),
    eventId: `synthetic-event-${suffix}`
  }
}

function roleConnectionString(parsed, role, password) {
  const roleUrl = new URL(parsed.toString())
  roleUrl.username = role
  roleUrl.password = password
  return roleUrl.toString()
}

function rejectResult(reason, connectionMetadata = null, scenario = null) {
  return {
    schemaVersion: PROBE_SCHEMA_VERSION,
    kind: PROBE_KIND,
    status: 'REJECTED',
    dataOrigin: 'synthetic',
    observationMode: 'disposable_local_postgres',
    environment: 'CONTROLLED_LOCAL',
    scenario,
    reason,
    connection: connectionMetadata,
    externalEffects: false,
    productSchemaTouched: false,
    notRuntimeProof: true,
    releaseEligible: false
  }
}

function passResult({ parsed, names, scenario, effective, rolePosture, dml }) {
  return {
    schemaVersion: PROBE_SCHEMA_VERSION,
    kind: PROBE_KIND,
    status: 'PASS',
    dataOrigin: 'synthetic',
    observationMode: 'disposable_local_postgres',
    environment: 'CONTROLLED_LOCAL',
    scenario,
    connection: localOnlyMetadata(parsed),
    target: {
      table: TABLE_NAME,
      schemaSha256: sha256(names.schema),
      ownerRoleSha256: sha256(names.ownerRole),
      runtimeRoleSha256: sha256(names.runtimeRole)
    },
    effectivePrivileges: effective,
    rolePosture,
    dml,
    cleanup: { status: 'PENDING' },
    disposableLocalSideEffects: true,
    externalEffects: false,
    productSchemaTouched: false,
    notRuntimeProof: true,
    releaseEligible: false
  }
}

function reasonFor(error) {
  if (error instanceof ProbeError) return error.code
  if (typeof error?.code === 'string' && /^[0-9A-Z]{5}$/.test(error.code)) {
    return `postgres.sqlstate_${error.code.toLowerCase()}`
  }
  return 'postgres.probe_failed'
}

async function queryRolePosture(admin, runtimeRole) {
  const postureResult = await admin.query(
    `
      SELECT
        rolsuper,
        rolinherit,
        rolcreaterole,
        rolcreatedb,
        rolcanlogin,
        rolreplication,
        rolbypassrls
      FROM pg_roles
      WHERE rolname = $1
    `,
    [runtimeRole]
  )
  contract(postureResult.rows.length === 1, 'role.runtime_missing')

  const membershipResult = await admin.query(
    `
      SELECT 1
      FROM pg_auth_members members
      JOIN pg_roles roles ON roles.oid = members.member
      WHERE roles.rolname = $1
      LIMIT 1
    `,
    [runtimeRole]
  )
  const posture = postureResult.rows[0]
  return {
    superuser: stableBoolean(posture.rolsuper),
    inherit: stableBoolean(posture.rolinherit),
    createRole: stableBoolean(posture.rolcreaterole),
    createDatabase: stableBoolean(posture.rolcreatedb),
    canLogin: stableBoolean(posture.rolcanlogin),
    replication: stableBoolean(posture.rolreplication),
    bypassRls: stableBoolean(posture.rolbypassrls),
    hasRoleMembership: membershipResult.rows.length > 0
  }
}

async function queryEffectivePrivileges(admin, names) {
  const qualifiedTable = `${names.schema}.${TABLE_NAME}`
  const result = await admin.query(
    `
      SELECT
        has_database_privilege($1, current_database(), 'CREATE') AS database_create,
        has_schema_privilege($1, $2, 'USAGE') AS schema_usage,
        has_schema_privilege($1, $2, 'CREATE') AS schema_create,
        ${REQUIRED_TABLE_PRIVILEGES.map(
          (privilege) =>
            `has_table_privilege($1, $3, '${privilege}') AS table_${privilege.toLowerCase()}`
        ).join(',\n        ')},
        ${FORBIDDEN_TABLE_PRIVILEGES.map(
          (privilege) =>
            `has_table_privilege($1, $3, '${privilege}') AS forbidden_${privilege.toLowerCase()}`
        ).join(',\n        ')}
      `,
    [names.runtimeRole, names.schema, qualifiedTable]
  )
  contract(result.rows.length === 1, 'privileges.query_empty')
  const row = result.rows[0]
  const table = Object.fromEntries(
    REQUIRED_TABLE_PRIVILEGES.map((privilege) => [
      privilege.toLowerCase(),
      stableBoolean(row[`table_${privilege.toLowerCase()}`])
    ])
  )
  const forbidden = Object.fromEntries(
    FORBIDDEN_TABLE_PRIVILEGES.map((privilege) => [
      privilege.toLowerCase(),
      stableBoolean(row[`forbidden_${privilege.toLowerCase()}`])
    ])
  )
  const effective = {
    database: {
      create: stableBoolean(row.database_create)
    },
    schema: {
      usage: stableBoolean(row.schema_usage),
      create: stableBoolean(row.schema_create)
    },
    table,
    forbiddenTablePrivileges: forbidden
  }

  contract(!effective.database.create, 'privileges.database_create_granted')
  contract(effective.schema.usage, 'privileges.schema_usage_missing')
  contract(!effective.schema.create, 'privileges.schema_create_granted')
  contract(
    REQUIRED_TABLE_PRIVILEGES.every(
      (privilege) => table[privilege.toLowerCase()]
    ),
    'privileges.table_crud_incomplete'
  )
  contract(
    FORBIDDEN_TABLE_PRIVILEGES.every(
      (privilege) => !forbidden[privilege.toLowerCase()]
    ),
    'privileges.table_forbidden_granted'
  )
  return effective
}

async function queryOwnership(admin, names) {
  const result = await admin.query(
    `
      SELECT
        n.nspowner::regrole::text AS schema_owner,
        c.relowner::regrole::text AS table_owner,
        c.relrowsecurity,
        c.relforcerowsecurity
      FROM pg_namespace n
      JOIN pg_class c ON c.relnamespace = n.oid
      WHERE n.nspname = $1
        AND c.relname = $2
        AND c.relkind = 'r'
    `,
    [names.schema, TABLE_NAME]
  )
  contract(result.rows.length === 1, 'ownership.target_missing')
  const row = result.rows[0]
  contract(
    row.schema_owner !== names.runtimeRole &&
      row.table_owner !== names.runtimeRole,
    'ownership.runtime_is_owner'
  )
  contract(
    row.schema_owner === names.ownerRole,
    'ownership.schema_owner_mismatch'
  )
  contract(
    row.table_owner === names.ownerRole,
    'ownership.table_owner_mismatch'
  )
  contract(names.runtimeRole !== names.ownerRole, 'ownership.runtime_is_owner')
  return {
    runtimeDistinctFromOwner: true,
    schemaOwnerMatches: true,
    tableOwnerMatches: true,
    rowSecurityEnabled: stableBoolean(row.relrowsecurity),
    forceRowSecurity: stableBoolean(row.relforcerowsecurity)
  }
}

async function exerciseDml(runtime, names) {
  const table = tableReference(names.schema)
  const issuer = 'synthetic-aud20-05-issuer'
  const jti = `synthetic-jti-${names.eventId}`
  const expiresAt = new Date(Date.now() + 60_000).toISOString()

  const inserted = await runtime.query(
    `
      INSERT INTO ${table} (event_id, issuer, jti, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING event_id
    `,
    [names.eventId, issuer, jti, expiresAt]
  )
  contract(inserted.rowCount === 1, 'dml.insert_failed')

  const selected = await runtime.query(
    `SELECT event_id FROM ${table} WHERE event_id = $1`,
    [names.eventId]
  )
  contract(selected.rowCount === 1, 'dml.select_failed')

  const updated = await runtime.query(
    `UPDATE ${table} SET touched_at = now() WHERE event_id = $1`,
    [names.eventId]
  )
  contract(updated.rowCount === 1, 'dml.update_failed')

  const deleted = await runtime.query(
    `DELETE FROM ${table} WHERE event_id = $1`,
    [names.eventId]
  )
  contract(deleted.rowCount === 1, 'dml.delete_failed')

  return {
    insert: true,
    select: true,
    update: true,
    delete: true
  }
}

async function createFixture(admin, names) {
  const owner = quoteIdentifier(names.ownerRole)
  const runtime = quoteIdentifier(names.runtimeRole)
  const schema = quoteIdentifier(names.schema)
  const table = tableReference(names.schema)

  await admin.query(
    `CREATE ROLE ${owner} NOLOGIN NOSUPERUSER NOINHERIT NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`
  )
  await admin.query(
    `CREATE ROLE ${runtime} LOGIN PASSWORD '${names.password}' NOSUPERUSER NOINHERIT NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`
  )
  await admin.query(`CREATE SCHEMA ${schema} AUTHORIZATION ${owner}`)
  await admin.query(`REVOKE ALL ON SCHEMA ${schema} FROM PUBLIC`)
  await admin.query(`CREATE TABLE ${table} (
    event_id text PRIMARY KEY,
    issuer text NOT NULL,
    jti text NOT NULL,
    expires_at timestamptz NOT NULL,
    touched_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (issuer, jti)
  )`)
  await admin.query(`ALTER TABLE ${table} OWNER TO ${owner}`)
  await admin.query(`REVOKE ALL ON ${table} FROM PUBLIC`)
  await admin.query(`GRANT USAGE ON SCHEMA ${schema} TO ${runtime}`)
  await admin.query(
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ${table} TO ${runtime}`
  )
}

async function applyScenario(admin, names, scenario) {
  const owner = quoteIdentifier(names.ownerRole)
  const runtime = quoteIdentifier(names.runtimeRole)
  const schema = quoteIdentifier(names.schema)
  const table = tableReference(names.schema)

  switch (scenario) {
    case 'valid':
      return
    case 'missing_delete':
      await admin.query(`REVOKE DELETE ON ${table} FROM ${runtime}`)
      return
    case 'schema_create_granted':
      await admin.query(`GRANT CREATE ON SCHEMA ${schema} TO ${runtime}`)
      return
    case 'table_truncate_granted':
      await admin.query(`GRANT TRUNCATE ON ${table} TO ${runtime}`)
      return
    case 'runtime_owns_table':
      await admin.query(`ALTER TABLE ${table} OWNER TO ${runtime}`)
      return
    case 'bypass_rls':
      await admin.query(`ALTER ROLE ${runtime} BYPASSRLS`)
      return
    case 'role_membership':
      await admin.query(`GRANT ${owner} TO ${runtime}`)
      return
    default:
      throw new ProbeError('probe.scenario_invalid')
  }
}

async function cleanupFixture(admin, names) {
  const schema = quoteIdentifier(names.schema)
  await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)

  for (const roleName of [names.runtimeRole, names.ownerRole]) {
    const role = quoteIdentifier(roleName)
    const roleExists = await admin.query(
      'SELECT 1 FROM pg_roles WHERE rolname = $1',
      [roleName]
    )
    if (roleExists.rows.length === 1) {
      await admin.query(`DROP OWNED BY ${role} CASCADE`)
      await admin.query(`DROP ROLE IF EXISTS ${role}`)
    }
  }
}

export async function probePostgresReplayGrants(
  connectionString,
  { scenario: requestedScenario = 'valid' } = {}
) {
  let scenario
  try {
    scenario = validateScenario(requestedScenario)
  } catch (error) {
    return rejectResult(reasonFor(error))
  }
  let parsed
  try {
    parsed = validateLocalPostgresUrl(connectionString)
  } catch (error) {
    return rejectResult(reasonFor(error), null, scenario)
  }

  const names = makeNames()
  let admin
  let runtime
  let outcome = null
  let cleanupStatus = 'NOT_RUN'
  let cleanupFailed = false

  try {
    admin = new Client({ connectionString: parsed.toString() })
    await admin.connect()
    await createFixture(admin, names)
    await applyScenario(admin, names, scenario)

    const rolePosture = await queryRolePosture(admin, names.runtimeRole)
    contract(!rolePosture.superuser, 'role.superuser')
    contract(!rolePosture.inherit, 'role.inherit')
    contract(!rolePosture.createRole, 'role.create_role')
    contract(!rolePosture.createDatabase, 'role.create_database')
    contract(rolePosture.canLogin, 'role.login_required')
    contract(!rolePosture.replication, 'role.replication')
    contract(!rolePosture.bypassRls, 'role.bypass_rls')
    contract(!rolePosture.hasRoleMembership, 'role.membership')

    const ownership = await queryOwnership(admin, names)
    const effective = await queryEffectivePrivileges(admin, names)

    runtime = new Client({
      connectionString: roleConnectionString(
        parsed,
        names.runtimeRole,
        names.password
      )
    })
    await runtime.connect()
    const identity = await runtime.query(
      'SELECT current_user = $1 AS matches_runtime_role',
      [names.runtimeRole]
    )
    contract(
      identity.rows[0]?.matches_runtime_role === true,
      'connection.runtime_role_mismatch'
    )

    const dml = await exerciseDml(runtime, names)
    outcome = passResult({
      parsed,
      names,
      scenario,
      effective: {
        ...effective,
        ownership
      },
      rolePosture,
      dml
    })
  } catch (error) {
    outcome = rejectResult(
      reasonFor(error),
      localOnlyMetadata(parsed),
      scenario
    )
  } finally {
    if (runtime) {
      try {
        await runtime.end()
      } catch {
        cleanupFailed = true
      }
    }
    if (admin) {
      try {
        await cleanupFixture(admin, names)
        cleanupStatus = 'PASS'
      } catch {
        cleanupFailed = true
        cleanupStatus = 'FAILED'
      }
      try {
        await admin.end()
      } catch {
        cleanupFailed = true
      }
    }
  }

  if (!outcome) {
    outcome = rejectResult(
      'probe.no_outcome',
      localOnlyMetadata(parsed),
      scenario
    )
  }
  if (cleanupFailed) {
    return {
      ...outcome,
      status: 'REJECTED',
      reason: outcome.status === 'PASS' ? 'cleanup.failed' : outcome.reason,
      cleanup: { status: cleanupStatus }
    }
  }
  return {
    ...outcome,
    cleanup: { status: cleanupStatus }
  }
}

function parseArgs(argv) {
  const args = {}
  for (const argument of argv) {
    if (!argument.startsWith('--')) {
      throw new ProbeError('cli.argument_invalid')
    }
    const separator = argument.indexOf('=')
    const key =
      separator === -1 ? argument.slice(2) : argument.slice(2, separator)
    const value = separator === -1 ? 'true' : argument.slice(separator + 1)
    args[key] = value
  }
  return args
}

function isMainModule() {
  return (
    process.argv[1] &&
    path.resolve(process.argv[1]) ===
      path.resolve(fileURLToPath(import.meta.url))
  )
}

if (isMainModule()) {
  let result
  let expected = 'PASS'
  try {
    const args = parseArgs(process.argv.slice(2))
    expected = args.expect ?? 'PASS'
    contract(expected === 'PASS' || expected === 'REJECT', 'cli.expect_invalid')
    contract(
      !Object.keys(args).some(
        (key) => !['expect', 'postgres-url', 'scenario'].includes(key)
      ),
      'cli.argument_invalid'
    )
    const connectionString =
      args['postgres-url'] ?? process.env.AUD20_05_LOCAL_POSTGRES_URL
    result = await probePostgresReplayGrants(connectionString, {
      scenario: args.scenario
    })
  } catch (error) {
    result = rejectResult(reasonFor(error))
  }
  process.stdout.write(`${JSON.stringify(result)}\n`)
  process.exitCode =
    (expected === 'PASS' && result.status === 'PASS') ||
    (expected === 'REJECT' && result.status === 'REJECTED')
      ? 0
      : 1
}
