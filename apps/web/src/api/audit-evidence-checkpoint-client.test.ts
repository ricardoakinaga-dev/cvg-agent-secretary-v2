import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ApiRequestError,
  apiClient,
  isApiConflict,
  type OperatorIdentity
} from './client.ts'

const identity: OperatorIdentity = {
  operatorId: 'supervisor.checkpoint',
  role: 'Supervisor',
  tenantId: 'tenant_00000000-0000-4000-8000-000000000101'
}

describe('audit evidence checkpoint client', () => {
  afterEach(() => vi.restoreAllMocks())

  it('classifies only HTTP 409 API errors as conflicts', () => {
    expect(
      isApiConflict(new ApiRequestError('duplicate', 409, 'conflict'))
    ).toBe(true)
    expect(
      isApiConflict(new ApiRequestError('bad request', 400, 'invalid'))
    ).toBe(false)
    expect(isApiConflict(new Error('network'))).toBe(false)
  })

  it('uses tenant-scoped checkpoint endpoints without sending event payloads', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            checkpoint: {
              id: 'audit_checkpoint_00000000-0000-4000-8000-000000000101',
              tenantId: identity.tenantId,
              eventIds: ['audit_00000000-0000-4000-8000-000000000001'],
              eventCount: 1,
              evidenceDigest: 'a'.repeat(64),
              status: 'SEALED'
            }
          },
          error: null
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    await apiClient.createAuditEvidenceCheckpoint({
      identity,
      eventIds: ['audit_00000000-0000-4000-8000-000000000001'],
      filters: { sessionId: 'sess_00000000-0000-4000-8000-000000000101' }
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/v1/observability/audit-evidence/checkpoints',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          eventIds: ['audit_00000000-0000-4000-8000-000000000001'],
          filters: { sessionId: 'sess_00000000-0000-4000-8000-000000000101' }
        })
      })
    )
    expect(String(fetchMock.mock.calls[0]?.[1]?.body).includes('payload')).toBe(
      false
    )
  })

  it('lists and archives metadata with the expected CAS body', async () => {
    const response = () =>
      new Response(
        JSON.stringify({
          success: true,
          data: {
            checkpoints: [
              {
                id: 'audit_checkpoint_00000000-0000-4000-8000-000000000101',
                tenantId: identity.tenantId,
                filters: {},
                eventIds: [],
                eventCount: 0,
                evidenceDigest: 'b'.repeat(64),
                status: 'ARCHIVED',
                createdBy: identity.operatorId,
                updatedBy: identity.operatorId,
                createdAt: '2026-08-25T10:00:00.000Z',
                updatedAt: '2026-08-25T10:00:01.000Z'
              }
            ]
          },
          error: null
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(response()))

    await apiClient.listAuditEvidenceCheckpoints(identity)
    await apiClient.transitionAuditEvidenceCheckpoint({
      identity,
      checkpointId: 'audit_checkpoint_00000000-0000-4000-8000-000000000101',
      expectedStatus: 'SEALED'
    })

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/v1/observability/audit-evidence/checkpoints',
      expect.objectContaining({ headers: expect.any(Object) })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/v1/observability/audit-evidence/checkpoints/audit_checkpoint_00000000-0000-4000-8000-000000000101/transition',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ status: 'ARCHIVED', expectedStatus: 'SEALED' })
      })
    )
  })
})
