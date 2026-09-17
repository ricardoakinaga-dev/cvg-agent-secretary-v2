import { TenantIdSchema } from '@cvg/platform'
import {
  InMemoryDatabase,
  OutboxRepository,
  type OutboxEventRecord
} from '@cvg/persistence'
import { describe, expect, it } from 'vitest'
import {
  OutboxDispatchRejectedError,
  processOutboxEvent
} from '../jobs/process-outbox-event.ts'

const tenantId = TenantIdSchema.parse(
  'tenant_00000000-0000-4000-8000-000000000161'
)
const correlationId = 'corr_00000000-0000-4000-8000-000000000161'

describe('worker outbox recovery', () => {
  it('keeps a failed effect retryable and journals the successful retry once', async () => {
    let now = new Date('2026-09-05T12:00:00.000Z')
    const db = new InMemoryDatabase()
    const adapter = new OutboxRepository(db, {
      now: () => now,
      leaseMs: 1_000,
      backoffBaseMs: 10,
      backoffMaxMs: 10
    })
    adapter.enqueue({
      tenantId,
      type: 'message.outbound',
      payload: { fixture: true },
      idempotencyKey: 'worker-recovery-161',
      correlationId
    })
    let calls = 0
    const effect = () => {
      calls += 1
      if (calls === 1) throw new Error('synthetic transient')
      return { delivered: false }
    }

    const failed = await processOutboxEvent({
      tenantId,
      workerId: 'worker-recovery',
      adapter,
      effect
    })
    expect(failed).toMatchObject({ status: 'failed', attempts: 1 })
    now = new Date((failed as { availableAt: Date }).availableAt.getTime())
    const processed = await processOutboxEvent({
      tenantId,
      workerId: 'worker-recovery',
      adapter,
      effect
    })
    expect(processed).toMatchObject({ status: 'processed', attempts: 2 })
    expect(calls).toBe(2)
    expect(db.state.outboxEffects).toHaveLength(1)
  })

  it('replays a crash window through an idempotent synthetic effect', async () => {
    let now = new Date('2026-09-05T12:00:00.000Z')
    const db = new InMemoryDatabase()
    const adapter = new OutboxRepository(db, {
      now: () => now,
      leaseMs: 1_000,
      backoffBaseMs: 10,
      backoffMaxMs: 10
    })
    await adapter.enqueue({
      tenantId,
      type: 'message.outbound',
      payload: { fixture: 'crash-window' },
      idempotencyKey: 'worker-crash-window-161',
      correlationId
    })
    const applied = new Set<string>()
    let handlerCalls = 0
    const effect = (event: OutboxEventRecord) => {
      handlerCalls += 1
      const idempotencyKey = event.idempotencyKey ?? event.id
      const firstObservation = !applied.has(idempotencyKey)
      applied.add(idempotencyKey)
      if (firstObservation)
        throw new Error('synthetic crash after local effect')
      return { deduplicated: true }
    }

    const failed = await processOutboxEvent({
      tenantId,
      workerId: 'worker-crash-window',
      adapter,
      effect
    })
    expect(failed).toMatchObject({ status: 'failed', attempts: 1 })
    now = new Date((failed as { availableAt: Date }).availableAt.getTime())
    const processed = await processOutboxEvent({
      tenantId,
      workerId: 'worker-crash-window',
      adapter,
      effect
    })

    expect(processed).toMatchObject({ status: 'processed', attempts: 2 })
    expect(handlerCalls).toBe(2)
    expect(applied).toEqual(new Set(['worker-crash-window-161']))
    expect(db.state.outboxEffects).toHaveLength(1)
  })

  it('dead-letters an unknown handler without executing an effect', async () => {
    const adapter = new OutboxRepository(new InMemoryDatabase())
    adapter.enqueue({
      tenantId,
      type: 'synthetic.unknown',
      payload: { fixture: true },
      idempotencyKey: 'worker-unknown-161',
      correlationId
    })
    const result = await processOutboxEvent({
      tenantId,
      workerId: 'worker-unknown',
      adapter
    })
    expect(result).toMatchObject({ status: 'dead_letter', attempts: 1 })
  })

  it('rechecks takeover inside ack when the state changes after claim', async () => {
    let checks = 0
    let effects = 0
    const adapter = new OutboxRepository(new InMemoryDatabase())
    adapter.enqueue({
      tenantId,
      type: 'message.outbound',
      payload: { fixture: true },
      idempotencyKey: 'worker-takeover-race-161',
      correlationId
    })

    const result = await processOutboxEvent({
      tenantId,
      workerId: 'worker-takeover-race',
      adapter,
      takeoverActive: () => {
        checks += 1
        return checks > 1
      },
      effect: () => {
        effects += 1
        return { delivered: true }
      }
    })

    expect(result).toMatchObject({
      status: 'handoff',
      handoff: true,
      tenantId
    })
    expect(effects).toBe(0)
  })

  it('revalidates a recovered claim before the effect and terminally rejects stale state', async () => {
    const adapter = new OutboxRepository(new InMemoryDatabase())
    adapter.enqueue({
      tenantId,
      type: 'message.outbound',
      payload: { fixture: true },
      idempotencyKey: 'worker-revalidation-161',
      correlationId
    })
    const order: string[] = []

    const result = await processOutboxEvent({
      tenantId,
      workerId: 'worker-revalidation',
      adapter,
      revalidate: (event) => {
        order.push(`revalidate:${event.id}`)
        throw new OutboxDispatchRejectedError('approval was revoked')
      },
      effect: () => {
        order.push('effect')
        return { delivered: true }
      }
    })

    expect(result).toMatchObject({
      status: 'dead_letter',
      lastError: 'outbox_error:outbox_dispatch_rejected'
    })
    expect(order).toHaveLength(1)
    expect(order[0]).toMatch(/^revalidate:/)
  })
})
