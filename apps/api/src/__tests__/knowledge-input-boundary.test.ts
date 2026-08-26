import { describe, expect, it } from 'vitest'
import {
  createControlledSecretaryConfig,
  InMemoryControlPlaneStore
} from '@cvg/platform'
import { buildServer } from '../server.ts'

const tenantId = 'tenant_00000000-0000-4000-8000-000000000142'

const adminHeaders = {
  'x-operator-id': 'admin.knowledge-boundary',
  'x-operator-role': 'Admin',
  'x-tenant-id': tenantId
}

describe('API controlled knowledge input boundary', () => {
  it('rejects a source identifier above the shared bounded limit', async () => {
    const platform = new InMemoryControlPlaneStore()
    const agent = await platform.createAgent(
      { tenantId },
      {
        slug: 'knowledge-api-boundary',
        name: 'Knowledge API Boundary',
        description: 'Controlled API fixture'
      }
    )
    const version = await platform.createVersion(
      { tenantId },
      agent.id,
      createControlledSecretaryConfig(),
      'test.knowledge-api-boundary'
    )
    const app = buildServer({ platform })

    const response = await app.inject({
      method: 'POST',
      url: '/v1/admin/test-lab/runs',
      headers: adminHeaders,
      payload: {
        agentId: agent.id,
        versionId: version.id,
        message: 'Qual o horário de funcionamento?',
        history: [],
        approvedKnowledge: {
          source: `controlled://${'x'.repeat(201)}`,
          version: 'v1',
          answer: 'Resposta controlada.'
        }
      }
    })
    await app.close()

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({
      success: false,
      error: { code: 'validation_failed' }
    })
  })
})
