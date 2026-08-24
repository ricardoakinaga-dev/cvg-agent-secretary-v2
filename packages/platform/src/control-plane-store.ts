import { DomainError, redactSensitiveText } from '@cvg/shared'
import {
  AgentConfigSchema,
  AgentCreateInputSchema,
  TenantScopeSchema,
  type AgentConfig,
  type AgentCreateInput,
  type AgentRecord,
  type AgentVersionRecord,
  type AgentVersionStatus,
  type TenantScope,
  type TestRunTrace
} from './contracts.ts'
import {
  createAgentId,
  createAgentVersionId,
  type AgentId,
  type AgentVersionId
} from './ids.ts'

export interface ControlPlaneStore {
  createAgent(scope: TenantScope, input: AgentCreateInput): Promise<AgentRecord>
  getAgent(scope: TenantScope, agentId: AgentId): Promise<AgentRecord | null>
  listAgents(scope: TenantScope): Promise<AgentRecord[]>
  createVersion(
    scope: TenantScope,
    agentId: AgentId,
    config: AgentConfig,
    createdBy: string
  ): Promise<AgentVersionRecord>
  getVersion(
    scope: TenantScope,
    versionId: AgentVersionId
  ): Promise<AgentVersionRecord | null>
  listVersions(
    scope: TenantScope,
    agentId: AgentId
  ): Promise<AgentVersionRecord[]>
  transitionVersion(
    scope: TenantScope,
    versionId: AgentVersionId,
    target: AgentVersionStatus
  ): Promise<AgentVersionRecord>
  publishVersion(
    scope: TenantScope,
    versionId: AgentVersionId
  ): Promise<AgentVersionRecord>
  rollback(
    scope: TenantScope,
    agentId: AgentId,
    versionId: AgentVersionId,
    createdBy: string
  ): Promise<AgentVersionRecord>
  resolvePublished(
    scope: TenantScope,
    agentId: AgentId
  ): Promise<AgentVersionRecord | null>
  recordTestRun(scope: TenantScope, trace: TestRunTrace): Promise<TestRunTrace>
  listTestRuns(scope: TenantScope, limit?: number): Promise<TestRunTrace[]>
  recordExecutionTrace(
    scope: TenantScope,
    trace: TestRunTrace
  ): Promise<TestRunTrace>
  listExecutionTraces(
    scope: TenantScope,
    limit?: number
  ): Promise<TestRunTrace[]>
}

export class InMemoryControlPlaneStore implements ControlPlaneStore {
  private agents: AgentRecord[] = []
  private versions: AgentVersionRecord[] = []
  private testRuns: TestRunTrace[] = []
  private executionTraces: TestRunTrace[] = []

  async createAgent(
    rawScope: TenantScope,
    rawInput: AgentCreateInput
  ): Promise<AgentRecord> {
    const scope = parseScope(rawScope)
    const input = AgentCreateInputSchema.parse(rawInput)
    if (
      this.agents.some(
        (agent) =>
          agent.tenantId === scope.tenantId && agent.slug === input.slug
      )
    ) {
      throw new DomainError('invalid_action', 'Agent slug already exists')
    }

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
    this.agents = [...this.agents, agent]
    return cloneAgent(agent)
  }

  async getAgent(
    rawScope: TenantScope,
    agentId: AgentId
  ): Promise<AgentRecord | null> {
    const scope = parseScope(rawScope)
    const agent = this.agents.find(
      (candidate) =>
        candidate.tenantId === scope.tenantId && candidate.id === agentId
    )
    return agent ? cloneAgent(agent) : null
  }

  async listAgents(rawScope: TenantScope): Promise<AgentRecord[]> {
    const scope = parseScope(rawScope)
    return this.agents
      .filter((agent) => agent.tenantId === scope.tenantId)
      .map(cloneAgent)
  }

  async createVersion(
    rawScope: TenantScope,
    agentId: AgentId,
    rawConfig: AgentConfig,
    createdBy: string
  ): Promise<AgentVersionRecord> {
    const scope = parseScope(rawScope)
    const agent = this.requireAgent(scope, agentId)
    const config = AgentConfigSchema.parse(rawConfig)
    const versionNumber =
      Math.max(
        0,
        ...this.versions
          .filter((version) => version.tenantId === scope.tenantId)
          .filter((version) => version.agentId === agent.id)
          .map((version) => version.version)
      ) + 1
    const version: AgentVersionRecord = {
      tenantId: scope.tenantId,
      id: createAgentVersionId(),
      agentId: agent.id,
      version: versionNumber,
      status: 'DRAFT',
      config: cloneConfig(config),
      createdBy: validateActor(createdBy),
      createdAt: new Date(),
      publishedAt: null
    }
    this.versions = [...this.versions, version]
    return cloneVersion(version)
  }

  async getVersion(
    rawScope: TenantScope,
    versionId: AgentVersionId
  ): Promise<AgentVersionRecord | null> {
    const scope = parseScope(rawScope)
    const version = this.versions.find(
      (candidate) =>
        candidate.tenantId === scope.tenantId && candidate.id === versionId
    )
    return version ? cloneVersion(version) : null
  }

  async listVersions(
    rawScope: TenantScope,
    agentId: AgentId
  ): Promise<AgentVersionRecord[]> {
    const scope = parseScope(rawScope)
    this.requireAgent(scope, agentId)
    return this.versions
      .filter(
        (version) =>
          version.tenantId === scope.tenantId && version.agentId === agentId
      )
      .sort((left, right) => right.version - left.version)
      .map(cloneVersion)
  }

  async transitionVersion(
    rawScope: TenantScope,
    versionId: AgentVersionId,
    target: AgentVersionStatus
  ): Promise<AgentVersionRecord> {
    const scope = parseScope(rawScope)
    const current = this.requireVersion(scope, versionId)
    if (!canTransition(current.status, target)) {
      throw new DomainError(
        'invalid_action',
        `Version cannot transition from ${current.status} to ${target}`
      )
    }
    const updated: AgentVersionRecord = { ...current, status: target }
    this.versions = this.versions.map((version) =>
      version.id === versionId ? updated : version
    )
    return cloneVersion(updated)
  }

  async publishVersion(
    rawScope: TenantScope,
    versionId: AgentVersionId
  ): Promise<AgentVersionRecord> {
    const scope = parseScope(rawScope)
    const current = this.requireVersion(scope, versionId)
    if (current.status !== 'APPROVED') {
      throw new DomainError(
        'invalid_action',
        'Only an approved version can be published'
      )
    }
    const agent = this.requireAgent(scope, current.agentId)
    const now = new Date()
    const published: AgentVersionRecord = {
      ...current,
      status: 'PUBLISHED',
      publishedAt: now
    }
    this.versions = this.versions.map((version) => {
      if (version.id === versionId) return published
      if (
        version.agentId === current.agentId &&
        version.tenantId === scope.tenantId &&
        version.status === 'PUBLISHED'
      ) {
        return { ...version, status: 'ARCHIVED' as const }
      }
      return version
    })
    this.agents = this.agents.map((candidate) =>
      candidate.id === agent.id
        ? { ...candidate, activeVersionId: published.id, updatedAt: now }
        : candidate
    )
    return cloneVersion(published)
  }

  async rollback(
    rawScope: TenantScope,
    agentId: AgentId,
    versionId: AgentVersionId,
    createdBy: string
  ): Promise<AgentVersionRecord> {
    const scope = parseScope(rawScope)
    const target = this.requireVersion(scope, versionId)
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
    const draft = await this.createVersion(
      scope,
      agentId,
      target.config,
      createdBy
    )
    const testing = await this.transitionVersion(scope, draft.id, 'TESTING')
    const approved = await this.transitionVersion(scope, testing.id, 'APPROVED')
    return this.publishVersion(scope, approved.id)
  }

  async resolvePublished(
    rawScope: TenantScope,
    agentId: AgentId
  ): Promise<AgentVersionRecord | null> {
    const scope = parseScope(rawScope)
    const agent = this.requireAgent(scope, agentId)
    if (!agent.activeVersionId) return null
    const version = this.versions.find(
      (candidate) =>
        candidate.tenantId === scope.tenantId &&
        candidate.id === agent.activeVersionId &&
        candidate.status === 'PUBLISHED'
    )
    return version ? cloneVersion(version) : null
  }

  async recordTestRun(
    rawScope: TenantScope,
    trace: TestRunTrace
  ): Promise<TestRunTrace> {
    const scope = parseScope(rawScope)
    if (trace.tenantId !== scope.tenantId) {
      throw new DomainError('forbidden', 'Trace tenant does not match scope')
    }
    this.assertTraceReferences(scope, trace)
    const stored = cloneTrace(trace)
    this.testRuns = [...this.testRuns, stored]
    return cloneTrace(stored)
  }

  async listTestRuns(
    rawScope: TenantScope,
    limit = 50
  ): Promise<TestRunTrace[]> {
    const scope = parseScope(rawScope)
    return [...this.testRuns]
      .filter((trace) => trace.tenantId === scope.tenantId)
      .reverse()
      .slice(0, normalizeTraceLimit(limit))
      .map(cloneTrace)
  }

  async recordExecutionTrace(
    rawScope: TenantScope,
    trace: TestRunTrace
  ): Promise<TestRunTrace> {
    const scope = parseScope(rawScope)
    if (trace.tenantId !== scope.tenantId) {
      throw new DomainError('forbidden', 'Trace tenant does not match scope')
    }
    this.assertTraceReferences(scope, trace)
    const stored = cloneTrace(trace)
    this.executionTraces = [...this.executionTraces, stored]
    return cloneTrace(stored)
  }

  async listExecutionTraces(
    rawScope: TenantScope,
    limit = 50
  ): Promise<TestRunTrace[]> {
    const scope = parseScope(rawScope)
    return [...this.executionTraces]
      .filter((trace) => trace.tenantId === scope.tenantId)
      .reverse()
      .slice(0, normalizeTraceLimit(limit))
      .map(cloneTrace)
  }

  private requireAgent(scope: TenantScope, agentId: AgentId): AgentRecord {
    const agent = this.agents.find((candidate) => candidate.id === agentId)
    if (!agent) throw new DomainError('invalid_action', 'Agent not found')
    if (agent.tenantId !== scope.tenantId) {
      throw new DomainError('forbidden', 'Agent is outside tenant scope')
    }
    return agent
  }

  private requireVersion(
    scope: TenantScope,
    versionId: AgentVersionId
  ): AgentVersionRecord {
    const version = this.versions.find(
      (candidate) => candidate.id === versionId
    )
    if (!version)
      throw new DomainError('invalid_action', 'Agent version not found')
    if (version.tenantId !== scope.tenantId) {
      throw new DomainError(
        'forbidden',
        'Agent version is outside tenant scope'
      )
    }
    return version
  }

  private assertTraceReferences(scope: TenantScope, trace: TestRunTrace): void {
    const agent = this.requireAgent(scope, trace.agentId)
    const version = this.requireVersion(scope, trace.versionId)
    if (version.agentId !== agent.id) {
      throw new DomainError(
        'invalid_action',
        'Trace agent and version do not belong together'
      )
    }
  }
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

function cloneConfig(config: AgentConfig): AgentConfig {
  return structuredClone(config)
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
    config: cloneConfig(version.config),
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
