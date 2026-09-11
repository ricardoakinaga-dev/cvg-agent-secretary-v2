# 0414 — Metrics Audit

## Parecer vigente — AUD-DOC-001 — 2026-09-05T00:54:31-03:00

Métricas: Coverage 84,87/80,12/84,98/85,98; métricas HTTP process-local. p95 de persistência/resposta e KPIs de atendimento não foram medidos.

Fonte atual: [relatório integral](0539_documentation_implementation_review.md), [inventário](0540_documentation_review_inventory.json) e [evidências](0541_documentation_review_evidence.json). Auditoria solicitada concluída; correções futuras ainda abertas.

## Registro histórico anterior a esta auditoria

## Metricas tecnicas

- Latencia por endpoint.
- Duracao de agent run.
- Falhas por adapter.
- Retries.
- Tamanho de fila.
- Erros por tipo.

## Metricas de negocio

- Conversas iniciadas.
- Sessoes criadas.
- Intencoes classificadas.
- Handoffs criados.
- Tasks criadas.
- Approvals pendentes, aprovados, rejeitados e expirados.
- Safety events.

## Pergunta-chave

E possivel entender o comportamento do sistema sem ler codigo?

## Criterio minimo

Dashboards ou queries devem permitir identificar volume, falha, gargalo e risco operacional.

## Status atual

Aguardando runtime instrumentado.
