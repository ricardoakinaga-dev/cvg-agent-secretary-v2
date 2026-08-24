# 0312 — Controlled Construction Sprint 02

## Status

```txt
STATUS: COMPLETED
DATA: 2026-04-29T19:33:16-03:00
SPRINT: CC-S2 — API Persistence Mode
ESCOPO: ligar API runtime a modo PostgreSQL controlado por env mantendo fallback in-memory
```

## Objetivo

Permitir que o `buildServer` opere com persistencia PostgreSQL controlada quando explicitamente configurado, sem remover o modo in-memory usado nos testes e sem liberar qualquer integracao real ou acao sensivel.

## Tasks executadas

### CC-S2-T01 — API persistence mode fail-closed

- Arquivos principais:
  - `apps/api/src/server.ts`
  - `apps/api/src/main.ts`
  - `.env.example`
- Testes:
  - `apps/api/src/__tests__/postgres-persistence-mode.test.ts`
- Evidencia:
  - `buildServerFromEnv({ API_PERSISTENCE_MODE: 'postgres' })` falha fechado sem `DATABASE_URL`.
  - `API_PERSISTENCE_MODE=memory` continua funcional.
  - `POSTGRES_AUTO_MIGRATE=true` existe como controle explicito; default permanece `false`.

### CC-S2-T02 — PostgreSQL-backed API runtime

- Arquivos principais:
  - `packages/persistence/src/postgres.ts`
  - `apps/api/src/server.ts`
- Testes:
  - `apps/api/src/__tests__/postgres-persistence-mode.test.ts`
  - `packages/persistence/src/__tests__/postgres-migration-smoke.test.ts`
- Evidencia:
  - API executou inbound, duplicate detection, timeline, approval, decision, task e audit contra PostgreSQL efemero.
  - O repository PostgreSQL preserva `correlationId` em logs e audit events.
  - Fallback in-memory permanece padrao quando `API_PERSISTENCE_MODE` nao e `postgres`.

### CC-S2-T03 — CI script coverage for API Postgres mode

- Arquivos principais:
  - `package.json`
  - `tests/workspace-scripts.test.js`
- Evidencia:
  - `npm run test:postgres` agora cobre `packages/persistence/src/__tests__/postgres-migration-smoke.test.ts` e `apps/api/src/__tests__/postgres-persistence-mode.test.ts`.

## Gates executados

| Gate                                          | Resultado                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------- |
| `npm run typecheck`                           | PASS                                                                      |
| `npm run lint`                                | PASS                                                                      |
| `npm test`                                    | PASS — 20 files, 52 passed, 2 skipped                                     |
| `npm run test:e2e`                            | PASS — 1 file, 1 test                                                     |
| `npm run test:coverage`                       | PASS — statements 82.22%, branches 84.85%, functions 80.89%, lines 82.35% |
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

`CC-S3 — Conversation list and operator console`: expor listagem paginada de conversas no API e conectar o console web a essa listagem, removendo os ids controlados do bootstrap visual.
