# Phase 0 Task 03 — TypeScript Baseline

## Objetivo

Configurar TypeScript strict para todos os apps e packages.

## Arquivos a criar

- `tsconfig.base.json`
- `apps/api/tsconfig.json`
- `apps/worker/tsconfig.json`
- `apps/web/tsconfig.json`
- `packages/shared/tsconfig.json`
- `packages/persistence/tsconfig.json`
- `packages/agent-core/tsconfig.json`
- `packages/policy/tsconfig.json`
- `packages/tools/tsconfig.json`
- `packages/workflows/tsconfig.json`
- `packages/adapters/tsconfig.json`
- `packages/memory/tsconfig.json`
- `packages/rag/tsconfig.json`
- `packages/shared/src/index.ts`
- `packages/*/src/index.ts`

## Config obrigatoria

- `strict: true`
- `noUncheckedIndexedAccess: true`
- `exactOptionalPropertyTypes: true`
- `module: NodeNext`
- `moduleResolution: NodeNext`
- `declaration: true` para packages.

## Testes obrigatorios

- `tests/repository-structure.test.js` deve validar `tsconfig.json` por workspace.

## Comandos

```bash
npm run typecheck
npm test
```

## Criterio de aceite

- `npm run typecheck` passa sem `any` implicito.
- Todos os workspaces compilam no modo strict.
