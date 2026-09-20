/**
 * Responsibility: compose the runtime persistence adapters (memory vs
 * PostgreSQL, tenant-scoped or direct) and the default agent-runtime
 * capability, knowledge and inbound-completion hooks from server options.
 */
import type { ApprovalAuthority } from '@cvg/approval-engine'
import { InMemoryGoalPlanStore, type GoalPlanStore } from '@cvg/agent-runtime'
import {
  createControlledCapabilityGateway,
  InMemoryCapabilityApprovalAuthority,
  type AgentExecutionActor,
  type AgentId,
  type ApprovedKnowledgeForTest,
  type ApprovedKnowledgeResolver,
  type CapabilityActorAuthorizer,
  type CapabilityApprovalAuthority,
  type CapabilityApprovalResolver,
  type CapabilityGateway,
  type TenantId
} from '@cvg/platform'
import {
  ApprovalRepository,
  AuditRepository,
  type AuditEventRecord,
  type AuditEvidenceCheckpointCreateInput,
  type AuditEvidenceCheckpointRecord,
  type AuditEvidenceFilters,
  type AuditEvidenceQuery,
  ConversationRepository,
  type DurableOutboxAdapter,
  InMemoryDatabase,
  type InboundRuntimeCompletionInput,
  JourneyRepository,
  type JourneyRepositoryPort,
  OutboxRepository,
  PostgresApprovalAuthority,
  PostgresGoalPlanStore,
  PostgresJourneyRepository,
  PostgresRuntimeRepository,
  TaskRepository,
  TenantScopedPostgresCapabilityApprovalRepository,
  TenantScopedPostgresRuntimeRepository,
  type PostgresPoolClient,
  type PostgresPoolLike,
  type PostgresQueryable
} from '@cvg/persistence'
import { DomainError, type Channel } from '@cvg/shared'

export type InboundRuntimeCompletion = (
  input: InboundRuntimeCompletionInput
) => Promise<{ status: 'completed' | 'paused' }>

export interface AgentRuntimeOptions {
  resolveAgentId: (input: {
    tenantId: TenantId
    channel: Channel
    senderRef: string
  }) => AgentId | null | Promise<AgentId | null>
  approvedKnowledge?: ApprovedKnowledgeForTest
  resolveApprovedKnowledge?: ApprovedKnowledgeResolver
  capabilityGateway?: CapabilityGateway
  actor?: AgentExecutionActor
  resolveCapabilityApproval?: CapabilityApprovalResolver
  completeInboundRuntime?: InboundRuntimeCompletion
}

export type ServerPersistenceConfig =
  | { kind: 'memory' }
  | { kind: 'postgres'; client: PostgresQueryable }
  | { kind: 'postgres-pool'; pool: PostgresPoolLike }

export interface RuntimePersistence {
  /** Legacy direct-client fixtures do not have the tenant-scoped pin columns. */
  sessionVersionPinning: boolean
  outbox: DurableOutboxAdapter
  orchestration: GoalPlanStore | null
  /** R3 controlled journey store: memory or tenant-scoped PostgreSQL adapter. */
  journeys: JourneyRepositoryPort | null
  conversations:
    | ConversationRepository
    | PostgresRuntimeRepository
    | TenantScopedPostgresRuntimeRepository

  tasks: {
    create: TaskRepository['create'] | PostgresRuntimeRepository['createTask']
    list: TaskRepository['list'] | PostgresRuntimeRepository['listTasks']
    findById:
      | TaskRepository['findById']
      | PostgresRuntimeRepository['findTaskById']
    updateStatus:
      | TaskRepository['updateStatus']
      | PostgresRuntimeRepository['updateTaskStatus']
  }
  approvals: {
    save: ApprovalRepository['save'] | PostgresRuntimeRepository['saveApproval']
    decideWithAudit:
      | ApprovalRepository['decideWithAudit']
      | PostgresRuntimeRepository['decideApprovalWithAudit']
    findById:
      | ApprovalRepository['findById']
      | PostgresRuntimeRepository['findApprovalById']
    list:
      | ApprovalRepository['list']
      | PostgresRuntimeRepository['listApprovals']
  }
  audit: {
    append: (
      input: Parameters<AuditRepository['append']>[0],
      tenantId?: TenantId
    ) => AuditEventRecord | Promise<AuditEventRecord>
    listBySession:
      | AuditRepository['listBySession']
      | PostgresRuntimeRepository['listAuditBySession']
    listEvidence:
      | AuditRepository['listEvidence']
      | PostgresRuntimeRepository['listAuditEvidence']
    summarizeEvidence:
      | AuditRepository['summarizeEvidence']
      | PostgresRuntimeRepository['summarizeAuditEvidence']
    createAuditEvidenceCheckpoint: (
      input: AuditEvidenceCheckpointCreateInput,
      createdBy: string,
      tenantId: TenantId
    ) => AuditEvidenceCheckpointRecord | Promise<AuditEvidenceCheckpointRecord>
    getAuditEvidenceCheckpoint: (
      id: string,
      tenantId: TenantId
    ) =>
      | AuditEvidenceCheckpointRecord
      | null
      | Promise<AuditEvidenceCheckpointRecord | null>
    listAuditEvidenceCheckpoints: (
      tenantId: TenantId
    ) =>
      | AuditEvidenceCheckpointRecord[]
      | Promise<AuditEvidenceCheckpointRecord[]>
    transitionAuditEvidenceCheckpoint: (
      id: string,
      status: 'SEALED' | 'ARCHIVED',
      updatedBy: string,
      expectedStatus: 'SEALED' | 'ARCHIVED',
      tenantId: TenantId
    ) =>
      | AuditEvidenceCheckpointRecord
      | null
      | Promise<AuditEvidenceCheckpointRecord | null>
  }
}

export function createPersistence(
  config: ServerPersistenceConfig | undefined,
  journeyRepository?: JourneyRepositoryPort | null
): RuntimePersistence {
  if (config?.kind === 'postgres' || config?.kind === 'postgres-pool') {
    const postgres =
      config.kind === 'postgres'
        ? new PostgresRuntimeRepository(config.client, {
            tenantIsolation: true
          })
        : new TenantScopedPostgresRuntimeRepository(config.pool)
    const journeys =
      journeyRepository !== undefined
        ? journeyRepository
        : createPostgresJourneyRepository(config)
    return {
      sessionVersionPinning: config.kind === 'postgres-pool',
      outbox: postgres as unknown as DurableOutboxAdapter,
      orchestration:
        config.kind === 'postgres-pool'
          ? new PostgresGoalPlanStore(config.pool)
          : null,
      journeys,
      conversations: postgres,
      tasks: {
        create: (
          input: Parameters<PostgresRuntimeRepository['createTask']>[0],
          tenantId?: TenantId
        ) => postgres.createTask(input, tenantId),
        list: (tenantId) => postgres.listTasks(tenantId),
        findById: (id, tenantId) => postgres.findTaskById(id, tenantId),
        updateStatus: (id, status, tenantId) =>
          postgres.updateTaskStatus(id, status, tenantId)
      },
      approvals: {
        decideWithAudit: (input, tenantId) =>
          postgres.decideApprovalWithAudit(input, tenantId),
        save: (request, tenantId) => postgres.saveApproval(request, tenantId),
        findById: (id, tenantId) => postgres.findApprovalById(id, tenantId),
        list: (tenantId) => postgres.listApprovals(tenantId)
      },
      audit: {
        append: (input, tenantId) =>
          config.kind === 'postgres-pool'
            ? postgres.appendAudit(input, tenantId)
            : tenantId
              ? postgres.appendAudit({ ...input, tenantId })
              : Promise.reject(
                  new DomainError('unauthorized', 'Tenant scope is required')
                ),
        listBySession: (sessionId, tenantId: TenantId) =>
          postgres.listAuditBySession(sessionId, tenantId),
        listEvidence: (query: AuditEvidenceQuery, tenantId: TenantId) =>
          postgres.listAuditEvidence(query, tenantId),
        summarizeEvidence: (
          filters: AuditEvidenceFilters,
          tenantId: TenantId
        ) => postgres.summarizeAuditEvidence(filters, tenantId),
        createAuditEvidenceCheckpoint: (
          input: AuditEvidenceCheckpointCreateInput,
          createdBy: string,
          tenantId: TenantId
        ) => postgres.createAuditEvidenceCheckpoint(input, createdBy, tenantId),
        getAuditEvidenceCheckpoint: (id: string, tenantId: TenantId) =>
          postgres.getAuditEvidenceCheckpoint(id, tenantId),
        listAuditEvidenceCheckpoints: (tenantId: TenantId) =>
          postgres.listAuditEvidenceCheckpoints(tenantId),
        transitionAuditEvidenceCheckpoint: (
          id: string,
          status: 'SEALED' | 'ARCHIVED',
          updatedBy: string,
          expectedStatus: 'SEALED' | 'ARCHIVED',
          tenantId: TenantId
        ) =>
          postgres.transitionAuditEvidenceCheckpoint(
            id,
            status,
            updatedBy,
            expectedStatus,
            tenantId
          )
      }
    }
  }

  const db = new InMemoryDatabase()
  const outbox = new OutboxRepository(db, { enforceLeaseFencing: true })
  return {
    sessionVersionPinning: true,
    outbox,
    orchestration: new InMemoryGoalPlanStore(),
    journeys:
      journeyRepository !== undefined
        ? journeyRepository
        : new JourneyRepository(db),
    conversations: new ConversationRepository(db),
    tasks: new TaskRepository(db),
    approvals: new ApprovalRepository(db),
    audit: new AuditRepository(db)
  }
}

export function createRuntimeApprovalAuthority(
  config: ServerPersistenceConfig | undefined
): ApprovalAuthority | undefined {
  if (config?.kind === 'postgres-pool') {
    return new PostgresApprovalAuthority(config.pool)
  }
  if (config?.kind === 'postgres') {
    return new PostgresApprovalAuthority(singleConnectionPool(config.client))
  }
  return undefined
}

type PostgresPersistenceConfig = Extract<
  ServerPersistenceConfig,
  { kind: 'postgres' } | { kind: 'postgres-pool' }
>

/**
 * PostgreSQL persistence mode always exposes a concrete journey repository.
 * If the configured adapter cannot carry tenant-scoped transactions, startup
 * fails closed instead of hiding a missing adapter behind a cast.
 */
function createPostgresJourneyRepository(
  config: PostgresPersistenceConfig
): PostgresJourneyRepository {
  if (config.kind === 'postgres-pool') {
    if (typeof config.pool?.connect !== 'function') {
      throw new Error(
        'PostgreSQL journey persistence requires a pool adapter with connect()'
      )
    }
    return new PostgresJourneyRepository(config.pool)
  }
  if (typeof config.client?.query !== 'function') {
    throw new Error(
      'PostgreSQL journey persistence requires a queryable persistence client'
    )
  }
  return new PostgresJourneyRepository(singleConnectionPool(config.client))
}

function singleConnectionPool(client: PostgresQueryable): PostgresPoolLike {
  const pooled: PostgresPoolClient = {
    query: (text, values) => client.query(text, values),
    release: () => undefined
  }
  return { connect: async () => pooled }
}

export function withDefaultCapabilityGateway(
  agentRuntime: AgentRuntimeOptions | undefined,
  approvalAuthority: CapabilityApprovalAuthority,
  actorAuthorizer: CapabilityActorAuthorizer
): AgentRuntimeOptions | undefined {
  if (!agentRuntime || agentRuntime.capabilityGateway) {
    return agentRuntime
  }

  return {
    ...agentRuntime,
    capabilityGateway: createControlledCapabilityGateway({
      approvalAuthority,
      actorAuthorizer
    })
  }
}

export function withDefaultKnowledgeResolver(
  agentRuntime: AgentRuntimeOptions | undefined,
  resolver: ApprovedKnowledgeResolver | undefined
): AgentRuntimeOptions | undefined {
  if (!agentRuntime || agentRuntime.resolveApprovedKnowledge || !resolver) {
    return agentRuntime
  }
  return { ...agentRuntime, resolveApprovedKnowledge: resolver }
}

export function createCapabilityApprovalAuthority(
  configured: CapabilityApprovalAuthority | undefined,
  persistence: ServerPersistenceConfig | undefined
): CapabilityApprovalAuthority {
  if (configured) return configured
  if (persistence?.kind === 'postgres-pool') {
    return new TenantScopedPostgresCapabilityApprovalRepository(
      persistence.pool
    )
  }
  return new InMemoryCapabilityApprovalAuthority()
}

export function withDefaultInboundCompletion(
  agentRuntime: AgentRuntimeOptions | undefined,
  persistence: ServerPersistenceConfig | undefined
): AgentRuntimeOptions | undefined {
  if (
    !agentRuntime ||
    agentRuntime.completeInboundRuntime ||
    persistence?.kind !== 'postgres-pool'
  ) {
    return agentRuntime
  }
  const runtime = new TenantScopedPostgresRuntimeRepository(persistence.pool)
  return {
    ...agentRuntime,
    completeInboundRuntime: (input) => runtime.completeInboundRuntime(input)
  }
}
