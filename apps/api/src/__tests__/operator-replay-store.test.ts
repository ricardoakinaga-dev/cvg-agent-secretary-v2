import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { describe, expect, it } from 'vitest'
import type { PostgresPoolLike } from '@cvg/persistence'
import {
  InMemoryOperatorReplayStore,
  OPERATOR_REPLAY_EVENTS_DDL,
  OPERATOR_REPLAY_STORE_ENV,
  PostgresOperatorReplayStore,
  createOperatorReplayStoreFromEnv
} from '../operator-replay-store.ts'

const testDatabaseUrl = process.env.TEST_DATABASE_URL
const itWithPostgres = testDatabaseUrl ? it : it.skip

describe('operator replay store contract', () => {
  it('claims a JTI once per issuer inside the expiry window', async () => {
    const store = new InMemoryOperatorReplayStore()
    const expiresAtSeconds = Math.floor(Date.now() / 1000) + 300

    expect(
      await store.claim({
        issuer: 'cvg-api',
        jti: 'jti_once',
        expiresAtSeconds
      })
    ).toBe(true)
    expect(
      await store.claim({
        issuer: 'cvg-api',
        jti: 'jti_once',
        expiresAtSeconds: expiresAtSeconds + 30
      })
    ).toBe(false)
    expect(
      await store.claim({
        issuer: 'other-issuer',
        jti: 'jti_once',
        expiresAtSeconds
      })
    ).toBe(true)
    expect(
      await store.claim({
        issuer: 'cvg-api',
        jti: 'jti_already_expired',
        expiresAtSeconds: Math.floor(Date.now() / 1000) - 1
      })
    ).toBe(false)
  })

  it('reclaims and purges expired claims', async () => {
    let nowMs = 1_000_000
    const store = new InMemoryOperatorReplayStore({ now: () => nowMs })
    const claim = {
      issuer: 'cvg-api',
      jti: 'jti_expiring',
      expiresAtSeconds: 1_001
    }

    expect(await store.claim(claim)).toBe(true)
    expect(await store.claim(claim)).toBe(false)
    nowMs = 1_001_001
    expect(
      await store.claim({
        issuer: 'cvg-api',
        jti: 'jti_expiring',
        expiresAtSeconds: 1_002
      })
    ).toBe(true)
    expect(await store.purgeExpired(1_002)).toBe(1)
    expect(await store.purgeExpired(1_002)).toBe(0)
  })

  it('rejects invalid claims and invalid store selection', async () => {
    const store = new InMemoryOperatorReplayStore()
    await expect(
      store.claim({ issuer: '', jti: 'jti_x', expiresAtSeconds: 10 })
    ).rejects.toThrow(/issuer/)
    await expect(
      store.claim({ issuer: 'cvg-api', jti: '', expiresAtSeconds: 10 })
    ).rejects.toThrow(/token id/)
    await expect(
      store.claim({ issuer: 'cvg-api', jti: 'jti_x', expiresAtSeconds: 1.5 })
    ).rejects.toThrow(/expiry/)

    expect(createOperatorReplayStoreFromEnv({})).toBeUndefined()
    expect(() =>
      createOperatorReplayStoreFromEnv({ [OPERATOR_REPLAY_STORE_ENV]: 'redis' })
    ).toThrow(/memory or postgres/)
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
  })

  it('fails closed when the configured distributed store is unavailable', async () => {
    const offlinePool: PostgresPoolLike = {
      connect: async () => {
        throw new Error('operator replay store offline')
      }
    }
    const store = new PostgresOperatorReplayStore(offlinePool)

    await expect(
      store.claim({
        issuer: 'cvg-api',
        jti: 'jti_offline',
        expiresAtSeconds: Math.floor(Date.now() / 1000) + 60
      })
    ).rejects.toThrow(/offline/)
    await expect(store.assertReady()).rejects.toThrow(/offline/)
  })

  it.each([
    ['missing SELECT', { can_select: false }],
    ['missing INSERT', { can_insert: false }],
    ['missing UPDATE', { can_update: false }],
    ['missing DELETE', { can_delete: false }],
    ['missing schema USAGE', { can_schema_usage: false }],
    ['database CREATE', { can_database_create: true }],
    ['schema CREATE', { can_schema_create: true }],
    ['table ownership', { table_owner: 'runtime_fixture' }],
    ['database ownership', { database_owner: 'runtime_fixture' }],
    ['role membership', { membership_count: 1 }],
    ['TRUNCATE', { can_truncate: true }],
    ['TRIGGER', { can_trigger: true }],
    ['REFERENCES', { can_references: true }]
  ])('rejects unsafe effective replay posture: %s', async (_name, override) => {
    const posture = {
      membership_count: 0,
      database_owner: 'database_owner_fixture',
      can_database_create: false,
      can_schema_usage: true,
      can_schema_create: false,
      table_owner: 'table_owner_fixture',
      can_select: true,
      can_insert: true,
      can_update: true,
      can_delete: true,
      can_truncate: false,
      can_trigger: false,
      can_references: false,
      ...override
    }
    const unsafePool: PostgresPoolLike = {
      connect: async () =>
        ({
          query: async (sql: string) => {
            if (sql.includes('information_schema.tables')) {
              return { rows: [{ table_name: 'operator_replay_events' }] }
            }
            if (sql.includes('FROM pg_roles')) {
              return {
                rows: [
                  {
                    rolname: 'runtime_fixture',
                    rolsuper: false,
                    rolbypassrls: false,
                    rolcreatedb: false,
                    rolcreaterole: false,
                    rolreplication: false
                  }
                ]
              }
            }
            return { rows: [posture] }
          },
          release: () => undefined
        }) as never
    }

    await expect(
      new PostgresOperatorReplayStore(unsafePool).assertReady()
    ).rejects.toThrow(/role|privilege|owner/i)
  })
})

describe('operator replay store (PostgreSQL)', () => {
  itWithPostgres(
    'claims atomically across two instances sharing the same store',
    async () => {
      const schemaName = `cvg_operator_replay_${Date.now()}`
      const roleName = `cvg_replay_${Date.now()}_${randomUUID().replaceAll('-', '').slice(0, 8)}`
      const rolePassword = randomUUID().replaceAll('-', '')
      const runtimeUrl = new URL(testDatabaseUrl as string)
      runtimeUrl.username = roleName
      runtimeUrl.password = rolePassword
      const admin = new Pool({ connectionString: testDatabaseUrl })
      const instanceAPool = new Pool({
        connectionString: runtimeUrl.toString(),
        options: `-c search_path=${schemaName}`
      })
      const instanceBPool = new Pool({
        connectionString: runtimeUrl.toString(),
        options: `-c search_path=${schemaName}`
      })
      try {
        await admin.query(
          `CREATE ROLE ${roleName} LOGIN PASSWORD '${rolePassword}'
             NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION NOINHERIT`
        )
        await admin.query(`CREATE SCHEMA ${schemaName}`)
        await admin.query(`SET search_path TO ${schemaName}`)
        await admin.query(OPERATOR_REPLAY_EVENTS_DDL)
        await admin.query(`GRANT USAGE ON SCHEMA ${schemaName} TO ${roleName}`)
        await admin.query(
          `GRANT SELECT, INSERT, UPDATE, DELETE
             ON ${schemaName}.operator_replay_events TO ${roleName}`
        )

        const instanceA = new PostgresOperatorReplayStore(instanceAPool)
        const instanceB = new PostgresOperatorReplayStore(instanceBPool)
        await instanceA.assertReady()
        await instanceB.assertReady()

        const expiresAtSeconds = Math.floor(Date.now() / 1000) + 300
        const jti = `jti_${randomUUID()}`
        expect(
          await instanceA.claim({ issuer: 'cvg-api', jti, expiresAtSeconds })
        ).toBe(true)
        expect(
          await instanceB.claim({
            issuer: 'cvg-api',
            jti,
            expiresAtSeconds: expiresAtSeconds + 30
          })
        ).toBe(false)

        const concurrentJti = `jti_${randomUUID()}`
        const concurrent = await Promise.all([
          instanceA.claim({
            issuer: 'cvg-api',
            jti: concurrentJti,
            expiresAtSeconds
          }),
          instanceB.claim({
            issuer: 'cvg-api',
            jti: concurrentJti,
            expiresAtSeconds
          })
        ])
        expect(concurrent.filter(Boolean)).toHaveLength(1)

        const database = await admin.query<{ name: string }>(
          'SELECT current_database() AS name'
        )
        const databaseName = database.rows[0]?.name
        if (!databaseName || !/^[a-zA-Z0-9_]+$/.test(databaseName)) {
          throw new Error('Disposable PostgreSQL database name is unsafe')
        }
        await admin.query(
          `GRANT CREATE ON DATABASE ${databaseName} TO ${roleName}`
        )
        await expect(instanceA.assertReady()).rejects.toThrow(/privilege/i)
        await admin.query(
          `REVOKE CREATE ON DATABASE ${databaseName} FROM ${roleName}`
        )
      } finally {
        await instanceAPool.end()
        await instanceBPool.end()
        await admin.query(`DROP OWNED BY ${roleName} CASCADE`)
        await admin.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`)
        await admin.query(`DROP ROLE IF EXISTS ${roleName}`)
        await admin.end()
      }
    }
  )

  itWithPostgres(
    'reclaims expired claims and purges only expired rows',
    async () => {
      const schemaName = `cvg_operator_replay_expiry_${Date.now()}`
      const admin = new Pool({ connectionString: testDatabaseUrl })
      const replayPool = new Pool({
        connectionString: testDatabaseUrl,
        options: `-c search_path=${schemaName}`
      })
      try {
        await admin.query(`CREATE SCHEMA ${schemaName}`)
        await admin.query(`SET search_path TO ${schemaName}`)
        await admin.query(OPERATOR_REPLAY_EVENTS_DDL)
        const store = new PostgresOperatorReplayStore(replayPool)
        const activeJti = `jti_${randomUUID()}`
        const shortJti = `jti_${randomUUID()}`
        const activeExpires = Math.floor(Date.now() / 1000) + 300

        expect(
          await store.claim({
            issuer: 'cvg-api',
            jti: activeJti,
            expiresAtSeconds: activeExpires
          })
        ).toBe(true)
        expect(
          await store.claim({
            issuer: 'cvg-api',
            jti: shortJti,
            expiresAtSeconds: Math.floor(Date.now() / 1000) + 1
          })
        ).toBe(true)

        await new Promise((resolve) => setTimeout(resolve, 1_500))

        expect(await store.purgeExpired()).toBe(1)
        expect(
          await store.claim({
            issuer: 'cvg-api',
            jti: shortJti,
            expiresAtSeconds: activeExpires
          })
        ).toBe(true)
        expect(
          await store.claim({
            issuer: 'cvg-api',
            jti: activeJti,
            expiresAtSeconds: activeExpires
          })
        ).toBe(false)
      } finally {
        await replayPool.end()
        await admin.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`)
        await admin.end()
      }
    }
  )

  itWithPostgres(
    'fails closed when the replay table is not installed',
    async () => {
      const schemaName = `cvg_operator_replay_missing_${Date.now()}`
      const admin = new Pool({ connectionString: testDatabaseUrl })
      const replayPool = new Pool({
        connectionString: testDatabaseUrl,
        options: `-c search_path=${schemaName}`
      })
      try {
        await admin.query(`CREATE SCHEMA ${schemaName}`)
        const store = new PostgresOperatorReplayStore(replayPool)

        await expect(store.assertReady()).rejects.toThrow(
          /operator replay storage is not installed/
        )
        await expect(
          store.claim({
            issuer: 'cvg-api',
            jti: `jti_${randomUUID()}`,
            expiresAtSeconds: Math.floor(Date.now() / 1000) + 60
          })
        ).rejects.toThrow()
      } finally {
        await replayPool.end()
        await admin.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`)
        await admin.end()
      }
    }
  )
})
