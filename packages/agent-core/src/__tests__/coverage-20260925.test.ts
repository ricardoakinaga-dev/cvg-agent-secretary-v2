import { describe, expect, it, vi } from 'vitest'
import type { AuditEventRecord, AuditRepository } from '@cvg/persistence'
import { createAgentRun } from '../agent-run/agent-run-service.ts'
import { appendAuditEvent } from '../audit/audit-hook.ts'

type AuditInput = Omit<AuditEventRecord, 'id' | 'createdAt'>

function auditInput(): AuditInput {
  return {
    type: 'policy_decision',
    actorType: 'System',
    actorId: 'system',
    correlationId: 'corr_00000000-0000-4000-8000-000000000001',
    policyVersion: 'policy-v1',
    payload: { sessionId: 'sess_1' }
  }
}

function stubRepository(
  append: (input: AuditInput) => unknown
): AuditRepository {
  return { append } as unknown as AuditRepository
}

describe('createAgentRun', () => {
  it('creates a started run bound to the session', () => {
    const before = new Date()
    const run = createAgentRun('sess_1')
    const after = new Date()

    expect(run.sessionId).toBe('sess_1')
    expect(run.status).toBe('started')
    expect(run.id).toMatch(/^run_[0-9a-f-]{36}$/)
    expect(run.createdAt).toBeInstanceOf(Date)
    expect(run.updatedAt).toBeInstanceOf(Date)
    expect(run.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
    expect(run.createdAt.getTime()).toBeLessThanOrEqual(after.getTime())
    expect(run.updatedAt.getTime()).toBe(run.createdAt.getTime())
  })

  it('issues a unique id per run', () => {
    const first = createAgentRun('sess_1')
    const second = createAgentRun('sess_1')

    expect(second.id).not.toBe(first.id)
    expect(second.sessionId).toBe(first.sessionId)
  })

  it('fails when secure UUID generation is unavailable', () => {
    vi.stubGlobal('crypto', undefined)
    try {
      expect(() => createAgentRun('sess_1')).toThrow(/Secure UUID/)
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe('appendAuditEvent', () => {
  it('delegates to the repository and returns the persisted record', () => {
    const input = auditInput()
    const persisted = { ...input, id: 'audit_1', createdAt: new Date() }
    const append = vi.fn((received: AuditInput) => {
      expect(received).toBe(input)
      return persisted
    })
    const repository = stubRepository(append)

    expect(appendAuditEvent(repository, input)).toBe(persisted)
    expect(append).toHaveBeenCalledTimes(1)
    expect(append).toHaveBeenCalledWith(input)
  })

  it('propagates repository failures to the caller', () => {
    const failure = new Error('audit store unavailable')
    const repository = stubRepository(() => {
      throw failure
    })

    expect(() => appendAuditEvent(repository, auditInput())).toThrow(failure)
  })
})
