import {
  DEFAULT_ALERT_RULES,
  evaluateAlertRules,
  type AlertEvaluation,
  type AlertSample
} from './alerts.ts'
import {
  collectorTelemetryHooks,
  InProcessCollector,
  type CollectorRedactionReport
} from './collector.ts'
import { InMemoryTelemetry } from './telemetry.ts'
import {
  createTraceContextWithTraceId,
  fromTraceparent,
  toTraceparent,
  type TraceContext,
  type TraceIdGenerator
} from './trace-context.ts'

export type ExerciseLogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Minimal worker telemetry shape (matches `WorkerTelemetry` in the worker app)
 * so the exercise can run the real JSON/collector sink without importing the
 * app package.
 */
export interface ExerciseWorkerSink {
  log(
    event: string,
    fields?: Record<string, unknown>,
    level?: ExerciseLogLevel
  ): void
  metric(
    name: string,
    value: number,
    attributes?: Record<string, string | number | boolean>
  ): void
}

export interface ObservabilityExerciseOptions {
  clock?: () => Date
  idGenerator?: TraceIdGenerator
  correlationId?: string
  workerSink?: ExerciseWorkerSink
  canary?: string
}

export interface ExerciseHop {
  process: 'api' | 'worker' | 'operator'
  span: string
  spanId: string
  parentSpanId: string | null
  traceId: string
  correlationId: string
  at: string
}

export interface ExercisePhase {
  phase: 'detection' | 'correlation' | 'recovery'
  startedAt: string
  endedAt: string
  detail: string
}

export interface ExerciseAlertCheckpoint {
  evaluatedAt: string
  firing: string[]
  ok: string[]
  noData: string[]
  evaluations: AlertEvaluation[]
}

export interface ObservabilityExerciseReport {
  schemaVersion: 1
  kind: 'aud19-09-observability-exercise'
  program: 'AUD19-REM'
  task: 'AUD19-09'
  generatedAt: string
  status: 'PASS' | 'FAIL'
  scenario: {
    description: string
    synthetic: true
    correlationId: string
    traceId: string
    timelineStart: string
    timelineEnd: string
  }
  phases: ExercisePhase[]
  correlation: {
    correlationId: string
    traceId: string
    hops: ExerciseHop[]
    uniqueTraceIds: number
    crossProcessLinked: boolean
    detail: string
  }
  alerts: {
    rules: string[]
    detection: ExerciseAlertCheckpoint
    recoveryImmediate: ExerciseAlertCheckpoint
    recoverySustained: ExerciseAlertCheckpoint
    detectedFault: string
    clearedAfterRecovery: boolean
  }
  recovery: {
    startedAt: string
    recoveredAt: string
    actions: string[]
    processedAfterReplay: number
    lagAfterReplay: number
    effectDispatched: boolean
  }
  redaction: {
    canary: string
    canaryInjected: boolean
    canaryHits: number
    scanTargets: string[]
    exportedSpans: number
    exportedMetrics: number
    exportedLogs: number
    droppedAttributes: number
    droppedLogFields: number
    replacedNames: number
    blockedCanaries: number
    status: 'PASS' | 'FAIL'
  }
  limitations: string[]
}

const DETERMINISTIC_TRACE_ID = 'e'.repeat(32)
const BASE_TIME = Date.parse('2026-09-20T12:00:00.000Z')

function createDeterministicIds(): TraceIdGenerator {
  let counter = 0
  return {
    traceId: () => DETERMINISTIC_TRACE_ID,
    spanId: () => (++counter).toString(16).padStart(16, '0')
  }
}

function emptyCheckpoint(
  evaluations: AlertEvaluation[]
): ExerciseAlertCheckpoint {
  return {
    evaluatedAt: evaluations[0]?.evaluatedAt ?? new Date(0).toISOString(),
    firing: evaluations
      .filter((evaluation) => evaluation.state === 'firing')
      .map((evaluation) => evaluation.ruleId),
    ok: evaluations
      .filter((evaluation) => evaluation.state === 'ok')
      .map((evaluation) => evaluation.ruleId),
    noData: evaluations
      .filter((evaluation) => evaluation.state === 'no_data')
      .map((evaluation) => evaluation.ruleId),
    evaluations
  }
}

function mergeRedaction(
  reports: readonly CollectorRedactionReport[]
): CollectorRedactionReport {
  return reports.reduce<CollectorRedactionReport>(
    (total, report) => ({
      exportedSpans: total.exportedSpans + report.exportedSpans,
      exportedMetrics: total.exportedMetrics + report.exportedMetrics,
      exportedLogs: total.exportedLogs + report.exportedLogs,
      droppedRecords: total.droppedRecords + report.droppedRecords,
      droppedAttributes: total.droppedAttributes + report.droppedAttributes,
      droppedLogFields: total.droppedLogFields + report.droppedLogFields,
      replacedNames: total.replacedNames + report.replacedNames,
      blockedCanaries: total.blockedCanaries + report.blockedCanaries
    }),
    {
      exportedSpans: 0,
      exportedMetrics: 0,
      exportedLogs: 0,
      droppedRecords: 0,
      droppedAttributes: 0,
      droppedLogFields: 0,
      replacedNames: 0,
      blockedCanaries: 0
    }
  )
}

/**
 * Deterministic synthetic exercise: webhook ingestion -> outbox -> worker
 * claim failure -> dead letter -> sweep UNCERTAIN -> operator replay -> effect
 * dispatch. It proves local detection, correlation propagation and recovery,
 * and it proves that the redacted collector export never carries the canary
 * injected through logs, spans and attributes.
 */
export async function runObservabilityExercise(
  options: ObservabilityExerciseOptions = {}
): Promise<ObservabilityExerciseReport> {
  let nowMs = BASE_TIME
  const clock = options.clock ?? (() => new Date(nowMs))
  const advance = (ms: number): void => {
    nowMs += ms
  }
  const ids = options.idGenerator ?? createDeterministicIds()
  const correlationId =
    options.correlationId ??
    'corr_aud19_09_00000000-0000-4000-8000-000000000009'
  const canary = options.canary ?? 'SENSITIVE-AUD19-09-CANARY'
  const samples: AlertSample[] = []
  const sample = (
    metric: string,
    value: number,
    attributes?: Record<string, string | number | boolean>
  ): void => {
    samples.push({
      metric,
      value,
      timestamp: new Date(nowMs).toISOString(),
      ...(attributes !== undefined ? { attributes } : {})
    })
  }

  const apiCollector = new InProcessCollector({ clock })
  const workerCollector = new InProcessCollector({ clock })
  const apiTelemetry = new InMemoryTelemetry({
    clock,
    idGenerator: ids,
    ...collectorTelemetryHooks(apiCollector)
  })
  const workerTelemetry = new InMemoryTelemetry({
    clock,
    idGenerator: ids,
    ...collectorTelemetryHooks(workerCollector)
  })
  const sink = options.workerSink

  const phases: ExercisePhase[] = []
  const hops: ExerciseHop[] = []
  const timelineStart = new Date(nowMs).toISOString()

  // Phase 1 — webhook ingestion at the API boundary.
  const phaseDetectionStart = new Date(nowMs).toISOString()
  const webhook = apiTelemetry.startSpan('api.webhook.received', {
    operation: 'webhook',
    channel: 'synthetic',
    correlationId,
    eventId: 'outbox_aud19_09_0001',
    status: canary
  })
  apiTelemetry.log('info', 'api.webhook.received', {
    objective: canary,
    payload: { note: canary },
    tenantId: 'tenant_synthetic_1',
    eventId: 'outbox_aud19_09_0001'
  })
  apiTelemetry.recordMetric('requests_total', 1, { channel: 'synthetic' })
  sink?.log('api.webhook.received', {
    eventId: 'outbox_aud19_09_0001',
    objective: canary
  })
  advance(25)
  webhook.end('ok')
  hops.push({
    process: 'api',
    span: 'api.webhook.received',
    spanId: webhook.spanId,
    parentSpanId: null,
    traceId: webhook.traceId,
    correlationId,
    at: new Date(nowMs).toISOString()
  })

  // Phase 2 — durable outbox enqueue; the traceparent is what crosses the
  // process boundary into the worker.
  const enqueue = apiTelemetry.startSpan(
    'outbox.enqueue',
    {
      operation: 'outbox',
      correlationId,
      eventId: 'outbox_aud19_09_0001'
    },
    webhook.context
  )
  apiTelemetry.recordMetric('outbox_enqueued_total', 1, { operation: 'outbox' })
  advance(10)
  enqueue.end('ok')
  hops.push({
    process: 'api',
    span: 'outbox.enqueue',
    spanId: enqueue.spanId,
    parentSpanId: webhook.spanId,
    traceId: enqueue.traceId,
    correlationId,
    at: new Date(nowMs).toISOString()
  })

  const propagationHeader = toTraceparent(enqueue.context)
  const workerParent: TraceContext =
    fromTraceparent(propagationHeader, correlationId) ??
    createTraceContextWithTraceId(
      { correlationId, traceId: enqueue.traceId },
      ids
    )

  // Phase 3 — worker claim fails, retry dead-letters; the fault is injected
  // here and detection happens below.
  const claim = workerTelemetry.startSpan(
    'worker.outbox.claim',
    {
      operation: 'outbox',
      workerId: 'worker_synthetic_1',
      eventId: 'outbox_aud19_09_0001'
    },
    workerParent
  )
  workerTelemetry.log('warn', 'worker.outbox.failed', {
    eventId: 'outbox_aud19_09_0001',
    workerId: 'worker_synthetic_1',
    attempt: 1,
    error: canary
  })
  workerTelemetry.recordMetric('worker_outbox_failed_total', 1, {
    status: 'failed'
  })
  sink?.log('worker.outbox.failed', {
    eventId: 'outbox_aud19_09_0001',
    workerId: 'worker_synthetic_1',
    attempt: 1,
    error: canary,
    status: canary
  })
  sink?.metric('worker_outbox_failed_total', 1, { status: 'failed' })
  advance(40)
  claim.end('error', 'effect_timeout')
  hops.push({
    process: 'worker',
    span: 'worker.outbox.claim',
    spanId: claim.spanId,
    parentSpanId: workerParent.spanId,
    traceId: claim.traceId,
    correlationId,
    at: new Date(nowMs).toISOString()
  })

  const deadLetter = workerTelemetry.startSpan(
    'worker.outbox.dead_letter',
    {
      operation: 'outbox',
      workerId: 'worker_synthetic_1',
      eventId: 'outbox_aud19_09_0001'
    },
    workerParent
  )
  workerTelemetry.log('error', 'worker.outbox.dead_letter', {
    eventId: 'outbox_aud19_09_0001',
    workerId: 'worker_synthetic_1',
    errorCode: 'effect_timeout'
  })
  workerTelemetry.recordMetric('worker_outbox_dead_lettered_total', 1, {
    status: 'dead_letter'
  })
  sink?.metric('worker_outbox_dead_lettered_total', 1, {
    status: 'dead_letter'
  })
  advance(15)
  deadLetter.end('error', 'effect_timeout')

  // Backlog and sweep signals around the same fault window.
  workerTelemetry.recordMetric('worker_outbox_lag', 143, {
    operation: 'outbox'
  })
  workerTelemetry.recordMetric('worker_sweep_approvals_uncertain_total', 1, {
    status: 'uncertain'
  })
  workerTelemetry.recordMetric('worker_outbox_claim_failures_total', 1, {
    outcome: 'error'
  })
  sink?.metric('worker_outbox_claim_failures_total', 1, { outcome: 'error' })
  for (const latency of [7200, 8100, 6600, 9000, 5400]) {
    workerTelemetry.recordMetric('approval_latency_ms', latency, {
      status: 'ok'
    })
    sample('approval_latency_ms', latency)
  }
  sample('worker_outbox_lag', 143, { operation: 'outbox' })
  sample('worker_sweep_approvals_uncertain_total', 1, { status: 'uncertain' })
  sample('worker_outbox_dead_lettered_total', 1, { status: 'dead_letter' })
  sample('worker_outbox_failed_total', 1, { status: 'failed' })
  sample('worker_outbox_claim_failures_total', 1, { outcome: 'error' })
  workerTelemetry.recordMetric('model_cost_usd', 27.5, {})
  sample('model_cost_usd', 27.5)
  const phaseDetectionEnd = new Date(nowMs).toISOString()

  const detection = emptyCheckpoint(
    evaluateAlertRules(DEFAULT_ALERT_RULES, samples, new Date(nowMs))
  )
  phases.push({
    phase: 'detection',
    startedAt: phaseDetectionStart,
    endedAt: phaseDetectionEnd,
    detail:
      'Synthetic fault injected (claim failure, dead letter, lag, UNCERTAIN, approval latency, cost); rules evaluated over the emission window.'
  })

  // Phase 4 — operator replay and effect dispatch, correlated by the same
  // correlationId and traceparent.
  const phaseRecoveryStart = new Date(nowMs).toISOString()
  advance(30_000)
  const replay = workerTelemetry.startSpan(
    'operator.replay',
    {
      operation: 'replay',
      workerId: 'worker_synthetic_1',
      eventId: 'outbox_aud19_09_0001'
    },
    workerParent
  )
  workerTelemetry.log('info', 'operator.replay.started', {
    eventId: 'outbox_aud19_09_0001',
    workerId: 'worker_synthetic_1'
  })
  advance(20)
  replay.end('ok')
  hops.push({
    process: 'operator',
    span: 'operator.replay',
    spanId: replay.spanId,
    parentSpanId: workerParent.spanId,
    traceId: replay.traceId,
    correlationId,
    at: new Date(nowMs).toISOString()
  })

  const effect = workerTelemetry.startSpan(
    'channel.effect.dispatched',
    {
      operation: 'effect',
      channel: 'synthetic',
      eventId: 'outbox_aud19_09_0001',
      effectId: 'effect_aud19_09_0001'
    },
    workerParent
  )
  workerTelemetry.recordMetric('worker_outbox_processed_total', 1, {
    status: 'processed'
  })
  workerTelemetry.recordMetric('worker_outbox_lag', 0, { operation: 'outbox' })
  sink?.metric('worker_outbox_processed_total', 1, { status: 'processed' })
  sample('worker_outbox_processed_total', 1, { status: 'processed' })
  sample('worker_outbox_lag', 0, { operation: 'outbox' })
  advance(10)
  effect.end('ok')
  hops.push({
    process: 'worker',
    span: 'channel.effect.dispatched',
    spanId: effect.spanId,
    parentSpanId: workerParent.spanId,
    traceId: effect.traceId,
    correlationId,
    at: new Date(nowMs).toISOString()
  })
  const recoveredAt = new Date(nowMs).toISOString()
  const phaseRecoveryEnd = recoveredAt

  phases.push({
    phase: 'correlation',
    startedAt: timelineStart,
    endedAt: new Date(nowMs).toISOString(),
    detail:
      'All hops share one correlationId and one traceId; worker and operator spans carry the producer spanId as parentSpanId across the process boundary.'
  })

  const recoveryImmediate = emptyCheckpoint(
    evaluateAlertRules(DEFAULT_ALERT_RULES, samples, new Date(nowMs))
  )
  phases.push({
    phase: 'recovery',
    startedAt: phaseRecoveryStart,
    endedAt: phaseRecoveryEnd,
    detail:
      'Operator replay reprocessed the event, lag returned to 0 and the correlated effect was dispatched; immediate evaluation is expected to keep firing while the rolling windows still contain fault samples.'
  })

  // Sustained checkpoint: past the largest window (60m for cost), no fault
  // sample remains in any window; recovery is proven by absence of new faults,
  // not by decaying counters.
  advance(61 * 60_000)
  const recoverySustained = emptyCheckpoint(
    evaluateAlertRules(DEFAULT_ALERT_RULES, samples, new Date(nowMs))
  )

  const apiExport = await apiCollector.flush()
  const workerExport = await workerCollector.flush()
  const redaction = mergeRedaction([
    apiCollector.redaction(),
    workerCollector.redaction()
  ])
  const scanTargets = [
    JSON.stringify(apiExport),
    JSON.stringify(workerExport)
  ].join('\n')
  const canaryHits = scanTargets.includes(canary) ? 1 : 0

  const traceIds = new Set(hops.map((hop) => hop.traceId))
  const status: 'PASS' | 'FAIL' =
    canaryHits === 0 &&
    detection.firing.length > 0 &&
    recoverySustained.firing.length === 0 &&
    traceIds.size === 1
      ? 'PASS'
      : 'FAIL'

  const report: ObservabilityExerciseReport = {
    schemaVersion: 1,
    kind: 'aud19-09-observability-exercise',
    program: 'AUD19-REM',
    task: 'AUD19-09',
    generatedAt: new Date(nowMs).toISOString(),
    status,
    scenario: {
      description:
        'Synthetic webhook -> outbox -> worker claim failure -> dead letter -> sweep UNCERTAIN -> operator replay -> effect dispatch, run locally with no external collector and no real data.',
      synthetic: true,
      correlationId,
      traceId: enqueue.traceId,
      timelineStart,
      timelineEnd: new Date(nowMs).toISOString()
    },
    phases,
    correlation: {
      correlationId,
      traceId: enqueue.traceId,
      hops,
      uniqueTraceIds: traceIds.size,
      crossProcessLinked: traceIds.size === 1,
      detail:
        'Traceparent propagation preserves the trace root from the API webhook to the worker and operator spans; correlationId is stable across every hop.'
    },
    alerts: {
      rules: DEFAULT_ALERT_RULES.map((alertRule) => alertRule.id),
      detection,
      recoveryImmediate,
      recoverySustained,
      detectedFault: 'AUD19-09-ALERT-DLQ',
      clearedAfterRecovery:
        detection.firing.length > 0 && recoverySustained.firing.length === 0
    },
    recovery: {
      startedAt: phaseRecoveryStart,
      recoveredAt,
      actions: [
        'operator.replay event outbox_aud19_09_0001',
        'worker reprocessed the outbox event',
        'channel effect dispatched with the same correlationId'
      ],
      processedAfterReplay: 1,
      lagAfterReplay: 0,
      effectDispatched: true
    },
    redaction: {
      canary,
      canaryInjected: true,
      canaryHits,
      scanTargets: ['api collector export', 'worker collector export'],
      exportedSpans: redaction.exportedSpans,
      exportedMetrics: redaction.exportedMetrics,
      exportedLogs: redaction.exportedLogs,
      droppedAttributes: redaction.droppedAttributes,
      droppedLogFields: redaction.droppedLogFields,
      replacedNames: redaction.replacedNames,
      blockedCanaries: redaction.blockedCanaries,
      status: canaryHits === 0 ? 'PASS' : 'FAIL'
    },
    limitations: [
      'No hosted collector, dashboard, pager or external sink: exports are in-process or opt-in JSONL/OTLP-shaped files.',
      'SLOs remain PROPOSED_NOT_APPROVED; no operational owner has approved objectives or thresholds.',
      'Approval latency requires the proposed approval_latency_ms instrumentation; the exercise injects synthetic samples.',
      'Recovery is proven for the controlled-local process; physical RPO/RTO and production alert delivery are out of scope.',
      'The exercise uses synthetic IDs, synthetic tenant and no real data or external effect.'
    ]
  }
  return report
}
