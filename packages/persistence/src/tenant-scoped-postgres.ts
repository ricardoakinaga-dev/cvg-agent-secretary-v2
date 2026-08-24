import { DomainError } from '@cvg/shared'
import {
  TenantIdSchema,
  TenantScopeSchema,
  type AgentConfig,
  type AgentId,
  type AgentVersionId,
  type AgentVersionStatus,
  type AgentCreateInput,
  type AgentRecord,
  type AgentVersionRecord,
  type TenantScope,
  type TestRunTrace,
  type TenantId
} from '@cvg/platform'
import type {
  ApprovalRequestRecord,
  AuditEventRecord,
  AuditEvidenceFilters,
  AuditEvidencePage,
  AuditEvidenceQuery,
  AuditEvidenceSummary,
  ConversationPage,
  MessageRecord,
  SessionRecord,
  TaskRecord
} from './schema.ts'
import {
  PostgresRuntimeRepository,
  type InboundRuntimeCompletionInput,
  type PostgresQueryable
} from './postgres.ts'
import { PostgresControlPlaneRepository } from './platform-control-plane-repository.ts'
import type { Channel, TaskStatus } from '@cvg/shared'

export const CVG_TENANT_CONTEXT_SETTING = 'cvg.tenant_id'

export interface PostgresPoolClient extends PostgresQueryable {
  release(error?: Error): void
}

export interface PostgresPoolLike {
  connect(): Promise<PostgresPoolClient>
}

/**
 * Runs an operation on one pool connection with a session-local tenant
 * context. The connection is destroyed when cleanup fails, preventing a
 * tenant context from leaking to the next borrower.
 */
export async function withTenantContext<T>(
  pool: PostgresPoolLike,
  rawTenantId: TenantId,
  operation: (client: PostgresPoolClient) => Promise<T>
): Promise<T> {
  const tenantId = TenantIdSchema.parse(rawTenantId)
  const client = await pool.connect()
  let contextSet = false
  let originalSearchPath: string | undefined
  let callbackResult: T | undefined
  let callbackError: unknown

  try {
    const searchPath = await client.query<{ search_path: string }>(
      'SHOW search_path'
    )
    originalSearchPath = searchPath.rows[0]?.search_path
    await client.query('SELECT set_config($1, $2, false)', [
      CVG_TENANT_CONTEXT_SETTING,
      tenantId
    ])
    contextSet = true
    try {
      callbackResult = await operation(client)
    } catch (error) {
      callbackError = error
    }

    let cleanupError: Error | undefined
    try {
      await client.query('SELECT set_config($1, $2, false)', [
        CVG_TENANT_CONTEXT_SETTING,
        ''
      ])
    } catch (error) {
      cleanupError = toError(error)
    }
    if (!cleanupError && originalSearchPath) {
      try {
        await client.query('SELECT set_config($1, $2, false)', [
          'search_path',
          originalSearchPath
        ])
        const restoredSearchPath = await client.query<{
          search_path: string
        }>('SHOW search_path')
        if (restoredSearchPath.rows[0]?.search_path !== originalSearchPath) {
          cleanupError = new Error(
            'PostgreSQL search_path reset was not verified'
          )
        }
      } catch (error) {
        cleanupError = toError(error)
      }
    }
    client.release(cleanupError)
    if (cleanupError) throw cleanupError
    if (callbackError) throw callbackError
    return callbackResult as T
  } catch (error) {
    if (!contextSet) client.release(toError(error))
    throw error
  }
}

export class TenantScopedPostgresRuntimeRepository {
  constructor(private readonly pool: PostgresPoolLike) {}

  findByExternalMessage(
    tenantId: TenantId,
    channel: Channel,
    externalMessageId: string
  ): Promise<MessageRecord | null> {
    return this.run(tenantId, (repository) =>
      repository.findByExternalMessage(tenantId, channel, externalMessageId)
    )
  }

  createWithSession(
    input: Parameters<PostgresRuntimeRepository['createWithSession']>[0]
  ): Promise<
    Awaited<ReturnType<PostgresRuntimeRepository['createWithSession']>>
  > {
    return this.run(input.tenantId, (repository) =>
      repository.createWithSession(input)
    )
  }

  appendOutboundMessage(
    input: Parameters<PostgresRuntimeRepository['appendOutboundMessage']>[0]
  ): Promise<
    Awaited<ReturnType<PostgresRuntimeRepository['appendOutboundMessage']>>
  > {
    return this.run(input.tenantId, (repository) =>
      repository.appendOutboundMessage(input)
    )
  }

  markInboundRuntimeCompleted(
    messageId: string,
    tenantId: TenantId
  ): Promise<boolean> {
    return this.run(tenantId, (repository) =>
      repository.markInboundRuntimeCompleted(messageId, tenantId)
    )
  }

  completeInboundRuntime(
    input: InboundRuntimeCompletionInput
  ): Promise<{ status: 'completed' | 'paused' }> {
    return withTenantContext(this.pool, input.tenantId, (client) =>
      new PostgresRuntimeRepository(client, {
        tenantIsolation: true
      }).completeInboundRuntime(
        input,
        new PostgresControlPlaneRepository(client)
      )
    )
  }

  transitionTakeover(
    tenantId: TenantId,
    sessionId: string,
    event: Parameters<PostgresRuntimeRepository['transitionTakeover']>[2]
  ): Promise<SessionRecord | null> {
    return this.run(tenantId, (repository) =>
      repository.transitionTakeover(tenantId, sessionId, event)
    )
  }

  appendAudit(
    input: Parameters<PostgresRuntimeRepository['appendAudit']>[0],
    rawTenantId?: TenantId
  ): Promise<AuditEventRecord> {
    const tenantId = requireTenantId(rawTenantId)
    const payloadTenantId = readPayloadTenantId(input.payload)
    if (payloadTenantId !== tenantId) {
      throw new DomainError(
        'invalid_action',
        'Audit payload tenant does not match the explicit tenant scope'
      )
    }
    return this.run(tenantId, (repository) =>
      repository.appendAudit({ ...input, tenantId })
    )
  }

  listAuditBySession(
    sessionId: string,
    tenantId: TenantId
  ): Promise<AuditEventRecord[]> {
    return this.run(tenantId, (repository) =>
      repository.listAuditBySession(sessionId, tenantId)
    )
  }

  listAuditEvidence(
    query: AuditEvidenceQuery,
    tenantId: TenantId
  ): Promise<AuditEvidencePage> {
    return this.run(tenantId, (repository) =>
      repository.listAuditEvidence(query, tenantId)
    )
  }

  summarizeAuditEvidence(
    filters: AuditEvidenceFilters,
    tenantId: TenantId
  ): Promise<AuditEvidenceSummary> {
    return this.run(tenantId, (repository) =>
      repository.summarizeAuditEvidence(filters, tenantId)
    )
  }

  timeline(
    tenantId: TenantId,
    conversationId: string
  ): Promise<Awaited<ReturnType<PostgresRuntimeRepository['timeline']>>> {
    return this.run(tenantId, (repository) =>
      repository.timeline(tenantId, conversationId)
    )
  }

  listPage(
    tenantId: TenantId,
    input: Parameters<PostgresRuntimeRepository['listPage']>[1]
  ): Promise<ConversationPage> {
    return this.run(tenantId, (repository) =>
      repository.listPage(tenantId, input)
    )
  }

  createTask(
    input: Parameters<PostgresRuntimeRepository['createTask']>[0],
    tenantId?: TenantId
  ): Promise<TaskRecord> {
    const scope = requireTenantId(tenantId)
    return this.run(scope, (repository) => repository.createTask(input, scope))
  }

  listTasks(tenantId?: TenantId): Promise<TaskRecord[]> {
    const scope = requireTenantId(tenantId)
    return this.run(scope, (repository) => repository.listTasks(scope))
  }

  findTaskById(id: string, tenantId?: TenantId): Promise<TaskRecord | null> {
    const scope = requireTenantId(tenantId)
    return this.run(scope, (repository) => repository.findTaskById(id, scope))
  }

  updateTaskStatus(
    id: string,
    status: TaskStatus,
    tenantId?: TenantId
  ): Promise<TaskRecord | null> {
    const scope = requireTenantId(tenantId)
    return this.run(scope, (repository) =>
      repository.updateTaskStatus(id, status, scope)
    )
  }

  saveApproval(
    request: ApprovalRequestRecord,
    tenantId?: TenantId
  ): Promise<ApprovalRequestRecord> {
    const scope = requireTenantId(tenantId)
    return this.run(scope, (repository) =>
      repository.saveApproval(request, scope)
    )
  }

  findApprovalById(
    id: string,
    tenantId?: TenantId
  ): Promise<ApprovalRequestRecord | null> {
    const scope = requireTenantId(tenantId)
    return this.run(scope, (repository) =>
      repository.findApprovalById(id, scope)
    )
  }

  listApprovals(tenantId?: TenantId): Promise<ApprovalRequestRecord[]> {
    const scope = requireTenantId(tenantId)
    return this.run(scope, (repository) => repository.listApprovals(scope))
  }

  private run<T>(
    tenantId: TenantId,
    operation: (repository: PostgresRuntimeRepository) => Promise<T>
  ): Promise<T> {
    return withTenantContext(this.pool, tenantId, (client) =>
      operation(
        new PostgresRuntimeRepository(client, { tenantIsolation: true })
      )
    )
  }
}

export class TenantScopedPostgresControlPlaneRepository {
  constructor(private readonly pool: PostgresPoolLike) {}

  createAgent(
    scope: TenantScope,
    input: AgentCreateInput
  ): Promise<AgentRecord> {
    return this.run(scope, (repository) => repository.createAgent(scope, input))
  }

  getAgent(scope: TenantScope, agentId: AgentId): Promise<AgentRecord | null> {
    return this.run(scope, (repository) => repository.getAgent(scope, agentId))
  }

  listAgents(scope: TenantScope): Promise<AgentRecord[]> {
    return this.run(scope, (repository) => repository.listAgents(scope))
  }

  createVersion(
    scope: TenantScope,
    agentId: AgentId,
    config: AgentConfig,
    createdBy: string
  ): Promise<AgentVersionRecord> {
    return this.run(scope, (repository) =>
      repository.createVersion(scope, agentId, config, createdBy)
    )
  }

  getVersion(
    scope: TenantScope,
    versionId: AgentVersionId
  ): Promise<AgentVersionRecord | null> {
    return this.run(scope, (repository) =>
      repository.getVersion(scope, versionId)
    )
  }

  listVersions(
    scope: TenantScope,
    agentId: AgentId
  ): Promise<AgentVersionRecord[]> {
    return this.run(scope, (repository) =>
      repository.listVersions(scope, agentId)
    )
  }

  transitionVersion(
    scope: TenantScope,
    versionId: AgentVersionId,
    target: AgentVersionStatus
  ): Promise<AgentVersionRecord> {
    return this.run(scope, (repository) =>
      repository.transitionVersion(scope, versionId, target)
    )
  }

  publishVersion(
    scope: TenantScope,
    versionId: AgentVersionId
  ): Promise<AgentVersionRecord> {
    return this.run(scope, (repository) =>
      repository.publishVersion(scope, versionId)
    )
  }

  rollback(
    scope: TenantScope,
    agentId: AgentId,
    versionId: AgentVersionId,
    createdBy: string
  ): Promise<AgentVersionRecord> {
    return this.run(scope, (repository) =>
      repository.rollback(scope, agentId, versionId, createdBy)
    )
  }

  resolvePublished(
    scope: TenantScope,
    agentId: AgentId
  ): Promise<AgentVersionRecord | null> {
    return this.run(scope, (repository) =>
      repository.resolvePublished(scope, agentId)
    )
  }

  recordTestRun(
    scope: TenantScope,
    trace: TestRunTrace
  ): Promise<TestRunTrace> {
    return this.run(scope, (repository) =>
      repository.recordTestRun(scope, trace)
    )
  }

  listTestRuns(scope: TenantScope, limit?: number): Promise<TestRunTrace[]> {
    return this.run(scope, (repository) =>
      repository.listTestRuns(scope, limit)
    )
  }

  recordExecutionTrace(
    scope: TenantScope,
    trace: TestRunTrace
  ): Promise<TestRunTrace> {
    return this.run(scope, (repository) =>
      repository.recordExecutionTrace(scope, trace)
    )
  }

  listExecutionTraces(
    scope: TenantScope,
    limit?: number
  ): Promise<TestRunTrace[]> {
    return this.run(scope, (repository) =>
      repository.listExecutionTraces(scope, limit)
    )
  }

  private run<T>(
    rawScope: TenantScope,
    operation: (repository: PostgresControlPlaneRepository) => Promise<T>
  ): Promise<T> {
    const scope = TenantScopeSchema.parse(rawScope)
    return withTenantContext(this.pool, scope.tenantId, (client) =>
      operation(new PostgresControlPlaneRepository(client))
    )
  }
}

function readPayloadTenantId(payload: unknown): TenantId {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'tenantId' in payload
  ) {
    const parsed = TenantIdSchema.safeParse(payload.tenantId)
    if (parsed.success) return parsed.data
  }
  throw new DomainError(
    'invalid_action',
    'A tenant-scoped audit payload is required'
  )
}

function toError(error: unknown): Error {
  return error instanceof Error
    ? error
    : new Error('PostgreSQL tenant context failure')
}

function requireTenantId(rawTenantId: TenantId | undefined): TenantId {
  if (!rawTenantId) {
    throw new DomainError('invalid_action', 'Tenant scope is required')
  }
  return TenantIdSchema.parse(rawTenantId)
}
