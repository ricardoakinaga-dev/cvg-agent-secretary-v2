import { describe, expect, it } from 'vitest'
import { InMemoryControlPlaneStore, type PluginManifest } from '../index.ts'

const tenantA = 'tenant_00000000-0000-4000-8000-000000000091'
const tenantB = 'tenant_00000000-0000-4000-8000-000000000092'

function manifest(overrides: Partial<PluginManifest> = {}): PluginManifest {
  return {
    name: 'controlled.calendar',
    version: '1.2.3',
    capabilities: ['calendar.read'],
    permissions: ['scheduling:read'],
    tools: [
      {
        name: 'calendar.read',
        permission: 'scheduling:read',
        risk: 'low',
        requiresApproval: false
      }
    ],
    hooks: [],
    dependencies: [],
    configSchemaVersion: 'v1',
    ...overrides
  }
}

describe('controlled plugin manifest catalog', () => {
  it('keeps immutable tenant-scoped metadata with guarded lifecycle', async () => {
    const store = new InMemoryControlPlaneStore()
    const scopeA = { tenantId: tenantA }

    const draft = await store.createPluginCatalogEntry(
      scopeA,
      { manifest: manifest() },
      'admin.catalog'
    )

    expect(draft).toMatchObject({
      tenantId: tenantA,
      status: 'DRAFT',
      createdBy: 'admin.catalog',
      approvedBy: null,
      manifest: { name: 'controlled.calendar', version: '1.2.3' }
    })
    expect(draft.id).toMatch(/^plugin_catalog_/)

    draft.manifest.capabilities.push('mutated.outside')
    const storedDraft = await store.getPluginCatalogEntry(scopeA, draft.id)
    expect(storedDraft?.manifest.capabilities).toEqual(['calendar.read'])
    await expect(
      store.listPluginCatalogEntries(scopeA, 'controlled.calendar')
    ).resolves.toMatchObject([{ id: draft.id }])
    await expect(
      store.listPluginCatalogEntries(scopeA, '   ')
    ).rejects.toMatchObject({ code: 'validation_failed' })

    await expect(
      store.createPluginCatalogEntry(
        scopeA,
        { manifest: manifest() },
        'admin.catalog'
      )
    ).rejects.toMatchObject({ code: 'invalid_action' })

    await expect(
      store.listPluginCatalogEntries({ tenantId: tenantB })
    ).resolves.toEqual([])

    const approved = await store.transitionPluginCatalogEntry(
      scopeA,
      draft.id,
      'APPROVED',
      'approver.catalog',
      'DRAFT'
    )
    expect(approved).toMatchObject({
      status: 'APPROVED',
      approvedBy: 'approver.catalog'
    })

    await expect(
      store.transitionPluginCatalogEntry(
        scopeA,
        draft.id,
        'ARCHIVED',
        'admin.catalog',
        'DRAFT'
      )
    ).rejects.toMatchObject({ code: 'conflict' })
    await expect(
      store.getPluginCatalogEntry(scopeA, draft.id)
    ).resolves.toMatchObject({ status: 'APPROVED' })

    await expect(
      store.resolveApprovedPlugin(scopeA, 'controlled.calendar', '1.2.3')
    ).resolves.toEqual(manifest())

    const beta = await store.createPluginCatalogEntry(
      scopeA,
      { manifest: manifest({ version: 'beta' }) },
      'admin.catalog'
    )
    await store.transitionPluginCatalogEntry(
      scopeA,
      beta.id,
      'APPROVED',
      'approver.catalog'
    )
    await expect(
      store.resolveApprovedPlugin(scopeA, 'controlled.calendar')
    ).resolves.toEqual(manifest({ version: 'beta' }))
    await expect(
      store.resolveApprovedPlugin(scopeA, 'controlled.calendar', 'missing')
    ).resolves.toBeNull()

    const directArchive = await store.createPluginCatalogEntry(
      scopeA,
      {
        manifest: manifest({
          name: 'controlled.archive',
          version: '1.0.0'
        })
      },
      'admin.catalog'
    )
    await expect(
      store.transitionPluginCatalogEntry(
        scopeA,
        directArchive.id,
        'ARCHIVED',
        'admin.catalog'
      )
    ).resolves.toMatchObject({ status: 'ARCHIVED' })

    const archived = await store.transitionPluginCatalogEntry(
      scopeA,
      draft.id,
      'ARCHIVED',
      'admin.catalog',
      'APPROVED'
    )
    expect(archived.status).toBe('ARCHIVED')
    await expect(
      store.resolveApprovedPlugin(scopeA, 'controlled.calendar', '1.2.3')
    ).resolves.toBeNull()
    await expect(
      store.transitionPluginCatalogEntry(
        scopeA,
        draft.id,
        'APPROVED',
        'admin.catalog',
        'ARCHIVED'
      )
    ).rejects.toMatchObject({ code: 'invalid_action' })
    await expect(
      store.getPluginCatalogEntry(
        scopeA,
        'plugin_catalog_00000000-0000-4000-8000-000000000099'
      )
    ).resolves.toBeNull()
    await expect(
      store.transitionPluginCatalogEntry(
        scopeA,
        'plugin_catalog_00000000-0000-4000-8000-000000000099',
        'ARCHIVED',
        'admin.catalog'
      )
    ).rejects.toMatchObject({ code: 'invalid_action' })
    await expect(
      store.resolveApprovedPlugin(scopeA, '   ')
    ).rejects.toMatchObject({ code: 'validation_failed' })
  })
})
