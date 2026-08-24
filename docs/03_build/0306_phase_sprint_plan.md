# 0306 — Phase and Sprint Plan

## Objetivo

Dividir a construcao em phases e sprints deterministicas. Cada sprint tem escopo fechado, entregaveis, arquivos, testes e comandos. A versao operacional completa esta em `0306_phase_sprint_plan.json`.

Os detalhes atomicos de cada task estao em `0308_task_catalog.json`. Se uma task aparecer no plano de phases e nao aparecer no catalogo, a execucao deve bloquear.

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
