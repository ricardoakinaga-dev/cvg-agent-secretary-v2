import { describe, expect, it } from 'vitest'
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
import {
  InMemoryTelemetry,
  MetricAttributeError,
  withTelemetrySpan
} from '../telemetry.ts'
import { OpenTelemetryTelemetry } from '../otel.ts'
import {
  createTraceContext,
  fromTraceparent,
  toTraceparent
} from '../trace-context.ts'
import { redactFields } from '../redaction.ts'
import { HashChainedAuditLedger } from '../audit-ledger.ts'

const NOW = new Date('2026-09-11T12:00:00.000Z')
const CORRELATION = 'corr_00000000-0000-4000-8000-000000000001'

const deterministicIds = {
  traceId: () => 'a'.repeat(32),
  spanId: () => 'b'.repeat(16)
}

describe('trace context', () => {
  it('creates and round-trips W3C traceparent headers', () => {
    const context = createTraceContext(
      {
        correlationId: CORRELATION,
        tenantId: 'tenant_1',
        conversationId: 'conv_1',
        sessionId: 'sess_1',
        agentId: 'agent_1',
        agentVersion: 'v3'
      },
      deterministicIds
    )
    const header = toTraceparent(context)
    expect(header).toBe(`00-${'a'.repeat(32)}-${'b'.repeat(16)}-01`)
    expect(fromTraceparent(header, CORRELATION)).toEqual({
      traceId: context.traceId,
      spanId: context.spanId,
      correlationId: CORRELATION
    })
  })

  it('rejects malformed and all-zero traceparents', () => {
    expect(fromTraceparent('nope', CORRELATION)).toBeUndefined()
    expect(
      fromTraceparent(`00-${'0'.repeat(32)}-${'b'.repeat(16)}-01`, CORRELATION)
    ).toBeUndefined()
    expect(
      fromTraceparent(`00-${'a'.repeat(32)}-${'0'.repeat(16)}-01`, CORRELATION)
    ).toBeUndefined()
  })
})

describe('telemetry', () => {
  it('propagates trace, correlation and tenant through parent and child spans', () => {
    let now = NOW
    let spanCounter = 0
    const telemetry = new InMemoryTelemetry({
      clock: () => now,
      idGenerator: {
        traceId: () => 'c'.repeat(32),
        spanId: () => (++spanCounter).toString(16).padStart(16, '0')
      }
    })
    const parentContext = {
      traceId: 'c'.repeat(32),
      spanId: 'd'.repeat(16),
      correlationId: CORRELATION,
      tenantId: 'tenant_1'
    }
    const parent = telemetry.startSpan(
      'agent.run',
      { agentProfile: 'secretary' },
      parentContext
    )
    now = new Date(NOW.getTime() + 150)
    const child = parent.child('model.call')
    child.end('ok')
    parent.end('ok')
    const spans = telemetry.spans()
    expect(spans).toHaveLength(2)
    expect(spans[0]?.traceId).toBe('c'.repeat(32))
    expect(spans[0]?.parentSpanId).toBe('0000000000000001')
    expect(spans[1]?.spanId).toBe('0000000000000001')
    expect(spans[0]?.correlationId).toBe(CORRELATION)
    expect(spans[1]?.correlationId).toBe(CORRELATION)
    expect(spans[1]?.durationMs).toBe(150)
    expect(spans[1]?.status).toBe('ok')
  })

  it('records error spans with error codes', async () => {
    const telemetry = new InMemoryTelemetry({ clock: () => NOW })
    await expect(
      withTelemetrySpan(telemetry, 'model.call', {}, async () => {
        throw Object.assign(new Error('boom'), { code: 'provider_timeout' })
      })
    ).rejects.toThrow('boom')
    expect(telemetry.spans()[0]).toMatchObject({
      status: 'error',
      errorCode: 'provider_timeout'
    })
  })

  it('rejects high-cardinality metric attributes', () => {
    const telemetry = new InMemoryTelemetry({ clock: () => NOW })
    telemetry.recordMetric('requests_total', 1, { channel: 'whatsapp' })
    expect(telemetry.metrics()).toHaveLength(1)
    expect(() =>
      telemetry.recordMetric('requests_total', 1, {
        correlationId: CORRELATION
      })
    ).toThrow(MetricAttributeError)
    expect(() =>
      telemetry.recordMetric('requests_total', 1, { tenantId: 'tenant_1' })
    ).toThrow(MetricAttributeError)
  })

  it('bounds in-memory buffers', () => {
    const telemetry = new InMemoryTelemetry({ clock: () => NOW, maxSpans: 2 })
    for (let index = 0; index < 5; index += 1) {
      telemetry.startSpan(`span_${index}`).end()
    }
    expect(telemetry.spans().map((span) => span.name)).toEqual([
      'span_3',
      'span_4'
    ])
  })

  it('redacts sensitive fields and text in logs', () => {
    const telemetry = new InMemoryTelemetry({ clock: () => NOW })
    telemetry.log('info', 'token for user joao@example.com', {
      password: 'hunter2',
      authorization: 'Bearer abc.def',
      cpf: '123.456.789-00',
      route: '/v1/appointments',
      nested: { secret: 'value', ok: true }
    })
    const log = telemetry.logs()[0]
    expect(log?.message).not.toContain('joao@example.com')
    expect(log?.fields.password).toBe('[redacted]')
    expect(log?.fields.authorization).toBe('[redacted]')
    expect(JSON.stringify(log)).not.toContain('hunter2')
    expect(JSON.stringify(log)).not.toContain('123.456.789-00')
    expect(JSON.stringify(log)).not.toContain('Bearer abc.def')
    expect((log?.fields.nested as Record<string, unknown>).ok).toBe(true)
  })

  it('redacts deeply and bounds depth', () => {
    const fields = redactFields({
      level1: {
        level2: {
          level3: { level4: { level5: { level6: { level7: 'deep' } } } }
        }
      }
    })
    expect(JSON.stringify(fields)).toContain('redacted-depth')
  })
})

describe('OpenTelemetry adapter', () => {
  it('exports real spans and metrics through the OTel SDK', async () => {
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
      tracer: tracerProvider.getTracer('cvg-test'),
      meter: meterProvider.getMeter('cvg-test')
    })

    const span = telemetry.startSpan('agent.run', {
      correlationId: CORRELATION,
      agentProfile: 'secretary'
    })
    span.setAttribute('outcome', 'success')
    span.end('ok')
    telemetry.recordMetric('requests_total', 1, { channel: 'whatsapp' })
    await tracerProvider.forceFlush()
    await reader.forceFlush()

    const spans = spanExporter.getFinishedSpans()
    expect(spans).toHaveLength(1)
    expect(spans[0]?.name).toBe('agent.run')
    expect(spans[0]?.attributes.correlationId).toBe(CORRELATION)

    const exported = metricExporter
      .getMetrics()
      .flatMap((resource) => resource.scopeMetrics)
      .flatMap((scope) => scope.metrics)
    expect(
      exported.some((metric) => metric.descriptor.name === 'requests_total')
    ).toBe(true)
    await tracerProvider.shutdown()
    await meterProvider.shutdown()
  })
})

describe('hash-chained audit ledger', () => {
  function entry(index: number, payload: unknown = { action: `act_${index}` }) {
    return {
      eventId: `evt_${index}`,
      type: 'approval.executed',
      actor: 'op_1',
      tenantId: 'tenant_1',
      correlationId: CORRELATION,
      timestamp: new Date(NOW.getTime() + index * 1000).toISOString(),
      payload
    }
  }

  it('appends records and verifies a valid chain', () => {
    const ledger = new HashChainedAuditLedger()
    ledger.append(entry(1))
    ledger.append(entry(2))
    ledger.append(entry(3))
    expect(ledger.size()).toBe(3)
    expect(ledger.verify()).toEqual({ valid: true })
    const records = ledger.records()
    expect(records[0]?.previousHash).toBe('0'.repeat(64))
    expect(records[1]?.previousHash).toBe(records[0]?.eventHash)
    expect(records[2]?.previousHash).toBe(records[1]?.eventHash)
    expect(records[0]?.eventHash).toHaveLength(64)
    expect(JSON.stringify(records)).not.toContain('patient')
  })

  it('detects payload, event and linkage tampering', () => {
    const payloadLedger = new HashChainedAuditLedger()
    payloadLedger.append(entry(1))
    const payloadRecords = payloadLedger.records()
    const tamperedPayload = payloadRecords[0]
    if (!tamperedPayload) throw new Error('missing record')
    ;(tamperedPayload.payload as { action: string }).action = 'modified'
    const payloadVerification = payloadLedger.verify()
    expect(payloadVerification.valid).toBe(false)
    expect(payloadVerification.reason).toBe('payload_hash_mismatch')

    const eventLedger = new HashChainedAuditLedger()
    eventLedger.append(entry(1))
    const eventRecords = eventLedger.records()
    const tamperedEvent = eventRecords[0]
    if (!tamperedEvent) throw new Error('missing record')
    tamperedEvent.actor = 'attacker'
    expect(eventLedger.verify().reason).toBe('event_hash_mismatch')

    const linkageLedger = new HashChainedAuditLedger()
    linkageLedger.append(entry(1))
    linkageLedger.append(entry(2))
    const linkageRecords = linkageLedger.records()
    const second = linkageRecords[1]
    if (!second) throw new Error('missing record')
    second.previousHash = 'f'.repeat(64)
    expect(linkageLedger.verify().reason).toBe('previous_hash_mismatch')
  })

  it('keeps hash chains tenant-bound', () => {
    const ledger = new HashChainedAuditLedger()
    const first = ledger.append(entry(1))
    const second = ledger.append({ ...entry(2), tenantId: 'tenant_2' })
    expect(first.tenantId).toBe('tenant_1')
    expect(second.tenantId).toBe('tenant_2')
    expect(ledger.verify().valid).toBe(true)
  })
})
