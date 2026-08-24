# 0315 — Controlled Construction Sprint 05

## Status

```txt
STATUS: COMPLETED
DATA: 2026-04-29T20:40:15-03:00
SPRINT: CC-S5 — Task Lifecycle and Operator Task Board
ESCOPO: permitir transicoes controladas de tarefas internas pelo console/API com auditoria por correlationId
```

## Objetivo

Permitir que tarefas internas avancem no runtime controlado sem disparar integracoes externas. A sprint cobre transicoes `open -> in_progress/done/canceled` e `in_progress -> done/canceled`, com estados terminais protegidos.

## Tasks executadas

### CC-S5-T01 — Task lifecycle API

- Arquivos principais:
  - `apps/api/src/server.ts`
  - `packages/persistence/src/repositories/task-repository.ts`
  - `packages/persistence/src/postgres.ts`
- Testes:
  - `apps/api/src/__tests__/task-lifecycle.test.ts`
  - `apps/api/src/__tests__/postgres-persistence-mode.test.ts`
- Evidencia:
  - `PATCH /v1/tasks/:taskId/status` valida status, operador e role `Operator`.
  - Transicoes terminais invalidas retornam envelope seguro `invalid_action` e HTTP 400.
  - Cada transicao registra `integration_event` com `correlationId`, `fromStatus`, `toStatus` e `effect: internal_task_state_only`.
  - Repository PostgreSQL persiste a transicao de status em smoke efemero.

### CC-S5-T02 — Operator task board

- Arquivos principais:
  - `apps/web/src/App.tsx`
  - `apps/web/src/api/client.ts`
  - `apps/web/src/features/tasks/index.tsx`
  - `apps/web/src/__tests__/app.test.tsx`
- Evidencia:
  - Console exibe acoes `Iniciar`, `Concluir` e `Cancelar` conforme status da tarefa.
  - Apos transicao, o console recarrega tarefas e auditoria da sessao selecionada.
  - Testes confirmam que a UI nao chama endpoints de integracao externa.

## Gates executados

| Gate                                          | Resultado                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------- |
| `npm run typecheck`                           | PASS                                                                      |
| `npm run lint`                                | PASS                                                                      |
| `npm test`                                    | PASS — 23 files, 62 passed, 2 skipped                                     |
| `npm run test:e2e`                            | PASS — 1 file, 1 test                                                     |
| `npm run test:coverage`                       | PASS — statements 81.73%, branches 81.55%, functions 80.38%, lines 82.80% |
| `npm run audit:security`                      | PASS — 0 vulnerabilities                                                  |
| `npm run readiness`                           | PASS                                                                      |
| `npm run verify`                              | PASS                                                                      |
| `TEST_DATABASE_URL=... npm run test:postgres` | PASS — 2 files, 5 tests                                                   |

## Limites preservados

- Sem dados reais.
- Sem producao irrestrita.
- Sem canais reais.
- Sem RAG real.
- Sem confirmacao, cancelamento ou reagendamento real.
- Sem acao clinica, financeira ou prontuario definitivo.
- Transicoes de tarefa alteram apenas estado interno e auditoria.

## Proxima sprint recomendada

`CC-S6 — Runtime RBAC hardening and operator identity`: substituir operadores fixos do console por identidade operacional controlada, reforcar permissao por role e manter bloqueios sensiveis.
