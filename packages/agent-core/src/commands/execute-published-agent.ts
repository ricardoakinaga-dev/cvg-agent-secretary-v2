import {
  createControlledCapabilityGateway,
  executeConfiguredAgent,
  type ApprovedKnowledgeForTest,
  type AgentExecutionActor,
  type ControlPlaneStore,
  type PluginAuditEvent,
  type CapabilityApproval,
  type CapabilityApprovalResolver,
  type CapabilityGateway
} from '@cvg/platform'
import type { AgentId, TenantId } from '@cvg/platform'

export interface PublishedAgentExecutionInput {
  store: ControlPlaneStore
  tenantId: TenantId
  agentId: AgentId
  message: string
  history: string[]
  context?: { conversationId?: string; sessionId?: string }
  approvedKnowledge?: ApprovedKnowledgeForTest
  capabilityGateway?: CapabilityGateway
  actor?: AgentExecutionActor
  capabilityApproval?: CapabilityApproval
  resolveCapabilityApproval?: CapabilityApprovalResolver
  requireCapabilityApproval?: boolean
  onToolAudit?: (event: PluginAuditEvent) => void | Promise<void>
}

export type PublishedAgentExecutionResult =
  | {
      status: 'completed'
      trace: Awaited<ReturnType<typeof executeConfiguredAgent>>
    }
  | {
      status: 'not_configured'
      trace: null
      reason: 'published_version_missing'
    }

export async function executePublishedAgent(
  input: PublishedAgentExecutionInput
): Promise<PublishedAgentExecutionResult> {
  const version = await input.store.resolvePublished(
    { tenantId: input.tenantId },
    input.agentId
  )
  if (!version) {
    return {
      status: 'not_configured',
      trace: null,
      reason: 'published_version_missing'
    }
  }

  const trace = await executeConfiguredAgent({
    store: input.store,
    tenantId: input.tenantId,
    agentId: input.agentId,
    versionId: version.id,
    message: input.message,
    history: input.history,
    executionMode: 'CONTROLLED_RUNTIME',
    capabilityGateway:
      input.capabilityGateway ?? createControlledCapabilityGateway(),
    actor: input.actor ?? {
      id: 'system.controlled-runtime',
      role: 'System',
      permissions: ['scheduling:read']
    },
    ...(input.capabilityApproval
      ? { capabilityApproval: input.capabilityApproval }
      : {}),
    ...(input.resolveCapabilityApproval
      ? { resolveCapabilityApproval: input.resolveCapabilityApproval }
      : {}),
    ...(input.requireCapabilityApproval
      ? { requireCapabilityApproval: true }
      : {}),
    ...(input.onToolAudit ? { onToolAudit: input.onToolAudit } : {}),
    ...(input.context ? { context: input.context } : {}),
    ...(input.approvedKnowledge
      ? { approvedKnowledge: input.approvedKnowledge }
      : {})
  })
  return { status: 'completed', trace }
}
