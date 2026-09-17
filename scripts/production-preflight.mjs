#!/usr/bin/env node
/**
 * Read-only production configuration preflight.
 *
 * This command deliberately does not connect to a database, contact a
 * provider, or mutate any state. It validates the explicit signals required
 * before a production bootstrap may be attempted. Missing signals fail
 * closed; `--expect=REJECT` is used by local/CI negative validation to prove
 * that the default synthetic environment is rejected.
 */
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { evaluateProductionBootstrap } from './lib/production-preflight-core.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = new Map()
for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index]
  if (!argument.startsWith('--')) continue
  const [key, inlineValue] = argument.slice(2).split('=', 2)
  args.set(key, inlineValue ?? process.argv[index + 1] ?? 'true')
  if (inlineValue === undefined) index += 1
}

const profile = String(args.get('profile') ?? 'PRODUCTION').toUpperCase()
const expected = String(args.get('expect') ?? 'ACTUAL').toUpperCase()
const env = process.env
const checks = []

function value(name) {
  return env[name]?.trim() ?? ''
}

function isTrue(name) {
  return value(name).toLowerCase() === 'true'
}

function isPostgresUrl(name) {
  try {
    const parsed = new URL(value(name))
    return ['postgres:', 'postgresql:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

function isSafeSecret(name, minimumLength = 1) {
  const candidate = value(name)
  return (
    candidate.length >= minimumLength &&
    !/replace[_-]?me|change[_-]?me|example|password/i.test(candidate)
  )
}

function isDomainId(name, prefix) {
  return new RegExp(`^${prefix}_[0-9a-f-]{36}$`).test(value(name))
}

function add(id, pass, detail) {
  checks.push({ id, status: pass ? 'PASS' : 'FAIL', detail })
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(root, relativePath))
}

const authoritativeBootstrap = evaluateProductionBootstrap({
  env,
  root,
  profile
})

add(
  'bootstrap.authority',
  authoritativeBootstrap.status === 'PASS',
  authoritativeBootstrap.blocking.length === 0
    ? 'shared bootstrap preflight passed'
    : 'shared bootstrap preflight blocked: ' +
        authoritativeBootstrap.blocking.join(',')
)

add(
  'profile.production',
  profile === 'PRODUCTION',
  `profile=${profile}; production preflight is only authoritative for PRODUCTION`
)
add(
  'runtime.node_env',
  value('NODE_ENV') === 'production',
  'NODE_ENV must be production'
)
add(
  'runtime.persistence',
  value('API_PERSISTENCE_MODE') === 'postgres',
  'API_PERSISTENCE_MODE=postgres is required; memory persistence is forbidden'
)
add(
  'runtime.database',
  isPostgresUrl('DATABASE_URL'),
  'DATABASE_URL must be a non-empty PostgreSQL URL'
)
add(
  'runtime.migration_database',
  isPostgresUrl('DATABASE_MIGRATION_URL'),
  'DATABASE_MIGRATION_URL must be a separate PostgreSQL migration URL'
)
add(
  'runtime.rls',
  isTrue('POSTGRES_RLS_ENFORCEMENT'),
  'POSTGRES_RLS_ENFORCEMENT=true is required'
)
add(
  'runtime.no_auto_migrate',
  value('POSTGRES_AUTO_MIGRATE') === 'false',
  'production requires explicit migrations; POSTGRES_AUTO_MIGRATE=false'
)
add(
  'runtime.worker_runtime',
  value('CVG_WORKER_RUNTIME') === 'kernel',
  'CVG_WORKER_RUNTIME=kernel is required; legacy published-agent is forbidden'
)
add(
  'runtime.durable_kernel',
  isTrue('CVG_DURABLE_KERNEL_ORCHESTRATOR'),
  'CVG_DURABLE_KERNEL_ORCHESTRATOR=true is required'
)
add(
  'runtime.durable_queue',
  ['postgres', 'postgres-controlled'].includes(
    value('CVG_WORKER_QUEUE_ADAPTER')
  ),
  'a PostgreSQL worker queue adapter is required'
)
add(
  'runtime.durable_inbound',
  isTrue('OUTBOX_DURABLE_INBOUND'),
  'OUTBOX_DURABLE_INBOUND=true is required'
)
add(
  'identity.inbound_tenant',
  isDomainId('INBOUND_TENANT_ID', 'tenant'),
  'trusted INBOUND_TENANT_ID is required'
)
add(
  'identity.inbound_agent',
  isDomainId('INBOUND_AGENT_ID', 'agent'),
  'trusted INBOUND_AGENT_ID is required'
)
add(
  'identity.worker_tenant',
  isDomainId('CVG_WORKER_TENANT_ID', 'tenant'),
  'trusted CVG_WORKER_TENANT_ID is required'
)
add(
  'identity.worker_agent',
  isDomainId('CVG_WORKER_AGENT_ID', 'agent'),
  'trusted CVG_WORKER_AGENT_ID is required'
)
add(
  'security.webhook_secret',
  isSafeSecret('WEBHOOK_SIGNING_SECRET', 32),
  'WEBHOOK_SIGNING_SECRET must be a non-placeholder secret of at least 32 characters'
)
add(
  'security.provider_secret',
  isSafeSecret('OPENAI_API_KEY', 16),
  'provider secret must be explicitly configured and non-placeholder'
)
add(
  'security.origins',
  /^https:\/\//.test(value('API_ALLOWED_ORIGINS')),
  'API_ALLOWED_ORIGINS must contain an HTTPS origin allowlist'
)
add(
  'security.https',
  isTrue('API_REQUIRE_HTTPS'),
  'API_REQUIRE_HTTPS=true is required'
)
add(
  'governance.policy',
  value('CVG_POLICY_MODE') === 'deny_by_default',
  'CVG_POLICY_MODE=deny_by_default is required'
)
add(
  'governance.risk',
  value('CVG_RISK_POLICY') === 'required',
  'CVG_RISK_POLICY=required is required'
)
add(
  'governance.approval_store',
  value('CVG_APPROVAL_STORE') === 'postgres',
  'CVG_APPROVAL_STORE=postgres is required'
)
add(
  'governance.effect_journal',
  value('CVG_EFFECT_JOURNAL') === 'postgres',
  'CVG_EFFECT_JOURNAL=postgres is required'
)
add(
  'governance.migrations',
  Number(value('CVG_MIGRATIONS_APPLIED_AT_LEAST')) >= 23,
  'CVG_MIGRATIONS_APPLIED_AT_LEAST must be >= 23; database state is not inferred'
)
add(
  'governance.no_unrestricted_effects',
  !isTrue('CVG_ALLOW_REAL_EFFECTS') && !isTrue('CVG_REAL_EFFECTS'),
  'unrestricted real effects are forbidden; use governed effect adapters'
)

const externalSignals = [
  ['provider', 'CVG_EXTERNAL_PROVIDER_APPROVED'],
  ['channel', 'CVG_EXTERNAL_CHANNEL_APPROVED'],
  ['identity', 'CVG_EXTERNAL_IDENTITY_APPROVED'],
  ['rag', 'CVG_EXTERNAL_RAG_APPROVED'],
  ['rpo_rto', 'CVG_RPO_RTO_MEASURED'],
  ['pilot', 'CVG_SUPERVISED_PILOT_COMPLETE'],
  ['rollback', 'CVG_ROLLBACK_VERIFIED'],
  ['human_signoff', 'CVG_HUMAN_SIGNOFF']
]
for (const [label, name] of externalSignals) {
  add(
    `external.${label}`,
    isTrue(name),
    `${name}=true is required; a declaration is not evidence of validation`
  )
}

add(
  'source.migrations_present',
  [
    '0019_orchestrator_state.sql',
    '0020_orchestrator_lineage_hardening.sql',
    '0021_orchestrator_iteration_budget.sql',
    '0022_orchestrator_evaluation_lineage.sql',
    '0023_orchestrator_replan_fencing.sql',
    '0024_tenant_isolation_constraint_validation.sql'
  ].every((file) => fileExists(`packages/persistence/migrations/${file}`)),
  'required orchestrator migration sources must be present'
)

const blocking = checks
  .filter((check) => check.status !== 'PASS')
  .map((check) => check.id)
const actualStatus = blocking.length === 0 ? 'PASS' : 'FAIL'
const expectedRejected = expected === 'REJECT'
const status = expectedRejected
  ? actualStatus === 'FAIL'
    ? 'PASS'
    : 'FAIL'
  : actualStatus
const output = {
  schemaVersion: 1,
  kind: 'production-preflight',
  profile,
  status,
  actualStatus,
  expected,
  sideEffects: false,
  checks,
  blocking,
  note: expectedRejected
    ? 'Negative-validation mode passes only when unsafe production configuration is rejected.'
    : 'A PASS authorizes no deployment by itself; external gates and human release authority remain separate.'
}
process.stdout.write(`${JSON.stringify(output, null, 2)}\n`)
process.exitCode = status === 'PASS' ? 0 : 1
