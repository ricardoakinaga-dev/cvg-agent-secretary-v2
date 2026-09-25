import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { TenantId } from '@cvg/platform'
import type { DurableOutboxAdapter } from '@cvg/persistence'
import {
  CONTROLLED_LOCAL_SYNTHETIC_PROFILE,
  createControlledLocalCollector,
  type ObservabilityCollectorPort
} from '@cvg/observability'
import { buildServer, buildServerFromEnv } from '../apps/api/src/server.ts'
import { runControlledMemoryRuntime } from '../apps/worker/src/controlled-memory-runtime.ts'

const PROFILE = CONTROLLED_LOCAL_SYNTHETIC_PROFILE
const CANARY = 'SENSITIVE-AUD20-10-CANARY'
const TENANT = 'tenant_00000000-0000-4000-8000-000000000a10' as TenantId

interface Envelope<T> {
  success: boolean
  data: T
  error: { code: string; message: string } | null
  meta: { correlationId: string }
}

interface CollectorLine {
  logs: Array<{
    event: string
    fields: Record<string, unknown>
    timestamp: string
  }>
  redaction: { exportedLogs: number }
}

function readCollectorLines(path: string): CollectorLine[] {
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as CollectorLine)
}

function correlationIdsIn(lines: readonly CollectorLine[]): string[] {
  return lines.flatMap((line) =>
    line.logs
      .map((log) => log.fields.correlationId)
      .filter((value): value is string => typeof value === 'string')
  )
}

function makeRoot(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix))
}

describe('AUD20-10 controlled collector factory', () => {
  it('writes only constant file names below the exclusive temporary root', async () => {
    const root = makeRoot('aud20-10-factory-')
    try {
      const collector = createControlledLocalCollector({
        profile: PROFILE,
        mode: 'local_file',
        root,
        role: 'api'
      })
      collector.recordLog({
        level: 'info',
        message: 'inbound.accepted',
        fields: {
          correlationId: 'corr_synthetic_1',
          operation: 'runtime',
          outcome: 'ok'
        },
        timestamp: '2026-09-25T12:00:00.000Z'
      })
      await collector.flush()
      await collector.close()

      const lines = readCollectorLines(join(root, 'api.jsonl'))
      expect(lines).toHaveLength(1)
      const exported = JSON.stringify(lines)
      expect(exported).toContain('corr_synthetic_1')
      // The sink is allowlisted by the shared buffer; the AUD20-10 projection
      // is what keeps tenant/session identifiers out of the exported lines.
      expect(exported).not.toContain('tenantId')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('creates no file when disabled and counts dropped records', async () => {
    const root = makeRoot('aud20-10-disabled-')
    try {
      const collector = createControlledLocalCollector({
        profile: PROFILE,
        mode: 'disabled',
        root,
        role: 'worker'
      })
      collector.recordLog({
        level: 'info',
        message: 'worker.inbound.processed',
        fields: { correlationId: 'corr_disabled' },
        timestamp: '2026-09-25T12:00:00.000Z'
      })
      expect(collector.enabled).toBe(false)
      await collector.flush()
      await collector.close()
      expect(collector.redaction().droppedRecords).toBe(1)
      expect(() => readFileSync(join(root, 'worker.jsonl'), 'utf8')).toThrow()
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('fails closed outside the harness profile, in production and on bad contexts', () => {
    const root = makeRoot('aud20-10-negatives-')
    try {
      expect(() =>
        createControlledLocalCollector({
          profile: 'SOMETHING_ELSE',
          mode: 'local_file',
          root,
          role: 'api'
        } as never)
      ).toThrow(/CONTROLLED_LOCAL_SYNTHETIC/)

      expect(() =>
        createControlledLocalCollector({
          profile: PROFILE,
          mode: 'local_file',
          root,
          role: 'api',
          filePath: join(root, 'custom.jsonl')
        } as never)
      ).toThrow(/caller-supplied file paths/)

      expect(() =>
        createControlledLocalCollector({
          profile: PROFILE,
          mode: 'local_file',
          root: 'relative/path',
          role: 'api'
        })
      ).toThrow(/absolute path/)

      expect(() =>
        createControlledLocalCollector({
          profile: PROFILE,
          mode: 'local_file',
          root: `${root}/missing/../missing-child`,
          role: 'api'
        })
      ).toThrow(/traversal segments/)

      const outsideRoot = mkdtempSync(join(process.cwd(), 'aud20-10-outside-'))
      try {
        expect(() =>
          createControlledLocalCollector({
            profile: PROFILE,
            mode: 'local_file',
            root: outsideRoot,
            role: 'api'
          })
        ).toThrow(/temporary directory/)
      } finally {
        rmSync(outsideRoot, { recursive: true, force: true })
      }

      const symlinkTarget = join(root, 'real-root')
      mkdirSync(symlinkTarget)
      const symlinkRoot = join(root, 'linked-root')
      symlinkSync(symlinkTarget, symlinkRoot, 'dir')
      expect(() =>
        createControlledLocalCollector({
          profile: PROFILE,
          mode: 'local_file',
          root: symlinkRoot,
          role: 'api'
        })
      ).toThrow(/not a symlink/)

      expect(() =>
        createControlledLocalCollector({
          profile: PROFILE,
          mode: 'local_file',
          root: join(tmpdir(), 'aud20-10-root-that-does-not-exist'),
          role: 'api'
        })
      ).toThrow()

      expect(() =>
        createControlledLocalCollector({
          profile: PROFILE,
          mode: 'local_file',
          root: tmpdir(),
          role: 'api'
        })
      ).toThrow(/temporary directory/)

      expect(() =>
        createControlledLocalCollector(
          { profile: PROFILE, mode: 'local_file', root, role: 'api' },
          { maxBufferRecords: 513 }
        )
      ).toThrow(/harness cap/)

      expect(() =>
        createControlledLocalCollector(
          { profile: PROFILE, mode: 'local_file', root, role: 'api' },
          { maxBatchRecords: 257 }
        )
      ).toThrow(/harness cap/)

      expect(() =>
        createControlledLocalCollector(
          { profile: PROFILE, mode: 'local_file', root, role: 'api' },
          { maxBufferRecords: 4, maxBatchRecords: 5 }
        )
      ).toThrow(/harness cap/)

      const previousNodeEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      try {
        expect(() =>
          createControlledLocalCollector({
            profile: PROFILE,
            mode: 'local_file',
            root,
            role: 'api'
          })
        ).toThrow(/cannot write files in production/)
      } finally {
        process.env.NODE_ENV = previousNodeEnv
      }
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('bounds the buffer and every flushed batch', async () => {
    const root = makeRoot('aud20-10-limits-')
    try {
      const collector = createControlledLocalCollector(
        { profile: PROFILE, mode: 'local_file', root, role: 'worker' },
        { maxBufferRecords: 4, maxBatchRecords: 2 }
      )
      for (let index = 0; index < 6; index += 1) {
        collector.recordLog({
          level: 'info',
          message: 'worker.bounded',
          fields: { correlationId: `corr_${index}` },
          timestamp: '2026-09-25T12:00:00.000Z'
        })
      }
      expect(collector.redaction().droppedRecords).toBe(2)

      await collector.flush()
      const firstLine = readCollectorLines(join(root, 'worker.jsonl'))
      expect(firstLine).toHaveLength(1)
      expect(firstLine[0]?.logs).toHaveLength(2)

      await collector.close()
      const lines = readCollectorLines(join(root, 'worker.jsonl'))
      expect(lines).toHaveLength(2)
      expect(lines[1]?.logs).toHaveLength(2)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('closes idempotently, drains the remainder and drops records after close', async () => {
    const root = makeRoot('aud20-10-close-')
    try {
      const collector = createControlledLocalCollector({
        profile: PROFILE,
        mode: 'local_file',
        root,
        role: 'api'
      })
      for (let index = 0; index < 3; index += 1) {
        collector.recordLog({
          level: 'info',
          message: 'inbound.accepted',
          fields: { correlationId: `corr_close_${index}` },
          timestamp: '2026-09-25T12:00:00.000Z'
        })
      }
      await collector.close()
      await collector.close()
      const lines = readCollectorLines(join(root, 'api.jsonl'))
      expect(lines).toHaveLength(1)
      expect(lines[0]?.logs).toHaveLength(3)

      collector.recordLog({
        level: 'info',
        message: 'inbound.after_close',
        fields: { correlationId: 'corr_after_close' },
        timestamp: '2026-09-25T12:00:00.000Z'
      })
      expect(collector.redaction().droppedRecords).toBe(1)
      await collector.close()
      expect(readCollectorLines(join(root, 'api.jsonl'))).toHaveLength(1)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('rejects the exercise when the sink cannot be written', async () => {
    const root = makeRoot('aud20-10-write-error-')
    const collector = createControlledLocalCollector({
      profile: PROFILE,
      mode: 'local_file',
      root,
      role: 'api'
    })
    collector.recordLog({
      level: 'info',
      message: 'inbound.accepted',
      fields: { correlationId: 'corr_write_error' },
      timestamp: '2026-09-25T12:00:00.000Z'
    })
    mkdirSync(join(root, 'api.jsonl'))
    try {
      await expect(collector.flush()).rejects.toThrow()
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe('AUD20-10 sink hardening', () => {
  it('rejects a symlinked sink file and keeps the collector inert', async () => {
    const root = makeRoot('aud20-10-sink-symlink-')
    try {
      symlinkSync(join(root, 'elsewhere.jsonl'), join(root, 'api.jsonl'))
      const collector = createControlledLocalCollector({
        profile: PROFILE,
        mode: 'local_file',
        root,
        role: 'api'
      })
      collector.recordLog({
        level: 'info',
        message: 'inbound.accepted',
        fields: { correlationId: 'corr_sink' },
        timestamp: '2026-09-25T12:00:00.000Z'
      })
      await expect(collector.flush()).rejects.toThrow(/symlinked sink/)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('has no network transport in the collector module', () => {
    const source = readFileSync(
      'packages/observability/src/collector.ts',
      'utf8'
    )
    expect(source).not.toMatch(/node:(net|http|https|dgram|tls)/)
  })
})

describe('AUD20-10 API to worker composition', () => {
  it('carries one synthetic correlation across request, outbox and dispatch', async () => {
    const root = makeRoot('aud20-10-composition-')
    const apiCollector = createControlledLocalCollector({
      profile: PROFILE,
      mode: 'local_file',
      root,
      role: 'api'
    })
    const workerCollector = createControlledLocalCollector({
      profile: PROFILE,
      mode: 'local_file',
      root,
      role: 'worker'
    })
    const env = {
      NODE_ENV: 'test',
      API_PERSISTENCE_MODE: 'memory'
    } as NodeJS.ProcessEnv
    const app = await buildServerFromEnv(env, {
      durableInbound: true,
      runtimeCollector: apiCollector
    })
    const outbox = (
      app as unknown as {
        persistence: { outbox?: DurableOutboxAdapter }
      }
    ).persistence.outbox
    if (!outbox) throw new Error('synthetic outbox adapter is unavailable')
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/webhooks/channels/whatsapp/messages',
        headers: { 'x-tenant-id': TENANT },
        payload: {
          externalMessageId: 'aud20-10-msg-1',
          senderRef: '+5511999990000',
          body: `Fixture sintetica AUD20-10 ${CANARY}`,
          receivedAt: '2026-09-25T12:00:00-03:00'
        }
      })
      expect(response.statusCode).toBe(200)
      const body = response.json() as Envelope<{
        processing?: string
        correlationId: string
      }>
      expect(body.success).toBe(true)
      expect(body.data.processing).toBe('queued')
      const correlationId = body.meta.correlationId

      const drained = await runControlledMemoryRuntime({
        tenantId: TENANT,
        workerId: 'worker-aud20-10',
        adapter: outbox,
        collector: workerCollector,
        drainLimit: 5
      })
      expect(drained.processed).toBe(1)

      await app.close()

      const apiLines = readCollectorLines(join(root, 'api.jsonl'))
      const workerLines = readCollectorLines(join(root, 'worker.jsonl'))
      expect(correlationIdsIn(apiLines)).toContain(correlationId)
      expect(correlationIdsIn(workerLines)).toContain(correlationId)
      expect(correlationIdsIn(workerLines)).toEqual([correlationId])

      const allExported = JSON.stringify([apiLines, workerLines])
      expect(allExported).not.toContain(TENANT)
      expect(allExported).not.toContain('conversationId')
      expect(allExported).not.toContain('sessionId')
      expect(allExported).not.toContain('senderRef')
      expect(allExported).not.toContain('Fixture sintetica')
      expect(allExported).not.toContain(CANARY)
      expect(apiCollector.redaction().droppedRecords).toBe(0)
      expect(workerCollector.redaction().droppedRecords).toBe(0)
      expect(apiCollector.redaction().exportedLogs).toBeGreaterThan(0)
      expect(workerCollector.redaction().exportedLogs).toBeGreaterThan(0)
    } finally {
      await app.close().catch(() => undefined)
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('flushes and closes the worker collector even when the drain fails', async () => {
    const root = makeRoot('aud20-10-failure-')
    const calls: string[] = []
    const failingCollector: ObservabilityCollectorPort = {
      kind: 'in_process',
      enabled: true,
      recordSpan: () => undefined,
      recordMetric: () => undefined,
      recordLog: () => calls.push('record'),
      flush: async () => {
        calls.push('flush')
        throw new Error('synthetic sink failure')
      },
      redaction: () => ({
        exportedSpans: 0,
        exportedMetrics: 0,
        exportedLogs: 0,
        droppedRecords: 0,
        droppedAttributes: 0,
        droppedLogFields: 0,
        replacedNames: 0,
        blockedCanaries: 0
      }),
      close: async () => {
        calls.push('close')
      }
    }
    const failingAdapter = {
      claimNext: () => {
        throw new Error('synthetic claim failure')
      }
    } as unknown as DurableOutboxAdapter
    try {
      await expect(
        runControlledMemoryRuntime({
          tenantId: TENANT,
          workerId: 'worker-aud20-10-failure',
          adapter: failingAdapter,
          collector: failingCollector,
          drainLimit: 1
        })
      ).rejects.toThrow('synthetic sink failure')
      expect(calls).toContain('flush')
      expect(calls).toContain('close')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('keeps the sink inside the temporary root even with a stray file present', async () => {
    const root = makeRoot('aud20-10-contained-')
    try {
      writeFileSync(join(root, 'keep.txt'), 'synthetic', 'utf8')
      const collector = createControlledLocalCollector({
        profile: PROFILE,
        mode: 'local_file',
        root,
        role: 'worker'
      })
      collector.recordLog({
        level: 'info',
        message: 'worker.inbound.processed',
        fields: { correlationId: 'corr_contained' },
        timestamp: '2026-09-25T12:00:00.000Z'
      })
      await collector.close()
      const lines = readCollectorLines(join(root, 'worker.jsonl'))
      expect(correlationIdsIn(lines)).toContain('corr_contained')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('detects a divergent correlation between API and worker exports', async () => {
    const root = makeRoot('aud20-10-divergent-')
    const apiCollector = createControlledLocalCollector({
      profile: PROFILE,
      mode: 'local_file',
      root,
      role: 'api'
    })
    const workerCollector = createControlledLocalCollector({
      profile: PROFILE,
      mode: 'local_file',
      root,
      role: 'worker'
    })
    try {
      const env = {
        NODE_ENV: 'test',
        API_PERSISTENCE_MODE: 'memory'
      } as NodeJS.ProcessEnv
      const app = await buildServerFromEnv(env, {
        durableInbound: true,
        runtimeCollector: apiCollector
      })
      try {
        await app.inject({
          method: 'POST',
          url: '/v1/webhooks/channels/whatsapp/messages',
          headers: { 'x-tenant-id': TENANT },
          payload: {
            externalMessageId: 'aud20-10-divergent-1',
            senderRef: '+5511999990001',
            body: 'Fixture divergente',
            receivedAt: '2026-09-25T12:01:00-03:00'
          }
        })
        const outbox = (
          app as unknown as {
            persistence: { outbox?: DurableOutboxAdapter }
          }
        ).persistence.outbox
        if (!outbox) throw new Error('synthetic outbox adapter is unavailable')
        outbox.enqueue({
          tenantId: TENANT,
          type: 'inbound.process',
          payload: { synthetic: true },
          idempotencyKey: 'aud20-10-divergent-event',
          correlationId: 'corr_00000000-0000-4000-8000-0000000000d1'
        })
        await runControlledMemoryRuntime({
          tenantId: TENANT,
          workerId: 'worker-aud20-10-divergent',
          adapter: outbox,
          collector: workerCollector,
          drainLimit: 5
        })
        await app.close()
      } finally {
        await app.close().catch(() => undefined)
      }

      const apiCorrelations = new Set(
        correlationIdsIn(readCollectorLines(join(root, 'api.jsonl')))
      )
      const workerCorrelations = new Set(
        correlationIdsIn(readCollectorLines(join(root, 'worker.jsonl')))
      )
      expect(
        [...workerCorrelations].some(
          (correlation) => !apiCorrelations.has(correlation)
        )
      ).toBe(true)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('rejects app.close() when the API collector flush fails and still closes it', async () => {
    const calls: string[] = []
    const failingCollector: ObservabilityCollectorPort = {
      kind: 'file',
      enabled: true,
      recordSpan: () => undefined,
      recordMetric: () => undefined,
      recordLog: () => calls.push('record'),
      flush: async () => {
        calls.push('flush')
        throw new Error('synthetic API flush failure')
      },
      redaction: () => ({
        exportedSpans: 0,
        exportedMetrics: 0,
        exportedLogs: 0,
        droppedRecords: 0,
        droppedAttributes: 0,
        droppedLogFields: 0,
        replacedNames: 0,
        blockedCanaries: 0
      }),
      close: async () => {
        calls.push('close')
      }
    }
    const app = buildServer({ runtimeCollector: failingCollector })
    await expect(app.close()).rejects.toThrow('synthetic API flush failure')
    expect(calls).toContain('flush')
    expect(calls).toContain('close')
  })
})
