import {
  executePublishedAgent,
  parsePublishedAgentJob,
  type PublishedAgentJobDependencies
} from '@cvg/agent-core'
import { TenantIdSchema } from '@cvg/platform'

export type WorkerRuntimeDependencies = PublishedAgentJobDependencies

export interface WorkerStartupFailure {
  code:
    | 'queue_adapter_missing'
    | 'queue_adapter_unsupported'
    | 'controlled_tenant_missing'
    | 'postgres_database_missing'
    | 'postgres_rls_required'
    | 'controlled_mode_required'
    | 'production_controlled_worker_forbidden'
  message: string
}

export async function processAgentTurnJob(
  rawInput: unknown,
  dependencies: WorkerRuntimeDependencies
) {
  const input = parsePublishedAgentJob(rawInput)

  const context = {
    ...(input.conversationId ? { conversationId: input.conversationId } : {}),
    ...(input.sessionId ? { sessionId: input.sessionId } : {})
  }

  return executePublishedAgent({
    store: dependencies.platform,
    tenantId: input.tenantId,
    agentId: input.agentId,
    versionId: input.versionId,
    message: input.message,
    history: input.history,
    ...(input.approvedKnowledge
      ? { approvedKnowledge: input.approvedKnowledge }
      : {}),
    ...(dependencies.resolveApprovedKnowledge
      ? { resolveApprovedKnowledge: dependencies.resolveApprovedKnowledge }
      : {}),
    ...(Object.keys(context).length > 0 ? { context } : {})
  })
}

export function getWorkerStartupFailure(
  env: NodeJS.ProcessEnv = process.env
): WorkerStartupFailure | null {
  if (!env.CVG_WORKER_QUEUE_ADAPTER?.trim()) {
    return {
      code: 'queue_adapter_missing',
      message: 'Worker queue adapter is not configured'
    }
  }

  if (env.CVG_WORKER_QUEUE_ADAPTER.trim() === 'controlled-memory') {
    if (!TenantIdSchema.safeParse(env.CVG_WORKER_TENANT_ID).success) {
      return {
        code: 'controlled_tenant_missing',
        message: 'Controlled worker tenant is not configured'
      }
    }
    return null
  }

  if (
    env.CVG_WORKER_QUEUE_ADAPTER.trim() === 'postgres-controlled' ||
    env.CVG_WORKER_QUEUE_ADAPTER.trim() === 'postgres'
  ) {
    if (env.NODE_ENV === 'production') {
      return {
        code: 'production_controlled_worker_forbidden',
        message:
          'Controlled PostgreSQL worker is disabled in production pending external gates'
      }
    }
    if (!env.DATABASE_URL?.trim()) {
      return {
        code: 'postgres_database_missing',
        message: 'DATABASE_URL is required for the PostgreSQL worker'
      }
    }
    if (!TenantIdSchema.safeParse(env.CVG_WORKER_TENANT_ID).success) {
      return {
        code: 'controlled_tenant_missing',
        message: 'Controlled worker tenant is not configured'
      }
    }
    if (env.POSTGRES_RLS_ENFORCEMENT !== 'true') {
      return {
        code: 'postgres_rls_required',
        message: 'PostgreSQL worker requires tenant RLS enforcement'
      }
    }
    if (env.CVG_WORKER_CONTROLLED_MODE !== 'true') {
      return {
        code: 'controlled_mode_required',
        message: 'PostgreSQL worker requires explicit controlled mode'
      }
    }
    return null
  }

  return {
    code: 'queue_adapter_unsupported',
    message: 'No controlled worker queue adapter is available'
  }
}
