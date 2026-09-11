import { describe, expect, it } from 'vitest'
import {
  DATA_HANDLING_POLICY,
  handlingRuleFor,
  mayTransmitToExternalModel,
  mayTransmitToLocalModel,
  mayTransmitToModel,
  requiresRedaction,
  retentionDaysFor,
  strictestClassification
} from '../data-classification.ts'

describe('data classification handling policy', () => {
  it('never allows clinical, financial or credential data to external models', () => {
    expect(mayTransmitToExternalModel('CLINICAL')).toBe(false)
    expect(mayTransmitToExternalModel('FINANCIAL')).toBe(false)
    expect(mayTransmitToExternalModel('CREDENTIAL')).toBe(false)
    expect(mayTransmitToLocalModel('CLINICAL')).toBe(false)
    expect(mayTransmitToLocalModel('CREDENTIAL')).toBe(false)
  })

  it('allows confidential data only on local models', () => {
    expect(mayTransmitToExternalModel('CONFIDENTIAL')).toBe(false)
    expect(mayTransmitToLocalModel('CONFIDENTIAL')).toBe(true)
    expect(mayTransmitToModel('CONFIDENTIAL', 'local')).toBe(true)
    expect(mayTransmitToModel('CONFIDENTIAL', 'external')).toBe(false)
  })

  it('allows public and internal data on external models', () => {
    expect(mayTransmitToModel('PUBLIC', 'external')).toBe(true)
    expect(mayTransmitToModel('INTERNAL', 'external')).toBe(true)
  })

  it('forbids logging and telemetry for credential and clinical data', () => {
    expect(handlingRuleFor('CREDENTIAL').logging).toBe('forbid')
    expect(handlingRuleFor('CREDENTIAL').telemetry).toBe('forbid')
    expect(handlingRuleFor('CLINICAL').logging).toBe('forbid')
    expect(handlingRuleFor('CLINICAL').telemetry).toBe('forbid')
    expect(requiresRedaction('CONFIDENTIAL')).toBe(true)
    expect(requiresRedaction('PUBLIC')).toBe(false)
  })

  it('blocks credential backup and retention', () => {
    expect(handlingRuleFor('CREDENTIAL').backup).toBe('forbid')
    expect(retentionDaysFor('CREDENTIAL')).toBe(0)
    expect(retentionDaysFor('CLINICAL')).toBeGreaterThanOrEqual(365)
  })

  it('selects the strictest class in a mixed payload', () => {
    expect(strictestClassification(['PUBLIC', 'CLINICAL', 'INTERNAL'])).toBe(
      'CLINICAL'
    )
    expect(strictestClassification(['INTERNAL', 'CREDENTIAL'])).toBe(
      'CREDENTIAL'
    )
    expect(strictestClassification([])).toBe('PUBLIC')
  })

  it('keeps every class documented with an explicit rule', () => {
    for (const [classification, rule] of Object.entries(DATA_HANDLING_POLICY)) {
      expect(rule.classification).toBe(classification)
      expect(rule.retentionDays).toBeGreaterThanOrEqual(0)
    }
  })
})
