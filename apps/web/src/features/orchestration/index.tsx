import { useEffect, useRef } from 'react'
import {
  formatApprovalRequirement,
  formatCostUsd,
  formatDiagnostic,
  formatDuration,
  formatReason,
  formatRiskLevel,
  formatStatus,
  formatTimestamp
} from '../../ui/formatters.ts'
import type {
  OperatorIdentity,
  OrchestrationGoalDetailView,
  OrchestrationGoalView
} from '../../api/client.ts'

export interface OrchestrationPanelProps {
  identity: OperatorIdentity | null
  goals: OrchestrationGoalView[]
  detail: OrchestrationGoalDetailView | null
  selectedGoalId: string | null
  error?: string | null
  detailError?: string | null
  isLoading?: boolean
  isDetailLoading?: boolean
  deadLetterCount?: number | null | undefined
  onRetry?: () => void
  onRetryDetail?: () => void
  onSelectGoal?: (goalId: string) => void
}

type PlanView = OrchestrationGoalDetailView['plans'][number]
type StepView = PlanView['steps'][number]
type EvidenceView =
  OrchestrationGoalDetailView['observations'][number]['evidence'][number]

const terminalStatuses = new Set([
  'COMPLETED',
  'SUCCEEDED',
  'BLOCKED',
  'FAILED',
  'CANCELLED',
  'BUDGET_EXHAUSTED',
  'LOOP_DETECTED'
])

const terminalPlanStatuses = new Set([
  'COMPLETED',
  'SUCCEEDED',
  'FAILED',
  'BLOCKED',
  'CANCELLED'
])

const currentStepStatuses = new Set([
  'OBSERVING',
  'UNDERSTANDING',
  'PLANNING',
  'GOVERNING',
  'WAITING_APPROVAL',
  'EXECUTING',
  'OBSERVING_RESULT',
  'EVALUATING',
  'REPLANNING',
  'WAITING_EXTERNAL',
  'HUMAN_HANDOFF',
  'PENDING_RETURN',
  'UNCERTAIN',
  'READY',
  'PENDING',
  'IN_PROGRESS',
  'RUNNING'
])

const humanOwnershipStatuses = new Set([
  'WAITING_APPROVAL',
  'WAITING_EXTERNAL',
  'HUMAN_HANDOFF',
  'PENDING_RETURN',
  'UNCERTAIN'
])

const failureStatuses = new Set([
  'FAILED',
  'BLOCKED',
  'BUDGET_EXHAUSTED',
  'LOOP_DETECTED'
])

function normalizeStatus(value: string): string {
  return value.trim().toUpperCase()
}

function countStatus(goals: OrchestrationGoalView[], status: string): number {
  const normalized = normalizeStatus(status)
  return goals.filter((goal) => normalizeStatus(goal.status) === normalized)
    .length
}

function getCurrentPlan(detail: OrchestrationGoalDetailView): PlanView | null {
  return (
    detail.plans.find((plan) => plan.id === detail.activePlanId) ??
    detail.plans.find(
      (plan) => !terminalPlanStatuses.has(normalizeStatus(plan.status))
    ) ??
    detail.plans.at(-1) ??
    null
  )
}

function getCurrentStep(
  detail: OrchestrationGoalDetailView,
  plan: PlanView | null
): StepView | null {
  if (!plan) return null
  const operatorStepId = detail.operatorState.currentStepId
  if (operatorStepId) {
    const operatorStep = plan.steps.find((step) => step.id === operatorStepId)
    if (operatorStep) return operatorStep
  }
  return (
    plan.steps.find((step) =>
      currentStepStatuses.has(normalizeStatus(step.status))
    ) ??
    plan.steps.find(
      (step) => !terminalStatuses.has(normalizeStatus(step.status))
    ) ??
    null
  )
}

function getGoalMetaId(goalId: string): string {
  return `goal-meta-${goalId.replace(/[^A-Za-z0-9_-]/g, '-')}`
}

function displayDiagnostic(value?: string | null): string {
  return formatDiagnostic(value) ?? 'Não informado'
}

function getOwnership(
  detail: OrchestrationGoalDetailView,
  currentStep: StepView | null
): { status: string; label: string; detail: string } {
  const goalStatus = normalizeStatus(detail.status)
  const stepStatus = normalizeStatus(currentStep?.status ?? '')
  const stepApproval = normalizeStatus(currentStep?.approvalRequirement ?? '')
  if (
    detail.operatorState.handoffRequired ||
    humanOwnershipStatuses.has(goalStatus) ||
    humanOwnershipStatuses.has(stepStatus) ||
    stepApproval === 'HUMAN_HANDOFF'
  ) {
    return {
      status: 'human_handoff',
      label: 'Operação humana',
      detail:
        'Handoff ou decisão humana requerida; o responsável nominal não é informado pelo read model.'
    }
  }
  if (failureStatuses.has(goalStatus)) {
    return {
      status: 'failed',
      label: 'Revisão operacional',
      detail:
        'Estado terminal ou bloqueado; qualquer retomada depende de decisão controlada.'
    }
  }
  return {
    status: 'executing',
    label: 'Orquestração CVG',
    detail:
      'Execução automatizada controlada; nenhum responsável nominal foi exposto.'
  }
}

function getUncertainSteps(detail: OrchestrationGoalDetailView): StepView[] {
  return detail.plans
    .flatMap((plan) => plan.steps)
    .filter((step) => normalizeStatus(step.status) === 'UNCERTAIN')
}

function LatestAttempt({ step }: { step: StepView }) {
  const latestAttempt = step.attempts.at(-1)
  if (!latestAttempt) return null
  const outcome = latestAttempt.outcome
    ? formatStatus(latestAttempt.outcome)
    : 'Em andamento'
  return (
    <span
      className="orchestrationAttempt"
      data-status={latestAttempt.outcome ?? 'running'}
    >
      Última tentativa: <strong>{outcome}</strong> · worker{' '}
      <code>{displayDiagnostic(latestAttempt.workerId)}</code>
      {latestAttempt.errorClass ? (
        <>
          {' '}
          · erro <code>{displayDiagnostic(latestAttempt.errorClass)}</code>
        </>
      ) : null}
    </span>
  )
}

function budgetLevel(used: number | null, limit: number): string {
  if (used === null) return 'configured'
  if (limit <= 0 || used >= limit) return used > limit ? 'exceeded' : 'warning'
  return used / limit >= 0.8 ? 'warning' : 'normal'
}

function BudgetMetric({
  label,
  used,
  limit,
  formatValue
}: {
  label: string
  used: number | null
  limit: number
  formatValue: (value: number) => string
}) {
  return (
    <div
      className="orchestrationBudgetMetric"
      data-level={budgetLevel(used, limit)}
    >
      <dt>{label}</dt>
      <dd>
        {used === null
          ? formatValue(limit)
          : `${formatValue(used)} / ${formatValue(limit)}`}
      </dd>
      <span>{used === null ? 'limite configurado' : 'uso / limite'}</span>
    </div>
  )
}

function EvidenceItems({ items }: { items: EvidenceView[] }) {
  if (items.length === 0) {
    return (
      <p className="orchestrationEvidenceEmpty">
        Nenhuma evidência registrada.
      </p>
    )
  }
  return (
    <ul className="orchestrationEvidenceList">
      {items.map((item, index) => (
        <li key={`${item.source}-${item.key ?? 'item'}-${index}`}>
          <span>
            <strong>{displayDiagnostic(item.source)}</strong>
            {item.key ? ` · ${displayDiagnostic(item.key)}` : ''}
          </span>
          {item.reference ? (
            <code>ref: {displayDiagnostic(item.reference)}</code>
          ) : null}
          {item.digest ? (
            <code>digest: {displayDiagnostic(item.digest)}</code>
          ) : null}
          <span
            className={`orchestrationEvidenceVerification orchestrationEvidenceVerification-${item.verified ? 'verified' : 'unverified'}`}
          >
            {item.verified ? 'Verificada' : 'Não verificada'}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function OrchestrationPanel({
  identity,
  goals,
  detail,
  selectedGoalId,
  error = null,
  detailError = null,
  isLoading = false,
  isDetailLoading = false,
  deadLetterCount,
  onRetry,
  onRetryDetail,
  onSelectGoal
}: OrchestrationPanelProps) {
  const panelRef = useRef<HTMLElement | null>(null)
  const canInspect =
    identity?.role === 'Supervisor' || identity?.role === 'Admin'

  useEffect(() => {
    if (error || detailError) panelRef.current?.focus()
  }, [detailError, error])

  if (!canInspect) return null

  const stats = [
    {
      label: 'Ativos',
      value: goals.filter(
        (goal) => !terminalStatuses.has(normalizeStatus(goal.status))
      ).length,
      status: 'active'
    },
    {
      label: 'Replanejando',
      value: countStatus(goals, 'REPLANNING'),
      status: 'replanning'
    },
    {
      label: 'Aprovação',
      value: countStatus(goals, 'WAITING_APPROVAL'),
      status: 'waiting_approval'
    },
    {
      label: 'Handoff',
      value: countStatus(goals, 'HUMAN_HANDOFF'),
      status: 'human_handoff'
    },
    {
      label: 'Incerto',
      value: countStatus(goals, 'UNCERTAIN'),
      status: 'uncertain'
    },
    {
      label: 'Bloqueado',
      value: countStatus(goals, 'BLOCKED'),
      status: 'blocked'
    },
    {
      label: 'Falha',
      value: countStatus(goals, 'FAILED'),
      status: 'failed'
    },
    ...(deadLetterCount !== undefined
      ? [
          {
            label: 'Dead letters',
            value: deadLetterCount === null ? '—' : deadLetterCount,
            status: 'dead_letter'
          }
        ]
      : [])
  ]

  return (
    <section
      className="panel orchestrationPanel"
      id="orchestration-panel"
      aria-labelledby="orchestration-title"
      aria-busy={isLoading || isDetailLoading}
      ref={panelRef}
      tabIndex={-1}
    >
      <header className="panelHeader orchestrationPanelHeader">
        <div>
          <p className="eyebrow">LEITURA OPERACIONAL</p>
          <h2 id="orchestration-title">Goals duráveis</h2>
          <p id="orchestration-description">
            Goal, plano, passo atual, limites, riscos e handoff em modo somente
            leitura.
          </p>
        </div>
        <div className="orchestrationHeaderMeta">
          <span
            className="orchestrationScope"
            aria-label={`Escopo do Goal: tenant ${identity?.tenantId ?? 'não informado'}`}
          >
            <span>Escopo ativo</span>
            <code>{identity?.tenantId ?? 'Tenant não informado'}</code>
          </span>
          <span
            className="counter"
            aria-label={`${goals.length} Goals visíveis`}
          >
            {goals.length}
          </span>
        </div>
      </header>
      <div
        className="orchestrationStats"
        aria-label="Resumo dos Goals e dead letters"
      >
        {stats.map((stat) => (
          <span
            className="orchestrationStat"
            data-status={stat.status}
            key={stat.label}
            aria-label={`${stat.label}: ${stat.value}`}
          >
            <span className="orchestrationStatLabel">
              {stat.label} {stat.value}
            </span>
          </span>
        ))}
      </div>
      {isLoading ? (
        <p className="state" role="status">
          Carregando Goals duráveis...
        </p>
      ) : null}
      {!isLoading && error ? (
        <div className="stateErrorBlock">
          <p className="state stateError" role="alert">
            {error}
          </p>
          {onRetry ? (
            <button className="stateRetry" type="button" onClick={onRetry}>
              Tentar novamente
            </button>
          ) : null}
        </div>
      ) : null}
      {!isLoading && !error && goals.length === 0 ? (
        <div className="orchestrationEmpty" role="status">
          <strong>Nenhum Goal durável neste tenant.</strong>
          <span>
            O read model não encontrou execução sintética disponível para o
            escopo atual; isso não representa uma fila global vazia.
          </span>
        </div>
      ) : null}
      {!isLoading && !error && goals.length > 0 ? (
        <div className="orchestrationBody">
          <div
            className="list orchestrationList"
            role="list"
            aria-label="Goals duráveis"
          >
            {goals.map((goal) => {
              const isSelected = selectedGoalId === goal.id
              const goalMetaId = getGoalMetaId(goal.id)
              const reason = formatReason(goal.lastReason)
              const diagnostic = formatDiagnostic(goal.lastError)
              const deadline = formatTimestamp(goal.deadline)
              return (
                <div role="listitem" key={goal.id}>
                  <button
                    className={`row rowButton ${isSelected ? 'rowSelected' : ''}`}
                    type="button"
                    aria-pressed={isSelected}
                    aria-controls="orchestration-detail"
                    aria-describedby={goalMetaId}
                    aria-label={`${goal.objective ?? 'Objetivo omitido'} — ${formatStatus(goal.status)} — ${goal.id}${isSelected ? ' — selecionado' : ''}`}
                    onClick={() => onSelectGoal?.(goal.id)}
                  >
                    <span className="recordTitle">
                      <strong>{goal.objective ?? 'Objetivo omitido'}</strong>
                      <span
                        className="stateBadge"
                        data-status={normalizeStatus(goal.status).toLowerCase()}
                      >
                        {formatStatus(goal.status)}
                      </span>
                    </span>
                    <span>
                      {goal.id} · versão {goal.version}
                    </span>
                    <span className="recordStatus" id={goalMetaId}>
                      Atualizado {formatTimestamp(goal.updatedAt) || 'sem data'}{' '}
                      · correlation {goal.correlationId}
                    </span>
                    {reason || diagnostic || deadline ? (
                      <span className="orchestrationRowSignals">
                        {reason ? <span>Motivo: {reason}</span> : null}
                        {diagnostic ? (
                          <span className="orchestrationRowError">
                            Erro: <code>{diagnostic}</code>
                          </span>
                        ) : null}
                        {deadline ? <span>Prazo: {deadline}</span> : null}
                      </span>
                    ) : null}
                  </button>
                </div>
              )
            })}
          </div>
          <div
            className="orchestrationDetail"
            id="orchestration-detail"
            aria-label="Detalhe do Goal selecionado"
            aria-live="polite"
          >
            {isDetailLoading ? (
              <p className="state" role="status">
                Carregando detalhe...
              </p>
            ) : null}
            {!isDetailLoading && detailError ? (
              <div className="stateErrorBlock orchestrationDetailError">
                <p className="state stateError" role="alert">
                  {detailError}
                </p>
                {onRetryDetail ? (
                  <button
                    className="stateRetry"
                    type="button"
                    onClick={onRetryDetail}
                    aria-label="Tentar novamente carregar detalhe do Goal"
                  >
                    Tentar novamente
                  </button>
                ) : null}
              </div>
            ) : null}
            {!isDetailLoading && !detailError && !detail ? (
              <p className="state">
                Selecione um Goal para ver planos e steps.
              </p>
            ) : null}
            {!isDetailLoading && !detailError && detail ? (
              <GoalDetail detail={detail} />
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}

function GoalDetail({ detail }: { detail: OrchestrationGoalDetailView }) {
  const currentPlan = getCurrentPlan(detail)
  const currentStep = getCurrentStep(detail, currentPlan)
  const ownership = getOwnership(detail, currentStep)
  const failedSteps = detail.plans
    .flatMap((plan) => plan.steps)
    .filter((step) => failureStatuses.has(normalizeStatus(step.status)))
  const hasFailure =
    failureStatuses.has(normalizeStatus(detail.status)) ||
    Boolean(detail.lastError) ||
    failedSteps.length > 0
  const orderedPlans = [...detail.plans].sort((left, right) => {
    if (left.id === currentPlan?.id) return -1
    if (right.id === currentPlan?.id) return 1
    return right.version - left.version
  })
  const linkedApprovalIds = Array.from(
    new Set(
      detail.plans
        .flatMap((plan) => plan.steps)
        .map((step) => step.approvalId)
        .filter((approvalId): approvalId is string => Boolean(approvalId))
    )
  )
  const reason = formatReason(detail.operatorState.reason ?? detail.lastReason)
  const diagnostic = formatDiagnostic(
    detail.operatorState.error ?? detail.lastError
  )
  const deadline = formatTimestamp(
    detail.operatorState.deadline ?? detail.deadline
  )
  const detailStatus = normalizeStatus(detail.operatorState.state).toLowerCase()
  const uncertainSteps = getUncertainSteps(detail)
  const hasUncertainty =
    detailStatus === 'uncertain' || uncertainSteps.length > 0

  return (
    <div className="orchestrationDetailBody">
      <div className="selectionContext">
        <span id="orchestration-detail-title">Goal selecionado</span>
        <div className="selectionContextStatus">
          <span className="stateBadge" data-status={detailStatus}>
            {formatStatus(detail.operatorState.state)}
          </span>
          <span>versão {detail.version}</span>
        </div>
        <code>{detail.id}</code>
      </div>

      <div className="orchestrationPriorityGrid">
        <article
          className="orchestrationPriorityCard"
          data-status={normalizeStatus(currentStep?.status ?? '').toLowerCase()}
        >
          <span>Passo atual</span>
          {currentStep ? (
            <>
              <strong>{currentStep.description ?? currentStep.type}</strong>
              <span>
                {formatStatus(
                  detail.operatorState.currentStepStatus ?? currentStep.status
                )}{' '}
                · plano v
                {detail.operatorState.activePlanVersion ??
                  currentPlan?.version ??
                  '—'}
              </span>
            </>
          ) : (
            <strong>Nenhum passo ativo identificado</strong>
          )}
        </article>
        <article
          className="orchestrationPriorityCard"
          data-status={ownership.status}
        >
          <span>Responsabilidade e handoff</span>
          <strong>{ownership.label}</strong>
          <p>{ownership.detail}</p>
          <span>Responsável nominal: não informado</span>
        </article>
        <article
          className="orchestrationPriorityCard"
          data-status={hasFailure ? 'failed' : detailStatus}
        >
          <span>Motivo operacional</span>
          <strong>{reason ?? 'Não informado'}</strong>
          {diagnostic ? (
            <p className="orchestrationPriorityError">
              Erro: <code>{diagnostic}</code>
            </p>
          ) : null}
          {deadline ? <span>Prazo: {deadline}</span> : null}
        </article>
      </div>

      {hasUncertainty ? (
        <section
          className="orchestrationUncertainty"
          aria-labelledby="orchestration-uncertainty-title"
        >
          <div>
            <span className="orchestrationUncertaintyEyebrow">
              Reconciliação necessária
            </span>
            <h3 id="orchestration-uncertainty-title">
              O efeito não pode ser classificado como concluído com segurança.
            </h3>
            <p>
              {uncertainSteps.length > 0
                ? `${uncertainSteps.length} step(s) permanecem UNCERTAIN; nenhuma repetição automática está autorizada.`
                : 'O Goal está UNCERTAIN; o próximo passo seguro é reconciliação humana ou evidência operacional adicional.'}
            </p>
          </div>
          <dl>
            <div>
              <dt>Próxima ação segura</dt>
              <dd>Reconciliar estado e registrar decisão controlada</dd>
            </div>
            <div>
              <dt>Automação</dt>
              <dd>Retomada automática suspensa</dd>
            </div>
          </dl>
        </section>
      ) : null}

      <dl className="recordMeta orchestrationMeta">
        <div>
          <dt>Plano ativo</dt>
          <dd>
            <code>{detail.activePlanId ?? 'Nenhum'}</code>
          </dd>
        </div>
        <div>
          <dt>Prazo</dt>
          <dd>
            {(detail.operatorState.deadline ?? detail.deadline) ? (
              <time
                dateTime={
                  detail.operatorState.deadline ?? detail.deadline ?? undefined
                }
              >
                {deadline}
              </time>
            ) : (
              'Não definido'
            )}
          </dd>
        </div>
        <div>
          <dt>Correlação</dt>
          <dd>
            <code>{detail.correlationId}</code>
          </dd>
        </div>
        <div>
          <dt>Sessão</dt>
          <dd>
            <code>{detail.sessionId ?? 'Não vinculada'}</code>
          </dd>
        </div>
        <div>
          <dt>Replans</dt>
          <dd>
            {detail.replanCount}/{detail.budget.maxReplans}
          </dd>
        </div>
        <div>
          <dt>Critérios de sucesso</dt>
          <dd>{detail.successCriteria.length}</dd>
        </div>
        <div>
          <dt>Atualizado</dt>
          <dd>
            <time dateTime={detail.updatedAt}>
              {formatTimestamp(detail.updatedAt) || 'sem data'}
            </time>
          </dd>
        </div>
        <div>
          <dt>Aprovações vinculadas</dt>
          <dd>{linkedApprovalIds.length}</dd>
        </div>
      </dl>

      <section
        className="orchestrationBudgetSection"
        aria-labelledby="orchestration-budget-title"
      >
        <header className="orchestrationSubsectionHeader">
          <div>
            <h3 id="orchestration-budget-title">Orçamento e uso</h3>
            <p>Uso atual / limite configurado; sem ações de alteração.</p>
          </div>
        </header>
        <dl className="orchestrationBudget">
          <BudgetMetric
            label="Passos"
            used={detail.budget.usage.steps}
            limit={detail.budget.maxSteps}
            formatValue={(value) => String(value)}
          />
          <BudgetMetric
            label="Replans"
            used={detail.budget.usage.replans}
            limit={detail.budget.maxReplans}
            formatValue={(value) => String(value)}
          />
          <BudgetMetric
            label="Iterações"
            used={detail.budget.usage.iterations}
            limit={detail.budget.maxIterations}
            formatValue={(value) => String(value)}
          />
          <BudgetMetric
            label="Chamadas de modelo"
            used={detail.budget.usage.modelCalls}
            limit={detail.budget.maxModelCalls}
            formatValue={(value) => String(value)}
          />
          <BudgetMetric
            label="Chamadas de ferramenta"
            used={detail.budget.usage.toolCalls}
            limit={detail.budget.maxToolCalls}
            formatValue={(value) => String(value)}
          />
          <BudgetMetric
            label="Duração máxima"
            used={null}
            limit={detail.budget.maxDurationMs}
            formatValue={formatDuration}
          />
          <BudgetMetric
            label="Custo USD"
            used={detail.budget.usage.costUsd}
            limit={detail.budget.maxCostUsd}
            formatValue={formatCostUsd}
          />
        </dl>
      </section>

      {hasFailure ? (
        <div className="orchestrationFailure" role="alert">
          <strong>Falha ou bloqueio registrado</strong>
          <span>
            {diagnostic
              ? `Goal: ${diagnostic}`
              : failedSteps[0]?.lastError
                ? `Step: ${displayDiagnostic(failedSteps[0].lastError)}`
                : `${formatStatus(detail.operatorState.state)}; revisão operacional necessária.`}
          </span>
        </div>
      ) : null}

      <section
        className="orchestrationEvidenceSection"
        aria-labelledby="orchestration-evidence-title"
      >
        <header className="orchestrationSubsectionHeader">
          <div>
            <h3 id="orchestration-evidence-title">
              Evidência e contexto de execução
            </h3>
            <p>
              Observações, avaliações e versões expostas como metadados
              operacionais redigidos.
            </p>
          </div>
        </header>
        <div className="orchestrationEvidenceGrid">
          <div className="orchestrationEvidenceBlock">
            <h4>Observações ({detail.observations.length})</h4>
            {detail.observations.length === 0 ? (
              <p className="orchestrationEvidenceEmpty">
                Nenhuma observação registrada.
              </p>
            ) : (
              <ul className="orchestrationEvidenceRecords">
                {detail.observations.map((observation) => (
                  <li key={observation.id}>
                    <strong>
                      {formatReason(observation.kind) ?? observation.kind}
                    </strong>
                    <span>
                      {observation.stepId
                        ? `Step ${observation.stepId}`
                        : `Plano ${observation.planId}`}
                    </span>
                    {observation.resultDigest ? (
                      <code>
                        digest: {displayDiagnostic(observation.resultDigest)}
                      </code>
                    ) : null}
                    <EvidenceItems items={observation.evidence} />
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="orchestrationEvidenceBlock">
            <h4>Avaliações ({detail.evaluations.length})</h4>
            {detail.evaluations.length === 0 ? (
              <p className="orchestrationEvidenceEmpty">
                Nenhuma avaliação registrada.
              </p>
            ) : (
              <ul className="orchestrationEvidenceRecords">
                {detail.evaluations.map((evaluation) => (
                  <li key={evaluation.id}>
                    <strong>{formatStatus(evaluation.result)}</strong>
                    <span>
                      {formatReason(evaluation.evaluatorType) ??
                        evaluation.evaluatorType}
                    </span>
                    {evaluation.reason ? (
                      <span>
                        Motivo: {displayDiagnostic(evaluation.reason)}
                      </span>
                    ) : null}
                    <EvidenceItems items={evaluation.evidence} />
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="orchestrationEvidenceBlock orchestrationRuntimeBlock">
            <h4>Runtime vinculado</h4>
            <dl className="orchestrationRuntimeFacts">
              <div>
                <dt>Agente</dt>
                <dd>
                  {displayDiagnostic(detail.executionSnapshot.agentVersion)}
                </dd>
              </div>
              <div>
                <dt>Prompt</dt>
                <dd>
                  {displayDiagnostic(detail.executionSnapshot.promptVersion)}
                </dd>
              </div>
              <div>
                <dt>Política</dt>
                <dd>
                  {displayDiagnostic(detail.executionSnapshot.policyVersion)}
                </dd>
              </div>
              <div>
                <dt>Modelo</dt>
                <dd>
                  {displayDiagnostic(detail.executionSnapshot.modelProfile)}
                </dd>
              </div>
              <div>
                <dt>Ferramentas</dt>
                <dd>
                  {Object.entries(detail.executionSnapshot.toolVersions)
                    .length > 0
                    ? Object.entries(detail.executionSnapshot.toolVersions)
                        .map(
                          ([name, version]) =>
                            `${displayDiagnostic(name)} ${displayDiagnostic(version)}`
                        )
                        .join(' · ')
                    : 'Nenhuma ferramenta vinculada'}
                </dd>
              </div>
              <div>
                <dt>Evidência verificada</dt>
                <dd>
                  {detail.operatorState.verifiedEvidenceCount}/
                  {detail.operatorState.evidenceCount}
                </dd>
              </div>
              <div>
                <dt>Última observação</dt>
                <dd>
                  {formatTimestamp(detail.operatorState.lastObservationAt) ??
                    'Não informada'}
                </dd>
              </div>
              <div>
                <dt>Última avaliação</dt>
                <dd>
                  {detail.operatorState.lastEvaluation
                    ? formatStatus(detail.operatorState.lastEvaluation.result)
                    : 'Não informada'}
                </dd>
              </div>
              <div>
                <dt>Worker/lease</dt>
                <dd>
                  {detail.operatorState.leaseOwner
                    ? `${displayDiagnostic(detail.operatorState.leaseOwner)} · até ${formatTimestamp(detail.operatorState.leaseUntil) ?? 'sem prazo'}`
                    : 'Nenhum lease ativo'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section
        className="orchestrationPlansSection"
        aria-labelledby="orchestration-plans-title"
      >
        <header className="orchestrationSubsectionHeader">
          <div>
            <h3 id="orchestration-plans-title">Planos e steps</h3>
            <p>{detail.plans.length} plano(s) no read model completo.</p>
          </div>
        </header>
        <div className="orchestrationPlans">
          {orderedPlans.map((plan) => (
            <article
              className={`orchestrationPlan ${plan.id === currentPlan?.id ? 'orchestrationPlanCurrent' : ''}`}
              key={plan.id}
              data-status={normalizeStatus(plan.status).toLowerCase()}
            >
              <div className="recordTitle orchestrationPlanTitle">
                <strong>
                  Plano v{plan.version}
                  {plan.id === currentPlan?.id ? ' · ativo' : ''}
                </strong>
                <span
                  className="stateBadge"
                  data-status={normalizeStatus(plan.status).toLowerCase()}
                >
                  {formatStatus(plan.status)}
                </span>
              </div>
              <div className="orchestrationPlanLineage">
                <span>{plan.steps.length} step(s)</span>
                <span>
                  {plan.parentPlanId ? 'Replan derivado' : 'Plano inicial'}
                </span>
                {plan.parentPlanId ? (
                  <code>origem: {plan.parentPlanId}</code>
                ) : null}
                {plan.triggeringEvaluationId ? (
                  <code>avaliação: {plan.triggeringEvaluationId}</code>
                ) : null}
              </div>
              <p className="orchestrationPlanReason">
                <strong>Motivo:</strong>{' '}
                {formatReason(plan.reason) ?? 'Não informado'}
              </p>
              <div className="orchestrationSteps">
                {plan.steps.map((step) => {
                  const isCurrentStep = currentStep?.id === step.id
                  const stepStatus = normalizeStatus(step.status).toLowerCase()
                  const approvalRequirement = formatApprovalRequirement(
                    step.approvalRequirement
                  )
                  return (
                    <div
                      className={`orchestrationStep ${isCurrentStep ? 'orchestrationStepCurrent' : ''}`}
                      key={step.id}
                      data-status={stepStatus}
                      aria-current={isCurrentStep ? 'step' : undefined}
                    >
                      <div className="recordTitle orchestrationStepTitle">
                        <strong>{step.description ?? step.type}</strong>
                        <span className="orchestrationStepLabels">
                          {isCurrentStep ? (
                            <span className="orchestrationCurrentMarker">
                              Passo atual
                            </span>
                          ) : null}
                          <span className="stateBadge" data-status={stepStatus}>
                            {formatStatus(step.status)}
                          </span>
                        </span>
                      </div>
                      <div className="orchestrationStepMeta">
                        <span>Risco: {formatRiskLevel(step.riskLevel)}</span>
                        <span>Aprovação: {approvalRequirement}</span>
                        <span>Dependências: {step.dependencies.length}</span>
                        <span>Tentativas: {step.attemptCount}</span>
                      </div>
                      <LatestAttempt step={step} />
                      {step.requiredCapabilities.length > 0 ? (
                        <span className="orchestrationCapabilities">
                          Capacidades:{' '}
                          {step.requiredCapabilities
                            .map(displayDiagnostic)
                            .join(' · ')}
                        </span>
                      ) : null}
                      {step.approvalId ? (
                        <span className="orchestrationApprovalSignal">
                          <strong>Aprovação vinculada</strong>{' '}
                          <code>{step.approvalId}</code>{' '}
                          <a
                            href="#approvals-title"
                            aria-label={`Ver aprovação vinculada ${step.approvalId}`}
                          >
                            Ver contexto
                          </a>
                        </span>
                      ) : step.approvalRequirement !== 'none' ? (
                        <span className="orchestrationApprovalSignal">
                          <strong>{approvalRequirement}</strong> · vínculo não
                          informado
                        </span>
                      ) : null}
                      {step.lastError ? (
                        <span className="orchestrationStepError" role="alert">
                          Erro do step:{' '}
                          <code>{displayDiagnostic(step.lastError)}</code>
                        </span>
                      ) : null}
                      {step.toolId ? (
                        <span className="orchestrationTool">
                          Ferramenta: <code>{step.toolId}</code>
                          {step.toolVersion ? ` · ${step.toolVersion}` : ''}
                        </span>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
