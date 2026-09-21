# CURRENT — índice canônico de estado

- Documento: `docs/CURRENT.md`; criado por `AUD19-02` (programa `AUD19-REM`).
- Fonte corrente dos achados: [reauditoria 0567](04_audit/0567_aud19_delivery_reaudit_2026-09-20.md). Ordem e gates: [roadmap 0333](03_build/0333_aud20260920_roadmap.md) e [backlog 0334](03_build/0334_aud20260920_backlog.md). A auditoria 0566 e o programa AUD19 permanecem históricos.
- Estados oficiais (`docs/07_agents/AGENTS.md`): `IN_PROGRESS`, `READY_FOR_NEXT_STEP`, `BLOCKED`, `WAITING_HUMAN_APPROVAL`, `COMPLETED`. Nenhum outro estado governa task corrente; rótulos de release (`NO_GO`) e perfis são decisões, não estados de task.
- Regra: documento histórico permanece preservado e rotulado; este índice não reescreve passado e não substitui required gate por média.
- Base de composição de workflow: [ADR 0001](02_spec/adr/0001-langgraph-frontier-decision.md) — fronteira contratual implementada; dependência LangGraph upstream `BLOCKED` por supply chain.

## Fontes correntes por domínio

| Domínio                       | Fonte corrente                                                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pipeline e governança         | [AGENTS.md operacional](07_agents/AGENTS.md) e [AGENTS.md raiz](../AGENTS.md)                                                                                |
| Contrato de qualidade (AAA)   | [aaa_quality_contract.md](02_spec/aaa_quality_contract.md) v2 e anexos em `docs/04_audit/evidence/AAA/AAA-04/`                                               |
| Execução corrente do programa | [runtime state](99_runtime_state.md), [execution log](20_master_execution_log.md), [backlog master](30_backlog_master.md)                                    |
| Backlog operacional corrente  | [0334](03_build/0334_aud20260920_backlog.md) (`AUD20-REM`, 15 tasks)                                                                                         |
| Backlog operacional AUD19     | [0332](03_build/0332_aud20260919_backlog.md), agora histórico/supersedido pela reauditoria 0567                                                              |
| Backlog operacional AUD17     | [0330](03_build/0330_aud20260917_backlog.md) e [0329](03_build/0329_aud20260917_roadmap.md); tasks locais com evidência                                      |
| Certificação current          | [certification/current.json](../certification/current.json) (ponteiro) → `certification/phase11/`                                                            |
| Requisitos Phase 11           | [requirements-matrix.json](11_phase11/requirements-matrix.json)                                                                                              |
| Qualificação local AUD17      | [AUD17-02 requirements matrix](04_audit/evidence/AUD17-AAA/AUD17-02-requirements-matrix.json) e [baseline](04_audit/evidence/AUD17-AAA/AUD17-01-baseline.md) |
| Rastreabilidade AUD19         | [AUD19 requirements matrix](04_audit/evidence/AUD19/AUD19-requirements-matrix.json)                                                                          |
| Barra AUD17                   | [quality-bar-v1.json](04_audit/evidence/AUD17-AAA/quality-bar-v1.json)                                                                                       |

## Relações de supersessão

| Documento histórico                                                                                                                   | Supersedido por / tratado como                                                              | Nota                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `docs/10_phase10/**`                                                                                                                  | `docs/11_phase11/**` e pacote `certification/phase11/`                                      | Phase 10 permanece verificável como histórico              |
| Pacote Phase 10 `certification/logs/historical/2026-09-11-phase10`                                                                    | `certification/current.json`                                                                | `certification:verify:historical` não qualifica o corrente |
| [0565](04_audit/0565_recent_implementations_audit_2026-09-17.md) e [0566](04_audit/0566_full_repository_gauntlet_audit_2026-09-19.md) | [0567](04_audit/0567_aud19_delivery_reaudit_2026-09-20.md) para o estado corrente           | 0565/0566 permanecem históricos                            |
| [0331](03_build/0331_aud20260919_roadmap.md) / [0332](03_build/0332_aud20260919_backlog.md)                                           | [0333](03_build/0333_aud20260920_roadmap.md) / [0334](03_build/0334_aud20260920_backlog.md) | AUD19 preservado como programa anterior                    |
| `aaa_quality_contract.md` v1 (`docs/04_audit/evidence/AAA/AAA-04/v1/`)                                                                | [aaa_quality_contract.md](02_spec/aaa_quality_contract.md) v2                               | Mudança de bytes invalida evidência v1                     |
| `PHASE11.1-FORMAL-CLOSURE` e rodadas intermediárias Phase 11                                                                          | Pacote corrente em `certification/phase11/`                                                 | Registros anteriores permanecem no execution log           |
| Relatórios `0562`, `0563`, `0564` e evidências AAA-21 anteriores                                                                      | Registros históricos; não qualificam o candidato corrente                                   | Preservados; não reescritos                                |
| [0300](03_build/0300_build_engineer_master.md) / [0301](03_build/0301_roadmap.md) / [0302](03_build/0302_backlog_master.md)           | Masters correntes; apontam para 0333/0334                                                   | Não são substituídos; são ponteiros de processo            |

## Tasks correntes (estados oficiais)

- status: `READY_FOR_NEXT_STEP`
- task corrente: `AUD20-03` — validar lineage completa e jornada concorrente de Goal sob BUILD local controlado.

| Faixa                 | Estado                | Nota                                                                                           |
| --------------------- | --------------------- | ---------------------------------------------------------------------------------------------- |
| AUD20-01              | `COMPLETED`           | SPEC, barra, matriz, receipts e revisão concluídos; G0 local controlado aprovado               |
| AUD20-02              | `COMPLETED`           | Piso `0,97` irredutível; N01/N02 e eval sintético verificados no receipt candidate-bound atual |
| AUD20-03              | `READY_FOR_NEXT_STEP` | Próxima task; lineage/concorrência e negativos N03/N04                                         |
| AUD20-04..12          | `BLOCKED`             | Dependem da sequência e do DAG técnico após AUD20-03                                           |
| AUD20-13..15          | `BLOCKED`             | Opção A registrada; faltam inputs, owners, ambiente e gates anteriores                         |
| AUD19-01..06,08,09,11 | `BLOCKED`             | Claims de conclusão supersedidos; remediação mapeada ao DAG AUD20                              |
| AUD19-07,10           | `COMPLETED`           | Entregas locais preservadas; limitações/P2 seguem no programa AUD20                            |
| AUD19-12              | `BLOCKED`             | Selo histórico; crítico corrente falha e imagens não correspondem ao candidato final           |
| AUD19-13..15          | `BLOCKED`             | Nenhuma integração/restore/piloto/sign-off executado                                           |

## Decisões correntes

- Pacote histórico armazenado: `fbca3d2b…@fa78f92`; o P0 de integridade da auditoria 0567 rejeita sua elegibilidade para staging no HEAD atual. A baseline/manifesto AUD20-01 registra o candidato documental corrente; o antigo `9988762d…@cc28bfb` é histórico.
- P1 local de branches de módulos críticos: fechado com testes de comportamento e gate versionado (`docs/03_build/tracking/aud19-critical-coverage.json`): kernel `97,09%`, approval `98,72%`, policy `97,87%`, journal `98,15%`, canal `97,41%`, RLS `100%`; piso mantido em `>=95%`.
- Task success de evals: `>=97%` (fonte operacional `scripts/lib/eval-contract.mjs`);
  `53/56 = 94,64%` é negativo conhecido e deve falhar.
- Oito gates externos/humanos continuam sem validação: provider, canal,
  identidade externa, RAG institucional, RPO/RTO, piloto, rollback e sign-off.
- A Opção A autoriza iniciar a preparação da qualificação externa, mas não fornece ambiente, janela, owners, credenciais, dossiês nem autorização de produção.

## Próxima ação

- Próxima ação: obter crítica independente fresca do pacote corrigido; se `PACKAGE_READY`, executar `AUD20-03` com RED/GREEN de lineage/concorrência e negativos `AUD20-N03/N04`; não iniciar qualificação externa.
