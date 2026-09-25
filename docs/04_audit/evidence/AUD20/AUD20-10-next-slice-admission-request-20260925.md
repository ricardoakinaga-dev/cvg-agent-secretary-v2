# Pedido de admissão — próxima fatia AUD20-10 (C02/C04/C05) — 2026-09-25

Status: **PEDIDO**, não admissão. Escopo derivado da SPEC aprovada (`83130cdf…`); a fatia do collector (IMP50-09) já foi aceita. Nenhum código é tocado por este arquivo.

## Objeto

1. **C02 — approval latency real**: instrumentar a transição de decisão de approval no owner, calculando latência somente quando `requestedAt` e `decidedAt` forem válidos; emitir `approval_latency_ms` com atributos allowlisted (`decision`, `outcome`, `operation`), sem IDs pessoais/conteúdo.
2. **C04 — alertas + delivery ledger local append-only**: avaliar `DEFAULT_ALERT_RULES` sobre batches reais do collector e entregar a ledger append-only com transições `detected -> acknowledged -> closed` e relógio injetado; falha de sink/entrega invalida o exercício; sem retry infinito.
3. **C05 — exercício integrado** fechando o ciclo com timestamps válidos e ordem verificada.

## Allowlist candidata (congelar na admissão)

- `packages/observability/src/alerts.ts`, `collector.ts`, `index.ts`, `observability-exercise.ts` e novo `packages/observability/src/alert-delivery-ledger.ts`
- `packages/approval-engine/src/engine.ts` (e `contracts.ts` somente se necessário)
- testes: `packages/observability/src/__tests__/alerts.test.ts`, `audit-ledger.test.ts`, `observability-exercise.test.ts` (existentes) e novo `tests/aud20-10-alerts-ledger.test.ts`
- qualquer arquivo fora desta lista exige nova revisão.

## Negativos obrigatórios

Latência ausente/inválida/negativa; PII/canary no export; `no_data` tratado como OK; entrega ou ack ausente; timestamps fora de ordem; owner/SLO preenchido sem decisão humana; sink/ledger falhando sem retry infinito.

## Gates de aceite da fatia

Contract tests (latência, regras, ledger), exercício integrado sintético, suíte completa, coverage 4/4 ≥90%, typecheck/lint/format/docs/diff, mutation dirigida e crítica independente fresca. C01–C07 de `AUD20-10` continuam abertos até lá; owner/SLO permanecem decisão humana.

## O que este pedido NÃO autoriza

Owner/SLO inventados, alertas reais, rede/OTLP, PostgreSQL, dados reais, staging/produção, commit/push/deploy ou reabrir a fatia do collector.
