# IMP50-42 — preparation for human SPEC review — 2026-09-23

## Disposition

- candidate: `IMP50-42`, under the completed parent `AUD20-08`;
- proposed child registration: `AUD20-08-FU1`;
- lane: R8 independent local DX/documentation;
- state: `DRAFT_PENDING_HUMAN_REVIEW`; not admitted to BUILD;
- PLAN50 accepted: `0/50`; product BUILD slices: `0`;
- candidate/release hash: none;
- staging/production: `NO_GO`.

The completed `AUD20-08` remains completed. The follow-up is recorded as a
proposal because its launcher behavior was not explicit in the approved SPEC.
The approval for the parent task does not approve this SPEC.

## Recovered baseline

- `.nvmrc` and `.node-version` both contain `22.23.2`.
- `package.json` requires Node `>=22 <23` and exposes `docs:check` as a normal
  Node script; no local Node 22 launcher is currently present.
- The current shell starts Node `v24.20.0`, while the exact `v22.23.2` binary
  is locally installed under NVM.
- `scripts/lib/docs-state-check.mjs` returns `node_runtime_mismatch` when the
  observed process runtime differs from the exact pin.
- The prior PLAN50 gate review recorded the expected behavior: `docs:check`
  failed closed under Node 24 and passed under Node 22. This is baseline
  evidence, not acceptance evidence for a launcher.

## Pipeline and proposed slice

The follow-up reuses approved [Discovery 0017](../../../00_discovery/0017_aud20_08_state_node_reconciliation.md)
and [PRD 0028](../../../01_prd/0028_aud20_08_state_node_reconciliation.md):
the product requirement is an exact, reproducible Node runtime, with a
wrong-runtime shell rejected and explicit Node 22 execution supported. Only
the HOW is new: offer a local command to select an already-installed runtime.
The new [SPEC proposal](../../../02_spec/aud20_08_imp50_42_node22_launcher_20260923.md)
defines the resolver, failure behavior, interface, negatives, and rollback.

Proposed acceptance boundary:

- public command: `npm run node22 -- npm run docs:check`;
- starting from Node 24, child `node --version` reports `v22.23.2`;
- missing local Node 22, pin drift, or empty argv fail closed before child
  execution;
- no auto-install, network call, profile edit, cwd change, or argument
  re-parsing;
- plain `npm run docs:check` retains its existing `node_runtime_mismatch`
  behavior under Node 24.

Proposed files after approval: `scripts/with-node22.sh`, `package.json`,
`tests/node22-launcher.test.js`, and `docs/README.md`. Proposed rollback removes
those additions only and preserves current pins/checker.

## Verification this round

This is documentation-only preparation. It ran no product tests, changed no
executable source, and created no release candidate.

- `npm run docs:check` under host Node `v24.20.0`: exit `1`; 913 links checked,
  0 broken; 612 JSON files checked, 0 invalid; semantic failure was solely
  `node_runtime_mismatch` for observed Node `v24.20.0`.
- `PATH=/home/ricardo/.nvm/versions/node/v22.23.2/bin:$PATH npm run docs:check`:
  exit `0`; 913 links, 612 JSON files, state and next-action checks valid under
  observed Node `v22.23.2`.
- Same pinned PATH with `npm run format:check`: exit `0`, all matched files
  formatted.
- `git diff --check`: exit `0`.
- Fresh-context independent critic `imp50_42_spec_critic`, independence `I1`:
  `APPROVE` for boundedness, pipeline reuse, fail-closed behavior and pending
  human gate; zero writes and zero tests. Two P2 recommendations were added to
  the draft: observable no-installer sentinels and explicit tests for both
  `NVM_DIR` precedence and `$HOME/.nvm` fallback. This reviewer is not the
  required human approval.

## Gate and next action

The SPEC requires a human decision because it adds a resolver command under a
completed parent task. Until then, do not edit the proposed executable files.
The critical roadmap action remains review/approval of `AUD20-17` / `IMP50-40`;
this R8 proposal is a separate waiting lane and does not reorder that action.
