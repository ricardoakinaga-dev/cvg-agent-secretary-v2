# 0302 — Backlog Master

## Backlog corrente pós-reauditoria — 2026-09-20

O programa corrente é `AUD20-REM`: [roadmap 0333](0333_aud20260920_roadmap.md) e [backlog 0334](0334_aud20260920_backlog.md). `AUD20-01` está `READY_FOR_NEXT_STEP` apenas para SPEC/barra; tasks técnicas permanecem `BLOCKED`. O estado AUD19 abaixo é histórico e foi supersedido pela auditoria 0567.

## Programa de remediação pós-auditoria de 19/09/2026

O [backlog 0332](0332_aud20260919_backlog.md) é a fonte operacional das 15 tasks `AUD19`, derivadas da [auditoria 0566](../04_audit/0566_full_repository_gauntlet_audit_2026-09-19.md) e ordenadas pelo [roadmap 0331](0331_aud20260919_roadmap.md). O índice canônico de estado é [docs/CURRENT.md](../CURRENT.md). `AUD19-01` está `COMPLETED`; as frentes de concorrência, dados e identidade (`AUD19-02..06`) estão `IN_PROGRESS`; `AUD19-07` é a próxima task `READY_FOR_NEXT_STEP`; `AUD19-08..15` seguem `BLOCKED` por dependências técnicas, externas ou humanas. `AUD19-15` só avançará para `WAITING_HUMAN_APPROVAL` quando o dossiê estiver apto à decisão. O veredito corrente é `FAIL / NO_GO` para o gate AAA/staging e `NO_GO` para produção.

## Programa pós-auditoria de 17/09/2026

O [backlog 0330](0330_aud20260917_backlog.md) preserva as 15 tasks `AUD17`; [plano 0328](0328_aud20260917_executive_plan.md) e [roadmap 0329](0329_aud20260917_roadmap.md) definem seus gates e ordem. AUD17-01..12 receberam evidência local, incluindo PostgreSQL descartável, e AUD17-13..15 seguem bloqueadas externamente. A auditoria 0566 posterior rejeitou o rótulo `AAA_CANDIDATE` porque `94,64%` não satisfaz o contrato de evals `>=97%`; o estado de release atual é controlado pelo programa AUD19 acima.

## Complemento pós-auditoria de 13/09/2026

Consultar [plano para produção](../PLANO_EXECUTIVO_PRODUCAO.md), [roadmap](../ROADMAP_PRODUCAO.md) e [backlog consolidado](../BACKLOG_PRODUCAO.md). Os 42 IDs AAA mantêm seus contratos/status; 14 IDs PROD acrescentam correções e pré-requisitos de saída. Não concluir pela evidência histórica de outro candidato. Este índice não concede gate de BUILD ou produção.

## Programa AAA — 2026-09-12

Backlog da auditoria `AUD-20260912-001`: [0326_aaa_backlog.md](0326_aaa_backlog.md), derivado de [tracking/aaa_program_backlog.json](tracking/aaa_program_backlog.json). O JSON é a fonte de status/dependências das 42 tasks propostas; cobre 20 dimensões e 15 achados, sem substituir silenciosamente o backlog REM/Phase 10 nem conceder autorização de BUILD.

## Planejamento de remediação pós-auditoria — 2026-09-05

Para evolução proposta a partir da auditoria 0539, consultar [0313_backlog_pos_auditoria.md](0313_backlog_pos_auditoria.md) e [plano executivo](0311_plano_executivo_pos_auditoria.md). Os itens abaixo preservam o planejamento original; não representam automaticamente pendências atuais nem aprovação das tasks REM.

## P0 — Critico

### P0-01 — Setup monorepo

- Descricao: criar estrutura `apps` e `packages`.
- Modulo: repository.
- Dependencia: nenhuma.
- Phase sugerida: Phase 0.
- Risco: baixo.
- Impacto: alto.

### P0-02 — Shared contracts

- Descricao: criar tipos, schemas, envelope, erros e ids.
- Modulo: `packages/shared`.
- Dependencia: setup.
- Phase sugerida: Phase 0.
- Risco: medio.
- Impacto: alto.

### P0-03 — Conversation/session core

- Descricao: persistir conversas, mensagens e sessoes.
- Modulo: `packages/agent-core`.
- Dependencia: shared.
- Phase sugerida: Phase 1.
- Risco: medio.
- Impacto: alto.

### P0-04 — Audit logger

- Descricao: registrar agent runs, tool calls, safety e integration events.
- Modulo: `packages/agent-core`.
- Dependencia: dominio.
- Phase sugerida: Phase 1.
- Risco: alto.
- Impacto: alto.

### P0-05 — Policy engine

- Descricao: bloquear diagnostico, prescricao e acoes sensiveis.
- Modulo: `packages/policy`.
- Dependencia: shared.
- Phase sugerida: Phase 2.
- Risco: alto.
- Impacto: alto.

### P0-06 — Quality gates automatizaveis

- Descricao: criar scripts de test, typecheck, lint, coverage e CI local.
- Modulo: repository.
- Dependencia: setup monorepo.
- Phase sugerida: Phase 0.
- Risco: alto.
- Impacto: alto.

### P0-07 — Security/config baseline

- Descricao: validar env, impedir secrets no repositorio e falhar fechado quando configuracao critica estiver ausente.
- Modulo: `packages/shared`.
- Dependencia: shared contracts.
- Phase sugerida: Phase 0.
- Risco: alto.
- Impacto: alto.

## P1 — Alta prioridade

### P1-01 — Tool registry

- Descricao: registrar e executar tools por contrato.
- Modulo: `packages/tools`.
- Dependencia: shared, policy.
- Phase sugerida: Phase 2.
- Risco: medio.
- Impacto: alto.

### P1-02 — Workflows iniciais

- Descricao: implementar identificacao, triagem, agendamento draft, handoff e duvida institucional.
- Modulo: `packages/workflows`.
- Dependencia: agent-core, tools, policy.
- Phase sugerida: Phase 2.
- Risco: alto.
- Impacto: alto.

### P1-03 — Approval queue

- Descricao: criar request, resolver decisao e auditar.
- Modulo: `packages/policy`, `apps/api`.
- Dependencia: policy, audit.
- Phase sugerida: Phase 2-3.
- Risco: alto.
- Impacto: alto.

### P1-04 — Panel minimo

- Descricao: conversas, timeline, approvals e tasks.
- Modulo: `apps/web`.
- Dependencia: API.
- Phase sugerida: Phase 5.
- Risco: medio.
- Impacto: alto.

## P2 — Medio

### P2-01 — Adapter WhatsApp

- Descricao: receber e enviar mensagens por adapter substituivel.
- Modulo: `packages/adapters`.
- Dependencia: API, audit.
- Phase sugerida: Phase 4.
- Risco: medio.
- Impacto: medio.

### P2-02 — RAG institucional inicial

- Descricao: responder duvidas autorizadas com fonte.
- Modulo: `packages/rag`.
- Dependencia: base institucional validada.
- Phase sugerida: Phase 4-6.
- Risco: medio.
- Impacto: medio.

### P2-03 — Observabilidade

- Descricao: logs estruturados, metricas e correlation id.
- Modulo: todos.
- Dependencia: runtime.
- Phase sugerida: Phase 6.
- Risco: medio.
- Impacto: alto.

## P3 — Baixo

### P3-01 — Billing Agent

- Descricao: agente financeiro futuro.
- Modulo: futuro.
- Dependencia: regras financeiras.
- Phase sugerida: pos-MVP.
- Risco: alto.
- Impacto: medio.

### P3-02 — Quality Supervisor Agent

- Descricao: supervisor de qualidade dos atendimentos.
- Modulo: futuro.
- Dependencia: auditoria robusta.
- Phase sugerida: pos-MVP.
- Risco: medio.
- Impacto: medio.
