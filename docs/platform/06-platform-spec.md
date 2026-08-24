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
