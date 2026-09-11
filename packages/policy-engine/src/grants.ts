import { z } from 'zod'
import { RoleSchema } from '@cvg/shared'
import {
  CAPABILITY_CATALOG,
  CapabilitySchema,
  type Capability,
  type ToolRiskLevel
} from './capabilities.ts'

export const AgentProfileNameSchema = z.enum([
  'secretary',
  'hospitalization',
  'clinical',
  'financial',
  'admin'
])

export type AgentProfileName = z.infer<typeof AgentProfileNameSchema>

export const GrantLevelSchema = z.enum(['allow', 'require_approval'])
export type GrantLevel = z.infer<typeof GrantLevelSchema>

export interface CapabilityGrant {
  capability: Capability
  level: GrantLevel
  limitedFields?: boolean
  requiresMedicalOperator?: boolean
}

export const RoleNameSchema = RoleSchema
export type RoleName = z.infer<typeof RoleNameSchema>

const READ_CAPABILITIES: Capability[] = [
  'schedule.read',
  'conversation.read',
  'patient.summary.read',
  'exam.read',
  'finance.read'
]

const SCHEDULING_CAPABILITIES: Capability[] = [
  'schedule.read',
  'appointment.create',
  'appointment.modify',
  'conversation.read',
  'message.draft',
  'message.send',
  'patient.summary.read'
]

/**
 * Capability ceiling per agent profile. Absence is DENY. Policies can only
 * restrict these grants, never expand them.
 */
export const AGENT_PROFILE_GRANTS: Readonly<
  Record<AgentProfileName, readonly CapabilityGrant[]>
> = {
  secretary: [
    { capability: 'schedule.read', level: 'allow' },
    { capability: 'appointment.create', level: 'allow' },
    { capability: 'appointment.modify', level: 'allow' },
    { capability: 'appointment.cancel', level: 'require_approval' },
    { capability: 'conversation.read', level: 'allow' },
    { capability: 'message.draft', level: 'allow' },
    { capability: 'message.send', level: 'allow' },
    { capability: 'patient.summary.read', level: 'allow', limitedFields: true }
  ],
  hospitalization: [
    { capability: 'schedule.read', level: 'allow' },
    { capability: 'conversation.read', level: 'allow' },
    { capability: 'message.draft', level: 'allow' },
    { capability: 'message.send', level: 'allow' },
    { capability: 'patient.summary.read', level: 'allow' },
    { capability: 'patient.record.read', level: 'allow' },
    { capability: 'hospitalization.manage', level: 'require_approval' }
  ],
  clinical: [
    { capability: 'conversation.read', level: 'allow' },
    { capability: 'patient.summary.read', level: 'allow' },
    { capability: 'patient.record.read', level: 'allow' },
    { capability: 'exam.read', level: 'allow' },
    { capability: 'patient.record.write', level: 'require_approval' },
    { capability: 'exam.release', level: 'require_approval' },
    { capability: 'clinical.diagnose', level: 'require_approval' },
    {
      capability: 'clinical.prescribe',
      level: 'require_approval',
      requiresMedicalOperator: true
    }
  ],
  financial: [
    { capability: 'finance.read', level: 'allow' },
    { capability: 'finance.write', level: 'require_approval' }
  ],
  admin: [
    { capability: 'admin.policy.manage', level: 'require_approval' },
    { capability: 'admin.agent.manage', level: 'require_approval' },
    { capability: 'conversation.read', level: 'allow' },
    { capability: 'finance.read', level: 'allow' }
  ]
}

/**
 * Operator role ceiling. An agent cannot exercise a capability that the acting
 * operator role could not exercise either.
 */
export const OPERATOR_ROLE_CAPABILITIES: Readonly<
  Record<RoleName, readonly Capability[]>
> = {
  Operator: [...SCHEDULING_CAPABILITIES, ...READ_CAPABILITIES],
  Approver: [
    ...SCHEDULING_CAPABILITIES,
    ...READ_CAPABILITIES,
    'exam.release',
    'finance.write',
    'appointment.cancel',
    'patient.record.write'
  ],
  Supervisor: (Object.keys(CAPABILITY_CATALOG) as Capability[]).filter(
    (capability) => !capability.startsWith('admin.')
  ),
  Admin: Object.keys(CAPABILITY_CATALOG) as Capability[],
  System: Object.keys(CAPABILITY_CATALOG) as Capability[]
}

export const APPROVER_ROLES: readonly RoleName[] = [
  'Approver',
  'Supervisor',
  'Admin',
  'System'
]

export function grantFor(
  profile: AgentProfileName,
  capability: Capability
): CapabilityGrant | undefined {
  return AGENT_PROFILE_GRANTS[profile].find(
    (grant) => grant.capability === capability
  )
}

export function roleAllowsCapability(
  role: RoleName,
  capability: Capability
): boolean {
  return OPERATOR_ROLE_CAPABILITIES[role].includes(capability)
}

export function canApproveCapability(
  role: RoleName,
  capability: Capability
): boolean {
  if (!APPROVER_ROLES.includes(role)) return false
  if (role === 'Operator') return false
  return roleAllowsCapability(role, capability)
}

export function riskRequiresApproval(risk: ToolRiskLevel): boolean {
  return risk === 'HIGH_RISK_WRITE' || risk === 'ADMIN'
}

export const CapabilityGrantSchema = z.object({
  capability: CapabilitySchema,
  level: GrantLevelSchema,
  limitedFields: z.boolean().optional(),
  requiresMedicalOperator: z.boolean().optional()
})
