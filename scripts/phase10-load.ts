/**
 * Phase 10 load smoke. Drives the in-memory durable outbox contract with a
 * configurable number of events and records throughput/latency percentiles.
 * Scope: modular-monolith contract measurement, not a production benchmark.
 *
 * Usage: npx tsx scripts/phase10-load.ts [--events=10000]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  InMemoryDatabase,
  OutboxRepository
} from '../packages/persistence/src/index.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = new Map(
  process.argv.slice(2).map((argument) => {
    const [key, value] = argument.replace(/^--/, '').split('=')
    return [key ?? '', value ?? 'true']
  })
)
const events = Math.min(
  100_000,
  Math.max(1_000, Number(args.get('events') ?? 10_000))
)
const tenantId = 'tenant_00000000-0000-4000-8000-000000000099'
const workers = 2

const db = new InMemoryDatabase()
const outbox = new OutboxRepository(db, { maxAttempts: 3, leaseMs: 30_000 })

async function main(): Promise<void> {
  const enqueueStarted = process.hrtime.bigint()
  for (let index = 0; index < events; index += 1) {
    outbox.enqueue({
      tenantId,
      type: index % 2 === 0 ? 'inbound.process' : 'message.outbound',
      payload: { index, synthetic: true },
      idempotencyKey: `load-${String(index).padStart(8, '0')}`,
      correlationId: 'corr_00000000-0000-4000-8000-000000000099'
    })
  }
  const enqueueMs = Number(process.hrtime.bigint() - enqueueStarted) / 1_000_000

  const latencies: number[] = []
  let processed = 0
  let duplicates = 0
  const seen = new Set<string>()
  const maxIterations = events * 2 + workers * 2

  async function worker(workerId: string): Promise<void> {
    for (let iteration = 0; iteration < maxIterations; iteration += 1) {
      const claimStarted = process.hrtime.bigint()
      const event = outbox.claimNext({ tenantId, workerId })
      if (!event) return
      if (seen.has(event.id)) duplicates += 1
      seen.add(event.id)
      await outbox.ack({
        tenantId,
        eventId: event.id,
        workerId,
        effect: () => ({ accepted: true })
      })
      processed += 1
      latencies.push(Number(process.hrtime.bigint() - claimStarted) / 1_000_000)
      if (processed >= events) return
    }
  }

  const drainStarted = process.hrtime.bigint()
  await Promise.all(
    Array.from({ length: workers }, (_, index) =>
      worker(`load-worker-${index}`)
    )
  )
  const drainMs = Number(process.hrtime.bigint() - drainStarted) / 1_000_000

  latencies.sort((left, right) => left - right)
  const percentile = (fraction: number): number =>
    latencies[
      Math.min(latencies.length - 1, Math.ceil(fraction * latencies.length) - 1)
    ] ?? 0
  const totalMs = Number(process.hrtime.bigint() - enqueueStarted) / 1_000_000
  const report = {
    schemaVersion: 1,
    kind: 'phase10-load-report',
    generatedAt: new Date().toISOString(),
    scope:
      'in-memory outbox contract; synthetic payloads; not a production benchmark',
    events,
    workers,
    enqueueMs: Math.round(enqueueMs * 100) / 100,
    drainMs: Math.round(drainMs * 100) / 100,
    totalMs: Math.round(totalMs * 100) / 100,
    throughputPerSecond: Math.round((events / (totalMs / 1000)) * 100) / 100,
    processed,
    loss: events - processed,
    duplicates,
    latencyMs: {
      p50: Math.round(percentile(0.5) * 1000) / 1000,
      p95: Math.round(percentile(0.95) * 1000) / 1000,
      p99: Math.round(percentile(0.99) * 1000) / 1000,
      max: Math.round((latencies[latencies.length - 1] ?? 0) * 1000) / 1000
    }
  }

  fs.mkdirSync(path.join(root, 'certification'), { recursive: true })
  fs.writeFileSync(
    path.join(root, 'certification', 'load-report.json'),
    `${JSON.stringify(report, null, 2)}\n`
  )
  console.log(JSON.stringify(report))
  if (report.loss !== 0 || report.duplicates !== 0) {
    process.exitCode = 1
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'load check failed')
  process.exitCode = 1
})
