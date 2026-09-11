import { z } from 'zod'
import { DataClassificationSchema } from '@cvg/shared'
import { CapabilitySchema } from './capabilities.ts'
import { AgentProfileNameSchema, RoleNameSchema } from './grants.ts'

export const PolicyEffectSchema = z.enum(['ALLOW', 'DENY', 'REQUIRE_APPROVAL'])
export type PolicyEffect = z.infer<typeof PolicyEffectSchema>

export const PolicyRuleSchema = z
  .object({
    id: z.string().min(1).max(120),
    effect: PolicyEffectSchema,
    priority: z.number().int().min(-100).max(100).default(0),
    capabilities: z.array(CapabilitySchema).min(1).optional(),
    agentProfiles: z.array(AgentProfileNameSchema).min(1).optional(),
    roles: z.array(RoleNameSchema).min(1).optional(),
    actions: z.array(z.string().min(1).max(120)).min(1).optional(),
    resourceTypes: z.array(z.string().min(1).max(120)).min(1).optional(),
    /** Rule applies when the request classification rank is >= this value. */
    classificationAtLeast: DataClassificationSchema.optional(),
    reason: z.string().min(1).max(240)
  })
  .strict()

export type PolicyRule = z.output<typeof PolicyRuleSchema>
export type PolicyRuleInput = z.input<typeof PolicyRuleSchema>

export const PolicyDocumentSchema = z
  .object({
    policyId: z.string().min(1).max(120),
    version: z.string().min(1).max(60),
    tenantId: z.string().min(1).max(120).optional(),
    effectiveFrom: z.string().datetime(),
    effectiveUntil: z.string().datetime().optional(),
    rules: z.array(PolicyRuleSchema).min(1)
  })
  .strict()

export type PolicyDocument = z.output<typeof PolicyDocumentSchema>
export type PolicyDocumentInput = z.input<typeof PolicyDocumentSchema>

export const ENGINE_POLICY_ID = 'builtin.deny_by_default'
export const ENGINE_POLICY_VERSION = 'policy-engine-v1'

export function policyDocumentKey(policyId: string, version: string): string {
  return `${policyId}@${version}`
}

export class PolicyRegistryError extends Error {
  readonly code: 'policy_duplicate' | 'policy_unknown'

  constructor(code: PolicyRegistryError['code'], message: string) {
    super(message)
    this.name = 'PolicyRegistryError'
    this.code = code
  }
}

/**
 * Versioned policy document registry. Tenant documents are additive with global
 * documents; a tenant document can only make decisions stricter because rule
 * resolution takes the most restrictive matching effect.
 */
export class PolicyRegistry {
  readonly #documents = new Map<string, PolicyDocument>()

  register(input: PolicyDocumentInput): PolicyDocument {
    const parsed = PolicyDocumentSchema.parse(input)
    const key = policyDocumentKey(parsed.policyId, parsed.version)
    const existing = this.#documents.get(key)
    if (existing) {
      if (JSON.stringify(existing) !== JSON.stringify(parsed)) {
        throw new PolicyRegistryError(
          'policy_duplicate',
          `Policy ${key} is already registered with different content`
        )
      }
      return existing
    }
    this.#documents.set(key, parsed)
    return parsed
  }

  get(policyId: string, version: string): PolicyDocument | undefined {
    return this.#documents.get(policyDocumentKey(policyId, version))
  }

  list(): PolicyDocument[] {
    return [...this.#documents.values()]
  }

  effectiveFor(input: { tenantId: string; at: Date }): PolicyDocument[] {
    return this.list().filter((document) => {
      if (
        document.tenantId !== undefined &&
        document.tenantId !== input.tenantId
      ) {
        return false
      }
      if (input.at.getTime() < Date.parse(document.effectiveFrom)) return false
      if (
        document.effectiveUntil &&
        input.at.getTime() > Date.parse(document.effectiveUntil)
      ) {
        return false
      }
      return true
    })
  }
}
