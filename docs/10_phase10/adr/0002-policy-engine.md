# ADR 0002 — Policy Engine deny-by-default

- Status: aceito (Phase 10)
- Contexto: autorização dispersa e decisões sensíveis poderiam depender do
  modelo ou do fluxo legado.
- Decisão: criar `@cvg/policy-engine` com decisões `ALLOW`, `DENY`,
  `REQUIRE_APPROVAL`; capabilities com risco; grants por perfil de agente;
  teto por role de operador; documentos de policy versionados que apenas
  restringem. Contexto incompleto, tenant ausente ou mismatch de recurso →
  DENY.
- Consequências: o modelo nunca decide autorização; novos perfis exigem grant
  explícito; testes negativos e evals cobrem escalação de privilégio.
