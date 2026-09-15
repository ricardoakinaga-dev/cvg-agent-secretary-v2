import { useEffect, useRef, useState } from 'react'
import { AuditPanel } from './features/audit/index.tsx'
import { ApprovalsPanel } from './features/approvals/index.tsx'
import { ConversationsPanel } from './features/conversations/index.tsx'
import { DeadLettersPanel } from './features/dead-letters/index.tsx'
import { TasksPanel } from './features/tasks/index.tsx'
import { JourneysPanel } from './features/journeys/index.tsx'
import { PlatformPanel } from './features/platform/index.tsx'
import { OrchestrationPanel } from './features/orchestration/index.tsx'
import {
  apiClient,
  isApiConflict,
  type ApprovalDecision,
  type ApprovalView,
  type AuditEvidenceCheckpointView,
  type AuditEvidenceReviewView,
  type AuditEventView,
  type ConversationView,
  type DeadLetterView,
  type OperatorIdentity,
  type OperatorRole,
  type OrchestrationGoalDetailView,
  type OrchestrationGoalView,
  type TaskStatus,
  type TaskView,
  type TenantScopedOperatorIdentity,
  type TimelineItem
} from './api/client.ts'

declare global {
  interface Window {
    /** Host-provided session context; the console never lets the user edit it. */
    __CVG_OPERATOR_CONTEXT__?: OperatorIdentity | null
  }
}

interface PanelState<T> {
  data: T
  error: string | null
  isLoading: boolean
}

interface PanelNotice {
  text: string
  tone: 'success' | 'info' | 'error'
}

export interface AppProps {
  /** Identity resolved by the host session; never collected from the UI. */
  identity?: OperatorIdentity | null
  onSessionEnd?: () => void
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

function canReviewDeadLetters(role: OperatorRole): boolean {
  return role === 'Supervisor' || role === 'Admin'
}

function canReviewOrchestration(role: OperatorRole): boolean {
  return role === 'Supervisor' || role === 'Admin'
}

const auditEvidenceLimit = 10

export function App({
  identity: sessionIdentity = null,
  onSessionEnd
}: AppProps = {}) {
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
  const [deadLetters, setDeadLetters] = useState<PanelState<DeadLetterView[]>>(
    loading([])
  )
  const [orchestrationGoals, setOrchestrationGoals] = useState<
    PanelState<OrchestrationGoalView[]>
  >(loading([]))
  const [orchestrationDetail, setOrchestrationDetail] =
    useState<OrchestrationGoalDetailView | null>(null)
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)
  const [orchestrationDetailLoading, setOrchestrationDetailLoading] =
    useState(false)
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
  const [auditEvidenceCheckpoint, setAuditEvidenceCheckpoint] = useState<
    PanelState<AuditEvidenceCheckpointView | null>
  >(loaded(null))
  const [auditEvidenceCheckpointMessage, setAuditEvidenceCheckpointMessage] =
    useState<string | null>(null)
  const [
    isManagingAuditEvidenceCheckpoint,
    setIsManagingAuditEvidenceCheckpoint
  ] = useState(false)
  const [isRequestingAuditEvidenceExport, setIsRequestingAuditEvidenceExport] =
    useState(false)
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  )
  const [approvalMessage, setApprovalMessage] = useState<PanelNotice | null>(
    null
  )
  const [approvalActionId, setApprovalActionId] = useState<string | null>(null)
  const [taskActionId, setTaskActionId] = useState<string | null>(null)
  const [taskMessage, setTaskMessage] = useState<PanelNotice | null>(null)
  const [deadLetterActionId, setDeadLetterActionId] = useState<string | null>(
    null
  )
  const [deadLetterMessage, setDeadLetterMessage] =
    useState<PanelNotice | null>(null)
  const [sessionClosed, setSessionClosed] = useState(false)
  const [reloadNonce, setReloadNonce] = useState(0)
  const [identityDetailsOpen, setIdentityDetailsOpen] = useState(() =>
    typeof window === 'undefined' || typeof window.matchMedia !== 'function'
      ? true
      : window.matchMedia('(min-width: 761px)').matches
  )

  const sourceIdentityKey = JSON.stringify([
    sessionIdentity?.operatorId ?? null,
    sessionIdentity?.role ?? null,
    sessionIdentity?.tenantId ?? null
  ])
  useEffect(() => {
    setSessionClosed(false)
  }, [sourceIdentityKey])

  const operatorIdentity = sessionClosed ? null : sessionIdentity
  const normalizedOperatorId = operatorIdentity?.operatorId.trim() ?? ''
  const normalizedTenantId = operatorIdentity?.tenantId?.trim() ?? ''
  const identityKey = JSON.stringify([
    normalizedOperatorId,
    operatorIdentity?.role ?? null,
    normalizedTenantId
  ])
  const identityScopeRef = useRef(identityKey)
  const identityChanged = identityScopeRef.current !== identityKey
  if (identityChanged) identityScopeRef.current = identityKey

  const viewScopeKey = JSON.stringify([
    identityKey,
    selectedConversationId,
    selectedSessionId
  ])
  const viewScopeRef = useRef({ key: viewScopeKey, generation: 0 })
  const viewScopeChanged = viewScopeRef.current.key !== viewScopeKey
  if (viewScopeChanged) {
    viewScopeRef.current = {
      key: viewScopeKey,
      generation: viewScopeRef.current.generation + 1
    }
  }
  const viewScopeToken = `${viewScopeRef.current.generation}:${viewScopeKey}`

  const isCurrentIdentity = (scope: string): boolean =>
    identityScopeRef.current === scope
  const isCurrentViewScope = (scope: string): boolean =>
    `${viewScopeRef.current.generation}:${viewScopeRef.current.key}` === scope

  const currentOperatorIdentity = (): OperatorIdentity | null => {
    return normalizedOperatorId.length > 0
      ? {
          operatorId: normalizedOperatorId,
          role: operatorIdentity?.role ?? 'Operator',
          ...(normalizedTenantId ? { tenantId: normalizedTenantId } : {})
        }
      : null
  }

  const currentTenantIdentity = (): TenantScopedOperatorIdentity | null => {
    const identity = currentOperatorIdentity()
    const tenantId = identity?.tenantId?.trim()
    return identity && tenantId ? { ...identity, tenantId } : null
  }

  useEffect(() => {
    const identity = currentOperatorIdentity()
    if (!identity) {
      setConversations(loaded([]))
      setMessages(loaded([]))
      setApprovals(loaded([]))
      setTasks(loaded([]))
      setDeadLetters(loaded([]))
      setOrchestrationGoals(loaded([]))
      setOrchestrationDetail(null)
      setSelectedGoalId(null)
      setOrchestrationDetailLoading(false)
      setAuditEvents(loaded([]))
      setAuditEvidence(loaded(null))
      setAuditEvidenceOffset(0)
      setAuditEvidenceExportMessage(null)
      setAuditEvidenceCheckpoint(loaded(null))
      setAuditEvidenceCheckpointMessage(null)
      setSelectedConversationId(null)
      setSelectedSessionId(null)
      setApprovalActionId(null)
      setApprovalMessage(null)
      setTaskActionId(null)
      setTaskMessage(null)
      setDeadLetterActionId(null)
      setDeadLetterMessage(null)
      setIsManagingAuditEvidenceCheckpoint(false)
      setIsRequestingAuditEvidenceExport(false)
      return
    }

    let active = true
    setConversations(loading([]))
    setMessages(loading([]))
    setApprovals(loading([]))
    setTasks(loading([]))
    setDeadLetters(loading([]))
    setOrchestrationGoals(loading([]))
    setOrchestrationDetail(null)
    setSelectedGoalId(null)
    setOrchestrationDetailLoading(false)
    setAuditEvents(loading([]))
    setAuditEvidence(loaded(null))
    setAuditEvidenceOffset(0)
    setAuditEvidenceExportMessage(null)
    setAuditEvidenceCheckpoint(loaded(null))
    setAuditEvidenceCheckpointMessage(null)
    setSelectedConversationId(null)
    setSelectedSessionId(null)
    setApprovalActionId(null)
    setApprovalMessage(null)
    setTaskActionId(null)
    setTaskMessage(null)
    setDeadLetterActionId(null)
    setDeadLetterMessage(null)
    setIsManagingAuditEvidenceCheckpoint(false)
    setIsRequestingAuditEvidenceExport(false)
    const scope = identityKey

    apiClient
      .listConversations(identity, { limit: 25, offset: 0 })
      .then((page) => {
        if (!active || !isCurrentIdentity(scope)) return
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
        if (!active || !isCurrentIdentity(scope)) return
        setConversations(failed([]))
        setMessages(failed([]))
        setAuditEvents(failed([]))
      })

    apiClient
      .listApprovals(identity)
      .then((data) => {
        if (active && isCurrentIdentity(scope)) setApprovals(loaded(data))
      })
      .catch(() => {
        if (active && isCurrentIdentity(scope)) setApprovals(failed([]))
      })

    apiClient
      .listTasks(identity)
      .then((data) => {
        if (active && isCurrentIdentity(scope)) setTasks(loaded(data))
      })
      .catch(() => {
        if (active && isCurrentIdentity(scope)) setTasks(failed([]))
      })

    const deadLetterIdentity = currentTenantIdentity()
    if (deadLetterIdentity && canReviewDeadLetters(deadLetterIdentity.role)) {
      apiClient
        .listDeadLetters(deadLetterIdentity)
        .then((data) => {
          if (active && isCurrentIdentity(scope)) setDeadLetters(loaded(data))
        })
        .catch(() => {
          if (active && isCurrentIdentity(scope)) setDeadLetters(failed([]))
        })
    } else {
      setDeadLetters(loaded([]))
    }

    const orchestrationIdentity = currentTenantIdentity()
    if (
      orchestrationIdentity &&
      canReviewOrchestration(orchestrationIdentity.role)
    ) {
      apiClient
        .listOrchestrationGoals(orchestrationIdentity)
        .then((page) => {
          if (!active || !isCurrentIdentity(scope)) return
          setOrchestrationGoals(loaded(page.items))
          setSelectedGoalId(page.items[0]?.id ?? null)
        })
        .catch(() => {
          if (!active || !isCurrentIdentity(scope)) return
          setOrchestrationGoals(failed([]))
        })
    } else {
      setOrchestrationGoals(loaded([]))
    }

    return () => {
      active = false
    }
  }, [identityKey, reloadNonce])

  useEffect(() => {
    const identity = currentTenantIdentity()
    if (
      !identity ||
      identityChanged ||
      !canReviewOrchestration(identity.role) ||
      !selectedGoalId
    ) {
      setOrchestrationDetail(null)
      setOrchestrationDetailLoading(false)
      return
    }
    let active = true
    const scope = identityKey
    setOrchestrationDetailLoading(true)
    apiClient
      .getOrchestrationGoal(identity, selectedGoalId)
      .then((detail) => {
        if (active && isCurrentIdentity(scope)) setOrchestrationDetail(detail)
      })
      .catch(() => {
        if (active && isCurrentIdentity(scope)) setOrchestrationDetail(null)
      })
      .finally(() => {
        if (active && isCurrentIdentity(scope))
          setOrchestrationDetailLoading(false)
      })
    return () => {
      active = false
    }
  }, [selectedGoalId, identityKey, identityChanged, reloadNonce])

  useEffect(() => {
    const identity = currentOperatorIdentity()
    if (!identity || identityChanged) return
    if (!selectedConversationId) return
    let active = true
    const scope = viewScopeToken
    setMessages(loading([]))

    apiClient
      .getTimeline(selectedConversationId, identity)
      .then((timeline) => {
        if (active && isCurrentViewScope(scope))
          setMessages(loaded(timeline.messages))
      })
      .catch(() => {
        if (active && isCurrentViewScope(scope)) setMessages(failed([]))
      })

    return () => {
      active = false
    }
  }, [
    selectedConversationId,
    identityKey,
    identityChanged,
    viewScopeToken,
    reloadNonce
  ])

  useEffect(() => {
    const identity = currentOperatorIdentity()
    if (!identity || identityChanged) return
    if (!selectedConversationId) return
    if (!selectedSessionId) {
      setAuditEvents(loaded([]))
      return
    }

    let active = true
    const scope = viewScopeToken
    setAuditEvents(loading([]))

    apiClient
      .getAudit(selectedSessionId, identity)
      .then((audit) => {
        if (active && isCurrentViewScope(scope))
          setAuditEvents(loaded(audit.events))
      })
      .catch(() => {
        if (active && isCurrentViewScope(scope)) setAuditEvents(failed([]))
      })

    return () => {
      active = false
    }
  }, [
    selectedConversationId,
    selectedSessionId,
    identityKey,
    identityChanged,
    viewScopeToken,
    reloadNonce
  ])

  useEffect(() => {
    const identity = currentOperatorIdentity()
    if (!identity || identityChanged) return
    if (!selectedSessionId) {
      setAuditEvidence(loaded(null))
      setAuditEvidenceOffset(0)
      setAuditEvidenceExportMessage(null)
      setAuditEvidenceCheckpoint(loaded(null))
      setAuditEvidenceCheckpointMessage(null)
      return
    }
    if (!canReviewAuditEvidence(identity.role)) {
      setAuditEvidence(loaded(null))
      setAuditEvidenceOffset(0)
      setAuditEvidenceExportMessage(null)
      setAuditEvidenceCheckpoint(loaded(null))
      setAuditEvidenceCheckpointMessage(null)
      return
    }

    let active = true
    const scope = viewScopeToken
    setAuditEvidence(loading(null))

    apiClient
      .getAuditEvidence({
        identity,
        sessionId: selectedSessionId,
        limit: auditEvidenceLimit,
        offset: auditEvidenceOffset
      })
      .then((evidence) => {
        if (active && isCurrentViewScope(scope))
          setAuditEvidence(loaded(evidence))
      })
      .catch(() => {
        if (active && isCurrentViewScope(scope)) setAuditEvidence(failed(null))
      })

    return () => {
      active = false
    }
  }, [
    selectedSessionId,
    identityKey,
    identityChanged,
    auditEvidenceOffset,
    viewScopeToken,
    reloadNonce
  ])

  useEffect(() => {
    const identity = currentOperatorIdentity()
    if (
      !identity ||
      identityChanged ||
      !selectedSessionId ||
      !canReviewAuditEvidence(identity.role)
    ) {
      setAuditEvidenceCheckpoint(loaded(null))
      return
    }
    let active = true
    const scope = viewScopeToken
    setAuditEvidenceCheckpoint(loading(null))
    apiClient
      .listAuditEvidenceCheckpoints(identity)
      .then(({ checkpoints }) => {
        if (!active || !isCurrentViewScope(scope)) return
        const current =
          checkpoints.find(
            (checkpoint) =>
              checkpoint.filters.sessionId === selectedSessionId &&
              checkpoint.status !== 'ARCHIVED'
          ) ??
          checkpoints.find(
            (checkpoint) => checkpoint.filters.sessionId === selectedSessionId
          ) ??
          null
        setAuditEvidenceCheckpoint(loaded(current))
      })
      .catch(() => {
        if (active && isCurrentViewScope(scope))
          setAuditEvidenceCheckpoint(failed(null))
      })
    return () => {
      active = false
    }
  }, [
    selectedSessionId,
    identityKey,
    identityChanged,
    viewScopeToken,
    reloadNonce
  ])

  const selectConversation = (
    conversation: Pick<ConversationView, 'id' | 'openSessionId'>
  ) => {
    setSelectedConversationId(conversation.id)
    setSelectedSessionId(conversation.openSessionId)
    setAuditEvidenceOffset(0)
    setAuditEvidenceExportMessage(null)
    setAuditEvidenceCheckpoint(loaded(null))
    setAuditEvidenceCheckpointMessage(null)
  }

  const refreshApprovals = async (scope = viewScopeToken) => {
    const identity = currentOperatorIdentity()
    if (!identity || !isCurrentViewScope(scope)) return
    const data = await apiClient.listApprovals(identity)
    if (!isCurrentViewScope(scope)) return
    setApprovals(loaded(data))
  }

  const refreshAudit = async (scope = viewScopeToken) => {
    const identity = currentOperatorIdentity()
    if (!identity || !isCurrentViewScope(scope) || !selectedSessionId) return
    const audit = await apiClient.getAudit(selectedSessionId, identity)
    if (!isCurrentViewScope(scope)) return
    setAuditEvents(loaded(audit.events))
  }

  const refreshAuditEvidence = async (scope = viewScopeToken) => {
    const identity = currentOperatorIdentity()
    if (
      !identity ||
      !isCurrentViewScope(scope) ||
      !selectedSessionId ||
      !canReviewAuditEvidence(identity.role)
    )
      return
    const evidence = await apiClient.getAuditEvidence({
      identity,
      sessionId: selectedSessionId,
      limit: auditEvidenceLimit,
      offset: auditEvidenceOffset
    })
    if (!isCurrentViewScope(scope)) return
    setAuditEvidence(loaded(evidence))
    const { checkpoints } =
      await apiClient.listAuditEvidenceCheckpoints(identity)
    if (!isCurrentViewScope(scope)) return
    setAuditEvidenceCheckpoint(
      loaded(
        checkpoints.find(
          (checkpoint) => checkpoint.filters.sessionId === selectedSessionId
        ) ?? null
      )
    )
  }

  const sealAuditEvidenceCheckpoint = async () => {
    const scope = viewScopeToken
    const identity = currentOperatorIdentity()
    const page = auditEvidence.data?.page.items
    if (
      !identity ||
      !isCurrentViewScope(scope) ||
      !selectedSessionId ||
      !page?.length
    )
      return
    if (!canReviewAuditEvidence(identity.role)) return
    setIsManagingAuditEvidenceCheckpoint(true)
    setAuditEvidenceCheckpointMessage(null)
    try {
      const result = await apiClient.createAuditEvidenceCheckpoint({
        identity,
        eventIds: page.map((event) => event.id),
        filters: { sessionId: selectedSessionId }
      })
      if (!isCurrentViewScope(scope)) return
      setAuditEvidenceCheckpoint(loaded(result.checkpoint))
      setAuditEvidenceCheckpointMessage(
        'Checkpoint selado com IDs e digest; nenhum payload foi persistido.'
      )
    } catch (error) {
      if (!isCurrentViewScope(scope)) return
      setAuditEvidenceCheckpointMessage(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel selar o checkpoint.'
      )
    } finally {
      if (isCurrentViewScope(scope)) setIsManagingAuditEvidenceCheckpoint(false)
    }
  }

  const archiveAuditEvidenceCheckpoint = async () => {
    const scope = viewScopeToken
    const identity = currentOperatorIdentity()
    const checkpoint = auditEvidenceCheckpoint.data
    if (
      !identity ||
      !isCurrentViewScope(scope) ||
      !checkpoint ||
      checkpoint.status !== 'SEALED'
    )
      return
    if (!canReviewAuditEvidence(identity.role)) return
    setIsManagingAuditEvidenceCheckpoint(true)
    setAuditEvidenceCheckpointMessage(null)
    try {
      const result = await apiClient.transitionAuditEvidenceCheckpoint({
        identity,
        checkpointId: checkpoint.id,
        expectedStatus: 'SEALED'
      })
      if (!isCurrentViewScope(scope)) return
      setAuditEvidenceCheckpoint(loaded(result.checkpoint))
      setAuditEvidenceCheckpointMessage('Checkpoint arquivado com CAS.')
    } catch (error) {
      if (!isCurrentViewScope(scope)) return
      setAuditEvidenceCheckpointMessage(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel arquivar o checkpoint.'
      )
    } finally {
      if (isCurrentViewScope(scope)) setIsManagingAuditEvidenceCheckpoint(false)
    }
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
    const scope = viewScopeToken
    const identity = currentOperatorIdentity()
    if (!identity || !isCurrentViewScope(scope)) return
    if (!selectedSessionId) return
    if (!canReviewAuditEvidence(identity.role)) return

    setIsRequestingAuditEvidenceExport(true)
    setAuditEvidenceExportMessage(null)
    try {
      await apiClient.requestAuditEvidenceExportApproval({
        identity,
        sessionId: selectedSessionId
      })
      await refreshApprovals(scope)
      if (!isCurrentViewScope(scope)) return
      setAuditEvidenceExportMessage(
        'Solicitacao de export registrada para aprovacao humana.'
      )
    } catch {
      if (!isCurrentViewScope(scope)) return
      setAuditEvidenceExportMessage(
        'Erro ao solicitar aprovacao de export controlado.'
      )
    } finally {
      if (isCurrentViewScope(scope)) setIsRequestingAuditEvidenceExport(false)
    }
  }

  const refreshTasks = async (scope = viewScopeToken) => {
    const identity = currentOperatorIdentity()
    if (!identity || !isCurrentViewScope(scope)) return
    const data = await apiClient.listTasks(identity)
    if (!isCurrentViewScope(scope)) return
    setTasks(loaded(data))
  }

  const refreshDeadLetters = async (scope = viewScopeToken) => {
    const identity = currentTenantIdentity()
    if (
      !identity ||
      !isCurrentViewScope(scope) ||
      !canReviewDeadLetters(identity.role)
    )
      return
    const data = await apiClient.listDeadLetters(identity)
    if (!isCurrentViewScope(scope)) return
    setDeadLetters(loaded(data))
  }

  const decideApproval = async (
    approvalRequestId: string,
    decision: ApprovalDecision,
    note: string
  ) => {
    const scope = viewScopeToken
    const identity = currentOperatorIdentity()
    if (!identity || !isCurrentViewScope(scope)) {
      if (!isCurrentViewScope(scope)) return
      setApprovals(failed(approvals.data))
      return
    }
    setApprovalMessage(null)
    setApprovalActionId(approvalRequestId)
    try {
      await apiClient.decideApproval({
        approvalRequestId,
        decision,
        identity,
        note
      })
      if (!isCurrentViewScope(scope)) return
      await refreshApprovals(scope)
      await refreshAudit(scope)
      await refreshAuditEvidence(scope)
      if (isCurrentViewScope(scope)) {
        setApprovalMessage({
          tone: 'success',
          text:
            decision === 'approved'
              ? 'Aprovação registrada; a continuação permanece no outbox controlado.'
              : decision === 'rejected'
                ? 'Rejeição registrada; nenhuma ação externa foi autorizada.'
                : 'Handoff assumido; a automação permanece suspensa.'
        })
      }
    } catch (error) {
      if (!isCurrentViewScope(scope)) return
      if (isApiConflict(error)) {
        try {
          await refreshApprovals(scope)
          await refreshAudit(scope)
          if (isCurrentViewScope(scope))
            setApprovalMessage({
              tone: 'info',
              text: 'Esta aprovacao ja foi decidida. A fila foi atualizada.'
            })
        } catch {
          if (isCurrentViewScope(scope)) setApprovals(failed(approvals.data))
        }
      } else {
        setApprovals(failed(approvals.data))
      }
    } finally {
      if (isCurrentViewScope(scope)) setApprovalActionId(null)
    }
  }

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    const scope = viewScopeToken
    const identity = currentOperatorIdentity()
    if (!identity || !isCurrentViewScope(scope)) {
      if (!isCurrentViewScope(scope)) return
      setTasks(failed(tasks.data))
      return
    }
    setTaskMessage(null)
    setTaskActionId(taskId)
    try {
      await apiClient.updateTaskStatus({ taskId, status, identity })
      if (!isCurrentViewScope(scope)) return
      await refreshTasks(scope)
      await refreshAudit(scope)
      if (isCurrentViewScope(scope)) {
        setTaskMessage({
          tone: 'success',
          text: 'Tarefa atualizada; a transicao ficou registrada na auditoria.'
        })
      }
    } catch {
      if (!isCurrentViewScope(scope)) return
      setTasks(failed(tasks.data))
      setTaskMessage({
        tone: 'error',
        text: 'Nao foi possivel atualizar a tarefa. Tente novamente com a mesma transicao.'
      })
    } finally {
      if (isCurrentViewScope(scope)) setTaskActionId(null)
    }
  }

  const requeueDeadLetter = async (eventId: string) => {
    const scope = viewScopeToken
    const identity = currentTenantIdentity()
    if (
      !identity ||
      !isCurrentViewScope(scope) ||
      !canReviewDeadLetters(identity.role)
    )
      return
    setDeadLetterActionId(eventId)
    setDeadLetterMessage(null)
    try {
      await apiClient.requeueDeadLetter({ identity, eventId })
      if (!isCurrentViewScope(scope)) return
      await refreshDeadLetters(scope)
      await Promise.allSettled([
        refreshAudit(scope),
        refreshAuditEvidence(scope)
      ])
      if (isCurrentViewScope(scope)) {
        setDeadLetterMessage({
          tone: 'success',
          text: 'Evento reenfileirado; o payload continua fora do console.'
        })
      }
    } catch {
      if (!isCurrentViewScope(scope)) return
      setDeadLetters(failed(deadLetters.data))
      setDeadLetterMessage({
        tone: 'error',
        text: 'Nao foi possivel reenfileirar o evento. Tente novamente.'
      })
    } finally {
      if (isCurrentViewScope(scope)) setDeadLetterActionId(null)
    }
  }

  const identityReady = Boolean(currentOperatorIdentity())
  const canDecideApproval =
    identityReady &&
    (operatorIdentity?.role === 'Approver' ||
      operatorIdentity?.role === 'Supervisor')
  const canAssumeHandoff =
    identityReady && operatorIdentity?.role === 'Supervisor'
  const canUpdateTasks = identityReady && operatorIdentity?.role === 'Operator'
  const canReviewEvidence =
    identityReady &&
    operatorIdentity !== null &&
    canReviewAuditEvidence(operatorIdentity.role)
  const canReviewDeadLetterQueue =
    identityReady &&
    normalizedTenantId.length > 0 &&
    operatorIdentity !== null &&
    canReviewDeadLetters(operatorIdentity.role)

  return (
    <main className="shell">
      <a
        className="skipLink"
        href="#console-operacional"
        onClick={(event) => {
          event.preventDefault()
          const target = document.getElementById('console-operacional')
          if (!target) return
          target.focus({ preventScroll: true })
          target.scrollIntoView({ block: 'start', behavior: 'auto' })
        }}
      >
        Pular para o console operacional
      </a>
      <header className="topbar" aria-labelledby="console-title">
        <div className="topbarIntro">
          <p className="eyebrow">OPERAÇÃO CONTROLADA · CVG</p>
          <h1 id="console-title">CVG Agent Secretary</h1>
          <p>
            Operacao assistida com aprovacoes, auditoria e acoes sensiveis
            bloqueadas.
          </p>
        </div>
        <div
          className="identityContext"
          aria-label="Contexto confiável da sessão"
        >
          <div className="identityContextHeader">
            <div>
              <p className="eyebrow">CONTEXTO DA SESSÃO</p>
              <h2>Identidade operacional</h2>
            </div>
            <span
              className={
                operatorIdentity
                  ? 'identityTrust identityTrustReady'
                  : 'identityTrust identityTrustMissing'
              }
              role="status"
            >
              <span aria-hidden="true">●</span>
              {operatorIdentity
                ? 'Resolvida pela sessão'
                : 'Aguardando sessão confiável'}
            </span>
          </div>
          <details
            className="identityDetails"
            open={identityDetailsOpen}
            onToggle={(event) =>
              setIdentityDetailsOpen(event.currentTarget.open)
            }
          >
            <summary>Detalhes da identidade</summary>
            <div className="identityDetailsBody">
              {operatorIdentity ? (
                <dl className="identityMeta">
                  <div>
                    <dt>Operador autenticado</dt>
                    <dd>
                      <code>{normalizedOperatorId}</code>
                    </dd>
                  </div>
                  <div>
                    <dt>Papel atribuído</dt>
                    <dd>
                      <span className="status">{operatorIdentity.role}</span>
                    </dd>
                  </div>
                  <div>
                    <dt>Tenant vinculado</dt>
                    <dd>
                      <code>{normalizedTenantId || 'Não informado'}</code>
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="identityUnavailable" role="alert">
                  Nenhum contexto de sessão foi fornecido. Leituras e ações
                  estão bloqueadas até o host disponibilizar uma identidade
                  confiável.
                </p>
              )}
              <p className="identityAuthorityNote">
                Contexto somente leitura; permissões e autoridade são sempre
                validadas pelo serviço.
              </p>
              <button
                type="button"
                className="sessionButton"
                onClick={() => {
                  setSessionClosed(true)
                  onSessionEnd?.()
                }}
                disabled={!operatorIdentity}
              >
                Encerrar sessão
              </button>
            </div>
          </details>
        </div>
      </header>
      <nav className="sectionNav" aria-label="Seções do console">
        <a href="#console-operacional">Operação</a>
        {operatorIdentity && canReviewOrchestration(operatorIdentity.role) ? (
          <a href="#orchestration-panel">Goals duráveis</a>
        ) : null}
        <a href="#journeys-panel">Jornadas</a>
        {canReviewDeadLetterQueue ? (
          <a href="#dead-letters-panel">Dead letters</a>
        ) : null}
        {operatorIdentity?.role === 'Admin' ? (
          <a href="#platform-panel">Admin console</a>
        ) : null}
      </nav>
      <section
        className="grid"
        id="console-operacional"
        aria-label="Console operacional"
        tabIndex={-1}
      >
        <ConversationsPanel
          conversations={conversations.data}
          selectedConversationId={selectedConversationId}
          messages={messages.data}
          error={conversations.error ?? messages.error}
          isLoading={conversations.isLoading}
          isTimelineLoading={!conversations.isLoading && messages.isLoading}
          onRetry={() => setReloadNonce((current) => current + 1)}
          onSelectConversation={selectConversation}
        />
        <ApprovalsPanel
          message={approvalMessage?.text ?? null}
          messageTone={approvalMessage?.tone ?? 'info'}
          approvals={approvals.data}
          actionId={approvalActionId}
          error={approvals.error}
          isLoading={approvals.isLoading}
          canApproveReject={canDecideApproval}
          canAssumeHandoff={canAssumeHandoff}
          onRetry={() => setReloadNonce((current) => current + 1)}
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
          message={taskMessage?.text ?? null}
          messageTone={taskMessage?.tone ?? 'info'}
          actionId={taskActionId}
          error={tasks.error}
          isLoading={tasks.isLoading}
          canUpdateTasks={canUpdateTasks}
          onRetry={() => setReloadNonce((current) => current + 1)}
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
          checkpoint={auditEvidenceCheckpoint.data}
          canManageEvidenceCheckpoint={
            canReviewEvidence &&
            !auditEvidenceCheckpoint.isLoading &&
            !auditEvidenceCheckpoint.error
          }
          checkpointMessage={auditEvidenceCheckpointMessage}
          isManagingEvidenceCheckpoint={isManagingAuditEvidenceCheckpoint}
          onRetry={() => setReloadNonce((current) => current + 1)}
          onSealEvidenceCheckpoint={() => void sealAuditEvidenceCheckpoint()}
          onArchiveEvidenceCheckpoint={() =>
            void archiveAuditEvidenceCheckpoint()
          }
          onNextEvidencePage={goToNextAuditEvidencePage}
          onPreviousEvidencePage={goToPreviousAuditEvidencePage}
          onRequestEvidenceExport={() =>
            void requestAuditEvidenceExportApproval()
          }
        />
      </section>
      <OrchestrationPanel
        identity={currentOperatorIdentity()}
        goals={orchestrationGoals.data}
        detail={orchestrationDetail}
        selectedGoalId={selectedGoalId}
        error={orchestrationGoals.error}
        isLoading={orchestrationGoals.isLoading}
        isDetailLoading={orchestrationDetailLoading}
        onRetry={() => setReloadNonce((current) => current + 1)}
        onSelectGoal={setSelectedGoalId}
      />
      <JourneysPanel
        identity={currentOperatorIdentity()}
        selectedSessionId={selectedSessionId}
      />
      {canReviewDeadLetterQueue ? (
        <DeadLettersPanel
          deadLetters={deadLetters.data}
          error={deadLetters.error}
          isLoading={deadLetters.isLoading}
          actionId={deadLetterActionId}
          canRequeue={canReviewDeadLetterQueue}
          message={deadLetterMessage?.text ?? null}
          messageTone={deadLetterMessage?.tone ?? 'info'}
          onRetry={() => setReloadNonce((current) => current + 1)}
          onRequeue={(eventId) => void requeueDeadLetter(eventId)}
        />
      ) : null}
      {operatorIdentity?.role === 'Admin' &&
      /^tenant_[0-9a-f-]{36}$/.test(normalizedTenantId) ? (
        <PlatformPanel
          identity={{
            operatorId: normalizedOperatorId,
            role: operatorIdentity.role,
            tenantId: normalizedTenantId
          }}
        />
      ) : null}
    </main>
  )
}
