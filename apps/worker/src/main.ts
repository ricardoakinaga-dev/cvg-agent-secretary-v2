import { TenantIdSchema } from '@cvg/platform'
import { createDomainId, createShutdownController } from '@cvg/shared'
import { CONTINUOUS_WORKER_RUN_MODE } from './continuous-worker.ts'
import { runControlledMemoryRuntime } from './controlled-memory-runtime.ts'
import {
  createPostgresContinuousWorker,
  createPostgresControlledWorker,
  parseControlledDrainLimit,
  POSTGRES_CONTROLLED_QUEUE_ADAPTER
} from './postgres-controlled.ts'
import { createJsonWorkerTelemetry } from './worker-observability.ts'
import { getWorkerStartupFailure } from './worker.ts'
import { assertPostgresWorkerPreflight } from './postgres-role-preflight.ts'
import {
  KERNEL_WORKER_RUNTIME,
  assertPostgresKernelPrerequisites,
  resolveWorkerRuntimeKind
} from './kernel-composition.ts'
import { InMemoryDatabase, OutboxRepository } from '@cvg/persistence'
import { assertProductionBootstrap } from '../../../scripts/lib/production-preflight-core.mjs'
import {
  createWorkerHealthReporter,
  parseWorkerHealthConfig
} from './worker-health.ts'

const startupFailure = getWorkerStartupFailure()
let productionBootstrapFailure: Error | undefined
try {
  assertProductionBootstrap(process.env)
} catch (error) {
  productionBootstrapFailure =
    error instanceof Error
      ? error
      : new Error('Production bootstrap preflight failed')
}

if (productionBootstrapFailure) {
  console.error(
    JSON.stringify({
      event: 'worker.startup_failed',
      code: 'production_bootstrap_preflight_failed',
      message: productionBootstrapFailure.message
    })
  )
  process.exitCode = 1
} else if (startupFailure) {
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
  if (process.env.CVG_WORKER_RUN_MODE?.trim() === CONTINUOUS_WORKER_RUN_MODE) {
    void runPostgresContinuousWorker(process.env).catch((error: unknown) => {
      console.error(
        JSON.stringify({
          event: 'worker.continuous_failed',
          code: 'continuous_worker_failed',
          message:
            error instanceof Error ? error.message : 'Continuous worker failed'
        })
      )
      process.exitCode = 1
    })
  } else {
    void runPostgresControlledWorker(process.env).catch((error: unknown) => {
      console.error(
        JSON.stringify({
          event: 'worker.controlled_failed',
          code: 'controlled_worker_failed',
          message:
            error instanceof Error
              ? error.message
              : 'Controlled PostgreSQL worker failed'
        })
      )
      process.exitCode = 1
    })
  }
}

async function runControlledMemoryWorker(env: NodeJS.ProcessEnv) {
  const tenantId = TenantIdSchema.parse(env.CVG_WORKER_TENANT_ID)
  const adapter = new OutboxRepository(new InMemoryDatabase(), {
    enforceLeaseFencing: true
  })
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

  const drained = await runControlledMemoryRuntime({
    tenantId,
    workerId,
    adapter,
    drainLimit: 1
  })
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
  const health = await createWorkerHealthReporter(
    parseWorkerHealthConfig(env),
    {
      workerId: env.CVG_WORKER_ID?.trim() || 'worker-controlled-postgres',
      log: (event, fields) =>
        console.error(JSON.stringify({ event, ...(fields ?? {}) }))
    }
  )
  let poolClosed = false
  const closePool = async (): Promise<void> => {
    if (poolClosed) return
    poolClosed = true
    await runtime.pool.end()
  }
  const shutdown = createShutdownController({
    close: async () => {
      await health.markDraining()
      await closePool()
      await health.markStopped()
    },
    exit: (code) => process.exit(code),
    log: (event) => {
      if (event.type !== 'shutdown.started') {
        console.error(
          JSON.stringify({ event: event.type, signal: event.signal })
        )
      }
    }
  })
  shutdown.install(process)
  try {
    await assertPostgresWorkerPreflight(runtime.pool, {
      tenantId: TenantIdSchema.parse(env.CVG_WORKER_TENANT_ID)
    })
    if (resolveWorkerRuntimeKind(env) === KERNEL_WORKER_RUNTIME) {
      await assertPostgresKernelPrerequisites(
        runtime.pool,
        TenantIdSchema.parse(env.CVG_WORKER_TENANT_ID)
      )
    }
    await health.markReady({
      adapter: POSTGRES_CONTROLLED_QUEUE_ADAPTER,
      runMode: 'once',
      durable: true,
      externalEffects: false
    })
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
    await health.markStopped()
    await closePool()
  }
}

/**
 * Opt-in supervised consumer. It stays fail-closed: the startup gate rejects
 * missing adapter/tenant/database/RLS/controlled-mode configuration before
 * this function runs, production is forbidden and only controlled handlers
 * are composed. Governed-kernel workers include the durable approval and
 * effect-journal sweep; the published-agent path remains unchanged.
 */
async function runPostgresContinuousWorker(env: NodeJS.ProcessEnv) {
  const telemetry = createJsonWorkerTelemetry()
  const runtime = createPostgresContinuousWorker(env, { telemetry })
  const health = await createWorkerHealthReporter(
    parseWorkerHealthConfig(env),
    {
      workerId: runtime.workerId,
      log: (event, fields) => telemetry.log(event, fields)
    }
  )
  try {
    await assertPostgresWorkerPreflight(runtime.pool, {
      tenantId: runtime.tenantId
    })
    if (resolveWorkerRuntimeKind(env) === KERNEL_WORKER_RUNTIME) {
      await assertPostgresKernelPrerequisites(runtime.pool, runtime.tenantId)
    }
  } catch (error) {
    await runtime.pool.end().catch(() => undefined)
    throw error
  }
  const shutdown = createShutdownController({
    close: async () => {
      await health.markDraining()
      const stopped = await runtime.worker.stop()
      telemetry.log('worker.continuous_drained', {
        drained: stopped.drained,
        released: stopped.released,
        releaseFailed: stopped.releaseFailed
      })
      await health.markStopped()
      await runtime.pool.end()
    },
    exit: (code) => process.exit(code),
    timeoutMs: runtime.tuning.drainMs + 5_000,
    log: (event) => {
      telemetry.log(
        `worker.${event.type}`,
        {
          ...(event.signal ? { signal: event.signal } : {}),
          ...(event.code !== undefined ? { code: event.code } : {}),
          ...(event.error ? { error: event.error } : {})
        },
        event.type === 'shutdown.failed' ? 'error' : 'info'
      )
    }
  })
  shutdown.install(process)
  runtime.worker.start()
  try {
    await health.markReady({
      adapter: POSTGRES_CONTROLLED_QUEUE_ADAPTER,
      durable: true,
      externalEffects: false
    })
  } catch (error) {
    await runtime.worker.stop().catch(() => undefined)
    await runtime.pool.end().catch(() => undefined)
    throw error
  }
  telemetry.log('worker.continuous_ready', {
    adapter: POSTGRES_CONTROLLED_QUEUE_ADAPTER,
    concurrency: runtime.tuning.concurrency,
    pollIntervalMs: runtime.tuning.pollIntervalMs,
    leaseMs: runtime.tuning.leaseMs,
    durable: true,
    externalEffects: false
  })
}
