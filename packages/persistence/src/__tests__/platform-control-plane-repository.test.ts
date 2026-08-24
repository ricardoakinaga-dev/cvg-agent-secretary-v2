import type { QueryResult, QueryResultRow } from 'pg'
import { describe, expect, it } from 'vitest'
import {
  AgentConfigSchema,
  createTraceId,
  type AgentConfig,
  type AgentVersionStatus,
  type TestRunTrace
} from '@cvg/platform'
import { PostgresControlPlaneRepository } from '../platform-control-plane-repository.ts'
import type { PostgresQueryable } from '../postgres.ts'

const tenantId = 'tenant_00000000-0000-4000-8000-000000000031'
const agentId = 'agent_00000000-0000-4000-8000-000000000031'
const versionId = 'agent_version_00000000-0000-4000-8000-000000000031'

describe('Postgres control plane repository', () => {
  it('uses tenant-scoped parameterized queries and stores trace JSON', async () => {
    const queries: Array<{ text: string; values?: unknown[] }> = []
    const agentRow = {
      tenant_id: tenantId,
      id: agentId,
      slug: 'db-agent',
      name: 'DB Agent',
      description: 'Fictício',
      active_version_id: null,
      created_at: new Date('2026-08-23T10:00:00.000Z'),
      updated_at: new Date('2026-08-23T10:00:00.000Z')
    }
    const trace: TestRunTrace = {
      traceId: createTraceId(),
      tenantId,
      agentId,
      versionId,
      input: { message: 'teste fictício', historySize: 0 },
      intent: { name: 'unknown', confidence: 0.2 },
      policy: [],
      knowledge: { status: 'not_requested' },
      tools: [],
      handoff: {
        requested: true,
        reason: 'low_confidence_handoff',
        state: 'HANDOFF_REQUESTED'
      },
      response: { text: 'handoff', mode: 'handoff' },
      provider: {
        provider: 'fake',
        model: 'deterministic-v1',
        externalCall: false
      },
      configVersion: 'version',
      executionMode: 'TEST_LAB',
      createdAt: new Date('2026-08-23T10:00:00.000Z')
    }
    const versionRow = {
      tenant_id: tenantId,
      id: versionId,
      agent_id: agentId,
      version: 1,
      status: 'PUBLISHED' as const,
      config: createConfig(),
      created_by: 'admin.db',
      created_at: new Date('2026-08-23T10:00:00.000Z'),
      published_at: new Date('2026-08-23T10:00:00.000Z')
    }
    const result = <T extends QueryResultRow>(rows: T[]): QueryResult<T> => ({
      command: 'SELECT',
      fields: [],
      oid: 0,
      rowCount: rows.length,
      rows
    })
    const fakeClient = {
      async query<T extends QueryResultRow = QueryResultRow>(
        text: string,
        values?: unknown[]
      ) {
        queries.push(values ? { text, values } : { text })
        if (text.includes('FROM platform_agents')) {
          return result([agentRow] as unknown as T[])
        }
        if (text.includes('FROM platform_test_runs')) {
          return result([{ trace }] as unknown as T[])
        }
        if (text.includes('FROM platform_agent_versions')) {
          return result([versionRow] as unknown as T[])
        }
        return result([] as unknown as T[])
      }
    }
    const repository = new PostgresControlPlaneRepository(fakeClient)

    await expect(
      repository.getAgent({ tenantId }, agentId)
    ).resolves.toMatchObject({
      id: agentId,
      tenantId
    })
    await expect(
      repository.recordTestRun({ tenantId }, trace)
    ).resolves.toEqual(trace)
    await expect(repository.listTestRuns({ tenantId })).resolves.toEqual([
      trace
    ])

    expect(
      queries.some(
        (query) =>
          query.text.includes('WHERE tenant_id = $1') &&
          query.values?.[0] === tenantId
      )
    ).toBe(true)
    expect(queries.some((query) => query.text.includes('$5::jsonb'))).toBe(true)
  })

  it('persists the complete immutable agent/version lifecycle', async () => {
    const client = new StatefulPlatformClient()
    const repository = new PostgresControlPlaneRepository(client)
    const scope = { tenantId }

    const agent = await repository.createAgent(scope, {
      slug: 'lifecycle-agent',
      name: 'Lifecycle Agent',
      description: 'Controlled lifecycle'
    })
    expect(await repository.getAgent(scope, agent.id)).toMatchObject({
      id: agent.id,
      slug: 'lifecycle-agent'
    })
    expect(await repository.listAgents(scope)).toHaveLength(1)

    const draft = await repository.createVersion(
      scope,
      agent.id,
      createConfig(),
      'admin.lifecycle'
    )
    expect(draft.status).toBe('DRAFT')
    const agentLockIndex = client.queries.findIndex(
      (query) =>
        query.includes('FROM platform_agents') && query.includes('FOR UPDATE')
    )
    const latestVersionIndex = client.queries.findIndex((query) =>
      query.includes('SELECT version')
    )
    expect(agentLockIndex).toBeGreaterThanOrEqual(0)
    expect(agentLockIndex).toBeLessThan(latestVersionIndex)
    expect((await repository.listVersions(scope, agent.id))[0]?.id).toBe(
      draft.id
    )
    await expect(
      repository.transitionVersion(scope, draft.id, 'APPROVED')
    ).rejects.toMatchObject({ code: 'invalid_action' })

    const testing = await repository.transitionVersion(
      scope,
      draft.id,
      'TESTING'
    )
    expect(testing.status).toBe('TESTING')
    expect(
      client.queries.some(
        (query) =>
          query.includes('UPDATE platform_agent_versions') &&
          query.includes('AND status = $4')
      )
    ).toBe(true)
    const approved = await repository.transitionVersion(
      scope,
      testing.id,
      'APPROVED'
    )
    const published = await repository.publishVersion(scope, approved.id)
    expect(published.status).toBe('PUBLISHED')
    expect(
      client.queries.some(
        (query) =>
          query.includes('FROM platform_agents') && query.includes('FOR UPDATE')
      )
    ).toBe(true)
    expect((await repository.resolvePublished(scope, agent.id))?.id).toBe(
      published.id
    )

    const transactionsBeforeRollback = client.queries.filter(
      (query) => query === 'BEGIN'
    ).length
    const rollback = await repository.rollback(
      scope,
      agent.id,
      published.id,
      'admin.lifecycle'
    )
    const transactionsAfterRollback = client.queries.filter(
      (query) => query === 'BEGIN'
    ).length
    expect(transactionsAfterRollback - transactionsBeforeRollback).toBe(1)
    expect(rollback.status).toBe('PUBLISHED')
    expect(rollback.id).not.toBe(published.id)
    expect((await repository.listVersions(scope, agent.id)).length).toBe(2)
  })

  it('fails closed for missing agents, invalid rollback targets, and cross-tenant traces', async () => {
    const client = new StatefulPlatformClient()
    const repository = new PostgresControlPlaneRepository(client)
    const scope = { tenantId }

    await expect(
      repository.createVersion(
        scope,
        agentId,
        createConfig(),
        'admin.lifecycle'
      )
    ).rejects.toMatchObject({ code: 'invalid_action' })
    await expect(
      repository.rollback(scope, agentId, versionId, 'admin.lifecycle')
    ).rejects.toMatchObject({ code: 'invalid_action' })

    const trace: TestRunTrace = {
      traceId: createTraceId(),
      tenantId: 'tenant_00000000-0000-4000-8000-000000000099',
      agentId,
      versionId,
      input: { message: 'cross-tenant', historySize: 0 },
      intent: { name: 'unknown', confidence: 0.1 },
      policy: [],
      knowledge: { status: 'not_requested' },
      tools: [],
      handoff: { requested: false, reason: null, state: 'BOT_ACTIVE' },
      response: { text: 'blocked', mode: 'blocked' },
      provider: { provider: 'fake', model: 'dry-run', externalCall: false },
      configVersion: 'version',
      executionMode: 'TEST_LAB',
      createdAt: new Date()
    }
    await expect(repository.recordTestRun(scope, trace)).rejects.toMatchObject({
      code: 'forbidden'
    })
  })
})

function createConfig(): AgentConfig {
  return AgentConfigSchema.parse({
    persona: { name: 'Lifecycle', role: 'assistant', tone: 'calm' },
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
      version: 'policy-pg-test-v1',
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

interface StatefulAgentRow {
  tenant_id: string
  id: string
  slug: string
  name: string
  description: string
  active_version_id: string | null
  created_at: Date
  updated_at: Date
}

interface StatefulVersionRow {
  tenant_id: string
  id: string
  agent_id: string
  version: number
  status: AgentVersionStatus
  config: AgentConfig
  created_by: string
  created_at: Date
  published_at: Date | null
}

class StatefulPlatformClient implements PostgresQueryable {
  readonly queries: string[] = []
  private readonly agents: StatefulAgentRow[] = []
  private readonly versions: StatefulVersionRow[] = []
  private readonly traces: TestRunTrace[] = []

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values: unknown[] = []
  ): Promise<QueryResult<T>> {
    this.queries.push(text)
    if (/^(BEGIN|COMMIT|ROLLBACK)$/.test(text)) return resultRows<T>([])

    if (text.includes('INSERT INTO platform_agents')) {
      this.agents.push({
        tenant_id: String(values[0]),
        id: String(values[1]),
        slug: String(values[2]),
        name: String(values[3]),
        description: String(values[4]),
        active_version_id: (values[5] as string | null) ?? null,
        created_at: values[6] as Date,
        updated_at: values[7] as Date
      })
      return resultRows<T>([])
    }

    if (text.includes('INSERT INTO platform_agent_versions')) {
      this.versions.push({
        tenant_id: String(values[0]),
        id: String(values[1]),
        agent_id: String(values[2]),
        version: Number(values[3]),
        status: values[4] as AgentVersionStatus,
        config: JSON.parse(String(values[5])) as AgentConfig,
        created_by: String(values[6]),
        created_at: values[7] as Date,
        published_at: (values[8] as Date | null) ?? null
      })
      return resultRows<T>([])
    }

    if (text.includes('INSERT INTO platform_test_runs')) {
      this.traces.push(JSON.parse(String(values[4])) as TestRunTrace)
      return resultRows<T>([])
    }

    if (text.includes('SELECT version')) {
      const latest = this.versions
        .filter(
          (version) =>
            version.tenant_id === String(values[0]) &&
            version.agent_id === String(values[1])
        )
        .sort((left, right) => right.version - left.version)[0]
      return resultRows<T>(latest ? [{ version: latest.version }] : [])
    }

    if (text.includes('FROM platform_agents')) {
      const rows = text.includes('AND id = $2')
        ? this.agents.filter(
            (agent) =>
              agent.tenant_id === String(values[0]) &&
              agent.id === String(values[1])
          )
        : this.agents.filter((agent) => agent.tenant_id === String(values[0]))
      return resultRows<T>(rows)
    }

    if (text.includes('FROM platform_agent_versions')) {
      const rows = text.includes('AND id = $2')
        ? this.versions.filter(
            (version) =>
              version.tenant_id === String(values[0]) &&
              version.id === String(values[1])
          )
        : this.versions
            .filter(
              (version) =>
                version.tenant_id === String(values[0]) &&
                version.agent_id === String(values[1])
            )
            .sort((left, right) => right.version - left.version)
      return resultRows<T>(rows)
    }

    if (text.includes('SET status = $3')) {
      const version = this.versions.find(
        (candidate) =>
          candidate.tenant_id === String(values[0]) &&
          candidate.id === String(values[1])
      )
      if (!version) return resultRows<T>([])
      version.status = values[2] as AgentVersionStatus
      return resultRows<T>([version])
    }

    if (text.includes("SET status = 'ARCHIVED'")) {
      this.versions.forEach((version) => {
        if (
          version.tenant_id === String(values[0]) &&
          version.agent_id === String(values[1]) &&
          version.status === 'PUBLISHED' &&
          version.id !== String(values[2])
        ) {
          version.status = 'ARCHIVED'
        }
      })
      return resultRows<T>([])
    }

    if (text.includes("SET status = 'PUBLISHED'")) {
      const version = this.versions.find(
        (candidate) =>
          candidate.tenant_id === String(values[0]) &&
          candidate.id === String(values[1])
      )
      if (version) {
        version.status = 'PUBLISHED'
        version.published_at = values[2] as Date
      }
      return resultRows<T>([])
    }

    if (text.includes('SET active_version_id')) {
      const agent = this.agents.find(
        (candidate) =>
          candidate.tenant_id === String(values[0]) &&
          candidate.id === String(values[1])
      )
      if (agent) {
        agent.active_version_id = String(values[2])
        agent.updated_at = values[3] as Date
      }
      return resultRows<T>([])
    }

    if (text.includes('FROM platform_test_runs')) {
      const rows = this.traces
        .filter((trace) => trace.tenantId === String(values[0]))
        .map((trace) => ({ trace }))
      return resultRows<T>(rows)
    }

    return resultRows<T>([])
  }
}

function resultRows<T extends QueryResultRow>(
  rows: QueryResultRow[]
): QueryResult<T> {
  return {
    command: 'SELECT',
    fields: [],
    oid: 0,
    rowCount: rows.length,
    rows: rows as T[]
  }
}
