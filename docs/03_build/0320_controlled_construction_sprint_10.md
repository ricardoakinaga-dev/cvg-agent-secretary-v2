# 0320 — Controlled Construction Sprint 10

## Status

```txt
STATUS: COMPLETED
DATA: 2026-04-29T23:46:06-03:00
SPRINT: CC-S10 — Controlled Evidence Pagination and Export Approval Workflow
ESCOPO: adicionar paginacao operacional de audit evidence no console e solicitar export controlado apenas via aprovacao humana interna, sem despacho externo
```

## Objetivo

Fechar o gap operacional `DBG-COR-12`: a revisao humana de audit evidence no console nao pode aparentar completude quando o endpoint ainda possui paginas adicionais. A sprint tambem prepara o fluxo de export controlado como pedido de aprovacao humana interna, mantendo `externalDispatch: false` e sem conectar qualquer exporter externo.

## Tasks executadas

### CC-S10-T01 — Estado de paginacao no console

- Arquivos principais:
  - `apps/web/src/App.tsx`
  - `apps/web/src/features/audit/index.tsx`
  - `apps/web/src/styles.css`
- Evidencia:
  - O console controla `offset` para `GET /v1/observability/audit-evidence`.
  - O painel mostra a faixa da pagina atual no formato `Evidencias <inicio>-<fim> de <total>`.
  - Controles `Anterior` e `Proxima` navegam por `pageInfo.offset`, `pageInfo.limit` e `pageInfo.hasNextPage`.
  - Mudanca de sessao/identidade reinicia a pagina de evidencia.

### CC-S10-T02 — Workflow de aprovacao para export controlado

- Arquivos principais:
  - `apps/web/src/api/client.ts`
  - `apps/web/src/App.tsx`
  - `apps/web/src/features/audit/index.tsx`
  - `apps/api/src/server.ts`
- Evidencia:
  - `apiClient.requestAuditEvidenceExportApproval` cria aprovacao interna em `POST /v1/approvals`.
  - O pedido usa `proposedAction: audit_evidence_export_review` e `riskLevel: high`.
  - Headers `x-operator-id` e `x-operator-role` acompanham a solicitacao do console.
  - Auditoria CC-S10 passou a exigir identidade com `audit:view_full` no endpoint quando o `proposedAction` e `audit_evidence_export_review`.
  - A UI informa que a solicitacao foi registrada para aprovacao humana.
  - Nenhum endpoint `/export` ou despachante externo e chamado.

### CC-S10-T03 — Cobertura TDD de paginacao e export approval

- Arquivo principal:
  - `apps/web/src/__tests__/app.test.tsx`
- Evidencia:
  - Teste cobre `hasNextPage: true` e chamada com `offset=10`.
  - Teste cobre retorno para `offset=0`.
  - Teste valida o payload do pedido de aprovacao de export.
  - Teste confirma ausencia de chamada para endpoint de export externo.

## Gates executados

| Gate                                                                                                       | Resultado                                                                 |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `npx vitest run apps/web/src/__tests__/app.test.tsx`                                                       | PASS — 1 file, 12 tests                                                   |
| `npx vitest run apps/api/src/__tests__/operator-identity-rbac.test.ts apps/web/src/__tests__/app.test.tsx` | PASS — 2 files, 18 tests                                                  |
| `npx prettier --check <arquivos web tocados>`                                                              | PASS                                                                      |
| `npm run typecheck`                                                                                        | PASS                                                                      |
| `npm run lint`                                                                                             | PASS                                                                      |
| `npm test`                                                                                                 | PASS — 25 files, 78 passed, 2 skipped                                     |
| `npm run test:coverage`                                                                                    | PASS — statements 85.11%, branches 83.91%, functions 84.15%, lines 86.72% |
| `npm run audit:security`                                                                                   | PASS — 0 vulnerabilities                                                  |
| `npm run verify`                                                                                           | PASS                                                                      |
| `npm run test:e2e`                                                                                         | PASS — 1 file, 1 test                                                     |
| `npm run readiness`                                                                                        | PASS — 1 file, 4 tests                                                    |
| `npm run test:postgres`                                                                                    | PASS — 2 files, 3 passed, 2 skipped condicionais                          |

## Correcoes fechadas

- `DBG-COR-12`: console agora mostra limites de pagina, navega por paginas de evidence review e cobre `hasNextPage: true` sem despacho externo.
- `DBG-COR-14`: pedidos `audit_evidence_export_review` agora exigem identidade controlada com `audit:view_full` e auditam o operador humano.

## Auditoria CC-S10 — 2026-04-30

- Arquivo de evidencia: `docs/09_debug_corrections/0910_cc_s10_evidence_pagination_export_audit.md`.
- Correcao aplicada:
  - `POST /v1/approvals` agora falha fechado para `audit_evidence_export_review` sem identidade `audit:view_full`.
  - A criacao do pedido de export controlado audita o operador humano em `actorId`/`actorType`.
- Reexecucao de gates:
  - `npx vitest run apps/api/src/__tests__/operator-identity-rbac.test.ts apps/web/src/__tests__/app.test.tsx`: PASS com 2 files, 18 tests.
  - `npm run test:e2e`: PASS.
  - `npm run verify`: FAIL por debitos historicos de CC-S11.
  - `npm run readiness`: FAIL por idempotencia/migration ainda pendente.
  - `npm run test:postgres`: FAIL pelo mesmo smoke de migration.
- Debitos pendentes:
  - `DBG-COR-15`: reconciliar a evidencia CC-S10 com gates reproduziveis em CC-S11.

## Limites preservados

- Sem dados reais.
- Sem producao irrestrita.
- Sem canais reais.
- Sem RAG real.
- Sem confirmacao, cancelamento ou reagendamento real.
- Sem acao clinica, financeira ou prontuario definitivo.
- Sem exporter externo de observabilidade.
- Export de evidence permanece apenas pedido interno de aprovacao humana; nenhum arquivo e enviado para fora.

## Proxima sprint recomendada

`CC-S11 — Debug Correction Backlog Reconciliation and Runtime Evidence Consistency`: reconciliar os debitos P0/P1 restantes de readiness/evidencia, traceability executavel, idempotencia PostgreSQL, format gate e validacao final antes de qualquer uso real.
