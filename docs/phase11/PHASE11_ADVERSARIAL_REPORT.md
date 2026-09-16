# Phase 11.2 — Adversarial Report

Status: PASS

The deterministic red-team suite exercises false GO from a failing or non-executed gate, dirty candidates, non-zero PASS exits, profile escalation, six-source prompt integrity, all sixteen invariants, runtime stage ordering, tenant exposure, controlled-kernel composition, canonical package visibility, and outbox replay revalidation.

The adversarial contract treats a revalidation rejection as terminal for that claim, so a revoked approval or stale runtime context cannot silently reach the local effect. A requeue is an operator action only; the event must claim again and pass the same revalidation seam.

Evidence reference: `scripts/phase11-2-redteam.mjs`, `scripts/phase11-2-evidence-check.mjs`, `tests/phase11-2-certification.test.js`, and `apps/worker/src/__tests__/outbox-recovery.test.ts`.

The probes use synthetic fixtures only. No real attack against production, a provider, a channel, an identity or a customer dataset was performed or claimed.

No production adversarial run is claimed.
