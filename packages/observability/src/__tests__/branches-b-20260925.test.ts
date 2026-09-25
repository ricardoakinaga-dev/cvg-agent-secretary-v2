import { describe, expect, it } from 'vitest'
import {
  ConversationRepository,
  InMemoryDatabase,
  OutboxRepository,
  type DurableOutboxAdapter
} from '@cvg/persistence'
import {
  receiveInboundMessage,
  type ConversationCommandRepository
} from '@cvg/agent-core'
import {
  createFileCollector,
  createOtlpJsonCollector,
  InProcessCollector,
  type CollectorExport,
  type OtlpJsonExport
} from '../collector.ts'
import type {
  Attributes,
  RecordedLog,
  RecordedMetric,
  RecordedSpan
} from '../telemetry.ts'

const NOW = new Date('2026-09-20T12:00:00.000Z')
const NOW_ISO = NOW.toISOString()
const CORRELATION = 'corr_branch_b_00000000-0000-4000-8000-000000000001'

function span(overrides: Partial<RecordedSpan> = {}): RecordedSpan {
  return {
    name: 'branch.b.span',
    traceId: 'trace_branch_b',
    spanId: 'span_branch_b',
    correlationId: CORRELATION,
    startedAt: NOW_ISO,
    endedAt: NOW_ISO,
    durationMs: 5,
    status: 'ok',
    attributes: { operation: 'branch_b' },
    ...overrides
  }
}

function metric(overrides: Partial<RecordedMetric> = {}): RecordedMetric {
  return {
    name: 'branch.b.metric',
    value: 1,
    attributes: { operation: 'branch_b' },
    timestamp: NOW_ISO,
    ...overrides
  }
}

function log(overrides: Partial<RecordedLog> = {}): RecordedLog {
  return {
    level: 'info',
    message: 'branch.b.event',
    fields: { eventId: 'evt_branch_b_1' },
    timestamp: NOW_ISO,
    ...overrides
  }
}

function messageInput(overrides: Record<string, unknown> = {}) {
  return {
    tenantId: 'tenant_00000000-0000-4000-8000-000000000075',
    channel: 'whatsapp',
    externalMessageId: 'branch-b-ext-1',
    senderRef: '+5511999999999',
    body: 'Preciso agendar consulta',
    receivedAt: new Date(),
    ...overrides
  }
}

describe('collector branch-b coverage', () => {
  it('replaces a canary span name that passes the safe pattern', async () => {
    const collector = new InProcessCollector({ clock: () => NOW })
    collector.recordSpan(span({ name: 'SENSITIVE-probe' }))
    const exported = await collector.flush()
    expect(exported.spans).toHaveLength(1)
    expect(exported.spans[0]!.name).toBe('[redacted-name]')
    expect(collector.redaction().replacedNames).toBe(1)
  })

  it('exports a span without attributes as an empty record', async () => {
    const collector = new InProcessCollector({ clock: () => NOW })
    collector.recordSpan(
      span({ attributes: undefined as unknown as Attributes })
    )
    const exported = await collector.flush()
    expect(exported.spans[0]!.attributes).toEqual({})
  })

  it('sorts span attributes into kept, replaced, canary and dropped buckets', async () => {
    const collector = new InProcessCollector({ clock: () => NOW })
    collector.recordSpan(
      span({
        attributes: {
          operation: 'branch_b',
          channel: 'has spaces',
          status: 'SENSITIVE-branch-b-canary',
          outcome: { nested: true }
        } as unknown as Attributes
      })
    )
    const exported = await collector.flush()
    expect(exported.spans[0]!.attributes).toEqual({ operation: 'branch_b' })
    expect(collector.redaction()).toMatchObject({
      droppedAttributes: 2,
      replacedNames: 1,
      blockedCanaries: 1
    })
    expect(JSON.stringify(exported)).not.toContain('SENSITIVE-branch-b-canary')
  })

  it('drops a canary error code instead of exporting it', async () => {
    const collector = new InProcessCollector({ clock: () => NOW })
    collector.recordSpan(
      span({ status: 'error', errorCode: 'SENSITIVE-branch-b-code' })
    )
    const exported = await collector.flush()
    expect(exported.spans[0]).not.toHaveProperty('errorCode')
    expect(collector.redaction().blockedCanaries).toBe(1)
  })

  it('replaces an unsafe metric name and zeroes a non-finite value', async () => {
    const collector = new InProcessCollector({ clock: () => NOW })
    collector.recordMetric(metric({ name: 'bad metric name', value: NaN }))
    const exported = await collector.flush()
    expect(exported.metrics[0]!.name).toBe('[redacted-name]')
    expect(exported.metrics[0]!.value).toBe(0)
    expect(collector.redaction().replacedNames).toBe(1)
  })

  it('drops unsafe log fields while keeping allowlisted ones', async () => {
    const collector = new InProcessCollector({ clock: () => NOW })
    collector.recordLog(
      log({
        fields: {
          status: 'has spaces',
          eventId: 'evt_branch_b_1',
          outcome: { nested: true }
        }
      })
    )
    const exported = await collector.flush()
    expect(exported.logs[0]!.fields).toEqual({ eventId: 'evt_branch_b_1' })
    expect(collector.redaction()).toMatchObject({
      droppedLogFields: 2,
      replacedNames: 1
    })
  })

  it('supports an in-process collector without batch retention', async () => {
    const collector = new InProcessCollector({
      clock: () => NOW,
      keepBatches: false
    })
    collector.recordSpan(span())
    const exported = await collector.flush()
    expect(exported.spans).toHaveLength(1)
    expect(collector.batches()).toEqual([])
    await collector.close()
  })

  it('drops every record on a disabled file collector without touching disk', async () => {
    const collector = createFileCollector({
      enabled: false,
      filePath: '/tmp/opencode/branch-b-collector/disabled.jsonl',
      resource: {
        serviceName: 'branch-b',
        serviceVersion: '0.0.0',
        environment: 'test'
      },
      clock: () => NOW
    })
    expect(collector.enabled).toBe(false)
    collector.recordSpan(span())
    collector.recordMetric(metric())
    collector.recordLog(log())
    const exported = await collector.flush()
    expect(exported.spans).toEqual([])
    expect(exported.metrics).toEqual([])
    expect(exported.logs).toEqual([])
    expect(collector.redaction().droppedRecords).toBe(3)
    await collector.close()
  })

  it('drops records on a disabled file collector with default options', async () => {
    const collector = createFileCollector({
      enabled: false,
      filePath: '/tmp/opencode/branch-b-collector/default.jsonl'
    })
    expect(collector.enabled).toBe(false)
    collector.recordSpan(span())
    const exported = await collector.flush()
    expect(exported.spans).toEqual([])
    expect(collector.redaction().droppedRecords).toBe(1)
    await collector.close()
  })

  it('skips the OTLP transport when there is nothing to export', async () => {
    const calls: OtlpJsonExport[] = []
    const collector = createOtlpJsonCollector({
      enabled: true,
      transport: (payload) => {
        calls.push(payload)
      },
      resource: {
        serviceName: 'branch-b',
        serviceVersion: '0.0.0',
        environment: 'test'
      },
      clock: () => NOW
    })
    const exported = await collector.flush()
    expect(calls).toHaveLength(0)
    expect(exported.spans).toEqual([])
    await collector.close()
  })

  it('buffers OTLP records with default options', async () => {
    const calls: OtlpJsonExport[] = []
    const collector = createOtlpJsonCollector({
      enabled: true,
      transport: (payload) => {
        calls.push(payload)
      }
    })
    collector.recordMetric(metric())
    const exported = await collector.flush()
    expect(calls).toHaveLength(1)
    expect(exported.metrics).toHaveLength(1)
    expect(collector.redaction().exportedMetrics).toBe(1)
    await collector.close()
  })

  it('maps spans and metrics into an OTLP-shaped payload', async () => {
    const deliveries: Array<{
      payload: OtlpJsonExport
      exported: CollectorExport
    }> = []
    const collector = createOtlpJsonCollector({
      enabled: true,
      transport: (payload, exported) => {
        deliveries.push({ payload, exported })
      },
      clock: () => NOW
    })
    collector.recordSpan(
      span({
        parentSpanId: 'parent_branch_b',
        status: 'error',
        attributes: {
          operation: 'branch_b',
          attempt: 3
        }
      })
    )
    collector.recordSpan(span({ name: 'branch.b.ok', spanId: 'span_ok' }))
    collector.recordMetric(
      metric({
        timestamp: 'not-a-time',
        attributes: { operation: 'branch_b', attempt: 1.5, outcome: true }
      })
    )
    collector.recordLog(log())
    const exported = await collector.flush()
    expect(deliveries).toHaveLength(1)
    expect(exported.logs).toHaveLength(1)
    const payload = deliveries[0]!.payload
    expect(payload.resourceSpans).toHaveLength(1)
    const spans = payload.resourceSpans[0]!.scopeSpans[0]!.spans
    expect(spans).toHaveLength(2)
    const failed = spans.find((item) => item.spanId === 'span_branch_b')!
    expect(failed.parentSpanId).toBe('parent_branch_b')
    expect(failed.status).toEqual({ code: 2 })
    expect(failed.attributes).toEqual(
      expect.arrayContaining([
        { key: 'operation', value: { stringValue: 'branch_b' } },
        { key: 'attempt', value: { intValue: '3' } }
      ])
    )
    const healthy = spans.find((item) => item.spanId === 'span_ok')!
    expect(healthy.status).toEqual({ code: 1 })
    expect(healthy.parentSpanId).toBeUndefined()
    const metrics =
      payload.resourceMetrics[0]!.scopeMetrics[0]!.metrics
    expect(metrics).toHaveLength(1)
    expect(metrics[0]!.gauge.dataPoints[0]!.timeUnixNano).toBe('0')
    expect(metrics[0]!.gauge.dataPoints[0]!.attributes).toEqual(
      expect.arrayContaining([
        { key: 'operation', value: { stringValue: 'branch_b' } },
        { key: 'attempt', value: { doubleValue: 1.5 } },
        { key: 'outcome', value: { boolValue: true } }
      ])
    )
    expect(payload.resourceSpans[0]!.resource.attributes).toEqual(
      expect.arrayContaining([
        {
          key: 'service.name',
          value: { stringValue: 'cvg-agent-secretary-v2' }
        }
      ])
    )
  })
})

describe('receive inbound message branch-b coverage', () => {
  it('returns a sparse duplicate without optional lineage', async () => {
    const conversations = {
      findByExternalMessage: async () => ({
        id: 'msg_branch_b_sparse',
        conversationId: 'conv_branch_b_sparse',
        externalMessageId: 'branch-b-sparse-1',
        direction: 'inbound' as const,
        body: 'Ola',
        createdAt: new Date()
      }),
      createWithSession: async () => {
        throw new Error('synthetic create must not run')
      }
    }
    const result = await receiveInboundMessage(
      { conversations },
      messageInput({ externalMessageId: 'branch-b-sparse-1' })
    )
    expect(result).toMatchObject({
      accepted: false,
      conversationId: 'conv_branch_b_sparse',
      messageId: 'msg_branch_b_sparse',
      sessionId: null,
      runtimeStatus: 'completed'
    })
    expect(result.correlationId).toBeUndefined()
    expect(result.traceId).toBeUndefined()
  })

  it('requires an atomic repository for the durable outbox path', async () => {
    const conversations = {
      findByExternalMessage: async () => null,
      createWithSession: async () => {
        throw new Error('synthetic create must not run')
      }
    } as unknown as ConversationCommandRepository
    await expect(
      receiveInboundMessage(
        {
          conversations,
          outbox: {} as unknown as DurableOutboxAdapter
        },
        messageInput({ externalMessageId: 'branch-b-no-atomic' })
      )
    ).rejects.toThrow(/atomic/)
  })

  it('runs the atomic path without trusted trace roots', async () => {
    const database = new InMemoryDatabase()
    const conversations = new ConversationRepository(database)
    const outbox = new OutboxRepository(database)
    const result = await receiveInboundMessage(
      { conversations, outbox },
      messageInput({ externalMessageId: 'branch-b-atomic-bare' })
    )
    expect(result.accepted).toBe(true)
    expect(result.outbox).toMatchObject({ type: 'inbound.process' })
  })

  it('omits the trace envelope when the message carries none', async () => {
    const conversations = {
      findByExternalMessage: async () => null,
      createWithSession: async () => ({
        conversation: {
          id: 'conv_branch_b_stub',
          correlationId: 'corr_branch_b_stub'
        },
        session: { id: 'sess_branch_b_stub' },
        message: { id: 'msg_branch_b_stub' }
      })
    } as unknown as ConversationCommandRepository
    const result = await receiveInboundMessage(
      {
        conversations,
        correlationId: 'corr_00000000-0000-4000-8000-000000000076',
        traceId: '0123456789abcdef0123456789abcdef'
      },
      messageInput({ externalMessageId: 'branch-b-stub-1' })
    )
    expect(result).toMatchObject({
      accepted: true,
      conversationId: 'conv_branch_b_stub',
      sessionId: 'sess_branch_b_stub',
      messageId: 'msg_branch_b_stub',
      runtimeStatus: 'pending'
    })
    expect(result.traceId).toBeUndefined()
  })

  it('rethrows a non-unique storage failure', async () => {
    const conversations = {
      findByExternalMessage: async () => null,
      createWithSession: async () => {
        throw new Error('synthetic storage boom')
      }
    }
    await expect(
      receiveInboundMessage(
        { conversations },
        messageInput({ externalMessageId: 'branch-b-boom' })
      )
    ).rejects.toThrow(/synthetic storage boom/)
  })

  it('converts a unique race into a sparse duplicate', async () => {
    let calls = 0
    const conversations = {
      findByExternalMessage: async () => {
        calls += 1
        if (calls === 1) return null
        return {
          id: 'msg_branch_b_race',
          conversationId: 'conv_branch_b_race',
          externalMessageId: 'branch-b-race-1',
          direction: 'inbound' as const,
          body: 'Ola',
          createdAt: new Date()
        }
      },
      createWithSession: async () => {
        throw Object.assign(new Error('duplicate key'), { code: '23505' })
      }
    }
    const result = await receiveInboundMessage(
      { conversations },
      messageInput({ externalMessageId: 'branch-b-race-1' })
    )
    expect(result).toMatchObject({
      accepted: false,
      conversationId: 'conv_branch_b_race',
      messageId: 'msg_branch_b_race',
      sessionId: null,
      runtimeStatus: 'completed'
    })
    expect(result.correlationId).toBeUndefined()
    expect(result.traceId).toBeUndefined()
  })

  it('preserves full lineage on a unique race duplicate', async () => {
    let calls = 0
    const conversations = {
      findByExternalMessage: async () => {
        calls += 1
        if (calls === 1) return null
        return {
          id: 'msg_branch_b_race_full',
          conversationId: 'conv_branch_b_race_full',
          externalMessageId: 'branch-b-race-full-1',
          direction: 'inbound' as const,
          body: 'Ola',
          sessionId: 'sess_branch_b_race',
          runtimeStatus: 'pending' as const,
          correlationId: 'corr_00000000-0000-4000-8000-000000000077',
          runtimeTraceId: '0123456789abcdef0123456789abcdef',
          createdAt: new Date()
        }
      },
      createWithSession: async () => {
        throw Object.assign(new Error('duplicate key'), { code: '23505' })
      }
    }
    const result = await receiveInboundMessage(
      { conversations },
      messageInput({ externalMessageId: 'branch-b-race-full-1' })
    )
    expect(result).toMatchObject({
      accepted: false,
      conversationId: 'conv_branch_b_race_full',
      messageId: 'msg_branch_b_race_full',
      sessionId: 'sess_branch_b_race',
      runtimeStatus: 'pending',
      correlationId: 'corr_00000000-0000-4000-8000-000000000077',
      traceId: '0123456789abcdef0123456789abcdef'
    })
  })
})
