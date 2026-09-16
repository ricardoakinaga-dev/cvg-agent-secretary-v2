#!/usr/bin/env node
/** Validate the human-readable Phase 11.2 evidence dossier without side effects. */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const mode = process.argv.includes('--critic')
  ? 'critic'
  : process.argv.includes('--reports')
    ? 'reports'
    : null

const reportFiles = [
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
]

const acceptedStatuses = new Set([
  'PASS',
  'PARTIAL',
  'BLOCKED_EXTERNAL',
  'CONDITIONAL_GO'
])

function read(relativePath) {
  const absolute = path.join(root, relativePath)
  return fs.existsSync(absolute) ? fs.readFileSync(absolute, 'utf8') : null
}

function statusOf(content) {
  const match = content?.match(
    /(?:^|\n)\s*(?:status|verdict)\s*:\s*([A-Z_]+)\b/i
  )
  return match?.[1]?.toUpperCase() ?? null
}

function check(id, pass, detail = '') {
  return { id, status: pass ? 'PASS' : 'FAIL', ...(detail ? { detail } : {}) }
}

function reportCheck(relativePath) {
  const content = read(relativePath)
  if (content === null) return check(`REPORT:${relativePath}`, false, 'missing')
  const status = statusOf(content)
  const hasScope = /synthetic|controlled[-_ ]local|controlled local/i.test(
    content
  )
  const claimsNoProduction =
    /no production|not validated|external blocker|external proof/i.test(content)
  const valid =
    status !== null &&
    acceptedStatuses.has(status) &&
    hasScope &&
    claimsNoProduction
  return check(
    `REPORT:${relativePath}`,
    valid,
    valid
      ? `${status}; synthetic scope declared`
      : JSON.stringify({
          status: status ?? 'missing',
          accepted: status !== null && acceptedStatuses.has(status),
          hasScope,
          claimsNoProduction
        })
  )
}

function validateReports() {
  const checks = reportFiles.map(reportCheck)
  const critic = read('docs/phase11/PHASE11_INDEPENDENT_CRITIC.md')
  if (critic !== null && statusOf(critic) === 'PENDING') {
    checks.push(
      check(
        'REPORTS:critic_not_pending',
        false,
        'independent critic is pending'
      )
    )
  }
  return checks
}

function validateCritic() {
  const relativePath = 'docs/phase11/PHASE11_INDEPENDENT_CRITIC.md'
  const content = read(relativePath) ?? ''
  return [
    check('CRITIC:present', content.length > 0, 'missing'),
    check(
      'CRITIC:status_pass',
      /(?:^|\n)\s*(?:status|verdict)\s*:\s*PASS\b/i.test(content)
    ),
    check('CRITIC:fresh', /fresh critic\s*:\s*true/i.test(content)),
    check(
      'CRITIC:mutation_sentinel',
      /mutation sentinel\s*:\s*PASS/i.test(content)
    ),
    check(
      'CRITIC:responsive_viewports',
      ['375', '768', '1440'].every((width) => content.includes(width))
    ),
    check(
      'CRITIC:no_external_fabrication',
      /no real|not validated|external.*(?:blocked|pending)|production.*(?:blocked|not)/i.test(
        content
      )
    )
  ]
}

const checks =
  mode === 'critic'
    ? validateCritic()
    : mode === 'reports'
      ? validateReports()
      : [check('MODE', false, 'use --reports or --critic')]
const failed = checks.filter((item) => item.status !== 'PASS')
const output = {
  schemaVersion: 1,
  kind: 'phase11-2-evidence-check',
  mode: mode ?? 'invalid',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  syntheticOnly: true,
  sideEffects: false,
  checks
}
process.stdout.write(`${JSON.stringify(output, null, 2)}\n`)
process.exitCode = failed.length === 0 ? 0 : 1
