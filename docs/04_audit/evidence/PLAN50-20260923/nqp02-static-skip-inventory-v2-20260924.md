# NQP-02 — PostgreSQL selector and skip inventory v2

- Reviewed: `2026-09-24`; **read-only static cross-check**. No test, database,
  or service was run.
- This addendum extends [the v1 skip table](nqp02-static-skip-inventory-v1-20260924.md)
  without replacing it. All 29 source hashes in the v1 manifest still match
  the current files.
- `package.json`'s `test:postgres` selector contains **30 test files**. It
  selects all 29 conditionally skipped source files in v1, plus
  `packages/persistence/src/__tests__/audit-evidence-checkpoint-postgres.test.ts`.
  That additional file declares two tests backed by an in-memory
  `AuditCheckpointClient`; it has no `TEST_DATABASE_URL` or skip guard and is
  not part of the 192 conditional cases.
- The required-skip policy says unclassified, database-present, and dedicated
  PostgreSQL-gate skips are required. Only a matching conditional case in the
  default unit gate, with the database absent and the file selected by the
  separate PostgreSQL gate, may be optional. A configured database or the
  PostgreSQL gate makes those skips required.
- Historical run log SHA-256:
  `695ab9fe825c934355557da17c25845042232db660b17f43de5b8b262f73abb9`.
  It reports `289 passed | 12 skipped` files and `2,252 passed | 192 skipped`
  tests. Static declarations reconcile to 12 fully skipped files / 70 cases
  and 17 partially skipped files / 122 cases.
- **Attribution limit:** the run receipt contains 22 entries and none of the 29
  conditional test paths. The current source-based reconstruction therefore
  does not prove that each file produced the attributed skip count in that
  historical run. The historical log also is not a PostgreSQL execution.
- `test:postgres` only selects the files; the task still needs an admitted,
  disposable database setup that supplies and checks `TEST_DATABASE_URL`, a
  per-file reporter, zero required skips, and a teardown receipt. Official
  `AUD20-11` remains `BLOCKED` by `AUD20-07/10/19`; NQP-02 remains preliminary.

Cross-check output and full source/evidence hashes are bound by the
[cross-check record](nqp02-static-skip-provenance-crosscheck-20260924.json)
and [v2 source manifest](nqp02-static-skip-inventory-v2-20260924.sources.sha256),
SHA-256 `ee20a50b412828a60731f03e6495df563a9f9aa29d4a9d1ffb3368b064b9902e`.
