import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ALERT_RULES,
  InProcessCollector,
  createInMemoryAlertDeliveryLedger,
  deliverAlertCycles,
  evaluateAlertRules,
  verifyAlertDeliveryEntries,
  type AlertEvaluation
} from '@cvg/observability'
import {
  ApprovalEngine,
  type ApprovalRecord,
  type ApprovalStore
} from '@cvg/approval-engine'

const TENANT = 'tenant_00000000-0000-4000-8000-000000000b10'
const AT = '2026-09-25T12:00:00.000Z'
const AT_MS = Date.parse(AT)

function requestInput() {
  return {
    tenantId: TENANT,
    operatorId: 'op_requester',
    agentId: 'agent_00000000-0000-4000-8000-000000000001',
    agentVersion: 'v1',
    action: 'appointment.cancel',
    resource: { type: 'appointment', id: 'apt_1' },
    payload: { appointmentId: 'apt_1', reason: 'patient request' },
    policyVersion: 'policy_v1',
    correlationId: 'corr_00000000-0000-4000-8000-000000000001'
  }
}

function firingEvaluations(): AlertEvaluation[] {
  const samples = Array.from({ length: 5 }, () => ({
    metric: 'approval_latency_ms',
    value: 9_000,
    timestamp: AT
  }))
  return evaluateAlertRules(DEFAULT_ALERT_RULES, samples, new Date(AT_MS))
}

function noDataEvaluations(): AlertEvaluation[] {
  return evaluateAlertRules(DEFAULT_ALERT_RULES, [], new Date(AT_MS))
}

describe('AUD20-10 alert delivery ledger', () => {
  it('chains detected -> acknowledged -> closed and verifies the chain', () => {
    const ledger = createInMemoryAlertDeliveryLedger()
    const detected = ledger.detect({
      alertId: 'alert_1',
      ruleId: 'AUD19-09-ALERT-APPROVAL-LATENCY',
      severity: 'P1',
      status: 'detected',
      at: AT,
      correlationId: 'corr_00000000-0000-4000-8000-0000000000b1'
    })
    const acknowledged = ledger.acknowledge(
      'alert_1',
      new Date(AT_MS + 5_000).toISOString()
    )
    const closed = ledger.close(
      'alert_1',
      new Date(AT_MS + 10_000).toISOString()
    )

    expect(detected.sequence).toBe(1)
    expect(acknowledged.previousHash).toBe(detected.entryHash)
    expect(closed.previousHash).toBe(acknowledged.entryHash)
    expect(ledger.status('alert_1')).toBe('closed')
    expect(ledger.entries()).toHaveLength(3)
    expect(ledger.verify()).toEqual({ valid: true })
  })

  it('fails closed on duplicate ids, unknown alerts, missing ack and bad order', () => {
    const ledger = createInMemoryAlertDeliveryLedger()
    ledger.detect({
      alertId: 'alert_2',
      ruleId: 'AUD19-09-ALERT-APPROVAL-LATENCY',
      severity: 'P1',
      status: 'detected',
      at: AT
    })
    expect(() =>
      ledger.detect({
        alertId: 'alert_2',
        ruleId: 'AUD19-09-ALERT-APPROVAL-LATENCY',
        severity: 'P1',
        status: 'detected',
        at: AT
      })
    ).toThrow(/already exists/)
    expect(() => ledger.acknowledge('alert_missing', AT)).toThrow(
      /requires a detected alert/
    )
    expect(() => ledger.close('alert_2', AT)).toThrow(/requires acknowledged/)
    expect(() =>
      ledger.acknowledge('alert_2', new Date(AT_MS - 1_000).toISOString())
    ).toThrow(/out of order/)
    expect(() => ledger.acknowledge('alert_2', 'not-a-date')).toThrow(
      /timestamp is invalid/
    )
    expect(() =>
      ledger.detect({
        alertId: 'alert_3',
        ruleId: 'AUD19-09-ALERT-APPROVAL-LATENCY',
        severity: 'P1',
        status: 'detected',
        at: 'invalid'
      })
    ).toThrow(/timestamp is invalid/)
  })

  it('delivers every firing rule and treats no_data as OK', () => {
    const ledger = createInMemoryAlertDeliveryLedger()
    const evaluations = firingEvaluations()
    const firing = evaluations.filter((entry) => entry.state === 'firing')
    const result = deliverAlertCycles({
      evaluations,
      ledger,
      acknowledgeAt: new Date(AT_MS + 5_000).toISOString(),
      closeAt: new Date(AT_MS + 10_000).toISOString(),
      correlationId: 'corr_00000000-0000-4000-8000-0000000000b2'
    })

    expect(firing.length).toBeGreaterThan(0)
    expect(result.firingRules).toHaveLength(firing.length)
    expect(result.cycles).toHaveLength(firing.length)
    expect(result.noDataRules.length).toBe(evaluations.length - firing.length)
    expect(ledger.entries()).toHaveLength(firing.length * 3)
    expect(ledger.verify()).toEqual({ valid: true })
    for (const cycle of result.cycles) {
      expect(Date.parse(cycle.detectedAt)).toBeLessThanOrEqual(
        Date.parse(cycle.acknowledgedAt)
      )
      expect(Date.parse(cycle.acknowledgedAt)).toBeLessThanOrEqual(
        Date.parse(cycle.closedAt)
      )
    }
  })

  it('rejects a missing acknowledgement and out-of-order cycle times', () => {
    const evaluations = firingEvaluations()
    expect(() =>
      deliverAlertCycles({
        evaluations,
        ledger: createInMemoryAlertDeliveryLedger(),
        acknowledgeAt: new Date(AT_MS + 5_000).toISOString(),
        closeAt: new Date(AT_MS + 10_000).toISOString(),
        acknowledge: () => false
      })
    ).toThrow(/acknowledgement is missing/)

    expect(() =>
      deliverAlertCycles({
        evaluations,
        ledger: createInMemoryAlertDeliveryLedger(),
        acknowledgeAt: new Date(AT_MS - 5_000).toISOString(),
        closeAt: new Date(AT_MS + 10_000).toISOString()
      })
    ).toThrow(/out of order/)
  })

  it('produces no cycles when every rule has no data', () => {
    const ledger = createInMemoryAlertDeliveryLedger()
    const result = deliverAlertCycles({
      evaluations: noDataEvaluations(),
      ledger,
      acknowledgeAt: new Date(AT_MS + 5_000).toISOString(),
      closeAt: new Date(AT_MS + 10_000).toISOString()
    })
    expect(result.cycles).toEqual([])
    expect(result.firingRules).toEqual([])
    expect(result.noDataRules).toHaveLength(DEFAULT_ALERT_RULES.length)
    expect(ledger.entries()).toEqual([])
  })

  it('detects a tampered delivery chain', () => {
    const ledger = createInMemoryAlertDeliveryLedger()
    ledger.detect({
      alertId: 'alert_tamper',
      ruleId: 'AUD19-09-ALERT-APPROVAL-LATENCY',
      severity: 'P1',
      status: 'detected',
      at: AT
    })
    ledger.acknowledge('alert_tamper', new Date(AT_MS + 5_000).toISOString())
    const entries = ledger.entries()
    expect(verifyAlertDeliveryEntries(entries)).toEqual({ valid: true })

    const tamperedAt = entries.map((entry, index) =>
      index === 0
        ? { ...entry, at: new Date(AT_MS + 1_000).toISOString() }
        : entry
    )
    expect(verifyAlertDeliveryEntries(tamperedAt)).toEqual({
      valid: false,
      brokenAt: 0,
      reason: 'entry_hash_mismatch'
    })

    const tamperedChain = entries.map((entry, index) =>
      index === 1 ? { ...entry, previousHash: 'f'.repeat(64) } : entry
    )
    expect(verifyAlertDeliveryEntries(tamperedChain)).toEqual({
      valid: false,
      brokenAt: 1,
      reason: 'previous_hash_mismatch'
    })

    const tamperedSequence = entries.map((entry, index) =>
      index === 1 ? { ...entry, sequence: 7 } : entry
    )
    expect(verifyAlertDeliveryEntries(tamperedSequence)).toEqual({
      valid: false,
      brokenAt: 1,
      reason: 'sequence_mismatch'
    })
  })
})

describe('AUD20-10 approval latency instrumentation', () => {
  function buildEngine(nowMs: () => number, samples: unknown[]) {
    let counter = 0
    return new ApprovalEngine({
      clock: () => new Date(nowMs()),
      idFactory: () => {
        counter += 1
        return `appr_00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`
      },
      onApprovalLatency: (sample) => samples.push(sample)
    })
  }

  it('emits approval_latency_ms for approve and reject with allowlisted attributes', () => {
    let nowMs = AT_MS
    const samples: unknown[] = []
    const engine = buildEngine(() => nowMs, samples)
    const record = engine.request(requestInput())
    engine.submit(TENANT, record.approvalId, 'op_requester')
    nowMs += 7_000
    engine.approve(TENANT, record.approvalId, { approverId: 'op_approver' })

    expect(samples).toEqual([
      {
        metric: 'approval_latency_ms',
        value: 7_000,
        attributes: {
          decision: 'approved',
          outcome: 'decided',
          operation: 'approval.decision'
        }
      }
    ])

    const rejectedRecord = engine.request(requestInput())
    engine.submit(TENANT, rejectedRecord.approvalId, 'op_requester')
    nowMs += 3_000
    engine.reject(TENANT, rejectedRecord.approvalId, {
      approverId: 'op_approver'
    })
    expect(samples[1]).toEqual({
      metric: 'approval_latency_ms',
      value: 3_000,
      attributes: {
        decision: 'rejected',
        outcome: 'decided',
        operation: 'approval.decision'
      }
    })
    expect(
      Object.keys((samples[1] as { attributes: object }).attributes).sort()
    ).toEqual(['decision', 'operation', 'outcome'])
  })

  it('skips invalid, missing or negative decision timestamps', () => {
    const seed = new ApprovalEngine({ clock: () => new Date(AT_MS) })
    const requested = seed.request(requestInput())
    const pending = seed.submit(TENANT, requested.approvalId, 'op_requester')

    const samples: unknown[] = []
    const invalidStore = new FixedStore({
      ...pending,
      requestedAt: 'not-a-date'
    })
    const invalidEngine = new ApprovalEngine({
      store: invalidStore,
      clock: () => new Date(AT_MS + 5_000),
      onApprovalLatency: (sample) => samples.push(sample)
    })
    invalidEngine.approve(TENANT, pending.approvalId, {
      approverId: 'op_approver'
    })
    expect(samples).toEqual([])

    const futureStore = new FixedStore({
      ...pending,
      requestedAt: new Date(AT_MS + 60_000).toISOString()
    })
    const futureEngine = new ApprovalEngine({
      store: futureStore,
      clock: () => new Date(AT_MS + 5_000),
      onApprovalLatency: (sample) => samples.push(sample)
    })
    futureEngine.approve(TENANT, pending.approvalId, {
      approverId: 'op_approver'
    })
    expect(samples).toEqual([])
  })

  it('carries the stable metric name into a collector', async () => {
    let nowMs = AT_MS
    const collector = new InProcessCollector()
    const engine = new ApprovalEngine({
      clock: () => new Date(nowMs),
      onApprovalLatency: (sample) =>
        collector.recordMetric({
          name: sample.metric,
          value: sample.value,
          attributes: sample.attributes,
          timestamp: new Date(nowMs).toISOString()
        })
    })
    const record = engine.request(requestInput())
    engine.submit(TENANT, record.approvalId, 'op_requester')
    nowMs += 4_000
    engine.approve(TENANT, record.approvalId, { approverId: 'op_approver' })

    const exported = await collector.flush()
    expect(exported.metrics).toEqual([
      {
        name: 'approval_latency_ms',
        value: 4_000,
        attributes: {
          decision: 'approved',
          outcome: 'decided',
          operation: 'approval.decision'
        },
        timestamp: new Date(AT_MS + 4_000).toISOString()
      }
    ])
  })

  it('keeps the engine usable without the latency seam', () => {
    const engine = new ApprovalEngine({ clock: () => new Date(AT_MS) })
    const record = engine.request(requestInput())
    engine.submit(TENANT, record.approvalId, 'op_requester')
    const approved = engine.approve(TENANT, record.approvalId, {
      approverId: 'op_approver'
    })
    expect(approved.status).toBe('APPROVED')
  })
})

class FixedStore implements ApprovalStore {
  record: ApprovalRecord

  constructor(record: ApprovalRecord) {
    this.record = record
  }

  insert(): void {}

  get(): ApprovalRecord | undefined {
    return this.record
  }

  update(
    ...args: Parameters<ApprovalStore['update']>
  ): ReturnType<ApprovalStore['update']> {
    const [, , expectedStatus, update] = args
    if (this.record.status !== expectedStatus) return undefined
    this.record = update(this.record)
    return this.record
  }

  list(): ApprovalRecord[] {
    return [this.record]
  }

  listExpiringBefore(): ApprovalRecord[] {
    return []
  }
}
