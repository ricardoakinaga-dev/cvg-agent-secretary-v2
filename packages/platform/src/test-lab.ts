import { DomainError, redactSensitiveText } from '@cvg/shared'
import type { ControlPlaneStore } from './control-plane-store.ts'
import type {
  AgentConfig,
  AgentVersionRecord,
  AgentExecutionMode,
  TestRunTrace
} from './contracts.ts'
import { createTraceId, type AgentId, type TenantId } from './ids.ts'
import type { HumanTakeoverState } from './handoff.ts'
import { createDryRunModelProvider } from './model-provider.ts'
import {
  CONTROLLED_SCHEDULING_TOOL,
  createControlledCapabilityGateway
} from './controlled-plugins.ts'
import type {
  CapabilityApproval,
  CapabilityApprovalResolver,
  CapabilityGateway,
  PluginAuditEvent
} from './plugin-gateway.ts'
import type { PlatformEventBus, PlatformEventName } from './event-bus.ts'
import { composePrompt } from './prompt-composer.ts'
import { evaluatePlatformPolicy } from './policy-evaluator.ts'

export interface ApprovedKnowledgeForTest {
  version: string
  answer: string
  source: string
}

export interface TestLabInput {
  store: ControlPlaneStore
  tenantId: TenantId
  agentId: AgentId
  versionId: AgentVersionRecord['id']
  message: string
  history: string[]
  approvedKnowledge?: ApprovedKnowledgeForTest
  capabilityGateway?: CapabilityGateway
  actor?: AgentExecutionActor
  capabilityApproval?: CapabilityApproval
  resolveCapabilityApproval?: CapabilityApprovalResolver
  requireCapabilityApproval?: boolean
  onToolAudit?: (event: PluginAuditEvent) => void | Promise<void>
  eventBus?: PlatformEventBus
  context?: { conversationId?: string; sessionId?: string }
}

export interface AgentExecutionActor {
  id: string
  role: string
  permissions: string[]
}

export interface ControlledAgentExecutionInput extends TestLabInput {
  executionMode: AgentExecutionMode
}

export async function runTestLab(input: TestLabInput): Promise<TestRunTrace> {
  const trace = await executeConfiguredAgent({
    ...input,
    executionMode: 'TEST_LAB',
    capabilityGateway:
      input.capabilityGateway ?? createControlledCapabilityGateway(),
    actor: input.actor ?? controlledRuntimeActor
  })
  return input.store.recordTestRun({ tenantId: input.tenantId }, trace)
}

export async function executeConfiguredAgent(
  input: ControlledAgentExecutionInput
): Promise<TestRunTrace> {
  const startedAt = new Date()
  const version = await input.store.getVersion(
    { tenantId: input.tenantId },
    input.versionId
  )
  if (!version || version.agentId !== input.agentId) {
    throw new DomainError('invalid_action', 'Agent version is not available')
  }
  const message = validateMessage(input.message)
  const history = input.history.map(validateHistoryItem).map(redactTestMessage)
  validateApprovedKnowledge(input.approvedKnowledge)
  const config = version.config
  await emitPlatformEvent(input, 'message.received', {
    messageLength: message.length,
    historySize: input.history.length
  })
  await emitPlatformEvent(input, 'message.normalized', {
    messageLength: message.length,
    historySize: history.length
  })
  await emitPlatformEvent(input, 'conversation.loaded', {
    historySize: history.length
  })
  await emitPlatformEvent(input, 'context.loaded', {
    hasConversationId: Boolean(input.context?.conversationId),
    hasSessionId: Boolean(input.context?.sessionId)
  })
  await emitPlatformEvent(input, 'agent.resolved', {
    version: version.version,
    status: version.status
  })
  await emitPlatformEvent(input, 'prompt.before', {
    blockCount: config.promptBlocks.length
  })
  const prompt = composePrompt(config)
  await emitPlatformEvent(input, 'prompt.after', {
    blockIds: prompt.blockIds,
    textLength: prompt.text.length
  })

  await emitPlatformEvent(input, 'intent.before', {
    messageLength: message.length
  })
  const intent = classifyForDryRun(message)
  await emitPlatformEvent(input, 'intent.after', intent)
  const action = actionForMessage(message, intent.name)
  await emitPlatformEvent(input, 'policy.input.before', {
    action,
    confidence: intent.confidence,
    clarificationCount: history.length
  })
  const policy = evaluatePlatformPolicy({
    action,
    confidence: intent.confidence,
    config,
    clarificationCount: history.length,
    riskLevel: riskForIntent(intent.name).level
  })
  await emitPlatformEvent(input, 'policy.input.after', {
    decision: policy.decision,
    layer: policy.layer,
    reason: policy.reason
  })
  if (policy.decision === 'blocked') {
    await emitPlatformEvent(input, 'security.blocked', {
      action,
      reason: policy.reason
    })
  }
  const risk = riskForIntent(intent.name, policy)
  await emitPlatformEvent(input, 'knowledge.before', {
    intent: intent.name,
    configuredBindings: config.knowledge.length
  })
  const knowledge = resolveKnowledge(
    intent.name,
    input.approvedKnowledge,
    config.knowledge
  )
  await emitPlatformEvent(input, 'knowledge.after', knowledge.trace)
  const handoffRequested =
    policy.decision === 'handoff' ||
    policy.decision === 'requires_approval' ||
    intent.name === 'medication_advice' ||
    knowledge.trace.status === 'approved_source_missing' ||
    knowledge.trace.status === 'handoff'
  const handoffState: HumanTakeoverState = handoffRequested
    ? 'HANDOFF_REQUESTED'
    : 'BOT_ACTIVE'
  if (handoffRequested) {
    await emitPlatformEvent(input, 'handoff.requested', {
      reason:
        policy.decision === 'handoff' || policy.decision === 'requires_approval'
          ? policy.reason
          : intent.name === 'medication_advice'
            ? 'veterinary_evaluation_required'
            : 'approved_source_missing'
    })
  }
  const response = buildResponse({
    config,
    intent: intent.name,
    policyDecision: policy.decision,
    knowledge: knowledge.trace,
    knowledgeAnswer: knowledge.answer,
    handoffRequested
  })
  await emitPlatformEvent(input, 'response.before', {
    mode: response.mode
  })
  const promptWithHistory = history.length
    ? `${prompt.text}\n\nConversation history:\n${history.join('\n')}`
    : prompt.text
  await emitPlatformEvent(input, 'model.before', {
    provider: config.model.provider,
    model: config.model.model,
    promptLength: promptWithHistory.length
  })
  let completion: Awaited<
    ReturnType<ReturnType<typeof createDryRunModelProvider>['complete']>
  >
  try {
    completion = await createDryRunModelProvider(config.model).complete({
      prompt: promptWithHistory,
      fallbackText: response.text
    })
  } catch (error) {
    await emitPlatformEvent(input, 'model.error', {
      provider: config.model.provider,
      model: config.model.model,
      reason: 'model_execution_failed'
    })
    throw error
  }
  await emitPlatformEvent(input, 'model.after', {
    provider: completion.provider,
    model: completion.model,
    externalCall: completion.externalCall,
    responseLength: completion.text.length
  })
  const completedResponse = {
    ...response,
    text: redactTestMessage(completion.text)
  }
  const tools = await executePlannedTools({
    input,
    config,
    intent: intent.name,
    policy
  })
  await emitPlatformEvent(input, 'response.after', {
    mode: completedResponse.mode,
    responseLength: completedResponse.text.length
  })
  const completedAt = new Date()
  const promptTokens = estimateTokenCount(promptWithHistory)
  const completionTokens = estimateTokenCount(completedResponse.text)
  const trace: TestRunTrace = {
    traceId: createTraceId(),
    tenantId: input.tenantId,
    agentId: input.agentId,
    versionId: input.versionId,
    input: { message: redactTestMessage(message), historySize: history.length },
    intent,
    risk,
    policy: [policy],
    knowledge: knowledge.trace,
    tools,
    toolResults: tools.map((tool) => ({
      name: tool.name,
      status: tool.status,
      output: tool.status === 'succeeded' ? { redacted: true } : null
    })),
    handoff: {
      requested: handoffRequested,
      reason: handoffRequested
        ? policy.decision === 'handoff' ||
          policy.decision === 'requires_approval'
          ? policy.reason
          : intent.name === 'medication_advice'
            ? 'veterinary_evaluation_required'
            : 'approved_source_missing'
        : null,
      state: handoffState
    },
    response: completedResponse,
    provider: {
      provider: completion.provider,
      model: completion.model,
      externalCall: completion.externalCall
    },
    prompt: {
      version: `${version.id}:v${version.version}`,
      blockIds: prompt.blockIds
    },
    configVersion: `${version.id}:v${version.version}`,
    executionMode: input.executionMode,
    status: policy.decision === 'blocked' ? 'blocked' : 'completed',
    startedAt,
    completedAt,
    latencyMs: Math.max(0, completedAt.getTime() - startedAt.getTime()),
    tokenUsage: {
      prompt: promptTokens,
      completion: completionTokens,
      total: promptTokens + completionTokens,
      estimated: true
    },
    spans: createTraceSpans({
      policy,
      knowledge: knowledge.trace,
      tools,
      handoffRequested
    }),
    ...(input.context?.conversationId
      ? { conversationId: input.context.conversationId }
      : {}),
    ...(input.context?.sessionId ? { sessionId: input.context.sessionId } : {}),
    createdAt: completedAt
  }
  await emitPlatformEvent(input, 'conversation.completed', {
    status: trace.status,
    policyDecision: policy.decision,
    handoffRequested,
    externalCall: trace.provider.externalCall
  })
  return trace
}

function validateMessage(rawMessage: string): string {
  if (typeof rawMessage !== 'string') {
    throw new DomainError('validation_failed', 'Test message must be text')
  }
  const message = rawMessage.trim()
  if (message.length === 0 || message.length > 4000) {
    throw new DomainError(
      'validation_failed',
      'Test message must contain between 1 and 4000 characters'
    )
  }
  return message
}

function validateHistoryItem(rawItem: string): string {
  if (typeof rawItem !== 'string' || rawItem.length > 4000) {
    throw new DomainError('validation_failed', 'Test history item is invalid')
  }
  return rawItem
}

function validateApprovedKnowledge(
  approvedKnowledge: ApprovedKnowledgeForTest | undefined
): void {
  if (!approvedKnowledge) return
  if (
    !/^controlled:\/\//.test(approvedKnowledge.source) ||
    approvedKnowledge.version.trim().length === 0 ||
    approvedKnowledge.answer.trim().length === 0
  ) {
    throw new DomainError(
      'validation_failed',
      'Approved knowledge must reference a controlled source'
    )
  }
}

function classifyForDryRun(message: string): {
  name: string
  confidence: number
} {
  const text = message.toLowerCase()
  if (
    /dipirona|ibuprofeno|paracetamol|medicamento|medica[cç][aã]o|rem[eé]dio|antibi[oó]tico|medication|medicine|drug/.test(
      text
    )
  ) {
    return { name: 'medication_advice', confidence: 0.99 }
  }
  if (/endere[cç]o|hor[aá]rio de funcionamento/.test(text)) {
    return { name: 'institutional_question', confidence: 0.94 }
  }
  if (/consulta|hor[aá]rio|agenda/.test(text)) {
    return { name: 'scheduling', confidence: 0.92 }
  }
  if (/vomit|sangue|dor|convuls|desmaio/.test(text)) {
    return { name: 'triage', confidence: 0.96 }
  }
  return { name: 'unknown', confidence: 0.32 }
}

function actionForMessage(message: string, intent: string): string {
  const text = message.toLowerCase()
  if (/confirmar|confirm/.test(text) && intent === 'scheduling') {
    return 'confirm_appointment'
  }
  if (/cancelar|cancel/.test(text) && intent === 'scheduling') {
    return 'cancel_appointment'
  }
  return intent === 'unknown' ? 'respond' : intent
}

function resolveKnowledge(
  intent: string,
  approvedKnowledge: ApprovedKnowledgeForTest | undefined,
  bindings: AgentConfig['knowledge']
): { trace: TestRunTrace['knowledge']; answer?: string } {
  if (intent !== 'institutional_question') {
    return { trace: { status: 'not_requested' } }
  }
  if (!approvedKnowledge)
    return { trace: { status: 'approved_source_missing' } }
  const binding = bindings.find(
    (candidate) =>
      candidate.enabled &&
      candidate.requiresApprovedSource &&
      candidate.source === approvedKnowledge.source &&
      candidate.version === approvedKnowledge.version
  )
  if (!binding) return { trace: { status: 'approved_source_missing' } }
  return {
    trace: {
      status: 'answered',
      source: approvedKnowledge.source,
      version: approvedKnowledge.version
    },
    answer: approvedKnowledge.answer
  }
}

function buildResponse(input: {
  config: AgentConfig
  intent: string
  policyDecision: ReturnType<typeof evaluatePlatformPolicy>['decision']
  knowledge: TestRunTrace['knowledge']
  knowledgeAnswer: string | undefined
  handoffRequested: boolean
}): TestRunTrace['response'] {
  if (input.intent === 'medication_advice') {
    return {
      mode: 'handoff',
      text: 'Não posso orientar o uso de medicamentos. Procure um médico-veterinário para avaliação.'
    }
  }
  if (input.policyDecision === 'blocked') {
    return {
      mode: 'blocked',
      text: 'Essa ação permanece bloqueada pelas políticas de segurança.'
    }
  }
  if (input.policyDecision === 'clarify') {
    return {
      mode: 'clarify',
      text: 'Pode esclarecer um pouco mais sua solicitação?'
    }
  }
  if (input.handoffRequested) {
    return {
      mode: 'handoff',
      text: 'Vou encaminhar sua solicitação para a equipe responsável.'
    }
  }
  if (input.knowledge.status === 'answered') {
    return {
      mode: 'answer',
      text:
        input.knowledgeAnswer ??
        input.config.responseTemplates[input.intent] ??
        input.config.greeting
    }
  }
  return {
    mode: 'answer',
    text: input.config.responseTemplates[input.intent] ?? input.config.greeting
  }
}

function riskForIntent(
  intent: string,
  policy?: ReturnType<typeof evaluatePlatformPolicy>
): { level: 'low' | 'medium' | 'high' | 'critical'; reason: string } {
  if (intent === 'medication_advice') {
    return {
      level: 'critical',
      reason: 'hard_safety_medication_request'
    }
  }
  if (intent === 'triage') {
    return { level: 'high', reason: 'high_risk_triage_request' }
  }
  if (policy?.layer === 'hard_safety' && policy.decision === 'blocked') {
    return { level: 'critical', reason: policy.reason }
  }
  return { level: 'low', reason: 'controlled_low_risk_request' }
}

function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4)
}

function createTraceSpans(input: {
  policy: ReturnType<typeof evaluatePlatformPolicy>
  knowledge: TestRunTrace['knowledge']
  tools: TestRunTrace['tools']
  handoffRequested: boolean
}): NonNullable<TestRunTrace['spans']> {
  const toolStatus = input.tools.length
    ? input.tools.some((tool) => tool.status === 'blocked')
      ? 'blocked'
      : 'completed'
    : 'skipped'
  return [
    { name: 'normalize', status: 'completed', durationMs: 0 },
    { name: 'context', status: 'completed', durationMs: 0 },
    { name: 'intent', status: 'completed', durationMs: 0 },
    {
      name: 'policy',
      status: input.policy.decision === 'blocked' ? 'blocked' : 'completed',
      durationMs: 0
    },
    {
      name: 'knowledge',
      status:
        input.knowledge.status === 'not_requested' ? 'skipped' : 'completed',
      durationMs: 0
    },
    { name: 'prompt', status: 'completed', durationMs: 0 },
    { name: 'model', status: 'completed', durationMs: 0 },
    { name: 'tool', status: toolStatus, durationMs: 0 },
    { name: 'response', status: 'completed', durationMs: 0 },
    {
      name: 'handoff',
      status: input.handoffRequested ? 'completed' : 'skipped',
      durationMs: 0
    },
    { name: 'delivery', status: 'skipped', durationMs: 0 }
  ]
}

async function executePlannedTools(input: {
  input: ControlledAgentExecutionInput
  config: AgentConfig
  intent: string
  policy: ReturnType<typeof evaluatePlatformPolicy>
}): Promise<TestRunTrace['tools']> {
  const toolNames =
    input.intent === 'scheduling'
      ? input.config.plugins
          .filter(
            (binding) =>
              binding.enabled &&
              binding.allowedTools.includes(CONTROLLED_SCHEDULING_TOOL)
          )
          .flatMap(() => [CONTROLLED_SCHEDULING_TOOL])
      : []
  if (toolNames.length === 0) return []

  return Promise.all(
    toolNames.map(async (toolName) => {
      await emitPlatformEvent(input.input, 'tool.before', {
        toolName,
        dryRun: input.input.executionMode === 'TEST_LAB'
      })
      if (!input.input.capabilityGateway || !input.input.actor) {
        const blocked = { name: toolName, status: 'blocked' as const }
        await emitPlatformEvent(input.input, 'tool.after', blocked)
        return blocked
      }
      const toolInput = { message: redactTestMessage(input.input.message) }
      try {
        let approval = input.input.capabilityApproval
        if (!approval && input.input.resolveCapabilityApproval) {
          approval =
            (await input.input.resolveCapabilityApproval({
              tenantId: input.input.tenantId,
              agentId: input.input.agentId,
              versionId: input.input.versionId,
              toolName,
              input: toolInput,
              actor: input.input.actor!
            })) ?? undefined
        }
        const result = await input.input.capabilityGateway.execute({
          tenantId: input.input.tenantId,
          agentId: input.input.agentId,
          versionId: input.input.versionId,
          config: input.config,
          toolName,
          input: toolInput,
          actor: input.input.actor,
          policy: input.policy,
          dryRun: input.input.executionMode === 'TEST_LAB',
          ...(approval ? { approval } : {}),
          ...(input.input.requireCapabilityApproval
            ? { requireApproval: true }
            : {}),
          ...(input.input.onToolAudit
            ? { onAudit: input.input.onToolAudit }
            : {})
        })
        const completed = { name: toolName, status: result.status }
        await emitPlatformEvent(input.input, 'tool.after', completed)
        return completed
      } catch (error) {
        await emitPlatformEvent(input.input, 'tool.error', {
          toolName,
          reason: 'tool_execution_failed'
        })
        throw error
      }
    })
  )
}

const controlledRuntimeActor: AgentExecutionActor = {
  id: 'system.controlled-runtime',
  role: 'System',
  permissions: ['scheduling:read']
}

function redactTestMessage(message: string): string {
  return redactSensitiveText(message)
}

async function emitPlatformEvent(
  input: ControlledAgentExecutionInput,
  name: PlatformEventName,
  payload: Record<string, unknown>
): Promise<void> {
  if (!input.eventBus) return
  try {
    await input.eventBus.emit({
      name,
      tenantId: input.tenantId,
      agentId: input.agentId,
      versionId: input.versionId,
      executionMode: input.executionMode,
      payload
    })
  } catch {
    // Hook observability is strictly non-blocking for the controlled runtime.
  }
}
