import type { ApiEnvelope } from '@cvg/shared'

export interface TimelineItem {
  id: string
  direction: 'inbound' | 'outbound'
  body: string
  createdAt: string
}

export interface ConversationView {
  id: string
  channel: string
  senderRef: string
  status: string
  correlationId: string
  openSessionId: string | null
  lastMessageBody: string | null
  lastMessageAt: string | null
  updatedAt: string
}

export interface ConversationPageView {
  items: ConversationView[]
  pageInfo: {
    limit: number
    offset: number
    total: number
    hasNextPage: boolean
  }
}

export type ApprovalDecision = 'approved' | 'rejected' | 'assumed'
export type OperatorRole = 'Operator' | 'Approver' | 'Supervisor' | 'Admin'

export interface OperatorIdentity {
  operatorId: string
  role: OperatorRole
  tenantId?: string
}

export interface PlatformAgentView {
  id: string
  slug: string
  name: string
  description: string
  activeVersionId: string | null
}

export interface PlatformVersionView {
  id: string
  agentId: string
  version: number
  status: string
  config: Record<string, unknown>
}

export interface PlatformTraceView {
  traceId: string
  agentId: string
  versionId: string
  configVersion: string
  executionMode: 'TEST_LAB' | 'CONTROLLED_RUNTIME'
  conversationId?: string
  sessionId?: string
  intent: { name: string; confidence: number }
  policy: Array<{ decision: string; reason: string }>
  knowledge: { status: string; source?: string; version?: string }
  tools: Array<{ name: string; status: string }>
  handoff: {
    requested: boolean
    reason: string | null
    state: 'BOT_ACTIVE' | 'HANDOFF_REQUESTED'
  }
  response: { text: string; mode: string }
  provider: { provider: string; model: string; externalCall: false }
  createdAt?: string
}

interface PlatformTracePageView {
  items: PlatformTraceView[]
  pageInfo: {
    limit: number
    offset: number
    total: number
    hasNextPage: boolean
  }
}

export interface ApprovalView {
  id: string
  sessionId: string
  proposedAction: string
  summary: string
  riskLevel: string
  status: string
}

export interface TaskView {
  id: string
  sessionId: string
  title: string
  priority: string
  status: string
}

export type TaskStatus = 'open' | 'in_progress' | 'done' | 'canceled'

export interface AuditEventView {
  id: string
  type: string
  actorId?: string
  actorType: string
  correlationId?: string
  createdAt: string
  payload?: Record<string, unknown>
}

export interface AuditEvidenceReviewView {
  summary: {
    totalEvents: number
    byType: Record<string, number>
    byActorType: Record<string, number>
    byCorrelationId: Record<string, number>
    bySessionId: Record<string, number>
  }
  page: {
    items: AuditEventView[]
    pageInfo: {
      limit: number
      offset: number
      total: number
      hasNextPage: boolean
    }
  }
  export: {
    format: 'json'
    controlled: boolean
    externalDispatch: boolean
    requestedBy: string
  }
  governance?: {
    retention: {
      policyId: string
      approvedForRealData: boolean
      humanSignoffRequired: boolean
    }
    payload: {
      mode: 'minimized'
      rawPayloadReturned: boolean
      redactedFields: string[]
    }
    export: {
      externalDispatch: boolean
      externalExportRequiresApproval: boolean
    }
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = init ? await fetch(path, init) : await fetch(path)
  const envelope = (await response.json()) as ApiEnvelope<T>
  if (!envelope.success || !envelope.data) {
    throw new Error(envelope.error?.message ?? 'Request failed')
  }
  return envelope.data
}

function operatorHeaders(identity: OperatorIdentity) {
  const headers: Record<string, string> = {
    'x-operator-id': identity.operatorId,
    'x-operator-role': identity.role
  }
  if (identity.tenantId) headers['x-tenant-id'] = identity.tenantId
  return headers
}

function operatorInit(identity: OperatorIdentity): RequestInit {
  return { headers: operatorHeaders(identity) }
}

export const apiClient = {
  async listConversations(
    identity: OperatorIdentity,
    input: { limit: number; offset: number } = { limit: 25, offset: 0 }
  ): Promise<ConversationPageView> {
    return request(
      `/v1/conversations?limit=${input.limit}&offset=${input.offset}`,
      operatorInit(identity)
    )
  },

  async getTimeline(
    conversationId: string,
    identity: OperatorIdentity
  ): Promise<{ messages: TimelineItem[] }> {
    return request(
      `/v1/conversations/${conversationId}/timeline`,
      operatorInit(identity)
    )
  },

  async listApprovals(identity: OperatorIdentity): Promise<ApprovalView[]> {
    return request('/v1/approvals', operatorInit(identity))
  },

  async decideApproval(input: {
    approvalRequestId: string
    decision: ApprovalDecision
    identity: OperatorIdentity
    note: string
  }): Promise<ApprovalView> {
    return request(`/v1/approvals/${input.approvalRequestId}/decision`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...operatorHeaders(input.identity)
      },
      body: JSON.stringify({ decision: input.decision, note: input.note })
    })
  },

  async listTasks(identity: OperatorIdentity): Promise<TaskView[]> {
    return request('/v1/tasks', operatorInit(identity))
  },

  async updateTaskStatus(input: {
    taskId: string
    status: TaskStatus
    identity: OperatorIdentity
  }): Promise<TaskView> {
    return request(`/v1/tasks/${input.taskId}/status`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        ...operatorHeaders(input.identity)
      },
      body: JSON.stringify({ status: input.status })
    })
  },

  async getAudit(
    sessionId: string,
    identity: OperatorIdentity
  ): Promise<{ events: AuditEventView[] }> {
    return request(`/v1/audit/sessions/${sessionId}`, operatorInit(identity))
  },

  async getAuditEvidence(input: {
    identity: OperatorIdentity
    sessionId: string
    limit?: number
    offset?: number
  }): Promise<AuditEvidenceReviewView> {
    const params = new URLSearchParams()
    params.set('sessionId', input.sessionId)
    params.set('limit', String(input.limit ?? 10))
    params.set('offset', String(input.offset ?? 0))
    return request(
      `/v1/observability/audit-evidence?${params.toString()}`,
      operatorInit(input.identity)
    )
  },

  async requestAuditEvidenceExportApproval(input: {
    identity: OperatorIdentity
    sessionId: string
  }): Promise<ApprovalView> {
    return request('/v1/approvals', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...operatorHeaders(input.identity)
      },
      body: JSON.stringify({
        sessionId: input.sessionId,
        proposedAction: 'audit_evidence_export_review',
        summary: `Solicitar revisao humana para export controlado de audit evidence da sessao ${input.sessionId} sem despacho externo.`,
        riskLevel: 'high'
      })
    })
  },

  async listPlatformAgents(
    identity: OperatorIdentity & { tenantId: string }
  ): Promise<PlatformAgentView[]> {
    return request('/v1/admin/agents', operatorInit(identity))
  },

  async createPlatformAgent(input: {
    identity: OperatorIdentity & { tenantId: string }
    slug: string
    name: string
    description: string
  }): Promise<PlatformAgentView> {
    return request('/v1/admin/agents', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...operatorHeaders(input.identity)
      },
      body: JSON.stringify({
        slug: input.slug,
        name: input.name,
        description: input.description
      })
    })
  },

  async createPlatformVersion(input: {
    identity: OperatorIdentity & { tenantId: string }
    agentId: string
    config: Record<string, unknown>
  }): Promise<PlatformVersionView> {
    return request(`/v1/admin/agents/${input.agentId}/versions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...operatorHeaders(input.identity)
      },
      body: JSON.stringify({ config: input.config })
    })
  },

  async clonePlatformVersion(input: {
    identity: OperatorIdentity & { tenantId: string }
    agentId: string
    versionId: string
    config?: Record<string, unknown>
  }): Promise<PlatformVersionView> {
    return request(
      `/v1/admin/agents/${input.agentId}/versions/${input.versionId}/clone`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...operatorHeaders(input.identity)
        },
        body: JSON.stringify(input.config ? { config: input.config } : {})
      }
    )
  },

  async listPlatformVersions(
    identity: OperatorIdentity & { tenantId: string },
    agentId: string
  ): Promise<PlatformVersionView[]> {
    return request(
      `/v1/admin/agents/${agentId}/versions`,
      operatorInit(identity)
    )
  },

  async transitionPlatformVersion(input: {
    identity: OperatorIdentity & { tenantId: string }
    agentId: string
    versionId: string
    target: 'TESTING' | 'APPROVED' | 'ARCHIVED' | 'DRAFT'
  }): Promise<PlatformVersionView> {
    return request(
      `/v1/admin/agents/${input.agentId}/versions/${input.versionId}/transition`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...operatorHeaders(input.identity)
        },
        body: JSON.stringify({ target: input.target })
      }
    )
  },

  async publishPlatformVersion(input: {
    identity: OperatorIdentity & { tenantId: string }
    agentId: string
    versionId: string
  }): Promise<PlatformVersionView> {
    return request(
      `/v1/admin/agents/${input.agentId}/versions/${input.versionId}/publish`,
      {
        method: 'POST',
        headers: operatorHeaders(input.identity)
      }
    )
  },

  async rollbackPlatformVersion(input: {
    identity: OperatorIdentity & { tenantId: string }
    agentId: string
    versionId: string
  }): Promise<PlatformVersionView> {
    return request(`/v1/admin/agents/${input.agentId}/rollback`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...operatorHeaders(input.identity)
      },
      body: JSON.stringify({ versionId: input.versionId })
    })
  },

  async runPlatformTestLab(input: {
    identity: OperatorIdentity & { tenantId: string }
    agentId: string
    versionId: string
    message: string
    approvedKnowledge?: {
      version: string
      answer: string
      source: string
    }
  }): Promise<PlatformTraceView> {
    return request('/v1/admin/test-lab/runs', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...operatorHeaders(input.identity)
      },
      body: JSON.stringify({
        agentId: input.agentId,
        versionId: input.versionId,
        message: input.message,
        history: [],
        approvedKnowledge: input.approvedKnowledge
      })
    })
  },

  async evaluatePlatformTestLab(input: {
    identity: OperatorIdentity & { tenantId: string }
    agentId: string
    versionId: string
    cases: Array<{
      id: string
      message: string
      history?: string[]
      expectedPolicyDecision?: string
      expectedResponseMode: 'answer' | 'clarify' | 'handoff' | 'blocked'
      expectedHandoff?: boolean
      approvedKnowledge?: {
        version: string
        answer: string
        source: string
      }
    }>
  }): Promise<{
    passed: boolean
    results: Array<{
      caseId: string
      passed: boolean
      failures: string[]
      trace: PlatformTraceView
    }>
  }> {
    return request('/v1/admin/test-lab/evaluate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...operatorHeaders(input.identity)
      },
      body: JSON.stringify({
        agentId: input.agentId,
        versionId: input.versionId,
        cases: input.cases
      })
    })
  },

  async listPlatformTestRuns(
    identity: OperatorIdentity & { tenantId: string },
    limit = 10
  ): Promise<PlatformTraceView[]> {
    const page = await request<PlatformTracePageView>(
      `/v1/admin/test-lab/runs?limit=${limit}`,
      operatorInit(identity)
    )
    return page.items
  },

  async listPlatformExecutionTraces(
    identity: OperatorIdentity & { tenantId: string },
    limit = 10
  ): Promise<PlatformTraceView[]> {
    const page = await request<PlatformTracePageView>(
      `/v1/admin/execution-traces?limit=${limit}`,
      operatorInit(identity)
    )
    return page.items
  }
}
