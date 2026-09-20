#!/usr/bin/env node
/**
 * AUD19-11 — build/container/migration/policy/SBOM digests.
 *
 * Computes the release-manifest inputs that were previously `null`: local image
 * digests (api/worker), container configuration digests, a canonical digest of
 * the orchestrator migrations 0019..0026, a digest of the policy contracts and
 * the SBOM digest. Every field that cannot be measured is recorded as
 * `NOT_RUN` with the real reason instead of an invented value.
 *
 * Report: docs/04_audit/evidence/AUD19/AUD19-11-digests.json
 * Build images first:
 *   docker build --target api -t cvg-aud19-api:local .
 *   docker build --target worker -t cvg-aud19-worker:local .
 * SBOM first: npm run sbom
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const reportPath = path.join(
  root,
  'docs/04_audit/evidence/AUD19/AUD19-11-digests.json'
)
const IMAGES = { api: 'cvg-aud19-api:local', worker: 'cvg-aud19-worker:local' }
const MIGRATION_RANGE = /^00(19|2[0-6])_/

const sha256 = (value) => createHash('sha256').update(value).digest('hex')

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options
  }).trim()
}

function notRun(reason) {
  return { status: 'NOT_RUN', reason }
}

function tryRun(command, args) {
  try {
    return { status: 'PASS', value: run(command, args) }
  } catch (error) {
    return notRun(`${command} failed: ${error.message.split('\n')[0]}`)
  }
}

function lastJsonLine(text) {
  const lines = String(text ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('{'))
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      return JSON.parse(lines[index])
    } catch {
      // Keep scanning; npm wrappers may print non-JSON noise first.
    }
  }
  return null
}

function lastLine(text) {
  const lines = String(text ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  return lines.length > 0 ? lines[lines.length - 1] : null
}

/**
 * Runs a local scan and records the real exit code. A failing scan is data,
 * not an exception: the report keeps the evidence and never invents a pass.
 */
function runScan(command, args) {
  const label = [command, ...args].join(' ')
  try {
    const stdout = execFileSync(command, args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    })
    return {
      command: label,
      exitCode: 0,
      result: lastJsonLine(stdout),
      summary: lastLine(stdout)
    }
  } catch (error) {
    const stdout = typeof error.stdout === 'string' ? error.stdout : ''
    return {
      command: label,
      exitCode: typeof error.status === 'number' ? error.status : null,
      error: String(error.message).split('\n')[0],
      result: lastJsonLine(stdout),
      summary: lastLine(stdout)
    }
  }
}

function digestFileSet(relativePaths) {
  const files = relativePaths
    .map((relative) => {
      const absolute = path.join(root, relative)
      return {
        path: relative,
        sha256: sha256(fs.readFileSync(absolute))
      }
    })
    .sort((left, right) => left.path.localeCompare(right.path))
  const digest = sha256(
    files.map((file) => `${file.path}:${file.sha256}\n`).join('')
  )
  return { digest, files }
}

function collectMigrations() {
  const migrationsDir = path.join(root, 'packages/persistence/migrations')
  const names = fs
    .readdirSync(migrationsDir)
    .filter((name) => MIGRATION_RANGE.test(name))
    .sort()
  if (names.length === 0) {
    return notRun('no migrations matched 0019..0026')
  }
  return {
    status: 'PASS',
    algorithm: 'sha256(file:sha256 sorted by path)',
    range: '0019..0026',
    count: names.length,
    ...digestFileSet(
      names.map((name) => `packages/persistence/migrations/${name}`)
    )
  }
}

function collectPolicy() {
  const trees = ['packages/policy/src', 'packages/policy-engine/src']
  const relativePaths = trees.flatMap((tree) => {
    const absolute = path.join(root, tree)
    if (!fs.existsSync(absolute)) return []
    return fs
      .readdirSync(absolute, { recursive: true })
      .map((entry) => `${tree}/${String(entry)}`)
      .filter((entry) => entry.endsWith('.ts') && !entry.includes('__tests__'))
  })
  relativePaths.push('scripts/lib/production-preflight-core.mjs')
  if (relativePaths.length === 0) {
    return notRun('no policy contract sources found')
  }
  return {
    status: 'PASS',
    algorithm: 'sha256(file:sha256 sorted by path)',
    scope: [
      'policy-engine + policy runtime sources (excluding tests)',
      'production bootstrap preflight contract (governance/deny-by-default checks)'
    ],
    ...digestFileSet(relativePaths)
  }
}

function collectSbom() {
  const sbomPath = path.join(root, 'certification/sbom.cyclonedx.json')
  if (!fs.existsSync(sbomPath)) {
    return notRun(
      'certification/sbom.cyclonedx.json is missing; run npm run sbom'
    )
  }
  const raw = fs.readFileSync(sbomPath)
  let bom = {}
  try {
    bom = JSON.parse(raw.toString('utf8'))
  } catch {
    return notRun('certification/sbom.cyclonedx.json is not valid JSON')
  }
  return {
    status: 'PASS',
    path: 'certification/sbom.cyclonedx.json',
    digest: sha256(raw),
    bytes: raw.length,
    componentCount: Array.isArray(bom.components)
      ? bom.components.length
      : null,
    generatedAt: bom.metadata?.timestamp ?? null
  }
}

function imageInfo(tag) {
  const inspect = tryRun('docker', [
    'image',
    'inspect',
    tag,
    '--format',
    '{{.Id}}|{{.Created}}|{{.Config.User}}|{{.Architecture}}|{{.Os}}'
  ])
  if (inspect.status !== 'PASS') {
    return notRun(`image ${tag} is not available locally (build it first)`)
  }
  const [id, created, user, architecture, os] = inspect.value.split('|')
  const digests = tryRun('docker', [
    'image',
    'inspect',
    tag,
    '--format',
    '{{json .RepoDigests}}'
  ])
  return {
    status: 'PASS',
    tag,
    id,
    created,
    user,
    architecture,
    os,
    repoDigests: digests.status === 'PASS' ? JSON.parse(digests.value) : null,
    note: 'id is the content-addressed manifest image ID (local, never pushed)'
  }
}

function containerInfo(tag) {
  const created = tryRun('docker', ['create', tag])
  if (created.status !== 'PASS') {
    return notRun(
      `could not create a container from ${tag}: ${created.reason ?? 'unknown'}`
    )
  }
  const containerId = created.value
  try {
    const rawConfig = run('docker', [
      'container',
      'inspect',
      containerId,
      '--format',
      '{{json .Config}}'
    ])
    const config = JSON.parse(rawConfig)
    const imageId = run('docker', [
      'container',
      'inspect',
      containerId,
      '--format',
      '{{.Image}}'
    ])
    return {
      status: 'PASS',
      image: tag,
      imageId,
      configDigest: sha256(rawConfig),
      user: config.User ?? null,
      cmd: Array.isArray(config.Cmd) ? config.Cmd : null,
      entrypoint: Array.isArray(config.Entrypoint) ? config.Entrypoint : null,
      healthcheck: config.Healthcheck?.Test ?? null,
      envKeys: Array.isArray(config.Env)
        ? config.Env.map((entry) => String(entry).split('=')[0]).sort()
        : []
    }
  } finally {
    try {
      run('docker', ['rm', '-f', containerId])
    } catch {
      // A leaked stopped container is harmless for this read-only report.
    }
  }
}

function gitInfo() {
  const head = tryRun('git', ['rev-parse', 'HEAD'])
  const status = tryRun('git', ['status', '--porcelain'])
  return {
    head: head.status === 'PASS' ? head.value : null,
    dirtyFiles:
      status.status === 'PASS' && status.value
        ? status.value.split('\n').length
        : 0,
    note: 'informational only; the candidate identity is owned by AUD19-12'
  }
}

const report = {
  schemaVersion: 1,
  kind: 'aud19-11-digests',
  task: 'AUD19-11',
  observedAt: new Date().toISOString(),
  scope: 'CONTROLLED_LOCAL',
  production: 'NO_GO',
  toolchain: {
    node: process.version,
    npm: tryRun('npm', ['--version']).value ?? null,
    docker:
      tryRun('docker', ['version', '--format', '{{.Server.Version}}']).value ??
      null
  },
  source: gitInfo(),
  build: {
    api: imageInfo(IMAGES.api),
    worker: imageInfo(IMAGES.worker)
  },
  container: {
    api: containerInfo(IMAGES.api),
    worker: containerInfo(IMAGES.worker)
  },
  migration: collectMigrations(),
  policy: collectPolicy(),
  scans: {
    note: 'Local scans re-executed by this script; exit codes are authoritative, result is the last JSON line emitted by the scan.',
    sbom: runScan('npm', ['run', 'sbom']),
    licenses: runScan('npm', ['run', 'licenses:check']),
    securityAudit: runScan('npm', ['run', 'audit:security'])
  },
  sbom: collectSbom(),
  releaseManifestMapping: {
    buildId: 'build.api.id (api image) / build.worker.id (worker image)',
    containerDigest:
      'container.api.configDigest / container.worker.configDigest',
    migrationDigest: 'migration.digest (0019..0026)',
    policyVersion: 'policy.digest (policy contracts)',
    sbomDigest: 'sbom.digest (certification/sbom.cyclonedx.json)',
    note: 'Integration into certification/phase11/release-manifest.json belongs to AUD19-12; this report never writes certification artifacts.'
  }
}

fs.mkdirSync(path.dirname(reportPath), { recursive: true })
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)
process.stdout.write(
  `${JSON.stringify({
    event: 'aud19-11.digests_written',
    report: path.relative(root, reportPath),
    buildApi: report.build.api.status,
    buildWorker: report.build.worker.status,
    containerApi: report.container.api.status,
    containerWorker: report.container.worker.status,
    migration: report.migration.status,
    policy: report.policy.status,
    sbom: report.sbom.status
  })}\n`
)
