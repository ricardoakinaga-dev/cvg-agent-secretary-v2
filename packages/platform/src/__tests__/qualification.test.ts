import { describe, expect, it } from 'vitest'
import { runControlledQualification } from '../index.ts'

describe('controlled qualification', () => {
  it('qualifies only when local metrics and named gates pass', () => {
    const result = runControlledQualification({
      persistenceLatenciesMs: [10, 20, 30],
      responseLatenciesMs: [100, 200, 300],
      lostMessages: 0,
      duplicateEffects: 0,
      gates: { restore: true, operator: true }
    })
    expect(result).toMatchObject({
      status: 'QUALIFIED_CONTROLLED',
      productionBoundary: 'NO-GO'
    })
  })

  it('returns NO_GO with explicit failed evidence', () => {
    const result = runControlledQualification({
      persistenceLatenciesMs: [3_000],
      responseLatenciesMs: [11_000],
      lostMessages: 1,
      duplicateEffects: 2,
      gates: { external_identity: false }
    })
    expect(result.status).toBe('NO_GO')
    expect(result.failedGates).toEqual(
      expect.arrayContaining([
        'external_identity',
        'zero_loss',
        'zero_duplicate_effect'
      ])
    )
  })

  it('rejects empty gates, invalid samples and caller-inflated targets', () => {
    expect(() =>
      runControlledQualification({
        persistenceLatenciesMs: [10],
        responseLatenciesMs: [20],
        lostMessages: 0,
        duplicateEffects: 0,
        gates: {}
      })
    ).toThrow(/named qualification gate/i)
    expect(() =>
      runControlledQualification({
        persistenceLatenciesMs: [Number.NaN],
        responseLatenciesMs: [20],
        lostMessages: 0,
        duplicateEffects: 0,
        gates: { restore: true }
      })
    ).toThrow(/invalid sample/i)
    expect(() =>
      runControlledQualification({
        persistenceLatenciesMs: [10],
        responseLatenciesMs: [20],
        lostMessages: 0,
        duplicateEffects: 0,
        gates: { restore: true },
        targets: { persistenceP95Ms: 20_001 }
      })
    ).toThrow(/persistenceP95Ms/i)
  })
})
