-- Phase 11.2: make the evaluation that triggered a replan explicit.
-- Nullable keeps historical plans readable; new replans persist the source
-- evaluation in the same transaction as the new plan.

ALTER TABLE orchestrator_plans
  ADD COLUMN IF NOT EXISTS triggering_evaluation_id text;

CREATE INDEX IF NOT EXISTS idx_orchestrator_plans_triggering_evaluation
  ON orchestrator_plans (tenant_id, triggering_evaluation_id)
  WHERE triggering_evaluation_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'orchestrator_plans_triggering_evaluation_fk'
  ) THEN
    ALTER TABLE orchestrator_plans
      ADD CONSTRAINT orchestrator_plans_triggering_evaluation_fk
      FOREIGN KEY (tenant_id, triggering_evaluation_id)
      REFERENCES orchestrator_evaluations (tenant_id, id)
      ON DELETE RESTRICT
      NOT VALID;
  END IF;
END $$;
