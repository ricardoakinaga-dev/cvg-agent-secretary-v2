#!/usr/bin/env node
/** Verify current Phase 11 result, candidate binding, prompt hashes and raw logs. */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  Phase11ManifestSchema,
  Phase11ResultSchema,
  artifactRecord,
  buildPhase11Candidate,
  evaluatePhase11,
  readNodeTarget,
  verifyPromptIntegrity
} from './lib/phase11-rules.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const failures = []
const resultPath = path.join(root, 'certification/phase11-result.json')
const manifestPath = path.join(root, 'certification/phase11-manifest.json')

function fail(message) {
  failures.push(message)
  process.stderr.write(`[phase11-verify] FAIL ${message}\n`)
}

if (!fs.existsSync(resultPath)) fail('result_missing')
if (!fs.existsSync(manifestPath)) fail('manifest_missing')
if (failures.length === 0) {
  const result = Phase11ResultSchema.parse(
    JSON.parse(fs.readFileSync(resultPath, 'utf8'))
  )
  const manifest = Phase11ManifestSchema.parse(
    JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  )
  const candidate = buildPhase11Candidate(root)
  if (result.commit !== candidate.git.head) {
    fail(`commit_drift:${result.commit}:${candidate.git.head}`)
  }
  if (result.candidate.head !== candidate.git.head) {
    fail(
      `candidate_commit_drift:${result.candidate.head}:${candidate.git.head}`
    )
  }
  if (manifest.commit !== candidate.git.head) {
    fail(`manifest_commit_drift:${manifest.commit}:${candidate.git.head}`)
  }
  if (result.candidate.dirty !== candidate.git.dirty) {
    fail(
      `candidate_dirty_state_changed:${result.candidate.dirty}:${candidate.git.dirty}`
    )
  }
  if (result.candidate.candidateId !== candidate.candidateId) {
    fail('candidate_drift')
  }
  if (manifest.candidateId !== result.candidate.candidateId) {
    fail('manifest_candidate_mismatch')
  }
  const promptIntegrity = verifyPromptIntegrity(root)
  if (
    JSON.stringify(promptIntegrity) !== JSON.stringify(result.promptIntegrity)
  ) {
    fail('prompt_integrity_changed')
  }
  const engine = readNodeTarget(root)
  const decision = evaluatePhase11({
    candidate: {
      ...candidate
    },
    gates: result.gates,
    promptIntegrity,
    engine,
    externalGates: result.externalGates,
    requirements: result.requirements
  })
  if (
    decision.decision !== result.decision ||
    decision.certification !== result.certification ||
    JSON.stringify(decision.blockers) !== JSON.stringify(result.blockers)
  ) {
    fail('decision_recalculation_mismatch')
  }
  for (const artifact of manifest.artifacts) {
    const absolute = path.join(root, artifact.path)
    if (!fs.existsSync(absolute)) {
      fail(`artifact_missing:${artifact.path}`)
      continue
    }
    const current = artifactRecord(root, artifact.path)
    if (current.sha256 !== artifact.sha256 || current.size !== artifact.size) {
      fail(`artifact_changed:${artifact.path}`)
    }
  }
  const resultArtifact = artifactRecord(
    root,
    'certification/phase11-result.json'
  )
  if (
    resultArtifact.sha256 !== manifest.result.sha256 ||
    resultArtifact.size !== manifest.result.size
  ) {
    fail('result_hash_mismatch')
  }
}

if (failures.length > 0) {
  process.exitCode = 1
} else {
  process.stderr.write('[phase11-verify] PASS current candidate and evidence\n')
}
