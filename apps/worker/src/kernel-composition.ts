import { z } from 'zod'
import {
  createGovernedRuntimeComposition,
  evaluateSuccessCriteria,
  GoalPlanOrchestrator,
  MAX_GOVERNED_TURN_MODEL_CALLS,
  MAX_GOVERNED_TURN_TOOL_CALLS,
  resolveWorkflowCoordinator,
  toGovernedTurnInput,
  type EffectScope,
  type GovernedTurnEnvelope,
  type GovernedTurnInput,
  type GovernedTurnResult,
  type GoalEvaluation,
  type GoalRecoverySweepResult,
  type OrchestrationRunResult,
  type OutboxEnqueueInput,
  type PlanStepDraft,
  type ResolvedWorkflowCoordinator,
  type StepExecutionResult,
  type ToolInvocation,
  type WorkflowCoordinatorAdapters,
  type WorkflowPlan,
  type WorkflowStep
} from '@cvg/agent-runtime'
import {
  DeterministicModelProvider,
  ModelGateway,
  ModelInputSchema,
  ModelProfileNameSchema,
  PromptRegistry,
  type ModelProfile
} from '@cvg/model-gateway'
import {
  createTraceContextWithTraceId,
  HashChainedAuditLedger,
  InMemoryTelemetry,
  type TraceContext
} from '@cvg/observability'
import {
  PostgresApprovalAuthority,
  PostgresEffectJournal,
  PostgresGoalPlanStore,
  TenantScopedPostgresRuntimeRepository,
  withTenantContext,
  type InboundRuntimeContext,
  type PostgresPoolLike
} from '@cvg/persistence'
import {
  AgentIdSchema,
  TenantIdSchema,
  canBotRespond,
  type AgentId,
  type TenantId
} from '@cvg/platform'
import {
  AgentProfileNameSchema,
  CapabilitySchema,
  PolicyDocumentSchema,
  PolicyEngine,
  type Capability,
  type PolicyDocumentInput
} from '@cvg/policy-engine'
import {
  CorrelationIdSchema,
  DataClassificationSchema,
  RoleSchema
} from '@cvg/shared'
import type { ControlledWorkerHandlers } from './controlled-worker.ts'
import { createControlledOutboxRevalidator } from './outbox-revalidation.ts'

export const WORKER_RUNTIME_ENV = 'CVG_WORKER_RUNTIME'
export const DURABLE_KERNEL_ORCHESTRATOR_ENV = 'CVG_DURABLE_KERNEL_ORCHESTRATOR'
export const KERNEL_WORKER_RUNTIME = 'kernel'
export const PUBLISHED_AGENT_WORKER_RUNTIME = 'published-agent'

export const CONTROLLED_KERNEL_POLICY_ID = 'synthetic.controlled-kernel'
export const CONTROLLED_KERNEL_POLICY_VERSION = '1.0.0'
export const CONTROLLED_KERNEL_PROMPT_ID = 'synthetic.controlled-kernel-prompt'
export const CONTROLLED_KERNEL_PROMPT_VERSION = '1.0.0'
export const CONTROLLED_KERNEL_RUNTIME_VERSION = 'aaa21-kernel-v1'

const RuntimeTraceIdSchema = z.string().regex(/^[0-9a-f]{32}$/)

export type KernelRuntimeConfigurationErrorCode =
  | 'kernel_runtime_prerequisites_missing'
  | 'production_durable_kernel_required'
  | 'unknown_worker_runtime'

export class KernelRuntimeConfigurationError extends Error {
  readonly code: KernelRuntimeConfigurationErrorCode

  constructor(code: KernelRuntimeConfigurationErrorCode, message: string) {
    super(message)
    this.name = 'KernelRuntimeConfigurationError'
    this.code = code
  }
}

const DURABLE_KERNEL_REQUIRED_TABLES = [
  'effect_journal',
  'outbox_events',
  'runtime_approvals',
  'runtime_audit_events',
  'orchestrator_goals',
  'orchestrator_plans',
  'orchestrator_steps',
  'orchestrator_attempts',
  'orchestrator_observations',
  'orchestrator_evaluations'
] as const

const DURABLE_KERNEL_REQUIRED_MIGRATIONS = [
  '0019_orchestrator_state',
  '0020_orchestrator_lineage_hardening',
  '0021_orchestrator_iteration_budget',
  '0022_orchestrator_evaluation_lineage',
  '0023_orchestrator_replan_fencing',
  '0024_tenant_isolation_constraint_validation'
] as const

/**
 * Worker runtime selection. The governed kernel is the default; the published
 * agent is an explicitly quarantined legacy path and unknown values fail closed
 * at startup.
 */
export function resolveWorkerRuntimeKind(
  env: NodeJS.ProcessEnv
): 'kernel' | 'published-agent' {
  const configured = env[WORKER_RUNTIME_ENV]?.trim()
  if (!configured || configured === KERNEL_WORKER_RUNTIME) {
    assertProductionDurableKernel(env)
    return 'kernel'
  }
  if (configured === PUBLISHED_AGENT_WORKER_RUNTIME) {
    assertProductionDurableKernel(env)
    return 'published-agent'
  }
  throw new KernelRuntimeConfigurationError(
    'unknown_worker_runtime',
    `Unknown ${WORKER_RUNTIME_ENV} value: ${configured}`
  )
}

/**
 * SYNTHETIC controlled policy document (marked synthetic; no real institutional
 * source). It allows a read of an appointment draft and requires approval for
 * the draft-only write capability `appointment.modify`. Real capabilities
 * (`appointment.confirm`/`reschedule`/`cancel`) receive no grant here, so the
 * kernel denies them before any executor call.
 */
export const CONTROLLED_KERNEL_POLICY_DOCUMENT: PolicyDocumentInput = {
  policyId: CONTROLLED_KERNEL_POLICY_ID,
  version: CONTROLLED_KERNEL_POLICY_VERSION,
  effectiveFrom: '2026-09-01T00:00:00.000Z',
  rules: [
    {
      id: 'synthetic-allow-schedule-read-appointment-draft',
      effect: 'ALLOW',
      priority: 10,
      capabilities: ['schedule.read'],
      resourceTypes: ['appointment_draft'],
      reason: 'Synthetic controlled read of an appointment draft'
    },
    {
      id: 'synthetic-require-approval-appointment-modify',
      effect: 'REQUIRE_APPROVAL',
      priority: 20,
      capabilities: ['appointment.modify'],
      resourceTypes: ['appointment_draft'],
      reason: 'Synthetic controlled write requires human approval'
    }
  ]
}

/** Both composed capabilities are explicitly synthetic-only effect scopes. */
export const CONTROLLED_KERNEL_EFFECT_SCOPES: Partial<
  Record<Capability, EffectScope>
> = {
  'schedule.read': 'controlled_fake',
  'appointment.modify': 'controlled_fake'
}

export const CONTROLLED_KERNEL_PAYLOAD_SCHEMA = z.object({
  text: z.string()
})

export const KernelContinuationPayloadSchema = z
  .object({
    kind: z.literal('runtime_approval.continue'),
    approvalId: z.string().min(1).max(160),
    decision: z.enum(['approve', 'reject']).default('approve'),
    traceId: RuntimeTraceIdSchema.optional()
  })
  .strict()

export type KernelContinuationPayload = z.output<
  typeof KernelContinuationPayloadSchema
>

/**
 * Synthetic turn envelope carried in the inbound message body. The kernel
 * handler refuses any body that is not this JSON shape; free text never picks
 * a capability by inference.
 */
export const KernelTurnEnvelopeSchema = z
  .object({
    capability: CapabilitySchema,
    action: z.string().min(1).max(120),
    resource: z
      .object({
        type: z.string().min(1).max(120),
        id: z.string().min(1).max(160).optional()
      })
      .strict(),
    dataClassification: DataClassificationSchema.default('INTERNAL'),
    operatorId: z.string().min(1).max(120).default('op_synthetic_kernel'),
    operatorRole: RoleSchema.default('Operator'),
    agentVersion: z.string().min(1).max(120).default('synthetic-v1'),
    agentProfile: AgentProfileNameSchema.default('secretary'),
    modelProfile: ModelProfileNameSchema.default('fast'),
    message: z
      .string()
      .min(1)
      .max(4000)
      .default('synthetic controlled kernel turn'),
    idempotencyKey: z.string().min(8).max(200).optional(),
    approvalId: z.string().min(1).max(160).optional(),
    task: z.string().min(1).max(120).optional()
  })
  .strict()

export type KernelTurnEnvelope = z.output<typeof KernelTurnEnvelopeSchema>

const DurablePlannerContextSchema = z
  .object({
    messageId: z.string().min(1).max(200),
    sessionId: z.string().min(1).max(200).nullable(),
    envelope: KernelTurnEnvelopeSchema,
    traceId: RuntimeTraceIdSchema.optional()
  })
  .strict()

type DurablePlannerContext = z.output<typeof DurablePlannerContextSchema>

function assertControlledKernelSnapshot(
  snapshot: {
    agentVersion: string | null
    promptVersion: string | null
    policyVersion: string | null
    modelProfile: string | null
    toolVersions: Record<string, string>
    runtimeMode?: 'kernel' | 'published-agent' | 'unknown'
    runtimeVersion?: string | null
  },
  envelope?: KernelTurnEnvelope
): void {
  const expectedPolicyVersion = `${CONTROLLED_KERNEL_POLICY_ID}@${CONTROLLED_KERNEL_POLICY_VERSION}`
  const toolEntries = Object.entries(snapshot.toolVersions)
  const toolVersion = snapshot.toolVersions['controlled-kernel-tool']
  if (
    snapshot.runtimeMode !== 'kernel' ||
    snapshot.runtimeVersion !== CONTROLLED_KERNEL_RUNTIME_VERSION ||
    snapshot.promptVersion !== CONTROLLED_KERNEL_PROMPT_VERSION ||
    snapshot.policyVersion !== expectedPolicyVersion ||
    snapshot.modelProfile !== 'fast' ||
    snapshot.agentVersion === null ||
    toolEntries.length !== 1 ||
    toolVersion !== '1.0.0'
  ) {
    throw new Error(
      'durable continuation snapshot does not match the controlled kernel'
    )
  }
  if (
    envelope !== undefined &&
    (snapshot.agentVersion !== envelope.agentVersion ||
      snapshot.modelProfile !== envelope.modelProfile)
  ) {
    throw new Error(
      'durable continuation envelope does not match the persisted runtime snapshot'
    )
  }
}

export function parseKernelTurnEnvelope(body: string): KernelTurnEnvelope {
  let decoded: unknown
  try {
    decoded = JSON.parse(body)
  } catch {
    throw new Error(
      'kernel_turn_envelope_invalid: inbound body is not a JSON turn envelope'
    )
  }
  const candidate =
    decoded !== null && typeof decoded === 'object' && 'cvgTurn' in decoded
      ? (decoded as { cvgTurn: unknown }).cvgTurn
      : decoded
  const parsed = KernelTurnEnvelopeSchema.safeParse(candidate)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ')
    throw new Error(`kernel_turn_envelope_invalid: ${issues}`)
  }
  return parsed.data
}

export interface CreatePostgresKernelRuntimeInput {
  pool: PostgresPoolLike
  tenantId: TenantId
  env: NodeJS.ProcessEnv
  agentId: AgentId
  workflowCoordinatorAdapters?: WorkflowCoordinatorAdapters
  /** Optional process sink bridge; defaults to a bounded local collector. */
  runtimeTelemetry?: InMemoryTelemetry
}

export interface PostgresKernelRuntime {
  tenantId: TenantId
  agentId: AgentId
  policy: PolicyEngine
  approvals: PostgresApprovalAuthority
  audit: HashChainedAuditLedger
  telemetry: InMemoryTelemetry
  conversations: TenantScopedPostgresRuntimeRepository
  goalStore: PostgresGoalPlanStore
  orchestrator: GoalPlanOrchestrator
  workflowCoordinator: ResolvedWorkflowCoordinator
  toolInvocations: readonly ToolInvocation[]
  turnResults: readonly GovernedTurnResult[]
  runTurn(input: GovernedTurnInput): Promise<GovernedTurnResult>
  runDurableGoal(input: DurableKernelGoalInput): Promise<OrchestrationRunResult>
  recoverDurableGoals(): Promise<GoalRecoverySweepResult>
  preflight(): Promise<void>
}

export interface DurableKernelGoalInput {
  context: InboundRuntimeContext
  envelope: KernelTurnEnvelope
  correlationId: string
  traceContext?: TraceContext
  approvalDecision?: 'approve' | 'reject'
}

function createControlledModelGateway(): ModelGateway {
  const prompts = new PromptRegistry()
  prompts.register({
    promptId: CONTROLLED_KERNEL_PROMPT_ID,
    version: CONTROLLED_KERNEL_PROMPT_VERSION,
    content:
      'SYNTHETIC controlled kernel prompt. Produce a deterministic appointment draft update; no real data, no external call.',
    owner: 'platform-synthetic',
    approvedBy: 'synthetic-reviewer',
    status: 'approved',
    effectiveFrom: '2026-09-01T00:00:00.000Z',
    classification: 'INTERNAL'
  })
  const provider = new DeterministicModelProvider({
    respond: () => ({
      text: JSON.stringify({ text: 'SYNTHETIC_CONTROLLED_KERNEL_PAYLOAD' }),
      usage: { inputTokens: 10, outputTokens: 5 },
      providerId: 'deterministic',
      model: 'deterministic-v1',
      externalCall: false
    })
  })
  const profile: ModelProfile = {
    name: 'fast',
    providerId: 'deterministic',
    model: 'deterministic-v1',
    location: 'local',
    temperature: 0,
    maxTokens: 256,
    timeoutMs: 5_000,
    maxCostUsd: 1,
    estimatedCostUsd: 0,
    maxRetries: 0,
    pricing: { inputPer1kUsd: 0, outputPer1kUsd: 0 }
  }
  return new ModelGateway({
    providers: [provider],
    profiles: { fast: profile },
    prompts,
    retry: { maxRetries: 0 }
  })
}

/**
 * Durable prerequisites probe: the tenant-scoped effect journal, approval and
 * audit tables plus every durable Goal/Plan/Step ledger table must exist and be
 * reachable. Missing migrations fail closed before any turn runs.
 */
export async function assertPostgresKernelPrerequisites(
  pool: PostgresPoolLike,
  tenantId: TenantId
): Promise<void> {
  try {
    await withTenantContext(pool, tenantId, async (client) => {
      for (const table of DURABLE_KERNEL_REQUIRED_TABLES) {
        await client.query(
          `SELECT 1 FROM ${table} WHERE tenant_id = $1 LIMIT 0`,
          [tenantId]
        )
      }
      const migrations = await client.query<{ version: string }>(
        `SELECT version FROM schema_migrations
          WHERE version = ANY($1::text[])`,
        [DURABLE_KERNEL_REQUIRED_MIGRATIONS]
      )
      const applied = new Set(migrations.rows.map((row) => row.version))
      const missing = DURABLE_KERNEL_REQUIRED_MIGRATIONS.filter(
        (version) => !applied.has(version)
      )
      if (missing.length > 0) {
        throw new Error(`missing migrations: ${missing.join(', ')}`)
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new KernelRuntimeConfigurationError(
      'kernel_runtime_prerequisites_missing',
      `Durable kernel runtime prerequisites are missing (${DURABLE_KERNEL_REQUIRED_TABLES.join('/')}): ${message}`
    )
  }
}

/**
 * Controlled governed-kernel composition for the worker. The effect journal is
 * constructed on one client checked out per turn from the pool (released by
 * `withTenantContext` in a finally), while approvals are the durable
 * `PostgresApprovalAuthority`. The tool executor is fake and records every
 * invocation; the outbox enqueues synthetic `message.outbound` events only.
 */
export function createPostgresKernelRuntime(
  input: CreatePostgresKernelRuntimeInput
): PostgresKernelRuntime {
  const { pool, tenantId, env, agentId } = input
  assertProductionDurableKernel(env)
  if (
    pool === undefined ||
    pool === null ||
    typeof (pool as { connect?: unknown }).connect !== 'function'
  ) {
    throw new KernelRuntimeConfigurationError(
      'kernel_runtime_prerequisites_missing',
      'Kernel worker runtime requires a PostgreSQL pool for the durable effect journal and approval authority'
    )
  }
  const workflowCoordinator = resolveWorkflowCoordinator(
    env,
    input.workflowCoordinatorAdapters
  )

  const policy = new PolicyEngine({
    documents: [PolicyDocumentSchema.parse(CONTROLLED_KERNEL_POLICY_DOCUMENT)]
  })
  const approvals = new PostgresApprovalAuthority(pool)
  const telemetry = input.runtimeTelemetry ?? new InMemoryTelemetry()
  const audit = new HashChainedAuditLedger()
  const modelGateway = createControlledModelGateway()
  const conversations = new TenantScopedPostgresRuntimeRepository(pool)

  const toolInvocations: ToolInvocation[] = []
  const turnResults: GovernedTurnResult[] = []
  const toolExecutor = async (
    invocation: ToolInvocation
  ): Promise<{ result: unknown }> => {
    toolInvocations.push(invocation)
    return { result: { synthetic: true } }
  }

  const flushRuntimeAudit = async (traceId: string | undefined) => {
    if (
      traceId === undefined ||
      typeof conversations.appendRuntimeAuditRecords !== 'function'
    ) {
      return
    }
    const records = audit.recordsForTrace(traceId)
    if (records.length === 0) return
    await conversations.appendRuntimeAuditRecords(tenantId, records)
    const durableAudit = await conversations.verifyRuntimeAuditChain(tenantId)
    if (!durableAudit.valid) {
      throw new Error(
        `Durable runtime audit chain verification failed at ${durableAudit.brokenAt ?? 'unknown'}: ${durableAudit.reason ?? 'invalid'}`
      )
    }
  }

  const runTurn = async (
    turnInput: GovernedTurnInput
  ): Promise<GovernedTurnResult> => {
    let result: GovernedTurnResult
    try {
      result = await withTenantContext(pool, tenantId, async (client) => {
        const effectJournal = new PostgresEffectJournal(client)
        const outbox = async (
          event: OutboxEnqueueInput
        ): Promise<{ eventId: string }> => {
          const enqueued = await conversations.enqueue({
            tenantId,
            type: 'message.outbound',
            payload: {
              synthetic: true,
              sourceEventType: event.eventType,
              capability: turnInput.capability,
              action: turnInput.action,
              resourceType: turnInput.resource.type,
              correlationId: event.correlationId,
              traceId: event.traceId,
              ...(event.orchestrationContext !== undefined
                ? { orchestrationContext: event.orchestrationContext }
                : {})
            },
            idempotencyKey: `kernel-outbox:${event.idempotencyKey}`,
            correlationId: event.correlationId,
            traceId: event.traceId,
            conversationId: turnInput.conversationId,
            sessionId: turnInput.sessionId ?? null
          })
          return { eventId: enqueued.id }
        }
        const composition = createGovernedRuntimeComposition({
          policy,
          approvals,
          modelGateway,
          telemetry,
          audit,
          toolExecutor,
          outbox,
          effectJournal,
          requireDurable: true,
          durableApprovals: true,
          effectScopes: CONTROLLED_KERNEL_EFFECT_SCOPES
        })
        return composition.runtime.runTurn(turnInput)
      })
    } catch (error) {
      // Persist any audit records emitted before a crash/timeout. The retry is
      // idempotent by event key, while an audit persistence failure remains a
      // hard error and prevents the inbound message from being acknowledged.
      await flushRuntimeAudit(turnInput.traceContext?.traceId)
      throw error
    }
    await flushRuntimeAudit(result.traceId)
    turnResults.push(result)
    return result
  }

  const goalStore = new PostgresGoalPlanStore(pool)
  const durableContexts = new Map<string, DurableKernelGoalInput>()
  const workerId = env.CVG_WORKER_ID?.trim() || `kernel-worker:${process.pid}`
  const orchestrator = new GoalPlanOrchestrator({
    store: goalStore,
    workerId,
    telemetry,
    reconcileExpiredLease: async (step) => {
      // A lease expiry is not proof that an external effect is absent. The
      // approval's persisted operation key and the effect journal decide
      // whether replay is safe; all missing or ambiguous identity fails closed.
      if (step.approvalId === null) {
        return step.approvalRequirement === 'none' ? 'retry' : 'uncertain'
      }
      let approval
      try {
        approval = await approvals.get(tenantId, step.approvalId)
      } catch {
        return 'uncertain'
      }
      const operationKey = approval.operationKey
      if (operationKey === undefined) return 'uncertain'
      let journal
      try {
        journal = await withTenantContext(pool, tenantId, async (client) =>
          new PostgresEffectJournal(client).get(tenantId, operationKey)
        )
      } catch {
        return 'uncertain'
      }
      const canReplayConfirmed =
        approval.status === 'EXECUTED' ||
        (approval.reservationId !== undefined &&
          ['RESERVED', 'EXECUTING'].includes(approval.status))
      if (journal?.state === 'CONFIRMED') {
        return canReplayConfirmed ? 'retry' : 'uncertain'
      }
      if (
        journal?.state === 'EFFECT_FAILED' ||
        journal?.state === 'ABANDONED'
      ) {
        return ['APPROVED', 'RESERVED', 'EXECUTING'].includes(approval.status)
          ? 'retry'
          : 'uncertain'
      }
      if (journal === undefined && approval.status === 'APPROVED') {
        return 'retry'
      }
      return 'uncertain'
    },
    reconcileWaitingApproval: async (goal) => {
      const plan = await goalStore.getActivePlan(tenantId, goal.id)
      if (plan === null) return 'pending'
      const waiting = (await goalStore.listSteps(tenantId, plan.id)).find(
        (step) => step.status === 'WAITING_APPROVAL'
      )
      if (waiting?.approvalId === null || waiting === undefined) {
        return 'pending'
      }
      let approval
      try {
        approval = await approvals.get(tenantId, waiting.approvalId)
      } catch {
        return 'pending'
      }
      if (approval.status !== 'EXPIRED') return 'pending'
      await goalStore.resolveWaitingApproval({
        tenantId,
        goalId: goal.id,
        planId: plan.id,
        stepId: waiting.id,
        expectedGoalVersion: goal.version,
        expectedStepVersion: waiting.version,
        approvalId: waiting.approvalId,
        target: 'CANCELLED',
        reason: 'approval_expired_before_decision',
        now: new Date()
      })
      return 'resolved'
    },
    planner: {
      async plan({ goal, previousPlan, steps }) {
        assertControlledKernelSnapshot(goal.executionSnapshot)
        const persistedContext = DurablePlannerContextSchema.safeParse(
          goal.plannerContext
        )
        const runtimeContext = durableContexts.get(goal.id)
        const context = persistedContext.success
          ? persistedContext.data
          : runtimeContext
            ? {
                messageId: runtimeContext.context.message.id,
                sessionId: runtimeContext.context.session?.id ?? null,
                envelope: runtimeContext.envelope,
                ...(runtimeContext.traceContext !== undefined
                  ? {
                      traceId: runtimeContext.traceContext.traceId
                    }
                  : {})
              }
            : undefined
        if (context !== undefined) {
          return {
            reason:
              previousPlan === null
                ? 'controlled durable goal plan'
                : 'controlled durable goal replan',
            steps: [
              durableStepDraft({
                tenantId,
                context,
                envelope: context.envelope,
                planVersion:
                  previousPlan === null ? 1 : previousPlan.version + 1,
                ...(context.traceId !== undefined
                  ? { traceId: context.traceId }
                  : {})
              })
            ]
          }
        }
        if (previousPlan !== null && steps.length > 0) {
          const previous = steps[0]
          if (previous !== undefined) {
            return {
              reason: 'recovered durable plan re-evaluation',
              steps: [
                {
                  id: previous.id,
                  type: previous.type,
                  description: previous.description,
                  dependencies: previous.dependencies,
                  requiredCapabilities: previous.requiredCapabilities,
                  riskLevel: previous.riskLevel,
                  approvalRequirement: previous.approvalRequirement,
                  input: previous.input,
                  expectedOutcome: previous.expectedOutcome,
                  timeoutMs: previous.timeoutMs,
                  intent: previous.intent,
                  ...(previous.toolId !== null
                    ? { toolId: previous.toolId }
                    : {}),
                  ...(previous.toolVersion !== null
                    ? { toolVersion: previous.toolVersion }
                    : {})
                }
              ]
            }
          }
        }
        throw new Error('durable goal planner context is unavailable')
      }
    },
    evaluator: {
      async evaluate({ goal, steps, observations }): Promise<GoalEvaluation> {
        const evidence = observations.flatMap((observation) =>
          observation.evidence.filter((item) => item.verified)
        )
        const criteria = evaluateSuccessCriteria(goal.successCriteria, evidence)
        if (
          steps.length > 0 &&
          steps.every((step) => step.status === 'SUCCEEDED') &&
          criteria.satisfied
        ) {
          return {
            result: 'satisfied',
            reason: 'declared success criteria matched verified evidence',
            evidence
          }
        }
        if (steps.some((step) => step.status === 'FAILED')) {
          return {
            result: 'not_satisfied',
            reason: `controlled step failed; ${criteria.unsatisfied} success criteria remain unsatisfied`,
            evidence
          }
        }
        return {
          result: 'not_satisfied',
          reason: `${criteria.unsatisfied} declared success criteria remain unsatisfied`,
          evidence
        }
      }
    },
    executor: {
      async execute({
        goal,
        step,
        lease,
        signal,
        limits
      }): Promise<StepExecutionResult> {
        assertControlledKernelSnapshot(goal.executionSnapshot)
        const workflowStep: WorkflowStep = {
          stepId: step.id,
          capability: step.intent.capability,
          action: step.intent.action,
          resource: step.intent.resource,
          dataClassification: step.intent.dataClassification,
          ...(step.intent.modelMessages !== null
            ? { modelMessages: step.intent.modelMessages }
            : {}),
          ...(step.intent.structuredOutput !== null
            ? { structuredOutput: step.intent.structuredOutput }
            : {}),
          ...(step.intent.idempotencyKey !== null
            ? { idempotencyKey: step.intent.idempotencyKey }
            : {})
        }
        const workflowPlan: WorkflowPlan = {
          planId: `durable:${goal.activePlanId ?? step.planId}`,
          tenantId,
          conversationId: goal.conversationId ?? 'durable-goal-conversation',
          ...(goal.sessionId !== null ? { sessionId: goal.sessionId } : {}),
          correlationId: goal.correlationId,
          steps: [workflowStep]
        }
        const input =
          step.input !== null && typeof step.input === 'object'
            ? (step.input as { messageId?: unknown; traceId?: unknown })
            : {}
        const governedEnvelope: GovernedTurnEnvelope = {
          operatorId: 'op_synthetic_kernel',
          operatorRole: 'Operator',
          agentId,
          agentVersion: goal.executionSnapshot.agentVersion ?? 'synthetic-v1',
          agentProfile: 'secretary',
          prompt: {
            promptId: CONTROLLED_KERNEL_PROMPT_ID,
            version: CONTROLLED_KERNEL_PROMPT_VERSION
          },
          modelProfile:
            goal.executionSnapshot.modelProfile === 'fast' ? 'fast' : 'fast',
          // The Goal budget is aggregate across resumable steps, while the
          // governed runtime schema limits a single turn. Preserve the former
          // and clamp only at this durable execution boundary.
          limits: {
            ...limits,
            maxModelCalls: Math.min(
              MAX_GOVERNED_TURN_MODEL_CALLS,
              Math.max(0, limits.maxModelCalls)
            ),
            maxToolCalls: Math.min(
              MAX_GOVERNED_TURN_TOOL_CALLS,
              Math.max(0, limits.maxToolCalls)
            )
          },
          ...(typeof input.messageId === 'string'
            ? { inboundMessageId: input.messageId }
            : {}),
          ...(typeof input.traceId === 'string'
            ? {
                traceContext: createTraceContextWithTraceId({
                  traceId: RuntimeTraceIdSchema.parse(input.traceId),
                  tenantId,
                  conversationId:
                    goal.conversationId ?? 'durable-goal-conversation',
                  ...(goal.sessionId !== null
                    ? { sessionId: goal.sessionId }
                    : {}),
                  correlationId: goal.correlationId,
                  agentId
                })
              }
            : {}),
          ...(step.approvalId !== null ? { approvalId: step.approvalId } : {})
        }
        const turnInput = toGovernedTurnInput(
          workflowPlan,
          workflowStep,
          governedEnvelope
        )
        const governedResult = await runTurn({
          ...turnInput,
          orchestrationContext: {
            goalId: goal.id,
            planId: step.planId,
            stepId: step.id,
            attemptId: lease.attemptId
          },
          cancelSignal: signal
        })
        return durableTurnResult(governedResult)
      }
    }
  })

  const recoverDurableGoals = (): Promise<GoalRecoverySweepResult> =>
    orchestrator.recoverGoals(tenantId)

  const runDurableGoal = async (
    goalInput: DurableKernelGoalInput
  ): Promise<OrchestrationRunResult> => {
    const correlationId = CorrelationIdSchema.parse(goalInput.correlationId)
    let goal = await goalStore.getGoalByInboundMessage(
      tenantId,
      goalInput.context.message.id
    )
    if (goal === null) {
      goal = await goalStore.createGoal({
        tenantId,
        inboundMessageId: goalInput.context.message.id,
        ...(goalInput.context.session !== null
          ? { sessionId: goalInput.context.session.id }
          : {}),
        conversationId: goalInput.context.message.conversationId,
        objective: goalInput.envelope.task ?? goalInput.envelope.message,
        successCriteria: [
          {
            kind: 'EVENT',
            eventType: `${goalInput.envelope.capability}.executed`,
            source: 'outbox',
            correlationId
          }
        ],
        correlationId,
        plannerContext: {
          messageId: goalInput.context.message.id,
          sessionId: goalInput.context.session?.id ?? null,
          envelope: goalInput.envelope,
          ...(goalInput.traceContext !== undefined
            ? { traceId: goalInput.traceContext.traceId }
            : {})
        },
        executionSnapshot: {
          agentVersion: goalInput.envelope.agentVersion,
          promptVersion: CONTROLLED_KERNEL_PROMPT_VERSION,
          policyVersion: `${CONTROLLED_KERNEL_POLICY_ID}@${CONTROLLED_KERNEL_POLICY_VERSION}`,
          modelProfile: goalInput.envelope.modelProfile,
          toolVersions: { 'controlled-kernel-tool': '1.0.0' },
          runtimeMode: 'kernel',
          runtimeVersion: CONTROLLED_KERNEL_RUNTIME_VERSION
        }
      })
    }
    assertControlledKernelSnapshot(goal.executionSnapshot, goalInput.envelope)
    if (
      !['COMPLETED', 'BLOCKED', 'FAILED', 'CANCELLED'].includes(goal.status)
    ) {
      durableContexts.set(goal.id, goalInput)
    }
    try {
      if (
        goal.status === 'WAITING_APPROVAL' &&
        goalInput.envelope.approvalId !== undefined &&
        goalInput.approvalDecision !== undefined
      ) {
        const activePlan = await goalStore.getActivePlan(tenantId, goal.id)
        const waitingStep = activePlan
          ? (await goalStore.listSteps(tenantId, activePlan.id)).find(
              (step) =>
                step.status === 'WAITING_APPROVAL' &&
                step.approvalId === goalInput.envelope.approvalId
            )
          : undefined
        if (!activePlan || !waitingStep) {
          throw new Error(
            'durable approval continuation does not match a waiting plan step'
          )
        }
        const approval = await approvals.get(
          tenantId,
          goalInput.envelope.approvalId
        )
        if (goalInput.approvalDecision === 'reject') {
          if (approval.status !== 'REJECTED') {
            throw new Error(
              'durable approval rejection does not match the persisted decision'
            )
          }
          await goalStore.resolveWaitingApproval({
            tenantId,
            goalId: goal.id,
            planId: activePlan.id,
            stepId: waitingStep.id,
            expectedGoalVersion: goal.version,
            expectedStepVersion: waitingStep.version,
            approvalId: goalInput.envelope.approvalId,
            target: 'CANCELLED',
            reason: 'durable_approval_rejected',
            now: new Date()
          })
        } else if (
          ['APPROVED', 'RESERVED', 'EXECUTING'].includes(approval.status)
        ) {
          await goalStore.resolveWaitingApproval({
            tenantId,
            goalId: goal.id,
            planId: activePlan.id,
            stepId: waitingStep.id,
            expectedGoalVersion: goal.version,
            expectedStepVersion: waitingStep.version,
            approvalId: goalInput.envelope.approvalId,
            target: 'READY',
            reason: 'durable_approval_granted',
            now: new Date()
          })
        }
      }
      return await orchestrator.run(tenantId, goal.id)
    } finally {
      durableContexts.delete(goal.id)
    }
  }

  return {
    tenantId,
    agentId,
    policy,
    approvals,
    audit,
    telemetry,
    conversations,
    goalStore,
    orchestrator,
    workflowCoordinator,
    toolInvocations,
    turnResults,
    runTurn,
    runDurableGoal,
    recoverDurableGoals,
    preflight: () => assertPostgresKernelPrerequisites(pool, tenantId)
  }
}

function resolveKernelAgentId(env: NodeJS.ProcessEnv): AgentId | undefined {
  const raw = env.CVG_WORKER_AGENT_ID?.trim() || env.INBOUND_AGENT_ID?.trim()
  if (!raw) return undefined
  return AgentIdSchema.parse(raw)
}

function syntheticWorkflowPlan(input: {
  tenantId: TenantId
  context: InboundRuntimeContext
  envelope: KernelTurnEnvelope
  correlationId: string
}): WorkflowPlan {
  return {
    planId: `synthetic-plan:${input.context.message.id}`,
    tenantId: input.tenantId,
    conversationId: input.context.message.conversationId,
    ...(input.context.session !== null
      ? { sessionId: input.context.session.id }
      : {}),
    correlationId: input.correlationId,
    steps: [workflowStepFromEnvelope(input.envelope)]
  }
}

function workflowStepFromEnvelope(envelope: KernelTurnEnvelope): WorkflowStep {
  return {
    stepId: `synthetic-step:${envelope.action}`,
    capability: envelope.capability,
    action: envelope.action,
    resource: {
      type: envelope.resource.type,
      ...(envelope.resource.id !== undefined
        ? { id: envelope.resource.id }
        : {})
    },
    dataClassification: envelope.dataClassification,
    modelMessages: {
      messages: [{ role: 'user', content: envelope.message }]
    },
    structuredOutput: {
      schemaName: 'ControlledKernelPayload',
      schema: CONTROLLED_KERNEL_PAYLOAD_SCHEMA
    },
    ...(envelope.idempotencyKey !== undefined
      ? { idempotencyKey: envelope.idempotencyKey }
      : {})
  }
}

function invalidWorkflowPlan(message: string): never {
  throw new Error(`runtime_composition_invalid: ${message}`)
}

function validateWorkflowPlan(input: {
  plan: WorkflowPlan
  tenantId: TenantId
  conversationId: string
  sessionId: string | null
  correlationId: string
}): { plan: WorkflowPlan; step: WorkflowStep } {
  const { plan } = input
  if (
    !plan ||
    typeof plan !== 'object' ||
    typeof plan.planId !== 'string' ||
    plan.planId.trim().length === 0 ||
    plan.tenantId !== input.tenantId ||
    plan.conversationId !== input.conversationId ||
    plan.correlationId !== input.correlationId ||
    !Array.isArray(plan.steps) ||
    plan.steps.length !== 1
  ) {
    return invalidWorkflowPlan(
      'workflow plan must contain exactly one step bound to the inbound tenant, conversation and correlation'
    )
  }

  if (
    plan.sessionId !== undefined &&
    (input.sessionId === null || plan.sessionId !== input.sessionId)
  ) {
    return invalidWorkflowPlan(
      'workflow plan session does not match the inbound session'
    )
  }

  const step = plan.steps[0]
  if (
    !step ||
    typeof step !== 'object' ||
    typeof step.stepId !== 'string' ||
    step.stepId.trim().length === 0 ||
    typeof step.action !== 'string' ||
    step.action.trim().length === 0 ||
    typeof step.resource !== 'object' ||
    step.resource === null ||
    typeof step.resource.type !== 'string' ||
    step.resource.type.trim().length === 0
  ) {
    return invalidWorkflowPlan(
      'workflow step has an invalid action or resource'
    )
  }
  if (
    step.resource.tenantId !== undefined &&
    step.resource.tenantId !== input.tenantId
  ) {
    return invalidWorkflowPlan(
      'workflow resource tenant does not match the inbound tenant'
    )
  }
  const capability = CapabilitySchema.safeParse(step.capability)
  if (!capability.success) {
    return invalidWorkflowPlan('workflow capability is invalid')
  }
  const dataClassification = DataClassificationSchema.safeParse(
    step.dataClassification
  )
  if (!dataClassification.success) {
    return invalidWorkflowPlan('workflow data classification is invalid')
  }
  if (step.modelMessages !== undefined) {
    const modelMessages = ModelInputSchema.safeParse(step.modelMessages)
    if (!modelMessages.success) {
      return invalidWorkflowPlan('workflow model messages are invalid')
    }
  }
  const normalizedPlan =
    input.sessionId !== null && plan.sessionId === undefined
      ? { ...plan, sessionId: input.sessionId }
      : plan
  return {
    plan: normalizedPlan,
    step: {
      ...step,
      capability: capability.data,
      dataClassification: dataClassification.data,
      resource: {
        type: step.resource.type,
        ...(step.resource.id !== undefined ? { id: step.resource.id } : {}),
        ...(step.resource.tenantId !== undefined
          ? { tenantId: step.resource.tenantId }
          : {})
      },
      ...(step.modelMessages !== undefined
        ? { modelMessages: ModelInputSchema.parse(step.modelMessages) }
        : {})
    }
  }
}

async function buildKernelTurnInput(input: {
  tenantId: TenantId
  agentId: AgentId
  correlationId: string
  context: InboundRuntimeContext
  envelope: KernelTurnEnvelope
  coordinator: ResolvedWorkflowCoordinator
  traceContext?: TraceContext
}): Promise<GovernedTurnInput> {
  const { envelope } = input
  const plan =
    input.coordinator.coordinator === null
      ? syntheticWorkflowPlan(input)
      : await input.coordinator.coordinator.planStep({
          tenantId: input.tenantId,
          conversationId: input.context.message.conversationId,
          correlationId: input.correlationId,
          state: {
            inboundMessageId: input.context.message.id,
            sessionId: input.context.session?.id ?? null,
            channel: input.context.channel,
            senderRef: input.context.senderRef,
            envelope
          }
        })
  const validated = validateWorkflowPlan({
    plan,
    tenantId: input.tenantId,
    conversationId: input.context.message.conversationId,
    sessionId: input.context.session?.id ?? null,
    correlationId: input.correlationId
  })
  const envelopeForRuntime: GovernedTurnEnvelope = {
    // The inbound JSON is untrusted data. These values are deliberately fixed
    // to the controlled worker identity and never derive policy authority from
    // a caller-provided role or operator id.
    operatorId: 'op_synthetic_kernel',
    operatorRole: 'Operator',
    agentId: input.agentId,
    agentVersion: envelope.agentVersion,
    agentProfile: envelope.agentProfile,
    prompt: {
      promptId: CONTROLLED_KERNEL_PROMPT_ID,
      version: CONTROLLED_KERNEL_PROMPT_VERSION
    },
    modelProfile: envelope.modelProfile,
    inboundMessageId: input.context.message.id,
    ...(input.traceContext !== undefined
      ? { traceContext: input.traceContext }
      : {}),
    ...(envelope.approvalId !== undefined
      ? { approvalId: envelope.approvalId }
      : {}),
    ...(envelope.task !== undefined ? { task: envelope.task } : {})
  }
  return toGovernedTurnInput(validated.plan, validated.step, envelopeForRuntime)
}

function durableStepDraft(input: {
  tenantId: TenantId
  context: Pick<DurablePlannerContext, 'messageId' | 'sessionId'>
  envelope: KernelTurnEnvelope
  planVersion: number
  traceId?: string
}): PlanStepDraft {
  return {
    id: `durable-kernel-step:${input.context.messageId}:${input.planVersion}`,
    type: 'governed_kernel_turn',
    description: input.envelope.action,
    dependencies: [],
    requiredCapabilities: [input.envelope.capability],
    riskLevel:
      input.envelope.capability === 'schedule.read'
        ? 'READ_ONLY'
        : 'MEDIUM_RISK_WRITE',
    approvalRequirement:
      input.envelope.capability === 'appointment.modify' ? 'approval' : 'none',
    input: {
      messageId: input.context.messageId,
      action: input.envelope.action,
      resourceType: input.envelope.resource.type,
      ...(input.traceId !== undefined ? { traceId: input.traceId } : {})
    },
    expectedOutcome: {
      governedRuntime: 'executed',
      operationalEvidenceRequired: true
    },
    timeoutMs: 30_000,
    intent: {
      capability: input.envelope.capability,
      action: input.envelope.action,
      resource: {
        type: input.envelope.resource.type,
        ...(input.envelope.resource.id !== undefined
          ? { id: input.envelope.resource.id }
          : {}),
        tenantId: input.tenantId
      },
      dataClassification: input.envelope.dataClassification,
      modelMessages: {
        messages: [{ role: 'user', content: input.envelope.message }]
      },
      // Zod schemas are executable registry objects and are not serialized in
      // durable plan state. The governed runtime can validate the controlled
      // response through its prompt/model contract when the step is resumed.
      structuredOutput: null,
      idempotencyKey:
        input.envelope.idempotencyKey ?? `durable:${input.context.messageId}`
    },
    toolId: 'controlled-kernel-tool',
    toolVersion: '1.0.0'
  }
}

function durableTurnResult(result: GovernedTurnResult): StepExecutionResult {
  if (result.outcome === 'approval_required') {
    return {
      outcome: 'approval_required',
      reason: result.reason,
      ...(result.approvalId !== undefined
        ? { approvalId: result.approvalId }
        : {}),
      ...(result.resultDigest !== undefined
        ? { resultDigest: result.resultDigest }
        : {}),
      toolCalls: 0,
      modelCalls: result.modelResult === undefined ? 0 : 1,
      costUsd: result.costUsd
    }
  }
  if (result.outcome === 'denied') {
    return {
      outcome: 'failed',
      reason: result.reason,
      ...(result.resultDigest !== undefined
        ? { resultDigest: result.resultDigest }
        : {}),
      toolCalls: 0,
      modelCalls: result.modelResult === undefined ? 0 : 1,
      costUsd: result.costUsd
    }
  }
  if (result.outcome === 'shadowed') {
    return {
      outcome: 'waiting_external',
      reason: result.reason,
      ...(result.resultDigest !== undefined
        ? { resultDigest: result.resultDigest }
        : {}),
      toolCalls: 0,
      modelCalls: result.modelResult === undefined ? 0 : 1,
      costUsd: result.costUsd
    }
  }
  const evidence = []
  if (result.effectConfirmed === true) {
    evidence.push({
      source: 'effect_journal' as const,
      reference: result.executionRef ?? result.resultDigest ?? result.traceId,
      verified: true,
      ...(result.eventType !== undefined
        ? { eventType: result.eventType, key: result.eventType }
        : {}),
      correlationId: result.correlationId,
      ...(result.resultDigest !== undefined
        ? { digest: result.resultDigest }
        : {})
    })
  } else if (result.outboxEventId !== undefined) {
    evidence.push({
      source: 'outbox' as const,
      reference: result.outboxEventId,
      verified: true,
      ...(result.eventType !== undefined
        ? { eventType: result.eventType, key: result.eventType }
        : {}),
      correlationId: result.correlationId,
      ...(result.resultDigest !== undefined
        ? { digest: result.resultDigest }
        : {})
    })
  }
  return {
    outcome: 'succeeded',
    reason: result.reason,
    ...(result.resultDigest !== undefined
      ? { resultDigest: result.resultDigest }
      : {}),
    evidence,
    toolCalls: result.toolResult === undefined ? 0 : 1,
    modelCalls: result.modelResult === undefined ? 0 : 1,
    costUsd: result.costUsd
  }
}

function kernelOutcomeStatus(outcome: GovernedTurnResult['outcome']): string {
  switch (outcome) {
    case 'executed':
      return 'completed'
    case 'approval_required':
      return 'approval_required'
    case 'shadowed':
      return 'shadowed'
    case 'denied':
      return 'denied'
  }
}

function durableOrchestratorEnabled(env: NodeJS.ProcessEnv): boolean {
  return env[DURABLE_KERNEL_ORCHESTRATOR_ENV]?.trim().toLowerCase() === 'true'
}

function assertProductionDurableKernel(env: NodeJS.ProcessEnv): void {
  if (env.NODE_ENV !== 'production') return

  const configured = env[WORKER_RUNTIME_ENV]?.trim()
  if (configured === PUBLISHED_AGENT_WORKER_RUNTIME) {
    throw new KernelRuntimeConfigurationError(
      'production_durable_kernel_required',
      'Production requires the governed durable kernel; published-agent runtime is forbidden'
    )
  }
  if (configured && configured !== KERNEL_WORKER_RUNTIME) {
    throw new KernelRuntimeConfigurationError(
      'unknown_worker_runtime',
      `Unknown ${WORKER_RUNTIME_ENV} value: ${configured}`
    )
  }
  if (!durableOrchestratorEnabled(env)) {
    throw new KernelRuntimeConfigurationError(
      'production_durable_kernel_required',
      `Production requires ${DURABLE_KERNEL_ORCHESTRATOR_ENV}=true; inline kernel execution is forbidden`
    )
  }
}

function durableGoalOutcome(
  result: OrchestrationRunResult,
  traceId: string,
  correlationId: string
): Record<string, unknown> {
  const approvalStep = result.steps.find(
    (step) => step.status === 'WAITING_APPROVAL'
  )
  if (result.goal.status === 'WAITING_APPROVAL') {
    if (!approvalStep?.approvalId) {
      throw new Error(
        'durable orchestrator requested approval without an approval id'
      )
    }
    return {
      status: 'approval_required',
      runtimeStatus: 'approval_required',
      reason: result.reason,
      approvalId: approvalStep.approvalId,
      externalEffects: false,
      traceId,
      correlationId
    }
  }
  if (result.goal.status === 'COMPLETED') {
    return {
      status: 'completed',
      runtimeStatus: 'completed',
      reason: result.reason,
      externalEffects: false,
      traceId,
      correlationId
    }
  }
  if (['CANCELLED', 'FAILED', 'BLOCKED'].includes(result.goal.status)) {
    return {
      status: result.goal.status.toLowerCase(),
      runtimeStatus: 'completed',
      reason: result.reason,
      externalEffects: false,
      traceId,
      correlationId
    }
  }
  return {
    status: result.goal.status.toLowerCase(),
    runtimeStatus: 'pending',
    reason: result.reason,
    externalEffects: false,
    traceId,
    correlationId
  }
}

/**
 * Inbound composition for the governed kernel. It mirrors the published-agent
 * handler's context loading and fail-closed statuses, converts the synthetic
 * JSON body into a `GovernedTurnInput`, runs the kernel and marks the inbound
 * message completed. No external effect is ever produced here.
 */
export function createPostgresKernelHandlers(
  env: NodeJS.ProcessEnv,
  runtime: PostgresKernelRuntime
): ControlledWorkerHandlers {
  assertProductionDurableKernel(env)
  const configuredAgentId = resolveKernelAgentId(env)
  if (
    configuredAgentId !== undefined &&
    configuredAgentId !== runtime.agentId
  ) {
    throw new KernelRuntimeConfigurationError(
      'kernel_runtime_prerequisites_missing',
      'Kernel worker agent id does not match the composed runtime'
    )
  }

  return {
    revalidateOutbox: createControlledOutboxRevalidator(
      runtime.conversations,
      runtime.tenantId
    ),
    inboundProcess: async (event) => {
      if (!event.conversationId || !event.inboundMessageId) {
        throw new Error('Inbound outbox event is missing runtime identifiers')
      }
      const conversationId = event.conversationId
      const inboundMessageId = event.inboundMessageId
      const sessionId = event.sessionId ?? null
      const tenantId = TenantIdSchema.parse(event.tenantId)
      const correlationId = CorrelationIdSchema.parse(event.correlationId)
      const traceId = RuntimeTraceIdSchema.parse(event.traceId)
      if (tenantId !== runtime.tenantId) {
        throw new Error(
          'Inbound outbox tenant does not match the configured kernel worker tenant'
        )
      }
      const context = await runtime.conversations.findInboundRuntimeContext(
        tenantId,
        conversationId,
        sessionId,
        inboundMessageId
      )
      if (!context) {
        throw new Error('Inbound runtime context was not found')
      }
      if (context.correlationId !== correlationId) {
        throw new Error(
          'Inbound runtime correlation does not match the persisted conversation'
        )
      }
      if (
        context.message.runtimeTraceId !== undefined &&
        context.message.runtimeTraceId !== traceId
      ) {
        throw new Error(
          'Inbound runtime trace does not match the persisted conversation'
        )
      }
      if (durableOrchestratorEnabled(env)) {
        const continuation = parseKernelContinuationPayload(event.payload)
        if (
          continuation?.traceId !== undefined &&
          continuation.traceId !== traceId
        ) {
          throw new Error(
            'Inbound runtime continuation trace does not match the durable event trace'
          )
        }
        if (context.message.runtimeStatus === 'completed') {
          return { status: 'already_completed', externalEffects: false }
        }
        if (context.session && !canBotRespond(context.session.takeoverState)) {
          return { status: 'paused_human_takeover', externalEffects: false }
        }
        if (
          context.message.runtimeStatus === 'waiting_approval' &&
          context.message.runtimeApprovalId !== continuation?.approvalId
        ) {
          throw new Error(
            'Durable orchestrator approval continuation does not match the inbound waiting marker'
          )
        }
        const parsedEnvelope = parseKernelTurnEnvelope(context.message.body)
        const envelope = continuation
          ? { ...parsedEnvelope, approvalId: continuation.approvalId }
          : parsedEnvelope
        const traceContext = createTraceContextWithTraceId({
          traceId,
          correlationId,
          tenantId,
          conversationId,
          ...(sessionId !== null ? { sessionId } : {}),
          agentId: runtime.agentId
        })
        const durableResult = await runtime.runDurableGoal({
          context,
          envelope,
          correlationId,
          ...(traceContext !== undefined ? { traceContext } : {}),
          ...(continuation !== null
            ? { approvalDecision: continuation.decision }
            : {})
        })
        const response = durableGoalOutcome(
          durableResult,
          traceId,
          correlationId
        )
        await runtime.conversations.appendAudit(
          {
            type: 'integration_event',
            actorType: 'System',
            actorId: 'agent-runtime-orchestrator',
            tenantId,
            correlationId,
            policyVersion: `${CONTROLLED_KERNEL_POLICY_ID}@${CONTROLLED_KERNEL_POLICY_VERSION}`,
            payload: {
              tenantId,
              conversationId,
              sessionId,
              inboundMessageId,
              runtimePath: 'durable-orchestrator',
              goalId: durableResult.goal.id,
              planId: durableResult.plan?.id ?? null,
              stepIds: durableResult.steps.map((step) => step.id),
              status: durableResult.goal.status,
              reason: durableResult.reason,
              traceId
            }
          },
          tenantId
        )
        if (response.status === 'approval_required') {
          await runtime.conversations.markInboundRuntimeWaitingForApproval(
            inboundMessageId,
            tenantId,
            response.approvalId as string,
            traceId
          )
        } else if (response.runtimeStatus === 'completed') {
          await runtime.conversations.markInboundRuntimeCompleted(
            inboundMessageId,
            tenantId
          )
        }
        return response
      }
      let continuation = parseKernelContinuationPayload(event.payload)
      if (
        continuation?.traceId !== undefined &&
        continuation.traceId !== traceId
      ) {
        throw new Error(
          'Inbound runtime continuation trace does not match the durable event trace'
        )
      }
      let recoveredContinuation = false
      if (context.message.runtimeStatus === 'completed') {
        return { status: 'already_completed', externalEffects: false }
      }
      if (
        context.message.runtimeStatus === 'pending' &&
        !continuation &&
        runtime.approvals !== undefined &&
        typeof runtime.approvals.findByContinuation === 'function'
      ) {
        const existingApproval = await runtime.approvals.findByContinuation(
          tenantId,
          inboundMessageId
        )
        if (existingApproval) {
          if (
            existingApproval.status === 'REQUESTED' ||
            existingApproval.status === 'PENDING'
          ) {
            const markedWaiting =
              await runtime.conversations.markInboundRuntimeWaitingForApproval(
                inboundMessageId,
                tenantId,
                existingApproval.approvalId,
                existingApproval.continuation?.traceId ?? traceId
              )
            if (!markedWaiting) {
              throw new Error(
                'Inbound runtime approval recovery marker was not updated'
              )
            }
            return {
              status: 'approval_required_pending',
              runtimeStatus: 'approval_required',
              approvalId: existingApproval.approvalId,
              externalEffects: false,
              traceId: existingApproval.continuation?.traceId ?? traceId,
              correlationId
            }
          }
          if (existingApproval.status === 'REJECTED') {
            const markedCompleted =
              await runtime.conversations.markInboundRuntimeCompleted(
                inboundMessageId,
                tenantId
              )
            if (!markedCompleted) {
              throw new Error(
                'Inbound runtime rejection recovery marker was not updated'
              )
            }
            return {
              status: 'denied',
              runtimeStatus: 'denied',
              reason: 'approval_rejected',
              externalEffects: false,
              approvalId: existingApproval.approvalId,
              traceId: existingApproval.continuation?.traceId ?? traceId,
              correlationId
            }
          }
          if (existingApproval.status === 'APPROVED') {
            continuation = {
              kind: 'runtime_approval.continue',
              approvalId: existingApproval.approvalId,
              decision: 'approve',
              ...(existingApproval.continuation?.traceId !== undefined
                ? { traceId: existingApproval.continuation.traceId }
                : {})
            }
            recoveredContinuation = true
          } else if (
            existingApproval.status === 'RESERVED' ||
            existingApproval.status === 'EXECUTING'
          ) {
            // A worker may crash after the durable reservation but before the
            // inbound event is acknowledged. Re-enter the governed runtime;
            // its effect journal recovery path decides whether replay is safe,
            // already in progress or uncertain.
            continuation = {
              kind: 'runtime_approval.continue',
              approvalId: existingApproval.approvalId,
              decision: 'approve',
              ...(existingApproval.continuation?.traceId !== undefined
                ? { traceId: existingApproval.continuation.traceId }
                : {})
            }
            recoveredContinuation = true
          } else if (existingApproval.status === 'EXECUTED') {
            const markedCompleted =
              await runtime.conversations.markInboundRuntimeCompleted(
                inboundMessageId,
                tenantId
              )
            if (!markedCompleted) {
              throw new Error(
                'Inbound runtime executed recovery marker was not updated'
              )
            }
            return {
              status: 'already_completed',
              runtimeStatus: 'executed',
              externalEffects: false,
              approvalId: existingApproval.approvalId,
              traceId: existingApproval.continuation?.traceId ?? traceId,
              correlationId
            }
          } else {
            throw new Error(
              'Inbound runtime approval is in a non-resumable terminal state'
            )
          }
        }
      }
      if (context.message.runtimeStatus === 'waiting_approval') {
        if (!continuation) {
          return {
            status: 'approval_required_pending',
            runtimeStatus: 'approval_required',
            approvalId: context.message.runtimeApprovalId,
            externalEffects: false,
            traceId: context.message.runtimeTraceId,
            correlationId
          }
        }
        if (context.message.runtimeApprovalId !== continuation.approvalId) {
          throw new Error(
            'Inbound runtime approval continuation does not match the persisted approval'
          )
        }
        const approval = await runtime.approvals.get(
          tenantId,
          continuation.approvalId
        )
        if (
          (continuation.decision === 'approve' &&
            !['APPROVED', 'RESERVED', 'EXECUTING'].includes(approval.status)) ||
          (continuation.decision === 'reject' && approval.status !== 'REJECTED')
        ) {
          throw new Error(
            'Inbound runtime approval continuation does not match the durable approval decision'
          )
        }
      } else if (continuation && !recoveredContinuation) {
        throw new Error(
          'Inbound runtime approval continuation requires a waiting message'
        )
      }
      if (context.session && !canBotRespond(context.session.takeoverState)) {
        return { status: 'paused_human_takeover', externalEffects: false }
      }

      const parsedEnvelope = parseKernelTurnEnvelope(context.message.body)
      if (continuation?.decision === 'reject') {
        const markedCompleted =
          await runtime.conversations.markInboundRuntimeCompleted(
            inboundMessageId,
            tenantId
          )
        if (!markedCompleted) {
          throw new Error(
            'Inbound runtime rejection completion marker was not updated'
          )
        }
        return {
          status: 'denied',
          runtimeStatus: 'denied',
          reason: 'approval_rejected',
          externalEffects: false,
          approvalId: continuation.approvalId,
          traceId: context.message.runtimeTraceId ?? traceId,
          correlationId
        }
      }
      const envelope = continuation
        ? { ...parsedEnvelope, approvalId: continuation.approvalId }
        : parsedEnvelope
      const traceContext = createTraceContextWithTraceId({
        traceId,
        correlationId,
        tenantId,
        conversationId,
        ...(sessionId !== null ? { sessionId } : {}),
        agentId: runtime.agentId
      })
      const turnInput = await buildKernelTurnInput({
        tenantId,
        agentId: runtime.agentId,
        correlationId,
        context,
        envelope,
        coordinator: runtime.workflowCoordinator,
        ...(traceContext !== undefined ? { traceContext } : {})
      })
      const result = await runtime.runTurn(turnInput)
      const runtimeAuditRecords =
        runtime.audit !== undefined &&
        typeof runtime.audit.recordsForTrace === 'function'
          ? runtime.audit.recordsForTrace(result.traceId)
          : []
      if (
        runtimeAuditRecords.length > 0 &&
        typeof runtime.conversations.appendRuntimeAuditRecords === 'function'
      ) {
        await runtime.conversations.appendRuntimeAuditRecords(
          tenantId,
          runtimeAuditRecords
        )
        const durableAudit =
          await runtime.conversations.verifyRuntimeAuditChain(tenantId)
        if (!durableAudit.valid) {
          throw new Error(
            `Durable runtime audit chain verification failed at ${durableAudit.brokenAt ?? 'unknown'}: ${durableAudit.reason ?? 'invalid'}`
          )
        }
      }
      await runtime.conversations.appendAudit(
        {
          type: 'integration_event',
          actorType: 'System',
          actorId: 'agent-runtime',
          tenantId,
          correlationId: result.correlationId,
          policyVersion: `${CONTROLLED_KERNEL_POLICY_ID}@${CONTROLLED_KERNEL_POLICY_VERSION}`,
          payload: {
            tenantId,
            conversationId,
            sessionId,
            inboundMessageId,
            runtimePath: 'governed-kernel',
            outcome: result.outcome,
            reason: result.reason,
            traceId: result.traceId,
            ...(result.approvalId !== undefined
              ? { approvalId: result.approvalId }
              : {}),
            ...(result.outboxEventId !== undefined
              ? { outboxEventId: result.outboxEventId }
              : {}),
            ...(result.executionRef !== undefined
              ? { executionRef: result.executionRef }
              : {}),
            ...(result.resultDigest !== undefined
              ? { resultDigest: result.resultDigest }
              : {}),
            ...(result.replayed !== undefined
              ? { replayed: result.replayed }
              : {}),
            ...(result.effectConfirmed !== undefined
              ? { effectConfirmed: result.effectConfirmed }
              : {}),
            auditChainValid: result.auditChainValid,
            costUsd: result.costUsd,
            durationMs: result.durationMs
          }
        },
        tenantId
      )
      if (result.outcome === 'approval_required') {
        if (!result.approvalId) {
          throw new Error(
            'Governed runtime requested approval without an approval id'
          )
        }
        const markedWaiting =
          await runtime.conversations.markInboundRuntimeWaitingForApproval(
            inboundMessageId,
            tenantId,
            result.approvalId,
            result.traceId
          )
        if (!markedWaiting) {
          throw new Error(
            'Inbound runtime approval waiting marker was not updated'
          )
        }
      } else {
        const markedCompleted =
          await runtime.conversations.markInboundRuntimeCompleted(
            inboundMessageId,
            tenantId
          )
        if (!markedCompleted) {
          throw new Error('Inbound runtime completion marker was not updated')
        }
      }
      return {
        status: kernelOutcomeStatus(result.outcome),
        runtimeStatus: result.outcome,
        reason: result.reason,
        externalEffects: false,
        ...(result.approvalId !== undefined
          ? { approvalId: result.approvalId }
          : {}),
        traceId: result.traceId,
        correlationId: result.correlationId
      }
    },
    messageOutbound: () => ({
      status: 'controlled_outbound_suppressed',
      externalEffects: false
    }),
    ...(durableOrchestratorEnabled(env) &&
    typeof runtime.recoverDurableGoals === 'function'
      ? { recoverDurableGoals: runtime.recoverDurableGoals }
      : {})
  }
}

function parseKernelContinuationPayload(
  payload: unknown
): KernelContinuationPayload | null {
  if (payload === null || typeof payload !== 'object' || !('kind' in payload)) {
    return null
  }
  const parsed = KernelContinuationPayloadSchema.safeParse(payload)
  if (!parsed.success) {
    throw new Error(
      'runtime_approval_continuation_invalid: continuation payload is invalid'
    )
  }
  return parsed.data
}
