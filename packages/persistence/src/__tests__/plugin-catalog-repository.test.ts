import type { QueryResult, QueryResultRow } from 'pg'
import { describe, expect, it } from 'vitest'
import { type PluginManifest, type PluginCatalogStatus } from '@cvg/platform'
import { PostgresControlPlaneRepository } from '../platform-control-plane-repository.ts'
import type { PostgresQueryable } from '../postgres.ts'

const tenantId = 'tenant_00000000-0000-4000-8000-000000000095'

const pluginManifest: PluginManifest = {
  name: 'controlled.repository',
  version: '1.0.0',
  capabilities: ['repository.read'],
  permissions: ['repository:read'],
  tools: [
    {
      name: 'repository.read',
      permission: 'repository:read',
      risk: 'low',
      requiresApproval: false
    }
  ],
  hooks: [],
  dependencies: [],
  configSchemaVersion: 'v1'
}

interface CatalogRow extends QueryResultRow {
  tenant_id: string
  id: string
  name: string
  version: string
  manifest: PluginManifest
  status: PluginCatalogStatus
  created_by: string
  approved_by: string | null
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

class PluginCatalogClient implements PostgresQueryable {
  private rows: CatalogRow[] = []
  private readonly forceUniqueOnInsert: boolean
  failUpdate = false
  readonly queries: Array<{ text: string; values?: unknown[] }> = []

  constructor(options: { forceUniqueOnInsert?: boolean } = {}) {
    this.forceUniqueOnInsert = options.forceUniqueOnInsert ?? false
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ): Promise<QueryResult<T>> {
    this.queries.push(values ? { text, values } : { text })
    if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') {
      return result([]) as unknown as QueryResult<T>
    }
    if (text.includes('SELECT id') && text.includes('name = $2')) {
      const [tenant, name, version] = values ?? []
      return result(
        this.rows
          .filter(
            (row) =>
              row.tenant_id === tenant &&
              row.name === name &&
              row.version === version
          )
          .map((row) => ({ id: row.id }))
      ) as unknown as QueryResult<T>
    }
    if (text.includes('INSERT INTO platform_plugin_catalog')) {
      if (this.forceUniqueOnInsert) {
        throw Object.assign(new Error('duplicate'), { code: '23505' })
      }
      const [
        tenant,
        id,
        name,
        version,
        rawManifest,
        status,
        createdBy,
        approvedBy,
        createdAt,
        updatedAt
      ] = values ?? []
      this.rows.push({
        tenant_id: String(tenant),
        id: String(id),
        name: String(name),
        version: String(version),
        manifest: JSON.parse(String(rawManifest)) as PluginManifest,
        status: status as PluginCatalogStatus,
        created_by: String(createdBy),
        approved_by: (approvedBy as string | null) ?? null,
        created_at: createdAt as Date,
        updated_at: updatedAt as Date
      })
      return result([]) as unknown as QueryResult<T>
    }
    if (text.includes('UPDATE platform_plugin_catalog')) {
      if (this.failUpdate) return result([]) as unknown as QueryResult<T>
      const [tenant, id, status, approvedBy, updatedAt, expectedStatus] =
        values ?? []
      const row = this.rows.find(
        (candidate) =>
          candidate.tenant_id === tenant &&
          candidate.id === id &&
          candidate.status === expectedStatus
      )
      if (!row) return result([]) as unknown as QueryResult<T>
      row.status = status as PluginCatalogStatus
      row.approved_by = (approvedBy as string | null) ?? null
      row.updated_at = updatedAt as Date
      return result([row]) as unknown as QueryResult<T>
    }
    if (text.includes('FROM platform_plugin_catalog')) {
      const [tenant, nameOrId] = values ?? []
      const rows = text.includes('id = $2')
        ? this.rows.filter(
            (row) => row.tenant_id === tenant && row.id === nameOrId
          )
        : this.rows.filter(
            (row) =>
              row.tenant_id === tenant &&
              (nameOrId === null || row.name === nameOrId)
          )
      return result(rows) as unknown as QueryResult<T>
    }
    return result([]) as unknown as QueryResult<T>
  }
}

describe('Postgres plugin catalog repository', () => {
  it('uses tenant-scoped parameterized SQL and preserves guarded lifecycle', async () => {
    const client = new PluginCatalogClient()
    const repository = new PostgresControlPlaneRepository(client)
    const scope = { tenantId }

    const draft = await repository.createPluginCatalogEntry(
      scope,
      { manifest: pluginManifest },
      'admin.repository'
    )
    draft.manifest.capabilities.push('mutated.outside')

    await expect(
      repository.createPluginCatalogEntry(
        scope,
        { manifest: pluginManifest },
        'admin.repository'
      )
    ).rejects.toMatchObject({ code: 'invalid_action' })
    await expect(
      repository.getPluginCatalogEntry(scope, draft.id)
    ).resolves.toMatchObject({
      manifest: pluginManifest,
      status: 'DRAFT'
    })
    await expect(
      repository.listPluginCatalogEntries(scope, 'controlled.repository')
    ).resolves.toHaveLength(1)
    await expect(
      repository.listPluginCatalogEntries(scope, ' ')
    ).rejects.toMatchObject({ code: 'validation_failed' })
    await expect(
      repository.getPluginCatalogEntry(
        scope,
        'plugin_catalog_00000000-0000-4000-8000-000000000099'
      )
    ).resolves.toBeNull()

    const uniqueRepository = new PostgresControlPlaneRepository(
      new PluginCatalogClient({ forceUniqueOnInsert: true })
    )
    await expect(
      uniqueRepository.createPluginCatalogEntry(
        scope,
        { manifest: pluginManifest },
        'admin.repository'
      )
    ).rejects.toMatchObject({ code: 'invalid_action' })

    const approved = await repository.transitionPluginCatalogEntry(
      scope,
      draft.id,
      'APPROVED',
      'approver.repository',
      'DRAFT'
    )
    expect(approved).toMatchObject({
      status: 'APPROVED',
      approvedBy: 'approver.repository'
    })
    await expect(
      repository.transitionPluginCatalogEntry(
        scope,
        draft.id,
        'ARCHIVED',
        'admin.repository',
        'DRAFT'
      )
    ).rejects.toMatchObject({ code: 'conflict' })
    await expect(
      repository.resolveApprovedPlugin(scope, 'controlled.repository', '1.0.0')
    ).resolves.toEqual(pluginManifest)
    await expect(
      repository.resolveApprovedPlugin(scope, 'controlled.repository')
    ).resolves.toEqual(pluginManifest)
    await expect(
      repository.transitionPluginCatalogEntry(
        scope,
        draft.id,
        'DRAFT',
        'admin.repository',
        'APPROVED'
      )
    ).rejects.toMatchObject({ code: 'invalid_action' })
    client.failUpdate = true
    await expect(
      repository.transitionPluginCatalogEntry(
        scope,
        draft.id,
        'ARCHIVED',
        'admin.repository',
        'APPROVED'
      )
    ).rejects.toMatchObject({ code: 'conflict' })
    client.failUpdate = false
    await expect(
      repository.transitionPluginCatalogEntry(
        scope,
        'plugin_catalog_00000000-0000-4000-8000-000000000099',
        'ARCHIVED',
        'admin.repository'
      )
    ).rejects.toMatchObject({ code: 'invalid_action' })
    expect(
      client.queries.some(
        (query) =>
          query.text.includes('WHERE tenant_id = $1') &&
          query.values?.[0] === tenantId
      )
    ).toBe(true)
  })
})
