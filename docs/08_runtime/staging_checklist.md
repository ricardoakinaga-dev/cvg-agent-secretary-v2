# Staging Checklist — Controlled Release Candidate

## Release Candidate Status

```txt
STATUS: RELEASE_CANDIDATE_WITH_RESTRICTIONS
APPROVED_FOR_REAL_DATA: false
APPROVED_FOR_REAL_CHANNELS: false
APPROVED_FOR_REAL_RAG: false
APPROVED_FOR_EXTERNAL_AUDIT_EXPORT: false
APPROVED_FOR_SENSITIVE_AUTOMATION: false
```

## Required Gates

- `npm run verify`
- `npm run test:e2e`
- `npm run readiness`
- `npm run test:postgres`
- `npm run test:worker:startup`
- `git diff --check`
- HTTP smoke with `/health` and controlled fictitious webhook payload

## Boundary Checklist

- Release candidate boundary JSON is present and parseable.
- Data governance signoff keeps real data blocked.
- RBAC real-role mapping remains pending.
- RAG source approval remains pending.
- Real channel configuration remains pending.
- Sensitive scheduling, clinical, financial and medical record actions remain blocked.
- Audit evidence review uses pagination and internal export approval request only.

## Exit Criteria

The release candidate may be marked audit-ready only when all gates pass and no document authorizes real rollout. Real pilot requires separate human signoff.
