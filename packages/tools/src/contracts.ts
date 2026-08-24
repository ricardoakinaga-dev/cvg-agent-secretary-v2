import { z } from 'zod'

export const ToolResultSchema = z.object({
  status: z.enum(['succeeded', 'failed', 'blocked']),
  data: z.unknown().optional(),
  error: z.string().optional()
})

export type ToolResult = z.infer<typeof ToolResultSchema>
export type ToolHandler<TInput = unknown> = (
  input: TInput
) => ToolResult | Promise<ToolResult>
