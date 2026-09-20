import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  createWorkerHealthReporter,
  DEFAULT_WORKER_READINESS_FILE,
  parseWorkerHealthConfig,
  WORKER_HEALTH_HOST_ENV,
  WORKER_HEALTH_PORT_ENV,
  WORKER_READINESS_FILE_ENV
} from '../worker-health.ts'

const created: string[] = []

async function tempReadinessFile(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cvg-worker-health-'))
  created.push(dir)
  return path.join(dir, 'ready.json')
}

async function readStatus(file: string): Promise<string | null> {
  try {
    const parsed = JSON.parse(await fs.readFile(file, 'utf8')) as {
      status?: string
    }
    return parsed.status ?? null
  } catch {
    return null
  }
}

afterEach(async () => {
  for (const dir of created.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true })
  }
})

describe('worker health configuration', () => {
  it('defaults to a readiness file and keeps the HTTP endpoint disabled', () => {
    expect(parseWorkerHealthConfig({})).toEqual({
      readinessFile: DEFAULT_WORKER_READINESS_FILE,
      host: '127.0.0.1',
      port: null
    })
  })

  it('allows disabling the readiness file explicitly', () => {
    expect(
      parseWorkerHealthConfig({ [WORKER_READINESS_FILE_ENV]: '' })
    ).toMatchObject({ readinessFile: null, port: null })
  })

  it('rejects a relative readiness file path', () => {
    expect(() =>
      parseWorkerHealthConfig({ [WORKER_READINESS_FILE_ENV]: 'ready.json' })
    ).toThrow(/absolute path/)
  })

  it('refuses to bind the health endpoint to a non-loopback host', () => {
    expect(() =>
      parseWorkerHealthConfig({
        [WORKER_HEALTH_HOST_ENV]: '0.0.0.0'
      })
    ).toThrow(/loopback/)
  })

  it('rejects invalid health ports', () => {
    expect(() =>
      parseWorkerHealthConfig({ [WORKER_HEALTH_PORT_ENV]: 'abc' })
    ).toThrow(/integer port/)
    expect(() =>
      parseWorkerHealthConfig({ [WORKER_HEALTH_PORT_ENV]: '0' })
    ).toThrow(/between 1 and 65535/)
    expect(() =>
      parseWorkerHealthConfig({ [WORKER_HEALTH_PORT_ENV]: '70000' })
    ).toThrow(/between 1 and 65535/)
  })

  it('accepts a loopback host with an explicit port', () => {
    expect(
      parseWorkerHealthConfig({
        [WORKER_HEALTH_HOST_ENV]: 'localhost',
        [WORKER_HEALTH_PORT_ENV]: '9099'
      })
    ).toEqual({
      readinessFile: DEFAULT_WORKER_READINESS_FILE,
      host: 'localhost',
      port: 9099
    })
  })
})

describe('worker health reporter', () => {
  it('writes ready/draining states and removes the file when stopped', async () => {
    const file = await tempReadinessFile()
    const reporter = await createWorkerHealthReporter({
      readinessFile: file,
      host: '127.0.0.1',
      port: null
    })

    expect(reporter.status()).toBe('starting')
    expect(await readStatus(file)).toBeNull()

    await reporter.markReady({
      adapter: 'postgres-controlled',
      externalEffects: false
    })
    expect(reporter.status()).toBe('ready')
    expect(await readStatus(file)).toBe('ready')
    const payload = JSON.parse(await fs.readFile(file, 'utf8')) as {
      adapter?: string
      externalEffects?: boolean
      workerId?: string
      pid?: number
    }
    expect(payload).toMatchObject({
      adapter: 'postgres-controlled',
      externalEffects: false,
      pid: process.pid
    })

    await reporter.markDraining()
    expect(reporter.status()).toBe('draining')
    expect(await readStatus(file)).toBe('draining')

    await reporter.markStopped()
    expect(reporter.status()).toBe('stopped')
    await expect(fs.stat(file)).rejects.toThrow()
  })

  it('is a no-op for file reporting when no path is configured', async () => {
    const reporter = await createWorkerHealthReporter({
      readinessFile: null,
      host: '127.0.0.1',
      port: null
    })
    await reporter.markReady()
    expect(reporter.status()).toBe('ready')
    await reporter.markStopped()
    expect(reporter.status()).toBe('stopped')
  })

  it('serves /live and /ready only after markReady and fails closed after draining', async () => {
    const file = await tempReadinessFile()
    const reporter = await createWorkerHealthReporter({
      readinessFile: file,
      host: '127.0.0.1',
      port: 0
    })
    const address = reporter.address()
    expect(address).not.toBeNull()
    const base = `http://127.0.0.1:${address?.port ?? 0}`

    const live = await fetch(`${base}/live`)
    expect(live.status).toBe(200)
    const notReady = await fetch(`${base}/ready`)
    expect(notReady.status).toBe(503)
    expect(await notReady.json()).toMatchObject({ ready: false })

    await reporter.markReady()
    const ready = await fetch(`${base}/ready`)
    expect(ready.status).toBe(200)
    expect(await ready.json()).toMatchObject({ ready: true })

    await reporter.markDraining()
    const draining = await fetch(`${base}/ready`)
    expect(draining.status).toBe(503)

    const missing = await fetch(`${base}/unknown`)
    expect(missing.status).toBe(404)

    await reporter.markStopped()
    await expect(fetch(`${base}/ready`)).rejects.toThrow()
    await expect(fs.stat(file)).rejects.toThrow()
  })
})
