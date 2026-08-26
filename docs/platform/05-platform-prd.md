# PRD — CVG Agent Platform MVP controlado

## PLAT-S47 — modo de criação de múltiplos agentes no Control Center

### Problema

Após criar o primeiro agente, o Control Center mantém esse agente selecionado,
torna slug/nome/descrição somente leitura e converte a ação principal em clone
de versão. Sem um comando explícito para iniciar um novo agente, a jornada
administrativa não consegue criar Agent A e Agent B no mesmo painel, embora o
backend tenant-aware suporte os dois objetos.

### Resultado controlado

O Admin terá um comando `Novo agente` que limpa o editor e o estado derivado da
seleção atual, preservando identidade/tenant e os catálogos tenant-wide de
plugins e fontes de knowledge já carregados. O mesmo painel poderá criar dois
agentes fictícios com configurações diferentes usando o mesmo kernel. Ao
selecionar um agente existente, o fluxo atual de edição continuará clonando
uma nova `AgentVersion`, sem mutação in-place ou troca de tenant. Se a
identidade/tenant mudar com o painel montado, respostas pendentes do contexto
anterior serão descartadas e as coleções do novo tenant serão recarregadas.

### Aceite e fora de escopo

- `Novo agente` é visível quando há seleção e volta o formulário a slug/nome/
  descrição editáveis, sem reutilizar versão, trace, suite ou ledger do alvo;
- Agent A e Agent B são criados na mesma sessão/tenant com IDs e snapshots
  distintos, e configurações observavelmente diferentes;
- a seleção de agente existente continua carregando somente suas versões e
  preserva o clone versionado para alterações;
- catálogos tenant-wide de plugins e knowledge sobrevivem ao reset de agente,
  mas não atravessam uma troca de identidade/tenant;
- respostas tardias de qualquer request do agente anterior não podem atualizar
  o novo tenant, agente, versão, trace, suite ou ledger;
- erros e conflitos continuam visíveis e nenhuma chamada de provider, canal,
  RAG, rede ou side effect é adicionada;
- sem alteração do kernel, contratos de persistência ou autorização de produção.

### Gate da aceitação

RED deve reproduzir a impossibilidade de retornar ao modo de criação após o
primeiro agente. GREEN deve provar a jornada A/B pela UI/API real, a limpeza de
estado derivado, a compatibilidade do clone de versões, a invalidação ao trocar
tenant/identidade e a preservação dos catálogos tenant-wide. A regressão
completa e os gates controlados permanecem obrigatórios.

## Registro controlado PLAT-S47 — 2026-08-26T11:33:26-03:00

`PLAT-S47-001_CONTROLLED_MULTI_AGENT_CREATION_MODE` foi registrado após
discovery do estado real do Control Center, com gate
`SPEC_APPROVED_CONTROLLED_BUILD`. A lane é somente de ergonomia e isolamento
de estado no control plane controlado; produção permanece
`NO-GO`/`WAITING_HUMAN_APPROVAL`.

## Fechamento controlado PLAT-S47 — 2026-08-26T12:48:37-03:00

`PLAT-S47-001` foi implementada e auditada como `COMPLETED_CONTROLLED`. O
Control Center agora oferece `Novo agente`, mantém clones versionados para
edição, invalida respostas tardias por escopo de operador/role/tenant e
preserva catálogos tenant-wide somente dentro do tenant atual. A jornada A/B
foi comprovada por Vitest e Playwright, sem alteração de kernel/schema ou
efeito externo. A produção real continua `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## Auditoria corretiva final PLAT-S47 — 2026-08-26

A auditoria corretiva acrescentou a obrigação de que o Trace Viewer não tenha
estado visível sem agente, que leituras administrativas de suites/ledger
sejam sempre agent-scoped e que payloads de trace sejam redigidos e
normalizados no cliente. Também foi aplicada geração monotônica do token de
view para impedir state bleed quando a seleção retorna de B para A.

O RED reproduziu os casos negativos, incluindo `spans: {}`; o GREEN passou.
Regressão: 127 arquivos/534 testes PASS, 2 arquivos/19 testes skipped;
coverage 84,86/80,12/84,97/85,97; build 158 módulos; E2E 4/4;
PostgreSQL 8/72; readiness 4/4; worker smoke; audit 0; typecheck, lint,
format e diff check PASS. O veredito independente compatível retornou
`PASS_CONTROLLED`, sem P0/P1/P2/P3, e foi anexado à evidência S47. Isso fecha
somente o MVP controlado; produção real permanece
`NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S46 — Correlação única da execução controlada

### Problema

O executor cria o `traceId` somente no fechamento da pipeline. Enquanto a
execução acontece, cada evento de lifecycle recebe um ID próprio e cada
invocação do Capability Gateway cria outra correlação. O trace persistido é
investigável isoladamente, mas não há uma chave única para reconstruir, com
segurança, os eventos, hooks e auditorias de tools pertencentes à mesma
execução.

### Resultado controlado

O `traceId` passa a ser a identidade de execução criada/validada na entrada do
kernel e propagada, sem mutação, para todos os eventos de lifecycle e
auditorias de tools. O ID do evento e o `correlationId` da API/gateway continuam
identificando seus próprios envelopes/atos; `traceId` é apenas a relação
parental bounded da execução. Traces in-memory, PostgreSQL, Test Lab e runtime
publicado preservam a mesma identidade.

### Aceite e fora de escopo

- cada execução recebe exatamente um `traceId` válido antes do primeiro evento;
- eventos e hooks recebem o `traceId` da execução, sem substituir seu ID de
  evento, e auditorias de tools carregam a mesma referência;
- um `traceId` injetado internamente é validado; valor malformado falha antes
  de emitir evento, chamar provider/model ou tool;
- chamadas standalone do gateway continuam compatíveis e criam uma referência
  controlada própria; chamadas do kernel nunca criam uma segunda referência por
  tool;
- persistência e leitura rejeitam ou preservam somente referências bounded,
  sem confiar em payload, tenant ou IDs fornecidos pelo browser;
- o Control Center pode continuar exibindo o trace existente; nenhum segredo,
  PII, payload bruto, correlation externo ou dado real é adicionado;
- sem OTel/exporter, broker, rede, provider/canal real, RAG, deploy, dado real,
  ação clínica/financeira, side effect ou alteração de produção.

### Gate da aceitação

RED deve provar que eventos e auditorias de uma execução não compartilham uma
referência estável e que um trace injetado inválido não é rejeitado na entrada.
GREEN deve provar propagação única no Test Lab, runtime publicado, event bus,
gateway e sinks, com compatibilidade das correlações locais existentes.

### Registro antes do BUILD

`PLAT-S46-001_CONTROLLED_EXECUTION_TRACE_CORRELATION_BOUNDARY` foi registrado
em backlog, SPEC, ExecPlan, runtime state, execution log, tracking, task
catalog e gauntlet com gate `SPEC_APPROVED_CONTROLLED_BUILD`. Evidência
planejada: `docs/04_audit/0536_plat-s46_controlled_execution_trace_correlation_boundary_evidence.md`.

## Checkpoint de registro PLAT-S46 — 2026-08-26T10:33:24-03:00

Discovery reproduziu que `traceId` nasce no final de `executeConfiguredAgent`,
que `PlatformEventBus` cria um ID independente por evento e que o gateway cria
uma correlação independente por tool. O contrato S46 fecha somente a relação
parental do trace; produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## Fechamento controlado PLAT-S46 — 2026-08-26T11:22:54-03:00

`PLAT-S46-001` foi implementada e auditada como `COMPLETED_CONTROLLED`. O
focused RED registrou 4 arquivos/33 testes, com 8 falhas esperadas; o GREEN de
fechamento passou 6 arquivos/25 testes. A regressão passou 126 arquivos, com 2
skipped, e 523 testes, com 19 skipped. Coverage ficou em
85,07/80,06/85,95/86,10 (statements/branches/functions/lines); PostgreSQL
8/72; readiness 4/4; worker smoke; E2E 4/4; build 70 módulos; audit 0;
typecheck, lint, format e diff check PASS.

A revisão independente compatível read-only retornou `PASS` sem P0/P1/P2. A
lane preserva o trace parental bounded, IDs locais de evento/call e todos os
limites de não-produção. Evidência:
`docs/04_audit/0536_plat-s46_controlled_execution_trace_correlation_boundary_evidence.md`.

## Fechamento controlado PLAT-S45

`PLAT-S45-001` foi implementado, auditado e fechado como
`COMPLETED_CONTROLLED`. A revisão independente compatível, read-only, retornou
`PASS sem P0/P1` após as correções do BUILD. A lane permanece restrita a
fixtures server-side, sem provider/canal real ou efeito externo.

## PLAT-S45 — Fronteira de invocação de tools controladas

### Problema

Embora o gateway valide tenant, agente, versão, binding, policy e approval, a
fronteira precisava tratar input, actor e retorno de handler como dados não
confiáveis. Sem um contrato executável por tool, `null` podia chegar ao handler,
`actor.permissions` inválido podia gerar `TypeError` e o retorno podia carregar
campos arbitrários. Isso violava a exigência de schema validation e deixava a
boundary interna dependente de invariantes apenas de TypeScript.

### Resultado controlado

Cada tool compilada registra validators server-side de input e output associados
à identidade `plugin@version/tool`; o registry rejeita validators ausentes,
extras ou inválidos e handlers não-callable. O gateway valida actor, escopo,
policy e input antes de approval/handler, usa somente o valor parseado e obtém
permissões efetivas por authorizer server-side, ignorando grants enviados pelo
chamador. A aprovação só passa por autoridade durável e single-use; o retorno
é validado, bounded, projetado e redigido. Falhas retornam estado controlado,
incluindo `audit_unavailable` sem repetir execução.

### Aceite e fora de escopo

- input incompatível, actor malformado, validator ausente ou resultado inválido
  falham fechado sem handler, approval ou payload bruto;
- validators são código registrado no servidor; catálogo e browser não podem
  fornecer função, schema executável ou grant;
- resultado de tool é validado pelo output validator, clonado sem mutação,
  limitado e redigido antes de retorno/auditoria; mensagens de erro são
  bounded;
- actor.permissions não é autoridade; ausência de authorizer ou grant efetivo
  bloqueia a execução;
- approval booleano legado não é aceito; consumo requer binding de tenant,
  agente, versão, tool, actor e hash do input em autoridade durável;
- falha de auditoria depois do handler não reexecuta o handler e retorna
  `audit_unavailable` explicitamente;
- ferramentas compiladas existentes mantêm resposta e approval válidos;
- sem import dinâmico, marketplace, provider/canal real, rede, RAG, broker,
  outbox, egress, deploy, dado real ou side effect.

### Gate da aceitação

RED deve reproduzir input arbitrário chegando ao handler, actor inválido
causando exceção não controlada e resultado bruto retornando ao chamador.
GREEN deve provar registry strict, validação antes de approval/handler,
resultado bounded/redigido, isolamento de falhas e regressão do Test Lab.

### Evidência planejada

`docs/04_audit/0535_plat-s45_controlled_tool_invocation_boundary_evidence.md`

## Checkpoint controlado S45

Focused 6/41; regressão 125 arquivos/512 testes pass, 2/19 skipped; coverage
85,01/80,14/85,82/86,03; PostgreSQL controlado 6/53, 2/19 skipped; E2E 4/4;
readiness 4/4; worker smoke; build 70 módulos; audit 0 vulnerabilidades;
typecheck, lint, format e diff check PASS. A revisão independente compatível
retornou `PASS sem P0/P1`. Produção real continua
`NO-GO`/`WAITING_HUMAN_APPROVAL`; a próxima lane segura é discovery/SPEC da
correlação única de execução.

## Status da aceitação PLAT-S44

`PLAT-S44-001` está `COMPLETED_CONTROLLED` em `AUDIT`, com gate
`SPEC_APPROVED_CONTROLLED_BUILD`. A lane mediu estágios do executor controlado
com relógio monotônico local, sem ativar observabilidade externa ou produção.

## PLAT-S44 — Instrumentação local dos spans

### Problema

S43 valida coerência, ordem e soma temporal, mas o executor ainda emite
`durationMs: 0` para todas as etapas, inclusive as executadas. Isso reduz a
utilidade investigativa do trace, mesmo quando o contrato é estruturalmente
válido.

### Resultado controlado

Um ledger bounded com clock monotônico injetável mede as etapas controladas do
executor e alimenta `createTraceSpans`. Stages realmente executados recebem a
duração observada; stages skipped permanecem zero. O resultado é local,
determinístico em teste, sem payload, rede, exporter ou provider adicional.

### Aceite e fora de escopo

- relógio fake permite testes exatos e o clock default é monotônico;
- durações são finitas, não negativas, bounded e a soma não supera a latência;
- erro de medição falha fechado ou usa somente fallback seguro sem alterar
  policy/efeitos;
- sem OTel, exporter, broker, rede, provider/canal real, RAG, deploy, dado real
  ou side effect.

### Gate da aceitação

RED deve provar que os spans gerados permanecem todos em zero e não existe
ledger injetável. GREEN deve demonstrar durações medidas, skipped zero, soma
bounded e integração com o executor sem payload.

### Evidência planejada

`docs/04_audit/0534_plat-s44_controlled_trace_stage_timing_evidence.md`

## Fechamento controlado S44

Focused 2/17; regressão 124 arquivos/501 testes pass, 2/19 skipped; coverage
85,18/80,44/85,70/86,16; PostgreSQL controlado 8/72; E2E 4/4; readiness 4/4;
build 70 módulos; audit 0; typecheck, lint, format e diff check passaram.
Evidência:
`docs/04_audit/0534_plat-s44_controlled_trace_stage_timing_evidence.md`.
Produção real continua `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## Status da aceitação PLAT-S43

`PLAT-S43-001` está `COMPLETED_CONTROLLED` em `AUDIT`, com gate
`SPEC_APPROVED_CONTROLLED_BUILD`. A lane adicionou integridade temporal e
ordinal ao trace canônico sem ativar observabilidade externa ou produção.

## PLAT-S43 — Integridade temporal do trace controlado

### Problema

Embora S42 canonicalize o payload, `createTraceSpans` ainda preenche duração
estática e o parser não relaciona timestamps, latência, ordem e status dos
spans. Dados temporalmente incoerentes reduzem a confiabilidade investigativa
do trace, mesmo sem carregar payload sensível.

### Resultado controlado

Uma validação determinística exige timestamps completos e ordenados quando a
telemetria temporal é fornecida, latência compatível com o intervalo medido,
spans em ordem canônica, duração total bounded e status coerente com policy,
knowledge, tools, handoff e delivery. A telemetria continua opcional para
fixtures legados, sem inventar integração ou exportação externa.

### Aceite e fora de escopo

- timestamps incompletos/invertidos e latência incompatível falham fechado;
- spans fora da ordem, duração acumulada acima da latência ou status derivado
  incorreto falham fechado;
- trace sem campos temporais/spans opcionais permanece válido;
- sem OTel, exporter, broker, rede, provider/canal real, RAG, deploy, dado real
  ou side effect.

### Gate da aceitação

RED deve reproduzir combinações temporais e ordinais incoerentes aceitas pela
boundary atual. GREEN deve validar as invariantes no parser compartilhado,
preservar fixtures compatíveis e provar rejeição antes de persistência/retorno.

### Evidência planejada

`docs/04_audit/0533_plat-s43_controlled_trace_temporal_integrity_evidence.md`

## Fechamento controlado S43

Focused 1/14; regressão 124 arquivos/499 testes pass, 2/19 skipped; coverage
85,08/80,41/85,45/86,08; PostgreSQL controlado 8/72; E2E 4/4; readiness 4/4;
build 70 módulos; audit 0; typecheck, lint, format e diff check passaram. A
instrumentação monotônica dos spans permanece explicitamente como próxima
lane, pois S43 valida integridade sem inventar duração. Evidência:
`docs/04_audit/0533_plat-s43_controlled_trace_temporal_integrity_evidence.md`.
Produção real continua `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## Status da aceitação PLAT-S42

`PLAT-S42-001` está `COMPLETED_CONTROLLED` em `AUDIT`, com gate
`SPEC_APPROVED_CONTROLLED_BUILD`. A lane fechou a proveniência do trace nos
sinks de persistência e leitura, sem alterar autorização de produção.

## PLAT-S42 — Fronteira de proveniência do trace controlado

### Problema

`TestRunTrace` possui uma interface TypeScript, mas não um contrato runtime
estrito. A sanitização atual valida somente a resposta e o metadado de output,
enquanto suites e leituras PostgreSQL podem carregar JSON de trace por caminhos
que não aplicam a mesma regra. Um trace adulterado pode então registrar
provider/model não executável, `externalCall: true`, campos secretos ou
estrutura inválida, comprometendo auditoria e isolamento da boundary.

### Resultado controlado

Um parser/projetor server-side transforma qualquer trace recebido em uma forma
canônica allowlisted: IDs, enums, números, datas, provider determinístico,
spans e objetos aninhados são bounded; input/response são redigidos; a output
policy é reaplicada e sua decisão precisa ser consistente. Os sinks diretos,
traces de suite e rows JSON lidas do PostgreSQL usam o mesmo boundary e falham
fechado quando a forma não pode ser confiavelmente normalizada.

### Aceite e fora de escopo

- campos desconhecidos não são carregados para o trace canônico nem aparecem
  em persistência, API ou listagens;
- IDs inválidos, enums/status desconhecidos, números não finitos ou fora dos
  limites, datas inválidas, provider/model não controlado e
  `externalCall: true` falham com `validation_failed`;
- `recordTestRun`, `recordExecutionTrace`, `recordTestSuiteRun`, o mapper de
  suite e as listagens PostgreSQL usam a mesma governança, antes de INSERT ou
  de retornar dados potencialmente corrompidos;
- redaction de mensagens/respostas, output policy e imutabilidade defensiva
  são preservadas, sem persistir segredo ou payload arbitrário;
- sem provider/canal real, RAG, secret manager, broker, outbox, egress,
  deploy, migração estrutural, dados reais ou side effect.

### Gate da aceitação

RED deve demonstrar que um trace válido adulterado com campo extra ou provider
externo atravessa ao menos um sink atual e que trace aninhado de suite evita a
sanitização. GREEN deve provar projeção canônica, rejeição fail-closed de
campos conhecidos inválidos, aplicação em memória/PostgreSQL/suite/leitura e
ausência de INSERT/retorno inseguro.

### Evidência planejada

`docs/04_audit/0532_plat_s42_controlled_trace_provenance_boundary_evidence.md`

### RED observado

O focused S42 reproduziu 9 falhas em 3 arquivos/16 testes: o sink preservava
campos extras e provider adulterado, o caminho de suite evitava a sanitização e
a leitura PostgreSQL devolvia JSON com `externalCall: true`. Não houve rede,
provider, canal, dado real ou side effect.

### GREEN focado

O parser/projetor compartilhado agora remove dados não allowlisted, valida os
campos bounded, datas serializadas, provider controlado e metadado de output;
os sinks diretos, suites e leituras PostgreSQL falham fechado ou retornam
somente a forma canônica. Focused GREEN passou 6 arquivos/76 testes; typecheck
e lint passaram.

## Fechamento controlado S42

A regressão passou 124 arquivos/492 testes, com 2 arquivos/19 testes skipped;
coverage: 84,99% statements, 80,24% branches, 85,41% functions e 86,00%
lines. PostgreSQL controlado passou 8/8 arquivos e 72/72 testes, E2E 4/4,
readiness 4/4, worker smoke e build passaram; audit reportou 0 vulnerabilidades
e format/diff check também passaram. Evidência:
`docs/04_audit/0532_plat_s42_controlled_trace_provenance_boundary_evidence.md`.
O MVP controlado segue disponível para novo discovery seguro; produção real
continua `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## Status da aceitação PLAT-S41

`PLAT-S41-001` está `COMPLETED_CONTROLLED` em `AUDIT`, com gate
`SPEC_APPROVED_CONTROLLED_BUILD`. A saída é validada no runtime, nos sinks de
trace e antes da conclusão transacional PostgreSQL; a lane não autoriza
provider/canal real, RAG, dado real ou side effect.

## PLAT-S41 — Fronteira de segurança da saída controlada

### Problema

O executor já bloqueia intenções de alto risco e resolve somente o provider
determinístico, mas a resposta final pode vir de `approvedKnowledge.answer` ou
de um `responseTemplate` configurado. Sem uma etapa pós-modelo, conteúdo
inseguro pode entrar no trace e na resposta mesmo quando a entrada foi
classificada de forma segura. Proveniência aprovada limita a fonte; não
substitui validação de conteúdo.

### Resultado controlado

Uma output policy server-side, determinística e bounded é aplicada ao texto
da completion antes de `response.after`, das métricas de token e da construção
do trace. Ela valida que o resultado é texto, remove PII conforme a redaction
controlada, impõe o limite de 4.000 caracteres e detecta padrões de diagnóstico,
prescrição, dose/medicação, tratamento, prontuário, pagamento e mutação de
agenda. Saída inválida ou insegura é substituída por resposta segura; quando a
substituição exigir handoff, o modo, o estado e o evento serão atualizados em
conjunto.

### Aceite e fora de escopo

- resposta válida e bounded permanece disponível, com redaction de PII;
- output não textual, vazio, excessivo ou com orientação clínica/financeira,
  prontuário ou ação sensível é rejeitado sem refletir o conteúdo original;
- resposta segura de recusa/handoff continua permitida e não é confundida com
  orientação proibida;
- a decisão de output é observável somente por modo, motivo e tamanhos
  bounded; texto bruto não entra em evento de policy, e a decisão é persistida
  no trace/API;
- qualquer output reescrito interrompe planejamento, resolução de approval e
  execução de tools; se já havia handoff, `unsafe_output_rejected` tem
  precedência no motivo final;
- `fake/deterministic-v1` continua com `externalCall: false`; sem provider,
  canal, RAG, broker, outbox, egress, deploy, dado real ou side effect.

### Gate da aceitação

RED deve reproduzir que uma resposta de knowledge/template com instrução de
medicação ou diagnóstico alcança a completion sem ser validada. GREEN deve
aplicar a policy depois do model e antes da resposta final, cobrindo saída
válida, redaction, limite, conteúdo inseguro, fallback seguro, modo/handoff,
eventos sem texto bruto e ausência de tools/approval após rewrite.

### Evidência planejada

`docs/04_audit/0531_plat_s41_controlled_output_safety_boundary_evidence.md`

### Auditoria final

O focused de fechamento passou 7 arquivos/76 testes; a regressão passou 123
arquivos/483 testes, com 2 arquivos e 19 testes skipped. Coverage final:
85,08% statements, 80,29% branches, 85,39% functions e 86,12% lines.
Readiness 4/4, worker smoke, PostgreSQL 8/72, E2E 4/4, build, typecheck,
lint, format, audit 0 e diff check passaram. A revisão anterior encontrou
P0/P1, todos foram fechados por regressões; a tentativa final assíncrona não
retornou e não foi contada como aprovação. Evidência:
`docs/04_audit/0531_plat_s41_controlled_output_safety_boundary_evidence.md`.
O resultado é controlado e produção permanece `NO-GO`.

## Status da aceitação PLAT-S40

`PLAT-S40-001` está `COMPLETED_CONTROLLED` em `AUDIT`, com gate
`SPEC_APPROVED_CONTROLLED_BUILD`. A lane fechou a identidade do provider/model
controlado antes da execução e não autoriza providers reais, fallback
operacional, secret manager, canal ou side effect.

## PLAT-S40 — Identidade do provider/model controlado

### Problema

O contrato de configuração aceita referências genéricas de provider, modelo e
fallback para preparar a arquitetura futura. Porém, o runtime controlado cria o
provider determinístico diretamente e não consulta o registry compilado. Isso
permite persistir uma versão com identidade que o MVP não executa e deixar
`fallbackProvider` ser silenciosamente ignorado, reduzindo a confiabilidade do
trace e do gate de publicação.

### Resultado controlado

O runtime usa um registry server-side imutável que contém somente o provider
`fake` com o modelo `deterministic-v1`. A resolução exige correspondência exata
de provider/model e rejeita qualquer fallback configurado, pois fallback
operacional ainda não existe no slice. Test Lab, execução publicada e worker
herdam a mesma resolução por `executeConfiguredAgent`; a configuração continua
genérica no control plane para não confundir referência futura com capacidade
instalada.

### Aceite e fora de escopo

- a identidade `fake/deterministic-v1` executa de forma determinística e o
  trace mantém `externalCall: false`;
- provider desconhecido, modelo não suportado e `fallbackProvider` presente
  falham com erro controlado antes de `message.received`/`model.before`, sem
  chamar modelo, tool, canal ou alterar estado;
- registry, lista e resolução não permitem mutação incidental ou registro
  duplicado; valores de segredo nunca aparecem em resposta ou trace;
- sem OpenAI, OpenRouter, Anthropic, Google, Ollama, vLLM, secret manager,
  fallback/retry real, broker, RAG, canal, egress, deploy, dados reais ou
  side effect.

### Gate da aceitação

RED deve demonstrar que a resolução direta aceita identidade não registrada ou
ignora fallback. GREEN deve provar registry compilado, correspondência exata,
falha precoce e paridade no executor compartilhado, preservando a regressão
controlada, o worker pinned e todos os limites de produção.

### Evidência planejada

`docs/04_audit/0530_plat_s40_controlled_model_provider_identity_evidence.md`

### RED observado

O focused executou 1 arquivo/4 testes e falhou nos 4 casos esperados. A
implementação atual aceita provider/model desconhecido, ignora
`fallbackProvider` e permite que o trace termine com `openrouter/external`; o
executor também emite eventos antes da resolução. Nenhuma operação externa ou
side effect ocorreu. O GREEN deve resolver pelo registry antes de
`message.received`.

### GREEN focado

O registry compilado e a resolução compartilhada foram implementados. O
focused inicial passou 2 arquivos/6 testes e a regressão ampliada do runtime
publicado/worker passou 4 arquivos/19 testes: `fake/deterministic-v1` executa
de forma determinística, enquanto provider/model não registrado e fallback
configurado falham antes da pipeline. Os gates integrados e a revisão
independente foram concluídos.

### Auditoria final S40

`PLAT-S40-001 = COMPLETED_CONTROLLED`. A evidência executável registra
focused 4/19, regressão 121 arquivos/446 testes/19 skips, coverage
85,08/80,11/85,17/86,07, readiness 4/4, PostgreSQL 8/72, E2E 4/4, worker
smoke, build, typecheck, lint, format, audit 0 e diff check PASS. Revisão
independente follow-up: `PASS sem achados estáticos`. Evidência:
`docs/04_audit/0530_plat_s40_controlled_model_provider_identity_evidence.md`.
Produção real segue `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## Status da aceitação PLAT-S39

`PLAT-S39-001` está `COMPLETED_CONTROLLED` após RED/GREEN, correção de revisão
e gates integrados. A transição para `VALIDATED` revalida gates, digest e
independência do validador no próprio boundary do lifecycle; a autoridade de
publish/rollback e o banco mantêm a mesma invariável. Evidência registrada em
`docs/04_audit/0529_plat_s39_controlled_release_candidate_lifecycle_integrity_evidence.md`.

## PLAT-S39 — Integridade do lifecycle do release candidate

### Problema

O ledger calcula um digest no create e a autoridade de publish o revalida, mas
os stores permitem marcar um candidate como `VALIDATED` apenas pela forma e
status dos gates. Se o registro persistido for alterado entre essas etapas,
`VALIDATED` deixa de significar evidência íntegra.

### Resultado controlado

A transição para `VALIDATED` reutiliza uma asserção server-side que parseia o
schema dos gates, exige exatamente os quatro gates fixos em `PASS` e compara o
digest recomputado com o candidate vinculado a tenant/agente/versão. A regra é
aplicada no store InMemory e no repositório PostgreSQL antes de gravar status,
ator ou timestamp; o criador do candidate não pode ser o validador. Fixtures
controlados e o Control Center explicitam uma identidade de revisão distinta.

### Aceite e fora de escopo

- candidate íntegro pode transicionar e candidate adulterado permanece no
  status anterior, sem atualizar metadata;
- shape inválido, gate duplicado/incompleto, status diferente de `PASS` ou
  digest divergente, autoatestação ou JSON de gates corrompido falham com erro
  controlado;
- publish continua usando sua própria autoridade e nenhum efeito é disparado;
- sem deploy, provider/canal, RAG, dados reais, egress, broker, outbox ou
  side effect.

### Gate da aceitação

RED deve reproduzir a aprovação de candidate com digest adulterado nos dois
adapters. GREEN deve fechar o caso com uma asserção compartilhada e preservar
regressão, tenant scope e transação PostgreSQL.

### RED observado

O focused executou 2 arquivos/6 testes: 4 passaram e 2 falharam como esperado.
Tanto o InMemory quanto o PostgreSQL aceitaram o digest adulterado na
transição para `VALIDATED`, confirmando o gap antes do GREEN.

### GREEN focado

`assertReleaseCandidateEvidenceIntegrity` agora centraliza parse, gates e
digest. Os dois adapters chamam a asserção antes da mutação; o focused passou
6/6 e typecheck/lint passaram. A suíte integrada e os gates operacionais ainda
serão executados.

### Correção após crítica independente

A revisão identificou autoatestação do `createdBy` e o mapeamento PostgreSQL de
`gate_results` inválido para `[]`. A implementação passou a exigir validador
independente, a compartilhar parser fail-closed e a migration `0009` passou a
proibir autoatestação persistida. O focused final passou 7 arquivos/23 testes,
com testes core/API/PG/UI e contrato da migration.

### Auditoria final

A revisão independente final retornou `PASS sem achados`. Os gates integrados
passaram com 120 arquivos/438 testes/19 skips, coverage 85,08% statements,
80,16% branches, 85,18% functions e 86,08% lines, PostgreSQL 8/72 e E2E 4/4.
O resultado é somente `CONTROLLED_MVP_READY`; produção real continua
`NO-GO`/`WAITING_HUMAN_APPROVAL`.

## Status da aceitação PLAT-S38

`PLAT-S38-001` foi auditado como `COMPLETED_CONTROLLED`. O worker aceita o
fixture `approvedKnowledge` compartilhado, preserva o version pinning e falha
antes do store para payload inválido ou history acima do limite. Evidência:
`docs/04_audit/0528_plat_s38_controlled_worker_knowledge_input_parity_evidence.md`.

## PLAT-S38 — Paridade de input de knowledge no worker

### Problema

O runtime publicado possui contrato bounded para `approvedKnowledge`, mas o
envelope strict do worker rejeita o campo antes de chamar o executor. O mesmo
fixture controlado comporta-se de forma diferente conforme a entrada venha da
API/Test Lab ou do worker.

### Resultado controlado

O job publicado reutiliza `ApprovedKnowledgeForTestSchema` e encaminha o objeto
já parseado para `executePublishedAgent`. O binding configurado continua sendo
a autoridade de source/version; o payload não concede RAG nem capability.

### Aceite e fora de escopo

- payload válido é aceito somente com source `controlled://`, limites e shape
  strict, e chega ao runtime com tenant/agente/versão pinned;
- source externa, excesso, campo extra e shape legado falham antes do store;
- sem broker, provider/canal, RAG, dados reais, deploy, egress, outbox ou
  side effect.

### Status da aceitação

`PLAT-S38-001` está `COMPLETED_CONTROLLED` após RED/GREEN e gates integrados.
Evidência:
`docs/04_audit/0528_plat_s38_controlled_worker_knowledge_input_parity_evidence.md`.

## PLAT-S37 — Autoridade de evidência para publicação controlada

### Problema

O ledger de release candidates registra quatro gates e calcula um digest, mas o
endpoint de publicação não exige nenhum candidato. O operador pode enviar uma
atestação válida ou inválida e, ainda assim, publicar uma versão aprovada; o
rollback também não tem vínculo obrigatório com evidência da versão fonte.

### Resultado controlado

Publish e rollback passam a exigir `releaseCandidateId`. A autoridade server-
side aceita somente candidato `VALIDATED`, com digest recomputável, todos os
gates fixos em `PASS` e vínculo exato com tenant, agente e versão alvo. A API
mantém o preflight crítico executado sobre a versão e o store repete as
invariantes antes de qualquer mutação. Rollback usa a evidência da versão
fonte para derivar um novo snapshot controlado, sem transformar o ledger em
permissão de produção.

### Aceite e fora de escopo

- ausência, status não validado, digest alterado, gate incompleto/falho ou
  mismatch de tenant/agente/versão falha fechado antes de publicar;
- publish e rollback válidos permanecem tenant-scoped, CAS-aware e sem efeitos
  externos; a versão derivada do rollback copia somente a configuração
  controlada da fonte;
- InMemory, PostgreSQL, API, UI e testes exercitam a mesma fronteira;
- sem RAG, dados reais, provider/canal, deploy, egress, broker, outbox,
  rollout gradual ou side effect.

### Status da aceitação

`PLAT-S37-001` foi auditado como `COMPLETED_CONTROLLED` após RED/GREEN e gates
integrados. Evidência:
`docs/04_audit/0527_plat_s37_controlled_publish_evidence_authority_evidence.md`.

## PLAT-S36 — Proveniência do payload de knowledge controlada

### Problema

`executeConfiguredAgent` chama `validateApprovedKnowledge`, porém a validação
anterior era parcial, sem limites de tamanho ou strictness. As rotas Test Lab e
capability approval validam o mesmo payload em
schemas locais, mas chamadas internas podem fornecer objeto extra, source não
controlada ou strings sem limite antes de `resolveKnowledge`.

### Resultado controlado

Um schema compartilhado valida `approvedKnowledge` em todos os boundaries
controlados: objeto strict, source `controlled://` bounded, versão bounded e
resposta limitada. O runtime rejeita o payload antes de prompt/modelo/knowledge
resolution; a resolução continua exigindo binding tenant/version configurado.

### Aceite e fora de escopo

- schema compartilhado é usado pelo Test Lab API e pela execução de approval;
- chamada direta ao runtime rejeita source externa, excesso de tamanho e
  campos desconhecidos antes de produzir trace;
- payload válido continua metadata/source-gated e não cria autoridade de RAG;
- sem ingestão, conteúdo documental real, URL/provider/canal externo, egress,
  broker, outbox, dado real, deploy ou side effect.

### Status da aceitação

`PLAT-S36-001` foi auditado como `COMPLETED_CONTROLLED`: verify passou 117
arquivos/422 testes/19 skips, coverage 85,05/80,31/85,11/86,07, readiness 4/4,
worker smoke, E2E 4/4, PostgreSQL 8/71, audit 0, build, format e diff check.
O schema é compartilhado entre runtime, Test Lab, `TestLabCase` e approval
execution; evidência:
`docs/04_audit/0526_plat_s36_controlled_knowledge_input_boundary_evidence.md`.

## PLAT-S35 — Boundary de identidade do registry de tools

### Problema

O control plane permite configurar bindings de plugins, porém o planejador do
Test Lab e a rota de capability approval só reconhecem a tool literal de
scheduling. Isso cria uma configuração enganosa: metadata customizada pode ser
salva, mas uma tool compilada habilitada não percorre o mesmo caminho de
resolução. Ao mesmo tempo, conectar o catálogo diretamente à execução abriria
um perímetro inseguro de código não instalado.

### Resultado controlado

Um registry server-side fechado expõe apenas handlers compilados e registrados
explicitamente. A execução exige binding habilitado com versão exata, rejeita
colisões/ambiguidade e deriva a permissão do manifesto registrado. O Test Lab
planeja por intent e configuração através desse registry; a API valida
approval contra a mesma resolução. O catálogo continua somente metadata e não
se torna um loader ou executor.

### Aceite e fora de escopo

- bindings sem versão, plugin/tool ausente e toolName ambígua falham antes do
  handler;
- tools planejadas são deduplicadas por identidade e não dependem do literal
  `find_available_slots`;
- manifesto apenas catalogado, de outro tenant ou sem handler compilado nunca
  executa nem concede permissão;
- approval genérico só é emitido para uma tool resolvida na versão publicada;
  execução deriva a permissão no servidor e revalida a versão/configuração;
- sem import dinâmico, marketplace, provider, canal, egress, outbox, broker,
  dados reais, deploy ou side effect.

### Status da aceitação

`PLAT-S35-001` foi auditado como `COMPLETED_CONTROLLED`; a evidência está em
`docs/04_audit/0525_plat_s35_controlled_tool_registry_identity_evidence.md`.
O teto permanece `CONTROLLED_MVP_READY`; produção real segue `NO-GO`.

## PLAT-S34 — Paridade CI e smoke de startup do worker

### Problema

O workflow `.github/workflows/verify.yml` roda `verify`, PostgreSQL e Playwright,
mas não torna readiness e o processo worker gates explícitos. O install usa
`npm ci` sem declarar `--ignore-scripts`, permissões/concurrency não estão
fixados e o requisito mestre #88 inclui container scan sem existir imagem para
ser escaneada.

### Resultado controlado

O CI chama todos os gates disponíveis e um smoke processual confirma que o
worker sem queue adapter encerra com exit 1 e JSON bounded, sem bootstrap ou
stack/cause. O workflow reduz superfícies operacionais com permissions,
concurrency e instalação sem lifecycle scripts. A ausência de container
artifact fica registrada como bloqueio honesto de production hardening.

### Aceite e fora de escopo

- workflow contract tests confirmam readiness, worker smoke, PG, E2E, verify,
  permissions/concurrency, `npm ci --ignore-scripts` e `git diff --check`;
- smoke processual executa o entrypoint real e não aceita saída fictícia;
- sem Dockerfile/registry/container scan, deploy, broker, provider, canal,
  dado real ou side effect.

### Resultado da auditoria controlada

`PLAT-S34-001` foi encerrado como `COMPLETED_CONTROLLED`. O workflow agora
declara permissões mínimas, cancela runs obsoletos, desabilita credenciais
persistentes do checkout, instala sem lifecycle scripts e chama readiness,
verify, smoke do worker, PostgreSQL, E2E e `git diff --check`. O smoke executa
o entrypoint real sem adapter, verifica exit 1 e JSON bounded
`worker.startup_failed/queue_adapter_missing`, sem bootstrap, stack ou cause.
Não há container scan simulado sem imagem/proveniência/policy.

Evidência: `docs/04_audit/0524_plat_s34_controlled_ci_gate_parity_evidence.md`.
O resultado máximo continua `CONTROLLED_MVP_READY`; produção real segue
`NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S33 — Boundary controlado do worker publicado

### Problema

O API e o worker não usam o mesmo kernel: `apps/worker/src/worker.ts` ainda
chama `runAgentTurn` legado com um contrato mínimo sem tenant, agente, versão ou
store publicado, e `main.ts` dispara um job bootstrap fictício. Esse caminho não
produz a evidência/version pinning do runtime atual e pode dar a impressão de
que o worker está pronto quando não há fila configurada.

### Resultado controlado

O worker recebe um job estrito e bounded com tenant, agente, versão pinned,
mensagem e contexto de conversa; delega ao `executePublishedAgent` compartilhado
e retorna o trace controlado. O job nunca resolve latest, nunca chama provider ou
canal real e nunca marca outbox/efeito como processado. Sem adapter de fila
explicitamente configurado, o entrypoint falha fechado sem executar bootstrap.

### Aceite

- shape legado ou campos incompletos falham antes do executor;
- job válido mantém tenant/agent/version e executa somente a versão
  `PUBLISHED`/`ARCHIVED` indicada;
- ausência, mismatch ou status inválido retorna resultado fail-closed sem
  provider/tool/side effect;
- `main.ts` não usa IDs fictícios nem processa job sem adapter configurado;
- RED/GREEN, unit/integration, E2E controlado, verify, coverage, readiness,
  audit, format e diff check permanecem verdes.

### Fora de escopo

Não inclui broker, fila durável, retry/lease distribuído, outbox, provider,
canal, RAG, deploy, dados reais ou ativação de side effect.

### Resultado da auditoria controlada

`PLAT-S33-001` foi encerrado como `COMPLETED_CONTROLLED`. A implementação e os
testes confirmam job strict/bounded, pinning explícito, fail-closed para
legacy/limites/status/mismatch e entrypoint sem bootstrap fictício. O lane não
cria fila operacional nem autoriza produção real.

## PLAT-S32 — Version pinning controlado por sessão

### Problema

O runtime resolve a publicação corrente a cada mensagem. Quando uma conversa
continua depois de `publish v2`, ela pode mudar de comportamento no meio do
fluxo, embora `AgentVersion` seja imutável. Isso quebra reprodutibilidade,
auditoria e o requisito do prompt mestre de pinning por conversa/sessão.

### Resultado controlado

Cada sessão runtime pode carregar um par imutável `agentId`/
`agentVersionId`. O primeiro turno publicado resolve a versão ativa e grava o
par com compare-and-swap; turnos seguintes usam exatamente essa versão,
inclusive quando ela foi arquivada por uma publicação posterior. Sessões
legadas sem binding são compatíveis e recebem o binding na primeira execução.
Binding incompleto, mismatch de tenant/agente/versão ou corrida que perder o
CAS falha fechado e não faz fallback para outra versão.

### Aceite

- schema de sessão, store em memória, PostgreSQL tenant-scoped e wrapper de
  pool expõem binding opcional e cópia defensiva;
- migration `0008_session_agent_version_pin.sql` é aditiva, checksum-guarded,
  RLS-compatible e exige par completo, relações tenant-aware e índice bounded;
- runtime novo fixa a versão publicada antes de executar e continuations usam
  `PUBLISHED` ou snapshot `ARCHIVED` pertencente ao mesmo agent/tenant;
- publicar v2 depois do primeiro turno não altera o `versionId` do trace da
  sessão, resposta ou ferramenta controlada;
- binding parcial, cross-tenant, versão de outro agent, versão draft/testing e
  corrida de primeiro binding não chamam provider/tool nem persistem completion
  incorreta;
- RED/GREEN, unit/integration, PostgreSQL controlado, E2E, verify, coverage,
  readiness, audit, format e diff check permanecem verdes.

### Status da aceitação

`PLAT-S32-001` foi auditado como `COMPLETED_CONTROLLED`. A evidência executável
está em `docs/04_audit/0522_plat_s32_controlled_session_version_pinning_evidence.md`;
isso não autoriza dados reais, providers, canais ou efeitos externos.

### Fora de escopo

Não inclui migração de sessões reais sem aprovação, IdP/RBAC, coordenação HA,
provider/canal, RAG, rollout gradual, worker distribuído, dados reais ou
qualquer efeito clínico, financeiro, de agenda ou externo.

## Problema

O runtime atual atende a Secretary com regras e fluxos acoplados ao domínio hospitalar. Isso impede criar Agent A/B, editar comportamento sem código, testar regressões de configuração e governar plugins sem duplicar runtime. O produto precisa de um control plane declarativo que preserve a operação controlada existente.

## Objetivo do MVP

Permitir que um operador administrativo autorizado, em ambiente de teste, crie uma configuração de agente, componha seus prompts/policies/plugins, execute um dry-run rastreável e publique/retorne versões imutáveis. O MVP deve ser genérico no kernel e manter a Secretary como template/adaptação inicial.

## Usuários

- **Admin controlado:** mantém agentes, versões, bindings e flags do próprio tenant.
- **Supervisor/Approver:** revisa policy, handoff e ações que exigem approval.
- **Builder/QA:** executa Test Lab e compara traces sem canal real.
- **Runtime:** resolve apenas versões publicadas e aplica hard safety.

## User stories e aceite

1. Como Admin, crio um draft com persona, greeting, thresholds e model ref sem segredo.
2. Como Builder, executo um caso fictício e vejo agent/version, intent, confidence, policy, knowledge, tools, response, handoff e trace.
3. Como Supervisor, uma ação sensível é bloqueada ou encaminhada; nenhuma configuração de agente a libera.
4. Como Admin, publico uma versão aprovada; o snapshot anterior não muda.
5. Como Admin, faço rollback criando uma nova versão apontando para snapshot anterior.
6. Como operador de outro tenant, não consigo ler, editar ou executar configurações fora do meu tenant.
7. Como runtime, uma ferramenta sem binding/permissão/approval não executa.
8. Como operador humano, quando takeover está ativo o bot fica silencioso até retorno explícito.
9. Como maintainer, a Secretary legada continua passando seus fluxos controlados.

## Não objetivos do MVP

- envio para WhatsApp/Chatwoot ou qualquer canal real;
- chamada a OpenAI/OpenRouter ou outro provider externo;
- RAG institucional real, prontuário, cobrança ou agenda real;
- marketplace de plugins;
- decisões clínicas, financeiras ou definitivas;
- descoberta automática de tenants/cargos reais;
- deploy ou migração destrutiva.

## Quality bar congelado

| ID    | Barra de qualidade              | Evidência mínima                                                 |
| ----- | ------------------------------- | ---------------------------------------------------------------- |
| QB-01 | nenhum alias externo no teste   | teste de resolução + inspeção de config                          |
| QB-02 | validação de fronteira          | schemas rejeitam tenant/id/config inválidos                      |
| QB-03 | isolamento tenant               | testes cross-tenant para read/write/run                          |
| QB-04 | publicação imutável             | testes de snapshot e rollback                                    |
| QB-05 | hard safety                     | matriz clínica/financeira/agenda sempre blocked/handoff          |
| QB-06 | gateway deny-by-default         | tool sem binding/permission/policy não roda                      |
| QB-07 | segredo não persistido/traceado | schema e redaction tests                                         |
| QB-08 | dry-run sem efeitos reais       | fake provider/channel e assertions de zero dispatch              |
| QB-09 | Secretary compatível            | suíte atual sem regressão, incluindo Postgres quando disponível  |
| QB-10 | engenharia verificável          | format, typecheck, lint, unit/integration, coverage local, audit |

## Métricas do MVP controlado

- 100% das decisões de tool e handoff no trace.
- 0 chamadas de provider/canal externo no Test Lab.
- 0 leitura cross-tenant nos testes.
- 100% de versões publicadas com hash/snapshot não mutável.
- cobertura mínima do código novo alinhada ao gate do repositório (80% statements/branches/functions/lines).

## Riscos e mitigação

- configuração flexível pode virar bypass: hard safety em código + gateway central;
- versionamento incorreto pode alterar conversas em curso: pin por versão e snapshot imutável;
- teste falso verde: aliases locais e teste de origem;
- vazamento em trace: schemas minimizados/redaction;
- pressão por piloto real: boundary explícito e signoff separado.

## PLAT-S10 — Control Center para catálogo declarativo de plugins

### Problema

O catálogo tenant-aware de manifests foi implementado no control plane e exposto
por API, mas o operador Admin ainda precisa sair do Control Center para revisar
metadata. Isso deixa a governança do plugin parcialmente API-only e não satisfaz
o requisito de uma superfície operacional para Plugins.

### Resultado controlado

O Admin deve conseguir carregar o catálogo do tenant, criar um snapshot de
metadata a partir dos campos controlados do editor, revisar o status e solicitar
as transições `DRAFT → APPROVED` ou `DRAFT → ARCHIVED`. O resultado precisa
exibir claramente que `APPROVED` é apenas metadata revisada: não instala código,
não concede permission, não registra handler e não libera provider, canal ou
efeito externo.

### Fora de escopo

Marketplace, download/instalação, dependências de rede, health probe externo,
handlers persistentes, provider/canal real, dados reais e qualquer side effect.

### Aceite

- o Control Center lista apenas os registros do tenant autenticado;
- a criação usa manifest validado e não envia segredo ou código executável;
- a aprovação envia `expectedStatus` e diferencia conflito stale de erro de
  validação;
- a UI informa status, versão e actor de aprovação e mantém a mensagem
  metadata-only;
- o fluxo legado de AgentVersion/Test Lab permanece inalterado.

## PLAT-S11 — event bus e hooks de plugins controlados

### Problema

O contrato de `PluginManifest` já reserva `hooks`, mas a plataforma ainda não
tem um barramento interno que publique eventos do pipeline nem uma fronteira
que obrigue cada hook a ser declarado pelo plugin. Sem esse contrato, um
plugin local não consegue observar lifecycle, policy, handoff ou erro de forma
tenant-aware e auditável.

### Resultado controlado

Adicionar um event bus tipado, allowlisted e somente em memória para o runtime
controlado. Hooks são registrados apenas por plugins locais já validados, com
tenant explícito, declaração correspondente no manifest, payload mínimo
redigido e envelope imutável. Falhas de hook são isoladas, registradas como
falha sanitizada e nunca alteram a decisão do Test Lab nem habilitam dispatch
externo.

### Fora de escopo

- broker durável, retry/outbox, webhook ou entrega entre processos;
- execução de manifests aprovados do catálogo S09;
- marketplace, instalação, código de terceiros, provider, canal ou side effect;
- payload bruto de mensagem, PII deliberada, segredo ou fonte institucional;
- observabilidade de produção, SLA de entrega ou garantia de HA.

### Aceite

- eventos internos usam nomes tipados e allowlisted e rejeitam nomes
  desconhecidos;
- a inscrição falha fechado quando o hook não está declarado no manifest, o
  handler não existe ou o tenant está inválido;
- cada entrega recebe cópia profunda redigida e imutável do envelope; um hook
  não consegue modificar a entrada original nem observar outro tenant;
- exceções de um hook não interrompem os demais hooks nem o Test Lab e geram
  resultado/auditoria sanitizados;
- o Test Lab emite eventos representativos de mensagem, resolução, policy,
  prompt, model, tool, handoff/security, response e conclusão sem alterar
  `externalCall: false`;
- testes RED/GREEN, typecheck, lint, format, build, coverage, readiness, E2E,
  audit e inspeção de fronteira permanecem verdes.

## PLAT-S12 — prompt profile e templates no Control Center

### Problema

`AgentConfig` já possui `promptBlocks` e `responseTemplates`, porém o Control
Center apenas preserva esses campos ao clonar uma versão. O operador não
consegue revisar a composição determinística nem ajustar respostas operacionais
seguras sem editar payloads fora da UI. O trace identifica versão e block IDs,
mas não oferece checksum/status do perfil para auditoria rápida.

### Resultado controlado

O Control Center deve editar um perfil JSON validado e criar uma nova
`AgentVersion` imutável. A UI deve carregar e serializar blocks/templates sem
segredos, rejeitar conteúdo malformado ou protegido, e exibir que blocos
`system`/`safety` e respostas kernel permanecem somente leitura. O Test Lab
deve usar templates configuráveis apenas nos caminhos operacionais permitidos
e registrar versão, status e checksum determinístico do perfil no trace.

### Fora de escopo

- catálogo de PromptBlock separado ou mutável;
- sobrescrita de versão publicada, publicação automática ou decisão de release;
- edição de hard safety, resposta de medicamento, bloqueio de segurança,
  emergência, takeover humano ou erro interno kernel;
- RAG institucional, provider/canal real, dados reais, side effect ou deploy.

### Aceite

- JSON inválido, ids/kinds/prioridades duplicados, limites excedidos e padrões
  de segredo falham antes de qualquer request de criação;
- editar prompt profile e templates cria snapshot novo, não muta a versão de
  origem, e preserva os campos dos blocos protegidos;
- `low_confidence`, `no_knowledge`, `handoff` e
  `scheduling_without_evidence` têm fallback controlado e nenhum caminho de
  segurança pode ser customizado pelo editor;
- checksum é estável para o mesmo conteúdo e muda quando o perfil muda;
- trace e Control Center tornam visíveis a versão/status/checksum sem texto
  bruto adicional;
- RED/GREEN, verify, coverage, readiness, E2E, PostgreSQL, audit, format e
  diff check permanecem verdes.

### Resultado controlado PLAT-S15

`PLAT-S15-001` foi concluída como `COMPLETED_CONTROLLED`. O catálogo bounded
tenant-aware foi implementado em memória e PostgreSQL, com API/UI e E2E; a
aprovação permanece metadata-only e não altera `AgentVersion`, não produz RAG
e não executa efeitos externos.

Evidência: `docs/04_audit/0505_plat_s15_controlled_knowledge_source_catalog_evidence.md`.
Gates: 83 arquivos/294 testes pass/17 skips, coverage 85,03%/80,26%/85,41%/
85,88%, readiness, E2E, PostgreSQL controlado, audit, format e diff check PASS.

## PLAT-S16 — Ledger controlado de evidência de release candidate

### Problema

O preflight crítico do S14 protege `publish/rollback`, mas a plataforma ainda
não mantém um registro durável da evidência controlada observada para uma
versão. Sem esse ledger, o operador precisa reconstruir manualmente quais gates
foram observados e não existe digest que permita detectar uma declaração
alterada depois da revisão.

### Resultado controlado

O Admin poderá criar um `ReleaseCandidateRecord` tenant-aware, vinculado a um
`Agent` e `AgentVersion`, com quatro gates fixos (`safety_preflight`,
`test_lab_regression`, `snapshot_integrity`, `external_boundary`), referências
de evidência `controlled://evidence/...` e digest determinístico calculado pelo
servidor. O lifecycle será `DRAFT -> VALIDATED | REJECTED | ARCHIVED`, com
`expectedStatus`, ator de validação e cópia defensiva.

`VALIDATED` significa somente uma atestação administrativa controlada da
evidência fornecida; não publica, não faz deploy, não muda `AgentVersion`, não
altera `activeVersionId`, não habilita provider/canal e não autoriza dados reais
ou efeitos externos. Gates `FAIL` impedem `VALIDATED`.

### Fora de escopo

- deploy, rollout, tráfego real, promoção automática ou alteração de release;
- validação de infraestrutura real, IdP, RBAC operacional, provider ou canal;
- conteúdo de knowledge, ingestão, embeddings, RAG ou dados reais;
- assinatura externa, KMS, marketplace, broker ou coordenação distribuída;
- apagar/reescrever evidência já registrada ou mutar snapshots de agente.

### Aceite

- schema estrito exige exatamente os quatro gates, referências controladas,
  status bounded e IDs tenant-aware; segredo, URL externa e campos extras falham;
- store em memória e PostgreSQL preservam identidade/gates/digest, aplicam
  unique por tenant/agent/version/digest, RLS e lifecycle CAS;
- somente registros com todos os gates `PASS` podem transicionar para
  `VALIDATED`; transições inválidas e stale retornam conflito sem mutação;
- API admin lista/cria/obtém/transiciona registros e audita somente IDs,
  status, digest e chaves dos gates, nunca payload bruto;
- Control Center mostra a declaração como atestação metadata-only e mantém o
  snapshot do agente inalterado;
- RED/GREEN, verify, coverage, readiness, E2E, PostgreSQL, audit, format e
  diff check permanecem verdes.

## PLAT-S13 — Handoff Policy Studio controlado

### Problema

O Control Center permite editar um único destino e um threshold genérico, mas
não expõe a política operacional completa de baixa confiança. O runtime usa
`policies.minConfidence`/`maxClarifications` de forma limitada e o trace não
mostra o destino nem a prioridade escolhidos. Isso impede revisar, reproduzir
e comparar handoffs sem editar TypeScript.

### Resultado controlado

O Admin poderá configurar, dentro de limites seguros, `clarifyThreshold`,
`handoffThreshold`, máximo de clarificações, lista de destinos e prioridade de
handoff. A configuração continuará dentro do snapshot imutável de
`AgentVersion`; o Test Lab aplicará a política de forma determinística e
registrará somente destino/prioridade/metadados redigidos no trace.

### Fora de escopo

- envio para Chatwoot, WhatsApp ou qualquer canal real;
- regras dependentes de dados reais, sentimento clínico, agenda ou RAG real;
- edição de hard safety, bypass de approval, RBAC, tenant, tool gateway ou
  takeover humano;
- catálogo separado de destinos, migration ou coordenação distribuída;
- publicação automática, rollout, provider externo ou side effect.

### Aceite

- thresholds são números entre 0 e 1, `handoffThreshold` não supera o
  threshold de clarificação e configurações legadas continuam válidas;
- abaixo do handoff threshold o runtime faz handoff; entre handoff e
  clarificação pode pedir clarificação até o limite; depois faz handoff;
- Admin edita múltiplos destinos e prioridade pela UI, com validação antes da
  request e clone para nova `AgentVersion`;
- Test Lab usa o destino/prioridade configurados, eleva prioridade de risco
  alto/crítico para `high` e nunca enfraquece hard safety;
- trace e Control Center exibem destino/prioridade sem mensagem bruta,
  segredo ou side effect;
- RED/GREEN, verify, coverage, readiness, E2E, PostgreSQL, audit, format e
  diff check permanecem verdes.

### Resultado controlado PLAT-S13

`PLAT-S13-001` foi concluída como `COMPLETED_CONTROLLED`. O Control Center
configura thresholds bounded, máximo de clarificações, destinos controlados e
prioridade; cada alteração cria uma nova `AgentVersion`. O Test Lab aplica a
ordem handoff/clarify deterministicamente, eleva risco alto/crítico para
prioridade `high` e expõe somente metadados redigidos no trace.

Evidência: `docs/04_audit/0503_plat_s13_handoff_policy_studio_evidence.md`.
Os gates fecharam com 79 arquivos, 284 testes pass, 16 skips condicionais,
coverage acima de 80%, readiness, E2E, PostgreSQL controlado, audit, format e
diff check. O resultado máximo continua `CONTROLLED_MVP_READY`; destinos reais,
provider/canal, RAG, dados e produção irrestrita permanecem bloqueados.

## PLAT-S14 — Preflight crítico de segurança antes de publish controlado

### Problema

O lifecycle atual exige `APPROVED` e preconditions, mas o endpoint de publish
ainda não executa uma suíte crítica fixa antes de ativar o snapshot. O catálogo
de suites do Test Lab pode ser usado para avaliação controlada, porém não deve
ser a única barreira: uma publicação não pode depender da seleção manual de
cases pelo operador.

### Resultado controlado

Toda publicação administrativa e todo rollback controlado devem executar um
preflight determinístico contra o mesmo tenant, agent e configuração candidata.
O preflight cobre hard safety de medicamento, confirmação/cancelamento/
reagendamento de consulta real e envio externo/provider real. O relatório expõe
somente ids, decisões, modos, handoff e falhas redigidas; o Test Lab mantém
`externalCall: false`. Se qualquer case falhar, a operação falha fechado antes
de mutar lifecycle/activeVersion e registra apenas evidência operacional segura.

### Fora de escopo

- envio para Chatwoot, WhatsApp ou qualquer canal real;
- regras dependentes de dados reais, sentimento clínico, agenda ou RAG real;
- suite editável pelo usuário como substituta do conjunto crítico;
- publicação automática, rollout gradual, feature flag operacional ou tráfego
  real;
- migration, broker, lock distribuído, decisão clínica/financeira ou aprovação
  humana automática.

### Aceite

- `POST /v1/admin/agents/:agentId/versions/:versionId/publish-preflight`
  executa os cases críticos sobre o snapshot informado e retorna resultado
  redigido, tenant-scoped, sem mensagem/resposta bruta;
- `POST .../publish` executa o mesmo preflight imediatamente antes do CAS de
  publicação; rollback aplica a mesma barreira à versão-fonte;
- medicamento deve resultar em policy `blocked`, response `handoff` e
  handoff solicitado; confirmação, cancelamento, reagendamento e envio externo
  devem resultar em policy/response `blocked`, sem handoff automático;
- qualquer falha impede mutação e não emite audit de sucesso; preflight verde
  inclui somente `passed`, quantidade e resumo seguro na auditoria de publish;
- todos os resultados preservam `externalCall: false`, não aceitam cases
  arbitrários e mantêm tenant/agent/version binding;
- RED/GREEN, verify, coverage, readiness, E2E, PostgreSQL, audit, format e
  diff check permanecem verdes.

### Resultado controlado PLAT-S14

`PLAT-S14-001` foi concluída como `COMPLETED_CONTROLLED`. O preflight mantém
cases fixos para os caminhos críticos, publica apenas resumo redigido e é
executado antes de publish, rollback e bootstrap controlado. A fixture negativa
confirmou recusa sem mutação quando `externalCall` viola o contrato.

Evidência: `docs/04_audit/0504_plat_s14_controlled_safety_publish_preflight_evidence.md`.
Os gates fecharam com 80 arquivos, 289 testes pass, 16 skips condicionais,
coverage acima de 80%, readiness, E2E, PostgreSQL controlado, audit, format e
diff check. O resultado máximo continua `CONTROLLED_MVP_READY`; produção real
permanece bloqueada.

## PLAT-S15 — Catálogo controlado de fontes de knowledge

### Problema

O binding de knowledge já exige URI `controlled://` e versão no snapshot de
`AgentVersion`, mas o Control Center não oferece um registro tenant-aware para
revisar identidade, versão, steward e status da fonte. Sem esse catálogo, a
provenance continua sendo texto configurado manualmente e não há histórico
administrativo de aprovação/arquivamento.

### Resultado controlado

O Admin poderá criar e listar metadados de fontes controladas e transicionar
`DRAFT -> APPROVED -> ARCHIVED` com precondition opcional. A identidade
`source/version` será única por tenant e imutável; o catálogo não armazenará
conteúdo documental, PII, chunks, embeddings, credenciais ou respostas RAG.
`APPROVED` será apenas decisão de governança metadata-only e não concederá
resposta, provider, canal ou capability.

### Fora de escopo

- ingestão, parsing, chunking, embeddings, vector store ou RAG real;
- conteúdo de documento, dados clínicos, financeiros ou institucionais reais;
- crawler, URL externa, upload, secret, provider ou busca remota;
- alteração automática de `AgentVersion` ou liberação de resposta sem
  `approvedKnowledge` controlado;
- marketplace, publicação automática, migration destrutiva ou side effect.

### Aceite

- schema aceita somente `controlled://`, versões/labels limitados e descrição
  sem segredo; rejeita URI externa, campos extras e source/version duplicados;
- Store em memória e PostgreSQL são tenant-scoped, defensivos e usam
  compare-and-swap de status; cross-tenant e transição inválida falham fechado;
- API admin lista/cria/transiciona metadados com identidade e audit seguro;
- Control Center carrega, cria e aprova/arquiva metadata sem alterar o
  snapshot do agente; nenhuma resposta RAG é produzida pelo catálogo;
- RED/GREEN, verify, coverage, readiness, E2E, PostgreSQL, audit, format e
  diff check permanecem verdes.

### Resultado controlado PLAT-S16

`PLAT-S16-001` foi concluída como `COMPLETED_CONTROLLED`. O ledger está
implementado em memória e PostgreSQL com migration 0006, RLS, digest do
servidor, lifecycle/CAS, API/UI e audit metadata-only. A evidência é
`docs/04_audit/0506_plat_s16_controlled_release_candidate_evidence_ledger_evidence.md`.
Os gates fecharam com 88 arquivos, 303 testes pass, 18 skips, coverage
84,81%/80,03%/84,87%/85,65%, readiness, E2E, PostgreSQL controlado, audit,
format e diff check PASS. Produção real permanece `NO-GO`.

## PLAT-S17 — Checkpoint controlado de evidência de auditoria

### Problema

A superfície de observabilidade já pagina e redige eventos, mas cada leitura
reconstrói a evidência e não existe uma declaração imutável do conjunto que um
operador revisou. Sem um checkpoint tenant-aware, uma auditoria controlada não
consegue verificar posteriormente se os mesmos eventos e metadados continuam
representados pelo digest observado.

### Resultado esperado

O operador com permissão de auditoria poderá selar um checkpoint de até 200
eventos já visíveis no tenant, informando apenas IDs e filtros bounded. O
servidor verificará pertencimento e filtros, calculará um SHA-256 canônico a
partir dos metadados redigidos e persistirá somente IDs, filtros, contagem,
digest, ator e timestamps. O checkpoint poderá ser arquivado com CAS, sem
reescrever a evidência.

### Fora de escopo

- payload bruto, export externo, download, retenção legal ou purge real;
- dados reais, PII, provider/canal, RAG, agenda, clínico, financeiro ou side effect;
- assinatura KMS, prova externa, broker, replicação ou coordenação distribuída;
- alteração, exclusão ou reprocessamento de eventos de auditoria existentes.

### Aceite

- schema strict limita IDs, filtros, tipo de evento e tamanho do conjunto;
- o servidor rejeita IDs inexistentes, cross-tenant e eventos fora dos filtros;
- digest é calculado pelo servidor e muda quando a evidência observada muda;
- `SEALED -> ARCHIVED` usa `expectedStatus`; identidade/digest/filtros são
  imutáveis e nenhuma transição reabre o checkpoint;
- API, client e UI mostram somente metadata e tratam stale/conflict;
- migration/RLS, RED/GREEN, verify, coverage, readiness, E2E, PostgreSQL,
  audit, format e diff check permanecem verdes.

### Resultado controlado

`PLAT-S17-001_CONTROLLED_AUDIT_EVIDENCE_CHECKPOINT` foi concluída como
`COMPLETED_CONTROLLED`. A implementação cobre memória/PostgreSQL, API,
client/UI, audit metadata-only e migration 0007/RLS. Os gates finais passaram
com 95 arquivos, 317 testes pass, 18 skips, coverage
84,95%/80,00%/84,52%/85,82%, readiness 4/4, E2E 2/2, PostgreSQL controlado
51 pass/18 skips, audit 0 e diff check PASS. Produção real permanece
`NO-GO`/`WAITING_HUMAN_APPROVAL`.

Evidência: `docs/04_audit/0507_plat_s17_controlled_audit_evidence_checkpoint_evidence.md`.

## PLAT-S18 — Boundary HTTP de segurança controlado

### Problema

O API já envia headers defensivos, mas ainda aceita qualquer origem quando o
host encaminha requisições do console e não possui um contrato executável para
preflight CORS ou transporte HTTPS. A auditoria identifica esse gap como
dependência de produção; deixá-lo somente em documentação torna o boundary
fácil de configurar de forma permissiva por acidente.

### Resultado controlado

O API implementou uma política HTTP explícita e fail-closed: origins são
normalizadas e comparadas por igualdade exata, wildcard/`null`/credenciais/path
são rejeitados, preflight aceita somente métodos e headers allowlisted e
requests com `Origin` não aprovado recebem `403`. Os métodos allowlisted são
`GET`, `POST`, `PATCH` e `OPTIONS`, preservando a atualização de tarefas do
Secretary. Quando habilitado, HTTPS é exigido com suporte somente a uma
quantidade explícita de saltos de proxy confiável. Headers CSP e HSTS são
emitidos pelo API sem aceitar valores arbitrários do caller. O bootstrap de
produção exige allowlist de origins e HTTPS explícito.

### Fora de escopo

- configuração ou prova de Caddy, CDN, ingress, TLS, CSP do host ou proxy real;
- IdP, cookies, sessão, CSRF token, RBAC operacional ou tenant provisioning;
- limiter distribuído, replay store, provider/canal, RAG, dados reais, deploy;
- alterar endpoints de negócio, persistência, migration ou data plane legado;
- liberar qualquer efeito clínico, financeiro, de agenda ou externo.

### Aceite

- parser de origins aceita somente `http(s)://host[:port]` sem path, query,
  fragmento, credencial, wildcard ou `null`, com deduplicação determinística;
- preflight desconhecido falha sem executar handler; origin aceita retorna
  `Access-Control-Allow-Origin` exato, `Vary: Origin`, métodos/headers fixos e
  nunca `Access-Control-Allow-Credentials`/`*`;
- enforcement HTTPS falha fechado quando `request.protocol` não é `https`,
  usando apenas `trustedProxyHops` configurado no Fastify;
- CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` e
  `X-Permitted-Cross-Domain-Policies` não podem ser removidos pelo request;
  HSTS aparece somente em transporte seguro;
- `API_ALLOWED_ORIGINS` e `API_REQUIRE_HTTPS=true` são obrigatórios no
  bootstrap de produção; os gates existentes permanecem verdes;
- não há provider, canal, RAG, dado real, deploy ou side effect.

### Fechamento controlado

`PLAT-S18-001_CONTROLLED_HTTP_SECURITY_BOUNDARY` está `COMPLETED_CONTROLLED`.
Os gates passaram com `npm run verify`, 97 arquivos/330 testes pass/18 skips,
coverage 85,16%/80,44%/84,75%/86,06%, readiness 4/4, E2E 3/3, PostgreSQL
controlado 51 pass/18 skips, audit 0 e diff check PASS. Evidência:
`docs/04_audit/0508_plat_s18_controlled_http_security_boundary_evidence.md`.
O release controlado permanece `CONTROLLED_MVP_READY`; produção real continua
`NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S31 — Boundary controlado da nota de decisão de approval

### Problema

`ResolveApprovalSchema.note` é opcional, mas não declara máximo. A descoberta
controlada reproduziu uma decisão fictícia aceitando `note` com 5.000 caracteres
e persistindo o estado `approved`; o conteúdo da nota não é ecoado nem
persistido neste slice.

### Resultado controlado esperado

O schema compartilhado deve impor máximo de 4.000 caracteres em `note`. Valor
acima deve falhar com `validation_failed`/400 antes de `approvals.save`, sem
alterar decisão, identidade, approval state, handoff ou a semântica atual de
não persistência da nota. Valor no limite deve continuar válido.

### Gate registrado

`PLAT-S31-001_CONTROLLED_APPROVAL_DECISION_NOTE_FIELD_BOUNDARY` está registrado
para `SPEC_APPROVED_CONTROLLED_BUILD` antes do BUILD. O lane é limitado à
validação do contrato de entrada; auth, tenant, Secretary, decisão humana,
provider/canal, RAG, dado real, deploy e side effect não serão alterados.

### Resultado controlado

O máximo foi implementado no schema compartilhado e validado antes de
`approvals.save`. RED/GREEN, regressão próxima, verify e gates externos fecharam
`PLAT-S31-001_CONTROLLED_APPROVAL_DECISION_NOTE_FIELD_BOUNDARY` como
`COMPLETED_CONTROLLED`. Evidência:
`docs/04_audit/0521_plat_s31_controlled_approval_decision_note_field_boundary_evidence.md`.

## PLAT-S30 — Boundary controlado de campos de approval request

### Problema

`RequestHumanApprovalSchema` exigia apenas strings não vazias para
`sessionId`, `proposedAction` e `summary`. A descoberta controlada reproduziu
`POST /v1/approvals` aceitando e persistindo `summary` com 5.000 caracteres em
fixture tenant-scoped.

### Resultado controlado esperado

O schema compartilhado deve impor máximos de `sessionId` 160,
`proposedAction` 200 e `summary` 4.000. Valores acima devem falhar com
`validation_failed`/400 antes de `approvals.save`, sem ecoar o conteúdo e sem
alterar risk level, approval pending, handoff ou decisão humana.

### Gate registrado

`PLAT-S30-001_CONTROLLED_APPROVAL_REQUEST_FIELD_BOUNDARY` está registrado para
`SPEC_APPROVED_CONTROLLED_BUILD` antes do BUILD. O lane é limitado à validação
do contrato de entrada; auth, tenant, identidade, Secretary, decisão de
approval, provider/canal, RAG, dado real, deploy e side effect não serão
alterados.

### Resultado controlado

Os máximos foram implementados no schema compartilhado e validados antes de
`approvals.save`. RED/GREEN, regressão próxima, verify e gates externos fecharam
`PLAT-S30-001_CONTROLLED_APPROVAL_REQUEST_FIELD_BOUNDARY` como
`COMPLETED_CONTROLLED`. Evidência:
`docs/04_audit/0520_plat_s30_controlled_approval_request_field_boundary_evidence.md`.

## PLAT-S29 — Boundary controlado de campos de tarefa interna

### Problema

`CreateInternalTaskSchema` exigia apenas valores não vazios e o mínimo atual da
chave de idempotência. A descoberta controlada reproduziu `POST /v1/tasks`
aceitando e persistindo `title`, `description`, `source` e `idempotencyKey` com
5.000 caracteres, aumentando risco de abuso de memória, logs e armazenamento
na fronteira da API.

### Resultado controlado esperado

O schema compartilhado deve impor máximos de `sessionId` 160, `title` 200,
`description` 4.000, `source` 120 e `idempotencyKey` 200. O mínimo 8 da chave
permanece. Valores acima devem falhar com `validation_failed`/400 antes do
repositório, sem ecoar o conteúdo e sem alterar payloads válidos.

### Gate registrado

`PLAT-S29-001_CONTROLLED_INTERNAL_TASK_FIELD_BOUNDARY` está registrado para
`SPEC_APPROVED_CONTROLLED_BUILD` antes do BUILD. O lane é limitado à validação
do contrato de entrada; auth, tenant, identidade, Secretary, persistência,
provider/canal, RAG, dado real, deploy e side effect não serão alterados.

### Resultado controlado

Os máximos foram implementados no schema compartilhado e validados antes do
repositório. RED/GREEN, regressão próxima, verify e gates externos fecharam
`PLAT-S29-001_CONTROLLED_INTERNAL_TASK_FIELD_BOUNDARY` como
`COMPLETED_CONTROLLED`. Evidência:
`docs/04_audit/0519_plat_s29_controlled_internal_task_field_boundary_evidence.md`.

## PLAT-S28 — Boundary controlado de filtro duplicado de audit evidence

### Problema

`parseOptionalAuditFilter` aceita arrays de query e escolhe o primeiro valor.
Assim, `sessionId=a&sessionId=b` retorna sucesso e encaminha somente `a` ao
repositório, embora a intenção do operador seja ambígua.

### Resultado controlado esperado

As consultas de audit evidence devem rejeitar filtros repetidos de `sessionId`,
`correlationId`, `actorId` e `type` com envelope `validation_failed`/400 antes
de summary/page. Filtros únicos, paginação, auth, tenant, persistência e
Secretary não mudam.

### Gate registrado

`PLAT-S28-001_CONTROLLED_AUDIT_FILTER_DUPLICATE_BOUNDARY` está registrado para
`SPEC_APPROVED_CONTROLLED_BUILD` antes do BUILD. RED/GREEN, regressão próxima,
verify e gates externos foram concluídos como `COMPLETED_CONTROLLED`; não há
autorização para alterar persistência estrutural, provider/canal, RAG, dado
real, deploy ou side effect.

### Resultado controlado

Filtros repetidos agora falham antes de summary/page com mensagem constante;
filtro único, paginação, auth, tenant, persistência e Secretary permanecem
inalterados. Evidência:
`docs/04_audit/0518_plat_s28_controlled_audit_filter_duplicate_boundary_evidence.md`.

## PLAT-S27 — Boundary controlado de offset de paginação

### Problema

`parsePagination` limita `limit`, mas aceita qualquer número inteiro não
negativo como `offset`, inclusive valores não seguros como `1e100`. Esse valor
chega aos repositórios em memória e ao `OFFSET` parametrizado do PostgreSQL,
sem teto operacional explícito.

### Resultado controlado esperado

Conversas e audit evidence devem aceitar somente offsets inteiros seguros de 0
a 10.000. Valores negativos, fracionários, não seguros ou acima do teto devem
falhar com envelope `invalid_pagination`/400 antes do repositório. O contrato de
`limit`, tenant, auth, persistência e Secretary não muda.

### Gate registrado

`PLAT-S27-001_CONTROLLED_PAGINATION_OFFSET_BOUNDARY` está registrado para
`SPEC_APPROVED_CONTROLLED_BUILD` antes do BUILD. RED/GREEN, regressão próxima,
verify e gates externos foram concluídos como `COMPLETED_CONTROLLED`; não há
autorização para alterar persistência estrutural, provider/canal, RAG, dado
real, deploy ou side effect.

### Resultado controlado

O offset de conversas e audit evidence agora aceita somente inteiros seguros de
0 a 10.000 e falha antes do repositório para valores inválidos. O contrato de
limit, tenant, auth, persistência e Secretary não mudou. Evidência:
`docs/04_audit/0517_plat_s27_controlled_pagination_offset_boundary_evidence.md`.

## PLAT-S26 — Boundary controlado de mensagens de erro do Prompt Profile

### Problema

O Prompt Profile valida chaves de `responseTemplates` e IDs de `promptBlocks`,
mas algumas falhas constroem `DomainError.message` interpolando valores vindos
do payload. O API passa essa mensagem pelo envelope de erro, permitindo que um
identificador arbitrário seja refletido ao operador e dificultando a garantia
de redaction-safe em entradas não confiáveis.

### Resultado controlado esperado

As falhas de chave inválida, ID duplicado e block protegido devem usar mensagens
constantes, sem incluir o valor recebido. O código do erro, status HTTP,
correlation ID, envelope e ausência de criação de clone/version devem preservar
o contrato existente. A mudança fica limitada ao Prompt Profile controlado.

### Gate registrado

`PLAT-S26-001_CONTROLLED_PROMPT_PROFILE_ERROR_MESSAGE_BOUNDARY` foi registrado
para `SPEC_APPROVED_CONTROLLED_BUILD` antes do BUILD e concluído como
`COMPLETED_CONTROLLED`. Evidência:
`docs/04_audit/0516_plat_s26_controlled_error_message_boundary_evidence.md`.
Gates: focused 4/4; regressão 3 arquivos/21 testes; verify 104 arquivos/371
testes pass/18 skips; coverage 85,41%/80,77%/85,24%/86,42%; readiness 4/4;
E2E 3/3; PostgreSQL 51 pass/18 skips; audit, format e diff check PASS.
Não houve autorização para alterar auth, tenant, identidade, Secretary,
persistência, provider/canal, RAG, dado real, deploy ou side effect.

### Fechamento controlado S26

O Prompt Profile agora retorna mensagens constantes para chave inválida, ID
duplicado e block protegido; o clone inválido permanece em 400 sem criar versão
ou refletir o payload. Produção real continua `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S25 — Boundary controlado do request-target HTTP

### Problema

Uma rota desconhecida ainda pode sair pelo 404 padrão do Fastify e refletir o
request-target bruto, incluindo path e query. O roteador também usa limites
implícitos para parâmetros e não há contrato local para o tamanho máximo do
request-target antes de processar a entrada.

### Contrato controlado

- o Fastify declara `HTTP_REQUEST_TARGET_LIMIT_BYTES = 8192` e
  `maxParamLength = 100` explicitamente;
- rota ou método desconhecido retorna 404 com código `not_found`, mensagem
  constante, envelope API e correlation ID criado pelo servidor;
- request-target bruto acima de 8192 bytes retorna 414 com código
  `request_uri_too_long`, mensagem constante e sem refletir path/query;
- o header `X-Correlation-Id` continua derivado somente do envelope, e nenhuma
  entrada externa é autoridade;
- rotas existentes, parse/body S24, auth, tenant, identidade, Secretary e
  security hooks permanecem sem mudança semântica.

### Aceite

- unknown route/method não expõe o request-target, `message` do Fastify ou
  detalhes internos;
- target longo em path/query falha antes de handler de negócio, sem echo;
- target dentro do limite mantém o comportamento atual;
- focused RED/GREEN, typecheck, lint, format, build, coverage, readiness, E2E,
  PostgreSQL, audit e diff check permanecem verdes.

### Fora de escopo

Não haverá mudança de autenticação, autorização, tenant, identidade, query
semantics de negócio, body/parser S24, upload, streaming, provider, canal, RAG,
dados reais, deploy, persistência ou side effect.

### Gate registrado

`PLAT-S25-001_CONTROLLED_HTTP_TARGET_BOUNDARY` está registrado para
`SPEC_APPROVED_CONTROLLED_BUILD` antes do BUILD e foi concluído como
`COMPLETED_CONTROLLED`. Evidência:
`docs/04_audit/0515_plat_s25_controlled_http_target_boundary_evidence.md`.
Gates: `npm run verify` PASS; 103 arquivos/367 testes pass/18 skips; coverage
85,41%/80,76%/85,24%/86,42%; readiness 4/4; E2E 3/3; PostgreSQL controlado
51 pass/18 skips; audit 0 e diff check PASS. Produção permanece `NO-GO`/
`WAITING_HUMAN_APPROVAL`.

### Fechamento controlado S25

O not-found handler retorna envelope 404 `not_found` sem echo e o target bruto
acima de 8192 bytes falha com 414 `request_uri_too_long`; o parâmetro máximo de
rota é explícito em 100. O Secretary e as fronteiras anteriores permanecem
verdes.

## PLAT-S24 — Boundary controlado de parsing HTTP e payload

### Problema

Falhas de JSON inválido, media type não suportado ou body acima do limite
ocorrem antes dos handlers de rota e atualmente podem sair pelo error handler
padrão do Fastify, sem o envelope API e sem correlation ID. O parser também
captura raw body para verificação de webhook, então o limite precisa ser
explícito para impedir crescimento acidental da entrada.

### Resultado controlado esperado

O Fastify deverá ter `bodyLimit` explícito de 1 MiB. Falhas de parsing serão
classificadas por código conhecido e respondidas por um handler global com
envelope, correlation ID gerado pelo servidor e mensagens genéricas bounded:
`validation_failed`/400 para JSON inválido, `unsupported_media_type`/415 para
media type não suportado e `payload_too_large`/413 para body excessivo. Erro
desconhecido sempre será `internal_error`/500 sem mensagem, stack ou cause.

### Fora de escopo

- upload, multipart, streaming, compressão ou armazenamento de raw body;
- aceitar correlation ID, tenant, identidade ou mensagem a partir do caller;
- alterar autenticação, autorização, RLS, rotas de negócio, Secretary,
  provider/canal, RAG, dado real, deploy ou side effect.

### Aceite

- limite de body é explícito, bounded e coberto por teste de regressão;
- JSON inválido e media type não suportado retornam envelope seguro, sem
  campos padrão do Fastify e com correlation ID server-generated;
- body excessivo retorna 413 sem executar handler, sem payload no response e
  sem detalhes do parser;
- error handler global transforma falhas não tratadas em `internal_error`
  genérico, preservando headers de segurança e o Secretary;
- verify, readiness, E2E, PostgreSQL, audit, format e diff check permanecem
  verdes.

### Gate registrado

`PLAT-S24-001_CONTROLLED_HTTP_PARSE_PAYLOAD_BOUNDARY` está registrado para
`SPEC_APPROVED_CONTROLLED_BUILD` antes do BUILD e foi concluído como
`COMPLETED_CONTROLLED`. Evidência:
`docs/04_audit/0514_plat_s24_controlled_http_parse_payload_boundary_evidence.md`.
Gates: `npm run verify` PASS; 102 arquivos/359 testes pass/18 skips; coverage
85,46%/80,85%/85,21%/86,40%; readiness 4/4; E2E 3/3; PostgreSQL controlado
51 pass/18 skips; audit 0 e diff check PASS.

### Fechamento controlado S24

O lane passou RED/GREEN, crítica lead-only, retest e todos os gates. O envelope
de parser mantém mensagens constantes, correlation ID server-generated e não
expõe raw body, stack, cause ou erro do framework. Produção real permanece
`NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S23 — Boundary controlado de falha de startup

### Problema

O bootstrap do API encerra o processo com `console.error(error)`. Falhas de
configuração, conexão ou preflight são necessárias para manter o startup
fail-closed, mas o objeto de erro bruto pode carregar stack, URL de banco,
credencial, token ou detalhes internos no stderr. Isso aumenta a superfície de
vazamento operacional e torna o formato do diagnóstico instável.

### Resultado controlado

O bootstrap deverá emitir uma única linha JSON, bounded e redaction-safe, com
evento, código e mensagem operacional sanitizada. Erros de configuração
estrutural e valores desconhecidos terão mensagem genérica; mensagens de
bootstrap conhecidas poderão permanecer acionáveis somente após redaction de
segredos, credenciais embutidas, tokens, PII e quebras de linha. Stack e objeto
de erro nunca serão serializados.

### Fora de escopo

- logger distribuído, collector, persistência, alerting ou envio externo;
- alteração do status de saída, ordem de preflight, pool, migration ou secrets;
- exposição de stack trace, causa interna ou valor de variável de ambiente;
- IdP, tenant binding, provider/canal, RAG, dado real, deploy ou side effect.

### Aceite

- `Error` conhecido preserva somente mensagem operacional sanitizada e limitada;
- `ZodError`/erro desconhecido resulta em mensagem genérica sem stack;
- URL com credencial, `Bearer`, `password`, `secret`, `token` e `apiKey` não
  aparecem na linha emitida;
- quebras de linha e mensagens excessivas não permitem log injection nem output
  ilimitado;
- o `main` não envia mais o objeto de erro bruto a `console.error` e mantém
  `process.exit(1)`;
- testes focados e todos os gates existentes continuam verdes, sem mudar o
  comportamento do Secretary ou qualquer boundary externo.

### Gate registrado

`PLAT-S23-001_CONTROLLED_STARTUP_FAILURE_REDACTION` está registrado para
`SPEC_APPROVED_CONTROLLED_BUILD` e foi concluído como
`COMPLETED_CONTROLLED`. Evidência:
`docs/04_audit/0513_plat_s23_controlled_startup_failure_redaction_evidence.md`.
Gates: `npm run verify` PASS; 101 arquivos/351 testes pass/18 skips; coverage
85,42%/80,84%/85,16%/86,33%; readiness 4/4; E2E 3/3; PostgreSQL controlado
51 pass/18 skips; audit 0 e diff check PASS.

### Fechamento controlado S23

O formatter e o catch do entrypoint foram auditados com RED/GREEN, crítica
lead-only e smoke real do processo. O output ficou mínimo, bounded e
redaction-safe, sem alterar exit code, fail-closed ou qualquer fluxo externo.
Produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S22 — Boundary controlado de correlation ID na resposta HTTP

### Problema

Os envelopes da API já carregam `meta.correlationId`, mas o cliente precisa
decodificar o corpo de cada resposta para correlacionar uma falha com logs e
auditoria. Isso também deixa respostas do boundary HTTP menos uniformes para
clientes browser e server-to-server.

### Contrato controlado

- respostas JSON que carregam um envelope válido publicam o mesmo valor em
  `X-Correlation-Id`;
- o valor é extraído do envelope gerado pelo servidor e nunca é aceito de um
  header de entrada;
- respostas CORS de origem aprovada expõem somente esse header ao browser;
- respostas não-JSON, preflight 204 e payloads sem correlation ID não inventam
  header;
- o envelope, tenant binding, autenticação, autorização, collector e Secretary
  permanecem inalterados.

### Fora de escopo

Não haverá aceitação de correlation ID externo, logging de payload, mudança de
identidade/tenant, tracing distribuído, OpenTelemetry, broker, persistência,
provider, canal, RAG, dado real, deploy ou side effect.

### Gate registrado

`PLAT-S22-001_CONTROLLED_CORRELATION_RESPONSE_BOUNDARY` está registrado para
`SPEC_APPROVED_CONTROLLED_BUILD` e foi concluído como
`COMPLETED_CONTROLLED`. Evidência:
`docs/04_audit/0512_plat_s22_controlled_correlation_response_boundary_evidence.md`.
Gates: `npm run verify` PASS; 100 arquivos/343 testes pass/18 skips; coverage
85,37%/80,81%/85,10%/86,29%; readiness 4/4; E2E 3/3; PostgreSQL controlado
51 pass/18 skips; audit 0 e diff check PASS. Produção real permanece `NO-GO`/
`WAITING_HUMAN_APPROVAL`.

## PLAT-S21 — Boundary de exposição de métricas controlada

### Problema

O S19 criou `GET /health/metrics` para inspeção de fixtures, mas um endpoint
agregado público em uma instância production poderia revelar padrões
operacionais de rotas e volume para qualquer caller. A superfície não deve ser
tratada como substituta de uma camada de métricas autenticada e operacional.

### Resultado controlado

O endpoint ficou disponível somente em `NODE_ENV=test` ou
`NODE_ENV=development`, com desabilitação fail-closed em qualquer outro
ambiente. O `BuildServerOptions` poderá desabilitá-lo em fixtures; a opção nunca
reabilitará métricas em production. Toda resposta do endpoint usará
`Cache-Control: no-store`.

### Fora de escopo

- autenticação/IdP, allowlist de rede, Prometheus/OTel, broker ou dashboard;
- alterar `/health`, o collector, o limiter ou o contrato do Secretary;
- provider/canal, RAG, dados reais, deploy, migration ou side effect.

### Aceite

- test/development continuam retornando o snapshot controlado quando habilitado;
- production e ambientes desconhecidos retornam 404 sem snapshot, mesmo que o
  caller tente passar uma opção de habilitação;
- o endpoint habilitado e desabilitado retorna `Cache-Control: no-store`;
- nenhuma chave, path, query, body, identidade ou dado operacional novo é
  exportado; os gates existentes permanecem verdes.

### Gate registrado

`PLAT-S21-001_CONTROLLED_METRICS_EXPOSURE_BOUNDARY` está registrado para
`SPEC_APPROVED_CONTROLLED_BUILD` e foi concluído como
`COMPLETED_CONTROLLED`. Evidência:
`docs/04_audit/0511_plat_s21_controlled_metrics_exposure_boundary_evidence.md`.
Gates: `npm run verify` PASS; 99 arquivos/337 testes pass/18 skips; coverage
85,33%/80,74%/85,07%/86,25%; readiness 4/4; E2E 3/3; PostgreSQL controlado
51 pass/18 skips; audit 0 e diff check PASS. Produção real permanece `NO-GO`/
`WAITING_HUMAN_APPROVAL`.

## PLAT-S20 — Segurança de memória do rate limiter controlado

### Problema

O limiter HTTP atual é process-local e falha fechado por chave, mas o mapa de
buckets não possui limite de cardinalidade nem evicção determinística. Chaves
de origem em excesso poderiam fazer uma instância controlada crescer sem
limite, enquanto políticas inválidas ou chaves gigantes não falham em uma
fronteira explícita. O limiter distribuído continua sendo requisito externo
para produção e não será simulado nesta sprint.

### Resultado controlado

O limiter implementou `maxBuckets` bounded, purga de buckets expirados, evicção
determinística quando a capacidade estiver cheia, validação de chave/política e
snapshot operacional sem exportar chaves. A resposta 429 preserva
`Retry-After` e é marcada como `Cache-Control: no-store`.

### Fora de escopo

- Redis, gateway, limiter distribuído, sincronização entre instâncias ou HA;
- identidade confiável, tenant binding, cálculo de IP no host ou proxy real;
- alteração de limites operacionais para produção, dashboards ou alerting;
- provider/canal, RAG, dados reais, deploy, migration ou side effect.

### Aceite

- capacidade, janela, limite por janela e tamanho de chave falham fechado
  quando inválidos e têm limites máximos explícitos;
- buckets expirados são removidos antes de inserir e, quando cheio, o bucket
  ativo mais antigo é evicto de forma determinística;
- a cardinalidade interna nunca excede `maxBuckets`, sem expor chaves no
  snapshot e sem mutar snapshots anteriores;
- o contrato legado de allow/deny e `Retry-After` permanece compatível, com
  `Cache-Control: no-store` para respostas rate-limited;
- testes focados, `npm run verify`, readiness, E2E, PostgreSQL, audit, format e
  diff check continuam verdes, sem alterar o Secretary ou efeitos externos.

### Gate registrado

`PLAT-S20-001_CONTROLLED_RATE_LIMIT_MEMORY_SAFETY` está registrado para
`SPEC_APPROVED_CONTROLLED_BUILD` e foi concluído como
`COMPLETED_CONTROLLED`. Evidência:
`docs/04_audit/0510_plat_s20_controlled_rate_limit_memory_safety_evidence.md`.
Gates: `npm run verify` PASS; 98 arquivos/335 testes pass/18 skips; coverage
85,31%/80,72%/85,07%/86,23%; readiness 4/4; E2E 3/3; PostgreSQL controlado
51 pass/18 skips; audit 0 e diff check PASS. Produção real permanece `NO-GO`/
`WAITING_HUMAN_APPROVAL`.

## PLAT-S19 — Observabilidade de requests controlada

### Problema

O API possui logs de domínio com `correlationId`, mas ainda não fornece uma
visão agregada e bounded de respostas de segurança, rotas desconhecidas,
métodos, status e latência. Sem essa visão, uma revisão operacional controlada
precisa inferir incidentes a partir de logs de cada fluxo. Métricas distribuídas
reais dependem de infraestrutura e decisão operacional, portanto não serão
simuladas nesta sprint.

### Resultado controlado

O API implementou um collector process-local usado pelo próprio boundary HTTP.
Cada resposta é contabilizada por template de rota, método normalizado, bucket
de status e latência total/máxima. A cardinalidade é bounded, snapshots são
defensivos e o endpoint `GET /health/metrics` retorna somente contadores sem
path/query bruto, body, token, PII ou identidade.

### Fora de escopo

- Prometheus/OTel, broker, storage ou agregação distribuída;
- retenção, alerting, SLO operacional, dashboards externos ou HA;
- logging de body, query, path bruto, headers sensíveis ou identidade;
- provider/canal, RAG, dados reais, deploy, migration ou side effect;
- declarar métricas process-local como prova de observabilidade de produção.

### Aceite

- collector registra método, template de rota, status bucket e latência sem
  mutar snapshot anterior nem aceitar cardinalidade ilimitada;
- respostas de rota, 404 e rejeições do boundary contam sem expor path bruto;
- `GET /health/metrics` é read-only, redigido e retorna envelope controlado;
- snapshot/clones não permitem que caller altere o estado interno;
- todos os gates existentes permanecem verdes e nenhum fluxo de negócio,
  persistência, provider, canal, RAG ou side effect é alterado.

### Fechamento controlado

`PLAT-S19-001_CONTROLLED_REQUEST_OBSERVABILITY_METRICS` está
`COMPLETED_CONTROLLED`. Os gates passaram com `npm run verify`, 98 arquivos/333
testes pass/18 skips, coverage 85,24%/80,63%/84,99%/86,16%, readiness 4/4,
E2E 3/3, PostgreSQL controlado 51 pass/18 skips, audit 0 e diff check PASS.
Evidência: `docs/04_audit/0509_plat_s19_controlled_request_observability_metrics_evidence.md`.
O release controlado permanece `CONTROLLED_MVP_READY`; produção real continua
`NO-GO`/`WAITING_HUMAN_APPROVAL`.
