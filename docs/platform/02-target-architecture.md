# Target architecture — CVG Agent Platform

## Princípio de separação

O sistema tem dois planos:

```text
Control Plane (configuração, versões, testes, publicação, auditoria)
        │ resolve tenant + agent + immutable version
        ▼
Kernel / Runtime (inbound → context → policy → knowledge → model → tools → response/handoff)
        │ adapters compatíveis
        ▼
Data Plane Secretary (conversation/session/message/task/approval/audit)
```

O Control Plane não reescreve nem quebra os contratos do data plane atual. A integração inicial é por um resolver opcional: se não existir configuração de plataforma, a Secretary continua no caminho legado controlado; se existir, a versão publicada é usada somente no runtime explicitamente habilitado.

## Domínios do Control Plane

Todos os objetos novos têm `tenantId`, `id`, timestamps e referência de auditoria. Nenhuma API aceita omitir tenant.

| Domínio    | Entidades mínimas                                 | Invariante                                 |
| ---------- | ------------------------------------------------- | ------------------------------------------ |
| agents     | `Agent`, `AgentVersion`                           | versão publicada é snapshot imutável       |
| prompts    | `PromptBlock`, composição                         | ordem determinística; sem segredo/PII      |
| models     | `ModelProvider`, `ModelConfig`                    | apenas `secretRef`, nunca secret value     |
| policies   | `PolicyBundle`                                    | hard safety sempre vence                   |
| plugins    | `PluginManifest`, `PluginBinding`                 | gateway deny-by-default                    |
| knowledge  | `KnowledgeSource`, `KnowledgeBinding`             | source precisa ser approved para responder |
| handoff    | `HandoffDestination`, `HandoffRule`               | low confidence e risco têm handoff/clarify |
| lab        | `TestCase`, `TestRun`, `Trace`                    | dry-run não dispara canal/tool real        |
| governance | `PublishRecord`, `ConfigAuditEvent`, feature flag | rollback cria nova versão                  |

## Kernel runtime

O kernel recebe `RuntimeInput` com `tenantId`, `agentId`, `versionId` opcional, mensagem fictícia/normalizada e contexto mínimo. O pipeline é:

1. resolver versão publicada do tenant/agent;
2. compor prompt blocks e response templates;
3. classificar intenção e confiança de forma determinística no provider fake;
4. avaliar hard safety, policy organizacional e comportamento do agente;
5. consultar knowledge somente por binding aprovado;
6. planejar tools pelo `CapabilityGateway`;
7. decidir resposta, `clarify`, `handoff` ou ferramenta em draft;
8. produzir `Trace` sem payload sensível e com correlation id;
9. persistir apenas efeitos permitidos no ambiente controlado.

O primeiro slice executa o pipeline em dry-run. O caminho real da Secretary só é adaptado após os contratos serem verificados.

## Política em camadas

```text
Hard safety (código, não sobrescrevível)
        ↓
Org policy (versão publicada, fail-closed)
        ↓
Agent behavior (persona/thresholds/response)
```

Uma camada inferior nunca libera algo bloqueado por uma superior. Falha de resolução, provider, knowledge ou tool é `blocked`, `handoff` ou `clarify`, conforme o caso, e sempre aparece no trace.

## Plugin e capability gateway

Um plugin declara nome, versão, capabilities, dependências, config schema, permissões, ferramentas, hooks e risco. O gateway verifica, nesta ordem:

1. tenant e agent binding;
2. feature flag/lifecycle/health;
3. role e permission;
4. policy da ação e risk;
5. confirmação/approval quando necessário;
6. rate limit/idempotency/ownership;
7. audit event sanitizado;
8. execução somente no adapter permitido.

O manifest é metadata; não é autorização. A autorização vive no gateway.

## Handoff e takeover

Estados canônicos:

`BOT_ACTIVE → HANDOFF_REQUESTED → WAITING_HUMAN → HUMAN_ACTIVE → RETURN_REQUESTED → CLOSED`.

Enquanto `HUMAN_ACTIVE`, o kernel não emite mensagem automática. O retorno ao bot exige evento explícito e uma nova decisão de policy. O primeiro slice mantém o destino fictício e não despacha para canal externo.

## Persistência e compatibilidade

- migration nova é aditiva e não altera tabelas legadas;
- Postgres e in-memory implementam a mesma porta;
- queries recebem tenant como primeiro filtro lógico;
- `published` não é atualizado in-place: publicação/rollback grava novo snapshot;
- secrets permanecem em environment/secret manager externo, referenciados por `secretRef`;
- bootstrap cria apenas agentes/templates fictícios controlados.

## Limite explícito de produção

Este desenho prepara o artefato para revisão de release candidate. Não autoriza canais, RAG, agenda, cobrança, prontuário ou provider real. A decisão de readiness é separada em código, ambiente, operação e segurança, como exigido pelo boundary em `docs/08_runtime/release_candidate_boundary.json`.
