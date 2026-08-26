import { describe, expect, it } from 'vitest'
import { buildServer } from '../server.ts'

interface Envelope<T> {
  success: boolean
  data: T
  error: { code: string; message: string } | null
}

const supervisorHeaders = {
  'x-operator-id': 'supervisor.boundary',
  'x-operator-role': 'Supervisor'
}

async function fixture(app: ReturnType<typeof buildServer>) {
  const inbound = await app.inject({
    method: 'POST',
    url: '/v1/webhooks/channels/whatsapp/messages',
    payload: {
      externalMessageId: 'checkpoint-boundary-fixture',
      senderRef: '+5511999992222',
      body: 'Fixture bounded de auditoria',
      receivedAt: '2026-04-29T17:00:00-03:00'
    }
  })
  const sessionId = (inbound.json() as Envelope<{ sessionId: string }>).data
    .sessionId
  const audit = await app.inject({
    method: 'GET',
    url: `/v1/audit/sessions/${sessionId}`,
    headers: supervisorHeaders
  })
  const events = (audit.json() as Envelope<{ events: Array<{ id: string }> }>)
    .data.events
  return { sessionId, eventIds: events.map((event) => event.id) }
}

describe('audit evidence checkpoint API boundary', () => {
  it('rejects unauthorized checkpoint collection operations and strict fields', async () => {
    const app = buildServer()
    const createdFixture = await fixture(app)
    const missingListIdentity = await app.inject({
      method: 'GET',
      url: '/v1/observability/audit-evidence/checkpoints'
    })
    const forbiddenListIdentity = await app.inject({
      method: 'GET',
      url: '/v1/observability/audit-evidence/checkpoints',
      headers: {
        'x-operator-id': 'operator.boundary',
        'x-operator-role': 'Operator'
      }
    })
    const callerDigest = await app.inject({
      method: 'POST',
      url: '/v1/observability/audit-evidence/checkpoints',
      headers: supervisorHeaders,
      payload: {
        eventIds: createdFixture.eventIds,
        evidenceDigest: 'a'.repeat(64)
      }
    })
    const invalidFilter = await app.inject({
      method: 'POST',
      url: '/v1/observability/audit-evidence/checkpoints',
      headers: supervisorHeaders,
      payload: {
        eventIds: createdFixture.eventIds,
        filters: { type: 'not-audit-type' }
      }
    })
    await app.close()

    expect(missingListIdentity.statusCode).toBe(401)
    expect(forbiddenListIdentity.statusCode).toBe(403)
    expect(callerDigest.statusCode).toBe(400)
    expect(invalidFilter.statusCode).toBe(400)
  })

  it('returns conflict for duplicate or stale operations and hides missing records', async () => {
    const app = buildServer()
    const createdFixture = await fixture(app)
    const create = await app.inject({
      method: 'POST',
      url: '/v1/observability/audit-evidence/checkpoints',
      headers: supervisorHeaders,
      payload: {
        eventIds: createdFixture.eventIds,
        filters: { sessionId: createdFixture.sessionId }
      }
    })
    const checkpointId = (
      create.json() as Envelope<{ checkpoint: { id: string } }>
    ).data.checkpoint.id
    const duplicate = await app.inject({
      method: 'POST',
      url: '/v1/observability/audit-evidence/checkpoints',
      headers: supervisorHeaders,
      payload: {
        eventIds: createdFixture.eventIds,
        filters: { sessionId: createdFixture.sessionId }
      }
    })
    const archived = await app.inject({
      method: 'POST',
      url: `/v1/observability/audit-evidence/checkpoints/${checkpointId}/transition`,
      headers: supervisorHeaders,
      payload: { status: 'ARCHIVED', expectedStatus: 'SEALED' }
    })
    const stale = await app.inject({
      method: 'POST',
      url: `/v1/observability/audit-evidence/checkpoints/${checkpointId}/transition`,
      headers: supervisorHeaders,
      payload: { status: 'ARCHIVED', expectedStatus: 'SEALED' }
    })
    const missing = await app.inject({
      method: 'GET',
      url: '/v1/observability/audit-evidence/checkpoints/audit_checkpoint_00000000-0000-4000-8000-000000000999',
      headers: supervisorHeaders
    })
    const invalidId = await app.inject({
      method: 'GET',
      url: '/v1/observability/audit-evidence/checkpoints/not-an-id',
      headers: supervisorHeaders
    })
    await app.close()

    expect(duplicate.statusCode).toBe(409)
    expect(archived.statusCode).toBe(200)
    expect(stale.statusCode).toBe(409)
    expect(missing.statusCode).toBe(400)
    expect(invalidId.statusCode).toBe(400)
  })
})
