import { Client } from 'pg'
import {
  PostgresRuntimeRepository,
  readPostgresMigrationSql,
  runPostgresMigrations
} from '../postgres.ts'
import { describe, expect, it } from 'vitest'

const testDatabaseUrl = process.env.TEST_DATABASE_URL

describe('session version pinning migration contract', () => {
  it('ships an additive tenant-aware session binding migration', async () => {
    const migration = await readPostgresMigrationSql(
      '0008_session_agent_version_pin'
    )

    expect(migration).toContain('ALTER TABLE sessions')
    expect(migration).toContain('agent_id')
    expect(migration).toContain('agent_version_id')
    expect(migration).toContain('sessions_agent_binding_pair_check')
    expect(migration).toContain('sessions_agent_binding_version_fk')
    expect(migration).toContain('idx_sessions_tenant_agent_version')
  })

  const itWithPostgres = testDatabaseUrl ? it : it.skip

  itWithPostgres(
    'binds sessions atomically under the tenant-aware migration and never replaces the pin',
    async () => {
      const client = new Client({ connectionString: testDatabaseUrl })
      const schemaName = `cvg_session_pin_${Date.now()}`
      const tenantId = 'tenant_00000000-0000-4000-8000-000000000083'
      const otherTenantId = 'tenant_00000000-0000-4000-8000-000000000084'
      const agentId = 'agent_00000000-0000-4000-8000-000000000083'
      const versionId = 'agent_version_00000000-0000-4000-8000-000000000083'

      await client.connect()
      try {
        await runPostgresMigrations(client, { schemaName })
        await client.query(`SELECT set_config('cvg.tenant_id', $1, false)`, [
          tenantId
        ])
        await client.query(
          `INSERT INTO platform_agents
             (tenant_id, id, slug, name, description, active_version_id)
           VALUES ($1, $2, $3, $4, $5, NULL)`,
          [
            tenantId,
            agentId,
            'session-pin-agent',
            'Session Pin Agent',
            'Fixture'
          ]
        )
        await client.query(
          `INSERT INTO platform_agent_versions
             (tenant_id, id, agent_id, version, status, config, created_by)
           VALUES ($1, $2, $3, $4, 'PUBLISHED', '{}'::jsonb, $5)`,
          [tenantId, versionId, agentId, 1, 'fixture']
        )
        await client.query(
          `UPDATE platform_agents
             SET active_version_id = $2
           WHERE tenant_id = $1 AND id = $3`,
          [tenantId, versionId, agentId]
        )

        const repository = new PostgresRuntimeRepository(client, {
          tenantIsolation: true
        })
        const created = await repository.createWithSession({
          tenantId,
          channel: 'web',
          senderRef: 'fixture-sender',
          externalMessageId: 'session-pin-pg-1',
          body: 'Mensagem fictícia'
        })
        const bound = await repository.bindSessionAgentVersion(
          tenantId,
          created.session.id,
          agentId,
          versionId
        )
        const repeated = await repository.bindSessionAgentVersion(
          tenantId,
          created.session.id,
          agentId,
          versionId
        )

        expect(bound).toMatchObject({ agentId, agentVersionId: versionId })
        expect(repeated).toMatchObject({ agentId, agentVersionId: versionId })
        await expect(
          repository.bindSessionAgentVersion(
            tenantId,
            created.session.id,
            agentId,
            'agent_version_00000000-0000-4000-8000-000000000084'
          )
        ).rejects.toMatchObject({ code: 'conflict' })
        await expect(
          repository.bindSessionAgentVersion(
            otherTenantId,
            created.session.id,
            agentId,
            versionId
          )
        ).resolves.toBeNull()
        await expect(
          repository.timeline(tenantId, created.conversation.id)
        ).resolves.toMatchObject({
          sessions: [
            expect.objectContaining({ agentId, agentVersionId: versionId })
          ]
        })
      } finally {
        await client.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`)
        await client.end()
      }
    }
  )
})
