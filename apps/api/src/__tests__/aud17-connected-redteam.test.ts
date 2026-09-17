import { TenantIdSchema } from '@cvg/platform'
import { afterEach, describe, expect, it } from 'vitest'
import { buildServer } from '../server.ts'
import { createControlledOutboxRevalidator } from '../../../worker/src/outbox-revalidation.ts'
import { createControlledWorker } from '../../../worker/src/controlled-worker.ts'

const TENANT = TenantIdSchema.parse(
  'tenant_00000000-0000-4000-8000-000000000871'
)
const OTHER_TENANT = TenantIdSchema.parse(
  'tenant_00000000-0000-4000-8000-000000000872'
)

describe('AUD17 connected synthetic red-team path', () => {
  const apps: Array<Awaited<ReturnType<typeof buildServer>>> = []

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()))
  })

  it('connects webhook -> durable outbox -> revalidation -> controlled handler', async () => {
    const app = buildServer({
      durableInbound: true,
      webhookVerifier: () => true,
      inboundTenantResolver: () => TENANT
    })
    apps.push(app)
    const adapter = app.persistence.outbox
    if (!adapter) throw new Error('synthetic outbox adapter is unavailable')

    const inbound = await app.inject({
      method: 'POST',
      url: '/v1/webhooks/channels/web/messages',
      payload: {
        externalMessageId: 'aud17-connected-inbound-1',
        senderRef: 'synthetic-sender',
        body: 'Mensagem sintética de teste',
        receivedAt: '2026-09-17T10:00:00.000Z'
      }
    })
    expect(inbound.statusCode).toBe(200)
    expect(inbound.json().data.processing).toBe('queued')

    const handled: string[] = []
    const worker = createControlledWorker({
      tenantId: TENANT,
      workerId: 'worker_aud17_connected',
      adapter,
      handlers: {
        revalidateOutbox: createControlledOutboxRevalidator(
          app.persistence.conversations,
          TENANT
        ),
        inboundProcess: (event) => {
          handled.push(event.type)
          return { synthetic: true, externalEffect: false }
        },
        messageOutbound: () => ({ synthetic: true, externalEffect: false })
      }
    })

    const processed = await worker.processNext()
    expect(processed).toMatchObject({
      tenantId: TENANT,
      status: 'processed'
    })
    expect(handled).toEqual(['inbound.process'])
    expect(JSON.stringify(processed)).not.toContain('synthetic-sender')
    expect(await worker.processNext()).toBeNull()

    await adapter.enqueue({
      tenantId: OTHER_TENANT,
      type: 'message.outbound',
      payload: { externalEffects: false },
      idempotencyKey: 'aud17-other-tenant-event',
      correlationId: 'corr_00000000-0000-4000-8000-000000000872'
    })
    expect(await worker.processNext()).toBeNull()

    await adapter.enqueue({
      tenantId: TENANT,
      type: 'message.outbound',
      payload: { externalEffects: true },
      idempotencyKey: 'aud17-takeover-event',
      correlationId: 'corr_00000000-0000-4000-8000-000000000871'
    })
    const takeoverWorker = createControlledWorker({
      tenantId: TENANT,
      workerId: 'worker_aud17_takeover',
      adapter,
      takeoverActive: true,
      handlers: {
        inboundProcess: () => ({ synthetic: true }),
        messageOutbound: () => {
          throw new Error('takeover must suppress outbound handler')
        }
      }
    })
    expect(await takeoverWorker.processNext()).toMatchObject({
      status: 'handoff',
      handoff: true
    })
  })
})
