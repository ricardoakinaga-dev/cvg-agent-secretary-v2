#!/usr/bin/env node
/**
 * Verifies the current Phase 11 package from live repository state.
 *
 * Result fields are never trusted as authority: candidate bytes, pointer
 * topology, artifact hashes, gate integrity, evidence graph and the shared
 * calculus are all recomputed before a conditional or production decision is
 * reported.
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  PHASE11_2_REQUIRED_GATES,
  Phase11CurrentResultSchema,
  Phase11ManifestSchema,
  artifactRecord,
  buildPhase11Candidate,
  candidateDrift,
  computeCertificationDecision,
  computeScores,
  gateSetIntegrity,
  requiredGateStatus,
  verifyEvidenceGraph,
  verifyPromptIntegrity
} from './lib/phase11-rules.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const evidenceOnly = process.argv.includes('--evidence-only')
const resultRelative = 'certification/phase11/phase11-result.json'
const manifestRelative = 'certification/phase11/manifest.json'
const pointerRelative = 'certification/current.json'
const graphRelative = 'certification/phase11/evidence-graph.json'
const releaseRelative = 'certification/phase11/release-manifest.json'
const requiredPackageFiles = [
  'certification/phase11/gates.json',
  'certification/phase11/invariants.json',
  graphRelative,
  manifestRelative,
  releaseRelative,
  'certification/phase11/findings.json',
  resultRelative,
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
const failures = []
function fail(code, detail = '') {
  failures.push(detail ? `${code}:${detail}` : code)
}
function absolute(relativePath) {
  return path.join(root, relativePath)
}
function exists(relativePath) {
  return fs.existsSync(absolute(relativePath))
}
function readJson(relativePath) {
  try {
    return JSON.parse(fs.readFileSync(absolute(relativePath), 'utf8'))
  } catch {
    return null
  }
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])])
    )
  }
  return value
}
function same(left, right) {
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right))
}
function parseWith(schema, value, code) {
  const parsed = schema.safeParse(value)
  if (!parsed.success) {
    fail(
      code,
      parsed.error.issues.map((issue) => issue.path.join('.')).join(',')
    )
    return null
  }
  return parsed.data
}
function fileListMatches(recorded, current) {
  if (!Array.isArray(recorded) || recorded.length !== current.length)
    return false
  const currentByPath = new Map(current.map((file) => [file.path, file]))
  return recorded.every((file) => same(file, currentByPath.get(file.path)))
}

function gitStatus(args) {
  return spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8'
  })
}

function isAncestor(ancestor, descendant) {
  if (!/^[0-9a-f]{7,64}$/.test(ancestor)) return false
  return (
    gitStatus(['merge-base', '--is-ancestor', ancestor, descendant]).status ===
    0
  )
}

function gitTreeForCommit(commit) {
  const result = gitStatus(['rev-parse', `${commit}^{tree}`])
  return result.status === 0 ? result.stdout.trim() : null
}

const pointer = readJson(pointerRelative)
const resultRaw = readJson(resultRelative)
const manifestRaw = readJson(manifestRelative)
let result = null
let manifest = null

if (!pointer) fail('current_pointer_missing')
if (!resultRaw) fail('canonical_result_missing_or_invalid')
if (!manifestRaw) fail('canonical_manifest_missing_or_invalid')

if (pointer) {
  if (pointer.phase !== '11') fail('current_pointer_not_phase11')
  if (pointer.authority !== 'certification/phase11') {
    fail('current_pointer_authority_invalid', pointer.authority ?? 'missing')
  }
  if (pointer.result !== resultRelative) fail('current_pointer_result_invalid')
  if (pointer.manifest !== manifestRelative)
    fail('current_pointer_manifest_invalid')
  if (pointer.historicalPhase10?.doesNotQualifyCurrent !== true) {
    fail('historical_phase10_boundary_missing')
  }
}
if (resultRaw)
  result = parseWith(
    Phase11CurrentResultSchema,
    resultRaw,
    'result_schema_invalid'
  )
if (manifestRaw) {
  const parsed = parseWith(
    Phase11ManifestSchema,
    manifestRaw,
    'manifest_schema_invalid'
  )
  if (parsed?.schemaVersion !== 2) fail('canonical_manifest_is_not_v2')
  manifest = parsed?.schemaVersion === 2 ? parsed : null
}

const liveCandidate = buildPhase11Candidate(root)
if (result && manifest && pointer) {
  if (result.phase !== '11') fail('result_not_phase11')
  const anchorCommit = result.commit
  if (!isAncestor(anchorCommit, liveCandidate.commit)) {
    fail(
      'candidate_anchor_not_ancestor',
      `${anchorCommit}:${liveCandidate.commit}`
    )
  }
  if (result.candidate.commit !== anchorCommit) {
    fail('result_candidate_commit_stale')
  }
  if (result.candidate.treeHash !== liveCandidate.treeHash) {
    fail(
      'candidate_tree_stale',
      `${result.candidate.treeHash}:${liveCandidate.treeHash}`
    )
  }
  if (result.candidate.branch !== liveCandidate.branch)
    fail('candidate_branch_stale')
  if (result.candidate.dirty !== liveCandidate.dirty)
    fail('candidate_dirty_state_changed')
  if (!same(result.candidate.untrackedFiles, liveCandidate.untrackedFiles)) {
    fail('candidate_untracked_state_changed')
  }
  if (result.candidate.candidateId !== liveCandidate.candidateId) {
    fail('candidate_id_stale')
  }
  if (result.candidate.fileCount !== liveCandidate.fileCount) {
    fail('candidate_file_count_changed')
  }
  if (!fileListMatches(result.candidate.files, liveCandidate.files)) {
    fail('candidate_file_hash_changed')
  }
  const anchorTreeHash = gitTreeForCommit(anchorCommit)
  if (
    result.candidate.gitTreeHash &&
    result.candidate.gitTreeHash !== anchorTreeHash
  ) {
    fail('candidate_git_tree_stale')
  }
  const drift = candidateDrift(root, result.candidate)
  if (drift.length > 0)
    fail('candidate_scope_drift', JSON.stringify(drift.slice(0, 5)))

  for (const [key, expected] of [
    ['candidateId', liveCandidate.candidateId],
    ['commit', anchorCommit],
    ['treeHash', liveCandidate.treeHash],
    ['branch', liveCandidate.branch]
  ]) {
    if (pointer[key] !== expected) fail(`pointer_${key}_mismatch`)
  }
  if (pointer.certificationId !== result.certificationId)
    fail('pointer_certification_mismatch')
  if (manifest.certificationId !== result.certificationId)
    fail('manifest_certification_mismatch')
  if (manifest.candidateId !== liveCandidate.candidateId)
    fail('manifest_candidate_mismatch')
  if (manifest.candidateCommit !== anchorCommit) fail('manifest_commit_stale')
  if (manifest.treeHash !== liveCandidate.treeHash) fail('manifest_tree_stale')
}

const promptIntegrity = verifyPromptIntegrity(root, 'phase11_2')
if (
  requiredGateStatus(result?.gates ?? [], 'prompt_integrity') !==
  promptIntegrity.status
) {
  fail('prompt_integrity_gate_mismatch')
}
if (promptIntegrity.status !== 'PASS') fail('phase11_2_prompt_integrity_failed')

if (result) {
  const gateIds = new Set(result.gates.map((gate) => gate.id))
  for (const id of PHASE11_2_REQUIRED_GATES) {
    if (!gateIds.has(id)) fail('required_gate_missing', id)
  }
  for (const gate of result.gates) {
    if (!PHASE11_2_REQUIRED_GATES.includes(gate.id))
      fail('unknown_gate', gate.id)
  }
  const integrity = gateSetIntegrity(result.gates)
  if (!integrity.valid) fail('gate_set_invalid', integrity.errors.join(','))
}

const artifactFailures = []
function verifyArtifact(artifact, label) {
  if (!artifact || !artifact.path) {
    artifactFailures.push(`${label}:shape`)
    return
  }
  if (!exists(artifact.path)) {
    artifactFailures.push(`${label}:missing:${artifact.path}`)
    return
  }
  const current = artifactRecord(root, artifact.path)
  if (current.sha256 !== artifact.sha256 || current.size !== artifact.size) {
    artifactFailures.push(`${label}:changed:${artifact.path}`)
  }
  if (artifact.candidateCommit !== result?.commit) {
    artifactFailures.push(`${label}:candidate_commit:${artifact.path}`)
  }
  if (artifact.path === manifestRelative)
    artifactFailures.push(`${label}:self_reference`)
}

if (manifest) {
  verifyArtifact(manifest.result, 'result')
  if (manifest.result.path !== resultRelative)
    artifactFailures.push('result:path_invalid')
  const artifactPaths = new Set()
  for (const artifact of manifest.artifacts) {
    if (artifactPaths.has(artifact.path))
      artifactFailures.push(`duplicate_artifact:${artifact.path}`)
    artifactPaths.add(artifact.path)
    verifyArtifact(artifact, 'artifact')
  }
  if (artifactPaths.has(resultRelative))
    artifactFailures.push('result_duplicated_in_artifacts')
  if (!artifactPaths.has(graphRelative))
    artifactFailures.push('evidence_graph_not_manifested')
  if (!artifactPaths.has(releaseRelative))
    artifactFailures.push('release_manifest_not_manifested')
  for (const gate of result?.gates ?? []) {
    if (!gate.log) continue
    if (!artifactPaths.has(gate.log))
      artifactFailures.push(`gate_log_not_manifested:${gate.id}`)
  }
  const resultArtifact = artifactRecord(root, resultRelative)
  const manifestArtifact = artifactRecord(root, manifestRelative)
  if (
    manifest.result.sha256 !== resultArtifact.sha256 ||
    manifest.result.size !== resultArtifact.size
  ) {
    artifactFailures.push('result_hash_mismatch')
  }
  if (pointer) {
    if (pointer.resultSha256 !== resultArtifact.sha256)
      artifactFailures.push('pointer_result_hash_mismatch')
    if (pointer.manifestSha256 !== manifestArtifact.sha256)
      artifactFailures.push('pointer_manifest_hash_mismatch')
  }
}
for (const packageFile of requiredPackageFiles) {
  if (!exists(packageFile))
    artifactFailures.push(`required_package_missing:${packageFile}`)
  else if (
    gitStatus(['ls-files', '--error-unmatch', '--', packageFile]).status !== 0
  )
    artifactFailures.push(`required_package_not_tracked:${packageFile}`)
}
for (const artifactFailure of artifactFailures)
  fail('artifact_invalid', artifactFailure)

const graph = readJson(graphRelative)
if (!graph) fail('evidence_graph_missing')
else {
  const graphCheck = verifyEvidenceGraph(graph)
  if (!graphCheck.valid)
    fail('evidence_graph_invalid', graphCheck.errors.join(','))
  if (
    !graph.nodes.some(
      (node) => node.id === `candidate:${liveCandidate.candidateId}`
    )
  ) {
    fail('evidence_graph_candidate_mismatch')
  }
  const implementationNodes = graph.nodes.filter(
    (node) => node.kind === 'implementation'
  )
  if (
    implementationNodes.some(
      (node) => !exists(node.id.replace(/^implementation:/, ''))
    )
  ) {
    fail('implementation_path_missing')
  }
}

const gatesFile = readJson('certification/phase11/gates.json')
if (gatesFile && result && !same(gatesFile.gates, result.gates))
  fail('gates_artifact_mismatch')
const invariantsFile = readJson('certification/phase11/invariants.json')
if (
  invariantsFile &&
  result &&
  !same(invariantsFile.invariants, result.invariants)
) {
  fail('invariants_artifact_mismatch')
}
const findingsFile = readJson('certification/phase11/findings.json')
if (findingsFile && result && !same(findingsFile.findings, result.findings)) {
  fail('findings_artifact_mismatch')
}
const release = readJson(releaseRelative)
if (release && result) {
  if (release.candidate?.candidateId !== liveCandidate.candidateId)
    fail('release_candidate_mismatch')
  if (release.candidate?.commit !== result.commit)
    fail('release_commit_mismatch')
  if (release.candidate?.treeHash !== liveCandidate.treeHash)
    fail('release_tree_mismatch')
  if (release.noProductionDeployment !== true)
    fail('production_boundary_missing')
}

if (result) {
  const implementationComplete =
    graph?.nodes
      ?.filter((node) => node.kind === 'implementation')
      .every((node) => exists(node.id.replace(/^implementation:/, ''))) ?? false
  const evidenceComplete =
    artifactFailures.length === 0 &&
    requiredPackageFiles.every(exists) &&
    exists(pointerRelative) &&
    promptIntegrity.status === 'PASS'
  const recalculated = computeCertificationDecision({
    candidate: liveCandidate,
    gates: result.gates,
    invariants: result.invariants,
    findings: result.findings,
    externalGates: result.externalGates,
    integrations: result.integrations,
    rpoRto: result.rpoRto,
    pilot: result.pilot,
    humanSignoff: result.humanSignoff,
    deploymentProfile: result.deploymentProfile,
    requestedProfile: result.requestedProfile,
    evidenceComplete,
    implementationComplete,
    requiredGates: PHASE11_2_REQUIRED_GATES
  })
  if (result.decision !== recalculated.decision)
    fail('decision_recalculation_mismatch')
  if (result.certification !== recalculated.certification)
    fail('certification_recalculation_mismatch')
  if (result.eligibleProfile !== recalculated.eligibleProfile)
    fail('eligible_profile_recalculation_mismatch')
  if (!same(result.successState, recalculated.successState))
    fail('success_state_recalculation_mismatch')
  if (!same(result.remainingBlockers, recalculated.blockers))
    fail('remaining_blockers_recalculation_mismatch')
  const scores = computeScores({
    gates: result.gates,
    invariants: result.invariants,
    findings: result.findings,
    successState: recalculated.successState
  })
  if (!same(result.scores, scores)) fail('scores_recalculation_mismatch')
}

const status = failures.length === 0 ? 'PASS' : 'FAIL'
process.stdout.write(
  `${JSON.stringify(
    {
      schemaVersion: 1,
      kind: 'phase11-verification',
      mode: evidenceOnly ? 'evidence-only' : 'current',
      status,
      currentPointer: pointerRelative,
      result: resultRelative,
      manifest: manifestRelative,
      failures
    },
    null,
    2
  )}\n`
)
process.exitCode = status === 'PASS' ? 0 : 1
