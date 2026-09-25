# IMP50-49 — preparação da política de linhagem — 2026-09-23T07:18:04Z

## Resultado

Foi preparado o rascunho de Discovery
[0022](../../../00_discovery/0022_aud20_08_imp50_49_evidence_lineage.md) para
`AUD20-08-FU3` / `IMP50-49`. A extensão do escopo é necessária porque a SPEC
aprovada de AUD20-08 protege somente o ponteiro de certificação corrente e não
define a linhagem geral da árvore de evidências.

## Base revisada

- Discovery 0017, PRD 0028 e SPEC AUD20-08: estado corrente e separação Phase
  10/11; migração/limpeza do acervo geral permanece fora do escopo original.
- Backlog 0341 e registro vivo por ID: IMP50-49 precisa de política de histórico
  e follow-up antes de checker/código; não estava admitido.
- `docs/CURRENT.md`: relações de supersessão existem para documentos/programas
  correntes, mas não constituem um índice de todos os artefatos da pasta de
  evidências.
- Matrizes/receipts AUD20: referências diretas e conteúdo `raw` relacionado por
  bundle; arquivos sob um bundle podem herdar proveniência sem link individual.
- A árvore de evidências contém arquivos planos, domínios, bundles e snapshots
  aninhados; o rascunho não classifica artefatos existentes individualmente.

## Política candidata

O rascunho diferencia `CURRENT`, `HISTORICAL`, `INHERITED`, `SUPERSEDED`,
`UNCLASSIFIED` e `ORPHAN`; exige falha para órfão gerenciado, preserva conteúdo
e não confunde evidência histórica com autoridade corrente. Recomenda inventário
read-only e deixa à revisão humana a escolha entre cobertura integral antes do
enforcement e migração gradual por namespaces gerenciados.

## Gate, verificação e limites

- Estado: `DRAFT_PENDING_HUMAN_REVIEW`; nenhum gate `DISCOVERY_READY` emitido.
- Validação documental em Node `v22.23.2`: `docs:check` PASS (958 links,
  612 JSONs; estado semântico e Node PASS), `format:check` PASS e
  `git diff --check` PASS após formatar somente o Discovery 0022.
- Não foi criado PRD ou SPEC para o follow-up; checker e código não foram
  alterados; nenhum BUILD, teste de produto, dado real ou ação externa ocorreu.
- Nenhum arquivo histórico foi movido, apagado, reescrito ou reclassificado.
- Próxima ação operacional única continua a revisão/aprovação da SPEC
  `AUD20-17` / `IMP50-40`; esta proposta não a substitui.
- Evidência do estado anterior de gates: [revalidação R8](imp50-next-action-gate-review-20260923.md)
  e [registro por IMP50](imp50-status-20260923.md).
