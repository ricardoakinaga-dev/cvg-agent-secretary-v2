import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { evaluateProductionBootstrap } from '../scripts/lib/production-preflight-core.mjs'

const repositoryRoot = path.resolve(import.meta.dirname, '..')
const script = path.join(repositoryRoot, 'scripts/production-preflight.mjs')
const apiEntrypoint = path.join(repositoryRoot, 'apps/api/src/main.ts')
const workerEntrypoint = path.join(repositoryRoot, 'apps/worker/src/main.ts')
const tsxEntrypoint = path.join(repositoryRoot, 'node_modules/.bin/tsx')
const attestationPath = path.join(
  fs.mkdtempSync(path.join(os.tmpdir(), 'cvg-production-preflight-')),
  'runtime-attestation.json'
)

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

function validProductionEnv() {
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
    CVG_EXTERNAL_PROVIDER_APPROVED: 'true',
    CVG_EXTERNAL_CHANNEL_APPROVED: 'true',
    CVG_EXTERNAL_IDENTITY_APPROVED: 'true',
    CVG_EXTERNAL_RAG_APPROVED: 'true',
    CVG_RPO_RTO_MEASURED: 'true',
    CVG_SUPERVISED_PILOT_COMPLETE: 'true',
    CVG_ROLLBACK_VERIFIED: 'true',
    CVG_HUMAN_SIGNOFF: 'true',
    CVG_ALLOW_REAL_EFFECTS: 'false',
    CVG_REAL_EFFECTS: 'false',
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
      '0024_tenant_isolation_constraint_validation'
    ],
    databaseConnectivityVerified: true,
    rlsEnforced: true,
    constraintsValidated: true,
    runtimeRoleVerified: true,
    checkedAt: new Date(Date.now() - 1_000).toISOString(),
    expiresAt: new Date(Date.now() + 86_400_000).toISOString()
  }
  const bytes = Buffer.from(JSON.stringify(attestation))
  fs.writeFileSync(attestationPath, bytes)
  return {
    ...env,
    CVG_PRODUCTION_PREFLIGHT_ATTESTATION_FILE: attestationPath,
    CVG_PRODUCTION_PREFLIGHT_ATTESTATION_SHA256: sha256(bytes)
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
