import { describe, expect, it } from 'vitest'
import {
  ToolRegistry,
  createAppointmentDraft,
  createOwnerDraft,
  createPatientDraft,
  findAvailableSlots,
  searchOwnerByPhone,
  searchPatient
} from '../index.ts'

describe('tool registry and local tools', () => {
  it('executes registered tools without mutating previous registry instances', async () => {
    const empty = new ToolRegistry()
    const registry = empty.register('search_owner_by_phone', searchOwnerByPhone)

    await expect(
      empty.execute('search_owner_by_phone', { phone: '+5511' })
    ).resolves.toEqual({ status: 'failed', error: 'tool_not_found' })
    await expect(
      registry.execute('search_owner_by_phone', { phone: '+5511' })
    ).resolves.toEqual({ status: 'succeeded', data: { matches: [] } })
  })

  it('keeps local write-like tools draft-only', () => {
    expect(searchOwnerByPhone({})).toEqual({
      status: 'failed',
      error: 'validation_failed'
    })
    expect(createOwnerDraft({ name: 'Ana' }).data).toMatchObject({
      draft: true
    })
    expect(createPatientDraft({ name: 'Bolt' }).data).toMatchObject({
      draft: true
    })
    expect(searchPatient({ name: 'Bolt' }).status).toBe('succeeded')
    expect(findAvailableSlots().data).toMatchObject({
      slots: expect.any(Array)
    })
    expect(
      createAppointmentDraft({ slot: '2026-05-01T10:00:00-03:00' }).data
    ).toMatchObject({ draft: true, confirmationBlocked: true })
  })
})
