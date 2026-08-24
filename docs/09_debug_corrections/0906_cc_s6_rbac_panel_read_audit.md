# 0906 - CC-S6 RBAC Panel Read Audit And Correction

## Status

```txt
STATUS: COMPLETED
DATA: 2026-04-29T22:43:33-03:00
ESCOPO: auditoria de CC-S6 e correcao de RBAC fail-closed em reads operacionais
MODO: controlled_construction_only
```

## Decisao de auditoria

CC-S6 estava correta para acoes mutaveis sensiveis, mas incompleta para a superficie de painel. A SPEC exige autenticacao/autorizacao em endpoints de painel e auditoria:

- `docs/02_spec/0107_contratos_de_api.md`: endpoints de painel exigem autenticacao e autorizacao por papel.
- `docs/02_spec/0111_permissoes_governanca_e_auditoria.md`: API operacional e endpoints de auditoria exigem autenticacao obrigatoria.

## Finding corrigido

### DBG-F08 - Reads operacionais sem identidade controlada

- Severidade: HIGH.
- Evidencia:
  - `GET /v1/conversations`
  - `GET /v1/conversations/:conversationId/timeline`
  - `GET /v1/approvals`
  - `GET /v1/tasks`
  - `GET /v1/audit/sessions/:sessionId`
- Problema:
  - Esses endpoints retornavam dados operacionais sem `x-operator-id` e `x-operator-role`.
  - Isso contrariava o contrato de painel e deixava auditoria/tarefas/approvals visiveis sem identidade humana rastreavel.

## Correcoes aplicadas

- `packages/shared/src/auth.ts`
  - Adicionadas permissoes de leitura operacional: `approval:view`, `task:view`, `audit:view_limited` e `conversation:view_assigned`.
  - Mantido `System` fora de `OperatorIdentitySchema`.
- `apps/api/src/server.ts`
  - `GET /v1/conversations` exige `conversation:view_assigned`.
  - `GET /v1/conversations/:conversationId/timeline` exige `conversation:view_assigned`.
  - `GET /v1/approvals` exige `approval:view`.
  - `GET /v1/tasks` exige `task:view`.
  - `GET /v1/audit/sessions/:sessionId` exige `audit:view_full` ou `audit:view_limited`.
  - Respostas sem identidade retornam `unauthorized` com HTTP 401.
  - Roles sem permissao retornam `forbidden` com HTTP 403.
- `apps/web/src/api/client.ts`
  - Reads do painel agora enviam identidade operacional nos headers.
- `apps/web/src/App.tsx`
  - Console so carrega dados operacionais apos preenchimento de identidade.
  - A identidade continua controlando as acoes permitidas por role.
- Testes atualizados/adicionados:
  - `apps/api/src/__tests__/operator-identity-rbac.test.ts`
  - `apps/api/src/__tests__/conversation-list.test.ts`
  - `apps/api/src/__tests__/health.test.ts`
  - `apps/api/src/__tests__/observability.test.ts`
  - `apps/api/src/__tests__/approval-actions.test.ts`
  - `apps/api/src/__tests__/task-lifecycle.test.ts`
  - `apps/api/src/__tests__/postgres-persistence-mode.test.ts`
  - `apps/web/src/__tests__/app.test.tsx`
  - `tests/e2e/critical-flows.test.ts`

## Limites preservados

- Sem dados reais.
- Sem producao irrestrita.
- Sem canais reais.
- Sem RAG real.
- Sem confirmacao, cancelamento ou reagendamento real.
- Sem acao clinica, financeira ou prontuario definitivo.
- Nenhuma integracao externa nova foi habilitada.

## Gates executados

| Gate                     | Resultado                                                                 |
| ------------------------ | ------------------------------------------------------------------------- |
| `npm run typecheck`      | PASS                                                                      |
| `npm run lint`           | PASS                                                                      |
| `npm test`               | PASS - 25 files, 71 passed, 2 skipped                                     |
| `npm run test:coverage`  | PASS - statements 83.90%, branches 83.04%, functions 82.84%, lines 84.97% |
| `npm run audit:security` | PASS - 0 vulnerabilities                                                  |
| `npm run verify`         | PASS                                                                      |
| `npm run test:e2e`       | PASS - 1 file, 1 test                                                     |
| `npm run readiness`      | PASS - 1 file, 4 tests                                                    |
| `npm run test:postgres`  | PASS - 2 files, 3 passed, 2 conditional skips                             |

## Observacoes

- `npm run test:postgres` foi executado sem `TEST_DATABASE_URL`, portanto manteve os 2 skips condicionais do caminho PostgreSQL real.
- `npm run format:check` continua fora de `verify` e permanece como debito pre-existente registrado em `DBG-F06`.
- Apenas arquivos tocados nesta rodada foram formatados com Prettier.
