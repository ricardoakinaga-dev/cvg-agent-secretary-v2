# Rollback Playbook — Controlled Release Candidate

## Scope

Rollback applies only to controlled construction environments. No production rollback is implied because production and real pilot operation remain blocked.

## Trigger Conditions

- `npm run verify`, `npm run readiness`, `npm run test:e2e` or `npm run test:postgres` fails.
- Runtime smoke fails on `/health` or controlled webhook ingestion.
- Audit events lose `correlationId`.
- RBAC allows a sensitive action without the required role.
- Boundary JSON or signoff docs authorize real rollout without human decision.

## Rollback Steps

1. Stop the active local API/worker process.
2. Disable any non-default persistence mode by removing runtime env overrides.
3. Return to `API_PERSISTENCE_MODE=memory` unless the test explicitly requires PostgreSQL.
4. Preserve logs, command output and correlation IDs.
5. Register the issue in the remediation loop.
6. Re-run the failing command after correction.

## Data Handling

Do not copy real data into debugging artifacts. Use only fictitious payloads and redact any accidental sensitive field before recording evidence.
