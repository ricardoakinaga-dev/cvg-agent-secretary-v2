-- AAA-21-EXEC-20260914: durable runtime audit chain.
--
-- The local governed runtime still computes the hash chain synchronously, but
-- this table is the PostgreSQL authority across worker processes. `event_key`
-- is a semantic idempotency key; sequence and hashes are assigned durably.

CREATE TABLE IF NOT EXISTS runtime_audit_events (
  tenant_id text NOT NULL,
  event_key text NOT NULL,
  sequence bigint NOT NULL CHECK (sequence > 0),
  previous_hash text NOT NULL CHECK (previous_hash ~ '^[0-9a-f]{64}$'),
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
  event_hash text NOT NULL CHECK (event_hash ~ '^[0-9a-f]{64}$'),
  event_id text NOT NULL,
  event_type text NOT NULL,
  actor text NOT NULL,
  correlation_id text NOT NULL,
  event_timestamp timestamptz NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, event_key),
  UNIQUE (tenant_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_runtime_audit_events_correlation
  ON runtime_audit_events (tenant_id, correlation_id, sequence);

ALTER TABLE runtime_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE runtime_audit_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS runtime_audit_events_tenant_isolation
  ON runtime_audit_events;
CREATE POLICY runtime_audit_events_tenant_isolation
  ON runtime_audit_events
  USING (tenant_id = NULLIF(current_setting('cvg.tenant_id', true), ''))
  WITH CHECK (tenant_id = NULLIF(current_setting('cvg.tenant_id', true), ''));

REVOKE ALL ON runtime_audit_events FROM PUBLIC;

COMMENT ON TABLE runtime_audit_events IS
  'Durable tenant-scoped hash chain for governed runtime evidence. Semantic event keys make worker replay idempotent; PostgreSQL assigns the global sequence.';
