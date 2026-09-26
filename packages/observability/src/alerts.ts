export const ALERT_DOMAINS = [
  'queue',
  'lease',
  'approval',
  'uncertain',
  'dlq',
  'handoff',
  'errors',
  'cost'
] as const

export type AlertDomain = (typeof ALERT_DOMAINS)[number]

export type AlertAggregation = 'sum' | 'count' | 'max' | 'min' | 'avg' | 'p95'
export type AlertComparison = 'gt' | 'gte' | 'lt' | 'lte'
export type AlertState = 'firing' | 'ok' | 'no_data'
export type AlertSeverity = 'P1' | 'P2' | 'P3'

export interface AlertSample {
  metric: string
  value: number
  timestamp: string
  attributes?: Record<string, string | number | boolean>
}

/**
 * Executable alert rule. Thresholds are parameters, not prose: the same rule
 * object is what a test injects a synthetic failure into and what an operator
 * tunes after the operational owner approves objectives.
 */
export interface AlertRule {
  id: string
  domain: AlertDomain
  severity: AlertSeverity
  description: string
  metrics: readonly string[]
  /**
   * Optional per-metric attribute equality filters, applied before
   * aggregation. They keep mixed-outcome counters (for example
   * `orchestrator_step_claim_total`) from firing on healthy samples.
   */
  metricFilters?: Record<string, Record<string, string | number | boolean>>
  aggregation: AlertAggregation
  comparison: AlertComparison
  threshold: number
  windowMs: number
  minSamples: number
  runbook: string
  owner: string | null
  sloStatus: 'APPROVED' | 'PROPOSED_NOT_APPROVED'
}

export interface AlertEvaluation {
  ruleId: string
  domain: AlertDomain
  severity: AlertSeverity
  state: AlertState
  observed: number | null
  threshold: number
  aggregation: AlertAggregation
  comparison: AlertComparison
  windowMs: number
  sampleCount: number
  evaluatedAt: string
  runbook: string
  owner: string | null
}

export const RUNBOOK_DIRECTORY = 'docs/08_runtime/runbooks'

function rule(
  input: Omit<AlertRule, 'owner' | 'sloStatus' | 'minSamples'> & {
    minSamples?: number
  }
): AlertRule {
  return {
    ...input,
    minSamples: input.minSamples ?? 1,
    owner: 'operations',
    sloStatus: 'APPROVED'
  }
}

/**
 * Default local rules covering the AUD19-09 domains: queue lag, lease/claim,
 * approval latency, UNCERTAIN, DLQ, handoff, errors and cost. Every rule is
 * bound to exactly one runbook under `docs/08_runtime/runbooks/`.
 */
export const DEFAULT_ALERT_RULES: readonly AlertRule[] = [
  rule({
    id: 'AUD19-09-ALERT-QUEUE-LAG',
    domain: 'queue',
    severity: 'P2',
    description:
      'Outbox backlog is above the controlled-local threshold; the queue is not draining.',
    metrics: ['worker_outbox_lag'],
    aggregation: 'max',
    comparison: 'gt',
    threshold: 100,
    windowMs: 5 * 60_000,
    runbook: `${RUNBOOK_DIRECTORY}/AUD19-09-ALERT-QUEUE-LAG.md`
  }),
  rule({
    id: 'AUD19-09-ALERT-LEASE-CLAIM',
    domain: 'lease',
    severity: 'P1',
    description:
      'A lease was lost or a claim failed; concurrent ownership is uncertain.',
    metrics: [
      'worker_outbox_lease_lost_total',
      'worker_outbox_claim_failures_total',
      'orchestrator_step_claim_total'
    ],
    metricFilters: {
      orchestrator_step_claim_total: { outcome: 'conflict' }
    },
    aggregation: 'sum',
    comparison: 'gt',
    threshold: 0,
    windowMs: 5 * 60_000,
    runbook: `${RUNBOOK_DIRECTORY}/AUD19-09-ALERT-LEASE-CLAIM.md`
  }),
  rule({
    id: 'AUD19-09-ALERT-APPROVAL-LATENCY',
    domain: 'approval',
    severity: 'P1',
    description:
      'Approval latency p95 exceeds the proposed window; acknowledgements wait too long.',
    metrics: ['approval_latency_ms'],
    aggregation: 'p95',
    comparison: 'gt',
    threshold: 5_000,
    windowMs: 15 * 60_000,
    minSamples: 5,
    runbook: `${RUNBOOK_DIRECTORY}/AUD19-09-ALERT-APPROVAL-LATENCY.md`
  }),
  rule({
    id: 'AUD19-09-ALERT-UNCERTAIN',
    domain: 'uncertain',
    severity: 'P1',
    description:
      'Approvals or steps settled as UNCERTAIN; an operator must inspect before continuation.',
    metrics: [
      'worker_sweep_approvals_uncertain_total',
      'orchestrator_step_settle_total'
    ],
    metricFilters: {
      orchestrator_step_settle_total: { outcome: 'uncertain' }
    },
    aggregation: 'sum',
    comparison: 'gt',
    threshold: 0,
    windowMs: 15 * 60_000,
    runbook: `${RUNBOOK_DIRECTORY}/AUD19-09-ALERT-UNCERTAIN.md`
  }),
  rule({
    id: 'AUD19-09-ALERT-DLQ',
    domain: 'dlq',
    severity: 'P1',
    description:
      'An outbox event reached the dead-letter queue; effects may be missing.',
    metrics: ['worker_outbox_dead_lettered_total'],
    aggregation: 'sum',
    comparison: 'gt',
    threshold: 0,
    windowMs: 15 * 60_000,
    runbook: `${RUNBOOK_DIRECTORY}/AUD19-09-ALERT-DLQ.md`
  }),
  rule({
    id: 'AUD19-09-ALERT-HANDOFF',
    domain: 'handoff',
    severity: 'P2',
    description:
      'Human handoffs surged above the expected rate for the controlled local run.',
    metrics: ['worker_outbox_handoffs_total'],
    aggregation: 'sum',
    comparison: 'gt',
    threshold: 5,
    windowMs: 15 * 60_000,
    runbook: `${RUNBOOK_DIRECTORY}/AUD19-09-ALERT-HANDOFF.md`
  }),
  rule({
    id: 'AUD19-09-ALERT-ERRORS',
    domain: 'errors',
    severity: 'P1',
    description:
      'Worker errors or failures accumulated; processing is degraded even if no DLQ yet.',
    metrics: [
      'worker_outbox_errors_total',
      'worker_outbox_failed_total',
      'worker_sweep_failures_total',
      'worker_outbox_claim_failures_total'
    ],
    aggregation: 'sum',
    comparison: 'gt',
    threshold: 3,
    windowMs: 5 * 60_000,
    runbook: `${RUNBOOK_DIRECTORY}/AUD19-09-ALERT-ERRORS.md`
  }),
  rule({
    id: 'AUD19-09-ALERT-COST',
    domain: 'cost',
    severity: 'P2',
    description:
      'Model cost accumulated above the proposed hourly budget for synthetic runs.',
    metrics: ['model_cost_usd'],
    aggregation: 'sum',
    comparison: 'gt',
    threshold: 25,
    windowMs: 60 * 60_000,
    runbook: `${RUNBOOK_DIRECTORY}/AUD19-09-ALERT-COST.md`
  })
]

function percentile(values: readonly number[], percentileRank: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((left, right) => left - right)
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentileRank / 100) * sorted.length) - 1)
  )
  return sorted[index] ?? 0
}

export function aggregateAlertSamples(
  samples: readonly number[],
  aggregation: AlertAggregation
): number {
  if (samples.length === 0) return 0
  switch (aggregation) {
    case 'sum':
      return samples.reduce((total, value) => total + value, 0)
    case 'count':
      return samples.length
    case 'max':
      return Math.max(...samples)
    case 'min':
      return Math.min(...samples)
    case 'avg':
      return samples.reduce((total, value) => total + value, 0) / samples.length
    case 'p95':
      return percentile(samples, 95)
  }
}

function compare(
  value: number,
  comparison: AlertComparison,
  threshold: number
): boolean {
  switch (comparison) {
    case 'gt':
      return value > threshold
    case 'gte':
      return value >= threshold
    case 'lt':
      return value < threshold
    case 'lte':
      return value <= threshold
  }
}

function samplesInWindow(
  rule: AlertRule,
  samples: readonly AlertSample[],
  nowMs: number
): number[] {
  const startMs = nowMs - rule.windowMs
  return samples
    .filter((sample) => rule.metrics.includes(sample.metric))
    .filter((sample) => {
      const filter = rule.metricFilters?.[sample.metric]
      if (!filter) return true
      return Object.entries(filter).every(
        ([key, value]) => sample.attributes?.[key] === value
      )
    })
    .filter((sample) => {
      const at = Date.parse(sample.timestamp)
      return Number.isFinite(at) && at > startMs && at <= nowMs
    })
    .map((sample) => sample.value)
    .filter((value) => Number.isFinite(value))
}

/**
 * Deterministic evaluation of parameterized rules over synthetic samples.
 * `no_data` is not `ok`: a window with too few samples proves nothing and must
 * not be read as recovery.
 */
export function evaluateAlertRules(
  rules: readonly AlertRule[],
  samples: readonly AlertSample[],
  now: Date = new Date()
): AlertEvaluation[] {
  const nowMs = now.getTime()
  return rules.map((alertRule) => {
    const values = samplesInWindow(alertRule, samples, nowMs)
    const base = {
      ruleId: alertRule.id,
      domain: alertRule.domain,
      severity: alertRule.severity,
      threshold: alertRule.threshold,
      aggregation: alertRule.aggregation,
      comparison: alertRule.comparison,
      windowMs: alertRule.windowMs,
      sampleCount: values.length,
      evaluatedAt: now.toISOString(),
      runbook: alertRule.runbook,
      owner: alertRule.owner
    } satisfies Omit<AlertEvaluation, 'state' | 'observed'>
    if (values.length < alertRule.minSamples) {
      return { ...base, state: 'no_data' as const, observed: null }
    }
    const observed = aggregateAlertSamples(values, alertRule.aggregation)
    return {
      ...base,
      state: compare(observed, alertRule.comparison, alertRule.threshold)
        ? ('firing' as const)
        : ('ok' as const),
      observed
    }
  })
}

export function findAlertRule(
  id: string,
  rules: readonly AlertRule[] = DEFAULT_ALERT_RULES
): AlertRule | undefined {
  return rules.find((candidate) => candidate.id === id)
}
