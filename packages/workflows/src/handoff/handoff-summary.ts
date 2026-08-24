export interface HandoffContext {
  tutor?: string
  pet?: string
  intent?: string
  collectedData?: string[]
  risk?: string
  toolsUsed?: string[]
  pendingItems?: string[]
  recommendedNextStep?: string
}

export function buildHandoffSummary(context: HandoffContext): string {
  if (!context.intent || !context.recommendedNextStep) {
    throw new Error('handoff_requires_intent_and_next_step')
  }
  return [
    `Tutor: ${context.tutor ?? 'unknown'}`,
    `Pet: ${context.pet ?? 'unknown'}`,
    `Intent: ${context.intent}`,
    `Risk: ${context.risk ?? 'unknown'}`,
    `Collected: ${(context.collectedData ?? []).join(', ') || 'none'}`,
    `Tools: ${(context.toolsUsed ?? []).join(', ') || 'none'}`,
    `Pending: ${(context.pendingItems ?? []).join(', ') || 'none'}`,
    `Next: ${context.recommendedNextStep}`
  ].join('\n')
}
