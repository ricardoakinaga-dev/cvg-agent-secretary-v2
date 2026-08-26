import { afterEach, describe, expect, it } from 'vitest'
import { buildServer } from './server.ts'

const originalNodeEnv = process.env.NODE_ENV

afterEach(() => {
  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV
  } else {
    process.env.NODE_ENV = originalNodeEnv
  }
})

describe('controlled request metrics exposure boundary', () => {
  it('can disable the route in controlled environments without exposing a snapshot', async () => {
    process.env.NODE_ENV = 'test'
    const app = buildServer({ requestMetricsEnabled: false })

    const response = await app.inject({
      method: 'GET',
      url: '/health/metrics'
    })
    await app.close()

    expect(response.statusCode).toBe(404)
    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.json()).toMatchObject({
      success: false,
      error: { code: 'invalid_action' }
    })
    expect(JSON.stringify(response.json())).not.toContain('totalRequests')
  })

  it('cannot re-enable the metrics route in production or unknown environments', async () => {
    for (const nodeEnv of ['production', 'staging', 'qa']) {
      process.env.NODE_ENV = nodeEnv
      const app = buildServer({ requestMetricsEnabled: true })
      const response = await app.inject({
        method: 'GET',
        url: '/health/metrics'
      })
      await app.close()

      expect(response.statusCode, nodeEnv).toBe(404)
      expect(response.headers['cache-control'], nodeEnv).toBe('no-store')
      expect(JSON.stringify(response.json()), nodeEnv).not.toContain(
        'totalRequests'
      )
    }
  })
})
