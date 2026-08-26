import { describe, expect, it } from 'vitest'
import { buildServer } from './server.ts'
import {
  normalizeHttpSecurityOptions,
  normalizeOrigin,
  parseAllowedOrigins,
  parseHttpSecurityEnv
} from './http-security.ts'

const allowedOrigin = 'https://console.example.test'

describe('HTTP security boundary', () => {
  it('normalizes exact origins and rejects unsafe origin forms', () => {
    expect(normalizeOrigin('https://console.example.test/')).toBe(allowedOrigin)
    expect(
      parseAllowedOrigins(
        'https://console.example.test, https://console.example.test'
      )
    ).toEqual([allowedOrigin])

    expect(() => normalizeOrigin('*')).toThrow(/origin/i)
    expect(() => normalizeOrigin('null')).toThrow(/origin/i)
    expect(() => normalizeOrigin('')).toThrow(/origin/i)
    expect(() => normalizeOrigin('not-an-origin')).toThrow(/origin/i)
    expect(() => normalizeOrigin('ftp://console.example.test')).toThrow(
      /origin/i
    )
    expect(() => normalizeOrigin('https://console.example.test/app')).toThrow(
      /origin/i
    )
    expect(() =>
      normalizeOrigin('https://console.example.test/?query=1')
    ).toThrow(/origin/i)
    expect(() =>
      normalizeOrigin('https://user:secret@console.example.test')
    ).toThrow(/origin/i)
    expect(parseAllowedOrigins()).toEqual([])
    expect(parseAllowedOrigins('   ')).toEqual([])
    expect(() => parseAllowedOrigins('https://console.example.test,')).toThrow(
      /empty origin/i
    )
  })

  it('validates bounded policy options and environment overrides', () => {
    expect(normalizeHttpSecurityOptions()).toMatchObject({
      allowedOrigins: [],
      enforceHttps: false,
      trustedProxyHops: 0
    })
    expect(() => normalizeHttpSecurityOptions({ trustedProxyHops: 5 })).toThrow(
      /trustedProxyHops/
    )
    expect(() =>
      normalizeHttpSecurityOptions({ hstsMaxAgeSeconds: 299 })
    ).toThrow(/hstsMaxAgeSeconds/)
    expect(() =>
      parseHttpSecurityEnv({
        NODE_ENV: 'test',
        API_REQUIRE_HTTPS: 'maybe'
      })
    ).toThrow(/boolean/i)
    expect(() =>
      parseHttpSecurityEnv({
        NODE_ENV: 'test',
        API_TRUSTED_PROXY_HOPS: '5'
      })
    ).toThrow(/API_TRUSTED_PROXY_HOPS/)
    expect(
      parseHttpSecurityEnv(
        {
          NODE_ENV: 'test',
          API_ALLOWED_ORIGINS: allowedOrigin,
          API_REQUIRE_HTTPS: 'true',
          API_TRUSTED_PROXY_HOPS: '1'
        },
        { hstsMaxAgeSeconds: 600 }
      )
    ).toMatchObject({
      allowedOrigins: [allowedOrigin],
      enforceHttps: true,
      trustedProxyHops: 1,
      hstsMaxAgeSeconds: 600
    })
  })

  it('fails closed for production HTTP bootstrap and accepts only explicit policy', () => {
    expect(() =>
      parseHttpSecurityEnv({
        NODE_ENV: 'production',
        API_ALLOWED_ORIGINS: '',
        API_REQUIRE_HTTPS: 'true'
      })
    ).toThrow(/API_ALLOWED_ORIGINS/)
    expect(() =>
      parseHttpSecurityEnv({
        NODE_ENV: 'production',
        API_ALLOWED_ORIGINS: allowedOrigin,
        API_REQUIRE_HTTPS: 'false'
      })
    ).toThrow(/API_REQUIRE_HTTPS/)
    expect(() =>
      parseHttpSecurityEnv({
        NODE_ENV: 'production',
        API_ALLOWED_ORIGINS: 'https://console.example.test/app',
        API_REQUIRE_HTTPS: 'true'
      })
    ).toThrow(/origin/i)

    expect(
      parseHttpSecurityEnv({
        NODE_ENV: 'production',
        API_ALLOWED_ORIGINS: ` ${allowedOrigin},${allowedOrigin}/`,
        API_REQUIRE_HTTPS: 'true',
        API_TRUSTED_PROXY_HOPS: '2'
      })
    ).toMatchObject({
      allowedOrigins: [allowedOrigin],
      enforceHttps: true,
      trustedProxyHops: 2
    })
  })

  it('allows an exact origin and emits fixed security headers', async () => {
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
    expect(response.headers.vary).toContain('Origin')
    expect(response.headers['access-control-allow-credentials']).toBeUndefined()
    expect(response.headers['content-security-policy']).toBe(
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
    )
    expect(response.headers['x-content-type-options']).toBe('nosniff')
    expect(response.headers['x-frame-options']).toBe('DENY')
    expect(response.headers['referrer-policy']).toBe('no-referrer')
    expect(response.headers['x-permitted-cross-domain-policies']).toBe('none')
    expect(response.headers['strict-transport-security']).toBeUndefined()
  })

  it('rejects an unknown origin before the route handler can run', async () => {
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
    expect(response.json()).toMatchObject({
      success: false,
      error: { code: 'forbidden' }
    })
  })

  it('keeps server-to-server requests without Origin and rejects malformed Origin', async () => {
    const app = buildServer({
      httpSecurity: { allowedOrigins: [allowedOrigin] }
    })

    const withoutOrigin = await app.inject({
      method: 'GET',
      url: '/health'
    })
    const malformed = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'null' }
    })
    await app.close()

    expect(withoutOrigin.statusCode).toBe(200)
    expect(withoutOrigin.headers['access-control-allow-origin']).toBeUndefined()
    expect(malformed.statusCode).toBe(403)
  })

  it('handles a valid preflight without executing a route handler', async () => {
    const app = buildServer({
      httpSecurity: { allowedOrigins: [allowedOrigin] }
    })

    const response = await app.inject({
      method: 'OPTIONS',
      url: '/health',
      headers: {
        origin: allowedOrigin,
        'access-control-request-method': 'PATCH',
        'access-control-request-headers': 'content-type,x-operator-id'
      }
    })
    await app.close()

    expect(response.statusCode).toBe(204)
    expect(response.body).toBe('')
    expect(response.headers['access-control-allow-origin']).toBe(allowedOrigin)
    expect(response.headers['access-control-allow-methods']).toBe(
      'GET, POST, PATCH, OPTIONS'
    )
    expect(response.headers['access-control-allow-headers']).toContain(
      'x-operator-id'
    )
    expect(response.headers['access-control-max-age']).toBe('600')
  })

  it('rejects preflight methods and headers outside the allowlist', async () => {
    const app = buildServer({
      httpSecurity: { allowedOrigins: [allowedOrigin] }
    })

    const methodResponse = await app.inject({
      method: 'OPTIONS',
      url: '/health',
      headers: {
        origin: allowedOrigin,
        'access-control-request-method': 'DELETE'
      }
    })
    const headerResponse = await app.inject({
      method: 'OPTIONS',
      url: '/health',
      headers: {
        origin: allowedOrigin,
        'access-control-request-method': 'GET',
        'access-control-request-headers': 'x-unsafe-header'
      }
    })
    await app.close()

    expect(methodResponse.statusCode).toBe(403)
    expect(headerResponse.statusCode).toBe(403)
  })

  it('allows a preflight without custom headers', async () => {
    const app = buildServer({
      httpSecurity: { allowedOrigins: [allowedOrigin] }
    })

    const response = await app.inject({
      method: 'OPTIONS',
      url: '/health',
      headers: {
        origin: allowedOrigin,
        'access-control-request-method': 'GET'
      }
    })
    await app.close()

    expect(response.statusCode).toBe(204)
  })

  it('enforces HTTPS and emits HSTS only for a trusted secure request', async () => {
    const app = buildServer({
      httpSecurity: {
        allowedOrigins: [allowedOrigin],
        enforceHttps: true,
        trustedProxyHops: 1
      }
    })

    const insecure = await app.inject({ method: 'GET', url: '/health' })
    const secure = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-forwarded-proto': 'https' }
    })
    await app.close()

    expect(insecure.statusCode).toBe(426)
    expect(insecure.json()).toMatchObject({
      success: false,
      error: { code: 'secure_transport_required' }
    })
    expect(secure.statusCode).toBe(200)
    expect(secure.headers['strict-transport-security']).toBe('max-age=31536000')
  })
})
