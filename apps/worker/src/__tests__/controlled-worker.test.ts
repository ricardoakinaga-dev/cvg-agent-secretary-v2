import { TenantIdSchema } from '@cvg/platform'
import { InMemoryDatabase, OutboxRepository } from '@cvg/persistence'
import { describe, expect, it } from 'vitest'
import { createControlledWorker } from '../controlled-worker.ts'

const tenantId = TenantIdSchema.parse(
  'tenant_00000000-0000-4000-8000-000000000171'
)
const correlationId = 'corr_00000000-0000-4000-8000-000000000171'

describe('controlled worker composition', () => {
  it('claims a tenant-scoped inbound event and acknowledges it through the registry', async () => {
    const adapter = new OutboxRepository(new InMemoryDatabase())
    const event = adapter.enqueue({
      tenantId,
      type: 'inbound.process',
      payload: {
        messageId: 'msg_fixture',
        body: 'conteúdo que não deve permanecer no envelope'
      },
      idempotencyKey: 'controlled-worker-inbound-171',
      correlationId
    })
    const seen: string[] = []
    const worker = createControlledWorker({
      tenantId,
      workerId: 'worker-controlled-171',
      adapter,
      handlers: {
        inboundProcess: (claimed) => {
          seen.push(claimed.id)
          return { runtime: 'controlled', completed: true }
        },
        messageOutbound: () => ({ runtime: 'controlled', delivered: false })
      }
    })

    await expect(worker.processNext()).resolves.toMatchObject({
      id: event.id,
      type: 'inbound.process',
      status: 'processed'
    })
    expect(seen).toEqual([event.id])
    expect(adapter.findById(event.id, tenantId)).toMatchObject({
      status: 'processed'
    })
  })

  it('does not execute an unregistered event and drains only a bounded batch', async () => {
    const adapter = new OutboxRepository(new InMemoryDatabase())
    adapter.enqueue({
      tenantId,
      type: 'synthetic.unregistered',
      payload: { fixture: true },
      idempotencyKey: 'controlled-worker-unknown-171',
      correlationId
    })
    const calls: string[] = []
    const worker = createControlledWorker({
      tenantId,
      workerId: 'worker-controlled-unknown-171',
      adapter,
      handlers: {
        inboundProcess: (event) => {
          calls.push(event.type)
          return { completed: true }
        },
        messageOutbound: () => ({ completed: true })
      }
    })

    const result = await worker.drain(1)

    expect(result.processed).toBe(1)
    expect(result.results[0]).toMatchObject({ status: 'dead_letter' })
    expect(calls).toEqual([])
  })
})
