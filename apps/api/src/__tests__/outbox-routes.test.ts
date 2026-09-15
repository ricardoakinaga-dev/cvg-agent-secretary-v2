import { AuditRepository, OutboxRepository } from '@cvg/persistence'
import { describe, expect, it } from 'vitest'
import { buildServer } from '../server.ts'

const tenantId = 'tenant_00000000-0000-4000-8000-0000000002c1'
const foreignTenantId = 'tenant_00000000-0000-4000-8000-0000000002c2'
const headers = {
  'x-operator-id': 'supervisor.dlq-2c1',
  'x-operator-role': 'Supervisor',
  'x-tenant-id': tenantId
}

describe('controlled outbox dead-letter routes', () => {
  it('projects a safe DLQ view and requeues with a scoped operator audit', async () => {
    const app = buildServer()
    const outbox = app.persistence.outbox as OutboxRepository
    const event = outbox.enqueue({
      tenantId,
      type: 'inbound.process',
      payload: {
        tenantId,
        body: 'fixture only',
        secret: 'must not reach the operator projection'
      },
      correlationId: 'corr_00000000-0000-4000-8000-0000000002c1',
      idempotencyKey: 'dlq-fixture-2c1',
      conversationId: 'conv_dlq_2c1',
      sessionId: 'sess_dlq_2c1',
      inboundMessageId: 'msg_dlq_2c1'
    })
    const claimed = outbox.claimNext({
      tenantId,
      workerId: 'worker_dlq_2c1'
    })
    expect(claimed?.id).toBe(event.id)
    outbox.fail({
      tenantId,
      eventId: event.id,
      workerId: 'worker_dlq_2c1',
      error: new Error('synthetic handler failure'),
      terminal: true
    })
    const foreignEvent = outbox.enqueue({
      tenantId: foreignTenantId,
      type: 'inbound.process',
      payload: { tenantId: foreignTenantId, body: 'foreign fixture only' },
      correlationId: 'corr_00000000-0000-4000-8000-0000000002c2',
      idempotencyKey: 'dlq-foreign-fixture-2c2',
      conversationId: 'conv_dlq_2c2',
      sessionId: 'sess_dlq_2c2',
      inboundMessageId: 'msg_dlq_2c2'
    })
    expect(
      outbox.claimNext({
        tenantId: foreignTenantId,
        workerId: 'worker_dlq_2c2'
      })?.id
    ).toBe(foreignEvent.id)
    outbox.fail({
      tenantId: foreignTenantId,
      eventId: foreignEvent.id,
      workerId: 'worker_dlq_2c2',
      error: new Error('foreign synthetic handler failure'),
      terminal: true
    })

    const listed = await app.inject({
      method: 'GET',
      url: '/v1/outbox/dead-letters',
      headers
    })
    expect(listed.statusCode).toBe(200)
    expect(listed.json().data).toMatchObject([
      {
        id: event.id,
        status: 'dead_letter',
        attempts: 1,
        conversationId: 'conv_dlq_2c1',
        lastError: '[redacted-outbox-error]'
      }
    ])
    expect(JSON.stringify(listed.json().data)).not.toContain(
      'synthetic handler'
    )
    expect(JSON.stringify(listed.json().data)).not.toContain('must not reach')
    expect(JSON.stringify(listed.json().data)).not.toContain(foreignEvent.id)

    const crossTenantRequeue = await app.inject({
      method: 'POST',
      url: `/v1/outbox/dead-letters/${foreignEvent.id}/requeue`,
      headers
    })
    expect(crossTenantRequeue.statusCode).toBe(404)

    const requeued = await app.inject({
      method: 'POST',
      url: `/v1/outbox/dead-letters/${event.id}/requeue`,
      headers
    })
    expect(requeued.statusCode).toBe(200)
    expect(requeued.json().data).toMatchObject({
      id: event.id,
      status: 'pending',
      attempts: 0
    })
    expect(outbox.pending(tenantId)).toHaveLength(1)
    const requeueCorrelationId = requeued.json().meta.correlationId
    expect(
      (app.persistence.audit as unknown as AuditRepository)
        .listByCorrelation(requeueCorrelationId, tenantId)
        .map((entry) => entry.payload)
    ).toContainEqual(
      expect.objectContaining({
        action: 'requeue_dead_letter',
        eventId: event.id,
        status: 'pending'
      })
    )
    await app.close()
  })

  it('keeps DLQ operations outside operator authority', async () => {
    const app = buildServer()
    for (const role of ['Operator', 'Approver']) {
      const headers = {
        'x-operator-id': `${role.toLowerCase()}.dlq-2c1`,
        'x-operator-role': role,
        'x-tenant-id': tenantId
      }
      const listResponse = await app.inject({
        method: 'GET',
        url: '/v1/outbox/dead-letters',
        headers
      })
      expect(listResponse.statusCode).toBe(403)
      const requeueResponse = await app.inject({
        method: 'POST',
        url: '/v1/outbox/dead-letters/outbox_forbidden_2c1/requeue',
        headers
      })
      expect(requeueResponse.statusCode).toBe(403)
    }
    await app.close()
  })

  it('allows an Admin to inspect and explicitly requeue a scoped DLQ event', async () => {
    const app = buildServer()
    const outbox = app.persistence.outbox as OutboxRepository
    const event = outbox.enqueue({
      tenantId,
      type: 'inbound.process',
      payload: { tenantId, body: 'admin synthetic fixture' },
      correlationId: 'corr_00000000-0000-4000-8000-0000000002c3',
      idempotencyKey: 'admin-dlq-fixture-2c1',
      conversationId: 'conv_admin_dlq_2c1',
      sessionId: 'sess_admin_dlq_2c1',
      inboundMessageId: 'msg_admin_dlq_2c1'
    })
    expect(
      outbox.claimNext({ tenantId, workerId: 'worker_admin_dlq_2c1' })?.id
    ).toBe(event.id)
    outbox.fail({
      tenantId,
      eventId: event.id,
      workerId: 'worker_admin_dlq_2c1',
      error: new Error('admin synthetic terminal failure'),
      terminal: true
    })

    const adminHeaders = {
      'x-operator-id': 'admin.dlq-2c1',
      'x-operator-role': 'Admin',
      'x-tenant-id': tenantId
    }
    const listed = await app.inject({
      method: 'GET',
      url: '/v1/outbox/dead-letters',
      headers: adminHeaders
    })
    expect(listed.statusCode).toBe(200)
    expect(listed.json().data.map((item: { id: string }) => item.id)).toContain(
      event.id
    )

    const requeued = await app.inject({
      method: 'POST',
      url: `/v1/outbox/dead-letters/${event.id}/requeue`,
      headers: adminHeaders
    })
    expect(requeued.statusCode).toBe(200)
    expect(requeued.json().data).toMatchObject({
      id: event.id,
      status: 'pending'
    })
    await app.close()
  })
})
