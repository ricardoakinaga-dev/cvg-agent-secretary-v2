import { DomainError, ReceiveInboundMessageSchema } from '@cvg/shared'
import type {
  ConversationRecord,
  MessageRecord,
  SessionRecord
} from '@cvg/persistence'

type Awaitable<T> = T | Promise<T>

export interface ConversationCommandRepository {
  findByExternalMessage(
    tenantId: string,
    channel: string,
    externalMessageId: string
  ): Awaitable<MessageRecord | null>
  createWithSession(input: {
    tenantId: string
    channel: 'whatsapp' | 'web' | 'internal'
    senderRef: string
    externalMessageId: string
    body: string
    conversationId?: string | undefined
    sessionId?: string | undefined
  }): Awaitable<{
    conversation: ConversationRecord
    session: SessionRecord
    message: MessageRecord
  }>
}

export interface ReceiveInboundMessageDeps {
  conversations: ConversationCommandRepository
}

export async function receiveInboundMessage(
  deps: ReceiveInboundMessageDeps,
  rawInput: unknown
) {
  const input = ReceiveInboundMessageSchema.parse(rawInput)
  const duplicate = await deps.conversations.findByExternalMessage(
    input.tenantId,
    input.channel,
    input.externalMessageId
  )
  if (duplicate) {
    return {
      conversationId: duplicate.conversationId,
      messageId: duplicate.id,
      sessionId: null,
      accepted: false,
      runtimeStatus: duplicate.runtimeStatus ?? 'completed'
    }
  }
  if (!input.body.trim()) {
    throw new DomainError('empty_body', 'Message body is required')
  }
  let result
  try {
    result = await deps.conversations.createWithSession(input)
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      const concurrentDuplicate =
        await deps.conversations.findByExternalMessage(
          input.tenantId,
          input.channel,
          input.externalMessageId
        )
      if (concurrentDuplicate) {
        return {
          conversationId: concurrentDuplicate.conversationId,
          messageId: concurrentDuplicate.id,
          sessionId: null,
          accepted: false,
          runtimeStatus: concurrentDuplicate.runtimeStatus ?? 'completed'
        }
      }
    }
    throw error
  }
  return {
    conversationId: result.conversation.id,
    sessionId: result.session.id,
    messageId: result.message.id,
    correlationId: result.conversation.correlationId,
    accepted: true,
    runtimeStatus: result.message.runtimeStatus ?? 'pending'
  }
}

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  )
}
