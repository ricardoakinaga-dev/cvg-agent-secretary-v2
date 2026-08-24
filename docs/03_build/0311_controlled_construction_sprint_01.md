# 0311 — Controlled Construction Sprint 01

## Status

```txt
STATUS: COMPLETED
DATA: 2026-04-29T19:09:59-03:00
SPRINT: CC-S1 — Residual Readiness Closure
ESCOPO: fechar os 5% residuais do readiness gate sem liberar producao irrestrita
```

## Objetivo

Avancar do baseline controlado para execucao real, cobrindo persistencia PostgreSQL efemera, console web com API client real, observabilidade com correlationId e CI reproduzivel.

## Tasks executadas

### CC-S1-T01 — Persistencia PostgreSQL controlada

- Arquivos principais:
  - `packages/persistence/src/postgres.ts`
  - `packages/persistence/src/__tests__/postgres-migration-smoke.test.ts`
  - `packages/persistence/src/index.ts`
- Testes:
  - `packages/persistence/src/__tests__/postgres-migration-smoke.test.ts`
- Comandos de validacao:
  - `npm test -- --run packages/persistence/src/__tests__/postgres-migration-smoke.test.ts`
  - `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:55432/cvg_test npm run test:postgres`
- Evidencia:
  - Migration aplicada em schema PostgreSQL isolado via Docker `postgres:16-alpine`.
  - Repository PostgreSQL persistiu conversa, sessao, mensagem e audit event com `correlationId`.
  - Constraint de duplicidade de mensagem foi exercitada.

### CC-S1-T02 — Web console com API client real

- Arquivos principais:
  - `apps/web/src/App.tsx`
  - `apps/web/src/api/client.ts`
  - `apps/web/src/features/conversations/index.tsx`
  - `apps/web/src/features/approvals/index.tsx`
  - `apps/web/src/features/tasks/index.tsx`
  - `apps/web/src/features/audit/index.tsx`
  - `apps/web/src/styles.css`
  - `apps/web/src/__tests__/app.test.tsx`
- Testes:
  - `apps/web/src/__tests__/app.test.tsx`
- Comandos de validacao:
  - `npm test -- --run apps/web/src/__tests__/app.test.tsx`
- Evidencia:
  - Fixtures estaticas removidas do `App`.
  - Console renderiza loading, empty state e error state.
  - Console consome `/v1/conversations/:id/timeline`, `/v1/approvals`, `/v1/tasks` e `/v1/audit/sessions/:id`.

### CC-S1-T03 — Observabilidade estruturada

- Arquivos principais:
  - `apps/api/src/server.ts`
  - `apps/api/src/__tests__/observability.test.ts`
- Testes:
  - `apps/api/src/__tests__/observability.test.ts`
- Comandos de validacao:
  - `npm test -- --run apps/api/src/__tests__/observability.test.ts`
- Evidencia:
  - Logs estruturados emitidos para inbound, approval created, approval decided, task created e audit session read.
  - Todos os logs carregam `correlationId`.
  - Logs carregam `sessionId` quando o fluxo possui sessao.

### CC-S1-T04 — CI e gates

- Arquivos principais:
  - `.github/workflows/verify.yml`
  - `package.json`
  - `package-lock.json`
  - `tests/construction-readiness.test.js`
  - `tests/workspace-scripts.test.js`
- Testes:
  - `tests/construction-readiness.test.js`
  - `tests/workspace-scripts.test.js`
- Comandos de validacao:
  - `npm run readiness`
  - `npm run verify`
- Evidencia:
  - Workflow CI agora sobe service `postgres:16-alpine`.
  - Workflow executa `npm run verify`, `npm run test:postgres` e `npm run test:e2e`.

## Gates executados

| Gate                                          | Resultado                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------- |
| `npm run typecheck`                           | PASS                                                                      |
| `npm run lint`                                | PASS                                                                      |
| `npm test`                                    | PASS — 19 files, 51 passed, 1 skipped                                     |
| `npm run test:e2e`                            | PASS — 1 file, 1 test                                                     |
| `npm run test:coverage`                       | PASS — statements 90.75%, branches 87.68%, functions 93.28%, lines 91.13% |
| `npm run audit:security`                      | PASS — 0 vulnerabilities                                                  |
| `npm run readiness`                           | PASS                                                                      |
| `npm run verify`                              | PASS                                                                      |
| `TEST_DATABASE_URL=... npm run test:postgres` | PASS — 1 file, 3 tests                                                    |

## Limites preservados

- Sem dados reais.
- Sem producao irrestrita.
- Sem RAG real.
- Sem confirmacao, cancelamento ou reagendamento real.
- Sem acao clinica, financeira ou prontuario definitivo.
- Acoes sensiveis continuam exigindo approval ou handoff.

## Proxima sprint recomendada

`CC-S2 — API persistence mode`: ligar o `buildServer` a um modo PostgreSQL controlado por env, mantendo fallback in-memory para testes e sem conectar canais reais.
