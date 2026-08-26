import {
  executePublishedAgent,
  parsePublishedAgentJob,
  type PublishedAgentJobDependencies
} from '@cvg/agent-core'

export type WorkerRuntimeDependencies = PublishedAgentJobDependencies

export interface WorkerStartupFailure {
  code: 'queue_adapter_missing' | 'queue_adapter_unsupported'
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

  return {
    code: 'queue_adapter_unsupported',
    message: 'No controlled worker queue adapter is available'
  }
}
