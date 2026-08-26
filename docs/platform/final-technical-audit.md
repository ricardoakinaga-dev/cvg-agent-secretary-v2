# Auditoria técnica final — CVG Agent Platform controlada

## Identificação

- data da auditoria: `2026-08-26`
- timestamp do fechamento: `2026-08-26T15:59:02-03:00`
- base Git: `f9e0096` (`main`) + checkout controlado `PLAT-S47` fechado, não
  publicado
- escopo: todos os arquivos de `docs/`, o prompt fornecido e o checkout atual
- modo: `DISCOVERY -> PRD -> SPEC -> BUILD -> AUDIT`
- dados: somente fixtures e valores fictícios

## Atualização de auditoria — PLAT-S47 corretivo

O ciclo PLAT-S47 foi endurecido após a crítica independente: o Trace Viewer
fica vazio sem agente selecionado e filtra pelo agente atual; as leituras de
Test Lab suites e release candidates exigem `agentId` na API e no cliente;
traces são redigidos recursivamente; `spans` legado com shape inválido não
derruba o painel; e view scopes do App têm geração monotônica contra callbacks
obsoletos, inclusive A→B→A.

Evidência executável: regressão `127 arquivos/534 testes PASS`, `2 arquivos/
19 testes skipped`; coverage `84,86%` statements, `80,12%` branches, `84,97%`
functions e `85,97%` lines; build `158 módulos`; E2E `4/4`; PostgreSQL `8/72`;
readiness `4/4`; worker smoke; audit `0`; typecheck, lint, format e diff check
PASS. A crítica independente compatível final retornou `PASS_CONTROLLED`, sem
P0/P1/P2/P3, e foi registrada na evidência S47 antes do fechamento deste audit.

O resultado continua limitado a `CONTROLLED_MVP_READY`; nenhuma integração,
dado real, provider, canal, RAG, rede, segredo ou side effect foi ativado.
Produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## Atualização de auditoria — PLAT-S46

Em `2026-08-26T11:22:54-03:00`,
`PLAT-S46-001_CONTROLLED_EXECUTION_TRACE_CORRELATION_BOUNDARY` foi fechado
como `COMPLETED_CONTROLLED`. O kernel resolve e valida um único `traceId` antes
do primeiro evento e o propaga por Test Lab, event bus, hooks, runtime
publicado, gateway, approval, auditorias e PostgreSQL, sem substituir
`event.id` ou `correlationId` locais. IDs inválidos falham antes de lookup,
provider, handler, evento ou transação.

Gates finais: RED 4 arquivos/33 testes, 8 falhas esperadas; GREEN 6 arquivos/
25 testes; `npm test` 126 arquivos pass, 2 skipped, 523 testes pass e 19
skipped; coverage 85,07% statements, 80,06% branches, 85,95% functions e
86,10% lines; PostgreSQL 8/72; readiness 4/4; worker smoke; E2E 4/4; build 70
módulos; audit 0; typecheck, lint, format e diff check PASS.

A revisão independente compatível read-only retornou `PASS` sem P0/P1/P2. A
tentativa especializada incompatível não foi tratada como aprovação. Nenhum
OTel/exporter, broker, rede, provider/canal real, RAG, deploy, dado real,
segredo, ação clínica/financeira ou side effect foi usado. O resultado
controlado permanece `CONTROLLED_MVP_READY`; produção real permanece
`NO-GO`/`WAITING_HUMAN_APPROVAL`.

## Veredito

```txt
CONTROLLED_MVP_READY: PASS
PRODUCTION_REAL_DATA_READY: NO-GO
REAL_EXTERNAL_SIDE_EFFECTS: 0
```

O vertical slice atual é reproduzível como MVP controlado da Agent Platform. Ele entrega Control Plane tenant-aware, versões imutáveis, Control Center, Test Lab dry-run, Trace Viewer, policy/gateway fail-closed, handoff e preset controlado `CVG Secretary`, sem provider, canal, RAG, agenda, dado ou ação sensível real.

O resultado não autoriza piloto, produção irrestrita, migração destrutiva, uso de dados reais ou automação clínica/financeira. Os bloqueios de produção são requisitos deliberados de segurança e governança, não falhas mascaradas como sucesso.

## Atualização de auditoria — PLAT-S45

Em `2026-08-26T09:52:30-03:00`,
`PLAT-S45-001_CONTROLLED_TOOL_INVOCATION_BOUNDARY` foi fechado como
`COMPLETED_CONTROLLED`. O Capability Gateway agora exige validators
server-side de input/output por tool, autorização efetiva independente de
`actor.permissions`, approval durável/single-use, input e configuração bounded,
projeção redigida do resultado e retorno explícito `audit_unavailable` sem
reexecução. Ciclos, proxies hostis, tipos não suportados, handlers não-callable
e payloads fora do contrato falham fechado.

Gates desta atualização: focused 6 arquivos/41 testes; `npm test` 125 arquivos/
512 testes pass, 2 arquivos/19 testes skipped; coverage 85,01% statements,
80,14% branches, 85,82% functions e 86,03% lines; readiness 4/4; worker
startup smoke; PostgreSQL controlado 6 arquivos/53 testes pass, 2 arquivos/19
testes skipped; E2E 4/4; build 70 módulos (278,88 kB/gzip 81,99 kB); typecheck,
lint, format e diff check PASS; audit 0 vulnerabilidades.

A revisão independente compatível read-only retornou `PASS sem P0/P1` após as
correções do BUILD. A tentativa especializada configurada com modelo
incompatível não foi tratada como aprovação. Evidência:
`docs/04_audit/0535_plat-s45_controlled_tool_invocation_boundary_evidence.md`.
Nenhum provider/canal real, rede, RAG, broker, outbox, egress, deploy, dado
real ou side effect foi usado; produção permanece `NO-GO`/
`WAITING_HUMAN_APPROVAL`.

## Atualização de auditoria — PLAT-S40

Em `2026-08-26T04:41:44-03:00`, `PLAT-S40-001` foi fechado como
`COMPLETED_CONTROLLED`. O runtime controlado agora resolve exclusivamente
`fake/deterministic-v1` por registry compilado, rejeita identidade desconhecida
ou `fallbackProvider` antes da pipeline e mantém `externalCall: false` sem
propagar `secretRef`. Test Lab, runtime publicado e worker convergem para a
mesma resolução.

Os gates finais passaram: focused 4 arquivos/19 testes; regressão 121
arquivos/446 testes/19 skips; coverage 85,08/80,11/85,17/86,07; readiness 4/4;
PostgreSQL 8/72; E2E 4/4; worker smoke; build, typecheck, lint, format, audit 0
e diff check. A revisão independente follow-up foi `PASS sem achados
estáticos`. Evidência: `docs/04_audit/0530_plat_s40_controlled_model_provider_identity_evidence.md`.
O veredito de produção permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## Atualização de auditoria — PLAT-S41

Em `2026-08-26T06:20:38-03:00`,
`PLAT-S41-001_CONTROLLED_OUTPUT_SAFETY_BOUNDARY` foi fechado como
`COMPLETED_CONTROLLED`. A output policy trata a completion como não confiável,
valida tipo/limite/redaction, normaliza Unicode/confusáveis, rejeita conteúdo
clínico/financeiro/prontuário/ação sensível e substitui por fallback seguro.
Output reescrito não alcança planning, approval ou tools; o trace, API e
Control Center expõem somente decisão bounded. A conclusão transacional
PostgreSQL e o servidor validam antes de outbound, handoff, auditoria ou
marcação de inbound concluído.

Gates finais: focused 7 arquivos/76 testes; `npm test` 123 arquivos/483 testes
pass, 2 arquivos/19 testes skipped; coverage 85,08% statements, 80,29%
branches, 85,39% functions e 86,12% lines; readiness 4/4; worker smoke;
PostgreSQL 8/72; E2E 4/4; build 70 módulos (278,88 kB / gzip 81,99 kB);
typecheck, lint, format, audit 0 e diff check PASS. A revisão independente
anterior encontrou P0/P1 e os achados foram convertidos em regressões e
corrigidos. A tentativa final assíncrona não retornou no limite e não foi
tratada como aprovação; a inspeção estática local e os gates não deixaram
achado aberto conhecido no escopo controlado. Evidência:
`docs/04_audit/0531_plat_s41_controlled_output_safety_boundary_evidence.md`.
O veredito de produção permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## Atualização de auditoria — PLAT-S37

Em `2026-08-26T02:34:03-03:00`, `PLAT-S37-001` foi fechado como
`COMPLETED_CONTROLLED`. Publish e rollback passaram a exigir candidato
`VALIDATED` do mesmo tenant/agente/versão, com metadados de validação, quatro
gates `PASS` e digest recomputável. A checagem é repetida na API, no store
InMemory e no repositório PostgreSQL; o rollback deriva um novo snapshot da
versão fonte e não transforma evidência em autorização de produção.

Gates desta atualização: `npm test` 119 arquivos/427 testes pass/19 skips;
coverage 84,92% statements, 80,08% branches, 85,08% functions e 85,92% lines;
readiness 4/4; worker startup smoke; E2E 4/4; PostgreSQL controlado 8/71;
typecheck, lint, build, format, audit 0 e diff check PASS. A crítica externa
por subagente não concluiu por indisponibilidade/timeout; foi executada e
registrada auditoria estática local, sem atribuir aprovação a agente ausente.
Evidência: `docs/04_audit/0527_plat_s37_controlled_publish_evidence_authority_evidence.md`.
O veredito segue `CONTROLLED_MVP_READY`; produção real segue `NO-GO` /
`WAITING_HUMAN_APPROVAL`.

## Atualização de auditoria — PLAT-S38

Em `2026-08-26T03:00:00-03:00`, `PLAT-S38-001` foi fechado como
`COMPLETED_CONTROLLED`. O job strict do worker reutiliza o contrato
`ApprovedKnowledgeForTestSchema`, encaminha somente o payload parseado ao
runtime com versão pinned e usa history bounded em 50, alinhado aos demais
boundaries controlados. Payload externo, excedente, com chave extra ou shape
legado falha antes do store.

Gates desta atualização: focused 3 arquivos/14 testes; `npm test` 120/432/19
skips; coverage 84,92% statements, 80,09% branches, 85,08% functions e
85,92% lines; readiness 4/4; worker smoke; E2E 4/4; PostgreSQL 8/71;
typecheck, lint, build, format, audit 0 e diff check PASS. A crítica
independente encontrou apenas o drift médio de history e uma lacuna baixa de
testes; ambos foram corrigidos antes do fechamento. Evidência:
`docs/04_audit/0528_plat_s38_controlled_worker_knowledge_input_parity_evidence.md`.
O veredito segue `CONTROLLED_MVP_READY`; produção real segue `NO-GO` /
`WAITING_HUMAN_APPROVAL`.

## Evidência executável da árvore final

| Gate                           | Resultado                                                                           |
| ------------------------------ | ----------------------------------------------------------------------------------- |
| composite verify gates         | PASS — format, typecheck, lint, build, testes, coverage e audit                     |
| `npm test`                     | PASS — 125 arquivos; 512 testes pass; 2 arquivos/19 testes skipped                  |
| `npm run test:coverage`        | PASS — statements 85,01%; branches 80,14%; functions 85,82%; lines 86,03%           |
| `npm run readiness`            | PASS — 1 arquivo; 4 testes                                                          |
| `npm run test:e2e`             | PASS — 4 fluxos Playwright; boundary HTTP e session pinning incluídos               |
| `npm run test:postgres`        | PASS — 6 arquivos; 53 testes pass; 2 arquivos/19 testes skipped; fixture controlada |
| `npm audit --audit-level=high` | PASS — 0 vulnerabilidades                                                           |
| `git diff --check`             | PASS — nenhum erro de whitespace                                                    |

O E2E final cobre a jornada browser/API de criar, editar prompt/template, publicar
e executar o Test Lab, incluindo o caso fictício `Meu cachorro está vomitando.
Posso dar dipirona?`, verificação de resposta operacional, status e checksum do
profile, além de criar e aprovar metadata de plugin no Control Center. O fluxo
também cria e aprova uma fonte `controlled://` sem alterar a versão do agente.

O E2E S32 navega pelo health do API real de teste, publica v1, envia a primeira
mensagem fictícia, publica v2 e envia uma continuação pela fronteira browser/API;
os dois traces permanecem em v1, que passa a ser `ARCHIVED`. A prova não usa
provider, canal ou dado real.

O S33 cobre a fronteira do worker publicado: job strict/bounded, validação
negativa de legacy/oversized/unknown, draft e cross-agent, execução de snapshot
pinned e ausência de queue adapter no entrypoint. O smoke do worker retorna exit
1 com JSON bounded quando não há adapter; nenhum broker, provider, canal,
outbox ou side effect é iniciado.
O smoke PostgreSQL executa somente fixtures controladas; skips condicionais não são
tratados como cobertura de infraestrutura de produção.

O E2E S17 cobre a jornada browser/API de selar os IDs da página de evidência e
arquivar o checkpoint com CAS, sem payload. O smoke PostgreSQL inclui a
migration 0007 e o repository fake tenant-scoped; nesta rodada o conjunto
PostgreSQL também foi executado contra uma fixture local via `TEST_DATABASE_URL`.

O E2E S18 verifica origin aprovada, origin atacante rejeitada, preflight
`PATCH`, `Vary: Origin`, ausência de credentials e CSP. A suíte Vitest cobre
normalização, métodos/headers, proxy/HTTPS, HSTS e bootstrap de produção.

O E2E S19 verifica o endpoint read-only `/health/metrics` após respostas normais,
404 e rejeição de security boundary. A suíte Vitest cobre cardinalidade bounded,
normalização de rota/método, buckets de status/latência e snapshot defensivo;
nenhum path, query, body, header sensível ou identidade é agregado.

O S20 cobre policy/key inválidas, capacidade de buckets, purge/evicção
determinística, snapshot sem chaves e resposta 429 não cacheável. Os testes
legados de rate limit e os fluxos Secretary permanecem verdes.

O S21 cobre o boundary de exposição do `/health/metrics`: a rota fica disponível
somente em `NODE_ENV=test/development`, pode ser desabilitada apenas nesses
ambientes, retorna 404 genérico sem snapshot em production/staging/QA ou
ambiente desconhecido e usa `Cache-Control: no-store` nas respostas habilitada e
desabilitada. `/health`, o collector e o Secretary permanecem inalterados.

O S22 cobre a ergonomia de correlação HTTP: envelopes válidos publicam o mesmo
`meta.correlationId` em `X-Correlation-Id`, CORS de origem aprovada expõe apenas
esse header, headers externos nunca são refletidos e preflight/non-envelope não
inventam correlação. A mudança não altera envelope, identidade, tenant ou
efeitos externos.

O S23 cobre a falha de startup do API: o entrypoint publica somente evento,
código e mensagem JSON bounded/redaction-safe, sem erro bruto, stack, cause,
credencial, token ou PII; o smoke controlado confirma exit 1 e fail-closed.

O S24 cobre a entrada HTTP antes dos handlers: bodyLimit explícito de 1 MiB,
classificação segura de JSON/media type/body excessivo e error handler global
com envelope e correlation ID server-generated, sem raw body, stack ou cause.

O S25 cobre o request-target antes dos handlers: 8192 bytes UTF-8 bounded,
`maxParamLength` explícito em 100, not-found 404 seguro e 414 para path/query
excessivo, sem refletir target, stack, causa ou detalhes internos.

O S26 cobre mensagens externas do Prompt Profile: chaves/IDs inválidos,
duplicados ou protegidos não aparecem em `error.message`; clones inválidos
continuam em 400 sem criar nova versão ou refletir o payload.

## Matriz de aceite do prompt

| Capacidade                                 | Implementação verificada                                                                                                    | Estado          |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | --------------- |
| Agent/AgentVersion tenant-aware            | `packages/platform/src/contracts.ts`, `control-plane-store.ts` e repositório PostgreSQL                                     | PASS controlado |
| Imutabilidade e lifecycle                  | DRAFT → TESTING → APPROVED → PUBLISHED, snapshot defensivo, rollback como nova versão                                       | PASS controlado |
| Control Center                             | `apps/web/src/features/platform/index.tsx` e rotas `/v1/admin/agents/*`                                                     | PASS controlado |
| Persona, greeting, model, policy e plugins | `AgentConfigSchema`, editor web e `secretRef` sem segredo material                                                          | PASS controlado |
| Preset `CVG Secretary`                     | `secretary-preset.ts`, bootstrap somente `NODE_ENV=development`, testes de idempotência                                     | PASS controlado |
| Test Lab dry-run                           | provider determinístico, `externalCall: false`, nenhum dispatcher externo                                                   | PASS controlado |
| Segurança clínica de medicamento           | classifier/policy hard-safety, risco `critical`, handoff e resposta sem prescrição                                          | PASS controlado |
| Trace investigável                         | risco, policy, knowledge, prompt snapshot, tools, handoff, provider, status, timestamps, latência, tokens estimados e spans | PASS controlado |
| Redaction/persistência                     | clones in-memory/PostgreSQL redigem input/response e preservam apenas output de tool `{ redacted: true }`                   | PASS controlado |
| Knowledge provenance                       | source/version devem coincidir com binding habilitado; UI envia a versão configurada                                        | PASS controlado |
| Capability gateway                         | valida tenant/agent/version, binding, actor, policy, approval e dry-run antes do handler                                    | PASS controlado |
| Handoff/takeover                           | state machine e silêncio do bot existentes no runtime publicado                                                             | PASS controlado |
| Pinning de agent/version por sessão        | migration 0008 aditiva, binding CAS tenant-scoped, `ARCHIVED` válido, API/integração, PostgreSQL e E2E                      | PASS controlado |
| Boundary de worker published-runtime       | job strict/bounded, `versionId` pinned, negativos sem fallback, startup fail-closed e regressão integrada                   | PASS controlado |
| Secretary legada                           | suíte completa, readiness, E2E e smoke PostgreSQL permanecem verdes                                                         | PASS controlado |
| Catálogo persistente Test Lab              | suites tenant/agent/version-scoped, clone versionado, histórico redigido, API/UI e comparação A/B em dry-run                | PASS controlado |
| Conflito otimista de lifecycle             | `expectedStatus`, compare-and-swap em memória/PostgreSQL, HTTP 409, UI de recuperação e ausência de audit de sucesso        | PASS controlado |
| Integridade e version pinning de plugins   | invariantes semânticas, registry multi-versão imutável, seleção pinned/legacy e gateway fail-closed                         | PASS controlado |
| Catálogo declarativo de plugins            | metadata tenant-aware, unique name/version, lifecycle preconditionado, RLS, API admin e ausência de dispatch                | PASS controlado |
| Control Center do catálogo de plugins      | client/UI tenant-aware, criação metadata-only, status/actor, expectedStatus, conflito stale e E2E browser/API               | PASS controlado |
| Event bus e hooks de plugins               | allowlist tipada, inscrição declarada/tenant-scoped, payload redigido/imutável, falha isolada e eventos no Test Lab         | PASS controlado |
| Prompt profile e templates                 | editor JSON fail-closed, blocks protegidos, AgentVersion imutável, templates operacionais, checksum/status no trace         | PASS controlado |
| Handoff Policy Studio                      | thresholds, clarificações, destinos, prioridade, evaluator e trace redigidos; clone imutável no Control Center              | PASS controlado |
| Preflight crítico de publish               | cinco cases fixos, resumo redigido, endpoint e enforcement em publish/rollback sem mutação em falha                         | PASS controlado |
| Catálogo controlado de knowledge           | metadata `controlled://`, lifecycle, unique/RLS, API/UI, PostgreSQL e ausência de conteúdo/RAG                              | PASS controlado |
| Ledger de evidência de release candidate   | quatro gates fixos, digest server-side, lifecycle/CAS, migration/RLS, API/UI e ausência de ativação                         | PASS controlado |
| Checkpoint de evidência de auditoria       | IDs/filtros bounded, digest server-side, lifecycle/CAS, migration/RLS, API/UI e ausência de payload/export                  | PASS controlado |
| Boundary HTTP de segurança                 | origin exact-match, CORS/preflight `GET/POST/PATCH/OPTIONS`, HTTPS/proxy explícito, headers fixos e bootstrap fail-closed   | PASS controlado |
| Observabilidade de requests controlada     | collector process-local bounded, rota/método/status/latência, snapshot defensivo e `/health/metrics` redaction-safe         | PASS controlado |
| Segurança de memória do rate limiter       | policy/key validation, bucket cardinality/eviction bounded, key-free snapshot e 429 `no-store`                              | PASS controlado |
| Boundary de exposição de métricas          | rota somente em test/development, 404 fail-closed sem snapshot e `no-store` fora de fixtures                                | PASS controlado |
| Correlation ID na resposta HTTP            | header derivado do envelope, CORS expose restrito, spoofing negativo e ausência em preflight/non-envelope                   | PASS controlado |
| Falha de startup redaction-safe            | formatter JSON bounded, redaction negativa, sem stack/cause e exit 1 preservado                                             | PASS controlado |
| Parsing HTTP e payload bounded             | bodyLimit 1 MiB, 400/415/413/500 seguros, parser negativo e envelope correlacionado                                         | PASS controlado |

## Implementação entregue nas rodadas S05/S06/S07/S08/S09/S10/S11/S12/S13/S14/S15/S16/S17/S18/S19/S20/S21/S22/S23/S24

1. O Test Lab passou a produzir um trace compatível com investigação operacional controlada, mantendo campos antigos opcionais para compatibilidade histórica.
2. O classificador reconhece pedidos explícitos de medicamento em português e inglês. A amostra veterinária é classificada como `medication_advice`, risco `critical`, policy `blocked`, handoff solicitado e provider/tool externo desativado.
3. O Capability Gateway rejeita IDs de escopo malformados antes de procurar plugin ou handler.
4. O Control Center preserva a versão de knowledge escolhida pelo operador e renderiza os novos metadados do trace.
5. O bootstrap controlado cria uma única versão publicada do `CVG Secretary` somente em memória durante desenvolvimento; teste e produção não sofrem mutação automática.
6. Os clones de trace do store em memória e do repositório PostgreSQL preservam os novos campos sem reintroduzir payload bruto.
7. O Test Lab ganhou catálogo persistente de suites com snapshot imutável, clone versionado, cases redigidos e histórico de runs limitado a variantes controladas.
8. A migration `0003_test_suite_catalog.sql` adiciona tabelas tenant-aware com FK, índices e `FORCE ROW LEVEL SECURITY`; o repository PostgreSQL usa SQL parametrizado e cópia sanitizada.
9. API e Control Center expõem criação, listagem, clone, avaliação, comparação A/B e histórico sem dispatcher/provider externo; versões A/B são validadas contra o mesmo agente e tenant.
10. O lifecycle de `AgentVersion` aceita `expectedStatus` em transition/publish/rollback; snapshot stale falha com `conflict`/HTTP 409 sem mutação parcial ou audit de sucesso.
11. O repository PostgreSQL mantém o compare-and-swap dentro da transação e a UI diferencia conflito de recusa de policy, orientando o operador a recarregar o agente.
12. `PluginManifestSchema` valida invariantes de unicidade, permissions e dependências; `PluginRegistry` suporta versões imutáveis com resolução determinística e o gateway honra pinning sem bypass de autorização.
13. O Control Center permite informar ou remover a versão pinned de um plugin lógico; nenhum handler externo, rede, provider ou canal foi adicionado.
14. O catálogo S09 persiste snapshots declarativos tenant-aware em memória e PostgreSQL, com unique `(tenant, name, version)`, cópia defensiva, lifecycle `DRAFT/APPROVED/ARCHIVED`, precondition e API admin.
15. A migration `0004_plugin_manifest_catalog.sql` aplica constraints de identidade, trigger de imutabilidade, índice de status, `FORCE ROW LEVEL SECURITY` e política fail-closed; `APPROVED` não alimenta o gateway nem autoriza handler.
16. O S10 adiciona a superfície operacional do catálogo ao client/UI: lista sob demanda, cria manifests somente metadata, exibe status/actor/versão, envia `expectedStatus`, trata conflito stale e mantém `APPROVED` desacoplado de execução.
17. O S11 adiciona `PlatformEventBus` com allowlist completa dos eventos internos, envelopes tenant-aware e subscriptions imutáveis; handlers só entram quando o hook está declarado no manifest validado.
18. O bus sanitiza payloads, congela objetos aninhados, entrega cópia independente por handler, filtra por tenant e isola/audita falhas sem propagar exceções ao pipeline.
19. O Test Lab emite eventos representativos de mensagem, contexto, agente, intent, policy, knowledge, prompt, model, tool, handoff, segurança, response e conclusão sem texto bruto ou efeito externo.
20. O catálogo S09 continua metadata-only: aprovação não instala plugin, não registra hook executável e não concede capability, provider, canal ou side effect.
21. O S12 adiciona editor JSON no Control Center, validação redundante UI/backend
    de shape, limites, ids, duplicidade, prototype keys e segredos, preservação
    dos campos protegidos de blocks system/safety/kernel e lock metadata, clone por nova
    AgentVersion, fallbacks operacionais seguros e checksum/status/version no
    trace do Test Lab.
22. O S13 adiciona o Handoff Policy Studio controlado: thresholds bounded e
    relacionais, limite de clarificações, destinos identificadores múltiplos,
    prioridade com elevação segura para risco alto/crítico, decisões determinísticas
    no Test Lab e destino/prioridade redigidos no trace, sem provider, canal ou
    side effect externo.
23. O S14 adiciona o preflight crítico fixo e redigido para medicamento,
    confirmação/cancelamento/reagendamento reais e envio externo; o endpoint de
    publish-preflight, publish, rollback e bootstrap controlado executam a
    barreira, que falha fechado sem mutação quando há regressão ou chamada
    externa detectada.
24. O S15 adiciona catálogo metadata-only tenant-aware de fontes `controlled://`,
    com schema bounded/strict, rejeição de segredos/URLs externas, unique por
    tenant, lifecycle compare-and-swap, migration `0005` com trigger/RLS,
    repository/tenant wrapper PostgreSQL, API auditada, Control Center e E2E;
    `APPROVED` não altera AgentVersion, não produz RAG e não faz dispatch.
25. O S16 adiciona o ledger metadata-only de release candidate com quatro gates
    fixos, refs `controlled://evidence/...`, digest SHA-256 calculado pelo
    servidor, vínculo tenant/agent/version, lifecycle/CAS, migration 0006,
    trigger/RLS, repository tenant-scoped, API, Control Center, audit redigido
    e E2E; `VALIDATED` não altera AgentVersion/activeVersionId nem habilita
    execução externa.
26. O S17 adiciona checkpoint metadata-only tenant-aware de até 200 IDs, filtros
    strict, digest SHA-256 server-side, lifecycle `SEALED/ARCHIVED` com CAS,
    migration 0007/RLS, repository de memória/PostgreSQL, API/client/UI,
    audit redigido e E2E; nenhum payload bruto é persistido/exportado e os
    eventos existentes não são alterados.
27. O S18 adiciona o boundary HTTP controlado: origins normalizadas por
    `URL.origin`, CORS/preflight fail-closed com `GET/POST/PATCH/OPTIONS`,
    headers CSP/security fixos, HTTPS com `trustedProxyHops` explícito,
    HSTS HTTPS-only e bootstrap production exigindo allowlist e HTTPS; o
    `PATCH` existente de tarefas foi preservado e nenhum endpoint de negócio,
    persistência, provider, canal, RAG ou side effect foi ampliado.
28. O S21 fecha a exposição acidental de métricas: `/health/metrics` só é
    habilitado em test/development, a opção de build apenas desabilita a rota
    em ambientes controlados, respostas desabilitadas são 404 genéricas sem
    snapshot e todas as respostas usam `Cache-Control: no-store`; não há auth,
    edge, collector distribuído ou side effect novo.
29. O S22 adiciona `readResponseCorrelationId` com validação estrita do
    `CorrelationIdSchema`, hook `preSerialization` não-mutante para publicar
    `X-Correlation-Id` e exposição CORS somente após allowlist exact-origin;
    nenhum header externo, payload, identidade, tenant ou tracing distribuído
    se torna autoridade.
30. O S23 adiciona `serializeStartupFailure`/`formatStartupFailure` como
    boundary local do bootstrap: saída JSON mínima, redaction de URL com
    credencial, password/secret/token/apiKey, Bearer/Basic e PII, normalização
    de controles, truncamento bounded e fallback genérico para configuração,
    unknown ou mensagem não textual. O `main` mantém `process.exit(1)` e não
    serializa o erro bruto.
31. O S24 adiciona bodyLimit explícito de 1 MiB, parser JSON com erro
    classificado, error handler global e códigos seguros para JSON inválido,
    media type, body excessivo e erro desconhecido. Respostas são envelopes
    com correlation ID server-generated e não refletem raw body, headers,
    stack, cause ou mensagem arbitrária.
32. O S32 adiciona pinning monotônico de `agentId`/`agentVersionId` por sessão,
    migration aditiva `0008` com FKs compostas e índice tenant-aware, CAS em
    memória/PostgreSQL, wrapper de pool e execução de snapshots `ARCHIVED`.
    Publish v2 não troca continuations iniciadas em v1; o teste browser/API e
    o smoke PostgreSQL confirmam o contrato sem provider, canal ou side effect.
33. O S33 remove o caminho worker legado: `PublishedAgentJobSchema` é strict e
    bounded, `processAgentTurnJob` delega ao runtime publicado com
    `versionId`, jobs inválidos/status/mismatch falham sem fallback e `main.ts`
    não dispara bootstrap fictício sem queue adapter. O parser foi colocado em
    `agent-core` para manter a boundary de dependências do workspace.

## Segurança e limites

### Passes controlados

- schemas Zod validam IDs, tenant, configuração, plugin, policy e knowledge na fronteira;
- valores de segredo não entram em `AgentVersion`, UI, prompt ou trace; somente `secretRef` é permitido;
- hard safety não pode ser liberada por policy configurável;
- ações de confirmação/cancelamento/reagendamento real permanecem bloqueadas;
- Test Lab usa provider fake/determinístico e `externalCall: false`;
- knowledge sem source/version aprovado não responde e encaminha;
- output de ferramenta nunca é persistido em claro;
- hooks recebem somente eventos minimizados e redigidos; tokens e PII em erros
  de handlers são mascarados e falhas não alteram decisões do Test Lab;
- o boundary HTTP aplicacional normaliza origins, rejeita CORS/preflight fora
  da allowlist, exige HTTPS quando configurado e emite headers fixos; o host,
  proxy e TLS reais ainda exigem configuração e evidência operacional;
- o `X-Correlation-Id` é derivado do envelope validado, não aceita valor
  externo e só é exposto via CORS após allowlist exact-origin;
- `npm audit --audit-level=high` encontrou 0 vulnerabilidades.

### Bloqueios de produção ainda abertos

- IdP confiável, tenant binding derivado de identidade e RBAC operacional;
- rollout real de RLS/backfill do data plane legado sob change control e roles separadas;
- rate limit, replay store, lease recovery e observabilidade distribuídos;
- configuração/prova do host para CSRF, CORS, HTTPS, TLS e CSP (o boundary do
  API está controlado, mas não substitui Caddy/CDN/ingress/host real);
- secret manager, rotação operacional e provider/modelo/canal reais;
- coordenação distribuída multioperador, HA, ETag de proxy e operação real além do compare-and-swap controlado;
- retenção, purge, classificação legal e governança de PII;
- ciclo institucional real de ingestão/aprovação/versionamento de knowledge;
- marketplace aberto, instalação de código de terceiros, catálogo de handlers executáveis e providers duráveis com compensação de side effects;
- decisões humanas sobre cargos, tenants, handoff, piloto e qualquer ação clínica, financeira ou de prontuário.

Esses itens não foram simulados como se estivessem prontos. Ativá-los exige novo SPEC, infraestrutura e aprovação humana.

## Gaps de produto explicitamente fora deste slice

O catálogo declarativo tenant-aware de manifests agora tem superfície operacional no Control Center, mas continua somente metadata-only; ele não é marketplace nem catálogo de handlers executáveis. O event bus e os hooks S11 são process-local/best-effort, sem broker, retry durável ou entrega remota. A comparação A/B existe somente no Test Lab controlado. Ainda não existe marketplace aberto, instalação de código de terceiros, lifecycle institucional real de knowledge, registry/lease de providers externos, tráfego gradual real, coordenação multioperador distribuída ou publicação automática baseada em A/B. Isso é trabalho de próxima fase, não autorização para inventar dados ou efeitos reais.

Também permanecem históricas as descrições antigas de Discovery e das auditorias anteriores. Este arquivo é a fonte de decisão atual para o estado do checkout; os documentos históricos não foram reescritos para apagar evidência temporal. As evidências específicas das rodadas recentes estão em `docs/04_audit/0497_plat_s07_optimistic_conflict_evidence.md`, `docs/04_audit/0498_plat_s08_plugin_manifest_versioning_evidence.md`, `docs/04_audit/0499_plat_s09_plugin_catalog_evidence.md`, `docs/04_audit/0500_plat_s10_plugin_catalog_control_center_evidence.md`, `docs/04_audit/0501_plat_s11_event_bus_hooks_evidence.md`, `docs/04_audit/0502_plat_s12_prompt_profile_template_control_center_evidence.md`, `docs/04_audit/0503_plat_s13_handoff_policy_studio_evidence.md`, `docs/04_audit/0504_plat_s14_controlled_safety_publish_preflight_evidence.md`, `docs/04_audit/0505_plat_s15_controlled_knowledge_source_catalog_evidence.md`, `docs/04_audit/0506_plat_s16_controlled_release_candidate_evidence_ledger_evidence.md`, `docs/04_audit/0507_plat_s17_controlled_audit_evidence_checkpoint_evidence.md`, `docs/04_audit/0508_plat_s18_controlled_http_security_boundary_evidence.md`, `docs/04_audit/0509_plat_s19_controlled_request_observability_metrics_evidence.md`, `docs/04_audit/0510_plat_s20_controlled_rate_limit_memory_safety_evidence.md` e `docs/04_audit/0511_plat_s21_controlled_metrics_exposure_boundary_evidence.md`.

Evidência corrente do fechamento S22:
`docs/04_audit/0512_plat_s22_controlled_correlation_response_boundary_evidence.md`.

Evidência corrente do fechamento S23:
`docs/04_audit/0513_plat_s23_controlled_startup_failure_redaction_evidence.md`.

Evidência corrente do fechamento S24:
`docs/04_audit/0514_plat_s24_controlled_http_parse_payload_boundary_evidence.md`.

## Limitação histórica da revisão independente — S24

Foram tentados scouts paralelos de backend, frontend e segurança e uma revisão independente final naquela rodada histórica. O runtime de child agents rejeitou os modelos disponíveis por limite de uso da conta e incompatibilidade de modelo. Portanto, S24 não reivindicou aprovação independente; o fechamento foi feito por auditoria lead-only, testes RED/GREEN, inspeção temporal do diff, gates executáveis e revisão de segurança estática. Isso não substitui o veredito independente posterior de S47, registrado no topo deste documento e na evidência corrente.

## Próximo passo seguro

S19, S20, S21, S22, S23 e S24 foram concluídos como lanes controlados. O próximo passo
obrigatório é abrir novo SPEC para uma lacuna segura; a preparação de
infraestrutura real continua separada e dependente de decisão humana. Nenhum
deploy, push operacional, piloto, dado real ou provider/canal deve ser ativado
a partir deste veredito.

## PLAT-S12 registrado — prompt profile e templates controlados

Em `2026-08-24T22:14:10-03:00`, foi registrado o `PLAT-S12-001` para fechar
somente a lacuna de operação dos `promptBlocks`/`responseTemplates` no Control
Center. O lane usa `AgentVersion` como autoridade imutável, adiciona checksum e
status do perfil ao trace e preserva blocks system/safety/kernel e respostas de
segurança fora do alcance do editor. Naquele registro, a implementação ainda
estava pendente de BUILD/AUDIT; nenhum gate de produção foi alterado.

## PLAT-S12 — fechamento controlado

Em `2026-08-25T08:41:18-03:00`, a implementação e a auditoria controlada do
`PLAT-S12-001` foram concluídas. O editor cria somente novas versões, protege
blocks kernel/system/safety e respostas hard safety, valida a fronteira de
templates e publica checksum/status/version no trace; o Test Lab continua fake,
redigido e sem efeito externo.

Evidência detalhada: `docs/04_audit/0502_plat_s12_prompt_profile_template_control_center_evidence.md`.
O fechamento foi lead-only por indisponibilidade de child agents; nenhuma
aprovação independente ou autorização de produção é reivindicada. O resultado
máximo é `CONTROLLED_MVP_READY`; produção real permanece `NO-GO`.

## PLAT-S13 — fechamento controlado

Em `2026-08-25T09:22:22-03:00`, a implementação e a auditoria controlada do
`PLAT-S13-001_HANDOFF_POLICY_STUDIO` foram concluídas. O Control Center cria uma
nova `AgentVersion` com thresholds de clarificação/handoff, limite de
clarificações, destinos múltiplos e prioridade; o evaluator e o Test Lab aplicam
as decisões determinísticas e registram somente destino/prioridade redigidos no
trace. Risco alto/crítico não pode reduzir prioridade nem liberar hard safety.

Evidência detalhada: `docs/04_audit/0503_plat_s13_handoff_policy_studio_evidence.md`.
Gates: 79 arquivos, 284 testes pass, 16 skips, coverage 84,98%/80,44%/86,00%/
85,92%, readiness 4/4, E2E 1/1, PostgreSQL 49 pass/16 skips, audit 0 e diff
check PASS. O fechamento foi lead-only; o resultado máximo continua
`CONTROLLED_MVP_READY`, produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S15 registrado — catálogo controlado de fontes de knowledge

Em `2026-08-25T10:05:24-03:00`, foi registrado o
`PLAT-S15-001_CONTROLLED_KNOWLEDGE_SOURCE_CATALOG` para governar somente
metadata tenant-aware de `source/version/status`. O próximo lane não armazenará
conteúdo, não fará ingestão/embeddings/RAG e não alterará respostas do Test Lab.

O gate atual é `SPEC_APPROVED_CONTROLLED_BUILD`; o próximo passo é escrever RED.
Produção real, URL externa, provider, canal, dado real e side effect continuam
não autorizados.

## PLAT-S14 registrado — preflight crítico antes de publish

Em `2026-08-25T09:32:00-03:00`, foi registrado o
`PLAT-S14-001_CONTROLLED_SAFETY_PUBLISH_PREFLIGHT` para fechar a barreira
ausente entre `APPROVED` e `PUBLISHED`. O próximo lane executará cases fixos de
medicamento, confirmação/cancelamento/reagendamento reais e envio externo no
próprio snapshot, com resultado redigido e `externalCall: false`.

O gate atual é `SPEC_APPROVED_CONTROLLED_BUILD`; o próximo passo é escrever RED.
Nenhum publish/rollback real, provider, canal, RAG, dado real ou side effect foi
autorizado.

## PLAT-S14 — fechamento controlado

Em `2026-08-25T09:59:11-03:00`, a implementação e a auditoria controlada do
`PLAT-S14-001_CONTROLLED_SAFETY_PUBLISH_PREFLIGHT` foram concluídas. O preflight
executa cinco cases imutáveis no próprio snapshot, não aceita cases arbitrários,
resume apenas metadados redigidos e é exigido no endpoint de publish, rollback e
bootstrap controlado. A UI chama o endpoint para visibilidade e a API repete o
gate imediatamente antes da mutação de lifecycle.

Evidência detalhada: `docs/04_audit/0504_plat_s14_controlled_safety_publish_preflight_evidence.md`.
Gates: 80 arquivos, 289 testes pass, 16 skips, coverage 85,06%/80,38%/85,97%/
85,98%, readiness 4/4, E2E 1/1, PostgreSQL 49 pass/16 skips, audit 0 e diff
check PASS. O fechamento foi lead-only; o resultado máximo continua
`CONTROLLED_MVP_READY`, produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S15 — fechamento controlado

Em `2026-08-25T11:03:13-03:00`, a implementação e a auditoria controlada do
`PLAT-S15-001_CONTROLLED_KNOWLEDGE_SOURCE_CATALOG` foram concluídas. O catálogo
governa somente metadata tenant-aware de fontes `controlled://`, com identidade
`source/version` única e imutável, label/description bounded, lifecycle
`DRAFT -> APPROVED -> ARCHIVED`, precondition stale, API auditada, Control Center
e persistência PostgreSQL com migration 0005, trigger e `FORCE ROW LEVEL SECURITY`.

`APPROVED` é decisão de governança metadata-only: não muta `AgentVersion`, não
alimenta o resolver de RAG, não cria conteúdo/embedding e não libera provider,
canal ou side effect. URL externa, segredo, campo extra, duplicate, cross-tenant,
transição inválida e conflito stale falham fechado.

Evidência detalhada: `docs/04_audit/0505_plat_s15_controlled_knowledge_source_catalog_evidence.md`.
Gates: 83 arquivos, 294 testes pass, 17 skips, coverage 85,03%/80,26%/85,41%/
85,88%, readiness 4/4, E2E 1/1, PostgreSQL 49 pass/17 skips, audit 0 e diff
check PASS. O fechamento foi lead-only; o resultado máximo continua
`CONTROLLED_MVP_READY`, produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S16 — fechamento controlado

Em `2026-08-25T11:55:53-03:00`, a implementação e a auditoria controlada do
`PLAT-S16-001_CONTROLLED_RELEASE_CANDIDATE_EVIDENCE_LEDGER` foram concluídas.
O ledger registra quatro gates fixos, refs controladas, digest SHA-256 do
servidor, vínculo tenant/agent/version, lifecycle compare-and-swap, migration
0006, trigger de imutabilidade, `FORCE ROW LEVEL SECURITY`, API administrativa,
Control Center e audit somente de metadados.

`VALIDATED` exige todos os gates `PASS`, mas permanece apenas atestação de
governança: não publica, não faz deploy, não altera `AgentVersion` ou
`activeVersionId`, não habilita provider/canal/RAG e não produz side effect.

Evidência detalhada:
`docs/04_audit/0506_plat_s16_controlled_release_candidate_evidence_ledger_evidence.md`.
Gates: `npm run verify` PASS; 88 arquivos, 303 testes pass, 18 skips, coverage
84,81%/80,03%/84,87%/85,65%, readiness 4/4, E2E 1/1, PostgreSQL controlado 49
pass/18 skips, audit 0 e diff check PASS. O fechamento foi lead-only por
indisponibilidade de child agents; o resultado máximo continua
`CONTROLLED_MVP_READY`, produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S18 — fechamento controlado

Em `2026-08-25T14:31:48-03:00`, o `PLAT-S18-001_CONTROLLED_HTTP_SECURITY_BOUNDARY`
foi concluído. O API agora normaliza origins por `URL.origin`, falha fechado
para CORS/preflight com allowlist `GET/POST/PATCH/OPTIONS`, emite headers de
segurança fixos, exige HTTPS quando configurado com `trustedProxyHops` explícito,
emite HSTS somente em HTTPS e fecha o bootstrap production sem allowlist ou
HTTPS explícito. O `PATCH` foi mantido porque é usado pela atualização de tarefas
do Secretary.

Evidência detalhada:
`docs/04_audit/0508_plat_s18_controlled_http_security_boundary_evidence.md`.
Gates: `npm run verify` PASS; 97 arquivos, 330 testes pass, 18 skips, coverage
85,16%/80,44%/84,75%/86,06%, readiness 4/4, E2E 3/3, PostgreSQL controlado 51
pass/18 skips, audit 0 e diff check PASS. O fechamento foi lead-only por
indisponibilidade de child agents; `CONTROLLED_MVP_READY` permanece, produção
real segue `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S19 — fechamento controlado

Em `2026-08-25T14:51:53-03:00`, foi concluído
`PLAT-S19-001_CONTROLLED_REQUEST_OBSERVABILITY_METRICS`. O collector process-local
por substituição imutável agrega somente método, template de rota bounded,
status e latência, com `__unmatched__`/`__other__`, snapshot defensivo e
`GET /health/metrics` read-only/redaction-safe. A integração cobre respostas
normais, 404 de rota desconhecida e rejeições do boundary HTTP.

Gates: `npm run verify` PASS; 98 arquivos, 333 testes pass, 18 skips, coverage
85,24%/80,63%/84,99%/86,16%; readiness 4/4; E2E 3/3; PostgreSQL controlado
51 pass/18 skips; audit 0; format e diff check PASS. Evidência detalhada:
`docs/04_audit/0509_plat_s19_controlled_request_observability_metrics_evidence.md`.

O escopo não aceita path/query/body/header sensível/identidade e não inclui
Prometheus/OTel, broker, storage distribuído, retenção, alerting, HA, deploy,
provider, canal, RAG, dado real ou side effect. O fechamento é lead-only;
`CONTROLLED_MVP_READY` permanece, produção real segue `NO-GO`/
`WAITING_HUMAN_APPROVAL`.

## PLAT-S20 — fechamento controlado

Em `2026-08-25T15:15:48-03:00`, foi concluído
`PLAT-S20-001_CONTROLLED_RATE_LIMIT_MEMORY_SAFETY`. O limiter process-local
agora valida policy/key e `maxBuckets`, purga expirados, evicta
deterministicamente pelo menor `resetAt`, expõe snapshot somente com contagem e
capacidade e marca 429 como `Cache-Control: no-store`, preservando
`Retry-After` e o envelope legado.

Gates: `npm run verify` PASS; 98 arquivos, 335 testes pass, 18 skips, coverage
85,31%/80,72%/85,07%/86,23%; readiness 4/4; E2E 3/3; PostgreSQL controlado
51 pass/18 skips; audit 0; format e diff check PASS. Evidência detalhada:
`docs/04_audit/0510_plat_s20_controlled_rate_limit_memory_safety_evidence.md`.

O escopo não inclui Redis/edge/limiter distribuído, fairness multi-instância,
HA, IdP, tenant provisioning, provider, canal, RAG, dado real, deploy ou side
effect. O fechamento é lead-only; `CONTROLLED_MVP_READY` permanece, produção
real segue `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S21 — fechamento controlado

Em `2026-08-25T15:36:38-03:00`, foi concluído
`PLAT-S21-001_CONTROLLED_METRICS_EXPOSURE_BOUNDARY`. O lane habilita
`/health/metrics` somente em `NODE_ENV=test/development`, permite apenas
desabilitação controlled-only, retorna 404 genérico sem snapshot em outros
ambientes e aplica `Cache-Control: no-store` em respostas habilitadas e
desabilitadas.

Gates: `npm run verify` PASS; 99 arquivos, 337 testes pass, 18 skips, coverage
85,33%/80,74%/85,07%/86,25%; readiness 4/4; E2E 3/3; PostgreSQL controlado
51 pass/18 skips; audit 0; format e diff check PASS. Evidência detalhada:
`docs/04_audit/0511_plat_s21_controlled_metrics_exposure_boundary_evidence.md`.

O escopo não inclui auth/IdP operacional, edge/allowlist de rede, Prometheus/
OTel, broker, HA, provider, canal, RAG, dado real, deploy ou side effect. O
fechamento é lead-only; `CONTROLLED_MVP_READY` permanece, produção real segue
`NO-GO`/`WAITING_HUMAN_APPROVAL`. O próximo lane exige novo SPEC controlado.

## PLAT-S22 — fechamento controlado

Em `2026-08-25T16:02:37-03:00`, foi concluído
`PLAT-S22-001_CONTROLLED_CORRELATION_RESPONSE_BOUNDARY`. O lane publica
`X-Correlation-Id` a partir de `meta.correlationId` validado no envelope,
expõe somente esse header em CORS de origem aprovada, não reflete entrada
externa e não inventa correlação em preflight ou respostas non-envelope.

Gates: `npm run verify` PASS; 100 arquivos, 343 testes pass, 18 skips, coverage
85,37%/80,81%/85,10%/86,29%; readiness 4/4; E2E 3/3; PostgreSQL controlado
51 pass/18 skips; audit 0; format e diff check PASS. Evidência detalhada:
`docs/04_audit/0512_plat_s22_controlled_correlation_response_boundary_evidence.md`.

O escopo não inclui tracing distribuído/OTel, broker, logging de payload,
auth/IdP operacional, mudança de tenant, provider, canal, RAG, dado real,
deploy ou side effect. O fechamento é lead-only; `CONTROLLED_MVP_READY`
permanece, produção real segue `NO-GO`/`WAITING_HUMAN_APPROVAL`. O próximo lane
exige novo SPEC controlado.

## PLAT-S23 — fechamento controlado

Em `2026-08-25T16:40:41-03:00`, foi concluído
`PLAT-S23-001_CONTROLLED_STARTUP_FAILURE_REDACTION`. O formatter puro foi
integrado ao catch de `apps/api/src/main.ts` e publica somente
`api.startup_failed`, `code` e `message` em JSON bounded/redaction-safe. Stack,
cause, erro bruto, credenciais, tokens e PII não entram na linha; mensagens não
textuais e erros de configuração caem em fallback genérico. O exit 1 e o
fail-closed do bootstrap permanecem.

Gates: `npm run verify` PASS; 101 arquivos, 351 testes pass, 18 skips, coverage
85,42%/80,84%/85,16%/86,33%; readiness 4/4; E2E 3/3; PostgreSQL controlado
51 pass/18 skips; audit 0; format e diff check PASS; startup smoke controlado
PASS. Evidência detalhada:
`docs/04_audit/0513_plat_s23_controlled_startup_failure_redaction_evidence.md`.

O escopo não inclui logger distribuído, retenção, alerting, IdP, tenant
binding, provider, canal, RAG, dado real, deploy ou side effect. A revisão foi
lead-only por indisponibilidade de child agents; `CONTROLLED_MVP_READY`
permanece, produção real segue `NO-GO`/`WAITING_HUMAN_APPROVAL`. O próximo lane
exige novo SPEC controlado.

## PLAT-S24 — fechamento controlado

Em `2026-08-25T17:20:00-03:00`, foi concluído
`PLAT-S24-001_CONTROLLED_HTTP_PARSE_PAYLOAD_BOUNDARY`. O API agora declara
bodyLimit de 1 MiB, classifica falhas de JSON/media type/body excessivo e usa
error handler global com envelopes 400/415/413/500, mensagens constantes e
correlation ID server-generated. Raw body, headers, stack, cause e mensagem
arbitrária não entram na resposta.

Gates: `npm run verify` PASS; 102 arquivos, 359 testes pass, 18 skips, coverage
85,46%/80,85%/85,21%/86,40%; readiness 4/4; E2E 3/3; PostgreSQL controlado
51 pass/18 skips; audit 0; format e diff check PASS; smoke do boundary PASS.
Evidência detalhada:
`docs/04_audit/0514_plat_s24_controlled_http_parse_payload_boundary_evidence.md`.

O escopo não inclui upload, streaming, logger distribuído, IdP, tenant binding
operacional, provider, canal, RAG, dado real, deploy ou side effect. A revisão
foi lead-only por indisponibilidade de child agents; `CONTROLLED_MVP_READY`
permanece, produção real segue `NO-GO`/`WAITING_HUMAN_APPROVAL`. O próximo lane
exige novo SPEC controlado.

## PLAT-S25 — fechamento controlado

Após o fechamento S24, a descoberta reproduziu que uma rota desconhecida ainda
retornava o 404 padrão do Fastify com o request-target bruto, enquanto uma query
extensa era aceita sem limite explícito. O lane registrado
`PLAT-S25-001_CONTROLLED_HTTP_TARGET_BOUNDARY` declarou 8192 bytes de
request-target, `maxParamLength` 100 e envelope 404/414 redaction-safe, e foi
fechado como `COMPLETED_CONTROLLED`.

Gates: verify PASS com 103 arquivos/367 testes pass/18 skips; coverage
85,41%/80,76%/85,24%/86,42%; readiness 4/4; E2E 3/3; PostgreSQL 51 pass/18
skips; audit 0; format, diff check e os dois smoke tests PASS. Evidência:
`docs/04_audit/0515_plat_s25_controlled_http_target_boundary_evidence.md`.
O lane não alterou body/parser S24, auth, tenant, identidade, Secretary,
persistência, provider/canal, RAG, dados reais, deploy ou side effect.
Produção real segue `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S26 — fechamento controlado

Após o fechamento S25, a descoberta reproduziu que o clone de Prompt Profile
refletia uma chave inválida fornecida no payload dentro de `error.message`.
`PLAT-S26-001_CONTROLLED_PROMPT_PROFILE_ERROR_MESSAGE_BOUNDARY` substituiu
somente mensagens interpoladas de chave/ID por mensagens constantes e foi
fechado como `COMPLETED_CONTROLLED`.

Gates: verify PASS com 104 arquivos/371 testes pass/18 skips; coverage
85,41%/80,77%/85,24%/86,42%; readiness 4/4; E2E 3/3; PostgreSQL 51 pass/18
skips; audit 0; format e diff check PASS. Evidência:
`docs/04_audit/0516_plat_s26_controlled_error_message_boundary_evidence.md`.
O lane preservou código/status/envelope/correlação, não criou versão em clone
inválido e não alterou `toSafeError` global, auth, tenant, identidade,
Secretary, persistência, provider/canal, RAG, dado real, deploy ou side effect.
Produção real continua `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S27 — registro do próximo lane controlado

Após o fechamento S26, a descoberta reproduziu que `offset=1e100` e
`offset=9007199254740992` eram aceitos como 200 no endpoint de conversas e
também poderiam chegar ao `OFFSET` PostgreSQL. Foi registrado
`PLAT-S27-001_CONTROLLED_PAGINATION_OFFSET_BOUNDARY` para declarar teto de
10.000 e rejeição de valores não seguros antes do repositório. O gate é
`SPEC_APPROVED_CONTROLLED_BUILD`; RED/GREEN, regressão próxima, verify e gates
externos concluíram o lane como `COMPLETED_CONTROLLED`. Produção real segue
`NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S27 — fechamento controlado

O S27 adicionou um classificador bounded de offset e o integrou aos parsers de
conversas e audit evidence. Offset ausente/0 e 10.000 são aceitos; valores
negativos, fracionários, não seguros ou acima do teto falham com
`invalid_pagination`/400 antes de `listPage`/`listEvidence`. Limit, cursor,
auth, tenant, identidade, Secretary, persistência estrutural, provider/canal,
RAG, dado real, deploy e side effect não foram alterados.

Gates finais: verify 105 arquivos/376 testes pass/18 skips; coverage
85,43%/80,80%/85,25%/86,44%; readiness 4/4; E2E 3/3; PostgreSQL 51 pass/18
skips; audit 0; format e diff check PASS. Evidência:
`docs/04_audit/0517_plat_s27_controlled_pagination_offset_boundary_evidence.md`.
`CONTROLLED_MVP_READY` permanece; produção real continua
`NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S31 — registro do próximo lane controlado

Após o fechamento S30, a descoberta reproduziu que o payload de
`POST /v1/approvals/:approvalRequestId/decision` aceita `note` com 5.000
caracteres e persiste a decisão como `approved` em fixture efêmera, porque
`ResolveApprovalSchema.note` é opcional e não declara máximo. A nota não é
ecoada nem persistida. Foi registrado
`PLAT-S31-001_CONTROLLED_APPROVAL_DECISION_NOTE_FIELD_BOUNDARY` para limitar
`note` a 4.000 antes de `approvals.save`. O gate é
`SPEC_APPROVED_CONTROLLED_BUILD`; o próximo passo obrigatório é RED. Produção
real segue `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S31 — fechamento controlado

O S31 adicionou máximo de 4.000 caracteres ao `ResolveApprovalSchema.note`.
Nota excedente falha com `validation_failed`/400 antes de `approvals.save`, sem
echo e sem alterar o approval pending; nota no limite mantém decisão `approved`.

Gates finais: verify 109 arquivos/397 testes pass/18 skips; coverage
85,45%/80,83%/85,26%/86,45%; readiness 4/4; E2E 3/3; PostgreSQL 51 pass/18
skips; audit 0; format, JSON e diff check PASS. Evidência:
`docs/04_audit/0521_plat_s31_controlled_approval_decision_note_field_boundary_evidence.md`.
`CONTROLLED_MVP_READY` permanece; produção real continua
`NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S30 — registro do próximo lane controlado

Após o fechamento S29, a descoberta reproduziu que `POST /v1/approvals` aceita
e persiste `summary` com 5.000 caracteres em fixture tenant-scoped porque
`RequestHumanApprovalSchema` não declara máximos. Foi registrado
`PLAT-S30-001_CONTROLLED_APPROVAL_REQUEST_FIELD_BOUNDARY` para limitar
`sessionId` 160, `proposedAction` 200 e `summary` 4.000 antes de
`approvals.save`. O gate foi `SPEC_APPROVED_CONTROLLED_BUILD`; RED/GREEN,
regressão próxima, verify e gates externos fecharam o lane como
`COMPLETED_CONTROLLED`. Produção real segue `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S30 — fechamento controlado

O S30 adicionou máximos ao `RequestHumanApprovalSchema`: `sessionId` 160,
`proposedAction` 200 e `summary` 4.000. Cada valor excedente falha com
`validation_failed`/400 antes de `approvals.save`; valores nos máximos continuam
válidos, o approval permanece `pending` e o envelope não reflete o conteúdo
rejeitado.

Gates finais: verify 108 arquivos/394 testes pass/18 skips; coverage
85,45%/80,83%/85,26%/86,45%; readiness 4/4; E2E 3/3; PostgreSQL 51 pass/18
skips; audit 0; format e diff check PASS. Evidência:
`docs/04_audit/0520_plat_s30_controlled_approval_request_field_boundary_evidence.md`.
`CONTROLLED_MVP_READY` permanece; produção real continua
`NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S28 — registro do próximo lane controlado

Após o fechamento S27, a descoberta reproduziu que
`sessionId=a&sessionId=b` retorna 200 no endpoint de audit evidence e somente o
primeiro valor é encaminhado ao repositório. Foi registrado
`PLAT-S28-001_CONTROLLED_AUDIT_FILTER_DUPLICATE_BOUNDARY` para rejeitar filtros
repetidos antes de summary/page. O gate é
`SPEC_APPROVED_CONTROLLED_BUILD`; RED/GREEN, regressão próxima, verify e gates
externos concluíram o lane como `COMPLETED_CONTROLLED`. Produção real segue
`NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S28 — fechamento controlado

O S28 adicionou classificação single-valued aos filtros de audit evidence.
Repetições de `sessionId`, `correlationId`, `actorId` e `type` falham com
`validation_failed`/400 antes de `summarizeEvidence`/`listEvidence`; filtro
único e paginação permanecem válidos. Não houve alteração de auth, tenant,
identidade, Secretary, persistência estrutural, provider/canal, RAG, dado real,
deploy ou side effect.

Gates finais: verify 106 arquivos/382 testes pass/18 skips; coverage
85,45%/80,83%/85,26%/86,45%; readiness 4/4; E2E 3/3; PostgreSQL 51 pass/18
skips; audit 0; format e diff check PASS. Evidência:
`docs/04_audit/0518_plat_s28_controlled_audit_filter_duplicate_boundary_evidence.md`.
`CONTROLLED_MVP_READY` permanece; produção real continua
`NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S29 — registro do próximo lane controlado

Após o fechamento S28, a descoberta reproduziu que `POST /v1/tasks` aceita e
persiste campos livres com 5.000 caracteres em fixture controlada porque
`CreateInternalTaskSchema` não declara máximos. Foi registrado
`PLAT-S29-001_CONTROLLED_INTERNAL_TASK_FIELD_BOUNDARY` para limitar
`sessionId` 160, `title` 200, `description` 4.000, `source` 120 e
`idempotencyKey` 200 antes do repositório, preservando o mínimo 8 da chave.
O gate foi `SPEC_APPROVED_CONTROLLED_BUILD`; RED/GREEN, regressão próxima,
verify e gates externos fecharam o lane como `COMPLETED_CONTROLLED`. Produção
real segue `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S29 — fechamento controlado

O S29 adicionou máximos ao `CreateInternalTaskSchema`: `sessionId` 160,
`title` 200, `description` 4.000, `source` 120 e `idempotencyKey` 200,
preservando o mínimo 8 da chave. Cada valor excedente falha com
`validation_failed`/400 antes de `tasks.create`; valores nos máximos continuam
válidos e o envelope não reflete o conteúdo rejeitado.

Gates finais: verify 107 arquivos/389 testes pass/18 skips; coverage
85,45%/80,83%/85,26%/86,45%; readiness 4/4; E2E 3/3; PostgreSQL 51 pass/18
skips; audit 0; format e diff check PASS. Evidência:
`docs/04_audit/0519_plat_s29_controlled_internal_task_field_boundary_evidence.md`.
`CONTROLLED_MVP_READY` permanece; produção real continua
`NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S32 — fechamento controlado

O S32 adicionou pinning monotônico de `agentId`/`agentVersionId` por sessão.
Uma sessão nova recebe o par da primeira publicação observada; uma continuação
usa a mesma versão mesmo depois de publish v2, inclusive quando v1 está
`ARCHIVED`. Binding parcial, mismatch, cross-tenant, DRAFT/TESTING e erro de
pinning falham fechado sem fallback ou efeito externo.

Gates finais: `npm test` 111 arquivos/402 testes pass/19 skips; coverage
85,01%/80,37%/85,11%/85,99%; readiness 4/4; E2E 4/4; PostgreSQL 8 arquivos/71
testes pass; lint, typecheck, build, format e diff check PASS; audit 0.
O PostgreSQL fixture também validou a migration 0008 e corrigiu a expressão
incompatível `jsonb_object_length` da migration 0007 para PostgreSQL 16.
Evidência:
`docs/04_audit/0522_plat_s32_controlled_session_version_pinning_evidence.md`.
`CONTROLLED_MVP_READY` permanece; produção real continua
`NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S33 — fechamento controlado

O S33 foi fechado como `COMPLETED_CONTROLLED`. O worker usa somente jobs
tenant/agent/version scoped e bounded, executa a versão explicitamente pinned,
rejeita legacy/oversized/unknown/draft/cross-agent e encerra sem adapter de fila
sem inventar sucesso. Todos os gates finais passaram: 112 arquivos/408 testes,
coverage 85,01%/80,42%/85,14%/85,99%, readiness 4/4, E2E 4/4, PostgreSQL 8/71,
typecheck, lint, build, format, audit 0 e diff check. Evidência:
`docs/04_audit/0523_plat_s33_controlled_worker_runtime_boundary_evidence.md`.
Produção real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S34 — fechamento controlado

O S34 foi fechado como `COMPLETED_CONTROLLED`. O workflow agora explicita
`permissions: contents: read`, concorrência cancelável, checkout sem credenciais
persistentes, `npm ci --ignore-scripts`, readiness, verify, smoke do worker,
PostgreSQL controlado, Playwright e `git diff --check`. O smoke executa o
entrypoint real sem queue adapter e exige falha segura com `queue_adapter_missing`,
sem stack, causa ou identificadores de bootstrap.

Gates finais: verify 114 arquivos/411 testes pass/19 skips; coverage
85,01%/80,42%/85,14%/85,99%; readiness 4/4; E2E 4/4; PostgreSQL efêmero
8 arquivos/71 testes pass; typecheck, lint, build, format, audit 0 e diff check
PASS. Evidência: `docs/04_audit/0524_plat_s34_controlled_ci_gate_parity_evidence.md`.
Não há Dockerfile/imagem executável para scan; nenhum scan foi alegado. Produção
real permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`.
