# AUD20-04 v2.1 — BUILD/AUDIT local controlado — 2026-09-21

## Estado adjudicado

- task: `AUD20-04`
- execution: `CONTROLLED_LOCAL`
- engine: `BUILD -> AUDIT`
- task status: `COMPLETED` (controlled-local scope)
- local implementation verification: `PASS`
- independent critic: `PASS` (fresh-context review of the repaired candidate)
- staging: `NO_GO`
- production: `NO_GO`
- data: PostgreSQL descartável, tenants/holds/chaves sintéticos

The implementation is marked `COMPLETED` only for controlled-local scope:
technical verification is fresh and green, all mandatory criteria are PASS, and
a fresh-context independent critic accepted the repaired candidate. No receipt
is a release or deployment authorization.

## Change delivered

- retention candidates are selected in bounded ordered batches with
  `LIMIT batchSize + 1`, `ORDER BY id ASC`, `FOR UPDATE SKIP LOCKED`;
- selected IDs are mutated set-wise, including one `UNNEST` update for inbound
  tombstones instead of one update per row;
- PostgreSQL runs one tenant transaction per batch and commits that batch's
  ledger entry together with its mutation;
- `maxBatches` returns `complete=false` when a checkpoint remains;
- `deletedCount` is physical deletion only and `tombstonedCount` is a separate
  identity transition count;
- live legal-hold exclusion is rechecked in the mutation predicate;
- additive migration `0028_retention_batch_semantics.sql` persists the new
  ledger fields without editing the already-applied migration;
- migration and retention runners apply transaction-local lock and statement
  timeouts;
- the PostgreSQL regression now proves `statement_timeout` aborts the active
  batch and leaves both tombstone and inbound ledger unchanged;
- late inbound replay after a tombstone is rejected with a controlled
  `conflict` error without echoing the opaque identity.
- the candidate-bound negative harness mutates a raw log after receipt, proves
  the binding verifier rejects the mutation, and restores the original bytes;
- historical candidate `87874e...` artifacts are explicitly marked
  `HISTORICAL_STALE` and excluded from the v2.1 receipt.
- the canonical criteria matrix and current rollback report bind to the same
  candidate and current raw logs; the prior `1725Z` references are historical
  and excluded from current criteria evidence.

## Fresh verification

| Criterion | Result | Evidence |
| --- | --- | --- |
| C01 migration/checksum/shape | PASS | focused PostgreSQL suite; migration checksum log |
| C02 bounded multi-batch ordering | PASS | 5 rows at `batchSize=2` produced 3 batches |
| C03 concurrent sweepers / tenant and hold isolation | PASS | two-pool concurrency test; existing tenant/hold tests |
| C04 restart and current-batch rollback | PASS | `maxBatches=1` restart test; ledger-trigger rollback test |
| C05 late replay and count semantics | PASS | tombstone remains, `deletedCount=0`, `tombstonedCount>0`, controlled command rejection |
| C06 bounded lock and statement timeout | PASS | advisory-lock probe with `lockTimeoutMs=50` plus active-batch `statementTimeoutMs=50` rollback |
| C07 regression/static gates | PASS | focused, PostgreSQL matrix, unit, typecheck, lint, format, docs, build, audit |

Fresh command outcomes:

- focused retention: `2` files, `36` tests passed;
- inbound replay command: `1` file, `9` tests passed;
- PostgreSQL matrix: `30` files, `337` tests passed;
- full unit: `282` files passed, `12` skipped; `2179` tests passed, `188`
  conditional skips. The required AUD20-04 PostgreSQL focus had no skips;
- `docs:check`: `778` links and `578` JSON documents valid;
- `npm audit --audit-level=high`: `0` vulnerabilities;
- Node qualification: `v22.23.2` for all fresh commands.

Raw logs were closed before candidate/receipt generation in
`docs/04_audit/evidence/AUD20/AUD20-04-raw/`, including the timestamped
focused, replay, matrix, unit, static-gate, environment, migration and
negative-log logs.

## Rollback and limitations

Rollback is forward-only for schema: migration `0028` adds columns and checks;
no destructive purge, tombstone deletion, commit, push, deploy or external
effect was performed. A ledger failure aborts only the active transaction;
previously committed batches remain restartable.

Remaining limitations are material: no mutation-testing score was produced, no
representative-volume or physical backup/restore proof was run, and no
staging/production/provider, channel, RAG, real-data or human-signoff gate was
exercised. The live hold predicate is implemented and tenant/hold behavior is
covered, but a separately scheduled hold insertion between selection and
mutation is not a dedicated integration fixture. These limitations keep all
release environments `NO_GO`; they do not reopen the completed controlled-local
task.
