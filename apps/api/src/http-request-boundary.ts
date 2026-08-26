export const HTTP_REQUEST_BODY_LIMIT_BYTES = 1024 * 1024

const INVALID_JSON_BODY_CODE = 'FST_ERR_CTP_INVALID_JSON_BODY'
const EMPTY_JSON_BODY_CODE = 'FST_ERR_CTP_EMPTY_JSON_BODY'
const INVALID_MEDIA_TYPE_CODE = 'FST_ERR_CTP_INVALID_MEDIA_TYPE'
const BODY_TOO_LARGE_CODE = 'FST_ERR_CTP_BODY_TOO_LARGE'

export type HttpRequestFailure = {
  code:
    | 'validation_failed'
    | 'unsupported_media_type'
    | 'payload_too_large'
    | 'internal_error'
  statusCode: 400 | 413 | 415 | 500
  message: string
}

type CodedError = { code?: unknown }

export function createInvalidJsonBodyError(): Error & { code: string } {
  const error = new Error('Invalid JSON body') as Error & { code: string }
  error.code = INVALID_JSON_BODY_CODE
  return error
}

export function classifyHttpRequestError(error: unknown): HttpRequestFailure {
  const code = readErrorCode(error)

  if (code === INVALID_JSON_BODY_CODE || code === EMPTY_JSON_BODY_CODE) {
    return {
      code: 'validation_failed',
      statusCode: 400,
      message: 'Request body is invalid'
    }
  }

  if (code === INVALID_MEDIA_TYPE_CODE) {
    return {
      code: 'unsupported_media_type',
      statusCode: 415,
      message: 'Unsupported media type'
    }
  }

  if (code === BODY_TOO_LARGE_CODE) {
    return {
      code: 'payload_too_large',
      statusCode: 413,
      message: 'Request body exceeds the maximum allowed size'
    }
  }

  return {
    code: 'internal_error',
    statusCode: 500,
    message: 'Unexpected internal error'
  }
}

function readErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object' || Array.isArray(error)) {
    return null
  }

  try {
    const code = (error as CodedError).code
    return typeof code === 'string' ? code : null
  } catch {
    return null
  }
}
