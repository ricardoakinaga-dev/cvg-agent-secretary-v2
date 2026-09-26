import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  ALERT_DOMAINS,
  DEFAULT_ALERT_RULES,
  aggregateAlertSamples,
  evaluateAlertRules,
  type AlertSample
} from '../alerts.ts'

const NOW = new Date('2026-09-20T12:00:00.000Z')

function sample(
  metric: string,
  value: number,
  offsetMs = 0,
  attributes?: Record<string, string | number | boolean>
): AlertSample {
  return {
    metric,
    value,
    timestamp: new Date(NOW.getTime() + offsetMs).toISOString(),
    ...(attributes !== undefined ? { attributes } : {})
  }
}

function stateOf(
  samples: readonly AlertSample[],
  ruleId: string
): string | undefined {
  return evaluateAlertRules(DEFAULT_ALERT_RULES, samples, NOW).find(
    (evaluation) => evaluation.ruleId === ruleId
  )?.state
}

describe('alert rules', () => {
  it('covers every AUD19-09 domain with the approved operations owner', () => {
    const domains = new Set(DEFAULT_ALERT_RULES.map((rule) => rule.domain))
    expect([...domains].sort()).toEqual([...ALERT_DOMAINS].sort())
    for (const rule of DEFAULT_ALERT_RULES) {
      expect(rule.owner).toBe('operations')
      expect(rule.sloStatus).toBe('APPROVED')
      expect(rule.runbook.startsWith('docs/08_runtime/runbooks/')).toBe(true)
      expect(rule.threshold).toBeTypeOf('number')
      expect(rule.windowMs).toBeGreaterThan(0)
    }
  })

  it('detects an injected synthetic failure per domain', () => {
    const samples: AlertSample[] = [
      sample('worker_outbox_lag', 143),
      sample('worker_outbox_lease_lost_total', 1),
      ...[0, 1, 2, 3, 4].map(() => sample('approval_latency_ms', 9_000)),
      sample('worker_sweep_approvals_uncertain_total', 1),
      sample('worker_outbox_dead_lettered_total', 1),
      sample('worker_outbox_handoffs_total', 6),
      sample('worker_outbox_errors_total', 4),
      sample('model_cost_usd', 30)
    ]
    const evaluations = evaluateAlertRules(DEFAULT_ALERT_RULES, samples, NOW)
    for (const evaluation of evaluations) {
      expect(evaluation.state, evaluation.ruleId).toBe('firing')
      expect(evaluation.observed, evaluation.ruleId).not.toBeNull()
    }
  })

  it('stays ok below threshold and no_data on an empty window', () => {
    const healthy: AlertSample[] = [
      sample('worker_outbox_lag', 4),
      sample('worker_outbox_errors_total', 1),
      sample('worker_outbox_failed_total', 1)
    ]
    expect(stateOf(healthy, 'AUD19-09-ALERT-QUEUE-LAG')).toBe('ok')
    expect(stateOf(healthy, 'AUD19-09-ALERT-ERRORS')).toBe('ok')
    expect(stateOf(healthy, 'AUD19-09-ALERT-DLQ')).toBe('no_data')
    expect(stateOf(healthy, 'AUD19-09-ALERT-HANDOFF')).toBe('no_data')
    expect(stateOf([], 'AUD19-09-ALERT-QUEUE-LAG')).toBe('no_data')
  })

  it('applies per-metric attribute filters instead of firing on healthy samples', () => {
    const claimed = [
      sample('orchestrator_step_claim_total', 1, 0, { outcome: 'claimed' })
    ]
    const conflicted = [
      sample('orchestrator_step_claim_total', 1, 0, { outcome: 'conflict' })
    ]
    expect(stateOf(claimed, 'AUD19-09-ALERT-LEASE-CLAIM')).not.toBe('firing')
    expect(stateOf(conflicted, 'AUD19-09-ALERT-LEASE-CLAIM')).toBe('firing')
    expect(stateOf(claimed, 'AUD19-09-ALERT-ERRORS')).toBe('no_data')
  })

  it('aggregates p95 with nearest-rank semantics', () => {
    expect(aggregateAlertSamples([1, 2, 3, 4, 5], 'p95')).toBe(5)
    expect(aggregateAlertSamples([5, 1, 4, 2, 3], 'p95')).toBe(5)
    expect(aggregateAlertSamples([10, 20], 'avg')).toBe(15)
    expect(aggregateAlertSamples([10, 20], 'sum')).toBe(30)
    expect(aggregateAlertSamples([10, 20], 'count')).toBe(2)
    expect(aggregateAlertSamples([10, 20], 'max')).toBe(20)
    expect(aggregateAlertSamples([10, 20], 'min')).toBe(10)
    expect(aggregateAlertSamples([], 'sum')).toBe(0)
  })

  it('ignores malformed timestamps and out-of-window samples', () => {
    const stale = [
      sample('worker_outbox_dead_lettered_total', 1, -16 * 60_000),
      {
        metric: 'worker_outbox_dead_lettered_total',
        value: 1,
        timestamp: 'nope'
      }
    ]
    expect(stateOf(stale, 'AUD19-09-ALERT-DLQ')).toBe('no_data')
  })
})

describe('alert runbooks', () => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
    scripts: Record<string, string>
  }

  it('binds every alert to an existing runbook that names it', () => {
    for (const rule of DEFAULT_ALERT_RULES) {
      expect(existsSync(rule.runbook), rule.runbook).toBe(true)
      const content = readFileSync(rule.runbook, 'utf8')
      expect(content).toContain(rule.id)
      expect(content.toLowerCase()).toContain('recovery criteria')
      expect(content).toContain('correlationId')
      const index = readFileSync('docs/08_runtime/runbooks/README.md', 'utf8')
      expect(index).toContain(rule.id)
    }
  })

  it('only cites commands that exist in this repository', () => {
    for (const rule of DEFAULT_ALERT_RULES) {
      const content = readFileSync(rule.runbook, 'utf8')
      for (const match of content.matchAll(/npm run ([a-zA-Z0-9:_-]+)/g)) {
        const script = match[1] ?? ''
        expect(
          Object.hasOwn(packageJson.scripts, script),
          `${rule.runbook} cites missing npm script ${script}`
        ).toBe(true)
      }
      for (const match of content.matchAll(
        /npx tsx (scripts\/[A-Za-z0-9._/-]+)/g
      )) {
        const scriptPath = match[1] ?? ''
        expect(
          existsSync(scriptPath),
          `${rule.runbook} cites missing script ${scriptPath}`
        ).toBe(true)
      }
    }
  })

  it('requires safe inspection or explicit dry-run commands', () => {
    for (const rule of DEFAULT_ALERT_RULES) {
      const content = readFileSync(rule.runbook, 'utf8')
      const hasInspection =
        content.includes('--dry-run') ||
        content.includes('npm run docs:check') ||
        content.includes('npm run readiness')
      expect(
        hasInspection,
        `${rule.runbook} needs a dry-run or inspection command`
      ).toBe(true)
    }
  })
})
