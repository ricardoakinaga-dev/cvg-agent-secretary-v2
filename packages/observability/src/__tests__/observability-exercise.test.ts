import { describe, expect, it } from 'vitest'
import { runObservabilityExercise } from '../observability-exercise.ts'
import { InProcessCollector } from '../collector.ts'
import { createCollectorWorkerTelemetry } from '../../../../apps/worker/src/worker-observability.ts'

describe('AUD19-09 observability exercise', () => {
  it('detects the injected fault, correlates every hop and recovers', async () => {
    const report = await runObservabilityExercise()
    expect(report.status).toBe('PASS')
    expect(report.alerts.detection.firing).toEqual(
      expect.arrayContaining([
        'AUD19-09-ALERT-DLQ',
        'AUD19-09-ALERT-QUEUE-LAG',
        'AUD19-09-ALERT-UNCERTAIN',
        'AUD19-09-ALERT-APPROVAL-LATENCY',
        'AUD19-09-ALERT-LEASE-CLAIM',
        'AUD19-09-ALERT-COST'
      ])
    )
    expect(report.alerts.detection.firing).not.toContain(
      'AUD19-09-ALERT-ERRORS'
    )
    expect(report.alerts.detection.firing).toContain(
      report.alerts.detectedFault
    )
    expect(report.alerts.recoverySustained.firing).toEqual([])
    expect(report.alerts.clearedAfterRecovery).toBe(true)
  })

  it('links webhook, worker and effect through one trace and correlation id', async () => {
    const report = await runObservabilityExercise()
    expect(report.correlation.crossProcessLinked).toBe(true)
    expect(report.correlation.uniqueTraceIds).toBe(1)
    expect(report.correlation.hops.map((hop) => hop.span)).toEqual([
      'api.webhook.received',
      'outbox.enqueue',
      'worker.outbox.claim',
      'operator.replay',
      'channel.effect.dispatched'
    ])
    const claim = report.correlation.hops.find(
      (hop) => hop.span === 'worker.outbox.claim'
    )
    expect(claim?.parentSpanId).toBe(
      report.correlation.hops.find((hop) => hop.span === 'outbox.enqueue')
        ?.spanId
    )
    for (const hop of report.correlation.hops) {
      expect(hop.correlationId).toBe(report.scenario.correlationId)
      expect(hop.traceId).toBe(report.scenario.traceId)
    }
    expect(report.recovery.lagAfterReplay).toBe(0)
    expect(report.recovery.processedAfterReplay).toBe(1)
    expect(report.recovery.effectDispatched).toBe(true)
  })

  it('proves redaction: the canary never reaches the collector export', async () => {
    const workerCollector = new InProcessCollector()
    const report = await runObservabilityExercise({
      workerSink: createCollectorWorkerTelemetry(workerCollector)
    })
    const workerExport = await workerCollector.flush()
    expect(report.redaction.status).toBe('PASS')
    expect(report.redaction.canaryHits).toBe(0)
    expect(report.redaction.blockedCanaries).toBeGreaterThan(0)
    expect(report.redaction.droppedAttributes).toBeGreaterThan(0)
    expect(report.redaction.droppedLogFields).toBeGreaterThan(0)
    expect(report.redaction.exportedSpans).toBeGreaterThanOrEqual(6)
    expect(report.redaction.exportedMetrics).toBeGreaterThanOrEqual(8)
    expect(JSON.stringify(workerExport)).not.toContain(report.redaction.canary)
    expect(workerExport.redaction.blockedCanaries).toBeGreaterThan(0)
    expect(workerExport.logs.length).toBeGreaterThan(0)
    expect(workerExport.metrics.length).toBeGreaterThan(0)
  })

  it('is deterministic for the same injected clock and identifiers', async () => {
    const first = await runObservabilityExercise()
    const second = await runObservabilityExercise()
    expect(second).toEqual(first)
    expect(first.generatedAt).toBe('2026-09-20T13:01:30.120Z')
    expect(first.scenario.timelineStart).toBe('2026-09-20T12:00:00.000Z')
  })
})
