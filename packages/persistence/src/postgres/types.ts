/**
 * Responsibility: shared PostgreSQL adapter type contracts used by the
 * postgres.ts repository and its extracted helper modules.
 */
import type { QueryResult, QueryResultRow } from 'pg'
import type { OutboxEventRecord } from '../schema.ts'
import type { TenantId } from '@cvg/platform'

export interface PostgresQueryable {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ): Promise<QueryResult<T>>
}

/**
 * A checked-out pool connection is required for approval transactions. A
 * `pg.Pool` also exposes `query`, but it may route each statement to a
 * different connection and therefore cannot safely carry BEGIN/COMMIT.
 */
export interface PostgresTransactionClient extends PostgresQueryable {
  release(error?: Error): void
}

export type DurableOutboxStatus = OutboxEventRecord['status']

export type DurableOutboxEventRecord = OutboxEventRecord & {
  tenantId: TenantId
  correlationId: string
  idempotencyKey: string
  envelopeVersion: number
  conversationId: string | null
  sessionId: string | null
  agentId: string | null
  agentVersionId: string | null
  inboundMessageId: string | null
  availableAt: Date
  attempts: number
  leaseOwner: string | null
  leaseToken: string | null
  leaseUntil: Date | null
  lastError: string | null
  processedAt: Date | null
  deadLetteredAt: Date | null
  parentEventId: string | null
}
