#!/usr/bin/env node
import assert from 'node:assert/strict'
import {
  DEPLOYMENT_PROFILES,
  PHASE11_REQUIRED_GATES,
  computeCertificationDecision,
  computePromotionDecision,
  gateSetIntegrity
} from './lib/phase11-rules.mjs'

const candidate = (overrides = {}) => ({
  candidateId: 'a'.repeat(64),
  commit: 'b'.repeat(40),
  treeHash: 'c'.repeat(64),
  branch: 'main',
  dirty: false,
  untrackedFiles: [],
  createdAt: '2026-09-15T00:00:00.000Z',
  fileCount: 1,
  files: [],
  ...overrides
})

const passGates = (overrides = {}) =>
  PHASE11_REQUIRED_GATES.map((id) => ({
    id,
    command: `fixture:${id}`,
    status: 'PASS',
    exitCode: 0,
    durationMs: 1,
    ...overrides[id]
  }))

const cleanInvariants = [
  {
    id: 'INV-CERT',
    title: 'certificate integrity',
    severity: 'critical',
    status: 'PASS',
    evidence: ['fixture'],
    rationale: 'fixture'
  }
]

const noFindings = { P0: [], P1: [], P2: [], external: [] }
const allExternal = {
  modelProvider: 'VALIDATED_REAL',
  channel: 'VALIDATED_REAL',
  externalIdentity: 'VALIDATED_REAL',
  institutionalRag: 'VALIDATED_APPROVED',
  rpoRto: 'VALIDATED',
  pilot: 'PASS',
  rollback: 'PASS',
  humanSignoff: 'VALIDATED'
}

function decision(overrides = {}) {
  return computeCertificationDecision({
    candidate: candidate(),
    gates: passGates(),
    invariants: cleanInvariants,
    findings: noFindings,
    externalGates: allExternal,
    deploymentProfile: 'CONTROLLED_LOCAL',
    requestedProfile: 'STAGING',
    evidenceComplete: true,
    implementationComplete: true,
    ...overrides
  })
}

const checks = []
function check(id, run) {
  run()
  checks.push(id)
}

check('FALSE-GO-SCORES-IRRELEVANT', () => {
  const result = decision({
    gates: passGates({ format: { status: 'FAIL', exitCode: 1 } })
  })
  assert.equal(result.decision, 'NO_GO')
})

check('FALSE-GO-PASS-NONZERO', () => {
  const result = decision({
    gates: passGates({ unit: { exitCode: 7 } })
  })
  assert.equal(result.decision, 'NO_GO')
  assert.ok(
    result.blockers.some((item) =>
      item.startsWith('pass_gate_nonzero_exit:unit')
    )
  )
})

check('FALSE-GO-DUPLICATE-GATE', () => {
  const gates = passGates()
  gates.push({ ...gates[0] })
  const result = decision({ gates })
  assert.equal(result.decision, 'NO_GO')
  assert.ok(result.blockers.includes('duplicate_gate:prompt_integrity'))
})

check('FALSE-GO-DIRTY-CANDIDATE', () => {
  const result = decision({ candidate: candidate({ dirty: true }) })
  assert.equal(result.decision, 'NO_GO')
  assert.ok(result.blockers.includes('candidate_worktree_dirty'))
})

check('FALSE-PROMOTION-CONTROLLED-TO-PRODUCTION', () => {
  const result = decision({
    externalGates: {
      modelProvider: 'CONTROLLED_ONLY',
      channel: 'CONTROLLED_ONLY',
      externalIdentity: 'CONTROLLED_ONLY',
      institutionalRag: 'NOT_VALIDATED',
      rpoRto: 'NOT_VALIDATED',
      pilot: 'PENDING',
      rollback: 'NOT_RUN',
      humanSignoff: 'PENDING'
    },
    requestedProfile: 'PRODUCTION'
  })
  assert.equal(result.decision, 'NO_GO')
  assert.notEqual(result.certification, 'STATE_OF_ART_TRIPLE_AAA')
})

check('FALSE-PROMOTION-MISSING-SIGNOFF', () => {
  const gates = passGates()
  const result = computeCertificationDecision({
    candidate: candidate(),
    gates,
    invariants: cleanInvariants,
    findings: noFindings,
    externalGates: { ...allExternal, humanSignoff: 'PENDING' },
    deploymentProfile: 'PRODUCTION',
    requestedProfile: 'PRODUCTION',
    evidenceComplete: true,
    implementationComplete: true
  })
  assert.equal(result.decision, 'NO_GO')
  assert.equal(result.successState.productionAssuranceClosure, false)
})

check('GATE-INTEGRITY', () => {
  assert.equal(gateSetIntegrity(passGates()).valid, true)
  assert.equal(
    gateSetIntegrity(passGates({ unit: { exitCode: 9 } })).valid,
    false
  )
})

check('PROFILE-ENUM', () => {
  assert.deepEqual(DEPLOYMENT_PROFILES, [
    'CONTROLLED_LOCAL',
    'STAGING',
    'SUPERVISED_PILOT',
    'PRODUCTION'
  ])
})

const promotionFixture = decision()
const promotionResult = {
  deploymentProfile: 'CONTROLLED_LOCAL',
  candidate: candidate(),
  gates: passGates(),
  invariants: cleanInvariants,
  findings: noFindings,
  externalGates: {
    modelProvider: 'CONTROLLED_ONLY',
    channel: 'CONTROLLED_ONLY',
    externalIdentity: 'NOT_VALIDATED',
    institutionalRag: 'NOT_VALIDATED'
  },
  integrations: {},
  rpoRto: {},
  pilot: {},
  humanSignoff: {},
  successState: promotionFixture.successState,
  certification: promotionFixture.certification
}
check('PROMOTION-CHECK-DENY', () => {
  const result = computePromotionDecision({
    result: promotionResult,
    requestedProfile: 'PRODUCTION'
  })
  assert.equal(result.eligible, false)
  assert.ok(result.externalBlockers.length > 0)
})

console.log(
  JSON.stringify(
    {
      schemaVersion: 1,
      kind: 'phase11-negative-validation',
      status: 'PASS',
      checks: checks.map((id) => ({ id, status: 'PASS' }))
    },
    null,
    2
  )
)
