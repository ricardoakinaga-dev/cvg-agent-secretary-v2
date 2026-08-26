import { describe, expect, it } from 'vitest'
import { buildServer } from '../server.ts'

const tenantA = 'tenant_00000000-0000-0000-0000-000000000101'
const tenantB = 'tenant_00000000-0000-0000-0000-000000000102'

const adminHeaders = (tenantId: string) => ({
  'x-operator-id': 'admin.knowledge',
  'x-operator-role': 'Admin',
  'x-tenant-id': tenantId
})

describe('knowledge source catalog API', () => {
  it('creates, lists and transitions metadata without exposing content or crossing tenants', async () => {
    const app = buildServer()
    const create = await app.inject({
      method: 'POST',
      url: '/v1/admin/knowledge-sources',
      headers: adminHeaders(tenantA),
      payload: {
        source: 'controlled://institutional-hours',
        version: 'v1',
        label: 'Horários fictícios',
        description: 'Metadata controlada sem conteúdo.'
      }
    })
    const created = (create.json() as { data: { id: string } }).data
    expect(create.statusCode).toBe(200)
    expect(created.id).toMatch(/^knowledge_source_/)

    const duplicate = await app.inject({
      method: 'POST',
      url: '/v1/admin/knowledge-sources',
      headers: adminHeaders(tenantA),
      payload: {
        source: 'controlled://institutional-hours',
        version: 'v1',
        label: 'Duplicada',
        description: ''
      }
    })
    expect(duplicate.statusCode).toBe(400)

    const unsafe = await app.inject({
      method: 'POST',
      url: '/v1/admin/knowledge-sources',
      headers: adminHeaders(tenantA),
      payload: {
        source: 'https://external.example/source',
        version: 'v1',
        label: 'Unsafe',
        description: ''
      }
    })
    expect(unsafe.statusCode).toBe(400)

    const approve = await app.inject({
      method: 'POST',
      url: `/v1/admin/knowledge-sources/${created.id}/transition`,
      headers: adminHeaders(tenantA),
      payload: { target: 'APPROVED', expectedStatus: 'DRAFT' }
    })
    expect(approve.statusCode).toBe(200)
    expect((approve.json() as { data: { status: string } }).data.status).toBe(
      'APPROVED'
    )

    const stale = await app.inject({
      method: 'POST',
      url: `/v1/admin/knowledge-sources/${created.id}/transition`,
      headers: adminHeaders(tenantA),
      payload: { target: 'ARCHIVED', expectedStatus: 'DRAFT' }
    })
    expect(stale.statusCode).toBe(409)

    const otherTenant = await app.inject({
      method: 'GET',
      url: '/v1/admin/knowledge-sources',
      headers: adminHeaders(tenantB)
    })
    expect(otherTenant.statusCode).toBe(200)
    expect((otherTenant.json() as { data: unknown[] }).data).toEqual([])
    expect(JSON.stringify(approve.json())).not.toContain('conteúdo documental')
    await app.close()
  })
})
