export const AUDIT_FILTER_DUPLICATE_ERROR_MESSAGE =
  'Audit evidence filters must be single-valued'

export type AuditFilterDuplicateFailure = {
  code: 'validation_failed'
  message: string
}

export function classifyAuditFilterValue(
  raw: unknown
): AuditFilterDuplicateFailure | null {
  if (!Array.isArray(raw)) return null

  return {
    code: 'validation_failed',
    message: AUDIT_FILTER_DUPLICATE_ERROR_MESSAGE
  }
}
