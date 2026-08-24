# 0910 - CC-S10 Evidence Pagination Export Audit

## Status

```txt
STATUS: COMPLETED_CORRECTIONS_CLOSED_BY_CC_S11
DATA: 2026-04-30T00:01:07-03:00
ESCOPO: auditoria de CC-S10 controlled evidence pagination and export approval workflow
MODO: controlled_construction_only
```

## Decisao de auditoria

CC-S10 fechou o gap operacional de paginacao de audit evidence no console e manteve o export como pedido de aprovacao humana interna, sem dispatcher externo e sem arquivo enviado para fora.

A auditoria encontrou um gap de rastreabilidade no endpoint usado pelo console para criar o pedido de export controlado. O client enviava identidade operacional, mas `POST /v1/approvals` ainda aceitava `audit_evidence_export_review` sem identidade e registrava o evento como `System/api`.

## Achados

### DBG-F18 - Pedido de export controlado nao exigia identidade no endpoint de approvals

- Severidade: HIGH.
- Status: CORRIGIDO nesta rodada.
- Evidencia:
  - `apps/web/src/api/client.ts` enviava `x-operator-id` e `x-operator-role` ao solicitar `audit_evidence_export_review`.
  - `apps/api/src/server.ts` nao validava esses headers em `POST /v1/approvals`.
  - A auditoria criada para o pedido era atribuida a `System/api`, perdendo a rastreabilidade humana do pedido de export.
- Risco:
  - Um request direto poderia criar uma aprovacao de export de evidencia sem operador controlado.
  - A trilha de auditoria nao provaria quem solicitou a revisao/export.
- Correcao aplicada:
  - `POST /v1/approvals` agora exige identidade com `audit:view_full` quando `proposedAction` e `audit_evidence_export_review`.
  - Roles sem permissao recebem `403`; requests sem identidade recebem `401`.
  - A auditoria de criacao do pedido passa a registrar `actorId` e `actorType` do operador humano.
  - O comportamento fica restrito a `audit_evidence_export_review`; os demais pedidos internos de aprovacao preservam o fluxo existente.

### DBG-F19 - Evidencia de gates CC-S10 nao e reproduzivel no estado atual

- Severidade: HIGH.
- Status: CORRIGIDO em CC-S11.
- Evidencia:
  - A documentacao CC-S10 declarou `npm run verify`, `npm run readiness` e `npm run test:postgres` como PASS.
  - Reexecucao auditada em 2026-04-30 falhou em gates documentais e de migration ja cobertos por debitos historicos.
- Falhas observadas:
  - `npm run verify`: FAIL com 25 files, 5 failed tests, 76 passed, 2 skipped.
  - `npm run readiness`: FAIL em migration/idempotencia por ausencia de `inbound:<channel>:<externalMessageId>`.
  - `npm run test:postgres`: FAIL no smoke de migration pelo mesmo gap de idempotencia.
  - `tests/docs-readiness.test.js`: falha por traceability apontando teste inexistente e readiness 100 com P0/P1 abertos.
  - `tests/workspace-scripts.test.js`: falha porque `verify` ainda nao inclui `npm run format:check`.
- Correcao aplicada em `docs/03_build/0321_controlled_construction_sprint_11.md`:
  - `npm run verify` passou a incluir `npm run format:check`.
  - Traceability matrix passou a validar arquivos de teste existentes.
  - Idempotencia PostgreSQL de inbound passou a usar chave transacional `inbound:<channel>:<externalMessageId>`.
  - `npm run verify`, `npm run readiness`, `npm run test:postgres` e PostgreSQL real efemero passaram com evidencia atualizada.

## Fechamentos confirmados

- `DBG-COR-12`: confirmado como fechado pela CC-S10, com faixa de pagina, navegacao anterior/proxima e teste de `hasNextPage: true`.
- `DBG-COR-14`: fechado nesta auditoria, exigindo identidade controlada para pedido de export de audit evidence.

## Pendencias mantidas

- `DBG-COR-01`, `DBG-COR-02`, `DBG-COR-04`, `DBG-COR-05`, `DBG-COR-06` e `DBG-COR-15` foram fechados em CC-S11.
- Dados reais, piloto real, exporter externo ou producao irrestrita seguem bloqueados ate decisao humana.

## Gates executados nesta auditoria

| Gate                                                                                                       | Resultado                                                                             |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `npx vitest run apps/api/src/__tests__/operator-identity-rbac.test.ts apps/web/src/__tests__/app.test.tsx` | PASS - 2 files, 18 passed                                                             |
| `npm run verify`                                                                                           | FAIL - 25 files; 5 failed tests, 76 passed, 2 skipped                                 |
| `npm run test:e2e`                                                                                         | PASS - 1 file, 1 passed                                                               |
| `npm run readiness`                                                                                        | FAIL - migration/idempotency expectation still open                                   |
| `npm run test:postgres`                                                                                    | FAIL - postgres migration smoke still expects `inbound:<channel>:<externalMessageId>` |

## Revalidacao CC-S11

| Gate                                                                                            | Resultado                                                                                                                                   |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run format:check`                                                                          | PASS                                                                                                                                        |
| `npm run verify`                                                                                | PASS - 41 files, 97 passed, 2 skipped; coverage statements 85.60%, branches 84.22%, functions 84.15%, lines 87.31%; audit 0 vulnerabilities |
| `npm run readiness`                                                                             | PASS - 1 file, 4 passed                                                                                                                     |
| `npm run test:postgres` sem `TEST_DATABASE_URL`                                                 | PASS - 2 files, 3 passed, 2 conditional skips                                                                                               |
| `TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:55432/cvg_test npm run test:postgres` | PASS - 2 files, 5 passed, 0 skips                                                                                                           |
| `PORT=3100 npx tsx apps/api/src/main.ts` + `/health` + webhook                                  | PASS - `success=true` em ambos                                                                                                              |

## Limites preservados

- Sem dados reais.
- Sem producao irrestrita.
- Sem canais reais.
- Sem RAG real.
- Sem confirmacao, cancelamento ou reagendamento real.
- Sem acao clinica, financeira ou prontuario definitivo.
- Sem exporter externo de observabilidade.
- Export de evidence permanece apenas pedido interno de aprovacao humana.

## Proxima correcao recomendada

Prosseguir apenas para `CC-S12 — Controlled Pilot Boundary and Release Candidate Audit`, mantendo bloqueios de dados reais, canais reais, RAG real, exporter externo e automacoes sensiveis.
