# Security and release boundary — Agent Platform

# PLAT-S48 — determinismo de approval e testes controlados

- `CapabilityGatewayOptions.now` é uma seam TypeScript interna, com default
  para relógio real; não é configurável por input externo nem altera o
  contrato HTTP de approval.
- A boundary continua fail-closed: clock inválido/lançando e expiração local
  não alcançam autoridade durável nem handler; approval válida usa o clock
  compartilhado no fixture e a autoridade continua decidindo consumo único,
  binding, revogação e expiração durável.
- A asserção web usa o escopo semântico da `Timeline selecionada`; preview e
  timeline continuam superfícies distintas na UI.
- S48 está `COMPLETED_CONTROLLED` em `AUDIT`; verify 127 arquivos/537 testes
  pass, 2 arquivos/19 skipped; coverage 84.87/80.12/84.98/85.98; PostgreSQL
  8/72; E2E 4/4; readiness 4/4; worker smoke; build 158 módulos; audit 0;
  typecheck, lint, format e diff check PASS.
- Evidência:
  `docs/04_audit/0538_plat-s48_controlled_deterministic_clock_and_test_contract_evidence.md`.
- Nenhum provider/canal/RAG/rede/dado real/segredo/side effect foi ativado;
  produção permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

# PLAT-S47 — modo de criação multi-agente controlado

- `Novo agente` deve limpar somente estado local derivado da seleção; não pode
  apagar identidade/tenant nem reutilizar `agentId` ou `versionId` anterior.
- A criação continua protegida pela API Admin tenant-aware e pelas validações
  server-side existentes. A UI não é autoridade de RBAC ou isolamento.
- S47 está `COMPLETED_CONTROLLED` em `AUDIT`, com gate
  `SPEC_APPROVED_CONTROLLED_BUILD`; RED provou o bloqueio inicial e GREEN
  provou Agent A/B sem state bleed, inclusive respostas tardias no mesmo
  tenant e durante troca de identidade/tenant. O reset preserva catálogos
  tenant-wide somente dentro do tenant corrente.
- A lane não autoriza provider/canal real, RAG, rede, broker, deploy, dado real
  ou side effect.

## Auditoria corretiva S47 — fronteiras de leitura e visualização

- As rotas HTTP de suites e release candidates rejeitam requests sem
  `agentId`; o cliente também falha fechado para valor vazio antes da leitura.
- O Trace Viewer não expõe histórico sem agente, filtra por `agentId`, aplica
  redaction recursiva no payload e normaliza shape legado antes de renderizar.
- O App usa geração monotônica nos view scopes para impedir que callbacks
  antigos contaminem o estado após trocas de identidade, tenant ou agente,
  inclusive A→B→A. O teste negativo `spans: {}` passou sem crash.
- Gates: 127 arquivos/534 testes PASS, 2 arquivos/19 skipped; coverage
  84,86/80,12/84,97/85,97; build 158 módulos; E2E 4/4; PostgreSQL 8/72;
  readiness 4/4; worker smoke; audit 0; typecheck, lint, format e diff check
  PASS. A crítica independente compatível retornou `PASS_CONTROLLED`, sem
  P0/P1/P2/P3.
- Nenhum provider, canal, RAG, rede, dado real, segredo ou side effect foi
  ativado; produção permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

# PLAT-S46 — correlação parental da execução controlada

- Cada execução controlada resolve um `traceId` bounded antes do primeiro
  evento; o valor é validado no boundary e propagado para lifecycle events,
  hooks, runtime publicado, gateway, approvals, tool audits e sinks.
- `event.id` e `correlationId` continuam IDs locais. O trace não concede
  autorização, approval, permissão, tenant access ou capacidade de executar.
- Trace inválido falha fechado antes de lookup, provider, handler, evento ou
  transação. Persistência valida parentesco de tenant/agente/versão e não usa
  payload externo como autoridade.
- S46 está `COMPLETED_CONTROLLED` em `AUDIT`; os gates finais passaram com
  126 arquivos/523 testes pass, 2 arquivos/19 testes skipped, coverage
  85,07/80,06/85,95/86,10, PostgreSQL 8/72, E2E 4/4, readiness 4/4, worker
  smoke, build, typecheck, lint, format e audit 0. Revisão compatível
  read-only: `PASS` sem P0/P1/P2.
- Evidência:
  `docs/04_audit/0536_plat-s46_controlled_execution_trace_correlation_boundary_evidence.md`.
- A lane não autoriza OTel/exporter, tracing distribuído, provider/canal real,
  rede, RAG, broker, outbox, egress, deploy, dado real ou side effect.

# PLAT-S45 — fronteira de invocação de tools controladas

- O Capability Gateway deve exigir validators server-side de input e output
  associados a cada tool compilada; catálogo, browser, job e modelo não podem
  fornecer função, schema executável ou grant.
- Actor, escopo, tool input e resultado de handler são dados não confiáveis e
  precisam de shape bounded antes de approval, auditoria ou handler. Input
  inválido não consome approval; resultado inválido não retorna payload bruto;
  `actor.permissions` não é autoridade.
- A autorização efetiva vem de callback server-side; ausência de authorizer,
  grant inválido ou permissão ausente falha fechado. Approval exige autoridade
  durável, binding de input e consumo single-use.
- S45 está `COMPLETED_CONTROLLED` em `AUDIT` após BUILD e revisão independente
  compatível read-only (`PASS sem P0/P1`), com gate
  `SPEC_APPROVED_CONTROLLED_BUILD`; discovery reproduziu input arbitrário no
  handler, exceção não controlada para actor inválido e retorno de data sem
  projeção.
- Evidência:
  `docs/04_audit/0535_plat-s45_controlled_tool_invocation_boundary_evidence.md`.
- O lane não autoriza import dinâmico, marketplace, provider/canal real, rede,
  RAG, broker, outbox, egress, deploy, dado real ou side effect.

## PLAT-S41 — output safety controlada

- Texto retornado pelo provider, template ou knowledge é dado não confiável na
  fronteira final; proveniência `controlled://` não é autorização de conteúdo.
- `enforceControlledOutput` deve validar tipo, vazio, limite, redaction e
  padrões de diagnóstico, prescrição, dose/medicação, tratamento, prontuário,
  pagamento e mutação de agenda antes de `response.after`/trace.
- Saída inválida ou insegura falha fechado para fallback seguro. Se o modo
  final for `handoff`, o runtime deve registrar destino, prioridade e motivo
  sem duplicar o evento; nenhum texto rejeitado pode aparecer em evento,
  auditoria, response ou token usage.
- Qualquer output `rewritten` bloqueia planning, capability, approval e execute
  de tools; output policy não autoriza provider, canal ou ação sensível, e a
  policy de input/hard safety continua sendo executada antes.
- S41 está `COMPLETED_CONTROLLED` em `AUDIT`, com gate
  `SPEC_APPROVED_CONTROLLED_BUILD`; a evidência é
  `docs/04_audit/0531_plat_s41_controlled_output_safety_boundary_evidence.md`.
- A lane não autoriza provider/canal/RAG real, dados reais, secret manager,
  broker, outbox, egress, deploy ou side effect.

## PLAT-S40 — identidade do provider/model controlado

- A configuração genérica de provider/model não concede capacidade de execução;
  o runtime controlado deve resolver somente pelo registry compilado do servidor.
- O único binding executável desta lane é `fake/deterministic-v1`; provider
  desconhecido, modelo divergente e `fallbackProvider` presente falham fechado
  antes da pipeline e sem mutação/efeito.
- A regra é compartilhada entre Test Lab, runtime publicado, API e worker; não
  há fallback implícito, inferência de versão, chamada externa ou segredo
  material. `secretRef` continua sendo apenas referência redigida.
- O registry precisa preservar snapshots/listas sem mutação incidental e
  rejeitar registro duplicado. O trace só pode receber a identidade resolvida e
  `externalCall: false`.
- S40 está `COMPLETED_CONTROLLED` após focused/regressão, gates integrados e
  revisão independente; evidência em
  `docs/04_audit/0530_plat_s40_controlled_model_provider_identity_evidence.md`.
- O lane não autoriza provider/canal/RAG real, secret manager, broker, retry ou
  fallback operacional, egress, deploy, dado real ou side effect.
- RED S40 reproduziu 4 falhas antes do GREEN: identidade não registrada e
  fallback passaram, e a identidade `openrouter/external` apareceu no trace
  após eventos de runtime. O caso foi local e sem efeito externo.
- GREEN focado S40 passou 4 arquivos/19 testes na regressão final. Registry/
  resolução exata falha antes da pipeline para identidade não suportada ou
  fallback, mantendo o provider determinístico sem chamada externa. Gates
  finais: 121 arquivos/446 testes/19 skips, coverage 85,08/80,11/85,17/86,07,
  PostgreSQL 8/72, E2E 4/4, readiness 4/4, build, typecheck, lint, format,
  audit 0 e diff check PASS; revisão follow-up `PASS sem achados estáticos`.

## PLAT-S39 — integridade do lifecycle do release candidate

- `DRAFT -> VALIDATED` deve verificar o schema dos quatro gates e o digest
  recomputado do candidate antes de escrever status, actor ou timestamp.
- Digest divergente, gate inválido, duplicado, incompleto ou não `PASS` falha
  fechado sem mutação; a regra é compartilhada entre memória e PostgreSQL.
- O validador deve ser diferente de `createdBy`; `gate_results` não-array ou
  shape inválido no PostgreSQL falha com erro controlado, sem normalização para
  lista vazia.
- O lock `FOR UPDATE`, tenant scope e CAS existentes permanecem obrigatórios;
  a transição não cria autorização de publish/deploy ou produção.
- A migration aditiva `0009_release_candidate_validator_integrity` reforça no
  PostgreSQL que uma RC `VALIDATED` precisa de `validated_by` distinto de
  `created_by`; registros incompatíveis não passam pelo rollout.
- S39 está `COMPLETED_CONTROLLED` após RED/GREEN, correção, gates integrados e
  revisão independente final `PASS sem achados`; sua evidência é
  `docs/04_audit/0529_plat_s39_controlled_release_candidate_lifecycle_integrity_evidence.md`.
- O lane não autoriza dados reais, RAG, provider/canal, egress, broker,
  outbox, deploy ou side effect.

## PLAT-S38 — paridade do input de knowledge no worker

- O job strict reutiliza `ApprovedKnowledgeForTestSchema`, limitando source a
  `controlled://`, versão/resposta bounded e objeto sem chaves extras.
- O worker somente encaminha o payload parseado ao executor com versão pinned;
  não aceita código, grant, fonte externa ou fallback para outra versão.
- `history` usa o limite controlado comum de 50; excesso falha antes do store.
- S38 foi fechado como `COMPLETED_CONTROLLED`; evidência em
  `docs/04_audit/0528_plat_s38_controlled_worker_knowledge_input_parity_evidence.md`.
- O lane não autoriza broker, retry distribuído, RAG, provider/canal, egress,
  outbox, dados reais, deploy ou side effect.

## PLAT-S37 — autoridade server-side de evidência de release

- Publish e rollback não podem aceitar uma versão apenas porque ela está
  `APPROVED`; cada mutação exige `releaseCandidateId` válido no mesmo tenant,
  agente e versão fonte/alvo.
- O candidato precisa estar `VALIDATED`, conservar digest recomputável e os
  quatro gates fixos em `PASS`; status DRAFT, REJECTED, ARCHIVED, digest
  adulterado e binding divergente falham fechado antes da mutação.
- O preflight crítico continua sendo calculado pelo servidor sobre a versão,
  e não por gates ou referências escolhidos pelo browser. O candidato é
  evidência controlada, não grant de produção, deploy ou efeito externo.
- No rollback, somente a configuração da versão fonte é clonada; a publicação
  do snapshot derivado permanece dentro da operação autorizada e não reutiliza
  o candidato para outra versão.
- S37 não autoriza dados reais, RAG, provider/canal, egress, broker, outbox,
  deploy, rollout ou side effect.
- S37 foi fechado como `COMPLETED_CONTROLLED` após focused/regressão, coverage
  acima de 80%, PostgreSQL, E2E, readiness, worker smoke, build, lint, format,
  audit 0 e diff check; evidência em
  `docs/04_audit/0527_plat_s37_controlled_publish_evidence_authority_evidence.md`.

## PLAT-S36 — limite do payload de knowledge controlada

- O runtime deve validar `approvedKnowledge` mesmo quando chamado por worker ou
  integração interna; o schema da rota isoladamente não é autoridade suficiente.
- Source aceita somente `controlled://`, com versão/resposta bounded e objeto
  strict. Payload inválido falha antes de knowledge resolution, prompt, modelo e
  tool.
- O binding configurado continua sendo a autoridade de source+version; o
  payload não aprova fonte, não carrega código e não habilita RAG.
- O lane não autoriza ingestão, conteúdo real, URL externa, provider, canal,
  egress, broker, outbox, deploy ou side effect.
- S36 foi fechado como `COMPLETED_CONTROLLED` após verify 117/422/19 skips,
  coverage 85,05/80,31/85,11/86,07, readiness, worker smoke, E2E 4/4,
  PostgreSQL 8/71, audit 0 e revisão independente sem CRITICAL/HIGH. Evidência:
  `docs/04_audit/0526_plat_s36_controlled_knowledge_input_boundary_evidence.md`.

## PLAT-S35 — limite controlado do registry de tools

- S35 está registrado para exigir binding habilitado com versão exata,
  resolução por registry compilado, planner por intent, deduplicação e
  bloqueio de colisões antes do handler.
- O catálogo de plugins continua metadata-only: não armazena código executável,
  não cria handlers e não concede permissões. Tools não registradas pelo
  servidor permanecem bloqueadas mesmo que um manifesto seja salvo/aprovado.
- A API deriva a permissão do handler registrado no servidor e revalida a versão
  da configuração antes do approval/runtime; request, modelo e job não são
  autoridade de grant.
- O lane não autoriza import dinâmico, marketplace, provider, canal, egress,
  broker, outbox, dado real, deploy ou side effect.
- S35 foi fechado como `COMPLETED_CONTROLLED` após verify 115/417/19 skips,
  coverage 84,99/80,30/85,11/86,01, readiness, smoke, E2E 4/4, PostgreSQL
  8/71, audit 0 e diff check. Evidência:
  `docs/04_audit/0525_plat_s35_controlled_tool_registry_identity_evidence.md`.

## Implementado e verificável

- Todo endpoint novo valida body, IDs, tenant, status e fonte controlada com Zod.
- Queries PostgreSQL do control plane são parametrizadas e sempre incluem `tenant_id`.
- Em produção, headers autoafirmados não autenticam operadores; o processo exige `operatorIdentityResolver` confiável e identidade tenant-bound.
- Webhooks em produção exigem `webhookVerifier`; sem verificador o endpoint fecha com `401`.
- O `HmacWebhookVerifier` controlado valida HMAC-SHA256 sobre o corpo JSON bruto recebido, event id, janela temporal, rotação de segredo e replay single-use por `WebhookReplayStore`; a implementação em memória é somente fixture e a store PostgreSQL faz purge oportunista de entradas expiradas.
- Rate limiting em memória e headers defensivos (`nosniff`, `DENY`, `no-referrer`) estão ativos no Fastify.
- O boundary HTTP S18 normaliza origins por `URL.origin`, rejeita wildcard,
  `null`, path e credenciais, aplica CORS/preflight fail-closed com
  `GET/POST/PATCH/OPTIONS` e headers allowlisted, preserva chamadas sem Origin
  para server-to-server e não emite credentials.
- Quando configurado, o API exige `request.protocol=https` usando somente
  `trustedProxyHops` explícito; sem transporte seguro retorna `426`. HSTS é
  emitido apenas em request HTTPS, e o bootstrap production exige
  `API_ALLOWED_ORIGINS` e `API_REQUIRE_HTTPS=true`.
- O S19 adiciona métricas process-local bounded de método, template de rota,
  status e latência, com snapshot defensivo e `/health/metrics` read-only;
  rotas não casadas são agrupadas e nenhum path/query/body/header sensível ou
  identidade é armazenado. Isso não substitui métricas distribuídas,
  alerting, retenção ou operação HA.
- O S20 limita a memória do rate limiter process-local com `maxBuckets`, purge
  de expirados, evicção determinística, policy/key validation, snapshot sem
  chaves e `Cache-Control: no-store` no 429. Isso não substitui limiter
  distribuído, edge, fairness multi-instância ou HA.
- O S21 fechou a exposição de `/health/metrics`: a rota é habilitada somente em
  test/development e falha fechado em production, staging ou ambiente
  desconhecido, inclusive diante de override; a solução não cria auth/edge
  operacional. Evidência: `docs/04_audit/0511_plat_s21_controlled_metrics_exposure_boundary_evidence.md`.
- O S22 fechou a publicação do `meta.correlationId` do envelope em
  `X-Correlation-Id`, expondo-o ao browser somente em CORS aprovado e nunca
  aceitando/refletindo um header externo; não cria tracing distribuído ou
  observabilidade operacional. Evidência:
  `docs/04_audit/0512_plat_s22_controlled_correlation_response_boundary_evidence.md`.
- O S23 substituiu o `console.error(error)` bruto do startup por evento JSON
  bounded e redaction-safe, ocultando credenciais, tokens, PII, stack e cause;
  o exit 1 e o fail-closed permanecem. Evidência:
  `docs/04_audit/0513_plat_s23_controlled_startup_failure_redaction_evidence.md`.
- O S24 fixa bodyLimit de 1 MiB e transforma falhas de JSON/media type/body
  excessivo em envelopes 400/415/413 seguros, com fallback 500 genérico e
  correlation ID server-generated; raw body, stack, cause e mensagens do
  framework não são refletidos. Evidência:
  `docs/04_audit/0514_plat_s24_controlled_http_parse_payload_boundary_evidence.md`.
- O S25 fechou o 404 padrão que refletia o request-target: o limite de 8192
  bytes do target, o 414 redaction-safe e `maxParamLength` explícito em 100
  estão verificados sem echo do path/query. Evidência:
  `docs/04_audit/0515_plat_s25_controlled_http_target_boundary_evidence.md`.
- O S26 fechou mensagens de `DomainError` do Prompt Profile que interpolavam
  chaves/IDs fornecidos no payload. O clone inválido permanece 400 sem echo e
  sem nova versão. Evidência:
  `docs/04_audit/0516_plat_s26_controlled_error_message_boundary_evidence.md`.
- O S27 foi fechado como `COMPLETED_CONTROLLED`: o `offset` de paginação fica
  limitado a 10.000, valores negativos/fracionários/não seguros falham antes
  do repositório em conversas e audit evidence, e o limite inclusivo é coberto
  por testes. Evidência:
  `docs/04_audit/0517_plat_s27_controlled_pagination_offset_boundary_evidence.md`.
- O S28 está registrado para rejeitar filtros repetidos de audit evidence antes
  de summary/page; a descoberta mostrou que `sessionId=a&sessionId=b` escolhe
  silenciosamente o primeiro valor. O lane foi fechado como
  `COMPLETED_CONTROLLED`; evidência:
  `docs/04_audit/0518_plat_s28_controlled_audit_filter_duplicate_boundary_evidence.md`.
- O S29 foi fechado como `COMPLETED_CONTROLLED`: limites por campo em
  `POST /v1/tasks` são aplicados antes do repositório — `sessionId` 160,
  `title` 200, `description` 4.000, `source` 120 e `idempotencyKey` 200 — e
  entradas excedentes não são refletidas. A descoberta e os testes usaram
  somente fixtures e dados fictícios. Evidência:
  `docs/04_audit/0519_plat_s29_controlled_internal_task_field_boundary_evidence.md`.
- O S30 foi registrado para impor limites em `POST /v1/approvals` antes de
  `approvals.save`: `sessionId` 160, `proposedAction` 200 e `summary` 4.000.
  O lane foi fechado como `COMPLETED_CONTROLLED`; a reprodução usou somente
  approval pending e sessão/tenant fictícios, sem decisão automática. Evidência:
  `docs/04_audit/0520_plat_s30_controlled_approval_request_field_boundary_evidence.md`.
- O S31 está registrado para impor máximo de 4.000 em `note` no payload de
  decisão de approval antes de `approvals.save`; a descoberta aceitou 5.000
  caracteres em fixture e persistiu somente o estado `approved`, sem ecoar ou
  persistir a nota. O lane foi fechado como `COMPLETED_CONTROLLED`; a nota
  excedente agora falha antes do repositório e não altera decisão, identidade,
  handoff ou side effect. Evidência:
  `docs/04_audit/0521_plat_s31_controlled_approval_decision_note_field_boundary_evidence.md`.
- O S32 está fechado como `COMPLETED_CONTROLLED`: `SessionRecord` guarda um
  par opcional e completo de agent/version; a migration 0008 usa FKs compostas
  tenant-aware, o primeiro binding é monotônico e bloqueado por linha no
  PostgreSQL, e continuations aceitam o snapshot `ARCHIVED` original. Não há
  backfill, fallback para outra versão, provider/tool externo ou side effect.
  Evidência:
  `docs/04_audit/0522_plat_s32_controlled_session_version_pinning_evidence.md`.
- O S33 está fechado como `COMPLETED_CONTROLLED`: o worker valida job
  strict/bounded, exige tenant/agent/version pinned, delega somente ao runtime
  publicado, rejeita legacy/limites/status/mismatch sem fallback e não inicia
  bootstrap sem queue adapter. O parser reside em `agent-core` para preservar
  a boundary de dependências; o entrypoint emite somente erro bounded e exit 1.
  Evidência:
  `docs/04_audit/0523_plat_s33_controlled_worker_runtime_boundary_evidence.md`.
- O S34 está fechado como `COMPLETED_CONTROLLED`: o workflow fixa
  `contents: read`, concurrency cancelável, checkout sem credenciais
  persistentes, `npm ci --ignore-scripts`, readiness, verify, smoke do worker,
  PostgreSQL, E2E e `git diff --check`. O smoke executa o entrypoint real sem
  adapter e exige exit 1 com JSON `worker.startup_failed/queue_adapter_missing`
  sem bootstrap, stack ou cause. Nenhum container scan é simulado sem imagem.
  Evidência: `docs/04_audit/0524_plat_s34_controlled_ci_gate_parity_evidence.md`.
- Traces e auditoria não recebem credenciais; payloads de auditoria são minimizados/redigidos.
- O provider do Test Lab é determinístico e declara `externalCall: false`.
- O runtime publicado usa somente o actor/gateway controlado neste slice; `scheduling.controlled` retorna fixtures determinísticas e nunca cria, confirma, cancela ou remarca consulta.
- Continuação inbound exige par de IDs validado e escopado pelo tenant, e o estado de takeover é transacional no PostgreSQL; mensagens continuam sendo persistidas, mas o bot não executa provider/tool durante takeover humano.
- Histórico de Test Lab/execution traces é persistido por tenant e redigido para PII comum antes da gravação; a UI mostra apenas evidência controlada.
- Mensagens outbound do runtime controlado entram na timeline somente após redaction; sender references são mascaradas e a continuidade usa fingerprint tenant-scoped, sem armazenar o identificador bruto.
- O runtime limita o histórico enviado ao provider e revalida o estado de takeover antes de emitir resposta; durante takeover humano o bot permanece silencioso.
- Strings livres de evidência de auditoria e texto de trace são redigidos na fronteira de persistência, além da remoção de campos sensíveis por chave.
- Em `NODE_ENV=production`, a configuração falha fechada sem PostgreSQL; a migração inicial executa em transação e registra `schema_migrations`, mantendo a compatibilidade com tenant nulo do legado bloqueada.
- Fora de `NODE_ENV=test`, mutações exigem identidade por padrão; a opção permissiva existe somente para fixtures de teste e não pode desativar a proteção em produção.
- O Control Center clona uma versão em novo DRAFT, valida tenant/agent/source e registra a operação; a versão-fonte permanece imutável.
- Políticas `requires_approval` são convertidas em handoff seguro no Test Lab e o CapabilityGateway bloqueia a execução sem approval estruturado/verificado; `approvalGranted` booleano não faz parte do contrato.
- Approval capability durável é persistido com binding completo, input hash, nonce único, expiry, revocation, single-consume, `FORCE RLS` e trigger de binding imutável; o runtime `postgres-pool` usa conexão tenant-scoped e transacional checked-out.
- Traces e test runs validam a associação tenant/agent/version antes da persistência, tanto no store em memória quanto no repositório PostgreSQL.
- Publicação PostgreSQL bloqueia a versão alvo e a linha de controle do agent na mesma transação; a serialização deste slice não substitui o controle de concorrência multioperador completo.
- O Trace Viewer exibe policy, knowledge, handoff, resposta e provider já redigidos, mantendo `externalCall: false`; a UI preserva plugins desconhecidos e flags reais desligadas ao clonar.
- O runner lê `schema_migrations` antes de reaplicar a versão inicial; corridas de idempotência PostgreSQL de inbound e tarefas são reconciliadas por releitura do registro vencedor, sem duplicação.
- Inbound runtime usa estado persistente `pending/completed`: falha antes do commit libera o replay HTTP e permite reprocessamento seguro da mesma mensagem; a finalização PostgreSQL é transacional e marca o inbound somente junto com os efeitos controlados e evidências.
- `PLAT-S03` adiciona runner versionado com checksum, migration `0001_tenant_isolation`, colunas tenant explícitas nos registros legados, FKs compostas `NOT VALID`, quarentena de IDs sem mapeamento determinístico e policies `USING/WITH CHECK` com `FORCE ROW LEVEL SECURITY`.
- O caminho PostgreSQL tenant-scoped usa pool e conexão dedicada, define `cvg.tenant_id`, restaura/verifica `search_path`, exige role de runtime sem superuser/BYPASSRLS/ownership/DDL/DELETE/TRUNCATE e sem acesso à quarentena, e limpa o contexto antes do release; o modo de conexão única permanece apenas para compatibilidade controlada sem RLS.
- O runner de production falha quando encontra marcador de migration sem checksum confiável; com RLS habilitado, o startup também verifica no catálogo que todas as tabelas protegidas têm `ENABLE/FORCE RLS` e policy tenant-bound, aplica `POSTGRES_SCHEMA` ao pool runtime e exige role de migration separada, sem superuser/BYPASSRLS/memberships administrativas, proprietária do conjunto DDL gerenciado.
- Auditoria e outbox legados nunca atribuem tenant a partir de `payload.tenantId`: somente relações existentes de sessão/conversa/agente/version são autoridade; claim divergente, relação ausente ou registro órfão permanece com `tenant_id` nulo, recebe quarentena persistente e fica invisível sob `FORCE RLS`.
- O lockfile foi auditado com `npm audit --audit-level=high` sem vulnerabilidades.
- O bootstrap de produção exige `INBOUND_TENANT_ID` validado para o modo controlado de tenant único, ou um resolver tenant-bound injetado no factory; ausência de ambos fecha o startup/webhook. Isso não substitui IdP, provisionamento ou roteamento multi-tenant operacional.
- O bootstrap também exige `INBOUND_AGENT_ID` validado (ou runtime injetado) e um `operatorIdentityResolver` confiável; sem esses vínculos o processo fecha antes de aceitar inbound ou mutações operacionais. O agente fixo é somente o modo controlado de tenant único.
- A replay store PostgreSQL compartilha reservas entre instâncias, purga expirados e recupera reservas `reserved` stale após lease de 30 segundos; a operação real ainda exige HA, métricas, retenção e runbook aprovados.
- Capability approval separa issuer e executor, exige `approval:execute` para consumir e registra evidência `approval_decision` sanitizada na mesma transação do consumo durable.
- A evidência reproduzível da rodada PLAT-S03 está em `docs/04_audit/0494_plat_s03_tenant_isolation_evidence.md`; PLAT-S04 e webhook controlado estão em `docs/04_audit/0495_plat_s04_durable_approval_and_webhook_evidence.md`.

## Bloqueios antes de qualquer produção real

- Integrar o resolver de identidade a um IdP real, com tenant derivado da sessão/token, rotação, expiração e revisão de permissões.
- Trocar o rate limiter em memória por um componente distribuído e configurar limites por tenant/operador/IP conforme operação.
- Integrar e provar CSRF/CORS/HTTPS/TLS/CSP no host que servir o console; o
  boundary HTTP aplicacional S18 está controlado, mas não substitui Caddy,
  CDN, ingress, proxy ou host real. O API não usa cookie de sessão, mas o host
  deve preservar esse contrato.
- Executar a migration `0001` e o plano de backfill em banco real sob change control; a evidência controlada não substitui validação de schema, ownership, role mapping, janela de lock e rollback, e linhas históricas ambíguas permanecem em quarentena/invisíveis.
- Integrar IdP, provisionamento/rotação da role de migration separada e rotação operacional antes de ativar RLS em tenant real; o fixture não substitui signoff.
- Expandir o adapter do `ToolRegistry` além da allowlist controlada somente após capability manifests, approval e side-effect controls de cada ferramenta real.
- Operacionalizar a replay store PostgreSQL ou substituí-la por Redis/serviço distribuído com TTL, HA, métricas e política de recuperação aprovados; validar o contrato de raw-body/segredo por provider real e executar purge operacional contínuo.
- Integrar IdP e issuer/verifier operacional real, com identidade do aprovador, rotação de secrets, escopo de ação, expiração, revogação e auditoria antes de qualquer plugin real.
- Obter decisão humana sobre RAG institucional, retenção, cargos reais e habilitação de canais/ações sensíveis.
- Migrar/validar a política de retenção e PII para dados reais; a redaction atual é uma barreira de MVP, não substitui classificação, DLP ou aprovação jurídica.
- Implementar retenção/purge operacional e leases/cancelamento/compensação para providers e canais reais; o scheduling atual permanece fixture-only.
- Completar concorrência multioperador do control plane PostgreSQL (controle otimista, conflitos de edição e auditoria operacional); o lock transacional de publicação deste slice cobre apenas a serialização básica do publish.

## Veredito operacional

`CONTROLLED_MVP_READY`: o slice é reproduzível com fixtures fictícias, ambiente de teste e aprovação interna. `PRODUCTION_REAL_DATA_READY`: não autorizado.

Evidência S18: `docs/04_audit/0508_plat_s18_controlled_http_security_boundary_evidence.md`.
Evidência S19: `docs/04_audit/0509_plat_s19_controlled_request_observability_metrics_evidence.md`.
Evidência S20: `docs/04_audit/0510_plat_s20_controlled_rate_limit_memory_safety_evidence.md`.
Evidência S23: `docs/04_audit/0513_plat_s23_controlled_startup_failure_redaction_evidence.md`.
Evidência S24: `docs/04_audit/0514_plat_s24_controlled_http_parse_payload_boundary_evidence.md`.
