import fs from 'node:fs'
import path from 'node:path'

/**
 * AUD19-08 executable skip policy.
 *
 * A skip is only "optional" when a frozen rule in the versioned manifest
 * matches the exact skipped test under the execution context that produced it.
 * Everything else fails closed: the classification defaults to `required` so a
 * new, untracked or misdeclared skip can never be waived by a free-text
 * `skipJustification`.
 */

export const DEFAULT_SKIP_MANIFEST_PATH =
  'docs/03_build/tracking/aud19-required-skips.json'

export const SKIPPED_STATUSES = Object.freeze(['skipped', 'pending', 'todo'])

export const SKIP_WHEN = Object.freeze([
  'always',
  'database_absent',
  'database_present'
])

export function normalizeRepoPath(value) {
  return String(value ?? '')
    .split(path.sep)
    .join('/')
    .replace(/^\.\//, '')
}

/**
 * Minimal glob matcher for manifest rules: `**` crosses separators, `*` and
 * `?` stay inside a path segment. Intentionally dependency-free.
 */
export function globToRegExp(pattern) {
  const normalized = normalizeRepoPath(pattern)
  let source = '^'
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index]
    if (char === '*') {
      if (normalized[index + 1] === '*') {
        if (normalized[index + 2] === '/') {
          source += '(?:.*/)?'
          index += 2
        } else {
          source += '.*'
          index += 1
        }
      } else {
        source += '[^/]*'
      }
    } else if (char === '?') {
      source += '[^/]'
    } else {
      source += char.replace(/[.+^${}()|[\]\\]/g, '\\$&')
    }
  }
  source += '$'
  return new RegExp(source)
}

function whenMatches(when, context) {
  if (when === undefined || when === 'always') return true
  if (when === 'database_absent') return context.databaseAvailable !== true
  if (when === 'database_present') return context.databaseAvailable === true
  return false
}

export function isPostgresScopedFile(file, postgresScopedFiles = []) {
  const normalized = normalizeRepoPath(file)
  if (
    postgresScopedFiles
      .map(normalizeRepoPath)
      .some(
        (scoped) => normalized === scoped || normalized.endsWith(`/${scoped}`)
      )
  ) {
    return true
  }
  return /postgres/i.test(normalized)
}

function contextPath(file, context) {
  const value = String(file ?? '')
  if (context.root && path.isAbsolute(value)) {
    return normalizeRepoPath(path.relative(context.root, value))
  }
  return normalizeRepoPath(value)
}

function resolveRule(rule, skip, context) {
  if (
    rule.gate !== undefined &&
    rule.gate !== '*' &&
    rule.gate !== context.gate
  ) {
    return false
  }
  const patterns = rule.filePattern
    ? [rule.filePattern]
    : Array.isArray(rule.filePatterns)
      ? rule.filePatterns
      : []
  if (patterns.length > 0) {
    const matchesFile = patterns
      .map(globToRegExp)
      .some((expression) => expression.test(normalizeRepoPath(skip.file)))
    if (!matchesFile) return false
  }
  if (rule.testNamePattern) {
    let expression
    try {
      expression = new RegExp(rule.testNamePattern)
    } catch {
      return false
    }
    if (!expression.test(skip.name)) return false
  }
  if (!whenMatches(rule.when, context)) return false
  if (rule.requiresPostgresScope === true) {
    return isPostgresScopedFile(skip.file, context.postgresScopedFiles)
  }
  return true
}

/**
 * Classifies a single skipped test. Returns `required` unless a frozen optional
 * rule matches it. The PostgreSQL gate never tolerates skips: any skip observed
 * while the gate runs with a live database is required.
 */
export function classifySkip(skip, context = {}, manifest = null) {
  const rules = manifest
    ? {
        required: Array.isArray(manifest.required) ? manifest.required : [],
        optional: Array.isArray(manifest.optional) ? manifest.optional : []
      }
    : { required: [], optional: [] }
  for (const rule of rules.required) {
    if (resolveRule(rule, skip, context)) {
      return {
        classification: 'required',
        ruleId: rule.id,
        reason: rule.reason ?? 'required skip rule matched'
      }
    }
  }
  for (const rule of rules.optional) {
    if (resolveRule(rule, skip, context)) {
      return {
        classification: 'optional',
        ruleId: rule.id,
        reason: rule.reason ?? 'optional skip rule matched',
        ...(rule.coveredByGate ? { coveredByGate: rule.coveredByGate } : {})
      }
    }
  }
  if (context.gate === 'postgres') {
    return {
      classification: 'required',
      ruleId: 'postgres-gate-no-skips',
      reason:
        'the PostgreSQL environment gate must execute every selected test; any skip is missing mandatory evidence'
    }
  }
  return {
    classification: 'required',
    ruleId: 'unclassified-skip-fail-closed',
    reason:
      'no frozen optional rule matches this skip under the current execution context; fail closed and triage it'
  }
}

export function classifySkips({
  skips = [],
  gate = 'unit',
  databaseAvailable = false,
  manifest = null,
  postgresScopedFiles = [],
  root = null
}) {
  const context = { gate, databaseAvailable, postgresScopedFiles, root }
  const records = skips.map((skip) => ({
    file: contextPath(skip.file, context),
    name: skip.name ?? '',
    ...classifySkip(skip, context, manifest)
  }))
  const required = records.filter(
    (record) => record.classification === 'required'
  )
  const optional = records.filter(
    (record) => record.classification === 'optional'
  )
  return {
    context: { gate, databaseAvailable },
    counts: {
      total: records.length,
      required: required.length,
      optional: optional.length
    },
    required,
    optional,
    records
  }
}

export function loadSkipManifest(
  root,
  relativePath = DEFAULT_SKIP_MANIFEST_PATH
) {
  const absolute = path.isAbsolute(relativePath)
    ? relativePath
    : path.join(root, relativePath)
  if (!fs.existsSync(absolute)) return null
  try {
    const manifest = JSON.parse(fs.readFileSync(absolute, 'utf8'))
    if (manifest?.kind !== 'aud19-required-skips') return null
    return manifest
  } catch {
    return null
  }
}

/**
 * Files selected by the dedicated PostgreSQL gate command
 * (`package.json` -> scripts.test:postgres). Kept dynamic so the manifest does
 * not hardcode a second copy of the selection that can drift.
 */
export function readPostgresScopedFiles(root) {
  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(root, 'package.json'), 'utf8')
    )
    const command = packageJson?.scripts?.['test:postgres'] ?? ''
    return [...command.matchAll(/([\w./-]+\.test\.ts)/g)].map((match) =>
      normalizeRepoPath(match[1])
    )
  } catch {
    return []
  }
}

/** Extracts non-executed assertions from a vitest JSON report. */
export function extractSkipsFromVitestJson(report) {
  const skipped = []
  for (const file of report?.testResults ?? []) {
    const filePath = normalizeRepoPath(file?.name ?? '')
    for (const assertion of file?.assertionResults ?? []) {
      if (!SKIPPED_STATUSES.includes(assertion?.status)) continue
      skipped.push({
        file: filePath,
        name: assertion?.fullName ?? assertion?.title ?? '',
        status: assertion.status
      })
    }
  }
  return skipped
}

/** Best-effort parse of `↓ ` skipped-test lines from a verbose vitest log. */
export function extractSkipsFromVitestLog(logText) {
  const skipped = []
  for (const rawLine of String(logText ?? '').split('\n')) {
    const line = rawLine.replace(/\u001b\[[0-9;]*[A-Za-z]/g, '').trim()
    if (!line.startsWith('↓') && !line.startsWith('✓ ↓')) continue
    const body = line.replace(/^✓\s*/, '').replace(/^↓\s*/, '')
    const fileMatch = /([\w./-]+\.test\.(?:ts|tsx|js|jsx))/.exec(body)
    if (!fileMatch) continue
    skipped.push({
      file: normalizeRepoPath(fileMatch[1]),
      name: body
        .slice(fileMatch.index + fileMatch[0].length)
        .replace(/^[\s>]+/, ''),
      status: 'skipped'
    })
  }
  return skipped
}

export function skipInventoryArtifact({
  gate,
  command,
  databaseAvailable,
  report,
  manifest,
  postgresScopedFiles,
  root = null
}) {
  const skips = extractSkipsFromVitestJson(report)
  const classified = classifySkips({
    skips,
    gate,
    databaseAvailable,
    manifest,
    postgresScopedFiles,
    root
  })
  const totals = {
    testFiles: Array.isArray(report?.testResults)
      ? report.testResults.length
      : 0,
    tests: Number.isInteger(report?.numTotalTests)
      ? report.numTotalTests
      : null,
    passed: Number.isInteger(report?.numPassedTests)
      ? report.numPassedTests
      : null,
    failed: Number.isInteger(report?.numFailedTests)
      ? report.numFailedTests
      : null,
    skipped: Number.isInteger(report?.numPendingTests)
      ? report.numPendingTests
      : skips.length
  }
  const perFile = new Map()
  for (const record of classified.records) {
    const entry = perFile.get(record.file) ?? {
      file: record.file,
      total: 0,
      required: 0,
      optional: 0,
      tests: []
    }
    entry.total += 1
    entry[record.classification] += 1
    entry.tests.push({
      name: record.name,
      classification: record.classification,
      ruleId: record.ruleId,
      reason: record.reason
    })
    perFile.set(record.file, entry)
  }
  return {
    gate,
    command,
    databaseAvailable,
    totals,
    counts: classified.counts,
    files: [...perFile.values()].sort((left, right) =>
      left.file < right.file ? -1 : 1
    ),
    required: classified.required,
    optional: classified.optional
  }
}
