# SPEC — Control Plane Foundation e Test Lab dry-run

**Task registrada:** `PLAT-FOUNDATION-001..005`
**Gate:** `TECHNICALLY_SPECIFIED` / `IMPLEMENTATION_READY` para construção controlada
**Autorização:** pedido explícito do usuário, escopo sem dados/canais reais e regras de `docs/07_agents/AGENTS.md`.

## Contratos de domínio

### Identidade e tenant

```ts
type TenantId = string // tenant_<uuid>, obrigatório
type AgentId = string // agent_<uuid>
type AgentVersionId = string // agent_version_<uuid>

interface TenantScope {
  tenantId: TenantId
}
```

IDs são validados por Zod e nunca aceitam `..`, `/`, espaços ou string vazia. A implementação não confia em `tenantId` de payload para autorização: o contexto autenticado/operacional fornece o escopo; o body é comparado.

### Agent e AgentVersion

```ts
type AgentVersionStatus =
  | 'DRAFT'
  | 'TESTING'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'ARCHIVED'

interface Agent {
  tenantId: TenantId
  id: AgentId
  slug: string
  name: string
  description: string
  activeVersionId: AgentVersionId | null
  createdAt: Date
  updatedAt: Date
}

interface AgentVersion {
  tenantId: TenantId
  id: AgentVersionId
  agentId: AgentId
  version: number
  status: AgentVersionStatus
  config: AgentConfig
  createdBy: string
  createdAt: Date
  publishedAt: Date | null
}
```

`AgentVersion.config` é um snapshot profundo somente leitura na fronteira. `PUBLISHED` exige `APPROVED`; somente uma versão publicada pode ser `activeVersionId`. Alteração de config gera nova versão. Rollback é uma nova publicação com o snapshot escolhido, nunca update destrutivo.

### AgentConfig

```ts
interface AgentConfig {
  persona: { name: string; role: string; tone: string }
  greeting: string
  promptBlocks: PromptBlock[]
  responseTemplates: Record<string, string>
  model: {
    provider: string
    model: string
    temperature: number
    maxTokens: number
    timeoutMs: number
    retries: number
    fallbackProvider?: string
    secretRef?: string
  }
  policies: PolicyBundle
  plugins: PluginBinding[]
  knowledge: KnowledgeBinding[]
  handoff: HandoffConfig
}
```

`secretRef` aceita somente referência (`secret://...` ou nome aprovado), jamais valor que pareça token/key/password. O runtime não devolve secretRef em resposta/trace público.

Cada `KnowledgeBinding` declara `source`, `version`, `enabled` e `requiresApprovedSource`. O Test Lab só responde quando source e version recebidos pertencem ao binding habilitado do snapshot executado; caso contrário, faz handoff por fonte aprovada ausente.

### Runtime publicado, histórico e takeover

O inbound aceito pode continuar uma `conversationId` + `sessionId` existentes somente quando o par pertence ao tenant autenticado, mantém canal/remetente e a sessão não está fechada. A sessão persiste `takeoverState` (`BOT_ACTIVE`, `HANDOFF_REQUESTED`, `HUMAN_ACTIVE`, `RESOLVED`). Enquanto o estado não é `BOT_ACTIVE`, o runtime persiste a mensagem, não chama provider/tool e devolve `human_takeover_active`; a retomada exige `resolve_handoff` e `release_to_bot` explícitos por identidade com `conversation:assume`.

O runtime publicado registra traces redigidos e tenant-scoped no control plane. O Trace Viewer lê histórico de Test Lab e execution traces persistidos; a UI exibe modo, trace id e estados de ferramentas. O único plugin de scheduling neste slice é `scheduling.controlled`, com fixture determinística e sem disponibilidade ou ação de agenda real.

### Prompt blocks

Cada block tem `id`, `kind` (`system`, `persona`, `instruction`, `safety`, `context`, `response`), `content`, `priority`, `enabled`. Composição ordena `(priority, id)` e concatena uma vez. Conteúdo é validado contra chaves sensíveis e limites de tamanho. Hard safety não é prompt configurável.

### Policy bundle

```ts
interface PolicyBundle {
  version: string
  minConfidence: number
  lowConfidence: 'clarify' | 'handoff'
  maxClarifications: number
  enabledActions: string[]
  approvalActions: string[]
  blockedActions: string[]
}
```

O evaluator executa hard safety primeiro. Ações clínicas, financeiras, prontuário definitivo, cancelamento/confirmação real e provider/channel real continuam bloqueadas. A policy publicada só pode restringir mais, nunca liberar hard safety.

### Plugin manifest/gateway

```ts
interface PluginManifest {
  name: string
  version: string
  capabilities: string[]
  permissions: string[]
  tools: Array<{
    name: string
    risk: 'low' | 'medium' | 'high' | 'critical'
    requiresApproval: boolean
  }>
  hooks: string[]
  dependencies: string[]
  configSchemaVersion: string
}

interface PluginBinding {
  plugin: string
  enabled: boolean
  allowedTools: string[]
  config: Record<string, unknown>
}
```

O gateway recebe tenant, agent/version, actor, tool, input e context. Sem binding, capability, role, policy ou approval válido retorna `blocked`; handler não é chamado. Approval válido é uma decisão estruturada, tenant/agent/version/tool/actor-scoped, com expiração e verificação explícita; um booleano isolado não autoriza execução. Input/output são auditados em forma sanitizada e limitados. Primeiro slice usa somente handlers fake/local.

### Test Lab trace

```ts
interface TestRunTrace {
  traceId: string
  tenantId: TenantId
  agentId: AgentId
  versionId: AgentVersionId
  input: { message: string; historySize: number }
  intent: { name: string; confidence: number }
  policy: Array<{ layer: string; decision: string; reason: string }>
  knowledge: {
    status: 'not_requested' | 'approved_source_missing' | 'answered' | 'handoff'
    source?: string
    version?: string
  }
  tools: Array<{
    name: string
    status: 'not_run' | 'blocked' | 'succeeded' | 'failed'
  }>
  handoff: { requested: boolean; reason: string | null }
  response: { text: string; mode: 'answer' | 'clarify' | 'handoff' | 'blocked' }
  provider: { provider: string; model: string; externalCall: false }
  configVersion: string
  createdAt: Date
}
```

Trace não contém corpo bruto, segredo ou PII. O Test Lab não possui acesso a channel adapter real nem a dispatcher.

## Interfaces de armazenamento

Implementar primeiro `ControlPlaneStore` in-memory com métodos assíncronos e cópia defensiva; depois `PostgresControlPlaneRepository` com a mesma porta. Métodos mínimos:

- `createAgent(scope, input)`;
- `getAgent(scope, id)`;
- `listAgents(scope)`;
- `createVersion(scope, agentId, config)`;
- `cloneVersion(scope, agentId, versionId, config?)` via a camada de aplicação, sempre criando novo snapshot DRAFT;
- `transitionVersion(scope, versionId, targetStatus)`;
- `publishVersion(scope, versionId)`;
- `rollback(scope, agentId, versionId)`;
- `resolvePublished(scope, agentId)`;
- `recordTestRun(scope, trace)`.

Cada método verifica scope antes de consultar ou mutar. Retornos são cópias congeladas/defensivas.

## API mínima desta fatia

As rotas admin, quando implementadas, exigem `Admin` + tenant autenticado e respondem envelope padrão:

- `POST /v1/admin/agents`;
- `GET /v1/admin/agents`;
- `POST /v1/admin/agents/:agentId/versions`;
- `POST /v1/admin/agents/:agentId/versions/:versionId/clone`;
- `POST /v1/admin/agents/:agentId/versions/:versionId/transition`;
- `POST /v1/admin/agents/:agentId/versions/:versionId/publish`;
- `POST /v1/admin/agents/:agentId/rollback`;
- `POST /v1/admin/test-lab/runs`.

Não há endpoint de envio externo nessa superfície.

## Testes obrigatórios antes de marcar BUILD

- schemas inválidos e secret leakage;
- tenant A não lê/escreve/executa objeto de tenant B;
- transições inválidas e snapshot imutável;
- publish exige approved; rollback gera nova versão;
- composer determinístico;
- hard safety e policy unavailable fail-closed;
- gateway bloqueia ferramenta não registrada/desabilitada/sem permissão;
- Test Lab marca `externalCall: false` e nenhum adapter é chamado;
- `requires_approval` nunca responde como `answer`: vira handoff seguro e não executa tool;
- gravação de trace valida tenant, agent e version antes de persistir;
- publicação PostgreSQL bloqueia a linha de controle dentro da transação;
- Control Center pode editar uma versão e salvar como novo DRAFT sem mutar o snapshot fonte;
- Trace Viewer mostra policy, knowledge, handoff, resposta e provider com redaction;
- Secretary legacy suite e gates existentes continuam verdes;
- migration smoke, se a persistência nova entrar nesta rodada.

## Gate e evidências

O gate `IMPLEMENTATION_READY` original cobre `PLAT-FOUNDATION-001..005`; o escopo controlado posterior inclui `PLAT-FOUNDATION-006..014` e o hardening `PLAT-S02`. Esse acréscimo não autoriza provider, canal, RAG, agenda real, dados reais, deploy ou mudança irreversível: cada um requer novo SPEC e decisão humana. O resultado final precisa anexar comandos, contagens, cobertura e limitações sem fabricar pass.

## PLAT-S03 — fronteira tenant/RLS pré-produção

Antes de qualquer rollout real, a persistência deve oferecer uma migration posterior à `0000_initial` e um caminho de execução que não dependa apenas de filtros aplicacionais. A migration deve:

- adicionar `tenant_id` à auditoria/outbox sem confiar em `payload.tenantId`: somente relações existentes de sessão, conversa, agent/version podem mapear uma linha histórica;
- criar políticas `USING` e `WITH CHECK` para conversas, tabelas filhas, idempotência e control plane;
- usar `FORCE ROW LEVEL SECURITY` no schema ativado;
- ocultar linhas legadas sem contexto/mapeamento seguro em vez de adivinhar tenant;
- criar índices para as relações usadas nas policies e manter a migration inicial compatível.

O runtime de produção deve usar pool com uma conexão dedicada por operação tenant-scoped, definir `cvg.tenant_id` no contexto da sessão e limpá-lo antes do release. O startup deve falhar se produção não tiver PostgreSQL, migration de isolamento e tenant context habilitados. Os repositórios PostgreSQL existentes permanecem reutilizáveis dentro dessa fronteira, sem alterar o contrato controlado de fixture.

Testes obrigatórios: migration runner idempotente, checksum e baseline legado explícito, quarentena de linhas nulas/incompatíveis/claims não confiáveis em auditoria e outbox, invisibilidade da quarentena para role runtime, imutabilidade do flag de quarentena, preservação no rerun, policies presentes com expressão exata e sem policy extra, tenant A/B com `FORCE RLS`, nenhuma leitura/escrita cruzada, reset/verificação de contexto e `search_path` no pool, auditoria com tenant fornecido fora do payload e caminho de produção sem `pg.Client` compartilhado. O startup deve verificar marker/checksum, catálogo RLS, `search_path`, ownership e privilégios DML-only da role runtime e da role migration mesmo quando `POSTGRES_AUTO_MIGRATE=false`.

## PLAT-S04 — approval capability durável e adapter do legado

Antes de qualquer ferramenta real, a autoridade de capability approval deve persistir pelo menos: tenant, agent/version, tool, hash canônico do input, actor, nonce único, issuer, expiração, status, consumo e revogação. A verificação precisa ser atômica e single-use; approval ausente, expirado, revogado, reutilizado, com input diferente ou fora do tenant deve bloquear e auditar.

O `ToolRegistry` legado não pode executar handlers diretamente no runtime publicado. O adapter controlado expõe somente `find_available_slots`, encaminha pelo `CapabilityGateway` em `dryRun=true` e rejeita qualquer ferramenta não allowlisted. Confirmar, cancelar, reagendar, provider real, canal real e outbox de side effect continuam fora desta sprint.

## PLAT-S06 — catálogo persistente do Test Lab e comparação A/B controlada

O Test Lab passa a ter um catálogo persistente, ainda exclusivamente controlado e sem qualquer tráfego externo. Uma suite é um snapshot imutável de casos redigidos, sempre vinculada ao mesmo tenant, agente e versão de configuração. Criar ou clonar uma suite gera um novo identificador e uma nova versão do catálogo; a suite de origem não pode ser mutada.

O caso de teste aceita somente mensagem, histórico sintético, intenção esperada opcional e fonte institucional aprovada opcional. Antes de persistir, mensagem, histórico e resposta de conhecimento são redigidos com a mesma fronteira do trace. O catálogo não aceita segredo, PII deliberada, provider, canal ou ferramenta externa.

Cada avaliação pode registrar um histórico redigido com uma ou duas variantes (`A` e `B`). As variantes precisam pertencer ao mesmo tenant e agente da suite, executam somente em `dryRun`, usam o evaluator determinístico do Test Lab e mantêm `externalCall: false`. A comparação A/B é uma comparação de resultados controlados; não mede tráfego real, não altera publicação e não libera feature flag.

### Contrato mínimo

- `TestSuiteRecord`: tenant, slug/name, agent/version, casos redigidos, versão do catálogo, origem de clone e auditoria de criação;
- `TestSuiteRunRecord`: tenant, suite, agente, variantes A/B, resultados redigidos, status agregado e ator;
- ids opacos `test_suite_<uuid>` e `test_suite_run_<uuid>`;
- unicidade de slug por tenant/agente e unicidade de variante por execução;
- cópia defensiva em memória e cópia sanitizada no PostgreSQL;
- `FORCE ROW LEVEL SECURITY`, `tenant_id` não-quarentenado e políticas exatas nas tabelas novas.

### API e UI controladas

As rotas admin são `POST/GET /v1/admin/test-lab/suites`, `POST /:suiteId/clone`, `POST /:suiteId/evaluate`, `POST /:suiteId/compare` e `GET /:suiteId/runs`. Todas exigem identidade admin e permissão `test:run` ou `agent:configure`, conforme a operação, além de validar tenant/agente/versão antes de consultar ou executar.

O Control Center expõe criação, carregamento, avaliação e comparação A/B de suites sem auto-fetch, para preservar o comportamento legado e evitar chamadas não solicitadas. O resultado visualizado é apenas PASS/FAIL e metadados redigidos.

### Gate de implementação

Antes de fechar `PLAT-S06-001`, devem passar: testes RED/GREEN de lifecycle, clone imutável, redaction, isolamento tenant e histórico; rotas API e UI; typecheck, lint, format, build, cobertura, audit, readiness e E2E; além de smoke PostgreSQL real em fixture controlada para migration `0003`, persistência, clone, histórico e RLS. A conclusão não altera o boundary de release: dados reais, provider/canal, RAG, marketplace, agenda e ações clínicas/financeiras continuam bloqueados.

## PLAT-S07 — conflito otimista do Control Center

O lifecycle de `AgentVersion` deve aceitar uma precondition opcional `expectedStatus` em `transition`, `publish` e `rollback`. Quando o snapshot observado pelo operador não é mais o estado atual, a operação deve falhar com `conflict`, sem executar auditoria de sucesso, sem alterar qualquer versão e com envelope HTTP 409 na API.

O PostgreSQL mantém a proteção dentro da transação: a linha é lida com lock, o status observado é comparado à precondition e a atualização continua condicionada ao status lido. A store em memória aplica a mesma regra para manter os testes semânticos equivalentes. Chamadas internas históricas sem precondition continuam aceitas somente como compatibilidade do boundary controlado; a UI sempre envia o status que observou.

### Gate de implementação

Antes de fechar `PLAT-S07-001`, devem passar testes RED/GREEN de dois operadores com snapshot stale, erro 409, ausência de mutação parcial, tenant isolation e caminho PostgreSQL; typecheck, lint, format, build, cobertura, audit, readiness, E2E e smoke PostgreSQL. Esse slice não afirma HA, lock distribuído, ETag de proxy, IdP ou coordenação multi-região.

### Resultado controlado

`PLAT-S07-001` foi concluída como `COMPLETED_CONTROLLED`. A precondition é aplicada em memória, no repository PostgreSQL, na API e na UI; os gates executáveis passaram com 247 testes, cobertura acima de 80%, readiness, E2E, PostgreSQL fixture, format e audit. O resultado máximo permanece `CONTROLLED_MVP_READY`; coordenação distribuída e produção real continuam fora do escopo.

## PLAT-S08 — integridade de manifests e version pinning controlado

`PluginManifestSchema` deve validar invariantes semânticas além do formato: nomes de tools, capabilities, permissions, hooks e dependencies não podem se repetir; cada `tool.permission` deve estar declarado em `permissions`; e o plugin não pode depender de si próprio. O registry deve aceitar múltiplas versões imutáveis do mesmo plugin, rejeitar a mesma combinação nome/versão e sempre devolver cópias defensivas.

`PluginBinding` recebe `version` opcional. Quando informado, o gateway resolve somente a versão exata e falha fechado se ela não estiver registrada. Sem pinning, o comportamento legacy permanece compatível, mas a resolução escolhe determinísticamente a versão mais alta disponível. Nenhuma operação desta sprint acessa rede, instala código, persiste handler ou chama provider/canal.

### Gate de implementação

Antes de fechar `PLAT-S08-001`, devem passar testes RED/GREEN de invariantes de manifest, registro de versões, resolução pinned/unpinned, cópia defensiva e ausência de chamada do handler em versão inexistente; typecheck, lint, format, build, cobertura, audit, readiness, E2E e smoke PostgreSQL devem continuar verdes. O resultado máximo permanece `CONTROLLED_MVP_READY`.

### Resultado controlado

`PLAT-S08-001` foi concluída como `COMPLETED_CONTROLLED`. A validação, o registry e o gateway passaram os gates com 250 testes, cobertura acima de 80%, readiness, E2E, PostgreSQL fixture, format e audit. O resultado máximo permanece `CONTROLLED_MVP_READY`; marketplace, rede, código de terceiros e produção real continuam fora do escopo.

## PLAT-S09 — catálogo declarativo tenant-aware de plugins

O control plane deve oferecer um catálogo persistente de metadata de plugins, separado do `PluginRegistry` de handlers. Cada registro contém `tenantId`, id validado, `PluginManifest` já validado, status `DRAFT | APPROVED | ARCHIVED`, actor de criação/aprovação e timestamps. Manifest, nome e versão são imutáveis; uma combinação nome/versão só pode existir uma vez por tenant.

O lifecycle aceita `DRAFT → APPROVED | ARCHIVED` e `APPROVED → ARCHIVED`, com `expectedStatus` opcional e erro `conflict` quando o snapshot está stale. O catálogo deve usar RLS tenant-aware no PostgreSQL, cópia defensiva em memória/repository e API admin com envelope padrão. `APPROVED` significa somente metadata revisada: não concede permission, approval, instalação, resolução de dependências, handler, provider, canal ou side effect.

### Gate de implementação

Antes de fechar `PLAT-S09-001`, devem passar testes RED/GREEN de lifecycle, duplicate name/version, cópia imutável, tenant isolation, conflito stale, migration/RLS e API; typecheck, lint, format, build, cobertura, audit, readiness, E2E e smoke PostgreSQL devem continuar verdes. O resultado máximo permanece `CONTROLLED_MVP_READY`.

### Resultado controlado

`PLAT-S09-001` foi concluída como `COMPLETED_CONTROLLED`. O catálogo, o lifecycle, a migration/RLS, o repository tenant-scoped e a API passaram os gates com 253 testes, 16 skips condicionais e coverage acima de 80%. `APPROVED` permanece somente uma decisão de metadata; marketplace, instalação, handlers, provider/canal e produção real continuam fora do escopo.

## PLAT-S10 — Control Center do catálogo declarativo de plugins

### Contrato

O S10 não altera o contrato de persistência do S09. O cliente web usa as rotas
existentes:

- `GET /v1/admin/plugins/catalog?name=<optional>`;
- `POST /v1/admin/plugins/catalog` com `{ manifest }`;
- `POST /v1/admin/plugins/catalog/:pluginId/transition` com `{ target,
expectedStatus }`.

Cada chamada deve enviar a identidade do operador e `x-tenant-id` pelo cliente
controlado. A UI deve tratar `409/conflict` como snapshot stale, sem repetir a
mutação automaticamente.

O manifest criado pelo Control Center contém somente metadata validável:
`name`, `version`, capabilities, permissions, tools, hooks, dependencies e
`configSchemaVersion`. Não há campo de código, URL de instalação, credential,
secret value ou configuração de provider/canal. O editor pode reutilizar os
campos de plugin lógico existentes, mas aprovação de catálogo não transforma a
binding em handler executável.

### Qualidade e fronteiras

- lista, criação e lifecycle permanecem tenant-aware e Admin-only na API;
- o Control Center mostra `DRAFT`, `APPROVED` e `ARCHIVED`, além de actor e
  versão;
- `APPROVED` é rotulado como metadata-only e não é conectado ao gateway;
- casos de API failure, conflito e catálogo vazio têm estado visível;
- não são adicionadas chamadas externas, migrations, handlers ou side effects.

### Gate de implementação

Antes do fechamento do `PLAT-S10-001`, devem passar testes RED/GREEN do cliente
API e do Control Center, incluindo headers tenant-aware, manifest sem segredo,
lista vazia, criação, aprovação com precondition e conflito; além de
typecheck, lint, format, build, cobertura, readiness, E2E e auditoria de que o
catálogo continua metadata-only.
