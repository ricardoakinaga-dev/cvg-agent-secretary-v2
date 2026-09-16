import type {
  OutboxDispatchRevalidation,
  OutboxEventRecord,
  TenantScopedPostgresRuntimeRepository
} from '@cvg/persistence'
import { TenantIdSchema, canBotRespond, type TenantId } from '@cvg/platform'
import { OutboxDispatchRejectedError } from './jobs/process-outbox-event.ts'

/**
 * Revalidation shared by the controlled PostgreSQL compositions. It performs
 * only tenant-scoped reads and runs before the adapter invokes a handler. The
 * handler remains responsible for the full policy/approval decision; this
 * seam prevents a recovered or operator-requeued envelope from bypassing the
 * current runtime context and takeover state.
 */
export function createControlledOutboxRevalidator(
  conversations: Pick<
    TenantScopedPostgresRuntimeRepository,
    'findInboundRuntimeContext'
  >,
  expectedTenantId: TenantId
): OutboxDispatchRevalidation {
  return async (event: OutboxEventRecord): Promise<void> => {
    const eventTenantId = TenantIdSchema.safeParse(event.tenantId)
    if (!eventTenantId.success || eventTenantId.data !== expectedTenantId) {
      throw new OutboxDispatchRejectedError(
        'outbox tenant does not match the controlled worker tenant'
      )
    }

    if (event.type === 'message.outbound') {
      const payload = asRecord(event.payload)
      if (payload?.externalEffects === true) {
        throw new OutboxDispatchRejectedError(
          'controlled outbound event requests an external effect'
        )
      }
      return
    }

    if (event.type !== 'inbound.process') {
      throw new OutboxDispatchRejectedError(
        `outbox event type is not controlled: ${event.type}`
      )
    }
    if (!event.conversationId || !event.inboundMessageId) {
      throw new OutboxDispatchRejectedError(
        'inbound outbox event is missing runtime identifiers'
      )
    }

    const context = await conversations.findInboundRuntimeContext(
      expectedTenantId,
      event.conversationId,
      event.sessionId ?? null,
      event.inboundMessageId
    )
    if (!context) {
      throw new OutboxDispatchRejectedError(
        'inbound runtime context is no longer available'
      )
    }
    if (
      event.correlationId !== undefined &&
      context.correlationId !== event.correlationId
    ) {
      throw new OutboxDispatchRejectedError(
        'inbound correlation does not match the persisted runtime context'
      )
    }
    if (context.session && !canBotRespond(context.session.takeoverState)) {
      throw new OutboxDispatchRejectedError(
        'human takeover is active; recovered inbound automation is suppressed'
      )
    }
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}
