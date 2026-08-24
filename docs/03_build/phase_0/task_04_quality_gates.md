# Phase 0 Task 04 — Quality Gates

## Objetivo

Adicionar testes, lint, format e coverage como gates obrigatorios.

## Arquivos a criar

- `vitest.config.ts`
- `eslint.config.js`
- `.prettierrc.json`
- `tests/workspace-scripts.test.js`

## Dev dependencies obrigatorias

- `vitest`
- `@vitest/coverage-v8`
- `eslint`
- `typescript-eslint`
- `prettier`
- `@types/node`

## Scripts obrigatorios

```json
{
  "test": "vitest run",
  "test:coverage": "vitest run --coverage",
  "typecheck": "tsc -b",
  "lint": "eslint .",
  "format:check": "prettier --check ."
}
```

## Testes obrigatorios

- `tests/workspace-scripts.test.js` valida que os scripts acima existem.

## Comandos

```bash
npm test
npm run typecheck
npm run lint
npm run test:coverage
```

## Criterio de aceite

- Todos os comandos passam.
- Coverage command existe, mesmo antes de haver cobertura funcional alta.
- Lint nao ignora `apps` ou `packages`.
