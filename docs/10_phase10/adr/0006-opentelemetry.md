# ADR 0006 — OpenTelemetry como padrão de observabilidade

- Status: aceito (Phase 10)
- Contexto: traces locais existiam, mas sem propagação padronizada nem adapter
  real de mercado.
- Decisão: `@cvg/observability` define `Telemetry` e oferece
  `InMemoryTelemetry` (determinística para testes) e `OpenTelemetryTelemetry`
  (adapter sobre `@opentelemetry/api` + SDK). Trace context W3C propaga
  `traceId/spanId/correlationId/tenantId/conversationId/sessionId/agentId/agentVersion`.
  Métricas usam allowlist para evitar alta cardinalidade; logs passam por
  redaction centralizada. Auditoria evolui para cadeia hash append-only.
- Consequências: integração com qualquer backend OTLP; custo de dependência
  pequeno e justificado; exportação real fica para o runtime de produção.
