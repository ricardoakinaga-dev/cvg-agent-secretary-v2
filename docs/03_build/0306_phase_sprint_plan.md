# 0306 — Phase and Sprint Plan

## PLAT-S47 — fechamento controlado em AUDIT

- sprint: `PLAT-S47`
- task: `PLAT-S47-001_CONTROLLED_MULTI_AGENT_CREATION_MODE`
- status: `COMPLETED_CONTROLLED`
- stage: `AUDIT`
- owner: `platform/control-center`
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- escopo: modo `Novo agente`, reset bounded do editor e jornada UI/API Agent
  A/B no mesmo tenant/sessão, preservando clone de versão existente
- evidência: `docs/04_audit/0537_plat-s47_controlled_multi_agent_creation_evidence.md`
- resultado: RED inicial reproduziu o dead-end; GREEN fechou A/B, clone,
  isolamento assíncrono entre agentes/tenants e preservação dos catálogos
  tenant-wide; auditoria corretiva também fechou agent scope, redaction e
  payload legado; gates integrados PASS; produção real continua NO-GO

### Atualização de auditoria PLAT-S47 — 2026-08-26

Regressão integral: 127 arquivos PASS/2 skipped e 534 testes PASS/19 skipped;
coverage 84,86/80,12/84,97/85,97; PostgreSQL 8/72; E2E 4/4; readiness 4/4;
worker smoke; build 158 módulos; audit 0; typecheck, lint, format e diff check
PASS. A crítica independente compatível final retornou `PASS_CONTROLLED`, sem
P0/P1/P2/P3; produção real segue `NO-GO`/`WAITING_HUMAN_APPROVAL`.

## PLAT-S46 — registro e fechamento controlado

- sprint: `PLAT-S46`
- task: `PLAT-S46-001_CONTROLLED_EXECUTION_TRACE_CORRELATION_BOUNDARY`
- status: `COMPLETED_CONTROLLED`
- stage: `AUDIT`
- owner: `platform/observability/agent-core`
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- escopo: uma identidade `traceId` criada/validada antes do primeiro evento e
  propagada para event bus, hooks, gateway, tool audit, Test Lab, runtime e
  sinks; IDs locais permanecem distintos
- evidência: `docs/04_audit/0536_plat-s46_controlled_execution_trace_correlation_boundary_evidence.md`
- próximo passo: nova discovery/SPEC controlada; produção real continua NO-GO

### Fechamento controlado PLAT-S46 — 2026-08-26T11:22:54-03:00

RED: 4 arquivos/33 testes, 8 falhas esperadas; GREEN: 6 arquivos/25 testes
pass. Regressão 126 arquivos/523 testes pass, 2 arquivos/19 testes skipped;
coverage 85,07/80,06/85,95/86,10; PostgreSQL 8/72; readiness 4/4; worker
smoke; E2E 4/4; build 70 módulos; audit 0; typecheck, lint, format e diff
check PASS. Revisão independente compatível read-only `PASS` sem P0/P1/P2.

## Objetivo

Dividir a construcao em phases e sprints deterministicas. Cada sprint tem escopo fechado, entregaveis, arquivos, testes e comandos. A versao operacional completa esta em `0306_phase_sprint_plan.json`.

Os detalhes atomicos de cada task estao em `0308_task_catalog.json`. Se uma task aparecer no plano de phases e nao aparecer no catalogo, a execucao deve bloquear.

## Lane controlada atual — PLAT-S45

`PLAT-S45-001_CONTROLLED_TOOL_INVOCATION_BOUNDARY` foi fechada em `AUDIT`
como `COMPLETED_CONTROLLED`, com validators server-side de input/output,
authorizer efetivo, approval durável/single-use, bounds de actor/input/config e
projeção redigida de resultado. A revisão independente compatível read-only
retornou `PASS sem P0/P1`. Evidência:
`docs/04_audit/0535_plat-s45_controlled_tool_invocation_boundary_evidence.md`.

Gates: focused 6/41; regressão 125 arquivos/512 testes pass com 2/19 skipped;
coverage 85,01/80,14/85,82/86,03; PostgreSQL 6/53 com 2/19 skipped; E2E 4/4;
readiness 4/4; build 70 módulos; audit 0; typecheck, lint, format e diff check PASS.
As lanes S42, S43 e S44 permanecem fechadas como `COMPLETED_CONTROLLED`;
produção real continua bloqueada por decisão humana e infraestrutura.

## Ordem fechada de phases

1. Phase 0 — Foundation Control
2. Phase 1 — Shared Contracts
3. Phase 2 — Persistence and Data Integrity
4. Phase 3 — Agent Core and Application Commands
5. Phase 4 — Policy, Approvals and Tools
6. Phase 5 — Workflows MVP
7. Phase 6 — API and Worker Runtime
8. Phase 7 — Operational Web Panel
9. Phase 8 — Adapters, Memory and Safe RAG
10. Phase 9 — Observability, Security and Hardening
11. Phase 10 — Controlled Rollout Readiness

## Phase 0 — Foundation Control

Objetivo: criar monorepo, gates e baseline de seguranca sem regra funcional.

- Sprint 0.1: repository skeleton, npm workspaces, TypeScript base.
- Sprint 0.2: tests, lint, typecheck, coverage, env baseline.
- Sprint 0.3: CI local, tracking JSON e dependency audit.

## Phase 1 — Shared Contracts

Objetivo: criar contratos compartilhados que impedem divergencia entre API, worker, web e packages.

- Sprint 1.1: ids, enums, value objects e error codes.
- Sprint 1.2: envelopes, pagination, env schema, auth role schema.
- Sprint 1.3: API/application schemas de entrada e saida.

## Phase 2 — Persistence and Data Integrity

Objetivo: materializar entidades, migrations, repositories e idempotencia.

- Sprint 2.1: Drizzle schema e migrations para entidades centrais.
- Sprint 2.2: repositories transacionais e idempotency store.
- Sprint 2.3: audit append-only, outbox e retencao provisoria.

## Phase 3 — Agent Core and Application Commands

Objetivo: implementar commands da SPEC sem workflows complexos.

- Sprint 3.1: ReceiveInboundMessage, timeline e session manager.
- Sprint 3.2: CreateInternalTask e CreateHandoffSummary.
- Sprint 3.3: RunAgentTurn skeleton e AgentRun lifecycle.

## Phase 4 — Policy, Approvals and Tools

Objetivo: garantir fail-closed antes de workflows sensiveis.

- Sprint 4.1: policy engine, autonomy levels e blocked actions.
- Sprint 4.2: approval request/decision state machine.
- Sprint 4.3: tool registry e local fake tools.

## Phase 5 — Workflows MVP

Objetivo: implementar fluxos iniciais com LangGraph e safety.

- Sprint 5.1: intent classification e tutor/pet workflow.
- Sprint 5.2: triage safe workflow e handoff.
- Sprint 5.3: scheduling draft e institutional question safe workflow.

## Phase 6 — API and Worker Runtime

Objetivo: expor endpoints e processamento assincrono sem acoplar canal.

- Sprint 6.1: Fastify app, health, auth shell e error envelope.
- Sprint 6.2: webhooks, sessions, conversations e audit endpoints.
- Sprint 6.3: approvals, tasks, worker loop e outbox processor.

## Phase 7 — Operational Web Panel

Objetivo: painel minimo para operador humano.

- Sprint 7.1: app shell, API client, auth guard e layout operacional.
- Sprint 7.2: conversations list e timeline.
- Sprint 7.3: approvals, tasks e audit view.

## Phase 8 — Adapters, Memory and Safe RAG

Objetivo: preparar extensibilidade sem ativar integracoes sensiveis.

- Sprint 8.1: channel adapter interface e fake WhatsApp adapter.
- Sprint 8.2: memory facts aprovados e RAG noop/source-gated.
- Sprint 8.3: integration events, retries e circuit breaker.

## Phase 9 — Observability, Security and Hardening

Objetivo: transformar MVP em runtime investigavel e resiliente.

- Sprint 9.1: Pino logs, metrics, health checks e correlation propagation.
- Sprint 9.2: SLO tests, load smoke, idempotency stress.
- Sprint 9.3: security audit, dependency remediation e E2E critical flows.

## Phase 10 — Controlled Rollout Readiness

Objetivo: preparar piloto humano assistido.

- Sprint 10.1: operator runbook, rollback and incident playbook.
- Sprint 10.2: staging checklist and data governance sign-off.
- Sprint 10.3: pilot report template and remediation loop.

## Regra de avanco

Nenhuma phase avanca se:

- qualquer sprint anterior estiver `BLOCKED`;
- testes obrigatorios estiverem quebrados;
- tracking JSON estiver desatualizado;
- a phase exigir decisao humana ainda pendente.
