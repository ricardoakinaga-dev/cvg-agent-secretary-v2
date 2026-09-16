# Phase 10 historical certification

The preserved Phase 10 package under `certification/logs/historical/2026-09-11-phase10/` is an immutable historical input. It can be checked only with:

```bash
npm run certification:verify:historical
```

It does not qualify the current candidate. Current certification truth is resolved exclusively through `certification/current.json` and the canonical `certification/phase11/` package.
