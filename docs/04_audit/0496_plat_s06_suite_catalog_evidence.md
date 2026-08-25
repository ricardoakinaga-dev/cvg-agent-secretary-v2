# 0496 — PLAT-S06 controlled Test Lab suite catalog evidence

## Status

```txt
STATUS: COMPLETED_CONTROLLED
DATE: 2026-08-24T19:02:02-03:00
SCOPE: tenant-aware Test Lab suite catalog, redacted run history and dry-run A/B comparison
DATA: fictitious fixtures only
```

## Decision

`PLAT-S06-001` is complete within the controlled boundary. The implementation persists immutable suite snapshots linked to tenant/agent/version, supports versioned clone, redacts case and trace content, records one- or two-variant run history, and exposes controlled API/Control Center flows. No provider, channel, real traffic, publication automation or sensitive action is enabled.

## Implemented evidence

- `packages/platform/src/contracts.ts` defines validated cases, suite records, variant results and run records.
- `packages/platform/src/control-plane-store.ts` provides defensive-copy in-memory lifecycle, tenant/agent/version checks, slug/version rules and redaction.
- `packages/persistence/migrations/0003_test_suite_catalog.sql` creates the suite/run tables with foreign keys, indexes, `FORCE ROW LEVEL SECURITY` and fail-closed tenant policies.
- `packages/persistence/src/platform-control-plane-repository.ts` and `tenant-scoped-postgres.ts` expose the same lifecycle through parameterized SQL and sanitized JSONB.
- `apps/api/src/server.ts` exposes create/list/clone/evaluate/compare/run-history routes with admin permission and scope validation.
- `apps/web/src/features/platform/index.tsx` exposes explicit suite creation, loading, evaluation and A/B comparison without auto-fetch.

## Verification

| Gate                                                                                     | Result                                                                                        |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Focused suite/API/UI/repository tests                                                    | PASS — 5 files in the focused run; 11 tests including repository lifecycle and negative cases |
| `npm test`                                                                               | PASS — 67 files; 243 passed; 15 conditional skips; 258 total                                  |
| `npm run test:coverage`                                                                  | PASS — 84.40% statements; 80.23% branches; 84.72% functions; 85.24% lines                     |
| `npm run test:e2e`                                                                       | PASS — 1 Playwright flow, including suite creation and A/B comparison                         |
| `TEST_DATABASE_URL=postgres://...@127.0.0.1:55437/cvg_his_v2_test npm run test:postgres` | PASS — 6 files; 64 tests; 0 failures                                                          |
| `npm run typecheck`, `npm run lint`, `npm run format:check`                              | PASS                                                                                          |
| `npm audit --audit-level=high`                                                           | PASS — 0 vulnerabilities                                                                      |
| `git diff --check`                                                                       | PASS                                                                                          |

## Boundary

The PostgreSQL run used only the explicit ephemeral fixture and unique test schemas. The catalog remains a Test Lab control-plane feature: it cannot send messages, call a provider, use a real channel, publish automatically, answer without approved knowledge, or execute clinical/financial/medical-record actions. Production release remains `NO-GO` pending the identity, infrastructure, retention, provider/channel and human-governance decisions recorded in the final audit.
