-- AUD20-04: forward-only ledger fields for bounded retention batches.
--
-- This migration does not rewrite or remove prior ledger evidence. Existing
-- rows are backfilled with zero because they predate per-batch accounting.

ALTER TABLE retention_erasure_ledger
  ADD COLUMN IF NOT EXISTS tombstoned_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS batch_number integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'retention_erasure_ledger_tombstoned_count_check'
       AND conrelid = 'retention_erasure_ledger'::regclass
  ) THEN
    ALTER TABLE retention_erasure_ledger
      ADD CONSTRAINT retention_erasure_ledger_tombstoned_count_check
      CHECK (tombstoned_count >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'retention_erasure_ledger_batch_number_check'
       AND conrelid = 'retention_erasure_ledger'::regclass
  ) THEN
    ALTER TABLE retention_erasure_ledger
      ADD CONSTRAINT retention_erasure_ledger_batch_number_check
      CHECK (
        (outcome = 'EXECUTED' AND batch_number >= 0)
        OR (outcome <> 'EXECUTED' AND batch_number = 0)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'retention_erasure_ledger_skip_tombstone_check'
       AND conrelid = 'retention_erasure_ledger'::regclass
  ) THEN
    ALTER TABLE retention_erasure_ledger
      ADD CONSTRAINT retention_erasure_ledger_skip_tombstone_check
      CHECK (outcome = 'EXECUTED' OR tombstoned_count = 0);
  END IF;
END
$$;

COMMENT ON COLUMN retention_erasure_ledger.tombstoned_count IS
  'Inbound identity rows transitioned to a tombstone; never a physical delete.';
COMMENT ON COLUMN retention_erasure_ledger.batch_number IS
  'One-based retention transaction ordinal for new sweeps; zero is retained for skipped or legacy entries.';
