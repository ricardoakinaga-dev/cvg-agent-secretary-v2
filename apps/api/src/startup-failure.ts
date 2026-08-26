import { redactSensitiveText } from '@cvg/shared'
import { ZodError } from 'zod'

export const STARTUP_FAILURE_EVENT = 'api.startup_failed' as const
export const STARTUP_FAILURE_MAX_MESSAGE_LENGTH = 512

const GENERIC_CONFIGURATION_MESSAGE = 'Startup configuration is invalid'
const GENERIC_STARTUP_MESSAGE = 'API startup failed'
const TRUNCATION_SUFFIX = '...[truncated]'

export type StartupFailureCode = 'configuration_invalid' | 'startup_failed'

export interface StartupFailureLog {
  event: typeof STARTUP_FAILURE_EVENT
  code: StartupFailureCode
  message: string
}

export function formatStartupFailure(error: unknown): StartupFailureLog {
  if (error instanceof ZodError) {
    return createFailure('configuration_invalid', GENERIC_CONFIGURATION_MESSAGE)
  }

  if (!(error instanceof Error)) {
    return createFailure('startup_failed', GENERIC_STARTUP_MESSAGE)
  }

  let message: unknown
  try {
    message = error.message
  } catch {
    return createFailure('startup_failed', GENERIC_STARTUP_MESSAGE)
  }

  if (typeof message !== 'string') {
    return createFailure('startup_failed', GENERIC_STARTUP_MESSAGE)
  }

  const sanitized = sanitizeStartupMessage(message)
  return createFailure('startup_failed', sanitized || GENERIC_STARTUP_MESSAGE)
}

export function serializeStartupFailure(error: unknown): string {
  return JSON.stringify(formatStartupFailure(error))
}

function createFailure(
  code: StartupFailureCode,
  message: string
): StartupFailureLog {
  return { event: STARTUP_FAILURE_EVENT, code, message }
}

function sanitizeStartupMessage(message: string): string {
  const credentialSafe = redactCredentialText(message)
  const piiSafe = redactSensitiveText(credentialSafe)
  const normalized = piiSafe
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (normalized.length <= STARTUP_FAILURE_MAX_MESSAGE_LENGTH) {
    return normalized
  }

  return `${normalized.slice(
    0,
    STARTUP_FAILURE_MAX_MESSAGE_LENGTH - TRUNCATION_SUFFIX.length
  )}${TRUNCATION_SUFFIX}`
}

function redactCredentialText(message: string): string {
  return message
    .replace(
      /((?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|redis|rediss|amqp|https?):\/\/[^\s/:@]+:)[^\s@]+@/gi,
      '$1[redacted]@'
    )
    .replace(
      /((?:["']?(?:password|passwd|secret|token|access[_-]?token|refresh[_-]?token|api[_-]?key|client[_-]?secret|private[_-]?key|authorization|credential)["']?\s*[:=]\s*))(?:(?:"[^"]*")|(?:'[^']*')|[^\s,;&}]+)/gi,
      '$1[redacted]'
    )
    .replace(
      /\b(?:bearer|basic)\s+[A-Za-z0-9._~+/=-]+/gi,
      '[redacted-credential]'
    )
}
