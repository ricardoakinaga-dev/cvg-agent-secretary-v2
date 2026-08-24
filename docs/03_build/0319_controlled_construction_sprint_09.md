# 0319 — Controlled Construction Sprint 09

## Status

```txt
STATUS: COMPLETED
DATA: 2026-04-29T23:26:23-03:00
SPRINT: CC-S9 — Audit Retention and Evidence Governance
ESCOPO: definir governanca de retencao controlada, minimizar payloads de audit evidence e fechar indices de filtros antes de qualquer exporter externo
```

## Objetivo

Fechar a camada de governanca da evidencia de auditoria antes de qualquer uso com dados reais ou exportador externo. A sprint adiciona politica runtime de retencao controlada, redacao/minimizacao de payloads, metadata de governanca no endpoint e indices PostgreSQL para os filtros de evidencia.

## Tasks executadas

### CC-S9-T01 — Contrato de governanca e redacao

- Arquivos principais:
  - `packages/shared/src/audit-governance.ts`
  - `packages/shared/src/index.ts`
  - `packages/shared/src/__tests__/shared-contracts.test.ts`
- Evidencia:
  - `auditEvidenceGovernance` define politica `controlled-construction-audit-retention-v1`.
  - Retencao permanece controlada: `approvedForRealData: false` e `humanSignoffRequired: true`.
  - `sanitizeAuditEvidencePayload` remove campos sensiveis como `token`, `secret`, `authorization`, `body`, `phone`, `senderRef`, `externalMessageId` e campos clinicos.
  - Auditoria CC-S9 reforcou a redacao de PII comum: `email`, `cpf`, `cnpj`, `document`, `patientName`, `address`, datas de nascimento, `rg` e `taxId`.
  - Sanitizacao preserva chaves operacionais seguras como `sessionId`, `effect`, status e metadados internos.

### CC-S9-T02 — Endpoint de evidencia com payload minimizado

- Arquivos principais:
  - `apps/api/src/server.ts`
  - `apps/api/src/__tests__/audit-evidence.test.ts`
- Evidencia:
  - `GET /v1/observability/audit-evidence` retorna `governance` com retencao, payload minimizado e export control.
  - `page.items[].payload` passa por minimizacao antes de sair da API.
  - `governance.payload.redactedFields` registra os caminhos removidos na pagina atual.
  - Teste positivo cobre filtros combinados por `sessionId`, `type` e `actorId`.
  - Auditoria CC-S9 confirmou consistencia entre `summary.totalEvents` e `page.pageInfo.total` no filtro combinado.
  - `externalDispatch` permanece `false`.

### CC-S9-T03 — Console com sinal de governanca

- Arquivos principais:
  - `apps/web/src/api/client.ts`
  - `apps/web/src/features/audit/index.tsx`
  - `apps/web/src/__tests__/app.test.tsx`
- Evidencia:
  - Web client tipa a metadata opcional de governanca.
  - Painel mostra a policy de retencao e `Dados reais bloqueados` quando `approvedForRealData` e falso.
  - Testes do console confirmam a exibicao do sinal de governanca em revisao de evidencia.

### CC-S9-T04 — Indices PostgreSQL de audit evidence

- Arquivos principais:
  - `packages/persistence/migrations/0000_initial.sql`
  - `packages/persistence/src/__tests__/postgres-migration-smoke.test.ts`
- Evidencia:
  - Migration adiciona `idx_audit_events_type`.
  - Migration adiciona `idx_audit_events_actor_id`.
  - Migration adiciona `idx_audit_events_payload_session_id` para `(payload->>'sessionId')`.
  - Smoke documental verifica a presenca dos indices.

## Gates executados

| Gate                                                     | Resultado                                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------- |
| `npm test -- --run shared/audit-evidence/postgres smoke` | PASS — 3 files, 15 passed, 1 skipped                                      |
| `npm test -- --run apps/web/src/__tests__/app.test.tsx`  | PASS — 1 file, 11 tests                                                   |
| `npm run typecheck`                                      | PASS                                                                      |
| `npm run lint`                                           | PASS                                                                      |
| `npm test`                                               | PASS — 25 files, 78 passed, 2 skipped                                     |
| `npm run test:coverage`                                  | PASS — statements 85.11%, branches 83.91%, functions 84.15%, lines 86.72% |
| `npm run audit:security`                                 | PASS — 0 vulnerabilities                                                  |
| `npm run verify`                                         | PASS                                                                      |
| `npm run test:e2e`                                       | PASS — 1 file, 1 test                                                     |
| `npm run readiness`                                      | PASS — 1 file, 4 tests                                                    |
| `npm run test:postgres`                                  | PASS — 2 files, 3 passed, 2 skipped condicionais                          |

## Correcoes fechadas

- `DBG-COR-09`: payloads de audit evidence minimizados e filtros positivos ampliados.
- `DBG-COR-10`: indices PostgreSQL adicionados para filtros de audit evidence.
- `DBG-COR-13`: auditoria CC-S9 reforcou consistencia de totais em filtros positivos e redacao de PII comum.

## Limites preservados

- Sem dados reais.
- Sem producao irrestrita.
- Sem canais reais.
- Sem RAG real.
- Sem confirmacao, cancelamento ou reagendamento real.
- Sem acao clinica, financeira ou prontuario definitivo.
- Sem exporter externo de observabilidade.
- Politica de retencao atual e apenas para construcao controlada; piloto real ainda exige decisao humana.

## Proxima sprint recomendada

`CC-S10 — Controlled Evidence Pagination and Export Approval Workflow`: adicionar paginacao operacional completa da revisao de evidencias e preparar workflow de aprovacao para export controlado, ainda sem despacho externo.
