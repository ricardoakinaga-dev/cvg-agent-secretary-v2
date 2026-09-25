import { describe, expect, it } from 'vitest'
import { DomainError } from '@cvg/shared'
import {
  parseAuditEvidenceQuery,
  parseOptionalAuditFilter,
  parseOrchestrationGoalQuery,
  parsePagination,
  parseTraceLimit
} from '../server/request-query.ts'

function expectDomainError(run: () => unknown, code: string, message: string) {
  let caught: unknown
  try {
    run()
  } catch (error) {
    caught = error
  }
  expect(caught).toBeInstanceOf(DomainError)
  expect(caught).toMatchObject({ code, message })
}

describe('request-query direct contracts', () => {
  it('keeps pagination defaults, coercion, unknown keys, and invalid values', () => {
    expect(parsePagination({})).toEqual({ limit: 25, offset: 0 })
    expect(
      parsePagination({ limit: '100', offset: '10000', extra: 'ignored' })
    ).toEqual({ limit: 100, offset: 10000 })
    expect(parsePagination({ limit: 0 })).toBeNull()
    expect(parsePagination({ limit: 101 })).toBeNull()
    expect(parsePagination({ limit: ['1', '2'] })).toBeNull()
    expect(parsePagination({ offset: -1 })).toBeNull()
    expect(parsePagination({ offset: 10001 })).toBeNull()
    expect(parsePagination({ offset: ['1', '2'] })).toBeNull()
  })

  it('keeps trace limit defaults, coercion, strictness, and exact errors', () => {
    expect(parseTraceLimit({})).toBe(25)
    expect(parseTraceLimit({ limit: '100' })).toBe(100)
    expectDomainError(
      () => parseTraceLimit({ limit: 0 }),
      'invalid_pagination',
      'limit must be between 1 and 100'
    )
    expectDomainError(
      () => parseTraceLimit({ limit: 101 }),
      'invalid_pagination',
      'limit must be between 1 and 100'
    )
    expectDomainError(
      () => parseTraceLimit({ extra: true }),
      'invalid_pagination',
      'limit must be between 1 and 100'
    )
    expectDomainError(
      () => parseTraceLimit({ limit: ['1', '2'] }),
      'invalid_pagination',
      'limit must be between 1 and 100'
    )
  })

  it('keeps goal query defaults, valid status, strictness, and exact errors', () => {
    expect(parseOrchestrationGoalQuery({})).toEqual({ limit: 25 })
    expect(
      parseOrchestrationGoalQuery({ limit: '50', status: 'OBSERVING' })
    ).toEqual({ limit: 50, status: 'OBSERVING' })
    expectDomainError(
      () => parseOrchestrationGoalQuery({ limit: 0 }),
      'invalid_pagination',
      'limit must be between 1 and 50 and status must be a valid Goal state'
    )
    expectDomainError(
      () => parseOrchestrationGoalQuery({ limit: 51 }),
      'invalid_pagination',
      'limit must be between 1 and 50 and status must be a valid Goal state'
    )
    expectDomainError(
      () => parseOrchestrationGoalQuery({ limit: ['1', '2'] }),
      'invalid_pagination',
      'limit must be between 1 and 50 and status must be a valid Goal state'
    )
    expectDomainError(
      () => parseOrchestrationGoalQuery({ status: 'not-a-goal-state' }),
      'invalid_pagination',
      'limit must be between 1 and 50 and status must be a valid Goal state'
    )
    expectDomainError(
      () => parseOrchestrationGoalQuery({ extra: true }),
      'invalid_pagination',
      'limit must be between 1 and 50 and status must be a valid Goal state'
    )
  })

  it('keeps audit pagination defaults and filters with unknown keys ignored', () => {
    expect(parseAuditEvidenceQuery({})).toEqual({
      query: { limit: 25, offset: 0 },
      filters: {}
    })
    expect(
      parseAuditEvidenceQuery({
        limit: '2',
        offset: '1',
        sessionId: ' session-1 ',
        correlationId: 'corr-2',
        actorId: 'actor-3',
        type: 'handoff',
        extra: 'ignored'
      })
    ).toEqual({
      query: {
        limit: 2,
        offset: 1,
        sessionId: 'session-1',
        correlationId: 'corr-2',
        actorId: 'actor-3',
        type: 'handoff'
      },
      filters: {
        sessionId: 'session-1',
        correlationId: 'corr-2',
        actorId: 'actor-3',
        type: 'handoff'
      }
    })
  })

  it('accepts each supported audit event type and rejects an unknown type', () => {
    const types = [
      'tool_call',
      'safety_event',
      'integration_event',
      'policy_decision',
      'approval_decision',
      'handoff'
    ]
    for (const type of types) {
      expect(parseAuditEvidenceQuery({ type }).filters.type).toBe(type)
    }
    expectDomainError(
      () => parseAuditEvidenceQuery({ type: 'not_a_real_type' }),
      'validation_failed',
      'Audit event type is invalid'
    )
  })

  it('keeps audit pagination, duplicate, type, trim, and validation errors', () => {
    expectDomainError(
      () => parseAuditEvidenceQuery({ limit: 101 }),
      'invalid_pagination',
      'limit must be between 1 and 100 and offset must be between 0 and 10000'
    )
    expectDomainError(
      () => parseAuditEvidenceQuery({ sessionId: ['one', 'two'] }),
      'validation_failed',
      'Audit evidence filters must be single-valued'
    )
    expectDomainError(
      () => parseAuditEvidenceQuery({ sessionId: 7 }),
      'validation_failed',
      'Audit evidence filters must be strings'
    )
    expectDomainError(
      () => parseAuditEvidenceQuery({ sessionId: ' ' }),
      'validation_failed',
      'Audit evidence filter is invalid'
    )
    expectDomainError(
      () => parseAuditEvidenceQuery({ sessionId: 'a'.repeat(121) }),
      'validation_failed',
      'Audit evidence filter is invalid'
    )
    expectDomainError(
      () => parseAuditEvidenceQuery({ sessionId: 'value with spaces' }),
      'validation_failed',
      'Audit evidence filter is invalid'
    )
  })

  it('preserves optional audit filter absence, trimming, and direct errors', () => {
    expect(parseOptionalAuditFilter(undefined)).toBeUndefined()
    expect(parseOptionalAuditFilter(' actor-1 ')).toBe('actor-1')
    expectDomainError(
      () => parseOptionalAuditFilter(['one', 'two']),
      'validation_failed',
      'Audit evidence filters must be single-valued'
    )
    expectDomainError(
      () => parseOptionalAuditFilter(1),
      'validation_failed',
      'Audit evidence filters must be strings'
    )
  })
})
