import { describe, expect, it } from 'vitest'
import { buildServer, type RuntimeLogEntry } from '../server.ts'

interface Envelope<T> {
  success: boolean
  data: T
  error: { code: string; message: string } | null
}

const supervisorHeaders = {
  'x-operator-id': 'supervisor.checkpoint',
  'x-operator-role': 'Supervisor'
}

async function createAuditFixture(app: ReturnType<typeof buildServer>) {
  const inbound = await app.inject({
    method: 'POST',
    url: '/v1/webhooks/channels/whatsapp/messages',
    payload: {
      externalMessageId: 'checkpoint-fixture-message',
      senderRef: '+5511999990000',
      body: 'Fixture controlada para checkpoint de auditoria',
      receivedAt: '2026-04-29T17:00:00-03:00'
    }
  })
  const inboundBody = inbound.json() as Envelope<{ sessionId: string }>
  const audit = await app.inject({
    method: 'GET',
    url: `/v1/audit/sessions/${inboundBody.data.sessionId}`,
    headers: supervisorHeaders
  })
  const auditBody = audit.json() as Envelope<{
    events: Array<{ id: string; payload?: unknown }>
  }>
  return {
    sessionId: inboundBody.data.sessionId,
    eventIds: auditBody.data.events.map((event) => event.id)
  }
}

describe('audit evidence checkpoint API', () => {
  it('seals, lists, reads and archives a redacted metadata-only checkpoint', async () => {
    const logs: RuntimeLogEntry[] = []
    const app = buildServer({ runtimeLogger: (entry) => logs.push(entry) })
    const fixture = await createAuditFixture(app)

    const create = await app.inject({
      method: 'POST',
      url: '/v1/observability/audit-evidence/checkpoints',
      headers: supervisorHeaders,
      payload: {
        eventIds: fixture.eventIds,
        filters: { sessionId: fixture.sessionId }
      }
    })
    const createdBody = create.json() as Envelope<{
      checkpoint: {
        id: string
        eventIds: string[]
        eventCount: number
        evidenceDigest: string
        status: string
      }
    }>
    const checkpointId = createdBody.data.checkpoint.id

    const listed = await app.inject({
      method: 'GET',
      url: '/v1/observability/audit-evidence/checkpoints',
      headers: supervisorHeaders
    })
    const read = await app.inject({
      method: 'GET',
      url: `/v1/observability/audit-evidence/checkpoints/${checkpointId}`,
      headers: supervisorHeaders
    })
    const archive = await app.inject({
      method: 'POST',
      url: `/v1/observability/audit-evidence/checkpoints/${checkpointId}/transition`,
      headers: supervisorHeaders,
      payload: { status: 'ARCHIVED', expectedStatus: 'SEALED' }
    })
    await app.close()

    expect(create.statusCode).toBe(200)
    expect(createdBody.data.checkpoint).toMatchObject({
      eventIds: fixture.eventIds,
      eventCount: fixture.eventIds.length,
      status: 'SEALED'
    })
    expect(createdBody.data.checkpoint.evidenceDigest).toMatch(/^[a-f0-9]{64}$/)
    expect(listed.statusCode).toBe(200)
    expect(
      (listed.json() as Envelope<{ checkpoints: unknown[] }>).data.checkpoints
    ).toHaveLength(1)
    expect(read.statusCode).toBe(200)
    expect(archive.statusCode).toBe(200)
    expect(
      (archive.json() as Envelope<{ checkpoint: { status: string } }>).data
        .checkpoint.status
    ).toBe('ARCHIVED')
    expect(logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'observability.audit_evidence_checkpoint_sealed',
          status: 'ok'
        }),
        expect.objectContaining({
          event: 'observability.audit_evidence_checkpoint_archived',
          status: 'ok'
        })
      ])
    )
    expect(JSON.stringify(createdBody)).not.toContain('payload')
  })

  it('enforces audit identity, bounded input and tenant isolation', async () => {
    const app = buildServer()
    const fixture = await createAuditFixture(app)
    const missingIdentity = await app.inject({
      method: 'POST',
      url: '/v1/observability/audit-evidence/checkpoints',
      payload: { eventIds: fixture.eventIds }
    })
    const forbiddenRole = await app.inject({
      method: 'POST',
      url: '/v1/observability/audit-evidence/checkpoints',
      headers: {
        'x-operator-id': 'operator.checkpoint',
        'x-operator-role': 'Operator'
      },
      payload: { eventIds: fixture.eventIds }
    })
    const invalidBody = await app.inject({
      method: 'POST',
      url: '/v1/observability/audit-evidence/checkpoints',
      headers: supervisorHeaders,
      payload: { eventIds: ['audit_not-valid'] }
    })
    const wrongTenant = await app.inject({
      method: 'POST',
      url: '/v1/observability/audit-evidence/checkpoints',
      headers: {
        ...supervisorHeaders,
        'x-tenant-id': 'tenant_00000000-0000-4000-8000-000000000999'
      },
      payload: { eventIds: fixture.eventIds }
    })
    await app.close()

    expect(missingIdentity.statusCode).toBe(401)
    expect(forbiddenRole.statusCode).toBe(403)
    expect(invalidBody.statusCode).toBe(400)
    expect(wrongTenant.statusCode).toBe(400)
  })
})
