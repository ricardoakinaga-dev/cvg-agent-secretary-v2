-- AAA-21: claim-level fencing for durable outbox settlement.
--
-- A worker id is an identity label, not a unique process incarnation. Every
-- claim therefore receives a fresh token so a stale worker cannot settle a
-- later claim after a lease takeover, even when the worker id is reused.

ALTER TABLE outbox_events
  ADD COLUMN IF NOT EXISTS lease_token text;

UPDATE outbox_events
SET lease_token = 'lease_' || md5(
  id || ':' || COALESCE(lease_owner, '') || ':' || COALESCE(lease_until::text, '')
)
WHERE status = 'processing'
  AND lease_token IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE connamespace = current_schema()::regnamespace
      AND conname = 'outbox_events_processing_fencing_check'
  ) THEN
    ALTER TABLE outbox_events
      ADD CONSTRAINT outbox_events_processing_fencing_check
      CHECK (
        status <> 'processing'
        OR (
          lease_owner IS NOT NULL
          AND lease_until IS NOT NULL
          AND lease_token IS NOT NULL
        )
      ) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_outbox_events_tenant_lease_token
  ON outbox_events (tenant_id, id, lease_token)
  WHERE status = 'processing';

COMMENT ON COLUMN outbox_events.lease_token IS
  'Unique claim-level fencing token. Required for heartbeat, ack and fail settlement.';
