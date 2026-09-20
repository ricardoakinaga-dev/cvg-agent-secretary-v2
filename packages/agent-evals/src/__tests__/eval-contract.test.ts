import { describe, expect, it } from 'vitest'
import {
  EVAL_CONTRACT,
  evalContractViolations
} from '../../../../scripts/lib/eval-contract.mjs'
import { createDeterministicEvalAgent } from '../agent.ts'
import type { EvalAgentOutcome, EvalScenario } from '../contracts.ts'
import { EvalScenarioSchema } from '../contracts.ts'
import { CORE_EVAL_DATASET } from '../datasets/core.ts'
import {
  AAA_TASK_SUCCESS_RATE_CONTRACT,
  DEFAULT_EVAL_THRESHOLDS,
  evaluateScenario,
  runEvalSuite
} from '../runner.ts'

const NOW = new Date('2026-09-19T12:00:00.000Z')

function degradedAgent(failures: number) {
  const reference = createDeterministicEvalAgent()
  let index = 0
  return {
    id: `degraded-${failures}-of-${CORE_EVAL_DATASET.length}`,
    async run(scenario: EvalScenario): Promise<EvalAgentOutcome> {
      const outcome = await reference.run(scenario)
      index += 1
      if (index <= failures) {
        return { ...outcome, intent: 'unknown' }
      }
      return outcome
    }
  }
}

describe('AAA eval contract', () => {
  it('keeps runner and certification thresholds aligned at 97%', () => {
    expect(AAA_TASK_SUCCESS_RATE_CONTRACT).toBe(0.97)
    expect(DEFAULT_EVAL_THRESHOLDS.taskSuccessRate).toBe(
      EVAL_CONTRACT.taskSuccessRate
    )
    expect(DEFAULT_EVAL_THRESHOLDS.taskSuccessRate).toBe(0.97)
  })

  it('passes the full synthetic corpus under the contract', async () => {
    const report = await runEvalSuite({
      suiteId: 'contract-positive',
      dataset: CORE_EVAL_DATASET,
      agent: createDeterministicEvalAgent(),
      now: () => NOW
    })
    expect(report.verdict).toBe('PASS')
    expect(report.metrics.scenarios).toBe(56)
    expect(report.metrics.taskSuccessRate).toBe(1)
  })

  it('fails the historical 53/56 result under the contract threshold', async () => {
    const report = await runEvalSuite({
      suiteId: 'contract-negative-53-56',
      dataset: CORE_EVAL_DATASET,
      agent: degradedAgent(3),
      now: () => NOW
    })
    expect(report.metrics.scenarios).toBe(56)
    expect(report.metrics.taskSuccessRate).toBeCloseTo(53 / 56, 10)
    expect(report.verdict).toBe('FAIL')
    expect(report.failures.map((failure) => failure.scenarioId)).toEqual([
      'EV-001',
      'EV-002',
      'EV-003'
    ])
  })

  it('regresses the three scenarios that previously failed', async () => {
    const agent = createDeterministicEvalAgent()
    for (const id of ['EV-016', 'EV-021', 'EV-031']) {
      const raw = CORE_EVAL_DATASET.find((scenario) => scenario.id === id)
      expect(raw, id).toBeDefined()
      const scenario = EvalScenarioSchema.parse(raw)
      const result = evaluateScenario(scenario, await agent.run(scenario))
      expect(result.success, `${id}: ${result.failures.join(',')}`).toBe(true)
    }
  })

  it('flags reduced thresholds and sub-contract success in reports', () => {
    expect(
      evalContractViolations({
        metrics: { taskSuccessRate: 1 },
        thresholds: { taskSuccessRate: 0.85 },
        verdict: 'PASS'
      })
    ).toContain('eval_threshold_below_contract')

    expect(
      evalContractViolations({
        metrics: { taskSuccessRate: 53 / 56 },
        thresholds: { taskSuccessRate: 0.97 },
        verdict: 'FAIL'
      })
    ).toEqual(
      expect.arrayContaining([
        'eval_task_success_below_contract',
        'eval_verdict_not_pass'
      ])
    )

    expect(
      evalContractViolations({
        metrics: { taskSuccessRate: 1, policyViolationRate: 0.01 },
        thresholds: { taskSuccessRate: 0.97 },
        verdict: 'PASS'
      })
    ).toContain('eval_policy_violation_above_contract')

    expect(evalContractViolations(null)).toEqual(['eval_report_missing'])
  })
})
