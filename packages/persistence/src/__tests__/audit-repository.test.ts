import { createCorrelationId } from '@cvg/shared'
import { describe, expect, it } from 'vitest'
import { InMemoryDatabase } from '../db.ts'
import { AuditRepository } from '../repositories/audit-repository.ts'

describe('audit repository', () => {
  it('stores append-only audit events and summarizes controlled evidence', () => {
    const audit = new AuditRepository(new InMemoryDatabase())
    const correlationId = createCorrelationId()

    audit.append({
      type: 'integration_event',
      actorType: 'System',
      actorId: 'api',
      correlationId,
      policyVersion: 'test',
      payload: { sessionId: 'sess_audit_trace' }
    })

    expect(audit.listBySession('sess_audit_trace')).toHaveLength(1)
    expect(audit.listEvidence({ limit: 10, offset: 0 }).pageInfo).toMatchObject(
      {
        total: 1,
        hasNextPage: false
      }
    )
    expect(audit.summarizeEvidence()).toMatchObject({
      totalEvents: 1,
      byType: { integration_event: 1 },
      bySessionId: { sess_audit_trace: 1 }
    })
  })

  it('never treats a payload tenant claim as ownership for scoped reads', () => {
    const audit = new AuditRepository(new InMemoryDatabase())
    const tenantA = 'tenant_00000000-0000-4000-8000-000000000201'
    const tenantB = 'tenant_00000000-0000-4000-8000-000000000202'

    audit.append({
      type: 'integration_event',
      actorType: 'System',
      actorId: 'untrusted-payload',
      correlationId: createCorrelationId(),
      policyVersion: 'test',
      payload: { tenantId: tenantA, sessionId: 'sess_payload_claim' }
    })
    audit.append(
      {
        type: 'integration_event',
        actorType: 'System',
        actorId: 'explicit-owner',
        correlationId: createCorrelationId(),
        policyVersion: 'test',
        payload: { tenantId: tenantA, sessionId: 'sess_explicit_owner' }
      },
      tenantA
    )

    expect(audit.listEvidence({ limit: 10, offset: 0 }, tenantA).items).toEqual(
      [expect.objectContaining({ actorId: 'explicit-owner' })]
    )
    expect(audit.listEvidence({ limit: 10, offset: 0 }, tenantB).items).toEqual(
      []
    )
  })
})
