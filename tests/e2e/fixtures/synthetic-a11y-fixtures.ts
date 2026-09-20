/**
 * SYNTHETIC A11Y FIXTURES — NOT REAL BACKEND DATA.
 *
 * Every identifier, message, timestamp and diagnostic below is invented for
 * AUD19-10 accessibility tests. These fixtures are served to the web console
 * through Playwright `page.route` interception, so no real API, database or
 * provider is exercised. They must never be promoted to fixtures that imply a
 * real tenant, patient, owner or clinical/financial action. All names carry a
 * `synthetic`/`synth_` marker so console evidence cannot be confused with real
 * backend data.
 */
import type { Page, Route } from '@playwright/test'
import type {
  ApprovalView,
  AuditEventView,
  AuditEvidenceCheckpointView,
  AuditEvidenceReviewView,
  ConversationView,
  DeadLetterView,
  OrchestrationGoalDetailView,
  OrchestrationGoalView,
  PlatformAgentView,
  PlatformVersionView,
  TaskView,
  TimelineItem
} from '../../../apps/web/src/api/client.ts'

export const SYNTHETIC_TENANT_ID = 'tenant_00000000-0000-4000-8000-00000000a11e'

export const SYNTHETIC_TIMESTAMP = '2026-09-20T12:00:00.000Z'

export interface SyntheticA11yIdentity {
  operatorId: string
  role: 'Operator' | 'Approver' | 'Supervisor' | 'Admin'
  tenantId: string
}

export const SYNTHETIC_SUPERVISOR: SyntheticA11yIdentity = {
  operatorId: 'supervisor.synthetic.a11y',
  role: 'Supervisor',
  tenantId: SYNTHETIC_TENANT_ID
}

export const SYNTHETIC_APPROVER: SyntheticA11yIdentity = {
  operatorId: 'approver.synthetic.a11y',
  role: 'Approver',
  tenantId: SYNTHETIC_TENANT_ID
}

export const SYNTHETIC_OPERATOR: SyntheticA11yIdentity = {
  operatorId: 'operator.synthetic.a11y',
  role: 'Operator',
  tenantId: SYNTHETIC_TENANT_ID
}

export const SYNTHETIC_ADMIN: SyntheticA11yIdentity = {
  operatorId: 'admin.synthetic.a11y',
  role: 'Admin',
  tenantId: SYNTHETIC_TENANT_ID
}

export const SYNTHETIC_CONVERSATION: ConversationView = {
  id: 'synthetic_conversation_1',
  channel: 'synthetic_channel',
  senderRef: 'synthetic_sender_0001',
  status: 'active',
  correlationId: 'synthetic_correlation_conversation_1',
  openSessionId: 'synthetic_session_1',
  lastMessageBody: 'Mensagem sintética de acessibilidade.',
  lastMessageAt: SYNTHETIC_TIMESTAMP,
  updatedAt: SYNTHETIC_TIMESTAMP
}

export const SYNTHETIC_TIMELINE: TimelineItem[] = [
  {
    id: 'synthetic_message_1',
    direction: 'inbound',
    body: 'Mensagem sintética inbound para a11y.',
    createdAt: SYNTHETIC_TIMESTAMP
  },
  {
    id: 'synthetic_message_2',
    direction: 'outbound',
    body: 'Resposta sintética outbound para a11y.',
    createdAt: SYNTHETIC_TIMESTAMP
  }
]

export const SYNTHETIC_APPROVAL: ApprovalView = {
  id: 'synthetic_approval_1',
  sessionId: 'synthetic_session_1',
  proposedAction: 'synthetic_appointment_draft_review',
  summary: 'Revisão humana sintética; nenhuma ação real é autorizada.',
  riskLevel: 'medium',
  status: 'pending',
  correlationId: 'synthetic_correlation_approval_1',
  createdAt: SYNTHETIC_TIMESTAMP,
  updatedAt: SYNTHETIC_TIMESTAMP
}

export const SYNTHETIC_TASK: TaskView = {
  id: 'synthetic_task_1',
  sessionId: 'synthetic_session_1',
  title: 'Tarefa sintética de revisão',
  priority: 'normal',
  status: 'open',
  description: 'Descrição sintética sem qualquer efeito operacional real.',
  correlationId: 'synthetic_correlation_task_1',
  createdAt: SYNTHETIC_TIMESTAMP,
  updatedAt: SYNTHETIC_TIMESTAMP,
  dueAt: SYNTHETIC_TIMESTAMP
}

export const SYNTHETIC_DEAD_LETTER: DeadLetterView = {
  id: 'synthetic_dead_letter_1',
  type: 'synthetic.inbound.process',
  status: 'dead_letter',
  correlationId: 'synthetic_correlation_dead_letter_1',
  traceId: 'synthetic_trace_dead_letter_1',
  conversationId: 'synthetic_conversation_1',
  sessionId: 'synthetic_session_1',
  inboundMessageId: 'synthetic_message_1',
  attempts: 3,
  lastError: 'synthetic_terminal_error_for_a11y_fixture',
  createdAt: SYNTHETIC_TIMESTAMP,
  availableAt: null,
  deadLetteredAt: SYNTHETIC_TIMESTAMP
}

export const SYNTHETIC_AUDIT_EVENTS: AuditEventView[] = [
  {
    id: 'synthetic_audit_event_1',
    type: 'synthetic_event_recorded',
    actorId: 'supervisor.synthetic.a11y',
    actorType: 'operator',
    correlationId: 'synthetic_correlation_audit_1',
    createdAt: SYNTHETIC_TIMESTAMP
  }
]

export const SYNTHETIC_AUDIT_EVIDENCE: AuditEvidenceReviewView = {
  summary: {
    totalEvents: 1,
    byType: { synthetic_event_recorded: 1 },
    byActorType: { operator: 1 },
    byCorrelationId: { synthetic_correlation_audit_1: 1 },
    bySessionId: { synthetic_session_1: 1 }
  },
  page: {
    items: SYNTHETIC_AUDIT_EVENTS,
    pageInfo: { limit: 10, offset: 0, total: 1, hasNextPage: false }
  },
  export: {
    format: 'json',
    controlled: true,
    externalDispatch: false,
    requestedBy: 'supervisor.synthetic.a11y'
  },
  governance: {
    retention: {
      policyId: 'synthetic_retention_policy',
      approvedForRealData: false,
      humanSignoffRequired: true
    },
    payload: {
      mode: 'minimized',
      rawPayloadReturned: false,
      redactedFields: ['payload']
    },
    export: {
      externalDispatch: false,
      externalExportRequiresApproval: true
    }
  }
}

export const SYNTHETIC_CHECKPOINT: AuditEvidenceCheckpointView = {
  tenantId: SYNTHETIC_TENANT_ID,
  id: 'synthetic_checkpoint_1',
  filters: { sessionId: 'synthetic_session_1' },
  eventIds: ['synthetic_audit_event_1'],
  eventCount: 1,
  evidenceDigest: 'f'.repeat(64),
  status: 'SEALED',
  createdBy: 'supervisor.synthetic.a11y',
  updatedBy: 'supervisor.synthetic.a11y',
  createdAt: SYNTHETIC_TIMESTAMP,
  updatedAt: SYNTHETIC_TIMESTAMP
}

const syntheticBudget = {
  maxSteps: 12,
  maxReplans: 3,
  maxIterations: 256,
  maxModelCalls: 8,
  maxToolCalls: 10,
  maxDurationMs: 120000,
  maxCostUsd: 2,
  usage: {
    steps: 2,
    replans: 1,
    iterations: 4,
    modelCalls: 1,
    toolCalls: 2,
    costUsd: 0.04
  }
}

function makeSyntheticGoal(
  id: string,
  status: OrchestrationGoalView['status'],
  reason: string
): OrchestrationGoalView {
  return {
    id,
    tenantId: SYNTHETIC_TENANT_ID,
    status,
    objective: `Objetivo sintético ${id}`,
    correlationId: `synthetic_corr_${id}`,
    inboundMessageId: `synthetic_msg_${id}`,
    conversationId: 'synthetic_conversation_1',
    sessionId: 'synthetic_session_1',
    activePlanId: 'synthetic_plan_1',
    version: 7,
    lastReason: reason,
    lastError: status === 'FAILED' ? 'synthetic_failure_diagnostic' : null,
    deadline: null,
    createdAt: SYNTHETIC_TIMESTAMP,
    updatedAt: SYNTHETIC_TIMESTAMP,
    budget: syntheticBudget
  }
}

export const SYNTHETIC_GOALS: OrchestrationGoalView[] = [
  makeSyntheticGoal('synthetic_goal_executing', 'EXECUTING', 'step_claimed'),
  makeSyntheticGoal(
    'synthetic_goal_approval',
    'WAITING_APPROVAL',
    'approval_pending'
  ),
  makeSyntheticGoal(
    'synthetic_goal_handoff',
    'HUMAN_HANDOFF',
    'human_handoff_required'
  ),
  makeSyntheticGoal(
    'synthetic_goal_uncertain',
    'UNCERTAIN',
    'effect_reconciliation_required'
  ),
  makeSyntheticGoal('synthetic_goal_failed', 'FAILED', 'execution_failed')
]

function makeSyntheticGoalDetail(
  goal: OrchestrationGoalView,
  options: { uncertain?: boolean } = {}
): OrchestrationGoalDetailView {
  const uncertain = options.uncertain === true
  const stepStatus = uncertain ? 'UNCERTAIN' : 'EXECUTING'
  const stepError = uncertain
    ? 'synthetic_effect_reconciliation_required'
    : null
  return {
    ...goal,
    successCriteria: [{ id: 'synthetic_criterion_1' }],
    executionSnapshot: {
      agentVersion: 'synthetic-agent-v1',
      promptVersion: 'synthetic-prompt-v1',
      policyVersion: 'synthetic-policy-v1',
      modelProfile: 'deterministic-synthetic',
      toolVersions: { 'synthetic-tool': '1.0.0' }
    },
    replanCount: uncertain ? 2 : 1,
    operatorState: {
      state: uncertain ? 'UNCERTAIN' : goal.status,
      reason: goal.lastReason,
      error: null,
      deadline: null,
      deadlineExpired: false,
      activePlanVersion: 1,
      currentStepId: 'synthetic_step_1',
      currentStepStatus: stepStatus,
      leaseOwner: uncertain ? null : 'worker.synthetic.a11y',
      leaseUntil: uncertain ? null : SYNTHETIC_TIMESTAMP,
      approvalId: null,
      handoffRequired: uncertain,
      evidenceCount: 1,
      verifiedEvidenceCount: uncertain ? 0 : 1,
      lastObservationAt: SYNTHETIC_TIMESTAMP,
      lastEvaluation: {
        result: uncertain ? 'unknown' : 'not_satisfied',
        reason: 'synthetic deterministic evaluation',
        createdAt: SYNTHETIC_TIMESTAMP
      }
    },
    plans: [
      {
        id: 'synthetic_plan_1',
        goalId: goal.id,
        tenantId: SYNTHETIC_TENANT_ID,
        version: 1,
        parentPlanId: null,
        triggeringEvaluationId: null,
        status: 'ACTIVE',
        reason: 'synthetic controlled plan',
        fingerprint: 'a'.repeat(64),
        createdAt: SYNTHETIC_TIMESTAMP,
        updatedAt: SYNTHETIC_TIMESTAMP,
        steps: [
          {
            id: 'synthetic_step_1',
            goalId: goal.id,
            planId: 'synthetic_plan_1',
            type: 'synthetic_controlled_step',
            description: 'Verificar estado operacional sintético',
            dependencies: [],
            requiredCapabilities: ['synthetic.read'],
            riskLevel: 'LOW_RISK_READ',
            approvalRequirement: 'none',
            status: stepStatus,
            attemptCount: 1,
            approvalId: null,
            toolId: 'synthetic-tool',
            toolVersion: '1.0.0',
            resultHash: null,
            lastError: stepError,
            startedAt: SYNTHETIC_TIMESTAMP,
            completedAt: null,
            version: 2,
            createdAt: SYNTHETIC_TIMESTAMP,
            updatedAt: SYNTHETIC_TIMESTAMP,
            attempts: [
              {
                id: 'synthetic_attempt_1',
                workerId: 'worker.synthetic.a11y',
                correlationId: `synthetic_corr_${goal.id}`,
                startedAt: SYNTHETIC_TIMESTAMP,
                finishedAt: uncertain ? SYNTHETIC_TIMESTAMP : null,
                outcome: uncertain ? 'UNCERTAIN' : null,
                errorClass: uncertain ? 'effect_outcome_unknown' : null
              }
            ]
          }
        ]
      }
    ],
    observations: [
      {
        id: 'synthetic_observation_1',
        planId: 'synthetic_plan_1',
        stepId: 'synthetic_step_1',
        kind: 'step_result',
        resultDigest: 'synthetic_digest_1',
        evidence: [
          {
            source: 'operational_state',
            reference: 'synthetic:state:1',
            verified: !uncertain,
            key: 'state.verified',
            digest: 'e'.repeat(64)
          }
        ],
        createdAt: SYNTHETIC_TIMESTAMP
      }
    ],
    evaluations: [
      {
        id: 'synthetic_evaluation_1',
        planId: 'synthetic_plan_1',
        stepId: null,
        evaluatorType: 'deterministic',
        result: uncertain ? 'unknown' : 'not_satisfied',
        reason: 'synthetic deterministic evaluation',
        evidence: [],
        createdAt: SYNTHETIC_TIMESTAMP
      }
    ]
  }
}

export const SYNTHETIC_GOAL_DETAIL: OrchestrationGoalDetailView =
  makeSyntheticGoalDetail(SYNTHETIC_GOALS[0] as OrchestrationGoalView)

export const SYNTHETIC_UNCERTAIN_GOAL: OrchestrationGoalView =
  SYNTHETIC_GOALS[3] as OrchestrationGoalView

export const SYNTHETIC_UNCERTAIN_DETAIL: OrchestrationGoalDetailView =
  makeSyntheticGoalDetail(SYNTHETIC_UNCERTAIN_GOAL, { uncertain: true })

export const SYNTHETIC_PLATFORM_AGENT: PlatformAgentView = {
  id: 'synthetic_agent_1',
  slug: 'synthetic-agent-a11y',
  name: 'Agente sintético a11y',
  description: 'Agente sintético exclusivo para varredura de acessibilidade.',
  activeVersionId: 'synthetic_version_1'
}

export const SYNTHETIC_PLATFORM_VERSION: PlatformVersionView = {
  id: 'synthetic_version_1',
  agentId: 'synthetic_agent_1',
  version: 1,
  status: 'DRAFT',
  config: {
    greeting: 'Saudação sintética.',
    knowledgeSource: 'synthetic://a11y',
    handoff: {
      clarifyThreshold: 0.7,
      handoffThreshold: 0,
      maxClarifications: 3,
      destinations: ['synthetic-reception'],
      priority: 'low'
    }
  }
}

export interface SyntheticA11yRouteOptions {
  /** Fail every intercepted request with this HTTP status. */
  failAll?: number
  /** Delay every intercepted response by this many milliseconds. */
  delayMs?: number
  /** Serve empty collection fixtures for loading/empty-state coverage. */
  empty?: boolean
}

function envelope(data: unknown): string {
  return JSON.stringify({ success: true, data, error: null })
}

function failureEnvelope(code: string, message: string): string {
  return JSON.stringify({
    success: false,
    data: null,
    error: { code, message }
  })
}

async function fulfillJson(route: Route, body: string, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body })
}

export async function installSyntheticA11yRoutes(
  page: Page,
  options: SyntheticA11yRouteOptions = {}
): Promise<void> {
  const empty = options.empty === true
  await page.route('**/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const pathname = url.pathname
    const method = route.request().method()

    if (options.delayMs) {
      await new Promise((resolve) => setTimeout(resolve, options.delayMs))
    }
    if (options.failAll) {
      await fulfillJson(
        route,
        failureEnvelope(
          'synthetic_failure',
          'Falha sintética controlada para a11y; nenhum backend real respondeu.'
        ),
        options.failAll
      )
      return
    }

    if (pathname === '/v1/conversations' && method === 'GET') {
      await fulfillJson(
        route,
        envelope({
          items: empty ? [] : [SYNTHETIC_CONVERSATION],
          pageInfo: {
            limit: 25,
            offset: 0,
            total: empty ? 0 : 1,
            hasNextPage: false
          }
        })
      )
      return
    }

    if (/^\/v1\/conversations\/[^/]+\/timeline$/.test(pathname)) {
      await fulfillJson(
        route,
        envelope({ messages: empty ? [] : SYNTHETIC_TIMELINE })
      )
      return
    }

    if (pathname === '/v1/approvals' && method === 'GET') {
      await fulfillJson(route, envelope(empty ? [] : [SYNTHETIC_APPROVAL]))
      return
    }

    if (pathname === '/v1/tasks' && method === 'GET') {
      await fulfillJson(route, envelope(empty ? [] : [SYNTHETIC_TASK]))
      return
    }

    if (pathname === '/v1/outbox/dead-letters' && method === 'GET') {
      await fulfillJson(route, envelope(empty ? [] : [SYNTHETIC_DEAD_LETTER]))
      return
    }

    if (pathname === '/v1/orchestration/goals' && method === 'GET') {
      await fulfillJson(
        route,
        envelope({
          items: empty ? [] : SYNTHETIC_GOALS,
          pageInfo: { limit: 25, hasNextPage: false }
        })
      )
      return
    }

    if (pathname.startsWith('/v1/orchestration/goals/') && method === 'GET') {
      const goalId = decodeURIComponent(pathname.split('/').at(-1) ?? '')
      const uncertain = goalId.includes('uncertain')
      await fulfillJson(
        route,
        envelope(uncertain ? SYNTHETIC_UNCERTAIN_DETAIL : SYNTHETIC_GOAL_DETAIL)
      )
      return
    }

    if (pathname.startsWith('/v1/audit/sessions/') && method === 'GET') {
      await fulfillJson(
        route,
        envelope({ events: empty ? [] : SYNTHETIC_AUDIT_EVENTS })
      )
      return
    }

    if (pathname === '/v1/observability/audit-evidence' && method === 'GET') {
      await fulfillJson(
        route,
        envelope(
          empty
            ? {
                ...SYNTHETIC_AUDIT_EVIDENCE,
                summary: {
                  totalEvents: 0,
                  byType: {},
                  byActorType: {},
                  byCorrelationId: {},
                  bySessionId: {}
                },
                page: {
                  items: [],
                  pageInfo: {
                    limit: 10,
                    offset: 0,
                    total: 0,
                    hasNextPage: false
                  }
                }
              }
            : SYNTHETIC_AUDIT_EVIDENCE
        )
      )
      return
    }

    if (
      pathname === '/v1/observability/audit-evidence/checkpoints' &&
      method === 'GET'
    ) {
      await fulfillJson(
        route,
        envelope({ checkpoints: empty ? [] : [SYNTHETIC_CHECKPOINT] })
      )
      return
    }

    if (pathname === '/v1/admin/agents' && method === 'GET') {
      await fulfillJson(
        route,
        envelope(empty ? [] : [SYNTHETIC_PLATFORM_AGENT])
      )
      return
    }

    if (
      /^\/v1\/admin\/agents\/[^/]+\/versions$/.test(pathname) &&
      method === 'GET'
    ) {
      await fulfillJson(
        route,
        envelope(empty ? [] : [SYNTHETIC_PLATFORM_VERSION])
      )
      return
    }

    if (pathname === '/v1/journeys/owner-drafts' && method === 'GET') {
      await fulfillJson(route, envelope([]))
      return
    }

    if (pathname === '/v1/journeys/patient-drafts' && method === 'GET') {
      await fulfillJson(route, envelope({ drafts: [] }))
      return
    }

    if (pathname === '/v1/journeys/slots' && method === 'GET') {
      await fulfillJson(route, envelope({ slots: [] }))
      return
    }

    if (pathname === '/v1/journeys/appointment-drafts' && method === 'GET') {
      await fulfillJson(route, envelope({ drafts: [] }))
      return
    }

    if (/\/v1\/journeys\/(owners|patients)\/search$/.test(pathname)) {
      await fulfillJson(route, envelope({ matches: [] }))
      return
    }

    if (method === 'GET') {
      await fulfillJson(route, envelope([]))
      return
    }

    await fulfillJson(route, envelope({ accepted: true }))
  })
}
