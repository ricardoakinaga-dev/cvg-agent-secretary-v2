import { describe, expect, it } from 'vitest'
import { createDeterministicEvalAgent } from '../agent.ts'
import {
  HOLDOUT_EVAL_DATASET,
  HOLDOUT_EVAL_DATASET_CONTRACT
} from '../datasets/holdout.ts'
import { createIntegratedEvalAgent } from '../integrated-agent.ts'
import { runEvalSuite, validateIntegratedHoldoutReport } from '../runner.ts'

const NOW = new Date('2026-09-22T12:00:00.000Z')
const CANDIDATE = 'a'.repeat(64)

describe('AUD20-09 integrated holdout', () => {
  it('runs the public product boundary and reports every category', async () => {
    const report = await runEvalSuite({
      suiteId: 'aud20-09-positive',
      partition: 'holdout',
      dataset: HOLDOUT_EVAL_DATASET,
      datasetContract: HOLDOUT_EVAL_DATASET_CONTRACT,
      seed: HOLDOUT_EVAL_DATASET_CONTRACT.seed,
      candidateId: CANDIDATE,
      agent: createIntegratedEvalAgent({ candidateId: CANDIDATE }),
      now: () => NOW
    })

    expect(report.verdict).toBe('PASS')
    expect(report.agent).toMatchObject({
      kind: 'integrated_runtime',
      boundary: '@cvg/agent-core/evaluateInboundTurn'
    })
    expect(Object.keys(report.categoryMetrics).sort()).toEqual(
      [...HOLDOUT_EVAL_DATASET_CONTRACT.requiredCategories].sort()
    )
    expect(report.metrics.unsafeActionRate).toBe(0)
    expect(report.observedEffects).toEqual([])
    expect(report.reportDigest).toMatch(/^[a-f0-9]{64}$/)
  })

  it('cannot be forged by self-declaring an integrated kind and boundary', async () => {
    const baseline = createDeterministicEvalAgent()
    const forged = {
      ...baseline,
      id: 'forged-integrated-agent',
      kind: 'integrated_runtime' as const,
      boundary: '@cvg/agent-core/evaluateInboundTurn',
      candidateId: CANDIDATE,
      synthetic: true,
      run: baseline.run.bind(baseline)
    }
    const report = await runEvalSuite({
      suiteId: 'aud20-09-forged-boundary-negative',
      partition: 'holdout',
      dataset: HOLDOUT_EVAL_DATASET,
      datasetContract: HOLDOUT_EVAL_DATASET_CONTRACT,
      seed: HOLDOUT_EVAL_DATASET_CONTRACT.seed,
      candidateId: CANDIDATE,
      agent: forged,
      now: () => NOW
    })
    expect(report.verdict).toBe('FAIL')
    expect(report.thresholdFailures).toContain('integrated_boundary_required')
  })

  it('rejects a deterministic baseline as integrated evidence', async () => {
    const report = await runEvalSuite({
      suiteId: 'aud20-09-baseline-negative',
      partition: 'holdout',
      dataset: HOLDOUT_EVAL_DATASET,
      datasetContract: HOLDOUT_EVAL_DATASET_CONTRACT,
      seed: HOLDOUT_EVAL_DATASET_CONTRACT.seed,
      candidateId: CANDIDATE,
      agent: createDeterministicEvalAgent(),
      now: () => NOW
    })
    expect(report.verdict).toBe('FAIL')
    expect(report.thresholdFailures).toContain('integrated_boundary_required')
  })

  it('fails closed for omitted categories and binding drift', async () => {
    const reduced = HOLDOUT_EVAL_DATASET.filter(
      (scenario) => scenario.category !== 'agendamento'
    )
    const report = await runEvalSuite({
      suiteId: 'aud20-09-category-negative',
      partition: 'holdout',
      dataset: reduced,
      datasetContract: HOLDOUT_EVAL_DATASET_CONTRACT,
      seed: 'wrong-seed',
      candidateId: 'b'.repeat(64),
      agent: createIntegratedEvalAgent({ candidateId: CANDIDATE }),
      now: () => NOW
    })
    expect(report.verdict).toBe('FAIL')
    expect(report.thresholdFailures).toEqual(
      expect.arrayContaining([
        'invalid_corpus:scenarios',
        'invalid_corpus:sha256',
        'holdout_category_missing:agendamento',
        'holdout_seed_mismatch',
        'candidate_binding_mismatch'
      ])
    )
  })

  it('rejects safety violations and observed effects', async () => {
    const agent = createIntegratedEvalAgent({
      candidateId: CANDIDATE,
      effectRequestScenarioId: 'HO-001'
    })
    const report = await runEvalSuite({
      suiteId: 'aud20-09-effects-negative',
      partition: 'holdout',
      dataset: HOLDOUT_EVAL_DATASET,
      datasetContract: HOLDOUT_EVAL_DATASET_CONTRACT,
      seed: HOLDOUT_EVAL_DATASET_CONTRACT.seed,
      candidateId: CANDIDATE,
      agent,
      now: () => NOW
    })
    expect(report.verdict).toBe('FAIL')
    expect(report.thresholdFailures).toContain('observed_effects_not_empty')
    expect(report.observedEffects).toEqual(['synthetic.effect.requested'])

    const tampered = structuredClone(report)
    tampered.metrics.unsafeActionRate = 0.1
    expect(
      validateIntegratedHoldoutReport(tampered, {
        contract: HOLDOUT_EVAL_DATASET_CONTRACT,
        candidateId: CANDIDATE
      })
    ).toContain('unsafe_action_above_contract')
  })

  it('is reproducible apart from wall-clock timestamps', async () => {
    const input = {
      suiteId: 'aud20-09-reproducible',
      partition: 'holdout' as const,
      dataset: HOLDOUT_EVAL_DATASET,
      datasetContract: HOLDOUT_EVAL_DATASET_CONTRACT,
      seed: HOLDOUT_EVAL_DATASET_CONTRACT.seed,
      candidateId: CANDIDATE,
      now: () => NOW
    }
    const first = await runEvalSuite({
      ...input,
      agent: createIntegratedEvalAgent({ candidateId: CANDIDATE })
    })
    const second = await runEvalSuite({
      ...input,
      agent: createIntegratedEvalAgent({ candidateId: CANDIDATE })
    })
    expect(first.reportDigest).toBe(second.reportDigest)
  })
})
