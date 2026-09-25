# AUD20-16 v1 — capacity planning checkpoint — 2026-09-21

## Estado

- task: `AUD20-16`
- status: `WAITING_HUMAN_APPROVAL`
- execution: `CONTROLLED_LOCAL`
- policy version: `PENDING_HUMAN_APPROVAL`
- staging/produção: `NO_GO`

`AUD20-04` está concluída em escopo local controlado. Esta rodada avançou
somente o tooling neutro de capacidade de `AUD20-16`; não escolhe a janela
pós-tombstone, owner, arquivo ou migration.

## Fatia entregue

- `scripts/aud20-16-capacity-model.mjs` calcula crescimento diário e projetado
  usando linhas/dia, taxa elegível, p50/p95 de bytes da linha e índice medido;
- o input exige `dataOrigin: "synthetic"` e falha fechado quando o marcador
  está ausente ou identifica origem não sintética;
- `horizonDays` e `safetyFactor` são inputs obrigatórios, sem default de
  política;
- medições inválidas falham fechado, sem coerção de taxa, horizonte ou ordem
  p50/p95;
- o fixture usa três volumes sintéticos e a versão de política
  `PENDING_HUMAN_APPROVAL`;
- o focused RED/Green e o negativo foram fechados antes deste checkpoint.

## Evidência fresca

| Gate | Resultado | Evidência |
| --- | --- | --- |
| RED — origem sintética ausente | PASS como baseline de falha esperada | `capacity-model-synthetic-origin-red-20260921T203514Z.log` |
| focused model | PASS — 1 arquivo, 4 testes | `capacity-model-focused-20260921T203638Z.log` |
| three-volume projection | PASS — small/medium/operational-limit, origem sintética explícita | `capacity-model-green-20260921T203548Z.log` |
| negative validation | PASS — origem ausente/não sintética; horizon/rate/p95 no focused | `capacity-model-negative-20260921T204121Z.log` |
| lint | PASS | `capacity-model-lint-20260921T203656Z.log` |
| full unit regression | PASS — 283 files, 2183 tests, 188 conditional skips | `full-unit-20260921T211044Z.log` |
| repository lint/format/docs/diff | PASS — docs `783` links / `582` JSON | `lint-20260921T211044Z.log`, `format-20260921T211200Z.log`, `docs-check-20260921T211200Z.log`, `diff-check-20260921T211200Z.log` |
| independent critic | PASS limitado ao checkpoint parcial; C07 não é PASS semântico | `AUD20-16-independent-critic-v1.md` |
| raw/command receipt integrity | PASS — 11/11 raw artifacts e 8/8 command links; 2 SHA typos corrigidos | `AUD20-16-raw-artifact-receipt.json`, `AUD20-16-command-receipt.json` |
| D05 interpretation review | AMBIGUOUS horizon; BLOCKED formal owner/review trigger | `AUD20-16-d05-interpretation-review-v1.md`, `aud20_16_human_decision_request_20260921.md` |

## Decisão pendente e limites

O D05-3/4 fixa o inbound ativo em 30 dias, mas não fornece uma decisão
operacional suficiente para a duração pós-tombstone nem para o owner/review
trigger de capacidade. Esses valores alteram retenção/privacy e não serão
inferidos. Sem eles, C01/C02 permanecem aguardando decisão e C04–C06 não
começam. A crítica independente confirmou o gate, mas rebaixou C07: os checks
mecânicos passam, enquanto o binding semântico de policy/owner/trigger aguarda a
decisão humana.

O pedido de decisão separa explicitamente a confirmação dos 30 dias de
journal/deduplicação de uma escolha inequívoca do horizonte pós-tombstone, owner
formal e review trigger. Nenhum valor é inferido.

Não houve banco, migration, arquivo, partitioning, writer mixed-version, dado
real, credencial, integração, commit, push, deploy, staging ou produção.

## Atualização final do pacote parcial — 2026-09-21

- A entrada continua fail-closed com `dataOrigin: "synthetic"`; o focused final
  passou `5/5`, incluindo rejeição de alvo PostgreSQL remoto antes da conexão.
- O modo PostgreSQL é tooling neutro para um banco descartável em host local.
  Ele materializa três tabelas temporárias sintéticas, mede
  `pg_column_size`, `pg_relation_size`, `pg_indexes_size`,
  `pg_total_relation_size`, p50/p95 e sweep, e remove o schema no `finally`.
  Nenhuma migration ou schema do produto foi executada.
- A medição final em PostgreSQL `16.15` passou para `small`, `medium` e
  `operational-limit`, com `1000/5000/20000` linhas varridas e métricas
  relation/index/total registradas em
  `AUD20-16-raw/capacity-model-postgres-green-final-20260921.log`.
- A regressão completa final passou `283` arquivos, `2184` testes e `188`
  skips condicionais; o modo offline e os negativos de origem/horizonte/taxa/
  p95 também estão registrados em logs brutos finais.
- O binding candidate-bound foi verificado pelo processo separado com `17`
  arquivos escopados, `12` artefatos brutos e `10` command links; os receipts
  conferem bytes/SHA. A crítica independente fresh-context v2 deu
  `PASS_LIMITED_NOT_COMPLETION`: C03 passa, mas o gate humano permanece.
  O estado oficial continua `WAITING_HUMAN_APPROVAL`, `AUD20-05` bloqueada e
  staging/produção `NO_GO`.
- A chronology foi reconciliada: o checkpoint operacional final de
  `2026-09-21T22:24:43Z` está alinhado ao reseal dos receipts; runtime state,
  execution log, backlog e `CURRENT.md` carregam esse fechamento e os checks
  finais continuam PASS.
