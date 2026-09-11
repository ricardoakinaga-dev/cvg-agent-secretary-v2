import { z } from 'zod'
import type { JourneyRepository } from '@cvg/persistence'

export const ToolResultSchema = z.object({
  status: z.enum(['succeeded', 'failed', 'blocked']),
  data: z.unknown().optional(),
  error: z.string().optional()
})

export type ToolResult = z.infer<typeof ToolResultSchema>
export type ToolHandler<TInput = unknown> = (
  input: TInput
) => ToolResult | Promise<ToolResult>

/** Narrow runtime seam so tools can opt into durable local journey state. */
export interface JourneyToolContext {
  tenantId: string
  repository: Pick<
    JourneyRepository,
    | 'searchOwnerByPhone'
    | 'createOwnerDraft'
    | 'searchPatient'
    | 'createPatientDraft'
    | 'findAvailableSlots'
    | 'createAppointmentDraft'
    | 'linkPatient'
    | 'createJourneyTask'
    | 'recordHandoff'
  >
}

export function toolFailure(error: unknown): ToolResult {
  const code =
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
      ? error.code
      : 'validation_failed'
  return { status: 'failed', error: code }
}
