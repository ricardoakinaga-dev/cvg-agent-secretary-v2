# NQP-02 — preliminary static PostgreSQL-skip inventory

- Reviewed: `2026-09-24`.
- Classification source: static test-source inspection by the independent
  ready-lane scout; no test, database or service was started.
- Bound full-run log SHA-256:
  `695ab9fe825c934355557da17c25845042232db660b17f43de5b8b262f73abb9`, matching
  `candidate-final-audit.sha256` entry 16. The log reports 12 skipped files
  and 192 skipped tests (`full-final-round2.log:133-134`).
- Reconstructed source totals: **12 fully skipped files / 70 tests** and
  **17 partially skipped files / 122 tests**, across **29 files / 192 tests**.
- Status: preliminary inventory only; it does not satisfy NQP-02 or AUD20-11/12.

All cases below are guarded by `TEST_DATABASE_URL` (directly or through
`itWithPostgres`). The default unit run may classify a conditional database
case as optional only while that URL is absent and the separate PostgreSQL gate
selects it. When the URL is present, and in the dedicated `test:postgres` gate,
the case remains required and a skip fails the zero-required-skips rule. Policy
source: [aud19-required-skips.json](../../../03_build/tracking/aud19-required-skips.json#L18).
The aggregate log has no per-file reporter; row counts below are a source-based
reconstruction and must not be described as direct reporter output.
Current source hashes for these 29 test files are preserved in the
[source manifest](nqp02-static-skip-inventory-v1-20260924.sources.sha256),
SHA-256 `cb4fb1fb57638a9fefe6c60b98fbbada34f1ef49e385f5f9a6d85ab869b7a583`.

## Fully skipped files — 70 tests

| File | Tests | Guard/source anchors |
| --- | ---: | --- |
| `apps/api/src/__tests__/journeys-api-postgres.test.ts` | 10 | `describe.skip` selected from `TEST_DATABASE_URL`; group :59; tests :162, :791 |
| `apps/worker/src/__tests__/continuous-worker-entrypoint.integration.test.ts` | 2 | Conditional `describe`; group :151; tests :154, :274 |
| `apps/worker/src/__tests__/continuous-worker-postgres.integration.test.ts` | 3 | `itWithPostgres` at :117; tests :119, :217, :406 |
| `apps/worker/src/__tests__/kernel-durable-orchestrator-postgres.test.ts` | 6 | Conditional `describe`; group :27; tests :99, :568 |
| `packages/chaos/src/__tests__/chaos-postgres.test.ts` | 2 | `describe.skipIf(!TEST_DATABASE_URL)` at :6; tests :7, :54 |
| `packages/persistence/src/__tests__/attendance-approval-postgres.test.ts` | 1 | `it.skipIf(!databaseUrl)` at :12 |
| `packages/persistence/src/__tests__/goal-concurrency-postgres.test.ts` | 8 | Conditional `describe`; group :154; tests :187, :568 |
| `packages/persistence/src/__tests__/orchestrator-postgres.test.ts` | 4 | Conditional `describe`; group :81; tests :111, :329 |
| `packages/persistence/src/__tests__/platform-approval-postgres.test.ts` | 2 | `itWithPostgres` at :56; tests :58, :267 |
| `packages/persistence/src/__tests__/platform-postgres-smoke.test.ts` | 5 | `itWithPostgres` at :74; tests :76, :439 |
| `packages/persistence/src/__tests__/retention-postgres.test.ts` | 13 | Conditional groups :55, :581; tests :108, :1308 |
| `packages/persistence/src/__tests__/runtime-approval-store-postgres.test.ts` | 14 | Conditional `describe`; group :136; tests :181, :797 |

## Partially skipped files — 122 tests

| File | Skips | Guard/source anchors |
| --- | ---: | --- |
| `apps/api/src/__tests__/operator-replay-guard.test.ts` | 1 | `itWithPostgres`; conditional test :217 |
| `apps/api/src/__tests__/operator-replay-store.test.ts` | 3 | `itWithPostgres`; tests :186, :276, :334 |
| `apps/api/src/__tests__/postgres-persistence-mode.test.ts` | 7 | `itWithPostgres`; tests :963, :1012, :1269, :1304, :1439, :1652, :1803 |
| `apps/api/src/__tests__/webhook-security.test.ts` | 1 | `itWithPostgres`; conditional test :264 |
| `apps/worker/src/__tests__/kernel-composition-branch-hardening.test.ts` | 29 | Conditional group :1510; guarded tests :1884–:2700 |
| `apps/worker/src/__tests__/kernel-composition-postgres.integration.test.ts` | 5 | `itWithPostgres`; tests :779, :1005, :1093, :1179, :1193 |
| `apps/worker/src/__tests__/postgres-outbox-bridge.integration.test.ts` | 1 | `itWithPostgres`; conditional test :20 |
| `apps/worker/src/__tests__/postgres-role-preflight.test.ts` | 12 | Conditional group :54; guarded tests :114–:350 |
| `packages/persistence/src/__tests__/channel-effect-journal-postgres.test.ts` | 11 | `itWithPostgres`; tests :103–:549 |
| `packages/persistence/src/__tests__/effect-journal-postgres.test.ts` | 9 | `itWithPostgres`; tests :94–:377 |
| `packages/persistence/src/__tests__/journey-task-atomicity.test.ts` | 2 | Guarded `describe.skipIf`; tests :178, :217 |
| `packages/persistence/src/__tests__/journeys-postgres.test.ts` | 15 | Conditional suite :654; 8 shared contract and 7 PostgreSQL-specific cases; examples :763, :1219 |
| `packages/persistence/src/__tests__/outbox-durability.test.ts` | 7 | Seven `it.skipIf(!databaseUrl)` cases at :51, :123, :208, :309, :390, :523, :711 |
| `packages/persistence/src/__tests__/postgres-migration-smoke.test.ts` | 1 | `itWithPostgres`; conditional test :696 |
| `packages/persistence/src/__tests__/runtime-approval-store-branch-hardening.test.ts` | 15 | Conditional group :318; guarded tests :350–:799 |
| `packages/persistence/src/__tests__/session-version-pinning-postgres.test.ts` | 1 | `itWithPostgres`; conditional test :27 |
| `packages/persistence/src/__tests__/tenant-isolation.test.ts` | 2 | `itWithPostgres`; tests :551, :647 |

The per-file totals reconcile to the saved aggregate (70 + 122 = 192). This
reconstruction does not establish that PostgreSQL behavior passes. `TEST_DATABASE_URL`
was not exposed by the log; static guards, not that older environment note,
support the conditional classification. Next: run the required lane only with
a dedicated disposable synthetic database after its task gate and teardown
receipt are ready.
