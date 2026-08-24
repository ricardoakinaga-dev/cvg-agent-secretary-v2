# Gauntlet state — CVG Agent Platform

## Goal

Deliver the modular CVG Agent Platform while preserving the legacy Secretary data plane, with a production-grade security and operational boundary. The current release remains controlled until real-data, identity, infrastructure and sensitive-action decisions are explicitly approved.

## Non-negotiable constraints

- No real data, credentials, external dispatch, real provider/channel calls or irreversible migration in this run.
- No automatic confirmation, cancellation or rescheduling of real appointments.
- No clinical, financial or definitive medical-record action.
- No RAG answer without an approved institutional source and version.
- Sensitive actions require approval or human handoff.
- Every material task is registered before BUILD and verified with executable evidence.

## Quality bar v1

| ID      | Criterion                                                           | Required evidence                                                          | Current state                         |
| ------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------- |
| CTRL-01 | Agent/version config is immutable and tenant-scoped                 | unit, API, E2E and PostgreSQL controlled gates                             | PASS controlled                       |
| CTRL-02 | Gateway, policy, approval and Test Lab fail closed                  | focused tests, trace redaction and independent review                      | PASS controlled                       |
| CTRL-03 | Legacy Secretary remains operational in fixture mode                | full verify, API/E2E and PostgreSQL smoke                                  | PASS controlled                       |
| PROD-01 | Trusted IdP identity is tenant-bound and RBAC is authoritative      | issuer/audience/key rotation and negative authorization evidence           | BLOCKED human/infra                   |
| PROD-02 | Legacy data plane is database-enforced tenant isolated              | versioned migration, forced RLS, pool context, cross-tenant negative tests | CONTROLLED PASS; real rollout blocked |
| PROD-03 | Approval issuer/verifier is durable, scoped, expiring and revocable | persistent authority, replay/expiry/revocation tests and audit chain       | BLOCKED                               |
| PROD-04 | Legacy ToolRegistry executes only through one capability gateway    | adapter contract, side-effect audit and deny-by-default tests              | BLOCKED                               |
| PROD-05 | Distributed rate limit, replay/HMAC and host security are enforced  | Redis/edge configuration and integration evidence                          | BLOCKED human/infra                   |
| PROD-06 | Control plane has optimistic multi-operator conflict handling       | version/ETag conflict tests and UI recovery                                | BLOCKED                               |
| PROD-07 | Provider/channel adapters are durable, leased and compensating      | fake and contract tests plus human-approved activation boundary            | BLOCKED human/infra                   |
| PROD-08 | Audit, retention, purge and PII governance are operational          | tenant-aware append-only schema, purge evidence and signoff                | BLOCKED human                         |

## Stop rule

Do not claim `PRODUCTION_REAL_DATA_READY` while any PROD criterion lacks evidence or requires a human/infrastructure decision. Continue controlled construction through the remaining safe lanes and leave the goal active until the full bar is met or the same external blocker repeats for three consecutive goal turns.

## Continuity

- Canonical project state: `docs/99_runtime_state.md`, `docs/20_master_execution_log.md`, `docs/30_backlog_master.md`.
- Current task: `PLAT-S04-001` (registered; BUILD pending final PLAT-S03 review).
- Repository has no `.git`; no commit/diff cleanliness claim is valid.
