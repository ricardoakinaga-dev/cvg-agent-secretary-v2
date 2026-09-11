# PHASE 10 — SECURITY REVIEW

## Resultado

| Severidade | Quantidade                         |
| ---------- | ---------------------------------- |
| P0         | 0                                  |
| P1         | 0                                  |
| P2         | 5 (aceitos, com owner e mitigação) |

## Controles novos verificados

| Controle                                    | Evidência                                                           |
| ------------------------------------------- | ------------------------------------------------------------------- |
| Deny-by-default por capability              | `packages/policy-engine` (14+ testes; expansão de policy bloqueada) |
| Aprovação vinculada a payload imutável      | `computeApprovalPayloadHash`, testes de mutação/ação divergente     |
| Single-use e corrida de consumo             | `verifyAndConsume` CAS, teste de corrida com 1 vencedor             |
| Expiração fail-closed                       | teste de deadline e varredura idempotente                           |
| Timeout real de provider                    | `AbortController`, CHAOS-06 e teste de deadline                     |
| Retry apenas em erros retryable             | 429/503/timeout; sem retry para 401/403/schema                      |
| Circuit breaker por provider/model          | testes CLOSED→OPEN→HALF_OPEN→CLOSED                                 |
| Budget por request/session/tenant/agent/dia | `BudgetGuard` + teste de recusa e settlement                        |
| Structured output fail-closed               | Zod + `schema_invalid` sem retry e sem tool                         |
| Prompt versionado com hash                  | `PromptRegistry`, revogado/expirado/hash divergente falham          |
| SSRF em URLs de provider/canal              | `packages/shared/ssrf.ts` (IP privado, allowlist, credenciais)      |
| Redaction de logs/telemetria                | teste com senha/token/CPF/telefone/endereço                         |
| Métricas sem alta cardinalidade             | allowlist rejeita correlationId/tenantId como label                 |
| Interlock de human takeover                 | runtime e channel-gateway bloqueiam outbound                        |
| Audit ledger à prova de adulteração         | `verify()` detecta payload/evento/encadeamento alterados            |
| Webhook nunca chega ao domínio se inválido  | HMAC + replay store já existentes preservados                       |

## Testes negativos e validação por mutação

- Assinatura inválida, timestamp expirado, replay e spoofing: cobertos pelas
  suítes existentes `webhook-security` e `http-security`.
- `certification/negative-validation.json` prova que o gate de certificação
  falha (exit 1) quando a evidência é adulterada ou quando a decisão é
  inflacionada; e volta a exit 0 quando restaurada.

## Achados abertos

P0 = 0, P1 = 0. P2 documentados em `certification/findings.json` com owner,
mitigação e aceite explícito. Nenhum P2 autoriza produção.

## Limites

- Providers/channels/IdP reais não foram exercitados (`NOT_VALIDATED`).
- A auditoria final independente é uma revisão do autor com validação
  mecânica; o gate humano permanece pendente por decisão.
