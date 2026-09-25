import { describe, expect, it } from 'vitest'
import {
  toOrchestrationGoalDetailView,
  toOrchestrationGoalView
} from '../orchestration-observability.ts'
import type {
  AttemptRecord,
  EvaluationRecord,
  Goal,
  ObservationRecord,
  Plan,
  PlanStep
} from '@cvg/agent-runtime'

const TENANT = 'tenant_00000000-0000-4000-8000-0000000007c1'

function baseBudget() {
  return {
    maxSteps: 12,
    maxReplans: 3,
    maxIterations: 256,
    maxModelCalls: 8,
    maxToolCalls: 10,
    maxDurationMs: 120_000,
    maxCostUsd: 2,
    usage: {
      steps: 1,
      replans: 2,
      iterations: 3,
      modelCalls: 4,
      toolCalls: 5,
      costUsd: 0.5
    }
  }
}

function baseSnapshot() {
  return {
    agentVersion: 'agent-branch-20260925',
    promptVersion: 'prompt-branch-20260925',
    policyVersion: 'policy-branch-20260925',
    modelProfile: 'deterministic-branch',
    toolVersions: { 'tool.branch.20260925': 'v1' }
  }
}

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal_branch_20260925',
    tenantId: TENANT,
    inboundMessageId: 'inbound_branch_20260925',
    sessionId: 'session_branch_20260925',
    conversationId: 'conversation_branch_20260925',
    objective: 'branch objective 20260925',
    successCriteria: [],
    status: 'OBSERVING',
    createdAt: new Date('2026-09-25T10:00:00.000Z'),
    updatedAt: new Date('2026-09-25T11:00:00.000Z'),
    deadline: null,
    budget: baseBudget(),
    correlationId: 'corr_branch_20260925',
    version: 1,
    activePlanId: null,
    executionSnapshot: baseSnapshot(),
    replanFingerprints: [],
    lastReason: 'branch reason',
    lastError: null,
    ...overrides
  } as Goal
}

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: 'plan_branch_20260925',
    goalId: 'goal_branch_20260925',
    tenantId: TENANT,
    version: 1,
    parentPlanId: null,
    reason: 'branch plan reason',
    triggeringEvaluationId: null,
    status: 'ACTIVE',
    createdAt: new Date('2026-09-25T10:00:00.000Z'),
    updatedAt: new Date('2026-09-25T10:30:00.000Z'),
    fingerprint: 'fingerprint-branch-20260925',
    ...overrides
  } as Plan
}

function makeStep(overrides: Partial<PlanStep> = {}): PlanStep {
  return {
    id: 'step_branch_20260925',
    goalId: 'goal_branch_20260925',
    planId: 'plan_branch_20260925',
    tenantId: TENANT,
    type: 'branch.type',
    description: 'branch step description',
    dependencies: ['step_dep_branch'],
    requiredCapabilities: ['schedule.read'],
    riskLevel: 'READ_ONLY',
    approvalRequirement: 'none',
    status: 'READY',
    attemptCount: 0,
    input: null,
    inputHash: 'hash-branch',
    expectedOutcome: null,
    timeoutMs: 1000,
    intent: {},
    approvalId: null,
    toolId: 'tool.branch.20260925',
    toolVersion: 'v1',
    resultHash: null,
    lastError: null,
    startedAt: null,
    completedAt: null,
    leaseOwner: null,
    leaseToken: null,
    leaseUntil: null,
    version: 1,
    createdAt: new Date('2026-09-25T10:00:00.000Z'),
    updatedAt: new Date('2026-09-25T10:00:00.000Z'),
    ...overrides
  } as unknown as PlanStep
}

function makeObservation(
  overrides: Partial<ObservationRecord> = {}
): ObservationRecord {
  return {
    id: 'observation_branch_20260925',
    tenantId: TENANT,
    goalId: 'goal_branch_20260925',
    planId: 'plan_branch_20260925',
    stepId: null,
    kind: 'step_result',
    resultDigest: 'digest-branch-20260925',
    evidence: [],
    createdAt: new Date('2026-09-25T12:00:00.000Z'),
    ...overrides
  } as ObservationRecord
}

function makeEvaluation(
  overrides: Partial<EvaluationRecord> = {}
): EvaluationRecord {
  return {
    id: 'evaluation_branch_20260925',
    tenantId: TENANT,
    goalId: 'goal_branch_20260925',
    planId: 'plan_branch_20260925',
    stepId: null,
    evaluatorType: 'branch-evaluator',
    criteria: [],
    evidence: [],
    result: 'satisfied',
    reason: 'branch evaluation reason',
    createdAt: new Date('2026-09-25T13:00:00.000Z'),
    ...overrides
  } as EvaluationRecord
}

function makeAttempt(overrides: Partial<AttemptRecord> = {}): AttemptRecord {
  return {
    id: 'attempt_branch_20260925',
    tenantId: TENANT,
    goalId: 'goal_branch_20260925',
    planId: 'plan_branch_20260925',
    stepId: 'step_branch_20260925',
    workerId: 'worker.branch.20260925',
    leaseToken: 'lease-branch-20260925',
    startedAt: new Date('2026-09-25T10:00:00.000Z'),
    finishedAt: new Date('2026-09-25T10:01:00.000Z'),
    outcome: 'succeeded',
    errorClass: null,
    correlationId: 'corr_branch_20260925',
    ...overrides
  } as AttemptRecord
}

describe('orchestration observability branch coverage 20260925', () => {
  it('maps nullish and whitespace text through the goal view', () => {
    const view = toOrchestrationGoalView(
      makeGoal({
        objective: '   padded branch objective   ',
        correlationId: null as unknown as string,
        inboundMessageId: null,
        conversationId: undefined as unknown as null,
        sessionId: null,
        lastReason: null,
        lastError: undefined as unknown as null,
        deadline: null
      })
    )

    expect(view.objective).toBe('padded branch objective')
    expect(view.correlationId).toBe('Não informado')
    expect(view.inboundMessageId).toBeNull()
    expect(view.conversationId).toBeNull()
    expect(view.sessionId).toBeNull()
    expect(view.lastReason).toBeNull()
    expect(view.lastError).toBeNull()
    expect(view.deadline).toBeNull()
  })

  it('truncates long text and keeps deadline dates', () => {
    const longText = `x${'y'.repeat(300)}`
    const deadline = new Date('2026-09-25T14:00:00.000Z')
    const view = toOrchestrationGoalView(
      makeGoal({ objective: longText, deadline })
    )

    expect(typeof view.objective).toBe('string')
    expect((view.objective as string).endsWith('…')).toBe(true)
    expect((view.objective as string).length).toBe(241)
    expect(view.deadline).toBe(deadline.toISOString())
  })

  it('filters empty tool versions and maps runtime bindings', () => {
    const detail = toOrchestrationGoalDetailView({
      goal: makeGoal({
        executionSnapshot: {
          agentVersion: null,
          promptVersion: null,
          policyVersion: null,
          modelProfile: null,
          toolVersions: {
            'tool.branch.20260925': 'v2',
            '': 'dropped-name-branch',
            'dropped-version-branch': ''
          },
          runtimeMode: 'kernel',
          runtimeVersion: 'runtime-branch-20260925'
        }
      }),
      plans: [],
      stepsByPlan: new Map(),
      observations: [],
      evaluations: [],
      attemptsByStep: new Map()
    })

    expect(detail.executionSnapshot.toolVersions).toEqual({
      'tool.branch.20260925': 'v2'
    })
    expect(detail.executionSnapshot).toMatchObject({
      runtimeMode: 'kernel',
      runtimeVersion: 'runtime-branch-20260925'
    })
  })

  it('omits runtime bindings when the snapshot does not define them', () => {
    const detail = toOrchestrationGoalDetailView({
      goal: makeGoal(),
      plans: [],
      stepsByPlan: new Map(),
      observations: [],
      evaluations: [],
      attemptsByStep: new Map()
    })

    expect(detail.executionSnapshot).not.toHaveProperty('runtimeMode')
    expect(detail.executionSnapshot).not.toHaveProperty('runtimeVersion')
  })

  it('maps plans, steps, attempts, observations and evaluations', () => {
    const plan = makePlan()
    const step = makeStep({
      id: 'step_full_branch',
      requiredCapabilities: [
        'schedule.read',
        null as unknown as 'schedule.read',
        undefined as unknown as 'schedule.read'
      ],
      dependencies: ['a-branch', 'b-branch'],
      startedAt: new Date('2026-09-25T10:05:00.000Z'),
      completedAt: new Date('2026-09-25T10:06:00.000Z'),
      leaseUntil: new Date('2026-09-25T10:07:00.000Z')
    })
    const attempt = makeAttempt({
      stepId: 'step_full_branch',
      finishedAt: null,
      errorClass: 'branch-error'
    })
    const observation = makeObservation({
      resultDigest: null,
      evidence: [
        {
          source: 'audit',
          reference: null as unknown as string,
          verified: true,
          key: null as unknown as string,
          digest: 'digest-branch-value'
        }
      ]
    })
    const evaluation = makeEvaluation({
      reason: null as unknown as string,
      evidence: [
        {
          source: null as unknown as 'audit',
          reference: 'reference-branch-value',
          verified: false,
          key: 'key-branch-value',
          digest: null as unknown as string
        }
      ]
    })

    const detail = toOrchestrationGoalDetailView({
      goal: makeGoal({ activePlanId: plan.id }),
      plans: [plan],
      stepsByPlan: new Map([[plan.id, [step]]]),
      observations: [observation],
      evaluations: [evaluation],
      attemptsByStep: new Map([[step.id, [attempt]]])
    })

    const onlyPlan = detail.plans[0]!
    const onlyStep = onlyPlan.steps[0]!
    const onlyAttempt = onlyStep.attempts[0]!
    expect(detail.plans).toHaveLength(1)
    expect(onlyPlan.steps).toHaveLength(1)
    expect(onlyStep.requiredCapabilities).toEqual(['schedule.read'])
    expect(onlyStep.attempts).toHaveLength(1)
    expect(onlyAttempt).toMatchObject({
      id: attempt.id,
      errorClass: 'branch-error'
    })
    expect(onlyAttempt.finishedAt).toBeNull()
    expect(detail.observations).toHaveLength(1)
    expect(detail.evaluations).toHaveLength(1)
    expect(detail.evaluations[0]!.reason).toBeNull()
  })

  it('falls back to required placeholders for worker and evidence sources', () => {
    const detail = toOrchestrationGoalDetailView({
      goal: makeGoal({ activePlanId: 'missing-plan-branch' }),
      plans: [],
      stepsByPlan: new Map(),
      observations: [
        makeObservation({
          evidence: [
            {
              source: null as unknown as 'audit',
              reference: 'reference-branch-required',
              verified: true
            }
          ]
        })
      ],
      evaluations: [],
      attemptsByStep: new Map([
        [
          'step_missing_branch',
          [
            makeAttempt({
              workerId: null as unknown as string,
              correlationId: null as unknown as string
            })
          ]
        ]
      ])
    })

    expect(detail.operatorState.activePlanVersion).toBeNull()
    expect(detail.operatorState.currentStepId).toBeNull()
    expect(detail.observations[0]!.evidence[0]!.source).toBe('Não informado')
  })

  it('covers every success criterion shape including composite', () => {
    const detail = toOrchestrationGoalDetailView({
      goal: makeGoal({
        successCriteria: [
          { kind: 'COMPOSITE', operator: 'all', criteria: [] },
          { kind: 'EVENT', eventType: 'branch-event', source: 'audit' },
          {
            kind: 'STATE',
            resourceType: 'branch-resource',
            field: 'branch-field',
            expected: 'ready',
            source: 'operational_state'
          },
          {
            kind: 'FACT',
            key: 'branch-fact',
            expected: true,
            source: 'human_record'
          },
          {
            kind: 'SEMANTIC',
            description: 'branch semantic',
            requiredEvidenceKeys: [],
            source: 'audit'
          }
        ] as Goal['successCriteria']
      }),
      plans: [],
      stepsByPlan: new Map(),
      observations: [],
      evaluations: [],
      attemptsByStep: new Map()
    })

    expect(detail.successCriteria).toEqual([
      { kind: 'COMPOSITE', operator: 'all' },
      { kind: 'EVENT', source: 'audit', eventType: 'branch-event' },
      {
        kind: 'STATE',
        source: 'operational_state',
        resourceType: 'branch-resource',
        field: 'branch-field'
      },
      { kind: 'FACT', source: 'human_record', key: 'branch-fact' },
      {
        kind: 'SEMANTIC',
        source: 'audit',
        description: 'branch semantic'
      }
    ])
  })

  it('prefers executing steps over waiting and ready states', () => {
    const plan = makePlan({ id: 'plan_priority_branch' })
    const executing = makeStep({
      id: 'step_executing_branch',
      planId: plan.id,
      status: 'EXECUTING',
      leaseOwner: 'worker-branch-owner',
      leaseUntil: new Date('2026-09-25T15:00:00.000Z'),
      approvalId: 'approval-branch-1'
    })
    const waiting = makeStep({
      id: 'step_waiting_branch',
      planId: plan.id,
      status: 'WAITING_APPROVAL'
    })
    const ready = makeStep({
      id: 'step_ready_branch',
      planId: plan.id,
      status: 'READY'
    })

    const goal = makeGoal({ activePlanId: plan.id })
    const detail = toOrchestrationGoalDetailView({
      goal,
      plans: [plan],
      stepsByPlan: new Map([[plan.id, [waiting, ready, executing]]]),
      observations: [],
      evaluations: [],
      attemptsByStep: new Map()
    })

    expect(detail.operatorState.currentStepId).toBe('step_executing_branch')
    expect(detail.operatorState.currentStepStatus).toBe('EXECUTING')
    expect(detail.operatorState.leaseOwner).toBe('worker-branch-owner')
    expect(detail.operatorState.approvalId).toBe('approval-branch-1')
  })

  it('falls back through waiting, ready, and empty current steps', () => {
    const plan = makePlan({ id: 'plan_fallback_branch' })
    const waiting = makeStep({
      id: 'step_waiting_only_branch',
      planId: plan.id,
      status: 'HUMAN_HANDOFF'
    })
    const ready = makeStep({
      id: 'step_ready_only_branch',
      planId: plan.id,
      status: 'PENDING'
    })
    const done = makeStep({
      id: 'step_done_branch',
      planId: plan.id,
      status: 'SUCCEEDED'
    })

    const withWaiting = toOrchestrationGoalDetailView({
      goal: makeGoal({ activePlanId: plan.id }),
      plans: [plan],
      stepsByPlan: new Map([[plan.id, [ready, waiting]]]),
      observations: [],
      evaluations: [],
      attemptsByStep: new Map()
    })
    expect(withWaiting.operatorState.currentStepId).toBe(
      'step_waiting_only_branch'
    )

    const withReady = toOrchestrationGoalDetailView({
      goal: makeGoal({ activePlanId: plan.id }),
      plans: [plan],
      stepsByPlan: new Map([[plan.id, [done, ready]]]),
      observations: [],
      evaluations: [],
      attemptsByStep: new Map()
    })
    expect(withReady.operatorState.currentStepId).toBe('step_ready_only_branch')

    const withNone = toOrchestrationGoalDetailView({
      goal: makeGoal({ activePlanId: plan.id }),
      plans: [plan],
      stepsByPlan: new Map([[plan.id, [done]]]),
      observations: [],
      evaluations: [],
      attemptsByStep: new Map()
    })
    expect(withNone.operatorState.currentStepId).toBeNull()
    expect(withNone.operatorState.currentStepStatus).toBeNull()
    expect(withNone.operatorState.leaseUntil).toBeNull()
    expect(withNone.operatorState.approvalId).toBeNull()
  })

  it('computes deadline expiry and handoff requirements', () => {
    const plan = makePlan({ id: 'plan_handoff_branch' })
    const handoffStep = makeStep({
      id: 'step_handoff_branch',
      planId: plan.id,
      status: 'HUMAN_HANDOFF'
    })

    const expired = toOrchestrationGoalDetailView({
      goal: makeGoal({
        activePlanId: plan.id,
        status: 'EXECUTING',
        deadline: new Date('2020-01-01T00:00:00.000Z')
      }),
      plans: [plan],
      stepsByPlan: new Map([[plan.id, [handoffStep]]]),
      observations: [],
      evaluations: [],
      attemptsByStep: new Map()
    })
    expect(expired.operatorState.deadlineExpired).toBe(true)
    expect(expired.operatorState.handoffRequired).toBe(true)

    const goalHandoff = toOrchestrationGoalDetailView({
      goal: makeGoal({ status: 'HUMAN_HANDOFF', deadline: null }),
      plans: [],
      stepsByPlan: new Map(),
      observations: [],
      evaluations: [],
      attemptsByStep: new Map()
    })
    expect(goalHandoff.operatorState.handoffRequired).toBe(true)
    expect(goalHandoff.operatorState.deadlineExpired).toBe(false)

    const future = toOrchestrationGoalDetailView({
      goal: makeGoal({
        status: 'EXECUTING',
        deadline: new Date('2099-01-01T00:00:00.000Z')
      }),
      plans: [plan],
      stepsByPlan: new Map([
        [plan.id, [makeStep({ planId: plan.id, status: 'READY' })]]
      ]),
      observations: [],
      evaluations: [],
      attemptsByStep: new Map()
    })
    expect(future.operatorState.deadlineExpired).toBe(false)
    expect(future.operatorState.handoffRequired).toBe(false)
  })

  it('summarizes evidence verification and latest records', () => {
    const withRecords = toOrchestrationGoalDetailView({
      goal: makeGoal({ activePlanId: null }),
      plans: [],
      stepsByPlan: new Map(),
      observations: [
        makeObservation({
          id: 'observation_first_branch',
          createdAt: new Date('2026-09-25T09:00:00.000Z'),
          evidence: [{ source: 'audit', verified: true } as never]
        }),
        makeObservation({
          id: 'observation_last_branch',
          createdAt: new Date('2026-09-25T12:00:00.000Z'),
          evidence: [
            { source: 'audit', verified: true } as never,
            { source: 'audit', verified: false } as never
          ]
        })
      ],
      evaluations: [
        makeEvaluation({ result: 'blocked', reason: 'branch blocked' })
      ],
      attemptsByStep: new Map()
    })

    expect(withRecords.operatorState.evidenceCount).toBe(3)
    expect(withRecords.operatorState.verifiedEvidenceCount).toBe(2)
    expect(withRecords.operatorState.lastObservationAt).toBe(
      new Date('2026-09-25T12:00:00.000Z').toISOString()
    )
    expect(withRecords.operatorState.lastEvaluation).toMatchObject({
      result: 'blocked',
      reason: 'branch blocked'
    })
    expect(withRecords.replanCount).toBe(2)
  })

  it('reports empty operator state without plans or records', () => {
    const detail = toOrchestrationGoalDetailView({
      goal: makeGoal({ activePlanId: 'unknown-plan-branch' }),
      plans: [makePlan({ id: 'other-plan-branch' })],
      stepsByPlan: new Map(),
      observations: [],
      evaluations: [],
      attemptsByStep: new Map()
    })

    expect(detail.operatorState.activePlanVersion).toBeNull()
    expect(detail.operatorState.currentStepId).toBeNull()
    expect(detail.operatorState.evidenceCount).toBe(0)
    expect(detail.operatorState.verifiedEvidenceCount).toBe(0)
    expect(detail.operatorState.lastObservationAt).toBeNull()
    expect(detail.operatorState.lastEvaluation).toBeNull()
    expect(detail.plans[0]!.steps).toEqual([])
  })

  it('defaults active steps when the plan has no step entries', () => {
    const plan = makePlan({ id: 'plan_missing_steps_branch' })
    const detail = toOrchestrationGoalDetailView({
      goal: makeGoal({ activePlanId: plan.id }),
      plans: [plan],
      stepsByPlan: new Map(),
      observations: [],
      evaluations: [],
      attemptsByStep: new Map()
    })

    expect(detail.operatorState.activePlanVersion).toBe(1)
    expect(detail.operatorState.currentStepId).toBeNull()
    expect(detail.plans[0]!.steps).toEqual([])
  })
})
