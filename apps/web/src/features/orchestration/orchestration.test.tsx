import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OrchestrationPanel } from './index.tsx'
import type {
  OrchestrationGoalDetailView,
  OrchestrationGoalView
} from '../../api/client.ts'

const goal = (
  overrides: Partial<OrchestrationGoalView> = {}
): OrchestrationGoalView => ({
  id: 'goal_fixture_1',
  tenantId: 'tenant_00000000-0000-4000-8000-000000000751',
  status: 'WAITING_APPROVAL',
  objective: 'Revisar rascunho sintético',
  correlationId: 'corr_00000000-0000-4000-8000-000000000751',
  inboundMessageId: 'msg_fixture_1',
  conversationId: 'conv_fixture_1',
  sessionId: null,
  activePlanId: null,
  version: 3,
  lastReason: 'approval_pending',
  lastError: null,
  deadline: null,
  createdAt: '2026-09-15T12:00:00.000Z',
  updatedAt: '2026-09-15T12:01:00.000Z',
  budget: {
    maxSteps: 12,
    maxReplans: 3,
    maxIterations: 16,
    maxModelCalls: 8,
    maxToolCalls: 10,
    maxDurationMs: 120000,
    maxCostUsd: 2,
    usage: {
      steps: 1,
      replans: 0,
      iterations: 1,
      modelCalls: 1,
      toolCalls: 0,
      costUsd: 0
    }
  },
  ...overrides
})

const detail: OrchestrationGoalDetailView = {
  ...goal({ status: 'COMPLETED', activePlanId: 'plan_fixture_1' }),
  successCriteria: [],
  executionSnapshot: {
    agentVersion: 'synthetic-v1',
    promptVersion: 'prompt-v1',
    policyVersion: 'policy-v1',
    modelProfile: 'fast',
    toolVersions: {}
  },
  replanCount: 0,
  operatorState: {
    state: 'COMPLETED',
    reason: 'synthetic_plan',
    error: null,
    deadline: null,
    deadlineExpired: false,
    activePlanVersion: 1,
    currentStepId: null,
    currentStepStatus: null,
    leaseOwner: null,
    leaseUntil: null,
    approvalId: 'approval_fixture_1',
    handoffRequired: false,
    evidenceCount: 0,
    verifiedEvidenceCount: 0,
    lastObservationAt: null,
    lastEvaluation: null
  },
  plans: [
    {
      id: 'plan_fixture_1',
      goalId: 'goal_fixture_1',
      tenantId: 'tenant_00000000-0000-4000-8000-000000000751',
      version: 1,
      parentPlanId: null,
      triggeringEvaluationId: null,
      status: 'COMPLETED',
      reason: 'synthetic plan',
      fingerprint: 'a'.repeat(64),
      createdAt: '2026-09-15T12:00:00.000Z',
      updatedAt: '2026-09-15T12:01:00.000Z',
      steps: [
        {
          id: 'step_fixture_1',
          goalId: 'goal_fixture_1',
          planId: 'plan_fixture_1',
          type: 'synthetic',
          description: 'Registrar evidência sintética',
          dependencies: [],
          requiredCapabilities: ['appointment.create'],
          riskLevel: 'MEDIUM_RISK_WRITE',
          approvalRequirement: 'approval',
          status: 'SUCCEEDED',
          attemptCount: 1,
          approvalId: 'approval_fixture_1',
          toolId: 'synthetic-tool',
          toolVersion: '1.0.0',
          resultHash: 'b'.repeat(64),
          lastError: null,
          startedAt: '2026-09-15T12:00:30.000Z',
          completedAt: '2026-09-15T12:01:00.000Z',
          version: 2,
          createdAt: '2026-09-15T12:00:00.000Z',
          updatedAt: '2026-09-15T12:01:00.000Z',
          attempts: []
        }
      ]
    }
  ],
  observations: [],
  evaluations: []
}

describe('OrchestrationPanel', () => {
  afterEach(() => cleanup())

  it('shows bounded operational states and selects a Goal with keyboard focus', () => {
    const onSelectGoal = vi.fn()
    render(
      <OrchestrationPanel
        identity={{
          operatorId: 'operator.fixture',
          role: 'Supervisor',
          tenantId: 'tenant_00000000-0000-4000-8000-000000000751'
        }}
        goals={[
          goal(),
          goal({ id: 'goal_fixture_2', status: 'BLOCKED' }),
          // Adversarial API fixture: status normalization must tolerate a
          // legacy lower-case payload at the read-model boundary.
          goal({
            id: 'goal_fixture_3',
            status: 'replanning' as unknown as OrchestrationGoalView['status']
          })
        ]}
        detail={detail}
        selectedGoalId="goal_fixture_1"
        onSelectGoal={onSelectGoal}
      />
    )

    expect(screen.getByText('Goals duráveis')).toBeTruthy()
    expect(screen.getByText(/Aprovação 1/)).toBeTruthy()
    expect(screen.getByText(/Bloqueado 1/)).toBeTruthy()
    expect(screen.getByText(/Replanejando 1/)).toBeTruthy()
    expect(screen.getByText('Registrar evidência sintética')).toBeTruthy()
    expect(screen.queryByText('expected')).toBeNull()

    const secondGoal = screen.getByRole('button', {
      name: /goal_fixture_2/i
    })
    fireEvent.keyDown(secondGoal, { key: 'Enter' })
    fireEvent.click(secondGoal)
    expect(onSelectGoal).toHaveBeenCalledWith('goal_fixture_2')
  })

  it('does not render for roles without orchestration inspection permission', () => {
    render(
      <OrchestrationPanel
        identity={{ operatorId: 'operator.fixture', role: 'Operator' }}
        goals={[goal()]}
        detail={null}
        selectedGoalId={null}
      />
    )
    expect(screen.queryByText('Goals duráveis')).toBeNull()
  })

  it('exposes loading, error and empty states with retry affordances', () => {
    const identity = {
      operatorId: 'operator.fixture',
      role: 'Supervisor' as const,
      tenantId: 'tenant_00000000-0000-4000-8000-000000000751'
    }
    const retryGoals = vi.fn()
    const retryDetail = vi.fn()
    const { rerender } = render(
      <OrchestrationPanel
        identity={identity}
        goals={[]}
        detail={null}
        selectedGoalId={null}
        isLoading
      />
    )
    expect(screen.getByRole('status').textContent).toMatch(/carregando goals/i)
    expect(screen.getByRole('region').getAttribute('aria-busy')).toBe('true')

    rerender(
      <OrchestrationPanel
        identity={identity}
        goals={[]}
        detail={null}
        selectedGoalId={null}
        error="Falha sintética ao carregar Goals"
        onRetry={retryGoals}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(retryGoals).toHaveBeenCalledOnce()
    expect(screen.getByRole('alert').textContent).toMatch(/falha sintética/i)

    rerender(
      <OrchestrationPanel
        identity={identity}
        goals={[goal()]}
        detail={null}
        selectedGoalId={null}
        detailError="Falha sintética no detalhe"
        onRetryDetail={retryDetail}
      />
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Tentar novamente carregar detalhe do Goal'
      })
    )
    expect(retryDetail).toHaveBeenCalledOnce()

    rerender(
      <OrchestrationPanel
        identity={identity}
        goals={[]}
        detail={null}
        selectedGoalId={null}
      />
    )
    expect(screen.getByText(/nenhum goal durável neste tenant/i)).toBeTruthy()
  })

  it('makes UNCERTAIN reconciliation and latest attempt evidence explicit', () => {
    const uncertainDetail: OrchestrationGoalDetailView = {
      ...detail,
      status: 'UNCERTAIN',
      operatorState: {
        ...detail.operatorState,
        state: 'UNCERTAIN',
        currentStepId: 'step_fixture_1',
        currentStepStatus: 'UNCERTAIN',
        leaseOwner: 'worker_synthetic_1',
        leaseUntil: '2026-09-15T12:02:00.000Z'
      },
      plans: detail.plans.map((plan) => ({
        ...plan,
        steps: plan.steps.map((step) => ({
          ...step,
          status: 'UNCERTAIN',
          attempts: [
            {
              id: 'attempt_fixture_1',
              workerId: 'worker_synthetic_1',
              correlationId: goal().correlationId,
              startedAt: '2026-09-15T12:00:30.000Z',
              finishedAt: '2026-09-15T12:01:30.000Z',
              outcome: 'UNCERTAIN',
              errorClass: 'effect_state_unknown'
            }
          ]
        }))
      }))
    }
    render(
      <OrchestrationPanel
        identity={{
          operatorId: 'operator.fixture',
          role: 'Supervisor',
          tenantId: goal().tenantId
        }}
        goals={[goal({ status: 'UNCERTAIN' })]}
        detail={uncertainDetail}
        selectedGoalId={uncertainDetail.id}
      />
    )

    expect(screen.getByText(/reconciliação necessária/i)).toBeTruthy()
    expect(screen.getByText(/retomada automática suspensa/i)).toBeTruthy()
    expect(screen.getByText(/effect_state_unknown/i)).toBeTruthy()
    expect(screen.getAllByText(/worker_synthetic_1/i).length).toBeGreaterThan(1)
  })
})
