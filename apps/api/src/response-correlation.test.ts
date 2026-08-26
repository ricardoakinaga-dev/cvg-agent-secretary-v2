import { describe, expect, it } from 'vitest'
import { buildServer } from './server.ts'
import { readResponseCorrelationId } from './response-correlation.ts'

const allowedOrigin = 'https://console.example.test'

describe('response correlation extraction', () => {
  it('accepts only a valid top-level envelope correlation id', () => {
    const correlationId = 'corr_00000000-0000-4000-8000-000000000000'

    expect(readResponseCorrelationId({ meta: { correlationId } })).toBe(
      correlationId
    )
    expect(readResponseCorrelationId(null)).toBeNull()
    expect(readResponseCorrelationId([])).toBeNull()
    expect(
      readResponseCorrelationId({ meta: { correlationId: 'external' } })
    ).toBeNull()
    expect(
      readResponseCorrelationId({
        data: { meta: { correlationId } },
        meta: { correlationId: 'invalid' }
      })
    ).toBeNull()
  })
})

describe('controlled response correlation boundary', () => {
  it('copies the envelope correlation id to server-to-server responses', async () => {
    const app = buildServer()

    const response = await app.inject({
      method: 'GET',
      url: '/health'
    })
    await app.close()

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(response.headers['x-correlation-id']).toBe(body.meta.correlationId)
    expect(response.headers['x-correlation-id']).toMatch(/^corr_[0-9a-f-]{36}$/)
    expect(response.headers['access-control-expose-headers']).toBeUndefined()
  })

  it('never reflects an external correlation header', async () => {
    const app = buildServer()
    const externalCorrelationId = 'corr_00000000-0000-4000-8000-000000000000'

    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-correlation-id': externalCorrelationId }
    })
    await app.close()

    expect(response.headers['x-correlation-id']).not.toBe(externalCorrelationId)
    expect(response.headers['x-correlation-id']).toBe(
      response.json().meta.correlationId
    )
  })

  it('exposes only the correlation response header to an approved CORS origin', async () => {
    const app = buildServer({
      httpSecurity: { allowedOrigins: [allowedOrigin] }
    })

    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: allowedOrigin }
    })
    await app.close()

    expect(response.statusCode).toBe(200)
    expect(response.headers['access-control-allow-origin']).toBe(allowedOrigin)
    expect(response.headers['access-control-expose-headers']).toBe(
      'x-correlation-id'
    )
    expect(response.headers['x-correlation-id']).toBe(
      response.json().meta.correlationId
    )
  })

  it('keeps preflight non-correlated and correlates the safe not-found envelope', async () => {
    const app = buildServer({
      httpSecurity: { allowedOrigins: [allowedOrigin] }
    })

    const preflight = await app.inject({
      method: 'OPTIONS',
      url: '/health',
      headers: {
        origin: allowedOrigin,
        'access-control-request-method': 'GET'
      }
    })
    const notFound = await app.inject({
      method: 'GET',
      url: '/route-that-does-not-exist'
    })
    await app.close()

    expect(preflight.statusCode).toBe(204)
    expect(preflight.headers['x-correlation-id']).toBeUndefined()
    expect(preflight.headers['access-control-expose-headers']).toBeUndefined()
    expect(notFound.statusCode).toBe(404)
    expect(notFound.headers['x-correlation-id']).toBe(
      notFound.json().meta.correlationId
    )
  })

  it('correlates an HTTP security error without exposing it through CORS', async () => {
    const app = buildServer({
      httpSecurity: { allowedOrigins: [allowedOrigin] }
    })

    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'https://attacker.example.test' }
    })
    await app.close()

    expect(response.statusCode).toBe(403)
    expect(response.headers['x-correlation-id']).toBe(
      response.json().meta.correlationId
    )
    expect(response.headers['access-control-expose-headers']).toBeUndefined()
  })
})
