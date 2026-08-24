import { useEffect, useState } from 'react'
import { AuditPanel } from './features/audit/index.tsx'
import { ApprovalsPanel } from './features/approvals/index.tsx'
import { ConversationsPanel } from './features/conversations/index.tsx'
import { TasksPanel } from './features/tasks/index.tsx'
import { PlatformPanel } from './features/platform/index.tsx'
import {
  apiClient,
  type ApprovalDecision,
  type ApprovalView,
  type AuditEvidenceReviewView,
  type AuditEventView,
  type ConversationView,
  type OperatorIdentity,
  type OperatorRole,
  type TaskStatus,
  type TaskView,
  type TimelineItem
} from './api/client.ts'

interface PanelState<T> {
  data: T
  error: string | null
  isLoading: boolean
}

const loading = <T,>(data: T): PanelState<T> => ({
  data,
  error: null,
  isLoading: true
})
const loaded = <T,>(data: T): PanelState<T> => ({
  data,
  error: null,
  isLoading: false
})
const failed = <T,>(data: T): PanelState<T> => ({
  data,
  error: 'Erro ao carregar dados operacionais.',
  isLoading: false
})

function canReviewAuditEvidence(role: OperatorRole): boolean {
  return role === 'Supervisor' || role === 'Admin'
}

const auditEvidenceLimit = 10

export function App() {
  const [conversations, setConversations] = useState<
    PanelState<ConversationView[]>
  >(loading([]))
  const [messages, setMessages] = useState<PanelState<TimelineItem[]>>(
    loading([])
  )
  const [approvals, setApprovals] = useState<PanelState<ApprovalView[]>>(
    loading([])
  )
  const [tasks, setTasks] = useState<PanelState<TaskView[]>>(loading([]))
  const [auditEvents, setAuditEvents] = useState<PanelState<AuditEventView[]>>(
    loading([])
  )
  const [auditEvidence, setAuditEvidence] = useState<
    PanelState<AuditEvidenceReviewView | null>
  >(loaded(null))
  const [auditEvidenceOffset, setAuditEvidenceOffset] = useState(0)
  const [auditEvidenceExportMessage, setAuditEvidenceExportMessage] = useState<
    string | null
  >(null)
  const [isRequestingAuditEvidenceExport, setIsRequestingAuditEvidenceExport] =
    useState(false)
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  )
  const [approvalActionId, setApprovalActionId] = useState<string | null>(null)
  const [taskActionId, setTaskActionId] = useState<string | null>(null)
  const [operatorIdentity, setOperatorIdentity] = useState<OperatorIdentity>({
    operatorId: '',
    role: 'Operator'
  })
  const [tenantId, setTenantId] = useState('')

  const currentOperatorIdentity = (): OperatorIdentity | null => {
    const operatorId = operatorIdentity.operatorId.trim()
    return operatorId.length > 0
      ? {
          operatorId,
          role: operatorIdentity.role,
          ...(tenantId.trim() ? { tenantId: tenantId.trim() } : {})
        }
      : null
  }

  useEffect(() => {
    const identity = currentOperatorIdentity()
    if (!identity) {
      setConversations(loaded([]))
      setMessages(loaded([]))
      setApprovals(loaded([]))
      setTasks(loaded([]))
      setAuditEvents(loaded([]))
      setAuditEvidence(loaded(null))
      setAuditEvidenceOffset(0)
      setAuditEvidenceExportMessage(null)
      setSelectedConversationId(null)
      setSelectedSessionId(null)
      return
    }

    let active = true
    setConversations(loading([]))
    setMessages(loading([]))
    setApprovals(loading([]))
    setTasks(loading([]))
    setAuditEvents(loading([]))
    setAuditEvidence(loaded(null))
    setAuditEvidenceOffset(0)
    setAuditEvidenceExportMessage(null)

    apiClient
      .listConversations(identity, { limit: 25, offset: 0 })
      .then((page) => {
        if (!active) return
        const firstConversation = page.items[0] ?? null
        setConversations(loaded(page.items))
        setSelectedConversationId(firstConversation?.id ?? null)
        setSelectedSessionId(firstConversation?.openSessionId ?? null)
        if (!firstConversation) {
          setMessages(loaded([]))
          setAuditEvents(loaded([]))
          setAuditEvidence(loaded(null))
        }
      })
      .catch(() => {
        if (!active) return
        setConversations(failed([]))
        setMessages(failed([]))
        setAuditEvents(failed([]))
      })

    apiClient
      .listApprovals(identity)
      .then((data) => {
        if (active) setApprovals(loaded(data))
      })
      .catch(() => {
        if (active) setApprovals(failed([]))
      })

    apiClient
      .listTasks(identity)
      .then((data) => {
        if (active) setTasks(loaded(data))
      })
      .catch(() => {
        if (active) setTasks(failed([]))
      })

    return () => {
      active = false
    }
  }, [operatorIdentity])

  useEffect(() => {
    const identity = currentOperatorIdentity()
    if (!identity) return
    if (!selectedConversationId) return
    let active = true
    setMessages(loading([]))

    apiClient
      .getTimeline(selectedConversationId, identity)
      .then((timeline) => {
        if (active) setMessages(loaded(timeline.messages))
      })
      .catch(() => {
        if (active) setMessages(failed([]))
      })

    return () => {
      active = false
    }
  }, [selectedConversationId, operatorIdentity])

  useEffect(() => {
    const identity = currentOperatorIdentity()
    if (!identity) return
    if (!selectedConversationId) return
    if (!selectedSessionId) {
      setAuditEvents(loaded([]))
      return
    }

    let active = true
    setAuditEvents(loading([]))

    apiClient
      .getAudit(selectedSessionId, identity)
      .then((audit) => {
        if (active) setAuditEvents(loaded(audit.events))
      })
      .catch(() => {
        if (active) setAuditEvents(failed([]))
      })

    return () => {
      active = false
    }
  }, [selectedConversationId, selectedSessionId, operatorIdentity])

  useEffect(() => {
    const identity = currentOperatorIdentity()
    if (!identity) return
    if (!selectedSessionId) {
      setAuditEvidence(loaded(null))
      setAuditEvidenceOffset(0)
      setAuditEvidenceExportMessage(null)
      return
    }
    if (!canReviewAuditEvidence(identity.role)) {
      setAuditEvidence(loaded(null))
      setAuditEvidenceOffset(0)
      setAuditEvidenceExportMessage(null)
      return
    }

    let active = true
    setAuditEvidence(loading(null))

    apiClient
      .getAuditEvidence({
        identity,
        sessionId: selectedSessionId,
        limit: auditEvidenceLimit,
        offset: auditEvidenceOffset
      })
      .then((evidence) => {
        if (active) setAuditEvidence(loaded(evidence))
      })
      .catch(() => {
        if (active) setAuditEvidence(failed(null))
      })

    return () => {
      active = false
    }
  }, [selectedSessionId, operatorIdentity, auditEvidenceOffset])

  const selectConversation = (
    conversation: Pick<ConversationView, 'id' | 'openSessionId'>
  ) => {
    setSelectedConversationId(conversation.id)
    setSelectedSessionId(conversation.openSessionId)
    setAuditEvidenceOffset(0)
    setAuditEvidenceExportMessage(null)
  }

  const refreshApprovals = async () => {
    const identity = currentOperatorIdentity()
    if (!identity) return
    setApprovals(loaded(await apiClient.listApprovals(identity)))
  }

  const refreshAudit = async () => {
    const identity = currentOperatorIdentity()
    if (!identity) return
    if (!selectedSessionId) return
    setAuditEvents(
      loaded((await apiClient.getAudit(selectedSessionId, identity)).events)
    )
  }

  const refreshAuditEvidence = async () => {
    const identity = currentOperatorIdentity()
    if (!identity) return
    if (!selectedSessionId) return
    if (!canReviewAuditEvidence(identity.role)) return
    setAuditEvidence(
      loaded(
        await apiClient.getAuditEvidence({
          identity,
          sessionId: selectedSessionId,
          limit: auditEvidenceLimit,
          offset: auditEvidenceOffset
        })
      )
    )
  }

  const goToPreviousAuditEvidencePage = () => {
    const pageInfo = auditEvidence.data?.page.pageInfo
    if (!pageInfo || pageInfo.offset === 0) return
    setAuditEvidenceExportMessage(null)
    setAuditEvidenceOffset(Math.max(0, pageInfo.offset - pageInfo.limit))
  }

  const goToNextAuditEvidencePage = () => {
    const pageInfo = auditEvidence.data?.page.pageInfo
    if (!pageInfo?.hasNextPage) return
    setAuditEvidenceExportMessage(null)
    setAuditEvidenceOffset(pageInfo.offset + pageInfo.limit)
  }

  const requestAuditEvidenceExportApproval = async () => {
    const identity = currentOperatorIdentity()
    if (!identity) return
    if (!selectedSessionId) return
    if (!canReviewAuditEvidence(identity.role)) return

    setIsRequestingAuditEvidenceExport(true)
    setAuditEvidenceExportMessage(null)
    try {
      await apiClient.requestAuditEvidenceExportApproval({
        identity,
        sessionId: selectedSessionId
      })
      await refreshApprovals()
      setAuditEvidenceExportMessage(
        'Solicitacao de export registrada para aprovacao humana.'
      )
    } catch {
      setAuditEvidenceExportMessage(
        'Erro ao solicitar aprovacao de export controlado.'
      )
    } finally {
      setIsRequestingAuditEvidenceExport(false)
    }
  }

  const refreshTasks = async () => {
    const identity = currentOperatorIdentity()
    if (!identity) return
    setTasks(loaded(await apiClient.listTasks(identity)))
  }

  const decideApproval = async (
    approvalRequestId: string,
    decision: ApprovalDecision,
    note: string
  ) => {
    const identity = currentOperatorIdentity()
    if (!identity) {
      setApprovals(failed(approvals.data))
      return
    }
    setApprovalActionId(approvalRequestId)
    try {
      await apiClient.decideApproval({
        approvalRequestId,
        decision,
        identity,
        note
      })
      await refreshApprovals()
      await refreshAudit()
      await refreshAuditEvidence()
    } catch {
      setApprovals(failed(approvals.data))
    } finally {
      setApprovalActionId(null)
    }
  }

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    const identity = currentOperatorIdentity()
    if (!identity) {
      setTasks(failed(tasks.data))
      return
    }
    setTaskActionId(taskId)
    try {
      await apiClient.updateTaskStatus({ taskId, status, identity })
      await refreshTasks()
      await refreshAudit()
    } catch {
      setTasks(failed(tasks.data))
    } finally {
      setTaskActionId(null)
    }
  }

  const identityReady = operatorIdentity.operatorId.trim().length > 0
  const canDecideApproval =
    identityReady &&
    (operatorIdentity.role === 'Approver' ||
      operatorIdentity.role === 'Supervisor')
  const canAssumeHandoff =
    identityReady && operatorIdentity.role === 'Supervisor'
  const canUpdateTasks = identityReady && operatorIdentity.role === 'Operator'
  const canReviewEvidence =
    identityReady && canReviewAuditEvidence(operatorIdentity.role)

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <h1>CVG Agent Secretary</h1>
          <p>
            Operacao assistida com aprovacoes, auditoria e acoes sensiveis
            bloqueadas.
          </p>
        </div>
        <form className="identityControls" aria-label="Identidade operacional">
          <label>
            ID do operador
            <input
              aria-label="ID do operador"
              value={operatorIdentity.operatorId}
              onChange={(event) =>
                setOperatorIdentity({
                  ...operatorIdentity,
                  operatorId: event.target.value
                })
              }
              placeholder="operator.shift-a"
            />
          </label>
          <label>
            Papel operacional
            <select
              aria-label="Papel operacional"
              value={operatorIdentity.role}
              onChange={(event) =>
                setOperatorIdentity({
                  ...operatorIdentity,
                  role: event.target.value as OperatorRole
                })
              }
            >
              <option value="Operator">Operator</option>
              <option value="Approver">Approver</option>
              <option value="Supervisor">Supervisor</option>
              <option value="Admin">Admin</option>
            </select>
          </label>
          <label>
            Tenant ID
            <input
              aria-label="Tenant ID"
              value={tenantId}
              onChange={(event) => setTenantId(event.target.value)}
              placeholder="tenant_<uuid>"
            />
          </label>
          <span className="status">{operatorIdentity.role}</span>
        </form>
      </header>
      <section className="grid" aria-label="Console operacional">
        <ConversationsPanel
          conversations={conversations.data}
          selectedConversationId={selectedConversationId}
          messages={messages.data}
          error={conversations.error ?? messages.error}
          isLoading={conversations.isLoading}
          isTimelineLoading={!conversations.isLoading && messages.isLoading}
          onSelectConversation={selectConversation}
        />
        <ApprovalsPanel
          approvals={approvals.data}
          actionId={approvalActionId}
          error={approvals.error}
          isLoading={approvals.isLoading}
          canApproveReject={canDecideApproval}
          canAssumeHandoff={canAssumeHandoff}
          onApprove={(approvalId) =>
            void decideApproval(
              approvalId,
              'approved',
              'controlled_console_action'
            )
          }
          onReject={(approvalId) =>
            void decideApproval(
              approvalId,
              'rejected',
              'controlled_console_action'
            )
          }
          onAssumeHandoff={(approvalId) =>
            void decideApproval(
              approvalId,
              'assumed',
              'controlled_handoff_only'
            )
          }
        />
        <TasksPanel
          tasks={tasks.data}
          actionId={taskActionId}
          error={tasks.error}
          isLoading={tasks.isLoading}
          canUpdateTasks={canUpdateTasks}
          onStart={(taskId) => void updateTaskStatus(taskId, 'in_progress')}
          onComplete={(taskId) => void updateTaskStatus(taskId, 'done')}
          onCancel={(taskId) => void updateTaskStatus(taskId, 'canceled')}
        />
        <AuditPanel
          events={auditEvents.data}
          error={auditEvents.error}
          isLoading={auditEvents.isLoading}
          evidence={auditEvidence.data}
          evidenceError={auditEvidence.error}
          evidenceIsLoading={auditEvidence.isLoading}
          canReviewEvidence={canReviewEvidence}
          evidenceExportMessage={auditEvidenceExportMessage}
          isRequestingEvidenceExport={isRequestingAuditEvidenceExport}
          onNextEvidencePage={goToNextAuditEvidencePage}
          onPreviousEvidencePage={goToPreviousAuditEvidencePage}
          onRequestEvidenceExport={() =>
            void requestAuditEvidenceExportApproval()
          }
        />
      </section>
      {operatorIdentity.role === 'Admin' &&
      /^tenant_[0-9a-f-]{36}$/.test(tenantId.trim()) ? (
        <PlatformPanel
          identity={{
            operatorId: operatorIdentity.operatorId,
            role: operatorIdentity.role,
            tenantId: tenantId.trim()
          }}
        />
      ) : null}
    </main>
  )
}
