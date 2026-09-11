import { describe, expect, it, vi } from 'vitest'
import {
  ApprovalRepository,
  AuditRepository,
  InMemoryDatabase
} from '../index.ts'
const fixture = () => ({
  id: 'approval_fixture',
  sessionId: 'sess_fixture',
  proposedAction: 'synthetic_review',
  summary: 'Synthetic only',
  riskLevel: 'low' as const,
  status: 'pending' as const,
  decidedBy: null,
  decidedAt: null,
  createdAt: new Date()
})
const command = (
  decision: 'approved' | 'rejected' | 'assumed' = 'approved'
) => ({
  approvalRequestId: 'approval_fixture',
  decision,
  operatorId: 'synthetic-a',
  role: 'Approver' as const,
  correlationId: 'corr_00000000-0000-4000-8000-000000000001'
})
describe('attendance approval atomic boundary', () => {
  it.each(['approved', 'rejected', 'assumed'] as const)(
    'commits one %s decision and winner audit; stale decisions conflict',
    (decision) => {
      const db = new InMemoryDatabase()
      const repo = new ApprovalRepository(db)
      repo.save(fixture())
      const snapshot = repo.findById('approval_fixture')!
      const winner = repo.decideWithAudit(command(decision))
      expect(winner.status).toBe(decision)
      expect(() =>
        repo.decideWithAudit({
          ...command('rejected'),
          operatorId: 'synthetic-b'
        })
      ).toThrow(expect.objectContaining({ code: 'conflict' }))
      expect(() => repo.save({ ...snapshot, status: 'rejected' })).toThrow()
      expect(repo.findById(winner.id)).toEqual(winner)
      expect(db.state.auditEvents).toHaveLength(1)
      expect(db.state.auditEvents[0]).toMatchObject({
        actorId: winner.decidedBy,
        payload: {
          status: decision,
          effect:
            decision === 'assumed' ? 'handoff_only' : 'approval_state_only'
        }
      })
    }
  )
  it('blocks save terminal creation, duplicate creation and mutable aliases', () => {
    const repo = new ApprovalRepository(new InMemoryDatabase())
    const input = fixture()
    expect(() => repo.save({ ...input, status: 'approved' })).toThrow()
    const saved = repo.save(input)
    saved.summary = 'changed'
    input.createdAt.setTime(0)
    const read = repo.findById(input.id)!
    read.status = 'approved'
    repo.list()[0]!.summary = 'changed again'
    expect(repo.findById(input.id)).toMatchObject({
      status: 'pending',
      summary: 'Synthetic only'
    })
    expect(repo.findById(input.id)!.createdAt.getTime()).not.toBe(0)
    expect(() => repo.save(fixture())).toThrow(
      expect.objectContaining({ code: 'conflict' })
    )
  })
  it('rolls back memory decision when audit fails', () => {
    const db = new InMemoryDatabase()
    const repo = new ApprovalRepository(db)
    repo.save(fixture())
    const spy = vi
      .spyOn(AuditRepository.prototype, 'append')
      .mockImplementationOnce(() => {
        throw new Error('synthetic audit failure')
      })
    try {
      expect(() => repo.decideWithAudit(command())).toThrow(
        'synthetic audit failure'
      )
    } finally {
      spy.mockRestore()
    }
    expect(repo.findById('approval_fixture')!.status).toBe('pending')
    expect(db.state.auditEvents).toHaveLength(0)
  })
  it('rejects invalid decision, unauthorized actor and invalid audit context before either write', () => {
    const db = new InMemoryDatabase()
    const repo = new ApprovalRepository(db)
    repo.save(fixture())
    expect(() =>
      repo.decideWithAudit({ ...command(), role: 'Operator' })
    ).toThrow()
    expect(() =>
      repo.decideWithAudit({ ...command(), correlationId: 'invalid' })
    ).toThrow()
    expect(() =>
      repo.decideWithAudit({ ...command(), decision: 'pending' as 'approved' })
    ).toThrow()
    expect(repo.findById('approval_fixture')).toMatchObject({
      status: 'pending',
      decidedBy: null,
      decidedAt: null
    })
    expect(db.state.auditEvents).toHaveLength(0)
  })
})
