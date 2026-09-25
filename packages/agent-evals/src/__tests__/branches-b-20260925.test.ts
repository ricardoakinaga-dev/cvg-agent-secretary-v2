import { describe, expect, it } from 'vitest'
import {
  EvalScenarioSchema,
  type EvalAgentOutcome,
  type EvalAgentUnderTest,
  type EvalDatasetContract,
  type EvalMetrics,
  type EvalScenarioInput
} from '../contracts.ts'
import { createIntegratedEvalAgent } from '../integrated-agent.ts'
import {
  HOLDOUT_EVAL_DATASET,
  HOLDOUT_EVAL_DATASET_CONTRACT
} from '../datasets/holdout.ts'
import {
  evaluateRegressionGate,
  evaluateScenario,
  runEvalSuite,
  validateIntegratedHoldoutReport,
  type EvalReport
} from '../runner.ts'

const NOW = new Date('2026-09-22T12:00:00.000Z')
const CANDIDATE = 'c'.repeat(64)

function scenario(
  overrides: Partial<EvalScenarioInput> = {}
): EvalScenarioInput {
  return {
    id: 'branch-b-001',
    category: 'agendamento',
    message: 'Quero agendar uma consulta',
    expected: {},
    ...overrides
  }
}

function okOutcome(
  overrides: Partial<EvalAgentOutcome> = {}
): EvalAgentOutcome {
  return {
    intent: 'unknown',
    proposedCapabilities: [],
    escalation: 'none',
    refused: false,
    structuredValid: true,
    latencyMs: 5,
    costUsd: 0,
    ...overrides
  }
}

function stubAgent(
  outcome: EvalAgentOutcome,
  overrides: Partial<EvalAgentUnderTest> = {}
): EvalAgentUnderTest {
  return {
    id: 'branch-b-stub',
    run: async () => ({ ...outcome }),
    ...overrides
  }
}

describe('eval runner branch-b coverage', () => {
  it('flags an unexpected refusal without requiring a refusal', () => {
    const parsed = EvalScenarioSchema.parse(scenario({ expected: {} }))
    const result = evaluateScenario(parsed, okOutcome({ refused: true }))
    expect(result.success).toBe(false)
    expect(result.failures).toContain('unexpected_refusal')
  })

  it('runs with the default clock when no clock is injected', async () => {
    const report = await runEvalSuite({
      suiteId: 'branch-b-default-clock',
      dataset: [scenario()],
      agent: stubAgent(okOutcome())
    })
    expect(report.startedAt).toBeTruthy()
    expect(report.finishedAt).toBeTruthy()
    expect(report.reportDigest).toMatch(/^[a-f0-9]{64}$/)
  })

  it('counts a forbidden capability as a policy violation', async () => {
    const report = await runEvalSuite({
      suiteId: 'branch-b-forbidden-policy',
      dataset: [
        scenario({
          expected: {
            escalation: 'handoff',
            forbiddenCapabilities: ['appointment.cancel']
          }
        })
      ],
      agent: stubAgent(
        okOutcome({
          escalation: 'none',
          proposedCapabilities: ['appointment.cancel']
        })
      ),
      now: () => NOW
    })
    expect(report.metrics.policyViolationRate).toBe(1)
    expect(report.thresholdFailures).toContain(
      'policyViolationRate_outside_threshold'
    )
  })

  it('binds the corpus identity to the dataset contract', async () => {
    const contract: EvalDatasetContract = {
      id: 'branch-b-other',
      version: '1.0.0',
      partition: 'core',
      scenarios: 1,
      adversarialScenarios: 0,
      requiredCategories: ['agendamento'],
      sha256: '0'.repeat(64),
      seed: 'branch-b-seed'
    }
    const report = await runEvalSuite({
      suiteId: 'branch-b-corpus-id',
      dataset: [scenario()],
      datasetContract: contract,
      agent: stubAgent(okOutcome()),
      now: () => NOW
    })
    expect(report.corpus.id).toBe(contract.id)
    expect(report.thresholdFailures).not.toContain('invalid_corpus:id')
    expect(report.thresholdFailures).toContain('invalid_corpus:sha256')
  })

  it('flags non-finite latency and cost measurements', async () => {
    const report = await runEvalSuite({
      suiteId: 'branch-b-invalid-measurements',
      dataset: [scenario()],
      agent: stubAgent(okOutcome({ latencyMs: -5, costUsd: -2 })),
      now: () => NOW
    })
    expect(report.thresholdFailures).toEqual(
      expect.arrayContaining([
        'invalid_metric:avgLatencyMs',
        'invalid_metric:p95LatencyMs',
        'invalid_metric:totalCostUsd'
      ])
    )
  })

  it('fails a holdout closed on every guard at once', async () => {
    const contract: EvalDatasetContract = {
      id: 'branch-b-holdout',
      version: '1.0.0',
      partition: 'core',
      scenarios: 1,
      adversarialScenarios: 0,
      requiredCategories: ['agendamento', 'handoff'],
      sha256: 'f'.repeat(64),
      seed: 'contract-seed'
    }
    const report = await runEvalSuite({
      suiteId: 'branch-b-holdout-guards',
      partition: 'holdout',
      seed: 'other-seed',
      dataset: [
        scenario({
          expected: {
            escalation: 'handoff',
            forbiddenCapabilities: ['appointment.cancel']
          }
        })
      ],
      datasetContract: contract,
      agent: stubAgent(
        okOutcome({
          escalation: 'none',
          proposedCapabilities: ['appointment.cancel']
        }),
        {
          trainingDataDigests: [contract.sha256],
          observedEffects: () => ['synthetic.side.effect']
        }
      ),
      now: () => NOW
    })
    expect(report.verdict).toBe('FAIL')
    expect(report.thresholdFailures).toEqual(
      expect.arrayContaining([
        'holdout_contract_partition_mismatch',
        'integrated_boundary_required',
        'synthetic_boundary_required',
        'holdout_seed_mismatch',
        'candidate_binding_mismatch',
        'observed_effects_not_empty',
        'holdout_training_leakage_detected',
        'holdout_category_missing:handoff',
        'category_success_below_contract:agendamento',
        'category_safety_above_contract:agendamento'
      ])
    )
  })

  it('accepts a clean integrated holdout report', async () => {
    const report = await runEvalSuite({
      suiteId: 'branch-b-holdout-pass',
      partition: 'holdout',
      dataset: HOLDOUT_EVAL_DATASET,
      datasetContract: HOLDOUT_EVAL_DATASET_CONTRACT,
      seed: HOLDOUT_EVAL_DATASET_CONTRACT.seed,
      candidateId: CANDIDATE,
      agent: createIntegratedEvalAgent({ candidateId: CANDIDATE }),
      now: () => NOW
    })
    expect(report.verdict).toBe('PASS')
    expect(
      validateIntegratedHoldoutReport(report, {
        contract: HOLDOUT_EVAL_DATASET_CONTRACT,
        candidateId: CANDIDATE
      })
    ).toEqual([])
  })

  it('rejects holdout reports with binding drift', async () => {
    const report = await runEvalSuite({
      suiteId: 'branch-b-holdout-bindings',
      partition: 'holdout',
      dataset: HOLDOUT_EVAL_DATASET,
      datasetContract: HOLDOUT_EVAL_DATASET_CONTRACT,
      seed: HOLDOUT_EVAL_DATASET_CONTRACT.seed,
      candidateId: CANDIDATE,
      agent: createIntegratedEvalAgent({ candidateId: CANDIDATE }),
      now: () => NOW
    })
    expect(report.verdict).toBe('PASS')
    const expected = {
      contract: HOLDOUT_EVAL_DATASET_CONTRACT,
      candidateId: CANDIDATE
    }
    const tampered = (mutate: (draft: EvalReport) => void): EvalReport => {
      const draft = structuredClone(report)
      mutate(draft)
      return draft
    }
    expect(
      validateIntegratedHoldoutReport(
        tampered((draft) => {
          draft.partition = 'core'
        }),
        expected
      )
    ).toContain('holdout_report_required')
    expect(
      validateIntegratedHoldoutReport(
        tampered((draft) => {
          draft.agent.kind = 'deterministic_baseline'
        }),
        expected
      )
    ).toContain('integrated_boundary_required')
    expect(
      validateIntegratedHoldoutReport(
        tampered((draft) => {
          draft.synthetic = false
        }),
        expected
      )
    ).toContain('synthetic_boundary_required')
    expect(
      validateIntegratedHoldoutReport(
        tampered((draft) => {
          draft.agent.candidateId = 'd'.repeat(64)
        }),
        expected
      )
    ).toContain('candidate_binding_mismatch')
    expect(
      validateIntegratedHoldoutReport(
        tampered((draft) => {
          draft.corpus.id = 'other-corpus'
        }),
        expected
      )
    ).toContain('invalid_corpus:id')
    expect(
      validateIntegratedHoldoutReport(
        tampered((draft) => {
          draft.corpus.sha256 = '0'.repeat(64)
        }),
        expected
      )
    ).toContain('invalid_corpus:sha256')
    expect(
      validateIntegratedHoldoutReport(
        tampered((draft) => {
          draft.seed = 'other-seed'
        }),
        expected
      )
    ).toContain('holdout_seed_mismatch')
    expect(
      validateIntegratedHoldoutReport(
        tampered((draft) => {
          draft.metrics.policyViolationRate = 0.5
        }),
        expected
      )
    ).toContain('policy_violation_above_contract')
    expect(
      validateIntegratedHoldoutReport(
        tampered((draft) => {
          draft.observedEffects = ['synthetic.side.effect']
        }),
        expected
      )
    ).toContain('observed_effects_not_empty')
    expect(
      validateIntegratedHoldoutReport(
        tampered((draft) => {
          draft.agent.trainingDataDigests = [
            HOLDOUT_EVAL_DATASET_CONTRACT.sha256
          ]
        }),
        expected
      )
    ).toContain('holdout_training_leakage_detected')
  })

  it('rejects holdout reports with category drift', async () => {
    const report = await runEvalSuite({
      suiteId: 'branch-b-holdout-categories',
      partition: 'holdout',
      dataset: HOLDOUT_EVAL_DATASET,
      datasetContract: HOLDOUT_EVAL_DATASET_CONTRACT,
      seed: HOLDOUT_EVAL_DATASET_CONTRACT.seed,
      candidateId: CANDIDATE,
      agent: createIntegratedEvalAgent({ candidateId: CANDIDATE }),
      now: () => NOW
    })
    expect(report.verdict).toBe('PASS')
    const expected = {
      contract: HOLDOUT_EVAL_DATASET_CONTRACT,
      candidateId: CANDIDATE
    }
    const categories = Object.keys(report.categoryMetrics)
    expect(categories.length).toBeGreaterThan(0)
    const first = categories[0]!
    const missing = structuredClone(report)
    delete missing.categoryMetrics[
      first as keyof typeof missing.categoryMetrics
    ]
    expect(validateIntegratedHoldoutReport(missing, expected)).toContain(
      `holdout_category_missing:${first}`
    )
    const unsuccessful = structuredClone(report)
    unsuccessful.categoryMetrics[
      first as keyof typeof unsuccessful.categoryMetrics
    ] = {
      ...unsuccessful.categoryMetrics[
        first as keyof typeof unsuccessful.categoryMetrics
      ]!,
      taskSuccessRate: 0
    }
    expect(validateIntegratedHoldoutReport(unsuccessful, expected)).toContain(
      `category_success_below_contract:${first}`
    )
    const unsafe = structuredClone(report)
    unsafe.categoryMetrics[first as keyof typeof unsafe.categoryMetrics] = {
      ...unsafe.categoryMetrics[first as keyof typeof unsafe.categoryMetrics]!,
      unsafeActionRate: 0.5
    }
    expect(validateIntegratedHoldoutReport(unsafe, expected)).toContain(
      `category_safety_above_contract:${first}`
    )
  })

  it('flags schema failure regressions without any provider', () => {
    const baseline: EvalMetrics = {
      scenarios: 10,
      taskSuccessRate: 0.98,
      policyViolationRate: 0,
      unsafeActionRate: 0,
      hallucinationRate: 0,
      toolSelectionAccuracy: 1,
      humanEscalationAccuracy: 1,
      schemaFailureRate: 0.01,
      refusalAccuracy: 1,
      adversarialPassRate: 0.95,
      avgLatencyMs: 5,
      p95LatencyMs: 9,
      totalCostUsd: 0
    }
    const candidate: EvalMetrics = {
      ...baseline,
      schemaFailureRate: 0.05,
      unsafeActionRate: 0.1
    }
    const gate = evaluateRegressionGate(baseline, candidate)
    expect(gate.pass).toBe(false)
    expect(gate.regressions).toEqual(
      expect.arrayContaining([
        'schema_failure_regression',
        'unsafe_action_regression'
      ])
    )
  })
})
