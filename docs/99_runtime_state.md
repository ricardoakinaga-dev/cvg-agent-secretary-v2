# RUNTIME STATE — CVG

## CONTEXTO

- project: cvg-agent-secretary-v2
- current_engine: AUDIT

## POSICAO ATUAL

- current_phase: CONTROLLED_CONSTRUCTION
- current_sprint: PLAT-S11_CONTROLLED_EVENT_BUS_HOOKS
- current_task: PLAT-S11-001_EVENT_BUS_HOOKS

## STATUS

- status: READY_FOR_NEXT_STEP

## PROGRESSO

- last_completed_action: PLAT-S11-001 implementada e auditada com event bus allowlisted, hooks tenant-scoped, payload redigido/imutável, falha isolada e integração observacional no Test Lab.
- next_action: registrar novo SPEC antes de qualquer lane; produção real continua bloqueada.

## BLOQUEIOS

- blockers: nenhum bloqueio para o MVP controlado; produção real permanece bloqueada por IdP/tenant binding, backfill e rollout do data plane legado sob change control, role/secrets operacionais, limiter e replay store distribuídos, CSRF/CORS/HTTPS/CSP do host, retenção/PII, auditoria de side effects, coordenação distribuída multioperador além do compare-and-swap controlado e decisões humanas de RAG, cargos, canais, providers e ações sensíveis

## DECISAO HUMANA

- human_decision_required: no
- human_decision_required_for_real_release: yes
- decision_description: o gate controlado está concluído; qualquer piloto real, produção, dado real, RAG, agenda, financeiro, clínico, prontuário, canal ou automação sensível exige decisão humana e infraestrutura aprovada

## TIMESTAMP

- last_update: 2026-08-24T22:00:02-03:00

## INÍCIO CONTROLADO PLAT-S11 — 2026-08-24T21:26:12-03:00

- task: `PLAT-S11-001_EVENT_BUS_HOOKS`
- status: `IN_PROGRESS`
- gate: `BUILD` controlado autorizado pela SPEC S11 para event bus process-local e hooks de plugins locais
- escopo: eventos internos allowlisted, declaração de hook no manifest, tenant scope, redaction/imutabilidade, isolamento de falhas e emissão opcional no Test Lab
- sem autorização: broker/retry/outbox/webhook, execução do catálogo S09, marketplace, provider/canal, payload bruto, dado real, side effect ou produção irrestrita

## INÍCIO CONTROLADO PLAT-S10 — 2026-08-24T20:45:00-03:00

- task: `PLAT-S10-001_PLUGIN_CATALOG_CONTROL_CENTER`
- status: `IN_PROGRESS`
- gate: `BUILD` controlado autorizado pela SPEC S10 para client/UI sobre as rotas metadata-only existentes
- escopo: listar, criar e transicionar catálogo de manifests pelo Control Center, com tenant/identidade, `expectedStatus`, conflito 409 e mensagem metadata-only
- sem autorização: migration, marketplace, instalação, dependências de rede, health probe externo, handler persistente, provider/canal, RAG, agenda, dados reais, deploy ou produção irrestrita

## FECHAMENTO CONTROLADO PLAT-S10 — 2026-08-24T21:13:45-03:00

- current_task: `PLAT-S10-001_PLUGIN_CATALOG_CONTROL_CENTER`
- status: `READY_FOR_NEXT_STEP`
- last_completed_action: Control Center passou a listar, criar e transicionar manifests declarativos do tenant autenticado; client envia identidade/tenant, approval/archive envia `expectedStatus`, UI trata 409 stale e mantém `APPROVED` metadata-only.
- evidence: `docs/04_audit/0500_plat_s10_plugin_catalog_control_center_evidence.md`
- gates: `npm run verify` PASS; 72 test files/257 passed/16 skips; coverage 84.97% statements, 80.21% branches, 84.93% functions, 85.90% lines; readiness 4/4; E2E 1/1; PostgreSQL controlled 49 passed/16 skips; audit 0 vulnerabilities; format/diff check PASS.
- controlled_release: `CONTROLLED_MVP_READY`
- real_release: `WAITING_HUMAN_APPROVAL` / `NO-GO`
- blockers preserved: IdP/tenant binding/RBAC operacional, rollout RLS/backfill, roles/secrets, limiter/replay distribuídos, host security, HA, retenção/PII, knowledge institucional, providers/canais, marketplace/handlers executáveis e qualquer ação sensível.
- next_safe_action: abrir novo SPEC somente após decisão do próximo lane; nenhum deploy, dado real ou efeito externo foi autorizado.

## FECHAMENTO CONTROLADO PLAT-S11 — 2026-08-24T22:00:02-03:00

- current_task: `PLAT-S11-001_EVENT_BUS_HOOKS`
- status: `READY_FOR_NEXT_STEP`
- last_completed_action: event bus process-local allowlisted, registro de hooks por plugin local com declaração no manifest, tenant isolation, redaction/imutabilidade, isolamento/auditoria de falhas e emissões representativas no Test Lab.
- evidence: `docs/04_audit/0501_plat_s11_event_bus_hooks_evidence.md`
- gates: `npm run verify` PASS; 74 test files/264 passed/16 skips; coverage 84.88% statements, 80.11% branches, 85.26% functions, 85.81% lines; readiness 4/4; E2E 1/1; PostgreSQL controlled 49 passed/16 skips; audit 0 vulnerabilities; format/diff check PASS.
- controlled_release: `CONTROLLED_MVP_READY`
- real_release: `WAITING_HUMAN_APPROVAL` / `NO-GO`
- blockers preserved: IdP/tenant binding/RBAC operacional, rollout RLS/backfill, roles/secrets, limiter/replay distribuídos, host security, HA, retenção/PII, knowledge institucional, providers/canais, marketplace/handlers executáveis e qualquer ação sensível.
- next_safe_action: abrir novo SPEC somente após decisão do próximo lane; broker durável, entrega remota, plugins executáveis, provider/canal, dados reais e side effects continuam não autorizados.

## INÍCIO CONTROLADO PLAT-S05 — 2026-08-24

- task: `PLAT-S05-001_TRACE_SAFETY_AND_CONTROL_CENTER_CLOSURE`
- status: `IN_PROGRESS`
- gate: `BUILD` autorizado somente para os testes e limites descritos em `docs/platform/04-backlog.md`
- escopo: trace seguro do Test Lab, caso de medicamento veterinário sem prescrição, validação fail-closed do gateway e correções de binding/renderização da UI
- extensão controlada: adicionar bootstrap idempotente do preset fictício `CVG Secretary` somente em desenvolvimento
- sem autorização: provider/canal/RAG/agenda real, dados reais, side effects, backfill, deploy ou produção irrestrita

## REGRAS DE USO

- Sempre ler antes de executar qualquer acao.
- Sempre atualizar apos executar.
- Nunca encerrar sem atualizar estado.
- Usar apenas status oficiais: IN_PROGRESS, READY_FOR_NEXT_STEP, BLOCKED, WAITING_HUMAN_APPROVAL, COMPLETED.

## FECHAMENTO CONTROLADO PLAT-S04 — 2026-08-24

- current_task: `PLAT-S04-001_TO_003_DURABLE_APPROVAL_WEBHOOK_RUNTIME_RELIABILITY`
- status: `READY_FOR_NEXT_STEP`
- current_engine: `AUDIT`
- last_completed_action: retry idempotente de inbound com `pending/completed`, finalização PostgreSQL atômica, HMAC sobre raw body, purge de replay expirado, bootstrap tenant-bound, approval issuer/executor separado, consumo com `approval_decision` transacional e preflight estrutural de schema/grants/baseline.
- evidence: `docs/04_audit/0494_plat_s03_tenant_isolation_evidence.md`, `docs/04_audit/0495_plat_s04_durable_approval_and_webhook_evidence.md`
- gates: `npm test` 62 arquivos/225 testes/14 skips; coverage 85,58% statements, 80,17% branches, 86,66% functions, 86,48% lines; PostgreSQL fixture 6 arquivos/63 testes; typecheck, lint, format, build, audit, readiness e E2E PASS.
- controlled_release: `CONTROLLED_MVP_READY`
- real_release: `WAITING_HUMAN_APPROVAL`
- blockers: IdP/tenant/agente/operator binding operacional, backfill/rollout RLS, roles/secrets reais, HA/observabilidade de replay e limiter distribuídos, host security, retenção/PII, provider/canal, compensação de side effects, concorrência multioperador e qualquer agenda/clínica/financeiro/prontuário real.

## REVALIDAÇÃO FINAL CONTROLADA — 2026-08-24T15:42:25-03:00

- P1 pós-revisão fechado: produção agora exige runtime/agente confiável, tenant binding e `operatorIdentityResolver`; replay PostgreSQL recupera lease `reserved` stale após 30s; `test:postgres` inclui teste real da store com purge, concorrência, commit/release e recovery.
- Resultado máximo: `CONTROLLED_MVP_READY`.
- Produção real: `WAITING_HUMAN_APPROVAL`; startup permanece fail-closed até IdP, roles/secrets, HA/observabilidade, host security, retenção/PII e change control.

## FECHAMENTO CONTROLADO PLAT-S05 — 2026-08-24T17:44:15-03:00

- status: `READY_FOR_NEXT_STEP`
- tasks: `PLAT-S05-001` e `PLAT-S05-002` = `COMPLETED_CONTROLLED`
- evidence: `docs/platform/final-technical-audit.md`
- gates: `npm run verify` PASS (65 arquivos, 238 testes pass, 14 skips; coverage 86,28% statements, 81,22% branches, 87,39% functions, 87,16% lines); readiness PASS (4); E2E PASS (1); PostgreSQL controlado PASS (49 testes, 14 skips); audit PASS (0 vulnerabilidades)
- controlled_release: `CONTROLLED_MVP_READY`
- real_release: `WAITING_HUMAN_APPROVAL`
- blockers: IdP/RBAC/tenant binding operacional, RLS/backfill/change control, secrets/roles, limiter/replay distribuídos, CSRF/CORS/HTTPS/CSP, retenção/PII, conflitos multioperador, providers/canais, knowledge institucional real e qualquer ação clínica/financeira/prontuário.
- next_safe_lane: `PLAT-S06-001` — catálogo persistente de TestCase/TestSuite e avaliação A/B somente no Test Lab, após novo SPEC.

## INÍCIO CONTROLADO PLAT-S06 — 2026-08-24T17:48:00-03:00

- task: `PLAT-S06-001_PERSISTENT_TEST_SUITE_AND_AB_CONTROLLED`
- status: `IN_PROGRESS`
- gate: `BUILD` autorizado para catálogo persistente tenant-aware, avaliações redigidas e comparação A/B somente no Test Lab
- sem autorização: tráfego real, provider/canal, rollout gradual, publicação automática, dados reais ou alteração de regra clínica/financeira

## FECHAMENTO CONTROLADO PLAT-S06 — 2026-08-24T19:02:02-03:00

- task: `PLAT-S06-001_PERSISTENT_TEST_SUITE_AND_AB_CONTROLLED`
- status: `READY_FOR_NEXT_STEP`
- delivery: catálogo persistente de suites com vínculo tenant/agent/version, clone versionado sem mutação, redaction de cases/traces, histórico de runs de uma ou duas variantes e comparação A/B em dry-run
- evidence: `docs/04_audit/0496_plat_s06_suite_catalog_evidence.md`; migration `0003_test_suite_catalog.sql`; API/UI; verify, readiness, E2E e PostgreSQL fixture
- gates: 67 arquivos/243 testes pass/15 skips condicionais; coverage 84,40% statements, 80,23% branches, 84,72% functions, 85,24% lines; PostgreSQL controlado 6 arquivos/64 testes; audit sem vulnerabilidades
- controlled_release: `CONTROLLED_MVP_READY`
- real_release: `WAITING_HUMAN_APPROVAL`
- next_safe_lane: novo SPEC antes de BUILD; marketplace, knowledge/provider real, tráfego gradual, conflitos multioperador e ações sensíveis continuam fora do slice

## INÍCIO CONTROLADO PLAT-S07 — 2026-08-24T19:02:02-03:00

- task: `PLAT-S07-001_OPTIMISTIC_VERSION_LIFECYCLE_CONFLICT_CONTROLLED`
- status: `IN_PROGRESS`
- gate: `BUILD` autorizado para compare-and-swap controlado em transition/publish/rollback, com erro de domínio `conflict` e HTTP 409
- sem autorização: HA, lock distribuído, ETag de proxy, IdP, coordenação multi-região, produção real ou qualquer efeito externo

## FECHAMENTO CONTROLADO PLAT-S07 — 2026-08-24T19:17:01-03:00

- task: `PLAT-S07-001_OPTIMISTIC_VERSION_LIFECYCLE_CONFLICT_CONTROLLED`
- status: `READY_FOR_NEXT_STEP`
- delivery: `expectedStatus` em transition/publish/rollback, compare-and-swap equivalente em memória e PostgreSQL, erro `conflict`/HTTP 409, ausência de audit de sucesso em conflito e mensagens de recuperação no Control Center
- evidence: `docs/04_audit/0497_plat_s07_optimistic_conflict_evidence.md`
- gates: verify 67 arquivos/247 testes pass/15 skips; coverage 84,82% statements, 80,18% branches, 85,13% functions, 85,69% lines; readiness 4; E2E 1; PostgreSQL 6 arquivos/49 testes pass/15 skips; audit 0 vulnerabilidades; format e diff check PASS
- controlled_release: `CONTROLLED_MVP_READY`
- real_release: `WAITING_HUMAN_APPROVAL`
- next_safe_lane: novo SPEC; HA, IdP, coordenação distribuída, provider/canal, dados reais e ações sensíveis continuam fora do slice

## INÍCIO CONTROLADO PLAT-S08 — 2026-08-24T19:23:32-03:00

- task: `PLAT-S08-001_PLUGIN_MANIFEST_SEMANTIC_VALIDATION_AND_VERSION_PINNING`
- status: `IN_PROGRESS`
- gate: `BUILD` autorizado para validação semântica de manifestos e resolução determinística de versões no registry local
- sem autorização: marketplace, código de terceiros, persistência de handlers, provider/canal real, rede, dados reais ou produção irrestrita

## FECHAMENTO CONTROLADO PLAT-S08 — 2026-08-24T19:33:10-03:00

- task: `PLAT-S08-001_PLUGIN_MANIFEST_SEMANTIC_VALIDATION_AND_VERSION_PINNING`
- status: `READY_FOR_NEXT_STEP`
- delivery: invariantes semânticas de `PluginManifest`, registry multi-versão imutável, binding pinned opcional, resolução legacy determinística, gateway fail-closed e campo de versão no Control Center
- evidence: `docs/04_audit/0498_plat_s08_plugin_manifest_versioning_evidence.md`
- gates: verify 68 arquivos/250 testes pass/15 skips; coverage 84,88% statements, 80,17% branches, 85,22% functions, 85,74% lines; readiness 4; E2E 1; PostgreSQL 6 arquivos/49 testes pass/15 skips; audit 0 vulnerabilidades; format e diff check PASS
- controlled_release: `CONTROLLED_MVP_READY`
- real_release: `WAITING_HUMAN_APPROVAL`
- next_safe_lane: novo SPEC; marketplace, catalogação persistente, provider/canal, dados reais e ações sensíveis continuam fora do slice

## INÍCIO CONTROLADO PLAT-S09 — 2026-08-24T19:40:32-03:00

- task: `PLAT-S09-001_TENANT_AWARE_PLUGIN_MANIFEST_CATALOG`
- status: `IN_PROGRESS`
- gate: `BUILD` autorizado para catálogo declarativo tenant-aware de manifests validados, sem handlers e sem execução
- sem autorização: marketplace, instalação, rede, código de terceiros, provider/canal real, dados reais ou produção irrestrita

## FECHAMENTO CONTROLADO PLAT-S09 — 2026-08-24T20:23:51-03:00

- task: `PLAT-S09-001_TENANT_AWARE_PLUGIN_MANIFEST_CATALOG`
- status: `READY_FOR_NEXT_STEP`
- delivery: catálogo de metadata tenant-aware em memória/PostgreSQL, manifest/identidade imutáveis, unique `(tenant, name, version)`, lifecycle `DRAFT/APPROVED/ARCHIVED`, precondition `conflict`, RLS e API admin
- evidence: `docs/04_audit/0499_plat_s09_plugin_catalog_evidence.md`
- gates: verify 71 arquivos/253 testes pass/16 skips; coverage 84,73% statements, 80,11% branches, 84,40% functions, 85,67% lines; readiness 4; E2E 1; PostgreSQL 6 arquivos/49 testes pass/16 skips; audit 0 vulnerabilidades; format e diff check PASS
- controlled_release: `CONTROLLED_MVP_READY`
- real_release: `WAITING_HUMAN_APPROVAL`
- next_safe_lane: novo SPEC; marketplace, instalação de terceiros, handlers persistentes, provider/canal, dados reais e ações sensíveis continuam fora do slice
