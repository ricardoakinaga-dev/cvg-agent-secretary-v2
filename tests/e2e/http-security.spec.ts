import { expect, test } from '@playwright/test'

const apiBaseUrl = `http://127.0.0.1:${process.env.CVG_API_PORT ?? '3199'}`
const consoleOrigin = 'http://127.0.0.1:4173'

test('API HTTP security boundary enforces origin and preflight policy', async ({
  request
}) => {
  const allowed = await request.get(`${apiBaseUrl}/health`, {
    headers: { origin: consoleOrigin }
  })
  expect(allowed.status()).toBe(200)
  expect(allowed.headers()['access-control-allow-origin']).toBe(consoleOrigin)
  expect(allowed.headers()['content-security-policy']).toContain(
    "default-src 'none'"
  )

  const forbidden = await request.get(`${apiBaseUrl}/health`, {
    headers: { origin: 'https://attacker.example.test' }
  })
  expect(forbidden.status()).toBe(403)

  const preflight = await request.fetch(`${apiBaseUrl}/health`, {
    method: 'OPTIONS',
    headers: {
      origin: consoleOrigin,
      'access-control-request-method': 'PATCH',
      'access-control-request-headers': 'content-type,x-operator-id'
    }
  })
  expect(preflight.status()).toBe(204)
  expect(preflight.headers()['access-control-allow-origin']).toBe(consoleOrigin)
  expect(
    preflight.headers()['access-control-allow-credentials']
  ).toBeUndefined()

  const metrics = await request.get(`${apiBaseUrl}/health/metrics`)
  expect(metrics.status()).toBe(200)
  const metricsBody = await metrics.json()
  expect(metricsBody.data.metrics.totalRequests).toBeGreaterThanOrEqual(3)
  expect(JSON.stringify(metricsBody.data.metrics)).not.toContain('attacker')
})
