export const HTTP_REQUEST_TARGET_LIMIT_BYTES = 8 * 1024
export const HTTP_REQUEST_MAX_PARAM_LENGTH = 100

export type HttpRequestTargetFailure = {
  code: 'request_uri_too_long'
  statusCode: 414
  message: string
}

export function classifyHttpRequestTarget(
  rawTarget: unknown
): HttpRequestTargetFailure | null {
  if (typeof rawTarget !== 'string') return null
  if (Buffer.byteLength(rawTarget, 'utf8') <= HTTP_REQUEST_TARGET_LIMIT_BYTES) {
    return null
  }

  return {
    code: 'request_uri_too_long',
    statusCode: 414,
    message: 'Request target exceeds the maximum allowed size'
  }
}
