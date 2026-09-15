# AAA-21 hardening round — audit evidence

**Task:** `AAA-21-HARDEN-20260915`
**Date:** 2026-09-15
**Decision:** `CONDITIONAL_GO / AAA_CONTROLLED` for local controlled evidence
**Production:** `NO-GO`

## Delivered evidence

- durable Goal recovery is connected to the worker sweep;
- Goal/Plan/Step inspector is tenant-scoped, read-only and redacted;
- success criteria are evaluated against verified persisted evidence;
- runtime mode/version and normalized initial planner context survive restart;
- absolute Goal deadlines and abortable step timeouts are enforced;
- expired approvals are reconciled before waiting Goals remain orphaned;
- Goal/Plan/Step lineage is validated in memory and PostgreSQL;
- effect journal and outbox rows receive orchestration lineage from the
  governed kernel;
- recovery and settlement emit bounded telemetry;
- migration 0020 is exercised against a disposable PostgreSQL schema.

## Executed checks

The focused hardening checks passed:

- TypeScript typecheck;
- ESLint;
- Prettier for the increment;
- `git diff --check` excluding generated certification output;
- focused orchestration/effect/approval/sweep/API/web checks: `7 files, 120
  passed`;
- full unit suite: `249 files, 1,743 passed, 116 skipped`;
- full PostgreSQL suite: `23 files, 199 passed`;
- Node `22.23.2` build;
- worker startup smoke;
- `npm audit --audit-level=high` with zero vulnerabilities;
- license check: `372` packages, `0` denied and `0` unclassified.

The final candidate-bound certification passed under Node `22.23.2`; the
commit and candidate identities are recorded in the generated Phase 10 and
Phase 11 manifests for this round. Phase 10 and Phase 11 gates, including E2E
`8/8`, PostgreSQL `23/199`, the candidate-clean check and the Node target,
passed. The mechanical result is `CONDITIONAL_GO / AAA_CONTROLLED`; external
provider/channel/identity and human signoff remain unvalidated.

## Residual findings and release limits

The implementation is still partial against the Phase 11 matrix. Remaining
limits include the public path being opt-in, external provider/channel and
identity validation, institutional knowledge approval, physical restart and
RPO/RTO evidence, global historical formatting debt, and human signoff.

No real data or external effect was used. The controlled kernel's appointment
capabilities remain synthetic and approval-gated; real confirm, cancel and
reschedule actions remain unavailable.
