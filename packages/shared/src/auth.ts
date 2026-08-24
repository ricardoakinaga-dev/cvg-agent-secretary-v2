import { z } from 'zod'
import type { Role } from './enums.ts'

const permissionsByRole: Record<Role, string[]> = {
  Operator: [
    'approval:view',
    'approval:execute',
    'audit:view_limited',
    'conversation:view_assigned',
    'conversation:assume',
    'task:view',
    'task:update'
  ],
  Approver: [
    'approval:view',
    'approval:decide',
    'audit:view_limited',
    'conversation:view_assigned',
    'task:view'
  ],
  Supervisor: [
    'approval:view',
    'approval:decide',
    'audit:view_full',
    'conversation:view_assigned',
    'conversation:assume',
    'safety:review',
    'task:view'
  ],
  Admin: [
    'approval:view',
    'audit:view_full',
    'channel:configure',
    'conversation:view_assigned',
    'conversation:assume',
    'agent:view',
    'agent:configure',
    'plugin:configure',
    'policy:configure',
    'test:run',
    'task:view'
  ],
  System: ['tool:execute_policy_allowed', 'audit:create']
}

export function roleHasPermission(role: Role, permission: string): boolean {
  return permissionsByRole[role].includes(permission)
}

export function requirePermission(role: Role, permission: string): void {
  if (!roleHasPermission(role, permission)) {
    throw new Error(`Role ${role} cannot perform ${permission}`)
  }
}

export const OperatorRoleSchema = z.enum([
  'Operator',
  'Approver',
  'Supervisor',
  'Admin'
])
export type OperatorRole = z.infer<typeof OperatorRoleSchema>

export const OperatorIdentitySchema = z.object({
  operatorId: z
    .string()
    .trim()
    .min(3)
    .max(80)
    .regex(/^[A-Za-z0-9._:-]+$/),
  role: OperatorRoleSchema,
  tenantId: z
    .string()
    .trim()
    .regex(/^tenant_[0-9a-f-]{36}$/)
    .optional()
})
export type OperatorIdentity = z.infer<typeof OperatorIdentitySchema>

function readHeaderValue(value: unknown): unknown {
  if (Array.isArray(value)) return value[0]
  return value
}

export function parseOperatorIdentity(
  headers: Record<string, unknown>
): OperatorIdentity {
  const tenantId = readHeaderValue(headers['x-tenant-id'])
  return OperatorIdentitySchema.parse({
    operatorId: readHeaderValue(headers['x-operator-id']),
    role: readHeaderValue(headers['x-operator-role']),
    ...(tenantId === undefined ? {} : { tenantId })
  })
}
