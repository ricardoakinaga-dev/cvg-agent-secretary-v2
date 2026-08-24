# Operator Runbook — Controlled Release Candidate

## Scope

This runbook is valid only for controlled construction and release candidate review. It does not authorize real patient data, real WhatsApp channels, real institutional RAG, external audit export, scheduling execution, clinical action, financial action or final medical record writes.

## Operator Entry Conditions

- Runtime state is `READY_FOR_NEXT_STEP` or `CONTROLLED_CONSTRUCTION_ACTIVE`.
- `docs/08_runtime/release_candidate_boundary.json` allows release candidate review and blocks real pilot operation.
- Operator identity is provided through the controlled RBAC headers used by the current runtime.
- Test data is fictitious, anonymized or explicitly authorized by a human decision.
- Audit evidence is available through the controlled audit console.

## Routine Procedure

1. Check `/health` before any runtime exercise.
2. Create or inspect only fictitious/anonymized conversations.
3. Review conversation timeline, tasks, approvals and audit events.
4. Use approvals only for internal review actions.
5. Keep audit evidence export as an approval request only; do not dispatch external export.
6. Record any defect in the remediation loop template.

## Stop Conditions

- Any request requires real patient data without retention signoff.
- Any request targets a real channel, real RAG source or external exporter.
- Any workflow attempts to confirm, cancel or reschedule a real appointment.
- Any workflow suggests diagnosis, prescription, financial execution or medical record finalization.
- RBAC headers are missing, ambiguous or inconsistent with the action.

## Escalation

Stop the run, preserve correlation IDs and register the finding in `docs/04_audit/remediation_loop_template.md` before continuing.
