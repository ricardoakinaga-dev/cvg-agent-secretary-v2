-- AUD20-16: minimize mature inbound tombstones without deleting replay identity.
--
-- Expand/forward compatible: old writers may continue supplying resource_id;
-- the unique (tenant_id, key) identity and tombstone digest remain durable.

ALTER TABLE idempotency
  ALTER COLUMN resource_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS tombstone_minimized_at timestamptz,
  ADD COLUMN IF NOT EXISTS tombstone_policy_version text;

ALTER TABLE idempotency
  DROP CONSTRAINT IF EXISTS idempotency_tombstone_shape;

ALTER TABLE idempotency
  ADD CONSTRAINT idempotency_tombstone_shape CHECK (
    (
      tombstone_digest IS NULL
      AND tombstoned_at IS NULL
      AND tombstone_minimized_at IS NULL
      AND tombstone_policy_version IS NULL
      AND resource_id IS NOT NULL
    )
    OR (
      tombstone_digest ~ '^[0-9a-f]{64}$'
      AND tombstoned_at IS NOT NULL
      AND (
        (
          resource_id IS NOT NULL
          AND tombstone_minimized_at IS NULL
          AND tombstone_policy_version IS NULL
        )
        OR (
          resource_id IS NULL
          AND tombstone_minimized_at IS NOT NULL
          AND tombstone_policy_version = 'AUD20-16-LIFECYCLE-v1'
        )
      )
    )
  );

CREATE INDEX IF NOT EXISTS idx_idempotency_tombstone_minimization
  ON idempotency (tenant_id, tombstoned_at, key)
  WHERE tombstone_digest IS NOT NULL AND resource_id IS NOT NULL;

COMMENT ON COLUMN idempotency.tombstone_minimized_at IS
  'Controlled time at which the opaque resource reference was removed after the approved post-tombstone horizon.';
COMMENT ON COLUMN idempotency.tombstone_policy_version IS
  'Approved lifecycle policy version used for tombstone minimization.';

-- Serialize hold changes with inbound tombstone minimization. The minimizer
-- takes the same tenant/target advisory lock before selecting candidates.
CREATE OR REPLACE FUNCTION lock_inbound_retention_hold_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  affected_tenant text;
  affected_target text;
BEGIN
  affected_tenant := COALESCE(NEW.tenant_id, OLD.tenant_id);
  affected_target := COALESCE(NEW.target_id, OLD.target_id);
  IF affected_target = 'inbound_idempotency' THEN
    PERFORM pg_advisory_xact_lock(
      hashtext('AUD20-16:inbound_idempotency'),
      hashtext(affected_tenant)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END
$$;

DROP TRIGGER IF EXISTS retention_holds_inbound_lifecycle_lock
  ON retention_holds;
CREATE TRIGGER retention_holds_inbound_lifecycle_lock
BEFORE INSERT OR UPDATE OR DELETE ON retention_holds
FOR EACH ROW EXECUTE FUNCTION lock_inbound_retention_hold_change();
