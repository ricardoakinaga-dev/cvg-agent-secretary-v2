import { createHash } from 'node:crypto'
import {
  createDomainId,
  DomainError,
  retentionDaysFor,
  type DataClassification
} from '@cvg/shared'
import { TenantIdSchema, type TenantId } from '@cvg/platform'
import type { QueryResultRow } from 'pg'
import type { PostgresQueryable } from './postgres.ts'
import {
  withTenantTransaction,
  type PostgresPoolLike
} from './tenant-scoped-postgres.ts'

/**
 * AUD19-05 / P1-DATA-01: manual, tenant-scoped retention and erasure.
 *
 * The module is deliberately inert on import: nothing is scheduled and no
 * connection is opened. Operators run `runTenantRetentionSweep` explicitly on
 * a disposable/controlled database after a policy is approved. Without an
 * approved declaration for a catalog target the sweep deletes/redacts nothing
 * and records a pending entry in `retention_erasure_ledger` (fail closed).
 */

/** D05-3/4 approved operational default: 30 days for eligible data. */
export const DEFAULT_RETENTION_TTL_DAYS = 30

/** Declared lower bound of the elimination window for full sweeps. */
export const RETENTION_WINDOW_START = new Date('1970-01-01T00:00:00.000Z')

export const RETENTION_REDACTED_TEXT = '[redacted:retention]'

export const RETENTION_REDACTED_JSON = Object.freeze({
  redacted: true,
  policy: 'retention'
})

export type RetentionAction = 'delete' | 'redact'

export type RetentionRedactionValueKind =
  | 'text'
  | 'jsonb_object'
  | 'jsonb_empty_array'

export interface RetentionRedactionColumn {
  column: string
  valueKind: RetentionRedactionValueKind
}

export interface RetentionTargetDefinition {
  id: string
  table: string
  idColumn: string
  tenantColumn: string
  timeColumn: string
  classification: DataClassification
  description: string
  supportedActions: readonly RetentionAction[]
  defaultAction: RetentionAction
  stateColumn: string | null
  /** States a policy may declare eligible; null means the target has no state gate. */
  eligibleStates: readonly string[] | null
  /** States that never expire automatically, e.g. UNCERTAIN per D05-3/4. */
  neverExpireStates: readonly string[]
  redactionColumns: readonly RetentionRedactionColumn[]
}

/**
 * Closed catalog of supported targets. Table and column names are never
 * accepted from callers, so no dynamic identifier can reach SQL.
 */
export const RETENTION_TARGETS: readonly RetentionTargetDefinition[] =
  Object.freeze([
    {
      id: 'effect_journal',
      table: 'effect_journal',
      idColumn: 'operation_key',
      tenantColumn: 'tenant_id',
      timeColumn: 'updated_at',
      classification: 'INTERNAL',
      description:
        'Governed effect identity per (tenant, operation_key). D05-3/4: terminal entries expire after 30 days; UNCERTAIN never expires.',
      supportedActions: ['delete'],
      defaultAction: 'delete',
      stateColumn: 'state',
      eligibleStates: ['CONFIRMED', 'EFFECT_FAILED', 'ABANDONED'],
      neverExpireStates: ['UNCERTAIN', 'RESERVED', 'EFFECT_STARTED'],
      redactionColumns: []
    },
    {
      id: 'inbound_idempotency',
      table: 'idempotency',
      idColumn: 'key',
      tenantColumn: 'tenant_id',
      timeColumn: 'created_at',
      classification: 'INTERNAL',
      description:
        'Inbound deduplication keys. D05-3/4: inbound TTL of 30 days; purge must never introduce duplicate processing.',
      supportedActions: ['delete'],
      defaultAction: 'delete',
      stateColumn: null,
      eligibleStates: null,
      neverExpireStates: [],
      redactionColumns: []
    },
    {
      id: 'runtime_approvals',
      table: 'runtime_approvals',
      idColumn: 'approval_id',
      tenantColumn: 'tenant_id',
      timeColumn: 'updated_at',
      classification: 'CONFIDENTIAL',
      description:
        'Durable approval state machine. Terminal proposals are minimized after TTL; UNCERTAIN is never expiring automatically.',
      supportedActions: ['redact'],
      defaultAction: 'redact',
      stateColumn: 'status',
      eligibleStates: [
        'EXECUTED',
        'FAILED',
        'REJECTED',
        'CANCELLED',
        'EXPIRED'
      ],
      neverExpireStates: ['UNCERTAIN'],
      redactionColumns: [
        { column: 'proposal_payload', valueKind: 'jsonb_object' },
        { column: 'continuation_payload', valueKind: 'jsonb_object' },
        { column: 'decision_reason', valueKind: 'text' }
      ]
    },
    {
      id: 'orchestrator_goals',
      table: 'orchestrator_goals',
      idColumn: 'id',
      tenantColumn: 'tenant_id',
      timeColumn: 'updated_at',
      classification: 'CONFIDENTIAL',
      description:
        'Durable goal state including objective/planner_context. Terminal goals are minimized or deleted after TTL; UNCERTAIN never expires automatically.',
      supportedActions: ['redact', 'delete'],
      defaultAction: 'redact',
      stateColumn: 'status',
      eligibleStates: [
        'COMPLETED',
        'FAILED',
        'BLOCKED',
        'CANCELLED',
        'BUDGET_EXHAUSTED',
        'LOOP_DETECTED'
      ],
      neverExpireStates: ['UNCERTAIN'],
      redactionColumns: [
        { column: 'objective', valueKind: 'text' },
        { column: 'planner_context', valueKind: 'jsonb_object' },
        { column: 'success_criteria', valueKind: 'jsonb_empty_array' },
        { column: 'last_reason', valueKind: 'text' },
        { column: 'last_error', valueKind: 'text' }
      ]
    },
    {
      id: 'outbox_events',
      table: 'outbox_events',
      idColumn: 'id',
      tenantColumn: 'tenant_id',
      timeColumn: 'processed_at',
      classification: 'CONFIDENTIAL',
      description:
        'Durable outbox envelope. Only processed events are minimized after TTL; pending/processing/failed/dead_letter rows are never eligible.',
      supportedActions: ['redact'],
      defaultAction: 'redact',
      stateColumn: 'status',
      eligibleStates: ['processed'],
      neverExpireStates: ['pending', 'processing', 'failed', 'dead_letter'],
      redactionColumns: [{ column: 'payload', valueKind: 'jsonb_object' }]
    }
  ])

const RETENTION_TARGET_BY_ID: ReadonlyMap<string, RetentionTargetDefinition> =
  new Map(RETENTION_TARGETS.map((target) => [target.id, target]))

export function retentionTargetById(
  targetId: string
): RetentionTargetDefinition | undefined {
  return RETENTION_TARGET_BY_ID.get(targetId)
}

export interface RetentionPolicyDeclaration {
  targetId: string
  policyId: string
  approvalRef: string
  approvedBy: string
  approvedAt: string | Date
  /** Defaults to D05-3/4 operational value (30 days). */
  ttlDays?: number
  action?: RetentionAction
  /** Required for state-gated targets; must be an explicitly approved subset. */
  eligibleStates?: readonly string[]
}

export type RetentionPendingReason =
  | 'no_policy_configured'
  | 'duplicate_policy'
  | 'unknown_target'
  | 'missing_approval'
  | 'approval_not_effective'
  | 'invalid_ttl'
  | 'ttl_exceeds_classification_limit'
  | 'unsupported_action'
  | 'missing_eligible_states'
  | 'unapproved_state'
  | 'protected_state'
  | 'invalid_hold'

export interface ResolvedRetentionTargetPlan {
  target: RetentionTargetDefinition
  action: RetentionAction
  policyId: string
  policyRef: string
  approvedBy: string
  approvedAt: Date
  ttlDays: number
  eligibleStates: readonly string[]
  cutoff: Date
  windowStart: Date
}

export interface PendingRetentionTargetPlan {
  targetId: string
  target: RetentionTargetDefinition | null
  reason: RetentionPendingReason
}

export interface RetentionSweepPlan {
  tenantId: TenantId
  executedAt: Date
  executedBy: string
  approved: readonly ResolvedRetentionTargetPlan[]
  pending: readonly PendingRetentionTargetPlan[]
}

export interface RetentionSweepRequest {
  tenantId: TenantId
  executedBy: string
  /** Injected clock; tests use a synthetic one. Defaults to wall time. */
  clock?: () => Date
  policies: readonly RetentionPolicyDeclaration[]
}

export interface RetentionHold {
  id: string
  tenantId: TenantId
  targetId: string
  /** null protects every record of the target for the tenant. */
  recordId: string | null
  reason: string
  authorizationRef: string
  approvedBy: string
  approvedAt: Date
  releasedAt: Date | null
}

export interface RetentionEligibility {
  tenantId: TenantId
  target: RetentionTargetDefinition
  cutoff: Date
  eligibleStates: readonly string[]
  holds: readonly RetentionHold[]
}

export interface RetentionLedgerEntry {
  tenantId: TenantId
  id: string
  targetId: string
  classification: DataClassification
  action: RetentionAction | 'none'
  outcome: RetentionSweepStatus
  reason: string | null
  policyId: string | null
  policyRef: string | null
  policyApprovedBy: string | null
  policyApprovedAt: Date | null
  windowStart: Date
  windowEnd: Date
  deletedCount: number
  redactedCount: number
  preservedHoldCount: number
  batchHash: string
  executedBy: string
  executedAt: Date
}

export type RetentionSweepStatus =
  | 'EXECUTED'
  | 'SKIPPED_NO_POLICY'
  | 'SKIPPED_INVALID_HOLD'

export interface RetentionSweepOutcome {
  targetId: string
  status: RetentionSweepStatus
  reason: string | null
  action: RetentionAction | 'none'
  deletedCount: number
  redactedCount: number
  preservedHoldCount: number
  windowStart: string
  windowEnd: string
  batchHash: string
  policyId: string | null
  /** Null when the target is unknown to the catalog and cannot be classified. */
  ledgerId: string | null
}

export interface RetentionSweepReport {
  tenantId: TenantId
  executedAt: string
  outcomes: RetentionSweepOutcome[]
}

/**
 * Narrow port implemented by the PostgreSQL adapter and by deterministic test
 * doubles. Every mutation is expressed as metadata plus an eligibility window.
 */
export interface RetentionSweepStore {
  listActiveHolds(
    tenantId: TenantId,
    targetId: string
  ): Promise<RetentionHold[]>
  countHeld(eligibility: RetentionEligibility): Promise<number>
  deleteEligible(eligibility: RetentionEligibility): Promise<number>
  redactEligible(eligibility: RetentionEligibility): Promise<number>
  appendLedgerEntry(entry: RetentionLedgerEntry): Promise<void>
}

export class RetentionHoldError extends DomainError {
  constructor(message: string) {
    super('validation_failed', message)
    this.name = 'RetentionHoldError'
  }
}

function requireBoundedLabel(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    throw new DomainError('validation_failed', `${label} is required`)
  }
  const trimmed = value.trim()
  if (trimmed.length < 1 || trimmed.length > 200) {
    throw new DomainError('validation_failed', `${label} is invalid`)
  }
  for (const char of trimmed) {
    const code = char.codePointAt(0) ?? 0
    if (code < 0x20 || code === 0x7f) {
      throw new DomainError('validation_failed', `${label} is invalid`)
    }
  }
  return trimmed
}

function toValidDate(value: unknown, label: string): Date {
  const date =
    value instanceof Date
      ? new Date(value.getTime())
      : new Date(typeof value === 'string' ? value : Number.NaN)
  if (!Number.isFinite(date.getTime())) {
    throw new DomainError('validation_failed', `${label} is invalid`)
  }
  return date
}

function policyPending(
  declaration: RetentionPolicyDeclaration,
  reason: RetentionPendingReason
): PendingRetentionTargetPlan {
  return {
    targetId: declaration.targetId,
    target: RETENTION_TARGET_BY_ID.get(declaration.targetId) ?? null,
    reason
  }
}

function resolvePolicy(
  declaration: RetentionPolicyDeclaration,
  executedAt: Date
): ResolvedRetentionTargetPlan | PendingRetentionTargetPlan {
  const target = RETENTION_TARGET_BY_ID.get(declaration.targetId)
  if (!target) return policyPending(declaration, 'unknown_target')

  if (
    typeof declaration.policyId !== 'string' ||
    typeof declaration.approvalRef !== 'string' ||
    typeof declaration.approvedBy !== 'string' ||
    declaration.policyId.trim().length === 0 ||
    declaration.approvalRef.trim().length === 0 ||
    declaration.approvedBy.trim().length === 0
  ) {
    return policyPending(declaration, 'missing_approval')
  }
  let approvedAt: Date
  try {
    approvedAt = toValidDate(declaration.approvedAt, 'Retention approval date')
  } catch {
    return policyPending(declaration, 'missing_approval')
  }
  if (approvedAt.getTime() > executedAt.getTime()) {
    return policyPending(declaration, 'approval_not_effective')
  }

  const ttlDays = declaration.ttlDays ?? DEFAULT_RETENTION_TTL_DAYS
  if (!Number.isSafeInteger(ttlDays) || ttlDays < 1) {
    return policyPending(declaration, 'invalid_ttl')
  }
  if (ttlDays > retentionDaysFor(target.classification)) {
    return policyPending(declaration, 'ttl_exceeds_classification_limit')
  }

  const action = declaration.action ?? target.defaultAction
  if (!target.supportedActions.includes(action)) {
    return policyPending(declaration, 'unsupported_action')
  }

  let eligibleStates: readonly string[] = []
  if (target.stateColumn !== null) {
    const declared = declaration.eligibleStates
    if (!declared || declared.length === 0) {
      return policyPending(declaration, 'missing_eligible_states')
    }
    for (const state of declared) {
      if (target.neverExpireStates.includes(state)) {
        return policyPending(declaration, 'protected_state')
      }
      if (!target.eligibleStates?.includes(state)) {
        return policyPending(declaration, 'unapproved_state')
      }
    }
    eligibleStates = [...declared]
  }

  return {
    target,
    action,
    policyId: declaration.policyId.trim(),
    policyRef: declaration.approvalRef.trim(),
    approvedBy: declaration.approvedBy.trim(),
    approvedAt,
    ttlDays,
    eligibleStates,
    cutoff: new Date(executedAt.getTime() - ttlDays * 86_400_000),
    windowStart: RETENTION_WINDOW_START
  }
}

export function resolveRetentionSweepPlan(
  request: Omit<RetentionSweepRequest, 'clock'>,
  executedAt: Date
): RetentionSweepPlan {
  const tenantId = TenantIdSchema.parse(request.tenantId)
  const executedBy = requireBoundedLabel(request.executedBy, 'executedBy')
  const declarations = [...request.policies]
  const declaredTargets = new Set<string>()
  const declarationCounts = new Map<string, number>()
  for (const declaration of declarations) {
    declarationCounts.set(
      declaration.targetId,
      (declarationCounts.get(declaration.targetId) ?? 0) + 1
    )
  }
  const approved: ResolvedRetentionTargetPlan[] = []
  const pending: PendingRetentionTargetPlan[] = []

  for (const declaration of declarations) {
    if ((declarationCounts.get(declaration.targetId) ?? 0) > 1) {
      declaredTargets.add(declaration.targetId)
      pending.push(policyPending(declaration, 'duplicate_policy'))
      continue
    }
    declaredTargets.add(declaration.targetId)
    const resolved = resolvePolicy(declaration, executedAt)
    if ('target' in resolved && 'action' in resolved) {
      approved.push(resolved)
    } else {
      pending.push(resolved as PendingRetentionTargetPlan)
    }
  }

  for (const target of RETENTION_TARGETS) {
    if (declaredTargets.has(target.id)) continue
    pending.push({
      targetId: target.id,
      target,
      reason: 'no_policy_configured'
    })
  }

  return { tenantId, executedAt, executedBy, approved, pending }
}

function assertRetentionHoldApproved(hold: RetentionHold): void {
  if (typeof hold.id !== 'string' || hold.id.trim().length === 0) {
    throw new RetentionHoldError('Retention hold id is invalid')
  }
  if (
    typeof hold.tenantId !== 'string' ||
    hold.tenantId.trim().length === 0 ||
    typeof hold.targetId !== 'string' ||
    hold.targetId.trim().length === 0
  ) {
    throw new RetentionHoldError('Retention hold scope is invalid')
  }
  if (
    hold.recordId !== null &&
    (typeof hold.recordId !== 'string' ||
      hold.recordId.trim().length === 0 ||
      hold.recordId.length > 300)
  ) {
    throw new RetentionHoldError('Retention hold record id is invalid')
  }
  if (
    typeof hold.reason !== 'string' ||
    hold.reason.trim().length === 0 ||
    typeof hold.authorizationRef !== 'string' ||
    hold.authorizationRef.trim().length === 0 ||
    typeof hold.approvedBy !== 'string' ||
    hold.approvedBy.trim().length === 0
  ) {
    throw new RetentionHoldError('Retention hold approval metadata is missing')
  }
  if (
    !(hold.approvedAt instanceof Date) ||
    !Number.isFinite(hold.approvedAt.getTime())
  ) {
    throw new RetentionHoldError('Retention hold approval date is invalid')
  }
  if (hold.releasedAt !== null) {
    throw new RetentionHoldError('Retention hold is not active')
  }
}

export function computeRetentionBatchHash(input: {
  tenantId: string
  targetId: string
  action: RetentionAction | 'none'
  policyId: string | null
  windowStart: Date
  windowEnd: Date
  holds: readonly RetentionHold[]
}): string {
  const holdRecordIds = input.holds
    .map((hold) => hold.recordId)
    .filter((recordId): recordId is string => recordId !== null)
    .sort()
  const metadata = {
    tenantId: input.tenantId,
    targetId: input.targetId,
    action: input.action,
    policyId: input.policyId,
    windowStart: input.windowStart.toISOString(),
    windowEnd: input.windowEnd.toISOString(),
    tenantWideHold: input.holds.some((hold) => hold.recordId === null),
    holdRecordIds
  }
  return createHash('sha256').update(JSON.stringify(metadata)).digest('hex')
}

interface LedgerEntryInput {
  tenantId: TenantId
  target: RetentionTargetDefinition | null
  targetId: string
  action: RetentionAction | 'none'
  outcome: RetentionSweepStatus
  reason: string | null
  policyId: string | null
  policyRef: string | null
  policyApprovedBy: string | null
  policyApprovedAt: Date | null
  windowStart: Date
  windowEnd: Date
  deletedCount: number
  redactedCount: number
  preservedHoldCount: number
  holds: readonly RetentionHold[]
  executedBy: string
  executedAt: Date
}

/**
 * Builds the ledger record from metadata only. Eliminated content never
 * reaches this function, and appendLedgerEntry writes explicit columns only.
 */
function buildRetentionLedgerEntry(
  input: LedgerEntryInput
): RetentionLedgerEntry {
  return {
    tenantId: input.tenantId,
    id: createDomainId('erasure'),
    targetId: input.targetId,
    classification: input.target?.classification ?? 'INTERNAL',
    action: input.action,
    outcome: input.outcome,
    reason: input.reason,
    policyId: input.policyId,
    policyRef: input.policyRef,
    policyApprovedBy: input.policyApprovedBy,
    policyApprovedAt: input.policyApprovedAt
      ? new Date(input.policyApprovedAt.getTime())
      : null,
    windowStart: new Date(input.windowStart.getTime()),
    windowEnd: new Date(input.windowEnd.getTime()),
    deletedCount: input.deletedCount,
    redactedCount: input.redactedCount,
    preservedHoldCount: input.preservedHoldCount,
    batchHash: computeRetentionBatchHash({
      tenantId: input.tenantId,
      targetId: input.targetId,
      action: input.action,
      policyId: input.policyId,
      windowStart: input.windowStart,
      windowEnd: input.windowEnd,
      holds: input.holds
    }),
    executedBy: input.executedBy,
    executedAt: new Date(input.executedAt.getTime())
  }
}

async function recordSkippedTarget(
  store: RetentionSweepStore,
  plan: RetentionSweepPlan,
  pending: PendingRetentionTargetPlan,
  status: RetentionSweepStatus,
  reason: string,
  holds: readonly RetentionHold[],
  persist = true
): Promise<RetentionSweepOutcome> {
  const entry = buildRetentionLedgerEntry({
    tenantId: plan.tenantId,
    target: pending.target,
    targetId: pending.targetId,
    action: 'none',
    outcome: status,
    reason,
    policyId: null,
    policyRef: null,
    policyApprovedBy: null,
    policyApprovedAt: null,
    windowStart: plan.executedAt,
    windowEnd: plan.executedAt,
    deletedCount: 0,
    redactedCount: 0,
    preservedHoldCount: 0,
    holds,
    executedBy: plan.executedBy,
    executedAt: plan.executedAt
  })
  if (!persist) {
    return {
      targetId: pending.targetId,
      status,
      reason,
      action: 'none',
      deletedCount: 0,
      redactedCount: 0,
      preservedHoldCount: 0,
      windowStart: entry.windowStart.toISOString(),
      windowEnd: entry.windowEnd.toISOString(),
      batchHash: entry.batchHash,
      policyId: null,
      ledgerId: null
    }
  }
  await store.appendLedgerEntry(entry)
  return {
    targetId: pending.targetId,
    status,
    reason,
    action: 'none',
    deletedCount: 0,
    redactedCount: 0,
    preservedHoldCount: 0,
    windowStart: entry.windowStart.toISOString(),
    windowEnd: entry.windowEnd.toISOString(),
    batchHash: entry.batchHash,
    policyId: null,
    ledgerId: entry.id
  }
}

export async function executeRetentionSweep(
  store: RetentionSweepStore,
  request: RetentionSweepRequest
): Promise<RetentionSweepReport> {
  const clock = request.clock ?? (() => new Date())
  const executedAt = toValidDate(clock(), 'Retention sweep clock')
  const plan = resolveRetentionSweepPlan(request, executedAt)
  const outcomes: RetentionSweepOutcome[] = []

  for (const pending of plan.pending) {
    const status: RetentionSweepStatus =
      pending.reason === 'invalid_hold'
        ? 'SKIPPED_INVALID_HOLD'
        : 'SKIPPED_NO_POLICY'
    outcomes.push(
      await recordSkippedTarget(
        store,
        plan,
        pending,
        status,
        pending.reason,
        [],
        pending.target !== null
      )
    )
  }

  for (const resolved of plan.approved) {
    let holds: RetentionHold[]
    try {
      holds = await store.listActiveHolds(plan.tenantId, resolved.target.id)
      for (const hold of holds) {
        if (
          hold.tenantId !== plan.tenantId ||
          hold.targetId !== resolved.target.id
        ) {
          throw new RetentionHoldError('Retention hold scope is invalid')
        }
        assertRetentionHoldApproved(hold)
      }
    } catch (error) {
      if (error instanceof RetentionHoldError) {
        outcomes.push(
          await recordSkippedTarget(
            store,
            plan,
            {
              targetId: resolved.target.id,
              target: resolved.target,
              reason: 'invalid_hold'
            },
            'SKIPPED_INVALID_HOLD',
            'invalid_hold',
            []
          )
        )
        continue
      }
      throw error
    }

    const eligibility: RetentionEligibility = {
      tenantId: plan.tenantId,
      target: resolved.target,
      cutoff: resolved.cutoff,
      eligibleStates: resolved.eligibleStates,
      holds
    }
    const preservedHoldCount = await store.countHeld(eligibility)
    const deletedCount =
      resolved.action === 'delete' ? await store.deleteEligible(eligibility) : 0
    const redactedCount =
      resolved.action === 'redact' ? await store.redactEligible(eligibility) : 0

    const entry = buildRetentionLedgerEntry({
      tenantId: plan.tenantId,
      target: resolved.target,
      targetId: resolved.target.id,
      action: resolved.action,
      outcome: 'EXECUTED',
      reason: null,
      policyId: resolved.policyId,
      policyRef: resolved.policyRef,
      policyApprovedBy: resolved.approvedBy,
      policyApprovedAt: resolved.approvedAt,
      windowStart: resolved.windowStart,
      windowEnd: resolved.cutoff,
      deletedCount,
      redactedCount,
      preservedHoldCount,
      holds,
      executedBy: plan.executedBy,
      executedAt: plan.executedAt
    })
    await store.appendLedgerEntry(entry)
    outcomes.push({
      targetId: resolved.target.id,
      status: 'EXECUTED',
      reason: null,
      action: resolved.action,
      deletedCount,
      redactedCount,
      preservedHoldCount,
      windowStart: entry.windowStart.toISOString(),
      windowEnd: entry.windowEnd.toISOString(),
      batchHash: entry.batchHash,
      policyId: resolved.policyId,
      ledgerId: entry.id
    })
  }

  return {
    tenantId: plan.tenantId,
    executedAt: plan.executedAt.toISOString(),
    outcomes
  }
}

const IDENTIFIER_PATTERN = /^[a-z][a-z0-9_]{0,62}$/

function quoteIdentifier(value: string): string {
  if (!IDENTIFIER_PATTERN.test(value)) {
    throw new DomainError(
      'validation_failed',
      'Retention identifier is invalid'
    )
  }
  return `"${value}"`
}

function redactionValue(column: RetentionRedactionColumn): unknown {
  switch (column.valueKind) {
    case 'text':
      return RETENTION_REDACTED_TEXT
    case 'jsonb_object':
      return JSON.stringify(RETENTION_REDACTED_JSON)
    case 'jsonb_empty_array':
      return '[]'
  }
}

function eligibilityClause(
  eligibility: RetentionEligibility,
  mode: 'exclude_holds' | 'only_holds'
): { clause: string; values: unknown[] } {
  const target = eligibility.target
  const values: unknown[] = [eligibility.tenantId, eligibility.cutoff]
  const clauses = [
    `t.${quoteIdentifier(target.tenantColumn)} = $1`,
    `t.${quoteIdentifier(target.timeColumn)} < $2`
  ]
  if (target.stateColumn !== null) {
    values.push([...eligibility.eligibleStates])
    clauses.push(
      `t.${quoteIdentifier(target.stateColumn)} = ANY($${values.length}::text[])`
    )
  }

  const holdRecordIds = eligibility.holds
    .map((hold) => hold.recordId)
    .filter((recordId): recordId is string => recordId !== null)
    .sort()
  const tenantWideHold = eligibility.holds.some(
    (hold) => hold.recordId === null
  )
  if (mode === 'exclude_holds') {
    if (tenantWideHold) {
      clauses.push('false')
    } else if (holdRecordIds.length > 0) {
      values.push(holdRecordIds)
      clauses.push(
        `NOT (t.${quoteIdentifier(target.idColumn)} = ANY($${values.length}::text[]))`
      )
    }
  } else if (tenantWideHold) {
    // Every eligible row is protected; the base clause already selects them.
  } else if (holdRecordIds.length > 0) {
    values.push(holdRecordIds)
    clauses.push(
      `t.${quoteIdentifier(target.idColumn)} = ANY($${values.length}::text[])`
    )
  } else {
    clauses.push('false')
  }

  return { clause: clauses.join(' AND '), values }
}

interface RetentionHoldRow extends QueryResultRow {
  id: string
  tenant_id: string
  target_id: string
  record_id: string | null
  reason: string
  authorization_ref: string
  approved_by: string
  approved_at: Date
  released_at: Date | null
}

function mapRetentionHoldRow(row: RetentionHoldRow): RetentionHold {
  return {
    id: row.id,
    tenantId: row.tenant_id as TenantId,
    targetId: row.target_id,
    recordId: row.record_id,
    reason: row.reason,
    authorizationRef: row.authorization_ref,
    approvedBy: row.approved_by,
    approvedAt:
      row.approved_at instanceof Date
        ? new Date(row.approved_at.getTime())
        : new Date(row.approved_at),
    releasedAt: row.released_at
      ? row.released_at instanceof Date
        ? new Date(row.released_at.getTime())
        : new Date(row.released_at)
      : null
  }
}

/**
 * PostgreSQL sweep store. It requires the caller to already be inside a
 * `withTenantTransaction`/`withTenantContext` block for the request tenant;
 * every method re-verifies `cvg.tenant_id` and fails closed on mismatch.
 */
export function createPostgresRetentionSweepStore(
  client: PostgresQueryable
): RetentionSweepStore {
  const assertTenantContext = async (tenantId: TenantId): Promise<void> => {
    const result = await client.query<{ tenant_id: string | null }>(
      `SELECT NULLIF(current_setting('cvg.tenant_id', true), '') AS tenant_id`
    )
    if (result.rows.length !== 1 || result.rows[0]?.tenant_id !== tenantId) {
      throw new DomainError(
        'invalid_action',
        'Retention sweep tenant context mismatch'
      )
    }
  }

  return {
    async listActiveHolds(
      tenantId: TenantId,
      targetId: string
    ): Promise<RetentionHold[]> {
      await assertTenantContext(tenantId)
      const result = await client.query<RetentionHoldRow>(
        `SELECT id, tenant_id, target_id, record_id, reason,
                authorization_ref, approved_by, approved_at, released_at
           FROM retention_holds
          WHERE tenant_id = $1 AND target_id = $2 AND released_at IS NULL
          ORDER BY id`,
        [tenantId, targetId]
      )
      return result.rows.map(mapRetentionHoldRow)
    },

    async countHeld(eligibility: RetentionEligibility): Promise<number> {
      await assertTenantContext(eligibility.tenantId)
      if (eligibility.holds.length === 0) return 0
      const { clause, values } = eligibilityClause(eligibility, 'only_holds')
      const result = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count
           FROM ${quoteIdentifier(eligibility.target.table)} AS t
          WHERE ${clause}`,
        values
      )
      return Number(result.rows[0]?.count ?? '0')
    },

    async deleteEligible(eligibility: RetentionEligibility): Promise<number> {
      await assertTenantContext(eligibility.tenantId)
      const { clause, values } = eligibilityClause(eligibility, 'exclude_holds')
      const result = await client.query(
        `DELETE FROM ${quoteIdentifier(eligibility.target.table)} AS t
          WHERE ${clause}`,
        values
      )
      return result.rowCount ?? 0
    },

    async redactEligible(eligibility: RetentionEligibility): Promise<number> {
      await assertTenantContext(eligibility.tenantId)
      const columns = eligibility.target.redactionColumns
      if (columns.length === 0) return 0
      const { clause, values } = eligibilityClause(eligibility, 'exclude_holds')
      // Rows already fully minimized are no longer eligible, so a second sweep
      // reports zero redactions instead of rewriting identical markers.
      const stillSensitive = columns.map((column) => {
        values.push(redactionValue(column))
        const cast = column.valueKind === 'text' ? '' : '::jsonb'
        return `t.${quoteIdentifier(column.column)} IS DISTINCT FROM $${values.length}${cast}`
      })
      const assignments = columns.map((column) => {
        values.push(redactionValue(column))
        const cast = column.valueKind === 'text' ? '' : '::jsonb'
        return `${quoteIdentifier(column.column)} = $${values.length}${cast}`
      })
      const result = await client.query(
        `UPDATE ${quoteIdentifier(eligibility.target.table)} AS t
            SET ${assignments.join(', ')}
          WHERE ${clause} AND (${stillSensitive.join(' OR ')})`,
        values
      )
      return result.rowCount ?? 0
    },

    async appendLedgerEntry(entry: RetentionLedgerEntry): Promise<void> {
      await assertTenantContext(entry.tenantId)
      await client.query(
        `INSERT INTO retention_erasure_ledger
           (tenant_id, id, target_id, classification, action, outcome, reason,
            policy_id, policy_ref, policy_approved_by, policy_approved_at,
            window_start, window_end, deleted_count, redacted_count,
            preserved_hold_count, batch_hash, executed_by, executed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
                 $14, $15, $16, $17, $18, $19)`,
        [
          entry.tenantId,
          entry.id,
          entry.targetId,
          entry.classification,
          entry.action,
          entry.outcome,
          entry.reason,
          entry.policyId,
          entry.policyRef,
          entry.policyApprovedBy,
          entry.policyApprovedAt,
          entry.windowStart,
          entry.windowEnd,
          entry.deletedCount,
          entry.redactedCount,
          entry.preservedHoldCount,
          entry.batchHash,
          entry.executedBy,
          entry.executedAt
        ]
      )
    }
  }
}

/**
 * Manual operator entry point. It opens one tenant-scoped transaction, so
 * mutations and ledger rows commit together. It is never called by the worker
 * or any import side effect; production activation still needs the policies
 * listed in docs/04_audit/evidence/AUD19/ to be approved by a human owner.
 */
export async function runTenantRetentionSweep(
  pool: PostgresPoolLike,
  request: RetentionSweepRequest
): Promise<RetentionSweepReport> {
  const tenantId = TenantIdSchema.parse(request.tenantId)
  return withTenantTransaction(pool, tenantId, (client) =>
    executeRetentionSweep(createPostgresRetentionSweepStore(client), {
      ...request,
      tenantId
    })
  )
}
