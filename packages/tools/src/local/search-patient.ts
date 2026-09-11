import {
  toolFailure,
  type JourneyToolContext,
  type ToolResult
} from '../contracts.ts'

export function searchPatient(
  input: unknown,
  context?: JourneyToolContext
): ToolResult {
  if (context) {
    try {
      const value = typeof input === 'object' && input !== null ? input : {}
      return {
        status: 'succeeded',
        data: {
          matches: context.repository.searchPatient({
            ...(value as Record<string, unknown>),
            tenantId: context.tenantId
          } as Parameters<JourneyToolContext['repository']['searchPatient']>[0])
        }
      }
    } catch (error) {
      return toolFailure(error)
    }
  }
  return { status: 'succeeded', data: { matches: [], input } }
}
