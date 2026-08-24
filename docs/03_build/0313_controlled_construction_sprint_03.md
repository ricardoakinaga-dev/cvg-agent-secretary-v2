# 0313 — Controlled Construction Sprint 03

## Status

```txt
STATUS: COMPLETED
DATA: 2026-04-29T20:10:37-03:00
SPRINT: CC-S3 — Conversation List and Operator Console
ESCOPO: expor listagem paginada de conversas no API e conectar o console web a essa listagem
```

## Objetivo

Remover IDs controlados do bootstrap visual do console web e fazer o operador descobrir conversas pelo runtime real da API, mantendo fallback in-memory, modo PostgreSQL controlado e todos os bloqueios sensiveis.

## Tasks executadas

### CC-S3-T01 — API paginada de conversas

- Arquivos principais:
  - `apps/api/src/server.ts`
  - `apps/api/src/routes/conversations.ts`
  - `packages/persistence/src/schema.ts`
  - `packages/persistence/src/repositories/conversation-repository.ts`
  - `packages/persistence/src/postgres.ts`
- Testes:
  - `apps/api/src/__tests__/conversation-list.test.ts`
  - `apps/api/src/__tests__/postgres-persistence-mode.test.ts`
- Evidencia:
  - `GET /v1/conversations?limit=25&offset=0` retorna `items` e `pageInfo`.
  - Parametros invalidos retornam envelope seguro com `invalid_pagination` e HTTP 400.
  - A listagem funciona em memoria e no repository PostgreSQL efemero.

### CC-S3-T02 — Console sem IDs de bootstrap

- Arquivos principais:
  - `apps/web/src/App.tsx`
  - `apps/web/src/api/client.ts`
  - `apps/web/src/features/conversations/index.tsx`
  - `apps/web/src/styles.css`
- Testes:
  - `apps/web/src/__tests__/app.test.tsx`
- Evidencia:
  - O console chama `/v1/conversations?limit=25&offset=0` antes de timeline/audit.
  - O primeiro item da listagem define a timeline e auditoria iniciais.
  - A selecao de outra conversa carrega timeline e audit pelo `conversationId` e `openSessionId` reais da API.
  - Nao ha fallback para `conv_demo_controlled` nem `sess_demo_controlled`.

## Gates executados

| Gate                                          | Resultado                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------- |
| `npm run typecheck`                           | PASS                                                                      |
| `npm run lint`                                | PASS                                                                      |
| `npm test`                                    | PASS — 21 files, 55 passed, 2 skipped                                     |
| `npm run test:e2e`                            | PASS — 1 file, 1 test                                                     |
| `npm run test:coverage`                       | PASS — statements 81.85%, branches 83.05%, functions 80.00%, lines 82.70% |
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
- Acoes sensiveis continuam exigindo approval ou handoff.

## Proxima sprint recomendada

`CC-S4 — Operator actions and approval queue`: implementar fluxo operacional de decisao no console para approvals e handoffs, preservando bloqueio de execucao automatica real e registrando auditoria por `correlationId`.
