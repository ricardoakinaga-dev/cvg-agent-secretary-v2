# 0318 — Controlled Construction Sprint 08

## Status

```txt
STATUS: COMPLETED
DATA: 2026-04-29T23:08:00-03:00
SPRINT: CC-S8 — Controlled Observability Console and Evidence Review
ESCOPO: expor revisao de audit evidence no console operacional com RBAC, identidade controlada e sem despacho externo
```

## Objetivo

Transformar a consulta de audit evidence da CC-S7 em superficie operacional no console. A revisao fica restrita a identidades `Supervisor` ou `Admin`, usa o endpoint RBAC `audit:view_full` e preserva exportacao como metadata interna, sem abrir integracao externa.

## Tasks executadas

### CC-S8-T01 — API client de audit evidence

- Arquivos principais:
  - `apps/web/src/api/client.ts`
- Evidencia:
  - `AuditEvidenceReviewView` formaliza `summary`, `page` e `export`.
  - `apiClient.getAuditEvidence` chama `GET /v1/observability/audit-evidence`.
  - Query params sao montados via `URLSearchParams`.
  - Headers `x-operator-id` e `x-operator-role` continuam obrigatorios.

### CC-S8-T02 — Estado e RBAC no console

- Arquivos principais:
  - `apps/web/src/App.tsx`
  - `apps/web/src/__tests__/app.test.tsx`
- Evidencia:
  - Console carrega evidencias apenas para `Supervisor` ou `Admin`.
  - `Operator` e `Approver` veem revisao bloqueada e nao chamam endpoint de audit evidence.
  - A revisao usa a sessao selecionada no painel de conversas.
  - Acoes de approval continuam atualizando auditoria e, quando permitido, evidencia.

### CC-S8-T03 — Painel de revisao operacional

- Arquivos principais:
  - `apps/web/src/features/audit/index.tsx`
  - `apps/web/src/styles.css`
- Evidencia:
  - Painel exibe total de eventos controlados, formato de export, status de despacho externo e eventos paginados.
  - UI mostra `Sem despacho externo` quando `externalDispatch` e falso.
  - Eventos de evidencia exibem tipo, ator e `correlationId` para revisao humana.

### CC-S8-T04 — Estabilizacao do gate de coverage

- Arquivos principais:
  - `vitest.config.ts`
- Evidencia:
  - Runs com `--coverage` ou `--coverage=<value>` agora usam `fileParallelism: false`.
  - A mudanca evita corrida nos arquivos temporarios V8 em `coverage/.tmp`.
  - Testes normais preservam paralelismo.

### Auditoria CC-S8 — 2026-04-29

- Arquivo de evidencia: `docs/09_debug_corrections/0908_cc_s8_console_evidence_review_audit.md`.
- Correcoes aplicadas:
  - Testes web agora comprovam `Supervisor` e `Admin` liberados para evidence review.
  - Testes web agora comprovam `Operator` e `Approver` bloqueados sem chamada ao endpoint de audit evidence.
  - Gate de coverage tambem serializa invocacoes `--coverage=<value>`.
- Debito pendente:
  - `DBG-COR-12`: console ainda precisa expor paginacao/estado de `pageInfo` para revisao completa quando `hasNextPage` for verdadeiro.

## Gates executados

| Gate                                                 | Resultado                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------- |
| `npx vitest run apps/web/src/__tests__/app.test.tsx` | PASS — 1 file, 11 tests                                                   |
| `npm run typecheck`                                  | PASS                                                                      |
| `npm run lint`                                       | PASS                                                                      |
| `npm test`                                           | PASS — 25 files, 77 passed, 2 skipped                                     |
| `npm run test:coverage`                              | PASS — statements 84.94%, branches 83.66%, functions 83.65%, lines 86.01% |
| `npm run audit:security`                             | PASS — 0 vulnerabilities                                                  |
| `npm run verify`                                     | PASS                                                                      |
| `npm run test:e2e`                                   | PASS — 1 file, 1 test                                                     |
| `npm run readiness`                                  | PASS — 1 file, 4 tests                                                    |
| `npm run test:postgres`                              | PASS — 2 files, 3 passed, 2 skipped condicionais                          |
| `npx vitest run --coverage --fileParallelism=false`  | PASS — usado para confirmar a correcao do coverage antes de fixar config  |

## Limites preservados

- Sem dados reais.
- Sem producao irrestrita.
- Sem canais reais.
- Sem RAG real.
- Sem confirmacao, cancelamento ou reagendamento real.
- Sem acao clinica, financeira ou prontuario definitivo.
- Sem exporter externo de observabilidade.
- Revisao de evidencia no console permanece leitura controlada, com `externalDispatch: false`.

## Proxima sprint recomendada

`CC-S9 — Audit Retention and Evidence Governance`: definir governanca de retencao, escopo de export controlado e trilha de revisao para evidencias antes de qualquer exporter externo.
