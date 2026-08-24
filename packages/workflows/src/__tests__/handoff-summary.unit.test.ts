import { describe, expect, it } from 'vitest'
import { buildHandoffSummary } from '../index.ts'

describe('handoff summary unit', () => {
  it('renders operational context and fails closed without required fields', () => {
    expect(() => buildHandoffSummary({ intent: 'triage' })).toThrow(
      /handoff_requires/
    )
    expect(
      buildHandoffSummary({
        tutor: 'Ana',
        pet: 'Bolt',
        intent: 'triage',
        collectedData: ['vomito'],
        risk: 'medium',
        toolsUsed: ['triage'],
        pendingItems: ['confirmar horario'],
        recommendedNextStep: 'Operador assumir'
      })
    ).toContain('Next: Operador assumir')
  })
})
