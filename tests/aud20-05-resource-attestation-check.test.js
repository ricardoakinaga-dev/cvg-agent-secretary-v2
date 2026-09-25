import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import {
  canonicalJson,
  computeExternalAttestationSignature,
  computeResourceDigest,
  sha256,
  verifyResourceAttestation
} from '../scripts/aud20-05-resource-attestation-check.mjs'

const root = path.resolve(import.meta.dirname, '..')
const script = path.join(
  root,
  'scripts/aud20-05-resource-attestation-check.mjs'
)
const workspace = fs.mkdtempSync(
  path.join(os.tmpdir(), 'aud20-05-resource-attestation-')
)
const verificationKey = `synthetic-aud20-05-verification-key-${'k'.repeat(16)}`
const fixedNow = Date.parse('2026-09-21T23:00:00.000Z')

afterAll(() => {
  fs.rmSync(workspace, { recursive: true, force: true })
})

function baseFixture(nowMs = fixedNow) {
  const candidateBytes = 'synthetic-candidate-aud20-05-v1'
  const candidateDigest = sha256(Buffer.from(candidateBytes, 'utf8'))
  const runtimeConfig = {
    apiPersistence: 'postgres',
    identityMode: 'trusted',
    operatorReplayStore: 'postgres',
    policyMode: 'deny_by_default',
    controlledEffects: false
  }
  const configDigest = sha256(canonicalJson(runtimeConfig))
  const secretRefs = [
    `WEBHOOK_SIGNING_SECRET:sha256:${'a'.repeat(64)}`,
    `OPERATOR_IDENTITY_KEYRING:sha256:${'b'.repeat(64)}`
  ]
  const keyRingRefs = ['kid:synthetic-current']
  const resourceBase = {
    id: 'api-runtime',
    kind: 'runtime-config',
    bytes: 'synthetic-runtime-config-v1',
    candidateDigest,
    configDigest,
    keyRingRefs,
    secretRefs
  }
  const resourceDigest = computeResourceDigest({
    id: resourceBase.id,
    kind: resourceBase.kind,
    observedBytesSha256: sha256(Buffer.from(resourceBase.bytes, 'utf8')),
    candidateDigest,
    configDigest,
    keyRingRefs,
    secretRefs,
    environment: 'CONTROLLED_LOCAL'
  })
  const attestation = {
    schemaVersion: 1,
    environment: 'CONTROLLED_LOCAL',
    owner: 'synthetic.owner.aud20',
    issuedAt: new Date(nowMs - 60_000).toISOString(),
    expiresAt: new Date(nowMs + 3_600_000).toISOString(),
    candidateDigest,
    configDigest
  }
  return {
    schemaVersion: 1,
    kind: 'aud20-05-resource-attestation-fixture',
    dataOrigin: 'synthetic',
    observationMode: 'offline_fixture',
    environment: 'CONTROLLED_LOCAL',
    candidate: {
      bytes: candidateBytes,
      declaredSha256: candidateDigest
    },
    runtimeConfig,
    verificationKey,
    attestation: {
      ...attestation,
      signature: computeExternalAttestationSignature(
        attestation,
        verificationKey
      )
    },
    resources: [
      {
        ...resourceBase,
        declaredSha256: sha256(Buffer.from(resourceBase.bytes, 'utf8')),
        declaredResourceDigest: resourceDigest
      }
    ],
    replayStore: {
      schema: 'aud20_05_synthetic',
      table: 'operator_replay_events',
      role: 'runtime_synthetic',
      owner: 'migration_synthetic',
      grants: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
      forbiddenGrants: ['CREATE', 'TRUNCATE', 'TRIGGER', 'REFERENCES', 'ALTER'],
      rlsBypass: false
    }
  }
}

function writeFixture(name, input) {
  const file = path.join(workspace, name)
  fs.writeFileSync(file, JSON.stringify(input))
  return file
}

function runCli(args) {
  try {
    const stdout = execFileSync(process.execPath, [script, ...args], {
      cwd: root,
      encoding: 'utf8'
    })
    return { exitCode: 0, output: JSON.parse(stdout) }
  } catch (error) {
    return {
      exitCode: typeof error.status === 'number' ? error.status : 1,
      output: JSON.parse(error.stdout?.toString('utf8') ?? '{}')
    }
  }
}

describe('AUD20-05 offline resource attestation checker', () => {
  it('accepts a fully bound synthetic fixture and redacts raw material', () => {
    const fixture = baseFixture()
    const result = verifyResourceAttestation(fixture, fixedNow)

    expect(result).toMatchObject({
      status: 'PASS',
      dataOrigin: 'synthetic',
      observationMode: 'offline_fixture',
      notRuntimeProof: true,
      sideEffects: false,
      exchangedWithExternalSystem: false,
      releaseEligible: false,
      replayStore: {
        status: 'PASS',
        requiredGrants: ['DELETE', 'INSERT', 'SELECT', 'UPDATE']
      }
    })
    const serialized = JSON.stringify(result)
    expect(serialized).not.toContain(verificationKey)
    expect(serialized).not.toContain(fixture.candidate.bytes)
    expect(serialized).not.toContain(fixture.resources[0].secretRefs[0])
  })

  it('runs the read-only CLI with an explicit PASS expectation', () => {
    const file = writeFixture('valid.json', baseFixture(Date.now()))
    const result = runCli(['--input=' + file])

    expect(result.exitCode).toBe(0)
    expect(result.output.status).toBe('PASS')
    expect(result.output.sideEffects).toBe(false)
    expect(result.output.notRuntimeProof).toBe(true)
  })

  it('rejects missing or non-synthetic origin and never promotes it', () => {
    const missing = baseFixture()
    delete missing.dataOrigin
    expect(verifyResourceAttestation(missing, fixedNow)).toMatchObject({
      status: 'REJECTED',
      reason: 'input.data_origin_invalid'
    })

    const real = baseFixture()
    real.dataOrigin = 'real'
    const file = writeFixture('real.json', real)
    const result = runCli(['--input=' + file, '--expect=REJECT'])
    expect(result.exitCode).toBe(0)
    expect(result.output.status).toBe('REJECTED')
  })

  it('rejects self-declared or swapped candidate/resource digests', () => {
    const resourceTampered = baseFixture()
    resourceTampered.resources[0].bytes = 'swapped-resource-bytes'
    expect(verifyResourceAttestation(resourceTampered, fixedNow)).toMatchObject(
      {
        status: 'REJECTED',
        reason: 'resource[0].observed_digest_mismatch'
      }
    )

    const candidateTampered = baseFixture()
    candidateTampered.candidate.declaredSha256 = 'f'.repeat(64)
    expect(
      verifyResourceAttestation(candidateTampered, fixedNow)
    ).toMatchObject({
      status: 'REJECTED',
      reason: 'candidate.observed_digest_mismatch'
    })

    const swapped = baseFixture()
    swapped.resources[0].candidateDigest = 'e'.repeat(64)
    expect(verifyResourceAttestation(swapped, fixedNow)).toMatchObject({
      status: 'REJECTED',
      reason: 'resource[0].candidate_mismatch'
    })
  })

  it('rejects expired or tampered attestations', () => {
    const expired = baseFixture(fixedNow - 3_600_000)
    expect(verifyResourceAttestation(expired, fixedNow)).toMatchObject({
      status: 'REJECTED',
      reason: 'attestation.expired'
    })

    const tampered = baseFixture()
    tampered.attestation.signature = 'a'.repeat(64)
    expect(verifyResourceAttestation(tampered, fixedNow)).toMatchObject({
      status: 'REJECTED',
      reason: 'attestation.signature_invalid'
    })
  })

  it('rejects missing or forbidden replay-store grants', () => {
    const missingCrud = baseFixture()
    missingCrud.replayStore.grants = ['SELECT', 'INSERT', 'UPDATE']
    expect(verifyResourceAttestation(missingCrud, fixedNow)).toMatchObject({
      status: 'REJECTED',
      reason: 'replay_store.crud_grants_incomplete'
    })

    const unsafe = baseFixture()
    unsafe.replayStore.grants.push('CREATE')
    expect(verifyResourceAttestation(unsafe, fixedNow)).toMatchObject({
      status: 'REJECTED',
      reason: 'replay_store.forbidden_grant'
    })

    const owner = baseFixture()
    owner.replayStore.owner = owner.replayStore.role
    expect(verifyResourceAttestation(owner, fixedNow)).toMatchObject({
      status: 'REJECTED',
      reason: 'replay_store.runtime_owns_table'
    })
  })

  it('rejects raw secret-shaped configuration and unsafe RLS posture', () => {
    const rawSecret = baseFixture()
    rawSecret.runtimeConfig.OPENAI_API_KEY = 'synthetic-secret-value'
    expect(verifyResourceAttestation(rawSecret, fixedNow)).toMatchObject({
      status: 'REJECTED',
      reason: 'runtime_config.sensitive_key.value.OPENAI_API_KEY'
    })

    const bypass = baseFixture()
    bypass.replayStore.rlsBypass = true
    expect(verifyResourceAttestation(bypass, fixedNow)).toMatchObject({
      status: 'REJECTED',
      reason: 'replay_store.rls_bypass'
    })
  })

  it('rejects invalid invocation and unavailable input without side effects', () => {
    const invalid = runCli([])
    expect(invalid.exitCode).toBe(2)
    expect(invalid.output.status).toBe('INVALID_INVOCATION')
    expect(invalid.output.sideEffects).toBe(false)

    const missing = runCli([
      '--input=' + path.join(workspace, 'missing.json'),
      '--expect=REJECT'
    ])
    expect(missing.exitCode).toBe(0)
    expect(missing.output.status).toBe('REJECTED')
    expect(missing.output.reason).toBe('input.unavailable_or_invalid_json')
  })
})
