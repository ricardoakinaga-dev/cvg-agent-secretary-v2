# AUD20-03 Lineage Report

## Scope

- Task: `AUD20-03`
- Negative: `AUD20-N03` — divergent session, conversation, envelope, objective, criteria, snapshot, or trace must not reuse a Goal.
- Boundary: synthetic controlled kernel and disposable PostgreSQL only.
- Candidate: `e258b9bef592120288ca8bd3a51d043ff66cd06f9b0fc0a61a2ab65af6f7dad7`.
- Raw evidence: `AUD20-03-raw-artifact-receipt.json` with SHA-256 bindings for every command log.

## Implementation

`assertGoalReuseCompatibility` now compares tenant, inbound message, correlation,
and one canonical fingerprint containing:

- session and conversation identifiers;
- objective and complete success criteria;
- normalized execution snapshot, including runtime binding and tool versions;
- every JSON field in the runtime-owned planner context;
- planner context type validity for message, session, and trace identifiers.

Non-canonical or malformed persisted context fails closed with the same sanitized
`conflict` error. Unknown planner fields are retained in the digest rather than
silently projected away.

When planner context carries a `messageId`, reuse additionally requires that
identity to match the Goal's tenant-scoped `inboundMessageId`; a mismatched
string identity fails closed even when the stored and incoming contexts are
otherwise byte-equivalent.

Approval continuation is a separate runtime boundary. The controlled kernel
removes the transient `approvalId` from the persisted base planner envelope, then
requires the incoming approval id to match the persisted waiting step before
resuming. A changed approval id inside the generic Goal lineage fingerprint is
rejected; a valid approval continuation is covered by the durable kernel approval
test.

## Evidence

| Check | Result |
| --- | --- |
| In-memory orchestration and branch-hardening suites | `2` files, `106/106` tests PASS |
| PostgreSQL Goal/concurrent durable-kernel focused suite | `2` files, `14/14` tests PASS |
| PostgreSQL durable outbox focused suite | `1` file, `9/9` tests PASS |
| PostgreSQL full matrix | `30` files, `331/331` tests PASS, `0` skips |
| PostgreSQL-backed full unit and coverage run | `294` files, `2360/2360` tests PASS, `0` skips; functions `95.54%` |
| Divergent fields | session, conversation, objective, criteria, snapshot, planner fields, trace, malformed context, and approval divergence rejected |
| Valid approval continuation | waiting-step approval match resumes and completes the synthetic Goal |

The PostgreSQL concurrency fixture leaves one Goal and one canonical identity;
the divergent variants do not mutate the winner.

## Limitations

- The worktree is dirty and no release candidate or staging seal is asserted.
- A fresh-context independent auditor reran the binding checks, confirmed deterministic stdout and observed no worktree mutation; the review passed.
- No real approval, provider, channel, identity, RAG, or clinical/financial data was used.
