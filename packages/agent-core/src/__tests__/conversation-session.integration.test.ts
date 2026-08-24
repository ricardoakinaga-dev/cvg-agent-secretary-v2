import { ConversationRepository, InMemoryDatabase } from '@cvg/persistence'
import { describe, expect, it } from 'vitest'
import { getConversationTimeline, receiveInboundMessage } from '../index.ts'

describe('conversation session integration', () => {
  it('creates one conversation, session and message for a new inbound message', async () => {
    const conversations = new ConversationRepository(new InMemoryDatabase())

    const result = await receiveInboundMessage(
      { conversations },
      {
        tenantId: 'tenant_00000000-0000-4000-8000-000000000076',
        channel: 'whatsapp',
        externalMessageId: 'conv-session-1',
        senderRef: 'fixture-sender',
        body: 'Mensagem ficticia',
        receivedAt: new Date()
      }
    )

    const timeline = await getConversationTimeline(
      conversations,
      'tenant_00000000-0000-4000-8000-000000000076',
      result.conversationId
    )

    expect(result.accepted).toBe(true)
    expect(result.sessionId).toMatch(/^sess_/)
    expect(timeline.messages).toHaveLength(1)
    expect(timeline.sessions).toHaveLength(1)
  })
})
