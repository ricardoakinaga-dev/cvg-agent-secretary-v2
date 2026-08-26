# Evidence — PLAT-S33 controlled worker published-runtime boundary

- task: `PLAT-S33-001_CONTROLLED_WORKER_RUNTIME_BOUNDARY`
- sprint: `PLAT-S33_CONTROLLED_WORKER_RUNTIME_BOUNDARY`
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- audit timestamp: `2026-08-25T21:58:18-03:00`
- verdict: `COMPLETED_CONTROLLED`
- release boundary: `CONTROLLED_MVP_READY`; production real remains
  `NO-GO` / `WAITING_HUMAN_APPROVAL`

## Discovery and RED

Discovery reproduced that `apps/worker/src/worker.ts` called the legacy
`runAgentTurn` with `{ sessionId, triggerMessageId }`, without tenant, agent,
version, published store or runtime trace. `apps/worker/src/main.ts` also
started a fictitious `sess_bootstrap`/`msg_bootstrap` job without a queue
adapter.

The first focused RED executed before implementation at
`2026-08-25T21:23:51-03:00`: 4 tests failed as expected. The initial complete
suite additionally caught a forbidden direct `@cvg/platform` dependency in
`apps/worker`; the contract was moved to `agent-core`, preserving the target
repository dependency boundary. The corrected focused suite passed 3 files/9
tests at `2026-08-25T21:47:58-03:00`.

## Delivered boundary

- `PublishedAgentJobSchema` is strict and bounded: tenant/agent/version IDs,
  message up to 4,000 characters, at most 20 history items of 4,000
  characters, and optional conversation/session context capped at 160.
- Invalid legacy, unknown, oversized, draft, cross-agent and missing-version
  jobs fail closed without a provider call or store access when validation
  should precede execution.
- `processAgentTurnJob` delegates only to `executePublishedAgent` with the
  explicit `versionId`; the resulting trace preserves tenant/agent/version and
  the controlled provider reports `externalCall: false`.
- `apps/worker/src/main.ts` no longer dispatches a bootstrap job. Missing or
  unsupported queue adapters emit only a bounded startup JSON and set exit code
  1; no broker, retry, outbox, channel, provider or side effect was added.
- The bounded job parser lives in `packages/agent-core`, so the worker keeps
  the repository's approved dependency boundary.

## Acceptance matrix

| Criterion                                                                  | Evidence                                                                                                | Result          |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------- |
| CTRL-128 — strict, bounded, tenant/agent/version-scoped worker job         | worker focused tests for valid job, legacy payload, unknown/oversized fields; Zod strict schema         | PASS controlled |
| CTRL-129 — pinned published runtime with no external effect                | archived v1 continuation, draft/cross-agent negative tests, trace and `externalCall: false` assertions  | PASS controlled |
| CTRL-130 — queue-less entrypoint fails closed without fictitious bootstrap | startup helper test plus `npm run dev:worker` smoke returning exit 1 with `queue_adapter_missing`       | PASS controlled |
| CTRL-131 — prior boundaries remain green                                   | full Vitest, coverage, readiness, E2E, PostgreSQL, typecheck, lint, build, format, audit and diff gates | PASS controlled |

## Final executable gates

- `npm test`: 112 files pass, 2 skipped; 408 tests pass, 19 skipped.
- `npm run test:coverage`: 85.01% statements, 80.42% branches, 85.14%
  functions, 85.99% lines.
- `npm run readiness`: 1 file, 4 tests pass.
- `npm run test:e2e`: 4 Playwright flows pass.
- `TEST_DATABASE_URL=<controlled PostgreSQL 16 fixture> npm run test:postgres`:
  8 files, 71 tests pass.
- `npm run typecheck`, `npm run lint`, `npm run build`,
  `npm run format:check`, `git diff --check`: pass.
- `npm audit --audit-level=high`: 0 vulnerabilities.
- Metadata JSON parse: pass.

## Security and limits

No real data, credentials, provider, channel, RAG, broker, deployment or
external side effect was used. The legacy outbox processor remains unchanged
and is not claimed as a durable queue integration. A real worker release still
requires an approved queue adapter, distributed retry/lease policy, trusted
identity/tenant binding, operational secrets, observability and human release
approval.

Child-agent execution was unavailable in this runtime; review was lead-only and
is not represented as independent approval.
