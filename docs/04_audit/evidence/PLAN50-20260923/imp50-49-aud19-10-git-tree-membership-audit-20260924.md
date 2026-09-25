# IMP50-49 — vínculo de caminhos AUD19-10 na árvore Git — 2026-09-24

## Pergunta e limites

Verificar se o histórico Git oferece um vínculo por caminho para os 99 arquivos
`raw` AUD19-10 presentes no mapa de 141 referências e se esse vínculo
demonstra participação dos bytes na execução original. A checagem usou somente
metadados de caminhos, modos, tipos, OIDs de blob, diff e ancestralidade Git.
Nenhum payload `raw` ou blob Git foi aberto, e nenhum SHA-256 de payload foi
recalculado.

## Fontes

- Mapa IMP50-49: 141 linhas, SHA-256
  `03a077e6aa422ce6108c2570b886af105a6a592ca976ed96da92d12e6e70a3ba`.
- Subconjunto examinado: 99 caminhos sob `docs/04_audit/evidence/AUD19/raw/`;
  digest SHA-256 da lista ordenada:
  `a1aa43e9d73bfc0467990fb8031937504167ec6552f72574e389b555757c9ab2`.
- Receipt somente de metadados: [JSON](imp50-49-aud19-10-git-tree-membership-receipt-20260924.json),
  SHA-256 `9ca97b82589364742beac9a97ecc33e5e4f2ae437323f9777d9646fc4d627a33`.
- Commit `0bbc3ab0013e5bf25d283c4946f951b0d0275b2a`, árvore
  `a601d9d77c40d184ea73820f0b6939f050d24ba3`, pai
  `94a3b1e061a5787e120b63d990ddb1a94000640b`, assunto
  `feat(web): axe/contrast, keyboard, zoom and multibrowser accessibility (AUD19-10)`.
  O commit é ancestral de `25434811334f5cec92ee0741079302271b82b7cb`, HEAD
  observado durante a checagem.

## Resultado

Os 99 caminhos exatos estão na árvore do commit e todos aparecem como adições
nesse commit; a distribuição é 33 Chromium, 33 Firefox e 33 WebKit. Na mesma
árvore estão o relatório AUD19-10, o JSON agregado e o script agregador. Os
OIDs de blob dessas três cópias no worktree coincidem com os da árvore do
commit. O relatório declara 99 resultados raw sintéticos (33 por browser) e
que o agregador deriva o JSON agregado de `raw/`.

Isso acrescenta um vínculo exato de **caminho e presença na árvore Git** para
esses 99 arquivos. Não vincula os SHA-256/tamanhos do snapshot v1 aos bytes do
commit: o receipt preserva os valores do inventário como metadados, e os OIDs
Git são identificadores de blob distintos; os bytes não foram lidos nesta
checagem. Também não há `runId` ou candidate receipt encontrado que prove a
composição da execução AUD19-10. O assunto do commit, por si só, não é receipt
de execução.

Os outros 42 caminhos do mapa não fazem parte deste subconjunto nem são
adjudicados por esta checagem. A presença dos 99 no commit não altera a
disposição dos 141 casos: a decisão humana vigente é mantê-los sem adjudicação
até haver suporte suficiente por item, com referência exata em registro
apropriado. Manifesto ou snapshot posterior só serve como suporte histórico se
estiver vinculado à execução e ao snapshot de origem.

## Disposição

Todos os 141 permanecem sem adjudicação; o mapa, as classes e os artefatos não
foram alterados. A v1 continua baseline de referência (2.412 caminhos; JSONL
SHA-256 `a0a1aa656348c88f4719fa5c5301f876b938567327bd203df3324f9c4f41b717`) e
a v2 continua suplemento read-only imutável (2.433 caminhos; JSONL SHA-256
`89c0bb3747dcb31f38db8ec94b9fff1ab0efd68cb522a3088e78bdc26ec06a56`).
Discovery 0022 permanece `IN_PROGRESS`, sem `DISCOVERY_READY`; PRD, SPEC,
checker e BUILD não foram admitidos. Ainda faltam, entre outros critérios,
suporte autoritativo ligado à origem para adjudicação por item, regra completa
de cutoff/pós-corte e critérios determinísticos de classificação e falha.

Não houve leitura de payload, teste de produto, alteração de código, banco ou
serviço externo, commit, push, deploy, staging ou produção.
