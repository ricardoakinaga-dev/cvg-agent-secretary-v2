#!/usr/bin/env node
/**
 * Phase 11.1 formal-closure certification runner.
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
  PHASE11_FORMAL_PROMPT_SHA256,
  PHASE11_REQUIRED_GATES,
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
  'docs/04_audit/evidence/AAA/AAA-21/quality-bar-phase11-1-v1.json'
const consoleCriticRelative =
  'docs/04_audit/evidence/AAA/AAA-21/console-visual-critic-20260916.json'

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
  ['evals', 'npx tsx scripts/phase10-eval-report.ts'],
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
  ]
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
  supply_chain: 'certification/phase11/supply-report.json'
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
  'certification/phase11/prompt-integrity.json'
]

const evidenceSourceFiles = [
  ...Object.keys(PHASE11_FORMAL_PROMPT_SHA256).map(
    (file) =>
      `docs/11_phase11/prompt-master/20260915-formal-closure/source/${file}`
  ),
  'docs/11_phase11/prompt-master/20260915-formal-closure/README.md',
  qualityBarRelative,
  consoleCriticRelative,
  'docs/02_spec/phase11_1_formal_closure_contract_20260915.md',
  'docs/phase11/PHASE11_DELTA_AUDIT.md',
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

const promptIntegrity = verifyPromptIntegrity(root, 'formal')
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

function criticStatus() {
  const report = readJson(consoleCriticRelative)
  if (!report) return 'NOT_RUN'
  return report.status === 'PASS' || report.verdict === 'PASS'
    ? 'PASS'
    : 'BLOCKED'
}

function buildInvariant(id, title, severity, status, evidence, rationale) {
  return { id, title, severity, status, evidence, rationale }
}

function buildInvariants(pointerReady) {
  const packageReady = requiredPackageFiles.every(pathExists)
  const critic = criticStatus()
  return [
    buildInvariant(
      'INV-CERT-PACKAGE',
      'Canonical Phase 11 package is complete',
      'critical',
      packageReady ? 'PASS' : 'NOT_RUN',
      ['certification/phase11/manifest.json', resultRelative],
      packageReady
        ? 'All required canonical files exist in the namespaced package.'
        : 'The seal has not yet produced every required canonical file.'
    ),
    buildInvariant(
      'INV-CERT-POINTER',
      'Current pointer resolves Phase 11 only',
      'critical',
      pointerReady && pathExists(pointerRelative) ? 'PASS' : 'NOT_RUN',
      [pointerRelative, manifestRelative, resultRelative],
      pointerReady
        ? 'The current pointer is written after the canonical result and manifest.'
        : 'Pointer validation is intentionally deferred to the second seal pass.'
    ),
    buildInvariant(
      'INV-CERT-CALCULUS',
      'Certification calculus is shared and fail-closed',
      'critical',
      gateStatusFor(['certification_self_test']),
      ['certification/phase11/negative-validation.json'],
      'Negative validation must reject false-go, dirty, stale and non-zero PASS cases.'
    ),
    buildInvariant(
      'INV-BYPASS',
      'Production-target bypass inventory is empty',
      'high',
      gateStatusFor(['bypass_audit']),
      ['certification/phase11/logs/bypass_audit.log'],
      'Direct outbound application call-sites must remain outside production entrypoints.'
    ),
    buildInvariant(
      'INV-REPLAN',
      'Replan lineage is preserved',
      'high',
      gateStatusFor(['unit', 'recovery']),
      ['certification/phase11/recovery-report.json'],
      'The unit and recovery lanes are the evidence boundary for parent-plan continuation.'
    ),
    buildInvariant(
      'INV-LOOP-BUDGET',
      'Loop and budget limits are bounded',
      'high',
      gateStatusFor(['unit', 'recovery', 'evals']),
      [
        'certification/phase11/eval-report.json',
        'certification/phase11/recovery-report.json'
      ],
      'Repeated fingerprints and persisted usage must terminate safely.'
    ),
    buildInvariant(
      'INV-FENCING',
      'Lease and claim fencing is current',
      'critical',
      gateStatusFor(['postgres', 'recovery']),
      [
        'certification/phase11/postgres-report.json',
        'certification/phase11/recovery-report.json'
      ],
      'A stale worker must not settle work after a takeover.'
    ),
    buildInvariant(
      'INV-EFFECT',
      'Effect journal is idempotent across crash ambiguity',
      'critical',
      gateStatusFor(['postgres', 'recovery']),
      [
        'certification/phase11/postgres-report.json',
        'certification/phase11/recovery-report.json'
      ],
      'Irreversible effects require durable idempotency and UNCERTAIN reconciliation.'
    ),
    buildInvariant(
      'INV-LINEAGE',
      'Durable lineage reaches operator evidence',
      'high',
      gateStatusFor(['unit', 'e2e', 'recovery']),
      ['certification/phase11/evidence-graph.json'],
      'Goal, plan, step, attempt, observation, evaluation, effect and audit links must be reconstructable.'
    ),
    buildInvariant(
      'INV-TENANT-GOVERNANCE',
      'Tenant and actor boundaries are governed',
      'critical',
      gateStatusFor(['unit', 'security', 'postgres']),
      [
        'certification/phase11/logs/security.log',
        'certification/phase11/postgres-report.json'
      ],
      'Cross-tenant access and untrusted actor paths must fail closed.'
    ),
    buildInvariant(
      'INV-POSTGRES',
      'Disposable PostgreSQL evidence is real or explicitly not run',
      'critical',
      gateStatusFor(['postgres']),
      ['certification/phase11/postgres-report.json'],
      databaseConfigured
        ? 'This run was explicitly authorized for a disposable TEST_DATABASE_URL.'
        : 'No disposable TEST_DATABASE_URL was authorized; this invariant remains NOT_RUN.'
    ),
    buildInvariant(
      'INV-CONSOLE',
      'Operator console exposes safe operational states',
      'high',
      critic === 'PASS' && gatePasses(['unit', 'e2e']) ? 'PASS' : critic,
      [
        'certification/phase11/logs/e2e.log',
        'certification/phase11/integration-report.json',
        consoleCriticRelative
      ],
      critic === 'PASS'
        ? 'Fresh visual/state evidence is present and the automated console lanes pass.'
        : 'Automated smoke coverage or a fresh independent visual/state critic is still missing.'
    )
  ]
}

function criterionStatus(id) {
  if (id === 'P11.1-EXTERNAL') {
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
    status: definition.closed ? 'CLOSED' : (definition.status ?? 'PARTIAL'),
    severity: definition.severity,
    blocking: definition.blocking,
    evidence: definition.evidence,
    remainingRisk: definition.closed
      ? (definition.closedRisk ??
        'No known residual risk in the controlled scope.')
      : definition.remainingRisk
  })
  const local = [
    finding({
      id: 'AUD-11-01',
      title: 'Canonical Phase 11 package was absent',
      severity: 'P1',
      blocking: true,
      closed:
        pathExists('certification/phase11/manifest.json') &&
        pathExists(resultRelative),
      evidence: [manifestRelative, resultRelative],
      remainingRisk: 'Canonical package is incomplete or not hash-bound.'
    }),
    finding({
      id: 'AUD-11-02',
      title: 'Phase 10 artifacts could be mistaken for current',
      severity: 'P1',
      blocking: true,
      closed: pointerReady && pathExists(pointerRelative),
      evidence: [pointerRelative, 'certification/historical/phase10/README.md'],
      remainingRisk:
        'Current certification could still resolve to a stale historical artifact.'
    }),
    finding({
      id: 'AUD-11-03',
      title: 'Legacy production bypass inventory',
      severity: 'P1',
      blocking: true,
      closed: closed('INV-BYPASS'),
      evidence: ['certification/phase11/logs/bypass_audit.log'],
      remainingRisk:
        'A direct outbound call-site could bypass the governed kernel.'
    }),
    finding({
      id: 'AUD-11-04',
      title: 'Replan lineage and safe continuation',
      severity: 'P1',
      blocking: true,
      closed: closed('INV-REPLAN'),
      evidence: ['certification/phase11/recovery-report.json'],
      remainingRisk:
        'A false evaluation could replace a plan without durable parent lineage.'
    }),
    finding({
      id: 'AUD-11-05',
      title: 'Loop, budget and restart controls',
      severity: 'P1',
      blocking: true,
      closed: closed('INV-LOOP-BUDGET'),
      evidence: [
        'certification/phase11/recovery-report.json',
        'certification/phase11/eval-report.json'
      ],
      remainingRisk:
        'Autonomous work could exceed a persisted budget or restart unsafely.'
    }),
    finding({
      id: 'AUD-11-06',
      title: 'Lease and fencing proof',
      severity: 'P0',
      blocking: true,
      closed: closed('INV-FENCING'),
      evidence: ['certification/phase11/postgres-report.json'],
      remainingRisk:
        'A stale worker could acknowledge or settle work after takeover.'
    }),
    finding({
      id: 'AUD-11-07',
      title: 'Crash-aware effect journal',
      severity: 'P0',
      blocking: true,
      closed: closed('INV-EFFECT'),
      evidence: [
        'certification/phase11/postgres-report.json',
        'certification/phase11/recovery-report.json'
      ],
      remainingRisk:
        'An ambiguous external effect could be repeated or incorrectly marked complete.'
    }),
    finding({
      id: 'AUD-11-08',
      title: 'Operator console state matrix',
      severity: 'P1',
      blocking: true,
      closed: closed('INV-CONSOLE'),
      evidence: ['certification/phase11/logs/e2e.log', consoleCriticRelative],
      remainingRisk:
        'Operators may not distinguish active, blocked, failed, handoff and budget states safely.'
    }),
    finding({
      id: 'AUD-11-10',
      title: 'Current supply-chain evidence',
      severity: 'P1',
      blocking: true,
      closed: gatePasses(['security', 'supply_chain']),
      evidence: [
        'certification/phase11/supply-report.json',
        'certification/phase11/logs/security.log'
      ],
      remainingRisk:
        'Dependency, license, SBOM or static-security evidence is not current.'
    })
  ]
  const external = [
    finding({
      id: 'AUD-11-09',
      title: 'External qualification and human release authority',
      severity: 'EXTERNAL',
      blocking: true,
      closed: Object.entries(REQUIRED_EXTERNAL_STATUS).every(
        ([key, expected]) => externalGates[key] === expected
      ),
      evidence: [
        'certification/external-gates.json',
        'certification/phase11/integration-report.json'
      ],
      remainingRisk:
        'Real provider, channel, identity, approved institutional RAG, RPO/RTO, pilot, rollback and human signoff are not proven in this controlled run.'
    })
  ]
  return {
    P0: local.filter((item) => item.severity === 'P0'),
    P1: local.filter((item) => item.severity === 'P1'),
    P2: local.filter((item) => item.severity === 'P2'),
    external
  }
}

function sourceReport(gateId, gate) {
  const sourcePath = sourceReports[gateId]
  const raw = sourcePath ? readJson(sourcePath) : null
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
    promptVersions: PHASE11_FORMAL_PROMPT_SHA256,
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
  const preliminaryInvariants = buildInvariants(pointerReady)
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

  const invariants = buildInvariants(pointerReady)
  const requirements = buildRequirements()
  const findings = buildFindings(invariants, pointerReady)
  const graphWithFinalState = buildEvidenceGraph(
    requirements,
    gates,
    promptIntegrity,
    { candidateId: candidate.candidateId, invariants }
  )
  graphWithFinalState.certificationId = certificationId
  graphWithFinalState.candidateCommit = candidate.commit

  writeJson('certification/phase11/gates.json', {
    schemaVersion: 1,
    kind: 'phase11-gates',
    certificationId,
    candidateCommit: candidate.commit,
    generatedAt: new Date().toISOString(),
    gates: PHASE11_REQUIRED_GATES.map(
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
    implementationComplete
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
    gates: PHASE11_REQUIRED_GATES.map(
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
process.exitCode = finalSeal.report.decision === 'GO' ? 0 : 1
