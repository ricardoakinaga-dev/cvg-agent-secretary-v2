import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { z } from 'zod'
import { collectCandidateFiles, sha256Bytes } from './certification-rules.mjs'

/**
 * AUD19-08 behavioral independent-critic verification.
 *
 * The previous `independent_critic` gate only searched the Markdown report for
 * magic substrings ("fresh critic: true", "mutation sentinel: PASS", ...).
 * These functions replace that with executable checks over a machine-readable
 * critic report: schema, candidate/commit binding, worktree fingerprint
 * stability, declared independence criteria, absence of builder-authored
 * justification/conclusion reuse, and on-disk digests of every cited artifact.
 */

const Digest = z.string().regex(/^[0-9a-f]{64}$/)
const Commit = z.string().regex(/^[0-9a-f]{7,64}$/)
const TreeDigest = z.string().regex(/^[0-9a-f]{40,64}$/)

export const CRITIC_IDENTITY_CRITERIA = Object.freeze([
  'fresh-context',
  'separate-identity',
  'artifact-only-input',
  'no-worktree-write',
  'no-builder-justification'
])

export const CRITIC_REPORT_PATH =
  'docs/04_audit/evidence/AUD19/AUD19-08-critic-report.json'

export const CriticReportSchema = z
  .object({
    schemaVersion: z.literal(1),
    kind: z.literal('phase11-critic-report'),
    critic: z
      .object({
        identity: z.string().min(1).max(200),
        freshContext: z.literal(true),
        builderIdentity: z.string().min(1).max(200),
        independence: z
          .object({
            criteria: z.array(z.string().min(1)).min(1),
            builderJustificationIncluded: z.literal(false),
            builderConclusionReused: z.literal(false),
            writeAccessToWorktree: z.literal(false)
          })
          .strict()
      })
      .strict(),
    binding: z
      .object({
        candidateId: Digest,
        commit: Commit,
        treeHash: TreeDigest
      })
      .strict(),
    fingerprint: z
      .object({
        algorithm: z.literal('sha256-candidate-v1'),
        before: Digest,
        after: Digest
      })
      .strict(),
    verdict: z
      .object({
        status: z.enum(['PASS', 'FAIL']),
        summary: z.string().min(1).max(8000)
      })
      .strict(),
    findings: z
      .object({
        P0: z.number().int().nonnegative(),
        P1: z.number().int().nonnegative(),
        P2: z.number().int().nonnegative()
      })
      .strict(),
    checks: z
      .array(
        z
          .object({
            id: z.string().min(1).max(200),
            status: z.enum(['PASS', 'FAIL']),
            method: z.string().min(1).max(2000),
            evidence: z.array(z.string().min(1)).min(1)
          })
          .strict()
      )
      .min(1),
    artifacts: z
      .array(
        z
          .object({
            path: z.string().min(1),
            sha256: Digest,
            size: z.number().int().nonnegative()
          })
          .strict()
      )
      .min(1),
    disclaimers: z
      .object({
        syntheticOnly: z.literal(true),
        productionBlocked: z.literal(true)
      })
      .strict()
  })
  .strict()

export const CRITIC_ARTIFACT_ROOTS = Object.freeze([
  'certification/',
  'coverage/',
  'docs/',
  'playwright-report/',
  'test-results/'
])

const FORBIDDEN_BUILDER_KEY =
  /^(?:builder|author|implementer|implementation)[_-]?(?:justification|notes?|summary|conclusion|claim|rationale)$/i

/** Recursively searches for builder-authored justification/conclusion fields. */
export function findBuilderJustificationKeys(value, location = '$') {
  const hits = []
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      hits.push(...findBuilderJustificationKeys(entry, `${location}[${index}]`))
    )
    return hits
  }
  if (!value || typeof value !== 'object') return hits
  for (const [key, entry] of Object.entries(value)) {
    const child = `${location}.${key}`
    if (
      FORBIDDEN_BUILDER_KEY.test(key) &&
      !/^critic\.builderIdentity$/.test(child.replace(/^\$\./, ''))
    ) {
      hits.push(child)
    }
    hits.push(...findBuilderJustificationKeys(entry, child))
  }
  return hits
}

export function fingerprintCandidateFiles(files) {
  const normalized = [...files]
    .map(({ path: filePath, sha256, size }) => ({
      path: String(filePath).split(path.sep).join('/'),
      sha256,
      size
    }))
    .sort((left, right) => (left.path < right.path ? -1 : 1))
  return sha256Bytes(
    JSON.stringify({
      schemaVersion: 'sha256-candidate-v1',
      files: normalized
    })
  )
}

export function candidateFingerprint(root, { excludePaths = [] } = {}) {
  const excluded = new Set(
    excludePaths.map((entry) => entry.split(path.sep).join('/'))
  )
  const files = collectCandidateFiles(root).filter(
    (file) => !excluded.has(file.path)
  )
  return fingerprintCandidateFiles(files)
}

function defaultArtifactReader(root) {
  return (relativePath) => {
    const absolute = path.join(root, relativePath)
    if (!absolute.startsWith(path.join(root, path.sep))) return undefined
    return fs.existsSync(absolute) ? fs.readFileSync(absolute) : undefined
  }
}

function check(id, pass, detail = '') {
  return { id, status: pass ? 'PASS' : 'FAIL', ...(detail ? { detail } : {}) }
}

/**
 * Executable verification of one critic report. `currentCandidate` (when
 * provided) must be `{ candidateId, commit, treeHash }` recomputed from the
 * analyzed working tree; `currentFingerprint` (when provided) must be the
 * fingerprint of that same tree excluding the critic package itself.
 */
export function verifyCriticReport({
  report,
  reportBytes,
  reportPath = CRITIC_REPORT_PATH,
  root = null,
  artifactReader = root ? defaultArtifactReader(root) : null,
  expectedReportSha256 = null,
  currentCandidate = null,
  currentFingerprint = null,
  requiredCriteria = CRITIC_IDENTITY_CRITERIA
}) {
  const checks = []
  const failures = []
  const fail = (id, detail) => {
    checks.push(check(id, false, detail))
    failures.push(`${id}:${detail}`)
  }

  const parsed = CriticReportSchema.safeParse(report)
  if (!parsed.success) {
    const detail = parsed.error.issues
      .slice(0, 8)
      .map((issue) => `${issue.path.join('.')}:${issue.message}`)
      .join('; ')
    fail('CRITIC:schema', detail)
    return { status: 'FAIL', pass: false, checks, failures }
  }
  checks.push(check('CRITIC:schema', true, 'phase11-critic-report schema v1'))
  const value = parsed.data

  if (expectedReportSha256) {
    const observed = sha256Bytes(
      Buffer.isBuffer(reportBytes)
        ? reportBytes
        : Buffer.from(String(reportBytes ?? ''))
    )
    if (observed === expectedReportSha256) {
      checks.push(check('CRITIC:report_digest', true, observed))
    } else {
      fail(
        'CRITIC:report_digest',
        `tampered or stale report: observed ${observed} expected ${expectedReportSha256}`
      )
    }
  }

  const normalizedReportPath = reportPath.split(path.sep).join('/')
  if (
    value.artifacts.some((artifact) => artifact.path === normalizedReportPath)
  ) {
    fail('CRITIC:self_citation', normalizedReportPath)
  }

  if (currentCandidate) {
    const contentMismatches = [
      ['candidateId', value.binding.candidateId, currentCandidate.candidateId],
      ['treeHash', value.binding.treeHash, currentCandidate.treeHash]
    ].filter(([, declared, observed]) => declared !== observed)
    const commitDrift = value.binding.commit !== currentCandidate.commit
    if (contentMismatches.length === 0) {
      // `commit` is HEAD-anchored while candidateId/treeHash bind the product
      // bytes; evidence or generated-output commits advance HEAD without
      // changing the candidate, so commit drift is tolerated when both
      // content hashes match.
      checks.push(
        check(
          'CRITIC:binding',
          true,
          commitDrift
            ? `${value.binding.candidateId.slice(0, 12)} (commit drift ${value.binding.commit.slice(0, 7)}->${currentCandidate.commit.slice(0, 7)} tolerated; evidence-only commits)`
            : value.binding.candidateId.slice(0, 12)
        )
      )
    } else {
      const mismatches = [
        ...contentMismatches,
        ...(commitDrift
          ? [['commit', value.binding.commit, currentCandidate.commit]]
          : [])
      ].map(
        ([field, declared, observed]) => `${field}=${declared}!=${observed}`
      )
      fail('CRITIC:binding', mismatches.join(', '))
    }
  } else {
    checks.push(
      check(
        'CRITIC:binding',
        true,
        `declared ${value.binding.candidateId.slice(0, 12)}@${value.binding.commit.slice(0, 12)} (no live candidate provided)`
      )
    )
  }

  if (value.fingerprint.before !== value.fingerprint.after) {
    fail(
      'CRITIC:fingerprint',
      `worktree changed during review: ${value.fingerprint.before} -> ${value.fingerprint.after}`
    )
  } else if (
    currentFingerprint &&
    currentFingerprint !== value.fingerprint.after
  ) {
    fail(
      'CRITIC:fingerprint',
      `worktree changed after review: reported ${value.fingerprint.after}, current ${currentFingerprint}`
    )
  } else {
    checks.push(
      check('CRITIC:fingerprint', true, value.fingerprint.after.slice(0, 12))
    )
  }

  const criteria = value.critic.independence.criteria
  const unknown = criteria.filter(
    (criterion) => !CRITIC_IDENTITY_CRITERIA.includes(criterion)
  )
  const missing = requiredCriteria.filter(
    (criterion) => !criteria.includes(criterion)
  )
  if (value.critic.identity === value.critic.builderIdentity) {
    fail('CRITIC:identity', 'critic identity equals builder identity')
  } else {
    checks.push(check('CRITIC:identity', true, value.critic.identity))
  }
  if (unknown.length > 0) {
    fail('CRITIC:independence', `unknown criteria: ${unknown.join(', ')}`)
  } else if (missing.length > 0) {
    fail('CRITIC:independence', `missing criteria: ${missing.join(', ')}`)
  } else {
    checks.push(check('CRITIC:independence', true, criteria.join(',')))
  }

  const justificationKeys = findBuilderJustificationKeys(value)
  if (justificationKeys.length > 0) {
    fail(
      'CRITIC:builder_content',
      `builder-authored fields present: ${justificationKeys.join(', ')}`
    )
  } else if (
    value.critic.independence.builderJustificationIncluded !== false ||
    value.critic.independence.builderConclusionReused !== false
  ) {
    fail('CRITIC:builder_content', 'builder justification/conclusion declared')
  } else {
    checks.push(
      check('CRITIC:builder_content', true, 'no builder justification fields')
    )
  }

  const declaredArtifacts = new Map()
  let artifactFailures = false
  for (const artifact of value.artifacts) {
    const normalized = artifact.path.split(path.sep).join('/')
    if (declaredArtifacts.has(normalized)) {
      fail('CRITIC:artifacts', `duplicate artifact: ${normalized}`)
      artifactFailures = true
      continue
    }
    declaredArtifacts.set(normalized, artifact)
    if (
      normalized.includes('..') ||
      !CRITIC_ARTIFACT_ROOTS.some((allowed) => normalized.startsWith(allowed))
    ) {
      fail('CRITIC:artifacts', `artifact outside allowed roots: ${normalized}`)
      artifactFailures = true
      continue
    }
    if (!artifactReader) continue
    const content = artifactReader(normalized)
    if (content === undefined) {
      fail('CRITIC:artifacts', `cited artifact missing: ${normalized}`)
      artifactFailures = true
      continue
    }
    if (sha256Bytes(content) !== artifact.sha256) {
      fail(
        'CRITIC:artifacts',
        `digest mismatch: ${normalized} (declared ${artifact.sha256})`
      )
      artifactFailures = true
      continue
    }
    if (content.byteLength !== artifact.size) {
      fail(
        'CRITIC:artifacts',
        `size mismatch: ${normalized} (declared ${artifact.size}, observed ${content.byteLength})`
      )
      artifactFailures = true
    }
  }
  if (!artifactFailures && artifactReader) {
    checks.push(
      check(
        'CRITIC:artifacts',
        true,
        `${value.artifacts.length} artifact digest(s) verified`
      )
    )
  }

  const undeclaredEvidence = value.checks.flatMap((entry) =>
    entry.evidence.filter(
      (evidence) => !declaredArtifacts.has(evidence.split(path.sep).join('/'))
    )
  )
  if (undeclaredEvidence.length > 0) {
    fail(
      'CRITIC:check_evidence',
      `evidence not declared as artifacts: ${undeclaredEvidence.join(', ')}`
    )
  } else {
    checks.push(
      check(
        'CRITIC:check_evidence',
        true,
        `${value.checks.length} check(s) cite declared artifacts`
      )
    )
  }

  const failedChecks = value.checks.filter((entry) => entry.status !== 'PASS')
  const verdictPass =
    value.verdict.status === 'PASS' &&
    failedChecks.length === 0 &&
    value.findings.P0 === 0 &&
    value.findings.P1 === 0
  if (value.verdict.status === 'FAIL') {
    fail('CRITIC:verdict', 'critic verdict is FAIL')
  } else if (!verdictPass) {
    fail(
      'CRITIC:verdict',
      `verdict PASS is not supported (failed checks=${failedChecks.length}, P0=${value.findings.P0}, P1=${value.findings.P1})`
    )
  } else {
    checks.push(check('CRITIC:verdict', true, 'PASS derived from checks'))
  }

  const pass = checks.every((entry) => entry.status === 'PASS')
  return { status: pass ? 'PASS' : 'FAIL', pass, checks, failures }
}

export function readCriticReport({ root, relativePath = CRITIC_REPORT_PATH }) {
  const absolute = path.resolve(root, relativePath)
  if (!fs.existsSync(absolute)) return null
  const bytes = fs.readFileSync(absolute)
  let report = null
  try {
    report = JSON.parse(bytes.toString('utf8'))
  } catch {
    report = null
  }
  return {
    path: relativePath.split(path.sep).join('/'),
    bytes,
    sha256: sha256Bytes(bytes),
    report
  }
}

export function reportDigest(relativePath, content) {
  return createHash('sha256').update(content).digest('hex')
}
