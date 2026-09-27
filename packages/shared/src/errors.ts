import { ZodError } from 'zod'

export const ErrorCodes = {
  duplicate_message: 'duplicate_message',
  invalid_channel: 'invalid_channel',
  invalid_pagination: 'invalid_pagination',
  empty_body: 'empty_body',
  session_not_found: 'session_not_found',
  policy_unavailable: 'policy_unavailable',
  workflow_failed: 'workflow_failed',
  tool_not_found: 'tool_not_found',
  validation_failed: 'validation_failed',
  action_requires_approval: 'action_requires_approval',
  invalid_action: 'invalid_action',
  conflict: 'conflict',
  unauthorized: 'unauthorized',
  missing_summary: 'missing_summary',
  approval_not_pending: 'approval_not_pending',
  operator_not_allowed: 'operator_not_allowed',
  invalid_priority: 'invalid_priority',
  missing_context: 'missing_context',
  insufficient_context: 'insufficient_context',
  forbidden: 'forbidden',
  rate_limited: 'rate_limited',
  secure_transport_required: 'secure_transport_required',
  unsupported_media_type: 'unsupported_media_type',
  payload_too_large: 'payload_too_large',
  not_found: 'not_found',
  request_uri_too_long: 'request_uri_too_long'
} as const

export type ErrorCode = keyof typeof ErrorCodes

export class DomainError extends Error {
  readonly code: ErrorCode

  constructor(code: ErrorCode, message: string) {
    super(message)
    this.name = 'DomainError'
    this.code = code
  }
}

/**
 * Maps the approval engine's domain codes onto public error codes. The
 * approval engine depends on `@cvg/shared`, so the class cannot be imported
 * here without a cycle; detection is structural on the stable
 * `ApprovalError` name + `code` pair. Without this mapping a missing or
 * out-of-state approval would surface as a 500 instead of 404/403/409.
 */
const APPROVAL_ERROR_CODE_MAP: Record<string, ErrorCode> = Object.freeze({
  not_found: 'not_found',
  invalid_state: 'conflict',
  tenant_mismatch: 'forbidden',
  action_mismatch: 'conflict',
  payload_mismatch: 'conflict',
  proposal_mismatch: 'conflict',
  expired: 'conflict',
  already_executed: 'conflict',
  already_reserved: 'conflict',
  reservation_expired: 'conflict',
  reservation_mismatch: 'conflict',
  reservation_reused: 'conflict',
  uncertain: 'conflict',
  invalid_proof: 'forbidden',
  self_approval_denied: 'forbidden',
  not_authorized: 'forbidden',
  invalid_request: 'validation_failed'
})

function asApprovalError(
  error: unknown
): { code: string; message: string } | null {
  if (!(error instanceof Error) || error.name !== 'ApprovalError') return null
  const code = (error as { code?: unknown }).code
  if (typeof code !== 'string') return null
  return { code, message: error.message }
}

export function toSafeError(error: unknown): { code: string; message: string } {
  if (error instanceof DomainError) {
    return { code: error.code, message: error.message }
  }
  const approvalError = asApprovalError(error)
  if (approvalError) {
    return {
      code: APPROVAL_ERROR_CODE_MAP[approvalError.code] ?? 'conflict',
      message: approvalError.message
    }
  }
  if (error instanceof ZodError) {
    return { code: 'validation_failed', message: 'Input validation failed' }
  }
  return { code: 'internal_error', message: 'Unexpected internal error' }
}
