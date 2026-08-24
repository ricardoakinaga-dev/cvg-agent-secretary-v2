# 0492 - Release Candidate Audit

## Status

```txt
STATUS: RELEASE_CANDIDATE_WITH_RESTRICTIONS
SPRINT: CC-S12
DATE: 2026-04-30T00:35:00-03:00
SCOPE: controlled pilot boundary, without real production release
```

## Decision

The runtime can be treated as a controlled release candidate only for fictitious, anonymized or explicitly authorized data. This audit does not approve real pilot operation, production, real external channels, real RAG, external audit export or sensitive automation.

## Required Evidence

| Gate                    | Command                 | Required Result                      |
| ----------------------- | ----------------------- | ------------------------------------ |
| Integrated verification | `npm run verify`        | PASS                                 |
| Readiness               | `npm run readiness`     | PASS                                 |
| Critical E2E            | `npm run test:e2e`      | PASS                                 |
| PostgreSQL smoke        | `npm run test:postgres` | PASS or documented conditional skips |

## Boundary Artifacts

- `docs/08_runtime/release_candidate_boundary.json`
- `docs/04_audit/pilot_report_template.md`
- `docs/04_audit/remediation_loop_template.md`
- `docs/04_audit/0491_runtime_evidence.md`

## Blocked Until Human Signoff

- Real data retention and lawful basis.
- Mapping of real hospital job titles to controlled runtime roles.
- Approved institutional RAG source list.
- Real channel configuration and dispatch policy.
- Sensitive action policy for appointment, clinical, financial and medical record flows.

## Conclusion

`RELEASE_CANDIDATE_WITH_RESTRICTIONS`: the release candidate boundary is auditable, but every real-world capability remains fail-closed until explicit human approval is recorded.
