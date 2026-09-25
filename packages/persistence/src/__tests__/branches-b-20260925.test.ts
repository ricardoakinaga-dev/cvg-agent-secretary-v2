import { describe, expect, it } from 'vitest'
import type { TenantId } from '@cvg/platform'
import { InMemoryDatabase } from '../db.ts'
import { ConversationRepository } from '../repositories/conversation-repository.ts'
import {
  boundedOptionalText,
  buildJourneySlots,
  JourneyRepository,
  normalizeJourneyAuditContext,
  type JourneyAuditContext
} from '../journeys.ts'

const tenantA = 'tenant_00000000-0000-4000-8000-000000000601' as TenantId
const tenantB = 'tenant_00000000-0000-4000-8000-000000000602' as TenantId
const T0 = new Date('2026-09-05T12:00:00.000Z')

function setup() {
  const db = new InMemoryDatabase()
  let now = new Date(T0)
  const advanceHours = (hours: number) => {
    now = new Date(now.getTime() + hours * 3_600_000)
  }
  const repository = new JourneyRepository(db, { clock: () => now })
  const conversations = new ConversationRepository(db)
  return { db, repository, conversations, advanceHours }
}

function linkedPatient(
  repository: JourneyRepository,
  tenantId: TenantId,
  ownerKey: string,
  patientKey: string,
  patientName: string
) {
  const owner = repository.createOwnerDraft({
    tenantId,
    phone: '+5511999990001',
    idempotencyKey: ownerKey
  })
  const patient = repository.createPatientDraft({
    tenantId,
    ownerDraftId: owner.id,
    ownerCandidateId: owner.candidateIds[0] ?? null,
    name: patientName,
    idempotencyKey: patientKey
  })
  const linked = repository.linkPatient({
    tenantId,
    patientDraftId: patient.id,
    candidateId: patient.candidateIds[0]!
  })
  return { owner, patient, linked }
}

describe('journey repository branch-b coverage', () => {
  it('rejects a draft TTL below the minimum', () => {
    expect(
      () => new JourneyRepository(new InMemoryDatabase(), { draftTtlMs: 999 })
    ).toThrow(/Draft TTL/)
  })

  it('reuses an owner draft on idempotency key replay', () => {
    const { repository } = setup()
    const first = repository.createOwnerDraft({
      tenantId: tenantA,
      phone: '+5511999990001',
      idempotencyKey: 'branch-b-owner-replay'
    })
    const second = repository.createOwnerDraft({
      tenantId: tenantA,
      phone: '+5511999990001',
      idempotencyKey: 'branch-b-owner-replay'
    })
    expect(second.id).toBe(first.id)
  })

  it('creates an owner draft without contact data', () => {
    const { repository } = setup()
    const draft = repository.createOwnerDraft({
      tenantId: tenantA,
      idempotencyKey: 'branch-b-owner-minimal'
    })
    expect(draft).toMatchObject({
      phone: null,
      name: null,
      candidateIds: []
    })
  })

  it('searches patients without an owner draft or name filter', () => {
    const { repository } = setup()
    expect(repository.searchPatient({ tenantId: tenantA })).toHaveLength(2)
  })

  it('returns no patients while the owner identity is ambiguous', () => {
    const { repository } = setup()
    const owner = repository.createOwnerDraft({
      tenantId: tenantA,
      phone: '+5511999990002',
      idempotencyKey: 'branch-b-owner-ambiguous'
    })
    expect(owner.candidateIds).toHaveLength(2)
    expect(
      repository.searchPatient({ tenantId: tenantA, ownerDraftId: owner.id })
    ).toEqual([])
  })

  it('creates a standalone patient draft across every synthetic candidate', () => {
    const { repository } = setup()
    const draft = repository.createPatientDraft({
      tenantId: tenantA,
      idempotencyKey: 'branch-b-patient-standalone'
    })
    expect(draft.ownerDraftId).toBeNull()
    expect(draft.candidateIds).toHaveLength(2)
  })

  it('lists patient drafts for the tenant scope', () => {
    const { repository } = setup()
    repository.createPatientDraft({
      tenantId: tenantA,
      name: 'Bolt',
      idempotencyKey: 'branch-b-patient-list-a'
    })
    repository.createPatientDraft({
      tenantId: tenantA,
      name: 'Luna',
      idempotencyKey: 'branch-b-patient-list-b'
    })
    expect(repository.listPatientDrafts(tenantA)).toHaveLength(2)
    expect(repository.listPatientDrafts(tenantB)).toHaveLength(0)
  })

  it('reuses a patient draft on idempotency key replay', () => {
    const { repository } = setup()
    const first = repository.createPatientDraft({
      tenantId: tenantA,
      name: 'Bolt',
      idempotencyKey: 'branch-b-patient-replay'
    })
    const second = repository.createPatientDraft({
      tenantId: tenantA,
      name: 'Bolt',
      idempotencyKey: 'branch-b-patient-replay'
    })
    expect(second.id).toBe(first.id)
  })

  it('rejects a patient bound to an unknown owner candidate', () => {
    const { repository } = setup()
    const owner = repository.createOwnerDraft({
      tenantId: tenantA,
      phone: '+5511999990001',
      idempotencyKey: 'branch-b-owner-mismatch'
    })
    expect(() =>
      repository.createPatientDraft({
        tenantId: tenantA,
        ownerDraftId: owner.id,
        ownerCandidateId: 'owner_branch_b_unknown',
        name: 'Bolt',
        idempotencyKey: 'branch-b-patient-mismatch'
      })
    ).toThrow(/not in the draft/)
  })

  it('refuses to link a patient draft twice', () => {
    const { repository } = setup()
    const { linked } = linkedPatient(
      repository,
      tenantA,
      'branch-b-owner-relk',
      'branch-b-patient-relk',
      'Bolt'
    )
    expect(linked.status).toBe('linked')
    expect(() =>
      repository.linkPatient({
        tenantId: tenantA,
        patientDraftId: linked.id,
        candidateId: linked.candidateIds[0]!
      })
    ).toThrow(/not linkable/)
  })

  it('refuses to link an ambiguous patient candidate', () => {
    const { repository } = setup()
    const draft = repository.createPatientDraft({
      tenantId: tenantA,
      idempotencyKey: 'branch-b-patient-ambiguous-link'
    })
    expect(draft.candidateIds).toHaveLength(2)
    expect(() =>
      repository.linkPatient({
        tenantId: tenantA,
        patientDraftId: draft.id,
        candidateId: draft.candidateIds[0]!
      })
    ).toThrow(/ambiguous or invalid/)
  })

  it('leaves sibling patient drafts untouched when linking', () => {
    const { repository } = setup()
    const first = repository.createPatientDraft({
      tenantId: tenantA,
      name: 'Bolt',
      idempotencyKey: 'branch-b-patient-sibling-a'
    })
    const second = repository.createPatientDraft({
      tenantId: tenantA,
      name: 'Luna',
      idempotencyKey: 'branch-b-patient-sibling-b'
    })
    const linked = repository.linkPatient({
      tenantId: tenantA,
      patientDraftId: first.id,
      candidateId: first.candidateIds[0]!
    })
    expect(linked.status).toBe('linked')
    expect(repository.findPatientDraft(tenantA, second.id)).toMatchObject({
      status: 'draft'
    })
  })

  it('refuses an appointment for an unlinked patient', () => {
    const { repository } = setup()
    const patient = repository.createPatientDraft({
      tenantId: tenantA,
      name: 'Bolt',
      idempotencyKey: 'branch-b-patient-unlinked'
    })
    const slots = repository.findAvailableSlots(tenantA, 2)
    expect(() =>
      repository.createAppointmentDraft({
        tenantId: tenantA,
        patientDraftId: patient.id,
        slot: slots[0]!.startsAt,
        idempotencyKey: 'branch-b-appointment-unlinked'
      })
    ).toThrow(/must be linked/)
  })

  it('reuses an appointment draft on idempotency key replay', () => {
    const { repository } = setup()
    const { linked } = linkedPatient(
      repository,
      tenantA,
      'branch-b-owner-appt',
      'branch-b-patient-appt',
      'Bolt'
    )
    const slots = repository.findAvailableSlots(tenantA, 2)
    expect(slots).toHaveLength(2)
    const input = {
      tenantId: tenantA,
      patientDraftId: linked.id,
      slot: slots[0]!.startsAt,
      idempotencyKey: 'branch-b-appointment-replay'
    }
    const first = repository.createAppointmentDraft(input)
    const second = repository.createAppointmentDraft(input)
    expect(second.id).toBe(first.id)
    expect(second).toMatchObject({ status: 'awaiting_approval' })
  })

  it('records handoffs with and without pending items', () => {
    const { repository } = setup()
    expect(() =>
      repository.recordHandoff({
        tenantId: tenantA,
        intent: 'synthetic handoff intent',
        risk: 'low',
        nextStep: 'synthetic next step'
      })
    ).not.toThrow()
    expect(() =>
      repository.recordHandoff({
        tenantId: tenantA,
        intent: 'synthetic handoff intent',
        risk: 'low',
        pendingItems: Array.from({ length: 21 }, (_, index) => `item-${index}`),
        nextStep: 'synthetic next step'
      })
    ).not.toThrow()
  })

  it('keeps an expired owner draft expired on reread', () => {
    const { repository, advanceHours } = setup()
    const draft = repository.createOwnerDraft({
      tenantId: tenantA,
      phone: '+5511999990001',
      idempotencyKey: 'branch-b-owner-expire'
    })
    advanceHours(25)
    expect(repository.findOwnerDraft(tenantA, draft.id)).toMatchObject({
      status: 'expired'
    })
    expect(repository.findOwnerDraft(tenantA, draft.id)).toMatchObject({
      status: 'expired'
    })
    expect(
      repository.listOwnerDrafts(tenantA).map((item) => item.status)
    ).toContain('expired')
  })

  it('expires only the stale patient draft during lookup', () => {
    const { repository, advanceHours } = setup()
    const stale = repository.createPatientDraft({
      tenantId: tenantA,
      name: 'Bolt',
      idempotencyKey: 'branch-b-patient-stale'
    })
    advanceHours(25)
    const fresh = repository.createPatientDraft({
      tenantId: tenantA,
      name: 'Luna',
      idempotencyKey: 'branch-b-patient-fresh'
    })
    expect(repository.findPatientDraft(tenantA, stale.id)).toMatchObject({
      status: 'expired'
    })
    expect(repository.findPatientDraft(tenantA, fresh.id)).toMatchObject({
      status: 'draft'
    })
    const reread = repository.findPatientDraft(tenantA, stale.id)
    expect(reread?.status).toBe('expired')
  })

  it('expires only the stale appointment draft during listing', () => {
    const { repository, advanceHours } = setup()
    const first = linkedPatient(
      repository,
      tenantA,
      'branch-b-owner-appt-a',
      'branch-b-patient-appt-a',
      'Bolt'
    )
    const slots = repository.findAvailableSlots(tenantA, 2)
    const stale = repository.createAppointmentDraft({
      tenantId: tenantA,
      patientDraftId: first.linked.id,
      slot: slots[0]!.startsAt,
      idempotencyKey: 'branch-b-appointment-stale'
    })
    advanceHours(25)
    const second = linkedPatient(
      repository,
      tenantA,
      'branch-b-owner-appt-b',
      'branch-b-patient-appt-b',
      'Luna'
    )
    const freshSlots = repository.findAvailableSlots(tenantA, 2)
    const fresh = repository.createAppointmentDraft({
      tenantId: tenantA,
      patientDraftId: second.linked.id,
      slot: freshSlots[0]!.startsAt,
      idempotencyKey: 'branch-b-appointment-fresh'
    })
    const listed = repository.listAppointmentDrafts(tenantA)
    expect(
      listed.find((item) => item.id === stale.id)?.status
    ).toBe('expired')
    expect(
      listed.find((item) => item.id === fresh.id)?.status
    ).toBe('awaiting_approval')
  })

  it('rejects patient work bound to an expired owner draft', () => {
    const { repository, advanceHours } = setup()
    const owner = repository.createOwnerDraft({
      tenantId: tenantA,
      phone: '+5511999990001',
      idempotencyKey: 'branch-b-owner-expired-use'
    })
    advanceHours(25)
    expect(() =>
      repository.createPatientDraft({
        tenantId: tenantA,
        ownerDraftId: owner.id,
        name: 'Bolt',
        idempotencyKey: 'branch-b-patient-expired-owner'
      })
    ).toThrow(/expired/)
  })

  it('rejects links to an expired patient draft', () => {
    const { repository, advanceHours } = setup()
    const draft = repository.createPatientDraft({
      tenantId: tenantA,
      name: 'Bolt',
      idempotencyKey: 'branch-b-patient-expired-link'
    })
    advanceHours(25)
    expect(() =>
      repository.linkPatient({
        tenantId: tenantA,
        patientDraftId: draft.id,
        candidateId: draft.candidateIds[0]!
      })
    ).toThrow(/expired/)
  })

  it('rejects links to unknown patient drafts', () => {    const { repository } = setup()
    expect(() =>
      repository.linkPatient({
        tenantId: tenantA,
        patientDraftId: 'patient_branch_b_missing',
        candidateId: 'candidate_branch_b_missing'
      })
    ).toThrow(/not found/)
  })

  it('rejects journey work bound to an unknown session', () => {
    const { repository } = setup()
    expect(() =>
      repository.createOwnerDraft({
        tenantId: tenantA,
        sessionId: 'sess_branch_b_missing',
        idempotencyKey: 'branch-b-owner-unknown-session'
      })
    ).toThrow(/Session not found/)
  })

  it('rejects journey work bound to another tenant session', () => {
    const { repository, conversations } = setup()
    const other = conversations.createWithSession({
      tenantId: tenantB,
      channel: 'web',
      senderRef: 'branch-b-tenant',
      externalMessageId: 'branch-b-tenant-message',
      body: 'Fixture'
    })
    expect(() =>
      repository.createOwnerDraft({
        tenantId: tenantA,
        sessionId: other.session.id,
        idempotencyKey: 'branch-b-owner-foreign-session'
      })
    ).toThrow(/outside the tenant scope/)
  })

  it('rejects journey work with a mismatched conversation and session', () => {
    const { repository, conversations } = setup()
    const first = conversations.createWithSession({
      tenantId: tenantA,
      channel: 'web',
      senderRef: 'branch-b-mismatch-a',
      externalMessageId: 'branch-b-mismatch-a',
      body: 'Fixture'
    })
    const second = conversations.createWithSession({
      tenantId: tenantA,
      channel: 'web',
      senderRef: 'branch-b-mismatch-b',
      externalMessageId: 'branch-b-mismatch-b',
      body: 'Fixture'
    })
    expect(() =>
      repository.createOwnerDraft({
        tenantId: tenantA,
        conversationId: first.conversation.id,
        sessionId: second.session.id,
        idempotencyKey: 'branch-b-owner-mismatch-context'
      })
    ).toThrow(/do not match/)
  })

  it('fails closed when the journey clock is invalid', () => {
    const repository = new JourneyRepository(new InMemoryDatabase(), {
      clock: () => new Date(Number.NaN)
    })
    expect(() =>
      repository.createOwnerDraft({
        tenantId: tenantA,
        idempotencyKey: 'branch-b-owner-bad-clock'
      })
    ).toThrow(/clock is invalid/)
  })

  it('rejects a non-string phone lookup', () => {
    const { repository } = setup()
    expect(() => repository.searchOwnerByPhone(tenantA, 12_345)).toThrow(
      /Phone is invalid/
    )
  })

  it('rejects a blank conversation reference', () => {
    const { repository } = setup()
    expect(() =>
      repository.createOwnerDraft({
        tenantId: tenantA,
        conversationId: '   ',
        idempotencyKey: 'branch-b-owner-blank-conversation'
      })
    ).toThrow(/conversationId is invalid/)
  })

  it('validates the caller-supplied journey audit context', () => {
    expect(() =>
      normalizeJourneyAuditContext(
        { actorType: 'Visitor', actorId: 'visitor-1' } as unknown as JourneyAuditContext,
        'resource_branch_b_1'
      )
    ).toThrow(/actor type is invalid/)
    expect(
      normalizeJourneyAuditContext(
        { actorType: 'Operator', actorId: 'op_branch_b' },
        'resource_branch_b_1'
      )
    ).toMatchObject({ actorType: 'Operator', actorId: 'op_branch_b' })
    expect(
      normalizeJourneyAuditContext(
        { actorType: 'Operator', actorId: 'op_branch_b' },
        'resource_branch_b_1'
      ).correlationId
    ).toMatch(/^corr_/)
  })

  it('treats a missing optional text as null', () => {
    expect(boundedOptionalText(null, 'name')).toBeNull()
    expect(boundedOptionalText(undefined, 'name')).toBeNull()
    expect(boundedOptionalText('  Bolt  ', 'name')).toBe('Bolt')
  })

  it('rejects synthetic slot limits outside the supported range', () => {
    expect(() => buildJourneySlots(tenantA, T0, 0)).toThrow(/Slot limit/)
    expect(() => buildJourneySlots(tenantA, T0, 9)).toThrow(/Slot limit/)
  })
})
