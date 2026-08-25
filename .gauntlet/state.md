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

| ID      | Criterion                                                           | Required evidence                                                          | Current state                              |
| ------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------ |
| CTRL-01 | Agent/version config is immutable and tenant-scoped                 | unit, API, E2E and PostgreSQL controlled gates                             | PASS controlled                            |
| CTRL-02 | Gateway, policy, approval and Test Lab fail closed                  | focused tests, trace redaction and independent review                      | PASS controlled                            |
| CTRL-03 | Legacy Secretary remains operational in fixture mode                | full verify, API/E2E and PostgreSQL smoke                                  | PASS controlled                            |
| PROD-01 | Trusted IdP identity is tenant-bound and RBAC is authoritative      | issuer/audience/key rotation and negative authorization evidence           | BLOCKED human/infra                        |
| PROD-02 | Legacy data plane is database-enforced tenant isolated              | versioned migration, forced RLS, pool context, cross-tenant negative tests | CONTROLLED PASS; real rollout blocked      |
| PROD-03 | Approval issuer/verifier is durable, scoped, expiring and revocable | persistent authority, replay/expiry/revocation tests and audit chain       | BLOCKED                                    |
| PROD-04 | Legacy ToolRegistry executes only through one capability gateway    | adapter contract, side-effect audit and deny-by-default tests              | BLOCKED                                    |
| PROD-05 | Distributed rate limit, replay/HMAC and host security are enforced  | Redis/edge configuration and integration evidence                          | BLOCKED human/infra                        |
| PROD-06 | Control plane has optimistic multi-operator conflict handling       | version/ETag conflict tests and UI recovery                                | CONTROLLED PASS; real coordination blocked |
| PROD-07 | Provider/channel adapters are durable, leased and compensating      | fake and contract tests plus human-approved activation boundary            | BLOCKED human/infra                        |
| PROD-08 | Audit, retention, purge and PII governance are operational          | tenant-aware append-only schema, purge evidence and signoff                | BLOCKED human                              |

## Quality bar v2 — PLAT-S05 controlled closure

| ID      | Criterion                                                                | Required evidence                                       | Current state   |
| ------- | ------------------------------------------------------------------------ | ------------------------------------------------------- | --------------- |
| CTRL-05 | Test Lab identifies sensitive veterinary medication requests safely      | red/green platform and legacy policy tests              | PASS controlled |
| CTRL-06 | Test Lab trace is investigation-complete without raw sensitive payloads  | trace contract, persistence, API/UI and redaction tests | PASS controlled |
| CTRL-07 | Capability gateway rejects malformed scope IDs before handler resolution | negative gateway tests and no handler invocation        | PASS controlled |
| CTRL-08 | Control Center preserves configured knowledge provenance                 | UI request regression and browser/API evidence          | PASS controlled |
| CTRL-09 | Legacy Secretary and controlled production boundary remain unchanged     | full verify, readiness, E2E and audit review            | PASS controlled |
| CTRL-10 | Development bootstrap exposes one immutable `CVG Secretary` preset       | preset lifecycle and API bootstrap tests                | PASS controlled |

## Stop rule

Do not claim `PRODUCTION_REAL_DATA_READY` while any PROD criterion lacks evidence or requires a human/infrastructure decision. Continue controlled construction through the remaining safe lanes and leave the goal active until the full bar is met or the same external blocker repeats for three consecutive goal turns.

## Continuity

- Canonical project state: `docs/99_runtime_state.md`, `docs/20_master_execution_log.md`, `docs/30_backlog_master.md`.
- Current task: `PLAT-S10-001_PLUGIN_CATALOG_CONTROL_CENTER` (COMPLETED_CONTROLLED; AUDIT closed).

## Quality bar v6 — PLAT-S09 controlled plugin manifest catalog

| ID      | Criterion                                                            | Required evidence                         | Current state   |
| ------- | -------------------------------------------------------------------- | ----------------------------------------- | --------------- |
| CTRL-22 | Catalog metadata is tenant-scoped and manifest identity is immutable | memory/repository lifecycle and RLS tests | PASS controlled |
| CTRL-23 | Duplicate name/version and stale transitions fail closed             | negative lifecycle/API/PostgreSQL tests   | PASS controlled |
| CTRL-24 | APPROVED metadata never grants handler or external execution         | API/boundary review and no-dispatch tests | PASS controlled |

- Repository snapshot is published on `main`; current changes remained scoped to the registered PLAT-S09 task and were verified before any publication.
- Parallel scout/reviewer dispatch was attempted for backend, frontend and security review, but the available child-agent models rejected execution due account usage/model limits. Lead-only deterministic audit is recorded as a limitation, not independent approval.

## Closure

- `docs/platform/final-technical-audit.md` is the current technical decision record for this checkout.
- Controlled release is `CONTROLLED_MVP_READY`; production release remains `WAITING_HUMAN_APPROVAL`/`NO-GO` until every PROD criterion has evidence and infrastructure signoff.
- PLAT-S06-001 is completed under controlled limits: persistent TestCase/TestSuite catalog, redacted evaluation history and A/B comparison only in Test Lab. PLAT-S07-001 is completed under controlled limits: stale lifecycle preconditions, HTTP 409 recovery and no success audit on conflict. No production authorization changed.

## Quality bar v3 — PLAT-S06 controlled suite catalog

| ID      | Criterion                                                      | Required evidence                                      | Current state   |
| ------- | -------------------------------------------------------------- | ------------------------------------------------------ | --------------- |
| CTRL-11 | Test suites are tenant/agent/version scoped and immutable      | store/API lifecycle and cross-tenant tests             | PASS controlled |
| CTRL-12 | Evaluation history is redacted and never dispatches externally | persistence/evaluation tests and `externalCall: false` | PASS controlled |
| CTRL-13 | A/B comparison validates same tenant/agent and remains dry-run | negative scope tests and API contract                  | PASS controlled |
| CTRL-14 | Legacy runtime and production boundary remain unchanged        | full verify, readiness, E2E and PostgreSQL smoke       | PASS controlled |

## PLAT-S06 controlled closure

- `PLAT-S06-001` = `COMPLETED_CONTROLLED`; evidence is `docs/04_audit/0496_plat_s06_suite_catalog_evidence.md`.
- Final controlled bar: 67 test files, 243 passing tests, 15 conditional skips; coverage 84.40% statements, 80.23% branches, 84.72% functions and 85.24% lines; PostgreSQL fixture 6 files/64 tests; E2E 1 flow; audit 0 vulnerabilities.
- No production authorization changed. `PRODUCTION_REAL_DATA_READY` remains blocked by the PROD criteria and human/infrastructure decisions.

## Quality bar v4 — PLAT-S07 optimistic conflict control

| ID      | Criterion                                               | Required evidence                                | Current state   |
| ------- | ------------------------------------------------------- | ------------------------------------------------ | --------------- |
| CTRL-15 | Stale lifecycle precondition cannot mutate a version    | memory/API negative tests and HTTP 409           | PASS controlled |
| CTRL-16 | PostgreSQL keeps compare-and-swap inside transaction    | repository/fixture conditional update evidence   | PASS controlled |
| CTRL-17 | Conflict emits no success audit or external side effect | API audit assertions and boundary review         | PASS controlled |
| CTRL-18 | Legacy calls and production boundary remain unchanged   | full verify, readiness, E2E and PostgreSQL smoke | PASS controlled |

## Quality bar v4 closure — PLAT-S07

- `PLAT-S07-001` = `COMPLETED_CONTROLLED`; evidence is `docs/04_audit/0497_plat_s07_optimistic_conflict_evidence.md`.
- Final controlled bar: 67 test files, 247 passing tests, 15 conditional skips; coverage 84.82% statements, 80.18% branches, 85.13% functions and 85.69% lines; readiness 4/4; E2E 1/1; PostgreSQL fixture 6 files/49 passed/15 skips; audit 0 vulnerabilities.
- No production authorization changed. Full distributed multi-operator coordination, IdP, HA, real RLS rollout, provider/channel operations, retention/PII and sensitive actions remain blocked.

## Quality bar v5 — PLAT-S08 plugin manifest integrity

| ID      | Criterion                                                              | Required evidence                                     | Current state   |
| ------- | ---------------------------------------------------------------------- | ----------------------------------------------------- | --------------- |
| CTRL-19 | Manifest collections and tool permissions are semantically consistent  | schema RED/GREEN tests                                | PASS controlled |
| CTRL-20 | Plugin versions are immutable and resolution is deterministic/pinnable | registry/gateway tests for pinned and legacy bindings | PASS controlled |
| CTRL-21 | Missing pinned version fails closed without handler or external effect | gateway negative test and boundary review             | PASS controlled |

## Quality bar v5 closure — PLAT-S08

- `PLAT-S08-001` = `COMPLETED_CONTROLLED`; evidence is `docs/04_audit/0498_plat_s08_plugin_manifest_versioning_evidence.md`.
- Final controlled bar: 68 test files, 250 passing tests, 15 conditional skips; coverage 84.88% statements, 80.17% branches, 85.22% functions and 85.74% lines; readiness 4/4; E2E 1/1; PostgreSQL fixture 6 files/49 passed/15 skips; audit 0 vulnerabilities.
- No production authorization changed. Marketplace, persistent plugin lifecycle, network-installed code, provider/channel operations, IdP, HA, retention/PII and sensitive actions remain blocked.

## Quality bar v6 closure — PLAT-S09

- `PLAT-S09-001` = `COMPLETED_CONTROLLED`; evidence is `docs/04_audit/0499_plat_s09_plugin_catalog_evidence.md`.
- Final controlled bar: 71 test files, 253 passing tests, 16 conditional skips; coverage 84.73% statements, 80.11% branches, 84.40% functions and 85.67% lines; readiness 4/4; E2E 1/1; PostgreSQL fixture 6 files/49 passed/16 skips; audit 0 vulnerabilities; format and diff check passed.
- No production authorization changed. Marketplace/installation of third-party code, persistent executable handlers, provider/channel operations, IdP, HA, retention/PII and sensitive actions remain blocked.

## Quality bar v7 — PLAT-S10 controlled plugin catalog Control Center

| ID      | Criterion                                                            | Required evidence                                 | Current state   |
| ------- | -------------------------------------------------------------------- | ------------------------------------------------- | --------------- |
| CTRL-25 | Catalog client sends identity and tenant scope on every request      | client contract tests and API boundary inspection | PASS controlled |
| CTRL-26 | UI lists/creates only validated metadata without secrets or code     | UI RED/GREEN tests and request body inspection    | PASS controlled |
| CTRL-27 | Approval/archive uses expectedStatus and surfaces stale conflict     | UI/API client tests with HTTP 409                 | PASS controlled |
| CTRL-28 | APPROVED remains metadata-only and cannot enable execution           | explicit UI warning, API/catalog boundary tests   | PASS controlled |
| CTRL-29 | Existing AgentVersion/Test Lab and release boundary remain unchanged | full verify, readiness, E2E and audit             | PASS controlled |

- No migration, handler, network install, provider/channel, real data or side effect is authorized by v7.

## Quality bar v7 closure — PLAT-S10

- `PLAT-S10-001` = `COMPLETED_CONTROLLED`; evidence is `docs/04_audit/0500_plat_s10_plugin_catalog_control_center_evidence.md`.
- Final controlled bar: 72 test files, 257 passing tests, 16 conditional skips; coverage 84.97% statements, 80.21% branches, 84.93% functions and 85.90% lines; readiness 4/4; E2E 1/1; PostgreSQL fixture 4 files/49 passed/16 skips; audit 0 vulnerabilities; format and diff check passed.
- No production authorization changed. Marketplace/installation, executable handlers, provider/channel operations, IdP, HA, retention/PII and sensitive actions remain blocked.
