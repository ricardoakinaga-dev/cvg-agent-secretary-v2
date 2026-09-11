import { ToolRegistry } from '../registry.ts'
import type { JourneyToolContext } from '../contracts.ts'
import { createAppointmentDraft } from './create-appointment-draft.ts'
import { createOwnerDraft } from './create-owner-draft.ts'
import { createPatientDraft } from './create-patient-draft.ts'
import { createJourneyTask } from './create-journey-task.ts'
import { findAvailableSlots } from './find-available-slots.ts'
import { linkPatient } from './link-patient.ts'
import { recordJourneyHandoff } from './record-journey-handoff.ts'
import { searchOwnerByPhone } from './search-owner-by-phone.ts'
import { searchPatient } from './search-patient.ts'

/** Binds the persistent journey seam without exposing repository internals to handlers. */
export function createJourneyToolRegistry(
  context: JourneyToolContext
): ToolRegistry {
  return new ToolRegistry()
    .register('search_owner_by_phone', (input) =>
      searchOwnerByPhone(input, context)
    )
    .register('create_owner_draft', (input) => createOwnerDraft(input, context))
    .register('search_patient', (input) => searchPatient(input, context))
    .register('create_patient_draft', (input) =>
      createPatientDraft(input, context)
    )
    .register('find_available_slots', () => findAvailableSlots(context))
    .register('create_appointment_draft', (input) =>
      createAppointmentDraft(input, context)
    )
    .register('link_patient', (input) => linkPatient(input, context))
    .register('create_journey_task', (input) =>
      createJourneyTask(input, context)
    )
    .register('record_journey_handoff', (input) =>
      recordJourneyHandoff(input, context)
    )
}
