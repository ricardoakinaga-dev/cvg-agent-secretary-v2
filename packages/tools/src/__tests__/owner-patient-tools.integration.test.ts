import { describe, expect, it } from 'vitest'
import {
  createOwnerDraft,
  createPatientDraft,
  searchOwnerByPhone,
  searchPatient
} from '../index.ts'

describe('owner and patient local tools', () => {
  it('keeps owner and patient lookup deterministic and draft-only', () => {
    expect(searchOwnerByPhone({ phone: '+5511999999999' })).toEqual({
      status: 'succeeded',
      data: { matches: [] }
    })
    expect(createOwnerDraft({ name: 'Ana Ficticia' })).toMatchObject({
      status: 'succeeded',
      data: { draft: true }
    })
    expect(searchPatient({ name: 'Bolt' })).toMatchObject({
      status: 'succeeded',
      data: { matches: [] }
    })
    expect(createPatientDraft({ name: 'Bolt' })).toMatchObject({
      status: 'succeeded',
      data: { draft: true }
    })
  })
})
