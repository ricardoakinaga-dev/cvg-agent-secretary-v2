# AUD20-01 - baseline executavel

**Scope:** controlled-local, documentation and gate preparation only.
**Captured:** after checkpoint commit `98ec5e8` and before AUD20 code changes.
**Node:** `22.23.2`.
**External effects:** none.

## Identity

| Field | Value |
| --- | --- |
| branch | `main` |
| HEAD | `98ec5e80d8149f504e09f7855a3d86924e5754d3` |
| origin relation | `24` commits ahead, no push |
| worktree | clean; `git status --porcelain=v1` returned 0 rows |
| live candidateId | `b4cb18ac74610a644695bdde1d36e9234ee9322b2d7f18b5b9d600c69c93c7f7` |
| live treeHash | `68a2a2b44a4997d89c1ceeb1e999f3256489d047c4774f2b3010f48560f56d7c` |
| live gitTreeHash | `1ffd178b15bbc5c94feec60d51bd50d518274f58` |
| candidate files | `1103` |
| current pointer | `fbca3d2b6632605304aa476c61f2699ada6bcb6d5a852607bcfcca79d70f9d89` |
| current pointer commit | `fa78f92e8dd0dd3ec77a754f7eab2dfae89e15a6` |

The pointer is historical for the live tree. It is not reclassified as current
and no re-seal was performed.

## Commands and observed results

| Command | Exit | Result |
| --- | ---: | --- |
| `git diff --check` | `0` | clean |
| `npm run docs:check` | `0` | 719 links, 557 JSONs, official state and next action coherent |
| `npm exec -- vitest run tests/docs-integrity.test.js --no-file-parallelism --maxWorkers=2` | `0` | 1 file, 5 tests PASS |
| `npm run certification:verify:phase11` | `1` | `candidate_tree_stale`, candidate id/file scope drift, pointer/manifest/release mismatch |
| `npm run evidence:verify:phase11` | `1` | same stale candidate and scope drift; current evidence denied |
| `node scripts/phase11-2-evidence-check.mjs --critic` | `1` | critic binding/fingerprint/artifact digest mismatch |
| `npm run promotion:check` | `1` | `eligible=false`, `noProductionEffect=true`, 8 external blockers |
| `npm run production:preflight` | `1` | expected fail-closed, `sideEffects=false`, 32 blocking checks |

The two verifier failures and the critic failure are expected G0 negatives: the
old certificate was generated for another candidate and must not qualify the
current tree.

## Not executed in AUD20-01

- no product code, migration, Docker rebuild or image publication;
- no PostgreSQL, Playwright, full coverage or external provider run;
- no re-seal, staging, production, credentials, real data or side effect.

Those items belong to later tasks and remain gated by the matrix.
