import type {
  AttemptRecord,
  EvaluationRecord,
  Goal,
  ObservationRecord,
  Plan,
  PlanStep
} from '@cvg/agent-runtime'
import { redactSensitiveText } from '@cvg/shared'

const MAX_TEXT = 240

function safeText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null
  const redacted = redactSensitiveText(value.trim())
  return redacted.length > MAX_TEXT
    ? `${redacted.slice(0, MAX_TEXT)}…`
    : redacted
}

function iso(value: Date | null | undefined): string | null {
  return value?.toISOString() ?? null
}

export function toOrchestrationGoalView(goal: Goal) {
  return {
    id: goal.id,
    tenantId: goal.tenantId,
    status: goal.status,
    objective: safeText(goal.objective),
    correlationId: goal.correlationId,
    inboundMessageId: goal.inboundMessageId,
    conversationId: goal.conversationId,
    sessionId: goal.sessionId,
    activePlanId: goal.activePlanId,
    version: goal.version,
    lastReason: safeText(goal.lastReason),
    lastError: safeText(goal.lastError),
    deadline: iso(goal.deadline),
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
    budget: {
      maxSteps: goal.budget.maxSteps,
      maxReplans: goal.budget.maxReplans,
      maxIterations: goal.budget.maxIterations,
      maxModelCalls: goal.budget.maxModelCalls,
      maxToolCalls: goal.budget.maxToolCalls,
      maxDurationMs: goal.budget.maxDurationMs,
      maxCostUsd: goal.budget.maxCostUsd,
      usage: goal.budget.usage
    }
  }
}

function toPlanView(plan: Plan) {
  return {
    id: plan.id,
    goalId: plan.goalId,
    tenantId: plan.tenantId,
    version: plan.version,
    parentPlanId: plan.parentPlanId,
    triggeringEvaluationId: plan.triggeringEvaluationId,
    status: plan.status,
    reason: safeText(plan.reason),
    fingerprint: plan.fingerprint,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString()
  }
}

function toStepView(step: PlanStep) {
  return {
    id: step.id,
    goalId: step.goalId,
    planId: step.planId,
    type: step.type,
    description: safeText(step.description),
    dependencies: [...step.dependencies],
    requiredCapabilities: [...step.requiredCapabilities],
    riskLevel: step.riskLevel,
    approvalRequirement: step.approvalRequirement,
    status: step.status,
    attemptCount: step.attemptCount,
    approvalId: step.approvalId,
    toolId: step.toolId,
    toolVersion: step.toolVersion,
    resultHash: step.resultHash,
    lastError: safeText(step.lastError),
    startedAt: iso(step.startedAt),
    completedAt: iso(step.completedAt),
    leaseOwner: step.leaseOwner,
    leaseUntil: iso(step.leaseUntil),
    version: step.version,
    createdAt: step.createdAt.toISOString(),
    updatedAt: step.updatedAt.toISOString()
  }
}

function toObservationView(observation: ObservationRecord) {
  return {
    id: observation.id,
    goalId: observation.goalId,
    planId: observation.planId,
    stepId: observation.stepId,
    kind: observation.kind,
    resultDigest: observation.resultDigest,
    evidence: observation.evidence.map((item) => ({
      source: item.source,
      reference: safeText(item.reference),
      verified: item.verified,
      key: item.key ?? null,
      digest: item.digest ?? null
    })),
    createdAt: observation.createdAt.toISOString()
  }
}

function toEvaluationView(evaluation: EvaluationRecord) {
  return {
    id: evaluation.id,
    goalId: evaluation.goalId,
    planId: evaluation.planId,
    stepId: evaluation.stepId,
    evaluatorType: evaluation.evaluatorType,
    result: evaluation.result,
    reason: safeText(evaluation.reason),
    evidence: evaluation.evidence.map((item) => ({
      source: item.source,
      reference: safeText(item.reference),
      verified: item.verified,
      key: item.key ?? null,
      digest: item.digest ?? null
    })),
    createdAt: evaluation.createdAt.toISOString()
  }
}

function toAttemptView(attempt: AttemptRecord) {
  return {
    id: attempt.id,
    goalId: attempt.goalId,
    planId: attempt.planId,
    stepId: attempt.stepId,
    workerId: attempt.workerId,
    correlationId: attempt.correlationId,
    startedAt: attempt.startedAt.toISOString(),
    finishedAt: iso(attempt.finishedAt),
    outcome: attempt.outcome,
    errorClass: safeText(attempt.errorClass)
  }
}

export function toOrchestrationGoalDetailView(input: {
  goal: Goal
  plans: Plan[]
  stepsByPlan: Map<string, PlanStep[]>
  observations: ObservationRecord[]
  evaluations: EvaluationRecord[]
  attemptsByStep: Map<string, AttemptRecord[]>
}) {
  const activePlan = input.plans.find(
    (plan) => plan.id === input.goal.activePlanId
  )
  const activeSteps = activePlan
    ? (input.stepsByPlan.get(activePlan.id) ?? [])
    : []
  const currentStep =
    activeSteps.find((step) => step.status === 'EXECUTING') ??
    activeSteps.find((step) =>
      [
        'WAITING_APPROVAL',
        'WAITING_EXTERNAL',
        'HUMAN_HANDOFF',
        'UNCERTAIN'
      ].includes(step.status)
    ) ??
    activeSteps.find((step) => ['READY', 'PENDING'].includes(step.status)) ??
    null
  const evidence = input.observations.flatMap(
    (observation) => observation.evidence
  )
  return {
    ...toOrchestrationGoalView(input.goal),
    successCriteria: input.goal.successCriteria.map((criterion) =>
      criterion.kind === 'COMPOSITE'
        ? { kind: criterion.kind, operator: criterion.operator }
        : {
            kind: criterion.kind,
            source: criterion.source,
            ...(criterion.kind === 'EVENT'
              ? { eventType: criterion.eventType }
              : {}),
            ...(criterion.kind === 'STATE'
              ? { resourceType: criterion.resourceType, field: criterion.field }
              : {}),
            ...(criterion.kind === 'FACT' ? { key: criterion.key } : {}),
            ...(criterion.kind === 'SEMANTIC'
              ? { description: safeText(criterion.description) }
              : {})
          }
    ),
    executionSnapshot: input.goal.executionSnapshot,
    replanCount: input.goal.budget.usage.replans,
    operatorState: {
      state: input.goal.status,
      reason: safeText(input.goal.lastReason),
      error: safeText(input.goal.lastError),
      deadline: iso(input.goal.deadline),
      deadlineExpired:
        input.goal.deadline !== null && input.goal.deadline <= new Date(),
      activePlanVersion: activePlan?.version ?? null,
      currentStepId: currentStep?.id ?? null,
      currentStepStatus: currentStep?.status ?? null,
      leaseOwner: currentStep?.leaseOwner ?? null,
      leaseUntil: iso(currentStep?.leaseUntil),
      approvalId: currentStep?.approvalId ?? null,
      handoffRequired:
        input.goal.status === 'HUMAN_HANDOFF' ||
        currentStep?.status === 'HUMAN_HANDOFF',
      evidenceCount: evidence.length,
      verifiedEvidenceCount: evidence.filter((item) => item.verified).length,
      lastObservationAt:
        input.observations.at(-1)?.createdAt.toISOString() ?? null,
      lastEvaluation: input.evaluations.at(-1)
        ? {
            result: input.evaluations.at(-1)!.result,
            reason: safeText(input.evaluations.at(-1)!.reason),
            createdAt: input.evaluations.at(-1)!.createdAt.toISOString()
          }
        : null
    },
    plans: input.plans.map((plan) => ({
      ...toPlanView(plan),
      steps: (input.stepsByPlan.get(plan.id) ?? []).map((step) => ({
        ...toStepView(step),
        attempts: (input.attemptsByStep.get(step.id) ?? []).map(toAttemptView)
      }))
    })),
    observations: input.observations.map(toObservationView),
    evaluations: input.evaluations.map(toEvaluationView)
  }
}
