import { describe, expect, it } from 'vitest'
import { DomainError } from '@cvg/shared'
import {
  mapRuntimeApprovalRow,
  PostgresApprovalAuthority,
  type RuntimeApprovalRow
} from '../runtime-approval-store.ts'
import {
  DEFAULT_RETENTION_BATCH_SIZE,
  DEFAULT_RETENTION_LOCK_TIMEOUT_MS,
  DEFAULT_RETENTION_MAX_BATCHES,
  DEFAULT_RETENTION_STATEMENT_TIMEOUT_MS,
  DEFAULT_RETENTION_TTL_DAYS,
  INBOUND_TOMBSTONE_HORIZON_DAYS,
  INBOUND_TOMBSTONE_POLICY_APPROVED_AT,
  INBOUND_TOMBSTONE_POLICY_VALID_UNTIL,
  INBOUND_TOMBSTONE_POLICY_VERSION,
  MAX_RETENTION_BATCH_SIZE,
  MAX_RETENTION_MAX_BATCHES,
  MAX_RETENTION_TIMEOUT_MS,
  RETENTION_REDACTED_JSON,
  RETENTION_REDACTED_TEXT,
  RETENTION_TARGETS,
  RETENTION_WINDOW_START,
  assertInboundTombstonePolicyEffective,
  computeInboundTombstoneDigest,
  computeRetentionBatchHash,
  executeRetentionSweep,
  resolveRetentionSweepPlan,
  retentionTargetById,
  type RetentionEligibility,
  type RetentionHold,
  type RetentionLedgerEntry,
  type RetentionPolicyDeclaration,
  type RetentionSweepStore
} from '../retention.ts'

const TENANT_A = 'tenant_00000000-0000-4000-8000-0000000000c1'
const TENANT_B = 'tenant_00000000-0000-4000-8000-0000000000c2'
const NOW = new Date('2026-09-19T12:00:00.000Z')
const TRACE_ID = '0123456789abcdef0123456789abcdef'

function baseApprovalRow(
  overrides: Partial<RuntimeApprovalRow> = {}
): RuntimeApprovalRow {
  return {
    tenant_id: TENANT_A,
    approval_id: 'appr_coverage_20260925',
    operator_id: 'op_operator_1',
    agent_id: 'agent_secretary',
    agent_version: '1.0.0',
    action: 'appointment.confirm',
    resource_type: 'appointment',
    resource_id: null,
    payload_hash: 'a'.repeat(64),
    policy_version: 'policy-v1',
    prompt_version: null,
    correlation_id: 'corr_00000000-0000-4000-8000-0000000000c1',
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

function effectJournalPolicy(
  overrides: Partial<RetentionPolicyDeclaration> = {}
): RetentionPolicyDeclaration {
  return {
    targetId: 'effect_journal',
    policyId: 'POL-COVERAGE-20260925',
    approvalRef: 'synthetic-coverage-approval-ref',
    approvedBy: 'fixture.operator',
    approvedAt: '2026-09-13T17:00:13.688Z',
    eligibleStates: ['CONFIRMED'],
    ...overrides
  }
}

function inboundPolicy(
  overrides: Partial<RetentionPolicyDeclaration> = {}
): RetentionPolicyDeclaration {
  return {
    targetId: 'inbound_idempotency',
    policyId: 'POL-COVERAGE-INBOUND',
    approvalRef: 'synthetic-coverage-approval-ref',
    approvedBy: 'fixture.operator',
    approvedAt: '2026-09-13T17:00:13.688Z',
    ...overrides
  }
}

function approvedHold(overrides: Partial<RetentionHold> = {}): RetentionHold {
  return {
    id: 'hold_coverage_1',
    tenantId: TENANT_A,
    targetId: 'effect_journal',
    recordId: null,
    reason: 'synthetic coverage hold',
    authorizationRef: 'fixture-hold-20260925',
    approvedBy: 'fixture.operator',
    approvedAt: new Date('2026-09-01T00:00:00.000Z'),
    releasedAt: null,
    ...overrides
  }
}

interface FakeRow {
  id: string
  tenantId: string
  time: Date
  state: string | null
  fields: Record<string, unknown>
}

class FakeSweepStore implements RetentionSweepStore {
  private readonly rowsByTarget = new Map<string, FakeRow[]>()
  holds: RetentionHold[] = []
  readonly ledger: RetentionLedgerEntry[] = []

  seed(targetId: string, row: FakeRow): void {
    const rows = this.rowsByTarget.get(targetId) ?? []
    rows.push(row)
    this.rowsByTarget.set(targetId, rows)
  }

  rows(targetId: string): FakeRow[] {
    return this.rowsByTarget.get(targetId) ?? []
  }

  async listActiveHolds(
    tenantId: string,
    targetId: string
  ): Promise<RetentionHold[]> {
    return this.holds.filter(
      (hold) =>
        hold.tenantId === tenantId &&
        hold.targetId === targetId &&
        hold.releasedAt === null
    )
  }

  private eligible(eligibility: RetentionEligibility): FakeRow[] {
    return this.rows(eligibility.target.id).filter(
      (row) =>
        row.tenantId === eligibility.tenantId &&
        row.time.getTime() < eligibility.cutoff.getTime() &&
        (row.state === null ||
          eligibility.eligibleStates.length === 0 ||
          eligibility.eligibleStates.includes(row.state))
    )
  }

  private unheld(
    eligibility: RetentionEligibility,
    rows: FakeRow[]
  ): FakeRow[] {
    const tenantWide = eligibility.holds.some(
      (hold) => hold.recordId === null
    )
    const heldIds = new Set(
      eligibility.holds
        .map((hold) => hold.recordId)
        .filter((id): id is string => id !== null)
    )
    return rows.filter((row) => !tenantWide && !heldIds.has(row.id))
  }

  async countHeld(eligibility: RetentionEligibility): Promise<number> {
    const rows = this.eligible(eligibility)
    if (eligibility.holds.some((hold) => hold.recordId === null)) {
      return rows.length
    }
    const heldIds = new Set(
      eligibility.holds
        .map((hold) => hold.recordId)
        .filter((id): id is string => id !== null)
    )
    return rows.filter((row) => heldIds.has(row.id)).length
  }

  async selectEligible(
    eligibility: RetentionEligibility,
    mutation: 'delete' | 'tombstone' | 'redact',
    limit: number
  ): Promise<{ ids: string[]; hasMore: boolean }> {
    const eligible = this.unheld(eligibility, this.eligible(eligibility))
      .filter(
        (row) =>
          mutation !== 'tombstone' || row.fields.tombstone_digest === undefined
      )
      .sort((left, right) => left.id.localeCompare(right.id))
    return {
      ids: eligible.slice(0, limit).map((row) => row.id),
      hasMore: eligible.length > limit
    }
  }

  async deleteEligible(
    eligibility: RetentionEligibility,
    recordIds: readonly string[]
  ): Promise<number> {
    const eligibleIds = new Set(
      this.eligible(eligibility).map((row) => row.id)
    )
    const tenantWide = eligibility.holds.some(
      (hold) => hold.recordId === null
    )
    const heldIds = new Set(
      eligibility.holds
        .map((hold) => hold.recordId)
        .filter((id): id is string => id !== null)
    )
    let deleted = 0
    const remaining = this.rows(eligibility.target.id).filter((row) => {
      if (!recordIds.includes(row.id) || !eligibleIds.has(row.id)) return true
      if (tenantWide || heldIds.has(row.id)) return true
      deleted += 1
      return false
    })
    this.rowsByTarget.set(eligibility.target.id, remaining)
    return deleted
  }

  async tombstoneEligible(
    eligibility: RetentionEligibility,
    recordIds: readonly string[]
  ): Promise<number> {
    let tombstoned = 0
    for (const row of this.eligible(eligibility)) {
      if (!recordIds.includes(row.id)) continue
      if (row.fields.tombstone_digest !== undefined) continue
      row.fields.tombstone_digest = computeInboundTombstoneDigest(
        eligibility.tenantId,
        row.id
      )
      row.fields.tombstoned_at = eligibility.executedAt
      tombstoned += 1
    }
    return tombstoned
  }

  async redactEligible(
    eligibility: RetentionEligibility,
    recordIds: readonly string[]
  ): Promise<number> {
    const tenantWide = eligibility.holds.some(
      (hold) => hold.recordId === null
    )
    const heldIds = new Set(
      eligibility.holds
        .map((hold) => hold.recordId)
        .filter((id): id is string => id !== null)
    )
    let redacted = 0
    for (const row of this.eligible(eligibility)) {
      if (!recordIds.includes(row.id)) continue
      if (tenantWide || heldIds.has(row.id)) continue
      redacted += 1
    }
    return redacted
  }

  async appendLedgerEntry(entry: RetentionLedgerEntry): Promise<void> {
    this.ledger.push(structuredClone(entry))
  }
}

describe('runtime approval row mapping without database', () => {
  it('maps a minimal row with Date instances and omits absent optionals', () => {
    const record = mapRuntimeApprovalRow(baseApprovalRow())

    expect(record.approvalId).toBe('appr_coverage_20260925')
    expect(record.tenantId).toBe(TENANT_A)
    expect(record.resource).toEqual({ type: 'appointment' })
    expect(record.requestedAt).toBe('2026-09-20T10:00:00.000Z')
    expect(record.expiresAt).toBe('2026-09-20T10:15:00.000Z')
    expect(record.status).toBe('REQUESTED')
    expect(record).not.toHaveProperty('reservationGeneration')
    expect(record).not.toHaveProperty('usedReservationIds')
    expect(record).not.toHaveProperty('continuation')
  })

  it('normalizes string dates and a string revision generation', () => {
    const record = mapRuntimeApprovalRow(
      baseApprovalRow({
        requested_at: '2026-09-20T10:00:00.000Z',
        expires_at: '2026-09-20T10:15:00.000Z',
        approved_at: '2026-09-20T10:01:00.000Z',
        reservation_generation: '3',
        used_reservation_ids: ['rsv_a'],
        resource_id: 'apt_1',
        prompt_version: 'prompt-v9',
        operation_key: 'op:coverage:1'
      })
    )

    expect(record.approvedAt).toBe('2026-09-20T10:01:00.000Z')
    expect(record.reservationGeneration).toBe(3)
    expect(record.usedReservationIds).toEqual(['rsv_a'])
    expect(record.resource).toEqual({ type: 'appointment', id: 'apt_1' })
    expect(record.promptVersion).toBe('prompt-v9')
    expect(record.operationKey).toBe('op:coverage:1')
  })

  it('omits generation zero regardless of numeric or string encoding', () => {
    expect(
      mapRuntimeApprovalRow(baseApprovalRow({ reservation_generation: 0 }))
    ).not.toHaveProperty('reservationGeneration')
    expect(
      mapRuntimeApprovalRow(baseApprovalRow({ reservation_generation: '0' }))
    ).not.toHaveProperty('reservationGeneration')
  })

  it('maps proposal and continuation payloads when present', () => {
    const record = mapRuntimeApprovalRow(
      baseApprovalRow({
        proposal_id: 'proposal_coverage',
        proposal_hash: 'b'.repeat(64),
        capability: 'appointments.manage',
        data_classification: 'synthetic',
        proposal_payload: { marker: 'synthetic' },
        continuation_payload: {
          conversationId: 'conv_coverage',
          sessionId: 'sess_coverage',
          inboundMessageId: 'msg_coverage',
          traceId: TRACE_ID
        }
      })
    )

    expect(record.proposalId).toBe('proposal_coverage')
    expect(record.proposalPayload).toEqual({ marker: 'synthetic' })
    expect(record.continuation).toEqual({
      conversationId: 'conv_coverage',
      sessionId: 'sess_coverage',
      inboundMessageId: 'msg_coverage',
      traceId: TRACE_ID
    })
  })

  it('fails closed on a non-array reservation list', () => {
    expect(() =>
      mapRuntimeApprovalRow(baseApprovalRow({ used_reservation_ids: null }))
    ).toThrowError(
      expect.objectContaining({
        code: 'conflict',
        message: expect.stringContaining('not a JSON array')
      })
    )
    expect(() =>
      mapRuntimeApprovalRow(
        baseApprovalRow({ used_reservation_ids: 'rsv_a' as never })
      )
    ).toThrowError(expect.objectContaining({ code: 'conflict' }))
  })

  it('fails closed on a non-string reservation entry', () => {
    expect(() =>
      mapRuntimeApprovalRow(
        baseApprovalRow({ used_reservation_ids: ['ok', 42] as never })
      )
    ).toThrowError(
      expect.objectContaining({
        code: 'conflict',
        message: expect.stringContaining('non-string entry')
      })
    )
  })

  it('fails closed on an unknown status value', () => {
    expect(() =>
      mapRuntimeApprovalRow(baseApprovalRow({ status: 'BOGUS' }))
    ).toThrow()
  })

  it('fails closed on an invalid continuation payload', () => {
    expect(() =>
      mapRuntimeApprovalRow(
        baseApprovalRow({
          continuation_payload: { conversationId: 42 }
        })
      )
    ).toThrow()
  })
})

describe('postgres approval authority without database', () => {
  it('constructs without opening a connection and rejects cross-tenant sweep', async () => {
    const pool = {
      connect: () => {
        throw new Error('connection must not open without database')
      }
    }
    const authority = new PostgresApprovalAuthority(pool as never)

    await expect(authority.expireStale()).rejects.toMatchObject({
      code: 'invalid_action'
    })
    await expect(authority.expireStale()).rejects.toBeInstanceOf(DomainError)
    await expect(authority.expireStale()).rejects.toThrow(
      /Sweep each tenant with releaseExpired/
    )
  })

  it('accepts an explicit repository clock without touching the pool', () => {
    const pool = {
      connect: () => {
        throw new Error('connection must not open without database')
      }
    }
    const clock = () => new Date('2026-09-20T12:00:00.000Z')
    const authority = new PostgresApprovalAuthority(pool as never, { clock })

    expect(authority).toBeInstanceOf(PostgresApprovalAuthority)
  })
})

describe('retention catalog without database', () => {
  it('exposes a closed frozen catalog of five targets', () => {
    expect(RETENTION_TARGETS).toHaveLength(5)
    expect(RETENTION_TARGETS.map((target) => target.id)).toEqual([
      'effect_journal',
      'inbound_idempotency',
      'runtime_approvals',
      'orchestrator_goals',
      'outbox_events'
    ])
    expect(Object.isFrozen(RETENTION_TARGETS)).toBe(true)
    expect(Object.isFrozen(RETENTION_REDACTED_JSON)).toBe(true)
    expect(RETENTION_REDACTED_TEXT).toBe('[redacted:retention]')
  })

  it('resolves known targets and returns undefined for unknown ids', () => {
    expect(retentionTargetById('effect_journal')?.table).toBe('effect_journal')
    expect(retentionTargetById('inbound_idempotency')?.retentionMode).toBe(
      'tombstone'
    )
    expect(retentionTargetById('no_such_target')).toBeUndefined()
  })

  it('publishes bounded operational defaults', () => {
    expect(DEFAULT_RETENTION_TTL_DAYS).toBe(30)
    expect(RETENTION_WINDOW_START.toISOString()).toBe(
      '1970-01-01T00:00:00.000Z'
    )
    expect(DEFAULT_RETENTION_BATCH_SIZE).toBe(100)
    expect(MAX_RETENTION_BATCH_SIZE).toBe(1000)
    expect(DEFAULT_RETENTION_MAX_BATCHES).toBe(100)
    expect(MAX_RETENTION_MAX_BATCHES).toBe(1000)
    expect(DEFAULT_RETENTION_LOCK_TIMEOUT_MS).toBe(5_000)
    expect(DEFAULT_RETENTION_STATEMENT_TIMEOUT_MS).toBe(30_000)
    expect(MAX_RETENTION_TIMEOUT_MS).toBe(300_000)
    expect(INBOUND_TOMBSTONE_HORIZON_DAYS).toBe(30)
    expect(INBOUND_TOMBSTONE_POLICY_VERSION).toBe('AUD20-16-LIFECYCLE-v1')
  })
})

describe('retention digests without database', () => {
  it('computes a deterministic tenant-bound tombstone digest', () => {
    const first = computeInboundTombstoneDigest(TENANT_A, 'key_1')
    const second = computeInboundTombstoneDigest(TENANT_A, 'key_1')

    expect(first).toMatch(/^[0-9a-f]{64}$/)
    expect(second).toBe(first)
    expect(computeInboundTombstoneDigest(TENANT_B, 'key_1')).not.toBe(first)
    expect(computeInboundTombstoneDigest(TENANT_A, 'key_2')).not.toBe(first)
    expect(first).not.toContain('key_1')
  })

  it('computes an order-independent metadata-only batch hash', () => {
    const input = {
      tenantId: TENANT_A,
      targetId: 'effect_journal',
      action: 'delete' as const,
      policyId: 'POL-COVERAGE',
      windowStart: RETENTION_WINDOW_START,
      windowEnd: new Date('2026-08-20T12:00:00.000Z'),
      holds: [approvedHold({ recordId: 'b' }), approvedHold({ recordId: 'a' })]
    }
    const first = computeRetentionBatchHash(input)
    const reordered = computeRetentionBatchHash({
      ...input,
      holds: [...input.holds].reverse()
    })

    expect(first).toMatch(/^[0-9a-f]{64}$/)
    expect(reordered).toBe(first)
    expect(
      computeRetentionBatchHash({ ...input, deletedCount: 1 })
    ).not.toBe(first)
    expect(
      computeRetentionBatchHash({ ...input, holds: [] })
    ).not.toBe(first)
  })
})

describe('tombstone policy gate without database', () => {
  it('accepts a clock inside the approved validity window', () => {
    expect(() =>
      assertInboundTombstonePolicyEffective(
        new Date('2026-10-01T00:00:00.000Z')
      )
    ).not.toThrow()
  })

  it('rejects an expired approval window', () => {
    expect(() =>
      assertInboundTombstonePolicyEffective(
        new Date(INBOUND_TOMBSTONE_POLICY_VALID_UNTIL)
      )
    ).not.toThrow()
    expect(() =>
      assertInboundTombstonePolicyEffective(new Date('2027-02-01T00:00:00.000Z'))
    ).toThrow(/expired/)
  })

  it('rejects a clock before the approval is effective', () => {
    expect(() =>
      assertInboundTombstonePolicyEffective(
        new Date(INBOUND_TOMBSTONE_POLICY_APPROVED_AT)
      )
    ).not.toThrow()
    expect(() =>
      assertInboundTombstonePolicyEffective(new Date('2026-01-01T00:00:00.000Z'))
    ).toThrow(/not effective/)
  })

  it('rejects an invalid clock value', () => {
    expect(() =>
      assertInboundTombstonePolicyEffective(new Date('not-a-date'))
    ).toThrow(/invalid/)
  })
})

describe('retention plan validation without database', () => {
  it('keeps every target pending when no policy is configured', () => {
    const plan = resolveRetentionSweepPlan(
      { tenantId: TENANT_A, executedBy: 'fixture.operator', policies: [] },
      NOW
    )

    expect(plan.approved).toEqual([])
    expect(plan.pending).toHaveLength(RETENTION_TARGETS.length)
    expect(
      plan.pending.every((item) => item.reason === 'no_policy_configured')
    ).toBe(true)
  })

  it('approves a stateless tombstone target without eligible states', () => {
    const plan = resolveRetentionSweepPlan(
      {
        tenantId: TENANT_A,
        executedBy: 'fixture.operator',
        policies: [inboundPolicy()]
      },
      NOW
    )

    expect(plan.approved).toHaveLength(1)
    expect(plan.approved[0]).toMatchObject({
      action: 'delete',
      ttlDays: DEFAULT_RETENTION_TTL_DAYS
    })
    expect(plan.approved[0]?.eligibleStates).toEqual([])
    expect(plan.approved[0]?.cutoff.toISOString()).toBe(
      '2026-08-20T12:00:00.000Z'
    )
  })

  it('fails closed on duplicate declarations', () => {
    const plan = resolveRetentionSweepPlan(
      {
        tenantId: TENANT_A,
        executedBy: 'fixture.operator',
        policies: [effectJournalPolicy(), effectJournalPolicy()]
      },
      NOW
    )

    expect(plan.approved).toEqual([])
    expect(plan.pending).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reason: 'duplicate_policy' })
      ])
    )
  })

  it.each([
    ['unknown_target', effectJournalPolicy({ targetId: 'messages' })],
    ['missing_approval', effectJournalPolicy({ policyId: '  ' })],
    ['missing_approval', effectJournalPolicy({ approvalRef: '' })],
    ['missing_approval', effectJournalPolicy({ approvedBy: '' })],
    ['missing_approval', effectJournalPolicy({ approvedAt: 'bad-date' })],
    [
      'approval_not_effective',
      effectJournalPolicy({ approvedAt: '2027-01-01T00:00:00.000Z' })
    ],
    ['invalid_ttl', effectJournalPolicy({ ttlDays: 0 })],
    ['invalid_ttl', effectJournalPolicy({ ttlDays: 2.5 })],
    ['ttl_exceeds_classification_limit', effectJournalPolicy({ ttlDays: 366 })],
    ['unsupported_action', effectJournalPolicy({ action: 'redact' })],
    ['missing_eligible_states', effectJournalPolicy({ eligibleStates: [] })],
    [
      'unapproved_state',
      effectJournalPolicy({ eligibleStates: ['CONFIRMED', 'PLANNING'] })
    ],
    [
      'protected_state',
      effectJournalPolicy({ eligibleStates: ['CONFIRMED', 'UNCERTAIN'] })
    ]
  ])('keeps %s pending instead of acting', (reason, policy) => {
    const plan = resolveRetentionSweepPlan(
      { tenantId: TENANT_A, executedBy: 'fixture.operator', policies: [policy] },
      NOW
    )

    expect(plan.approved).toEqual([])
    expect(plan.pending).toEqual(
      expect.arrayContaining([expect.objectContaining({ reason })])
    )
  })

  it('enforces the confidential classification ceiling', () => {
    const plan = resolveRetentionSweepPlan(
      {
        tenantId: TENANT_A,
        executedBy: 'fixture.operator',
        policies: [
          {
            targetId: 'runtime_approvals',
            policyId: 'POL-CONF',
            approvalRef: 'ref',
            approvedBy: 'fixture.operator',
            approvedAt: '2026-09-13T17:00:13.688Z',
            action: 'redact',
            ttlDays: 181,
            eligibleStates: ['EXECUTED']
          }
        ]
      },
      NOW
    )

    expect(plan.approved).toEqual([])
    expect(plan.pending).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reason: 'ttl_exceeds_classification_limit'
        })
      ])
    )
  })

  it('rejects invalid executor labels and tenant ids before planning', () => {
    for (const executedBy of ['', '   ', 'x'.repeat(201), 'bad\x01label']) {
      expect(() =>
        resolveRetentionSweepPlan(
          {
            tenantId: TENANT_A,
            executedBy,
            policies: [effectJournalPolicy()]
          },
          NOW
        )
      ).toThrow(/executedBy/)
    }
    expect(() =>
      resolveRetentionSweepPlan(
        {
          tenantId: 'not-a-tenant',
          executedBy: 'fixture.operator',
          policies: [effectJournalPolicy()]
        },
        NOW
      )
    ).toThrow()
  })
})

describe('retention sweep execution without database', () => {
  it('deletes only eligible rows and stays tenant scoped', async () => {
    const store = new FakeSweepStore()
    store.seed('effect_journal', {
      id: 'op_old',
      tenantId: TENANT_A,
      time: new Date('2026-07-01T12:00:00.000Z'),
      state: 'CONFIRMED',
      fields: {}
    })
    store.seed('effect_journal', {
      id: 'op_other_tenant',
      tenantId: TENANT_B,
      time: new Date('2026-07-01T12:00:00.000Z'),
      state: 'CONFIRMED',
      fields: {}
    })

    const report = await executeRetentionSweep(store, {
      tenantId: TENANT_A,
      executedBy: 'fixture.operator',
      clock: () => NOW,
      policies: [effectJournalPolicy()]
    })
    const outcome = report.outcomes.find(
      (item) => item.targetId === 'effect_journal'
    )!

    expect(outcome).toMatchObject({
      status: 'EXECUTED',
      action: 'delete',
      deletedCount: 1,
      policyId: 'POL-COVERAGE-20260925'
    })
    expect(store.rows('effect_journal').map((row) => row.id)).toEqual([
      'op_other_tenant'
    ])
    expect(report.complete).toBe(true)
  })

  it('tombstones inbound idempotency rows instead of deleting them', async () => {
    const store = new FakeSweepStore()
    store.seed('inbound_idempotency', {
      id: 'key_old',
      tenantId: TENANT_A,
      time: new Date('2026-07-01T12:00:00.000Z'),
      state: null,
      fields: {}
    })

    const report = await executeRetentionSweep(store, {
      tenantId: TENANT_A,
      executedBy: 'fixture.operator',
      clock: () => NOW,
      policies: [inboundPolicy()]
    })
    const outcome = report.outcomes.find(
      (item) => item.targetId === 'inbound_idempotency'
    )!

    expect(outcome).toMatchObject({
      status: 'EXECUTED',
      tombstonedCount: 1,
      deletedCount: 0
    })
    expect(
      store.rows('inbound_idempotency')[0]?.fields.tombstone_digest
    ).toMatch(/^[0-9a-f]{64}$/)
  })

  it('fails closed to SKIPPED_INVALID_HOLD when a hold lacks approval metadata', async () => {
    const store = new FakeSweepStore()
    store.seed('effect_journal', {
      id: 'op_old',
      tenantId: TENANT_A,
      time: new Date('2026-07-01T12:00:00.000Z'),
      state: 'CONFIRMED',
      fields: {}
    })
    store.holds = [approvedHold({ approvedBy: '' })]

    const report = await executeRetentionSweep(store, {
      tenantId: TENANT_A,
      executedBy: 'fixture.operator',
      clock: () => NOW,
      policies: [effectJournalPolicy()]
    })
    const outcome = report.outcomes.find(
      (item) => item.targetId === 'effect_journal'
    )!

    expect(outcome).toMatchObject({
      status: 'SKIPPED_INVALID_HOLD',
      reason: 'invalid_hold',
      deletedCount: 0
    })
    expect(store.rows('effect_journal')).toHaveLength(1)
  })

  it('fails closed to SKIPPED_INVALID_HOLD on a mismatched hold scope', async () => {
    const backing = new FakeSweepStore()
    backing.seed('effect_journal', {
      id: 'op_old',
      tenantId: TENANT_A,
      time: new Date('2026-07-01T12:00:00.000Z'),
      state: 'CONFIRMED',
      fields: {}
    })
    const mismatched: RetentionSweepStore = {
      ...backing,
      listActiveHolds: async () => [
        approvedHold({ tenantId: TENANT_B, recordId: 'op_old' })
      ],
      countHeld: backing.countHeld.bind(backing),
      selectEligible: backing.selectEligible.bind(backing),
      deleteEligible: backing.deleteEligible.bind(backing),
      tombstoneEligible: backing.tombstoneEligible.bind(backing),
      redactEligible: backing.redactEligible.bind(backing),
      appendLedgerEntry: backing.appendLedgerEntry.bind(backing)
    }

    const report = await executeRetentionSweep(mismatched, {
      tenantId: TENANT_A,
      executedBy: 'fixture.operator',
      clock: () => NOW,
      policies: [effectJournalPolicy()]
    })
    const outcome = report.outcomes.find(
      (item) => item.targetId === 'effect_journal'
    )!

    expect(outcome).toMatchObject({
      status: 'SKIPPED_INVALID_HOLD',
      reason: 'invalid_hold',
      deletedCount: 0
    })
    expect(backing.rows('effect_journal')).toHaveLength(1)
  })

  it('reports an unknown declared target without a classifiable ledger row', async () => {
    const store = new FakeSweepStore()
    const report = await executeRetentionSweep(store, {
      tenantId: TENANT_A,
      executedBy: 'fixture.operator',
      clock: () => NOW,
      policies: [
        effectJournalPolicy(),
        effectJournalPolicy({ targetId: 'messages', policyId: 'POL-UNKNOWN' })
      ]
    })
    const unknown = report.outcomes.find(
      (outcome) => outcome.targetId === 'messages'
    )!

    expect(unknown).toMatchObject({
      status: 'SKIPPED_NO_POLICY',
      reason: 'unknown_target',
      ledgerId: null
    })
    expect(store.ledger.some((entry) => entry.targetId === 'messages')).toBe(
      false
    )
  })

  it('stops at maxBatches and reports an incomplete sweep', async () => {
    const store = new FakeSweepStore()
    for (const id of ['op_a', 'op_b', 'op_c']) {
      store.seed('effect_journal', {
        id,
        tenantId: TENANT_A,
        time: new Date('2026-07-01T12:00:00.000Z'),
        state: 'CONFIRMED',
        fields: {}
      })
    }

    const report = await executeRetentionSweep(store, {
      tenantId: TENANT_A,
      executedBy: 'fixture.operator',
      clock: () => NOW,
      policies: [effectJournalPolicy()],
      batchSize: 1,
      maxBatches: 1
    })
    const outcome = report.outcomes.find(
      (item) => item.targetId === 'effect_journal'
    )!

    expect(outcome.batchesProcessed).toBe(1)
    expect(outcome.complete).toBe(false)
    expect(report.complete).toBe(false)
  })

  it('rejects unbounded execution options before touching any row', async () => {
    const store = new FakeSweepStore()

    await expect(
      executeRetentionSweep(store, {
        tenantId: TENANT_A,
        executedBy: 'fixture.operator',
        clock: () => NOW,
        policies: [effectJournalPolicy()],
        batchSize: 0
      })
    ).rejects.toThrow(/batchSize/)
    await expect(
      executeRetentionSweep(store, {
        tenantId: TENANT_A,
        executedBy: 'fixture.operator',
        clock: () => NOW,
        policies: [effectJournalPolicy()],
        maxBatches: 0
      })
    ).rejects.toThrow(/maxBatches/)
    await expect(
      executeRetentionSweep(store, {
        tenantId: TENANT_A,
        executedBy: 'fixture.operator',
        clock: () => NOW,
        policies: [effectJournalPolicy()],
        lockTimeoutMs: 0
      })
    ).rejects.toThrow(/lockTimeoutMs/)
    await expect(
      executeRetentionSweep(store, {
        tenantId: TENANT_A,
        executedBy: 'fixture.operator',
        clock: () => NOW,
        policies: [effectJournalPolicy()],
        statementTimeoutMs: MAX_RETENTION_TIMEOUT_MS + 1
      })
    ).rejects.toThrow(/statementTimeoutMs/)
  })

  it('rejects an invalid sweep clock without side effects', async () => {
    const store = new FakeSweepStore()

    await expect(
      executeRetentionSweep(store, {
        tenantId: TENANT_A,
        executedBy: 'fixture.operator',
        clock: () => new Date('not-a-date'),
        policies: [effectJournalPolicy()]
      })
    ).rejects.toThrow(/clock/)
    expect(store.ledger).toEqual([])
  })
})
