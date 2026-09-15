-- AAA-21 hardening: bind orchestration evidence and effects to one Goal graph.
-- The columns are nullable for pre-AAA-21 rows; every new durable kernel turn
-- supplies lineage, while legacy records remain queryable and fail closed when
-- a caller needs to resume them without an identity.

UPDATE orchestrator_goals
   SET deadline = created_at + ((budget->>'maxDurationMs')::bigint * interval '1 millisecond')
 WHERE deadline IS NULL
   AND budget ? 'maxDurationMs'
   AND (budget->>'maxDurationMs') ~ '^[0-9]+$';

ALTER TABLE orchestrator_goals
  ADD COLUMN IF NOT EXISTS planner_context jsonb;

ALTER TABLE effect_journal
  ADD COLUMN IF NOT EXISTS orchestration_goal_id text,
  ADD COLUMN IF NOT EXISTS orchestration_plan_id text,
  ADD COLUMN IF NOT EXISTS orchestration_step_id text,
  ADD COLUMN IF NOT EXISTS orchestration_attempt_id text;

ALTER TABLE outbox_events
  ADD COLUMN IF NOT EXISTS orchestration_goal_id text,
  ADD COLUMN IF NOT EXISTS orchestration_plan_id text,
  ADD COLUMN IF NOT EXISTS orchestration_step_id text,
  ADD COLUMN IF NOT EXISTS orchestration_attempt_id text;

CREATE INDEX IF NOT EXISTS idx_effect_journal_orchestration_lineage
  ON effect_journal (
    tenant_id,
    orchestration_goal_id,
    orchestration_plan_id,
    orchestration_step_id
  );

CREATE INDEX IF NOT EXISTS idx_outbox_events_orchestration_lineage
  ON outbox_events (
    tenant_id,
    orchestration_goal_id,
    orchestration_plan_id,
    orchestration_step_id
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'orchestrator_plans_tenant_id_id_goal_id_key'
  ) THEN
    ALTER TABLE orchestrator_plans
      ADD CONSTRAINT orchestrator_plans_tenant_id_id_goal_id_key
      UNIQUE (tenant_id, id, goal_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'orchestrator_steps_tenant_id_id_goal_plan_key'
  ) THEN
    ALTER TABLE orchestrator_steps
      ADD CONSTRAINT orchestrator_steps_tenant_id_id_goal_plan_key
      UNIQUE (tenant_id, id, goal_id, plan_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'orchestrator_steps_goal_plan_lineage_fk'
  ) THEN
    ALTER TABLE orchestrator_steps
      ADD CONSTRAINT orchestrator_steps_goal_plan_lineage_fk
      FOREIGN KEY (tenant_id, plan_id, goal_id)
      REFERENCES orchestrator_plans (tenant_id, id, goal_id)
      ON DELETE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'orchestrator_observations_plan_goal_lineage_fk'
  ) THEN
    ALTER TABLE orchestrator_observations
      ADD CONSTRAINT orchestrator_observations_plan_goal_lineage_fk
      FOREIGN KEY (tenant_id, plan_id, goal_id)
      REFERENCES orchestrator_plans (tenant_id, id, goal_id)
      ON DELETE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'orchestrator_observations_step_lineage_fk'
  ) THEN
    ALTER TABLE orchestrator_observations
      ADD CONSTRAINT orchestrator_observations_step_lineage_fk
      FOREIGN KEY (tenant_id, step_id, goal_id, plan_id)
      REFERENCES orchestrator_steps (tenant_id, id, goal_id, plan_id)
      ON DELETE RESTRICT NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'orchestrator_evaluations_plan_goal_lineage_fk'
  ) THEN
    ALTER TABLE orchestrator_evaluations
      ADD CONSTRAINT orchestrator_evaluations_plan_goal_lineage_fk
      FOREIGN KEY (tenant_id, plan_id, goal_id)
      REFERENCES orchestrator_plans (tenant_id, id, goal_id)
      ON DELETE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'orchestrator_evaluations_step_lineage_fk'
  ) THEN
    ALTER TABLE orchestrator_evaluations
      ADD CONSTRAINT orchestrator_evaluations_step_lineage_fk
      FOREIGN KEY (tenant_id, step_id, goal_id, plan_id)
      REFERENCES orchestrator_steps (tenant_id, id, goal_id, plan_id)
      ON DELETE RESTRICT NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'orchestrator_attempts_tenant_id_id_lineage_key'
  ) THEN
    ALTER TABLE orchestrator_attempts
      ADD CONSTRAINT orchestrator_attempts_tenant_id_id_lineage_key
      UNIQUE (tenant_id, id, goal_id, plan_id, step_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'orchestrator_attempts_plan_goal_lineage_fk'
  ) THEN
    ALTER TABLE orchestrator_attempts
      ADD CONSTRAINT orchestrator_attempts_plan_goal_lineage_fk
      FOREIGN KEY (tenant_id, plan_id, goal_id)
      REFERENCES orchestrator_plans (tenant_id, id, goal_id)
      ON DELETE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'orchestrator_attempts_step_lineage_fk'
  ) THEN
    ALTER TABLE orchestrator_attempts
      ADD CONSTRAINT orchestrator_attempts_step_lineage_fk
      FOREIGN KEY (tenant_id, step_id, goal_id, plan_id)
      REFERENCES orchestrator_steps (tenant_id, id, goal_id, plan_id)
      ON DELETE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'effect_journal_orchestration_lineage_check'
  ) THEN
    ALTER TABLE effect_journal
      ADD CONSTRAINT effect_journal_orchestration_lineage_check
      CHECK (
        (
          orchestration_goal_id IS NULL
          AND orchestration_plan_id IS NULL
          AND orchestration_step_id IS NULL
          AND orchestration_attempt_id IS NULL
        )
        OR (
          orchestration_goal_id IS NOT NULL
          AND orchestration_plan_id IS NOT NULL
          AND orchestration_step_id IS NOT NULL
        )
      ) NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'effect_journal_orchestration_step_lineage_fk'
  ) THEN
    ALTER TABLE effect_journal
      ADD CONSTRAINT effect_journal_orchestration_step_lineage_fk
      FOREIGN KEY (
        tenant_id,
        orchestration_step_id,
        orchestration_goal_id,
        orchestration_plan_id
      )
      REFERENCES orchestrator_steps (tenant_id, id, goal_id, plan_id)
      ON DELETE RESTRICT NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'effect_journal_orchestration_attempt_lineage_fk'
  ) THEN
    ALTER TABLE effect_journal
      ADD CONSTRAINT effect_journal_orchestration_attempt_lineage_fk
      FOREIGN KEY (
        tenant_id,
        orchestration_attempt_id,
        orchestration_goal_id,
        orchestration_plan_id,
        orchestration_step_id
      )
      REFERENCES orchestrator_attempts (tenant_id, id, goal_id, plan_id, step_id)
      ON DELETE RESTRICT NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'outbox_events_orchestration_lineage_check'
  ) THEN
    ALTER TABLE outbox_events
      ADD CONSTRAINT outbox_events_orchestration_lineage_check
      CHECK (
        (
          orchestration_goal_id IS NULL
          AND orchestration_plan_id IS NULL
          AND orchestration_step_id IS NULL
          AND orchestration_attempt_id IS NULL
        )
        OR (
          orchestration_goal_id IS NOT NULL
          AND orchestration_plan_id IS NOT NULL
          AND orchestration_step_id IS NOT NULL
        )
      ) NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'outbox_events_orchestration_step_lineage_fk'
  ) THEN
    ALTER TABLE outbox_events
      ADD CONSTRAINT outbox_events_orchestration_step_lineage_fk
      FOREIGN KEY (
        tenant_id,
        orchestration_step_id,
        orchestration_goal_id,
        orchestration_plan_id
      )
      REFERENCES orchestrator_steps (tenant_id, id, goal_id, plan_id)
      ON DELETE RESTRICT NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'outbox_events_orchestration_attempt_lineage_fk'
  ) THEN
    ALTER TABLE outbox_events
      ADD CONSTRAINT outbox_events_orchestration_attempt_lineage_fk
      FOREIGN KEY (
        tenant_id,
        orchestration_attempt_id,
        orchestration_goal_id,
        orchestration_plan_id,
        orchestration_step_id
      )
      REFERENCES orchestrator_attempts (tenant_id, id, goal_id, plan_id, step_id)
      ON DELETE RESTRICT NOT VALID;
  END IF;
END $$;

COMMENT ON COLUMN effect_journal.orchestration_goal_id IS
  'Durable Goal lineage for a governed effect; nullable only for legacy turns.';
COMMENT ON COLUMN outbox_events.orchestration_goal_id IS
  'Durable Goal lineage for an outbound event; nullable only for legacy events.';
