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
