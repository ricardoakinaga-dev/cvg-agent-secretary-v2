import { describe, expect, it } from 'vitest'
import { parseEnv } from '../env.ts'

const productionBase = {
  NODE_ENV: 'production' as const,
  OPENAI_API_KEY: 'configured-provider',
  WEBHOOK_SIGNING_SECRET: 'production-webhook-signing-secret-123456',
  POSTGRES_RLS_ENFORCEMENT: 'true' as const,
  INBOUND_TENANT_ID: 'tenant_00000000-0000-4000-8000-000000000001',
  INBOUND_AGENT_ID: 'agent_00000000-0000-4000-8000-000000000001'
}

describe('HTTP security environment boundary', () => {
  it('requires an explicit production origin allowlist', () => {
    expect(() => parseEnv(productionBase)).toThrow(/API_ALLOWED_ORIGINS/)
  })

  it('requires explicit HTTPS enforcement in production', () => {
    expect(() =>
      parseEnv({
        ...productionBase,
        API_ALLOWED_ORIGINS: 'https://console.example.test',
        API_REQUIRE_HTTPS: 'false'
      })
    ).toThrow(/API_REQUIRE_HTTPS/)
  })

  it('parses the controlled origin and trusted proxy configuration', () => {
    const env = parseEnv({
      ...productionBase,
      API_ALLOWED_ORIGINS: 'https://console.example.test',
      API_REQUIRE_HTTPS: 'true',
      API_TRUSTED_PROXY_HOPS: '0',
      API_TRUSTED_PROXY_ADDRESSES: '127.0.0.1, ::1'
    })

    expect(env.API_ALLOWED_ORIGINS).toBe('https://console.example.test')
    expect(env.API_REQUIRE_HTTPS).toBe(true)
    expect(env.API_TRUSTED_PROXY_HOPS).toBe(0)
    expect(env.API_TRUSTED_PROXY_ADDRESSES).toBe('127.0.0.1, ::1')
  })

  it('rejects positive or malformed legacy proxy hops with a migration error', () => {
    expect(() =>
      parseEnv({
        ...productionBase,
        API_ALLOWED_ORIGINS: 'https://console.example.test',
        API_REQUIRE_HTTPS: 'true',
        API_TRUSTED_PROXY_HOPS: '1'
      })
    ).toThrow(/API_TRUSTED_PROXY_HOPS.*API_TRUSTED_PROXY_ADDRESSES|migration/i)

    expect(() =>
      parseEnv({
        ...productionBase,
        API_ALLOWED_ORIGINS: 'https://console.example.test',
        API_REQUIRE_HTTPS: 'true',
        API_TRUSTED_PROXY_HOPS: 'invalid'
      })
    ).toThrow(/API_TRUSTED_PROXY_HOPS.*API_TRUSTED_PROXY_ADDRESSES|migration/i)
  })
})
