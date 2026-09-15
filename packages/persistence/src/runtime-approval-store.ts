import type { QueryResultRow } from 'pg'
import {
  ApprovalEngine,
  ApprovalError,
  ApprovalContinuationSchema,
  ApprovalStatusSchema,
  InMemoryApprovalStore,
  type ApprovalAuthority,
  type ApprovalConsumption,
  type ApprovalEngineOptions,
  type ApprovalRecord,
  type ApprovalRequestInput,
  type ApprovalReserveInput,
  type ApprovalReservation,
  type ApprovalStatus,
  type EffectEvidence
} from '@cvg/approval-engine'
import { DomainError } from '@cvg/shared'
import {
  withTenantContext,
  withTenantTransaction,
  type PostgresPoolClient,
  type PostgresPoolLike
} from './tenant-scoped-postgres.ts'
import {
  PostgresRuntimeRepository,
  type DurableOutboxEventRecord,
  type PostgresOutboxEnqueueInput
} from './postgres.ts'
import type { AuditEventRecord } from './schema.ts'

export interface PostgresApprovalAuthorityOptions {
  /**
   * Engine configuration shared by every scratch decision engine. `store` is
   * owned by the adapter because each operation seeds a fresh scratch store.
   */
  engine?: Omit<ApprovalEngineOptions, 'store'>
  /**
   * Repository-owned clock for row timestamps. Defaults to the engine clock so
   * the decision state machine and the persisted revision timestamps agree.
   */
  clock?: () => Date
}

export interface AtomicRuntimeApprovalDecisionInput {
  tenantId: string
  approvalId: string
  decision: 'approve' | 'reject'
  approverId: string
  actorType: AuditEventRecord['actorType']
  requestCorrelationId: string
  reason?: string
}

export interface AtomicRuntimeApprovalDecisionResult {
  approval: ApprovalRecord
  continuationEvent: DurableOutboxEventRecord
}

export interface RuntimeApprovalRow extends QueryResultRow {
  tenant_id: string
  approval_id: string
  operator_id: string
  agent_id: string
  agent_version: string
  action: string
  resource_type: string
  resource_id: string | null
  payload_hash: string
  policy_version: string
  prompt_version: string | null
  correlation_id: string
  status: string
  single_use: boolean
  requested_at: Date | string
  expires_at: Date | string
  approved_at: Date | string | null
  executed_at: Date | string | null
  rejected_at: Date | string | null
  cancelled_at: Date | string | null
  expired_at: Date | string | null
  approver_id: string | null
  decision_reason: string | null
  execution_count: number
  execution_ref: string | null
  reservation_id: string | null
  reservation_owner: string | null
  reservation_expires_at: Date | string | null
  reservation_generation: number | string
  used_reservation_ids: unknown
  reserved_at: Date | string | null
  executing_at: Date | string | null
  released_at: Date | string | null
  failed_at: Date | string | null
  uncertain_at: Date | string | null
  confirmed_at: Date | string | null
  confirmation_evidence_ref: string | null
  proposal_id: string | null
  proposal_hash: string | null
  capability: string | null
  data_classification: string | null
  proposal_payload: unknown
  continuation_payload: unknown
  operation_key: string | null
  revision: number | string
  created_at: Date | string
  updated_at: Date | string
}

interface LoadedApproval {
  record: ApprovalRecord
  revision: number
}

const runtimeApprovalColumns = `
  tenant_id, approval_id, operator_id, agent_id, agent_version, action,
  resource_type, resource_id, payload_hash, policy_version, prompt_version,
  correlation_id, status, single_use, requested_at, expires_at, approved_at,
  executed_at, rejected_at, cancelled_at, expired_at, approver_id,
  decision_reason, execution_count, execution_ref, reservation_id,
  reservation_owner, reservation_expires_at, reservation_generation,
  used_reservation_ids, reserved_at, executing_at, released_at, failed_at,
  uncertain_at, confirmed_at, confirmation_evidence_ref, proposal_id,
  proposal_hash, capability, data_classification, proposal_payload,
  continuation_payload, operation_key, revision, created_at, updated_at`

/**
 * Single source of truth for the mutation column order. `recordValues` must
 * emit the values in exactly this order; both INSERT and the compare-and-set
 * UPDATE are generated from it so a column can never drift from its binding.
 */
const persistedColumns = [
  'tenant_id',
  'approval_id',
  'operator_id',
  'agent_id',
  'agent_version',
  'action',
  'resource_type',
  'resource_id',
  'payload_hash',
  'policy_version',
  'prompt_version',
  'correlation_id',
  'status',
  'single_use',
  'requested_at',
  'expires_at',
  'approved_at',
  'executed_at',
  'rejected_at',
  'cancelled_at',
  'expired_at',
  'approver_id',
  'decision_reason',
  'execution_count',
  'execution_ref',
  'reservation_id',
  'reservation_owner',
  'reservation_expires_at',
  'reservation_generation',
  'used_reservation_ids',
  'reserved_at',
  'executing_at',
  'released_at',
  'failed_at',
  'uncertain_at',
  'confirmed_at',
  'confirmation_evidence_ref',
  'proposal_id',
  'proposal_hash',
  'capability',
  'data_classification',
  'proposal_payload',
  'continuation_payload',
  'operation_key'
] as const

const insertColumns = [
  ...persistedColumns,
  'revision',
  'created_at',
  'updated_at'
].join(', ')

const insertPlaceholders = persistedColumns
  .map((_, index) => `$${index + 1}`)
  .join(', ')

const casSetClause = persistedColumns
  .slice(2)
  .map((column, index) => `${column} = $${index + 3}`)
  .join(', ')

const mutableValueCount = persistedColumns.length - 2
const casUpdatedAtParam = mutableValueCount + 3
const casRevisionParam = mutableValueCount + 4
const casStatusParam = mutableValueCount + 5
const casReservationIdParam = mutableValueCount + 6
const casGenerationParam = mutableValueCount + 7

function toIsoString(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString()
}

function readUsedReservationIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new DomainError(
      'conflict',
      'runtime_approvals.used_reservation_ids is not a JSON array'
    )
  }
  return value.map((entry) => {
    if (typeof entry !== 'string') {
      throw new DomainError(
        'conflict',
        'runtime_approvals.used_reservation_ids has a non-string entry'
      )
    }
    return entry
  })
}

/**
 * Maps a `runtime_approvals` row back to the exact canonical `ApprovalRecord`
 * shape the in-memory store would hold. Optional fields absent from the row
 * stay absent (never `undefined` keys) so equality with the scratch engine
 * record is stable.
 */
export function mapRuntimeApprovalRow(row: RuntimeApprovalRow): ApprovalRecord {
  const usedReservationIds = readUsedReservationIds(row.used_reservation_ids)
  const generation = Number(row.reservation_generation)
  return {
    approvalId: row.approval_id,
    tenantId: row.tenant_id,
    operatorId: row.operator_id,
    agentId: row.agent_id,
    agentVersion: row.agent_version,
    action: row.action,
    resource: {
      type: row.resource_type,
      ...(row.resource_id !== null ? { id: row.resource_id } : {})
    },
    payloadHash: row.payload_hash,
    policyVersion: row.policy_version,
    ...(row.prompt_version !== null
      ? { promptVersion: row.prompt_version }
      : {}),
    correlationId: row.correlation_id,
    status: ApprovalStatusSchema.parse(row.status),
    singleUse: row.single_use,
    requestedAt: toIsoString(row.requested_at),
    expiresAt: toIsoString(row.expires_at),
    ...(row.approved_at !== null
      ? { approvedAt: toIsoString(row.approved_at) }
      : {}),
    ...(row.executed_at !== null
      ? { executedAt: toIsoString(row.executed_at) }
      : {}),
    ...(row.rejected_at !== null
      ? { rejectedAt: toIsoString(row.rejected_at) }
      : {}),
    ...(row.cancelled_at !== null
      ? { cancelledAt: toIsoString(row.cancelled_at) }
      : {}),
    ...(row.expired_at !== null
      ? { expiredAt: toIsoString(row.expired_at) }
      : {}),
    ...(row.approver_id !== null ? { approverId: row.approver_id } : {}),
    ...(row.decision_reason !== null
      ? { decisionReason: row.decision_reason }
      : {}),
    executionCount: row.execution_count,
    ...(row.execution_ref !== null ? { executionRef: row.execution_ref } : {}),
    ...(row.reservation_id !== null
      ? { reservationId: row.reservation_id }
      : {}),
    ...(row.reservation_owner !== null
      ? { reservationOwner: row.reservation_owner }
      : {}),
    ...(row.reservation_expires_at !== null
      ? { reservationExpiresAt: toIsoString(row.reservation_expires_at) }
      : {}),
    ...(generation > 0 ? { reservationGeneration: generation } : {}),
    ...(usedReservationIds.length > 0 ? { usedReservationIds } : {}),
    ...(row.reserved_at !== null
      ? { reservedAt: toIsoString(row.reserved_at) }
      : {}),
    ...(row.executing_at !== null
      ? { executingAt: toIsoString(row.executing_at) }
      : {}),
    ...(row.released_at !== null
      ? { releasedAt: toIsoString(row.released_at) }
      : {}),
    ...(row.failed_at !== null ? { failedAt: toIsoString(row.failed_at) } : {}),
    ...(row.uncertain_at !== null
      ? { uncertainAt: toIsoString(row.uncertain_at) }
      : {}),
    ...(row.confirmed_at !== null
      ? { confirmedAt: toIsoString(row.confirmed_at) }
      : {}),
    ...(row.confirmation_evidence_ref !== null
      ? { confirmationEvidenceRef: row.confirmation_evidence_ref }
      : {}),
    ...(row.proposal_id !== null ? { proposalId: row.proposal_id } : {}),
    ...(row.proposal_hash !== null ? { proposalHash: row.proposal_hash } : {}),
    ...(row.capability !== null ? { capability: row.capability } : {}),
    ...(row.data_classification !== null
      ? { dataClassification: row.data_classification }
      : {}),
    ...(row.proposal_payload !== null
      ? { proposalPayload: row.proposal_payload }
      : {}),
    ...(row.continuation_payload !== null &&
    row.continuation_payload !== undefined
      ? {
          continuation: ApprovalContinuationSchema.parse(
            row.continuation_payload
          )
        }
      : {}),
    ...(row.operation_key !== null ? { operationKey: row.operation_key } : {})
  }
}

function recordValues(record: ApprovalRecord): unknown[] {
  return [
    record.tenantId,
    record.approvalId,
    record.operatorId,
    record.agentId,
    record.agentVersion,
    record.action,
    record.resource.type,
    record.resource.id ?? null,
    record.payloadHash,
    record.policyVersion,
    record.promptVersion ?? null,
    record.correlationId,
    record.status,
    record.singleUse,
    record.requestedAt,
    record.expiresAt,
    record.approvedAt ?? null,
    record.executedAt ?? null,
    record.rejectedAt ?? null,
    record.cancelledAt ?? null,
    record.expiredAt ?? null,
    record.approverId ?? null,
    record.decisionReason ?? null,
    record.executionCount,
    record.executionRef ?? null,
    record.reservationId ?? null,
    record.reservationOwner ?? null,
    record.reservationExpiresAt ?? null,
    record.reservationGeneration ?? 0,
    JSON.stringify(record.usedReservationIds ?? []),
    record.reservedAt ?? null,
    record.executingAt ?? null,
    record.releasedAt ?? null,
    record.failedAt ?? null,
    record.uncertainAt ?? null,
    record.confirmedAt ?? null,
    record.confirmationEvidenceRef ?? null,
    record.proposalId ?? null,
    record.proposalHash ?? null,
    record.capability ?? null,
    record.dataClassification ?? null,
    record.proposalPayload === undefined
      ? null
      : JSON.stringify(record.proposalPayload),
    record.continuation === undefined
      ? null
      : JSON.stringify(record.continuation),
    record.operationKey ?? null
  ]
}

function cloneRecord(record: ApprovalRecord): ApprovalRecord {
  return structuredClone(record)
}

function recordsEquivalent(
  left: ApprovalRecord,
  right: ApprovalRecord
): boolean {
  // Both records derive from the same mapper column order, so key order is a
  // stable comparison basis; a semantic difference always changes the JSON.
  return JSON.stringify(left) === JSON.stringify(right)
}

/**
 * PostgreSQL incarnation of `ApprovalAuthority` (PROD-04, architecture A2).
 *
 * The canonical decision state machine is not duplicated: every operation
 * loads the affected record(s) `FOR UPDATE` inside one `withTenantTransaction`,
 * seeds a scratch `InMemoryApprovalStore`, runs the same synchronous
 * `ApprovalEngine` method and persists the resulting record(s) with a
 * compare-and-set on revision, status, reservation id and reservation
 * generation. SQL serializes writers; the engine remains the only authority
 * that decides transitions.
 */
export class PostgresApprovalAuthority implements ApprovalAuthority {
  readonly #pool: PostgresPoolLike
  readonly #clock: () => Date
  readonly #engineOptions: Omit<ApprovalEngineOptions, 'store'>

  constructor(
    pool: PostgresPoolLike,
    options: PostgresApprovalAuthorityOptions = {}
  ) {
    this.#pool = pool
    const engineOptions = options.engine ?? {}
    this.#clock = options.clock ?? engineOptions.clock ?? (() => new Date())
    this.#engineOptions = { ...engineOptions, clock: this.#clock }
  }

  async request(input: ApprovalRequestInput): Promise<ApprovalRecord> {
    return withTenantTransaction(this.#pool, input.tenantId, async (client) => {
      const engine = this.#createEngine(new InMemoryApprovalStore())
      const record = engine.request(input)
      if (record.continuation) {
        const existing = await client.query<RuntimeApprovalRow>(
          `SELECT ${runtimeApprovalColumns}
           FROM runtime_approvals
           WHERE tenant_id = $1
             AND continuation_payload->>'inboundMessageId' = $2
           LIMIT 1
           FOR UPDATE`,
          [record.tenantId, record.continuation.inboundMessageId]
        )
        const row = existing.rows[0]
        if (row) {
          const existingRecord = mapRuntimeApprovalRow(row)
          if (!approvalRequestsEquivalent(existingRecord, record)) {
            throw new DomainError(
              'conflict',
              'A different governed approval already owns this inbound continuation'
            )
          }
          return existingRecord
        }
      }
      await this.#insert(client, record)
      return record
    })
  }

  submit(
    tenantId: string,
    approvalId: string,
    actorId: string
  ): Promise<ApprovalRecord> {
    return this.#mutateRecord(tenantId, approvalId, (engine) =>
      engine.submit(tenantId, approvalId, actorId)
    )
  }

  approve(
    tenantId: string,
    approvalId: string,
    input: { approverId: string; reason?: string }
  ): Promise<ApprovalRecord> {
    return this.#mutateRecord(tenantId, approvalId, (engine) =>
      engine.approve(tenantId, approvalId, input)
    )
  }

  reject(
    tenantId: string,
    approvalId: string,
    input: { approverId: string; reason?: string }
  ): Promise<ApprovalRecord> {
    return this.#mutateRecord(tenantId, approvalId, (engine) =>
      engine.reject(tenantId, approvalId, input)
    )
  }

  /**
   * Commits a runtime approval decision, its continuation outbox event and the
   * corresponding audit record in one tenant-scoped transaction. This is the
   * durable path used by the public API; a failure cannot leave an APPROVED
   * record without a resumable continuation.
   */
  async decideAndEnqueueContinuation(
    input: AtomicRuntimeApprovalDecisionInput
  ): Promise<AtomicRuntimeApprovalDecisionResult> {
    return withTenantTransaction(this.#pool, input.tenantId, async (client) => {
      const loaded = await this.#selectForUpdate(
        client,
        input.tenantId,
        input.approvalId
      )
      if (!loaded) {
        throw new ApprovalError(
          'not_found',
          'Approval not found for this tenant'
        )
      }

      const store = new InMemoryApprovalStore()
      store.insert(cloneRecord(loaded.record))
      const engine = this.#createEngine(store)
      let decided = loaded.record
      if (input.decision === 'approve') {
        if (loaded.record.status === 'APPROVED') {
          decided = loaded.record
        } else if (loaded.record.status === 'REQUESTED') {
          engine.submit(
            input.tenantId,
            input.approvalId,
            loaded.record.operatorId
          )
          decided = engine.approve(input.tenantId, input.approvalId, {
            approverId: input.approverId,
            ...(input.reason !== undefined ? { reason: input.reason } : {})
          })
        } else if (loaded.record.status === 'PENDING') {
          decided = engine.approve(input.tenantId, input.approvalId, {
            approverId: input.approverId,
            ...(input.reason !== undefined ? { reason: input.reason } : {})
          })
        } else {
          throw new DomainError(
            'conflict',
            `Runtime approval cannot be approved from ${loaded.record.status}`
          )
        }
      } else if (loaded.record.status === 'REJECTED') {
        decided = loaded.record
      } else if (loaded.record.status === 'REQUESTED') {
        engine.submit(
          input.tenantId,
          input.approvalId,
          loaded.record.operatorId
        )
        decided = engine.reject(input.tenantId, input.approvalId, {
          approverId: input.approverId,
          ...(input.reason !== undefined ? { reason: input.reason } : {})
        })
      } else if (loaded.record.status === 'PENDING') {
        decided = engine.reject(input.tenantId, input.approvalId, {
          approverId: input.approverId,
          ...(input.reason !== undefined ? { reason: input.reason } : {})
        })
      } else {
        throw new DomainError(
          'conflict',
          `Runtime approval cannot be rejected from ${loaded.record.status}`
        )
      }

      const continuation = decided.continuation
      if (!continuation?.traceId) {
        throw new DomainError(
          'invalid_action',
          'Approved runtime continuation is missing its durable trace root'
        )
      }
      if (!/^[0-9a-f]{32}$/.test(continuation.traceId)) {
        throw new DomainError(
          'invalid_action',
          'Approved runtime continuation has an invalid durable trace root'
        )
      }

      const loadedById = new Map([[input.approvalId, loaded]])
      await this.#persistChanged(client, loadedById, store, input.tenantId)
      const runtime = new PostgresRuntimeRepository(client, {
        tenantIsolation: true
      })
      const continuationIdempotencyKey = `runtime-approval-continuation:${input.approvalId}`
      const existingContinuation = await client.query<{ id: string }>(
        `SELECT id
           FROM outbox_events
          WHERE tenant_id = $1 AND idempotency_key = $2
          LIMIT 1
          FOR UPDATE`,
        [input.tenantId, continuationIdempotencyKey]
      )
      const continuationEventInput: PostgresOutboxEnqueueInput = {
        tenantId: input.tenantId,
        type: 'inbound.process',
        payload: {
          kind: 'runtime_approval.continue',
          approvalId: input.approvalId,
          decision: input.decision
        },
        correlationId: decided.correlationId,
        traceId: continuation.traceId,
        idempotencyKey: continuationIdempotencyKey,
        conversationId: continuation.conversationId,
        sessionId: continuation.sessionId,
        inboundMessageId: continuation.inboundMessageId
      }
      const continuationEvent = await runtime.enqueue(
        continuationEventInput,
        client
      )
      if (existingContinuation.rows.length === 0) {
        await runtime.appendAudit({
          type: 'approval_decision',
          actorType: input.actorType,
          actorId: input.approverId,
          correlationId: decided.correlationId,
          policyVersion: 'api-runtime-v1',
          tenantId: input.tenantId,
          payload: {
            approvalId: input.approvalId,
            status: decided.status,
            tenantId: input.tenantId,
            requestCorrelationId: input.requestCorrelationId,
            continuationEventId: continuationEvent.id
          }
        })
      }
      return { approval: decided, continuationEvent }
    })
  }

  cancel(
    tenantId: string,
    approvalId: string,
    actorId: string
  ): Promise<ApprovalRecord> {
    return this.#mutateRecord(tenantId, approvalId, (engine) =>
      engine.cancel(tenantId, approvalId, actorId)
    )
  }

  verifyAndConsume(input: {
    tenantId: string
    approvalId: string
    action: string
    resource: { type: string; id?: string }
    payload: unknown
    executionRef?: string
  }): Promise<ApprovalConsumption> {
    return this.#mutateRecord(input.tenantId, input.approvalId, (engine) =>
      engine.verifyAndConsume(input)
    )
  }

  reserve(input: ApprovalReserveInput): Promise<ApprovalReservation> {
    return this.#mutateRecord(input.tenantId, input.approvalId, (engine) =>
      engine.reserve(input)
    )
  }

  markExecuting(input: {
    tenantId: string
    approvalId: string
    reservationId: string
  }): Promise<ApprovalRecord> {
    return this.#mutateRecord(input.tenantId, input.approvalId, (engine) =>
      engine.markExecuting(input)
    )
  }

  confirm(input: {
    tenantId: string
    approvalId: string
    reservationId: string
    evidence: EffectEvidence
  }): Promise<ApprovalRecord> {
    return this.#mutateRecord(input.tenantId, input.approvalId, (engine) =>
      engine.confirm(input)
    )
  }

  release(input: {
    tenantId: string
    approvalId: string
    reservationId: string
    evidence: EffectEvidence
  }): Promise<ApprovalRecord> {
    return this.#mutateRecord(input.tenantId, input.approvalId, (engine) =>
      engine.release(input)
    )
  }

  fail(input: {
    tenantId: string
    approvalId: string
    reservationId: string
    evidence: EffectEvidence
  }): Promise<ApprovalRecord> {
    return this.#mutateRecord(input.tenantId, input.approvalId, (engine) =>
      engine.fail(input)
    )
  }

  markUncertain(input: {
    tenantId: string
    approvalId: string
    reservationId: string
    reason: string
    evidence?: EffectEvidence
  }): Promise<ApprovalRecord> {
    return this.#mutateRecord(input.tenantId, input.approvalId, (engine) =>
      engine.markUncertain(input)
    )
  }

  reconcile(input: {
    tenantId: string
    approvalId: string
    actorId: string
    evidence: EffectEvidence
  }): Promise<ApprovalRecord> {
    return this.#mutateRecord(input.tenantId, input.approvalId, (engine) =>
      engine.reconcile(input)
    )
  }

  async releaseExpired(input: {
    tenantId: string
    now?: Date
    ttlMs?: number
    evidenceFor: (record: ApprovalRecord) => EffectEvidence | undefined
  }): Promise<{ released: number; uncertain: number }> {
    return withTenantTransaction(this.#pool, input.tenantId, async (client) => {
      const now = input.now ?? this.#clock()
      const result = await client.query<RuntimeApprovalRow>(
        `SELECT ${runtimeApprovalColumns}
         FROM runtime_approvals
         WHERE tenant_id = $1
           AND (
             (status IN ('RESERVED', 'EXECUTING')
              AND reservation_expires_at IS NOT NULL
              AND reservation_expires_at <= $2)
             OR
             (status IN ('REQUESTED', 'PENDING', 'APPROVED')
              AND expires_at <= $2)
           )
         ORDER BY approval_id
         FOR UPDATE`,
        [input.tenantId, now]
      )
      const loaded = new Map<string, LoadedApproval>()
      const store = new InMemoryApprovalStore()
      for (const row of result.rows) {
        const record = mapRuntimeApprovalRow(row)
        loaded.set(record.approvalId, {
          record,
          revision: Number(row.revision)
        })
        store.insert(cloneRecord(record))
      }
      const engine = this.#createEngine(store)
      engine.expireStale(now)
      const sweep = engine.releaseExpired({ ...input, now })
      await this.#persistChanged(client, loaded, store, input.tenantId)
      return sweep
    })
  }

  async expireStaleForTenant(
    tenantId: string,
    now = this.#clock()
  ): Promise<number> {
    return withTenantTransaction(this.#pool, tenantId, async (client) => {
      const result = await client.query(
        `UPDATE runtime_approvals
            SET status = 'EXPIRED', expired_at = $2, updated_at = $2,
                revision = revision + 1
          WHERE tenant_id = $1
            AND status IN ('REQUESTED', 'PENDING', 'APPROVED')
            AND expires_at <= $2`,
        [tenantId, now]
      )
      return result.rowCount ?? 0
    })
  }

  /**
   * The engine sweep is cross-tenant (`store.listExpiringBefore` has no tenant
   * filter) while every durable connection carries exactly one
   * `cvg.tenant_id`. The durable authority fails closed instead of pretending
   * the RLS scope can cover every tenant; production sweeps per tenant through
   * `releaseExpired`.
   */
  expireStale(): Promise<never> {
    return Promise.reject(
      new DomainError(
        'invalid_action',
        'expireStale is unsupported by PostgresApprovalAuthority: the engine sweep is cross-tenant while every durable connection is scoped by PostgreSQL RLS to one cvg.tenant_id. Sweep each tenant with releaseExpired.'
      )
    )
  }

  async list(
    tenantId: string,
    status?: ApprovalStatus
  ): Promise<ApprovalRecord[]> {
    return withTenantContext(this.#pool, tenantId, async (client) => {
      const result =
        status === undefined
          ? await client.query<RuntimeApprovalRow>(
              `SELECT ${runtimeApprovalColumns}
               FROM runtime_approvals
               WHERE tenant_id = $1
               ORDER BY requested_at, approval_id`,
              [tenantId]
            )
          : await client.query<RuntimeApprovalRow>(
              `SELECT ${runtimeApprovalColumns}
               FROM runtime_approvals
               WHERE tenant_id = $1 AND status = $2
               ORDER BY requested_at, approval_id`,
              [tenantId, status]
            )
      return result.rows.map(mapRuntimeApprovalRow)
    })
  }

  async get(tenantId: string, approvalId: string): Promise<ApprovalRecord> {
    const record = await withTenantContext(
      this.#pool,
      tenantId,
      async (client) => {
        const result = await client.query<RuntimeApprovalRow>(
          `SELECT ${runtimeApprovalColumns}
           FROM runtime_approvals
           WHERE tenant_id = $1 AND approval_id = $2`,
          [tenantId, approvalId]
        )
        const row = result.rows[0]
        return row ? mapRuntimeApprovalRow(row) : undefined
      }
    )
    if (record === undefined) {
      throw new ApprovalError('not_found', 'Approval not found for this tenant')
    }
    return record
  }

  /** Approvals still awaiting an operator decision (REQUESTED or PENDING). */
  async listPending(tenantId: string): Promise<ApprovalRecord[]> {
    return withTenantContext(this.#pool, tenantId, async (client) => {
      const result = await client.query<RuntimeApprovalRow>(
        `SELECT ${runtimeApprovalColumns}
         FROM runtime_approvals
         WHERE tenant_id = $1 AND status IN ('REQUESTED', 'PENDING')
         ORDER BY requested_at, approval_id`,
        [tenantId]
      )
      return result.rows.map(mapRuntimeApprovalRow)
    })
  }

  /**
   * Repairs a crash between durable approval creation and the message wait
   * marker without scanning a tenant's full approval history.
   */
  async findByContinuation(
    tenantId: string,
    inboundMessageId: string
  ): Promise<ApprovalRecord | undefined> {
    return withTenantContext(this.#pool, tenantId, async (client) => {
      const result = await client.query<RuntimeApprovalRow>(
        `SELECT ${runtimeApprovalColumns}
         FROM runtime_approvals
         WHERE tenant_id = $1
           AND continuation_payload->>'inboundMessageId' = $2
         ORDER BY requested_at, approval_id
         LIMIT 1`,
        [tenantId, inboundMessageId]
      )
      const row = result.rows[0]
      return row ? mapRuntimeApprovalRow(row) : undefined
    })
  }

  /**
   * Returns every candidate sharing the operation key. The key is not unique:
   * the effect journal (0013) is the authority that binds a key to a single
   * effect, so callers must reconcile candidates explicitly.
   */
  async getByOperationKey(
    tenantId: string,
    operationKey: string
  ): Promise<ApprovalRecord[]> {
    return withTenantContext(this.#pool, tenantId, async (client) => {
      const result = await client.query<RuntimeApprovalRow>(
        `SELECT ${runtimeApprovalColumns}
         FROM runtime_approvals
         WHERE tenant_id = $1 AND operation_key = $2
         ORDER BY requested_at, approval_id`,
        [tenantId, operationKey]
      )
      return result.rows.map(mapRuntimeApprovalRow)
    })
  }

  #createEngine(store: InMemoryApprovalStore): ApprovalEngine {
    return new ApprovalEngine({ ...this.#engineOptions, store })
  }

  async #mutateRecord<T>(
    tenantId: string,
    approvalId: string,
    run: (engine: ApprovalEngine, loaded: LoadedApproval) => T
  ): Promise<T> {
    const outcome = await withTenantTransaction(
      this.#pool,
      tenantId,
      async (client) => {
        const loaded = await this.#selectForUpdate(client, tenantId, approvalId)
        if (loaded === undefined) {
          throw new ApprovalError(
            'not_found',
            'Approval not found for this tenant'
          )
        }
        const store = new InMemoryApprovalStore()
        store.insert(cloneRecord(loaded.record))
        const engine = this.#createEngine(store)
        const loadedById = new Map([[approvalId, loaded]])
        try {
          const value = run(engine, loaded)
          await this.#persistChanged(client, loadedById, store, tenantId)
          return { ok: true as const, value }
        } catch (error) {
          // The engine expiry guard marks the record EXPIRED before throwing
          // `expired`. Committing that transition and then rethrowing keeps the
          // durable record equal to the in-memory state machine.
          await this.#persistChanged(client, loadedById, store, tenantId)
          return { ok: false as const, error }
        }
      }
    )
    if (!outcome.ok) throw outcome.error
    return outcome.value
  }

  async #selectForUpdate(
    client: PostgresPoolClient,
    tenantId: string,
    approvalId: string
  ): Promise<LoadedApproval | undefined> {
    const result = await client.query<RuntimeApprovalRow>(
      `SELECT ${runtimeApprovalColumns}
       FROM runtime_approvals
       WHERE tenant_id = $1 AND approval_id = $2
       FOR UPDATE`,
      [tenantId, approvalId]
    )
    const row = result.rows[0]
    return row
      ? { record: mapRuntimeApprovalRow(row), revision: Number(row.revision) }
      : undefined
  }

  async #persistChanged(
    client: PostgresPoolClient,
    loaded: Map<string, LoadedApproval>,
    store: InMemoryApprovalStore,
    tenantId: string
  ): Promise<number> {
    let persisted = 0
    for (const [approvalId, original] of loaded) {
      const current = store.get(tenantId, approvalId)
      if (current === undefined) continue
      if (recordsEquivalent(original.record, current)) continue
      const updated = await this.#compareAndSet(client, original, current)
      if (!updated) {
        throw new DomainError(
          'conflict',
          `Approval ${approvalId} compare-and-set failed`
        )
      }
      persisted += 1
    }
    return persisted
  }

  async #compareAndSet(
    client: PostgresPoolClient,
    loaded: LoadedApproval,
    next: ApprovalRecord
  ): Promise<boolean> {
    const values = recordValues(next)
    const mutable = values.slice(2)
    const updatedAt = this.#clock().toISOString()
    const result = await client.query(
      `UPDATE runtime_approvals
       SET ${casSetClause},
           revision = revision + 1,
           updated_at = $${casUpdatedAtParam}
       WHERE tenant_id = $1
         AND approval_id = $2
         AND revision = $${casRevisionParam}
         AND status = $${casStatusParam}
         AND COALESCE(reservation_id, '') = $${casReservationIdParam}
         AND reservation_generation = $${casGenerationParam}
       RETURNING revision`,
      [
        loaded.record.tenantId,
        loaded.record.approvalId,
        ...mutable,
        updatedAt,
        loaded.revision,
        loaded.record.status,
        loaded.record.reservationId ?? '',
        loaded.record.reservationGeneration ?? 0
      ]
    )
    return (result.rowCount ?? 0) === 1
  }

  async #insert(
    client: PostgresPoolClient,
    record: ApprovalRecord
  ): Promise<void> {
    const createdAt = this.#clock().toISOString()
    await client.query(
      `INSERT INTO runtime_approvals (${insertColumns})
       VALUES (${insertPlaceholders}, 1, $${persistedColumns.length + 1}, $${persistedColumns.length + 1})`,
      [...recordValues(record), createdAt]
    )
  }
}

function approvalRequestsEquivalent(
  existing: ApprovalRecord,
  requested: ApprovalRecord
): boolean {
  return (
    existing.tenantId === requested.tenantId &&
    existing.operatorId === requested.operatorId &&
    existing.agentId === requested.agentId &&
    existing.agentVersion === requested.agentVersion &&
    existing.action === requested.action &&
    existing.resource.type === requested.resource.type &&
    existing.resource.id === requested.resource.id &&
    existing.payloadHash === requested.payloadHash &&
    existing.policyVersion === requested.policyVersion &&
    existing.correlationId === requested.correlationId &&
    existing.continuation?.conversationId ===
      requested.continuation?.conversationId &&
    existing.continuation?.sessionId === requested.continuation?.sessionId &&
    existing.continuation?.inboundMessageId ===
      requested.continuation?.inboundMessageId
  )
}
