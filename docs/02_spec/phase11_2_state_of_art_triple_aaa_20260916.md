# Phase 11.2 — State of Art Triple AAA closure contract

**Pipeline:** `DISCOVERY -> PRD -> SPEC -> BUILD -> AUDIT`
**Task:** `PHASE11.2-TRIPLE-AAA-20260916`
**Gate:** `SPEC_APPROVED_CONTROLLED_BUILD`
**Release posture:** `CONTROLLED_LOCAL / PRODUCTION_NO_GO`

## Authority and source

The six supplied prompt files were read before implementation and preserved
byte-for-byte in [`prompt-master/20260916-triple-aaa`](../11_phase11/prompt-master/20260916-triple-aaa/README.md).
The active repository constitution and the existing Phase 11.1 contract remain
authoritative. This contract closes the new formal audit without erasing the
Phase 11.1 history or claiming real-world qualification.

The user request authorizes local implementation and synthetic verification
only. It does not authorize a provider, channel, external identity, approved
institutional RAG source, real patient/customer data, clinical/financial/record
mutation, production deployment, pilot, or human release sign-off.

## Problem statement

The prior controlled implementation contains the durable orchestration kernel,
effect journal, lease fencing, lineage and operator read model. Its remaining
closure risk is not a wholesale rewrite: the current certification package is
ignored/not visible by default, the new six-source prompt set is not bound to
the current runner, production configuration has no standalone fail-closed
preflight, and the adversarial proof/report topology does not yet distinguish
local engineering closure from external qualification.

## Contract

1. The six prompt sources, their SHA-256 values and read provenance are
   immutable repository evidence. The previous five-source and fourteen-source
   sets remain historical evidence.
2. `certification/phase11/` and `certification/current.json` are visible,
   tracked canonical artifacts. They are excluded from the behavior candidate
   digest so evidence can be committed after a source commit without a
   self-referential Git hash cycle. The certificate records both the behavior
   anchor and the package commit; verification accepts only a descendant
   package commit whose candidate-scoped bytes are unchanged.
3. All mandatory gate statuses are recomputed from raw evidence. `PASS` with a
   non-zero exit, missing/not-executed required evidence, stale candidate,
   tampered pointer/artifact, dirty candidate scope, or an open P0/P1 blocks.
4. Replan, loop, budget, fencing, crash/unknown effect, outbox replay,
   tenant/governance and trace/lineage behavior remains fail-closed and is
   tested through public seams plus disposable PostgreSQL where available.
5. `production:preflight` rejects production-like configuration unless the
   durable kernel, PostgreSQL/RLS/migrations, trusted identity, policy/risk,
   approval, effect journal and explicit external gates are all present. It has
   no side effect.
6. The result has separate booleans and evidence for
   `localEngineeringClosure`, `externalIntegrationClosure`,
   `supervisedPilotClosure` and `productionAssuranceClosure`. Local success is
   at most `CONDITIONAL_GO / AAA_CANDIDATE`; production remains `NO_GO` here.
7. Human-readable delta, orchestrator proof, security, adversarial, recovery,
   chaos, load, integration and independent-critic reports are generated or
   explicitly mark unavailable evidence as `NOT_EXECUTED`/`BLOCKED`.

## Definition of done

- six prompts copied and hash-verified;
- Phase 11.2 quality bar and delta audit frozen before product BUILD;
- canonical artifacts visible in the branch and current verifier passes after a
  package commit;
- fail-closed production preflight and negative-validation corpus pass;
- focused runtime, persistence, worker, API and console regressions pass;
- fresh visual/state critic and fresh technical critic are independent and
  mutation-sentinel checked;
- full local gates are executed with Node 22 and disposable PostgreSQL when
  available; absent external authority remains explicitly blocked;
- runtime state, execution log, backlog and evidence are updated in that order;
- no production action, real data, or external effect occurs.
