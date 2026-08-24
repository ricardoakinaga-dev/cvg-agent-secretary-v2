import { describe, expect, it } from 'vitest'
import { runTriageWorkflow } from '../index.ts'

describe('triage safety flow', () => {
  it('blocks clinical-sensitive requests and routes high risk to handoff', () => {
    expect(runTriageWorkflow('Pode diagnosticar meu pet?')).toMatchObject({
      nextState: 'handoff',
      safetyEvent: 'clinical_boundary_blocked'
    })
    expect(runTriageWorkflow('Meu pet esta com sangue')).toMatchObject({
      nextState: 'handoff',
      safetyEvent: 'high_risk_operational'
    })
    expect(runTriageWorkflow('Consulta de rotina')).toMatchObject({
      nextState: 'active',
      safetyEvent: null
    })
  })
})
