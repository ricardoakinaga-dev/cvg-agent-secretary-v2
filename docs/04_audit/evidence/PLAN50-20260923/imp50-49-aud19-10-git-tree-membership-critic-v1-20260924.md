# IMP50-49 — crítica independente do vínculo Git AUD19-10 — 2026-09-24

## Veredito

`PASS_WITH_SCOPE_LIMITS` para integridade do receipt e precisão dos limites do
relatório. O parecer não emite `DISCOVERY_READY`, não adjudica itens e não
aprova PRD, SPEC, checker ou BUILD.

## Bytes revisados

- Discovery 0022: SHA-256
  `5111e9cf7a24c0486b2bad437c4f41dbc0f2247c06c22f70ae5a6b0a78c0a14f`.
- Relatório: SHA-256
  `8fa3adf076b116917cfa1af6b0132581f8086d854b457fabca8cae7640f59f4e`.
- Receipt: SHA-256
  `9ca97b82589364742beac9a97ecc33e5e4f2ae437323f9777d9646fc4d627a33`.
- Mapa v2: SHA-256
  `03a077e6aa422ce6108c2570b886af105a6a592ca976ed96da92d12e6e70a3ba`.

## Constatações

A revisão confirmou 141 linhas no mapa, 99 caminhos `AUD19/raw` no receipt,
correspondência exata dos conjuntos, digest da lista ordenada e metadados
snapshot v1 (tamanho/SHA-256) coincidentes com o mapa. Há 33 caminhos por
browser. Os 99 caminhos constam da árvore Git e todos foram adicionados pelo
commit registrado; commit, árvore, pai e ancestralidade conferem. Os OIDs do
relatório AUD19-10, do agregado e do script agregador correspondem aos OIDs
registrados na árvore.

Isso prova presença dos caminhos e dos objetos Git identificados por OID nessa
árvore. Não prova que esses bytes integraram a execução original AUD19-10, nem
iguala OIDs Git aos SHA-256/tamanhos do snapshot v1. O relatório não sobredeclara
o que a evidência demonstra. A crítica não abriu payloads `raw`/blobs, não
executou testes de produto e não editou arquivos.

Os 141 permanecem sem adjudicação conforme decisão humana; v1 segue baseline e
v2 suplemento. O achado cobre somente os 99 caminhos. Discovery 0022 permanece
`IN_PROGRESS`, sem `DISCOVERY_READY`. Ainda faltam vínculo autoritativo de cada
item à execução/snapshot de origem, regra para cobertura e escritas pós-corte,
critérios determinísticos de classificação/falha, fixtures das seis classes e
comportamento read-only determinístico.

Fontes desta crítica: [Discovery 0022](../../../00_discovery/0022_aud20_08_imp50_49_evidence_lineage.md),
[relatório](imp50-49-aud19-10-git-tree-membership-audit-20260924.md) e
[receipt](imp50-49-aud19-10-git-tree-membership-receipt-20260924.json).
