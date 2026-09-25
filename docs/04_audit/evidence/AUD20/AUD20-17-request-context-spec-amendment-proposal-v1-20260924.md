# AUD20-17 / IMP50-40 — proposed request-context SPEC amendment v1

**Status:** `DRAFT_PROPOSAL — PENDING HUMAN DECISION`. This does not revise the
approved SPEC, change 0190/0337 admission, or authorize another BUILD.

## Decision context

The approved first-slice SPEC is
[aud20_17_hotspot_decomposition_20260922.md#adendo-proposto--imp50-40--primeira-fatia](../../../02_spec/aud20_17_hotspot_decomposition_20260922.md#adendo-proposto--imp50-40--primeira-fatia),
SHA-256 `a3c200e7323db28245b98dc8b35f120fcf6b8e961e570664044c62f2cd329d37`.
Its request-context v1 result was `server.ts=4,745`, 37 lines above C02's
`4,708` ceiling. The separate query-parser FU1 has its own PASS and cannot be
credited to request-context. The user directed the SPEC review to expand only
request-context far enough to meet the existing cap; the user explicitly did
not authorize another BUILD with that direction.

This proposal keeps the cap and public contracts fixed. It adds only the
request-scoped lifecycle, raw-body and authorization-binding code still in
`buildServer`; it does not move routes or policy into another layer.

## Proposed delta

Extend the existing `request-context.ts` owner with three bounded helpers and
move only their current wiring from `server.ts`:

1. **Request timing and metrics hooks.** Move the per-application
   `WeakMap<object, number>`, `onRequest` start capture and `onResponse` record
   and cleanup. Preserve method, route template, status code, non-negative
   latency, and one `requestMetrics.record` call per response. Do not add
   headers, identifiers or payloads to metric dimensions.
2. **Raw JSON body context.** Move the per-application raw-body `WeakMap`,
   `application/json` parser registration and request/raw-request lookup used
   by the existing webhook verifier. Preserve exact UTF-8 bytes, JSON parse
   behavior, malformed-body error mapping, body limits and the optional
   `rawBody` field passed to the verifier. Do not log or persist raw bodies.
3. **Authorization bindings.** Move the `requireIdentity` and
   `requireAnyIdentity` closures that bind the effective resolver to the
   existing request-context permission helpers. Move the
   `requireAuthenticatedMutations` default calculation into a pure helper on
   the context factory; pass the already captured `nodeEnv`, identity mode and
   override as inputs. The module must not read `process.env`.

The proposed internal helper surface is:

```ts
requestContext.installRequestMetricsHooks(app, requestMetrics, now)
requestContext.installRawBodyParser(app) // returns getRawBody(request)
requestContext.bindOperatorAuthorization(operatorIdentityResolver)
requestContext.requiresAuthenticatedMutations(identityMode, override)
```

Use narrow injected registrar/metrics interfaces; for timing, pass
`() => performance.now()` from the composition root. The existing context
factory already captures explicit `nodeEnv`. These types must be structural
and local: the module must not import `server.ts`, Fastify, stores, persistence,
adapters or external services. No new module, public export, dependency, route,
schema, persistence, orchestration or web change is proposed.

## Candidate files

The amended allowlist would be limited to:

- `apps/api/src/server.ts` — remove only the listed inline context blocks and
  call the new helpers;
- `apps/api/src/server/request-context.ts` — own the added helpers;
- `apps/api/src/__tests__/request-context.test.ts` — direct positive/negative
  tests for the new helpers and request-scoped cleanup;
- `apps/api/src/__tests__/server-boundary-envelope.test.ts` — exact malformed
  JSON and error-envelope compatibility assertions;
- `apps/api/src/__tests__/webhook-security.test.ts` — exact raw-body signature
  acceptance and rejection through `buildServer`;
- `tests/architecture.test.js` — owner, injection, no-environment-read, no
  forbidden-import, no-duplicate and cap assertions;
- this SPEC amendment's review/admission records and candidate-bound evidence.

All first-slice boundary tests already named by the approved SPEC remain
required. Anything else returns to SPEC review. In particular,
`rateLimiter`, response correlation, error/not-found handling, route handlers,
query parsers, identity policy, environment configuration, and every external
or data-layer concern stay in their current owners.

## C02 line budget

The v1 `server.ts` baseline is 4,745 lines. The proposed replacements account
for an estimated **37 net lines** from that exact request-context-only
candidate:

| Current server block | Current lines | Proposed wiring | Estimated net reduction |
| --- | ---: | ---: | ---: |
| request timing WeakMap and hooks | 14 | one installer call | 13 |
| raw-body WeakMap and JSON parser | 15 | one installer call | 14 |
| webhook raw-body lookup | 2 | one getter call | 1 |
| identity helper closures | 9 | two-line binding | 7 |
| authenticated-mutation default | 4 | two-line pure-helper call | 2 |
| **Total** | **44** |  | **37** |

These are source-line estimates before the actual formatted patch. The gate
remains fail-closed: measure the exact request-context-only candidate and
accept C02 only at `server.ts <= 4,708` and
`server/request-context.ts <= 450`. Keep `request-query.ts <= 160` and the
three-module integrated ceiling `<= 5,050` on the separately measured
query-parser candidate. If formatting or wiring produces `server.ts > 4,708`,
stop and report C02 `FAIL`; no extra extraction or cap relaxation is covered
by this proposal.

Before a future admitted BUILD, reconstruct the v1-only source in an isolated
workspace using the already recorded query-parser rollback procedure. Verify
`server.ts=4,745` and the preserved v1 request-context/test hashes
`ec4bbc4b68480a6cfd75024cf2382765a20d4d72b9e7dd9f41619403dacaf9a7` and
`6e75f74544d727dc56e99913bd4af5b92ee1438523a19773e35526591b7acda2` before
applying this amendment; record fresh whole-file hashes at that point. If the
v1-only source cannot be reconstructed and bound, stop rather than use the
integrated query-parser count as request-context proof. The existing rehearsal
is [AUD20-17-query-rollback-rehearsal](AUD20-17-query-rollback-rehearsal-20260923.json),
result `PASS_ISOLATED`; no rollback was applied to the shared worktree.

The estimate is not a C02 result. The BUILD report must record actual before
and after counts and hashes.

## Contract tests and acceptance

- Preserve every original C01–C07 and request-context SPEC invariant. There is
  no change to methods, paths, schemas, status codes, headers, error codes or
  exact messages.
- Directly test timing registration/recording/cleanup with synthetic requests;
  no sensitive field may enter metric dimensions.
- Exercise a non-canonical JSON byte sequence through `buildServer` and prove
  the existing webhook verifier receives the exact raw bytes; invalid
  signatures remain `401` and malformed JSON retains the exact current
  response envelope/message.
- Test the bound identity helpers against the existing tenant/permission
  negatives and each `requireAuthenticatedMutations` mode/override case.
- Re-run the complete first-slice route/identity/tenant matrix, architecture
  assertions, full test and coverage commands on the exact candidate, and the
  independent C01–C07 review after the last write.
- C06 remains `FAIL` unless the candidate satisfies every coverage contract;
  the current integrated `89.25%` functions result is below `>=90%`. This
  amendment does not lower thresholds, edit denominators or transfer coverage
  credit. PostgreSQL remains a separate required gate; no database is part of
  this amendment.
- Keep the rollback candidate-local and reversible; preserve the separate
  query-parser slice. No commit, push, deploy, external integration, staging or
  production.

## Review gate

If the user approves this exact proposal, record the amendment hash in SPEC
validation and 0337 before code. The request-context BUILD still needs a
separate explicit, hash-bound local-BUILD admission. A C02 pass alone does not
accept IMP50-40: C06/C07 and every other criterion remain mandatory. Until
those decisions are recorded, status stays `DRAFT_PROPOSAL`,
`AUD20-17=IN_PROGRESS`, and Q2/AUD20-10 stays queued.
