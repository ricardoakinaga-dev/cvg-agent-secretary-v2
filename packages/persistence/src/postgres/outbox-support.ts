/**
 * Responsibility: durable outbox row mapping/validation, payload and error
 * sanitization, lease/backoff validation and outbox audit appends.
 */
import { createHash } from 'node:crypto'
import {
  createDomainId,
  DomainError,
  sanitizeAuditEvidencePayload,
  sanitizeOutboxError,
  sanitizeOutboxPayload
} from '@cvg/shared'
import { TenantIdSchema, type TenantId } from '@cvg/platform'
import {
  DEFAULT_OUTBOX_LEASE_MS,
  DEFAULT_OUTBOX_MAX_ATTEMPTS,
  DEFAULT_OUTBOX_RETRY_BASE_MS,
  DEFAULT_OUTBOX_RETRY_MAX_MS,
  OUTBOX_TAKEOVER_SUPPRESSED_ERROR,
  type OutboxTakeoverCheck
} from '../outbox.ts'
import type {
  DurableOutboxEventRecord,
  DurableOutboxStatus,
  PostgresQueryable
} from './types.ts'

export const OUTBOX_MAX_ATTEMPTS = DEFAULT_OUTBOX_MAX_ATTEMPTS
export const OUTBOX_DEFAULT_LEASE_MS = DEFAULT_OUTBOX_LEASE_MS
export const OUTBOX_BASE_BACKOFF_MS = DEFAULT_OUTBOX_RETRY_BASE_MS
export const OUTBOX_MAX_BACKOFF_MS = DEFAULT_OUTBOX_RETRY_MAX_MS
export const OUTBOX_MAX_PAYLOAD_BYTES = 256 * 1024
export const SAFE_LEGACY_OUTBOX_ERRORS = new Set([
  'legacy_outbox_missing_tenant',
  'legacy_inbound_missing_runtime_identifiers',
  'legacy_outbox_event_type_not_controlled',
  'legacy_outbox_quarantined',
  'legacy_processed_without_effect_journal',
  'legacy_failed_without_retry_time'
])

export const outboxSelectColumns = `
  id, tenant_id, type, envelope_version, correlation_id, idempotency_key,
  trace_id,
  conversation_id, session_id, agent_id, agent_version_id,
  inbound_message_id, payload, status, created_at, available_at, attempts,
  lease_owner, lease_token, lease_until, last_error, processed_at, dead_lettered_at,
  parent_event_id, orchestration_goal_id, orchestration_plan_id,
  orchestration_step_id, orchestration_attempt_id`

export interface DurableOutboxRow {
  id: string
  tenant_id: TenantId
  type: string
  envelope_version: number
  correlation_id: string
  idempotency_key: string
  trace_id: string | null
  conversation_id: string | null
  session_id: string | null
  agent_id: string | null
  agent_version_id: string | null
  inbound_message_id: string | null
  payload: unknown
  status: DurableOutboxStatus
  created_at: Date
  available_at: Date
  attempts: number
  lease_owner: string | null
  lease_token: string | null
  lease_until: Date | null
  last_error: string | null
  processed_at: Date | null
  dead_lettered_at: Date | null
  parent_event_id: string | null
  orchestration_goal_id: string | null
  orchestration_plan_id: string | null
  orchestration_step_id: string | null
  orchestration_attempt_id: string | null
}

export function assertOutboxText(
  value: string,
  label: string,
  max = 200
): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new DomainError('validation_failed', `${label} is required`)
  }
  if (value.length > max) {
    throw new DomainError('validation_failed', `${label} is too long`)
  }
  return value
}

export function assertOutboxDate(value: Date, label: string): Date {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new DomainError('validation_failed', `${label} is invalid`)
  }
  return value
}

export function assertOutboxPayload(payload: unknown): unknown {
  if (payload === undefined) {
    throw new DomainError('validation_failed', 'Outbox payload is required')
  }
  return sanitizeAndValidateOutboxValue(payload, 'Outbox payload')
}

export function assertOutboxResult(result: unknown): unknown {
  return sanitizeAndValidateOutboxValue(result ?? null, 'Outbox result')
}

function sanitizeAndValidateOutboxValue(
  value: unknown,
  label: string
): unknown {
  try {
    const serialized = JSON.stringify(value)
    if (serialized === undefined) return null
    if (Buffer.byteLength(serialized, 'utf8') > OUTBOX_MAX_PAYLOAD_BYTES) {
      throw new DomainError('payload_too_large', `${label} is too large`)
    }
    const sanitized = sanitizeOutboxPayload(value).payload
    const sanitizedSerialized = JSON.stringify(sanitized) ?? 'null'
    if (
      Buffer.byteLength(sanitizedSerialized, 'utf8') > OUTBOX_MAX_PAYLOAD_BYTES
    ) {
      throw new DomainError(
        'payload_too_large',
        `Sanitized ${label.toLowerCase()} is too large`
      )
    }
    return sanitized
  } catch (error) {
    if (error instanceof DomainError) throw error
    throw new DomainError('validation_failed', `${label} is not JSON`)
  }
}

export function serializeOutboxJson(value: unknown, label: string): string {
  try {
    const serialized = JSON.stringify(value ?? null)
    if (serialized === undefined) return 'null'
    return serialized
  } catch {
    throw new DomainError('validation_failed', `${label} is not JSON`)
  }
}

export function redactOutboxError(error: unknown): string {
  if (error === OUTBOX_TAKEOVER_SUPPRESSED_ERROR) {
    return OUTBOX_TAKEOVER_SUPPRESSED_ERROR
  }
  if (typeof error === 'string' && SAFE_LEGACY_OUTBOX_ERRORS.has(error)) {
    return error
  }
  return sanitizeOutboxError(error)
}

export function createInboundIdempotencyKey(
  channel: string,
  externalMessageId: string
): string {
  const digest = createHash('sha256')
    .update(externalMessageId, 'utf8')
    .digest('hex')
  return `inbound:${channel}:sha256:${digest}`
}

export async function resolveTakeoverCheck(
  value: OutboxTakeoverCheck | undefined
): Promise<boolean> {
  if (typeof value === 'function') return Boolean(await value())
  return value === true
}

export function outboxDate(
  value: Date | string | null | undefined
): Date | null {
  if (value === null || value === undefined) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function mapDurableOutboxRow(
  row: DurableOutboxRow
): DurableOutboxEventRecord {
  const tenantId = TenantIdSchema.parse(row.tenant_id)
  const availableAt = outboxDate(row.available_at)
  const createdAt = outboxDate(row.created_at)
  if (!availableAt || !createdAt) {
    throw new DomainError(
      'invalid_action',
      'Outbox event timestamps are invalid'
    )
  }
  return {
    id: row.id,
    tenantId,
    type: row.type,
    envelopeVersion: row.envelope_version,
    correlationId: row.correlation_id,
    idempotencyKey: row.idempotency_key,
    ...(row.trace_id !== null ? { traceId: row.trace_id } : {}),
    conversationId: row.conversation_id,
    sessionId: row.session_id,
    agentId: row.agent_id,
    agentVersionId: row.agent_version_id,
    inboundMessageId: row.inbound_message_id,
    payload: sanitizeOutboxPayload(row.payload).payload,
    status: row.status,
    createdAt,
    availableAt,
    attempts: row.attempts,
    leaseOwner: row.lease_owner,
    leaseToken: row.lease_token,
    leaseUntil: outboxDate(row.lease_until),
    lastError: row.last_error ? redactOutboxError(row.last_error) : null,
    processedAt: outboxDate(row.processed_at),
    deadLetteredAt: outboxDate(row.dead_lettered_at),
    parentEventId: row.parent_event_id,
    ...(typeof row.orchestration_goal_id === 'string' &&
    typeof row.orchestration_plan_id === 'string' &&
    typeof row.orchestration_step_id === 'string'
      ? {
          orchestrationContext: {
            goalId: row.orchestration_goal_id,
            planId: row.orchestration_plan_id,
            stepId: row.orchestration_step_id,
            ...(row.orchestration_attempt_id !== null
              ? { attemptId: row.orchestration_attempt_id }
              : {})
          }
        }
      : {})
  }
}

export async function withOutboxTransaction<T>(
  client: PostgresQueryable,
  operation: () => Promise<T>
): Promise<T> {
  await client.query('BEGIN')
  try {
    const result = await operation()
    await client.query('COMMIT')
    return result
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // Preserve the original database or handler error.
    }
    throw error
  }
}

export function validateOutboxWorker(workerId: string): string {
  return assertOutboxText(workerId, 'workerId', 120)
}

export function validateOutboxLeaseToken(
  leaseToken: string | undefined
): string {
  return assertOutboxText(leaseToken ?? '', 'leaseToken', 160)
}

export function validateOutboxEnvelopeVersion(version: number): number {
  if (!Number.isSafeInteger(version) || version < 1 || version > 100) {
    throw new DomainError(
      'validation_failed',
      'Outbox envelope version is invalid'
    )
  }
  return version
}

export function validateOutboxLeaseMs(leaseMs: number): number {
  if (
    !Number.isSafeInteger(leaseMs) ||
    leaseMs < 1_000 ||
    leaseMs > 3_600_000
  ) {
    throw new DomainError(
      'validation_failed',
      'Outbox lease duration is invalid'
    )
  }
  return leaseMs
}

export function outboxBackoffMs(attempt: number): number {
  return Math.min(
    OUTBOX_MAX_BACKOFF_MS,
    OUTBOX_BASE_BACKOFF_MS * 2 ** Math.max(0, Math.min(attempt - 1, 16))
  )
}

export async function appendDurableOutboxAudit(
  client: PostgresQueryable,
  input: {
    tenantId: TenantId
    eventId: string
    correlationId: string
    actorId: string
    action: 'ack' | 'fail' | 'dead_letter' | 'requeue' | 'handoff'
    attempts: number
    status: DurableOutboxStatus
    error?: string | null
    sessionId?: string | null
    conversationId?: string | null
  }
): Promise<void> {
  const payload = sanitizeAuditEvidencePayload({
    tenantId: input.tenantId,
    eventId: input.eventId,
    correlationId: input.correlationId,
    action: input.action,
    attempts: input.attempts,
    status: input.status,
    ...(input.sessionId ? { sessionId: input.sessionId } : {}),
    ...(input.conversationId ? { conversationId: input.conversationId } : {}),
    ...(input.error ? { error: input.error } : {})
  }).payload
  await client.query(
    `INSERT INTO audit_events
       (tenant_id, id, type, actor_type, actor_id, correlation_id, policy_version, payload, created_at)
     VALUES ($1, $2, 'integration_event', $3, $4, $5, $6, $7::jsonb, $8)`,
    [
      input.tenantId,
      createDomainId('audit'),
      input.action === 'requeue' ? 'Operator' : 'System',
      input.actorId,
      input.correlationId,
      'outbox-r2',
      JSON.stringify(payload),
      new Date()
    ]
  )
}
