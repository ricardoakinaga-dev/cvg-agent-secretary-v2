import {
  toolFailure,
  type JourneyToolContext,
  type ToolResult
} from '../contracts.ts'

export function createAppointmentDraft(
  input: unknown,
  context?: JourneyToolContext
): ToolResult {
  if (context) {
    try {
      const value = typeof input === 'object' && input !== null ? input : {}
      return {
        status: 'succeeded',
        data: context.repository.createAppointmentDraft({
          ...(value as Record<string, unknown>),
          tenantId: context.tenantId
        } as Parameters<
          JourneyToolContext['repository']['createAppointmentDraft']
        >[0])
      }
    } catch (error) {
      return toolFailure(error)
    }
  }
  return {
    status: 'succeeded',
    data: { draft: true, confirmationBlocked: true, input }
  }
}
