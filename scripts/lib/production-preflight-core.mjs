import fs from 'node:fs'
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import path from 'node:path'

export const REQUIRED_PRODUCTION_MIGRATIONS = Object.freeze([
  '0019_orchestrator_state.sql',
  '0020_orchestrator_lineage_hardening.sql',
  '0021_orchestrator_iteration_budget.sql',
  '0022_orchestrator_evaluation_lineage.sql',
  '0023_orchestrator_replan_fencing.sql',
  '0024_tenant_isolation_constraint_validation.sql',
  '0025_retention_ledger.sql',
  '0026_operator_replay_events.sql'
])

export const EXTERNAL_ATTESTATION_ENV = Object.freeze({
  file: 'CVG_EXTERNAL_ATTESTATION_FILE',
  sha256: 'CVG_EXTERNAL_ATTESTATION_SHA256',
  hmacKey: 'CVG_EXTERNAL_ATTESTATION_HMAC_KEY'
})

export const EXTERNAL_ATTESTATION_SCHEMA_VERSION = 1
export const EXTERNAL_ATTESTATION_KIND = 'cvg-external-signals-attestation'
export const EXTERNAL_ATTESTATION_SIGNAL_KEYS = Object.freeze([
  'provider',
  'channel',
  'identity',
  'rag',
  'rpo_rto',
  'pilot',
  'rollback',
  'human_signoff'
])
export const EXTERNAL_CANDIDATE_DIGEST_ENV = 'CVG_RELEASE_CANDIDATE_DIGEST'
const EXTERNAL_ATTESTATION_MAX_VALIDITY_MS = 90 * 24 * 60 * 60 * 1000
const EXTERNAL_ATTESTATION_CLOCK_SKEW_MS = 5 * 60 * 1000
const EXTERNAL_ATTESTATION_PLACEHOLDER =
  /replace[_-]?me|change[_-]?me|example|placeholder|todo|tbd/i

/**
 * Production configuration bound by the external attestation. Changing any of
 * these values changes `configDigest`, so an attestation issued for another
 * configuration can never authorize the current one.
 */
export const EXTERNAL_ATTESTATION_CONFIG_KEYS = Object.freeze([
  'NODE_ENV',
  'API_PERSISTENCE_MODE',
  'DATABASE_URL',
  'DATABASE_MIGRATION_URL',
  'POSTGRES_RLS_ENFORCEMENT',
  'POSTGRES_AUTO_MIGRATE',
  'CVG_WORKER_RUNTIME',
  'CVG_DURABLE_KERNEL_ORCHESTRATOR',
  'CVG_WORKER_QUEUE_ADAPTER',
  'OUTBOX_DURABLE_INBOUND',
  'INBOUND_TENANT_ID',
  'INBOUND_AGENT_ID',
  'CVG_WORKER_TENANT_ID',
  'CVG_WORKER_AGENT_ID',
  'API_ALLOWED_ORIGINS',
  'API_REQUIRE_HTTPS',
  'CVG_POLICY_MODE',
  'CVG_RISK_POLICY',
  'CVG_APPROVAL_STORE',
  'CVG_EFFECT_JOURNAL',
  'CVG_MIGRATIONS_APPLIED_AT_LEAST',
  'CVG_ALLOW_REAL_EFFECTS',
  'CVG_REAL_EFFECTS',
  'CVG_RELEASE_CANDIDATE_DIGEST'
])

export function computeExternalAttestationConfigDigest(env) {
  const config = {}
  for (const key of EXTERNAL_ATTESTATION_CONFIG_KEYS) {
    config[key] = value(env, key)
  }
  return sha256(canonicalJson(config))
}

export function computeExternalAttestationSignature(attestation, key) {
  const normalizedKey = typeof key === 'string' ? key.trim() : ''
  if (!isUsableExternalAttestationKey(normalizedKey)) {
    throw new Error('external attestation verification key is invalid')
  }
  if (
    !attestation ||
    typeof attestation !== 'object' ||
    Array.isArray(attestation)
  ) {
    throw new Error('external attestation payload is invalid')
  }
  const payload = { ...attestation }
  delete payload.signature
  return createHmac('sha256', normalizedKey)
    .update(canonicalJson(payload), 'utf8')
    .digest('hex')
}

/**
 * Versioned external evidence. A boolean environment flag is never accepted:
 * readiness only counts an APPROVED signal carried by an artifact that is
 * digest-pinned, HMAC-signed, bound to the candidate digest, the production
 * configuration digest, the environment and an owner, and still inside its
 * validity window. Every failure path returns `valid: false` without side
 * effects.
 */
export function evaluateExternalSignalsAttestation({
  env = process.env,
  root = path.resolve(new URL('.', import.meta.url).pathname, '../..'),
  profile = 'PRODUCTION'
} = {}) {
  const invalid = (reason) => ({
    valid: false,
    reason,
    owner: null,
    expiresAt: null,
    signals: emptyExternalSignals()
  })
  const relativeOrAbsolutePath = value(env, EXTERNAL_ATTESTATION_ENV.file)
  const expectedDigest = value(
    env,
    EXTERNAL_ATTESTATION_ENV.sha256
  ).toLowerCase()
  const verificationKey = value(env, EXTERNAL_ATTESTATION_ENV.hmacKey)
  if (!relativeOrAbsolutePath || !/^[0-9a-f]{64}$/.test(expectedDigest)) {
    return invalid(
      `a digest-pinned ${EXTERNAL_ATTESTATION_ENV.file} is required; boolean flags and unsupported declarations are not evidence`
    )
  }
  if (!isUsableExternalAttestationKey(verificationKey)) {
    return invalid(
      `${EXTERNAL_ATTESTATION_ENV.hmacKey} must be a non-placeholder verification key of at least 32 characters`
    )
  }
  const filePath = path.isAbsolute(relativeOrAbsolutePath)
    ? relativeOrAbsolutePath
    : path.resolve(root, relativeOrAbsolutePath)
  let bytes
  try {
    bytes = fs.readFileSync(filePath)
  } catch {
    return invalid('external attestation file is unavailable')
  }
  if (sha256(bytes) !== expectedDigest) {
    return invalid(
      'external attestation digest does not match the configured file'
    )
  }
  let attestation
  try {
    attestation = JSON.parse(bytes.toString('utf8'))
  } catch {
    return invalid('external attestation is not valid JSON')
  }
  if (
    !attestation ||
    typeof attestation !== 'object' ||
    Array.isArray(attestation)
  ) {
    return invalid('external attestation envelope is not an object')
  }

  const now = Date.now()
  const issuedAt = Date.parse(attestation.issuedAt ?? '')
  const expiresAt = Date.parse(attestation.expiresAt ?? '')
  const problems = []
  if (attestation.schemaVersion !== EXTERNAL_ATTESTATION_SCHEMA_VERSION) {
    problems.push('schemaVersion')
  }
  if (attestation.kind !== EXTERNAL_ATTESTATION_KIND) {
    problems.push('kind')
  }
  if (attestation.environment !== String(profile).toUpperCase()) {
    problems.push('environment')
  }
  if (!isUsableExternalOwner(attestation.owner)) {
    problems.push('owner')
  }
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt)) {
    problems.push('validity')
  } else {
    if (issuedAt > now + EXTERNAL_ATTESTATION_CLOCK_SKEW_MS) {
      problems.push('issued_at_future')
    }
    if (expiresAt <= now) {
      problems.push('expired')
    }
    if (
      expiresAt <= issuedAt ||
      expiresAt - issuedAt > EXTERNAL_ATTESTATION_MAX_VALIDITY_MS
    ) {
      problems.push('validity_window')
    }
  }
  const expectedCandidateDigest = value(
    env,
    EXTERNAL_CANDIDATE_DIGEST_ENV
  ).toLowerCase()
  if (
    !/^[0-9a-f]{64}$/.test(expectedCandidateDigest) ||
    attestation.candidateDigest !== expectedCandidateDigest
  ) {
    problems.push('candidate_digest')
  }
  if (
    attestation.configDigest !== computeExternalAttestationConfigDigest(env)
  ) {
    problems.push('config_digest')
  }
  const receivedSignature =
    typeof attestation.signature === 'string'
      ? attestation.signature.toLowerCase()
      : ''
  if (!/^[0-9a-f]{64}$/.test(receivedSignature)) {
    problems.push('signature')
  } else {
    let expectedSignature = ''
    try {
      expectedSignature = computeExternalAttestationSignature(
        attestation,
        verificationKey
      )
    } catch {
      problems.push('signature')
    }
    if (
      expectedSignature === '' ||
      !signaturesMatch(receivedSignature, expectedSignature)
    ) {
      problems.push('signature')
    }
  }
  const signals = emptyExternalSignals()
  const signalSource =
    attestation.signals &&
    typeof attestation.signals === 'object' &&
    !Array.isArray(attestation.signals)
      ? attestation.signals
      : {}
  for (const key of EXTERNAL_ATTESTATION_SIGNAL_KEYS) {
    const entry = signalSource[key]
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      signals[key] = null
      continue
    }
    const evidenceRef =
      typeof entry.evidenceRef === 'string' ? entry.evidenceRef.trim() : ''
    signals[key] =
      entry.status === 'APPROVED' &&
      evidenceRef.length > 0 &&
      evidenceRef.length <= 300 &&
      !EXTERNAL_ATTESTATION_PLACEHOLDER.test(evidenceRef)
        ? 'APPROVED'
        : null
  }
  if (problems.length > 0) {
    return invalid(
      `external attestation rejected: ${[...new Set(problems)].join(',')}`
    )
  }
  return {
    valid: true,
    reason:
      'signed versioned attestation matches environment, owner, validity, candidate digest and configuration digest',
    owner: attestation.owner,
    expiresAt: attestation.expiresAt,
    signals
  }
}

function emptyExternalSignals() {
  return Object.fromEntries(
    EXTERNAL_ATTESTATION_SIGNAL_KEYS.map((key) => [key, null])
  )
}

function isUsableExternalAttestationKey(candidate) {
  return (
    typeof candidate === 'string' &&
    candidate.trim().length >= 32 &&
    !EXTERNAL_ATTESTATION_PLACEHOLDER.test(candidate)
  )
}

function isUsableExternalOwner(candidate) {
  return (
    typeof candidate === 'string' &&
    candidate.trim().length >= 3 &&
    candidate.trim().length <= 160 &&
    !EXTERNAL_ATTESTATION_PLACEHOLDER.test(candidate)
  )
}

function signaturesMatch(received, expected) {
  const receivedBuffer = Buffer.from(received, 'hex')
  const expectedBuffer = Buffer.from(expected, 'hex')
  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  )
}

function canonicalJson(value) {
  if (value === null) return 'null'
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('external attestation is not JSON-safe')
    }
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(',')}]`
  }
  if (typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error('external attestation must contain plain JSON objects')
    }
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`
  }
  throw new Error('external attestation is not JSON-safe')
}

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
    'bootstrap.operator_identity',
    value(env, 'CVG_IDENTITY_MODE') !== 'simulation' &&
      isSafeSecret(env, 'CVG_OPERATOR_IDENTITY_KEYRING', 32) &&
      value(env, 'CVG_OPERATOR_REPLAY_STORE') === 'postgres',
    'trusted operator identity with a configured key ring and a distributed replay store is required in production'
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
  const externalAttestation = evaluateExternalSignalsAttestation({
    env,
    root,
    profile
  })
  check(
    checks,
    'bootstrap.external_attestation',
    externalAttestation.valid,
    externalAttestation.reason
  )
  check(
    checks,
    'bootstrap.external_attestations',
    externalAttestation.valid &&
      EXTERNAL_ATTESTATION_SIGNAL_KEYS.every(
        (signal) => externalAttestation.signals[signal] === 'APPROVED'
      ),
    'every external and human signal requires APPROVED status inside the signed, versioned attestation; boolean flags are not evidence'
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
    blocking,
    externalAttestation: {
      status: externalAttestation.valid ? 'PASS' : 'FAIL',
      reason: externalAttestation.reason,
      owner: externalAttestation.owner,
      expiresAt: externalAttestation.expiresAt,
      signals: externalAttestation.signals
    }
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
