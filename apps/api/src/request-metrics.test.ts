import { describe, expect, it } from 'vitest'
import { buildServer } from './server.ts'
import { ControlledRequestMetrics } from './request-metrics.ts'

describe('controlled request metrics', () => {
  it('aggregates bounded route, method, status and latency state immutably', () => {
    const metrics = new ControlledRequestMetrics({
      maxRoutes: 1,
      now: () => '2026-08-25T14:33:47.000Z'
    })

    metrics.record({
      method: 'get',
      routeTemplate: '/v1/tasks/:taskId/status',
      statusCode: 200,
      latencyMs: 12
    })
    metrics.record({
      method: 'PATCH',
      routeTemplate: '/v1/tasks/:taskId/status',
      statusCode: 409,
      latencyMs: 5
    })
    metrics.record({
      method: 'GET',
      routeTemplate: '/v1/other',
      statusCode: 404,
      latencyMs: 3
    })
    metrics.record({
      method: 'GET',
      routeTemplate: '/v1/sensitive-id?token=secret',
      statusCode: 404,
      latencyMs: 3
    })

    const snapshot = metrics.snapshot()
    expect(snapshot).toMatchObject({
      schemaVersion: 'v1',
      startedAt: '2026-08-25T14:33:47.000Z',
      totalRequests: 4,
      droppedRouteCount: 1,
      methods: { GET: 3, PATCH: 1 },
      statusBuckets: { '2xx': 1, '4xx': 3 },
      totalLatencyMs: 23,
      maxLatencyMs: 12
    })
    expect(snapshot.routes).toHaveLength(3)
    const taskRoute = snapshot.routes.find(
      (route) => route.routeTemplate === '/v1/tasks/:taskId/status'
    )
    expect(taskRoute).toMatchObject({
      requestCount: 2,
      methodCounts: { GET: 1, PATCH: 1 },
      statusBuckets: { '2xx': 1, '4xx': 1 },
      totalLatencyMs: 17,
      maxLatencyMs: 12
    })
    expect(snapshot.routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          routeTemplate: '__other__',
          requestCount: 1
        }),
        expect.objectContaining({
          routeTemplate: '__unmatched__',
          requestCount: 1
        })
      ])
    )
    expect(JSON.stringify(snapshot)).not.toContain('sensitive-id')
    expect(JSON.stringify(snapshot)).not.toContain('secret')

    const mutableSnapshot = snapshot as unknown as {
      methods: Record<string, number>
      routes: Array<{
        routeTemplate: string
        methodCounts: Record<string, number>
      }>
    }
    mutableSnapshot.methods.GET = 999
    const mutableTaskRoute = mutableSnapshot.routes.find(
      (route) => route.routeTemplate === '/v1/tasks/:taskId/status'
    )
    if (!mutableTaskRoute) throw new Error('task route missing from snapshot')
    mutableTaskRoute.methodCounts.GET = 999
    expect(metrics.snapshot().methods.GET).toBe(3)
    expect(
      metrics
        .snapshot()
        .routes.find(
          (route) => route.routeTemplate === '/v1/tasks/:taskId/status'
        )?.methodCounts.GET
    ).toBe(1)
  })

  it('counts route and security outcomes without exposing raw request data', async () => {
    const app = buildServer({
      httpSecurity: {
        allowedOrigins: ['https://console.example.test']
      }
    })

    const health = await app.inject({ method: 'GET', url: '/health' })
    const missing = await app.inject({
      method: 'GET',
      url: '/not-found/sensitive-id?token=secret'
    })
    const rejected = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'https://attacker.example.test' }
    })
    const metricsResponse = await app.inject({
      method: 'GET',
      url: '/health/metrics'
    })
    await app.close()

    expect(health.statusCode).toBe(200)
    expect(missing.statusCode).toBe(404)
    expect(rejected.statusCode).toBe(403)
    expect(metricsResponse.statusCode).toBe(200)
    expect(metricsResponse.headers['cache-control']).toBe('no-store')
    const snapshot = metricsResponse.json().data.metrics
    expect(snapshot.totalRequests).toBe(3)
    expect(snapshot.statusBuckets).toMatchObject({
      '2xx': 1,
      '4xx': 2
    })
    expect(snapshot.routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ routeTemplate: '/health' }),
        expect.objectContaining({ routeTemplate: '__unmatched__' })
      ])
    )
    expect(JSON.stringify(snapshot)).not.toContain('sensitive-id')
    expect(JSON.stringify(snapshot)).not.toContain('secret')
  })

  it('maps non-standard methods to a fixed bounded bucket', () => {
    const metrics = new ControlledRequestMetrics()
    metrics.record({
      method: 'x-custom-method',
      routeTemplate: '/health',
      statusCode: 200,
      latencyMs: 1
    })

    expect(metrics.snapshot().methods).toEqual({ OTHER: 1 })
  })
})
