import {
  toolFailure,
  type JourneyToolContext,
  type ToolResult
} from '../contracts.ts'

export function createJourneyTask(
  input: unknown,
  context?: JourneyToolContext
): ToolResult {
  if (!context) return { status: 'failed', error: 'context_required' }
  try {
    const value = typeof input === 'object' && input !== null ? input : {}
    return {
      status: 'succeeded',
      data: context.repository.createJourneyTask({
        ...(value as Record<string, unknown>),
        tenantId: context.tenantId
      } as Parameters<JourneyToolContext['repository']['createJourneyTask']>[0])
    }
  } catch (error) {
    return toolFailure(error)
  }
}
