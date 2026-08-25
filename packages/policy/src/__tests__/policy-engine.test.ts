import { describe, expect, it } from 'vitest'
import {
  ApprovalService,
  containsSensitiveClinicalOrFinancialAction,
  evaluatePolicy
} from '../index.ts'

describe('policy engine', () => {
  it('blocks unavailable or sensitive policy paths fail-closed', () => {
    expect(
      evaluatePolicy({
        action: 'run_agent_turn',
        autonomyLevel: 'level_2_suggest',
        policyAvailable: false
      }).decision
    ).toBe('blocked')
    expect(
      evaluatePolicy({
        action: 'prescrever remedio',
        autonomyLevel: 'level_2_suggest'
      }).reason
    ).toBe('sensitive_action_blocked')
    expect(
      containsSensitiveClinicalOrFinancialAction('fazer diagnostico')
    ).toBe(true)
    expect(
      containsSensitiveClinicalOrFinancialAction(
        'Meu cachorro está vomitando. Posso dar dipirona?'
      )
    ).toBe(true)
  })

  it('requires approval or handoff for risky and appointment actions', () => {
    expect(
      evaluatePolicy({
        action: 'confirm_appointment',
        autonomyLevel: 'level_2_suggest'
      }).decision
    ).toBe('requires_approval')
    expect(
      evaluatePolicy({
        action: 'triage',
        autonomyLevel: 'level_2_suggest',
        riskLevel: 'high'
      }).decision
    ).toBe('handoff')
    expect(
      evaluatePolicy({
        action: 'classify_intent',
        autonomyLevel: 'level_2_suggest'
      }).decision
    ).toBe('allowed')
    expect(
      evaluatePolicy({
        action: 'classify_intent',
        autonomyLevel: 'level_1_collect'
      }).decision
    ).toBe('handoff')
  })

  it('enforces approval decision permissions and pending state', () => {
    const service = new ApprovalService()
    const request = service.create({
      sessionId: 'sess_1',
      proposedAction: 'create_appointment_draft',
      summary: 'Aprovar sugestao',
      riskLevel: 'medium'
    })

    expect(() =>
      service.decide({
        request,
        decision: 'approved',
        operatorId: 'op_1',
        role: 'Operator'
      })
    ).toThrow(/cannot decide/)
    const approved = service.decide({
      request,
      decision: 'approved',
      operatorId: 'op_1',
      role: 'Approver'
    })
    expect(approved.status).toBe('approved')
    expect(() =>
      service.decide({
        request: approved,
        decision: 'rejected',
        operatorId: 'op_1',
        role: 'Approver'
      })
    ).toThrow(/not pending/)
  })
})
