import { createHash } from 'node:crypto'
import Fastify from 'fastify'
import {
  auditEvidenceGovernance,
  createCorrelationId,
  DomainError,
  fail,
  ok,
  parseOperatorIdentity,
  redactSensitiveText,
  roleHasPermission,
  sanitizeAuditEvidencePayload,
  TaskStatusSchema,
  toSafeError,
  type Channel,
  type OperatorIdentity,
  type TaskStatus
} from '@cvg/shared'
import {
  AgentConfigSchema,
  AgentIdSchema,
  AgentVersionIdSchema,
  AgentVersionStatusSchema,
  PluginCatalogCreateInputSchema,
  PluginCatalogIdSchema,
  PluginCatalogTransitionInputSchema,
  canBotRespond,
  createControlledCapabilityGateway,
  CONTROLLED_SCHEDULING_TOOL,
  createTestSuiteRunId,
  executeConfiguredAgent,
  ensureControlledSecretaryPreset,
  InMemoryControlPlaneStore,
  TenantIdSchema,
  TestLabCaseSchema,
  TestSuiteCloneInputSchema,
  TestSuiteCreateInputSchema,
  TestSuiteIdSchema,
  evaluateTestLabSuite,
  runTestLab,
  InMemoryCapabilityApprovalAuthority,
  type AgentExecutionActor,
  type CapabilityApproval,
  type CapabilityApprovalAuthority,
  type CapabilityApprovalRecord,
  type CapabilityApprovalResolver,
  type CapabilityGateway,
  type ApprovedKnowledgeForTest,
  type AgentId,
  type PluginAuditEvent,
  type TenantId,
  type AgentVersionId,
  type ControlPlaneStore,
  type TestLabCase,
  type TestSuiteRecord,
  type TestSuiteRunRecord,
  type TestSuiteVariantResult
} from '@cvg/platform'
import {
  ApprovalRepository,
  type AuditEventRecord,
  type AuditEventType,
  type AuditEvidenceFilters,
  type AuditEvidenceQuery,
  AuditRepository,
  ConversationRepository,
  InMemoryDatabase,
  PostgresRuntimeRepository,
  PostgresControlPlaneRepository,
  TenantScopedPostgresCapabilityApprovalRepository,
  TenantScopedPostgresRuntimeRepository,
  TenantScopedPostgresControlPlaneRepository,
  type InboundRuntimeCompletionInput,
  type PostgresPoolLike,
  runInitialPostgresMigration,
  runPostgresMigrations,
  readPostgresMigrationSql,
  TaskRepository,
  type PostgresQueryable
} from '@cvg/persistence'
import {
  createInternalTask,
  executePublishedAgent,
  getConversationTimeline,
  receiveInboundMessage,
  requestHumanApproval,
  resolveApproval
} from '@cvg/agent-core'
import { Pool } from 'pg'
import { z } from 'zod'
import { InMemoryRateLimiter } from './rate-limit.ts'
import {
  HmacWebhookVerifier,
  PostgresWebhookReplayStore,
  type WebhookReplayStore,
  type WebhookVerificationLease
} from './webhook-security.ts'

export interface RuntimeLogEntry {
  event: string
  correlationId: string
  route: string
  status: 'ok' | 'error'
  sessionId?: string | null
  conversationId?: string | null
  resourceId?: string | null
  errorCode?: string
}

export type OperatorIdentityResolver = (
  headers: Record<string, unknown>
) => OperatorIdentity

export type WebhookVerification = boolean | WebhookVerificationLease | null

export type WebhookVerifier = (input: {
  headers: Record<string, unknown>
  body: unknown
  channel: string
  rawBody?: string
}) => WebhookVerification | Promise<WebhookVerification>

export type InboundRuntimeCompletion = (
  input: InboundRuntimeCompletionInput
) => Promise<{ status: 'completed' | 'paused' }>

export type InboundTenantResolver = (input: {
  headers: Record<string, unknown>
  body: unknown
  channel: Channel
}) => TenantId | Promise<TenantId>

export interface AgentRuntimeOptions {
  resolveAgentId: (input: {
    tenantId: TenantId
    channel: Channel
    senderRef: string
  }) => AgentId | null | Promise<AgentId | null>
  approvedKnowledge?: ApprovedKnowledgeForTest
  capabilityGateway?: CapabilityGateway
  actor?: AgentExecutionActor
  resolveCapabilityApproval?: CapabilityApprovalResolver
  completeInboundRuntime?: InboundRuntimeCompletion
}

export interface BuildServerOptions {
  runtimeLogger?: (entry: RuntimeLogEntry) => void
  persistence?:
    | { kind: 'memory' }
    | { kind: 'postgres'; client: PostgresQueryable }
    | { kind: 'postgres-pool'; pool: PostgresPoolLike }
  platform?: ControlPlaneStore
  operatorIdentityResolver?: OperatorIdentityResolver
  webhookVerifier?: WebhookVerifier
  inboundTenantResolver?: InboundTenantResolver
  agentRuntime?: AgentRuntimeOptions
  capabilityApprovalAuthority?: CapabilityApprovalAuthority
  requireAuthenticatedMutations?: boolean
}

export type BuildServerFromEnvOptions = Omit<
  BuildServerOptions,
  'persistence'
> & {
  webhookReplayStore?: WebhookReplayStore
}

export function buildServer(options: BuildServerOptions = {}) {
  if (
    process.env.NODE_ENV !== 'test' &&
    options.persistence?.kind === 'postgres'
  ) {
    throw new Error(
      'Production PostgreSQL requires a tenant-scoped pool and startup preflight'
    )
  }
  const persistence = createPersistence(options.persistence)
  const capabilityApprovalAuthority = createCapabilityApprovalAuthority(
    options.capabilityApprovalAuthority,
    options.persistence
  )
  const configuredAgentRuntime = withDefaultCapabilityGateway(
    options.agentRuntime,
    capabilityApprovalAuthority
  )
  const agentRuntime = withDefaultInboundCompletion(
    configuredAgentRuntime,
    options.persistence
  )
  const platform =
    options.platform ??
    (options.persistence?.kind === 'postgres'
      ? new PostgresControlPlaneRepository(options.persistence.client)
      : options.persistence?.kind === 'postgres-pool'
        ? new TenantScopedPostgresControlPlaneRepository(
            options.persistence.pool
          )
        : new InMemoryControlPlaneStore())
  const app = Object.assign(Fastify({ logger: false }), {
    persistence,
    platform
  })
  const rawBodyByRequest = new WeakMap<object, string>()
  app.removeContentTypeParser('application/json')
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (request, body, done) => {
      const rawBody = typeof body === 'string' ? body : body.toString('utf8')
      rawBodyByRequest.set(request, rawBody)
      try {
        done(null, JSON.parse(rawBody))
      } catch {
        done(new Error('Invalid JSON body'))
      }
    }
  )
  const rateLimiter = new InMemoryRateLimiter()
  app.addHook('onRequest', async (request, reply) => {
    const limit = rateLimiter.check(`ip:${request.ip}`, {
      max: 300,
      windowMs: 60_000
    })
    if (!limit.allowed) {
      const correlationId = createCorrelationId()
      reply.code(429).header('retry-after', String(limit.retryAfterSeconds))
      return reply.send(
        fail(
          'rate_limited',
          'Request rate limit exceeded. Retry later.',
          correlationId
        )
      )
    }
  })
  app.addHook('onSend', async (_request, reply, payload) => {
    reply.header('x-content-type-options', 'nosniff')
    reply.header('x-frame-options', 'DENY')
    reply.header('referrer-policy', 'no-referrer')
    return payload
  })
  const conversations = persistence.conversations
  const tasks = persistence.tasks
  const approvals = persistence.approvals
  const audit = persistence.audit
  const fallbackCapabilityGateway = createControlledCapabilityGateway({
    approvalAuthority: capabilityApprovalAuthority
  })
  const emitRuntimeLog = (entry: RuntimeLogEntry) =>
    options.runtimeLogger?.(entry)
  const requireIdentity = (
    headers: Record<string, unknown>,
    permission: string
  ) =>
    requireOperatorIdentity(
      headers,
      permission,
      options.operatorIdentityResolver
    )
  const requireAnyIdentity = (
    headers: Record<string, unknown>,
    permissions: string[]
  ) =>
    requireAnyOperatorPermission(
      headers,
      permissions,
      options.operatorIdentityResolver
    )
  const requireAuthenticatedMutations =
    process.env.NODE_ENV === 'test'
      ? (options.requireAuthenticatedMutations ?? false)
      : true

  app.get('/health', async () =>
    ok({ status: 'ok', runtime: 'api' }, createCorrelationId())
  )

  app.get('/v1/conversations', async (request, reply) => {
    const correlationId = createCorrelationId()
    try {
      const identity = requireIdentity(
        request.headers,
        'conversation:view_assigned'
      )
      const tenantId = resolveDataPlaneTenant(request.headers, identity)
      const pagination = parsePagination(request.query)
      if (!pagination) {
        throw new DomainError(
          'invalid_pagination',
          'limit must be between 1 and 100 and offset must be zero or greater'
        )
      }

      const page = await conversations.listPage(tenantId, pagination)
      emitRuntimeLog({
        event: 'conversation.list_read',
        correlationId,
        route: '/v1/conversations',
        status: 'ok'
      })
      return ok(page, correlationId)
    } catch (error) {
      const safeError = toSafeError(error)
      reply.code(statusCodeForError(safeError.code))
      emitRuntimeLog({
        event: 'conversation.list_failed',
        correlationId,
        route: '/v1/conversations',
        status: 'error',
        errorCode: safeError.code
      })
      return fail(safeError.code, safeError.message, correlationId)
    }
  })

  app.post(
    '/v1/webhooks/channels/:channel/messages',
    async (request, reply) => {
      const correlationId = createCorrelationId()
      let webhookLease: WebhookVerificationLease | undefined
      try {
        const params = request.params as { channel: string }
        if (options.webhookVerifier) {
          const rawBody =
            rawBodyByRequest.get(request.raw) ?? rawBodyByRequest.get(request)
          const verified = await options.webhookVerifier({
            headers: request.headers,
            body: request.body,
            channel: params.channel,
            ...(rawBody !== undefined ? { rawBody } : {})
          })
          if (isWebhookVerificationLease(verified)) {
            webhookLease = verified
          } else if (!verified) {
            throw new DomainError('unauthorized', 'Webhook verification failed')
          }
        } else if (process.env.NODE_ENV !== 'test') {
          throw new DomainError(
            'unauthorized',
            'A trusted webhook verifier is required in production'
          )
        }
        const body = request.body as Record<string, unknown>
        const channel = parseInboundChannel(params.channel)
        const tenantId = await resolveInboundTenant(
          {
            headers: request.headers,
            body,
            channel
          },
          options.inboundTenantResolver
        )
        const result = await receiveInboundMessage(
          { conversations },
          { ...body, tenantId, channel }
        )
        let runtimeSessionId = result.sessionId
        const shouldRetryRuntime = Boolean(
          !result.accepted && result.runtimeStatus === 'pending' && agentRuntime
        )
        if (shouldRetryRuntime) {
          const timeline = await getConversationTimeline(
            conversations,
            tenantId,
            result.conversationId
          )
          runtimeSessionId = timeline.sessions.at(-1)?.id ?? null
        }
        const runtime =
          (result.accepted || shouldRetryRuntime) && agentRuntime
            ? await executeInboundRuntime({
                options: agentRuntime,
                platform,
                tenantId,
                correlationId: result.correlationId ?? correlationId,
                channel,
                senderRef: String(body.senderRef ?? ''),
                message: String(body.body ?? ''),
                conversationId: result.conversationId,
                sessionId: runtimeSessionId,
                messageId: result.messageId,
                audit,
                conversations
              })
            : undefined
        if (
          !(
            (result.accepted || shouldRetryRuntime) &&
            runtime?.status === 'completed' &&
            agentRuntime?.completeInboundRuntime
          )
        ) {
          await audit.append(
            {
              type: 'integration_event',
              actorType: 'System',
              actorId: 'api',
              correlationId: result.correlationId ?? correlationId,
              policyVersion: 'api-runtime-v1',
              payload: {
                sessionId: result.sessionId,
                conversationId: result.conversationId,
                accepted: result.accepted,
                tenantId,
                ...(runtime
                  ? {
                      runtimeStatus: runtime.status,
                      traceId: runtime.trace?.traceId ?? null,
                      externalCall:
                        runtime.trace?.provider.externalCall ?? false
                    }
                  : {})
              }
            },
            tenantId
          )
        }
        if (webhookLease) {
          await webhookLease.commit()
          webhookLease = undefined
        }
        emitRuntimeLog({
          event: result.accepted ? 'inbound.accepted' : 'inbound.duplicate',
          correlationId: result.correlationId ?? correlationId,
          route: '/v1/webhooks/channels/:channel/messages',
          status: 'ok',
          sessionId: result.sessionId,
          conversationId: result.conversationId,
          resourceId: result.messageId
        })
        return ok(
          runtime ? { ...result, runtime } : result,
          result.correlationId ?? correlationId
        )
      } catch (error) {
        if (webhookLease) {
          await Promise.resolve(webhookLease.release()).catch(() => undefined)
        }
        const safeError = toSafeError(error)
        reply.code(statusCodeForError(safeError.code))
        emitRuntimeLog({
          event: 'inbound.failed',
          correlationId,
          route: '/v1/webhooks/channels/:channel/messages',
          status: 'error',
          errorCode: safeError.code
        })
        return fail(safeError.code, safeError.message, correlationId)
      }
    }
  )

  app.post('/v1/sessions/:sessionId/takeover', async (request, reply) => {
    const correlationId = createCorrelationId()
    try {
      const identity = requireIdentity(request.headers, 'conversation:assume')
      const tenantId = resolveDataPlaneTenant(request.headers, identity)
      const params = request.params as { sessionId: string }
      const body = TakeoverRequestSchema.parse(request.body)
      const session = await conversations.transitionTakeover(
        tenantId,
        params.sessionId,
        body.event
      )
      if (!session) {
        throw new DomainError('invalid_action', 'Session not found')
      }
      await audit.append(
        {
          type: 'handoff',
          actorType: identity.role,
          actorId: identity.operatorId,
          correlationId,
          policyVersion: 'human-takeover-v1',
          payload: {
            tenantId,
            sessionId: session.id,
            event: body.event,
            state: session.takeoverState,
            effect: 'human_takeover_state_only'
          }
        },
        tenantId
      )
      return ok(session, correlationId)
    } catch (error) {
      const safeError = toSafeError(error)
      reply.code(statusCodeForError(safeError.code))
      return fail(safeError.code, safeError.message, correlationId)
    }
  })

  app.get(
    '/v1/conversations/:conversationId/timeline',
    async (request, reply) => {
      const correlationId = createCorrelationId()
      try {
        const identity = requireIdentity(
          request.headers,
          'conversation:view_assigned'
        )
        const tenantId = resolveDataPlaneTenant(request.headers, identity)
        const params = request.params as { conversationId: string }
        const timeline = await getConversationTimeline(
          conversations,
          tenantId,
          params.conversationId
        )
        if (timeline.messages.length === 0 && timeline.sessions.length === 0) {
          throw new DomainError('invalid_action', 'Conversation not found')
        }
        return ok(timeline, correlationId)
      } catch (error) {
        const safeError = toSafeError(error)
        reply.code(statusCodeForError(safeError.code))
        return fail(safeError.code, safeError.message, correlationId)
      }
    }
  )

  app.post('/v1/tasks', async (request, reply) => {
    const correlationId = createCorrelationId()
    try {
      const identity = requireAuthenticatedMutations
        ? requireIdentity(request.headers, 'task:update')
        : null
      const tenantId = identity
        ? resolveDataPlaneTenant(request.headers, identity)
        : resolveOptionalRequestTenant(request.headers)
      const task = await createInternalTask({ tasks }, request.body, tenantId)
      await audit.append(
        {
          type: 'integration_event',
          actorType: 'System',
          actorId: 'api',
          correlationId,
          policyVersion: 'api-runtime-v1',
          payload: {
            sessionId: task.sessionId,
            taskId: task.id,
            source: task.source,
            tenantId
          }
        },
        tenantId
      )
      emitRuntimeLog({
        event: 'task.created',
        correlationId,
        route: '/v1/tasks',
        status: 'ok',
        sessionId: task.sessionId,
        resourceId: task.id
      })
      return ok(task, correlationId)
    } catch (error) {
      const safeError = toSafeError(error)
      reply.code(statusCodeForError(safeError.code))
      emitRuntimeLog({
        event: 'task.failed',
        correlationId,
        route: '/v1/tasks',
        status: 'error',
        errorCode: safeError.code
      })
      return fail(safeError.code, safeError.message, correlationId)
    }
  })

  app.get('/v1/tasks', async (request, reply) => {
    const correlationId = createCorrelationId()
    try {
      const identity = requireIdentity(request.headers, 'task:view')
      const tenantId = resolveDataPlaneTenant(request.headers, identity)
      return ok(await tasks.list(tenantId), correlationId)
    } catch (error) {
      const safeError = toSafeError(error)
      reply.code(statusCodeForError(safeError.code))
      return fail(safeError.code, safeError.message, correlationId)
    }
  })

  app.patch('/v1/tasks/:taskId/status', async (request, reply) => {
    const correlationId = createCorrelationId()
    try {
      const params = request.params as { taskId: string }
      const body = request.body as { status?: unknown }
      const identity = requireIdentity(request.headers, 'task:update')
      const tenantId = resolveDataPlaneTenant(request.headers, identity)
      const status = TaskStatusSchema.safeParse(body.status)
      if (!status.success) {
        throw new DomainError('validation_failed', 'Task status is required')
      }
      const existing = await tasks.findById(params.taskId, tenantId)
      if (!existing) {
        throw new DomainError('invalid_action', 'Task not found')
      }
      assertTaskTransition(existing.status, status.data)
      const updated = await tasks.updateStatus(
        params.taskId,
        status.data,
        tenantId
      )
      if (!updated) {
        throw new DomainError('invalid_action', 'Task not found')
      }
      await audit.append(
        {
          type: 'integration_event',
          actorType: identity.role,
          actorId: identity.operatorId,
          correlationId,
          policyVersion: 'api-runtime-v1',
          payload: {
            sessionId: updated.sessionId,
            taskId: updated.id,
            fromStatus: existing.status,
            toStatus: updated.status,
            effect: 'internal_task_state_only',
            tenantId
          }
        },
        tenantId
      )
      emitRuntimeLog({
        event: 'task.status_changed',
        correlationId,
        route: '/v1/tasks/:taskId/status',
        status: 'ok',
        sessionId: updated.sessionId,
        resourceId: updated.id
      })
      return ok(updated, correlationId)
    } catch (error) {
      const safeError = toSafeError(error)
      reply.code(statusCodeForError(safeError.code))
      emitRuntimeLog({
        event: 'task.status_failed',
        correlationId,
        route: '/v1/tasks/:taskId/status',
        status: 'error',
        errorCode: safeError.code
      })
      return fail(safeError.code, safeError.message, correlationId)
    }
  })

  app.post('/v1/approvals', async (request, reply) => {
    const correlationId = createCorrelationId()
    try {
      const identity = requireAuthenticatedMutations
        ? requireIdentity(request.headers, 'approval:view')
        : null
      const tenantId = identity
        ? resolveDataPlaneTenant(request.headers, identity)
        : resolveOptionalRequestTenant(request.headers)
      const requestedApproval = requestHumanApproval(request.body)
      const requester =
        requestedApproval.proposedAction === 'audit_evidence_export_review'
          ? requireIdentity(request.headers, 'audit:view_full')
          : null
      const approval = await approvals.save(requestedApproval, tenantId)
      await audit.append(
        {
          type: 'approval_decision',
          actorType: requester?.role ?? 'System',
          actorId: requester?.operatorId ?? 'api',
          correlationId,
          policyVersion: 'api-runtime-v1',
          payload: {
            sessionId: approval.sessionId,
            approvalRequestId: approval.id,
            status: approval.status,
            tenantId
          }
        },
        tenantId
      )
      emitRuntimeLog({
        event: 'approval.created',
        correlationId,
        route: '/v1/approvals',
        status: 'ok',
        sessionId: approval.sessionId,
        resourceId: approval.id
      })
      return ok(approval, correlationId)
    } catch (error) {
      const safeError = toSafeError(error)
      reply.code(statusCodeForError(safeError.code))
      emitRuntimeLog({
        event: 'approval.create_failed',
        correlationId,
        route: '/v1/approvals',
        status: 'error',
        errorCode: safeError.code
      })
      return fail(safeError.code, safeError.message, correlationId)
    }
  })

  app.post(
    '/v1/approvals/:approvalRequestId/decision',
    async (request, reply) => {
      const correlationId = createCorrelationId()
      try {
        const params = request.params as { approvalRequestId: string }
        const identity = requireIdentity(request.headers, 'approval:decide')
        const tenantId = resolveDataPlaneTenant(request.headers, identity)
        const existing = await approvals.findById(
          params.approvalRequestId,
          tenantId
        )
        if (!existing) {
          throw new DomainError('invalid_action', 'Approval request not found')
        }
        const decided = await approvals.save(
          resolveApproval(existing, identity.role, {
            ...(request.body as Record<string, unknown>),
            approvalRequestId: params.approvalRequestId,
            operatorId: identity.operatorId
          }),
          tenantId
        )
        const auditType =
          decided.status === 'assumed' ? 'handoff' : 'approval_decision'
        const event =
          decided.status === 'assumed'
            ? 'approval.handoff_assumed'
            : 'approval.decided'
        await audit.append(
          {
            type: auditType,
            actorType: identity.role,
            actorId: identity.operatorId,
            correlationId,
            policyVersion: 'api-runtime-v1',
            payload: {
              sessionId: decided.sessionId,
              approvalRequestId: decided.id,
              status: decided.status,
              tenantId,
              effect:
                decided.status === 'assumed'
                  ? 'handoff_only'
                  : 'approval_state_only'
            }
          },
          tenantId
        )
        emitRuntimeLog({
          event,
          correlationId,
          route: '/v1/approvals/:approvalRequestId/decision',
          status: 'ok',
          sessionId: decided.sessionId,
          resourceId: decided.id
        })
        return ok(decided, correlationId)
      } catch (error) {
        const safeError = toSafeError(error)
        reply.code(statusCodeForError(safeError.code))
        emitRuntimeLog({
          event: 'approval.decision_failed',
          correlationId,
          route: '/v1/approvals/:approvalRequestId/decision',
          status: 'error',
          errorCode: safeError.code
        })
        return fail(safeError.code, safeError.message, correlationId)
      }
    }
  )

  app.get('/v1/approvals', async (request, reply) => {
    const correlationId = createCorrelationId()
    try {
      const identity = requireIdentity(request.headers, 'approval:view')
      const tenantId = resolveDataPlaneTenant(request.headers, identity)
      return ok(await approvals.list(tenantId), correlationId)
    } catch (error) {
      const safeError = toSafeError(error)
      reply.code(statusCodeForError(safeError.code))
      return fail(safeError.code, safeError.message, correlationId)
    }
  })

  app.post('/v1/admin/capability-approvals', async (request, reply) => {
    const correlationId = createCorrelationId()
    try {
      const scope = requirePlatformScope(
        request.headers,
        'approval:decide',
        options.operatorIdentityResolver
      )
      const identity = resolveOperatorIdentity(
        request.headers,
        options.operatorIdentityResolver
      )
      const body = CapabilityApprovalIssueRequestSchema.parse(request.body)
      const version = await platform.getVersion(scope, body.versionId)
      if (
        !version ||
        version.agentId !== body.agentId ||
        !['APPROVED', 'PUBLISHED'].includes(version.status)
      ) {
        throw new DomainError(
          'invalid_action',
          'Only an approved agent version can receive a capability approval'
        )
      }
      if (body.actorId === identity.operatorId) {
        throw new DomainError(
          'forbidden',
          'Capability approvals require a separate executor'
        )
      }
      const approval = await capabilityApprovalAuthority.issue({
        tenantId: scope.tenantId,
        agentId: body.agentId,
        versionId: body.versionId,
        toolName: body.toolName,
        input: { message: redactSensitiveText(body.input.message) },
        actorId: body.actorId,
        issuer: identity.operatorId,
        expiresAt: body.expiresAt,
        ...(body.nonce ? { nonce: body.nonce } : {})
      })
      await appendPlatformAudit(
        audit,
        identity,
        correlationId,
        scope.tenantId,
        {
          event: 'capability_approval_issued',
          tenantId: scope.tenantId,
          approvalId: approval.id,
          agentId: approval.agentId,
          versionId: approval.versionId,
          toolName: approval.toolName,
          actorId: approval.actorId,
          expiresAt: approval.expiresAt.toISOString()
        }
      )
      return ok(approval, correlationId)
    } catch (error) {
      const safeError = toSafeError(error)
      reply.code(statusCodeForError(safeError.code))
      return fail(safeError.code, safeError.message, correlationId)
    }
  })

  app.get(
    '/v1/admin/capability-approvals/:approvalId',
    async (request, reply) => {
      const correlationId = createCorrelationId()
      try {
        const scope = requirePlatformScope(
          request.headers,
          'approval:view',
          options.operatorIdentityResolver
        )
        const params = CapabilityApprovalParamsSchema.parse(request.params)
        const approval = await capabilityApprovalAuthority.get(
          params.approvalId,
          scope.tenantId
        )
        if (!approval) {
          throw new DomainError(
            'invalid_action',
            'Capability approval not found'
          )
        }
        return ok(approval, correlationId)
      } catch (error) {
        const safeError = toSafeError(error)
        reply.code(statusCodeForError(safeError.code))
        return fail(safeError.code, safeError.message, correlationId)
      }
    }
  )

  app.post(
    '/v1/admin/capability-approvals/:approvalId/revoke',
    async (request, reply) => {
      const correlationId = createCorrelationId()
      try {
        const scope = requirePlatformScope(
          request.headers,
          'approval:decide',
          options.operatorIdentityResolver
        )
        const identity = resolveOperatorIdentity(
          request.headers,
          options.operatorIdentityResolver
        )
        const params = CapabilityApprovalParamsSchema.parse(request.params)
        const revoked = await capabilityApprovalAuthority.revoke(
          params.approvalId,
          identity.operatorId,
          scope.tenantId
        )
        if (!revoked) {
          throw new DomainError(
            'invalid_action',
            'Capability approval cannot be revoked by this issuer'
          )
        }
        await appendPlatformAudit(
          audit,
          identity,
          correlationId,
          scope.tenantId,
          {
            event: 'capability_approval_revoked',
            tenantId: scope.tenantId,
            approvalId: params.approvalId
          }
        )
        return ok(
          { revoked: true, approvalId: params.approvalId },
          correlationId
        )
      } catch (error) {
        const safeError = toSafeError(error)
        reply.code(statusCodeForError(safeError.code))
        return fail(safeError.code, safeError.message, correlationId)
      }
    }
  )

  app.post(
    '/v1/admin/capability-approvals/:approvalId/execute',
    async (request, reply) => {
      const correlationId = createCorrelationId()
      try {
        const scope = requirePlatformScope(
          request.headers,
          'approval:execute',
          options.operatorIdentityResolver
        )
        const identity = resolveOperatorIdentity(
          request.headers,
          options.operatorIdentityResolver
        )
        const params = CapabilityApprovalParamsSchema.parse(request.params)
        const body = CapabilityApprovalExecutionRequestSchema.parse(
          request.body
        )
        const record = await capabilityApprovalAuthority.get(
          params.approvalId,
          scope.tenantId
        )
        if (!record || record.status !== 'issued') {
          throw new DomainError(
            'invalid_action',
            'Capability approval is not available for execution'
          )
        }
        if (record.actorId !== identity.operatorId) {
          throw new DomainError(
            'forbidden',
            'Capability approval is bound to another operator'
          )
        }
        const version = await platform.getVersion(scope, record.versionId)
        if (
          !version ||
          version.agentId !== record.agentId ||
          !['APPROVED', 'PUBLISHED'].includes(version.status)
        ) {
          throw new DomainError(
            'invalid_action',
            'Approved agent version is no longer executable'
          )
        }
        if (record.toolName !== CONTROLLED_SCHEDULING_TOOL) {
          throw new DomainError(
            'invalid_action',
            'This controlled runtime only executes the scheduling read tool'
          )
        }
        const actor: AgentExecutionActor = {
          id: identity.operatorId,
          role: identity.role,
          permissions: ['scheduling:read']
        }
        const trace = await executeConfiguredAgent({
          store: platform,
          tenantId: scope.tenantId,
          agentId: record.agentId,
          versionId: record.versionId,
          message: body.message,
          history: body.history,
          executionMode: 'CONTROLLED_RUNTIME',
          capabilityGateway:
            agentRuntime?.capabilityGateway ?? fallbackCapabilityGateway,
          actor,
          capabilityApproval: capabilityApprovalReference(record),
          requireCapabilityApproval: true,
          onToolAudit: async (event) => {
            await audit.append(
              {
                type: event.type,
                actorType: 'System',
                actorId: 'capability-approval-runtime',
                correlationId: event.correlationId,
                policyVersion: 'plugin-gateway-v1',
                payload: {
                  tenantId: event.tenantId,
                  agentId: event.agentId,
                  versionId: event.versionId,
                  plugin: event.plugin,
                  toolName: event.toolName,
                  status: event.status,
                  payload: event.payload
                }
              },
              event.tenantId
            )
          },
          ...(body.approvedKnowledge
            ? { approvedKnowledge: body.approvedKnowledge }
            : {})
        })
        const capabilityResult = trace.tools.find(
          (tool) => tool.name === record.toolName
        )
        if (capabilityResult?.status !== 'succeeded') {
          throw new DomainError(
            'invalid_action',
            'Capability approval was not consumed by the controlled tool'
          )
        }
        await appendPlatformAudit(
          audit,
          identity,
          correlationId,
          scope.tenantId,
          {
            event: 'capability_approval_executed',
            tenantId: scope.tenantId,
            approvalId: record.id,
            traceId: trace.traceId,
            toolName: record.toolName,
            externalCall: trace.provider.externalCall
          }
        )
        return ok(trace, correlationId)
      } catch (error) {
        const safeError = toSafeError(error)
        reply.code(statusCodeForError(safeError.code))
        return fail(safeError.code, safeError.message, correlationId)
      }
    }
  )

  app.get('/v1/audit/sessions/:sessionId', async (request, reply) => {
    const correlationId = createCorrelationId()
    try {
      const identity = requireAnyIdentity(request.headers, [
        'audit:view_full',
        'audit:view_limited'
      ])
      const tenantId = resolveDataPlaneTenant(request.headers, identity)
      const params = request.params as { sessionId: string }
      const events = await audit.listBySession(params.sessionId, tenantId)
      if (events.length === 0) {
        throw new DomainError('invalid_action', 'Audit session not found')
      }
      emitRuntimeLog({
        event: 'audit.session_read',
        correlationId,
        route: '/v1/audit/sessions/:sessionId',
        status: 'ok',
        sessionId: params.sessionId
      })
      return ok({ events }, correlationId)
    } catch (error) {
      const safeError = toSafeError(error)
      reply.code(statusCodeForError(safeError.code))
      return fail(safeError.code, safeError.message, correlationId)
    }
  })

  app.get('/v1/observability/audit-evidence', async (request, reply) => {
    const correlationId = createCorrelationId()
    try {
      const identity = requireIdentity(request.headers, 'audit:view_full')
      const tenantId = resolveDataPlaneTenant(request.headers, identity)
      const evidenceQuery = parseAuditEvidenceQuery(request.query)
      const [summary, page] = await Promise.all([
        audit.summarizeEvidence(evidenceQuery.filters, tenantId),
        audit.listEvidence(evidenceQuery.query, tenantId)
      ])
      emitRuntimeLog({
        event: 'observability.audit_evidence_exported',
        correlationId,
        route: '/v1/observability/audit-evidence',
        status: 'ok',
        sessionId: evidenceQuery.filters.sessionId ?? null,
        resourceId: identity.operatorId
      })
      return ok(
        {
          summary,
          ...sanitizeAuditEvidencePage(page),
          export: {
            format: 'json',
            controlled: true,
            externalDispatch: false,
            requestedBy: identity.operatorId
          }
        },
        correlationId
      )
    } catch (error) {
      const safeError = toSafeError(error)
      reply.code(statusCodeForError(safeError.code))
      emitRuntimeLog({
        event: 'observability.audit_evidence_failed',
        correlationId,
        route: '/v1/observability/audit-evidence',
        status: 'error',
        errorCode: safeError.code
      })
      return fail(safeError.code, safeError.message, correlationId)
    }
  })

  app.post('/v1/admin/plugins/catalog', async (request, reply) => {
    const correlationId = createCorrelationId()
    try {
      const scope = requirePlatformScope(
        request.headers,
        'agent:configure',
        options.operatorIdentityResolver
      )
      const identity = resolveOperatorIdentity(
        request.headers,
        options.operatorIdentityResolver
      )
      const entry = await platform.createPluginCatalogEntry(
        scope,
        PluginCatalogCreateInputSchema.parse(request.body),
        identity.operatorId
      )
      await appendPlatformAudit(
        audit,
        identity,
        correlationId,
        scope.tenantId,
        {
          event: 'plugin_catalog_created',
          tenantId: scope.tenantId,
          pluginCatalogId: entry.id,
          pluginName: entry.manifest.name,
          pluginVersion: entry.manifest.version,
          status: entry.status
        }
      )
      return ok(entry, correlationId)
    } catch (error) {
      const safeError = toSafeError(error)
      reply.code(statusCodeForError(safeError.code))
      return fail(safeError.code, safeError.message, correlationId)
    }
  })

  app.get('/v1/admin/plugins/catalog', async (request, reply) => {
    const correlationId = createCorrelationId()
    try {
      const scope = requirePlatformScope(
        request.headers,
        'agent:configure',
        options.operatorIdentityResolver
      )
      const query = z
        .object({
          name: z
            .string()
            .trim()
            .min(1)
            .max(120)
            .regex(/^[A-Za-z0-9._:-]+$/)
            .optional()
        })
        .strict()
        .parse(request.query)
      return ok(
        await platform.listPluginCatalogEntries(scope, query.name),
        correlationId
      )
    } catch (error) {
      const safeError = toSafeError(error)
      reply.code(statusCodeForError(safeError.code))
      return fail(safeError.code, safeError.message, correlationId)
    }
  })

  app.get('/v1/admin/plugins/catalog/:pluginId', async (request, reply) => {
    const correlationId = createCorrelationId()
    try {
      const scope = requirePlatformScope(
        request.headers,
        'agent:configure',
        options.operatorIdentityResolver
      )
      const params = z
        .object({ pluginId: PluginCatalogIdSchema })
        .strict()
        .parse(request.params)
      const entry = await platform.getPluginCatalogEntry(scope, params.pluginId)
      if (!entry) {
        throw new DomainError(
          'invalid_action',
          'Plugin catalog entry not found'
        )
      }
      return ok(entry, correlationId)
    } catch (error) {
      const safeError = toSafeError(error)
      reply.code(statusCodeForError(safeError.code))
      return fail(safeError.code, safeError.message, correlationId)
    }
  })

  app.post(
    '/v1/admin/plugins/catalog/:pluginId/transition',
    async (request, reply) => {
      const correlationId = createCorrelationId()
      try {
        const scope = requirePlatformScope(
          request.headers,
          'agent:configure',
          options.operatorIdentityResolver
        )
        const identity = resolveOperatorIdentity(
          request.headers,
          options.operatorIdentityResolver
        )
        const params = z
          .object({ pluginId: PluginCatalogIdSchema })
          .strict()
          .parse(request.params)
        const body = PluginCatalogTransitionInputSchema.parse(request.body)
        const entry = await platform.transitionPluginCatalogEntry(
          scope,
          params.pluginId,
          body.target,
          identity.operatorId,
          body.expectedStatus
        )
        await appendPlatformAudit(
          audit,
          identity,
          correlationId,
          scope.tenantId,
          {
            event: 'plugin_catalog_transitioned',
            tenantId: scope.tenantId,
            pluginCatalogId: entry.id,
            pluginName: entry.manifest.name,
            pluginVersion: entry.manifest.version,
            status: entry.status
          }
        )
        return ok(entry, correlationId)
      } catch (error) {
        const safeError = toSafeError(error)
        reply.code(statusCodeForError(safeError.code))
        return fail(safeError.code, safeError.message, correlationId)
      }
    }
  )

  app.post('/v1/admin/agents', async (request, reply) => {
    const correlationId = createCorrelationId()
    try {
      const scope = requirePlatformScope(
        request.headers,
        'agent:configure',
        options.operatorIdentityResolver
      )
      const identity = resolveOperatorIdentity(
        request.headers,
        options.operatorIdentityResolver
      )
      const agent = await platform.createAgent(
        { tenantId: scope.tenantId },
        request.body as { slug: string; name: string; description: string }
      )
      await appendPlatformAudit(
        audit,
        identity,
        correlationId,
        scope.tenantId,
        {
          event: 'agent_created',
          tenantId: scope.tenantId,
          agentId: agent.id
        }
      )
      emitRuntimeLog({
        event: 'platform.agent_created',
        correlationId,
        route: '/v1/admin/agents',
        status: 'ok',
        resourceId: agent.id
      })
      return ok(agent, correlationId)
    } catch (error) {
      const safeError = toSafeError(error)
      reply.code(statusCodeForError(safeError.code))
      return fail(safeError.code, safeError.message, correlationId)
    }
  })

  app.get('/v1/admin/agents', async (request, reply) => {
    const correlationId = createCorrelationId()
    try {
      const scope = requirePlatformScope(
        request.headers,
        'agent:view',
        options.operatorIdentityResolver
      )
      return ok(await platform.listAgents(scope), correlationId)
    } catch (error) {
      const safeError = toSafeError(error)
      reply.code(statusCodeForError(safeError.code))
      return fail(safeError.code, safeError.message, correlationId)
    }
  })

  app.post('/v1/admin/agents/:agentId/versions', async (request, reply) => {
    const correlationId = createCorrelationId()
    try {
      const scope = requirePlatformScope(
        request.headers,
        'agent:configure',
        options.operatorIdentityResolver
      )
      const identity = resolveOperatorIdentity(
        request.headers,
        options.operatorIdentityResolver
      )
      const params = request.params as { agentId: string }
      const agentId = AgentIdSchema.parse(params.agentId)
      const body = request.body as { config?: unknown }
      const version = await platform.createVersion(
        scope,
        agentId,
        AgentConfigSchema.parse(body.config),
        identity.operatorId
      )
      await appendPlatformAudit(
        audit,
        identity,
        correlationId,
        scope.tenantId,
        {
          event: 'version_created',
          tenantId: scope.tenantId,
          agentId,
          versionId: version.id,
          version: version.version
        }
      )
      return ok(version, correlationId)
    } catch (error) {
      const safeError = toSafeError(error)
      reply.code(statusCodeForError(safeError.code))
      return fail(safeError.code, safeError.message, correlationId)
    }
  })

  app.post(
    '/v1/admin/agents/:agentId/versions/:versionId/clone',
    async (request, reply) => {
      const correlationId = createCorrelationId()
      try {
        const scope = requirePlatformScope(
          request.headers,
          'agent:configure',
          options.operatorIdentityResolver
        )
        const identity = resolveOperatorIdentity(
          request.headers,
          options.operatorIdentityResolver
        )
        const params = request.params as {
          agentId: string
          versionId: string
        }
        const agentId = AgentIdSchema.parse(params.agentId)
        const versionId = AgentVersionIdSchema.parse(params.versionId)
        const source = await platform.getVersion(scope, versionId)
        if (!source || source.agentId !== agentId) {
          throw new DomainError('invalid_action', 'Agent version not found')
        }
        const body = VersionCloneRequestSchema.parse(request.body)
        const version = await platform.createVersion(
          scope,
          agentId,
          body.config ?? source.config,
          identity.operatorId
        )
        await appendPlatformAudit(
          audit,
          identity,
          correlationId,
          scope.tenantId,
          {
            event: 'version_cloned',
            tenantId: scope.tenantId,
            agentId,
            sourceVersionId: source.id,
            versionId: version.id,
            version: version.version
          }
        )
        return ok(version, correlationId)
      } catch (error) {
        const safeError = toSafeError(error)
        reply.code(statusCodeForError(safeError.code))
        return fail(safeError.code, safeError.message, correlationId)
      }
    }
  )

  app.get('/v1/admin/agents/:agentId/versions', async (request, reply) => {
    const correlationId = createCorrelationId()
    try {
      const scope = requirePlatformScope(
        request.headers,
        'agent:view',
        options.operatorIdentityResolver
      )
      const params = request.params as { agentId: string }
      const agentId = AgentIdSchema.parse(params.agentId)
      return ok(await platform.listVersions(scope, agentId), correlationId)
    } catch (error) {
      const safeError = toSafeError(error)
      reply.code(statusCodeForError(safeError.code))
      return fail(safeError.code, safeError.message, correlationId)
    }
  })

  app.post(
    '/v1/admin/agents/:agentId/versions/:versionId/transition',
    async (request, reply) => {
      const correlationId = createCorrelationId()
      try {
        const scope = requirePlatformScope(
          request.headers,
          'agent:configure',
          options.operatorIdentityResolver
        )
        const params = request.params as {
          agentId: string
          versionId: string
        }
        const agentId = AgentIdSchema.parse(params.agentId)
        const versionId = AgentVersionIdSchema.parse(params.versionId)
        const body = z
          .object({
            target: AgentVersionStatusSchema,
            expectedStatus: AgentVersionStatusSchema.optional()
          })
          .strict()
          .parse(request.body)
        const version = await platform.getVersion(scope, versionId)
        if (!version || version.agentId !== agentId) {
          throw new DomainError('invalid_action', 'Agent version not found')
        }
        const identity = resolveOperatorIdentity(
          request.headers,
          options.operatorIdentityResolver
        )
        const updated = await platform.transitionVersion(
          scope,
          versionId,
          body.target,
          body.expectedStatus
        )
        await appendPlatformAudit(
          audit,
          identity,
          correlationId,
          scope.tenantId,
          {
            event: 'version_transitioned',
            tenantId: scope.tenantId,
            agentId,
            versionId,
            target: updated.status
          }
        )
        return ok(updated, correlationId)
      } catch (error) {
        const safeError = toSafeError(error)
        reply.code(statusCodeForError(safeError.code))
        return fail(safeError.code, safeError.message, correlationId)
      }
    }
  )

  app.post(
    '/v1/admin/agents/:agentId/versions/:versionId/publish',
    async (request, reply) => {
      const correlationId = createCorrelationId()
      try {
        const scope = requirePlatformScope(
          request.headers,
          'agent:configure',
          options.operatorIdentityResolver
        )
        const params = request.params as {
          agentId: string
          versionId: string
        }
        const agentId = AgentIdSchema.parse(params.agentId)
        const versionId = AgentVersionIdSchema.parse(params.versionId)
        const version = await platform.getVersion(scope, versionId)
        if (!version || version.agentId !== agentId) {
          throw new DomainError('invalid_action', 'Agent version not found')
        }
        const identity = resolveOperatorIdentity(
          request.headers,
          options.operatorIdentityResolver
        )
        const body = z
          .object({ expectedStatus: AgentVersionStatusSchema.optional() })
          .strict()
          .parse(request.body ?? {})
        const published = await platform.publishVersion(
          scope,
          versionId,
          body.expectedStatus
        )
        await appendPlatformAudit(
          audit,
          identity,
          correlationId,
          scope.tenantId,
          {
            event: 'version_published',
            tenantId: scope.tenantId,
            agentId,
            versionId: published.id,
            version: published.version
          }
        )
        return ok(published, correlationId)
      } catch (error) {
        const safeError = toSafeError(error)
        reply.code(statusCodeForError(safeError.code))
        return fail(safeError.code, safeError.message, correlationId)
      }
    }
  )

  app.post('/v1/admin/agents/:agentId/rollback', async (request, reply) => {
    const correlationId = createCorrelationId()
    try {
      const scope = requirePlatformScope(
        request.headers,
        'agent:configure',
        options.operatorIdentityResolver
      )
      const identity = resolveOperatorIdentity(
        request.headers,
        options.operatorIdentityResolver
      )
      const params = request.params as { agentId: string }
      const agentId = AgentIdSchema.parse(params.agentId)
      const body = z
        .object({
          versionId: AgentVersionIdSchema,
          expectedStatus: AgentVersionStatusSchema.optional()
        })
        .strict()
        .parse(request.body)
      const versionId = body.versionId
      const version = await platform.rollback(
        scope,
        agentId,
        versionId,
        identity.operatorId,
        body.expectedStatus
      )
      await appendPlatformAudit(
        audit,
        identity,
        correlationId,
        scope.tenantId,
        {
          event: 'version_rollback',
          tenantId: scope.tenantId,
          agentId,
          sourceVersionId: versionId,
          publishedVersionId: version.id,
          version: version.version
        }
      )
      return ok(version, correlationId)
    } catch (error) {
      const safeError = toSafeError(error)
      reply.code(statusCodeForError(safeError.code))
      return fail(safeError.code, safeError.message, correlationId)
    }
  })

  app.post('/v1/admin/test-lab/runs', async (request, reply) => {
    const correlationId = createCorrelationId()
    try {
      const scope = requirePlatformScope(
        request.headers,
        'test:run',
        options.operatorIdentityResolver
      )
      const body = TestLabRequestSchema.parse(request.body)
      const trace = await runTestLab({
        store: platform,
        tenantId: scope.tenantId,
        agentId: body.agentId,
        versionId: body.versionId,
        message: body.message,
        history: body.history,
        ...(body.approvedKnowledge
          ? { approvedKnowledge: body.approvedKnowledge }
          : {})
      })
      const identity = resolveOperatorIdentity(
        request.headers,
        options.operatorIdentityResolver
      )
      await appendPlatformAudit(
        audit,
        identity,
        correlationId,
        scope.tenantId,
        {
          event: 'test_lab_completed',
          tenantId: scope.tenantId,
          agentId: trace.agentId,
          versionId: trace.versionId,
          traceId: trace.traceId,
          externalCall: trace.provider.externalCall
        }
      )
      emitRuntimeLog({
        event: 'platform.test_lab_completed',
        correlationId,
        route: '/v1/admin/test-lab/runs',
        status: 'ok',
        resourceId: trace.traceId
      })
      return ok(trace, correlationId)
    } catch (error) {
      const safeError = toSafeError(error)
      reply.code(statusCodeForError(safeError.code))
      return fail(safeError.code, safeError.message, correlationId)
    }
  })

  app.post('/v1/admin/test-lab/suites', async (request, reply) => {
    const correlationId = createCorrelationId()
    try {
      const scope = requirePlatformScope(
        request.headers,
        'agent:configure',
        options.operatorIdentityResolver
      )
      const identity = resolveOperatorIdentity(
        request.headers,
        options.operatorIdentityResolver
      )
      const suite = await platform.createTestSuite(
        scope,
        TestSuiteCreateInputSchema.parse(request.body),
        identity.operatorId
      )
      await appendPlatformAudit(
        audit,
        identity,
        correlationId,
        scope.tenantId,
        {
          event: 'test_suite_created',
          tenantId: scope.tenantId,
          suiteId: suite.id,
          agentId: suite.agentId,
          versionId: suite.versionId,
          version: suite.version
        }
      )
      return ok(suite, correlationId)
    } catch (error) {
      const safeError = toSafeError(error)
      reply.code(statusCodeForError(safeError.code))
      return fail(safeError.code, safeError.message, correlationId)
    }
  })

  app.get('/v1/admin/test-lab/suites', async (request, reply) => {
    const correlationId = createCorrelationId()
    try {
      const scope = requirePlatformScope(
        request.headers,
        'test:run',
        options.operatorIdentityResolver
      )
      const query = z
        .object({ agentId: AgentIdSchema.optional() })
        .strict()
        .parse(request.query)
      return ok(
        await platform.listTestSuites(scope, query.agentId),
        correlationId
      )
    } catch (error) {
      const safeError = toSafeError(error)
      reply.code(statusCodeForError(safeError.code))
      return fail(safeError.code, safeError.message, correlationId)
    }
  })

  app.post(
    '/v1/admin/test-lab/suites/:suiteId/clone',
    async (request, reply) => {
      const correlationId = createCorrelationId()
      try {
        const scope = requirePlatformScope(
          request.headers,
          'agent:configure',
          options.operatorIdentityResolver
        )
        const identity = resolveOperatorIdentity(
          request.headers,
          options.operatorIdentityResolver
        )
        const params = z
          .object({ suiteId: TestSuiteIdSchema })
          .strict()
          .parse(request.params)
        return ok(
          await platform.cloneTestSuite(
            scope,
            params.suiteId,
            TestSuiteCloneInputSchema.parse(request.body),
            identity.operatorId
          ),
          correlationId
        )
      } catch (error) {
        const safeError = toSafeError(error)
        reply.code(statusCodeForError(safeError.code))
        return fail(safeError.code, safeError.message, correlationId)
      }
    }
  )

  app.post(
    '/v1/admin/test-lab/suites/:suiteId/evaluate',
    async (request, reply) => {
      const correlationId = createCorrelationId()
      try {
        const scope = requirePlatformScope(
          request.headers,
          'test:run',
          options.operatorIdentityResolver
        )
        const identity = resolveOperatorIdentity(
          request.headers,
          options.operatorIdentityResolver
        )
        const params = z
          .object({ suiteId: TestSuiteIdSchema })
          .strict()
          .parse(request.params)
        const body = z
          .object({ versionId: AgentVersionIdSchema.optional() })
          .strict()
          .parse(request.body)
        const suite = await platform.getTestSuite(scope, params.suiteId)
        if (!suite)
          throw new DomainError('invalid_action', 'Test suite not found')
        const versionId = body.versionId ?? suite.versionId
        const variant = await evaluateTestSuiteVariant({
          store: platform,
          tenantId: scope.tenantId,
          agentId: suite.agentId,
          versionId,
          cases: suite.cases,
          label: 'A'
        })
        const run = await recordSuiteRun({
          platform,
          scope,
          suite,
          variants: [variant],
          createdBy: identity.operatorId
        })
        return ok(run, correlationId)
      } catch (error) {
        const safeError = toSafeError(error)
        reply.code(statusCodeForError(safeError.code))
        return fail(safeError.code, safeError.message, correlationId)
      }
    }
  )

  app.post(
    '/v1/admin/test-lab/suites/:suiteId/compare',
    async (request, reply) => {
      const correlationId = createCorrelationId()
      try {
        const scope = requirePlatformScope(
          request.headers,
          'test:run',
          options.operatorIdentityResolver
        )
        const identity = resolveOperatorIdentity(
          request.headers,
          options.operatorIdentityResolver
        )
        const params = z
          .object({ suiteId: TestSuiteIdSchema })
          .strict()
          .parse(request.params)
        const body = z
          .object({
            versionAId: AgentVersionIdSchema,
            versionBId: AgentVersionIdSchema
          })
          .strict()
          .parse(request.body)
        const suite = await platform.getTestSuite(scope, params.suiteId)
        if (!suite)
          throw new DomainError('invalid_action', 'Test suite not found')
        const variants: TestSuiteVariantResult[] = await Promise.all([
          evaluateTestSuiteVariant({
            store: platform,
            tenantId: scope.tenantId,
            agentId: suite.agentId,
            versionId: body.versionAId,
            cases: suite.cases,
            label: 'A'
          }),
          evaluateTestSuiteVariant({
            store: platform,
            tenantId: scope.tenantId,
            agentId: suite.agentId,
            versionId: body.versionBId,
            cases: suite.cases,
            label: 'B'
          })
        ])
        return ok(
          await recordSuiteRun({
            platform,
            scope,
            suite,
            variants,
            createdBy: identity.operatorId
          }),
          correlationId
        )
      } catch (error) {
        const safeError = toSafeError(error)
        reply.code(statusCodeForError(safeError.code))
        return fail(safeError.code, safeError.message, correlationId)
      }
    }
  )

  app.get('/v1/admin/test-lab/suites/:suiteId/runs', async (request, reply) => {
    const correlationId = createCorrelationId()
    try {
      const scope = requirePlatformScope(
        request.headers,
        'test:run',
        options.operatorIdentityResolver
      )
      const params = z
        .object({ suiteId: TestSuiteIdSchema })
        .strict()
        .parse(request.params)
      const limit = parseTraceLimit(request.query)
      const items = await platform.listTestSuiteRuns(
        scope,
        params.suiteId,
        limit
      )
      return ok(
        {
          items,
          pageInfo: {
            limit,
            offset: 0,
            total: items.length,
            hasNextPage: false
          }
        },
        correlationId
      )
    } catch (error) {
      const safeError = toSafeError(error)
      reply.code(statusCodeForError(safeError.code))
      return fail(safeError.code, safeError.message, correlationId)
    }
  })

  app.get('/v1/admin/test-lab/runs', async (request, reply) => {
    const correlationId = createCorrelationId()
    try {
      const scope = requirePlatformScope(
        request.headers,
        'test:run',
        options.operatorIdentityResolver
      )
      const limit = parseTraceLimit(request.query)
      const items = await platform.listTestRuns(scope, limit)
      return ok(
        {
          items,
          pageInfo: {
            limit,
            offset: 0,
            total: items.length,
            hasNextPage: false
          }
        },
        correlationId
      )
    } catch (error) {
      const safeError = toSafeError(error)
      reply.code(statusCodeForError(safeError.code))
      return fail(safeError.code, safeError.message, correlationId)
    }
  })

  app.get('/v1/admin/execution-traces', async (request, reply) => {
    const correlationId = createCorrelationId()
    try {
      const scope = requirePlatformScope(
        request.headers,
        'audit:view_full',
        options.operatorIdentityResolver
      )
      const limit = parseTraceLimit(request.query)
      const items = await platform.listExecutionTraces(scope, limit)
      return ok(
        {
          items,
          pageInfo: {
            limit,
            offset: 0,
            total: items.length,
            hasNextPage: false
          }
        },
        correlationId
      )
    } catch (error) {
      const safeError = toSafeError(error)
      reply.code(statusCodeForError(safeError.code))
      return fail(safeError.code, safeError.message, correlationId)
    }
  })

  app.post('/v1/admin/test-lab/evaluate', async (request, reply) => {
    const correlationId = createCorrelationId()
    try {
      const scope = requirePlatformScope(
        request.headers,
        'test:run',
        options.operatorIdentityResolver
      )
      const body = TestLabEvaluationRequestSchema.parse(request.body)
      const result = await evaluateTestLabSuite({
        store: platform,
        tenantId: scope.tenantId,
        agentId: body.agentId,
        versionId: body.versionId,
        cases: body.cases
      })
      const identity = resolveOperatorIdentity(
        request.headers,
        options.operatorIdentityResolver
      )
      await appendPlatformAudit(
        audit,
        identity,
        correlationId,
        scope.tenantId,
        {
          event: 'test_lab_evaluated',
          tenantId: scope.tenantId,
          agentId: body.agentId,
          versionId: body.versionId,
          caseCount: result.results.length,
          passed: result.passed
        }
      )
      return ok(result, correlationId)
    } catch (error) {
      const safeError = toSafeError(error)
      reply.code(statusCodeForError(safeError.code))
      return fail(safeError.code, safeError.message, correlationId)
    }
  })

  return app
}

const CONTROLLED_TENANT_ID = TenantIdSchema.parse(
  'tenant_00000000-0000-4000-8000-000000000001'
)

async function evaluateTestSuiteVariant(input: {
  store: ControlPlaneStore
  tenantId: TenantId
  agentId: AgentId
  versionId: AgentVersionId
  cases: TestLabCase[]
  label: 'A' | 'B'
}): Promise<TestSuiteVariantResult> {
  const version = await input.store.getVersion(
    { tenantId: input.tenantId },
    input.versionId
  )
  if (!version || version.agentId !== input.agentId) {
    throw new DomainError(
      'invalid_action',
      'A/B version is outside agent scope'
    )
  }
  const result = await evaluateTestLabSuite({
    store: input.store,
    tenantId: input.tenantId,
    agentId: input.agentId,
    versionId: version.id,
    cases: input.cases
  })
  return {
    label: input.label,
    versionId: version.id,
    passed: result.passed,
    results: result.results
  }
}

async function recordSuiteRun(input: {
  platform: ControlPlaneStore
  scope: { tenantId: TenantId }
  suite: TestSuiteRecord
  variants: TestSuiteVariantResult[]
  createdBy: string
}): Promise<TestSuiteRunRecord> {
  const run: TestSuiteRunRecord = {
    id: createTestSuiteRunId(),
    tenantId: input.scope.tenantId,
    suiteId: input.suite.id,
    agentId: input.suite.agentId,
    variants: input.variants,
    passed: input.variants.every((variant) => variant.passed),
    createdBy: input.createdBy,
    createdAt: new Date()
  }
  return input.platform.recordTestSuiteRun(input.scope, run)
}

async function executeInboundRuntime(input: {
  options: AgentRuntimeOptions
  platform: ControlPlaneStore
  tenantId: TenantId
  correlationId: string
  channel: Channel
  senderRef: string
  message: string
  conversationId: string
  sessionId: string | null
  messageId: string
  audit: RuntimePersistence['audit']
  conversations: RuntimePersistence['conversations']
}) {
  let history: string[] = []
  const toolAuditEvents: PluginAuditEvent[] = []
  if (input.sessionId) {
    const timeline = await getConversationTimeline(
      input.conversations,
      input.tenantId,
      input.conversationId
    )
    const session = timeline.sessions.find(
      (candidate) => candidate.id === input.sessionId
    )
    if (!session) {
      throw new DomainError('invalid_action', 'Session not found')
    }
    if (!canBotRespond(session.takeoverState)) {
      return {
        status: 'paused' as const,
        trace: null,
        reason: 'human_takeover_active' as const
      }
    }
    history = timeline.messages
      .filter((message) => message.id !== input.messageId)
      .slice(-20)
      .map(
        (message) =>
          `${message.direction}: ${redactSensitiveText(message.body)}`
      )
  }
  const agentId = await input.options.resolveAgentId({
    tenantId: input.tenantId,
    channel: input.channel,
    senderRef: input.senderRef
  })
  if (!agentId) {
    await input.conversations.markInboundRuntimeCompleted(
      input.messageId,
      input.tenantId
    )
    return {
      status: 'not_configured' as const,
      trace: null,
      reason: 'agent_mapping_missing' as const
    }
  }
  const parsedAgentId = AgentIdSchema.parse(agentId)
  const result = await executePublishedAgent({
    store: input.platform,
    tenantId: input.tenantId,
    agentId: parsedAgentId,
    message: input.message,
    history,
    ...(input.options.capabilityGateway
      ? { capabilityGateway: input.options.capabilityGateway }
      : {}),
    ...(input.options.actor ? { actor: input.options.actor } : {}),
    ...(input.options.resolveCapabilityApproval
      ? { resolveCapabilityApproval: input.options.resolveCapabilityApproval }
      : {}),
    onToolAudit: async (event) => {
      if (input.options.completeInboundRuntime) {
        toolAuditEvents.push(event)
        return
      }
      await input.audit.append(
        {
          type: event.type,
          actorType: 'System',
          actorId: 'agent-runtime',
          correlationId: event.correlationId,
          policyVersion: 'plugin-gateway-v1',
          payload: {
            tenantId: event.tenantId,
            agentId: event.agentId,
            versionId: event.versionId,
            conversationId: input.conversationId,
            sessionId: input.sessionId,
            plugin: event.plugin,
            toolName: event.toolName,
            status: event.status,
            payload: event.payload
          }
        },
        event.tenantId
      )
    },
    context: {
      conversationId: input.conversationId,
      ...(input.sessionId ? { sessionId: input.sessionId } : {})
    },
    ...(input.options.approvedKnowledge
      ? { approvedKnowledge: input.options.approvedKnowledge }
      : {})
  })
  if (result.status === 'completed') {
    if (input.options.completeInboundRuntime) {
      const completion = await input.options.completeInboundRuntime({
        tenantId: input.tenantId,
        conversationId: input.conversationId,
        sessionId: input.sessionId,
        inboundMessageId: input.messageId,
        trace: result.trace,
        toolAuditEvents,
        correlationId: input.correlationId
      })
      if (completion.status === 'paused') {
        return {
          status: 'paused' as const,
          trace: null,
          reason: 'human_takeover_active' as const
        }
      }
      return result
    }
    if (input.sessionId) {
      const latestTimeline = await getConversationTimeline(
        input.conversations,
        input.tenantId,
        input.conversationId
      )
      const latestSession = latestTimeline.sessions.find(
        (candidate) => candidate.id === input.sessionId
      )
      if (!latestSession || !canBotRespond(latestSession.takeoverState)) {
        return {
          status: 'paused' as const,
          trace: null,
          reason: 'human_takeover_active' as const
        }
      }
    }
    if (result.trace.handoff.requested && input.sessionId) {
      const session = await input.conversations.transitionTakeover(
        input.tenantId,
        input.sessionId,
        'request_handoff'
      )
      if (!session) {
        throw new DomainError('invalid_action', 'Session not found')
      }
      await input.audit.append(
        {
          type: 'handoff',
          actorType: 'System',
          actorId: 'agent-runtime',
          correlationId: result.trace.traceId,
          policyVersion: 'human-takeover-v1',
          payload: {
            tenantId: input.tenantId,
            conversationId: input.conversationId,
            sessionId: input.sessionId,
            state: session.takeoverState,
            reason: result.trace.handoff.reason,
            effect: 'human_handoff_requested'
          }
        },
        input.tenantId
      )
    }
    if (result.trace.response.text.trim().length > 0) {
      await input.conversations.appendOutboundMessage({
        tenantId: input.tenantId,
        conversationId: input.conversationId,
        externalMessageId: `runtime:${result.trace.traceId}`,
        body: result.trace.response.text
      })
    }
    await input.platform.recordExecutionTrace(
      { tenantId: input.tenantId },
      result.trace
    )
    await input.conversations.markInboundRuntimeCompleted(
      input.messageId,
      input.tenantId
    )
  }
  return result
}

function parseInboundChannel(rawChannel: string): Channel {
  const parsed = z.enum(['whatsapp', 'web', 'internal']).safeParse(rawChannel)
  if (!parsed.success) {
    throw new DomainError('validation_failed', 'Channel is invalid')
  }
  return parsed.data
}

async function resolveInboundTenant(
  input: Parameters<InboundTenantResolver>[0],
  resolver?: InboundTenantResolver
): Promise<TenantId> {
  if (resolver) return TenantIdSchema.parse(await resolver(input))
  if (process.env.NODE_ENV !== 'test') {
    throw new DomainError(
      'unauthorized',
      'A trusted inbound tenant resolver is required in production'
    )
  }
  const rawHeader = input.headers['x-tenant-id']
  const candidate = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader
  const parsed = TenantIdSchema.safeParse(candidate)
  return parsed.success ? parsed.data : CONTROLLED_TENANT_ID
}

function resolveDataPlaneTenant(
  headers: Record<string, unknown>,
  identity: OperatorIdentity
): TenantId {
  const rawHeader = headers['x-tenant-id']
  const candidate = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader
  const parsedHeader = TenantIdSchema.safeParse(candidate)
  if (
    identity.tenantId &&
    parsedHeader.success &&
    identity.tenantId !== parsedHeader.data
  ) {
    throw new DomainError(
      'forbidden',
      'Operator identity cannot access this tenant scope'
    )
  }
  if (process.env.NODE_ENV !== 'test' && !identity.tenantId) {
    throw new DomainError(
      'unauthorized',
      'Trusted operator tenant scope is required in production'
    )
  }
  return (
    identity.tenantId ??
    (parsedHeader.success ? parsedHeader.data : CONTROLLED_TENANT_ID)
  )
}

function resolveOptionalRequestTenant(
  headers: Record<string, unknown>
): TenantId {
  const rawHeader = headers['x-tenant-id']
  const candidate = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader
  const parsed = TenantIdSchema.safeParse(candidate)
  if (process.env.NODE_ENV !== 'test' && !parsed.success) {
    throw new DomainError(
      'unauthorized',
      'Trusted tenant scope is required for this mutation'
    )
  }
  return parsed.success ? parsed.data : CONTROLLED_TENANT_ID
}

function requireOperatorIdentity(
  headers: Record<string, unknown>,
  permission: string,
  resolver?: OperatorIdentityResolver
): OperatorIdentity {
  try {
    const identity = resolveOperatorIdentity(headers, resolver)
    if (!roleHasPermission(identity.role, permission)) {
      throw new DomainError('forbidden', `Role cannot perform ${permission}`)
    }
    return identity
  } catch (error) {
    if (error instanceof DomainError) throw error
    throw new DomainError(
      'unauthorized',
      'Valid operator identity headers are required'
    )
  }
}

function requireAnyOperatorPermission(
  headers: Record<string, unknown>,
  permissions: string[],
  resolver?: OperatorIdentityResolver
): OperatorIdentity {
  try {
    const identity = resolveOperatorIdentity(headers, resolver)
    if (
      !permissions.some((permission) =>
        roleHasPermission(identity.role, permission)
      )
    ) {
      throw new DomainError('forbidden', 'Role cannot access this resource')
    }
    return identity
  } catch (error) {
    if (error instanceof DomainError) throw error
    throw new DomainError(
      'unauthorized',
      'Valid operator identity headers are required'
    )
  }
}

const TestLabRequestSchema = z
  .object({
    agentId: AgentIdSchema,
    versionId: AgentVersionIdSchema,
    message: z.string().trim().min(1).max(4000),
    history: z.array(z.string().max(4000)).max(50).default([]),
    approvedKnowledge: z
      .object({
        version: z.string().trim().min(1).max(120),
        answer: z.string().trim().min(1).max(4000),
        source: z
          .string()
          .trim()
          .regex(/^controlled:\/\//)
      })
      .strict()
      .optional()
  })
  .strict()

const VersionCloneRequestSchema = z
  .object({ config: AgentConfigSchema.optional() })
  .strict()

const TakeoverRequestSchema = z
  .object({
    event: z.enum([
      'request_handoff',
      'accept_handoff',
      'resolve_handoff',
      'release_to_bot'
    ])
  })
  .strict()

const TestLabEvaluationRequestSchema = z
  .object({
    agentId: AgentIdSchema,
    versionId: AgentVersionIdSchema,
    cases: z.array(TestLabCaseSchema).min(1).max(100)
  })
  .strict()

const CapabilityApprovalParamsSchema = z
  .object({ approvalId: z.string().trim().min(1).max(160) })
  .strict()

const CapabilityApprovalIssueRequestSchema = z
  .object({
    agentId: AgentIdSchema,
    versionId: AgentVersionIdSchema,
    toolName: z.literal(CONTROLLED_SCHEDULING_TOOL),
    actorId: z
      .string()
      .trim()
      .min(3)
      .max(80)
      .regex(/^[A-Za-z0-9._:-]+$/),
    input: z
      .object({
        message: z.string().trim().min(1).max(4000)
      })
      .strict(),
    expiresAt: z.coerce.date(),
    nonce: z
      .string()
      .trim()
      .min(8)
      .max(160)
      .regex(/^[A-Za-z0-9._:-]+$/)
      .optional()
  })
  .strict()
  .superRefine((input, context) => {
    const now = Date.now()
    const expiry = input.expiresAt.getTime()
    if (!Number.isFinite(expiry) || expiry <= now) {
      context.addIssue({
        code: 'custom',
        path: ['expiresAt'],
        message: 'Approval expiry must be in the future'
      })
    } else if (expiry > now + 15 * 60 * 1000) {
      context.addIssue({
        code: 'custom',
        path: ['expiresAt'],
        message: 'Approval lifetime cannot exceed 15 minutes'
      })
    }
  })

const CapabilityApprovalExecutionRequestSchema = z
  .object({
    message: z.string().trim().min(1).max(4000),
    history: z.array(z.string().max(4000)).max(50).default([]),
    approvedKnowledge: z
      .object({
        version: z.string().trim().min(1).max(120),
        answer: z.string().trim().min(1).max(4000),
        source: z
          .string()
          .trim()
          .regex(/^controlled:\/\//)
      })
      .strict()
      .optional()
  })
  .strict()

function requirePlatformScope(
  headers: Record<string, unknown>,
  permission: string,
  resolver?: OperatorIdentityResolver
): { tenantId: z.infer<typeof TenantIdSchema> } {
  const identity = requireOperatorIdentity(headers, permission, resolver)
  const rawTenant = Array.isArray(headers['x-tenant-id'])
    ? headers['x-tenant-id'][0]
    : headers['x-tenant-id']
  const tenant = TenantIdSchema.safeParse(rawTenant)
  if (!tenant.success) {
    throw new DomainError(
      'unauthorized',
      'Valid tenant scope headers are required'
    )
  }
  if (identity.tenantId && identity.tenantId !== tenant.data) {
    throw new DomainError(
      'forbidden',
      'Operator identity cannot access this tenant scope'
    )
  }
  if (process.env.NODE_ENV !== 'test' && !identity.tenantId) {
    throw new DomainError(
      'unauthorized',
      'Trusted operator tenant scope is required in production'
    )
  }
  return { tenantId: tenant.data }
}

function capabilityApprovalReference(
  record: CapabilityApprovalRecord
): CapabilityApproval {
  return {
    id: record.id,
    tenantId: record.tenantId,
    agentId: record.agentId,
    versionId: record.versionId,
    toolName: record.toolName,
    actorId: record.actorId,
    expiresAt: new Date(record.expiresAt.getTime())
  }
}

function resolveOperatorIdentity(
  headers: Record<string, unknown>,
  resolver?: OperatorIdentityResolver
): OperatorIdentity {
  if (resolver) return resolver(headers)
  if (process.env.NODE_ENV !== 'test') {
    throw new DomainError(
      'unauthorized',
      'A trusted operator identity resolver is required in production'
    )
  }
  return parseOperatorIdentity(headers)
}

async function appendPlatformAudit(
  audit: RuntimePersistence['audit'],
  identity: OperatorIdentity,
  correlationId: string,
  tenantId: TenantId,
  payload: Record<string, unknown>
): Promise<void> {
  await audit.append(
    {
      type: 'integration_event',
      actorType: identity.role,
      actorId: identity.operatorId,
      correlationId,
      policyVersion: 'platform-control-plane-v1',
      payload
    },
    tenantId
  )
}

function statusCodeForError(code: string): number {
  if (code === 'unauthorized') return 401
  if (code === 'forbidden') return 403
  if (code === 'conflict') return 409
  if (code === 'rate_limited') return 429
  if (code === 'internal_error') return 500
  return 400
}

const tenantIsolationTables = [
  'conversations',
  'messages',
  'sessions',
  'agent_runs',
  'tool_calls',
  'approval_requests',
  'tasks',
  'audit_events',
  'idempotency',
  'outbox_events',
  'platform_agents',
  'platform_agent_versions',
  'platform_test_runs',
  'platform_execution_traces',
  'platform_capability_approvals',
  'platform_test_suites',
  'platform_test_suite_runs',
  'platform_plugin_catalog'
] as const

const webhookReplayTables = ['webhook_replay_events'] as const

const tenantIsolationMigrationTables = [
  ...tenantIsolationTables,
  ...webhookReplayTables,
  'tenant_isolation_quarantine',
  'schema_migrations'
] as const

const tenantIsolationMigrationVersions = [
  '0000_initial',
  '0001_tenant_isolation',
  '0002_capability_approvals',
  '0003_test_suite_catalog',
  '0004_plugin_manifest_catalog'
] as const

const tenantIsolationRequiredConstraints = [
  'messages_runtime_status_check',
  'messages_tenant_id_not_null',
  'sessions_tenant_id_not_null',
  'agent_runs_tenant_id_not_null',
  'tool_calls_tenant_id_not_null',
  'approval_requests_tenant_id_not_null',
  'tasks_tenant_id_not_null',
  'audit_events_tenant_id_not_null',
  'outbox_events_tenant_id_not_null',
  'messages_tenant_conversation_fk',
  'sessions_tenant_conversation_fk',
  'agent_runs_tenant_session_fk',
  'tool_calls_tenant_run_fk',
  'approval_requests_tenant_session_fk',
  'tasks_tenant_session_fk',
  'platform_versions_tenant_agent_fk',
  'platform_test_runs_tenant_agent_version_fk',
  'platform_execution_traces_tenant_agent_version_fk',
  'platform_capability_approvals_tenant_nonce_key',
  'platform_capability_approvals_tenant_agent_version_fk',
  'platform_test_suites_tenant_agent_version_fk',
  'platform_test_suites_previous_agent_fk',
  'platform_test_suite_runs_tenant_suite_fk',
  'platform_test_suite_runs_tenant_agent_fk',
  'platform_test_suite_runs_tenant_suite_agent_fk',
  'platform_plugin_catalog_pkey',
  'platform_plugin_catalog_tenant_name_version_key',
  'platform_plugin_catalog_status_check',
  'platform_plugin_catalog_manifest_identity_check'
] as const

const tenantIsolationRequiredIndexes = [
  'idempotency_pkey',
  'idx_conversations_tenant_id',
  'idx_messages_tenant_conversation',
  'idx_messages_runtime_status',
  'idx_sessions_tenant_conversation',
  'idx_agent_runs_tenant_session',
  'idx_tool_calls_tenant_run',
  'idx_approval_requests_tenant_session',
  'idx_tasks_tenant_session',
  'idx_audit_events_tenant_created',
  'idx_outbox_events_tenant_status',
  'idx_platform_agents_tenant_id',
  'idx_platform_agent_versions_tenant_agent',
  'idx_platform_test_runs_tenant_created',
  'idx_platform_execution_traces_tenant_created',
  'idx_platform_capability_approvals_tenant_status',
  'idx_platform_capability_approvals_tenant_actor',
  'idx_platform_test_suites_tenant_agent',
  'idx_platform_test_suite_runs_tenant_created',
  'idx_platform_plugin_catalog_tenant_status'
] as const

export async function assertTenantIsolationMigrationState(
  client: PostgresQueryable
): Promise<void> {
  const applied = await client.query<{
    version: string
    checksum: string | null
    applied_at: Date
    baseline_actor: string | null
    baseline_reference: string | null
    baseline_at: Date | null
  }>(
    `SELECT version, checksum, applied_at, baseline_actor, baseline_reference, baseline_at
     FROM schema_migrations
     WHERE version = ANY($1::text[])`,
    [tenantIsolationMigrationVersions]
  )
  const appliedByVersion = new Map(
    applied.rows.map((migration) => [migration.version, migration])
  )
  let previousAppliedAt = 0
  for (const version of tenantIsolationMigrationVersions) {
    const migration = appliedByVersion.get(version)
    const sql = await readPostgresMigrationSql(version)
    const expectedChecksum = createHash('sha256').update(sql).digest('hex')
    const appliedAt = migration?.applied_at
      ? new Date(migration.applied_at).getTime()
      : Number.NaN
    const baselineFields = migration
      ? [
          migration.baseline_actor,
          migration.baseline_reference,
          migration.baseline_at
        ]
      : []
    const baselineIsPartial =
      baselineFields.some((field) => field !== null && field !== undefined) &&
      baselineFields.some((field) => field === null || field === undefined)
    if (
      !migration ||
      migration.checksum !== expectedChecksum ||
      !Number.isFinite(appliedAt) ||
      appliedAt < previousAppliedAt ||
      baselineIsPartial
    ) {
      throw new Error(
        `PostgreSQL tenant-isolation migration state is not verified: ${version}`
      )
    }
    previousAppliedAt = appliedAt
  }
}

export async function assertTenantIsolationSchema(
  client: PostgresQueryable
): Promise<void> {
  const tables = await client.query<{
    relname: string
    relrowsecurity: boolean
    relforcerowsecurity: boolean
  }>(
    `SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
     FROM pg_class AS c
     INNER JOIN pg_namespace AS n ON n.oid = c.relnamespace
     WHERE n.nspname = current_schema()
       AND c.relname = ANY($1::text[])`,
    [tenantIsolationTables]
  )
  const relationByName = new Map(
    tables.rows.map((table) => [table.relname, table])
  )
  const policies = await client.query<{
    tablename: string
    policyname: string
    permissive: string
    roles: string
    cmd: string
    qual: string | null
    with_check: string | null
  }>(
    `SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
     FROM pg_policies
     WHERE schemaname = current_schema()
       AND tablename = ANY($1::text[])`,
    [tenantIsolationTables]
  )
  const policiesByTable = new Map<string, typeof policies.rows>()
  for (const policy of policies.rows) {
    const tablePolicies = policiesByTable.get(policy.tablename) ?? []
    policiesByTable.set(policy.tablename, [...tablePolicies, policy])
  }
  const expectedExpression =
    "tenant_isolation_quarantined = false AND tenant_id = NULLIF(current_setting('cvg.tenant_id', true), '')"

  for (const table of tenantIsolationTables) {
    const relation = relationByName.get(table)
    const tablePolicies = policiesByTable.get(table) ?? []
    const policy = tablePolicies[0]
    if (
      !relation ||
      !relation.relrowsecurity ||
      !relation.relforcerowsecurity ||
      tablePolicies.length !== 1 ||
      !policy ||
      policy.policyname !== `${table}_tenant_isolation` ||
      policy.permissive !== 'PERMISSIVE' ||
      policy.roles !== '{public}' ||
      policy.cmd !== 'ALL' ||
      normalizePolicyExpression(policy.qual) !== expectedExpression ||
      normalizePolicyExpression(policy.with_check) !== expectedExpression
    ) {
      throw new Error(
        'PostgreSQL tenant isolation policies are not fully installed'
      )
    }
  }

  const columns = await client.query<{
    table_name: string
    column_name: string
  }>(
    `SELECT table_name, column_name
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = ANY($1::text[])
       AND column_name = ANY($2::text[])`,
    [tenantIsolationTables, ['tenant_id', 'tenant_isolation_quarantined']]
  )
  const columnsByTable = new Map<string, Set<string>>()
  for (const column of columns.rows) {
    const tableColumns = columnsByTable.get(column.table_name) ?? new Set()
    tableColumns.add(column.column_name)
    columnsByTable.set(column.table_name, tableColumns)
  }
  const missingColumns = tenantIsolationTables.filter((table) => {
    const tableColumns = columnsByTable.get(table)
    return (
      !tableColumns?.has('tenant_id') ||
      !tableColumns.has('tenant_isolation_quarantined')
    )
  })
  if (missingColumns.length > 0) {
    throw new Error(
      `PostgreSQL tenant isolation columns are incomplete: ${missingColumns.join(', ')}`
    )
  }

  const constraints = await client.query<{ conname: string }>(
    `SELECT conname
     FROM pg_constraint
     WHERE connamespace = current_schema()::regnamespace
       AND conname = ANY($1::text[])`,
    [tenantIsolationRequiredConstraints]
  )
  const constraintNames = new Set(
    constraints.rows.map((constraint) => constraint.conname)
  )
  const missingConstraints = tenantIsolationRequiredConstraints.filter(
    (constraint) => !constraintNames.has(constraint)
  )
  if (missingConstraints.length > 0) {
    throw new Error(
      `PostgreSQL tenant isolation constraints are incomplete: ${missingConstraints.join(', ')}`
    )
  }

  const indexes = await client.query<{ indexname: string }>(
    `SELECT indexname
     FROM pg_indexes
     WHERE schemaname = current_schema()
       AND indexname = ANY($1::text[])`,
    [tenantIsolationRequiredIndexes]
  )
  const indexNames = new Set(indexes.rows.map((index) => index.indexname))
  const missingIndexes = tenantIsolationRequiredIndexes.filter(
    (index) => !indexNames.has(index)
  )
  if (missingIndexes.length > 0) {
    throw new Error(
      `PostgreSQL tenant isolation indexes are incomplete: ${missingIndexes.join(', ')}`
    )
  }
}

export async function assertWebhookReplaySchema(
  client: PostgresQueryable
): Promise<void> {
  const requiredConstraints = [
    'webhook_replay_events_pkey',
    'webhook_replay_events_event_key_check',
    'webhook_replay_events_status_check'
  ]
  const requiredIndexes = [
    'webhook_replay_events_pkey',
    'idx_webhook_replay_events_expires'
  ]
  const relation = await client.query<{
    relname: string
    relkind: string
  }>(
    `SELECT c.relname, c.relkind
     FROM pg_class AS c
     INNER JOIN pg_namespace AS n ON n.oid = c.relnamespace
     WHERE n.nspname = current_schema()
       AND c.relname = ANY($1::text[])`,
    [webhookReplayTables]
  )
  const columns = await client.query<{
    table_name: string
    column_name: string
  }>(
    `SELECT table_name, column_name
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = ANY($1::text[])`,
    [webhookReplayTables]
  )
  const columnNames = new Set(columns.rows.map((row) => row.column_name))
  const constraints = await client.query<{ conname: string }>(
    `SELECT conname
     FROM pg_constraint
     WHERE connamespace = current_schema()::regnamespace
       AND conname = ANY($1::text[])`,
    [requiredConstraints]
  )
  const indexes = await client.query<{ indexname: string }>(
    `SELECT indexname
     FROM pg_indexes
     WHERE schemaname = current_schema()
       AND indexname = ANY($1::text[])`,
    [requiredIndexes]
  )
  const constraintNames = new Set(
    constraints.rows.map((constraint) => constraint.conname)
  )
  const indexNames = new Set(indexes.rows.map((index) => index.indexname))
  if (
    relation.rows.length !== webhookReplayTables.length ||
    relation.rows[0]?.relkind !== 'r' ||
    !['event_key', 'status', 'expires_at'].every((column) =>
      columnNames.has(column)
    ) ||
    requiredConstraints.some(
      (constraint) => !constraintNames.has(constraint)
    ) ||
    requiredIndexes.some((index) => !indexNames.has(index))
  ) {
    throw new Error('PostgreSQL webhook replay storage is not fully installed')
  }
}

function normalizePolicyExpression(expression: string | null): string {
  return (expression ?? '')
    .replace(/::text/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\((tenant_isolation_quarantined = false)\)/g, '$1')
    .replace(
      /\((tenant_id = NULLIF\(current_setting\('cvg\.tenant_id', true\), ''\))\)/g,
      '$1'
    )
    .replace(/^\((.*)\)$/, '$1')
}

function assertSafeRuntimeSchemaName(schemaName: string | undefined): void {
  if (schemaName && !/^[a-z][a-z0-9_]{0,62}$/.test(schemaName)) {
    throw new Error('Invalid PostgreSQL schema name')
  }
}

function createPostgresPool(
  connectionString: string,
  schemaName: string | undefined
): Pool {
  assertSafeRuntimeSchemaName(schemaName)
  return new Pool({
    connectionString,
    ...(schemaName ? { options: `-c search_path=${schemaName}` } : {})
  })
}

export async function assertRuntimeRoleIsLeastPrivilege(
  client: PostgresQueryable,
  migrationRoleName?: string
): Promise<void> {
  const roleResult = await client.query<{
    rolname: string
    rolsuper: boolean
    rolbypassrls: boolean
    rolcreatedb: boolean
    rolcreaterole: boolean
    rolreplication: boolean
  }>(
    `SELECT rolname, rolsuper, rolbypassrls, rolcreatedb, rolcreaterole, rolreplication
     FROM pg_roles
     WHERE rolname = current_user
     LIMIT 1`
  )
  const role = roleResult.rows[0]
  if (
    !role ||
    role.rolsuper ||
    role.rolbypassrls ||
    role.rolcreatedb ||
    role.rolcreaterole ||
    role.rolreplication ||
    role.rolname === migrationRoleName
  ) {
    throw new Error(
      'PostgreSQL runtime role must satisfy least-privilege separation'
    )
  }

  const memberships = await client.query<{ granted_role: string }>(
    `WITH RECURSIVE inherited_roles(role_oid) AS (
       SELECT oid
       FROM pg_roles
       WHERE rolname = current_user
       UNION
       SELECT membership.roleid
       FROM pg_auth_members AS membership
       INNER JOIN inherited_roles AS parent ON parent.role_oid = membership.member
     )
     SELECT granted.rolname AS granted_role
     FROM inherited_roles
     INNER JOIN pg_roles AS granted ON granted.oid = inherited_roles.role_oid
     WHERE granted.rolname <> current_user`
  )
  const tablePrivileges = await client.query<{
    relname: string
    owner: string
    can_select: boolean
    can_insert: boolean
    can_update: boolean
    can_delete: boolean
    can_truncate: boolean
    can_trigger: boolean
    can_references: boolean
  }>(
    `SELECT c.relname,
            pg_get_userbyid(c.relowner) AS owner,
            has_table_privilege(current_user, format('%I.%I', n.nspname, c.relname), 'SELECT') AS can_select,
            has_table_privilege(current_user, format('%I.%I', n.nspname, c.relname), 'INSERT') AS can_insert,
            has_table_privilege(current_user, format('%I.%I', n.nspname, c.relname), 'UPDATE') AS can_update,
            has_table_privilege(current_user, format('%I.%I', n.nspname, c.relname), 'DELETE') AS can_delete,
            has_table_privilege(current_user, format('%I.%I', n.nspname, c.relname), 'TRUNCATE') AS can_truncate,
            has_table_privilege(current_user, format('%I.%I', n.nspname, c.relname), 'TRIGGER') AS can_trigger,
            has_table_privilege(current_user, format('%I.%I', n.nspname, c.relname), 'REFERENCES') AS can_references
     FROM pg_class AS c
     INNER JOIN pg_namespace AS n ON n.oid = c.relnamespace
     WHERE n.nspname = current_schema()
       AND c.relname = ANY($1::text[])`,
    [tenantIsolationTables]
  )
  const schemaPrivilege = await client.query<{ can_create: boolean }>(
    `SELECT has_schema_privilege(current_user, current_schema(), 'CREATE') AS can_create`
  )
  const quarantinePrivilege = await client.query<{
    owner: string
    can_select: boolean
    can_insert: boolean
    can_update: boolean
    can_delete: boolean
    can_truncate: boolean
  }>(
    `SELECT pg_get_userbyid(c.relowner) AS owner,
            has_table_privilege(current_user, format('%I.%I', n.nspname, c.relname), 'SELECT') AS can_select,
            has_table_privilege(current_user, format('%I.%I', n.nspname, c.relname), 'INSERT') AS can_insert,
            has_table_privilege(current_user, format('%I.%I', n.nspname, c.relname), 'UPDATE') AS can_update,
            has_table_privilege(current_user, format('%I.%I', n.nspname, c.relname), 'DELETE') AS can_delete,
            has_table_privilege(current_user, format('%I.%I', n.nspname, c.relname), 'TRUNCATE') AS can_truncate
     FROM pg_class AS c
     INNER JOIN pg_namespace AS n ON n.oid = c.relnamespace
     WHERE n.nspname = current_schema()
       AND c.relname = 'tenant_isolation_quarantine'`
  )
  const replayPrivileges = await client.query<{
    owner: string
    can_select: boolean
    can_insert: boolean
    can_update: boolean
    can_delete: boolean
    can_truncate: boolean
    can_trigger: boolean
    can_references: boolean
  }>(
    `SELECT pg_get_userbyid(c.relowner) AS owner,
            has_table_privilege(current_user, format('%I.%I', n.nspname, c.relname), 'SELECT') AS can_select,
            has_table_privilege(current_user, format('%I.%I', n.nspname, c.relname), 'INSERT') AS can_insert,
            has_table_privilege(current_user, format('%I.%I', n.nspname, c.relname), 'UPDATE') AS can_update,
            has_table_privilege(current_user, format('%I.%I', n.nspname, c.relname), 'DELETE') AS can_delete,
            has_table_privilege(current_user, format('%I.%I', n.nspname, c.relname), 'TRUNCATE') AS can_truncate,
            has_table_privilege(current_user, format('%I.%I', n.nspname, c.relname), 'TRIGGER') AS can_trigger,
            has_table_privilege(current_user, format('%I.%I', n.nspname, c.relname), 'REFERENCES') AS can_references
     FROM pg_class AS c
     INNER JOIN pg_namespace AS n ON n.oid = c.relnamespace
     WHERE n.nspname = current_schema()
       AND c.relname = ANY($1::text[])`,
    [webhookReplayTables]
  )
  if (
    tablePrivileges.rows.length !== tenantIsolationTables.length ||
    tablePrivileges.rows.some(
      (table) =>
        table.owner === role.rolname ||
        !table.can_select ||
        !table.can_insert ||
        !table.can_update ||
        table.can_delete ||
        table.can_truncate ||
        table.can_trigger ||
        table.can_references
    ) ||
    memberships.rows.length > 0 ||
    schemaPrivilege.rows[0]?.can_create ||
    quarantinePrivilege.rows[0]?.owner === role.rolname ||
    quarantinePrivilege.rows[0]?.can_select ||
    quarantinePrivilege.rows[0]?.can_insert ||
    quarantinePrivilege.rows[0]?.can_update ||
    quarantinePrivilege.rows[0]?.can_delete ||
    quarantinePrivilege.rows[0]?.can_truncate ||
    replayPrivileges.rows.length !== webhookReplayTables.length ||
    replayPrivileges.rows.some(
      (table) =>
        table.owner === role.rolname ||
        !table.can_select ||
        !table.can_insert ||
        !table.can_update ||
        !table.can_delete ||
        table.can_truncate ||
        table.can_trigger ||
        table.can_references
    )
  ) {
    throw new Error(
      'PostgreSQL runtime role must satisfy least-privilege separation'
    )
  }
}

export async function assertMigrationRoleIsLeastPrivilege(
  client: PostgresQueryable,
  runtimeRoleName?: string
): Promise<void> {
  const roleResult = await client.query<{
    rolname: string
    rolsuper: boolean
    rolbypassrls: boolean
    rolcreatedb: boolean
    rolcreaterole: boolean
    rolreplication: boolean
  }>(
    `SELECT rolname, rolsuper, rolbypassrls, rolcreatedb, rolcreaterole, rolreplication
     FROM pg_roles
     WHERE rolname = current_user
     LIMIT 1`
  )
  const role = roleResult.rows[0]
  if (
    !role ||
    role.rolsuper ||
    role.rolbypassrls ||
    role.rolcreatedb ||
    role.rolcreaterole ||
    role.rolreplication ||
    role.rolname === runtimeRoleName
  ) {
    throw new Error(
      'PostgreSQL migration role must be a separate non-privileged DDL owner'
    )
  }

  const memberships = await client.query<{ granted_role: string }>(
    `SELECT granted.rolname AS granted_role
     FROM pg_auth_members AS membership
     INNER JOIN pg_roles AS member ON member.oid = membership.member
     INNER JOIN pg_roles AS granted ON granted.oid = membership.roleid
     WHERE member.rolname = current_user`
  )
  const databaseOwner = await client.query<{ owner: string }>(
    `SELECT pg_get_userbyid(datdba) AS owner
     FROM pg_database
     WHERE datname = current_database()`
  )
  const schemaPrivilege = await client.query<{
    can_usage: boolean
    can_create: boolean
  }>(
    `SELECT has_schema_privilege(current_user, current_schema(), 'USAGE') AS can_usage,
            has_schema_privilege(current_user, current_schema(), 'CREATE') AS can_create`
  )
  const managedTables = await client.query<{
    relname: string
    owner: string
  }>(
    `SELECT c.relname, pg_get_userbyid(c.relowner) AS owner
     FROM pg_class AS c
     INNER JOIN pg_namespace AS n ON n.oid = c.relnamespace
     WHERE n.nspname = current_schema()
       AND c.relname = ANY($1::text[])`,
    [tenantIsolationMigrationTables]
  )
  if (
    memberships.rows.length > 0 ||
    databaseOwner.rows[0]?.owner === role.rolname ||
    !schemaPrivilege.rows[0]?.can_usage ||
    !schemaPrivilege.rows[0]?.can_create ||
    managedTables.rows.length !== tenantIsolationMigrationTables.length ||
    managedTables.rows.some((table) => table.owner !== role.rolname)
  ) {
    throw new Error(
      'PostgreSQL migration role must be a separate non-privileged DDL owner'
    )
  }
}

export async function assertMigrationRoleSecurityBoundary(
  client: PostgresQueryable,
  runtimeRoleName?: string
): Promise<void> {
  const roleResult = await client.query<{
    rolname: string
    rolsuper: boolean
    rolbypassrls: boolean
    rolcreatedb: boolean
    rolcreaterole: boolean
    rolreplication: boolean
  }>(
    `SELECT rolname, rolsuper, rolbypassrls, rolcreatedb, rolcreaterole, rolreplication
     FROM pg_roles
     WHERE rolname = current_user
     LIMIT 1`
  )
  const role = roleResult.rows[0]
  const memberships = await client.query(
    `SELECT granted.rolname AS granted_role
     FROM pg_auth_members AS membership
     INNER JOIN pg_roles AS member ON member.oid = membership.member
     INNER JOIN pg_roles AS granted ON granted.oid = membership.roleid
     WHERE member.rolname = current_user`
  )
  const databaseOwner = await client.query<{ owner: string }>(
    `SELECT pg_get_userbyid(datdba) AS owner
     FROM pg_database
     WHERE datname = current_database()`
  )
  if (
    !role ||
    role.rolsuper ||
    role.rolbypassrls ||
    role.rolcreatedb ||
    role.rolcreaterole ||
    role.rolreplication ||
    role.rolname === runtimeRoleName ||
    memberships.rows.length > 0 ||
    databaseOwner.rows[0]?.owner === role.rolname
  ) {
    throw new Error(
      'PostgreSQL migration role must be a separate non-privileged DDL owner'
    )
  }
}

async function readCurrentDatabaseRole(
  client: PostgresQueryable
): Promise<string> {
  const result = await client.query<{ role_name: string }>(
    `SELECT current_user::text AS role_name`
  )
  const roleName = result.rows[0]?.role_name
  if (!roleName) {
    throw new Error('PostgreSQL current role could not be identified')
  }
  return roleName
}

async function assertRuntimeRoleIsNotRlsBypass(
  client: PostgresQueryable
): Promise<void> {
  const result = await client.query<{
    rolsuper: boolean
    rolbypassrls: boolean
  }>(
    `SELECT rolsuper, rolbypassrls
     FROM pg_roles
     WHERE rolname = current_user
     LIMIT 1`
  )
  const role = result.rows[0]
  if (!role || role.rolsuper || role.rolbypassrls) {
    throw new Error(
      'PostgreSQL runtime role must be a non-superuser without BYPASSRLS'
    )
  }
}

interface RuntimePersistence {
  conversations:
    | ConversationRepository
    | PostgresRuntimeRepository
    | TenantScopedPostgresRuntimeRepository

  tasks: {
    create: TaskRepository['create'] | PostgresRuntimeRepository['createTask']
    list: TaskRepository['list'] | PostgresRuntimeRepository['listTasks']
    findById:
      | TaskRepository['findById']
      | PostgresRuntimeRepository['findTaskById']
    updateStatus:
      | TaskRepository['updateStatus']
      | PostgresRuntimeRepository['updateTaskStatus']
  }
  approvals: {
    save: ApprovalRepository['save'] | PostgresRuntimeRepository['saveApproval']
    findById:
      | ApprovalRepository['findById']
      | PostgresRuntimeRepository['findApprovalById']
    list:
      | ApprovalRepository['list']
      | PostgresRuntimeRepository['listApprovals']
  }
  audit: {
    append: (
      input: Parameters<AuditRepository['append']>[0],
      tenantId?: TenantId
    ) => AuditEventRecord | Promise<AuditEventRecord>
    listBySession:
      | AuditRepository['listBySession']
      | PostgresRuntimeRepository['listAuditBySession']
    listEvidence:
      | AuditRepository['listEvidence']
      | PostgresRuntimeRepository['listAuditEvidence']
    summarizeEvidence:
      | AuditRepository['summarizeEvidence']
      | PostgresRuntimeRepository['summarizeAuditEvidence']
  }
}

function sanitizeAuditEvidencePage(page: {
  items: Array<{ payload: unknown }>
  pageInfo: unknown
}) {
  const redactedFields = new Set<string>()
  const items = page.items.map((event) => {
    const sanitized = sanitizeAuditEvidencePayload(event.payload)
    sanitized.redactedFields.forEach((field) => redactedFields.add(field))
    return { ...event, payload: sanitized.payload }
  })

  return {
    page: { ...page, items },
    governance: {
      ...auditEvidenceGovernance,
      payload: {
        ...auditEvidenceGovernance.payload,
        redactedFields: Array.from(redactedFields)
      }
    }
  }
}

function assertTaskTransition(
  fromStatus: TaskStatus,
  toStatus: TaskStatus
): void {
  if (fromStatus === toStatus) return
  const allowed: Record<TaskStatus, TaskStatus[]> = {
    open: ['in_progress', 'done', 'canceled'],
    in_progress: ['done', 'canceled'],
    done: [],
    canceled: []
  }
  if (!allowed[fromStatus].includes(toStatus)) {
    throw new DomainError(
      'invalid_action',
      'Task status transition is not allowed'
    )
  }
}

function parsePagination(
  query: unknown
): { limit: number; offset: number } | null {
  const params = query as { limit?: unknown; offset?: unknown }
  const limit = params.limit === undefined ? 25 : Number(params.limit)
  const offset = params.offset === undefined ? 0 : Number(params.offset)

  if (
    !Number.isInteger(limit) ||
    !Number.isInteger(offset) ||
    limit < 1 ||
    limit > 100 ||
    offset < 0
  ) {
    return null
  }

  return { limit, offset }
}

function parseTraceLimit(query: unknown): number {
  const parsed = z
    .object({
      limit: z.coerce.number().int().min(1).max(100).default(25)
    })
    .strict()
    .safeParse(query)
  if (!parsed.success) {
    throw new DomainError(
      'invalid_pagination',
      'limit must be between 1 and 100'
    )
  }
  return parsed.data.limit
}

const auditEventTypes: AuditEventType[] = [
  'tool_call',
  'safety_event',
  'integration_event',
  'policy_decision',
  'approval_decision',
  'handoff'
]

function parseAuditEvidenceQuery(query: unknown): {
  query: AuditEvidenceQuery
  filters: AuditEvidenceFilters
} {
  const pagination = parsePagination(query)
  if (!pagination) {
    throw new DomainError(
      'invalid_pagination',
      'limit must be between 1 and 100 and offset must be zero or greater'
    )
  }
  const params = query as Record<string, unknown>
  const filters: AuditEvidenceFilters = {}
  const sessionId = parseOptionalAuditFilter(params.sessionId)
  const correlationId = parseOptionalAuditFilter(params.correlationId)
  const actorId = parseOptionalAuditFilter(params.actorId)
  const type = parseOptionalAuditFilter(params.type)

  if (sessionId) filters.sessionId = sessionId
  if (correlationId) filters.correlationId = correlationId
  if (actorId) filters.actorId = actorId
  if (type) {
    if (!auditEventTypes.includes(type as AuditEventType)) {
      throw new DomainError('validation_failed', 'Audit event type is invalid')
    }
    filters.type = type as AuditEventType
  }

  return { query: { ...pagination, ...filters }, filters }
}

function parseOptionalAuditFilter(value: unknown): string | undefined {
  if (value === undefined) return undefined
  if (Array.isArray(value)) return parseOptionalAuditFilter(value[0])
  if (typeof value !== 'string') {
    throw new DomainError(
      'validation_failed',
      'Audit evidence filters must be strings'
    )
  }
  const trimmed = value.trim()
  if (
    trimmed.length === 0 ||
    trimmed.length > 120 ||
    !/^[A-Za-z0-9._:-]+$/.test(trimmed)
  ) {
    throw new DomainError(
      'validation_failed',
      'Audit evidence filter is invalid'
    )
  }
  return trimmed
}

function createPersistence(
  config: BuildServerOptions['persistence']
): RuntimePersistence {
  if (config?.kind === 'postgres' || config?.kind === 'postgres-pool') {
    const postgres =
      config.kind === 'postgres'
        ? new PostgresRuntimeRepository(config.client)
        : new TenantScopedPostgresRuntimeRepository(config.pool)
    return {
      conversations: postgres,
      tasks: {
        create: (input, tenantId) => postgres.createTask(input, tenantId),
        list: (tenantId) => postgres.listTasks(tenantId),
        findById: (id, tenantId) => postgres.findTaskById(id, tenantId),
        updateStatus: (id, status, tenantId) =>
          postgres.updateTaskStatus(id, status, tenantId)
      },
      approvals: {
        save: (request, tenantId) => postgres.saveApproval(request, tenantId),
        findById: (id, tenantId) => postgres.findApprovalById(id, tenantId),
        list: (tenantId) => postgres.listApprovals(tenantId)
      },
      audit: {
        append: (input, tenantId) =>
          config.kind === 'postgres-pool'
            ? postgres.appendAudit(input, tenantId)
            : postgres.appendAudit(input),
        listBySession: (sessionId, tenantId: TenantId) =>
          postgres.listAuditBySession(sessionId, tenantId),
        listEvidence: (query: AuditEvidenceQuery, tenantId: TenantId) =>
          postgres.listAuditEvidence(query, tenantId),
        summarizeEvidence: (
          filters: AuditEvidenceFilters,
          tenantId: TenantId
        ) => postgres.summarizeAuditEvidence(filters, tenantId)
      }
    }
  }

  const db = new InMemoryDatabase()
  return {
    conversations: new ConversationRepository(db),
    tasks: new TaskRepository(db),
    approvals: new ApprovalRepository(db),
    audit: new AuditRepository(db)
  }
}

function withDefaultCapabilityGateway(
  agentRuntime: AgentRuntimeOptions | undefined,
  approvalAuthority: CapabilityApprovalAuthority
): AgentRuntimeOptions | undefined {
  if (!agentRuntime || agentRuntime.capabilityGateway) {
    return agentRuntime
  }

  return {
    ...agentRuntime,
    capabilityGateway: createControlledCapabilityGateway({ approvalAuthority })
  }
}

function createCapabilityApprovalAuthority(
  configured: CapabilityApprovalAuthority | undefined,
  persistence: BuildServerOptions['persistence']
): CapabilityApprovalAuthority {
  if (configured) return configured
  if (persistence?.kind === 'postgres-pool') {
    return new TenantScopedPostgresCapabilityApprovalRepository(
      persistence.pool
    )
  }
  return new InMemoryCapabilityApprovalAuthority()
}

function withDefaultInboundCompletion(
  agentRuntime: AgentRuntimeOptions | undefined,
  persistence: BuildServerOptions['persistence']
): AgentRuntimeOptions | undefined {
  if (
    !agentRuntime ||
    agentRuntime.completeInboundRuntime ||
    persistence?.kind !== 'postgres-pool'
  ) {
    return agentRuntime
  }
  const runtime = new TenantScopedPostgresRuntimeRepository(persistence.pool)
  return {
    ...agentRuntime,
    completeInboundRuntime: (input) => runtime.completeInboundRuntime(input)
  }
}

export async function buildServerFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  options: BuildServerFromEnvOptions = {}
) {
  if (!['development', 'test', 'production'].includes(env.NODE_ENV ?? '')) {
    throw new Error(
      'NODE_ENV must be explicitly set to development, test or production'
    )
  }
  const persistenceMode = env.API_PERSISTENCE_MODE ?? 'memory'
  const { webhookReplayStore, ...buildOptions } = options
  if (persistenceMode !== 'memory' && persistenceMode !== 'postgres') {
    throw new Error('API_PERSISTENCE_MODE must be memory or postgres')
  }
  if (env.NODE_ENV === 'production' && persistenceMode !== 'postgres') {
    throw new Error(
      'Production requires PostgreSQL persistence; in-memory mode is forbidden'
    )
  }
  if (persistenceMode === 'memory') {
    const configuredWebhookVerifier = createConfiguredWebhookVerifier(
      env,
      buildOptions.webhookVerifier,
      webhookReplayStore
    )
    const configuredInboundAgentRuntime = createConfiguredInboundAgentRuntime(
      env,
      buildOptions.agentRuntime
    )
    const app = buildServer({
      ...buildOptions,
      ...(configuredInboundAgentRuntime
        ? { agentRuntime: configuredInboundAgentRuntime }
        : {}),
      ...(configuredWebhookVerifier
        ? { webhookVerifier: configuredWebhookVerifier }
        : {}),
      persistence: { kind: 'memory' }
    })
    if (env.NODE_ENV === 'development') {
      try {
        await ensureControlledSecretaryPreset(app.platform)
      } catch (error) {
        await app.close()
        throw error
      }
    }
    return app
  }

  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for PostgreSQL persistence mode')
  }

  if (
    env.NODE_ENV === 'production' &&
    env.POSTGRES_RLS_ENFORCEMENT !== 'true'
  ) {
    throw new Error(
      'Production requires tenant-scoped PostgreSQL RLS enforcement'
    )
  }

  const configuredInboundTenantResolver = createConfiguredInboundTenantResolver(
    env,
    buildOptions.inboundTenantResolver
  )
  const configuredInboundAgentRuntime = createConfiguredInboundAgentRuntime(
    env,
    buildOptions.agentRuntime
  )
  const effectiveBuildOptions = {
    ...buildOptions,
    ...(configuredInboundTenantResolver
      ? { inboundTenantResolver: configuredInboundTenantResolver }
      : {}),
    ...(configuredInboundAgentRuntime
      ? { agentRuntime: configuredInboundAgentRuntime }
      : {})
  }
  if (
    env.NODE_ENV === 'production' &&
    !effectiveBuildOptions.operatorIdentityResolver
  ) {
    throw new Error(
      'Production requires an injected operator identity resolver'
    )
  }

  const schemaName = env.POSTGRES_SCHEMA?.trim() || undefined
  assertSafeRuntimeSchemaName(schemaName)
  const pool = createPostgresPool(env.DATABASE_URL, schemaName)
  const migrationPool = env.DATABASE_MIGRATION_URL
    ? createPostgresPool(env.DATABASE_MIGRATION_URL, schemaName)
    : pool
  const closePools = async () => {
    if (migrationPool !== pool) await migrationPool.end()
    await pool.end()
  }

  let configuredWebhookVerifier: WebhookVerifier | undefined
  try {
    const effectiveReplayStore =
      webhookReplayStore ??
      (env.NODE_ENV === 'production'
        ? new PostgresWebhookReplayStore(pool)
        : undefined)
    configuredWebhookVerifier = createConfiguredWebhookVerifier(
      env,
      effectiveBuildOptions.webhookVerifier,
      effectiveReplayStore
    )
    let migrationRoleName: string | undefined
    let runtimeRoleName: string | undefined
    if (env.POSTGRES_RLS_ENFORCEMENT === 'true') {
      const runtimeCheckClient = await pool.connect()
      try {
        await assertRuntimeRoleIsNotRlsBypass(runtimeCheckClient)
        runtimeRoleName = await readCurrentDatabaseRole(runtimeCheckClient)
      } finally {
        runtimeCheckClient.release()
      }
      if (env.NODE_ENV === 'production' && !env.DATABASE_MIGRATION_URL) {
        throw new Error(
          'Production tenant RLS requires a separate DATABASE_MIGRATION_URL'
        )
      }
      const migrationIdentityClient = await migrationPool.connect()
      try {
        migrationRoleName = await readCurrentDatabaseRole(
          migrationIdentityClient
        )
        await assertMigrationRoleSecurityBoundary(
          migrationIdentityClient,
          runtimeRoleName
        )
      } finally {
        migrationIdentityClient.release()
      }
    }

    if (env.POSTGRES_AUTO_MIGRATE === 'true') {
      if (env.NODE_ENV === 'production' && !env.DATABASE_MIGRATION_URL) {
        throw new Error(
          'Production auto-migration requires a separate DATABASE_MIGRATION_URL'
        )
      }
      const migrationClient = await migrationPool.connect()
      try {
        const migrationOptions = schemaName
          ? {
              schemaName,
              ...(env.DATABASE_MIGRATION_URL ? { createSchema: false } : {})
            }
          : {}
        if (env.POSTGRES_RLS_ENFORCEMENT === 'true') {
          await runPostgresMigrations(migrationClient, migrationOptions)
        } else {
          await runInitialPostgresMigration(migrationClient, migrationOptions)
        }
      } finally {
        migrationClient.release()
      }
    }
    if (env.POSTGRES_RLS_ENFORCEMENT === 'true') {
      const migrationRoleClient = await migrationPool.connect()
      try {
        await assertMigrationRoleIsLeastPrivilege(
          migrationRoleClient,
          runtimeRoleName
        )
      } finally {
        migrationRoleClient.release()
      }
      const runtimeSchemaClient = await pool.connect()
      try {
        await assertRuntimeRoleIsLeastPrivilege(
          runtimeSchemaClient,
          migrationRoleName
        )
        if (runtimeRoleName === migrationRoleName) {
          throw new Error(
            'PostgreSQL runtime and migration roles must be distinct'
          )
        }
        await assertTenantIsolationMigrationState(runtimeSchemaClient)
        await assertTenantIsolationSchema(runtimeSchemaClient)
        await assertWebhookReplaySchema(runtimeSchemaClient)
      } finally {
        runtimeSchemaClient.release()
      }
    }
  } catch (error) {
    await closePools()
    throw error
  }

  const useTenantScopedPersistence = env.POSTGRES_RLS_ENFORCEMENT === 'true'
  const persistenceConfig = useTenantScopedPersistence
    ? ({ kind: 'postgres-pool', pool } as const)
    : ({ kind: 'postgres', client: await pool.connect() } as const)
  const legacyClient =
    persistenceConfig.kind === 'postgres' ? persistenceConfig.client : null

  const app = buildServer({
    ...effectiveBuildOptions,
    ...(configuredWebhookVerifier
      ? { webhookVerifier: configuredWebhookVerifier }
      : {}),
    ...(env.NODE_ENV === 'production'
      ? { requireAuthenticatedMutations: true }
      : {}),
    persistence: persistenceConfig
  })
  app.addHook('onClose', async () => {
    legacyClient?.release()
    await closePools()
  })
  return app
}

function createConfiguredWebhookVerifier(
  env: NodeJS.ProcessEnv,
  configuredVerifier: WebhookVerifier | undefined,
  replayStore: WebhookReplayStore | undefined
): WebhookVerifier | undefined {
  if (configuredVerifier) return configuredVerifier
  if (env.NODE_ENV === 'test') return undefined
  const secret = env.WEBHOOK_SIGNING_SECRET?.trim()
  if (!secret) {
    throw new Error(
      'WEBHOOK_SIGNING_SECRET is required outside test mode when no verifier is injected'
    )
  }
  if (
    env.NODE_ENV === 'production' &&
    (secret.length < 32 || /replace[_-]?me|change[_-]?me|example/i.test(secret))
  ) {
    throw new Error(
      'Production webhook signing secret must contain at least 32 non-placeholder characters'
    )
  }
  if (env.NODE_ENV === 'production' && !replayStore) {
    throw new Error(
      'Production requires a distributed webhook replay store when no verifier is injected'
    )
  }
  return new HmacWebhookVerifier({
    secret,
    ...(replayStore ? { replayStore } : {})
  }).verifyWithLease
}

function createConfiguredInboundTenantResolver(
  env: NodeJS.ProcessEnv,
  configuredResolver: InboundTenantResolver | undefined
): InboundTenantResolver | undefined {
  if (configuredResolver || env.NODE_ENV !== 'production') {
    return configuredResolver
  }
  const tenantId = TenantIdSchema.safeParse(env.INBOUND_TENANT_ID?.trim())
  if (!tenantId.success) {
    throw new Error(
      'Production requires INBOUND_TENANT_ID or an injected tenant resolver'
    )
  }
  return () => tenantId.data
}

function createConfiguredInboundAgentRuntime(
  env: NodeJS.ProcessEnv,
  configuredRuntime: AgentRuntimeOptions | undefined
): AgentRuntimeOptions | undefined {
  if (configuredRuntime) return configuredRuntime
  const rawAgentId = env.INBOUND_AGENT_ID?.trim()
  if (!rawAgentId) {
    if (env.NODE_ENV === 'production') {
      throw new Error(
        'Production requires INBOUND_AGENT_ID or an injected agent runtime'
      )
    }
    return undefined
  }
  const agentId = AgentIdSchema.safeParse(rawAgentId)
  if (!agentId.success) {
    throw new Error('INBOUND_AGENT_ID must be a valid agent id')
  }
  return {
    resolveAgentId: () => agentId.data
  }
}

function isWebhookVerificationLease(
  value: WebhookVerification
): value is WebhookVerificationLease {
  return (
    typeof value === 'object' &&
    value !== null &&
    value.verified === true &&
    typeof value.commit === 'function' &&
    typeof value.release === 'function'
  )
}
