import {
  toolFailure,
  type JourneyToolContext,
  type ToolResult
} from '../contracts.ts'

export function recordJourneyHandoff(
  input: unknown,
  context?: JourneyToolContext
): ToolResult {
  if (!context) return { status: 'failed', error: 'context_required' }
  try {
    const value = typeof input === 'object' && input !== null ? input : {}
    context.repository.recordHandoff({
      ...(value as Record<string, unknown>),
      tenantId: context.tenantId
    } as Parameters<JourneyToolContext['repository']['recordHandoff']>[0])
    return { status: 'succeeded', data: { handedOff: true } }
  } catch (error) {
    return toolFailure(error)
  }
}
