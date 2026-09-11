import { describe, expect, it } from 'vitest'
import { ControlledDeliveryAdapter } from '../index.ts'

const tenantId = 'tenant_00000000-0000-0000-0000-000000000421'
const correlationId = 'corr_00000000-0000-0000-0000-000000000421'

describe('controlled delivery adapter', () => {
  it('journals one effect per tenant/idempotency and suppresses takeover', async () => {
    const adapter = new ControlledDeliveryAdapter()
    const input = {
      tenantId,
      recipientRef: 'fixture-recipient',
      body: 'fixture',
      idempotencyKey: 'delivery-key-421',
      correlationId
    }
    const sent = await adapter.send(input)
    const replay = await adapter.send(input)
    expect(sent).toMatchObject({ status: 'sent', externalCall: false })
    expect(replay.externalMessageId).toBe(sent.externalMessageId)
    expect(adapter.count(tenantId)).toBe(1)
    const suppressed = await adapter.send({
      ...input,
      idempotencyKey: 'delivery-takeover-421',
      takeoverActive: true
    })
    expect(suppressed).toMatchObject({
      status: 'suppressed',
      error: 'takeover_active',
      externalMessageId: null
    })
  })

  it('returns a retryable provider failure without recording an external effect', async () => {
    const adapter = new ControlledDeliveryAdapter(true)
    const input = {
      tenantId,
      recipientRef: 'fixture-recipient',
      body: 'fixture',
      idempotencyKey: 'delivery-failure-421',
      correlationId
    }
    const result = await adapter.send(input)
    expect(result).toMatchObject({
      status: 'failed',
      error: 'provider_error',
      externalCall: false
    })
    const retry = await adapter.send(input)
    expect(retry).toMatchObject({ status: 'sent', externalCall: false })
    expect(adapter.attemptsFor(tenantId, input.idempotencyKey)).toBe(2)
    expect(adapter.failuresFor(tenantId, input.idempotencyKey)).toBe(1)
    expect(adapter.attemptJournal(tenantId)).toEqual([
      {
        tenantId,
        idempotencyKey: input.idempotencyKey,
        attempt: 1,
        outcome: 'failed',
        error: 'provider_error'
      },
      {
        tenantId,
        idempotencyKey: input.idempotencyKey,
        attempt: 2,
        outcome: 'sent',
        error: null
      }
    ])
  })
})
