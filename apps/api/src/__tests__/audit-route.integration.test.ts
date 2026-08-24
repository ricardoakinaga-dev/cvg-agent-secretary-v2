import { describe, expect, it } from 'vitest'
import { buildServer } from '../server.ts'

interface Envelope<T> {
  success: boolean
  data: T
  error: { code: string; message: string } | null
}

describe('audit route integration', () => {
  it('returns a consolidated session trail for authorized audit reads', async () => {
    const app = buildServer()
    const inbound = await app.inject({
      method: 'POST',
      url: '/v1/webhooks/channels/whatsapp/messages',
      payload: {
        externalMessageId: 'audit-route-1',
        senderRef: 'fixture-sender',
        body: 'Mensagem ficticia',
        receivedAt: '2026-04-29T12:00:00-03:00'
      }
    })
    const inboundBody = inbound.json() as Envelope<{ sessionId: string }>

    const audit = await app.inject({
      method: 'GET',
      url: `/v1/audit/sessions/${inboundBody.data.sessionId}`,
      headers: {
        'x-operator-id': 'supervisor.audit-route',
        'x-operator-role': 'Supervisor'
      }
    })
    await app.close()

    expect(audit.statusCode).toBe(200)
    expect(
      (audit.json() as Envelope<{ events: Array<{ type: string }> }>).data
        .events
    ).toEqual([expect.objectContaining({ type: 'integration_event' })])
  })
})
