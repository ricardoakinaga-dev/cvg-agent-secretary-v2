# Pedido de admissão — mutation selecionada (C06/AUD20-17) — 2026-09-25

Status deste documento: **PEDIDO**, não admissão. Nenhuma mutation é executada por este arquivo; a execução só existe após admissão hash-bound em separado.

## 1. Objeto

Execução de mutation selecionada via sentinel (`scripts/lib/mutation-sentinel.mjs`) sobre o candidato selado, como um dos pilares de C06 de `AUD20-17/IMP50-40`.

## 2. Escopo proposto

- Alvos críticos: `apps/api/src/server/request-context.ts` (92% branches `REPORT_ONLY`; piso de 95% aplicável por Q1, sem adjudicação de gate), kernel de composição, approval store e policy engine — lista final a congelar na admissão.
- Thresholds e registry congelados e inalterados; nenhuma redução de piso para fabricar PASS.
- Sobreviventes tratados (teste adicionado ao mesmo código) ou aceitos por decisão registrada, um a um.

## 3. Limites

- Mutation não decide C06 sozinha: compõe com piso de functions, piso crítico de branches, PostgreSQL e binding candidate-bound.
- Sem alteração de produto para "passar" mutantes; sem exclusões artificiais de denominador.
- Recomenda-se executar após R0/R1 (candidato selado + binding) para que o resultado seja adjudicável.

## 4. O que este pedido NÃO autoriza

Executar mutation, alterar thresholds/registry, aceitar C06/C07, ou usar o resultado fora do candidato selado. Sem admissão própria, mutation permanece `NOT_RUN` e C06 segue `FAIL`.
