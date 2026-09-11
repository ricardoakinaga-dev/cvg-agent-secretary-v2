# PHASE 10 — RUNBOOKS OPERACIONAIS

Todos os procedimentos operam em modo controlado. Nenhuma ação de produção
(WhatsApp real, dado real, deploy, DNS, rotação de segredo) é autorizada por
este documento.

## Provider de modelo indisponível

1. Confirmar `model_calls_total{status="error"}` e transições de breaker.
2. Verificar se o erro é retryable (`provider_timeout`, `429`, `503`, conexão).
3. Se o breaker estiver `OPEN`, aguardar `openMs` ou reduzir tráfego.
4. Fallback somente se policy permitir e o alvo não for menos restritivo.
5. Sem provider: handoff humano; nunca descartar mensagem silenciosamente.

## Canal indisponível (CHAOS-16)

1. Confirmar `channel.outbound.rejected` e `send_failed`.
2. A mensagem permanece no outbox com idempotency key; retry não duplica efeito.
3. Se o adapter estiver disabled, reativar exige configuração completa opt-in.
4. Escalar para operação se a fila crescer além do budget de backpressure.

## PostgreSQL degradado

1. Verificar lags, conexões e locks; `/ready` deve retornar 503 quando
   dependências essenciais falharem.
2. Parar de aceitar novos trabalhos; deixar leases expirarem sem ack.
3. Reconectar: claims usam `FOR UPDATE SKIP LOCKED`; leases expirados são
   reassumidos (CHAOS-01/04/05).
4. Não marcar mensagens como processadas sem efeito confirmado.

## Alto volume de dead letters

1. Inspecionar `reason`, `attempt count` e `correlation id` (API de evidência).
2. Replay manual apenas com aprovação onde aplicável; registrar auditoria.
3. Se a causa for handler desconhecido, corrigir handler antes do replay.
4. Nunca editar payload de DLQ manualmente.

## Incidente de segurança

1. Isolar: desabilitar canal/provider via feature flag/ENV.
2. Preservar audit ledger e logs redigidos; não sobrescrever evidência.
3. Verificar replay attempts, tenant mismatch, approval forgery e assinaturas inválidas.
4. Suspeita de vazamento cross-tenant: congelar integrações, preservar trilha,
   acionar responsável de segurança e jurídico. Não prometer conformidade.

## Comprometimento de credencial

1. Rotacionar segredo com janela de graça (atual + anterior) e revogar o antigo.
2. Reprocessar apenas mensagens idempotentes; conferir journal de efeitos.
3. Registrar incidente e revisar escopos de capability/profiles.

## Release de agente ruim (rollback)

1. Reverter versão do agente para a última `APPROVED_FOR_PRODUCTION`.
2. Reverter prompt/policy para versões pinadas e verificadas por hash.
3. Sessões pinadas permanecem na versão original; novas sessões usam a revertida.
4. Rodar evals de segurança antes de reabilitar canário.

## Falha de restore

1. Validar digest do snapshot antes do restore (`digest mismatch` → abortar).
2. Restaurar em banco separado; verificar integridade referencial, cadeia de
   auditoria, estado do outbox e sessões.
3. Nunca restaurar snapshot não verificado sobre dados de produção.
