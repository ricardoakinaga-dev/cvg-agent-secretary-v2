import { Client } from 'pg'
import { describe, expect, it } from 'vitest'
import { AgentConfigSchema, createTraceId } from '@cvg/platform'
import {
  PostgresControlPlaneRepository,
  runInitialPostgresMigration
} from '../index.ts'

const testDatabaseUrl = process.env.TEST_DATABASE_URL
const tenantId = 'tenant_00000000-0000-4000-8000-000000000041'

function config() {
  return AgentConfigSchema.parse({
    persona: { name: 'Postgres Agent', role: 'assistant', tone: 'calm' },
    greeting: 'Resposta controlada.',
    promptBlocks: [],
    responseTemplates: { unknown: 'Handoff controlado.' },
    model: {
      provider: 'fake',
      model: 'deterministic-v1',
      temperature: 0,
      maxTokens: 128,
      timeoutMs: 1000,
      retries: 0,
      secretRef: 'secret://controlled/fake'
    },
    policies: {
      version: 'policy-pg-v1',
      minConfidence: 0.7,
      lowConfidence: 'handoff',
      maxClarifications: 1,
      enabledActions: ['respond'],
      approvalActions: [],
      blockedActions: []
    },
    plugins: [],
    knowledge: [],
    handoff: {
      lowConfidenceDestination: 'controlled-reception',
      destinations: ['controlled-reception'],
      maxClarifications: 1
    }
  })
}

describe('Postgres platform control plane smoke', () => {
  const itWithPostgres = testDatabaseUrl ? it : it.skip

  itWithPostgres(
    'persists an immutable published version and a tenant-scoped trace',
    async () => {
      const client = new Client({ connectionString: testDatabaseUrl })
      const schemaName = `cvg_platform_${Date.now()}`
      await client.connect()
      try {
        await runInitialPostgresMigration(client, { schemaName })
        const repository = new PostgresControlPlaneRepository(client)
        const agent = await repository.createAgent(
          { tenantId },
          {
            slug: 'postgres-agent',
            name: 'Postgres Agent',
            description: 'Fictício'
          }
        )
        const draft = await repository.createVersion(
          { tenantId },
          agent.id,
          config(),
          'admin.postgres'
        )
        await repository.transitionVersion({ tenantId }, draft.id, 'TESTING')
        await repository.transitionVersion({ tenantId }, draft.id, 'APPROVED')
        const published = await repository.publishVersion(
          { tenantId },
          draft.id
        )
        const trace = {
          traceId: createTraceId(),
          tenantId,
          agentId: agent.id,
          versionId: published.id,
          input: { message: 'email ana@example.com', historySize: 0 },
          intent: { name: 'unknown', confidence: 0.2 },
          policy: [],
          knowledge: { status: 'not_requested' as const },
          tools: [],
          handoff: {
            requested: true,
            reason: 'low_confidence_handoff',
            state: 'HANDOFF_REQUESTED' as const
          },
          response: {
            text: 'Telefone +5511999999999',
            mode: 'handoff' as const
          },
          provider: {
            provider: 'fake',
            model: 'deterministic-v1',
            externalCall: false as const
          },
          configVersion: 'postgres',
          executionMode: 'TEST_LAB' as const,
          createdAt: new Date()
        }
        await repository.recordTestRun({ tenantId }, trace)

        const freshRepository = new PostgresControlPlaneRepository(client)
        await expect(
          freshRepository.resolvePublished({ tenantId }, agent.id)
        ).resolves.toMatchObject({ id: published.id, status: 'PUBLISHED' })
        await expect(
          freshRepository.listTestRuns({ tenantId })
        ).resolves.toMatchObject([
          {
            traceId: trace.traceId,
            input: { message: 'email [redacted-email]' },
            response: { text: 'Telefone [redacted-phone]' }
          }
        ])
      } finally {
        await client.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`)
        await client.end()
      }
    }
  )
})
