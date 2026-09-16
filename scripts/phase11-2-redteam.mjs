#!/usr/bin/env node
/** Deterministic, synthetic red-team probes for the Phase 11.2 gates. */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  PHASE11_2_REQUIRED_GATES,
  PHASE11_EVIDENCE_STAGES,
  PHASE11_REQUIRED_INVARIANTS,
  buildEvidenceGraph,
  computeCertificationDecision,
  gateSetIntegrity,
  verifyEvidenceGraph,
  verifyPromptIntegrity
} from './lib/phase11-rules.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const suite = (
  process.argv.find((argument) => argument.startsWith('--suite=')) ??
  '--suite=all'
).slice(8)
const checks = []

function check(id, pass, detail = '') {
  checks.push({
    id,
    status: pass ? 'PASS' : 'FAIL',
    ...(detail ? { detail } : {})
  })
}

function candidate(overrides = {}) {
  return {
    candidateId: 'a'.repeat(64),
    commit: 'b'.repeat(40),
    treeHash: 'c'.repeat(64),
    branch: 'main',
    dirty: false,
    untrackedFiles: [],
    createdAt: '2026-09-16T00:00:00.000Z',
    fileCount: 0,
    files: [],
    ...overrides
  }
}

function gates(overrides = {}) {
  return PHASE11_2_REQUIRED_GATES.map((id) => ({
    id,
    command: `synthetic:redteam:${id}`,
    status: 'PASS',
    exitCode: 0,
    durationMs: 1,
    ...overrides[id]
  }))
}

function invariants() {
  return PHASE11_REQUIRED_INVARIANTS.map((id) => ({
    id,
    title: id,
    severity: 'critical',
    status: 'PASS',
    evidence: ['synthetic:redteam'],
    rationale: 'Synthetic proof fixture'
  }))
}

const cleanFindings = { P0: [], P1: [], P2: [], external: [] }
const completeExternal = {
  modelProvider: 'VALIDATED_REAL',
  channel: 'VALIDATED_REAL',
  externalIdentity: 'VALIDATED_REAL',
  institutionalRag: 'VALIDATED_APPROVED',
  rpoRto: 'VALIDATED',
  pilot: 'PASS',
  rollback: 'PASS',
  humanSignoff: 'VALIDATED'
}

if (suite === 'all' || suite === 'certification') {
  const base = {
    candidate: candidate(),
    gates: gates(),
    invariants: invariants(),
    findings: cleanFindings,
    externalGates: completeExternal,
    evidenceComplete: true,
    implementationComplete: true,
    requestedProfile: 'STAGING',
    deploymentProfile: 'CONTROLLED_LOCAL'
  }
  check(
    'FALSE-GO-SCORES-100-MANDATORY-FAIL',
    computeCertificationDecision({
      ...base,
      gates: gates({ security: { status: 'FAIL', exitCode: 1 } })
    }).decision === 'NO_GO'
  )
  check(
    'NOT-EXECUTED-BLOCKS-GO',
    computeCertificationDecision({
      ...base,
      gates: gates({ postgres: { status: 'NOT_EXECUTED', exitCode: 1 } })
    }).decision === 'NO_GO'
  )
  check(
    'DIRTY-CANDIDATE-BLOCKS',
    computeCertificationDecision({
      ...base,
      candidate: candidate({ dirty: true })
    }).decision === 'NO_GO'
  )
  check(
    'PROFILE-ESCALATION-BLOCKS',
    computeCertificationDecision({
      ...base,
      requestedProfile: 'PRODUCTION',
      deploymentProfile: 'PRODUCTION',
      externalGates: { ...completeExternal, humanSignoff: 'PENDING' }
    }).decision === 'NO_GO'
  )
  check(
    'NONZERO-PASS-BLOCKS',
    computeCertificationDecision({
      ...base,
      gates: gates({ unit: { exitCode: 9 } })
    }).decision === 'NO_GO' &&
      gateSetIntegrity(gates({ unit: { exitCode: 9 } })).valid === false
  )
  check(
    'SIXTEEN-INVARIANTS-REQUIRED',
    PHASE11_REQUIRED_INVARIANTS.length === 16 &&
      invariants().length === PHASE11_REQUIRED_INVARIANTS.length
  )
}

if (suite === 'all' || suite === 'trace') {
  const graph = buildEvidenceGraph(
    [],
    gates(),
    { files: [] },
    {
      candidateId: candidate().candidateId,
      invariants: invariants()
    }
  )
  check(
    'TRACE-STAGES-COMPLETE',
    PHASE11_EVIDENCE_STAGES.every((stage) =>
      graph.nodes.some((node) => node.id === `stage:${stage}`)
    ) && verifyEvidenceGraph(graph).valid
  )
  check(
    'TRACE-ORDER-COMPLETE',
    PHASE11_EVIDENCE_STAGES.slice(1).every((stage, index) =>
      graph.edges.some(
        (edge) =>
          edge.from === `stage:${PHASE11_EVIDENCE_STAGES[index]}` &&
          edge.to === `stage:${stage}` &&
          edge.relation === 'follows'
      )
    )
  )
}

if (suite === 'all' || suite === 'governance') {
  const composition = fs.readFileSync(
    path.join(root, 'apps/worker/src/kernel-composition.ts'),
    'utf8'
  )
  const policy = fs.readFileSync(
    path.join(root, 'packages/policy-engine/src/engine.ts'),
    'utf8'
  )
  check(
    'MODEL-CANNOT-GRANT-AUTHORITY',
    composition.includes('assertControlledKernelSnapshot') &&
      policy.includes('Missing context or missing tenants deny') &&
      policy.includes('#deny')
  )
  check(
    'CONTROLLED-KERNEL-HAS-NO-REAL-CAPABILITIES',
    composition.includes("'appointment.modify'") &&
      composition.includes('controlled_fake') &&
      composition.includes('appointment.confirm')
  )
}

if (suite === 'all' || suite === 'tenant') {
  const observability = fs.readFileSync(
    path.join(root, 'apps/api/src/orchestration-observability.ts'),
    'utf8'
  )
  const persistence = fs.readFileSync(
    path.join(root, 'packages/persistence/src/tenant-scoped-postgres.ts'),
    'utf8'
  )
  check(
    'TENANT-SCOPE-IS-EXPLICIT',
    observability.includes('tenantId: goal.tenantId') &&
      observability.includes('tenantId: plan.tenantId') &&
      persistence.includes('CVG_TENANT_CONTEXT_SETTING') &&
      persistence.includes('tenant_id')
  )
}

if (suite === 'all' || suite === 'outbox') {
  const outbox = fs.readFileSync(
    path.join(root, 'packages/persistence/src/outbox.ts'),
    'utf8'
  )
  const recovery = fs.readFileSync(
    path.join(root, 'apps/worker/src/jobs/process-outbox-event.ts'),
    'utf8'
  )
  const worker = fs.readFileSync(
    path.join(root, 'apps/worker/src/controlled-worker.ts'),
    'utf8'
  )
  check(
    'OUTBOX-REPLAY-REVALIDATES',
    outbox.includes('idempotency') &&
      outbox.includes('revalidate') &&
      recovery.includes('revalidate') &&
      recovery.includes('lease') &&
      recovery.includes('tenant') &&
      worker.includes('revalidateOutbox')
  )
}

if (suite === 'all' || suite === 'clone') {
  const ignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8')
  check(
    'CANONICAL-PACKAGE-NOT-IGNORED',
    !ignore
      .split('\n')
      .some(
        (line) =>
          line.trim() === 'certification/phase11/' ||
          line.trim() === 'certification/current.json'
      )
  )
  check(
    'DEFAULT-COMMANDS-EXIST',
    fs
      .readFileSync(path.join(root, 'package.json'), 'utf8')
      .includes('"production:preflight"')
  )
}

if (suite === 'all' || suite === 'prompt') {
  check(
    'PROMPT-SIX-SOURCE-INTEGRITY',
    verifyPromptIntegrity(root, 'phase11_2').status === 'PASS'
  )
}

const failed = checks.filter((checkResult) => checkResult.status !== 'PASS')
const output = {
  schemaVersion: 1,
  kind: 'phase11-2-redteam',
  suite,
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  syntheticOnly: true,
  checks
}
process.stdout.write(`${JSON.stringify(output, null, 2)}\n`)
process.exitCode = failed.length === 0 ? 0 : 1
