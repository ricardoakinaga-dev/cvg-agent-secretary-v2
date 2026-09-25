# Discovery proposta AUD20-08-FU3 — IMP50-49 e linhagem de evidências

## Estado

- task proposta: `AUD20-08-FU3` / `IMP50-49`
- task-mãe: `AUD20-08` permanece `COMPLETED`
- fase: `DISCOVERY`
- status: `IN_PROGRESS` para triagem/Discovery; inventários v1 e v2 concluídos,
  nenhum gate `DISCOVERY_READY` foi emitido
- execução desta rodada: captura e verificação read-only do snapshot v2 suplementar; ver
  [relatório v2](../04_audit/evidence/PLAN50-20260923/imp50-49-full-inventory-v2-report-20260923.md),
  preservando o [inventário v1](../04_audit/evidence/PLAN50-20260923/imp50-49-full-inventory-report-20260923.md)
  e [triagem proposta](../04_audit/evidence/PLAN50-20260923/imp50-49-triage-proposal-20260923.md),
  com [overlay por caminho](../04_audit/evidence/PLAN50-20260923/imp50-49-triage-proposal-20260923.jsonl)
- candidato: não admitido; PRD, SPEC, checker e BUILD não autorizados
- staging/produção: `NO_GO`

## Problema observado

`AUD20-08` tornou explícito o ponteiro de certificação corrente e protegeu
`certification/findings.json` como histórico Phase 10. Isso não define como
classificar os demais artefatos em `docs/04_audit/evidence/`. A pasta reúne
arquivos referenciados diretamente por matrizes/receipts, subárvores `raw`,
bundles históricos e snapshots aninhados. Tratar cada arquivo sem link direto
como órfão confundiria descendentes legítimos de um bundle com evidência sem
linhagem; aceitar qualquer arquivo sem relação também deixaria órfãos passarem.

Evidência e limites atuais:

- Discovery [0017](0017_aud20_08_state_node_reconciliation.md) define uma
  fonte corrente e exige preservar documentos/pacotes históricos sem reescrever
  seus claims.
- PRD [0028](../01_prd/0028_aud20_08_state_node_reconciliation.md) trata a
  seleção corrente de Phase 10/11, mas exclui migração/limpeza do acervo.
- SPEC aprovada de AUD20-08 valida o ponteiro de certificação e não inspeciona
  a linhagem geral de `docs/04_audit/evidence/`.
- Matrizes e receipts existentes apontam para artefatos brutos e outros
  documentos; bundles podem conter diretórios de conteúdo e snapshots
  descendentes que herdam a referência do bundle.
- O item [IMP50-49](../03_build/0341_plan50_backlog_20260923.md) exige política
  de histórico antes de definir checker/SPEC; a decisão humana atual admite
  somente inventário read-only completo. A triagem desta rodada é uma proposta
  não vinculante baseada nos metadados desse inventário.

## Atores e impacto

Executor, revisor independente e auditor precisam distinguir evidência que
qualifica o gate corrente, registro histórico válido, conteúdo herdado por um
bundle e artefato sem proveniência. Classificação errada pode promover evidência
antiga ou acusar falsamente conteúdo histórico; remoção automática poderia
destruir trilha de auditoria.

Não há usuário final, dado clínico, integração ou ação externa nesta proposta.

## Resultado desejado

Definir uma regra verificável de linhagem para a árvore de evidências, com
classificação explícita e independente de “corrente” versus “histórico”. Um
futuro checker deve detectar um fixture órfão sem rebaixar histórico válido,
subárvores herdadas ou artefatos supersedidos. Incerteza deve ser exposta como
`UNCLASSIFIED` para triagem, nunca convertida silenciosamente em corrente ou
em autorização para apagar.

## Política proposta para revisão

| Classe         | Relação mínima proposta                                                                                                             | Efeito permitido                                                                    |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `CURRENT`      | Referência por ponteiro/gate corrente aprovado ou manifesto/receipt do candidato e execução identificados                           | Pode apoiar somente o gate e candidato aos quais está ligado                        |
| `HISTORICAL`   | Referência em log append-only, relatório de tarefa concluída ou registro histórico explícito                                        | Preservar; não qualifica gate corrente                                              |
| `INHERITED`    | Descendente de bundle/snapshot fechado cujo manifesto ou registro de origem declara a árvore contida                                | Preservar; herda linhagem e classificação do bundle, sem promover-se a corrente     |
| `SUPERSEDED`   | Relação explícita entre artefato anterior e substituto, com motivo/registro da troca                                                | Preservar ambos; usar somente o artefato apontado pelo gate vigente                 |
| `UNCLASSIFIED` | Está no escopo de inventário, mas não há relação suficiente para decidir                                                            | Emitir finding de triagem e impedir PASS do escopo; não apagar nem inferir história |
| `ORPHAN`       | Está no escopo gerenciado e, após resolver referências e herança, não possui relação corrente, histórica, herdada ou de supersessão | Falhar com diagnóstico estável; apenas revisão humana pode decidir o destino        |

Os vínculos precisam ser relativos ao repositório, existir e não escapar da
raiz permitida. “Histórico” não significa “supersedido”: um artefato pode
continuar legitimamente citado em log/tarefa concluída sem possuir substituto.
Nenhuma classe implica remoção, movimentação ou edição do conteúdo evidencial.

## Escopo do inventário v1 — histórico

O primeiro inventário completo da árvore `docs/04_audit/evidence/` foi
produzido em modo somente leitura. A v1 registra caminhos, tamanhos, SHA-256,
referências resolvidas e classes candidatas, inclusive cobertura herdada por
bundle. Não move, apaga, renomeia, reescreve ou recalcula claims históricos.
Encontrou 2.412 arquivos regulares e 24.721.814 bytes. Classes candidatas:
`CURRENT` 1, `HISTORICAL` 1.680, `INHERITED` 390, `SUPERSEDED` 2,
`UNCLASSIFIED` 194 e `ORPHAN` 145. Os 339 itens não resolvidos somam 1.752.236
bytes. A v1 permanece preservada como baseline histórico; a escolha posterior
da v2 não adota nem reclassifica as classes propostas.

## Triagem read-only proposta

A triagem analisou os 339 caminhos não resolvidos do snapshot original, sem
alterar o JSONL ou o relatório integral. Os 339 tamanhos e SHA-256 continuam
idênticos. O overlay proposto é: 190 HISTORICAL, 23 INHERITED, 107
UNCLASSIFIED e 19 candidatos ORPHAN; nenhum dos 339 recebe proposta CURRENT ou
SUPERSEDED. As contagens originais permanecem oficiais até revisão humana. A
divisão por grupo, bases e referências está no
[relatório de triagem](../04_audit/evidence/PLAN50-20260923/imp50-49-triage-proposal-20260923.md).
O [overlay JSONL por caminho](../04_audit/evidence/PLAN50-20260923/imp50-49-triage-proposal-20260923.jsonl)
registra hashes do snapshot e propostas de classe, sem alterar a classificação
oficial.

A comparação intermediária anterior à captura v2 encontrou 2.428 arquivos
regulares: 16 adições ao snapshot v1, nenhuma ausência e um caminho do snapshot alterado
(`imp50-status-20260923.md`). As adições incluíam três sidecars do inventário,
três evidências IMP50-40, dois artefatos de triagem, três críticas posteriores
da SPEC query-parser, o parecer independente, o [mapa por caminho](../04_audit/evidence/PLAN50-20260923/imp50-49-historical-reference-map-v2-20260923.jsonl)
e o manifesto candidato dos 99 membros com seu relatório e crítica.
Posteriormente, o snapshot v2 integral foi capturado e comparado à v1; seus
resultados e o limite dos próprios sidecars estão no [relatório v2](../04_audit/evidence/PLAN50-20260923/imp50-49-full-inventory-v2-report-20260923.md).

A contagem 2.428 é uma observação de corte intermediário, distinta do snapshot
v2 final de 2.433 arquivos. O registro intermediário não preserva manifesto
completo de caminhos; por isso a diferença de cinco caminhos entre as duas
contagens não pode ser reconciliada item a item com a evidência disponível.
O JSONL v2 preserva os 21 caminhos adicionados em relação à v1, mas não deve
ser usado para inferir retrospectivamente a composição do corte 2.428. Esta
lacuna não altera a escolha humana posterior: v1 é o baseline de referência e
v2 permanece suplemento imutável; nenhuma classe depende dessa comparação.

Uma crítica read-only independente achou os 339 joins/tamanhos/hashes corretos,
mas considerou o overlay `CONDITIONAL` para adoção: apenas 49 dos 190 candidatos
HISTORICAL têm referências de caminho exatas nos índices examinados; 99 têm
somente suporte agregado AUD19-10 e outros 42 menções por basename sem resolver
o caminho. Os 23 INHERITED têm suporte por caminho/SHA ou declaração de árvore;
os 19 ORPHAN continuam candidatos, sem implicar remoção. O overlay permanece sem
adjudicação e não sustenta `DISCOVERY_READY`: a referência/cobertura dos 141
casos e o tratamento de escritas posteriores ao corte v2 ainda requerem decisão.
O [mapa](../04_audit/evidence/PLAN50-20260923/imp50-49-historical-reference-map-v2-20260923.jsonl)
registra as fontes e linhas desses 141 casos, sem transformar referência
agregada ou basename em vínculo aceito. Ver [parecer completo](../04_audit/evidence/PLAN50-20260923/imp50-49-overlay-review-v2-20260923.md).

Uma checagem read-only suplementar do agregado
[`AUD19-10-a11y-results.json`](../04_audit/evidence/AUD19/AUD19-10-a11y-results.json)
confirmou que os três objetos `perBrowser` contêm resultados por categoria,
sem campo de caminho/arquivo nem valor que enumere os 99 JSONs raw. Portanto,
esse agregado não resolve a lacuna indicada no parecer.

Um índice de membros **candidato e somente para revisão** foi derivado em
2026-09-23 do snapshot integral v1: [manifesto JSONL](../04_audit/evidence/PLAN50-20260923/imp50-49-aud19-10-member-manifest-candidate-20260923.jsonl)
e [relatório](../04_audit/evidence/PLAN50-20260923/imp50-49-aud19-10-member-manifest-candidate-report-20260923.md).
Ele enumera os 99 caminhos que casam com o glob declarado, com tamanho/SHA-256
do inventário e distribuição 33/33/33. O relatório AUD19-10 declara o glob e
a contagem, sem listar caminhos; o inventário foi produzido depois da execução
AUD19-10. Assim, o índice confirma membros no snapshot atual do inventário,
mas não prova quais bytes participaram da execução original e não resolve,
por si só, os 99 vínculos insuficientes. Não há efeito classificatório nem
mudança da política pendente.

A crítica fresh-context do manifesto candidato deu `PASS` para integridade
e limites: conjunto e metadados conferem com o inventário, sem campo de classe
ou alegação de vínculo com a execução original. Ver [parecer independente](../04_audit/evidence/PLAN50-20260923/imp50-49-aud19-10-member-manifest-critic-v1-20260923.md).

Índice candidato dos 99 membros: consulte o pacote de evidência.

Se o overlay for aceito, 126 dos 339 ainda exigem adjudicação; essa conta não
resolve os 141 HISTORICAL com suporte insuficiente identificados pela crítica.
O snapshot v2 abaixo registra a árvore no instante declarado, exceto seus três
sidecars de saída; novas escritas posteriores a esse corte exigem decisão
separada.

## Guardrails

- Não mover, apagar, renomear, reescrever ou recalcular claims de evidência
  histórica nesta proposta.
- Não alterar `certification/current.json`, `certification/findings.json` ou o
  resultado do verificador Phase 10.
- Não tornar execução de checker obrigatória em `docs:check` antes de uma SPEC
  aprovada, migração de inventário e BUILD explicitamente admitido.
- Não inferir dono, retenção ou validade externa; findings permanecem locais e
  sintéticos.
- Worktree dirty não é candidato de release; staging/produção seguem `NO_GO`.

## Hipótese e falsificação

Hipótese: a combinação de referências de gate, manifests/receipts, registros
append-only e relações explícitas de supersessão permite classificar a evidência
sem exigir ponteiro direto para cada arquivo descendente.

Resultado do inventário: apoio limitado, pois 390 descendentes receberam
linhagem herdada por bundle sem pointer individual; enforcement integral não é
suportado ainda, pois 339 arquivos permanecem `UNCLASSIFIED` ou `ORPHAN` para
triagem.

Falsificar se fixtures de histórico válido, bundle herdado, supersessão e órfão
não tiverem resultados determinísticos; se a classificação depender de texto
livre que o checker precise adivinhar; ou se qualquer histórico legítimo precisar
ser removido/alterado para o checker passar. Nesse caso, parar antes de integrar
ao gate e devolver o contrato para decisão de escopo/indexação.

## Critérios propostos para Discovery/PRD

- documentar autoridade dos ponteiros correntes e quais registros estabelecem
  linhagem histórica;
- decidir a cobertura de linhagem e o tratamento de escritas após o corte; o
  baseline integral v2 está registrado;
- estabelecer que referência ausente/quebrada, ciclo, escape de raiz e ID
  duplicado não passam;
- manter explícita a diferença entre `UNCLASSIFIED` e `ORPHAN` até triagem;
- produzir fixtures sintéticas para current, historical, inherited,
  superseded, unclassified e orphan;
- definir execução read-only, determinística e sem efeitos em conteúdo legado.

## Gate e próxima etapa

Esta é somente uma proposta de Discovery; não equivale a `DISCOVERY_READY`.
Não iniciar PRD enquanto o gate incremental de Discovery não for revisado e
registrado em `0090_discovery_validation.md`. Depois, seguir PRD e SPEC com seus
gates próprios. Qualquer checker/código requer SPEC aprovada, task exata
registrada e gate explícito de BUILD local. A revisão humana deste FU3 não
altera a ação crítica `AUD20-17` / `IMP50-40`: aprovação hash-bound da SPEC
query-parser `fec5dcf0ea25e98ccf87e7b80e3b442b0c006521247d6e1137cbfd0f7c79e348`
antes de registrar sua admissão local.

## Captura read-only do snapshot v2 — 2026-09-23

Em resposta à escolha apresentada para IMP50-49, o usuário selecionou
**“Full read-only inventory first”**. Após o congelamento das escritas da
evidência, o snapshot v2 foi capturado em `2026-09-23T17:22:44Z`: **2.433
arquivos regulares e 28.970.553 bytes**. Seu JSONL tem 444.142 bytes e SHA-256
`89c0bb3747dcb31f38db8ec94b9fff1ab0efd68cb522a3088e78bdc26ec06a56`. Frente à
v1 preservada (2.412 arquivos / 24.721.814 bytes), há 21 caminhos adicionados,
nenhum ausente e um caminho alterado (`imp50-status-20260923.md`). Uma segunda
varredura, em processo separado, confirmou 2.433/2.433 linhas, o mesmo total de
bytes e hash e zero diferenças desde a captura. O [relatório v2](../04_audit/evidence/PLAN50-20260923/imp50-49-full-inventory-v2-report-20260923.md),
[JSONL](../04_audit/evidence/PLAN50-20260923/imp50-49-full-inventory-v2-20260923.jsonl)
e [resumo](../04_audit/evidence/PLAN50-20260923/imp50-49-full-inventory-v2-summary-20260923.json)
registram o limite temporal e excluem explicitamente os três próprios sidecars
do inventário de membros.

Esta decisão autorizou a captura integral read-only do snapshot v2. Uma resposta
humana posterior, registrada em “Decisões humanas — 2026-09-23T20:44Z”, escolheu
explicitamente a v1 como baseline de referência e a v2 como suplemento
imutável. Portanto, “baseline v2” em relatórios contemporâneos à captura
descreve a varredura completa autorizada, não a baseline atualmente escolhida.
Esta captura não adjudica as classes,
não escolhe a regra para os 141 vínculos insuficientes, não concede
`DISCOVERY_READY` e não autoriza PRD, SPEC, checker ou BUILD. A decisão sobre a
regra de linhagem permanece pendente.

## Decisão de linhagem ainda necessária antes de propor `DISCOVERY_READY`

Este pacote não escolhe política nem autoriza alteração de classes. A decisão
humana que falta é:

1. **Regra de linhagem para os 141 casos insuficientes.**
   - **Referência exata por arquivo:** cada item precisa de caminho relativo
     resolvível em índice/registro apropriado; menções por basename e globs
     agregados continuam insuficientes.
   - **Cobertura por manifesto fechado:** admitir descendentes somente quando
     um manifesto versionado declarar raiz, conjunto fechado de caminhos,
     tamanho/SHA-256 por membro, quantidade esperada e snapshot/task de origem.
     O padrão `raw/*.json` e a contagem 99, isoladamente, não satisfazem isso.
   - **Manter sem adjudicação:** conservar as classes originais/propostas sem
     adoção até que evidência suficiente seja produzida. Nenhuma alternativa
     autoriza remoção; os 19 ORPHAN continuam candidatos.

O parecer do overlay v1 encontrou 49/190 candidatos HISTORICAL com caminho
exato; 99 dependem apenas do relatório agregado (o JSON agregado também não
enumera arquivos); 42 têm referências por basename/nome não resolvente. O
snapshot v2 foi capturado, mas não resolve esses vínculos. Na data desta nota,
a regra de linhagem ainda aguardava escolha; veja as decisões humanas
posteriores abaixo. O suporte verificável e uma nova crítica independente
continuam necessários antes do gate Discovery. Até lá, IMP50-49 continua
`IN_PROGRESS`, sem `DISCOVERY_READY`, PRD, SPEC ou BUILD.

## Revalidação read-only para decisão — 2026-09-23T20:17Z

O [mapa por caminho](../04_audit/evidence/PLAN50-20260923/imp50-49-historical-reference-map-v2-20260923.jsonl)
foi conferido novamente sem abrir payloads: 141 linhas únicas, SHA-256
`03a077e6aa422ce6108c2570b886af105a6a592ca976ed96da92d12e6e70a3ba`. A
contagem estruturada confirma 99 vínculos `aggregate_only` e 42
`basename_only`, totalizando os 141 casos sem suporte de linhagem suficiente.
O JSONL integral v2 permanece no SHA-256
`89c0bb3747dcb31f38db8ec94b9fff1ab0efd68cb522a3088e78bdc26ec06a56`.

Esta revalidação não adota o overlay nem altera a regra. As decisões humanas
registradas abaixo escolheram manter todos os casos sem adjudicação e exigir
referência exata por arquivo em registro apropriado; a alternativa de aceitar
manifesto fechado não foi escolhida. O manifesto candidato criado após a
execução não prova a composição histórica. Ainda são necessários suporte
verificável e crítica independente antes de `DISCOVERY_READY`.

## Decisões humanas — 2026-09-23T20:44Z

- **Regra para os 141 casos:** manter todos sem adjudicação até haver evidência
  suficiente. A resposta anterior “referência exata por arquivo” permanece como
  o requisito de suporte por item; nenhuma classe é alterada automaticamente.
  Os 99 vínculos `aggregate_only` e 42 `basename_only` continuam insuficientes
  no estado atual. Manifestos posteriores só podem servir como prova histórica
  se vincularem explicitamente a execução e snapshot originais; o manifesto
  candidato atual não demonstra essa composição.
- **Baseline:** preservar a v1 como baseline de referência: 2.412 caminhos,
  24.721.814 bytes, JSONL SHA-256
  `a0a1aa656348c88f4719fa5c5301f876b938567327bd203df3324f9c4f41b717`. O
  inventário v2 integral já capturado permanece imutável como suplemento
  read-only, sem substituir a v1 nem reescrever suas classes. Nenhum novo
  inventário foi autorizado nesta resposta.
- Esta decisão não concede `DISCOVERY_READY`, não aprova PRD/SPEC/checker/BUILD
  e não autoriza remoção, edição ou reclassificação dos arquivos. A evidência
  vigente e a crítica independente continuam necessárias antes de qualquer
  gate.

## Reafirmação humana — 2026-09-23T23:46:52Z

O usuário confirmou novamente a regra **manter os 141 sem adjudicação até haver
evidência suficiente**. O mapa revalidado tem SHA-256
`03a077e6aa422ce6108c2570b886af105a6a592ca976ed96da92d12e6e70a3ba` e contém
99 vínculos `aggregate_only` e 42 `basename_only`. Esses vínculos continuam
insuficientes no estado atual; nenhum deles é promovido ou reclassificado
automaticamente. O manifesto candidato posterior à execução não prova os
membros da execução/snapshot original. A v1 segue baseline e a v2 segue
suplemento intacto. A resposta preserva a decisão de não adjudicar; não concede
`DISCOVERY_READY`, não aprova PRD/SPEC/checker/BUILD e não autoriza alteração
dos artefatos ou das classes. Os critérios Discovery restantes e a crítica
independente continuam necessários antes de qualquer gate.

## Busca read-only de referências exatas — 2026-09-24

Foi feita uma busca literal pelos 141 caminhos do mapa, sem abrir
payloads `raw` e excluindo inventários/mapas derivados da própria IMP50-49,
diretórios de build/vendor e sessões humanas. Foram encontradas 27 ocorrências
para 13 caminhos: os 12 caminhos aparecem uma vez em cada um dos dois logs
Prettier AAA-21; um caminho adicional aparece três vezes no código que
gera/lê o relatório AUD19-11. Os logs têm
observações exatas de caminho, mas o candidato de formatação não inclui hashes
dos arquivos-alvo; o código AUD19-11 não é receipt de execução. Os outros 128
caminhos não apareceram no corpus textual pesquisado. O [relatório](../04_audit/evidence/PLAN50-20260923/imp50-49-exact-path-followup-20260924.md)
e o [receipt](../04_audit/evidence/PLAN50-20260923/imp50-49-exact-path-search-receipt-20260924.json)
enumeram fontes/linhas e registram o digest da lista de 3.245 caminhos
pesquisados; esse digest não vincula os bytes das fontes.

Nenhum achado foi tratado como adjudicação: as 141 linhas continuam sem
adjudicação, o mapa v2 permanece inalterado, a v1 segue como baseline e a v2
como suplemento imutável. Esta busca não resolve autoridade/cobertura de
linhagem, regras de falha, fixtures para as seis classes, pós-corte nem
determinismo read-only. `DISCOVERY_READY` continua pendente; uma crítica
independente deve revisar este texto, o relatório e o receipt em seus hashes
atuais antes de qualquer PRD.

## Auditoria read-only do escopo do log Prettier — 2026-09-24

A análise do manifest/candidate manifest do run `run-bf035ddfe187-mu0ldbpd`
confirmou que o manifest do run vincula o log `full-cert/format.log` por SHA,
mas o candidate manifest exclui explicitamente `docs/04_audit/evidence/` e
registra `dirty=true`. Os 12 caminhos exatos emitidos no log não são membros do
manifesto de produto nem aparecem no commit-base indicado; essa ausência é
esperada para a árvore excluída e não prova ausência no worktree sujo do run.
Assim, o log é evidência hash-bound de que os nomes foram reportados pelo
formatter, mas não vincula os bytes-alvo nem a composição original da execução
AUD19-10. A [auditoria de escopo](../04_audit/evidence/PLAN50-20260923/imp50-49-formatter-path-scope-audit-20260924.md)
registra os hashes e limites. Nenhum dos 141 casos foi adjudicado, e a v1/v2
permanece intacta.

## Reafirmação da regra e vínculo de caminhos no Git — 2026-09-24T09:43Z

O usuário reafirmou que os 141 casos devem permanecer sem adjudicação até haver
evidência suficiente. A exigência anterior de referência exata por arquivo em
registro apropriado continua sendo o limiar de suporte; a v1 permanece baseline
e a v2, suplemento imutável.

Uma checagem read-only encontrou os 99 caminhos `AUD19/raw` exatos do mapa na
árvore do commit AUD19-10 `0bbc3ab0013e5bf25d283c4946f951b0d0275b2a`, todos
adicionados nesse commit, 33 por browser. A árvore também contém o relatório,
o JSON agregado e o script agregador AUD19-10. Isso demonstra membership de
caminho na árvore Git e melhora a referência por item nesse nível. Não liga os
SHA-256 do snapshot v1 aos bytes Git nem prova a composição da execução
original: não foi encontrado `runId`/candidate receipt, nenhum payload/blob foi
lido e nenhum SHA-256 de payload foi recalculado. O [relatório](../04_audit/evidence/PLAN50-20260923/imp50-49-aud19-10-git-tree-membership-audit-20260924.md)
e o [receipt](../04_audit/evidence/PLAN50-20260923/imp50-49-aud19-10-git-tree-membership-receipt-20260924.json)
registram método, contagens, OIDs e limites.

Não houve adjudicação nem mudança nas classes, mapa ou snapshots. Os 141
permanecem sem adjudicação; Discovery 0022 continua `IN_PROGRESS`, sem
`DISCOVERY_READY`, PRD, SPEC, checker ou BUILD. A decisão humana não remove os
critérios restantes de autoridade/origem, cutoff/pós-corte e comportamento
determinístico.

## Complemento read-only dos 42 caminhos restantes — 2026-09-24

Uma checagem de metadados Git cobriu os 42 caminhos do mapa que não estavam no
receipt dos 99 `AUD19/raw`: 38 caminhos PROD, um `AUD19-11-digests.json` e três
arquivos AUD20. O checkpoint PROD-04 contém e adiciona os 38 caminhos PROD;
AUD19-11 contém esses mesmos 38 e adiciona o digest AUD19-11. Entre os 38
caminhos comuns, 37 mantêm o OID e `PROD-04/report.md` mudou; o HEAD contém 39
dos 42 caminhos. Os três alvos AUD20 restantes existem no worktree como não
rastreados, não na árvore HEAD. A busca literal no histórico de Markdown
rastreado sob `docs/`, excluída a árvore de evidências, encontrou zero menções
de caminho exato; o receipt informa o escopo e seus limites.

O manifesto PROD-04 co-localizado não enumera nenhum dos 42 alvos por caminho
exato no mapa `files`, e os seis nomes de `logs` são basenames. Ele não vincula
os caminhos à composição de uma execução identificada. Nesta rodada foi lido o
texto não-raw do relatório `PROD-04/report.md` e dos resumos do manifesto e da
revisão; não foram lidos payloads `raw` nem bytes de blob Git, e os SHA-256 do
snapshot v1 não foram recalculados. Portanto o resultado comprova membership
de caminho/OID em árvores Git para 39 alvos e existência local de três, mas não
identidade dos bytes com o snapshot v1 ou participação nos runs originais.

Nenhum dos 141 itens foi adjudicado; classes e snapshots v1/v2 permanecem
intactos, e a regra humana de manter todos sem adjudicação até haver prova
suficiente continua em vigor. Discovery 0022 segue `IN_PROGRESS`, sem
`DISCOVERY_READY`, PRD, SPEC, checker ou BUILD. Ver o
[relatório](../04_audit/evidence/PLAN50-20260923/imp50-49-remaining-42-git-membership-audit-20260924.md)
e o [receipt](../04_audit/evidence/PLAN50-20260923/imp50-49-remaining-42-git-membership-receipt-20260924.json).
Uma crítica fresh-context revisou os hashes então vigentes: Discovery
`c074da7c925a5e48d39a707094c35b1893e9a381f9d946c21703910f929b6de4`, relatório
`33f22e3cd9ff4310ca4c389feacbc01962615deefc4b8c07949d486d329d94ba` e receipt
`25604a8bf6620b10691e02ac4280355c201aee6ddb99c2912fbad24710072947`. O parecer
deu `PASS_WITH_SCOPE_LIMITS`: confirmou o complemento dos 42 caminhos, os
metadados Git e a separação entre membership de caminho e composição/bytes dos
runs. Não leu payloads/blobs, não repetiu a busca textual, não executou testes
e não adjudicou itens. Ver [crítica v1](../04_audit/evidence/PLAN50-20260923/imp50-49-remaining-42-git-membership-critic-v1-20260924.md),
SHA-256
`f9401221b2810d8681a74bf6126a94f9d3de665dc8fcd7097d6e5548574d6a74`. Este
parecer não altera os 141 casos, as classes, os snapshots ou o gate Discovery.
