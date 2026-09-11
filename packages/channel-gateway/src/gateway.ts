import {
  CanonicalEnvelopeSchema,
  CanonicalOutboundMessageSchema,
  type CanonicalEnvelope,
  type CanonicalEnvelopeInput,
  type CanonicalOutboundMessageInput,
  type InboundChannelAdapter,
  type InboundNormalizeContext,
  type OutboundChannelAdapter,
  type OutboundResult
} from './contracts.ts'
import { ChannelError } from './errors.ts'
import {
  InboundDeduplicator,
  InMemoryOutboundEffectJournal,
  type OutboundEffectJournal
} from './idempotency.ts'

export type ChannelEventType =
  | 'channel.inbound.accepted'
  | 'channel.inbound.duplicate'
  | 'channel.inbound.rejected'
  | 'channel.outbound.sent'
  | 'channel.outbound.blocked'
  | 'channel.outbound.rejected'

export interface ChannelEvent {
  type: ChannelEventType
  channel: string
  tenantId: string
  correlationId: string
  messageId?: string
  code?: string
}

export interface ChannelGatewayOptions {
  inboundAdapters?: InboundChannelAdapter[]
  outboundAdapters?: OutboundChannelAdapter[]
  deduplicator?: InboundDeduplicator
  effectJournal?: OutboundEffectJournal
  onEvent?: (event: ChannelEvent) => void
}

export interface IngestResult {
  accepted: boolean
  duplicate: boolean
  envelope: CanonicalEnvelope
}

/**
 * Single entry point for every channel. Inbound payloads are canonicalized and
 * deduplicated; outbound messages are blocked by human takeover and journaled
 * so retries never duplicate external effects.
 */
export class ChannelGateway {
  readonly #inbound = new Map<string, InboundChannelAdapter>()
  readonly #outbound = new Map<string, OutboundChannelAdapter>()
  readonly #deduplicator: InboundDeduplicator
  readonly #effects: OutboundEffectJournal
  readonly #onEvent?: (event: ChannelEvent) => void

  constructor(options: ChannelGatewayOptions = {}) {
    for (const adapter of options.inboundAdapters ?? []) {
      this.#inbound.set(adapter.channel, adapter)
    }
    for (const adapter of options.outboundAdapters ?? []) {
      this.#outbound.set(adapter.channel, adapter)
    }
    this.#deduplicator = options.deduplicator ?? new InboundDeduplicator()
    this.#effects = options.effectJournal ?? new InMemoryOutboundEffectJournal()
    if (options.onEvent) this.#onEvent = options.onEvent
  }

  ingest(
    channel: string,
    raw: unknown,
    context: InboundNormalizeContext
  ): IngestResult {
    const adapter = this.#inbound.get(channel)
    if (!adapter) {
      throw new ChannelError(
        'channel_unknown',
        `No inbound adapter for ${channel}`
      )
    }
    if (!adapter.enabled) {
      throw new ChannelError(
        'channel_disabled',
        `Channel ${channel} is disabled`
      )
    }
    let envelopeInput: CanonicalEnvelopeInput
    try {
      envelopeInput = adapter.normalize(raw, context)
    } catch (error) {
      this.#emit({
        type: 'channel.inbound.rejected',
        channel,
        tenantId: context.tenantId,
        correlationId: context.correlationId,
        code: error instanceof ChannelError ? error.code : 'invalid_payload'
      })
      throw error
    }
    const envelope = CanonicalEnvelopeSchema.parse(envelopeInput)
    const { accepted } = this.#deduplicator.accept(envelope)
    this.#emit({
      type: accepted ? 'channel.inbound.accepted' : 'channel.inbound.duplicate',
      channel,
      tenantId: envelope.tenantId,
      correlationId: envelope.correlationId,
      messageId: envelope.messageId
    })
    return { accepted, duplicate: !accepted, envelope }
  }

  async dispatch(
    message: CanonicalOutboundMessageInput,
    options: { takeoverActive: boolean }
  ): Promise<OutboundResult> {
    const parsed = CanonicalOutboundMessageSchema.safeParse(message)
    if (!parsed.success) {
      throw new ChannelError(
        'invalid_payload',
        'Outbound message failed schema validation'
      )
    }
    const outbound = parsed.data
    if (options.takeoverActive) {
      this.#emit({
        type: 'channel.outbound.blocked',
        channel: outbound.channel,
        tenantId: outbound.tenantId,
        correlationId: outbound.correlationId,
        messageId: outbound.messageId,
        code: 'human_takeover_active'
      })
      throw new ChannelError(
        'human_takeover_active',
        'Human takeover is active; automatic outbound effects are blocked'
      )
    }

    const existing = this.#effects.find(outbound.idempotencyKey)
    if (existing) return existing

    const adapter = this.#outbound.get(outbound.channel)
    if (!adapter) {
      throw new ChannelError(
        'channel_unknown',
        `No outbound adapter for ${outbound.channel}`
      )
    }
    if (!adapter.enabled) {
      this.#emit({
        type: 'channel.outbound.rejected',
        channel: outbound.channel,
        tenantId: outbound.tenantId,
        correlationId: outbound.correlationId,
        messageId: outbound.messageId,
        code: 'channel_disabled'
      })
      throw new ChannelError(
        'channel_disabled',
        `Channel ${outbound.channel} is disabled`
      )
    }

    let result: OutboundResult
    try {
      result = await adapter.send(outbound)
    } catch (error) {
      this.#emit({
        type: 'channel.outbound.rejected',
        channel: outbound.channel,
        tenantId: outbound.tenantId,
        correlationId: outbound.correlationId,
        messageId: outbound.messageId,
        code: error instanceof ChannelError ? error.code : 'send_failed'
      })
      throw error
    }
    this.#effects.record(outbound.idempotencyKey, result)
    this.#emit({
      type: 'channel.outbound.sent',
      channel: outbound.channel,
      tenantId: outbound.tenantId,
      correlationId: outbound.correlationId,
      messageId: outbound.messageId
    })
    return result
  }

  #emit(event: ChannelEvent): void {
    this.#onEvent?.(event)
  }
}
