import { randomUUID } from 'node:crypto'
import { z } from 'zod'

const idPattern = /^[a-z]+_[0-9a-f-]{36}$/

export const DomainIdSchema = z.string().regex(idPattern)
export type DomainId = z.infer<typeof DomainIdSchema>

export function createDomainId(prefix: string): DomainId {
  return `${prefix}_${randomUUID()}`
}

export const CorrelationIdSchema = z.string().regex(/^corr_[0-9a-f-]{36}$/)
export type CorrelationId = z.infer<typeof CorrelationIdSchema>

export function createCorrelationId(): CorrelationId {
  return `corr_${randomUUID()}`
}

export const IdempotencyKeySchema = z.string().min(8).max(200)
export type IdempotencyKey = z.infer<typeof IdempotencyKeySchema>
