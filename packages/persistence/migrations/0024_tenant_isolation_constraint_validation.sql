-- AUD17-05: validate the tenant-isolation constraints installed by the
-- historical additive migrations. Existing violating rows abort this
-- roll-forward; the runtime must never widen its trust boundary silently.

DO $$
DECLARE
  constraint_row record;
BEGIN
  FOR constraint_row IN
    SELECT required.table_name, required.constraint_name
      FROM (VALUES
        ('agent_runs', 'agent_runs_tenant_id_not_null'),
        ('agent_runs', 'agent_runs_tenant_session_fk'),
        ('approval_requests', 'approval_requests_tenant_id_not_null'),
        ('approval_requests', 'approval_requests_tenant_session_fk'),
        ('audit_events', 'audit_events_tenant_id_not_null'),
        ('channel_effect_journal', 'channel_effect_journal_lease_check'),
        ('channel_effect_journal', 'channel_effect_journal_terminal_check'),
        ('effect_journal', 'effect_journal_confirmed_check'),
        ('effect_journal', 'effect_journal_reconciliation_check'),
        ('messages', 'messages_tenant_conversation_fk'),
        ('messages', 'messages_tenant_id_not_null'),
        ('outbox_attempts', 'outbox_attempts_tenant_event_fk'),
        ('outbox_effects', 'outbox_effects_tenant_event_fk'),
        ('outbox_events', 'outbox_events_attempts_check'),
        ('outbox_events', 'outbox_events_dead_letter_check'),
        ('outbox_events', 'outbox_events_failed_available_check'),
        ('outbox_events', 'outbox_events_processing_fencing_check'),
        ('outbox_events', 'outbox_events_processing_lease_check'),
        ('outbox_events', 'outbox_events_status_check'),
        ('outbox_events', 'outbox_events_tenant_id_not_null'),
        ('platform_agent_versions', 'platform_versions_tenant_agent_fk'),
        ('platform_agents', 'platform_agents_active_version_fk'),
        ('platform_execution_traces', 'platform_execution_traces_tenant_agent_version_fk'),
        ('platform_test_runs', 'platform_test_runs_tenant_agent_version_fk'),
        ('sessions', 'sessions_agent_binding_agent_fk'),
        ('sessions', 'sessions_agent_binding_pair_check'),
        ('sessions', 'sessions_agent_binding_version_fk'),
        ('sessions', 'sessions_tenant_conversation_fk'),
        ('sessions', 'sessions_tenant_id_not_null'),
        ('tasks', 'tasks_tenant_id_not_null'),
        ('tasks', 'tasks_tenant_session_fk'),
        ('tool_calls', 'tool_calls_tenant_id_not_null'),
        ('tool_calls', 'tool_calls_tenant_run_fk')
      ) AS required(table_name, constraint_name)
     WHERE EXISTS (
       SELECT 1
         FROM pg_constraint AS constraint_catalog
         JOIN pg_class AS relation_catalog
           ON relation_catalog.oid = constraint_catalog.conrelid
         JOIN pg_namespace AS namespace_catalog
           ON namespace_catalog.oid = relation_catalog.relnamespace
        WHERE namespace_catalog.nspname = current_schema()
          AND relation_catalog.relname = required.table_name
          AND constraint_catalog.conname = required.constraint_name
          AND NOT constraint_catalog.convalidated
     )
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I VALIDATE CONSTRAINT %I',
      current_schema(),
      constraint_row.table_name,
      constraint_row.constraint_name
    );
  END LOOP;
END $$;
