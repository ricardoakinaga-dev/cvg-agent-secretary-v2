import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatwootChannelAdapter } from '../adapters/chatwoot.ts'
import { EvolutionChannelAdapter } from '../adapters/evolution.ts'
import {
  CanonicalOutboundMessageSchema,
  type CanonicalOutboundMessageInput
} from '../contracts.ts'

const TENANT = 'tenant_00000000-0000-4000-8000-0000000000f1'
const CORRELATION = 'corr_00000000-0000-4000-8000-0000000000f1'

function outbound(
  channel: 'whatsapp' | 'web' = 'whatsapp',
  overrides: Partial<CanonicalOutboundMessageInput> = {}
) {
  return CanonicalOutboundMessageSchema.parse({
    messageId: 'msg_branch_1',
    tenantId: TENANT,
    conversationId: 'conv_branch',
    channel,
    recipient: { id: '5511999999999', type: 'phone' },
    body: { text: 'coverage', attachments: [] },
    correlationId: CORRELATION,
    idempotencyKey: `${TENANT}:${channel}:branch-1`,
    metadata: {},
    ...overrides
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Evolution adapter branch hardening', () => {
  it('delivers through the global fetch when no fetch implementation is injected', async () => {
    const fetchMock = vi.fn(
      async () => new Response('{"accepted":true}', { status: 200 })
    )
    vi.stubGlobal('fetch', fetchMock)
    const adapter = new EvolutionChannelAdapter({
      enabled: true,
      baseUrl: 'https://evolution.example.com/',
      apiKey: 'synthetic-key',
      instance: 'instance-1'
    })

    const result = await adapter.send(outbound())

    expect(result).toMatchObject({
      externalId: 'msg_branch_1',
      channel: 'whatsapp',
      accepted: true
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit
    ]
    expect(url).toBe(
      'https://evolution.example.com/message/sendText/instance-1'
    )
    expect(init).toMatchObject({ method: 'POST', redirect: 'error' })
    expect(init.headers).toMatchObject({ apikey: 'synthetic-key' })
    expect(JSON.parse(String(init.body))).toEqual({
      number: '5511999999999',
      text: 'coverage'
    })
  })

  it('fails closed when remoteJid cannot yield a sender identity', () => {
    const adapter = new EvolutionChannelAdapter({
      enabled: true,
      baseUrl: 'https://evolution.example.com',
      apiKey: 'synthetic-key',
      instance: 'instance-1',
      fetchImpl: async () => new Response('{}', { status: 200 })
    })

    expect(() =>
      adapter.normalize(
        {
          data: {
            key: {
              id: 'EVO-MALFORMED',
              remoteJid: { split: () => [] } as unknown as string
            },
            message: { conversation: 'texto sintetico' }
          }
        },
        {
          tenantId: TENANT,
          conversationId: 'conv_branch',
          correlationId: CORRELATION
        }
      )
    ).toThrowError(
      expect.objectContaining({
        name: 'ZodError',
        issues: expect.arrayContaining([
          expect.objectContaining({ path: ['sender', 'id'] })
        ])
      })
    )
  })

  it('rejects an endpoint that the outbound URL guard cannot allow', async () => {
    const adapter = new EvolutionChannelAdapter({
      enabled: true,
      baseUrl: 'https://evolution.example.com',
      apiKey: 'synthetic-key',
      instance: 'i'.repeat(2_100),
      fetchImpl: async () => new Response('{}', { status: 200 })
    })

    await expect(adapter.send(outbound())).rejects.toMatchObject({
      code: 'url_rejected',
      message: expect.stringContaining('endpoint rejected')
    })
  })
})

describe('Chatwoot adapter branch hardening', () => {
  it('delivers through the global fetch when no fetch implementation is injected', async () => {
    const fetchMock = vi.fn(
      async () => new Response('{"id":42}', { status: 200 })
    )
    vi.stubGlobal('fetch', fetchMock)
    const adapter = new ChatwootChannelAdapter({
      enabled: true,
      baseUrl: 'https://chatwoot.example.com/',
      apiKey: 'synthetic-token',
      accountId: '7'
    })

    const result = await adapter.send(
      outbound('web', { conversationId: 'conv_cw_branch' })
    )

    expect(result).toMatchObject({
      externalId: 'msg_branch_1',
      channel: 'web',
      accepted: true
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit
    ]
    expect(url).toBe(
      'https://chatwoot.example.com/api/v1/accounts/7/conversations/conv_cw_branch/messages'
    )
    expect(init).toMatchObject({ method: 'POST', redirect: 'error' })
    expect(init.headers).toMatchObject({
      api_access_token: 'synthetic-token'
    })
    expect(JSON.parse(String(init.body))).toEqual({
      content: 'coverage',
      message_type: 'outgoing'
    })
  })

  it('rejects an endpoint that the outbound URL guard cannot allow', async () => {
    const adapter = new ChatwootChannelAdapter({
      enabled: true,
      baseUrl: 'https://chatwoot.example.com',
      apiKey: 'synthetic-token',
      accountId: '9'.repeat(2_100),
      fetchImpl: async () => new Response('{}', { status: 200 })
    })

    await expect(adapter.send(outbound('web'))).rejects.toMatchObject({
      code: 'url_rejected',
      message: expect.stringContaining('endpoint rejected')
    })
  })
})
