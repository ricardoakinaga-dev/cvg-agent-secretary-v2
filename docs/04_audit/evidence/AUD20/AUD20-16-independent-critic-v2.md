# AUD20-16 — crítica independente fresh-context v2

- `observedAt`: `2026-09-21T22:18:02Z`
- `scope`: leitura somente do pacote final candidate-bound; nenhum arquivo foi
  alterado pelo crítico; não houve rede, Docker ou efeito externo.
- `candidateId`: `927f3e0a7a12fb7c8139dea8961de3536ea8a291e4b407dc350cc3b63e1250ed`
- `overallVerdict`: `PASS_LIMITED_NOT_COMPLETION`

## Veredito por critério

| Critério | Veredito | Base |
| --- | --- | --- |
| C01 | `WAITING_HUMAN_APPROVAL` | O horizonte pós-tombstone não foi definido por D05; a decisão humana permanece pendente. |
| C02 | `WAITING_HUMAN_APPROVAL` | Owner formal e trigger operacional continuam bloqueados. |
| C03 | `PASS` | PostgreSQL local `16.15`, origem sintética, três volumes; p50/p95 de `pg_column_size`: small `260/388`, medium `388/516`, operational-limit `532/788`; relation/index/total: `286720/180224/499712`, `2146304/811008/2990080`, `11706368/3473408/15212544` bytes; sweeps `1000/2.046 ms`, `5000/2.947 ms`, `20000/10.386 ms`. |
| C04 | `NOT_RUN` | Arquivo/particionamento depende da decisão de ciclo de vida/schema. |
| C05 | `NOT_RUN` | Mixed-version depende de política humana aprovada e forma de migração. |
| C06 | `NOT_RUN` | Negativos de expiração prematura, archive indisponível e replay antigo não foram executados. |
| C07 | `WAITING_HUMAN_APPROVAL` | O pacote mecânico está íntegro, mas policy/owner/trigger ainda não têm binding semântico aprovado; staging/produção continuam `NO_GO`. |

## Integridade e limites

- A calculadora permanece fail-closed para origem ausente/não sintética,
  horizonte ausente, taxa inválida e p95 inválido; os negativos de lifecycle
  permanecem não executados.
- O binding e os receipts passaram no escopo declarado: base commit
  `25434811334f5cec92ee0741079302271b82b7cb`, tree
  `218d24fa5ee1e66f2cbe48687d5630100abcf3c3`, source digest
  `43b9b49b4c3866cf48b02da715b50bb39643fdb6ce9842ab0a394cf3bed6fd30`, 17
  arquivos escopados, 12 artefatos brutos e 10 command links. O verifier
  independente recomputa Git binding, digest, candidate ID, bytes/SHA e links;
  resultado `PASS`.
- Gap corrigido nesta rodada: os checkpoints operacionais serão atualizados
  para ficar posteriores ao `observedAt` dos receipts (`22:01:54Z`). O crítico
  não encontrou mismatch de hash.

## Decisão

`PASS_LIMITED_NOT_COMPLETION`. C03, candidate binding e integridade dos receipts
passam; o bloqueador principal continua sendo aprovação humana explícita para
horizonte pós-tombstone, owner formal e review trigger. Não liberar AUD20-05,
schema/migration/archive/partitioning, staging ou produção.
