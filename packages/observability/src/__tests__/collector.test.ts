import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { InMemoryTelemetry } from '../telemetry.ts'
import {
  COLLECTOR_ATTRIBUTE_ALLOWLIST,
  InProcessCollector,
  collectorTelemetryHooks,
  createFileCollector,
  createOtlpJsonCollector,
  sanitizeCollectorValue,
  type OtlpJsonExport
} from '../collector.ts'

const NOW = new Date('2026-09-20T12:00:00.000Z')
const CORRELATION = 'corr_aud19_09_00000000-0000-4000-8000-000000000009'
const CANARY = 'SENSITIVE-AUD19-09-CANARY'

const temporaryDirectories: string[] = []

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

function temporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'aud19-09-collector-'))
  temporaryDirectories.push(directory)
  return directory
}

describe('collector sanitizer', () => {
  it('accepts identifiers, counters and classifications only', () => {
    expect(sanitizeCollectorValue('outbox.lag')).toEqual({
      value: 'outbox.lag',
      reason: 'ok'
    })
    expect(sanitizeCollectorValue(12)).toEqual({ value: 12, reason: 'ok' })
    expect(sanitizeCollectorValue(true)).toEqual({ value: true, reason: 'ok' })
    expect(sanitizeCollectorValue(`${CANARY}-payload`).reason).toBe('canary')
    expect(sanitizeCollectorValue('free text with spaces').reason).toBe(
      'unsafe'
    )
    expect(sanitizeCollectorValue({ payload: CANARY }).reason).toBe('dropped')
    expect(sanitizeCollectorValue(Number.NaN).reason).toBe('unsafe')
  })

  it('keeps the allowlist explicit and content-free', () => {
    expect(COLLECTOR_ATTRIBUTE_ALLOWLIST).toContain('correlationId')
    expect(COLLECTOR_ATTRIBUTE_ALLOWLIST).toContain('outcome')
    expect(COLLECTOR_ATTRIBUTE_ALLOWLIST).not.toContain('payload')
    expect(COLLECTOR_ATTRIBUTE_ALLOWLIST).not.toContain('objective')
    expect(COLLECTOR_ATTRIBUTE_ALLOWLIST).not.toContain('message')
  })
})

describe('in-process collector redaction', () => {
  it('never exports injected canaries from spans, metrics or logs', async () => {
    const collector = new InProcessCollector({ clock: () => NOW })
    const telemetry = new InMemoryTelemetry({
      clock: () => NOW,
      ...collectorTelemetryHooks(collector)
    })

    const span = telemetry.startSpan('api.webhook.received', {
      operation: 'webhook',
      correlationId: CORRELATION,
      tenantId: 'tenant_synthetic_1',
      status: CANARY,
      objective: CANARY
    })
    span.end('ok')
    telemetry.recordMetric('requests_total', 1, {
      channel: 'synthetic',
      outcome: CANARY
    })
    telemetry.log('info', 'api.webhook.received', {
      eventId: 'outbox_aud19_09_0001',
      status: CANARY,
      payload: { note: CANARY },
      objective: CANARY
    })

    const exported = await collector.flush()
    const serialized = JSON.stringify(exported)
    expect(serialized).not.toContain(CANARY)
    expect(serialized).not.toContain('objective')
    expect(serialized).not.toContain('payload')

    expect(exported.spans).toHaveLength(1)
    expect(exported.spans[0]?.attributes).toEqual({
      operation: 'webhook',
      correlationId: CORRELATION,
      tenantId: 'tenant_synthetic_1'
    })
    expect(exported.metrics[0]?.attributes).toEqual({ channel: 'synthetic' })
    expect(exported.logs[0]?.fields).toEqual({
      eventId: 'outbox_aud19_09_0001'
    })
    expect(exported.redaction.blockedCanaries).toBeGreaterThanOrEqual(2)
    expect(exported.redaction.droppedAttributes).toBeGreaterThanOrEqual(2)
    expect(exported.redaction.droppedLogFields).toBeGreaterThanOrEqual(3)
  })

  it('replaces unsafe names and keeps batches bounded per flush', async () => {
    const collector = new InProcessCollector({ clock: () => NOW })
    const telemetry = new InMemoryTelemetry({
      clock: () => NOW,
      ...collectorTelemetryHooks(collector)
    })
    telemetry.log('info', 'free text with spaces')
    telemetry.log('info', 'safe.event')
    collector.recordSpan({
      name: 'span with spaces',
      traceId: 'e'.repeat(32),
      spanId: 'f'.repeat(16),
      correlationId: CORRELATION,
      startedAt: NOW.toISOString(),
      endedAt: NOW.toISOString(),
      durationMs: 1,
      status: 'ok',
      attributes: {}
    })
    const first = await collector.flush()
    const second = await collector.flush()
    expect(first.logs.map((log) => log.event)).toEqual([
      '[redacted-name]',
      'safe.event'
    ])
    expect(first.spans[0]?.name).toBe('[redacted-name]')
    expect(first.redaction.replacedNames).toBeGreaterThanOrEqual(2)
    expect(second.spans).toHaveLength(0)
    expect(collector.batches()).toHaveLength(2)
  })
})

describe('file collector adapter', () => {
  it('is inert until explicitly enabled', async () => {
    const filePath = join(temporaryDirectory(), 'collector.jsonl')
    const collector = createFileCollector({
      enabled: false,
      filePath,
      clock: () => NOW
    })
    collector.recordMetric({
      name: 'requests_total',
      value: 1,
      attributes: {},
      timestamp: NOW.toISOString()
    })
    const exported = await collector.flush()
    expect(exported.enabled).toBe(false)
    expect(exported.metrics).toHaveLength(0)
    expect(exported.redaction.droppedRecords).toBe(1)
    expect(existsSync(filePath)).toBe(false)
  })

  it('writes one redacted JSON line when enabled', async () => {
    const filePath = join(temporaryDirectory(), 'nested', 'collector.jsonl')
    const collector = createFileCollector({
      enabled: true,
      filePath,
      clock: () => NOW
    })
    collector.recordLog({
      level: 'warn',
      message: 'worker.outbox.failed',
      fields: {
        eventId: 'outbox_aud19_09_0001',
        error: CANARY,
        payload: { note: CANARY }
      },
      timestamp: NOW.toISOString()
    })
    const exported = await collector.flush()
    expect(exported.enabled).toBe(true)
    const content = readFileSync(filePath, 'utf8')
    expect(content).not.toContain(CANARY)
    const lines = content.trim().split('\n')
    expect(lines).toHaveLength(1)
    const parsed = JSON.parse(lines[0] as string) as {
      logs: Array<{ event: string; fields: Record<string, unknown> }>
    }
    expect(parsed.logs[0]?.event).toBe('worker.outbox.failed')
    expect(parsed.logs[0]?.fields).toEqual({
      eventId: 'outbox_aud19_09_0001'
    })

    await collector.flush()
    expect(readFileSync(filePath, 'utf8')).toBe(content)
  })
})

describe('OTLP-shaped collector adapter', () => {
  it('never calls the injected transport while disabled', async () => {
    const payloads: OtlpJsonExport[] = []
    const collector = createOtlpJsonCollector({
      enabled: false,
      transport: (payload) => payloads.push(payload),
      clock: () => NOW
    })
    collector.recordMetric({
      name: 'requests_total',
      value: 1,
      attributes: {},
      timestamp: NOW.toISOString()
    })
    const exported = await collector.flush()
    expect(exported.enabled).toBe(false)
    expect(payloads).toHaveLength(0)
  })

  it('emits OTLP/JSON-shaped redacted payloads through the transport', async () => {
    const payloads: OtlpJsonExport[] = []
    const collector = createOtlpJsonCollector({
      enabled: true,
      transport: (payload) => payloads.push(payload),
      clock: () => NOW
    })
    collector.recordSpan({
      name: 'worker.outbox.claim',
      traceId: 'e'.repeat(32),
      spanId: '1'.repeat(16),
      correlationId: CORRELATION,
      startedAt: NOW.toISOString(),
      endedAt: NOW.toISOString(),
      durationMs: 12,
      status: 'error',
      errorCode: 'effect_timeout',
      attributes: {
        operation: 'outbox',
        objective: CANARY,
        outcome: CANARY
      }
    })
    collector.recordMetric({
      name: 'worker_outbox_lag',
      value: 3,
      attributes: { operation: 'outbox', status: CANARY },
      timestamp: NOW.toISOString()
    })
    await collector.flush()
    expect(payloads).toHaveLength(1)
    const payload = payloads[0]
    expect(JSON.stringify(payload)).not.toContain(CANARY)
    const span = payload?.resourceSpans[0]?.scopeSpans[0]?.spans[0]
    expect(span?.status.code).toBe(2)
    expect(span?.attributes.map((attribute) => attribute.key)).toEqual([
      'operation'
    ])
    const dataPoint =
      payload?.resourceMetrics[0]?.scopeMetrics[0]?.metrics[0]?.gauge
        .dataPoints[0]
    expect(dataPoint?.attributes.map((attribute) => attribute.key)).toEqual([
      'operation'
    ])
  })
})
