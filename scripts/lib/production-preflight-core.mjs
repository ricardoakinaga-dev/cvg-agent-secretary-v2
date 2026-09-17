import fs from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'

export const REQUIRED_PRODUCTION_MIGRATIONS = Object.freeze([
  '0019_orchestrator_state.sql',
  '0020_orchestrator_lineage_hardening.sql',
  '0021_orchestrator_iteration_budget.sql',
  '0022_orchestrator_evaluation_lineage.sql',
  '0023_orchestrator_replan_fencing.sql',
  '0024_tenant_isolation_constraint_validation.sql'
])

function value(env, name) {
  return env[name]?.trim() ?? ''
}

function isTrue(env, name) {
  return value(env, name).toLowerCase() === 'true'
}

function isPostgresUrl(env, name) {
  try {
    const parsed = new URL(value(env, name))
    return parsed.protocol === 'postgres:' || parsed.protocol === 'postgresql:'
  } catch {
    return false
  }
}

function isSafeSecret(env, name, minimumLength) {
  const candidate = value(env, name)
  return (
    candidate.length >= minimumLength &&
    !/replace[_-]?me|change[_-]?me|example|password/i.test(candidate)
  )
}

function isDomainId(env, name, prefix) {
  return new RegExp('^' + prefix + '_[0-9a-f-]{36}$').test(value(env, name))
}

function parseHttpsOrigins(env) {
  const raw = value(env, 'API_ALLOWED_ORIGINS')
  if (!raw) return false
  return raw.split(',').every((origin) => {
    try {
      const parsed = new URL(origin.trim())
      return parsed.protocol === 'https:' && Boolean(parsed.host)
    } catch {
      return false
    }
  })
}

function check(checks, id, pass, detail) {
  checks.push({ id, status: pass ? 'PASS' : 'FAIL', detail })
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function verifyRuntimeAttestation(env, root) {
  const relativeOrAbsolutePath = value(
    env,
    'CVG_PRODUCTION_PREFLIGHT_ATTESTATION_FILE'
  )
  const expectedDigest = value(
    env,
    'CVG_PRODUCTION_PREFLIGHT_ATTESTATION_SHA256'
  ).toLowerCase()
  if (!relativeOrAbsolutePath || !/^[0-9a-f]{64}$/.test(expectedDigest)) {
    return {
      pass: false,
      detail:
        'a hashed runtime attestation file is required; environment flags alone are not proof'
    }
  }
  const filePath = path.isAbsolute(relativeOrAbsolutePath)
    ? relativeOrAbsolutePath
    : path.resolve(root, relativeOrAbsolutePath)
  try {
    const bytes = fs.readFileSync(filePath)
    const observedDigest = sha256(bytes)
    if (observedDigest !== expectedDigest) {
      return {
        pass: false,
        detail: 'runtime attestation digest does not match the configured file'
      }
    }
    const attestation = JSON.parse(bytes.toString('utf8'))
    const now = Date.now()
    const checkedAt = Date.parse(attestation.checkedAt ?? '')
    const expiresAt = Date.parse(attestation.expiresAt ?? '')
    const requiredMigrations = new Set(
      REQUIRED_PRODUCTION_MIGRATIONS.map((migration) => migration.slice(0, -4))
    )
    const attestedMigrations = new Set(
      Array.isArray(attestation.migrations) ? attestation.migrations : []
    )
    const migrationsMatch = [...requiredMigrations].every((migration) =>
      attestedMigrations.has(migration)
    )
    const valid =
      attestation.schemaVersion === 1 &&
      attestation.kind === 'cvg-production-bootstrap-attestation' &&
      attestation.profile === 'PRODUCTION' &&
      attestation.databaseUrlSha256 === sha256(value(env, 'DATABASE_URL')) &&
      attestation.migrationDatabaseUrlSha256 ===
        sha256(value(env, 'DATABASE_MIGRATION_URL')) &&
      migrationsMatch &&
      attestation.databaseConnectivityVerified === true &&
      attestation.rlsEnforced === true &&
      attestation.constraintsValidated === true &&
      attestation.runtimeRoleVerified === true &&
      Number.isFinite(checkedAt) &&
      Number.isFinite(expiresAt) &&
      checkedAt <= now + 5 * 60 * 1000 &&
      expiresAt > now
    return {
      pass: valid,
      detail: valid
        ? 'hashed runtime attestation matches database fingerprints and validated schema claims'
        : 'runtime attestation is malformed, expired, future-dated or does not match the configured runtime'
    }
  } catch {
    return {
      pass: false,
      detail: 'runtime attestation file is unavailable or invalid JSON'
    }
  }
}

export function evaluateProductionBootstrap({
  env = process.env,
  root = path.resolve(new URL('.', import.meta.url).pathname, '../..'),
  profile = 'PRODUCTION'
} = {}) {
  const checks = []
  check(
    checks,
    'bootstrap.profile',
    String(profile).toUpperCase() === 'PRODUCTION',
    'only PRODUCTION has an authoritative bootstrap preflight'
  )
  check(
    checks,
    'bootstrap.node_env',
    value(env, 'NODE_ENV') === 'production',
    'NODE_ENV=production is required'
  )
  check(
    checks,
    'bootstrap.persistence',
    value(env, 'API_PERSISTENCE_MODE') === 'postgres',
    'API_PERSISTENCE_MODE=postgres is required'
  )
  check(
    checks,
    'bootstrap.database',
    isPostgresUrl(env, 'DATABASE_URL'),
    'DATABASE_URL must be a PostgreSQL URL'
  )
  check(
    checks,
    'bootstrap.migration_database',
    isPostgresUrl(env, 'DATABASE_MIGRATION_URL'),
    'DATABASE_MIGRATION_URL must be a separate PostgreSQL URL'
  )
  check(
    checks,
    'bootstrap.database_separation',
    isPostgresUrl(env, 'DATABASE_URL') &&
      isPostgresUrl(env, 'DATABASE_MIGRATION_URL') &&
      value(env, 'DATABASE_URL') !== value(env, 'DATABASE_MIGRATION_URL'),
    'DATABASE_URL and DATABASE_MIGRATION_URL must be distinct runtime and migration endpoints'
  )
  check(
    checks,
    'bootstrap.rls',
    isTrue(env, 'POSTGRES_RLS_ENFORCEMENT'),
    'POSTGRES_RLS_ENFORCEMENT=true is required'
  )
  check(
    checks,
    'bootstrap.no_auto_migrate',
    value(env, 'POSTGRES_AUTO_MIGRATE') === 'false',
    'POSTGRES_AUTO_MIGRATE=false is required'
  )
  check(
    checks,
    'bootstrap.kernel',
    value(env, 'CVG_WORKER_RUNTIME') === 'kernel' &&
      isTrue(env, 'CVG_DURABLE_KERNEL_ORCHESTRATOR') &&
      ['postgres', 'postgres-controlled'].includes(
        value(env, 'CVG_WORKER_QUEUE_ADAPTER')
      ),
    'durable kernel and PostgreSQL worker configuration are required'
  )
  check(
    checks,
    'bootstrap.inbound',
    isTrue(env, 'OUTBOX_DURABLE_INBOUND'),
    'OUTBOX_DURABLE_INBOUND=true is required'
  )
  check(
    checks,
    'bootstrap.identity',
    isDomainId(env, 'INBOUND_TENANT_ID', 'tenant') &&
      isDomainId(env, 'INBOUND_AGENT_ID', 'agent') &&
      isDomainId(env, 'CVG_WORKER_TENANT_ID', 'tenant') &&
      isDomainId(env, 'CVG_WORKER_AGENT_ID', 'agent'),
    'trusted inbound and worker tenant/agent identifiers are required'
  )
  check(
    checks,
    'bootstrap.secrets',
    isSafeSecret(env, 'WEBHOOK_SIGNING_SECRET', 32) &&
      isSafeSecret(env, 'OPENAI_API_KEY', 16),
    'non-placeholder webhook and provider secrets are required'
  )
  check(
    checks,
    'bootstrap.http_security',
    parseHttpsOrigins(env) && isTrue(env, 'API_REQUIRE_HTTPS'),
    'all configured origins must be HTTPS and API_REQUIRE_HTTPS=true'
  )
  check(
    checks,
    'bootstrap.governance',
    value(env, 'CVG_POLICY_MODE') === 'deny_by_default' &&
      value(env, 'CVG_RISK_POLICY') === 'required' &&
      value(env, 'CVG_APPROVAL_STORE') === 'postgres' &&
      value(env, 'CVG_EFFECT_JOURNAL') === 'postgres' &&
      Number(value(env, 'CVG_MIGRATIONS_APPLIED_AT_LEAST')) >= 23 &&
      !isTrue(env, 'CVG_ALLOW_REAL_EFFECTS') &&
      !isTrue(env, 'CVG_REAL_EFFECTS'),
    'governance stores, migrations, deny-by-default and no unrestricted effects are required'
  )
  check(
    checks,
    'bootstrap.external_attestations',
    [
      'CVG_EXTERNAL_PROVIDER_APPROVED',
      'CVG_EXTERNAL_CHANNEL_APPROVED',
      'CVG_EXTERNAL_IDENTITY_APPROVED',
      'CVG_EXTERNAL_RAG_APPROVED',
      'CVG_RPO_RTO_MEASURED',
      'CVG_SUPERVISED_PILOT_COMPLETE',
      'CVG_ROLLBACK_VERIFIED',
      'CVG_HUMAN_SIGNOFF'
    ].every((name) => isTrue(env, name)),
    'external and human attestations are required but remain separate from this local proof'
  )
  const runtimeAttestation = verifyRuntimeAttestation(env, root)
  check(
    checks,
    'bootstrap.runtime_attestation',
    runtimeAttestation.pass,
    runtimeAttestation.detail
  )
  check(
    checks,
    'bootstrap.migration_sources',
    REQUIRED_PRODUCTION_MIGRATIONS.every((file) =>
      fs.existsSync(path.join(root, 'packages/persistence/migrations', file))
    ),
    'orchestrator migration sources must be present'
  )
  const blocking = checks
    .filter((item) => item.status !== 'PASS')
    .map((item) => item.id)
  return {
    schemaVersion: 1,
    kind: 'production-bootstrap-preflight',
    profile: String(profile).toUpperCase(),
    status: blocking.length === 0 ? 'PASS' : 'FAIL',
    actualStatus: blocking.length === 0 ? 'PASS' : 'FAIL',
    sideEffects: false,
    checks,
    blocking
  }
}

export function assertProductionBootstrap(env = process.env, root) {
  if (value(env, 'NODE_ENV') !== 'production') return
  const result = evaluateProductionBootstrap({ env, ...(root ? { root } : {}) })
  if (result.status !== 'PASS') {
    throw new Error(
      'Production bootstrap preflight failed: ' + result.blocking.join(',')
    )
  }
}
