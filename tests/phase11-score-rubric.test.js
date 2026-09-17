import { describe, expect, it } from 'vitest'
import {
  PHASE11_2_REQUIRED_GATES,
  PHASE11_REQUIRED_INVARIANTS,
  PHASE11_SCORE_RUBRIC,
  computeScores
} from '../scripts/lib/phase11-rules.mjs'

function completeGates(withEvidence = true) {
  return PHASE11_2_REQUIRED_GATES.map((id) => ({
    id,
    status: 'PASS',
    command: 'fixture:' + id,
    exitCode: 0,
    durationMs: 1,
    ...(withEvidence ? { logSha256: 'a'.repeat(64) } : {})
  }))
}

function completeInvariants(withEvidence = true) {
  return PHASE11_REQUIRED_INVARIANTS.map((id) => ({
    id,
    title: 'synthetic invariant',
    description: 'synthetic invariant',
    severity: 'critical',
    status: 'PASS',
    ...(withEvidence ? { evidence: ['fixture:' + id] } : {})
  }))
}

function completeState(overrides = {}) {
  return {
    localEngineeringClosure: true,
    localVerificationComplete: true,
    evidenceComplete: true,
    productionProofComplete: true,
    ...overrides
  }
}

describe('Phase 11 executable score rubric', () => {
  it('has explicit dimensions with normalized weights', () => {
    for (const dimensions of Object.values(PHASE11_SCORE_RUBRIC)) {
      expect(
        dimensions.reduce((total, dimension) => total + dimension.weight, 0)
      ).toBeCloseTo(1)
      for (const dimension of dimensions) {
        expect(dimension.id).toEqual(expect.any(String))
        expect(dimension.gates).toEqual(expect.any(Array))
        expect(dimension.invariants).toEqual(expect.any(Array))
      }
    }
  })

  it('gives a complete evidence fixture a reproducible full score', () => {
    const first = computeScores({
      gates: completeGates(),
      invariants: completeInvariants(),
      findings: { P0: [], P1: [], P2: [] },
      successState: completeState()
    })
    const second = computeScores({
      gates: completeGates(),
      invariants: completeInvariants(),
      findings: { P0: [], P1: [], P2: [] },
      successState: completeState()
    })

    expect(first).toEqual(second)
    for (const score of Object.values(first)) {
      expect(score.value).toBe(100)
      expect(score.status).toBe('PASS')
      expect(score.scoreModel).toBe('weighted-executable-evidence-v1')
    }
  })

  it('does not turn binary PASS without evidence into a high score', () => {
    const result = computeScores({
      gates: completeGates(false),
      invariants: completeInvariants(false),
      findings: { P0: [], P1: [], P2: [] },
      successState: completeState({
        localEngineeringClosure: false,
        localVerificationComplete: false,
        evidenceComplete: false,
        productionProofComplete: false
      })
    })

    expect(result.Architecture.value).toBeLessThan(99)
    expect(result.Engineering.value).toBeLessThan(99)
    expect(result.Observability.value).toBeLessThan(99)
    expect(result['Production Readiness']).toMatchObject({
      value: 0,
      status: 'BLOCKED'
    })
    expect(result['Production Readiness'].limitations).toContain(
      'external_proof_incomplete'
    )
  })

  it('penalizes open local findings even when every gate is binary PASS', () => {
    const result = computeScores({
      gates: completeGates(),
      invariants: completeInvariants(),
      findings: {
        P0: [],
        P1: [
          {
            id: 'AUD17-fixture',
            status: 'OPEN',
            blocking: true
          }
        ],
        P2: []
      },
      successState: completeState()
    })

    expect(result.Security.value).toBe(70)
    expect(result.Security.limitations).toContain(
      'blocking_findings_penalty:30'
    )
    expect(result.Security.status).toBe('PARTIAL')
  })

  it('treats a missing required gate as NOT_EXECUTED instead of evidence', () => {
    const result = computeScores({
      gates: completeGates().filter((gate) => gate.id !== 'postgres'),
      invariants: completeInvariants(),
      findings: { P0: [], P1: [], P2: [] },
      successState: completeState({
        localEngineeringClosure: false,
        localVerificationComplete: false
      })
    })

    expect(result.Reliability.value).toBeLessThan(99)
    expect(result.Reliability.dimensions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'durable_storage',
          status: 'PARTIAL',
          gates: [{ id: 'postgres', status: 'MISSING' }]
        })
      ])
    )
  })
})
