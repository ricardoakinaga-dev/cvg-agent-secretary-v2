# IMP50-49 — proposta de triagem do inventário — 2026-09-23

## Estado e limites

- Task proposta: AUD20-08-FU3 / IMP50-49. A task-mãe AUD20-08 permanece
  COMPLETED; este FU3 está em Discovery, sem gate DISCOVERY_READY.
- Esta triagem propõe um overlay de classes para revisão. Não altera as classes
  do JSONL original, não constitui adjudicação humana e não autoriza PRD, SPEC,
  checker, código, BUILD ou remoção de arquivos.
- Foram usados caminhos, hashes, referências do inventário, manifests e
  documentos de registro. Nenhum corpo de log bruto foi exibido ou analisado.
  Verificações de integridade calcularam SHA-256 lendo bytes sem interpretar o
  conteúdo.
- Staging e produção seguem NO_GO.

## Base do snapshot e integridade

O snapshot original contém 2.412 caminhos e permanece referenciado pelo
[relatório integral](imp50-49-full-inventory-report-20260923.md) e pelo
[JSONL original](imp50-49-full-inventory-20260923.jsonl), SHA-256
a0a1aa656348c88f4719fa5c5301f876b938567327bd203df3324f9c4f41b717. Os 339
caminhos originalmente UNCLASSIFIED ou ORPHAN foram revalidados por tamanho e
SHA-256: **339/339 sem drift**. O overlay por caminho está em
[JSONL separado](imp50-49-triage-proposal-20260923.jsonl), SHA-256
4a41ccc177ec20fb06a0112e94bf530f87c7a3b0e80177431c2bbd9eec295b42. Cada linha
registra o caminho, tamanho/hash do snapshot, classe original e classe proposta,
base resumida e referências. É uma proposta de revisão; o JSONL de inventário
permanece intacto.

Uma comparação anterior à criação dos artefatos de triagem registrou 2.418
arquivos: seis adições ao snapshot e um caminho alterado. Com o relatório e o
overlay de triagem, a árvore chegou a 2.420 arquivos e oito adições. A revisão
independente posterior identificou mais três críticas query-parser; o parecer
v2 acrescenta a décima segunda adição e o mapa de referências acrescenta a
décima terceira. A comparação atual encontra 2.425 arquivos, 13 adições ao
snapshot, zero ausências e um caminho do snapshot alterado
(`imp50-status-20260923.md`). O snapshot integral continua histórico;
a cobertura futura depende de decisão sobre limite da árvore e inclusão de
sidecars/relatórios.

## Proposta de classificação dos 339 caminhos do snapshot

As classes abaixo são candidatas para revisão, não alterações do inventário:

| Grupo examinado | Itens | HISTORICAL | INHERITED | UNCLASSIFIED | ORPHAN candidato |
| --- | ---: | ---: | ---: | ---: | ---: |
| AUD19 accessibility raw, logs AUD-20260923-REPO e raw AUD20-19 | 138 | 116 | 11 | 11 | 0 |
| Bundles AAA-21 e PROD-20260913 explicitamente referenciados | 120 | 48 | 12 | 60 | 0 |
| Evidências diretas AUD17/AUD19/AUD20 e metadados PLAN50 | 81 | 26 | 0 | 36 | 19 |
| **Total** | **339** | **190** | **23** | **107** | **19** |

Se a revisão humana adotar este overlay para o snapshot original, os totais
passariam a CURRENT 1, HISTORICAL 1.870, INHERITED 413, SUPERSEDED 2,
UNCLASSIFIED 107 e ORPHAN 19. Essa projeção não classifica as adições posteriores
nem significa que o usuário aceitou qualquer classe.

### Base por grupo

- **138 itens raw:** os 99 arquivos AUD19 por browser são declarados no relatório
  AUD19-10 como 33 resultados sintéticos por browser; os 17 logs de
  AUD-20260923-REPO são enumerados no README como stdout/stderr de execução com
  fixtures sintéticas. Os 11 arquivos no bundle AUD20-19 cujo digest começa
  255c2 têm caminho/hash declarados nos relatórios de perfil e no build audit,
  portanto propomos INHERITED. Os 11 arquivos no bundle 4eeb61 não possuem
  referência correspondente localizada e permanecem UNCLASSIFIED. Fontes:
  [AUD19-10](../AUD19/AUD19-10-a11y-report.md),
  [README dos logs sintéticos](../AUD-20260923-REPO/README.md),
  [AUD20-19 build audit](../AUD20/AUD20-19-build-audit-20260922.md) e seus
  [relatórios de perfil](../AUD20/AUD20-19-memory_smoke-report.json) e
  [PostgreSQL](../AUD20/AUD20-19-postgres_durable-report.json).
- **120 itens em bundles:** propomos 2 HISTORICAL e 27 UNCLASSIFIED em
  AAA-21; 11 HISTORICAL e 12 INHERITED em PROD-04/review; 14 HISTORICAL e 12
  UNCLASSIFIED em m1-fresh-review-round3; 1 UNCLASSIFIED no relatório AAA-20;
  8 HISTORICAL e 18 UNCLASSIFIED em wave-review; 13 HISTORICAL e 2
  UNCLASSIFIED em wave3-01-fix. Permanecem UNCLASSIFIED os logs que são apenas
  descritos por um padrão de nome, os irmãos sem membership individual e
  arquivos sem vínculo identificável. A árvore probes-src/ e os três arquivos
  tamper/ são declarados como conteúdo da revisão PROD-04 e propomos INHERITED.
  Fontes:
  [AAA-21 CHECKS](../AAA/AAA-21/CHECKS.md),
  [AAA-21 checks README](../AAA/AAA-21/checks/README.md),
  [PROD-04 review](../PROD-20260913/PROD-04/review/REVIEW.md),
  [manifest round 3](../PROD-20260913/reaudit-round3/manifest.json),
  [revisão M1](../PROD-20260913/m1-fresh-review-round3/REVIEW.md),
  [wave review](../PROD-20260913/reaudit-round3/wave-review/REVIEW.md) e
  [wave3-01 fix review](../PROD-20260913/reaudit-round3/wave3-01-fix/REVIEW.md).
- **81 itens diretos:** propomos 26 HISTORICAL — 10 AUD17 ligados a
  backlog/certificação arquivados, 6 AUD19 ligados a registros históricos e 10
  AUD20 ligados a estado/matrizes/registros correntes ou a evidência aceita de
  IMP50-41. Permanecem 36 UNCLASSIFIED — 1 AUD17, 9 AUD19 e 26 AUD20 — porque
  referência apenas narrativa ou vínculo com task, por si só, não resolve
  frescor, status ou pertencimento a gate. São ORPHAN candidatos, sujeitos a
  revisão humana, 19 itens: 1 AUD17, 16 AUD19 e 2 metadados PLAN50. Fontes
  independentes incluem o [backlog AUD17](../../../03_build/0330_aud20260917_backlog.md),
  a [certificação AUD17-12](../AUD17-AAA/AUD17-12-certification.md),
  a [execução histórica](../../../20_master_execution_log.md), a
  [re-auditoria 0567](../../0567_aud19_delivery_reaudit_2026-09-20.md),
  [CURRENT](../../../CURRENT.md), as matrizes AUD20 e o registro
  [IMP50-41](imp50-41-phase10-metadata-audit-20260923.md). A ausência de uma
  referência encontrada é evidência de triagem, não prova suficiente para
  apagar ou mover um arquivo.

Nenhum dos 339 itens recebeu proposta CURRENT. Também não propomos
SUPERSEDED: menções a captures substituídos não estabeleceram, para cada item,
um par anterior/substituto com relação explícita suficiente. Histórico e
supersessão continuam distintos.

## Revisão independente do overlay

A revisão read-only v2 concluiu `CONDITIONAL`: os 339 joins, hashes, tamanhos e
contagens estão corretos, mas o suporte de linhagem não basta para adotar as
classes propostas. Dos 190 `HISTORICAL`, 49 têm referência de caminho exata nos
índices examinados; 99 dependem de um total agregado AUD19-10 sem lista ou
manifesto de cobertura por caminho; e 42 têm apenas menções por basename. Os
últimos 141 ficam sem base suficiente para adoção sob a política proposta. Esta
revisão não altera o overlay nem escolhe sua reclassificação. Ver [parecer v2](imp50-49-overlay-review-v2-20260923.md).

Os 23 `INHERITED` têm suporte mais forte por caminho/SHA ou declaração de árvore
copiada; os 19 `ORPHAN` seguem apenas candidatos e ausência de referência não
autoriza remoção. Até uma decisão sobre evidência exata/manifestos e cobertura
pós-snapshot, o overlay não sustenta `DISCOVERY_READY`.

## Efeito no Discovery

Se o overlay for aceito, 126 itens do snapshot ainda exigirão adjudicação
individual: 107 UNCLASSIFIED e 19 ORPHAN candidatos. Somam-se a isso três
evidências IMP50-40, três sidecars do inventário, dois artefatos de triagem,
três críticas posteriores da SPEC query-parser, o parecer IMP50-49 e o mapa por
caminho, totalizando 13 adições pós-snapshot. O mapa documenta as fontes e linhas
das 141 referências insuficientes sem adjudicá-las. O [mapa por caminho](imp50-49-historical-reference-map-v2-20260923.jsonl)
permanece apenas rastreabilidade documental. O overlay também requer base de
linhagem suficiente para 141 candidatos HISTORICAL antes de adoção. A hipótese de herança por bundle
recebe suporte limitado, mas a política, a cobertura atual e o gate
DISCOVERY_READY seguem pendentes.

Próxima ação do programa continua sendo uma decisão humana sobre a revisão da
SPEC C02 para IMP50-40. Para IMP50-49, revisar esta proposta e definir a
adjudicação dos casos remanescentes e a linha de base que deve incluir os
artefatos posteriores. Nenhum checker de linhagem, teste de produto ou código
foi executado por esta triagem.

## Verificação documental

- `npm run docs:check` com Node `v22.23.2`: PASS; 1.045 links e 613 arquivos
  JSON válidos; estado, próxima ação e verificações semânticas válidos.
- Prettier `--check` nos oito documentos atualizados: PASS.
- `git diff --check`: PASS. Nenhum teste de produto foi executado.
- O overlay tem 339 caminhos e linhas de inventário únicos; tamanho, SHA-256 e
  classe original de cada linha conferem com o JSONL original. Integridade
  calculada sem interpretar o conteúdo dos artefatos raw.
