import { processOutboxEvent } from '../../../worker/src/jobs/process-outbox-event.ts'
import { createControlledWorker } from '../../../worker/src/controlled-worker.ts'
import { buildServer } from '../server.ts'
import { TenantIdSchema } from '@cvg/platform'
import { OutboxRepository } from '@cvg/persistence'
import { describe, expect, it } from 'vitest'

const tenantId = TenantIdSchema.parse(
  'tenant_00000000-0000-4000-8000-000000000141'
)

describe('durable inbound acceptance', () => {
  it('commits one inbound intent and deduplicates the webhook event', async () => {
    const app = buildServer({ durableInbound: true })
    const body = {
      senderRef: 'synthetic-tutor-141',
      externalMessageId: 'durable-inbound-141',
      body: 'Quero saber o horário de atendimento.',
      receivedAt: '2026-09-05T12:00:00.000Z'
    }

    try {
      const first = await app.inject({
        method: 'POST',
        url: '/v1/webhooks/channels/web/messages',
        headers: { 'x-tenant-id': tenantId },
        payload: body
      })
      expect(first.statusCode).toBe(200)
      const firstPayload = first.json<{ data: { outbox: { id: string } } }>()
      expect(firstPayload.data.outbox).toMatchObject({ status: 'pending' })

      const duplicate = await app.inject({
        method: 'POST',
        url: '/v1/webhooks/channels/web/messages',
        headers: { 'x-tenant-id': tenantId },
        payload: body
      })
      expect(duplicate.statusCode).toBe(200)
      const duplicatePayload = duplicate.json<{
        data: { accepted: boolean; outbox: { id: string } }
      }>()
      expect(duplicatePayload.data.accepted).toBe(false)
      expect(duplicatePayload.data.outbox.id).toBe(firstPayload.data.outbox.id)
      expect(
        (app.persistence.outbox as OutboxRepository).pending(tenantId)
      ).toHaveLength(1)
    } finally {
      await app.close()
    }
  })

  it('lets the controlled worker claim once and suppresses effects during takeover', async () => {
    const app = buildServer({ durableInbound: true })
    try {
      await app.inject({
        method: 'POST',
        url: '/v1/webhooks/channels/web/messages',
        headers: { 'x-tenant-id': tenantId },
        payload: {
          senderRef: 'synthetic-tutor-142',
          externalMessageId: 'durable-inbound-142',
          body: 'Preciso de orientação administrativa.',
          receivedAt: '2026-09-05T12:00:00.000Z'
        }
      })
      const queued = (app.persistence.outbox as OutboxRepository).pending(
        tenantId
      )[0]
      expect(queued).toBeDefined()
      const effects: unknown[] = []
      const handoff = await processOutboxEvent({
        tenantId,
        workerId: 'worker-takeover-142',
        adapter: app.persistence.outbox,
        takeoverActive: true,
        effect: () => {
          effects.push('must-not-run')
          return { sent: true }
        }
      })
      expect(handoff).toMatchObject({ status: 'handoff', handoff: true })
      expect(effects).toEqual([])
      const event = (app.persistence.outbox as OutboxRepository).pending(
        tenantId
      )
      expect(event).toHaveLength(0)
      const stored = (app.persistence.outbox as OutboxRepository).findById(
        queued!.id,
        tenantId
      )
      const session = await app.persistence.conversations.timeline(
        tenantId,
        stored!.conversationId!
      )
      expect(session.sessions[0]?.takeoverState).toBe('HANDOFF_REQUESTED')
      expect(
        app.persistence.audit.listBySession(session.sessions[0]!.id, tenantId)
      ).toEqual(
        expect.arrayContaining([expect.objectContaining({ type: 'handoff' })])
      )
    } finally {
      await app.close()
    }
  })

  it('connects the API-produced outbox event to the worker composition boundary', async () => {
    const app = buildServer({ durableInbound: true })
    const seen: string[] = []
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/webhooks/channels/web/messages',
        headers: { 'x-tenant-id': tenantId },
        payload: {
          senderRef: 'synthetic-tutor-143',
          externalMessageId: 'durable-inbound-143',
          body: 'Mensagem fictícia que não deve seguir no envelope',
          receivedAt: '2026-09-05T12:00:00.000Z'
        }
      })
      expect(response.statusCode).toBe(200)

      const worker = createControlledWorker({
        tenantId,
        workerId: 'worker-api-bridge-143',
        adapter: app.persistence.outbox,
        handlers: {
          inboundProcess: (event) => {
            seen.push(event.id)
            expect(event.payload).toMatchObject({
              body: '[redacted-outbox-body]',
              senderRef: '[redacted-sender-ref]'
            })
            return { consumed: true, externalEffects: false }
          },
          messageOutbound: () => ({ consumed: true, externalEffects: false })
        }
      })

      const processed = await worker.processNext()
      expect(processed).toMatchObject({
        type: 'inbound.process',
        status: 'processed'
      })
      expect(seen).toHaveLength(1)
    } finally {
      await app.close()
    }
  })
})
