/**
 * Responsibility: verify the PostgreSQL tenant-isolation contract — applied
 * migration checksums, RLS policies, tenant columns/constraints/indexes and
 * the distributed webhook replay storage.
 */
import { createHash } from 'node:crypto'
import {
  readPostgresMigrationSql,
  type PostgresQueryable
} from '@cvg/persistence'

export const tenantIsolationTables = [
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
  'channel_effect_journal',
  'effect_journal',
  'outbox_effects',
  'outbox_attempts',
  'journey_owner_drafts',
  'journey_patient_drafts',
  'journey_appointment_drafts',
  'runtime_approvals',
  'runtime_audit_events',
  'orchestrator_goals',
  'orchestrator_plans',
  'orchestrator_steps',
  'orchestrator_attempts',
  'orchestrator_observations',
  'orchestrator_evaluations',
  'platform_agents',
  'platform_agent_versions',
  'platform_test_runs',
  'platform_execution_traces',
  'platform_capability_approvals',
  'platform_test_suites',
  'platform_test_suite_runs',
  'platform_plugin_catalog',
  'platform_knowledge_sources',
  'platform_release_candidates',
  'audit_evidence_checkpoints'
] as const

export const tenantIsolationQuarantineTables = [
  'tenant_isolation_quarantine',
  'outbox_quarantine'
] as const

const tenantOnlyRlsTables = new Set([
  'outbox_effects',
  'outbox_attempts',
  'outbox_quarantine',
  'channel_effect_journal',
  'effect_journal',
  'journey_owner_drafts',
  'journey_patient_drafts',
  'journey_appointment_drafts',
  'runtime_approvals',
  'runtime_audit_events',
  'orchestrator_goals',
  'orchestrator_plans',
  'orchestrator_steps',
  'orchestrator_attempts',
  'orchestrator_observations',
  'orchestrator_evaluations'
])

export const webhookReplayTables = ['webhook_replay_events'] as const

export const tenantIsolationMigrationTables = [
  ...tenantIsolationTables,
  ...webhookReplayTables,
  ...tenantIsolationQuarantineTables,
  'schema_migrations'
] as const

const tenantIsolationMigrationVersions = [
  '0000_initial',
  '0001_tenant_isolation',
  '0002_capability_approvals',
  '0003_test_suite_catalog',
  '0004_plugin_manifest_catalog',
  '0005_knowledge_source_catalog',
  '0006_release_candidate_evidence',
  '0007_audit_evidence_checkpoint',
  '0008_session_agent_version_pin',
  '0009_release_candidate_validator_integrity',
  '0010_outbox_durability',
  '0011_outbox_payload_redaction',
  '0012_channel_effect_journal',
  '0013_runtime_effect_journal',
  '0014_journeys',
  '0015_runtime_approval_store',
  '0016_runtime_continuation_trace',
  '0017_runtime_audit_chain',
  '0018_outbox_lease_fencing',
  '0019_orchestrator_state',
  '0020_orchestrator_lineage_hardening',
  '0021_orchestrator_iteration_budget',
  '0022_orchestrator_evaluation_lineage',
  '0023_orchestrator_replan_fencing',
  '0024_tenant_isolation_constraint_validation',
  '0025_retention_ledger',
  '0026_operator_replay_events'
] as const

const tenantIsolationRequiredConstraints = [
  'messages_runtime_status_check',
  'messages_tenant_id_not_null',
  'sessions_tenant_id_not_null',
  'agent_runs_tenant_id_not_null',
  'tool_calls_tenant_id_not_null',
  'approval_requests_tenant_id_not_null',
  'tasks_tenant_id_not_null',
  'audit_events_tenant_id_not_null',
  'outbox_events_tenant_id_not_null',
  'outbox_events_tenant_id_id_key',
  'outbox_events_tenant_id_idempotency_key_key',
  'outbox_events_status_check',
  'outbox_events_attempts_check',
  'outbox_events_processing_lease_check',
  'outbox_events_processing_fencing_check',
  'outbox_events_failed_available_check',
  'outbox_events_dead_letter_check',
  'outbox_effects_pkey',
  'outbox_effects_tenant_event_fk',
  'outbox_effects_tenant_id_event_id_key',
  'outbox_attempts_pkey',
  'outbox_attempts_attempt_check',
  'outbox_attempts_tenant_event_fk',
  'outbox_quarantine_pkey',
  'messages_tenant_conversation_fk',
  'sessions_tenant_conversation_fk',
  'sessions_agent_binding_pair_check',
  'sessions_agent_binding_agent_fk',
  'sessions_agent_binding_version_fk',
  'agent_runs_tenant_session_fk',
  'tool_calls_tenant_run_fk',
  'approval_requests_tenant_session_fk',
  'tasks_tenant_session_fk',
  'platform_versions_tenant_agent_fk',
  'platform_test_runs_tenant_agent_version_fk',
  'platform_execution_traces_tenant_agent_version_fk',
  'platform_capability_approvals_tenant_nonce_key',
  'platform_capability_approvals_tenant_agent_version_fk',
  'platform_test_suites_tenant_agent_version_fk',
  'platform_test_suites_previous_agent_fk',
  'platform_test_suite_runs_tenant_suite_fk',
  'platform_test_suite_runs_tenant_agent_fk',
  'platform_test_suite_runs_tenant_suite_agent_fk',
  'platform_plugin_catalog_pkey',
  'platform_plugin_catalog_tenant_name_version_key',
  'platform_plugin_catalog_status_check',
  'platform_plugin_catalog_manifest_identity_check',
  'platform_knowledge_sources_pkey',
  'platform_knowledge_sources_tenant_identity_key',
  'platform_knowledge_sources_status_check',
  'platform_knowledge_sources_secret_metadata_check',
  'platform_release_candidates_pkey',
  'platform_release_candidates_identity_key',
  'platform_release_candidates_status_check',
  'platform_release_candidates_gates_check',
  'platform_release_candidates_digest_check',
  'platform_release_candidates_validation_actor_check',
  'audit_evidence_checkpoints_pkey',
  'audit_evidence_checkpoints_identity_key',
  'audit_evidence_checkpoints_filters_check',
  'audit_evidence_checkpoints_event_ids_check',
  'audit_evidence_checkpoints_event_count_check',
  'audit_evidence_checkpoints_count_matches_ids_check',
  'audit_evidence_checkpoints_digest_check',
  'audit_evidence_checkpoints_status_check',
  'audit_evidence_checkpoints_created_by_check',
  'audit_evidence_checkpoints_updated_by_check',
  'channel_effect_journal_pkey',
  'channel_effect_journal_lease_check',
  'channel_effect_journal_terminal_check',
  'effect_journal_pkey',
  'effect_journal_confirmed_check',
  'effect_journal_reconciliation_check',
  'journey_owner_drafts_pkey',
  'journey_owner_drafts_tenant_id_idempotency_key_key',
  'journey_patient_drafts_pkey',
  'journey_patient_drafts_tenant_id_idempotency_key_key',
  'journey_appointment_drafts_pkey',
  'journey_appointment_drafts_tenant_id_idempotency_key_key',
  'runtime_approvals_pkey',
  'runtime_audit_events_pkey',
  'runtime_audit_events_tenant_id_sequence_key',
  'orchestrator_goals_pkey',
  'orchestrator_plans_pkey',
  'orchestrator_plans_tenant_id_goal_id_version_key',
  'orchestrator_plans_tenant_id_goal_id_fkey',
  'orchestrator_plans_tenant_id_parent_plan_id_fkey',
  'orchestrator_steps_pkey',
  'orchestrator_steps_tenant_id_goal_id_fkey',
  'orchestrator_steps_tenant_id_plan_id_fkey',
  'orchestrator_attempts_pkey',
  'orchestrator_attempts_tenant_id_goal_id_fkey',
  'orchestrator_attempts_tenant_id_plan_id_fkey',
  'orchestrator_attempts_tenant_id_step_id_fkey',
  'orchestrator_observations_pkey',
  'orchestrator_observations_tenant_id_goal_id_fkey',
  'orchestrator_observations_tenant_id_plan_id_fkey',
  'orchestrator_observations_tenant_id_step_id_fkey',
  'orchestrator_evaluations_pkey',
  'orchestrator_evaluations_tenant_id_goal_id_fkey',
  'orchestrator_evaluations_tenant_id_plan_id_fkey',
  'orchestrator_evaluations_tenant_id_step_id_fkey',
  'orchestrator_plans_tenant_id_id_goal_id_key',
  'orchestrator_steps_tenant_id_id_goal_plan_key',
  'orchestrator_steps_goal_plan_lineage_fk',
  'orchestrator_observations_plan_goal_lineage_fk',
  'orchestrator_observations_step_lineage_fk',
  'orchestrator_evaluations_plan_goal_lineage_fk',
  'orchestrator_evaluations_step_lineage_fk',
  'orchestrator_evaluations_tenant_id_id_goal_id_plan_id_key',
  'orchestrator_plans_replan_source_pair_check',
  'orchestrator_plans_replan_source_lineage_fk',
  'orchestrator_attempts_tenant_id_id_lineage_key',
  'orchestrator_attempts_plan_goal_lineage_fk',
  'orchestrator_attempts_step_lineage_fk',
  'effect_journal_orchestration_lineage_check',
  'effect_journal_orchestration_step_lineage_fk',
  'effect_journal_orchestration_attempt_lineage_fk',
  'outbox_events_orchestration_lineage_check',
  'outbox_events_orchestration_step_lineage_fk',
  'outbox_events_orchestration_attempt_lineage_fk'
] as const

const tenantIsolationRequiredIndexes = [
  'idempotency_pkey',
  'idx_conversations_tenant_id',
  'idx_messages_tenant_conversation',
  'idx_messages_runtime_status',
  'idx_sessions_tenant_conversation',
  'idx_sessions_tenant_agent_version',
  'idx_agent_runs_tenant_session',
  'idx_tool_calls_tenant_run',
  'idx_approval_requests_tenant_session',
  'idx_tasks_tenant_session',
  'idx_audit_events_tenant_created',
  'idx_outbox_events_tenant_status',
  'idx_outbox_events_tenant_status_available',
  'idx_outbox_events_tenant_lease',
  'idx_outbox_effects_tenant_event',
  'idx_outbox_attempts_tenant_event',
  'idx_outbox_quarantine_tenant_captured',
  'idx_platform_agents_tenant_id',
  'idx_platform_agent_versions_tenant_agent',
  'idx_platform_test_runs_tenant_created',
  'idx_platform_execution_traces_tenant_created',
  'idx_platform_capability_approvals_tenant_status',
  'idx_platform_capability_approvals_tenant_actor',
  'idx_platform_test_suites_tenant_agent',
  'idx_platform_test_suite_runs_tenant_created',
  'idx_platform_plugin_catalog_tenant_status',
  'idx_platform_knowledge_sources_tenant_status',
  'idx_platform_release_candidates_tenant_status',
  'idx_platform_release_candidates_tenant_agent',
  'idx_audit_evidence_checkpoints_tenant_status',
  'idx_audit_evidence_checkpoints_tenant_created',
  'channel_effect_journal_pkey',
  'idx_channel_effect_journal_lease',
  'idx_channel_effect_journal_updated',
  'effect_journal_pkey',
  'idx_effect_journal_state_expires',
  'idx_effect_journal_updated',
  'journey_owner_drafts_pkey',
  'journey_owner_drafts_tenant_id_idempotency_key_key',
  'idx_journey_owner_drafts_tenant_status',
  'idx_journey_owner_drafts_tenant_phone',
  'journey_patient_drafts_pkey',
  'journey_patient_drafts_tenant_id_idempotency_key_key',
  'idx_journey_patient_drafts_tenant_status',
  'idx_journey_patient_drafts_tenant_owner',
  'journey_appointment_drafts_pkey',
  'journey_appointment_drafts_tenant_id_idempotency_key_key',
  'idx_journey_appointment_drafts_tenant_status',
  'runtime_approvals_pkey',
  'idx_runtime_approvals_status_reservation_expires',
  'idx_runtime_approvals_operation_key',
  'idx_messages_runtime_approval',
  'uq_runtime_approvals_continuation_message',
  'runtime_audit_events_pkey',
  'runtime_audit_events_tenant_id_sequence_key',
  'idx_runtime_audit_events_correlation',
  'orchestrator_goals_pkey',
  'idx_orchestrator_goals_runnable',
  'idx_orchestrator_goals_correlation',
  'uq_orchestrator_goals_inbound_message',
  'orchestrator_plans_pkey',
  'orchestrator_plans_tenant_id_goal_id_version_key',
  'idx_orchestrator_plans_goal_version',
  'orchestrator_steps_pkey',
  'idx_orchestrator_steps_ready',
  'idx_orchestrator_steps_expired_lease',
  'orchestrator_attempts_pkey',
  'idx_orchestrator_attempts_step',
  'orchestrator_observations_pkey',
  'idx_orchestrator_observations_goal',
  'orchestrator_evaluations_pkey',
  'idx_orchestrator_evaluations_goal',
  'orchestrator_plans_tenant_id_id_goal_id_key',
  'orchestrator_steps_tenant_id_id_goal_plan_key',
  'orchestrator_attempts_tenant_id_id_lineage_key',
  'idx_orchestrator_evaluations_lineage',
  'idx_effect_journal_orchestration_lineage',
  'idx_outbox_events_orchestration_lineage'
] as const

export async function assertTenantIsolationMigrationState(
  client: PostgresQueryable
): Promise<void> {
  const applied = await client.query<{
    version: string
    checksum: string | null
    applied_at: Date
    baseline_actor: string | null
    baseline_reference: string | null
    baseline_at: Date | null
  }>(
    `SELECT version, checksum, applied_at, baseline_actor, baseline_reference, baseline_at
     FROM schema_migrations
     WHERE version = ANY($1::text[])`,
    [tenantIsolationMigrationVersions]
  )
  const appliedByVersion = new Map(
    applied.rows.map((migration) => [migration.version, migration])
  )
  let previousAppliedAt = 0
  for (const version of tenantIsolationMigrationVersions) {
    const migration = appliedByVersion.get(version)
    const sql = await readPostgresMigrationSql(version)
    const expectedChecksum = createHash('sha256').update(sql).digest('hex')
    const appliedAt = migration?.applied_at
      ? new Date(migration.applied_at).getTime()
      : Number.NaN
    const baselineFields = migration
      ? [
          migration.baseline_actor,
          migration.baseline_reference,
          migration.baseline_at
        ]
      : []
    const baselineIsPartial =
      baselineFields.some((field) => field !== null && field !== undefined) &&
      baselineFields.some((field) => field === null || field === undefined)
    if (
      !migration ||
      migration.checksum !== expectedChecksum ||
      !Number.isFinite(appliedAt) ||
      appliedAt < previousAppliedAt ||
      baselineIsPartial
    ) {
      throw new Error(
        `PostgreSQL tenant-isolation migration state is not verified: ${version}`
      )
    }
    previousAppliedAt = appliedAt
  }
}

export async function assertTenantIsolationSchema(
  client: PostgresQueryable
): Promise<void> {
  const policyTables = [...tenantIsolationTables, 'outbox_quarantine'] as const
  const tables = await client.query<{
    relname: string
    relrowsecurity: boolean
    relforcerowsecurity: boolean
  }>(
    `SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
     FROM pg_class AS c
     INNER JOIN pg_namespace AS n ON n.oid = c.relnamespace
     WHERE n.nspname = current_schema()
       AND c.relname = ANY($1::text[])`,
    [policyTables]
  )
  const relationByName = new Map(
    tables.rows.map((table) => [table.relname, table])
  )
  const policies = await client.query<{
    tablename: string
    policyname: string
    permissive: string
    roles: string
    cmd: string
    qual: string | null
    with_check: string | null
  }>(
    `SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
     FROM pg_policies
     WHERE schemaname = current_schema()
       AND tablename = ANY($1::text[])`,
    [policyTables]
  )
  const policiesByTable = new Map<string, typeof policies.rows>()
  for (const policy of policies.rows) {
    const tablePolicies = policiesByTable.get(policy.tablename) ?? []
    policiesByTable.set(policy.tablename, [...tablePolicies, policy])
  }
  const expectedExpression =
    "tenant_isolation_quarantined = false AND tenant_id = NULLIF(current_setting('cvg.tenant_id', true), '')"
  const expectedTenantOnlyExpression =
    "tenant_id = NULLIF(current_setting('cvg.tenant_id', true), '')"

  for (const table of policyTables) {
    const relation = relationByName.get(table)
    const tablePolicies = policiesByTable.get(table) ?? []
    const policy = tablePolicies[0]
    if (
      !relation ||
      !relation.relrowsecurity ||
      !relation.relforcerowsecurity ||
      tablePolicies.length !== 1 ||
      !policy ||
      policy.policyname !== `${table}_tenant_isolation` ||
      policy.permissive !== 'PERMISSIVE' ||
      policy.roles !== '{public}' ||
      policy.cmd !== 'ALL' ||
      normalizePolicyExpression(policy.qual) !==
        (tenantOnlyRlsTables.has(table)
          ? expectedTenantOnlyExpression
          : expectedExpression) ||
      normalizePolicyExpression(policy.with_check) !==
        (tenantOnlyRlsTables.has(table)
          ? expectedTenantOnlyExpression
          : expectedExpression)
    ) {
      throw new Error(
        'PostgreSQL tenant isolation policies are not fully installed'
      )
    }
  }

  const columns = await client.query<{
    table_name: string
    column_name: string
  }>(
    `SELECT c.relname AS table_name, a.attname AS column_name
     FROM pg_class AS c
     INNER JOIN pg_namespace AS n ON n.oid = c.relnamespace
     INNER JOIN pg_attribute AS a ON a.attrelid = c.oid
     WHERE n.nspname = current_schema()
       AND c.relname = ANY($1::text[])
       AND a.attname = ANY($2::text[])
       AND a.attnum > 0
       AND NOT a.attisdropped`,
    [
      policyTables,
      [
        'tenant_id',
        'tenant_isolation_quarantined',
        'agent_id',
        'agent_version_id',
        'payload_protection_version',
        'result_protection_version',
        'orchestration_goal_id',
        'orchestration_plan_id',
        'orchestration_step_id',
        'orchestration_attempt_id'
      ]
    ]
  )
  const columnsByTable = new Map<string, Set<string>>()
  for (const column of columns.rows) {
    const tableColumns = columnsByTable.get(column.table_name) ?? new Set()
    tableColumns.add(column.column_name)
    columnsByTable.set(column.table_name, tableColumns)
  }
  const missingColumns = policyTables.filter((table) => {
    const tableColumns = columnsByTable.get(table)
    return (
      !tableColumns?.has('tenant_id') ||
      (!tenantOnlyRlsTables.has(table) &&
        !tableColumns.has('tenant_isolation_quarantined'))
    )
  })
  if (missingColumns.length > 0) {
    throw new Error(
      `PostgreSQL tenant isolation columns are incomplete: ${missingColumns.join(', ')}`
    )
  }
  const sessionColumns = columnsByTable.get('sessions')
  if (
    !sessionColumns?.has('agent_id') ||
    !sessionColumns.has('agent_version_id')
  ) {
    throw new Error('PostgreSQL session version pinning columns are incomplete')
  }
  const outboxEventsColumns = columnsByTable.get('outbox_events')
  const outboxEffectsColumns = columnsByTable.get('outbox_effects')
  if (
    !outboxEventsColumns?.has('payload_protection_version') ||
    !outboxEffectsColumns?.has('result_protection_version')
  ) {
    throw new Error(
      'PostgreSQL outbox payload protection columns are incomplete'
    )
  }
  const requiredOrchestrationLineageColumns = [
    'orchestration_goal_id',
    'orchestration_plan_id',
    'orchestration_step_id',
    'orchestration_attempt_id'
  ] as const
  const orchestrationLineageTables = [
    'effect_journal',
    'outbox_events'
  ] as const
  const missingOrchestrationLineageColumns = orchestrationLineageTables.flatMap(
    (table) =>
      requiredOrchestrationLineageColumns
        .filter((column) => !columnsByTable.get(table)?.has(column))
        .map((column) => `${table}.${column}`)
  )
  if (missingOrchestrationLineageColumns.length > 0) {
    throw new Error(
      `PostgreSQL orchestration lineage columns are incomplete: ${missingOrchestrationLineageColumns.join(', ')}`
    )
  }

  const constraints = await client.query<{
    conname: string
    convalidated: boolean
  }>(
    `SELECT conname, convalidated
     FROM pg_constraint
     WHERE connamespace = current_schema()::regnamespace
       AND conname = ANY($1::text[])`,
    [tenantIsolationRequiredConstraints]
  )
  const validatedConstraintNames = new Set(
    constraints.rows
      .filter((constraint) => constraint.convalidated)
      .map((constraint) => constraint.conname)
  )
  const missingConstraints = tenantIsolationRequiredConstraints.filter(
    (constraint) => !validatedConstraintNames.has(constraint)
  )
  if (missingConstraints.length > 0) {
    throw new Error(
      `PostgreSQL tenant isolation constraints are missing or unvalidated: ${missingConstraints.join(', ')}`
    )
  }

  const indexes = await client.query<{ indexname: string }>(
    `SELECT indexname
     FROM pg_indexes
     WHERE schemaname = current_schema()
       AND indexname = ANY($1::text[])`,
    [tenantIsolationRequiredIndexes]
  )
  const indexNames = new Set(indexes.rows.map((index) => index.indexname))
  const missingIndexes = tenantIsolationRequiredIndexes.filter(
    (index) => !indexNames.has(index)
  )
  if (missingIndexes.length > 0) {
    throw new Error(
      `PostgreSQL tenant isolation indexes are incomplete: ${missingIndexes.join(', ')}`
    )
  }
}

export async function assertWebhookReplaySchema(
  client: PostgresQueryable
): Promise<void> {
  const requiredConstraints = [
    'webhook_replay_events_pkey',
    'webhook_replay_events_event_key_check',
    'webhook_replay_events_status_check'
  ]
  const requiredIndexes = [
    'webhook_replay_events_pkey',
    'idx_webhook_replay_events_expires'
  ]
  const relation = await client.query<{
    relname: string
    relkind: string
  }>(
    `SELECT c.relname, c.relkind
     FROM pg_class AS c
     INNER JOIN pg_namespace AS n ON n.oid = c.relnamespace
     WHERE n.nspname = current_schema()
       AND c.relname = ANY($1::text[])`,
    [webhookReplayTables]
  )
  const columns = await client.query<{
    table_name: string
    column_name: string
  }>(
    `SELECT table_name, column_name
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = ANY($1::text[])`,
    [webhookReplayTables]
  )
  const columnNames = new Set(columns.rows.map((row) => row.column_name))
  const constraints = await client.query<{ conname: string }>(
    `SELECT conname
     FROM pg_constraint
     WHERE connamespace = current_schema()::regnamespace
       AND conname = ANY($1::text[])`,
    [requiredConstraints]
  )
  const indexes = await client.query<{ indexname: string }>(
    `SELECT indexname
     FROM pg_indexes
     WHERE schemaname = current_schema()
       AND indexname = ANY($1::text[])`,
    [requiredIndexes]
  )
  const constraintNames = new Set(
    constraints.rows.map((constraint) => constraint.conname)
  )
  const indexNames = new Set(indexes.rows.map((index) => index.indexname))
  if (
    relation.rows.length !== webhookReplayTables.length ||
    relation.rows[0]?.relkind !== 'r' ||
    !['event_key', 'status', 'expires_at'].every((column) =>
      columnNames.has(column)
    ) ||
    requiredConstraints.some(
      (constraint) => !constraintNames.has(constraint)
    ) ||
    requiredIndexes.some((index) => !indexNames.has(index))
  ) {
    throw new Error('PostgreSQL webhook replay storage is not fully installed')
  }
}

function normalizePolicyExpression(expression: string | null): string {
  return (expression ?? '')
    .replace(/::text/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\((tenant_isolation_quarantined = false)\)/g, '$1')
    .replace(
      /\((tenant_id = NULLIF\(current_setting\('cvg\.tenant_id', true\), ''\))\)/g,
      '$1'
    )
    .replace(/^\((.*)\)$/, '$1')
}
