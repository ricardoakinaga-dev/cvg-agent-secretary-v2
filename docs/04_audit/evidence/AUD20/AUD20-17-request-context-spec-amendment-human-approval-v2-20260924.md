# Human approval and BUILD admission — AUD20-17 / IMP50-40 request-context v2

- Recorded at: `2026-09-24T01:56Z`.
- Authority: explicit user response in this conversation.
- Question ID: `call_Mz0rSaGHVDgm5zYQwb7UjLh9`.
- Exact answer: `Aprovar SPEC + BUILD local controlado`.
- Approved amendment: [request-context v2 proposal](AUD20-17-request-context-spec-amendment-proposal-v2-20260924.md), 13,713 bytes, SHA-256
  `1cb72b0e097ad19539c1f14fbdc892542ae9ddabf716bba00eef20b1c4cb237c`.
  The fresh-context SPEC critic returned `PASS_FOR_HUMAN_REVIEW` for those
  exact bytes.
- Decision: `SPEC_APPROVED_CONTROLLED_BUILD`. This record separately registers
  the local BUILD admission required by the proposal; it does not accept C01–C07
  or the broader `IMP50-40` task.
- Admitted scope: only the proposal's allowlist: `apps/api/src/server.ts`,
  `apps/api/src/server/request-context.ts`,
  `apps/api/src/__tests__/request-context.test.ts`,
  `apps/api/src/__tests__/server-boundary-envelope.test.ts`,
  `apps/api/src/__tests__/webhook-security.test.ts`,
  `tests/architecture.test.js`, and task/review/candidate evidence records.
- Required first action: build an isolated request-context-v1 reconstruction
  using the exact query-parser rollback transformation, verify the prescribed
  line counts and hashes, and attribute all query-parser test changes. Stop
  before source edits on any mismatch or attribution gap.
- Acceptance remains open: C02 must be measured on the reconstructed v1 and
  integrated candidates; C06 still requires every frozen quality floor and
  required gate, including PostgreSQL with zero required skips and teardown;
  C07 requires a fresh independent review after the last write.
- Excluded: API/schema change, real data, external integration, commit, push,
  deploy, staging, and production. PostgreSQL use remains subject to its
  separately admitted synthetic gate.
