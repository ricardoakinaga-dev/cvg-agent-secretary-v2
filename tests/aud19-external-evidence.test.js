import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'
import {
  EXTERNAL_ATTESTATION_ENV,
  EXTERNAL_ATTESTATION_SIGNAL_KEYS,
  EXTERNAL_CANDIDATE_DIGEST_ENV,
  computeExternalAttestationConfigDigest,
  computeExternalAttestationSignature
} from '../scripts/lib/production-preflight-core.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const script = path.join(root, 'scripts/aud19-external-evidence-check.mjs')
const workspace = fs.mkdtempSync(
  path.join(os.tmpdir(), 'aud19-external-evidence-')
)
const key = `aud19-external-check-key-${'k'.repeat(16)}`
const candidateDigest = 'e'.repeat(64)

afterAll(() => {
  fs.rmSync(workspace, { recursive: true, force: true })
})

function baseEnv(overrides = {}) {
  return {
    [EXTERNAL_ATTESTATION_ENV.hmacKey]: key,
    [EXTERNAL_CANDIDATE_DIGEST_ENV]: candidateDigest,
    NODE_ENV: 'test',
    ...overrides
  }
}

function attestationBytes(env, overrides = {}) {
  const now = Date.now()
  const attestation = {
    schemaVersion: 1,
    kind: 'cvg-external-signals-attestation',
    environment: 'PRODUCTION',
    owner: 'authority.aud19.external',
    issuedAt: new Date(now - 60_000).toISOString(),
    expiresAt: new Date(now + 3_600_000).toISOString(),
    candidateDigest,
    configDigest: computeExternalAttestationConfigDigest(env),
    signals: Object.fromEntries(
      EXTERNAL_ATTESTATION_SIGNAL_KEYS.map((signal) => [
        signal,
        { status: 'APPROVED', evidenceRef: `controlled://dossier/${signal}` }
      ])
    ),
    ...overrides
  }
  if (typeof attestation.signature !== 'string') {
    attestation.signature = computeExternalAttestationSignature(
      attestation,
      key
    )
  }
  return Buffer.from(JSON.stringify(attestation))
}

function run(args) {
  try {
    const stdout = execFileSync(process.execPath, [script, ...args], {
      cwd: root,
      env: baseEnv(),
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

function writeAttestation(name, bytes) {
  const file = path.join(workspace, name)
  fs.writeFileSync(file, bytes)
  return file
}

describe('AUD19-13..15 external evidence check', () => {
  it('accepts a fully bound synthetic attestation for a single gate', () => {
    const env = baseEnv()
    const file = writeAttestation('valid.json', attestationBytes(env))
    const result = run([
      '--gate=provider',
      '--attestation=' + file,
      '--profile=PRODUCTION'
    ])
    expect(result.exitCode).toBe(0)
    expect(result.output.status).toBe('APPROVED')
    expect(result.output.sideEffects).toBe(false)
    expect(result.output.exchangedWithExternalSystem).toBe(false)
    expect(result.output.attestationSha256).toBe(
      createHash('sha256').update(fs.readFileSync(file)).digest('hex')
    )
  })

  it('rejects expired attestations and accepts the negative expectation', () => {
    const env = baseEnv()
    const file = writeAttestation(
      'expired.json',
      attestationBytes(env, {
        issuedAt: new Date(Date.now() - 7_200_000).toISOString(),
        expiresAt: new Date(Date.now() - 3_600_000).toISOString()
      })
    )
    const direct = run(['--gate=provider', '--attestation=' + file])
    expect(direct.exitCode).toBe(1)
    expect(direct.output.status).toBe('REJECTED')
    const expected = run([
      '--gate=provider',
      '--attestation=' + file,
      '--expect=REJECT'
    ])
    expect(expected.exitCode).toBe(0)
  })

  it('rejects tampered signatures, placeholder owners and digest mismatch', () => {
    const env = baseEnv()
    const tampered = attestationBytes(env, { signature: 'a'.repeat(64) })
    const placeholder = attestationBytes(env, { owner: 'replace-me' })
    const digestMismatch = attestationBytes(env, {
      candidateDigest: 'f'.repeat(64)
    })
    const files = [
      writeAttestation('tampered.json', tampered),
      writeAttestation('placeholder.json', placeholder),
      writeAttestation('digest-mismatch.json', digestMismatch)
    ]
    for (const file of files) {
      const result = run(['--gate=provider', '--attestation=' + file])
      expect(result.exitCode, file).toBe(1)
      expect(result.output.status, file).toBe('REJECTED')
    }
  })

  it('never promotes a missing attestation or an invalid gate name', () => {
    const missing = run(['--gate=provider', '--attestation=missing.json'])
    expect(missing.exitCode).toBe(1)
    expect(missing.output.status).toBe('REJECTED')
    const invalid = run(['--gate=unknown', '--attestation=x.json'])
    expect(invalid.exitCode).toBe(2)
    expect(invalid.output.status).toBe('INVALID_INVOCATION')
  })
})
