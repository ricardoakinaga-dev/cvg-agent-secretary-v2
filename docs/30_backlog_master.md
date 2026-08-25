# BACKLOG MASTER — CVG

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
