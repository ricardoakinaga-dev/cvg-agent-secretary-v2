import { z } from 'zod'
import {
  AgentIdSchema,
  AgentVersionIdSchema,
  TenantIdSchema,
  TraceIdSchema,
  type AgentId,
  type AgentVersionId,
  type TenantId,
  type TraceId,
  type TestSuiteId,
  type TestSuiteRunId,
  type PluginCatalogId
} from './ids.ts'

export const TenantScopeSchema = z.object({ tenantId: TenantIdSchema }).strict()
export type TenantScope = z.infer<typeof TenantScopeSchema>

export const AgentVersionStatusSchema = z.enum([
  'DRAFT',
  'TESTING',
  'APPROVED',
  'PUBLISHED',
  'ARCHIVED'
])
export type AgentVersionStatus = z.infer<typeof AgentVersionStatusSchema>

const PromptBlockKindSchema = z.enum([
  'system',
  'persona',
  'instruction',
  'safety',
  'context',
  'response'
])

export const PromptBlockSchema = z
  .object({
    id: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[A-Za-z0-9._:-]+$/),
    kind: PromptBlockKindSchema,
    content: z.string().trim().min(1).max(8000),
    priority: z.number().int().min(-10000).max(10000),
    enabled: z.boolean().default(true)
  })
  .strict()
export type PromptBlock = z.infer<typeof PromptBlockSchema>

const SecretRefSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^secret:\/\/[A-Za-z0-9._:/-]+$/)

export const ModelConfigSchema = z
  .object({
    provider: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[A-Za-z0-9._:-]+$/),
    model: z.string().trim().min(1).max(160),
    temperature: z.number().min(0).max(2),
    maxTokens: z.number().int().min(1).max(200000),
    timeoutMs: z.number().int().min(100).max(120000),
    retries: z.number().int().min(0).max(5),
    fallbackProvider: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[A-Za-z0-9._:-]+$/)
      .optional(),
    secretRef: SecretRefSchema.optional()
  })
  .strict()
export type ModelConfig = z.infer<typeof ModelConfigSchema>

export const PolicyBundleSchema = z
  .object({
    version: z.string().trim().min(1).max(120),
    minConfidence: z.number().min(0).max(1),
    lowConfidence: z.enum(['clarify', 'handoff']),
    maxClarifications: z.number().int().min(0).max(5),
    enabledActions: z.array(z.string().trim().min(1).max(120)).max(256),
    approvalActions: z.array(z.string().trim().min(1).max(120)).max(256),
    blockedActions: z.array(z.string().trim().min(1).max(120)).max(256)
  })
  .strict()
export type PolicyBundle = z.infer<typeof PolicyBundleSchema>

export const PluginBindingSchema = z
  .object({
    plugin: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[A-Za-z0-9._:-]+$/),
    version: z.string().trim().min(1).max(80).optional(),
    enabled: z.boolean(),
    allowedTools: z
      .array(
        z
          .string()
          .trim()
          .min(1)
          .max(120)
          .regex(/^[A-Za-z0-9._:-]+$/)
      )
      .max(128),
    config: z.record(z.string(), z.unknown())
  })
  .strict()
export type PluginBinding = z.infer<typeof PluginBindingSchema>

export const KnowledgeBindingSchema = z
  .object({
    source: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .regex(/^controlled:\/\//),
    version: z.string().trim().min(1).max(120),
    enabled: z.boolean(),
    requiresApprovedSource: z.boolean()
  })
  .strict()
export type KnowledgeBinding = z.infer<typeof KnowledgeBindingSchema>

export const HandoffConfigSchema = z
  .object({
    lowConfidenceDestination: z.string().trim().min(1).max(120),
    destinations: z.array(z.string().trim().min(1).max(120)).min(1).max(32),
    maxClarifications: z.number().int().min(0).max(5)
  })
  .strict()
export type HandoffConfig = z.infer<typeof HandoffConfigSchema>

export const FeatureFlagsSchema = z
  .record(
    z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[A-Za-z0-9._:-]+$/),
    z.boolean()
  )
  .refine((flags) => Object.keys(flags).length <= 64)
export type FeatureFlags = z.infer<typeof FeatureFlagsSchema>

const sensitiveKeyPattern =
  /(api.?key|access.?token|client.?secret|credential|password|private.?key)/i
const secretValuePattern = /^(sk-|pk_|Bearer\s|ghp_|xox[baprs]-)/i

function assertNoSecretValues(value: unknown, path: string): void {
  if (typeof value === 'string') {
    if (secretValuePattern.test(value)) {
      throw new Error(`Sensitive credential value at ${path}`)
    }
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoSecretValues(item, `${path}[${index}]`)
    )
    return
  }
  if (typeof value !== 'object' || value === null) return

  Object.entries(value).forEach(([key, child]) => {
    if (key !== 'secretRef' && sensitiveKeyPattern.test(key)) {
      throw new Error(`Sensitive credential field at ${path}.${key}`)
    }
    assertNoSecretValues(child, `${path}.${key}`)
  })
}

export const AgentConfigSchema = z
  .object({
    persona: z
      .object({
        name: z.string().trim().min(1).max(120),
        role: z.string().trim().min(1).max(160),
        tone: z.string().trim().min(1).max(120)
      })
      .strict(),
    greeting: z.string().trim().min(1).max(2000),
    promptBlocks: z.array(PromptBlockSchema).max(64),
    responseTemplates: z
      .record(z.string(), z.string().trim().min(1).max(4000))
      .refine((templates) => Object.keys(templates).length <= 128),
    model: ModelConfigSchema,
    featureFlags: FeatureFlagsSchema.default({}),
    policies: PolicyBundleSchema,
    plugins: z.array(PluginBindingSchema).max(128),
    knowledge: z.array(KnowledgeBindingSchema).max(64),
    handoff: HandoffConfigSchema
  })
  .strict()
  .superRefine((value, context) => {
    try {
      assertNoSecretValues(value, 'config')
    } catch (error) {
      context.addIssue({
        code: 'custom',
        message: error instanceof Error ? error.message : 'Sensitive value'
      })
    }
  })
export type AgentConfig = z.infer<typeof AgentConfigSchema>

export const AgentCreateInputSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[a-z][a-z0-9-]+$/),
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(1000)
  })
  .strict()
export type AgentCreateInput = z.infer<typeof AgentCreateInputSchema>

export interface AgentRecord {
  tenantId: TenantId
  id: AgentId
  slug: string
  name: string
  description: string
  activeVersionId: AgentVersionId | null
  createdAt: Date
  updatedAt: Date
}

export interface AgentVersionRecord {
  tenantId: TenantId
  id: AgentVersionId
  agentId: AgentId
  version: number
  status: AgentVersionStatus
  config: AgentConfig
  createdBy: string
  createdAt: Date
  publishedAt: Date | null
}

export const PlatformDecisionSchema = z.enum([
  'allowed',
  'blocked',
  'requires_approval',
  'handoff',
  'clarify'
])
export type PlatformDecision = z.infer<typeof PlatformDecisionSchema>

export const AgentExecutionModeSchema = z.enum([
  'TEST_LAB',
  'CONTROLLED_RUNTIME'
])
export type AgentExecutionMode = z.infer<typeof AgentExecutionModeSchema>

export interface PlatformPolicyResult {
  decision: PlatformDecision
  layer: 'hard_safety' | 'organization' | 'agent_behavior'
  reason: string
  policyVersion: string
}

export const PluginToolSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[A-Za-z0-9._:-]+$/),
    permission: z.string().trim().min(1).max(160),
    risk: z.enum(['low', 'medium', 'high', 'critical']),
    requiresApproval: z.boolean()
  })
  .strict()

export const PluginManifestSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[A-Za-z0-9._:-]+$/),
    version: z.string().trim().min(1).max(80),
    capabilities: z.array(z.string().trim().min(1).max(160)).max(128),
    permissions: z.array(z.string().trim().min(1).max(160)).max(128),
    tools: z.array(PluginToolSchema).max(128),
    hooks: z.array(z.string().trim().min(1).max(160)).max(128),
    dependencies: z.array(z.string().trim().min(1).max(160)).max(128),
    configSchemaVersion: z.string().trim().min(1).max(80)
  })
  .strict()
  .superRefine((manifest, context) => {
    const assertUnique = (values: string[], path: string) => {
      const seen = new Set<string>()
      values.forEach((value, index) => {
        if (seen.has(value)) {
          context.addIssue({
            code: 'custom',
            path: [path, index],
            message: `${path} entries must be unique`
          })
        }
        seen.add(value)
      })
    }

    assertUnique(manifest.capabilities, 'capabilities')
    assertUnique(manifest.permissions, 'permissions')
    assertUnique(
      manifest.tools.map((tool) => tool.name),
      'tools'
    )
    assertUnique(manifest.hooks, 'hooks')
    assertUnique(manifest.dependencies, 'dependencies')

    manifest.tools.forEach((tool, index) => {
      if (!manifest.permissions.includes(tool.permission)) {
        context.addIssue({
          code: 'custom',
          path: ['tools', index, 'permission'],
          message: 'Tool permission must be declared by the manifest'
        })
      }
    })
    if (manifest.dependencies.includes(manifest.name)) {
      context.addIssue({
        code: 'custom',
        path: ['dependencies'],
        message: 'Plugin cannot depend on itself'
      })
    }
  })
export type PluginManifest = z.infer<typeof PluginManifestSchema>
export type PluginTool = z.infer<typeof PluginToolSchema>

export const PluginCatalogStatusSchema = z.enum([
  'DRAFT',
  'APPROVED',
  'ARCHIVED'
])
export type PluginCatalogStatus = z.infer<typeof PluginCatalogStatusSchema>

export const PluginCatalogCreateInputSchema = z
  .object({ manifest: PluginManifestSchema })
  .strict()
export type PluginCatalogCreateInput = z.infer<
  typeof PluginCatalogCreateInputSchema
>

export const PluginCatalogTransitionInputSchema = z
  .object({
    target: PluginCatalogStatusSchema,
    expectedStatus: PluginCatalogStatusSchema.optional()
  })
  .strict()
export type PluginCatalogTransitionInput = z.infer<
  typeof PluginCatalogTransitionInputSchema
>

export interface PluginCatalogRecord {
  tenantId: TenantId
  id: PluginCatalogId
  manifest: PluginManifest
  status: PluginCatalogStatus
  createdBy: string
  approvedBy: string | null
  createdAt: Date
  updatedAt: Date
}

export type TraceSpanName =
  | 'normalize'
  | 'context'
  | 'intent'
  | 'policy'
  | 'knowledge'
  | 'prompt'
  | 'model'
  | 'tool'
  | 'response'
  | 'handoff'
  | 'delivery'

export type TraceSpanStatus = 'completed' | 'blocked' | 'skipped'

export interface TestRunTraceSpan {
  name: TraceSpanName
  status: TraceSpanStatus
  durationMs: number
}

export interface TestRunTrace {
  traceId: TraceId
  tenantId: TenantId
  agentId: AgentId
  versionId: AgentVersionId
  input: { message: string; historySize: number }
  intent: { name: string; confidence: number }
  risk?: {
    level: 'low' | 'medium' | 'high' | 'critical'
    reason: string
  }
  policy: PlatformPolicyResult[]
  knowledge: {
    status: 'not_requested' | 'approved_source_missing' | 'answered' | 'handoff'
    source?: string
    version?: string
  }
  tools: Array<{
    name: string
    status: 'not_run' | 'blocked' | 'succeeded' | 'failed'
  }>
  toolResults?: Array<{
    name: string
    status: 'not_run' | 'blocked' | 'succeeded' | 'failed'
    output: { redacted: true } | null
  }>
  handoff: {
    requested: boolean
    reason: string | null
    state: 'BOT_ACTIVE' | 'HANDOFF_REQUESTED'
  }
  response: {
    text: string
    mode: 'answer' | 'clarify' | 'handoff' | 'blocked'
  }
  provider: { provider: string; model: string; externalCall: false }
  prompt?: { version: string; blockIds: string[] }
  configVersion: string
  executionMode: AgentExecutionMode
  status?: 'completed' | 'blocked' | 'failed'
  startedAt?: Date
  completedAt?: Date
  latencyMs?: number
  tokenUsage?: {
    prompt: number
    completion: number
    total: number
    estimated: true
  }
  spans?: TestRunTraceSpan[]
  conversationId?: string
  sessionId?: string
  createdAt: Date
}

export const TestLabCaseSchema = z
  .object({
    id: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[A-Za-z0-9._:-]+$/),
    message: z.string().trim().min(1).max(4000),
    history: z.array(z.string().max(4000)).max(50).default([]),
    expectedPolicyDecision: PlatformDecisionSchema.optional(),
    expectedResponseMode: z.enum(['answer', 'clarify', 'handoff', 'blocked']),
    expectedHandoff: z.boolean().optional(),
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
export type TestLabCase = z.infer<typeof TestLabCaseSchema>

export const TestSuiteCreateInputSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[a-z][a-z0-9-]+$/),
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(1000),
    agentId: AgentIdSchema,
    versionId: AgentVersionIdSchema,
    cases: z.array(TestLabCaseSchema).min(1).max(100)
  })
  .strict()
export type TestSuiteCreateInput = z.infer<typeof TestSuiteCreateInputSchema>

export const TestSuiteCloneInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(1000).optional(),
    versionId: AgentVersionIdSchema.optional(),
    cases: z.array(TestLabCaseSchema).min(1).max(100).optional()
  })
  .strict()
export type TestSuiteCloneInput = z.infer<typeof TestSuiteCloneInputSchema>

export interface TestSuiteRecord {
  tenantId: TenantId
  id: TestSuiteId
  slug: string
  name: string
  description: string
  agentId: AgentId
  versionId: AgentVersionId
  version: number
  cases: TestLabCase[]
  previousSuiteId: TestSuiteId | null
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface TestLabEvaluation {
  caseId: string
  passed: boolean
  failures: string[]
  trace: TestRunTrace
}

export interface TestLabSuiteResult {
  passed: boolean
  results: TestLabEvaluation[]
}

export interface TestSuiteVariantResult {
  label: 'A' | 'B'
  versionId: AgentVersionId
  passed: boolean
  results: TestLabEvaluation[]
}

export interface TestSuiteRunRecord {
  tenantId: TenantId
  id: TestSuiteRunId
  suiteId: TestSuiteId
  agentId: AgentId
  variants: TestSuiteVariantResult[]
  passed: boolean
  createdBy: string
  createdAt: Date
}

export type PlatformIds = {
  tenantId: TenantId
  agentId: AgentId
  versionId: AgentVersionId
}

export function assertPlatformIds(input: PlatformIds): void {
  TenantIdSchema.parse(input.tenantId)
  AgentIdSchema.parse(input.agentId)
  AgentVersionIdSchema.parse(input.versionId)
}

export function assertTraceId(traceId: string): asserts traceId is TraceId {
  TraceIdSchema.parse(traceId)
}
