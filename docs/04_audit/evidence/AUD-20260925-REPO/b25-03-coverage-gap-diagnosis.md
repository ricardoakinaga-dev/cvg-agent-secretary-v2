# B25-03 — Diagnóstico de gap de coverage (onda R1, 2026-09-25, SEM código)

Diagnóstico read-only (sem modificação de código-fonte, teste, config ou
threshold; sem commit/push; sem rede; sem execução de suíte ou banco — apenas
leitura do resumo já existente em `coverage/` e dos logs/resumos integrados
preservados em `docs/04_audit/evidence/AUD20/`).

## 1. Fonte e identidade do resumo

- Diretório: `coverage/` na raiz contém **1 arquivo**: `coverage-summary.json`.
- `coverage/coverage-summary.json` é **byte-idêntico** ao resumo integrado
  `docs/04_audit/evidence/AUD20/AUD20-17-request-context-v2-integrated-coverage-summary-20260924.json`
  (ambos SHA-256 `94abe96ed88109b890c4d30d5ef387cb002fbf30e170fc622560f166df23802b`).
- O resumo cobre 210 entradas de arquivo + bloco `total`.

## 2. Percentuais atuais vs. piso AAA ≥ 90%

| Métrica | Atual (resumo) | Denominador | Piso AAA | Situação |
|---|---:|---:|---:|---|
| Statements | 90,84% (11.497/12.656) | 12.656 | ≥ 90% | Acima do piso |
| Branches | 87,00% (8.849/10.171) | 10.171 | ≥ 90% | **Abaixo do piso** (−3,00 pp) |
| Functions | 89,27% (2.107/2.360) | **2.360** | ≥ 90% | **Abaixo do piso** (−0,73 pp) |
| Lines | 91,43% (10.922/11.945) | 11.945 | ≥ 90% | Acima do piso |

Módulo `request-context` (recorte do mesmo resumo, conforme BUILD report e
`testReceipts.integratedRootRequestContextCoverage`):

- Statements 99%, branches 92% (69/75), functions 100%, lines 98,91%.
- O piso crítico de branches do módulo é 95%; 92% segue reportado sem
  adjudicação (o registry congelado não lista o módulo; ver errata de
  aplicabilidade `AUD20-17-request-context-branch-floor-erratum-20260924.md`).
  Nenhum threshold foi alterado nesta lane.

## 3. Tamanho do gap (ordem de grandeza)

- Functions global: piso 90% de 2.360 = 2.124 (teto). Coberto 2.107.
  **Faltam ~17 funções** (`2124 − 2107 = 17`; gap de 0,73 pp).
- Branches global (contexto): 90% de 10.171 = 9.154 (teto). Coberto 8.849.
  Déficit de ~305 branches — ordem de grandeza maior que o gap de funções,
  registrado aqui apenas como contexto, sem propor mudança de piso.
- Statements e lines já estão acima de 90%; não há gap nessas métricas.

## 4. Top-10 piores arquivos por cobertura de funções

Ordenado por `% functions` (nome + % + descobertas/total), a partir de
`coverage/coverage-summary.json`. Caminhos relativos à raiz do repo.
Nenhum denominador ou threshold foi proposto para mudança.

| # | Arquivo | Functions | Statements | Branches | Lines |
|---:|---|---:|---:|---:|---:|
| 1 | `apps/worker/src/postgres-role-preflight.ts` | 0,00% (0/10) | 5,95% (5/84) | 0,00% (0/80) | 6,09% (5/82) |
| 2 | `packages/agent-core/src/agent-run/agent-run-service.ts` | 0,00% (0/1) | 0,00% (0/2) | 100,00% (0/0) | 0,00% (0/2) |
| 3 | `packages/agent-core/src/audit/audit-hook.ts` | 0,00% (0/1) | 0,00% (0/1) | 100,00% (0/0) | 0,00% (0/1) |
| 4 | `packages/persistence/src/runtime-approval-store.ts` | 11,29% (7/62) | 14,43% (27/187) | 33,80% (71/210) | 14,75% (27/183) |
| 5 | `apps/api/src/server/bootstrap-persistence.ts` | 28,57% (8/28) | 60,71% (34/56) | 84,09% (37/44) | 61,11% (33/54) |
| 6 | `packages/agent-evals/src/datasets/core.ts` | 33,33% (1/3) | 60,00% (3/5) | 100,00% (0/0) | 60,00% (3/5) |
| 7 | `apps/worker/src/postgres-controlled.ts` | 34,21% (13/38) | 70,86% (90/127) | 65,13% (71/109) | 75,42% (89/118) |
| 8 | `packages/persistence/src/retention.ts` | 39,28% (22/56) | 44,84% (161/359) | 50,20% (125/249) | 45,61% (156/342) |
| 9 | `apps/api/src/orchestration-observability.ts` | 57,14% (12/21) | 73,52% (25/34) | 75,86% (44/58) | 71,87% (23/32) |
| 10 | `apps/worker/src/kernel-composition.ts` | 58,00% (29/50) | 67,64% (276/408) | 59,29% (303/511) | 68,34% (272/398) |

## 5. Causa provável (sem especular além dos dados)

- Os dados mostram concentração do déficit em arquivos ligados a persistência/
  Postgres (`postgres-role-preflight`, `postgres-controlled`,
  `bootstrap-persistence`, `runtime-approval-store`, `retention`) e em dois
  módulos pequenos `agent-core` com 0/1 função coberta, além de
  `orchestration-observability` e `kernel-composition`.
- O BUILD report registra que as execuções usaram `TEST_DATABASE_URL=''` e que
  o gate PostgreSQL ficou `NOT_RUN`, com 192 testes condicionais ignorados em
  12 arquivos (não contam como aprovados). Essa é a única correlação
  documentada nos artefatos; nenhuma relação causal adicional é afirmada aqui.
- Não se afirma que cobrir arquivos específicos fechará o gap: o fechamento
  depende de quais funções/branches os testes exercitarem e do denominador
  vigente (2.360), que **não** foi alterado.

## 6. Próximos passos (testes do mesmo código após gate próprio)

1. Manter o piso AAA ≥ 90% e o denominador atual (functions 2.360) sem
   alteração; não propor mudar denominador ou threshold.
2. Eventual fechamento do gap (~17 funções + branches críticos do módulo)
   exige testes do **mesmo código**, após gate próprio: autorização, SPEC e
   trilha de auditoria, com PostgreSQL/mutation tratados em seus gates
   (ambos `NOT_RUN` nesta rodada).
3. Reutilizar como baseline o resumo idêntico (`94abe9…`) somente como ponto
   de comparação reportado — a comparação "sem redução" segue `NOT_RUN` por
   falta de baseline candidate-bound, conforme B25-02.
4. Re-ler `coverage/coverage-summary.json` após qualquer nova execução; este
   diagnóstico vale para o resumo atual.

## 7. Limites

- Nenhum código, teste, config ou threshold foi modificado; nenhum teste,
  coverage, typecheck, lint ou banco foi executado nesta lane.
- Sem commit/push, sem rede, sem dados reais.
- Este arquivo é diagnóstico de gap, não plano de cobertura nem adjudicação
  de piso; C06 permanece `FAIL` até gate próprio.
