import type { ToolResult } from '../contracts.ts'

export function createOwnerDraft(input: unknown): ToolResult {
  return { status: 'succeeded', data: { draft: true, input } }
}
