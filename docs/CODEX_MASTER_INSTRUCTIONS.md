# CVG Agent Platform --- Codex Master Instructions

> **INSTRUÇÃO PERSISTENTE:** o Codex deve ler este arquivo integralmente
> no início de TODA nova sessão neste repositório, antes de planejar,
> modificar código ou tomar decisões arquiteturais.

## Missão

Evoluir `cvg-agent-secretary` para **CVG Agent Platform**: plataforma
modular, configurável, segura, versionada e observável para construir e
operar múltiplos agentes. A Secretária CVG atual permanece como primeiro
agente/preset. **Não reescreva do zero.**

```text
AGENT = MODEL + KERNEL + PROMPT + POLICIES + PLUGINS + KNOWLEDGE + CONFIGURATION
```

A meta é a Secretária deixar de ser "um bot codificado" e se tornar uma
configuração executada por um kernel genérico.

## Protocolo obrigatório ao iniciar/reiniciar

1.  Leia este arquivo completamente.
2.  Inspecione `git status`, branch, commits recentes e alterações
    pendentes.
3.  Leia `docs/platform/05-progress.md`, `03-implementation-roadmap.md`
    e `04-backlog.md`, se existirem.
4.  Consulte ADRs e docs autoritativos da área atual.
5.  Inspecione código e testes antes de confiar em documentação
    histórica.
6.  Identifique o último checkpoint validado e continue dele; não
    reinicie Discovery sem necessidade.
7.  Rode a menor suíte relevante antes de modificar área cujo estado
    esteja incerto.
8.  Ao terminar, atualize `docs/platform/05-progress.md` com estado real
    e próximo passo exato.

Prioridade:
`código + testes atuais > docs autoritativos atuais > auditorias históricas`.

## Preserve o que já é maduro

Preserve/adapte runtime, Chatwoot/webhooks/worker, tool calling,
scheduling, handoff, human takeover, RAG/Qdrant, memória, PostgreSQL,
Redis, multi-tenancy/RLS, JWT/RBAC, PII encryption/privacy lifecycle,
audit, analytics, observabilidade, resiliência, deduplicação,
migrations, CI/CD e suites de safety/reliability.

Prefira `extract → isolate → generalize → wrap → refactor → migrate`,
nunca rewrite destrutivo.

## Arquitetura alvo

Separar **Data Plane, Control Plane, Plugin Plane e Security Plane**.

Data Plane:

```text
Message Intake → Normalize → Context → Input Security/Policy → Agent Resolution
→ Intent/Route → Knowledge → Prompt → Model → Tools/Plugins
→ Output Policy → Response/Handoff → Delivery
```

Control Plane deve administrar Agents/AgentVersions, prompts/versions,
policies/versions, plugins/config, providers/models, handoff, response
templates, knowledge bindings, testes/evals, publishing/rollback,
feature flags e histórico. `.env` fica para
infraestrutura/bootstrap/secrets, não comportamento cotidiano.

Security Plane mantém controles não contornáveis: auth, tenant
isolation, RLS, PII, encryption, tool ownership, confirmation gates,
audit integrity, webhook security, veterinary safety e plugin
permissions.

## Agent Kernel

Evolua o runtime para um Kernel agnóstico, trabalhando com `Agent`,
`AgentVersion`, `Message`, `Conversation`, `Context`, `Policy`,
`Plugin`, `Tool`, `Provider`, `Knowledge`, `Action`, `Response`,
`Handoff`, `Trace` e `Event`.

Remova do kernel, quando apropriado, hardcodes de Luna/Secretária/CVG,
mensagens, thresholds, labels, destinos, routing e modelo. Analise
especialmente `src/modules/runtime/agentRuntime.ts`; decomponha
responsabilidades somente quando houver ganho real.

## Event/Hook System

Suporte eventos como `message.received`, `context.loaded`,
`agent.resolved`, `policy.before/after`, `intent.before/after`,
`knowledge.before/after`, `prompt.before/after`,
`model.before/after/error`, `tool.before/after/error`,
`response.before/after`, `handoff.requested/created/failed`,
`human_takeover.started/ended`, `delivery.before/after`,
`security.blocked` e `plugin.started/stopped/error`. Plugins só assinam
hooks autorizados.

## Plugin System

Plugin declara id, nome, versão, capabilities, dependencies, config
schema, permissions, tools, hooks, lifecycle, health e risk.
Capabilities exemplificativas: `conversation.read/write`,
`contact.read.basic/pii`, `knowledge.search`, `scheduling.read/write`,
`handoff.create`, `chatwoot.message.send`, `external.http`.

Nenhum plugin ignora tenant isolation, RBAC, Policy Engine, schema
validation, ownership, confirmation, audit, rate limits ou PII. Toda
tool passa por execution gateway comum.

Adapte primeiro por wrappers/adapters: knowledge, scheduling, handoff,
memory, chatwoot e analytics. Não construir marketplace público nesta
fase.

## Dynamic Tool Registry

Tools devem vir dos plugins habilitados no AgentVersion. `Scheduling ON`
disponibiliza scheduling tools; `OFF` remove-as sem alterar código da
Secretária. Preserve schemas, ownership e autorização explícita para
side effects.

## Model Providers

Generalize OpenAI/OpenRouter atrás de `ModelProvider`, preparando
arquitetura para Anthropic, Google, Ollama, vLLM e OpenAI-compatible.
AgentVersion configura
provider/model/temperature/tokens/timeout/retries/fallback/tool support.
Secrets são referências seguras, nunca plaintext na UI.

## Prompt Management

Separar blocos versionáveis: identity, persona, role,
organization_context, behavior, style, business_rules, safety,
handoff_behavior, tool_usage, knowledge_usage, examples e
prohibited_behaviors.

Lifecycle: `DRAFT → TESTING → APPROVED → PUBLISHED → ARCHIVED`.
Publicado é imutável; permitir rollback. Precedência: Kernel Safety →
Organization Policy → Agent Policy → Identity/Persona → Workflow →
Knowledge → Conversation → User.

## Response Templates e hardcodes

Audite greeting, low-confidence, no-knowledge, handoff, emergency,
scheduling-without-evidence, security-block, system-error e
human-takeover. Classifique cada hardcode como `MUST_STAY_IN_CODE`,
`CONFIGURABLE_POLICY`, `CONFIGURABLE_TEMPLATE`,
`CONFIGURABLE_AGENT_SETTING`, `INFRA_ENV` ou `SECRET`.

## Policy Engine

Criar engine central para
input/output/tool/handoff/security/knowledge/model/workflow policies.
Três níveis: **Kernel Safety** não desativável; **Organization Policy**
restrita; **Agent Behavior** configurável dentro de limites seguros.

Low-confidence deve permitir `clarify_threshold`, `handoff_threshold` e
`max_clarification_attempts` configuráveis com limites seguros, em vez
de uma regra universal rígida.

## Veterinary Safety

A Secretária não diagnostica, prescreve, sugere dose/tratamento, garante
prognóstico, interpreta exame clinicamente ou minimiza emergência.
Preserve guardrails determinísticos e amplie testes adversariais.
Arquitetura:
`deterministic checks + policy engine + contextual safety + output validation`.

## Handoff e Human Takeover

Preserve o motor atual, mas separe detection, decision, message,
destination, execution, lock/state, analytics e audit. Crie
HandoffDestination configurável
(team/assignee/labels/fallback/timeout/status) e Handoff Studio para
regras, prioridade, mensagens, escalation, auto-return, working hours
etc.

Diferencie handoff de takeover. State machine conceitual:
`BOT_ACTIVE → HANDOFF_REQUESTED → WAITING_HUMAN → HUMAN_ACTIVE → RETURN_REQUESTED → BOT_ACTIVE`.
Com humano ativo, bot fica silencioso. Impedir respostas paralelas.

## Agent e AgentVersion

Agent = identidade lógica tenant-aware. AgentVersion = configuração
executável publicada e imutável, vinculando model config, prompt
profile, policies, plugins, knowledge, behavior, handoff e feature
flags. Publicação atômica; execução usa mesma versão do início ao fim.
Documente version pinning por conversa. Bootstrap inicial deve preservar
comportamento atual.

## Control Center Web

Painel operacional real: Dashboard, Agents, Plugins, Prompts, Policies,
Handoff, Knowledge, Models, Test Lab, Conversations, Analytics,
Security, Audit, Settings. Agent Builder: Identity, Model, Behavior,
Prompt, Plugins, Knowledge, Policies, Handoff, Safety, Test, Version
History, Publish/Rollback. Chatwoot continua interface humana; Control
Center governa inteligência.

## Test Lab e Trace

Test Lab executa pipeline real sem side effects/canais reais. Mostrar
agent/version, input/context, intent/confidence/risk, policies,
knowledge, provider/model, prompt version, tools/resultados, handoff,
resposta, latência, tokens e trace. Side effects usam
mock/read-only/dry-run.

AgentExecutionTrace deve conter spans
normalize/context/intent/policy/knowledge/prompt/model/tool/response/handoff/delivery
e responder "por que o agente respondeu assim?". Aplicar
redaction/minimização; nunca registrar secrets/PII desnecessária.

## Test Cases, Regression e A/B

Persistir casos/suites Safety, Handoff, Scheduling, Knowledge, Tone,
Regression, Clinical e Security. Antes de publicar: executar suites,
comparar baseline, mostrar regressões e aplicar gates. Suportar A/B de
AgentVersion por resposta, handoff, knowledge, tools, policies,
confidence, latency, tokens/custo.

## Publishing, Rollback, Feature Flags e Shadow Mode

Fluxo `Draft → Test → Approve → Publish`. Nunca sobrescrever versão
publicada. Rollback auditado. Feature flags para migração. Considere
shadow mode em que novo engine executa mas não envia nem realiza side
effects.

## Knowledge

Preserve RAG e generalize
KnowledgeProvider/Source/Collection/Document/Version/Binding. Cada
agente define fontes permitidas. Retrieval sempre aplica tenant, role,
agent e source permissions. Evitar vazamento de conhecimento interno.

## Tool Security, Audit e Multi-tenancy

Toda tool exige schema validation, permission, tenant, ownership,
confirmation quando aplicável, timeout, audit e error handling. Pedido
do LLM nunca é autorização suficiente.

Audite mudanças de Agent, Prompt, Policy, Plugin, Handoff, Model,
Security, Publish e Rollback. Todos os novos objetos devem ser
tenant-aware quando aplicável. Use migrations existentes; nunca alterar
schema manualmente fora delas.

## Admin API e RBAC

APIs administrativas devem usar JWT/RBAC verificados. Permissões
granulares como `agent.read/write/publish`, `prompt.read/write/publish`,
`policy.read/write`, `plugin.manage`, `test.run`, `audit.read`,
`security.read/manage`. Nunca confiar em identidade/role autodeclarada
pelo cliente.

## Observability, performance e CI

Adicionar métricas de agent/model/tool/handoff/plugin/policy/test.
Analytics: AI resolution, handoff rate/reasons/destinations, knowledge
hit, fallback, latency, provider/model, tokens/custo, tool success e
safety blocks.

Cachear configurações publicadas imutáveis com keys tenant-aware e
invalidar no publish. Nunca trocar AgentVersion no meio da execução.

Não reduzir cobertura/gates. Testar agent resolution, versioning, prompt
composition, policy evaluation, plugin permissions, dynamic tools,
handoff, takeover, admin auth, rollback e Test Lab.

## Fases obrigatórias

1.  Discovery atual.
2.  Gap Analysis.
3.  Target Architecture.
4.  Hardcode/config audit.
5.  Configuration Plane.
6.  Agent + AgentVersion.
7.  Prompt/template versioning.
8.  Policy Engine foundation.
9.  Secretary bootstrap/backward compatibility.
10. Plugin contracts/adapters.
11. Dynamic Tool Registry.
12. Configurable Handoff.
13. Human Takeover state machine.
14. Admin API.
15. Control Center UI.
16. Test Lab.
17. Tracing.
18. Evaluation/publish/rollback.
19. Event/hook completion.
20. Production hardening/shadow rollout.

Ajuste ordem somente por dependências reais e documente a razão.

## Documentação persistente obrigatória

Manter `docs/platform/` com: `00-current-state-discovery.md`,
`01-gap-analysis.md`, `02-target-architecture.md`,
`03-implementation-roadmap.md`, `04-backlog.md`, `05-progress.md`,
`architecture-overview.md`, `agent-kernel.md`, `control-plane.md`,
`plugin-system.md`, `plugin-authoring.md`, `policy-engine.md`,
`prompt-management.md`, `agent-versioning.md`, `handoff-engine.md`,
`human-takeover.md`, `test-lab.md`, `security-model.md`,
`migration-guide.md`, `operations-runbook.md` e
`final-technical-audit.md`. Criar ADRs para decisões relevantes. Docs
devem refletir código real.

### `05-progress.md` é a memória operacional entre sessões

Atualize ao final de cada sessão com: milestone atual, última tarefa
concluída, implementação atual, arquivos principais alterados,
migrations, testes executados/resultados, decisões/ADRs,
riscos/bloqueios, itens incompletos e **próximo passo exato**. Na sessão
seguinte, leia-o antes de agir.

## Critérios de aceitação finais

A plataforma só atingiu o objetivo quando um administrador autorizado
puder, pela UI e sem editar TypeScript: configurar
persona/tom/greeting/templates; selecionar modelo; habilitar/desabilitar
plugins; vincular knowledge; ajustar handoff e thresholds dentro de
limites; executar Test Lab; inspecionar trace; publicar nova
AgentVersion; comparar versões; e fazer rollback.

Deve ser possível criar Agent A e Agent B com
prompt/model/plugins/policies diferentes usando o mesmo Kernel. O
Secretary atual deve continuar operacional durante a migração.

## Modo de trabalho

Antes de implementar, faça Discovery, Gap Analysis, Target Architecture,
Roadmap e Backlog, mas **não pare na documentação**. Implemente
progressivamente, teste continuamente e atualize a documentação conforme
o código muda. Use commits pequenos e coerentes. Não faça big-bang
rewrite/PR. Use legacy adapters quando reduzirem risco e documente
depreciação.

Evite fake abstractions, módulos placeholder, UI sem backend, settings
que não alteram runtime, plugins fictícios, testes que mockam tudo ou
"conclusões" sem evidência.

## Final audit / Go-No-Go

Ao final, produza auditoria técnica cobrindo Architecture, Security,
Configurability, Plugins, Agent Isolation, Testing, Handoff, Takeover,
Observability, Performance, Migration e Production Readiness. Separe
`code readiness`, `environment readiness`, `operational readiness` e
`security/privacy readiness`. Não declare GO sem evidências reais.

## Definição final de sucesso

O objetivo não é "melhorar um bot". É transformar o repositório em uma
plataforma em que:

```text
CVG Agent Platform
├── Agent Kernel
├── Control Plane
├── Plugin Runtime
├── Policy Engine
├── Prompt System
├── Test Lab
└── Observability
    ├── Secretary Agent
    ├── Scheduling Agent
    ├── Follow-up Agent
    ├── Diagnostics Agent
    └── futuros agentes
```

Ao reiniciar qualquer sessão, **leia este arquivo +
`docs/platform/05-progress.md` e continue exatamente do último
checkpoint validado**.
