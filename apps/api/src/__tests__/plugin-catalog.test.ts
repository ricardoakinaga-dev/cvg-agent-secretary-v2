import { describe, expect, it } from 'vitest'
import { buildServer } from '../server.ts'

const tenantA = 'tenant_00000000-0000-4000-8000-000000000093'
const tenantB = 'tenant_00000000-0000-4000-8000-000000000094'

const headers = (tenantId: string) => ({
  'x-operator-id': 'admin.catalog',
  'x-operator-role': 'Admin',
  'x-tenant-id': tenantId
})

const manifest = {
  name: 'controlled.messaging',
  version: '2.0.0',
  capabilities: ['messaging.read'],
  permissions: ['messaging:read'],
  tools: [
    {
      name: 'messaging.read',
      permission: 'messaging:read',
      risk: 'low',
      requiresApproval: false
    }
  ],
  hooks: [],
  dependencies: [],
  configSchemaVersion: 'v1'
}

interface Envelope<T> {
  success: boolean
  data: T | null
  error: { code: string; message: string } | null
}

describe('controlled plugin manifest catalog API', () => {
  it('exposes tenant-isolated metadata with guarded approval transitions', async () => {
    const app = buildServer()
    const created = await app.inject({
      method: 'POST',
      url: '/v1/admin/plugins/catalog',
      headers: headers(tenantA),
      payload: { manifest }
    })
    const entry = (created.json() as Envelope<{ id: string }>).data

    const duplicate = await app.inject({
      method: 'POST',
      url: '/v1/admin/plugins/catalog',
      headers: headers(tenantA),
      payload: { manifest }
    })
    const otherTenant = await app.inject({
      method: 'GET',
      url: '/v1/admin/plugins/catalog',
      headers: headers(tenantB)
    })
    const filtered = await app.inject({
      method: 'GET',
      url: '/v1/admin/plugins/catalog?name=controlled.messaging',
      headers: headers(tenantA)
    })
    const approved = await app.inject({
      method: 'POST',
      url: `/v1/admin/plugins/catalog/${entry?.id}/transition`,
      headers: headers(tenantA),
      payload: { target: 'APPROVED', expectedStatus: 'DRAFT' }
    })
    const stale = await app.inject({
      method: 'POST',
      url: `/v1/admin/plugins/catalog/${entry?.id}/transition`,
      headers: headers(tenantA),
      payload: { target: 'ARCHIVED', expectedStatus: 'DRAFT' }
    })
    const current = await app.inject({
      method: 'GET',
      url: `/v1/admin/plugins/catalog/${entry?.id}`,
      headers: headers(tenantA)
    })
    const missing = await app.inject({
      method: 'GET',
      url: '/v1/admin/plugins/catalog/plugin_catalog_00000000-0000-4000-8000-000000000099',
      headers: headers(tenantA)
    })
    await app.close()

    expect(created.statusCode).toBe(200)
    expect(entry?.id).toMatch(/^plugin_catalog_/)
    expect(duplicate.statusCode).toBe(400)
    expect((duplicate.json() as Envelope<null>).error?.code).toBe(
      'invalid_action'
    )
    expect(otherTenant.statusCode).toBe(200)
    expect((otherTenant.json() as Envelope<unknown[]>).data).toEqual([])
    expect(filtered.statusCode).toBe(200)
    expect((filtered.json() as Envelope<unknown[]>).data).toHaveLength(1)
    expect(approved.statusCode).toBe(200)
    expect(
      (approved.json() as Envelope<{ status: string; approvedBy: string }>).data
    ).toMatchObject({ status: 'APPROVED', approvedBy: 'admin.catalog' })
    expect(stale.statusCode).toBe(409)
    expect((stale.json() as Envelope<null>).error?.code).toBe('conflict')
    expect((current.json() as Envelope<{ status: string }>).data).toMatchObject(
      {
        status: 'APPROVED'
      }
    )
    expect(missing.statusCode).toBe(400)
  })
})
