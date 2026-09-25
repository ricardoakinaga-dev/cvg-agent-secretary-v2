#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPhase11Candidate } from './lib/phase11-rules.mjs'
import {
  environmentFingerprint,
  validateHumanAccessibilityEvidence,
  validateProfileReport,
  validateQualificationInput
} from './lib/aud20-19-qualification.mjs'
import { extractSkipsFromVitestJson } from './lib/skip-policy.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const option = (name, fallback) => {
  const prefix = `--${name}=`
  return (
    args.find((value) => value.startsWith(prefix))?.slice(prefix.length) ??
    fallback
  )
}
const profileName = option('profile', 'memory_smoke')
const events = Number(option('events', '250'))
const concurrency = Number(option('concurrency', '4'))
const durationMs = Number(option('duration-ms', '30000'))
const output = option(
  'out',
  `docs/04_audit/evidence/AUD20/AUD20-19-${profileName}-report.json`
)
const manifest = JSON.parse(
  fs.readFileSync(
    path.join(root, 'docs/03_build/tracking/aud20_19_profiles.json'),
    'utf8'
  )
)
const candidate = buildPhase11Candidate(root)
if (profileName === 'human_a11y') {
  const evidencePath = path.join(
    root,
    option(
      'human-evidence',
      'docs/04_audit/evidence/AUD20/AUD20-19-human-a11y-template.json'
    )
  )
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'))
  const verification = validateHumanAccessibilityEvidence(evidence)
  const inputFailures = validateQualificationInput(
    {
      profile: profileName,
      candidateId: candidate.candidateId,
      events,
      concurrency,
      durationMs,
      databaseAvailable: Boolean(process.env.TEST_DATABASE_URL),
      humanEvidence: false
    },
    manifest
  ).filter((failure) => failure !== 'human_evidence_required')
  const report = {
    schemaVersion: 1,
    kind: 'aud20-19-qualification-report',
    profile: profileName,
    candidateId: candidate.candidateId,
    claim: manifest.profiles[profileName].claim,
    environment: environmentFingerprint(),
    status: verification.status,
    failures: [...inputFailures, ...verification.failures],
    blockers:
      verification.status === 'PENDING'
        ? ['human_evidence_required']
        : verification.status === 'READY_FOR_HUMAN_REVIEW'
          ? ['human_approval_required']
          : [],
    releaseEligible: false
  }
  write(report)
  process.exitCode =
    report.status === 'PASS' && report.failures.length === 0 ? 0 : 2
} else {
  const inputFailures = validateQualificationInput(
    {
      profile: profileName,
      candidateId: candidate.candidateId,
      events,
      concurrency,
      durationMs,
      databaseAvailable: Boolean(process.env.TEST_DATABASE_URL),
      humanEvidence: false
    },
    manifest
  )
  if (inputFailures.length > 0) {
    write({
      schemaVersion: 1,
      kind: 'aud20-19-qualification-report',
      profile: profileName,
      candidateId: candidate.candidateId,
      status: 'FAIL',
      failures: inputFailures,
      releaseEligible: false
    })
    process.exitCode = 1
  } else {
    const result =
      profileName === 'memory_smoke' ? runMemoryProfile() : runPostgresProfile()
    const report = {
      schemaVersion: 1,
      kind: 'aud20-19-qualification-report',
      profile: profileName,
      candidateId: candidate.candidateId,
      claim: manifest.profiles[profileName].claim,
      generatedAt: new Date().toISOString(),
      environment: environmentFingerprint(),
      configuration: { events, concurrency, durationMs },
      commands: result.commands,
      skips: result.skips,
      metrics: result.metrics,
      limitations:
        profileName === 'memory_smoke'
          ? ['in-memory smoke only', 'not durable', 'not a production claim']
          : [
              'single local machine',
              'synthetic data',
              'not a production claim'
            ],
      releaseEligible: false
    }
    const failures = validateProfileReport(
      report,
      manifest,
      candidate.candidateId,
      verifyArtifact
    )
    const artifact = {
      ...report,
      status: failures.length === 0 ? 'PASS' : 'FAIL',
      failures
    }
    write(artifact)
    if (failures.length > 0) process.exitCode = 1
  }
}

function execute(id, command, commandArgs, env = process.env) {
  const started = Date.now()
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    env: { ...env, CI: env.CI ?? 'true' },
    encoding: 'utf8',
    timeout: durationMs,
    maxBuffer: 64 * 1024 * 1024
  })
  return {
    id,
    status: result.status === 0 ? 'PASS' : 'FAIL',
    exitCode: result.status ?? 1,
    durationMs: Date.now() - started,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? ''
  }
}

function runMemoryProfile() {
  const command = execute('load_memory', 'npx', [
    'tsx',
    'scripts/phase10-load.ts',
    `--events=${events}`
  ])
  const metrics = JSON.parse(command.stdout.trim().split('\n').at(-1) ?? '{}')
  return {
    commands: [stripOutput(command)],
    skips: { total: 0, required: 0, optional: 0, unknown: 0 },
    metrics
  }
}

function runPostgresProfile() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'aud20-19-'))
  try {
    const vitestReport = path.join(temp, 'chaos.json')
    const chaos = execute('chaos_postgres', 'npx', [
      'vitest',
      'run',
      'packages/chaos/src/__tests__/chaos-postgres.test.ts',
      '--no-file-parallelism',
      '--maxWorkers=1',
      '--reporter=json',
      `--outputFile=${vitestReport}`
    ])
    const safetyReport = path.join(temp, 'safety.json')
    const safety = execute('safety_postgres', 'npx', [
      'vitest',
      'run',
      'packages/persistence/src/__tests__/tenant-isolation.test.ts',
      'packages/persistence/src/__tests__/outbox-durability.test.ts',
      'packages/persistence/src/__tests__/platform-approval-postgres.test.ts',
      'apps/api/src/__tests__/operator-replay-guard.test.ts',
      '--no-file-parallelism',
      '--maxWorkers=1',
      '--reporter=json',
      `--outputFile=${safetyReport}`
    ])
    const vitestReports = [vitestReport, safetyReport].map((reportPath) =>
      fs.existsSync(reportPath)
        ? JSON.parse(fs.readFileSync(reportPath, 'utf8'))
        : null
    )
    const skips = vitestReports.flatMap((report, index) =>
      report
        ? extractSkipsFromVitestJson(report)
        : [
            {
              file:
                index === 0 ? 'missing-chaos-report' : 'missing-safety-report',
              name: 'missing report',
              status: 'unknown'
            }
          ]
    )
    const reportedPending = vitestReports.reduce(
      (total, report) => total + Number(report?.numPendingTests ?? 0),
      0
    )
    const hiddenSkips = Math.max(0, reportedPending - skips.length)
    const loadReport = path.join(temp, 'load.json')
    const load = execute('load_postgres', 'npx', [
      'tsx',
      'scripts/aud20-19-postgres-load.ts',
      `--events=${events}`,
      `--concurrency=${concurrency}`,
      `--out=${loadReport}`
    ])
    const metrics = fs.existsSync(loadReport)
      ? JSON.parse(fs.readFileSync(loadReport, 'utf8'))
      : {}
    return {
      commands: [
        stripOutput(chaos, vitestReport),
        stripOutput(safety, safetyReport),
        stripOutput(load, loadReport)
      ],
      skips: {
        total: skips.length + hiddenSkips,
        required: skips.filter((skip) => skip.status !== 'unknown').length,
        optional: 0,
        unknown:
          skips.filter((skip) => skip.status === 'unknown').length + hiddenSkips
      },
      metrics
    }
  } finally {
    fs.rmSync(temp, { recursive: true, force: true })
  }
}

function stripOutput(command, testReportPath = null) {
  const artifactDirectory = path.join(
    root,
    'docs/04_audit/evidence/AUD20/AUD20-19-raw',
    candidate.candidateId
  )
  fs.mkdirSync(artifactDirectory, { recursive: true })
  const prefix = `${profileName}-${command.id}`
  const stdoutArtifact = path.relative(
    root,
    path.join(artifactDirectory, `${prefix}.stdout.txt`)
  )
  const stderrArtifact = path.relative(
    root,
    path.join(artifactDirectory, `${prefix}.stderr.txt`)
  )
  fs.writeFileSync(path.join(root, stdoutArtifact), command.stdout)
  fs.writeFileSync(path.join(root, stderrArtifact), command.stderr)
  const record = {
    id: command.id,
    status: command.status,
    exitCode: command.exitCode,
    durationMs: command.durationMs,
    stdoutArtifact,
    stderrArtifact,
    stdoutSha256: createHash('sha256').update(command.stdout).digest('hex'),
    stderrSha256: createHash('sha256').update(command.stderr).digest('hex')
  }
  if (testReportPath && fs.existsSync(testReportPath)) {
    const testReportArtifact = path.relative(
      root,
      path.join(artifactDirectory, `${prefix}.report.json`)
    )
    const bytes = fs.readFileSync(testReportPath)
    fs.writeFileSync(path.join(root, testReportArtifact), bytes)
    record.testReportArtifact = testReportArtifact
    record.testReportSha256 = createHash('sha256').update(bytes).digest('hex')
  }
  return record
}

function verifyArtifact(relativePath, expectedSha256) {
  if (!relativePath || !/^[a-f0-9]{64}$/.test(String(expectedSha256 ?? '')))
    return false
  const absolute = path.resolve(root, relativePath)
  const evidenceRoot = path.resolve(
    root,
    'docs/04_audit/evidence/AUD20/AUD20-19-raw'
  )
  if (
    !absolute.startsWith(`${evidenceRoot}${path.sep}`) ||
    !fs.existsSync(absolute)
  ) {
    return false
  }
  return (
    createHash('sha256').update(fs.readFileSync(absolute)).digest('hex') ===
    expectedSha256
  )
}

function write(value) {
  const absolute = path.resolve(root, output)
  fs.mkdirSync(path.dirname(absolute), { recursive: true })
  fs.writeFileSync(absolute, `${JSON.stringify(value, null, 2)}\n`)
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
}
