# 0190 — SPEC Validation

## Gate aprovado AUD20-17 / IMP50-40 — emenda request-context v2 — 2026-09-24

`SPEC_APPROVED_CONTROLLED_BUILD`: o usuário aprovou por hash a proposta de
emenda v2 e o BUILD local controlado. Documento exato:
[proposta v2](../04_audit/evidence/AUD20/AUD20-17-request-context-spec-amendment-proposal-v2-20260924.md),
13.713 bytes, SHA-256
`1cb72b0e097ad19539c1f14fbdc892542ae9ddabf716bba00eef20b1c4cb237c`; crítica
fresh-context `PASS_FOR_HUMAN_REVIEW`. Aprovação e admissão local registradas
separadamente em
[recibo humano](../04_audit/evidence/AUD20/AUD20-17-request-context-spec-amendment-human-approval-v2-20260924.md)
e na task AUD20-17/IMP50-40 em 0337 antes de qualquer alteração de código.

A allowlist contém `server.ts`, `server/request-context.ts`, o teste direto
request-context, os testes `server-boundary-envelope` e `webhook-security`,
`tests/architecture.test.js` e esta documentação/evidência. A primeira ação de
BUILD — reconstruir isoladamente a candidata request-context v1 pela
transformação exata de rollback query-parser e conferir hashes/contagens e
atribuição — passou antes de editar fontes. O BUILD local e a matriz/regressão
foram executados; veja o [relatório](../04_audit/evidence/AUD20/AUD20-17-request-context-v2-build-report-20260924.md)
e o [manifesto candidate-bound](../04_audit/evidence/AUD20/AUD20-17-request-context-v2-build-candidate-manifest-20260924.json).
C02 tem evidência `PASS_LOCAL` (`4.707/4.708`; soma integrada `5.050/5.050`).
C06/C07 permanecem `FAIL` na crítica independente final e a task não foi
aceita. Os resultados reportados incluem functions globais 89,27%, 192 skips
condicionais, mutation não executada e gate PostgreSQL não executado. O usuário
decidiu que o piso crítico de branches de 95% se aplica a
`apps/api/src/server/request-context.ts`; o registry congelado permanece
intacto. Os 92% seguem `REPORT_ONLY` porque o binding integral candidate-bound
está incompleto e não provam por si só um resultado C06. Ver a decisão Q1,
a rota C06 e a [errata de interpretação](../04_audit/evidence/AUD20/AUD20-17-request-context-branch-floor-erratum-20260924.md).
Sem dados reais, PostgreSQL, commit/push/deploy, staging ou produção.

### Registro histórico de análise antes da decisão Q1 — 2026-09-24

A emenda aprovada mantém branches críticas em 95% para módulos aplicáveis,
mas `docs/03_build/tracking/aud19-critical-coverage.json` não enumera
`apps/api/src/server/request-context.ts`. Textos anteriores descreveram os
92% reportados como abaixo daquele piso; isso extrapolou a evidência enquanto
a aplicabilidade não está adjudicada. Tratar 92% somente como valor observado
e não como falha autônoma de threshold até decisão humana. Preservar emenda,
registry e medições, sem mudar threshold, denominador ou escopo por inferência.

O C06 registrado continua `FAIL`: as métricas precisam de binding ao candidato
enquanto o digest do manifesto diverge, os gates PostgreSQL e mutation não
foram executados e falta baseline válida candidate-bound. A rota C06 revisada
v3 tem SHA-256
`4d20e67ab6f4e93bda7405f85a8e7c4c5e953930228453bb1939a283041652f2`; a crítica
independente v4 deu `PASS` somente para prontidão documental, sem aceitar C06,
produto ou autorizar execução. Ver [proposta](../04_audit/evidence/AUD20/AUD20-17-C06-gate-route-proposal-20260924.md),
[crítica v1](../04_audit/evidence/AUD20/AUD20-17-C06-gate-route-critic-v1-20260924.md),
[v2](../04_audit/evidence/AUD20/AUD20-17-C06-gate-route-critic-v2-20260924.md),
[v3](../04_audit/evidence/AUD20/AUD20-17-C06-gate-route-critic-v3-20260924.md)
e [v4](../04_audit/evidence/AUD20/AUD20-17-C06-gate-route-critic-v4-20260924.md).

A reconciliação read-only de 2026-09-24 encontrou consistência parcial: 8/8
arquivos integrados, 34/34 recibos/evidências e os mapas v1 em seus workspaces
próprios conferem por hash. Ainda assim, o BUILD report cita manifesto SHA-256
`11f061f4…`, enquanto o manifesto disponível tem `6b86eb90…`; faltam hashes
enumerando todas as 301 fontes de teste do run integrado. Nenhuma baseline
pré-mudança candidate-bound foi identificada; a comparação “sem redução” é
`NOT_RUN`. As métricas permanecem somente reportadas, sem binding integral.
Ver [relatório da reconciliação](../04_audit/evidence/AUD20/AUD20-17-manifest-baseline-reconciliation-20260924.md).

A crítica independente fresh-context deu `PASS` somente para precisão desse
relatório (SHA-256 da crítica
`84bbc37c9d2e88c55b4b647de8af494e4b1e8897c02b9f4e72830ffe6f37dd5a`); ver
[parecer](../04_audit/evidence/AUD20/AUD20-17-manifest-baseline-reconciliation-critic-v1-20260924.md).
O resultado não aprova C06/C07 ou execução. Esta análise precede a decisão
humana Q1 registrada a seguir; a nota de ausência de adjudicação é histórica.

### Decisão Q1 vigente — 2026-09-24

O usuário decidiu aplicar o piso crítico de 95% a
`apps/api/src/server/request-context.ts`; ver o
[recibo](../04_audit/evidence/AUD20/AUD20-17-branch-floor-human-decision-20260924.md).
Isso não altera o registry congelado, threshold ou denominador e não promove
as métricas `REPORT_ONLY` a evidência de gate. Como o binding integral do
candidato continua incompleto, os 92% permanecem valor observado sem
adjudicação de C06. C06/C07 seguem `FAIL`; a resposta não autoriza BUILD
adicional de AUD20-17, PostgreSQL, mutation ou liberação de AUD20-10.

## Gates dos slices reativados — 2026-09-23

O usuário reativou `AUD20-10/17/20` para trabalho local controlado. As
aprovações de `AUD20-10/IMP50-09`, `AUD20-17-FU1` query-parser e da emenda
request-context v2 estão registradas em gates separados; nenhuma aceita
retroativamente a primeira fatia request-context nem ignora seus critérios.
`AUD20-10` está admitida e enfileirada sem BUILD novo. `AUD20-20` permanece
bloqueada pela sequência R3/R2 e por `AUD20-18`.

## Follow-up proposto AUD20-08 / IMP50-42 — 2026-09-23

`DRAFT_PENDING_HUMAN_REVIEW`:
[launcher Node 22](aud20_08_imp50_42_node22_launcher_20260923.md). Reusa o WHAT
aprovado nos Discovery 0017 e PRD 0028 e propõe um método local novo para
selecionar o Node `22.23.2` já instalado. O `AUD20-08` original permanece
`COMPLETED`; esta SPEC não está aprovada, o follow-up não foi admitido a BUILD,
e a aprovação do pai não se estende a ele. Preparação:
[evidência IMP50-42](../04_audit/evidence/PLAN50-20260923/imp50-42-spec-preparation-20260923.md).
Crítica fresh-context final `PASS` para prontidão de revisão humana nos bytes
exatos atuais (7.020 bytes, SHA-256
`2b8f3464bf6e21174ccd41cf65011a61455396698843e5c0a6222f0f58e5ada6`). A revisão
fechou a ambiguidade entre o cwd de lifecycle npm e o cwd original (`INIT_CWD`)
e explicitou `test:coverage`; ainda requer decisão humana e admissão separadas.

## AUD20-08-FU3 / IMP50-49 — sem SPEC / sem gate de BUILD

A proposta permanece na fase Discovery; o usuário decidiu preservar o snapshot
v1 como baseline de referência e manter os 141 casos sem adjudicação até haver
evidência suficiente. O v2 fica como suplemento read-only imutável. Ainda não
há `DISCOVERY_READY`, PRD, SPEC, task BUILD admitida ou autorização de
checker/código. A aprovação original de AUD20-08 não cobre essa extensão. Ver
[0022](../00_discovery/0022_aud20_08_imp50_49_evidence_lineage.md) e a
[preparação](../04_audit/evidence/PLAN50-20260923/imp50-49-policy-preparation-20260923.md).

- [AUD20-10 / IMP50-09 — collector conectado](aud20_10_operational_observability_20260922.md#adendo-proposto--imp50-09--collector-conectado)
- [AUD20-17 / IMP50-40 — primeira fatia](aud20_17_hotspot_decomposition_20260922.md#adendo-proposto--imp50-40--primeira-fatia)
- [pacote de revisão/evidência](../04_audit/evidence/AUD20/AUD20-reactivation-review-20260923.md)

## Gate incremental AUD20-19 — 2026-09-22

`TECHNICALLY_SPECIFIED`:
[aud20_19_chaos_load_human_a11y_20260922.md](aud20_19_chaos_load_human_a11y_20260922.md).
Perfis, runner, workload, schema humano, negativos, cleanup e C01–C07 estão
definidos. BUILD local aguarda confirmação; sessão humana é gate separado.

## AUD20-19-FU1 / IMP50-18 — SPEC aprovada e BUILD local executado

`SPEC_APPROVED_CONTROLLED_BUILD`, SHA-256
`decb8d441c2a17678026c6305fb71a9c31a2069d6836ad010362f9c3b9179688`:
[harness e binding da sessão](aud20_19_imp50_18_human_session_harness_20260923.md).
As críticas fresh-context v2/v3 foram `CONDITIONAL`; a v4 incorpora os seis
achados acumulados; crítica fresh-context v4 deu `PASS` para prontidão de
revisão humana. O usuário aprovou este hash e admitiu somente o BUILD local
controlado conforme a allowlist de 0337; decisão/admissão no
[recibo](../04_audit/evidence/AUD20/AUD20-19-FU1-human-approval-admission-20260924.md).
O BUILD não autoriza sessão. `IMP50-18` permanece `WAITING_HUMAN_APPROVAL` e
exige decisão específica, consentimento, participante voluntário,
tecnologia/equipamento escolhidos pela pessoa e candidate binding. Ver [crítica v2](../04_audit/evidence/AUD20/AUD20-19-FU1-independent-critic-v2-20260923.md),
[crítica v3](../04_audit/evidence/AUD20/AUD20-19-FU1-independent-critic-v3-20260923.md)
e [crítica v4](../04_audit/evidence/AUD20/AUD20-19-FU1-independent-critic-v4-20260923.md).
O preflight read-only do ambiente passou parcialmente: `unshare` criou namespace
sem rota, Node 22.23.2/Playwright 1.59.1/Vite 8.2.2 estão disponíveis e o
executável Chromium existe, mas não foi iniciado. O preflight precede a
aprovação/admissão documentada acima; ver
[preflight](../04_audit/evidence/AUD20/AUD20-19-FU1-environment-preflight-20260924.md).
O worktree está sujo, portanto nenhuma sessão pode ser executada nele como
candidato limpo. O resultado não é evidência de BUILD nem autorização da sessão.
Os registros operacionais passaram em `docs:check` sob Node 22.23.2 (1.582
links/627 JSONs), Prettier e `git diff --check`; a tentativa inicial sob Node
24 foi rejeitada pelo guard de versão e repetida corretamente.

O BUILD local controlado foi executado após a admissão: testes unitários focados
`21/21 PASS`, `verify` headless no namespace isolado `2/2 PASS`, typecheck/lint/
format `PASS`. A suíte integral final passou em 289 arquivos/12 skipped e
2.256 testes/192 skips. Coverage: statements 90,84%, branches 87,00%, functions
89,27%, lines 91,43%. `docs:check` (1.875 links/634 JSONs), `format:check` e
`git diff --check` `PASS`. A primeira suíte integral, com dois failures
documentais por nextAction antes da sincronização, está preservada como rodada
inicial. Crítica independente R2 ainda pendente. Nenhuma sessão headed/browser
humano foi iniciada; nenhum candidato limpo ou pacote humano foi produzido. Ver o
[relatório BUILD](../04_audit/evidence/AUD20/AUD20-19-FU1-build-report-20260924.md)
e os [recibos de teste](../04_audit/evidence/AUD20/AUD20-19-FU1-verify-20260924.log).

## Gate aprovado — pin do manifesto de mutantes e reseal Phase 11 — 2026-09-25

Decisões humanas hash-bound no [recibo nº 3](../04_audit/evidence/AUD20/AUD20-20250925-human-decisions-3-20260925.md):
(1) `SPEC_APPROVED_CONTROLLED_BUILD` para a correção do pin canônico
`MUTATION_MANIFEST_SHA256` (`scripts/lib/mutation-sentinel.mjs`) com teste
anti-drift; (2) admissão da execução local controlada do reseal Phase 11
(`certify:phase11` no candidato congelado), sem promoção, deploy, staging ou
produção; (3) owner/SLO adiados. Registro em 0337 antes do código.

## Gate aprovado AUD20-10 / próxima fatia C02/C04/C05 — 2026-09-25

`SPEC_APPROVED_CONTROLLED_BUILD` para a próxima fatia de
[AUD20-10](aud20_10_operational_observability_20260922.md) (latência real de
approval; alertas + delivery ledger local append-only; exercício fechando o
ciclo), derivada do hash aprovado
`83130cdf8930fa3639a116cc63ab4c2e0c3486ff40a349105d3423f44c91b685`. A decisão
está no
[recibo humano](../04_audit/evidence/AUD20/AUD20-10-next-slice-human-approval-20260925.md),
vinculada ao [pedido](../04_audit/evidence/AUD20/AUD20-10-next-slice-admission-request-20260925.md)
(`dc123bbe…`) com allowlist congelada. Sem owner/SLO inventados, rede/OTLP,
PostgreSQL, dados reais, staging ou produção. C01–C07 seguem abertos até os
gates da fatia.

## Gate aprovado AUD20-10 / IMP50-09 — 2026-09-23

`SPEC_APPROVED_CONTROLLED_BUILD` para o hash exato
`83130cdf8930fa3639a116cc63ab4c2e0c3486ff40a349105d3423f44c91b685` da SPEC
[aud20_10_operational_observability_20260922.md](aud20_10_operational_observability_20260922.md).
Discovery 0020 e PRD 0031 estão validados; a crítica fresh-context final deu
`PASS` para prontidão humana. O usuário aprovou a SPEC e o BUILD local
controlado do caminho sintético API→outbox em memória compartilhado→worker
controlado. A decisão está no
[recibo humano](../04_audit/evidence/AUD20/AUD20-10-human-approval-20260923.md).
BUILD admitido, enfileirado após AUD20-17-FU1/IMP50-40 e ainda não iniciado.
Somente arquivos/contratos da SPEC; sem dados reais, integração externa,
staging ou produção. C01–C07 não estão aceitos.

## Gate aprovado AUD20-17 / IMP50-40 — 2026-09-23

`SPEC_APPROVED_CONTROLLED_BUILD`, limitado ao slice request-context do adendo
proposto em
[aud20_17_hotspot_decomposition_20260922.md#adendo-proposto--imp50-40--primeira-fatia](aud20_17_hotspot_decomposition_20260922.md#adendo-proposto--imp50-40--primeira-fatia).
O hash aprovado e a decisão estão no
[registro de aprovação](../04_audit/evidence/AUD20/AUD20-17-human-approval-20260923.md).
BUILD local admitido; não autoriza ampliar allowlist, alterar API/schema, usar
dados reais, fazer commit/push/deploy, staging ou produção. `IMP50-40` permanece
parcial até C01–C07 e auditoria. A estimativa read-only indica risco de
inviabilidade do C02 `server.ts <=4708` dentro do escopo nominal; medir e
retornar para revisão sem ampliar a allowlist.

## Gate aprovado AUD20-17-FU1 / IMP50-40 — parsers de query

`SPEC_APPROVED_CONTROLLED_BUILD`: [SPEC](aud20_17_imp50_40_query_parsers_20260923.md),
derivada do [Discovery 0023](../00_discovery/0023_aud20_17_imp50_40_query_parsers.md)
e do [PRD 0033](../01_prd/0033_aud20_17_query_parser_decomposition.md), aprovada
por hash SHA-256
`fec5dcf0ea25e98ccf87e7b80e3b442b0c006521247d6e1137cbfd0f7c79e348` (7.398
bytes). A crítica fresh-context v2 não encontrou bloqueador de SPEC e exige
asserções das mensagens HTTP exatas nos testes. O usuário aprovou a SPEC e
admitiu somente BUILD local controlado; ver
[recibo humano](../04_audit/evidence/AUD20/AUD20-17-query-human-approval-20260923.md).
Task registrada em 0337 antes do código. A allowlist e os caps da SPEC são
congelados; sem staging/produção, commit, push ou deploy. A aprovação não altera
o estado de aceite da primeira fatia request-context.

**Resultado do BUILD query-parser:** AC01–AC06 da PRD 0033 passaram no
candidato local; caps `server.ts=4622`, `request-context.ts=258`,
`request-query.ts=138`, total `5018`. A crítica independente final deu `PASS`
para este slice. Registros: [relatório BUILD](../04_audit/evidence/AUD20/AUD20-17-query-build-report-20260923.md),
[parecer final](../04_audit/evidence/AUD20/AUD20-17-query-final-critic-v3-20260923.md)
e [manifesto/hash e recibos](../04_audit/evidence/AUD20/AUD20-17-query-raw-20260923/candidate-final-audit.sha256).
Esse resultado não encerra `AUD20-17` nem aceita retrospectivamente a fatia
request-context. AUD20-10 segue enfileirado. Staging/produção continuam `NO_GO`.

## Revisão inicial NQP-03 — request-context v1 — 2026-09-24 (histórica)

Este registro descreve a revisão anterior à emenda e ao BUILD v2; não é a
disposição corrente. A atualização atual está no gate aprovado acima e na
[errata de aplicabilidade do piso](../04_audit/evidence/AUD20/AUD20-17-request-context-branch-floor-erratum-20260924.md).

O parecer fresh-context avaliou C01–C07 da primeira fatia separadamente do
query-parser. C01 e C03–C05 têm suporte `PASS`; C02 `FAIL` porque o candidato
v1 mediu `server.ts=4745` contra o cap `4708` (+37 linhas); C06 `FAIL` porque
a cobertura integrada ligada ao manifesto registra 89,25% functions
(2.101/2.354), abaixo do contrato `>=90%`; C07 `FAIL`, sem aceite limitado.
O `server.ts=4622` integrado resulta também da extração query-parser e não
transfere o C02 para request-context. Consulte o
[parecer](../04_audit/evidence/PLAN50-20260923/nqp03-request-context-review-20260924.md)
e o [relatório v1](../04_audit/evidence/AUD20/AUD20-17-v1-build-report-20260923.md).

O usuário escolheu ampliar somente a fatia request-context na revisão da SPEC
para atingir o cap; essa direção não aprova ainda uma emenda nem autoriza outro
BUILD. A proposta concreta v1 recebeu crítica independente `CONDITIONAL`; os
quatro achados foram incorporados na
[proposta v2](../04_audit/evidence/AUD20/AUD20-17-request-context-spec-amendment-proposal-v2-20260924.md),
SHA-256 `1cb72b0e097ad19539c1f14fbdc892542ae9ddabf716bba00eef20b1c4cb237c`.
A crítica fresh-context v2 deu `PASS_FOR_HUMAN_REVIEW` para este hash; à época
deste registro, a emenda ainda aguardava decisão humana e admissão BUILD
própria. A aprovação e o BUILD posteriores estão no gate atual do topo de 0190. `AUD20-17` continua `IN_PROGRESS`; Q2/AUD20-10 segue enfileirada até que
Q1 libere o DAG. Nenhum novo BUILD, staging ou produção foi autorizado. Veja a
[crítica v1](../04_audit/evidence/AUD20/AUD20-17-request-context-spec-amendment-critic-v1-20260924.md)
e a [crítica v2](../04_audit/evidence/AUD20/AUD20-17-request-context-spec-amendment-critic-v2-20260924.md).

## Gate incremental AUD20-17 — 2026-09-22 (histórico)

`TECHNICALLY_SPECIFIED` no registro inicial:
[aud20_17_hotspot_decomposition_20260922.md](aud20_17_hotspot_decomposition_20260922.md).
Boundary, dependências, invariantes, caps, negativos, rollback e C01–C07 estão
definidos. O gate inicial foi supersedido pela aprovação limitada acima.

## Gate incremental AUD20-09 — 2026-09-22

`SPEC_APPROVED_CONTROLLED_BUILD`:
[aud20_09_integrated_holdout_20260922.md](aud20_09_integrated_holdout_20260922.md).
Dataset, adapter, relatório por categoria, negativos, mutation, rollback e
verificação estão definidos. O usuário confirmou a opção A, limitada ao BUILD
local sintético; release e efeitos reais continuam `NO_GO`.

## Gate incremental AUD20-08 — 2026-09-22

`SPEC_APPROVED_CONTROLLED_BUILD`:
[aud20_08_state_node_reconciliation_20260922.md](aud20_08_state_node_reconciliation_20260922.md).
Índice, checker, pin Node, negativos, compatibilidade e rollback estão
definidos. O usuário confirmou a opção A para BUILD local controlado.

## Gate incremental AUD20-06 — 2026-09-22

`SPEC_APPROVED_CONTROLLED_BUILD`:
[aud20_06_certification_quality_gates_20260922.md](aud20_06_certification_quality_gates_20260922.md).
A superfície, contratos, negativos, rollback e verificação estão definidos; o
usuário confirmou o próximo passo em `2026-09-22`, limitado ao BUILD local.
BUILD/AUDIT concluído localmente; staging e produção permanecem `NO_GO`.

## Gate incremental REM-0539 R2 — 2026-09-05

`SPEC_APPROVED_CONTROLLED_BUILD`: [0123_rem0539_r2_contract.md](0123_rem0539_r2_contract.md). REM-08 e a prova PostgreSQL foram fechadas; o usuário autorizou o BUILD local controlado. Integrações externas, dados reais e produção permanecem bloqueados.

## Gate incremental REM-0539 R3/R4/R5 — 2026-09-05

`SPEC_APPROVED_CONTROLLED_BUILD`: [0124_rem0539_r3_contract.md](0124_rem0539_r3_contract.md), [0125_rem0539_r4_integrations_ops.md](0125_rem0539_r4_integrations_ops.md) e [0126_rem0539_r5_qualification.md](0126_rem0539_r5_qualification.md). A autorização cobre somente BUILD/AUDIT controlado com fixtures e adapters locais.

## Gate incremental REM-0539 R1 — 2026-09-05T10:35:31.994051+00:00

`SPEC_APPROVED_CONTROLLED_BUILD`: [0122_rem0539_r1_contract.md](0122_rem0539_r1_contract.md). Execução local autorizada pelo usuário; contratos corretivos registrados antes de BUILD. Não altera gates de dados reais, integração externa ou piloto.

## Histórico anterior

## Alinhamento com PRD

- [x] Toda decisao tecnica deriva do PRD ou blueprint.
- [x] Nenhum desvio de produto foi introduzido sem registro.
- [x] Casos de uso principais cobertos.

## Arquitetura

- [x] Estilo arquitetural definido.
- [x] Justificativas claras.
- [x] Fronteiras do sistema claras.

## Dominio

- [x] Entidades definidas.
- [x] Estados definidos.
- [x] Invariantes registradas.

## Modulos

- [x] Responsabilidades claras.
- [x] Dependencias aceitaveis.
- [x] Riscos de acoplamento registrados.

## Contratos

- [x] Contratos de aplicacao definidos.
- [x] Contratos de API definidos.
- [x] Eventos assincronos definidos.

## Dados

- [x] Persistencia definida.
- [x] Integridade e migracao consideradas.
- [x] Auditoria considerada.

## Seguranca e governanca

- [x] Permissoes coerentes.
- [x] Acoes sensiveis auditaveis.
- [x] Segregacao de responsabilidades tratada.

## Integracoes

- [x] Integracoes justificadas.
- [x] Falhas previstas.
- [x] Contingencia definida.

## Operacao

- [x] Observabilidade minima definida.
- [x] Criterios operacionais claros.

## Build

- [x] Plano de build faseado.
- [x] Backlog estruturado.
- [x] Matriz de dependencia coerente.

## Resultado do gate

```txt
STATUS: CONDITIONAL_READY_FOR_PHASE_0_PLANNING
CONDICAO: Phase 0 pode preparar fundacao tecnica; fluxos funcionais sensiveis seguem bloqueados ate decisao humana de agenda, autonomia, RAG institucional e retencao
```

## Nao autorizado por este gate

- Uso com dados reais.
- Rollout com operadores.
- Confirmacao automatica de consulta.
- RAG institucional sem fonte aprovada.
- Qualquer acao clinica, financeira ou de prontuario sem approval e policy versionada.

## Exigencias antes de codar funcionalidades

- Testes, lint e typecheck executaveis desde Phase 0.
- Contratos compartilhados versionados antes de API/worker/web.
- Policy fail-closed implementada antes de qualquer tool sensivel.
- Auditoria append-only antes de integracoes externas.
- Documentar decisao humana para agenda, autonomia, RAG e retencao.
