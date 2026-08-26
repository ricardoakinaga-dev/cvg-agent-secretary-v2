import type { QueryResult, QueryResultRow } from 'pg'
import { describe, expect, it } from 'vitest'
import {
  readPostgresMigrationSql,
  PostgresRuntimeRepository,
  type PostgresQueryable
} from '../postgres.ts'

const tenantId = 'tenant_00000000-0000-4000-8000-000000000111'
const otherTenantId = 'tenant_00000000-0000-4000-8000-000000000112'
const sessionId = 'sess_00000000-0000-4000-8000-000000000111'
const firstEventId = 'audit_00000000-0000-4000-8000-000000000111'
const secondEventId = 'audit_00000000-0000-4000-8000-000000000112'

interface CheckpointRow {
  tenant_id: string
  id: string
  filters: unknown
  event_ids: unknown
  event_count: number
  evidence_digest: string
  status: 'SEALED' | 'ARCHIVED'
  created_by: string
  updated_by: string
  created_at: Date
  updated_at: Date
}

function result<T extends QueryResultRow>(rows: T[]): QueryResult<T> {
  return {
    command: 'SELECT',
    fields: [],
    oid: 0,
    rowCount: rows.length,
    rows
  }
}

class AuditCheckpointClient implements PostgresQueryable {
  readonly queries: Array<{ text: string; values: unknown[] }> = []
  private readonly checkpoints: CheckpointRow[] = []
  private readonly events = [
    {
      id: firstEventId,
      tenant_id: tenantId,
      type: 'integration_event' as const,
      actor_type: 'System' as const,
      actor_id: 'system.checkpoint',
      correlation_id: 'corr_00000000-0000-4000-8000-000000000111',
      policy_version: 'checkpoint-test-v1',
      payload: {
        tenantId,
        sessionId,
        safe: 'metadata'
      },
      created_at: new Date('2026-08-25T10:00:00.000Z')
    },
    {
      id: secondEventId,
      tenant_id: tenantId,
      type: 'approval_decision' as const,
      actor_type: 'Supervisor' as const,
      actor_id: 'supervisor.checkpoint',
      correlation_id: 'corr_00000000-0000-4000-8000-000000000112',
      policy_version: 'checkpoint-test-v1',
      payload: {
        tenantId,
        sessionId,
        safe: 'decision-metadata'
      },
      created_at: new Date('2026-08-25T10:01:00.000Z')
    }
  ]

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values: unknown[] = []
  ): Promise<QueryResult<T>> {
    this.queries.push({ text, values })
    if (/^(BEGIN|COMMIT|ROLLBACK)$/.test(text)) return result<T>([])
    if (text.includes('FROM audit_events')) {
      const ids = values[0] as string[]
      const scope = String(values[1] ?? '')
      return result(
        this.events.filter(
          (event) => ids.includes(event.id) && event.tenant_id === scope
        ) as unknown as T[]
      )
    }
    if (text.includes('INSERT INTO audit_evidence_checkpoints')) {
      this.checkpoints.push({
        tenant_id: String(values[0]),
        id: String(values[1]),
        filters: JSON.parse(String(values[2])),
        event_ids: JSON.parse(String(values[3])),
        event_count: Number(values[4]),
        evidence_digest: String(values[5]),
        status: values[6] as CheckpointRow['status'],
        created_by: String(values[7]),
        updated_by: String(values[8]),
        created_at: values[9] as Date,
        updated_at: values[10] as Date
      })
      return result<T>([])
    }
    if (text.includes('UPDATE audit_evidence_checkpoints')) {
      const checkpoint = this.checkpoints.find(
        (candidate) =>
          candidate.tenant_id === String(values[0]) &&
          candidate.id === String(values[1]) &&
          candidate.status === values[5]
      )
      if (!checkpoint) return result<T>([])
      checkpoint.status = values[2] as CheckpointRow['status']
      checkpoint.updated_by = String(values[3])
      checkpoint.updated_at = values[4] as Date
      return result([checkpoint] as unknown as T[])
    }
    if (text.includes('FROM audit_evidence_checkpoints')) {
      const tenant = String(values[0])
      const rows = this.checkpoints.filter((checkpoint) => {
        if (checkpoint.tenant_id !== tenant) return false
        return values[1] === undefined || checkpoint.id === String(values[1])
      })
      return result(rows as unknown as T[])
    }
    return result<T>([])
  }
}

describe('Postgres audit evidence checkpoint repository', () => {
  it('uses tenant-scoped parameterized queries and preserves the lifecycle', async () => {
    const client = new AuditCheckpointClient()
    const repository = new PostgresRuntimeRepository(client, {
      tenantIsolation: true
    })

    const checkpoint = await repository.createAuditEvidenceCheckpoint(
      {
        eventIds: [secondEventId, firstEventId],
        filters: { sessionId }
      },
      'supervisor.checkpoint',
      tenantId
    )
    expect(checkpoint).toMatchObject({
      tenantId,
      eventIds: [firstEventId, secondEventId],
      status: 'SEALED'
    })
    expect(
      await repository.listAuditEvidenceCheckpoints(tenantId)
    ).toHaveLength(1)
    expect(
      await repository.getAuditEvidenceCheckpoint(checkpoint.id, otherTenantId)
    ).toBeNull()

    const archived = await repository.transitionAuditEvidenceCheckpoint(
      checkpoint.id,
      'ARCHIVED',
      'admin.checkpoint',
      'SEALED',
      tenantId
    )
    expect(archived?.status).toBe('ARCHIVED')
    await expect(
      repository.transitionAuditEvidenceCheckpoint(
        checkpoint.id,
        'ARCHIVED',
        'admin.checkpoint',
        'SEALED',
        tenantId
      )
    ).rejects.toMatchObject({ code: 'conflict' })
    expect(
      client.queries.some(
        ({ text, values }) =>
          text.includes('FROM audit_events') && values[1] === tenantId
      )
    ).toBe(true)
    expect(client.queries.filter(({ text }) => text === 'BEGIN').length).toBe(3)
  })

  it('ships the migration with RLS, immutable identity and bounded metadata checks', async () => {
    const migration = await readPostgresMigrationSql(
      '0007_audit_evidence_checkpoint'
    )
    expect(migration).toContain(
      'CREATE TABLE IF NOT EXISTS audit_evidence_checkpoints'
    )
    expect(migration).toContain('FORCE ROW LEVEL SECURITY')
    expect(migration).toContain(
      'Audit evidence checkpoint identity is immutable'
    )
    expect(migration).toContain("status IN ('SEALED', 'ARCHIVED')")
    expect(migration).toContain(
      'jsonb_array_length(event_ids) BETWEEN 1 AND 200'
    )
    expect(migration).not.toContain('payload jsonb')
  })
})
