-- AUD20-04 / P1-DATA-01: preserve inbound identity after retention.
--
-- Additive only. Retention transitions an expired inbound reservation into a
-- tenant-scoped tombstone instead of deleting its primary-key identity. The
-- original resource reference remains opaque and is not used to recreate work.

ALTER TABLE idempotency
  ADD COLUMN IF NOT EXISTS tombstone_digest text,
  ADD COLUMN IF NOT EXISTS tombstoned_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE connamespace = current_schema()::regnamespace
       AND conname = 'idempotency_tombstone_shape'
  ) THEN
    ALTER TABLE idempotency
      ADD CONSTRAINT idempotency_tombstone_shape CHECK (
        (tombstone_digest IS NULL AND tombstoned_at IS NULL)
        OR (
          tombstone_digest ~ '^[0-9a-f]{64}$'
          AND tombstoned_at IS NOT NULL
        )
      );
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_idempotency_tombstoned
  ON idempotency (tenant_id, tombstoned_at)
  WHERE tombstone_digest IS NOT NULL;

COMMENT ON COLUMN idempotency.tombstone_digest IS
  'SHA-256 digest of tenant-scoped inbound identity retained after TTL; it prevents the same primary key from being recreated.';
COMMENT ON COLUMN idempotency.tombstoned_at IS
  'Controlled retention time at which the inbound idempotency reservation became a tombstone.';
