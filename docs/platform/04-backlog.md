# Backlog — Agent Platform

## Sprint de baseline determinístico e contratos de teste — `PLAT-S48`

### `PLAT-S48-001` — Controlled Deterministic Approval Clock

- prioridade: P0
- estado: `COMPLETED_CONTROLLED`
- fase: `AUDIT`
- owner: `platform/security`
- dependências: `PLAT-S47-001`, `PLAT-S45-001`
- escopo: tornar a fonte de tempo do `CapabilityGateway` injetável, mantendo
  default real e a autoridade durável como decisão final de approval
- aceite: approval válido com clock compartilhado passa; clock inválido,
  expiração vencida, binding inválido e replay continuam falhando fechado
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem mudança de policy/schema/contrato HTTP ou API externa; a opção
  TypeScript `now` é uma seam interna não configurável por input externo; sem
  provider/canal real, RAG, rede, deploy, dado real ou side effect
- evidência planejada:
  `docs/04_audit/0538_plat-s48_controlled_deterministic_clock_and_test_contract_evidence.md`

### `PLAT-S48-002` — Controlled Semantic Timeline Assertion

- prioridade: P0
- estado: `COMPLETED_CONTROLLED`
- fase: `AUDIT`
- owner: `platform/test-infrastructure`
- dependências: `PLAT-S47-001`
- escopo: escopar a asserção da mensagem API à timeline selecionada, mantendo
  preview e timeline como superfícies distintas
- aceite: teste não fica ambíguo quando o mesmo texto aparece no preview e na
  timeline; a UI de produção não muda
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: somente contrato de teste; sem alteração de comportamento, rede,
  dado real ou side effect
- evidência planejada:
  `docs/04_audit/0538_plat-s48_controlled_deterministic_clock_and_test_contract_evidence.md`

### Registro controlado PLAT-S48 — 2026-09-02T07:03:00-03:00

Discovery reproduziu duas falhas no baseline atual: divergência entre o clock
do gateway e o clock injetado da autoridade de approval, e consulta web global
ambígua para texto legítimo em preview/timeline. O BUILD está autorizado pelo
SPEC controlado, com RED focado obrigatório. Produção permanece
`NO-GO`/`WAITING_HUMAN_APPROVAL`.

### Fechamento controlado PLAT-S48 — 2026-09-02T07:32:00-03:00

RED/GREEN, regressão e gates foram fechados. A evidência S48 registra
clock compartilhado, fail-closed sem consumo/handler para entradas temporais
inválidas e timeline escopada; regressão 127 arquivos/537 testes pass, 2/19
skipped; coverage 84.87/80.12/84.98/85.98; PostgreSQL 8/72; E2E 4/4;
readiness 4/4; worker smoke; build 158 módulos; audit 0; checks estáticos
PASS. `PLAT-S48` está `COMPLETED_CONTROLLED`; produção segue `NO-GO`.

## Sprint de criação de múltiplos agentes — `PLAT-S47`

### `PLAT-S47-001` — Controlled Multi-Agent Creation Mode

- prioridade: P0
- estado: `COMPLETED_CONTROLLED`
- fase: `AUDIT`
- owner: `platform/control-center`
- dependências: `PLAT-S46-001`, `PLAT-S01-001`
- escopo: ação `Novo agente` no Control Center, reset bounded do editor e prova
  de criação de Agent A/B no mesmo tenant/sessão
- aceite: criação A/B pela UI/API, configurações e IDs distintos, troca sem
  vazamento de estado, clone versionado preservado, catálogos tenant-wide
  preservados no reset e respostas tardias invalidadas na troca de tenant
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem mudança de kernel/schema, provider/canal real, RAG, rede, deploy,
  dado real ou side effect
- evidência planejada:
  `docs/04_audit/0537_plat-s47_controlled_multi_agent_creation_evidence.md`

### Registro controlado PLAT-S47

Discovery e RED reproduziram que o primeiro agente selecionado prendia o editor
em modo de clone: slug/nome/descrição ficavam `readOnly` e não havia comando
`Novo agente`. O BUILD adicionou o comando, o reset bounded, o escopo de
identidade/tenant, a preservação dos catálogos tenant-wide e a prova de corrida
assíncrona. A lane foi fechada em AUDIT após focused/E2E e gates integrados;
nenhum provider, canal, RAG, rede ou efeito externo foi usado.

### Fechamento controlado PLAT-S47 — 2026-08-26T12:48:37-03:00

`PLAT-S47-001` está `COMPLETED_CONTROLLED`: focused S47 5/5 e regressão web
7/18; regressão integral 127 arquivos/528 testes pass, 2 arquivos/19 testes
skipped; coverage 84,99/80,36/84,80/85,98; readiness 4/4; worker smoke;
PostgreSQL 8/72; E2E 4/4; build 70 módulos; audit 0; typecheck, lint, format e
diff check PASS. A revisão independente pós-correção será registrada na
evidência; produção continua `NO-GO`/`WAITING_HUMAN_APPROVAL`.

### Auditoria corretiva final PLAT-S47 — 2026-08-26

O Trace Viewer agora não exibe histórico sem agente, filtra pelo agente
selecionado e redige textos recursivamente; o cliente e a fronteira HTTP
exigem `agentId` nas leituras de suites/ledger; scopes do App são monotônicos;
payloads legados com `spans` não-array são tolerados. Regressão: 127 arquivos/
534 testes PASS, 2 arquivos/19 testes skipped; coverage 84,86/80,12/84,97/
85,97; build 158 módulos; E2E 4/4; PostgreSQL 8/72; readiness 4/4; worker
smoke; audit 0; typecheck, lint, format e diff check PASS. A crítica
independente compatível final retornou `PASS_CONTROLLED`, sem P0/P1/P2/P3, e
foi anexada à evidência; produção permanece
`NO-GO`/`WAITING_HUMAN_APPROVAL`.

## Sprint de correlação única da execução controlada — `PLAT-S46`

### `PLAT-S46-001` — Controlled Execution Trace Correlation Boundary

- prioridade: P1
- estado: `COMPLETED_CONTROLLED`
- fase: `AUDIT`
- owner: platform/observability/agent-core
- dependências: `PLAT-S45-001`, `PLAT-S44-001`, `PLAT-S42-001`
- escopo: criar/validar `traceId` antes do primeiro evento e propagá-lo para
  eventos, hooks, gateway, tool audit, Test Lab, runtime publicado e sinks
- aceite: uma execução tem uma única identidade; eventos/tools compartilham o
  mesmo trace parent; IDs locais de evento/call continuam distintos; ID
  injetado inválido falha cedo; persistência preserva a referência e não
  adiciona payload/autoridade
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem OTel/exporter, tracing distribuído, provider/canal real, rede,
  RAG, broker, deploy, dado real ou side effect
- evidência planejada:
  `docs/04_audit/0536_plat-s46_controlled_execution_trace_correlation_boundary_evidence.md`

### Fechamento controlado PLAT-S46 — 2026-08-26T11:22:54-03:00

RED: 4 arquivos/33 testes, com 8 falhas esperadas; GREEN de fechamento: 6
arquivos/25 testes. Regressão 126 arquivos/523 testes pass, 2 arquivos/19
testes skipped; coverage 85,07/80,06/85,95/86,10; PostgreSQL 8/72; readiness
4/4; worker smoke; E2E 4/4; build 70 módulos; audit 0; typecheck, lint, format
e diff check PASS. Revisão independente compatível read-only `PASS` sem
P0/P1/P2. Produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

### Registro inicial controlado PLAT-S46

Discovery confirmou que o trace nasce somente ao final do executor, o event bus
gera `id` independente por evento e o gateway gera correlação independente por
tool. O lane preserva a semântica de `correlationId` HTTP/evento e adiciona
somente a relação parental bounded do `traceId`; próximo passo obrigatório:
RED focado. O fechamento de auditoria está registrado acima.

## Regras

- Cada task tem ownership, escopo e evidência.
- Nenhuma task BUILD começa sem SPEC aprovada e registro aqui.
- Prioridade P0 exige teste antes de implementação.
- Dados e integrações reais permanecem fora do backlog executável controlado.

## Sprints controlados — estado atual `PLAT-S46` (AUDIT fechado controlado)

## Sprint de fronteira de invocação de tools — `PLAT-S45`

O gateway valida escopo, binding, policy e approval, mas a discovery reproduziu
que `input: unknown` chega sem schema ao handler, actor malformado pode gerar
`TypeError` e o resultado do handler retorna dados arbitrários ao chamador. A
lane fecha somente essa boundary interna, sem instalar ou ativar plugin real.

### `PLAT-S45-001` — Controlled Tool Invocation Boundary

- prioridade: P0
- estado: `COMPLETED_CONTROLLED`
- fase: `AUDIT`
- owner: `platform/security/plugin-runtime`
- dependências: `PLAT-S44-001`, `PLAT-S35-001`
- escopo: validators server-side de input/output por tool compilada,
  autorização efetiva do actor, actor/input bounded e projeção segura do
  resultado do handler
- aceite: validator ausente/excedente, input inválido, actor inválido ou
  resultado inválido falham fechado; input original não chega ao handler;
  approval não é consumido antes da validação e só usa autoridade durável;
  data/error são bounded e redigidos; falha de auditoria não repete execução;
  fixtures válidas preservam comportamento
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem schema executável fornecido pelo usuário, import dinâmico,
  marketplace, provider/canal real, rede, RAG, broker, outbox, egress, deploy,
  dado real ou side effect
- evidência planejada:
  `docs/04_audit/0535_plat-s45_controlled_tool_invocation_boundary_evidence.md`

### Registro controlado PLAT-S45

Discovery read-only reproduziu `null` chegando ao handler e `data.raw` sendo
retornado sem projeção. `actor.permissions = undefined` lançou `TypeError` em
`.includes`. A reprodução usou somente um plugin/IDs/actor fictícios, sem
provider, banco, rede ou side effect. O BUILD e os gates controlados passaram;
a revisão independente compatível read-only retornou `PASS sem P0/P1`, e a
evidência foi fechada como `COMPLETED_CONTROLLED` em AUDIT.

## Sprint de instrumentação local dos spans — `PLAT-S44`

S43 garante que telemetria declarada seja coerente, mas o executor ainda
constrói `durationMs: 0` para etapas que realmente executou. O próximo gap é
medir essas etapas com relógio monotônico local, mantendo skipped stages em
zero e sem exportação de payload ou dependência externa.

### `PLAT-S44-001` — Controlled Trace Stage Timing

- prioridade: P1
- estado: `COMPLETED_CONTROLLED`
- fase: `AUDIT`
- owner: `platform/observability/agent-core`
- dependências: `PLAT-S43-001`, `PLAT-S42-001`
- escopo: relógio monotônico injetável, ledger bounded de duração por etapa e
  integração no `executeConfiguredAgent`/`createTraceSpans`
- aceite: etapas executadas recebem duração finita não negativa derivada do
  relógio monotônico; etapas skipped permanecem zero; soma permanece dentro da
  latência do trace; falha de relógio/ledger não carrega payload nem habilita
  efeito externo; testes são determinísticos por clock fake
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: somente medição local de estágios controlados; sem OTel, exporter,
  rede, broker, provider/canal real, RAG, deploy, dado real ou side effect
- evidência planejada:
  `docs/04_audit/0534_plat-s44_controlled_trace_stage_timing_evidence.md`

### Registro controlado PLAT-S44

Discovery read-only confirmou que a invariância S43 ainda convivia com
`createTraceSpans` emitindo zero para todos os estágios, sem clock/ledger de
medição. O lane foi registrado antes do BUILD e auditado no limite controlado.

### RED observado S44

O focused executou 2 arquivos/2 testes e apresentou 1 falha esperada: o ledger
com clock monotônico injetável não existia.

### GREEN focado S44

Foi implementado ledger bounded sync/async com snapshot defensivo e integração
no executor. O focused passou 2 arquivos/17 testes, typecheck e lint PASS.

### Auditoria e fechamento controlado S44

`PLAT-S44-001` foi fechado como `COMPLETED_CONTROLLED` em `AUDIT`. A regressão
passou 124 arquivos/501 testes, com 2 arquivos/19 testes skipped; coverage
ficou em 85,18% statements, 80,44% branches, 85,70% functions e 86,16%
lines. PostgreSQL controlado passou 8 arquivos/72 testes, E2E 4/4, readiness
4/4, worker startup smoke, build 70 módulos, audit 0, typecheck, lint, format e
diff check passaram. Evidência:
`docs/04_audit/0534_plat-s44_controlled_trace_stage_timing_evidence.md`.
Produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## Sprint de integridade temporal do trace controlado — `PLAT-S43`

O S42 tornou o payload canônico, mas o runtime ainda monta spans com
duração estática e a boundary aceita timestamps/latência sem invariantes de
ordem. Um trace pode aparentar execução completa com metadado temporal
contraditório ou sequência de etapas não confiável para investigação.

### `PLAT-S43-001` — Controlled Trace Temporal Integrity

- prioridade: P1
- estado: `COMPLETED_CONTROLLED`
- fase: `AUDIT`
- owner: `platform/observability/security`
- dependências: `PLAT-S42-001`, `PLAT-S41-001`
- escopo: coerência runtime de timestamps, latência, soma bounded de spans,
  ordem canônica e status derivado das etapas do trace controlado
- aceite: timestamps incompletos/invertidos, latência incompatível, spans fora
  de ordem, soma acima da latência ou status divergente falham com
  `validation_failed`; traces sem telemetria opcional continuam compatíveis;
  nenhuma duração/payload externa é inventada
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: somente integridade temporal/ordinal de trace controlado; sem OTel,
  exporter, broker, rede, provider/canal real, RAG, deploy, dado real ou side
  effect
- evidência planejada:
  `docs/04_audit/0533_plat_s43_controlled_trace_temporal_integrity_evidence.md`

### Registro controlado PLAT-S43

Discovery read-only encontrou `createTraceSpans` emitindo `durationMs: 0` para
todas as etapas e nenhum invariant de relação entre `startedAt`,
`completedAt`, `latencyMs` e ordem/status de spans. O lane foi registrado antes
do BUILD; o próximo passo obrigatório é RED focado.

### RED observado S43

O focused executou 1 arquivo/14 testes e apresentou 6 falhas esperadas:
timestamps parciais/invertidos, latência incompatível, spans fora da ordem,
duração acumulada excessiva e status derivado divergente atravessavam a
boundary anterior.

### GREEN focado S43

O parser compartilhado agora exige timestamps completos e latência exata,
ordem canônica, soma bounded e status derivado dos campos do trace. O focused
passou 1 arquivo/14 testes, com typecheck, lint e diff check PASS.

### Auditoria e fechamento controlado S43

`PLAT-S43-001` foi fechado como `COMPLETED_CONTROLLED` em `AUDIT`. A
regressão passou 124 arquivos/499 testes, com 2 arquivos/19 testes skipped;
coverage ficou em 85,08% statements, 80,41% branches, 85,45% functions e
86,08% lines. PostgreSQL controlado passou 8 arquivos/72 testes, E2E 4/4,
readiness 4/4, worker startup smoke, build 70 módulos, audit 0, typecheck,
lint, format e diff check passaram. Evidência:
`docs/04_audit/0533_plat-s43_controlled_trace_temporal_integrity_evidence.md`.
Produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## Sprint de proveniência e contrato do trace controlado — `PLAT-S42`

O `TestRunTrace` é um contrato TypeScript e os sinks ainda aceitam JSON com
campos arbitrários. O caminho de suite clona traces aninhados sem passar pela
governança de output, e a leitura PostgreSQL devolve linhas JSON sem
revalidação. Isso permite que identidade de provider, `externalCall`, payloads
adicionais ou campos malformados atravessem a fronteira de persistência.

### `PLAT-S42-001` — Controlled Trace Provenance Boundary

- prioridade: P0
- estado: `COMPLETED_CONTROLLED`
- fase: `AUDIT`
- owner: `platform/persistence/security`
- dependências: `PLAT-S41-001`, `PLAT-S40-001`, `PLAT-FOUNDATION-009`
- escopo: contrato runtime estrito e projeção allowlist do `TestRunTrace`;
  validação de IDs, enums, limites, datas, spans, policy, handoff, provider e
  `externalCall: false`; redaction e output policy nos sinks diretos e nos
  traces aninhados de suite; revalidação fail-closed de linhas PostgreSQL
  lidas
- aceite: campos desconhecidos nunca são persistidos/devolvidos; provider
  não-controlado, `externalCall: true`, estrutura inválida, IDs cruzados ou
  output inconsistente falham antes de INSERT/efeito; InMemory, PostgreSQL,
  suite e conclusão transacional compartilham a mesma regra; mensagens e
  respostas permanecem bounded/redigidas
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: somente contrato/proveniência de trace no MVP controlado; sem
  provider/canal real, RAG, broker, outbox, egress, secret manager, deploy,
  migração estrutural, dado real ou side effect
- evidência planejada:
  `docs/04_audit/0532_plat_s42_controlled_trace_provenance_boundary_evidence.md`

### Registro controlado PLAT-S42

Discovery read-only confirmou que `sanitizeTraceForPersistence` validava apenas
response/outputPolicy e preservava spreads arbitrários; `recordTestSuiteRun`
clonava traces aninhados sem sanitização, e `listTestRuns`, `listExecutionTraces`
e `mapTestSuiteRun` do PostgreSQL não revalidavam JSON persistido. O gap foi
registrado antes do BUILD; nenhum provider, canal, rede ou dado real foi usado.

### RED observado S42

O focused executou 3 arquivos/16 testes: 9 falharam como esperado. Campo
secreto, provider externo, datas/estruturas inválidas, trace de suite e JSON
corrompido de leitura PostgreSQL atravessaram a boundary anterior. Nenhuma
operação externa ou side effect ocorreu.

### GREEN focado S42

Foi implementada a projeção runtime allowlist/bounded, com provider
`fake/deterministic-v1`, `externalCall: false`, redaction, output policy
consistente, coerência de handoff/usage/spans e datas serializadas. Sinks
InMemory/PostgreSQL, suites aninhadas e listagens PostgreSQL agora usam a
mesma governança. Focused GREEN passou 6 arquivos/76 testes, typecheck e lint.

### Auditoria e fechamento controlado S42

`PLAT-S42-001` foi fechado como `COMPLETED_CONTROLLED` em `AUDIT`. A
regressão passou 124 arquivos/492 testes, com 2 arquivos/19 testes skipped;
coverage ficou em 84,99% statements, 80,24% branches, 85,41% functions e
86,00% lines. PostgreSQL controlado passou 8 arquivos/72 testes, E2E passou
4/4, readiness 4/4, worker startup smoke passou, build passou com 70 módulos
e bundle web de 278,88 kB/gzip 81,99 kB, audit encontrou 0 vulnerabilidades,
typecheck/lint/format/diff check passaram. Evidência:
`docs/04_audit/0532_plat_s42_controlled_trace_provenance_boundary_evidence.md`.
Produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## Sprint de fronteira de segurança da saída controlada — `PLAT-S41`

O runtime controlado valida entrada, policy e provider, mas ainda permite que
texto vindo de template ou knowledge aprovada chegue ao trace e à resposta sem
uma etapa formal de output policy. Uma fonte controlada não transforma
conteúdo em orientação clínica, financeira, de prontuário ou ação sensível
segura.

### `PLAT-S41-001` — Controlled Output Safety Boundary

- prioridade: P0
- estado: `COMPLETED_CONTROLLED`
- fase: `AUDIT`
- owner: `platform/agent-core/security`
- dependências: `PLAT-S40-001`, `PLAT-S36-001`, `PLAT-FOUNDATION-009`
- escopo: contrato local de output policy; validação de tipo, tamanho,
  redaction e padrões de conteúdo inseguro; fallback determinístico seguro;
  integração depois do model e antes de `response.after`/trace; eventos
  redigidos de decisão de output
- aceite: texto válido e bounded segue com redaction; diagnóstico, prescrição,
  dose/medicação, prontuário, pagamento ou mutação de agenda são rejeitados;
  output inválido, vazio ou excessivo falha fechado; reescrita para handoff
  atualiza modo/estado/evento de forma consistente e não expõe o texto bruto;
  provider continua `fake/deterministic-v1` e `externalCall: false`
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: somente validação de saída no runtime controlado; sem provider real,
  canal, RAG, broker, outbox, egress, secret manager, deploy, dado real ou
  side effect
- evidência planejada:
  `docs/04_audit/0531_plat_s41_controlled_output_safety_boundary_evidence.md`

### Registro controlado PLAT-S41

Discovery read-only reproduziu que `approvedKnowledge.answer` e
`responseTemplates` são usados como `fallbackText` do provider determinístico,
sem output policy depois da completion. Após RED/GREEN inicial, a revisão
encontrou bypasses de variantes e execução de tools após rewrite; o RED/GREEN
corretivo e os gates finais passaram. O runtime, API e conclusão transacional
PostgreSQL agora validam a saída antes de trace, handoff, outbound ou tools;
nenhum modelo externo ou conteúdo real foi introduzido.

### Auditoria final PLAT-S41

`PLAT-S41-001 = COMPLETED_CONTROLLED`. O focused de fechamento passou 7
arquivos/76 testes; a regressão passou 123 arquivos/483 testes, com 2 arquivos
e 19 testes skipped. Coverage: 85,08% statements, 80,29% branches, 85,39%
functions e 86,12% lines. Readiness 4/4, worker startup smoke, PostgreSQL
8/72, E2E 4/4, build 70 módulos, typecheck, lint, format, audit 0 e diff
check passaram. A evidência está em
`docs/04_audit/0531_plat_s41_controlled_output_safety_boundary_evidence.md`.

A revisão independente read-only encontrou P0/P1 e todos os achados foram
convertidos em regressões e corrigidos. A tentativa final assíncrona não
retornou no limite e não foi tratada como aprovação; a auditoria local e os
gates não encontraram achado aberto no escopo controlado. Produção real segue
`NO-GO`/`WAITING_HUMAN_APPROVAL`.

## Sprint de identidade do provider/model controlado — `PLAT-S40`

O `ModelConfigSchema` é deliberadamente genérico para preparar providers
futuros, mas o executor controlado sempre usa o provider determinístico sem
consultar o `ModelProviderRegistry`. Assim, uma configuração com provider/model
desconhecido ou `fallbackProvider` pode ser persistida e só falhar tarde, ou
parecer executável no trace sem existir no runtime. A lane fecha somente essa
fronteira local, sem criar integração externa.

### `PLAT-S40-001` — Controlled Model Provider Identity Boundary

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- fase: AUDIT
- owner: platform/agent-core/security
- dependências: `PLAT-S39-001`, `PLAT-FOUNDATION-003`, `PLAT-FOUNDATION-009`
- escopo: registry server-side compilado para o provider `fake` e o modelo
  `deterministic-v1`; resolução exata no executor controlado; rejeição
  fail-closed de provider/model não registrado e de `fallbackProvider` não
  implementado
- aceite: configuração controlada válida resolve pelo registry e mantém
  `externalCall: false`; provider desconhecido, modelo não suportado ou
  fallback configurado falham antes da pipeline de eventos/modelo; registro é
  imutável, não expõe segredo e os caminhos Test Lab, API, runtime publicado e
  worker compartilham a mesma regra
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: somente identidade/resolução de provider/model em runtime controlado;
  sem provider real, chamada de modelo, fallback operacional, secret manager,
  canal, RAG, broker, egress, deploy, dado real ou side effect
- evidência planejada:
  `docs/04_audit/0530_plat_s40_controlled_model_provider_identity_evidence.md`

### Registro controlado PLAT-S40

Discovery read-only reproduziu que `createDryRunModelProvider` instancia
diretamente `DeterministicModelProvider`, enquanto `ModelProviderRegistry` não é
usado pelo runtime. `ModelConfigSchema` aceita provider/model arbitrários e
`fallbackProvider`, embora nenhum fallback seja executado. O contrato mantém o
schema genérico para referências futuras, mas exige o registry compilado e a
identidade exata antes de qualquer execução controlada. O próximo passo
obrigatório é RED focado; nenhum provider externo ou segredo será introduzido.

### RED controlado PLAT-S40

O focused `npx vitest run packages/platform/src/__tests__/model-provider-boundary.test.ts`
executou 1 arquivo/4 testes e falhou nos 4 casos esperados antes do GREEN:
provider/model desconhecido foi aceito, `fallbackProvider` foi ignorado e o
runtime completou com `openrouter/external` depois de emitir eventos. Nenhuma
rede, canal, dado real ou side effect foi acionado. O próximo passo é GREEN
mínimo no registry compartilhado e na validação precoce do executor.

### GREEN focado PLAT-S40

O registry compilado foi conectado ao `createDryRunModelProvider` e ao
`executeConfiguredAgent`. A identidade `fake/deterministic-v1` permanece
determinística; provider/model não suportado e `fallbackProvider` falham com
`invalid_action` antes de `message.received`. O focused inicial passou 2
arquivos/6 testes e a regressão ampliada final do published runtime/worker
passou 4 arquivos/19 testes. Os gates integrados e a revisão independente
também foram concluídos.

### Auditoria final PLAT-S40

`PLAT-S40-001 = COMPLETED_CONTROLLED`. Focused final: 4 arquivos/19 testes;
`npm test`: 121 arquivos/446 testes pass, 2 arquivos/19 skips; coverage
85,08/80,11/85,17/86,07; readiness 4/4; worker smoke; PostgreSQL 8/72; E2E
4/4; build 70 módulos; typecheck, lint, format, audit 0 e diff check PASS.
Revisão independente follow-up: `PASS sem achados estáticos`. Evidência em
`docs/04_audit/0530_plat_s40_controlled_model_provider_identity_evidence.md`.
Produção real continua `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## Sprint de integridade do lifecycle do release candidate — `PLAT-S39`

O candidate é criado com digest determinístico e o publish já revalida a
evidência, mas a transição `DRAFT -> VALIDATED` valida apenas o conjunto de
gates. Um registro alterado pode receber status `VALIDATED` e só ser recusado
mais tarde no publish. A aprovação deve ser uma fronteira íntegra também no
momento da transição, em memória e PostgreSQL.

### `PLAT-S39-001` — Controlled Release Candidate Lifecycle Integrity

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- fase: AUDIT
- owner: platform/persistence/security
- dependências: `PLAT-S37-001`
- escopo: extrair/reutilizar uma asserção server-side de integridade que
  parseia os quatro gates bounded, exige todos `PASS` e recomputa o digest
  usando tenant/agente/versão do próprio candidate antes de `VALIDATED`; exigir
  validador diferente de `createdBy` e mapper PostgreSQL fail-closed para JSON
  de gates corrompido
- aceite: digest adulterado, gate inválido, conjunto incompleto, duplicado ou
  divergente, ou autoatestação do criador, falha fechado sem mudar
  status/metadata; candidate íntegro segue validando; InMemory e PostgreSQL
  aplicam a mesma regra dentro de seus boundaries existentes; fixtures e
  Control Center usam identidade de revisão distinta no modo controlado
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: somente lifecycle/evidence ledger controlado; sem publish adicional,
  deploy, provider/canal, RAG, egress, broker, outbox, dado real ou side effect
- evidência planejada:
  `docs/04_audit/0529_plat_s39_controlled_release_candidate_lifecycle_integrity_evidence.md`

### Registro controlado PLAT-S39

Discovery read-only confirmou que `transitionReleaseCandidate` em memória e
PostgreSQL chama `hasAllReleaseCandidateGatesPassed`, mas não verifica o
`evidenceDigest`; a autoridade posterior de publish já fecha o caso, porém o
estado `VALIDATED` fica semanticamente falso. O próximo passo obrigatório é
RED focado nos dois adapters antes de qualquer implementação.

### RED controlado PLAT-S39

O focused `npx vitest run packages/platform/src/__tests__/release-candidate-ledger.test.ts packages/persistence/src/__tests__/release-candidate-repository.test.ts`
executou 2 arquivos/6 testes: 4 passaram e 2 falharam como esperado. Em ambos
os adapters, um digest armazenado como 64 zeros ainda foi aceito e o candidate
recebeu `VALIDATED`; nenhum efeito externo ocorreu. O próximo passo é GREEN
mínimo com asserção compartilhada.

### GREEN focado PLAT-S39

A asserção `assertReleaseCandidateEvidenceIntegrity` foi extraída para o
módulo compartilhado e reutilizada pela autoridade de publish. InMemory e
PostgreSQL agora a executam antes de gravar `VALIDATED`; o focused passou 2
arquivos/6 testes, com digest íntegro aceito e digest adulterado preservado em
`DRAFT`. Typecheck e lint passaram.

### Correção após crítica independente PLAT-S39

A crítica encontrou autoatestação pelo mesmo `createdBy` e o mapper PostgreSQL
mascarando `gate_results` não-array como lista vazia. O validator independente
agora é obrigatório, o parser shared falha com `invalid_action` e os cenários
foram separados; focused corretivo passou 3 arquivos/12 testes, com a migration
aditiva ainda coberta por contrato.

### Auditoria final PLAT-S39

`PLAT-S39-001` foi fechado como `COMPLETED_CONTROLLED`. O focused final passou
7 arquivos/23 testes, com 1 skip condicional; a autoridade de publish/rollback
também rejeita uma RC persistida auto-atestada. A migration aditiva
`0009_release_candidate_validator_integrity` impede `validated_by = created_by`
no banco. A revisão independente final retornou `PASS sem achados`.

Gates finais: `npm test` 120 arquivos/438 testes/19 skips; coverage
85,08/80,16/85,18/86,08; readiness 4/4; worker smoke PASS; PostgreSQL 8/72;
E2E 4/4; build, typecheck, lint, format, audit 0 e diff check PASS. Produção
real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`; próximo passo seguro é nova
discovery/SPEC controlada.

## Resultado controlado PLAT-S38

`PLAT-S38-001` foi fechado como `COMPLETED_CONTROLLED`. O worker reutiliza o
schema compartilhado de `approvedKnowledge`, encaminha o payload parseado ao
runtime pinned e alinha `history` ao limite bounded de 50. A crítica
independente encontrou somente esse drift médio e uma lacuna baixa de testes;
ambos foram corrigidos. Gates: 120 arquivos/432 testes/19 skips, coverage
84,92/80,09/85,08/85,92, readiness 4/4, worker smoke, E2E 4/4, PostgreSQL
8/71, build, lint, format, audit 0 e diff check. Evidência:
`docs/04_audit/0528_plat_s38_controlled_worker_knowledge_input_parity_evidence.md`.
Produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## Sprint de paridade de knowledge no job publicado — `PLAT-S38`

O kernel e as rotas controladas validam `approvedKnowledge` com contrato
strict/bounded, mas o job strict do worker ainda não transporta esse campo.
Isso cria drift entre Test Lab/API e o caminho worker, sem justificar qualquer
abertura de RAG real.

### `PLAT-S38-001` — Controlled Worker Knowledge Input Parity

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: worker/agent-core/platform/security
- dependências: `PLAT-S37-001`, `PLAT-S36-001`, `PLAT-S33-001`
- escopo: aceitar `approvedKnowledge` opcional no `PublishedAgentJobSchema`,
  reutilizar `ApprovedKnowledgeForTestSchema` e encaminhar o payload parseado
  para `executePublishedAgent`
- aceite: payload válido chega ao runtime e mantém binding/source/version;
  source externa, excesso, campo extra ou shape legado falham antes do store;
  nenhum provider, RAG, fila, canal ou side effect é acionado
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: somente fixture `controlled://`; sem broker, retry distribuído,
  provider/canal, RAG, dados reais, deploy, egress, outbox ou side effect
- evidência planejada:
  `docs/04_audit/0528_plat_s38_controlled_worker_knowledge_input_parity_evidence.md`

### Registro controlado PLAT-S38

Discovery read-only identificou que `executePublishedAgent` já aceita e valida
`approvedKnowledge`, enquanto `PublishedAgentJobSchema` é strict e o worker
não expõe o campo. O próximo passo obrigatório é RED focado; nenhum runtime
externo ou dado real entra nesta lane.

## Sprint de autoridade de evidência para publicação controlada — `PLAT-S37`

O ledger de release candidates já valida o formato dos quatro gates, mas a
publicação e o rollback ainda podem ser chamados sem referenciar um candidato
validado. Isso deixa a atestação fora da autoridade efetiva da mutação de
versão e permite que gates enviados pelo cliente permaneçam apenas como
opinião operacional.

### `PLAT-S37-001` — Controlled Publish Evidence Authority Boundary

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: platform/api/persistence/security
- dependências: `PLAT-S36-001`, `PLAT-FOUNDATION-009`
- escopo: exigir `releaseCandidateId` em publish e rollback; validar no
  servidor status `VALIDATED`, digest íntegro, quatro gates PASS e vínculo
  exato de tenant/agente/versão; manter preflight crítico server-side antes da
  mutação e tratar rollback como derivação controlada do candidato da versão
  fonte
- aceite: ausência, candidato DRAFT/REJECTED/ARCHIVED, tenant/agente/versão
  divergentes, digest adulterado ou gate inválido falham fechado sem mutação;
  candidato válido permite somente o snapshot controlado; UI e PostgreSQL
  preservam a mesma autoridade
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem dados reais, deploy, provider/canal, RAG, egress, broker,
  outbox, rollout gradual ou side effect externo; candidato validado não é
  autorização de produção
- evidência planejada:
  `docs/04_audit/0527_plat_s37_controlled_publish_evidence_authority_evidence.md`

### Registro controlado PLAT-S37

Discovery e crítica independente reproduziram que `ReleaseCandidate` era
criado com gates fornecidos pelo request e que a rota de publish executava
apenas o preflight crítico, sem consumir o ledger. O SPEC tornou o
identificador do candidato obrigatório no store e na API, revalidou sua
integridade/binding no servidor e manteve o rollback vinculado à versão fonte.
O RED foi executado antes do BUILD.

### Resultado controlado PLAT-S37

`PLAT-S37-001` foi fechado como `COMPLETED_CONTROLLED`. A autoridade
compartilhada exige candidato `VALIDATED`, metadados de validação, quatro gates
`PASS`, digest íntegro e binding exato; API, memória, PostgreSQL e UI preservam
o mesmo boundary. O focused passou 2 arquivos/5 testes; a suíte completa
passou 119 arquivos/427 testes/19 skips; coverage 84,92/80,08/85,08/85,92;
readiness 4/4, worker smoke, E2E 4/4, PostgreSQL 8/71, build, format, lint,
audit 0 e diff check passaram. Evidência:
`docs/04_audit/0527_plat_s37_controlled_publish_evidence_authority_evidence.md`.
Produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## Sprint de boundary do payload de knowledge controlada — `PLAT-S36`

O runtime aceita `approvedKnowledge` em chamadas internas, mas a validação
anterior era parcial: não limitava tamanho nem rejeitava campos extras. As
rotas possuíam schemas locais, enquanto o worker/runtime podia atravessar o
boundary sem contrato compartilhado. Esta sprint fecha somente a proveniência
e os limites do fixture `controlled://`.

### `PLAT-S36-001` — Controlled Knowledge Input Provenance Boundary

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: platform/agent-core/api/security
- dependências: `PLAT-S35-001`, `PLAT-FOUNDATION-009`
- escopo: schema compartilhado e validação no runtime para
  `approvedKnowledge`; API Test Lab e approval execution reutilizam o mesmo
  contrato bounded
- aceite: source `controlled://` bounded, versão e resposta limitadas, objeto
  strict; payload inválido falha antes de resolução/modelo; binding continua
  exigindo source+version configurados e aprovados; sem conteúdo externo
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem RAG real, ingestão, URL externa, provider, canal, egress, broker,
  outbox, dado real, deploy ou side effect
- evidência: `docs/04_audit/0526_plat_s36_controlled_knowledge_input_boundary_evidence.md`

### Registro controlado PLAT-S36

Discovery reproduziu uma validação parcial em `executeConfiguredAgent`:
`validateApprovedKnowledge` era chamado, mas não impunha limites de tamanho nem
strictness para chamadas internas/worker. A API também possuía schemas
duplicados, portanto o lane deve extrair um schema compartilhado antes do
GREEN. O próximo passo obrigatório é RED; nenhum conteúdo de knowledge real
será introduzido.

### RED controlado PLAT-S36

O focused `knowledge-input-boundary.test.ts` executou 4 testes: 2 falharam
como esperado porque o runtime aceitou answer acima de 4.000 caracteres/campo
extra e a API aceitou source `controlled://` acima de 200 caracteres; 2 casos
válidos passaram. Nenhum modelo externo, RAG ou side effect foi chamado.
O próximo passo é GREEN mínimo no schema compartilhado e no runtime.

### GREEN focado PLAT-S36

`ApprovedKnowledgeForTestSchema` foi extraído para `contracts.ts`; o runtime
valida e normaliza o payload antes dos eventos/modelo, e Test Lab/API de
approval importam o mesmo schema. O focused passou 2 arquivos/4 testes, além de
typecheck e lint. A próxima etapa é regressão próxima e gates integrados.

### Resultado controlado PLAT-S36

`PLAT-S36-001` foi fechado como `COMPLETED_CONTROLLED`. O schema compartilhado
também foi aplicado ao `TestLabCaseSchema`; a regressão dedicada de API cobre
Test Lab e capability approval, e payload inválido mantém a approval como
`issued` antes de qualquer consumo. O verify final passou 117 arquivos/422
testes/19 skips, com coverage 85,05% statements, 80,31% branches, 85,11%
functions e 86,07% lines; readiness 4/4, worker smoke, E2E 4/4, PostgreSQL
8/71, audit 0, build, format e diff check passaram. A crítica independente não
encontrou CRITICAL/HIGH; as observações MEDIUM de tracking, backlog e cobertura
do endpoint foram corrigidas e revalidadas. Produção real continua `NO-GO` /
`WAITING_HUMAN_APPROVAL`.

## Sprint de boundary controlado do registry de tools — `PLAT-S35`

O control plane aceita bindings de plugins, mas o planejador e a API ainda
reconhecem somente `find_available_slots`. A configuração de um plugin
compilado não pode parecer executável quando não chega ao mesmo gateway de
capabilities. Esta sprint fecha somente a identidade e a resolução de tools
pré-instaladas pelo servidor.

### `PLAT-S35-001` — Controlled Tool Registry Identity Boundary

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: platform/api/agent-core/security
- dependências: `PLAT-S34-001`, `PLAT-FOUNDATION-009`
- escopo: registry server-side compilado, versão exata obrigatória na execução,
  metadata de intent para planejamento, deduplicação e bloqueio de colisões;
  approval/API usam a resolução registrada e permissão server-owned
- aceite: Test Lab planeja tools pelos bindings ativos e registry, sem literal
  de scheduling; binding sem versão exata, plugin/tool ausente, duplicidade ou
  colisão falha fechado; somente handlers compilados registrados executam;
  catálogo aprovado continua metadata-only; API emite/consome approval somente
  após resolver a tool contra a configuração pinned
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: somente fixtures/handlers compilados dry-run; sem import dinâmico,
  marketplace, provider, canal, egress, broker, outbox, dados reais, deploy ou
  side effect
- evidência:
  `docs/04_audit/0525_plat_s35_controlled_tool_registry_identity_evidence.md`
- resultado: `COMPLETED_CONTROLLED`; produção continua `NO-GO` /
  `WAITING_HUMAN_APPROVAL`

### Registro controlado PLAT-S35

Discovery reproduziu que `PluginRegistry`/`CapabilityGateway` já são genéricos
em unidade, mas `executePlannedTools` e a rota de approval/API fixam
`find_available_slots`. O desenho aprovado para BUILD é a interseção entre
binding tenant-scoped, versão exata e handler compilado conhecido. O catálogo
de plugins permanece descritivo: não fornece código, URL, provider ou
autoridade de execução. O próximo passo obrigatório é RED.

### RED controlado PLAT-S35

`npx vitest run packages/platform/src/__tests__/controlled-tool-registry.test.ts`
executou 4 testes em `2026-08-26T00:00:58-03:00`: 3 falharam no contrato ainda
ausente e 1 passou confirmando que catálogo sem handler não executa. O próximo
passo é GREEN mínimo; não há autorização para handlers externos.

### GREEN e regressão próxima PLAT-S35

O registry compilado agora expõe planner por intent, exige versão exacta,
deduplica identidade repetida, bloqueia colisão e mantém catálogo sem handler
inexecutável. Test Lab e approval/API usam a mesma resolução server-side. A
regressão próxima passou 10 arquivos/49 testes e typecheck; gates integrados e
AUDIT ainda estão pendentes.

### Correção de auditoria PLAT-S35

A crítica independente não encontrou CRITICAL/HIGH, mas identificou alias
`latest` aceito, resolução latest implícita em `get(name)` e normalização
ausente no construtor. O contrato agora rejeita o alias, exige versão em `get`,
expõe `getLatest` somente para inspeção e valida plugins pré-carregados. Os
gates integrados serão repetidos.

### Resultado controlado PLAT-S35

Após a sincronização da evidência, `PLAT-S35-001` foi fechado como
`COMPLETED_CONTROLLED`. Verify passou 115 arquivos/417 testes/19 skips com
coverage 84,99/80,30/85,11/86,01; readiness, smoke, E2E 4/4, PostgreSQL 8/71,
audit, build, format e diff check também passaram. Evidência:
`docs/04_audit/0525_plat_s35_controlled_tool_registry_identity_evidence.md`.

## Sprint de paridade CI e startup fail-closed — `PLAT-S34`

## Sprint de paridade CI e startup fail-closed — `PLAT-S34`

O workflow CI já executa verify, PostgreSQL e E2E, mas não possui gate
explícito de readiness nem smoke processual do worker. Também aceita lifecycle
scripts no `npm ci`, não declara permissões mínimas/concurrency e não existe
imagem de container para um scan honesto. O S34 fecha somente a paridade CI e
torna a ausência do artefato de container explícita.

### `PLAT-S34-001` — Controlled CI Gate Parity and Worker Startup Smoke

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: CI/worker/security
- dependências: `PLAT-S33-001`, `PLAT-FOUNDATION-009`
- escopo: contrato de workflow, `npm ci --ignore-scripts`, permissões/concurrency,
  readiness explícito e smoke processual bounded do worker
- aceite: CI chama todos os gates disponíveis, smoke confirma exit 1 e JSON
  seguro sem bootstrap, e nenhum container scan é declarado sem imagem/policy
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem Dockerfile, registry, deploy, broker, provider, canal, dados reais
  ou alteração de side-effect policy
- evidência:
  `docs/04_audit/0524_plat_s34_controlled_ci_gate_parity_evidence.md`

### Registro controlado PLAT-S34

Discovery comparou o workflow atual com o requisito mestre #88: verify, PG e
E2E já existem, porém readiness e worker startup não estão no CI; o install não
é explicitamente sem scripts; permissões e cancelamento de runs não estão
declarados. Como não há Dockerfile/container no repositório, o scan de imagem
permanece um bloqueio de hardening e não será simulado.

### Resultado controlado PLAT-S34

O workflow chama readiness, verify, smoke do worker, PostgreSQL, E2E e
`git diff --check`, além de instalar com `npm ci --ignore-scripts` e declarar
permissions/concurrency mínimos. O smoke processual confirma exit 1 e falha
JSON bounded sem adapter, bootstrap, stack ou cause. `PLAT-S34-001` está
`COMPLETED_CONTROLLED`; produção real segue `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## Sprint de boundary controlado do worker — `PLAT-S33`

Esta sprint remove uma assimetria perigosa: o API já executa o runtime
publicado, mas o worker ainda chama `runAgentTurn` legado com IDs fictícios e o
entrypoint tenta processar um job bootstrap sem fila configurada. O worker deve
aceitar somente jobs bounded, tenant-scoped e pinned, delegar ao mesmo executor
publicado e falhar fechado quando não houver adapter de fila.

### `PLAT-S33-001` — Controlled Worker Published-Runtime Boundary

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: worker/agent-core/security
- dependências: `PLAT-S32-001`, `PLAT-S03-001`, `PLAT-FOUNDATION-009`
- escopo: schema bounded para job runtime, executor worker sobre
  `executePublishedAgent`, versão pinned obrigatória e entrypoint sem bootstrap
  fictício
- aceite: payload legado/incompleto falha antes do executor; job válido usa a
  versão imutável indicada, preserva tenant/agent/version no trace e não faz
  provider, canal, outbox ou side effect; ausência de adapter de fila encerra o
  worker com erro seguro
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem broker, retry distribuído, outbox, provider/canal real, deploy,
  dados reais ou mudança de side-effect policy
- evidência:
  `docs/04_audit/0523_plat_s33_controlled_worker_runtime_boundary_evidence.md`

### Registro controlado PLAT-S33

Discovery reproduziu que `apps/worker/src/worker.ts` delega para
`runAgentTurn({ sessionId, triggerMessageId, autonomyLevel })`, sem tenant,
agent/version, store publicado ou trace; `apps/worker/src/main.ts` usa
`sess_bootstrap`/`msg_bootstrap`. O S33 está autorizado somente para RED/GREEN
controlado e não altera o boundary de produção real.

### Resultado controlado PLAT-S33

O S33 foi fechado como `COMPLETED_CONTROLLED`: o worker aceita somente job
strict/bounded com tenant, agent e version pinned, delega ao
`executePublishedAgent`, rejeita legacy/oversized/unknown/draft/cross-agent e
não inicia sem queue adapter. A suíte completa, coverage, readiness, E2E,
PostgreSQL 16 fixture, typecheck, lint, build, format, audit e diff check
passaram. Evidência:
`docs/04_audit/0523_plat_s33_controlled_worker_runtime_boundary_evidence.md`.
Produção real segue `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## Sprint de version pinning controlado por sessão — `PLAT-S32`

Esta sprint fecha uma lacuna comportamental do runtime publicado: uma sessão
continuada deve permanecer no `AgentVersion` que a iniciou, mesmo depois de
uma nova publicação. O binding é escrito uma única vez, tenant-scoped e
fail-closed; sessões legadas sem binding são vinculadas somente na primeira
execução publicada controlada.

### `PLAT-S32-001` — Controlled Session Agent-Version Pinning

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: agent-core/persistence/api/security
- dependências: `PLAT-S31-001`, `PLAT-S08-001`, `PLAT-FOUNDATION-009`
- escopo: persistir `agentId`/`agentVersionId` na sessão, adicionar migration
  aditiva `0008`, binding atômico em memória/PostgreSQL e executar continuations
  com a versão pinned, aceitando snapshot `ARCHIVED` imutável
- aceite: nova sessão fixa a versão publicada observada; publicar outra versão
  não muda a versão da sessão; binding parcial, cross-tenant, agent/version
  mismatch e corrida de primeiro binding falham sem trocar a versão; runtime
  sem versão publicada continua `not_configured` sem efeito externo
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: fixtures e PostgreSQL controlado; sem provider/canal/RAG/dados reais,
  sem worker externo, deploy, alteração de RBAC/IdP ou side effect
- evidência: `docs/04_audit/0522_plat_s32_controlled_session_version_pinning_evidence.md`

### Registro controlado PLAT-S32

A auditoria do prompt mestre e da implementação confirmou que
`executePublishedAgent` sempre chamava `resolvePublished` para continuations e
`SessionRecord` não guardava a identidade do agente. O S32 foi fechado como
`COMPLETED_CONTROLLED`: migration aditiva, binding monotônico tenant-scoped,
execução de snapshots `ARCHIVED`, integração browser/API, PostgreSQL real de
teste e todos os gates passaram. O boundary de produção real não foi alterado.

### Resultado controlado PLAT-S32

Nova sessão fixa o par agente/versão uma única vez; publicação posterior não
troca o trace de uma continuação; binding parcial, mismatch, cross-tenant e
falha de status fecham sem fallback ou efeito externo. Evidência:
`docs/04_audit/0522_plat_s32_controlled_session_version_pinning_evidence.md`.

## Sprint de boundary controlado da nota de decisão de approval — `PLAT-S31`

Esta sprint fecha somente a ausência de máximo em `ResolveApprovalSchema.note`.
O schema deve rejeitar notas acima de 4.000 antes de `approvals.save`; decisão,
identidade do operador, approval state, handoff e semântica atual permanecem
inalterados.

### `PLAT-S31-001` — Controlled Approval Decision Note Field Boundary

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: api/agent-core/security
- dependências: `PLAT-S30-001`, `PLAT-S24-001`, `PLAT-FOUNDATION-009`
- escopo: limitar `note` a 4.000 no `ResolveApprovalSchema`
- aceite: nota excedente falha com `validation_failed`/400 antes de
  `approvals.save`, sem alterar o approval; nota no limite mantém decisão válida
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: somente validação de entrada e fixtures; sem mudança de auth, tenant,
  identidade, decisão humana, handoff, provider/canal, RAG, dado real, deploy ou
  side effect
- evidência:
  `docs/04_audit/0521_plat_s31_controlled_approval_decision_note_field_boundary_evidence.md`

### Registro controlado PLAT-S31

A reprodução efêmera aceitou `note` com 5.000 caracteres em uma decisão de
approval e persistiu `approved`; a nota não foi ecoada nem persistida.
RED/GREEN, regressão próxima, verify e gates externos fecharam o lane como
`COMPLETED_CONTROLLED`.

### Resultado controlado PLAT-S31

O schema compartilhado agora rejeita `note` acima de 4.000 antes de
`approvals.save`; o approval permanece `pending` no caso rejeitado e nota no
limite mantém decisão `approved`. Verify passou com 109 arquivos/397 testes
pass/18 skips e coverage 85,45%/80,83%/85,26%/86,45%; readiness 4/4, E2E 3/3,
PostgreSQL 51/18, audit 0, format, JSON e diff check PASS. Evidência:
`docs/04_audit/0521_plat_s31_controlled_approval_decision_note_field_boundary_evidence.md`.

## Sprint de boundary controlado de campos de approval request — `PLAT-S30`

Esta sprint fecha somente a ausência de máximos nos campos livres de criação de
approval pending. O schema compartilhado deve rejeitar valores acima dos
limites antes de `approvals.save`; decisão humana, handoff e side effects
permanecem inalterados.

### `PLAT-S30-001` — Controlled Approval Request Field Boundary

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: api/agent-core/security
- dependências: `PLAT-S29-001`, `PLAT-S24-001`, `PLAT-FOUNDATION-009`
- escopo: limitar `sessionId` 160, `proposedAction` 200 e `summary` 4.000 no
  `RequestHumanApprovalSchema`
- aceite: cada valor acima do limite falha com `validation_failed`/400 sem
  chamar `approvals.save`; payload válido continua criando approval pending
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: somente validação de entrada e fixtures; sem mudança de auth, tenant,
  decisão de approval, handoff, provider/canal, RAG, dado real, deploy ou side
  effect
- evidência: `docs/04_audit/0520_plat_s30_controlled_approval_request_field_boundary_evidence.md`

### Registro controlado PLAT-S30

A descoberta reproduziu `summary` com 5.000 caracteres persistido em approval
fixture. RED/GREEN, regressão próxima, verify e gates externos foram concluídos
como `COMPLETED_CONTROLLED`; decisão humana e side effects não foram alterados.

### Resultado controlado PLAT-S30

O schema compartilhado agora rejeita os três campos acima dos máximos antes de
`approvals.save`; valores nos limites continuam válidos e approval permanece
`pending`. Verify passou com 108 arquivos/394 testes pass/18 skips e coverage
85,45%/80,83%/85,26%/86,45%; readiness 4/4, E2E 3/3, PostgreSQL 51/18, audit
0, format e diff check PASS. Evidência:
`docs/04_audit/0520_plat_s30_controlled_approval_request_field_boundary_evidence.md`.

## Sprints controlados anteriores — estado atual `PLAT-S29`

## Sprint de boundary controlado de campos de tarefa interna — `PLAT-S29`

Esta sprint fecha somente a ausência de máximos nos campos livres de criação de
tarefa interna. O schema compartilhado deve rejeitar valores acima dos limites
antes do repositório; criação válida, tenant/auth, idempotência e Secretary
permanecem inalterados.

### `PLAT-S29-001` — Controlled Internal Task Field Boundary

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: api/agent-core/security
- dependências: `PLAT-S28-001`, `PLAT-S24-001`, `PLAT-FOUNDATION-009`
- escopo: limitar `sessionId` 160, `title` 200, `description` 4.000,
  `source` 120 e `idempotencyKey` 200 no `CreateInternalTaskSchema`, mantendo
  o mínimo 8 da chave
- aceite: cada valor acima do limite falha com `validation_failed`/400 sem
  chamar `tasks.create`; payload válido continua 200 e preserva os valores
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: somente validação de entrada e fixtures; sem mudança de auth, tenant,
  identidade, persistência estrutural, provider/canal, RAG, dado real, deploy
  ou side effect
- evidência: `docs/04_audit/0519_plat_s29_controlled_internal_task_field_boundary_evidence.md`

### Registro controlado PLAT-S29

A descoberta reproduziu uma criação fictícia com quatro campos de tarefa de
5.000 caracteres persistidos. RED/GREEN, regressão próxima, verify e gates
externos foram concluídos como `COMPLETED_CONTROLLED`; produção real e
integrações externas continuam fora do escopo.

### Resultado controlado PLAT-S29

O schema compartilhado agora rejeita os cinco campos acima dos máximos antes de
`tasks.create`; valores nos limites continuam válidos. Verify passou com 107
arquivos/389 testes pass/18 skips e coverage 85,45%/80,83%/85,26%/86,45%;
readiness 4/4, E2E 3/3, PostgreSQL 51/18, audit 0, format e diff check PASS.
Evidência: `docs/04_audit/0519_plat_s29_controlled_internal_task_field_boundary_evidence.md`.

## Sprints controlados anteriores — estado atual `PLAT-S28`

## Sprint de boundary controlado de filtros duplicados de audit evidence — `PLAT-S28`

Esta sprint fecha somente a ambiguidade de filtros repetidos na consulta de
audit evidence. A API deve rejeitar arrays de `sessionId`, `correlationId`,
`actorId` e `type` antes de summary/page; valores únicos e paginação permanecem
inalterados.

### `PLAT-S28-001` — Controlled Audit Filter Duplicate Boundary

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: api/audit/security
- dependências: `PLAT-S27-001`, `PLAT-S25-001`, `PLAT-FOUNDATION-009`
- escopo: rejeitar filtros de query repetidos com mensagem constante e
  `validation_failed`/400 antes de chamar o repositório
- aceite: filtros únicos continuam funcionando; qualquer filtro repetido falha
  antes de `summarizeEvidence`/`listEvidence`; envelope, paginação, auth, tenant
  e Secretary permanecem verdes
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem mudança de offset/limit, auth, tenant, identidade, persistência,
  provider/canal, RAG, dado real, deploy ou side effect
- evidência: `docs/04_audit/0518_plat_s28_controlled_audit_filter_duplicate_boundary_evidence.md`

### Registro controlado PLAT-S28

Gap reproduzido no checkout: `sessionId=a&sessionId=b` retornou 200 e somente o
primeiro valor `a` foi encaminhado ao repositório. O próximo passo obrigatório é
RED; a implementação, regressão, verify e gates externos foram concluídos como
`COMPLETED_CONTROLLED`.

### Resultado controlado PLAT-S28

Filtros repetidos de `sessionId`, `correlationId`, `actorId` e `type` agora
falham com `validation_failed`/400 antes de summary/page; filtro único,
paginação, S27, Secretary e demais limites permanecem verdes. Evidência:
`docs/04_audit/0518_plat_s28_controlled_audit_filter_duplicate_boundary_evidence.md`.
Produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## Sprint de boundary controlado de offset de paginação — `PLAT-S27`

Esta sprint fecha somente o tamanho do `offset` numérico usado por listagens de
conversas e evidências. A API deve rejeitar offsets não seguros ou acima de
10.000 antes de atingir os repositórios; limite, envelope e dados existentes
permanecem inalterados.

### `PLAT-S27-001` — Controlled Pagination Offset Boundary

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: api/persistence/security
- dependências: `PLAT-S26-001`, `PLAT-S24-001`, `PLAT-FOUNDATION-009`
- escopo: declarar limite de offset 10.000, rejeitar números não seguros e
  aplicar o mesmo contrato a conversas e audit evidence
- aceite: offsets 0..10.000 funcionam; valores negativos, não inteiros, não
  seguros ou acima do limite falham com `invalid_pagination`/400 sem chamar
  repositório; endpoints existentes e Secretary permanecem verdes
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem mudança de limit, cursor, auth, tenant, identidade, Secretary,
  persistência estrutural, provider/canal, RAG, dado real, deploy ou side effect
- evidência: `docs/04_audit/0517_plat_s27_controlled_pagination_offset_boundary_evidence.md`

### Registro controlado PLAT-S27

Gap reproduzido no checkout: `offset=1e100` e `offset=9007199254740992`
retornaram 200 no endpoint de conversas em memória; a mesma entrada é usada
como `OFFSET` parametrizado no PostgreSQL. O gate é
`SPEC_APPROVED_CONTROLLED_BUILD`; RED/GREEN, regressão próxima, verify e gates
externos foram concluídos como `COMPLETED_CONTROLLED`.

### Resultado controlado PLAT-S27

Offset seguro e bounded de 0 a 10.000 foi aplicado em conversas e audit
evidence. Valores inválidos falham com `invalid_pagination`/400 antes do
repositório; limit, cursor, auth, tenant, Secretary e demais limites
permaneceram inalterados. Evidência:
`docs/04_audit/0517_plat_s27_controlled_pagination_offset_boundary_evidence.md`.
Produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## Sprint de boundary controlado de mensagens de erro do Prompt Profile — `PLAT-S26`

Esta sprint fecha somente o echo de identificadores fornecidos pelo operador em
mensagens de `DomainError` do Prompt Profile. O envelope, código HTTP, correlação,
validação e criação imutável de versões permanecem inalterados.

### `PLAT-S26-001` — Controlled Prompt Profile Error Message Boundary

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: platform/api/security
- dependências: `PLAT-S25-001`, `PLAT-S12-001`, `PLAT-FOUNDATION-009`
- escopo: substituir mensagens interpoladas com chave/ID de prompt ou template
  por mensagens constantes no boundary de clone/integridade
- aceite: chave de response template inválida, ID duplicado e ID de block
  protegido não aparecem no `error.message`; o status, código, envelope,
  correlation ID e ausência de clone permanecem corretos
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem mudança de auth, tenant, identidade, Secretary, persistência,
  provider/canal, RAG, dado real, deploy, side effect ou de outros contratos
  de negócio
- evidência: `docs/04_audit/0516_plat_s26_controlled_error_message_boundary_evidence.md`

### Registro controlado PLAT-S26

Gap reproduzido no checkout: um `responseTemplates` key inválido enviado ao
clone retorna o próprio valor no `error.message`, embora o payload devesse ser
tratado como dado não confiável. O BUILD está autorizado somente após o gate
`SPEC_APPROVED_CONTROLLED_BUILD`; o próximo passo obrigatório é RED.

### Resultado controlado PLAT-S26

`PLAT-S26-001_CONTROLLED_PROMPT_PROFILE_ERROR_MESSAGE_BOUNDARY` =
`COMPLETED_CONTROLLED`. A suíte S26 passou 4/4; a regressão próxima passou
3 arquivos/21 testes; verify passou com 104 arquivos/371 testes pass/18 skips;
coverage 85,41%/80,77%/85,24%/86,42%; readiness 4/4; E2E 3/3; PostgreSQL
51 pass/18 skips; audit 0; format e diff check PASS. Evidência:
`docs/04_audit/0516_plat_s26_controlled_error_message_boundary_evidence.md`.
Produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## Sprint de boundary controlado do request-target HTTP — `PLAT-S25`

Esta sprint fecha somente a exposição do request-target e a ausência de um
limite explícito para a entrada de roteamento. Rotas desconhecidas devem usar
o envelope API sem refletir path/query; request-targets acima de 8 KiB falham
com 414. O Secretary, os handlers de negócio e as integrações permanecem
inalterados.

### `PLAT-S25-001` — Controlled HTTP Request-Target Boundary

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: api/security/operations
- dependências: `PLAT-S24-001`, `PLAT-S18-001`, `PLAT-FOUNDATION-009`
- escopo: limite explícito de 8192 bytes para request-target bruto, limite
  explícito de 100 caracteres por parâmetro de rota e `setNotFoundHandler`
  redaction-safe com envelope/correlation ID server-generated
- aceite: rota desconhecida retorna 404 `not_found` sem refletir request-target;
  request-target acima do limite retorna 414 `request_uri_too_long` sem echo;
  parâmetros excessivos e query/path com segredo não vazam; `/health`,
  Secretary e security boundaries existentes permanecem verdes
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem alteração de auth, tenant, identidade, body/parser S24,
  Secretary, persistência, provider/canal, RAG, dado real, deploy ou side effect
- evidência: `docs/04_audit/0515_plat_s25_controlled_http_target_boundary_evidence.md`

### Registro controlado PLAT-S25

Gap reproduzido no checkout: 404 padrão do Fastify refletia o path completo de
uma rota não encontrada, enquanto request-targets grandes eram aceitos sem um
contrato explícito. O boundary foi fechado com envelope 404, 414 bounded e
limites de roteamento explícitos.

### Resultado controlado PLAT-S25

`PLAT-S25-001_CONTROLLED_HTTP_TARGET_BOUNDARY` = `COMPLETED_CONTROLLED`.
Focused S25 passou 8/8; verify passou com 103 arquivos/367 testes pass/18
skips; coverage 85,41%/80,76%/85,24%/86,42%; readiness 4/4; E2E 3/3;
PostgreSQL 51 pass/18 skips; audit 0; format e diff check PASS. Evidência:
`docs/04_audit/0515_plat_s25_controlled_http_target_boundary_evidence.md`.
Produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## Sprint de boundary de parsing HTTP e payload controlado — `PLAT-S24`

Esta sprint fecha somente a fronteira de entrada do Fastify: parser JSON,
media type e tamanho máximo de body. O limite é explícito e o erro de parsing
retorna o envelope API sem refletir mensagem bruta, stack, header ou payload.

### `PLAT-S24-001` — Controlled HTTP Parse and Payload Boundary

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: api/security/operations
- dependências: `PLAT-S23-001`, `PLAT-S18-001`, `PLAT-FOUNDATION-009`
- escopo: `bodyLimit` explícito de 1 MiB, parser JSON bounded, classificação
  segura de JSON inválido/body excessivo/media type não suportado e error
  handler global com envelope/correlation ID
- aceite: body acima do limite falha com 413 e código `payload_too_large`;
  JSON inválido falha com 400 e `validation_failed`; media type não suportado
  falha com 415 e `unsupported_media_type`; nenhuma resposta expõe erro bruto,
  stack, cause, raw body ou mensagem de parser; rotas Secretary e security
  boundaries existentes permanecem verdes
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem upload, streaming, provider/canal, RAG, dados reais, deploy,
  alteração de autenticação/tenant ou side effect
- evidência: `docs/04_audit/0514_plat_s24_controlled_http_parse_payload_boundary_evidence.md`

### Resultado controlado PLAT-S24

O boundary foi implementado com bodyLimit explícito de 1 MiB, parser JSON
classificado e error handler global redaction-safe. JSON inválido, media type
não suportado e body excessivo retornam envelopes 400/415/413 com correlation
ID server-generated; erros desconhecidos caem em 500 genérico. Gates: `npm run
verify` PASS; 102 arquivos/359 testes pass/18 skips; coverage
85,46%/80,85%/85,21%/86,40%; readiness 4/4; E2E 3/3; PostgreSQL controlado
51 pass/18 skips; audit 0; format e diff check PASS. Produção real permanece
`NO-GO`/`WAITING_HUMAN_APPROVAL`.

### `PLAT-FOUNDATION-001` — harness hermético

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: runtime/platform
- escopo: aliases Vitest locais, teste de resolução e verificação de caminho
- aceite: import de `@cvg/shared` e `@cvg/persistence` vem do workspace atual em todos os testes

### `PLAT-FOUNDATION-002` — contratos e store de AgentVersion

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: control-plane
- escopo: tenant, agent, versões, lifecycle, publish/rollback, imutabilidade
- aceite: draft → testing → approved → published; rollback sem mutar snapshot anterior

### `PLAT-FOUNDATION-003` — prompt/model/policy declarativos

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: policy/runtime
- escopo: prompt blocks, model refs sem segredo, policy layers e response templates
- aceite: composição determinística e hard safety vence toda configuração

### `PLAT-FOUNDATION-004` — plugin registry e capability gateway

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: runtime/security
- escopo: manifest, binding, permission, risk, approval, audit e execução fake
- aceite: tool desconhecida ou não autorizada nunca executa

### `PLAT-FOUNDATION-005` — Test Lab dry-run/trace

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: test-lab
- escopo: input/history/context → intent/policy/knowledge/tool/response/handoff/trace
- aceite: sem canal ou efeito real; trace contém agent/version/config/policy decisions

### `PLAT-FOUNDATION-006` — API/UI Control Center

- prioridade: P1
- estado: COMPLETED_CONTROLLED
- owner: control-plane/web
- dependências: 002–005
- aceite: Admin tenant-aware cria draft, roda lab, publica e faz rollback

### `PLAT-FOUNDATION-007` — persistência PostgreSQL aditiva

- prioridade: P1
- estado: COMPLETED_CONTROLLED
- owner: persistence
- dependências: 002–005
- aceite: migration e smoke sem alterar o data plane legado

### `PLAT-FOUNDATION-008` — takeover state machine

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: handoff
- dependências: 002, 004, 005
- aceite: bot silencioso durante `HUMAN_ACTIVE`; return explícito e auditado

### `PLAT-FOUNDATION-009` — hardening/release candidate audit

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: audit/security
- dependências: 001–008
- aceite: verify, coverage local, Postgres, E2E, security review, boundary report e signoff template

## Sprint de hardening controlado — `PLAT-S02`

Esta sprint corrige gaps encontrados na auditoria do MVP controlado. Ela não altera o limite de release: continua sem dados reais, provider/canal real, RAG real ou ações sensíveis.

### `PLAT-HARDENING-001` — edição versionada pelo Control Center

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: control-plane/web
- escopo: clonar uma versão como novo snapshot, validar pertencimento tenant/agent e permitir edição controlada pela UI sem mutar versões anteriores
- aceite: Admin altera uma configuração pela UI, o sistema cria nova versão DRAFT, o snapshot original permanece intacto e a ação é auditada

### `PLAT-HARDENING-002` — approval e trace fail-closed

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: runtime/security
- escopo: transformar `requires_approval` em handoff seguro no Test Lab e rejeitar traces cujo agent/version não pertençam ao escopo
- aceite: nenhuma ação que exige aprovação gera resposta afirmativa ou persiste trace órfão/cross-object

### `PLAT-HARDENING-003` — publish PostgreSQL serializado

- prioridade: P1
- estado: COMPLETED_CONTROLLED
- owner: persistence
- escopo: bloquear o agent/version corrente dentro da transação de publicação e cobrir o contrato no fake e no smoke de persistência
- aceite: publicações concorrentes não deixam mais de uma versão PUBLISHED nem activeVersionId divergente

### `PLAT-HARDENING-004` — Trace Viewer operacional completo

- prioridade: P1
- estado: COMPLETED_CONTROLLED
- owner: web/audit
- escopo: exibir policy reason, knowledge, handoff, resposta e provider no trace selecionado, mantendo redaction e `externalCall: false`
- aceite: operador Admin consegue investigar uma execução fictícia sem abrir payload bruto ou segredo

## Sprint de fronteira pré-produção — `PLAT-S03`

Esta sprint fecha a fronteira técnica de tenant isolation sem ativar dados reais, canais reais ou ações sensíveis. A migration é aditiva, opt-in no runner de produção e fail-closed para linhas legadas sem mapeamento seguro.

### `PLAT-S03-001` — contexto PostgreSQL por tenant e RLS do data plane legado

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: persistence/security
- dependências: `PLAT-FOUNDATION-007`, `PLAT-HARDENING-002`, decisão humana de backfill para dados legados reais
- escopo: runner versionado de migrations, policy RLS para conversas e tabelas filhas, coluna tenant-aware de auditoria/outbox, pool de conexões com contexto tenant resetado e guard de startup para produção
- aceite controlado: tenant A não consegue ler, escrever ou listar dados de tenant B sob `FORCE ROW LEVEL SECURITY`; operações do runtime e control plane usam conexão dedicada por escopo; conexão nunca retorna ao pool com contexto residual; migration antiga continua intacta; linhas históricas nulas ou incompatíveis ficam quarentenadas e invisíveis
- evidência: migration versionada/checksum, baseline legado explícito com aprovação, preflight obrigatório mesmo com auto-migration desligado, policies exatas, role runtime DML-only, auditoria com tenant explícito e fixture PostgreSQL real
- limite: não executar backfill em banco real, não inferir dono de linhas órfãs, não autorizar produção irrestrita até signoff de retenção, IdP, role mapping e plano de migration

## Sprint de autorização durável e gateway legado — `PLAT-S04`

Esta sprint permanece controlada e registrada antes do BUILD. Ela fecha a autoridade de approval e a adaptação mínima do `ToolRegistry` sem habilitar provider, canal, RAG, agenda real ou qualquer efeito externo.

### `PLAT-S04-001` — approval capability durável e adapter seguro do legado

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: platform/security/persistence
- dependências: `PLAT-S03-001`, decisão humana para qualquer ativação real
- escopo: authority de approval tenant/agent/version/tool/input-hash/actor/nonce/expiry/revocation/consumption; persistência PostgreSQL com RLS e conexão transacional checked-out; adapter único para `find_available_slots` em modo dry-run; qualquer outra ferramenta bloqueada
- aceite controlado: aprovação não pode ser reutilizada, trocada de input ou consumida por outro actor; revogação/expiração falham fechadas; gateway é o único caminho; adapter não confirma/cancela/reagenda nem chama provider real
- limite: issuer/verifier operacional, IdP, Redis, providers/canais e side effects reais seguem bloqueados

### `PLAT-S04-002` — HMAC e replay protection no webhook controlado

- prioridade: P1
- estado: COMPLETED_CONTROLLED
- owner: api/security
- dependências: `PLAT-FOUNDATION-009`, decisão humana para provider/canal real
- escopo: assinatura HMAC-SHA256 sobre raw body, event id, janela temporal, rotação controlada de segredo, replay lease, purge e recuperação de reserva stale; fixture usa store em memória e PostgreSQL controlado compartilha reservas entre instâncias
- aceite controlado: payload adulterado, canal trocado, timestamp stale, header ausente e replay são rejeitados; purge, concorrência, commit/release e recuperação de lease PostgreSQL passam em fixture real; HA/observabilidade operacionais permanecem fora do slice

### `PLAT-S04-003` — retry idempotente e finalização transacional do inbound

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: runtime/persistence
- dependências: `PLAT-S03-001`, `PLAT-S04-001`, decisão humana para rollout real
- escopo: marcador `messages.runtime_status`, reprocessamento seguro de duplicata pendente após falha parcial, finalização PostgreSQL na mesma transação que outbound/tool audit/trace/integration audit e coordenação com lease HMAC recuperável
- aceite controlado: falha antes do commit deixa o evento retryable; execução já concluída não duplica efeitos; tenant, takeover e runtime status são verificados sob lock
- limite: fila/worker distribuído, provider real, compensação de side effects e operação multi-região seguem fora do slice

## Sprint de fechamento do Test Lab controlado — `PLAT-S05`

Esta sprint foi registrada após a auditoria atual do checkout e permanece restrita a
fixtures, dry-run e efeitos controlados. Ela não altera o boundary de produção.

### `PLAT-S05-001` — trace seguro, segurança clínica e fechamento do Control Center

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: platform/security/web
- dependências: `PLAT-S04-001..003`
- escopo: completar metadados seguros do Test Lab (risco, prompt snapshot, timestamps/status, latência, uso estimado de tokens e spans); tornar explícita a rota segura para pedido de medicamento veterinário; validar IDs do CapabilityGateway na fronteira; corrigir o binding de versão de knowledge enviado pelo Control Center e exibir os novos metadados no Trace Viewer
- aceite: `Meu cachorro está vomitando. Posso dar dipirona?` nunca prescreve, nunca chama ferramenta/provedor externo e retorna handoff/bloqueio seguro com trace redigido; IDs malformados são rejeitados antes de resolver plugin/handler; a versão de knowledge configurada é a mesma enviada ao Test Lab; snapshots e runtime legado permanecem verdes
- evidência: `docs/platform/final-technical-audit.md`; `npm run verify`, readiness, Playwright E2E, smoke PostgreSQL e auditoria de dependências passaram na árvore final
- limite: não criar provider/canal/RAG/agendamento real, não ativar dados reais e não alterar decisões humanas de produção

### `PLAT-S05-002` — preset controlado `CVG Secretary`

- prioridade: P1
- estado: COMPLETED_CONTROLLED
- owner: control-plane/runtime
- dependências: `PLAT-FOUNDATION-002..006`, `PLAT-S05-001`
- escopo: disponibilizar um bootstrap idempotente, fictício e versionado do primeiro agente `CVG Secretary` para desenvolvimento, preservando a porta de `ControlPlaneStore` e sem alterar dados existentes
- aceite: ambiente de desenvolvimento inicia com `CVG Secretary` publicado no tenant controlado, com persona/greeting/policy/handoff/plugin controlados; repetir o bootstrap não cria versões duplicadas; teste e produção não sofrem mutação automática
- evidência: `packages/platform/src/secretary-preset.ts`, testes de lifecycle/bootstrap e `docs/platform/final-technical-audit.md`
- limite: nenhum tenant real, secret real, fonte institucional real, provider/canal, agenda, dado ou side effect externo

### `PLAT-S06-001` — catálogo persistente de TestCase/TestSuite e avaliação A/B controlada

- prioridade: P1
- estado: COMPLETED_CONTROLLED
- owner: platform/qa/control-plane
- dependências: `PLAT-S05-001`, decisão de modelo de governança de suites
- escopo: persistir suites tenant-aware ancoradas em agente/versão, executar avaliações reproduzíveis, registrar histórico redigido de runs e comparar duas versões no Test Lab sem canal/provider real
- aceite: suite criada/listada/atualizada por nova versão sem mutação destrutiva; avaliação A/B valida que ambas as versões pertencem ao mesmo agente/tenant; cada trace permanece redigido e `externalCall: false`; nenhuma publicação automática ocorre
- evidência: `docs/04_audit/0496_plat_s06_suite_catalog_evidence.md`, `packages/persistence/migrations/0003_test_suite_catalog.sql`, verify, readiness, E2E e smoke PostgreSQL controlado
- limite: não ativar tráfego real, rollout gradual real, provider/canal real ou decisão automática de publicação

## Sprint de consistência multioperador controlada — `PLAT-S07`

Esta sprint trata somente conflito otimista nas mutações de lifecycle do Control Center. Ela não transforma a store controlada em coordenação distribuída nem autoriza produção real.

### `PLAT-S07-001` — compare-and-swap de lifecycle e resposta HTTP 409

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: control-plane/persistence/web
- dependências: `PLAT-S06-001`, `PLAT-FOUNDATION-002`, `PLAT-S03-001`
- escopo: aceitar `expectedStatus` nas transições, publish e rollback; rejeitar snapshot stale com erro `conflict`/HTTP 409; preservar transação e condição de status no PostgreSQL; enviar o status observado pelo Control Center
- aceite: dois operadores com o mesmo snapshot não conseguem sobrescrever a decisão do primeiro; o segundo recebe conflito explícito, sem mutação parcial, e o fluxo legacy sem precondition continua compatível apenas no boundary controlado
- evidência: `docs/04_audit/0497_plat_s07_optimistic_conflict_evidence.md`; verify, readiness, E2E, smoke PostgreSQL controlado, format e diff check
- limite: não declarar HA, lock distribuído, ETag de proxy, sessão de IdP ou coordenação multi-região; qualquer rollout real exige novo SPEC e aprovação humana

## Sprint de integridade de manifests e reprodutibilidade controlada — `PLAT-S08`

Esta sprint trata somente da integridade semântica dos manifests e da seleção determinística de versões no registry local. Ela não cria marketplace, instala código de terceiros, persiste handlers ou habilita provider/canal.

### `PLAT-S08-001` — validação semântica e version pinning de plugins

- prioridade: P1
- estado: COMPLETED_CONTROLLED
- owner: runtime/security/control-plane
- dependências: `PLAT-S07-001`, `PLAT-FOUNDATION-004`
- escopo: rejeitar manifestos com ferramentas duplicadas, permissões ausentes, dependência de si próprio ou coleções ambíguas; permitir versões imutáveis do mesmo plugin; aceitar `version` opcional no binding para pinning; resolver a versão mais alta de forma determinística somente quando o binding legacy não fixa versão
- aceite: binding pinned para versão inexistente falha fechado sem chamar handler; binding pinned chama somente a versão exata; binding sem pinning preserva compatibilidade e escolhe a versão determinística; registry retorna cópias defensivas
- evidência: `docs/04_audit/0498_plat_s08_plugin_manifest_versioning_evidence.md`; verify, readiness, E2E, smoke PostgreSQL controlado, format e diff check
- limite: não persistir catálogo, não executar código externo, não resolver dependências de rede, não criar marketplace e não declarar readiness de produção

## Sprint de catálogo declarativo de plugins controlado — `PLAT-S09`

Esta sprint persiste somente metadata e manifests validados, com escopo por tenant e lifecycle aprovado/arquivado. Não instala código, não cria marketplace aberto, não resolve dependências por rede e não conecta o catálogo a provider/canal real.

### `PLAT-S09-001` — catálogo tenant-aware de manifests sem handlers

- prioridade: P1
- estado: COMPLETED_CONTROLLED
- owner: control-plane/persistence/security
- dependências: `PLAT-S08-001`, `PLAT-S03-001`
- escopo: criar/listar/ler manifests declarativos imutáveis, transicionar DRAFT → APPROVED/ARCHIVED com precondition, persistir em memória e PostgreSQL com RLS e expor API admin tenant-scoped
- aceite: nome/versão duplicados no tenant falham; catálogo A não é visível para B; manifest e identidade permanecem imutáveis; transição stale retorna conflito sem mutação; APPROVED só representa metadata revisada, nunca autorização de handler
- evidência: `docs/04_audit/0499_plat_s09_plugin_catalog_evidence.md`; migration `0004_plugin_manifest_catalog.sql`; verify, readiness, E2E, smoke PostgreSQL, format, diff check e audit
- limite: não instalar/executar código, não buscar dependências externas, não fazer marketplace, provider/canal, dados reais ou produção irrestrita

## Sprint de operação do catálogo declarativo — `PLAT-S10`

Esta sprint fecha somente a lacuna de superfície operacional identificada na
auditoria: o catálogo S09 tem API e persistência, mas ainda não é visível e
mutável pelo Control Center. O lane não altera o boundary metadata-only.

### `PLAT-S10-001` — Control Center tenant-aware para catálogo de plugins

- prioridade: P1
- estado: COMPLETED_CONTROLLED
- owner: web/control-plane/security
- dependências: `PLAT-S09-001`, `PLAT-FOUNDATION-006`
- escopo: client web e seção do Control Center para listar, criar e transicionar
  manifests declarativos via API existente, com headers de identidade/tenant,
  precondition stale e estados visíveis de erro/vazio
- aceite: Admin lista somente o catálogo do próprio tenant; cria um manifest
  metadata-only sem segredo/código; aprova ou arquiva com `expectedStatus`; a
  UI diferencia conflito 409; `APPROVED` é apresentado como metadata revisada
  sem habilitar handler, permission, provider, canal ou side effect
- evidência: `docs/04_audit/0500_plat_s10_plugin_catalog_control_center_evidence.md`;
  testes do client/UI, verify, readiness, E2E, diff/audit e smoke PostgreSQL
- limite: sem migration, marketplace, instalação, dependências de rede, health
  probe externo, handlers persistentes, provider/canal, dados reais ou produção
  irrestrita

## Sprint de eventos internos e hooks controlados — `PLAT-S11`

Esta sprint fecha a lacuna de execução observável dos `hooks` declarados no
manifest. O barramento é process-local, best-effort e não conecta o catálogo de
metadata a handlers executáveis.

### `PLAT-S11-001` — event bus tipado e hooks tenant-scoped

- prioridade: P1
- estado: COMPLETED_CONTROLLED
- owner: runtime/security/platform
- dependências: `PLAT-S10-001`, `PLAT-S08-001`, `PLAT-FOUNDATION-005`
- escopo: allowlist de eventos, inscrição por plugin local com hook declarado,
  tenant explícito, payload redigido/imutável, isolamento de falhas e emissão
  observacional no Test Lab
- aceite: evento desconhecido, tenant/ID inválido, hook não declarado ou
  handler ausente falha fechado; hooks só recebem o próprio tenant; mutação do
  envelope não altera a origem; erro de um hook não para outros nem o Test Lab;
  eventos representativos ficam cobertos sem dispatch externo
- evidência: `docs/04_audit/0501_plat_s11_event_bus_hooks_evidence.md`; testes
  unitários de bus/registry, integração do Test Lab, `npm run verify`,
  readiness, E2E, PostgreSQL controlado, `npm audit`, `git diff --check` e
  auditoria técnica
- limite: sem broker, retry/outbox, webhook, catálogo executável, marketplace,
  provider/canal, payload bruto, dado real ou produção irrestrita

## Sprint de prompt profile e templates controlados — `PLAT-S12`

Esta sprint fecha a lacuna entre o contrato já versionado de prompts/templates
e a operação do Control Center. O `AgentVersion` continua sendo o snapshot
imutável; não será criado um catálogo mutável paralelo.

### `PLAT-S12-001` — editor versionado de prompt profile e templates

- prioridade: P1
- estado: COMPLETED_CONTROLLED
- owner: web/runtime/security
- dependências: `PLAT-S11-001`, `PLAT-FOUNDATION-003`, `PLAT-FOUNDATION-006`
- escopo: editor JSON de prompt blocks/templates, validação fail-closed,
  proteção de blocos kernel/safety, templates operacionais controlados,
  checksum/status no trace e integração com o Test Lab dry-run
- aceite: JSON inválido, ids/kinds/prioridades duplicados, excesso de tamanho,
  segredo ou bloco protegido alterado falham sem criar versão; salvar sempre
  clona uma nova AgentVersion; `system`/`safety` e respostas kernel são
  preservados; baixa confiança, knowledge ausente, handoff e scheduling sem
  evidência usam templates seguros; checksum é determinístico e aparece no
  trace; todos os gates existentes permanecem verdes
- evidência: `docs/04_audit/0502_plat_s12_prompt_profile_template_control_center_evidence.md`; suíte 77 arquivos/279 testes/16 skips, coverage 84,92%/80,30%/85,76%/85,87%, readiness, build, E2E, PostgreSQL controlado, audit e diff check
- limite: sem catálogo mutável, migration, provider/canal, RAG institucional,
  dados reais, ação sensível, side effect ou produção irrestrita

## Limites preservados

- Nenhum segredo, dado real ou chamada externa entra na implementação.
- Não há aprovação para produção irrestrita, backfill real, IdP real, limiter distribuído/replay store real, retenção legal ou ações clínicas/financeiras.

Durante `PLAT-S03` e `PLAT-S04`, RLS, approval e webhook security são preparados e verificados somente em fixtures. O caminho de produção exige migration, pool tenant-scoped, IdP, stores distribuídos e change control aprovados; ausência dessas condições deve interromper o startup.

## Decisões humanas bloqueadas

- tenant/cargos reais e mapeamento RBAC;
- fonte RAG institucional e ciclo de aprovação;
- provider/modelo real, custos e secret refs;
- destinos de handoff reais;
- qualquer piloto, canal, dado ou ação sensível.

## Sprint de Handoff Policy Studio controlado — `PLAT-S13`

Esta sprint fecha a lacuna operacional de thresholds, clarificações, destinos
e prioridade sem conectar o runtime a qualquer canal ou side effect.

### `PLAT-S13-001` — Handoff Policy Studio

- prioridade: P1
- estado: COMPLETED_CONTROLLED
- owner: policy/runtime/web/security
- dependências: `PLAT-S12-001`, `PLAT-FOUNDATION-003`, `PLAT-FOUNDATION-008`
- escopo: fields opcionais de clarify/handoff threshold, max clarifications,
  múltiplos destinos, prioridade, evaluator determinístico, trace redigido e
  edição/clonagem no Control Center
- aceite: limites e relação de thresholds falham fechado; legado continua
  compatível; UI salva nova AgentVersion; runtime faz clarify/handoff conforme
  threshold; risco alto/crítico vira prioridade high; trace exibe destino e
  prioridade sem dispatch
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`, sem dados reais, provider/canal,
  migration, RAG ou side effect
- evidência: `docs/04_audit/0503_plat_s13_handoff_policy_studio_evidence.md`
- entrega: concluída com thresholds bounded, limite de clarificações, múltiplos
  destinos, prioridade, evaluator determinístico, trace redigido, validação
  fail-closed na UI e integração E2E browser/API

## Sprint de preflight crítico antes de publish controlado — `PLAT-S14`

Esta sprint adiciona uma barreira obrigatória e reproduzível antes de qualquer
publish/rollback administrativo, sem ampliar o boundary controlado.

### `PLAT-S14-001` — Controlled Safety Publish Preflight

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: security/runtime/api/web
- dependências: `PLAT-S06-001`, `PLAT-S07-001`, `PLAT-S13-001`
- escopo: cases críticos fixos, resultado redigido, endpoint de preflight e
  enforcement em publish/rollback
- aceite: medication exige blocked+handoff; confirmação/cancelamento/
  reagendamento/envio externo exigem blocked; qualquer falha não muta versão
  nem activeVersion; audit sem payload bruto; `externalCall: false`; CAS stale
  continua protegido
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`, somente fixtures/Test Lab, sem
  provider/canal/RAG/migration/dado real/side effect
- evidência: `docs/04_audit/0504_plat_s14_controlled_safety_publish_preflight_evidence.md`
- entrega: cases críticos fixos, resumo redigido, endpoint de preflight e
  enforcement fail-closed em publish/rollback; 80 arquivos/289 testes pass/
  16 skips, coverage 85,06%/80,38%/85,97%/85,98%, E2E, PostgreSQL, audit e
  diff check PASS

## Sprint de catálogo controlado de fontes de knowledge — `PLAT-S15`

Esta sprint fecha a lacuna de provenance administrativa sem armazenar conteúdo
ou conectar o runtime a RAG.

### `PLAT-S15-001` — Controlled Knowledge Source Catalog

- prioridade: P1
- estado: COMPLETED_CONTROLLED
- owner: knowledge/runtime/api/web/security
- dependências: `PLAT-S05-001`, `PLAT-S06-001`, `PLAT-S14-001`
- escopo: metadata source/version/label/description, lifecycle, unique/RLS,
  API admin, client/Control Center e audit redigido
- aceite: somente `controlled://`, sem segredo/conteúdo/URL externa, duplicate
  e transição stale falham; APPROVED continua metadata-only; tenant isolation
  e PostgreSQL fixture cobertos
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`, sem ingestão, RAG, provider/canal,
  dado real, migration operacional ou side effect
- evidência: `docs/04_audit/0505_plat_s15_controlled_knowledge_source_catalog_evidence.md`
- gates finais: 83 arquivos/294 testes pass/17 skips, coverage 85,03%/80,26%/
  85,41%/85,88%, readiness, E2E, PostgreSQL controlado, audit, format e diff
  check PASS

## Sprint de ledger controlado de evidência de release candidate — `PLAT-S16`

Esta sprint registra a evidência administrativa observada para uma versão sem
transformar a declaração em publish, deploy ou autorização de produção.

### `PLAT-S16-001` — Controlled Release Candidate Evidence Ledger

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: release/security/runtime/api/web
- dependências: `PLAT-S14-001`, `PLAT-S15-001`, `PLAT-FOUNDATION-006`
- escopo: record tenant-aware vinculado a agent/version, quatro gates fixos,
  evidence refs controladas, digest determinístico, lifecycle/CAS, unique/RLS,
  migration `0006`, API/UI e audit metadata-only
- aceite: shape strict e secret-free; `VALIDATED` exige todos os gates PASS;
  stale/invalid/duplicate/cross-tenant falham; digest não é fornecido pelo
  caller; nenhuma transição muta AgentVersion/activeVersionId ou executa
  capability/provider/canal
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`, sem deploy, rollout, IdP real,
  provider/canal, RAG, dado real, assinatura externa ou side effect
- evidência: `docs/04_audit/0506_plat_s16_controlled_release_candidate_evidence_ledger_evidence.md`
- gates finais: 88 arquivos/303 testes pass/18 skips, coverage 84,81%/80,03%/
  84,87%/85,65%, readiness, E2E, PostgreSQL controlado, audit, format e diff
  check PASS

## Sprint de checkpoint controlado de evidência de auditoria — `PLAT-S17`

Esta sprint cria uma declaração imutável do conjunto de eventos de auditoria
revisado, sem transformar observabilidade em export externo ou retenção real.

### `PLAT-S17-001` — Controlled Audit Evidence Checkpoint

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: audit/security/runtime/api/web
- dependências: `PLAT-S16-001`, `PLAT-FOUNDATION-006`
- escopo: IDs de eventos bounded, filtros strict, digest server-side,
  checkpoint `SEALED/ARCHIVED`, migration `0007`, RLS, API/client/UI e audit
  metadata-only
- aceite: inexistente/cross-tenant/out-of-filter falha; payload não é
  persistido nem exportado; digest não vem do caller; archive exige CAS;
  eventos existentes permanecem inalterados
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`, sem payload bruto, export externo,
  retenção real, provider/canal, RAG, dado real ou side effect
- evidência: `docs/04_audit/0507_plat_s17_controlled_audit_evidence_checkpoint_evidence.md`

### Resultado controlado PLAT-S17

O checkpoint foi entregue com input strict/bounded, verificação tenant-aware,
digest SHA-256 server-side, lifecycle `SEALED -> ARCHIVED` com CAS,
migration/RLS, memória/PostgreSQL, API/client/UI e audit metadata-only. Gates:
`npm run verify` PASS; 95 arquivos/317 testes pass/18 skips; coverage
84,95%/80,00%/84,52%/85,82%; readiness 4/4; E2E 2/2; PostgreSQL controlado
51 pass/18 skips; audit 0 e diff check PASS. Evidência:
`docs/04_audit/0507_plat_s17_controlled_audit_evidence_checkpoint_evidence.md`.
Produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## Sprint de boundary HTTP de segurança controlado — `PLAT-S18`

Esta sprint fecha uma lacuna de borda sem assumir que o host, proxy ou IdP real
está configurado.

### `PLAT-S18-001` — Controlled HTTP Security Boundary

- prioridade: P0
- estado: COMPLETED_CONTROLLED
- owner: api/security/operations
- dependências: `PLAT-S17-001`, `PLAT-FOUNDATION-009`
- escopo: origins exact-match, CORS/preflight allowlisted com
  `GET/POST/PATCH/OPTIONS`, headers CSP/HSTS e
  transporte HTTPS fail-closed com `trustedProxyHops`; bootstrap por ambiente
  com `API_ALLOWED_ORIGINS`, `API_REQUIRE_HTTPS` e `API_TRUSTED_PROXY_HOPS`
- aceite: wildcard, `null`, URL com path/credencial, origin desconhecida,
  método/header de preflight não allowlisted falham; origin aceita recebe
  somente `Access-Control-Allow-Origin` exact-match e `Vary: Origin`; preflight
  não executa handler; HTTP sem transporte seguro falha quando enforcement está
  ativo; CSP/HSTS não são relaxáveis pelo caller e HSTS só aparece em HTTPS;
  produção sem origins ou sem HTTPS explícito falha no bootstrap
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`, sem host/proxy/IdP real, deploy,
  provider/canal, RAG, dado real ou side effect
- testes esperados: unitários do parser/normalizer, integração Fastify,
  boundary de produção/bootstrap e E2E/API de preflight; verify, readiness,
  E2E, PostgreSQL, audit, format e diff check
- evidência: `docs/04_audit/0508_plat_s18_controlled_http_security_boundary_evidence.md`

### Resultado controlado PLAT-S18

O boundary foi implementado e auditado com RED/GREEN, integração Fastify,
bootstrap production, headers fixos e suporte explícito ao `PATCH` usado pelo
fluxo atual de tarefas. Gates: `npm run verify` PASS; 97 arquivos/330 testes
pass/18 skips; coverage 85,16%/80,44%/84,75%/86,06%; readiness 4/4; E2E 3/3;
PostgreSQL controlado 51 pass/18 skips; audit 0 e diff check PASS. O resultado
é `COMPLETED_CONTROLLED`; `CONTROLLED_MVP_READY` permanece e produção real
continua `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## Sprint de observabilidade de requests controlada — `PLAT-S19`

Esta sprint cria uma visão process-local, bounded e redaction-safe das
respostas HTTP sem fingir que métricas distribuídas estão disponíveis.

### `PLAT-S19-001` — Controlled Request Observability Metrics

- prioridade: P1
- estado: COMPLETED_CONTROLLED
- owner: api/observability/security
- dependências: `PLAT-S18-001`, `PLAT-FOUNDATION-009`
- escopo: collector imutável por substituição de estado, templates de rota
  bounded, métodos/status/latência, fallback para 404/security rejection e
  endpoint read-only `GET /health/metrics`
- aceite: nenhum path/query/body/header sensível ou identidade entra no
  snapshot; cardinalidade excedente é agregada em `__other__`; snapshots são
  defensivos; respostas de rota, 404 e boundary contam corretamente
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`, sem Prometheus/OTel/broker/storage
  distribuído, retenção, deploy, provider/canal, RAG, dado real ou side effect
- evidência: `docs/04_audit/0509_plat_s19_controlled_request_observability_metrics_evidence.md`

### Resultado controlado PLAT-S19

O collector foi implementado com estado immutable-by-replacement, templates de
rota/método/status/latência bounded, fallback para 404/security rejection e
endpoint `/health/metrics` read-only/redaction-safe. Gates: `npm run verify`
PASS; 98 arquivos/333 testes pass/18 skips; coverage 85,24%/80,63%/84,99%/
86,16%; readiness 4/4; E2E 3/3; PostgreSQL controlado 51 pass/18 skips; audit
0 e diff check PASS. O resultado é `COMPLETED_CONTROLLED`; produção real
continua `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## Sprint de segurança de memória do rate limiter controlado — `PLAT-S20`

Esta sprint limita o crescimento de buckets do limiter process-local e
explicita validações de política/chave. Ela não substitui o limiter distribuído
necessário para produção.

### `PLAT-S20-001` — Controlled Rate Limit Memory Safety

- prioridade: P1
- estado: COMPLETED_CONTROLLED
- owner: api/security/operations
- dependências: `PLAT-S19-001`, `PLAT-FOUNDATION-009`
- escopo: `maxBuckets` bounded, purge/evicção determinística, validação de
  policy/key, snapshot sem chaves e `Cache-Control: no-store` no 429
- aceite: cardinalidade interna nunca excede o limite; expirados são removidos;
  bucket mais antigo é evicto quando cheio; envelope/`Retry-After` permanecem;
  nenhuma chave, IP, token ou identidade é exportada
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem Redis, edge, limiter distribuído, HA, IdP, provider/canal, RAG,
  dado real, deploy ou side effect
- evidência: `docs/04_audit/0510_plat_s20_controlled_rate_limit_memory_safety_evidence.md`

### Resultado controlado PLAT-S20

O limiter foi implementado com `maxBuckets` bounded, purge de expirados,
evicção determinística pelo menor `resetAt`, validação de policy/key, snapshot
sem chaves e `Cache-Control: no-store` no 429. Gates: `npm run verify` PASS;
98 arquivos/335 testes pass/18 skips; coverage 85,31%/80,72%/85,07%/86,23%;
readiness 4/4; E2E 3/3; PostgreSQL controlado 51 pass/18 skips; audit 0,
format e diff check PASS. Produção real permanece `NO-GO`/
`WAITING_HUMAN_APPROVAL`.

## Sprint de redaction de falha de startup controlada — `PLAT-S23`

Esta sprint fecha a emissão bruta de erros no entrypoint do API sem alterar o
fail-closed do bootstrap ou introduzir um logger operacional.

### `PLAT-S23-001` — Controlled Startup Failure Redaction

- prioridade: P1
- estado: COMPLETED_CONTROLLED
- owner: api/security/operations
- dependências: `PLAT-S22-001`, `PLAT-FOUNDATION-009`
- escopo: formatter puro, saída JSON mínima, redaction de credenciais/tokens/
  PII, limite e normalização de mensagem, integração no `main`
- aceite: nenhum stack/cause/objeto bruto é emitido; erros desconhecidos são
  genéricos; mensagens conhecidas são bounded e sanitizadas; `process.exit(1)`
  e a ordem de bootstrap permanecem; testes e gates existentes continuam verdes
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem logger distribuído, persistência, alerting, IdP, tenant binding,
  provider/canal, RAG, dado real, deploy, migration ou side effect
- evidência:
  `docs/04_audit/0513_plat_s23_controlled_startup_failure_redaction_evidence.md`

### Resultado controlado PLAT-S23

O formatter foi integrado ao entrypoint e não serializa o erro bruto. RED/GREEN,
crítica lead-only, retest, verify, readiness, E2E, PostgreSQL controlado, audit,
format, diff check e smoke de startup passaram. A saída é bounded e redaction-
safe; produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## Sprint de boundary de exposição de métricas controlada — `PLAT-S21`

Esta sprint desabilita o endpoint agregado de métricas fora de test/development
e aplica `Cache-Control: no-store`, sem criar auth operacional ou métricas reais.

### `PLAT-S21-001` — Controlled Metrics Exposure Boundary

- prioridade: P1
- estado: COMPLETED_CONTROLLED
- owner: api/security/operations
- dependências: `PLAT-S20-001`, `PLAT-S19-001`, `PLAT-FOUNDATION-009`
- escopo: gate de ambiente, opção controlled-only para desabilitar rota, 404
  genérico sem snapshot e `Cache-Control: no-store`
- aceite: test/development habilitados funcionam; production/staging/unknown
  falham fechado mesmo com override; `/health` não muda
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem IdP/auth, allowlist de rede, Prometheus/OTel, HA, provider/canal,
  RAG, dado real, deploy ou side effect
- evidência: `docs/04_audit/0511_plat_s21_controlled_metrics_exposure_boundary_evidence.md`

### Resultado controlado PLAT-S21

O endpoint `/health/metrics` ficou habilitado somente em test/development,
desabilitado fail-closed em production/staging/unknown, com 404 genérico sem
snapshot e `Cache-Control: no-store`. Gates: `npm run verify` PASS; 99
arquivos/337 testes pass/18 skips; coverage 85,33%/80,74%/85,07%/86,25%;
readiness 4/4; E2E 3/3; PostgreSQL controlado 51 pass/18 skips; audit 0,
format e diff check PASS. Produção real permanece `NO-GO`/
`WAITING_HUMAN_APPROVAL`.

## Sprint de correlation ID na resposta HTTP controlada — `PLAT-S22`

Esta sprint publica o correlation ID que já existe no envelope em um header de
resposta, sem aceitar valor externo e sem criar tracing operacional.

### `PLAT-S22-001` — Controlled Correlation Response Boundary

- prioridade: P1
- estado: COMPLETED_CONTROLLED
- owner: api/observability/security
- dependências: `PLAT-S21-001`, `PLAT-S18-001`, `PLAT-FOUNDATION-009`
- escopo: header `X-Correlation-Id` derivado de envelope, exposição CORS
  somente para origem aprovada e ausência segura em não-envelopes/preflight
- aceite: header coincide com `meta.correlationId`; header de entrada nunca é
  refletido; respostas CORS expõem somente o header; `/health`, erros,
  preflight, Secretary e métricas permanecem compatíveis
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- limite: sem tracing distribuído/OTel, broker, logging de payload, mudança de
  auth/tenant, provider/canal, RAG, dado real, deploy ou side effect
- evidência:
  `docs/04_audit/0512_plat_s22_controlled_correlation_response_boundary_evidence.md`

### Resultado controlado PLAT-S22

O boundary publica `meta.correlationId` em `X-Correlation-Id` somente para
envelopes válidos, nunca reflete header externo, expõe o header apenas em CORS
aprovado e não o inventa em preflight/non-envelope. Gates: `npm run verify`
PASS; 100 arquivos/343 testes pass/18 skips; coverage 85,37%/80,81%/85,10%/
86,29%; readiness 4/4; E2E 3/3; PostgreSQL controlado 51 pass/18 skips; audit
0, format e diff check PASS. Produção real permanece `NO-GO`/
`WAITING_HUMAN_APPROVAL`.
