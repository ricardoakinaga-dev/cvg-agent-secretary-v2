-- AUD19-05 / P1-DATA-01: retention holds and erasure audit ledger.
--
-- Additive only. `retention_holds` records explicit, approved legal holds that
-- the manual retention sweep must preserve. `retention_erasure_ledger` records
-- metadata about each sweep outcome (target, policy, window, counts and a
-- metadata-only batch hash) and never stores eliminated content. No existing
-- table, column or row is modified.

CREATE TABLE IF NOT EXISTS retention_holds (
  tenant_id text NOT NULL,
  id text NOT NULL,
  target_id text NOT NULL CHECK (length(btrim(target_id)) BETWEEN 1 AND 120),
  -- NULL protects every row of the target for the tenant; a value protects one
  -- record id (for example effect_journal.operation_key).
  record_id text,
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 1 AND 500),
  authorization_ref text NOT NULL
    CHECK (length(btrim(authorization_ref)) BETWEEN 1 AND 200),
  approved_by text NOT NULL
    CHECK (length(btrim(approved_by)) BETWEEN 1 AND 200),
  approved_at timestamptz NOT NULL,
  released_at timestamptz,
  released_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  CHECK (released_at IS NULL OR released_by IS NOT NULL),
  CHECK (released_at IS NULL OR released_at >= approved_at)
);

CREATE INDEX IF NOT EXISTS idx_retention_holds_active
  ON retention_holds (tenant_id, target_id)
  WHERE released_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_retention_holds_record
  ON retention_holds (tenant_id, target_id, record_id)
  WHERE released_at IS NULL;

CREATE TABLE IF NOT EXISTS retention_erasure_ledger (
  tenant_id text NOT NULL,
  id text NOT NULL,
  target_id text NOT NULL CHECK (length(btrim(target_id)) BETWEEN 1 AND 120),
  classification text NOT NULL CHECK (classification IN
    ('PUBLIC','INTERNAL','CONFIDENTIAL','CLINICAL','FINANCIAL','CREDENTIAL')),
  action text NOT NULL CHECK (action IN ('delete', 'redact', 'none')),
  outcome text NOT NULL CHECK (outcome IN
    ('EXECUTED','SKIPPED_NO_POLICY','SKIPPED_INVALID_HOLD')),
  reason text,
  policy_id text,
  policy_ref text,
  policy_approved_by text,
  policy_approved_at timestamptz,
  -- Effective elimination window `[window_start, window_end)`; skipped
  -- outcomes use the execution instant for both bounds and count nothing.
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  deleted_count integer NOT NULL DEFAULT 0 CHECK (deleted_count >= 0),
  redacted_count integer NOT NULL DEFAULT 0 CHECK (redacted_count >= 0),
  preserved_hold_count integer NOT NULL DEFAULT 0
    CHECK (preserved_hold_count >= 0),
  -- Digest of sweep metadata only; deleted/redacted content is never stored.
  batch_hash text NOT NULL CHECK (batch_hash ~ '^[0-9a-f]{64}$'),
  executed_by text NOT NULL
    CHECK (length(btrim(executed_by)) BETWEEN 1 AND 200),
  executed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  CHECK (
    (outcome = 'EXECUTED'
      AND action IN ('delete', 'redact')
      AND policy_id IS NOT NULL
      AND policy_ref IS NOT NULL
      AND policy_approved_by IS NOT NULL
      AND policy_approved_at IS NOT NULL)
    OR
    (outcome <> 'EXECUTED'
      AND action = 'none'
      AND policy_id IS NULL
      AND policy_ref IS NULL
      AND policy_approved_by IS NULL
      AND policy_approved_at IS NULL
      AND deleted_count = 0
      AND redacted_count = 0
      AND reason IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_retention_erasure_ledger_target
  ON retention_erasure_ledger (tenant_id, target_id, executed_at DESC);

ALTER TABLE retention_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_holds FORCE ROW LEVEL SECURITY;
ALTER TABLE retention_erasure_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_erasure_ledger FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS retention_holds_tenant_isolation ON retention_holds;
CREATE POLICY retention_holds_tenant_isolation ON retention_holds
  USING (tenant_id = NULLIF(current_setting('cvg.tenant_id', true), ''))
  WITH CHECK (tenant_id = NULLIF(current_setting('cvg.tenant_id', true), ''));

DROP POLICY IF EXISTS retention_erasure_ledger_tenant_isolation
  ON retention_erasure_ledger;
CREATE POLICY retention_erasure_ledger_tenant_isolation
  ON retention_erasure_ledger
  USING (tenant_id = NULLIF(current_setting('cvg.tenant_id', true), ''))
  WITH CHECK (tenant_id = NULLIF(current_setting('cvg.tenant_id', true), ''));

REVOKE ALL ON retention_holds FROM PUBLIC;
REVOKE ALL ON retention_erasure_ledger FROM PUBLIC;

COMMENT ON TABLE retention_holds IS
  'Explicit approved legal holds for the manual retention/erasure sweep. record_id NULL protects the whole target for the tenant; holds without approval metadata cannot be inserted.';
COMMENT ON TABLE retention_erasure_ledger IS
  'Append-only metadata audit of retention sweeps: target, approved policy, window, counts and metadata-only batch hash. It never stores deleted or redacted content.';
COMMENT ON COLUMN retention_erasure_ledger.batch_hash IS
  'SHA-256 of sweep metadata (tenant, target, action, policy, window, hold scope); record ids and payload content are excluded.';
COMMENT ON COLUMN retention_erasure_ledger.outcome IS
  'EXECUTED for an approved policy; SKIPPED_NO_POLICY/SKIPPED_INVALID_HOLD are fail-closed pendencies recorded for operator review.';
