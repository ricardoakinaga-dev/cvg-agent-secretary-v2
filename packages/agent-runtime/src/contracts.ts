import { z } from 'zod'
import type { DataClassification, Role } from '@cvg/shared'
import type { Capability, AgentProfileName } from '@cvg/policy-engine'
import type { PolicyDecision } from '@cvg/policy-engine'
import type {
  ModelInput,
  ModelProfileName,
  ModelResult,
  StructuredOutputContract
} from '@cvg/model-gateway'

export const LoopLimitsSchema = z
  .object({
    maxSteps: z.number().int().min(1).max(32).default(8),
    maxModelCalls: z.number().int().min(0).max(4).default(1),
    maxToolCalls: z.number().int().min(0).max(4).default(1),
    maxDurationMs: z.number().int().min(100).max(300_000).default(30_000),
    maxCostUsd: z.number().min(0).max(100).default(0.5)
  })
  .strict()

export type LoopLimits = z.output<typeof LoopLimitsSchema>

export interface GovernedResource {
  type: string
  id?: string
  tenantId?: string
}

export interface GovernedTurnInput {
  tenantId: string
  operatorId: string
  operatorRole: Role
  agentId: string
  agentVersion: string
  agentProfile: AgentProfileName
  conversationId: string
  sessionId?: string
  correlationId: string
  capability: Capability
  action: string
  resource: GovernedResource
  dataClassification: DataClassification
  prompt: { promptId: string; version: string; sha256?: string }
  modelProfile: ModelProfileName
  modelMessages: ModelInput
  structuredOutput?: StructuredOutputContract
  approvalId?: string
  approvalPayload?: unknown
  idempotencyKey?: string
  task?: string
  shadowMode?: boolean
  takeoverActive?: boolean
  limits?: Partial<LoopLimits>
}

export type GovernedOutcome =
  | 'executed'
  | 'approval_required'
  | 'denied'
  | 'shadowed'

export interface ToolInvocation {
  tenantId: string
  capability: Capability
  action: string
  resource: GovernedResource
  payload: unknown
  modelResult: ModelResult | undefined
  correlationId: string
  traceId: string
  shadowMode: boolean
}

export interface OutboxEnqueueInput {
  tenantId: string
  eventType: string
  idempotencyKey: string
  correlationId: string
  traceId: string
  payload: Record<string, unknown>
}

export interface GovernedTurnResult {
  outcome: GovernedOutcome
  reason: string
  decision: PolicyDecision
  traceId: string
  spanId: string
  correlationId: string
  modelResult?: ModelResult
  approvalId?: string
  toolResult?: unknown
  outboxEventId?: string
  auditChainValid: boolean
  costUsd: number
  durationMs: number
}

export interface GovernedAgentRuntimeOptions {
  policy: import('@cvg/policy-engine').PolicyEngine
  approvals: import('@cvg/approval-engine').ApprovalEngine
  modelGateway: import('@cvg/model-gateway').ModelGateway
  telemetry: import('@cvg/observability').Telemetry
  audit: import('@cvg/observability').HashChainedAuditLedger
  toolExecutor: (invocation: ToolInvocation) => Promise<{ result: unknown }>
  outbox: (event: OutboxEnqueueInput) => Promise<{ eventId: string }>
  clock?: () => Date
}
