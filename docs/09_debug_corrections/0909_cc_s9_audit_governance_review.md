# 0909 - CC-S9 Audit Governance Review

## Status

```txt
STATUS: COMPLETED_WITH_PENDING_CORRECTIONS
DATA: 2026-04-29T23:38:53-03:00
ESCOPO: auditoria de CC-S9 audit retention and evidence governance
MODO: controlled_construction_only
```

## Decisao de auditoria

CC-S9 fecha corretamente os debitos principais de governanca de audit evidence em construcao controlada: payload bruto deixou de ser exposto por default, a resposta declara governanca de retencao, filtros positivos foram ampliados e a migration recebeu indices para os filtros declarados.

A entrega permanece bloqueada para dados reais e producao irrestrita. A politica atual declara explicitamente `approvedForRealData: false` e `humanSignoffRequired: true`.

## Achados

### DBG-F16 - Filtro positivo nao comprovava consistencia de total no caso combinado

- Severidade: MEDIUM.
- Status: CORRIGIDO nesta rodada.
- Evidencia:
  - `DBG-COR-09` exige que `summary.totalEvents`, `page.pageInfo.total` e `page.items` obedecam ao mesmo filtro.
  - O teste combinado por `sessionId`, `type` e `actorId` verificava o item retornado e a redacao, mas nao afirmava explicitamente a igualdade entre total do resumo e total da pagina.
- Correcao aplicada:
  - `apps/api/src/__tests__/audit-evidence.test.ts` agora verifica `summary.totalEvents === 1`.
  - O mesmo teste verifica `page.pageInfo.total === summary.totalEvents`.

### DBG-F17 - Sanitizacao precisava cobrir identificadores pessoais comuns

- Severidade: HIGH.
- Status: CORRIGIDO nesta rodada.
- Evidencia:
  - CC-S9 removia campos como `token`, `secret`, `authorization`, `body`, `phone`, `senderRef`, `externalMessageId` e campos clinicos.
  - Para uso futuro em contexto hospitalar, chaves comuns de identificacao pessoal tambem precisam ser tratadas como sensiveis.
- Correcao aplicada:
  - `sanitizeAuditEvidencePayload` passou a redigir chaves/fragments para `email`, `cpf`, `cnpj`, `document`, `documentId`, `patientName`, `address`, `dateOfBirth`, `birthDate`, `rg` e `taxId`.
  - `packages/shared/src/__tests__/shared-contracts.test.ts` cobre email, CPF, nome de paciente e endereco ficticios.

## Fechamentos confirmados

- `DBG-COR-09`: confirmado como fechado com payload minimizado, governanca de retencao e filtros positivos com consistencia de total.
- `DBG-COR-10`: confirmado como fechado com indices `idx_audit_events_type`, `idx_audit_events_actor_id` e `idx_audit_events_payload_session_id`.

## Pendencias no encerramento CC-S9

- `DBG-COR-12`: no encerramento da CC-S9, o console ainda precisava expor paginacao/estado de `pageInfo` quando `hasNextPage` fosse verdadeiro.
- Estado atual auditado no workspace: CC-S10 ja registra o fechamento de `DBG-COR-12` em `docs/03_build/0320_controlled_construction_sprint_10.md`.
- Dados reais, piloto real, exporter externo ou producao irrestrita seguem bloqueados ate decisao humana e nova politica de retencao aprovada.

## Gates executados nesta auditoria

| Gate                                                                                                                                                                                      | Resultado                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx vitest run apps/api/src/__tests__/audit-evidence.test.ts packages/shared/src/__tests__/shared-contracts.test.ts packages/persistence/src/__tests__/postgres-migration-smoke.test.ts` | PASS - 3 files, 15 passed, 1 skipped                                                                                                        |
| `npm run verify`                                                                                                                                                                          | PASS - 25 files, 78 passed, 2 skipped; coverage statements 85.11%, branches 83.91%, functions 84.15%, lines 86.72%; audit 0 vulnerabilities |
| `npm run test:e2e`                                                                                                                                                                        | PASS - 1 file, 1 passed                                                                                                                     |
| `npm run readiness`                                                                                                                                                                       | PASS - 1 file, 4 passed                                                                                                                     |
| `npm run test:postgres`                                                                                                                                                                   | PASS - 2 files, 3 passed, 2 conditional skips sem `TEST_DATABASE_URL`                                                                       |

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

Manter a proxima rodada focada em `CC-S11 — Debug Correction Backlog Reconciliation and Runtime Evidence Consistency`, preservando qualquer export externo bloqueado ate workflow de aprovacao e decisao humana.
