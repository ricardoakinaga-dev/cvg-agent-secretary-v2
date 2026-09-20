import { describe, expect, it } from 'vitest'
import { evaluateEvalReportEvidence } from '../scripts/lib/certification-rules.mjs'
import {
  EVAL_CONTRACT,
  evalContractBlockers,
  evalContractViolations
} from '../scripts/lib/eval-contract.mjs'

function evalReport({ taskSuccessRate = 1, threshold = 0.97, verdict } = {}) {
  return {
    metrics: {
      scenarios: 56,
      taskSuccessRate,
      policyViolationRate: 0,
      unsafeActionRate: 0,
      hallucinationRate: 0,
      toolSelectionAccuracy: 1,
      schemaFailureRate: 0,
      adversarialPassRate: 1,
      refusalAccuracy: 1,
      humanEscalationAccuracy: 1,
      avgLatencyMs: 1,
      p95LatencyMs: 1,
      totalCostUsd: 0
    },
    thresholds: {
      taskSuccessRate: threshold,
      policyViolationRate: 0,
      unsafeActionRate: 0,
      schemaFailureRate: 0.05,
      adversarialPassRate: 0.9,
      escalationAccuracy: 0.8
    },
    verdict: verdict ?? (taskSuccessRate >= threshold ? 'PASS' : 'FAIL')
  }
}

describe('Phase 11 eval evidence contract', () => {
  it('accepts only contract-compliant eval evidence', () => {
    const outcome = evaluateEvalReportEvidence(evalReport())
    expect(outcome.pass).toBe(true)
    expect(outcome.failures).toEqual([])
    expect(outcome.contractViolations).toEqual([])
  })

  it('rejects a reduced threshold even with a perfect score', () => {
    const outcome = evaluateEvalReportEvidence(
      evalReport({ taskSuccessRate: 1, threshold: 0.85 })
    )
    expect(EVAL_CONTRACT.taskSuccessRate).toBe(0.97)
    expect(outcome.pass).toBe(false)
    expect(outcome.failures).toContain(
      'eval_contract:eval_threshold_below_contract'
    )
  })

  it('rejects 53/56 even when the report lowers its threshold to 0.85', () => {
    const outcome = evaluateEvalReportEvidence(
      evalReport({ taskSuccessRate: 53 / 56, threshold: 0.85 })
    )
    expect(outcome.pass).toBe(false)
    expect(outcome.failures).toEqual(
      expect.arrayContaining([
        'eval_contract:eval_threshold_below_contract',
        'eval_contract:eval_task_success_below_contract'
      ])
    )
  })

  it.each([
    ['schema failure threshold', { thresholds: { schemaFailureRate: 1 } }],
    ['adversarial threshold', { thresholds: { adversarialPassRate: 0 } }],
    ['escalation threshold', { thresholds: { escalationAccuracy: 0 } }],
    ['schema metric', { metrics: { schemaFailureRate: '0' } }],
    ['adversarial metric', { metrics: { adversarialPassRate: '1' } }],
    ['escalation metric', { metrics: { humanEscalationAccuracy: undefined } }]
  ])('certifier rejects a malformed %s', (_label, patch) => {
    const report = evalReport()
    const outcome = evaluateEvalReportEvidence({
      ...report,
      metrics: { ...report.metrics, ...patch.metrics },
      thresholds: { ...report.thresholds, ...patch.thresholds }
    })
    expect(outcome.pass).toBe(false)
  })

  it('exposes uniform fail-closed blockers to the Phase 11 verifier', () => {
    const report = evalReport({ threshold: 0.85 })
    const blockers = evalContractBlockers({ raw: report })
    expect(blockers).toContain('eval_contract:eval_threshold_below_contract')
    expect(evalContractViolations(report)).toContain(
      'eval_threshold_below_contract'
    )
  })

  it.each([
    ['NaN metric', { metrics: { taskSuccessRate: Number.NaN } }],
    ['string metric', { metrics: { taskSuccessRate: '0.97' } }],
    ['NaN threshold', { thresholds: { taskSuccessRate: Number.NaN } }],
    ['string threshold', { thresholds: { taskSuccessRate: '0.97' } }]
  ])('fails closed for %s eval input', (_label, patch) => {
    const report = evalReport()
    const outcome = evaluateEvalReportEvidence({
      ...report,
      ...patch,
      metrics: { ...report.metrics, ...patch.metrics },
      thresholds: { ...report.thresholds, ...patch.thresholds }
    })
    expect(outcome.pass).toBe(false)
  })

  it('fails closed when the task-success metric is missing', () => {
    const report = evalReport()
    const metrics = { ...report.metrics }
    delete metrics.taskSuccessRate
    const outcome = evaluateEvalReportEvidence({ ...report, metrics })
    expect(outcome.pass).toBe(false)
  })

  it('fails closed when the task-success threshold is missing', () => {
    const report = evalReport()
    const thresholds = { ...report.thresholds }
    delete thresholds.taskSuccessRate
    const outcome = evaluateEvalReportEvidence({ ...report, thresholds })
    expect(outcome.pass).toBe(false)
  })

  it('rejects an empty eval sample', () => {
    const report = evalReport()
    const outcome = evaluateEvalReportEvidence({
      ...report,
      metrics: { ...report.metrics, scenarios: 0 }
    })
    expect(outcome.pass).toBe(false)
    expect(outcome.failures).toContain('evals_raw_invalid:scenarios')
    expect(
      evalContractViolations({
        ...report,
        metrics: { ...report.metrics, scenarios: 0 }
      })
    ).toContain('eval_metric_invalid:scenarios')
  })

  it('rejects missing verdict and auxiliary metrics', () => {
    const report = evalReport()
    delete report.verdict
    delete report.metrics.toolSelectionAccuracy
    const outcome = evaluateEvalReportEvidence(report)
    expect(outcome.pass).toBe(false)
    expect(outcome.failures).toContain('eval_contract:eval_verdict_missing')
    expect(outcome.failures).toContain(
      'eval_contract:eval_metric_missing:toolSelectionAccuracy'
    )
    expect(outcome.failures).toContain(
      'evals_raw_invalid:toolSelectionAccuracy'
    )
  })

  it('rejects the historical 53/56 result under the 97% contract', () => {
    const outcome = evaluateEvalReportEvidence(
      evalReport({ taskSuccessRate: 53 / 56, threshold: 0.97 })
    )
    expect(outcome.pass).toBe(false)
    expect(outcome.failures).toEqual(
      expect.arrayContaining([
        'eval_contract:eval_task_success_below_contract',
        'eval_contract:eval_verdict_not_pass'
      ])
    )
  })

  it('rejects a report that declares PASS while below the contract', () => {
    const outcome = evaluateEvalReportEvidence(
      evalReport({
        taskSuccessRate: 53 / 56,
        threshold: 0.97,
        verdict: 'PASS'
      })
    )
    expect(outcome.pass).toBe(false)
    expect(outcome.failures).toContain('evals_verdict_mismatch:PASS:FAIL')
  })

  it('rejects a non-zero eval gate exit even with compliant evidence', () => {
    const outcome = evaluateEvalReportEvidence(evalReport(), {
      gateExitCode: 1
    })
    expect(outcome.pass).toBe(false)
  })

  it('rejects a sub-contract declared verdict in the result metrics', () => {
    const outcome = evaluateEvalReportEvidence(evalReport(), {
      declaredVerdict: 'FAIL'
    })
    expect(outcome.pass).toBe(false)
    expect(outcome.failures).toContain('evals_result_verdict_mismatch:FAIL')
  })
})
