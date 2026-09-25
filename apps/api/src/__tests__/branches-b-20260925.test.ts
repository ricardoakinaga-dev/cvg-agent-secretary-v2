import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildServer, buildServerFromEnv } from '../server.ts'
import {
  API_CONTENT_SECURITY_POLICY,
  HTTP_SECURITY_ALLOWED_HEADERS,
  HTTP_SECURITY_ALLOWED_METHODS,
  normalizeHttpSecurityOptions,
  normalizeOrigin,
  normalizeTrustedProxyAddresses,
  parseAllowedOrigins,
  parseHttpSecurityEnv,
  parseTrustedProxyAddresses
} from '../http-security.ts'
import {
  OPERATOR_IDENTITY_KEYRING_ENV,
  createConfiguredOperatorIdentityResolver,
  createConfiguredOperatorReplayGuard,
  createLocalIdentityKeyRing,
  createTrustedOperatorIdentityResolver,
  createTrustedOperatorIdentityToken,
  createTrustedOperatorReplayGuard
} from '../operator-identity.ts'
import {
  OPERATOR_REPLAY_STORE_ENV,
  InMemoryOperatorReplayStore,
  PostgresOperatorReplayStore,
  assertProductionReplayConfiguration,
  createOperatorReplayStoreFromEnv
} from '../operator-replay-store.ts'
import { IDENTITY_MODE_ENV } from '@cvg/shared'

const TENANT = 'tenant_00000000-0000-4000-8000-000000000811'
const OPERATOR_HEADERS = {
  'x-operator-id': 'operator.branches-b',
  'x-operator-role': 'Operator',
  'x-tenant-id': TENANT
}
const SUPERVISOR_HEADERS = {
  'x-operator-id': 'supervisor.branches-b',
  'x-operator-role': 'Supervisor',
  'x-tenant-id': TENANT
}
const SECRET = 'branches-b-operator-signing-secret-long-enough-123456'
const IDENTITY = {
  operatorId: 'operator.branches-b',
  role: 'Supervisor' as const,
  tenantId: TENANT
}

interface Envelope<T> {
  success: boolean
  data: T | null
  error: { code: string; message: string } | null
}

function fakeQueryable() {
  return {
    query: async () => ({ rows: [], rowCount: 0 })
  } as never
}

function fakePool() {
  return {
    connect: async () => {
      throw new Error('pool must not connect without database')
    }
  } as never
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('server build guards without database', () => {
  it('rejects simulation identity in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(() =>
      buildServer({
        identityMode: 'simulation',
        durableInbound: true,
        operatorIdentityResolver: () => IDENTITY,
        webhookVerifier: () => true,
        inboundTenantResolver: () => TENANT
      })
    ).toThrow(/simulation is forbidden/)
  })

  it('rejects direct postgres client construction outside test', () => {
    vi.stubEnv('NODE_ENV', 'development')
    expect(() =>
      buildServer({
        persistence: { kind: 'postgres', client: fakeQueryable() }
      })
    ).toThrow(/tenant-scoped pool/)
  })

  it('rejects production construction without durable inbound', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(() => buildServer()).toThrow(
      /durable inbound processing|simulation is forbidden|trusted operator identity/i
    )
  })

  it('builds memory server with explicit simulation mode in test', async () => {
    const app = buildServer({ identityMode: 'simulation' })
    const health = await app.inject({ method: 'GET', url: '/health' })
    await app.close()
    expect(health.statusCode).toBe(200)
  })

  it('builds trusted memory server with injected resolver and guard wiring', async () => {
    const store = new InMemoryOperatorReplayStore()
    const guard = createTrustedOperatorReplayGuard({
      secret: SECRET,
      store
    })
    const token = createTrustedOperatorIdentityToken(
      IDENTITY,
      SECRET,
      () => Date.now(),
      120
    )
    const app = buildServer({
      identityMode: 'trusted',
      operatorIdentityResolver: () => IDENTITY,
      operatorReplayGuard: guard
    })
    const response = await app.inject({
      method: 'GET',
      url: '/v1/tasks',
      headers: {
        'x-operator-id': IDENTITY.operatorId,
        'x-operator-role': IDENTITY.role,
        'x-tenant-id': TENANT,
        'x-cvg-operator-token': token
      }
    })
    await app.close()
    expect(response.statusCode).toBe(200)
  })

  it('denies requests when the trusted replay guard rejects the token', async () => {
    const app = buildServer({
      identityMode: 'trusted',
      operatorIdentityResolver: () => IDENTITY,
      operatorReplayGuard: async () => {
        throw new Error('replayed')
      }
    })
    const response = await app.inject({
      method: 'GET',
      url: '/v1/tasks',
      headers: {
        'x-operator-id': IDENTITY.operatorId,
        'x-operator-role': IDENTITY.role,
        'x-tenant-id': TENANT
      }
    })
    await app.close()
    expect(response.statusCode).toBe(401)
    expect((response.json() as Envelope<never>).error?.code).toBe(
      'unauthorized'
    )
  })

  it('ignores the replay guard in simulation mode', async () => {
    const app = buildServer({
      identityMode: 'simulation',
      operatorReplayGuard: async () => {
        throw new Error('must be ignored in simulation')
      }
    })
    const response = await app.inject({
      method: 'GET',
      url: '/v1/tasks',
      headers: OPERATOR_HEADERS
    })
    await app.close()
    expect(response.statusCode).toBe(200)
  })

  it('exposes readiness probes and custom metrics hooks without database', async () => {
    const app = buildServer({
      readinessProbes: [
        {
          name: 'fixture',
          check: async () => undefined,
          timeoutMs: 1000
        }
      ]
    })
    const ready = await app.inject({ method: 'GET', url: '/ready' })
    const metrics = await app.inject({
      method: 'GET',
      url: '/health/metrics'
    })
    await app.close()
    expect(ready.statusCode).toBe(200)
    expect(
      (metrics.json() as Envelope<{ metrics: unknown }>).data?.metrics
    ).toBeDefined()
  })

  it('composes postgres client platform selection without opening a connection', async () => {
    const app = buildServer({
      persistence: { kind: 'postgres', client: fakeQueryable() }
    })
    const health = await app.inject({ method: 'GET', url: '/health' })
    await app.close()
    expect(health.statusCode).toBe(200)
  })

  it('composes tenant-scoped pool platform selection without opening a connection', async () => {
    const app = buildServer({
      persistence: { kind: 'postgres-pool', pool: fakePool() }
    })
    const health = await app.inject({ method: 'GET', url: '/health' })
    await app.close()
    expect(health.statusCode).toBe(200)
  })
})

describe('server pure routes without database', () => {
  it('answers health, live and metrics envelopes', async () => {
    const app = buildServer()
    const health = await app.inject({ method: 'GET', url: '/health' })
    const live = await app.inject({ method: 'GET', url: '/live' })
    const metrics = await app.inject({
      method: 'GET',
      url: '/health/metrics'
    })
    await app.close()
    expect(health.statusCode).toBe(200)
    expect((health.json() as Envelope<{ status: string }>).data?.status).toBe(
      'ok'
    )
    expect(live.statusCode).toBe(200)
    expect(metrics.statusCode).toBe(200)
    expect(health.headers['content-security-policy']).toBe(
      API_CONTENT_SECURITY_POLICY
    )
    expect(health.headers['x-content-type-options']).toBe('nosniff')
    expect(health.headers['x-frame-options']).toBe('DENY')
  })

  it('hides metrics when disabled', async () => {
    const app = buildServer({ requestMetricsEnabled: false })
    const response = await app.inject({
      method: 'GET',
      url: '/health/metrics'
    })
    await app.close()
    expect(response.statusCode).toBe(404)
  })

  it('returns stable envelopes for unknown routes and oversize targets', async () => {
    const app = buildServer()
    const missing = await app.inject({
      method: 'GET',
      url: '/v1/does-not-exist-b'
    })
    const oversize = await app.inject({
      method: 'GET',
      url: `/${'q'.repeat(9 * 1024)}`
    })
    await app.close()
    expect(missing.statusCode).toBe(404)
    expect((missing.json() as Envelope<never>).error?.code).toBe('not_found')
    expect(oversize.statusCode).toBe(414)
  })

  it('lists conversations and rejects invalid pagination without database', async () => {
    const app = buildServer()
    const page = await app.inject({
      method: 'GET',
      url: '/v1/conversations?limit=10&offset=0',
      headers: OPERATOR_HEADERS
    })
    const badLimit = await app.inject({
      method: 'GET',
      url: '/v1/conversations?limit=0',
      headers: OPERATOR_HEADERS
    })
    const unauthorized = await app.inject({
      method: 'GET',
      url: '/v1/conversations?limit=10'
    })
    await app.close()
    expect(page.statusCode).toBe(200)
    expect(badLimit.statusCode).toBe(400)
    expect((badLimit.json() as Envelope<never>).error?.code).toBe(
      'invalid_pagination'
    )
    expect(unauthorized.statusCode).toBe(401)
  })

  it('lists tasks and maps task lifecycle errors without database', async () => {
    const app = buildServer()
    const list = await app.inject({
      method: 'GET',
      url: '/v1/tasks',
      headers: OPERATOR_HEADERS
    })
    const unauthorized = await app.inject({
      method: 'GET',
      url: '/v1/tasks'
    })
    const missing = await app.inject({
      method: 'PATCH',
      url: '/v1/tasks/task_00000000-0000-4000-8000-000000000811/status',
      headers: OPERATOR_HEADERS,
      payload: { status: 'in_progress' }
    })
    const invalidStatus = await app.inject({
      method: 'PATCH',
      url: '/v1/tasks/task_00000000-0000-4000-8000-000000000811/status',
      headers: OPERATOR_HEADERS,
      payload: { status: 'not-a-status' }
    })
    await app.close()
    expect(list.statusCode).toBe(200)
    expect(unauthorized.statusCode).toBe(401)
    expect(missing.statusCode).toBe(400)
    expect((missing.json() as Envelope<never>).error?.code).toBe(
      'invalid_action'
    )
    expect(invalidStatus.statusCode).toBe(400)
  })

  it('fails governed runtime approvals closed in memory mode', async () => {
    const app = buildServer()
    const list = await app.inject({
      method: 'GET',
      url: '/v1/runtime-approvals',
      headers: OPERATOR_HEADERS
    })
    const decision = await app.inject({
      method: 'POST',
      url: '/v1/runtime-approvals/approval_00000000-0000-4000-8000-000000000811/decision',
      headers: {
        'x-operator-id': 'approver.branches-b',
        'x-operator-role': 'Approver',
        'x-tenant-id': TENANT
      },
      payload: { decision: 'approve' }
    })
    await app.close()
    expect(list.statusCode).toBe(400)
    expect((list.json() as Envelope<never>).error?.code).toBe('invalid_action')
    expect(decision.statusCode).toBe(400)
  })

  it('fails durable goal inspection closed for direct postgres mode without querying', async () => {
    const app = buildServer({
      persistence: { kind: 'postgres', client: fakeQueryable() }
    })
    const goals = await app.inject({
      method: 'GET',
      url: '/v1/orchestration/goals',
      headers: {
        'x-operator-id': 'operator.branches-b',
        'x-operator-role': 'Supervisor',
        'x-tenant-id': TENANT
      }
    })
    const goalDetail = await app.inject({
      method: 'GET',
      url: '/v1/orchestration/goals/goal_00000000-0000-4000-8000-000000000811',
      headers: {
        'x-operator-id': 'operator.branches-b',
        'x-operator-role': 'Supervisor',
        'x-tenant-id': TENANT
      }
    })
    await app.close()
    expect(goals.statusCode).toBe(400)
    expect((goals.json() as Envelope<never>).error?.code).toBe(
      'invalid_action'
    )
    expect(goalDetail.statusCode).toBe(400)
  })

  it('fails journey routes closed when the repository is null', async () => {
    const app = buildServer({ journeyRepository: null })
    const slots = await app.inject({
      method: 'GET',
      url: '/v1/journeys/slots',
      headers: OPERATOR_HEADERS
    })
    const drafts = await app.inject({
      method: 'GET',
      url: '/v1/journeys/owner-drafts',
      headers: OPERATOR_HEADERS
    })
    const search = await app.inject({
      method: 'GET',
      url: '/v1/journeys/owners/search?phone=%2B5511000000000',
      headers: OPERATOR_HEADERS
    })
    await app.close()
    expect(slots.statusCode).toBe(400)
    expect(drafts.statusCode).toBe(400)
    expect(search.statusCode).toBe(400)
  })

  it('fails dead-letter inspection closed when the outbox has no dead-letter support', async () => {
    const app = buildServer({
      outbox: {} as never
    })
    const deadLetters = await app.inject({
      method: 'GET',
      url: '/v1/outbox/dead-letters',
      headers: {
        'x-operator-id': 'operator.branches-b',
        'x-operator-role': 'Supervisor',
        'x-tenant-id': TENANT
      }
    })
    await app.close()
    expect(deadLetters.statusCode).toBe(400)
    expect((deadLetters.json() as Envelope<never>).error?.code).toBe(
      'invalid_action'
    )
  })

  it('rejects webhook calls with invalid channels and failed verification', async () => {
    const app = buildServer()
    const invalidChannel = await app.inject({
      method: 'POST',
      url: '/v1/webhooks/channels/not_a_channel!!/messages',
      payload: {
        externalMessageId: 'branches-b-1',
        senderRef: 'fixture',
        body: 'Fixture message'
      }
    })
    await app.close()

    const denying = buildServer({ webhookVerifier: () => false })
    const denied = await denying.inject({
      method: 'POST',
      url: '/v1/webhooks/channels/web/messages',
      payload: {
        externalMessageId: 'branches-b-2',
        senderRef: 'fixture',
        body: 'Fixture message'
      }
    })
    await denying.close()

    expect(invalidChannel.statusCode).toBe(400)
    expect(denied.statusCode).toBe(401)
  })

  it('commits webhook leases on success and releases them on failure', async () => {
    let committed = 0
    let released = 0
    const leaseApp = buildServer({
      webhookVerifier: () => ({
        verified: true as const,
        commit: async () => {
          committed += 1
        },
        release: async () => {
          released += 1
        }
      })
    })
    const leased = await leaseApp.inject({
      method: 'POST',
      url: '/v1/webhooks/channels/web/messages',
      payload: {
        externalMessageId: 'branches-b-lease-1',
        senderRef: 'fixture',
        body: 'Fixture lease message',
        receivedAt: '2026-09-25T10:00:00.000Z'
      }
    })
    await leaseApp.close()
    expect(leased.statusCode).toBe(200)
    expect(committed).toBe(1)
    expect(released).toBe(0)

    let releasedOnError = 0
    const failingApp = buildServer({
      webhookVerifier: () => ({
        verified: true as const,
        commit: async () => undefined,
        release: async () => {
          releasedOnError += 1
        }
      })
    })
    const failing = await failingApp.inject({
      method: 'POST',
      url: '/v1/webhooks/channels/!!!/messages',
      payload: {
        externalMessageId: 'branches-b-lease-2',
        senderRef: 'fixture',
        body: 'Fixture lease message',
        receivedAt: '2026-09-25T10:00:00.000Z'
      }
    })
    await failingApp.close()
    expect(failing.statusCode).toBe(400)
    expect(releasedOnError).toBe(1)
  })

  it('queues durable inbound work in memory without a real worker', async () => {
    const app = buildServer({ durableInbound: true })
    const response = await app.inject({
      method: 'POST',
      url: '/v1/webhooks/channels/web/messages',
      payload: {
        externalMessageId: 'branches-b-durable-1',
        senderRef: 'fixture-sender',
        body: 'Durable fixture message',
        receivedAt: '2026-09-25T10:00:00.000Z'
      }
    })
    await app.close()
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      success: true,
      data: { processing: 'queued' }
    })
  })

  it('enforces the in-memory request rate limit with a stable envelope', async () => {
    const app = buildServer()
    let lastStatus = 200
    for (let index = 0; index < 310; index += 1) {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      })
      lastStatus = response.statusCode
      if (lastStatus === 429) {
        expect(response.headers['retry-after']).toBeDefined()
        expect(response.json()).toMatchObject({
          success: false,
          error: { code: 'rate_limited' }
        })
        break
      }
    }
    await app.close()
    expect(lastStatus).toBe(429)
  }, 20000)

  it('requires tenant scope for journey mutations without identity', async () => {
    const app = buildServer({
      journeyRepository: null,
      requireAuthenticatedMutations: true
    })
    const response = await app.inject({
      method: 'POST',
      url: '/v1/journeys/owner-drafts',
      payload: { name: 'Fixture' }
    })
    await app.close()
    expect(response.statusCode).toBe(401)
    expect((response.json() as Envelope<never>).error?.code).toBe(
      'unauthorized'
    )
  })
})

describe('buildServerFromEnv memory branches without database', () => {
  it('requires an explicit NODE_ENV', async () => {
    await expect(buildServerFromEnv({})).rejects.toThrow(/NODE_ENV/)
  })

  it('rejects unknown persistence modes before connecting', async () => {
    await expect(
      buildServerFromEnv({
        NODE_ENV: 'test',
        API_PERSISTENCE_MODE: 'archive'
      })
    ).rejects.toThrow(/API_PERSISTENCE_MODE/)
  })

  it('rejects production memory mode before connecting', async () => {
    await expect(
      buildServerFromEnv({
        NODE_ENV: 'production',
        API_PERSISTENCE_MODE: 'memory'
      })
    ).rejects.toThrow(/PostgreSQL persistence/)
  })

  it('rejects production simulation mode before connecting', async () => {
    await expect(
      buildServerFromEnv(
        { NODE_ENV: 'production', API_PERSISTENCE_MODE: 'memory' },
        { identityMode: 'simulation' }
      )
    ).rejects.toThrow(/simulation is forbidden/)
  })

  it('builds a memory server from env in test without a database', async () => {
    const app = await buildServerFromEnv({
      NODE_ENV: 'test',
      API_PERSISTENCE_MODE: 'memory'
    })
    const health = await app.inject({ method: 'GET', url: '/health' })
    await app.close()
    expect(health.statusCode).toBe(200)
  })

  it('requires DATABASE_URL for postgres mode before connecting', async () => {
    await expect(
      buildServerFromEnv({
        NODE_ENV: 'test',
        API_PERSISTENCE_MODE: 'postgres'
      })
    ).rejects.toThrow(/DATABASE_URL/)
  })

  it('rejects unsafe postgres schema names before connecting', async () => {
    await expect(
      buildServerFromEnv({
        NODE_ENV: 'test',
        API_PERSISTENCE_MODE: 'postgres',
        DATABASE_URL: 'postgres://fixture:fixture@127.0.0.1:1/fixture',
        POSTGRES_SCHEMA: 'Bad-Schema'
      })
    ).rejects.toThrow(/schema/i)
  })
})

describe('http security pure parsers without network', () => {
  it('normalizes valid origins and rejects invalid shapes', () => {
    expect(normalizeOrigin('https://console.example.test')).toBe(
      'https://console.example.test'
    )
    expect(normalizeOrigin('  https://console.example.test/  ')).toBe(
      'https://console.example.test'
    )
    expect(normalizeOrigin('https://console.example.test:8443/')).toBe(
      'https://console.example.test:8443'
    )
    for (const invalid of [
      '',
      '   ',
      '*',
      'null',
      'NULL',
      'not-a-url',
      'ftp://console.example.test/',
      'https://user@console.example.test/',
      'https://console.example.test/app',
      'https://console.example.test/?q=1',
      'https://console.example.test/#fragment'
    ]) {
      expect(() => normalizeOrigin(invalid)).toThrow(/origin/i)
    }
  })

  it('parses allowed origin lists with dedupe and empty checks', () => {
    expect(parseAllowedOrigins(undefined)).toEqual([])
    expect(parseAllowedOrigins('')).toEqual([])
    expect(parseAllowedOrigins('   ')).toEqual([])
    expect(
      parseAllowedOrigins(
        'https://a.example.test, https://b.example.test, https://a.example.test'
      )
    ).toEqual(['https://a.example.test', 'https://b.example.test'])
    expect(() =>
      parseAllowedOrigins('https://a.example.test,,https://b.example.test')
    ).toThrow(/empty origin/)
    expect(() => parseAllowedOrigins('https://a.example.test, not-a-url')).toThrow(
      /origin/i
    )
  })

  it('parses trusted proxy env values without network', () => {
    expect(parseTrustedProxyAddresses(undefined)).toEqual([])
    expect(parseTrustedProxyAddresses('')).toEqual([])
    expect(parseTrustedProxyAddresses('   ')).toEqual([])
    expect(
      parseTrustedProxyAddresses('127.0.0.1, ::1, 127.0.0.1')
    ).toEqual(['127.0.0.1', '::1'])
    expect(() => parseTrustedProxyAddresses(42 as never)).toThrow(
      /trusted proxy address/i
    )
    expect(() => parseTrustedProxyAddresses('127.0.0.1,,::1')).toThrow(
      /trusted proxy address/i
    )
    expect(() => parseTrustedProxyAddresses('example.com')).toThrow(
      /trusted proxy address/i
    )
    expect(() => parseTrustedProxyAddresses('10.0.0.0/8')).toThrow(
      /trusted proxy address/i
    )
    expect(() => parseTrustedProxyAddresses('*')).toThrow(
      /trusted proxy address/i
    )
    expect(() => parseTrustedProxyAddresses('0.0.0.0')).toThrow(
      /trusted proxy address/i
    )
  })

  it('normalizes proxy literals with limits and unspecified rejection', () => {
    expect(() =>
      normalizeTrustedProxyAddresses('not-an-array' as never)
    ).toThrow(/trusted proxy address/i)
    expect(() =>
      normalizeTrustedProxyAddresses(new Array(33).fill('127.0.0.1'))
    ).toThrow(/trusted proxy address/i)
    expect(() => normalizeTrustedProxyAddresses([42 as never])).toThrow(
      /trusted proxy address/i
    )
    expect(() => normalizeTrustedProxyAddresses([''])).toThrow(
      /trusted proxy address/i
    )
    expect(() => normalizeTrustedProxyAddresses(['fe80::1%eth0'])).toThrow(
      /trusted proxy address/i
    )
    expect(() => normalizeTrustedProxyAddresses(['0.0.0.0'])).toThrow(
      /trusted proxy address/i
    )
    expect(() => normalizeTrustedProxyAddresses(['::'])).toThrow(
      /trusted proxy address/i
    )
    expect(() => normalizeTrustedProxyAddresses(['::ffff:0.0.0.0'])).toThrow(
      /trusted proxy address/i
    )
    expect(() => normalizeTrustedProxyAddresses(['::ffff:0:0'])).toThrow(
      /trusted proxy address/i
    )
    expect(
      normalizeTrustedProxyAddresses(['127.0.0.1', '127.0.0.1', '::1'])
    ).toEqual(['127.0.0.1', '::1'])
  })

  it('normalizes security options with hsts bounds and legacy hop rejection', () => {
    const defaults = normalizeHttpSecurityOptions()
    expect(defaults.enforceHttps).toBe(false)
    expect(defaults.trustedProxyHops).toBe(0)
    expect(defaults.hstsMaxAgeSeconds).toBe(31536000)

    const deduped = normalizeHttpSecurityOptions({
      allowedOrigins: ['https://a.example.test', 'https://a.example.test/']
    })
    expect(deduped.allowedOrigins).toEqual(['https://a.example.test'])

    for (const hsts of [299, 31536001, 1.5, Number.NaN]) {
      expect(() =>
        normalizeHttpSecurityOptions({ hstsMaxAgeSeconds: hsts })
      ).toThrow(/hstsMaxAgeSeconds/)
    }
    expect(() =>
      normalizeHttpSecurityOptions({ hstsMaxAgeSeconds: 300 })
    ).not.toThrow()
    expect(() =>
      normalizeHttpSecurityOptions({ trustedProxyHops: 1 })
    ).toThrow(/trusted|proxy|hop/i)
    expect(() =>
      normalizeHttpSecurityOptions({ trustedProxyAddresses: ['not-an-ip'] })
    ).toThrow(/trusted proxy address/i)
  })

  it('parses http security env for production and non-production', () => {
    expect(() =>
      parseHttpSecurityEnv({
        NODE_ENV: 'production',
        API_REQUIRE_HTTPS: 'true',
        API_TRUSTED_PROXY_ADDRESSES: '127.0.0.1'
      })
    ).toThrow(/API_ALLOWED_ORIGINS/)

    expect(() =>
      parseHttpSecurityEnv({
        NODE_ENV: 'production',
        API_ALLOWED_ORIGINS: 'https://console.example.test',
        API_REQUIRE_HTTPS: 'false',
        API_TRUSTED_PROXY_ADDRESSES: '127.0.0.1'
      })
    ).toThrow(/API_REQUIRE_HTTPS/)

    const production = parseHttpSecurityEnv({
      NODE_ENV: 'production',
      API_ALLOWED_ORIGINS: 'https://console.example.test',
      API_REQUIRE_HTTPS: 'true',
      API_TRUSTED_PROXY_ADDRESSES: '127.0.0.1'
    })
    expect(production.enforceHttps).toBe(true)
    expect(production.allowedOrigins).toEqual(['https://console.example.test'])

    expect(() =>
      parseHttpSecurityEnv({
        NODE_ENV: 'production',
        API_ALLOWED_ORIGINS: 'https://console.example.test',
        API_REQUIRE_HTTPS: 'true',
        API_TRUSTED_PROXY_ADDRESSES: '127.0.0.1',
        API_TRUSTED_PROXY_HOPS: '1'
      })
    ).toThrow(/trusted|proxy|hop/i)

    const nonProduction = parseHttpSecurityEnv(
      {
        NODE_ENV: 'test',
        API_ALLOWED_ORIGINS: 'https://a.example.test',
        API_REQUIRE_HTTPS: 'true'
      },
      { allowedOrigins: ['https://b.example.test'] }
    )
    expect(nonProduction.allowedOrigins).toEqual(['https://a.example.test'])
    expect(nonProduction.enforceHttps).toBe(true)

    const fallback = parseHttpSecurityEnv(
      { NODE_ENV: 'test' },
      { allowedOrigins: ['https://b.example.test'] }
    )
    expect(fallback.allowedOrigins).toEqual(['https://b.example.test'])

    expect(() =>
      parseHttpSecurityEnv({
        NODE_ENV: 'test',
        API_REQUIRE_HTTPS: 'maybe'
      })
    ).toThrow(/boolean/i)

    expect(() =>
      parseHttpSecurityEnv(
        { NODE_ENV: 'test', API_TRUSTED_PROXY_HOPS: '2' },
        {}
      )
    ).toThrow(/trusted|proxy|hop/i)
  })

  it('exposes stable security constants', () => {
    expect(HTTP_SECURITY_ALLOWED_METHODS).toContain('GET')
    expect(HTTP_SECURITY_ALLOWED_METHODS).toContain('OPTIONS')
    expect(HTTP_SECURITY_ALLOWED_HEADERS).toContain('x-tenant-id')
    expect(API_CONTENT_SECURITY_POLICY).toContain("default-src 'none'")
  })
})

describe('http security hooks without network', () => {
  const allowedOrigin = 'https://console.example.test'

  it('requires secure transport when enforced', async () => {
    const app = buildServer({
      httpSecurity: {
        allowedOrigins: [allowedOrigin],
        enforceHttps: true,
        trustedProxyAddresses: []
      }
    })
    const plain = await app.inject({ method: 'GET', url: '/health' })
    await app.close()
    expect(plain.statusCode).toBe(426)
    expect(plain.headers['upgrade']).toBe('TLS/1.2')
  })

  it('rejects invalid origin headers', async () => {
    const app = buildServer({
      httpSecurity: { allowedOrigins: [allowedOrigin] }
    })
    const invalid = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'not-a-valid-origin' }
    })
    const disallowed = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'https://other.example.test' }
    })
    const allowed = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: allowedOrigin }
    })
    await app.close()
    expect(invalid.statusCode).toBe(403)
    expect(disallowed.statusCode).toBe(403)
    expect(allowed.statusCode).toBe(200)
    expect(allowed.headers['access-control-allow-origin']).toBe(allowedOrigin)
    expect(allowed.headers['vary']).toBe('Origin')
  })

  it('validates CORS preflight branches', async () => {
    const app = buildServer({
      httpSecurity: { allowedOrigins: [allowedOrigin] }
    })
    const valid = await app.inject({
      method: 'OPTIONS',
      url: '/health',
      headers: {
        origin: allowedOrigin,
        'access-control-request-method': 'GET'
      }
    })
    const disallowedOrigin = await app.inject({
      method: 'OPTIONS',
      url: '/health',
      headers: {
        origin: 'https://other.example.test',
        'access-control-request-method': 'GET'
      }
    })
    const invalidMethod = await app.inject({
      method: 'OPTIONS',
      url: '/health',
      headers: {
        origin: allowedOrigin,
        'access-control-request-method': 'DELETE'
      }
    })
    const missingMethod = await app.inject({
      method: 'OPTIONS',
      url: '/health',
      headers: { origin: allowedOrigin }
    })
    const invalidHeaders = await app.inject({
      method: 'OPTIONS',
      url: '/health',
      headers: {
        origin: allowedOrigin,
        'access-control-request-method': 'GET',
        'access-control-request-headers': 'x-not-allowed-header'
      }
    })
    const allowedHeaders = await app.inject({
      method: 'OPTIONS',
      url: '/health',
      headers: {
        origin: allowedOrigin,
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type, x-tenant-id'
      }
    })
    await app.close()
    expect(valid.statusCode).toBe(204)
    expect(valid.headers['access-control-allow-methods']).toContain('GET')
    expect(valid.headers['access-control-max-age']).toBe('600')
    expect(disallowedOrigin.statusCode).toBe(403)
    expect(invalidMethod.statusCode).toBe(403)
    expect(missingMethod.statusCode).toBe(403)
    expect(invalidHeaders.statusCode).toBe(403)
    expect(allowedHeaders.statusCode).toBe(204)
  })
})

describe('operator identity branches without network', () => {
  it('creates tokens bound to key ids and rejects tenantless identities', () => {
    const token = createTrustedOperatorIdentityToken(
      IDENTITY,
      { keyId: 'key-1', secret: SECRET },
      () => 1700000000000,
      60
    )
    expect(token.split('.')).toHaveLength(2)
    expect(() =>
      createTrustedOperatorIdentityToken(
        {
          operatorId: IDENTITY.operatorId,
          role: IDENTITY.role
        } as never,
        SECRET
      )
    ).toThrow(/tenant-bound/)
    expect(() =>
      createTrustedOperatorIdentityToken(IDENTITY, SECRET, () => 1000, 901)
    ).toThrow(/token window/)
  })

  it('validates local key ring bounds without network', () => {
    expect(() =>
      createLocalIdentityKeyRing({
        current: { keyId: 'key-1', secret: SECRET },
        rotationWindowSeconds: 0
      })
    ).toThrow(/rotation window/)
    expect(() =>
      createLocalIdentityKeyRing({
        current: { keyId: 'key-1', secret: SECRET },
        rotationWindowSeconds: 86401
      })
    ).toThrow(/rotation window/)
    expect(() =>
      createLocalIdentityKeyRing({
        current: { keyId: 'bad id!', secret: SECRET }
      })
    ).toThrow(/key id/)
    expect(() =>
      createLocalIdentityKeyRing({
        current: { keyId: 'key-1', secret: SECRET },
        previous: [{ keyId: 'key-0', secret: SECRET, rotatedAt: -1 }]
      })
    ).toThrow(/rotatedAt/)
    expect(() =>
      createLocalIdentityKeyRing({
        current: { keyId: 'key-1', secret: SECRET },
        previous: [{ keyId: 'key-1', secret: SECRET, rotatedAt: 100 }]
      })
    ).toThrow(/duplicate/)
    expect(() =>
      createLocalIdentityKeyRing({
        current: { keyId: 'key-1', secret: 'short' }
      })
    ).toThrow(/signing secret/)
  })

  it('honors revocation and bounded previous windows', () => {
    const nowSeconds = 2000000
    const ring = createLocalIdentityKeyRing({
      current: { keyId: 'key-active', secret: SECRET },
      previous: [
        {
          keyId: 'key-old',
          secret: 'previous-operator-secret-long-enough-1234567890',
          rotatedAt: nowSeconds - 100
        }
      ],
      revokedKeyIds: ['key-revoked'],
      rotationWindowSeconds: 3600
    })
    const active = ring.keysAt(nowSeconds)
    expect(active.map((key) => key.keyId)).toContain('key-active')
    expect(active.map((key) => key.keyId)).toContain('key-old')

    const expired = ring.keysAt(nowSeconds + 10000)
    expect(expired.map((key) => key.keyId)).not.toContain('key-old')

    const revoked = createLocalIdentityKeyRing({
      current: { keyId: 'key-active', secret: SECRET },
      revokedKeyIds: ['key-active']
    })
    expect(revoked.keysAt(nowSeconds)).toEqual([])
    expect(ring.keysAt(Number.NaN)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keyId: 'key-active' })
      ])
    )
  })

  it('resolves configured identity from env key ring without network', () => {
    expect(
      createConfiguredOperatorIdentityResolver({
        NODE_ENV: 'test',
        [IDENTITY_MODE_ENV]: 'simulation',
        [OPERATOR_IDENTITY_KEYRING_ENV]: JSON.stringify({
          current: { keyId: 'key-1', secret: SECRET }
        })
      })
    ).toBeUndefined()
    expect(createConfiguredOperatorIdentityResolver({ NODE_ENV: 'test' })).toBeUndefined()
    expect(() =>
      createConfiguredOperatorIdentityResolver({
        NODE_ENV: 'test',
        [IDENTITY_MODE_ENV]: 'trusted',
        [OPERATOR_IDENTITY_KEYRING_ENV]: 'not-json'
      })
    ).toThrow(/keyring.*invalid/i)
    expect(() =>
      createConfiguredOperatorIdentityResolver({
        NODE_ENV: 'test',
        [IDENTITY_MODE_ENV]: 'trusted',
        [OPERATOR_IDENTITY_KEYRING_ENV]: JSON.stringify(['array'])
      })
    ).toThrow(/keyring.*invalid/i)
  })

  it('verifies key ring tokens and rejects missing or inactive kids', () => {
    const nowMs = 1700000000000
    const ring = createLocalIdentityKeyRing({
      current: { keyId: 'key-active', secret: SECRET }
    })
    const resolve = createTrustedOperatorIdentityResolver({
      keyRing: ring,
      now: () => nowMs
    })
    const token = createTrustedOperatorIdentityToken(
      IDENTITY,
      { keyId: 'key-active', secret: SECRET },
      () => nowMs,
      120
    )
    expect(resolve({ 'x-cvg-operator-token': token })).toEqual(IDENTITY)

    const otherRing = createLocalIdentityKeyRing({
      current: { keyId: 'key-other', secret: SECRET }
    })
    const otherResolve = createTrustedOperatorIdentityResolver({
      keyRing: otherRing,
      now: () => nowMs
    })
    expect(() =>
      otherResolve({ 'x-cvg-operator-token': token })
    ).toThrow(/not active/)

    const noKid = createTrustedOperatorIdentityToken(
      IDENTITY,
      SECRET,
      () => nowMs,
      120
    )
    expect(() => resolve({ 'x-cvg-operator-token': noKid })).toThrow(
      /key identifier/
    )
  })

  it('guards distributed replay without network', async () => {
    const store = new InMemoryOperatorReplayStore()
    const guard = createConfiguredOperatorReplayGuard(
      {
        NODE_ENV: 'test',
        [IDENTITY_MODE_ENV]: 'trusted',
        [OPERATOR_IDENTITY_KEYRING_ENV]: JSON.stringify({
          current: { keyId: 'key-1', secret: SECRET }
        })
      },
      store
    )
    expect(guard).toBeDefined()

    expect(
      createConfiguredOperatorReplayGuard({ NODE_ENV: 'test' }, store)
    ).toBeUndefined()

    const direct = createTrustedOperatorReplayGuard({
      secret: SECRET,
      store
    })
    await direct({})
    await direct({ 'x-cvg-operator-token': '   ' })
    const token = createTrustedOperatorIdentityToken(
      IDENTITY,
      SECRET,
      () => Date.now(),
      120
    )
    await direct({ 'x-cvg-operator-token': token })
    await expect(
      direct({ 'x-cvg-operator-token': token })
    ).rejects.toThrow(/replay/)

    const failingStore = {
      claim: async () => {
        throw new Error('store offline')
      },
      purgeExpired: async () => 0
    }
    const failingGuard = createTrustedOperatorReplayGuard({
      secret: SECRET,
      store: failingStore
    })
    const fresh = createTrustedOperatorIdentityToken(
      IDENTITY,
      SECRET,
      () => Date.now(),
      120
    )
    await expect(
      failingGuard({ 'x-cvg-operator-token': fresh })
    ).rejects.toThrow(/offline/)
  })
})

describe('operator replay store in-memory branches without database', () => {
  it('claims, reclaims and purges with explicit clocks', async () => {
    let nowMs = 5000000
    const store = new InMemoryOperatorReplayStore({ now: () => nowMs })
    const expiresAtSeconds = Math.floor(nowMs / 1000) + 300
    expect(
      await store.claim({ issuer: 'cvg-api', jti: 'branches-b-1', expiresAtSeconds })
    ).toBe(true)
    expect(
      await store.claim({ issuer: 'cvg-api', jti: 'branches-b-1', expiresAtSeconds })
    ).toBe(false)
    expect(
      await store.claim({ issuer: 'other', jti: 'branches-b-1', expiresAtSeconds })
    ).toBe(true)
    expect(
      await store.claim({
        issuer: 'cvg-api',
        jti: 'expired',
        expiresAtSeconds: Math.floor(nowMs / 1000) - 10
      })
    ).toBe(false)
    await store.assertReady?.()
    nowMs = (expiresAtSeconds + 10) * 1000
    expect(await store.purgeExpired()).toBe(2)
    expect(
      await store.claim({ issuer: 'cvg-api', jti: 'branches-b-1', expiresAtSeconds: expiresAtSeconds + 100 })
    ).toBe(true)
    expect(await store.purgeExpired((expiresAtSeconds + 200))).toBe(1)
  })

  it('rejects invalid claim shapes without database', async () => {
    const store = new InMemoryOperatorReplayStore()
    await expect(
      store.claim({ issuer: '  ', jti: 'x', expiresAtSeconds: 100 })
    ).rejects.toThrow(/issuer/)
    await expect(
      store.claim({ issuer: 'x'.repeat(121), jti: 'x', expiresAtSeconds: 100 })
    ).rejects.toThrow(/issuer/)
    await expect(
      store.claim({ issuer: 'cvg-api', jti: '', expiresAtSeconds: 100 })
    ).rejects.toThrow(/token id/)
    await expect(
      store.claim({ issuer: 'cvg-api', jti: 'y'.repeat(161), expiresAtSeconds: 100 })
    ).rejects.toThrow(/token id/)
    await expect(
      store.claim({ issuer: 'cvg-api', jti: 'x', expiresAtSeconds: 0 })
    ).rejects.toThrow(/expiry/)
    await expect(
      store.claim({ issuer: 'cvg-api', jti: 'x', expiresAtSeconds: 1.5 })
    ).rejects.toThrow(/expiry/)
  })

  it('selects stores from env without database', () => {
    expect(createOperatorReplayStoreFromEnv({})).toBeUndefined()
    expect(
      createOperatorReplayStoreFromEnv({ [OPERATOR_REPLAY_STORE_ENV]: 'memory' })
    ).toBeInstanceOf(InMemoryOperatorReplayStore)
    expect(
      createOperatorReplayStoreFromEnv({
        [OPERATOR_REPLAY_STORE_ENV]: ' Memory '
      })
    ).toBeInstanceOf(InMemoryOperatorReplayStore)
    expect(() =>
      createOperatorReplayStoreFromEnv({
        NODE_ENV: 'production',
        [OPERATOR_REPLAY_STORE_ENV]: 'memory'
      })
    ).toThrow(/distributed/)
    expect(() =>
      createOperatorReplayStoreFromEnv({
        [OPERATOR_REPLAY_STORE_ENV]: 'postgres'
      })
    ).toThrow(/pool/)
    expect(() =>
      createOperatorReplayStoreFromEnv({ [OPERATOR_REPLAY_STORE_ENV]: 'redis' })
    ).toThrow(/memory or postgres/)
    const poolStore = createOperatorReplayStoreFromEnv(
      { [OPERATOR_REPLAY_STORE_ENV]: 'postgres' },
      fakePool()
    )
    expect(poolStore).toBeInstanceOf(PostgresOperatorReplayStore)
  })

  it('validates postgres constructor bounds without connecting', () => {
    expect(() => new PostgresOperatorReplayStore(fakePool(), { purgeIntervalMs: -1 })).toThrow(
      /purge interval/
    )
    expect(
      () => new PostgresOperatorReplayStore(fakePool(), { purgeIntervalMs: 3600001 })
    ).toThrow(/purge interval/)
    expect(
      () => new PostgresOperatorReplayStore(fakePool(), { purgeIntervalMs: Number.NaN })
    ).toThrow(/purge interval/)
    expect(
      new PostgresOperatorReplayStore(fakePool(), { purgeIntervalMs: 0 })
    ).toBeInstanceOf(PostgresOperatorReplayStore)
  })

  it('asserts production replay configuration without database', () => {
    expect(assertProductionReplayConfiguration({ NODE_ENV: 'test' })).toBeUndefined()
    expect(
      assertProductionReplayConfiguration({
        NODE_ENV: 'production',
        [OPERATOR_REPLAY_STORE_ENV]: 'postgres'
      })
    ).toBeUndefined()
    expect(() =>
      assertProductionReplayConfiguration({
        NODE_ENV: 'production',
        [OPERATOR_REPLAY_STORE_ENV]: 'memory'
      })
    ).toThrow(/postgres/)
    expect(() =>
      assertProductionReplayConfiguration({ NODE_ENV: 'production' }, false)
    ).toThrow(/replay guard/)
    expect(
      assertProductionReplayConfiguration({ NODE_ENV: 'production' }, true)
    ).toBeUndefined()
  })
})

describe('supervisor audit evidence guard without database', () => {
  it('rejects operator role for full audit evidence reads', async () => {
    const app = buildServer()
    const response = await app.inject({
      method: 'GET',
      url: '/v1/observability/audit-evidence',
      headers: OPERATOR_HEADERS
    })
    await app.close()
    expect(response.statusCode).toBe(403)
  })

  it('accepts supervisor role for empty audit evidence pages', async () => {
    const app = buildServer()
    const response = await app.inject({
      method: 'GET',
      url: '/v1/observability/audit-evidence?limit=10&offset=0',
      headers: SUPERVISOR_HEADERS
    })
    await app.close()
    expect(response.statusCode).toBe(200)
  })
})
