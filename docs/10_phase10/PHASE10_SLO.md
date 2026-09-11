# PHASE 10 — SLO E ENGENHARIA DE CONFIABILIDADE

## SLOs propostos

| Indicador                                | Alvo inicial | Estado                                           |
| ---------------------------------------- | ------------ | ------------------------------------------------ |
| Disponibilidade da API                   | 99,9%        | não medido em produção                           |
| Processamento de mensagem p95            | < 2 s        | alvo; load local p95 3,7 ms (adapter em memória) |
| Processamento de mensagem p99            | < 5 s        | alvo                                             |
| Mensagens inbound comprometidas perdidas | 0            | validado em chaos/load                           |
| Efeitos externos duplicados              | 0            | validado por journal                             |
| RPO                                      | ≤ 5 min      | não medido em produção                           |
| RTO                                      | ≤ 30 min     | não medido em produção                           |

Racional de RPO/RTO: 5 min/30 min compatíveis com snapshot PostgreSQL contínuo
(WAL) e restore em banco separado. Como não há infraestrutura de produção
disponível, o resultado permanece `NOT_VALIDATED_ON_PRODUCTION_INFRASTRUCTURE`.

## Alertas e runbooks

| Alerta                          | Origem                               | Runbook                    |
| ------------------------------- | ------------------------------------ | -------------------------- |
| `outbox_dead_letter > 0`        | métricas de outbox / API operacional | `PHASE10_RUNBOOKS.md` §DLQ |
| provider error rate alto        | `model_calls_total{status=error}`    | §provider                  |
| circuit breaker aberto          | `model.circuit.transition`           | §provider                  |
| anomalia de custo               | `model_cost_usd`                     | §custo                     |
| replay/tentativa de assinatura  | `webhook_rejected_total`             | §webhook                   |
| policy denials excessivos       | `policy_denied_total`                | §policy                    |
| human takeover bloqueando envio | `human_takeovers_total`              | §takeover                  |

## Performance budgets

- API: body limit 1 MiB, rate limit 300 req/min/IP, overhead por handler medido
  pelo `ControlledRequestMetrics`.
- Worker: drain limitado (1..100 por execução), claim com `FOR UPDATE SKIP LOCKED`.
- Modelo: `maxOutputChars` 32k, timeout por perfil, custo por budget.
- Outbox: payload máximo 64 KiB.

## Próximos passos mensuráveis

1. Executar `npm run test:postgres` com banco real em CI (já configurado no
   workflow) para fechar o gate de ambiente.
2. Repetir load com PostgreSQL e medir p50/p95/p99 de persistência.
3. Medir RPO/RTO com backup real e restaurar em banco separado.
