# AUD20-04 — retention/replay report

- Validity: `HISTORICAL_STALE`; candidate `87874e...` is not the current AUD20-04 v2 candidate and this report must not qualify the current task.
- Candidate: `87874e63523b491ad0d3e59fe946fb49db254672db79ff417ab3318b4b07e822`.
- Scope: disposable PostgreSQL, synthetic tenants, inbound idempotency and legal hold.
- Command: `TEST_DATABASE_URL=postgres://cvg_test:cvg_test_password@127.0.0.1:55434/cvg_test npx vitest run packages/persistence/src/__tests__/retention.test.ts packages/persistence/src/__tests__/retention-postgres.test.ts --no-file-parallelism --maxWorkers=2`.
- Result: `2` files and `31` tests passed; zero skips.
- An eligible inbound reservation was transitioned to a tombstone with a deterministic digest instead of being deleted.
- A held reservation remained untouched, and a reservation belonging to another tenant remained untouched.
- A late insert with the same `(tenant_id, key)` was rejected with PostgreSQL `23505`; the identity reservation could not be recreated.
- A second retention run was idempotent and reported no additional eligible deletion.
- Raw evidence: `AUD20-04-raw/retention-replay.log` (`c83e5b8360bacc94101cf16ce15da87337338958622ac7562d4256046c9fc02f`).

Verdict: `PASS` for the retention/replay acceptance slice in controlled-local scope.
