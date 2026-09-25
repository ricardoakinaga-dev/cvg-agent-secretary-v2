# AUD20-03 PostgreSQL Concurrency Report

## Environment

- PostgreSQL: disposable local instance at `127.0.0.1:55433`.
- Database: `postgres`.
- Tenant fixtures: synthetic `tenant_00000000-0000-4000-8000-0000000009a1` and related test tenants.
- `TEST_DATABASE_URL` was set for every PostgreSQL command in this report.
- Tests create and drop disposable schemas; no external service or real data is used.
- Candidate: `e258b9bef592120288ca8bd3a51d043ff66cd06f9b0fc0a61a2ab65af6f7dad7`.
- Raw command artifacts and digests: `docs/04_audit/evidence/AUD20/AUD20-03-raw-artifact-receipt.json`.
- Critical kernel coverage: `docs/04_audit/evidence/AUD20/AUD20-03-critical-coverage.json`.

## Raw command summaries

```text
$ TEST_DATABASE_URL=postgresql://postgres:aud20-synthetic@127.0.0.1:55433/postgres \
  npm run test:postgres

Test Files  30 passed (30)
     Tests  331 passed (331)
```

```text
$ TEST_DATABASE_URL=postgresql://postgres:aud20-synthetic@127.0.0.1:55433/postgres \
  npx vitest run packages/persistence/src/__tests__/goal-concurrency-postgres.test.ts \
  apps/worker/src/__tests__/kernel-durable-orchestrator-postgres.test.ts \
  --no-file-parallelism --maxWorkers=2

Test Files  2 passed (2)
Tests  14 passed (14)
```

```text
$ TEST_DATABASE_URL=postgresql://postgres:aud20-synthetic@127.0.0.1:55433/postgres \
  npx vitest run packages/persistence/src/__tests__/outbox-durability.test.ts \
  --no-file-parallelism --maxWorkers=2

Test Files  1 passed (1)
Tests  9 passed (9)
```

The dedicated PostgreSQL matrix and the full unit run had zero skipped tests
because `TEST_DATABASE_URL` was set to the disposable local PostgreSQL instance.
The full run covered 294 files and 2360 tests. Coverage was statements 95.95%,
branches 92.54%, functions 95.54%, and lines 96.64%.

The critical `apps/worker/src/kernel-composition.ts` file reached 486/511
branches (`95.10%`), clearing the frozen `95%` critical-branch threshold.
The architecture gate also passed with the frozen `apps/api/src/server.ts <= 4958`
and `packages/persistence/src/postgres.ts <= 3441` line caps.

## AUD20-N04 observations

- Two concurrent controlled outbox journeys both finished `processed` with one attempt each.
- The two journeys converged on one Goal, one Plan, one Step, one Attempt, and one governed tool invocation.
- Crash after Goal creation redelivered on attempt two, retained one Plan/Step/Attempt, produced one effective tool invocation, and created no dead letter.
- A stale Goal-run loser returned the persisted result instead of retrying or producing a dead letter.
- Final-attempt, restart, retry, quarantine, and dead-letter suites passed in the full matrix.
- The deterministic lease race intentionally demonstrates at-least-once handler invocation: two handler calls, one idempotent effective effect, stale final ack fenced with `conflict`, fresh ack `processed`, and zero dead letters.
- The final-compare-and-swap expiry fixture advances the repository clock between effect completion and commit; the stale ack returns `conflict`, leaves the event processing, and creates no effect journal row.
- A durable redelivery with a persisted `waiting_approval` marker and no continuation now returns `approval_required_pending` without invoking the orchestrator; a continuation with a mismatched approval id remains rejected.

## Verdict boundary

The implementation evidence supports the controlled at-least-once/idempotent
effect contract for `AUD20-N04`. It does not claim an impossible zero-handler
invocation guarantee across a lease-expiry window between pre-effect validation
and handler start. Continuous workers renew leases and the durable Goal/effect
journal provides the effective-effect fencing boundary.

Static gates also passed: typecheck, lint, build, format check, architecture caps,
`git diff --check`, and `docs:check`. The fresh independent review passed, so the
task is `READY_FOR_NEXT_STEP`; staging and production remain `NO_GO`.
