# Remediation Loop Template

## Finding

```txt
ID:
SEVERITY:
SOURCE:
OWNER:
STATUS:
```

## Impact

Describe the affected flow, user impact, data exposure risk and rollout implication.

## Correction Plan

| Step | Owner | Expected Evidence | Status |
| ---- | ----- | ----------------- | ------ |
|      |       |                   |        |

## REVALIDATION_COMMANDS

```sh
npm run verify
npm run readiness
npm run test:e2e
npm run test:postgres
```

## Closure Criteria

- The finding has a committed fix or documented non-code correction.
- Evidence is linked in the pilot report or audit report.
- The release boundary remains fail-closed for real data, real channels, real RAG, external export and sensitive automations.
