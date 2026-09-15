import type { QueryResult, QueryResultRow } from 'pg'
import { describe, expect, it } from 'vitest'
import { PostgresRuntimeRepository } from '../postgres.ts'

const tenantId = 'tenant_00000000-0000-4000-8000-000000000a21'

type StoredAuditRow = {
  event_key: string
  event_id: string
  previous_hash: string
  event_hash: string
  payload_hash: string
  sequence: number
  event_type: string
  actor: string
  correlation_id: string
  event_timestamp: string
  payload: unknown
}

function result<T extends QueryResultRow>(rows: T[] = []): QueryResult<T> {
  return {
    command: 'SELECT',
    fields: [],
    oid: 0,
    rowCount: rows.length,
    rows
  }
}

function runtimeRecord(
  eventId: string,
  payload: unknown = { kind: 'synthetic' }
) {
  return {
    eventId,
    type: 'runtime.policy_decision',
    actor: 'op_synthetic_kernel',
    tenantId,
    correlationId: 'corr_00000000-0000-4000-8000-000000000021',
    timestamp: '2026-09-14T12:00:00.000Z',
    payload
  }
}

describe('durable runtime audit chain repository', () => {
  it('serializes the tenant head and makes semantic replay idempotent', async () => {
    const rows: StoredAuditRow[] = []
    const statements: string[] = []
    const client = {
      async query<T extends QueryResultRow = QueryResultRow>(
        text: string,
        values?: unknown[]
      ): Promise<QueryResult<T>> {
        statements.push(text)
        if (text === 'SELECT pg_advisory_xact_lock(hashtext($1))') {
          return result() as unknown as QueryResult<T>
        }
        if (text.includes('WHERE tenant_id = $1 AND event_key = $2')) {
          const eventKey = String(values?.[1])
          const found = rows.find((row) => row.event_key === eventKey)
          return result(found ? [found] : []) as unknown as QueryResult<T>
        }
        if (text.includes('ORDER BY sequence DESC')) {
          const head = rows.at(-1)
          return result(head ? [head] : []) as unknown as QueryResult<T>
        }
        if (text.includes('ORDER BY sequence ASC')) {
          return result(rows) as unknown as QueryResult<T>
        }
        if (text.startsWith('INSERT INTO runtime_audit_events')) {
          rows.push({
            event_key: String(values?.[1]),
            event_id: String(values?.[6]),
            previous_hash: String(values?.[3]),
            event_hash: String(values?.[5]),
            payload_hash: String(values?.[4]),
            sequence: Number(values?.[2]),
            event_type: String(values?.[7]),
            actor: String(values?.[8]),
            correlation_id: String(values?.[9]),
            event_timestamp: String(values?.[10]),
            payload: JSON.parse(String(values?.[11]))
          })
          return result() as unknown as QueryResult<T>
        }
        return result() as unknown as QueryResult<T>
      }
    }

    const repository = new PostgresRuntimeRepository(client, {
      tenantIsolation: true
    })
    const first = runtimeRecord('evt_trace_1_1')
    const second = runtimeRecord('evt_trace_1_2', {
      kind: 'synthetic',
      step: 2
    })

    await expect(
      repository.appendRuntimeAuditRecords(tenantId, [first])
    ).resolves.toBe(1)
    await expect(
      repository.appendRuntimeAuditRecords(tenantId, [first])
    ).resolves.toBe(0)
    await expect(
      repository.appendRuntimeAuditRecords(tenantId, [second])
    ).resolves.toBe(1)

    expect(rows).toHaveLength(2)
    expect(rows.map((row) => row.sequence)).toEqual([1, 2])
    expect(rows[1]?.event_hash).toMatch(/^[0-9a-f]{64}$/)
    expect(
      statements.filter((statement) => statement === 'BEGIN')
    ).toHaveLength(3)
    expect(
      statements.filter((statement) => statement === 'COMMIT')
    ).toHaveLength(3)
    await expect(repository.verifyRuntimeAuditChain(tenantId)).resolves.toEqual(
      {
        valid: true,
        count: 2
      }
    )

    rows[1]!.payload_hash = 'f'.repeat(64)
    await expect(
      repository.verifyRuntimeAuditChain(tenantId)
    ).resolves.toMatchObject({
      valid: false,
      count: 2,
      brokenAt: 1,
      reason: 'payload_hash_mismatch'
    })
  })

  it('rolls back and rejects records that cross the explicit tenant scope', async () => {
    const statements: string[] = []
    const client = {
      async query<T extends QueryResultRow = QueryResultRow>(
        text: string
      ): Promise<QueryResult<T>> {
        statements.push(text)
        return result() as unknown as QueryResult<T>
      }
    }
    const repository = new PostgresRuntimeRepository(client, {
      tenantIsolation: true
    })

    await expect(
      repository.appendRuntimeAuditRecords(tenantId, [
        { ...runtimeRecord('evt_trace_1_3'), tenantId: 'tenant_other' }
      ])
    ).rejects.toThrow('outside the tenant scope')
    expect(statements.at(-1)).toBe('ROLLBACK')
  })
})
