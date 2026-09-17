#!/usr/bin/env node
/**
 * Phase 11.2 State of Art Triple AAA certification runner.
 *
 * This runner creates one canonical, commit-bound package. It executes only
 * local/synthetic checks and records external qualification as pending unless
 * an independently supplied integration record says otherwise. The package
 * is deliberately sealed in two passes so the pointer, result and manifest
 * can be cross-checked without creating a self-referential hash.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DEPLOYMENT_PROFILES,
  PHASE11_2_PROMPT_SHA256,
  PHASE11_2_REQUIRED_GATES,
  PHASE11_REQUIRED_INVARIANTS,
  Phase11CurrentResultSchema,
  Phase11ManifestSchema,
  REQUIRED_EXTERNAL_STATUS,
  artifactRecord,
  buildEvidenceGraph,
  buildPhase11Candidate,
  computeCertificationDecision,
  computeScores,
  normalizeExternalGates,
  readNodeTarget,
  requiredGateStatus,
  verifyEvidenceGraph,
  verifyPromptIntegrity
} from './lib/phase11-rules.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const certificationDir = path.join(root, 'certification')
const canonicalDir = path.join(certificationDir, 'phase11')
const logDir = path.join(canonicalDir, 'logs')
const integrationsDir = path.join(canonicalDir, 'integrations')
const resultRelative = 'certification/phase11/phase11-result.json'
const manifestRelative = 'certification/phase11/manifest.json'
const pointerRelative = 'certification/current.json'
const qualityBarRelative =
  'docs/04_audit/evidence/AAA/AAA-21/quality-bar-phase11-2-v1.json'
const consoleCriticRelative = 'docs/phase11/PHASE11_INDEPENDENT_CRITIC.md'

fs.mkdirSync(logDir, { recursive: true })
fs.mkdirSync(integrationsDir, { recursive: true })

const requestedProfile = process.env.PHASE11_REQUESTED_PROFILE ?? 'STAGING'
const deploymentProfile =
  process.env.PHASE11_DEPLOYMENT_PROFILE ?? 'CONTROLLED_LOCAL'
if (!DEPLOYMENT_PROFILES.includes(requestedProfile)) {
  throw new Error(`invalid PHASE11_REQUESTED_PROFILE: ${requestedProfile}`)
}
if (!DEPLOYMENT_PROFILES.includes(deploymentProfile)) {
  throw new Error(`invalid PHASE11_DEPLOYMENT_PROFILE: ${deploymentProfile}`)
}

const startedAt = new Date()
const candidate = buildPhase11Candidate(root, startedAt)
const certificationId = `phase11-${candidate.candidateId.slice(0, 16)}-${Date.now().toString(36)}`
const databaseConfigured =
  Boolean(process.env.TEST_DATABASE_URL) &&
  process.env.PHASE11_ALLOW_DISPOSABLE_POSTGRES === '1'

const commandEntries = [
  ['verify', 'npm run verify'],
  ['format', 'npm run format:check'],
  ['typecheck', 'npm run typecheck'],
  ['lint', 'npm run lint'],
  ['build', 'npm run build'],
  ['unit', 'npm test'],
  ['coverage', 'npm run test:coverage'],
  ['security', 'npm run audit:security'],
  ['supply_chain', 'npm run sbom && npm run licenses:check'],
  ['worker_startup', 'npm run test:worker:startup'],
  ['postgres', 'npm run test:postgres'],
  ['e2e', 'npm run test:e2e'],
  ['evals', 'npm run test:evals && npx tsx scripts/phase10-eval-report.ts'],
  [
    'chaos',
    'npm run test:chaos -- --reporter=json --outputFile=certification/chaos-report.json'
  ],
  ['load', 'npx tsx scripts/phase10-load.ts --events=10000'],
  [
    'recovery',
    'npm test -- --run packages/agent-runtime/src/__tests__/runtime-execution-recovery.test.ts apps/worker/src/__tests__/outbox-recovery.test.ts apps/worker/src/__tests__/worker-sweeps.test.ts'
  ],
  ['bypass_audit', 'node scripts/phase11-bypass-audit.mjs'],
  ['certification_self_test', 'node scripts/phase11-self-test.mjs'],
  [
    'phase10_historical_verification',
    'node scripts/phase10-verify.mjs --historical --base certification/logs/historical/2026-09-11-phase10'
  ],
  [
    'production_preflight',
    'node scripts/production-preflight.mjs --profile=PRODUCTION --expect=REJECT'
  ],
  ['evidence_reports', 'node scripts/phase11-2-evidence-check.mjs --reports'],
  ['independent_critic', 'node scripts/phase11-2-evidence-check.mjs --critic'],
  [
    'trace_lineage',
    'npm test -- --run apps/api/src/__tests__/orchestration-observability.test.ts packages/observability/src/__tests__/observability.test.ts'
  ],
  [
    'governance_redteam',
    'npm test -- --run packages/policy-engine/src/__tests__/policy-engine-branch-hardening.test.ts packages/platform/src/__tests__/tool-invocation-boundary-hardening.test.ts packages/platform/src/__tests__/critical-safety-preflight.test.ts'
  ],
  [
    'tenant_redteam',
    'npm test -- --run apps/api/src/__tests__/tenant-inbound-isolation.test.ts packages/persistence/src/__tests__/tenant-isolation.test.ts'
  ],
  [
    'certification_redteam',
    'node scripts/phase11-2-redteam.mjs --suite=certification && npm test -- --run apps/api/src/__tests__/aud17-connected-redteam.test.ts'
  ],
  ['adversarial_proof', 'node scripts/phase11-2-redteam.mjs --suite=all'],
  [
    'outbox_replay',
    'npm test -- --run packages/persistence/src/__tests__/outbox-durability.test.ts apps/worker/src/__tests__/outbox-recovery.test.ts'
  ],
  ['clone_verify', 'node scripts/phase11-2-redteam.mjs --suite=clone']
]

const sourceReports = {
  evals: 'certification/agent-eval-report.json',
  chaos: 'certification/chaos-report.json',
  load: 'certification/load-report.json',
  supply_chain: 'certification/license-report.json'
}

const reportTargets = {
  evals: 'certification/phase11/eval-report.json',
  chaos: 'certification/phase11/chaos-report.json',
  load: 'certification/phase11/load-report.json',
  recovery: 'certification/phase11/recovery-report.json',
  postgres: 'certification/phase11/postgres-report.json',
  supply_chain: 'certification/phase11/supply-report.json',
  production_preflight: 'certification/phase11/preflight-report.json',
  certification_redteam: 'certification/phase11/redteam-report.json',
  trace_lineage: 'certification/phase11/trace-report.json',
  adversarial_proof: 'certification/phase11/adversarial-report.json'
}

const requiredPackageFiles = [
  'certification/phase11/gates.json',
  'certification/phase11/invariants.json',
  'certification/phase11/evidence-graph.json',
  'certification/phase11/manifest.json',
  'certification/phase11/release-manifest.json',
  'certification/phase11/findings.json',
  'certification/phase11/phase11-result.json',
  'certification/phase11/negative-validation.json',
  'certification/phase11/eval-report.json',
  'certification/phase11/chaos-report.json',
  'certification/phase11/load-report.json',
  'certification/phase11/recovery-report.json',
  'certification/phase11/postgres-report.json',
  'certification/phase11/integration-report.json',
  'certification/phase11/integrations/status.json',
  'certification/phase11/prompt-integrity.json',
  'certification/phase11/supply-report.json',
  'certification/phase11/preflight-report.json',
  'certification/phase11/redteam-report.json',
  'certification/phase11/trace-report.json',
  'certification/phase11/adversarial-report.json'
]

const evidenceSourceFiles = [
  ...Object.keys(PHASE11_2_PROMPT_SHA256).map(
    (file) => `docs/11_phase11/prompt-master/20260916-triple-aaa/source/${file}`
  ),
  'docs/11_phase11/prompt-master/20260916-triple-aaa/README.md',
  qualityBarRelative,
  consoleCriticRelative,
  'docs/01_prd/phase11_2_state_of_art_triple_aaa_20260916.md',
  'docs/02_spec/phase11_2_state_of_art_triple_aaa_20260916.md',
  'docs/phase11/PHASE11_2_DELTA_AUDIT.md',
  'docs/phase11/PHASE11_FORMAL_CLOSURE.md',
  'docs/phase11/PHASE11_ORCHESTRATOR_PROOF.md',
  'docs/phase11/PHASE11_SECURITY_REVIEW.md',
  'docs/phase11/PHASE11_ADVERSARIAL_REPORT.md',
  'docs/phase11/PHASE11_RECOVERY_REPORT.md',
  'docs/phase11/PHASE11_CHAOS_REPORT.md',
  'docs/phase11/PHASE11_LOAD_REPORT.md',
  'docs/phase11/PHASE11_INTEGRATION_REPORT.md',
  'docs/phase11/PHASE11_INDEPENDENT_CRITIC.md',
  'certification/external-gates.json',
  'certification/historical/phase10/README.md',
  'certification/sbom.cyclonedx.json',
  'certification/license-report.json'
]

const implementationMap = {
  'P11.1-PROMPT': ['docs/11_phase11/prompt-master/20260915-formal-closure'],
  'P11.1-CERT-ANCHOR': [
    'scripts/phase11-certify.mjs',
    'scripts/phase11-verify.mjs',
    'scripts/lib/phase11-rules.mjs',
    'tests/phase11-formal-certification.test.js'
  ],
  'P11.1-CALCULUS': [
    'scripts/lib/phase11-rules.mjs',
    'scripts/phase11-self-test.mjs',
    'scripts/promotion-check.mjs'
  ],
  'P11.1-BYPASS': ['scripts/phase11-bypass-audit.mjs'],
  'P11.1-REPLAN': [
    'packages/agent-runtime/src/orchestration.ts',
    'packages/persistence/src/orchestrator-postgres.ts'
  ],
  'P11.1-LOOP-BUDGET': [
    'packages/agent-runtime/src/orchestration.ts',
    'apps/worker/src/kernel-composition.ts',
    'packages/persistence/migrations/0021_orchestrator_iteration_budget.sql'
  ],
  'P11.1-FENCING': [
    'packages/persistence/migrations/0018_outbox_lease_fencing.sql',
    'packages/persistence/src/orchestrator-postgres.ts'
  ],
  'P11.1-EFFECT': [
    'packages/persistence/src/effect-journal-postgres.ts',
    'packages/persistence/migrations/0013_runtime_effect_journal.sql'
  ],
  'P11.1-LINEAGE': [
    'packages/observability/src',
    'packages/persistence/migrations/0020_orchestrator_lineage_hardening.sql',
    'packages/agent-runtime/src/orchestration.ts',
    'packages/persistence/src/orchestrator-postgres.ts',
    'apps/api/src/orchestration-observability.ts'
  ],
  'P11.1-TENANT-REDTEAM': [
    'packages/policy-engine/src',
    'apps/api/src/orchestration-observability.ts'
  ],
  'P11.1-POSTGRES-RECOVERY': [
    'scripts/phase11-certify.mjs',
    'packages/persistence/src/orchestrator-postgres.ts',
    'packages/persistence/migrations/0021_orchestrator_iteration_budget.sql'
  ],
  'P11.1-CONSOLE': [
    'apps/web/src/App.tsx',
    'apps/web/src/features/orchestration/index.tsx',
    'apps/web/src/styles.css',
    'tests/e2e/visual-shell.spec.ts'
  ],
  'P11.1-SUPPLY': [
    'scripts/generate-sbom.mjs',
    'scripts/check-licenses.mjs',
    '.github/workflows/security.yml'
  ],
  'P11.1-EXTERNAL': ['certification/external-gates.json'],
  'P11.1-NO-PRODUCTION-EFFECT': [
    'certification/external-gates.json',
    'scripts/phase11-certify.mjs'
  ]
}

const testMap = {
  'P11.1-PROMPT': ['scripts/phase11-self-test.mjs'],
  'P11.1-CERT-ANCHOR': [
    'tests/phase11-certification.test.js',
    'tests/phase11-formal-certification.test.js'
  ],
  'P11.1-CALCULUS': [
    'tests/phase11-certification.test.js',
    'scripts/phase11-self-test.mjs'
  ],
  'P11.1-BYPASS': ['scripts/phase11-bypass-audit.mjs'],
  'P11.1-REPLAN': [
    'packages/agent-runtime/src/__tests__/orchestration.test.ts',
    'packages/persistence/src/__tests__/orchestrator-postgres.test.ts'
  ],
  'P11.1-LOOP-BUDGET': [
    'packages/agent-runtime/src/__tests__/runtime-limits.test.ts',
    'apps/worker/src/__tests__/worker-sweeps.test.ts'
  ],
  'P11.1-FENCING': [
    'packages/persistence/src/__tests__/outbox-durability.test.ts',
    'packages/persistence/src/__tests__/orchestrator-postgres.test.ts'
  ],
  'P11.1-EFFECT': [
    'packages/persistence/src/__tests__/effect-journal-postgres.test.ts',
    'apps/worker/src/__tests__/outbox-recovery.test.ts'
  ],
  'P11.1-LINEAGE': [
    'apps/api/src/__tests__/orchestration-observability.test.ts',
    'packages/agent-runtime/src/__tests__/orchestration.test.ts'
  ],
  'P11.1-TENANT-REDTEAM': [
    'apps/api/src/__tests__/tenant-inbound-isolation.test.ts',
    'apps/api/src/__tests__/orchestration-observability.test.ts'
  ],
  'P11.1-POSTGRES-RECOVERY': ['npm run test:postgres'],
  'P11.1-CONSOLE': [
    'tests/e2e/visual-shell.spec.ts',
    'apps/web/src/features/orchestration/orchestration.test.tsx'
  ],
  'P11.1-SUPPLY': [
    'npm run audit:security',
    'npm run licenses:check',
    'npm run sbom'
  ],
  'P11.1-EXTERNAL': [],
  'P11.1-NO-PRODUCTION-EFFECT': ['scripts/phase11-bypass-audit.mjs']
}

const gateMap = {
  'P11.1-PROMPT': ['prompt_integrity'],
  'P11.1-CERT-ANCHOR': ['certification_self_test', 'evidence_graph'],
  'P11.1-CALCULUS': ['certification_self_test'],
  'P11.1-BYPASS': ['bypass_audit'],
  'P11.1-REPLAN': ['unit', 'recovery'],
  'P11.1-LOOP-BUDGET': ['unit', 'recovery', 'evals'],
  'P11.1-FENCING': ['postgres', 'recovery'],
  'P11.1-EFFECT': ['postgres', 'recovery'],
  'P11.1-LINEAGE': ['unit', 'e2e', 'recovery'],
  'P11.1-TENANT-REDTEAM': ['unit', 'security', 'postgres'],
  'P11.1-POSTGRES-RECOVERY': ['postgres', 'recovery'],
  'P11.1-CONSOLE': ['unit', 'e2e'],
  'P11.1-SUPPLY': ['security', 'supply_chain'],
  'P11.1-EXTERNAL': [],
  'P11.1-NO-PRODUCTION-EFFECT': ['bypass_audit']
}

Object.assign(implementationMap, {
  'P11.2-PROMPT': [
    'docs/11_phase11/prompt-master/20260916-triple-aaa/README.md'
  ],
  'P11.2-CANONICAL': [
    '.gitignore',
    'scripts/lib/certification-rules.mjs',
    'scripts/lib/phase11-rules.mjs',
    'scripts/phase11-certify.mjs',
    'scripts/phase11-verify.mjs'
  ],
  'P11.2-CALCULUS': [
    'scripts/lib/phase11-rules.mjs',
    'scripts/phase11-2-redteam.mjs',
    'scripts/phase11-2-evidence-check.mjs',
    'scripts/phase11-self-test.mjs',
    'scripts/promotion-check.mjs'
  ],
  'P11.2-ORCHESTRATION': [
    'packages/agent-runtime/src/orchestration.ts',
    'packages/persistence/src/orchestrator-postgres.ts',
    'packages/persistence/migrations/0021_orchestrator_iteration_budget.sql',
    'packages/persistence/migrations/0022_orchestrator_evaluation_lineage.sql',
    'packages/persistence/migrations/0023_orchestrator_replan_fencing.sql',
    'packages/persistence/migrations/0024_tenant_isolation_constraint_validation.sql'
  ],
  'P11.2-FENCING': [
    'packages/persistence/src/orchestrator-postgres.ts',
    'packages/persistence/migrations/0018_outbox_lease_fencing.sql'
  ],
  'P11.2-EFFECT': [
    'packages/persistence/src/effect-journal-postgres.ts',
    'packages/persistence/src/outbox.ts',
    'apps/worker/src/outbox-revalidation.ts',
    'apps/worker/src/jobs/process-outbox-event.ts',
    'packages/persistence/migrations/0013_runtime_effect_journal.sql'
  ],
  'P11.2-LINEAGE': [
    'packages/observability/src',
    'packages/agent-runtime/src/orchestration.ts',
    'apps/api/src/orchestration-observability.ts',
    'scripts/lib/phase11-rules.mjs'
  ],
  'P11.2-REDTEAM': [
    'scripts/phase11-2-redteam.mjs',
    'scripts/phase11-2-evidence-check.mjs',
    'packages/policy-engine/src',
    'apps/api/src/orchestration-observability.ts',
    'apps/api/src/__tests__/aud17-connected-redteam.test.ts'
  ],
  'P11.2-POSTGRES': [
    'packages/persistence/migrations/0019_orchestrator_state.sql',
    'packages/persistence/migrations/0020_orchestrator_lineage_hardening.sql',
    'packages/persistence/migrations/0021_orchestrator_iteration_budget.sql',
    'packages/persistence/migrations/0022_orchestrator_evaluation_lineage.sql',
    'packages/persistence/migrations/0023_orchestrator_replan_fencing.sql',
    'packages/persistence/migrations/0024_tenant_isolation_constraint_validation.sql'
  ],
  'P11.2-CONSOLE': [
    'apps/web/src/features/orchestration/index.tsx',
    'apps/web/src/styles.css',
    'tests/e2e/visual-shell.spec.ts'
  ],
  'P11.2-PREFLIGHT': [
    'scripts/production-preflight.mjs',
    'tests/production-preflight.test.js',
    'packages/shared/src/env.ts'
  ],
  'P11.2-SUPPLY': [
    'scripts/generate-sbom.mjs',
    'scripts/check-licenses.mjs',
    '.github/workflows/verify.yml',
    '.github/workflows/security.yml'
  ],
  'P11.2-EXTERNAL': ['certification/external-gates.json'],
  'P11.2-NO-PRODUCTION-EFFECT': [
    'scripts/production-preflight.mjs',
    'scripts/phase11-bypass-audit.mjs',
    'certification/external-gates.json'
  ]
})

Object.assign(testMap, {
  'P11.2-PROMPT': ['scripts/phase11-2-redteam.mjs'],
  'P11.2-CANONICAL': [
    'tests/phase11-certification.test.js',
    'tests/phase11-formal-certification.test.js',
    'tests/phase11-2-certification.test.js'
  ],
  'P11.2-CALCULUS': [
    'scripts/phase11-2-redteam.mjs',
    'scripts/phase11-2-evidence-check.mjs',
    'scripts/phase11-self-test.mjs'
  ],
  'P11.2-ORCHESTRATION': [
    'packages/agent-runtime/src/__tests__/orchestration.test.ts',
    'packages/agent-runtime/src/__tests__/runtime-limits.test.ts',
    'packages/agent-runtime/src/__tests__/runtime-execution-recovery.test.ts'
  ],
  'P11.2-FENCING': [
    'packages/persistence/src/__tests__/orchestrator-postgres.test.ts',
    'packages/persistence/src/__tests__/outbox-durability.test.ts'
  ],
  'P11.2-EFFECT': [
    'packages/persistence/src/__tests__/effect-journal-postgres.test.ts',
    'apps/worker/src/__tests__/outbox-recovery.test.ts',
    'packages/persistence/src/__tests__/outbox-durability.test.ts'
  ],
  'P11.2-LINEAGE': [
    'apps/api/src/__tests__/orchestration-observability.test.ts',
    'packages/observability/src/__tests__/observability.test.ts'
  ],
  'P11.2-REDTEAM': [
    'scripts/phase11-2-redteam.mjs',
    'apps/api/src/__tests__/tenant-inbound-isolation.test.ts',
    'packages/policy-engine/src/__tests__/policy-engine-branch-hardening.test.ts'
  ],
  'P11.2-POSTGRES': ['npm run test:postgres'],
  'P11.2-CONSOLE': [
    'tests/e2e/visual-shell.spec.ts',
    'apps/web/src/features/orchestration/orchestration.test.tsx'
  ],
  'P11.2-PREFLIGHT': ['tests/production-preflight.test.js'],
  'P11.2-SUPPLY': [
    'npm run audit:security',
    'npm run licenses:check',
    'npm run sbom'
  ],
  'P11.2-EXTERNAL': [],
  'P11.2-NO-PRODUCTION-EFFECT': [
    'scripts/phase11-2-redteam.mjs',
    'scripts/phase11-bypass-audit.mjs'
  ]
})

Object.assign(gateMap, {
  'P11.2-PROMPT': ['prompt_integrity'],
  'P11.2-CANONICAL': [
    'certification_self_test',
    'evidence_graph',
    'clone_verify'
  ],
  'P11.2-CALCULUS': ['certification_self_test', 'certification_redteam'],
  'P11.2-ORCHESTRATION': ['unit', 'recovery', 'evals', 'outbox_replay'],
  'P11.2-FENCING': ['postgres', 'recovery', 'tenant_redteam'],
  'P11.2-EFFECT': ['postgres', 'recovery', 'chaos', 'outbox_replay'],
  'P11.2-LINEAGE': ['trace_lineage', 'evidence_graph', 'e2e'],
  'P11.2-REDTEAM': [
    'governance_redteam',
    'tenant_redteam',
    'certification_redteam'
  ],
  'P11.2-POSTGRES': ['postgres', 'recovery'],
  'P11.2-CONSOLE': ['unit', 'e2e', 'independent_critic'],
  'P11.2-PREFLIGHT': ['production_preflight'],
  'P11.2-SUPPLY': [
    'security',
    'supply_chain',
    'phase10_historical_verification'
  ],
  'P11.2-EXTERNAL': [],
  'P11.2-NO-PRODUCTION-EFFECT': [
    'production_preflight',
    'bypass_audit',
    'adversarial_proof'
  ]
})

function writeJson(relativePath, value) {
  const absolute = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(absolute), { recursive: true })
  fs.writeFileSync(absolute, `${JSON.stringify(value, null, 2)}\n`)
}

function readJson(relativePath) {
  const absolute = path.join(root, relativePath)
  if (!fs.existsSync(absolute)) return null
  try {
    return JSON.parse(fs.readFileSync(absolute, 'utf8'))
  } catch {
    return null
  }
}

function pathExists(relativePath) {
  return fs.existsSync(path.join(root, relativePath))
}

function redact(value) {
  let text = String(value ?? '')
  for (const key of [
    'TEST_DATABASE_URL',
    'DATABASE_URL',
    'OPENAI_API_KEY',
    'EVOLUTION_API_KEY',
    'CHATWOOT_API_TOKEN',
    'JWT_SECRET'
  ]) {
    const secret = process.env[key]
    if (secret && secret.length > 3)
      text = text.split(secret).join('[REDACTED]')
  }
  return text
}

function commandEnvironment(id) {
  const environment = {
    ...process.env,
    CI: process.env.CI ?? 'true',
    CVG_CERTIFICATION_MODE: 'CONTROLLED_LOCAL',
    CVG_ALLOW_REAL_EFFECTS: '0',
    CVG_REAL_EFFECTS: '0'
  }
  if (id === 'postgres' && databaseConfigured) {
    environment.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL
  } else {
    delete environment.TEST_DATABASE_URL
  }
  if (id !== 'postgres') delete environment.DATABASE_URL
  for (const key of [
    'OPENAI_API_KEY',
    'EVOLUTION_API_KEY',
    'CHATWOOT_API_TOKEN',
    'JWT_SECRET'
  ]) {
    delete environment[key]
  }
  if (id === 'production_preflight') {
    Object.assign(environment, {
      NODE_ENV: 'test',
      API_PERSISTENCE_MODE: 'memory',
      CVG_DURABLE_KERNEL_ORCHESTRATOR: 'false',
      CVG_WORKER_RUNTIME: 'published-agent',
      CVG_EXTERNAL_PROVIDER_APPROVED: 'false',
      CVG_EXTERNAL_CHANNEL_APPROVED: 'false',
      CVG_EXTERNAL_IDENTITY_APPROVED: 'false',
      CVG_EXTERNAL_RAG_APPROVED: 'false',
      CVG_RPO_RTO_MEASURED: 'false',
      CVG_SUPERVISED_PILOT_COMPLETE: 'false',
      CVG_ROLLBACK_VERIFIED: 'false',
      CVG_HUMAN_SIGNOFF: 'false'
    })
  }
  return environment
}

function gateFor(id, status, blocker) {
  const nonPass = status !== 'PASS'
  return {
    id,
    command: 'phase11 internal check',
    status,
    exitCode: nonPass ? 1 : 0,
    durationMs: 0,
    ...(blocker ? { blocker } : {})
  }
}

function runCommand(id, command) {
  const started = Date.now()
  const result = spawnSync(command, {
    cwd: root,
    shell: true,
    encoding: 'utf8',
    timeout: 3_600_000,
    maxBuffer: 128 * 1024 * 1024,
    env: commandEnvironment(id)
  })
  const durationMs = Date.now() - started
  const exitCode =
    typeof result.status === 'number' ? result.status : result.error ? 125 : 1
  const status =
    id === 'postgres' && !databaseConfigured
      ? 'NOT_EXECUTED'
      : exitCode === 0
        ? 'PASS'
        : 'FAIL'
  const logRelative = `certification/phase11/logs/${id}.log`
  const log = [
    `$ ${command}`,
    `# certificationId=${certificationId}`,
    `# candidateId=${candidate.candidateId}`,
    `# commit=${candidate.commit}`,
    `# treeHash=${candidate.treeHash}`,
    `# gate=${id}`,
    `# profile=${deploymentProfile}`,
    `# databaseConfigured=${id === 'postgres' && databaseConfigured}`,
    '# realEffects=disabled',
    `# exitCode=${exitCode} durationMs=${durationMs}`,
    '',
    redact(result.stdout ?? ''),
    redact(result.stderr ?? ''),
    result.error ? `error=${redact(result.error.message)}` : ''
  ].join('\n')
  fs.writeFileSync(path.join(root, logRelative), log)
  return {
    id,
    command,
    status,
    exitCode,
    durationMs,
    log: logRelative,
    logSha256: artifactRecord(root, logRelative).sha256,
    ...(status === 'NOT_EXECUTED'
      ? { blocker: 'TEST_DATABASE_URL_not_authorized_or_configured' }
      : {})
  }
}

const promptIntegrity = verifyPromptIntegrity(root, 'phase11_2')
const gates = [
  gateFor(
    'prompt_integrity',
    promptIntegrity.status,
    promptIntegrity.status === 'PASS'
      ? undefined
      : 'formal_prompt_copy_hash_mismatch'
  )
]
for (const [id, command] of commandEntries) gates.push(runCommand(id, command))

const engine = readNodeTarget(root)
gates.push(
  gateFor(
    'candidate_clean',
    candidate.dirty || candidate.untrackedFiles.length > 0 ? 'FAIL' : 'PASS',
    candidate.dirty || candidate.untrackedFiles.length > 0
      ? 'candidate_worktree_dirty'
      : undefined
  ),
  gateFor(
    'node_target',
    engine.status,
    engine.status === 'PASS' ? undefined : 'node_target_mismatch'
  )
)

function upsertGate(id, value) {
  const index = gates.findIndex((gate) => gate.id === id)
  if (index >= 0) gates[index] = { ...gates[index], ...value }
  else gates.push({ id, ...value })
}

function gatePasses(ids) {
  return ids.every((id) => requiredGateStatus(gates, id) === 'PASS')
}

function gateStatusFor(ids) {
  const statuses = ids.map((id) => requiredGateStatus(gates, id))
  if (statuses.every((status) => status === 'PASS')) return 'PASS'
  if (
    statuses.some((status) => ['INVALID', 'STALE', 'MISSING'].includes(status))
  )
    return 'INVALID'
  if (statuses.some((status) => status === 'FAIL')) return 'FAIL'
  if (statuses.some((status) => status === 'BLOCKED')) return 'BLOCKED'
  return 'NOT_RUN'
}

function buildInvariants() {
  const definitions = [
    [
      'INV-001',
      'Model cannot grant authority',
      ['governance_redteam'],
      ['scripts/phase11-2-redteam.mjs']
    ],
    [
      'INV-002',
      'Orchestrator cannot bypass governance',
      ['governance_redteam', 'bypass_audit'],
      [
        'scripts/phase11-2-redteam.mjs',
        'certification/phase11/logs/bypass_audit.log'
      ]
    ],
    [
      'INV-003',
      'Planner cannot grant capability',
      ['governance_redteam'],
      ['packages/policy-engine/src']
    ],
    [
      'INV-004',
      'Replanner cannot escalate capability',
      ['unit', 'recovery', 'governance_redteam'],
      ['certification/phase11/recovery-report.json']
    ],
    [
      'INV-005',
      'Risk cannot be downgraded by model',
      ['governance_redteam'],
      ['packages/policy-engine/src']
    ],
    [
      'INV-006',
      'Approval is payload-bound',
      ['governance_redteam', 'outbox_replay'],
      ['certification/phase11/logs/governance_redteam.log']
    ],
    [
      'INV-007',
      'Approval is single-use',
      ['postgres', 'governance_redteam'],
      ['certification/phase11/postgres-report.json']
    ],
    [
      'INV-008',
      'Execution chain is tenant-bound',
      ['tenant_redteam', 'postgres', 'trace_lineage'],
      [
        'certification/phase11/postgres-report.json',
        'certification/phase11/evidence-graph.json'
      ]
    ],
    [
      'INV-009',
      'Critical effects are idempotent/reconcilable',
      ['postgres', 'recovery', 'chaos', 'outbox_replay'],
      [
        'certification/phase11/postgres-report.json',
        'certification/phase11/chaos-report.json'
      ]
    ],
    [
      'INV-010',
      'Stale worker cannot commit',
      ['postgres', 'recovery'],
      [
        'certification/phase11/postgres-report.json',
        'certification/phase11/recovery-report.json'
      ]
    ],
    [
      'INV-011',
      'Budget survives restart',
      ['unit', 'recovery', 'evals'],
      [
        'certification/phase11/recovery-report.json',
        'certification/phase11/eval-report.json'
      ]
    ],
    [
      'INV-012',
      'Orchestration loop is bounded',
      ['unit', 'recovery', 'evals'],
      [
        'certification/phase11/recovery-report.json',
        'certification/phase11/eval-report.json'
      ]
    ],
    [
      'INV-013',
      'Goal completion requires verified evidence',
      ['unit', 'recovery'],
      ['certification/phase11/recovery-report.json']
    ],
    [
      'INV-014',
      'Human takeover suppresses automation',
      ['governance_redteam', 'e2e'],
      [
        'certification/phase11/logs/governance_redteam.log',
        'certification/phase11/logs/e2e.log'
      ]
    ],
    [
      'INV-015',
      'Certification is candidate-bound',
      [
        'certification_redteam',
        'evidence_graph',
        'candidate_clean',
        'clone_verify'
      ],
      [
        manifestRelative,
        pointerRelative,
        'certification/phase11/evidence-graph.json'
      ]
    ],
    [
      'INV-016',
      'Production claims require real proof',
      ['production_preflight', 'certification_redteam'],
      [
        'certification/phase11/preflight-report.json',
        'certification/phase11/negative-validation.json'
      ]
    ]
  ]
  if (
    definitions.map(([id]) => id).join(',') !==
    PHASE11_REQUIRED_INVARIANTS.join(',')
  ) {
    throw new Error(
      'phase11 invariant definition set is not the required INV-001..INV-016 contract'
    )
  }
  return definitions.map(([id, title, gateIds, evidenceRefs]) => {
    const status = gateStatusFor(gateIds)
    const refs =
      implementationMap[`P11.2-${id}`] ?? implementationMap['P11.2-REDTEAM']
    const testRefs = testMap[`P11.2-${id}`] ?? ['scripts/phase11-2-redteam.mjs']
    return {
      id,
      title,
      description: title,
      severity: 'critical',
      implementationRefs: refs,
      testRefs,
      evidenceRefs,
      status,
      evidence: evidenceRefs,
      rationale:
        status === 'PASS'
          ? 'The mapped executable gates passed in the controlled synthetic scope.'
          : `At least one mapped gate is not PASS: ${gateIds.join(', ')}.`
    }
  })
}

function criterionStatus(id) {
  if (id === 'P11.2-EXTERNAL') {
    return Object.entries(REQUIRED_EXTERNAL_STATUS).every(
      ([key, expected]) => externalGates[key] === expected
    )
      ? 'PASS'
      : 'BLOCKED'
  }
  const mappings = gateMap[id] ?? []
  return gatePasses(mappings) ? 'PASS' : 'PARTIAL'
}

function buildRequirements() {
  const qualityBar = readJson(qualityBarRelative)
  const criteria = qualityBar?.criteria ?? []
  return criteria.map((criterion) => ({
    id: criterion.id,
    title: criterion.title,
    priority: criterion.priority,
    target: criterion.target,
    required: criterion.required,
    status: criterionStatus(criterion.id),
    implementation: implementationMap[criterion.id] ?? [],
    tests: testMap[criterion.id] ?? [],
    evidence: [criterion.evidence],
    gates: gateMap[criterion.id] ?? [],
    blocking: criterion.required === true
  }))
}

function buildFindings(invariants, pointerReady) {
  const invariant = (id) => invariants.find((item) => item.id === id)
  const closed = (id) => invariant(id)?.status === 'PASS'
  const finding = (definition) => ({
    id: definition.id,
    title: definition.title,
    description: definition.description ?? definition.title,
    status: definition.closed ? 'CLOSED' : (definition.status ?? 'PARTIAL'),
    severity: definition.severity,
    blocking: definition.blocking,
    rootCause: definition.rootCause,
    fix: definition.fix,
    testRefs: definition.testRefs,
    evidenceRefs: definition.evidence,
    blockingProfiles: definition.blockingProfiles ?? [
      'STAGING',
      'SUPERVISED_PILOT',
      'PRODUCTION'
    ],
    evidence: definition.evidence,
    remainingRisk: definition.closed
      ? (definition.closedRisk ??
        'No known residual risk in the controlled scope.')
      : definition.remainingRisk
  })
  const local = [
    finding({
      id: 'AUD-11-01',
      title: 'Canonical Phase 11 package and pointer',
      description:
        'The current certification source of truth must be visible and complete.',
      severity: 'P1',
      blocking: true,
      closed: pointerReady && requiredPackageFiles.every(pathExists),
      rootCause:
        'Canonical output was previously ignored and not bound to the default branch.',
      fix: 'Track the namespaced package and seal the current pointer after evidence generation.',
      testRefs: ['tests/phase11-2-certification.test.js'],
      evidence: [manifestRelative, resultRelative],
      remainingRisk: 'Canonical package is incomplete or not hash-bound.'
    }),
    finding({
      id: 'AUD-11-02',
      title: 'Candidate binding and descendant reanchor',
      description:
        'A package commit may follow the source anchor only when the behavior scope is unchanged.',
      severity: 'P2',
      blocking: true,
      closed: closed('INV-015'),
      rootCause:
        'Git tree identity and behavior candidate identity were conflated.',
      fix: 'Bind the certificate to the source commit plus a stable behavior-scope hash and accept only descendants.',
      testRefs: ['tests/phase11-2-certification.test.js'],
      evidence: [
        pointerRelative,
        manifestRelative,
        'certification/phase11/evidence-graph.json'
      ],
      remainingRisk:
        'A behavior mutation after sealing must invalidate the package.'
    }),
    finding({
      id: 'AUD-11-03',
      title: 'Replan proof and parent lineage',
      description:
        'A failed or conflicting step must produce a new plan without overwriting prior evidence or replaying effects.',
      severity: 'P2',
      blocking: true,
      closed: closed('INV-004'),
      rootCause:
        'Replan safety depends on durable observation/evaluation and parent-plan links.',
      fix: 'Persist the evaluation and replan lineage through the runtime and PostgreSQL stores.',
      testRefs: ['packages/agent-runtime/src/__tests__/orchestration.test.ts'],
      evidence: ['certification/phase11/recovery-report.json'],
      remainingRisk:
        'A false completion or effect replay could otherwise be accepted.'
    }),
    finding({
      id: 'AUD-11-04',
      title: 'Loop, budget and restart controls',
      description:
        'Semantic cycles and cumulative limits must stop safely and survive restart.',
      severity: 'P2',
      blocking: true,
      closed: closed('INV-011') && closed('INV-012'),
      rootCause:
        'Autonomous iteration can be unsafe if usage is reset or only wall-clock bounded.',
      fix: 'Persist iteration and usage counters and terminate with explicit safe states.',
      testRefs: ['packages/agent-runtime/src/__tests__/runtime-limits.test.ts'],
      evidence: [
        'certification/phase11/recovery-report.json',
        'certification/phase11/eval-report.json'
      ],
      remainingRisk:
        'A restart or equivalent-cycle detector regression could extend execution.'
    }),
    finding({
      id: 'AUD-11-05',
      title: 'Stale worker and distributed fencing',
      description:
        'A worker that loses its lease must not settle current work.',
      severity: 'P2',
      blocking: true,
      closed: closed('INV-010'),
      rootCause:
        'Distributed claims require lease versions and compare-and-swap settlement.',
      fix: 'Enforce current lease token/version on claim, heartbeat and settlement paths.',
      testRefs: [
        'packages/persistence/src/__tests__/orchestrator-postgres.test.ts'
      ],
      evidence: [
        'certification/phase11/postgres-report.json',
        'certification/phase11/recovery-report.json'
      ],
      remainingRisk:
        'An untested driver or database isolation change could weaken fencing.'
    }),
    finding({
      id: 'AUD-11-06',
      title: 'Crash-after-effect and unknown-effect reconciliation',
      description:
        'Ambiguous external effects must remain unresolved until reconciled and never blindly retry.',
      severity: 'P2',
      blocking: true,
      closed: closed('INV-009'),
      rootCause:
        'A process crash can occur after the provider effect and before acknowledgement.',
      fix: 'Use the durable effect journal, idempotency scope and explicit reconciliation/handoff states.',
      testRefs: [
        'packages/persistence/src/__tests__/effect-journal-postgres.test.ts'
      ],
      evidence: [
        'certification/phase11/postgres-report.json',
        'certification/phase11/chaos-report.json'
      ],
      remainingRisk:
        'Real provider semantics remain external and are not validated locally.'
    }),
    finding({
      id: 'AUD-11-07',
      title: 'End-to-end trace and evidence lineage',
      description:
        'Inbound through response must be reconstructable with redacted safe attributes.',
      severity: 'P2',
      blocking: true,
      closed:
        gatePasses(['trace_lineage', 'evidence_graph']) && closed('INV-008'),
      rootCause:
        'Operator evidence needs an explicit stage graph in addition to source references.',
      fix: 'Emit the required runtime stage chain and bind it to artifacts, gates and invariants.',
      testRefs: ['apps/api/src/__tests__/orchestration-observability.test.ts'],
      evidence: [
        'certification/phase11/evidence-graph.json',
        'certification/phase11/trace-report.json'
      ],
      remainingRisk:
        'Hosted telemetry exporters remain a CI/operations integration boundary.'
    }),
    finding({
      id: 'AUD-11-08',
      title:
        'External provider, channel, identity, RAG, pilot and release proof',
      description:
        'Production Triple AAA requires authorized real-stack evidence and human release authority.',
      severity: 'EXTERNAL',
      blocking: true,
      closed: Object.entries(REQUIRED_EXTERNAL_STATUS).every(
        ([key, expected]) => externalGates[key] === expected
      ),
      rootCause:
        'The local task authorizes synthetic controlled verification only.',
      fix: 'Run separately authorized provider/channel/identity/RAG, RPO/RTO, pilot, rollback and signoff gates.',
      testRefs: [],
      blockingProfiles: ['SUPERVISED_PILOT', 'PRODUCTION'],
      evidence: [
        'certification/external-gates.json',
        'certification/phase11/integration-report.json'
      ],
      remainingRisk:
        'Real provider, channel, identity, approved institutional RAG, RPO/RTO, pilot, rollback and human signoff are not proven in this controlled run.'
    })
  ]
  const external = local.filter((item) => item.severity === 'EXTERNAL')
  return {
    P0: [],
    P1: local.filter((item) => item.severity === 'P1'),
    P2: local.filter((item) => item.severity === 'P2'),
    external
  }
}

function sourceReport(gateId, gate) {
  const sourcePath = sourceReports[gateId]
  const raw = sourcePath
    ? readJson(sourcePath)
    : gate?.log
      ? readJsonFromLog(gate.log)
      : null
  const sourceExists = !sourcePath || raw !== null
  if (sourcePath && gate.status === 'PASS' && !sourceExists) {
    gate.status = 'INVALID'
    gate.exitCode = 1
    gate.blocker = `required_report_missing:${sourcePath}`
  }
  return {
    schemaVersion: 1,
    kind: `phase11-${gateId}-report`,
    certificationId,
    candidateCommit: candidate.commit,
    generatedAt: new Date().toISOString(),
    gateId,
    status: gate.status,
    command: gate.command,
    log: gate.log ?? null,
    source: sourcePath ?? null,
    databaseConfigured: gateId === 'postgres' ? databaseConfigured : undefined,
    syntheticOnly: gateId !== 'postgres' || !databaseConfigured,
    raw: raw ?? {
      available: false,
      reason: sourcePath ? 'missing_or_invalid' : 'command_log_only'
    }
  }
}

const reportByGate = new Map(gates.map((gate) => [gate.id, gate]))
const evalReport = sourceReport('evals', reportByGate.get('evals'))
const chaosReport = sourceReport('chaos', reportByGate.get('chaos'))
const loadReport = sourceReport('load', reportByGate.get('load'))
const supplyReport = sourceReport(
  'supply_chain',
  reportByGate.get('supply_chain')
)
const recoveryReport = sourceReport('recovery', reportByGate.get('recovery'))
const postgresReport = sourceReport('postgres', reportByGate.get('postgres'))
const preflightReport = sourceReport(
  'production_preflight',
  reportByGate.get('production_preflight')
)
const redteamReport = sourceReport(
  'certification_redteam',
  reportByGate.get('certification_redteam')
)
const traceReport = sourceReport(
  'trace_lineage',
  reportByGate.get('trace_lineage')
)
const adversarialReport = sourceReport(
  'adversarial_proof',
  reportByGate.get('adversarial_proof')
)

const rawExternal = readJson('certification/external-gates.json') ?? {}
const externalGates = normalizeExternalGates(rawExternal)
const integrationReport = {
  schemaVersion: 1,
  kind: 'phase11-integration-report',
  certificationId,
  candidateCommit: candidate.commit,
  generatedAt: new Date().toISOString(),
  mode: 'CONTROLLED_LOCAL',
  realEffects: false,
  realData: false,
  statuses: externalGates,
  provider: { status: externalGates.modelProvider, evidence: null },
  channel: { status: externalGates.channel, evidence: null },
  externalIdentity: { status: externalGates.externalIdentity, evidence: null },
  institutionalRag: { status: externalGates.institutionalRag, evidence: null },
  rpoRto: { status: externalGates.rpoRto, evidence: null },
  pilot: { status: externalGates.pilot, evidence: null },
  rollback: { status: externalGates.rollback, evidence: null },
  humanSignoff: { status: externalGates.humanSignoff, evidence: null },
  staticUnavailable: {
    codeql: {
      status: 'NOT_EXECUTED',
      reason: 'CI-hosted check not run locally'
    },
    gitleaks: {
      status: 'NOT_EXECUTED',
      reason: 'CI-hosted check not run locally'
    }
  },
  notes: [
    'No real provider, channel, identity, RAG, pilot or production system was contacted.',
    'External statuses are qualification inputs, not local proof of authority.'
  ]
}
const rpoRto = {
  status: externalGates.rpoRto,
  measured: false,
  scope: 'No production infrastructure measurement in controlled local run.',
  evidence: 'certification/phase11/integration-report.json'
}
const pilot = {
  status: externalGates.pilot,
  supervised: false,
  evidence: 'certification/phase11/integration-report.json'
}
const humanSignoff = {
  status: externalGates.humanSignoff,
  authority: 'not-provided',
  evidence: 'certification/phase11/integration-report.json'
}

function readJsonFromLog(logRelative) {
  try {
    const content = fs.readFileSync(path.join(root, logRelative), 'utf8')
    const marker = content.indexOf('{')
    return marker >= 0 ? JSON.parse(content.slice(marker)) : null
  } catch {
    return null
  }
}

function writeOperationalReports() {
  writeJson('certification/phase11/prompt-integrity.json', {
    schemaVersion: 1,
    kind: 'phase11-prompt-integrity',
    certificationId,
    candidateCommit: candidate.commit,
    ...promptIntegrity
  })
  writeJson(reportTargets.evals, evalReport)
  writeJson(reportTargets.chaos, chaosReport)
  writeJson(reportTargets.load, loadReport)
  writeJson(reportTargets.recovery, recoveryReport)
  writeJson(reportTargets.postgres, postgresReport)
  writeJson(reportTargets.supply_chain, supplyReport)
  writeJson(reportTargets.production_preflight, preflightReport)
  writeJson(reportTargets.certification_redteam, redteamReport)
  writeJson(reportTargets.trace_lineage, traceReport)
  writeJson(reportTargets.adversarial_proof, adversarialReport)
  writeJson('certification/phase11/integration-report.json', integrationReport)
  writeJson('certification/phase11/integrations/status.json', integrationReport)
  const negativeGate = reportByGate.get('certification_self_test')
  const negativeRaw = negativeGate?.log
    ? readJsonFromLog(negativeGate.log)
    : null
  writeJson('certification/phase11/negative-validation.json', {
    schemaVersion: 1,
    kind: 'phase11-negative-validation',
    certificationId,
    candidateCommit: candidate.commit,
    status: negativeGate?.status ?? 'MISSING',
    gateId: 'certification_self_test',
    log: negativeGate?.log ?? null,
    checks: negativeRaw?.checks ?? [],
    note: 'The raw command log remains the authoritative execution evidence.'
  })
}

writeOperationalReports()

function artifactPaths() {
  const logPaths = fs
    .readdirSync(logDir)
    .filter((file) => file.endsWith('.log'))
    .sort()
    .map((file) => `certification/phase11/logs/${file}`)
  return [
    ...requiredPackageFiles.filter(
      (file) =>
        !['certification/phase11/manifest.json', resultRelative].includes(file)
    ),
    ...evidenceSourceFiles,
    ...logPaths
  ].filter(
    (file, index, all) => all.indexOf(file) === index && pathExists(file)
  )
}

function packageReady() {
  return requiredPackageFiles.every(pathExists)
}

function releaseManifest() {
  const sbom = pathExists('certification/sbom.cyclonedx.json')
    ? artifactRecord(root, 'certification/sbom.cyclonedx.json').sha256
    : null
  return {
    schemaVersion: 1,
    phase: '11',
    kind: 'phase11-release-manifest',
    certificationId,
    candidate: {
      candidateId: candidate.candidateId,
      commit: candidate.commit,
      treeHash: candidate.treeHash,
      branch: candidate.branch
    },
    buildId: null,
    containerDigest: null,
    sbomDigest: sbom,
    migrationDigest: null,
    agentVersion: readJson('package.json')?.version ?? null,
    policyVersion: null,
    promptVersions: PHASE11_2_PROMPT_SHA256,
    toolVersions: {
      node: process.versions.node,
      npm:
        spawnSync('npm', ['--version'], {
          cwd: root,
          encoding: 'utf8'
        }).stdout?.trim() ?? null
    },
    integrationEvidence: {
      mode: 'CONTROLLED_LOCAL',
      realEffects: false,
      report: 'certification/phase11/integration-report.json',
      externalGates
    },
    requestedProfile,
    deploymentProfile,
    productionAuthority: 'DENIED_UNLESS_EXTERNAL_PROOF_AND_SIGNOFF',
    noProductionDeployment: true
  }
}

function seal(pointerReady) {
  const preliminaryRequirements = buildRequirements()
  const preliminaryInvariants = buildInvariants()
  const graph = buildEvidenceGraph(
    preliminaryRequirements,
    gates,
    promptIntegrity,
    {
      candidateId: candidate.candidateId,
      invariants: preliminaryInvariants
    }
  )
  const graphValidation = verifyEvidenceGraph(graph)
  upsertGate(
    'evidence_graph',
    gateFor(
      'evidence_graph',
      graphValidation.valid ? 'PASS' : 'INVALID',
      graphValidation.valid ? undefined : graphValidation.errors.join(',')
    )
  )

  const initialInvariants = buildInvariants()
  const requirements = buildRequirements()
  const initialFindings = buildFindings(initialInvariants, pointerReady)
  const closurePrerequisites = PHASE11_2_REQUIRED_GATES.filter(
    (id) => id !== 'PHASE11_FORMAL_CLOSURE'
  )
  const localFindingsClosed = [
    ...initialFindings.P0,
    ...initialFindings.P1,
    ...initialFindings.P2
  ].every(
    (finding) => finding.blocking === false || finding.status === 'CLOSED'
  )
  const criticalInvariantsPass = initialInvariants
    .filter((invariant) => invariant.severity === 'critical')
    .every((invariant) => invariant.status === 'PASS')
  const closurePass =
    gatePasses(closurePrerequisites) &&
    localFindingsClosed &&
    criticalInvariantsPass &&
    graphValidation.valid &&
    promptIntegrity.status === 'PASS'
  upsertGate(
    'PHASE11_FORMAL_CLOSURE',
    gateFor(
      'PHASE11_FORMAL_CLOSURE',
      closurePass ? 'PASS' : 'FAIL',
      closurePass
        ? undefined
        : 'mandatory local gates, findings, invariants, graph or prompt integrity are incomplete'
    )
  )

  const invariants = buildInvariants()
  const findings = buildFindings(invariants, pointerReady)
  const graphWithFinalState = buildEvidenceGraph(
    requirements,
    gates,
    promptIntegrity,
    { candidateId: candidate.candidateId, invariants }
  )
  graphWithFinalState.certificationId = certificationId
  graphWithFinalState.candidateCommit = candidate.commit
  const finalGraphValidation = verifyEvidenceGraph(graphWithFinalState)
  if (!finalGraphValidation.valid) {
    upsertGate(
      'evidence_graph',
      gateFor(
        'evidence_graph',
        'INVALID',
        finalGraphValidation.errors.join(',')
      )
    )
  }

  writeJson('certification/phase11/gates.json', {
    schemaVersion: 1,
    kind: 'phase11-gates',
    certificationId,
    candidateCommit: candidate.commit,
    generatedAt: new Date().toISOString(),
    gates: PHASE11_2_REQUIRED_GATES.map(
      (id) =>
        gates.find((gate) => gate.id === id) ??
        gateFor(id, 'MISSING', 'gate_missing')
    )
  })
  writeJson('certification/phase11/invariants.json', {
    schemaVersion: 1,
    kind: 'phase11-invariants',
    certificationId,
    candidateCommit: candidate.commit,
    generatedAt: new Date().toISOString(),
    invariants
  })
  writeJson('certification/phase11/findings.json', {
    schemaVersion: 1,
    kind: 'phase11-findings',
    certificationId,
    candidateCommit: candidate.commit,
    generatedAt: new Date().toISOString(),
    findings
  })
  writeJson('certification/phase11/evidence-graph.json', graphWithFinalState)
  writeJson('certification/phase11/release-manifest.json', releaseManifest())

  const evidenceComplete =
    pointerReady && packageReady() && artifactPaths().length > 10
  const implementationComplete = Object.values(implementationMap)
    .flat()
    .every((file) => file.startsWith('npm run') || pathExists(file))
  const decision = computeCertificationDecision({
    candidate,
    gates,
    invariants,
    findings,
    externalGates,
    integrations: integrationReport,
    rpoRto,
    pilot,
    humanSignoff,
    deploymentProfile,
    requestedProfile,
    evidenceComplete,
    implementationComplete,
    requiredGates: PHASE11_2_REQUIRED_GATES
  })
  const scores = computeScores({
    gates,
    invariants,
    findings,
    successState: decision.successState
  })
  const report = {
    schemaVersion: 2,
    phase: '11',
    kind: 'phase11-result',
    certificationId,
    commit: candidate.commit,
    timestamp: new Date().toISOString(),
    candidate,
    deploymentProfile,
    requestedProfile,
    scores,
    findings,
    gates: PHASE11_2_REQUIRED_GATES.map(
      (id) =>
        gates.find((gate) => gate.id === id) ??
        gateFor(id, 'MISSING', 'gate_missing')
    ),
    invariants,
    externalGates,
    evals: evalReport,
    chaos: chaosReport,
    load: loadReport,
    recovery: recoveryReport,
    postgres: postgresReport,
    integrations: integrationReport,
    rpoRto,
    pilot,
    humanSignoff,
    successState: decision.successState,
    decision: decision.decision,
    certification: decision.certification,
    eligibleProfile: decision.eligibleProfile,
    remainingBlockers: decision.blockers
  }
  Phase11CurrentResultSchema.parse(report)
  writeJson(resultRelative, report)

  const sealTimestamp = new Date().toISOString()
  const allArtifacts = artifactPaths().map((file) =>
    artifactRecord(root, file, {
      producer: 'scripts/phase11-certify.mjs',
      timestamp: sealTimestamp,
      candidateCommit: candidate.commit
    })
  )
  const resultArtifact = artifactRecord(root, resultRelative, {
    producer: 'scripts/phase11-certify.mjs',
    timestamp: sealTimestamp,
    candidateCommit: candidate.commit
  })
  const manifest = {
    schemaVersion: 2,
    phase: '11',
    kind: 'phase11-manifest',
    certificationId,
    candidateCommit: candidate.commit,
    candidateId: candidate.candidateId,
    treeHash: candidate.treeHash,
    timestamp: sealTimestamp,
    result: resultArtifact,
    artifacts: allArtifacts,
    evidenceGraph: 'certification/phase11/evidence-graph.json',
    releaseManifest: 'certification/phase11/release-manifest.json'
  }
  Phase11ManifestSchema.parse(manifest)
  writeJson(manifestRelative, manifest)

  writeJson('certification/phase11-result.json', {
    schemaVersion: 1,
    kind: 'deprecated-phase11-alias',
    phase: '11',
    canonicalResult: resultRelative,
    currentPointer: pointerRelative,
    doNotUseAsCurrent: true
  })
  writeJson('certification/phase11-manifest.json', {
    schemaVersion: 1,
    kind: 'deprecated-phase11-alias',
    phase: '11',
    canonicalManifest: manifestRelative,
    currentPointer: pointerRelative,
    doNotUseAsCurrent: true
  })

  const currentPointer = {
    schemaVersion: 1,
    kind: 'current-certification-pointer',
    phase: '11',
    authority: 'certification/phase11',
    certificationId,
    candidateId: candidate.candidateId,
    commit: candidate.commit,
    treeHash: candidate.treeHash,
    branch: candidate.branch,
    updatedAt: new Date().toISOString(),
    result: resultRelative,
    manifest: manifestRelative,
    resultSha256: artifactRecord(root, resultRelative).sha256,
    manifestSha256: artifactRecord(root, manifestRelative).sha256,
    historicalPhase10: {
      package: 'certification/logs/historical/2026-09-11-phase10',
      verifier: 'npm run certification:verify:historical',
      doesNotQualifyCurrent: true
    }
  }
  writeJson(pointerRelative, currentPointer)
  return { report, manifest, currentPointer, invariants, findings, decision }
}

// The first seal creates every file; the second seal binds the pointer-aware
// state and is the only state returned as current.
seal(false)
const finalSeal = seal(true)

process.stdout.write(
  `${JSON.stringify(
    {
      certificationId,
      candidateId: candidate.candidateId,
      commit: candidate.commit,
      treeHash: candidate.treeHash,
      decision: finalSeal.report.decision,
      certification: finalSeal.report.certification,
      eligibleProfile: finalSeal.report.eligibleProfile,
      remainingBlockers: finalSeal.report.remainingBlockers,
      package: 'certification/phase11',
      currentPointer: pointerRelative
    },
    null,
    2
  )}\n`
)
process.stderr.write(
  `[phase11] decision=${finalSeal.report.decision} certification=${finalSeal.report.certification} certificationId=${certificationId}\n`
)
process.exitCode = ['GO', 'CONDITIONAL_GO'].includes(finalSeal.report.decision)
  ? 0
  : 1
