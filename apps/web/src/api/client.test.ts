import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  apiClient,
  type OperatorIdentity,
  type PlatformPluginManifestView
} from './client.ts'

const identity: OperatorIdentity & { tenantId: string } = {
  operatorId: 'admin.catalog',
  role: 'Admin',
  tenantId: 'tenant_00000000-0000-4000-8000-000000000061'
}

const manifest: PlatformPluginManifestView = {
  name: 'fake.echo',
  version: '1.0.0',
  capabilities: ['controlled.echo'],
  permissions: ['tool:echo'],
  tools: [
    {
      name: 'echo',
      permission: 'tool:echo',
      risk: 'low',
      requiresApproval: false
    }
  ],
  hooks: [],
  dependencies: [],
  configSchemaVersion: '1'
}

const envelope = <T>(data: T) =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        success: true,
        data,
        error: null,
        meta: { correlationId: 'corr_catalog_client' }
      })
  } as Response)

afterEach(() => {
  vi.restoreAllMocks()
})

describe('platform plugin catalog client', () => {
  it('sends tenant identity for metadata list/create/transition without secrets or code', async () => {
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = []
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      calls.push([input, init])
      return envelope([])
    })

    await apiClient.listPlatformPluginCatalog(identity, 'fake.echo')
    await apiClient.createPlatformPluginCatalog({ identity, manifest })
    await apiClient.transitionPlatformPluginCatalog({
      identity,
      pluginId: 'plugin_catalog_00000000-0000-4000-8000-000000000061',
      target: 'APPROVED',
      expectedStatus: 'DRAFT'
    })
    await apiClient.transitionPlatformPluginCatalog({
      identity,
      pluginId: 'plugin_catalog_00000000-0000-4000-8000-000000000061',
      target: 'ARCHIVED'
    })

    expect(calls[0]?.[0]).toBe('/v1/admin/plugins/catalog?name=fake.echo')
    for (const [, init] of calls) {
      expect(init?.headers).toMatchObject({
        'x-operator-id': identity.operatorId,
        'x-operator-role': identity.role,
        'x-tenant-id': identity.tenantId
      })
    }

    const createBody = JSON.parse(String(calls[1]?.[1]?.body)) as Record<
      string,
      unknown
    >
    expect(createBody).toEqual({ manifest })
    expect(JSON.stringify(createBody)).not.toMatch(
      /apiKey|secret|handler|sourceCode|executable/i
    )
    expect(JSON.parse(String(calls[2]?.[1]?.body))).toEqual({
      target: 'APPROVED',
      expectedStatus: 'DRAFT'
    })
    expect(JSON.parse(String(calls[3]?.[1]?.body))).toEqual({
      target: 'ARCHIVED'
    })
  })
})
