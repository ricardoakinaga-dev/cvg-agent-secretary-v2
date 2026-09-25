import { describe, expect, it } from 'vitest'
import {
  assertGoalReuseCompatibility,
  GoalPlanOrchestrator,
  InMemoryGoalPlanStore,
  OrchestrationError,
  validatePlanGraph,
  type CreateGoalInput,
  type Goal,
  type GoalEvaluator,
  type GoalPlanner,
  type GovernedStepExecutor,
  type PlanStepDraft
} from '../orchestration.ts'

const TENANT = 'tenant_00000000-0000-4000-8000-000000000001'
const CORRELATION = 'corr_00000000-0000-4000-8000-000000000001'
const NOW = new Date('2026-09-15T12:00:00.000Z')

function intent(
  action: string,
  overrides: Partial<PlanStepDraft['intent']> = {}
): PlanStepDraft['intent'] {
  return {
    capability: 'appointment.create',
    action,
    resource: {
      type: 'synthetic_appointment',
      id: `apt_${action}`,
      tenantId: TENANT
    },
    dataClassification: 'INTERNAL',
    modelMessages: null,
    structuredOutput: null,
    idempotencyKey: `synthetic:${action}`,
    ...overrides
  }
}

function step(
  id: string,
  dependencies: string[] = [],
  action = id,
  overrides: Partial<PlanStepDraft> = {}
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
    toolVersion: '1.0.0',
    ...overrides
  }
}

function goalInput(overrides: Partial<CreateGoalInput> = {}): CreateGoalInput {
  return {
    tenantId: TENANT,
    objective: 'branch-b synthetic objective',
    successCriteria: [],
    correlationId: CORRELATION,
    ...overrides
  }
}

function unreachablePlanner(): GoalPlanner {
  return {
    plan: async () => {
      throw new Error('synthetic planner must not run')
    }
  }
}

function unreachableEvaluator(): GoalEvaluator {
  return {
    evaluate: async () => {
      throw new Error('synthetic evaluator must not run')
    }
  }
}

function unreachableExecutor(): GovernedStepExecutor {
  return {
    execute: async () => {
      throw new Error('synthetic executor must not run')
    }
  }
}

describe('orchestration branch-b coverage', () => {
  it('rejects a plan step input that is not canonical JSON', () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular
    const drafts = [step('nc1', [], 'nc1', { input: circular })]
    expect(() =>
      validatePlanGraph(
        { id: 'plan_nc', goalId: 'goal_nc', tenantId: TENANT, version: 1 },
        drafts
      )
    ).toThrow(/canonical JSON values/)
  })

  it('keeps an uncloneable planner context by reference instead of failing', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const hook = () => 'synthetic'
    const goal = await store.createGoal(goalInput({ plannerContext: { hook } }))
    expect((goal.plannerContext as { hook: unknown }).hook).toBe(hook)
  })

  it('rejects goal reuse when the incoming planner context is an array', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const existing = await store.createGoal(
      goalInput({ inboundMessageId: 'msg_branch_b3' })
    )
    expect(() =>
      assertGoalReuseCompatibility(
        existing,
        goalInput({ inboundMessageId: 'msg_branch_b3', plannerContext: [] })
      )
    ).toThrow(/incompatible Goal/)
  })

  it('rejects goal reuse on planner lineage drift', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const existing = await store.createGoal(
      goalInput({
        inboundMessageId: 'msg_branch_b4',
        plannerContext: { messageId: 'msg_branch_b4' }
      })
    )
    expect(() =>
      assertGoalReuseCompatibility(
        existing,
        goalInput({
          inboundMessageId: 'msg_branch_b4',
          plannerContext: { messageId: 'msg_other' }
        })
      )
    ).toThrow(/incompatible Goal/)
    expect(() =>
      assertGoalReuseCompatibility(
        existing,
        goalInput({
          inboundMessageId: 'msg_branch_b4',
          plannerContext: {
            messageId: 'msg_branch_b4',
            sessionId: 42 as unknown as string
          }
        })
      )
    ).toThrow(/incompatible Goal/)
    expect(() =>
      assertGoalReuseCompatibility(
        existing,
        goalInput({
          inboundMessageId: 'msg_branch_b4',
          plannerContext: { traceId: 7 as unknown as string }
        })
      )
    ).toThrow(/incompatible Goal/)
  })

  it('reuses a goal when the object planner lineage matches', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const input = goalInput({
      inboundMessageId: 'msg_branch_b4d',
      plannerContext: {
        messageId: 'msg_branch_b4d',
        sessionId: 'sess_branch_b4',
        traceId: 'trace_branch_b4'
      }
    })
    const first = await store.getOrCreateGoal(input)
    const second = await store.getOrCreateGoal(input)
    expect(second.id).toBe(first.id)
  })

  it('fails closed when the stored planner context is not canonical', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const circular: Record<string, unknown> = {}
    circular.self = circular
    const existing = await store.createGoal(
      goalInput({
        inboundMessageId: 'msg_branch_b5',
        plannerContext: circular
      })
    )
    expect(() =>
      assertGoalReuseCompatibility(
        existing,
        goalInput({
          inboundMessageId: 'msg_branch_b5',
          plannerContext: circular
        })
      )
    ).toThrow(/incompatible Goal/)
  })

  it('resolves a goal by its inbound message once bound', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const created = await store.createGoal(
      goalInput({ inboundMessageId: 'msg_branch_b6' })
    )
    const found = await store.getGoalByInboundMessage(TENANT, 'msg_branch_b6')
    expect(found?.id).toBe(created.id)
    expect(
      await store.getGoalByInboundMessage(TENANT, 'msg_branch_b6_missing')
    ).toBeNull()
  })

  it('orders inbound message matches by recency', async () => {
    let tick = 0
    const store = new InMemoryGoalPlanStore({
      clock: () => new Date(NOW.getTime() + tick++ * 1_000)
    })
    const first = await store.createGoal(
      goalInput({
        inboundMessageId: 'msg_branch_b6dup',
        correlationId: 'corr_00000000-0000-4000-8000-000000000011'
      })
    )
    const second = await store.createGoal(
      goalInput({
        inboundMessageId: 'msg_branch_b6dup',
        correlationId: 'corr_00000000-0000-4000-8000-000000000012'
      })
    )
    expect(first.id).not.toBe(second.id)
    const found = await store.getGoalByInboundMessage(
      TENANT,
      'msg_branch_b6dup'
    )
    expect(found?.id).toBe(second.id)
  })

  it('counts a failed recovery run instead of executing an unfenced effect', async () => {
    class FailingConsumeStore extends InMemoryGoalPlanStore {
      override async consumeIteration(): Promise<Goal> {
        throw new OrchestrationError('conflict', 'synthetic version race')
      }
    }
    const store = new FailingConsumeStore({ clock: () => NOW })
    await store.createGoal(goalInput())
    const orchestrator = new GoalPlanOrchestrator({
      store,
      planner: unreachablePlanner(),
      evaluator: unreachableEvaluator(),
      executor: unreachableExecutor(),
      workerId: 'worker_branch_b8',
      clock: () => NOW
    })
    const result = await orchestrator.recoverGoals(TENANT)
    expect(result).toMatchObject({
      inspected: 1,
      resumed: 0,
      skipped: 0,
      completed: 0,
      failures: 1
    })
  })

  it('returns early when every step is leased and none can be claimed', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    let goal = await store.createGoal(goalInput())
    for (const target of ['PLANNING', 'GOVERNING', 'EXECUTING'] as const) {
      goal = await store.transitionGoal({
        tenantId: TENANT,
        goalId: goal.id,
        expectedVersion: goal.version,
        target,
        reason: 'synthetic setup'
      })
    }
    const drafts = [step('stuck1')]
    const fingerprint = validatePlanGraph(
      { id: 'plan_probe', goalId: goal.id, tenantId: TENANT, version: 1 },
      drafts
    ).fingerprint
    const activated = await store.activatePlan({
      tenantId: TENANT,
      goalId: goal.id,
      expectedGoalVersion: goal.version,
      planVersion: 1,
      parentPlanId: null,
      reason: 'synthetic setup',
      steps: drafts,
      consumeReplan: false,
      fingerprint
    })
    const steps = await store.listSteps(TENANT, activated.plan.id)
    expect(steps).toHaveLength(1)
    await store.claimStep({
      tenantId: TENANT,
      goalId: goal.id,
      planId: activated.plan.id,
      stepId: steps[0]!.id,
      workerId: 'worker_branch_b9_other',
      expectedGoalVersion: activated.goal.version,
      now: NOW,
      leaseMs: 30_000
    })
    let executed = 0
    const executor: GovernedStepExecutor = {
      execute: async () => {
        executed += 1
        return { outcome: 'succeeded', reason: 'synthetic must not run' }
      }
    }
    const orchestrator = new GoalPlanOrchestrator({
      store,
      planner: unreachablePlanner(),
      evaluator: unreachableEvaluator(),
      executor,
      workerId: 'worker_branch_b9',
      clock: () => NOW
    })
    const result = await orchestrator.run(TENANT, goal.id)
    expect(result.reason).toBe('goal_not_started')
    expect(result.executedStepIds).toEqual([])
    expect(executed).toBe(0)
  })

  it('runs with the default clock when none is configured', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    let goal = await store.createGoal(goalInput())
    for (const target of [
      'PLANNING',
      'GOVERNING',
      'EXECUTING',
      'OBSERVING_RESULT',
      'EVALUATING',
      'COMPLETED'
    ] as const) {
      goal = await store.transitionGoal({
        tenantId: TENANT,
        goalId: goal.id,
        expectedVersion: goal.version,
        target,
        reason: 'synthetic terminal setup'
      })
    }
    const orchestrator = new GoalPlanOrchestrator({
      store,
      planner: unreachablePlanner(),
      evaluator: unreachableEvaluator(),
      executor: unreachableExecutor(),
      workerId: 'worker_branch_b10'
    })
    const result = await orchestrator.run(TENANT, goal.id)
    expect(result.goal.status).toBe('COMPLETED')
    expect(result.reason).toBe('synthetic terminal setup')
  })

  it('renews the step lease while a slow executor runs', async () => {
    const store = new InMemoryGoalPlanStore()
    const created = await store.createGoal(goalInput())
    const planner: GoalPlanner = {
      plan: async () => ({
        reason: 'synthetic heartbeat plan',
        steps: [step('hb1', [], 'hb1', { timeoutMs: 5_000 })]
      })
    }
    const evaluator: GoalEvaluator = {
      evaluate: async () => ({
        result: 'satisfied',
        reason: 'synthetic satisfied',
        evidence: [
          {
            source: 'effect_journal',
            reference: 'synthetic',
            verified: true
          }
        ]
      })
    }
    const executor: GovernedStepExecutor = {
      execute: async () => {
        await new Promise((resolve) => setTimeout(resolve, 750))
        return { outcome: 'succeeded', reason: 'synthetic slow ok' }
      }
    }
    const orchestrator = new GoalPlanOrchestrator({
      store,
      planner,
      evaluator,
      executor,
      workerId: 'worker_branch_b11',
      leaseMs: 1_000
    })
    const result = await orchestrator.run(TENANT, created.id)
    expect(result.goal.status).toBe('COMPLETED')
    expect(result.executedStepIds).toEqual(['hb1'])
    const steps = await store.listSteps(TENANT, result.plan!.id)
    expect(steps).toHaveLength(1)
    expect(steps[0]!.version).toBeGreaterThan(3)
  }, 15_000)

  it('abandons the step when the lease heartbeat fails', async () => {
    class FailingHeartbeatStore extends InMemoryGoalPlanStore {
      override async heartbeatStep(): Promise<never> {
        throw new OrchestrationError('lease_lost', 'synthetic heartbeat loss')
      }
    }
    const store = new FailingHeartbeatStore()
    const created = await store.createGoal(goalInput())
    const planner: GoalPlanner = {
      plan: async () => ({
        reason: 'synthetic lease loss plan',
        steps: [step('hbloss', [], 'hbloss', { timeoutMs: 5_000 })]
      })
    }
    const orchestrator = new GoalPlanOrchestrator({
      store,
      planner,
      evaluator: unreachableEvaluator(),
      executor: {
        execute: async () => {
          await new Promise((resolve) => setTimeout(resolve, 400))
          return { outcome: 'succeeded', reason: 'synthetic late ok' }
        }
      },
      workerId: 'worker_branch_b12',
      leaseMs: 200
    })
    const result = await orchestrator.run(TENANT, created.id)
    expect(result.reason).toBe('step_lease_lost')
    expect(result.executedStepIds).toEqual(['hbloss'])
  }, 15_000)
})
