#!/usr/bin/env node
/**
 * PHASE 10.0 — Baseline & Truth Source runner.
 *
 * Executes the repository quality gates on the current commit, captures the
 * raw evidence (logs + hashes) and writes a mechanically readable artifact to
 * certification/baseline.json. This script records; it does not certify.
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'certification')
const logDir = path.join(outDir, 'baseline-logs')

const commands = [
  { id: 'readiness', command: 'npm run readiness' },
  { id: 'format', command: 'npm run format:check' },
  { id: 'typecheck', command: 'npm run typecheck' },
  { id: 'lint', command: 'npm run lint' },
  { id: 'build', command: 'npm run build' },
  { id: 'unit', command: 'npm test' },
  { id: 'coverage', command: 'npm run test:coverage' },
  { id: 'security', command: 'npm run audit:security' },
  { id: 'worker_startup', command: 'npm run test:worker:startup' },
  { id: 'postgres', command: 'npm run test:postgres' },
  { id: 'e2e', command: 'npm run test:e2e' }
]

function run(command) {
  const startedAt = Date.now()
  const result = spawnSync(command, {
    cwd: root,
    shell: true,
    encoding: 'utf8',
    timeout: 1_800_000,
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, CI: process.env.CI ?? 'true' }
  })
  return {
    exitCode: result.status ?? (result.error ? 1 : 0),
    signal: result.signal ?? null,
    durationMs: Date.now() - startedAt,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    error: result.error ? String(result.error.message) : null
  }
}

function slug(id) {
  return id.replace(/[^a-z0-9_]+/gi, '_')
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex')
}

function parseTestCounts(output) {
  const match = output.match(
    /Test Files\s+(\d+)\s+(passed|failed)[^\n]*\n\s*Tests\s+(\d+)\s+(passed|failed)/
  )
  if (!match) return null
  return {
    files: Number(match[1]),
    filesStatus: match[2],
    tests: Number(match[3]),
    testsStatus: match[4]
  }
}

function parseCoverageSummary() {
  const summaryPath = path.join(root, 'coverage', 'coverage-summary.json')
  if (!fs.existsSync(summaryPath)) return null
  try {
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
    const total = summary.total ?? {}
    return {
      statements: total.statements?.pct ?? null,
      branches: total.branches?.pct ?? null,
      functions: total.functions?.pct ?? null,
      lines: total.lines?.pct ?? null
    }
  } catch {
    return null
  }
}

function gitValue(args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' })
  return (result.stdout ?? '').trim()
}

fs.mkdirSync(logDir, { recursive: true })

const startedAt = new Date().toISOString()
const commit = gitValue(['rev-parse', 'HEAD'])
const branch = gitValue(['rev-parse', '--abbrev-ref', 'HEAD'])
const status = gitValue(['status', '--porcelain'])

const results = []
for (const entry of commands) {
  process.stderr.write(
    `[phase10-baseline] running ${entry.id}: ${entry.command}\n`
  )
  const result = run(entry.command)
  const log = [
    `$ ${entry.command}`,
    `# exitCode=${result.exitCode} durationMs=${result.durationMs}`,
    '',
    result.stdout,
    result.stderr
  ].join('\n')
  const logFile = path.join(logDir, `${slug(entry.id)}.log`)
  fs.writeFileSync(logFile, log)
  const record = {
    id: entry.id,
    command: entry.command,
    status: result.exitCode === 0 ? 'PASS' : 'FAIL',
    exitCode: result.exitCode,
    signal: result.signal,
    durationMs: result.durationMs,
    log: path.relative(root, logFile),
    logSha256: sha256(log),
    error: result.error,
    summary: parseTestCounts(result.stdout + result.stderr)
  }
  results.push(record)
}

const postgresConfigured = Boolean(process.env.TEST_DATABASE_URL)
const artifact = {
  schemaVersion: 1,
  phase: '10.0',
  kind: 'baseline',
  startedAt,
  finishedAt: new Date().toISOString(),
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    ci: process.env.CI ?? null,
    testDatabaseConfigured: postgresConfigured
  },
  repository: {
    commit,
    branch,
    worktreeDirty: status.length > 0
  },
  commands: results,
  coverage: parseCoverageSummary(),
  notes: [
    'Baseline records the pre-Phase-10 state; it is evidence, not certification.',
    postgresConfigured
      ? 'TEST_DATABASE_URL was configured for this run.'
      : 'TEST_DATABASE_URL was not configured; PostgreSQL gate is NOT_EXECUTED, not PASS.'
  ]
}

fs.writeFileSync(
  path.join(outDir, 'baseline.json'),
  `${JSON.stringify(artifact, null, 2)}\n`
)

const failed = results.filter((r) => r.status === 'FAIL')
process.stderr.write(
  `[phase10-baseline] wrote certification/baseline.json; pass=${results.length - failed.length} fail=${failed.length}\n`
)
for (const record of results) {
  process.stderr.write(
    `[phase10-baseline] ${record.status.padEnd(4)} ${record.id} (exit ${record.exitCode}, ${record.durationMs}ms)\n`
  )
}
