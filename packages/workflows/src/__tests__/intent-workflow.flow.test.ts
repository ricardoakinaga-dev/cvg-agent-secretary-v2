import { describe, expect, it } from 'vitest'
import {
  answerInstitutionalQuestion,
  buildHandoffSummary,
  classifyIntent,
  ownerPatientNextStep,
  runSchedulingDraftWorkflow,
  runTriageWorkflow
} from '../index.ts'

describe('workflow flows', () => {
  it('classifies supported intents deterministically', () => {
    expect(classifyIntent('Quero agendar consulta')).toBe('scheduling')
    expect(classifyIntent('Meu pet esta com sangue')).toBe('triage')
    expect(classifyIntent('Qual o endereco?')).toBe('institutional_question')
    expect(classifyIntent('Criar tarefa de retorno')).toBe('task')
    expect(classifyIntent('Oi')).toBe('unknown')
  })

  it('routes owner and patient identification to the next deterministic step', () => {
    expect(
      ownerPatientNextStep({ ownerFound: false, patientFound: false })
    ).toBe('create_owner_draft')
    expect(
      ownerPatientNextStep({ ownerFound: true, patientFound: false })
    ).toBe('create_patient_draft')
    expect(ownerPatientNextStep({ ownerFound: true, patientFound: true })).toBe(
      'link_patient_to_conversation'
    )
  })

  it('blocks clinical boundaries and keeps scheduling draft-only', () => {
    expect(runTriageWorkflow('Pode diagnosticar?')).toMatchObject({
      nextState: 'handoff',
      safetyEvent: 'clinical_boundary_blocked'
    })
    expect(runTriageWorkflow('Tem sangue')).toMatchObject({
      nextState: 'handoff',
      safetyEvent: 'high_risk_operational'
    })
    expect(runTriageWorkflow('Consulta de rotina')).toMatchObject({
      nextState: 'active',
      safetyEvent: null
    })
    expect(runSchedulingDraftWorkflow().blockedActions).toContain(
      'confirm_appointment'
    )
  })

  it('answers institutional questions only from approved non-clinical sources', () => {
    expect(answerInstitutionalQuestion({ question: 'Qual horario?' })).toEqual({
      status: 'handoff',
      reason: 'approved_source_missing'
    })
    expect(
      answerInstitutionalQuestion({
        question: 'Qual tratamento?',
        approvedSource: { answer: 'x', source: 'manual' }
      })
    ).toEqual({
      status: 'handoff',
      reason: 'medical_question'
    })
    expect(
      answerInstitutionalQuestion({
        question: 'Qual endereco?',
        approvedSource: { answer: 'Rua 1', source: 'manual' }
      })
    ).toEqual({
      status: 'answered',
      answer: 'Rua 1',
      source: 'manual'
    })
  })

  it('builds handoff summary through the workflow facade', () => {
    expect(
      buildHandoffSummary({
        intent: 'triage',
        recommendedNextStep: 'Operador assumir'
      })
    ).toContain('Intent: triage')
  })
})
