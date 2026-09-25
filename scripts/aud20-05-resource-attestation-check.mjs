#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const CHECK_SCHEMA_VERSION = 1
const FIXTURE_SCHEMA_VERSION = 1
const FIXTURE_KIND = 'aud20-05-resource-attestation-fixture'
const CHECK_KIND = 'aud20-05-resource-attestation-check'
const SYNTHETIC_ORIGIN = 'synthetic'
const OFFLINE_FIXTURE_MODE = 'offline_fixture'
const CONTROLLED_LOCAL_ENVIRONMENT = 'CONTROLLED_LOCAL'
const CLOCK_SKEW_MS = 5 * 60 * 1000
const MAX_ATTESTATION_VALIDITY_MS = 90 * 24 * 60 * 60 * 1000
const REQUIRED_REPLAY_GRANTS = Object.freeze([
  'DELETE',
  'INSERT',
  'SELECT',
  'UPDATE'
])
const FORBIDDEN_RUNTIME_GRANTS = Object.freeze([
  'ALTER',
  'CREATE',
  'REFERENCES',
  'TRIGGER',
  'TRUNCATE'
])
const SENSITIVE_KEY_PATTERN =
  /secret|password|token|api[_-]?key|private[_-]?key|dsn|database[_-]?url/i
const PLACEHOLDER_PATTERN =
  /replace[_-]?me|change[_-]?me|example|placeholder|todo|tbd/i

class ContractError extends Error {
  constructor(code) {
    super(code)
    this.name = 'ContractError'
    this.code = code
  }
}

function contract(condition, code) {
  if (!condition) throw new ContractError(code)
}

export function canonicalJson(value) {
  if (value === null) return 'null'
  if (typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value)
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(',')}]`
  }
  if (typeof value === 'object') {
    const entries = Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    return `{${entries.join(',')}}`
  }
  throw new ContractError('canonical_json.unsupported_value')
}

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function isSha256(value) {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value)
}

function requireSha256(value, code) {
  contract(isSha256(value), code)
  return value
}

function requireText(value, code, { min = 1, max = 300 } = {}) {
  contract(typeof value === 'string', code)
  const trimmed = value.trim()
  contract(trimmed.length >= min && trimmed.length <= max, code)
  return trimmed
}

function requireObject(value, code) {
  contract(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    code
  )
  return value
}

function requireStringArray(value, code, { min = 0 } = {}) {
  contract(Array.isArray(value) && value.length >= min, code)
  contract(
    value.every((entry) => typeof entry === 'string'),
    code
  )
  return value.map((entry) => entry.trim())
}

function assertNoSensitiveKeys(
  value,
  code,
  pathName = 'value',
  allowedKeys = new Set()
) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertNoSensitiveKeys(entry, code, `${pathName}[${index}]`, allowedKeys)
    )
    return
  }
  if (value === null || typeof value !== 'object') return
  for (const [key, child] of Object.entries(value)) {
    if (SENSITIVE_KEY_PATTERN.test(key) && !allowedKeys.has(key)) {
      throw new ContractError(`${code}.${pathName}.${key}`)
    }
    assertNoSensitiveKeys(child, code, `${pathName}.${key}`, allowedKeys)
  }
}

function validatePlainConfig(value) {
  requireObject(value, 'runtime_config.invalid')
  assertNoSensitiveKeys(value, 'runtime_config.sensitive_key')
  try {
    canonicalJson(value)
  } catch (error) {
    if (error instanceof ContractError) throw error
    throw new ContractError('runtime_config.invalid_value')
  }
  return value
}

function validateTimeWindow(attestation, nowMs) {
  const issuedAtMs = Date.parse(attestation.issuedAt ?? '')
  const expiresAtMs = Date.parse(attestation.expiresAt ?? '')
  contract(Number.isFinite(issuedAtMs), 'attestation.issued_at_invalid')
  contract(Number.isFinite(expiresAtMs), 'attestation.expires_at_invalid')
  contract(
    issuedAtMs <= nowMs + CLOCK_SKEW_MS,
    'attestation.issued_at_in_future'
  )
  contract(expiresAtMs > nowMs, 'attestation.expired')
  contract(expiresAtMs > issuedAtMs, 'attestation.window_invalid')
  contract(
    expiresAtMs - issuedAtMs <= MAX_ATTESTATION_VALIDITY_MS,
    'attestation.window_too_long'
  )
}

function validateOwner(owner) {
  const normalized = requireText(owner, 'attestation.owner_invalid', {
    min: 3,
    max: 160
  })
  contract(!PLACEHOLDER_PATTERN.test(normalized), 'attestation.owner_invalid')
  return normalized
}

function validateSecretRefs(secretRefs, code) {
  const refs = requireStringArray(secretRefs, code, { min: 1 })
  contract(
    refs.every((ref) => /^[A-Z][A-Z0-9_]*:sha256:[0-9a-f]{64}$/.test(ref)),
    code
  )
  contract(new Set(refs).size === refs.length, code)
  return refs
}

function validateKeyRingRefs(keyRingRefs, code) {
  const refs = requireStringArray(keyRingRefs, code, { min: 1 })
  contract(
    refs.every((ref) => /^kid:[A-Za-z0-9._:-]{3,80}$/.test(ref)),
    code
  )
  contract(new Set(refs).size === refs.length, code)
  return refs
}

export function computeExternalAttestationSignature(attestation, key) {
  const normalizedKey = requireText(
    key,
    'attestation.verification_key_invalid',
    {
      min: 32,
      max: 256
    }
  )
  contract(
    !PLACEHOLDER_PATTERN.test(normalizedKey),
    'attestation.verification_key_invalid'
  )
  const unsigned = { ...attestation }
  delete unsigned.signature
  return crypto
    .createHmac('sha256', normalizedKey)
    .update(canonicalJson(unsigned), 'utf8')
    .digest('hex')
}

export function computeResourceDigest({
  id,
  kind,
  observedBytesSha256,
  candidateDigest,
  configDigest,
  keyRingRefs,
  secretRefs,
  environment
}) {
  return sha256(
    canonicalJson({
      id,
      kind,
      observedBytesSha256,
      candidateDigest,
      configDigest,
      keyRingRefs: [...keyRingRefs].sort(),
      secretRefs: [...secretRefs].sort(),
      environment
    })
  )
}

function validateReplayStore(replayStore) {
  requireObject(replayStore, 'replay_store.invalid')
  contract(
    requireText(replayStore.schema, 'replay_store.schema_invalid', {
      max: 63
    }) === replayStore.schema,
    'replay_store.schema_invalid'
  )
  contract(
    replayStore.table === 'operator_replay_events',
    'replay_store.table_invalid'
  )
  const runtimeRole = requireText(
    replayStore.role,
    'replay_store.role_invalid',
    { max: 120 }
  )
  const ownerRole = requireText(
    replayStore.owner,
    'replay_store.owner_invalid',
    { max: 120 }
  )
  contract(runtimeRole !== ownerRole, 'replay_store.runtime_owns_table')
  contract(replayStore.rlsBypass === false, 'replay_store.rls_bypass')

  const grants = requireStringArray(
    replayStore.grants,
    'replay_store.grants_invalid'
  ).map((grant) => grant.toUpperCase())
  contract(
    new Set(grants).size === grants.length,
    'replay_store.grants_invalid'
  )
  contract(
    grants.every((grant) => !FORBIDDEN_RUNTIME_GRANTS.includes(grant)),
    'replay_store.forbidden_grant'
  )
  contract(
    grants.length === REQUIRED_REPLAY_GRANTS.length &&
      REQUIRED_REPLAY_GRANTS.every((grant) => grants.includes(grant)),
    'replay_store.crud_grants_incomplete'
  )
  const forbidden = requireStringArray(
    replayStore.forbiddenGrants,
    'replay_store.forbidden_grants_invalid'
  ).map((grant) => grant.toUpperCase())
  contract(
    FORBIDDEN_RUNTIME_GRANTS.every((grant) => forbidden.includes(grant)),
    'replay_store.forbidden_grants_incomplete'
  )
  contract(
    forbidden.every((grant) => !grants.includes(grant)),
    'replay_store.grant_conflict'
  )

  return {
    schema: replayStore.schema,
    table: replayStore.table,
    role: runtimeRole,
    requiredGrants: [...REQUIRED_REPLAY_GRANTS],
    forbiddenGrantsVerified: [...FORBIDDEN_RUNTIME_GRANTS]
  }
}

function validateResource(resource, context, index) {
  requireObject(resource, `resource[${index}].invalid`)
  const id = requireText(resource.id, `resource[${index}].id_invalid`, {
    max: 120
  })
  const kind = requireText(resource.kind, `resource[${index}].kind_invalid`, {
    max: 80
  })
  const bytes = requireText(
    resource.bytes,
    `resource[${index}].bytes_invalid`,
    {
      max: 16_384
    }
  )
  assertNoSensitiveKeys(
    resource,
    `resource[${index}].sensitive_key`,
    'value',
    new Set(['secretRefs'])
  )
  const observedBytesSha256 = sha256(Buffer.from(bytes, 'utf8'))
  contract(
    observedBytesSha256 === resource.declaredSha256,
    `resource[${index}].observed_digest_mismatch`
  )
  contract(
    resource.candidateDigest === context.candidateDigest,
    `resource[${index}].candidate_mismatch`
  )
  contract(
    resource.configDigest === context.configDigest,
    `resource[${index}].config_mismatch`
  )
  const keyRingRefs = validateKeyRingRefs(
    resource.keyRingRefs,
    `resource[${index}].key_ring_refs_invalid`
  )
  const secretRefs = validateSecretRefs(
    resource.secretRefs,
    `resource[${index}].secret_refs_invalid`
  )
  const resourceDigest = computeResourceDigest({
    id,
    kind,
    observedBytesSha256,
    candidateDigest: context.candidateDigest,
    configDigest: context.configDigest,
    keyRingRefs,
    secretRefs,
    environment: context.environment
  })
  contract(
    resourceDigest === resource.declaredResourceDigest,
    `resource[${index}].resource_digest_mismatch`
  )

  return {
    id,
    kind,
    observedBytesSha256,
    resourceDigest,
    candidateBound: true,
    configBound: true,
    keyRingRefsVerified: keyRingRefs.length,
    secretRefsVerified: secretRefs.length
  }
}

export function verifyResourceAttestation(input, nowMs = Date.now()) {
  try {
    requireObject(input, 'input.invalid')
    contract(
      input.schemaVersion === FIXTURE_SCHEMA_VERSION,
      'input.schema_version_invalid'
    )
    contract(input.kind === FIXTURE_KIND, 'input.kind_invalid')
    contract(input.dataOrigin === SYNTHETIC_ORIGIN, 'input.data_origin_invalid')
    contract(
      input.observationMode === OFFLINE_FIXTURE_MODE,
      'input.observation_mode_invalid'
    )
    contract(
      input.environment === CONTROLLED_LOCAL_ENVIRONMENT,
      'input.environment_invalid'
    )
    contract(Number.isFinite(nowMs), 'input.clock_invalid')

    const candidate = requireObject(input.candidate, 'candidate.invalid')
    const candidateBytes = requireText(
      candidate.bytes,
      'candidate.bytes_invalid',
      {
        max: 16_384
      }
    )
    const candidateDigest = sha256(Buffer.from(candidateBytes, 'utf8'))
    contract(
      candidateDigest === candidate.declaredSha256,
      'candidate.observed_digest_mismatch'
    )
    requireSha256(candidateDigest, 'candidate.digest_invalid')

    const runtimeConfig = validatePlainConfig(input.runtimeConfig)
    const configDigest = sha256(canonicalJson(runtimeConfig))
    requireSha256(configDigest, 'runtime_config.digest_invalid')

    const attestation = requireObject(input.attestation, 'attestation.invalid')
    contract(
      attestation.schemaVersion === CHECK_SCHEMA_VERSION,
      'attestation.schema_version_invalid'
    )
    contract(
      attestation.environment === input.environment,
      'attestation.environment_mismatch'
    )
    const owner = validateOwner(attestation.owner)
    validateTimeWindow(attestation, nowMs)
    contract(
      attestation.candidateDigest === candidateDigest,
      'attestation.candidate_mismatch'
    )
    contract(
      attestation.configDigest === configDigest,
      'attestation.config_mismatch'
    )
    const expectedSignature = computeExternalAttestationSignature(
      attestation,
      input.verificationKey
    )
    contract(
      attestation.signature === expectedSignature,
      'attestation.signature_invalid'
    )

    const context = {
      candidateDigest,
      configDigest,
      environment: input.environment
    }
    const resources = input.resources
    contract(
      Array.isArray(resources) && resources.length > 0,
      'resources.empty'
    )
    const resourceIds = new Set()
    const verifiedResources = resources.map((resource, index) => {
      const verified = validateResource(resource, context, index)
      contract(!resourceIds.has(verified.id), 'resources.duplicate_id')
      resourceIds.add(verified.id)
      return verified
    })

    const replayStore = validateReplayStore(input.replayStore)

    return {
      schemaVersion: CHECK_SCHEMA_VERSION,
      kind: CHECK_KIND,
      status: 'PASS',
      dataOrigin: SYNTHETIC_ORIGIN,
      observationMode: OFFLINE_FIXTURE_MODE,
      environment: input.environment,
      sideEffects: false,
      exchangedWithExternalSystem: false,
      notRuntimeProof: true,
      candidateDigest,
      attestation: {
        status: 'PASS',
        owner,
        expiresAt: attestation.expiresAt,
        signatureVerified: true
      },
      resources: verifiedResources,
      replayStore: {
        status: 'PASS',
        ...replayStore
      },
      redaction: {
        status: 'PASS',
        secretValuesExcluded: true,
        payloadBytesExcluded: true
      },
      releaseEligible: false
    }
  } catch (error) {
    const reason =
      error instanceof ContractError ? error.code : 'input.contract_invalid'
    return {
      schemaVersion: CHECK_SCHEMA_VERSION,
      kind: CHECK_KIND,
      status: 'REJECTED',
      sideEffects: false,
      exchangedWithExternalSystem: false,
      notRuntimeProof: true,
      reason,
      releaseEligible: false
    }
  }
}

function option(args, name, fallback = null) {
  const prefix = `--${name}=`
  const found = args.find((argument) => argument.startsWith(prefix))
  return found === undefined ? fallback : found.slice(prefix.length)
}

function emit(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const isMainModule =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMainModule) {
  const args = process.argv.slice(2)
  const inputPath = option(args, 'input')
  const expectation = (option(args, 'expect', 'PASS') ?? 'PASS').toUpperCase()

  if (inputPath === null || !['PASS', 'REJECT'].includes(expectation)) {
    emit({
      schemaVersion: CHECK_SCHEMA_VERSION,
      kind: CHECK_KIND,
      status: 'INVALID_INVOCATION',
      sideEffects: false,
      exchangedWithExternalSystem: false,
      note: 'Read-only synthetic fixture validation; no PostgreSQL, network or runtime bind is performed.'
    })
    process.exitCode = 2
  } else {
    const absolutePath = path.isAbsolute(inputPath)
      ? inputPath
      : path.resolve(root, inputPath)
    let result
    try {
      const parsed = JSON.parse(fs.readFileSync(absolutePath, 'utf8'))
      result = verifyResourceAttestation(parsed)
    } catch {
      result = {
        schemaVersion: CHECK_SCHEMA_VERSION,
        kind: CHECK_KIND,
        status: 'REJECTED',
        sideEffects: false,
        exchangedWithExternalSystem: false,
        notRuntimeProof: true,
        reason: 'input.unavailable_or_invalid_json',
        releaseEligible: false
      }
    }
    emit(result)
    const accepted = result.status === 'PASS'
    process.exitCode = (expectation === 'PASS') === accepted ? 0 : 1
  }
}
