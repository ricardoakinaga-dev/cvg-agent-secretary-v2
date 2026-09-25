#!/usr/bin/env node
import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Pool, Client } from 'pg'
import {
  runPostgresMigrations,
  TenantScopedPostgresRuntimeRepository
} from '@cvg/persistence'
import { createControlledWorker } from '../apps/worker/src/controlled-worker.ts'
import { percentile } from './lib/aud20-19-qualification.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = new Map(
  process.argv.slice(2).map((argument) => {
    const [key, value] = argument.replace(/^--/, '').split('=')
    return [key ?? '', value ?? 'true']
  })
)
const databaseUrl = process.env.TEST_DATABASE_URL
const events = Number(args.get('events') ?? 250)
const concurrency = Number(args.get('concurrency') ?? 4)
const output =
  args.get('out') ??
  'docs/04_audit/evidence/AUD20/AUD20-19-postgres-load-report.json'
const tenantId = 'tenant_00000000-0000-4000-8000-000000000219'
const correlationId = 'corr_00000000-0000-4000-8000-000000000219'

if (!databaseUrl) throw new Error('TEST_DATABASE_URL is required')
if (!Number.isInteger(events) || events < 100 || events > 5000) {
  throw new Error('events must be an integer between 100 and 5000')
}
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 16) {
  throw new Error('concurrency must be an integer between 1 and 16')
}

const schema = `aud20_19_${Date.now()}_${randomBytes(3).toString('hex')}`
const applicationName = schema
const admin = new Client({ connectionString: databaseUrl })
let pool: Pool | undefined
let poolErrors = 0

async function main(): Promise<void> {
  await admin.connect()
  await runPostgresMigrations(admin, { schemaName: schema })
  pool = new Pool({
    connectionString: databaseUrl,
    max: concurrency + 2,
    options: `-c search_path=${schema}`,
    application_name: applicationName
  })
  pool.on('error', () => {
    poolErrors += 1
  })
  const repository = new TenantScopedPostgresRuntimeRepository(pool)
  const started = process.hrtime.bigint()
  for (let index = 0; index < events; index += 1) {
    await repository.enqueue({
      tenantId,
      type: 'inbound.process',
      payload: { synthetic: true, index },
      idempotencyKey: `aud20-19-${String(index).padStart(6, '0')}`,
      correlationId
    })
  }
  const latencies: number[] = []
  let processed = 0
  let errors = 0
  let retries = 0
  async function worker(index: number): Promise<void> {
    const controlledWorker = createControlledWorker({
      tenantId,
      workerId: `aud20-19-worker-${index}`,
      adapter: repository,
      handlers: {
        inboundProcess: async (event) => {
          retries += Math.max(0, event.attempts - 1)
          return { synthetic: true }
        },
        messageOutbound: async () => {
          throw new Error('message.outbound is outside this synthetic workload')
        }
      }
    })
    while (true) {
      const claimStarted = process.hrtime.bigint()
      try {
        const drained = await controlledWorker.drain(1)
        if (drained.processed === 0) return
        processed += drained.processed
        latencies.push(Number(process.hrtime.bigint() - claimStarted) / 1e6)
      } catch {
        errors += 1
        throw new Error('synthetic durable outbox processing failed')
      }
    }
  }
  await Promise.all(
    Array.from({ length: concurrency }, (_, index) => worker(index))
  )
  const totalMs = Number(process.hrtime.bigint() - started) / 1e6
  const backlogResult = await admin.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM ${schema}.outbox_events WHERE tenant_id = $1 AND status <> 'processed'`,
    [tenantId]
  )
  const backlog = Number(backlogResult.rows[0]?.count ?? 0)
  await pool.query('SELECT 1')
  const terminated = await admin.query<{ terminated: boolean }>(
    `SELECT pg_terminate_backend(pid) AS terminated
       FROM pg_stat_activity
      WHERE application_name = $1 AND pid <> pg_backend_pid()`,
    [applicationName]
  )
  const recoveryTerminationCount = terminated.rows.filter(
    (row) => row.terminated
  ).length
  if (recoveryTerminationCount < 1) {
    throw new Error('no synthetic workload connection was terminated')
  }
  const recoveryStarted = process.hrtime.bigint()
  let recoveryQueryFailures = 0
  let recovered = false
  for (let attempt = 0; attempt < concurrency + 2; attempt += 1) {
    try {
      await pool.query('SELECT 1')
      recovered = true
      break
    } catch (error) {
      const code = (error as { code?: string }).code
      if (code !== '57P01' && code !== 'ECONNRESET') throw error
      recoveryQueryFailures += 1
    }
  }
  if (!recovered)
    throw new Error('pool did not recover after terminated clients')
  const recoveryMs = Number(process.hrtime.bigint() - recoveryStarted) / 1e6
  await pool.end()
  pool = undefined
  await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
  const cleanupResult = await admin.query<{ count: string }>(
    'SELECT count(*)::text AS count FROM pg_namespace WHERE nspname = $1',
    [schema]
  )
  const cleanup = Number(cleanupResult.rows[0]?.count ?? 1) === 0
  await admin.end()
  const report = {
    schemaVersion: 1,
    kind: 'aud20-19-postgres-durable-load',
    synthetic: true,
    claim: 'LOCAL_POSTGRES_DURABLE',
    generatedAt: new Date().toISOString(),
    configuration: { events, concurrency, bounded: true },
    processed,
    throughputPerSecond: events / (totalMs / 1000),
    latencyMs: {
      p50: percentile(latencies, 0.5),
      p95: percentile(latencies, 0.95),
      p99: percentile(latencies, 0.99)
    },
    errors,
    retries,
    backlog,
    recoveryMs,
    recoveryTerminationCount,
    recoveryPoolErrors: poolErrors,
    recoveryQueryFailures,
    cleanup: cleanup ? 'PASS' : 'FAIL',
    releaseEligible: false,
    limitations: [
      'single local machine',
      'synthetic outbox workload',
      'not a production capacity claim'
    ]
  }
  const absolute = path.resolve(root, output)
  fs.mkdirSync(path.dirname(absolute), { recursive: true })
  fs.writeFileSync(absolute, `${JSON.stringify(report, null, 2)}\n`)
  if (processed !== events || errors !== 0 || backlog !== 0 || !cleanup)
    process.exitCode = 1
}

main().catch(async (error: unknown) => {
  await pool?.end().catch(() => undefined)
  await admin
    .query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
    .catch(() => undefined)
  await admin.end().catch(() => undefined)
  console.error(error instanceof Error ? error.message : 'postgres load failed')
  process.exitCode = 1
})
