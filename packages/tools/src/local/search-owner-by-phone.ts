import type { ToolResult } from '../contracts.ts'

export function searchOwnerByPhone(input: unknown): ToolResult {
  const phone =
    typeof input === 'object' && input !== null && 'phone' in input
      ? String(input.phone)
      : ''
  if (!phone) return { status: 'failed', error: 'validation_failed' }
  return { status: 'succeeded', data: { matches: [] } }
}
