import { createHash } from 'node:crypto'
import { z } from 'zod'
import {
  canonicalizeJson,
  CorrelationIdSchema,
  createDomainId,
  type DataClassification,
  DataClassificationSchema
} from '@cvg/shared'
import {
  CapabilitySchema,
  ToolRiskLevelSchema,
  capabilityRisk,
  type Capability,
  type ToolRiskLevel
} from '@cvg/policy-engine'
import type { ModelInput, StructuredOutputContract } from '@cvg/model-gateway'
import type { Telemetry } from '@cvg/observability'
import type { GovernedResource } from './contracts.ts'

/**
 * Durable Goal/Plan/Step orchestration contracts.
 *
 * The orchestrator owns coordination and state transitions. It never owns a
 * credential or an external effect. A caller must inject a step executor that
 * routes every intent through the governed runtime and its effect journal.
 */

const tenantIdPattern = /^tenant_[0-9a-f-]{36}$/
const identifierPattern = /^[a-z][a-z0-9:_-]{0,159}$/i

export const OrchestrationTenantIdSchema = z.string().regex(tenantIdPattern)
export type OrchestrationTenantId = z.infer<typeof OrchestrationTenantIdSchema>

export const OrchestrationIdentifierSchema = z.string().regex(identifierPattern)
export type OrchestrationIdentifier = z.infer<
  typeof OrchestrationIdentifierSchema
>

export const GoalStatusSchema = z.enum([
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
  'COMPLETED',
  'BLOCKED',
  'FAILED',
  'CANCELLED',
  'BUDGET_EXHAUSTED',
  'LOOP_DETECTED'
])
export type GoalStatus = z.infer<typeof GoalStatusSchema>

export const PlanStatusSchema = z.enum([
  'DRAFT',
  'ACTIVE',
  'SUPERSEDED',
  'COMPLETED',
  'FAILED'
])
export type PlanStatus = z.infer<typeof PlanStatusSchema>

export const PlanStepStatusSchema = z.enum([
  'PENDING',
  'READY',
  'EXECUTING',
  'WAITING_APPROVAL',
  'WAITING_EXTERNAL',
  'HUMAN_HANDOFF',
  'UNCERTAIN',
  'SUCCEEDED',
  'FAILED',
  'BLOCKED',
  'CANCELLED',
  'SKIPPED'
])
export type PlanStepStatus = z.infer<typeof PlanStepStatusSchema>

export const ApprovalRequirementSchema = z.enum([
  'none',
  'approval',
  'human_handoff'
])
export type ApprovalRequirement = z.infer<typeof ApprovalRequirementSchema>

export const GoalTerminalStatusSchema = z.enum([
  'COMPLETED',
  'BLOCKED',
  'FAILED',
  'CANCELLED',
  'BUDGET_EXHAUSTED',
  'LOOP_DETECTED'
])
export type GoalTerminalStatus = z.infer<typeof GoalTerminalStatusSchema>

export const DEFAULT_ORCHESTRATION_BUDGET: Readonly<ExecutionBudgetLimits> =
  Object.freeze({
    maxSteps: 12,
    maxReplans: 3,
    maxIterations: 256,
    maxModelCalls: 8,
    maxToolCalls: 10,
    maxDurationMs: 120_000,
    maxCostUsd: 2
  })

export interface ExecutionBudgetLimits {
  maxSteps: number
  maxReplans: number
  /** Persisted loop guard; unlike a process-local iteration counter it survives restart. */
  maxIterations: number
  maxModelCalls: number
  maxToolCalls: number
  maxDurationMs: number
  maxCostUsd: number
}

export interface ExecutionBudgetUsage {
  steps: number
  replans: number
  iterations: number
  modelCalls: number
  toolCalls: number
  costUsd: number
}

export interface ExecutionBudget extends ExecutionBudgetLimits {
  usage: ExecutionBudgetUsage
}

export const ExecutionBudgetInputSchema = z
  .object({
    maxSteps: z.number().int().min(1).max(10_000).optional(),
    maxReplans: z.number().int().min(0).max(1_000).optional(),
    maxIterations: z.number().int().min(1).max(100_000).optional(),
    maxModelCalls: z.number().int().min(0).max(10_000).optional(),
    maxToolCalls: z.number().int().min(0).max(10_000).optional(),
    maxDurationMs: z.number().int().min(100).max(86_400_000).optional(),
    maxCostUsd: z.number().min(0).max(1_000_000).optional()
  })
  .strict()
export type ExecutionBudgetInput = z.input<typeof ExecutionBudgetInputSchema>

export type SuccessCriterionSource =
  | 'operational_state'
  | 'effect_journal'
  | 'outbox'
  | 'audit'
  | 'human_record'

export interface FactSuccessCriterion {
  kind: 'FACT'
  key: string
  expected: unknown
  source: SuccessCriterionSource
}

export interface EventSuccessCriterion {
  kind: 'EVENT'
  eventType: string
  source: SuccessCriterionSource
  correlationId?: string
}

export interface StateSuccessCriterion {
  kind: 'STATE'
  resourceType: string
  resourceId?: string
  field: string
  expected: unknown
  source: SuccessCriterionSource
}

export interface SemanticSuccessCriterion {
  kind: 'SEMANTIC'
  description: string
  requiredEvidenceKeys: string[]
  source: SuccessCriterionSource
}

export interface CompositeSuccessCriterion {
  kind: 'COMPOSITE'
  operator: 'all' | 'any'
  criteria: SuccessCriterion[]
}

export type SuccessCriterion =
  | FactSuccessCriterion
  | EventSuccessCriterion
  | StateSuccessCriterion
  | SemanticSuccessCriterion
  | CompositeSuccessCriterion

export interface ExecutionSnapshot {
  agentVersion: string | null
  promptVersion: string | null
  policyVersion: string | null
  modelProfile: string | null
  toolVersions: Record<string, string>
  /** Explicit runtime binding prevents legacy/durable continuation mixing. */
  runtimeMode?: 'kernel' | 'published-agent' | 'unknown'
  runtimeVersion?: string | null
}

export interface Goal {
  id: string
  tenantId: OrchestrationTenantId
  inboundMessageId: string | null
  sessionId: string | null
  conversationId: string | null
  objective: string
  successCriteria: SuccessCriterion[]
  status: GoalStatus
  createdAt: Date
  updatedAt: Date
  deadline: Date | null
  budget: ExecutionBudget
  correlationId: string
  version: number
  activePlanId: string | null
  executionSnapshot: ExecutionSnapshot
  /**
   * Runtime-owned JSON context needed to recreate an initial plan after a
   * worker restart. It is intentionally opaque to the orchestration engine;
   * the owning runtime validates and interprets it.
   */
  plannerContext?: unknown
  replanFingerprints: string[]
  lastReason: string | null
  lastError: string | null
}

export interface OrchestratedStepIntent {
  capability: Capability
  action: string
  resource: GovernedResource
  dataClassification: DataClassification
  modelMessages: ModelInput | null
  structuredOutput: StructuredOutputContract | null
  idempotencyKey: string | null
}

export interface PlanStep {
  id: string
  goalId: string
  planId: string
  tenantId: OrchestrationTenantId
  type: string
  description: string
  dependencies: string[]
  requiredCapabilities: Capability[]
  riskLevel: ToolRiskLevel
  approvalRequirement: ApprovalRequirement
  status: PlanStepStatus
  attemptCount: number
  input: unknown
  inputHash: string
  expectedOutcome: unknown
  timeoutMs: number
  intent: OrchestratedStepIntent
  approvalId: string | null
  toolId: string | null
  toolVersion: string | null
  resultHash: string | null
  lastError: string | null
  startedAt: Date | null
  completedAt: Date | null
  leaseOwner: string | null
  leaseToken: string | null
  leaseUntil: Date | null
  version: number
  createdAt: Date
  updatedAt: Date
}

export interface Plan {
  id: string
  goalId: string
  tenantId: OrchestrationTenantId
  version: number
  parentPlanId: string | null
  reason: string
  /** Evaluation record that caused this plan, when it is a replan. */
  triggeringEvaluationId: string | null
  status: PlanStatus
  createdAt: Date
  updatedAt: Date
  fingerprint: string
}

export interface PlanStepDraft {
  id?: string
  type: string
  description: string
  dependencies?: string[]
  requiredCapabilities: Capability[]
  riskLevel: ToolRiskLevel
  approvalRequirement: ApprovalRequirement
  input?: unknown
  expectedOutcome?: unknown
  timeoutMs?: number
  intent: OrchestratedStepIntent
  toolId?: string
  toolVersion?: string
}

export interface PlanDraft {
  reason: string
  steps: PlanStepDraft[]
}

export interface StepLease {
  tenantId: OrchestrationTenantId
  goalId: string
  planId: string
  stepId: string
  workerId: string
  leaseToken: string
  attemptId: string
  leaseUntil: Date
  goalVersion: number
  stepVersion: number
}

export interface OperationalEvidence {
  source: SuccessCriterionSource
  reference: string
  verified: boolean
  key?: string
  digest?: string
  eventType?: string
  correlationId?: string
}

function expectedValueDigest(value: unknown): string {
  return createHash('sha256').update(canonicalizeJson(value)).digest('hex')
}

/**
 * Evaluates persisted operational evidence against a Goal's declared success
 * criteria. Unsupported or incomplete evidence stays unsatisfied so a goal
 * cannot become COMPLETED because a step merely returned successfully.
 */
export function evaluateSuccessCriteria(
  criteria: SuccessCriterion[],
  evidence: OperationalEvidence[]
): { satisfied: boolean; unsatisfied: number } {
  const verified = evidence.filter((item) => item.verified)
  const matches = (criterion: SuccessCriterion): boolean => {
    switch (criterion.kind) {
      case 'EVENT':
        return verified.some(
          (item) =>
            item.source === criterion.source &&
            (item.eventType === criterion.eventType ||
              item.key === criterion.eventType) &&
            (criterion.correlationId === undefined ||
              item.correlationId === criterion.correlationId)
        )
      case 'SEMANTIC':
        return criterion.requiredEvidenceKeys.every((key) =>
          verified.some((item) => item.key === key)
        )
      case 'FACT':
      case 'STATE':
        return verified.some(
          (item) =>
            item.source === criterion.source &&
            item.key ===
              (criterion.kind === 'FACT'
                ? criterion.key
                : `${criterion.resourceType}:${criterion.resourceId ?? '*'}:${criterion.field}`) &&
            item.digest === expectedValueDigest(criterion.expected)
        )
      case 'COMPOSITE':
        return criterion.operator === 'all'
          ? criterion.criteria.every((nested) => matches(nested))
          : criterion.criteria.some((nested) => matches(nested))
    }
  }
  const unsatisfied = criteria.filter((criterion) => !matches(criterion)).length
  return { satisfied: unsatisfied === 0, unsatisfied }
}

export interface StepExecutionResult {
  outcome:
    | 'succeeded'
    | 'approval_required'
    | 'waiting_external'
    | 'human_handoff'
    | 'uncertain'
    | 'failed'
  reason: string
  resultDigest?: string
  evidence?: OperationalEvidence[]
  approvalId?: string
  modelCalls?: number
  toolCalls?: number
  costUsd?: number
}

export interface GoalEvaluation {
  result: 'satisfied' | 'not_satisfied' | 'unknown' | 'blocked'
  reason: string
  evidence: OperationalEvidence[]
  fingerprint?: string
  id?: string
}

export interface ObservationRecord {
  id: string
  tenantId: OrchestrationTenantId
  goalId: string
  planId: string
  stepId: string | null
  kind: 'step_result' | 'external_state' | 'reconciliation'
  resultDigest: string | null
  evidence: OperationalEvidence[]
  createdAt: Date
}

export interface AttemptRecord {
  id: string
  tenantId: OrchestrationTenantId
  goalId: string
  planId: string
  stepId: string
  workerId: string
  leaseToken: string
  startedAt: Date
  finishedAt: Date | null
  outcome: string | null
  errorClass: string | null
  correlationId: string
}

export interface EvaluationRecord {
  id: string
  tenantId: OrchestrationTenantId
  goalId: string
  planId: string
  stepId: string | null
  evaluatorType: string
  criteria: SuccessCriterion[]
  evidence: OperationalEvidence[]
  result: GoalEvaluation['result']
  reason: string
  createdAt: Date
}

export interface CreateGoalInput {
  tenantId: OrchestrationTenantId
  inboundMessageId?: string
  sessionId?: string
  conversationId?: string
  objective: string
  successCriteria: SuccessCriterion[]
  deadline?: Date
  budget?: ExecutionBudgetInput
  correlationId: string
  executionSnapshot?: Partial<ExecutionSnapshot>
  plannerContext?: unknown
}

export interface ActivatePlanInput {
  tenantId: OrchestrationTenantId
  goalId: string
  expectedGoalVersion: number
  planVersion: number
  parentPlanId: string | null
  reason: string
  steps: PlanStepDraft[]
  consumeReplan: boolean
  fingerprint: string
  triggeringEvaluationId?: string | null
}

export interface ActivatePlanResult {
  goal: Goal
  plan: Plan
  steps: PlanStep[]
}

export interface TransitionGoalInput {
  tenantId: OrchestrationTenantId
  goalId: string
  expectedVersion: number
  target: GoalStatus
  reason: string
  lastError?: string | null
}

export interface ClaimStepInput {
  tenantId: OrchestrationTenantId
  goalId: string
  planId: string
  stepId: string
  workerId: string
  expectedGoalVersion: number
  now: Date
  leaseMs: number
}

export interface ClaimedStep {
  lease: StepLease
  goal: Goal
  plan: Plan
  step: PlanStep
}

export interface SettleStepInput {
  lease: StepLease
  outcome: Exclude<StepExecutionResult['outcome'], 'succeeded'> | 'succeeded'
  resultDigest: string | null
  reason: string
  approvalId: string | null
  now: Date
  modelCalls: number
  toolCalls: number
  costUsd: number
  /** Persisted in the same transaction as the state transition. */
  observation?: {
    kind: ObservationRecord['kind']
    resultDigest: string | null
    evidence: OperationalEvidence[]
  }
}

export interface ConsumeIterationInput {
  tenantId: OrchestrationTenantId
  goalId: string
  expectedVersion: number
  now: Date
}

export interface SettledStep {
  goal: Goal
  step: PlanStep
}

export interface ResolveWaitingApprovalInput {
  tenantId: OrchestrationTenantId
  goalId: string
  planId: string
  stepId: string
  expectedGoalVersion: number
  expectedStepVersion: number
  approvalId: string
  target: 'READY' | 'CANCELLED'
  reason: string
  now: Date
}

export interface RecoverExpiredLeaseInput {
  tenantId: OrchestrationTenantId
  stepId: string
  /** Snapshot captured by listExpiredLeases; recovery is CAS/fenced. */
  leaseToken: string | null
  stepVersion: number
  now: Date
  decision: 'retry' | 'uncertain'
  reason: string
}

export interface GoalPlanStore {
  createGoal(input: CreateGoalInput): Promise<Goal>
  getGoal(tenantId: OrchestrationTenantId, goalId: string): Promise<Goal | null>
  getGoalByCorrelation(
    tenantId: OrchestrationTenantId,
    correlationId: string
  ): Promise<Goal | null>
  getGoalByInboundMessage(
    tenantId: OrchestrationTenantId,
    inboundMessageId: string
  ): Promise<Goal | null>
  listGoals(
    tenantId: OrchestrationTenantId,
    options?: GoalListOptions
  ): Promise<Goal[]>
  listRunnableGoals(tenantId?: OrchestrationTenantId): Promise<Goal[]>
  transitionGoal(input: TransitionGoalInput): Promise<Goal>
  consumeIteration(input: ConsumeIterationInput): Promise<Goal>
  activatePlan(input: ActivatePlanInput): Promise<ActivatePlanResult>
  getPlan(tenantId: OrchestrationTenantId, planId: string): Promise<Plan | null>
  transitionPlan(input: {
    tenantId: OrchestrationTenantId
    planId: string
    target: PlanStatus
    reason: string
  }): Promise<Plan>
  getActivePlan(
    tenantId: OrchestrationTenantId,
    goalId: string
  ): Promise<Plan | null>
  listPlans(tenantId: OrchestrationTenantId, goalId: string): Promise<Plan[]>
  listSteps(
    tenantId: OrchestrationTenantId,
    planId: string
  ): Promise<PlanStep[]>
  getStep(
    tenantId: OrchestrationTenantId,
    stepId: string
  ): Promise<PlanStep | null>
  resolveWaitingApproval(
    input: ResolveWaitingApprovalInput
  ): Promise<SettledStep>
  claimStep(input: ClaimStepInput): Promise<ClaimedStep | null>
  heartbeatStep(input: {
    lease: StepLease
    now: Date
    leaseMs: number
  }): Promise<StepLease | null>
  settleStep(input: SettleStepInput): Promise<SettledStep>
  listExpiredLeases(
    tenantId: OrchestrationTenantId,
    now: Date
  ): Promise<PlanStep[]>
  recoverExpiredLease(input: RecoverExpiredLeaseInput): Promise<SettledStep>
  recordObservation(
    input: Omit<ObservationRecord, 'id' | 'createdAt'> & { createdAt?: Date }
  ): Promise<ObservationRecord>
  listObservations(
    tenantId: OrchestrationTenantId,
    goalId: string
  ): Promise<ObservationRecord[]>
  recordEvaluation(
    input: Omit<EvaluationRecord, 'id' | 'createdAt'> & { createdAt?: Date }
  ): Promise<EvaluationRecord>
  listEvaluations(
    tenantId: OrchestrationTenantId,
    goalId: string
  ): Promise<EvaluationRecord[]>
  listAttempts(
    tenantId: OrchestrationTenantId,
    stepId: string
  ): Promise<AttemptRecord[]>
}

export type GoalStore = GoalPlanStore

/**
 * Goal states that a worker may safely revisit after a restart. Waiting,
 * handoff and uncertain states require an explicit continuation or
 * reconciliation signal and must never be replayed by a blind sweep.
 */
export const RUNNABLE_GOAL_STATUSES: readonly GoalStatus[] = [
  'OBSERVING',
  'UNDERSTANDING',
  'PLANNING',
  'GOVERNING',
  'EXECUTING',
  'OBSERVING_RESULT',
  'EVALUATING',
  'REPLANNING'
]

export function isRunnableGoalStatus(status: GoalStatus): boolean {
  return RUNNABLE_GOAL_STATUSES.includes(status)
}

export interface GoalRecoverySweepResult {
  inspected: number
  resumed: number
  skipped: number
  completed: number
  failures: number
}

export interface GoalListOptions {
  statuses?: readonly GoalStatus[]
  limit?: number
  offset?: number
}

function normalizeGoalListOptions(options: GoalListOptions = {}): {
  statuses?: readonly GoalStatus[]
  limit: number
  offset: number
} {
  const limit = options.limit ?? 50
  const offset = options.offset ?? 0
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new OrchestrationError(
      'invalid_plan',
      'Goal list limit must be between 1 and 100'
    )
  }
  if (!Number.isInteger(offset) || offset < 0) {
    throw new OrchestrationError(
      'invalid_plan',
      'Goal list offset must be a non-negative integer'
    )
  }
  const statuses = options.statuses?.map((status) =>
    GoalStatusSchema.parse(status)
  )
  return { ...(statuses ? { statuses } : {}), limit, offset }
}

export type OrchestrationErrorCode =
  | 'not_found'
  | 'tenant_violation'
  | 'conflict'
  | 'invalid_transition'
  | 'invalid_plan'
  | 'lease_lost'
  | 'budget_exhausted'
  | 'loop_detected'

export class OrchestrationError extends Error {
  readonly code: OrchestrationErrorCode

  constructor(code: OrchestrationErrorCode, message: string) {
    super(message)
    this.name = 'OrchestrationError'
    this.code = code
  }
}

const goalTransitions: Readonly<Record<GoalStatus, readonly GoalStatus[]>> = {
  OBSERVING: [
    'UNDERSTANDING',
    'PLANNING',
    'BUDGET_EXHAUSTED',
    'LOOP_DETECTED',
    'WAITING_EXTERNAL',
    'HUMAN_HANDOFF',
    'CANCELLED'
  ],
  UNDERSTANDING: [
    'PLANNING',
    'BUDGET_EXHAUSTED',
    'LOOP_DETECTED',
    'BLOCKED',
    'WAITING_EXTERNAL',
    'HUMAN_HANDOFF',
    'CANCELLED'
  ],
  PLANNING: [
    'GOVERNING',
    'REPLANNING',
    'BLOCKED',
    'BUDGET_EXHAUSTED',
    'LOOP_DETECTED',
    'CANCELLED'
  ],
  GOVERNING: [
    'WAITING_APPROVAL',
    'EXECUTING',
    'WAITING_EXTERNAL',
    'HUMAN_HANDOFF',
    'FAILED',
    'BUDGET_EXHAUSTED',
    'LOOP_DETECTED',
    'CANCELLED'
  ],
  WAITING_APPROVAL: [
    'GOVERNING',
    'PENDING_RETURN',
    'HUMAN_HANDOFF',
    'UNCERTAIN',
    'CANCELLED'
  ],
  EXECUTING: [
    'GOVERNING',
    'OBSERVING_RESULT',
    'WAITING_APPROVAL',
    'WAITING_EXTERNAL',
    'HUMAN_HANDOFF',
    'UNCERTAIN',
    'FAILED',
    'BLOCKED',
    'BUDGET_EXHAUSTED',
    'LOOP_DETECTED',
    'CANCELLED'
  ],
  OBSERVING_RESULT: [
    'EVALUATING',
    'UNCERTAIN',
    'WAITING_EXTERNAL',
    'HUMAN_HANDOFF',
    'FAILED',
    'LOOP_DETECTED',
    'BUDGET_EXHAUSTED'
  ],
  EVALUATING: [
    'EXECUTING',
    'COMPLETED',
    'REPLANNING',
    'BLOCKED',
    'WAITING_EXTERNAL',
    'HUMAN_HANDOFF',
    'FAILED',
    'LOOP_DETECTED',
    'BUDGET_EXHAUSTED'
  ],
  REPLANNING: [
    'PLANNING',
    'BLOCKED',
    'LOOP_DETECTED',
    'BUDGET_EXHAUSTED',
    'CANCELLED'
  ],
  WAITING_EXTERNAL: [
    'GOVERNING',
    'EXECUTING',
    'HUMAN_HANDOFF',
    'CANCELLED',
    'FAILED'
  ],
  HUMAN_HANDOFF: ['PENDING_RETURN', 'OBSERVING', 'CANCELLED'],
  PENDING_RETURN: ['OBSERVING', 'GOVERNING', 'HUMAN_HANDOFF', 'CANCELLED'],
  UNCERTAIN: ['WAITING_EXTERNAL', 'HUMAN_HANDOFF', 'FAILED', 'CANCELLED'],
  COMPLETED: [],
  BLOCKED: ['REPLANNING', 'HUMAN_HANDOFF', 'CANCELLED'],
  FAILED: ['REPLANNING', 'HUMAN_HANDOFF', 'CANCELLED'],
  CANCELLED: [],
  BUDGET_EXHAUSTED: ['HUMAN_HANDOFF', 'CANCELLED'],
  LOOP_DETECTED: ['HUMAN_HANDOFF', 'CANCELLED']
}

const planTransitions: Readonly<Record<PlanStatus, readonly PlanStatus[]>> = {
  DRAFT: ['ACTIVE', 'FAILED'],
  ACTIVE: ['SUPERSEDED', 'COMPLETED', 'FAILED'],
  SUPERSEDED: [],
  COMPLETED: [],
  FAILED: []
}

const stepTransitions: Readonly<
  Record<PlanStepStatus, readonly PlanStepStatus[]>
> = {
  PENDING: ['READY', 'EXECUTING', 'BLOCKED', 'CANCELLED', 'SKIPPED'],
  READY: ['EXECUTING', 'BLOCKED', 'CANCELLED', 'SKIPPED'],
  EXECUTING: [
    'READY',
    'WAITING_APPROVAL',
    'WAITING_EXTERNAL',
    'HUMAN_HANDOFF',
    'UNCERTAIN',
    'SUCCEEDED',
    'FAILED',
    'BLOCKED',
    'CANCELLED'
  ],
  WAITING_APPROVAL: ['READY', 'EXECUTING', 'HUMAN_HANDOFF', 'CANCELLED'],
  WAITING_EXTERNAL: ['READY', 'EXECUTING', 'HUMAN_HANDOFF', 'CANCELLED'],
  HUMAN_HANDOFF: ['READY', 'EXECUTING', 'CANCELLED'],
  UNCERTAIN: ['HUMAN_HANDOFF', 'CANCELLED'],
  SUCCEEDED: [],
  FAILED: ['READY', 'BLOCKED', 'CANCELLED'],
  BLOCKED: ['READY', 'CANCELLED'],
  CANCELLED: [],
  SKIPPED: []
}

export function assertGoalTransition(from: GoalStatus, to: GoalStatus): void {
  if (from === to) return
  if (!goalTransitions[from].includes(to)) {
    throw new OrchestrationError(
      'invalid_transition',
      `Goal cannot transition from ${from} to ${to}`
    )
  }
}

export function assertPlanTransition(from: PlanStatus, to: PlanStatus): void {
  if (from === to) return
  if (!planTransitions[from].includes(to)) {
    throw new OrchestrationError(
      'invalid_transition',
      `Plan cannot transition from ${from} to ${to}`
    )
  }
}

export function assertPlanStepTransition(
  from: PlanStepStatus,
  to: PlanStepStatus
): void {
  if (from === to) return
  if (!stepTransitions[from].includes(to)) {
    throw new OrchestrationError(
      'invalid_transition',
      `Plan step cannot transition from ${from} to ${to}`
    )
  }
}

export function isTerminalGoalStatus(
  status: GoalStatus
): status is GoalTerminalStatus {
  return GoalTerminalStatusSchema.safeParse(status).success
}

export interface PlanGraphValidation {
  topologicalOrder: string[]
  fingerprint: string
}

function draftStepId(step: PlanStepDraft, index: number): string {
  return step.id ?? `step-${index}`
}

function hashCanonical(value: unknown): string {
  return createHash('sha256')
    .update(canonicalizeJson(value), 'utf8')
    .digest('hex')
}

function validateTenant(value: string): OrchestrationTenantId {
  return OrchestrationTenantIdSchema.parse(value)
}

function safeHash(value: unknown): string {
  try {
    return hashCanonical(value)
  } catch {
    throw new OrchestrationError(
      'invalid_plan',
      'Plan input and expected outcome must be canonical JSON values'
    )
  }
}

const PLAN_RISK_RANK: Readonly<Record<ToolRiskLevel, number>> = Object.freeze({
  READ_ONLY: 0,
  LOW_RISK_WRITE: 1,
  MEDIUM_RISK_WRITE: 2,
  HIGH_RISK_WRITE: 3,
  ADMIN: 4
})

function riskCoversCapability(
  declared: ToolRiskLevel,
  capability: Capability
): boolean {
  return PLAN_RISK_RANK[declared] >= PLAN_RISK_RANK[capabilityRisk(capability)]
}

/** Validates all graph invariants before a plan can become ACTIVE. */
export function validatePlanGraph(
  plan: Pick<Plan, 'id' | 'goalId' | 'tenantId' | 'version'>,
  drafts: readonly PlanStepDraft[]
): PlanGraphValidation {
  validateTenant(plan.tenantId)
  OrchestrationIdentifierSchema.parse(plan.id)
  OrchestrationIdentifierSchema.parse(plan.goalId)
  if (!Number.isInteger(plan.version) || plan.version < 1) {
    throw new OrchestrationError(
      'invalid_plan',
      'Plan version must be positive'
    )
  }
  if (drafts.length === 0 || drafts.length > 1_000) {
    throw new OrchestrationError(
      'invalid_plan',
      'Plan must contain between one and one thousand steps'
    )
  }

  const ids = new Set<string>()
  for (const [index, step] of drafts.entries()) {
    const id = draftStepId(step, index)
    if (ids.has(id)) {
      throw new OrchestrationError(
        'invalid_plan',
        `Duplicate plan step id: ${id}`
      )
    }
    ids.add(id)
    if (step.dependencies && step.dependencies.length > 64) {
      throw new OrchestrationError(
        'invalid_plan',
        `Plan step ${id} has too many dependencies`
      )
    }
    if (step.dependencies?.includes(id)) {
      throw new OrchestrationError(
        'invalid_plan',
        `Plan step ${id} cannot depend on itself`
      )
    }
    if (step.requiredCapabilities.length === 0) {
      throw new OrchestrationError(
        'invalid_plan',
        `Plan step ${id} must declare at least one capability`
      )
    }
    for (const dependency of step.dependencies ?? []) {
      if (
        !drafts.some(
          (candidate, candidateIndex) =>
            draftStepId(candidate, candidateIndex) === dependency
        )
      ) {
        throw new OrchestrationError(
          'invalid_plan',
          `Plan step ${id} depends on unknown step ${dependency}`
        )
      }
    }
    if (
      step.timeoutMs !== undefined &&
      (!Number.isInteger(step.timeoutMs) || step.timeoutMs < 100)
    ) {
      throw new OrchestrationError(
        'invalid_plan',
        `Plan step ${id} timeout must be at least 100ms`
      )
    }
    CapabilitySchema.array().parse(step.requiredCapabilities)
    ToolRiskLevelSchema.parse(step.riskLevel)
    ApprovalRequirementSchema.parse(step.approvalRequirement)
    DataClassificationSchema.parse(step.intent.dataClassification)
    const intentCapability = CapabilitySchema.parse(step.intent.capability)
    if (!step.requiredCapabilities.includes(intentCapability)) {
      throw new OrchestrationError(
        'invalid_plan',
        `Plan step ${id} intent capability ${intentCapability} is not declared in requiredCapabilities`
      )
    }
    if (!riskCoversCapability(step.riskLevel, intentCapability)) {
      throw new OrchestrationError(
        'invalid_plan',
        `Plan step ${id} risk ${step.riskLevel} cannot cover capability ${intentCapability}`
      )
    }
    if (
      step.intent.resource.tenantId !== undefined &&
      step.intent.resource.tenantId !== plan.tenantId
    ) {
      throw new OrchestrationError(
        'invalid_plan',
        `Plan step ${id} resource tenant does not match the plan tenant`
      )
    }
  }

  const normalizedDependencies = new Map<string, string[]>()
  for (const [index, step] of drafts.entries()) {
    const actualId = draftStepId(step, index)
    const dependencies = [...(step.dependencies ?? [])].sort()
    for (const dependency of dependencies) {
      if (!ids.has(dependency)) {
        throw new OrchestrationError(
          'invalid_plan',
          `Plan step ${actualId} depends on unknown step ${dependency}`
        )
      }
    }
    normalizedDependencies.set(actualId, dependencies)
  }

  const visiting = new Set<string>()
  const visited = new Set<string>()
  const order: string[] = []
  const visit = (id: string): void => {
    if (visited.has(id)) return
    if (visiting.has(id)) {
      throw new OrchestrationError(
        'invalid_plan',
        `Plan dependency cycle includes ${id}`
      )
    }
    visiting.add(id)
    for (const dependency of normalizedDependencies.get(id) ?? [])
      visit(dependency)
    visiting.delete(id)
    visited.add(id)
    order.push(id)
  }
  for (const id of [...ids].sort()) visit(id)

  // The fingerprint is a semantic graph identity. Generated step IDs and
  // dependency labels are deliberately replaced with structural keys in a
  // canonical ordering, so a replan cannot evade LOOP_DETECTED by minting a
  // new identifier or merely permuting equivalent steps.
  const semanticKey = (step: PlanStepDraft): string =>
    canonicalizeJson({
      type: step.type,
      description: step.description,
      requiredCapabilities: [...step.requiredCapabilities].sort(),
      riskLevel: step.riskLevel,
      approvalRequirement: step.approvalRequirement,
      inputHash: safeHash(step.input ?? null),
      expectedOutcome: step.expectedOutcome ?? null,
      timeoutMs: step.timeoutMs ?? 30_000,
      toolId: step.toolId ?? null,
      toolVersion: step.toolVersion ?? null,
      intent: {
        capability: step.intent.capability,
        action: step.intent.action,
        resource: step.intent.resource,
        dataClassification: step.intent.dataClassification,
        idempotencyKey: step.intent.idempotencyKey,
        modelMessages: step.intent.modelMessages,
        structuredOutput: step.intent.structuredOutput
      }
    })
  const draftsById = new Map(
    drafts.map((step, index) => [draftStepId(step, index), step])
  )
  const structuralKeys = new Map<string, string>()
  for (const id of order) {
    const step = draftsById.get(id)
    if (!step) {
      throw new OrchestrationError(
        'invalid_plan',
        `Plan step ${id} is missing from the validated graph`
      )
    }
    structuralKeys.set(
      id,
      hashCanonical({
        semanticKey: semanticKey(step),
        dependencyKeys: (normalizedDependencies.get(id) ?? [])
          .map((dependency) => structuralKeys.get(dependency))
          .sort()
      })
    )
  }
  const canonicalIds = [...ids].sort((left, right) =>
    (structuralKeys.get(left) ?? '').localeCompare(
      structuralKeys.get(right) ?? ''
    )
  )
  const fingerprint = hashCanonical({
    schemaVersion: 'semantic-plan-v2',
    steps: canonicalIds.map((id) => ({
      semanticKey: semanticKey(draftsById.get(id)!),
      dependencyKeys: (normalizedDependencies.get(id) ?? [])
        .map((dependency) => structuralKeys.get(dependency))
        .sort()
    }))
  })
  return { topologicalOrder: order, fingerprint }
}

export function createExecutionBudget(
  input?: ExecutionBudgetInput
): ExecutionBudget {
  const parsed = ExecutionBudgetInputSchema.parse(input ?? {})
  return {
    maxSteps: parsed.maxSteps ?? DEFAULT_ORCHESTRATION_BUDGET.maxSteps,
    maxReplans: parsed.maxReplans ?? DEFAULT_ORCHESTRATION_BUDGET.maxReplans,
    maxIterations:
      parsed.maxIterations ?? DEFAULT_ORCHESTRATION_BUDGET.maxIterations,
    maxModelCalls:
      parsed.maxModelCalls ?? DEFAULT_ORCHESTRATION_BUDGET.maxModelCalls,
    maxToolCalls:
      parsed.maxToolCalls ?? DEFAULT_ORCHESTRATION_BUDGET.maxToolCalls,
    maxDurationMs:
      parsed.maxDurationMs ?? DEFAULT_ORCHESTRATION_BUDGET.maxDurationMs,
    maxCostUsd: parsed.maxCostUsd ?? DEFAULT_ORCHESTRATION_BUDGET.maxCostUsd,
    usage: {
      steps: 0,
      replans: 0,
      iterations: 0,
      modelCalls: 0,
      toolCalls: 0,
      costUsd: 0
    }
  }
}

function clone<T>(value: T): T {
  try {
    return structuredClone(value)
  } catch {
    // A structured-output contract may contain a Zod schema instance. The
    // schema is an executable registry object rather than persisted data and
    // cannot be cloned by the platform serializer. Callers still replace the
    // enclosing record immutably before changing it, so retaining this opaque
    // contract reference is safe for the controlled in-memory store.
    return value
  }
}

function statusForExecutionOutcome(
  outcome: StepExecutionResult['outcome']
): PlanStepStatus {
  switch (outcome) {
    case 'succeeded':
      return 'SUCCEEDED'
    case 'approval_required':
      return 'WAITING_APPROVAL'
    case 'waiting_external':
      return 'WAITING_EXTERNAL'
    case 'human_handoff':
      return 'HUMAN_HANDOFF'
    case 'uncertain':
      return 'UNCERTAIN'
    case 'failed':
      return 'FAILED'
  }
}

function goalStatusForExecutionOutcome(
  outcome: StepExecutionResult['outcome']
): GoalStatus | null {
  switch (outcome) {
    case 'approval_required':
      return 'WAITING_APPROVAL'
    case 'waiting_external':
      return 'WAITING_EXTERNAL'
    case 'human_handoff':
      return 'HUMAN_HANDOFF'
    case 'uncertain':
      return 'UNCERTAIN'
    default:
      return null
  }
}

function goalReasonForStepStatus(status: PlanStepStatus): GoalStatus | null {
  switch (status) {
    case 'WAITING_APPROVAL':
      return 'WAITING_APPROVAL'
    case 'WAITING_EXTERNAL':
      return 'WAITING_EXTERNAL'
    case 'HUMAN_HANDOFF':
      return 'HUMAN_HANDOFF'
    case 'UNCERTAIN':
      return 'UNCERTAIN'
    default:
      return null
  }
}

function assertSettleAccounting(input: SettleStepInput): void {
  for (const [label, value] of [
    ['modelCalls', input.modelCalls],
    ['toolCalls', input.toolCalls],
    ['costUsd', input.costUsd]
  ] as const) {
    if (!Number.isFinite(value) || value < 0) {
      throw new OrchestrationError(
        'invalid_plan',
        `Step settlement ${label} must be a finite non-negative number`
      )
    }
  }
}

export function stepBudgetExhaustion(
  goal: Goal,
  step: PlanStep
): 'model_calls' | 'tool_calls' | 'cost_usd' | null {
  if (
    step.intent.modelMessages !== null &&
    goal.budget.usage.modelCalls >= goal.budget.maxModelCalls
  ) {
    return 'model_calls'
  }
  if (
    step.toolId !== null &&
    goal.budget.usage.toolCalls >= goal.budget.maxToolCalls
  ) {
    return 'tool_calls'
  }
  if (
    (step.intent.modelMessages !== null || step.toolId !== null) &&
    goal.budget.usage.costUsd >= goal.budget.maxCostUsd
  ) {
    return 'cost_usd'
  }
  return null
}

export function effectiveGoalDeadline(
  createdAt: Date,
  requestedDeadline: Date | undefined,
  maxDurationMs: number
): Date {
  const durationDeadline = createdAt.getTime() + maxDurationMs
  const requested = requestedDeadline?.getTime()
  return new Date(
    requested === undefined
      ? durationDeadline
      : Math.min(requested, durationDeadline)
  )
}

/** In-memory durable-contract reference store used by unit tests and local controlled mode. */
export class InMemoryGoalPlanStore implements GoalPlanStore {
  private readonly goals = new Map<string, Goal>()
  private readonly plans = new Map<string, Plan>()
  private readonly steps = new Map<string, PlanStep>()
  private readonly attempts = new Map<string, AttemptRecord>()
  private readonly observations = new Map<string, ObservationRecord>()
  private readonly evaluations = new Map<string, EvaluationRecord>()
  private readonly clock: () => Date

  constructor(options: { clock?: () => Date } = {}) {
    this.clock = options.clock ?? (() => new Date())
  }

  async createGoal(input: CreateGoalInput): Promise<Goal> {
    const tenantId = validateTenant(input.tenantId)
    CorrelationIdSchema.parse(input.correlationId)
    if (input.objective.trim().length === 0 || input.objective.length > 8_000) {
      throw new OrchestrationError('invalid_plan', 'Goal objective is invalid')
    }
    if (
      input.inboundMessageId !== undefined &&
      (!input.inboundMessageId.trim() || input.inboundMessageId.length > 200)
    ) {
      throw new OrchestrationError(
        'invalid_plan',
        'Inbound message id is invalid'
      )
    }
    const createdAt = this.clock()
    const budget = createExecutionBudget(input.budget)
    const executionSnapshot: ExecutionSnapshot = {
      agentVersion: input.executionSnapshot?.agentVersion ?? null,
      promptVersion: input.executionSnapshot?.promptVersion ?? null,
      policyVersion: input.executionSnapshot?.policyVersion ?? null,
      modelProfile: input.executionSnapshot?.modelProfile ?? null,
      toolVersions: { ...(input.executionSnapshot?.toolVersions ?? {}) },
      ...(input.executionSnapshot?.runtimeMode !== undefined
        ? { runtimeMode: input.executionSnapshot.runtimeMode }
        : {}),
      ...(input.executionSnapshot?.runtimeVersion !== undefined
        ? { runtimeVersion: input.executionSnapshot.runtimeVersion }
        : {})
    }
    const goal: Goal = {
      id: createDomainId('goal'),
      tenantId,
      inboundMessageId: input.inboundMessageId ?? null,
      sessionId: input.sessionId ?? null,
      conversationId: input.conversationId ?? null,
      objective: input.objective,
      successCriteria: clone(input.successCriteria),
      status: 'OBSERVING',
      createdAt: new Date(createdAt),
      updatedAt: new Date(createdAt),
      deadline: effectiveGoalDeadline(
        createdAt,
        input.deadline,
        budget.maxDurationMs
      ),
      budget,
      correlationId: input.correlationId,
      version: 1,
      activePlanId: null,
      executionSnapshot,
      ...(input.plannerContext !== undefined
        ? { plannerContext: clone(input.plannerContext) }
        : {}),
      replanFingerprints: [],
      lastReason: null,
      lastError: null
    }
    this.goals.set(this.key(tenantId, goal.id), clone(goal))
    return clone(goal)
  }

  async getGoal(
    tenantId: OrchestrationTenantId,
    goalId: string
  ): Promise<Goal | null> {
    const goal = this.goals.get(this.key(validateTenant(tenantId), goalId))
    return goal ? clone(goal) : null
  }

  async getGoalByCorrelation(
    tenantId: OrchestrationTenantId,
    correlationId: string
  ): Promise<Goal | null> {
    const scope = validateTenant(tenantId)
    CorrelationIdSchema.parse(correlationId)
    return (
      [...this.goals.values()]
        .filter(
          (goal) =>
            goal.tenantId === scope && goal.correlationId === correlationId
        )
        .sort(
          (left, right) => right.createdAt.getTime() - left.createdAt.getTime()
        )
        .map((goal) => clone(goal))[0] ?? null
    )
  }

  async getGoalByInboundMessage(
    tenantId: OrchestrationTenantId,
    inboundMessageId: string
  ): Promise<Goal | null> {
    const scope = validateTenant(tenantId)
    if (!inboundMessageId.trim() || inboundMessageId.length > 200) {
      throw new OrchestrationError(
        'invalid_plan',
        'Inbound message id is invalid'
      )
    }
    return (
      [...this.goals.values()]
        .filter(
          (goal) =>
            goal.tenantId === scope &&
            goal.inboundMessageId === inboundMessageId
        )
        .sort(
          (left, right) => right.createdAt.getTime() - left.createdAt.getTime()
        )
        .map((goal) => clone(goal))[0] ?? null
    )
  }

  async listGoals(
    tenantId: OrchestrationTenantId,
    options: GoalListOptions = {}
  ): Promise<Goal[]> {
    const scope = validateTenant(tenantId)
    const normalized = normalizeGoalListOptions(options)
    return [...this.goals.values()]
      .filter(
        (goal) =>
          goal.tenantId === scope &&
          (normalized.statuses === undefined ||
            normalized.statuses.includes(goal.status))
      )
      .sort(
        (left, right) =>
          right.updatedAt.getTime() - left.updatedAt.getTime() ||
          left.id.localeCompare(right.id)
      )
      .slice(normalized.offset, normalized.offset + normalized.limit)
      .map((goal) => clone(goal))
  }

  async listRunnableGoals(tenantId?: OrchestrationTenantId): Promise<Goal[]> {
    if (tenantId === undefined) {
      throw new OrchestrationError(
        'tenant_violation',
        'InMemoryGoalPlanStore requires an explicit tenant for runnable goal recovery'
      )
    }
    const scope = validateTenant(tenantId)
    return [...this.goals.values()]
      .filter(
        (goal) => goal.tenantId === scope && isRunnableGoalStatus(goal.status)
      )
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((goal) => clone(goal))
  }

  async transitionGoal(input: TransitionGoalInput): Promise<Goal> {
    const tenantId = validateTenant(input.tenantId)
    const key = this.key(tenantId, input.goalId)
    const current = this.goals.get(key)
    if (!current)
      throw new OrchestrationError(
        'not_found',
        `Goal not found: ${input.goalId}`
      )
    if (current.version !== input.expectedVersion) {
      throw new OrchestrationError(
        'conflict',
        `Goal version conflict for ${input.goalId}`
      )
    }
    assertGoalTransition(current.status, input.target)
    const updated: Goal = {
      ...clone(current),
      status: input.target,
      version: current.version + 1,
      updatedAt: this.clock(),
      lastReason: input.reason,
      lastError:
        input.lastError === undefined ? current.lastError : input.lastError
    }
    this.goals.set(key, clone(updated))
    return clone(updated)
  }

  async consumeIteration(input: ConsumeIterationInput): Promise<Goal> {
    const tenantId = validateTenant(input.tenantId)
    const key = this.key(tenantId, input.goalId)
    const current = this.goals.get(key)
    if (!current)
      throw new OrchestrationError(
        'not_found',
        `Goal not found: ${input.goalId}`
      )
    if (current.version !== input.expectedVersion) {
      throw new OrchestrationError(
        'conflict',
        `Goal version conflict for ${input.goalId}`
      )
    }
    if (current.budget.usage.iterations >= current.budget.maxIterations) {
      assertGoalTransition(current.status, 'LOOP_DETECTED')
      const stopped: Goal = {
        ...clone(current),
        status: 'LOOP_DETECTED',
        version: current.version + 1,
        updatedAt: new Date(input.now),
        lastReason: 'max_iterations_exhausted',
        lastError: 'Persisted orchestration iteration budget exhausted'
      }
      this.goals.set(key, clone(stopped))
      return clone(stopped)
    }
    const updated: Goal = {
      ...clone(current),
      version: current.version + 1,
      updatedAt: new Date(input.now),
      lastReason: `iteration_consumed:${current.budget.usage.iterations + 1}`,
      budget: {
        ...clone(current.budget),
        usage: {
          ...clone(current.budget.usage),
          iterations: current.budget.usage.iterations + 1
        }
      }
    }
    this.goals.set(key, clone(updated))
    return clone(updated)
  }

  async activatePlan(input: ActivatePlanInput): Promise<ActivatePlanResult> {
    const tenantId = validateTenant(input.tenantId)
    const goalKey = this.key(tenantId, input.goalId)
    const currentGoal = this.goals.get(goalKey)
    if (!currentGoal)
      throw new OrchestrationError(
        'not_found',
        `Goal not found: ${input.goalId}`
      )
    if (currentGoal.version !== input.expectedGoalVersion) {
      throw new OrchestrationError(
        'conflict',
        `Goal version conflict for ${input.goalId}`
      )
    }
    if (
      input.consumeReplan &&
      currentGoal.budget.usage.replans >= currentGoal.budget.maxReplans
    ) {
      throw new OrchestrationError(
        'budget_exhausted',
        'Goal replan budget is exhausted'
      )
    }
    const triggeringEvaluationId = input.triggeringEvaluationId ?? null
    if ((input.parentPlanId === null) !== (triggeringEvaluationId === null)) {
      throw new OrchestrationError(
        'invalid_plan',
        'A replan must bind both its parent plan and triggering evaluation'
      )
    }
    if (triggeringEvaluationId !== null) {
      const evaluation = this.evaluations.get(
        this.key(tenantId, triggeringEvaluationId)
      )
      if (
        !evaluation ||
        evaluation.goalId !== input.goalId ||
        evaluation.planId !== input.parentPlanId
      ) {
        throw new OrchestrationError(
          'invalid_plan',
          'Triggering evaluation must belong to the same Goal and parent Plan'
        )
      }
    }
    const planId = createDomainId('plan')
    if (input.parentPlanId !== null) {
      const parent = this.plans.get(this.key(tenantId, input.parentPlanId))
      if (!parent || parent.goalId !== input.goalId) {
        throw new OrchestrationError(
          'invalid_plan',
          'Parent plan must belong to the same Goal and tenant'
        )
      }
      if (parent.version >= input.planVersion) {
        throw new OrchestrationError(
          'invalid_plan',
          'Plan version must be greater than its parent plan version'
        )
      }
    }
    const graph = validatePlanGraph(
      {
        id: planId,
        goalId: input.goalId,
        tenantId,
        version: input.planVersion
      },
      input.steps
    )
    if (graph.fingerprint !== input.fingerprint) {
      throw new OrchestrationError(
        'invalid_plan',
        'Plan fingerprint does not match its graph'
      )
    }
    const createdAt = this.clock()
    const plan: Plan = {
      id: planId,
      goalId: input.goalId,
      tenantId,
      version: input.planVersion,
      parentPlanId: input.parentPlanId,
      reason: input.reason,
      triggeringEvaluationId,
      status: 'ACTIVE',
      createdAt: new Date(createdAt),
      updatedAt: new Date(createdAt),
      fingerprint: graph.fingerprint
    }
    const steps = materializePlanSteps(
      tenantId,
      input.goalId,
      plan,
      input.steps,
      createdAt
    )
    for (const existing of this.plans.values()) {
      if (
        existing.tenantId === tenantId &&
        existing.goalId === input.goalId &&
        existing.status === 'ACTIVE'
      ) {
        assertPlanTransition(existing.status, 'SUPERSEDED')
        this.plans.set(this.key(tenantId, existing.id), {
          ...clone(existing),
          status: 'SUPERSEDED',
          updatedAt: new Date(createdAt)
        })
      }
    }
    const usage = clone(currentGoal.budget.usage)
    if (input.consumeReplan) usage.replans += 1
    const updatedGoal: Goal = {
      ...clone(currentGoal),
      activePlanId: plan.id,
      version: currentGoal.version + 1,
      updatedAt: new Date(createdAt),
      lastReason: input.reason,
      replanFingerprints: currentGoal.replanFingerprints.includes(
        graph.fingerprint
      )
        ? [...currentGoal.replanFingerprints]
        : [...currentGoal.replanFingerprints, graph.fingerprint],
      budget: { ...clone(currentGoal.budget), usage }
    }
    this.plans.set(this.key(tenantId, plan.id), clone(plan))
    for (const step of steps)
      this.steps.set(this.key(tenantId, step.id), clone(step))
    this.goals.set(goalKey, clone(updatedGoal))
    return {
      goal: clone(updatedGoal),
      plan: clone(plan),
      steps: steps.map((step) => clone(step))
    }
  }

  async getPlan(
    tenantId: OrchestrationTenantId,
    planId: string
  ): Promise<Plan | null> {
    const plan = this.plans.get(this.key(validateTenant(tenantId), planId))
    return plan ? clone(plan) : null
  }

  async transitionPlan(input: {
    tenantId: OrchestrationTenantId
    planId: string
    target: PlanStatus
    reason: string
  }): Promise<Plan> {
    const scope = validateTenant(input.tenantId)
    const key = this.key(scope, input.planId)
    const current = this.plans.get(key)
    if (!current)
      throw new OrchestrationError(
        'not_found',
        `Plan not found: ${input.planId}`
      )
    assertPlanTransition(current.status, input.target)
    const updated: Plan = {
      ...clone(current),
      status: input.target,
      reason: input.reason,
      updatedAt: this.clock()
    }
    this.plans.set(key, clone(updated))
    return clone(updated)
  }

  async getActivePlan(
    tenantId: OrchestrationTenantId,
    goalId: string
  ): Promise<Plan | null> {
    const goal = await this.getGoal(tenantId, goalId)
    if (!goal?.activePlanId) return null
    return this.getPlan(tenantId, goal.activePlanId)
  }

  async listPlans(
    tenantId: OrchestrationTenantId,
    goalId: string
  ): Promise<Plan[]> {
    const scope = validateTenant(tenantId)
    return [...this.plans.values()]
      .filter((plan) => plan.tenantId === scope && plan.goalId === goalId)
      .sort((left, right) => left.version - right.version)
      .map((plan) => clone(plan))
  }

  async listSteps(
    tenantId: OrchestrationTenantId,
    planId: string
  ): Promise<PlanStep[]> {
    const scope = validateTenant(tenantId)
    return [...this.steps.values()]
      .filter((step) => step.tenantId === scope && step.planId === planId)
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((step) => clone(step))
  }

  async getStep(
    tenantId: OrchestrationTenantId,
    stepId: string
  ): Promise<PlanStep | null> {
    const step = this.steps.get(this.key(validateTenant(tenantId), stepId))
    return step ? clone(step) : null
  }

  async resolveWaitingApproval(
    input: ResolveWaitingApprovalInput
  ): Promise<SettledStep> {
    const scope = validateTenant(input.tenantId)
    const goal = this.goals.get(this.key(scope, input.goalId))
    const plan = this.plans.get(this.key(scope, input.planId))
    const step = this.steps.get(this.key(scope, input.stepId))
    if (!goal || !plan || !step) {
      throw new OrchestrationError(
        'not_found',
        'Goal, plan or approval-waiting step not found'
      )
    }
    if (
      goal.version !== input.expectedGoalVersion ||
      step.version !== input.expectedStepVersion
    ) {
      throw new OrchestrationError(
        'conflict',
        'Goal or step changed while resolving approval'
      )
    }
    if (
      goal.activePlanId !== plan.id ||
      plan.status !== 'ACTIVE' ||
      step.goalId !== goal.id ||
      step.planId !== plan.id ||
      step.status !== 'WAITING_APPROVAL' ||
      step.approvalId !== input.approvalId
    ) {
      throw new OrchestrationError(
        'conflict',
        'Approval resolution does not match the durable waiting step'
      )
    }
    const targetGoal = input.target === 'READY' ? 'GOVERNING' : 'CANCELLED'
    assertPlanStepTransition(step.status, input.target)
    assertGoalTransition(goal.status, targetGoal)
    const updatedAt = new Date(input.now)
    const updatedStep: PlanStep = {
      ...clone(step),
      status: input.target,
      lastError: input.target === 'CANCELLED' ? input.reason : null,
      completedAt: input.target === 'CANCELLED' ? updatedAt : null,
      version: step.version + 1,
      updatedAt
    }
    const updatedGoal: Goal = {
      ...clone(goal),
      status: targetGoal,
      version: goal.version + 1,
      updatedAt,
      lastReason: input.reason,
      lastError: input.target === 'CANCELLED' ? input.reason : null
    }
    this.steps.set(this.key(scope, step.id), clone(updatedStep))
    this.goals.set(this.key(scope, goal.id), clone(updatedGoal))
    return { goal: clone(updatedGoal), step: clone(updatedStep) }
  }

  async claimStep(input: ClaimStepInput): Promise<ClaimedStep | null> {
    const tenantId = validateTenant(input.tenantId)
    const goal = this.goals.get(this.key(tenantId, input.goalId))
    const plan = this.plans.get(this.key(tenantId, input.planId))
    const step = this.steps.get(this.key(tenantId, input.stepId))
    if (!goal || !plan || !step)
      throw new OrchestrationError('not_found', 'Goal, plan or step not found')
    if (goal.version !== input.expectedGoalVersion) {
      throw new OrchestrationError(
        'conflict',
        `Goal version conflict for ${input.goalId}`
      )
    }
    if (goal.activePlanId !== plan.id || plan.status !== 'ACTIVE') return null
    if (step.goalId !== goal.id || step.planId !== plan.id) {
      throw new OrchestrationError(
        'tenant_violation',
        'Step does not belong to the requested Goal and Plan'
      )
    }
    for (const dependency of step.dependencies) {
      const dependencyStep = this.steps.get(this.key(tenantId, dependency))
      if (!dependencyStep || dependencyStep.status !== 'SUCCEEDED') return null
    }
    if (step.leaseUntil && step.leaseUntil > input.now) return null
    // An expired EXECUTING lease must first pass through explicit recovery.
    // Re-claiming it directly would let worker B race worker A's uncertain
    // effect and defeats the recovery decision boundary.
    if (!['PENDING', 'READY'].includes(step.status)) return null
    const deadline = effectiveGoalDeadline(
      goal.createdAt,
      goal.deadline ?? undefined,
      goal.budget.maxDurationMs
    )
    if (deadline <= input.now) {
      throw new OrchestrationError(
        'budget_exhausted',
        'Goal deadline is exhausted'
      )
    }
    if (goal.budget.usage.steps >= goal.budget.maxSteps) {
      throw new OrchestrationError(
        'budget_exhausted',
        'Goal step budget is exhausted'
      )
    }
    const exhausted = stepBudgetExhaustion(goal, step)
    if (exhausted !== null) {
      throw new OrchestrationError(
        'budget_exhausted',
        `Goal ${exhausted.replace('_', ' ')} budget is exhausted`
      )
    }
    const leaseToken = createDomainId('lease')
    const attemptId = createDomainId('attempt')
    const leaseUntil = new Date(input.now.getTime() + input.leaseMs)
    const updatedStep: PlanStep = {
      ...clone(step),
      status: 'EXECUTING',
      attemptCount: step.attemptCount + 1,
      startedAt: step.startedAt ?? new Date(input.now),
      leaseOwner: input.workerId,
      leaseToken,
      leaseUntil,
      version: step.version + 1,
      updatedAt: new Date(input.now)
    }
    const updatedGoal: Goal = {
      ...clone(goal),
      version: goal.version + 1,
      updatedAt: new Date(input.now),
      lastReason: `step_claimed:${step.id}`,
      budget: {
        ...clone(goal.budget),
        usage: {
          ...clone(goal.budget.usage),
          steps: goal.budget.usage.steps + 1
        }
      }
    }
    const attempt: AttemptRecord = {
      id: attemptId,
      tenantId,
      goalId: goal.id,
      planId: plan.id,
      stepId: step.id,
      workerId: input.workerId,
      leaseToken,
      startedAt: new Date(input.now),
      finishedAt: null,
      outcome: null,
      errorClass: null,
      correlationId: goal.correlationId
    }
    this.steps.set(this.key(tenantId, step.id), clone(updatedStep))
    this.goals.set(this.key(tenantId, goal.id), clone(updatedGoal))
    this.attempts.set(this.key(tenantId, attempt.id), clone(attempt))
    return {
      lease: {
        tenantId,
        goalId: goal.id,
        planId: plan.id,
        stepId: step.id,
        workerId: input.workerId,
        leaseToken,
        attemptId,
        leaseUntil,
        goalVersion: updatedGoal.version,
        stepVersion: updatedStep.version
      },
      goal: clone(updatedGoal),
      plan: clone(plan),
      step: clone(updatedStep)
    }
  }

  async heartbeatStep(input: {
    lease: StepLease
    now: Date
    leaseMs: number
  }): Promise<StepLease | null> {
    const step = this.steps.get(
      this.key(input.lease.tenantId, input.lease.stepId)
    )
    const goal = this.goals.get(
      this.key(input.lease.tenantId, input.lease.goalId)
    )
    if (
      !step ||
      !goal ||
      step.goalId !== input.lease.goalId ||
      step.planId !== input.lease.planId ||
      step.leaseOwner !== input.lease.workerId ||
      step.leaseToken !== input.lease.leaseToken ||
      goal.version !== input.lease.goalVersion ||
      step.version !== input.lease.stepVersion
    )
      return null
    if (
      step.status !== 'EXECUTING' ||
      !step.leaseUntil ||
      step.leaseUntil <= input.now
    )
      return null
    const leaseUntil = new Date(input.now.getTime() + input.leaseMs)
    this.steps.set(this.key(step.tenantId, step.id), {
      ...clone(step),
      leaseUntil,
      version: step.version + 1,
      updatedAt: new Date(input.now)
    })
    return { ...input.lease, leaseUntil, stepVersion: step.version + 1 }
  }

  async settleStep(input: SettleStepInput): Promise<SettledStep> {
    assertSettleAccounting(input)
    const tenantId = validateTenant(input.lease.tenantId)
    const step = this.steps.get(this.key(tenantId, input.lease.stepId))
    const goal = this.goals.get(this.key(tenantId, input.lease.goalId))
    if (!step || !goal)
      throw new OrchestrationError('not_found', 'Goal or step not found')
    if (
      step.leaseOwner !== input.lease.workerId ||
      step.leaseToken !== input.lease.leaseToken
    ) {
      throw new OrchestrationError(
        'lease_lost',
        `Lease lost for step ${step.id}`
      )
    }
    if (
      step.goalId !== input.lease.goalId ||
      step.planId !== input.lease.planId
    ) {
      throw new OrchestrationError(
        'lease_lost',
        `Lease lineage does not match step ${step.id}`
      )
    }
    if (!step.leaseUntil || step.leaseUntil <= input.now) {
      throw new OrchestrationError(
        'lease_lost',
        `Lease expired for step ${step.id}`
      )
    }
    if (goal.version !== input.lease.goalVersion)
      throw new OrchestrationError(
        'conflict',
        'Goal changed while step was executing'
      )
    if (step.version !== input.lease.stepVersion)
      throw new OrchestrationError(
        'lease_lost',
        `Step version is stale for ${step.id}`
      )
    const target = statusForExecutionOutcome(input.outcome)
    assertPlanStepTransition(step.status, target)
    const updatedStep: PlanStep = {
      ...clone(step),
      status: target,
      approvalId: input.approvalId,
      resultHash: input.resultDigest,
      lastError:
        target === 'FAILED' || target === 'UNCERTAIN' ? input.reason : null,
      completedAt: target === 'SUCCEEDED' ? new Date(input.now) : null,
      leaseOwner: null,
      leaseToken: null,
      leaseUntil: null,
      version: step.version + 1,
      updatedAt: new Date(input.now)
    }
    const usage = clone(goal.budget.usage)
    usage.modelCalls += input.modelCalls
    usage.toolCalls += input.toolCalls
    usage.costUsd += input.costUsd
    const nextGoalStatus = goalStatusForExecutionOutcome(input.outcome)
    if (nextGoalStatus !== null && goal.status !== nextGoalStatus) {
      assertGoalTransition(goal.status, nextGoalStatus)
    }
    const updatedGoal: Goal = {
      ...clone(goal),
      status: nextGoalStatus ?? goal.status,
      version: goal.version + 1,
      updatedAt: new Date(input.now),
      lastReason: `step_settled:${step.id}:${target}`,
      lastError:
        target === 'FAILED' || target === 'UNCERTAIN'
          ? input.reason
          : goal.lastError,
      budget: { ...clone(goal.budget), usage }
    }
    const observation = input.observation
      ? {
          tenantId,
          goalId: goal.id,
          planId: step.planId,
          stepId: step.id,
          kind: input.observation.kind,
          resultDigest: input.observation.resultDigest,
          evidence: clone(input.observation.evidence),
          id: createDomainId('observation'),
          createdAt: new Date(input.now)
        }
      : null
    const attempt = this.attempts.get(this.key(tenantId, input.lease.attemptId))
    if (attempt) {
      this.attempts.set(this.key(tenantId, attempt.id), {
        ...clone(attempt),
        finishedAt: new Date(input.now),
        outcome: target,
        errorClass:
          target === 'FAILED' || target === 'UNCERTAIN' ? input.reason : null
      })
    }
    this.steps.set(this.key(tenantId, step.id), clone(updatedStep))
    this.goals.set(this.key(tenantId, goal.id), clone(updatedGoal))
    if (observation) {
      this.observations.set(
        this.key(tenantId, observation.id),
        clone(observation)
      )
    }
    return { goal: clone(updatedGoal), step: clone(updatedStep) }
  }

  async listExpiredLeases(
    tenantId: OrchestrationTenantId,
    now: Date
  ): Promise<PlanStep[]> {
    const scope = validateTenant(tenantId)
    return [...this.steps.values()]
      .filter(
        (step) =>
          step.tenantId === scope &&
          step.leaseUntil !== null &&
          step.leaseUntil <= now
      )
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((step) => clone(step))
  }

  async recoverExpiredLease(
    input: RecoverExpiredLeaseInput
  ): Promise<SettledStep> {
    const tenantId = validateTenant(input.tenantId)
    const step = this.steps.get(this.key(tenantId, input.stepId))
    if (!step)
      throw new OrchestrationError(
        'not_found',
        `Step not found: ${input.stepId}`
      )
    const goal = this.goals.get(this.key(tenantId, step.goalId))
    if (!goal)
      throw new OrchestrationError(
        'not_found',
        `Goal not found: ${step.goalId}`
      )
    if (
      !step.leaseUntil ||
      step.leaseUntil > input.now ||
      step.leaseToken === null ||
      step.leaseToken !== input.leaseToken ||
      step.version !== input.stepVersion
    )
      return { goal: clone(goal), step: clone(step) }
    const target: PlanStepStatus =
      input.decision === 'retry' ? 'READY' : 'UNCERTAIN'
    assertPlanStepTransition(step.status, target)
    const updatedStep: PlanStep = {
      ...clone(step),
      status: target,
      leaseOwner: null,
      leaseToken: null,
      leaseUntil: null,
      lastError: input.reason,
      version: step.version + 1,
      updatedAt: new Date(input.now)
    }
    let goalStatus = goal.status
    if (input.decision === 'uncertain' && goal.status === 'EXECUTING') {
      assertGoalTransition(goal.status, 'UNCERTAIN')
      goalStatus = 'UNCERTAIN'
    }
    const updatedGoal: Goal = {
      ...clone(goal),
      status: goalStatus,
      version: goal.version + 1,
      updatedAt: new Date(input.now),
      lastReason: input.reason,
      lastError: input.decision === 'uncertain' ? input.reason : goal.lastError
    }
    const attempt = step.leaseToken
      ? [...this.attempts.values()].find(
          (candidate) => candidate.leaseToken === step.leaseToken
        )
      : undefined
    if (attempt) {
      this.attempts.set(this.key(tenantId, attempt.id), {
        ...clone(attempt),
        finishedAt: new Date(input.now),
        outcome: input.decision === 'retry' ? 'lease_expired' : 'uncertain',
        errorClass: input.reason
      })
    }
    this.steps.set(this.key(tenantId, step.id), clone(updatedStep))
    this.goals.set(this.key(tenantId, goal.id), clone(updatedGoal))
    return { goal: clone(updatedGoal), step: clone(updatedStep) }
  }

  async recordObservation(
    input: Omit<ObservationRecord, 'id' | 'createdAt'> & { createdAt?: Date }
  ): Promise<ObservationRecord> {
    const tenantId = validateTenant(input.tenantId)
    const goal = this.goals.get(this.key(tenantId, input.goalId))
    const plan = this.plans.get(this.key(tenantId, input.planId))
    if (!goal || !plan || plan.goalId !== input.goalId) {
      throw new OrchestrationError(
        'conflict',
        'Observation lineage does not match its Goal and Plan'
      )
    }
    if (input.stepId !== null) {
      const step = this.steps.get(this.key(tenantId, input.stepId))
      if (
        !step ||
        step.goalId !== input.goalId ||
        step.planId !== input.planId
      ) {
        throw new OrchestrationError(
          'conflict',
          'Observation lineage does not match its Step'
        )
      }
    }
    const record: ObservationRecord = {
      ...clone(input),
      id: createDomainId('observation'),
      createdAt: input.createdAt ? new Date(input.createdAt) : this.clock()
    }
    this.observations.set(this.key(record.tenantId, record.id), clone(record))
    return clone(record)
  }

  async listObservations(
    tenantId: OrchestrationTenantId,
    goalId: string
  ): Promise<ObservationRecord[]> {
    const scope = validateTenant(tenantId)
    return [...this.observations.values()]
      .filter((record) => record.tenantId === scope && record.goalId === goalId)
      .sort(
        (left, right) => left.createdAt.getTime() - right.createdAt.getTime()
      )
      .map((record) => clone(record))
  }

  async recordEvaluation(
    input: Omit<EvaluationRecord, 'id' | 'createdAt'> & { createdAt?: Date }
  ): Promise<EvaluationRecord> {
    const tenantId = validateTenant(input.tenantId)
    const goal = this.goals.get(this.key(tenantId, input.goalId))
    const plan = this.plans.get(this.key(tenantId, input.planId))
    if (!goal || !plan || plan.goalId !== input.goalId) {
      throw new OrchestrationError(
        'conflict',
        'Evaluation lineage does not match its Goal and Plan'
      )
    }
    if (input.stepId !== null) {
      const step = this.steps.get(this.key(tenantId, input.stepId))
      if (
        !step ||
        step.goalId !== input.goalId ||
        step.planId !== input.planId
      ) {
        throw new OrchestrationError(
          'conflict',
          'Evaluation lineage does not match its Step'
        )
      }
    }
    const record: EvaluationRecord = {
      ...clone(input),
      id: createDomainId('evaluation'),
      createdAt: input.createdAt ? new Date(input.createdAt) : this.clock()
    }
    this.evaluations.set(this.key(record.tenantId, record.id), clone(record))
    return clone(record)
  }

  async listEvaluations(
    tenantId: OrchestrationTenantId,
    goalId: string
  ): Promise<EvaluationRecord[]> {
    const scope = validateTenant(tenantId)
    return [...this.evaluations.values()]
      .filter((record) => record.tenantId === scope && record.goalId === goalId)
      .sort(
        (left, right) => left.createdAt.getTime() - right.createdAt.getTime()
      )
      .map((record) => clone(record))
  }

  async listAttempts(
    tenantId: OrchestrationTenantId,
    stepId: string
  ): Promise<AttemptRecord[]> {
    const scope = validateTenant(tenantId)
    return [...this.attempts.values()]
      .filter((record) => record.tenantId === scope && record.stepId === stepId)
      .sort(
        (left, right) => left.startedAt.getTime() - right.startedAt.getTime()
      )
      .map((record) => clone(record))
  }

  private key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`
  }
}

export function materializePlanSteps(
  tenantId: OrchestrationTenantId,
  goalId: string,
  plan: Plan,
  drafts: readonly PlanStepDraft[],
  createdAt: Date
): PlanStep[] {
  const assigned = new Map<string, string>()
  for (const [index, draft] of drafts.entries()) {
    assigned.set(draftStepId(draft, index), draftStepId(draft, index))
  }
  return drafts.map((draft, index) => {
    const id =
      assigned.get(draftStepId(draft, index)) ?? draftStepId(draft, index)
    const dependencies = (draft.dependencies ?? []).map(
      (dependency) => assigned.get(dependency) ?? dependency
    )
    const input = draft.input ?? null
    const expectedOutcome = draft.expectedOutcome ?? null
    return {
      id,
      goalId,
      planId: plan.id,
      tenantId,
      type: draft.type,
      description: draft.description,
      dependencies,
      requiredCapabilities: [...draft.requiredCapabilities],
      riskLevel: draft.riskLevel,
      approvalRequirement: draft.approvalRequirement,
      status: dependencies.length === 0 ? 'READY' : 'PENDING',
      attemptCount: 0,
      input: clone(input),
      inputHash: safeHash(input),
      expectedOutcome: clone(expectedOutcome),
      timeoutMs: draft.timeoutMs ?? 30_000,
      intent: clone({
        ...draft.intent,
        modelMessages: draft.intent.modelMessages ?? null,
        structuredOutput: draft.intent.structuredOutput ?? null,
        idempotencyKey: draft.intent.idempotencyKey ?? null
      }),
      approvalId: null,
      toolId: draft.toolId ?? null,
      toolVersion: draft.toolVersion ?? null,
      resultHash: null,
      lastError: null,
      startedAt: null,
      completedAt: null,
      leaseOwner: null,
      leaseToken: null,
      leaseUntil: null,
      version: 1,
      createdAt: new Date(createdAt),
      updatedAt: new Date(createdAt)
    }
  })
}

export interface GoalPlanner {
  plan(input: {
    goal: Goal
    previousPlan: Plan | null
    steps: PlanStep[]
    observations: ObservationRecord[]
    evaluation: GoalEvaluation | null
  }): Promise<PlanDraft>
}

export interface GoalEvaluator {
  evaluate(input: {
    goal: Goal
    plan: Plan
    steps: PlanStep[]
    observations: ObservationRecord[]
  }): Promise<GoalEvaluation>
}

export interface GovernedStepExecutor {
  execute(input: {
    goal: Goal
    plan: Plan
    step: PlanStep
    lease: StepLease
    signal: AbortSignal
    /** Remaining allowance; the executor must pass it to the governed runtime. */
    limits: {
      maxModelCalls: number
      maxToolCalls: number
      maxDurationMs: number
      maxCostUsd: number
    }
  }): Promise<StepExecutionResult>
}

export interface GoalPlanOrchestratorOptions {
  store: GoalPlanStore
  planner: GoalPlanner
  evaluator: GoalEvaluator
  executor: GovernedStepExecutor
  workerId: string
  clock?: () => Date
  leaseMs?: number
  reconcileExpiredLease?: (step: PlanStep) => Promise<'retry' | 'uncertain'>
  reconcileWaitingApproval?: (goal: Goal) => Promise<'resolved' | 'pending'>
  maxIterations?: number
  telemetry?: Pick<Telemetry, 'startSpan' | 'recordMetric'>
}

export interface OrchestrationRunResult {
  goal: Goal
  plan: Plan | null
  steps: PlanStep[]
  reason: string
  executedStepIds: string[]
}

/**
 * Durable observe -> evaluate -> replan loop. Every mutation goes through the
 * store so restart and competing workers see the same state and budget.
 */
export class GoalPlanOrchestrator {
  private readonly clock: () => Date
  private readonly leaseMs: number
  private readonly maxIterations: number

  constructor(private readonly options: GoalPlanOrchestratorOptions) {
    if (options.workerId.trim().length < 1 || options.workerId.length > 200) {
      throw new OrchestrationError('invalid_plan', 'Worker id is invalid')
    }
    this.clock = options.clock ?? (() => new Date())
    this.leaseMs = options.leaseMs ?? 30_000
    if (!Number.isInteger(this.leaseMs) || this.leaseMs < 100) {
      throw new OrchestrationError(
        'invalid_plan',
        'Lease duration must be at least 100ms'
      )
    }
    this.maxIterations = options.maxIterations ?? 256
  }

  async recoverRunnableGoals(
    tenantId?: OrchestrationTenantId
  ): Promise<Goal[]> {
    return this.options.store.listRunnableGoals(tenantId)
  }

  /**
   * Resume every runnable Goal visible to this tenant. The store's Step lease
   * fencing remains the concurrency boundary when two workers sweep at once;
   * one worker may lose a version/claim race and is counted as a failed
   * recovery attempt instead of executing an unfenced effect.
   */
  async recoverGoals(
    tenantId: OrchestrationTenantId
  ): Promise<GoalRecoverySweepResult> {
    const span = this.options.telemetry?.startSpan(
      'orchestrator.goal.recovery',
      { operation: 'goal_recovery', tenantId }
    )
    try {
      const goals = this.options.reconcileWaitingApproval
        ? await this.options.store.listGoals(tenantId, {
            statuses: [...RUNNABLE_GOAL_STATUSES, 'WAITING_APPROVAL'],
            limit: 100
          })
        : await this.recoverRunnableGoals(tenantId)
      const result: GoalRecoverySweepResult = {
        inspected: goals.length,
        resumed: 0,
        skipped: 0,
        completed: 0,
        failures: 0
      }
      for (const candidate of goals) {
        const current = await this.options.store.getGoal(tenantId, candidate.id)
        if (current === null) {
          result.skipped += 1
          continue
        }
        if (current.status === 'WAITING_APPROVAL') {
          if (this.options.reconcileWaitingApproval === undefined) {
            result.skipped += 1
            continue
          }
          try {
            const resolution =
              await this.options.reconcileWaitingApproval(current)
            if (resolution === 'resolved') {
              result.resumed += 1
              const resolved = await this.options.store.getGoal(
                tenantId,
                current.id
              )
              if (resolved && isTerminalGoalStatus(resolved.status)) {
                result.completed += 1
              }
            } else {
              result.skipped += 1
            }
          } catch {
            result.failures += 1
          }
          continue
        }
        if (!isRunnableGoalStatus(current.status)) {
          result.skipped += 1
          continue
        }
        try {
          const resumed = await this.run(tenantId, current.id)
          result.resumed += 1
          if (isTerminalGoalStatus(resumed.goal.status)) {
            result.completed += 1
          }
        } catch {
          result.failures += 1
        }
      }
      span?.end(
        result.failures === 0 ? 'ok' : 'error',
        result.failures === 0 ? undefined : 'goal_recovery_partial'
      )
      this.options.telemetry?.recordMetric(
        'orchestrator_goal_recovery_total',
        1,
        {
          operation: 'goal_recovery',
          outcome: result.failures === 0 ? 'ok' : 'partial'
        }
      )
      return result
    } catch (error) {
      span?.end(
        'error',
        error instanceof Error && 'code' in error
          ? String((error as { code: unknown }).code)
          : 'goal_recovery_failed'
      )
      this.options.telemetry?.recordMetric(
        'orchestrator_goal_recovery_total',
        1,
        { operation: 'goal_recovery', outcome: 'error' }
      )
      throw error
    }
  }

  async run(
    tenantId: OrchestrationTenantId,
    goalId: string
  ): Promise<OrchestrationRunResult> {
    const scope = validateTenant(tenantId)
    const executedStepIds: string[] = []
    await this.recoverExpiredLeases(scope)
    const initialGoal = await this.options.store.getGoal(scope, goalId)
    if (!initialGoal)
      throw new OrchestrationError('not_found', `Goal not found: ${goalId}`)
    // Keep a process-local circuit breaker, but never let it be lower than
    // the persisted budget selected for this Goal. The durable counter below
    // remains authoritative across restarts and competing workers.
    const iterationLimit = Math.max(
      this.maxIterations,
      initialGoal.budget.maxIterations
    )
    let lastReason = 'goal_not_started'

    for (let iteration = 0; iteration < iterationLimit; iteration += 1) {
      let goal = await this.options.store.getGoal(scope, goalId)
      if (!goal)
        throw new OrchestrationError('not_found', `Goal not found: ${goalId}`)
      if (isTerminalGoalStatus(goal.status)) {
        return this.result(
          goal,
          await this.activePlan(scope, goal),
          await this.stepsForActivePlan(scope, goal),
          goal.lastReason ?? goal.status,
          executedStepIds
        )
      }
      if (goal.deadline && goal.deadline <= this.clock()) {
        goal = await this.transition(
          goal,
          'BUDGET_EXHAUSTED',
          'goal_deadline_expired'
        )
        return this.result(
          goal,
          await this.activePlan(scope, goal),
          await this.stepsForActivePlan(scope, goal),
          'goal_deadline_expired',
          executedStepIds
        )
      }
      const effectiveDeadline =
        goal.deadline ??
        new Date(goal.createdAt.getTime() + goal.budget.maxDurationMs)
      if (effectiveDeadline <= this.clock()) {
        goal = await this.transition(
          goal,
          'BUDGET_EXHAUSTED',
          'goal_duration_budget_exhausted'
        )
        return this.result(
          goal,
          await this.activePlan(scope, goal),
          await this.stepsForActivePlan(scope, goal),
          'goal_duration_budget_exhausted',
          executedStepIds
        )
      }
      if (
        [
          'WAITING_APPROVAL',
          'WAITING_EXTERNAL',
          'HUMAN_HANDOFF',
          'PENDING_RETURN',
          'UNCERTAIN'
        ].includes(goal.status)
      ) {
        return this.result(
          goal,
          await this.activePlan(scope, goal),
          await this.stepsForActivePlan(scope, goal),
          goal.status,
          executedStepIds
        )
      }

      // Count the orchestration turn in durable state before doing any
      // planner/executor work. A new worker instance therefore cannot reset
      // the loop guard by restarting the process.
      goal = await this.options.store.consumeIteration({
        tenantId: scope,
        goalId: goal.id,
        expectedVersion: goal.version,
        now: this.clock()
      })
      if (isTerminalGoalStatus(goal.status)) {
        return this.result(
          goal,
          await this.activePlan(scope, goal),
          await this.stepsForActivePlan(scope, goal),
          goal.lastReason ?? goal.status,
          executedStepIds
        )
      }

      let plan = await this.activePlan(scope, goal)
      if (!plan) {
        goal = await this.advance(
          goal,
          'UNDERSTANDING',
          'goal_observation_started'
        )
        goal = await this.advance(goal, 'PLANNING', 'goal_planning_started')
        const draft = await this.options.planner.plan({
          goal,
          previousPlan: null,
          steps: [],
          observations: await this.options.store.listObservations(
            scope,
            goal.id
          ),
          evaluation: null
        })
        const graph = validatePlanGraph(
          { id: 'plan_draft', goalId: goal.id, tenantId: scope, version: 1 },
          draft.steps
        )
        const activated = await this.options.store.activatePlan({
          tenantId: scope,
          goalId: goal.id,
          expectedGoalVersion: goal.version,
          planVersion: 1,
          parentPlanId: null,
          reason: draft.reason,
          steps: draft.steps,
          consumeReplan: false,
          fingerprint: graph.fingerprint
        })
        goal = await this.advance(
          activated.goal,
          'GOVERNING',
          'plan_validated_and_governed'
        )
        plan = activated.plan
        lastReason = 'plan_created'
      }

      if (!plan)
        throw new OrchestrationError(
          'not_found',
          `Active plan not found for ${goal.id}`
        )
      let steps = await this.options.store.listSteps(scope, plan.id)
      if (goal.status === 'OBSERVING_RESULT' || goal.status === 'EVALUATING') {
        const evaluated = await this.evaluate(scope, goal, plan, steps)
        if (
          evaluated.result === 'satisfied' &&
          steps.every((step) => step.status === 'SUCCEEDED')
        ) {
          goal = await this.transition(
            evaluated.goal,
            'COMPLETED',
            evaluated.evaluation.reason
          )
          plan = await this.options.store.transitionPlan({
            tenantId: scope,
            planId: plan.id,
            target: 'COMPLETED',
            reason: evaluated.evaluation.reason
          })
          return this.result(
            goal,
            plan,
            steps,
            evaluated.evaluation.reason,
            executedStepIds
          )
        }
        if (evaluated.result === 'blocked') {
          goal = await this.transition(
            evaluated.goal,
            'BLOCKED',
            evaluated.evaluation.reason
          )
          return this.result(
            goal,
            plan,
            steps,
            evaluated.evaluation.reason,
            executedStepIds
          )
        }
        if (evaluated.result === 'unknown') {
          goal = await this.transition(
            evaluated.goal,
            'WAITING_EXTERNAL',
            evaluated.evaluation.reason
          )
          return this.result(
            goal,
            plan,
            steps,
            evaluated.evaluation.reason,
            executedStepIds
          )
        }
        if (steps.some((step) => ['PENDING', 'READY'].includes(step.status))) {
          goal = await this.transition(
            evaluated.goal,
            'EXECUTING',
            'evaluation_requires_remaining_steps'
          )
          lastReason = 'evaluation_requires_remaining_steps'
          continue
        }
        const replanned = await this.replan(
          scope,
          evaluated.goal,
          plan,
          steps,
          evaluated.evaluation
        )
        goal = replanned.goal
        plan = replanned.plan
        lastReason = 'plan_replanned'
        continue
      }

      if (goal.status === 'PLANNING')
        goal = await this.transition(goal, 'GOVERNING', 'replanned_graph_ready')
      if (goal.status === 'GOVERNING')
        goal = await this.transition(
          goal,
          'EXECUTING',
          'step_execution_started'
        )
      steps = await this.options.store.listSteps(scope, plan.id)
      const next = this.nextReadyStep(steps)
      if (!next) {
        if (steps.every((step) => step.status === 'SUCCEEDED')) {
          goal = await this.transition(
            goal,
            'OBSERVING_RESULT',
            'all_plan_steps_observed'
          )
          continue
        }
        if (steps.some((step) => ['FAILED', 'BLOCKED'].includes(step.status))) {
          goal = await this.transition(
            goal,
            'OBSERVING_RESULT',
            'plan_step_requires_evaluation'
          )
          continue
        }
        return this.result(goal, plan, steps, lastReason, executedStepIds)
      }
      if (goal.budget.usage.steps >= goal.budget.maxSteps) {
        goal = await this.transition(
          goal,
          'BUDGET_EXHAUSTED',
          'max_steps_exhausted'
        )
        return this.result(
          goal,
          plan,
          steps,
          'max_steps_exhausted',
          executedStepIds
        )
      }
      const budgetExhaustion = stepBudgetExhaustion(goal, next)
      if (budgetExhaustion !== null) {
        goal = await this.transition(
          goal,
          'BUDGET_EXHAUSTED',
          `${budgetExhaustion}_budget_exhausted_before_execution`
        )
        return this.result(
          goal,
          plan,
          steps,
          'execution_budget_exhausted',
          executedStepIds
        )
      }
      const claimed = await this.options.store.claimStep({
        tenantId: scope,
        goalId: goal.id,
        planId: plan.id,
        stepId: next.id,
        workerId: this.options.workerId,
        expectedGoalVersion: goal.version,
        now: this.clock(),
        leaseMs: this.leaseMs
      })
      if (!claimed) {
        this.options.telemetry?.recordMetric(
          'orchestrator_step_claim_total',
          1,
          { operation: 'step_claim', outcome: 'conflict' }
        )
        lastReason = 'step_claim_not_available'
        continue
      }
      this.options.telemetry?.recordMetric('orchestrator_step_claim_total', 1, {
        operation: 'step_claim',
        outcome: 'claimed'
      })
      const claimedDeadline = effectiveGoalDeadline(
        claimed.goal.createdAt,
        claimed.goal.deadline ?? undefined,
        claimed.goal.budget.maxDurationMs
      )
      if (claimedDeadline <= this.clock()) {
        const expired = await this.options.store.settleStep({
          lease: claimed.lease,
          outcome: 'failed',
          resultDigest: null,
          reason: 'goal_deadline_expired_before_execution',
          approvalId: null,
          now: this.clock(),
          modelCalls: 0,
          toolCalls: 0,
          costUsd: 0,
          observation: {
            kind: 'step_result',
            resultDigest: null,
            evidence: []
          }
        })
        goal = await this.transition(
          expired.goal,
          'BUDGET_EXHAUSTED',
          'goal_deadline_expired_before_execution'
        )
        return this.result(
          goal,
          plan,
          await this.options.store.listSteps(scope, plan.id),
          'goal_deadline_expired_before_execution',
          executedStepIds
        )
      }
      executedStepIds.push(next.id)
      const abortController = new AbortController()
      let activeLease = claimed.lease
      let leaseLost = false
      let heartbeatInFlight: Promise<void> | null = null
      const heartbeat = async (): Promise<void> => {
        if (leaseLost) return
        const renewed = await this.options.store.heartbeatStep({
          lease: activeLease,
          now: this.clock(),
          leaseMs: this.leaseMs
        })
        if (!renewed) {
          leaseLost = true
          abortController.abort('lease_lost')
          return
        }
        activeLease = renewed
      }
      const heartbeatTimer = setInterval(
        () => {
          if (heartbeatInFlight || leaseLost) return
          heartbeatInFlight = heartbeat()
            .catch(() => {
              leaseLost = true
              abortController.abort('lease_lost')
            })
            .finally(() => {
              heartbeatInFlight = null
            })
        },
        Math.max(50, Math.floor(this.leaseMs / 3))
      )
      let execution: StepExecutionResult
      const remainingGoalMs = goal.deadline
        ? goal.deadline.getTime() - this.clock().getTime()
        : goal.createdAt.getTime() +
          goal.budget.maxDurationMs -
          this.clock().getTime()
      const executionTimeoutMs = Math.max(
        1,
        Math.min(next.timeoutMs, Math.max(1, remainingGoalMs))
      )
      const stepTimeout = setTimeout(() => {
        abortController.abort('step_timeout')
      }, executionTimeoutMs)
      try {
        execution = await this.options.executor.execute({
          goal: claimed.goal,
          plan: claimed.plan,
          step: claimed.step,
          lease: activeLease,
          signal: abortController.signal,
          limits: {
            maxModelCalls: Math.max(
              0,
              claimed.goal.budget.maxModelCalls -
                claimed.goal.budget.usage.modelCalls
            ),
            maxToolCalls: Math.max(
              0,
              claimed.goal.budget.maxToolCalls -
                claimed.goal.budget.usage.toolCalls
            ),
            maxDurationMs: Math.max(
              100,
              Math.min(next.timeoutMs, Math.max(100, remainingGoalMs))
            ),
            maxCostUsd: Math.max(
              0,
              claimed.goal.budget.maxCostUsd - claimed.goal.budget.usage.costUsd
            )
          }
        })
      } catch (error) {
        execution = {
          outcome: 'failed',
          reason:
            error instanceof Error ? error.message : 'step_executor_failed'
        }
      } finally {
        clearTimeout(stepTimeout)
        clearInterval(heartbeatTimer)
        if (heartbeatInFlight) await heartbeatInFlight
      }
      if (leaseLost) {
        const current = await this.options.store.getGoal(scope, goalId)
        if (!current)
          throw new OrchestrationError('not_found', `Goal not found: ${goalId}`)
        this.options.telemetry?.recordMetric(
          'orchestrator_step_settle_total',
          1,
          { operation: 'step_settle', outcome: 'lease_lost' }
        )
        return this.result(
          current,
          await this.activePlan(scope, current),
          await this.stepsForActivePlan(scope, current),
          'step_lease_lost',
          executedStepIds
        )
      }
      if (abortController.signal.aborted) {
        execution = {
          ...execution,
          outcome: 'uncertain',
          reason: 'step_timeout'
        }
      }
      let settled: SettledStep
      try {
        settled = await this.options.store.settleStep({
          lease: activeLease,
          outcome: execution.outcome,
          resultDigest: execution.resultDigest ?? null,
          reason: execution.reason,
          approvalId: execution.approvalId ?? null,
          now: this.clock(),
          modelCalls: execution.modelCalls ?? 0,
          toolCalls: execution.toolCalls ?? 0,
          costUsd: execution.costUsd ?? 0,
          observation: {
            kind: 'step_result',
            resultDigest: execution.resultDigest ?? null,
            evidence: execution.evidence ?? []
          }
        })
      } catch (error) {
        if (
          error instanceof OrchestrationError &&
          (error.code === 'lease_lost' || error.code === 'conflict')
        ) {
          const current = await this.options.store.getGoal(scope, goalId)
          if (!current)
            throw new OrchestrationError(
              'not_found',
              `Goal not found: ${goalId}`
            )
          return this.result(
            current,
            await this.activePlan(scope, current),
            await this.stepsForActivePlan(scope, current),
            'step_settle_fenced',
            executedStepIds
          )
        }
        throw error
      }
      this.options.telemetry?.recordMetric(
        'orchestrator_step_settle_total',
        1,
        { operation: 'step_settle', outcome: execution.outcome }
      )
      const specialGoalStatus = goalReasonForStepStatus(settled.step.status)
      if (specialGoalStatus) {
        goal = await this.transition(
          settled.goal,
          specialGoalStatus,
          execution.reason
        )
        return this.result(
          goal,
          plan,
          await this.options.store.listSteps(scope, plan.id),
          execution.reason,
          executedStepIds
        )
      }
      if (
        settled.goal.budget.usage.modelCalls >
          settled.goal.budget.maxModelCalls ||
        settled.goal.budget.usage.toolCalls >
          settled.goal.budget.maxToolCalls ||
        settled.goal.budget.usage.costUsd > settled.goal.budget.maxCostUsd
      ) {
        goal = await this.transition(
          settled.goal,
          'BUDGET_EXHAUSTED',
          'execution_budget_exhausted'
        )
        return this.result(
          goal,
          plan,
          await this.options.store.listSteps(scope, plan.id),
          'execution_budget_exhausted',
          executedStepIds
        )
      }
      goal = await this.transition(
        settled.goal,
        'OBSERVING_RESULT',
        'step_result_observed'
      )
      lastReason = execution.reason
    }

    const exhausted = await this.options.store.getGoal(scope, goalId)
    if (!exhausted)
      throw new OrchestrationError('not_found', `Goal not found: ${goalId}`)
    const stopped = await this.transition(
      exhausted,
      'LOOP_DETECTED',
      'orchestrator_iteration_guard'
    )
    return this.result(
      stopped,
      await this.activePlan(scope, stopped),
      await this.stepsForActivePlan(scope, stopped),
      'orchestrator_iteration_guard',
      executedStepIds
    )
  }

  private async recoverExpiredLeases(
    tenantId: OrchestrationTenantId
  ): Promise<void> {
    const expired = await this.options.store.listExpiredLeases(
      tenantId,
      this.clock()
    )
    for (const step of expired) {
      const decision = this.options.reconcileExpiredLease
        ? await this.options.reconcileExpiredLease(step)
        : 'uncertain'
      await this.options.store.recoverExpiredLease({
        tenantId,
        stepId: step.id,
        leaseToken: step.leaseToken,
        stepVersion: step.version,
        now: this.clock(),
        decision,
        reason:
          decision === 'retry'
            ? 'lease_expired_safe_to_retry'
            : 'lease_expired_requires_reconciliation'
      })
    }
  }

  private async activePlan(
    tenantId: OrchestrationTenantId,
    goal: Goal
  ): Promise<Plan | null> {
    return this.options.store.getActivePlan(tenantId, goal.id)
  }

  private async stepsForActivePlan(
    tenantId: OrchestrationTenantId,
    goal: Goal
  ): Promise<PlanStep[]> {
    const plan = await this.activePlan(tenantId, goal)
    return plan ? this.options.store.listSteps(tenantId, plan.id) : []
  }

  private async advance(
    goal: Goal,
    target: GoalStatus,
    reason: string
  ): Promise<Goal> {
    return this.transition(goal, target, reason)
  }

  private async transition(
    goal: Goal,
    target: GoalStatus,
    reason: string
  ): Promise<Goal> {
    if (goal.status === target) return goal
    const span = this.options.telemetry?.startSpan(
      'orchestrator.goal.transition',
      {
        operation: 'goal_transition',
        goalId: goal.id,
        fromStatus: goal.status,
        toStatus: target
      }
    )
    try {
      const transitioned = await this.options.store.transitionGoal({
        tenantId: goal.tenantId,
        goalId: goal.id,
        expectedVersion: goal.version,
        target,
        reason
      })
      span?.end('ok')
      this.options.telemetry?.recordMetric(
        'orchestrator_goal_transition_total',
        1,
        { operation: 'goal_transition', status: target }
      )
      return transitioned
    } catch (error) {
      span?.end(
        'error',
        error instanceof Error && 'code' in error
          ? String((error as { code: unknown }).code)
          : 'goal_transition_failed'
      )
      this.options.telemetry?.recordMetric(
        'orchestrator_goal_transition_total',
        1,
        { operation: 'goal_transition', status: 'error' }
      )
      throw error
    }
  }

  private nextReadyStep(steps: readonly PlanStep[]): PlanStep | null {
    const succeeded = new Set(
      steps.filter((step) => step.status === 'SUCCEEDED').map((step) => step.id)
    )
    return (
      [...steps]
        .filter(
          (step) =>
            ['PENDING', 'READY'].includes(step.status) &&
            step.dependencies.every((dependency) => succeeded.has(dependency))
        )
        .sort((left, right) => left.id.localeCompare(right.id))[0] ?? null
    )
  }

  private async evaluate(
    tenantId: OrchestrationTenantId,
    goal: Goal,
    plan: Plan,
    steps: PlanStep[]
  ): Promise<{
    goal: Goal
    evaluation: GoalEvaluation
    result: GoalEvaluation['result']
  }> {
    if (goal.status === 'OBSERVING_RESULT')
      goal = await this.transition(goal, 'EVALUATING', 'evaluation_started')
    const observations = await this.options.store.listObservations(
      tenantId,
      goal.id
    )
    const evaluation = await this.options.evaluator.evaluate({
      goal,
      plan,
      steps,
      observations
    })
    const evidence = evaluation.evidence ?? []
    if (
      evaluation.result === 'satisfied' &&
      (evidence.length === 0 || evidence.some((item) => !item.verified))
    ) {
      throw new OrchestrationError(
        'invalid_plan',
        'Goal cannot be completed without verified operational evidence'
      )
    }
    const evaluationRecord = await this.options.store.recordEvaluation({
      tenantId,
      goalId: goal.id,
      planId: plan.id,
      stepId: null,
      evaluatorType: 'deterministic-governed-evaluator',
      criteria: goal.successCriteria,
      evidence,
      result: evaluation.result,
      reason: evaluation.reason
    })
    return {
      goal,
      evaluation: { ...evaluation, id: evaluationRecord.id },
      result: evaluation.result
    }
  }

  private async replan(
    tenantId: OrchestrationTenantId,
    goal: Goal,
    previousPlan: Plan,
    steps: PlanStep[],
    evaluation: GoalEvaluation
  ): Promise<{ goal: Goal; plan: Plan }> {
    if (goal.budget.usage.replans >= goal.budget.maxReplans) {
      const exhausted = await this.transition(
        goal,
        'BUDGET_EXHAUSTED',
        'max_replans_exhausted'
      )
      return { goal: exhausted, plan: previousPlan }
    }
    goal = await this.transition(
      goal,
      'REPLANNING',
      `replan_requested:${evaluation.reason}`
    )
    const draft = await this.options.planner.plan({
      goal,
      previousPlan,
      steps,
      observations: await this.options.store.listObservations(
        tenantId,
        goal.id
      ),
      evaluation
    })
    const graph = validatePlanGraph(
      {
        id: 'plan_draft',
        goalId: goal.id,
        tenantId,
        version: previousPlan.version + 1
      },
      draft.steps
    )
    if (goal.replanFingerprints.includes(graph.fingerprint)) {
      const loop = await this.transition(
        goal,
        'LOOP_DETECTED',
        'replan_fingerprint_repeated'
      )
      return { goal: loop, plan: previousPlan }
    }
    const activated = await this.options.store.activatePlan({
      tenantId,
      goalId: goal.id,
      expectedGoalVersion: goal.version,
      planVersion: previousPlan.version + 1,
      parentPlanId: previousPlan.id,
      reason: draft.reason,
      steps: draft.steps,
      consumeReplan: true,
      fingerprint: graph.fingerprint,
      triggeringEvaluationId: evaluation.id ?? null
    })
    const planned = await this.transition(
      activated.goal,
      'PLANNING',
      'replan_validated'
    )
    return { goal: planned, plan: activated.plan }
  }

  private result(
    goal: Goal,
    plan: Plan | null,
    steps: PlanStep[] | undefined,
    reason: string,
    executedStepIds: string[] = []
  ): OrchestrationRunResult {
    return {
      goal,
      plan,
      steps: steps ?? [],
      reason,
      executedStepIds: [...executedStepIds]
    }
  }
}
