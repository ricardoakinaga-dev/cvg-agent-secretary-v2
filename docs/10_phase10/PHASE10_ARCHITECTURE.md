# PHASE 10 — ARQUITETURA

## Princípio central

> Model output is untrusted input.

O LLM interpreta, classifica, recomenda, preenche estruturas e propõe ações.
Somente mecanismos determinísticos autorizam e executam efeitos externos.

```
User / Channel
  -> channel-gateway (envelope canônico, dedupe, interlock)
  -> agent-runtime (governed turn, loop limits, tracing)
  -> policy-engine (capability/role/policy -> ALLOW|DENY|REQUIRE_APPROVAL)
  -> approval-engine (binding SHA-256, single-use, expiração)
  -> model-gateway (deadline, retry, breaker, budget, structured output)
  -> structured output (Zod, fail closed)
  -> tool executor (schemas, risco, approval)
  -> outbox (efeito exactly-once por journal idempotente)
  -> audit ledger (cadeia hash append-only) + telemetria OTel
```

## Pacotes novos

| Pacote                 | Responsabilidade                                                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `@cvg/model-gateway`   | Providers provider-agnostic, perfis de modelo, timeout real, retry classificado, circuit breaker, budgets, prompt registry, structured output |
| `@cvg/policy-engine`   | Catálogo de capabilities com risco, grants por perfil de agente, teto por role de operador, documentos de policy versionados, deny-by-default |
| `@cvg/approval-engine` | Máquina de estados REQUESTED→PENDING→APPROVED→EXECUTED, binding criptográfico, single-use, expiração, CAS                                     |
| `@cvg/channel-gateway` | Envelope canônico, `InboundChannelAdapter`/`OutboundChannelAdapter`, dedupe com TTL, journal outbound, adapters Evolution/Chatwoot opt-in     |
| `@cvg/observability`   | Adapter OTel real, trace context W3C, redaction centralizada, métricas allowlisted, audit ledger encadeado por hash                           |
| `@cvg/agent-runtime`   | Pipeline governada fim-a-fim com loop limits, shadow mode e auditoria por fase                                                                |
| `@cvg/agent-evals`     | Dataset 56 cenários (18 categorias, 14 adversariais), métricas de segurança e regression gate                                                 |
| `@cvg/chaos`           | Primitivas de fault injection e 16 cenários de resiliência                                                                                    |

## Providers de modelo

- `DeterministicModelProvider` (default em testes/evals): sem rede, `externalCall: false`.
- `OpenAICompatibleProvider`: OpenAI/vLLM/llama.cpp server; API key obrigatória para externo; host pinado.
- `OllamaProvider`: local, loopback por padrão, sem exposição pública.
- Routing por perfil (`fast`, `balanced`, `reasoning`, `local`, `critical-review`) com regra tarefa→perfil.
- Policy de dados: `EXTERNAL_MODEL_ALLOWED`, `LOCAL_ONLY`, `NO_MODEL` por classificação.
- Fallback apenas com opt-in; nunca de local para externo.

## Política e capabilities

- Perfis: `secretary`, `hospitalization`, `clinical`, `financial`, `admin`.
- Secretária: `schedule.read`, `appointment.create/modify/cancel(approval)`,
  `conversation.read`, `message.draft/send`, `patient.summary.read` limitado.
- Sem `patient.record.write`, `clinical.*`, `exam.release`, `finance.write`, `admin.*`.
- Documentos de policy só restringem; nunca expandem grants.
- Contexto incompleto, tenant ausente ou mismatch de recurso: DENY.

## Approvals

- `payload_hash = SHA256(canonical_json({action, resource, payload}))`.
- Consumo revalida tenant, ação, recurso e hash; divergência falha fechada.
- Single-use com compare-and-set; corrida concorrente tem exatamente um vencedor.
- Expiração verificada no consumo e por varredura idempotente (`expireStale`).

## Observabilidade

- Trace context com `traceId`, `spanId`, `correlationId`, `tenantId`, `conversationId`,
  `sessionId`, `agentId`, `agentVersion`; spans de política, modelo, tool e outbox.
- Métricas sem labels de alta cardinalidade (`METRIC_ATTRIBUTE_ALLOWLIST`).
- Logs estruturados com redaction profunda (segredos, CPF/CNPJ, telefone, endereço).
- Audit ledger: `eventHash = SHA256(canonical({previousHash, payloadHash, metadados}))`;
  `verify()` detecta adulteração de payload, metadados ou encadeamento.

## Promoção e canary

Rings: `DEV → SIMULATION → INTERNAL → SUPERVISED_CANARY → LIMITED_PRODUCTION → PRODUCTION`.
Shadow mode (`shadowMode: true`) produz decisão e mensagem sem tool/outbox.
Piloto supervisionado restrito: confirmações de agenda → agendamentos simples →
remarcações. Promoção exige evals sem regressão de segurança, P0/P1 = 0 e signoff
humano — nenhum artefato deste repositório substitui essa decisão.

## Decisões arquiteturais

Ver `docs/10_phase10/adr/`. Nenhuma infraestrutura distribuída nova (Kafka,
Redis, Kubernetes) foi introduzida: o monólito modular e o outbox PostgreSQL
continuam adequados ao volume e ao estágio atual.
