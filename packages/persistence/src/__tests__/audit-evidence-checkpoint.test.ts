import { describe, expect, it } from 'vitest'
import {
  AuditEvidenceCheckpointCreateInputSchema,
  computeAuditEvidenceCheckpointDigest
} from '../audit-evidence-checkpoint.ts'
import { InMemoryDatabase } from '../db.ts'
import { AuditRepository } from '../repositories/audit-repository.ts'

const tenantId = 'tenant_00000000-0000-4000-8000-000000000101'
const otherTenantId = 'tenant_00000000-0000-4000-8000-000000000102'
const sessionId = 'sess_00000000-0000-4000-8000-000000000101'

function appendEvent(
  repository: AuditRepository,
  rawTenantId: string,
  correlationId: string,
  actorId: string
) {
  return repository.append(
    {
      type: 'integration_event',
      actorType: 'System',
      actorId,
      correlationId,
      policyVersion: 'checkpoint-test-v1',
      payload: {
        tenantId: rawTenantId,
        sessionId,
        event: 'controlled_fixture',
        secret: 'must-not-be-retained'
      }
    },
    rawTenantId as typeof tenantId
  )
}

describe('audit evidence checkpoint contract', () => {
  it('requires bounded unique audit ids and canonicalizes order', () => {
    const parsed = AuditEvidenceCheckpointCreateInputSchema.parse({
      eventIds: [
        'audit_00000000-0000-4000-8000-000000000002',
        'audit_00000000-0000-4000-8000-000000000001'
      ],
      filters: { sessionId }
    })

    expect(parsed.eventIds).toHaveLength(2)
    expect(() =>
      AuditEvidenceCheckpointCreateInputSchema.parse({ eventIds: [] })
    ).toThrow()
    expect(() =>
      AuditEvidenceCheckpointCreateInputSchema.parse({
        eventIds: ['audit_00000000-0000-4000-8000-000000000001']
      })
    ).not.toThrow()
    expect(computeAuditEvidenceCheckpointDigest(tenantId, parsed, [])).toMatch(
      /^[a-f0-9]{64}$/
    )
  })

  it('seals only matching tenant-scoped event metadata and supports CAS archive', () => {
    const repository = new AuditRepository(new InMemoryDatabase())
    const first = appendEvent(
      repository,
      tenantId,
      'corr_00000000-0000-4000-8000-000000000101',
      'system.first'
    )
    const second = appendEvent(
      repository,
      tenantId,
      'corr_00000000-0000-4000-8000-000000000102',
      'system.second'
    )
    appendEvent(
      repository,
      otherTenantId,
      'corr_00000000-0000-4000-8000-000000000103',
      'system.other'
    )

    const checkpoint = repository.createAuditEvidenceCheckpoint(
      {
        eventIds: [second.id, first.id],
        filters: { sessionId }
      },
      'supervisor.checkpoint',
      tenantId
    )

    expect(checkpoint).toMatchObject({
      tenantId,
      eventIds: [first.id, second.id].sort(),
      eventCount: 2,
      status: 'SEALED',
      createdBy: 'supervisor.checkpoint'
    })
    expect(checkpoint.evidenceDigest).toMatch(/^[a-f0-9]{64}$/)
    expect(JSON.stringify(checkpoint)).not.toContain('must-not-be-retained')
    expect(repository.listAuditEvidenceCheckpoints(tenantId)).toHaveLength(1)

    const archived = repository.transitionAuditEvidenceCheckpoint(
      checkpoint.id,
      'ARCHIVED',
      'admin.checkpoint',
      'SEALED',
      tenantId
    )
    expect(archived?.status).toBe('ARCHIVED')
    expect(() =>
      repository.transitionAuditEvidenceCheckpoint(
        checkpoint.id,
        'ARCHIVED',
        'admin.checkpoint',
        'SEALED',
        tenantId
      )
    ).toThrowError(/transition|status/i)
    expect(() =>
      repository.transitionAuditEvidenceCheckpoint(
        checkpoint.id,
        'ARCHIVED',
        'admin.checkpoint',
        'ARCHIVED',
        tenantId
      )
    ).toThrowError(/transition/i)
  })

  it('rejects foreign, missing, duplicate and filter-mismatched events', () => {
    const repository = new AuditRepository(new InMemoryDatabase())
    const event = appendEvent(
      repository,
      tenantId,
      'corr_00000000-0000-4000-8000-000000000104',
      'system.match'
    )
    const other = appendEvent(
      repository,
      otherTenantId,
      'corr_00000000-0000-4000-8000-000000000105',
      'system.foreign'
    )

    const defaultFilterCheckpoint = repository.createAuditEvidenceCheckpoint(
      { eventIds: [event.id] },
      'supervisor.checkpoint',
      tenantId
    )
    expect(defaultFilterCheckpoint.filters).toEqual({})
    const fullyFilteredCheckpoint = repository.createAuditEvidenceCheckpoint(
      {
        eventIds: [event.id],
        filters: {
          sessionId,
          correlationId: 'corr_00000000-0000-4000-8000-000000000104',
          type: 'integration_event',
          actorId: 'system.match'
        }
      },
      'supervisor.checkpoint',
      tenantId
    )
    expect(fullyFilteredCheckpoint.filters).toMatchObject({
      type: 'integration_event',
      actorId: 'system.match'
    })
    const foreignCheckpoint = repository.createAuditEvidenceCheckpoint(
      { eventIds: [other.id] },
      'supervisor.checkpoint',
      otherTenantId
    )
    expect(
      repository.getAuditEvidenceCheckpoint(foreignCheckpoint.id, tenantId)
    ).toBeNull()
    const archivedFiltered = repository.transitionAuditEvidenceCheckpoint(
      fullyFilteredCheckpoint.id,
      'ARCHIVED',
      'admin.checkpoint',
      'SEALED',
      tenantId
    )
    expect(archivedFiltered?.status).toBe('ARCHIVED')

    expect(
      repository.getAuditEvidenceCheckpoint(
        'audit_checkpoint_00000000-0000-4000-8000-000000000099',
        tenantId
      )
    ).toBeNull()
    expect(() =>
      repository.getAuditEvidenceCheckpoint(
        'audit_checkpoint_00000000-0000-4000-8000-000000000099'
      )
    ).toThrowError(/tenant/i)
    expect(
      repository.transitionAuditEvidenceCheckpoint(
        'audit_checkpoint_00000000-0000-4000-8000-000000000099',
        'ARCHIVED',
        'supervisor.checkpoint',
        'SEALED',
        tenantId
      )
    ).toBeNull()
    expect(() =>
      repository.createAuditEvidenceCheckpoint(
        {
          eventIds: [event.id],
          filters: { type: 'approval_decision' }
        },
        'supervisor.checkpoint',
        tenantId
      )
    ).toThrowError(/filter|match/i)

    expect(() =>
      repository.createAuditEvidenceCheckpoint(
        { eventIds: [other.id] },
        'supervisor.checkpoint',
        tenantId
      )
    ).toThrowError(/tenant|event/i)
    expect(() =>
      repository.createAuditEvidenceCheckpoint(
        {
          eventIds: ['audit_00000000-0000-4000-8000-000000000099']
        },
        'supervisor.checkpoint',
        tenantId
      )
    ).toThrowError(/tenant|event/i)
    expect(() =>
      repository.createAuditEvidenceCheckpoint(
        { eventIds: [event.id, event.id] },
        'supervisor.checkpoint',
        tenantId
      )
    ).toThrow()
    expect(() =>
      repository.createAuditEvidenceCheckpoint(
        {
          eventIds: [event.id],
          filters: {
            correlationId: 'corr_00000000-0000-4000-8000-000000000999'
          }
        },
        'supervisor.checkpoint',
        tenantId
      )
    ).toThrowError(/filter|match/i)
  })
})
