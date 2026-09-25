# AUD20-10 próxima fatia (C02/C04/C05) — BUILD local — 2026-09-25

Admissão: [recibo humano](AUD20-10-next-slice-human-approval-20260925.md), vinculado ao [pedido](AUD20-10-next-slice-admission-request-20260925.md) (`dc123bbe…`), derivado da SPEC aprovada `83130cdf…`. Allowlist respeitada; a fatia do collector não foi reaberta.

## Mudanças

- `packages/approval-engine/src/engine.ts` (C02): seam `onApprovalLatency`; `#emitApprovalLatency` emite `approval_latency_ms` somente quando `requestedAt` e o timestamp da decisão são válidos e ordenados, com atributos exatamente `{ decision, outcome: 'decided', operation: 'approval.decision' }` — sem IDs/conteúdo.
- `packages/observability/src/alert-delivery-ledger.ts` (novo, C04): ledger local append-only com cadeia de hash; transições `detected -> acknowledged -> closed` validadas fail-closed (id duplicado, alerta desconhecido, ack ausente, timestamps inválidos/fora de ordem); `deliverAlertCycles` percorre avaliações `firing` (ack ausente lança; `no_data` é OK) com timestamps injetados.
- `packages/observability/src/observability-exercise.ts` (C04/C05): seção `delivery` lê os **batches reais** dos collectors (métricas exportadas), avalia `DEFAULT_ALERT_RULES` no checkpoint de detecção e fecha o ciclo com relógio injetado; o status do exercício passa a exigir entrega completa e ledger válido.
- `packages/observability/src/index.ts`: exporta o novo módulo.
- `tests/aud20-10-alerts-ledger.test.ts` (novo): 10 testes de contrato (ledger, ciclos, latência, adulteração da cadeia, negativos).

## Gates

| Gate | Resultado |
|---|---|
| Focados (novo + exercise + alerts) | 21/21 PASS |
| `typecheck` / `lint` / Prettier (repo-wide) / `git diff --check` / `docs:check` | PASS |
| Suíte completa + coverage | 306 arquivos passed / 12 skipped; **2.657 PASS** / 192 skips; 93,02% / 90,20% / 91,36% / 93,51% (4/4 ≥90%) — [log v2](AUD20-10-alerts-ledger-coverage-v2-20260925.log) `20d180f4…` (v1 `32921f8f…` pré-remediação) |
| Mutation dirigida (4 novos + 22 da seleção) | **26/26 detected, 0 notDetected, 0 notApplicable** na árvore final — [JSON](AUD20-10-alerts-ledger-mutation-20260925.json) `69c2f982…`; manifesto v3 `f6a2b7e9…` |
| Determinismo do exercício | preservado (teste existente continua `PASS` e idempotente) |

## Remediação pós-crítica (v1 CONDITIONAL → v2)

- **F1 (MAJOR)** nome estável: `ApprovalLatencySample` agora carrega `metric: 'approval_latency_ms'`, e o teste novo prova a métrica atravessando um `InProcessCollector` com nome/valor/atributos exatos. A afirmação do relatório passou a ser literal.
- **F4** verificação da cadeia: `verifyAlertDeliveryEntries` exportada (pura) e `verify()` delega; teste de adulteração cobre `entry_hash_mismatch`, `previous_hash_mismatch` e `sequence_mismatch`.
- **F3** Prettier: os 13 arquivos de teste deixados sem formatação pelas rodadas de coverage foram formatados; `prettier --check .` passa repo-wide.
- **F2** (declarado): o manifesto `AUD19-08-mutants.json` (v3) está fora da allowlist congelada do recibo; a ampliação é o gate de mutation dirigida da própria admissão — registrado para reconciliação do pin canônico `545ba85f…` no reseal.
- **F5** (declarado): o guarda `decidedAt === undefined` é inalcançável pela API pública (o engine sempre grava o timestamp do clock); coberto por construção.
- **F6** (declarado): a allowlist citou `audit-ledger.test.ts`, que não existe (os testes do ledger vivem em `observability.test.ts`/`observability-coverage.test.ts`); registro desta rodada nos estados foi feito na sequência.

## Limites

- Owner/SLO continuam **não preenchidos** (decisão humana pendente); alertas são sintéticos e locais.
- Sem rede/OTLP, PostgreSQL, dados reais, staging, produção, commit ou deploy nesta rodada de BUILD.
- C01–C07 de `AUD20-10` seguem abertos até a crítica independente fresca e a disposição da fatia.
