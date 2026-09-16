# Phase 11.2 — Recovery Report

Status: PASS

Recovery preserves the distinction between processed, failed, dead-lettered, handoff and uncertain outcomes. The effect journal and idempotency key are checked before replay; lease tokens fence stale workers; takeover is rechecked inside the acknowledgement boundary; and a recovered/requeued outbox event is revalidated immediately before its local handler.

The controlled runtime records approval reservation, effect start, confirmation and outbox publication. A crash after an effect but before acknowledgement is reconciled through the journal or remains uncertain rather than being treated as safe absence. Goal recovery uses persisted iteration, replan and budget state.

Evidence references: `packages/agent-runtime/src/runtime.ts`, `packages/persistence/src/outbox.ts`, `apps/worker/src/jobs/process-outbox-event.ts`, `apps/worker/src/outbox-revalidation.ts`, and the recovery test suites.

This report covers synthetic and controlled-local recovery only. Provider-specific recovery, production RPO/RTO and external rollback remain unvalidated.

No production recovery proof is claimed.
