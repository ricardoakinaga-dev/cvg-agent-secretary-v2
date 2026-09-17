-- AUD17-04: bind a replan to the exact Goal/parent-Plan evaluation lineage.
-- Historical rows remain readable; new rows are fenced by the runtime checks
-- and by this composite foreign key for every non-null replan source.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'orchestrator_evaluations_tenant_id_id_goal_id_plan_id_key'
  ) THEN
    ALTER TABLE orchestrator_evaluations
      ADD CONSTRAINT orchestrator_evaluations_tenant_id_id_goal_id_plan_id_key
      UNIQUE (tenant_id, id, goal_id, plan_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'orchestrator_plans_replan_source_pair_check'
  ) THEN
    ALTER TABLE orchestrator_plans
      ADD CONSTRAINT orchestrator_plans_replan_source_pair_check
      CHECK (
        (triggering_evaluation_id IS NULL AND parent_plan_id IS NULL)
        OR (triggering_evaluation_id IS NOT NULL AND parent_plan_id IS NOT NULL)
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'orchestrator_plans_replan_source_lineage_fk'
  ) THEN
    ALTER TABLE orchestrator_plans
      ADD CONSTRAINT orchestrator_plans_replan_source_lineage_fk
      FOREIGN KEY (
        tenant_id,
        triggering_evaluation_id,
        goal_id,
        parent_plan_id
      )
      REFERENCES orchestrator_evaluations (tenant_id, id, goal_id, plan_id)
      ON DELETE RESTRICT NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orchestrator_evaluations_lineage
  ON orchestrator_evaluations (tenant_id, id, goal_id, plan_id);

-- Do not leave legacy lineage constraints in the NOT VALID state. Validation
-- is deliberately part of this controlled roll-forward: an inconsistent
-- historical row aborts the migration instead of silently widening the
-- runtime trust boundary.
DO $$
DECLARE
  constraint_row record;
BEGIN
  FOR constraint_row IN
    SELECT *
      FROM (VALUES
        ('orchestrator_steps', 'orchestrator_steps_goal_plan_lineage_fk'),
        ('orchestrator_observations', 'orchestrator_observations_plan_goal_lineage_fk'),
        ('orchestrator_observations', 'orchestrator_observations_step_lineage_fk'),
        ('orchestrator_evaluations', 'orchestrator_evaluations_plan_goal_lineage_fk'),
        ('orchestrator_evaluations', 'orchestrator_evaluations_step_lineage_fk'),
        ('orchestrator_attempts', 'orchestrator_attempts_plan_goal_lineage_fk'),
        ('orchestrator_attempts', 'orchestrator_attempts_step_lineage_fk'),
        ('effect_journal', 'effect_journal_orchestration_lineage_check'),
        ('effect_journal', 'effect_journal_orchestration_step_lineage_fk'),
        ('effect_journal', 'effect_journal_orchestration_attempt_lineage_fk'),
        ('outbox_events', 'outbox_events_orchestration_lineage_check'),
        ('outbox_events', 'outbox_events_orchestration_step_lineage_fk'),
        ('outbox_events', 'outbox_events_orchestration_attempt_lineage_fk'),
        ('orchestrator_plans', 'orchestrator_plans_triggering_evaluation_fk'),
        ('orchestrator_plans', 'orchestrator_plans_replan_source_pair_check'),
        ('orchestrator_plans', 'orchestrator_plans_replan_source_lineage_fk')
      ) AS required(table_name, constraint_name)
  LOOP
    IF EXISTS (
      SELECT 1
        FROM pg_constraint
       WHERE conname = constraint_row.constraint_name
         AND conrelid = constraint_row.table_name::regclass
         AND NOT convalidated
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I VALIDATE CONSTRAINT %I',
        constraint_row.table_name,
        constraint_row.constraint_name
      );
    END IF;
  END LOOP;
END $$;
