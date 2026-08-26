import { describe, expect, it } from 'vitest'
import type { QueryResult, QueryResultRow } from 'pg'
import type {
  CapabilityApprovalIssueInput,
  CapabilityApprovalVerificationInput
} from '@cvg/platform'
import {
  PostgresCapabilityApprovalRepository,
  type PostgresTransactionClient
} from '../index.ts'

const tenantId = 'tenant_00000000-0000-4000-8000-000000000141' as const
const agentId = 'agent_00000000-0000-4000-8000-000000000141' as const
const versionId = 'agent_version_00000000-0000-4000-8000-000000000141' as const
const approvalId = 'approval_00000000-0000-4000-8000-000000000141'
const traceId = 'trace_00000000-0000-4000-8000-000000000141'

type ApprovalRow = {
  id: string
  tenant_id: typeof tenantId
  agent_id: typeof agentId
  version_id: typeof versionId
  tool_name: string
  input_hash: string
  actor_id: string
  nonce: string
  issuer: string
  expires_at: Date
  issued_at: Date
  status: 'issued' | 'consumed' | 'revoked' | 'expired'
  consumed_at: Date | null
  revoked_at: Date | null
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

function issueInput(
  overrides: Partial<CapabilityApprovalIssueInput> = {}
): CapabilityApprovalIssueInput {
  return {
    tenantId,
    agentId,
    versionId,
    toolName: 'find_available_slots',
    input: { b: 2, a: 1 },
    actorId: 'operator.fixture',
    issuer: 'approver.fixture',
    expiresAt: new Date('2026-09-01T12:00:00.000Z'),
    ...overrides
  }
}

function verifyInput(
  approvalIdValue: string = approvalId,
  overrides: Partial<CapabilityApprovalVerificationInput> = {}
): CapabilityApprovalVerificationInput {
  return {
    approvalId: approvalIdValue,
    tenantId,
    agentId,
    versionId,
    toolName: 'find_available_slots',
    input: { a: 1, b: 2 },
    actorId: 'operator.fixture',
    ...overrides
  }
}

class FakeApprovalClient implements PostgresTransactionClient {
  row: ApprovalRow | null = null
  duplicate = false
  consumeMissing = false
  readonly queries: string[] = []
  readonly auditValues: unknown[][] = []

  release(): void {}

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ): Promise<QueryResult<T>> {
    this.queries.push(text)
    if (text.includes('INSERT INTO audit_events')) {
      this.auditValues.push([...(values ?? [])])
    }
    if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') {
      return result([]) as unknown as QueryResult<T>
    }
    if (text.includes('INSERT INTO platform_capability_approvals')) {
      if (this.duplicate) {
        throw Object.assign(new Error('duplicate'), { code: '23505' })
      }
      const inputValues = values as unknown[]
      this.row = {
        id: inputValues[0] as string,
        tenant_id: inputValues[1] as typeof tenantId,
        agent_id: inputValues[2] as typeof agentId,
        version_id: inputValues[3] as typeof versionId,
        tool_name: inputValues[4] as string,
        input_hash: inputValues[5] as string,
        actor_id: inputValues[6] as string,
        nonce: inputValues[7] as string,
        issuer: inputValues[8] as string,
        expires_at: inputValues[9] as Date,
        issued_at: inputValues[10] as Date,
        status: 'issued',
        consumed_at: null,
        revoked_at: null
      }
      return result([this.row]) as unknown as QueryResult<T>
    }
    if (text.includes("SET status = 'expired'")) {
      if (this.row) this.row = { ...this.row, status: 'expired' }
      return result([]) as unknown as QueryResult<T>
    }
    if (text.includes("SET status = 'consumed'")) {
      if (this.consumeMissing) {
        return result([]) as unknown as QueryResult<T>
      }
      if (this.row) {
        this.row = {
          ...this.row,
          status: 'consumed',
          consumed_at: values?.[2] as Date
        }
      }
      return result(this.row ? [this.row] : []) as unknown as QueryResult<T>
    }
    if (text.includes("SET status = 'revoked'")) {
      const matches =
        this.row?.id === values?.[0] &&
        this.row?.issuer === values?.[2] &&
        this.row?.tenant_id === values?.[3] &&
        this.row?.status === 'issued'
      if (matches && this.row) {
        this.row = {
          ...this.row,
          status: 'revoked',
          revoked_at: values?.[1] as Date
        }
        return result([{ id: this.row.id }]) as unknown as QueryResult<T>
      }
      return result([]) as unknown as QueryResult<T>
    }
    if (text.includes('FROM platform_capability_approvals')) {
      if (text.includes('tenant_id = $1') && values?.[0] !== tenantId) {
        return result([]) as unknown as QueryResult<T>
      }
      return result(this.row ? [this.row] : []) as unknown as QueryResult<T>
    }
    return result([]) as unknown as QueryResult<T>
  }
}

describe('PostgresCapabilityApprovalRepository', () => {
  it('validates, persists, hashes and consumes a binding once', async () => {
    const client = new FakeApprovalClient()
    const now = new Date('2026-09-01T10:00:00.000Z')
    const repository = new PostgresCapabilityApprovalRepository(client, {
      now: () => now
    })
    const issued = await repository.issue(
      issueInput({ nonce: 'nonce_fake_repository' })
    )
    expect(issued).toMatchObject({ status: 'issued', tenantId, agentId })
    expect(issued.inputHash).toMatch(/^[0-9a-f]{64}$/)

    const consumed = await repository.verifyAndConsume(
      verifyInput(issued.id, {
        consumptionAudit: {
          correlationId: 'corr_00000000-0000-4000-8000-000000000142',
          policyVersion: 'approval-repository-test-v1',
          traceId
        }
      })
    )
    expect(consumed).toMatchObject({ id: issued.id, status: 'consumed' })
    await expect(
      repository.verifyAndConsume(verifyInput(issued.id))
    ).resolves.toBeNull()
    await expect(repository.get(issued.id, tenantId)).resolves.toMatchObject({
      status: 'consumed'
    })
    expect(client.queries).toContain('BEGIN')
    expect(client.queries).toContain('COMMIT')
    const auditIndex = client.queries.findIndex((query) =>
      query.includes('INSERT INTO audit_events')
    )
    const commitIndex = client.queries.findIndex(
      (query, index) => index > auditIndex && query === 'COMMIT'
    )
    expect(auditIndex).toBeGreaterThanOrEqual(0)
    expect(commitIndex).toBeGreaterThan(auditIndex)
    const persistedAuditPayload = JSON.parse(
      client.auditValues[0]?.[4] as string
    ) as { traceId?: string }
    expect(persistedAuditPayload.traceId).toBe(traceId)
  })

  it('does not emit consumption evidence when the guarded transition wins no row', async () => {
    const client = new FakeApprovalClient()
    const repository = new PostgresCapabilityApprovalRepository(client, {
      now: () => new Date('2026-09-01T10:00:00.000Z')
    })
    const issued = await repository.issue(
      issueInput({ nonce: 'nonce_missing_transition' })
    )
    client.consumeMissing = true

    await expect(
      repository.verifyAndConsume(
        verifyInput(issued.id, {
          consumptionAudit: {
            correlationId: 'corr_00000000-0000-4000-8000-000000000143',
            policyVersion: 'approval-repository-test-v1'
          }
        })
      )
    ).resolves.toBeNull()
    expect(
      client.queries.some((query) => query.includes('INSERT INTO audit_events'))
    ).toBe(false)
  })

  it('fails closed for malformed, substituted, expired, revoked and duplicate approvals', async () => {
    let now = new Date('2026-09-01T10:00:00.000Z')
    const client = new FakeApprovalClient()
    const repository = new PostgresCapabilityApprovalRepository(client, {
      now: () => now
    })

    await expect(
      repository.issue(issueInput({ expiresAt: new Date('invalid') }))
    ).rejects.toThrow('Approval expiry')
    await expect(
      repository.issue(
        issueInput({ expiresAt: new Date('2026-09-01T10:00:00Z') })
      )
    ).rejects.toThrow('future')
    await expect(
      repository.issue(issueInput({ input: undefined }))
    ).rejects.toThrow('JSON serializable')
    await expect(
      repository.verifyAndConsume(verifyInput('invalid'))
    ).resolves.toBeNull()
    await expect(repository.get('invalid', tenantId)).resolves.toBeNull()
    await expect(
      repository.revoke('invalid', 'issuer', tenantId)
    ).resolves.toBe(false)

    const substitution = await repository.issue(
      issueInput({ nonce: 'nonce_substitution_repository' })
    )
    await expect(
      repository.verifyAndConsume(
        verifyInput(substitution.id, { input: { different: true } })
      )
    ).resolves.toBeNull()
    await expect(
      repository.verifyAndConsume(
        verifyInput(substitution.id, { input: undefined })
      )
    ).resolves.toBeNull()
    await expect(
      repository.verifyAndConsume(
        verifyInput(substitution.id, {
          consumptionAudit: {
            correlationId: ' ',
            policyVersion: 'approval-repository-test-v1'
          }
        })
      )
    ).resolves.toBeNull()
    await expect(
      repository.verifyAndConsume(
        verifyInput(substitution.id, {
          consumptionAudit: {
            correlationId: 'corr_00000000-0000-4000-8000-000000000144',
            policyVersion: 'approval-repository-test-v1',
            traceId: 'trace-invalid' as never
          }
        })
      )
    ).resolves.toBeNull()
    client.duplicate = true
    await expect(
      repository.issue(issueInput({ nonce: 'nonce_duplicate_repository' }))
    ).rejects.toThrow('nonce already exists')
    client.duplicate = false

    const expired = await repository.issue(
      issueInput({
        nonce: 'nonce_expired_repository',
        expiresAt: new Date('2026-09-01T11:00:00Z')
      })
    )
    now = new Date('2026-09-01T11:00:00.001Z')
    await expect(
      repository.verifyAndConsume(verifyInput(expired.id))
    ).resolves.toBeNull()

    now = new Date('2026-09-01T10:00:00.000Z')
    client.row = null
    const revoked = await repository.issue(
      issueInput({ nonce: 'nonce_revoked_repository' })
    )
    await expect(
      repository.revoke(revoked.id, 'other', tenantId)
    ).resolves.toBe(false)
    await expect(
      repository.revoke(revoked.id, 'approver.fixture', tenantId)
    ).resolves.toBe(true)
    await expect(
      repository.verifyAndConsume(verifyInput(revoked.id))
    ).resolves.toBeNull()
  })
})
