# Recibo humano — admissão da próxima fatia AUD20-10 (C02/C04/C05) — 2026-09-25

- Autoridade: usuário, decisão explícita nesta sessão (quesito "Próxima fatia").
- Decisão: **admitir** a próxima fatia de `AUD20-10` (C02 approval latency real; C04 alertas + delivery ledger local append-only; C05 exercício fechando o ciclo), derivada da SPEC aprovada `83130cdf…`.
- Documento-base (hash-bound): [pedido de admissão](AUD20-10-next-slice-admission-request-20260925.md), SHA-256 `dc123bbeb869b2915d0ce7fb6973563b0e98c4fa8c8c9fcced441649490e1a55`.
- Allowlist congelada: `packages/observability/src/alerts.ts`, `collector.ts`, `index.ts`, `observability-exercise.ts`, novo `packages/observability/src/alert-delivery-ledger.ts`; `packages/approval-engine/src/engine.ts` (e `contracts.ts` se necessário); testes existentes `alerts.test.ts`, `audit-ledger.test.ts`, `observability-exercise.test.ts` e novo `tests/aud20-10-alerts-ledger.test.ts`.
- Registro em `0190_spec_validation.md` e na task `AUD20-10` de `0337` **antes** de qualquer edição de código.
- Limites: sem owner/SLO inventados, alertas reais, rede/OTLP, PostgreSQL, dados reais, staging, produção, commit/push/deploy; a fatia do collector permanece aceita e não é reaberta.
- C01–C07 de `AUD20-10` seguem abertos até os gates da fatia (contract tests, exercício integrado, suíte/coverage, estáticos, mutation dirigida e crítica independente fresca).
