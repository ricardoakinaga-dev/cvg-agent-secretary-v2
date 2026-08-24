export function runSchedulingDraftWorkflow() {
  return {
    nextState: 'waiting_approval',
    proposedActions: [
      'find_available_slots',
      'create_appointment_draft',
      'request_human_approval'
    ],
    blockedActions: ['confirm_appointment', 'cancel_appointment']
  }
}
