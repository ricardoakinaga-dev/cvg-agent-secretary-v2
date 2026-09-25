/**
 * Responsibility: own API query parsing used by handlers without depending on
 * the server composition root.
 */
import { GoalStatusSchema, type GoalStatus } from '@cvg/agent-runtime'
import type {
  AuditEventType,
  AuditEvidenceFilters,
  AuditEvidenceQuery
} from '@cvg/persistence'
import { DomainError } from '@cvg/shared'
import { classifyAuditFilterValue } from '../audit-filter-duplicate-boundary.ts'
import {
  classifyPaginationOffset,
  PAGINATION_OFFSET_ERROR_MESSAGE
} from '../pagination-boundary.ts'
import { z } from 'zod'

export function parsePagination(
  query: unknown
): { limit: number; offset: number } | null {
  const params = query as { limit?: unknown; offset?: unknown }
  const limit = params.limit === undefined ? 25 : Number(params.limit)
  const rawOffset = params.offset === undefined ? 0 : params.offset
  const offsetFailure = classifyPaginationOffset(rawOffset)

  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || offsetFailure) {
    return null
  }

  const offset = Number(rawOffset)
  return { limit, offset }
}

export function parseTraceLimit(query: unknown): number {
  const parsed = z
    .object({
      limit: z.coerce.number().int().min(1).max(100).default(25)
    })
    .strict()
    .safeParse(query)
  if (!parsed.success) {
    throw new DomainError(
      'invalid_pagination',
      'limit must be between 1 and 100'
    )
  }
  return parsed.data.limit
}

const OrchestrationGoalQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(25),
    status: GoalStatusSchema.optional()
  })
  .strict()

export function parseOrchestrationGoalQuery(query: unknown): {
  limit: number
  status?: GoalStatus
} {
  const parsed = OrchestrationGoalQuerySchema.safeParse(query)
  if (!parsed.success) {
    throw new DomainError(
      'invalid_pagination',
      'limit must be between 1 and 50 and status must be a valid Goal state'
    )
  }
  return parsed.data.status === undefined
    ? { limit: parsed.data.limit }
    : { limit: parsed.data.limit, status: parsed.data.status }
}

const auditEventTypes: AuditEventType[] = [
  'tool_call',
  'safety_event',
  'integration_event',
  'policy_decision',
  'approval_decision',
  'handoff'
]

export function parseAuditEvidenceQuery(query: unknown): {
  query: AuditEvidenceQuery
  filters: AuditEvidenceFilters
} {
  const pagination = parsePagination(query)
  if (!pagination) {
    throw new DomainError(
      'invalid_pagination',
      `limit must be between 1 and 100 and ${PAGINATION_OFFSET_ERROR_MESSAGE}`
    )
  }
  const params = query as Record<string, unknown>
  const filters: AuditEvidenceFilters = {}
  const sessionId = parseOptionalAuditFilter(params.sessionId)
  const correlationId = parseOptionalAuditFilter(params.correlationId)
  const actorId = parseOptionalAuditFilter(params.actorId)
  const type = parseOptionalAuditFilter(params.type)

  if (sessionId) filters.sessionId = sessionId
  if (correlationId) filters.correlationId = correlationId
  if (actorId) filters.actorId = actorId
  if (type) {
    if (!auditEventTypes.includes(type as AuditEventType)) {
      throw new DomainError('validation_failed', 'Audit event type is invalid')
    }
    filters.type = type as AuditEventType
  }

  return { query: { ...pagination, ...filters }, filters }
}

export function parseOptionalAuditFilter(value: unknown): string | undefined {
  if (value === undefined) return undefined
  const duplicateFailure = classifyAuditFilterValue(value)
  if (duplicateFailure) {
    throw new DomainError(duplicateFailure.code, duplicateFailure.message)
  }
  if (typeof value !== 'string') {
    throw new DomainError(
      'validation_failed',
      'Audit evidence filters must be strings'
    )
  }
  const trimmed = value.trim()
  if (
    trimmed.length === 0 ||
    trimmed.length > 120 ||
    !/^[A-Za-z0-9._:-]+$/.test(trimmed)
  ) {
    throw new DomainError(
      'validation_failed',
      'Audit evidence filter is invalid'
    )
  }
  return trimmed
}
