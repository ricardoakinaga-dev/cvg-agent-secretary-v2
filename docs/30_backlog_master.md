# BACKLOG MASTER — CVG

## PLAT-S47 — Controlled Multi-Agent Creation Mode

- id: `PLAT-S47-001_CONTROLLED_MULTI_AGENT_CREATION_MODE`
- prioridade: P0
- status: `COMPLETED_CONTROLLED`
- fase: `AUDIT`
- owner: `platform/control-center`
- dependências: `PLAT-S46-001`, `PLAT-S01-001`
- contrato: oferecer modo explícito `Novo agente`, limpar estado derivado sem
  apagar identidade e permitir Agent A/B distintos no mesmo Control Center,
  tenant e kernel
- aceite: criação A/B pela UI/API, configurações independentes, troca sem
  state bleed (inclusive respostas tardias) e clone versionado intacto para
  agentes existentes
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem provider/canal real, RAG, rede, deploy, dado real ou side effect
- evidência planejada:
  `docs/04_audit/0537_plat-s47_controlled_multi_agent_creation_evidence.md`

### Auditoria corretiva S47 — 2026-08-26

O ciclo corretivo fechou os achados de isolamento do Trace Viewer, leitura sem
`agentId`, reutilização de escopo após A→B→A, redaction de traces no cliente e
payload legado com `spans` não-array. Os critérios CTRL-180 a CTRL-185 estão
`PASS controlled`. A regressão passou 127 arquivos/534 testes, com 2 arquivos/
19 testes skipped; coverage 84,86/80,12/84,97/85,97; build 158 módulos; E2E
4/4; PostgreSQL 8/72; readiness 4/4; worker smoke; audit 0; typecheck, lint,
format e diff check PASS. A crítica independente compatível final retornou
`PASS_CONTROLLED`, sem P0/P1/P2/P3; nenhum arquivo foi alterado pelo revisor.
Produção permanece `NO-GO`/`WAITING_HUMAN_APPROVAL` e a próxima ação segura é
nova `DISCOVERY -> PRD -> SPEC` controlada.

## PLAT-S46 — Controlled Execution Trace Correlation Boundary

- id: `PLAT-S46-001_CONTROLLED_EXECUTION_TRACE_CORRELATION_BOUNDARY`
- prioridade: P1
- status: `COMPLETED_CONTROLLED`
- fase: `AUDIT`
- owner: `platform/observability/agent-core`
- dependências: `PLAT-S45-001`, `PLAT-S44-001`, `PLAT-S42-001`
- contrato: criar/validar um `traceId` único no início de cada execução e
  propagá-lo para eventos, hooks, tools, auditorias e trace persistido sem
  substituir IDs locais de evento/call
- aceite: propagação única no Test Lab/runtime publicado, gateway standalone
  controlado, rejeição de ID inválido antes de efeito, sinks preservam a
  referência e nenhum payload sensível é adicionado
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem tracing externo, OTel/exporter, broker, rede, provider/canal real,
  RAG, deploy, dado real ou side effect
- evidência planejada:
  `docs/04_audit/0536_plat-s46_controlled_execution_trace_correlation_boundary_evidence.md`

### Fechamento controlado S46 — 2026-08-26T11:22:54-03:00

RED: 4 arquivos/33 testes, 8 falhas esperadas; GREEN de fechamento: 6
arquivos/25 testes pass. Regressão 126 arquivos/523 testes pass, 2 arquivos/
19 testes skipped; coverage 85,07/80,06/85,95/86,10; PostgreSQL 8/72; readiness
4/4; worker smoke; E2E 4/4; build 70 módulos; audit 0; typecheck, lint, format
e diff check PASS. Revisão independente compatível read-only: `PASS` sem
P0/P1/P2. Produção permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S45 — Controlled Tool Invocation Boundary

- id: `PLAT-S45-001_CONTROLLED_TOOL_INVOCATION_BOUNDARY`
- prioridade: P0
- status: `COMPLETED_CONTROLLED`
- fase: `AUDIT`
- owner: `platform/security/plugin-runtime`
- dependências: `PLAT-S44-001`, `PLAT-S35-001`
- entrega: validators server-side de input/output por tool compilada,
  autorização efetiva do actor, validação bounded de actor/input e projeção
  segura de resultado de handler no Capability Gateway
- aceite: input inválido, actor malformado, validator ausente/excedente ou
  resultado inválido falham fechado antes de approval/handler; nenhum input ou
  output bruto atravessa a boundary; approval requer autoridade durável e
  single-use; falha de auditoria não repete execução; fixtures válidas mantêm
  compatibilidade
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem import dinâmico, marketplace, provider/canal real, rede, RAG,
  broker, outbox, egress, deploy, dado real ou side effect
- evidência planejada:
  `docs/04_audit/0535_plat-s45_controlled_tool_invocation_boundary_evidence.md`

### Registro controlado S45

Discovery read-only reproduziu `null` encaminhado ao handler e resultado com
`data.raw` devolvido sem projeção; actor com `permissions` ausente gerou
`TypeError`. O BUILD foi concluído e os gates controlados passaram. A revisão
independente compatível read-only retornou `PASS sem P0/P1`, e a evidência foi
fechada como `COMPLETED_CONTROLLED`.

Fechamento: focused 6/41; `npm test` 125 arquivos/512 testes pass, 2 arquivos/
19 testes skipped; coverage 85,01/80,14/85,82/86,03; PostgreSQL controlado
6/53 com 2/19 skipped; E2E 4/4; readiness 4/4; worker smoke; build 70 módulos;
typecheck, lint, format, audit 0 e diff check PASS. Produção permanece
`NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S44 — Controlled Trace Stage Timing

- id: `PLAT-S44-001_CONTROLLED_TRACE_STAGE_TIMING`
- prioridade: P1
- status: `COMPLETED_CONTROLLED`
- fase: `AUDIT`
- owner: `platform/observability/agent-core`
- dependências: `PLAT-S43-001`, `PLAT-S42-001`
- entrega: clock monotônico local injetável, ledger bounded e durações de
  estágios no executor/trace
- aceite: etapas executadas têm duração medida finita; skipped zero; soma
  bounded; sem payload ou integração externa
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem OTel, exporter, broker, rede, provider/canal real, RAG, deploy,
  dado real ou side effect
- evidência planejada:
  `docs/04_audit/0534_plat-s44_controlled_trace_stage_timing_evidence.md`

### Registro controlado S44

Discovery confirmou zero estático em todos os spans e ausência de clock/ledger
injetável. O lane foi implementado e auditado; produção real permanece
`NO-GO`/`WAITING_HUMAN_APPROVAL`.

### Fechamento S44

Focused 2/17, regressão 124/501 com 2/19 skipped, coverage
85,18/80,44/85,70/86,16, PostgreSQL 8/72, E2E 4/4, readiness 4/4, build 70
módulos, audit 0 e checks estáticos passaram. Evidência:
`docs/04_audit/0534_plat-s44_controlled_trace_stage_timing_evidence.md`.

## PLAT-S43 — Controlled Trace Temporal Integrity

- id: `PLAT-S43-001_CONTROLLED_TRACE_TEMPORAL_INTEGRITY`
- prioridade: P1
- status: `COMPLETED_CONTROLLED`
- fase: `AUDIT`
- owner: `platform/observability/security`
- dependências: `PLAT-S42-001`, `PLAT-S41-001`
- entrega: invariantes de timestamps/latência e ordem/status de spans no
  parser compartilhado, sem telemetria externa
- aceite: incoerências temporais/ordinais falham fechado; traces sem campos
  opcionais continuam compatíveis
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem OTel, exporter, broker, rede, provider/canal real, RAG, deploy,
  dado real ou side effect
- evidência planejada:
  `docs/04_audit/0533_plat-s43_controlled_trace_temporal_integrity_evidence.md`

### Registro controlado S43

Discovery encontrou `durationMs: 0` estático nos spans e ausência de invariantes
temporais/ordinais. O lane foi construído e auditado; a instrumentação medida
fica para uma próxima lane controlada.

### Fechamento S43

Focused 1/14, regressão 124/499 com 2/19 skipped, coverage
85,08/80,41/85,45/86,08, PostgreSQL 8/72, E2E 4/4, readiness 4/4, build 70
módulos, audit 0 e checks estáticos passaram. Evidência:
`docs/04_audit/0533_plat-s43_controlled_trace_temporal_integrity_evidence.md`.

## PLAT-S42 — Controlled Trace Provenance Boundary

- id: `PLAT-S42-001_CONTROLLED_TRACE_PROVENANCE_BOUNDARY`
- prioridade: P0
- status: `COMPLETED_CONTROLLED`
- fase: `AUDIT`
- owner: `platform/persistence/security`
- dependências: `PLAT-S41-001`, `PLAT-S40-001`, `PLAT-FOUNDATION-009`
- entrega: parser/projeção runtime allowlist do `TestRunTrace`, validação
  bounded de IDs/estruturas/datas/spans, provider controlado e
  `externalCall: false`, redaction/output policy e aplicação uniforme em
  sinks diretos, suites aninhadas e leituras PostgreSQL
- aceite: campos extras não sobrevivem; trace malformado, provider externo,
  `externalCall: true`, IDs inválidos ou output inconsistente falham fechado
  antes de INSERT/retorno; nenhum dado bruto inseguro é devolvido
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem provider/canal real, RAG, broker, outbox, egress, secret manager,
  deploy, migração estrutural, dados reais ou side effect
- evidência planejada:
  `docs/04_audit/0532_plat_s42_controlled_trace_provenance_boundary_evidence.md`

### Registro controlado S42

Discovery confirmou que o contrato de trace era apenas TypeScript, que a suite
clonava traces aninhados sem chamar `sanitizeTraceForPersistence` e que
listagens PostgreSQL devolviam JSON sem revalidação. O lane foi construído,
testado e auditado; produção real continua `NO-GO`/`WAITING_HUMAN_APPROVAL`.

### Fechamento S42

Focused 6/76, regressão 124/492 com 2/19 skipped, coverage
84,99/80,24/85,41/86,00, PostgreSQL 8/72, E2E 4/4, readiness 4/4, build 70
módulos, audit 0 e checks estáticos passaram. Evidência:
`docs/04_audit/0532_plat_s42_controlled_trace_provenance_boundary_evidence.md`.

## PLAT-S41 — Controlled Output Safety Boundary

- id: `PLAT-S41-001_CONTROLLED_OUTPUT_SAFETY_BOUNDARY`
- prioridade: P0
- status: `COMPLETED_CONTROLLED`
- fase: `AUDIT`
- owner: `platform/agent-core/security`
- dependências: `PLAT-S40-001`, `PLAT-S36-001`, `PLAT-FOUNDATION-009`
- entrega: output policy server-side para validar tipo, limite, redaction e
  conteúdo da completion antes de `response.after`/trace; fallback seguro e
  eventos bounded de decisão
- aceite: saída segura segue; output não textual, vazio, excessivo ou com
  diagnóstico, prescrição, medicação/dose, tratamento, prontuário, pagamento
  ou mutação de agenda é reescrito para fallback seguro; mode/handoff/evento
  permanecem consistentes e nenhum texto rejeitado é refletido
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem provider/canal real, RAG, broker, outbox, egress, secret manager,
  deploy, dados reais ou side effect
- evidência planejada:
  `docs/04_audit/0531_plat_s41_controlled_output_safety_boundary_evidence.md`

### Registro controlado S41

Discovery read-only confirmou que `approvedKnowledge.answer` e
`responseTemplates` chegam ao provider determinístico como `fallbackText`, mas
não existe uma validação pós-modelo. O próximo passo obrigatório é RED focado;
nenhuma integração externa ou conteúdo real será usado.

### Correção após revisão independente

A revisão encontrou bypasses de variantes no detector e execução de
tools/approval depois de output rejeitado, além de lacunas de motivo/eventos,
trace e redaction. O focused corretivo reproduziu 11 falhas em 1 arquivo/21
testes antes do GREEN; a correção agora normaliza Unicode/confusáveis, bloqueia
capabilities após qualquer rewrite, emite handoff coerente e persiste decisão
bounded. A validação também foi aplicada antes de outbound/handoff/auditoria
na conclusão transacional PostgreSQL.

### Auditoria final S41

`PLAT-S41-001 = COMPLETED_CONTROLLED`. Focused de fechamento: 7 arquivos/76
testes PASS. Regressão: 123 arquivos PASS, 2 skipped; 483 testes PASS, 19
skipped. Coverage: 85,08% statements, 80,29% branches, 85,39% functions e
86,12% lines. Readiness 4/4, worker smoke, PostgreSQL 8/72, E2E 4/4, build
70 módulos, typecheck, lint, format, audit 0 e diff check PASS. Evidência:
`docs/04_audit/0531_plat_s41_controlled_output_safety_boundary_evidence.md`.

A revisão independente encontrou P0/P1 e os achados foram fechados por
regressões e correções locais. A tentativa final assíncrona não retornou no
limite e não foi tratada como aprovação. Não há achado aberto conhecido no
escopo controlado; produção real segue `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S40 — Controlled Model Provider Identity Boundary

- id: `PLAT-S40-001_CONTROLLED_MODEL_PROVIDER_IDENTITY_BOUNDARY`
- prioridade: P0
- status: COMPLETED_CONTROLLED
- fase: AUDIT
- owner: platform/agent-core/security
- dependências: `PLAT-S39-001`, `PLAT-FOUNDATION-003`, `PLAT-FOUNDATION-009`
- entrega: registry server-side compilado para `fake/deterministic-v1`,
  resolução exata no executor controlado e rejeição fail-closed de provider,
  modelo ou fallback não suportado
- aceite: identidade válida mantém resposta determinística e
  `externalCall: false`; identidade desconhecida ou `fallbackProvider` presente
  falha antes da pipeline de eventos/modelo; Test Lab, API, runtime publicado e
  worker reutilizam a mesma regra; registry/listas permanecem imutáveis
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem provider/canal real, chamada de rede, fallback/retry operacional,
  secret manager, RAG, broker, egress, deploy, dados reais ou side effect
- evidência planejada:
  `docs/04_audit/0530_plat_s40_controlled_model_provider_identity_evidence.md`

### Registro controlado S40

Discovery read-only confirmou que `ModelProviderRegistry` existe, mas não é
consultado pelo executor; `createDryRunModelProvider` instancia diretamente o
provider determinístico e `fallbackProvider` é aceito pelo schema sem ser
executado. O próximo passo obrigatório é RED antes de qualquer BUILD.

### RED observado S40

O focused executou 1 arquivo/4 testes e falhou como esperado: provider/model
desconhecido foi aceito, `fallbackProvider` foi ignorado e o runtime completou
com uma identidade externa fictícia depois de emitir eventos. Nenhuma chamada
externa ou side effect ocorreu; o próximo passo é GREEN compartilhado.

### GREEN focado S40

O registry compilado e a resolução pré-pipeline foram implementados. O focused
inicial passou 2 arquivos/6 testes e a regressão publicada/worker ampliada
passou 4 arquivos/19 testes; `fake/deterministic-v1` é o único binding
executável, e provider/model não suportado ou fallback configurado falha com
`invalid_action`. Gates completos e revisão independente foram concluídos.

### Auditoria final S40

`PLAT-S40-001 = COMPLETED_CONTROLLED`. Focused 4/19; `npm test` 121/446 com
19 skips; coverage 85,08/80,11/85,17/86,07; readiness 4/4; worker smoke;
PostgreSQL 8/72; E2E 4/4; build 70 módulos; typecheck, lint, format, audit 0
e diff check PASS. Revisão independente follow-up: `PASS sem achados
estáticos`. Evidência em
`docs/04_audit/0530_plat_s40_controlled_model_provider_identity_evidence.md`.
Produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S39 — Controlled Release Candidate Lifecycle Integrity

- id: `PLAT-S39-001_CONTROLLED_RELEASE_CANDIDATE_LIFECYCLE_INTEGRITY`
- status: `COMPLETED_CONTROLLED`
- prioridade: P0
- fase: `AUDIT`
- owner: `platform/persistence/security`
- dependências: `PLAT-S37-001`
- contrato: transição para `VALIDATED` exige schema estrito dos quatro gates,
  todos `PASS`, digest recomputado, validador diferente do criador e binding do
  próprio candidate; mapper PostgreSQL rejeita gates corrompidos
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: somente ledger/lifecycle controlado; sem deploy, provider/canal, RAG,
  egress, broker, outbox, dados reais ou side effect
- evidência planejada:
  `docs/04_audit/0529_plat_s39_controlled_release_candidate_lifecycle_integrity_evidence.md`
- próximo passo: nova discovery/SPEC controlada

### GREEN focado S39

`assertReleaseCandidateEvidenceIntegrity` shared foi implementada e aplicada
antes da mutação em InMemory/PostgreSQL; publish reutiliza a mesma regra. O
focused 2/6 passou, com typecheck/lint PASS. Gates integrados ainda pendentes.

### Correção após crítica independente S39

Autoatestação pelo criador foi bloqueada e o mapper PostgreSQL passou a rejeitar
`gate_results` inválido com erro controlado. A autoridade de publish/rollback
revalida a mesma independência, e a migration `0009` protege o banco contra
autoatestação persistida.

### Auditoria final S39

`PLAT-S39-001 = COMPLETED_CONTROLLED`. Focused final: 7 arquivos/23 testes/1
skip. Gates: npm test 120/438/19 skips; coverage 85,08/80,16/85,18/86,08;
readiness 4/4; worker smoke; PostgreSQL 8/72; E2E 4/4; build, typecheck, lint,
format, audit 0 e diff check PASS. A revisão independente final foi
`PASS sem achados`. Evidência em
`docs/04_audit/0529_plat_s39_controlled_release_candidate_lifecycle_integrity_evidence.md`.
Produção real continua `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S38 — Controlled Worker Knowledge Input Parity

- id: `PLAT-S38-001_CONTROLLED_WORKER_KNOWLEDGE_INPUT_PARITY`
- status: `COMPLETED_CONTROLLED`
- prioridade: P0
- fase: `AUDIT`
- owner: `worker/agent-core/platform/security`
- dependências: `PLAT-S37-001`, `PLAT-S36-001`, `PLAT-S33-001`
- contrato: `PublishedAgentJobSchema` reutiliza
  `ApprovedKnowledgeForTestSchema` e o worker encaminha apenas o payload
  parseado para o executor publicado
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem broker, provider/canal, RAG, egress, outbox, dados reais, deploy
  ou side effect
- evidência:
  `docs/04_audit/0528_plat_s38_controlled_worker_knowledge_input_parity_evidence.md`
- resultado: schema shared strict/bounded, forwarding ao runtime pinned e
  history aligned em 50; crítica independente sem CRITICAL/HIGH, drift médio
  corrigido e cobertura baixa ampliada; gates 120/432/19 skips, coverage
  84,92/80,09/85,08/85,92, readiness 4/4, E2E 4/4, PostgreSQL 8/71,
  worker smoke, build, format, lint, audit 0 e diff check PASS
- próximo passo: nova discovery/SPEC controlada

## PLAT-S37 — Controlled Publish Evidence Authority Boundary

- id: `PLAT-S37-001_CONTROLLED_PUBLISH_EVIDENCE_AUTHORITY_BOUNDARY`
- status: `COMPLETED_CONTROLLED`
- prioridade: P0
- fase: `AUDIT`
- owner: `platform/api/persistence/security`
- dependências: `PLAT-S36-001`, `PLAT-FOUNDATION-009`
- contrato: publish/rollback exigem `releaseCandidateId` validado, digest
  íntegro, quatro gates PASS e vínculo tenant/agente/versão; preflight
  server-side continua obrigatório
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem dados reais, deploy, provider/canal, RAG, egress, broker,
  outbox, rollout gradual ou side effect
- evidência:
  `docs/04_audit/0527_plat_s37_controlled_publish_evidence_authority_evidence.md`
- resultado: candidato `VALIDATED` com digest/gates/binding revalidados no
  servidor; API, InMemory, PostgreSQL e UI alinhados; gates finais 119/427/19
  skips, coverage 84,92/80,08/85,08/85,92, readiness 4/4, E2E 4/4,
  PostgreSQL 8/71, worker smoke, build, format, lint, audit 0 e diff check PASS
- próximo passo: nova discovery/SPEC controlada

## PLAT-S36 — Controlled Knowledge Input Provenance Boundary

- id: `PLAT-S36-001_CONTROLLED_KNOWLEDGE_INPUT_PROVENANCE_BOUNDARY`
- status: `COMPLETED_CONTROLLED`
- prioridade: P0
- fase: `AUDIT`
- owner: `platform/agent-core/api/security`
- dependências: `PLAT-S35-001`, `PLAT-FOUNDATION-009`
- contrato: `approvedKnowledge` strict e bounded, source somente
  `controlled://`, validação no runtime e schema compartilhado na API
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem RAG/ingestão/conteúdo real, provider/canal, URL externa, egress,
  broker, outbox, deploy ou side effect
- evidência:
  `docs/04_audit/0526_plat_s36_controlled_knowledge_input_boundary_evidence.md`
- resultado: verify 117/422/19 skips, coverage 85,05/80,31/85,11/86,07,
  readiness 4/4, worker smoke, E2E 4/4, PostgreSQL 8/71, audit 0 e revisão
  independente sem CRITICAL/HIGH; produção real `NO-GO` /
  `WAITING_HUMAN_APPROVAL`

## PLAT-S35 — Controlled Tool Registry Identity Boundary

- id: `PLAT-S35-001_CONTROLLED_TOOL_REGISTRY_IDENTITY_BOUNDARY`
- status: `COMPLETED_CONTROLLED`
- prioridade: P0
- fase: `AUDIT`
- owner: `platform/api/agent-core/security`
- dependências: `PLAT-S34-001`, `PLAT-FOUNDATION-009`
- contrato: planner e API resolvem somente handlers compilados por binding
  habilitado com versão exata; colisão, ausência e catálogo metadata-only falham
  fechado; permissão é server-owned
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem import dinâmico, marketplace, provider/canal, egress, broker,
  outbox, deploy, dados reais ou side effect
- evidência:
  `docs/04_audit/0525_plat_s35_controlled_tool_registry_identity_evidence.md`
- resultado: registry compilado, versão exata, planner por intent,
  deduplicação/colisão fail-closed e approval/API server-owned auditados; gates
  integrados concluídos em ambiente controlado

## PLAT-S34 — Controlled CI Gate Parity and Worker Startup Smoke

- id: `PLAT-S34-001_CONTROLLED_CI_GATE_PARITY`
- status: `COMPLETED_CONTROLLED`
- prioridade: P0
- fase: `AUDIT`
- owner: `CI/worker/security`
- dependências: `PLAT-S33-001`, `PLAT-FOUNDATION-009`
- contrato: workflow reproduz gates disponíveis, instalação sem lifecycle
  scripts, permissões/concurrency mínimos e smoke bounded do worker
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- evidência:
  `docs/04_audit/0524_plat_s34_controlled_ci_gate_parity_evidence.md`
- limite: sem imagem/container scan executável até existir artefato, sem deploy,
  broker, provider/canal, dados reais ou side effect
- resultado: workflow com gates explícitos, instalação sem lifecycle scripts,
  permissões/concurrency mínimos, smoke fail-closed do worker e diff check;
  gates integrados concluídos em ambiente controlado

## PLAT-S33 — Controlled Worker Published-Runtime Boundary

- id: `PLAT-S33-001_CONTROLLED_WORKER_RUNTIME_BOUNDARY`
- status: `COMPLETED_CONTROLLED`
- prioridade: P0
- fase: `AUDIT`
- owner: `worker/agent-core/security`
- dependências: `PLAT-S32-001`, `PLAT-S03-001`, `PLAT-FOUNDATION-009`
- contrato: worker aceita somente job bounded com tenant/agent/version pinned,
  delega ao executor publicado e não inicia com bootstrap fictício
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- evidência:
  `docs/04_audit/0523_plat_s33_controlled_worker_runtime_boundary_evidence.md`
- resultado: schema strict/bounded, executor pinned, negativos de legacy/limite/
  mismatch, entrypoint sem bootstrap e gates integrados concluídos sem side
  effect externo
- limite: sem broker/retry distribuído, outbox, provider/canal real, deploy,
  dados reais ou side effect

## PLAT-S32 — Controlled Session Agent-Version Pinning

- id: `PLAT-S32-001_CONTROLLED_SESSION_AGENT_VERSION_PINNING`
- status: `COMPLETED_CONTROLLED`
- prioridade: P0
- fase: `AUDIT`
- owner: `agent-core/persistence/api/security`
- dependências: `PLAT-S31-001`, `PLAT-S08-001`, `PLAT-FOUNDATION-009`
- contrato: sessão runtime deve fixar o par tenant/agent/version uma única vez;
  continuations usam `PUBLISHED` ou `ARCHIVED` do mesmo agent e nenhum publish
  posterior troca o trace/version da conversa
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- evidência:
  `docs/04_audit/0522_plat_s32_controlled_session_version_pinning_evidence.md`
- limite: migration aditiva e fixtures controladas; sem dados reais,
  provider/canal/RAG, IdP/RBAC real, worker distribuído, deploy ou side effect

## P0 — Critico

### Item 1 — Aprovar gates documentais

- titulo: aprovar gates de Discovery, PRD e SPEC
- descricao: revisar documentacao e confirmar que ela pode orientar Build Phase 0
- modulo: governanca
- dependencia: revisao humana
- fase: pre-build
- risco: alto
- impacto: alto

### Item 2 — Definir regras finais de agenda

- titulo: formalizar confirmacao de consulta
- descricao: definir quando a Esmeralda V2 pode sugerir, criar draft ou confirmar consulta
- modulo: policy
- dependencia: decisao operacional
- fase: pre-workflow-agendamento
- risco: alto
- impacto: alto

### Item 3 — Iniciar Build Phase 0

- titulo: criar fundacao do monorepo
- descricao: implementar estrutura `apps` e `packages`, shared contracts e teste base
- modulo: repository
- dependencia: aprovacao humana explicita da Phase 0
- fase: build_phase_0
- risco: alto
- impacto: alto

### Item 4 — Mapear cargos reais para RBAC

- titulo: validar matriz de permissoes operacional
- descricao: mapear cargos reais do hospital para Operator, Approver, Supervisor e Admin
- modulo: security
- dependencia: decisao operacional
- fase: pre-panel-approvals
- risco: alto
- impacto: alto

### Item 5 — Implantar gates automatizaveis

- titulo: criar test, typecheck, lint, coverage e CI local
- descricao: garantir que toda sprint de codigo tenha verificacao executavel e repetivel
- modulo: repository
- dependencia: Build Phase 0
- fase: build_phase_0
- risco: alto
- impacto: alto

### Item 6 — Resolver vulnerabilidade transitiva moderada

- titulo: atualizar ou mitigar `uuid` transitivo em LangGraph/LangChain
- descricao: avaliar versoes compatíveis e evitar `npm audit fix --force` sem teste de regressao
- modulo: dependencies
- dependencia: Build Phase 0
- fase: build_phase_0
- risco: medio
- impacto: medio

## P1 — Alta prioridade

### Item 1 — Definir fonte RAG institucional

- titulo: selecionar base autorizada para duvidas institucionais
- descricao: definir documentos, responsavel, versao e politica de atualizacao
- modulo: rag
- dependencia: decisao de conteudo
- fase: build_phase_4
- risco: medio
- impacto: alto

### Item 2 — Definir politica de retencao

- titulo: governanca de retencao de dados
- descricao: definir retencao para mensagens, audit events, memory facts e tool calls
- modulo: dados
- dependencia: decisao de governanca
- fase: build_phase_6
- risco: medio
- impacto: alto
- status: parcialmente atendido por CC-S9 e auditado em `docs/09_debug_corrections/0909_cc_s9_audit_governance_review.md`; CC-S12 registra `docs/08_runtime/data_governance_signoff.md` com `APPROVED_FOR_REAL_DATA: false`; audit evidence em construcao controlada tem politica, minimizacao e redacao de PII comum, mas dados reais/piloto real ainda exigem decisao humana de retencao

## P2 — Medio

### Item 1 — Preparar audit runtime

- titulo: definir queries e dashboards de auditoria
- descricao: transformar criterios de audit em consultas e metricas operacionais
- modulo: audit
- dependencia: runtime funcional
- fase: hardening
- risco: medio
- impacto: medio
- status: atendido para construcao controlada por CC-S12; queries, resumo, export metadata, UI interna de revisao, governanca de retencao controlada, redacao de payload/PII, indices, paginacao de evidencia, pedido de export via aprovacao humana interna, idempotencia PostgreSQL, evidencia final reproduzivel, runbooks e boundary de release candidate existem; exporter externo real segue bloqueado

## PLAT-S03 — fronteira tenant/RLS pré-produção

- id: PLAT-S03-001
- status: COMPLETED_CONTROLLED
- entrega: migration PostgreSQL versionada com checksum, baseline legado explícito e aprovado, quarentena persistente de linhas nulas/incompatíveis, `FORCE ROW LEVEL SECURITY`, preflight de marker/policy, pool tenant-scoped com reset e role runtime DML-only
- evidência: `docs/04_audit/0494_plat_s03_tenant_isolation_evidence.md`
- limite: fixture fictícia; nenhum backfill, dado real, ativação irrestrita ou decisão humana foi executado

## PLAT-S04 — approval capability durável e gateway legado

- id: PLAT-S04-001
- status: COMPLETED_CONTROLLED
- entrega: issuer/verifier durável com hash de input, nonce, expiry, revocation e single-consume; adapter allowlist-only do `ToolRegistry` para `find_available_slots` em dry-run; conexão tenant-scoped e transação checked-out
- dependências: PLAT-S03 controlado; infraestrutura/IdP/provider real permanecem fora do escopo
- evidência: `docs/04_audit/0495_plat_s04_durable_approval_and_webhook_evidence.md`

- id: PLAT-S04-002
- status: COMPLETED_CONTROLLED
- entrega: verifier HMAC-SHA256 sobre raw body com janela temporal, rotação controlada de segredo, replay lease/purge e store abstrata; fixtures em memória e PostgreSQL controlado
- dependências: HA/observabilidade operacional, provider/canal real e rollout de replay distribuído permanecem fora do escopo
- evidência: `docs/04_audit/0495_plat_s04_durable_approval_and_webhook_evidence.md`

- id: PLAT-S04-003
- status: COMPLETED_CONTROLLED
- entrega: retry idempotente de inbound com `messages.runtime_status`, finalização PostgreSQL atômica de outbound/tool audit/trace/integration audit e lease HMAC liberado ou recuperável após falha/crash
- dependências: rollout RLS/backfill, fila distribuída, provider/canal real e compensação de side effects permanecem fora do escopo
- evidência: `docs/04_audit/0495_plat_s04_durable_approval_and_webhook_evidence.md`

## P3 — Baixo

### Item 1 — Planejar agentes futuros

- titulo: Billing, Medical Context e Quality Supervisor
- descricao: planejar agentes pos-MVP sem contaminar o escopo inicial
- modulo: future
- dependencia: MVP validado
- fase: pos-MVP
- risco: baixo
- impacto: medio

## PLAT-S05 — fechamento do Test Lab controlado

- id: `PLAT-S05-001`
- status: COMPLETED_CONTROLLED
- entrega: trace seguro com risco/prompt/timestamps/latência/tokens/spans, caso de medicamento veterinário explicitamente seguro, validação de IDs no gateway e correções de binding/renderização no Control Center
- evidência: `docs/platform/final-technical-audit.md`; testes unitários platform/policy, API/UI, `npm run verify`, readiness, E2E e smoke PostgreSQL
- limite: nenhum provider/canal/RAG/agenda real, dado real, side effect ou release de produção

- id: `PLAT-S05-002`
- status: COMPLETED_CONTROLLED
- entrega: preset idempotente `CVG Secretary` publicado somente no bootstrap de desenvolvimento e coberto por teste de lifecycle
- evidência: `packages/platform/src/secretary-preset.ts`, testes de preset/bootstrap, `npm run verify`, readiness e E2E; sem bootstrap automático em `NODE_ENV=test`
- limite: nenhum bootstrap automático em produção ou em tenant real

- id: `PLAT-S06-001`
- status: COMPLETED_CONTROLLED
- entrega: catálogo tenant-aware persistente de `TestCase`/`TestSuite`, clone versionado imutável, histórico redigido de avaliações e comparação A/B exclusivamente no Test Lab
- evidência: `docs/04_audit/0496_plat_s06_suite_catalog_evidence.md`; migration `0003_test_suite_catalog.sql`; API/UI, verify, readiness, E2E e smoke PostgreSQL controlado
- dependência: próximo lane exige novo SPEC; nenhum rollout, provider/canal ou tráfego real

## PLAT-S07 — conflito otimista do Control Center

- id: `PLAT-S07-001`
- status: COMPLETED_CONTROLLED
- entrega: precondition `expectedStatus` no lifecycle de AgentVersion, erro de conflito HTTP 409 sem mutação parcial, ausência de audit de sucesso no conflito e integração do status observado na UI
- evidência: `docs/04_audit/0497_plat_s07_optimistic_conflict_evidence.md`; verify, readiness, E2E, smoke PostgreSQL controlado, format e diff check
- limite: não representa HA, lock distribuído, ETag de proxy, IdP, coordenação multi-região ou autorização de produção

## PLAT-S08 — integridade de manifests e version pinning controlado

- id: `PLAT-S08-001`
- status: COMPLETED_CONTROLLED
- entrega: validação semântica de `PluginManifest`, versões imutáveis por nome, `version` opcional no `PluginBinding` e resolução determinística no gateway
- evidência: `docs/04_audit/0498_plat_s08_plugin_manifest_versioning_evidence.md`; verify, readiness, E2E, smoke PostgreSQL controlado, format e diff check
- limite: handlers permanecem fake/local; marketplace, rede, código de terceiros e integração externa continuam bloqueados

## PLAT-S09 — catálogo declarativo tenant-aware de plugins

- id: `PLAT-S09-001`
- status: COMPLETED_CONTROLLED
- entrega: persistência de manifests validados sem handlers, lifecycle DRAFT/APPROVED/ARCHIVED com precondition, isolamento tenant/RLS e API admin controlada
- evidência: `docs/04_audit/0499_plat_s09_plugin_catalog_evidence.md`; migration `0004_plugin_manifest_catalog.sql`; verify, readiness, E2E, smoke PostgreSQL, format, diff check e audit
- dependência: novo SPEC controlado; aprovação de metadata não concede execução, instalação, permission ou provider/canal

## Regras de uso

- Atualizar continuamente.
- Adicionar novos itens imediatamente.
- Priorizar por risco e impacto.
- Nao esconder debitos tecnicos.

## PLAT-S10 — Control Center do catálogo declarativo de plugins

- id: `PLAT-S10-001`
- status: COMPLETED_CONTROLLED
- entrega: client/API e seção do Control Center para listar, criar e transicionar
  metadata de plugins com tenant/identidade e precondition stale
- dependência: `PLAT-S09-001` e novo SPEC `docs/platform/06-platform-spec.md`
- evidência: `docs/04_audit/0500_plat_s10_plugin_catalog_control_center_evidence.md`
- limite: `APPROVED` continua metadata-only; sem instalação, handlers, rede,
  provider/canal, dados reais ou produção irrestrita

## PLAT-S11 — event bus e hooks de plugins controlados

- id: `PLAT-S11-001`
- status: COMPLETED_CONTROLLED
- entrega: event bus allowlisted, tenant-scoped e process-local; hooks de
  plugins locais exigem declaração no manifest, recebem payload redigido e
  imutável e não interrompem o pipeline em caso de erro
- dependência: `PLAT-S10-001`, `PLAT-S08-001` e SPEC registrada em
  `docs/platform/06-platform-spec.md`
- evidência: `docs/04_audit/0501_plat_s11_event_bus_hooks_evidence.md`,
  testes RED/GREEN do bus/registry e integração Test Lab, verify, readiness,
  E2E, audit e inspeção de que nenhum efeito externo foi adicionado
- limite: catálogo S09 continua metadata-only; sem broker, retry durável,
  webhook, marketplace, código de terceiros, provider/canal, dado real ou
  produção irrestrita

## PLAT-S12 — prompt profile e templates no Control Center

- id: `PLAT-S12-001`
- status: COMPLETED_CONTROLLED
- entrega: editor controlado de `promptBlocks`/`responseTemplates` com
  validação de formato, limites, duplicidade e segredo; nova AgentVersion para
  cada alteração; checksum/status do perfil no trace do Test Lab
- dependência: `PLAT-S11-001`, `PLAT-FOUNDATION-003`, `PLAT-FOUNDATION-006`
- aceite: blocos `system`/`safety` e respostas kernel não podem ser removidos
  ou alterados pelo editor; templates de baixa confiança, ausência de
  knowledge, handoff e scheduling sem evidência têm caminho controlado; edição
  preserva snapshots; checksum é determinístico; nenhum provider/canal ou
  efeito externo é adicionado
- evidência: `docs/04_audit/0502_plat_s12_prompt_profile_template_control_center_evidence.md`; suíte, coverage, readiness, build, E2E, PostgreSQL controlado, audit e diff check PASS
- limite: sem catálogo mutável separado, migration, RAG institucional, dados
  reais, ações clínicas/financeiras/prontuário, side effect ou produção
  irrestrita

## Agent Platform — sprint controlado `PLAT-S01`

O prompt de plataforma foi registrado como uma nova linha de produto compatível com o data plane da Secretary. O inventário, gaps, PRD, SPEC, ExecPlan e ADRs estão em `docs/platform/`.

### Tasks registradas

- `PLAT-FOUNDATION-001` — corrigir harness Vitest para aliases locais; **COMPLETED_CONTROLLED**
- `PLAT-FOUNDATION-002` — contratos/store tenant-aware de Agent e AgentVersion; **COMPLETED_CONTROLLED**
- `PLAT-FOUNDATION-003` — prompts, model refs, policies, feature flags e response templates; **COMPLETED_CONTROLLED**
- `PLAT-FOUNDATION-004` — manifest/registry/capability gateway; **COMPLETED_CONTROLLED**
- `PLAT-FOUNDATION-005` — Test Lab dry-run, trace, eval e regression; **COMPLETED_CONTROLLED**
- `PLAT-FOUNDATION-006` — API/UI Control Center, version list e rollback; **COMPLETED_CONTROLLED**
- `PLAT-FOUNDATION-007` — migração/repositório PostgreSQL tenant-aware; **COMPLETED_CONTROLLED**
- `PLAT-FOUNDATION-008` — state machine de takeover e silêncio do bot; **COMPLETED_CONTROLLED**
- `PLAT-FOUNDATION-009` — hardening, auditoria, headers, rate limit e CI/E2E; **COMPLETED_CONTROLLED**
- `PLAT-FOUNDATION-010` — integrar IdP confiável, tenant binding operacional e replay store distribuída; **WAITING_HUMAN_INFRA_DECISION**
- `PLAT-FOUNDATION-011` — tenant/RLS do data plane legado e adapter único para capability gateway; **COMPLETED_CONTROLLED**
- `PLAT-FOUNDATION-012` — rate limiter distribuído e política de retenção/PII para produção; **WAITING_HUMAN_INFRA_DECISION**
- `PLAT-FOUNDATION-013` — runtime publicado, histórico de traces redigidos, Trace Viewer e scheduling controlado via CapabilityGateway; **COMPLETED_CONTROLLED**
- `PLAT-FOUNDATION-014` — continuidade por sessão, takeover humano explícito, silêncio/retomada e escopo tenant-aware de tarefas/aprovações/auditoria; **COMPLETED_CONTROLLED**

O gate `IMPLEMENTATION_READY` foi satisfeito somente para construção controlada de `PLAT-FOUNDATION-001..014` e PLAT-S03/S04. Provider/canal/RAG/dados reais, produção irrestrita e ações sensíveis permanecem bloqueados; `PLAT-FOUNDATION-010` e `PLAT-FOUNDATION-012` ainda exigem decisão humana/infraestrutura.

### Fechamento da rodada de auditoria

`docs/04_audit/0493_platform_controlled_mvp_evidence.md` registra os gates finais: `npm run verify` com 166 testes aprovados e 5 skips, coverage acima de 80%, readiness, Playwright E2E, smoke PostgreSQL real com 11 testes e audit de dependências sem vulnerabilidades. PLAT-S02 fecha clone/edit versionado, approval/provenance fail-closed, ownership de trace, locks/rollback PostgreSQL e Trace Viewer com identidade do snapshot. O backlog controlado está pronto para o próximo passo; IdP/infraestrutura real, RLS/auditoria tenant-aware, approval durável, conflitos multioperador e qualquer provider/canal/RAG/ação sensível permanecem bloqueados.

## Agent Platform — sprint controlado `PLAT-S02`

Hardening derivado da auditoria do `PLAT-S01`, ainda restrito a fixtures controladas e sem autorização de produção real:

- `PLAT-HARDENING-001` — edição versionada pelo Control Center sem mutar snapshots; **COMPLETED_CONTROLLED**
- `PLAT-HARDENING-002` — approval e trace fail-closed; **COMPLETED_CONTROLLED**
- `PLAT-HARDENING-003` — publish PostgreSQL serializado; **COMPLETED_CONTROLLED**
- `PLAT-HARDENING-004` — Trace Viewer operacional completo e redigido; **COMPLETED_CONTROLLED**

O gate autoriza somente a construção controlada dos quatro itens acima, agora concluídos nesse limite. IdP tenant-bound, RLS/backfill do data plane legado, limiter/replay store distribuídos, retenção/PII, expansão do ToolRegistry, providers/canais/RAG reais e ações sensíveis continuam bloqueados.

## Agent Platform — sprint de fronteira pré-produção `PLAT-S03`

Task registrada antes do BUILD para fechar o maior risco técnico observável sem ampliar a autorização operacional:

- `PLAT-S03-001` — migration versionada, contexto tenant por conexão, `FORCE ROW LEVEL SECURITY` no data plane legado e auditoria/outbox tenant-aware; **COMPLETED_CONTROLLED**

O aceite desta sprint é exclusivamente controlado: schema fictício de fixture, pool/conexão dedicada por escopo, reset/verificação de contexto, roles migration/runtime separadas, quarentena fail-closed de auditoria/outbox e bloqueio cross-tenant comprovados. Backfill, IdP confiável, role mapping operacional, retenção, secrets manager e ativação em banco real continuam dependentes de decisão humana/infraestrutura.

## PLAT-S13 — Handoff Policy Studio controlado

- id: `PLAT-S13-001_HANDOFF_POLICY_STUDIO`
- status: `COMPLETED_CONTROLLED`
- entrega: thresholds configuráveis com limites, clarificações,
  destinos múltiplos, prioridade e trace redigido no Test Lab
- dependências: `PLAT-S12-001`, `PLAT-FOUNDATION-003`, `PLAT-FOUNDATION-008`
- SPEC/gate: `docs/platform/06-platform-spec.md` /
  `SPEC_APPROVED_CONTROLLED_BUILD`
- gates: 79 arquivos/284 testes pass/16 skips, coverage 84,98%/80,44%/86,00%/85,92%, readiness 4/4, E2E 1/1, PostgreSQL 49 pass/16 skips, audit sem vulnerabilidades, format e diff check PASS
- evidência: `docs/04_audit/0503_plat_s13_handoff_policy_studio_evidence.md`
- limite: sem canal/provider/RAG/dado real/migration/side effect/produção

## PLAT-S14 — Controlled Safety Publish Preflight

- id: `PLAT-S14-001_CONTROLLED_SAFETY_PUBLISH_PREFLIGHT`
- status: COMPLETED_CONTROLLED
- entrega: suíte crítica fixa e redigida executada no candidato antes de
  publish/rollback, endpoint de preflight, bloqueio fail-closed sem mutação e
  audit seguro
- dependências: `PLAT-S06-001`, `PLAT-S07-001`, `PLAT-S13-001`
- SPEC/gate: `docs/platform/06-platform-spec.md` /
  `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: somente Test Lab fake/fixtures; sem cases arbitrários, provider,
  canal, RAG, migration, dado real, side effect ou produção irrestrita
- evidência: `docs/04_audit/0504_plat_s14_controlled_safety_publish_preflight_evidence.md`
- gates: 80 arquivos/289 testes pass/16 skips, coverage 85,06%/80,38%/85,97%/85,98%, readiness, E2E, PostgreSQL controlado, audit e diff check PASS

## PLAT-S15 — Controlled Knowledge Source Catalog

- id: `PLAT-S15-001_CONTROLLED_KNOWLEDGE_SOURCE_CATALOG`
- status: COMPLETED_CONTROLLED
- entrega: catálogo tenant-aware metadata-only de source/version/label/
  description, lifecycle, unique/RLS, API/UI e audit redigido
- dependências: `PLAT-S05-001`, `PLAT-S06-001`, `PLAT-S14-001`
- SPEC/gate: `docs/platform/06-platform-spec.md` /
  `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem conteúdo, ingestão, embeddings, vector store, RAG, crawler,
  upload, URL externa, provider, canal, dado real ou side effect
- evidência: `docs/04_audit/0505_plat_s15_controlled_knowledge_source_catalog_evidence.md`
- gates finais: 83 arquivos/294 testes pass/17 skips, coverage 85,03%/80,26%/
  85,41%/85,88%, readiness, E2E, PostgreSQL controlado, audit e diff check PASS

## PLAT-S16 — Controlled Release Candidate Evidence Ledger

- id: `PLAT-S16-001_CONTROLLED_RELEASE_CANDIDATE_EVIDENCE_LEDGER`
- status: COMPLETED_CONTROLLED
- entrega: ledger tenant-aware imutável de quatro gates controlados,
  evidence refs bounded, digest determinístico, lifecycle/CAS, migration/RLS,
  API/UI e audit metadata-only
- dependências: `PLAT-S14-001`, `PLAT-S15-001`, `PLAT-FOUNDATION-006`
- SPEC/gate: `docs/platform/06-platform-spec.md` /
  `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: `VALIDATED` não publica, não faz deploy, não altera AgentVersion ou
  activeVersionId e não habilita provider/canal/RAG/dado real/side effect
- evidência: `docs/04_audit/0506_plat_s16_controlled_release_candidate_evidence_ledger_evidence.md`
- gates finais: 88 arquivos/303 testes pass/18 skips, coverage 84,81%/80,03%/
  84,87%/85,65%, readiness, E2E, PostgreSQL controlado, audit, format e diff
  check PASS

## PLAT-S17 — Controlled Audit Evidence Checkpoint

- id: `PLAT-S17-001_CONTROLLED_AUDIT_EVIDENCE_CHECKPOINT`
- status: COMPLETED_CONTROLLED
- entrega planejada: checkpoint tenant-aware imutável de até 200 IDs de
  auditoria, filtros bounded, digest canônico, lifecycle SEALED/ARCHIVED,
  migration/RLS, API/client/UI e audit metadata-only
- dependências: `PLAT-S16-001`, `PLAT-FOUNDATION-006`
- SPEC/gate: `docs/platform/06-platform-spec.md` /
  `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem payload bruto, export externo, retenção real, alteração de
  eventos, provider/canal, RAG, dado real ou side effect
- evidência: `docs/04_audit/0507_plat_s17_controlled_audit_evidence_checkpoint_evidence.md`
- gates finais: `npm run verify` PASS; 95 arquivos/317 testes pass/18 skips;
  coverage 84,95%/80,00%/84,52%/85,82%; readiness 4/4; E2E 2/2;
  PostgreSQL controlado 51 pass/18 skips; audit e diff check PASS
- resultado: `CONTROLLED_MVP_READY`; produção `NO-GO`/
  `WAITING_HUMAN_APPROVAL`

## PLAT-S18 — Controlled HTTP Security Boundary

- id: `PLAT-S18-001_CONTROLLED_HTTP_SECURITY_BOUNDARY`
- status: COMPLETED_CONTROLLED
- entrega planejada: boundary Fastify de origin/CORS/preflight (`GET/POST/PATCH/OPTIONS`), HTTPS com proxy
  explícito, headers CSP/HSTS e bootstrap fail-closed por env
- dependência: `PLAT-S17-001`, `PLAT-FOUNDATION-009` e SPEC registrada em
  `docs/platform/06-platform-spec.md`
- aceite: sem wildcard/`null`/origins não normalizadas; preflight e headers
  allowlisted; transporte HTTP rejeitado quando exigido; production bootstrap
  exige origins e `API_REQUIRE_HTTPS=true`; nenhuma chamada externa ou mudança
  no data plane legado
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: não substitui host CORS/HTTPS/CSP, IdP, proxy real, deploy, provider,
  canal, RAG, dado real ou side effect
- evidência: `docs/04_audit/0508_plat_s18_controlled_http_security_boundary_evidence.md`

### Resultado controlado PLAT-S18

- `PLAT-S18-001_CONTROLLED_HTTP_SECURITY_BOUNDARY` = `COMPLETED_CONTROLLED`.
- Gates: `npm run verify` PASS; 97 arquivos/330 testes pass/18 skips;
  coverage 85,16%/80,44%/84,75%/86,06%; readiness 4/4; E2E 3/3;
  PostgreSQL controlado 51 pass/18 skips; audit 0; format e diff check PASS.
- `CONTROLLED_MVP_READY` permanece; produção real é `NO-GO`/
  `WAITING_HUMAN_APPROVAL`.

## PLAT-S19 — Controlled Request Observability Metrics

- id: `PLAT-S19-001_CONTROLLED_REQUEST_OBSERVABILITY_METRICS`
- status: COMPLETED_CONTROLLED
- entrega planejada: collector process-local bounded por template de rota,
  método/status/latência, fallback de 404/security rejection e endpoint
  read-only `/health/metrics`
- dependência: `PLAT-S18-001`, `PLAT-FOUNDATION-009` e SPEC registrada em
  `docs/platform/06-platform-spec.md`
- aceite: snapshot redaction-safe e defensivo, cardinalidade limitada,
  nenhuma informação de path/query/body/header/identidade e gates existentes
  preservados
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: não substitui Prometheus/OTel/broker/storage distribuído, retenção,
  alerting, HA, deploy, provider/canal, RAG, dado real ou side effect
- evidência: `docs/04_audit/0509_plat_s19_controlled_request_observability_metrics_evidence.md`

### Resultado controlado PLAT-S19

- `PLAT-S19-001_CONTROLLED_REQUEST_OBSERVABILITY_METRICS` =
  `COMPLETED_CONTROLLED`.
- Gates: `npm run verify` PASS; 98 arquivos/333 testes pass/18 skips;
  coverage 85,24%/80,63%/84,99%/86,16%; readiness 4/4; E2E 3/3;
  PostgreSQL controlado 51 pass/18 skips; audit 0; format e diff check PASS.
- `CONTROLLED_MVP_READY` permanece; produção real é `NO-GO`/
  `WAITING_HUMAN_APPROVAL`.

## PLAT-S20 — Controlled Rate Limit Memory Safety

- id: `PLAT-S20-001_CONTROLLED_RATE_LIMIT_MEMORY_SAFETY`
- status: COMPLETED_CONTROLLED
- entrega planejada: limiter process-local com capacidade bounded, purge de
  expirados, evicção determinística, validação fail-closed e 429 sem cache
- dependência: `PLAT-S19-001`, `PLAT-FOUNDATION-009` e SPEC registrada em
  `docs/platform/06-platform-spec.md`
- aceite: `bucketCount <= maxBuckets`, nenhum snapshot expõe chaves/IPs/tokens,
  policy e key inválidas falham, contrato `Retry-After` permanece compatível e
  `Cache-Control: no-store` é emitido no 429
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: não substitui limiter distribuído/edge, IdP, HA, provider/canal, RAG,
  dado real, deploy ou side effect
- evidência planejada:
  `docs/04_audit/0510_plat_s20_controlled_rate_limit_memory_safety_evidence.md`

### Resultado controlado PLAT-S20

- `PLAT-S20-001_CONTROLLED_RATE_LIMIT_MEMORY_SAFETY` =
  `COMPLETED_CONTROLLED`.
- Gates: `npm run verify` PASS; 98 arquivos/335 testes pass/18 skips;
  coverage 85,31%/80,72%/85,07%/86,23%; readiness 4/4; E2E 3/3;
  PostgreSQL controlado 51 pass/18 skips; audit 0; format e diff check PASS.
- O limiter local ficou bounded, mas produção segue bloqueada por rate
  limiting distribuído/edge, identidade operacional e demais critérios PROD.
- Evidência: `docs/04_audit/0510_plat_s20_controlled_rate_limit_memory_safety_evidence.md`.

## PLAT-S21 — Controlled Metrics Exposure Boundary

- id: `PLAT-S21-001_CONTROLLED_METRICS_EXPOSURE_BOUNDARY`
- status: COMPLETED_CONTROLLED
- entrega planejada: `/health/metrics` enabled only in test/development,
  fail-closed 404 elsewhere and `Cache-Control: no-store`
- dependência: `PLAT-S20-001`, `PLAT-S19-001` e SPEC registrada em
  `docs/platform/06-platform-spec.md`
- aceite: production/staging/unknown não exportam snapshot mesmo com override;
  `/health` e collector permanecem inalterados
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: não substitui auth/IdP, allowlist de rede, Prometheus/OTel, HA,
  provider/canal, RAG, dado real, deploy ou side effect
- evidência: `docs/04_audit/0511_plat_s21_controlled_metrics_exposure_boundary_evidence.md`

### Resultado controlado PLAT-S21

- `PLAT-S21-001_CONTROLLED_METRICS_EXPOSURE_BOUNDARY` =
  `COMPLETED_CONTROLLED`.
- Gates: `npm run verify` PASS; 99 arquivos/337 testes pass/18 skips;
  coverage 85,33%/80,74%/85,07%/86,25%; readiness 4/4; E2E 3/3;
  PostgreSQL controlado 51 pass/18 skips; audit 0; format e diff check PASS.
- `/health/metrics` não exporta snapshot fora de test/development; produção
  continua bloqueada por auth/edge/observabilidade operacional e demais PROD.
- Evidência: `docs/04_audit/0511_plat_s21_controlled_metrics_exposure_boundary_evidence.md`.

## PLAT-S22 — Controlled Correlation Response Boundary

- id: `PLAT-S22-001_CONTROLLED_CORRELATION_RESPONSE_BOUNDARY`
- status: COMPLETED_CONTROLLED
- entrega planejada: publicar `meta.correlationId` em `X-Correlation-Id` sem
  aceitar ou refletir header externo; expor o header somente em CORS aprovado
- dependência: `PLAT-S21-001`, `PLAT-S18-001` e SPEC registrada em
  `docs/platform/06-platform-spec.md`
- aceite: respostas JSON envelopadas, erros de boundary e server-to-server
  correlacionam; preflight/non-envelope não inventam header; CORS expõe apenas
  o header; nenhum body, identidade ou tenant é alterado
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: não substitui tracing distribuído, OTel, IdP, observabilidade HA,
  provider/canal, RAG, dado real, deploy ou side effect
- evidência:
  `docs/04_audit/0512_plat_s22_controlled_correlation_response_boundary_evidence.md`

### Resultado controlado PLAT-S22

- `PLAT-S22-001_CONTROLLED_CORRELATION_RESPONSE_BOUNDARY` =
  `COMPLETED_CONTROLLED`.
- Gates: `npm run verify` PASS; 100 arquivos/343 testes pass/18 skips;
  coverage 85,37%/80,81%/85,10%/86,29%; readiness 4/4; E2E 3/3;
  PostgreSQL controlado 51 pass/18 skips; audit 0; format e diff check PASS.
- O header é derivado do envelope e não altera auth, tenant, body ou
  observabilidade distribuída; produção continua bloqueada pelos critérios
  PROD.
- Evidência: `docs/04_audit/0512_plat_s22_controlled_correlation_response_boundary_evidence.md`.

## PLAT-S31 — Controlled Approval Decision Note Field Boundary

- id: `PLAT-S31-001_CONTROLLED_APPROVAL_DECISION_NOTE_FIELD_BOUNDARY`
- status: COMPLETED_CONTROLLED
- owner: api/agent-core/security
- dependências: `PLAT-S30-001`, `PLAT-S24-001`, `PLAT-FOUNDATION-009`
- descoberta: `ResolveApprovalSchema.note` era opcional e sem máximo; uma
  decisão fictícia em `/v1/approvals/:approvalRequestId/decision` aceitou
  `note` com 5.000 caracteres e persistiu `approved`, sem ecoar ou persistir a
  nota
- entrega planejada: limitar `note` a 4.000 no schema compartilhado antes de
  `approvals.save`, preservando decisão, operador, approval state, handoff e a
  semântica atual de não persistência de `note`
- aceite: `note` acima do limite retorna `validation_failed`/400 sem chamar o
  repositório e sem mudar estado; valor no limite mantém decisão válida
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: somente validação de entrada com fixtures; sem mudança de auth,
  tenant, identidade, decisão humana, provider/canal, RAG, dado real, deploy ou
  side effect
- evidência: `docs/04_audit/0521_plat_s31_controlled_approval_decision_note_field_boundary_evidence.md`

### Registro controlado PLAT-S31

- A lacuna foi reproduzida antes do BUILD com approval, sessão e tenant
  fictícios; o lane trata somente o tamanho da nota no contrato de decisão.
  RED/GREEN, regressão próxima, verify e gates externos foram concluídos como
  `COMPLETED_CONTROLLED`.

### Resultado controlado PLAT-S31

- O schema compartilhado agora rejeita `note` acima de 4.000 com
  `validation_failed`/400 antes de `approvals.save`, sem echo e sem mudar o
  approval pending; nota no limite mantém decisão `approved`.
- Verify passou com 109 arquivos/397 testes pass/18 skips; coverage
  85,45%/80,83%/85,26%/86,45%; readiness 4/4; E2E 3/3; PostgreSQL 51/18;
  audit 0; format, JSON e diff check PASS. Evidência:
  `docs/04_audit/0521_plat_s31_controlled_approval_decision_note_field_boundary_evidence.md`.
- Produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S30 — Controlled Approval Request Field Boundary

- id: `PLAT-S30-001_CONTROLLED_APPROVAL_REQUEST_FIELD_BOUNDARY`
- status: COMPLETED_CONTROLLED
- owner: api/agent-core/security
- dependências: `PLAT-S29-001`, `PLAT-S24-001`, `PLAT-FOUNDATION-009`
- descoberta: `RequestHumanApprovalSchema` não tinha máximos; uma fixture
  tenant-scoped persistiu `summary` com 5.000 caracteres em `/v1/approvals`
- entrega: limites no schema compartilhado antes de `approvals.save`:
  `sessionId` 160, `proposedAction` 200 e `summary` 4.000
- aceite: cada campo acima do limite retorna `validation_failed`/400 sem chamar
  o repositório e sem echo; payload válido preserva tenant, auth, handoff,
  approval pending e decisão humana
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: somente validação de entrada com fixtures; sem mudança de decisão de
  approval, provider/canal, RAG, dado real, deploy ou side effect
- evidência: `docs/04_audit/0520_plat_s30_controlled_approval_request_field_boundary_evidence.md`

### Registro controlado PLAT-S30

- A lacuna foi reproduzida antes do BUILD com dados fictícios e sessão/tenant
  controlados; RED/GREEN, regressão próxima, verify e gates externos foram
  concluídos como `COMPLETED_CONTROLLED`.

### Resultado controlado PLAT-S30

- Verify passou com 108 arquivos/394 testes pass/18 skips; coverage
  85,45%/80,83%/85,26%/86,45%; readiness 4/4; E2E 3/3; PostgreSQL 51
  pass/18 skips; audit 0; format e diff check PASS.
- Os três campos acima do limite falham com `validation_failed`/400 antes do
  repositório; valores nos máximos continuam válidos. Evidência:
  `docs/04_audit/0520_plat_s30_controlled_approval_request_field_boundary_evidence.md`.
- Produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S29 — Controlled Internal Task Field Boundary

- id: `PLAT-S29-001_CONTROLLED_INTERNAL_TASK_FIELD_BOUNDARY`
- status: COMPLETED_CONTROLLED
- owner: api/agent-core/security
- dependências: `PLAT-S28-001`, `PLAT-S24-001`, `PLAT-FOUNDATION-009`
- descoberta: `CreateInternalTaskSchema` aceitava campos livres sem máximo; uma
  fixture com sessão/tenant fictícios persistiu quatro campos com 5.000
  caracteres em `POST /v1/tasks`
- entrega: limites no schema compartilhado antes de `tasks.create`:
  `sessionId` 160, `title` 200, `description` 4.000, `source` 120 e
  `idempotencyKey` 200, preservando o mínimo 8 da chave
- aceite: cada campo acima do limite retorna `validation_failed`/400 sem chamar
  o repositório; payload válido continua criando tarefa e preserva tenant,
  auth, idempotência e Secretary
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: somente validação de entrada com fixtures; sem mudança de auth/tenant,
  persistência estrutural, provider/canal, RAG, dado real, deploy ou side effect
- evidência: `docs/04_audit/0519_plat_s29_controlled_internal_task_field_boundary_evidence.md`

### Registro controlado PLAT-S29

- A lacuna foi reproduzida antes do BUILD com dados fictícios e escopo tenant
  controlado; a correção será limitada ao contrato de entrada de criação de
  tarefa.
- RED/GREEN, regressão próxima, verify e gates externos foram concluídos como
  `COMPLETED_CONTROLLED`; nenhum contrato de produção foi ampliado.

### Resultado controlado PLAT-S29

- Verify passou com 107 arquivos/389 testes pass/18 skips; coverage
  85,45%/80,83%/85,26%/86,45%; readiness 4/4; E2E 3/3; PostgreSQL 51
  pass/18 skips; audit 0; format e diff check PASS.
- Os cinco campos acima do limite falham com `validation_failed`/400 antes do
  repositório; valores nos máximos continuam válidos. Evidência:
  `docs/04_audit/0519_plat_s29_controlled_internal_task_field_boundary_evidence.md`.
- Produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S28 — Controlled Audit Filter Duplicate Boundary

- id: `PLAT-S28-001_CONTROLLED_AUDIT_FILTER_DUPLICATE_BOUNDARY`
- status: COMPLETED_CONTROLLED
- owner: api/audit/security
- dependências: `PLAT-S27-001`, `PLAT-S25-001`, `PLAT-FOUNDATION-009`
- entrega: rejeição fail-closed de filtros repetidos de audit evidence
  antes de `summarizeEvidence`/`listEvidence`
- aceite: filtro único permanece válido; array/repetição de `sessionId`,
  `correlationId`, `actorId` ou `type` retorna `validation_failed`/400 sem
  chamada ao repositório
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem mudança de offset/limit, auth/tenant/identity, Secretary,
  persistência, provider/canal, RAG, dado real, deploy ou side effect
- evidência: `docs/04_audit/0518_plat_s28_controlled_audit_filter_duplicate_boundary_evidence.md`

### Registro controlado PLAT-S28

- `sessionId=a&sessionId=b` foi reproduzido como 200; somente `a` chegou ao
  repositório, criando ambiguidade silenciosa.
- RED/GREEN, regressão próxima, verify e gates externos foram concluídos como
  `COMPLETED_CONTROLLED`; nenhum contrato de produção foi ampliado.

### Resultado controlado PLAT-S28

- Verify passou com 106 arquivos/382 testes pass/18 skips; coverage
  85,45%/80,83%/85,26%/86,45%; readiness 4/4; E2E 3/3; PostgreSQL 51
  pass/18 skips; audit 0; format e diff check PASS.
- Filtros repetidos falham antes de summary/page; filtro único e paginação
  permanecem válidos. Evidência:
  `docs/04_audit/0518_plat_s28_controlled_audit_filter_duplicate_boundary_evidence.md`.
- Produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S27 — Controlled Pagination Offset Boundary

- id: `PLAT-S27-001_CONTROLLED_PAGINATION_OFFSET_BOUNDARY`
- status: COMPLETED_CONTROLLED
- owner: api/persistence/security
- dependências: `PLAT-S26-001`, `PLAT-S24-001`, `PLAT-FOUNDATION-009`
- entrega: offset máximo explícito de 10.000 e rejeição de números
  não seguros antes do repositório em conversas/audit evidence
- aceite: offset 0..10.000 aceito; negativo, não inteiro, não seguro ou maior
  que 10.000 retorna `invalid_pagination`/400 sem chamada ao repositório
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem mudança de limit/cursor, auth/tenant/identity, Secretary,
  persistência estrutural, provider/canal, RAG, dado real, deploy ou side effect
- evidência: `docs/04_audit/0517_plat_s27_controlled_pagination_offset_boundary_evidence.md`

### Registro controlado PLAT-S27

- A reprodução aceitou `offset=1e100` e `offset=9007199254740992` com 200 no
  endpoint de conversas; o valor também alimenta `OFFSET` PostgreSQL.
- RED/GREEN, regressão próxima, verify e gates externos foram concluídos como
  `COMPLETED_CONTROLLED`; nenhum contrato de produção foi ampliado.

### Resultado controlado PLAT-S27

- Verify passou com 105 arquivos/376 testes pass/18 skips; coverage
  85,43%/80,80%/85,25%/86,44%; readiness 4/4; E2E 3/3; PostgreSQL 51
  pass/18 skips; audit 0; format e diff check PASS.
- Offsets inválidos falham antes do repositório em conversas e audit evidence;
  offset 10.000 e `limit=1` permanecem válidos. Evidência:
  `docs/04_audit/0517_plat_s27_controlled_pagination_offset_boundary_evidence.md`.
- Produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S26 — Controlled Prompt Profile Error Message Boundary

- id: `PLAT-S26-001_CONTROLLED_PROMPT_PROFILE_ERROR_MESSAGE_BOUNDARY`
- status: COMPLETED_CONTROLLED
- owner: platform/api/security
- dependências: `PLAT-S25-001`, `PLAT-S12-001`, `PLAT-FOUNDATION-009`
- entrega: mensagens constantes para erros de chave/ID do Prompt
  Profile, sem echo de valores fornecidos no payload
- aceite: response-template key inválido, prompt block ID duplicado ou protected
  não aparece na resposta; código/status/envelope/correlation e ausência de
  clone permanecem corretos
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem auth/tenant/identity, Secretary, persistência, provider/canal,
  RAG, dado real, deploy ou side effect
- evidência: `docs/04_audit/0516_plat_s26_controlled_error_message_boundary_evidence.md`

### Registro controlado PLAT-S26

- A reprodução encontrou `error.message` contendo um `responseTemplates` key
  inválido fornecido pelo operador (`token=fixture-secret<script>`).
- O próximo passo obrigatório é escrever RED; nenhuma implementação S26 foi
  iniciada e nenhum contrato de produção foi ampliado.

### Resultado controlado PLAT-S26

- `PLAT-S26-001_CONTROLLED_PROMPT_PROFILE_ERROR_MESSAGE_BOUNDARY` =
  `COMPLETED_CONTROLLED`.
- Gates: focused 4/4; regressão 3 arquivos/21 testes; verify 104 arquivos/371
  testes pass/18 skips; coverage 85,41%/80,77%/85,24%/86,42%; readiness 4/4;
  E2E 3/3; PostgreSQL 51 pass/18 skips; audit 0; format e diff check PASS.
- Evidência: `docs/04_audit/0516_plat_s26_controlled_error_message_boundary_evidence.md`.
  Produção real continua bloqueada.

## PLAT-S25 — Controlled HTTP Request-Target Boundary

- id: `PLAT-S25-001_CONTROLLED_HTTP_TARGET_BOUNDARY`
- status: COMPLETED_CONTROLLED
- owner: api/security/operations
- dependências: `PLAT-S24-001`, `PLAT-S18-001`, `PLAT-FOUNDATION-009`
- entrega: request-target raw bounded em 8192 bytes, maxParamLength
  explícito de 100 e not-found handler com envelope/correlation ID sem echo de
  path/query
- aceite: unknown route 404 `not_found` genérico; target acima de 8 KiB 414
  `request_uri_too_long`; nenhum path/query/segredo é refletido; rotas atuais
  e Secretary permanecem compatíveis
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem auth/tenant/identity, body/parser, Secretary, persistência,
  provider/canal, RAG, dado real, deploy ou side effect
- evidência: `docs/04_audit/0515_plat_s25_controlled_http_target_boundary_evidence.md`

### Resultado controlado PLAT-S25

- `PLAT-S25-001_CONTROLLED_HTTP_TARGET_BOUNDARY` = `COMPLETED_CONTROLLED`.
- Gates: verify 103 arquivos/367 testes pass/18 skips; coverage
  85,41%/80,76%/85,24%/86,42%; readiness 4/4; E2E 3/3; PostgreSQL 51
  pass/18 skips; audit 0; format e diff check PASS.
- O 404 agora é envelope `not_found` correlacionado e target acima de 8192
  bytes falha com 414 sem refletir path/query; produção continua bloqueada.

## PLAT-S24 — Controlled HTTP Parse and Payload Boundary

- id: `PLAT-S24-001_CONTROLLED_HTTP_PARSE_PAYLOAD_BOUNDARY`
- status: COMPLETED_CONTROLLED
- owner: api/security/operations
- dependências: `PLAT-S23-001`, `PLAT-S18-001`, `PLAT-FOUNDATION-009`
- entrega: bodyLimit explícito de 1 MiB, parser JSON bounded, classificação
  segura de parse/media type/body excessivo e envelope global com correlation ID
- aceite: JSON inválido 400 `validation_failed`, media type 415
  `unsupported_media_type`, body excessivo 413 `payload_too_large`; erro
  desconhecido 500 genérico; sem raw body, stack, cause ou mensagem arbitrária
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem upload, streaming, provider/canal, RAG, dado real, deploy,
  alteração de auth/tenant ou side effect
- evidência: `docs/04_audit/0514_plat_s24_controlled_http_parse_payload_boundary_evidence.md`

### Resultado controlado PLAT-S24

- `PLAT-S24-001_CONTROLLED_HTTP_PARSE_PAYLOAD_BOUNDARY` =
  `COMPLETED_CONTROLLED`.
- Gates: `npm run verify` PASS; 102 arquivos/359 testes pass/18 skips;
  coverage 85,46%/80,85%/85,21%/86,40%; readiness 4/4; E2E 3/3;
  PostgreSQL controlado 51 pass/18 skips; audit 0; format e diff check PASS.
- O boundary retorna envelope seguro para parse/media type/body excessivo e
  não altera o Secretary; produção continua bloqueada pelos critérios PROD.

## PLAT-S23 — Controlled Startup Failure Redaction

- id: `PLAT-S23-001_CONTROLLED_STARTUP_FAILURE_REDACTION`
- status: COMPLETED_CONTROLLED
- entrega: formatter de falha de startup bounded/redaction-safe, saída JSON
  mínima no entrypoint e ausência de serialização de stack/cause
- dependência: `PLAT-S22-001`, `PLAT-FOUNDATION-009` e SPEC registrada em
  `docs/platform/06-platform-spec.md`
- aceite: URL com credencial, bearer/token, password/secret/apiKey, PII,
  newline e mensagens excessivas não vazam nem permitem log injection; erro
  desconhecido é genérico; exit code e fail-closed permanecem
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: não substitui logger/alerting distribuído, IdP, tenant binding,
  providers/canais, RAG, dados reais, deploy ou side effect
- evidência:
  `docs/04_audit/0513_plat_s23_controlled_startup_failure_redaction_evidence.md`

### Resultado controlado PLAT-S23

- `PLAT-S23-001_CONTROLLED_STARTUP_FAILURE_REDACTION` =
  `COMPLETED_CONTROLLED`.
- Gates: `npm run verify` PASS; 101 arquivos/351 testes pass/18 skips;
  coverage 85,42%/80,84%/85,16%/86,33%; readiness 4/4; E2E 3/3;
  PostgreSQL controlado 51 pass/18 skips; audit 0; format e diff check PASS.
- O smoke do entrypoint preservou exit 1 e produziu somente JSON redigido;
  produção continua bloqueada pelos critérios PROD.
