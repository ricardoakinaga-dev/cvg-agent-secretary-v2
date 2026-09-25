# CURRENT — índice canônico de estado

- Documento: `docs/CURRENT.md`; criado por `AUD19-02` (programa `AUD19-REM`).
- Avaliação transversal de base: [auditoria 0569](04_audit/0569_repository_audit_2026-09-23.md), complementada pela [revisão incremental 0571](04_audit/0571_implementation_state_review_2026-09-23.md) após o BUILD query-parser; ambas usam a [base F01–F30 da auditoria 0568](04_audit/0568_full_repository_audit_2026-09-21.md). A revisão 0571 não recalcula as notas 0569. A [reauditoria 0567](04_audit/0567_aud19_delivery_reaudit_2026-09-20.md) permanece histórica. Ordem e gates operacionais: [plano 0335](03_build/0335_aud20260921_executive_plan.md), [roadmap 0336](03_build/0336_aud20260921_roadmap.md) e [backlog 0337](03_build/0337_aud20260921_backlog.md). A auditoria 0566, AUD19 e 0333/0334 permanecem históricos.
- Planejamento complementar das 50 melhorias: [plano 0339](03_build/0339_plan50_executive_plan_20260923.md), [roadmap 0340](03_build/0340_plan50_roadmap_20260923.md) e [backlog candidato 0341](03_build/0341_plan50_backlog_20260923.md). A reativação local de `AUD20-10/17/20` em 2026-09-23 está registrada; gates e dependências permanecem obrigatórios.
- Rodada incremental atual: [melhorias 0572](04_audit/0572_next_improvement_round_2026-09-23.md), [roadmap 0342](03_build/0342_post_query_roadmap_20260923.md) e [backlog 0343](03_build/0343_post_query_backlog_20260923.md), subordinados ao programa AUD20 e aos 50 itens de base.
- Estados oficiais (`docs/07_agents/AGENTS.md`): `IN_PROGRESS`, `READY_FOR_NEXT_STEP`, `BLOCKED`, `WAITING_HUMAN_APPROVAL`, `COMPLETED`. Nenhum outro estado governa task corrente; rótulos de release (`NO_GO`) e perfis são decisões, não estados de task.
- Regra: documento histórico permanece preservado e rotulado; este índice não reescreve passado e não substitui required gate por média.
- Base de composição de workflow: [ADR 0001](02_spec/adr/0001-langgraph-frontier-decision.md) — fronteira contratual implementada; dependência LangGraph upstream `BLOCKED` por supply chain.

## Fontes correntes por domínio

| Domínio                       | Fonte corrente                                                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pipeline e governança         | [AGENTS.md operacional](07_agents/AGENTS.md) e [AGENTS.md raiz](../AGENTS.md)                                                                                |
| Contrato de qualidade (AAA)   | [aaa_quality_contract.md](02_spec/aaa_quality_contract.md) v2 e anexos em `docs/04_audit/evidence/AAA/AAA-04/`                                               |
| Execução corrente do programa | [runtime state](99_runtime_state.md), [execution log](20_master_execution_log.md), [backlog master](30_backlog_master.md)                                    |
| Backlog operacional corrente  | [0337](03_build/0337_aud20260921_backlog.md) (`AUD20-REM v2`, 20 tasks)                                                                                      |
| Backlog operacional AUD19     | [0332](03_build/0332_aud20260919_backlog.md), agora histórico/supersedido pela reauditoria 0567                                                              |
| Backlog operacional AUD17     | [0330](03_build/0330_aud20260917_backlog.md) e [0329](03_build/0329_aud20260917_roadmap.md); tasks locais com evidência                                      |
| Certificação current          | [certification/current.json](../certification/current.json) (ponteiro) → `certification/phase11/`                                                            |
| Requisitos Phase 11           | [requirements-matrix.json](11_phase11/requirements-matrix.json)                                                                                              |
| Qualificação local AUD17      | [AUD17-02 requirements matrix](04_audit/evidence/AUD17-AAA/AUD17-02-requirements-matrix.json) e [baseline](04_audit/evidence/AUD17-AAA/AUD17-01-baseline.md) |
| Rastreabilidade AUD19         | [AUD19 requirements matrix](04_audit/evidence/AUD19/AUD19-requirements-matrix.json)                                                                          |
| Rastreabilidade AUD20 v2      | [matriz F01–F30](03_build/tracking/aud20_v2_findings_matrix.json)                                                                                            |
| Barra AUD17                   | [quality-bar-v1.json](04_audit/evidence/AUD17-AAA/quality-bar-v1.json)                                                                                       |

## Relações de supersessão

| Documento histórico                                                                                                                   | Supersedido por / tratado como                                                                                                                    | Nota                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `docs/10_phase10/**`                                                                                                                  | `docs/11_phase11/**` e pacote `certification/phase11/`                                                                                            | Phase 10 permanece verificável como histórico              |
| Pacote Phase 10 `certification/logs/historical/2026-09-11-phase10`                                                                    | `certification/current.json`                                                                                                                      | `certification:verify:historical` não qualifica o corrente |
| [0565](04_audit/0565_recent_implementations_audit_2026-09-17.md) e [0566](04_audit/0566_full_repository_gauntlet_audit_2026-09-19.md) | [0567](04_audit/0567_aud19_delivery_reaudit_2026-09-20.md) para o estado corrente                                                                 | 0565/0566 permanecem históricos                            |
| [0331](03_build/0331_aud20260919_roadmap.md) / [0332](03_build/0332_aud20260919_backlog.md)                                           | [0333](03_build/0333_aud20260920_roadmap.md) / [0334](03_build/0334_aud20260920_backlog.md)                                                       | AUD19 preservado como programa anterior                    |
| [0333](03_build/0333_aud20260920_roadmap.md) / [0334](03_build/0334_aud20260920_backlog.md)                                           | [0335](03_build/0335_aud20260921_executive_plan.md) / [0336](03_build/0336_aud20260921_roadmap.md) / [0337](03_build/0337_aud20260921_backlog.md) | AUD20 ampliado para F01–F30; histórico preservado          |
| `aaa_quality_contract.md` v1 (`docs/04_audit/evidence/AAA/AAA-04/v1/`)                                                                | [aaa_quality_contract.md](02_spec/aaa_quality_contract.md) v2                                                                                     | Mudança de bytes invalida evidência v1                     |
| `PHASE11.1-FORMAL-CLOSURE` e rodadas intermediárias Phase 11                                                                          | Pacote corrente em `certification/phase11/`                                                                                                       | Registros anteriores permanecem no execution log           |
| Relatórios `0562`, `0563`, `0564` e evidências AAA-21 anteriores                                                                      | Registros históricos; não qualificam o candidato corrente                                                                                         | Preservados; não reescritos                                |
| [0300](03_build/0300_build_engineer_master.md) / [0301](03_build/0301_roadmap.md) / [0302](03_build/0302_backlog_master.md)           | Masters correntes; apontam para 0333/0334                                                                                                         | Não são substituídos; são ponteiros de processo            |

## Tasks correntes (estados oficiais)

- status: `READY_FOR_NEXT_STEP` — `AUD20-17` concluído com aceite limitado em escopo controlado local; `AUD20-10` liberada para execução admitida; staging/produção `NO_GO`.
- task corrente: `AUD20-10` — collector admitido (SPEC/hash e allowlist vigentes); a execução é a próxima ação.
- aceite anterior: `AUD20-17`/`IMP50-40` — crítica final C06/C07 `PASS` (`ACCEPT_LIMITED`); coverage 4/4 (92,99/90,19/91,35/93,49), módulo `request-context` 100% (75/75) vs piso 95% (Q1), PostgreSQL 30/354 zero-skip, mutation 16/16, sem redução reference-only (0 regressões/210), binding `dc9b95b0…`/`c72af2e3…`. Condições: fonte alterada reabre C06 e exige rerun de PostgreSQL/mutation; "sem redução" `REFERENCE_ONLY`; piso 95% vinculante; sem release. Ver [parecer final](04_audit/evidence/AUD20/AUD20-17-final-critic-c06-c07-v1-20260925.md) e [aceite](04_audit/evidence/AUD20/AUD20-17-request-context-limited-acceptance-20260925.md).
- registro histórico da disposição anterior (até 2026-09-25): `AUD20-17` — subtask `IMP50-40` query-parser mantém
  `PASS_LOCAL` em seu escopo; request-context v2 BUILD local está executado e
  não aceito. Crítica independente C01–C05 `PASS`, C02 `PASS` conforme a emenda
  v2 e escopos v1/integrado separados; C06/C07 `FAIL`. A suíte integrada teve
  2.256 PASS/192 skips/0 falhas; functions 89,27% reportados e request-context
  branches 92% reportados, sem binding resolvido do manifesto. A decisão humana
  Q1 determina que o piso de 95% se aplica a `request-context.ts`; o registry
  congelado não foi alterado e os 92% continuam `REPORT_ONLY`, sem resultado
  C06 candidate-bound.
  Mutation e PostgreSQL não foram executados. Ver a
  [errata](04_audit/evidence/AUD20/AUD20-17-request-context-branch-floor-erratum-20260924.md)
  e os [achados intermediários I3](04_audit/evidence/AUD20/AUD20-17-nqp03-disposition-critic-v3-interim-20260924.md),
  que levaram à marcação explícita como históricos dos checkpoints antigos no
  backlog master, em 0337 e na seção Q1 04:42Z de 0342. I3 não emitiu parecer
  final nem PASS. A [crítica I2](04_audit/evidence/AUD20/AUD20-17-nqp03-disposition-critic-v2-20260924.md)
  registrou a falta do marcador histórico no execution log.
  A crítica documental I4 rejeitou DOC-03 por snapshots antigos ainda sem
  marcador histórico em runtime, execution log e 0337; esses registros foram
  qualificados sem reescrever os fatos capturados. A crítica I5 rejeitou
  DOC-02 porque duas evidências vinculadas ainda descreviam como atuais textos
  corrigidos em 0190/0337 e porque PASSes anteriores não estavam vinculados aos
  hashes antigos revisados. Ver [I4](04_audit/evidence/AUD20/AUD20-17-nqp03-disposition-critic-v4-20260924.md)
  e [I5](04_audit/evidence/AUD20/AUD20-17-nqp03-disposition-critic-v5-20260924.md)
  e [I6](04_audit/evidence/AUD20/AUD20-17-nqp03-disposition-critic-v6-20260924.md).
  A rota C06 e a reconciliação foram qualificadas por hash. A crítica
  fresh-context I6 deu `PASS` em DOC-01–DOC-05 para a disposição documental
  anterior; não alterou os gates. A decisão Q1 posterior está no [recibo](04_audit/evidence/AUD20/AUD20-17-branch-floor-human-decision-20260924.md).
  Após registrar o parecer e
  atualizar os ponteiros, `docs:check` final validou 1.676 links/628 JSONs; a
  formatação e `git diff --check` passaram.
  Ver [relatório BUILD](04_audit/evidence/AUD20/AUD20-17-request-context-v2-build-report-20260924.md),
  [crítica independente](04_audit/evidence/AUD20/AUD20-17-request-context-v2-independent-critic-20260924.md),
  [manifesto candidate-bound](04_audit/evidence/AUD20/AUD20-17-request-context-v2-build-candidate-manifest-20260924.json)
  e [parecer inicial NQP-03 v1 (histórico)](04_audit/evidence/PLAN50-20260923/nqp03-request-context-review-20260924.md).
- A [proposta de rota C06 revisada](04_audit/evidence/AUD20/AUD20-17-C06-gate-route-proposal-20260924.md),
  SHA-256 `3c345e1fd084d4f11c211e0f30d8b7d1423fe81210e60c3f04404b3d83beff52`,
  distingue métrica reportada de binding candidate-bound, exige baseline exata,
  condiciona mutation à admissão separada e manda reavaliar a Discovery 0024
  existente. A crítica v3 (`REVISE`) apontou o resumo stale de 0337 e a falta de
  binding da crítica NQP-01 aos bytes atuais da Discovery; ambos foram
  explicitados/corrigidos. A crítica fresh-context v4 deu `PASS` somente para
  prontidão documental do hash anterior
  `4d20e67ab6f4e93bda7405f85a8e7c4c5e953930228453bb1939a283041652f2`;
  não revisou os bytes atuais nem aprovou Discovery, C06/C07, produto ou
  execução. A I6 deu `PASS` documental nos bytes atuais, sem adjudicar gates.
  A Discovery tem SHA-256
  `db2493fde811e6b135360f38fcb6eaac10400660f2fb492ef04b2eae6ae8250d`, enquanto
  o parecer anterior cobre `cbf4b7d12b33ca0ee862737afd203202620fdc68325fa01601f28480ea8da74c`.
  A rota não é SPEC/admissão e não altera C06/C07 `FAIL` nem o bloqueio
  NQP-02/AUD20-11. Ver [crítica da rota v4](04_audit/evidence/AUD20/AUD20-17-C06-gate-route-critic-v4-20260924.md)
  e [disposição I5](04_audit/evidence/AUD20/AUD20-17-nqp03-disposition-critic-v5-20260924.md).
- A [reconciliação read-only de manifesto/baseline](04_audit/evidence/AUD20/AUD20-17-manifest-baseline-reconciliation-20260924.md)
  (SHA-256 atual `e0058aa6ffa5c4b0a6276eb9af04ca69ad4a252823f2b9e58d8e220c072e8923`)
  encontrou consistência parcial de hashes, sem reproduzir o manifesto SHA
  `11f061…` citado pelo BUILD report nem enumerar todas as 301 fontes do run
  integrado. Métricas permanecem `REPORT_ONLY`; a comparação “sem redução” é
  `NOT_RUN`. C06/C07 `FAIL`; a decisão Q1 determina que o piso de 95% se aplica
  ao módulo, mas a métrica 92% permanece `REPORT_ONLY` sem binding candidate-bound.
- A crítica independente fresh-context da reconciliação deu `PASS` somente
  para a precisão da versão anterior do relatório (SHA-256
  `a7869131debf4f4c618672a1fbf27de38377ea002af3ba1b5d7ab3d3b3eb67c4`);
  o adendo editorial que esclarece a fotografia histórica tem novos bytes,
  revisados pela I6 como parte do `PASS` documental DOC-01–DOC-05. Esse PASS não
  aprovou gates nem execução. A decisão humana sobre aplicabilidade foi
  registrada; a próxima dependência é binding candidate-bound e os gates C06
  próprios. Ver o [recibo Q1](04_audit/evidence/AUD20/AUD20-17-branch-floor-human-decision-20260924.md).
- O rebaseline do Gauntlet `IMP50-NQP-20260923` não foi concluído: o state manager
  recusou os hashes antigos de quatro itens do manifesto de artefatos. State,
  bar, manifesto e histórico foram preservados; ver [recibo](04_audit/evidence/AUD20/AUD20-17-gauntlet-rebaseline-attempt-20260924.md).
- `AUD20-10/IMP50-09`: SPEC e BUILD local sintético aprovados/admitidos,
  enfileirados após AUD20-17. Staging/produção permanecem `NO_GO`.
- `AUD20-19-FU1/IMP50-18`: SPEC harness v4 SHA-256
  `decb8d441c2a17678026c6305fb71a9c31a2069d6836ad010362f9c3b9179688` tem
  crítica `PASS` somente para prontidão de revisão humana. O usuário aprovou a
  SPEC e admitiu apenas BUILD local controlado do harness; ver
  [recibo](04_audit/evidence/AUD20/AUD20-19-FU1-human-approval-admission-20260924.md).
  O preflight read-only confirmou namespace sem rota externa, versões fixadas
  disponíveis e executável Chromium presente. O BUILD local passou unit focal
  `21/21`, Playwright isolado `2/2`, typecheck, lint e formatação. A primeira
  suíte integral, repetida após sincronizar runtime, passou em 289 arquivos
  (12 skipped), com 2.256 testes PASS e 192 skips. Coverage: statements 90,84%,
  branches 87,00%, functions 89,27%, lines 91,43%. `docs:check` passou com
  1.875 links/634 JSONs. A sessão humana permanece sem autorização; FU1 não
  está aceita até crítica R2 independente. Ver o
  [preflight](04_audit/evidence/AUD20/AUD20-19-FU1-environment-preflight-20260924.md)
  e o [recibo de admissão](04_audit/evidence/AUD20/AUD20-19-FU1-human-approval-admission-20260924.md).
- execução PLAN50: 2/50 IMP50 aceitos somente em escopo documental/de evidência
  (`IMP50-41`, `IMP50-50`); nenhum item de produto inteiro foi aceito.
  `IMP50-40` tem **uma subfatia query-parser aceita localmente**, mas permanece
  aberto. O [registro por item](04_audit/evidence/PLAN50-20260923/imp50-status-20260923.md)
  é snapshot anterior ao aceite FU1; a disposição atual está na
  [revisão 0571](04_audit/0571_implementation_state_review_2026-09-23.md).
- `IMP50-41` foi aceito pela reconciliação limitada de AC05/C05/C06 do
  `AUD20-08`: Phase 10 segue histórica e o negativo focal rejeita sua seleção
  como namespace corrente. O parecer não qualifica candidato/release e não
  altera o pai `AUD20-08`; consulte a
  [auditoria](04_audit/evidence/PLAN50-20260923/imp50-41-phase10-metadata-audit-20260923.md).
- R8 independente: `IMP50-42` tem follow-up proposto sob `AUD20-08`; crítica
  fresh-context `PASS` para revisão humana no hash
  `2b8f3464bf6e21174ccd41cf65011a61455396698843e5c0a6222f0f58e5ada6` (7.020
  bytes). Continua pendente de decisão humana e não foi admitido para BUILD.
  Consulte a [proposta e preparação](04_audit/evidence/PLAN50-20260923/imp50-42-spec-preparation-20260923.md).
- `IMP50-50` concluiu `AUD20-08-FU2` somente como catálogo documental; o pai
  `AUD20-08` permanece `COMPLETED`, sem extensão de autorização de BUILD. A
  navegação `IMP50-43` continua separada e dependente de `IMP50-21`.
- As revalidações read-only de 06:46Z e 07:56Z precederam a aprovação humana
  posterior do slice `IMP50-40`; permanecem como registro histórico e não são
  mais o status corrente. Ver [revalidação do gate](04_audit/evidence/PLAN50-20260923/imp50-next-action-gate-review-20260923.md)
  e [revalidação de lanes](04_audit/evidence/PLAN50-20260923/ready-lane-revalidation-20260923.md).
- A SPEC independente `AUD20-08-FU1`/`IMP50-42` também está pronta para revisão
  humana, mas segue `DRAFT_PENDING_HUMAN_REVIEW` e não muda a ordem crítica. O
  ponteiro PLAN50 divergente em 0300 pertence ao follow-up ainda não admitido
  `IMP50-21`; nenhum master foi alterado.
- `IMP50-49` concluiu o inventário read-only v2 no corte de
  `2026-09-23T17:22:44Z`: 2.433 arquivos regulares / 28.970.553 bytes; JSONL
  SHA-256 `89c0bb3747dcb31f38db8ec94b9fff1ab0efd68cb522a3088e78bdc26ec06a56`.
  A segunda varredura passou sem diferenças. Frente à v1 preservada, são 21
  adições, nenhuma ausência e um arquivo alterado (`imp50-status-20260923.md`).
  Os três sidecars v2 ficam fora da lista de membros. O overlay continua sem
  adjudicação para 141 vínculos insuficientes; a regra humana é mantê-los sem
  adjudicação até haver suporte suficiente, exigindo referência exata por item;
  v1 permanece baseline e v2 suplemento. Sem `DISCOVERY_READY`, PRD/SPEC/checker/BUILD ou mudança
  de classe. Ver [relatório v2](04_audit/evidence/PLAN50-20260923/imp50-49-full-inventory-v2-report-20260923.md),
  [JSONL v2](04_audit/evidence/PLAN50-20260923/imp50-49-full-inventory-v2-20260923.jsonl),
  [parecer do overlay](04_audit/evidence/PLAN50-20260923/imp50-49-overlay-review-v2-20260923.md),
  [mapa](04_audit/evidence/PLAN50-20260923/imp50-49-historical-reference-map-v2-20260923.jsonl)
  e [Discovery 0022](00_discovery/0022_aud20_08_imp50_49_evidence_lineage.md).
  O [manifesto candidato dos 99 membros](04_audit/evidence/PLAN50-20260923/imp50-49-aud19-10-member-manifest-candidate-20260923.jsonl)
  enumera somente membros presentes no snapshot v1; não prova vínculo com a
  execução original nem adjudica classe.
  A revisão independente confirmou o manifesto e seus limites ([parecer](04_audit/evidence/PLAN50-20260923/imp50-49-aud19-10-member-manifest-critic-v1-20260923.md));
  a decisão humana mantém os 141 vínculos insuficientes sem adjudicação até
  evidência suficiente e exige referência exata por arquivo em registro
  apropriado. A busca posterior encontrou 27 menções textuais para 13 alvos em
  3.245 caminhos filtrados; todas são candidatas, sem hash dos bytes-alvo ou
  prova de membership na execução/snapshot original. A crítica fresh-context
  v2, vinculada à Discovery atual
  (`f5b0d3623c0b3b3bcf3588679a5bf4141d8f87060729595575aaa54b140430cb`), mantém
  `IN_PROGRESS`: faltam suporte por item, autoridade/cobertura, política
  pós-corte, regras/fixtures determinísticas para as seis classes e leitura
  determinística. A contagem intermediária 2.428 segue sem manifesto de
  caminhos e não foi reconciliada item a item com v2=2.433. v1 permanece
  baseline e v2 suplemento imutável. Ver
  [crítica v2](04_audit/evidence/PLAN50-20260923/imp50-49-discovery-critic-v2-20260924.md),
  [relatório](04_audit/evidence/PLAN50-20260923/imp50-49-exact-path-followup-20260924.md)
  e [receipt](04_audit/evidence/PLAN50-20260923/imp50-49-exact-path-search-receipt-20260924.json).
  A checagem Git posterior encontrou os 99 caminhos raw exatos na árvore do
  commit AUD19-10, 33 por browser, mas não vinculou bytes ao run original nem
  SHA-256 do snapshot aos blobs. Os 141 seguem sem adjudicação; ver
  [relatório](04_audit/evidence/PLAN50-20260923/imp50-49-aud19-10-git-tree-membership-audit-20260924.md)
  e [receipt](04_audit/evidence/PLAN50-20260923/imp50-49-aud19-10-git-tree-membership-receipt-20260924.json).
  A crítica fresh-context deu `PASS_WITH_SCOPE_LIMITS` para esses hashes e a
  Discovery revisada; confirmou membership/OIDs no commit sem provar participação
  no run. Não autoriza gate nem adjudicação. Ver
  [parecer](04_audit/evidence/PLAN50-20260923/imp50-49-aud19-10-git-tree-membership-critic-v1-20260924.md).
  A v1 permanece o baseline escolhido e a v2 é suplemento intacto; Discovery
  não está `DISCOVERY_READY`.
  Isso não reabre AUD20-08.
- `AUD20-17-FU1`/`IMP50-40`: Discovery 0023 e PRD 0033 definem a fatia
  separada para mover somente os parsers de query; a SPEC mantém C02 e propõe
  limites de `request-query.ts` e tamanho agregado. A crítica fresh-context v2
  não encontrou bloqueador de SPEC e requereu teste de mensagens HTTP exatas.
  O usuário aprovou SPEC e BUILD local hash-bound; AC01–AC06 passaram e a
  crítica final independente deu `PASS`. Medidas: `server.ts=4622`,
  `request-query.ts=138`, total dos três módulos `5018`. Ver [SPEC](02_spec/aud20_17_imp50_40_query_parsers_20260923.md),
  [relatório](04_audit/evidence/AUD20/AUD20-17-query-build-report-20260923.md),
  [crítica final](04_audit/evidence/AUD20/AUD20-17-query-final-critic-v3-20260923.md)
  e [hashes/recibos](04_audit/evidence/AUD20/AUD20-17-query-raw-20260923/candidate-final-audit.sha256).
- Reafirmação request-context às `19:29Z`: o usuário aprovou novamente somente
  o BUILD local controlado para o mesmo adendo/hash e allowlist. A medição de
  `server.ts=4745` e a falha C02 descrevem o candidato isolado daquela primeira
  fatia antes do FU1. A aprovação query-parser separada não altera seu status
  não aceito. Nenhum BUILD foi repetido para request-context.
- Direção SPEC de 2026-09-23: ampliar somente request-context o necessário para
  atingir o cap. Isso ainda não aprova emenda nem autoriza novo BUILD; preparar
  proposta concreta e submetê-la ao gate aplicável. `AUD20-10` segue enfileirada
  porque Q1 não liberou o DAG.
- NQP-02: inventário estático preliminar reconstruiu 12 arquivos totalmente
  skipped/70 casos e 17 parcialmente skipped/122, todos condicionais a
  `TEST_DATABASE_URL`; o teste PostgreSQL obrigatório ainda não foi executado.
  [Tabela por arquivo](04_audit/evidence/PLAN50-20260923/nqp02-static-skip-inventory-v1-20260924.md).
- `IMP50-21`: draft SPEC documental
  [reconciliação de masters](02_spec/aud20_08_imp50_21_master_reconciliation_20260923.md),
  SHA-256 `7edfc5b4c6647f6064d3e62498552f20816181b57e8f9ceea7db12d530c795fd`,
  recebeu crítica delta `PASS` somente para prontidão de revisão humana. O
  follow-up continua não registrado/não admitido; espera a liberação da ação
  crítica AUD20-17/IMP50-40. Nenhum master foi alterado e a próxima ação
  canônica continua a decisão humana da SPEC query-parser.
- Reafirmações recebidas às `19:07Z` repetem escolhas já executadas: inventário
  integral read-only v2 de IMP50-49 e BUILD local request-context de IMP50-40,
  vinculado ao mesmo hash/allowlist. Não houve nova captura ou BUILD; permanecem
  a regra de linhagem pendente e o C02 37 linhas acima do teto, sem aceite C06/C07.
- Gauntlet: o bar, orçamento e capacidades de PLAN50 estão preparados, mas
  não há run-state PLAN50. O `state.json` existente em `.gauntlet/` pertence ao
  run concluído `REM-0539-AAA`; o state manager não cria um segundo run no mesmo
  repositório e esse registro histórico não foi sobrescrito. A continuidade
  corrente permanece nos documentos PLAN50 0339–0341 e no runtime state.
- Complemento de 2026-09-24: a verificação read-only dos 42 caminhos restantes
  encontrou membership de caminho/OID para 39 em árvores Git e existência no
  worktree, não HEAD, para três arquivos AUD20. Não provou bytes do snapshot ou
  composição dos runs. A crítica v1 deu `PASS_WITH_SCOPE_LIMITS` e o delta-review
  v2 deu `PASS` para a Discovery final SHA-256
  `9c25ce65bb2d8b2e308f54959fbf9b7490f58982fd21b8a42857712e7a8c4752`.
  Todos os 141 seguem sem adjudicação; v1 baseline/v2 suplemento intactos,
  Discovery `IN_PROGRESS`, sem `DISCOVERY_READY`. Ver [relatório](04_audit/evidence/PLAN50-20260923/imp50-49-remaining-42-git-membership-audit-20260924.md),
  [receipt](04_audit/evidence/PLAN50-20260923/imp50-49-remaining-42-git-membership-receipt-20260924.json),
  [crítica v1](04_audit/evidence/PLAN50-20260923/imp50-49-remaining-42-git-membership-critic-v1-20260924.md)
  e [crítica v2](04_audit/evidence/PLAN50-20260923/imp50-49-remaining-42-git-membership-critic-v2-20260924.md).
- Revalidação PLAN50 de 2026-09-23: nenhuma outra fatia IMP50 está pronta para
  edição sob os gates então vigentes; precede a admissão e auditoria do
  query-parser e permanece histórica. O request-context continua não aceito;
  próximo passo é rever documentalmente sua disposição à luz do candidato
  integrado e do C02 agora dentro do cap.
  IMP50-49 concluiu somente o inventário integral read-only e ainda precisa da
  decisão de linhagem antes de `DISCOVERY_READY`.

  Auditoria adicional IMP50-49: as 12 referências exatas do formatter ligam
  somente o log, não os bytes-alvo; o candidate manifest exclui a árvore de
  evidências e registra worktree sujo. Nenhum dos 141 foi adjudicado; ver
  [auditoria de escopo](04_audit/evidence/PLAN50-20260923/imp50-49-formatter-path-scope-audit-20260924.md).
  A crítica de follow-up `PASS` confirmou que 12 dos 13 alvos do receipt
  aparecem no log (o 13º é referência ao código AUD19-11); IMP50-49 segue sem
  `DISCOVERY_READY` e sem adjudicar os 141. Ver
  [parecer](04_audit/evidence/PLAN50-20260923/imp50-49-formatter-path-scope-critic-v1-20260924.md).

| Faixa                 | Estado                   | Nota                                                                                                                                                            |
| --------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AUD20-01              | `COMPLETED`              | SPEC, barra, matriz, receipts e revisão concluídos; G0 local controlado aprovado                                                                                |
| AUD20-02              | `COMPLETED`              | `PACKAGE_READY` em critica independente fresca; corpus canonico/digest e threshold declarado fechados                                                           |
| AUD20-03              | `COMPLETED`              | RED/GREEN local de lineage/concorrencia, binding candidate-bound e critica independente PASS                                                                    |
| AUD20-04              | `COMPLETED`              | Implementação local de lotes/tombstone/migration; C01–C07 PASS, binding PASS e crítica independente fresca PASS                                                 |
| AUD20-05              | `COMPLETED`              | Attestation/grants/replay fail-closed; C01–C07, PostgreSQL, binding e crítica passaram                                                                          |
| AUD20-06              | `COMPLETED`              | Critic e mutation gates candidate-bound, fail-closed e verificados localmente                                                                                   |
| AUD20-07              | `BLOCKED`                | Depende de AUD20-08/18 e do restante do DAG de rebuild                                                                                                          |
| AUD20-08              | `COMPLETED`              | Índice/checker/pin Node implementados; C01–C07 e crítica independente passaram                                                                                  |
| AUD20-09              | `COMPLETED`              | Holdout integrado, 18 categorias, mutation 16/16 e crítica C01–C07 passaram                                                                                     |
| AUD20-10              | `READY_FOR_NEXT_STEP`    | SPEC/BUILD local de IMP50-09 aprovados e admitidos; liberada para execução (collector) após o aceite de AUD20-17                                                |
| AUD20-11              | `READY_FOR_NEXT_STEP`    | Gate NQP-02 executado (30/354, zero-skip, teardown); desbloqueio decidido pela autoridade humana em 2026-09-25                                                  |
| AUD20-12              | `BLOCKED`                | Depende da sequência e do DAG técnico                                                                                                                           |
| AUD20-13..15          | `BLOCKED`                | Opção A registrada; faltam inputs, owners, ambiente e gates anteriores                                                                                          |
| AUD20-16              | `COMPLETED`              | Política v1/30 dias, lifecycle/capacidade, binding e crítica concluídos localmente                                                                              |
| AUD20-17              | `COMPLETED`              | Aceite limitado do slice request-context em escopo controlado local (C06/C07 `PASS`); condições de reabertura registradas; query-parser FU1 mantém `PASS_LOCAL` |
| AUD20-18              | `BLOCKED`                | Runtime depende do restante do DAG v2                                                                                                                           |
| AUD20-19              | `WAITING_HUMAN_APPROVAL` | AUD20-19-FU1/IMP50-18 BUILD local verificado e R2 `PASS` do harness, sem aceite de produto; sessão humana permanece sem autorização em gate separado            |
| AUD20-20              | `BLOCKED`                | Reativada quanto à disposição; sequência R3 aguarda R2 e AUD20-18; nenhum BUILD iniciado                                                                        |
| AUD19-01..06,08,09,11 | `BLOCKED`                | Claims de conclusão supersedidos; remediação mapeada ao DAG AUD20                                                                                               |
| AUD19-07,10           | `COMPLETED`              | Entregas locais preservadas; limitações/P2 seguem no programa AUD20                                                                                             |
| AUD19-12              | `BLOCKED`                | Selo histórico; crítico corrente falha e imagens não correspondem ao candidato final                                                                            |
| AUD19-13..15          | `BLOCKED`                | Nenhuma integração/restore/piloto/sign-off executado                                                                                                            |

`AUD20-19-FU1`/`IMP50-18`: a SPEC v4
(`decb8d441c2a17678026c6305fb71a9c31a2069d6836ad010362f9c3b9179688`) recebeu
crítica fresh-context `PASS` somente para prontidão de revisão humana e foi
aprovada com admissão exclusiva do BUILD local controlado (ver
[recibo](04_audit/evidence/AUD20/AUD20-19-FU1-human-approval-admission-20260924.md)).
O BUILD local foi executado e verificado (unit focal `21/21`, Playwright
isolado `2/2`, suíte repetida `2.256 PASS`/192 skips), sem aceite até a crítica
independente R2; a sessão humana permanece sem autorização em gate separado.
Consulte a [SPEC](02_spec/aud20_19_imp50_18_human_session_harness_20260923.md),
o [parecer v4](04_audit/evidence/AUD20/AUD20-19-FU1-independent-critic-v4-20260923.md)
e o [relatório BUILD](04_audit/evidence/AUD20/AUD20-19-FU1-build-report-20260924.md).

## Decisões correntes

- Pacote histórico armazenado: `fbca3d2b…@fa78f92`; o P0 de integridade da auditoria 0567 rejeita sua elegibilidade para staging no HEAD atual. A baseline/manifesto AUD20-01 registra o candidato documental corrente; o antigo `9988762d…@cc28bfb` é histórico.
- P1 local de branches de módulos críticos: fechado com testes de comportamento e gate versionado (`docs/03_build/tracking/aud19-critical-coverage.json`): kernel `97,09%`, approval `98,72%`, policy `97,87%`, journal `98,15%`, canal `97,41%`, RLS `100%`; piso mantido em `>=95%`.
- Task success de evals: `>=97%` (fonte operacional `scripts/lib/eval-contract.mjs`);
  `53/56 = 94,64%` é negativo conhecido e deve falhar.
- Corpus de eval: `core-v1`, `56` cenarios, `14` adversariais e digest
  `1bc94f831b4ac6ae4511b26c91c2decc77aa765a3ac709268a2efa9d4af389cb`; qualquer
  contagem, cobertura adversarial ou digest divergente falha fechado.
- Oito gates externos/humanos continuam sem validação: provider, canal,
  identidade externa, RAG institucional, RPO/RTO, piloto, rollback e sign-off.
- A Opção A autoriza iniciar a preparação da qualificação externa, mas não fornece ambiente, janela, owners, credenciais, dossiês nem autorização de produção.
- AUD20-03: o fingerprint de reuse agora cobre session, conversation, envelope,
  objective, criteria, snapshot, trace e todos os campos JSON do planner;
  contexto malformado e divergente falha fechado. `approvalId` e tratado como
  continuacao somente no kernel controlado, com validacao separada do waiting
  step. O ack PostgreSQL agora exige lease ainda vigente no CAS final.
- O candidato local corrente e `e258b9bef592120288ca8bd3a51d043ff66cd06f9b0fc0a61a2ab65af6f7dad7`;
  source diff `a8a45a4238443794d0908773192cb316d23bfc1a4bb4511d4bee3188b1aef4fd`.
  PostgreSQL passou `30/331`; os focados passaram lineage `106/106`, Goal/kernel
  `14/14`, outbox `9/9` e kernel branch hardening `79/79`, todos sem skip quando
  executados com a URL descartável.
- O full unit com PostgreSQL passou `294/2360` sem skip. Coverage reportou
  statements `95,95%`, branches `92,54%`, functions `95,54%` e lines `96,64%`;
  `apps/worker/src/kernel-composition.ts` atingiu `486/511` branches (`95,10%`),
  acima do piso crítico congelado de `95%`.
  A arquitetura passou `5/5` com caps congelados e o binding foi recalculado
  independentemente. Typecheck, lint, build, format, diff-check e `docs:check`
  também passaram.
- A evidencia corrente esta em `AUD20-03-candidate-manifest.json`,
  `AUD20-03-candidate-receipt.json`, `AUD20-03-command-receipt.json`,
  `AUD20-03-raw-artifact-receipt.json`, `AUD20-03-critical-coverage.json` e nos
  dois reports da pasta AUD20. O
  candidato e local, dirty e nao elegivel para release; nenhuma integracao
  externa foi executada.

- A correção mínima do gap de redelivery foi aplicada: uma mensagem durável já
  marcada `waiting_approval`, sem continuation payload, retorna
  `approval_required_pending` sem chamar o orquestrador; a regressão passou e o
  cenário de continuation divergente continua falhando fechado.
- O pacote de evidências do candidato atual está reconciliado; o binding verifier
  puro passou com `14` artefatos brutos, validou também o `verificationArtifact` e o log independente de `7971` bytes foi
  conferido byte a byte.
- A crítica independente fresca executou duas capturas stdout-only, confirmou a
  determinismo do binding, os caps, a cobertura e a ausência de mutação do
  worktree; o resultado foi `PASS` para o escopo `CONTROLLED_LOCAL`.

- AUD20-04 foi autorizado explicitamente pelo usuário em 2026-09-21 para BUILD
  local controlado. O escopo aprovado preserva a PK inbound, adiciona tombstone
  e digest aditivos, registra a migration no runner ordenado e exige rollback
  transacional quando o ledger falhar; staging e produção permanecem `NO_GO`.

- O checkpoint local v2.1 de AUD20-04 está registrado em
  `docs/04_audit/evidence/AUD20/AUD20-04-v2-build-report-20260921.md` e na
  matriz de critérios. A implementação, os gates determinísticos e a crítica
  independente fresca passaram sob Node `22.23.2`; AUD20-04 está `COMPLETED`
  somente em escopo `CONTROLLED_LOCAL`. Não há promoção para staging ou
  produção.

- A SPEC draft de `AUD20-16` está registrada em
  `docs/02_spec/aud20_16_tombstone_lifecycle_capacity_20260921.md`. Ela
  preserva o baseline de 30 dias do D05-3/4, mas não inventa a janela
  pós-tombstone nem owner de capacidade; a task aguarda decisão humana antes de
  qualquer BUILD ou migration.

- O tooling neutro de capacidade foi implementado e testado em três volumes
  sintéticos, com `horizonDays` e `safetyFactor` obrigatórios e negativos
  fail-closed. A evidência parcial está em `AUD20-16-v1-build-report.md`, no
  command receipt e no raw-artifact receipt; isso não escolhe política nem
  libera o BUILD de schema.

- Último checkpoint `AUD20-16` (`2026-09-21T19:45:13Z`): oito vínculos de
  comando/artefato conferidos por SHA-256; `docs:check` `778/582`,
  `format:check` e `git diff --check` PASS. O status permanece
  `WAITING_HUMAN_APPROVAL`.

- Crítica independente fresh-context (`2026-09-21T19:57:38Z`) confirmou o gate
  humano e corrigiu C07 de `PASS` para `WAITING_HUMAN_APPROVAL`; C03 permanece a
  única fatia local concluível. O receipt final foi reconciliado: `11/11`
  artefatos brutos e `8/8` command links conferem em bytes/SHA-256, com dois
  typos corrigidos e `observedAt` posterior aos logs.

- Revisão independente de D05-3/4 (`2026-09-21T20:22:34Z`) classificou o
  horizonte pós-tombstone como `AMBIGUOUS`, owner formal como `BLOCKED` e review
  trigger como `BLOCKED`. O [pedido de decisão](02_spec/aud20_16_human_decision_request_20260921.md)
  separa confirmação dos 30 dias de uma escolha explícita; nenhum default foi
  adotado.

- Checkpoint `AUD20-16` (`2026-09-21T21:01:56Z`): o calculador offline exige
  `dataOrigin: "synthetic"` e rejeita origem ausente/não sintética. O focused
  passou `4/4`, o full passou `283` arquivos/`2183` testes/`188` skips, e
  lint/format/docs `782/582`/diff/binding passaram. Isso fortalece somente C03;
  não escolhe política nem libera AUD20-05.

- Checkpoint `AUD20-16` (`2026-09-21T21:50:41Z`): a regressão final passou
  `283` arquivos/`2184` testes/`188` skips, o focused passou `5/5` e o modo
  PostgreSQL `16.15` descartável local mediu p50/p95, relation/index/total e
  sweep nos três volumes sintéticos. O schema temporário foi removido; nenhum
  schema do produto ou migration foi tocado. C03 está localmente PASS limitado;
  binding/receipts e crítica fresh-context ainda são o fechamento da rodada.

- Checkpoint `AUD20-16` (`2026-09-21T22:18:02Z`): a crítica independente
  fresh-context v2 deu `PASS_LIMITED_NOT_COMPLETION`; C03, binding e receipts
  passam, C01/C02/C07 aguardam decisão humana e C04–C06 não foram executados.
  O gap de chronology apontado entre receipts (`22:01:54Z`) e checkpoints
  anteriores foi corrigido neste bloco. O estado segue `WAITING_HUMAN_APPROVAL`;
  não liberar AUD20-05, staging ou produção.

- Checkpoint `AUD20-16` (`2026-09-21T22:24:43Z`): o reseal final ficou alinhado
  ao checkpoint operacional sem alteração de código, policy ou source digest.
  Candidate binding/verifier e receipts permanecem PASS; a crítica v2 segue
  `PASS_LIMITED_NOT_COMPLETION`. O estado continua
  `WAITING_HUMAN_APPROVAL`; não liberar AUD20-05, staging ou produção.

- Checkpoint de preparação `AUD20-05` (`2026-09-21T22:52:00Z`): a SPEC de
  attestation de recursos observados, grants CRUD, bootstrap fail-closed e
  replay distribuído foi registrada em
  [aud20_05_resource_attestation_replay_20260921.md](02_spec/aud20_05_resource_attestation_replay_20260921.md).
  A opção A foi registrada como orientação de desenho escolhida pelo usuário,
  mas owner formal, autoridade/ação da revisão e validade de `AUD20-16` seguem
  `PENDING`. `docs:check` (`787/582`), format e diff passaram; nenhum BUILD,
  schema, migration ou teste de produto de AUD20-05 foi iniciado.

- Checkpoint de tooling `AUD20-05` (`2026-09-21T23:26:20Z`): o checker offline
  de attestation/recurso/grants passou focused `8/8` e a regressão completa
  passou `284` arquivos / `2.192` testes / `188` skips, com coverage
  `91,16%/87,24%/89,30%/91,76%`. A evidência está em
  [AUD20-05-tooling-report-20260921.md](04_audit/evidence/AUD20/AUD20-05-tooling-report-20260921.md).
  O resultado é `PASS_LIMITED` de tooling, com `notRuntimeProof=true`; não
  houve prova de grants PostgreSQL efetivos, startup/bind/claim do produto ou
  liberação de `AUD20-05`.

- Checkpoint de grants locais `AUD20-05` (`2026-09-22T00:18:15Z`): o probe
  descartável confirmou CRUD efetivo, `USAGE` sem `CREATE`, ownership separado,
  role mínima sem memberships/bypass-RLS e cleanup `PASS` em PostgreSQL local
  com objetos sintéticos. Focused `12/12`, regressão `285` arquivos / `2.196`
  testes / `188` skips e coverage `91,16%/87,24%/89,30%/91,76%` passaram. A
  evidência está em
  [AUD20-05-postgres-grants-probe-20260921.md](04_audit/evidence/AUD20/AUD20-05-postgres-grants-probe-20260921.md).
  É `PASS_LIMITED` para C03: não houve mudança de produto, startup/bind/claim,
  migration ou liberação do gate.

- Checkpoint adversarial `AUD20-05` (`2026-09-22T00:41:12Z`): seis variantes
  inseguras reais (`DELETE` ausente, `CREATE`, `TRUNCATE`, ownership runtime,
  bypass-RLS e membership) foram rejeitadas pelo oracle esperado, sempre com
  cleanup `PASS`; catálogo final `0` schemas/`0` roles residuais. Focused do
  probe `6/6`, regressão `285` arquivos / `2.198` testes / `188` skips,
  typecheck, lint e format passaram. O resultado continua
  `PASS_LIMITED/notRuntimeProof`; nenhuma fonte de produto foi alterada.

- Fechamento `AUD20-16` (`2026-09-22T01:59:30Z`): decisão humana v1 fixou
  horizonte pós-tombstone de 30 dias, owner e gatilhos até 2026-12-31. A
  migration 0029 e o operador manual minimizam somente `resource_id`, mantêm a
  identidade de replay, serializam legal holds e gravam ledger atômico. Os
  testes PostgreSQL passaram 13/13; capacidade 5/5; regressão final 285
  arquivos/2.198 testes; typecheck/lint/format/docs/diff PASS. A crítica v3
  encontrou cinco bloqueios, todos remediados; a v4 aprovou C01–C06 e o binding
  v2 passou no candidato `3f7a1731…`. AUD20-16 está `COMPLETED_LOCAL`; staging e
  produção continuam `NO_GO`.

- Fechamento `AUD20-05` (`2026-09-22T03:10:00Z`): C01–C07 passaram com
  attestation/config/key-ring candidate-bound, grants efetivos da role,
  concorrência entre duas pools e fail-closed sem memória em produção. A
  crítica encontrou o grant `CREATE` direto no banco; a correção e o negativo
  PostgreSQL foram confirmados. Binding `17/17` passou no candidato
  `83f2aa69…`; staging/produção permanecem `NO_GO`.

- Preparação `AUD20-06` (`2026-09-22`): Discovery/PRD/SPEC confirmaram que o
  crítico já é gate nominal, mas depende de input fresco candidate-bound, e
  que mutation ainda está fora da decisão agregada/verifier. AC01–AC06 e
  C01–C07 foram congelados; nenhum código foi alterado.

- Fechamento `AUD20-06` (`2026-09-22`): critic e mutation sentinel tornaram-se
  gates requeridos e candidate-bound. A crítica v1 encontrou quatro bypasses;
  catálogo, identidade, prova de execução e pacote foram endurecidos antes do
  reseal. Regressão `285/2.217` e mutation `9/9` passaram localmente.

- Preparação `AUD20-08` (`2026-09-22`): Discovery/PRD/SPEC definiram fonte
  current machine-readable, reconciliação semântica, pin Node `22.23.2` e
  isolamento de findings Phase 10. BUILD ainda não foi iniciado.

## Proposta paralela NQP-07 / IMP50-22

Discovery 0025 (`50173bb3e9112e76984bf7043db1fef8348ebda66d1c5e76f4cf9f73d539bb9d`)
segue sem `DISCOVERY_READY`: crítica v2 bloqueou avanço até decisão A/B sobre
a autoridade para status de subfatias. A aprovação IMP50-49 para manter 141
vínculos sem adjudicação é independente. Não há task oficial, BUILD ou mudança
da próxima ação primária AUD20-17.

## Próxima ação

- Próxima ação: executar o preflight read-only do reseal (certification:verify:phase11 e promotion:check) sobre o candidato selado `25c8222` e registrar o delta; manter `AUD20-10` com C01–C07 abertos (próximas fatias exigem decisão), `AUD20-19` sem sessão autorizada, 141 vínculos IMP50-49 sem adjudicação e staging/produção `NO_GO`.

- R0 concluído: worktree consolidado em 4 commits (B1 `eb84cd6`, B2 `80f97ef`, B3 `cb6abd7`, B4 `25c8222`) e candidato **selado** (`SEALED`, worktree `0/0/0`); ver [selagem v3](04_audit/evidence/AUD-20260925-REPO/b25-01-seal-report-v3-20260925.md).

- `AUD20-10/IMP50-09`: BUILD local executado e **slice aceito** (crítica delta fresh-context `PASS`; suíte final `2.647 PASS`/192 skips; coverage 4/4 ≥90%; mutation dirigida `22/22` na árvore final). C01–C07 permanecem abertos; ver [aceite](04_audit/evidence/AUD20/AUD20-10-imp50-09-slice-acceptance-20260925.md) e [relatório](04_audit/evidence/AUD20/AUD20-10-composition-build-report-20260925.md).
- `AUD20-19`: R2 `PASS` do harness; sessão humana sem autorização (adiada); nenhum aceite de produto.
- `AUD20-11`: gate NQP-02 executado (30/354, zero-skip, teardown) e desbloqueio decidido; ver [relatório](04_audit/evidence/AUD20/AUD20-11-postgres-gate-report-20260925.md). O recorte unitário de 24/09 permanece como registro histórico.
- Manter staging/produção `NO_GO`; nenhum commit/push/deploy, dado real ou release.
