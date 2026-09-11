import { InMemoryDatabase, JourneyRepository } from '@cvg/persistence'
import { describe, expect, it, vi } from 'vitest'
import {
  runPersistentOwnerPatientJourney,
  runPersistentSchedulingJourney
} from '../index.ts'

const tenantId = 'tenant_00000000-0000-4000-8000-000000000321' as const

describe('persistent journey workflow', () => {
  it('stops at clarification when an owner lookup is ambiguous', () => {
    const repository = new JourneyRepository(new InMemoryDatabase(), {
      clock: () => new Date('2026-09-05T12:00:00.000Z')
    })
    const result = runPersistentOwnerPatientJourney({
      repository,
      tenantId,
      phone: '+5511999990002',
      idempotencyKey: 'workflow-owner-ambiguous-321'
    })
    expect(result.state).toBe('clarify_owner')
    expect(result.ownerMatches).toHaveLength(2)
    expect(result.ownerDraft).toBeUndefined()
  })

  it('keeps scheduling in a durable approval-blocked draft', () => {
    let clockCalls = 0
    const repository = new JourneyRepository(new InMemoryDatabase(), {
      clock: () =>
        new Date(
          `2026-09-05T12:00:${String(clockCalls++).padStart(2, '0')}.025Z`
        )
    })
    const owner = repository.createOwnerDraft({
      tenantId,
      phone: '+5511999990001',
      idempotencyKey: 'workflow-owner-321'
    })
    const patient = repository.createPatientDraft({
      tenantId,
      ownerDraftId: owner.id,
      ownerCandidateId: owner.candidateIds[0] ?? null,
      name: 'Bolt',
      idempotencyKey: 'workflow-patient-321'
    })
    repository.linkPatient({
      tenantId,
      patientDraftId: patient.id,
      candidateId: patient.candidateIds[0]!
    })
    const result = runPersistentSchedulingJourney({
      repository,
      tenantId,
      patientDraftId: patient.id,
      idempotencyKey: 'workflow-appointment-321'
    })
    expect(result.state).toBe('awaiting_approval')
    expect(result.appointmentDraft).toMatchObject({
      confirmationBlocked: true,
      status: 'awaiting_approval'
    })
  })

  it('keeps unknown owners in a draft-only state', () => {
    const repository = {
      searchOwnerByPhone: vi.fn().mockReturnValue([]),
      createOwnerDraft: vi.fn().mockReturnValue({
        id: 'owner_draft_unknown',
        candidateIds: []
      })
    } as unknown as JourneyRepository

    const result = runPersistentOwnerPatientJourney({
      repository,
      tenantId,
      phone: '+5511999990099',
      idempotencyKey: 'workflow-owner-unknown-321'
    })

    expect(result.state).toBe('create_owner_draft')
    expect(result.patientMatches).toEqual([])
  })

  it('branches between patient draft creation and explicit patient linking', () => {
    const ownerDraft = {
      id: 'owner_draft_unique',
      candidateIds: ['owner_fixture_unique']
    }
    const patientDraft = { id: 'patient_draft_new' }
    const repository = {
      searchOwnerByPhone: vi
        .fn()
        .mockReturnValue([{ id: 'owner_fixture_unique', kind: 'owner' }]),
      createOwnerDraft: vi.fn().mockReturnValue(ownerDraft),
      createPatientDraft: vi.fn().mockReturnValue(patientDraft),
      searchPatient: vi
        .fn()
        .mockReturnValueOnce([])
        .mockReturnValueOnce([{ id: 'patient_fixture_one', kind: 'patient' }])
    } as unknown as JourneyRepository

    const draftResult = runPersistentOwnerPatientJourney({
      repository,
      tenantId,
      phone: '+5511999990001',
      idempotencyKey: 'workflow-patient-new-321'
    })
    const linkResult = runPersistentOwnerPatientJourney({
      repository,
      tenantId,
      phone: '+5511999990001',
      idempotencyKey: 'workflow-patient-existing-321'
    })

    expect(draftResult.state).toBe('create_patient_draft')
    expect(draftResult.patientDraft).toBe(patientDraft)
    expect(linkResult.state).toBe('awaiting_patient_link')
    expect(linkResult.patientMatches).toHaveLength(1)
  })

  it('hands scheduling without available slots to a human task', () => {
    const repository = {
      findAvailableSlots: vi.fn().mockReturnValue([])
    } as unknown as JourneyRepository

    const result = runPersistentSchedulingJourney({
      repository,
      tenantId,
      patientDraftId: 'patient_draft_missing-slot',
      idempotencyKey: 'workflow-no-slots-321'
    })

    expect(result).toEqual({
      state: 'no_slots',
      slots: [],
      nextStep: expect.stringContaining('contato humano')
    })
  })
})
