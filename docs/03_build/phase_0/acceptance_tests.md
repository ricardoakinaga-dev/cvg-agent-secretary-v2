# Phase 0 — Acceptance Tests

## Objetivo

Definir os testes obrigatorios para considerar a Phase 0 pronta.

## Testes documentais

Arquivo: `tests/docs-readiness.test.js`

Deve validar:

- Todos os documentos deterministas de build existem.
- Todos os JSONs de build sao parseaveis.
- `docs/99_runtime_state.md` permanece `WAITING_HUMAN_APPROVAL` enquanto decisoes enterprise estiverem abertas.
- `docs/04_audit/0490_audit_report.md` permanece `NOT_READY_FOR_BUILD_EXECUTION`.

## Testes de estrutura

Arquivo futuro: `tests/repository-structure.test.js`

Deve validar:

- `apps/api`, `apps/worker`, `apps/web` existem.
- Todos os packages listados em `0305_repository_target_structure.json` existem.
- Cada package tem `package.json`, `tsconfig.json`, `src/index.ts`.
- Nenhum package fora da arvore alvo foi criado.

## Testes de qualidade

Arquivos futuros:

- `tests/workspace-scripts.test.js`
- `packages/shared/src/__tests__/shared-contracts.test.ts`

Devem validar:

- `npm test` executa testes reais.
- `npm run typecheck` existe.
- `npm run lint` existe.
- `npm run test:coverage` existe.
- `packages/shared` exporta contratos base sem depender de app.

## Testes de seguranca

Arquivo futuro: `packages/shared/src/__tests__/env.test.ts`

Deve validar:

- `.env.example` existe.
- Env schema falha fechado quando uma variavel obrigatoria estiver ausente.
- Nenhum valor de `.env.example` parece segredo real.

## Criterio final da Phase 0

```txt
npm test = PASS
npm run typecheck = PASS
npm run lint = PASS
npm run test:coverage = PASS
npm audit --audit-level=high = PASS or documented non-high finding
```
