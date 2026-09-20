import { describe, expect, it } from 'vitest'
import {
  DEFAULT_RETENTION_TTL_DAYS,
  RETENTION_REDACTED_JSON,
  RETENTION_REDACTED_TEXT,
  RETENTION_TARGETS,
  RETENTION_WINDOW_START,
  computeRetentionBatchHash,
  executeRetentionSweep,
  resolveRetentionSweepPlan,
  type RetentionEligibility,
  type RetentionHold,
  type RetentionLedgerEntry,
  type RetentionPolicyDeclaration,
  type RetentionRedactionColumn,
  type RetentionSweepStore
} from '../retention.ts'

function redactionMarker(column: RetentionRedactionColumn): unknown {
  return column.valueKind === 'text'
    ? RETENTION_REDACTED_TEXT
    : column.valueKind === 'jsonb_empty_array'
      ? []
      : { ...RETENTION_REDACTED_JSON }
}

const TENANT_A = 'tenant_00000000-0000-4000-8000-0000000000c1'
const TENANT_B = 'tenant_00000000-0000-4000-8000-0000000000c2'
const NOW = new Date('2026-09-19T12:00:00.000Z')

function effectJournalPolicy(
  overrides: Partial<RetentionPolicyDeclaration> = {}
): RetentionPolicyDeclaration {
  return {
    targetId: 'effect_journal',
    policyId: 'POL-D05-3-JOURNAL',
    approvalRef: 'docs/02_spec/prod20260913_decision_packet.md#D05-3/4',
    approvedBy: 'fixture.operator',
    approvedAt: '2026-09-13T17:00:13.688Z',
    eligibleStates: ['CONFIRMED', 'EFFECT_FAILED', 'ABANDONED'],
    ...overrides
  }
}

function goalPolicy(
  overrides: Partial<RetentionPolicyDeclaration> = {}
): RetentionPolicyDeclaration {
  return {
    targetId: 'orchestrator_goals',
    policyId: 'POL-AUD19-05-GOALS',
    approvalRef: 'AUD19-05 fixture policy (human approval pending)',
    approvedBy: 'fixture.operator',
    approvedAt: '2026-09-13T17:00:13.688Z',
    action: 'redact',
    eligibleStates: ['COMPLETED', 'FAILED', 'CANCELLED'],
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

class FakeRetentionStore implements RetentionSweepStore {
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

  async countHeld(eligibility: RetentionEligibility): Promise<number> {
    const rows = this.eligible(eligibility)
    if (eligibility.holds.some((hold) => hold.recordId === null)) {
      return rows.length
    }
    const heldIds = new Set(
      eligibility.holds
        .map((hold) => hold.recordId)
        .filter((recordId): recordId is string => recordId !== null)
    )
    return rows.filter((row) => heldIds.has(row.id)).length
  }

  async deleteEligible(eligibility: RetentionEligibility): Promise<number> {
    const eligible = this.eligible(eligibility)
    const eligibleSet = new Set(eligible)
    const tenantWide = eligibility.holds.some((hold) => hold.recordId === null)
    const heldIds = new Set(
      eligibility.holds
        .map((hold) => hold.recordId)
        .filter((recordId): recordId is string => recordId !== null)
    )
    let deleted = 0
    const remaining = this.rows(eligibility.target.id).filter((row) => {
      if (!eligibleSet.has(row)) return true
      if (tenantWide || heldIds.has(row.id)) return true
      deleted += 1
      return false
    })
    this.rowsByTarget.set(eligibility.target.id, remaining)
    return deleted
  }

  async redactEligible(eligibility: RetentionEligibility): Promise<number> {
    const tenantWide = eligibility.holds.some((hold) => hold.recordId === null)
    const heldIds = new Set(
      eligibility.holds
        .map((hold) => hold.recordId)
        .filter((recordId): recordId is string => recordId !== null)
    )
    let redacted = 0
    for (const row of this.eligible(eligibility)) {
      if (tenantWide || heldIds.has(row.id)) continue
      const stillSensitive = eligibility.target.redactionColumns.some(
        (column) =>
          JSON.stringify(row.fields[column.column]) !==
          JSON.stringify(redactionMarker(column))
      )
      if (!stillSensitive) continue
      for (const column of eligibility.target.redactionColumns) {
        row.fields[column.column] = redactionMarker(column)
      }
      redacted += 1
    }
    return redacted
  }

  async appendLedgerEntry(entry: RetentionLedgerEntry): Promise<void> {
    this.ledger.push(structuredClone(entry))
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
}

function approvedHold(overrides: Partial<RetentionHold> = {}): RetentionHold {
  return {
    id: 'hold_fixture_1',
    tenantId: TENANT_A,
    targetId: 'effect_journal',
    recordId: null,
    reason: 'synthetic legal hold fixture',
    authorizationRef: 'fixture-hold-order-001',
    approvedBy: 'fixture.operator',
    approvedAt: new Date('2026-09-01T00:00:00.000Z'),
    releasedAt: null,
    ...overrides
  }
}

describe('retention policy planning (fail closed)', () => {
  it('never approves a target without an explicit approved declaration', () => {
    const plan = resolveRetentionSweepPlan(
      {
        tenantId: TENANT_A,
        executedBy: 'fixture.operator',
        policies: []
      },
      NOW
    )

    expect(plan.approved).toEqual([])
    expect(plan.pending).toHaveLength(RETENTION_TARGETS.length)
    expect(
      plan.pending.every((item) => item.reason === 'no_policy_configured')
    ).toBe(true)
  })

  it('resolves the D05-3/4 default TTL of 30 days with a synthetic clock', () => {
    const plan = resolveRetentionSweepPlan(
      {
        tenantId: TENANT_A,
        executedBy: 'fixture.operator',
        policies: [effectJournalPolicy()]
      },
      NOW
    )

    expect(
      plan.pending.filter((item) => item.reason !== 'no_policy_configured')
    ).toEqual([])
    expect(plan.approved).toHaveLength(1)
    const resolved = plan.approved[0]!
    expect(resolved.ttlDays).toBe(DEFAULT_RETENTION_TTL_DAYS)
    expect(resolved.action).toBe('delete')
    expect(resolved.cutoff.toISOString()).toBe('2026-08-20T12:00:00.000Z')
    expect(resolved.windowStart.getTime()).toBe(
      RETENTION_WINDOW_START.getTime()
    )
    expect(resolved.eligibleStates).toEqual([
      'CONFIRMED',
      'EFFECT_FAILED',
      'ABANDONED'
    ])
  })

  it.each([
    ['unknown_target', effectJournalPolicy({ targetId: 'messages' })],
    ['missing_approval', effectJournalPolicy({ approvedBy: '' })],
    ['missing_approval', effectJournalPolicy({ approvalRef: '' })],
    ['missing_approval', effectJournalPolicy({ policyId: '' })],
    ['missing_approval', effectJournalPolicy({ approvedAt: 'not-a-date' })],
    [
      'approval_not_effective',
      effectJournalPolicy({ approvedAt: '2027-01-01T00:00:00.000Z' })
    ],
    ['invalid_ttl', effectJournalPolicy({ ttlDays: 0 })],
    ['invalid_ttl', effectJournalPolicy({ ttlDays: 1.5 })],
    ['ttl_exceeds_classification_limit', effectJournalPolicy({ ttlDays: 400 })],
    ['unsupported_action', effectJournalPolicy({ action: 'redact' })],
    ['missing_eligible_states', effectJournalPolicy({ eligibleStates: [] })],
    [
      'unapproved_state',
      goalPolicy({ eligibleStates: ['COMPLETED', 'PLANNING'] })
    ],
    [
      'protected_state',
      effectJournalPolicy({ eligibleStates: ['CONFIRMED', 'UNCERTAIN'] })
    ]
  ])('keeps %s pending instead of acting', (reason, policy) => {
    const plan = resolveRetentionSweepPlan(
      {
        tenantId: TENANT_A,
        executedBy: 'fixture.operator',
        policies: [policy]
      },
      NOW
    )

    expect(plan.approved).toEqual([])
    expect(plan.pending).toEqual(
      expect.arrayContaining([expect.objectContaining({ reason })])
    )
  })

  it('reports an unknown declared target without writing an unclassifiable ledger row', async () => {
    const store = new FakeRetentionStore()
    const report = await executeRetentionSweep(store, {
      tenantId: TENANT_A,
      executedBy: 'fixture.operator',
      clock: () => NOW,
      policies: [
        effectJournalPolicy(),
        effectJournalPolicy({
          targetId: 'messages',
          policyId: 'POL-UNKNOWN'
        })
      ]
    })
    const unknown = report.outcomes.find(
      (outcome) => outcome.targetId === 'messages'
    )!

    expect(unknown).toMatchObject({
      status: 'SKIPPED_NO_POLICY',
      reason: 'unknown_target',
      action: 'none',
      ledgerId: null
    })
    expect(store.ledger.some((entry) => entry.targetId === 'messages')).toBe(
      false
    )
  })

  it('fails closed on duplicate declarations for the same target', () => {
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
        expect.objectContaining({
          targetId: 'effect_journal',
          reason: 'duplicate_policy'
        })
      ])
    )
  })
})

describe('retention sweep execution (idempotent, tenant scoped, hold aware)', () => {
  it('expires only records older than the policy TTL and is idempotent', async () => {
    const store = new FakeRetentionStore()
    store.seed('effect_journal', {
      id: 'op_old_confirmed',
      tenantId: TENANT_A,
      time: new Date('2026-07-01T12:00:00.000Z'),
      state: 'CONFIRMED',
      fields: { execution_ref: 'synthetic-ref' }
    })
    store.seed('effect_journal', {
      id: 'op_old_uncertain',
      tenantId: TENANT_A,
      time: new Date('2026-07-01T12:00:00.000Z'),
      state: 'UNCERTAIN',
      fields: { execution_ref: 'synthetic-ref' }
    })
    store.seed('effect_journal', {
      id: 'op_recent_confirmed',
      tenantId: TENANT_A,
      time: new Date('2026-09-15T12:00:00.000Z'),
      state: 'CONFIRMED',
      fields: { execution_ref: 'synthetic-ref' }
    })

    const request = {
      tenantId: TENANT_A,
      executedBy: 'fixture.operator',
      clock: () => NOW,
      policies: [effectJournalPolicy()]
    }
    const first = await executeRetentionSweep(store, request)
    const firstOutcome = first.outcomes.find(
      (outcome) => outcome.targetId === 'effect_journal'
    )!

    expect(firstOutcome).toMatchObject({
      status: 'EXECUTED',
      action: 'delete',
      deletedCount: 1,
      redactedCount: 0,
      preservedHoldCount: 0,
      policyId: 'POL-D05-3-JOURNAL'
    })
    expect(store.rows('effect_journal').map((row) => row.id)).toEqual([
      'op_old_uncertain',
      'op_recent_confirmed'
    ])

    const second = await executeRetentionSweep(store, request)
    const secondOutcome = second.outcomes.find(
      (outcome) => outcome.targetId === 'effect_journal'
    )!

    expect(secondOutcome).toMatchObject({
      status: 'EXECUTED',
      deletedCount: 0,
      redactedCount: 0
    })
    expect(store.rows('effect_journal').map((row) => row.id)).toEqual([
      'op_old_uncertain',
      'op_recent_confirmed'
    ])
  })

  it('preserves records covered by an explicit approved legal hold', async () => {
    const store = new FakeRetentionStore()
    store.seed('effect_journal', {
      id: 'op_held',
      tenantId: TENANT_A,
      time: new Date('2026-07-01T12:00:00.000Z'),
      state: 'CONFIRMED',
      fields: {}
    })
    store.seed('effect_journal', {
      id: 'op_free',
      tenantId: TENANT_A,
      time: new Date('2026-07-01T12:00:00.000Z'),
      state: 'CONFIRMED',
      fields: {}
    })
    store.holds = [approvedHold({ recordId: 'op_held' })]

    const report = await executeRetentionSweep(store, {
      tenantId: TENANT_A,
      executedBy: 'fixture.operator',
      clock: () => NOW,
      policies: [effectJournalPolicy()]
    })
    const outcome = report.outcomes.find(
      (item) => item.targetId === 'effect_journal'
    )!

    expect(outcome.deletedCount).toBe(1)
    expect(outcome.preservedHoldCount).toBe(1)
    expect(store.rows('effect_journal').map((row) => row.id)).toEqual([
      'op_held'
    ])
  })

  it('treats a tenant-wide hold as full preservation', async () => {
    const store = new FakeRetentionStore()
    for (const id of ['op_a', 'op_b']) {
      store.seed('effect_journal', {
        id,
        tenantId: TENANT_A,
        time: new Date('2026-07-01T12:00:00.000Z'),
        state: 'CONFIRMED',
        fields: {}
      })
    }
    store.holds = [approvedHold({ recordId: null })]

    const report = await executeRetentionSweep(store, {
      tenantId: TENANT_A,
      executedBy: 'fixture.operator',
      clock: () => NOW,
      policies: [effectJournalPolicy()]
    })
    const outcome = report.outcomes.find(
      (item) => item.targetId === 'effect_journal'
    )!

    expect(outcome.deletedCount).toBe(0)
    expect(outcome.preservedHoldCount).toBe(2)
    expect(store.rows('effect_journal')).toHaveLength(2)
  })

  it('skips the target fail closed when a hold lacks approval metadata', async () => {
    const store = new FakeRetentionStore()
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

  it('never deletes or leaks another tenant records', async () => {
    const store = new FakeRetentionStore()
    store.seed('effect_journal', {
      id: 'op_a_old',
      tenantId: TENANT_A,
      time: new Date('2026-07-01T12:00:00.000Z'),
      state: 'CONFIRMED',
      fields: {}
    })
    store.seed('effect_journal', {
      id: 'op_b_old',
      tenantId: TENANT_B,
      time: new Date('2026-07-01T12:00:00.000Z'),
      state: 'CONFIRMED',
      fields: {}
    })

    await executeRetentionSweep(store, {
      tenantId: TENANT_A,
      executedBy: 'fixture.operator',
      clock: () => NOW,
      policies: [effectJournalPolicy()]
    })

    expect(store.rows('effect_journal').map((row) => row.id)).toEqual([
      'op_b_old'
    ])
    expect(store.ledger.every((entry) => entry.tenantId === TENANT_A)).toBe(
      true
    )
  })

  it('minimizes sensitive fields instead of deleting when the policy redacts', async () => {
    const store = new FakeRetentionStore()
    store.seed('orchestrator_goals', {
      id: 'goal_terminal',
      tenantId: TENANT_A,
      time: new Date('2026-07-01T12:00:00.000Z'),
      state: 'COMPLETED',
      fields: {
        objective: 'SENSITIVE-OBJECTIVE-MARKER',
        planner_context: { secret: 'SENSITIVE-PLANNER-MARKER' },
        success_criteria: [{ expected: 'SENSITIVE-CRITERIA-MARKER' }],
        last_reason: 'SENSITIVE-REASON-MARKER',
        last_error: 'SENSITIVE-ERROR-MARKER'
      }
    })
    store.seed('orchestrator_goals', {
      id: 'goal_uncertain',
      tenantId: TENANT_A,
      time: new Date('2026-07-01T12:00:00.000Z'),
      state: 'UNCERTAIN',
      fields: { objective: 'SENSITIVE-UNCERTAIN-MARKER' }
    })

    const report = await executeRetentionSweep(store, {
      tenantId: TENANT_A,
      executedBy: 'fixture.operator',
      clock: () => NOW,
      policies: [goalPolicy()]
    })
    const outcome = report.outcomes.find(
      (item) => item.targetId === 'orchestrator_goals'
    )!

    expect(outcome).toMatchObject({
      status: 'EXECUTED',
      action: 'redact',
      deletedCount: 0,
      redactedCount: 1
    })
    const terminal = store
      .rows('orchestrator_goals')
      .find((row) => row.id === 'goal_terminal')!
    expect(terminal.fields).toEqual({
      objective: RETENTION_REDACTED_TEXT,
      planner_context: { ...RETENTION_REDACTED_JSON },
      success_criteria: [],
      last_reason: RETENTION_REDACTED_TEXT,
      last_error: RETENTION_REDACTED_TEXT
    })
    const uncertain = store
      .rows('orchestrator_goals')
      .find((row) => row.id === 'goal_uncertain')!
    expect(uncertain.fields.objective).toBe('SENSITIVE-UNCERTAIN-MARKER')

    const rerun = await executeRetentionSweep(store, {
      tenantId: TENANT_A,
      executedBy: 'fixture.operator',
      clock: () => NOW,
      policies: [goalPolicy()]
    })
    expect(
      rerun.outcomes.find((item) => item.targetId === 'orchestrator_goals')
    ).toMatchObject({ redactedCount: 0, deletedCount: 0 })
  })

  it('does not expire before the synthetic clock crosses the TTL', async () => {
    const store = new FakeRetentionStore()
    store.seed('effect_journal', {
      id: 'op_old',
      tenantId: TENANT_A,
      time: new Date('2026-09-10T12:00:00.000Z'),
      state: 'CONFIRMED',
      fields: {}
    })

    const before = await executeRetentionSweep(store, {
      tenantId: TENANT_A,
      executedBy: 'fixture.operator',
      clock: () => new Date('2026-09-20T12:00:00.000Z'),
      policies: [effectJournalPolicy()]
    })
    expect(
      before.outcomes.find((item) => item.targetId === 'effect_journal')
        ?.deletedCount
    ).toBe(0)

    const after = await executeRetentionSweep(store, {
      tenantId: TENANT_A,
      executedBy: 'fixture.operator',
      clock: () => new Date('2026-10-11T12:00:00.000Z'),
      policies: [effectJournalPolicy()]
    })
    expect(
      after.outcomes.find((item) => item.targetId === 'effect_journal')
        ?.deletedCount
    ).toBe(1)
  })

  it('registers an unconfigured target as a pending ledger entry without touching it', async () => {
    const store = new FakeRetentionStore()
    store.seed('orchestrator_goals', {
      id: 'goal_old',
      tenantId: TENANT_A,
      time: new Date('2026-07-01T12:00:00.000Z'),
      state: 'COMPLETED',
      fields: { objective: 'SENSITIVE-OBJECTIVE-MARKER' }
    })

    const report = await executeRetentionSweep(store, {
      tenantId: TENANT_A,
      executedBy: 'fixture.operator',
      clock: () => NOW,
      policies: [effectJournalPolicy()]
    })
    const pending = report.outcomes.find(
      (item) => item.targetId === 'orchestrator_goals'
    )!

    expect(pending).toMatchObject({
      status: 'SKIPPED_NO_POLICY',
      reason: 'no_policy_configured',
      action: 'none',
      deletedCount: 0,
      redactedCount: 0,
      policyId: null
    })
    expect(store.rows('orchestrator_goals')).toHaveLength(1)
    expect(store.rows('orchestrator_goals')[0]!.fields.objective).toBe(
      'SENSITIVE-OBJECTIVE-MARKER'
    )
  })

  it('keeps eliminated content out of the erasure ledger', async () => {
    const store = new FakeRetentionStore()
    store.seed('orchestrator_goals', {
      id: 'goal_leaky',
      tenantId: TENANT_A,
      time: new Date('2026-07-01T12:00:00.000Z'),
      state: 'COMPLETED',
      fields: { objective: 'SENSITIVE-LEDGER-MARKER' }
    })
    store.seed('effect_journal', {
      id: 'op_sensitive_id',
      tenantId: TENANT_A,
      time: new Date('2026-07-01T12:00:00.000Z'),
      state: 'CONFIRMED',
      fields: { execution_ref: 'SENSITIVE-LEDGER-MARKER' }
    })

    await executeRetentionSweep(store, {
      tenantId: TENANT_A,
      executedBy: 'fixture.operator',
      clock: () => NOW,
      policies: [effectJournalPolicy(), goalPolicy()]
    })

    const serialized = JSON.stringify(store.ledger)
    expect(serialized).not.toContain('SENSITIVE-LEDGER-MARKER')
    expect(serialized).not.toContain('op_sensitive_id')
    for (const entry of store.ledger) {
      expect(Object.keys(entry).sort()).toEqual([
        'action',
        'batchHash',
        'classification',
        'deletedCount',
        'executedAt',
        'executedBy',
        'id',
        'outcome',
        'policyApprovedAt',
        'policyApprovedBy',
        'policyId',
        'policyRef',
        'preservedHoldCount',
        'reason',
        'redactedCount',
        'targetId',
        'tenantId',
        'windowEnd',
        'windowStart'
      ])
      if (entry.outcome === 'EXECUTED') {
        expect(entry.policyApprovedBy).toBe('fixture.operator')
        expect(entry.policyApprovedAt).toBeInstanceOf(Date)
      } else {
        expect(entry.policyApprovedBy).toBeNull()
        expect(entry.policyApprovedAt).toBeNull()
      }
    }
  })
})

describe('retention batch hash', () => {
  it('is a deterministic metadata-only digest', () => {
    const input = {
      tenantId: TENANT_A,
      targetId: 'effect_journal',
      action: 'delete' as const,
      policyId: 'POL-D05-3-JOURNAL',
      windowStart: RETENTION_WINDOW_START,
      windowEnd: new Date('2026-08-20T12:00:00.000Z'),
      holds: [
        approvedHold({ recordId: 'b' }),
        approvedHold({ id: 'h2', recordId: 'a' })
      ]
    }
    const first = computeRetentionBatchHash(input)
    const second = computeRetentionBatchHash({
      ...input,
      holds: [...input.holds].reverse()
    })

    expect(first).toMatch(/^[0-9a-f]{64}$/)
    expect(second).toBe(first)
    expect(first).not.toContain('op_')
  })
})
