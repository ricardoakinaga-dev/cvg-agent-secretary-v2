# 0300 — Build Engineer Master

## Estado incremental pós-query-parser — 2026-09-24

A [revisão 0571](../04_audit/0571_implementation_state_review_2026-09-23.md),
[lista 0572](../04_audit/0572_next_improvement_round_2026-09-23.md),
[roadmap 0342](0342_post_query_roadmap_20260923.md) e
[backlog 0343](0343_post_query_backlog_20260923.md) governam a rodada
documental incremental. `AUD20-17-FU1` query-parser recebeu `PASS_LOCAL`
limitado. O BUILD request-context v2 foi executado; C02 tem evidência
`PASS_LOCAL`; a crítica independente do candidato registrou C01–C05 `PASS` e
C06/C07 `FAIL`, então a task permanece aberta e sem aceite. O valor de
branches observado não foi adjudicado contra o piso de 95%, pois o registry
congelado não enumera o módulo. Ver a
[errata de aplicabilidade](../04_audit/evidence/AUD20/AUD20-17-request-context-branch-floor-erratum-20260924.md).
Medidas, cobertura e gates estão no
[relatório](../04_audit/evidence/AUD20/AUD20-17-request-context-v2-build-report-20260924.md)
e no [manifesto candidate-bound](../04_audit/evidence/AUD20/AUD20-17-request-context-v2-build-candidate-manifest-20260924.json).
A proposta SPEC v2 hash `1cb72b0e097ad19539c1f14fbdc892542ae9ddabf716bba00eef20b1c4cb237c`
recebeu `PASS_FOR_HUMAN_REVIEW` e agora tem aprovação humana e admissão BUILD
local controlado, registradas em 0190/0337. A reconstrução v1 e os gates locais
foram executados sem PostgreSQL; C06/C07 e aceite final seguem abertos. Próxima
ação: Q1 foi decidida (o piso de 95% aplica-se a `request-context.ts` e os
92% seguem `REPORT_ONLY`); recuperar binding candidate-bound válido e cumprir
os gates C06 restantes, mantendo C06/C07 `FAIL` até lá. `AUD20-10` permanece
enfileirada até o DAG liberar. Staging real e produção `NO_GO`.

## Planejamento complementar de 50 melhorias — baseline documental de 2026-09-23

O [plano executivo 0339](0339_plan50_executive_plan_20260923.md),
[roadmap 0340](0340_plan50_roadmap_20260923.md) e
[backlog candidato 0341](0341_plan50_backlog_20260923.md) detalham a
[auditoria 0569](../04_audit/0569_repository_audit_2026-09-23.md) e a
[lista 0570](../04_audit/0570_prioritized_improvements_2026-09-23.md).
São baseline de planejamento; os estados oficiais estão em
[CURRENT](../CURRENT.md) e no backlog operacional 0337. O adiamento de
`AUD20-10/17/20` descrito no plano foi revogado posteriormente para escopo
local, sob gates próprios. `AUD20-19` aguarda sessão humana; staging real e
produção seguem `NO_GO`.

## Checkpoint histórico pós-auditoria de 21/09/2026

A [auditoria 0568](../04_audit/0568_full_repository_audit_2026-09-21.md) é a
fonte corrente dos 30 achados. O [plano 0335](0335_aud20260921_executive_plan.md),
o [roadmap 0336](0336_aud20260921_roadmap.md), o
[backlog 0337](0337_aud20260921_backlog.md) e o
[prompt 0338](0338_aud20260921_codex_execution_prompt.md) governam a execução
`AUD20-REM v2`. `AUD20-01..06` e `AUD20-16` estão `COMPLETED` localmente;
`AUD20-08` é a próxima task. Staging real e produção continuam `NO_GO`.

## Programa de remediação pós-reauditoria de 20/09/2026

A [reauditoria 0567](../04_audit/0567_aud19_delivery_reaudit_2026-09-20.md) supersede o claim de conclusão integral do programa AUD19. O [roadmap 0333](0333_aud20260920_roadmap.md) e o [backlog 0334](0334_aud20260920_backlog.md) governam `AUD20-REM`. `AUD20-01` está `COMPLETED` no escopo documental e `AUD20-02` foi concluída em BUILD local controlado; `AUD20-03` é a próxima task. Re-selo, staging real e produção continuam bloqueados.

## Programa de remediação pós-auditoria de 19/09/2026

A auditoria integral [0566](../04_audit/0566_full_repository_gauntlet_audit_2026-09-19.md) é a fonte dos achados `AUD19`. O [roadmap 0331](0331_aud20260919_roadmap.md) e o [backlog 0332](0332_aud20260919_backlog.md) ordenam 15 tasks. O primeiro item é `AUD19-01`; qualquer BUILD depende de SPEC/gate próprio. Staging real e produção permanecem `NO_GO`.

## Programa pós-auditoria de 17/09/2026

O plano [0328](0328_aud20260917_executive_plan.md), roadmap [0329](0329_aud20260917_roadmap.md) e backlog [0330](0330_aud20260917_backlog.md) cobrem os nove itens da auditoria 0565. São planejamento documental; o BUILD depende da SPEC/gate de cada task. Produção permanece `NO_GO`.

## Complemento pós-auditoria de 13/09/2026

Consultar [plano para produção](../PLANO_EXECUTIVO_PRODUCAO.md), [roadmap](../ROADMAP_PRODUCAO.md) e [backlog consolidado](../BACKLOG_PRODUCAO.md). Os 42 IDs AAA mantêm seus contratos/status; 14 IDs PROD acrescentam correções e pré-requisitos de saída. Não concluir pela evidência histórica de outro candidato. Este índice não concede gate de BUILD ou produção.

## Programa AAA pós-auditoria — 2026-09-12

Planejamento vigente da remediação `AUD-20260912-001`: [plano executivo 0324](0324_aaa_executive_plan.md), [roadmap 0325](0325_aaa_roadmap.md), [backlog 0326](0326_aaa_backlog.md). O [JSON canônico](tracking/aaa_program_backlog.json) registra 42 tasks propostas; nenhum gate BUILD é concedido por este índice. Preservar gates históricos e ler a SPEC aprovada da task antes de código.

## Objetivo da construcao

Construir a Esmeralda V2 como plataforma de agente hospitalar modular, auditavel e semi-autonoma, iniciando pelo MVP entre autonomia nivel 1 e nivel 2.

## Escopo da execucao

Derivado da SPEC:

- Monorepo com `apps` e `packages`.
- Agent Runtime.
- Session Manager.
- State Manager.
- LangGraph Workflows.
- Tool Registry.
- Policy Engine.
- Memory Engine inicial.
- Human Approval Layer.
- Audit Logger.
- Task Queue.
- API, worker e web minimo.

## Modulos envolvidos

- `apps/api`
- `apps/worker`
- `apps/web`
- `packages/shared`
- `packages/agent-core`
- `packages/workflows`
- `packages/tools`
- `packages/adapters`
- `packages/memory`
- `packages/policy`
- `packages/rag`

## Riscos tecnicos

- Acoplamento de canal ao runtime.
- Falta de idempotencia em mensagens, tools e tasks.
- Policy engine insuficiente para bloquear acoes sensiveis.
- Auditoria parcial.
- Workflows grandes demais ou com regra clinica indevida.
- Painel minimo virar fonte de regra de negocio.

## Dependencias criticas

- SPEC aprovada para planejamento em `docs/02_spec/0190_spec_validation.md`.
- Definicao humana final das regras de agenda e autonomia.
- Contratos de tools antes dos workflows.
- Persistencia e auditoria antes de integracoes externas.

## Estrategia de execucao

Executar em fases sequenciais:

```txt
Fundacao -> Dominio -> Fluxos -> API/Integracoes -> Frontend -> Hardening -> Rollout
```

Cada phase deve ser quebrada em sprints. Cada task deve conter o que, onde, como, dependencia e criterio de pronto.

## Artefatos deterministas obrigatorios

- `0303_build_execution_contract.md`: contrato de execucao, bloqueios, TDD e Definition of Done.
- `0304_traceability_matrix.md` e `.json`: rastreabilidade PRD/SPEC para phases, sprints, tasks e testes.
- `0305_repository_target_structure.md` e `.json`: arvore alvo exata do repositorio.
- `0306_phase_sprint_plan.md` e `.json`: phases, sprints e entregaveis fechados.
- `0307_technical_tracking_schema.md`: schema de acompanhamento tecnico.
- `0308_task_catalog.json`: catalogo atomico de tasks com arquivos, testes e comandos.
- `phase_0/task_*.md`: tasks executaveis da primeira phase.

O executor deve tratar os JSONs como fonte operacional. Os Markdown explicam o racional; os JSONs controlam execucao e verificacao.

## Estrategia de validacao

- Testes unitarios para regras, schemas e policies.
- Testes de integracao para commands, repositories e tools.
- Testes de fluxo para workflows principais.
- Auditoria de sprint ao final de cada entrega.
- Registro no execution log.

## Estrategia de rollback

- Migracoes pequenas e reversiveis quando possivel.
- Feature flags ou configuracoes para ativar workflows.
- Adapters externos isolados para desligamento sem derrubar runtime.
- Falhar fechado em policy, approvals e acoes sensiveis.

## Gate pre-build

```txt
STATUS: WAITING_HUMAN_APPROVAL_FOR_PHASE_0_EXECUTION
CONDICAO: sprint 0 esta detalhada, mas execucao de codigo exige confirmacao humana explicita do escopo e nao libera fluxos sensiveis
```

## Guardrails obrigatorios para qualquer sprint

- Comecar por teste ou criterio executavel quando houver codigo.
- Manter `npm test`, typecheck e lint verdes antes de fechar sprint.
- Nao implementar agenda funcional, RAG com dado real, financeiro, prontuario ou automacao clinica sem decisao humana registrada.
- Falhar fechado para policy, auth, audit e actions sensiveis.
- Registrar mudancas em `docs/20_master_execution_log.md` e atualizar `docs/99_runtime_state.md`.
