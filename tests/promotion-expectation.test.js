import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  PROMOTION_EXPECTATIONS,
  evaluatePromotionExpectation,
  normalizePromotionExpectation
} from '../scripts/lib/promotion-expectation.mjs'

const repositoryRoot = path.resolve(import.meta.dirname, '..')
const script = path.join(repositoryRoot, 'scripts/promotion-check.mjs')

const externalOnlyInputs = {
  expectation: 'EXTERNAL_ONLY',
  eligible: false,
  verifierPassed: true,
  reason: 'production_assurance_incomplete',
  blockingGates: [],
  blockingFindings: [],
  blockingInvariants: []
}

function runPromotionCheck(args) {
  try {
    const stdout = execFileSync(process.execPath, [script, ...args], {
      cwd: repositoryRoot,
      encoding: 'utf8'
    })
    return { status: 0, output: JSON.parse(stdout) }
  } catch (error) {
    return {
      status: error.status,
      output: JSON.parse(error.stdout?.trim() || '{}')
    }
  }
}

describe('normalizePromotionExpectation', () => {
  it('defaults to ACTUAL and accepts case-insensitive EXTERNAL_ONLY', () => {
    expect(normalizePromotionExpectation(undefined)).toBe('ACTUAL')
    expect(normalizePromotionExpectation('actual')).toBe('ACTUAL')
    expect(normalizePromotionExpectation(' external_only ')).toBe(
      'EXTERNAL_ONLY'
    )
    expect(PROMOTION_EXPECTATIONS).toEqual(['ACTUAL', 'EXTERNAL_ONLY'])
  })

  it('rejects unknown expectations so the caller fails closed', () => {
    expect(normalizePromotionExpectation('SKIP')).toBeNull()
    expect(normalizePromotionExpectation('')).toBeNull()
  })
})

describe('evaluatePromotionExpectation', () => {
  it('passes when promotion is eligible under either expectation', () => {
    const inputs = { ...externalOnlyInputs, eligible: true }
    expect(
      evaluatePromotionExpectation({ ...inputs, expectation: 'ACTUAL' })
    ).toMatchObject({ valid: true, passed: true })
    expect(
      evaluatePromotionExpectation({ ...inputs, expectation: 'EXTERNAL_ONLY' })
    ).toMatchObject({ valid: true, passed: true })
  })

  it('fails ACTUAL whenever promotion is not eligible', () => {
    expect(
      evaluatePromotionExpectation({
        ...externalOnlyInputs,
        expectation: 'ACTUAL'
      })
    ).toMatchObject({ valid: true, passed: false })
  })

  it('passes EXTERNAL_ONLY only for an internal-clean external-only block', () => {
    expect(evaluatePromotionExpectation(externalOnlyInputs)).toMatchObject({
      valid: true,
      passed: true,
      externalOnlySatisfied: true
    })
  })

  it.each([
    ['a failing verifier', { verifierPassed: false, reason: undefined }],
    ['an unexpected reason', { reason: 'current_certification_invalid' }],
    ['an internal gate blocker', { blockingGates: ['kernel_coverage'] }],
    ['an internal finding blocker', { blockingFindings: ['P0-open'] }],
    ['an internal invariant blocker', { blockingInvariants: ['invariant'] }]
  ])('fails EXTERNAL_ONLY when %s is present', (_label, override) => {
    expect(
      evaluatePromotionExpectation({ ...externalOnlyInputs, ...override })
    ).toMatchObject({ valid: true, passed: false })
  })

  it('fails closed on an unknown expectation', () => {
    expect(
      evaluatePromotionExpectation({ ...externalOnlyInputs, expectation: 'X' })
    ).toMatchObject({ valid: false, passed: false })
  })
})

describe('promotion-check CLI', () => {
  it('keeps the default expectation exit code tied to eligibility', () => {
    const { status, output } = runPromotionCheck([])
    expect(output.kind).toBe('phase11-promotion-check')
    expect(output.expectation).toBe('ACTUAL')
    expect(output.noProductionEffect).toBe(true)
    expect(status).toBe(output.eligible ? 0 : 1)
    expect(output.expectationSatisfied).toBe(output.eligible)
  })

  it('accepts EXTERNAL_ONLY while only human gates remain pending', () => {
    const { status, output } = runPromotionCheck([
      '--requested',
      'PRODUCTION',
      '--expect=EXTERNAL_ONLY'
    ])
    expect(output.expectation).toBe('EXTERNAL_ONLY')
    if (output.reason === 'production_assurance_incomplete') {
      expect(output.blockingGates).toEqual([])
      expect(output.blockingInvariants).toEqual([])
      expect(output.expectationSatisfied).toBe(true)
      expect(status).toBe(0)
    } else {
      expect(status).toBe(1)
    }
  })

  it('fails closed on an unknown expectation value', () => {
    const { status, output } = runPromotionCheck(['--expect', 'IGNORE'])
    expect(status).toBe(1)
    expect(output.expectationSatisfied).toBe(false)
  })
})
