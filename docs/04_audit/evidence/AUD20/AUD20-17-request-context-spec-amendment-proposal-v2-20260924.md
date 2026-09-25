# AUD20-17 / IMP50-40 — proposed request-context SPEC amendment v2

**Status:** `DRAFT_PROPOSAL — PENDING HUMAN DECISION AND SPECIFIC BUILD ADMISSION`.
This proposal does not revise the approved SPEC, change 0190/0337 admission, or
authorize code or another BUILD.

## Decision context

The approved first-slice SPEC is
[aud20_17_hotspot_decomposition_20260922.md#adendo-proposto--imp50-40--primeira-fatia](../../../02_spec/aud20_17_hotspot_decomposition_20260922.md#adendo-proposto--imp50-40--primeira-fatia),
SHA-256 `a3c200e7323db28245b98dc8b35f120fcf6b8e961e570664044c62f2cd329d37`.
Its request-context v1 result was `server.ts=4,745`, 37 lines above C02's
`4,708` ceiling. The separately approved query-parser FU1 has its own PASS and
cannot be credited to request-context. The user directed the SPEC review to
expand only request-context far enough to meet the existing cap; that direction
did not authorize another BUILD.

This v2 incorporates the four conditions in the independent
[v1 review](AUD20-17-request-context-spec-amendment-critic-v1-20260924.md),
which returned `CONDITIONAL`. The earlier
[v1 proposal](AUD20-17-request-context-spec-amendment-proposal-v1-20260924.md)
is preserved as reviewed evidence. This proposal keeps the cap and public
contracts fixed. It adds only the request-scoped lifecycle, raw-body and
authorization-binding code still in `buildServer`; it does not move routes or
policy into another layer.

## Proposed delta

Extend the existing `request-context.ts` owner with three bounded helpers and
move only their current wiring from `server.ts`:

1. **Request timing and metrics hooks.** Move the per-application
   `WeakMap<object, number>`, `onRequest` start capture and `onResponse` record
   and cleanup. Preserve method, route template, status code, non-negative
   latency, one `requestMetrics.record` call per response, and the existing
   `requestMetricsEnabled` behavior. Do not add headers, identifiers or
   payloads to metric dimensions.
2. **Raw JSON body context.** Move the per-application raw-body `WeakMap`,
   `application/json` parser registration and request/raw-request lookup used
   by the existing webhook verifier. Preserve exact UTF-8 bytes, JSON parse
   behavior, malformed-body error mapping, body limits and the optional
   `rawBody` field passed to the verifier. Do not log or persist raw bodies.
3. **Authorization bindings.** Move the `requireIdentity` and
   `requireAnyIdentity` closures that bind the effective resolver to the
   existing request-context permission helpers. Move the
   `requireAuthenticatedMutations` default calculation into a pure helper on
   the context factory. The factory captures the already-resolved `nodeEnv`;
   `requiresAuthenticatedMutations` takes only `identityMode` and the explicit
   override. The module must not read `process.env`.

The helper signatures and structural registrar types are normative:

```ts
interface RequestMetricRequest extends object {
  method: string
  routeOptions: { url?: string }
}
interface RequestMetricReply { statusCode: number }
interface RequestMetricsSink {
  record(input: {
    method: string
    routeTemplate?: unknown
    statusCode: number
    latencyMs: number
  }): void
}
interface RequestContextRegistrar {
  addHook(
    name: 'onRequest',
    handler: (request: RequestMetricRequest) => void | Promise<void>
  ): unknown
  addHook(
    name: 'onResponse',
    handler: (
      request: RequestMetricRequest,
      reply: RequestMetricReply
    ) => void | Promise<void>
  ): unknown
  removeContentTypeParser(contentType: 'application/json'): unknown
  addContentTypeParser(
    contentType: 'application/json',
    options: { parseAs: 'string' },
    parser: (
      request: object,
      body: string,
      done: (error: Error | null, value?: unknown) => void
    ) => void
  ): unknown
}

installRequestMetricsHooks(
  app: RequestContextRegistrar,
  requestMetrics: RequestMetricsSink,
  now: () => number
): void
installRawBodyParser(
  app: RequestContextRegistrar
): (requestOrRawRequest: object) => string | undefined
bindOperatorAuthorization(
  resolver: OperatorIdentityResolver | undefined
): {
  requireIdentity(headers: Record<string, unknown>, permission: string): OperatorIdentity
  requireAnyIdentity(headers: Record<string, unknown>, permissions: string[]): OperatorIdentity
}
requiresAuthenticatedMutations(
  identityMode: IdentityMode,
  override: boolean | undefined
): boolean
```

`RequestContextRegistrar` is local and structural; the module must not import
Fastify or Fastify request/reply types. Its method callbacks accept both
synchronous and asynchronous hooks. The `server.ts` call site must type-check
without casts. The request object itself remains the metrics WeakMap key. The
metrics clock is monotonic and injected from the composition root as
`() => performance.now()`.

The parser registration replaces only `application/json` and uses
`parseAs: 'string'`. Its completion callback receives `Error | null` and an
optional parsed value. `installRawBodyParser` owns its WeakMap, stores the exact
string before parsing, calls `JSON.parse`, maps parse failure through the
existing `createInvalidJsonBodyError`, and returns the getter shown above. The
composition root preserves the existing webhook lookup order: raw request
first, then request.

`bindOperatorAuthorization(resolver)` returns the existing two call shapes:
`requireIdentity(headers, permission)` and
`requireAnyIdentity(headers, permissions)`. It delegates to the current
`requireOperatorIdentity` and `requireAnyOperatorPermission` helpers with that
resolver. `requiresAuthenticatedMutations(identityMode, override)` uses the
`nodeEnv` captured once by `createRequestContext`, and preserves the current
test/simulation/override truth table exactly.

These interfaces are structural and local; they must not import Fastify or
Fastify request/reply types. The `server.ts` call site must type-check without
casts. Preserve the current registration order: request-target guard, HTTP
security hooks, response-correlation hook, metrics hooks, JSON parser
registration, rate limiter, then route registration. Do not move error/not-found
handlers, guards, or the metrics/parser registration points relative to those
neighbors.

## Candidate files

The amended allowlist would be limited to:

- `apps/api/src/server.ts` — remove only the listed inline context blocks and
  call the new helpers;
- `apps/api/src/server/request-context.ts` — own the added helpers and local
  structural types;
- `apps/api/src/__tests__/request-context.test.ts` — direct positive/negative
  tests for the new helpers and request-scoped cleanup;
- `apps/api/src/__tests__/server-boundary-envelope.test.ts` — exact malformed
  JSON and error-envelope compatibility assertions;
- `apps/api/src/__tests__/webhook-security.test.ts` — exact raw-body signature
  acceptance and rejection through `buildServer`;
- `tests/architecture.test.js` — owner, injection, no-environment-read,
  no-forbidden-import, no-duplicate and cap assertions;
- this SPEC amendment's review/admission records and candidate-bound evidence.

All first-slice boundary tests already named by the approved SPEC remain
required. Anything else returns to SPEC review. In particular, `rateLimiter`,
response correlation, error/not-found handling, route handlers, query parsers,
identity policy, environment configuration, and every external or data-layer
concern stay in their current owners.

## C02 line budget

The request-context v1 `server.ts` baseline is 4,745 lines. The proposed
replacements account for an estimated **37 net lines** from that exact
request-context-only candidate:

| Current server block | Current lines | Proposed wiring | Estimated net reduction |
| --- | ---: | ---: | ---: |
| request timing WeakMap and hooks | 14 | one installer call | 13 |
| raw-body WeakMap and JSON parser | 15 | one installer call | 14 |
| webhook raw-body lookup | 2 | one getter call | 1 |
| identity helper closures | 9 | two-line binding | 7 |
| authenticated-mutation default | 4 | two-line pure-helper call | 2 |
| **Total** | **44** |  | **37** |

These are source-line estimates before the actual formatted patch. The
request-context-only gate remains fail-closed: measure the exact reconstructed
v1 candidate and accept C02 only at `server.ts <= 4,708` and
`server/request-context.ts <= 450`. Keep `request-query.ts <= 160` and the
three-module integrated ceiling `<= 5,050` on the separately measured
query-parser candidate.

The current integrated modules are `server.ts=4,622`,
`request-context.ts=258`, and `request-query.ts=138`, total `5,018`. After the
estimated 37-line server reduction, the request-context module may grow by at
most **69 net lines** while the integrated three-module total stays at `5,050`
or below: `5,050 - (5,018 - 37) = 69`. This puts an effective integrated
maximum of 327 lines on `request-context.ts`, tighter than its 450-line local
cap. The proposal's estimate is not a result; count the formatted candidate.
If either `server.ts > 4,708`, `request-context.ts > 450`, or the three-module
total exceeds `5,050`, stop and report C02 `FAIL`; no extra extraction or cap
relaxation is covered here.

Before any future admitted BUILD, construct a temporary, isolated v1-only
reconstruction from the exact query-parser rollback transformation. The
reconstruction manifest must contain SHA-256 and line count for `server.ts`,
`request-context.ts`, `request-context.test.ts`, `request-query.ts`,
`request-query.test.ts`, `tests/architecture.test.js`, and every test file
changed by query-parser FU1. It must record the parser owners restored in
`server.ts`, the query-parser module/direct test/assertion removed from that
isolated copy, and a diff identifying any retained query-specific route-test
assertions. Use exact pre-FU1 route-test copies in the isolated v1 test set when
available. If they are unavailable, keep affected route tests out of v1-only
acceptance evidence; list their FU1 hashes and query-specific assertions
separately, retain them unchanged in the integrated candidate, and credit them
only to FU1. Stop if their changes cannot be attributed. The pre-amendment
check must prove `server.ts=4,745`,
`request-context.ts` SHA-256
`ec4bbc4b68480a6cfd75024cf2382765a20d4d72b9e7dd9f41619403dacaf9a7`, and
`request-context.test.ts` SHA-256
`6e75f74544d727dc56e99913bd4af5b92ee1438523a19773e35526591b7acda2`.
If any expected file is unavailable, a hash/count differs, the query-parser
diff cannot be isolated, or a route-test change cannot be attributed, stop
before editing. Do not use the integrated `server.ts=4,622` count as
request-context proof. Preserve the accepted query-parser files in the shared
worktree; the v1 reconstruction is temporary and isolated. The existing
[rollback rehearsal](AUD20-17-query-rollback-rehearsal-20260923.json) is only a
parser round-trip rehearsal and does not replace this complete manifest.

The build report must record actual before/after counts and hashes for both
the request-context-only reconstructed candidate and the integrated
query-parser candidate. The latter retains its own attribution and test
evidence.

## Contract tests and acceptance

- Preserve every original C01–C07 criterion and request-context SPEC invariant.
  No methods, paths, schemas, status codes, headers, error codes or exact
  messages may change.
- Directly test timing registration, recording and cleanup with synthetic
  requests; no sensitive field may enter metric dimensions. Assert the hook
  registration order and fallback timing behavior.
- Exercise a non-canonical JSON byte sequence through `buildServer` and prove
  the existing webhook verifier receives those exact bytes; invalid signatures
  remain `401`, and malformed JSON retains the exact current response envelope
  and message.
- Test the bound identity helpers against existing tenant/permission negatives
  and every `requiresAuthenticatedMutations` node-environment, identity-mode,
  and override case.
- Re-run the complete first-slice route/identity/tenant matrix, architecture
  assertions, full test and coverage commands on the exact candidate, and the
  independent C01–C07 review after the last write.
- C06 remains `FAIL` unless every applicable AAA floor is met with the frozen
  denominator: statements >=90%, lines >=90%, functions >=90%, branches >=85%,
  critical-module branches >=95%, and selected mutation detection 100%. Do not
  reduce a threshold, change a denominator, or transfer query-parser credit.
- Attach an executed/ignored inventory for the full run. The integrated receipt
  currently lists 192 skipped tests; classify these using NQP-02 evidence and
  report their gate status. No required test may be counted as passed while
  skipped. PostgreSQL-required tests remain a separate required gate and need
  a disposable synthetic database with zero required skips before C06 can
  pass. The current 29-file static inventory is preliminary and does not
  constitute that execution result.
- Keep rollback candidate-local and reversible; preserve the separate
  query-parser slice. No commit, push, deploy, external integration, staging or
  production.

## Review gate

This proposal requires a fresh independent review before a human decision. If
the user approves this exact hash, record it in SPEC validation and 0337 before
code, then obtain a separate explicit, hash-bound local-BUILD admission. A C02
pass alone does not accept IMP50-40: C06/C07 and every other criterion remain
mandatory. Until both decisions are recorded, status stays `DRAFT_PROPOSAL`,
`AUD20-17=IN_PROGRESS`, and Q2/AUD20-10 stays queued.
