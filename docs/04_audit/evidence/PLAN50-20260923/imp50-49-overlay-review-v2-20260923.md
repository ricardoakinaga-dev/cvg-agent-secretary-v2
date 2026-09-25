# IMP50-49 — revisão independente do overlay v2 — 2026-09-23

## Resultado e limites

- Veredito: `CONDITIONAL`. O overlay é internamente consistente como proposta
  não vinculante, mas não tem base suficiente para adoção das mudanças de classe.
- Escopo: revisão read-only de caminhos, linhas de inventário, tamanhos, hashes,
  links e manifests/documentos de índice citados. Nenhum corpo de payload raw foi
  aberto ou interpretado; nenhum rótulo foi alterado; nenhum teste foi executado.
- `AUD20-08-FU3`/`IMP50-49` segue em Discovery, sem `DISCOVERY_READY`, PRD, SPEC,
  checker, BUILD ou autorização para mover/remover evidência. Staging e produção
  continuam `NO_GO`.

## Integridade estrutural

As 339 linhas propostas têm caminhos únicos e se juntam às 339 linhas não
resolvidas do inventário: número da linha, classe original, tamanho e SHA-256
conferem. Os 339 caminhos existem e seus tamanhos atuais correspondem ao
snapshot. As contagens 190 `HISTORICAL`, 23 `INHERITED`, 107 `UNCLASSIFIED` e 19
`ORPHAN` candidatos estão aritmeticamente corretas; 107 + 19 = 126 residuais.

## Suficiência da linhagem proposta

Dos 190 candidatos `HISTORICAL`, 49 têm suporte por referências de caminho
exatas nos índices/reports examinados: 17 links relativos do README dos logs,
2 referências AAA-21, 22 referências diretas arquivadas e 8 referências do
grupo fix-review. Os outros 141 ainda não têm suporte equivalente:

- **99 AUD19-10 raw:** o relatório citado informa um total agregado de 99
  resultados (33 por browser), mas não enumera os caminhos ou basenames
  correspondentes nem declara cobertura de manifesto por caminho.
- **42 basename-only:** quatro referências diretas arquivadas e cinco
  fix-review, mais 14 review-report, 8 wave-review e 11 PROD-04, são menções por
  basename sem resolução inequívoca para o caminho inventariado. Proximidade
  entre irmãos não demonstra linhagem.

Esses 141 itens continuam somente candidatos no overlay. A revisão não os
reclassifica como `UNCLASSIFIED` nem escolhe entre referência exata adicional e
uma regra de cobertura declarada; essa decisão pertence à política/Discovery.

Os 23 candidatos `INHERITED` têm suporte melhor: 11 caminhos AUD20-19 conferem
por caminho e SHA nos relatórios de perfil; 12 caminhos PROD-04 correspondem às
declarações de árvore copiada da revisão. Os 19 candidatos `ORPHAN` não têm
referências na linha de inventário; ausência não autoriza mover ou apagar.

Fontes verificadas: [proposta/overlay](imp50-49-triage-proposal-20260923.md),
[AUD19-10](../AUD19/AUD19-10-a11y-report.md),
[README dos logs](../AUD-20260923-REPO/README.md),
[AAA-21 CHECKS](../AAA/AAA-21/CHECKS.md),
[PROD-04 review](../PROD-20260913/PROD-04/review/REVIEW.md),
[AUD20-19 memory report](../AUD20/AUD20-19-memory_smoke-report.json) e
[AUD20-19 PostgreSQL report](../AUD20/AUD20-19-postgres_durable-report.json).

## Diferença da árvore atual

Comparação por metadados após gravar este relatório e o mapa por caminho:
**2.425 arquivos regulares** na árvore atual, 13 adições ao snapshot original de
2.412 caminhos, nenhuma ausência e um caminho do snapshot com tamanho alterado
(`imp50-status-20260923.md`). As 13 adições são três sidecars do inventário,
três evidências IMP50-40, dois artefatos de triagem, três críticas posteriores
da SPEC query-parser, este relatório e o mapa de referências. A comparação não
interpreta corpos de evidências.

## Adendo — mapa de referências por caminho

O [mapa JSONL](imp50-49-historical-reference-map-v2-20260923.jsonl) associa os
141 candidatos HISTORICAL com suporte insuficiente a seus metadados do snapshot
e às linhas dos documentos de origem: 99 dependem somente da declaração
agregada AUD19-10 (`raw/*.json`, 99 resultados, 33 por browser); 42 têm nomes
por basename ou tokens não resolventes. Para os 99, o mapa registra que a
declaração agregada não enumera caminhos nem prova cobertura por manifesto. Para
os outros 42, os registros preservam a forma não exata das menções. O mapa não
abre payloads raw, não reclassifica nem adjudica qualquer linha e não muda o
veredito `CONDITIONAL` ou o bloqueio de `DISCOVERY_READY`.

## Rechecagem suplementar do agregado AUD19-10 — 2026-09-23

Depois da crítica v2, foi lido somente o JSON agregado
`docs/04_audit/evidence/AUD19/AUD19-10-a11y-results.json` (não os payloads raw).
Os objetos `perBrowser` de Chromium, Firefox e WebKit apresentam as categorias
axe, contraste, teclado, reflow, forced-colors, targets, tipografia e estados;
uma varredura estrutural não encontrou chaves de caminho/arquivo nem valores
com caminhos dos raw JSONs. Isso confirma que o agregado não enumera os 99
membros. O veredito `CONDITIONAL` e a disposição permanecem inalterados.

## Disposição

Manter o JSONL original e o overlay intactos como histórico/proposta. Não adotar
as 190 classes `HISTORICAL`, nem emitir `DISCOVERY_READY`, até uma decisão sobre
referências exatas/manifestos declarados e cobertura pós-snapshot. Não fazer
PRD, SPEC, checker ou código por causa desta revisão.
