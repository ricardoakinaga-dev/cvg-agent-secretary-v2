import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import {
  CorrelationIdSchema,
  createCorrelationId,
  createDomainId,
  DomainError,
  redactSensitiveText,
  sanitizeAuditEvidencePayload,
  type Channel,
  type TaskPriority,
  type TaskStatus
} from '@cvg/shared'
import {
  AgentIdSchema,
  AgentVersionIdSchema,
  TenantIdSchema,
  sanitizeTraceForPersistence,
  TraceIdSchema,
  type AgentId,
  type AgentVersionId,
  type PluginAuditEvent,
  type TestRunTrace,
  transitionHumanTakeover,
  type HumanTakeoverEvent,
  type HumanTakeoverState,
  type TenantId
} from '@cvg/platform'
import type { QueryResult, QueryResultRow } from 'pg'
import {
  auditEventMatches,
  summarizeAuditEvents
} from './repositories/audit-repository.ts'
import {
  AuditEvidenceCheckpointActorIdSchema,
  AuditEvidenceCheckpointCreateInputSchema,
  AuditEvidenceCheckpointFiltersSchema,
  AuditEvidenceCheckpointIdSchema,
  AuditEvidenceCheckpointStatusSchema,
  cloneAuditEvidenceCheckpoint,
  computeAuditEvidenceCheckpointDigest,
  createAuditEvidenceCheckpointId,
  normalizeAuditEvidenceCheckpointFilters,
  type AuditEvidenceCheckpointCreateInput,
  type AuditEvidenceCheckpointRecord,
  type AuditEvidenceCheckpointStatus
} from './audit-evidence-checkpoint.ts'
import type {
  ApprovalRequestRecord,
  AuditEventRecord,
  AuditEvidenceFilters,
  AuditEvidencePage,
  AuditEvidenceQuery,
  AuditEvidenceSummary,
  ConversationListItem,
  ConversationPage,
  ConversationRecord,
  MessageRecord,
  PaginationInput,
  SessionRecord,
  TaskRecord
} from './schema.ts'
import { createSenderRefFingerprint } from './sender-fingerprint.ts'

export interface PostgresMigrationOptions {
  schemaName?: string
  migrations?: string[]
  createSchema?: boolean
}

const migrationPath = resolve(
  process.cwd(),
  'packages/persistence/migrations/0000_initial.sql'
)
const migrationDirectory = resolve(
  process.cwd(),
  'packages/persistence/migrations'
)
const defaultPostgresMigrations = [
  '0000_initial',
  '0001_tenant_isolation',
  '0002_capability_approvals',
  '0003_test_suite_catalog',
  '0004_plugin_manifest_catalog',
  '0005_knowledge_source_catalog',
  '0006_release_candidate_evidence',
  '0007_audit_evidence_checkpoint',
  '0008_session_agent_version_pin',
  '0009_release_candidate_validator_integrity'
]

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

export interface PostgresRuntimeRepositoryOptions {
  tenantIsolation?: boolean
}

export interface InboundRuntimeCompletionInput {
  tenantId: TenantId
  conversationId: string
  sessionId: string | null
  inboundMessageId: string
  trace: TestRunTrace
  toolAuditEvents: PluginAuditEvent[]
  correlationId: string
}

function assertSafeSchemaName(schemaName: string): void {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(schemaName)) {
    throw new Error('Invalid PostgreSQL schema name')
  }
}

export async function readInitialMigrationSql(): Promise<string> {
  return readFile(migrationPath, 'utf8')
}

export async function readPostgresMigrationSql(
  version: string
): Promise<string> {
  if (!/^\d{4}_[a-z0-9_]+$/.test(version)) {
    throw new Error('Invalid PostgreSQL migration version')
  }
  return readFile(resolve(migrationDirectory, `${version}.sql`), 'utf8')
}

export async function runInitialPostgresMigration(
  client: PostgresQueryable,
  options: PostgresMigrationOptions = {}
): Promise<void> {
  const migration = await readInitialMigrationSql()

  if (options.schemaName) {
    assertSafeSchemaName(options.schemaName)
  }

  await client.query('BEGIN')
  try {
    if (options.schemaName) {
      if (options.createSchema !== false) {
        await client.query(`CREATE SCHEMA IF NOT EXISTS ${options.schemaName}`)
      }
      await client.query(`SET search_path TO ${options.schemaName}`)
    }
    await client.query(
      `SELECT pg_advisory_xact_lock(hashtext('cvg-agent-secretary:migrations'))`
    )
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         version text PRIMARY KEY,
         applied_at timestamptz NOT NULL DEFAULT now()
       )`
    )
    const applied = await client.query<{ version: string }>(
      `SELECT version FROM schema_migrations
       WHERE version = $1
       FOR UPDATE`,
      ['0000_initial']
    )
    if (applied.rows.length > 0) {
      await client.query('COMMIT')
      return
    }
    await client.query(migration)
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}

/**
 * Applies ordered migrations with a checksum guard. The legacy 0000 file is
 * intentionally preserved; production startup must use this runner so a
 * database marked with 0000 cannot silently skip tenant isolation.
 */
export async function runPostgresMigrations(
  client: PostgresQueryable,
  options: PostgresMigrationOptions = {}
): Promise<void> {
  const migrations = options.migrations ?? defaultPostgresMigrations
  for (const version of migrations) {
    const migration = await readPostgresMigrationSql(version)
    const checksum = createHash('sha256').update(migration).digest('hex')

    await client.query('BEGIN')
    try {
      if (options.schemaName) {
        assertSafeSchemaName(options.schemaName)
        if (options.createSchema !== false) {
          await client.query(
            `CREATE SCHEMA IF NOT EXISTS ${options.schemaName}`
          )
        }
        await client.query(`SET search_path TO ${options.schemaName}`)
      }
      await client.query(
        `SELECT pg_advisory_xact_lock(hashtext('cvg-agent-secretary:migrations'))`
      )
      await client.query(
        `CREATE TABLE IF NOT EXISTS schema_migrations (
           version text PRIMARY KEY,
           applied_at timestamptz NOT NULL DEFAULT now()
         )`
      )
      await client.query(
        `ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS checksum text`
      )
      const applied = await client.query<{
        version: string
        checksum: string | null
      }>(
        `SELECT version, checksum
         FROM schema_migrations
         WHERE version = $1
         FOR UPDATE`,
        [version]
      )
      const current = applied.rows[0]
      if (current) {
        if (!current.checksum) {
          throw new Error(`PostgreSQL migration checksum missing: ${version}`)
        }
        if (current.checksum !== checksum) {
          throw new Error(`PostgreSQL migration checksum mismatch: ${version}`)
        }
      } else {
        await client.query(migration)
        await client.query(
          `INSERT INTO schema_migrations (version, checksum)
           VALUES ($1, $2)
           ON CONFLICT (version) DO UPDATE SET checksum = EXCLUDED.checksum`,
          [version, checksum]
        )
      }
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }
  }
}

export interface LegacyMigrationBaselineApproval {
  actor: string
  reference: string
}

const legacyMigrationTables = [
  'conversations',
  'messages',
  'sessions',
  'agent_runs',
  'tool_calls',
  'approval_requests',
  'tasks',
  'audit_events',
  'idempotency',
  'outbox_events',
  'platform_agents',
  'platform_agent_versions',
  'platform_test_runs',
  'platform_execution_traces'
] as const

export const legacyRequiredColumns = [
  ['conversations', 'tenant_id'],
  ['conversations', 'id'],
  ['conversations', 'channel'],
  ['conversations', 'sender_ref'],
  ['conversations', 'sender_ref_hash'],
  ['conversations', 'status'],
  ['conversations', 'correlation_id'],
  ['conversations', 'created_at'],
  ['conversations', 'updated_at'],
  ['messages', 'id'],
  ['messages', 'conversation_id'],
  ['messages', 'external_message_id'],
  ['messages', 'direction'],
  ['messages', 'body'],
  ['messages', 'runtime_status'],
  ['messages', 'created_at'],
  ['sessions', 'id'],
  ['sessions', 'conversation_id'],
  ['sessions', 'status'],
  ['sessions', 'takeover_state'],
  ['sessions', 'created_at'],
  ['sessions', 'updated_at'],
  ['agent_runs', 'id'],
  ['agent_runs', 'session_id'],
  ['agent_runs', 'status'],
  ['agent_runs', 'created_at'],
  ['agent_runs', 'updated_at'],
  ['tool_calls', 'id'],
  ['tool_calls', 'agent_run_id'],
  ['tool_calls', 'tool_name'],
  ['tool_calls', 'status'],
  ['tool_calls', 'input'],
  ['tool_calls', 'output'],
  ['tool_calls', 'error'],
  ['tool_calls', 'created_at'],
  ['approval_requests', 'id'],
  ['approval_requests', 'session_id'],
  ['approval_requests', 'proposed_action'],
  ['approval_requests', 'summary'],
  ['approval_requests', 'risk_level'],
  ['approval_requests', 'status'],
  ['approval_requests', 'decided_by'],
  ['approval_requests', 'decided_at'],
  ['approval_requests', 'created_at'],
  ['tasks', 'id'],
  ['tasks', 'session_id'],
  ['tasks', 'title'],
  ['tasks', 'description'],
  ['tasks', 'priority'],
  ['tasks', 'source'],
  ['tasks', 'status'],
  ['tasks', 'idempotency_key'],
  ['tasks', 'created_at'],
  ['audit_events', 'id'],
  ['audit_events', 'type'],
  ['audit_events', 'actor_type'],
  ['audit_events', 'actor_id'],
  ['audit_events', 'correlation_id'],
  ['audit_events', 'policy_version'],
  ['audit_events', 'payload'],
  ['audit_events', 'created_at'],
  ['idempotency', 'tenant_id'],
  ['idempotency', 'key'],
  ['idempotency', 'resource_id'],
  ['idempotency', 'created_at'],
  ['outbox_events', 'id'],
  ['outbox_events', 'type'],
  ['outbox_events', 'payload'],
  ['outbox_events', 'status'],
  ['outbox_events', 'created_at'],
  ['platform_agents', 'tenant_id'],
  ['platform_agents', 'id'],
  ['platform_agents', 'slug'],
  ['platform_agents', 'name'],
  ['platform_agents', 'description'],
  ['platform_agents', 'active_version_id'],
  ['platform_agents', 'created_at'],
  ['platform_agents', 'updated_at'],
  ['platform_agent_versions', 'tenant_id'],
  ['platform_agent_versions', 'id'],
  ['platform_agent_versions', 'agent_id'],
  ['platform_agent_versions', 'version'],
  ['platform_agent_versions', 'status'],
  ['platform_agent_versions', 'config'],
  ['platform_agent_versions', 'created_by'],
  ['platform_agent_versions', 'created_at'],
  ['platform_agent_versions', 'published_at'],
  ['platform_test_runs', 'tenant_id'],
  ['platform_test_runs', 'trace_id'],
  ['platform_test_runs', 'agent_id'],
  ['platform_test_runs', 'version_id'],
  ['platform_test_runs', 'trace'],
  ['platform_test_runs', 'created_at'],
  ['platform_execution_traces', 'tenant_id'],
  ['platform_execution_traces', 'trace_id'],
  ['platform_execution_traces', 'agent_id'],
  ['platform_execution_traces', 'version_id'],
  ['platform_execution_traces', 'trace'],
  ['platform_execution_traces', 'created_at']
] as const

export const legacyRequiredIndexes = [
  'conversations_pkey',
  'messages_pkey',
  'sessions_pkey',
  'agent_runs_pkey',
  'tool_calls_pkey',
  'approval_requests_pkey',
  'tasks_pkey',
  'audit_events_pkey',
  'idempotency_pkey',
  'outbox_events_pkey',
  'platform_agents_pkey',
  'platform_agent_versions_pkey',
  'platform_test_runs_pkey',
  'platform_execution_traces_pkey',
  'idx_messages_conversation_id',
  'idx_messages_runtime_status',
  'idx_conversations_tenant_id',
  'idx_sessions_conversation_id',
  'idx_agent_runs_session_id',
  'idx_approval_requests_session_id',
  'idx_tasks_session_id',
  'idx_audit_events_correlation_id',
  'idx_audit_events_type',
  'idx_audit_events_actor_id',
  'idx_audit_events_payload_session_id',
  'idx_outbox_events_status',
  'idx_platform_agents_tenant_id',
  'idx_platform_agent_versions_tenant_agent',
  'idx_platform_agent_versions_one_published',
  'idx_platform_test_runs_tenant_created',
  'idx_platform_execution_traces_tenant_created'
] as const

function assertBaselineApprovalText(value: string, label: string): void {
  if (!/^[A-Za-z0-9._:/-]{3,200}$/.test(value)) {
    throw new Error(`${label} is required for a legacy migration baseline`)
  }
}

/**
 * Records an operator-approved checksum baseline for a legacy database that
 * was created by 0000_initial before checksum tracking existed. This is never
 * called by application startup; it is an explicit infrastructure operation.
 */
export async function baselineLegacyPostgresMigration(
  client: PostgresQueryable,
  options: PostgresMigrationOptions & {
    approval: LegacyMigrationBaselineApproval
  }
): Promise<void> {
  assertBaselineApprovalText(options.approval.actor, 'Baseline actor')
  assertBaselineApprovalText(options.approval.reference, 'Baseline reference')
  if (options.schemaName) assertSafeSchemaName(options.schemaName)
  const migration = await readPostgresMigrationSql('0000_initial')
  const checksum = createHash('sha256').update(migration).digest('hex')

  await client.query('BEGIN')
  try {
    if (options.schemaName) {
      if (options.createSchema !== false) {
        await client.query(`CREATE SCHEMA IF NOT EXISTS ${options.schemaName}`)
      }
      await client.query(`SET search_path TO ${options.schemaName}`)
    }
    await client.query(
      `SELECT pg_advisory_xact_lock(hashtext('cvg-agent-secretary:migrations'))`
    )
    const tables = await client.query<{ table_name: string }>(
      `SELECT c.relname AS table_name
       FROM pg_class AS c
       INNER JOIN pg_namespace AS n ON n.oid = c.relnamespace
       WHERE n.nspname = current_schema()
         AND c.relkind = 'r'
         AND c.relname = ANY($1::text[])`,
      [legacyMigrationTables]
    )
    if (tables.rows.length !== legacyMigrationTables.length) {
      throw new Error(
        'Legacy database does not match the required 0000_initial baseline'
      )
    }
    const columns = await client.query<{
      table_name: string
      column_name: string
    }>(
      `SELECT table_name, column_name
       FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND table_name = ANY($1::text[])`,
      [legacyMigrationTables]
    )
    const availableColumns = new Set(
      columns.rows.map((column) => `${column.table_name}:${column.column_name}`)
    )
    const missingColumns = legacyRequiredColumns.filter(
      ([tableName, columnName]) =>
        !availableColumns.has(`${tableName}:${columnName}`)
    )
    if (missingColumns.length > 0) {
      throw new Error(
        `Legacy database columns are incomplete: ${missingColumns
          .map(([tableName, columnName]) => `${tableName}.${columnName}`)
          .join(', ')}`
      )
    }
    const indexes = await client.query<{ indexname: string }>(
      `SELECT indexname
       FROM pg_indexes
       WHERE schemaname = current_schema()
         AND indexname = ANY($1::text[])`,
      [legacyRequiredIndexes]
    )
    const availableIndexes = new Set(
      indexes.rows.map((index) => index.indexname)
    )
    const missingIndexes = legacyRequiredIndexes.filter(
      (index) => !availableIndexes.has(index)
    )
    if (missingIndexes.length > 0) {
      throw new Error(
        `Legacy database indexes are incomplete: ${missingIndexes.join(', ')}`
      )
    }
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         version text PRIMARY KEY,
         applied_at timestamptz NOT NULL DEFAULT now()
       )`
    )
    await client.query(
      `ALTER TABLE schema_migrations
         ADD COLUMN IF NOT EXISTS checksum text,
         ADD COLUMN IF NOT EXISTS baseline_actor text,
         ADD COLUMN IF NOT EXISTS baseline_reference text,
         ADD COLUMN IF NOT EXISTS baseline_at timestamptz`
    )
    const applied = await client.query<{
      version: string
      checksum: string | null
    }>(
      `SELECT version, checksum
       FROM schema_migrations
       WHERE version = $1
       FOR UPDATE`,
      ['0000_initial']
    )
    const current = applied.rows[0]
    if (!current) {
      throw new Error('Legacy database has no 0000_initial migration marker')
    }
    if (current.checksum) {
      throw new Error('0000_initial already has a migration checksum')
    }
    await client.query(
      `UPDATE schema_migrations
       SET checksum = $2,
           baseline_actor = $3,
           baseline_reference = $4,
           baseline_at = now()
       WHERE version = $1`,
      [
        '0000_initial',
        checksum,
        options.approval.actor,
        options.approval.reference
      ]
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}

export class PostgresRuntimeRepository {
  private readonly tenantIsolation: boolean

  constructor(
    private readonly client: PostgresQueryable,
    options: PostgresRuntimeRepositoryOptions = {}
  ) {
    this.tenantIsolation = options.tenantIsolation ?? false
  }

  async findByExternalMessage(
    tenantId: TenantId,
    channel: Channel,
    externalMessageId: string
  ): Promise<MessageRecord | null> {
    const result = await this.client.query<{
      id: string
      conversation_id: string
      external_message_id: string
      direction: 'inbound' | 'outbound'
      body: string
      runtime_status: 'pending' | 'completed' | null
      created_at: Date
    }>(
      `SELECT messages.id, messages.conversation_id, messages.external_message_id, messages.direction, messages.body, messages.runtime_status, messages.created_at
       FROM messages
       INNER JOIN conversations ON conversations.id = messages.conversation_id
       WHERE conversations.tenant_id = $1
         AND conversations.channel = $2
         AND messages.external_message_id = $3
       LIMIT 1`,
      [tenantId, channel, externalMessageId]
    )

    const row = result.rows[0]
    if (!row) return null
    return {
      id: row.id,
      conversationId: row.conversation_id,
      externalMessageId: row.external_message_id,
      direction: row.direction,
      body: redactSensitiveText(row.body),
      ...(row.direction === 'inbound'
        ? { runtimeStatus: row.runtime_status ?? 'pending' }
        : {}),
      createdAt: row.created_at
    }
  }

  async createWithSession(input: {
    tenantId: TenantId
    channel: Channel
    senderRef: string
    externalMessageId: string
    body: string
    conversationId?: string | undefined
    sessionId?: string | undefined
  }): Promise<{
    conversation: ConversationRecord
    session: SessionRecord
    message: MessageRecord
  }> {
    const tenantId = TenantIdSchema.parse(input.tenantId)
    const now = new Date()
    const idempotencyKey = `inbound:${input.channel}:${input.externalMessageId}`
    let conversation: ConversationRecord
    let session: SessionRecord
    let message: MessageRecord
    const sessionAgentColumns = this.tenantIsolation
      ? 'sessions.agent_id AS session_agent_id, sessions.agent_version_id AS session_agent_version_id'
      : 'NULL::text AS session_agent_id, NULL::text AS session_agent_version_id'

    await this.client.query('BEGIN')
    try {
      if (input.conversationId || input.sessionId) {
        const existing = await this.client.query<{
          conversation_tenant_id: TenantId
          conversation_id: string
          channel: Channel
          sender_ref: string
          sender_ref_hash: string | null
          conversation_status: ConversationRecord['status']
          correlation_id: string
          conversation_created_at: Date
          conversation_updated_at: Date
          session_id: string
          session_status: SessionRecord['status']
          session_takeover_state: HumanTakeoverState
          session_agent_id: string | null
          session_agent_version_id: string | null
          session_created_at: Date
          session_updated_at: Date
        }>(
          `SELECT conversations.tenant_id AS conversation_tenant_id,
                  conversations.id AS conversation_id,
                  conversations.channel,
                  conversations.sender_ref,
                  conversations.sender_ref_hash,
                  conversations.status AS conversation_status,
                  conversations.correlation_id,
                  conversations.created_at AS conversation_created_at,
                  conversations.updated_at AS conversation_updated_at,
                  sessions.id AS session_id,
                  sessions.status AS session_status,
                  sessions.takeover_state AS session_takeover_state,
                  ${sessionAgentColumns},
                  sessions.created_at AS session_created_at,
                  sessions.updated_at AS session_updated_at
           FROM conversations
           INNER JOIN sessions ON sessions.conversation_id = conversations.id
           WHERE conversations.id = $1
             AND sessions.id = $2
             AND conversations.tenant_id = $3
           FOR UPDATE`,
          [input.conversationId, input.sessionId, tenantId]
        )
        const row = existing.rows[0]
        if (!row) {
          throw new DomainError(
            'invalid_action',
            'Conversation session not found'
          )
        }
        if (
          row.channel !== input.channel ||
          row.sender_ref_hash !==
            createSenderRefFingerprint(tenantId, input.senderRef) ||
          row.session_status === 'closed' ||
          row.conversation_status === 'resolved' ||
          row.conversation_status === 'archived'
        ) {
          throw new DomainError(
            'invalid_action',
            'Conversation session is not eligible for continuation'
          )
        }
        conversation = {
          tenantId: row.conversation_tenant_id,
          id: row.conversation_id,
          channel: row.channel,
          senderRef: redactSensitiveText(row.sender_ref),
          senderRefHash: row.sender_ref_hash ?? '',
          status: row.conversation_status,
          correlationId: row.correlation_id,
          createdAt: row.conversation_created_at,
          updatedAt: now
        }
        session = {
          id: row.session_id,
          conversationId: row.conversation_id,
          status: row.session_status,
          takeoverState: row.session_takeover_state,
          ...(row.session_agent_id
            ? { agentId: AgentIdSchema.parse(row.session_agent_id) }
            : {}),
          ...(row.session_agent_version_id
            ? {
                agentVersionId: AgentVersionIdSchema.parse(
                  row.session_agent_version_id
                )
              }
            : {}),
          createdAt: row.session_created_at,
          updatedAt: row.session_updated_at
        }
        await this.client.query(
          `UPDATE conversations SET updated_at = $2 WHERE id = $1`,
          [conversation.id, now]
        )
      } else {
        conversation = {
          tenantId,
          id: createDomainId('conv'),
          channel: input.channel,
          senderRef: redactSensitiveText(input.senderRef),
          senderRefHash: createSenderRefFingerprint(tenantId, input.senderRef),
          status: 'active',
          correlationId: createCorrelationId(),
          createdAt: now,
          updatedAt: now
        }
        session = {
          id: createDomainId('sess'),
          conversationId: conversation.id,
          status: 'open',
          takeoverState: 'BOT_ACTIVE',
          createdAt: now,
          updatedAt: now
        }
        await this.client.query(
          `INSERT INTO conversations (tenant_id, id, channel, sender_ref, sender_ref_hash, status, correlation_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            conversation.tenantId,
            conversation.id,
            conversation.channel,
            conversation.senderRef,
            conversation.senderRefHash,
            conversation.status,
            conversation.correlationId,
            conversation.createdAt,
            conversation.updatedAt
          ]
        )
        if (this.tenantIsolation) {
          await this.client.query(
            `INSERT INTO sessions (tenant_id, id, conversation_id, status, takeover_state, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              tenantId,
              session.id,
              session.conversationId,
              session.status,
              session.takeoverState,
              session.createdAt,
              session.updatedAt
            ]
          )
        } else {
          await this.client.query(
            `INSERT INTO sessions (id, conversation_id, status, takeover_state, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              session.id,
              session.conversationId,
              session.status,
              session.takeoverState,
              session.createdAt,
              session.updatedAt
            ]
          )
        }
      }
      message = {
        id: createDomainId('msg'),
        conversationId: conversation.id,
        externalMessageId: input.externalMessageId,
        direction: 'inbound',
        body: redactSensitiveText(input.body),
        runtimeStatus: 'pending',
        createdAt: now
      }
      await this.client.query(
        `INSERT INTO idempotency (tenant_id, key, resource_id, created_at)
         VALUES ($1, $2, $3, $4)`,
        [tenantId, idempotencyKey, message.id, now]
      )
      if (this.tenantIsolation) {
        await this.client.query(
          `INSERT INTO messages (tenant_id, id, conversation_id, external_message_id, direction, body, runtime_status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            tenantId,
            message.id,
            message.conversationId,
            message.externalMessageId,
            message.direction,
            message.body,
            message.runtimeStatus,
            message.createdAt
          ]
        )
      } else {
        await this.client.query(
          `INSERT INTO messages (id, conversation_id, external_message_id, direction, body, runtime_status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            message.id,
            message.conversationId,
            message.externalMessageId,
            message.direction,
            message.body,
            message.runtimeStatus,
            message.createdAt
          ]
        )
      }
      await this.client.query('COMMIT')
    } catch (error) {
      await this.client.query('ROLLBACK')
      throw error
    }

    return { conversation, session, message }
  }

  async bindSessionAgentVersion(
    rawTenantId: TenantId,
    sessionId: string,
    rawAgentId: AgentId,
    rawAgentVersionId: AgentVersionId
  ): Promise<SessionRecord | null> {
    if (!this.tenantIsolation) {
      throw new DomainError(
        'invalid_action',
        'Session agent pinning requires tenant-scoped persistence'
      )
    }
    const tenantId = TenantIdSchema.parse(rawTenantId)
    const agentId = AgentIdSchema.parse(rawAgentId)
    const agentVersionId = AgentVersionIdSchema.parse(rawAgentVersionId)
    await this.client.query('BEGIN')
    try {
      const result = await this.client.query<{
        id: string
        conversation_id: string
        status: SessionRecord['status']
        takeover_state: HumanTakeoverState
        agent_id: string | null
        agent_version_id: string | null
        created_at: Date
        updated_at: Date
      }>(
        `SELECT sessions.id, sessions.conversation_id, sessions.status,
                sessions.takeover_state, sessions.agent_id,
                sessions.agent_version_id, sessions.created_at, sessions.updated_at
         FROM sessions
         INNER JOIN conversations ON conversations.id = sessions.conversation_id
         WHERE sessions.id = $1 AND conversations.tenant_id = $2
         FOR UPDATE`,
        [sessionId, tenantId]
      )
      const row = result.rows[0]
      if (!row) {
        await this.client.query('COMMIT')
        return null
      }
      const hasAgent = row.agent_id !== null
      const hasVersion = row.agent_version_id !== null
      if (hasAgent !== hasVersion) {
        throw new DomainError(
          'invalid_action',
          'Session agent binding is incomplete'
        )
      }
      if (hasAgent && hasVersion) {
        if (
          row.agent_id !== agentId ||
          row.agent_version_id !== agentVersionId
        ) {
          throw new DomainError(
            'conflict',
            'Session agent binding cannot be replaced'
          )
        }
        await this.client.query('COMMIT')
        return {
          id: row.id,
          conversationId: row.conversation_id,
          status: row.status,
          takeoverState: row.takeover_state,
          agentId: AgentIdSchema.parse(row.agent_id),
          agentVersionId: AgentVersionIdSchema.parse(row.agent_version_id),
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }
      }
      const updatedAt = new Date()
      await this.client.query(
        `UPDATE sessions
         SET agent_id = $3, agent_version_id = $4, updated_at = $5
         WHERE id = $1 AND tenant_id = $2`,
        [row.id, tenantId, agentId, agentVersionId, updatedAt]
      )
      await this.client.query('COMMIT')
      return {
        id: row.id,
        conversationId: row.conversation_id,
        status: row.status,
        takeoverState: row.takeover_state,
        agentId,
        agentVersionId,
        createdAt: row.created_at,
        updatedAt
      }
    } catch (error) {
      await this.client.query('ROLLBACK')
      throw error
    }
  }

  async appendOutboundMessage(input: {
    tenantId: TenantId
    conversationId: string
    externalMessageId: string
    body: string
  }): Promise<MessageRecord> {
    const tenantId = TenantIdSchema.parse(input.tenantId)
    const conversation = await this.client.query<{
      id: string
      tenant_id: TenantId
    }>(
      `SELECT id, tenant_id
       FROM conversations
       WHERE id = $1 AND tenant_id = $2
       LIMIT 1`,
      [input.conversationId, tenantId]
    )
    if (!conversation.rows[0]) {
      throw new DomainError('invalid_action', 'Conversation not found')
    }
    const message: MessageRecord = {
      id: createDomainId('msg'),
      conversationId: input.conversationId,
      externalMessageId: input.externalMessageId,
      direction: 'outbound',
      body: redactSensitiveText(input.body),
      createdAt: new Date()
    }
    if (this.tenantIsolation) {
      await this.client.query(
        `INSERT INTO messages (tenant_id, id, conversation_id, external_message_id, direction, body, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          tenantId,
          message.id,
          message.conversationId,
          message.externalMessageId,
          message.direction,
          message.body,
          message.createdAt
        ]
      )
    } else {
      await this.client.query(
        `INSERT INTO messages (id, conversation_id, external_message_id, direction, body, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          message.id,
          message.conversationId,
          message.externalMessageId,
          message.direction,
          message.body,
          message.createdAt
        ]
      )
    }
    await this.client.query(
      `UPDATE conversations SET updated_at = $2 WHERE id = $1 AND tenant_id = $3`,
      [input.conversationId, message.createdAt, tenantId]
    )
    return message
  }

  async markInboundRuntimeCompleted(
    messageId: string,
    rawTenantId: TenantId
  ): Promise<boolean> {
    const tenantId = TenantIdSchema.parse(rawTenantId)
    const result = this.tenantIsolation
      ? await this.client.query(
          `UPDATE messages
           SET runtime_status = 'completed'
           WHERE id = $1
             AND tenant_id = $2
             AND direction = 'inbound'
             AND runtime_status = 'pending'
           RETURNING id`,
          [messageId, tenantId]
        )
      : await this.client.query(
          `UPDATE messages
           SET runtime_status = 'completed'
           WHERE id = $1
             AND direction = 'inbound'
             AND runtime_status = 'pending'
           RETURNING id`,
          [messageId]
        )
    return result.rows.length > 0
  }

  async transitionTakeover(
    rawTenantId: TenantId,
    sessionId: string,
    event: HumanTakeoverEvent
  ): Promise<SessionRecord | null> {
    const tenantId = TenantIdSchema.parse(rawTenantId)
    await this.client.query('BEGIN')
    try {
      const updated = await this.transitionTakeoverInTransaction(
        tenantId,
        sessionId,
        event
      )
      await this.client.query('COMMIT')
      return updated
    } catch (error) {
      await this.client.query('ROLLBACK')
      throw error
    }
  }

  async transitionTakeoverInTransaction(
    rawTenantId: TenantId,
    sessionId: string,
    event: HumanTakeoverEvent
  ): Promise<SessionRecord | null> {
    const tenantId = TenantIdSchema.parse(rawTenantId)
    const sessionAgentColumns = this.tenantIsolation
      ? 'sessions.agent_id, sessions.agent_version_id'
      : 'NULL::text AS agent_id, NULL::text AS agent_version_id'
    const result = await this.client.query<{
      id: string
      conversation_id: string
      status: SessionRecord['status']
      takeover_state: HumanTakeoverState
      agent_id: string | null
      agent_version_id: string | null
      conversation_status: ConversationRecord['status']
      created_at: Date
      updated_at: Date
    }>(
      `SELECT sessions.id, sessions.conversation_id, sessions.status,
                sessions.takeover_state, conversations.status AS conversation_status,
                ${sessionAgentColumns},
                sessions.created_at, sessions.updated_at
         FROM sessions
         INNER JOIN conversations ON conversations.id = sessions.conversation_id
         WHERE sessions.id = $1 AND conversations.tenant_id = $2
         FOR UPDATE`,
      [sessionId, tenantId]
    )
    const row = result.rows[0]
    if (
      !row ||
      row.status === 'closed' ||
      row.conversation_status === 'resolved' ||
      row.conversation_status === 'archived'
    ) {
      return null
    }
    const updated: SessionRecord = {
      id: row.id,
      conversationId: row.conversation_id,
      status: row.status,
      takeoverState: transitionHumanTakeover(row.takeover_state, event),
      ...(row.agent_id ? { agentId: AgentIdSchema.parse(row.agent_id) } : {}),
      ...(row.agent_version_id
        ? { agentVersionId: AgentVersionIdSchema.parse(row.agent_version_id) }
        : {}),
      createdAt: row.created_at,
      updatedAt: new Date()
    }
    await this.client.query(
      `UPDATE sessions SET takeover_state = $2, updated_at = $3 WHERE id = $1`,
      [updated.id, updated.takeoverState, updated.updatedAt]
    )
    const conversationStatus =
      updated.takeoverState === 'BOT_ACTIVE' ? 'active' : 'waiting_human'
    await this.client.query(
      `UPDATE conversations SET status = $2, updated_at = $3 WHERE id = $1`,
      [updated.conversationId, conversationStatus, updated.updatedAt]
    )
    return updated
  }

  async completeInboundRuntime(
    input: InboundRuntimeCompletionInput,
    controlPlane: {
      recordExecutionTrace: (
        scope: { tenantId: TenantId },
        trace: TestRunTrace
      ) => Promise<TestRunTrace>
    }
  ): Promise<{ status: 'completed' | 'paused' }> {
    const tenantId = TenantIdSchema.parse(input.tenantId)
    const trace = sanitizeTraceForPersistence(input.trace)
    assertInboundRuntimeCorrelation(input.correlationId)
    assertInboundToolAuditParents(trace, input.toolAuditEvents)
    await this.client.query('BEGIN')
    try {
      const inbound = this.tenantIsolation
        ? await this.client.query<{
            runtime_status: 'pending' | 'completed'
          }>(
            `SELECT runtime_status
             FROM messages
             WHERE id = $1 AND tenant_id = $2 AND direction = 'inbound'
             FOR UPDATE`,
            [input.inboundMessageId, tenantId]
          )
        : await this.client.query<{
            runtime_status: 'pending' | 'completed'
          }>(
            `SELECT runtime_status
             FROM messages
             WHERE id = $1 AND direction = 'inbound'
             FOR UPDATE`,
            [input.inboundMessageId]
          )
      if (!inbound.rows[0]) {
        throw new DomainError('invalid_action', 'Inbound message not found')
      }
      if (inbound.rows[0].runtime_status === 'completed') {
        await this.client.query('COMMIT')
        return { status: 'completed' }
      }
      if (input.sessionId) {
        const session = await this.client.query<{
          id: string
          takeover_state: HumanTakeoverState
        }>(
          `SELECT sessions.id, sessions.takeover_state
           FROM sessions
           INNER JOIN conversations ON conversations.id = sessions.conversation_id
           WHERE sessions.id = $1 AND conversations.tenant_id = $2
           FOR UPDATE`,
          [input.sessionId, tenantId]
        )
        if (session.rows[0]?.takeover_state !== 'BOT_ACTIVE') {
          await this.client.query('COMMIT')
          return { status: 'paused' }
        }
      }

      if (trace.handoff.requested && input.sessionId) {
        const handoff = await this.transitionTakeoverInTransaction(
          tenantId,
          input.sessionId,
          'request_handoff'
        )
        if (!handoff) {
          await this.client.query('COMMIT')
          return { status: 'paused' }
        }
        await this.appendAudit({
          type: 'handoff',
          actorType: 'System',
          actorId: 'agent-runtime',
          correlationId: input.correlationId,
          policyVersion: 'human-takeover-v1',
          tenantId,
          payload: {
            tenantId,
            conversationId: input.conversationId,
            sessionId: input.sessionId,
            traceId: trace.traceId,
            state: handoff.takeoverState,
            reason: trace.handoff.reason,
            effect: 'human_handoff_requested'
          }
        })
      }

      if (trace.response.text.trim().length > 0) {
        await this.appendOutboundMessage({
          tenantId,
          conversationId: input.conversationId,
          externalMessageId: `runtime:${trace.traceId}`,
          body: trace.response.text
        })
      }
      for (const event of input.toolAuditEvents) {
        await this.appendAudit({
          type: event.type,
          actorType: 'System',
          actorId: 'agent-runtime',
          correlationId: event.correlationId,
          policyVersion: 'plugin-gateway-v1',
          tenantId,
          payload: {
            tenantId,
            agentId: event.agentId,
            versionId: event.versionId,
            traceId: event.traceId,
            conversationId: input.conversationId,
            sessionId: input.sessionId,
            plugin: event.plugin,
            toolName: event.toolName,
            status: event.status,
            payload: event.payload
          }
        })
      }
      await controlPlane.recordExecutionTrace({ tenantId }, trace)
      const markedCompleted = await this.markInboundRuntimeCompleted(
        input.inboundMessageId,
        tenantId
      )
      if (!markedCompleted) {
        throw new DomainError(
          'invalid_action',
          'Inbound runtime completion marker was not updated'
        )
      }
      await this.appendAudit({
        type: 'integration_event',
        actorType: 'System',
        actorId: 'api',
        correlationId: input.correlationId,
        policyVersion: 'api-runtime-v1',
        tenantId,
        payload: {
          sessionId: input.sessionId,
          conversationId: input.conversationId,
          accepted: true,
          tenantId,
          runtimeStatus: 'completed',
          traceId: trace.traceId,
          externalCall: trace.provider.externalCall
        }
      })
      await this.client.query('COMMIT')
      return { status: 'completed' }
    } catch (error) {
      await this.client.query('ROLLBACK')
      throw error
    }
  }

  async appendAudit(
    input: Omit<AuditEventRecord, 'id' | 'createdAt'>
  ): Promise<AuditEventRecord> {
    const tenantId = this.tenantIsolation
      ? TenantIdSchema.safeParse(input.tenantId)
      : null
    if (this.tenantIsolation && (!tenantId || !tenantId.success)) {
      throw new DomainError('invalid_action', 'Tenant scope is required')
    }
    if (
      this.tenantIsolation &&
      input.payload &&
      (!hasTenantContext(input.payload) ||
        readPayloadTenantId(input.payload) !== tenantId?.data)
    ) {
      throw new DomainError(
        'invalid_action',
        'A tenant-scoped audit context is required'
      )
    }
    const payload = sanitizeAuditEvidencePayload(input.payload).payload
    const event: AuditEventRecord = {
      ...input,
      payload,
      id: createDomainId('audit'),
      createdAt: new Date()
    }
    if (this.tenantIsolation) {
      await this.client.query(
        `INSERT INTO audit_events (tenant_id, id, type, actor_type, actor_id, correlation_id, policy_version, payload, created_at)
         VALUES (NULLIF(current_setting('cvg.tenant_id', true), ''), $1, $2, $3, $4, $5, $6, $7::jsonb, $8)`,
        [
          event.id,
          event.type,
          event.actorType,
          event.actorId,
          event.correlationId,
          event.policyVersion,
          JSON.stringify(sanitizeAuditEvidencePayload(event.payload).payload),
          event.createdAt
        ]
      )
    } else {
      await this.client.query(
        `INSERT INTO audit_events (id, type, actor_type, actor_id, correlation_id, policy_version, payload, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)`,
        [
          event.id,
          event.type,
          event.actorType,
          event.actorId,
          event.correlationId,
          event.policyVersion,
          JSON.stringify(sanitizeAuditEvidencePayload(event.payload).payload),
          event.createdAt
        ]
      )
    }
    return event
  }

  async listAuditBySession(
    sessionId: string,
    rawTenantId?: TenantId
  ): Promise<AuditEventRecord[]> {
    const tenantId = rawTenantId ? TenantIdSchema.parse(rawTenantId) : undefined
    const scopeFilter = tenantId
      ? this.tenantIsolation
        ? 'AND audit_events.tenant_id = $2'
        : `AND EXISTS (
             SELECT 1
             FROM sessions
             INNER JOIN conversations ON conversations.id = sessions.conversation_id
             WHERE sessions.id = $1 AND conversations.tenant_id = $2
           )`
      : ''
    const tenantColumn = this.tenantIsolation ? ', tenant_id' : ''
    const result = await this.client.query<{
      id: string
      tenant_id?: TenantId | null
      type: AuditEventRecord['type']
      actor_type: AuditEventRecord['actorType']
      actor_id: string
      correlation_id: string
      policy_version: string
      payload: unknown
      created_at: Date
    }>(
      `SELECT id${tenantColumn}, type, actor_type, actor_id, correlation_id, policy_version, payload, created_at
       FROM audit_events
       WHERE payload->>'sessionId' = $1
       ${scopeFilter}
       ORDER BY created_at ASC`,
      [sessionId, ...(tenantId ? [tenantId] : [])]
    )

    return result.rows.map((row) => ({
      id: row.id,
      ...(row.tenant_id ? { tenantId: row.tenant_id } : {}),
      type: row.type,
      actorType: row.actor_type,
      actorId: row.actor_id,
      correlationId: row.correlation_id,
      policyVersion: row.policy_version,
      payload: sanitizeAuditEvidencePayload(row.payload).payload,
      createdAt: row.created_at
    }))
  }

  async listAuditEvidence(
    query: AuditEvidenceQuery,
    rawTenantId?: TenantId
  ): Promise<AuditEvidencePage> {
    const tenantId = rawTenantId ? TenantIdSchema.parse(rawTenantId) : undefined
    const where = buildAuditWhereClause(query, tenantId, this.tenantIsolation)
    const tenantColumn = this.tenantIsolation ? ', tenant_id' : ''
    const result = await this.client.query<AuditEventRow & { total: number }>(
      `SELECT id${tenantColumn}, type, actor_type, actor_id, correlation_id, policy_version, payload, created_at,
              COUNT(*) OVER()::integer AS total
       FROM audit_events
       ${where.sql}
       ORDER BY created_at ASC
       LIMIT $${where.values.length + 1} OFFSET $${where.values.length + 2}`,
      [...where.values, query.limit, query.offset]
    )
    const items = result.rows.map((row) => this.mapAuditEvent(row))
    const total = result.rows[0]?.total ?? 0
    return {
      items,
      pageInfo: {
        limit: query.limit,
        offset: query.offset,
        total,
        hasNextPage: query.offset + items.length < total
      }
    }
  }

  async summarizeAuditEvidence(
    filters: AuditEvidenceFilters,
    rawTenantId?: TenantId
  ): Promise<AuditEvidenceSummary> {
    const tenantId = rawTenantId ? TenantIdSchema.parse(rawTenantId) : undefined
    const where = buildAuditWhereClause(filters, tenantId, this.tenantIsolation)
    const tenantColumn = this.tenantIsolation ? ', tenant_id' : ''
    const result = await this.client.query<AuditEventRow>(
      `SELECT id${tenantColumn}, type, actor_type, actor_id, correlation_id, policy_version, payload, created_at
       FROM audit_events
       ${where.sql}
       ORDER BY created_at ASC`,
      where.values
    )
    return summarizeAuditEvents(
      result.rows.map((row) => this.mapAuditEvent(row))
    )
  }

  async listAuditEventsByIds(
    rawIds: string[],
    rawTenantId?: TenantId
  ): Promise<AuditEventRecord[]> {
    const tenantId = rawTenantId ? TenantIdSchema.parse(rawTenantId) : undefined
    const tenantColumn = this.tenantIsolation ? ', tenant_id' : ''
    const values: unknown[] = [rawIds]
    const tenantClause = tenantId
      ? this.tenantIsolation
        ? (() => {
            values.push(tenantId)
            return `AND audit_events.tenant_id = $${values.length}`
          })()
        : (() => {
            values.push(tenantId)
            return `AND audit_events.payload->>'tenantId' = $${values.length}`
          })()
      : ''
    const result = await this.client.query<AuditEventRow>(
      `SELECT id${tenantColumn}, type, actor_type, actor_id, correlation_id, policy_version, payload, created_at
       FROM audit_events
       WHERE id = ANY($1::text[])
       ${tenantClause}
       ORDER BY created_at ASC`,
      values
    )
    return result.rows.map((row) => this.mapAuditEvent(row))
  }

  async createAuditEvidenceCheckpoint(
    rawInput: AuditEvidenceCheckpointCreateInput,
    rawCreatedBy: string,
    rawTenantId?: TenantId
  ): Promise<AuditEvidenceCheckpointRecord> {
    const tenantId = requireCheckpointTenant(rawTenantId)
    const input = AuditEvidenceCheckpointCreateInputSchema.parse(rawInput)
    const createdBy = AuditEvidenceCheckpointActorIdSchema.parse(rawCreatedBy)
    await this.client.query('BEGIN')
    try {
      const events = await this.listAuditEventsByIds(input.eventIds, tenantId)
      assertCheckpointEvents(input, events, input.eventIds)
      const evidenceDigest = computeAuditEvidenceCheckpointDigest(
        tenantId,
        input,
        events
      )
      const now = new Date()
      const checkpoint: AuditEvidenceCheckpointRecord = {
        tenantId,
        id: createAuditEvidenceCheckpointId(),
        filters: { ...(input.filters ?? {}) },
        eventIds: [...input.eventIds].sort(),
        eventCount: input.eventIds.length,
        evidenceDigest,
        status: 'SEALED',
        createdBy,
        updatedBy: createdBy,
        createdAt: now,
        updatedAt: now
      }
      try {
        await this.client.query(
          `INSERT INTO audit_evidence_checkpoints
             (tenant_id, id, filters, event_ids, event_count, evidence_digest, status, created_by, updated_by, created_at, updated_at)
           VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7, $8, $9, $10, $11)`,
          [
            checkpoint.tenantId,
            checkpoint.id,
            JSON.stringify(checkpoint.filters),
            JSON.stringify(checkpoint.eventIds),
            checkpoint.eventCount,
            checkpoint.evidenceDigest,
            checkpoint.status,
            checkpoint.createdBy,
            checkpoint.updatedBy,
            checkpoint.createdAt,
            checkpoint.updatedAt
          ]
        )
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new DomainError(
            'conflict',
            'Audit evidence checkpoint already exists'
          )
        }
        throw error
      }
      await this.client.query('COMMIT')
      return cloneAuditEvidenceCheckpoint(checkpoint)
    } catch (error) {
      await this.client.query('ROLLBACK')
      throw error
    }
  }

  async getAuditEvidenceCheckpoint(
    rawId: string,
    rawTenantId?: TenantId
  ): Promise<AuditEvidenceCheckpointRecord | null> {
    const tenantId = requireCheckpointTenant(rawTenantId)
    const id = AuditEvidenceCheckpointIdSchema.parse(rawId)
    const result = await this.client.query<AuditEvidenceCheckpointRow>(
      `SELECT tenant_id, id, filters, event_ids, event_count, evidence_digest, status,
              created_by, updated_by, created_at, updated_at
       FROM audit_evidence_checkpoints
       WHERE tenant_id = $1 AND id = $2`,
      [tenantId, id]
    )
    const row = result.rows[0]
    return row ? mapAuditEvidenceCheckpoint(row) : null
  }

  async listAuditEvidenceCheckpoints(
    rawTenantId?: TenantId
  ): Promise<AuditEvidenceCheckpointRecord[]> {
    const tenantId = requireCheckpointTenant(rawTenantId)
    const result = await this.client.query<AuditEvidenceCheckpointRow>(
      `SELECT tenant_id, id, filters, event_ids, event_count, evidence_digest, status,
              created_by, updated_by, created_at, updated_at
       FROM audit_evidence_checkpoints
       WHERE tenant_id = $1
       ORDER BY created_at DESC`,
      [tenantId]
    )
    return result.rows.map(mapAuditEvidenceCheckpoint)
  }

  async transitionAuditEvidenceCheckpoint(
    rawId: string,
    rawStatus: AuditEvidenceCheckpointStatus,
    rawUpdatedBy: string,
    rawExpectedStatus: AuditEvidenceCheckpointStatus,
    rawTenantId?: TenantId
  ): Promise<AuditEvidenceCheckpointRecord | null> {
    const tenantId = requireCheckpointTenant(rawTenantId)
    const id = AuditEvidenceCheckpointIdSchema.parse(rawId)
    const status = AuditEvidenceCheckpointStatusSchema.parse(rawStatus)
    const expectedStatus =
      AuditEvidenceCheckpointStatusSchema.parse(rawExpectedStatus)
    const updatedBy = AuditEvidenceCheckpointActorIdSchema.parse(rawUpdatedBy)
    if (status !== 'ARCHIVED' || expectedStatus !== 'SEALED') {
      throw new DomainError(
        'invalid_action',
        'Audit evidence checkpoint transition is not allowed'
      )
    }
    await this.client.query('BEGIN')
    try {
      const current = await this.client.query<AuditEvidenceCheckpointRow>(
        `SELECT tenant_id, id, filters, event_ids, event_count, evidence_digest, status,
                created_by, updated_by, created_at, updated_at
         FROM audit_evidence_checkpoints
         WHERE tenant_id = $1 AND id = $2
         FOR UPDATE`,
        [tenantId, id]
      )
      const row = current.rows[0]
      if (!row) {
        await this.client.query('COMMIT')
        return null
      }
      const checkpoint = mapAuditEvidenceCheckpoint(row)
      if (checkpoint.status !== expectedStatus) {
        throw new DomainError(
          'conflict',
          `Audit evidence checkpoint status is ${checkpoint.status}, expected ${expectedStatus}`
        )
      }
      const updatedAt = new Date()
      const updated = await this.client.query<AuditEvidenceCheckpointRow>(
        `UPDATE audit_evidence_checkpoints
         SET status = $3, updated_by = $4, updated_at = $5
         WHERE tenant_id = $1 AND id = $2 AND status = $6
         RETURNING tenant_id, id, filters, event_ids, event_count, evidence_digest, status,
                   created_by, updated_by, created_at, updated_at`,
        [tenantId, id, status, updatedBy, updatedAt, expectedStatus]
      )
      const result = updated.rows[0]
      if (!result) {
        throw new DomainError(
          'conflict',
          'Audit evidence checkpoint transition lost its compare-and-swap'
        )
      }
      await this.client.query('COMMIT')
      return mapAuditEvidenceCheckpoint(result)
    } catch (error) {
      await this.client.query('ROLLBACK')
      throw error
    }
  }

  async timeline(
    tenantId: TenantId,
    conversationId: string
  ): Promise<{ messages: MessageRecord[]; sessions: SessionRecord[] }> {
    const sessionAgentColumns = this.tenantIsolation
      ? 'sessions.agent_id, sessions.agent_version_id'
      : 'NULL::text AS agent_id, NULL::text AS agent_version_id'
    const messages = await this.client.query<{
      id: string
      conversation_id: string
      external_message_id: string
      direction: 'inbound' | 'outbound'
      body: string
      created_at: Date
    }>(
      `SELECT messages.id, messages.conversation_id, messages.external_message_id, messages.direction, messages.body, messages.created_at
       FROM messages
       INNER JOIN conversations ON conversations.id = messages.conversation_id
       WHERE messages.conversation_id = $1 AND conversations.tenant_id = $2
       ORDER BY messages.created_at ASC`,
      [conversationId, tenantId]
    )
    const sessions = await this.client.query<{
      id: string
      conversation_id: string
      status: SessionRecord['status']
      takeover_state: HumanTakeoverState
      agent_id: string | null
      agent_version_id: string | null
      created_at: Date
      updated_at: Date
    }>(
      `SELECT sessions.id, sessions.conversation_id, sessions.status, sessions.takeover_state,
              ${sessionAgentColumns}, sessions.created_at, sessions.updated_at
       FROM sessions
       INNER JOIN conversations ON conversations.id = sessions.conversation_id
       WHERE sessions.conversation_id = $1 AND conversations.tenant_id = $2
       ORDER BY sessions.created_at ASC`,
      [conversationId, tenantId]
    )

    return {
      messages: messages.rows.map((row) => ({
        id: row.id,
        conversationId: row.conversation_id,
        externalMessageId: row.external_message_id,
        direction: row.direction,
        body: redactSensitiveText(row.body),
        createdAt: row.created_at
      })),
      sessions: sessions.rows.map((row) => ({
        id: row.id,
        conversationId: row.conversation_id,
        status: row.status,
        takeoverState: row.takeover_state,
        ...(row.agent_id ? { agentId: AgentIdSchema.parse(row.agent_id) } : {}),
        ...(row.agent_version_id
          ? { agentVersionId: AgentVersionIdSchema.parse(row.agent_version_id) }
          : {}),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    }
  }

  async listPage(
    tenantId: TenantId,
    input: PaginationInput
  ): Promise<ConversationPage> {
    const result = await this.client.query<{
      id: string
      channel: Channel
      sender_ref: string
      status: ConversationRecord['status']
      correlation_id: string
      open_session_id: string | null
      last_message_body: string | null
      last_message_at: Date | null
      created_at: Date
      updated_at: Date
      total: number
    }>(
      `SELECT conversations.id,
              conversations.channel,
              conversations.sender_ref,
              conversations.status,
              conversations.correlation_id,
              open_sessions.id AS open_session_id,
              last_messages.body AS last_message_body,
              last_messages.created_at AS last_message_at,
              conversations.created_at,
              conversations.updated_at,
              COUNT(*) OVER()::integer AS total
       FROM conversations
       LEFT JOIN LATERAL (
         SELECT sessions.id
         FROM sessions
         WHERE sessions.conversation_id = conversations.id AND sessions.status = 'open'
         ORDER BY sessions.created_at DESC
         LIMIT 1
       ) open_sessions ON true
       LEFT JOIN LATERAL (
         SELECT messages.body, messages.created_at
         FROM messages
         WHERE messages.conversation_id = conversations.id
         ORDER BY messages.created_at DESC
         LIMIT 1
       ) last_messages ON true
       WHERE conversations.tenant_id = $3
       ORDER BY COALESCE(last_messages.created_at, conversations.updated_at) DESC, conversations.created_at DESC
       LIMIT $1 OFFSET $2`,
      [input.limit, input.offset, tenantId]
    )

    const items: ConversationListItem[] = result.rows.map((row) => ({
      id: row.id,
      channel: row.channel,
      senderRef: redactSensitiveText(row.sender_ref),
      status: row.status,
      correlationId: row.correlation_id,
      openSessionId: row.open_session_id,
      lastMessageBody: row.last_message_body
        ? redactSensitiveText(row.last_message_body)
        : null,
      lastMessageAt: row.last_message_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
    const total = result.rows[0]?.total ?? 0
    return {
      items,
      pageInfo: {
        limit: input.limit,
        offset: input.offset,
        total,
        hasNextPage: input.offset + items.length < total
      }
    }
  }

  async createTask(
    input: {
      sessionId: string
      title: string
      description: string
      priority: TaskPriority
      source: string
      idempotencyKey: string
    },
    rawTenantId?: TenantId
  ): Promise<TaskRecord> {
    const tenantId = rawTenantId ? TenantIdSchema.parse(rawTenantId) : undefined
    if (this.tenantIsolation && !tenantId) {
      throw new DomainError('invalid_action', 'Tenant scope is required')
    }
    if (tenantId) await this.assertSessionTenant(input.sessionId, tenantId)
    const scopeJoin = tenantId
      ? `INNER JOIN sessions ON sessions.id = tasks.session_id
         INNER JOIN conversations ON conversations.id = sessions.conversation_id`
      : ''
    const scopeFilter = tenantId ? ' AND conversations.tenant_id = $4' : ''
    const existing = await this.client.query<{
      id: string
      session_id: string
      title: string
      description: string
      priority: TaskPriority
      source: string
      status: TaskRecord['status']
      idempotency_key: string
      created_at: Date
    }>(
      `SELECT tasks.id, tasks.session_id, tasks.title, tasks.description, tasks.priority, tasks.source, tasks.status, tasks.idempotency_key, tasks.created_at
       FROM tasks
       ${scopeJoin}
       WHERE session_id = $1 AND source = $2 AND idempotency_key = $3
       ${scopeFilter}
       LIMIT 1`,
      [
        input.sessionId,
        input.source,
        input.idempotencyKey,
        ...(tenantId ? [tenantId] : [])
      ]
    )
    const existingRow = existing.rows[0]
    if (existingRow) return this.mapTask(existingRow)

    const task: TaskRecord = {
      id: createDomainId('task'),
      sessionId: input.sessionId,
      title: input.title,
      description: input.description,
      priority: input.priority,
      source: input.source,
      status: 'open',
      idempotencyKey: input.idempotencyKey,
      createdAt: new Date()
    }
    try {
      if (this.tenantIsolation) {
        await this.client.query(
          `INSERT INTO tasks (tenant_id, id, session_id, title, description, priority, source, status, idempotency_key, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            tenantId,
            task.id,
            task.sessionId,
            task.title,
            task.description,
            task.priority,
            task.source,
            task.status,
            task.idempotencyKey,
            task.createdAt
          ]
        )
      } else {
        await this.client.query(
          `INSERT INTO tasks (id, session_id, title, description, priority, source, status, idempotency_key, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            task.id,
            task.sessionId,
            task.title,
            task.description,
            task.priority,
            task.source,
            task.status,
            task.idempotencyKey,
            task.createdAt
          ]
        )
      }
    } catch (error) {
      if (isUniqueViolation(error)) {
        const winner = await this.client.query<(typeof existing.rows)[number]>(
          `SELECT tasks.id, tasks.session_id, tasks.title, tasks.description, tasks.priority, tasks.source, tasks.status, tasks.idempotency_key, tasks.created_at
           FROM tasks
           ${scopeJoin}
           WHERE session_id = $1 AND source = $2 AND idempotency_key = $3
           ${scopeFilter}
           LIMIT 1`,
          [
            input.sessionId,
            input.source,
            input.idempotencyKey,
            ...(tenantId ? [tenantId] : [])
          ]
        )
        const winnerRow = winner.rows[0]
        if (winnerRow) return this.mapTask(winnerRow)
      }
      throw error
    }
    return task
  }

  async listTasks(rawTenantId?: TenantId): Promise<TaskRecord[]> {
    const tenantId = rawTenantId ? TenantIdSchema.parse(rawTenantId) : undefined
    const scopeJoin = tenantId
      ? `INNER JOIN sessions ON sessions.id = tasks.session_id
         INNER JOIN conversations ON conversations.id = sessions.conversation_id`
      : ''
    const scopeFilter = tenantId ? 'WHERE conversations.tenant_id = $1' : ''
    const result = await this.client.query<{
      id: string
      session_id: string
      title: string
      description: string
      priority: TaskPriority
      source: string
      status: TaskRecord['status']
      idempotency_key: string
      created_at: Date
    }>(
      `SELECT tasks.id, tasks.session_id, tasks.title, tasks.description, tasks.priority, tasks.source, tasks.status, tasks.idempotency_key, tasks.created_at
       FROM tasks
       ${scopeJoin}
       ${scopeFilter}
       ORDER BY tasks.created_at ASC`,
      tenantId ? [tenantId] : undefined
    )
    return result.rows.map((row) => this.mapTask(row))
  }

  async findTaskById(
    id: string,
    rawTenantId?: TenantId
  ): Promise<TaskRecord | null> {
    const tenantId = rawTenantId ? TenantIdSchema.parse(rawTenantId) : undefined
    const scopeJoin = tenantId
      ? `INNER JOIN sessions ON sessions.id = tasks.session_id
         INNER JOIN conversations ON conversations.id = sessions.conversation_id`
      : ''
    const scopeFilter = tenantId ? ' AND conversations.tenant_id = $2' : ''
    const result = await this.client.query<{
      id: string
      session_id: string
      title: string
      description: string
      priority: TaskPriority
      source: string
      status: TaskRecord['status']
      idempotency_key: string
      created_at: Date
    }>(
      `SELECT tasks.id, tasks.session_id, tasks.title, tasks.description, tasks.priority, tasks.source, tasks.status, tasks.idempotency_key, tasks.created_at
       FROM tasks
       ${scopeJoin}
       WHERE tasks.id = $1
       ${scopeFilter}
       LIMIT 1`,
      [id, ...(tenantId ? [tenantId] : [])]
    )
    const row = result.rows[0]
    return row ? this.mapTask(row) : null
  }

  async updateTaskStatus(
    id: string,
    status: TaskStatus,
    rawTenantId?: TenantId
  ): Promise<TaskRecord | null> {
    const tenantId = rawTenantId ? TenantIdSchema.parse(rawTenantId) : undefined
    const scopeFilter = tenantId
      ? ` AND EXISTS (
           SELECT 1
           FROM sessions
           INNER JOIN conversations ON conversations.id = sessions.conversation_id
           WHERE sessions.id = tasks.session_id
             AND conversations.tenant_id = $3
         )`
      : ''
    const result = await this.client.query<{
      id: string
      session_id: string
      title: string
      description: string
      priority: TaskPriority
      source: string
      status: TaskRecord['status']
      idempotency_key: string
      created_at: Date
    }>(
      `UPDATE tasks
       SET status = $2
       WHERE tasks.id = $1
       ${scopeFilter}
       RETURNING tasks.id, tasks.session_id, tasks.title, tasks.description, tasks.priority, tasks.source, tasks.status, tasks.idempotency_key, tasks.created_at`,
      [id, status, ...(tenantId ? [tenantId] : [])]
    )
    const row = result.rows[0]
    return row ? this.mapTask(row) : null
  }

  private async assertSessionTenant(
    sessionId: string,
    tenantId: TenantId
  ): Promise<void> {
    const result = await this.client.query(
      `SELECT sessions.id
       FROM sessions
       INNER JOIN conversations ON conversations.id = sessions.conversation_id
       WHERE sessions.id = $1 AND conversations.tenant_id = $2
       LIMIT 1`,
      [sessionId, tenantId]
    )
    if (result.rows.length === 0) {
      throw new DomainError('invalid_action', 'Session not found')
    }
  }

  async saveApproval(
    request: ApprovalRequestRecord,
    rawTenantId?: TenantId
  ): Promise<ApprovalRequestRecord> {
    const tenantId = rawTenantId ? TenantIdSchema.parse(rawTenantId) : undefined
    if (this.tenantIsolation && !tenantId) {
      throw new DomainError('invalid_action', 'Tenant scope is required')
    }
    if (tenantId) await this.assertSessionTenant(request.sessionId, tenantId)
    if (this.tenantIsolation) {
      await this.client.query(
        `INSERT INTO approval_requests (tenant_id, id, session_id, proposed_action, summary, risk_level, status, decided_by, decided_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           decided_by = EXCLUDED.decided_by,
           decided_at = EXCLUDED.decided_at`,
        [
          tenantId,
          request.id,
          request.sessionId,
          request.proposedAction,
          request.summary,
          request.riskLevel,
          request.status,
          request.decidedBy,
          request.decidedAt,
          request.createdAt
        ]
      )
    } else {
      await this.client.query(
        `INSERT INTO approval_requests (id, session_id, proposed_action, summary, risk_level, status, decided_by, decided_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           decided_by = EXCLUDED.decided_by,
           decided_at = EXCLUDED.decided_at`,
        [
          request.id,
          request.sessionId,
          request.proposedAction,
          request.summary,
          request.riskLevel,
          request.status,
          request.decidedBy,
          request.decidedAt,
          request.createdAt
        ]
      )
    }
    return request
  }

  async findApprovalById(
    id: string,
    rawTenantId?: TenantId
  ): Promise<ApprovalRequestRecord | null> {
    const tenantId = rawTenantId ? TenantIdSchema.parse(rawTenantId) : undefined
    const scopeJoin = tenantId
      ? `INNER JOIN sessions ON sessions.id = approval_requests.session_id
         INNER JOIN conversations ON conversations.id = sessions.conversation_id`
      : ''
    const scopeFilter = tenantId ? ' AND conversations.tenant_id = $2' : ''
    const result = await this.client.query<{
      id: string
      session_id: string
      proposed_action: string
      summary: string
      risk_level: ApprovalRequestRecord['riskLevel']
      status: ApprovalRequestRecord['status']
      decided_by: string | null
      decided_at: Date | null
      created_at: Date
    }>(
      `SELECT approval_requests.id, approval_requests.session_id, approval_requests.proposed_action, approval_requests.summary, approval_requests.risk_level, approval_requests.status, approval_requests.decided_by, approval_requests.decided_at, approval_requests.created_at
       FROM approval_requests
       ${scopeJoin}
       WHERE approval_requests.id = $1
       ${scopeFilter}
       LIMIT 1`,
      [id, ...(tenantId ? [tenantId] : [])]
    )
    const row = result.rows[0]
    return row ? this.mapApproval(row) : null
  }

  async listApprovals(
    rawTenantId?: TenantId
  ): Promise<ApprovalRequestRecord[]> {
    const tenantId = rawTenantId ? TenantIdSchema.parse(rawTenantId) : undefined
    const scopeJoin = tenantId
      ? `INNER JOIN sessions ON sessions.id = approval_requests.session_id
         INNER JOIN conversations ON conversations.id = sessions.conversation_id`
      : ''
    const scopeFilter = tenantId ? 'WHERE conversations.tenant_id = $1' : ''
    const result = await this.client.query<{
      id: string
      session_id: string
      proposed_action: string
      summary: string
      risk_level: ApprovalRequestRecord['riskLevel']
      status: ApprovalRequestRecord['status']
      decided_by: string | null
      decided_at: Date | null
      created_at: Date
    }>(
      `SELECT approval_requests.id, approval_requests.session_id, approval_requests.proposed_action, approval_requests.summary, approval_requests.risk_level, approval_requests.status, approval_requests.decided_by, approval_requests.decided_at, approval_requests.created_at
       FROM approval_requests
       ${scopeJoin}
       ${scopeFilter}
       ORDER BY approval_requests.created_at ASC`,
      tenantId ? [tenantId] : undefined
    )
    return result.rows.map((row) => this.mapApproval(row))
  }

  private mapTask(row: {
    id: string
    session_id: string
    title: string
    description: string
    priority: TaskPriority
    source: string
    status: TaskRecord['status']
    idempotency_key: string
    created_at: Date
  }): TaskRecord {
    return {
      id: row.id,
      sessionId: row.session_id,
      title: row.title,
      description: row.description,
      priority: row.priority,
      source: row.source,
      status: row.status,
      idempotencyKey: row.idempotency_key,
      createdAt: row.created_at
    }
  }

  private mapApproval(row: {
    id: string
    session_id: string
    proposed_action: string
    summary: string
    risk_level: ApprovalRequestRecord['riskLevel']
    status: ApprovalRequestRecord['status']
    decided_by: string | null
    decided_at: Date | null
    created_at: Date
  }): ApprovalRequestRecord {
    return {
      id: row.id,
      sessionId: row.session_id,
      proposedAction: row.proposed_action,
      summary: row.summary,
      riskLevel: row.risk_level,
      status: row.status,
      decidedBy: row.decided_by,
      decidedAt: row.decided_at,
      createdAt: row.created_at
    }
  }

  private mapAuditEvent(row: AuditEventRow): AuditEventRecord {
    return {
      id: row.id,
      ...(row.tenant_id ? { tenantId: row.tenant_id } : {}),
      type: row.type,
      actorType: row.actor_type,
      actorId: row.actor_id,
      correlationId: row.correlation_id,
      policyVersion: row.policy_version,
      payload: sanitizeAuditEvidencePayload(row.payload).payload,
      createdAt: row.created_at
    }
  }
}

interface AuditEventRow {
  id: string
  tenant_id?: TenantId | null
  type: AuditEventRecord['type']
  actor_type: AuditEventRecord['actorType']
  actor_id: string
  correlation_id: string
  policy_version: string
  payload: unknown
  created_at: Date
}

interface AuditEvidenceCheckpointRow {
  tenant_id: TenantId
  id: string
  filters: unknown
  event_ids: unknown
  event_count: number
  evidence_digest: string
  status: AuditEvidenceCheckpointStatus
  created_by: string
  updated_by: string
  created_at: Date
  updated_at: Date
}

function requireCheckpointTenant(rawTenantId?: TenantId): TenantId {
  const parsed = TenantIdSchema.safeParse(rawTenantId)
  if (!parsed.success) {
    throw new DomainError('unauthorized', 'Tenant scope is required')
  }
  return parsed.data
}

function assertCheckpointEvents(
  input: AuditEvidenceCheckpointCreateInput,
  events: AuditEventRecord[],
  requestedIds: string[]
): void {
  if (events.length !== requestedIds.length) {
    throw new DomainError(
      'invalid_action',
      'All audit evidence events must exist in the tenant scope'
    )
  }
  const filters = normalizeAuditEvidenceCheckpointFilters(input.filters ?? {})
  if (events.some((event) => !auditEventMatches(event, filters))) {
    throw new DomainError(
      'invalid_action',
      'All audit evidence events must match the checkpoint filters'
    )
  }
}

function mapAuditEvidenceCheckpoint(
  row: AuditEvidenceCheckpointRow
): AuditEvidenceCheckpointRecord {
  const parsedFilters = AuditEvidenceCheckpointFiltersSchema.parse(row.filters)
  const parsedEventIds =
    AuditEvidenceCheckpointCreateInputSchema.shape.eventIds.parse(row.event_ids)
  return {
    tenantId: TenantIdSchema.parse(row.tenant_id),
    id: AuditEvidenceCheckpointIdSchema.parse(row.id),
    filters: { ...parsedFilters },
    eventIds: [...parsedEventIds],
    eventCount: row.event_count,
    evidenceDigest: row.evidence_digest,
    status: AuditEvidenceCheckpointStatusSchema.parse(row.status),
    createdBy: AuditEvidenceCheckpointActorIdSchema.parse(row.created_by),
    updatedBy: AuditEvidenceCheckpointActorIdSchema.parse(row.updated_by),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }
}

function buildAuditWhereClause(
  filters: AuditEvidenceFilters,
  tenantId?: TenantId,
  tenantIsolation = false
): {
  sql: string
  values: unknown[]
} {
  const clauses: string[] = []
  const values: unknown[] = []

  if (filters.sessionId) {
    values.push(filters.sessionId)
    clauses.push(`payload->>'sessionId' = $${values.length}`)
  }
  if (filters.correlationId) {
    values.push(filters.correlationId)
    clauses.push(`correlation_id = $${values.length}`)
  }
  if (filters.type) {
    values.push(filters.type)
    clauses.push(`type = $${values.length}`)
  }
  if (filters.actorId) {
    values.push(filters.actorId)
    clauses.push(`actor_id = $${values.length}`)
  }
  if (tenantId) {
    values.push(tenantId)
    const tenantParameter = `$${values.length}`
    clauses.push(
      tenantIsolation
        ? `audit_events.tenant_id = ${tenantParameter}`
        : `(
            EXISTS (
              SELECT 1
              FROM sessions
              INNER JOIN conversations ON conversations.id = sessions.conversation_id
              WHERE sessions.id = payload->>'sessionId'
                AND conversations.tenant_id = ${tenantParameter}
            )
          )`
    )
  }

  return {
    sql: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    values
  }
}

function assertInboundRuntimeCorrelation(correlationId: unknown): void {
  if (!CorrelationIdSchema.safeParse(correlationId).success) {
    throw new DomainError(
      'validation_failed',
      'Inbound runtime correlation ID is invalid'
    )
  }
}

function assertInboundToolAuditParents(
  trace: TestRunTrace,
  rawEvents: unknown
): asserts rawEvents is PluginAuditEvent[] {
  if (!Array.isArray(rawEvents)) {
    throw new DomainError(
      'validation_failed',
      'Inbound runtime tool audit events are invalid'
    )
  }

  for (const rawEvent of rawEvents) {
    try {
      if (
        typeof rawEvent !== 'object' ||
        rawEvent === null ||
        Array.isArray(rawEvent)
      ) {
        throw new DomainError(
          'validation_failed',
          'Inbound runtime tool audit event is invalid'
        )
      }
      const event = rawEvent as Record<string, unknown>
      if (
        !CorrelationIdSchema.safeParse(event.correlationId).success ||
        !TraceIdSchema.safeParse(event.traceId).success ||
        event.traceId !== trace.traceId ||
        !TenantIdSchema.safeParse(event.tenantId).success ||
        event.tenantId !== trace.tenantId ||
        !AgentIdSchema.safeParse(event.agentId).success ||
        event.agentId !== trace.agentId ||
        !AgentVersionIdSchema.safeParse(event.versionId).success ||
        event.versionId !== trace.versionId
      ) {
        throw new DomainError(
          'validation_failed',
          'Inbound runtime tool audit trace parent is invalid'
        )
      }
    } catch (error) {
      if (error instanceof DomainError) throw error
      throw new DomainError(
        'validation_failed',
        'Inbound runtime tool audit event is invalid'
      )
    }
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  )
}

function hasTenantContext(payload: unknown): boolean {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'tenantId' in payload &&
    typeof payload.tenantId === 'string' &&
    payload.tenantId.length > 0
  )
}

function readPayloadTenantId(payload: unknown): TenantId | null {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('tenantId' in payload)
  ) {
    return null
  }
  const parsed = TenantIdSchema.safeParse(payload.tenantId)
  return parsed.success ? parsed.data : null
}
