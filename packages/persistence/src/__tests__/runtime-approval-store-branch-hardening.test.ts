import { createHash, randomBytes } from 'node:crypto'
import { Client, Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ApprovalError } from '@cvg/approval-engine'
import { DomainError, createCorrelationId } from '@cvg/shared'
import { runPostgresMigrations } from '../postgres.ts'
import {
  mapRuntimeApprovalRow,
  PostgresApprovalAuthority,
  type RuntimeApprovalRow
} from '../runtime-approval-store.ts'

const testDatabaseUrl = process.env.TEST_DATABASE_URL
const describeWithPostgres = testDatabaseUrl ? describe : describe.skip

const tenantDecision = 'tenant_00000000-0000-4000-8000-000000000c31'
const tenantMinimal = 'tenant_00000000-0000-4000-8000-000000000c32'
const tenantSweep = 'tenant_00000000-0000-4000-8000-000000000c33'
const tenantDedup = 'tenant_00000000-0000-4000-8000-000000000c34'
const tenantLookup = 'tenant_00000000-0000-4000-8000-000000000c35'
const tenantVerify = 'tenant_00000000-0000-4000-8000-000000000c36'
const tenantFail = 'tenant_00000000-0000-4000-8000-000000000c37'
const tenantCancel = 'tenant_00000000-0000-4000-8000-000000000c38'
const tenantStale = 'tenant_00000000-0000-4000-8000-000000000c39'

const validTraceId = '0123456789abcdef0123456789abcdef'

function proposalHashFor(hint: string): string {
  return createHash('sha256').update(`proposal:${hint}`, 'utf8').digest('hex')
}

function syntheticPayload(hint: string): unknown {
  return {
    kind: 'synthetic_appointment_draft',
    draftId: `draft_${hint}`,
    note: 'synthetic fixture only'
  }
}

function requestInput(tenantId: string, hint: string) {
  return {
    tenantId,
    operatorId: 'op_operator_1',
    agentId: 'agent_secretary',
    agentVersion: '1.0.0',
    action: 'appointment.confirm',
    resource: { type: 'appointment', id: `apt_${hint}` },
    payload: syntheticPayload(hint),
    policyVersion: 'policy-v1',
    correlationId: createCorrelationId(),
    proposalId: `proposal_${hint}`,
    proposalHash: proposalHashFor(hint),
    capability: 'appointments.manage',
    dataClassification: 'synthetic',
    proposalPayload: syntheticPayload(hint)
  }
}

function continuationFor(hint: string) {
  return {
    conversationId: `conv_${hint}`,
    sessionId: `sess_${hint}`,
    inboundMessageId: `msg_${hint}`,
    traceId: validTraceId
  }
}

function reserveInput(
  tenantId: string,
  hint: string,
  approvalId: string,
  reservationId: string
) {
  return {
    tenantId,
    approvalId,
    action: 'appointment.confirm',
    resource: { type: 'appointment', id: `apt_${hint}` },
    payload: syntheticPayload(hint),
    proposalHash: proposalHashFor(hint),
    agentId: 'agent_secretary',
    agentVersion: '1.0.0',
    policyVersion: 'policy-v1',
    capability: 'appointments.manage',
    reservationId,
    ownerId: 'op_operator_1',
    ttlMs: 60_000
  }
}

async function createApproved(
  authority: PostgresApprovalAuthority,
  tenantId: string,
  hint: string
) {
  const record = await authority.request(requestInput(tenantId, hint))
  await authority.submit(tenantId, record.approvalId, 'op_operator_1')
  return await authority.approve(tenantId, record.approvalId, {
    approverId: 'op_approver_1'
  })
}

function decisionInput(
  tenantId: string,
  approvalId: string,
  decision: 'approve' | 'reject',
  overrides: Record<string, unknown> = {}
) {
  return {
    tenantId,
    approvalId,
    decision,
    approverId: 'op_approver_1',
    actorType: 'Supervisor' as const,
    requestCorrelationId: createCorrelationId(),
    ...overrides
  }
}

function baseRow(
  overrides: Partial<RuntimeApprovalRow> = {}
): RuntimeApprovalRow {
  return {
    tenant_id: tenantDecision,
    approval_id: 'appr_branch_row',
    operator_id: 'op_operator_1',
    agent_id: 'agent_secretary',
    agent_version: '1.0.0',
    action: 'appointment.confirm',
    resource_type: 'appointment',
    resource_id: null,
    payload_hash: 'a'.repeat(64),
    policy_version: 'policy-v1',
    prompt_version: null,
    correlation_id: 'corr_00000000-0000-4000-8000-000000000c31',
    status: 'REQUESTED',
    single_use: true,
    requested_at: new Date('2026-09-20T10:00:00.000Z'),
    expires_at: new Date('2026-09-20T10:15:00.000Z'),
    approved_at: null,
    executed_at: null,
    rejected_at: null,
    cancelled_at: null,
    expired_at: null,
    approver_id: null,
    decision_reason: null,
    execution_count: 0,
    execution_ref: null,
    reservation_id: null,
    reservation_owner: null,
    reservation_expires_at: null,
    reservation_generation: 0,
    used_reservation_ids: [],
    reserved_at: null,
    executing_at: null,
    released_at: null,
    failed_at: null,
    uncertain_at: null,
    confirmed_at: null,
    confirmation_evidence_ref: null,
    proposal_id: null,
    proposal_hash: null,
    capability: null,
    data_classification: null,
    proposal_payload: null,
    continuation_payload: null,
    operation_key: null,
    revision: 1,
    created_at: new Date('2026-09-20T10:00:00.000Z'),
    updated_at: new Date('2026-09-20T10:00:00.000Z'),
    ...overrides
  }
}

describe('runtime approval row mapping hardening', () => {
  it('maps every optional column when the row carries the full record', () => {
    const record = mapRuntimeApprovalRow(
      baseRow({
        resource_id: 'apt_row_1',
        prompt_version: 'prompt-v1',
        status: 'EXECUTED',
        approved_at: '2026-09-20T10:01:00.000Z',
        executed_at: '2026-09-20T10:02:00.000Z',
        rejected_at: '2026-09-20T10:03:00.000Z',
        cancelled_at: '2026-09-20T10:04:00.000Z',
        expired_at: '2026-09-20T10:05:00.000Z',
        approver_id: 'op_approver_1',
        decision_reason: 'synthetic decision',
        execution_count: 2,
        execution_ref: 'exec_row_1',
        reservation_id: 'rsv_row_1',
        reservation_owner: 'op_operator_1',
        reservation_expires_at: '2026-09-20T10:06:00.000Z',
        reservation_generation: 2,
        used_reservation_ids: ['rsv_row_0', 'rsv_row_1'],
        reserved_at: '2026-09-20T10:07:00.000Z',
        executing_at: '2026-09-20T10:08:00.000Z',
        released_at: '2026-09-20T10:09:00.000Z',
        failed_at: '2026-09-20T10:10:00.000Z',
        uncertain_at: '2026-09-20T10:11:00.000Z',
        confirmed_at: '2026-09-20T10:12:00.000Z',
        confirmation_evidence_ref: 'journal:row:confirmed',
        proposal_id: 'proposal_row_1',
        proposal_hash: 'b'.repeat(64),
        capability: 'appointments.manage',
        data_classification: 'synthetic',
        proposal_payload: { fixture: true },
        continuation_payload: {
          conversationId: 'conv_row',
          sessionId: 'sess_row',
          inboundMessageId: 'msg_row',
          traceId: validTraceId
        },
        operation_key: 'op:row:1'
      })
    )

    expect(record.resource).toEqual({ type: 'appointment', id: 'apt_row_1' })
    expect(record.promptVersion).toBe('prompt-v1')
    expect(record.approvedAt).toBe('2026-09-20T10:01:00.000Z')
    expect(record.executedAt).toBe('2026-09-20T10:02:00.000Z')
    expect(record.rejectedAt).toBe('2026-09-20T10:03:00.000Z')
    expect(record.cancelledAt).toBe('2026-09-20T10:04:00.000Z')
    expect(record.expiredAt).toBe('2026-09-20T10:05:00.000Z')
    expect(record.approverId).toBe('op_approver_1')
    expect(record.decisionReason).toBe('synthetic decision')
    expect(record.executionRef).toBe('exec_row_1')
    expect(record.reservationId).toBe('rsv_row_1')
    expect(record.reservationOwner).toBe('op_operator_1')
    expect(record.reservationExpiresAt).toBe('2026-09-20T10:06:00.000Z')
    expect(record.reservationGeneration).toBe(2)
    expect(record.usedReservationIds).toEqual(['rsv_row_0', 'rsv_row_1'])
    expect(record.reservedAt).toBe('2026-09-20T10:07:00.000Z')
    expect(record.executingAt).toBe('2026-09-20T10:08:00.000Z')
    expect(record.releasedAt).toBe('2026-09-20T10:09:00.000Z')
    expect(record.failedAt).toBe('2026-09-20T10:10:00.000Z')
    expect(record.uncertainAt).toBe('2026-09-20T10:11:00.000Z')
    expect(record.confirmedAt).toBe('2026-09-20T10:12:00.000Z')
    expect(record.confirmationEvidenceRef).toBe('journal:row:confirmed')
    expect(record.proposalId).toBe('proposal_row_1')
    expect(record.proposalHash).toBe('b'.repeat(64))
    expect(record.capability).toBe('appointments.manage')
    expect(record.dataClassification).toBe('synthetic')
    expect(record.proposalPayload).toEqual({ fixture: true })
    expect(record.continuation).toEqual({
      conversationId: 'conv_row',
      sessionId: 'sess_row',
      inboundMessageId: 'msg_row',
      traceId: validTraceId
    })
    expect(record.operationKey).toBe('op:row:1')
  })

  it('omits optional keys when the row columns are null', () => {
    const record = mapRuntimeApprovalRow(baseRow())

    expect(record.resource).toEqual({ type: 'appointment' })
    expect(record.executionCount).toBe(0)
    for (const key of [
      'promptVersion',
      'approvedAt',
      'executedAt',
      'rejectedAt',
      'cancelledAt',
      'expiredAt',
      'approverId',
      'decisionReason',
      'executionRef',
      'reservationId',
      'reservationOwner',
      'reservationExpiresAt',
      'reservationGeneration',
      'usedReservationIds',
      'reservedAt',
      'executingAt',
      'releasedAt',
      'failedAt',
      'uncertainAt',
      'confirmedAt',
      'confirmationEvidenceRef',
      'proposalId',
      'proposalHash',
      'capability',
      'dataClassification',
      'proposalPayload',
      'continuation',
      'operationKey'
    ]) {
      expect(record).not.toHaveProperty(key)
    }
  })

  it('rejects a used reservation list that is not a JSON array', () => {
    expect(() =>
      mapRuntimeApprovalRow(
        baseRow({ used_reservation_ids: { not: 'an array' } })
      )
    ).toThrowError(
      expect.objectContaining({
        code: 'conflict',
        message: expect.stringContaining('not a JSON array')
      })
    )
  })

  it('rejects a used reservation list with a non-string entry', () => {
    expect(() =>
      mapRuntimeApprovalRow(baseRow({ used_reservation_ids: ['rsv_row_1', 7] }))
    ).toThrowError(
      expect.objectContaining({
        code: 'conflict',
        message: expect.stringContaining('non-string entry')
      })
    )
  })
})

describeWithPostgres('durable runtime approval branch hardening', () => {
  const suffix = `${Date.now()}_${randomBytes(3).toString('hex')}`
  const schema = `cvg_branch_${suffix}`
  let admin: Client
  let pool: Pool
  let authority: PostgresApprovalAuthority

  const createPool = (max = 4): Pool =>
    new Pool({
      connectionString: testDatabaseUrl,
      max,
      options: `-c search_path=${schema}`
    })

  beforeAll(async () => {
    if (!testDatabaseUrl) return
    admin = new Client({ connectionString: testDatabaseUrl })
    await admin.connect()
    await runPostgresMigrations(admin, { schemaName: schema })
    pool = createPool()
    authority = new PostgresApprovalAuthority(pool)
  })

  afterAll(async () => {
    if (!testDatabaseUrl) return
    await pool?.end().catch(() => undefined)
    await admin
      .query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
      .catch(() => undefined)
    await admin?.end().catch(() => undefined)
  })

  it('deduplicates an inbound continuation and rejects a divergent reuse', async () => {
    const hint = `dedup_${randomBytes(4).toString('hex')}`
    const request = {
      ...requestInput(tenantDedup, hint),
      continuation: continuationFor(hint)
    }

    const first = await authority.request(request)
    const duplicate = await authority.request(request)
    expect(duplicate.approvalId).toBe(first.approvalId)

    await expect(
      authority.request({ ...request, action: 'appointment.cancel' })
    ).rejects.toMatchObject({
      code: 'conflict',
      message: expect.stringContaining('owns this inbound continuation')
    })

    const persisted = await pool.query<{ count: number }>(
      `SELECT count(*)::int AS count
         FROM runtime_approvals
        WHERE tenant_id = $1 AND continuation_payload->>'inboundMessageId' = $2`,
      [tenantDedup, `msg_${hint}`]
    )
    expect(persisted.rows[0]?.count).toBe(1)
  })

  it('round-trips a minimal approval without optional proposal columns', async () => {
    const created = await authority.request({
      tenantId: tenantMinimal,
      operatorId: 'op_operator_1',
      agentId: 'agent_secretary',
      agentVersion: '1.0.0',
      action: 'appointment.hold',
      resource: { type: 'appointment' },
      payload: { kind: 'synthetic_minimal' },
      policyVersion: 'policy-v1',
      correlationId: createCorrelationId()
    })

    const persisted = await authority.get(tenantMinimal, created.approvalId)
    expect(persisted.resource).toEqual({ type: 'appointment' })
    for (const key of [
      'proposalId',
      'proposalHash',
      'capability',
      'dataClassification',
      'proposalPayload',
      'operationKey',
      'promptVersion',
      'continuation'
    ]) {
      expect(persisted).not.toHaveProperty(key)
    }

    const unfiltered = await authority.list(tenantMinimal)
    expect(unfiltered.map((record) => record.approvalId)).toContain(
      created.approvalId
    )
    const filtered = await authority.list(tenantMinimal, 'REQUESTED')
    expect(filtered.map((record) => record.approvalId)).toEqual([
      created.approvalId
    ])
  })

  it('decides a PENDING approval with and without a reason, idempotently', async () => {
    const hint = `pending_${randomBytes(4).toString('hex')}`
    const record = await authority.request({
      ...requestInput(tenantDecision, hint),
      continuation: continuationFor(hint)
    })
    await authority.submit(tenantDecision, record.approvalId, 'op_operator_1')

    const approved = await authority.decideAndEnqueueContinuation(
      decisionInput(tenantDecision, record.approvalId, 'approve', {
        reason: 'synthetic approval'
      })
    )
    expect(approved.approval).toMatchObject({
      status: 'APPROVED',
      decisionReason: 'synthetic approval'
    })

    const replayed = await authority.decideAndEnqueueContinuation(
      decisionInput(tenantDecision, record.approvalId, 'approve')
    )
    expect(replayed.approval.status).toBe('APPROVED')
    expect(replayed.continuationEvent.id).toBe(approved.continuationEvent.id)

    const audits = await pool.query<{ count: number }>(
      `SELECT count(*)::int AS count
         FROM audit_events
        WHERE tenant_id = $1 AND correlation_id = $2`,
      [tenantDecision, record.correlationId]
    )
    expect(audits.rows[0]?.count).toBe(1)
  })

  it('decides rejections from REQUESTED and PENDING and refuses terminal states', async () => {
    const requestedHint = `reject_requested_${randomBytes(4).toString('hex')}`
    const requested = await authority.request({
      ...requestInput(tenantDecision, requestedHint),
      continuation: continuationFor(requestedHint)
    })
    const rejectedRequested = await authority.decideAndEnqueueContinuation(
      decisionInput(tenantDecision, requested.approvalId, 'reject')
    )
    expect(rejectedRequested.approval.status).toBe('REJECTED')
    expect(rejectedRequested.approval.decisionReason).toBeUndefined()

    const replayedRejection = await authority.decideAndEnqueueContinuation(
      decisionInput(tenantDecision, requested.approvalId, 'reject')
    )
    expect(replayedRejection.approval.status).toBe('REJECTED')
    expect(replayedRejection.continuationEvent.id).toBe(
      rejectedRequested.continuationEvent.id
    )

    await expect(
      authority.decideAndEnqueueContinuation(
        decisionInput(tenantDecision, requested.approvalId, 'approve')
      )
    ).rejects.toMatchObject({ code: 'conflict' })

    const pendingHint = `reject_pending_${randomBytes(4).toString('hex')}`
    const pending = await authority.request({
      ...requestInput(tenantDecision, pendingHint),
      continuation: continuationFor(pendingHint)
    })
    await authority.submit(tenantDecision, pending.approvalId, 'op_operator_1')
    const rejectedPending = await authority.decideAndEnqueueContinuation(
      decisionInput(tenantDecision, pending.approvalId, 'reject', {
        reason: 'synthetic rejection'
      })
    )
    expect(rejectedPending.approval).toMatchObject({
      status: 'REJECTED',
      decisionReason: 'synthetic rejection'
    })

    const approved = await createApproved(
      authority,
      tenantDecision,
      `approved_conflict_${randomBytes(4).toString('hex')}`
    )
    await expect(
      authority.decideAndEnqueueContinuation(
        decisionInput(tenantDecision, approved.approvalId, 'reject')
      )
    ).rejects.toMatchObject({ code: 'conflict' })
  })

  it('decides every REQUESTED and PENDING reason variant', async () => {
    const approveRequestedHint = `approve_requested_${randomBytes(4).toString('hex')}`
    const approveRequested = await authority.request({
      ...requestInput(tenantDecision, approveRequestedHint),
      continuation: continuationFor(approveRequestedHint)
    })
    const approvedFromRequested = await authority.decideAndEnqueueContinuation(
      decisionInput(tenantDecision, approveRequested.approvalId, 'approve', {
        reason: 'synthetic requested approval'
      })
    )
    expect(approvedFromRequested.approval).toMatchObject({
      status: 'APPROVED',
      decisionReason: 'synthetic requested approval'
    })

    const approvePendingHint = `approve_pending_${randomBytes(4).toString('hex')}`
    const approvePending = await authority.request({
      ...requestInput(tenantDecision, approvePendingHint),
      continuation: continuationFor(approvePendingHint)
    })
    await authority.submit(
      tenantDecision,
      approvePending.approvalId,
      'op_operator_1'
    )
    const approvedFromPending = await authority.decideAndEnqueueContinuation(
      decisionInput(tenantDecision, approvePending.approvalId, 'approve')
    )
    expect(approvedFromPending.approval.status).toBe('APPROVED')
    expect(approvedFromPending.approval.decisionReason).toBeUndefined()

    const rejectRequestedHint = `reject_requested_reason_${randomBytes(4).toString('hex')}`
    const rejectRequested = await authority.request({
      ...requestInput(tenantDecision, rejectRequestedHint),
      continuation: continuationFor(rejectRequestedHint)
    })
    const rejectedFromRequested = await authority.decideAndEnqueueContinuation(
      decisionInput(tenantDecision, rejectRequested.approvalId, 'reject', {
        reason: 'synthetic requested rejection'
      })
    )
    expect(rejectedFromRequested.approval).toMatchObject({
      status: 'REJECTED',
      decisionReason: 'synthetic requested rejection'
    })

    const rejectPendingHint = `reject_pending_no_reason_${randomBytes(4).toString('hex')}`
    const rejectPending = await authority.request({
      ...requestInput(tenantDecision, rejectPendingHint),
      continuation: continuationFor(rejectPendingHint)
    })
    await authority.submit(
      tenantDecision,
      rejectPending.approvalId,
      'op_operator_1'
    )
    const rejectedFromPending = await authority.decideAndEnqueueContinuation(
      decisionInput(tenantDecision, rejectPending.approvalId, 'reject')
    )
    expect(rejectedFromPending.approval.status).toBe('REJECTED')
    expect(rejectedFromPending.approval.decisionReason).toBeUndefined()
  })

  it('persists an explicit operator rejection and cancellation', async () => {
    const rejectionHint = `operator_reject_${randomBytes(4).toString('hex')}`
    const rejection = await authority.request(
      requestInput(tenantDecision, rejectionHint)
    )
    await authority.submit(
      tenantDecision,
      rejection.approvalId,
      'op_operator_1'
    )
    await authority.reject(tenantDecision, rejection.approvalId, {
      approverId: 'op_approver_1',
      reason: 'synthetic operator rejection'
    })
    const persistedRejection = await authority.get(
      tenantDecision,
      rejection.approvalId
    )
    expect(persistedRejection).toMatchObject({
      status: 'REJECTED',
      approverId: 'op_approver_1',
      decisionReason: 'synthetic operator rejection'
    })
    expect(persistedRejection.rejectedAt).toBeDefined()

    const cancellationHint = `cancel_${randomBytes(4).toString('hex')}`
    const cancellation = await authority.request(
      requestInput(tenantCancel, cancellationHint)
    )
    const cancelled = await authority.cancel(
      tenantCancel,
      cancellation.approvalId,
      'op_operator_1'
    )
    expect(cancelled.status).toBe('CANCELLED')
    expect(cancelled.cancelledAt).toBeDefined()
    const persistedCancellation = await authority.get(
      tenantCancel,
      cancellation.approvalId
    )
    expect(persistedCancellation.status).toBe('CANCELLED')
  })

  it('refuses to resume a continuation without a durable trace root', async () => {
    const hint = `no_trace_${randomBytes(4).toString('hex')}`
    const record = await authority.request({
      ...requestInput(tenantDecision, hint),
      continuation: {
        conversationId: `conv_${hint}`,
        sessionId: `sess_${hint}`,
        inboundMessageId: `msg_${hint}`
      }
    })

    await expect(
      authority.decideAndEnqueueContinuation(
        decisionInput(tenantDecision, record.approvalId, 'approve')
      )
    ).rejects.toMatchObject({
      code: 'invalid_action',
      message: expect.stringContaining('durable trace root')
    })

    const persisted = await authority.get(tenantDecision, record.approvalId)
    expect(persisted.status).toBe('REQUESTED')
  })

  it('consumes an approved single-use approval and persists the execution', async () => {
    const hint = `verify_${randomBytes(4).toString('hex')}`
    const record = await createApproved(authority, tenantVerify, hint)

    const consumption = await authority.verifyAndConsume({
      tenantId: tenantVerify,
      approvalId: record.approvalId,
      action: 'appointment.confirm',
      resource: { type: 'appointment', id: `apt_${hint}` },
      payload: syntheticPayload(hint),
      executionRef: `exec_${hint}`
    })
    expect(consumption).toMatchObject({
      approvalId: record.approvalId,
      action: 'appointment.confirm',
      executionRef: `exec_${hint}`
    })

    const persisted = await authority.get(tenantVerify, record.approvalId)
    expect(persisted).toMatchObject({
      status: 'EXECUTED',
      executionCount: 1,
      executionRef: `exec_${hint}`
    })
    expect(persisted.executedAt).toBeDefined()
  })

  it('marks a reserved approval uncertain with an explicit reason', async () => {
    const hint = `uncertain_${randomBytes(4).toString('hex')}`
    const record = await createApproved(authority, tenantFail, hint)
    const reservation = await authority.reserve(
      reserveInput(tenantFail, hint, record.approvalId, `rsv_${hint}`)
    )

    const uncertain = await authority.markUncertain({
      tenantId: tenantFail,
      approvalId: record.approvalId,
      reservationId: reservation.reservationId,
      reason: 'synthetic uncertainty'
    })
    expect(uncertain).toMatchObject({
      status: 'UNCERTAIN',
      decisionReason: 'synthetic uncertainty'
    })
    expect(uncertain.uncertainAt).toBeDefined()

    const persisted = await authority.get(tenantFail, record.approvalId)
    expect(persisted.status).toBe('UNCERTAIN')
  })

  it('fails a reserved approval with explicit no-effect evidence', async () => {
    const hint = `fail_${randomBytes(4).toString('hex')}`
    const record = await createApproved(authority, tenantFail, hint)
    const reservation = await authority.reserve(
      reserveInput(tenantFail, hint, record.approvalId, `rsv_${hint}`)
    )

    const failed = await authority.fail({
      tenantId: tenantFail,
      approvalId: record.approvalId,
      reservationId: reservation.reservationId,
      evidence: {
        outcome: 'no_effect',
        source: 'adapter',
        evidenceRef: `probe:${hint}:absent`
      }
    })
    expect(failed).toMatchObject({
      status: 'FAILED',
      confirmationEvidenceRef: `probe:${hint}:absent`
    })
    expect(failed.failedAt).toBeDefined()

    const persisted = await authority.get(tenantFail, record.approvalId)
    expect(persisted.status).toBe('FAILED')
  })

  it('reports not-found for missing approvals and lookups', async () => {
    const missingId = `appr_missing_${randomBytes(4).toString('hex')}`
    await expect(authority.get(tenantLookup, missingId)).rejects.toBeInstanceOf(
      ApprovalError
    )
    await expect(authority.get(tenantLookup, missingId)).rejects.toMatchObject({
      code: 'not_found'
    })
    await expect(
      authority.submit(tenantLookup, missingId, 'op_operator_1')
    ).rejects.toMatchObject({ code: 'not_found' })
    await expect(
      authority.decideAndEnqueueContinuation(
        decisionInput(tenantLookup, missingId, 'approve')
      )
    ).rejects.toMatchObject({ code: 'not_found' })
  })

  it('finds a continuation by inbound message and returns undefined otherwise', async () => {
    const hint = `lookup_${randomBytes(4).toString('hex')}`
    const record = await authority.request({
      ...requestInput(tenantLookup, hint),
      continuation: continuationFor(hint)
    })

    const found = await authority.findByContinuation(
      tenantLookup,
      `msg_${hint}`
    )
    expect(found?.approvalId).toBe(record.approvalId)

    const missing = await authority.findByContinuation(
      tenantLookup,
      `msg_absent_${hint}`
    )
    expect(missing).toBeUndefined()
  })

  it('sweeps expired reservations with the repository clock', async () => {
    let now = new Date('2026-09-20T12:00:00.000Z')
    const clocked = new PostgresApprovalAuthority(pool, {
      engine: { clock: () => now }
    })
    const hint = `sweep_${randomBytes(4).toString('hex')}`
    const record = await clocked.request(requestInput(tenantSweep, hint))
    await clocked.submit(tenantSweep, record.approvalId, 'op_operator_1')
    await clocked.approve(tenantSweep, record.approvalId, {
      approverId: 'op_approver_1'
    })
    await clocked.reserve({
      ...reserveInput(tenantSweep, hint, record.approvalId, `rsv_${hint}`),
      ttlMs: 1_000
    })

    now = new Date(now.getTime() + 60_000)
    const sweep = await clocked.releaseExpired({
      tenantId: tenantSweep,
      evidenceFor: () => ({
        outcome: 'no_effect',
        source: 'journal',
        evidenceRef: `journal:${hint}:absent`
      })
    })
    expect(sweep).toEqual({ released: 1, uncertain: 0 })
    await expect(
      clocked.get(tenantSweep, record.approvalId)
    ).resolves.toMatchObject({ status: 'APPROVED' })
  })

  it('expires stale requests for one tenant through the set-based update', async () => {
    let now = new Date('2026-09-20T13:00:00.000Z')
    const clocked = new PostgresApprovalAuthority(pool, {
      engine: { clock: () => now }
    })
    const hint = `stale_${randomBytes(4).toString('hex')}`
    const record = await clocked.request({
      ...requestInput(tenantStale, hint),
      expiresInMs: 1_000
    })

    now = new Date(now.getTime() + 60_000)
    const expired = await clocked.expireStaleForTenant(tenantStale)
    expect(expired).toBe(1)

    const persisted = await authority.get(tenantStale, record.approvalId)
    expect(persisted.status).toBe('EXPIRED')
    expect(persisted.expiredAt).toBe(now.toISOString())
  })

  it('rejects the cross-tenant expireStale sweep', async () => {
    await expect(authority.expireStale()).rejects.toMatchObject({
      code: 'invalid_action'
    })
    await expect(authority.expireStale()).rejects.toBeInstanceOf(DomainError)
  })
})
