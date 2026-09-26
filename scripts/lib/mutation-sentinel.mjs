import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

/**
 * AUD19-08 executable mutation sentinel.
 *
 * Copies the repository into a throwaway sandbox (the worktree is never
 * mutated), applies one pre-selected textual mutant at a time, runs the focused
 * test that must detect it, and restores the pristine file before the next
 * mutant. A mutant that leaves the focused test green is reported as
 * `not_detected` (an honest gap), never as detected.
 */

export const MUTATION_EXCLUDED_TOP_LEVEL = Object.freeze([
  '.git',
  'node_modules',
  'coverage',
  'test-results',
  'playwright-report',
  'blob-report',
  '.gauntlet',
  '.opencode',
  'apps/web/dist'
])

export const MUTATION_MANIFEST_PATH =
  'docs/04_audit/evidence/AUD19/AUD19-08-mutants.json'
export const MUTATION_MANIFEST_SHA256 =
  'f6a2b7e9e144ac51ca31ee6e53910e9b7505251c9b42d16ab0c98c5c500ce039'

export function copyRepositoryToSandbox(root, sandboxRoot) {
  fs.mkdirSync(sandboxRoot, { recursive: true })
  fs.cpSync(root, sandboxRoot, {
    recursive: true,
    filter: (source) => {
      const relative = path.relative(root, source)
      if (!relative) return true
      const normalized = relative.split(path.sep).join('/')
      return !MUTATION_EXCLUDED_TOP_LEVEL.some(
        (excluded) =>
          normalized === excluded || normalized.startsWith(`${excluded}/`)
      )
    }
  })
  const nodeModules = path.join(root, 'node_modules')
  const sandboxNodeModules = path.join(sandboxRoot, 'node_modules')
  if (!fs.existsSync(sandboxNodeModules) && fs.existsSync(nodeModules)) {
    fs.symlinkSync(nodeModules, sandboxNodeModules, 'dir')
  }
  const baseConfig = path.join(sandboxRoot, 'vitest.config.mts')
  if (fs.existsSync(baseConfig)) {
    fs.writeFileSync(
      path.join(sandboxRoot, 'vitest.mutation.config.mts'),
      [
        "import base from './vitest.config.mts'",
        '',
        'export default {',
        '  ...base,',
        "  cacheDir: '.vitest-cache'",
        '}',
        ''
      ].join('\n')
    )
  }
  return sandboxRoot
}

function applyMutation(content, mutation) {
  const { find, replace, target } = mutation
  if (typeof find !== 'string' || find.length === 0) {
    return { ok: false, reason: 'mutation_find_missing' }
  }
  if (find === replace) return { ok: false, reason: 'mutation_is_noop' }
  const occurrences = content.split(find).length - 1
  if (occurrences === 0) {
    return { ok: false, reason: 'mutation_target_stale' }
  }
  if (occurrences > 1) {
    return {
      ok: false,
      reason: `mutation_ambiguous_occurrences=${occurrences}`
    }
  }
  return { ok: true, content: content.replace(find, replace), target }
}

function parseVitestJson(absolutePath) {
  if (!fs.existsSync(absolutePath)) return null
  try {
    return JSON.parse(fs.readFileSync(absolutePath, 'utf8'))
  } catch {
    return null
  }
}

function runFocusedTests({ sandboxRoot, testFiles, timeoutMs, extraEnv }) {
  const reportPath = path.join(sandboxRoot, '.mutation-report.json')
  if (fs.existsSync(reportPath)) fs.rmSync(reportPath)
  const vitestArgs = [
    'vitest',
    'run',
    ...testFiles,
    '--config',
    'vitest.mutation.config.mts',
    '--no-file-parallelism',
    '--maxWorkers=1',
    '--reporter=json',
    `--outputFile=${reportPath}`
  ]
  const env = {
    ...process.env,
    CI: process.env.CI ?? 'true',
    ...(extraEnv ?? {})
  }
  delete env.TEST_DATABASE_URL
  const result = spawnSync('npx', vitestArgs, {
    cwd: sandboxRoot,
    encoding: 'utf8',
    timeout: timeoutMs,
    maxBuffer: 64 * 1024 * 1024,
    env
  })
  const report = parseVitestJson(reportPath)
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
  return {
    exitCode: result.status ?? 1,
    timedOut: result.error?.code === 'ETIMEDOUT',
    tests: report
      ? {
          total: report.numTotalTests ?? null,
          passed: report.numPassedTests ?? null,
          failed: report.numFailedTests ?? null,
          pending: report.numPendingTests ?? null
        }
      : null,
    outputTail: output.slice(-2000)
  }
}

export function loadMutationManifest(root, manifestPath) {
  const absolute = path.isAbsolute(manifestPath)
    ? manifestPath
    : path.join(root, manifestPath)
  const manifest = JSON.parse(fs.readFileSync(absolute, 'utf8'))
  if (manifest?.kind !== 'aud19-critical-mutants') {
    throw new Error(`unexpected mutation manifest kind: ${manifest?.kind}`)
  }
  return manifest
}

export function verifyMutationReport({
  report,
  manifest,
  manifestSha256,
  expectedManifestSha256 = MUTATION_MANIFEST_SHA256,
  reportBytes,
  executionLog,
  gateExitCode,
  currentCandidate,
  minGeneratedAt,
  maxGeneratedAt
}) {
  const failures = []
  if (
    !report ||
    report.schemaVersion !== 1 ||
    report.kind !== 'aud19-mutation-sentinel'
  ) {
    failures.push('mutation_report_shape_invalid')
    return { status: 'FAIL', failures }
  }
  if (report.status !== 'PASS') failures.push('mutation_report_not_pass')
  const observedReportSha256 = reportBytes
    ? createHash('sha256').update(reportBytes).digest('hex')
    : null
  if (
    gateExitCode !== 0 ||
    !observedReportSha256 ||
    typeof executionLog !== 'string' ||
    !executionLog.includes(`[mutation] reportSha256=${observedReportSha256}`)
  ) {
    failures.push('mutation_execution_receipt_invalid')
  }
  if (report.manifestSha256 !== manifestSha256) {
    failures.push('mutation_manifest_digest_mismatch')
  }
  if (manifestSha256 !== expectedManifestSha256) {
    failures.push('mutation_manifest_not_canonical')
  }
  const candidateContentMatches =
    report.candidate?.candidateId === currentCandidate?.candidateId &&
    report.candidate?.treeHash === currentCandidate?.treeHash
  for (const key of ['candidateId', 'treeHash']) {
    if (report.candidate?.[key] !== currentCandidate?.[key]) {
      failures.push(`mutation_candidate_${key}_mismatch`)
    }
  }
  // `commit` is HEAD-anchored while candidateId/treeHash bind the product
  // bytes: evidence or generated-output commits advance HEAD without changing
  // the candidate, so commit drift is tolerated when both content hashes match.
  if (
    report.candidate?.commit !== currentCandidate?.commit &&
    !candidateContentMatches
  ) {
    failures.push('mutation_candidate_commit_mismatch')
  }
  const generatedAt = Date.parse(report.generatedAt)
  if (!Number.isFinite(generatedAt))
    failures.push('mutation_generated_at_invalid')
  if (minGeneratedAt && generatedAt < Date.parse(minGeneratedAt)) {
    failures.push('mutation_report_stale')
  }
  if (maxGeneratedAt && generatedAt > Date.parse(maxGeneratedAt)) {
    failures.push('mutation_report_from_future')
  }
  const expectedIds = new Set(
    (manifest?.mutants ?? []).map((entry) => entry.id)
  )
  const observedIds = new Set((report.results ?? []).map((entry) => entry.id))
  const summary = report.summary ?? {}
  if (
    expectedIds.size === 0 ||
    summary.total !== expectedIds.size ||
    summary.detected !== expectedIds.size ||
    summary.notDetected !== 0 ||
    summary.notApplicable !== 0 ||
    report.results?.length !== expectedIds.size ||
    [...expectedIds].some((id) => !observedIds.has(id)) ||
    report.results?.some((entry) => entry.status !== 'detected')
  ) {
    failures.push('mutation_results_incomplete_or_gapped')
  }
  const manifestById = new Map(
    (manifest?.mutants ?? []).map((entry) => [entry.id, entry])
  )
  for (const result of report.results ?? []) {
    const expected = manifestById.get(result.id)
    const executionDetected =
      result.timedOut === true ||
      (Number.isInteger(result.tests?.failed) && result.tests.failed > 0)
    const testEvidenceValid =
      result.timedOut === true ||
      (result.tests &&
        ['total', 'passed', 'failed', 'pending'].every((key) =>
          Number.isInteger(result.tests[key])
        ))
    if (
      !expected ||
      result.target !== expected.target ||
      JSON.stringify(result.focusedTests) !==
        JSON.stringify(expected.test?.files) ||
      typeof result.timedOut !== 'boolean' ||
      !Number.isInteger(result.exitCode) ||
      !testEvidenceValid ||
      typeof result.outputTail !== 'string' ||
      result.outputTail.length === 0 ||
      !executionDetected
    ) {
      failures.push(`mutation_execution_evidence_invalid:${result.id}`)
    }
  }
  return { status: failures.length === 0 ? 'PASS' : 'FAIL', failures }
}

export function runMutationSentinel({
  root,
  manifestPath = MUTATION_MANIFEST_PATH,
  only = null,
  max = null,
  timeoutMs = 180_000,
  keepSandbox = false,
  sandboxRoot = null
}) {
  const manifest = loadMutationManifest(root, manifestPath)
  const selected = manifest.mutants.filter(
    (mutation) => !only || only.includes(mutation.id)
  )
  const limited = max ? selected.slice(0, max) : selected
  const ownsSandbox = !sandboxRoot
  const resolvedSandbox =
    sandboxRoot ?? fs.mkdtempSync(path.join(os.tmpdir(), 'aud19-mutants-'))
  copyRepositoryToSandbox(root, resolvedSandbox)
  const pristine = new Map()
  const results = []
  try {
    for (const mutation of limited) {
      const targetRelative = mutation.target.split(path.sep).join('/')
      const targetAbsolute = path.join(resolvedSandbox, targetRelative)
      if (!fs.existsSync(targetAbsolute)) {
        results.push({
          id: mutation.id,
          category: mutation.category,
          status: 'not_applicable',
          reason: `target missing: ${targetRelative}`
        })
        continue
      }
      if (!pristine.has(targetRelative)) {
        pristine.set(targetRelative, fs.readFileSync(targetAbsolute))
      }
      fs.writeFileSync(targetAbsolute, pristine.get(targetRelative))
      const original = fs.readFileSync(targetAbsolute, 'utf8')
      const applied = applyMutation(original, mutation)
      if (!applied.ok) {
        results.push({
          id: mutation.id,
          category: mutation.category,
          status: 'not_applicable',
          reason: applied.reason
        })
        continue
      }
      fs.writeFileSync(targetAbsolute, applied.content)
      const observed = runFocusedTests({
        sandboxRoot: resolvedSandbox,
        testFiles: mutation.test.files,
        timeoutMs: mutation.timeoutMs ?? timeoutMs,
        extraEnv: mutation.env
      })
      fs.writeFileSync(targetAbsolute, pristine.get(targetRelative))
      const detected =
        observed.timedOut ||
        observed.exitCode !== 0 ||
        (observed.tests?.failed ?? 0) > 0
      results.push({
        id: mutation.id,
        category: mutation.category,
        target: targetRelative,
        rationale: mutation.rationale,
        focusedTests: mutation.test.files,
        status: detected ? 'detected' : 'not_detected',
        exitCode: observed.exitCode,
        timedOut: observed.timedOut,
        tests: observed.tests,
        outputTail: observed.outputTail
      })
    }
  } finally {
    for (const [targetRelative, content] of pristine) {
      fs.writeFileSync(path.join(resolvedSandbox, targetRelative), content)
    }
    if (!keepSandbox && ownsSandbox) {
      fs.rmSync(resolvedSandbox, { recursive: true, force: true })
    }
  }

  const summary = {
    total: results.length,
    detected: results.filter((entry) => entry.status === 'detected').length,
    notDetected: results.filter((entry) => entry.status === 'not_detected')
      .length,
    notApplicable: results.filter((entry) => entry.status === 'not_applicable')
      .length,
    sandbox: keepSandbox ? resolvedSandbox : null
  }
  return {
    schemaVersion: 1,
    kind: 'aud19-mutation-sentinel',
    program: manifest.program ?? 'AUD19-REM',
    task: manifest.task ?? 'AUD19-08',
    generatedAt: new Date().toISOString(),
    node: process.versions.node,
    manifest: manifestPath,
    status:
      summary.total > 0 && summary.detected === summary.total
        ? 'PASS'
        : 'GAPS_FOUND',
    summary,
    results
  }
}
