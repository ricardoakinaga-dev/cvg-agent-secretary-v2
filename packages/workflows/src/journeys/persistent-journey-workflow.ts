import type {
  AppointmentDraftRecord,
  JourneyRepository,
  PatientDraftRecord,
  OwnerDraftRecord
} from '@cvg/persistence'
import type { TenantId } from '@cvg/platform'

export type PersistentJourneyState =
  | 'create_owner_draft'
  | 'clarify_owner'
  | 'create_patient_draft'
  | 'clarify_patient'
  | 'awaiting_patient_link'
  | 'awaiting_approval'
  | 'no_slots'

export interface OwnerPatientJourneyResult {
  state: PersistentJourneyState
  ownerDraft?: OwnerDraftRecord
  patientDraft?: PatientDraftRecord
  ownerMatches: Array<{
    id: string
    displayName: string
    kind: 'owner' | 'patient'
  }>
  patientMatches: Array<{
    id: string
    displayName: string
    kind: 'owner' | 'patient'
    ownerId?: string
  }>
  nextStep: string
}

export function runPersistentOwnerPatientJourney(input: {
  repository: JourneyRepository
  tenantId: TenantId
  phone: string
  name?: string | null
  idempotencyKey: string
  conversationId?: string | null
  sessionId?: string | null
}): OwnerPatientJourneyResult {
  const ownerMatches = input.repository.searchOwnerByPhone(
    input.tenantId,
    input.phone
  )
  if (ownerMatches.length > 1) {
    return {
      state: 'clarify_owner',
      ownerMatches,
      patientMatches: [],
      nextStep: 'Solicitar confirmação do tutor antes de escolher um cadastro.'
    }
  }
  const ownerDraft = input.repository.createOwnerDraft({
    tenantId: input.tenantId,
    phone: input.phone,
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.conversationId !== undefined
      ? { conversationId: input.conversationId }
      : {}),
    ...(input.sessionId !== undefined ? { sessionId: input.sessionId } : {}),
    idempotencyKey: input.idempotencyKey
  })
  const ownerCandidateId = ownerMatches[0]?.id ?? ownerDraft.candidateIds[0]
  if (!ownerCandidateId) {
    return {
      state: 'create_owner_draft',
      ownerDraft,
      ownerMatches,
      patientMatches: [],
      nextStep: 'Coletar nome e telefone adicionais para o tutor.'
    }
  }
  const patientMatches = input.repository.searchPatient({
    tenantId: input.tenantId,
    ownerCandidateId
  })
  if (patientMatches.length > 1) {
    return {
      state: 'clarify_patient',
      ownerDraft,
      ownerMatches,
      patientMatches,
      nextStep: 'Solicitar confirmação do pet antes de vincular.'
    }
  }
  if (patientMatches.length === 0) {
    const patientDraft = input.repository.createPatientDraft({
      tenantId: input.tenantId,
      ownerDraftId: ownerDraft.id,
      ownerCandidateId,
      ...(input.name !== undefined ? { name: input.name } : {}),
      idempotencyKey: `${input.idempotencyKey}:patient`,
      ...(input.conversationId !== undefined
        ? { conversationId: input.conversationId }
        : {}),
      ...(input.sessionId !== undefined ? { sessionId: input.sessionId } : {})
    })
    return {
      state: 'create_patient_draft',
      ownerDraft,
      patientDraft,
      ownerMatches,
      patientMatches,
      nextStep: 'Coletar os dados mínimos do pet.'
    }
  }
  return {
    state: 'awaiting_patient_link',
    ownerDraft,
    ownerMatches,
    patientMatches,
    nextStep: 'Solicitar confirmação explícita para vincular o pet encontrado.'
  }
}

export function runPersistentSchedulingJourney(input: {
  repository: JourneyRepository
  tenantId: TenantId
  patientDraftId: string
  idempotencyKey: string
  conversationId?: string | null
  sessionId?: string | null
}): {
  state: 'awaiting_approval' | 'no_slots'
  appointmentDraft?: AppointmentDraftRecord
  slots: ReturnType<JourneyRepository['findAvailableSlots']>
  nextStep: string
} {
  const slots = input.repository.findAvailableSlots(input.tenantId)
  if (slots.length === 0) {
    return {
      state: 'no_slots',
      slots,
      nextStep: 'Criar tarefa para contato humano e oferecer outro período.'
    }
  }
  const appointmentDraft = input.repository.createAppointmentDraft({
    tenantId: input.tenantId,
    patientDraftId: input.patientDraftId,
    slot: slots[0]!.id,
    idempotencyKey: input.idempotencyKey,
    ...(input.conversationId !== undefined
      ? { conversationId: input.conversationId }
      : {}),
    ...(input.sessionId !== undefined ? { sessionId: input.sessionId } : {})
  })
  return {
    state: 'awaiting_approval',
    appointmentDraft,
    slots,
    nextStep:
      'Aguardar aprovação humana; nenhuma confirmação é executada automaticamente.'
  }
}
