# 0304 — Traceability Matrix

## Objetivo

Mapear cada caso de uso, requisito funcional e contrato tecnico para phase, sprint, task e teste obrigatorio. O executor nao deve implementar requisito sem linha correspondente nesta matriz.

## Regras

- Cada `RF-*` deve ter pelo menos uma task.
- Cada caso de uso `UC-*` deve ter pelo menos um teste de fluxo ou integracao.
- Cada contrato de aplicacao em `0106` deve ter schema, handler/use case e teste.
- Cada endpoint de `0107` deve ter schema, auth/policy quando aplicavel e teste.
- Qualquer requisito sensivel sem decisao humana deve apontar para task `BLOCKED-*`, nao para implementacao.

## Matriz resumida

| Fonte              | Descricao                                              | Phase   | Sprint  | Task                                    | Teste obrigatorio                          |
| ------------------ | ------------------------------------------------------ | ------- | ------- | --------------------------------------- | ------------------------------------------ |
| UC-01, RF-001..005 | Receber mensagem, criar conversa/sessao e historico    | 3       | 3.1     | P3-S1-T01                               | `conversation-session.integration.test.ts` |
| UC-02, RF-010..014 | Classificar intencao e rodar agent turn                | 5       | 5.1     | P5-S1-T01                               | `intent-workflow.flow.test.ts`             |
| UC-03, RF-020..024 | Identificar tutor/pet e drafts                         | 4       | 4.1     | P4-S1-T01                               | `owner-patient-tools.integration.test.ts`  |
| UC-04, RF-030..033 | Triagem segura sem diagnostico                         | 5       | 5.2     | P5-S2-T01                               | `triage-safety.flow.test.ts`               |
| UC-05, RF-040..043 | Agendamento draft e approval quando exigido            | 5       | 5.3     | P5-S3-T01                               | `scheduling-draft.flow.test.ts`            |
| UC-06, RF-051..053 | Approval humano                                        | 4       | 4.2     | P4-S2-T01                               | `approval-state.integration.test.ts`       |
| UC-07, RF-050      | Handoff summary                                        | 5       | 5.2     | P5-S2-T02                               | `handoff-summary.unit.test.ts`             |
| UC-08, RF-060..062 | Tarefa interna rastreavel                              | 3       | 3.2     | P3-S2-T01                               | `internal-task.integration.test.ts`        |
| UC-09              | Duvida institucional com fonte ou handoff              | 8       | 8.2     | P8-S2-T01                               | `institutional-rag-safe.flow.test.ts`      |
| RF-070..073        | Auditoria de tools, safety, integracoes e investigacao | 2/6/7/9 | varies  | P2-S3-T01/P6-S2-T03/P7-S3-T02/P9-S1-T01 | audit repository/API/UI/correlation tests  |
| RF-080..084        | Painel minimo de conversas, approvals, tasks e handoff | 7       | 7.2/7.3 | P7-S2-T01/P7-S2-T02/P7-S3-T01/P7-S3-T02 | web feature tests                          |
| RNF performance    | p95 persistencia <= 2s e ack <= 10s                    | 9       | 9.2     | P9-S2-T01                               | `runtime-slo.audit.test.ts`                |
| RNF idempotencia   | Mensagem/tool/task/approval sem duplicidade            | 2,3,4   | varies  | P2-S2-T02                               | `idempotency.integration.test.ts`          |
| RNF seguranca      | Auth, RBAC, secrets, fail-closed                       | 1,4,7   | varies  | P1-S2-T02                               | `security-baseline.test.ts`                |
| SPEC 0106          | Commands de aplicacao                                  | 3       | 3.1     | P3-S1-T02                               | `application-contracts.test.ts`            |
| SPEC 0107          | Endpoints `/v1`                                        | 7       | 7.1     | P7-S1-T01                               | `api-contracts.integration.test.ts`        |
| SPEC 0109          | Persistencia e retencao provisoria                     | 2       | 2.1     | P2-S1-T01                               | `persistence-schema.test.ts`               |
| SPEC 0111          | Permissoes e auditoria                                 | 4,7     | varies  | P4-S1-T02                               | `rbac-policy.test.ts`                      |
| SPEC 0113          | Logs, metricas, health e tracing                       | 9       | 9.1     | P9-S1-T01                               | `observability-smoke.test.ts`              |

## Lanes de qualidade controladas

| Fonte/controle | Descricao                                                 | Phase | Sprint   | Task             | Teste obrigatorio                  |
| -------------- | --------------------------------------------------------- | ----- | -------- | ---------------- | ---------------------------------- |
| CTRL-186..189  | Determinismo de approval e assercao semantica da timeline | AUDIT | PLAT-S48 | PLAT-S48-001/002 | gateway/authority e `app.test.tsx` |

## Bloqueios de rastreabilidade

| Fonte                 | Bloqueio                   | Condicao para liberar                        |
| --------------------- | -------------------------- | -------------------------------------------- |
| RF-043                | Confirmacao real de agenda | Regra humana de agenda aprovada              |
| UC-09                 | RAG com fonte real         | Fonte institucional, dono e versao aprovados |
| RNF retencao          | Uso com dado real          | Politica de retencao aprovada                |
| SPEC 0111             | Approvals reais por cargo  | Matriz real de cargos aprovada               |
| Financeiro/prontuario | Qualquer acao definitiva   | Fora do MVP; exige PRD/SPEC novos            |

## JSON

A matriz completa machine-readable esta em `docs/03_build/0304_traceability_matrix.json`.
