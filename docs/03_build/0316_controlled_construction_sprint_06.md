# 0316 — Controlled Construction Sprint 06

## Status

```txt
STATUS: COMPLETED
DATA: 2026-04-29T22:12:11-03:00
SPRINT: CC-S6 — Runtime RBAC Hardening and Operator Identity
ESCOPO: substituir operadores fixos por identidade operacional controlada e reforcar RBAC runtime
```

## Objetivo

Remover operadores fixos do console e exigir identidade operacional explicita para acoes controladas. A sprint endurece as decisoes de approval/handoff e transicoes de tarefas internas sem liberar integracoes externas, agenda real, RAG real, dados reais ou acoes sensiveis.

## Tasks executadas

### CC-S6-T01 — Contrato de identidade operacional

- Arquivos principais:
  - `packages/shared/src/auth.ts`
  - `packages/shared/src/errors.ts`
  - `packages/shared/src/__tests__/shared-contracts.test.ts`
- Evidencia:
  - `OperatorIdentitySchema` valida `operatorId` e `role`.
  - `parseOperatorIdentity` le `x-operator-id` e `x-operator-role`.
  - Role `System` nao e aceita como operador humano.
  - Identificadores invalidos ou vazios falham fechado.

### CC-S6-T02 — RBAC fail-closed no API runtime

- Arquivos principais:
  - `apps/api/src/server.ts`
  - `apps/api/src/__tests__/operator-identity-rbac.test.ts`
  - `apps/api/src/__tests__/approval-actions.test.ts`
  - `apps/api/src/__tests__/task-lifecycle.test.ts`
  - `apps/api/src/__tests__/postgres-persistence-mode.test.ts`
  - `apps/api/src/__tests__/observability.test.ts`
  - `apps/api/src/__tests__/health.test.ts`
- Evidencia:
  - `POST /v1/approvals/:approvalRequestId/decision` exige headers `x-operator-id` e `x-operator-role`.
  - Ausencia de identidade retorna envelope seguro `unauthorized` e HTTP 401.
  - Role sem permissao retorna envelope seguro `forbidden` e HTTP 403.
  - Decisoes de approval usam `operatorId` dos headers, nao do body.
  - `PATCH /v1/tasks/:taskId/status` exige role `Operator` e identidade explicita.
  - Auditoria registra `actorId` e `actorType` da identidade controlada.

### CC-S6-T03 — Console com identidade operacional selecionada

- Arquivos principais:
  - `apps/web/src/App.tsx`
  - `apps/web/src/api/client.ts`
  - `apps/web/src/features/approvals/index.tsx`
  - `apps/web/src/features/tasks/index.tsx`
  - `apps/web/src/styles.css`
  - `apps/web/src/__tests__/app.test.tsx`
- Evidencia:
  - Console exibe controles para `ID do operador` e `Papel operacional`.
  - API client envia identidade pelos headers controlados.
  - Body de approvals/tasks nao carrega mais `operatorId`.
  - Acoes ficam desabilitadas quando a identidade selecionada nao possui permissao.
  - Testes confirmam ausencia de chamadas para endpoints externos.

## Gates executados

| Gate                     | Resultado                                                                 |
| ------------------------ | ------------------------------------------------------------------------- |
| `npm run typecheck`      | PASS                                                                      |
| `npm run lint`           | PASS                                                                      |
| `npm test`               | PASS — 25 files, 71 passed, 2 skipped apos auditoria complementar         |
| `npm run test:e2e`       | PASS — 1 file, 1 test                                                     |
| `npm run test:coverage`  | PASS — statements 83.90%, branches 83.04%, functions 82.84%, lines 84.97% |
| `npm run audit:security` | PASS — 0 vulnerabilities                                                  |
| `npm run readiness`      | PASS                                                                      |
| `npm run verify`         | PASS                                                                      |
| `npm run test:postgres`  | PASS — 2 files, 3 passed, 2 skipped condicionais sem `TEST_DATABASE_URL`  |

## Correcao pos-auditoria

Arquivo de evidencia: `docs/09_debug_corrections/0906_cc_s6_rbac_panel_read_audit.md`.

- `GET /v1/conversations` exige identidade com permissao `conversation:view_assigned`.
- `GET /v1/conversations/:conversationId/timeline` exige identidade com permissao `conversation:view_assigned`.
- `GET /v1/approvals` exige identidade com permissao `approval:view`.
- `GET /v1/tasks` exige identidade com permissao `task:view`.
- `GET /v1/audit/sessions/:sessionId` exige `audit:view_full` ou `audit:view_limited`.
- Console web passou a carregar dados operacionais apenas apos preenchimento de identidade.
- Teste negativo confirma HTTP 401/`unauthorized` para reads operacionais sem headers controlados.

## Observacao de formatacao

`npm run format:check` foi executado e segue falhando por formatacao pre-existente em 177 arquivos. Os arquivos tocados por CC-S6 foram formatados individualmente com Prettier para evitar churn massivo fora do escopo da sprint.

## Limites preservados

- Sem dados reais.
- Sem producao irrestrita.
- Sem canais reais.
- Sem RAG real.
- Sem confirmacao, cancelamento ou reagendamento real.
- Sem acao clinica, financeira ou prontuario definitivo.
- Identidade operacional controla apenas acoes internas e auditadas.

## Proxima sprint recomendada

`CC-S7 — Runtime Observability and Audit Evidence Hardening`: transformar logs/auditoria internos em evidencia operacional mais consultavel e preparar exportacao controlada de observabilidade, sem abrir integracoes reais sensiveis.
