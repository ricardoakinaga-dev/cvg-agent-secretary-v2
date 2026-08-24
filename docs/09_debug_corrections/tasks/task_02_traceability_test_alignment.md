# Task 02 - Traceability Test Alignment

## ID

DBG-COR-02

## Prioridade

P0

## Finding relacionado

- DBG-F03

## Objetivo

Garantir que cada teste listado em `docs/03_build/0304_traceability_matrix.json` exista ou seja um comando externo explicitamente permitido.

## Arquivos permitidos

- `docs/03_build/0304_traceability_matrix.json`
- `docs/03_build/0304_traceability_matrix.md`
- `tests/docs-readiness.test.js`
- `apps/web/src/features/conversations/conversations.test.tsx`
- `apps/web/src/features/conversations/timeline.test.tsx`
- `apps/web/src/features/approvals/approvals.test.tsx`
- `apps/web/src/features/tasks/tasks.test.tsx`
- `apps/web/src/features/audit/audit-view.test.tsx`

## Passos

1. Adicionar teste em `tests/docs-readiness.test.js` que percorra `required_tests` da matriz.
2. O teste deve validar existencia de cada arquivo que terminar em `.test.ts`, `.test.tsx` ou `.test.js`.
3. Criar os testes de feature web que a matriz ja exige.
4. Se algum teste listado for comando e nao arquivo, registrar padrao permitido no teste de docs.
5. Executar `npm test`.

## Testes

```bash
npm test
npm run verify
```

## Definition of Done

- `npm test` falha se a matriz apontar para arquivo inexistente.
- Todos os testes listados na matriz existem.
- Testes web por feature passam.
- A matriz continua parseavel como JSON.
