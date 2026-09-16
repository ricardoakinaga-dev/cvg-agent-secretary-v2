import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { z } from 'zod'
import {
  buildCandidateRecord,
  collectCandidateFiles,
  diffCandidateFiles,
  isCandidateExcluded,
  sha256Bytes
} from './certification-rules.mjs'

export const PHASE11_REQUIRED_GATES = [
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

export const PHASE11_GATE_STATUSES = [
  'PASS',
  'FAIL',
  'NOT_EXECUTED',
  'BLOCKED',
  'STALE',
  'INVALID',
  'MISSING',
  'NOT_APPLICABLE'
]

export const PHASE11_VERDICTS = [
  'NO_GO',
  'AAA_CONTROLLED',
  'AAA_CANDIDATE',
  'STATE_OF_ART_TRIPLE_AAA'
]

export const DEPLOYMENT_PROFILES = [
  'CONTROLLED_LOCAL',
  'STAGING',
  'SUPERVISED_PILOT',
  'PRODUCTION'
]

export const PHASE11_DECISIONS = ['GO', 'CONDITIONAL_GO', 'NO_GO']

/** Historical prompt set retained for compatibility and audit replays. */
export const PHASE11_PROMPT_SHA256 = {
  'pasted-text-1.txt':
    'a3993d1794b04ad53bb6c3388ff5bb0d8a8595b31ad8ec2989f8551424ad4ac0',
  'pasted-text-2.txt':
    '0fb73260f751c3fe4f0c5ba6b966c6d71c7c6e213c6020ad2e4b9e51faeb1331',
  'pasted-text-3.txt':
    '83be2719497e03f318a6f7a218d086242db6cfad88f3e784d51687f3040db968',
  'pasted-text-4.txt':
    'c4dbf03dc9592aace80d9572a21c6db01be7d3cdccbbf03436cb160191b45e4d',
  'pasted-text-5.txt':
    '091dea50ab43cd7cb82dd9fd65891f41317bca1d09d6449209bd54af38bf1d9e',
  'pasted-text-6.txt':
    'f32b51e251cbea05fc90679c652991136ea34cc56d5fd22ddd508591c35c04ef',
  'pasted-text-7.txt':
    '98402ac70b5f4ba7a28ccb5f9c5be83b2d941ca91b7f0ef590b5ca53ffa0660c',
  'pasted-text-8.txt':
    '8a4deee9d8316c706bc3aeb1eaa84d2702f8a7550f303e17d9841ed672026797',
  'pasted-text-9.txt':
    '9c0e2c12ed3139cabc243c704c798b0ee5d3db0095fe0c7bebc194b8a0101100',
  'pasted-text-10.txt':
    'ad3b73d34e0f3879c9dafe4cab0eaabd472e6900ecc91bdeb2f838f8bf4514bd',
  'pasted-text-11.txt':
    '02b1870dc47aa29ad6b2f54c3f54b662cd6c61f25dcf954a8e6591571c537b2f',
  'pasted-text-12.txt':
    '25b0ba6a8fab58e4ab2735c0906a7b544baf24013e70fcf39340ff89bbf6415c',
  'pasted-text-13.txt':
    '4f709b70a38c13de2dc1b918b80b5979871d7f25c76834efa1a4a15942aa2ce0',
  'pasted-text-14.txt':
    'c8ffad766acfc83efabb391bd044e7cc146f8adfe792cf49f62263024703d91b'
}

/** The exact five-source intake for the current formal-closure task. */
export const PHASE11_FORMAL_PROMPT_SHA256 = {
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

const phase11Commit = z.string().regex(/^[0-9a-f]{7,64}$/)
const digest = z.string().regex(/^[0-9a-f]{64}$/)
const treeDigest = z.string().regex(/^[0-9a-f]{40,64}$/)

export const Phase11GateSchema = z.object({
  id: z.string().min(1),
  command: z.string().min(1),
  status: z.enum(PHASE11_GATE_STATUSES),
  exitCode: z.number().int(),
  durationMs: z.number().int().nonnegative(),
  log: z.string().optional(),
  logSha256: digest.optional(),
  metrics: z.record(z.string(), z.unknown()).optional(),
  blocker: z.string().min(1).optional(),
  evidence: z.array(z.string().min(1)).optional()
})

export const Phase11ArtifactSchema = z.object({
  path: z.string().min(1),
  sha256: digest,
  size: z.number().int().nonnegative(),
  producer: z.string().min(1),
  timestamp: z.string().datetime(),
  candidateCommit: phase11Commit,
  gateId: z.string().min(1).optional()
})

export const Phase11InvariantSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  status: z.enum(['PASS', 'FAIL', 'BLOCKED', 'NOT_RUN', 'INVALID']),
  evidence: z.array(z.string().min(1)),
  rationale: z.string().min(1)
})

export const Phase11FindingSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(['CLOSED', 'PARTIAL', 'OPEN', 'BLOCKED']),
  severity: z.enum(['P0', 'P1', 'P2', 'EXTERNAL']),
  blocking: z.boolean(),
  evidence: z.array(z.string().min(1)),
  remainingRisk: z.string().min(1)
})

export const Phase11CandidateSchema = z.object({
  candidateId: digest,
  commit: phase11Commit,
  treeHash: treeDigest,
  branch: z.string().min(1),
  dirty: z.boolean(),
  untrackedFiles: z.array(z.string()),
  createdAt: z.string().datetime(),
  fileCount: z.number().int().nonnegative(),
  files: z.array(
    z.object({
      path: z.string().min(1),
      sha256: digest,
      size: z.number().int().nonnegative(),
      tracked: z.boolean()
    })
  )
})

const findingsShape = z.object({
  P0: z.array(Phase11FindingSchema),
  P1: z.array(Phase11FindingSchema),
  P2: z.array(Phase11FindingSchema),
  external: z.array(Phase11FindingSchema)
})

const successStateShape = z.object({
  localEngineeringClosure: z.boolean(),
  externalIntegrationClosure: z.boolean(),
  supervisedPilotClosure: z.boolean(),
  productionAssuranceClosure: z.boolean(),
  implementationComplete: z.boolean(),
  localVerificationComplete: z.boolean(),
  evidenceComplete: z.boolean(),
  criticalInvariantsSatisfied: z.boolean(),
  externalValidationComplete: z.boolean(),
  pilotComplete: z.boolean(),
  productionProofComplete: z.boolean(),
  eligibleForRequestedProfile: z.boolean()
})

export const Phase11CurrentResultSchema = z.object({
  schemaVersion: z.literal(2),
  phase: z.literal('11'),
  kind: z.literal('phase11-result'),
  certificationId: z.string().min(1),
  commit: phase11Commit,
  timestamp: z.string().datetime(),
  candidate: Phase11CandidateSchema,
  deploymentProfile: z.enum(DEPLOYMENT_PROFILES),
  requestedProfile: z.enum(DEPLOYMENT_PROFILES),
  scores: z.record(z.string(), z.unknown()),
  findings: findingsShape,
  gates: z.array(Phase11GateSchema),
  invariants: z.array(Phase11InvariantSchema),
  externalGates: z.record(z.string(), z.unknown()),
  evals: z.record(z.string(), z.unknown()),
  chaos: z.record(z.string(), z.unknown()),
  load: z.record(z.string(), z.unknown()),
  recovery: z.record(z.string(), z.unknown()),
  postgres: z.record(z.string(), z.unknown()),
  integrations: z.record(z.string(), z.unknown()),
  rpoRto: z.record(z.string(), z.unknown()),
  pilot: z.record(z.string(), z.unknown()),
  humanSignoff: z.record(z.string(), z.unknown()),
  successState: successStateShape,
  decision: z.enum(PHASE11_DECISIONS),
  certification: z.enum(PHASE11_VERDICTS),
  eligibleProfile: z.enum(DEPLOYMENT_PROFILES),
  remainingBlockers: z.array(z.string())
})

/** Compatibility schema for the previous root Phase 11 manifest shape. */
const LegacyPhase11ManifestSchema = z.object({
  schemaVersion: z.literal(1),
  phase: z.literal('11'),
  kind: z.literal('phase11-manifest'),
  commit: z.string().min(7),
  candidateId: digest,
  result: z.object({
    path: z.string(),
    sha256: digest,
    size: z.number().int()
  }),
  artifacts: z.array(
    z.object({ path: z.string(), sha256: digest, size: z.number().int() })
  )
})

export const Phase11ManifestSchema = z.union([
  LegacyPhase11ManifestSchema,
  z.object({
    schemaVersion: z.literal(2),
    phase: z.literal('11'),
    kind: z.literal('phase11-manifest'),
    certificationId: z.string().min(1),
    candidateCommit: phase11Commit,
    candidateId: digest,
    treeHash: treeDigest,
    timestamp: z.string().datetime(),
    result: Phase11ArtifactSchema,
    artifacts: z.array(Phase11ArtifactSchema).min(1),
    evidenceGraph: z.string().min(1),
    releaseManifest: z.string().min(1)
  })
])

export function gitOutput(root, args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' })
  return (result.stdout ?? '').trim()
}

export function listUntrackedFiles(root) {
  return gitOutput(root, ['ls-files', '--others', '--exclude-standard', '-z'])
    .split('\0')
    .filter(Boolean)
    .filter((file) => !isCandidateExcluded(file))
    .sort()
}

export function buildPhase11Candidate(root, now = new Date()) {
  const base = buildCandidateRecord({
    root,
    files: collectCandidateFiles(root),
    now
  })
  return {
    schemaVersion: 'phase11-candidate-v2',
    candidateId: base.candidateId,
    commit: base.git.head,
    treeHash: gitOutput(root, ['rev-parse', 'HEAD^{tree}']),
    branch: base.git.branch,
    dirty: base.git.dirty,
    untrackedFiles: listUntrackedFiles(root),
    createdAt: now.toISOString(),
    fileCount: base.files.length,
    files: base.files,
    scope: base.scope
  }
}

export function verifyPromptIntegrity(root, sourceSet = 'formal') {
  const expected =
    sourceSet === 'historical'
      ? PHASE11_PROMPT_SHA256
      : PHASE11_FORMAL_PROMPT_SHA256
  const sourceRoot = path.join(
    root,
    sourceSet === 'historical'
      ? 'docs/11_phase11/prompt-master/source'
      : 'docs/11_phase11/prompt-master/20260915-formal-closure/source'
  )
  const files = Object.entries(expected).map(([file, expectedSha256]) => {
    const relativePath = path
      .relative(root, path.join(sourceRoot, file))
      .split(path.sep)
      .join('/')
    const target = path.join(sourceRoot, file)
    if (!fs.existsSync(target)) {
      return {
        path: relativePath,
        sha256: '0'.repeat(64),
        expectedSha256,
        status: 'FAIL'
      }
    }
    const sha256 = sha256Bytes(fs.readFileSync(target))
    return {
      path: relativePath,
      sha256,
      expectedSha256,
      status: sha256 === expectedSha256 ? 'PASS' : 'FAIL'
    }
  })
  return {
    sourceSet,
    expectedCount: files.length,
    observedCount: files.filter((file) => file.sha256 !== '0'.repeat(64))
      .length,
    files,
    status: files.every((file) => file.status === 'PASS') ? 'PASS' : 'FAIL'
  }
}

export function readNodeTarget(root) {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(root, 'package.json'), 'utf8')
  )
  const target = packageJson.engines?.node ?? 'unspecified'
  const actual = process.versions.node
  const major = Number(actual.split('.')[0])
  const status = target === '>=22 <23' && major === 22 ? 'PASS' : 'FAIL'
  return { actualNode: actual, targetNode: target, status }
}

export function artifactRecord(root, relativePath, options = {}) {
  const content = fs.readFileSync(path.join(root, relativePath))
  return {
    path: relativePath.split(path.sep).join('/'),
    sha256: sha256Bytes(content),
    size: content.byteLength,
    producer: options.producer ?? 'scripts/phase11-certify.mjs',
    timestamp: options.timestamp ?? new Date().toISOString(),
    candidateCommit:
      options.candidateCommit ?? gitOutput(root, ['rev-parse', 'HEAD']),
    ...(options.gateId ? { gateId: options.gateId } : {})
  }
}

export function requiredGateStatus(gates, id) {
  return gates.find((gate) => gate.id === id)?.status ?? 'MISSING'
}

export function gateSetIntegrity(gates = []) {
  const errors = []
  const seen = new Set()
  for (const gate of gates) {
    if (seen.has(gate.id)) errors.push(`duplicate_gate:${gate.id}`)
    seen.add(gate.id)
    if (gate.status === 'PASS' && gate.exitCode !== 0) {
      errors.push(`pass_gate_nonzero_exit:${gate.id}:${gate.exitCode}`)
    }
    if (gate.status === 'FAIL' && gate.exitCode === 0) {
      errors.push(`fail_gate_zero_exit:${gate.id}`)
    }
  }
  return { valid: errors.length === 0, errors }
}

export function buildEvidenceGraph(
  requirements = [],
  gates = [],
  promptIntegrity = { files: [] },
  options = {}
) {
  const nodes = []
  const edges = []
  const add = (id, kind, attributes = {}) => {
    if (!nodes.some((node) => node.id === id)) {
      nodes.push({ id, kind, ...attributes })
    }
  }
  const link = (from, to, relation) => {
    add(from, 'unknown')
    add(to, 'unknown')
    edges.push({ from, to, relation })
  }
  const candidateNode = `candidate:${options.candidateId ?? 'current'}`
  add(candidateNode, 'candidate')
  for (const file of promptIntegrity.files ?? []) {
    const id = `source:${file.path}`
    add(id, 'prompt', { status: file.status })
    link(id, candidateNode, 'scope_for')
  }
  for (const requirement of requirements) {
    const requirementNode = `requirement:${requirement.id}`
    add(requirementNode, 'requirement', { status: requirement.status })
    link(candidateNode, requirementNode, 'evaluates')
    for (const item of requirement.implementation ?? []) {
      const node = `implementation:${item}`
      add(node, 'implementation')
      link(requirementNode, node, 'implemented_by')
    }
    for (const item of requirement.tests ?? []) {
      const node = `test:${item}`
      add(node, 'test')
      link(requirementNode, node, 'verified_by')
    }
    for (const item of requirement.evidence ?? []) {
      const node = `evidence:${item}`
      add(node, 'evidence')
      link(requirementNode, node, 'evidenced_by')
    }
    for (const item of requirement.gates ?? []) {
      const node = `gate:${item}`
      add(node, 'gate')
      link(requirementNode, node, 'gated_by')
    }
  }
  for (const gate of gates) {
    const gateNode = `gate:${gate.id}`
    add(gateNode, 'gate', { status: gate.status })
    link(gateNode, candidateNode, 'binds_to')
  }
  for (const invariant of options.invariants ?? []) {
    const invariantNode = `invariant:${invariant.id}`
    add(invariantNode, 'invariant', { status: invariant.status })
    link(candidateNode, invariantNode, 'proves')
    for (const evidence of invariant.evidence ?? []) {
      link(`evidence:${evidence}`, invariantNode, 'supports')
    }
  }
  add('decision:phase11', 'decision')
  for (const invariant of options.invariants ?? []) {
    link(`invariant:${invariant.id}`, 'decision:phase11', 'contributes_to')
  }
  for (const gate of gates) {
    link(`gate:${gate.id}`, 'decision:phase11', 'contributes_to')
  }
  return { schemaVersion: 1, nodes, edges }
}

export function verifyEvidenceGraph(graph) {
  const errors = []
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    return { valid: false, errors: ['graph_shape_invalid'] }
  }
  const ids = new Set()
  for (const node of graph.nodes) {
    if (!node || typeof node.id !== 'string' || !node.id) {
      errors.push('node_id_invalid')
    } else if (ids.has(node.id)) {
      errors.push(`duplicate_node:${node.id}`)
    } else {
      ids.add(node.id)
    }
  }
  for (const edge of graph.edges) {
    if (!ids.has(edge.from)) errors.push(`missing_edge_source:${edge.from}`)
    if (!ids.has(edge.to)) errors.push(`missing_edge_target:${edge.to}`)
    if (typeof edge.relation !== 'string' || !edge.relation) {
      errors.push('edge_relation_invalid')
    }
  }
  if (![...ids].some((id) => id.startsWith('candidate:'))) {
    errors.push('required_node_missing:candidate')
  }
  if (!ids.has('decision:phase11')) {
    errors.push('required_node_missing:decision:phase11')
  }
  return { valid: errors.length === 0, errors }
}

function statusValue(value, fallback = 'NOT_VALIDATED') {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    if (typeof value.status === 'string') return value.status
    if (typeof value.verdict === 'string') return value.verdict
    if (typeof value.value === 'string') return value.value
  }
  return fallback
}

export const REQUIRED_EXTERNAL_STATUS = Object.freeze({
  modelProvider: 'VALIDATED_REAL',
  channel: 'VALIDATED_REAL',
  externalIdentity: 'VALIDATED_REAL',
  institutionalRag: 'VALIDATED_APPROVED',
  rpoRto: 'VALIDATED',
  pilot: 'PASS',
  rollback: 'PASS',
  humanSignoff: 'VALIDATED'
})

export function normalizeExternalGates(input = {}, sections = {}) {
  const source = input && typeof input === 'object' ? input : {}
  const integrations = sections.integrations ?? {}
  const normalized = {
    modelProvider: statusValue(source.modelProvider),
    channel: statusValue(source.channel),
    externalIdentity: statusValue(source.externalIdentity),
    institutionalRag: statusValue(source.institutionalRag ?? source.rag),
    rpoRto: statusValue(sections.rpoRto ?? source.rpoRto),
    pilot: statusValue(sections.pilot ?? source.pilot),
    rollback: statusValue(sections.rollback ?? source.rollback),
    humanSignoff: statusValue(sections.humanSignoff ?? source.humanSignoff),
    notes: Array.isArray(source.notes) ? source.notes : []
  }
  for (const key of [
    'modelProvider',
    'channel',
    'externalIdentity',
    'institutionalRag'
  ]) {
    if (normalized[key] === 'VALIDATED') normalized[key] = 'VALIDATED_REAL'
    if (integrations[key] !== undefined) {
      normalized[key] = statusValue(integrations[key], normalized[key])
    }
  }
  return normalized
}

function externalBlockers(externalGates, sections = {}) {
  const normalized = normalizeExternalGates(externalGates, sections)
  return Object.entries(REQUIRED_EXTERNAL_STATUS)
    .filter(([key, required]) => normalized[key] !== required)
    .map(
      ([key, required]) =>
        `external_gate_pending:${key}:expected_${required}:actual_${normalized[key]}`
    )
}

function normalizeCandidate(candidate) {
  const commit = candidate.commit ?? candidate.git?.head ?? ''
  const dirty = candidate.dirty ?? candidate.git?.dirty ?? false
  return {
    ...candidate,
    commit,
    dirty,
    untrackedFiles: candidate.untrackedFiles ?? [],
    treeHash: candidate.treeHash ?? '0'.repeat(64)
  }
}

function normalizeFindings(findings = {}) {
  if (Array.isArray(findings)) {
    return { P0: [], P1: [], P2: findings, external: [] }
  }
  return {
    P0: Array.isArray(findings.P0) ? findings.P0 : [],
    P1: Array.isArray(findings.P1) ? findings.P1 : [],
    P2: Array.isArray(findings.P2) ? findings.P2 : [],
    external: Array.isArray(findings.external) ? findings.external : []
  }
}

function localFindingBlockers(findings) {
  const normalized = normalizeFindings(findings)
  return [...normalized.P0, ...normalized.P1, ...normalized.P2]
    .filter(
      (finding) => finding.blocking !== false && finding.status !== 'CLOSED'
    )
    .map((finding) => `finding_blocking:${finding.id}:${finding.status}`)
}

function criticalInvariantBlockers(invariants = []) {
  return invariants
    .filter(
      (invariant) =>
        invariant.severity === 'critical' && invariant.status !== 'PASS'
    )
    .map(
      (invariant) =>
        `critical_invariant_not_pass:${invariant.id}:${invariant.status}`
    )
}

export function deriveSuccessState({
  candidate,
  gates = [],
  invariants = [],
  findings = {},
  externalGates = {},
  integrations = {},
  rpoRto = {},
  pilot = {},
  humanSignoff = {},
  requestedProfile = 'STAGING',
  evidenceComplete = false,
  implementationComplete = true
}) {
  const normalizedCandidate = normalizeCandidate(candidate)
  const localVerificationComplete = PHASE11_REQUIRED_GATES.every(
    (id) => requiredGateStatus(gates, id) === 'PASS'
  )
  const candidateClean =
    !normalizedCandidate.dirty &&
    normalizedCandidate.untrackedFiles.length === 0
  const criticalInvariantsSatisfied =
    criticalInvariantBlockers(invariants).length === 0
  const localFindingsClear = localFindingBlockers(findings).length === 0
  const normalizedExternal = normalizeExternalGates(externalGates, {
    integrations,
    rpoRto,
    pilot,
    humanSignoff
  })
  const externalValidationComplete =
    normalizedExternal.modelProvider ===
      REQUIRED_EXTERNAL_STATUS.modelProvider &&
    normalizedExternal.channel === REQUIRED_EXTERNAL_STATUS.channel &&
    normalizedExternal.externalIdentity ===
      REQUIRED_EXTERNAL_STATUS.externalIdentity &&
    normalizedExternal.institutionalRag ===
      REQUIRED_EXTERNAL_STATUS.institutionalRag
  const pilotComplete =
    normalizedExternal.pilot === REQUIRED_EXTERNAL_STATUS.pilot
  const productionProofComplete =
    externalValidationComplete &&
    normalizedExternal.rpoRto === REQUIRED_EXTERNAL_STATUS.rpoRto &&
    pilotComplete &&
    normalizedExternal.rollback === REQUIRED_EXTERNAL_STATUS.rollback &&
    normalizedExternal.humanSignoff === REQUIRED_EXTERNAL_STATUS.humanSignoff
  const localEngineeringClosure =
    implementationComplete &&
    localVerificationComplete &&
    candidateClean &&
    evidenceComplete &&
    criticalInvariantsSatisfied &&
    localFindingsClear
  const externalIntegrationClosure = externalValidationComplete
  const supervisedPilotClosure =
    externalIntegrationClosure &&
    pilotComplete &&
    normalizedExternal.humanSignoff === REQUIRED_EXTERNAL_STATUS.humanSignoff
  const productionAssuranceClosure =
    localEngineeringClosure && productionProofComplete
  const eligibleForRequestedProfile =
    requestedProfile === 'PRODUCTION'
      ? productionAssuranceClosure
      : requestedProfile === 'SUPERVISED_PILOT'
        ? localEngineeringClosure && externalIntegrationClosure
        : localEngineeringClosure
  return {
    localEngineeringClosure,
    externalIntegrationClosure,
    supervisedPilotClosure,
    productionAssuranceClosure,
    implementationComplete,
    localVerificationComplete,
    evidenceComplete,
    criticalInvariantsSatisfied,
    externalValidationComplete,
    pilotComplete,
    productionProofComplete,
    eligibleForRequestedProfile
  }
}

export function computeCertificationDecision({
  candidate,
  gates = [],
  invariants = [],
  findings = {},
  externalGates = {},
  integrations = {},
  rpoRto = {},
  pilot = {},
  humanSignoff = {},
  deploymentProfile = 'CONTROLLED_LOCAL',
  requestedProfile = 'STAGING',
  evidenceComplete = false,
  implementationComplete = true
}) {
  const normalizedCandidate = normalizeCandidate(candidate)
  const blockers = []
  for (const id of PHASE11_REQUIRED_GATES) {
    const status = requiredGateStatus(gates, id)
    if (status !== 'PASS') {
      blockers.push(`required_gate_not_pass:${id}:${status}`)
    }
  }
  blockers.push(...gateSetIntegrity(gates).errors)
  if (
    normalizedCandidate.dirty ||
    normalizedCandidate.untrackedFiles.length > 0
  ) {
    blockers.push('candidate_worktree_dirty')
  }
  blockers.push(...criticalInvariantBlockers(invariants))
  blockers.push(...localFindingBlockers(findings))
  if (!implementationComplete) blockers.push('implementation_incomplete')
  const externalPending = externalBlockers(externalGates, {
    integrations,
    rpoRto,
    pilot,
    humanSignoff
  })
  const successState = deriveSuccessState({
    candidate: normalizedCandidate,
    gates,
    invariants,
    findings,
    externalGates,
    integrations,
    rpoRto,
    pilot,
    humanSignoff,
    requestedProfile,
    evidenceComplete,
    implementationComplete
  })
  const localHardFailure =
    blockers.length > 0 || !successState.localEngineeringClosure
  if (localHardFailure) {
    return {
      decision: 'NO_GO',
      certification: 'NO_GO',
      eligibleProfile: 'CONTROLLED_LOCAL',
      blockers: [...new Set(blockers)],
      successState,
      externalBlockers: externalPending
    }
  }
  if (deploymentProfile === 'PRODUCTION' || requestedProfile === 'PRODUCTION') {
    if (!successState.productionAssuranceClosure) {
      return {
        decision: 'NO_GO',
        certification: 'NO_GO',
        eligibleProfile: 'STAGING',
        blockers: [...new Set(externalPending)],
        successState,
        externalBlockers: externalPending
      }
    }
    return {
      decision: 'GO',
      certification: 'STATE_OF_ART_TRIPLE_AAA',
      eligibleProfile: 'PRODUCTION',
      blockers: [],
      successState,
      externalBlockers: []
    }
  }
  return {
    decision: externalPending.length === 0 ? 'GO' : 'CONDITIONAL_GO',
    certification: 'AAA_CANDIDATE',
    eligibleProfile: successState.externalIntegrationClosure
      ? 'SUPERVISED_PILOT'
      : 'STAGING',
    blockers: externalPending,
    successState,
    externalBlockers: externalPending
  }
}

/** Backwards-compatible adapter used by the previous Phase 11 unit tests. */
export function evaluatePhase11(input) {
  const promptIntegrity = input.promptIntegrity ?? { status: 'FAIL' }
  const gates = [...(input.gates ?? [])]
  if (
    promptIntegrity.status !== 'PASS' &&
    !gates.some((gate) => gate.id === 'prompt_integrity')
  ) {
    gates.push({
      id: 'prompt_integrity',
      status: promptIntegrity.status,
      command: 'legacy',
      exitCode: 1,
      durationMs: 0
    })
  }
  return computeCertificationDecision({
    candidate: input.candidate,
    gates,
    invariants: [],
    findings: {},
    externalGates: input.externalGates,
    deploymentProfile: 'CONTROLLED_LOCAL',
    requestedProfile: 'STAGING',
    evidenceComplete: true,
    implementationComplete: (input.requirements ?? []).every(
      (item) => item.status === 'IMPLEMENTED'
    )
  })
}

export function computeScores({
  gates = [],
  invariants = [],
  findings = {},
  successState
}) {
  const gatePass = gates.filter((gate) => gate.status === 'PASS').length
  const gateTotal = Math.max(gates.length, 1)
  const invariantPass = invariants.filter(
    (item) => item.status === 'PASS'
  ).length
  const invariantTotal = Math.max(invariants.length, 1)
  const normalized = normalizeFindings(findings)
  const blocking = [
    ...normalized.P0,
    ...normalized.P1,
    ...normalized.P2
  ].filter((item) => item.blocking !== false && item.status !== 'CLOSED').length
  const boundedScore = (passed, total) =>
    Math.min(99, Math.round((passed / total) * 100))
  const localScore = boundedScore(
    gatePass + invariantPass,
    gateTotal + invariantTotal
  )
  const securityScore = boundedScore(
    gates.filter(
      (gate) =>
        ['security', 'bypass_audit', 'certification_self_test'].includes(
          gate.id
        ) && gate.status === 'PASS'
    ).length,
    3
  )
  return {
    localEngineering: {
      value: localScore,
      rationale: `${gatePass}/${gateTotal} mandatory gates and ${invariantPass}/${invariantTotal} invariants passed; score capped below automatic 100.`,
      evidence: [
        'certification/phase11/gates.json',
        'certification/phase11/invariants.json'
      ]
    },
    auditability: {
      value: successState?.evidenceComplete ? 99 : Math.max(0, localScore - 20),
      rationale: successState?.evidenceComplete
        ? 'All declared evidence artifacts are hash-bound.'
        : 'Required evidence is incomplete or not yet sealed.',
      evidence: [
        'certification/phase11/manifest.json',
        'certification/phase11/evidence-graph.json'
      ]
    },
    securityGovernance: {
      value: Math.max(0, securityScore - blocking * 10),
      rationale: `${blocking} blocking local finding(s) remain; security score is derived from security, bypass and negative-validation gates.`,
      evidence: ['certification/phase11/negative-validation.json']
    },
    productionReadiness: {
      value: successState?.productionProofComplete ? 99 : 0,
      rationale: successState?.productionProofComplete
        ? 'All real-stack production proofs are current.'
        : 'Real provider, channel, identity, RPO/RTO, pilot and human proof are not complete.',
      evidence: [
        'certification/phase11/integration-report.json',
        'certification/phase11/recovery-report.json'
      ]
    }
  }
}

export function computePromotionDecision({
  result,
  requestedProfile = 'PRODUCTION'
}) {
  const normalizedExternal = normalizeExternalGates(result.externalGates, {
    integrations: result.integrations,
    rpoRto: result.rpoRto,
    pilot: result.pilot,
    humanSignoff: result.humanSignoff
  })
  const externalBlockers = Object.entries(REQUIRED_EXTERNAL_STATUS)
    .filter(([key, required]) => normalizedExternal[key] !== required)
    .map(
      ([key, required]) =>
        `external_gate_pending:${key}:expected_${required}:actual_${normalizedExternal[key]}`
    )
  const blockingGates = result.gates
    .filter(
      (gate) =>
        PHASE11_REQUIRED_GATES.includes(gate.id) && gate.status !== 'PASS'
    )
    .map((gate) => `${gate.id}:${gate.status}`)
  const blockingFindings = localFindingBlockers(result.findings)
  const criticalInvariants = criticalInvariantBlockers(result.invariants)
  const candidateBlockers =
    result.candidate.dirty || result.candidate.untrackedFiles.length > 0
      ? ['candidate_not_clean']
      : []
  const blocking = [
    ...blockingGates,
    ...blockingFindings,
    ...criticalInvariants,
    ...candidateBlockers
  ]
  const production = requestedProfile === 'PRODUCTION'
  const eligible =
    blocking.length === 0 &&
    (production
      ? result.successState.productionAssuranceClosure &&
        result.certification === 'STATE_OF_ART_TRIPLE_AAA'
      : result.successState.localEngineeringClosure)
  return {
    eligible,
    currentProfile: result.deploymentProfile,
    requestedProfile,
    blockingGates,
    blockingFindings,
    blockingInvariants: criticalInvariants,
    externalBlockers: production ? externalBlockers : [],
    reason: eligible
      ? 'promotion_eligible'
      : production
        ? 'production_assurance_incomplete'
        : 'local_engineering_closure_incomplete'
  }
}

export function candidateDrift(root, candidate) {
  return diffCandidateFiles(candidate.files, collectCandidateFiles(root))
}
