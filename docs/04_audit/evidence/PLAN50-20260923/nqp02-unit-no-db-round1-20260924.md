# NQP-02 — focused unit run with PostgreSQL URL absent

- Run date: `2026-09-24`; Node `22.23.2`.
- Command: repository `npm test` with the 30 file paths selected by
  `package.json`'s `test:postgres` selector, plus Vitest JSON reporter.
  `TEST_DATABASE_URL` was explicitly the empty string. `vitest.config.mts`
  does not load `.env`; no service or database was started.
- Result: **30 files, 354 tests, 162 passed, 192 skipped, 0 failed**. Twelve
  files were wholly skipped. The reporter's per-file skip counts match all 29
  rows in the v1 source reconstruction: 12 files / 70 fully skipped cases and
  17 files / 122 partially skipped cases. The extra selected
  `audit-evidence-checkpoint-postgres.test.ts` file passed both in-memory tests.
- This is a unit-only result under the policy's database-absent optional-skip
  rule. It validates the current source classification, not PostgreSQL
  behavior. The dedicated `test:postgres` gate still requires a disposable
  database, a present and checked `TEST_DATABASE_URL`, zero required skips,
  per-file results and a teardown receipt. `AUD20-11` remains `BLOCKED`; NQP-02
  is not accepted.
- The separate historical run still has no source-hash binding for the 29
  conditional test files, so this new run does not retroactively prove the old
  run's per-file attribution.

Evidence: [JSON reporter results](nqp02-unit-no-db-round1-20260924.json),
[per-file reconciliation](nqp02-unit-no-db-skip-summary-20260924.json),
[command log](nqp02-unit-no-db-round1-20260924.log), and
[execution receipt](nqp02-unit-no-db-round1-20260924.receipt.json). Result SHA-256
`492b672725b22b12f7c6212ff589ca4c0c4b268aab77730a49bdb0e490370ad9`; source
manifest SHA-256
`ee20a50b412828a60731f03e6495df563a9f9aa29d4a9d1ffb3368b064b9902e`.
