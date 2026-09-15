import { ApprovalEngine } from '@cvg/approval-engine'
import { AuditRepository, OutboxRepository } from '@cvg/persistence'
import { describe, expect, it } from 'vitest'
import { buildServer } from '../server.ts'

const tenantId = 'tenant_00000000-0000-4000-8000-0000000002b1'
const correlationId = 'corr_00000000-0000-4000-8000-0000000002b1'
const traceId = 'abcdefabcdefabcdefabcdefabcdefab'

const headers = {
  'x-operator-id': 'admin.runtime-approval',
  'x-operator-role': 'Supervisor',
  'x-tenant-id': tenantId
}

function createAuthority(includeTrace = true): ApprovalEngine {
  const authority = new ApprovalEngine()
  authority.request({
    tenantId,
    operatorId: 'op_synthetic_kernel',
    agentId: 'agent_synthetic_kernel_2b1',
    agentVersion: 'synthetic-v1',
    action: 'draft_update',
    resource: { type: 'appointment_draft', id: 'draft_2b1' },
    payload: { text: 'fixture only' },
    policyVersion: 'synthetic.controlled-kernel@1.0.0',
    correlationId,
    continuation: {
      conversationId: 'conv_runtime_approval_2b1',
      sessionId: 'sess_runtime_approval_2b1',
      inboundMessageId: 'msg_runtime_approval_2b1',
      ...(includeTrace ? { traceId } : {})
    }
  })
  return authority
}

describe('governed runtime approval routes', () => {
  it('decides the canonical runtime approval and enqueues an idempotent continuation', async () => {
    const authority = createAuthority()
    const app = buildServer({ runtimeApprovalAuthority: authority })
    const approval = (await authority.list(tenantId))[0]
    if (!approval) throw new Error('Approval fixture was not created')

    const listed = await app.inject({
      method: 'GET',
      url: '/v1/runtime-approvals',
      headers
    })
    expect(listed.statusCode).toBe(200)
    expect(listed.json().data).toHaveLength(1)

    const first = await app.inject({
      method: 'POST',
      url: `/v1/runtime-approvals/${approval.approvalId}/decision`,
      headers,
      payload: { decision: 'approve', reason: 'controlled fixture review' }
    })
    expect(first.statusCode).toBe(200)
    expect(first.json().data.approval.status).toBe('APPROVED')
    expect(first.json().data.continuationEventId).toBeTruthy()

    const outbox = app.persistence.outbox as OutboxRepository
    const pending = outbox.pending(tenantId)
    expect(pending).toHaveLength(1)
    expect(pending[0]).toMatchObject({
      type: 'inbound.process',
      correlationId,
      traceId,
      conversationId: 'conv_runtime_approval_2b1',
      sessionId: 'sess_runtime_approval_2b1',
      inboundMessageId: 'msg_runtime_approval_2b1',
      payload: {
        kind: 'runtime_approval.continue',
        approvalId: approval.approvalId
      }
    })
    expect(
      (app.persistence.audit as unknown as AuditRepository)
        .listByCorrelation(correlationId, tenantId)
        .map((entry) => entry.payload)
    ).toContainEqual(
      expect.objectContaining({
        approvalId: approval.approvalId,
        requestCorrelationId: expect.any(String)
      })
    )

    const retry = await app.inject({
      method: 'POST',
      url: `/v1/runtime-approvals/${approval.approvalId}/decision`,
      headers,
      payload: { decision: 'approve' }
    })
    expect(retry.statusCode).toBe(200)
    expect(retry.json().data.continuationEventId).toBe(
      first.json().data.continuationEventId
    )
    expect(outbox.pending(tenantId)).toHaveLength(1)
    await app.close()
  })

  it('does not allow a viewer to decide a runtime approval', async () => {
    const authority = createAuthority()
    const approval = (await authority.list(tenantId))[0]
    if (!approval) throw new Error('Approval fixture was not created')
    const app = buildServer({ runtimeApprovalAuthority: authority })
    const response = await app.inject({
      method: 'POST',
      url: `/v1/runtime-approvals/${approval.approvalId}/decision`,
      headers: {
        'x-operator-id': 'operator.runtime-approval',
        'x-operator-role': 'Operator',
        'x-tenant-id': tenantId
      },
      payload: { decision: 'approve' }
    })
    expect(response.statusCode).toBe(403)
    await app.close()
  })

  it('enqueues a rejection continuation without authorizing an effect', async () => {
    const authority = createAuthority()
    const approval = (await authority.list(tenantId))[0]
    if (!approval) throw new Error('Approval fixture was not created')
    const app = buildServer({ runtimeApprovalAuthority: authority })
    const response = await app.inject({
      method: 'POST',
      url: `/v1/runtime-approvals/${approval.approvalId}/decision`,
      headers,
      payload: { decision: 'reject', reason: 'synthetic review denied' }
    })
    expect(response.statusCode).toBe(200)
    expect(response.json().data.approval.status).toBe('REJECTED')
    expect(response.json().data.continuationEventId).toBeTruthy()
    const outbox = app.persistence.outbox as OutboxRepository
    expect(outbox.pending(tenantId)[0]?.payload).toMatchObject({
      kind: 'runtime_approval.continue',
      approvalId: approval.approvalId,
      decision: 'reject'
    })
    await app.close()
  })

  it('fails closed when an approval continuation has no durable trace root', async () => {
    const authority = createAuthority(false)
    const approval = (await authority.list(tenantId))[0]
    if (!approval) throw new Error('Approval fixture was not created')
    const app = buildServer({ runtimeApprovalAuthority: authority })

    const response = await app.inject({
      method: 'POST',
      url: `/v1/runtime-approvals/${approval.approvalId}/decision`,
      headers,
      payload: { decision: 'approve' }
    })

    expect(response.statusCode).toBe(400)
    expect(
      (app.persistence.outbox as OutboxRepository).pending(tenantId)
    ).toHaveLength(0)
    await app.close()
  })
})
