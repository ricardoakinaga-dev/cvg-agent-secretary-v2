import { describe, expect, it, vi } from 'vitest'
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor
} from '@opentelemetry/sdk-trace-base'
import {
  AggregationTemporality,
  InMemoryMetricExporter,
  MeterProvider,
  PeriodicExportingMetricReader
} from '@opentelemetry/sdk-metrics'
import { InMemoryTelemetry } from '../telemetry.ts'
import { OpenTelemetryTelemetry } from '../otel.ts'
import {
  redactFields,
  redactValue,
  assertNoSensitiveKeys
} from '../redaction.ts'
import { HashChainedAuditLedger } from '../audit-ledger.ts'
import { fromTraceparent } from '../trace-context.ts'

const NOW = new Date('2026-09-11T12:00:00.000Z')

describe('telemetry callback and redaction edges', () => {
  it('invokes span, metric and log callbacks and bounds logs', () => {
    const spans: string[] = []
    const metrics: string[] = []
    const logs: string[] = []
    const telemetry = new InMemoryTelemetry({
      clock: () => NOW,
      maxLogs: 1,
      onSpan: (span) => spans.push(span.name),
      onMetric: (metric) => metrics.push(metric.name),
      onLog: (log) => logs.push(log.level)
    })
    telemetry.startSpan('one').end()
    telemetry.recordMetric('requests_total', 1, { status: 'ok' })
    telemetry.log('info', 'a')
    telemetry.log('warn', 'b')
    expect(spans).toEqual(['one'])
    expect(metrics).toEqual(['requests_total'])
    expect(logs).toEqual(['info', 'warn'])
    expect(telemetry.logs()).toHaveLength(1)
    expect(telemetry.logs()[0]?.level).toBe('warn')
  })

  it('redacts nested arrays and unsupported values', () => {
    const value = redactValue({
      list: ['plain', { password: 'x' }, null, undefined],
      nested: { deep: { deeper: { deepest: { tooDeep: { stop: 1 } } } } }
    }) as Record<string, unknown>
    expect(JSON.stringify(value)).not.toContain('"x"')
    const fields = redactFields(undefined)
    expect(fields).toEqual({})
    expect(assertNoSensitiveKeys({ apiKey: 'x', ok: true })).toEqual(['apiKey'])
  })
})

describe('OpenTelemetry adapter edges', () => {
  it('creates child spans, sets attributes, records histograms and logs', async () => {
    const spanExporter = new InMemorySpanExporter()
    const tracerProvider = new BasicTracerProvider({
      spanProcessors: [new SimpleSpanProcessor(spanExporter)]
    })
    const metricExporter = new InMemoryMetricExporter(
      AggregationTemporality.CUMULATIVE
    )
    const reader = new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 60_000
    })
    const meterProvider = new MeterProvider({ readers: [reader] })
    const telemetry = new OpenTelemetryTelemetry({
      tracer: tracerProvider.getTracer('edge'),
      meter: meterProvider.getMeter('edge')
    })

    const parent = telemetry.startSpan('parent', {
      correlationId: 'corr_edge_0001'
    })
    parent.setAttribute('outcome', 'success')
    const child = parent.child('child')
    child.end('error', 'child_failed')
    parent.end('ok')
    telemetry.recordMetric('latency_ms', 12, { status: 'ok' })
    telemetry.log('debug', 'log message', { safe: true })
    expect(telemetry.logs()).toHaveLength(1)
    expect(telemetry.metrics()).toHaveLength(1)

    await tracerProvider.forceFlush()
    await reader.forceFlush()
    const exported = spanExporter.getFinishedSpans()
    expect(exported.map((span) => span.name)).toEqual(
      expect.arrayContaining(['parent', 'child'])
    )
    const exportedMetrics = metricExporter
      .getMetrics()
      .flatMap((resource) => resource.scopeMetrics)
      .flatMap((scope) => scope.metrics)
    expect(
      exportedMetrics.some((metric) => metric.descriptor.name === 'latency_ms')
    ).toBe(true)
    await tracerProvider.shutdown()
    await meterProvider.shutdown()
    void vi
  })
})

describe('audit ledger and trace context edges', () => {
  it('returns valid for an empty ledger and exposes head', () => {
    const ledger = new HashChainedAuditLedger()
    expect(ledger.verify()).toEqual({ valid: true })
    expect(ledger.head()).toBeUndefined()
    const record = ledger.append({
      eventId: 'evt_1',
      type: 'test',
      actor: 'op',
      tenantId: 'tenant_1',
      correlationId: 'corr_00000000-0000-4000-8000-000000000001',
      timestamp: NOW.toISOString()
    })
    expect(ledger.head()?.eventHash).toBe(record.eventHash)
  })

  it('parses lowercase traceparents and rejects short ids', () => {
    const context = fromTraceparent(
      `00-${'A'.repeat(32)}-${'B'.repeat(16)}-01`,
      'corr_00000000-0000-4000-8000-000000000001'
    )
    expect(context?.traceId).toBe('a'.repeat(32))
    expect(
      fromTraceparent(
        `00-${'a'.repeat(31)}-${'b'.repeat(16)}-01`,
        'corr_00000000-0000-4000-8000-000000000001'
      )
    ).toBeUndefined()
  })
})
