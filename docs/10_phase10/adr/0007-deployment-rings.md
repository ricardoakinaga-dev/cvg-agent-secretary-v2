# ADR 0007 — Estratégia de implantação e rings

- Status: aceito (Phase 10)
- Contexto: o sistema é um monólito modular com worker e API; não há
  justificativa para microservices, Kafka ou Kubernetes neste estágio.
- Decisão: manter o monólito modular e adotar rings de promoção
  `DEV → SIMULATION → INTERNAL → SUPERVISED_CANARY → LIMITED_PRODUCTION →
PRODUCTION`. Agentes só avançam com evals sem regressão de segurança, P0/P1 = 0
  e signoff humano. Shadow mode precede qualquer efeito real. Rollback cobre
  aplicação, agente, prompt, policy e perfil de modelo.
- Consequências: complexidade distribuída adiada até haver volume/evidência;
  promoção é um gate de evidência, não uma decisão de texto.
