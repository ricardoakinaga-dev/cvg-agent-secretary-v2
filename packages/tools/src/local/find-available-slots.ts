import {
  toolFailure,
  type JourneyToolContext,
  type ToolResult
} from '../contracts.ts'

export function findAvailableSlots(context?: JourneyToolContext): ToolResult {
  if (context) {
    try {
      return {
        status: 'succeeded',
        data: { slots: context.repository.findAvailableSlots(context.tenantId) }
      }
    } catch (error) {
      return toolFailure(error)
    }
  }
  return {
    status: 'succeeded',
    data: { slots: ['2026-05-01T10:00:00-03:00', '2026-05-01T14:00:00-03:00'] }
  }
}
