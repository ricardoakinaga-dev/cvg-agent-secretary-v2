# 0495 — PLAT-S04 durable approval, legacy gateway and webhook security evidence

## Escopo e decisão

Esta evidência fecha a construção controlada de `PLAT-S04-001` e do hardening associado de webhook. O slice usa somente fixtures fictícias, PostgreSQL efêmero e o gateway controlado; não habilita provider, canal, agenda real, RAG, dados reais ou side effects.

Veredito máximo autorizado: `CONTROLLED_MVP_READY`. `PRODUCTION_REAL_DATA_READY` continua bloqueado.

## Entregas verificadas

- `CapabilityApprovalAuthority` vincula tenant, agent, version, tool, hash canônico do input, actor, nonce, issuer e expiry; consumo é single-use, fail-closed e revogável.
- `0002_capability_approvals.sql` persiste a autoridade com `FORCE ROW LEVEL SECURITY`, FK composta, nonce único, estados terminais e trigger que mantém o binding imutável e rejeita expiração antes de `expires_at`.
- `PostgresCapabilityApprovalRepository` aceita somente conexão PostgreSQL transacional checked-out; o `BEGIN`/`SELECT FOR UPDATE`/`UPDATE`/`COMMIT` não pode ser dividido por um `pg.Pool` genérico.
- `TenantScopedPostgresCapabilityApprovalRepository` cria o contexto tenant na conexão dedicada e é conectado automaticamente ao gateway controlado quando o runtime usa `postgres-pool`.
- `ToolRegistry` legado é acessado pelo adapter allowlist-only para `find_available_slots`; `dryRun` é obrigatório e ferramentas de confirmação, cancelamento, reagendamento ou provider real permanecem bloqueadas.
- `HmacWebhookVerifier` valida HMAC-SHA256 em payload canônico, timestamp dentro da janela, event id, rotação de segredo e claim single-use via `WebhookReplayStore`; a store em memória existe somente para fixtures e a interface permite implementação distribuída aprovada.

## Gates executáveis

| Gate             | Evidência                                                                                | Resultado                    |
| ---------------- | ---------------------------------------------------------------------------------------- | ---------------------------- |
| `npm run verify` | format, typecheck, lint, build, 62 arquivos, 225 testes, 14 skips, coverage e audit      | PASS                         |
| Cobertura        | 85,58% statements; 80,17% branches; 86,66% functions; 86,48% lines                       | PASS                         |
| PostgreSQL real  | `TEST_DATABASE_URL=postgres://...@127.0.0.1:55437/cvg_his_v2_test npm run test:postgres` | PASS — 6 arquivos, 63 testes |
| Readiness        | `npm run readiness`                                                                      | PASS — 4 testes              |
| Browser E2E      | `npm run test:e2e`                                                                       | PASS — 1 fluxo               |
| Dependências     | `npm audit --audit-level=high`                                                           | PASS — 0 vulnerabilidades    |

Os testes PostgreSQL cobrem consumo concorrente exatamente uma vez, RLS de approvals, substituição de input, cross-tenant, expiry, revocation, nonce duplicado, conexão checked-out e trigger de expiração antecipada. O teste HTTP cobre assinatura válida e replay rejeitado; a store PostgreSQL real também cobre purge, concorrência de reserva, commit/release e recuperação de lease reservado stale.

## Revisão independente e correções

A primeira crítica independente encontrou P1 na atomicidade quando um pool genérico poderia ser aceito e P1 porque a autoridade durável ainda não estava ligada ao runtime. Encontrou também P2 no escopo implícito de `get/revoke` e no trigger que aceitava expiração antecipada. As correções foram implementadas, cobertas por testes e repetidas no PostgreSQL real: conexão transacional tipada, wrapper tenant-scoped, gateway padrão durável em `postgres-pool`, tenant explícito com falha fechada e guarda temporal no trigger.

## Limites de release

- A store em memória é somente fixture; a implementação PostgreSQL controlada é compartilhável e tem purge/lease recovery, mas produção ainda exige HA, métricas, retenção e política operacional aprovados.
- O issuer/verifier durável está disponível no runtime controlado, mas IdP, identidade operacional do aprovador, rotação de secrets e auditoria externa de side effects ainda exigem infraestrutura e decisão humana.
- O helper de assinatura mantém payload canônico para fixtures, enquanto o verifier HTTP usa raw body; integração real deve definir contrato de bytes, segredo por provider, rotação, replay distribuído e observabilidade.
- Nenhuma ferramenta de agenda real foi habilitada. O adapter não confirma, cancela ou reagenda consultas.
- IdP/tenant binding real, backfill/rollout RLS, limiter distribuído, CSRF/CORS/HTTPS/CSP do host, retenção/PII, conflitos multioperador, RAG e canais/providers reais continuam bloqueados.

## Addendum — fechamento técnico pós-revisão

Data da última rodada: `2026-08-24`.

- Inbound idempotente agora distingue `pending` de `completed`. Uma entrega duplicada cujo runtime falhou antes do commit pode ser reprocessada; a finalização PostgreSQL trava a mensagem, grava outbound/tool audit/trace/integration audit e marca o inbound como completed na mesma transação.
- A assinatura HTTP usa o corpo JSON bruto recebido pelo parser, preservando ordem, espaçamento e escapes do provider; a store PostgreSQL remove replay expirado oportunisticamente antes da reserva, possui índice de retenção e recupera uma reserva `reserved` stale após lease de 30 segundos, sem encurtar a retenção de eventos commitados.
- O bootstrap PostgreSQL de produção exige `INBOUND_TENANT_ID` e `INBOUND_AGENT_ID` validados, ou resolvers/runtime confiáveis injetados; também rejeita startup sem `operatorIdentityResolver`. Os valores fixos são um bootstrap controlado de tenant/agente únicos; roteamento multi-tenant e identidade operacional reais exigem IdP/provisionamento aprovados.
- Aprovação não pode ser emitida para o próprio issuer; `approval:execute` é separado de `approval:decide`. O consumo durable registra `approval_decision` sanitizado na mesma transação do `issued → consumed`, antes do commit.
- O preflight agora fecha se faltar coluna, constraint, índice, grant DML ou tabela/base de replay; o baseline legado também valida colunas e índices do `0000_initial` antes de aceitar checksum.

Gates finais reproduzidos após o addendum:

| Gate                                                                                                          | Resultado                                                                 |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `npm test`                                                                                                    | PASS — 62 arquivos, 225 testes, 14 skips condicionais                     |
| `npm run test:coverage`                                                                                       | PASS — 85,58% statements; 80,17% branches; 86,66% functions; 86,48% lines |
| PostgreSQL fixture — `TEST_DATABASE_URL=postgres://...@127.0.0.1:55437/cvg_his_v2_test npm run test:postgres` | PASS — 6 arquivos, 63 testes                                              |
| `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`                                  | PASS                                                                      |
| `npm run audit:security`                                                                                      | PASS — 0 vulnerabilidades                                                 |
| `npm run readiness`                                                                                           | PASS — 4 testes                                                           |
| `npm run test:e2e`                                                                                            | PASS — 1 fluxo Playwright                                                 |

O resultado permanece `CONTROLLED_MVP_READY`; nada nesta evidência autoriza dados reais, agenda real, canal/provider real ou produção irrestrita. O caminho de produção fecha o startup até receber IdP/operator resolver, secrets/roles, replay e rate limiting operacionais e change control de dados.
