# Pilot Report Template

## Metadata

```txt
PILOT_ID:
DATE:
OPERATOR:
APPROVED_FOR_REAL_DATA: false
EXTERNAL_CHANNELS_ENABLED: false
SENSITIVE_AUTOMATION_ENABLED: false
```

## GO_NO_GO_DECISION

```txt
DECISION: NO_GO_FOR_REAL_DATA_BY_DEFAULT
HUMAN_APPROVER:
RATIONALE:
```

## Scope

- Controlled pilot evidence may use fictitious, anonymized or explicitly authorized data only.
- Real channels, real RAG, external audit export and sensitive automations remain blocked unless every required signoff in `docs/08_runtime/release_candidate_boundary.json` is approved by a human owner.
- Appointment confirmation, cancellation, reschedule, clinical action, financial action and final medical record writes remain handoff-only.

## EVIDENCE_LINKS

| Evidence                | Link                                              | Result |
| ----------------------- | ------------------------------------------------- | ------ |
| Runtime evidence        | `docs/04_audit/0491_runtime_evidence.md`          |        |
| Release candidate audit | `docs/04_audit/0492_release_candidate_audit.md`   |        |
| Boundary JSON           | `docs/08_runtime/release_candidate_boundary.json` |        |
| Verification output     |                                                   |        |

## Findings

| ID  | Severity | Description | Owner | Status |
| --- | -------- | ----------- | ----- | ------ |
|     |          |             |       |        |

## Decision Notes

Document the human decision, unresolved risk and next remediation command before any expansion of the controlled pilot boundary.
