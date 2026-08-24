import type { ToolResult } from '../contracts.ts'

export function createAppointmentDraft(input: unknown): ToolResult {
  return {
    status: 'succeeded',
    data: { draft: true, confirmationBlocked: true, input }
  }
}
