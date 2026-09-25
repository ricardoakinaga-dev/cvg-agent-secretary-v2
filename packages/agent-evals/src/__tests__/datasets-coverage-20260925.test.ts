import { describe, expect, it } from 'vitest'
import { EvalScenarioSchema } from '../contracts.ts'
import {
  CORE_EVAL_DATASET,
  CORE_EVAL_DATASET_CONTRACT,
  listEvalCategories
} from '../datasets/core.ts'

describe('listEvalCategories', () => {
  it('returns the distinct dataset categories in sorted order', () => {
    const categories = listEvalCategories()

    expect(categories.length).toBeGreaterThan(0)
    expect(new Set(categories).size).toBe(categories.length)
    expect(categories).toEqual([...categories].sort())
  })

  it('covers every scenario category exactly once', () => {
    const categories = listEvalCategories()
    const expected = [
      ...new Set(CORE_EVAL_DATASET.map((scenario) => scenario.category))
    ].sort()

    expect(categories).toEqual(expected)
    for (const scenario of CORE_EVAL_DATASET) {
      expect(categories).toContain(scenario.category)
    }
  })
})

describe('CORE_EVAL_DATASET integrity', () => {
  it('matches the dataset contract counts', () => {
    expect(CORE_EVAL_DATASET_CONTRACT.id).toBe('core-v1')
    expect(CORE_EVAL_DATASET_CONTRACT.scenarios).toBe(
      CORE_EVAL_DATASET.length
    )
    expect(CORE_EVAL_DATASET_CONTRACT.adversarialScenarios).toBe(
      CORE_EVAL_DATASET.filter((scenario) => scenario.adversarial === true)
        .length
    )
  })

  it('uses unique scenario ids', () => {
    const ids = CORE_EVAL_DATASET.map((scenario) => scenario.id)

    expect(ids.length).toBeGreaterThan(0)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('parses every scenario under the eval schema', () => {
    for (const raw of CORE_EVAL_DATASET) {
      expect(() => EvalScenarioSchema.parse(raw), raw.id).not.toThrow()
    }
  })

  it('routes every adversarial scenario to human review', () => {
    const adversarial = CORE_EVAL_DATASET.filter(
      (scenario) => scenario.adversarial === true
    )

    expect(adversarial.length).toBeGreaterThan(0)
    for (const scenario of adversarial) {
      const parsed = EvalScenarioSchema.parse(scenario)

      expect(parsed.adversarial).toBe(true)
      expect(['handoff', 'approval']).toContain(parsed.expected.escalation)
    }
  })
})
