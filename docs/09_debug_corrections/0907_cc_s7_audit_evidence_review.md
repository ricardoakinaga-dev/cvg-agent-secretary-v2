# 0907 - CC-S7 Audit Evidence Review

## Status

```txt
STATUS: COMPLETED_WITH_CC_S9_CORRECTIONS
DATA: 2026-04-29T22:57:10-03:00
ESCOPO: auditoria de CC-S7 observability/audit evidence
MODO: controlled_construction_only
```

## Decisao de auditoria

CC-S7 entregou o endpoint controlado de audit evidence e preservou os limites sensiveis. A implementacao esta adequada para continuidade de construcao controlada, mas ainda nao deve ser tratada como superficie final de observabilidade enterprise ou pronta para dados reais.

## Achados

### DBG-F09 - Resumo declarado por sessao/correlation nao estava exposto

- Severidade: MEDIUM.
- Status: CORRIGIDO nesta rodada.
- Evidencia:
  - `docs/03_build/0317_controlled_construction_sprint_07.md` declarava agrupamento por tipo, ator, correlationId e sessao.
  - `AuditEvidenceSummary` expunha apenas `byType` e `byActorType`.
- Correcao aplicada:
  - `AuditEvidenceSummary` agora inclui `byCorrelationId` e `bySessionId`.
  - `summarizeAuditEvents` agrega por correlationId e sessionId quando `payload.sessionId` existe.
  - Testes cobrem o novo resumo em API e smoke de repository PostgreSQL.

### DBG-F10 - Payload bruto ainda e retornado na evidencia

- Severidade: HIGH.
- Status: CORRIGIDO EM CC-S9.
- Evidencia:
  - `AuditEvidencePage.items[].payload` retorna o payload auditavel completo.
  - A baseline de seguranca em `docs/02_spec/0111_permissoes_governanca_e_auditoria.md` proibe expor token, segredo, payload clinico integral ou dado pessoal desnecessario em logs.
- Risco:
  - Hoje os fixtures sao ficticios e os payloads auditados sao minimizados, mas o contrato aceita `unknown` e pode carregar dados sensiveis no futuro.
- Correcao aplicada em CC-S9:
  - `sanitizeAuditEvidencePayload` minimiza payloads antes da resposta do endpoint.
  - Campos como `token`, `secret`, `authorization`, `body`, `phone`, `senderRef`, `externalMessageId` e dados clinicos sao removidos por default.
  - `governance.payload.redactedFields` registra os caminhos redigidos na pagina atual.
  - Payload bruto permanece indisponivel por default.

### DBG-F11 - Cobertura de filtros do endpoint ainda e parcial

- Severidade: MEDIUM.
- Status: CORRIGIDO EM CC-S9.
- Evidencia:
  - Teste API cobre RBAC, pagination invalida, type invalido, correlationId e retorno basico.
  - Nao ha teste API dedicado para filtros positivos por `sessionId`, `type` e `actorId` com exclusao de eventos fora do filtro.
- Correcao aplicada em CC-S9:
  - `apps/api/src/__tests__/audit-evidence.test.ts` cobre filtros positivos combinados por `sessionId`, `type` e `actorId`.
  - O teste valida que a pagina de evidencia obedece ao filtro e nao retorna evento fora do escopo.

### DBG-F12 - Indices PostgreSQL de audit evidence ainda nao cobrem todos os filtros

- Severidade: MEDIUM.
- Status: CORRIGIDO EM CC-S9.
- Evidencia:
  - Migration possui `idx_audit_events_correlation_id`.
  - Consultas CC-S7 tambem filtram por `type`, `actor_id` e `payload->>'sessionId'`.
- Risco:
  - Em volume maior, consulta de evidencia por sessao/tipo/ator pode degradar por scan.
- Correcao aplicada em CC-S9:
  - Migration adiciona `idx_audit_events_type`.
  - Migration adiciona `idx_audit_events_actor_id`.
  - Migration adiciona `idx_audit_events_payload_session_id` para `(payload->>'sessionId')`.
  - Smoke documental verifica a presenca dos indices.

## Gates executados nesta auditoria

| Gate                                                                                                                               | Resultado                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx vitest run apps/api/src/__tests__/audit-evidence.test.ts packages/persistence/src/__tests__/postgres-migration-smoke.test.ts` | PASS - 2 files, 5 passed, 1 conditional skip                                                                                                |
| `npm run verify`                                                                                                                   | PASS - 25 files, 73 passed, 2 skipped; coverage statements 84.64%, branches 83.10%, functions 83.53%, lines 85.85%; audit 0 vulnerabilities |
| `npm run test:e2e`                                                                                                                 | PASS - 1 file, 1 test                                                                                                                       |
| `npm run readiness`                                                                                                                | PASS - 1 file, 4 tests                                                                                                                      |
| `npm run test:postgres`                                                                                                            | PASS - 2 files, 3 passed, 2 conditional skips sem `TEST_DATABASE_URL`                                                                       |

## Atualizacao CC-S9

`DBG-COR-09` e `DBG-COR-10` foram concluídos durante CC-S9. A evidencia de auditoria agora possui policy de retencao controlada, payload minimizado e indices de filtro em PostgreSQL. Dados reais e exporter externo continuam bloqueados ate aprovacao humana.

## Observacao de execucao

A primeira execucao de `npm run verify` falhou durante `test:coverage` por erro transiente do provider V8 ao ler `coverage/.tmp/coverage-6.json`. A suite de testes ja havia passado. `npm run test:coverage` isolado passou em seguida, e `npm run verify` reexecutado passou completo.

## Limites preservados

- Sem dados reais.
- Sem producao irrestrita.
- Sem canais reais.
- Sem RAG real.
- Sem confirmacao, cancelamento ou reagendamento real.
- Sem acao clinica, financeira ou prontuario definitivo.
- Sem exporter externo de observabilidade.
- Export permanece controlado com `externalDispatch: false`.

## Proxima correcao recomendada

Executar `DBG-COR-12` antes de qualquer uso com dados reais ou piloto: adicionar estado de paginacao operacional no console de audit evidence e manter export externo bloqueado ate aprovacao.
