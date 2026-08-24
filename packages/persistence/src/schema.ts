import type {
  ApprovalStatus,
  Channel,
  ConversationStatus,
  RiskLevel,
  SessionStatus,
  TaskPriority,
  TaskStatus,
  ToolStatus
} from '@cvg/shared'
import type { HumanTakeoverState, TenantId } from '@cvg/platform'

export interface ConversationRecord {
  tenantId: TenantId
  id: string
  channel: Channel
  senderRef: string
  senderRefHash: string
  status: ConversationStatus
  correlationId: string
  createdAt: Date
  updatedAt: Date
}

export interface PaginationInput {
  limit: number
  offset: number
}

export interface PageInfo {
  limit: number
  offset: number
  total: number
  hasNextPage: boolean
}

export interface ConversationListItem {
  id: string
  channel: Channel
  senderRef: string
  status: ConversationStatus
  correlationId: string
  openSessionId: string | null
  lastMessageBody: string | null
  lastMessageAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface ConversationPage {
  items: ConversationListItem[]
  pageInfo: PageInfo
}

export interface MessageRecord {
  id: string
  conversationId: string
  externalMessageId: string
  direction: 'inbound' | 'outbound'
  body: string
  /** Inbound runtime work is retryable until its finalizer commits. */
  runtimeStatus?: 'pending' | 'completed'
  createdAt: Date
}

export interface SessionRecord {
  id: string
  conversationId: string
  status: SessionStatus
  takeoverState: HumanTakeoverState
  createdAt: Date
  updatedAt: Date
}

export interface AgentRunRecord {
  id: string
  sessionId: string
  status: 'started' | 'completed' | 'failed'
  createdAt: Date
  updatedAt: Date
}

export interface ToolCallRecord {
  id: string
  agentRunId: string
  toolName: string
  status: ToolStatus
  input: unknown
  output: unknown
  error: string | null
  createdAt: Date
}

export interface ApprovalRequestRecord {
  id: string
  sessionId: string
  proposedAction: string
  summary: string
  riskLevel: RiskLevel
  status: ApprovalStatus
  decidedBy: string | null
  decidedAt: Date | null
  createdAt: Date
}

export interface TaskRecord {
  id: string
  sessionId: string
  title: string
  description: string
  priority: TaskPriority
  source: string
  status: TaskStatus
  idempotencyKey: string
  createdAt: Date
}

export interface AuditEventRecord {
  id: string
  /** Persisted ownership; payload.tenantId is never authoritative. */
  tenantId?: TenantId
  type: AuditEventType
  actorType: 'System' | 'Operator' | 'Approver' | 'Supervisor' | 'Admin'
  actorId: string
  correlationId: string
  policyVersion: string
  payload: unknown
  createdAt: Date
}

export type AuditEventType =
  | 'tool_call'
  | 'safety_event'
  | 'integration_event'
  | 'policy_decision'
  | 'approval_decision'
  | 'handoff'

export interface AuditEvidenceFilters {
  sessionId?: string
  correlationId?: string
  type?: AuditEventType
  actorId?: string
}

export interface AuditEvidenceQuery extends AuditEvidenceFilters {
  limit: number
  offset: number
}

export interface AuditEvidenceSummary {
  totalEvents: number
  byType: Record<string, number>
  byActorType: Record<string, number>
  byCorrelationId: Record<string, number>
  bySessionId: Record<string, number>
}

export interface AuditEvidencePage {
  items: AuditEventRecord[]
  pageInfo: PageInfo
}

export interface IdempotencyRecord {
  key: string
  resourceId: string
  createdAt: Date
}

export interface OutboxEventRecord {
  id: string
  type: string
  payload: unknown
  status: 'pending' | 'processed' | 'failed'
  createdAt: Date
}

export interface DatabaseState {
  conversations: ConversationRecord[]
  messages: MessageRecord[]
  sessions: SessionRecord[]
  agentRuns: AgentRunRecord[]
  toolCalls: ToolCallRecord[]
  approvals: ApprovalRequestRecord[]
  tasks: TaskRecord[]
  auditEvents: AuditEventRecord[]
  idempotency: IdempotencyRecord[]
  outbox: OutboxEventRecord[]
}
