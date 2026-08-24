import type { ToolResult } from '../contracts.ts'

export function createPatientDraft(input: unknown): ToolResult {
  return { status: 'succeeded', data: { draft: true, input } }
}
