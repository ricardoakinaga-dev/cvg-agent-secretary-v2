# Evidence — PLAT-S34 controlled CI gate parity and worker startup smoke

- task: `PLAT-S34-001_CONTROLLED_CI_GATE_PARITY`
- sprint: `PLAT-S34_CONTROLLED_CI_GATE_PARITY`
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- audit timestamp: `2026-08-25T23:43:32-03:00`
- verdict: `COMPLETED_CONTROLLED`
- release boundary: `CONTROLLED_MVP_READY`; production real remains
  `NO-GO` / `WAITING_HUMAN_APPROVAL`

## Discovery and RED

The initial S34 discovery found that `.github/workflows/verify.yml` called
verify, PostgreSQL and Playwright but omitted readiness and the worker startup
smoke, did not make `npm ci --ignore-scripts` explicit, and lacked declared
permissions/concurrency. No Dockerfile or image artifact exists in the
checkout, so a container scan was kept out of scope.

The first focused RED ran before implementation:
`npx vitest run tests/ci-workflow-contract.test.js tests/worker-startup-smoke.test.js --no-file-parallelism --maxWorkers=2`
failed 3 tests because the workflow guardrails/gates and process smoke were
absent.

After the first GREEN, an independent continuity review identified one
remaining contract gap: the SPEC/catalog required `git diff --check`, but the
workflow contract did not assert or execute it. A focused RED was reproduced
after adding that acceptance assertion: 1 of 3 tests failed because the
workflow lacked the command. The minimal fix added a dedicated workflow step
and the focused suite returned GREEN.

## Delivered boundary

- `.github/workflows/verify.yml` declares `permissions: contents: read`,
  cancelable concurrency and `persist-credentials: false` on checkout.
- CI installs with `npm ci --ignore-scripts`, then calls readiness, verify,
  worker startup smoke, PostgreSQL, Playwright and `git diff --check`.
- `scripts/worker-startup-smoke.mjs` runs the real `dev:worker` entrypoint with
  `CVG_WORKER_QUEUE_ADAPTER=''`, requires the child to exit 1, parses the
  bounded `worker.startup_failed` JSON and rejects stack/cause/bootstrap IDs.
- The wrapper reports success only after those negative assertions pass; the
  absence of a queue adapter is never converted into a fake worker success.
- No Dockerfile, registry, container scan, deploy, broker, provider, channel,
  real data or side effect was added.

## Acceptance matrix

| Criterion                                                    | Evidence                                                                                                                      | Result                                           |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| CTRL-132 — workflow least privilege and stale-run protection | workflow contract test, YAML inspection, `persist-credentials: false`                                                         | PASS controlled                                  |
| CTRL-133 — every available construction gate is explicit     | contract test plus workflow inspection for install, readiness, verify, worker smoke, PostgreSQL, E2E and diff check           | PASS controlled                                  |
| CTRL-134 — worker startup fails closed without an adapter    | focused test and process smoke; child exit 1 with `worker.startup_failed/queue_adapter_missing`, no stack/cause/bootstrap IDs | PASS controlled                                  |
| CTRL-135 — no false container-scan claim                     | repository artifact inspection and PRD/SPEC/security-boundary statements; no Dockerfile/image/scan step                       | PASS controlled as boundary; scan itself not run |

## Final executable gates

- Focused S34 suite:
  `npx vitest run tests/ci-workflow-contract.test.js tests/worker-startup-smoke.test.js --no-file-parallelism --maxWorkers=2`
  — 2 files, 3 tests pass.
- `npm run test:worker:startup` — pass; wrapper emitted
  `worker.startup_smoke_passed/queue_adapter_missing` after validating the
  real child exit 1.
- `npm run verify` — pass; 114 test files pass, 2 skipped; 411 tests pass,
  19 skipped; coverage 85.01% statements, 80.42% branches, 85.14% functions,
  85.99% lines; typecheck, lint, build, format and audit all pass; audit found
  0 vulnerabilities.
- `npm run readiness` — 1 file, 4 tests pass.
- `npm run test:e2e` — 4 Playwright browser flows pass.
- `TEST_DATABASE_URL=<ephemeral PostgreSQL 16 fixture> npm run test:postgres`
  — 8 files, 71 tests pass; the container was removed after the run.
- `git diff --check` — pass.
- Metadata JSON parse — pass for the task catalog and build tracking files.

## Independent criticism and limits

The fresh read-only Critic approved CTRL-132..135 after inspecting the real
workflow, scripts and entrypoint. It reproduced the focused contract, startup
smoke, readiness, E2E and diff checks, and accepted the full verify/PostgreSQL
metrics as supplied evidence consistent with this file; it did not rerun the
long verify or PostgreSQL fixture in that review. The review did not execute
GitHub Actions; the local evidence proves the contract and command behavior,
not hosted-runner availability. Production worker operation still requires an
approved queue adapter, distributed retry/lease policy, trusted identity/tenant
binding, operational secrets, observability and human release approval.

No real data, credentials, provider, channel, RAG, deployment, broker or
external side effect was used.
