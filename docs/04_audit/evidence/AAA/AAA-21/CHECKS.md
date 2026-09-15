# AAA-21 Candidate Checks

This directory records candidate-bound evidence for the controlled AAA-21
composition. It is not a verification or production-release record.

- Candidate record: `candidate-manifest.json`.
- Candidate ID: `30bbe58f012622019d8cdc395aaccbe321c050524e5895bc31837df7d6de4467`.
- Candidate scope: 895 tracked/untracked product, config and contract files.
- Candidate file list: `candidate-files.sha256` (same 895 records as the canonical candidate record).
- Official certification run ID: `run-30bbe58f0126-mu0kq91x`.
- The focused supplementary run was `run-aaa21-mu0avldy`; it is retained as
  historical candidate-bound evidence only.
- Data: synthetic fixtures only.
- PostgreSQL: 16.15 on `127.0.0.1:55481`; port `5432` was not used.
- Node: `v24.20.0`; repository target is `>=22 <23`.

## Executed Gates

All authoritative certification logs below are copied under
`checks/full-cert/` and include the official `runId` and `candidateId` in
their source evidence. Older root-level `*-bound.log` and `*-final.log` files
are superseded captures from earlier attempts and are not used by the current
manifest.

| Gate                    | Result                                                                               | Evidence                              |
| ----------------------- | ------------------------------------------------------------------------------------ | ------------------------------------- |
| Repository format check | FAIL, 276 files reported by Prettier                                                 | `checks/full-cert/format.log`         |
| Typecheck               | PASS                                                                                 | `checks/full-cert/typecheck.log`      |
| ESLint                  | PASS                                                                                 | `checks/full-cert/lint.log`           |
| Typecheck and web build | PASS                                                                                 | `checks/full-cert/build.log`          |
| Global suite            | PASS, 249 files / 1789 tests / 0 skips                                               | `checks/full-cert/unit.log`           |
| Coverage suite          | PASS globally, 95.87% statements / 92.14% branches / 96.10% functions / 96.62% lines | `checks/full-cert/coverage.log`       |
| Dependency audit        | PASS, 0 vulnerabilities                                                              | `checks/full-cert/security.log`       |
| Worker startup smoke    | PASS                                                                                 | `checks/full-cert/worker_startup.log` |
| PostgreSQL suite        | PASS, 21 files / 188 tests / 0 skips                                                 | `checks/full-cert/postgres.log`       |
| E2E suite               | PASS, 6 files / 0 failures                                                           | `checks/full-cert/e2e.log`            |
| Agent evaluations       | PASS mechanically, 56 scenarios                                                      | `checks/full-cert/evals.log`          |
| Chaos suite             | PASS, 16 / 16 executed                                                               | `checks/full-cert/chaos.log`          |
| Synthetic load          | PASS, 10000 / 10000 processed, 0 loss, 0 duplicates                                  | `checks/full-cert/load.log`           |
| Controlled restore      | PASS integrity checks; production RPO/RTO not validated                              | `checks/full-cert/restore.log`        |
| SBOM                    | PASS                                                                                 | `checks/full-cert/sbom.log`           |
| Licenses                | PASS                                                                                 | `checks/full-cert/licenses.log`       |

The focused AAA-21/worker PostgreSQL check also passed with 6 files / 40
tests in the supplementary run `run-aaa21-mu0avldy`:
`checks/aaa21-focused-bound.log`.

## Evidence Integrity

| Check                                     | Result                                                                                         | Evidence                                         |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Candidate schema, recomputation and drift | PASS, 895 files and zero drift                                                                 | `checks/full-cert/candidate-schema.log`          |
| Candidate hash list                       | PASS, all 895 hashes verified                                                                  | `checks/full-cert/candidate-hash-validation.log` |
| Certification verifier negative self-test | PASS, executed before the certification seal; no self-test ran after the seal                  | `checks/full-cert/self-test.log`                 |
| AAA plan validator                        | PASS, 42 tasks / 20 areas / 15 findings / acyclic DAG                                          | `checks/full-cert/plan-validation.log`           |
| Current certification verification        | FAIL only because required gate `format` is FAIL; 29 artifact hashes and coherence checks pass | `checks/full-cert/certification-verify.log`      |

## Quality Bar

- Global Vitest thresholds are configured at `80/80/80/80` and passed.
- The frozen AAA-04 v2 bar requires at least 95% branches in critical modules;
  this candidate does not satisfy that requirement.
- Observed critical branch coverage includes `kernel-composition.ts` 76.92%,
  `postgres-controlled.ts` 89.00%, `postgres-role-preflight.ts` 87.87% and
  `packages/agent-runtime/src/composition.ts` 80.00%.
- The official repository format gate reports 276 files with style issues;
  the full list is in `checks/full-cert/format.log`.
- The official eval gate passes its mechanical threshold, but task success is
  `0.9464285714285714`, below the AAA target of `0.97`.

## Covered Scenarios

- `buildServer.inject` writes a synthetic inbound event to PostgreSQL and the
  worker consumes it through the kernel composition.
- Governed-kernel default and explicit published-agent legacy selection are
  tested; unknown runtime and unconfigured frontier fail closed.
- Workflow mapping, session injection and persisted-correlation mismatch are
  covered by negative tests.
- Approved synthetic effect is durable in the effect journal and
  `audit_events`; replay does not create a second effect.
- `UNCERTAIN` journal state is not automatically retried.
- Worker restart/SIGTERM, lease release, role preflight, RLS and missing-table
  rejection are covered with disposable PostgreSQL schemas.

## Limitations

- This package does not assert `VERIFIED`, `DONE` or a release decision.
- No external channel, provider, IdP, patient/financial record, real effect,
  deploy, homologation or production environment was used.
- The focused integration uses Fastify `inject`, not a separately deployed HTTP
  process; process restart evidence covers worker entrypoint behavior, not a
  full deployed API-to-worker process restart.
- No LangGraph dependency or real frontier adapter is introduced; the injected
  frontier is synthetic and the governed kernel remains the authority.
- Physical durability, production RPO/RTO, soak, full mutation, holdout and
  Docker image gates remain `NOT_RUN` or unavailable.
- Provider, channel and external identity remain `NOT_VALIDATED`; human
  signoff remains `PENDING`.
- The canonical backlog still has
  `buildAuthorization=NOT_GRANTED_BY_THIS_PLANNING_DELIVERY` and the runtime
  state still records AAA-21 as `READY`; this manifest does not override those
  records.

The official certification result is `certification/phase10-result.json` and
records 15 passed gates, 1 failed gate (`format`), and `NO_GO`. Its logs and
reports are copied under `checks/full-cert/`.

## Final controlled closure pass — 2026-09-14

The post-hardening evidence is recorded in [FINAL-REPORT.md](FINAL-REPORT.md),
[final-round-20260914.json](final-round-20260914.json) and the concise command
capture [checks/aaa21-final-summary.log](checks/aaa21-final-summary.log). This
pass supersedes no frozen bar and grants no production or external gate.

| Check                                                     | Result                                                                                            |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Full Vitest regression                                    | PASS — 245 files, 1,719 passed, 109 conditional skips                                             |
| Coverage                                                  | PASS mechanically, below AAA — 92.10% statements, 87.20% branches, 90.95% functions, 92.71% lines |
| Typecheck, lint, build, security, licenses, startup, plan | PASS                                                                                              |
| Touched-file Prettier                                     | PASS                                                                                              |
| PostgreSQL suite                                          | PARTIAL/BLOCKED — 13 files, 85 passed, 107 skipped; `TEST_DATABASE_URL` absent                    |
| Global format                                             | FAIL — 277 historical worktree files                                                              |
| Playwright visual                                         | PASS — 4 tests; shell 375/768/1024/1440 and populated DLQ panel 375/1024                          |
| Audit evidence checkpoint                                 | PASS — 1 test                                                                                     |
| Fresh read-only critics                                   | C2/C3/C4 BLOCKED on PostgreSQL; C7 controlled PASS, formal BLOCKED on PostgreSQL                  |

The final run keeps the controlled candidate at `REVIEW`, with `productionNoGo`
and `externalAuthorization=NOT_GRANTED` unchanged.
