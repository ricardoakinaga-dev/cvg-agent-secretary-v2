import { createServer, type Server } from 'node:http'
import { promises as fs } from 'node:fs'
import path from 'node:path'

/**
 * Observable readiness for the worker process.
 *
 * The default surface is a readiness file (JSON) that a container runtime can
 * probe without exposing a port. An HTTP endpoint is optional and, when
 * enabled, only binds to a loopback address: opening a public port requires an
 * explicit host change that this contract rejects.
 */
export const WORKER_READINESS_FILE_ENV = 'CVG_WORKER_READINESS_FILE'
export const WORKER_HEALTH_PORT_ENV = 'CVG_WORKER_HEALTH_PORT'
export const WORKER_HEALTH_HOST_ENV = 'CVG_WORKER_HEALTH_HOST'
export const DEFAULT_WORKER_READINESS_FILE = '/tmp/cvg-worker-ready'

const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', 'localhost'])

export type WorkerReadinessStatus =
  | 'starting'
  | 'ready'
  | 'draining'
  | 'stopped'

export interface WorkerHealthConfig {
  /** Absolute readiness-file path, or `null` when file reporting is disabled. */
  readinessFile: string | null
  /** Loopback bind host for the optional endpoint. */
  host: string
  /** Optional HTTP port; `null` keeps the endpoint disabled (default). */
  port: number | null
}

export interface WorkerHealthReporter {
  markReady(detail?: Record<string, unknown>): Promise<void>
  markDraining(): Promise<void>
  markStopped(): Promise<void>
  status(): WorkerReadinessStatus
  address(): { host: string; port: number } | null
}

export interface WorkerHealthReporterOptions {
  workerId?: string
  clock?: () => Date
  log?: (event: string, fields?: Record<string, unknown>) => void
}

export function parseWorkerHealthConfig(
  env: NodeJS.ProcessEnv = process.env
): WorkerHealthConfig {
  const rawFile = env[WORKER_READINESS_FILE_ENV]
  const readinessFile =
    rawFile === undefined ? DEFAULT_WORKER_READINESS_FILE : rawFile.trim()
  if (readinessFile && !path.isAbsolute(readinessFile)) {
    throw new Error(
      `${WORKER_READINESS_FILE_ENV} must be an absolute path or empty to disable file readiness`
    )
  }

  const host = (env[WORKER_HEALTH_HOST_ENV] ?? '127.0.0.1').trim()
  if (!LOOPBACK_HOSTS.has(host)) {
    throw new Error(
      `${WORKER_HEALTH_HOST_ENV} must be a loopback address; refusing to expose the worker health endpoint`
    )
  }

  const rawPort = env[WORKER_HEALTH_PORT_ENV]?.trim()
  let port: number | null = null
  if (rawPort) {
    if (!/^\d{1,5}$/.test(rawPort)) {
      throw new Error(`${WORKER_HEALTH_PORT_ENV} must be an integer port`)
    }
    port = Number(rawPort)
    if (port < 1 || port > 65535) {
      throw new Error(
        `${WORKER_HEALTH_PORT_ENV} must be an integer port between 1 and 65535`
      )
    }
  }

  return { readinessFile: readinessFile || null, host, port }
}

export function resolveWorkerHealthConfigOrNull(
  env: NodeJS.ProcessEnv = process.env
): WorkerHealthConfig | null {
  try {
    return parseWorkerHealthConfig(env)
  } catch {
    return null
  }
}

export async function createWorkerHealthReporter(
  config: WorkerHealthConfig,
  options: WorkerHealthReporterOptions = {}
): Promise<WorkerHealthReporter> {
  const clock = options.clock ?? (() => new Date())
  let status: WorkerReadinessStatus = 'starting'
  let server: Server | undefined
  let address: { host: string; port: number } | null = null

  const writeFile = async (
    next: WorkerReadinessStatus,
    detail?: Record<string, unknown>
  ): Promise<void> => {
    if (!config.readinessFile) return
    if (next === 'stopped') {
      await fs.rm(config.readinessFile, { force: true })
      return
    }
    const payload = {
      schemaVersion: 1,
      kind: 'cvg-worker-readiness',
      status: next,
      pid: process.pid,
      updatedAt: clock().toISOString(),
      ...(options.workerId ? { workerId: options.workerId } : {}),
      ...(detail ?? {})
    }
    await fs.writeFile(config.readinessFile, `${JSON.stringify(payload)}\n`)
  }

  if (config.port !== null) {
    server = createServer((request, response) => {
      const path = (request.url ?? '').split('?')[0]
      if (path === '/ready') {
        const ready = status === 'ready'
        response.writeHead(ready ? 200 : 503, {
          'content-type': 'application/json'
        })
        response.end(JSON.stringify({ status, ready }))
        return
      }
      if (path === '/live') {
        response.writeHead(200, { 'content-type': 'application/json' })
        response.end(JSON.stringify({ status: 'live' }))
        return
      }
      response.writeHead(404, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ error: 'not_found' }))
    })
    await new Promise<void>((resolve, reject) => {
      server?.once('error', reject)
      server?.listen(config.port ?? 0, config.host, () => {
        const bound = server?.address()
        if (bound && typeof bound === 'object') {
          address = { host: config.host, port: bound.port }
        }
        resolve()
      })
    })
    server.unref()
  }

  const transition = async (
    next: WorkerReadinessStatus,
    detail?: Record<string, unknown>
  ): Promise<void> => {
    status = next
    await writeFile(next, detail)
  }

  return {
    markReady: async (detail) => {
      await transition('ready', detail)
      options.log?.('worker.ready', {
        readinessFile: config.readinessFile,
        healthPort: address?.port ?? null
      })
    },
    markDraining: async () => {
      await transition('draining')
      options.log?.('worker.draining', { status })
    },
    markStopped: async () => {
      await transition('stopped')
      if (server) {
        server.closeAllConnections()
        await new Promise<void>((resolve) => server?.close(() => resolve()))
      }
    },
    status: () => status,
    address: () => address
  }
}
