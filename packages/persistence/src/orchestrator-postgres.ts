import { createDomainId, CorrelationIdSchema } from '@cvg/shared'
import { TenantIdSchema } from '@cvg/platform'
import type { QueryResultRow } from 'pg'
import {
  assertGoalTransition,
  assertPlanTransition,
  assertPlanStepTransition,
  createExecutionBudget,
  materializePlanSteps,
  OrchestrationError,
  OrchestrationTenantIdSchema,
  validatePlanGraph,
  PlanStatusSchema,
  PlanStepStatusSchema,
  GoalStatusSchema,
  type ActivatePlanInput,
  type ActivatePlanResult,
  type AttemptRecord,
  type ClaimStepInput,
  type ClaimedStep,
  type CreateGoalInput,
  type EvaluationRecord,
  type ExecutionBudget,
  type Goal,
  type GoalPlanStore,
  type GoalStatus,
  type ObservationRecord,
  type OrchestrationTenantId,
  type Plan,
  type PlanStatus,
  type PlanStep,
  type RecoverExpiredLeaseInput,
  type SettleStepInput,
  type SettledStep,
  type StepLease,
  type TransitionGoalInput
} from '@cvg/agent-runtime'
import {
  withTenantContext,
  withTenantTransaction,
  type PostgresPoolLike,
  type PostgresPoolClient
} from './tenant-scoped-postgres.ts'

interface GoalRow extends QueryResultRow {
  tenant_id: string
  id: string
  session_id: string | null
  conversation_id: string | null
  objective: string
  success_criteria: unknown
  status: string
  budget: unknown
  budget_usage: unknown
  deadline: Date | null
  correlation_id: string
  active_plan_id: string | null
  execution_snapshot: unknown
  replan_fingerprints: unknown
  last_reason: string | null
  last_error: string | null
  version: number
  created_at: Date
  updated_at: Date
}

interface PlanRow extends QueryResultRow {
  tenant_id: string
  id: string
  goal_id: string
  version: number
  parent_plan_id: string | null
  reason: string
  status: string
  fingerprint: string
  created_at: Date
  updated_at: Date
}

interface StepRow extends QueryResultRow {
  tenant_id: string
  id: string
  goal_id: string
  plan_id: string
  type: string
  description: string
  dependencies: unknown
  required_capabilities: unknown
  risk_level: PlanStep['riskLevel']
  approval_requirement: PlanStep['approvalRequirement']
  status: string
  attempt_count: number
  input: unknown
  input_hash: string
  expected_outcome: unknown
  timeout_ms: number
  intent: unknown
  approval_id: string | null
  tool_id: string | null
  tool_version: string | null
  result_hash: string | null
  last_error: string | null
  started_at: Date | null
  completed_at: Date | null
  lease_owner: string | null
  lease_token: string | null
  lease_until: Date | null
  version: number
  created_at: Date
  updated_at: Date
}

interface AttemptRow extends QueryResultRow {
  tenant_id: string
  id: string
  goal_id: string
  plan_id: string
  step_id: string
  worker_id: string
  lease_token: string
  started_at: Date
  finished_at: Date | null
  outcome: string | null
  error_class: string | null
  correlation_id: string
}

interface ObservationRow extends QueryResultRow {
  tenant_id: string
  id: string
  goal_id: string
  plan_id: string
  step_id: string | null
  kind: ObservationRecord['kind']
  result_digest: string | null
  evidence: unknown
  created_at: Date
}

interface EvaluationRow extends QueryResultRow {
  tenant_id: string
  id: string
  goal_id: string
  plan_id: string
  step_id: string | null
  evaluator_type: string
  criteria: unknown
  evidence: unknown
  result: EvaluationRecord['result']
  reason: string
  created_at: Date
}

function jsonValue<T>(value: unknown): T {
  if (typeof value === 'string') return JSON.parse(value) as T
  return value as T
}

function dateValue(value: Date | string | null): Date | null {
  if (value === null) return null
  return value instanceof Date ? new Date(value) : new Date(value)
}

function tenantId(value: string): OrchestrationTenantId {
  TenantIdSchema.parse(value)
  return OrchestrationTenantIdSchema.parse(value)
}

function budgetLimits(budget: ExecutionBudget): Record<string, number> {
  return {
    maxSteps: budget.maxSteps,
    maxReplans: budget.maxReplans,
    maxModelCalls: budget.maxModelCalls,
    maxToolCalls: budget.maxToolCalls,
    maxDurationMs: budget.maxDurationMs,
    maxCostUsd: budget.maxCostUsd
  }
}

function toGoal(row: GoalRow): Goal {
  const budget = jsonValue<Omit<ExecutionBudget, 'usage'>>(row.budget)
  const usage = jsonValue<ExecutionBudget['usage']>(row.budget_usage)
  return {
    id: row.id,
    tenantId: tenantId(row.tenant_id),
    sessionId: row.session_id,
    conversationId: row.conversation_id,
    objective: row.objective,
    successCriteria: jsonValue<Goal['successCriteria']>(row.success_criteria),
    status: GoalStatusSchema.parse(row.status),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deadline: dateValue(row.deadline),
    budget: { ...budget, usage },
    correlationId: CorrelationIdSchema.parse(row.correlation_id),
    version: Number(row.version),
    activePlanId: row.active_plan_id,
    executionSnapshot: jsonValue<Goal['executionSnapshot']>(
      row.execution_snapshot
    ),
    replanFingerprints: jsonValue<string[]>(row.replan_fingerprints),
    lastReason: row.last_reason,
    lastError: row.last_error
  }
}

function toPlan(row: PlanRow): Plan {
  return {
    id: row.id,
    goalId: row.goal_id,
    tenantId: tenantId(row.tenant_id),
    version: Number(row.version),
    parentPlanId: row.parent_plan_id,
    reason: row.reason,
    status: PlanStatusSchema.parse(row.status),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    fingerprint: row.fingerprint
  }
}

function toStep(row: StepRow): PlanStep {
  return {
    id: row.id,
    goalId: row.goal_id,
    planId: row.plan_id,
    tenantId: tenantId(row.tenant_id),
    type: row.type,
    description: row.description,
    dependencies: jsonValue<string[]>(row.dependencies),
    requiredCapabilities: jsonValue<PlanStep['requiredCapabilities']>(
      row.required_capabilities
    ),
    riskLevel: row.risk_level,
    approvalRequirement: row.approval_requirement,
    status: PlanStepStatusSchema.parse(row.status),
    attemptCount: row.attempt_count,
    input: row.input,
    inputHash: row.input_hash,
    expectedOutcome: row.expected_outcome,
    timeoutMs: row.timeout_ms,
    intent: jsonValue<PlanStep['intent']>(row.intent),
    approvalId: row.approval_id,
    toolId: row.tool_id,
    toolVersion: row.tool_version,
    resultHash: row.result_hash,
    lastError: row.last_error,
    startedAt: dateValue(row.started_at),
    completedAt: dateValue(row.completed_at),
    leaseOwner: row.lease_owner,
    leaseToken: row.lease_token,
    leaseUntil: dateValue(row.lease_until),
    version: Number(row.version),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }
}

function toAttempt(row: AttemptRow): AttemptRecord {
  return {
    id: row.id,
    tenantId: tenantId(row.tenant_id),
    goalId: row.goal_id,
    planId: row.plan_id,
    stepId: row.step_id,
    workerId: row.worker_id,
    leaseToken: row.lease_token,
    startedAt: new Date(row.started_at),
    finishedAt: dateValue(row.finished_at),
    outcome: row.outcome,
    errorClass: row.error_class,
    correlationId: CorrelationIdSchema.parse(row.correlation_id)
  }
}

function toObservation(row: ObservationRow): ObservationRecord {
  return {
    id: row.id,
    tenantId: tenantId(row.tenant_id),
    goalId: row.goal_id,
    planId: row.plan_id,
    stepId: row.step_id,
    kind: row.kind,
    resultDigest: row.result_digest,
    evidence: jsonValue<ObservationRecord['evidence']>(row.evidence),
    createdAt: new Date(row.created_at)
  }
}

function toEvaluation(row: EvaluationRow): EvaluationRecord {
  return {
    id: row.id,
    tenantId: tenantId(row.tenant_id),
    goalId: row.goal_id,
    planId: row.plan_id,
    stepId: row.step_id,
    evaluatorType: row.evaluator_type,
    criteria: jsonValue<EvaluationRecord['criteria']>(row.criteria),
    evidence: jsonValue<EvaluationRecord['evidence']>(row.evidence),
    result: row.result,
    reason: row.reason,
    createdAt: new Date(row.created_at)
  }
}

function executionStatus(
  outcome: SettleStepInput['outcome']
): PlanStep['status'] {
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

async function one<T extends QueryResultRow>(
  client: PostgresPoolClient,
  text: string,
  values: unknown[]
): Promise<T> {
  const result = await client.query<T>(text, values)
  const row = result.rows[0]
  if (!row)
    throw new OrchestrationError('not_found', 'Orchestration record not found')
  return row
}

export class PostgresGoalPlanStore implements GoalPlanStore {
  constructor(
    private readonly pool: PostgresPoolLike,
    private readonly clock: () => Date = () => new Date()
  ) {}

  async createGoal(input: CreateGoalInput): Promise<Goal> {
    const scope = tenantId(input.tenantId)
    const correlationId = CorrelationIdSchema.parse(input.correlationId)
    const createdAt = this.clock()
    const budget = createExecutionBudget(input.budget)
    const id = createDomainId('goal')
    const snapshot: Goal['executionSnapshot'] = {
      agentVersion: input.executionSnapshot?.agentVersion ?? null,
      promptVersion: input.executionSnapshot?.promptVersion ?? null,
      policyVersion: input.executionSnapshot?.policyVersion ?? null,
      modelProfile: input.executionSnapshot?.modelProfile ?? null,
      toolVersions: { ...(input.executionSnapshot?.toolVersions ?? {}) }
    }
    return withTenantTransaction(this.pool, scope, async (client) => {
      const row = await one<GoalRow>(
        client,
        `INSERT INTO orchestrator_goals
           (tenant_id, id, session_id, conversation_id, objective,
            success_criteria, status, budget, budget_usage, deadline,
            correlation_id, execution_snapshot, replan_fingerprints,
            version, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'OBSERVING', $7::jsonb,
                 $8::jsonb, $9, $10, $11::jsonb, '[]'::jsonb, 1, $12, $12)
         RETURNING *`,
        [
          scope,
          id,
          input.sessionId ?? null,
          input.conversationId ?? null,
          input.objective,
          JSON.stringify(input.successCriteria),
          JSON.stringify(budgetLimits(budget)),
          JSON.stringify(budget.usage),
          input.deadline ?? null,
          correlationId,
          JSON.stringify(snapshot),
          createdAt
        ]
      )
      return toGoal(row)
    })
  }

  async getGoal(
    tenant: OrchestrationTenantId,
    goalId: string
  ): Promise<Goal | null> {
    const scope = tenantId(tenant)
    return withTenantContext(this.pool, scope, async (client) => {
      const result = await client.query<GoalRow>(
        'SELECT * FROM orchestrator_goals WHERE tenant_id = $1 AND id = $2',
        [scope, goalId]
      )
      return result.rows[0] ? toGoal(result.rows[0]) : null
    })
  }

  async listRunnableGoals(tenant?: OrchestrationTenantId): Promise<Goal[]> {
    const scopes = tenant ? [tenantId(tenant)] : undefined
    if (!scopes) {
      throw new OrchestrationError(
        'tenant_violation',
        'PostgresGoalPlanStore requires an explicit tenant for runnable goal recovery'
      )
    }
    return withTenantContext(this.pool, scopes[0]!, async (client) => {
      const result = await client.query<GoalRow>(
        `SELECT * FROM orchestrator_goals
         WHERE tenant_id = $1
           AND status NOT IN ('COMPLETED', 'BLOCKED', 'FAILED', 'CANCELLED', 'BUDGET_EXHAUSTED', 'LOOP_DETECTED')
         ORDER BY updated_at, id`,
        [scopes[0]]
      )
      return result.rows.map(toGoal)
    })
  }

  async transitionGoal(input: TransitionGoalInput): Promise<Goal> {
    const scope = tenantId(input.tenantId)
    return withTenantTransaction(this.pool, scope, async (client) => {
      const current = toGoal(
        await one<GoalRow>(
          client,
          'SELECT * FROM orchestrator_goals WHERE tenant_id = $1 AND id = $2 FOR UPDATE',
          [scope, input.goalId]
        )
      )
      if (current.version !== input.expectedVersion) {
        throw new OrchestrationError(
          'conflict',
          `Goal version conflict for ${input.goalId}`
        )
      }
      assertGoalTransition(current.status, input.target)
      const row = await one<GoalRow>(
        client,
        `UPDATE orchestrator_goals
            SET status = $3,
                last_reason = $4,
                last_error = $5,
                version = version + 1,
                updated_at = $6
          WHERE tenant_id = $1 AND id = $2 AND version = $7
          RETURNING *`,
        [
          scope,
          input.goalId,
          input.target,
          input.reason,
          input.lastError === undefined ? current.lastError : input.lastError,
          this.clock(),
          input.expectedVersion
        ]
      )
      return toGoal(row)
    })
  }

  async activatePlan(input: ActivatePlanInput): Promise<ActivatePlanResult> {
    const scope = tenantId(input.tenantId)
    return withTenantTransaction(this.pool, scope, async (client) => {
      const current = toGoal(
        await one<GoalRow>(
          client,
          'SELECT * FROM orchestrator_goals WHERE tenant_id = $1 AND id = $2 FOR UPDATE',
          [scope, input.goalId]
        )
      )
      if (current.version !== input.expectedGoalVersion) {
        throw new OrchestrationError(
          'conflict',
          `Goal version conflict for ${input.goalId}`
        )
      }
      if (
        input.consumeReplan &&
        current.budget.usage.replans >= current.budget.maxReplans
      ) {
        throw new OrchestrationError(
          'budget_exhausted',
          'Goal replan budget is exhausted'
        )
      }
      const planId = createDomainId('plan')
      const graph = validatePlanGraph(
        {
          id: planId,
          goalId: input.goalId,
          tenantId: scope,
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
      if (
        input.consumeReplan &&
        current.replanFingerprints.includes(graph.fingerprint)
      ) {
        throw new OrchestrationError(
          'loop_detected',
          'Plan fingerprint already exists for this Goal'
        )
      }
      const createdAt = this.clock()
      const plan: Plan = {
        id: planId,
        goalId: input.goalId,
        tenantId: scope,
        version: input.planVersion,
        parentPlanId: input.parentPlanId,
        reason: input.reason,
        status: 'ACTIVE',
        createdAt,
        updatedAt: createdAt,
        fingerprint: graph.fingerprint
      }
      const steps = materializePlanSteps(
        scope,
        input.goalId,
        plan,
        input.steps,
        createdAt
      )
      await client.query(
        `UPDATE orchestrator_plans
            SET status = 'SUPERSEDED', updated_at = $3
          WHERE tenant_id = $1 AND goal_id = $2 AND status = 'ACTIVE'`,
        [scope, input.goalId, createdAt]
      )
      await client.query(
        `INSERT INTO orchestrator_plans
          (tenant_id, id, goal_id, version, parent_plan_id, reason, status,
           fingerprint, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', $7, $8, $8)`,
        [
          scope,
          plan.id,
          plan.goalId,
          plan.version,
          plan.parentPlanId,
          plan.reason,
          plan.fingerprint,
          createdAt
        ]
      )
      for (const step of steps) {
        await client.query(
          `INSERT INTO orchestrator_steps
            (tenant_id, id, goal_id, plan_id, type, description,
             dependencies, required_capabilities, risk_level, approval_requirement,
             status, attempt_count, input, input_hash, expected_outcome, timeout_ms,
             intent, approval_id, tool_id, tool_version, result_hash, last_error,
             started_at, completed_at, lease_owner, lease_token, lease_until,
             version, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10,
                   $11, 0, $12::jsonb, $13, $14::jsonb, $15, $16::jsonb,
                   NULL, $17, $18, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
                   1, $19, $19)`,
          [
            scope,
            step.id,
            step.goalId,
            step.planId,
            step.type,
            step.description,
            JSON.stringify(step.dependencies),
            JSON.stringify(step.requiredCapabilities),
            step.riskLevel,
            step.approvalRequirement,
            step.status,
            JSON.stringify(step.input),
            step.inputHash,
            JSON.stringify(step.expectedOutcome),
            step.timeoutMs,
            JSON.stringify(step.intent),
            step.toolId,
            step.toolVersion,
            createdAt
          ]
        )
      }
      const usage = { ...current.budget.usage }
      if (input.consumeReplan) usage.replans += 1
      const fingerprints = current.replanFingerprints.includes(
        graph.fingerprint
      )
        ? current.replanFingerprints
        : [...current.replanFingerprints, graph.fingerprint]
      const updated = await one<GoalRow>(
        client,
        `UPDATE orchestrator_goals
            SET active_plan_id = $3,
                budget_usage = $4::jsonb,
                replan_fingerprints = $5::jsonb,
                last_reason = $6,
                version = version + 1,
                updated_at = $7
          WHERE tenant_id = $1 AND id = $2 AND version = $8
          RETURNING *`,
        [
          scope,
          input.goalId,
          plan.id,
          JSON.stringify(usage),
          JSON.stringify(fingerprints),
          input.reason,
          createdAt,
          input.expectedGoalVersion
        ]
      )
      return { goal: toGoal(updated), plan, steps }
    })
  }

  async getPlan(
    tenant: OrchestrationTenantId,
    planId: string
  ): Promise<Plan | null> {
    const scope = tenantId(tenant)
    return withTenantContext(this.pool, scope, async (client) => {
      const result = await client.query<PlanRow>(
        'SELECT * FROM orchestrator_plans WHERE tenant_id = $1 AND id = $2',
        [scope, planId]
      )
      return result.rows[0] ? toPlan(result.rows[0]) : null
    })
  }

  async transitionPlan(input: {
    tenantId: OrchestrationTenantId
    planId: string
    target: PlanStatus
    reason: string
  }): Promise<Plan> {
    const scope = tenantId(input.tenantId)
    return withTenantTransaction(this.pool, scope, async (client) => {
      const current = toPlan(
        await one<PlanRow>(
          client,
          'SELECT * FROM orchestrator_plans WHERE tenant_id = $1 AND id = $2 FOR UPDATE',
          [scope, input.planId]
        )
      )
      assertPlanTransition(current.status, input.target)
      return toPlan(
        await one<PlanRow>(
          client,
          `UPDATE orchestrator_plans
              SET status = $3, reason = $4, updated_at = $5
            WHERE tenant_id = $1 AND id = $2
            RETURNING *`,
          [scope, input.planId, input.target, input.reason, this.clock()]
        )
      )
    })
  }

  async getActivePlan(
    tenant: OrchestrationTenantId,
    goalId: string
  ): Promise<Plan | null> {
    const scope = tenantId(tenant)
    return withTenantContext(this.pool, scope, async (client) => {
      const result = await client.query<PlanRow>(
        `SELECT p.*
           FROM orchestrator_plans p
           JOIN orchestrator_goals g
             ON g.tenant_id = p.tenant_id AND g.active_plan_id = p.id
          WHERE p.tenant_id = $1 AND g.id = $2`,
        [scope, goalId]
      )
      return result.rows[0] ? toPlan(result.rows[0]) : null
    })
  }

  async listPlans(
    tenant: OrchestrationTenantId,
    goalId: string
  ): Promise<Plan[]> {
    const scope = tenantId(tenant)
    return withTenantContext(this.pool, scope, async (client) => {
      const result = await client.query<PlanRow>(
        'SELECT * FROM orchestrator_plans WHERE tenant_id = $1 AND goal_id = $2 ORDER BY version',
        [scope, goalId]
      )
      return result.rows.map(toPlan)
    })
  }

  async listSteps(
    tenant: OrchestrationTenantId,
    planId: string
  ): Promise<PlanStep[]> {
    const scope = tenantId(tenant)
    return withTenantContext(this.pool, scope, async (client) => {
      const result = await client.query<StepRow>(
        'SELECT * FROM orchestrator_steps WHERE tenant_id = $1 AND plan_id = $2 ORDER BY id',
        [scope, planId]
      )
      return result.rows.map(toStep)
    })
  }

  async getStep(
    tenant: OrchestrationTenantId,
    stepId: string
  ): Promise<PlanStep | null> {
    const scope = tenantId(tenant)
    return withTenantContext(this.pool, scope, async (client) => {
      const result = await client.query<StepRow>(
        'SELECT * FROM orchestrator_steps WHERE tenant_id = $1 AND id = $2',
        [scope, stepId]
      )
      return result.rows[0] ? toStep(result.rows[0]) : null
    })
  }

  async claimStep(input: ClaimStepInput): Promise<ClaimedStep | null> {
    const scope = tenantId(input.tenantId)
    return withTenantTransaction(this.pool, scope, async (client) => {
      const goal = toGoal(
        await one<GoalRow>(
          client,
          'SELECT * FROM orchestrator_goals WHERE tenant_id = $1 AND id = $2 FOR UPDATE',
          [scope, input.goalId]
        )
      )
      const plan = toPlan(
        await one<PlanRow>(
          client,
          'SELECT * FROM orchestrator_plans WHERE tenant_id = $1 AND id = $2 FOR UPDATE',
          [scope, input.planId]
        )
      )
      const current = toStep(
        await one<StepRow>(
          client,
          'SELECT * FROM orchestrator_steps WHERE tenant_id = $1 AND id = $2 FOR UPDATE',
          [scope, input.stepId]
        )
      )
      if (goal.version !== input.expectedGoalVersion)
        throw new OrchestrationError(
          'conflict',
          `Goal version conflict for ${input.goalId}`
        )
      if (
        goal.activePlanId !== plan.id ||
        plan.status !== 'ACTIVE' ||
        current.goalId !== goal.id ||
        current.planId !== plan.id
      )
        return null
      if (current.leaseUntil && current.leaseUntil > input.now) return null
      if (!['PENDING', 'READY', 'EXECUTING'].includes(current.status))
        return null
      if (goal.budget.usage.steps >= goal.budget.maxSteps)
        throw new OrchestrationError(
          'budget_exhausted',
          'Goal step budget is exhausted'
        )
      if (current.dependencies.length > 0) {
        const dependencyRows = await client.query<
          Pick<StepRow, 'id' | 'status'>
        >(
          'SELECT id, status FROM orchestrator_steps WHERE tenant_id = $1 AND id = ANY($2::text[])',
          [scope, current.dependencies]
        )
        const statuses = new Map(
          dependencyRows.rows.map((row) => [row.id, row.status])
        )
        if (
          current.dependencies.some(
            (dependency) => statuses.get(dependency) !== 'SUCCEEDED'
          )
        )
          return null
      }
      const leaseToken = createDomainId('lease')
      const attemptId = createDomainId('attempt')
      const leaseUntil = new Date(input.now.getTime() + input.leaseMs)
      const updatedStep = toStep(
        await one<StepRow>(
          client,
          `UPDATE orchestrator_steps
          SET status = 'EXECUTING', attempt_count = attempt_count + 1,
              started_at = COALESCE(started_at, $4), lease_owner = $3,
              lease_token = $5, lease_until = $6, version = version + 1,
              updated_at = $4
        WHERE tenant_id = $1 AND id = $2 AND version = $7
        RETURNING *`,
          [
            scope,
            current.id,
            input.workerId,
            input.now,
            leaseToken,
            leaseUntil,
            current.version
          ]
        )
      )
      const usage = { ...goal.budget.usage, steps: goal.budget.usage.steps + 1 }
      const updatedGoal = toGoal(
        await one<GoalRow>(
          client,
          `UPDATE orchestrator_goals
          SET budget_usage = $3::jsonb, version = version + 1,
              last_reason = $4, updated_at = $5
        WHERE tenant_id = $1 AND id = $2 AND version = $6
        RETURNING *`,
          [
            scope,
            goal.id,
            JSON.stringify(usage),
            `step_claimed:${current.id}`,
            input.now,
            goal.version
          ]
        )
      )
      await client.query(
        `INSERT INTO orchestrator_attempts
        (tenant_id, id, goal_id, plan_id, step_id, worker_id, lease_token,
         started_at, finished_at, outcome, error_class, correlation_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, NULL, NULL, $9)`,
        [
          scope,
          attemptId,
          goal.id,
          plan.id,
          current.id,
          input.workerId,
          leaseToken,
          input.now,
          goal.correlationId
        ]
      )
      return {
        lease: {
          tenantId: scope,
          goalId: goal.id,
          planId: plan.id,
          stepId: current.id,
          workerId: input.workerId,
          leaseToken,
          attemptId,
          leaseUntil,
          goalVersion: updatedGoal.version,
          stepVersion: updatedStep.version
        },
        goal: updatedGoal,
        plan,
        step: updatedStep
      }
    })
  }

  async heartbeatStep(input: {
    lease: StepLease
    now: Date
    leaseMs: number
  }): Promise<StepLease | null> {
    const scope = tenantId(input.lease.tenantId)
    return withTenantTransaction(this.pool, scope, async (client) => {
      const current = toStep(
        await one<StepRow>(
          client,
          'SELECT * FROM orchestrator_steps WHERE tenant_id = $1 AND id = $2 FOR UPDATE',
          [scope, input.lease.stepId]
        )
      )
      if (
        current.leaseOwner !== input.lease.workerId ||
        current.leaseToken !== input.lease.leaseToken ||
        current.status !== 'EXECUTING' ||
        !current.leaseUntil ||
        current.leaseUntil <= input.now
      )
        return null
      const leaseUntil = new Date(input.now.getTime() + input.leaseMs)
      const updated = toStep(
        await one<StepRow>(
          client,
          `UPDATE orchestrator_steps
          SET lease_until = $3, version = version + 1, updated_at = $4
        WHERE tenant_id = $1 AND id = $2 AND version = $5
        RETURNING *`,
          [scope, current.id, leaseUntil, input.now, current.version]
        )
      )
      return { ...input.lease, leaseUntil, stepVersion: updated.version }
    })
  }

  async settleStep(input: SettleStepInput): Promise<SettledStep> {
    const scope = tenantId(input.lease.tenantId)
    return withTenantTransaction(this.pool, scope, async (client) => {
      const current = toStep(
        await one<StepRow>(
          client,
          'SELECT * FROM orchestrator_steps WHERE tenant_id = $1 AND id = $2 FOR UPDATE',
          [scope, input.lease.stepId]
        )
      )
      const goal = toGoal(
        await one<GoalRow>(
          client,
          'SELECT * FROM orchestrator_goals WHERE tenant_id = $1 AND id = $2 FOR UPDATE',
          [scope, input.lease.goalId]
        )
      )
      if (
        current.leaseOwner !== input.lease.workerId ||
        current.leaseToken !== input.lease.leaseToken
      )
        throw new OrchestrationError(
          'lease_lost',
          `Lease lost for step ${current.id}`
        )
      if (goal.version !== input.lease.goalVersion)
        throw new OrchestrationError(
          'conflict',
          'Goal changed while step was executing'
        )
      assertPlanStepTransition(current.status, executionStatus(input.outcome))
      const target = executionStatus(input.outcome)
      const updatedStep = toStep(
        await one<StepRow>(
          client,
          `UPDATE orchestrator_steps
          SET status = $3, approval_id = $4, result_hash = $5,
              last_error = $6, completed_at = $7, lease_owner = NULL,
              lease_token = NULL, lease_until = NULL, version = version + 1,
              updated_at = $8
        WHERE tenant_id = $1 AND id = $2 AND version = $9
        RETURNING *`,
          [
            scope,
            current.id,
            target,
            input.approvalId,
            input.resultDigest,
            target === 'FAILED' || target === 'UNCERTAIN' ? input.reason : null,
            target === 'SUCCEEDED' ? input.now : null,
            input.now,
            current.version
          ]
        )
      )
      const usage = {
        ...goal.budget.usage,
        modelCalls: goal.budget.usage.modelCalls + input.modelCalls,
        toolCalls: goal.budget.usage.toolCalls + input.toolCalls,
        costUsd: goal.budget.usage.costUsd + input.costUsd
      }
      const updatedGoal = toGoal(
        await one<GoalRow>(
          client,
          `UPDATE orchestrator_goals
          SET budget_usage = $3::jsonb, last_reason = $4,
              last_error = $5, version = version + 1, updated_at = $6
        WHERE tenant_id = $1 AND id = $2 AND version = $7
        RETURNING *`,
          [
            scope,
            goal.id,
            JSON.stringify(usage),
            `step_settled:${current.id}:${target}`,
            target === 'FAILED' || target === 'UNCERTAIN'
              ? input.reason
              : goal.lastError,
            input.now,
            goal.version
          ]
        )
      )
      await client.query(
        `UPDATE orchestrator_attempts
          SET finished_at = $4, outcome = $5, error_class = $6
        WHERE tenant_id = $1 AND id = $2 AND step_id = $3 AND lease_token = $7`,
        [
          scope,
          input.lease.attemptId,
          current.id,
          input.now,
          target,
          target === 'FAILED' || target === 'UNCERTAIN' ? input.reason : null,
          input.lease.leaseToken
        ]
      )
      return { goal: updatedGoal, step: updatedStep }
    })
  }

  async listExpiredLeases(
    tenant: OrchestrationTenantId,
    now: Date
  ): Promise<PlanStep[]> {
    const scope = tenantId(tenant)
    return withTenantContext(this.pool, scope, async (client) => {
      const result = await client.query<StepRow>(
        'SELECT * FROM orchestrator_steps WHERE tenant_id = $1 AND lease_until IS NOT NULL AND lease_until <= $2 ORDER BY id',
        [scope, now]
      )
      return result.rows.map(toStep)
    })
  }

  async recoverExpiredLease(
    input: RecoverExpiredLeaseInput
  ): Promise<SettledStep> {
    const scope = tenantId(input.tenantId)
    return withTenantTransaction(this.pool, scope, async (client) => {
      const current = toStep(
        await one<StepRow>(
          client,
          'SELECT * FROM orchestrator_steps WHERE tenant_id = $1 AND id = $2 FOR UPDATE',
          [scope, input.stepId]
        )
      )
      const goal = toGoal(
        await one<GoalRow>(
          client,
          'SELECT * FROM orchestrator_goals WHERE tenant_id = $1 AND id = $2 FOR UPDATE',
          [scope, current.goalId]
        )
      )
      if (!current.leaseUntil || current.leaseUntil > input.now)
        return { goal, step: current }
      const target: PlanStep['status'] =
        input.decision === 'retry' ? 'READY' : 'UNCERTAIN'
      assertPlanStepTransition(current.status, target)
      const updatedStep = toStep(
        await one<StepRow>(
          client,
          `UPDATE orchestrator_steps
          SET status = $3, last_error = $4, lease_owner = NULL,
              lease_token = NULL, lease_until = NULL, version = version + 1,
              updated_at = $5
        WHERE tenant_id = $1 AND id = $2 AND version = $6
        RETURNING *`,
          [scope, current.id, target, input.reason, input.now, current.version]
        )
      )
      let targetGoalStatus: GoalStatus = goal.status
      if (input.decision === 'uncertain' && goal.status === 'EXECUTING') {
        assertGoalTransition(goal.status, 'UNCERTAIN')
        targetGoalStatus = 'UNCERTAIN'
      }
      const updatedGoal = toGoal(
        await one<GoalRow>(
          client,
          `UPDATE orchestrator_goals
          SET status = $3, last_reason = $4, last_error = $5,
              version = version + 1, updated_at = $6
        WHERE tenant_id = $1 AND id = $2 AND version = $7
        RETURNING *`,
          [
            scope,
            goal.id,
            targetGoalStatus,
            input.reason,
            input.decision === 'uncertain' ? input.reason : goal.lastError,
            input.now,
            goal.version
          ]
        )
      )
      if (current.leaseToken) {
        await client.query(
          `UPDATE orchestrator_attempts
            SET finished_at = $4, outcome = $5, error_class = $6
          WHERE tenant_id = $1 AND step_id = $2 AND lease_token = $3 AND finished_at IS NULL`,
          [
            scope,
            current.id,
            current.leaseToken,
            input.now,
            input.decision === 'retry' ? 'lease_expired' : 'uncertain',
            input.reason
          ]
        )
      }
      return { goal: updatedGoal, step: updatedStep }
    })
  }

  async recordObservation(
    input: Omit<ObservationRecord, 'id' | 'createdAt'> & { createdAt?: Date }
  ): Promise<ObservationRecord> {
    const scope = tenantId(input.tenantId)
    const id = createDomainId('observation')
    const createdAt = input.createdAt ?? this.clock()
    return withTenantTransaction(this.pool, scope, async (client) => {
      const row = await one<ObservationRow>(
        client,
        `INSERT INTO orchestrator_observations
        (tenant_id, id, goal_id, plan_id, step_id, kind, result_digest, evidence, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
       RETURNING *`,
        [
          scope,
          id,
          input.goalId,
          input.planId,
          input.stepId,
          input.kind,
          input.resultDigest,
          JSON.stringify(input.evidence),
          createdAt
        ]
      )
      return toObservation(row)
    })
  }

  async listObservations(
    tenant: OrchestrationTenantId,
    goalId: string
  ): Promise<ObservationRecord[]> {
    const scope = tenantId(tenant)
    return withTenantContext(this.pool, scope, async (client) => {
      const result = await client.query<ObservationRow>(
        'SELECT * FROM orchestrator_observations WHERE tenant_id = $1 AND goal_id = $2 ORDER BY created_at, id',
        [scope, goalId]
      )
      return result.rows.map(toObservation)
    })
  }

  async recordEvaluation(
    input: Omit<EvaluationRecord, 'id' | 'createdAt'> & { createdAt?: Date }
  ): Promise<EvaluationRecord> {
    const scope = tenantId(input.tenantId)
    const id = createDomainId('evaluation')
    const createdAt = input.createdAt ?? this.clock()
    return withTenantTransaction(this.pool, scope, async (client) => {
      const row = await one<EvaluationRow>(
        client,
        `INSERT INTO orchestrator_evaluations
        (tenant_id, id, goal_id, plan_id, step_id, evaluator_type, criteria, evidence, result, reason, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11)
       RETURNING *`,
        [
          scope,
          id,
          input.goalId,
          input.planId,
          input.stepId,
          input.evaluatorType,
          JSON.stringify(input.criteria),
          JSON.stringify(input.evidence),
          input.result,
          input.reason,
          createdAt
        ]
      )
      return toEvaluation(row)
    })
  }

  async listEvaluations(
    tenant: OrchestrationTenantId,
    goalId: string
  ): Promise<EvaluationRecord[]> {
    const scope = tenantId(tenant)
    return withTenantContext(this.pool, scope, async (client) => {
      const result = await client.query<EvaluationRow>(
        'SELECT * FROM orchestrator_evaluations WHERE tenant_id = $1 AND goal_id = $2 ORDER BY created_at, id',
        [scope, goalId]
      )
      return result.rows.map(toEvaluation)
    })
  }

  async listAttempts(
    tenant: OrchestrationTenantId,
    stepId: string
  ): Promise<AttemptRecord[]> {
    const scope = tenantId(tenant)
    return withTenantContext(this.pool, scope, async (client) => {
      const result = await client.query<AttemptRow>(
        'SELECT * FROM orchestrator_attempts WHERE tenant_id = $1 AND step_id = $2 ORDER BY started_at, id',
        [scope, stepId]
      )
      return result.rows.map(toAttempt)
    })
  }
}
