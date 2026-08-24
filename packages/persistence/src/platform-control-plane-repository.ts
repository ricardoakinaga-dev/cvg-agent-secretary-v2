import { DomainError, redactSensitiveText } from '@cvg/shared'
import {
  AgentConfigSchema,
  AgentCreateInputSchema,
  AgentIdSchema,
  AgentVersionIdSchema,
  AgentVersionStatusSchema,
  TenantScopeSchema,
  createAgentId,
  createAgentVersionId,
  type AgentConfig,
  type AgentCreateInput,
  type AgentId,
  type AgentRecord,
  type AgentVersionId,
  type AgentVersionRecord,
  type AgentVersionStatus,
  type ControlPlaneStore,
  type TenantScope,
  type TestRunTrace
} from '@cvg/platform'
import type { PostgresQueryable } from './postgres.ts'

export class PostgresControlPlaneRepository implements ControlPlaneStore {
  constructor(private readonly client: PostgresQueryable) {}

  async createAgent(
    rawScope: TenantScope,
    rawInput: AgentCreateInput
  ): Promise<AgentRecord> {
    const scope = parseScope(rawScope)
    const input = AgentCreateInputSchema.parse(rawInput)
    const now = new Date()
    const agent: AgentRecord = {
      tenantId: scope.tenantId,
      id: createAgentId(),
      slug: input.slug,
      name: input.name,
      description: input.description,
      activeVersionId: null,
      createdAt: now,
      updatedAt: now
    }
    await this.client.query(
      `INSERT INTO platform_agents
       (tenant_id, id, slug, name, description, active_version_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        agent.tenantId,
        agent.id,
        agent.slug,
        agent.name,
        agent.description,
        agent.activeVersionId,
        agent.createdAt,
        agent.updatedAt
      ]
    )
    return cloneAgent(agent)
  }

  async getAgent(
    rawScope: TenantScope,
    rawAgentId: AgentId
  ): Promise<AgentRecord | null> {
    const scope = parseScope(rawScope)
    const agentId = AgentIdSchema.parse(rawAgentId)
    const result = await this.client.query<AgentRow>(
      `SELECT tenant_id, id, slug, name, description, active_version_id, created_at, updated_at
       FROM platform_agents
       WHERE tenant_id = $1 AND id = $2
       LIMIT 1`,
      [scope.tenantId, agentId]
    )
    const row = result.rows[0]
    return row ? mapAgent(row) : null
  }

  async listAgents(rawScope: TenantScope): Promise<AgentRecord[]> {
    const scope = parseScope(rawScope)
    const result = await this.client.query<AgentRow>(
      `SELECT tenant_id, id, slug, name, description, active_version_id, created_at, updated_at
       FROM platform_agents
       WHERE tenant_id = $1
       ORDER BY created_at ASC, id ASC`,
      [scope.tenantId]
    )
    return result.rows.map(mapAgent)
  }

  async createVersion(
    rawScope: TenantScope,
    rawAgentId: AgentId,
    rawConfig: AgentConfig,
    createdBy: string
  ): Promise<AgentVersionRecord> {
    const scope = parseScope(rawScope)
    const agentId = AgentIdSchema.parse(rawAgentId)
    const config = AgentConfigSchema.parse(rawConfig)
    const agent = await this.getAgent(scope, agentId)
    if (!agent) throw new DomainError('invalid_action', 'Agent not found')
    const actor = validateActor(createdBy)
    const id = createAgentVersionId()
    const now = new Date()

    await this.client.query('BEGIN')
    try {
      const lockedAgent = await this.client.query<{ id: string }>(
        `SELECT id
         FROM platform_agents
         WHERE tenant_id = $1 AND id = $2
         LIMIT 1
         FOR UPDATE`,
        [scope.tenantId, agentId]
      )
      if (!lockedAgent.rows[0]) {
        throw new DomainError('invalid_action', 'Agent not found')
      }
      const latest = await this.client.query<{ version: number }>(
        `SELECT version
         FROM platform_agent_versions
         WHERE tenant_id = $1 AND agent_id = $2
         ORDER BY version DESC
         LIMIT 1
         FOR UPDATE`,
        [scope.tenantId, agentId]
      )
      const versionNumber = Number(latest.rows[0]?.version ?? 0) + 1
      const version: AgentVersionRecord = {
        tenantId: scope.tenantId,
        id,
        agentId,
        version: versionNumber,
        status: 'DRAFT',
        config: structuredClone(config),
        createdBy: actor,
        createdAt: now,
        publishedAt: null
      }
      await this.client.query(
        `INSERT INTO platform_agent_versions
         (tenant_id, id, agent_id, version, status, config, created_by, created_at, published_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)`,
        [
          version.tenantId,
          version.id,
          version.agentId,
          version.version,
          version.status,
          JSON.stringify(version.config),
          version.createdBy,
          version.createdAt,
          version.publishedAt
        ]
      )
      await this.client.query('COMMIT')
      return cloneVersion(version)
    } catch (error) {
      await this.client.query('ROLLBACK')
      throw error
    }
  }

  async getVersion(
    rawScope: TenantScope,
    rawVersionId: AgentVersionId
  ): Promise<AgentVersionRecord | null> {
    const scope = parseScope(rawScope)
    const versionId = AgentVersionIdSchema.parse(rawVersionId)
    const result = await this.client.query<AgentVersionRow>(
      `SELECT tenant_id, id, agent_id, version, status, config, created_by, created_at, published_at
       FROM platform_agent_versions
       WHERE tenant_id = $1 AND id = $2
       LIMIT 1`,
      [scope.tenantId, versionId]
    )
    const row = result.rows[0]
    return row ? mapVersion(row) : null
  }

  async listVersions(
    rawScope: TenantScope,
    rawAgentId: AgentId
  ): Promise<AgentVersionRecord[]> {
    const scope = parseScope(rawScope)
    const agentId = AgentIdSchema.parse(rawAgentId)
    const agent = await this.getAgent(scope, agentId)
    if (!agent) throw new DomainError('invalid_action', 'Agent not found')
    const result = await this.client.query<AgentVersionRow>(
      `SELECT tenant_id, id, agent_id, version, status, config, created_by, created_at, published_at
       FROM platform_agent_versions
       WHERE tenant_id = $1 AND agent_id = $2
       ORDER BY version DESC`,
      [scope.tenantId, agentId]
    )
    return result.rows.map(mapVersion)
  }

  async transitionVersion(
    rawScope: TenantScope,
    rawVersionId: AgentVersionId,
    rawTarget: AgentVersionStatus
  ): Promise<AgentVersionRecord> {
    const scope = parseScope(rawScope)
    const versionId = AgentVersionIdSchema.parse(rawVersionId)
    const target = AgentVersionStatusSchema.parse(rawTarget)
    await this.client.query('BEGIN')
    try {
      const currentResult = await this.client.query<AgentVersionRow>(
        `SELECT tenant_id, id, agent_id, version, status, config, created_by, created_at, published_at
         FROM platform_agent_versions
         WHERE tenant_id = $1 AND id = $2
         LIMIT 1`,
        [scope.tenantId, versionId]
      )
      const currentRow = currentResult.rows[0]
      if (!currentRow) {
        throw new DomainError('invalid_action', 'Agent version not found')
      }
      const current = mapVersion(currentRow)
      if (!canTransition(current.status, target)) {
        throw new DomainError(
          'invalid_action',
          `Version cannot transition from ${current.status} to ${target}`
        )
      }
      const result = await this.client.query<AgentVersionRow>(
        `UPDATE platform_agent_versions
         SET status = $3
         WHERE tenant_id = $1 AND id = $2 AND status = $4
         RETURNING tenant_id, id, agent_id, version, status, config, created_by, created_at, published_at`,
        [scope.tenantId, versionId, target, current.status]
      )
      const row = result.rows[0]
      if (!row) {
        throw new DomainError(
          'invalid_action',
          'Version changed before transition could be committed'
        )
      }
      await this.client.query('COMMIT')
      return mapVersion(row)
    } catch (error) {
      await this.client.query('ROLLBACK')
      throw error
    }
  }

  async publishVersion(
    rawScope: TenantScope,
    rawVersionId: AgentVersionId
  ): Promise<AgentVersionRecord> {
    const scope = parseScope(rawScope)
    const versionId = AgentVersionIdSchema.parse(rawVersionId)
    await this.client.query('BEGIN')
    try {
      const versionIdentity = await this.client.query<{ agent_id: string }>(
        `SELECT agent_id
         FROM platform_agent_versions
         WHERE tenant_id = $1 AND id = $2
         LIMIT 1
         FOR UPDATE`,
        [scope.tenantId, versionId]
      )
      const agentId = versionIdentity.rows[0]?.agent_id
      const lockedAgent = agentId
        ? await this.client.query<{ id: string }>(
            `SELECT id
             FROM platform_agents
             WHERE tenant_id = $1 AND id = $2
             LIMIT 1
             FOR UPDATE`,
            [scope.tenantId, agentId]
          )
        : null
      if (!lockedAgent?.rows[0]) {
        throw new DomainError('invalid_action', 'Agent version not found')
      }
      const currentResult = await this.client.query<AgentVersionRow>(
        `SELECT tenant_id, id, agent_id, version, status, config, created_by, created_at, published_at
         FROM platform_agent_versions
         WHERE tenant_id = $1 AND id = $2
         LIMIT 1
         FOR UPDATE`,
        [scope.tenantId, versionId]
      )
      const currentRow = currentResult.rows[0]
      if (!currentRow) {
        throw new DomainError('invalid_action', 'Agent version not found')
      }
      const current = mapVersion(currentRow)
      if (current.status !== 'APPROVED') {
        throw new DomainError(
          'invalid_action',
          'Only an approved version can be published'
        )
      }
      const now = new Date()
      await this.client.query(
        `UPDATE platform_agent_versions
         SET status = 'ARCHIVED'
         WHERE tenant_id = $1 AND agent_id = $2 AND status = 'PUBLISHED' AND id <> $3`,
        [scope.tenantId, current.agentId, versionId]
      )
      await this.client.query(
        `UPDATE platform_agent_versions
         SET status = 'PUBLISHED', published_at = $3
         WHERE tenant_id = $1 AND id = $2`,
        [scope.tenantId, versionId, now]
      )
      await this.client.query(
        `UPDATE platform_agents
         SET active_version_id = $3, updated_at = $4
         WHERE tenant_id = $1 AND id = $2`,
        [scope.tenantId, current.agentId, versionId, now]
      )
      await this.client.query('COMMIT')
      return {
        ...current,
        status: 'PUBLISHED',
        publishedAt: now,
        config: structuredClone(current.config)
      }
    } catch (error) {
      await this.client.query('ROLLBACK')
      throw error
    }
  }

  async rollback(
    rawScope: TenantScope,
    rawAgentId: AgentId,
    rawVersionId: AgentVersionId,
    createdBy: string
  ): Promise<AgentVersionRecord> {
    const scope = parseScope(rawScope)
    const agentId = AgentIdSchema.parse(rawAgentId)
    const versionId = AgentVersionIdSchema.parse(rawVersionId)
    const actor = validateActor(createdBy)
    await this.client.query('BEGIN')
    try {
      const lockedAgentResult = await this.client.query<AgentRow>(
        `SELECT tenant_id, id, slug, name, description, active_version_id, created_at, updated_at
         FROM platform_agents
         WHERE tenant_id = $1 AND id = $2
         LIMIT 1
         FOR UPDATE`,
        [scope.tenantId, agentId]
      )
      if (!lockedAgentResult.rows[0]) {
        throw new DomainError('invalid_action', 'Agent not found')
      }
      const targetResult = await this.client.query<AgentVersionRow>(
        `SELECT tenant_id, id, agent_id, version, status, config, created_by, created_at, published_at
         FROM platform_agent_versions
         WHERE tenant_id = $1 AND id = $2
         LIMIT 1
         FOR UPDATE`,
        [scope.tenantId, versionId]
      )
      const targetRow = targetResult.rows[0]
      if (!targetRow) {
        throw new DomainError(
          'invalid_action',
          'Version does not belong to agent'
        )
      }
      const target = mapVersion(targetRow)
      if (target.agentId !== agentId) {
        throw new DomainError(
          'invalid_action',
          'Version does not belong to agent'
        )
      }
      if (target.status === 'DRAFT' || target.status === 'TESTING') {
        throw new DomainError(
          'invalid_action',
          'Only reviewed versions can rollback'
        )
      }
      const latest = await this.client.query<{ version: number }>(
        `SELECT version
         FROM platform_agent_versions
         WHERE tenant_id = $1 AND agent_id = $2
         ORDER BY version DESC
         LIMIT 1`,
        [scope.tenantId, agentId]
      )
      const now = new Date()
      const draft: AgentVersionRecord = {
        tenantId: scope.tenantId,
        id: createAgentVersionId(),
        agentId,
        version: Number(latest.rows[0]?.version ?? 0) + 1,
        status: 'DRAFT',
        config: structuredClone(target.config),
        createdBy: actor,
        createdAt: now,
        publishedAt: null
      }
      await this.client.query(
        `INSERT INTO platform_agent_versions
         (tenant_id, id, agent_id, version, status, config, created_by, created_at, published_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)`,
        [
          draft.tenantId,
          draft.id,
          draft.agentId,
          draft.version,
          draft.status,
          JSON.stringify(draft.config),
          draft.createdBy,
          draft.createdAt,
          draft.publishedAt
        ]
      )
      const testingResult = await this.client.query<AgentVersionRow>(
        `UPDATE platform_agent_versions
         SET status = $3
         WHERE tenant_id = $1 AND id = $2 AND status = $4
         RETURNING tenant_id, id, agent_id, version, status, config, created_by, created_at, published_at`,
        [scope.tenantId, draft.id, 'TESTING', 'DRAFT']
      )
      if (!testingResult.rows[0]) {
        throw new DomainError(
          'invalid_action',
          'Rollback draft transition failed'
        )
      }
      const approvedResult = await this.client.query<AgentVersionRow>(
        `UPDATE platform_agent_versions
         SET status = $3
         WHERE tenant_id = $1 AND id = $2 AND status = $4
         RETURNING tenant_id, id, agent_id, version, status, config, created_by, created_at, published_at`,
        [scope.tenantId, draft.id, 'APPROVED', 'TESTING']
      )
      const approvedRow = approvedResult.rows[0]
      if (!approvedRow) {
        throw new DomainError(
          'invalid_action',
          'Rollback approval transition failed'
        )
      }
      const approved = mapVersion(approvedRow)
      await this.client.query(
        `UPDATE platform_agent_versions
         SET status = 'ARCHIVED'
         WHERE tenant_id = $1 AND agent_id = $2 AND status = 'PUBLISHED' AND id <> $3`,
        [scope.tenantId, agentId, approved.id]
      )
      await this.client.query(
        `UPDATE platform_agent_versions
         SET status = 'PUBLISHED', published_at = $3
         WHERE tenant_id = $1 AND id = $2`,
        [scope.tenantId, approved.id, now]
      )
      await this.client.query(
        `UPDATE platform_agents
         SET active_version_id = $3, updated_at = $4
         WHERE tenant_id = $1 AND id = $2`,
        [scope.tenantId, agentId, approved.id, now]
      )
      await this.client.query('COMMIT')
      return {
        ...approved,
        status: 'PUBLISHED',
        publishedAt: now,
        config: structuredClone(approved.config)
      }
    } catch (error) {
      await this.client.query('ROLLBACK')
      throw error
    }
  }

  async resolvePublished(
    rawScope: TenantScope,
    rawAgentId: AgentId
  ): Promise<AgentVersionRecord | null> {
    const scope = parseScope(rawScope)
    const agentId = AgentIdSchema.parse(rawAgentId)
    const agent = await this.getAgent(scope, agentId)
    if (!agent?.activeVersionId) return null
    const version = await this.getVersion(scope, agent.activeVersionId)
    return version?.status === 'PUBLISHED' ? version : null
  }

  async recordTestRun(
    rawScope: TenantScope,
    trace: TestRunTrace
  ): Promise<TestRunTrace> {
    const scope = parseScope(rawScope)
    if (trace.tenantId !== scope.tenantId) {
      throw new DomainError('forbidden', 'Trace tenant does not match scope')
    }
    await this.assertTraceReferences(scope, trace)
    const storedTrace = cloneTrace(trace)
    await this.client.query(
      `INSERT INTO platform_test_runs
       (tenant_id, trace_id, agent_id, version_id, trace, created_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
      [
        trace.tenantId,
        trace.traceId,
        trace.agentId,
        trace.versionId,
        JSON.stringify(storedTrace),
        storedTrace.createdAt
      ]
    )
    return cloneTrace(storedTrace)
  }

  async listTestRuns(
    rawScope: TenantScope,
    limit = 50
  ): Promise<TestRunTrace[]> {
    const scope = parseScope(rawScope)
    const result = await this.client.query<{ trace: TestRunTrace }>(
      `SELECT trace
       FROM platform_test_runs
       WHERE tenant_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [scope.tenantId, normalizeTraceLimit(limit)]
    )
    return result.rows.map((row) => cloneTrace(row.trace))
  }

  async recordExecutionTrace(
    rawScope: TenantScope,
    trace: TestRunTrace
  ): Promise<TestRunTrace> {
    const scope = parseScope(rawScope)
    if (trace.tenantId !== scope.tenantId) {
      throw new DomainError('forbidden', 'Trace tenant does not match scope')
    }
    await this.assertTraceReferences(scope, trace)
    const storedTrace = cloneTrace(trace)
    await this.client.query(
      `INSERT INTO platform_execution_traces
       (tenant_id, trace_id, agent_id, version_id, trace, created_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
      [
        trace.tenantId,
        trace.traceId,
        trace.agentId,
        trace.versionId,
        JSON.stringify(storedTrace),
        storedTrace.createdAt
      ]
    )
    return cloneTrace(storedTrace)
  }

  async listExecutionTraces(
    rawScope: TenantScope,
    limit = 50
  ): Promise<TestRunTrace[]> {
    const scope = parseScope(rawScope)
    const result = await this.client.query<{ trace: TestRunTrace }>(
      `SELECT trace
       FROM platform_execution_traces
       WHERE tenant_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [scope.tenantId, normalizeTraceLimit(limit)]
    )
    return result.rows.map((row) => cloneTrace(row.trace))
  }

  private async assertTraceReferences(
    scope: TenantScope,
    trace: TestRunTrace
  ): Promise<void> {
    const agent = await this.getAgent(scope, trace.agentId)
    if (!agent) throw new DomainError('invalid_action', 'Trace agent not found')
    const version = await this.getVersion(scope, trace.versionId)
    if (!version) {
      throw new DomainError('invalid_action', 'Trace version not found')
    }
    if (version.agentId !== agent.id) {
      throw new DomainError(
        'invalid_action',
        'Trace agent and version do not belong together'
      )
    }
  }
}

interface AgentRow {
  tenant_id: string
  id: string
  slug: string
  name: string
  description: string
  active_version_id: string | null
  created_at: Date | string
  updated_at: Date | string
}

interface AgentVersionRow {
  tenant_id: string
  id: string
  agent_id: string
  version: number
  status: AgentVersionStatus
  config: AgentConfig
  created_by: string
  created_at: Date | string
  published_at: Date | string | null
}

function parseScope(scope: TenantScope): TenantScope {
  return TenantScopeSchema.parse(scope)
}

function normalizeTraceLimit(limit: number): number {
  return Math.min(100, Math.max(1, Math.trunc(limit)))
}

function validateActor(actorId: string): string {
  const value = actorId.trim()
  if (!/^[A-Za-z0-9._:-]{3,80}$/.test(value)) {
    throw new DomainError('validation_failed', 'createdBy is invalid')
  }
  return value
}

function canTransition(
  from: AgentVersionStatus,
  to: AgentVersionStatus
): boolean {
  const transitions: Record<AgentVersionStatus, AgentVersionStatus[]> = {
    DRAFT: ['TESTING', 'ARCHIVED'],
    TESTING: ['DRAFT', 'APPROVED', 'ARCHIVED'],
    APPROVED: ['TESTING', 'ARCHIVED'],
    PUBLISHED: ['ARCHIVED'],
    ARCHIVED: []
  }
  return transitions[from].includes(to)
}

function mapAgent(row: AgentRow): AgentRecord {
  return {
    tenantId: row.tenant_id as AgentRecord['tenantId'],
    id: row.id as AgentRecord['id'],
    slug: row.slug,
    name: row.name,
    description: row.description,
    activeVersionId: row.active_version_id as AgentRecord['activeVersionId'],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }
}

function mapVersion(row: AgentVersionRow): AgentVersionRecord {
  return {
    tenantId: row.tenant_id as AgentVersionRecord['tenantId'],
    id: row.id as AgentVersionRecord['id'],
    agentId: row.agent_id as AgentVersionRecord['agentId'],
    version: row.version,
    status: row.status,
    config: AgentConfigSchema.parse(row.config),
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    publishedAt: row.published_at ? new Date(row.published_at) : null
  }
}

function cloneAgent(agent: AgentRecord): AgentRecord {
  return {
    ...agent,
    createdAt: new Date(agent.createdAt),
    updatedAt: new Date(agent.updatedAt)
  }
}

function cloneVersion(version: AgentVersionRecord): AgentVersionRecord {
  return {
    ...version,
    config: structuredClone(version.config),
    createdAt: new Date(version.createdAt),
    publishedAt: version.publishedAt ? new Date(version.publishedAt) : null
  }
}

function cloneTrace(trace: TestRunTrace): TestRunTrace {
  return {
    ...trace,
    input: {
      ...trace.input,
      message: redactSensitiveText(trace.input.message)
    },
    intent: { ...trace.intent },
    policy: trace.policy.map((item) => ({ ...item })),
    knowledge: { ...trace.knowledge },
    tools: trace.tools.map((tool) => ({ ...tool })),
    handoff: { ...trace.handoff },
    response: {
      ...trace.response,
      text: redactSensitiveText(trace.response.text)
    },
    provider: { ...trace.provider },
    createdAt: new Date(trace.createdAt)
  }
}
