import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  EXTERNAL_ATTESTATION_SIGNAL_KEYS,
  computeExternalAttestationConfigDigest,
  computeExternalAttestationSignature,
  evaluateProductionBootstrap
} from '../scripts/lib/production-preflight-core.mjs'

const repositoryRoot = path.resolve(import.meta.dirname, '..')
const script = path.join(repositoryRoot, 'scripts/production-preflight.mjs')
const apiEntrypoint = path.join(repositoryRoot, 'apps/api/src/main.ts')
const workerEntrypoint = path.join(repositoryRoot, 'apps/worker/src/main.ts')
const tsxEntrypoint = path.join(repositoryRoot, 'node_modules/.bin/tsx')
const attestationDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'cvg-production-preflight-')
)
const runtimeAttestationPath = path.join(
  attestationDirectory,
  'runtime-attestation.json'
)
const externalAttestationPath = path.join(
  attestationDirectory,
  'external-attestation.json'
)
const externalAttestationKey = `controlled-external-attestation-key-${'k'.repeat(
  8
)}`
const candidateDigest = 'c'.repeat(64)

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function runPreflight(overrides = {}, args = []) {
  const output = execFileSync(process.execPath, [script, ...args], {
    cwd: repositoryRoot,
    env: { ...process.env, ...validProductionEnv(), ...overrides },
    encoding: 'utf8'
  })
  return JSON.parse(output)
}

function baseProductionEnv() {
  const env = {
    NODE_ENV: 'production',
    API_PERSISTENCE_MODE: 'postgres',
    DATABASE_URL: 'postgres://runtime:secret@db.invalid/cvg',
    DATABASE_MIGRATION_URL: 'postgres://migration:secret@db.invalid/cvg',
    INBOUND_TENANT_ID: 'tenant_00000000-0000-4000-8000-000000000001',
    INBOUND_AGENT_ID: 'agent_00000000-0000-4000-8000-000000000001',
    CVG_WORKER_TENANT_ID: 'tenant_00000000-0000-4000-8000-000000000001',
    CVG_WORKER_AGENT_ID: 'agent_00000000-0000-4000-8000-000000000001',
    WEBHOOK_SIGNING_SECRET: 's'.repeat(40),
    API_ALLOWED_ORIGINS: 'https://console.example.test',
    API_REQUIRE_HTTPS: 'true',
    POSTGRES_AUTO_MIGRATE: 'false',
    POSTGRES_RLS_ENFORCEMENT: 'true',
    CVG_WORKER_RUNTIME: 'kernel',
    CVG_DURABLE_KERNEL_ORCHESTRATOR: 'true',
    CVG_WORKER_QUEUE_ADAPTER: 'postgres-controlled',
    OUTBOX_DURABLE_INBOUND: 'true',
    CVG_POLICY_MODE: 'deny_by_default',
    CVG_RISK_POLICY: 'required',
    CVG_APPROVAL_STORE: 'postgres',
    CVG_EFFECT_JOURNAL: 'postgres',
    CVG_MIGRATIONS_APPLIED_AT_LEAST: '23',
    CVG_ALLOW_REAL_EFFECTS: 'false',
    CVG_REAL_EFFECTS: 'false',
    CVG_RELEASE_CANDIDATE_DIGEST: candidateDigest,
    CVG_IDENTITY_MODE: 'trusted',
    CVG_OPERATOR_IDENTITY_KEYRING: JSON.stringify({
      current: { keyId: 'aud19-production-fixture', secret: 'k'.repeat(32) }
    }),
    CVG_OPERATOR_REPLAY_STORE: 'postgres',
    OPENAI_API_KEY: 'sk_' + 'x'.repeat(24)
  }
  const attestation = {
    schemaVersion: 1,
    kind: 'cvg-production-bootstrap-attestation',
    profile: 'PRODUCTION',
    databaseUrlSha256: sha256(env.DATABASE_URL),
    migrationDatabaseUrlSha256: sha256(env.DATABASE_MIGRATION_URL),
    migrations: [
      '0019_orchestrator_state',
      '0020_orchestrator_lineage_hardening',
      '0021_orchestrator_iteration_budget',
      '0022_orchestrator_evaluation_lineage',
      '0023_orchestrator_replan_fencing',
      '0024_tenant_isolation_constraint_validation',
      '0025_retention_ledger',
      '0026_operator_replay_events'
    ],
    databaseConnectivityVerified: true,
    rlsEnforced: true,
    constraintsValidated: true,
    runtimeRoleVerified: true,
    checkedAt: new Date(Date.now() - 1_000).toISOString(),
    expiresAt: new Date(Date.now() + 86_400_000).toISOString()
  }
  const bytes = Buffer.from(JSON.stringify(attestation))
  fs.writeFileSync(runtimeAttestationPath, bytes)
  return {
    ...env,
    CVG_PRODUCTION_PREFLIGHT_ATTESTATION_FILE: runtimeAttestationPath,
    CVG_PRODUCTION_PREFLIGHT_ATTESTATION_SHA256: sha256(bytes)
  }
}

function buildExternalAttestationBytes(env, overrides = {}) {
  const attestation = {
    schemaVersion: 1,
    kind: 'cvg-external-signals-attestation',
    environment: 'PRODUCTION',
    owner: 'release.owner.aud19',
    issuedAt: new Date(Date.now() - 60_000).toISOString(),
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    candidateDigest,
    configDigest: computeExternalAttestationConfigDigest(env),
    signals: Object.fromEntries(
      EXTERNAL_ATTESTATION_SIGNAL_KEYS.map((key) => [
        key,
        { status: 'APPROVED', evidenceRef: `controlled://dossier/${key}` }
      ])
    ),
    ...overrides
  }
  if (typeof attestation.signature !== 'string') {
    attestation.signature = computeExternalAttestationSignature(
      attestation,
      externalAttestationKey
    )
  }
  return Buffer.from(JSON.stringify(attestation))
}

function validProductionEnv(attestationOverrides = {}, envOverrides = {}) {
  const env = { ...baseProductionEnv(), ...envOverrides }
  const bytes = buildExternalAttestationBytes(env, attestationOverrides)
  fs.writeFileSync(externalAttestationPath, bytes)
  return {
    ...env,
    CVG_EXTERNAL_ATTESTATION_FILE: externalAttestationPath,
    CVG_EXTERNAL_ATTESTATION_SHA256: sha256(bytes),
    CVG_EXTERNAL_ATTESTATION_HMAC_KEY: externalAttestationKey
  }
}

describe('production preflight', () => {
  it('proves the default controlled environment is rejected', () => {
    const output = runPreflight(
      {
        NODE_ENV: 'test',
        API_PERSISTENCE_MODE: 'memory',
        CVG_DURABLE_KERNEL_ORCHESTRATOR: 'false',
        CVG_EXTERNAL_PROVIDER_APPROVED: 'false'
      },
      ['--expect=REJECT']
    )

    expect(output.status).toBe('PASS')
    expect(output.actualStatus).toBe('FAIL')
    expect(output.sideEffects).toBe(false)
    expect(output.blocking).toEqual(
      expect.arrayContaining(['runtime.persistence', 'runtime.durable_kernel'])
    )
  })

  it('accepts only a fully explicit durable production configuration', () => {
    const output = runPreflight()

    expect(output.status).toBe('PASS')
    expect(output.actualStatus).toBe('PASS')
    expect(output.blocking).toEqual([])
    expect(output.externalAttestation.status).toBe('PASS')
    expect(fs.existsSync(script)).toBe(true)
  })

  it('rejects legacy runtime, missing identity and downgraded risk', () => {
    const output = runPreflight(
      {
        CVG_WORKER_RUNTIME: 'published-agent',
        INBOUND_AGENT_ID: '',
        CVG_RISK_POLICY: 'optional'
      },
      ['--expect=REJECT']
    )

    expect(output.status).toBe('PASS')
    expect(output.actualStatus).toBe('FAIL')
    expect(output.blocking).toEqual(
      expect.arrayContaining([
        'runtime.worker_runtime',
        'identity.inbound_agent',
        'governance.risk'
      ])
    )
  })

  it('shares the authoritative bootstrap decision and rejects mixed origins', () => {
    const env = {
      ...validProductionEnv(),
      API_ALLOWED_ORIGINS:
        'https://console.example.test,http://unsafe.example.test'
    }
    const result = evaluateProductionBootstrap({ env, root: repositoryRoot })
    expect(result.status).toBe('FAIL')
    expect(result.blocking).toContain('bootstrap.http_security')

    const output = runPreflight(
      { API_ALLOWED_ORIGINS: env.API_ALLOWED_ORIGINS },
      ['--expect=REJECT']
    )
    expect(output.status).toBe('PASS')
    expect(output.actualStatus).toBe('FAIL')
    expect(output.blocking).toContain('bootstrap.authority')
  })

  it('rejects aliases between runtime and migration database endpoints', () => {
    const output = runPreflight(
      { DATABASE_MIGRATION_URL: 'postgres://runtime:secret@db.invalid/cvg' },
      ['--expect=REJECT']
    )

    expect(output.status).toBe('PASS')
    expect(output.actualStatus).toBe('FAIL')
    expect(output.blocking).toContain('bootstrap.authority')
  })

  it('does not treat explicit flags as runtime proof without an attestation', () => {
    const output = runPreflight(
      {
        CVG_PRODUCTION_PREFLIGHT_ATTESTATION_FILE: '',
        CVG_PRODUCTION_PREFLIGHT_ATTESTATION_SHA256: ''
      },
      ['--expect=REJECT']
    )

    expect(output.status).toBe('PASS')
    expect(output.actualStatus).toBe('FAIL')
    expect(output.blocking).toContain('bootstrap.authority')
  })

  it('does not grant external readiness from isolated boolean flags', () => {
    const output = runPreflight(
      {
        CVG_EXTERNAL_ATTESTATION_FILE: '',
        CVG_EXTERNAL_ATTESTATION_SHA256: '',
        CVG_EXTERNAL_ATTESTATION_HMAC_KEY: '',
        CVG_EXTERNAL_PROVIDER_APPROVED: 'true',
        CVG_EXTERNAL_CHANNEL_APPROVED: 'true',
        CVG_EXTERNAL_IDENTITY_APPROVED: 'true',
        CVG_EXTERNAL_RAG_APPROVED: 'true',
        CVG_RPO_RTO_MEASURED: 'true',
        CVG_SUPERVISED_PILOT_COMPLETE: 'true',
        CVG_ROLLBACK_VERIFIED: 'true',
        CVG_HUMAN_SIGNOFF: 'true'
      },
      ['--expect=REJECT']
    )

    expect(output.status).toBe('PASS')
    expect(output.actualStatus).toBe('FAIL')
    expect(output.externalAttestation.status).toBe('FAIL')
    expect(output.blocking).toEqual(
      expect.arrayContaining([
        'external.provider',
        'external.channel',
        'external.identity',
        'external.rag',
        'external.rpo_rto',
        'external.pilot',
        'external.rollback',
        'external.human_signoff',
        'bootstrap.authority'
      ])
    )
  })

  it('rejects an expired external attestation without side effects', () => {
    const env = validProductionEnv({
      issuedAt: new Date(Date.now() - 7_200_000).toISOString(),
      expiresAt: new Date(Date.now() - 60_000).toISOString()
    })
    const result = evaluateProductionBootstrap({ env, root: repositoryRoot })

    expect(result.status).toBe('FAIL')
    expect(result.sideEffects).toBe(false)
    expect(result.blocking).toContain('bootstrap.external_attestation')
    expect(result.externalAttestation.reason).toMatch(/expired/)
  })

  it('rejects a candidate digest mismatch', () => {
    const env = validProductionEnv({ candidateDigest: 'd'.repeat(64) })
    const result = evaluateProductionBootstrap({ env, root: repositoryRoot })

    expect(result.status).toBe('FAIL')
    expect(result.blocking).toContain('bootstrap.external_attestation')
    expect(result.externalAttestation.reason).toMatch(/candidate_digest/)
  })

  it('rejects a configuration digest mismatch', () => {
    const env = validProductionEnv({ configDigest: 'e'.repeat(64) })
    const result = evaluateProductionBootstrap({ env, root: repositoryRoot })

    expect(result.status).toBe('FAIL')
    expect(result.blocking).toContain('bootstrap.external_attestation')
    expect(result.externalAttestation.reason).toMatch(/config_digest/)
  })

  it('rejects an attestation issued for another environment', () => {
    const env = validProductionEnv({ environment: 'STAGING' })
    const result = evaluateProductionBootstrap({ env, root: repositoryRoot })

    expect(result.status).toBe('FAIL')
    expect(result.blocking).toContain('bootstrap.external_attestation')
    expect(result.externalAttestation.reason).toMatch(/environment/)
  })

  it('rejects a tampered signature and a placeholder owner', () => {
    const tampered = validProductionEnv({ signature: 'f'.repeat(64) })
    const tamperedResult = evaluateProductionBootstrap({
      env: tampered,
      root: repositoryRoot
    })
    expect(tamperedResult.status).toBe('FAIL')
    expect(tamperedResult.blocking).toContain('bootstrap.external_attestation')
    expect(tamperedResult.externalAttestation.reason).toMatch(/signature/)

    const placeholder = validProductionEnv({ owner: 'replace-me' })
    const placeholderResult = evaluateProductionBootstrap({
      env: placeholder,
      root: repositoryRoot
    })
    expect(placeholderResult.status).toBe('FAIL')
    expect(placeholderResult.externalAttestation.reason).toMatch(/owner/)
  })

  it('rejects the attestation when the verification key is missing or unsafe', () => {
    const env = {
      ...validProductionEnv(),
      CVG_EXTERNAL_ATTESTATION_HMAC_KEY: ''
    }
    const result = evaluateProductionBootstrap({ env, root: repositoryRoot })

    expect(result.status).toBe('FAIL')
    expect(result.blocking).toContain('bootstrap.external_attestation')
    expect(result.externalAttestation.status).toBe('FAIL')
  })

  it('accepts a valid bound attestation without declaring production ready', () => {
    const env = validProductionEnv()
    const result = evaluateProductionBootstrap({ env, root: repositoryRoot })

    expect(result.status).toBe('PASS')
    expect(result.blocking).toEqual([])
    expect(result.externalAttestation.status).toBe('PASS')
    expect(result.externalAttestation.signals.provider).toBe('APPROVED')
    expect(result.sideEffects).toBe(false)

    const output = runPreflight()
    expect(output.note).toMatch(/authorizes no deployment by itself/)
    expect(output.sideEffects).toBe(false)
  })

  it('runs the shared gate before API and worker bootstrap', () => {
    for (const entrypoint of [apiEntrypoint, workerEntrypoint]) {
      const result = spawnSync(process.execPath, [tsxEntrypoint, entrypoint], {
        cwd: repositoryRoot,
        env: {
          ...process.env,
          NODE_ENV: 'production',
          API_PERSISTENCE_MODE: 'memory'
        },
        encoding: 'utf8',
        timeout: 10_000
      })
      expect(result.status).not.toBe(0)
      expect(result.stdout + result.stderr).toMatch(
        /Production bootstrap preflight failed/
      )
    }
  })
})
