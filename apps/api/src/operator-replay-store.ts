import type { PostgresPoolClient, PostgresPoolLike } from '@cvg/persistence'

export const OPERATOR_REPLAY_STORE_ENV = 'CVG_OPERATOR_REPLAY_STORE'
export const OPERATOR_REPLAY_TABLES = ['operator_replay_events'] as const

/**
 * DDL for the distributed operator replay table, integrated as migration
 * `0026_operator_replay_events` in `packages/persistence/migrations/`. This
 * constant stays exported so tests can provision an isolated schema without
 * running the full migration chain; the migration is the source of truth.
 */
export const OPERATOR_REPLAY_EVENTS_DDL = `CREATE TABLE IF NOT EXISTS operator_replay_events (
  issuer text NOT NULL,
  jti text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (issuer, jti)
);
CREATE INDEX IF NOT EXISTS idx_operator_replay_events_expires
  ON operator_replay_events (expires_at);`

export interface OperatorReplayClaimInput {
  /** Token issuer namespace; the same JTI from another issuer never collides. */
  issuer: string
  jti: string
  /** Epoch seconds at which the claim stops blocking further use. */
  expiresAtSeconds: number
}

/**
 * Stable replay store contract. `claim` is the single atomic operation: it
 * returns `true` exactly once per `(issuer, jti)` inside the claim window and
 * `false` on every replay. Implementations must never resolve a claim twice,
 * including under concurrent callers across separate processes. `purgeExpired`
 * removes rows whose window already closed and is safe to call at any time.
 *
 * Fail-closed contract: a configured distributed store that cannot answer
 * (network, missing schema, clock/input error) must reject/throw rather than
 * silently allow the claim. Callers translate that into denial.
 */
export interface OperatorReplayStore {
  claim(input: OperatorReplayClaimInput): Promise<boolean>
  purgeExpired(nowSeconds?: number): Promise<number>
  /** Best-effort startup check that the backing store is usable. */
  assertReady?(): Promise<void>
}

interface InMemoryOperatorReplayStoreOptions {
  now?: () => number
}

export class InMemoryOperatorReplayStore implements OperatorReplayStore {
  private entries = new Map<string, number>()
  private readonly now: () => number

  constructor(options: InMemoryOperatorReplayStoreOptions = {}) {
    this.now = options.now ?? Date.now
  }

  async claim(input: OperatorReplayClaimInput): Promise<boolean> {
    validateOperatorReplayClaim(input)
    const expiresAtMs = input.expiresAtSeconds * 1000
    const currentTime = this.now()
    if (expiresAtMs <= currentTime) return false
    const key = operatorReplayKey(input.issuer, input.jti)
    const existingExpiry = this.entries.get(key)
    if (existingExpiry !== undefined && existingExpiry > currentTime)
      return false
    this.entries.set(key, expiresAtMs)
    return true
  }

  async purgeExpired(nowSeconds?: number): Promise<number> {
    const currentTime =
      nowSeconds === undefined ? this.now() : nowSeconds * 1000
    let removed = 0
    for (const [key, expiresAtMs] of this.entries) {
      if (expiresAtMs <= currentTime) {
        this.entries.delete(key)
        removed += 1
      }
    }
    return removed
  }

  async assertReady(): Promise<void> {
    return
  }
}

interface PostgresOperatorReplayStoreOptions {
  now?: () => number
  /** Minimum interval between opportunistic sweeps of expired rows. */
  purgeIntervalMs?: number
}

const DEFAULT_PURGE_INTERVAL_MS = 60_000
const MAX_ISSUER_LENGTH = 120
const MAX_JTI_LENGTH = 160

/**
 * PostgreSQL adapter. `claim` is one conditional UPSERT inside a single
 * statement, so two API instances cannot both claim the same JTI: the loser
 * blocks on the row lock and the `WHERE` guard makes its update a no-op.
 */
export class PostgresOperatorReplayStore implements OperatorReplayStore {
  private readonly now: () => number
  private readonly purgeIntervalMs: number
  private lastPurgeAt = 0

  constructor(
    private readonly pool: PostgresPoolLike,
    options: PostgresOperatorReplayStoreOptions = {}
  ) {
    this.now = options.now ?? Date.now
    this.purgeIntervalMs = options.purgeIntervalMs ?? DEFAULT_PURGE_INTERVAL_MS
    if (
      !Number.isFinite(this.purgeIntervalMs) ||
      this.purgeIntervalMs < 0 ||
      this.purgeIntervalMs > 3_600_000
    ) {
      throw new Error('Operator replay purge interval is invalid')
    }
  }

  async claim(input: OperatorReplayClaimInput): Promise<boolean> {
    validateOperatorReplayClaim(input)
    if (input.expiresAtSeconds * 1000 <= this.now()) return false
    const client = await this.pool.connect()
    try {
      await this.maybePurge(client)
      const result = await client.query(
        `INSERT INTO operator_replay_events (issuer, jti, expires_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (issuer, jti) DO UPDATE
           SET expires_at = EXCLUDED.expires_at,
               created_at = CURRENT_TIMESTAMP
           WHERE operator_replay_events.expires_at <= CURRENT_TIMESTAMP
         RETURNING issuer`,
        [input.issuer, input.jti, new Date(input.expiresAtSeconds * 1000)]
      )
      return result.rows.length > 0
    } finally {
      client.release()
    }
  }

  /**
   * Sweeps closed windows using the database clock, the same source the atomic
   * claim compares against. The optional contract parameter is intentionally
   * not accepted here: a caller clock must never override the database clock.
   */
  async purgeExpired(): Promise<number> {
    const client = await this.pool.connect()
    try {
      const result = await client.query(
        `DELETE FROM operator_replay_events
         WHERE expires_at <= CURRENT_TIMESTAMP`
      )
      this.lastPurgeAt = this.now()
      return result.rowCount ?? 0
    } finally {
      client.release()
    }
  }

  async assertReady(): Promise<void> {
    const client = await this.pool.connect()
    try {
      const result = await client.query<{ table_name: string }>(
        `SELECT table_name
           FROM information_schema.tables
          WHERE table_schema = current_schema()
            AND table_name = ANY($1::text[])`,
        [[...OPERATOR_REPLAY_TABLES]]
      )
      if (result.rows.length !== OPERATOR_REPLAY_TABLES.length) {
        throw new Error('PostgreSQL operator replay storage is not installed')
      }
    } finally {
      client.release()
    }
  }

  private async maybePurge(client: PostgresPoolClient): Promise<void> {
    const currentTime = this.now()
    if (
      this.lastPurgeAt !== 0 &&
      currentTime - this.lastPurgeAt < this.purgeIntervalMs
    ) {
      return
    }
    this.lastPurgeAt = currentTime
    await client.query(
      `DELETE FROM operator_replay_events
       WHERE expires_at <= CURRENT_TIMESTAMP`
    )
  }
}

/**
 * Explicit store selection. An unset variable keeps the historical
 * process-local behavior; `memory` is only accepted outside production, and
 * `postgres` requires a live pool. Production never silently falls back to an
 * in-memory store: selecting it there fails closed.
 */
export function createOperatorReplayStoreFromEnv(
  env: NodeJS.ProcessEnv,
  pool?: PostgresPoolLike
): OperatorReplayStore | undefined {
  const selection = env[OPERATOR_REPLAY_STORE_ENV]?.trim().toLowerCase()
  if (!selection) return undefined
  if (selection === 'memory') {
    if (env.NODE_ENV === 'production') {
      throw new Error(
        `Production requires a distributed operator replay store; ${OPERATOR_REPLAY_STORE_ENV}=memory is forbidden`
      )
    }
    return new InMemoryOperatorReplayStore()
  }
  if (selection === 'postgres') {
    if (!pool) {
      throw new Error(
        `${OPERATOR_REPLAY_STORE_ENV}=postgres requires a configured PostgreSQL pool`
      )
    }
    return new PostgresOperatorReplayStore(pool)
  }
  throw new Error(
    `${OPERATOR_REPLAY_STORE_ENV} must be memory or postgres when set`
  )
}

function operatorReplayKey(issuer: string, jti: string): string {
  return `${issuer}\u0000${jti}`
}

function validateOperatorReplayClaim(input: OperatorReplayClaimInput): void {
  if (
    typeof input.issuer !== 'string' ||
    input.issuer.trim().length === 0 ||
    input.issuer.length > MAX_ISSUER_LENGTH
  ) {
    throw new Error('Operator replay issuer is invalid')
  }
  if (
    typeof input.jti !== 'string' ||
    input.jti.trim().length === 0 ||
    input.jti.length > MAX_JTI_LENGTH
  ) {
    throw new Error('Operator replay token id is invalid')
  }
  if (
    !Number.isSafeInteger(input.expiresAtSeconds) ||
    input.expiresAtSeconds <= 0
  ) {
    throw new Error('Operator replay expiry is invalid')
  }
}
