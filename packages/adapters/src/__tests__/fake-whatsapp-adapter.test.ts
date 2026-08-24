import { describe, expect, it } from 'vitest'
import { FakeWhatsAppAdapter, withRetry } from '../index.ts'

describe('channel adapters', () => {
  it('normalizes fake WhatsApp payloads into the inbound message contract', async () => {
    const adapter = new FakeWhatsAppAdapter()
    const normalized = adapter.normalize({
      id: 'msg-1',
      from: '+5511',
      text: 'Ola',
      timestamp: '2026-04-29T10:00:00-03:00'
    })

    expect(normalized.channel).toBe('whatsapp')
    expect(normalized.externalMessageId).toBe('msg-1')
    await expect(
      adapter.sendMessage({ recipientRef: '+5511', body: 'Ok' })
    ).resolves.toMatchObject({
      externalMessageId: expect.stringMatching(/^fake_/)
    })
  })

  it('retries transient failures and rethrows after exhaustion', async () => {
    let attempts = 0
    const result = await withRetry(async () => {
      attempts += 1
      if (attempts < 2) throw new Error('temporary')
      return 'ok'
    })

    expect(result).toBe('ok')
    await expect(
      withRetry(async () => {
        throw new Error('permanent')
      }, 1)
    ).rejects.toThrow(/permanent/)
  })
})
