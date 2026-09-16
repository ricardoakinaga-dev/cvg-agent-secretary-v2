import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import {
  PHASE11_FORMAL_PROMPT_SHA256,
  PHASE11_REQUIRED_GATES,
  Phase11CandidateSchema,
  Phase11GateSchema,
  Phase11ManifestSchema,
  buildEvidenceGraph,
  buildPhase11Candidate,
  candidateDrift,
  computeCertificationDecision,
  computePromotionDecision,
  gateSetIntegrity,
  verifyEvidenceGraph,
  verifyPromptIntegrity
} from '../scripts/lib/phase11-rules.mjs'
import { sha256Bytes } from '../scripts/lib/certification-rules.mjs'

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
)
const fixtureRoots = []

const EXPECTED_REQUIRED_GATES = [
  'prompt_integrity',
  'format',
  'typecheck',
  'lint',
  'build',
  'unit',
  'coverage',
  'security',
  'supply_chain',
  'worker_startup',
  'postgres',
  'e2e',
  'evals',
  'chaos',
  'load',
  'recovery',
  'bypass_audit',
  'certification_self_test',
  'phase10_historical_verification',
  'evidence_graph',
  'candidate_clean',
  'node_target'
]

const EXPECTED_FORMAL_PROMPT_SHA256 = {
  'pasted-text-1.txt':
    '04219513b71ea777af52f79a3e11769fc6cd26c0fb02d43c9f3c306075bf9585',
  'pasted-text-2.txt':
    'e6009539380088f7782e7fa16e13721a7d3731e19da304a9358d8e6d55f0c31e',
  'pasted-text-3.txt':
    '65dd4f692affc18f2c7ba74b728da844ba87aa9b49c4a94f12a860f52bf3cee9',
  'pasted-text-4.txt':
    'af7d9b981a5c10f9e04a851996bda4d10369d40edf25d8f9001d9ee1255697dd',
  'pasted-text-5.txt':
    '356292e25d203724367feeb25f8b39cc0e3aec46c7196ddc1ef95edd443b010b'
}

const COMPLETE_EXTERNAL_GATES = {
  modelProvider: 'VALIDATED_REAL',
  channel: 'VALIDATED_REAL',
  externalIdentity: 'VALIDATED_REAL',
  institutionalRag: 'VALIDATED_APPROVED',
  rpoRto: 'VALIDATED',
  pilot: 'PASS',
  rollback: 'PASS',
  humanSignoff: 'VALIDATED'
}

const INCOMPLETE_EXTERNAL_GATES = {
  modelProvider: 'CONTROLLED_ONLY',
  channel: 'CONTROLLED_ONLY',
  externalIdentity: 'NOT_VALIDATED',
  institutionalRag: 'NOT_VALIDATED',
  rpoRto: 'NOT_VALIDATED',
  pilot: 'PENDING',
  rollback: 'NOT_RUN',
  humanSignoff: 'PENDING'
}

const CLEAN_INVARIANTS = [
  {
    id: 'INV-FORMAL-CERTIFICATION',
    title: 'formal certification fixture is internally coherent',
    severity: 'critical',
    status: 'PASS',
    evidence: ['fixture:evidence'],
    rationale: 'synthetic invariant for the formal certification lane'
  }
]

const NO_FINDINGS = { P0: [], P1: [], P2: [], external: [] }

function candidate(overrides = {}) {
  return {
    candidateId: 'a'.repeat(64),
    commit: 'b'.repeat(40),
    treeHash: 'c'.repeat(40),
    branch: 'formal-fixture',
    dirty: false,
    untrackedFiles: [],
    createdAt: '2026-09-15T00:00:00.000Z',
    fileCount: 1,
    files: [
      {
        path: 'fixture.txt',
        sha256: 'd'.repeat(64),
        size: 8,
        tracked: true
      }
    ],
    ...overrides
  }
}

function passGates(overrides = {}) {
  return PHASE11_REQUIRED_GATES.map((id) => ({
    id,
    command: `fixture:${id}`,
    status: 'PASS',
    exitCode: 0,
    durationMs: 1,
    ...overrides[id]
  }))
}

function decision(overrides = {}) {
  return computeCertificationDecision({
    candidate: candidate(),
    gates: passGates(),
    invariants: CLEAN_INVARIANTS,
    findings: NO_FINDINGS,
    externalGates: COMPLETE_EXTERNAL_GATES,
    rpoRto: COMPLETE_EXTERNAL_GATES.rpoRto,
    pilot: COMPLETE_EXTERNAL_GATES.pilot,
    humanSignoff: COMPLETE_EXTERNAL_GATES.humanSignoff,
    deploymentProfile: 'STAGING',
    requestedProfile: 'STAGING',
    evidenceComplete: true,
    implementationComplete: true,
    ...overrides
  })
}

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
}

function createGitFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phase11-formal-'))
  fixtureRoots.push(root)
  git(root, ['init', '-q'])
  git(root, ['config', 'user.email', 'phase11@test.invalid'])
  git(root, ['config', 'user.name', 'Phase 11 Formal Fixture'])
  fs.writeFileSync(path.join(root, 'tracked.txt'), 'initial\n')
  git(root, ['add', 'tracked.txt'])
  git(root, ['commit', '-qm', 'formal fixture'])
  return root
}

afterEach(() => {
  for (const root of fixtureRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

describe('Phase 11 formal certification lane', () => {
  it('certifies exactly five formal prompt sources and their hashes', () => {
    expect(PHASE11_FORMAL_PROMPT_SHA256).toEqual(EXPECTED_FORMAL_PROMPT_SHA256)

    const integrity = verifyPromptIntegrity(repositoryRoot, 'formal')

    expect(integrity).toMatchObject({
      sourceSet: 'formal',
      expectedCount: 5,
      observedCount: 5,
      status: 'PASS'
    })
    expect(integrity.files).toHaveLength(5)

    for (const file of integrity.files) {
      const name = path.basename(file.path)
      expect(file.expectedSha256).toBe(EXPECTED_FORMAL_PROMPT_SHA256[name])
      expect(file.sha256).toBe(file.expectedSha256)
      expect(
        sha256Bytes(fs.readFileSync(path.join(repositoryRoot, file.path)))
      ).toBe(file.sha256)
    }
  })

  it('keeps the historical prompt set separate from the current formal set', () => {
    const formal = verifyPromptIntegrity(repositoryRoot, 'formal')
    const historical = verifyPromptIntegrity(repositoryRoot, 'historical')

    expect(formal.sourceSet).toBe('formal')
    expect(formal.expectedCount).toBe(5)
    expect(historical.sourceSet).toBe('historical')
    expect(historical.expectedCount).toBe(14)
    expect(historical.status).toBe('PASS')
    expect(formal.files.map((file) => file.path)).not.toEqual(
      historical.files.map((file) => file.path)
    )
  })

  it('requires every mandatory gate for a local formal closure', () => {
    expect(PHASE11_REQUIRED_GATES).toEqual(EXPECTED_REQUIRED_GATES)
    expect(new Set(PHASE11_REQUIRED_GATES).size).toBe(
      EXPECTED_REQUIRED_GATES.length
    )

    const gates = passGates()
    expect(gates.map((gate) => gate.id)).toEqual(EXPECTED_REQUIRED_GATES)
    expect(
      gates.every((gate) => Phase11GateSchema.safeParse(gate).success)
    ).toBe(true)
    expect(gateSetIntegrity(gates)).toEqual({ valid: true, errors: [] })

    const result = decision({ gates })
    expect(result.decision).toBe('GO')
    expect(result.successState.localVerificationComplete).toBe(true)
    expect(result.successState.localEngineeringClosure).toBe(true)
  })

  it('rejects PASS when a mandatory gate has a non-zero exit code', () => {
    const gates = passGates({ unit: { exitCode: 7 } })
    const result = decision({ gates })

    expect(result.decision).toBe('NO_GO')
    expect(result.blockers).toContain('pass_gate_nonzero_exit:unit:7')
  })

  it('rejects a duplicated mandatory gate', () => {
    const gates = passGates()
    gates.push({ ...gates[0] })
    const result = decision({ gates })

    expect(result.decision).toBe('NO_GO')
    expect(result.blockers).toContain('duplicate_gate:prompt_integrity')
  })

  it('rejects a missing mandatory gate', () => {
    const gates = passGates().filter((gate) => gate.id !== 'e2e')
    const result = decision({ gates })

    expect(result.decision).toBe('NO_GO')
    expect(result.blockers).toContain('required_gate_not_pass:e2e:MISSING')
  })

  it('rejects a dirty tracked candidate', () => {
    const fixture = createGitFixture()
    const clean = buildPhase11Candidate(
      fixture,
      new Date('2026-09-15T00:00:00.000Z')
    )
    fs.writeFileSync(path.join(fixture, 'tracked.txt'), 'changed\n')
    const dirty = buildPhase11Candidate(
      fixture,
      new Date('2026-09-15T00:00:00.000Z')
    )

    expect(clean.dirty).toBe(false)
    expect(dirty.dirty).toBe(true)
    expect(decision({ candidate: dirty }).blockers).toContain(
      'candidate_worktree_dirty'
    )
    expect(decision({ candidate: dirty }).decision).toBe('NO_GO')
  })

  it('rejects and records an untracked candidate file', () => {
    const fixture = createGitFixture()
    fs.writeFileSync(path.join(fixture, 'untracked.txt'), 'synthetic\n')
    const dirty = buildPhase11Candidate(
      fixture,
      new Date('2026-09-15T00:00:00.000Z')
    )

    expect(dirty.dirty).toBe(true)
    expect(dirty.untrackedFiles).toEqual(['untracked.txt'])
    expect(dirty.fileCount).toBe(2)
    expect(decision({ candidate: dirty }).decision).toBe('NO_GO')
    expect(decision({ candidate: dirty }).blockers).toContain(
      'candidate_worktree_dirty'
    )
    expect(Phase11CandidateSchema.safeParse(dirty).success).toBe(true)
  })

  it('detects candidate tree drift after the recorded commit changes', () => {
    const fixture = createGitFixture()
    const recorded = buildPhase11Candidate(
      fixture,
      new Date('2026-09-15T00:00:00.000Z')
    )

    fs.writeFileSync(path.join(fixture, 'tracked.txt'), 'tree drift\n')
    git(fixture, ['add', 'tracked.txt'])
    git(fixture, ['commit', '-qm', 'tree drift'])
    const current = buildPhase11Candidate(
      fixture,
      new Date('2026-09-15T00:00:00.000Z')
    )

    expect(current.dirty).toBe(false)
    expect(current.treeHash).not.toBe(recorded.treeHash)
    expect(current.candidateId).not.toBe(recorded.candidateId)
    expect(candidateDrift(fixture, recorded)).toEqual([
      expect.objectContaining({ type: 'changed', path: 'tracked.txt' })
    ])
  })

  it('keeps external incompleteness fail-closed for non-production closure', () => {
    const result = decision({
      externalGates: INCOMPLETE_EXTERNAL_GATES,
      rpoRto: INCOMPLETE_EXTERNAL_GATES.rpoRto,
      pilot: INCOMPLETE_EXTERNAL_GATES.pilot,
      humanSignoff: INCOMPLETE_EXTERNAL_GATES.humanSignoff
    })

    expect(result.decision).toBe('CONDITIONAL_GO')
    expect(result.certification).toBe('AAA_CANDIDATE')
    expect(result.eligibleProfile).toBe('STAGING')
    expect(result.successState.externalIntegrationClosure).toBe(false)
    expect(result.externalBlockers).toEqual(
      expect.arrayContaining([
        'external_gate_pending:modelProvider:expected_VALIDATED_REAL:actual_CONTROLLED_ONLY',
        'external_gate_pending:channel:expected_VALIDATED_REAL:actual_CONTROLLED_ONLY',
        'external_gate_pending:externalIdentity:expected_VALIDATED_REAL:actual_NOT_VALIDATED',
        'external_gate_pending:institutionalRag:expected_VALIDATED_APPROVED:actual_NOT_VALIDATED',
        'external_gate_pending:rpoRto:expected_VALIDATED:actual_NOT_VALIDATED',
        'external_gate_pending:pilot:expected_PASS:actual_PENDING',
        'external_gate_pending:rollback:expected_PASS:actual_NOT_RUN',
        'external_gate_pending:humanSignoff:expected_VALIDATED:actual_PENDING'
      ])
    )
  })

  it('denies PRODUCTION promotion when external gates are incomplete', () => {
    const calculated = decision({
      externalGates: INCOMPLETE_EXTERNAL_GATES,
      deploymentProfile: 'CONTROLLED_LOCAL',
      requestedProfile: 'PRODUCTION',
      rpoRto: INCOMPLETE_EXTERNAL_GATES.rpoRto,
      pilot: INCOMPLETE_EXTERNAL_GATES.pilot,
      humanSignoff: INCOMPLETE_EXTERNAL_GATES.humanSignoff
    })
    const result = {
      ...calculated,
      deploymentProfile: 'CONTROLLED_LOCAL',
      candidate: candidate(),
      gates: passGates(),
      invariants: CLEAN_INVARIANTS,
      findings: NO_FINDINGS,
      externalGates: INCOMPLETE_EXTERNAL_GATES,
      integrations: {},
      rpoRto: INCOMPLETE_EXTERNAL_GATES.rpoRto,
      pilot: INCOMPLETE_EXTERNAL_GATES.pilot,
      humanSignoff: INCOMPLETE_EXTERNAL_GATES.humanSignoff
    }

    expect(calculated.decision).toBe('NO_GO')
    expect(calculated.eligibleProfile).toBe('STAGING')
    expect(calculated.certification).not.toBe('STATE_OF_ART_TRIPLE_AAA')
    expect(calculated.successState.productionAssuranceClosure).toBe(false)

    const promotion = computePromotionDecision({
      result,
      requestedProfile: 'PRODUCTION'
    })

    expect(promotion.eligible).toBe(false)
    expect(promotion.reason).toBe('production_assurance_incomplete')
    expect(promotion.externalBlockers.length).toBeGreaterThan(0)
  })

  it('binds the evidence graph to the candidate and formal decision', () => {
    const fixtureCandidate = candidate()
    const graph = buildEvidenceGraph(
      [],
      passGates(),
      {
        files: Object.keys(EXPECTED_FORMAL_PROMPT_SHA256).map((name) => ({
          path: `docs/11_phase11/prompt-master/20260915-formal-closure/source/${name}`,
          status: 'PASS'
        }))
      },
      { candidateId: fixtureCandidate.candidateId }
    )

    expect(verifyEvidenceGraph(graph)).toEqual({ valid: true, errors: [] })
    expect(graph.nodes).toContainEqual({
      id: `candidate:${fixtureCandidate.candidateId}`,
      kind: 'candidate'
    })
    for (const id of PHASE11_REQUIRED_GATES) {
      expect(graph.edges).toContainEqual({
        from: `gate:${id}`,
        to: `candidate:${fixtureCandidate.candidateId}`,
        relation: 'binds_to'
      })
    }

    const withoutCandidate = {
      ...graph,
      nodes: graph.nodes.filter(
        (node) => node.id !== `candidate:${fixtureCandidate.candidateId}`
      )
    }
    expect(verifyEvidenceGraph(withoutCandidate).valid).toBe(false)
  })

  it('requires candidate-bound fields in the v2 manifest', () => {
    const timestamp = '2026-09-15T00:00:00.000Z'
    const artifact = {
      path: 'certification/phase11/phase11-result.json',
      sha256: 'e'.repeat(64),
      size: 1,
      producer: 'fixture',
      timestamp,
      candidateCommit: 'b'.repeat(40)
    }
    const manifest = {
      schemaVersion: 2,
      phase: '11',
      kind: 'phase11-manifest',
      certificationId: 'phase11-formal-fixture',
      candidateCommit: 'b'.repeat(40),
      candidateId: 'a'.repeat(64),
      treeHash: 'c'.repeat(40),
      timestamp,
      result: artifact,
      artifacts: [artifact],
      evidenceGraph: 'certification/phase11/evidence-graph.json',
      releaseManifest: 'certification/phase11/release-manifest.json'
    }

    expect(Phase11ManifestSchema.safeParse(manifest).success).toBe(true)
    expect(
      Phase11ManifestSchema.safeParse({
        ...manifest,
        candidateId: undefined
      }).success
    ).toBe(false)
    expect(
      Phase11ManifestSchema.safeParse({
        ...manifest,
        treeHash: undefined
      }).success
    ).toBe(false)
  })
})
