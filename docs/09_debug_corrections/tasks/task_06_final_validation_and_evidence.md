# Task 06 - Final Validation And Evidence

## ID

DBG-COR-06

## Prioridade

P1

## Finding relacionado

- DBG-F07

## Objetivo

Executar validacao final completa e atualizar evidencia oficial.

## Arquivos permitidos

- `docs/09_debug_corrections/0903_correction_backlog.json`
- `docs/09_debug_corrections/0904_validation_matrix.json`
- `docs/03_build/0310_construction_readiness_95.json`
- `docs/03_build/0310_construction_readiness_95.md`
- `docs/04_audit/0491_runtime_evidence.md`
- `docs/20_master_execution_log.md`
- `docs/99_runtime_state.md`

## Passos

1. Confirmar que `DBG-COR-01` a `DBG-COR-05` estao completos.
2. Executar todos os comandos de `acceptance_tests.md`.
3. Subir PostgreSQL efemero e executar `npm run test:postgres` com `TEST_DATABASE_URL`.
4. Executar HTTP smoke.
5. Atualizar `0904_validation_matrix.json` com resultados finais.
6. Marcar backlog como completo.
7. Atualizar runtime evidence.
8. Atualizar readiness com score defensavel.
9. Atualizar master execution log.
10. Atualizar runtime state.

## Testes

```bash
npm run format:check
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run test:coverage
npm run audit:security
npm run readiness
npm run verify
TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:<PORT>/cvg_test npm run test:postgres
```

## Definition of Done

- Todos os comandos passam.
- PostgreSQL real efemero executa sem skip dos testes reais.
- HTTP smoke passa.
- `0903_correction_backlog.json` nao tem P0/P1 pendente.
- `0904_validation_matrix.json` registra resultados finais.
- `docs/99_runtime_state.md` aponta para proxima sprint controlada.
