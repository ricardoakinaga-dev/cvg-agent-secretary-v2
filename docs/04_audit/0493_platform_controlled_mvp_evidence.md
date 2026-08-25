# 0493 — Agent Platform Controlled MVP Evidence

## Status

> **Nota temporal:** esta evidência é histórica e cobre a rodada anterior do MVP controlado. O estado corrente, incluindo PLAT-S06, está em `docs/platform/final-technical-audit.md`; este registro não deve ser usado isoladamente para inferir contagens ou gaps atuais.

```txt
STATUS: CONTROLLED_MVP_READY
DATE: 2026-08-24T09:32:45-03:00
SCOPE: control plane, Test Lab and guarded console; fictitious fixtures only
```

## Decision

The Agent Platform slice is reproducible as a controlled MVP. It is not an approval for real data, real channels, real RAG, unrestricted production or sensitive automation.

## Verification evidence

| Gate                         | Command                                                  | Result                                                                                                               |
| ---------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Integrated verification      | `npm run verify`                                         | PASS — final rerun recorded in the execution log; format, typecheck, lint, build, tests, coverage and audit          |
| Full unit/integration suite  | `npm test`                                               | PASS — 55 files, 166 passed, 5 skipped (171 total); conditional PostgreSQL tests skipped without `TEST_DATABASE_URL` |
| Coverage                     | `npm run test:coverage`                                  | PASS — statements 86.35%, branches 80.60%, functions 85.91%, lines 87.76%                                            |
| Readiness                    | `npm run readiness`                                      | PASS — 1 file, 4 passed                                                                                              |
| PostgreSQL conditional suite | `env -u TEST_DATABASE_URL npm run test:postgres`         | PASS — 3 files, 6 passed, 5 skipped without `TEST_DATABASE_URL`                                                      |
| PostgreSQL real smoke        | `TEST_DATABASE_URL=postgres://... npm run test:postgres` | PASS — 3 files, 11 passed against the PostgreSQL 16 fixture container                                                |
| Browser E2E                  | `npm run test:e2e`                                       | PASS — 1 browser flow passed with Playwright                                                                         |
| Dependency security          | `npm audit --audit-level=high`                           | PASS — 0 vulnerabilities                                                                                             |

The PostgreSQL smoke used only the explicit fixture container `cvg-his-v4-codex-test-db` on `127.0.0.1:55437`; each test used a unique schema and cleaned it up. No business data or existing non-fixture container was modified.

## Implemented control boundary

- Local Vitest aliases are hermetic; tests no longer depend on an external workspace.
- Agent and AgentVersion contracts, lifecycle, tenant-scoped store, publish and rollback are covered.
- Prompt composition, secret-reference-only model configuration, controlled knowledge sources, policy evaluation, feature flags and response templates are validated at boundaries.
- Capability execution is deny-by-default through the gateway; Test Lab uses a deterministic provider with `externalCall: false`.
- Test Lab traces, regression evaluation, handoff state machine, API/UI flows and browser E2E are present.
- Published runtime, persisted redacted trace/history, controlled scheduling gateway, tenant-scoped session continuation and human takeover silence/resume are covered in memory and by real PostgreSQL smoke/API integration.
- Published runtime revalidates takeover state before emitting a response; conversation history is bounded/redacted before prompt composition, and takeover states prevent bot execution while a human owns the conversation.
- Outbound controlled runtime responses are persisted as redacted timeline messages, so subsequent turns receive both inbound and assistant history without exposing raw sender identifiers.
- Production configuration fails closed when PostgreSQL is not selected; the initial migration is transactional and records a `schema_migrations` marker, while legacy tenant-null compatibility remains fail-closed.
- The marker-driven migration checks applied versions before replay; sender references are masked at storage and guarded by a tenant-scoped fingerprint, while legacy rows without a fingerprint fail closed for continuation.
- Inbound message bodies, arbitrary audit strings and Test Lab/execution trace text are redacted before persistence; PostgreSQL unique-key races for inbound messages and internal tasks are reconciled by re-reading the winning record.
- Production API mutations require a trusted operator resolver and tenant binding; self-asserted headers are test/development-only.
- Control Center clone/edit creates a new DRAFT and preserves the source snapshot; the UI preserves disabled custom plugins and forces real integration flags off.
- Approval decisions are fail-closed through a tenant/agent/version/tool/actor-scoped, expiring approval object plus an explicit verifier; Test Lab never supplies approval.
- Knowledge answers require source and version to match an enabled approved binding in the executed snapshot; mismatches hand off without answering.
- Trace ownership is checked before memory/PostgreSQL persistence; Trace Viewer exposes the redacted `configVersion` and evidence fields.
- PostgreSQL create/publish/rollback share agent-first locking; transitions lock the row and update with the observed status condition.
- Production webhook verification, defensive headers, rate limiting, minimized audit payloads and Zod validation are covered.

## Remaining release blockers

- Real IdP integration, tenant derivation, expiry and permission review.
- Distributed rate limiting and production CSRF/CORS/HTTPS/CSP host configuration.
- Legacy data-plane tenant isolation/RLS, versioned backfill/rollout and adaptation of the legacy `ToolRegistry` to the capability gateway.
- Webhook HMAC/replay protection and human decisions for RAG, retention, roles, channels and sensitive actions.
- Retention/purge automation and legal/operational PII classification are not complete; redaction is only an MVP safeguard.
- Real external provider/channel leases, cancellation and side-effect compensation are not enabled; scheduling remains fixture-only.
- A production approval issuer/verifier with durable revocation/audit and the full optimistic multi-operator control-plane conflict protocol are not configured in this controlled repository.

## Review note

The earlier Noether/Ptolemy/Nash reviews and their historical fixes remain recorded above. The fresh Noether PLAT-S02 review found no reproducible P0 in the controlled path, but identified approval provenance, partial PostgreSQL concurrency, knowledge provenance and missing snapshot identity in the viewer. This round fixed the controlled approval contract, source/version binding, Trace Viewer identity, agent-first PostgreSQL locks, conditional transitions and atomic rollback. The reviewer still correctly retains RLS/audit schema, real approval infrastructure, durable side-effect auditing and full multi-operator conflict handling as production blockers. No reviewer approved real production.

## Conclusion

`CONTROLLED_MVP_READY` is the maximum authorized verdict. `PRODUCTION_REAL_DATA_READY` remains blocked pending the decisions and infrastructure listed above. Final Gauntlet verdict: `CONDITIONAL_PASS — CONTROLLED_MVP_ONLY`.
