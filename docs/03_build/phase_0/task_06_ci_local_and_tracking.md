# Phase 0 Task 06 — CI Local and Tracking

## Objetivo

Criar comando unico de verificacao local e manter tracking tecnico atualizado.

## Arquivos a criar ou modificar

- `package.json`
- `docs/03_build/tracking/build_tracking.json`
- `docs/03_build/phase_0/sprint_0_tracking.json`

## Script obrigatorio

```json
{
  "verify": "npm run typecheck && npm run lint && npm test && npm run test:coverage && npm audit --audit-level=high"
}
```

## Testes obrigatorios

- `tests/workspace-scripts.test.js` deve validar script `verify`.
- `tests/docs-readiness.test.js` deve validar JSONs de tracking.

## Comandos

```bash
npm run verify
```

## Criterio de aceite

- `npm run verify` roda sem prompt interativo.
- Tracking JSON registra status da sprint.
- Se audit tiver only moderate, registrar no backlog; high/critical bloqueia.
