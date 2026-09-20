#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sha256Bytes } from './lib/certification-rules.mjs'

export const REPORTS_MANIFEST_PATH = 'docs/phase11/reports-manifest.json'

export const PHASE11_REPORT_PATHS = Object.freeze([
  'docs/phase11/PHASE11_2_DELTA_AUDIT.md',
  'docs/phase11/PHASE11_FORMAL_CLOSURE.md',
  'docs/phase11/PHASE11_ORCHESTRATOR_PROOF.md',
  'docs/phase11/PHASE11_SECURITY_REVIEW.md',
  'docs/phase11/PHASE11_ADVERSARIAL_REPORT.md',
  'docs/phase11/PHASE11_RECOVERY_REPORT.md',
  'docs/phase11/PHASE11_CHAOS_REPORT.md',
  'docs/phase11/PHASE11_LOAD_REPORT.md',
  'docs/phase11/PHASE11_INTEGRATION_REPORT.md',
  'docs/phase11/PHASE11_INDEPENDENT_CRITIC.md'
])

const STATUS_PATTERN = /(?:^|\n)\s*(?:status|verdict)\s*:\s*([A-Z_]+)\b/i
const ACCEPTED_STATUSES = Object.freeze([
  'PASS',
  'PARTIAL',
  'BLOCKED_EXTERNAL',
  'CONDITIONAL_GO'
])
const SCOPE_PATTERN = /synthetic|controlled[-_ ]local/i
const NO_PRODUCTION_PATTERN =
  /no production|not validated|external blocker|external proof|production.*(?:blocked|not|no_go)/i
const PENDING_PATTERN = /(?:^|\n)\s*(?:status|verdict)\s*:\s*PENDING\b/i

export function buildReportsManifest(root) {
  const reports = []
  const problems = []
  for (const relativePath of PHASE11_REPORT_PATHS) {
    const absolute = path.join(root, relativePath)
    if (!fs.existsSync(absolute)) {
      problems.push(`missing:${relativePath}`)
      continue
    }
    const bytes = fs.readFileSync(absolute)
    const content = bytes.toString('utf8')
    const statusMatch = STATUS_PATTERN.exec(content)
    const status = statusMatch ? statusMatch[1].toUpperCase() : null
    if (status === null || !ACCEPTED_STATUSES.includes(status)) {
      problems.push(`status_invalid:${relativePath}:${status ?? 'missing'}`)
      continue
    }
    if (PENDING_PATTERN.test(content)) {
      problems.push(`pending_status:${relativePath}`)
      continue
    }
    if (!SCOPE_PATTERN.test(content)) {
      problems.push(`scope_missing:${relativePath}`)
      continue
    }
    if (!NO_PRODUCTION_PATTERN.test(content)) {
      problems.push(`no_production_claim_missing:${relativePath}`)
      continue
    }
    reports.push({
      path: relativePath,
      sha256: sha256Bytes(bytes),
      size: bytes.byteLength,
      status,
      scope: 'controlled-local',
      claimsNoProduction: true
    })
  }
  return {
    manifest: {
      schemaVersion: 1,
      kind: 'phase11-evidence-reports',
      reports
    },
    problems
  }
}

const isMain =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const { manifest, problems } = buildReportsManifest(root)
  if (problems.length > 0) {
    process.stderr.write(
      `${JSON.stringify({ event: 'reports_manifest.failed', problems }, null, 2)}\n`
    )
    process.exitCode = 1
  } else {
    fs.writeFileSync(
      path.join(root, REPORTS_MANIFEST_PATH),
      `${JSON.stringify(manifest, null, 2)}\n`
    )
    process.stdout.write(
      `${JSON.stringify({
        event: 'reports_manifest.written',
        path: REPORTS_MANIFEST_PATH,
        reports: manifest.reports.length,
        statuses: manifest.reports.map((report) => report.status)
      })}\n`
    )
  }
}
