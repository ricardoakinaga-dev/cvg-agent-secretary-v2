# Progress — CVG Agent Platform

## S48 — auditoria e fechamento controlado — 2026-09-02

O clock do `CapabilityGateway` agora é injetável com default real; o fixture
compartilha literalmente a mesma função com a autoridade e provas negativas
confirmam que clock inválido, clock que lança e expiração local não consomem
approval nem chamam handler. A asserção web foi escopada à timeline selecionada
com `within`, sem mudança funcional da UI.

Focused final: 3 arquivos/25 testes PASS. Regressão: 127 arquivos/537 testes
PASS, 2 arquivos/19 testes skipped; coverage 84.87/80.12/84.98/85.98; build
158 módulos; PostgreSQL 8/72; E2E 4/4; readiness 4/4; worker smoke; audit 0;
typecheck, lint, format e diff check PASS. S48 está
`COMPLETED_CONTROLLED`; produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.
Evidência: `docs/04_audit/0538_plat-s48_controlled_deterministic_clock_and_test_contract_evidence.md`.

## S48 — registro e discovery do baseline controlado — 2026-09-02

`PLAT-S48_CONTROLLED_BASELINE_DETERMINISM` foi registrado após a regressão
reproduzir dois defeitos de confiabilidade do próprio baseline. O gateway usa
`Date.now()` enquanto a autoridade do fixture usa clock injetado, bloqueando
uma approval válida; o teste web procura globalmente uma mensagem que aparece
legitimamente no preview e na timeline.

Tasks: `PLAT-S48-001_CONTROLLED_DETERMINISTIC_APPROVAL_CLOCK` e
`PLAT-S48-002_CONTROLLED_SEMANTIC_TIMELINE_ASSERTION`. O contrato preserva
fail-closed, single-use, binding e autoridade durável; a correção web é apenas
uma asserção escopada. Próximo passo obrigatório: RED focado antes do BUILD.
Nenhum provider, canal, RAG, rede, dado real ou side effect foi usado.

## S47 — auditoria corretiva e fechamento controlado — 2026-08-26

Após a crítica independente, foram fechadas as boundaries de leitura sem
agente, filtragem do Trace Viewer, redaction recursiva, payload legado com
`spans` não-array e callbacks A→B→A. RED reproduziu os casos negativos e o
GREEN passou.

Gates finais: regressão 127 arquivos/534 testes PASS, 2 arquivos/19 testes
skipped; coverage 84,86/80,12/84,97/85,97; build 158 módulos; E2E 4/4;
PostgreSQL 8/72; readiness 4/4; worker smoke; audit 0; typecheck, lint,
format e diff check PASS. Revisão independente compatível read-only:
`PASS_CONTROLLED`, P0/P1/P2/P3 `0/0/0/0`. S47 está
`COMPLETED_CONTROLLED`; produção real permanece
`NO-GO`/`WAITING_HUMAN_APPROVAL`.

## S47 — RED observado

O focused `multi-agent-creation.test.tsx` executou 1 arquivo/1 teste e falhou
como esperado: após criar Agent A, não existe a ação `Novo agente` para voltar
ao modo de criação na mesma sessão. O BUILD controlado pode iniciar para
adicionar o reset de estado derivado do agente; produção real continua
`NO-GO`/`WAITING_HUMAN_APPROVAL`.

## S47 — discovery e SPEC registrados

`PLAT-S47-001_CONTROLLED_MULTI_AGENT_CREATION_MODE` foi registrada como
`IN_PROGRESS` em `SPEC` após reproduzir que o Control Center não oferece
`Novo agente` depois da primeira seleção. O editor fica em modo de clone e
impede a criação de Agent A e Agent B na mesma sessão pela UI.

Contrato: adicionar modo explícito de criação, limpar apenas estado derivado do
agente selecionado e preservar o clone versionado de agentes existentes. RED é
o próximo passo; produção real continua `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## S46 — correlação única da execução controlada fechada

`PLAT-S46-001_CONTROLLED_EXECUTION_TRACE_CORRELATION_BOUNDARY` foi fechada
como `COMPLETED_CONTROLLED` em `AUDIT`. O kernel resolve um `traceId` antes do
primeiro evento e o propaga por Test Lab, event bus, hooks, runtime publicado,
gateway, approval, auditorias e sinks, preservando os IDs locais de evento e
invocação.

RED: 4 arquivos/33 testes, 8 falhas esperadas e 25 pass. GREEN de fechamento:
6 arquivos/25 testes. Regressão: 126 arquivos pass, 2 skipped; 523 testes pass,
19 skipped. Coverage 85,07/80,06/85,95/86,10; PostgreSQL 8/72; readiness 4/4;
worker smoke; E2E 4/4; build 70 módulos; audit 0; typecheck, lint, format e
diff check PASS. A revisão independente compatível read-only retornou `PASS`
sem P0/P1/P2; achados acionáveis anteriores foram corrigidos.

## Checkpoint atual

- fase: `AUDIT`
- sprint: `PLAT-S47_CONTROLLED_MULTI_AGENT_CREATION_MODE`
- task: `PLAT-S47-001_CONTROLLED_MULTI_AGENT_CREATION_MODE`
- status: `COMPLETED_CONTROLLED`
- último lane validado: S47 auditado com gates completos e revisão independente
  compatível `PASS_CONTROLLED` sem P0/P1/P2/P3
- próximo passo exato: nova `DISCOVERY -> PRD -> SPEC` controlada; produção real
  continua `NO-GO`/`WAITING_HUMAN_APPROVAL`

## S47 — Quality bar

- `CTRL-180`: `Novo agente` retorna ao modo de criação e limpa estado derivado.
- `CTRL-181`: Agent A/B são criados pela UI na mesma sessão/tenant com
  configurações independentes.
- `CTRL-182`: editar agente existente continua criando clone versionado.
- `CTRL-183`: trocar seleção não vaza versões, trace, suite ou ledger entre
  agentes; requests permanecem tenant-aware.
- `CTRL-184`: leituras de suites e release candidates exigem `agentId` na API
  e no cliente.
- `CTRL-185`: traces são redigidos e shapes legados não quebram o Trace Viewer.

## S46 — limites preservados

Somente correlação parental local bounded. Nenhum OTel/exporter, tracing
distribuído, broker, rede, provider/canal real, RAG, deploy, dado real, segredo,
ação clínica/financeira ou side effect foi ativado.

## S45 — Discovery, BUILD e auditoria fechados

Discovery read-only reproduziu três falhas na boundary de tools: `input: null`
chega ao handler sem validator, `actor.permissions` inválido causa `TypeError`
e o resultado de handler com `data.raw` retorna sem projeção. S45 foi registrado
com gate `SPEC_APPROVED_CONTROLLED_BUILD` e implementado com validators de
input/output, authorizer server-side, autoridade durável de approval, bounds,
redaction e tratamento explícito de auditoria indisponível. Nenhum provider,
canal, rede, RAG, broker, dado real ou side effect foi usado.

Focused 6/41; regressão 125 arquivos/512 testes pass, 2/19 skipped; coverage
85,01/80,14/85,82/86,03; PostgreSQL 6/53, 2/19 skipped; E2E 4/4; readiness
4/4; worker smoke; build 70 módulos; audit 0; typecheck, lint, format e diff
check PASS. Revisão independente compatível read-only: `PASS sem P0/P1`.

## S44 — Discovery e registro

`createTraceSpans` ainda produz `durationMs: 0` estático. S44 foi registrado
para adicionar clock monotônico/ledger bounded injetável e integrar medição
local sem payload ou exporter; próximo passo obrigatório: RED.

## S44 — Auditoria e fechamento controlado

`PLAT-S44-001` foi fechado como `COMPLETED_CONTROLLED`: focused 2/17;
regressão 124 arquivos/501 testes pass, 2/19 skipped; coverage
85,18/80,44/85,70/86,16; PostgreSQL 8/72; E2E 4/4; readiness 4/4; build 70
módulos; audit 0 e checks estáticos PASS. Evidência:
`docs/04_audit/0534_plat-s44_controlled_trace_stage_timing_evidence.md`.

## S43 — Discovery e registro

`createTraceSpans` ainda emite duração estática zero e a boundary não exige
coerência entre timestamps, latência, ordem ou status derivado de spans. S43
foi registrado com gate `SPEC_APPROVED_CONTROLLED_BUILD`; o próximo passo é
RED antes de qualquer implementação.

## S43 — RED/GREEN focado

RED: 1 arquivo/14 testes, com 6 falhas esperadas para timing parcial/invertido,
latência incompatível, ordem/duração e status de spans. GREEN: 1 arquivo/14
testes PASS após invariantes no parser compartilhado; typecheck, lint e diff
check PASS.

## S43 — Auditoria e fechamento controlado

`PLAT-S43-001` foi fechado como `COMPLETED_CONTROLLED`: regressão 124
arquivos/499 testes pass, 2/19 skipped; coverage 85,08/80,41/85,45/86,08;
PostgreSQL 8/72; E2E 4/4; readiness 4/4; build 70 módulos; audit 0 e checks
estáticos PASS. Evidência:
`docs/04_audit/0533_plat-s43_controlled_trace_temporal_integrity_evidence.md`.

## S42 — RED observado

O focused executou 3 arquivos/16 testes e falhou em 9 casos esperados: campos
extras/provider adulterado atravessaram o sink, suite bypassou a sanitização e
leitura PostgreSQL devolveu JSON corrompido. Nenhuma operação externa ocorreu.

## S42 — GREEN focado

O focused ampliado passou 6 arquivos/76 testes. A projeção canônica valida
IDs, enums, datas, limites, provider controlado, `externalCall: false`,
redaction e coerência de output; InMemory, PostgreSQL, suite e listagem usam a
mesma regra. Typecheck e lint passaram.

## S42 — Auditoria e fechamento controlado

S42 foi fechado como `COMPLETED_CONTROLLED`: regressão 124 arquivos/492 testes
pass, 2/19 skipped; coverage 84,99/80,24/85,41/86,00; PostgreSQL controlado
8/72; E2E 4/4; readiness 4/4; worker smoke, build, typecheck, lint, format,
diff check e audit 0 passaram. Evidência:
`docs/04_audit/0532_plat_s42_controlled_trace_provenance_boundary_evidence.md`.

## S41 — RED controlado

O focused `npx vitest run packages/platform/src/__tests__/output-policy.test.ts`
executou 1 arquivo/7 testes e falhou como esperado antes do GREEN: os exports
da output policy ainda não existem, e o caso integrado reproduz que uma
resposta de knowledge com diagnóstico/medicação alcança o trace sem validação
pós-modelo. Próximo passo: implementar somente o módulo puro e sua integração
antes de `response.after`; produção real permanece `NO-GO`.

## S41 — GREEN focado

O focused passou 3 arquivos/14 testes. `enforceControlledOutput` valida tipo,
limite e redaction, reescreve conteúdo clínico/ação sensível para fallback
seguro, e o runtime atualiza mode/handoff antes de `response.after`; os eventos
`policy.output.before/after` não carregam texto bruto. Typecheck e lint também
passaram. Regressão e gates integrados ainda estão pendentes.

## S41 — revisão independente e RED corretivo

A revisão encontrou dois P0: variantes de output clínico/financeiro/agenda
passavam pelo detector e output rejeitado ainda alcançava planning/approval/
execute de tools. Também foram apontados motivo de handoff inconsistente,
event bus mockado sem ordem/cardinalidade, falta de metadado bounded no trace e
cobertura incompleta de templates/provider malformado. As novas regressões
reproduziram 11 falhas em 1 arquivo/21 testes antes da correção. A tentativa do
papel especializado falhou por incompatibilidade do modelo e não foi tratada
como aprovação.

## S41 — GREEN corretivo focado

O focused passou 4 arquivos/36 testes. A policy normaliza Unicode e
confusáveis comuns, cobre plurais/inflexões, unidades, separadores e agenda;
qualquer rewrite interrompe tools/approval. O runtime dá precedência ao motivo
`unsafe_output_rejected`, emite um handoff único após a decisão, persiste
`outputPolicy` bounded no trace/clones e o adaptador publicado encaminha o
event bus. Typecheck, lint e diff check passaram.

## S41 — auditoria e fechamento controlado

`PLAT-S41-001 = COMPLETED_CONTROLLED`. O focused de fechamento passou 7
arquivos/76 testes; `npm test` passou 123 arquivos/483 testes, com 2 arquivos
e 19 testes skipped. Coverage: 85,08% statements, 80,29% branches, 85,39%
functions e 86,12% lines. Readiness 4/4, worker smoke, PostgreSQL 8/72,
E2E 4/4, build 70 módulos, typecheck, lint, format, audit 0 e diff check
passaram. A regressão PostgreSQL também prova que trace inseguro não chega a
outbound nem marca inbound como concluído. Evidência:
`docs/04_audit/0531_plat_s41_controlled_output_safety_boundary_evidence.md`.

A revisão independente encontrou P0/P1 e os achados foram convertidos em
regressões e corrigidos. A confirmação assíncrona final não retornou dentro do
limite e não foi tratada como aprovação; a auditoria estática local e os gates
não deixaram achado aberto conhecido no escopo controlado. Produção real segue
`NO-GO`/`WAITING_HUMAN_APPROVAL`.

## S40 — fechamento controlado

`PLAT-S40-001` foi fechado como `COMPLETED_CONTROLLED`. O runtime resolve
somente `fake/deterministic-v1` por registry compilado, rejeita provider/model
desconhecido e `fallbackProvider` antes da pipeline e mantém
`externalCall: false`; Test Lab, runtime publicado e worker compartilham a
mesma resolução. Gates finais: focused 4/19, regressão 121 arquivos/446
testes/19 skips, coverage 85,08/80,11/85,17/86,07, readiness 4/4,
PostgreSQL 8/72, E2E 4/4, worker smoke, build, typecheck, lint, format, audit
0 e diff check PASS. Revisão independente follow-up: `PASS sem achados
estáticos`. Evidência:
`docs/04_audit/0530_plat_s40_controlled_model_provider_identity_evidence.md`.
Produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## S39 — registro controlado antes do BUILD

Discovery confirmou que a transição para `VALIDATED` valida gates, mas não
recalcula o digest do candidate em memória nem PostgreSQL. O lane registrado
reutiliza uma asserção compartilhada e rejeita adulteração sem mutação. Sem
publish adicional, deploy, provider/canal, RAG, broker, outbox, egress, dado
real ou side effect. Evidência planejada:
`docs/04_audit/0529_plat_s39_controlled_release_candidate_lifecycle_integrity_evidence.md`.

## S39 — RED observado

O focused executou 2 arquivos/6 testes: 4 passaram e 2 falharam como esperado.
O digest adulterado ainda permitiu `VALIDATED` em ambos os adapters. Nenhuma
operação externa foi chamada; o próximo gate é GREEN mínimo.

## S39 — GREEN focado

`assertReleaseCandidateEvidenceIntegrity` foi implementada no módulo shared e
reutilizada pela autoridade de publish e pelas transições InMemory/PostgreSQL.
O focused passou 2 arquivos/6 testes; digest íntegro é aceito e adulterado
permanece em `DRAFT`; typecheck e lint passaram. Próximo passo: gates integrados.

## S39 — correção após crítica independente

A revisão encontrou autoatestação pelo `createdBy` e mascaramento de
`gate_results` corrompido no mapper PostgreSQL. O validador independente,
parser shared fail-closed e testes separados foram adicionados; focused final
passou 7 arquivos/23 testes, incluindo o contrato da migration e o boundary
HTTP de publish. Próximo passo: fechar auditoria documental.

## S39 — fechamento controlado

`PLAT-S39-001` foi fechado como `COMPLETED_CONTROLLED`. A autoridade de
publish/rollback rejeita RC auto-atestada mesmo se já persistida; InMemory,
PostgreSQL, API, UI e fixture controlada preservam a independência do
validador. A migration `0009` adiciona a proteção no banco. Gates finais:
120 arquivos/438 testes/19 skips, coverage 85,08/80,16/85,18/86,08,
readiness 4/4, worker smoke, PostgreSQL 8/72, E2E 4/4, build, typecheck, lint,
format, audit 0 e diff check PASS. Evidência:
`docs/04_audit/0529_plat_s39_controlled_release_candidate_lifecycle_integrity_evidence.md`.
Produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## S38 — fechamento controlado

`PLAT-S38-001` foi fechado como `COMPLETED_CONTROLLED`. O job strict reutiliza
`ApprovedKnowledgeForTestSchema`, encaminha o fixture parseado ao runtime
pinned e alinha history ao limite 50. A crítica independente encontrou o drift
de history e a cobertura foi ampliada; ambos foram corrigidos. Gates finais:
120 arquivos/432 testes/19 skips, coverage 84,92/80,09/85,08/85,92,
readiness 4/4, worker smoke, E2E 4/4, PostgreSQL 8/71, build, lint, format,
audit 0 e diff check. Evidência:
`docs/04_audit/0528_plat_s38_controlled_worker_knowledge_input_parity_evidence.md`.
Sem broker, RAG, provider, canal, dados reais, deploy ou side effect; produção
real permanece `NO-GO`.

## S37 — fechamento controlado

`PLAT-S37-001` foi fechado como `COMPLETED_CONTROLLED`. O runtime exige
`releaseCandidateId` em publish/rollback e revalida status `VALIDATED`,
metadados, quatro gates `PASS`, digest e binding exato no servidor. API,
InMemory, PostgreSQL, UI e fixtures mantêm a mesma autoridade; rollback deriva
um novo snapshot da fonte. Gates finais: 119 arquivos/427 testes/19 skips,
coverage 84,92/80,08/85,08/85,92, readiness 4/4, worker smoke, E2E 4/4,
PostgreSQL 8/71, build, lint, format, audit 0 e diff check. Evidência:
`docs/04_audit/0527_plat_s37_controlled_publish_evidence_authority_evidence.md`.
Nenhum dado real, deploy, provider/canal, RAG, egress, broker, outbox ou side
effect entrou no escopo; produção real permanece `NO-GO`.

## S36 — fechamento controlado

Discovery encontrou `validateApprovedKnowledge` parcialmente implementada em
`packages/platform/src/test-lab.ts`, sem limites/strictness completos. As rotas têm schemas locais, mas o
runtime/worker pode receber o tipo diretamente sem a mesma validação. S36
extraiu `ApprovedKnowledgeForTestSchema` para o contrato compartilhado; o
runtime valida antes de knowledge/model/tools e a API Test Lab/approval
execution reutiliza o mesmo schema. O focused e o teste negativo adicional
passaram; verify 117/422/19 skips com coverage 85,05/80,31/85,11/86,07,
readiness 4/4, worker smoke, E2E 4/4, PostgreSQL 8/71 e audit 0 também
passaram. Produção real continua `NO-GO`; evidência:
`docs/04_audit/0526_plat_s36_controlled_knowledge_input_boundary_evidence.md`.

## S35 — registro controlado antes do BUILD

Discovery confirmou que `executePlannedTools` e a API de capability approval
fixam `find_available_slots`, enquanto o control plane aceita bindings de
plugins. O S35 registra um registry compilado server-side com versão exata,
planner por intent, deduplicação e colisão fail-closed. O catálogo continua
metadata-only e não fornece handlers. O próximo passo é RED; nenhuma tool real,
provider, canal, egress, broker, dado real, deploy ou side effect entra no lane.

## S35 — GREEN focado e regressão próxima

O GREEN adicionou intents bounded, registry/planner por versão exata, bloqueio
de colisão e deduplicação, além de resolver approval/API e permissão no servidor.
Em `2026-08-26T00:07:55-03:00`, 10 arquivos/49 testes passaram, incluindo
platform, API, runtime publicado, adapter legado e UI; typecheck passou. O
próximo passo são verify, readiness, E2E, PostgreSQL, audit e crítica
independente. O catálogo continua metadata-only.

## S35 — fechamento controlado

`PLAT-S35-001_CONTROLLED_TOOL_REGISTRY_IDENTITY_BOUNDARY` foi fechado como
`COMPLETED_CONTROLLED` após a correção de auditoria e nova rodada completa:
verify 115 arquivos/417 testes/19 skips, coverage 84,99/80,30/85,11/86,01;
readiness 4/4, smoke do worker, E2E 4/4, PostgreSQL 8/71, audit 0, typecheck,
lint, build, format e diff check PASS. Evidência:
`docs/04_audit/0525_plat_s35_controlled_tool_registry_identity_evidence.md`.
O próximo passo seguro é nova descoberta/SPEC; produção real segue `NO-GO`.

## S35 — RED observado

Em `2026-08-26T00:00:58-03:00`, a suíte focada executou 4 testes: 3 falharam
como esperado porque intents ainda são rejeitados pelo manifesto, o gateway
aceita latest/primeiro binding e o planner por registry não existe; o teste de
catálogo metadata-only já passou. O próximo passo é GREEN mínimo, sem abrir
handlers externos.

## S34 — fechamento controlado

`PLAT-S34-001_CONTROLLED_CI_GATE_PARITY` foi fechado como
`COMPLETED_CONTROLLED`. O workflow declara permissions/concurrency mínimos,
checkout sem credenciais persistentes, `npm ci --ignore-scripts`, readiness,
verify, smoke processual do worker, PostgreSQL, E2E e `git diff --check`.
`scripts/worker-startup-smoke.mjs` executa o entrypoint real sem adapter,
verifica exit 1 e JSON `worker.startup_failed/queue_adapter_missing` sem
bootstrap, stack ou cause. Evidência:
`docs/04_audit/0524_plat_s34_controlled_ci_gate_parity_evidence.md`.

Gates: verify 114 arquivos/411 testes pass/19 skips, coverage
85,01%/80,42%/85,14%/85,99%; readiness 4/4; E2E 4/4; PostgreSQL controlado
8 arquivos/71 testes; typecheck, lint, build, format, audit 0 e diff check
PASS. O scan de container continua explicitamente fora por ausência de
Dockerfile/imagem. O próximo passo seguro é nova descoberta/SPEC controlado;
nenhum deploy, provider/canal, RAG, dado real ou side effect está autorizado.

## S31 — registro controlado antes do BUILD

Em `2026-08-25T19:51:14-03:00`, foi registrado
`PLAT-S31-001_CONTROLLED_APPROVAL_DECISION_NOTE_FIELD_BOUNDARY` com gate
`SPEC_APPROVED_CONTROLLED_BUILD`. A descoberta reproduziu uma decisão de
approval fictícia aceitando `note` com 5.000 caracteres e persistindo o estado
`approved`; a nota não foi ecoada nem persistida. O contrato proposto limita
`note` a 4.000 antes de `approvals.save`, sem alterar decisão, identidade,
approval state, handoff ou não persistência atual da nota. O próximo passo é
RED; auth, tenant, Secretary, provider/canal, RAG, dado real, deploy e side
effect ficam fora.

## S31 — RED observado

Em `2026-08-25T19:55:57-03:00`, a suíte focada
`apps/api/src/approval-decision-note-field-boundary.test.ts` produziu RED real:
3 testes, 1 PASS e 2 FAIL. `note` com 4.001 caracteres ainda atravessa o
schema, a decisão retorna 200 e alcança `approvals.save`; o caso no limite de
4.000 já passa. O próximo passo é GREEN mínimo somente no schema compartilhado.

## S31 — GREEN focado

Em `2026-08-25T19:56:51-03:00`, foi adicionado somente `.max(4000)` ao campo
opcional `note` de `ResolveApprovalSchema`; a suíte focada passou 1 arquivo/3
testes. Nota excedente falha antes de `approvals.save`, sem echo e sem mutação
do approval pending; nota no limite preserva decisão `approved`. O próximo passo
é regressão próxima/verify.

## S31 — regressão próxima

Em `2026-08-25T19:57:31-03:00`, a regressão de S31/S30, approval actions, RBAC,
tenant isolation, health, observability, audit evidence e `agent-core` passou
9 arquivos/31 testes. Decisão válida, approval pending, handoff, identidade,
tenant e Secretary permanecem verdes; o próximo passo é `npm run verify`.

## S31 — fechamento controlado

`PLAT-S31-001_CONTROLLED_APPROVAL_DECISION_NOTE_FIELD_BOUNDARY` foi fechado
como `COMPLETED_CONTROLLED` em `2026-08-25T20:06:15-03:00`. Verify passou com
109 arquivos/397 testes pass/18 skips e coverage 85,45%/80,83%/85,26%/86,45%;
readiness 4/4, E2E 3/3, PostgreSQL 51/18, audit 0, format, JSON e diff check
também passaram. Evidência:
`docs/04_audit/0521_plat_s31_controlled_approval_decision_note_field_boundary_evidence.md`.
Produção real continua `NO-GO`/`WAITING_HUMAN_APPROVAL`; o próximo passo é novo
SPEC controlado.

## S30 — registro controlado antes do BUILD

Em `2026-08-25T19:28:17-03:00`, foi registrado
`PLAT-S30-001_CONTROLLED_APPROVAL_REQUEST_FIELD_BOUNDARY` com gate
`SPEC_APPROVED_CONTROLLED_BUILD`. A descoberta reproduziu `summary` com 5.000
caracteres persistido em approval fixture tenant-scoped. O contrato proposto
limita `sessionId` a 160, `proposedAction` a 200 e `summary` a 4.000, sem
alterar auth, tenant, approval pending, handoff, decisão humana, provider/canal,
RAG, dado real, deploy ou side effect. O próximo passo é RED.

## S30 — RED observado

Em `2026-08-25T19:30:53-03:00`, a suíte focada
`apps/api/src/approval-request-field-boundary.test.ts` produziu RED real: 5
testes, 1 PASS e 4 FAIL. Os três máximos ainda não existiam; `summary` e
`proposedAction` chegaram ao save com valores longos e `sessionId` longo caiu em
`invalid_action` tardio.

## S30 — GREEN focado

Em `2026-08-25T19:31:49-03:00`, foram adicionados os máximos ao
`RequestHumanApprovalSchema`; a suíte focada passou 1 arquivo/5 testes. Cada
campo acima do limite falha antes de `approvals.save`, valores no limite são
válidos e approval permanece `pending`.

## S30 — fechamento controlado

`PLAT-S30-001_CONTROLLED_APPROVAL_REQUEST_FIELD_BOUNDARY` foi fechado como
`COMPLETED_CONTROLLED` em `2026-08-25T19:40:47-03:00`. Verify passou com 108
arquivos/394 testes pass/18 skips e coverage 85,45%/80,83%/85,26%/86,45%;
readiness 4/4, E2E 3/3, PostgreSQL 51/18, audit 0, format e diff check também
passaram. Evidência:
`docs/04_audit/0520_plat_s30_controlled_approval_request_field_boundary_evidence.md`.
Produção real continua `NO-GO`/`WAITING_HUMAN_APPROVAL`; o próximo passo é novo
SPEC controlado.

## S29 — registro controlado antes do BUILD

Em `2026-08-25T19:05:04-03:00`, foi registrado
`PLAT-S29-001_CONTROLLED_INTERNAL_TASK_FIELD_BOUNDARY` com gate
`SPEC_APPROVED_CONTROLLED_BUILD`. A descoberta reproduziu uma criação fictícia
de tarefa com `title`, `description`, `source` e `idempotencyKey` de 5.000
caracteres persistidos. O contrato proposto limita, respectivamente,
`sessionId` a 160, `title` a 200, `description` a 4.000, `source` a 120 e
`idempotencyKey` a 200, preservando o mínimo 8 da chave. O próximo passo é RED;
auth, tenant, Secretary, persistência estrutural, provider/canal, RAG, dado
real, deploy e side effect ficam fora.

## S29 — RED observado

Em `2026-08-25T19:09:13-03:00`, a suíte focada
`apps/api/src/internal-task-field-boundary.test.ts` produziu RED real: 7 testes,
1 PASS e 6 FAIL. Os máximos ainda não existiam; quatro campos chegaram à criação
com 5.000 caracteres e `sessionId` longo resultou em `invalid_action` tardio.

## S29 — GREEN focado

Em `2026-08-25T19:10:24-03:00`, foram adicionados os máximos ao
`CreateInternalTaskSchema`; a suíte focada passou 1 arquivo/7 testes. Cada campo
acima do limite falha antes de `tasks.create`, valores no limite continuam
válidos e o próximo passo é regressão próxima/verify.

## S29 — fechamento controlado

`PLAT-S29-001_CONTROLLED_INTERNAL_TASK_FIELD_BOUNDARY` foi fechado como
`COMPLETED_CONTROLLED` em `2026-08-25T19:21:22-03:00`. Verify passou com 107
arquivos/389 testes pass/18 skips e coverage 85,45%/80,83%/85,26%/86,45%;
readiness 4/4, E2E 3/3, PostgreSQL 51/18, audit 0, format e diff check também
passaram. Evidência:
`docs/04_audit/0519_plat_s29_controlled_internal_task_field_boundary_evidence.md`.
Produção real continua `NO-GO`/`WAITING_HUMAN_APPROVAL`; o próximo passo é novo
SPEC controlado.

## S28 — registro controlado antes do BUILD

Em `2026-08-25T18:43:39-03:00`, foi registrado
`PLAT-S28-001_CONTROLLED_AUDIT_FILTER_DUPLICATE_BOUNDARY` com gate
`SPEC_APPROVED_CONTROLLED_BUILD`. A descoberta reproduziu
`sessionId=a&sessionId=b` retornando 200 enquanto somente o primeiro valor era
encaminhado ao repositório. O escopo é rejeitar filtros repetidos antes de
summary/page, sem alterar filtro único, paginação, auth, tenant, identidade,
Secretary, persistência, provider/canal, RAG, dado real, deploy ou side effect.
O próximo passo é RED.

## S28 — RED observado

Em `2026-08-25T18:47:07-03:00`, a suíte focada
`apps/api/src/audit-filter-duplicate-boundary.test.ts` falhou antes do BUILD
porque `apps/api/src/audit-filter-duplicate-boundary.ts` ainda não existe;
nenhum teste foi considerado PASS. O próximo passo é implementar somente a
rejeição de filtros repetidos antes de summary/page.

## S28 — GREEN focado

Em `2026-08-25T18:48:48-03:00`, o classificador
`apps/api/src/audit-filter-duplicate-boundary.ts` foi integrado a
`parseOptionalAuditFilter`; a suíte focada passou 1 arquivo/6 testes. Os quatro
filtros repetidos falham com 400 antes de summary/page, e filtro único com
paginação continua 200. Regressão próxima e verify ainda são necessários.

## S28 — fechamento controlado

`PLAT-S28-001_CONTROLLED_AUDIT_FILTER_DUPLICATE_BOUNDARY` foi fechado como
`COMPLETED_CONTROLLED` em `2026-08-25T18:57:03-03:00`. Verify passou com 106
arquivos/382 testes pass/18 skips e coverage 85,45%/80,83%/85,26%/86,45%;
readiness 4/4, E2E 3/3, PostgreSQL 51/18, audit 0, format e diff check também
passaram. Evidência:
`docs/04_audit/0518_plat_s28_controlled_audit_filter_duplicate_boundary_evidence.md`.
Produção real continua `NO-GO`/`WAITING_HUMAN_APPROVAL`; o próximo passo é novo
SPEC controlado.

## S25 — registro controlado antes do BUILD

Em `2026-08-25T17:26:43-03:00`, foi registrado
`PLAT-S25-001_CONTROLLED_HTTP_TARGET_BOUNDARY` com gate
`SPEC_APPROVED_CONTROLLED_BUILD`. A descoberta reproduziu o 404 padrão do
Fastify refletindo path/query de rota desconhecida e a ausência de um contrato
explícito para request-target grande. O escopo é limitado a 404 redaction-safe,
414 acima de 8192 bytes e `maxParamLength` explícito de 100. O próximo passo é
RED; nenhum fluxo Secretary, body/parser S24, auth, tenant, provider, RAG,
dado real ou side effect será alterado.

## S25 — RED observado

Em `2026-08-25T17:30:16-03:00`, a suíte focada falhou como esperado porque
`apps/api/src/http-target-boundary.ts` ainda não existia. Nenhum PASS amplo foi
inferido; o BUILD permanece restrito ao classificador de target, limites
explícitos e not-found envelope.

## S25 — GREEN focado

Em `2026-08-25T17:32:34-03:00`, foram implementados o classificador puro de
request-target, `routerOptions.maxParamLength`, o not-found handler redaction-
safe e o 414 bounded. A suíte focada passou 8/8; typecheck, lint, format e
`git diff --check` também passaram. Ainda faltam verify, readiness, E2E,
PostgreSQL, audit e a revisão integrada para fechar o lane.

## S25 — crítica lead-only e correção

O verify revelou em `2026-08-25T17:35:16-03:00` uma expectativa antiga do S22
que tratava 404 como resposta non-envelope. A expectativa foi atualizada para o
contrato S25 de envelope correlacionado, preservando preflight 204 sem header;
focused S25 + correlation passou 14/14 em `2026-08-25T17:38:16-03:00`.

## S25 — fechamento controlado

`PLAT-S25-001_CONTROLLED_HTTP_TARGET_BOUNDARY` foi fechado como
`COMPLETED_CONTROLLED` em `2026-08-25T17:47:28-03:00`. O verify passou com 103
arquivos/367 testes pass/18 skips e coverage 85,41%/80,76%/85,24%/86,42%;
readiness 4/4, E2E 3/3, PostgreSQL 51/18, audit 0, format, diff check e smoke
também passaram. Evidência:
`docs/04_audit/0515_plat_s25_controlled_http_target_boundary_evidence.md`.
Produção real continua `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## S26 — registro controlado antes do BUILD

Em `2026-08-25T17:57:45-03:00`, foi registrado
`PLAT-S26-001_CONTROLLED_PROMPT_PROFILE_ERROR_MESSAGE_BOUNDARY` com gate
`SPEC_APPROVED_CONTROLLED_BUILD`. A descoberta reproduziu que um
`responseTemplates` key inválido enviado ao clone aparece em `error.message`.
O escopo é limitado a mensagens constantes para chave/ID de Prompt Profile,
preservando status, código, envelope, correlação e ausência de clone. O próximo
passo é RED; auth, tenant, identidade, Secretary, persistência, provider/canal,
RAG, dado real, deploy e side effect não serão alterados.

## S26 — RED observado

Em `2026-08-25T18:01:30-03:00`, a suíte focada falhou em 4/4 antes do BUILD:
as mensagens de chave/ID ainda incluem os valores recebidos e o clone API
reflete o sentinel. A correção fica limitada a mensagens constantes no Prompt
Profile, mantendo o contrato do endpoint e a ausência de nova versão.

## S26 — GREEN focado

Em `2026-08-25T18:02:37-03:00`, as mensagens interpoladas foram substituídas por
constantes em `packages/platform/src/prompt-profile.ts`; a suíte focada passou
1 arquivo/4 testes. A API continua 400 `validation_failed`, sem sentinel e sem
criar nova versão; regressão próxima e verify integrado ainda são necessários.

## S26 — crítica lead-only e correção

A regressão próxima encontrou uma expectativa histórica de palavras
interpoladas. O teste foi atualizado para a mensagem constante; S26 +
control-plane + prompt-profile passaram 3 arquivos/21 testes em
`2026-08-25T18:03:50-03:00`, com typecheck, lint, format e diff check verdes.

## S26 — fechamento controlado

`PLAT-S26-001_CONTROLLED_PROMPT_PROFILE_ERROR_MESSAGE_BOUNDARY` foi fechado
como `COMPLETED_CONTROLLED` em `2026-08-25T18:12:10-03:00`. Verify passou com
104 arquivos/371 testes pass/18 skips e coverage 85,41%/80,77%/85,24%/86,42%;
readiness 4/4, E2E 3/3, PostgreSQL 51/18, audit 0, format e diff check também
passaram. Evidência:
`docs/04_audit/0516_plat_s26_controlled_error_message_boundary_evidence.md`.
Produção real continua `NO-GO`/`WAITING_HUMAN_APPROVAL`; o próximo lane exige
novo SPEC controlado.

## S27 — registro controlado antes do BUILD

Em `2026-08-25T18:18:06-03:00`, foi registrado
`PLAT-S27-001_CONTROLLED_PAGINATION_OFFSET_BOUNDARY` com gate
`SPEC_APPROVED_CONTROLLED_BUILD`. A descoberta reproduziu `offset=1e100` e
`offset=9007199254740992` aceitos com 200 em conversas. O escopo é um teto de
10.000 e rejeição de valores não seguros antes dos repositórios, sem alterar
limit/cursor, auth, tenant, identidade, Secretary, persistência estrutural,
provider/canal, RAG, dado real, deploy ou side effect. O próximo passo é RED.

## S27 — RED observado

Em `2026-08-25T18:22:35-03:00`, a suíte focada
`apps/api/src/pagination-boundary.test.ts` falhou antes do BUILD porque
`apps/api/src/pagination-boundary.ts` ainda não existe; nenhum teste foi
considerado PASS. O próximo passo é implementar o mínimo do classificador de
offset seguro e da validação bounded nos parsers de conversas/audit evidence.

## S27 — GREEN focado

Em `2026-08-25T18:24:45-03:00`, a implementação de
`apps/api/src/pagination-boundary.ts` e a integração nos parsers de conversas e
audit evidence fizeram a suíte focada passar 1 arquivo/5 testes. Offsets
inválidos falham antes dos repositórios; o teto inclusivo de 10.000 e
`limit=1` permanecem válidos. Regressão próxima e verify ainda são necessários.

## S27 — fechamento controlado

`PLAT-S27-001_CONTROLLED_PAGINATION_OFFSET_BOUNDARY` foi fechado como
`COMPLETED_CONTROLLED` em `2026-08-25T18:36:17-03:00`. Verify passou com 105
arquivos/376 testes pass/18 skips e coverage 85,43%/80,80%/85,25%/86,44%;
readiness 4/4, E2E 3/3, PostgreSQL 51/18, audit 0, format e diff check também
passaram. Evidência:
`docs/04_audit/0517_plat_s27_controlled_pagination_offset_boundary_evidence.md`.
Produção real continua `NO-GO`/`WAITING_HUMAN_APPROVAL`; o próximo passo é novo
SPEC controlado.

## Implementação validada anterior

O S13 fechou o Handoff Policy Studio sobre a base do S12: editor JSON versionado,
proteção fail-closed de blocks kernel/system/safety, templates operacionais,
thresholds, destinos e prioridade no trace. A suíte validada tinha 79 arquivos,
284 testes pass, 16 skips condicionais e cobertura acima de 80%.

## S13 — resultado controlado

O Admin configura thresholds dentro de limites, quantidade de clarificações,
múltiplos destinos e prioridade; o runtime usa esses valores no Test Lab e
publica destino/prioridade redigidos no trace. A UI rejeita campos vazios,
duplicados e destinos fora do formato controlado antes da request.

Autoridade e limites estão em `docs/platform/05-platform-prd.md`,
`docs/platform/06-platform-spec.md`, `docs/platform/07-platform-execplan.md`
e `docs/platform/04-backlog.md`. A evidência está em
`docs/04_audit/0503_plat_s13_handoff_policy_studio_evidence.md`.

## Arquivos principais esperados

- `packages/platform/src/contracts.ts`
- `packages/platform/src/policy-evaluator.ts`
- `packages/platform/src/test-lab.ts`
- `apps/web/src/features/platform/index.tsx`
- contratos/client/API e testes de boundary correspondentes

## Validação obrigatória

RED/GREEN do schema, evaluator, Test Lab, UI/API e regressão de snapshots;
`npm run verify`; `npm run readiness`; `npm run test:e2e`;
`npm run test:postgres`; `npm run audit:security`; `git diff --check`.

## S17 — RED observado

Os testes focados de contrato, persistência, API e UI foram executados antes da
implementação. O RED confirmou a ausência das rotas, client, controles de UI e
contrato/store do checkpoint; cinco assertions falharam conforme esperado.

## S17 — resultado controlado

O checkpoint foi implementado como metadata-only tenant-aware: até 200 IDs
únicos, filtros strict, verificação server-side, digest SHA-256 canônico,
`SEALED -> ARCHIVED` com `expectedStatus`, migration 0007/RLS, repository em
memória/PostgreSQL, API/client/UI e audit operacional redigido. Nenhum payload
bruto é persistido ou exportado e os eventos existentes permanecem inalterados.

Evidência: `docs/04_audit/0507_plat_s17_controlled_audit_evidence_checkpoint_evidence.md`.
`PLAT-S17-001` está `COMPLETED_CONTROLLED`. Gates: `npm run verify` PASS;
95 arquivos, 317 testes pass, 18 skips; coverage 84,95%/80,00%/84,52%/85,82%;
readiness 4/4; E2E 2/2; PostgreSQL controlado 51 pass/18 skips; audit 0 e
`git diff --check` PASS. Produção real continua `NO-GO`/
`WAITING_HUMAN_APPROVAL`.

## S18 — registro controlado antes do BUILD

O audit final identificou uma lacuna de segurança de borda: headers defensivos
existem, mas não há enforcement executável de `Origin`/CORS, preflight e
transporte HTTPS no boundary do API. O S18 adiciona somente essa barreira
controlada, com allowlist exact-match, proxy explicitamente confiável e
bootstrap fail-closed por ambiente.

Registro e autoridade: `docs/platform/05-platform-prd.md`,
`docs/platform/06-platform-spec.md`, `docs/platform/07-platform-execplan.md`,
`docs/platform/04-backlog.md`, `docs/30_backlog_master.md`,
`docs/99_runtime_state.md` e `docs/20_master_execution_log.md`.

Gate atual: `SPEC_APPROVED_CONTROLLED_BUILD`; próximo passo obrigatório é
escrever testes RED. Não há autorização para configurar host real, IdP,
provider, canal, RAG, dado real ou side effect.

## S18 — RED observado

Os testes focados foram escritos antes da implementação. O RED confirmou que o
módulo HTTP ainda não existe, `buildServer` não conhece `httpSecurity` e o env
não exige nem retorna `API_ALLOWED_ORIGINS`, `API_REQUIRE_HTTPS` e
`API_TRUSTED_PROXY_HOPS`. O próximo passo é GREEN controlado.

## S18 — resultado controlado

O boundary HTTP foi implementado com normalização exact-match de origins,
preflight CORS fail-closed, allowlist `GET/POST/PATCH/OPTIONS`, headers de
segurança fixos, HTTPS com `trustedProxyHops` explícito, HSTS HTTPS-only e
bootstrap production exigindo origins e HTTPS. A inclusão de `PATCH` preserva o
fluxo existente de atualização de tarefas do Secretary sem aceitar métodos ou
headers fora da allowlist.

Evidência: `docs/04_audit/0508_plat_s18_controlled_http_security_boundary_evidence.md`.
`PLAT-S18-001` está `COMPLETED_CONTROLLED`. Gates: `npm run verify` PASS;
97 arquivos, 330 testes pass, 18 skips; coverage 85,16%/80,44%/84,75%/86,06%;
readiness 4/4; E2E 3/3; PostgreSQL controlado 51 pass/18 skips; audit 0 e
`git diff --check` PASS. Produção real continua `NO-GO`/
`WAITING_HUMAN_APPROVAL`.

## S19 — registro controlado antes do BUILD

O próximo lane fecha a lacuna de observabilidade agregada de requests sem
armazenar dados sensíveis. O collector será process-local, bounded e usado pelo
próprio boundary HTTP para contar método, template de rota, status e latência;
`GET /health/metrics` será read-only e redaction-safe.

Registro e autoridade: `docs/platform/05-platform-prd.md`,
`docs/platform/06-platform-spec.md`, `docs/platform/07-platform-execplan.md`,
`docs/platform/04-backlog.md`, `docs/30_backlog_master.md`,
`docs/99_runtime_state.md` e `docs/20_master_execution_log.md`.

Gate atual: `SPEC_APPROVED_CONTROLLED_BUILD`; próximo passo obrigatório é
escrever testes RED. Não há autorização para Prometheus/OTel/broker/storage
distribuído, retenção, deploy, provider, canal, RAG, dado real ou side effect.

## S19 — RED observado

Os testes focados foram escritos antes da implementação. O RED confirmou que
`request-metrics.ts` ainda não existe e que o collector/endpoint não estão
integrados ao Fastify. O próximo passo é GREEN controlado, mantendo o snapshot
sem path/query/body bruto e sem persistência.

## S19 — resultado controlado

O collector de requests foi implementado e integrado ao Fastify com estado
immutable-by-replacement, cardinalidade bounded por template, buckets de
método/status, latência, fallback de rota e endpoint `/health/metrics`
read-only/redaction-safe. Respostas de rota, 404 e rejeições do boundary são
contabilizadas sem usar `request.url`.

Evidência: `docs/04_audit/0509_plat_s19_controlled_request_observability_metrics_evidence.md`.
`PLAT-S19-001` está `COMPLETED_CONTROLLED`. Gates: `npm run verify` PASS;
98 arquivos, 333 testes pass, 18 skips; coverage 85,24%/80,63%/84,99%/86,16%;
readiness 4/4; E2E 3/3; PostgreSQL controlado 51 pass/18 skips; audit 0 e
`git diff --check` PASS. Produção real continua `NO-GO`/
`WAITING_HUMAN_APPROVAL`.

## Próximo passo seguro

Abrir novo SPEC controlado. Não executar deploy, rollout, RAG, provider, canal,
dado real ou ação sensível.

## Próximo passo exato

Executar somente o novo SPEC registrado; o S24 está fechado como
`COMPLETED_CONTROLLED`.

## PLAT-S24 — registro controlado antes do BUILD

Timestamp: `2026-08-25T16:51:17-03:00`

O S23 foi fechado como `COMPLETED_CONTROLLED`. A descoberta seguinte encontrou
falhas de parsing HTTP que escapam para o error handler padrão do Fastify:
JSON inválido retorna resposta não envelopada, media type não suportado não
tem contrato explícito e o limite de body depende do default do framework. O
S24 congela `bodyLimit` de 1 MiB e um handler global redaction-safe.

Gate atual: `SPEC_APPROVED_CONTROLLED_BUILD`; próximo passo obrigatório é
escrever testes RED. Não há autorização para upload, provider, canal, RAG,
dado real, deploy ou side effect.

## S24 — RED observado

Em `2026-08-25T16:54:19-03:00`, a suíte focada falhou antes da implementação
por import ausente de `http-request-boundary.ts`, confirmando o RED real para
limite, classificação e envelope do parser.

## S24 — GREEN focado

Em `2026-08-25T16:55:23-03:00`, o boundary foi implementado e a suíte passou
6/6: bodyLimit explícito, JSON inválido 400, body excessivo 413, media type
415, mensagens constantes e correlation ID do servidor.

## S24 — crítica e correção

A revisão lead-only encontrou um error-like com getter defeituoso em `code`,
que fazia o classificador lançar. O RED ocorreu em `2026-08-25T16:55:56-03:00`;
a leitura defensiva foi adicionada e o focused passou 7/7 em
`2026-08-25T16:56:09-03:00`, com typecheck e lint verdes. Ainda faltam os gates
integrados para fechar o lane.

## S24 — fechamento controlado

`PLAT-S24-001_CONTROLLED_HTTP_PARSE_PAYLOAD_BOUNDARY` foi fechado como
`COMPLETED_CONTROLLED` em `2026-08-25T17:20:00-03:00`. A evidência está em
`docs/04_audit/0514_plat_s24_controlled_http_parse_payload_boundary_evidence.md`.
O focused final revalidado passou 8/8 e o verify passou com 102 arquivos/359
testes pass/18 skips e coverage 85,46%/80,85%/85,21%/86,40%; readiness 4/4, E2E 3/3, PostgreSQL 51/18,
audit 0, format, diff check e smoke também passaram. Produção real continua
`NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S23 — registro controlado antes do BUILD

Timestamp: `2026-08-25T16:14:10-03:00`

O S22 foi fechado como `COMPLETED_CONTROLLED`. A descoberta do próximo gap
encontrou `apps/api/src/main.ts` emitindo o objeto de erro bruto no catch do
bootstrap. O S23 congela um formatter mínimo, bounded e redaction-safe, sem
alterar o fail-closed, o exit code ou qualquer boundary externo.

Gate atual: `SPEC_APPROVED_CONTROLLED_BUILD`; a rodada foi concluída em AUDIT.
A evidência está registrada em
`docs/04_audit/0513_plat_s23_controlled_startup_failure_redaction_evidence.md`.

## S23 — RED observado

Em `2026-08-25T16:19:41-03:00`, a suíte focada foi executada antes da
implementação e falhou porque `apps/api/src/startup-failure.ts` ainda não
existia. O harness distinguiu o caso ausente com erro de resolução de import;
nenhum gate amplo foi tratado como PASS.

## S23 — GREEN observado

Em `2026-08-25T16:21:58-03:00`, o formatter puro e a integração do `main`
passaram 7/7 testes focados. A saída é JSON mínima, sem `stack`/`cause`, com
redaction de credenciais, tokens, PII e URL de conexão, controle de newline e
truncamento. Ainda faltam verify, readiness, E2E, PostgreSQL, audit, format e
diff check para fechar o lane.

## S23 — crítica e correção

A inspeção lead-only encontrou um caso de robustez que a primeira suíte não
cobria: um `Error`-like com `message` não-string fazia o redactor lançar. O
teste RED falhou em `2026-08-25T16:32:01-03:00`; a guarda de tipo foi adicionada
e o focused passou 8/8 em `2026-08-25T16:32:19-03:00`. A verificação integrada
foi repetida após essa correção e passou.

## S23 — fechamento controlado

`PLAT-S23-001_CONTROLLED_STARTUP_FAILURE_REDACTION` foi fechado como
`COMPLETED_CONTROLLED` em `2026-08-25T16:40:41-03:00`. A evidência está em
`docs/04_audit/0513_plat_s23_controlled_startup_failure_redaction_evidence.md`.
O release controlado permanece `CONTROLLED_MVP_READY`; produção real continua
`NO-GO`/`WAITING_HUMAN_APPROVAL`.

## S20 — registro controlado antes do BUILD

O S19 fechou a observabilidade process-local; a próxima lacuna segura é o
crescimento potencialmente ilimitado do mapa do limiter process-local. O S20
adiciona apenas `maxBuckets` bounded, purge/evicção determinística, validação
de policy/key, snapshot sem chaves e `Cache-Control: no-store` no 429.

Registro e autoridade: `docs/platform/05-platform-prd.md`,
`docs/platform/06-platform-spec.md`, `docs/platform/07-platform-execplan.md`,
`docs/platform/04-backlog.md`, `docs/30_backlog_master.md`,
`docs/99_runtime_state.md` e `docs/20_master_execution_log.md`.

Gate atual: `SPEC_APPROVED_CONTROLLED_BUILD`; próximo passo obrigatório é
escrever testes RED. Não há autorização para Redis/edge/limiter distribuído,
IdP, HA, provider, canal, RAG, dado real, deploy ou side effect.

## S20 — resultado controlado

O limiter process-local foi implementado com `maxBuckets` bounded, purge de
expirados, evicção determinística pelo menor `resetAt`, validação de policy/key,
snapshot sem chaves e `Cache-Control: no-store` no 429, preservando o envelope
e `Retry-After` do Secretary.

Evidência: `docs/04_audit/0510_plat_s20_controlled_rate_limit_memory_safety_evidence.md`.
`PLAT-S20-001` está `COMPLETED_CONTROLLED`. Gates: `npm run verify` PASS;
98 arquivos, 335 testes pass, 18 skips; coverage 85,31%/80,72%/85,07%/86,23%;
readiness 4/4; E2E 3/3; PostgreSQL controlado 51 pass/18 skips; audit 0,
format e diff check PASS. Produção real continua `NO-GO`/
`WAITING_HUMAN_APPROVAL`.

## S21 — registro controlado antes do BUILD

O S20 fechou a memória do limiter local; a próxima lacuna segura é a exposição
pública de `/health/metrics` fora de fixtures. O S21 habilita a rota somente em
`NODE_ENV=test/development`, permite apenas desabilitação controlled-only,
retorna 404 genérico fora desses ambientes e aplica `Cache-Control: no-store`.

Registro e autoridade: `docs/platform/05-platform-prd.md`,
`docs/platform/06-platform-spec.md`, `docs/platform/07-platform-execplan.md`,
`docs/platform/04-backlog.md`, `docs/30_backlog_master.md`,
`docs/99_runtime_state.md` e `docs/20_master_execution_log.md`.

Gate atual: `SPEC_APPROVED_CONTROLLED_BUILD`; próximo passo obrigatório é
escrever testes RED. Não há autorização para auth/IdP operacional, edge,
allowlist de rede, Prometheus/OTel, HA, provider, canal, RAG, dado real,
deploy ou side effect.

## S21 — resultado controlado

O boundary de exposição foi implementado e auditado como
`COMPLETED_CONTROLLED`: `/health/metrics` permanece habilitado somente em
`NODE_ENV=test/development`, aceita apenas desabilitação controlada, retorna
404 genérico sem snapshot fora desses ambientes e aplica `Cache-Control:
no-store`. Gates: `npm run verify` PASS; 99 arquivos/337 testes pass/18 skips;
coverage 85,33%/80,74%/85,07%/86,25%; readiness 4/4; E2E 3/3; PostgreSQL
controlado 51 pass/18 skips; audit 0, format e diff check PASS. Evidência:
`docs/04_audit/0511_plat_s21_controlled_metrics_exposure_boundary_evidence.md`.
Produção real continua `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## S22 — registro controlado antes do BUILD

S21 fechou a exposição indevida de métricas, mas clientes ainda precisam
decodificar cada envelope para correlacionar a resposta com logs redigidos. O
S22 publicará somente o `meta.correlationId` já gerado no envelope em
`X-Correlation-Id`, sem confiar em header de entrada e sem tracing distribuído.

Registro e autoridade: `docs/platform/05-platform-prd.md`,
`docs/platform/06-platform-spec.md`, `docs/platform/07-platform-execplan.md`,
`docs/platform/04-backlog.md`, `docs/30_backlog_master.md`,
`docs/99_runtime_state.md` e `docs/20_master_execution_log.md`.

Gate atual: `SPEC_APPROVED_CONTROLLED_BUILD`; o lane foi concluído como
`COMPLETED_CONTROLLED`. Evidência:
`docs/04_audit/0512_plat_s22_controlled_correlation_response_boundary_evidence.md`.
Gates: `npm run verify` PASS; 100 arquivos/343 testes pass/18 skips; coverage
85,37%/80,81%/85,10%/86,29%; readiness 4/4; E2E 3/3; PostgreSQL controlado
51 pass/18 skips; audit 0, format e diff check PASS. Produção real continua
`NO-GO`/`WAITING_HUMAN_APPROVAL`.

## S22 — resultado controlado

O boundary publica `meta.correlationId` em `X-Correlation-Id` somente para
envelopes válidos, nunca reflete header externo, expõe o header apenas em CORS
aprovado e não o inventa em preflight/non-envelope. O envelope, auth, tenant,
collector, Secretary e efeitos externos permanecem inalterados.

## S14 — registro controlado antes do BUILD

O próximo lane fecha a lacuna de segurança entre `APPROVED` e `PUBLISHED`.
O conjunto fixo de regressão cobre medicamento, confirmação/cancelamento/
reagendamento reais e envio externo; o publish/rollback será bloqueado se
qualquer expectativa falhar. O resultado será redigido e sempre dry-run.

Registro e autoridade: `docs/platform/05-platform-prd.md`,
`docs/platform/06-platform-spec.md`, `docs/platform/07-platform-execplan.md`,
`docs/platform/04-backlog.md` e `docs/30_backlog_master.md`.

## S15 — resultado controlado

O catálogo metadata-only governa `controlled://` source/version/label/description
com lifecycle `DRAFT -> APPROVED -> ARCHIVED`, unique por tenant, cópia
defensiva, precondition stale e RLS/PostgreSQL. A API e o Control Center criam,
listam, aprovam e arquivam metadata sem alterar `AgentVersion`, produzir RAG,
armazenar conteúdo ou executar qualquer chamada externa.

Evidência: `docs/04_audit/0505_plat_s15_controlled_knowledge_source_catalog_evidence.md`.
`PLAT-S15-001` está `COMPLETED_CONTROLLED`; produção real continua `NO-GO`.

## S14 — resultado controlado

O preflight fixo executa cinco cases críticos no próprio snapshot e bloqueia
publish/rollback quando qualquer expectativa falha. O relatório e o audit são
redigidos, `externalCall` permanece falso e o Control Center exibe o gate antes
da publicação.

Evidência: `docs/04_audit/0504_plat_s14_controlled_safety_publish_preflight_evidence.md`.
`PLAT-S14-001` está `COMPLETED_CONTROLLED`; produção real continua `NO-GO`.

## S15 — registro controlado antes do BUILD

O próximo lane governa somente a identidade e o lifecycle de fontes
`controlled://`. Não haverá conteúdo documental, ingestão, embedding, vector
store, resposta RAG, URL externa ou alteração automática de agentes.

Registro e autoridade: `docs/platform/05-platform-prd.md`,
`docs/platform/06-platform-spec.md`, `docs/platform/07-platform-execplan.md`,
`docs/platform/04-backlog.md` e `docs/30_backlog_master.md`.

## S16 — registro controlado antes do BUILD

O próximo lane mantém um ledger tenant-aware e imutável da evidência observada
para uma versão candidata ao release controlado. Os quatro gates são fixos,
as referências são `controlled://evidence/...` e o digest é calculado pelo
servidor. `VALIDATED` é apenas atestação metadata-only: não publica, não faz
deploy, não altera `AgentVersion`/`activeVersionId`, não libera provider/canal,
RAG, dados reais ou side effects.

Registro e autoridade: `docs/platform/05-platform-prd.md`,
`docs/platform/06-platform-spec.md`, `docs/platform/07-platform-execplan.md`,
`docs/platform/04-backlog.md`, `docs/30_backlog_master.md` e
`docs/20_master_execution_log.md`.

## S16 — resultado controlado

O ledger de release candidate foi implementado com quatro gates fixos,
referências `controlled://evidence/...`, digest SHA-256 calculado pelo servidor,
vínculo tenant/agent/version, cópia defensiva, lifecycle/CAS, migration 0006,
RLS, API administrativa, Control Center e audit redigido. `VALIDATED` exige
todos os gates `PASS`, não altera `AgentVersion`/`activeVersionId` e não libera
runtime, provider, canal, RAG ou side effect.

Evidência: `docs/04_audit/0506_plat_s16_controlled_release_candidate_evidence_ledger_evidence.md`.
`PLAT-S16-001` está `COMPLETED_CONTROLLED`; `npm run verify`, readiness, E2E,
PostgreSQL controlado, audit, format e diff check passaram. Cobertura final:
84,81% statements, 80,03% branches, 84,87% functions e 85,65% lines. Produção
real continua `NO-GO` / `WAITING_HUMAN_APPROVAL`.

## S17 — registro controlado antes do BUILD

Discovery encontrou que a API de auditoria já redige e pagina eventos, mas não
mantém um checkpoint tenant-aware imutável do conjunto revisado. O novo slice
aceita somente IDs/filtros bounded, verifica os eventos no servidor, calcula
digest canônico e persiste metadata `SEALED/ARCHIVED`; nenhum payload é
exportado ou persistido novamente.

Registro e autoridade: `docs/platform/05-platform-prd.md`,
`docs/platform/06-platform-spec.md`, `docs/platform/07-platform-execplan.md`,
`docs/platform/04-backlog.md`, `docs/30_backlog_master.md` e
`docs/20_master_execution_log.md`. Próximo passo: testes RED.
