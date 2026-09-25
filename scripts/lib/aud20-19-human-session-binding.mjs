import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'

export const SESSION_SPEC_SHA256 =
  'decb8d441c2a17678026c6305fb71a9c31a2069d6836ad010362f9c3b9179688'

const DIGEST = /^[a-f0-9]{64}$/
const SESSION_ID = /^[a-f0-9]{32}$/
const STEP_IDS = new Set([
  'H01',
  'H02',
  'H03',
  'H04',
  'H05',
  'H06',
  'H07',
  'H08',
  'H09'
])
const SENSITIVE_KEY =
  /(?:name|email|phone|contact|speech|transcript|cookie|token|patient|owner|screenshot|video|audio|payload|body|header|url|host|path|note)/i

export function sha256Bytes(value) {
  return createHash('sha256').update(value).digest('hex')
}

export function sha256File(filePath) {
  return sha256Bytes(fs.readFileSync(filePath))
}

export function isDigest(value) {
  return typeof value === 'string' && DIGEST.test(value)
}

export function isSessionId(value) {
  return typeof value === 'string' && SESSION_ID.test(value)
}

export function readJsonStrict(filePath) {
  const bytes = fs.readFileSync(filePath)
  return {
    value: JSON.parse(bytes.toString('utf8')),
    sha256: sha256Bytes(bytes)
  }
}

function exactKeys(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const actual = Object.keys(value).sort()
  return (
    actual.length === keys.length &&
    actual.every((key, i) => key === [...keys].sort()[i])
  )
}

function validTimestamp(value) {
  return (
    typeof value === 'string' &&
    Number.isFinite(Date.parse(value)) &&
    value.endsWith('Z')
  )
}

function validSteps(value) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    new Set(value).size === value.length &&
    value.every((step) => STEP_IDS.has(step))
  )
}

export function validateSessionAuthorization(value) {
  const failures = []
  const keys = [
    'schemaVersion',
    'decision',
    'specSha256',
    'candidateId',
    'candidateTreeHash',
    'allowedSteps',
    'facilitatorRole',
    'validFrom',
    'validUntil',
    'capture'
  ]
  if (!exactKeys(value, keys)) failures.push('authorization_shape_invalid')
  if (value?.schemaVersion !== 1 || value?.decision !== 'APPROVED') {
    failures.push('authorization_decision_invalid')
  }
  if (value?.specSha256 !== SESSION_SPEC_SHA256)
    failures.push('spec_hash_mismatch')
  if (!isDigest(value?.candidateId)) failures.push('candidate_id_invalid')
  if (!isDigest(value?.candidateTreeHash))
    failures.push('candidate_tree_hash_invalid')
  if (!validSteps(value?.allowedSteps)) failures.push('allowed_steps_invalid')
  if (value?.facilitatorRole !== 'AUTHORIZED_FACILITATOR') {
    failures.push('facilitator_role_invalid')
  }
  if (!validTimestamp(value?.validFrom) || !validTimestamp(value?.validUntil)) {
    failures.push('authorization_validity_invalid')
  } else if (Date.parse(value.validUntil) <= Date.parse(value.validFrom)) {
    failures.push('authorization_validity_order_invalid')
  }
  if (
    !exactKeys(value?.capture, ['screenshots', 'audio', 'video']) ||
    value.capture.screenshots !== false ||
    value.capture.audio !== false ||
    value.capture.video !== false
  ) {
    failures.push('capture_must_be_disabled')
  }
  return failures
}

export function validateSessionApproval(value) {
  const failures = []
  const keys = [
    'schemaVersion',
    'decision',
    'authorizationSha256',
    'specSha256',
    'candidateId',
    'candidateTreeHash',
    'allowedSteps',
    'facilitatorRole',
    'validFrom',
    'validUntil',
    'screenshots',
    'audio',
    'video',
    'externalFacilitatorCheck'
  ]
  if (!exactKeys(value, keys)) failures.push('approval_shape_invalid')
  if (value?.schemaVersion !== 1 || value?.decision !== 'APPROVED_SESSION') {
    failures.push('approval_decision_invalid')
  }
  if (!isDigest(value?.authorizationSha256))
    failures.push('authorization_hash_invalid')
  if (value?.specSha256 !== SESSION_SPEC_SHA256)
    failures.push('spec_hash_mismatch')
  if (!isDigest(value?.candidateId)) failures.push('candidate_id_invalid')
  if (!isDigest(value?.candidateTreeHash))
    failures.push('candidate_tree_hash_invalid')
  if (!validSteps(value?.allowedSteps)) failures.push('allowed_steps_invalid')
  if (value?.facilitatorRole !== 'AUTHORIZED_FACILITATOR') {
    failures.push('facilitator_role_invalid')
  }
  if (!validTimestamp(value?.validFrom) || !validTimestamp(value?.validUntil)) {
    failures.push('approval_validity_invalid')
  } else if (Date.parse(value.validUntil) <= Date.parse(value.validFrom)) {
    failures.push('approval_validity_order_invalid')
  }
  if (
    value?.screenshots !== false ||
    value?.audio !== false ||
    value?.video !== false
  ) {
    failures.push('capture_must_be_disabled')
  }
  if (value?.externalFacilitatorCheck !== 'CONFIRMED') {
    failures.push('external_facilitator_check_required')
  }
  return failures
}

export function validateSessionSupplement(value) {
  const failures = []
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return ['supplement_shape_invalid']
  }
  const keys = [
    'schemaVersion',
    'sessionId',
    'specSha256',
    'candidateId',
    'candidateTreeHash',
    'human_a11y',
    'releaseEligible',
    'steps'
  ]
  if (!exactKeys(value, keys)) failures.push('supplement_shape_invalid')
  if (value.schemaVersion !== 1) failures.push('schema_version_invalid')
  if (!isSessionId(value.sessionId)) failures.push('session_id_invalid')
  if (value.specSha256 !== SESSION_SPEC_SHA256)
    failures.push('spec_hash_mismatch')
  if (!isDigest(value.candidateId)) failures.push('candidate_id_invalid')
  if (!isDigest(value.candidateTreeHash))
    failures.push('candidate_tree_hash_invalid')
  if (value.human_a11y !== 'PENDING' || value.releaseEligible !== false) {
    failures.push('human_gate_must_remain_pending')
  }
  if (!Array.isArray(value.steps)) failures.push('steps_invalid')
  else if (value.steps.some((step) => !isSafeStepRecord(step)))
    failures.push('step_record_invalid')
  return failures
}

export function isSafeStepRecord(step) {
  if (!step || typeof step !== 'object' || Array.isArray(step)) return false
  const keys = [
    'stepId',
    'candidateId',
    'candidateTreeHash',
    'fixtureRole',
    'anchor',
    'initialState',
    'finalState',
    'browser',
    'version',
    'viewport',
    'zoom',
    'startedAt',
    'finishedAt',
    'status',
    'captureId'
  ]
  if (!exactKeys(step, keys)) return false
  if (!STEP_IDS.has(step.stepId)) return false
  if (!isDigest(step.candidateId) || !isDigest(step.candidateTreeHash))
    return false
  if (!['supervisor', 'approver', 'admin'].includes(step.fixtureRole))
    return false
  if (
    ![step.anchor, step.initialState, step.finalState].every(
      (v) => typeof v === 'string' && v.length > 0 && v.length <= 120
    )
  )
    return false
  if (step.browser !== 'chromium' || typeof step.version !== 'string')
    return false
  if (!exactKeys(step.viewport, ['width', 'height'])) return false
  if (
    !Number.isInteger(step.viewport.width) ||
    !Number.isInteger(step.viewport.height)
  )
    return false
  if (
    step.zoom !== 1 ||
    !validTimestamp(step.startedAt) ||
    !validTimestamp(step.finishedAt)
  )
    return false
  if (
    !['PASS', 'FAIL', 'BLOCKED'].includes(step.status) ||
    step.captureId !== 'none'
  )
    return false
  return Object.values(step).every((value) => !containsSensitiveValue(value))
}

export function containsSensitiveValue(value) {
  if (Array.isArray(value)) return value.some(containsSensitiveValue)
  if (value && typeof value === 'object') {
    return Object.entries(value).some(
      ([key, child]) => SENSITIVE_KEY.test(key) || containsSensitiveValue(child)
    )
  }
  if (typeof value === 'string') {
    return /(?:@|\b\+?\d[\d ()-]{7,}\b|https?:\/\/|cookie|bearer\s|patient|prontu[aá]rio)/i.test(
      value
    )
  }
  return false
}

export function compareCandidateBinding(candidate, expected) {
  const failures = []
  if (!candidate || typeof candidate !== 'object') return ['candidate_missing']
  if (candidate.dirty !== false) failures.push('candidate_dirty')
  if (
    !Array.isArray(candidate.untrackedFiles) ||
    candidate.untrackedFiles.length > 0
  ) {
    failures.push('candidate_untracked_files')
  }
  if (candidate.candidateId !== expected?.candidateId)
    failures.push('candidate_id_mismatch')
  if (candidate.treeHash !== expected?.candidateTreeHash)
    failures.push('candidate_tree_hash_mismatch')
  return failures
}

export function validateRegisteredApproval(approvalSha256, runtimeDocsText) {
  if (!isDigest(approvalSha256)) return false
  return (
    typeof runtimeDocsText === 'string' &&
    runtimeDocsText.includes(approvalSha256)
  )
}

export function createSessionSupplement({
  sessionId,
  candidateId,
  candidateTreeHash,
  steps = []
}) {
  const supplement = {
    schemaVersion: 1,
    sessionId,
    specSha256: SESSION_SPEC_SHA256,
    candidateId,
    candidateTreeHash,
    human_a11y: 'PENDING',
    releaseEligible: false,
    steps
  }
  const failures = validateSessionSupplement(supplement)
  if (failures.length > 0)
    throw new Error(`invalid_session_supplement:${failures.join(',')}`)
  return supplement
}

export function resolveRepoPath(root, relativePath) {
  const absolute = path.resolve(root, relativePath)
  const relative = path.relative(path.resolve(root), absolute)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('path_outside_repository')
  }
  return absolute
}
