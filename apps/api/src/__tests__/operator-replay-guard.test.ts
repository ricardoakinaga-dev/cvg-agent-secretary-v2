import { Pool } from 'pg'
import { describe, expect, it } from 'vitest'
import type { OperatorIdentity } from '@cvg/shared'
import { buildServer } from '../server.ts'
import {
  TRUSTED_OPERATOR_TOKEN_HEADER,
  createLocalIdentityKeyRing,
  createTrustedOperatorIdentityResolver,
  createTrustedOperatorIdentityToken,
  createTrustedOperatorReplayGuard
} from '../operator-identity.ts'
import {
  InMemoryOperatorReplayStore,
  OPERATOR_REPLAY_EVENTS_DDL,
  PostgresOperatorReplayStore,
  type OperatorReplayStore
} from '../operator-replay-store.ts'

const testDatabaseUrl = process.env.TEST_DATABASE_URL
const itWithPostgres = testDatabaseUrl ? it : it.skip

const signingSecret = `guard-test-signing-secret-${'g'.repeat(16)}`
const keyRing = createLocalIdentityKeyRing({
  current: { keyId: 'guard-key-1', secret: signingSecret }
})
const tenantId = 'tenant_00000000-0000-4000-8000-000000000a06'
const identity: OperatorIdentity = {
  operatorId: 'guard.operator',
  role: 'Supervisor',
  tenantId
}
const clockSeconds = Math.floor(Date.now() / 1000)
const now = () => clockSeconds * 1000

const taskPayload = {
  sessionId: 'sess_00000000-0000-4000-8000-000000000a06',
  title: 'Tarefa fictícia de replay distribuído',
  description: 'Negativo de replay controlado',
  priority: 'medium',
  source: 'operator-replay-guard',
  idempotencyKey: 'operator-replay-guard-task'
}

interface Envelope<T> {
  success: boolean
  data: T | null
  error: { code: string; message: string } | null
}

function issueToken(): string {
  return createTrustedOperatorIdentityToken(
    identity,
    { keyId: 'guard-key-1', secret: signingSecret },
    now
  )
}

function decodeJti(token: string): string {
  const [encodedClaims] = token.split('.')
  const claims = JSON.parse(
    Buffer.from(encodedClaims!, 'base64url').toString('utf8')
  ) as { jti: string }
  return claims.jti
}

function guardedApp(store: OperatorReplayStore) {
  return buildServer({
    identityMode: 'trusted',
    operatorIdentityResolver: createTrustedOperatorIdentityResolver({
      keyRing,
      now
    }),
    operatorReplayGuard: createTrustedOperatorReplayGuard({
      keyRing,
      now,
      store
    })
  })
}

class SelectiveFailureStore implements OperatorReplayStore {
  readonly claimCalls: string[] = []
  private readonly inner = new InMemoryOperatorReplayStore()

  constructor(private readonly failingJti: string) {}

  async claim(input: {
    issuer: string
    jti: string
    expiresAtSeconds: number
  }): Promise<boolean> {
    this.claimCalls.push(input.jti)
    if (input.jti === this.failingJti) {
      throw new Error('operator replay store unavailable')
    }
    return this.inner.claim(input)
  }

  purgeExpired(nowSeconds?: number): Promise<number> {
    return this.inner.purgeExpired(nowSeconds)
  }

  assertReady(): Promise<void> {
    return this.inner.assertReady()
  }
}

describe('operator replay guard', () => {
  it('rejects the second use of the same JTI across two API instances', async () => {
    const store = new InMemoryOperatorReplayStore()
    const appA = guardedApp(store)
    const appB = guardedApp(store)
    const token = issueToken()

    const first = await appA.inject({
      method: 'GET',
      url: '/v1/tasks',
      headers: { [TRUSTED_OPERATOR_TOKEN_HEADER]: token }
    })
    const replayOtherInstance = await appB.inject({
      method: 'GET',
      url: '/v1/tasks',
      headers: { [TRUSTED_OPERATOR_TOKEN_HEADER]: token }
    })
    const replaySameInstance = await appA.inject({
      method: 'GET',
      url: '/v1/tasks',
      headers: { [TRUSTED_OPERATOR_TOKEN_HEADER]: token }
    })
    const freshAcrossInstances = await appB.inject({
      method: 'GET',
      url: '/v1/tasks',
      headers: { [TRUSTED_OPERATOR_TOKEN_HEADER]: issueToken() }
    })
    await appA.close()
    await appB.close()

    expect(first.statusCode).toBe(200)
    expect(replayOtherInstance.statusCode).toBe(401)
    expect((replayOtherInstance.json() as Envelope<never>).error?.code).toBe(
      'unauthorized'
    )
    expect(replaySameInstance.statusCode).toBe(401)
    expect(freshAcrossInstances.statusCode).toBe(200)
  })

  it('fails closed when the replay store is unavailable without side effects', async () => {
    const deniedToken = issueToken()
    const store = new SelectiveFailureStore(decodeJti(deniedToken))
    const app = guardedApp(store)

    const denied = await app.inject({
      method: 'POST',
      url: '/v1/tasks',
      headers: { [TRUSTED_OPERATOR_TOKEN_HEADER]: deniedToken },
      payload: taskPayload
    })
    const allowedToken = issueToken()
    const list = await app.inject({
      method: 'GET',
      url: '/v1/tasks',
      headers: { [TRUSTED_OPERATOR_TOKEN_HEADER]: allowedToken }
    })
    await app.close()

    expect(denied.statusCode).toBe(401)
    expect((denied.json() as Envelope<never>).error?.code).toBe('unauthorized')
    expect(store.claimCalls[0]).toBe(decodeJti(deniedToken))
    expect(list.statusCode).toBe(200)
    expect((list.json() as Envelope<unknown[]>).data).toEqual([])
  })

  it('ignores requests without a trusted token and still rejects invalid ones', async () => {
    const store = new InMemoryOperatorReplayStore()
    const app = guardedApp(store)

    const health = await app.inject({ method: 'GET', url: '/health' })
    const invalid = await app.inject({
      method: 'GET',
      url: '/v1/tasks',
      headers: { [TRUSTED_OPERATOR_TOKEN_HEADER]: 'not-a-token' }
    })
    await app.close()

    expect(health.statusCode).toBe(200)
    expect(invalid.statusCode).toBe(401)
    expect((invalid.json() as Envelope<never>).error?.code).toBe('unauthorized')
  })

  it('keeps process-local replay rejection when no guard is configured', async () => {
    const app = buildServer({
      identityMode: 'trusted',
      operatorIdentityResolver: createTrustedOperatorIdentityResolver({
        keyRing,
        now
      })
    })
    const token = issueToken()
    const first = await app.inject({
      method: 'GET',
      url: '/v1/tasks',
      headers: { [TRUSTED_OPERATOR_TOKEN_HEADER]: token }
    })
    const replay = await app.inject({
      method: 'GET',
      url: '/v1/tasks',
      headers: { [TRUSTED_OPERATOR_TOKEN_HEADER]: token }
    })
    await app.close()

    expect(first.statusCode).toBe(200)
    expect(replay.statusCode).toBe(401)
  })
})

describe('operator replay guard (PostgreSQL)', () => {
  itWithPostgres(
    'rejects the second use of the same JTI across PostgreSQL-backed instances',
    async () => {
      const schemaName = `cvg_operator_guard_${Date.now()}`
      const admin = new Pool({ connectionString: testDatabaseUrl })
      const poolA = new Pool({
        connectionString: testDatabaseUrl,
        options: `-c search_path=${schemaName}`
      })
      const poolB = new Pool({
        connectionString: testDatabaseUrl,
        options: `-c search_path=${schemaName}`
      })
      try {
        await admin.query(`CREATE SCHEMA ${schemaName}`)
        await admin.query(`SET search_path TO ${schemaName}`)
        await admin.query(OPERATOR_REPLAY_EVENTS_DDL)
        const appA = guardedApp(new PostgresOperatorReplayStore(poolA))
        const appB = guardedApp(new PostgresOperatorReplayStore(poolB))
        const token = issueToken()

        const first = await appA.inject({
          method: 'GET',
          url: '/v1/tasks',
          headers: { [TRUSTED_OPERATOR_TOKEN_HEADER]: token }
        })
        const replay = await appB.inject({
          method: 'GET',
          url: '/v1/tasks',
          headers: { [TRUSTED_OPERATOR_TOKEN_HEADER]: token }
        })
        const fresh = await appB.inject({
          method: 'GET',
          url: '/v1/tasks',
          headers: { [TRUSTED_OPERATOR_TOKEN_HEADER]: issueToken() }
        })
        await appA.close()
        await appB.close()

        expect(first.statusCode).toBe(200)
        expect(replay.statusCode).toBe(401)
        expect((replay.json() as Envelope<never>).error?.code).toBe(
          'unauthorized'
        )
        expect(fresh.statusCode).toBe(200)
      } finally {
        await poolA.end()
        await poolB.end()
        await admin.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`)
        await admin.end()
      }
    }
  )
})
