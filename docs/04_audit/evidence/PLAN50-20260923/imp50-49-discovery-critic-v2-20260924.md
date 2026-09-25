# IMP50-49 — crítica independente fresh-context v2 — 2026-09-24T07:19Z

## Escopo e binding

Revisão somente leitura, sem edição, testes, abertura de payloads `raw` ou
sessões humanas. Parecer vinculado a:

- Discovery 0022:
  `docs/00_discovery/0022_aud20_08_imp50_49_evidence_lineage.md`, SHA-256
  `f5b0d3623c0b3b3bcf3588679a5bf4141d8f87060729595575aaa54b140430cb`.
- Busca exata:
  `docs/04_audit/evidence/PLAN50-20260923/imp50-49-exact-path-followup-20260924.md`,
  SHA-256 `bd9acf57f03df7d50d408dba08d4098951bd4ccf4e725317f0100b26126147c4`.
- Receipt da busca:
  `docs/04_audit/evidence/PLAN50-20260923/imp50-49-exact-path-search-receipt-20260924.json`,
  SHA-256 `394ae680b5df28c1c9af817702632aac1d96b675b7925699e004d7a10d6c35b8`.

Também foram conferidos o mapa de 141 linhas, SHA-256
`03a077e6aa422ce6108c2570b886af105a6a592ca976ed96da92d12e6e70a3ba`, e o
SHA-256 declarado do log full-cert
`d3cb23784cc406ae1c9c36575ef2632e89bd5f3c0d5b572e6cd685c24957cdc0`.

## Veredito

**`DISCOVERY_READY` não é sustentável.** Discovery 0022 permanece
`IN_PROGRESS`; 0090 a registra corretamente como proposta sem gate. Não iniciar
PRD, SPEC, checker ou BUILD.

## Achados

- As decisões humanas estão coerentes nos bytes revisados: manter os 141 casos
  sem adjudicação até evidência suficiente, exigir referência exata por arquivo
  em registro apropriado, preservar v1 como baseline de 2.412 caminhos e v2
  como suplemento imutável de 2.433 caminhos.
- O receipt fecha a aritmética da busca: 3.245 caminhos no corpus, 27
  ocorrências, 13 caminhos encontrados e 128 sem ocorrência no corpus. São 12
  alvos citados duas vezes nos logs Prettier e um alvo citado três vezes em
  código. O digest vincula a lista de caminhos, não os bytes das fontes; os
  resultados negativos valem somente para o corpus com filtros declarados.
- Os 13 hits são candidatos, não suporte suficiente para reclassificação. Os
  12 caminhos dos logs não têm hash dos arquivos-alvo nem vínculo demonstrado
  com a execução e o snapshot originais. O caminho AUD19-11 aparece em
  declarações/leitores de código, não em receipt de execução.
- A diferença entre 2.428 arquivos no corte intermediário e 2.433 no snapshot
  v2 está explicitamente não reconciliada porque não há manifesto de caminhos
  do corte 2.428. As 21 adições v2 contra v1 não permitem inferir a composição
  daquele corte; nenhuma classe depende dessa comparação.

## Bloqueadores restantes

1. Suporte autoritativo e suficiente por item para os 141 vínculos.
2. Autoridade/cobertura de linhagem e política para escritas posteriores ao
   corte.
3. Regras determinísticas de falha e distinção operacional das seis classes,
   inclusive tratamento de `UNCLASSIFIED` e `ORPHAN`.
4. Fixtures sintéticas para cada classe e comportamento read-only determinístico.

O parecer não adjudica itens, não altera classes e não amplia autoridade. Sem
edições, testes ou acesso a payloads raw/human-session.
