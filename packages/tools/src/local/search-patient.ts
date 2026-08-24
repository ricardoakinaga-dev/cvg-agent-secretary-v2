import type { ToolResult } from '../contracts.ts'

export function searchPatient(input: unknown): ToolResult {
  return { status: 'succeeded', data: { matches: [], input } }
}
