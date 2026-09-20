#!/usr/bin/env node
/**
 * AUD19-08 behavioral Phase 11.2 evidence check without side effects.
 *
 * `--critic` replaces the previous Markdown substring scan with an executable
 * verification of a machine-readable independent-critic report: schema,
 * candidate/commit binding, before/after fingerprint identity, declared
 * independence criteria, absence of builder-authored justification, and
 * on-disk digests of every cited artifact.
 *
 * `--reports` replaces the per-file Markdown status search with a digest-bound
 * machine-readable reports manifest (`docs/phase11/reports-manifest.json`).
 *
 * A missing input is reported as NOT_RUN (exit 2); a present but incoherent
 * input is FAIL (exit 1). Neither exits 0, so the gate stays fail-closed.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { sha256Bytes } from './lib/certification-rules.mjs'
import {
  CRITIC_REPORT_PATH,
  candidateFingerprint,
  readCriticReport,
  verifyCriticReport
} from './lib/critic-evidence.mjs'
import { buildPhase11Candidate } from './lib/phase11-rules.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const option = (name, fallback = null) => {
  const prefix = `--${name}=`
  const found = args.find((argument) => argument.startsWith(prefix))
  return found ? found.slice(prefix.length) : fallback
}
const mode = args.includes('--critic')
  ? 'critic'
  : args.includes('--reports')
    ? 'reports'
    : null

const REPORT_STATUSES = [
  'PASS',
  'PARTIAL',
  'BLOCKED_EXTERNAL',
  'CONDITIONAL_GO'
]

const ReportsManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    kind: z.literal('phase11-evidence-reports'),
    reports: z
      .array(
        z
          .object({
            path: z.string().min(1),
            sha256: z.string().regex(/^[0-9a-f]{64}$/),
            size: z.number().int().nonnegative(),
            status: z.enum(REPORT_STATUSES),
            scope: z.enum(['synthetic', 'controlled-local']),
            claimsNoProduction: z.literal(true),
            artifacts: z
              .array(
                z
                  .object({
                    path: z.string().min(1),
                    sha256: z.string().regex(/^[0-9a-f]{64}$/),
                    size: z.number().int().nonnegative()
                  })
                  .strict()
              )
              .optional()
          })
          .strict()
      )
      .min(1)
  })
  .strict()

function check(id, pass, detail = '') {
  return { id, status: pass ? 'PASS' : 'FAIL', ...(detail ? { detail } : {}) }
}

function fileBytes(relativePath) {
  const absolute = path.resolve(root, relativePath)
  if (!absolute.startsWith(path.join(root, path.sep))) return undefined
  return fs.existsSync(absolute) ? fs.readFileSync(absolute) : undefined
}

function validateCritic() {
  const relativePath = option('report', CRITIC_REPORT_PATH)
  const loaded = readCriticReport({ root, relativePath })
  if (!loaded) {
    return {
      status: 'NOT_RUN',
      checks: [
        check(
          'CRITIC:input',
          false,
          `critic report not found: ${relativePath} (NOT_RUN, no behavioral input)`
        )
      ]
    }
  }

  let currentCandidate = null
  let currentFingerprint = null
  const environmentChecks = []
  try {
    const candidate = buildPhase11Candidate(root)
    currentCandidate = {
      candidateId: candidate.candidateId,
      commit: candidate.commit,
      treeHash: candidate.treeHash
    }
    currentFingerprint = candidateFingerprint(root, {
      excludePaths: [relativePath]
    })
    environmentChecks.push(
      check(
        'CRITIC:environment',
        true,
        `live candidate ${candidate.candidateId.slice(0, 12)}@${candidate.commit.slice(0, 12)}`
      )
    )
  } catch (error) {
    environmentChecks.push(
      check('CRITIC:environment', false, `cannot recompute candidate: ${error}`)
    )
  }

  const expectedReportSha256 = option('report-sha256')
  const result = verifyCriticReport({
    report: loaded.report,
    reportBytes: loaded.bytes,
    reportPath: loaded.path,
    root,
    expectedReportSha256,
    currentCandidate,
    currentFingerprint
  })
  return {
    status: result.status,
    checks: [...environmentChecks, ...result.checks],
    failures: result.failures
  }
}

function validateReports() {
  const manifestPath = option('manifest', 'docs/phase11/reports-manifest.json')
  const manifestBytes = fileBytes(manifestPath)
  if (!manifestBytes) {
    return {
      status: 'FAIL',
      checks: [
        check(
          'REPORTS:manifest',
          false,
          `missing digest-bound reports manifest: ${manifestPath}`
        )
      ]
    }
  }
  let manifest
  try {
    manifest = ReportsManifestSchema.parse(
      JSON.parse(manifestBytes.toString('utf8'))
    )
  } catch (error) {
    return {
      status: 'FAIL',
      checks: [check('REPORTS:schema', false, String(error).slice(0, 500))]
    }
  }
  const checks = [
    check('REPORTS:schema', true, `${manifest.reports.length} report(s)`)
  ]
  for (const report of manifest.reports) {
    const label = `REPORTS:${report.path}`
    const content = fileBytes(report.path)
    if (!content) {
      checks.push(check(label, false, 'missing'))
      continue
    }
    if (sha256Bytes(content) !== report.sha256) {
      checks.push(check(label, false, 'digest mismatch (tampered or stale)'))
      continue
    }
    if (content.byteLength !== report.size) {
      checks.push(check(label, false, 'size mismatch'))
      continue
    }
    let artifactFailure = null
    for (const artifact of report.artifacts ?? []) {
      const artifactContent = fileBytes(artifact.path)
      if (!artifactContent) {
        artifactFailure = `cited artifact missing: ${artifact.path}`
        break
      }
      if (
        sha256Bytes(artifactContent) !== artifact.sha256 ||
        artifactContent.byteLength !== artifact.size
      ) {
        artifactFailure = `cited artifact digest mismatch: ${artifact.path}`
        break
      }
    }
    if (artifactFailure) {
      checks.push(check(label, false, artifactFailure))
      continue
    }
    checks.push(
      check(
        label,
        true,
        `${report.status}; ${report.scope}; no production claim; ${(report.artifacts ?? []).length} artifact(s) verified`
      )
    )
  }
  const failed = checks.some((entry) => entry.status !== 'PASS')
  return { status: failed ? 'FAIL' : 'PASS', checks }
}

let outcome
if (mode === 'critic') outcome = validateCritic()
else if (mode === 'reports') outcome = validateReports()
else {
  outcome = {
    status: 'FAIL',
    checks: [check('MODE', false, 'use --reports or --critic')]
  }
}

const output = {
  schemaVersion: 1,
  kind: 'phase11-2-evidence-check',
  mode: mode ?? 'invalid',
  status: outcome.status,
  syntheticOnly: true,
  sideEffects: false,
  checks: outcome.checks,
  ...(outcome.failures ? { failures: outcome.failures } : {})
}
process.stdout.write(`${JSON.stringify(output, null, 2)}\n`)
process.exitCode =
  outcome.status === 'PASS' ? 0 : outcome.status === 'NOT_RUN' ? 2 : 1
