# IMP50-49 — vínculo Git read-only dos 42 caminhos restantes — 2026-09-24

## Escopo e método

Esta checagem complementar cobre os 42 caminhos do mapa IMP50-49 que não
estavam no receipt dos 99 alvos `AUD19/raw`. A seleção foi reconciliada contra
o mapa SHA-256
`03a077e6aa422ce6108c2570b886af105a6a592ca976ed96da92d12e6e70a3ba`, o receipt
anterior SHA-256
`9ca97b82589364742beac9a97ecc33e5e4f2ae437323f9777d9646fc4d627a33` e a lista
ordenada do subconjunto, digest
`61cc176ef38911fba8eb456d31fbfda24ee5dcb30d9b91fcd2b8e4e4da4304cf`.

Foram comparados metadados de árvore Git, OIDs, status de caminho no worktree,
ancestralidade e uma busca literal por caminho completo no histórico de
Markdown rastreado sob `docs/`, excluindo `docs/04_audit/evidence/**`. Também
foram conferidos campos do manifesto co-localizado de PROD-04. O receipt
registra a extração estruturada e as contagens por caminho.

Transparência de leitura: nesta rodada foi lido o texto não-raw de
`PROD-20260913/PROD-04/report.md`, além do manifesto e do resumo de revisão
co-localizados. Nenhum payload `raw`, bytes de blob Git ou SHA-256 dos arquivos
do snapshot v1 foi lido ou recalculado.

## Resultados

- Os 42 alvos se dividem em 38 caminhos sob `PROD-20260913/`, um
  `AUD19-11-digests.json` e três arquivos AUD20.
- O checkpoint PROD-04
  (`08d682f20346f14a63324f457741eb6f00ec9339`, tree
  `6552af163b1733c742e28cf8d146078d952135c0`) contém os 38 caminhos PROD e os
  adiciona. O commit AUD19-11
  (`320c7c93d924bfd20e5eb9cb2ba8eed2ee5340ec`, tree
  `95c8855b5948575aee3809f510697320797404f0`) contém esses 38 mais o digest
  AUD19-11; esse último é a única adição entre os 42 nesse commit. Os dois
  commits são alcançáveis do HEAD `25434811334f5cec92ee0741079302271b82b7cb`;
  o checkpoint PROD-04 antecede AUD19-11, e AUD19-11 antecede o HEAD corrente.
- Entre os 38 caminhos PROD presentes em ambos os commits, 37 têm o mesmo OID.
  `PROD-04/report.md` é o único OID diferente; no HEAD corrente consta o OID
  posterior de AUD19-11.
- O HEAD atual contém 39 dos 42 alvos. Os três alvos AUD20 não estão no HEAD,
  mas existem no worktree como não rastreados: AUD20-06 SPEC preparation
  (926 bytes), AUD20-08 SPEC preparation (1.254 bytes) e AUD20-16 raw-artifact
  receipt (6.937 bytes). A existência local não vincula esses arquivos às
  árvores/execuções históricas examinadas.
- A busca de histórico Markdown encontrou zero strings de caminho exato para
  os 42 alvos no corpus delimitado. Isso não é uma busca universal por
  conteúdo nem uma prova de inexistência de referências fora desse corpus.
- O manifesto co-localizado PROD-04 existe no worktree com o mesmo OID da árvore
  AUD19-11. Seu mapa `files` não enumera nenhum dos 42 alvos por caminho exato;
  seus seis nomes sob `logs` são basenames. O status `IMPLEMENTED` do manifesto
  é uma declaração do próprio artefato, não uma validação independente de
  execução ou composição.

## Limites e disposição

Os metadados comprovam membership de caminho/OID nas árvores Git indicadas para
39 alvos e a existência local de três alvos fora do HEAD. Não provam que os
bytes participaram de uma execução identificada, que correspondem aos SHA-256
e tamanhos do snapshot v1, nem a composição do run PROD-04/AUD19-11. Em
particular, a declaração do manifesto e a leitura de resumos não fecham esse
vínculo.

Nenhum dos 141 casos foi adjudicado. Classes, mapa, snapshot v1 e suplemento v2
permanecem intactos; Discovery 0022 segue `IN_PROGRESS`, sem
`DISCOVERY_READY`, PRD, SPEC, checker ou BUILD. A regra humana de manter os 141
sem adjudicação até haver evidência suficiente continua vigente. A crítica
fresh-context deste relatório, receipt e Discovery atual é necessária antes
de atualizar o parecer documental final.

## Evidência estruturada

- [Receipt de membership dos 42 caminhos](imp50-49-remaining-42-git-membership-receipt-20260924.json)
- Receipt SHA-256: `25604a8bf6620b10691e02ac4280355c201aee6ddb99c2912fbad24710072947`
- Mapa por caminho SHA-256: `03a077e6aa422ce6108c2570b886af105a6a592ca976ed96da92d12e6e70a3ba`
- Receipt anterior dos 99 caminhos SHA-256: `9ca97b82589364742beac9a97ecc33e5e4f2ae437323f9777d9646fc4d627a33`
