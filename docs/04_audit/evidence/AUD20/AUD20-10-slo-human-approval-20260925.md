# Aprovação humana — owner/SLO de AUD20-10 — 2026-09-25

- Autoridade: usuário, decisão explícita nesta sessão.
- Decisão: **owner operacional = papel `operations`**; **os 8 objetivos SLO propostos são aprovados como estão**, com validade até **2026-12-31**.
- Aplicação: `docs/04_audit/evidence/AUD19/AUD19-09-sli-slo.json` (governance + 8 SLIs: `owner=operations`, `status=APPROVED`, `approvedBy=operations`, `approvedAt=2026-09-25T00:00:00.000Z`, `validUntil=2026-12-31`) e `packages/observability/src/alerts.ts` (regras: `owner='operations'`, `sloStatus='APPROVED'`).

## Objetivos aprovados

| Domínio | SLI | Objetivo | Janela |
|---|---|---|---|
| queue | outbox_lag | ≤ 100 eventos sustentado | 5m |
| lease | lease_lost_and_claim_failures | = 0 | 5m |
| approval | approval_latency_p95 | p95 ≤ 5000 ms | 15m |
| uncertain | uncertain_settlements | = 0 | 15m |
| dlq | dead_lettered_events | = 0 | 15m |
| handoff | human_handoffs | ≤ 5 | 15m |
| errors | worker_error_rate | ≤ 3 | 5m |
| cost | model_cost_usd | ≤ US$ 25/hora | 1h |

## Limites

- Aprovação local/sintética: não autoriza produção, dados reais, canais, providers ou efeito externo.
- A validade expira em 2026-12-31; nova aprovação é exigida depois disso.
- A mudança em `alerts.ts` altera o candidato certificado (`68bb9d0a`); uma re-certificação é necessária antes do sign-off de release.
