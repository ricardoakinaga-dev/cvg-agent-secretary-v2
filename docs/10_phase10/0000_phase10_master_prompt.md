# PROMPT MASTER — CVG AGENT SECRETARY V2

## Production Assurance, Agent Runtime Closure & Triple-AAA Certification

Fonte: instrução do usuário, registrada verbatim em 2026-09-11.

Você está atuando como **Principal Software Architect, Staff+ AI Engineer, Security Engineer, SRE, Platform Engineer, Distributed Systems Engineer, QA Architect e Independent Auditor**.

Seu objetivo é trabalhar diretamente no repositório:

`https://github.com/ricardoakinaga-dev/cvg-agent-secretary-v2`

e executar uma modernização completa para transformar o projeto em uma plataforma de agentes de produção **State of Art, Triple AAA**, sem destruir ou enfraquecer os bons mecanismos já existentes.

O objetivo final NÃO é apenas:

- fazer testes passarem;
- adicionar documentação;
- aumentar cobertura;
- adicionar abstrações cosméticas;
- criar mocks;
- declarar produção pronta por texto.

O objetivo é produzir **evidência técnica mecanicamente verificável** de que o sistema atingiu um nível elevado de:

- arquitetura;
- segurança;
- confiabilidade;
- auditabilidade;
- isolamento;
- observabilidade;
- resiliência;
- IA/agent engineering;
- governança;
- qualidade operacional;
- readiness de produção.

---

# 1. CONTEXTO ATUAL

O projeto já possui fundações fortes.

Preserve e evolua os seguintes elementos já existentes:

- monorepo com `apps/*` e `packages/*`;
- API;
- worker;
- frontend web;
- PostgreSQL;
- isolamento de tenant;
- Outbox Pattern;
- idempotência;
- leases;
- retry/backoff;
- dead-letter;
- correlation IDs;
- audit trail;
- human takeover;
- approvals;
- session version pinning;
- restore;
- webhook security;
- worker fail-closed;
- testes PostgreSQL;
- testes E2E;
- Playwright;
- Vitest;
- TypeScript;
- ESLint;
- Prettier;
- CI verification;
- deterministic model seam;
- evidence artifacts;
- Gauntlet/evidence flow;
- production `NO-GO` explícito enquanto gates reais não forem satisfeitos.

Nunca remova ou simplifique esses mecanismos sem evidência objetiva de que a substituição é superior.

---

# 2. PRINCÍPIO CENTRAL

Este sistema deve obedecer a:

> Model output is untrusted input.

O LLM nunca terá autoridade direta.

O LLM poderá:

- interpretar;
- classificar;
- recomendar;
- preencher estruturas;
- propor ações;
- gerar mensagens;
- solicitar ferramentas.

Mas somente mecanismos determinísticos poderão autorizar e executar efeitos externos.

A arquitetura deve ser:

```text
User / Channel
      ↓
Input Normalization
      ↓
Identity
      ↓
Tenant Boundary
      ↓
Agent Runtime
      ↓
Model Gateway
      ↓
Structured Output
      ↓
Policy Engine
      ↓
Capability Engine
      ↓
Approval Engine
      ↓
Tool Gateway
      ↓
Outbox
      ↓
External Side Effect
      ↓
Audit / Evidence / Telemetry
```

---

# 3. MISSÃO DESTA FASE

Implemente uma nova fase formal chamada:

# PHASE 10 — PRODUCTION ASSURANCE & AGENT RUNTIME CLOSURE

Divida-a, quando apropriado, nas seguintes ondas:

```text
10.0 Baseline & Truth Source
10.1 Model Gateway
10.2 Policy & Capability Engine
10.3 Approval Integrity
10.4 Channel Gateway
10.5 Distributed Safety
10.6 Observability
10.7 Agent Evals
10.8 Chaos & Resilience
10.9 Data Governance & LGPD
10.10 Supply Chain & Release Security
10.11 Production Runtime
10.12 Canary & Promotion
10.13 Final Triple-AAA Certification
```

Não pule etapas.

---

# 4. PHASE 10.0 — BASELINE & TRUTH SOURCE

Antes de modificar código:

1. leia:
   - `AGENTS.md`;
   - `package.json`;
   - CI;
   - docs de discovery;
   - PRD;
   - SPEC;
   - BUILD;
   - AUDIT;
   - Gauntlet;
   - runtime state;
   - backlog;
   - remediation dossiers;
   - evidências existentes.

2. execute o baseline atual.

No mínimo:

```bash
npm ci
npm run readiness
npm run format:check
npm run typecheck
npm run lint
npm run build
npm test
npm run test:coverage
npm run audit:security
npm run test:worker:startup
npm run test:postgres
npm run test:e2e
```

3. registre:
   - commit inicial;
   - comandos;
   - resultados;
   - testes existentes;
   - coverage;
   - dependências;
   - gaps;
   - blockers;
   - ambiente.

Crie um artifact baseline mecanicamente legível.

---

# 5. MODEL GATEWAY

O atual deterministic adapter deve continuar existindo para testes.

Mas adicione uma arquitetura real de Model Gateway.

Sugestão:

```text
packages/model-gateway/
```

O domínio NÃO deve depender diretamente de OpenAI, Ollama, vLLM, llama.cpp ou qualquer provider.

Crie interfaces provider-agnostic.

Exemplo conceitual:

```ts
interface ModelGateway {
  generate(request: ModelRequest): Promise<ModelResult>
}

interface ModelProvider {
  id: string
  execute(request: ProviderRequest): Promise<ProviderResult>
}
```

A requisição deverá carregar, quando aplicável:

```text
tenantId
agentId
agentVersionId
sessionId
conversationId
correlationId
promptVersion
policyVersion
modelProfile
timeout
maxTokens
maxCost
structuredOutputSchema
```

---

# 6. PROVIDERS

Implemente estrutura extensível para:

```text
OpenAI
Ollama
vLLM / OpenAI-compatible
controlled deterministic provider
```

Outros providers poderão ser adicionados posteriormente.

Não espalhe SDKs externos pelo domínio.

Toda comunicação passa pelo gateway.

---

# 7. MODEL ROUTING

Implemente model profiles.

Exemplo:

```text
fast
balanced
reasoning
local
critical-review
```

Uma policy pode resolver:

```text
task → model profile
```

Não codifique modelos de forma rígida nos workflows.

---

# 8. TIMEOUTS

Toda chamada de modelo deve possuir timeout real.

Use cancelamento via:

```text
AbortController
```

ou mecanismo equivalente.

Nunca permita provider call sem deadline.

---

# 9. RETRIES

Retries somente em erros explicitamente retryable.

Não faça retry automático para:

```text
401
403
invalid_request
policy_violation
schema_invalid
```

Permita retry para casos como:

```text
429
502
503
504
connection reset
timeout
```

com:

```text
bounded exponential backoff
+
jitter
```

---

# 10. CIRCUIT BREAKER

Implemente circuit breaker por provider/model.

Estados:

```text
CLOSED
OPEN
HALF_OPEN
```

Registre telemetry dos transitions.

---

# 11. COST BUDGETS

Implemente budget guards.

O sistema deve poder limitar por:

```text
request
session
tenant
agent
day
```

Nunca permita um agente consumir custo ilimitado por loop.

---

# 12. STRUCTURED OUTPUT

Tool calls e decisões relevantes não poderão depender de parsing frágil de linguagem natural.

Use schemas Zod.

Exemplo:

```ts
const AgentDecisionSchema = z.object({
  intent: z.string(),
  proposedActions: z.array(...),
  requiresHumanApproval: z.boolean()
})
```

Se parsing falhar:

```text
FAIL CLOSED
```

Nunca tente inferir autorização de JSON quebrado.

---

# 13. PROMPT VERSIONING

Todo prompt de produção deve possuir:

```text
promptId
version
sha256
effectiveFrom
owner
```

As sessões devem permanecer pinned à versão apropriada.

---

# 14. POLICY ENGINE

Crie:

```text
packages/policy-engine/
```

Nenhum modelo deve decidir autorização.

A decisão deve ser:

```text
ALLOW
DENY
REQUIRE_APPROVAL
```

Input mínimo:

```text
tenant
operator
agent
role
capability
resource
action
context
risk
```

Output:

```text
decision
reason
policyId
policyVersion
correlationId
```

---

# 15. CAPABILITY ENGINE

Implemente segurança baseada em capabilities.

Exemplos:

```text
schedule.read
appointment.create
appointment.modify
appointment.cancel

conversation.read
message.draft
message.send

patient.summary.read
patient.record.read
patient.record.write

exam.read
exam.release

finance.read
finance.write

admin.policy.manage
admin.agent.manage
```

Agents devem receber somente capabilities necessárias.

---

# 16. PRINCIPLE OF LEAST PRIVILEGE

Secretária:

```text
ALLOW:
schedule.read
appointment.create
appointment.modify
conversation.read
message.draft
message.send
patient.summary.read LIMITED
```

Secretária NÃO deve possuir:

```text
patient.record.write
clinical.prescribe
exam.release
finance.write
admin.*
```

Internação, clínica médica e administração terão perfis distintos.

---

# 17. DENY BY DEFAULT

Se não existir policy explícita:

```text
DENY
```

Se contexto estiver incompleto:

```text
DENY
```

Se tenant estiver ausente:

```text
DENY
```

Se identidade não puder ser verificada:

```text
DENY
```

---

# 18. APPROVAL ENGINE

Crie um motor formal:

```text
packages/approval-engine/
```

Estados:

```text
REQUESTED
PENDING
APPROVED
REJECTED
EXPIRED
CANCELLED
EXECUTED
```

---

# 19. CRYPTOGRAPHIC ACTION BINDING

A aprovação deve ser vinculada à ação exata.

Calcule:

```text
payload_hash = SHA256(canonical_action_payload)
```

A approval deve conter:

```text
approvalId
tenantId
operatorId
agentId
agentVersion
action
payloadHash
policyVersion
requestedAt
expiresAt
approvedAt
executedAt
correlationId
```

Uma aprovação para ação A nunca poderá executar ação B.

---

# 20. SINGLE-USE APPROVALS

Por padrão, approvals de efeito devem ser:

```text
single-use
```

Após execução:

```text
EXECUTED
```

Reuso deve falhar.

---

# 21. EXPIRATION

Approvals devem expirar.

Após expiração:

```text
FAIL CLOSED
```

---

# 22. CHANNEL GATEWAY

Não permita integração direta e espalhada com EvolutionAPI, Chatwoot ou futuros canais.

Crie:

```text
packages/channel-gateway/
```

Interface:

```text
InboundChannelAdapter
OutboundChannelAdapter
```

---

# 23. CANONICAL MESSAGE ENVELOPE

Use envelope canônico:

```text
messageId
externalId
tenantId
conversationId
channel
sender
recipient
timestamp
body
attachments
correlationId
idempotencyKey
metadata
```

---

# 24. PROVIDERS DE CANAL

Planeje adapters para:

```text
EvolutionAPI
Chatwoot
controlled fake channel
```

Não é necessário habilitar canais reais automaticamente.
Configuração deve ser opt-in e fail-closed.

---

# 25. WEBHOOK SECURITY

Todo webhook externo deve implementar:

```text
signature validation
timestamp validation
replay protection
body size limits
content-type validation
schema validation
tenant resolution
idempotency
rate limiting
audit
```

Webhook inválido:

```text
não chega ao domínio
```

---

# 26. CHANNEL IDEMPOTENCY

Eventos duplicados do WhatsApp devem produzir:

```text
1 inbound domain event
```

e nunca múltiplos efeitos.

Adicione testes para duplicação realística.

---

# 27. EVENT BACKBONE

Formalize eventos de domínio.

Exemplos:

```text
appointment.created
appointment.rescheduled
appointment.cancelled

patient.arrived

exam.requested
exam.scheduled
exam.completed

hospitalization.admitted
hospitalization.handoff_required

followup.created
followup.due

reminder.scheduled
reminder.due

message.received
message.drafted
message.sent

human.takeover.started
human.takeover.ended
```

---

# 28. SCHEDULING

O LLM nunca deve funcionar como relógio.

Implemente scheduler determinístico.

Exemplo:

```text
exam.scheduled
       ↓
reminder.create
       ↓
scheduler
       ↓
reminder.due
       ↓
outbox
       ↓
notification
```

---

# 29. DISTRIBUTED REPLAY PROTECTION

O replay cache in-memory deve continuar útil em testes.

Porém produção distribuída necessita mecanismo compartilhado.

Implemente interface:

```text
ReplayStore
```

Providers:

```text
InMemoryReplayStore
PostgresReplayStore
```

Redis/Valkey pode ser preparado como opcional.

Use operação atômica equivalente a:

```text
insert-if-absent with expiration
```

---

# 30. DISTRIBUTED IDEMPOTENCY

Revise todas as operações de efeito externo.

Garanta semanticamente:

```text
at-least-once delivery
+
effectively-once side effects
```

via:

```text
idempotency key
effect journal
transaction boundaries
```

---

# 31. OUTBOX HARDENING

Realize testes fortes para:

```text
worker crash before effect
worker crash after effect
worker crash before ack
lease expiration
lease takeover
duplicate worker
duplicate event
database reconnect
dead-letter replay
human takeover race
```

---

# 32. HUMAN TAKEOVER

Human takeover deve funcionar como interlock.

Quando ativo:

```text
automatic outbound effects = blocked
```

até encerramento explícito.

Adicione race-condition tests.

---

# 33. OBSERVABILITY

Implemente OpenTelemetry.

Crie abstrações para:

```text
traces
metrics
logs
```

---

# 34. DISTRIBUTED TRACE CONTEXT

Propague:

```text
traceId
spanId
correlationId
tenantId
conversationId
sessionId
agentId
agentVersion
```

através de:

```text
API
worker
model
tool
outbox
channel
database
```

---

# 35. METRICS

Métricas mínimas:

```text
requests_total
request_duration_ms

agent_runs_total
agent_run_duration_ms

model_calls_total
model_latency_ms
model_tokens_input
model_tokens_output
model_cost

tool_calls_total
tool_failures_total

outbox_pending
outbox_processing
outbox_failed
outbox_dead_letter

approval_pending
approval_expired

human_takeovers_total

webhook_rejected_total

policy_denied_total
policy_approval_required_total
```

Evite high-cardinality labels.

---

# 36. STRUCTURED LOGGING

Logs estruturados.

Nunca logar:

```text
password
token
secret
API key
full medical notes
sensitive personal information unnecessarily
```

Use redaction centralizada.

---

# 37. SLO ENGINEERING

Formalize SLOs iniciais.

Sugestão:

```text
API availability: 99.9%

message processing:
p95 < 2s
p99 < 5s

lost committed inbound messages:
0

duplicate external effects:
0

RPO:
<= 5 min

RTO:
<= 30 min
```

Se valores diferentes forem necessários, documente racional técnico.

---

# 38. AGENT EVAL FRAMEWORK

Crie:

```text
packages/agent-evals/
```

ou equivalente.

Evals não devem depender somente de testes unitários.

---

# 39. DATASET DE EVAL

Crie inicialmente pelo menos dezenas de fixtures representativas com arquitetura que permita crescer para:

```text
500–1000 cenários
```

Categorias:

```text
agendamento
cancelamento
remarcação
horários
valores
convênio
retorno
exames
resultado de exame
internação
alta
emergência
handoff
cliente agressivo
mensagens ambíguas
multi-turn
informação incompleta
```

---

# 40. ADVERSARIAL EVALS

Inclua cenários:

```text
prompt injection
role override
tool injection
fake admin
cross-tenant request
secret extraction
RAG poisoning
unsafe medical action
financial modification
approval bypass
replay
social engineering
```

---

# 41. AGENT METRICS

Calcule:

```text
task success rate
policy violation rate
unsafe action rate
hallucination rate
tool selection accuracy
human escalation accuracy
schema failure rate
latency
cost
```

---

# 42. REGRESSION GATE

Uma nova versão de agente só pode ser promovida se:

```text
critical safety regressions = 0
policy violations = 0
```

e métricas principais não piorarem além do threshold definido.

---

# 43. CHAOS ENGINEERING

Crie uma suíte de failure injection.

No mínimo:

```text
CHAOS-01 worker crash before side effect

CHAOS-02 worker crash after provider response

CHAOS-03 worker crash after external effect before ack

CHAOS-04 PostgreSQL temporary disconnect

CHAOS-05 PostgreSQL restart

CHAOS-06 provider timeout

CHAOS-07 provider 429

CHAOS-08 provider 503

CHAOS-09 duplicate webhook

CHAOS-10 out-of-order webhook

CHAOS-11 expired approval during execution

CHAOS-12 tenant mismatch

CHAOS-13 replayed operator token

CHAOS-14 duplicate worker claim

CHAOS-15 network latency

CHAOS-16 channel provider outage
```

---

# 44. CHAOS ACCEPTANCE

Para cenários críticos:

```text
lost messages = 0
cross-tenant access = 0
duplicate external effects = 0
unauthorized actions = 0
```

---

# 45. BACKUP & RESTORE

Produza fluxo verificável para:

```text
backup
verification
restore
consistency check
```

Teste restore em banco separado.

---

# 46. RPO / RTO

Transforme RPO/RTO de pendência documental em gate real.

Meça.

Não declare atingido sem execução real.

---

# 47. DATA CLASSIFICATION

Implemente classificação de dados:

```text
PUBLIC
INTERNAL
CONFIDENTIAL
CLINICAL
FINANCIAL
CREDENTIAL
```

Associe dados relevantes a classes.

---

# 48. DATA HANDLING POLICY

Defina regras por classe para:

```text
logging
telemetry
RAG
retention
export
backup
LLM transmission
```

---

# 49. LGPD

Transforme governança LGPD em requisitos implementáveis.

Inclua:

```text
purpose limitation
data minimization
retention
access logging
export
anonymization/deletion where applicable
operator accountability
```

Nunca prometa conformidade jurídica automática.

Implemente mecanismos técnicos que suportem conformidade.

---

# 50. RAG GOVERNANCE

Institutional RAG deve exigir metadata:

```text
sourceId
version
owner
approvedBy
sha256
effectiveFrom
effectiveUntil
tenantId
classification
```

Conteúdo expirado ou não aprovado deve ser rejeitado ou claramente marcado.

---

# 51. RAG PROVENANCE

Toda resposta que dependa de conhecimento institucional deve poder registrar:

```text
retrieved documents
document versions
chunk IDs
hashes
retrieval score
```

---

# 52. PROMPT INJECTION VIA RAG

Documentos RAG são dados não confiáveis.

Nunca permita que conteúdo recuperado altere:

```text
system policy
capabilities
permissions
approval rules
```

---

# 53. SUPPLY CHAIN

Fortaleça o pipeline.

Adicione onde fizer sentido:

```text
CodeQL
Gitleaks
dependency scanning
SBOM
container scanning
license checks
```

Evite ferramentas redundantes sem ganho.

---

# 54. PIN GITHUB ACTIONS

Actions críticas devem preferencialmente ser pinadas por:

```text
commit SHA
```

e não apenas tags mutáveis.

---

# 55. DEPENDENCY SECURITY

Mantenha:

```text
npm audit
```

mas não dependa somente dele.

Analise:

```text
direct dependencies
transitive dependencies
licenses
known vulnerabilities
```

---

# 56. SBOM

Gere SBOM em padrão:

```text
CycloneDX
```

ou:

```text
SPDX
```

---

# 57. RELEASE ARTIFACT

Todo release candidato deve registrar:

```text
commit SHA
container digest
SBOM digest
migration digest
build timestamp
agent version
policy version
prompt versions
```

---

# 58. CONTAINER HARDENING

Caso Docker seja usado:

```text
non-root user
read-only filesystem where possible
drop Linux capabilities
no privileged
healthcheck
bounded memory
bounded CPU
tmpfs where appropriate
minimal base image
```

---

# 59. CONFIGURATION

Valide environment variables via schema.

Startup deve falhar quando:

```text
required secret missing
placeholder secret
unsafe production mode
invalid origin
invalid provider
invalid database settings
```

---

# 60. SECRET MANAGEMENT

Nenhum segredo no repositório.

`.env.example` pode conter somente placeholders seguros.

Implemente suporte preparado para secret injection por ambiente.

---

# 61. NETWORK SECURITY

Documente e implemente limites claros entre:

```text
public ingress
API
worker
database
provider
channel
```

DB não deve ser exposto publicamente.

---

# 62. HEALTH ENDPOINTS

Separar:

```text
/live
/ready
```

`live`:

processo responde.

`ready`:

dependências essenciais e configurações válidas.

---

# 63. GRACEFUL SHUTDOWN

API e worker devem:

```text
stop accepting new work
finish or release leases safely
flush telemetry
close DB
exit cleanly
```

Adicione teste.

---

# 64. MIGRATION SAFETY

Migrations devem ser:

```text
versioned
reviewable
transactional where possible
forward-safe
```

Adicione migration smoke e compatibility checks.

---

# 65. ZERO-DOWNTIME PRINCIPLES

Evite migrations destrutivas em uma única etapa.

Adote quando necessário:

```text
expand
migrate
contract
```

---

# 66. CANARY

Implemente conceito de deployment ring:

```text
DEV
SIMULATION
INTERNAL
SUPERVISED_CANARY
LIMITED_PRODUCTION
PRODUCTION
```

---

# 67. AGENT PROMOTION

Cada AgentVersion deve possuir status.

Exemplo:

```text
DRAFT
EVAL
SECURITY_REVIEW
APPROVED_FOR_CANARY
CANARY
APPROVED_FOR_PRODUCTION
RETIRED
```

---

# 68. PROMOTION GATE

Promoção deve depender de evidências.

Exemplo:

```text
tests_passed
eval_score
security_score
no_critical_findings
policy_regressions_zero
human_signoff
```

---

# 69. AUTOMATIC ROLLBACK

Prepare mecanismo ou runbook verificável para:

```text
rollback application version
rollback agent version
rollback model profile
rollback prompt version
rollback policy
```

---

# 70. FEATURE FLAGS

Integrações novas e ações de risco devem poder ser ativadas por feature flag segura.

---

# 71. SHADOW MODE

Antes de permitir execução real, suporte:

```text
SHADOW
```

O agente:

```text
interpreta
decide
propõe
```

mas não executa efeitos.

Compare decisões com operadores humanos.

---

# 72. SUPERVISED PILOT

Primeiro piloto real deve ser restrito.

Exemplo:

```text
somente confirmações de agenda
```

Depois:

```text
agendamentos simples
```

Depois:

```text
remarcações
```

Não liberar todas as capabilities simultaneamente.

---

# 73. MULTI-TENANCY

Audite novamente:

```text
queries
repositories
events
outbox
approvals
RAG
telemetry
sessions
files
```

Toda informação sensível deve ser tenant-bound.

Adicione testes adversariais de cross-tenant leakage.

---

# 74. DATABASE SECURITY

Quando suportado, fortaleça RLS PostgreSQL.

Não dependa somente de tenant filter em aplicação para recursos críticos.

---

# 75. RATE LIMITING

Adicione rate limiting por:

```text
IP
tenant
operator
channel
```

sem tornar ataques de baixo volume invisíveis.

---

# 76. RESOURCE LIMITS

Imponha limites para:

```text
payload size
attachment size
prompt length
model output
conversation size
RAG context
tool arguments
outbox payload
```

---

# 77. AGENT LOOP SAFETY

Loops devem possuir:

```text
maxSteps
maxToolCalls
maxModelCalls
maxDuration
maxCost
```

Ao ultrapassar:

```text
stop safely
audit
optional human escalation
```

---

# 78. TOOL GATEWAY

Todas as ferramentas devem possuir schemas de entrada/saída.

Não permita ferramentas genéricas do tipo:

```text
execute shell
run arbitrary SQL
call arbitrary URL
write arbitrary file
```

para agentes operacionais.

---

# 79. TOOL RISK LEVELS

Classifique tools:

```text
READ_ONLY
LOW_RISK_WRITE
MEDIUM_RISK_WRITE
HIGH_RISK_WRITE
ADMIN
```

Integre com approval/policy engine.

---

# 80. SSRF DEFENSE

Para tools HTTP:

```text
allowlist where possible
DNS validation
private IP blocking
redirect validation
bounded redirects
protocol restrictions
timeouts
response limits
```

---

# 81. FILESYSTEM DEFENSE

Tools de arquivo devem:

```text
restrict root
normalize paths
block traversal
reject symlink escape
enforce size limits
```

---

# 82. AUDIT LEDGER

Considere evoluir auditoria para cadeia hash append-only.

Exemplo:

```text
eventId
previousHash
eventHash
payloadHash
actor
timestamp
tenant
correlationId
```

Isso deve ser uma camada adicional de integridade, não blockchain desnecessário.

---

# 83. EVIDENCE LEDGER

Artefatos de certificação devem possuir:

```text
path
sha256
producer
timestamp
runId
commit
```

Preserve a filosofia já existente do Gauntlet.

---

# 84. SECURITY TESTING

Adicione testes negativos para:

```text
invalid signature
expired token
future token
token replay
tenant spoof
approval spoof
payload mutation after approval
capability escalation
RAG injection
tool injection
webhook replay
CORS bypass attempts
proxy spoofing
```

---

# 85. CORS / PROXY

Revise:

```text
API_ALLOWED_ORIGINS
API_REQUIRE_HTTPS
API_TRUSTED_PROXY_ADDRESSES
API_TRUSTED_PROXY_HOPS
```

Nunca confie cegamente em:

```text
X-Forwarded-For
X-Forwarded-Proto
```

---

# 86. UI DE OPERAÇÃO

Painel web deve tornar visíveis:

```text
human takeover
pending approvals
failed events
dead letters
agent version
policy version
correlation ID
system degraded state
```

Não esconda estados operacionais importantes.

---

# 87. ACCESSIBILITY

Realize auditoria básica:

```text
semantic labels
keyboard navigation
focus
ARIA only where needed
contrast
error messages
```

Automação não substitui revisão humana, mas deve existir gate técnico.

---

# 88. ERROR MODEL

Padronize erros:

```text
validation_failed
unauthorized
forbidden
tenant_mismatch
policy_denied
approval_required
approval_expired
conflict
rate_limited
provider_timeout
provider_unavailable
dependency_failure
```

Nunca vaze stack trace para cliente.

---

# 89. RETRIES NÃO PODEM DUPLICAR EFEITOS

Teste explicitamente:

```text
provider success
network timeout after success
retry
```

e garanta side effect idempotente.

---

# 90. DEAD LETTER OPERATIONS

Dead letters precisam de:

```text
inspect
reason
attempt count
correlation
manual replay
approval where appropriate
audit
```

---

# 91. SECURITY HEADERS

Para frontend/API web:

```text
CSP
HSTS in production
X-Content-Type-Options
Referrer-Policy
frame restrictions
```

adequadamente configurados.

---

# 92. TEST PYRAMID

Mantenha equilíbrio:

```text
unit
contract
integration
Postgres
E2E
failure injection
eval
```

Não transforme toda validação em E2E lento.

---

# 93. PROPERTY TESTING

Considere property-based testing onde agregue valor:

```text
idempotency
serialization
canonical payload hashing
tenant boundaries
retry/backoff
```

---

# 94. CONCURRENCY TESTS

Adicione casos concorrentes para:

```text
two workers claim same event
two approvals race
two duplicate webhooks
two scheduling attempts
human takeover vs send
```

---

# 95. LOAD TESTING

Crie ferramenta reproduzível para cargas maiores.

Meta inicial:

```text
10k events
```

Depois, quando ambiente permitir:

```text
100k events
```

Meça:

```text
throughput
p50
p95
p99
error rate
DB connections
queue depth
memory
CPU
```

---

# 96. NÃO FALSIFIQUE MÉTRICAS

Não declarar SLA atingido com:

```text
n=5
```

Fixtures pequenas só contam como smoke.

---

# 97. DOCUMENTATION AS CODE

Atualize:

```text
architecture
threat model
ADR
runbooks
deployment
backup
restore
incident response
agent promotion
evals
```

Mas documentação nunca substitui implementação.

---

# 98. ARCHITECTURE DECISION RECORDS

Crie ADRs para decisões relevantes:

```text
model gateway
policy engine
approval binding
channel gateway
distributed replay store
OpenTelemetry
deployment strategy
RPO/RTO
```

---

# 99. THREAT MODEL

Produza threat model atualizado.

Considere:

```text
STRIDE
```

e também ameaças específicas de agentes:

```text
prompt injection
indirect prompt injection
tool abuse
data exfiltration
cross-tenant leakage
approval bypass
model compromise
provider compromise
RAG poisoning
```

---

# 100. INCIDENT RESPONSE

Runbooks mínimos:

```text
provider outage
channel outage
DB degradation
high dead-letter volume
security incident
credential compromise
tenant leakage suspicion
bad agent release
```

---

# 101. DO NOT OVERENGINEER

State of Art não significa:

```text
máximo número de abstrações
máximo número de serviços
máximo número de arquivos
```

Prefira:

```text
simplicity
correctness
determinism
evidence
```

Não introduza Kafka, Kubernetes, Redis ou múltiplos microservices sem justificativa concreta.

---

# 102. MODULAR MONOLITH FIRST

Preserve o monorepo/modular monolith enquanto isso continuar adequado.

Se eventos internos puderem resolver o problema, não introduza distributed complexity prematuramente.

---

# 103. NO FAKE IMPLEMENTATIONS

Não considerar como concluído algo que seja apenas:

```text
TODO
interface
stub
fake
mock
documentation
```

Mocks contam somente como suporte de testes.

---

# 104. NO FAKE CERTIFICATION

Nunca use termos como:

```text
production-ready
AAA
State of Art
certified
```

apenas porque testes unitários passaram.

A conclusão final deve ser derivada dos gates.

---

# 105. SEVERITY MODEL

Classifique findings:

```text
P0 — catastrophic/security/data loss
P1 — production blocking
P2 — important reliability/security gap
P3 — maintainability/UX
P4 — enhancement
```

---

# 106. P0/P1 RULE

Certificação final exige:

```text
P0 = 0
P1 = 0
```

---

# 107. P2 RULE

P2s só podem permanecer quando:

```text
explicitly documented
risk accepted
owner assigned
mitigation exists
```

Caso contrário:

```text
NO-GO
```

---

# 108. FINAL CI

Amplie `verify` ou crie gates complementares para incluir:

```text
format
typecheck
lint
build
unit
coverage
security
Postgres
worker smoke
migration smoke
E2E
critical security tests
agent eval smoke
```

Não torne PR comum absurdamente lento; divida suites quando apropriado.

---

# 109. NIGHTLY / EXTENDED GATES

Suites mais pesadas podem rodar como:

```text
nightly
release
manual certification
```

Exemplo:

```text
full agent evals
load
chaos
extended security
```

---

# 110. BRANCH PROTECTION DOCUMENTATION

Prepare recomendação para proteção da main:

```text
required checks
no force push
review required
stale review dismissal
```

Não altere configuração remota sem autorização explícita.

---

# 111. RELEASE GATE

Crie comando, script ou workflow equivalente a:

```bash
npm run certify
```

que agregue verificações de release localmente possíveis.

---

# 112. CERTIFICATION MANIFEST

Gere arquivo estruturado, exemplo:

```text
certification/manifest.json
```

com:

```json
{
  "commit": "...",
  "timestamp": "...",
  "tests": {},
  "security": {},
  "evals": {},
  "load": {},
  "chaos": {},
  "rpoRto": {},
  "humanSignoff": {},
  "externalIntegrations": {},
  "decision": "GO|NO_GO"
}
```

---

# 113. MECHANICAL GO/NO-GO

Crie cálculo determinístico.

Exemplo:

```text
if P0 > 0 → NO_GO
if P1 > 0 → NO_GO
if critical test failed → NO_GO
if policy violation > 0 → NO_GO
if required signoff missing → NO_GO
if RPO/RTO gate missing → NO_GO
if provider/channel validation required and missing → NO_GO
```

---

# 114. HUMAN GATES CONTINUAM HUMANOS

Nunca inventar:

```text
human_signoff=true
```

Não substituir decisão humana por modelo.

---

# 115. EXTERNAL GATES CONTINUAM EXTERNOS

Se WhatsApp, provider ou identidade real não puderem ser testados:

registre:

```text
NOT_VALIDATED
```

e mantenha GO condicionado quando necessário.

---

# 116. TEST DATA

Nunca use dados reais de clientes/pacientes para CI.

Use fixtures sintéticas.

---

# 117. PRODUCTION DATA

Se futuramente houver testes de produção, implementar minimização e anonimização onde apropriado.

---

# 118. SECURITY OF LOCAL MODEL PROVIDERS

Se houver Ollama/vLLM local:

```text
bind private interface
authentication if remote
no internet exposure by default
timeout
payload limit
tenant isolation at application layer
```

---

# 119. MODEL FALLBACK

Fallback só pode ocorrer quando policy permitir.

Nunca fazer fallback silencioso de um modelo controlado para modelo externo que receba dados mais sensíveis.

---

# 120. MODEL DATA POLICY

Policy deve poder declarar:

```text
EXTERNAL_MODEL_ALLOWED
LOCAL_ONLY
NO_MODEL
```

por tipo de informação/operação.

---

# 121. CLINICAL BOUNDARY

Este sistema não deve conceder autonomia clínica à secretária.

Ações como:

```text
diagnóstico
prescrição
alteração clínica
alta
liberação de exame
```

devem ser bloqueadas ou exigir fluxo apropriado.

---

# 122. FINANCIAL BOUNDARY

Ações financeiras de risco devem exigir policy específica.

---

# 123. ADMIN BOUNDARY

Secretária jamais recebe:

```text
admin policy
agent deployment
secret management
database admin
```

---

# 124. AUDIT IMMUTABILITY

Operadores comuns não podem apagar logs de auditoria.

---

# 125. RETENTION JOBS

Jobs de retenção precisam ser:

```text
tenant-safe
audited
idempotent
```

---

# 126. RESTORE CONSISTENCY

Após restore:

```text
referential integrity
audit chain
outbox state
agent session state
```

devem ser verificáveis.

---

# 127. PERFORMANCE BUDGETS

Estabeleça budgets de aplicação para evitar regressões grotescas.

Exemplo:

```text
API handler overhead
DB query count
bundle size
worker memory
```

---

# 128. DATABASE INDEX REVIEW

Analise queries críticas e crie índices somente com evidência.

Evite indexar tudo.

---

# 129. N+1

Identifique e elimine N+1 críticos.

---

# 130. CONNECTION POOL

PostgreSQL pool deve ter limites e timeout.

---

# 131. TRANSACTION BOUNDARIES

Revisar operações:

```text
domain state update
outbox enqueue
audit append
```

que devam ser atômicas.

---

# 132. CLOCK

Em testes use clocks injetáveis.

Produção deve utilizar time source coerente.

---

# 133. UUID / IDs

Use IDs não previsíveis para entidades sensíveis.

---

# 134. CANONICAL SERIALIZATION

Payload hashing deve usar canonical serialization consistente.

Adicione testes.

---

# 135. CRYPTO

Não crie primitivas criptográficas desnecessárias.

Use bibliotecas/plataformas seguras.

HMAC, hashes e comparação timing-safe devem seguir boas práticas.

---

# 136. TOKEN ROTATION

Formalize rotação de secrets.

Suporte:

```text
current secret
previous secret during grace period
```

como já existe conceitualmente, mas documente e teste.

---

# 137. REPLAY STORE CLEANUP

TTL deve impedir crescimento infinito.

---

# 138. QUEUE BACKPRESSURE

Worker deve respeitar limites.

Evite claim infinito.

---

# 139. OVERLOAD PROTECTION

Sob saturação:

```text
degrade gracefully
reject with controlled error
```

em vez de crash.

---

# 140. DEAD LETTER ALERT

Métrica/alerta deve existir quando DLQ exceder threshold.

---

# 141. PROVIDER ALERTS

Alertas para:

```text
provider error rate
high latency
circuit breaker open
cost anomaly
```

---

# 142. SECURITY ALERTS

Alertar para:

```text
replay attempts
tenant mismatch
approval forgery
excess policy denials
invalid signatures
```

---

# 143. RUNBOOKS

Cada alerta crítico deve apontar para runbook.

---

# 144. DASHBOARD

Crie documentação ou configuração base de dashboard operacional.

Não precisa introduzir stack pesada se desnecessária.

---

# 145. USER-FACING FAILURE MODES

Se IA indisponível:

```text
human fallback
```

Se canal indisponível:

```text
message retained/retry or explicit failure
```

Nunca perder silenciosamente.

---

# 146. CONVERSATION OWNERSHIP

Suporte estado:

```text
BOT
HUMAN
PENDING_HANDOFF
```

ou equivalente.

---

# 147. HUMAN MESSAGE SAFETY

Quando humano assumir, o bot deve parar efeitos outbound automáticos.

---

# 148. SESSION EXPIRY

Sessões precisam de lifecycle explícito.

---

# 149. CONTEXT COMPACTION

Se contexto crescer, implementar estratégia segura.

Nunca perder decisões obrigatórias ou approvals.

---

# 150. MEMORY

Diferencie:

```text
conversation context
operational state
institutional memory
long-term user profile
```

Não misture tudo no prompt.

---

# 151. DATA SOURCE OF TRUTH

Estado operacional pertence ao banco, não à memória do LLM.

---

# 152. AGENT DETERMINISM

Sempre que possível:

```text
deterministic state machine
+
LLM only at ambiguity boundaries
```

---

# 153. WORKFLOW ENGINEERING

Workflows devem ser observáveis e retomáveis.

---

# 154. RECOVERY

Após restart, sessões e jobs críticos devem continuar corretamente.

---

# 155. FINAL RED-TEAM

Antes da certificação final, execute uma auditoria fresh-context procurando maneiras de:

```text
escalar privilégios
vazar tenant
duplicar efeito
bypassar approval
replay token
abusar tools
injetar prompt
```

---

# 156. INDEPENDENT CRITIC

Use, quando possível, processo independente do builder.
O crítico não deve confiar automaticamente nos relatórios do implementador.

---

# 157. MUTATION / NEGATIVE VALIDATION

Quando razoável, prove que gates realmente falham.

Exemplo:

```text
quebre propositalmente policy
→ gate deve falhar
```

Depois reverta.

---

# 158. NO GREENWASHING

Um gate que nunca falha não é gate.

---

# 159. SUCCESS CRITERIA — ENGINEERING

Para Triplo AAA:

```text
typecheck = PASS
lint = PASS
format = PASS
build = PASS
unit = PASS
integration = PASS
Postgres = PASS
E2E = PASS
security critical = PASS
```

---

# 160. SUCCESS CRITERIA — SECURITY

```text
P0 = 0
P1 = 0

cross tenant leaks = 0
unauthorized effects = 0
approval bypass = 0
critical secret exposure = 0
```

---

# 161. SUCCESS CRITERIA — RELIABILITY

Nos cenários certificados:

```text
lost committed messages = 0
duplicate side effects = 0
```

---

# 162. SUCCESS CRITERIA — AGENT

```text
critical policy violations = 0
unsafe autonomous clinical actions = 0
unsafe autonomous financial actions = 0
```

---

# 163. SUCCESS CRITERIA — EVALS

Defina thresholds baseados no dataset criado.

Não invente 100% quando não houver evidência.

---

# 164. SUCCESS CRITERIA — OBSERVABILITY

Uma interação completa deve poder ser rastreada de:

```text
inbound
→ agent
→ model
→ policy
→ approval
→ tool
→ outbox
→ external effect
```

---

# 165. SUCCESS CRITERIA — RECOVERY

Backup/restore devem passar em ambiente controlado.

RPO/RTO devem ser medidos antes de serem declarados aprovados.

---

# 166. SUCCESS CRITERIA — RELEASE

Artifact de release deve ser reproduzível e identificável por digest.

---

# 167. SUCCESS CRITERIA — GOVERNANCE

Toda versão de agente deve possuir:

```text
version
prompt
policy
eval
approval status
```

---

# 168. SUCCESS CRITERIA — GO

`GO` somente quando todos os mandatory gates necessários ao ambiente alvo estiverem satisfeitos.

---

# 169. SE ALGUM GATE NÃO PUDER SER EXECUTADO

Registre:

```text
NOT_EXECUTED
reason
owner
required evidence
```

e mantenha decisão coerente.

---

# 170. ARTEFATOS FINAIS

Produza:

```text
PHASE10_PLAN.md
PHASE10_THREAT_MODEL.md
PHASE10_ARCHITECTURE.md
PHASE10_SECURITY_REVIEW.md
PHASE10_EVAL_REPORT.md
PHASE10_CHAOS_REPORT.md
PHASE10_LOAD_REPORT.md
PHASE10_RPO_RTO_REPORT.md
PHASE10_RELEASE_REPORT.md
PHASE10_FINAL_AUDIT.md
PHASE10_CERTIFICATION.json
```

Use a estrutura documental já existente se houver convenção melhor.

---

# 171. BACKLOG

Gere backlog rastreável com:

```text
ID
priority
severity
owner
status
dependencies
acceptance criteria
evidence
```

---

# 172. COMMITS

Faça commits pequenos e semanticamente claros quando autorizado.

Exemplo:

```text
feat(model-gateway): add provider-independent runtime

feat(policy): enforce capability-based authorization

feat(approvals): bind approval to immutable action hash

feat(observability): add distributed trace propagation

test(chaos): verify crash-after-effect idempotency
```

---

# 173. NÃO MODIFICAR O QUE NÃO PRECISA

Evite refactors gigantes sem ganho mensurável.

---

# 174. COMPATIBILITY

Preserve APIs públicas quando possível.

Mudanças breaking precisam de rationale e migration path.

---

# 175. FINAL AUDIT

No final, faça nova auditoria completa do repositório.

Reavalie:

```text
architecture
code quality
security
reliability
agent engineering
observability
testing
DevEx
data governance
production readiness
```

Dê nota de 0–100 para cada área.

---

# 176. DEFINIÇÃO DE STATE OF ART / TRIPLE AAA

Somente use:

```text
STATE_OF_ART_TRIPLE_AAA
```

quando houver evidência concreta.

Caso contrário use:

```text
AAA_CANDIDATE
AAA_CONTROLLED
CONDITIONAL_GO
NO_GO
```

---

# 177. BARRA DE CERTIFICAÇÃO

Minha barra desejada é:

```text
Architecture              >= 97
Engineering               >= 97
Testing                   >= 97
Security                  >= 97
Reliability               >= 97
Agent Engineering         >= 97
Observability             >= 97
Production Readiness      >= 95
Governance/Auditability   >= 97
```

Mas não manipule notas para atingir a meta.

---

# 178. REGRA PRINCIPAL

Qualidade não será medida pela quantidade de código criado.

Será medida pela redução comprovada de risco.

---

# 179. MODO DE EXECUÇÃO

Trabalhe autonomamente.

Não pare para pedir confirmação sobre pequenas decisões técnicas.

Quando houver múltiplas opções:

1. escolha a mais segura;
2. escolha a mais simples;
3. documente a decisão.

Somente bloqueie caso a ação dependa genuinamente de:

```text
credential
human authorization
production environment
business decision
```

---

# 180. NÃO EXECUTAR AÇÕES DE PRODUÇÃO SEM AUTORIZAÇÃO

Não:

```text
deploy production
send real WhatsApp
touch real patient data
change DNS
rotate real secrets
modify remote branch protection
```

sem autorização explícita.

Use adapters controlados e evidência local.

---

# 181. AO ENCONTRAR FALHAS

Não esconda.

Corrija quando possível.

Se não puder corrigir:

```text
record finding
severity
evidence
mitigation
blocking status
```

---

# 182. FINAL SUCCESS BLOCK

Ao final produza um bloco estruturado:

```text
PHASE 10 FINAL RESULT

Baseline commit:
Final commit:

Architecture:
Security:
Reliability:
Agent Engineering:
Testing:
Observability:
Data Governance:
Production Readiness:

P0:
P1:
P2:

Tests:
Postgres:
E2E:
Security:
Evals:
Chaos:
Load:
Backup/Restore:

RPO:
RTO:

Model Provider:
Channel:
External Identity:
Human Signoff:

Certification:
GO / CONDITIONAL_GO / NO_GO

Remaining blockers:
1.
2.
3.
```

---

# 183. SUCCESS BLOCK MECANICAMENTE VERIFICÁVEL

Além do relatório humano, gere:

```text
certification/phase10-result.json
```

com schema validado.

O resultado deve ser derivável por script.

Adicione:

```bash
npm run certification:verify
```

que:

- lê os artifacts;
- verifica hashes;
- verifica gates;
- valida schema;
- calcula decisão;
- retorna exit code `0` apenas quando o estado esperado for coerente.

Não permita que um arquivo Markdown seja a única prova da certificação.

---

# 184. META FINAL

O resultado desejado é transformar:

```text
Advanced Controlled Agent Platform
```

em:

```text
Production-Assured,
Policy-Governed,
Auditable,
Failure-Resilient,
Agentic Operations Platform
```

com qualidade genuinamente próxima de:

# STATE OF ART — TRIPLE AAA

A certificação deve ser conquistada por evidência, não por declaração.

Comece agora analisando o estado real do repositório e executando a Phase 10.0. . Me entregue um programa State of Art, Triplo AAA de qualidade.
