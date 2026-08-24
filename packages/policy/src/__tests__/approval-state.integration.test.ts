import { describe, expect, it } from 'vitest'
import { ApprovalService } from '../index.ts'

describe('approval state integration', () => {
  it('allows one authorized decision and rejects repeated decisions', () => {
    const service = new ApprovalService()
    const request = service.create({
      sessionId: 'sess_approval_trace',
      proposedAction: 'create_appointment_draft',
      summary: 'Rascunho ficticio',
      riskLevel: 'medium'
    })

    const decided = service.decide({
      request,
      decision: 'approved',
      operatorId: 'approver.trace',
      role: 'Approver'
    })

    expect(decided.status).toBe('approved')
    expect(() =>
      service.decide({
        request: decided,
        decision: 'rejected',
        operatorId: 'approver.trace',
        role: 'Approver'
      })
    ).toThrow(/not pending/)
  })
})
