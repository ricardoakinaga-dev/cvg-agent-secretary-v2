# SPEC — Control Plane Foundation e Test Lab dry-run

## PLAT-S47 — Boundary de criação de múltiplos agentes na UI

### Contrato

`PlatformPanel` terá dois modos explícitos: `create-agent`, sem agente/versão
selecionados, e `edit-agent`, com um agente selecionado. O comando `Novo agente`
deve produzir um novo estado de formulário a partir de `initialForm` e limpar
`selectedAgent`, `version`, `versions`, `trace`, `selectedSuite`, `suiteRun` e
release candidates derivados do agente anterior. Catálogos tenant-wide de
plugins e fontes de knowledge permanecem disponíveis no mesmo tenant; uma
mudança de `operatorId`, `role` ou `tenantId` invalida o escopo anterior,
limpa as coleções tenant-scoped e recarrega somente o novo contexto.

Toda continuação assíncrona iniciada para o painel deve capturar um token de
escopo derivado de identidade/tenant e verificar esse token antes de aplicar
estado, erro, loading ou iniciar uma continuação de escrita. Respostas tardias
de agente, versão, trace, suite, catálogo ou ledger não podem contaminar o
contexto corrente.

O botão de criação deve continuar chamando `POST /v1/admin/agents` no modo
`create-agent`, seguido de criação da primeira versão; no modo `edit-agent`, a
ação permanece `clonePlatformVersion`. A UI não é autoridade de tenant/RBAC:
os headers e validações server-side existentes continuam obrigatórios.

### Invariantes

1. O modo de criação nunca envia `agentId` de outro agente nem reutiliza uma
   versão selecionada.
2. Agent A e Agent B criados na mesma sessão têm IDs/slugs distintos, pertencem
   ao tenant da identidade e podem carregar configurações diferentes no mesmo
   kernel.
3. `Novo agente` não apaga a identidade do operador nem altera dados já
   persistidos; somente o estado local derivado é substituído.
4. Selecionar um agente existente continua exibindo suas próprias versões e
   qualquer edição cria snapshot novo, nunca mutação in-place.
5. Loading, erro e conflito não ficam silenciosos; não há provider, canal,
   RAG, rede ou efeito externo.
6. Trocar identidade/tenant com requests pendentes não permite state bleed, e
   o reset `Novo agente` não descarta catálogos tenant-wide do tenant atual.

### Registro e limites

`PLAT-S47-001_CONTROLLED_MULTI_AGENT_CREATION_MODE` está registrado antes do
BUILD com gate `SPEC_APPROVED_CONTROLLED_BUILD`. O focused deve usar interação
real do componente e validar os requests observados; sem mudança no kernel,
schema ou ativação de produção.

### Fechamento de auditoria S47 — 2026-08-26T12:48:37-03:00

Status: `COMPLETED_CONTROLLED` em `AUDIT`. RED reproduziu o dead-end após o
primeiro agente; GREEN cobriu A/B, re-seleção/clone, resposta tardia no mesmo
tenant, troca de tenant/identidade e preservação de catálogos. A revisão e os
gates finais estão registrados na evidência
`docs/04_audit/0537_plat-s47_controlled_multi_agent_creation_evidence.md`.

### Auditoria corretiva S47 — 2026-08-26

Além dos invariantes de criação A/B, a boundary exige agora que a leitura de
suites e release candidates carregue `agentId` válido tanto no cliente quanto
na rota HTTP. O Trace Viewer não renderiza histórico sem agente, filtra o
agente atual, redige strings recursivamente e trata `spans` legado não-array
como trace sem spans. O token de view usa geração monotônica para invalidar
callbacks antigos mesmo após retorno à mesma chave A→B→A.

RED/ GREEN e gates: regressão 127 arquivos/534 testes PASS, 2 arquivos/19
skipped; coverage 84,86/80,12/84,97/85,97; PostgreSQL 8/72; E2E 4/4;
readiness 4/4; worker smoke; build 158 módulos; audit 0; typecheck, lint,
format e diff check PASS. A crítica independente compatível retornou
`PASS_CONTROLLED`, sem P0/P1/P2/P3, e foi registrada na evidência; produção
permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S46 — Boundary de correlação única da execução

### Contrato

`TestRunTrace.traceId` é a identidade bounded da execução inteira. O executor
deve resolver um único ID antes de qualquer evento, usando um `traceId` interno
validado quando fornecido ou `createTraceId()` quando ausente. O mesmo valor é
usado no trace final e passado a:

- `PlatformEventInput.traceId` e `PlatformEventEnvelope.traceId`, mantendo o
  `PlatformEventEnvelope.id` único por evento;
- `CapabilityExecutionInput.traceId` e `PluginAuditEvent.traceId`, mantendo o
  `CapabilityExecutionResult.correlationId` como correlação local da chamada;
- runtime publicado, Test Lab, approval execution e callbacks de auditoria;
- cópias/sinks de trace, sem mudar o `trace_id` relacional já existente.

Os boundaries validam `TraceIdSchema`, rejeitam proxies/valores malformados
antes de emitir eventos ou executar provider/tool, e nunca aceitam um ID de
header/body externo como autoridade. A ausência de `traceId` em uma chamada
standalone de gateway cria apenas um ID controlado para aquela invocação; o
kernel sempre o fornece e não cria outro para cada tool.

### Invariantes

1. Uma execução tem um e somente um `traceId`.
2. Todo evento emitido pelo executor e toda auditoria de tool dessa execução
   carrega esse mesmo `traceId`.
3. `event.id` e `PluginAuditEvent.correlationId` continuam IDs locais e não são
   sobrescritos pelo parent trace.
4. Trace, tenant, agente e versão permanecem coerentes; `traceId` não concede
   autorização, approval, permissão ou acesso cross-tenant.
5. Dados legados sem a extensão opcional de evento seguem compatíveis; um
   trace persistido continua exigindo `traceId` canônico.

### Registro e limites

`PLAT-S46-001_CONTROLLED_EXECUTION_TRACE_CORRELATION_BOUNDARY` está registrado
antes do BUILD com gate `SPEC_APPROVED_CONTROLLED_BUILD`. Testes focados devem
cobrir propagação, identidade única, rejeição de ID inválido, standalone
gateway, hooks e ausência de payload sensível. Sem tracing externo, rede,
broker, provider/canal real, RAG, deploy, dado real ou side effect.

### Fechamento de auditoria S46 — 2026-08-26T11:22:54-03:00

Status: `COMPLETED_CONTROLLED` em `AUDIT`. O focused RED teve 8 falhas
esperadas em 4 arquivos/33 testes; o GREEN de fechamento passou 6 arquivos/25
testes. A regressão passou 126 arquivos/523 testes, com 2 arquivos/19 testes
skipped. Coverage: 85,07% statements, 80,06% branches, 85,95% functions e
86,10% lines. PostgreSQL 8/72, readiness 4/4, worker smoke, E2E 4/4, build 70
módulos, audit 0, typecheck, lint, format e diff check passaram.

A revisão independente compatível read-only foi `PASS` sem P0/P1/P2. Nenhuma
integração externa, dado real, ação sensível ou efeito de produção foi ativado;
produção permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S45 — Fronteira de invocação de tools controladas

Status: `COMPLETED_CONTROLLED` em `AUDIT` após focused, regressão, gates
integrados e revisão independente compatível read-only (`PASS sem P0/P1`). A
implementação permanece limitada ao runtime controlado.

Antes de qualquer approval, auditoria ou chamada de handler, o Capability
Gateway deve tratar a invocação como input não confiável:

- `RegisteredPlugin` exige validators server-side de input e output para cada
  tool declarada e não aceita validators para tools inexistentes; handlers
  precisam ser callable e snapshots preservam somente referências sem mutação;
- o validador recebe `unknown` e devolve um valor parseado/clonado ou falha;
  o gateway nunca encaminha o input original diretamente ao handler;
- actor (`id`, `role`, `permissions`), `toolName`, escopo e policy têm shape
  bounded; actor inválido retorna `blocked/invalid_actor` e não lança exceção;
  `actor.permissions` nunca é autoridade: o grant efetivo vem de um
  `CapabilityActorAuthorizer` server-side e ausência dele falha fechado;
- input inválido retorna `blocked/tool_input_invalid` antes de resolver
  approval/consumir nonce ou chamar handler; o audit é mínimo e não carrega o
  input rejeitado;
- retorno do handler aceita somente status conhecido, `error` bounded e `data`
  validado pelo output validator, JSON-like, bounded e redigido; valor inválido
  vira `failed/tool_result_invalid` sem retorno de payload bruto;
- approval exige autoridade durável e single-use, com binding de input,
  tenant, agente, versão, tool e actor; não é consumido quando a validação
  falha;
- falha de auditoria após consumo/execução retorna `audit_unavailable` sem
  repetir o handler;
- nenhuma validação executa provider, canal, rede, RAG, broker, outbox,
  egress, deploy, dado real ou side effect.

### Registro antes do BUILD

`PLAT-S45-001_CONTROLLED_TOOL_INVOCATION_BOUNDARY` foi registrado antes do
BUILD no backlog, PRD, SPEC, ExecPlan, runtime state, execution log, tracking,
task catalog e gauntlet após uma reprodução read-only da fronteira atual. Gate:
`SPEC_APPROVED_CONTROLLED_BUILD`; evidência de fechamento:
`docs/04_audit/0535_plat-s45_controlled_tool_invocation_boundary_evidence.md`.

### Descoberta S45

Com fixture server-side, `CapabilityGateway.execute` encaminhou `null` ao
handler e devolveu `data.raw` sem projeção. Com `actor.permissions` ausente,
lançou `TypeError` em `.includes`. Nenhum provider, banco, rede ou efeito
externo foi usado.

### Limites

O lane adiciona apenas contrato/validação do registry/gateway e regressões
controladas. Não cria schema dinâmico fornecido pelo usuário, não instala
plugins, não altera catálogo metadata-only e não autoriza tools reais.

## PLAT-S44 — Instrumentação local dos spans

O executor controlado deve produzir durações de etapa a partir de um relógio
monotônico local, sem transportar payload:

- um clock injetável permite avançar tempo deterministicamente nos testes;
- o ledger aceita somente nomes de span oficiais, limita quantidade e duração,
  e retorna cópias imutáveis;
- cada etapa executada recebe duração finita não negativa; etapas `skipped`
  continuam com duração zero; a soma é compatível com a latência do trace;
- falha no clock/ledger não concede permissão, não muda policy e não aciona
  provider/canal/exporter externo; o limite permanece controlado.

### Registro antes do BUILD

`PLAT-S44-001_CONTROLLED_TRACE_STAGE_TIMING` foi registrado no backlog, PRD,
SPEC, ExecPlan, runtime state, execution log, tracking, task catalog e
gauntlet antes do RED. Gate: `SPEC_APPROVED_CONTROLLED_BUILD`; o lane foi
auditado como `COMPLETED_CONTROLLED`.

### Descoberta S44

`createTraceSpans` gerava zero estático para todos os spans e não recebia
clock/ledger. O lane adicionou medição somente de estágios locais controlados.

### Fechamento de auditoria S44

Focused 2/17, regressão 124/501 com 2/19 skipped, coverage 85,18/80,44/85,70/
86,16, PostgreSQL 8/72, E2E 4/4, readiness 4/4, build 70 módulos, audit 0 e
checks estáticos passaram. Evidência:
`docs/04_audit/0534_plat-s44_controlled_trace_stage_timing_evidence.md`.

## PLAT-S43 — Integridade temporal do trace controlado

Antes de persistir ou devolver um trace que contenha telemetria temporal, a
boundary deve aplicar invariantes determinísticas:

- `startedAt`, `completedAt` e `latencyMs` aparecem juntos; `completedAt` não
  pode preceder `startedAt` e a latência deve ser exatamente o intervalo em
  milissegundos;
- spans permanecem opcionais, mas, quando presentes, seguem a ordem canônica
  `normalize → context → intent → policy → knowledge → prompt → model → tool
→ response → handoff → delivery`; durações são não negativas e sua soma não
  excede a latência declarada;
- status de `policy`, `knowledge`, `tool`, `handoff` e `delivery` é derivado
  dos campos correspondentes do trace; divergência falha fechado;
- traces de fixtures legadas sem telemetria opcional continuam válidos; não há
  exportação OTel, rede, broker, provider/canal real ou side effect.

### Registro antes do BUILD

`PLAT-S43-001_CONTROLLED_TRACE_TEMPORAL_INTEGRITY` foi registrado no backlog,
PRD, SPEC, ExecPlan, runtime state, execution log, tracking, task catalog e
gauntlet antes do RED. Gate: `SPEC_APPROVED_CONTROLLED_BUILD`; o lane foi
auditado como `COMPLETED_CONTROLLED`.

### Descoberta S43

`createTraceSpans` produz `durationMs: 0` estático e
`sanitizeTraceForPersistence` ainda não exige relação temporal, ordem dos spans
ou status derivado. A implementação deve permanecer somente no control plane
controlado.

### Fechamento de auditoria S43

Focused 1/14, regressão 124/499 com 2/19 skipped, coverage 85,08/80,41/85,45/
86,08, PostgreSQL 8/72, E2E 4/4, readiness 4/4, build 70 módulos, audit 0 e
checks estáticos passaram. Evidência:
`docs/04_audit/0533_plat-s43_controlled_trace_temporal_integrity_evidence.md`.

## PLAT-S42 — Boundary de proveniência do trace controlado

O trace é uma fronteira de dados não confiáveis. Antes de armazenar, retornar
ou inserir um trace dentro de `TestSuiteRunRecord`, o runtime deve aplicar uma
projeção estrita com estas regras:

- objeto raiz e objetos aninhados são allowlisted; campos extras são omitidos,
  sem spread de dados não validados;
- `traceId`, `tenantId`, `agentId` e `versionId` usam os schemas oficiais; IDs
  de contexto, `configVersion`, nomes, razões e fontes são strings bounded;
- `input`, `intent`, `risk`, `policy`, `knowledge`, `tools`, `toolResults`,
  `handoff`, `response`, `outputPolicy`, `provider`, `prompt`, status,
  timestamps, usage e spans validam tipo, enum, quantidade, tamanho e números
  finitos antes da projeção;
- provider é exatamente o binding controlado `fake/deterministic-v1` e
  `externalCall` deve ser literalmente `false`; provider/model desconhecido ou
  qualquer chamada externa declarada falha fechado;
- texto de input/response passa por redaction bounded; output é validado por
  `enforceControlledOutput`, e `outputPolicy`, quando presente, corresponde à
  decisão/mode efetivos;
- `recordTestRun`, `recordExecutionTrace`, `recordTestSuiteRun`, leitura das
  tabelas e mapper de suite chamam a mesma função canônica; corrupção de JSON
  em leitura não pode ser devolvida como trace.

### Gate e limites

O RED usa somente fixtures para provar que o sink atual preserva campo extra,
provider adulterado ou trace de suite sem sanitização. O GREEN adiciona testes
de parser/projeção, sinks InMemory/PostgreSQL, nested suite e leitura
fail-closed, incluindo assert de ausência de INSERT quando o contrato falha.

O lane não cria provider/canal real, RAG, secret manager, broker, outbox,
egress, deploy, migração estrutural, dado real ou side effect.

### Registro antes do BUILD

`PLAT-S42-001_CONTROLLED_TRACE_PROVENANCE_BOUNDARY` foi registrado no backlog,
PRD, SPEC, ExecPlan, runtime state, execution log, tracking, task catalog e
gauntlet antes do RED. Gate: `SPEC_APPROVED_CONTROLLED_BUILD`; o lane foi
auditado como `COMPLETED_CONTROLLED`.

### RED observado S42

O focused executou 3 arquivos/16 testes, com 9 falhas esperadas: extras e
provider adulterado foram aceitos, suite não aplicou a governança e row JSON
corrompida era devolvida pela listagem PostgreSQL.

### GREEN focado S42

O contrato allowlist/bounded foi implementado em `sanitizeTraceForPersistence`
e aplicado aos sinks diretos, traces aninhados de suite e listagens/mappers
PostgreSQL. O focused ampliado passou 6 arquivos/76 testes, com typecheck e
lint. A regressão, cobertura, PostgreSQL controlado, E2E, readiness, worker
smoke, build, audit, format e diff check passaram; os números completos estão
na evidência S42.

### Fechamento de auditoria S42

Sem alteração do limite: não foram executados provider/canal real, RAG,
egress, broker, deploy, migração estrutural, dado real ou ação sensível.
`PLAT-S42-001` está `COMPLETED_CONTROLLED`; o próximo movimento é novo
discovery/SPEC controlado, sem autorização de produção.

## PLAT-S41 — Boundary de segurança da saída controlada

O runtime deve tratar o texto retornado pelo provider como dado não confiável,
mesmo quando o provider é determinístico e o texto veio de uma fonte
`controlled://`. Antes de publicar `response.after`, calcular tokens ou gravar
o `TestRunTrace`, aplicar `enforceControlledOutput` com o contrato:

- entrada de texto é `unknown` na fronteira e só uma string trimada, não vazia,
  redigida e com no máximo 4.000 caracteres pode seguir;
- padrões de diagnóstico, prescrição, dose/medicação, tratamento, prontuário,
  pagamento e confirmação/cancelamento/reagendamento de agenda são conteúdo
  inseguro no output, salvo a recusa segura canônica do próprio kernel;
- resposta insegura, não textual, vazia ou acima do limite nunca é devolvida;
  a função retorna fallback determinístico `handoff` ou `blocked` conforme o
  modo efetivo, sem carregar o texto rejeitado;
- uma saída `answer` de risco alto/crítico não pode permanecer como answer;
  deve virar handoff seguro e o runtime deve registrar a solicitação de
  handoff uma única vez, com motivo `unsafe_output_rejected`;
- a decisão exposta é bounded (`allowed` ou `rewritten`), com motivo,
  `redacted` e modo final; nenhum texto bruto entra no payload dos eventos
  `policy.output.before`/`policy.output.after`; a decisão também é persistida
  no trace/API sem conteúdo bruto;
- qualquer decisão `rewritten` bloqueia planejamento, resolução de approval e
  execução de tools; a policy de output não concede permissão e não substitui
  a policy de input/hard safety;
- se o output for reescrito para `handoff`, esse motivo tem precedência sobre
  um handoff pré-existente e o evento `handoff.requested` é único e emitido
  após a decisão final.

### Gate e limites

O RED deve provar, por fixture, que uma resposta institucional aprovada com
instrução de medicação/diagnóstico passa pelo provider sem validação de saída.
O GREEN deve validar o módulo puro e integrá-lo depois de `model.after` e antes
de `response.after`, preservando redaction, contagem de tokens, trace, handoff
e `externalCall: false`. A suíte deve cobrir texto seguro, PII, não-string,
vazio, excesso, conteúdo inseguro, recusa segura e eventos redigidos.

O lane não cria provider ou canal real, RAG, secret manager, broker, outbox,
egress, deploy, migration, dados reais ou side effect. Não altera a autoridade
de approval, a policy de entrada ou o contrato de tools.

### Registro antes do BUILD

`PLAT-S41-001_CONTROLLED_OUTPUT_SAFETY_BOUNDARY` foi registrado no backlog,
PRD, SPEC, ExecPlan, runtime state, execution log, tracking, task catalog e
gauntlet antes do RED. Gate: `SPEC_APPROVED_CONTROLLED_BUILD`. Próximo passo
obrigatório: RED focado.

### Auditoria final S41

O contrato foi implementado e validado como `COMPLETED_CONTROLLED`. O focused
final passou 7 arquivos/76 testes; a regressão passou 123 arquivos/483 testes,
com 2 arquivos e 19 testes skipped; coverage final foi 85,08% statements,
80,29% branches, 85,39% functions e 86,12% lines. Readiness 4/4, worker
smoke, PostgreSQL 8/72, E2E 4/4, build 70 módulos, typecheck, lint, format,
audit 0 e diff check passaram. A saída também é validada nos sinks e antes
de efeitos transacionais de runtime PostgreSQL. Evidência:
`docs/04_audit/0531_plat_s41_controlled_output_safety_boundary_evidence.md`.
O escopo não autoriza produção real ou efeitos sensíveis.

## PLAT-S40 — Boundary de identidade do provider/model controlado

`AgentConfig.model` continua aceitando referências bounded e genéricas no
control plane, mas toda execução deste MVP deve resolver a referência por um
registry compilado no servidor. A implementação controlada deve:

- registrar somente `fake` com o modelo exato `deterministic-v1`;
- manter o registry e suas listas defensivos/imutáveis, rejeitando nome
  duplicado e qualquer provider sem modelo suportado;
- exigir correspondência exata de `provider` e `model`, sem `latest`, inferência
  ou fallback para outra identidade;
- rejeitar `fallbackProvider` quando presente, com erro controlado, porque não
  existe fallback executável nesta fase;
- retornar somente o provider registrado, com resposta determinística e
  `externalCall: false`; `secretRef` permanece apenas referência e nunca entra
  no trace/retorno;
- ser chamado antes de `message.received` e `model.before` em
  `executeConfiguredAgent`, cobrindo Test Lab, runtime publicado, API e worker
  sem duplicar regra nos adapters.

### Gate e limites

O RED deve reproduzir resolução de provider/model desconhecido ou fallback
silenciosamente aceito pela implementação atual. O GREEN deve passar para
`fake/deterministic-v1` e falhar com `DomainError('invalid_action', ...)` para
provider/model não registrados ou fallback presente, sem emitir eventos da
pipeline, chamar provider/tool/canal ou mutar store. A suíte deve incluir a
resolução imutável e a propagação no caminho `executePublishedAgent`/worker.

O lane não cria provider real, chamada de rede, secret manager, fallback,
retry operacional, broker, outbox, canal, RAG, egress, deploy, persistência
estrutural, dado real ou side effect. O `ModelConfigSchema` genérico não é
tratado como prova de capacidade instalada; somente o registry controlado
autoriza execução neste slice.

### Registro antes do BUILD

`PLAT-S40-001_CONTROLLED_MODEL_PROVIDER_IDENTITY_BOUNDARY` foi registrado no
backlog, PRD, SPEC, ExecPlan, runtime state, tracking, task catalog e gauntlet
antes do RED. Gate: `SPEC_APPROVED_CONTROLLED_BUILD`. Próximo passo obrigatório:
escrever e executar RED focado sem implementar o provider externo.

### RED observado

O focused S40 executou 1 arquivo/4 testes e falhou nos 4 casos esperados:
provider/model não registrado foi aceito, `fallbackProvider` foi silenciosamente
ignorado e a execução completou com identidade `openrouter/external` após
emitir eventos. Nenhuma rede ou efeito externo foi acionado. O GREEN deve
adicionar a resolução compartilhada antes de qualquer evento da pipeline.

### GREEN focado

`ModelProviderRegistry.resolveForConfig` agora exige fallback ausente e
correspondência exata com o provider/model suportado. O executor resolve antes
de emitir eventos; o focused inicial passou 2 arquivos/6 testes e a regressão
ampliada publicada/worker passou 4 arquivos/19 testes. Nenhum provider, canal,
rede ou side effect foi adicionado; os gates completos foram executados com
sucesso.

### Auditoria final S40

`PLAT-S40-001 = COMPLETED_CONTROLLED`: focused 4 arquivos/19 testes PASS;
regressão 121 arquivos/446 testes/19 skips; coverage 85,08/80,11/85,17/86,07;
readiness 4/4; worker smoke; PostgreSQL 8/72; E2E 4/4; build, typecheck, lint,
format, audit 0 e diff check PASS. A revisão independente follow-up retornou
`PASS sem achados estáticos`. Evidência:
`docs/04_audit/0530_plat_s40_controlled_model_provider_identity_evidence.md`.
O gate é controlado e não autoriza produção real.

## PLAT-S39 — Integridade da transição para VALIDATED

Antes de alterar o lifecycle de um release candidate, o store deve aplicar uma
asserção única de evidência sobre o registro carregado no tenant correto:

- parsear cada gate por `ReleaseCandidateGateResultSchema`;
- exigir exatamente `safety_preflight`, `test_lab_regression`,
  `snapshot_integrity` e `external_boundary`, todos `PASS`;
- recomputar `evidenceDigest` com `candidate.tenantId`, `agentId`, `versionId`
  e os gates canônicos;
- exigir que o validador seja diferente de `candidate.createdBy`;
- rejeitar qualquer divergência com `DomainError('invalid_action', ...)` sem
  substituir o candidate ou preencher `validatedBy`/`validatedAt`.

`InMemoryControlPlaneStore` e `PostgresControlPlaneRepository` devem chamar a
mesma regra depois do lock/lookup e antes da mutação. A asserção de publish
deve reutilizar a mesma verificação, sem remover suas verificações de status,
metadata e binding. O mapper PostgreSQL deve parsear `gate_results` por parser
bounded compartilhado e rejeitar JSON não-array ou shape inválido, sem
convertê-lo silenciosamente em lista vazia.

### Gate e limites

RED deve falhar para digest adulterado em ambos os adapters antes do BUILD.
GREEN deve passar para candidate íntegro e falhar fechado para digest, shape e
gates inválidos, mantendo o `FOR UPDATE`, CAS, tenant scope e ausência de
efeitos externos. Sem deploy, provider/canal, RAG, egress, broker, outbox,
dados reais ou side effect.

### RED observado

O focused S39 passou 4/6 testes e falhou 2/6 como esperado: ambos os adapters
marcaram `VALIDATED` mesmo com `evidenceDigest` adulterado. O caso é puramente
controlado e não chamou provider, canal, RAG, broker, outbox ou side effect.

### GREEN focado

A função compartilhada `assertReleaseCandidateEvidenceIntegrity` valida schema,
conjunto fixo, status e digest canônico. A autoridade de publish a reutiliza e
as transições InMemory/PostgreSQL a chamam antes de status/metadata; focused
6/6, typecheck e lint passaram.

### Correção após crítica independente

A crítica encontrou autoatestação e mascaramento de corrupção no mapper. O
GREEN final adicionou `assertReleaseCandidateIndependentValidator`,
`parseReleaseCandidateGateResults` fail-closed e testes separados; focused
passou 7 arquivos/23 testes. A migration aditiva `0009` também bloqueia
autoatestação já persistida antes de qualquer publish/rollback.

### Auditoria final

Revisão independente final: `PASS sem achados`. Regressão: 120 arquivos/438
testes/19 skips; coverage 85,08/80,16/85,18/86,08; PostgreSQL 8/72; E2E 4/4;
readiness, worker smoke, build, typecheck, lint, format, audit 0 e diff check
PASS. O contrato não autoriza produção real, deploy, provider/canal, RAG,
egress, broker, outbox, dados reais ou side effect.

## Resultado da auditoria PLAT-S38

`PLAT-S38-001 = COMPLETED_CONTROLLED`. O contrato strict usa o schema shared de
knowledge, o worker preserva context/version pinning e o focused passou 3
arquivos/14 testes. A regressão passou 120/432/19 skips, coverage
84,92/80,09/85,08/85,92, PostgreSQL 8/71, E2E 4/4, readiness 4/4, worker
smoke, build, lint, format, audit 0 e diff check. Evidência:
`docs/04_audit/0528_plat_s38_controlled_worker_knowledge_input_parity_evidence.md`.
Sem broker, RAG, provider/canal, dados reais, deploy ou side effect.

## PLAT-S38 — Contrato de input de knowledge no job publicado

`PublishedAgentJobSchema` deve conter `approvedKnowledge` opcional usando
`ApprovedKnowledgeForTestSchema` do contrato compartilhado. O worker deve
encaminhar somente o valor parseado para `executePublishedAgent`, mantendo o
job strict e o version pinning existente.

### Gate de implementação

RED deve demonstrar que um job válido com fixture `controlled://` é rejeitado
ou não chega ao runtime antes do GREEN. GREEN deve provar paridade válida e
falhas para source externa, limites, chaves extras e legado, sem tocar provider,
RAG, fila ou side effect.

### Limites

O payload continua metadata/source-gated e não aprova fonte. Nenhuma operação
externa, dado real, deploy, provider/canal, broker, outbox, egress ou RAG real
é permitida.

## PLAT-S37 — Contrato de autoridade de evidência no publish/rollback

O contrato público de mutação exige `releaseCandidateId` em
`ControlPlaneStore.publishVersion` e `ControlPlaneStore.rollback`, além do
body correspondente da API. Antes de alterar a versão, a implementação deve:

- resolver o candidato no mesmo tenant;
- exigir `status === VALIDATED`;
- exigir `candidate.agentId` e `candidate.versionId` iguais aos parâmetros da
  operação;
- recomputar `evidenceDigest` com tenant/agente/versão/gates e rejeitar
  divergência;
- exigir exatamente os quatro gates fixos, todos `PASS`;
- manter o preflight crítico server-side na rota, antes da chamada ao store.

No rollback, o candidato autentica a versão fonte validada; a nova versão é
uma cópia imutável da configuração fonte, passa pelo ciclo controlado e só
então é publicada por uma rotina interna de publicação já autorizada pela
mesma operação. Não há reutilização de candidato para outra versão nem
autoridade concedida por body, UI, modelo ou catálogo.

### Gate de implementação

O RED deve provar que publish/rollback sem candidato, com candidato não
validado, tenant/agente/versão divergentes ou digest adulterado não mutam o
estado. O GREEN deve provar publish e rollback com candidato `VALIDATED`, além
da integração API/UI e do caminho PostgreSQL controlado. Nenhuma operação
externa, dado real, deploy, provider/canal, RAG, egress, broker, outbox ou
side effect é permitido.

### Resultado da auditoria PLAT-S37

`PLAT-S37-001 = COMPLETED_CONTROLLED`. O focused GREEN passou 2 arquivos/5
testes, a regressão completa passou 119 arquivos/427 testes/19 skips, coverage
84,92/80,08/85,08/85,92, PostgreSQL controlado 8/71, E2E 4/4, readiness 4/4,
worker smoke, build, lint, format, audit 0 e diff check. Evidência:
`docs/04_audit/0527_plat_s37_controlled_publish_evidence_authority_evidence.md`.
O limite continua sem dados reais, deploy, provider/canal, RAG, egress,
broker, outbox ou side effect; produção real segue `NO-GO`.

## PLAT-S36 — Contrato de input de knowledge controlada

`ApprovedKnowledgeForTestSchema` é o contrato único para o fixture fornecido
ao runtime:

- `source`: string trimada, 1–200 caracteres, regex `^controlled://`;
- `version`: string trimada, 1–120 caracteres;
- `answer`: string trimada, 1–4000 caracteres;
- objeto strict, sem chaves adicionais.

`executeConfiguredAgent` faz `safeParse`/parse desse input quando presente e
retorna `validation_failed` antes de eventos de knowledge, prompt, model ou
tool em caso inválido. Test Lab e capability approval API devem importar o
mesmo schema, eliminando drift entre transporte e runtime. Depois da validação,
`resolveKnowledge` ainda exige binding enabled + requiresApprovedSource e
igualdade exata de source/version; o payload não carrega código, URL, grant ou
fonte externa.

### Gate e limites

RED deve falhar antes da implementação para source externa, answer acima do
limite e chave extra; GREEN deve passar para payload válido e preservar
`approved_source_missing` quando não houver binding. Sem RAG real, ingestão,
provider, canal, egress, broker, outbox, dado real, deploy ou side effect.

### Resultado da auditoria PLAT-S36

`PLAT-S36-001 = COMPLETED_CONTROLLED`. O contrato único foi usado em
`executeConfiguredAgent`, `TestLabRequestSchema`,
`CapabilityApprovalExecutionRequestSchema` e `TestLabCaseSchema`. Os gates
passaram: verify 117/422/19 skips, coverage 85,05/80,31/85,11/86,07,
readiness 4/4, worker smoke, E2E 4/4, PostgreSQL controlado 8/71, audit 0,
format, build, lint e diff check. Evidência:
`docs/04_audit/0526_plat_s36_controlled_knowledge_input_boundary_evidence.md`.
O limite continua controlado, sem RAG/ingestão, conteúdo real, provider,
canal, egress, broker, outbox, dado real, deploy ou side effect; produção real
segue `NO-GO`.

## PLAT-S35 — Contrato do registry de tools controlado

### Manifesto e identidade

`PluginTool` pode declarar intents de planejamento bounded. Esse campo é
metadata de seleção e não é autoridade para carregar código. Para executar,
`CapabilityGateway` resolve somente um binding habilitado com
`plugin + version + toolName`, exigindo `version` exata; ausência de versão,
plugin não registrado, tool sem handler e múltiplos bindings para o mesmo
`toolName` retornam bloqueio sem chamar handler.

`PluginRegistry` mantém snapshots imutáveis e expõe uma consulta de tools
planejáveis por `AgentConfig`/intent. A consulta aceita apenas versões exatas,
deduplica a mesma identidade `plugin@version/tool` e não seleciona uma
identidade ambígua por ordem de registro.

### Runtime e Test Lab

`executePlannedTools` deve obter suas tools do gateway/registry e dos bindings
ativos da versão, filtrando intent, enabled e allowedTools. Não deve conter
allowlist literal de `find_available_slots`. A execução continua passando pelo
gateway, policy, approval, redaction e audit existentes. O registry desta
sprint só contém handlers compilados controlados; nenhum catálogo ou payload
de cliente fornece implementação.

### Approval/API

O schema HTTP aceita um identificador de tool bounded, mas a emissão consulta a
versão `APPROVED`/`PUBLISHED` e a resolução server-side do gateway antes de
persistir approval. A execução revalida a versão e deriva a permissão do tool
resolvido no servidor; permissões não vêm do request, modelo ou job. O contrato
de approval existente continua tenant/agent/version/input/actor scoped e
single-use. O catálogo permanece metadata-only e não participa da resolução
de handlers.

### Gate de implementação

Antes de `PLAT-S35-001` virar `COMPLETED_CONTROLLED`, devem passar RED/GREEN
para versão ausente, versão divergente, plugin não registrado, catálogo sem
handler, colisão/duplicidade, planner por intent, approval genérico e
permissão server-owned; regressão do runtime/API, verify, coverage, readiness,
E2E, PostgreSQL controlado, audit, format, lint, build e diff check.

### Resultado esperado e limites

O lane prova somente a fronteira de identidade e execução de fixtures
compiladas, todas dry-run. Não autoriza plugin real, importação, provider,
canal, egress, broker, outbox, dado real, deploy ou side effect.

### Resultado da auditoria

`PLAT-S35-001 = COMPLETED_CONTROLLED`. Os contratos focados, regressão,
verify, coverage, readiness, worker smoke, E2E, PostgreSQL controlado, audit,
format, lint, build e diff check passaram. Evidência:
`docs/04_audit/0525_plat_s35_controlled_tool_registry_identity_evidence.md`.

## PLAT-S34 — Contrato de paridade CI controlada

### Workflow

`.github/workflows/verify.yml` deve declarar `permissions: contents: read`,
concurrency cancelável para evitar runs obsoletos, checkout sem credenciais
persistentes, `npm ci --ignore-scripts`, `npm run readiness`, `npm run verify`,
smoke do worker, PostgreSQL controlado, Playwright e `git diff --check`. O
contrato de workflow é testado sem depender de GitHub Actions.

### Worker smoke

`npm run test:worker:startup` executa o processo real sem
`CVG_WORKER_QUEUE_ADAPTER`, exige exit 1, evento `worker.startup_failed` com
`queue_adapter_missing` e rejeita stack/cause/bootstrap IDs. O smoke não
transforma ausência de infraestrutura em sucesso.

### Container boundary

Não existe Dockerfile ou imagem no checkout; portanto nenhum container scan é
simulado. O requisito fica explícito como bloqueio de hardening para um lane
posterior que tenha artefato, provenance e política de scan aprovados.

### Gate de implementação

Antes de `PLAT-S34-001` virar `COMPLETED_CONTROLLED`, devem passar RED/GREEN dos
contratos CI/smoke, typecheck, lint, format, suíte, coverage, readiness,
PostgreSQL, E2E, audit e diff check.

### Resultado da auditoria

`PLAT-S34-001` = `COMPLETED_CONTROLLED`. Os contratos focados passaram, o
workflow chama todos os gates disponíveis (incluindo `git diff --check`) e o
smoke executa o processo real do worker sem adapter, confirmando exit 1 e
falha JSON bounded sem bootstrap/stack/cause. A evidência final está em
`docs/04_audit/0524_plat_s34_controlled_ci_gate_parity_evidence.md`.
Não há Dockerfile/imagem para um scan honesto; production hardening continua
fora do lane.

## PLAT-S33 — Contrato do worker publicado controlado

### Job bounded

O worker recebe `tenantId`, `agentId`, `versionId`, `message`, `history` e
contexto opcional de `conversationId`/`sessionId`. IDs usam os schemas
compartilhados; a mensagem e cada item de histórico têm máximos explícitos; o
shape é strict e não aceita o contrato legado de `sessionId`/
`triggerMessageId` sem escopo.

### Execução

`processAgentTurnJob` chama `executePublishedAgent` com `versionId` explícito e
um `ControlPlaneStore` injetado. O executor só aceita a versão do mesmo tenant
e agente em `PUBLISHED` ou `ARCHIVED`; não há `resolvePublished` no worker,
provider, canal, outbox ou mutação externa. O retorno é o resultado controlado
com trace redigível.

### Entrypoint

`apps/worker/src/main.ts` não executa job bootstrap. Sem um adapter de fila
controlado explicitamente configurado, publica uma falha bounded e encerra; a
ausência do adapter não é convertida em sucesso fictício.

### Gate de implementação

Antes de `PLAT-S33-001` virar `COMPLETED_CONTROLLED`, devem passar RED/GREEN de
schema, delegação pinned, status/mismatch e entrypoint fail-closed; regressão do
runtime/API/S32, E2E controlado, coverage, readiness, lint, build, audit, format
e diff check. A crítica continua lead-only se child agents permanecerem
indisponíveis.

### Resultado esperado

O S33 fecha somente a fronteira do worker em fixtures. Broker, retry durável,
outbox e integração operacional permanecem decisões de infraestrutura futuras.

### Resultado da auditoria

`PLAT-S33-001` = `COMPLETED_CONTROLLED`. O parser bounded foi centralizado em
`agent-core` para preservar a boundary de dependências do worker; jobs válidos
usam `versionId` explícito, negativos falham sem fallback e `main.ts` encerra
com erro seguro quando não há adapter. Os gates integrados estão na evidência
`docs/04_audit/0523_plat_s33_controlled_worker_runtime_boundary_evidence.md`.

## PLAT-S32 — Contrato de version pinning por sessão

### Modelo

`SessionRecord` recebe os campos opcionais `agentId` e `agentVersionId`. Eles
devem existir juntos ou estar ambos ausentes. O binding é tenant-scoped,
defensivo e monotônico: uma sessão sem binding pode receber um único par; uma
sessão já vinculada só retorna o mesmo par. Tentativa de substituir o par
retorna `conflict` sem mutação.

### Persistência

A migration aditiva `0008_session_agent_version_pin.sql` adiciona as colunas,
constraint do par, foreign keys compostas para `platform_agents` e
`platform_agent_versions`, relação `(tenant_id, agent_id, agent_version_id)` e
índice `idx_sessions_tenant_agent_version`. A migration entra no conjunto
checksum-guarded e no preflight de schema/role. Não há backfill automático:
linhas existentes permanecem sem pinning até o primeiro runtime controlado.

### Runtime

`executePublishedAgent` aceita opcionalmente `versionId`. Sem pinning, resolve
a publicação corrente como hoje. Com pinning, carrega somente a versão
tenant-scoped pertencente ao agent e aceita `PUBLISHED` ou `ARCHIVED`; DRAFT,
TESTING, agent mismatch, tenant mismatch ou ausência falham como
`not_configured`. O API usa o binding da sessão antes de consultar o resolver;
para uma sessão sem binding resolve a publicação atual, grava o par por CAS e
só então executa. Nenhum erro de pinning pode selecionar uma versão diferente.

### Gate de implementação

Antes de `PLAT-S32-001` virar `COMPLETED_CONTROLLED`, devem passar testes RED /
GREEN de cópia defensiva, CAS, publicação v1→v2, snapshot arquivado,
cross-tenant, binding parcial e ausência de handler/provider; migration smoke,
PostgreSQL com RLS, API/E2E, typecheck, lint, format, build, coverage,
readiness, audit e diff check. A única crítica independente disponível é
lead-only porque child agents não estão disponíveis neste runtime; essa
limitação será registrada sem declarar aprovação independente.

### Resultado da auditoria

Os critérios foram satisfeitos em fixtures controladas e PostgreSQL 16 local,
incluindo prova Playwright browser/API. `PLAT-S32-001` está
`COMPLETED_CONTROLLED`; o próximo trabalho deve abrir novo SPEC para qualquer
gap, e os bloqueios de produção real permanecem inalterados.

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

## PLAT-S11 — event bus e hooks de plugins controlados

### Contrato

O runtime controlado define um conjunto fechado de eventos internos:
`message.received`, `message.normalized`, `conversation.loaded`,
`context.loaded`, `agent.resolved`, `policy.input.before`,
`policy.input.after`, `intent.before`, `intent.after`, `knowledge.before`,
`knowledge.after`, `prompt.before`, `prompt.after`, `model.before`,
`model.after`, `model.error`, `tool.before`, `tool.after`, `tool.error`,
`response.before`, `response.after`, `handoff.requested`, `handoff.created`,
`handoff.failed`, `human_takeover.started`, `human_takeover.ended`,
`message.delivery.before`, `message.delivery.after`,
`conversation.completed`, `security.blocked`, `plugin.started`,
`plugin.stopped` e `plugin.error`. O conjunto é um contrato de código e não
aceita nomes arbitrários em runtime.

Cada evento é um envelope com `id`, `name`, `tenantId`, `agentId` opcional,
`versionId` opcional, `executionMode`, timestamp ISO e payload. O payload é
sanitizado com a mesma fronteira de auditoria do Test Lab antes de ser
armazenado ou entregue. O envelope e seus objetos/arrays aninhados são
profundamente imutáveis para o handler.

Um plugin local pode registrar hooks somente com `tenantId`, manifest validado,
versão/name de plugin e handler correspondente. Cada chave de handler precisa
estar em `manifest.hooks` e cada evento precisa pertencer ao allowlist. O
catálogo persistente S09 não é uma fonte de execução e `APPROVED` não registra
handlers automaticamente.

### Semântica de entrega

O `PlatformEventBus` mantém inscrições de forma imutável. `emit` cria um novo
envelope sanitizado e entrega somente a inscrições do mesmo tenant e do mesmo
nome de evento. Handlers são chamados em ordem determinística; uma exceção é
capturada, convertida em resultado `failed` sanitizado e não impede os demais
handlers nem propaga para o pipeline do agente. O callback de auditoria recebe
somente identidade do plugin, evento, status e erro redigido.

O bus é best-effort e process-local nesta sprint: não há persistência,
reentrega, consumo remoto ou garantia de entrega após reinício. Erros de hook
não podem liberar policy, capability, approval, provider, canal, agenda,
clínica, financeira ou prontuário.

### Integração do Test Lab

`executeConfiguredAgent` aceita um bus opcional e emite, sem incluir texto
bruto, eventos após as etapas de mensagem, resolução, intent, policy,
knowledge, prompt, model, tools e resposta. Caminhos controlados de handoff e
bloqueio de segurança emitem seus respectivos eventos; toda execução termina
com `conversation.completed` quando o pipeline chega ao resultado. A emissão é
observacional: não modifica score, policy, trace, resposta ou
`externalCall=false`.

### Gate de implementação

Antes de fechar `PLAT-S11-001`, devem passar testes RED/GREEN de allowlist,
declaração de manifest, IDs/tenant, redaction, imutabilidade, isolamento,
falha isolada/auditoria e integração real do Test Lab; além de typecheck, lint,
format, build, coverage, readiness, E2E, audit e inspeção de que o catálogo
S09 continua metadata-only e nenhum efeito externo foi adicionado.

### Resultado controlado

`PLAT-S11-001` foi concluída como `COMPLETED_CONTROLLED`. O event bus
allowlisted, a inscrição tenant-scoped, a redaction/imutabilidade, o
isolamento de falhas e a emissão representativa no Test Lab passaram os gates
executáveis. Evidência: `docs/04_audit/0501_plat_s11_event_bus_hooks_evidence.md`.
O bus continua process-local/best-effort; broker, entrega durável, catálogo
executável e produção real permanecem fora do escopo.

## PLAT-S12 — prompt profile e templates no Control Center

### Modelo e autoridade de versão

O perfil de prompt é derivado de `AgentConfig.promptBlocks` e
`AgentConfig.responseTemplates` dentro de uma `AgentVersion`. A versão é
imutável: qualquer edição do Control Center usa o endpoint de clone e cria uma
nova versão `DRAFT`; nenhuma versão existente é atualizada in place. O checksum
é SHA-256 de uma representação canônica somente de `promptBlocks` e
`responseTemplates`, com ordenação estável e sem conteúdo de mensagem, PII ou
segredo.

`PromptBlock.locked` é opcional para compatibilidade histórica. Blocos `system`
e `safety`, além do bloco kernel controlado, são protegidos no editor. Quando
uma versão de origem possui bloco protegido, o clone precisa preservar id,
kind, content, priority, enabled e lock; remoção ou alteração falha fechado.
Uma nova configuração sem bloco protegido recebe o bloco kernel controlado pela
superfície do editor. A validação de backend rejeita locks forjados e
alterações de protected blocks.

### Formato do editor

O Control Center usa dois campos JSON separados:

- `promptBlocks`: array de objetos `{ id, kind, content, priority, enabled }`;
  ids usam o identificador permitido pelo contrato, kinds são allowlisted,
  prioridades são inteiras no intervalo do schema e ids são únicos;
- `responseTemplates`: objeto de `key: string`, limitado por tamanho e número
  de entradas; `security_blocked`, `emergency`, `medication_advice`,
  `human_takeover` e `system_error` são chaves kernel reservadas.

O parser valida JSON, shape estrito, limites, duplicidade e padrões de segredo
antes de chamar a API. A serialização é determinística e inclui os blocos
protegidos para revisão, com aviso explícito de somente leitura.

### Composição e resposta

`composePrompt` mantém a ordenação por `priority` e `id`; o editor não altera
essa regra. No Test Lab, `low_confidence`, `no_knowledge`, `handoff` e
`scheduling_without_evidence` podem fornecer respostas operacionais. Medicamento,
policy bloqueada, emergência, takeover humano e erro interno continuam em
respostas hard-coded/kernel e não são customizáveis pelo editor.

### Trace e segurança

`TestRunTrace.prompt` passa a carregar `version`, `status`, `checksum` e
`blockIds`. O checksum não inclui mensagem, histórico, resposta, provider,
segredo ou knowledge answer. A UI mostra somente metadados do profile. O
provider permanece fake/determinístico com `externalCall: false`.

### Gate de implementação

Antes de fechar `PLAT-S12-001`, devem passar testes RED/GREEN do parser,
round-trip, reserved keys, segredo, proteção kernel, checksum e clone
imutável; integração do Test Lab para templates e hard safety; UI do
Control Center; typecheck, lint, format, build, coverage, readiness, E2E,
PostgreSQL, audit e inspeção de que não houve novo catálogo, migration,
provider/canal ou side effect.

## PLAT-S13 — Handoff Policy Studio controlado

### Contrato de configuração

`PolicyBundle.minConfidence` permanece como alias legado do threshold de
clarificação. Configurações novas podem declarar `clarifyThreshold` e
`handoffThreshold`, ambos entre `0` e `1`; quando os dois campos existem,
`clarifyThreshold` deve ser igual a `minConfidence`, e `handoffThreshold` não
pode ser maior. Ausência dos campos novos preserva exatamente o comportamento
legado: o handoff threshold efetivo é `0` e o evaluator usa `minConfidence`.

`HandoffConfig.priority` é opcional por compatibilidade e aceita `low`,
`medium` ou `high`. `destinations` continua uma lista validada; a primeira
entrada válida é o destino de baixa confiança, com
`lowConfidenceDestination` mantido como campo compatível.

### Decisão determinística

Para uma intenção não bloqueada pelo hard safety:

1. confiança abaixo de `handoffThreshold` retorna `handoff`;
2. confiança entre `handoffThreshold` e `clarifyThreshold` retorna
   `clarify` quando `lowConfidence=clarify` e ainda há clarificações;
3. sem clarificações restantes, ou com `lowConfidence=handoff`, retorna
   `handoff`;
4. confiança acima do threshold efetivo retorna `allowed`.

`requires_approval`, risco alto/crítico, medicamento, fonte aprovada ausente e
hard safety continuam caminhos próprios. A prioridade configurada só vale
para o slice controlado; risco `high`/`critical` sempre publica `high` no
trace. Nenhum campo de destino concede dispatch, approval ou permissão.

### UI, snapshot e trace

O Control Center exibe inputs para clarificação, handoff threshold, máximo de
clarificações, destinos separados por vírgula e prioridade. Valores inválidos,
duplicados, vazios ou fora dos limites falham antes da request. O salvamento
usa clone de `AgentVersion`; a versão de origem permanece imutável.

`TestRunTrace.handoff` passa a carregar opcionalmente `destination` e
`priority`, além de `requested`, `reason` e `state`. São metadados derivados da
configuração, sem texto bruto de mensagem ou resposta. O cliente e o Trace
Viewer exibem esses campos somente quando presentes.

### Gate de implementação

Antes de fechar `PLAT-S13-001`, devem passar testes RED/GREEN de compatibilidade
do schema, relação entre thresholds, evaluator, max clarifications, destinos,
prioridade de risco, clone imutável, UI/API e Test Lab; além de typecheck, lint,
format, build, coverage, readiness, E2E, PostgreSQL, audit e inspeção de que
nenhum canal, provider, migration ou side effect foi adicionado.

### Resultado controlado PLAT-S13

`PLAT-S13-001` foi concluída como `COMPLETED_CONTROLLED`. A validação de
destinos também limita o identificador a caracteres controlados e rejeita
campos vazios na UI antes da request. O contrato legado continua aceito quando
os campos opcionais não existem; nenhum caminho de hard safety, approval,
takeover, provider ou canal foi alterado.

Evidência executável: `docs/04_audit/0503_plat_s13_handoff_policy_studio_evidence.md`.

## PLAT-S14 — Preflight crítico de segurança antes de publish

### Casos fixos e contrato redigido

O módulo `critical-safety-preflight` mantém um conjunto imutável de cases
controlados, validado pelo mesmo `TestLabCaseSchema`, sem aceitar mensagem ou
expectativa fornecida pelo caller. O conjunto mínimo é:

- `medication-advice`: policy `blocked`, response `handoff`, handoff `true`;
- `real-appointment-confirmation`: policy/response `blocked`, handoff `false`;
- `real-appointment-cancellation`: policy/response `blocked`, handoff `false`;
- `real-appointment-reschedule`: policy/response `blocked`, handoff `false`;
- `external-send`: policy/response `blocked`, handoff `false`.

Cada resultado público contém apenas `caseId`, `passed`, `failures`, decisão de
policy, modo de response, `handoffRequested` e `externalCall: false`. Traces
continuam persistidos pelo Test Lab com redaction existente, mas não são
copiados para payload de audit do publish nem para um envelope de erro.

### Boundary de publicação

`POST /v1/admin/agents/:agentId/versions/:versionId/publish-preflight` exige
`agent:configure`, valida o escopo e executa o preflight no snapshot indicado.
O endpoint de publish chama a mesma função antes de `publishVersion`; se o
resultado for negativo, retorna `invalid_action`, não altera status ou
`activeVersionId` e registra somente `version_publish_preflight_failed` sem
mensagem bruta. Em sucesso, o audit de `version_published` inclui o resumo
`passed/caseCount`.

Rollback busca a versão-fonte no mesmo escopo e executa o preflight antes de
criar a nova versão publicada. A precondition `expectedStatus` continua sendo
confirmada pelo lifecycle, portanto preflight verde não substitui o controle
de concorrência. Chamadas diretas ao store usadas por fixtures/bootstrap
continuam limitadas ao ambiente controlado; nenhum caminho adquire autorização
para provider, canal ou side effect real.

### Gate de implementação

Antes de fechar `PLAT-S14-001`, devem passar testes RED/GREEN do conjunto fixo,
resumo redigido, binding tenant/agent/version, endpoint de preflight, bloqueio
de publish/rollback sem mutação ou audit de sucesso, caminho verde e regressão
de `expectedStatus`; além de typecheck, lint, format, build, coverage,
readiness, E2E, PostgreSQL, audit e inspeção de que não houve efeito externo.

### Resultado controlado PLAT-S14

`PLAT-S14-001` foi concluída como `COMPLETED_CONTROLLED`. O módulo de preflight
executa cinco cases fixos, resume somente metadados redigidos e o boundary API
impede publish/rollback quando o resultado falha. O Control Center chama o
preflight antes da publicação e a API mantém a verificação autoritativa.

Evidência executável: `docs/04_audit/0504_plat_s14_controlled_safety_publish_preflight_evidence.md`.
Nenhum caminho adquiriu autorização para provider, canal, RAG, migration, dado
real ou side effect; o resultado máximo permanece `CONTROLLED_MVP_READY`.

## PLAT-S15 — Catálogo controlado de fontes de knowledge

### Contrato metadata-only

`KnowledgeSourceRecord` é tenant-scoped e contém somente `source`, `version`,
`label`, `description`, status, actor e timestamps. `source` deve casar com
`controlled://...`; `version` e identificadores usam limites e caracteres
controlados. A chave `(tenantId, source, version)` é única. Não existe campo de
conteúdo, URL externa, segredo, embedding, chunk ou resposta.

O lifecycle aceita `DRAFT -> APPROVED -> ARCHIVED` e `DRAFT -> ARCHIVED`;
`APPROVED -> DRAFT` e demais transições são recusadas. `expectedStatus` usa o
mesmo compare-and-swap do catálogo de plugins e retorna `conflict`/HTTP 409.
`APPROVED` não altera `AgentVersion`, não instala fonte e não modifica o
resolver de knowledge do Test Lab. O runtime continua exigindo binding
controlado e `approvedKnowledge` explícito para responder.

### Boundary e persistência

As rotas são:

- `POST /v1/admin/knowledge-sources`;
- `GET /v1/admin/knowledge-sources`;
- `GET /v1/admin/knowledge-sources/:sourceId`;
- `POST /v1/admin/knowledge-sources/:sourceId/transition`.

Todas exigem identidade `agent:configure`, tenant derivado da identidade,
schemas estritos e audit sem conteúdo. A implementação adiciona a migration
controlada `0005_knowledge_source_catalog.sql`, unique tenant/source/version,
índices de status e `FORCE ROW LEVEL SECURITY`. A UI só manipula metadata e
trata conflito stale; não há upload, request externo ou answer path.

### Gate de implementação

Antes de fechar `PLAT-S15-001`, devem passar RED/GREEN de schema, URI externa,
segredo, duplicidade, lifecycle, expectedStatus, cópia defensiva, isolamento
tenant, API/UI e fixture PostgreSQL; além de typecheck, lint, format, build,
coverage, readiness, E2E, audit e inspeção de que nenhum conteúdo/RAG/provider
foi adicionado.

### Resultado controlado PLAT-S15

O contrato foi implementado sem ampliar o boundary de execução: schema/store,
repository PostgreSQL, migration 0005, RLS, API, client, Control Center e E2E
passaram. A evidência é
`docs/04_audit/0505_plat_s15_controlled_knowledge_source_catalog_evidence.md`;
produção real permanece `NO-GO`.

## PLAT-S16 — Ledger controlado de evidência de release candidate

### Contrato

O S16 adiciona somente um registro de governança do candidato. O contrato é:

- `ReleaseCandidateRecord`: `tenantId`, `id`, `agentId`, `versionId`,
  `evidenceDigest`, quatro `gateResults`, `status`, `createdBy`,
  `validatedBy`, `createdAt`, `updatedAt` e `validatedAt`;
- gates fixos e únicos: `safety_preflight`, `test_lab_regression`,
  `snapshot_integrity`, `external_boundary`;
- cada gate contém apenas `key`, `status` (`PASS` ou `FAIL`) e
  `evidenceRef` com formato `controlled://evidence/<id>`; não há texto bruto,
  URL externa, segredo, arquivo, resposta, trace ou conteúdo de knowledge;
- o digest é SHA-256 hexadecimal de uma representação canônica ordenada de
  tenant, agent, version e gates; o caller não pode escolher o digest;
- `ReleaseCandidateStatus` é `DRAFT`, `VALIDATED`, `REJECTED` ou `ARCHIVED`.

O create exige que `agentId` e `versionId` existam no mesmo tenant e pertençam
um ao outro. A store recalcula o digest, copia os gates e rejeita duplicidade
de `(tenant, agent, version, digest)`. A transição para `VALIDATED` exige quatro
gates `PASS`; `DRAFT -> REJECTED`, `DRAFT -> ARCHIVED`, `VALIDATED -> ARCHIVED`
e `REJECTED -> ARCHIVED` são as únicas demais transições válidas. Nenhuma
transição reabre ou modifica um registro atestado.

### Boundary API/UI e persistência

As rotas são:

- `POST /v1/admin/release-candidates`;
- `GET /v1/admin/release-candidates`;
- `GET /v1/admin/release-candidates/:candidateId`;
- `POST /v1/admin/release-candidates/:candidateId/transition`.

Todas exigem `agent:configure`, identidade confiável e tenant derivado do
contexto autenticado. O audit inclui somente `candidateId`, `agentId`,
`versionId`, status, digest e chaves fixas dos gates. A migration controlada
`0006_release_candidate_evidence.sql` usa constraints, trigger de
imutabilidade, índice e `FORCE ROW LEVEL SECURITY`.

O Control Center permite selecionar a versão observada, registrar referências
controladas e marcar cada gate como PASS/FAIL. A UI chama a transição com
`expectedStatus`, trata 409 e informa que `VALIDATED` não é publish nem
produção. O ledger não é consultado pelo runtime para liberar capabilities.

### Resultado controlado PLAT-S16

O contrato foi implementado e auditado sem ampliar a superfície de execução:
schema strict, digest canônico, store/repository tenant-scoped, migration 0006,
RLS, API, Control Center e testes de boundary passaram. `VALIDATED` permanece
uma atestação administrativa e não altera `AgentVersion`, `activeVersionId`,
provider, canal, RAG ou side effect. Evidência:
`docs/04_audit/0506_plat_s16_controlled_release_candidate_evidence_ledger_evidence.md`.
O resultado é `COMPLETED_CONTROLLED`; produção real continua `NO-GO`.

## PLAT-S18 — Contrato do boundary HTTP de segurança

### Modelo e opções

Adicionar `apps/api/src/http-security.ts` com contrato tipado:

- `HttpSecurityOptions.allowedOrigins`: lista de origins normalizadas;
- `enforceHttps`: booleano explícito;
- `trustedProxyHops`: inteiro de `0` a `4`, usado diretamente no `Fastify`
  `trustProxy` e nunca inferido de headers do caller;
- `hstsMaxAgeSeconds`: inteiro bounded entre 300 e 31.536.000, com default
  controlado e sem opção de desligar headers obrigatórios.

`normalizeOrigin` deve aceitar somente URL `http`/`https` sem usuário, senha,
path diferente de `/`, query ou fragmento. `*` e `null` falham. A comparação
usa `URL.origin`, deduplica e não preserva input bruto. `API_ALLOWED_ORIGINS` é
uma lista separada por vírgula e passa pelo mesmo parser.

### CORS, preflight e transporte

- Métodos CORS allowlisted: `GET`, `POST`, `PATCH` e `OPTIONS`, cobrindo o
  fluxo existente de atualização de tarefas do Secretary.
- Headers allowlisted: `accept`, `content-type`, `x-cvg-operator-token`,
  `x-operator-id`, `x-operator-role`, `x-tenant-id`, `x-cvg-webhook-id`,
  `x-cvg-webhook-signature` e `x-cvg-webhook-timestamp`.
- Request com `Origin` ausente continua válido para chamadas server-to-server;
  request com `Origin` presente exige match exato.
- `OPTIONS` exige origin, método e headers solicitados válidos, responde `204`
  com `Access-Control-Allow-Origin` exato, `Access-Control-Allow-Methods`,
  `Access-Control-Allow-Headers`, `Access-Control-Max-Age` e `Vary: Origin`,
  sem `Access-Control-Allow-Credentials`.
- Origin, método ou header inválido retorna envelope controlado `403` antes de
  qualquer handler.
- Com `enforceHttps`, `request.protocol` deve ser `https`; `trustedProxyHops`
  controla a leitura de `X-Forwarded-Proto` pelo Fastify. Sem HTTPS a resposta
  é `426` e nenhum handler é executado.

### Headers obrigatórios e bootstrap

Cada resposta recebe `Content-Security-Policy: default-src 'none';
frame-ancestors 'none'; base-uri 'none'; form-action 'none'`,
`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: no-referrer` e `X-Permitted-Cross-Domain-Policies: none`.
`Strict-Transport-Security` só é emitido em HTTPS e usa o max-age validado.

`packages/shared/src/env.ts` passa a validar `API_ALLOWED_ORIGINS`,
`API_REQUIRE_HTTPS` e `API_TRUSTED_PROXY_HOPS`. Em `NODE_ENV=production`, a
allowlist não pode ser vazia e `API_REQUIRE_HTTPS` deve ser `true`. O factory
`buildServerFromEnv` transporta a política para o Fastify; `buildServer` aceita
somente opções já tipadas para fixtures/controladas.

### Gate de implementação S18

Antes de fechar `PLAT-S18-001`, devem passar RED/GREEN de normalização,
wildcard/null/path/credenciais, CORS/preflight, métodos/headers, `Vary`,
ausência de credentials, HTTPS/proxy, headers, HSTS e bootstrap production;
além de typecheck, lint, format, build, coverage, readiness, E2E, PostgreSQL,
audit e inspeção de que não houve alteração de persistência, provider, canal,
RAG ou side effect.

### Limites

Este contrato fortalece a borda do processo, mas não configura o host real nem
prova TLS, Caddy/CDN, IdP, CSRF por cookie, rate limiter distribuído, HA ou
política de produção. O release continua `CONTROLLED_MVP_READY` e produção
real `NO-GO`/`WAITING_HUMAN_APPROVAL`.

### Resultado de verificação S18

O contrato foi implementado e auditado como `COMPLETED_CONTROLLED`. A rodada
final passou com 97 arquivos, 330 testes pass e 18 skips; coverage 85,16%
statements, 80,44% branches, 84,75% functions e 86,06% lines; readiness 4/4,
E2E 3/3, PostgreSQL controlado 51 pass/18 skips, audit 0 e diff check PASS.
Evidência: `docs/04_audit/0508_plat_s18_controlled_http_security_boundary_evidence.md`.

## PLAT-S17 — Checkpoint controlado de evidência de auditoria

### Contrato

`AuditEvidenceCheckpointRecord` contém `tenantId`, `id`, filtros bounded,
`eventIds`, `eventCount`, `evidenceDigest`, `status`, `createdBy`,
`createdAt` e `updatedAt`. O input aceita no máximo 200 IDs únicos de eventos
de auditoria e filtros opcionais `sessionId`, `correlationId`, `type` e
`actorId`, sem campos extras ou payload.

O create busca os eventos no tenant autenticado, confirma que todos existem e
que satisfazem os filtros, redige a representação e calcula SHA-256 canônico
com tenant, filtros, IDs ordenados e metadados/payload sanitizado. O caller não
fornece digest. `SEALED` é o estado inicial; somente `SEALED -> ARCHIVED` é
válido e aceita `expectedStatus`.

### Boundary API/UI e persistência

As rotas são `POST/GET /v1/observability/audit-evidence/checkpoints`,
`GET /v1/observability/audit-evidence/checkpoints/:checkpointId` e
`POST /v1/observability/audit-evidence/checkpoints/:checkpointId/transition`.
Todas exigem identidade de auditoria e tenant derivado do contexto. A
auditoria da operação registra somente checkpointId, IDs, contagem, digest,
status e chaves de filtro.

A migration `0007_audit_evidence_checkpoint.sql` cria tabela tenant-aware com
unique/digest bounded, índices, trigger de imutabilidade, `FORCE ROW LEVEL
SECURITY` e política tenant-scoped. A UI de Auditoria permite selar o conjunto
atualmente carregado e arquivar o checkpoint, sem renderizar payload adicional.

### Gate de implementação

Antes de fechar `PLAT-S17-001`, devem passar RED/GREEN de shape, limite,
digest, cross-tenant, filtros, identidade/digest imutáveis, lifecycle/CAS,
API/client/UI e repository PostgreSQL; além de typecheck, lint, format, build,
coverage, readiness, E2E, PostgreSQL, audit e inspeção de ausência de payload,
export externo e side effect.

### Resultado de verificação S17

O gate foi satisfeito e `PLAT-S17-001` está `COMPLETED_CONTROLLED`. A suíte
final passou com 95 arquivos, 317 testes pass e 18 skips; coverage 84,95%
statements, 80,00% branches, 84,52% functions e 85,82% lines; readiness 4/4,
E2E 2/2, PostgreSQL controlado 51 pass/18 skips, audit 0 e diff check PASS.
Evidência: `docs/04_audit/0507_plat_s17_controlled_audit_evidence_checkpoint_evidence.md`.

### Gate de implementação

Antes de fechar `PLAT-S16-001`, devem passar RED/GREEN de shape estrito,
referências externas/segredo, digest determinístico, vínculo agent/version,
duplicidade, cópia defensiva, lifecycle, gates FAIL, CAS, cross-tenant, API/UI
e repository PostgreSQL; além de typecheck, lint, format, build, coverage,
readiness, E2E, PostgreSQL, audit e inspeção de que não houve mutação de
`AgentVersion`, deploy, provider, canal, RAG ou side effect.

### Limites

O ledger é uma atestação controlada de metadados. Ele não verifica por si só
infraestrutura real nem substitui aprovação humana, change control, IdP,
observabilidade, retenção/PII ou activation gate de produção.

## PLAT-S19 — Contrato de observabilidade de requests controlada

### Collector bounded

Adicionar `apps/api/src/request-metrics.ts` com um collector process-local
controlado. O estado deve ser substituído imutavelmente a cada registro e o
snapshot deve ser defensivo. O contrato mínimo é:

- `record({ method, routeTemplate, statusCode, latencyMs })` sem aceitar body,
  query, path bruto, headers ou identidade;
- `method` normalizado para uppercase e limitado a uma chave bounded;
- `routeTemplate` recebido de `request.routeOptions.url`, com fallback fixo
  `__unmatched__`; nunca usar `request.url` como chave;
- `statusCode` agregado nos buckets `2xx`, `3xx`, `4xx`, `5xx` e `other`;
- `latencyMs` inteiro não negativo, com `totalLatencyMs` e
  `maxLatencyMs` bounded por registro;
- limite explícito de templates; novas rotas acima do limite entram em
  `__other__` e incrementam `droppedRouteCount`.

O snapshot contém somente versão do schema, timestamp de criação, total de
requests, contadores por método/status e entradas de rota. O caller não pode
mutar o snapshot para alterar o collector.

### Integração API

`buildServer` cria ou recebe um collector controlado e registra cada resposta
em `onResponse`, incluindo 404 e respostas rejeitadas antes do handler. O
endpoint read-only `GET /health/metrics` retorna o snapshot em envelope
controlado e também é contabilizado após a resposta. A rota nunca retorna
path/query, body, token, PII ou identidade.

### Gate de implementação S19

Antes de fechar `PLAT-S19-001`, devem passar RED/GREEN de normalização,
cardinalidade, status/latência, fallback de rota, cópia defensiva, integração
de 404/security rejection e envelope do endpoint; além de typecheck, lint,
format, build, coverage, readiness, E2E, PostgreSQL, audit e inspeção de que
não houve persistência, provider, canal, RAG ou side effect.

### Limites

Este lane entrega apenas observabilidade process-local controlada. Não é
Prometheus/OTel, não tem retenção ou agregação distribuída e não substitui
infraestrutura de métricas, alertas, SLO, HA ou aprovação operacional real.

### Resultado de verificação S19

O contrato foi implementado e auditado como `COMPLETED_CONTROLLED`. A rodada
final passou com 98 arquivos, 333 testes pass e 18 skips; coverage 85,24%
statements, 80,63% branches, 84,99% functions e 86,16% lines; readiness 4/4,
E2E 3/3, PostgreSQL controlado 51 pass/18 skips, audit 0 e diff check PASS.
Evidência: `docs/04_audit/0509_plat_s19_controlled_request_observability_metrics_evidence.md`.

## PLAT-S20 — Contrato de segurança de memória do rate limiter controlado

### Limites e estado

`InMemoryRateLimiter` permanece somente process-local e recebe opções
controladas. O contrato usa `DEFAULT_MAX_BUCKETS = 4096`, aceita no máximo
`MAX_ALLOWED_BUCKETS = 65536`, limita cada janela a 24 horas, cada `max` a
1.000.000 e cada chave normalizada a 256 caracteres. `maxBuckets`, `max` e
`windowMs` devem ser inteiros positivos dentro desses limites; chave vazia,
não-string ou acima do limite falha fechado.

O mapa interno é substituído, não mutado, a cada decisão. Antes de criar um
bucket, entradas com `resetAt <= now` são removidas. Se ainda não houver
capacidade, o bucket ativo com menor `resetAt` é removido; em empate, a ordem de
inserção determina a evicção. A cardinalidade nunca excede `maxBuckets`.

`snapshot()` pode retornar somente `bucketCount` e `maxBuckets` para testes e
diagnóstico controlado; não retorna chaves, IPs, tokens ou identidade. Uma
alteração de policy para uma chave já ativa não reinicia seu bucket: a janela
vigente continua sendo a autoridade até expirar.

### Boundary HTTP

O hook existente continua usando a chave derivada de `request.ip` pelo Fastify,
sem aceitar um header como autoridade. Quando o bucket exceder o limite, a API
mantém status 429, envelope `rate_limited` e `Retry-After` inteiro positivo, e
adiciona `Cache-Control: no-store`. Nenhuma resposta inclui a chave ou outro
detalhe do bucket.

### Gate de implementação S20

Antes de fechar `PLAT-S20-001`, devem passar RED/GREEN de política inválida,
chave inválida, expiração, isolamento entre chaves, evicção determinística,
cardinalidade máxima, snapshot sem chaves, compatibilidade do envelope 429 e
header `Cache-Control`; além de typecheck, lint, format, build, coverage,
readiness, E2E, PostgreSQL, audit e inspeção de que não houve alteração de
tenant/identity, persistência, provider, canal, RAG ou side effect.

### Limites

Este lane reduz o risco de crescimento de memória em uma instância local; não
entrega rate limiting distribuído, fairness entre instâncias, identidade
confiável, proteção no edge ou evidência de operação HA.

### Resultado de verificação S20

O contrato foi implementado e auditado como `COMPLETED_CONTROLLED`. A rodada
final passou com 98 arquivos, 335 testes pass e 18 skips; coverage 85,31%
statements, 80,72% branches, 85,07% functions e 86,23% lines; readiness 4/4,
E2E 3/3, PostgreSQL controlado 51 pass/18 skips, audit 0 e diff check PASS.
Evidência: `docs/04_audit/0510_plat_s20_controlled_rate_limit_memory_safety_evidence.md`.

## PLAT-S21 — Contrato de boundary de exposição de métricas controlada

### Regra de ambiente

`GET /health/metrics` é uma superfície de inspeção de fixtures, não uma
interface operacional pública. O servidor habilita a rota somente quando
`NODE_ENV` é exatamente `test` ou `development`; nesses ambientes,
`requestMetricsEnabled` pode desligá-la para testes negativos. Em `production`,
`staging` ou ambiente ausente/desconhecido, a rota permanece desabilitada e
qualquer opção de build não pode reabilitá-la.

Quando desabilitada, a resposta é 404 com mensagem genérica e sem snapshot. A
resposta habilitada ou desabilitada inclui `Cache-Control: no-store`. O endpoint
`GET /health` permanece separado e não herda essa regra de exposição.

### Gate de implementação S21

Antes de fechar `PLAT-S21-001`, devem passar RED/GREEN para rota habilitada em
test/development, opção explícita disabled, production fail-closed mesmo com
override, ambiente desconhecido, 404 sem métricas e `Cache-Control: no-store`;
além de typecheck, lint, format, build, coverage, readiness, E2E, PostgreSQL,
audit e inspeção de que não houve autenticação falsa, persistência, provider,
canal, RAG ou side effect.

### Limites

Este lane fecha somente exposição acidental do collector local. Não entrega
IdP, autenticação de métricas, allowlist de rede, Prometheus/OTel, operação HA,
alerting ou uma superfície de observabilidade de produção.

### Resultado de verificação S21

O contrato foi implementado e auditado como `COMPLETED_CONTROLLED`. A rodada
final passou com 99 arquivos, 337 testes pass e 18 skips; coverage 85,33%
statements, 80,74% branches, 85,07% functions e 86,25% lines; readiness 4/4,
E2E 3/3, PostgreSQL controlado 51 pass/18 skips, audit 0 e diff check PASS.
Evidência: `docs/04_audit/0511_plat_s21_controlled_metrics_exposure_boundary_evidence.md`.

## PLAT-S22 — Contrato de correlation ID na resposta HTTP

### Regra de resposta

O boundary HTTP deve publicar `X-Correlation-Id` somente quando o payload JSON
for um envelope com `meta.correlationId` válido segundo `CorrelationIdSchema`.
O valor do header deve ser exatamente o do envelope; nenhum
`X-Correlation-Id` recebido do caller pode ser reutilizado ou refletido.

### Regra CORS

Quando uma origem foi aprovada pelo boundary S18, a resposta de negócio pode
expor somente `X-Correlation-Id` com `Access-Control-Expose-Headers`. Requests
server-to-server continuam recebendo o header de correlação, mas não recebem
exposição CORS. Preflight 204 não publica um correlation ID.

### Gate de implementação S22

Antes de fechar `PLAT-S22-001`, devem passar RED/GREEN para resposta normal,
erro do boundary, origem CORS aprovada, origem ausente, preflight, payload sem
envelope e tentativa de header externo; além de typecheck, lint, format, build,
coverage, readiness, E2E, PostgreSQL, audit e inspeção de que não houve mudança
de autenticação, tenant, persistência, provider, canal, RAG ou side effect.

### Limites

Este lane adiciona somente um header de correlação derivado de envelope já
existente. Não entrega tracing distribuído, OTel, broker, ingestão de headers
externos, logging de payload ou observabilidade operacional de produção.

### Gate de resultado S22

`PLAT-S22-001_CONTROLLED_CORRELATION_RESPONSE_BOUNDARY` foi implementado e
auditado como `COMPLETED_CONTROLLED`. A rodada passou com 100 arquivos, 343
testes pass e 18 skips; coverage 85,37% statements, 80,81% branches, 85,10%
functions e 86,29% lines; readiness 4/4, E2E 3/3, PostgreSQL controlado 51
pass/18 skips, audit 0 e diff check PASS. Evidência:
`docs/04_audit/0512_plat_s22_controlled_correlation_response_boundary_evidence.md`.
Produção permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S31 — Contrato de boundary da nota de decisão de approval

### Contrato de entrada

- `approvalRequestId`: contrato existente, sobrescrito pelo path e limitado
  pela rota;
- `decision`: enum de decisão existente;
- `operatorId`: identidade do operador continua sendo sobrescrita pela
  identidade autenticada;
- `note`: string opcional com no máximo 4.000 caracteres;
- approval state, handoff, tenant/auth e semântica atual de não persistência da
  nota permanecem conforme os contratos existentes.

### Aceite e limites

Testes RED/GREEN devem cobrir `note` acima do limite, envelope seguro
`validation_failed`/400, ausência de chamada a `approvals.save`, ausência de
mutação do approval e decisão válida com nota no limite. Verify, readiness, E2E,
PostgreSQL, audit, format e diff check devem permanecer verdes. Não haverá
mudança de auth, tenant, identidade, Secretary, decisão humana, provider/canal,
RAG, dado real, deploy ou side effect.

### Gate registrado S31

`PLAT-S31-001_CONTROLLED_APPROVAL_DECISION_NOTE_FIELD_BOUNDARY` foi registrado
para `SPEC_APPROVED_CONTROLLED_BUILD` antes do BUILD e fechado como
`COMPLETED_CONTROLLED`. Evidência:
`docs/04_audit/0521_plat_s31_controlled_approval_decision_note_field_boundary_evidence.md`.

### Resultado validado S31

`note` acima de 4.000 agora falha como `validation_failed`/400 antes de
`approvals.save`, sem echo e sem mutação do approval pending; nota no limite
preserva decisão `approved`. Verify e gates externos permaneceram verdes.

## PLAT-S30 — Contrato de boundary de campos de approval request

### Contrato de entrada

- `sessionId`: string não vazia com no máximo 160 caracteres;
- `proposedAction`: string não vazia com no máximo 200 caracteres;
- `summary`: string não vazia com no máximo 4.000 caracteres;
- `riskLevel`, envelope, tenant/auth, approval pending e decisão humana
  permanecem conforme os contratos existentes.

### Aceite e limites

Testes RED/GREEN devem cobrir cada campo acima do limite, envelope seguro
`validation_failed`/400, ausência de chamada a `approvals.save` e criação válida
com fixture. Verify, readiness, E2E, PostgreSQL, audit, format e diff check
devem permanecer verdes. Não haverá mudança de auth, tenant, identidade,
Secretary, handoff, decisão de approval, provider/canal, RAG, dado real, deploy
ou side effect.

### Gate registrado S30

`PLAT-S30-001_CONTROLLED_APPROVAL_REQUEST_FIELD_BOUNDARY` foi registrado para
`SPEC_APPROVED_CONTROLLED_BUILD` antes do BUILD e fechado como
`COMPLETED_CONTROLLED`. Evidência:
`docs/04_audit/0520_plat_s30_controlled_approval_request_field_boundary_evidence.md`.

### Resultado validado S30

Os três campos excedentes agora falham como `validation_failed`/400 antes de
`approvals.save`, sem echo; valores nos limites são aceitos e approval permanece
`pending`. Verify passou com 108 arquivos/394 testes pass/18 skips e todos os
gates externos.

## PLAT-S29 — Contrato de boundary de campos de tarefa interna

### Contrato de entrada

- `sessionId`: string não vazia com no máximo 160 caracteres;
- `title`: string não vazia com no máximo 200 caracteres;
- `description`: string não vazia com no máximo 4.000 caracteres;
- `source`: string não vazia com no máximo 120 caracteres;
- `idempotencyKey`: string com mínimo 8 e máximo 200 caracteres;
- prioridade, envelope, tenant/auth e semântica de idempotência permanecem
  conforme os contratos existentes.

### Aceite e limites

Testes RED/GREEN devem cobrir cada campo acima do limite, envelope seguro
`validation_failed`/400, ausência de chamada a `tasks.create` e criação válida
com fixture. Verify, readiness, E2E, PostgreSQL, audit, format e diff check
devem permanecer verdes. Não haverá mudança de auth, tenant, identidade,
Secretary, persistência estrutural, provider/canal, RAG, dado real, deploy ou
side effect.

### Gate registrado S29

`PLAT-S29-001_CONTROLLED_INTERNAL_TASK_FIELD_BOUNDARY` foi registrado para
`SPEC_APPROVED_CONTROLLED_BUILD` antes do BUILD e fechado como
`COMPLETED_CONTROLLED`. Evidência:
`docs/04_audit/0519_plat_s29_controlled_internal_task_field_boundary_evidence.md`.

### Resultado validado S29

Os cinco campos excedentes agora falham como `validation_failed`/400 antes de
`tasks.create`, sem echo; valores nos limites são aceitos. Verify passou com
107 arquivos/389 testes pass/18 skips e todos os gates externos. A evidência é
`docs/04_audit/0519_plat_s29_controlled_internal_task_field_boundary_evidence.md`;
`PLAT-S29-001` = `COMPLETED_CONTROLLED`.

## PLAT-S28 — Contrato de boundary de filtros duplicados de audit evidence

### Contrato de entrada

- `sessionId`, `correlationId`, `actorId` e `type` devem ser single-valued;
- qualquer array produzido por query repetida deve falhar com
  `validation_failed`/400 e mensagem constante;
- a falha deve ocorrer antes de `summarizeEvidence` e `listEvidence`;
- valores únicos e `limit`/`offset` válidos permanecem inalterados.

### Aceite e limites

Testes RED/GREEN devem cobrir cada filtro repetido, envelope seguro, ausência de
chamada aos dois repositórios e regressão de filtro único. Verify, readiness,
E2E, PostgreSQL, audit, format e diff check devem permanecer verdes. Não haverá
mudança de offset/limit, auth, tenant, identidade, Secretary, persistência
estrutural, provider/canal, RAG, dado real, deploy ou side effect.

### Gate registrado S28

`PLAT-S28-001_CONTROLLED_AUDIT_FILTER_DUPLICATE_BOUNDARY` está registrado para
`SPEC_APPROVED_CONTROLLED_BUILD` e foi fechado como `COMPLETED_CONTROLLED` após
RED/GREEN e todos os gates. Evidência:
`docs/04_audit/0518_plat_s28_controlled_audit_filter_duplicate_boundary_evidence.md`.

### Resultado validado S28

Arrays de `sessionId`, `correlationId`, `actorId` e `type` falham com
`validation_failed`/400 antes de `summarizeEvidence`/`listEvidence`; valores
únicos e paginação continuam válidos. As fronteiras de S27, Secretary, auth,
tenant, identidade, persistência, provider/canal, RAG, dado real, deploy e side
effect permanecem inalteradas.

## PLAT-S27 — Contrato de boundary de offset de paginação

### Contrato de entrada

- declarar `HTTP_PAGINATION_MAX_OFFSET = 10000`;
- aceitar `offset` ausente como 0 e somente inteiros seguros entre 0 e 10.000;
- rejeitar negativo, fracionário, `Infinity`, notação que produza número não
  seguro e qualquer valor acima do teto com `invalid_pagination`/400;
- aplicar o contrato a `/v1/conversations` e
  `/v1/observability/audit-evidence` antes de chamar o repositório.

### Aceite e limites

Testes RED/GREEN devem cobrir limites inclusivos, valores não seguros, ambos os
endpoints e ausência de chamada ao repositório em entradas inválidas. Verify,
readiness, E2E, PostgreSQL, audit, format e diff check devem permanecer verdes.
Não haverá mudança de `limit`, cursor, auth, tenant, identidade, Secretary,
persistência estrutural, provider/canal, RAG, dado real, deploy ou side effect.

### Gate registrado S27

`PLAT-S27-001_CONTROLLED_PAGINATION_OFFSET_BOUNDARY` está registrado para
`SPEC_APPROVED_CONTROLLED_BUILD` e foi fechado como
`COMPLETED_CONTROLLED` após RED/GREEN e todos os gates. Evidência:
`docs/04_audit/0517_plat_s27_controlled_pagination_offset_boundary_evidence.md`.

### Resultado validado S27

O classificador bounded aceita offset ausente/0 e o limite inclusivo 10.000;
rejeita negativos, fracionários, valores não seguros e acima do teto antes de
`listPage`/`listEvidence`. Limit, cursor, auth, tenant, identidade, Secretary,
persistência estrutural, provider/canal, RAG, dado real, deploy e side effect
permanecem fora do lane.

## PLAT-S26 — Contrato de boundary de mensagens de erro do Prompt Profile

### Contrato de erro

- `assertPromptProfileIntegrity` não pode incluir em `DomainError.message` a
  chave de `responseTemplates` ou o ID de `promptBlocks` recebido no payload;
- `assertPromptProfileClone` não pode incluir IDs de blocks protegidos ou novos
  blocks no erro externo;
- as mensagens devem ser constantes, o código de erro deve permanecer
  `validation_failed` ou `invalid_action` conforme o caso e o API deve manter
  status, envelope, correlation ID e ausência de clone;
- valores sentinela enviados no payload não podem aparecer em `error.message` ou
  no JSON completo da resposta.

### Aceite

Testes unitários cobrem cada classe de erro e teste de integração cobre clone
com chave/ID sentinela, status/código/correlation e ausência de nova versão.
Também devem passar typecheck, lint, format, build, coverage, readiness, E2E,
PostgreSQL, audit e diff check, sem mudança de comportamento do Secretary.

### Limites

Este lane trata somente mensagens externas dos erros dinâmicos do Prompt Profile.
Não altera `toSafeError` para todos os domínios, auth, tenant, identidade,
body/parser, request-target S25, persistência, provider/canal, RAG, dado real,
deploy ou side effect.

### Gate registrado S26

`PLAT-S26-001_CONTROLLED_PROMPT_PROFILE_ERROR_MESSAGE_BOUNDARY` foi registrado
para `SPEC_APPROVED_CONTROLLED_BUILD` e executado até AUDIT como
`COMPLETED_CONTROLLED`. Evidência:
`docs/04_audit/0516_plat_s26_controlled_error_message_boundary_evidence.md`.
Gates: focused 4/4; regressão 3 arquivos/21 testes; verify 104 arquivos/371
testes pass/18 skips; coverage 85,41%/80,77%/85,24%/86,42%; readiness, E2E,
PostgreSQL, audit, format e diff check PASS. Produção permanece `NO-GO`/
`WAITING_HUMAN_APPROVAL`.

## PLAT-S25 — Contrato de boundary do request-target HTTP

### Contrato de entrada

O Fastify deve declarar `HTTP_REQUEST_TARGET_LIMIT_BYTES = 8192` e
`maxParamLength = 100`, sem depender dos defaults implícitos. A comparação usa
o request-target bruto em bytes UTF-8; nenhum path ou query é incluído na
mensagem de erro.

### Contrato de resposta

O `setNotFoundHandler` deve responder envelope `{ success: false, data: null,
error, meta }` com correlation ID server-generated, status 404 e
`not_found` para rota/método desconhecido. Quando o request-target exceder 8192
bytes, deve responder status 414 e `request_uri_too_long` com mensagem
constante. O corpo padrão do Fastify, request URL, headers, stack e detalhes
internos não podem aparecer.

### Gate de implementação S25

Antes de fechar `PLAT-S25-001`, devem passar testes RED/GREEN para 404 sem echo,
414 para path e query longos, parâmetro acima do limite, target válido dentro do
limite e paridade do correlation header; também typecheck, lint, format, build,
coverage, readiness, E2E, PostgreSQL, audit e diff check.

### Limites

Este lane trata somente roteamento/request-target e a representação segura de
404/414. Não altera body/parser S24, auth, tenant, identidade, Secretary,
persistência, provider/canal, RAG, dado real, deploy ou side effect.

### Gate registrado S25

`PLAT-S25-001_CONTROLLED_HTTP_TARGET_BOUNDARY` está autorizado para BUILD
controlado somente após este registro, com gate
`SPEC_APPROVED_CONTROLLED_BUILD`, e foi auditado como `COMPLETED_CONTROLLED`.
Evidência: `docs/04_audit/0515_plat_s25_controlled_http_target_boundary_evidence.md`.
Gates: 103 arquivos/367 testes pass/18 skips; coverage 85,41%/80,76%/85,24%/
86,42%; readiness 4/4; E2E 3/3; PostgreSQL controlado 51 pass/18 skips; audit,
format e diff check PASS. Produção permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S24 — Contrato de boundary de parsing HTTP e payload controlado

### Contrato de entrada

O Fastify deve ser construído com `HTTP_REQUEST_BODY_LIMIT_BYTES = 1_048_576`
(1 MiB), sem depender do default implícito do framework. O parser JSON pode
guardar raw body somente dentro desse limite e deve converter JSON inválido em
erro classificado, sem transportar a mensagem original para o response.

O error handler global deve classificar somente códigos conhecidos:

- `FST_ERR_CTP_INVALID_JSON_BODY`/`FST_ERR_CTP_EMPTY_JSON_BODY` →
  `validation_failed`, HTTP 400, `Request body is invalid`;
- `FST_ERR_CTP_INVALID_MEDIA_TYPE` → `unsupported_media_type`, HTTP 415,
  `Unsupported media type`;
- `FST_ERR_CTP_BODY_TOO_LARGE` → `payload_too_large`, HTTP 413,
  `Request body exceeds the maximum allowed size`;
- qualquer outro erro → `internal_error`, HTTP 500,
  `Unexpected internal error`.

Todos os responses classificados são envelopes com correlation ID criado pelo
servidor. Não entram na resposta o objeto do erro, `message` arbitrária,
`stack`, `cause`, headers, query, params ou raw body. O header
`X-Correlation-Id` continua sendo derivado somente do envelope pelo hook S22.

### Gate de implementação S24

Antes de fechar `PLAT-S24-001`, devem passar RED/GREEN para JSON inválido,
body excessivo, media type não suportado, erro desconhecido e correlação do
envelope; também typecheck, lint, format, build, coverage, readiness, E2E,
PostgreSQL, audit e diff check.

### Limites

Este lane fecha somente parsing e tamanho de entrada HTTP. Não entrega upload,
multipart, streaming, provider/canal, RAG, dados reais, deploy, mudança de
identidade/tenant ou side effect.

### Gate registrado S24

`PLAT-S24-001_CONTROLLED_HTTP_PARSE_PAYLOAD_BOUNDARY` está autorizado para
BUILD controlado somente após este registro e foi auditado como
`COMPLETED_CONTROLLED`. Evidência:
`docs/04_audit/0514_plat_s24_controlled_http_parse_payload_boundary_evidence.md`.
Gates: 102 arquivos/359 testes pass/18 skips; coverage 85,46%/80,85%/85,21%/
86,40%; readiness 4/4; E2E 3/3; PostgreSQL controlado 51 pass/18 skips; audit,
format e diff check PASS. Produção permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

### Resultado controlado S24

O bodyLimit explícito, parser classificado e error handler global preservam o
contrato do Secretary e das fronteiras anteriores. CTRL-97..100 = `PASS
controlled`; não houve upload, provider, canal, RAG, dado real ou side effect.

## PLAT-S23 — Contrato de boundary de falha de startup controlada

### Contrato de saída

O entrypoint `apps/api/src/main.ts` deve tratar a falha assíncrona de
bootstrap por uma função pura e testável. A saída deve ser um objeto mínimo
com `event: "api.startup_failed"`, `code` e `message`, serializado em uma
única linha JSON por `console.error`. O objeto original, `stack`, `cause` e
campos arbitrários nunca entram na saída.

`Error` com mensagem operacional usa uma sanitização dedicada que também
reutiliza a redaction de PII existente. A sanitização deve ocultar credenciais
em URLs, valores associados a `password`, `secret`, `token` e `apiKey`,
esquemas `Bearer`/`Basic`, limitar o tamanho e normalizar controles/quebras de
linha. `ZodError` e valores que não são `Error` recebem a resposta genérica
`configuration_invalid` ou `startup_failed`, sem tentar reproduzir detalhes.

O boundary não altera `parseEnv`, `buildServerFromEnv`, o código de saída, a
ordem de inicialização, os preflights PostgreSQL ou o modo fail-closed. Ele
somente controla a representação do erro no stderr.

### Gate de implementação S23

Antes de fechar `PLAT-S23-001`, devem passar RED/GREEN para mensagem segura
conhecida, Zod/unknown genérico, URL com credencial, bearer/token, PII,
newline/log injection, truncamento, ausência de `stack`/`cause` e integração
do entrypoint sem envio do objeto bruto. Também devem passar typecheck, lint,
format, build, coverage, readiness, E2E, PostgreSQL, audit e diff check.

### Limites

Este lane entrega apenas uma fronteira local de diagnóstico de startup. Não
entrega logging operacional, retenção, alerting, observabilidade distribuída,
IdP, tenant binding, provider/canal, RAG, dado real, deploy ou side effect.

### Gate registrado

`PLAT-S23-001_CONTROLLED_STARTUP_FAILURE_REDACTION` está autorizado para BUILD
controlado somente após este registro e foi auditado como
`COMPLETED_CONTROLLED`. Evidência:
`docs/04_audit/0513_plat_s23_controlled_startup_failure_redaction_evidence.md`.
Os gates passaram com 101 arquivos, 351 testes pass, 18 skips, coverage
85,42%/80,84%/85,16%/86,33%, readiness, E2E, PostgreSQL controlado, audit,
format e diff check. Produção real continua `NO-GO`/
`WAITING_HUMAN_APPROVAL`.
