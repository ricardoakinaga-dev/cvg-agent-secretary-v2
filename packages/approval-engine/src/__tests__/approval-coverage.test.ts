import { describe, expect, it } from 'vitest'
import {
  approvalMatchesAction,
  computeApprovalPayloadHash
} from '../contracts.ts'
import { InMemoryApprovalStore } from '../store.ts'
import { ApprovalEngine } from '../engine.ts'

const TENANT = 'tenant_00000000-0000-4000-8000-000000000001'
const NOW = new Date('2026-09-11T12:00:00.000Z')

const binding = {
  action: 'appointment.cancel',
  resource: { type: 'appointment', id: 'apt_1' },
  payload: { reason: 'x' }
}

describe('approval contract edges', () => {
  it('rejects every non-matching binding dimension', () => {
    const payloadHash = computeApprovalPayloadHash(binding)
    const record = {
      action: binding.action,
      resource: binding.resource,
      payloadHash
    }
    expect(approvalMatchesAction(record, binding)).toBe(true)
    expect(
      approvalMatchesAction(record, {
        ...binding,
        action: 'appointment.modify'
      })
    ).toBe(false)
    expect(
      approvalMatchesAction(record, {
        ...binding,
        resource: { type: 'appointment', id: 'apt_2' }
      })
    ).toBe(false)
    expect(
      approvalMatchesAction(record, {
        ...binding,
        resource: { type: 'exam', id: 'apt_1' }
      })
    ).toBe(false)
    expect(
      approvalMatchesAction(record, { ...binding, payload: { reason: 'y' } })
    ).toBe(false)
    expect(
      approvalMatchesAction(
        { ...record, resource: { type: 'appointment' } },
        { ...binding, resource: { type: 'appointment', id: 'apt_1' } }
      )
    ).toBe(false)
    expect(
      approvalMatchesAction(record, {
        ...binding,
        resource: { type: 'appointment' }
      })
    ).toBe(false)
  })

  it('lists and updates store records defensively', () => {
    const store = new InMemoryApprovalStore()
    const engine = new ApprovalEngine({
      store,
      clock: () => NOW,
      idFactory: () => 'appr_00000000-0000-4000-8000-000000000001'
    })
    expect(store.get(TENANT, 'missing')).toBeUndefined()
    expect(store.list({ tenantId: TENANT })).toEqual([])
    expect(store.listExpiringBefore(NOW.toISOString(), ['PENDING'])).toEqual([])
    expect(
      store.update(TENANT, 'missing', 'PENDING', (current) => current)
    ).toBeUndefined()

    const record = engine.request({
      tenantId: TENANT,
      operatorId: 'op_1',
      agentId: 'agent_1',
      agentVersion: 'v1',
      action: binding.action,
      resource: binding.resource,
      payload: binding.payload,
      policyVersion: 'v1',
      correlationId: 'corr_00000000-0000-4000-8000-000000000001'
    })
    expect(
      store.list({ tenantId: TENANT, status: 'REQUESTED', limit: 1 })
    ).toHaveLength(1)
    expect(store.list({ tenantId: TENANT, status: 'APPROVED' })).toHaveLength(0)
    expect(
      store.update(TENANT, record.approvalId, 'APPROVED', (current) => current)
    ).toBeUndefined()
  })

  it('cancels rejected and non-authorized approvals defensively', () => {
    let counter = 0
    const engine = new ApprovalEngine({
      clock: () => NOW,
      idFactory: () => {
        counter += 1
        return `appr_00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`
      }
    })
    const record = engine.request({
      tenantId: TENANT,
      operatorId: 'op_1',
      agentId: 'agent_1',
      agentVersion: 'v1',
      action: binding.action,
      resource: binding.resource,
      payload: binding.payload,
      policyVersion: 'v1',
      correlationId: 'corr_00000000-0000-4000-8000-000000000001'
    })
    expect(() =>
      engine.cancel(TENANT, record.approvalId, 'op_other')
    ).toThrowError(/requesting operator/)
    engine.submit(TENANT, record.approvalId, 'op_1')
    expect(() => engine.submit(TENANT, record.approvalId, 'op_1')).toThrowError(
      /REQUESTED/
    )
    engine.approve(TENANT, record.approvalId, { approverId: 'op_2' })
    expect(() => engine.cancel(TENANT, record.approvalId, 'op_1')).toThrowError(
      /REQUESTED or PENDING/
    )
  })
})
