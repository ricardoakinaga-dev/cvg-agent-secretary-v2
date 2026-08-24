# 0908 - CC-S8 Console Evidence Review Audit

## Status

```txt
STATUS: COMPLETED_CORRECTIONS_CLOSED_BY_CC_S10
DATA: 2026-04-29T23:24:38-03:00
ESCOPO: auditoria de CC-S8 controlled observability console and evidence review
MODO: controlled_construction_only
```

## Decisao de auditoria

CC-S8 entregou a superficie controlada de revisao de audit evidence no console sem abrir despacho externo e mantendo RBAC por identidade operacional. A entrega esta apta para continuidade de construcao controlada, mas ainda nao deve ser considerada revisao final enterprise nem pronta para dados reais.

## Achados

### DBG-F13 - Cobertura web de RBAC de evidence review estava incompleta

- Severidade: MEDIUM.
- Status: CORRIGIDO nesta rodada.
- Evidencia:
  - `docs/03_build/0318_controlled_construction_sprint_08.md` declara revisao liberada para `Supervisor` ou `Admin` e bloqueada para `Operator` ou `Approver`.
  - `apps/web/src/__tests__/app.test.tsx` cobria `Supervisor` liberado e `Operator` bloqueado, mas nao comprovava explicitamente `Admin` liberado nem `Approver` bloqueado.
- Correcao aplicada:
  - O teste de evidence review agora executa para `Supervisor` e `Admin`.
  - O teste de bloqueio agora executa para `Operator` e `Approver`.
  - Assercoes confirmam headers `x-operator-id` e `x-operator-role` e ausencia de chamada para endpoint de export.

### DBG-F14 - Serializacao de coverage reconhecia apenas `--coverage` literal

- Severidade: LOW.
- Status: CORRIGIDO nesta rodada.
- Evidencia:
  - `vitest.config.ts` usava `process.argv.includes('--coverage')`.
  - Invocacoes equivalentes como `--coverage=true` nao ativariam `fileParallelism: false`.
- Correcao aplicada:
  - A deteccao agora aceita `--coverage` e argumentos iniciados por `--coverage=`.
  - Runs comuns sem coverage continuam paralelos.

### DBG-F15 - Console mostra apenas a primeira pagina de audit evidence

- Severidade: MEDIUM.
- Status: CORRIGIDO em CC-S10.
- Evidencia:
  - `apiClient.getAuditEvidence` fixa `limit=10` e `offset=0` na chamada da CC-S8.
  - `AuditPanel` exibe itens retornados, mas nao mostra `pageInfo.total`, `offset`, `limit`, `hasNextPage` nem controles de navegacao.
- Risco:
  - Em sessoes com mais de 10 eventos, a revisao humana pode parecer completa mesmo quando ha mais evidencias disponiveis no endpoint.
- Correcao aplicada em `docs/03_build/0320_controlled_construction_sprint_10.md`:
  - Console passou a exibir faixa `Evidencias <inicio>-<fim> de <total>`.
  - Controles de pagina anterior/proxima usam `pageInfo.offset`, `limit` e `hasNextPage`.
  - Teste web cobre `hasNextPage: true`, `offset=10`, retorno para `offset=0` e ausencia de despacho externo.
  - Pedido de export controlado passa por aprovacao humana interna em `/v1/approvals`.

## Debitos herdados que CC-S8 nao fecha

- `DBG-F10`: fechado em CC-S9 por minimizacao/redacao de payload no endpoint de audit evidence.
- `DBG-F11`: fechado em CC-S9 por cobertura positiva de filtros `sessionId`, `type` e `actorId`.
- `DBG-F12`: fechado em CC-S9 por indices PostgreSQL para `type`, `actor_id` e `(payload->>'sessionId')`.
- `DBG-F15`: fechado em CC-S10 por paginação operacional do console e cobertura `hasNextPage: true`.

## Gates executados nesta auditoria

| Gate                                                 | Resultado                                                                                                                                   |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx vitest run apps/web/src/__tests__/app.test.tsx` | PASS - 1 file, 11 passed                                                                                                                    |
| `npm run verify`                                     | PASS - 25 files, 77 passed, 2 skipped; coverage statements 84.94%, branches 83.66%, functions 83.65%, lines 86.01%; audit 0 vulnerabilities |
| `npm run test:e2e`                                   | PASS - 1 file, 1 passed                                                                                                                     |
| `npm run readiness`                                  | PASS - 1 file, 4 passed                                                                                                                     |
| `npm run test:postgres`                              | PASS - 2 files, 3 passed, 2 conditional skips sem `TEST_DATABASE_URL`                                                                       |

## Revalidacao CC-S10

| Gate                                                 | Resultado                                                                                                                                   |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx vitest run apps/web/src/__tests__/app.test.tsx` | PASS - 1 file, 12 passed                                                                                                                    |
| `npm run verify`                                     | PASS - 25 files, 78 passed, 2 skipped; coverage statements 85.11%, branches 83.91%, functions 84.15%, lines 86.72%; audit 0 vulnerabilities |
| `npm run test:e2e`                                   | PASS - 1 file, 1 passed                                                                                                                     |
| `npm run readiness`                                  | PASS - 1 file, 4 passed                                                                                                                     |
| `npm run test:postgres`                              | PASS - 2 files, 3 passed, 2 conditional skips sem `TEST_DATABASE_URL`                                                                       |

## Limites preservados

- Sem dados reais.
- Sem producao irrestrita.
- Sem canais reais.
- Sem RAG real.
- Sem confirmacao, cancelamento ou reagendamento real.
- Sem acao clinica, financeira ou prontuario definitivo.
- Sem exporter externo de observabilidade.
- `externalDispatch` permanece `false`.

## Proxima correcao recomendada

Antes de qualquer uso real/final, executar a reconciliacao dos debitos P0/P1 restantes: `DBG-COR-01`, `DBG-COR-02`, `DBG-COR-04`, `DBG-COR-05` e `DBG-COR-06`.
