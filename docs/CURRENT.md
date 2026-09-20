# CURRENT — índice canônico de estado

- Documento: `docs/CURRENT.md`; criado por `AUD19-02` (programa `AUD19-REM`).
- Fonte dos achados: [auditoria 0566](04_audit/0566_full_repository_gauntlet_audit_2026-09-19.md). Ordem e gates: [roadmap 0331](03_build/0331_aud20260919_roadmap.md) e [backlog 0332](03_build/0332_aud20260919_backlog.md).
- Estados oficiais (`docs/07_agents/AGENTS.md`): `IN_PROGRESS`, `READY_FOR_NEXT_STEP`, `BLOCKED`, `WAITING_HUMAN_APPROVAL`, `COMPLETED`. Nenhum outro estado governa task corrente; rótulos de release (`NO_GO`) e perfis são decisões, não estados de task.
- Regra: documento histórico permanece preservado e rotulado; este índice não reescreve passado e não substitui required gate por média.
- Base de composição de workflow: [ADR 0001](02_spec/adr/0001-langgraph-frontier-decision.md) — fronteira contratual implementada; dependência LangGraph upstream `BLOCKED` por supply chain.

## Fontes correntes por domínio

| Domínio                       | Fonte corrente                                                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pipeline e governança         | [AGENTS.md operacional](07_agents/AGENTS.md) e [AGENTS.md raiz](../AGENTS.md)                                                                                |
| Contrato de qualidade (AAA)   | [aaa_quality_contract.md](02_spec/aaa_quality_contract.md) v2 e anexos em `docs/04_audit/evidence/AAA/AAA-04/`                                               |
| Execução corrente do programa | [runtime state](99_runtime_state.md), [execution log](20_master_execution_log.md), [backlog master](30_backlog_master.md)                                    |
| Backlog operacional AUD19     | [0332](03_build/0332_aud20260919_backlog.md) (15 tasks)                                                                                                      |
| Backlog operacional AUD17     | [0330](03_build/0330_aud20260917_backlog.md) e [0329](03_build/0329_aud20260917_roadmap.md); tasks locais com evidência                                      |
| Certificação current          | [certification/current.json](../certification/current.json) (ponteiro) → `certification/phase11/`                                                            |
| Requisitos Phase 11           | [requirements-matrix.json](11_phase11/requirements-matrix.json)                                                                                              |
| Qualificação local AUD17      | [AUD17-02 requirements matrix](04_audit/evidence/AUD17-AAA/AUD17-02-requirements-matrix.json) e [baseline](04_audit/evidence/AUD17-AAA/AUD17-01-baseline.md) |
| Rastreabilidade AUD19         | [AUD19 requirements matrix](04_audit/evidence/AUD19/AUD19-requirements-matrix.json)                                                                          |
| Barra AUD17                   | [quality-bar-v1.json](04_audit/evidence/AUD17-AAA/quality-bar-v1.json)                                                                                       |

## Relações de supersessão

| Documento histórico                                                                                                                               | Supersedido por / tratado como                                                                                         | Nota                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `docs/10_phase10/**`                                                                                                                              | `docs/11_phase11/**` e pacote `certification/phase11/`                                                                 | Phase 10 permanece verificável como histórico              |
| Pacote Phase 10 `certification/logs/historical/2026-09-11-phase10`                                                                                | `certification/current.json`                                                                                           | `certification:verify:historical` não qualifica o corrente |
| [0565](04_audit/0565_recent_implementations_audit_2026-09-17.md)                                                                                  | [0566](04_audit/0566_full_repository_gauntlet_audit_2026-09-19.md) para o estado integral                              | 0565 continua sendo o histórico do programa AUD17          |
| [0328](03_build/0328_aud20260917_executive_plan.md) / [0329](03_build/0329_aud20260917_roadmap.md) / [0330](03_build/0330_aud20260917_backlog.md) | [0331](03_build/0331_aud20260919_roadmap.md) / [0332](03_build/0332_aud20260919_backlog.md) para a remediação corrente | AUD17 segue como programa anterior, sem renumerar fases    |
| `aaa_quality_contract.md` v1 (`docs/04_audit/evidence/AAA/AAA-04/v1/`)                                                                            | [aaa_quality_contract.md](02_spec/aaa_quality_contract.md) v2                                                          | Mudança de bytes invalida evidência v1                     |
| `PHASE11.1-FORMAL-CLOSURE` e rodadas intermediárias Phase 11                                                                                      | Pacote corrente em `certification/phase11/`                                                                            | Registros anteriores permanecem no execution log           |
| Relatórios `0562`, `0563`, `0564` e evidências AAA-21 anteriores                                                                                  | Registros históricos; não qualificam o candidato corrente                                                              | Preservados; não reescritos                                |
| [0300](03_build/0300_build_engineer_master.md) / [0301](03_build/0301_roadmap.md) / [0302](03_build/0302_backlog_master.md)                       | Masters correntes; apontam para 0331/0332                                                                              | Não são substituídos; são ponteiros de processo            |

## Tasks correntes (estados oficiais)

| Task     | Estado        | Evidência corrente                                                                        |
| -------- | ------------- | ----------------------------------------------------------------------------------------- |
| AUD19-01 | `COMPLETED`   | [SPEC](02_spec/aud19_01_eval_contract_20260919.md), relatório de eval e testes            |
| AUD19-02 | `COMPLETED`   | Este índice, checker documental, matriz AUD19 e ADR LangGraph                             |
| AUD19-03 | `COMPLETED`   | Get-or-create linearizável com validação de lineage                                       |
| AUD19-04 | `COMPLETED`   | Teste PostgreSQL de duas conexões, fencing e ausência de DLQ espúria                      |
| AUD19-05 | `COMPLETED`   | Retenção/erasure fail-closed, migration 0025 e mapa de dados                              |
| AUD19-06 | `COMPLETED`   | Replay distribuído, atestação de preflight e negativos                                    |
| AUD19-07 | `COMPLETED`   | [ADR 0002](02_spec/adr/0002-hotspot-decomposition-bounded-slice.md) e fatia medida        |
| AUD19-08 | `COMPLETED`   | Skips 0 required, mutantes 9/9 e piso §9.1 de branches críticos fechado (gate versionado) |
| AUD19-09 | `COMPLETED`   | SLIs, alertas→runbooks e exercício sintético; SLOs pendentes de owner                     |
| AUD19-10 | `COMPLETED`   | axe/contraste, teclado, zoom, forced-colors e 3 browsers                                  |
| AUD19-11 | `COMPLETED`   | Topologia API+worker, non-root, readiness/drain, digests e smoke                          |
| AUD19-12 | `IN_PROGRESS` | P1 de cobertura fechado; selo final e verificação candidate-bound em execução             |
| AUD19-13 | `BLOCKED`     | Ambiente e autoridade externos                                                            |
| AUD19-14 | `BLOCKED`     | Ambiente e autoridade externos                                                            |
| AUD19-15 | `BLOCKED`     | Depende de AUD19-12..14; exigirá `WAITING_HUMAN_APPROVAL` quando o dossiê estiver apto    |

## Decisões correntes

- Perfil de release local: candidato selado `NO_GO` em 2026-09-20 (`4374a9ef…@c0f46b9`); staging real e produção `NO_GO`.
- P1 local aberto: piso §9.1 de branches de módulos críticos (kernel `81,08%`; `orchestration.ts` `68,38%`; `kernel-composition.ts` `63,60%`; RLS `78,13%`); não reduzir o piso.
- Task success de evals: `>=97%` (fonte operacional `scripts/lib/eval-contract.mjs`);
  `53/56 = 94,64%` é negativo conhecido e deve falhar.
- Oito gates externos/humanos continuam sem validação: provider, canal,
  identidade externa, RAG institucional, RPO/RTO, piloto, rollback e sign-off.

## Próxima ação

- Próxima ação: selar e verificar o candidato final AUD19-12 com crítico fresco; manter staging real e produção NO_GO.
