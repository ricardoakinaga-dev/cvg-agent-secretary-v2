import { describe, expect, it } from 'vitest'
import { InMemoryRateLimiter } from '../rate-limit.ts'
import { buildServer } from '../server.ts'

describe('in-memory API rate limiter', () => {
  it('allows a bounded number of requests and exposes retry timing', () => {
    const limiter = new InMemoryRateLimiter(() => 1_000)

    expect(limiter.check('client-a', { max: 2, windowMs: 60_000 })).toEqual({
      allowed: true,
      retryAfterSeconds: 0
    })
    expect(limiter.check('client-a', { max: 2, windowMs: 60_000 })).toEqual({
      allowed: true,
      retryAfterSeconds: 0
    })
    expect(limiter.check('client-a', { max: 2, windowMs: 60_000 })).toEqual({
      allowed: false,
      retryAfterSeconds: 60
    })
  })

  it('expires buckets without sharing limits across keys', () => {
    let now = 1_000
    const limiter = new InMemoryRateLimiter(() => now)

    expect(limiter.check('client-a', { max: 1, windowMs: 1_000 }).allowed).toBe(
      true
    )
    expect(limiter.check('client-b', { max: 1, windowMs: 1_000 }).allowed).toBe(
      true
    )
    expect(limiter.check('client-a', { max: 1, windowMs: 1_000 }).allowed).toBe(
      false
    )
    now = 2_001
    expect(limiter.check('client-a', { max: 1, windowMs: 1_000 })).toEqual({
      allowed: true,
      retryAfterSeconds: 0
    })
  })

  it('returns a stable 429 envelope after the API window is exhausted', async () => {
    const app = buildServer()
    let response
    for (let index = 0; index <= 300; index += 1) {
      response = await app.inject({ method: 'GET', url: '/health' })
    }
    await app.close()

    expect(response?.statusCode).toBe(429)
    expect(response?.headers['retry-after']).toBeDefined()
    expect(response?.json()).toMatchObject({
      success: false,
      error: { code: 'rate_limited' }
    })
  })
})
