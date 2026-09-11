export const ChannelErrorCodes = {
  invalid_payload: 'invalid_payload',
  invalid_config: 'invalid_config',
  channel_disabled: 'channel_disabled',
  channel_unknown: 'channel_unknown',
  human_takeover_active: 'human_takeover_active',
  send_failed: 'send_failed',
  provider_rejected: 'provider_rejected',
  url_rejected: 'url_rejected'
} as const

export type ChannelErrorCode =
  (typeof ChannelErrorCodes)[keyof typeof ChannelErrorCodes]

export class ChannelError extends Error {
  readonly code: ChannelErrorCode
  readonly retryable: boolean

  constructor(code: ChannelErrorCode, message: string, retryable = false) {
    super(message)
    this.name = 'ChannelError'
    this.code = code
    this.retryable = retryable
  }
}
