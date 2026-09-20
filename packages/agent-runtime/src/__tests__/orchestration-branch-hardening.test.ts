import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { InMemoryTelemetry } from '@cvg/observability'
import { canonicalizeJson } from '@cvg/shared'
import {
  assertPlanStepTransition,
  assertPlanTransition,
  evaluateSuccessCriteria,
  GoalPlanOrchestrator,
  InMemoryGoalPlanStore,
  isRunnableGoalStatus,
  isTerminalGoalStatus,
  materializePlanSteps,
  OrchestrationError,
  stepBudgetExhaustion,
  validatePlanGraph,
  type CreateGoalInput,
  type Goal,
  type GoalEvaluation,
  type GoalEvaluator,
  type GoalPlanOrchestratorOptions,
  type GoalPlanStore,
  type GoalPlanner,
  type GovernedStepExecutor,
  type OperationalEvidence,
  type Plan,
  type PlanStep,
  type PlanStepDraft,
  type StepExecutionResult,
  type SuccessCriterion
} from '../orchestration.ts'

const TENANT = 'tenant_00000000-0000-4000-8000-000000000001'
const OTHER_TENANT = 'tenant_00000000-0000-4000-8000-000000000002'
const CORRELATION = 'corr_00000000-0000-4000-8000-000000000001'
const OTHER_CORRELATION = 'corr_00000000-0000-4000-8000-000000000002'
const NOW = new Date('2026-09-15T12:00:00.000Z')

function digestOf(value: unknown): string {
  return createHash('sha256').update(canonicalizeJson(value)).digest('hex')
}

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

function modelStep(id: string): PlanStepDraft {
  return step(id, [], id, {
    intent: intent(id, {
      modelMessages: {
        messages: [{ role: 'user', content: `synthetic ${id}` }]
      }
    })
  })
}

function stateCriterion(expected: unknown = 'created'): SuccessCriterion {
  return {
    kind: 'STATE',
    resourceType: 'synthetic_appointment',
    resourceId: 'apt_1',
    field: 'status',
    expected,
    source: 'operational_state'
  }
}

function verifiedEvidence(reference: string): OperationalEvidence[] {
  return [
    {
      source: 'operational_state',
      reference,
      verified: true,
      key: 'synthetic.exists'
    }
  ]
}

function goalInput(overrides: Partial<CreateGoalInput> = {}): CreateGoalInput {
  return {
    tenantId: TENANT,
    objective: 'Synthetic branch-hardening goal',
    successCriteria: [stateCriterion()],
    correlationId: CORRELATION,
    ...overrides
  }
}

async function activate(
  store: InMemoryGoalPlanStore,
  goal: Goal,
  drafts: PlanStepDraft[],
  planVersion = 1,
  fingerprintOverride?: string
): Promise<{ goal: Goal; plan: Plan; steps: PlanStep[] }> {
  const graph = validatePlanGraph(
    {
      id: 'plan_draft',
      goalId: goal.id,
      tenantId: TENANT,
      version: planVersion
    },
    drafts
  )
  return store.activatePlan({
    tenantId: TENANT,
    goalId: goal.id,
    expectedGoalVersion: goal.version,
    planVersion,
    parentPlanId: null,
    reason: 'synthetic initial plan',
    steps: drafts,
    consumeReplan: false,
    fingerprint: fingerprintOverride ?? graph.fingerprint
  })
}

async function advanceGoal(
  store: InMemoryGoalPlanStore,
  goal: Goal,
  targets: Goal['status'][]
): Promise<Goal> {
  let current = goal
  for (const target of targets) {
    current = await store.transitionGoal({
      tenantId: current.tenantId,
      goalId: current.id,
      expectedVersion: current.version,
      target,
      reason: `synthetic:${target}`
    })
  }
  return current
}

async function claim(
  store: InMemoryGoalPlanStore,
  goal: Goal,
  plan: Plan,
  stepId: string,
  workerId = 'synthetic-worker',
  now = NOW,
  leaseMs = 1_000
) {
  return store.claimStep({
    tenantId: TENANT,
    goalId: goal.id,
    planId: plan.id,
    stepId,
    workerId,
    expectedGoalVersion: goal.version,
    now,
    leaseMs
  })
}

async function settle(
  store: InMemoryGoalPlanStore,
  lease: NonNullable<
    Awaited<ReturnType<InMemoryGoalPlanStore['claimStep']>>
  >['lease'],
  outcome: StepExecutionResult['outcome'],
  options: {
    reason?: string
    now?: Date
    approvalId?: string | null
    resultDigest?: string | null
    modelCalls?: number
    toolCalls?: number
    costUsd?: number
  } = {}
) {
  return store.settleStep({
    lease,
    outcome,
    resultDigest: options.resultDigest ?? null,
    reason: options.reason ?? `synthetic:${outcome}`,
    approvalId: options.approvalId ?? null,
    now: options.now ?? NOW,
    modelCalls: options.modelCalls ?? 0,
    toolCalls: options.toolCalls ?? 0,
    costUsd: options.costUsd ?? 0
  })
}

async function setupWaitingApproval(store: InMemoryGoalPlanStore) {
  const goal = await store.createGoal(goalInput())
  const activated = await activate(store, goal, [step('approval-step')])
  const governing = await advanceGoal(store, activated.goal, [
    'UNDERSTANDING',
    'PLANNING',
    'GOVERNING'
  ])
  const claimed = await claim(store, governing, activated.plan, 'approval-step')
  const waiting = await settle(store, claimed!.lease, 'approval_required', {
    reason: 'synthetic approval required',
    approvalId: 'approval_1'
  })
  return { plan: activated.plan, waiting }
}

const defaultPlanner: GoalPlanner = {
  async plan() {
    return { reason: 'synthetic plan', steps: [step('p1')] }
  }
}

const successEvaluator: GoalEvaluator = {
  async evaluate(input) {
    const complete = input.steps.every(
      (candidate) => candidate.status === 'SUCCEEDED'
    )
    return complete
      ? {
          result: 'satisfied',
          reason: 'synthetic state verified',
          evidence: verifiedEvidence('synthetic:state')
        }
      : {
          result: 'not_satisfied',
          reason: 'synthetic steps remaining',
          evidence: []
        }
  }
}

const succeedingExecutor: GovernedStepExecutor = {
  async execute(input) {
    return {
      outcome: 'succeeded',
      reason: `executed:${input.step.id}`,
      resultDigest: `digest:${input.step.id}`,
      evidence: verifiedEvidence(`step:${input.step.id}`),
      modelCalls: 0,
      toolCalls: 1,
      costUsd: 0.01
    }
  }
}

interface OrchestratorParts {
  workerId?: string
  clock?: () => Date
  leaseMs?: number
  maxIterations?: number
  planner?: GoalPlanner
  evaluator?: GoalEvaluator
  executor?: GovernedStepExecutor
  telemetry?: InMemoryTelemetry
  reconcileExpiredLease?: (step: PlanStep) => Promise<'retry' | 'uncertain'>
  reconcileWaitingApproval?: (goal: Goal) => Promise<'resolved' | 'pending'>
}

function buildOrchestrator(
  store: GoalPlanStore,
  parts: OrchestratorParts = {}
): GoalPlanOrchestrator {
  const options: GoalPlanOrchestratorOptions = {
    store,
    workerId: parts.workerId ?? 'synthetic-branch-worker',
    planner: parts.planner ?? defaultPlanner,
    evaluator: parts.evaluator ?? successEvaluator,
    executor: parts.executor ?? succeedingExecutor,
    clock: parts.clock ?? (() => NOW)
  }
  if (parts.leaseMs !== undefined) options.leaseMs = parts.leaseMs
  if (parts.maxIterations !== undefined)
    options.maxIterations = parts.maxIterations
  if (parts.telemetry !== undefined) options.telemetry = parts.telemetry
  if (parts.reconcileExpiredLease !== undefined) {
    options.reconcileExpiredLease = parts.reconcileExpiredLease
  }
  if (parts.reconcileWaitingApproval !== undefined) {
    options.reconcileWaitingApproval = parts.reconcileWaitingApproval
  }
  return new GoalPlanOrchestrator(options)
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('evaluateSuccessCriteria branch hardening', () => {
  it('matches EVENT criteria through the evidence key when eventType is absent', () => {
    const criteria: SuccessCriterion[] = [
      {
        kind: 'EVENT',
        eventType: 'schedule.read.executed',
        source: 'outbox',
        correlationId: CORRELATION
      }
    ]
    expect(
      evaluateSuccessCriteria(criteria, [
        {
          source: 'outbox',
          reference: 'outbox_key_only',
          verified: true,
          key: 'schedule.read.executed',
          correlationId: CORRELATION
        }
      ])
    ).toEqual({ satisfied: true, unsatisfied: 0 })
    expect(
      evaluateSuccessCriteria(criteria, [
        {
          source: 'outbox',
          reference: 'outbox_wrong_correlation',
          verified: true,
          key: 'schedule.read.executed',
          correlationId: OTHER_CORRELATION
        }
      ])
    ).toEqual({ satisfied: false, unsatisfied: 1 })
  })

  it('matches SEMANTIC criteria only when every required evidence key is verified', () => {
    const criteria: SuccessCriterion[] = [
      {
        kind: 'SEMANTIC',
        description: 'synthetic semantic completion',
        requiredEvidenceKeys: ['appointment.exists', 'schedule.checked'],
        source: 'operational_state'
      }
    ]
    expect(
      evaluateSuccessCriteria(criteria, [
        {
          source: 'operational_state',
          reference: 'a',
          verified: true,
          key: 'appointment.exists'
        },
        {
          source: 'operational_state',
          reference: 'b',
          verified: true,
          key: 'schedule.checked'
        }
      ])
    ).toEqual({ satisfied: true, unsatisfied: 0 })
    expect(
      evaluateSuccessCriteria(criteria, [
        {
          source: 'operational_state',
          reference: 'a',
          verified: true,
          key: 'appointment.exists'
        }
      ])
    ).toEqual({ satisfied: false, unsatisfied: 1 })
  })

  it('matches FACT criteria by source, key and canonical expected-value digest', () => {
    const criteria: SuccessCriterion[] = [
      {
        kind: 'FACT',
        key: 'appointment.exists',
        expected: { created: true },
        source: 'operational_state'
      }
    ]
    expect(
      evaluateSuccessCriteria(criteria, [
        {
          source: 'operational_state',
          reference: 'fact_evidence',
          verified: true,
          key: 'appointment.exists',
          digest: digestOf({ created: true })
        }
      ])
    ).toEqual({ satisfied: true, unsatisfied: 0 })
    expect(
      evaluateSuccessCriteria(criteria, [
        {
          source: 'operational_state',
          reference: 'fact_evidence',
          verified: true,
          key: 'appointment.exists',
          digest: digestOf({ created: false })
        }
      ])
    ).toEqual({ satisfied: false, unsatisfied: 1 })
  })

  it('matches STATE criteria with and without a concrete resource id', () => {
    const withResource: SuccessCriterion[] = [stateCriterion('created')]
    const keyed = 'synthetic_appointment:apt_1:status'
    expect(
      evaluateSuccessCriteria(withResource, [
        {
          source: 'operational_state',
          reference: 'state_evidence',
          verified: true,
          key: keyed,
          digest: digestOf('created')
        }
      ])
    ).toEqual({ satisfied: true, unsatisfied: 0 })

    const wildcard: SuccessCriterion[] = [
      {
        kind: 'STATE',
        resourceType: 'synthetic_appointment',
        field: 'status',
        expected: 'created',
        source: 'operational_state'
      }
    ]
    expect(
      evaluateSuccessCriteria(wildcard, [
        {
          source: 'operational_state',
          reference: 'state_wildcard',
          verified: true,
          key: 'synthetic_appointment:*:status',
          digest: digestOf('created')
        }
      ])
    ).toEqual({ satisfied: true, unsatisfied: 0 })
  })

  it('evaluates COMPOSITE criteria with all and any operators', () => {
    const fact: SuccessCriterion = {
      kind: 'FACT',
      key: 'appointment.exists',
      expected: 'created',
      source: 'operational_state'
    }
    const event: SuccessCriterion = {
      kind: 'EVENT',
      eventType: 'schedule.read.executed',
      source: 'outbox'
    }
    const factEvidence: OperationalEvidence = {
      source: 'operational_state',
      reference: 'fact',
      verified: true,
      key: 'appointment.exists',
      digest: digestOf('created')
    }
    const eventEvidence: OperationalEvidence = {
      source: 'outbox',
      reference: 'event',
      verified: true,
      key: 'schedule.read.executed'
    }
    expect(
      evaluateSuccessCriteria(
        [{ kind: 'COMPOSITE', operator: 'all', criteria: [fact, event] }],
        [factEvidence, eventEvidence]
      )
    ).toEqual({ satisfied: true, unsatisfied: 0 })
    expect(
      evaluateSuccessCriteria(
        [{ kind: 'COMPOSITE', operator: 'all', criteria: [fact, event] }],
        [factEvidence]
      )
    ).toEqual({ satisfied: false, unsatisfied: 1 })
    expect(
      evaluateSuccessCriteria(
        [{ kind: 'COMPOSITE', operator: 'any', criteria: [fact, event] }],
        [eventEvidence]
      )
    ).toEqual({ satisfied: true, unsatisfied: 0 })
    expect(
      evaluateSuccessCriteria(
        [{ kind: 'COMPOSITE', operator: 'any', criteria: [fact, event] }],
        []
      )
    ).toEqual({ satisfied: false, unsatisfied: 1 })
  })
})

describe('plan graph validation branch hardening', () => {
  it('rejects non-positive and non-integer plan versions', () => {
    const drafts = [step('a')]
    expect(() =>
      validatePlanGraph(
        { id: 'plan_1', goalId: 'goal_1', tenantId: TENANT, version: 0 },
        drafts
      )
    ).toThrow(/version must be positive/)
    expect(() =>
      validatePlanGraph(
        { id: 'plan_1', goalId: 'goal_1', tenantId: TENANT, version: 1.5 },
        drafts
      )
    ).toThrow(/version must be positive/)
  })

  it('rejects an empty plan and oversized dependency lists', () => {
    expect(() =>
      validatePlanGraph(
        { id: 'plan_1', goalId: 'goal_1', tenantId: TENANT, version: 1 },
        []
      )
    ).toThrow(/between one and one thousand/)
    const tooMany = Array.from({ length: 65 }, (_, index) => `dep_${index}`)
    expect(() =>
      validatePlanGraph(
        { id: 'plan_1', goalId: 'goal_1', tenantId: TENANT, version: 1 },
        [step('a', tooMany)]
      )
    ).toThrow(/too many dependencies/)
  })

  it('rejects self dependencies, missing capabilities and invalid step timeouts', () => {
    const plan = {
      id: 'plan_1',
      goalId: 'goal_1',
      tenantId: TENANT,
      version: 1
    }
    expect(() => validatePlanGraph(plan, [step('self', ['self'])])).toThrow(
      /cannot depend on itself/
    )
    expect(() =>
      validatePlanGraph(plan, [
        step('empty', [], 'empty', { requiredCapabilities: [] })
      ])
    ).toThrow(/at least one capability/)
    expect(() =>
      validatePlanGraph(plan, [step('fast', [], 'fast', { timeoutMs: 50 })])
    ).toThrow(/timeout must be at least 100ms/)
    expect(() =>
      validatePlanGraph(plan, [
        step('fractional', [], 'fractional', { timeoutMs: 100.5 })
      ])
    ).toThrow(/timeout must be at least 100ms/)
  })

  it('rejects an intent capability that is not declared or not covered by risk', () => {
    const plan = {
      id: 'plan_1',
      goalId: 'goal_1',
      tenantId: TENANT,
      version: 1
    }
    expect(() =>
      validatePlanGraph(plan, [
        step('undeclared', [], 'undeclared', {
          intent: intent('undeclared', { capability: 'appointment.cancel' })
        })
      ])
    ).toThrow(/not declared in requiredCapabilities/)
    expect(() =>
      validatePlanGraph(plan, [
        step('underpowered', [], 'underpowered', { riskLevel: 'READ_ONLY' })
      ])
    ).toThrow(/cannot cover capability/)
  })

  it('accepts minimal drafts without optional values and still fingerprints them', () => {
    const minimal: PlanStepDraft = {
      type: 'synthetic_minimal',
      description: 'minimal draft',
      requiredCapabilities: ['appointment.create'],
      riskLevel: 'MEDIUM_RISK_WRITE',
      approvalRequirement: 'none',
      intent: intent('minimal')
    }
    const graph = validatePlanGraph(
      {
        id: 'plan_minimal',
        goalId: 'goal_minimal',
        tenantId: TENANT,
        version: 1
      },
      [minimal]
    )
    expect(graph.topologicalOrder).toEqual(['step-0'])
    expect(graph.fingerprint).toMatch(/^[0-9a-f]{64}$/)
  })

  it('keeps structural fingerprints stable across generated identifiers', () => {
    const plan = {
      id: 'plan_1',
      goalId: 'goal_1',
      tenantId: TENANT,
      version: 1
    }
    const base: PlanStepDraft = {
      type: 'synthetic',
      description: 'generated',
      requiredCapabilities: ['appointment.create'],
      riskLevel: 'MEDIUM_RISK_WRITE',
      approvalRequirement: 'none',
      intent: intent('generated')
    }
    const generated = validatePlanGraph(plan, [base])
    const explicit = validatePlanGraph(plan, [{ ...base, id: 'explicit-id' }])
    expect(generated.fingerprint).toBe(explicit.fingerprint)
  })
})

describe('plan and step transition guards', () => {
  it('treats same-status plan and step transitions as no-ops and rejects invalid ones', () => {
    expect(() => assertPlanTransition('ACTIVE', 'ACTIVE')).not.toThrow()
    expect(() => assertPlanTransition('ACTIVE', 'DRAFT')).toThrow(
      /cannot transition/
    )
    expect(() => assertPlanStepTransition('READY', 'READY')).not.toThrow()
  })
})

describe('InMemoryGoalPlanStore branch hardening', () => {
  it('rejects invalid objectives and inbound message identifiers', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    await expect(
      store.createGoal(goalInput({ objective: '   ' }))
    ).rejects.toMatchObject({
      code: 'invalid_plan'
    })
    await expect(
      store.createGoal(goalInput({ objective: 'x'.repeat(8_001) }))
    ).rejects.toMatchObject({ code: 'invalid_plan' })
    await expect(
      store.createGoal(goalInput({ inboundMessageId: '   ' }))
    ).rejects.toMatchObject({ code: 'invalid_plan' })
    await expect(
      store.createGoal(goalInput({ inboundMessageId: 'x'.repeat(201) }))
    ).rejects.toMatchObject({ code: 'invalid_plan' })
  })

  it('persists explicit runtime binding fields in the execution snapshot', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const bound = await store.createGoal(
      goalInput({
        executionSnapshot: {
          runtimeMode: 'kernel',
          runtimeVersion: 'runtime-v1'
        }
      })
    )
    expect(bound.executionSnapshot.runtimeMode).toBe('kernel')
    expect(bound.executionSnapshot.runtimeVersion).toBe('runtime-v1')
    const bare = await store.createGoal(goalInput())
    expect(bare.executionSnapshot.runtimeMode).toBeUndefined()
    expect(bare.executionSnapshot.runtimeVersion).toBeUndefined()
  })

  it('delegates getOrCreateGoal without an inbound message and validates provided ones', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const first = await store.getOrCreateGoal(goalInput())
    const second = await store.getOrCreateGoal(goalInput())
    expect(first.id).not.toBe(second.id)
    await expect(
      store.getOrCreateGoal(goalInput({ inboundMessageId: 'x'.repeat(201) }))
    ).rejects.toMatchObject({ code: 'invalid_plan' })
  })

  it('reuses a Goal whose planner context carries a non-string message id', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const inboundMessageId = 'msg_synthetic_non_string_context'
    const created = await store.createGoal(
      goalInput({ inboundMessageId, plannerContext: { messageId: 42 } })
    )
    const reused = await store.getOrCreateGoal(goalInput({ inboundMessageId }))
    expect(reused.id).toBe(created.id)
  })

  it('reuses a Goal that has no planner context for the same inbound message', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const inboundMessageId = 'msg_synthetic_no_planner_context'
    const created = await store.createGoal(goalInput({ inboundMessageId }))
    const reused = await store.getOrCreateGoal(goalInput({ inboundMessageId }))
    expect(reused.id).toBe(created.id)
    expect(reused.plannerContext).toBeUndefined()
  })

  it('falls back to the system clock when no clock is injected', async () => {
    const store = new InMemoryGoalPlanStore()
    const before = Date.now()
    const goal = await store.createGoal(goalInput())
    expect(goal.createdAt).toBeInstanceOf(Date)
    expect(goal.createdAt.getTime()).toBeGreaterThanOrEqual(before)
    expect(goal.updatedAt.getTime()).toBeGreaterThanOrEqual(before)
  })

  it('resolves goals by correlation with tenant filtering and recency ordering', async () => {
    let now = new Date(NOW)
    const store = new InMemoryGoalPlanStore({ clock: () => now })
    const older = await store.createGoal(goalInput())
    now = new Date(NOW.getTime() + 1_000)
    const newer = await store.createGoal(goalInput())
    await store.createGoal(goalInput({ tenantId: OTHER_TENANT }))
    const resolved = await store.getGoalByCorrelation(TENANT, CORRELATION)
    expect(resolved?.id).toBe(newer.id)
    expect(resolved?.id).not.toBe(older.id)
    expect(
      await store.getGoalByCorrelation(TENANT, OTHER_CORRELATION)
    ).toBeNull()
    expect(
      await store.getGoalByCorrelation(OTHER_TENANT, CORRELATION)
    ).not.toBeNull()
  })

  it('rejects invalid inbound ids and returns null for an unknown inbound message', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    await expect(
      store.getGoalByInboundMessage(TENANT, '   ')
    ).rejects.toMatchObject({ code: 'invalid_plan' })
    await expect(
      store.getGoalByInboundMessage(TENANT, 'x'.repeat(201))
    ).rejects.toMatchObject({ code: 'invalid_plan' })
    expect(
      await store.getGoalByInboundMessage(TENANT, 'msg_missing')
    ).toBeNull()
  })

  it('lists goals with status filters, pagination and deterministic equal-timestamp ordering', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const first = await store.createGoal(goalInput())
    const second = await store.createGoal(
      goalInput({ correlationId: OTHER_CORRELATION })
    )
    await expect(store.listGoals(TENANT, { limit: 0 })).rejects.toMatchObject({
      code: 'invalid_plan'
    })
    await expect(store.listGoals(TENANT, { limit: 101 })).rejects.toMatchObject(
      {
        code: 'invalid_plan'
      }
    )
    await expect(store.listGoals(TENANT, { limit: 1.5 })).rejects.toMatchObject(
      {
        code: 'invalid_plan'
      }
    )
    await expect(store.listGoals(TENANT, { offset: -1 })).rejects.toMatchObject(
      {
        code: 'invalid_plan'
      }
    )
    await expect(
      store.listGoals(TENANT, { offset: 0.5 })
    ).rejects.toMatchObject({
      code: 'invalid_plan'
    })
    const all = await store.listGoals(TENANT)
    expect(all.map((goal) => goal.id)).toEqual(
      [first.id, second.id].sort((left, right) => left.localeCompare(right))
    )
    const filtered = await store.listGoals(TENANT, {
      statuses: ['OBSERVING'],
      limit: 1
    })
    expect(filtered).toHaveLength(1)
    const empty = await store.listGoals(TENANT, { statuses: ['COMPLETED'] })
    expect(empty).toEqual([])
  })

  it('requires a tenant for runnable recovery and sorts the results', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    await expect(store.listRunnableGoals()).rejects.toMatchObject({
      code: 'tenant_violation'
    })
    const first = await store.createGoal(goalInput())
    const second = await store.createGoal(
      goalInput({ correlationId: OTHER_CORRELATION })
    )
    const runnable = await store.listRunnableGoals(TENANT)
    expect(runnable.map((goal) => goal.id)).toEqual(
      [first.id, second.id].sort((left, right) => left.localeCompare(right))
    )
    expect(isRunnableGoalStatus(runnable[0]!.status)).toBe(true)
  })

  it('reports not_found and version conflicts for goal and iteration mutations', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    await expect(
      store.transitionGoal({
        tenantId: TENANT,
        goalId: 'goal_missing',
        expectedVersion: 1,
        target: 'UNDERSTANDING',
        reason: 'synthetic'
      })
    ).rejects.toMatchObject({ code: 'not_found' })
    const goal = await store.createGoal(goalInput())
    await expect(
      store.transitionGoal({
        tenantId: TENANT,
        goalId: goal.id,
        expectedVersion: goal.version + 1,
        target: 'UNDERSTANDING',
        reason: 'synthetic'
      })
    ).rejects.toMatchObject({ code: 'conflict' })
    await expect(
      store.consumeIteration({
        tenantId: TENANT,
        goalId: 'goal_missing',
        expectedVersion: 1,
        now: NOW
      })
    ).rejects.toMatchObject({ code: 'not_found' })
    await expect(
      store.consumeIteration({
        tenantId: TENANT,
        goalId: goal.id,
        expectedVersion: goal.version + 1,
        now: NOW
      })
    ).rejects.toMatchObject({ code: 'conflict' })
  })

  it('records an explicit transition error when the caller supplies lastError', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const goal = await store.createGoal(goalInput())
    const transitioned = await store.transitionGoal({
      tenantId: TENANT,
      goalId: goal.id,
      expectedVersion: goal.version,
      target: 'HUMAN_HANDOFF',
      reason: 'synthetic handoff',
      lastError: 'synthetic explicit error'
    })
    expect(transitioned.lastError).toBe('synthetic explicit error')
  })

  it('rejects activation for unknown goals, stale versions and exhausted replan budgets', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const base = {
      tenantId: TENANT,
      expectedGoalVersion: 1,
      planVersion: 1,
      parentPlanId: null,
      reason: 'synthetic',
      steps: [step('a')],
      consumeReplan: false,
      fingerprint: 'fingerprint'
    }
    await expect(
      store.activatePlan({ ...base, goalId: 'goal_missing' })
    ).rejects.toMatchObject({ code: 'not_found' })
    const goal = await store.createGoal(
      goalInput({ budget: { maxReplans: 0 } })
    )
    await expect(
      store.activatePlan({
        ...base,
        goalId: goal.id,
        expectedGoalVersion: goal.version + 1
      })
    ).rejects.toMatchObject({ code: 'conflict' })
    await expect(
      store.activatePlan({
        ...base,
        goalId: goal.id,
        expectedGoalVersion: goal.version,
        consumeReplan: true
      })
    ).rejects.toMatchObject({ code: 'budget_exhausted' })
  })

  it('requires replans to bind parent and triggering evaluation coherently', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const goal = await store.createGoal(goalInput())
    const graph = validatePlanGraph(
      { id: 'plan_draft', goalId: goal.id, tenantId: TENANT, version: 2 },
      [step('a')]
    )
    const base = {
      tenantId: TENANT,
      goalId: goal.id,
      expectedGoalVersion: goal.version,
      planVersion: 2,
      reason: 'synthetic replan',
      steps: [step('a')],
      consumeReplan: true,
      fingerprint: graph.fingerprint
    }
    await expect(
      store.activatePlan({
        ...base,
        parentPlanId: null,
        triggeringEvaluationId: 'eval_x'
      })
    ).rejects.toMatchObject({ code: 'invalid_plan' })
    await expect(
      store.activatePlan({
        ...base,
        parentPlanId: 'plan_ghost',
        triggeringEvaluationId: 'eval_ghost'
      })
    ).rejects.toMatchObject({ code: 'invalid_plan' })
  })

  it('rejects a parent plan whose version is not older and mismatched fingerprints', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const goal = await store.createGoal(goalInput())
    const activated = await activate(store, goal, [step('a')])
    const evaluation = await store.recordEvaluation({
      tenantId: TENANT,
      goalId: goal.id,
      planId: activated.plan.id,
      stepId: null,
      evaluatorType: 'synthetic',
      criteria: goal.successCriteria,
      evidence: [],
      result: 'not_satisfied',
      reason: 'synthetic'
    })
    const graph = validatePlanGraph(
      { id: 'plan_draft', goalId: goal.id, tenantId: TENANT, version: 1 },
      [step('a')]
    )
    await expect(
      store.activatePlan({
        tenantId: TENANT,
        goalId: goal.id,
        expectedGoalVersion: activated.goal.version,
        planVersion: 1,
        parentPlanId: activated.plan.id,
        reason: 'synthetic replan',
        steps: [step('a')],
        consumeReplan: true,
        fingerprint: graph.fingerprint,
        triggeringEvaluationId: evaluation.id
      })
    ).rejects.toMatchObject({ code: 'invalid_plan' })
    await expect(
      store.activatePlan({
        tenantId: TENANT,
        goalId: goal.id,
        expectedGoalVersion: activated.goal.version,
        planVersion: 2,
        parentPlanId: null,
        reason: 'synthetic plan',
        steps: [step('a')],
        consumeReplan: false,
        fingerprint: 'not-the-graph-fingerprint'
      })
    ).rejects.toMatchObject({ code: 'invalid_plan' })
  })

  it('supersedes the active plan and keeps replan fingerprints unique', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const goal = await store.createGoal(goalInput())
    const first = await activate(store, goal, [step('a')])
    const second = await activate(store, first.goal, [step('a')], 2)
    const plans = await store.listPlans(TENANT, goal.id)
    expect(plans.map((plan) => plan.status)).toEqual(['SUPERSEDED', 'ACTIVE'])
    expect(second.goal.replanFingerprints).toHaveLength(1)
    expect(second.goal.activePlanId).toBe(second.plan.id)
    expect(await store.getPlan(TENANT, 'plan_missing')).toBeNull()
    expect(await store.getStep(TENANT, 'step_missing')).toBeNull()
    expect((await store.getStep(TENANT, 'a'))?.id).toBe('a')
  })

  it('reports not_found when transitioning an unknown plan', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    await expect(
      store.transitionPlan({
        tenantId: TENANT,
        planId: 'plan_missing',
        target: 'COMPLETED',
        reason: 'synthetic'
      })
    ).rejects.toMatchObject({ code: 'not_found' })
  })

  it('resolves a waiting approval into cancellation and rejects mismatched approvals', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const { plan, waiting } = await setupWaitingApproval(store)
    await expect(
      store.resolveWaitingApproval({
        tenantId: TENANT,
        goalId: waiting.goal.id,
        planId: plan.id,
        stepId: waiting.step.id,
        expectedGoalVersion: waiting.goal.version,
        expectedStepVersion: waiting.step.version,
        approvalId: 'approval_wrong',
        target: 'CANCELLED',
        reason: 'synthetic wrong approval',
        now: NOW
      })
    ).rejects.toMatchObject({ code: 'conflict' })
    const cancelled = await store.resolveWaitingApproval({
      tenantId: TENANT,
      goalId: waiting.goal.id,
      planId: plan.id,
      stepId: waiting.step.id,
      expectedGoalVersion: waiting.goal.version,
      expectedStepVersion: waiting.step.version,
      approvalId: 'approval_1',
      target: 'CANCELLED',
      reason: 'synthetic approval rejected',
      now: NOW
    })
    expect(cancelled.goal.status).toBe('CANCELLED')
    expect(cancelled.step.status).toBe('CANCELLED')
    expect(cancelled.goal.lastError).toBe('synthetic approval rejected')
    expect(cancelled.step.completedAt).not.toBeNull()
  })

  it('reports not_found when resolving an approval for unknown records', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    await expect(
      store.resolveWaitingApproval({
        tenantId: TENANT,
        goalId: 'goal_missing',
        planId: 'plan_missing',
        stepId: 'step_missing',
        expectedGoalVersion: 1,
        expectedStepVersion: 1,
        approvalId: 'approval_1',
        target: 'READY',
        reason: 'synthetic',
        now: NOW
      })
    ).rejects.toMatchObject({ code: 'not_found' })
  })

  it('fences claims by identity, version, dependency, lease and plan activation', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const goal = await store.createGoal(goalInput())
    const activated = await activate(store, goal, [step('a'), step('b', ['a'])])
    await expect(
      store.claimStep({
        tenantId: TENANT,
        goalId: 'goal_missing',
        planId: activated.plan.id,
        stepId: 'a',
        workerId: 'w',
        expectedGoalVersion: activated.goal.version,
        now: NOW,
        leaseMs: 1_000
      })
    ).rejects.toMatchObject({ code: 'not_found' })
    await expect(
      store.claimStep({
        tenantId: TENANT,
        goalId: goal.id,
        planId: activated.plan.id,
        stepId: 'a',
        workerId: 'w',
        expectedGoalVersion: activated.goal.version + 1,
        now: NOW,
        leaseMs: 1_000
      })
    ).rejects.toMatchObject({ code: 'conflict' })
    expect(await claim(store, activated.goal, activated.plan, 'b')).toBeNull()
    const claimed = await claim(
      store,
      activated.goal,
      activated.plan,
      'a',
      'w-a'
    )
    expect(claimed).not.toBeNull()
    expect(
      await claim(store, claimed!.goal, activated.plan, 'a', 'w-b')
    ).toBeNull()
    const settled = await settle(store, claimed!.lease, 'succeeded')
    expect(
      await claim(store, settled.goal, activated.plan, 'a', 'w-c')
    ).toBeNull()
  })

  it('returns null when the requested plan is no longer the active plan', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const goal = await store.createGoal(goalInput())
    const first = await activate(store, goal, [step('old-step')])
    const second = await activate(store, first.goal, [step('new-step')], 2)
    expect(
      await claim(store, second.goal, first.plan, 'old-step', 'w-old')
    ).toBeNull()
  })

  it('rejects cross-goal step claims with a tenant violation', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const firstGoal = await store.createGoal(goalInput())
    const first = await activate(store, firstGoal, [step('first-step')])
    const secondGoal = await store.createGoal(
      goalInput({ correlationId: OTHER_CORRELATION })
    )
    const second = await activate(store, secondGoal, [step('second-step')])
    await expect(
      claim(store, first.goal, first.plan, 'second-step', 'w-cross')
    ).rejects.toMatchObject({ code: 'tenant_violation' })
    expect(second.plan.goalId).toBe(secondGoal.id)
  })

  it('exhausts deadline, step, model, tool and cost budgets before claiming', async () => {
    const expiredStore = new InMemoryGoalPlanStore({ clock: () => NOW })
    const expiredGoal = await expiredStore.createGoal(
      goalInput({ budget: { maxDurationMs: 100 } })
    )
    const expired = await activate(expiredStore, expiredGoal, [
      step('expired-step')
    ])
    await expect(
      claim(
        expiredStore,
        expired.goal,
        expired.plan,
        'expired-step',
        'w',
        new Date(NOW.getTime() + 101)
      )
    ).rejects.toMatchObject({ code: 'budget_exhausted' })

    const stepStore = new InMemoryGoalPlanStore({ clock: () => NOW })
    const stepGoal = await stepStore.createGoal(
      goalInput({ budget: { maxSteps: 1 } })
    )
    const firstPlan = await activate(stepStore, stepGoal, [
      step('s1'),
      step('s2')
    ])
    const firstClaim = await claim(
      stepStore,
      firstPlan.goal,
      firstPlan.plan,
      's1'
    )
    const firstSettled = await settle(stepStore, firstClaim!.lease, 'succeeded')
    await expect(
      claim(stepStore, firstSettled.goal, firstPlan.plan, 's2')
    ).rejects.toMatchObject({ code: 'budget_exhausted' })

    const toolStore = new InMemoryGoalPlanStore({ clock: () => NOW })
    const toolGoal = await toolStore.createGoal(
      goalInput({ budget: { maxToolCalls: 0 } })
    )
    const toolPlan = await activate(toolStore, toolGoal, [step('tool-step')])
    await expect(
      claim(toolStore, toolPlan.goal, toolPlan.plan, 'tool-step')
    ).rejects.toMatchObject({ code: 'budget_exhausted' })

    const modelStore = new InMemoryGoalPlanStore({ clock: () => NOW })
    const modelGoal = await modelStore.createGoal(
      goalInput({ budget: { maxModelCalls: 0 } })
    )
    const modelPlan = await activate(modelStore, modelGoal, [
      modelStep('model-step')
    ])
    await expect(
      claim(modelStore, modelPlan.goal, modelPlan.plan, 'model-step')
    ).rejects.toMatchObject({ code: 'budget_exhausted' })
  })

  it('classifies step-level budget exhaustion for model, tool, cost and unrestricted steps', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const plan: Plan = {
      id: 'plan_budget',
      goalId: 'goal_budget',
      tenantId: TENANT,
      version: 1,
      parentPlanId: null,
      reason: 'synthetic',
      triggeringEvaluationId: null,
      status: 'ACTIVE',
      createdAt: NOW,
      updatedAt: NOW,
      fingerprint: 'fingerprint'
    }
    const drafts = [modelStep('model'), step('tool')]
    const [modelCandidate, toolCandidate] = materializePlanSteps(
      TENANT,
      'goal_budget',
      plan,
      drafts,
      NOW
    )
    const modelGoal = await store.createGoal(
      goalInput({ budget: { maxModelCalls: 0 } })
    )
    expect(stepBudgetExhaustion(modelGoal, modelCandidate!)).toBe('model_calls')
    const toolGoal = await store.createGoal(
      goalInput({ budget: { maxToolCalls: 0 } })
    )
    expect(stepBudgetExhaustion(toolGoal, toolCandidate!)).toBe('tool_calls')
    const costGoal = await store.createGoal(
      goalInput({
        budget: { maxModelCalls: 5, maxToolCalls: 5, maxCostUsd: 0 }
      })
    )
    expect(stepBudgetExhaustion(costGoal, toolCandidate!)).toBe('cost_usd')
    const openGoal = await store.createGoal(goalInput())
    expect(stepBudgetExhaustion(openGoal, toolCandidate!)).toBeNull()
  })

  it('fences heartbeat renewal by lease identity, status and expiry', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const goal = await store.createGoal(goalInput())
    const activated = await activate(store, goal, [step('hb')])
    const claimed = await claim(
      store,
      activated.goal,
      activated.plan,
      'hb',
      'w-hb',
      NOW,
      100
    )
    expect(
      await store.heartbeatStep({
        lease: { ...claimed!.lease, workerId: 'other-worker' },
        now: NOW,
        leaseMs: 100
      })
    ).toBeNull()
    expect(
      await store.heartbeatStep({
        lease: claimed!.lease,
        now: new Date(NOW.getTime() + 101),
        leaseMs: 100
      })
    ).toBeNull()
  })

  it('fences settlement accounting, lineage, goal version and step version', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const goal = await store.createGoal(goalInput())
    const activated = await activate(store, goal, [step('s')])
    const claimed = await claim(store, activated.goal, activated.plan, 's')

    await expect(
      settle(store, claimed!.lease, 'succeeded', { modelCalls: -1 })
    ).rejects.toMatchObject({ code: 'invalid_plan' })
    await expect(
      settle(store, claimed!.lease, 'succeeded', { costUsd: Number.NaN })
    ).rejects.toMatchObject({ code: 'invalid_plan' })

    await expect(
      store.settleStep({
        lease: { ...claimed!.lease, planId: 'plan_other' },
        outcome: 'succeeded',
        resultDigest: null,
        reason: 'synthetic lineage mismatch',
        approvalId: null,
        now: NOW,
        modelCalls: 0,
        toolCalls: 0,
        costUsd: 0
      })
    ).rejects.toMatchObject({ code: 'lease_lost' })

    const governing = await advanceGoal(store, claimed!.goal, [
      'UNDERSTANDING',
      'PLANNING',
      'GOVERNING'
    ])
    await expect(
      settle(store, claimed!.lease, 'succeeded', {
        reason: 'synthetic version race'
      })
    ).rejects.toMatchObject({ code: 'conflict' })
    expect(governing.status).toBe('GOVERNING')
  })

  it('reports not_found when settling missing goals or steps', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const goal = await store.createGoal(goalInput())
    const activated = await activate(store, goal, [step('s')])
    const claimed = await claim(store, activated.goal, activated.plan, 's')
    await expect(
      store.settleStep({
        lease: { ...claimed!.lease, stepId: 'step_missing' },
        outcome: 'succeeded',
        resultDigest: null,
        reason: 'synthetic',
        approvalId: null,
        now: NOW,
        modelCalls: 0,
        toolCalls: 0,
        costUsd: 0
      })
    ).rejects.toMatchObject({ code: 'not_found' })
  })

  it('maps every execution outcome to its step and goal status', async () => {
    const cases: Array<{
      outcome: StepExecutionResult['outcome']
      step: PlanStep['status']
      goal: Goal['status']
    }> = [
      {
        outcome: 'waiting_external',
        step: 'WAITING_EXTERNAL',
        goal: 'WAITING_EXTERNAL'
      },
      {
        outcome: 'human_handoff',
        step: 'HUMAN_HANDOFF',
        goal: 'HUMAN_HANDOFF'
      },
      { outcome: 'uncertain', step: 'UNCERTAIN', goal: 'UNCERTAIN' },
      { outcome: 'failed', step: 'FAILED', goal: 'EXECUTING' }
    ]
    for (const scenario of cases) {
      const store = new InMemoryGoalPlanStore({ clock: () => NOW })
      const goal = await store.createGoal(goalInput())
      const activated = await activate(store, goal, [step('o')])
      const executing = await advanceGoal(store, activated.goal, [
        'UNDERSTANDING',
        'PLANNING',
        'GOVERNING',
        'EXECUTING'
      ])
      const claimed = await claim(store, executing, activated.plan, 'o')
      const settled = await settle(store, claimed!.lease, scenario.outcome, {
        reason: `synthetic ${scenario.outcome}`
      })
      expect(settled.step.status).toBe(scenario.step)
      expect(settled.goal.status).toBe(scenario.goal)
    }
  })

  it('lists and recovers expired leases with fenced snapshots', async () => {
    let now = new Date(NOW)
    const store = new InMemoryGoalPlanStore({ clock: () => now })
    const goal = await store.createGoal(goalInput())
    const activated = await activate(store, goal, [step('l1'), step('l2')])
    const first = await claim(
      store,
      activated.goal,
      activated.plan,
      'l1',
      'w-a',
      now,
      100
    )
    const second = await claim(
      store,
      first!.goal,
      activated.plan,
      'l2',
      'w-b',
      now,
      100
    )
    expect(second).not.toBeNull()
    now = new Date(NOW.getTime() + 101)
    const expired = await store.listExpiredLeases(TENANT, now)
    expect(expired.map((candidate) => candidate.id)).toEqual(['l1', 'l2'])
    await expect(
      store.recoverExpiredLease({
        tenantId: TENANT,
        stepId: 'l1',
        leaseToken: first!.lease.leaseToken,
        stepVersion: first!.lease.stepVersion + 5,
        now,
        decision: 'retry',
        reason: 'synthetic stale snapshot'
      })
    ).resolves.toMatchObject({ step: { status: 'EXECUTING' } })
    const recovered = await store.recoverExpiredLease({
      tenantId: TENANT,
      stepId: 'l1',
      leaseToken: first!.lease.leaseToken,
      stepVersion: first!.lease.stepVersion,
      now,
      decision: 'retry',
      reason: 'synthetic lease expired safely'
    })
    expect(recovered.step.status).toBe('READY')
    expect(recovered.goal.status).toBe('OBSERVING')
    const attempts = await store.listAttempts(TENANT, 'l1')
    expect(attempts[0]?.outcome).toBe('lease_expired')
  })

  it('escalates an expired lease to UNCERTAIN when reconciliation is not safe', async () => {
    let now = new Date(NOW)
    const store = new InMemoryGoalPlanStore({ clock: () => now })
    const goal = await store.createGoal(goalInput())
    const activated = await activate(store, goal, [step('u1')])
    const executing = await advanceGoal(store, activated.goal, [
      'UNDERSTANDING',
      'PLANNING',
      'GOVERNING',
      'EXECUTING'
    ])
    const claimed = await claim(
      store,
      executing,
      activated.plan,
      'u1',
      'w-u',
      now,
      100
    )
    now = new Date(NOW.getTime() + 101)
    const recovered = await store.recoverExpiredLease({
      tenantId: TENANT,
      stepId: 'u1',
      leaseToken: claimed!.lease.leaseToken,
      stepVersion: claimed!.lease.stepVersion,
      now,
      decision: 'uncertain',
      reason: 'synthetic effect cannot be verified'
    })
    expect(recovered.step.status).toBe('UNCERTAIN')
    expect(recovered.goal.status).toBe('UNCERTAIN')
    expect(recovered.goal.lastError).toBe('synthetic effect cannot be verified')
  })

  it('reports not_found when recovering an unknown step', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    await expect(
      store.recoverExpiredLease({
        tenantId: TENANT,
        stepId: 'step_missing',
        leaseToken: null,
        stepVersion: 1,
        now: NOW,
        decision: 'retry',
        reason: 'synthetic'
      })
    ).rejects.toMatchObject({ code: 'not_found' })
  })

  it('records observations with lineage validation and explicit creation time', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const goal = await store.createGoal(goalInput())
    const activated = await activate(store, goal, [step('obs')])
    const record = await store.recordObservation({
      tenantId: TENANT,
      goalId: goal.id,
      planId: activated.plan.id,
      stepId: null,
      kind: 'external_state',
      resultDigest: null,
      evidence: []
    })
    expect(record.id).toMatch(/^observation_/)
    expect(record.createdAt).toEqual(NOW)
    const backdated = new Date('2026-01-01T00:00:00.000Z')
    const explicit = await store.recordObservation({
      tenantId: TENANT,
      goalId: goal.id,
      planId: activated.plan.id,
      stepId: 'obs',
      kind: 'step_result',
      resultDigest: 'digest',
      evidence: [],
      createdAt: backdated
    })
    expect(explicit.createdAt).toEqual(backdated)
    expect(await store.listObservations(TENANT, goal.id)).toHaveLength(2)
  })

  it('rejects observations whose goal, plan or step lineage does not match', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const firstGoal = await store.createGoal(goalInput())
    const first = await activate(store, firstGoal, [step('obs-a')])
    const secondGoal = await store.createGoal(
      goalInput({ correlationId: OTHER_CORRELATION })
    )
    const second = await activate(store, secondGoal, [step('obs-b')])
    const base = {
      tenantId: TENANT,
      goalId: firstGoal.id,
      planId: first.plan.id,
      stepId: null,
      kind: 'external_state' as const,
      resultDigest: null,
      evidence: []
    }
    await expect(
      store.recordObservation({ ...base, goalId: 'goal_missing' })
    ).rejects.toMatchObject({ code: 'conflict' })
    await expect(
      store.recordObservation({ ...base, planId: 'plan_missing' })
    ).rejects.toMatchObject({ code: 'conflict' })
    await expect(
      store.recordObservation({ ...base, planId: second.plan.id })
    ).rejects.toMatchObject({ code: 'conflict' })
    await expect(
      store.recordObservation({ ...base, stepId: 'step_missing' })
    ).rejects.toMatchObject({ code: 'conflict' })
    await expect(
      store.recordObservation({ ...base, stepId: 'obs-b' })
    ).rejects.toMatchObject({ code: 'conflict' })
    const crossPlan = await activate(store, first.goal, [step('obs-c')], 2)
    await expect(
      store.recordObservation({ ...base, stepId: 'obs-c' })
    ).rejects.toMatchObject({ code: 'conflict' })
    expect(crossPlan.plan.version).toBe(2)
  })

  it('records evaluations with lineage validation and explicit creation time', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const goal = await store.createGoal(goalInput())
    const activated = await activate(store, goal, [step('eval')])
    const record = await store.recordEvaluation({
      tenantId: TENANT,
      goalId: goal.id,
      planId: activated.plan.id,
      stepId: null,
      evaluatorType: 'synthetic',
      criteria: goal.successCriteria,
      evidence: [],
      result: 'not_satisfied',
      reason: 'synthetic'
    })
    expect(record.id).toMatch(/^evaluation_/)
    expect(record.createdAt).toEqual(NOW)
    const backdated = new Date('2026-02-02T00:00:00.000Z')
    const explicit = await store.recordEvaluation({
      tenantId: TENANT,
      goalId: goal.id,
      planId: activated.plan.id,
      stepId: 'eval',
      evaluatorType: 'synthetic',
      criteria: goal.successCriteria,
      evidence: [],
      result: 'not_satisfied',
      reason: 'synthetic',
      createdAt: backdated
    })
    expect(explicit.createdAt).toEqual(backdated)
    expect(await store.listEvaluations(TENANT, goal.id)).toHaveLength(2)
  })

  it('rejects evaluations whose goal, plan or step lineage does not match', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const firstGoal = await store.createGoal(goalInput())
    const first = await activate(store, firstGoal, [step('ev-a')])
    const secondGoal = await store.createGoal(
      goalInput({ correlationId: OTHER_CORRELATION })
    )
    const second = await activate(store, secondGoal, [step('ev-b')])
    const base = {
      tenantId: TENANT,
      goalId: firstGoal.id,
      planId: first.plan.id,
      stepId: null,
      evaluatorType: 'synthetic',
      criteria: firstGoal.successCriteria,
      evidence: [],
      result: 'not_satisfied' as const,
      reason: 'synthetic'
    }
    await expect(
      store.recordEvaluation({ ...base, goalId: 'goal_missing' })
    ).rejects.toMatchObject({ code: 'conflict' })
    await expect(
      store.recordEvaluation({ ...base, planId: 'plan_missing' })
    ).rejects.toMatchObject({ code: 'conflict' })
    await expect(
      store.recordEvaluation({ ...base, planId: second.plan.id })
    ).rejects.toMatchObject({ code: 'conflict' })
    await expect(
      store.recordEvaluation({ ...base, stepId: 'step_missing' })
    ).rejects.toMatchObject({ code: 'conflict' })
    await expect(
      store.recordEvaluation({ ...base, stepId: 'ev-b' })
    ).rejects.toMatchObject({ code: 'conflict' })
  })
})

describe('materializePlanSteps branch hardening', () => {
  it('maps minimal drafts, preserves unknown dependencies and applies defaults', () => {
    const plan: Plan = {
      id: 'plan_materialize',
      goalId: 'goal_materialize',
      tenantId: TENANT,
      version: 1,
      parentPlanId: null,
      reason: 'synthetic',
      triggeringEvaluationId: null,
      status: 'ACTIVE',
      createdAt: NOW,
      updatedAt: NOW,
      fingerprint: 'fingerprint'
    }
    const minimal: PlanStepDraft = {
      type: 'synthetic_minimal',
      description: 'minimal',
      dependencies: ['ghost'],
      requiredCapabilities: ['appointment.create'],
      riskLevel: 'MEDIUM_RISK_WRITE',
      approvalRequirement: 'none',
      intent: intent('minimal', { idempotencyKey: null })
    }
    const independent: PlanStepDraft = {
      type: 'synthetic_independent',
      description: 'independent',
      requiredCapabilities: ['appointment.create'],
      riskLevel: 'MEDIUM_RISK_WRITE',
      approvalRequirement: 'none',
      intent: intent('independent')
    }
    const materialized = materializePlanSteps(
      TENANT,
      'goal_materialize',
      plan,
      [minimal, independent],
      NOW
    )
    const [first, second] = materialized
    expect(first).toMatchObject({
      id: 'step-0',
      dependencies: ['ghost'],
      status: 'PENDING',
      input: null,
      expectedOutcome: null,
      timeoutMs: 30_000,
      toolId: null,
      toolVersion: null
    })
    expect(first!.intent.idempotencyKey).toBeNull()
    expect(first!.intent.modelMessages).toBeNull()
    expect(second).toMatchObject({
      id: 'step-1',
      dependencies: [],
      status: 'READY'
    })
  })
})

describe('GoalPlanOrchestrator constructor and recovery branch hardening', () => {
  it('rejects invalid worker ids and lease durations', () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    expect(() => buildOrchestrator(store, { workerId: '' })).toThrow(
      /Worker id is invalid/
    )
    expect(() =>
      buildOrchestrator(store, { workerId: 'x'.repeat(201) })
    ).toThrow(/Worker id is invalid/)
    expect(() => buildOrchestrator(store, { leaseMs: 99 })).toThrow(
      /Lease duration must be at least 100ms/
    )
    expect(() => buildOrchestrator(store, { leaseMs: 100.5 })).toThrow(
      /Lease duration must be at least 100ms/
    )
  })

  it('reports not_found when running an unknown goal', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    await expect(
      buildOrchestrator(store).run(TENANT, 'goal_missing')
    ).rejects.toMatchObject({
      code: 'not_found'
    })
  })

  it('reports not_found when the goal disappears between recovery and the first turn', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const goal = await store.createGoal(goalInput())
    const original = store.getGoal.bind(store)
    let calls = 0
    store.getGoal = async (tenantId, goalId) => {
      calls += 1
      if (calls >= 2) return null
      return original(tenantId, goalId)
    }
    await expect(
      buildOrchestrator(store).run(TENANT, goal.id)
    ).rejects.toMatchObject({
      code: 'not_found'
    })
  })

  it('falls back to the goal status when a terminal goal has no last reason', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const goal = await store.createGoal(goalInput())
    const original = store.getGoal.bind(store)
    store.getGoal = async (tenantId, goalId) => {
      const current = await original(tenantId, goalId)
      return current
        ? { ...current, status: 'COMPLETED', lastReason: null }
        : null
    }
    const result = await buildOrchestrator(store).run(TENANT, goal.id)
    expect(result.reason).toBe('COMPLETED')
    expect(result.goal.status).toBe('COMPLETED')
  })

  it('falls back to the goal status when consumeIteration stops without a reason', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const goal = await store.createGoal(goalInput())
    const original = store.getGoal.bind(store)
    store.consumeIteration = async (input) => {
      const current = await original(input.tenantId, input.goalId)
      return {
        ...current!,
        status: 'LOOP_DETECTED',
        lastReason: null,
        version: current!.version + 1
      }
    }
    const result = await buildOrchestrator(store).run(TENANT, goal.id)
    expect(result.reason).toBe('LOOP_DETECTED')
  })

  it('exhausts the duration budget when the goal carries no deadline', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const goal = await store.createGoal(
      goalInput({ budget: { maxDurationMs: 100 } })
    )
    const original = store.getGoal.bind(store)
    store.getGoal = async (tenantId, goalId) => {
      const current = await original(tenantId, goalId)
      return current ? { ...current, deadline: null } : null
    }
    const now = new Date(NOW.getTime() + 101)
    const result = await buildOrchestrator(store, { clock: () => now }).run(
      TENANT,
      goal.id
    )
    expect(result.goal.status).toBe('BUDGET_EXHAUSTED')
    expect(result.reason).toBe('goal_duration_budget_exhausted')
  })

  it('blocks and defers the goal when evaluation is blocked or unknown', async () => {
    const blockedStore = new InMemoryGoalPlanStore({ clock: () => NOW })
    const blockedGoal = await blockedStore.createGoal(goalInput())
    const blocked = await buildOrchestrator(blockedStore, {
      evaluator: {
        async evaluate() {
          return {
            result: 'blocked',
            reason: 'synthetic blocked',
            evidence: []
          }
        }
      }
    }).run(TENANT, blockedGoal.id)
    expect(blocked.goal.status).toBe('BLOCKED')
    expect(blocked.reason).toBe('synthetic blocked')

    const unknownStore = new InMemoryGoalPlanStore({ clock: () => NOW })
    const unknownGoal = await unknownStore.createGoal(goalInput())
    const unknown = await buildOrchestrator(unknownStore, {
      evaluator: {
        async evaluate() {
          return {
            result: 'unknown',
            reason: 'synthetic unknown',
            evidence: []
          }
        }
      }
    }).run(TENANT, unknownGoal.id)
    expect(unknown.goal.status).toBe('WAITING_EXTERNAL')
    expect(unknown.reason).toBe('synthetic unknown')
  })

  it('observes a fully succeeded plan that was left waiting for evaluation', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const goal = await store.createGoal(goalInput())
    const activated = await activate(store, goal, [step('solo')])
    const governing = await advanceGoal(store, activated.goal, [
      'UNDERSTANDING',
      'PLANNING',
      'GOVERNING'
    ])
    const claimed = await claim(store, governing, activated.plan, 'solo')
    const settled = await settle(store, claimed!.lease, 'succeeded')
    expect(settled.step.status).toBe('SUCCEEDED')
    const result = await buildOrchestrator(store).run(TENANT, goal.id)
    expect(result.goal.status).toBe('COMPLETED')
    expect(result.executedStepIds).toEqual([])
  })

  it('routes a failed plan step into evaluation and exhausts the replan budget', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const goal = await store.createGoal(
      goalInput({ budget: { maxReplans: 0 } })
    )
    const activated = await activate(store, goal, [step('bad')])
    const executing = await advanceGoal(store, activated.goal, [
      'UNDERSTANDING',
      'PLANNING',
      'GOVERNING',
      'EXECUTING'
    ])
    const claimed = await claim(store, executing, activated.plan, 'bad')
    await settle(store, claimed!.lease, 'failed', {
      reason: 'synthetic step failure'
    })
    let observed: PlanStep[] = []
    const result = await buildOrchestrator(store, {
      evaluator: {
        async evaluate(input) {
          observed = input.steps
          return {
            result: 'not_satisfied',
            reason: 'synthetic not satisfied',
            evidence: []
          }
        }
      }
    }).run(TENANT, goal.id)
    expect(observed.map((candidate) => candidate.status)).toEqual(['FAILED'])
    expect(result.goal.status).toBe('BUDGET_EXHAUSTED')
    expect(result.reason).toBe('max_replans_exhausted')
  })

  it('stops with max_steps_exhausted before claiming a second step', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const goal = await store.createGoal(goalInput({ budget: { maxSteps: 1 } }))
    const result = await buildOrchestrator(store, {
      planner: {
        async plan() {
          return {
            reason: 'two independent synthetic steps',
            steps: [step('a'), step('b')]
          }
        }
      },
      evaluator: {
        async evaluate() {
          return {
            result: 'not_satisfied',
            reason: 'synthetic pending step',
            evidence: []
          }
        }
      }
    }).run(TENANT, goal.id)
    expect(result.goal.status).toBe('BUDGET_EXHAUSTED')
    expect(result.reason).toBe('max_steps_exhausted')
  })

  it('records a claim conflict and stops on the persisted iteration limit', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const goal = await store.createGoal(
      goalInput({ budget: { maxIterations: 2 } })
    )
    store.claimStep = async () => null
    const telemetry = new InMemoryTelemetry({ clock: () => NOW })
    const result = await buildOrchestrator(store, { telemetry }).run(
      TENANT,
      goal.id
    )
    expect(result.goal.status).toBe('LOOP_DETECTED')
    expect(result.reason).toBe('max_iterations_exhausted')
    expect(
      telemetry
        .metrics()
        .filter(
          (metric) =>
            metric.name === 'orchestrator_step_claim_total' &&
            metric.attributes.outcome === 'conflict'
        )
    ).toHaveLength(2)
  })

  it('stops on the local iteration guard when durable iterations never exhaust', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const goal = await store.createGoal(
      goalInput({ budget: { maxIterations: 3 } })
    )
    store.claimStep = async () => null
    const result = await buildOrchestrator(store, { maxIterations: 1 }).run(
      TENANT,
      goal.id
    )
    expect(result.goal.status).toBe('LOOP_DETECTED')
    expect(result.reason).toBe('orchestrator_iteration_guard')
  })

  it('executes two independent steps in deterministic identifier order', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const goal = await store.createGoal(goalInput())
    const result = await buildOrchestrator(store, {
      planner: {
        async plan() {
          return {
            reason: 'independent synthetic steps',
            steps: [step('zeta'), step('alpha')]
          }
        }
      }
    }).run(TENANT, goal.id)
    expect(result.executedStepIds).toEqual(['alpha', 'zeta'])
    expect(result.goal.status).toBe('COMPLETED')
  })

  it('returns the fenced result when settlement loses the lease or conflicts', async () => {
    for (const code of ['lease_lost', 'conflict'] as const) {
      const store = new InMemoryGoalPlanStore({ clock: () => NOW })
      const goal = await store.createGoal(goalInput())
      store.settleStep = async () => {
        throw new OrchestrationError(code, `synthetic ${code}`)
      }
      const result = await buildOrchestrator(store).run(TENANT, goal.id)
      expect(result.reason).toBe('step_settle_fenced')
      expect(result.executedStepIds).toEqual(['p1'])
      expect((await store.getGoal(TENANT, goal.id))?.status).toBe('EXECUTING')
    }
  })

  it('rethrows non-fencing settlement failures', async () => {
    const plainStore = new InMemoryGoalPlanStore({ clock: () => NOW })
    const plainGoal = await plainStore.createGoal(goalInput())
    plainStore.settleStep = async () => {
      throw new Error('synthetic settlement outage')
    }
    await expect(
      buildOrchestrator(plainStore).run(TENANT, plainGoal.id)
    ).rejects.toThrow(/synthetic settlement outage/)

    const invalidStore = new InMemoryGoalPlanStore({ clock: () => NOW })
    const invalidGoal = await invalidStore.createGoal(goalInput())
    invalidStore.settleStep = async () => {
      throw new OrchestrationError(
        'invalid_plan',
        'synthetic invalid settlement'
      )
    }
    await expect(
      buildOrchestrator(invalidStore).run(TENANT, invalidGoal.id)
    ).rejects.toMatchObject({ code: 'invalid_plan' })
  })

  it('settles a thrown executor error as a failed step with its message', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const goal = await store.createGoal(goalInput())
    const result = await buildOrchestrator(store, {
      executor: {
        async execute() {
          throw new Error('synthetic executor exploded')
        }
      },
      evaluator: {
        async evaluate() {
          return {
            result: 'blocked',
            reason: 'synthetic blocked after failure',
            evidence: []
          }
        }
      }
    }).run(TENANT, goal.id)
    expect(result.goal.status).toBe('BLOCKED')
    const plan = await store.getActivePlan(TENANT, goal.id)
    const steps = plan ? await store.listSteps(TENANT, plan.id) : []
    expect(steps[0]?.status).toBe('FAILED')
    expect(steps[0]?.lastError).toBe('synthetic executor exploded')
  })

  it('settles a thrown non-Error executor failure with a stable fallback reason', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const goal = await store.createGoal(goalInput())
    const result = await buildOrchestrator(store, {
      executor: {
        async execute() {
          throw { kind: 'synthetic_non_error_failure' }
        }
      },
      evaluator: {
        async evaluate() {
          return {
            result: 'blocked',
            reason: 'synthetic blocked after failure',
            evidence: []
          }
        }
      }
    }).run(TENANT, goal.id)
    expect(result.goal.status).toBe('BLOCKED')
    const plan = await store.getActivePlan(TENANT, goal.id)
    const steps = plan ? await store.listSteps(TENANT, plan.id) : []
    expect(steps[0]?.lastError).toBe('step_executor_failed')
  })

  it('defaults missing execution accounting to zero in settlement', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const goal = await store.createGoal(goalInput())
    const result = await buildOrchestrator(store, {
      executor: {
        async execute() {
          return {
            outcome: 'succeeded',
            reason: 'synthetic execution without accounting',
            evidence: verifiedEvidence('synthetic:no-accounting')
          }
        }
      }
    }).run(TENANT, goal.id)
    expect(result.goal.status).toBe('COMPLETED')
    expect(result.goal.budget.usage.modelCalls).toBe(0)
    expect(result.goal.budget.usage.toolCalls).toBe(0)
    expect(result.goal.budget.usage.costUsd).toBe(0)
  })

  it('exhausts the execution budget when the executor overspends', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const goal = await store.createGoal(
      goalInput({ budget: { maxModelCalls: 1 } })
    )
    const result = await buildOrchestrator(store, {
      executor: {
        async execute() {
          return {
            outcome: 'succeeded',
            reason: 'synthetic overspend',
            evidence: verifiedEvidence('synthetic:overspend'),
            modelCalls: 2
          }
        }
      }
    }).run(TENANT, goal.id)
    expect(result.goal.status).toBe('BUDGET_EXHAUSTED')
    expect(result.reason).toBe('execution_budget_exhausted')
  })

  it('returns waiting_external and human_handoff results from the run loop', async () => {
    for (const outcome of ['waiting_external', 'human_handoff'] as const) {
      const store = new InMemoryGoalPlanStore({ clock: () => NOW })
      const goal = await store.createGoal(goalInput())
      const result = await buildOrchestrator(store, {
        executor: {
          async execute() {
            return { outcome, reason: `synthetic ${outcome} result` }
          }
        }
      }).run(TENANT, goal.id)
      expect(result.goal.status).toBe(
        outcome === 'waiting_external' ? 'WAITING_EXTERNAL' : 'HUMAN_HANDOFF'
      )
      expect(result.reason).toBe(`synthetic ${outcome} result`)
    }
  })

  it('returns approval-waiting and uncertain results from the run loop', async () => {
    const approvalStore = new InMemoryGoalPlanStore({ clock: () => NOW })
    const approvalGoal = await approvalStore.createGoal(goalInput())
    const approval = await buildOrchestrator(approvalStore, {
      executor: {
        async execute() {
          return {
            outcome: 'approval_required',
            reason: 'synthetic approval result',
            approvalId: 'approval_run'
          }
        }
      }
    }).run(TENANT, approvalGoal.id)
    expect(approval.goal.status).toBe('WAITING_APPROVAL')
    expect(approval.reason).toBe('synthetic approval result')

    const uncertainStore = new InMemoryGoalPlanStore({ clock: () => NOW })
    const uncertainGoal = await uncertainStore.createGoal(goalInput())
    const uncertain = await buildOrchestrator(uncertainStore, {
      executor: {
        async execute() {
          return { outcome: 'uncertain', reason: 'synthetic uncertain result' }
        }
      }
    }).run(TENANT, uncertainGoal.id)
    expect(uncertain.goal.status).toBe('UNCERTAIN')
    expect(uncertain.reason).toBe('synthetic uncertain result')
  })

  it('returns early for goals parked in waiting or handoff states', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const goal = await store.createGoal(goalInput())
    const parked = await store.transitionGoal({
      tenantId: TENANT,
      goalId: goal.id,
      expectedVersion: goal.version,
      target: 'HUMAN_HANDOFF',
      reason: 'synthetic parked goal'
    })
    let plannerCalls = 0
    const result = await buildOrchestrator(store, {
      planner: {
        async plan() {
          plannerCalls += 1
          return { reason: 'must not plan', steps: [step('never')] }
        }
      }
    }).run(TENANT, parked.id)
    expect(result.reason).toBe('HUMAN_HANDOFF')
    expect(plannerCalls).toBe(0)
  })

  it('uses the derived deadline fallback when a claimed goal has no deadline', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const goal = await store.createGoal(goalInput())
    const originalGetGoal = store.getGoal.bind(store)
    store.getGoal = async (tenantId, goalId) => {
      const current = await originalGetGoal(tenantId, goalId)
      return current ? { ...current, deadline: null } : null
    }
    const original = store.claimStep.bind(store)
    store.claimStep = async (input) => {
      const claimed = await original(input)
      return claimed
        ? { ...claimed, goal: { ...claimed.goal, deadline: null } }
        : null
    }
    const result = await buildOrchestrator(store).run(TENANT, goal.id)
    expect(result.goal.status).toBe('COMPLETED')
  })

  it('renews the lease during a long execution and settles with the renewed lease', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const goal = await store.createGoal(goalInput())
    const result = await buildOrchestrator(store, {
      leaseMs: 300,
      executor: {
        async execute() {
          await delay(420)
          return {
            outcome: 'succeeded',
            reason: 'synthetic long execution',
            evidence: verifiedEvidence('synthetic:long')
          }
        }
      }
    }).run(TENANT, goal.id)
    expect(result.goal.status).toBe('COMPLETED')
    const plan = await store.getActivePlan(TENANT, goal.id)
    const steps = plan ? await store.listSteps(TENANT, plan.id) : []
    expect(steps[0]?.status).toBe('SUCCEEDED')
  })

  it('evaluates a goal that was already advanced to EVALUATING before restart', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const goal = await store.createGoal(goalInput())
    const activated = await activate(store, goal, [step('done')])
    const executing = await advanceGoal(store, activated.goal, [
      'UNDERSTANDING',
      'PLANNING',
      'GOVERNING',
      'EXECUTING'
    ])
    const claimed = await claim(store, executing, activated.plan, 'done')
    const settled = await settle(store, claimed!.lease, 'succeeded')
    const observing = await store.transitionGoal({
      tenantId: TENANT,
      goalId: goal.id,
      expectedVersion: settled.goal.version,
      target: 'OBSERVING_RESULT',
      reason: 'synthetic observed'
    })
    const evaluating = await store.transitionGoal({
      tenantId: TENANT,
      goalId: goal.id,
      expectedVersion: observing.version,
      target: 'EVALUATING',
      reason: 'synthetic evaluating'
    })
    expect(evaluating.status).toBe('EVALUATING')
    const result = await buildOrchestrator(store).run(TENANT, goal.id)
    expect(result.goal.status).toBe('COMPLETED')
  })

  it('aborts execution and reports lease loss when heartbeat renewal fails quickly', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const goal = await store.createGoal(goalInput())
    const activated = await activate(store, goal, [step('hb-lost')])
    await advanceGoal(store, activated.goal, [
      'UNDERSTANDING',
      'PLANNING',
      'GOVERNING',
      'EXECUTING'
    ])
    store.heartbeatStep = async () => {
      await delay(90)
      return null
    }
    let aborted = false
    const result = await buildOrchestrator(store, {
      leaseMs: 300,
      executor: {
        async execute(input) {
          input.signal.addEventListener('abort', () => {
            aborted = true
          })
          await delay(600)
          return { outcome: 'succeeded', reason: 'synthetic late success' }
        }
      }
    }).run(TENANT, goal.id)
    expect(aborted).toBe(true)
    expect(result.reason).toBe('step_lease_lost')
    expect((await store.getStep(TENANT, 'hb-lost'))?.status).toBe('EXECUTING')
  })

  it('awaits an in-flight heartbeat before reporting lease loss', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const goal = await store.createGoal(goalInput())
    const activated = await activate(store, goal, [step('hb-pending')])
    await advanceGoal(store, activated.goal, [
      'UNDERSTANDING',
      'PLANNING',
      'GOVERNING',
      'EXECUTING'
    ])
    store.heartbeatStep = async () => {
      await delay(250)
      return null
    }
    const result = await buildOrchestrator(store, {
      leaseMs: 300,
      executor: {
        async execute() {
          await delay(250)
          return { outcome: 'succeeded', reason: 'synthetic early success' }
        }
      }
    }).run(TENANT, goal.id)
    expect(result.reason).toBe('step_lease_lost')
  })

  it('revives an expired lease through reconciliation and completes the goal', async () => {
    let now = new Date(NOW)
    const store = new InMemoryGoalPlanStore({ clock: () => now })
    const goal = await store.createGoal(goalInput())
    const activated = await activate(store, goal, [step('r1')])
    const executing = await advanceGoal(store, activated.goal, [
      'UNDERSTANDING',
      'PLANNING',
      'GOVERNING',
      'EXECUTING'
    ])
    await claim(store, executing, activated.plan, 'r1', 'w-old', now, 100)
    now = new Date(NOW.getTime() + 101)
    const result = await buildOrchestrator(store, {
      clock: () => now,
      reconcileExpiredLease: async () => 'retry'
    }).run(TENANT, goal.id)
    expect(result.goal.status).toBe('COMPLETED')
    expect(result.executedStepIds).toEqual(['r1'])
    const attempts = await store.listAttempts(TENANT, 'r1')
    expect(attempts[0]?.outcome).toBe('lease_expired')
    expect(attempts[1]?.outcome).toBe('SUCCEEDED')
  })

  it('records transition failures with the error code and rethrows', async () => {
    const codedStore = new InMemoryGoalPlanStore({ clock: () => NOW })
    const codedGoal = await codedStore.createGoal(goalInput())
    codedStore.transitionGoal = async () => {
      throw new OrchestrationError('conflict', 'synthetic transition conflict')
    }
    const telemetry = new InMemoryTelemetry({ clock: () => NOW })
    await expect(
      buildOrchestrator(codedStore, { telemetry }).run(TENANT, codedGoal.id)
    ).rejects.toMatchObject({ code: 'conflict' })
    expect(
      telemetry.spans().some((span) => span.errorCode === 'conflict')
    ).toBe(true)

    const plainStore = new InMemoryGoalPlanStore({ clock: () => NOW })
    const plainGoal = await plainStore.createGoal(goalInput())
    plainStore.transitionGoal = async () => {
      throw new Error('synthetic transition outage')
    }
    const plainTelemetry = new InMemoryTelemetry({ clock: () => NOW })
    await expect(
      buildOrchestrator(plainStore, { telemetry: plainTelemetry }).run(
        TENANT,
        plainGoal.id
      )
    ).rejects.toThrow(/synthetic transition outage/)
    expect(
      plainTelemetry
        .spans()
        .some((span) => span.errorCode === 'goal_transition_failed')
    ).toBe(true)
  })

  it('tolerates an evaluator that omits the evidence field', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const goal = await store.createGoal(goalInput())
    const result = await buildOrchestrator(store, {
      evaluator: {
        async evaluate() {
          return {
            result: 'blocked',
            reason: 'synthetic blocked without evidence'
          } as unknown as GoalEvaluation
        }
      }
    }).run(TENANT, goal.id)
    expect(result.goal.status).toBe('BLOCKED')
    expect(result.reason).toBe('synthetic blocked without evidence')
  })
})

describe('GoalPlanOrchestrator recoverGoals branch hardening', () => {
  it('resolves a waiting approval into a terminal goal', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const { waiting } = await setupWaitingApproval(store)
    const telemetry = new InMemoryTelemetry({ clock: () => NOW })
    const result = await buildOrchestrator(store, {
      telemetry,
      reconcileWaitingApproval: async (current) => {
        await store.transitionGoal({
          tenantId: current.tenantId,
          goalId: current.id,
          expectedVersion: current.version,
          target: 'CANCELLED',
          reason: 'synthetic approval withdrawn'
        })
        return 'resolved'
      }
    }).recoverGoals(TENANT)
    expect(result).toEqual({
      inspected: 1,
      resumed: 1,
      skipped: 0,
      completed: 1,
      failures: 0
    })
    expect((await store.getGoal(TENANT, waiting.goal.id))?.status).toBe(
      'CANCELLED'
    )
    expect(telemetry.spans().some((span) => span.status === 'ok')).toBe(true)
    expect(
      telemetry
        .metrics()
        .some(
          (metric) =>
            metric.name === 'orchestrator_goal_recovery_total' &&
            metric.attributes.outcome === 'ok'
        )
    ).toBe(true)
  })

  it('counts a resolved but non-terminal approval as resumed only', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    await setupWaitingApproval(store)
    const result = await buildOrchestrator(store, {
      reconcileWaitingApproval: async () => 'resolved'
    }).recoverGoals(TENANT)
    expect(result).toEqual({
      inspected: 1,
      resumed: 1,
      skipped: 0,
      completed: 0,
      failures: 0
    })
  })

  it('skips an approval that reconciliation reports as pending', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    await setupWaitingApproval(store)
    const result = await buildOrchestrator(store, {
      reconcileWaitingApproval: async () => 'pending'
    }).recoverGoals(TENANT)
    expect(result).toEqual({
      inspected: 1,
      resumed: 0,
      skipped: 1,
      completed: 0,
      failures: 0
    })
  })

  it('counts a throwing reconciliation as a partial recovery failure', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    await setupWaitingApproval(store)
    const telemetry = new InMemoryTelemetry({ clock: () => NOW })
    const result = await buildOrchestrator(store, {
      telemetry,
      reconcileWaitingApproval: async () => {
        throw new Error('synthetic reconciliation outage')
      }
    }).recoverGoals(TENANT)
    expect(result).toEqual({
      inspected: 1,
      resumed: 0,
      skipped: 0,
      completed: 0,
      failures: 1
    })
    expect(
      telemetry
        .metrics()
        .some(
          (metric) =>
            metric.name === 'orchestrator_goal_recovery_total' &&
            metric.attributes.outcome === 'partial'
        )
    ).toBe(true)
    expect(telemetry.spans().some((span) => span.status === 'error')).toBe(true)
  })

  it('skips a waiting approval when no reconciliation callback is configured', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    await setupWaitingApproval(store)
    const original = store.listRunnableGoals.bind(store)
    store.listRunnableGoals = async (tenantId) => {
      const goals = await original(tenantId)
      const all = await store.listGoals(tenantId ?? TENANT, {
        statuses: ['WAITING_APPROVAL'],
        limit: 100
      })
      return [...goals, ...all]
    }
    const result = await buildOrchestrator(store).recoverGoals(TENANT)
    expect(result).toEqual({
      inspected: 1,
      resumed: 0,
      skipped: 1,
      completed: 0,
      failures: 0
    })
  })

  it('skips listed goals that no longer exist and non-runnable leftovers', async () => {
    const missingStore = new InMemoryGoalPlanStore({ clock: () => NOW })
    const missingGoal = await missingStore.createGoal(goalInput())
    missingStore.getGoal = async () => null
    const missingResult =
      await buildOrchestrator(missingStore).recoverGoals(TENANT)
    expect(missingResult).toEqual({
      inspected: 1,
      resumed: 0,
      skipped: 1,
      completed: 0,
      failures: 0
    })
    expect(missingGoal.status).toBe('OBSERVING')

    const staleStore = new InMemoryGoalPlanStore({ clock: () => NOW })
    const staleGoal = await staleStore.createGoal(goalInput())
    const cancelled = await staleStore.transitionGoal({
      tenantId: TENANT,
      goalId: staleGoal.id,
      expectedVersion: staleGoal.version,
      target: 'HUMAN_HANDOFF',
      reason: 'synthetic handoff'
    })
    const terminated = await staleStore.transitionGoal({
      tenantId: TENANT,
      goalId: cancelled.id,
      expectedVersion: cancelled.version,
      target: 'CANCELLED',
      reason: 'synthetic cancellation'
    })
    staleStore.listRunnableGoals = async () => [terminated]
    const staleResult = await buildOrchestrator(staleStore).recoverGoals(TENANT)
    expect(staleResult).toEqual({
      inspected: 1,
      resumed: 0,
      skipped: 1,
      completed: 0,
      failures: 0
    })
  })

  it('resumes a runnable goal but does not mark it completed when it parks', async () => {
    const store = new InMemoryGoalPlanStore({ clock: () => NOW })
    const goal = await store.createGoal(goalInput())
    const result = await buildOrchestrator(store, {
      executor: {
        async execute() {
          return {
            outcome: 'waiting_external',
            reason: 'synthetic external dependency'
          }
        }
      }
    }).recoverGoals(TENANT)
    expect(result).toEqual({
      inspected: 1,
      resumed: 1,
      skipped: 0,
      completed: 0,
      failures: 0
    })
    expect((await store.getGoal(TENANT, goal.id))?.status).toBe(
      'WAITING_EXTERNAL'
    )
  })

  it('wraps unexpected recovery failures with coded and generic telemetry', async () => {
    const codedStore = new InMemoryGoalPlanStore({ clock: () => NOW })
    codedStore.listRunnableGoals = async () => {
      throw new OrchestrationError('invalid_plan', 'synthetic recovery failure')
    }
    const codedTelemetry = new InMemoryTelemetry({ clock: () => NOW })
    await expect(
      buildOrchestrator(codedStore, { telemetry: codedTelemetry }).recoverGoals(
        TENANT
      )
    ).rejects.toMatchObject({ code: 'invalid_plan' })
    expect(
      codedTelemetry.spans().some((span) => span.errorCode === 'invalid_plan')
    ).toBe(true)
    expect(
      codedTelemetry
        .metrics()
        .some(
          (metric) =>
            metric.name === 'orchestrator_goal_recovery_total' &&
            metric.attributes.outcome === 'error'
        )
    ).toBe(true)

    const plainStore = new InMemoryGoalPlanStore({ clock: () => NOW })
    plainStore.listRunnableGoals = async () => {
      throw new Error('synthetic recovery outage')
    }
    const plainTelemetry = new InMemoryTelemetry({ clock: () => NOW })
    await expect(
      buildOrchestrator(plainStore, { telemetry: plainTelemetry }).recoverGoals(
        TENANT
      )
    ).rejects.toThrow(/synthetic recovery outage/)
    expect(
      plainTelemetry
        .spans()
        .some((span) => span.errorCode === 'goal_recovery_failed')
    ).toBe(true)
  })

  it('keeps terminal status detection aligned with runnable status detection', () => {
    expect(isTerminalGoalStatus('COMPLETED')).toBe(true)
    expect(isTerminalGoalStatus('BUDGET_EXHAUSTED')).toBe(true)
    expect(isTerminalGoalStatus('OBSERVING')).toBe(false)
    expect(isRunnableGoalStatus('OBSERVING')).toBe(true)
    expect(isRunnableGoalStatus('COMPLETED')).toBe(false)
    expect(isRunnableGoalStatus('WAITING_APPROVAL')).toBe(false)
  })
})
