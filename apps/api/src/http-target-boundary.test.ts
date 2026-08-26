import { describe, expect, it } from 'vitest'
import { buildServer } from './server.ts'
import {
  HTTP_REQUEST_MAX_PARAM_LENGTH,
  HTTP_REQUEST_TARGET_LIMIT_BYTES,
  classifyHttpRequestTarget
} from './http-target-boundary.ts'

async function injectAndClose(request: {
  method: 'GET' | 'POST'
  url: string
}) {
  const app = buildServer()
  try {
    return await app.inject(request)
  } finally {
    await app.close()
  }
}

describe('controlled HTTP request-target boundary', () => {
  it('defines explicit request-target and route parameter limits', async () => {
    expect(HTTP_REQUEST_TARGET_LIMIT_BYTES).toBe(8192)
    expect(HTTP_REQUEST_MAX_PARAM_LENGTH).toBe(100)

    const app = buildServer()
    expect(app.initialConfig.routerOptions?.maxParamLength).toBe(
      HTTP_REQUEST_MAX_PARAM_LENGTH
    )
    await app.close()
  })

  it('classifies target size by raw UTF-8 byte length', () => {
    expect(
      classifyHttpRequestTarget('x'.repeat(HTTP_REQUEST_TARGET_LIMIT_BYTES))
    ).toBeNull()
    expect(
      classifyHttpRequestTarget('x'.repeat(HTTP_REQUEST_TARGET_LIMIT_BYTES + 1))
    ).toEqual({
      code: 'request_uri_too_long',
      statusCode: 414,
      message: 'Request target exceeds the maximum allowed size'
    })
    expect(
      classifyHttpRequestTarget(
        'a'.repeat(HTTP_REQUEST_TARGET_LIMIT_BYTES - 1) + 'é'
      )
    ).toEqual({
      code: 'request_uri_too_long',
      statusCode: 414,
      message: 'Request target exceeds the maximum allowed size'
    })
  })

  it('returns a safe correlated envelope for an unknown route', async () => {
    const response = await injectAndClose({
      method: 'GET',
      url: '/__missing__/token=super-secret'
    })

    expect(response.statusCode).toBe(404)
    expect(response.headers['x-correlation-id']).toMatch(/^corr_[0-9a-f-]{36}$/)
    expect(response.json()).toMatchObject({
      success: false,
      data: null,
      error: { code: 'not_found', message: 'Route not found' }
    })
    expect(response.body).not.toContain('token=super-secret')
    expect(response.body).not.toContain('Route GET:')
  })

  it('returns a safe envelope for an unknown method without echoing the target', async () => {
    const response = await injectAndClose({
      method: 'POST',
      url: '/health?authorization=Bearer-secret'
    })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toMatchObject({
      success: false,
      data: null,
      error: { code: 'not_found', message: 'Route not found' }
    })
    expect(response.body).not.toContain('authorization=Bearer-secret')
  })

  it('rejects an oversized path with a bounded 414 envelope', async () => {
    const response = await injectAndClose({
      method: 'GET',
      url: `/__missing__/${'p'.repeat(HTTP_REQUEST_TARGET_LIMIT_BYTES)}`
    })

    expect(response.statusCode).toBe(414)
    expect(response.headers['x-correlation-id']).toMatch(/^corr_[0-9a-f-]{36}$/)
    expect(response.json()).toMatchObject({
      success: false,
      data: null,
      error: {
        code: 'request_uri_too_long',
        message: 'Request target exceeds the maximum allowed size'
      }
    })
    expect(response.body).not.toContain('p'.repeat(1024))
  })

  it('rejects an oversized query before the health handler', async () => {
    const response = await injectAndClose({
      method: 'GET',
      url: `/health?payload=${'q'.repeat(HTTP_REQUEST_TARGET_LIMIT_BYTES)}`
    })

    expect(response.statusCode).toBe(414)
    expect(response.json()).toMatchObject({
      success: false,
      data: null,
      error: { code: 'request_uri_too_long' }
    })
    expect(response.body).not.toContain('q'.repeat(1024))
  })

  it('keeps a target within the limit on the existing route contract', async () => {
    const response = await injectAndClose({
      method: 'GET',
      url: '/health?probe=controlled'
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      success: true,
      data: { status: 'ok', runtime: 'api' }
    })
  })

  it('does not echo an overlong route parameter or query secret', async () => {
    const response = await injectAndClose({
      method: 'GET',
      url: `/v1/tasks/${'s'.repeat(HTTP_REQUEST_MAX_PARAM_LENGTH + 1)}?token=secret`
    })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toMatchObject({
      success: false,
      data: null,
      error: { code: 'not_found' }
    })
    expect(response.body).not.toContain('token=secret')
    expect(response.body).not.toContain('s'.repeat(101))
  })
})
