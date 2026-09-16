-- AAA-21 hardening: make the orchestration loop budget explicit and durable.
-- Existing rows are upgraded in place; the runtime also defaults defensively
-- when reading a row created before this migration.

UPDATE orchestrator_goals
   SET budget = budget || '{"maxIterations": 256}'::jsonb
 WHERE NOT (budget ? 'maxIterations');

UPDATE orchestrator_goals
   SET budget_usage = budget_usage || '{"iterations": 0}'::jsonb
 WHERE NOT (budget_usage ? 'iterations');

COMMENT ON COLUMN orchestrator_goals.budget IS
  'Immutable execution limits, including maxIterations for a restart-safe loop guard.';
COMMENT ON COLUMN orchestrator_goals.budget_usage IS
  'Atomically consumed execution usage, including iterations across worker restarts.';
