# IMP50-49 — crítica independente do vínculo Git dos 42 caminhos — 2026-09-24

## Veredito

`PASS_WITH_SCOPE_LIMITS`. O receipt e o relatório são internamente coerentes
para membership de caminho/OID e explicitam seus limites. Nenhuma correção
bloqueadora foi encontrada. Este parecer não adjudica nenhum item e não aprova
`DISCOVERY_READY`.

## Artefatos revisados

- Discovery 0022 SHA-256:
  `c074da7c925a5e48d39a707094c35b1893e9a381f9d946c21703910f929b6de4`.
- Relatório SHA-256:
  `33f22e3cd9ff4310ca4c389feacbc01962615deefc4b8c07949d486d329d94ba`.
- Receipt SHA-256:
  `25604a8bf6620b10691e02ac4280355c201aee6ddb99c2912fbad24710072947`.
- Mapa de 141 linhas SHA-256:
  `03a077e6aa422ce6108c2570b886af105a6a592ca976ed96da92d12e6e70a3ba`.
- Receipt anterior dos 99 caminhos SHA-256:
  `9ca97b82589364742beac9a97ecc33e5e4f2ae437323f9777d9646fc4d627a33`.

## Avaliação

A revisão fresh-context confirmou que os 42 caminhos são exatamente o
complemento dos 99 já registrados no mapa: digest ordenado de ambos os
subconjuntos confere, sem sobreposição. O receipt replica os metadados de
snapshot correspondentes ao mapa e a distribuição é 38 caminhos PROD, um
digest AUD19-11 e três alvos AUD20.

Os metadados de árvores, OIDs, adições e ancestralidade são consistentes: o
checkpoint PROD-04 contém/adiciona os 38 caminhos PROD; AUD19-11 contém esses
38 e adiciona o digest. Um dos 38 OIDs PROD difere entre as árvores e os outros
37 são iguais. O HEAD contém 39/42 caminhos. Os três restantes existem no
worktree, estão ausentes da árvore/index, e seus tamanhos conferem. O OID do
manifesto PROD-04 co-localizado corresponde ao registrado em AUD19-11 e no
HEAD.

O manifesto não fornece vínculo por caminho exato para os alvos; suas chaves de
logs são basenames. O receipt separa corretamente essa observação de prova de
execução. O relatório reconhece que foi lido texto não-raw do relatório
PROD-04 e resumos co-localizados. O crítico não leu o conteúdo do manifesto,
payloads `raw` ou bytes de blob Git, não recalculou SHA-256 do snapshot e não
executou testes. A busca Markdown não foi repetida pelo crítico; seu alcance
permanece limitado ao corpus/método declarado no receipt.

Assim, a evidência prova membership de caminho/OID nas árvores Git examinadas
para 39 caminhos e presença local para os outros três. Não prova que os bytes
correspondem ao snapshot v1 ou participaram de runs originais. Os 141 casos
permanecem sem adjudicação; classes e snapshots v1/v2 permanecem intactos;
Discovery 0022 continua `IN_PROGRESS`, sem `DISCOVERY_READY`, PRD, SPEC,
checker ou BUILD.

## Limite do parecer

O veredito cobre precisão e limites dos três artefatos nos hashes listados.
Não constitui auditoria de conteúdo dos alvos, validação dos runs PROD-04 ou
AUD19-11, adjudicação de linhagem, aceitação de classe, aprovação de gate ou
autorização de código/BUILD.
