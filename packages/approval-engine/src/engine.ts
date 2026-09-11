import { createDomainId } from '@cvg/shared'
import {
  ApprovalRequestSchema,
  approvalMatchesAction,
  computeApprovalPayloadHash,
  type ApprovalRecord,
  type ApprovalRequestInput,
  type ApprovalResource
} from './contracts.ts'
import { InMemoryApprovalStore, type ApprovalStore } from './store.ts'

export const ApprovalErrorCodes = {
  not_found: 'not_found',
  invalid_state: 'invalid_state',
  tenant_mismatch: 'tenant_mismatch',
  action_mismatch: 'action_mismatch',
  payload_mismatch: 'payload_mismatch',
  expired: 'expired',
  already_executed: 'already_executed',
  self_approval_denied: 'self_approval_denied',
  not_authorized: 'not_authorized',
  invalid_request: 'invalid_request'
} as const

export type ApprovalErrorCode =
  (typeof ApprovalErrorCodes)[keyof typeof ApprovalErrorCodes]

export class ApprovalError extends Error {
  readonly code: ApprovalErrorCode

  constructor(code: ApprovalErrorCode, message: string) {
    super(message)
    this.name = 'ApprovalError'
    this.code = code
  }
}

export type ApprovalEventType =
  | 'approval.requested'
  | 'approval.pending'
  | 'approval.approved'
  | 'approval.rejected'
  | 'approval.expired'
  | 'approval.cancelled'
  | 'approval.executed'
  | 'approval.denied'

export interface ApprovalEvent {
  type: ApprovalEventType
  approvalId: string
  tenantId: string
  correlationId: string
  actorId?: string
  detail?: string
}

export interface ApprovalEngineOptions {
  store?: ApprovalStore
  clock?: () => Date
  idFactory?: () => string
  defaultExpiryMs?: number
  allowSelfApproval?: boolean
  onEvent?: (event: ApprovalEvent) => void
}

export interface ApprovalConsumption {
  approvalId: string
  tenantId: string
  action: string
  payloadHash: string
  executedAt: string
  executionRef?: string
}

const DEFAULT_EXPIRY_MS = 15 * 60 * 1000

/**
 * Cryptographically bound, single-use, expiring approval engine.
 *
 * An approval for action A can never execute action B: the approval stores a
 * SHA-256 hash of the canonical action payload and every execution re-derives
 * and compares the hash before consuming the approval.
 */
export class ApprovalEngine {
  readonly #store: ApprovalStore
  readonly #clock: () => Date
  readonly #idFactory: () => string
  readonly #defaultExpiryMs: number
  readonly #allowSelfApproval: boolean
  readonly #onEvent?: (event: ApprovalEvent) => void

  constructor(options: ApprovalEngineOptions = {}) {
    this.#store = options.store ?? new InMemoryApprovalStore()
    this.#clock = options.clock ?? (() => new Date())
    this.#idFactory = options.idFactory ?? (() => createDomainId('appr'))
    this.#defaultExpiryMs = options.defaultExpiryMs ?? DEFAULT_EXPIRY_MS
    this.#allowSelfApproval = options.allowSelfApproval ?? false
    if (options.onEvent) this.#onEvent = options.onEvent
  }

  request(input: ApprovalRequestInput): ApprovalRecord {
    const parsed = ApprovalRequestSchema.safeParse(input)
    if (!parsed.success) {
      throw new ApprovalError(
        'invalid_request',
        'Approval request failed schema validation'
      )
    }
    const request = parsed.data
    const now = this.#clock()
    const record: ApprovalRecord = {
      approvalId: this.#idFactory(),
      tenantId: request.tenantId,
      operatorId: request.operatorId,
      agentId: request.agentId,
      agentVersion: request.agentVersion,
      action: request.action,
      resource: request.resource,
      payloadHash: computeApprovalPayloadHash({
        action: request.action,
        resource: request.resource,
        payload: request.payload
      }),
      policyVersion: request.policyVersion,
      ...(request.promptVersion !== undefined
        ? { promptVersion: request.promptVersion }
        : {}),
      correlationId: request.correlationId,
      status: 'REQUESTED',
      singleUse: request.singleUse ?? true,
      requestedAt: now.toISOString(),
      expiresAt: new Date(
        now.getTime() + (request.expiresInMs ?? this.#defaultExpiryMs)
      ).toISOString(),
      executionCount: 0,
      ...(request.reason !== undefined
        ? { decisionReason: request.reason }
        : {})
    }
    this.#store.insert(record)
    this.#emit({
      type: 'approval.requested',
      approvalId: record.approvalId,
      tenantId: record.tenantId,
      correlationId: record.correlationId,
      actorId: record.operatorId
    })
    return cloneRecord(record)
  }

  submit(
    tenantId: string,
    approvalId: string,
    actorId: string
  ): ApprovalRecord {
    const record = this.#require(tenantId, approvalId)
    if (record.operatorId !== actorId) {
      throw new ApprovalError(
        'not_authorized',
        'Only the requesting operator can submit this approval'
      )
    }
    this.#assertNotExpired(record)
    const updated = this.#store.update(
      tenantId,
      approvalId,
      'REQUESTED',
      (current) => ({ ...current, status: 'PENDING' })
    )
    if (!updated) {
      throw new ApprovalError(
        'invalid_state',
        'Approval is not in REQUESTED state'
      )
    }
    this.#emit({
      type: 'approval.pending',
      approvalId,
      tenantId,
      correlationId: updated.correlationId,
      actorId
    })
    return cloneRecord(updated)
  }

  approve(
    tenantId: string,
    approvalId: string,
    input: { approverId: string; reason?: string }
  ): ApprovalRecord {
    const record = this.#require(tenantId, approvalId)
    this.#assertNotExpired(record)
    if (!this.#allowSelfApproval && record.operatorId === input.approverId) {
      throw new ApprovalError(
        'self_approval_denied',
        'The requesting operator cannot approve their own action'
      )
    }
    const updated = this.#store.update(
      tenantId,
      approvalId,
      'PENDING',
      (current) => ({
        ...current,
        status: 'APPROVED',
        approverId: input.approverId,
        approvedAt: this.#clock().toISOString(),
        ...(input.reason !== undefined ? { decisionReason: input.reason } : {})
      })
    )
    if (!updated) {
      throw new ApprovalError(
        'invalid_state',
        'Approval is not in PENDING state'
      )
    }
    this.#emit({
      type: 'approval.approved',
      approvalId,
      tenantId,
      correlationId: updated.correlationId,
      actorId: input.approverId
    })
    return cloneRecord(updated)
  }

  reject(
    tenantId: string,
    approvalId: string,
    input: { approverId: string; reason?: string }
  ): ApprovalRecord {
    const record = this.#require(tenantId, approvalId)
    this.#assertNotExpired(record)
    const updated = this.#store.update(
      tenantId,
      approvalId,
      'PENDING',
      (current) => ({
        ...current,
        status: 'REJECTED',
        approverId: input.approverId,
        rejectedAt: this.#clock().toISOString(),
        ...(input.reason !== undefined ? { decisionReason: input.reason } : {})
      })
    )
    if (!updated) {
      throw new ApprovalError(
        'invalid_state',
        'Approval is not in PENDING state'
      )
    }
    this.#emit({
      type: 'approval.rejected',
      approvalId,
      tenantId,
      correlationId: updated.correlationId,
      actorId: input.approverId
    })
    return cloneRecord(updated)
  }

  cancel(
    tenantId: string,
    approvalId: string,
    actorId: string
  ): ApprovalRecord {
    const record = this.#require(tenantId, approvalId)
    if (record.operatorId !== actorId) {
      throw new ApprovalError(
        'not_authorized',
        'Only the requesting operator can cancel this approval'
      )
    }
    let updated = this.#store.update(
      tenantId,
      approvalId,
      'REQUESTED',
      (current) => ({
        ...current,
        status: 'CANCELLED',
        cancelledAt: this.#clock().toISOString()
      })
    )
    if (!updated) {
      updated = this.#store.update(
        tenantId,
        approvalId,
        'PENDING',
        (current) => ({
          ...current,
          status: 'CANCELLED',
          cancelledAt: this.#clock().toISOString()
        })
      )
    }
    if (!updated) {
      throw new ApprovalError(
        'invalid_state',
        'Only REQUESTED or PENDING approvals can be cancelled'
      )
    }
    this.#emit({
      type: 'approval.cancelled',
      approvalId,
      tenantId,
      correlationId: updated.correlationId,
      actorId
    })
    return cloneRecord(updated)
  }

  verifyAndConsume(input: {
    tenantId: string
    approvalId: string
    action: string
    resource: ApprovalResource
    payload: unknown
    executionRef?: string
  }): ApprovalConsumption {
    const record = this.#require(input.tenantId, input.approvalId)
    if (record.status === 'EXPIRED') {
      throw new ApprovalError('expired', 'Approval expired')
    }
    if (record.status === 'EXECUTED' && record.singleUse) {
      throw new ApprovalError(
        'already_executed',
        'Approval is single-use and was already executed'
      )
    }
    this.#assertNotExpired(record)
    if (record.status !== 'APPROVED' && record.status !== 'EXECUTED') {
      throw new ApprovalError('invalid_state', 'Approval is not APPROVED')
    }
    const candidate = {
      action: input.action,
      resource: input.resource,
      payload: input.payload
    }
    if (
      record.action !== candidate.action ||
      record.resource.type !== candidate.resource.type ||
      (record.resource.id ?? null) !== (candidate.resource.id ?? null)
    ) {
      throw new ApprovalError(
        'action_mismatch',
        'Approval is bound to a different action or resource'
      )
    }
    if (!approvalMatchesAction(record, candidate)) {
      throw new ApprovalError(
        'payload_mismatch',
        'Action payload does not match the approved payload hash'
      )
    }

    let updated: ApprovalRecord | undefined
    if (record.singleUse) {
      updated = this.#store.update(
        input.tenantId,
        input.approvalId,
        'APPROVED',
        (current) => ({
          ...current,
          status: 'EXECUTED',
          executedAt: this.#clock().toISOString(),
          executionCount: current.executionCount + 1,
          ...(input.executionRef !== undefined
            ? { executionRef: input.executionRef }
            : {})
        })
      )
      if (!updated) {
        throw new ApprovalError(
          'already_executed',
          'Approval was consumed concurrently'
        )
      }
    } else {
      updated = this.#store.update(
        input.tenantId,
        input.approvalId,
        'APPROVED',
        (current) => ({
          ...current,
          executionCount: current.executionCount + 1,
          executedAt: this.#clock().toISOString(),
          ...(input.executionRef !== undefined
            ? { executionRef: input.executionRef }
            : {})
        })
      )
      if (!updated) {
        throw new ApprovalError('invalid_state', 'Approval is not APPROVED')
      }
    }

    const consumedAt = updated.executedAt ?? this.#clock().toISOString()
    this.#emit({
      type: 'approval.executed',
      approvalId: input.approvalId,
      tenantId: input.tenantId,
      correlationId: updated.correlationId,
      ...(input.executionRef !== undefined
        ? { actorId: input.executionRef }
        : {})
    })
    return {
      approvalId: updated.approvalId,
      tenantId: updated.tenantId,
      action: updated.action,
      payloadHash: updated.payloadHash,
      executedAt: consumedAt,
      ...(updated.executionRef !== undefined
        ? { executionRef: updated.executionRef }
        : {})
    }
  }

  expireStale(now: Date = this.#clock()): number {
    let expired = 0
    const candidates = this.#store.listExpiringBefore(now.toISOString(), [
      'REQUESTED',
      'PENDING',
      'APPROVED'
    ])
    for (const record of candidates) {
      const updated = this.#store.update(
        record.tenantId,
        record.approvalId,
        record.status,
        (current) => ({
          ...current,
          status: 'EXPIRED',
          expiredAt: now.toISOString()
        })
      )
      if (updated) {
        expired += 1
        this.#emit({
          type: 'approval.expired',
          approvalId: record.approvalId,
          tenantId: record.tenantId,
          correlationId: record.correlationId
        })
      }
    }
    return expired
  }

  list(tenantId: string, status?: ApprovalRecord['status']): ApprovalRecord[] {
    return this.#store
      .list({ tenantId, ...(status !== undefined ? { status } : {}) })
      .map(cloneRecord)
  }

  get(tenantId: string, approvalId: string): ApprovalRecord {
    return cloneRecord(this.#require(tenantId, approvalId))
  }

  #require(tenantId: string, approvalId: string): ApprovalRecord {
    const record = this.#store.get(tenantId, approvalId)
    if (!record) {
      throw new ApprovalError('not_found', 'Approval not found for this tenant')
    }
    return record
  }

  #assertNotExpired(record: ApprovalRecord): void {
    if (Date.parse(record.expiresAt) < this.#clock().getTime()) {
      this.#store.update(
        record.tenantId,
        record.approvalId,
        record.status,
        (current) => ({
          ...current,
          status: 'EXPIRED',
          expiredAt: this.#clock().toISOString()
        })
      )
      this.#emit({
        type: 'approval.expired',
        approvalId: record.approvalId,
        tenantId: record.tenantId,
        correlationId: record.correlationId
      })
      throw new ApprovalError('expired', 'Approval expired')
    }
  }

  #emit(event: ApprovalEvent): void {
    this.#onEvent?.(event)
  }
}

function cloneRecord(record: ApprovalRecord): ApprovalRecord {
  return {
    ...record,
    resource: { ...record.resource }
  }
}
