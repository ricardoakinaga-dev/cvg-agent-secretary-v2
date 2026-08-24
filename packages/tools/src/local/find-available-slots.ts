import type { ToolResult } from '../contracts.ts'

export function findAvailableSlots(): ToolResult {
  return {
    status: 'succeeded',
    data: { slots: ['2026-05-01T10:00:00-03:00', '2026-05-01T14:00:00-03:00'] }
  }
}
