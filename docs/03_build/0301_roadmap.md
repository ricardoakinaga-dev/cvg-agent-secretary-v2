# 0301 — Roadmap

## Roadmap incremental corrente — 2026-09-24

Consultar [0342](0342_post_query_roadmap_20260923.md), com
[revisão 0571](../04_audit/0571_implementation_state_review_2026-09-23.md)
e [backlog 0343](0343_post_query_backlog_20260923.md). A revisão NQP-03 não
aceitou a primeira fatia request-context. A emenda v2 foi aprovada e admitida
por hash; seu BUILD local agora está executado. C02 tem evidência `PASS_LOCAL`;
a crítica independente do candidato registrou C01–C05 `PASS` e C06/C07 `FAIL`.
Branches 92% e functions globais 89,27% são valores reportados enquanto o
binding permanece incompleto; a aplicabilidade do piso crítico de 95% a
request-context não está adjudicada porque o registry não enumera o módulo.
Ver a [errata](../04_audit/evidence/AUD20/AUD20-17-request-context-branch-floor-erratum-20260924.md)
e o [relatório BUILD](../04_audit/evidence/AUD20/AUD20-17-request-context-v2-build-report-20260924.md).
Próxima ação: obter a decisão humana Q1 sobre aplicabilidade; manter C06/C07
`FAIL` e os gaps de binding, baseline, PostgreSQL e mutation sem outro BUILD.
`AUD20-10` segue enfileirado até Q1 liberar o DAG. Os gates do programa
`AUD20-REM v2` continuam em 0337.

## Roadmap complementar das 50 melhorias — baseline de 2026-09-23

Consultar [0340](0340_plan50_roadmap_20260923.md), com
[plano 0339](0339_plan50_executive_plan_20260923.md) e
[backlog 0341](0341_plan50_backlog_20260923.md). A sequência é relativa a
gates, sem datas de release inventadas; o programa operacional AUD20 e seu
estado continuam em [CURRENT](../CURRENT.md) e no backlog 0337.

## Roadmap corrente pós-auditoria — 2026-09-21

Consultar [plano 0335](0335_aud20260921_executive_plan.md),
[roadmap 0336](0336_aud20260921_roadmap.md) e
[backlog 0337](0337_aud20260921_backlog.md). Eles ampliam AUD20 para cobrir os
30 achados da auditoria 0568. Os documentos 0333/0334 permanecem históricos;
staging real e produção continuam `NO_GO`.

## Roadmap corrente pós-reauditoria — 2026-09-20

Consultar [0333_aud20260920_roadmap.md](0333_aud20260920_roadmap.md) e [0334_aud20260920_backlog.md](0334_aud20260920_backlog.md). O programa AUD19 abaixo é histórico; staging real e produção permanecem `NO_GO`.

## Programa de remediação pós-auditoria de 19/09/2026

Consultar [roadmap 0331](0331_aud20260919_roadmap.md), [backlog 0332](0332_aud20260919_backlog.md) e [auditoria 0566](../04_audit/0566_full_repository_gauntlet_audit_2026-09-19.md). Os marcos M0–M7 corrigem primeiro contrato/certificação e idempotência concorrente, depois dados, qualidade, operação, staging-like e somente então gates externos/humanos. Nenhum marco concede BUILD ou release por si só.

## Programa pós-auditoria de 17/09/2026

Consultar [roadmap 0329](0329_aud20260917_roadmap.md), [plano 0328](0328_aud20260917_executive_plan.md) e [backlog 0330](0330_aud20260917_backlog.md). Seus marcos P0–P4 não renumeram as fases históricas abaixo.

## Complemento pós-auditoria de 13/09/2026

Consultar [plano para produção](../PLANO_EXECUTIVO_PRODUCAO.md), [roadmap](../ROADMAP_PRODUCAO.md) e [backlog consolidado](../BACKLOG_PRODUCAO.md). Os 42 IDs AAA mantêm seus contratos/status; 14 IDs PROD acrescentam correções e pré-requisitos de saída. Não concluir pela evidência histórica de outro candidato. Este índice não concede gate de BUILD ou produção.

## Evolução AAA pós-auditoria — 2026-09-12

Para as seis fases propostas de remediação e qualificação multiagente, consultar [0325_aaa_roadmap.md](0325_aaa_roadmap.md) e [0324_aaa_executive_plan.md](0324_aaa_executive_plan.md). O roteiro original abaixo permanece histórico; a nova execução depende de contratos, gates e autoridade próprios.

## Planejamento de remediação pós-auditoria — 2026-09-05

Para evolução proposta a partir da auditoria 0539, consultar [0312_roadmap_pos_auditoria.md](0312_roadmap_pos_auditoria.md) e [plano executivo](0311_plano_executivo_pos_auditoria.md). Os itens abaixo preservam o planejamento original; não representam automaticamente pendências atuais nem aprovação das tasks REM.

Este roadmap e somente a visao macro. A execucao deterministica esta em `0306_phase_sprint_plan.json` e `0308_task_catalog.json`.

## Phase 0 — Fundacao

- Objetivo: estruturar repositorio, shared, contratos base e configuracao.
- Entregaveis: `apps`, `packages`, tipos compartilhados, schemas, erros, envelope, setup de testes, lint, typecheck, baseline de secrets e CI local.
- Riscos: overengineering antes do fluxo minimo.
- Dependencias: SPEC condicionalmente aprovada e aprovacao humana da Phase 0.
- Criterios de sucesso: projeto instala, testa, typechecka, possui estrutura base pronta e nao habilita fluxo sensivel.

## Phase 1 — Dominio

- Objetivo: implementar dominio operacional da agente.
- Entregaveis: conversations, messages, sessions, agent_runs, tool_calls, audit base.
- Riscos: perda de rastreabilidade.
- Dependencias: Phase 0.
- Criterios de sucesso: mensagem recebida cria timeline auditavel.

## Phase 2 — Fluxos

- Objetivo: implementar workflows iniciais e policies.
- Entregaveis: identificacao tutor/pet, triagem, handoff, task, duvida institucional, approval request.
- Riscos: automacao passar do nivel permitido.
- Dependencias: dominio, policy e tools locais.
- Criterios de sucesso: workflow executa com safety e handoff.

## Phase 3 — API

- Objetivo: expor comandos e queries operacionais.
- Entregaveis: webhooks, sessions, conversations, approvals, tasks e audit endpoints.
- Riscos: API carregar regra de workflow.
- Dependencias: agent-core e contracts.
- Criterios de sucesso: API controla acesso e chama casos de uso.

## Phase 4 — Integracoes

- Objetivo: conectar adapters iniciais.
- Entregaveis: adapter de canal, mocks externos, integration events, retries.
- Riscos: dependencia externa bloquear MVP.
- Dependencias: API, worker e audit.
- Criterios de sucesso: adapter substituivel e falhas registradas.

## Phase 5 — Frontend

- Objetivo: painel minimo operacional.
- Entregaveis: conversas, timeline, approvals, tasks e auditoria de sessao.
- Riscos: UI permitir acao sensivel indevida.
- Dependencias: API de painel e permissoes.
- Criterios de sucesso: operador aprova, rejeita, assume e investiga.

## Phase 6 — Hardening

- Objetivo: qualidade, observabilidade, seguranca e testes de falha.
- Entregaveis: logs, metricas, tracing, retries, idempotencia e auditoria de seguranca.
- Riscos: gaps estruturais descobertos tarde.
- Dependencias: fluxo MVP completo.
- Criterios de sucesso: auditoria de runtime controlado sem gaps criticos abertos.

## Phase 7 — Rollout

- Objetivo: operacao controlada assistida por humanos.
- Entregaveis: piloto, relatorio, ajustes, remediation plan.
- Riscos: regras humanas incompletas.
- Dependencias: hardening e aprovacao de negocio.
- Criterios de sucesso: atendimento real operando com safety, approvals e auditoria.
