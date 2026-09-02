# ExecPlan — PLAT-S01 control plane foundation

## PLAT-S48 — ordem de implementação e auditoria

### Estado de registro

- stage: `AUDIT`
- status: `COMPLETED_CONTROLLED`
- scope: `PLAT-S48_CONTROLLED_BASELINE_DETERMINISM`
- owner: `platform/security/test-infrastructure`
- write sets: gateway, teste de approval, teste web e evidência S48
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`

### Sequência

1. Registrar discovery, PRD, SPEC, backlog e task catalog.
2. Executar RED focado dos dois defeitos observados.
3. Ajustar os testes para explicitar clock compartilhado e timeline escopada.
4. Implementar `now?: () => Date` no gateway, mantendo default real e
   autoridade durável.
5. Executar focused GREEN, regressão completa e todos os gates controlados.
6. Auditar diff, cobertura, segurança e fronteira de produção; registrar
   evidência e atualizar o estado canônico.

### Limites

Somente determinismo do approval gateway e semântica da asserção web. Sem
schema/contrato HTTP/API externa ou policy change; a opção TypeScript `now` é
uma seam interna não configurável por input externo. Sem provider/canal real,
RAG, rede, deploy, dado real, segredo ou side effect.

### Fechamento controlado S48 — 2026-09-02T07:32:00-03:00

RED/GREEN e todos os gates controlados passaram. Regressão 127 arquivos/537
testes pass, 2 arquivos/19 skipped; coverage 84.87/80.12/84.98/85.98;
PostgreSQL 8/72; E2E 4/4; readiness 4/4; worker smoke; build 158 módulos;
audit 0; typecheck/lint/format/diff PASS. A revisão independente read-only
retornou `PASS_CONTROLLED`, sem P0/P1/P2/P3; o gap documental foi fechado com
a evidência S48. Próxima ação segura: nova `DISCOVERY -> PRD -> SPEC`
controlada.

## PLAT-S47 — ordem de implementação e auditoria

### Estado de registro

- stage: `BUILD`
- status: `READY_FOR_NEXT_STEP`
- scope: `PLAT-S47-001_CONTROLLED_MULTI_AGENT_CREATION_MODE`
- owner: `platform/control-center`
- write sets: `apps/web/src/features/platform/index.tsx`, testes do
  Control Center, `tests/e2e/platform-control-center.spec.ts`, page object E2E
  e evidência S47
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`

### Sequência

1. Registrar a lacuna de modo de criação e congelar a barra de aceite.
2. RED: reproduzir que, após criar/selecionar o primeiro agente, não há caminho
   de UI para voltar ao editor de novo agente.
3. GREEN: adicionar comando explícito de novo agente e reset bounded do estado
   derivado, mantendo o clone versionado para agente existente.
4. Endurecer re-seleção e respostas assíncronas tardias para impedir
   cross-agent state bleed.
5. Provar A/B no mesmo tenant/sessão pela UI/API e browser E2E; verificar
   ausência de chamadas externas.
6. Executar focused, regressão, coverage, typecheck, lint, readiness, worker
   smoke, E2E, PostgreSQL, audit, build, format e diff check; obter crítica
   independente read-only quando o runtime permitir.

### Limites do PLAT-S47

Somente modo de criação e isolamento de estado do Control Center controlado.
Sem provider/canal real, RAG, broker, rede, deploy, dado real, segredo ou
side effect.

### Auditoria corretiva e gates — PLAT-S47

O ciclo adicional executou RED para histórico sem agente, `agentId` ausente,
reutilização A→B→A, redaction recursiva e `spans` com shape inválido; todos os
casos passaram após a correção. A regressão fechou em 127 arquivos/534 testes
PASS, 2 arquivos/19 skipped; coverage 84,86/80,12/84,97/85,97; build 158
módulos; E2E 4/4; PostgreSQL 8/72; readiness 4/4; worker smoke; audit 0;
typecheck, lint, format e diff check PASS. A revisão independente compatível
retornou `PASS_CONTROLLED`, sem P0/P1/P2/P3, e é o fechamento desta rodada.
Produção continua `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S46 — ordem de implementação e auditoria

### Estado de registro

- stage: `AUDIT`
- status: `COMPLETED_CONTROLLED`
- scope: `PLAT-S46-001_CONTROLLED_EXECUTION_TRACE_CORRELATION_BOUNDARY`
- owner: platform/observability/agent-core
- write sets: `packages/platform/src/test-lab.ts`, `packages/platform/src/event-bus.ts`,
  `packages/platform/src/plugin-gateway.ts`, `packages/platform/src/trace-governance.ts`,
  `packages/agent-core/src/commands/execute-published-agent.ts`, contratos,
  testes focados e evidência S46
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`

### Fechamento controlado — 2026-08-26T11:22:54-03:00

RED: 4 arquivos/33 testes, 8 falhas esperadas e 25 pass. GREEN de fechamento:
6 arquivos/25 testes pass. A regressão passou 126 arquivos/523 testes, com 2
arquivos/19 testes skipped; coverage 85,07/80,06/85,95/86,10; PostgreSQL 8/72;
readiness 4/4; worker smoke; E2E 4/4; build 70 módulos; audit 0; typecheck,
lint, format e diff check PASS. Revisão independente compatível read-only:
`PASS` sem P0/P1/P2. Produção real permanece `NO-GO`.

### Sequência

1. Registrar S46 em toda a rastreabilidade sem alterar o significado das
   correlações HTTP/evento existentes.
2. RED: demonstrar IDs independentes em eventos/tools e rejeição ausente de
   `traceId` injetado malformado.
3. GREEN: criar/validar o trace ID no início do kernel e propagá-lo de forma
   immutable para eventos, hooks, gateway e auditorias.
4. Aplicar a validação nos sinks/clone/read path sem migration estrutural e
   manter compatibilidade com fixtures legadas fora do trace persistido.
5. Executar focused, regressão, coverage, typecheck, lint, readiness, worker
   smoke, E2E, PostgreSQL, audit, build, format e diff check; obter crítica
   independente read-only quando o runtime permitir.

### Limites do PLAT-S46

Somente correlação parental local de uma execução controlada. Não adicionar
OTel/exporter, broker, rede, provider/canal real, RAG, deploy, dado real,
segredo, ação sensível ou side effect.

## PLAT-S45 — ordem de implementação e auditoria

### Estado inicial e fechamento

- stage: `AUDIT`
- status: `COMPLETED_CONTROLLED`
- scope: `PLAT-S45-001_CONTROLLED_TOOL_INVOCATION_BOUNDARY`
- owner: platform/security/plugin-runtime
- write sets: `packages/platform/src/plugin-gateway.ts`, validators dos
  plugins compilados, testes de gateway/approval/adapter e evidência
  `docs/04_audit/0535_plat-s45_controlled_tool_invocation_boundary_evidence.md`
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`

### Sequência

1. Registrar S45 em toda a rastreabilidade e congelar a fronteira sem
   importação dinâmica ou tool real.
2. RED: reproduzir input `unknown` aceito, actor inválido não controlado e
   resultado bruto do handler retornado.
3. GREEN: exigir validators server-side de input/output por tool, autorizar o
   actor por callback confiável, validar input antes de approval/handler e
   projetar resultados bounded/redigidos.
4. Corrigir a revisão: remover verificador booleano legado, limitar config,
   tratar falha de auditoria sem replay e cobrir entradas Proxy/cíclicas.
5. Executar focused, regressão, cobertura, typecheck, lint, readiness, worker
   smoke, E2E, PostgreSQL, audit, build, format e diff check.

### Resultado controlado

Focused 6/41; regressão 125 arquivos/512 testes pass, 2/19 skipped; coverage
85,01/80,14/85,82/86,03; PostgreSQL controlado 6/53, 2/19 skipped; E2E 4/4;
readiness 4/4; worker smoke; build 70 módulos; audit 0; typecheck, lint,
format e diff check PASS. A revisão independente compatível read-only retornou
`PASS sem P0/P1`. Produção real permanece bloqueada.

### Limites do PLAT-S45

Somente boundary local de invocação de tools compiladas. Sem import dinâmico,
marketplace, provider/canal real, rede, RAG, broker, outbox, egress, deploy,
dado real ou side effect.

## PLAT-S44 — ordem de implementação

### Estado inicial

- stage: `AUDIT`
- status: `COMPLETED_CONTROLLED`
- scope: `PLAT-S44-001_CONTROLLED_TRACE_STAGE_TIMING`
- owner: platform/observability/agent-core
- write sets: `packages/platform/src/test-lab.ts`,
  `packages/platform/src/__tests__/test-lab-events.test.ts`, testes de trace e
  evidência `docs/04_audit/0534_plat-s44_controlled_trace_stage_timing_evidence.md`
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`

### Sequência

1. Registrar S44 em todos os artefatos e congelar o limite sem exporter.
2. RED: provar spans zero e ausência de clock/ledger injetável.
3. GREEN: adicionar clock monotônico injetável, ledger bounded e integrar as
   etapas sem carregar payload ou alterar policy/efeitos.
4. Executar focused, regressão, cobertura, typecheck, lint, readiness, worker
   smoke, E2E, PostgreSQL, audit, build, format e diff check.

### Limites do PLAT-S44

Somente instrumentação local de spans controlados. Não criar OTel/exporter,
broker, rede, provider/canal real, RAG, deploy, dado real ou side effect.

### Fechamento controlado S44

Focused 2/17; regressão 124/501 com 2/19 skipped; coverage
85,18/80,44/85,70/86,16; PostgreSQL 8/72; E2E 4/4; readiness 4/4; build 70
módulos; audit 0; typecheck, lint, format e diff check PASS. Evidência:
`docs/04_audit/0534_plat-s44_controlled_trace_stage_timing_evidence.md`.
O lane não autoriza produção real.

## PLAT-S43 — ordem de implementação

### Estado inicial

- stage: `AUDIT`
- status: `COMPLETED_CONTROLLED`
- scope: `PLAT-S43-001_CONTROLLED_TRACE_TEMPORAL_INTEGRITY`
- owner: platform/observability/security
- write sets: `packages/platform/src/trace-governance.ts`, testes de trace e
  evidência `docs/04_audit/0533_plat-s43_controlled_trace_temporal_integrity_evidence.md`
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`

### Sequência

1. Registrar S43 em todos os artefatos de rastreabilidade e congelar o limite
   sem exporter/egress.
2. RED: provar timestamps incompatíveis, latência incoerente, spans fora de
   ordem, duração acumulada excessiva e status derivado divergente.
3. GREEN: implementar invariantes no parser compartilhado, preservando traces
   sem telemetria opcional e sem alterar provider/canal.
4. Executar focused, regressão, cobertura, typecheck, lint, readiness, worker
   smoke, E2E, PostgreSQL, audit, build, format e diff check.

### Limites do PLAT-S43

Somente integridade temporal/ordinal do trace controlado. Não criar OTel,
exporter, broker, rede, provider/canal real, RAG, deploy, dado real ou side
effect.

### Fechamento controlado S43

Focused 1/14; regressão 124/499 com 2/19 skipped; coverage
85,08/80,41/85,45/86,08; PostgreSQL 8/72; E2E 4/4; readiness 4/4; build 70
módulos; audit 0; typecheck, lint, format e diff check PASS. Evidência:
`docs/04_audit/0533_plat-s43_controlled_trace_temporal_integrity_evidence.md`.
O lane não autoriza produção real.

## PLAT-S42 — ordem de implementação

### Estado inicial

- stage: `AUDIT`
- status: `COMPLETED_CONTROLLED`
- scope: `PLAT-S42-001_CONTROLLED_TRACE_PROVENANCE_BOUNDARY`
- owner: platform/persistence/security
- write sets: `packages/platform/src/trace-governance.ts`, contratos e
  exports necessários, sinks InMemory/PostgreSQL, mapper de suite e testes
  focados/integrados; evidência
  `docs/04_audit/0532_plat_s42_controlled_trace_provenance_boundary_evidence.md`
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`

### Sequência

1. Registrar S42 em backlog, PRD, SPEC, ExecPlan, runtime state, execution log,
   tracking, task catalog e gauntlet; congelar o limite sem egress.
2. RED: reproduzir com fixtures campo extra/provider adulterado em sink direto e
   trace aninhado de suite sem a mesma sanitização; verificar o que chega ao
   armazenamento/retorno atual.
3. GREEN mínimo: implementar parser/projeção allowlist, validação bounded de
   IDs/estruturas/datas/números e provider `fake/deterministic-v1` com
   `externalCall: false`, preservando redaction/output policy.
4. Integrar a função nos sinks InMemory/PostgreSQL, nos traces de suite, nos
   mappers/listagens e antes dos efeitos da conclusão transacional; garantir
   que corrupção de leitura falhe fechado e que dados extras não sobrevivam.
5. Executar focused, regressão, typecheck, lint, coverage, readiness, worker
   smoke, E2E, PostgreSQL, audit, build, format e diff check; revisar segurança
   e registrar a evidência sem declarar produção pronta.

### Limites do PLAT-S42

Somente contrato/proveniência de trace controlado. Não alterar provider/canal
real, RAG, secret manager, broker, outbox, egress, deploy, migração
estrutural, dados reais ou side effect.

### RED observado S42

Focused de 3 arquivos/16 testes apresentou 9 falhas esperadas nos casos de
campo extra/provider inválido, suite e leitura PostgreSQL.

### GREEN focado S42

Focused de 6 arquivos/76 testes passou após a projeção canônica e a aplicação
uniforme nos sinks. Typecheck e lint passaram; os demais gates foram concluídos
no fechamento controlado.

### Fechamento controlado S42

Todos os gates do passo 5 passaram no ambiente controlado. O focused final
passou 6 arquivos/76 testes; a regressão passou 124/492 com 2/19 skipped;
coverage foi 84,99/80,24/85,41/86,00; PostgreSQL 8/72; E2E 4/4; readiness
4/4; build 70 módulos; audit 0 vulnerabilidades; typecheck, lint, format e
diff check passaram. Evidência:
`docs/04_audit/0532_plat_s42_controlled_trace_provenance_boundary_evidence.md`.
Status: `COMPLETED_CONTROLLED`; produção real permanece `NO-GO`.

## PLAT-S41 — ordem de implementação

### Estado inicial

- stage: `AUDIT`
- status: `COMPLETED_CONTROLLED`
- scope: `PLAT-S41-001_CONTROLLED_OUTPUT_SAFETY_BOUNDARY`
- owner: platform/agent-core/security
- write sets: `packages/platform/src/output-policy.ts`,
  `packages/platform/src/test-lab.ts`, `packages/platform/src/index.ts`,
  `packages/platform/src/event-bus.ts`,
  `packages/agent-core/src/commands/execute-published-agent.ts`, clones de
  trace, client/UI e testes focados de output/runtime,
  `docs/04_audit/0531_plat_s41_controlled_output_safety_boundary_evidence.md`
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`

### Sequência

1. Registrar S41 em backlog, PRD, SPEC, ExecPlan, runtime state, execution log,
   tracking, task catalog e gauntlet; congelar o limite sem egress.
2. RED: usar somente fixture `controlled://` para demonstrar output inseguro
   chegando à completion/trace sem uma output policy.
3. GREEN mínimo: criar policy pura com tipo/tamanho/redaction, normalização
   Unicode/confusáveis, padrões de conteúdo inseguro, fallback seguro e
   decisão bounded.
4. Integrar depois de `model.after` e antes de `response.after`, ajustando
   handoff/mode/trace, bloqueando tools/approval após rewrite e adicionando
   eventos sem texto bruto; encaminhar event bus no runtime publicado.
5. Executar focused, regressão, typecheck, lint, coverage, readiness, worker
   smoke, E2E, PostgreSQL, audit, build, format e diff check; revisar segurança
   e registrar a evidência sem declarar produção pronta.

### Fechamento controlado PLAT-S41

O focused final passou 7 arquivos/76 testes e todos os gates previstos
passaram: regressão 123/483 com 2 arquivos e 19 testes skipped, coverage
85,08/80,29/85,39/86,12, readiness 4/4, worker smoke, PostgreSQL 8/72,
E2E 4/4, build 70 módulos, typecheck, lint, format, audit 0 e diff check.
Também foi fechado o caminho transacional que valida o trace antes de
outbound/handoff/auditoria. Evidência:
`docs/04_audit/0531_plat_s41_controlled_output_safety_boundary_evidence.md`.
Produção real continua `NO-GO`/`WAITING_HUMAN_APPROVAL`.

### Limites do PLAT-S41

Somente output policy local do runtime controlado. Não alterar provider/canal
real, RAG, secret manager, retries/fallback operacional, broker, outbox,
egress, deploy, persistência estrutural, dados reais ou side effect.

## Estado

- stage: AUDIT
- status: `COMPLETED_CONTROLLED`
- scope: `PLAT-S40-001_CONTROLLED_MODEL_PROVIDER_IDENTITY_BOUNDARY`
- next controlled scope: nova discovery/SPEC controlada; nenhum deploy ou efeito externo
- owner: main runtime/platform
- write sets: `packages/platform/src/model-provider.ts`,
  `packages/platform/src/test-lab.ts`, testes de provider/runtime/worker e
  `docs/04_audit/0530_plat_s40_controlled_model_provider_identity_evidence.md`

## PLAT-S40 — ordem de implementação

### Estado

- stage: `AUDIT`
- status: `COMPLETED_CONTROLLED`
- scope: `PLAT-S40-001_CONTROLLED_MODEL_PROVIDER_IDENTITY_BOUNDARY`
- owner: platform/agent-core/security
- write sets: `packages/platform/src/model-provider.ts`,
  `packages/platform/src/test-lab.ts`, testes de provider/runtime/worker e
  documentação de evidência
- next: nova discovery/SPEC controlada; produção permanece `NO-GO`

### Sequência

1. Registrar S40 no backlog, PRD, SPEC, runtime state, execution log, tracking,
   task catalog e gauntlet; congelar a identidade `fake/deterministic-v1` e o
   limite sem provider externo.
2. RED: provar que provider/model desconhecido pode passar pela resolução atual
   e que `fallbackProvider` é ignorado, sem chamar rede, canal ou side effect.
3. GREEN mínimo: tornar o registry compilado capaz de resolver somente a
   identidade controlada, rejeitar duplicidade/identidade não suportada e
   rejeitar fallback configurado.
4. Integrar a resolução no `executeConfiguredAgent` antes dos eventos e manter
   a mesma regra para Test Lab, API, runtime publicado e worker.
5. Executar focused, regressão, typecheck, lint, coverage, readiness, worker
   smoke, E2E, PostgreSQL, audit, build, format e diff check; revisar segurança
   e registrar a evidência sem declarar provider real ou produção pronta.

### Limites do PLAT-S40

Somente registry/resolução local do provider determinístico. Não alterar
secret manager, retries/fallback operacional, provider/canal, RAG, broker,
outbox, egress, deploy, dados reais, migração estrutural ou side effect.

### RED observado S40

O focused passou a reproduzir 4 falhas esperadas: o provider/model não
registrado foi aceito, o fallback foi ignorado e o executor emitiu eventos e
retornou a identidade externa fictícia. Nenhuma integração externa ocorreu.
Próximo passo: GREEN mínimo no registry/resolver e chamada pré-pipeline.

### GREEN focado S40

O registry compilado e a resolução exata foram conectados a
`executeConfiguredAgent`; `fake/deterministic-v1` continua sem chamada externa,
e identidades não suportadas/fallback falham antes dos eventos. Focused final
passou 4 arquivos/19 testes. A regressão e os gates integrados foram concluídos.

### Auditoria final S40

`PLAT-S40-001 = COMPLETED_CONTROLLED`. Regressão completa: 121 arquivos/446
testes PASS/19 skips; coverage 85,08/80,11/85,17/86,07; readiness 4/4;
PostgreSQL 8/72; E2E 4/4; worker smoke; build, typecheck, lint, format,
`npm audit` 0 e diff check PASS. Revisão independente follow-up:
`PASS sem achados estáticos`. Evidência:
`docs/04_audit/0530_plat_s40_controlled_model_provider_identity_evidence.md`.

## PLAT-S39 — ordem de implementação

1. Registrar S39 em backlog, PRD, SPEC, runtime state, execution log, tracking,
   task catalog e gauntlet; congelar o limite controlado.
2. RED: adulterar o digest de candidate íntegro e confirmar que a transição
   atual aceita o estado `VALIDATED` em memória e PostgreSQL.
3. Extrair/reutilizar asserção de integridade de gates + digest, exigir
   validador diferente do criador e fazer o mapper PostgreSQL rejeitar gates
   corrompidos antes da mutação nos dois adapters.
4. GREEN focused, regressão próxima, typecheck, lint, coverage, readiness,
   smoke, E2E, PostgreSQL, audit, build, format e diff check; fechar com
   evidência e revisão independente.

### Limites do PLAT-S39

Somente integridade do ledger e do lifecycle controlado. Não altera autoridade
de produção, não dispara publish, provider/canal, RAG, broker, outbox, egress,
deploy, dados reais ou side effect.

### RED PLAT-S39

O focused executou 2 arquivos/6 testes: 4 PASS e 2 FAIL esperados. Digest
adulterado foi aceito na transição em memória e PostgreSQL, reproduzindo o gap
antes do GREEN. Próximo passo: asserção compartilhada mínima e reteste.

### GREEN focado PLAT-S39

A asserção compartilhada foi implementada e chamada antes da mutação nos dois
adapters; a autoridade de publish reutiliza a mesma verificação. O focused
passou 2 arquivos/6 testes, além de typecheck e lint. Próximo passo: regressão
completa e gates operacionais.

### Correção após crítica independente PLAT-S39

A crítica independente encontrou risco alto de autoatestação pelo criador e
risco médio de o mapper PostgreSQL mascarar `gate_results` corrompido. Ambos
foram corrigidos com validator independente, parser shared fail-closed e
testes separados; focused final passou 7 arquivos/23 testes.

### Auditoria final S39

O helper compartilhado também é chamado pela autoridade de publish/rollback e a
migration `0009` impede autoatestação persistida. A revisão independente final
retornou `PASS sem achados`. Gates: npm test 120/438/19 skips; coverage
85,08/80,16/85,18/86,08; readiness 4/4; worker smoke; PostgreSQL 8/72; E2E
4/4; build, typecheck, lint, format, audit 0 e diff check PASS. A lane foi
fechada em `AUDIT` sem alterar os bloqueios de produção real.

## PLAT-S38 — ordem de implementação

1. Registrar a paridade no backlog, PRD, SPEC, runtime state, execution log,
   tracking, task catalog e gauntlet.
2. RED: enviar job válido com `approvedKnowledge` e confirmar rejeição/drift
   antes do GREEN; manter casos inválidos fail-closed.
3. Reutilizar o schema compartilhado no job e encaminhar somente o payload
   parseado para o executor publicado.
4. GREEN focado, regressão worker/agent-core, typecheck, lint, coverage,
   verify-equivalent, readiness, smoke, E2E, PostgreSQL, audit, build, format e
   diff check; fechar com evidência.

### Fechamento controlado PLAT-S38

O worker agora transporta `approvedKnowledge` pelo contrato compartilhado,
mantém history bounded em 50 e não altera o boundary de runtime pinned. Todos
os gates disponíveis passaram; a próxima ação segura é nova discovery/SPEC.

### Limites do PLAT-S38

Somente transporte do fixture `controlled://`. Não inclui broker, retry/lease,
provider/canal, RAG, dados reais, deploy, egress, outbox ou side effect.

## PLAT-S37 — ordem de implementação

1. Registrar S37 em backlog, PRD, SPEC, runtime state, execution log, task
   catalog, tracking e gauntlet; congelar o limite sem efeitos externos.
2. RED: demonstrar que o comportamento atual publica/rollbacka sem candidato
   e não rejeita candidato não validado, adulterado ou fora do binding.
3. Adicionar a validação compartilhada de autoridade no store InMemory e no
   repositório PostgreSQL; tornar `releaseCandidateId` obrigatório no contrato.
4. Integrar API, preflight, auditoria, UI e bootstrap/test fixtures para criar
   e validar o candidato antes da publicação; manter rollback derivado e
   controlado.
5. GREEN focado, regressão próxima, verify-equivalent, readiness, smoke, E2E,
   PostgreSQL, audit, typecheck, lint, build, format e diff check; auditoria
   estática e fechamento documental.

### Fechamento controlado PLAT-S37

Todos os gates disponíveis passaram no ambiente controlado. A implementação
repete a autoridade do candidato na API, store InMemory e transação PostgreSQL;
rollback deriva snapshot da fonte sem reutilizar a evidência para outra versão.
O próximo passo é uma nova discovery/SPEC. Produção real continua bloqueada.

### Limites do PLAT-S37

Somente autoridade de evidência em versões e fixtures controlados. O ledger
não libera produção, canal/provider, RAG, dados reais, deploy, egress, broker,
outbox ou side effect.

## PLAT-S36 — ordem de implementação

1. Registrar S36 em backlog, PRD, SPEC, runtime state, execution log, task
   catalog, tracking e gauntlet; manter o limite `controlled://` explícito.
2. RED: testar chamada direta ao runtime com source externa, resposta acima do
   limite e campo extra; confirmar que a validação parcial não bloqueia antes
   do GREEN.
3. Extrair `ApprovedKnowledgeForTestSchema` compartilhado para o contrato
   platform e fazer o runtime validar antes de qualquer resolução/modelo.
4. Substituir os schemas duplicados da API pelo contrato compartilhado,
   preservando envelope, auth, tenant e binding source/version.
5. GREEN focado, regressão platform/API/runtime e gates completos; auditar que
   nenhum conteúdo externo, RAG, provider ou side effect foi adicionado.

### Limites do PLAT-S36

Somente validação de payload fixture metadata/source-gated. Nenhuma rota busca,
ingere, armazena ou responde conteúdo documental externo.

### RED PLAT-S36

O focused `npx vitest run packages/platform/src/__tests__/knowledge-input-boundary.test.ts apps/api/src/__tests__/knowledge-input-boundary.test.ts`
passou 2/4 e falhou 2/4: a função de runtime aceitou payload oversized/extra e a
API aceitou source `controlled://` acima de 200 caracteres. Os casos válidos
continuaram passando; não houve chamada externa.

### GREEN focado PLAT-S36

O schema `ApprovedKnowledgeForTestSchema` agora é compartilhado por contrato,
runtime e as duas rotas API. O runtime retorna `validation_failed` antes da
pipeline para payload inválido e usa o payload parseado/trimado para a
resolução source/version. O focused passou 2 arquivos/4 testes; typecheck e
lint passaram.

### Encerramento AUDIT PLAT-S36

O caso negativo adicional da capability approval passou e confirmou que o
payload inválido falha antes de consumir a approval. O verify final passou
117/422/19 skips com coverage 85,05/80,31/85,11/86,07; readiness 4/4, worker
smoke, E2E 4/4, PostgreSQL 8/71, audit 0, format, build, lint e diff check
passaram. A crítica independente não encontrou CRITICAL/HIGH; tracking JSON,
backlog mestre e cobertura de API foram alinhados. Evidência:
`docs/04_audit/0526_plat_s36_controlled_knowledge_input_boundary_evidence.md`.
O próximo passo é uma nova discovery/SPEC sob as mesmas restrições; produção
real permanece `NO-GO` / `WAITING_HUMAN_APPROVAL`.

## PLAT-S35 — ordem de implementação

1. Registrar backlog, PRD, SPEC, runtime state, execution log e task catalog;
   congelar o catálogo metadata-only e os handlers compilados controlados.
2. RED executado: planner sem literal, versão exata, plugin ausente,
   tool/handler ausente, duplicidade/colisão e approval genérico.
3. Adicionar intents bounded e resolver/planner imutável no registry; fazer o
   gateway rejeitar versão ausente e ambiguidade sem alterar policy/audit.
4. Integrar Test Lab e API para usar a resolução server-side e derivar a
   permissão registrada; preservar actor/tenant/approval vindos do boundary
   confiável.
5. Atualizar somente bindings controlados para versão `1.0.0`; metadata custom
   continua salva sem ganhar execução implícita.
6. GREEN focado e regressão próxima passaram; rodar verify, readiness, E2E, PostgreSQL,
   audit, typecheck, lint, build, format e diff check; crítica independente e
   correção do maior gap antes do fechamento.

### Limites do PLAT-S35

Somente registry compilado e handlers fixture dry-run. Não inclui catálogo como
loader, import dinâmico, marketplace, provider/canal, egress, outbox, broker,
dados reais, deploy ou side effect.

### RED PLAT-S35

O focused de `controlled-tool-registry.test.ts` passou 1/4 e falhou 3/4 em
`2026-08-26T00:00:58-03:00`; a causa é a ausência deliberada do contrato
`intents`, da resolução exata/ambígua e do planner por registry. O caso
catalog-only já permaneceu bloqueado.

### GREEN PLAT-S35

O GREEN implementou `PluginTool.intents`, planner imutável por registry,
resolução exacta/ambígua/deduplicada, Test Lab sem literal e approval/API com
permissão derivada no servidor. A regressão próxima passou 10 arquivos/49
testes; typecheck passou. O próximo gate é a verificação integrada.

### Correção após crítica independente

A crítica read-only foi `NEEDS_CORRECTION` sem CRITICAL/HIGH: apontou alias
`latest` aceito, `get(name)` latest implícito e construtor sem validação. S35
agora rejeita alias, exige versão em `get`, expõe `getLatest` explicitamente e
valida plugins pré-carregados. Focused 3 arquivos/28 testes, typecheck e lint
passaram; verify integrado será repetido.

### Fechamento PLAT-S35

`PLAT-S35-001` foi fechado como `COMPLETED_CONTROLLED` após a sincronização
da evidência final. Verify passou 115 arquivos/417 testes/19 skips, coverage
84,99/80,30/85,11/86,01; readiness, smoke, E2E 4/4, PostgreSQL 8/71, audit,
format, lint, build e diff check passaram. Evidência:
`docs/04_audit/0525_plat_s35_controlled_tool_registry_identity_evidence.md`.
Produção real continua `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S32 — ordem de implementação

1. Registrar no backlog, runtime state, execution log, task catalog, PRD e SPEC;
   reproduzir RED para uma continuação que troca de versão após publish.
2. Adicionar testes de contrato para `SessionRecord`, binding imutável em
   memória e seleção de versão pinned no `executePublishedAgent`.
3. Adicionar migration `0008`, checksum/preflight, campos e constraints de
   sessão; implementar binding atômico nos repositories e no wrapper tenant
   scoped sem quebrar o modo legado `0000_initial`.
4. Integrar o API para usar binding existente ou resolver/publicar/bindar uma
   única vez; não aceitar fallback quando o binding está inválido ou em corrida.
5. Cobrir publish v1→v2, archived snapshot, cross-tenant/RLS, retry inbound,
   takeover e ausência de provider/tool; adicionar E2E do versionId observado.
6. Rodar a crítica lead-only, corrigir o maior gap, executar verify,
   readiness, E2E, PostgreSQL, audit, format, diff check e atualizar evidência.

### Fechamento PLAT-S32

`PLAT-S32-001` foi fechado como `COMPLETED_CONTROLLED`. O RED/GREEN, a
regressão completa, PostgreSQL 16 fixture, Playwright browser/API, readiness,
coverage, lint, build, audit e diff check estão registrados em
`docs/04_audit/0522_plat_s32_controlled_session_version_pinning_evidence.md`.
O próximo lane ainda deve respeitar o boundary `CONTROLLED_MVP_READY`; produção
real continua `NO-GO`.

## PLAT-S33 — ordem de implementação

1. Registrar o shape bounded do job e o contrato fail-closed do entrypoint.
2. Escrever RED para rejeitar o contrato legado e exigir tenant/agent/version.
3. Delegar o job válido ao `executePublishedAgent` com `versionId` explícito.
4. Remover o bootstrap hardcoded de `main.ts` sem inventar queue adapter.
5. Rodar regressão S32, suíte completa, coverage, readiness, E2E, PostgreSQL,
   audit, lint, build, format e diff check.
6. Fechar o lane com evidência e atualizar o próximo gap; produção permanece
   `NO-GO`.

### Fechamento PLAT-S33

`PLAT-S33-001` foi fechado como `COMPLETED_CONTROLLED`. O RED/GREEN, a
correção da boundary de dependências, a regressão completa, PostgreSQL 16
fixture, Playwright, readiness, coverage, typecheck, lint, build, audit,
format e diff check estão registrados em
`docs/04_audit/0523_plat_s33_controlled_worker_runtime_boundary_evidence.md`.
O próximo lane deve permanecer em `CONTROLLED_MVP_READY`; produção real
continua `NO-GO`.

## PLAT-S34 — ordem de implementação

1. Registrar backlog, PRD, SPEC, runtime state, execution log e task catalog;
   congelar o limite de container sem artefato.
2. Escrever RED para contrato do workflow e script de startup smoke ausente.
3. Implementar smoke processual bounded e atualizar scripts/workflow com gates
   explícitos, permissões mínimas, concurrency e `npm ci --ignore-scripts`.
4. Rodar focused, regressão S33, verify, coverage, readiness, PostgreSQL, E2E,
   audit, typecheck, lint, build, format e diff check.
5. Registrar evidência; production hardening/container scan continuam fora do
   lane até existir artefato e decisão operacional aprovados.

### Fechamento PLAT-S34

`PLAT-S34-001` foi fechado como `COMPLETED_CONTROLLED`. O RED/GREEN focado,
o gate adicional de `git diff --check`, a regressão completa, PostgreSQL 16
efêmero, Playwright, readiness, typecheck, lint, build, format e audit estão
registrados em
`docs/04_audit/0524_plat_s34_controlled_ci_gate_parity_evidence.md`.
O workflow não declara container scan sem artefato; produção real continua
`NO-GO`/`WAITING_HUMAN_APPROVAL`.

### Limites do PLAT-S32

Somente pinning controlado de sessões e snapshots já existentes. Não inclui
provider, canal, RAG, dados reais, IdP, RBAC real, rollout, worker distribuído,
deploy ou side effect.

## Ordem de execução

1. Escrever testes vermelhos para resolver alias local e contratos de tenant/version.
2. Corrigir harness sem alterar comportamento do data plane.
3. Implementar schemas, store e máquina de versionamento.
4. Implementar composer, policy evaluator e gateway fake.
5. Implementar runtime dry-run/trace.
6. Integrar exports/tsconfig/package workspace.
7. Rodar testes focados, suíte completa, coverage, typecheck, lint, format, audit, readiness e E2E.
8. Fazer revisão independente de diff/segurança e corrigir os maiores gaps.
9. Atualizar runtime state, execution log, backlog e evidências.

## PLAT-S02 — ordem de hardening

1. Registrar testes vermelhos para clone/edit, approval, trace ownership e publish lock.
2. Implementar a rota de clone como operação de aplicação que só cria versão nova.
3. Tornar resposta de approval fail-closed e validar referências de trace no memory/PostgreSQL.
4. Serializar publish no PostgreSQL com lock transacional do agent.
5. Expor os campos completos e redigidos no Trace Viewer e cobrir o fluxo browser.
6. Rodar a suíte focada, suíte completa, coverage, typecheck, lint, format, audit, readiness, E2E e smoke PostgreSQL.

## Resultado da rodada controlada

O slice foi ampliado com provider dry-run, feature flags fail-closed por configuração de UI, Test Lab eval/regression, rollback consumível no Control Center, auditoria de mutações, tenant binding de identidade confiável, rate limiting, headers defensivos, build web e E2E de navegador. O audit de segurança permanece conservador: o resultado não é autorização de produção real.

O fechamento controlado acrescenta runtime publicado após inbound, histórico persistido de traces redigidos, Trace Viewer, scheduling determinístico pelo gateway, continuidade tenant-scoped e takeover humano transacional em memória/PostgreSQL. O bot permanece silencioso durante `HANDOFF_REQUESTED`, `HUMAN_ACTIVE` e `RESOLVED`, e só volta após `release_to_bot`.

## Stop conditions

Parar e registrar `WAITING_HUMAN_APPROVAL` se a implementação exigir segredo, dado real, chamada externa, alteração destrutiva, mudança de regra clínica/financeira ou decisão de RBAC/tenant real. Falha técnica é corrigida ou registrada como blocker reproduzível; nunca é mascarada.

## Resultado PLAT-S02

`PLAT-HARDENING-001..004` foram concluídos como `COMPLETED_CONTROLLED`: clone/edit versionado pela UI, approval fail-closed, ownership de trace, publicação PostgreSQL serializada e Trace Viewer redigido foram implementados e verificados. O resultado continua limitado a fixtures controladas; os bloqueios de produção real permanecem ativos.

## Evidência de conclusão

O task só pode virar `COMPLETED` com:

- arquivos alterados listados;
- testes RED/GREEN observados para o primeiro caso;
- resultado dos gates e ambiente usado;
- auditoria dos limites de produção;
- referência ao trace/run de Test Lab fictício;
- atualização dos documentos canônicos.

## PLAT-S03 — ordem de implementação

1. Registrar o task e escrever testes RED para migration versionada, políticas RLS e pool tenant-scoped.
2. Implementar o runner sequencial sem alterar o comportamento da `0000_initial`.
3. Implementar policy SQL aditiva com bloqueio fail-closed de linhas sem tenant seguro.
4. Implementar wrappers de runtime/control plane sobre conexão dedicada, com `cvg.tenant_id` e reset garantido.
5. Executar smoke PostgreSQL em schemas únicos e fictícios, incluindo tentativas cross-tenant.
6. Rodar verify, coverage, audit, readiness, E2E e revisão independente.

O resultado desta sprint não muda o boundary de release candidate e não autoriza backfill ou ativação em banco real.

O fechamento pós-auditoria adicionou retry idempotente de inbound com marcador `pending/completed`, finalização atômica em uma conexão PostgreSQL, HMAC sobre raw body, purge e recuperação de lease stale de replay, tenant/agente binding de bootstrap, resolver de operador obrigatório e separação issuer/executor de capability approval. O preflight de schema/role e o baseline legado agora verificam forma estrutural e privilégios, não apenas nomes.

## Resultado PLAT-S03

`PLAT-S03-001` fecha a fronteira controlada: migration `0001` com checksum, baseline legado somente por comando explícito aprovado, mapeamento histórico de auditoria/outbox somente por relação autoritativa, flags de quarentena persistente, policies RLS exatas com `FORCE`, preflight obrigatório de marker/catálogo, pool com `search_path` restaurado/verificado e contexto tenant resetado, role runtime sem ownership/DDL/DELETE/TRUNCATE/acesso à quarentena e role migration separada, não-superusuária e proprietária do DDL gerenciado. O fixture real cobre mismatch, claim não confiável e linhas nulas de auditoria/outbox, invisibilidade/imutabilidade/rerun da quarentena e startup com roles separadas. O status de release segue `CONTROLLED_MVP_READY`; produção real continua não autorizada.

## PLAT-S04 — ordem de implementação

1. Registrar schemas RED para approval issue/verify/revoke/consume e single-use por input hash/nonce.
2. Implementar repository in-memory para testes e migration PostgreSQL RLS para authority durável.
3. Integrar verifier fail-closed ao `CapabilityGateway`, preservando compatibilidade somente com approvals estruturados controlados.
4. Implementar adapter allowlist-only do `ToolRegistry` para `find_available_slots` com `dryRun=true`; bloquear todo outro handler.
5. Cobrir replay, expiração, revogação, cross-tenant, input substitution, concorrência de consumo e auditoria sanitizada.
6. Rodar verify, coverage, audit, readiness, E2E, PostgreSQL real e nova crítica independente.

Nenhuma etapa habilita provider, canal, RAG, agenda real, financeira, clínica ou prontuário; esses gates exigem decisões e infraestrutura externas.

## Resultado controlado PLAT-S04

`PLAT-S04-001` e `PLAT-S04-003` foram concluídas em fixtures: approval durável single-consume com RLS e conexão transacional tenant-scoped; adapter allowlist-only para `find_available_slots` em dry-run; verifier HMAC/replay com raw body, store em memória para testes e store PostgreSQL controlada com purge/lease recovery; e retry/finalização atômica do inbound. Os gates finais estão em `docs/04_audit/0495_plat_s04_durable_approval_and_webhook_evidence.md`. HA/observabilidade de replay, IdP, provider/canal e qualquer side effect real continuam bloqueados.

## PLAT-S06 — ordem de implementação

1. Registrar o task e escrever testes RED para catálogo, clone imutável, histórico redigido e comparação A/B tenant-scoped.
2. Implementar contratos e ids de suite/run, lifecycle em memória e repository PostgreSQL com migration `0003` e RLS fail-closed.
3. Expor as rotas admin do Test Lab, validar agente/versão e manter a avaliação em `dryRun` sem dispatcher/provider.
4. Integrar criação, avaliação e comparação controladas no Control Center sem auto-fetch.
5. Executar testes focados, smoke PostgreSQL em fixture, E2E, verify, readiness, audit e inspeção de redaction/tenant boundary.
6. Atualizar runtime state, execution log, backlog, evidências e registrar explicitamente os bloqueios de produção.

## Resultado controlado PLAT-S06

`PLAT-S06-001` só pode ser marcado `COMPLETED_CONTROLLED` quando o catálogo persistente, clone versionado, histórico redigido, API/UI e comparação A/B passarem todos os gates definidos na SPEC. O resultado máximo continua `CONTROLLED_MVP_READY`; nenhuma suite ou execução pode provocar provider, canal, tráfego real ou ação sensível.

## PLAT-S07 — ordem de implementação

1. Registrar testes RED para precondition stale, HTTP 409 e ausência de mutação parcial.
2. Adicionar o erro de domínio `conflict` e a precondition `expectedStatus` às portas memory/PostgreSQL e ao wrapper tenant-scoped.
3. Preservar lock/conditional update no PostgreSQL e alinhar a store em memória ao mesmo compare-and-swap.
4. Expor a precondition nas rotas de transition/publish/rollback e enviar o status observado pela UI.
5. Rodar verify, readiness, E2E, smoke PostgreSQL e auditoria de que o conflito não emite audit de sucesso nem libera efeitos externos.
6. Atualizar runtime state, execution log, backlog e evidência, mantendo explicitamente os limites de produção.

## Resultado controlado PLAT-S07

`PLAT-S07-001` foi marcado `COMPLETED_CONTROLLED`: um operador stale recebe conflito explícito sem mutação parcial em memória, API e PostgreSQL fixture; a UI apresenta recuperação; e nenhum audit de sucesso é emitido no conflito. O resultado máximo continua `CONTROLLED_MVP_READY`; coordenação distribuída real permanece fora do escopo. Evidência: `docs/04_audit/0497_plat_s07_optimistic_conflict_evidence.md`.

## PLAT-S08 — ordem de implementação

1. Registrar testes RED para invariantes semânticas de manifest e resolução pinned/unpinned.
2. Adicionar `version` opcional ao `PluginBinding` sem mutar snapshots existentes.
3. Tornar o `PluginRegistry` imutável e multi-versão por nome, com ordenação determinística e cópias defensivas.
4. Fazer o `CapabilityGateway` distinguir versão pinned inexistente de plugin ausente, sempre sem chamar handler.
5. Rodar verify, readiness, E2E, PostgreSQL smoke e auditoria do boundary sem rede, código externo ou side effect.
6. Atualizar runtime state, execution log, backlog e evidência, mantendo o marketplace e produção fora do escopo.

## Resultado controlado PLAT-S08

`PLAT-S08-001` foi marcado `COMPLETED_CONTROLLED`: invariantes de manifest, registro multi-versão, pinning, compatibilidade legacy e fail-closed do gateway passaram todos os gates. O resultado máximo continua `CONTROLLED_MVP_READY`; marketplace, rede, provider/canal e código de terceiros permanecem bloqueados. Evidência: `docs/04_audit/0498_plat_s08_plugin_manifest_versioning_evidence.md`.

## PLAT-S09 — ordem de implementação

1. Registrar RED para lifecycle, duplicate name/version, tenant isolation e stale transition.
2. Adicionar contratos/ids de catálogo, lifecycle em memória e cópia defensiva.
3. Adicionar migration PostgreSQL com JSONB de manifest, RLS, unique tenant/name/version, trigger de imutabilidade e índice de status.
4. Implementar repository PostgreSQL e wrapper tenant-scoped com precondition transacional.
5. Expor API admin de create/list/get/transition, auditando somente metadata e sem executar handlers.
6. Rodar verify, readiness, E2E, PostgreSQL real e auditoria de que APPROVED não libera execução.
7. Atualizar runtime state, execution log, backlog e evidência; marketplace/instalação/provider continuam bloqueados.

## Resultado controlado PLAT-S09

`PLAT-S09-001` foi marcado `COMPLETED_CONTROLLED`: o catálogo metadata-only passou os gates de memória, API, PostgreSQL/RLS e isolamento. O resultado máximo continua `CONTROLLED_MVP_READY`; aprovação de manifest não é aprovação de execução. Evidência: `docs/04_audit/0499_plat_s09_plugin_catalog_evidence.md`.

## PLAT-S10 — ordem de implementação

1. Registrar testes RED para client headers, lista vazia, criação de manifest
   metadata-only, approval com `expectedStatus` e conflito stale.
2. Adicionar tipos e métodos do catálogo ao client web sem armazenar ou enviar
   secrets/código.
3. Integrar no Control Center uma seção explícita de Plugin Catalog com
   carregamento sob demanda, criação e transições controladas.
4. Exibir status, versão, actor e a mensagem de que `APPROVED` não habilita
   execução; tratar erro/conflict sem retry automático.
5. Rodar testes focados, suíte completa, typecheck, lint, format, build,
   coverage, readiness, E2E e audit; depois inspecionar o diff e a superfície
   de rede/side effect.
6. Atualizar runtime state, execution log, backlog, evidência e auditoria.

## Limites do PLAT-S10

O lane é somente UI/client sobre a API metadata-only já existente. Não inclui
marketplace, instalação, dependências de rede, health probe, handler persistente,
provider, canal, RAG, agenda, dados reais, deploy ou produção irrestrita.

## Resultado controlado PLAT-S10

`PLAT-S10-001` foi concluída como `COMPLETED_CONTROLLED`. O client e o Control
Center cobrem listagem, criação metadata-only, actor/versão, transições com
`expectedStatus`, conflito stale e E2E browser/API. Os gates passaram com 72
arquivos, 257 testes, 16 skips condicionais, coverage 84,97% statements /
80,21% branches / 84,93% functions / 85,90% lines, readiness, E2E, PostgreSQL
controlado, format, diff check e audit. `APPROVED` continua desacoplado de
handler/permission/provider/canal; nenhuma autorização de produção foi alterada.
Evidência: `docs/04_audit/0500_plat_s10_plugin_catalog_control_center_evidence.md`.

## PLAT-S11 — ordem de implementação

1. Registrar testes RED para allowlist de eventos, declaração de hooks no
   manifest, tenant isolation, redaction, imutabilidade e falha isolada.
2. Implementar o contrato do `PlatformEventBus` com inscrições imutáveis,
   handlers somente de plugins locais validados e auditoria sanitizada.
3. Integrar `RegisteredPlugin` com handlers de hooks sem conectar o catálogo
   persistente S09 à execução.
4. Emitir eventos representativos no Test Lab de forma opcional e
   observacional, preservando policy, trace, resposta e `externalCall=false`.
5. Rodar testes focados RED/GREEN, suíte completa, typecheck, lint, format,
   build, coverage, readiness, E2E, audit e inspeção de side effects.
6. Atualizar runtime state, execution log, backlog, evidência e auditoria;
   manter broker durável, entrega remota, marketplace, provider/canal e
   produção real fora do escopo.

## Limites do PLAT-S11

O event bus é process-local, best-effort e exclusivo do runtime controlado.
Não há retry durável, outbox, webhook, execução de manifest APPROVED, código
de terceiros, payload bruto, dado real ou qualquer efeito externo.

## Resultado controlado PLAT-S11

`PLAT-S11-001` foi concluída como `COMPLETED_CONTROLLED`. O event bus e os
hooks passaram RED/GREEN, verify, coverage acima de 80%, readiness, E2E,
PostgreSQL controlado, audit, format e diff check. Evidência:
`docs/04_audit/0501_plat_s11_event_bus_hooks_evidence.md`. O resultado máximo
continua `CONTROLLED_MVP_READY`; delivery durável, plugins executáveis,
provider/canal e produção real continuam bloqueados.

## PLAT-S12 — ordem de implementação

1. Registrar testes RED para parser/serializer do editor, limites, ids/kinds,
   segredo, reserved keys, preservação de blocks protegidos e checksum.
2. Adicionar `locked` opcional ao contrato de PromptBlock e utilitário de
   prompt-profile para invariantes, snapshot/checksum e comparação de origem.
3. Integrar a proteção no create/clone do control plane e estender o trace com
   status/checksum, mantendo snapshots imutáveis e compatibilidade histórica.
4. Fazer o Test Lab resolver somente templates operacionais permitidos, sem
   substituir respostas kernel de medicamento, segurança, emergência,
   takeover ou erro.
5. Adicionar ao Control Center os editores JSON, aviso de proteção, hidratação
   da versão e clone com erro visível antes de request quando inválido.
6. Rodar testes focados RED/GREEN, suíte completa, typecheck, lint, format,
   build, coverage, readiness, E2E, PostgreSQL, audit e inspeção de boundary.
7. Atualizar runtime state, execution log, backlog, evidência e auditoria;
   manter catálogo separado, migration, provider/canal, dados reais e
   produção irrestrita fora do escopo.

## Limites do PLAT-S12

O lane é um editor e runtime de prompt profile controlados sobre
`AgentVersion`. Não inclui prompt marketplace, colaboração distribuída,
approval/publication automática, knowledge institucional, canais, providers,
dados reais, execução clínica/financeira/prontuário ou side effects.

## Resultado controlado PLAT-S12

`PLAT-S12-001` foi concluída como `COMPLETED_CONTROLLED`. O Control Center
edita prompt blocks/templates em JSON validado e cria snapshots imutáveis; a
proteção backend/UI preserva system/safety/kernel, locks e respostas hard
safety; o Test Lab usa somente templates operacionais permitidos e o trace
expõe versão/status/checksum. Evidência:
`docs/04_audit/0502_plat_s12_prompt_profile_template_control_center_evidence.md`.

Os gates finais passaram com 77 arquivos, 279 testes, 16 skips condicionais,
coverage acima de 80%, readiness, build, E2E, PostgreSQL controlado, audit,
format e diff check. O resultado máximo continua `CONTROLLED_MVP_READY`;
provider/canal, RAG, dados reais, side effects e produção irrestrita seguem
bloqueados.

## PLAT-S13 — ordem de implementação

1. Registrar testes RED para schema backward-compatible, thresholds inválidos,
   relação clarify/handoff, prioridade e destinos duplicados/vazios.
2. Adicionar os campos opcionais de policy/handoff sem quebrar snapshots
   legados; manter `minConfidence` como alias de compatibilidade.
3. Ajustar o evaluator para decidir handoff/clarify deterministicamente e
   manter hard safety, approval e takeover fora do alcance do editor.
4. Estender Test Lab/trace com destino e prioridade redigidos, elevando risco
   alto/crítico para `high` sem dispatch.
5. Expor no Control Center os campos e validações, salvar sempre por clone e
   cobrir browser/API no E2E.
6. Rodar RED/GREEN, verify, coverage, readiness, E2E, PostgreSQL, audit,
   format, diff check e inspeção de side effects; sincronizar evidências.

## Limites do PLAT-S13

O lane é somente configuração controlada de decisão de handoff no snapshot
`AgentVersion` e visualização redigida no Test Lab. Não inclui regras livres,
Chatwoot, canais, provider, RAG, agenda, migration, catálogo de destinos,
dados reais ou produção irrestrita.

## Gate registrado do PLAT-S13

`PLAT-S13-001_HANDOFF_POLICY_STUDIO` está autorizado para `BUILD` controlado
após o registro no PRD, SPEC, backlog, runtime state e execution log. O gate
não autoriza qualquer efeito externo; a conclusão exige `AUDIT` e evidência
executável.

## Resultado controlado PLAT-S13

`PLAT-S13-001` foi concluída como `COMPLETED_CONTROLLED` após RED/GREEN,
hardening de input fail-closed, verify, readiness, E2E, PostgreSQL controlado,
audit, format e diff check. Evidência:
`docs/04_audit/0503_plat_s13_handoff_policy_studio_evidence.md`.

## PLAT-S14 — ordem de implementação

1. Registrar cases RED fixos para medicamento, confirmação, cancelamento,
   reagendamento e envio externo; validar que o resumo não carrega payload
   bruto nem cases arbitrários do caller.
2. Implementar o módulo reutilizável de preflight sobre `evaluateTestLabSuite`,
   com binding tenant/agent/version e contrato de resultado somente redigido.
3. Expor o endpoint administrativo de preflight e adicionar o gate obrigatório
   ao publish; auditar falha sem audit de sucesso e sem mutação.
4. Aplicar a mesma barreira ao rollback antes do clone/publicação e preservar
   `expectedStatus`/HTTP 409 para concorrência stale.
5. Cobrir a integração browser/API do publish e executar verify, coverage,
   readiness, E2E, PostgreSQL, audit, format, diff check e inspeção de side
   effects; atualizar evidências.

## Limites do PLAT-S14

O lane só opera em fixtures e no Test Lab fake/determinístico. Não inclui
alteração do store low-level para assumir autoridade operacional, suite
editável como gate, publicação automática, provider/canal/RAG, rollout,
migration, dados reais ou qualquer ação sensível.

## Gate registrado do PLAT-S14

`PLAT-S14-001_CONTROLLED_SAFETY_PUBLISH_PREFLIGHT` está autorizado para
`BUILD` controlado após o registro no PRD, SPEC, backlog, runtime state e
execution log. O gate não autoriza publish real, deploy, provider, canal ou
side effect; a conclusão exige `AUDIT` e evidência executável.

## Resultado controlado PLAT-S14

`PLAT-S14-001` foi concluída como `COMPLETED_CONTROLLED` após RED/GREEN,
enforcement de preflight em publish/rollback, integração Control Center/E2E,
verify, readiness, PostgreSQL controlado, audit, format e diff check. Evidência:
`docs/04_audit/0504_plat_s14_controlled_safety_publish_preflight_evidence.md`.
O resultado máximo continua `CONTROLLED_MVP_READY`; produção real permanece
`NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S15 — ordem de implementação

1. Registrar RED para URI externa, segredo, shape estrito, duplicidade,
   lifecycle e cross-tenant.
2. Adicionar contratos/IDs do catálogo metadata-only e lifecycle defensivo em
   memória, sem ligar `APPROVED` ao resolver RAG.
3. Implementar repository PostgreSQL, migration `0005`, unique/RLS e
   compare-and-swap de status com fixture controlada.
4. Expor API admin tenant-aware, audit redigido e client/Control Center para
   listar/criar/aprovar/arquivar metadata; cobrir browser/API.
5. Executar verify, readiness, E2E, PostgreSQL, audit, format, diff check e
   inspeção de ausência de conteúdo, rede, provider, RAG ou side effect.

## Limites do PLAT-S15

O lane é um catálogo de identidade e governança de fonte controlada. Não inclui
conteúdo, ingestão, chunking, embeddings, vector store, RAG, crawler, upload,
URL externa, provider, canal, dados reais ou alteração automática de agentes.

## Resultado controlado PLAT-S15

As cinco etapas foram executadas em ordem, com RED antes do BUILD e auditoria
final. `PLAT-S15-001` está `COMPLETED_CONTROLLED`; evidência:
`docs/04_audit/0505_plat_s15_controlled_knowledge_source_catalog_evidence.md`.
O próximo passo é um novo SPEC; nenhum efeito externo foi autorizado.

## Gate registrado do PLAT-S15

`PLAT-S15-001_CONTROLLED_KNOWLEDGE_SOURCE_CATALOG` está autorizado para
`BUILD` controlado após o registro no PRD, SPEC, backlog, runtime state e
execution log. O gate não autoriza resposta RAG, deploy, migration real ou
qualquer efeito externo; a conclusão exige `AUDIT` e evidência executável.

## PLAT-S16 — ordem de implementação

1. Registrar testes RED para shape estrito, quatro gates fixos, referência
   `controlled://evidence`, digest canônico e vínculo agent/version.
2. Adicionar contratos/ID do ledger e store em memória com cópia defensiva,
   unique por digest e transições fail-closed; `VALIDATED` exige todos os gates
   `PASS`.
3. Implementar migration `0006`, repository PostgreSQL, trigger de identidade/
   lifecycle, RLS e wrapper tenant-scoped com compare-and-swap.
4. Expor API admin com tenant/identidade, audit redigido e client/Control Center
   para criar, listar, validar, rejeitar e arquivar metadata.
5. Cobrir a garantia de que `VALIDATED` não toca `AgentVersion`,
   `activeVersionId`, gateway, provider, canal ou dispatch.
6. Rodar RED/GREEN, verify, readiness, E2E, PostgreSQL, audit, format,
   diff check e inspeção temporal do boundary; atualizar evidência e estado.

## Limites do PLAT-S16

O lane não implementa deploy, rollout, assinatura/KMS, infraestrutura real,
IdP/RBAC operacional, provider/canal, dados reais, conteúdo/RAG, broker,
marketplace ou ação sensível. `VALIDATED` é somente uma atestação controlada
persistida e não altera qualquer estado de execução.

## Gate registrado do PLAT-S16

`PLAT-S16-001_CONTROLLED_RELEASE_CANDIDATE_EVIDENCE_LEDGER` está autorizado
para `BUILD` controlado após o registro no PRD, SPEC, backlog, runtime state e
execution log. RED/GREEN, verify, readiness, E2E, PostgreSQL controlado, audit,
format e diff check foram concluídos. Evidência:
`docs/04_audit/0506_plat_s16_controlled_release_candidate_evidence_ledger_evidence.md`.
`PLAT-S16-001` está `COMPLETED_CONTROLLED`; o resultado máximo segue
`CONTROLLED_MVP_READY` e produção real continua `NO-GO`/
`WAITING_HUMAN_APPROVAL`. O próximo lane exige novo SPEC.

## PLAT-S17 — ordem de implementação

1. Registrar testes RED para input strict, IDs bounded, filtros e digest
   server-side do conjunto de auditoria.
2. Adicionar contratos/IDs, digest canônico e store de checkpoint com cópia
   defensiva e lifecycle `SEALED/ARCHIVED`.
3. Implementar migration `0007`, repository PostgreSQL, RLS, unique, trigger e
   leitura tenant-scoped dos eventos selecionados.
4. Expor API de checkpoint, audit seguro e client/UI de Auditoria para selar e
   arquivar apenas metadata da página carregada.
5. Cobrir que payload não é persistido/exportado, filtros/cross-tenant falham e
   o checkpoint não altera os eventos de auditoria.
6. Rodar RED/GREEN, verify, readiness, E2E, PostgreSQL, audit, format e diff
   check; fechar somente após AUDIT.

## Limites do PLAT-S17

O checkpoint é uma prova controlada de metadados observados. Não é exportação,
assinatura externa, política de retenção, garantia de infraestrutura real,
alteração de eventos, dado real ou autorização de produção.

## Gate registrado do PLAT-S17

`PLAT-S17-001_CONTROLLED_AUDIT_EVIDENCE_CHECKPOINT` está autorizado para
`BUILD` controlado somente após este registro no PRD, SPEC, backlog, runtime e
execution log. O próximo passo obrigatório é escrever testes RED. O resultado
máximo segue `CONTROLLED_MVP_READY`; produção real continua `NO-GO`/
`WAITING_HUMAN_APPROVAL`.

## Fechamento controlado PLAT-S17

O plano foi executado até AUDIT: RED/GREEN, contrato, digest, stores,
migration/RLS, API/client/UI, boundary tests, verify, readiness, E2E,
PostgreSQL controlado, audit e diff check passaram. `PLAT-S17-001` está
`COMPLETED_CONTROLLED`; evidência:
`docs/04_audit/0507_plat_s17_controlled_audit_evidence_checkpoint_evidence.md`.
O próximo lane exige novo SPEC e não altera o bloqueio de produção real.

## PLAT-S18 — ordem de implementação

1. Registrar RED para origin vazia/desconhecida, wildcard/`null`, URL com
   caminho/credencial, preflight inválido, HTTPS ausente e headers obrigatórios.
2. Criar `http-security.ts` com parser/normalizer puro, allowlists fixas e
   instalação de hooks Fastify sem aceitar valores de request como configuração.
3. Integrar `BuildServerOptions`/`buildServerFromEnv`, Fastify `trustProxy` e
   variáveis `API_ALLOWED_ORIGINS`, `API_REQUIRE_HTTPS` e
   `API_TRUSTED_PROXY_HOPS`; manter produção fail-closed.
4. Cobrir requests com/sem Origin, preflight, método/header inválido,
   `x-forwarded-proto`, HSTS condicional e ausência de wildcard/credentials.
5. Rodar GREEN, verify, readiness, E2E, PostgreSQL, audit, format, diff check e
   inspeção temporal de que nenhum endpoint de negócio ou efeito externo mudou.

## Limites do PLAT-S18

O lane implementa somente um boundary HTTP aplicacional controlado. Não altera
host, ingress, TLS, IdP, cookies, CSRF por sessão, limiter distribuído, replay,
provider, canal, RAG, dado real, migration ou side effect.

## Gate registrado do PLAT-S18

`PLAT-S18-001_CONTROLLED_HTTP_SECURITY_BOUNDARY` está autorizado para `BUILD`
controlado após o registro no PRD, SPEC, backlog, runtime state e execution
log. O próximo passo obrigatório é escrever testes RED. A conclusão exige
`AUDIT` e evidência executável; produção continua `NO-GO`.

## Fechamento controlado PLAT-S18

O lane concluiu RED/GREEN do parser, hooks Fastify, CORS/preflight com
`GET/POST/PATCH/OPTIONS`, HTTPS/proxy, headers fixos e bootstrap production.
`npm run verify`, readiness, E2E, PostgreSQL controlado, audit, format e diff
check passaram. `PLAT-S18-001` está `COMPLETED_CONTROLLED`; evidência:
`docs/04_audit/0508_plat_s18_controlled_http_security_boundary_evidence.md`.
O próximo lane exige novo SPEC; produção real permanece `NO-GO`/
`WAITING_HUMAN_APPROVAL`.

## PLAT-S20 — ordem de implementação

1. Registrar testes RED para política/chave inválida, expiração, cardinalidade,
   evicção determinística, snapshot sem chaves e resposta 429 sem cache.
2. Implementar os limites bounded no `InMemoryRateLimiter` preservando a
   assinatura de uso existente e a substituição imutável do mapa.
3. Adicionar somente `Cache-Control: no-store` ao caminho 429; não alterar
   identidade, cálculo de IP ou limites externos.
4. Executar GREEN, verify, readiness, E2E, PostgreSQL, audit, format, diff
   check e inspeção temporal de ausência de rede, persistência ou side effect.

## Limites do PLAT-S20

O lane trata somente segurança de memória e contrato do limiter process-local.
Não adiciona Redis, gateway/edge, limiter distribuído, HA, fairness
multi-instância, IdP, provider, canal, RAG, dado real ou side effect.

## Gate registrado do PLAT-S20

`PLAT-S20-001_CONTROLLED_RATE_LIMIT_MEMORY_SAFETY` está autorizado para BUILD
controlado após o registro no PRD, SPEC, backlog, runtime state e execution log.
O lane foi auditado como `COMPLETED_CONTROLLED`; `npm run verify`, readiness,
E2E, PostgreSQL controlado, audit, format e diff check passaram. Evidência:
`docs/04_audit/0510_plat_s20_controlled_rate_limit_memory_safety_evidence.md`.
O próximo lane exige novo SPEC; produção continua `NO-GO`/
`WAITING_HUMAN_APPROVAL`.

## PLAT-S21 — ordem de implementação

1. Registrar RED para test/development habilitado, disabled explícito, production
   e ambiente desconhecido fail-closed, além de `no-store`.
2. Integrar `requestMetricsEnabled` somente como opção de desabilitação nos
   ambientes controlados; production nunca aceita override para reabilitar.
3. Responder 404 genérico sem snapshot quando a rota estiver desabilitada e
   manter `/health` inalterado.
4. Executar GREEN, verify, readiness, E2E, PostgreSQL, audit, format, diff
   check e inspeção temporal de que nenhuma superfície externa foi criada.

## Limites do PLAT-S21

O lane trata somente exposição do endpoint de métricas local. Não adiciona IdP,
auth operacional, allowlist de rede, Prometheus/OTel, broker, HA, provider,
canal, RAG, dado real ou side effect.

## Gate registrado do PLAT-S21

`PLAT-S21-001_CONTROLLED_METRICS_EXPOSURE_BOUNDARY` está autorizado para BUILD
controlado após o registro no PRD, SPEC, backlog, runtime state e execution log.
O lane foi auditado como `COMPLETED_CONTROLLED`; `npm run verify`, readiness,
E2E, PostgreSQL controlado, audit, format e diff check passaram. Evidência:
`docs/04_audit/0511_plat_s21_controlled_metrics_exposure_boundary_evidence.md`.
O próximo lane exige novo SPEC; produção continua `NO-GO`/
`WAITING_HUMAN_APPROVAL`.

## PLAT-S22 — ordem de implementação

1. Registrar testes RED para envelope normal, erro HTTP, CORS aprovado,
   server-to-server, preflight, payload sem envelope e header externo.
2. Implementar extração estrita de `meta.correlationId` e publicar somente o
   header de resposta correspondente; nenhum valor de entrada será autoridade.
3. Expor `X-Correlation-Id` somente na resposta CORS de origem aprovada, sem
   credentials, sem mudar o allowlist de métodos/headers e sem tocar no body.
4. Executar GREEN, verify, readiness, E2E, PostgreSQL, audit, format, diff
   check e inspeção temporal da ausência de tracing distribuído ou side effect.

## Limites do PLAT-S22

O lane trata somente a ergonomia de correlação HTTP do envelope existente. Não
adiciona tracing distribuído, OTel, broker, logging de payload, header externo
confiável, identidade, tenant binding, provider, canal, RAG, dado real ou side
effect.

## Gate registrado do PLAT-S22

`PLAT-S22-001_CONTROLLED_CORRELATION_RESPONSE_BOUNDARY` está autorizado para
BUILD controlado após o registro no PRD, SPEC, backlog, runtime state e
execution log. O lane foi auditado como `COMPLETED_CONTROLLED`; `npm run
verify`, readiness, E2E, PostgreSQL controlado, audit, format e diff check
passaram. Evidência:
`docs/04_audit/0512_plat_s22_controlled_correlation_response_boundary_evidence.md`.
O próximo lane exige novo SPEC; produção continua `NO-GO`/
`WAITING_HUMAN_APPROVAL`.

## PLAT-S19 — ordem de implementação

1. Registrar testes RED para collector, método/status/latência, cardinalidade,
   fallback de 404/security rejection e snapshot defensivo.
2. Implementar `request-metrics.ts` com substituição imutável de estado,
   templates de rota bounded e sem ingestão de path/query/body/identidade.
3. Integrar o collector no `onResponse` do Fastify e expor somente o envelope
   read-only de `GET /health/metrics`.
4. Executar GREEN, verify, readiness, E2E, PostgreSQL, audit, format, diff
   check e inspeção temporal de ausência de persistência/efeito externo.

## Limites do PLAT-S19

O lane entrega observabilidade process-local controlada. Não adiciona
Prometheus/OTel, broker, storage ou agregação distribuída, retenção, alerting,
SLO, HA, deploy, provider, canal, RAG, dado real ou side effect.

## Gate registrado do PLAT-S19

`PLAT-S19-001_CONTROLLED_REQUEST_OBSERVABILITY_METRICS` está autorizado para
`BUILD` controlado após o registro no PRD, SPEC, backlog, runtime state e
execution log. O próximo passo obrigatório é escrever testes RED; produção
continua `NO-GO`.

## Fechamento controlado PLAT-S19

O lane concluiu RED/GREEN do collector immutable-by-replacement, cardinalidade
bounded, fallback de 404/security rejection, status/latência e endpoint
`/health/metrics` read-only. `npm run verify`, readiness, E2E, PostgreSQL,
audit, format e diff check passaram. `PLAT-S19-001` está
`COMPLETED_CONTROLLED`; evidência:
`docs/04_audit/0509_plat_s19_controlled_request_observability_metrics_evidence.md`.
O próximo lane exige novo SPEC; produção real permanece `NO-GO`/
`WAITING_HUMAN_APPROVAL`.

## PLAT-S24 — ordem de implementação

1. Registrar testes RED para JSON inválido, body acima de 1 MiB, media type
   não suportado, erro desconhecido e correlation ID do envelope.
2. Criar o módulo puro de classificação do erro de entrada, com mensagens
   constantes e sem acesso ao payload, headers ou mensagem arbitrária.
3. Configurar `bodyLimit` explícito, fazer o parser JSON usar erro classificado
   e instalar error handler global que responda envelope bounded.
4. Executar GREEN, verify, readiness, E2E, PostgreSQL, audit, format e diff
   check, confirmando que rotas, Secretary, tenant, identidade e side effects
   não mudaram.

## Limites do PLAT-S24

O lane trata somente a fronteira local de parsing e tamanho do body do API. Não
adiciona upload, streaming, storage, logger distribuído, provider, canal, RAG,
dado real, deploy, migration ou side effect.

## Gate registrado do PLAT-S24

`PLAT-S24-001_CONTROLLED_HTTP_PARSE_PAYLOAD_BOUNDARY` está registrado antes do
BUILD e foi executado até AUDIT como `COMPLETED_CONTROLLED`. Evidência:
`docs/04_audit/0514_plat_s24_controlled_http_parse_payload_boundary_evidence.md`.
Gates: verify 102 arquivos/359 testes pass/18 skips; coverage
85,46%/80,85%/85,21%/86,40%; readiness, E2E, PostgreSQL, audit, format e diff
check PASS. Produção continua `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S31 — ordem de implementação

1. Registrar RED para `note` acima de 4.000, confirmando
   `validation_failed`/400, ausência de chamada a `approvals.save` e ausência de
   mutação do approval.
2. Implementar somente o máximo no `ResolveApprovalSchema`, preservando
   decisão, identidade do operador, approval state, handoff e não persistência
   atual da nota.
3. Executar GREEN, regressão próxima, verify, readiness, E2E, PostgreSQL,
   audit, format e diff check.

## Limites do PLAT-S31

O lane trata somente `note` do payload de
`POST /v1/approvals/:approvalRequestId/decision`, com teto de 4.000 caracteres.
Não altera auth, tenant, identidade, Secretary, decisão humana, handoff,
provider/canal, RAG, dado real, deploy ou side effect.

## Gate registrado do PLAT-S31

`PLAT-S31-001_CONTROLLED_APPROVAL_DECISION_NOTE_FIELD_BOUNDARY` está registrado
no PRD, SPEC, backlogs, runtime state e execution log antes do BUILD, com
`SPEC_APPROVED_CONTROLLED_BUILD`; RED/GREEN, regressão próxima, verify e gates
externos fecharam o lane como `COMPLETED_CONTROLLED`.

## Resultado controlado do PLAT-S31

Verify passou com 109 arquivos/397 testes pass/18 skips e coverage
85,45%/80,83%/85,26%/86,45%; readiness 4/4, E2E 3/3, PostgreSQL 51 pass/18
skips, audit 0, format, JSON e diff check PASS. Evidência:
`docs/04_audit/0521_plat_s31_controlled_approval_decision_note_field_boundary_evidence.md`.
Produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S30 — ordem de implementação

1. Registrar RED para `sessionId`, `proposedAction` e `summary` acima dos
   limites, confirmando `validation_failed`/400 e ausência de chamada a
   `approvals.save`.
2. Implementar somente os máximos no `RequestHumanApprovalSchema`, preservando
   risk level, approval pending, auth/tenant e decisão humana.
3. Executar GREEN, regressão próxima, verify, readiness, E2E, PostgreSQL,
   audit, format e diff check.

## Limites do PLAT-S30

O lane trata somente os campos de entrada de `POST /v1/approvals`: 160 para
`sessionId`, 200 para `proposedAction` e 4.000 para `summary`. Não altera auth,
tenant, identidade, Secretary, handoff, decisão de approval, provider/canal,
RAG, dado real, deploy ou side effect.

## Gate registrado do PLAT-S30

`PLAT-S30-001_CONTROLLED_APPROVAL_REQUEST_FIELD_BOUNDARY` está registrado no
PRD, SPEC, backlogs, runtime state e execution log antes do BUILD, com
`SPEC_APPROVED_CONTROLLED_BUILD`; RED/GREEN, regressão próxima, verify e gates
externos foram concluídos como `COMPLETED_CONTROLLED`.

## Resultado controlado do PLAT-S30

Verify passou com 108 arquivos/394 testes pass/18 skips e coverage
85,45%/80,83%/85,26%/86,45%; readiness 4/4, E2E 3/3, PostgreSQL 51 pass/18
skips, audit 0, format e diff check PASS. Evidência:
`docs/04_audit/0520_plat_s30_controlled_approval_request_field_boundary_evidence.md`.
Produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

### Estado observado S30

RED executado em `2026-08-25T19:30:53-03:00`: 5 testes, 1 PASS e 4 FAIL antes
da implementação. GREEN executado em `2026-08-25T19:31:49-03:00`: 1 arquivo/5
testes PASS após adicionar os máximos no schema compartilhado. O próximo passo é
regressão próxima e verify.

## PLAT-S29 — ordem de implementação

1. Registrar RED para `sessionId`, `title`, `description`, `source` e
   `idempotencyKey` acima dos limites, confirmando `validation_failed`/400 e
   ausência de chamada a `tasks.create`.
2. Implementar somente os máximos no `CreateInternalTaskSchema`, preservando o
   mínimo 8 da chave, criação válida, tenant/auth e idempotência.
3. Executar GREEN, regressão próxima, verify, readiness, E2E, PostgreSQL,
   audit, format e diff check.

### Estado observado S29

RED executado em `2026-08-25T19:09:13-03:00`: 7 testes, 1 PASS e 6 FAIL antes
da implementação. GREEN executado em `2026-08-25T19:10:24-03:00`: 1 arquivo/7
testes PASS após adicionar os máximos no schema compartilhado. O próximo passo é
regressão próxima e verify.

## Limites do PLAT-S29

O lane trata somente o limite dos campos de entrada de `POST /v1/tasks`: 160
para `sessionId`, 200 para `title`, 4.000 para `description`, 120 para
`source` e 200 para `idempotencyKey`. Não altera auth, tenant, identidade,
Secretary, persistência estrutural, provider/canal, RAG, dado real, deploy ou
side effect.

## Gate registrado do PLAT-S29

`PLAT-S29-001_CONTROLLED_INTERNAL_TASK_FIELD_BOUNDARY` está registrado no PRD,
SPEC, backlogs, runtime state e execution log antes do BUILD, com
`SPEC_APPROVED_CONTROLLED_BUILD`; RED/GREEN, regressão próxima, verify e gates
externos foram concluídos como `COMPLETED_CONTROLLED`.

## Resultado controlado do PLAT-S29

Verify passou com 107 arquivos/389 testes pass/18 skips e coverage
85,45%/80,83%/85,26%/86,45%; readiness 4/4, E2E 3/3, PostgreSQL 51 pass/18
skips, audit 0, format e diff check PASS. Evidência:
`docs/04_audit/0519_plat_s29_controlled_internal_task_field_boundary_evidence.md`.
Produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S28 — ordem de implementação

1. Registrar RED para arrays/repetições de `sessionId`, `correlationId`,
   `actorId` e `type`, confirmando que o repositório não é chamado.
2. Implementar a rejeição single-valued em `parseOptionalAuditFilter`, com
   mensagem constante, preservando filtros únicos e paginação.
3. Executar GREEN, regressão S27, verify, readiness, E2E, PostgreSQL, audit,
   format e diff check.

## Limites do PLAT-S28

O lane trata somente filtros duplicados da consulta de audit evidence. Não
altera offset/limit, auth, tenant, identidade, Secretary, persistência
estrutural, provider/canal, RAG, dado real, deploy ou side effect.

## Gate registrado do PLAT-S28

`PLAT-S28-001_CONTROLLED_AUDIT_FILTER_DUPLICATE_BOUNDARY` está registrado no
PRD, SPEC, backlogs, runtime state e execution log antes do BUILD, com
`SPEC_APPROVED_CONTROLLED_BUILD`. RED/GREEN, regressão próxima, verify e gates
externos foram concluídos como `COMPLETED_CONTROLLED`; próximo passo: novo SPEC
controlado.

## Resultado controlado PLAT-S28

Verify passou com 106 arquivos/382 testes pass/18 skips e coverage
85,45%/80,83%/85,26%/86,45%; readiness 4/4, E2E 3/3, PostgreSQL 51 pass/18
skips, audit 0, format e diff check PASS. Evidência:
`docs/04_audit/0518_plat_s28_controlled_audit_filter_duplicate_boundary_evidence.md`.
Produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S27 — ordem de implementação

1. Registrar RED para offset ausente/0/10.000, acima do teto, negativo,
   fracionário e não seguro em conversas e audit evidence.
2. Implementar o limite puro e integrar `parsePagination`, preservando limit,
   envelope, status, tenant, repositórios e ausência de side effect.
3. Executar GREEN, verify, readiness, E2E, PostgreSQL, audit, format e diff
   check, confirmando que entradas inválidas não chamam o repositório.

## Limites do PLAT-S27

O lane trata somente o offset da paginação baseada em offset. Não altera limit,
cursor, auth, tenant, identidade, Secretary, persistência estrutural,
provider/canal, RAG, dado real, deploy ou side effect.

## Gate registrado do PLAT-S27

`PLAT-S27-001_CONTROLLED_PAGINATION_OFFSET_BOUNDARY` está registrado no PRD,
SPEC, backlogs, runtime state e execution log antes do BUILD, com
`SPEC_APPROVED_CONTROLLED_BUILD`. RED/GREEN, regressão próxima, verify e gates
externos foram concluídos como `COMPLETED_CONTROLLED`; próximo passo: novo SPEC
controlado.

## Resultado controlado PLAT-S27

Verify passou com 105 arquivos/376 testes pass/18 skips e coverage
85,43%/80,80%/85,25%/86,44%; readiness 4/4, E2E 3/3, PostgreSQL 51 pass/18
skips, audit 0, format e diff check PASS. Evidência:
`docs/04_audit/0517_plat_s27_controlled_pagination_offset_boundary_evidence.md`.
Produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S26 — ordem de implementação

1. Registrar testes RED para chave inválida, ID duplicado e block protegido com
   sentinelas, confirmando que a resposta não reflete o valor recebido.
2. Substituir somente as mensagens interpoladas do Prompt Profile por constantes,
   preservando códigos, status, correlation ID, validação e imutabilidade.
3. Executar GREEN, verify, readiness, E2E, PostgreSQL, audit, format e diff
   check, confirmando ausência de clone e ausência de alteração no Secretary.

## Limites do PLAT-S26

O lane trata somente o boundary de mensagens externas de erros dinâmicos do
Prompt Profile. Não altera `toSafeError` global, auth, tenant, identidade,
Secretary, body/parser S24, request-target S25, persistência, provider/canal,
RAG, dado real, deploy ou side effect.

## Gate registrado do PLAT-S26

`PLAT-S26-001_CONTROLLED_PROMPT_PROFILE_ERROR_MESSAGE_BOUNDARY` está registrado
no PRD, SPEC, backlogs, runtime state e execution log antes do BUILD, com
`SPEC_APPROVED_CONTROLLED_BUILD`, e foi executado até AUDIT como
`COMPLETED_CONTROLLED`. Evidência:
`docs/04_audit/0516_plat_s26_controlled_error_message_boundary_evidence.md`.
Gates: focused 4/4; regressão 3 arquivos/21 testes; verify 104 arquivos/371
testes pass/18 skips; coverage 85,41%/80,77%/85,24%/86,42%; readiness, E2E,
PostgreSQL, audit, format e diff check PASS. O próximo lane exige novo SPEC;
produção permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S25 — ordem de implementação

1. Registrar a suíte focada RED para request-target dentro do limite, rota/método
   desconhecido, path/query acima de 8192 bytes, parâmetro acima de 100 e
   ausência de echo/correlation header seguro.
2. Criar o classificador puro do request-target com cálculo bounded em bytes e
   mensagens constantes; declarar os limites no bootstrap Fastify.
3. Instalar `setNotFoundHandler` redaction-safe e a rejeição 414 antes de
   qualquer handler de negócio, preservando parser/body S24 e hooks de security.
4. Executar GREEN, verify, readiness, E2E, PostgreSQL, audit, format e diff
   check, confirmando que Secretary, auth, tenant, identidade e efeitos externos
   não mudaram.

## Limites do PLAT-S25

O lane trata somente request-target, limite de parâmetro e not-found 404/414.
Não adiciona query semantics, auth/IdP, tenant binding, body/parser, upload,
provider/canal, RAG, dado real, deploy, persistência ou side effect.

## Gate registrado do PLAT-S25

`PLAT-S25-001_CONTROLLED_HTTP_TARGET_BOUNDARY` está registrado no PRD, SPEC,
backlogs, runtime state e execution log antes do BUILD, com
`SPEC_APPROVED_CONTROLLED_BUILD`. O lane foi executado até AUDIT como
`COMPLETED_CONTROLLED`; evidência:
`docs/04_audit/0515_plat_s25_controlled_http_target_boundary_evidence.md`.
Gates: verify 103 arquivos/367 testes pass/18 skips; coverage
85,41%/80,76%/85,24%/86,42%; readiness, E2E, PostgreSQL, audit, format e diff
check PASS. Produção continua `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S23 — ordem de implementação

1. Registrar e executar testes RED para classificação de erro, redaction de
   credenciais/tokens/PII, newline, truncamento e ausência de stack/cause.
2. Criar um formatter puro de falha de startup com saída mínima, bounded e
   redaction-safe; preservar mensagens operacionais somente quando seguras.
3. Integrar o formatter ao `apps/api/src/main.ts`, emitindo uma única linha
   JSON sem serializar o objeto bruto e mantendo `process.exit(1)`.
4. Executar GREEN, verify, readiness, E2E, PostgreSQL, audit, format, diff
   check e inspeção temporal de que nenhum preflight, endpoint, identidade,
   tenant, persistência ou efeito externo mudou.

## Limites do PLAT-S23

O lane trata somente a representação segura de falhas do bootstrap do API. Não
adiciona logger distribuído, persistência, alerting, tracing, IdP, provider,
canal, RAG, dado real, deploy, migration ou side effect.

## Gate registrado do PLAT-S23

`PLAT-S23-001_CONTROLLED_STARTUP_FAILURE_REDACTION` está autorizado para BUILD
controlado após o registro no PRD, SPEC, backlog, runtime state e execution
log. O lane foi executado até AUDIT e está `COMPLETED_CONTROLLED`; evidência:
`docs/04_audit/0513_plat_s23_controlled_startup_failure_redaction_evidence.md`.
Produção continua `NO-GO`/`WAITING_HUMAN_APPROVAL`.
