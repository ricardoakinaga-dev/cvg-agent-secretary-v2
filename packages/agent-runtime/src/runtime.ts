import { ApprovalError } from '@cvg/approval-engine'
import { ModelGatewayError, type ModelResult } from '@cvg/model-gateway'
import { capabilityRisk, type PolicyDecision } from '@cvg/policy-engine'
import type { ActiveSpan } from '@cvg/observability'
import {
  LoopLimitsSchema,
  type GovernedAgentRuntimeOptions,
  type GovernedOutcome,
  type GovernedTurnInput,
  type GovernedTurnResult,
  type LoopLimits
} from './contracts.ts'

interface FinishExtra {
  modelResult?: ModelResult
  approvalId?: string
  toolResult?: unknown
  outboxEventId?: string
  costUsd?: number
}

/**
 * Governed turn pipeline:
 * envelope -> policy -> takeover interlock -> approval binding -> model gateway
 * -> structured output -> tool -> outbox. Every phase is traced and appended to
 * a hash-chained audit ledger; nothing external runs without a deterministic
 * authorization.
 */
export class GovernedAgentRuntime {
  readonly #options: GovernedAgentRuntimeOptions

  constructor(options: GovernedAgentRuntimeOptions) {
    this.#options = options
  }

  async runTurn(input: GovernedTurnInput): Promise<GovernedTurnResult> {
    const { policy, approvals, modelGateway, telemetry, audit } = this.#options
    const clock = this.#options.clock ?? (() => new Date())
    const limits: LoopLimits = LoopLimitsSchema.parse(input.limits ?? {})
    const startedAt = clock()
    const deadline = startedAt.getTime() + limits.maxDurationMs
    const risk = capabilityRisk(input.capability)
    const root: ActiveSpan = telemetry.startSpan('agent.turn', {
      capability: input.capability,
      agentProfile: input.agentProfile,
      risk,
      correlationId: input.correlationId,
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      ...(input.sessionId !== undefined ? { sessionId: input.sessionId } : {}),
      agentId: input.agentId,
      agentVersion: input.agentVersion
    })
    const { traceId, spanId, correlationId } = root.context
    let auditSequence = 0
    let costUsd = 0
    let steps = 0

    const appendAudit = (
      type: string,
      payload: Record<string, unknown>
    ): void => {
      auditSequence += 1
      audit.append({
        eventId: `evt_${traceId}_${auditSequence}`,
        type,
        actor: input.operatorId,
        tenantId: input.tenantId,
        correlationId,
        timestamp: clock().toISOString(),
        payload
      })
    }

    const finish = (
      outcome: GovernedOutcome,
      reason: string,
      decision: PolicyDecision,
      extra: FinishExtra = {}
    ): GovernedTurnResult => {
      const endedAt = clock()
      root.setAttribute('outcome', outcome)
      root.end(
        outcome === 'denied' ? 'error' : 'ok',
        outcome === 'denied' ? reason : undefined
      )
      telemetry.recordMetric('agent_runs_total', 1, {
        outcome,
        capability: input.capability,
        agentProfile: input.agentProfile
      })
      return {
        outcome,
        reason,
        decision,
        traceId,
        spanId,
        correlationId,
        auditChainValid: audit.verify().valid,
        costUsd: extra.costUsd ?? costUsd,
        durationMs: Math.max(0, endedAt.getTime() - startedAt.getTime()),
        ...(extra.modelResult !== undefined
          ? { modelResult: extra.modelResult }
          : {}),
        ...(extra.approvalId !== undefined
          ? { approvalId: extra.approvalId }
          : {}),
        ...(extra.toolResult !== undefined
          ? { toolResult: extra.toolResult }
          : {}),
        ...(extra.outboxEventId !== undefined
          ? { outboxEventId: extra.outboxEventId }
          : {})
      }
    }

    const step = (name: string): ActiveSpan | undefined => {
      steps += 1
      if (steps > limits.maxSteps) return undefined
      return root.child(name)
    }

    const decision = policy.evaluate({
      tenantId: input.tenantId,
      operatorId: input.operatorId,
      operatorRole: input.operatorRole,
      agentId: input.agentId,
      agentProfile: input.agentProfile,
      capability: input.capability,
      action: input.action,
      correlationId,
      resource: {
        type: input.resource.type,
        ...(input.resource.id !== undefined ? { id: input.resource.id } : {}),
        ...(input.resource.tenantId !== undefined
          ? { tenantId: input.resource.tenantId }
          : {})
      },
      context: { dataClassification: input.dataClassification }
    })
    appendAudit('policy.decided', {
      capability: input.capability,
      action: input.action,
      decision: decision.decision,
      policyId: decision.policyId,
      policyVersion: decision.policyVersion
    })
    const policySpan = step('policy.evaluate')
    policySpan?.setAttribute('decision', decision.decision)
    policySpan?.end(
      decision.decision === 'DENY' ? 'error' : 'ok',
      decision.decision === 'DENY' ? 'policy_denied' : undefined
    )

    if (decision.decision === 'DENY') {
      telemetry.recordMetric('policy_denied_total', 1, {
        capability: input.capability,
        agentProfile: input.agentProfile
      })
      appendAudit('runtime.denied', {
        code: 'policy_denied',
        reason: decision.reason
      })
      return finish('denied', 'policy_denied', decision)
    }

    if (input.takeoverActive) {
      appendAudit('runtime.denied', { code: 'human_takeover_active' })
      return finish('denied', 'human_takeover_active', decision)
    }

    if (decision.decision === 'REQUIRE_APPROVAL') {
      if (!input.approvalId) {
        const approval = approvals.request({
          tenantId: input.tenantId,
          operatorId: input.operatorId,
          agentId: input.agentId,
          agentVersion: input.agentVersion,
          action: input.action,
          resource: {
            type: input.resource.type,
            ...(input.resource.id !== undefined
              ? { id: input.resource.id }
              : {})
          },
          payload: input.approvalPayload ?? null,
          policyVersion: decision.policyVersion,
          correlationId,
          reason: decision.reason
        })
        telemetry.recordMetric('approval_required_total', 1, {
          capability: input.capability,
          agentProfile: input.agentProfile
        })
        appendAudit('runtime.approval_requested', {
          approvalId: approval.approvalId,
          capability: input.capability
        })
        return finish('approval_required', decision.reason, decision, {
          approvalId: approval.approvalId
        })
      }
      try {
        approvals.verifyAndConsume({
          tenantId: input.tenantId,
          approvalId: input.approvalId,
          action: input.action,
          resource: {
            type: input.resource.type,
            ...(input.resource.id !== undefined
              ? { id: input.resource.id }
              : {})
          },
          payload: input.approvalPayload ?? null
        })
      } catch (error) {
        const code =
          error instanceof ApprovalError ? error.code : 'approval_invalid'
        appendAudit('runtime.denied', { code })
        return finish('denied', code, decision)
      }
      appendAudit('approval.consumed', { approvalId: input.approvalId })
    }

    if (limits.maxModelCalls < 1) {
      appendAudit('runtime.denied', { code: 'model_calls_exhausted' })
      return finish('denied', 'model_calls_exhausted', decision)
    }
    if (clock().getTime() > deadline) {
      appendAudit('runtime.denied', { code: 'loop_deadline_exceeded' })
      return finish('denied', 'loop_deadline_exceeded', decision)
    }

    const modelSpan = step('model.generate')
    let modelResult: ModelResult
    try {
      modelResult = await modelGateway.generate({
        requestId: `req_${traceId}`,
        tenantId: input.tenantId,
        agentId: input.agentId,
        agentVersionId: input.agentVersion,
        sessionId: input.sessionId ?? input.conversationId,
        conversationId: input.conversationId,
        correlationId,
        promptId: input.prompt.promptId,
        promptVersion: input.prompt.version,
        ...(input.prompt.sha256 !== undefined
          ? { promptSha256: input.prompt.sha256 }
          : {}),
        policyVersion: decision.policyVersion,
        modelProfile: input.modelProfile,
        dataClassification: input.dataClassification,
        input: input.modelMessages,
        maxCostUsd: limits.maxCostUsd,
        estimatedCostUsd: 0,
        ...(input.task !== undefined ? { task: input.task } : {}),
        ...(input.structuredOutput !== undefined
          ? { structuredOutput: input.structuredOutput }
          : {})
      })
      costUsd = modelResult.costUsd
      telemetry.recordMetric('model_calls_total', 1, {
        provider: modelResult.providerId,
        model: modelResult.model,
        status: 'ok'
      })
      telemetry.recordMetric('model_cost_usd', modelResult.costUsd, {})
      appendAudit('model.completed', {
        providerId: modelResult.providerId,
        model: modelResult.model,
        costUsd: modelResult.costUsd,
        attempts: modelResult.attempts
      })
      modelSpan?.end('ok')
    } catch (error) {
      const code =
        error instanceof ModelGatewayError ? error.code : 'model_failed'
      telemetry.recordMetric('model_calls_total', 1, {
        provider: 'unknown',
        status: 'error'
      })
      modelSpan?.end('error', code)
      appendAudit('runtime.denied', { code, phase: 'model' })
      return finish('denied', code, decision)
    }

    if (costUsd > limits.maxCostUsd) {
      appendAudit('runtime.denied', { code: 'loop_cost_exceeded', costUsd })
      return finish('denied', 'loop_cost_exceeded', decision, { modelResult })
    }

    if (input.shadowMode) {
      appendAudit('runtime.shadowed', {
        capability: input.capability,
        action: input.action
      })
      return finish('shadowed', 'shadow_mode', decision, { modelResult })
    }

    if (limits.maxToolCalls < 1) {
      appendAudit('runtime.denied', { code: 'tool_calls_exhausted' })
      return finish('denied', 'tool_calls_exhausted', decision, { modelResult })
    }
    if (clock().getTime() > deadline) {
      appendAudit('runtime.denied', { code: 'loop_deadline_exceeded' })
      return finish('denied', 'loop_deadline_exceeded', decision, {
        modelResult
      })
    }

    const payload =
      modelResult.output.structured !== undefined
        ? modelResult.output.structured
        : { text: modelResult.output.text }
    const toolSpan = step('tool.execute')
    let toolResult: unknown
    try {
      const invocation = {
        tenantId: input.tenantId,
        capability: input.capability,
        action: input.action,
        resource: input.resource,
        payload,
        modelResult,
        correlationId,
        traceId,
        shadowMode: false as const
      }
      const executed = await this.#options.toolExecutor(invocation)
      toolResult = executed.result
      telemetry.recordMetric('tool_calls_total', 1, {
        capability: input.capability,
        status: 'ok'
      })
      appendAudit('tool.executed', {
        capability: input.capability,
        action: input.action
      })
      toolSpan?.end('ok')
    } catch {
      telemetry.recordMetric('tool_failures_total', 1, {
        capability: input.capability
      })
      toolSpan?.end('error', 'tool_failed')
      appendAudit('runtime.denied', { code: 'tool_failed', phase: 'tool' })
      return finish('denied', 'tool_failed', decision, { modelResult })
    }

    const outboxSpan = step('outbox.enqueue')
    let outboxEventId: string
    try {
      const enqueued = await this.#options.outbox({
        tenantId: input.tenantId,
        eventType: `${input.capability}.executed`,
        idempotencyKey:
          input.idempotencyKey ??
          `${input.tenantId}:${input.capability}:${traceId}`,
        correlationId,
        traceId,
        payload: {
          capability: input.capability,
          action: input.action,
          resource: input.resource,
          operatorId: input.operatorId,
          agentId: input.agentId,
          agentVersion: input.agentVersion,
          policyVersion: decision.policyVersion
        }
      })
      outboxEventId = enqueued.eventId
      telemetry.recordMetric('outbox_enqueued_total', 1, {
        capability: input.capability
      })
      appendAudit('outbox.enqueued', { eventId: outboxEventId })
      outboxSpan?.end('ok')
    } catch {
      outboxSpan?.end('error', 'outbox_failed')
      appendAudit('runtime.denied', { code: 'outbox_failed', phase: 'outbox' })
      return finish('denied', 'outbox_failed', decision, {
        modelResult,
        toolResult
      })
    }

    appendAudit('runtime.executed', { capability: input.capability })
    return finish('executed', decision.reason, decision, {
      modelResult,
      toolResult,
      outboxEventId
    })
  }
}
