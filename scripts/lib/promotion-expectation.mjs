/**
 * Expectation evaluator for `scripts/promotion-check.mjs`.
 *
 * CI cannot require `eligible` while the eight human/external gates are still
 * pending — that state is `production_assurance_incomplete`, and it must stay
 * visible without turning every push red. `EXTERNAL_ONLY` therefore asserts
 * only the part CI can prove: the Phase 11 verifier passed, the certification
 * package is intact, and *nothing internal* blocks promotion. Any internal
 * blocker, invalid verifier or unexpected reason still fails closed.
 */

export const PROMOTION_EXPECTATIONS = ['ACTUAL', 'EXTERNAL_ONLY']

const INTERNAL_BLOCKER_KEYS = [
  'blockingGates',
  'blockingFindings',
  'blockingInvariants'
]

export function normalizePromotionExpectation(value) {
  const expectation = String(value ?? 'ACTUAL')
    .trim()
    .toUpperCase()
  return PROMOTION_EXPECTATIONS.includes(expectation) ? expectation : null
}

export function evaluatePromotionExpectation({
  expectation,
  eligible,
  verifierPassed,
  reason,
  blockingGates,
  blockingFindings,
  blockingInvariants
}) {
  const normalized = normalizePromotionExpectation(expectation)
  if (normalized === null) {
    return {
      valid: false,
      expectation,
      passed: false,
      externalOnlySatisfied: false,
      note: 'Unknown expectation; promotion check fails closed.'
    }
  }

  if (eligible) {
    return {
      valid: true,
      expectation: normalized,
      passed: true,
      externalOnlySatisfied: normalized === 'EXTERNAL_ONLY',
      note: 'Promotion eligible for the requested profile.'
    }
  }

  if (normalized === 'ACTUAL') {
    return {
      valid: true,
      expectation: normalized,
      passed: false,
      externalOnlySatisfied: false,
      note: 'Promotion is not eligible for the requested profile.'
    }
  }

  const blockers = { blockingGates, blockingFindings, blockingInvariants }
  const noInternalBlockers = INTERNAL_BLOCKER_KEYS.every(
    (key) => Array.isArray(blockers[key]) && blockers[key].length === 0
  )
  const externalOnly =
    verifierPassed &&
    reason === 'production_assurance_incomplete' &&
    noInternalBlockers

  return {
    valid: true,
    expectation: normalized,
    passed: externalOnly,
    externalOnlySatisfied: externalOnly,
    note: externalOnly
      ? 'Only human/external gates remain; no internal blocker was found.'
      : 'Internal blockers, an invalid certification or an unexpected reason prevent promotion.'
  }
}
