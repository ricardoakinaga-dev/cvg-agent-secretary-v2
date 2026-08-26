import { CorrelationIdSchema, type CorrelationId } from '@cvg/shared'
import type { FastifyInstance } from 'fastify'

export const CORRELATION_RESPONSE_HEADER = 'x-correlation-id'

export function readResponseCorrelationId(
  payload: unknown
): CorrelationId | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null
  }

  const meta = (payload as Record<string, unknown>).meta
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null

  const result = CorrelationIdSchema.safeParse(
    (meta as Record<string, unknown>).correlationId
  )
  return result.success ? result.data : null
}

export function installResponseCorrelationHook(app: FastifyInstance): void {
  app.addHook('preSerialization', async (_request, reply, payload) => {
    const correlationId = readResponseCorrelationId(payload)
    if (correlationId) {
      reply.header(CORRELATION_RESPONSE_HEADER, correlationId)
    }
    return payload
  })
}
