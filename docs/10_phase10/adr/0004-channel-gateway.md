# ADR 0004 — Channel Gateway e envelope canônico

- Status: aceito (Phase 10)
- Contexto: integrações de canal precisam ser trocáveis e auditáveis, sem
  espalhar SDKs Evolution/Chatwoot pelo domínio.
- Decisão: `@cvg/channel-gateway` com `InboundChannelAdapter`/
  `OutboundChannelAdapter`, envelope canônico, dedupe com TTL, journal
  idempotente de efeitos outbound e interlock de human takeover. Adapters reais
  são desabilitados por padrão e fail-closed sem configuração completa.
- Consequências: webhooks válidos são canonicalizados uma única vez; duplicatas
  e replays não geram efeitos; validação real fica para homologação.
