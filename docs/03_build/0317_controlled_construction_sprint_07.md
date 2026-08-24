# 0317 — Controlled Construction Sprint 07

## Status

```txt
STATUS: COMPLETED
DATA: 2026-04-29T22:42:47-03:00
SPRINT: CC-S7 — Runtime Observability and Audit Evidence Hardening
ESCOPO: tornar auditoria runtime consultavel como evidencia operacional controlada, com filtros, resumo e export metadata sem despacho externo
```

## Objetivo

Endurecer a camada de observabilidade runtime para que eventos de auditoria possam ser consultados como evidencia operacional controlada. A sprint prepara exportacao JSON auditavel, mas preserva `externalDispatch: false` e nao conecta exporter externo, canais reais, RAG real, dados reais ou automacoes sensiveis.

## Tasks executadas

### CC-S7-T01 — Consulta e resumo de audit evidence

- Arquivos principais:
  - `packages/persistence/src/schema.ts`
  - `packages/persistence/src/repositories/audit-repository.ts`
  - `packages/persistence/src/postgres.ts`
  - `packages/persistence/src/__tests__/postgres-migration-smoke.test.ts`
- Evidencia:
  - `AuditEvidenceQuery`, `AuditEvidenceFilters`, `AuditEvidencePage` e `AuditEvidenceSummary` formalizam o contrato.
  - Repositorio in-memory lista evidencia com filtros por `sessionId`, `correlationId`, `type` e `actorId`.
  - PostgreSQL implementa filtros parametrizados e paginacao por `limit`/`offset`.
  - Sumario agrupa total por tipo, ator, correlationId e sessao.

### CC-S7-T02 — Endpoint controlado de observabilidade

- Arquivos principais:
  - `apps/api/src/server.ts`
  - `apps/api/src/__tests__/audit-evidence.test.ts`
  - `apps/api/src/__tests__/postgres-persistence-mode.test.ts`
- Evidencia:
  - `GET /v1/observability/audit-evidence` exige identidade operacional com permissao `audit:view_full`.
  - Ausencia de identidade retorna `unauthorized` e role sem permissao retorna `forbidden`.
  - Parametros invalidos retornam envelopes seguros `validation_failed` ou `invalid_pagination`.
  - Resposta inclui `summary`, `page` e `export` com `format: json`, `controlled: true`, `externalDispatch: false` e `requestedBy`.
  - Runtime emite logs `observability.audit_evidence_exported` e `observability.audit_evidence_failed`.

### CC-S7-T03 — Ajuste de console e cobertura de gates

- Arquivos principais:
  - `apps/web/src/__tests__/app.test.tsx`
  - `packages/persistence/src/__tests__/postgres-migration-smoke.test.ts`
- Evidencia:
  - Testes do console foram alinhados ao carregamento assinado por identidade operacional.
  - Smoke PostgreSQL cobre listagem e resumo de audit evidence.
  - Coverage global permaneceu acima de 80%.

## Gates executados

| Gate                     | Resultado                                                                 |
| ------------------------ | ------------------------------------------------------------------------- |
| `npm run typecheck`      | PASS                                                                      |
| `npm run lint`           | PASS                                                                      |
| `npm test`               | PASS — 25 files, 73 passed, 2 skipped apos auditoria complementar         |
| `npm run test:e2e`       | PASS — 1 file, 1 test                                                     |
| `npm run test:coverage`  | PASS — statements 84.64%, branches 83.10%, functions 83.53%, lines 85.85% |
| `npm run audit:security` | PASS — 0 vulnerabilities                                                  |
| `npm run readiness`      | PASS — 1 file, 4 tests                                                    |
| `npm run verify`         | PASS                                                                      |
| `npm run test:postgres`  | PASS — 2 files, 3 passed, 2 skipped condicionais sem `TEST_DATABASE_URL`  |

## Correcao pos-auditoria

Arquivo de evidencia: `docs/09_debug_corrections/0907_cc_s7_audit_evidence_review.md`.

- `AuditEvidenceSummary` agora expoe `byCorrelationId` e `bySessionId`, alinhando o contrato ao resumo declarado pela sprint.
- Testes de API e repository smoke validam os novos campos agregados.
- Pendencias registradas nesta auditoria foram fechadas em CC-S9: sanitizacao de payload bruto, cobertura positiva de filtros `sessionId`/`type`/`actorId` e indices PostgreSQL para filtros de audit evidence.

## Limites preservados

- Sem dados reais.
- Sem producao irrestrita.
- Sem canais reais.
- Sem RAG real.
- Sem confirmacao, cancelamento ou reagendamento real.
- Sem acao clinica, financeira ou prontuario definitivo.
- Sem exporter externo de observabilidade.
- Export de evidencia permanece apenas metadata/control-plane interno com `externalDispatch: false`.

## Proxima sprint recomendada

`CC-S8 — Controlled Observability Console and Evidence Review`: expor a consulta de audit evidence no console operacional para revisao humana controlada, mantendo RBAC, identidade operacional e sem despacho externo.
