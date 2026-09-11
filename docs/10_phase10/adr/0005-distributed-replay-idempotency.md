# ADR 0005 — Replay/idempotência distribuída

- Status: aceito (Phase 10)
- Contexto: replay store em memória não protege múltiplas instâncias; a API já
  possui store PostgreSQL race-safe para webhooks.
- Decisão: manter store em memória para testes e expor contrato atômico
  `insert-if-absent with expiration`; o gateway de canal usa dedupe com TTL e o
  outbox usa journal de efeitos por idempotency key. Produção continua no store
  PostgreSQL existente. Redis/Valkey fica como opção futura justificada apenas
  por necessidade de escala.
- Consequências: at-least-once no transporte + effectively-once nos efeitos;
  TTL impede crescimento infinito; nenhuma infraestrutura nova foi introduzida.
