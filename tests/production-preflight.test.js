import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const repositoryRoot = path.resolve(import.meta.dirname, '..')
const script = path.join(repositoryRoot, 'scripts/production-preflight.mjs')

function runPreflight(overrides = {}, args = []) {
  const output = execFileSync(process.execPath, [script, ...args], {
    cwd: repositoryRoot,
    env: { ...process.env, ...validProductionEnv(), ...overrides },
    encoding: 'utf8'
  })
  return JSON.parse(output)
}

function validProductionEnv() {
  return {
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
    CVG_MIGRATIONS_APPLIED_AT_LEAST: '22',
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
})
