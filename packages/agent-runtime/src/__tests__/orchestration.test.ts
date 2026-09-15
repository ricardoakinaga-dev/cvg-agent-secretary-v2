import { describe, expect, it } from 'vitest'
import {
  assertGoalTransition,
  assertPlanStepTransition,
  GoalPlanOrchestrator,
  InMemoryGoalPlanStore,
  validatePlanGraph,
  type Goal,
  type CreateGoalInput,
  type Plan,
  type PlanStep,
  type PlanStepDraft,
  type StepExecutionResult,
  type ExecutionBudgetInput
} from '../orchestration.ts'

const TENANT = 'tenant_00000000-0000-4000-8000-000000000001'
const OTHER_TENANT = 'tenant_00000000-0000-4000-8000-000000000002'
const CORRELATION = 'corr_00000000-0000-4000-8000-000000000001'
const NOW = new Date('2026-09-15T12:00:00.000Z')

function intent(action: string): PlanStepDraft['intent'] {
  return {
    capability: 'appointment.create',
    action,
    resource: { type: 'synthetic_appointment', id: 'apt_1', tenantId: TENANT },
    dataClassification: 'INTERNAL',
    modelMessages: null,
    structuredOutput: null,
    idempotencyKey: `synthetic:${action}`
  }
}

function step(
  id: string,
  dependencies: string[] = [],
  action = id
): PlanStepDraft {
  return {
    id,
    type: 'synthetic_controlled_step',
    description: action,
    dependencies,
    requiredCapabilities: ['appointment.create'],
    riskLevel: 'MEDIUM_RISK_WRITE',
    approvalRequirement: 'none',
    input: { action },
    expectedOutcome: { verified: true },
    timeoutMs: 1_000,
    intent: intent(action),
    toolId: 'synthetic-appointment',
    toolVersion: '1.0.0'
  }
}

function verifiedEvidence(reference: string) {
  return [
    {
      source: 'operational_state' as const,
      reference,
      verified: true,
      key: 'appointment.exists'
    }
  ]
}

function buildGoal(
  store: InMemoryGoalPlanStore,
  budget?: ExecutionBudgetInput
) {
  const input: CreateGoalInput = {
    tenantId: TENANT,
    sessionId: 'session_1',
    conversationId: 'conversation_1',
    objective:
      'Create a synthetic appointment only after the operational state is verified',
    successCriteria: [
      {
        kind: 'STATE',
        resourceType: 'synthetic_appointment',
        resourceId: 'apt_1',
        field: 'status',
        expected: 'created',
        source: 'operational_state'
      }
    ],
    correlationId: CORRELATION,
    executionSnapshot: {
      agentVersion: 'agent-v1',
      promptVersion: 'prompt-v1',
      policyVersion: 'policy-v1',
      modelProfile: 'deterministic',
      toolVersions: { 'synthetic-appointment': '1.0.0' }
    }
  }
  return store.createGoal(budget === undefined ? input : { ...input, budget })
}

function evaluatorForAllSteps() {
  return {
    async evaluate(input: { steps: PlanStep[] }) {
      const complete = input.steps.every(
        (candidate) => candidate.status === 'SUCCEEDED'
      )
      return complete
        ? {
            result: 'satisfied' as const,
            reason: 'synthetic operational state verified',
            evidence: verifiedEvidence('synthetic_appointment:apt_1')
          }
        : {
            result: 'not_satisfied' as const,
            reason: 'remaining plan steps are not complete',
            evidence: []
          }
    }
  }
}

function successfulExecutor() {
  return {
    async execute(input: { step: PlanStep }): Promise<StepExecutionResult> {
      return {
        outcome: 'succeeded',
        reason: `executed:${input.step.id}`,
        resultDigest: `digest:${input.step.id}`,
        evidence: verifiedEvidence(`synthetic_step:${input.step.id}`),
        modelCalls: 0,
        toolCalls: 1,
        costUsd: 0.01
      }
    }
  }
}

async function activateInitialPlan(
  store: InMemoryGoalPlanStore,
  goal: Goal,
  drafts: PlanStepDraft[]
): Promise<{ goal: Goal; plan: Plan; steps: PlanStep[] }> {
  const graph = validatePlanGraph(
    { id: 'plan_draft', goalId: goal.id, tenantId: TENANT, version: 1 },
    drafts
  )
  return store.activatePlan({
    tenantId: TENANT,
    goalId: goal.id,
    expectedGoalVersion: goal.version,
    planVersion: 1,
    parentPlanId: null,
    reason: 'initial synthetic plan',
    steps: drafts,
    consumeReplan: false,
    fingerprint: graph.fingerprint
  })
}

describe('durable Goal/Plan/Step orchestration', () => {
  it('validates a DAG and rejects duplicate, unknown and cyclic dependencies', () => {
    const plan = {
      id: 'plan_1',
      goalId: 'goal_1',
      tenantId: TENANT,
      version: 1
    }
    expect(
      validatePlanGraph(plan, [step('a'), step('b', ['a'])]).topologicalOrder
    ).toEqual(['a', 'b'])
    expect(() => validatePlanGraph(plan, [step('a'), step('a')])).toThrow(
      /Duplicate plan step id/
    )
    expect(() => validatePlanGraph(plan, [step('a', ['missing'])])).toThrow(
      /unknown step/
    )
    expect(() =>
      validatePlanGraph(plan, [step('a', ['b']), step('b', ['a'])])
    ).toThrow(/cycle/)
  })

  it('enforces explicit state transitions instead of independent flags', () => {
    expect(() => assertGoalTransition('OBSERVING', 'COMPLETED')).toThrow(
      /cannot transition/
    )
    expect(() => assertPlanStepTransition('SUCCEEDED', 'EXECUTING')).toThrow(
      /cannot transition/
    )
    expect(() =>
      assertGoalTransition('OBSERVING', 'UNDERSTANDING')
    ).not.toThrow()
  })

  it('executes a multi-step DAG and completes only after verified evaluation evidence', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const goal = await buildGoal(store)
    const orchestrator = new GoalPlanOrchestrator({
      store,
      workerId: 'worker-a',
      clock: () => NOW,
      planner: {
        async plan() {
          return {
            reason: 'two dependent synthetic steps',
            steps: [step('a'), step('b', ['a'])]
          }
        }
      },
      evaluator: evaluatorForAllSteps(),
      executor: successfulExecutor()
    })

    const result = await orchestrator.run(TENANT, goal.id)
    expect(result.goal.status).toBe('COMPLETED')
    expect(result.executedStepIds).toEqual(['a', 'b'])
    expect(
      result.steps.every((candidate) => candidate.status === 'SUCCEEDED')
    ).toBe(true)
    expect(await store.listEvaluations(TENANT, goal.id)).toHaveLength(2)
    expect(await store.listAttempts(TENANT, 'a')).toHaveLength(1)
    expect(await store.listAttempts(TENANT, 'b')).toHaveLength(1)
    expect(result.goal.budget.usage.steps).toBe(2)
  })

  it('never treats a successful tool call as Goal completion without verified evidence', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const goal = await buildGoal(store)
    const orchestrator = new GoalPlanOrchestrator({
      store,
      workerId: 'worker-evidence',
      clock: () => NOW,
      planner: {
        async plan() {
          return { reason: 'one step', steps: [step('a')] }
        }
      },
      evaluator: {
        async evaluate() {
          return {
            result: 'satisfied' as const,
            reason: 'model says done',
            evidence: []
          }
        }
      },
      executor: successfulExecutor()
    })

    await expect(orchestrator.run(TENANT, goal.id)).rejects.toMatchObject({
      code: 'invalid_plan'
    })
    expect((await store.getGoal(TENANT, goal.id))?.status).toBe('EVALUATING')
  })

  it('persists plan lineage and performs a bounded replan', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const goal = await buildGoal(store, {
      maxSteps: 4,
      maxReplans: 1,
      maxModelCalls: 2,
      maxToolCalls: 4,
      maxDurationMs: 10_000,
      maxCostUsd: 1
    })
    let plannerCalls = 0
    const orchestrator = new GoalPlanOrchestrator({
      store,
      workerId: 'worker-replan',
      clock: () => NOW,
      planner: {
        async plan() {
          plannerCalls += 1
          return plannerCalls === 1
            ? { reason: 'initial plan', steps: [step('first')] }
            : {
                reason: 'slot conflict replanned',
                steps: [step('replacement')]
              }
        }
      },
      evaluator: {
        async evaluate(input) {
          return input.plan.version === 1
            ? {
                result: 'not_satisfied' as const,
                reason: 'slot conflict',
                evidence: []
              }
            : {
                result: 'satisfied' as const,
                reason: 'replacement state verified',
                evidence: verifiedEvidence('synthetic_appointment:apt_1')
              }
        }
      },
      executor: successfulExecutor()
    })

    const result = await orchestrator.run(TENANT, goal.id)
    const plans = await store.listPlans(TENANT, goal.id)
    expect(result.goal.status).toBe('COMPLETED')
    expect(result.goal.budget.usage.replans).toBe(1)
    expect(plans.map((candidate) => candidate.status)).toEqual([
      'SUPERSEDED',
      'COMPLETED'
    ])
    expect(plans[1]?.parentPlanId).toBe(plans[0]?.id)
    expect(plannerCalls).toBe(2)
  })

  it('stops repeated replans with LOOP_DETECTED and respects a zero replan budget', async () => {
    const repeatedStore = new InMemoryGoalPlanStore({ clock: () => NOW })
    const repeatedGoal = await buildGoal(repeatedStore, {
      maxSteps: 4,
      maxReplans: 3,
      maxModelCalls: 1,
      maxToolCalls: 4,
      maxDurationMs: 10_000,
      maxCostUsd: 1
    })
    const repeated = new GoalPlanOrchestrator({
      store: repeatedStore,
      workerId: 'worker-loop',
      clock: () => NOW,
      planner: {
        async plan() {
          return { reason: 'same plan', steps: [step('same')] }
        }
      },
      evaluator: {
        async evaluate() {
          return {
            result: 'not_satisfied' as const,
            reason: 'same failure',
            evidence: []
          }
        }
      },
      executor: successfulExecutor()
    })
    expect((await repeated.run(TENANT, repeatedGoal.id)).goal.status).toBe(
      'LOOP_DETECTED'
    )

    const budgetStore = new InMemoryGoalPlanStore({ clock: () => NOW })
    const budgetGoal = await buildGoal(budgetStore, {
      maxSteps: 4,
      maxReplans: 0,
      maxModelCalls: 1,
      maxToolCalls: 4,
      maxDurationMs: 10_000,
      maxCostUsd: 1
    })
    const budget = new GoalPlanOrchestrator({
      store: budgetStore,
      workerId: 'worker-budget',
      clock: () => NOW,
      planner: {
        async plan() {
          return { reason: 'one plan', steps: [step('one')] }
        }
      },
      evaluator: {
        async evaluate() {
          return {
            result: 'not_satisfied' as const,
            reason: 'no verified state',
            evidence: []
          }
        }
      },
      executor: successfulExecutor()
    })
    expect((await budget.run(TENANT, budgetGoal.id)).goal.status).toBe(
      'BUDGET_EXHAUSTED'
    )
  })

  it('uses claim-level fencing when a lease expires, including worker-id reuse', async () => {
    let now = new Date(NOW)
    const store = new InMemoryGoalPlanStore({ clock: () => now })
    const goal = await buildGoal(store)
    const activated = await activateInitialPlan(store, goal, [step('leased')])
    const firstClaim = await store.claimStep({
      tenantId: TENANT,
      goalId: goal.id,
      planId: activated.plan.id,
      stepId: 'leased',
      workerId: 'reused-worker',
      expectedGoalVersion: activated.goal.version,
      now,
      leaseMs: 100
    })
    expect(firstClaim).not.toBeNull()
    now = new Date(NOW.getTime() + 101)
    const recovered = await store.recoverExpiredLease({
      tenantId: TENANT,
      stepId: 'leased',
      now,
      decision: 'retry',
      reason: 'synthetic worker crash before effect'
    })
    const secondClaim = await store.claimStep({
      tenantId: TENANT,
      goalId: goal.id,
      planId: activated.plan.id,
      stepId: 'leased',
      workerId: 'reused-worker',
      expectedGoalVersion: recovered.goal.version,
      now,
      leaseMs: 100
    })
    expect(secondClaim?.lease.leaseToken).not.toBe(firstClaim?.lease.leaseToken)
    await expect(
      store.settleStep({
        lease: firstClaim!.lease,
        outcome: 'succeeded',
        resultDigest: 'stale',
        reason: 'stale worker',
        approvalId: null,
        now,
        modelCalls: 0,
        toolCalls: 1,
        costUsd: 0
      })
    ).rejects.toMatchObject({ code: 'lease_lost' })
    await store.settleStep({
      lease: secondClaim!.lease,
      outcome: 'succeeded',
      resultDigest: 'fresh',
      reason: 'fresh worker',
      approvalId: null,
      now,
      modelCalls: 0,
      toolCalls: 1,
      costUsd: 0
    })
    expect(await store.listAttempts(TENANT, 'leased')).toHaveLength(2)
  })

  it('keeps tenant scope and budget across a new orchestrator instance', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const goal = await buildGoal(store, {
      maxSteps: 2,
      maxReplans: 0,
      maxModelCalls: 1,
      maxToolCalls: 2,
      maxDurationMs: 10_000,
      maxCostUsd: 1
    })
    expect(await store.getGoal(OTHER_TENANT, goal.id)).toBeNull()
    const activated = await activateInitialPlan(store, goal, [
      step('first'),
      step('second', ['first'])
    ])
    let executing = await store.transitionGoal({
      tenantId: TENANT,
      goalId: goal.id,
      expectedVersion: activated.goal.version,
      target: 'UNDERSTANDING',
      reason: 'resume test'
    })
    executing = await store.transitionGoal({
      tenantId: TENANT,
      goalId: goal.id,
      expectedVersion: executing.version,
      target: 'PLANNING',
      reason: 'resume test'
    })
    executing = await store.transitionGoal({
      tenantId: TENANT,
      goalId: goal.id,
      expectedVersion: executing.version,
      target: 'GOVERNING',
      reason: 'resume test'
    })
    executing = await store.transitionGoal({
      tenantId: TENANT,
      goalId: goal.id,
      expectedVersion: executing.version,
      target: 'EXECUTING',
      reason: 'resume test'
    })
    const claimed = await store.claimStep({
      tenantId: TENANT,
      goalId: goal.id,
      planId: activated.plan.id,
      stepId: 'first',
      workerId: 'worker-before-restart',
      expectedGoalVersion: executing.version,
      now: NOW,
      leaseMs: 1_000
    })
    await store.settleStep({
      lease: claimed!.lease,
      outcome: 'succeeded',
      resultDigest: 'first-digest',
      reason: 'first persisted before restart',
      approvalId: null,
      now: NOW,
      modelCalls: 0,
      toolCalls: 1,
      costUsd: 0.01
    })
    const resumed = new GoalPlanOrchestrator({
      store,
      workerId: 'worker-after-restart',
      clock: () => NOW,
      planner: {
        async plan() {
          return { reason: 'unused', steps: [step('unused')] }
        }
      },
      evaluator: evaluatorForAllSteps(),
      executor: successfulExecutor()
    })
    const result = await resumed.run(TENANT, goal.id)
    expect(result.goal.status).toBe('COMPLETED')
    expect(result.goal.budget.usage.steps).toBe(2)
    expect(result.executedStepIds).toEqual(['second'])
  })

  it('returns a safe terminal state on an expired lease when reconciliation is unavailable', async () => {
    let now = new Date(NOW)
    const store = new InMemoryGoalPlanStore({ clock: () => now })
    const goal = await buildGoal(store)
    const activated = await activateInitialPlan(store, goal, [
      step('uncertain')
    ])
    let executing = await store.transitionGoal({
      tenantId: TENANT,
      goalId: goal.id,
      expectedVersion: activated.goal.version,
      target: 'UNDERSTANDING',
      reason: 'uncertain recovery setup'
    })
    executing = await store.transitionGoal({
      tenantId: TENANT,
      goalId: goal.id,
      expectedVersion: executing.version,
      target: 'PLANNING',
      reason: 'uncertain recovery setup'
    })
    executing = await store.transitionGoal({
      tenantId: TENANT,
      goalId: goal.id,
      expectedVersion: executing.version,
      target: 'GOVERNING',
      reason: 'uncertain recovery setup'
    })
    executing = await store.transitionGoal({
      tenantId: TENANT,
      goalId: goal.id,
      expectedVersion: executing.version,
      target: 'EXECUTING',
      reason: 'uncertain recovery setup'
    })
    const claim = await store.claimStep({
      tenantId: TENANT,
      goalId: goal.id,
      planId: activated.plan.id,
      stepId: 'uncertain',
      workerId: 'worker-crash',
      expectedGoalVersion: executing.version,
      now,
      leaseMs: 100
    })
    expect(claim).not.toBeNull()
    now = new Date(NOW.getTime() + 101)
    const result = await new GoalPlanOrchestrator({
      store,
      workerId: 'worker-recovery',
      clock: () => now,
      planner: {
        async plan() {
          return { reason: 'unused', steps: [step('unused')] }
        }
      },
      evaluator: evaluatorForAllSteps(),
      executor: successfulExecutor()
    }).run(TENANT, goal.id)
    expect(result.goal.status).toBe('UNCERTAIN')
    expect(result.reason).toBe('UNCERTAIN')
  })
})
