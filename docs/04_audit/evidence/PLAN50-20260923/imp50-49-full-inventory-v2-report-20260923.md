# IMP50-49 — inventário integral read-only v2 — 2026-09-23

## Resultado

- Captura: `2026-09-23T17:22:44Z` UTC.
- Escopo: arquivos regulares em `docs/04_audit/evidence/`, com caminho relativo ao repositório, tamanho em bytes e SHA-256. Os caminhos estão ordenados lexicograficamente.
- Resultado: **2,433 arquivos**, **28,970,553 bytes**.
- JSONL: [imp50-49-full-inventory-v2-20260923.jsonl](imp50-49-full-inventory-v2-20260923.jsonl) — 444,142 bytes; SHA-256 `89c0bb3747dcb31f38db8ec94b9fff1ab0efd68cb522a3088e78bdc26ec06a56`.
- Resumo: [sidecar JSON](imp50-49-full-inventory-v2-summary-20260923.json).

## Método e verificação

Os hashes dos arquivos foram calculados em streaming, em blocos de 1 MiB. Para cada arquivo, os metadados `lstat`/`fstat` foram comparados antes e depois da leitura; qualquer alteração durante o hash interromperia a captura. A comparação com a v1 usa somente caminho, tamanho e SHA-256 das linhas do inventário.

Uma segunda varredura, em processo separado às `2026-09-23T17:23:22Z`, comparou todos os trios caminho/tamanho/SHA-256 e total de bytes, excluindo os três sidecars definidos abaixo. Resultado: **PASS** — 2,433/2,433 linhas; 28,970,553 bytes; **0 caminhos adicionados, 0 ausentes e 0 alterados desde a captura**. Os valores de linhas, bytes e SHA-256 conferem com o resumo.

## Limite da captura

Os três sidecars abaixo foram criados depois da captura e estão fora do inventário v2:

- `docs/04_audit/evidence/PLAN50-20260923/imp50-49-full-inventory-v2-20260923.jsonl`
- `docs/04_audit/evidence/PLAN50-20260923/imp50-49-full-inventory-v2-report-20260923.md`
- `docs/04_audit/evidence/PLAN50-20260923/imp50-49-full-inventory-v2-summary-20260923.json`

O relatório foi escrito após o PASS da segunda varredura. Nenhum conteúdo de evidência foi exibido, interpretado ou usado para reclassificar arquivos; a leitura dos arquivos foi feita somente para gerar SHA-256 em streaming. A v1 foi preservada sem alteração.

## Comparação com v1

Baseline: [imp50-49-full-inventory-20260923.jsonl](imp50-49-full-inventory-20260923.jsonl), **2,412 arquivos** / **24,721,814 bytes**, SHA-256 do JSONL `a0a1aa656348c88f4719fa5c5301f876b938567327bd203df3324f9c4f41b717`. Diferença entre os snapshots:

- Adicionados: **21**.
- Ausentes: **0**.
- Alterados em tamanho ou SHA-256: **1**.

Caminhos adicionados:

- `docs/04_audit/evidence/AUD20/AUD20-17-human-approval-20260923.md`
- `docs/04_audit/evidence/AUD20/AUD20-17-independent-critic-v1-20260923.md`
- `docs/04_audit/evidence/AUD20/AUD20-17-query-slice-scope-critic-20260923.md`
- `docs/04_audit/evidence/AUD20/AUD20-17-query-spec-critic-v1-20260923.md`
- `docs/04_audit/evidence/AUD20/AUD20-17-query-spec-critic-v2-20260923.md`
- `docs/04_audit/evidence/AUD20/AUD20-17-v1-build-report-20260923.md`
- `docs/04_audit/evidence/AUD20/AUD20-19-FU1-independent-critic-v1-20260923.md`
- `docs/04_audit/evidence/AUD20/AUD20-19-FU1-independent-critic-v2-20260923.md`
- `docs/04_audit/evidence/AUD20/AUD20-19-FU1-independent-critic-v3-20260923.md`
- `docs/04_audit/evidence/AUD20/AUD20-19-FU1-independent-critic-v4-20260923.md`
- `docs/04_audit/evidence/AUD20/AUD20-19-FU1-spec-preparation-20260923.md`
- `docs/04_audit/evidence/PLAN50-20260923/imp50-49-aud19-10-member-manifest-candidate-20260923.jsonl`
- `docs/04_audit/evidence/PLAN50-20260923/imp50-49-aud19-10-member-manifest-candidate-report-20260923.md`
- `docs/04_audit/evidence/PLAN50-20260923/imp50-49-aud19-10-member-manifest-critic-v1-20260923.md`
- `docs/04_audit/evidence/PLAN50-20260923/imp50-49-full-inventory-20260923.jsonl`
- `docs/04_audit/evidence/PLAN50-20260923/imp50-49-full-inventory-report-20260923.md`
- `docs/04_audit/evidence/PLAN50-20260923/imp50-49-full-inventory-summary-20260923.json`
- `docs/04_audit/evidence/PLAN50-20260923/imp50-49-historical-reference-map-v2-20260923.jsonl`
- `docs/04_audit/evidence/PLAN50-20260923/imp50-49-overlay-review-v2-20260923.md`
- `docs/04_audit/evidence/PLAN50-20260923/imp50-49-triage-proposal-20260923.jsonl`
- `docs/04_audit/evidence/PLAN50-20260923/imp50-49-triage-proposal-20260923.md`

Caminhos ausentes:

- Nenhum.

Caminhos alterados:

- `docs/04_audit/evidence/PLAN50-20260923/imp50-status-20260923.md` — v1 `12373` bytes / `8f381d3ffd59e3a026b98130c2fcdbd88939feb42107fdc9a7f674a329ea127a`; v2 `74621` bytes / `9c9fa80cad7652e508822e7b8480ebc13f5a22beee3f730191dd2d32f573275a`

## Disposição de Discovery

Esta atualização registra somente a escolha do baseline v2 e sua captura integral read-only. O overlay permanece sem adjudicação; os 141 casos previamente apontados continuam pendentes. Nenhuma classe ou regra de linhagem foi aprovada ou alterada, e este inventário não emite `DISCOVERY_READY`, PRD, SPEC, checker ou autorização de BUILD.

O estado por item permanece em [imp50-status](imp50-status-20260923.md); a decisão e as opções de linhagem/baseline estão registradas em [Discovery 0022](../../../00_discovery/0022_aud20_08_imp50_49_evidence_lineage.md).

Relatório final escrito em `2026-09-23T17:24:40Z` UTC.
