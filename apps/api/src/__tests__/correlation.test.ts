import { describe, expect, it } from 'vitest'
import { buildServer, type RuntimeLogEntry } from '../server.ts'

describe('api correlation logging', () => {
  it('attaches correlation ids to runtime logs and response metadata', async () => {
    const logs: RuntimeLogEntry[] = []
    const app = buildServer({ runtimeLogger: (entry) => logs.push(entry) })
    const response = await app.inject({
      method: 'POST',
      url: '/v1/webhooks/channels/whatsapp/messages',
      payload: {
        externalMessageId: 'correlation-1',
        senderRef: 'fixture-sender',
        body: 'Mensagem ficticia',
        receivedAt: '2026-04-29T12:00:00-03:00'
      }
    })
    await app.close()

    expect(response.json().meta.correlationId).toMatch(/^corr_/)
    expect(logs[0]?.correlationId).toMatch(/^corr_/)
  })
})
