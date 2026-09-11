import {
  toolFailure,
  type JourneyToolContext,
  type ToolResult
} from '../contracts.ts'

export function searchOwnerByPhone(
  input: unknown,
  context?: JourneyToolContext
): ToolResult {
  const phone =
    typeof input === 'object' && input !== null && 'phone' in input
      ? String(input.phone)
      : ''
  if (!phone) return { status: 'failed', error: 'validation_failed' }
  if (context) {
    try {
      return {
        status: 'succeeded',
        data: {
          matches: context.repository.searchOwnerByPhone(
            context.tenantId,
            phone
          )
        }
      }
    } catch (error) {
      return toolFailure(error)
    }
  }
  return { status: 'succeeded', data: { matches: [] } }
}
