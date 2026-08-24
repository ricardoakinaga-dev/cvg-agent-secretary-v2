# Phase 0 Task 02 — NPM Workspaces

## Objetivo

Configurar `npm` workspaces para `apps/*` e `packages/*`.

## Arquivos a modificar

- `package.json`
- `package-lock.json`

## Arquivos a criar

- `apps/api/package.json`
- `apps/worker/package.json`
- `apps/web/package.json`
- `packages/shared/package.json`
- `packages/persistence/package.json`
- `packages/agent-core/package.json`
- `packages/policy/package.json`
- `packages/tools/package.json`
- `packages/workflows/package.json`
- `packages/adapters/package.json`
- `packages/memory/package.json`
- `packages/rag/package.json`

## Nomes obrigatorios dos packages

- `@cvg/api`
- `@cvg/worker`
- `@cvg/web`
- `@cvg/shared`
- `@cvg/persistence`
- `@cvg/agent-core`
- `@cvg/policy`
- `@cvg/tools`
- `@cvg/workflows`
- `@cvg/adapters`
- `@cvg/memory`
- `@cvg/rag`

## Scripts obrigatorios na raiz

- `test`
- `typecheck`
- `lint`
- `test:coverage`
- `audit:security`

## Testes obrigatorios

- Atualizar `tests/repository-structure.test.js` para validar package names.

## Comandos

```bash
npm install
npm test
```

## Criterio de aceite

- `npm install` atualiza lockfile sem erro.
- `npm test` passa.
- Todos os workspaces aparecem em `package-lock.json`.
