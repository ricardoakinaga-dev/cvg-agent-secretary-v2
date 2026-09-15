-- AAA-21: durable Goal/Plan/Step orchestration state.
--
-- Every table is tenant scoped and carries the state required to resume a
-- bounded execution after a worker restart. Attempts, observations and
-- evaluations are append-only ledgers; current goal/plan/step rows use
-- optimistic versions and claim-level fencing tokens.

CREATE TABLE IF NOT EXISTS orchestrator_goals (
  tenant_id text NOT NULL,
  id text NOT NULL,
  session_id text,
  conversation_id text,
  objective text NOT NULL CHECK (length(objective) BETWEEN 1 AND 8000),
  success_criteria jsonb NOT NULL CHECK (jsonb_typeof(success_criteria) = 'array'),
  status text NOT NULL CHECK (status IN (
    'OBSERVING', 'UNDERSTANDING', 'PLANNING', 'GOVERNING',
    'WAITING_APPROVAL', 'EXECUTING', 'OBSERVING_RESULT', 'EVALUATING',
    'REPLANNING', 'WAITING_EXTERNAL', 'HUMAN_HANDOFF', 'PENDING_RETURN',
    'UNCERTAIN', 'COMPLETED', 'BLOCKED', 'FAILED', 'CANCELLED',
    'BUDGET_EXHAUSTED', 'LOOP_DETECTED'
  )),
  budget jsonb NOT NULL CHECK (jsonb_typeof(budget) = 'object'),
  budget_usage jsonb NOT NULL CHECK (jsonb_typeof(budget_usage) = 'object'),
  deadline timestamptz,
  correlation_id text NOT NULL,
  active_plan_id text,
  execution_snapshot jsonb NOT NULL CHECK (jsonb_typeof(execution_snapshot) = 'object'),
  replan_fingerprints jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(replan_fingerprints) = 'array'),
  last_reason text,
  last_error text,
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS orchestrator_plans (
  tenant_id text NOT NULL,
  id text NOT NULL,
  goal_id text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  parent_plan_id text,
  reason text NOT NULL CHECK (length(reason) BETWEEN 1 AND 8000),
  status text NOT NULL CHECK (status IN ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'COMPLETED', 'FAILED')),
  fingerprint text NOT NULL CHECK (fingerprint ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, goal_id, version),
  FOREIGN KEY (tenant_id, goal_id)
    REFERENCES orchestrator_goals (tenant_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, parent_plan_id)
    REFERENCES orchestrator_plans (tenant_id, id)
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS orchestrator_steps (
  tenant_id text NOT NULL,
  id text NOT NULL,
  goal_id text NOT NULL,
  plan_id text NOT NULL,
  type text NOT NULL CHECK (length(type) BETWEEN 1 AND 200),
  description text NOT NULL CHECK (length(description) BETWEEN 1 AND 8000),
  dependencies jsonb NOT NULL CHECK (jsonb_typeof(dependencies) = 'array'),
  required_capabilities jsonb NOT NULL CHECK (jsonb_typeof(required_capabilities) = 'array'),
  risk_level text NOT NULL CHECK (risk_level IN (
    'READ_ONLY', 'LOW_RISK_WRITE', 'MEDIUM_RISK_WRITE', 'HIGH_RISK_WRITE', 'ADMIN'
  )),
  approval_requirement text NOT NULL CHECK (approval_requirement IN ('none', 'approval', 'human_handoff')),
  status text NOT NULL CHECK (status IN (
    'PENDING', 'READY', 'EXECUTING', 'WAITING_APPROVAL', 'WAITING_EXTERNAL',
    'HUMAN_HANDOFF', 'UNCERTAIN', 'SUCCEEDED', 'FAILED', 'BLOCKED',
    'CANCELLED', 'SKIPPED'
  )),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  input jsonb,
  input_hash text NOT NULL CHECK (input_hash ~ '^[0-9a-f]{64}$'),
  expected_outcome jsonb,
  timeout_ms integer NOT NULL CHECK (timeout_ms >= 100),
  intent jsonb NOT NULL CHECK (jsonb_typeof(intent) = 'object'),
  approval_id text,
  tool_id text,
  tool_version text,
  result_hash text,
  last_error text,
  started_at timestamptz,
  completed_at timestamptz,
  lease_owner text,
  lease_token text,
  lease_until timestamptz,
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, goal_id)
    REFERENCES orchestrator_goals (tenant_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, plan_id)
    REFERENCES orchestrator_plans (tenant_id, id)
    ON DELETE CASCADE,
  CHECK (
    (status <> 'EXECUTING')
    OR (lease_owner IS NOT NULL AND lease_token IS NOT NULL AND lease_until IS NOT NULL)
  ),
  CHECK (
    (lease_owner IS NULL AND lease_token IS NULL AND lease_until IS NULL)
    OR (lease_owner IS NOT NULL AND lease_token IS NOT NULL AND lease_until IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS orchestrator_attempts (
  tenant_id text NOT NULL,
  id text NOT NULL,
  goal_id text NOT NULL,
  plan_id text NOT NULL,
  step_id text NOT NULL,
  worker_id text NOT NULL,
  lease_token text NOT NULL,
  started_at timestamptz NOT NULL,
  finished_at timestamptz,
  outcome text,
  error_class text,
  correlation_id text NOT NULL,
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, goal_id)
    REFERENCES orchestrator_goals (tenant_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, plan_id)
    REFERENCES orchestrator_plans (tenant_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, step_id)
    REFERENCES orchestrator_steps (tenant_id, id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orchestrator_observations (
  tenant_id text NOT NULL,
  id text NOT NULL,
  goal_id text NOT NULL,
  plan_id text NOT NULL,
  step_id text,
  kind text NOT NULL CHECK (kind IN ('step_result', 'external_state', 'reconciliation')),
  result_digest text,
  evidence jsonb NOT NULL CHECK (jsonb_typeof(evidence) = 'array'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, goal_id)
    REFERENCES orchestrator_goals (tenant_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, plan_id)
    REFERENCES orchestrator_plans (tenant_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, step_id)
    REFERENCES orchestrator_steps (tenant_id, id)
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS orchestrator_evaluations (
  tenant_id text NOT NULL,
  id text NOT NULL,
  goal_id text NOT NULL,
  plan_id text NOT NULL,
  step_id text,
  evaluator_type text NOT NULL,
  criteria jsonb NOT NULL CHECK (jsonb_typeof(criteria) = 'array'),
  evidence jsonb NOT NULL CHECK (jsonb_typeof(evidence) = 'array'),
  result text NOT NULL CHECK (result IN ('satisfied', 'not_satisfied', 'unknown', 'blocked')),
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, goal_id)
    REFERENCES orchestrator_goals (tenant_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, plan_id)
    REFERENCES orchestrator_plans (tenant_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, step_id)
    REFERENCES orchestrator_steps (tenant_id, id)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_orchestrator_goals_runnable
  ON orchestrator_goals (tenant_id, status, updated_at);
CREATE INDEX IF NOT EXISTS idx_orchestrator_goals_correlation
  ON orchestrator_goals (tenant_id, correlation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orchestrator_plans_goal_version
  ON orchestrator_plans (tenant_id, goal_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_orchestrator_steps_ready
  ON orchestrator_steps (tenant_id, plan_id, status, updated_at);
CREATE INDEX IF NOT EXISTS idx_orchestrator_steps_expired_lease
  ON orchestrator_steps (tenant_id, lease_until)
  WHERE lease_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orchestrator_attempts_step
  ON orchestrator_attempts (tenant_id, step_id, started_at);
CREATE INDEX IF NOT EXISTS idx_orchestrator_observations_goal
  ON orchestrator_observations (tenant_id, goal_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orchestrator_evaluations_goal
  ON orchestrator_evaluations (tenant_id, goal_id, created_at);

ALTER TABLE orchestrator_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchestrator_goals FORCE ROW LEVEL SECURITY;
ALTER TABLE orchestrator_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchestrator_plans FORCE ROW LEVEL SECURITY;
ALTER TABLE orchestrator_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchestrator_steps FORCE ROW LEVEL SECURITY;
ALTER TABLE orchestrator_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchestrator_attempts FORCE ROW LEVEL SECURITY;
ALTER TABLE orchestrator_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchestrator_observations FORCE ROW LEVEL SECURITY;
ALTER TABLE orchestrator_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchestrator_evaluations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orchestrator_goals_tenant_isolation ON orchestrator_goals;
CREATE POLICY orchestrator_goals_tenant_isolation ON orchestrator_goals
  USING (tenant_id = NULLIF(current_setting('cvg.tenant_id', true), ''))
  WITH CHECK (tenant_id = NULLIF(current_setting('cvg.tenant_id', true), ''));
DROP POLICY IF EXISTS orchestrator_plans_tenant_isolation ON orchestrator_plans;
CREATE POLICY orchestrator_plans_tenant_isolation ON orchestrator_plans
  USING (tenant_id = NULLIF(current_setting('cvg.tenant_id', true), ''))
  WITH CHECK (tenant_id = NULLIF(current_setting('cvg.tenant_id', true), ''));
DROP POLICY IF EXISTS orchestrator_steps_tenant_isolation ON orchestrator_steps;
CREATE POLICY orchestrator_steps_tenant_isolation ON orchestrator_steps
  USING (tenant_id = NULLIF(current_setting('cvg.tenant_id', true), ''))
  WITH CHECK (tenant_id = NULLIF(current_setting('cvg.tenant_id', true), ''));
DROP POLICY IF EXISTS orchestrator_attempts_tenant_isolation ON orchestrator_attempts;
CREATE POLICY orchestrator_attempts_tenant_isolation ON orchestrator_attempts
  USING (tenant_id = NULLIF(current_setting('cvg.tenant_id', true), ''))
  WITH CHECK (tenant_id = NULLIF(current_setting('cvg.tenant_id', true), ''));
DROP POLICY IF EXISTS orchestrator_observations_tenant_isolation ON orchestrator_observations;
CREATE POLICY orchestrator_observations_tenant_isolation ON orchestrator_observations
  USING (tenant_id = NULLIF(current_setting('cvg.tenant_id', true), ''))
  WITH CHECK (tenant_id = NULLIF(current_setting('cvg.tenant_id', true), ''));
DROP POLICY IF EXISTS orchestrator_evaluations_tenant_isolation ON orchestrator_evaluations;
CREATE POLICY orchestrator_evaluations_tenant_isolation ON orchestrator_evaluations
  USING (tenant_id = NULLIF(current_setting('cvg.tenant_id', true), ''))
  WITH CHECK (tenant_id = NULLIF(current_setting('cvg.tenant_id', true), ''));

REVOKE ALL ON orchestrator_goals FROM PUBLIC;
REVOKE ALL ON orchestrator_plans FROM PUBLIC;
REVOKE ALL ON orchestrator_steps FROM PUBLIC;
REVOKE ALL ON orchestrator_attempts FROM PUBLIC;
REVOKE ALL ON orchestrator_observations FROM PUBLIC;
REVOKE ALL ON orchestrator_evaluations FROM PUBLIC;

COMMENT ON TABLE orchestrator_goals IS
  'Tenant-scoped durable Goal state machine with versioned budget and active plan lineage.';
COMMENT ON TABLE orchestrator_plans IS
  'Versioned tenant-scoped DAG plans. Superseded plans remain for audit and recovery.';
COMMENT ON TABLE orchestrator_steps IS
  'Tenant-scoped executable plan steps with claim-level fencing lease tokens.';
COMMENT ON TABLE orchestrator_attempts IS
  'Append-only execution attempts; restart recovery never overwrites history.';
COMMENT ON TABLE orchestrator_observations IS
  'Operational observations used by deterministic evaluators; model statements are not facts.';
COMMENT ON TABLE orchestrator_evaluations IS
  'Append-only success-criteria evaluations with evidence references.';
