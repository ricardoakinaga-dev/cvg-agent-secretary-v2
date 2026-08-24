import { describe, expect, it } from 'vitest'
import {
  InMemoryCapabilityApprovalAuthority,
  canonicalizeCapabilityInput,
  createCapabilityInputHash,
  type CapabilityApprovalIssueInput,
  type CapabilityApprovalVerificationInput
} from '../approval-authority.ts'

const tenantA = 'tenant_00000000-0000-4000-8000-000000000101' as const
const tenantB = 'tenant_00000000-0000-4000-8000-000000000102' as const
const agentId = 'agent_00000000-0000-4000-8000-000000000101' as const
const versionId = 'agent_version_00000000-0000-4000-8000-000000000101' as const

function issueInput(
  overrides: Partial<CapabilityApprovalIssueInput> = {}
): CapabilityApprovalIssueInput {
  return {
    tenantId: tenantA,
    agentId,
    versionId,
    toolName: 'approve-controlled-read',
    input: { slot: '2026-09-01T10:00:00-03:00', nested: { b: 2, a: 1 } },
    actorId: 'operator.fixture',
    issuer: 'approver.fixture',
    expiresAt: new Date('2026-09-01T12:00:00.000Z'),
    ...overrides
  }
}

function verificationInput(
  overrides: Partial<CapabilityApprovalVerificationInput> = {}
): CapabilityApprovalVerificationInput {
  return {
    approvalId: 'approval_missing',
    tenantId: tenantA,
    agentId,
    versionId,
    toolName: 'approve-controlled-read',
    input: { slot: '2026-09-01T10:00:00-03:00', nested: { a: 1, b: 2 } },
    actorId: 'operator.fixture',
    ...overrides
  }
}

describe('durable capability approval contract', () => {
  it('hashes the complete binding and canonicalizes object key order', () => {
    const first = createCapabilityInputHash({
      tenantId: tenantA,
      agentId,
      versionId,
      toolName: 'find_available_slots',
      input: { b: 2, a: 1 }
    })
    const second = createCapabilityInputHash({
      tenantId: tenantA,
      agentId,
      versionId,
      toolName: 'find_available_slots',
      input: { a: 1, b: 2 }
    })
    const otherTenant = createCapabilityInputHash({
      tenantId: tenantB,
      agentId,
      versionId,
      toolName: 'find_available_slots',
      input: { a: 1, b: 2 }
    })

    expect(first).toBe(second)
    expect(first).toMatch(/^[0-9a-f]{64}$/)
    expect(otherTenant).not.toBe(first)
  })

  it('issues immutable approvals and consumes each nonce once', async () => {
    let now = new Date('2026-09-01T10:00:00.000Z')
    const authority = new InMemoryCapabilityApprovalAuthority(() => now)
    const issued = await authority.issue(issueInput())

    expect(issued).toMatchObject({
      tenantId: tenantA,
      toolName: 'approve-controlled-read',
      actorId: 'operator.fixture',
      issuer: 'approver.fixture',
      status: 'issued'
    })
    expect(issued.inputHash).toBe(createCapabilityInputHash(issueInput()))
    expect(issued.nonce).toBeTruthy()

    const consumed = await authority.verifyAndConsume(
      verificationInput({ approvalId: issued.id })
    )
    expect(consumed).toMatchObject({ id: issued.id, status: 'consumed' })
    await expect(
      authority.verifyAndConsume(verificationInput({ approvalId: issued.id }))
    ).resolves.toBeNull()
    expect(await authority.get(issued.id, tenantA)).toMatchObject({
      status: 'consumed'
    })
    now = new Date('2026-09-01T11:00:00.000Z')
    expect(await authority.get(issued.id, tenantA)).not.toBe(issued)
  })

  it('blocks input substitution, cross-tenant use, expiry and revocation', async () => {
    let now = new Date('2026-09-01T10:00:00.000Z')
    const authority = new InMemoryCapabilityApprovalAuthority(() => now)
    const issued = await authority.issue(issueInput())

    await expect(
      authority.verifyAndConsume(
        verificationInput({
          approvalId: issued.id,
          input: { slot: '2026-09-01T14:00:00-03:00' }
        })
      )
    ).resolves.toBeNull()
    await expect(
      authority.verifyAndConsume(
        verificationInput({ approvalId: issued.id, tenantId: tenantB })
      )
    ).resolves.toBeNull()

    const revoked = await authority.issue(issueInput())
    expect(
      await authority.revoke(revoked.id, 'approver.fixture', tenantA)
    ).toBe(true)
    await expect(
      authority.verifyAndConsume(verificationInput({ approvalId: revoked.id }))
    ).resolves.toBeNull()

    const expired = await authority.issue(issueInput())
    now = new Date('2026-09-01T12:00:00.001Z')
    await expect(
      authority.verifyAndConsume(verificationInput({ approvalId: expired.id }))
    ).resolves.toBeNull()
    expect(await authority.get(expired.id, tenantA)).toMatchObject({
      status: 'expired'
    })
  })

  it('rejects malformed bindings, duplicate nonces and non-JSON input', async () => {
    const authority = new InMemoryCapabilityApprovalAuthority(
      () => new Date('2026-09-01T10:00:00.000Z')
    )
    await expect(
      authority.issue(issueInput({ expiresAt: new Date('invalid') }))
    ).rejects.toThrow('Approval expiry')
    await expect(
      authority.issue(
        issueInput({ expiresAt: new Date('2026-09-01T10:00:00.000Z') })
      )
    ).rejects.toThrow('future')
    await expect(
      authority.issue(issueInput({ toolName: '   ' }))
    ).rejects.toThrow('binding fields')
    await expect(
      authority.issue(issueInput({ actorId: '   ' }))
    ).rejects.toThrow('binding fields')
    await expect(
      authority.issue(issueInput({ issuer: '   ' }))
    ).rejects.toThrow('binding fields')
    await expect(
      authority.issue(
        issueInput({ actorId: 'same.identity', issuer: 'same.identity' })
      )
    ).rejects.toThrow('different')
    await expect(
      authority.issue(issueInput({ nonce: 'nonce_fixture' }))
    ).resolves.toBeDefined()
    await expect(
      authority.issue(issueInput({ nonce: 'nonce_fixture' }))
    ).rejects.toThrow('nonce already exists')
    await expect(
      authority.issue(issueInput({ input: undefined }))
    ).rejects.toThrow('JSON serializable')
    await expect(
      authority.issue({
        ...issueInput(),
        tenantId: 'invalid' as typeof tenantA
      })
    ).rejects.toThrow()
    await expect(authority.get('approval_missing', tenantA)).resolves.toBeNull()
    await expect(
      authority.verifyAndConsume(verificationInput())
    ).resolves.toBeNull()
    await expect(
      authority.revoke('approval_missing', 'issuer', tenantA)
    ).resolves.toBe(false)
    await expect(authority.get('approval_missing')).resolves.toBeNull()
  })

  it('canonicalizes JSON primitives, arrays, dates and rejects cycles/non-finite values', () => {
    expect(
      canonicalizeCapabilityInput({
        nullValue: null,
        booleanValue: true,
        numberValue: 1,
        dateValue: new Date('2026-09-01T10:00:00.000Z'),
        arrayValue: ['a', false]
      })
    ).toContain('"dateValue":"2026-09-01T10:00:00.000Z"')
    expect(() => canonicalizeCapabilityInput(Number.NaN)).toThrow('finite')
    expect(() => canonicalizeCapabilityInput(undefined)).toThrow(
      'JSON serializable'
    )
    const cyclic: { self?: unknown } = {}
    cyclic.self = cyclic
    expect(() => canonicalizeCapabilityInput(cyclic)).toThrow('cycle')
  })

  it('rejects revocation by another issuer and preserves immutable revocation state', async () => {
    const authority = new InMemoryCapabilityApprovalAuthority(
      () => new Date('2026-09-01T10:00:00.000Z')
    )
    const issued = await authority.issue(issueInput({ nonce: 'nonce_revoke' }))
    await expect(
      authority.revoke(issued.id, 'other.issuer', tenantA)
    ).resolves.toBe(false)
    await expect(
      authority.revoke(issued.id, 'approver.fixture', tenantA)
    ).resolves.toBe(true)
    await expect(
      authority.revoke(issued.id, 'approver.fixture', tenantA)
    ).resolves.toBe(false)
    await expect(
      authority.verifyAndConsume(verificationInput({ approvalId: issued.id }))
    ).resolves.toBeNull()
    const record = await authority.get(issued.id, tenantA)
    expect(record).toMatchObject({ status: 'revoked' })
    expect(record?.revokedAt).toBeInstanceOf(Date)
  })
})
