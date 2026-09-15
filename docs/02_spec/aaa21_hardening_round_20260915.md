# AAA-21 — hardening round: durable recovery, lineage and operator inspection

**Date:** 2026-09-15
**Pipeline:** `DISCOVERY -> PRD -> SPEC -> BUILD -> AUDIT`
**Task:** `AAA-21-HARDEN-20260915`
**Release posture:** controlled candidate only; production `NO-GO`

## Scope

This round closes the highest-risk findings from the fresh audit of the durable
Goal/Plan/Step path. It covers persisted recovery, authoritative success
criteria, runtime binding, budget and timeout enforcement, approval expiry,
lineage, operator read-only inspection and recovery telemetry.

The implementation remains synthetic and tenant-scoped. It does not enable a
real provider or channel, use real data, call a clinical or financial system,
or confirm, cancel or reschedule a real appointment.

## Contracts hardened

1. **Completion is criteria-bound.** `evaluateSuccessCriteria` matches each
   declared `EVENT`, `FACT`, `STATE`, `SEMANTIC` or `COMPOSITE` criterion against
   verified evidence. An executor success by itself cannot complete a Goal.
2. **Runtime identity is durable.** A Goal records `runtimeMode` and
   `runtimeVersion`; the controlled kernel refuses a continuation with an
   unknown or different mode. Initial planning also persists a normalized
   planner context so a worker restart before first plan activation can rebuild
   the same controlled step.
3. **Budgets are absolute.** Goal duration is materialized as a deadline at
   creation and is backfilled for existing rows by migration 0020. A step
   timeout aborts the executor signal and settles as `UNCERTAIN`.
4. **Approval expiry is reconciled.** PostgreSQL expiry covers requested,
   pending and approved approvals in addition to active reservations. A
   waiting Goal whose approval expires before a decision is cancelled with an
   explicit reason.
5. **Lineage is explicit.** Goal/Plan/Step relationships are checked in the
   stores and constrained in PostgreSQL. Effect journal and outbox records
   carry the durable orchestration context when emitted by the governed
   kernel.
6. **Recovery is effect-aware.** Expired leases consult the persisted approval
   operation key and effect journal. Confirmed or failed effects can follow the
   governed replay path; missing or ambiguous identity remains `UNCERTAIN`.
7. **Evidence is observable.** Orchestrator transitions, recovery, claim and
   settlement emit spans and bounded-cardinality metrics. The worker sweep
   resumes runnable Goals and reports inspected, resumed, completed and failed
   recovery counts.
8. **Operator inspection is read-only.** Supervisor/Admin users can list and
   inspect tenant-scoped Goals, plans, steps, attempts, observations and
   evaluations. The API and responsive web panel do not expose raw step input,
   model messages, lease tokens or mutation controls.

## Persistence change

`packages/persistence/migrations/0020_orchestrator_lineage_hardening.sql`
adds:

- absolute deadline backfill;
- normalized `planner_context` storage for restart-safe initial planning;
- nullable Goal/Plan/Step/Attempt columns on `effect_journal` and
  `outbox_events` for legacy compatibility;
- indexes and composite lineage constraints for plans, steps, observations,
  evaluations and attempts;
- fail-closed checks plus deferred validation of new effect-journal and outbox
  rows against their orchestrator step and attempt lineage.

Legacy rows remain queryable. New durable kernel continuations fail closed when
their runtime identity or required lineage is absent.

## Verification contract

The candidate passed typecheck, lint, formatting, unit tests, PostgreSQL tests
against a disposable database, web/API tests, build, worker startup, security
and license checks. Candidate-bound Phase 10/11 certification was run after
the source and documentation commit under Node `22.23.2`; its result is
`CONDITIONAL_GO / AAA_CONTROLLED`.

The following gates remain external or human and cannot be inferred locally:

- real model provider and channel;
- production identity provider and operational RBAC;
- institutional RAG source approval;
- physical durability, restore and measured RPO/RTO;
- supervised pilot and human release signoff.

Therefore this round can improve the controlled candidate evidence but cannot
promote the matrix to `STATE_OF_ART_TRIPLE_AAA` or authorize production.
