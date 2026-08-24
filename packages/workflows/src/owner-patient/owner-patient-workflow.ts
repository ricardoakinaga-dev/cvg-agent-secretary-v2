export function ownerPatientNextStep(input: {
  ownerFound: boolean
  patientFound: boolean
}) {
  if (!input.ownerFound) return 'create_owner_draft'
  if (!input.patientFound) return 'create_patient_draft'
  return 'link_patient_to_conversation'
}
