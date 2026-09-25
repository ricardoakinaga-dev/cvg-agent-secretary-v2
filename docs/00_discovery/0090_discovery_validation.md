# 0090 — Discovery Validation

## Proposta NQP-07 / IMP50-22 — 2026-09-24

`BLOCKED` para `DISCOVERY_READY`; nenhum PRD ou BUILD admitido:
[0025 — drift semântico](0025_aud20_08_imp50_22_semantic_consistency.md),
SHA-256 `50173bb3e9112e76984bf7043db1fef8348ebda66d1c5e76f4cf9f73d539bb9d`.
A crítica fresh-context v2 revisou esse hash: os achados v1 sobre snapshot
IMP50 defasado, ausência de divergência de próxima ação observada e fixtures
foram atendidos. O gate segue bloqueado porque falta decisão de escopo: (A)
excluir status de subfatias do checker ou (B) criar registro machine-readable
versionado e autorizado. O pai `AUD20-08` continua `COMPLETED`; não há mismatch
corrente alegado. Ver [crítica v1](../04_audit/evidence/PLAN50-20260923/imp50-22-discovery-critic-v1-20260924.md)
e [crítica v2](../04_audit/evidence/PLAN50-20260923/imp50-22-discovery-critic-v2-20260924.md).
A resposta humana de IMP50-49 sobre manter 141 vínculos sem adjudicação é uma
decisão separada e não resolve A/B de NQP-07. A ação primária AUD20-17 não muda.

## Gate incremental AUD20-19 — 2026-09-22

`DISCOVERY_READY`:
[0021_aud20_19_chaos_load_human_a11y.md](0021_aud20_19_chaos_load_human_a11y.md).
F27/F28, perfis, gaps de evidência, resultado e fronteira humana estão
explícitos; `AUD20-10` foi adiada por decisão do usuário.

## Gate incremental AUD20-10 — 2026-09-22

`DISCOVERY_READY`:
[0020_aud20_10_operational_observability.md](0020_aud20_10_operational_observability.md).
F10, baseline, caminho incompleto, resultado, guardrails e dependências humanas
estão explícitos; `AUD20-17` foi adiada por decisão do usuário.

## Gate incremental AUD20-17 — 2026-09-22

`DISCOVERY_READY`:
[0019_aud20_17_hotspot_decomposition.md](0019_aud20_17_hotspot_decomposition.md).
F20, baseline, atores técnicos, resultado, alternativas, riscos e primeira
fatia vertical estão delimitados; não há desconhecido bloqueante para PRD.

## Gate incremental AUD20-17-FU1 / IMP50-40 — 2026-09-23

`DISCOVERY_READY` somente para PRD/SPEC de uma segunda fatia interna de
parsers de query:
[0023](0023_aud20_17_imp50_40_query_parsers.md). O bloco candidato mede 120
linhas, tem call sites e testes de rota identificados, e a revisão
independente concluiu que é condicionalmente coeso e provavelmente suficiente
para C02. O escopo não altera o cap, não reabre a aprovação request-context e
não autoriza BUILD; aprovação humana hash-bound e admissão separadas continuam
obrigatórias. Ver
[crítica](../04_audit/evidence/AUD20/AUD20-17-query-slice-scope-critic-20260923.md).

## Gate incremental AUD20-09 — 2026-09-22

`DISCOVERY_READY`:
[0018_aud20_09_integrated_holdout.md](0018_aud20_09_integrated_holdout.md).
O gap F19/F21, evidência, atores, resultado e guardrails sintéticos estão
delimitados; `AUD20-20` foi adiada por instrução explícita do usuário.

## Gate incremental AUD20-08 — 2026-09-22

`DISCOVERY_READY`:
[0017_aud20_08_state_node_reconciliation.md](0017_aud20_08_state_node_reconciliation.md).
Problema, atores, evidência, resultado, guardrails e fronteiras com AUD20-18/07
estão explícitos; não há desconhecido bloqueante para PRD.

## Proposta pendente AUD20-08-FU3 / IMP50-49 — 2026-09-24

`IN_PROGRESS`, sem gate `DISCOVERY_READY`:
[0022 — política de linhagem de evidências](0022_aud20_08_imp50_49_evidence_lineage.md),
SHA-256 `9c25ce65bb2d8b2e308f54959fbf9b7490f58982fd21b8a42857712e7a8c4752`.
O usuário escolheu inventário integral read-only, preservou a v1 como baseline
de 2.412 caminhos e a v2 como suplemento imutável de 2.433 caminhos, e confirmou
que os 141 vínculos insuficientes devem continuar sem adjudicação até evidência
suficiente, exigindo referência exata por arquivo em registro apropriado. O
mapa SHA-256
`03a077e6aa422ce6108c2570b886af105a6a592ca976ed96da92d12e6e70a3ba` mantém 99
casos `aggregate_only` e 42 `basename_only`; nenhum é reclassificado.

A busca read-only encontrou 27 ocorrências para 13 caminhos em um corpus
declarado de 3.245 caminhos; o receipt lista cada caminho/arquivo/linha e
vincula o digest da lista de caminhos, mas não os bytes das fontes. Os 13 hits
são candidatos: logs formatter não hash-vinculam os arquivos-alvo à execução e
snapshot originais; o restante é referência em código, não receipt. Os outros
128 alvos não apareceram somente dentro do corpus filtrado. A contagem
intermediária de 2.428 e o snapshot v2 de 2.433 continuam sem reconciliação
item a item porque o manifesto do corte 2.428 não foi preservado.

A crítica fresh-context v2, vinculada aos hashes da Discovery, relatório e
receipt, confirmou que `DISCOVERY_READY` não é sustentável. Continuam faltando
suporte suficiente por item, autoridade/cobertura da linhagem, política para
escritas posteriores ao corte, regras determinísticas para falhas e distinção
operacional das seis classes, fixtures de cada classe e comportamento
read-only determinístico. Ver [parecer independente](../04_audit/evidence/PLAN50-20260923/imp50-49-discovery-critic-v2-20260924.md),
[relatório de busca](../04_audit/evidence/PLAN50-20260923/imp50-49-exact-path-followup-20260924.md)
e [receipt](../04_audit/evidence/PLAN50-20260923/imp50-49-exact-path-search-receipt-20260924.json).

A auditoria subsequente confirmou que o log Prettier contém caminhos exatos para
12 alvos, mas o manifest do run só vincula o próprio log; o candidate manifest
exclui toda a árvore `docs/04_audit/evidence/` e registra worktree sujo. Os hits
não vinculam os bytes-alvo à execução AUD19-10, portanto não mudam o mapa nem
adjudicam itens. O follow-up review `PASS` confirmou a correção da contagem:
12 de 13 alvos do receipt aparecem no log; o 13º é referência ao código
AUD19-11. A Discovery continua sem `DISCOVERY_READY`. Ver a
[auditoria](../04_audit/evidence/PLAN50-20260923/imp50-49-formatter-path-scope-audit-20260924.md)
e o [parecer](../04_audit/evidence/PLAN50-20260923/imp50-49-formatter-path-scope-critic-v1-20260924.md).

Em 2026-09-24T09:43Z, o usuário reafirmou manter os 141 sem adjudicação até
haver evidência suficiente; referência exata por arquivo em registro
apropriado continua sendo o limiar de suporte, e v1 segue baseline/v2
suplemento. A auditoria read-only de metadados encontrou 99 caminhos raw exatos
na árvore do commit AUD19-10, mas não vinculou os bytes à execução original nem
os SHA-256 do snapshot aos blobs. Ver o
[relatório](../04_audit/evidence/PLAN50-20260923/imp50-49-aud19-10-git-tree-membership-audit-20260924.md)
e o [receipt](../04_audit/evidence/PLAN50-20260923/imp50-49-aud19-10-git-tree-membership-receipt-20260924.json).
Nenhum item foi adjudicado; Discovery 0022 continua `IN_PROGRESS`, sem gate.
A crítica independente fresh-context deu `PASS_WITH_SCOPE_LIMITS` para os
hashes revistos da Discovery, relatório e receipt. Confirmou os 99 caminhos na
árvore Git, mas não provou bytes na execução original nem cobriu os outros 42;
os critérios Discovery restantes permanecem abertos. Ver o
[parecer](../04_audit/evidence/PLAN50-20260923/imp50-49-aud19-10-git-tree-membership-critic-v1-20260924.md),
SHA-256 `57e1833b2114651021e4365801824ea211c5027d31a27c3d099dc9b129e4fbf2`.

Uma checagem adicional cobriu os 42 alvos restantes do mapa: 39 têm membership
de caminho/OID nas árvores Git examinadas e três arquivos AUD20 existem apenas
no worktree atual, não no HEAD. A busca literal delimitada no histórico
Markdown teve zero hits; o manifesto PROD-04 não enumera nenhum dos 42 por
caminho exato. Nesta rodada foi lido texto não-raw do relatório PROD-04, do
manifesto e do resumo de revisão. Nenhum payload raw ou blob Git foi lido, e
nenhum hash do snapshot v1 foi recalculado. Os novos dados não provam composição
de run nem identidade dos bytes. Ver [relatório](../04_audit/evidence/PLAN50-20260923/imp50-49-remaining-42-git-membership-audit-20260924.md)
e [receipt](../04_audit/evidence/PLAN50-20260923/imp50-49-remaining-42-git-membership-receipt-20260924.json).
A crítica fresh-context v1 deu `PASS_WITH_SCOPE_LIMITS` para Discovery anterior
(`c074da7c…f929b6de4`), relatório (`33f22e3c…d329d94ba`) e receipt
(`25604a8b…10072947`); confirmou os limites de membership e não adjudicou os 141. O delta-review v2 deu `PASS` para a Discovery atual
(`9c25ce65…a8c4752`) e a precisão do registro do primeiro parecer. Ver
[crítica v1](../04_audit/evidence/PLAN50-20260923/imp50-49-remaining-42-git-membership-critic-v1-20260924.md)
e [crítica v2](../04_audit/evidence/PLAN50-20260923/imp50-49-remaining-42-git-membership-critic-v2-20260924.md),
SHA-256 `1042062c77d70e88594fbc333a955b761e25616d9aec3f7e8ff6559e7b18e43b`.
Discovery continua `IN_PROGRESS`, sem `DISCOVERY_READY`, e nenhum item foi
adjudicado.

Não iniciar PRD, SPEC, checker ou BUILD até um gate incremental aprovado.
Esta proposta não reabre AUD20-08 nem altera a ordem crítica.

## Proposta NQP-01 / IMP50-36 — 2026-09-24

`BLOCKED` para `DISCOVERY_READY`; nenhum PRD ou BUILD admitido:
[0024 — lacuna de functions coverage](0024_aud20_12_nqp01_functions_coverage.md).
A crítica fresh-context confirmou a leitura de 89,27% (2.107/2.360), mas
concluiu que o problema pode mudar após executar a suíte PostgreSQL existente
sob o denominador contratado. O run corrente tem `TEST_DATABASE_URL=''` e 192
skips; ainda falta NQP-02/AUD20-11 com zero required skips e teardown. A crítica
também verificou que o BUILD report cita o manifesto no SHA-256
`11f061f452c2b51ce7202240e9b2b6c67729bbcb41d9439b1d1c3fb12155231d`, enquanto o
manifesto presente tem SHA-256
`6b86eb90a9275f3563c1c9f9deadd5477f7c114fe5228768313706512447fdba`.
Reconciliar a proveniência do manifesto e medir o candidato com PostgreSQL
antes de reavaliar se restam testes NQP-01 necessários. C06/C07 e a sequência
Q1–Q3 permanecem bloqueadas; a aprovação de outras SPECs não cobre este escopo.
Ver [crítica](../04_audit/evidence/PLAN50-20260923/nqp01-discovery-critic-20260924.md)
e [inventário](../04_audit/evidence/PLAN50-20260923/nqp01-coverage-gap-inventory-20260924.md).

## Gate incremental AUD20-06 — 2026-09-22

`DISCOVERY_VALIDATED_CONTROLLED`: [0016_aud20_06_certification_quality_gates.md](0016_aud20_06_certification_quality_gates.md).
O gap F08 está delimitado para crítico/mutation candidate-bound; staging,
produção e integrações externas permanecem fora do gate.

## Gate incremental REM-0539 R2 — 2026-09-05

`DISCOVERY_VALIDATED_CONTROLLED`: [0012_rem0539_r2_durability.md](0012_rem0539_r2_durability.md). O problema de durabilidade está delimitado para PRD/SPEC e BUILD local controlado; integração externa continua fora do gate.

## Gate incremental REM-0539 R3/R4/R5 — 2026-09-05

`DISCOVERY_VALIDATED_CONTROLLED`: [0013_rem0539_r3_journeys.md](0013_rem0539_r3_journeys.md), [0014_rem0539_r4_integrations_ops.md](0014_rem0539_r4_integrations_ops.md) e [0015_rem0539_r5_qualification.md](0015_rem0539_r5_qualification.md). As três ondas permanecem em fixtures, com gates de integração real e piloto separados.

## Gate incremental REM-0539 R1 — 2026-09-05T10:35:31.994051+00:00

`DISCOVERY_VALIDATED_CONTROLLED`: [0011_rem0539_r0_revalidation.md](0011_rem0539_r0_revalidation.md). Execução local autorizada pelo usuário; contratos corretivos registrados antes de BUILD. Não altera gates de dados reais, integração externa ou piloto.

## Histórico anterior

## Problema

- [x] Claramente definido.
- [x] Mensuravel por rastreabilidade de sessao, identificacao, handoff, approvals e tarefas.

## Dor

- [x] Contextualizada no atendimento hospitalar.
- [x] Impacto operacional registrado.

## Fluxo

- [x] Fluxo atual compreendido.
- [x] Excecoes criticas mapeadas.

## Escopo

- [x] Delimitado para MVP nivel 1-2.
- [x] Fora de escopo definido.

## Usuarios

- [x] Identificados.
- [x] Coerentes com o problema.

## Valor

- [x] Hipotese clara.
- [x] Impacto definido.

## Riscos

- [x] Documentados.
- [x] Hipoteses registradas.

## Resultado do gate

```txt
STATUS: APROVADO PARA PRD DOCUMENTAL
CONDICAO: revisao humana recomendada antes de iniciar implementacao
```

## Observacao

Este gate autoriza a continuidade da documentacao no pipeline CVG. Ele nao autoriza build de codigo sem PRD e SPEC aprovados.
