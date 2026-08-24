# Incident Playbook — Controlled Release Candidate

## Scope

This playbook covers release candidate incidents in controlled construction only. It does not authorize clinical, financial, production or real-channel incident response.

## Severity

- `P0`: boundary bypass, sensitive automation, real data exposure or missing audit trail.
- `P1`: RBAC failure, idempotency failure, approval state inconsistency or audit pagination/export approval gap.
- `P2`: UI evidence inconsistency, documentation drift or non-critical observability gap.
- `P3`: wording, template or non-blocking tracking cleanup.

## Immediate Actions

1. Stop the affected local run.
2. Capture command, endpoint, correlation ID and fictitious payload.
3. Mark the incident as blocked if it touches real data, real channels or sensitive automation.
4. Add the finding to the remediation loop.
5. Re-run gates only after the correction has a test or deterministic evidence.

## Communication

Incident notes must describe impact, boundary status, owner, revalidation command and next decision. Do not include secrets or real personal data.
