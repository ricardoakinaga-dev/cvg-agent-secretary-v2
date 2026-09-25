# AUD20-04 v2 — rollback/restart report — 2026-09-21

The disposable PostgreSQL evidence covers three rollback boundaries:

1. a ledger trigger raises after an inbound batch mutation; the transaction
   rolls back and the selected row remains without a tombstone;
2. removing the trigger and rerunning commits the tombstone;
3. a run capped at `maxBatches=1` commits only its first batch, reports
   `complete=false`, and a later run converges the remaining rows without
   recreating a processing identity.

The concurrent two-sweeper fixture uses two pool connections and
`FOR UPDATE SKIP LOCKED`; the sum of tombstone transitions equals the number
of synthetic rows and no row receives a second transition.

Schema rollback is not destructive. `0028_retention_batch_semantics.sql` is a
forward-only additive migration with checksum tracking. The supported recovery
path is a forward fix or rerun after the blocking condition is corrected; it is
not deletion of the tombstone columns or ledger evidence.

Current bound source log: `AUD20-04-raw/retention-focused-20260921T1828Z.log`.

The current candidate receipt binds this report to candidate
`ea348cec64a8a77b36418ef358315bc8d044181720968fc05934b6441507121b`; older
`1725Z` reports are historical evidence and are not used by the current
criteria matrix or raw-artifact receipt.
