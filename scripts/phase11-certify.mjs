#!/usr/bin/env node
/**
 * Phase 11 controlled certification runner.
 *
 * It records current raw gates and derives a conservative result. It never
 * turns a missing external gate, a dirty candidate, or a target-runtime
 * mismatch into a release approval.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  Phase11ManifestSchema,
  Phase11ResultSchema,
  artifactRecord,
  buildEvidenceGraph,
  buildPhase11Candidate,
  evaluatePhase11,
  readNodeTarget,
  verifyPromptIntegrity
} from './lib/phase11-rules.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const certificationDir = path.join(root, 'certification')
const logDir = path.join(certificationDir, 'phase11-logs')
fs.mkdirSync(logDir, { recursive: true })

const matrix = JSON.parse(
  fs.readFileSync(
    path.join(root, 'docs/11_phase11/requirements-matrix.json'),
    'utf8'
  )
)
const commit = spawnSync('git', ['rev-parse', 'HEAD'], {
  cwd: root,
  encoding: 'utf8'
}).stdout.trim()
const candidate = buildPhase11Candidate(root)
const runId = `phase11-${candidate.candidateId.slice(0, 12)}-${Date.now().toString(36)}`

const commandGates = [
  ['format', 'npm run format:check'],
  ['typecheck', 'npm run typecheck'],
  ['lint', 'npm run lint'],
  ['build', 'npm run build'],
  ['unit', 'npm test'],
  ['coverage', 'npm run test:coverage'],
  ['security', 'npm run audit:security'],
  ['worker_startup', 'npm run test:worker:startup'],
  ['postgres', 'npm run test:postgres'],
  ['e2e', 'npm run test:e2e'],
  ['phase10_current_verification', 'node scripts/phase10-verify.mjs']
]

function runCommand(id, command) {
  const startedAt = Date.now()
  const commandEnv = { ...process.env, CI: process.env.CI ?? 'true' }
  if (id !== 'postgres') delete commandEnv.TEST_DATABASE_URL
  const result = spawnSync(command, {
    cwd: root,
    shell: true,
    encoding: 'utf8',
    timeout: 3_600_000,
    maxBuffer: 128 * 1024 * 1024,
    env: commandEnv
  })
  const durationMs = Date.now() - startedAt
  const output = [
    `$ ${command}`,
    `# runId=${runId} gate=${id}`,
    `# exitCode=${result.status ?? 1} durationMs=${durationMs}`,
    '',
    result.stdout ?? '',
    result.stderr ?? ''
  ].join('\n')
  const logPath = path.join(logDir, `${id}.log`)
  fs.writeFileSync(logPath, output)
  const status =
    id === 'postgres' && !process.env.TEST_DATABASE_URL
      ? 'NOT_EXECUTED'
      : result.status === 0
        ? 'PASS'
        : 'FAIL'
  return {
    id,
    command,
    status,
    exitCode: result.status ?? 1,
    durationMs,
    log: path.relative(root, logPath).split(path.sep).join('/'),
    logSha256: artifactRecord(root, path.relative(root, logPath)).sha256
  }
}

function localGate(id, status, blocker) {
  return {
    id,
    command: 'phase11 internal check',
    status,
    exitCode: status === 'PASS' ? 0 : 1,
    durationMs: 0,
    ...(blocker ? { blocker } : {})
  }
}

const promptIntegrity = verifyPromptIntegrity(root)
const gates = [
  localGate(
    'prompt_integrity',
    promptIntegrity.status,
    promptIntegrity.status === 'PASS' ? undefined : 'prompt_copy_hash_mismatch'
  )
]
for (const [id, command] of commandGates) gates.push(runCommand(id, command))
gates.push(
  localGate(
    'candidate_clean',
    candidate.git.dirty ? 'FAIL' : 'PASS',
    candidate.git.dirty ? 'candidate_worktree_dirty' : undefined
  ),
  localGate(
    'node_target',
    readNodeTarget(root).status,
    readNodeTarget(root).status === 'PASS' ? undefined : 'node_target_mismatch'
  )
)

const externalPath = path.join(certificationDir, 'external-gates.json')
const externalGates = fs.existsSync(externalPath)
  ? JSON.parse(fs.readFileSync(externalPath, 'utf8'))
  : {
      modelProvider: 'NOT_VALIDATED',
      channel: 'NOT_VALIDATED',
      externalIdentity: 'NOT_VALIDATED',
      humanSignoff: 'PENDING'
    }
const requirements = matrix.requirements
const engine = readNodeTarget(root)
const decision = evaluatePhase11({
  candidate,
  gates,
  promptIntegrity,
  engine,
  externalGates,
  requirements
})
const resultPayload = {
  schemaVersion: 1,
  phase: '11',
  kind: 'phase11-result',
  commit,
  runId,
  timestamp: new Date().toISOString(),
  candidate: {
    candidateId: candidate.candidateId,
    dirty: candidate.git.dirty,
    head: candidate.git.head,
    fileCount: candidate.files.length
  },
  promptIntegrity,
  requirements,
  gates,
  externalGates,
  engine,
  evidenceGraph: buildEvidenceGraph(requirements, gates, promptIntegrity),
  ...decision
}
Phase11ResultSchema.parse(resultPayload)
const resultPath = 'certification/phase11-result.json'
fs.writeFileSync(
  path.join(root, resultPath),
  `${JSON.stringify(resultPayload, null, 2)}\n`
)
const manifestPayload = {
  schemaVersion: 1,
  phase: '11',
  kind: 'phase11-manifest',
  commit,
  candidateId: candidate.candidateId,
  result: artifactRecord(root, resultPath),
  artifacts: [
    artifactRecord(root, resultPath),
    ...gates
      .filter((gate) => gate.log)
      .map((gate) => artifactRecord(root, gate.log)),
    artifactRecord(root, 'docs/11_phase11/requirements-matrix.json'),
    artifactRecord(root, 'docs/11_phase11/prompt-master/README.md')
  ]
}
Phase11ManifestSchema.parse(manifestPayload)
fs.writeFileSync(
  path.join(root, 'certification/phase11-manifest.json'),
  `${JSON.stringify(manifestPayload, null, 2)}\n`
)
process.stderr.write(
  `[phase11] decision=${decision.decision} certification=${decision.certification} run=${runId}\n`
)
process.exitCode = decision.decision === 'GO' ? 0 : 1
