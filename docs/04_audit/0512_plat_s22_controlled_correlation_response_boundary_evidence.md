# Evidence — PLAT-S22 controlled correlation response boundary

## Identification

- sprint: `PLAT-S22_CONTROLLED_CORRELATION_RESPONSE_BOUNDARY`
- task: `PLAT-S22-001_CONTROLLED_CORRELATION_RESPONSE_BOUNDARY`
- registered: `2026-08-25T15:46:42-03:00`
- RED: `2026-08-25T15:52:03-03:00`
- controlled closure: `2026-08-25T16:02:37-03:00`
- phase: `DISCOVERY -> PRD -> SPEC -> BUILD -> AUDIT`
- data: fixtures and fictitious values only
- release: `CONTROLLED_MVP_READY`; real production: `NO-GO`

## Decision and scope

The API already returned `meta.correlationId` in every controlled envelope, but
clients had to decode each JSON body before correlating a response with redacted
logs or audit evidence. S22 adds only the response boundary:

- `X-Correlation-Id` is copied from a valid top-level envelope
  `meta.correlationId` during Fastify `preSerialization`;
- the server never accepts or reflects an incoming correlation header;
- approved CORS responses expose only `X-Correlation-Id`;
- preflight 204 responses and non-envelope payloads do not invent the header;
- HTTP security, envelope shape, identity, tenant binding, metrics, Secretary,
  persistence and external-side-effect boundaries remain unchanged.

No tracing distributed, OpenTelemetry, broker, payload logging, provider,
channel, RAG, real data, deployment or sensitive action was introduced.

## TDD evidence

### RED

The focused suite was executed before implementation:

```text
apps/api/src/response-correlation.test.ts
4 failed assertions, 1 passed
```

The expected failures were the absent response header, absent CORS exposure and
missing header on an HTTP security error. The preflight/non-envelope negative
case already remained absent.

### GREEN

Implemented `apps/api/src/response-correlation.ts` with strict runtime
validation through `CorrelationIdSchema` and a non-mutating pre-serialization
hook. `apps/api/src/http-security.ts` exposes only the response header for an
already approved CORS origin. The final focused suite passed:

```text
4 files passed in regression focus
6 response-correlation tests passed
```

The test matrix covers envelope/header parity, malformed and nested IDs,
external-header spoofing, approved CORS, server-to-server responses, preflight,
404/non-envelope output and rejected origins.

## Executable gates

| Gate                           | Result                                                                    |
| ------------------------------ | ------------------------------------------------------------------------- |
| `npm run verify`               | PASS — format, typecheck, lint, build, tests, coverage and audit          |
| `npm test`                     | PASS — 100 files; 343 tests pass; 18 skips; 361 total                     |
| `npm run test:coverage`        | PASS — statements 85,37%; branches 80,81%; functions 85,10%; lines 86,29% |
| `npm run readiness`            | PASS — 1 file; 4 tests                                                    |
| `npm run test:e2e`             | PASS — 3/3 flows                                                          |
| `npm run test:postgres`        | PASS — 5 files; 51 tests pass; 18 skips                                   |
| `npm audit --audit-level=high` | PASS — 0 vulnerabilities                                                  |
| `git diff --check`             | PASS                                                                      |

## Security audit

- No caller-supplied correlation value is trusted or reflected.
- Only a strict top-level `meta.correlationId` matching the existing `corr_*`
  schema can become a response header.
- CORS exposure is added only after the existing exact-origin allowlist passes;
  credentials and wildcard origins remain disabled.
- The implementation does not parse, log, persist or export body/query/path,
  token, PII, identity or tenant data.
- The response header is observability ergonomics, not authentication,
  authorization, tenant binding or proof of distributed tracing.

## Limits and release decision

S22 is a controlled HTTP fixture boundary. It does not remove blockers for a
real release: trusted IdP/tenant binding/RBAC, real RLS/backfill/change control,
distributed limiter/replay/HA, host CSRF/CORS/HTTPS/CSP/TLS, secret rotation,
retention/PII governance, institutional RAG, real providers/channels/plugins,
distributed operator coordination and human decisions for sensitive actions.

Result: `PLAT-S22-001_CONTROLLED_CORRELATION_RESPONSE_BOUNDARY` is
`COMPLETED_CONTROLLED`. No production activation or external side effect was
authorized.
