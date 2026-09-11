import { describe, expect, it } from 'vitest'
import { InMemoryDatabase, JourneyRepository } from '@cvg/persistence'
import {
  createAppointmentDraft,
  createJourneyToolRegistry,
  createOwnerDraft,
  findAvailableSlots,
  searchOwnerByPhone
} from '../index.ts'

const tenantId = 'tenant_00000000-0000-4000-8000-000000000311'

describe('journey tool adapters', () => {
  it('keeps the legacy seam while exposing controlled persistent tools when bound', () => {
    const db = new InMemoryDatabase()
    const repository = new JourneyRepository(db, {
      clock: () => new Date('2026-09-05T12:00:00.000Z')
    })
    const context = { tenantId, repository }
    const legacy = searchOwnerByPhone({ phone: '+5511999990001' })
    expect(legacy).toEqual({ status: 'succeeded', data: { matches: [] } })
    const owner = createOwnerDraft(
      {
        phone: '+5511999990001',
        idempotencyKey: 'journey-tool-owner-311'
      },
      context
    )
    expect(owner).toMatchObject({
      status: 'succeeded',
      data: { status: 'draft' }
    })
    expect(
      searchOwnerByPhone({ phone: '+5511999990001' }, context).data
    ).toMatchObject({
      matches: [{ kind: 'owner' }]
    })
    const slots = findAvailableSlots(context)
    expect(slots.status).toBe('succeeded')
    expect(
      (slots.data as { slots: Array<{ sourceVersion: string }> }).slots[0]
        ?.sourceVersion
    ).toBe('synthetic-schedule-v1')

    const registry = createJourneyToolRegistry(context)
    expect(registry.has('create_appointment_draft')).toBe(true)
    expect(registry.has('link_patient')).toBe(true)
    expect(registry.has('create_journey_task')).toBe(true)
    expect(registry.has('record_journey_handoff')).toBe(true)
    expect(registry.has('confirm_appointment')).toBe(false)
    expect(createAppointmentDraft({}, context).status).toBe('failed')
  })

  it('dispatches every registered journey tool through the narrow context', async () => {
    const repository = new JourneyRepository(new InMemoryDatabase(), {
      clock: () => new Date('2026-09-05T12:00:00.000Z')
    })
    const context = { tenantId, repository }
    const registry = createJourneyToolRegistry(context)

    expect(
      (
        await registry.execute('search_owner_by_phone', {
          phone: '+5511999990001'
        })
      ).status
    ).toBe('succeeded')
    expect(
      (
        await registry.execute('create_owner_draft', {
          phone: '+5511999990098',
          idempotencyKey: 'journey-registry-owner-311'
        })
      ).status
    ).toBe('succeeded')
    expect((await registry.execute('search_patient', {})).status).toBe(
      'succeeded'
    )
    expect((await registry.execute('find_available_slots', {})).status).toBe(
      'succeeded'
    )
    for (const name of [
      'create_patient_draft',
      'create_appointment_draft',
      'link_patient',
      'create_journey_task',
      'record_journey_handoff'
    ]) {
      expect((await registry.execute(name, {})).status).toBe('failed')
    }
    expect((await registry.execute('unknown_tool', {})).status).toBe('failed')
  })
})
