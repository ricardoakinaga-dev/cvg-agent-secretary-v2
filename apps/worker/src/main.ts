import { TenantIdSchema } from '@cvg/platform'
import { createDomainId } from '@cvg/shared'
import { createControlledWorker } from './controlled-worker.ts'
import {
  createPostgresControlledWorker,
  parseControlledDrainLimit,
  POSTGRES_CONTROLLED_QUEUE_ADAPTER
} from './postgres-controlled.ts'
import { getWorkerStartupFailure } from './worker.ts'
import { InMemoryDatabase, OutboxRepository } from '@cvg/persistence'

const startupFailure = getWorkerStartupFailure()

if (startupFailure) {
  console.error(
    JSON.stringify({
      event: 'worker.startup_failed',
      code: startupFailure.code,
      message: startupFailure.message
    })
  )
  process.exitCode = 1
} else if (process.env.CVG_WORKER_QUEUE_ADAPTER === 'controlled-memory') {
  void runControlledMemoryWorker(process.env).catch((error: unknown) => {
    console.error(
      JSON.stringify({
        event: 'worker.controlled_failed',
        code: 'controlled_worker_failed',
        message: error instanceof Error ? error.message : 'Worker failed'
      })
    )
    process.exitCode = 1
  })
} else if (
  process.env.CVG_WORKER_QUEUE_ADAPTER === POSTGRES_CONTROLLED_QUEUE_ADAPTER ||
  process.env.CVG_WORKER_QUEUE_ADAPTER === 'postgres'
) {
  void runPostgresControlledWorker(process.env).catch(() => {
    console.error(
      JSON.stringify({
        event: 'worker.controlled_failed',
        code: 'controlled_worker_failed',
        message: 'Controlled PostgreSQL worker failed'
      })
    )
    process.exitCode = 1
  })
}

async function runControlledMemoryWorker(env: NodeJS.ProcessEnv) {
  const tenantId = TenantIdSchema.parse(env.CVG_WORKER_TENANT_ID)
  const adapter = new OutboxRepository(new InMemoryDatabase())
  const workerId = env.CVG_WORKER_ID?.trim() || 'worker-controlled-local'
  const smoke = env.CVG_WORKER_CONTROLLED_SMOKE === 'true'

  if (smoke) {
    adapter.enqueue({
      tenantId,
      type: 'message.outbound',
      payload: { fixture: 'controlled-worker-smoke' },
      idempotencyKey: `worker-controlled-${createDomainId('fixture')}`,
      correlationId: 'corr_00000000-0000-4000-8000-000000000172'
    })
  }

  const worker = createControlledWorker({
    tenantId,
    workerId,
    adapter,
    handlers: {
      inboundProcess: () => ({ status: 'controlled_noop' }),
      messageOutbound: () => ({ status: 'controlled_noop' })
    }
  })
  const drained = await worker.drain(1)
  console.log(
    JSON.stringify({
      event: smoke
        ? 'worker.controlled_smoke_passed'
        : 'worker.controlled_ready',
      adapter: 'controlled-memory',
      processed: drained.processed,
      durable: false,
      externalEffects: false
    })
  )
}

async function runPostgresControlledWorker(env: NodeJS.ProcessEnv) {
  const runtime = createPostgresControlledWorker(env)
  try {
    const drained = await runtime.worker.drain(
      parseControlledDrainLimit(env.CVG_WORKER_MAX_EVENTS)
    )
    console.log(
      JSON.stringify({
        event: 'worker.controlled_ready',
        adapter: POSTGRES_CONTROLLED_QUEUE_ADAPTER,
        processed: drained.processed,
        durable: true,
        externalEffects: false,
        runOnce: true
      })
    )
  } finally {
    await runtime.pool.end()
  }
}
