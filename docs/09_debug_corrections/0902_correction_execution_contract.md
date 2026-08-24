# 0902 - Correction Execution Contract

## Regra principal

O agente executor deve corrigir os gaps auditados sem ampliar escopo de produto. Cada alteracao deve ter teste, comando de validacao e evidencia atualizada.

## Ordem obrigatoria

1. Ler `docs/99_runtime_state.md`.
2. Ler `docs/09_debug_corrections/0900_debug_corrections_index.md`.
3. Ler `docs/09_debug_corrections/0901_audit_findings.md`.
4. Ler `docs/09_debug_corrections/0903_correction_backlog.json`.
5. Seguir `docs/09_debug_corrections/implementation_order.md`.
6. Executar uma task por vez.
7. Atualizar evidencia apos cada task.

## Bloqueios absolutos

- Nao usar dados reais.
- Nao conectar canais reais.
- Nao conectar agenda real.
- Nao liberar RAG real.
- Nao automatizar confirmacao, cancelamento ou reagendamento real.
- Nao executar acao clinica, financeira ou prontuario definitivo.
- Nao remover aprovacao humana de acoes sensiveis.
- Nao apagar historico de docs, logs ou tracking.

## TDD obrigatorio

Para cada correcao em codigo:

1. Criar ou ajustar teste que falhe pelo gap auditado.
2. Implementar a menor correcao.
3. Executar teste especifico.
4. Executar gate global definido em `0904_validation_matrix.json`.
5. Atualizar documentos de evidencia.

## Definition of Done global

Todos os comandos abaixo devem passar no fim:

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

O teste PostgreSQL deve usar banco real efemero. Resultado com skip nao fecha esta fila.

## Evidencia obrigatoria

Atualizar:

- `docs/09_debug_corrections/0903_correction_backlog.json`
- `docs/09_debug_corrections/0904_validation_matrix.json`
- `docs/04_audit/0491_runtime_evidence.md`
- `docs/03_build/0310_construction_readiness_95.json`
- `docs/03_build/0310_construction_readiness_95.md`
- `docs/20_master_execution_log.md`
- `docs/99_runtime_state.md`

## Politica de readiness

- Readiness `100` so e permitido quando todos os findings `DBG-F01` a `DBG-F07` estiverem fechados.
- Enquanto qualquer `P0` ou `P1` estiver aberto, readiness maximo permitido: `90`.
- Se qualquer gate global falhar, status deve ser `BLOCKED`.

## Politica de fallback

- Modo default da API continua `memory`.
- Modo PostgreSQL so pode ativar com `API_PERSISTENCE_MODE=postgres` e `DATABASE_URL`.
- `POSTGRES_AUTO_MIGRATE` continua opt-in.
- Canais externos reais continuam bloqueados.
