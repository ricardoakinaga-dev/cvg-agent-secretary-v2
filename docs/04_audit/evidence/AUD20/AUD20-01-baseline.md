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

## Candidate-bound package manifest

The AUD20-01 documentation package was committed as `c198343424bdc170fc8d26003ffc6965ebe26bb8`.
The generated manifest records the complete candidate file list and SHA-256
values for the package scope:

| Field | Value |
| --- | --- |
| candidateId | `bea683171cc2bf5ae7b3d7254a231cc4f7716555d0d8ea000661027a23fc4767` |
| commit | `c198343424bdc170fc8d26003ffc6965ebe26bb8` |
| treeHash | `c032c47c2f819fef44666ab650a26001904a2a602fdbe6394e4378719422abf9` |
| gitTreeHash | `8259ec41eb67fe0058323cb2b2c1faf88b495bc7` |
| fileCount | `1104` |
| manifest SHA-256 | `3ec9e740325eccfb5c65b53bf4248769b97f6492eae037a8548bb01d740a56c2` |
| dirty | `false` |

Manifest: `docs/04_audit/evidence/AUD20/AUD20-01-candidate-manifest.json`.
The evidence directory is excluded from the product candidate scope; the
manifest never contains file contents or secrets.

Live receipt: `docs/04_audit/evidence/AUD20/AUD20-01-live-candidate-receipt.json`.
All candidate identity assertions were recomputed from the live repository and
returned `PASS` under Node `22.23.2`.

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

Sanitized command receipt: `docs/04_audit/evidence/AUD20/AUD20-01-command-receipt.json`.
It records each command, exit code, stdout/stderr digest and structured summary
without persisting secrets or raw sensitive payloads.

## Not executed in AUD20-01

- no product code, migration, Docker rebuild or image publication;
- no PostgreSQL, Playwright, full coverage or external provider run;
- no re-seal, staging, production, credentials, real data or side effect.

Those items belong to later tasks and remain gated by the matrix.

## G0 transition candidate

After the formal transition commit `3af8f5f809f930706576c9bafea1f4f355c8d093`,
the live builder receipt was regenerated before the post-transition review:

| Field | Value |
| --- | --- |
| candidateId | `a836d615c2f051b2a8fc0cf610757682dc0f3c345d41e3ec10b2ef1903748fbe` |
| commit | `3af8f5f809f930706576c9bafea1f4f355c8d093` |
| treeHash | `49523fbdb5979231a6239a5b1ff43bc3bf84d94305099a373b1e8886ac9021fb` |
| gitTreeHash | `f887e695059031368374daf23449f929d088a4cb` |
| fileCount | `1104` |
| manifest SHA-256 | `dfa12b17341a4af1fa0128e762891dd88e7af6ffff9f7d2c7849f0670862b33a` |
| live receipt SHA-256 | `fdb267c5259f4c659362dfc8604e7c47f34d1458da308527aa2c3d911508a6a6` |
| command receipt SHA-256 | `3d2c95c4127a9a28d62198e42e9338b0adf633e8fcd502222c7968897ae8e2dc` |

The transition candidate preserves the same candidate-scope rule: evidence
files are not included in the product bytes, while the live receipt proves the
identity fields against `buildPhase11Candidate`.
