import { randomUUID } from 'node:crypto'
import { z } from 'zod'

const uuid = '[0-9a-f-]{36}'

export const TenantIdSchema = z.string().regex(new RegExp(`^tenant_${uuid}$`))
export const AgentIdSchema = z.string().regex(new RegExp(`^agent_${uuid}$`))
export const AgentVersionIdSchema = z
  .string()
  .regex(new RegExp(`^agent_version_${uuid}$`))
export const TraceIdSchema = z.string().regex(new RegExp(`^trace_${uuid}$`))

export type TenantId = z.infer<typeof TenantIdSchema>
export type AgentId = z.infer<typeof AgentIdSchema>
export type AgentVersionId = z.infer<typeof AgentVersionIdSchema>
export type TraceId = z.infer<typeof TraceIdSchema>

export function createTenantId(): TenantId {
  return `tenant_${randomUUID()}`
}

export function createAgentId(): AgentId {
  return `agent_${randomUUID()}`
}

export function createAgentVersionId(): AgentVersionId {
  return `agent_version_${randomUUID()}`
}

export function createTraceId(): TraceId {
  return `trace_${randomUUID()}`
}
