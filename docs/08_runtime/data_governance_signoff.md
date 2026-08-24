# Data Governance Signoff — Controlled Release Candidate

## Status

```txt
APPROVED_FOR_REAL_DATA: false
APPROVED_FOR_REAL_PILOT: false
APPROVED_FOR_PRODUCTION: false
HUMAN_DECISION_REQUIRED: true
```

## Current Decision

The release candidate is approved only for controlled review with fictitious, anonymized or explicitly human-authorized data. No real patient, tutor, financial, schedule, medical record or institutional document corpus data is approved by this signoff.

## Missing Signoffs

- Real-data retention table by data class.
- Responsible owner for retention and deletion decisions.
- Real hospital role mapping to runtime RBAC roles.
- Approved institutional RAG source, version and update cadence.
- Real channel owner and operational escalation path.
- Sensitive action policy for scheduling, clinical, financial and medical record operations.

## Operational Rule

If a test, demo or pilot request requires data outside the allowed classes, the run must stop and the runtime state must move to `WAITING_HUMAN_APPROVAL` or `BLOCKED`.
