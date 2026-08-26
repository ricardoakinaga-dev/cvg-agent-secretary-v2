import { describe, expect, it } from 'vitest'
import { buildServer } from './server.ts'
import {
  HTTP_REQUEST_BODY_LIMIT_BYTES,
  classifyHttpRequestError,
  createInvalidJsonBodyError
} from './http-request-boundary.ts'

describe('controlled HTTP request boundary', () => {
  it('defines an explicit bounded body limit', () => {
    expect(HTTP_REQUEST_BODY_LIMIT_BYTES).toBe(1024 * 1024)
  })

  it('classifies known parser errors without exposing their messages', () => {
    expect(classifyHttpRequestError(createInvalidJsonBodyError())).toEqual({
      code: 'validation_failed',
      statusCode: 400,
      message: 'Request body is invalid'
    })
    expect(
      classifyHttpRequestError({
        code: 'FST_ERR_CTP_BODY_TOO_LARGE',
        message: 'raw body contains token=secret'
      })
    ).toEqual({
      code: 'payload_too_large',
      statusCode: 413,
      message: 'Request body exceeds the maximum allowed size'
    })
    expect(
      classifyHttpRequestError({
        code: 'FST_ERR_CTP_INVALID_MEDIA_TYPE',
        message: 'authorization=Bearer secret'
      })
    ).toEqual({
      code: 'unsupported_media_type',
      statusCode: 415,
      message: 'Unsupported media type'
    })
  })

  it('falls back to a generic internal error for unknown failures', () => {
    expect(
      classifyHttpRequestError(new Error('database password=secret'))
    ).toEqual({
      code: 'internal_error',
      statusCode: 500,
      message: 'Unexpected internal error'
    })
  })

  it('handles malformed error-like codes without throwing', () => {
    const errorLike = Object.create(null) as { code: unknown }
    Object.defineProperty(errorLike, 'code', {
      get: () => {
        throw new Error('unreachable error metadata')
      }
    })

    expect(classifyHttpRequestError(errorLike)).toEqual({
      code: 'internal_error',
      statusCode: 500,
      message: 'Unexpected internal error'
    })
  })

  it('returns an enveloped response for malformed JSON', async () => {
    const app = buildServer()

    const response = await app.inject({
      method: 'POST',
      url: '/v1/tasks',
      headers: { 'content-type': 'application/json' },
      payload: '{"broken":'
    })
    await app.close()

    expect(response.statusCode).toBe(400)
    expect(response.headers['x-correlation-id']).toMatch(/^corr_[0-9a-f-]{36}$/)
    expect(response.json()).toMatchObject({
      success: false,
      data: null,
      error: { code: 'validation_failed', message: 'Request body is invalid' }
    })
    expect(response.body).not.toContain('Invalid JSON body')
    expect(response.body).not.toContain('stack')
  })

  it('returns 413 without echoing an oversized body', async () => {
    const app = buildServer()

    const response = await app.inject({
      method: 'POST',
      url: '/v1/tasks',
      headers: { 'content-type': 'application/json' },
      payload: 'x'.repeat(HTTP_REQUEST_BODY_LIMIT_BYTES + 1)
    })
    await app.close()

    expect(response.statusCode).toBe(413)
    expect(response.headers['x-correlation-id']).toMatch(/^corr_[0-9a-f-]{36}$/)
    expect(response.json()).toMatchObject({
      success: false,
      data: null,
      error: {
        code: 'payload_too_large',
        message: 'Request body exceeds the maximum allowed size'
      }
    })
    expect(response.body).not.toContain('x'.repeat(1024))
  })

  it('returns 415 for an unsupported media type without raw parser details', async () => {
    const app = buildServer()

    const response = await app.inject({
      method: 'POST',
      url: '/v1/tasks',
      headers: { 'content-type': 'application/xml' },
      payload: 'authorization=Bearer secret'
    })
    await app.close()

    expect(response.statusCode).toBe(415)
    expect(response.headers['x-correlation-id']).toMatch(/^corr_[0-9a-f-]{36}$/)
    expect(response.json()).toMatchObject({
      success: false,
      data: null,
      error: {
        code: 'unsupported_media_type',
        message: 'Unsupported media type'
      }
    })
    expect(response.body).not.toContain('authorization=Bearer secret')
  })

  it('converts an unhandled route failure into a generic envelope', async () => {
    const app = buildServer()
    app.get('/__test_unhandled_http_failure', async () => {
      throw new Error('database password=secret')
    })

    const response = await app.inject({
      method: 'GET',
      url: '/__test_unhandled_http_failure'
    })
    await app.close()

    expect(response.statusCode).toBe(500)
    expect(response.headers['x-correlation-id']).toMatch(/^corr_[0-9a-f-]{36}$/)
    expect(response.json()).toMatchObject({
      success: false,
      data: null,
      error: { code: 'internal_error', message: 'Unexpected internal error' }
    })
    expect(response.body).not.toContain('database password=secret')
  })
})
