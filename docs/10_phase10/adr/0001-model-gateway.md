# ADR 0001 — Model Gateway provider-agnostic

- Status: aceito (Phase 10)
- Contexto: o adapter determinístico existente não suporta múltiplos providers
  nem isola o domínio de SDKs externos.
- Decisão: criar `@cvg/model-gateway` com interface `ModelProvider` e catálogo
  de perfis. Providers: determinado, OpenAI-compatible (OpenAI/vLLM/llama.cpp)
  e Ollama. Toda chamada passa pelo gateway, com deadline, retry classificado,
  breaker, budget, structured output e prompt registry.
- Consequências: domínio permanece agnóstico; providers externos exigem opt-in e
  validação real (backlog P10-B05); testes usam o provider determinístico.
