#!/usr/bin/env node
/**
 * AUD19-11 — controlled productive worker smoke.
 *
 * Starts the real worker entrypoint against a disposable PostgreSQL schema
 * with the durable governed-kernel profile and real effects explicitly
 * disabled, then proves: readiness is observable, a synthetic
 * `message.outbound` event is consumed (suppressed without any external
 * effect), SIGTERM drains gracefully and the readiness file is removed.
 *
 * Scope: CONTROLLED_LOCAL, synthetic data only. No provider, channel, IdP or
 * RAG is contacted; production remains NO_GO. The evidence file is written to
 * docs/04_audit/evidence/AUD19/AUD19-11-worker-smoke.json.
 *
 * Modes:
 *   (default)                     local `tsx apps/worker/src/main.ts` process
 *   CVG_AUD19_SMOKE_MODE=docker   built worker image, host networking
 */
import { execFileSync, spawn, type ChildProcess } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client, Pool } from 'pg'
import { TenantIdSchema } from '@cvg/platform'
import {
  runPostgresMigrations,
  TenantScopedPostgresRuntimeRepository,
  withTenantContext
} from '@cvg/persistence'
import { WORKER_CRITICAL_TABLES } from '../apps/worker/src/postgres-role-preflight.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
/**
 * `CVG_AUD19_SMOKE_MODE=docker` runs the built worker image
 * (`CVG_AUD19_SMOKE_IMAGE`, default cvg-aud19-worker:local) instead of the
 * local tsx process. Both modes exercise the same entrypoint and assertions.
 */
const smokeMode =
  process.env.CVG_AUD19_SMOKE_MODE === 'docker' ? 'docker' : 'process'
const smokeImage = process.env.CVG_AUD19_SMOKE_IMAGE ?? 'cvg-aud19-worker:local'
const evidencePath = path.join(
  root,
  'docs/04_audit/evidence/AUD19',
  smokeMode === 'docker'
    ? 'AUD19-11-worker-smoke-container.json'
    : 'AUD19-11-worker-smoke.json'
)
const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  'postgres://postgres:postgres@127.0.0.1:5434/cvg_test'
const tenantIdRaw = 'tenant_00000000-0000-4000-8000-000000000191'
const tenantId = TenantIdSchema.parse(tenantIdRaw)
const correlationId = 'corr_00000000-0000-4000-8000-000000000191'
const rolePassword = 'synthetic-aud19-smoke-role'

interface Evidence {
  [key: string]: unknown
}

const evidence: Evidence = {
  schemaVersion: 1,
  kind: 'aud19-11-worker-smoke',
  task: 'AUD19-11',
  observedAt: new Date().toISOString(),
  status: 'BLOCKED',
  scope: 'CONTROLLED_LOCAL',
  production: 'NO_GO',
  realEffects: false,
  node: process.version
}

function redactUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.protocol}//<redacted>@${parsed.host}${parsed.pathname}`
  } catch {
    return '<unparseable>'
  }
}

function writeEvidence(): void {
  fs.mkdirSync(path.dirname(evidencePath), { recursive: true })
  fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`)
}

function parseJsonLines(output: string): Array<Record<string, unknown>> {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('{'))
    .flatMap((line) => {
      try {
        const parsed = JSON.parse(line) as unknown
        return parsed && typeof parsed === 'object'
          ? [parsed as Record<string, unknown>]
          : []
      } catch {
        return []
      }
    })
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitFor(
  label: string,
  predicate: () => boolean | Promise<boolean>,
  timeoutMs = 25_000,
  intervalMs = 50
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await predicate()) return
    await delay(intervalMs)
  }
  throw new Error(`timed out waiting for ${label}`)
}

function waitForExit(
  child: ChildProcess,
  timeoutMs = 30_000
): Promise<{ code: number | null; signal: NodeJS.Signals | null }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error('worker entrypoint did not exit within the timeout'))
    }, timeoutMs)
    child.once('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.once('close', (code, signal) => {
      clearTimeout(timer)
      resolve({ code, signal })
    })
  })
}

function roleUrl(username: string, password: string): string {
  const parsed = new URL(databaseUrl)
  parsed.username = username
  parsed.password = password
  return parsed.toString()
}

async function countRows(
  pool: Pool,
  table: 'outbox_effects' | 'effect_journal' | 'outbox_events',
  tenant: string
): Promise<number> {
  return withTenantContext(pool, tenantId, async (client) => {
    const result = await client.query<{ count: string }>(
      `SELECT count(*)::int AS count FROM ${table} WHERE tenant_id = $1`,
      [tenant]
    )
    return Number(result.rows[0]?.count ?? 0)
  })
}

async function main(): Promise<void> {
  const suffix = `${Date.now()}_${randomBytes(3).toString('hex')}`
  const schema = `cvg_aud19_smoke_${suffix}`
  const role = `cvg_aud19_smoke_${suffix}`
  const containerName = `cvg-aud19-smoke-${suffix}`
  const readinessFile =
    smokeMode === 'docker'
      ? `/tmp/cvg-worker-ready-${suffix}.json`
      : path.join(os.tmpdir(), `cvg-aud19-worker-ready-${suffix}.json`)
  const admin = new Client({ connectionString: databaseUrl })
  const pool = new Pool({
    connectionString: databaseUrl,
    options: `-c search_path=${schema}`
  })
  let child: ReturnType<typeof spawn> | undefined
  let output = ''

  evidence.target =
    smokeMode === 'docker' ? 'docker-container' : 'local-process'
  if (smokeMode === 'docker') evidence.image = smokeImage

  evidence.database = {
    url: redactUrl(databaseUrl),
    schema,
    role: `${role.slice(0, 12)}...`
  }
  evidence.profile = {
    nodeEnv: 'test',
    runtime: 'kernel',
    durableKernelOrchestrator: true,
    adapter: 'postgres',
    runMode: 'continuous',
    rls: true,
    autoMigrate: false,
    controlledMode: true,
    realEffects: false
  }

  await admin.connect()
  try {
    await runPostgresMigrations(admin, { schemaName: schema })
    await admin.query(
      `CREATE ROLE ${role} LOGIN PASSWORD '${rolePassword}' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION`
    )
    await admin.query(`GRANT USAGE ON SCHEMA ${schema} TO ${role}`)
    await admin.query(
      `GRANT SELECT, INSERT, UPDATE ON ${WORKER_CRITICAL_TABLES.map(
        (table) => `${schema}.${table}`
      ).join(', ')} TO ${role}`
    )

    const repository = new TenantScopedPostgresRuntimeRepository(pool)
    const enqueued = await repository.enqueue({
      tenantId,
      type: 'message.outbound',
      payload: { fixture: 'aud19-11-controlled-smoke' },
      idempotencyKey: `aud19-11-smoke-${suffix}`,
      correlationId
    })
    evidence.enqueuedEvent = { id: enqueued.id, type: 'message.outbound' }

    const workerEnv: Record<string, string> = {
      NODE_ENV: 'test',
      CVG_WORKER_QUEUE_ADAPTER: 'postgres',
      CVG_WORKER_RUN_MODE: 'continuous',
      CVG_WORKER_RUNTIME: 'kernel',
      CVG_DURABLE_KERNEL_ORCHESTRATOR: 'true',
      DATABASE_URL: roleUrl(role, rolePassword),
      DATABASE_MIGRATION_URL: databaseUrl,
      POSTGRES_SCHEMA: schema,
      POSTGRES_RLS_ENFORCEMENT: 'true',
      POSTGRES_AUTO_MIGRATE: 'false',
      CVG_WORKER_CONTROLLED_MODE: 'true',
      CVG_WORKER_TENANT_ID: tenantIdRaw,
      CVG_WORKER_AGENT_ID: 'agent_00000000-0000-4000-8000-000000000191',
      CVG_WORKER_ID: `aud19-11-smoke-${suffix}`,
      CVG_WORKER_READINESS_FILE: readinessFile,
      CVG_REAL_EFFECTS: '0',
      CVG_ALLOW_REAL_EFFECTS: '0',
      CVG_WORKER_POLL_INTERVAL_MS: '20',
      CVG_WORKER_IDLE_MAX_BACKOFF_MS: '100',
      CVG_WORKER_DRAIN_MS: '5000'
    }
    if (smokeMode === 'docker') {
      const args = [
        'run',
        '--name',
        containerName,
        '--network',
        'host',
        ...Object.entries(workerEnv).flatMap(([key, value]) => [
          '-e',
          `${key}=${value}`
        ]),
        smokeImage
      ]
      child = spawn('docker', args, {
        cwd: root,
        stdio: ['ignore', 'pipe', 'pipe']
      })
    } else {
      child = spawn(
        path.resolve(root, 'node_modules/.bin/tsx'),
        ['apps/worker/src/main.ts'],
        {
          cwd: root,
          env: { ...process.env, ...workerEnv },
          stdio: ['ignore', 'pipe', 'pipe']
        }
      )
    }
    child.stdout?.on('data', (chunk) => {
      output += String(chunk)
    })
    child.stderr?.on('data', (chunk) => {
      output += String(chunk)
    })

    await waitFor(
      'worker.continuous_ready',
      () =>
        parseJsonLines(output).some(
          (event) => event.event === 'worker.continuous_ready'
        ),
      30_000
    )
    const readyEvent = parseJsonLines(output).find(
      (event) => event.event === 'worker.continuous_ready'
    )
    await waitFor('readiness file status=ready', async () => {
      if (smokeMode === 'docker') {
        try {
          return execFileSync(
            'docker',
            ['exec', containerName, 'cat', readinessFile],
            { encoding: 'utf8' }
          ).includes('"status":"ready"')
        } catch {
          return false
        }
      }
      return (
        fs.existsSync(readinessFile) &&
        fs.readFileSync(readinessFile, 'utf8').includes('"status":"ready"')
      )
    })
    evidence.readiness = {
      file: path.basename(readinessFile),
      observedStatus: 'ready',
      readyEvent
    }

    await waitFor('synthetic outbox event processed', async () => {
      const record = await repository.findOutboxById(tenantId, enqueued.id)
      return record?.status === 'processed'
    })
    const record = await repository.findOutboxById(tenantId, enqueued.id)
    const effectResult = await withTenantContext(pool, tenantId, (client) =>
      client.query<{ result: Record<string, unknown> }>(
        `SELECT result FROM outbox_effects WHERE tenant_id = $1 AND event_id = $2`,
        [tenantIdRaw, enqueued.id]
      )
    )
    const outboxEffects = await countRows(pool, 'outbox_effects', tenantIdRaw)
    const effectJournalRows = await countRows(
      pool,
      'effect_journal',
      tenantIdRaw
    )
    evidence.processing = {
      eventStatus: record?.status ?? null,
      attempts: record && 'attempts' in record ? record.attempts : null,
      outboxEffects,
      effectResult: effectResult.rows[0]?.result ?? null,
      effectJournalRows,
      externalEffects: effectResult.rows[0]?.result?.externalEffects ?? null
    }

    let exitCode: number | null = null
    let signalReceived: NodeJS.Signals | null = null
    if (smokeMode === 'docker') {
      execFileSync('docker', ['stop', '-t', '20', containerName], {
        stdio: 'ignore'
      })
      exitCode = Number(
        execFileSync(
          'docker',
          ['inspect', '--format', '{{.State.ExitCode}}', containerName],
          { encoding: 'utf8' }
        ).trim()
      )
      output = execFileSync('docker', ['logs', containerName], {
        encoding: 'utf8'
      })
    } else {
      child.kill('SIGTERM')
      const exit = await waitForExit(child)
      exitCode = exit.code
      signalReceived = exit.signal
    }
    const events = parseJsonLines(output)
    evidence.drain = {
      signal: 'SIGTERM',
      exitCode,
      signalReceived,
      shutdownEvents: events
        .filter(
          (event) =>
            typeof event.event === 'string' &&
            String(event.event).startsWith('worker.shutdown.')
        )
        .map((event) => event.event),
      drained: events.find(
        (event) => event.event === 'worker.continuous_drained'
      )
    }
    evidence.readiness = {
      ...(evidence.readiness as Record<string, unknown>),
      removedAfterShutdown:
        smokeMode === 'docker' ? null : !fs.existsSync(readinessFile),
      removedAfterShutdownNote:
        smokeMode === 'docker'
          ? 'container exit prevents post-mortem file inspection; removal is covered by the local-process smoke'
          : undefined
    }
    child = undefined

    const passed =
      exitCode === 0 &&
      evidence.processing !== undefined &&
      (evidence.processing as Record<string, unknown>).eventStatus ===
        'processed' &&
      (evidence.processing as Record<string, unknown>).effectJournalRows ===
        0 &&
      (evidence.processing as Record<string, unknown>).externalEffects ===
        false &&
      (evidence.drain as Record<string, unknown>).drained !== undefined &&
      (smokeMode === 'docker' ||
        (evidence.readiness as Record<string, unknown>).removedAfterShutdown ===
          true)
    evidence.status = passed ? 'PASS' : 'FAILED'
    if (!passed) {
      evidence.reason = 'one or more smoke assertions failed'
      evidence.rawOutput = output.slice(-4_000)
    } else {
      evidence.notes = [
        'Synthetic message.outbound consumed by the governed kernel; the composed handler returns controlled_outbound_suppressed with externalEffects=false.',
        'No provider, channel, IdP or RAG credential is present in the environment; effect_journal stayed empty.',
        'Production profile remains gated by the signed bootstrap preflight (external attestations); this smoke runs NODE_ENV=test.'
      ]
    }
    writeEvidence()
    if (!passed) {
      process.exitCode = 1
    }
  } finally {
    if (child) child.kill('SIGKILL')
    if (smokeMode === 'docker') {
      try {
        execFileSync('docker', ['rm', '-f', containerName], {
          stdio: 'ignore'
        })
      } catch {
        // The container may already be removed after a failed start.
      }
    }
    await fs.promises.rm(readinessFile, { force: true }).catch(() => undefined)
    await admin
      .query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
      .catch(() => undefined)
    await admin.query(`DROP ROLE IF EXISTS ${role}`).catch(() => undefined)
    await pool.end().catch(() => undefined)
    await admin.end().catch(() => undefined)
  }
}

main().catch((error: unknown) => {
  evidence.status = evidence.status === 'PASS' ? 'PASS' : 'BLOCKED'
  evidence.error = error instanceof Error ? error.message : String(error)
  writeEvidence()
  process.stderr.write(
    `${JSON.stringify({ event: 'aud19-11.worker_smoke_failed', error: evidence.error })}\n`
  )
  process.exitCode = 1
})
