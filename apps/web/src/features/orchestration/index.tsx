import { useEffect, useRef } from 'react'
import { formatStatus, formatTimestamp } from '../../ui/formatters.ts'
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
  isLoading?: boolean
  isDetailLoading?: boolean
  onRetry?: () => void
  onSelectGoal?: (goalId: string) => void
}

const terminalStatuses = new Set([
  'COMPLETED',
  'BLOCKED',
  'FAILED',
  'CANCELLED',
  'BUDGET_EXHAUSTED',
  'LOOP_DETECTED'
])

function countStatus(goals: OrchestrationGoalView[], status: string): number {
  return goals.filter((goal) => goal.status === status).length
}

export function OrchestrationPanel({
  identity,
  goals,
  detail,
  selectedGoalId,
  error = null,
  isLoading = false,
  isDetailLoading = false,
  onRetry,
  onSelectGoal
}: OrchestrationPanelProps) {
  const panelRef = useRef<HTMLElement | null>(null)
  const canInspect =
    identity?.role === 'Supervisor' || identity?.role === 'Admin'

  useEffect(() => {
    if (error) panelRef.current?.focus()
  }, [error])

  if (!canInspect) return null

  return (
    <section
      className="panel orchestrationPanel"
      id="orchestration-panel"
      aria-labelledby="orchestration-title"
      ref={panelRef}
      tabIndex={-1}
    >
      <header className="panelHeader">
        <div>
          <h2 id="orchestration-title">Goals duráveis</h2>
          <p>
            Estado de execução, planos e evidência operacional em modo leitura.
          </p>
        </div>
        <span className="counter" aria-label={`${goals.length} Goals visíveis`}>
          {goals.length}
        </span>
      </header>
      <div className="orchestrationStats" aria-label="Resumo dos Goals">
        <span>
          Ativos{' '}
          {goals.filter((goal) => !terminalStatuses.has(goal.status)).length}
        </span>
        <span>Aprovação {countStatus(goals, 'WAITING_APPROVAL')}</span>
        <span>Incerto {countStatus(goals, 'UNCERTAIN')}</span>
        <span>Bloqueado {countStatus(goals, 'BLOCKED')}</span>
        <span>Falha {countStatus(goals, 'FAILED')}</span>
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
        <p className="state" role="status">
          Nenhum Goal durável disponível para inspeção.
        </p>
      ) : null}
      {!isLoading && !error ? (
        <div className="orchestrationBody">
          <div className="list orchestrationList" aria-label="Goals duráveis">
            {goals.map((goal) => (
              <button
                className={`row rowButton ${selectedGoalId === goal.id ? 'rowSelected' : ''}`}
                type="button"
                key={goal.id}
                aria-pressed={selectedGoalId === goal.id}
                onClick={() => onSelectGoal?.(goal.id)}
              >
                <span className="recordTitle">
                  <strong>{goal.objective ?? 'Objetivo omitido'}</strong>
                  <span
                    className="stateBadge"
                    data-status={goal.status.toLowerCase()}
                  >
                    {formatStatus(goal.status)}
                  </span>
                </span>
                <span>
                  {goal.id} · versão {goal.version}
                </span>
                <span className="recordStatus">
                  Atualizado {formatTimestamp(goal.updatedAt) || 'sem data'} ·
                  correlation {goal.correlationId}
                </span>
              </button>
            ))}
          </div>
          <div className="orchestrationDetail" aria-live="polite">
            {isDetailLoading ? (
              <p className="state" role="status">
                Carregando detalhe...
              </p>
            ) : null}
            {!isDetailLoading && !detail ? (
              <p className="state">
                Selecione um Goal para ver planos e steps.
              </p>
            ) : null}
            {!isDetailLoading && detail ? <GoalDetail detail={detail} /> : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}

function GoalDetail({ detail }: { detail: OrchestrationGoalDetailView }) {
  return (
    <div className="orchestrationDetailBody">
      <div className="selectionContext">
        <span>Goal selecionado</span>
        <strong>{detail.status}</strong>
        <code>{detail.id}</code>
      </div>
      <dl className="recordMeta orchestrationMeta">
        <div>
          <dt>Plano ativo</dt>
          <dd>
            <code>{detail.activePlanId ?? 'Nenhum'}</code>
          </dd>
        </div>
        <div>
          <dt>Passos usados</dt>
          <dd>
            {detail.budget.usage.steps}/{detail.budget.maxSteps}
          </dd>
        </div>
        <div>
          <dt>Replans</dt>
          <dd>
            {detail.replanCount}/{detail.budget.maxReplans}
          </dd>
        </div>
        <div>
          <dt>Evidências</dt>
          <dd>{detail.observations.length}</dd>
        </div>
        <div>
          <dt>Avaliações</dt>
          <dd>{detail.evaluations.length}</dd>
        </div>
        <div>
          <dt>Atualizado</dt>
          <dd>{formatTimestamp(detail.updatedAt) || 'sem data'}</dd>
        </div>
      </dl>
      <div className="orchestrationPlans">
        {detail.plans.map((plan) => (
          <article className="orchestrationPlan" key={plan.id}>
            <div className="recordTitle">
              <strong>Plano v{plan.version}</strong>
              <span
                className="stateBadge"
                data-status={plan.status.toLowerCase()}
              >
                {formatStatus(plan.status)}
              </span>
            </div>
            <span className="recordStatus">
              {plan.steps.length} step(s) ·{' '}
              {plan.parentPlanId ? 'replan' : 'plano inicial'}
            </span>
            <div className="orchestrationSteps">
              {plan.steps.map((step) => (
                <div className="orchestrationStep" key={step.id}>
                  <div className="recordTitle">
                    <strong>{step.description ?? step.type}</strong>
                    <span
                      className="stateBadge"
                      data-status={step.status.toLowerCase()}
                    >
                      {formatStatus(step.status)}
                    </span>
                  </div>
                  <span className="recordStatus">
                    Risco {step.riskLevel} · dependências{' '}
                    {step.dependencies.length} · tentativas {step.attemptCount}
                  </span>
                  {step.approvalId ? (
                    <code>Aprovação {step.approvalId}</code>
                  ) : null}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
