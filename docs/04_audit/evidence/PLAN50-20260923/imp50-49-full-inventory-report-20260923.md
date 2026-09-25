# IMP50-49 — inventário completo de linhagem — 2026-09-23

## Resultado

Inventário somente leitura de todos os arquivos regulares sob
`docs/04_audit/evidence/`: **2.412 arquivos**, **24.721.814 bytes** no acervo,
sem caminhos duplicados.

| Classe candidata | Arquivos |
| --- | ---: |
| `CURRENT` | 1 |
| `HISTORICAL` | 1.680 |
| `INHERITED` | 390 |
| `SUPERSEDED` | 2 |
| `UNCLASSIFIED` | 194 |
| `ORPHAN` | 145 |

As classes são candidatas à política Discovery, não adjudicação de validade.
Os 339 itens `UNCLASSIFIED`/`ORPHAN` somam 1.752.236 bytes e exigem triagem
antes de propor enforcement. A hipótese recebe apoio limitado: relação por
bundle identificou 390 descendentes herdados sem pointer individual. A árvore
completa não está pronta para checker obrigatório ou gate.

## Resolução de referências

- Destinos existentes ambíguos: `0`.
- Links Markdown explícitos quebrados: `0`.
- Ciclos nos campos de caminho de manifests/receipts JSON examinados: `0`.
- Menções a caminhos potencialmente ausentes: `200` pares fonte/destino,
  `100` destinos distintos; no subconjunto JSON, `16` pares e `15` destinos.
  São menções de contexto misto, inclusive planejamento e histórico, não links
  quebrados confirmados.
- Fixtures, checker, determinismo de enforcement e gate `DISCOVERY_READY` não
  foram avaliados; PRD, SPEC, código e BUILD continuam não autorizados.

## Artefatos e integridade

- Linhas por arquivo: [JSONL completo](imp50-49-full-inventory-20260923.jsonl),
  SHA-256 `a0a1aa656348c88f4719fa5c5301f876b938567327bd203df3324f9c4f41b717`
  (2.412 linhas; paths, tamanhos, hashes, referências e classe candidata).
- Resumo da execução:
  [JSON](imp50-49-full-inventory-summary-20260923.json), SHA-256
  `536c131cd0749d77547ed875293b1f489e5e7cd5c6011ff3b0a564c3f08725b7`.
- Os hashes dos sidecars arquivados foram recalculados e conferem com a
  saída temporária original. Nenhum dos arquivos-fonte inventariados foi
  editado, movido, renomeado ou apagado.

## Limitações e registro operacional

A extração foi heurística sobre referências explícitas e relações de bundle;
os 339 casos pendentes demonstram que texto livre e histórico não sustentam
classificação determinística para todo o acervo. Os 145 `ORPHAN` permanecem
provisórios até triagem humana; não implicam remoção.

Durante uma varredura secundária malsucedida, um bug imprimiu acidentalmente
um trecho de log no traceback interno. O agente interrompeu a leitura, corrigiu
a lógica, não repetiu a impressão e não incluiu o trecho nos sidecars. O agente
reportou não ter identificado segredo nesse trecho; seu conteúdo não foi
republicado nem enviado externamente. O inventário persistido contém somente
metadados/referências, não corpos de logs.

**Conclusão de Discovery:** inventário integral concluído; `DISCOVERY_READY`
permanece pendente até adjudicação dos 339 casos e decisão explícita sobre as
classes. A task-mãe `AUD20-08` permanece `COMPLETED`.
