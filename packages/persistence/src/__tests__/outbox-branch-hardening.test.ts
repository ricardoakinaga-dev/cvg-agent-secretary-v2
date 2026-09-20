import { describe, expect, it } from 'vitest'
import { InMemoryDatabase } from '../db.ts'
import {
  OUTBOX_TAKEOVER_SUPPRESSED_ERROR,
  OutboxRepository
} from '../outbox.ts'
import type { OutboxAttemptRecord, OutboxEventRecord } from '../schema.ts'

const tenantA = 'tenant_00000000-0000-4000-8000-000000000901' as const
const tenantB = 'tenant_00000000-0000-4000-8000-000000000902' as const
const correlationId = 'corr_00000000-0000-4000-8000-000000000901'

function fixture(
  options: ConstructorParameters<typeof OutboxRepository>[1] = {}
) {
  const db = new InMemoryDatabase()
  return { db, repository: new OutboxRepository(db, options) }
}

function enqueue(
  repository: OutboxRepository,
  key: string,
  overrides: Record<string, unknown> = {}
) {
  return repository.enqueue({
    tenantId: tenantA,
    type: 'synthetic.branch',
    payload: { fixture: true },
    idempotencyKey: key,
    ...overrides
  })
}

function rawEvent(
  overrides: Partial<OutboxEventRecord> & { id: string }
): OutboxEventRecord {
  return {
    type: 'synthetic.branch',
    payload: { fixture: true },
    tenantId: tenantA,
    status: 'processing',
    createdAt: new Date('2026-09-20T10:00:00.000Z'),
    ...overrides
  }
}

describe('outbox branch hardening', () => {
  it('auto-generates a correlation id and persists the orchestration context', () => {
    const { repository } = fixture()
    const event = enqueue(repository, 'outbox-branch-key-1', {
      orchestrationContext: {
        goalId: 'goal_branch_1',
        planId: 'plan_branch_1',
        stepId: 'step_branch_1',
        attemptId: 'attempt_branch_1'
      }
    })

    expect(event.correlationId).toMatch(/^corr_/)
    expect(event.orchestrationContext).toEqual({
      goalId: 'goal_branch_1',
      planId: 'plan_branch_1',
      stepId: 'step_branch_1',
      attemptId: 'attempt_branch_1'
    })
    expect(repository.findById(event.id)?.id).toBe(event.id)
  })

  it('lists and sorts dead letters with and without a tenant filter', () => {
    const { repository, db } = fixture()
    const deadLetteredAt = new Date('2026-09-20T11:00:00.000Z')
    db.state.outbox.push(
      rawEvent({ id: 'outbox_dead_b', status: 'dead_letter' }),
      rawEvent({
        id: 'outbox_dead_a',
        status: 'dead_letter',
        deadLetteredAt
      }),
      rawEvent({
        id: 'outbox_dead_other',
        tenantId: tenantB,
        status: 'dead_letter'
      })
    )

    const all = repository.listDeadLetters()
    expect(all.map((event) => event.id)).toEqual([
      'outbox_dead_a',
      'outbox_dead_b',
      'outbox_dead_other'
    ])
    const scoped = repository.listDeadLetters(tenantA)
    expect(scoped.map((event) => event.id)).toEqual([
      'outbox_dead_a',
      'outbox_dead_b'
    ])
  })

  it('fails raw events that carry no correlation id or attempt metadata', () => {
    const { repository, db } = fixture({
      clock: () => new Date('2026-09-20T10:00:00.000Z')
    })
    db.state.outbox.push(
      rawEvent({
        id: 'outbox_raw_terminal',
        leaseOwner: 'worker-raw',
        leaseUntil: new Date('2026-09-20T10:05:00.000Z')
      }),
      rawEvent({
        id: 'outbox_raw_handoff',
        leaseOwner: 'worker-raw',
        leaseUntil: new Date('2026-09-20T10:05:00.000Z')
      })
    )

    const terminal = repository.fail({
      tenantId: tenantA,
      eventId: 'outbox_raw_terminal',
      workerId: 'worker-raw',
      error: 'synthetic terminal',
      terminal: true
    })
    expect(terminal).toMatchObject({ status: 'dead_letter', attempts: 0 })
    const terminalAudit = db.state.auditEvents.at(-1)
    expect(terminalAudit?.type).toBe('integration_event')
    expect(terminalAudit?.correlationId).toMatch(/^corr_/)
    expect(terminalAudit?.payload).toMatchObject({
      status: 'dead_letter',
      attempt: 0
    })

    const handoff = repository.fail({
      tenantId: tenantA,
      eventId: 'outbox_raw_handoff',
      workerId: 'worker-raw',
      error: 'synthetic takeover',
      handoff: true
    })
    expect(handoff.status).toBe('dead_letter')
    const handoffAudit = db.state.auditEvents.at(-1)
    expect(handoffAudit?.type).toBe('handoff')
    expect(handoffAudit?.correlationId).toMatch(/^corr_/)
    expect(handoffAudit?.payload).toMatchObject({
      action: 'human_takeover',
      attempt: 0
    })
  })

  it('marks only the handoff session and conversation, leaving siblings', () => {
    const now = new Date('2026-09-20T10:00:00.000Z')
    const { repository, db } = fixture({ clock: () => now })
    db.state.conversations.push(
      {
        tenantId: tenantA,
        id: 'conv_handoff_target',
        channel: 'web',
        senderRef: 'fixture-target',
        senderRefHash: 'fixture-target-hash',
        status: 'active',
        correlationId,
        createdAt: now,
        updatedAt: now
      },
      {
        tenantId: tenantA,
        id: 'conv_handoff_sibling',
        channel: 'web',
        senderRef: 'fixture-sibling',
        senderRefHash: 'fixture-sibling-hash',
        status: 'active',
        correlationId,
        createdAt: now,
        updatedAt: now
      }
    )
    db.state.sessions.push(
      {
        id: 'sess_handoff_target',
        conversationId: 'conv_handoff_target',
        status: 'open',
        takeoverState: 'BOT_ACTIVE',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'sess_handoff_sibling',
        conversationId: 'conv_handoff_sibling',
        status: 'open',
        takeoverState: 'BOT_ACTIVE',
        createdAt: now,
        updatedAt: now
      }
    )
    const event = enqueue(repository, 'outbox-branch-key-14', {
      sessionId: 'sess_handoff_target',
      conversationId: 'conv_handoff_target'
    })
    repository.claimNext({ tenantId: tenantA, workerId: 'worker-handoff' })

    repository.fail({
      tenantId: tenantA,
      eventId: event.id,
      workerId: 'worker-handoff',
      error: 'synthetic takeover',
      handoff: true
    })

    const sessionById = (id: string) =>
      db.state.sessions.find((session) => session.id === id)
    const conversationById = (id: string) =>
      db.state.conversations.find((conversation) => conversation.id === id)
    expect(sessionById('sess_handoff_target')?.takeoverState).toBe(
      'HANDOFF_REQUESTED'
    )
    expect(sessionById('sess_handoff_sibling')?.takeoverState).toBe(
      'BOT_ACTIVE'
    )
    expect(conversationById('conv_handoff_target')?.status).toBe(
      'waiting_human'
    )
    expect(conversationById('conv_handoff_sibling')?.status).toBe('active')
  })

  it('requeues a dead letter that carries no error or attempt metadata', () => {
    const { repository, db } = fixture()
    db.state.outbox.push(
      rawEvent({
        id: 'outbox_raw_dead',
        status: 'dead_letter',
        lastError: null
      })
    )

    const requeued = repository.requeueDeadLetter({
      tenantId: tenantA,
      eventId: 'outbox_raw_dead',
      operatorId: 'op_synthetic',
      correlationId
    })

    expect(requeued).toMatchObject({
      status: 'pending',
      attempts: 0,
      lastError: null,
      deadLetteredAt: null
    })
    expect(db.state.outboxAttempts.at(-1)).toMatchObject({
      eventId: 'outbox_raw_dead',
      attempt: 0,
      outcome: 'requeued',
      error: null
    })
    expect(db.state.auditEvents.at(-1)?.payload).toMatchObject({
      action: 'requeue_dead_letter',
      attempt: 0
    })
  })

  it('requires a fencing token on heartbeat when fencing is enforced', () => {
    const now = new Date('2026-09-20T10:00:00.000Z')
    const { repository } = fixture({
      clock: () => now,
      enforceLeaseFencing: true
    })
    const event = enqueue(repository, 'outbox-branch-key-2')
    const claimed = repository.claimNext({
      tenantId: tenantA,
      workerId: 'worker-fenced'
    })

    expect(
      repository.heartbeatClaim({
        tenantId: tenantA,
        eventId: event.id,
        workerId: 'worker-fenced',
        leaseMs: 5_000
      })
    ).toBeNull()

    const renewed = repository.heartbeatClaim({
      tenantId: tenantA,
      eventId: event.id,
      workerId: 'worker-fenced',
      leaseToken: claimed?.leaseToken ?? undefined,
      leaseMs: 5_000
    })
    expect(renewed).toMatchObject({ id: event.id, status: 'processing' })
  })

  it('prefers the effect result and falls back across async ack paths', async () => {
    const { repository, db } = fixture()
    const effectWins = enqueue(repository, 'outbox-branch-key-3')
    repository.claimNext({ tenantId: tenantA, workerId: 'worker-async' })
    await repository.ack({
      tenantId: tenantA,
      eventId: effectWins.id,
      workerId: 'worker-async',
      revalidate: async () => undefined,
      effect: () => ({ kind: 'effect' }),
      result: { kind: 'fallback' }
    })

    const fallbackAfterRevalidate = enqueue(repository, 'outbox-branch-key-4')
    repository.claimNext({ tenantId: tenantA, workerId: 'worker-async' })
    await repository.ack({
      tenantId: tenantA,
      eventId: fallbackAfterRevalidate.id,
      workerId: 'worker-async',
      revalidate: async () => undefined,
      effect: async () => undefined,
      result: { kind: 'fallback' }
    })

    const noFallbackAfterRevalidate = enqueue(repository, 'outbox-branch-key-5')
    repository.claimNext({ tenantId: tenantA, workerId: 'worker-async' })
    await repository.ack({
      tenantId: tenantA,
      eventId: noFallbackAfterRevalidate.id,
      workerId: 'worker-async',
      revalidate: async () => undefined,
      effect: async () => undefined
    })

    const asyncEffect = enqueue(repository, 'outbox-branch-key-6')
    repository.claimNext({ tenantId: tenantA, workerId: 'worker-async' })
    await repository.ack({
      tenantId: tenantA,
      eventId: asyncEffect.id,
      workerId: 'worker-async',
      effect: async () => ({ kind: 'async-effect' })
    })

    const fallbackAfterAsyncEffect = enqueue(repository, 'outbox-branch-key-7')
    repository.claimNext({ tenantId: tenantA, workerId: 'worker-async' })
    await repository.ack({
      tenantId: tenantA,
      eventId: fallbackAfterAsyncEffect.id,
      workerId: 'worker-async',
      effect: async () => undefined,
      result: { kind: 'fallback' }
    })

    const noFallbackAfterAsyncEffect = enqueue(
      repository,
      'outbox-branch-key-8'
    )
    repository.claimNext({ tenantId: tenantA, workerId: 'worker-async' })
    await repository.ack({
      tenantId: tenantA,
      eventId: noFallbackAfterAsyncEffect.id,
      workerId: 'worker-async',
      effect: async () => undefined
    })

    const journalFor = (eventId: string) =>
      db.state.outboxEffects.find((effect) => effect.eventId === eventId)

    expect(journalFor(effectWins.id)?.result).toEqual({ kind: 'effect' })
    expect(journalFor(fallbackAfterRevalidate.id)?.result).toEqual({
      kind: 'fallback'
    })
    expect(journalFor(noFallbackAfterRevalidate.id)?.result).toBeNull()
    expect(journalFor(asyncEffect.id)?.result).toEqual({
      kind: 'async-effect'
    })
    expect(journalFor(fallbackAfterAsyncEffect.id)?.result).toEqual({
      kind: 'fallback'
    })
    expect(journalFor(noFallbackAfterAsyncEffect.id)?.result).toBeNull()
  })

  it('replays a journal entry while leaving sibling effects untouched', () => {
    const now = new Date('2026-09-20T10:00:00.000Z')
    const { repository, db } = fixture({ clock: () => now })
    const first = enqueue(repository, 'outbox-branch-key-9')
    const firstClaim = repository.claimNext({
      tenantId: tenantA,
      workerId: 'worker-journal'
    })
    repository.ack({
      tenantId: tenantA,
      eventId: first.id,
      workerId: 'worker-journal',
      result: { first: true }
    })

    const second = enqueue(repository, 'outbox-branch-key-10')
    repository.claimNext({ tenantId: tenantA, workerId: 'worker-journal' })
    repository.ack({
      tenantId: tenantA,
      eventId: second.id,
      workerId: 'worker-journal',
      result: { second: true }
    })

    db.state.outbox = db.state.outbox.map((candidate) =>
      candidate.id === first.id
        ? {
            ...candidate,
            status: 'processing',
            leaseOwner: 'worker-journal',
            leaseToken: firstClaim?.leaseToken ?? null,
            leaseUntil: new Date(now.getTime() + 30_000),
            processedAt: null
          }
        : candidate
    )

    const replayed = repository.ack({
      tenantId: tenantA,
      eventId: first.id,
      workerId: 'worker-journal',
      leaseToken: firstClaim?.leaseToken ?? undefined,
      effect: () => ({ first: 'must-not-run' })
    })

    expect(replayed).toMatchObject({ status: 'processed' })
    expect(
      db.state.outboxEffects.find((effect) => effect.eventId === first.id)
        ?.result
    ).toEqual({ first: true })
    expect(
      db.state.outboxEffects.find((effect) => effect.eventId === second.id)
        ?.result
    ).toEqual({ second: true })
  })

  it('records an expired claim only when a matching attempt exists', () => {
    const now = new Date('2026-09-20T10:00:00.000Z')
    const { repository, db } = fixture({ clock: () => now })
    const expired = rawEvent({
      id: 'outbox_expired_matching',
      attempts: 2,
      leaseOwner: 'worker-expired',
      leaseToken: 'lease_expired_token',
      leaseUntil: new Date(now.getTime() - 1_000)
    })
    const unmatched = rawEvent({
      id: 'outbox_expired_unmatched',
      attempts: 1,
      leaseOwner: 'worker-expired',
      leaseToken: 'lease_unmatched_token',
      leaseUntil: new Date(now.getTime() - 500)
    })
    db.state.outbox.push(expired, unmatched)
    const attempts: OutboxAttemptRecord[] = [
      {
        eventId: 'outbox_expired_matching',
        attempt: 2,
        tenantId: tenantA,
        workerId: 'worker-expired',
        claimedAt: new Date(now.getTime() - 10_000),
        outcome: 'claimed',
        error: null
      },
      {
        eventId: 'outbox_other_event',
        attempt: 1,
        tenantId: tenantA,
        workerId: 'worker-other',
        claimedAt: new Date(now.getTime() - 10_000),
        outcome: 'claimed',
        error: null
      },
      {
        eventId: 'outbox_expired_unmatched',
        attempt: 5,
        tenantId: tenantA,
        workerId: 'worker-expired',
        claimedAt: new Date(now.getTime() - 10_000),
        outcome: 'claimed',
        error: null
      }
    ]
    db.state.outboxAttempts.push(...attempts)

    const claimed = repository.claimNext({
      tenantId: tenantA,
      workerId: 'worker-reclaimer'
    })

    expect(claimed?.id).toBe('outbox_expired_matching')
    expect(claimed?.attempts).toBe(3)
    const matchingAttempt = db.state.outboxAttempts.find(
      (attempt) => attempt.eventId === 'outbox_expired_matching'
    )
    expect(matchingAttempt).toMatchObject({
      outcome: 'lease_expired',
      error: 'outbox_error:lease_expired'
    })
    const unmatchedAttempt = db.state.outboxAttempts.find(
      (attempt) => attempt.eventId === 'outbox_expired_unmatched'
    )
    expect(unmatchedAttempt).toMatchObject({ outcome: 'claimed' })
    const unrelatedAttempt = db.state.outboxAttempts.find(
      (attempt) => attempt.eventId === 'outbox_other_event'
    )
    expect(unrelatedAttempt).toMatchObject({ outcome: 'claimed' })
  })

  it('preserves non-serializable function payloads and results verbatim', () => {
    const { repository, db } = fixture()
    const payload = () => 'synthetic payload'
    const result = () => 'synthetic result'
    const event = enqueue(repository, 'outbox-branch-key-11', { payload })
    expect(event.payload).toBe(payload)

    repository.claimNext({ tenantId: tenantA, workerId: 'worker-fn' })
    repository.ack({
      tenantId: tenantA,
      eventId: event.id,
      workerId: 'worker-fn',
      effect: () => result
    })
    expect(
      db.state.outboxEffects.find((effect) => effect.eventId === event.id)
        ?.result
    ).toBe(result)
  })

  it('keeps takeover suppression verbatim and journals a null result once', () => {
    const { repository, db } = fixture()
    const suppressed = enqueue(repository, 'outbox-branch-key-12')
    repository.claimNext({ tenantId: tenantA, workerId: 'worker-null' })
    const failed = repository.fail({
      tenantId: tenantA,
      eventId: suppressed.id,
      workerId: 'worker-null',
      error: OUTBOX_TAKEOVER_SUPPRESSED_ERROR,
      terminal: true
    })
    expect(failed.lastError).toBe(OUTBOX_TAKEOVER_SUPPRESSED_ERROR)

    const nullResult = enqueue(repository, 'outbox-branch-key-13')
    const claimed = repository.claimNext({
      tenantId: tenantA,
      workerId: 'worker-null'
    })
    repository.ack({
      tenantId: tenantA,
      eventId: nullResult.id,
      workerId: 'worker-null',
      result: null
    })
    db.state.outbox = db.state.outbox.map((candidate) =>
      candidate.id === nullResult.id
        ? {
            ...candidate,
            status: 'processing',
            leaseOwner: 'worker-null',
            leaseToken: claimed?.leaseToken ?? null,
            leaseUntil: new Date(Date.now() + 30_000),
            processedAt: null
          }
        : candidate
    )
    repository.ack({
      tenantId: tenantA,
      eventId: nullResult.id,
      workerId: 'worker-null',
      leaseToken: claimed?.leaseToken ?? undefined
    })
    const journal = db.state.outboxEffects.filter(
      (effect) => effect.eventId === nullResult.id
    )
    expect(journal).toHaveLength(1)
    expect(journal[0]?.result).toBeNull()
  })
})
