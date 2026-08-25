import {
  createCorrelationId,
  sanitizeAuditEvidencePayload,
  type CorrelationId
} from '@cvg/shared'
import {
  PluginManifestSchema,
  type AgentConfig,
  type PluginManifest,
  type PluginTool,
  type PlatformPolicyResult
} from './contracts.ts'
import {
  type CapabilityApprovalAuthority,
  type CapabilityApprovalVerificationInput
} from './approval-authority.ts'
import { AgentIdSchema, AgentVersionIdSchema, TenantIdSchema } from './ids.ts'
import type { AgentId, AgentVersionId, TenantId } from './ids.ts'

export interface PluginHandlerContext {
  tenantId: TenantId
  agentId: AgentId
  versionId: AgentVersionId
  toolName: string
  dryRun: boolean
}

export interface PluginHandlerResult {
  status: 'succeeded' | 'failed' | 'blocked'
  data?: unknown
  error?: string
}

export type PluginHandler = (
  input: unknown,
  context: PluginHandlerContext
) => PluginHandlerResult | Promise<PluginHandlerResult>

export interface RegisteredPlugin {
  manifest: PluginManifest
  handlers: Record<string, PluginHandler>
}

export interface PluginAuditEvent {
  type: 'tool_call'
  correlationId: CorrelationId
  tenantId: TenantId
  agentId: AgentId
  versionId: AgentVersionId
  plugin: string
  toolName: string
  status: 'succeeded' | 'failed' | 'blocked'
  payload: unknown
}

export class PluginRegistry {
  private readonly plugins: RegisteredPlugin[]

  constructor(plugins: RegisteredPlugin[] = []) {
    this.plugins = plugins.map(cloneRegisteredPlugin)
  }

  register(plugin: RegisteredPlugin): PluginRegistry {
    const manifest = PluginManifestSchema.parse(plugin.manifest)
    if (this.get(manifest.name, manifest.version)) {
      throw new Error(
        `Plugin already registered: ${manifest.name}@${manifest.version}`
      )
    }
    const toolNames = new Set(manifest.tools.map((tool) => tool.name))
    const handlers = Object.fromEntries(
      Object.entries(plugin.handlers).filter(([name]) => toolNames.has(name))
    )
    if (Object.keys(handlers).length !== manifest.tools.length) {
      throw new Error('Every manifest tool requires a handler')
    }
    return new PluginRegistry([...this.plugins, { manifest, handlers }])
  }

  get(name: string, version?: string): RegisteredPlugin | null {
    const candidates = this.plugins.filter(
      (candidate) =>
        candidate.manifest.name === name &&
        (version === undefined || candidate.manifest.version === version)
    )
    const plugin = [...candidates].sort((left, right) =>
      comparePluginVersions(right.manifest.version, left.manifest.version)
    )[0]
    return plugin ? cloneRegisteredPlugin(plugin) : null
  }

  list(): RegisteredPlugin[] {
    return [...this.plugins]
      .sort((left, right) => {
        const byName = left.manifest.name.localeCompare(right.manifest.name)
        return byName !== 0
          ? byName
          : comparePluginVersions(left.manifest.version, right.manifest.version)
      })
      .map(cloneRegisteredPlugin)
  }
}

export interface CapabilityExecutionInput {
  tenantId: TenantId
  agentId: AgentId
  versionId: AgentVersionId
  config: AgentConfig
  toolName: string
  input: unknown
  actor: { id: string; role: string; permissions: string[] }
  policy: Pick<PlatformPolicyResult, 'decision' | 'reason'>
  approval?: CapabilityApproval
  requireApproval?: boolean
  dryRun: boolean
  onAudit?: (event: PluginAuditEvent) => void | Promise<void>
}

export interface CapabilityApproval {
  id: string
  tenantId: TenantId
  agentId: AgentId
  versionId: AgentVersionId
  toolName: string
  actorId: string
  expiresAt: Date
}

export interface CapabilityApprovalResolutionInput {
  tenantId: TenantId
  agentId: AgentId
  versionId: AgentVersionId
  toolName: string
  input: unknown
  actor: { id: string; role: string; permissions: string[] }
}

export type CapabilityApprovalResolver = (
  input: CapabilityApprovalResolutionInput
) => CapabilityApproval | null | Promise<CapabilityApproval | null>

export type CapabilityApprovalVerifier = (
  approval: CapabilityApproval,
  input: CapabilityExecutionInput
) => boolean | Promise<boolean>

export interface CapabilityGatewayOptions {
  approvalVerifier?: CapabilityApprovalVerifier
  approvalAuthority?: CapabilityApprovalAuthority
}

export interface CapabilityExecutionResult {
  status: 'succeeded' | 'failed' | 'blocked'
  reason?: string
  data?: unknown
  correlationId: CorrelationId
}

export class CapabilityGateway {
  constructor(
    private readonly registry: PluginRegistry,
    private readonly options: CapabilityGatewayOptions = {}
  ) {}

  async execute(
    input: CapabilityExecutionInput
  ): Promise<CapabilityExecutionResult> {
    const correlationId = createCorrelationId()
    if (
      !TenantIdSchema.safeParse(input.tenantId).success ||
      !AgentIdSchema.safeParse(input.agentId).success ||
      !AgentVersionIdSchema.safeParse(input.versionId).success
    ) {
      return {
        status: 'blocked',
        reason: 'invalid_scope_id',
        correlationId
      }
    }
    const binding = input.config.plugins.find(
      (candidate) =>
        candidate.enabled && candidate.allowedTools.includes(input.toolName)
    )
    if (!binding) {
      return this.blocked(input, correlationId, 'plugin_binding_missing')
    }

    const registered = this.registry.get(binding.plugin, binding.version)
    if (!registered) {
      return this.blocked(
        input,
        correlationId,
        binding.version
          ? 'plugin_version_not_registered'
          : 'plugin_not_registered'
      )
    }
    const tool = registered.manifest.tools.find(
      (candidate) => candidate.name === input.toolName
    )
    const handler = registered.handlers[input.toolName]
    if (!tool || !handler) {
      return this.blocked(input, correlationId, 'tool_not_registered')
    }
    if (!registered.manifest.permissions.includes(tool.permission)) {
      return this.blocked(
        input,
        correlationId,
        'plugin_permission_not_declared'
      )
    }
    if (!input.actor.permissions.includes(tool.permission)) {
      return this.blocked(input, correlationId, 'permission_denied')
    }
    if (input.policy.decision === 'blocked') {
      return this.blocked(input, correlationId, 'policy_blocked')
    }
    if (
      input.policy.decision !== 'allowed' &&
      input.policy.decision !== 'requires_approval'
    ) {
      return this.blocked(
        input,
        correlationId,
        `policy_${input.policy.decision}`
      )
    }
    const approvalRequired =
      input.requireApproval === true ||
      input.policy.decision === 'requires_approval' ||
      tool.requiresApproval
    if (
      approvalRequired &&
      !(await this.hasValidApproval(input, correlationId))
    ) {
      return this.blocked(input, correlationId, 'approval_required')
    }

    try {
      const result = await handler(input.input, {
        tenantId: input.tenantId,
        agentId: input.agentId,
        versionId: input.versionId,
        toolName: input.toolName,
        dryRun: input.dryRun
      })
      await this.audit(input, correlationId, result.status, result.data)
      return { ...result, correlationId }
    } catch {
      await this.audit(input, correlationId, 'failed', undefined)
      return {
        status: 'failed',
        reason: 'tool_execution_failed',
        correlationId
      }
    }
  }

  private async hasValidApproval(
    input: CapabilityExecutionInput,
    correlationId: CorrelationId
  ): Promise<boolean> {
    const approval = input.approval
    const authority = this.options.approvalAuthority
    const verifier = this.options.approvalVerifier
    if (!approval) return false
    if (
      TenantIdSchema.safeParse(input.tenantId).success === false ||
      AgentIdSchema.safeParse(input.agentId).success === false ||
      AgentVersionIdSchema.safeParse(input.versionId).success === false ||
      approval.tenantId !== input.tenantId ||
      approval.agentId !== input.agentId ||
      approval.versionId !== input.versionId ||
      approval.toolName !== input.toolName ||
      approval.actorId !== input.actor.id ||
      !Number.isFinite(approval.expiresAt.getTime()) ||
      approval.expiresAt.getTime() <= Date.now()
    ) {
      return false
    }
    try {
      if (authority) {
        const verification: CapabilityApprovalVerificationInput = {
          approvalId: approval.id,
          tenantId: input.tenantId,
          agentId: input.agentId,
          versionId: input.versionId,
          toolName: input.toolName,
          input: input.input,
          actorId: input.actor.id,
          consumptionAudit: {
            correlationId,
            policyVersion: 'capability-approval-v1'
          }
        }
        return Boolean(await authority.verifyAndConsume(verification))
      }
      if (!verifier) return false
      return await verifier(approval, input)
    } catch {
      return false
    }
  }

  private async blocked(
    input: CapabilityExecutionInput,
    correlationId: CorrelationId,
    reason: string
  ): Promise<CapabilityExecutionResult> {
    await this.audit(input, correlationId, 'blocked', { reason })
    return { status: 'blocked', reason, correlationId }
  }

  private async audit(
    input: CapabilityExecutionInput,
    correlationId: CorrelationId,
    status: PluginAuditEvent['status'],
    data: unknown
  ): Promise<void> {
    if (!input.onAudit) return
    const sanitized = sanitizeAuditEvidencePayload({
      toolName: input.toolName,
      input: input.input,
      result: data
    })
    await input.onAudit({
      type: 'tool_call',
      correlationId,
      tenantId: input.tenantId,
      agentId: input.agentId,
      versionId: input.versionId,
      plugin:
        input.config.plugins.find((binding) =>
          binding.allowedTools.includes(input.toolName)
        )?.plugin ?? 'unknown',
      toolName: input.toolName,
      status,
      payload: sanitized.payload
    })
  }
}

function cloneRegisteredPlugin(plugin: RegisteredPlugin): RegisteredPlugin {
  return {
    manifest: {
      ...plugin.manifest,
      capabilities: [...plugin.manifest.capabilities],
      permissions: [...plugin.manifest.permissions],
      tools: plugin.manifest.tools.map(cloneTool),
      hooks: [...plugin.manifest.hooks],
      dependencies: [...plugin.manifest.dependencies]
    },
    handlers: { ...plugin.handlers }
  }
}

function cloneTool(tool: PluginTool): PluginTool {
  return { ...tool }
}

function comparePluginVersions(left: string, right: string): number {
  const leftParts = numericVersionParts(left)
  const rightParts = numericVersionParts(right)
  if (leftParts && rightParts) {
    for (let index = 0; index < leftParts.length; index += 1) {
      const difference = leftParts[index]! - rightParts[index]!
      if (difference !== 0) return difference
    }
    return left.localeCompare(right)
  }
  return left.localeCompare(right)
}

function numericVersionParts(value: string): [number, number, number] | null {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(value)
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null
}
