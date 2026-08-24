# 0310 — Construction Readiness 95

## Decisao

```txt
STATUS: CONTROLLED_CONSTRUCTION_ACTIVE
CONFIDENCE: 100% para entrada em construcao controlada
ESCOPO: entrar na fase de construcao com alto controle de execucao, nao liberar producao irrestrita
```

## Como a confianca e calculada

O score e machine-readable em `docs/03_build/0310_construction_readiness_95.json`.
O executor so pode declarar 95% quando:

- PRD/SPEC/RFs estao rastreados.
- Plano de build e task catalog estao deterministas.
- Runtime minimo executa.
- Testes, coverage, lint, typecheck, E2E e audit passam.
- CI reproduz os gates localmente.
- Persistencia tem contrato SQL inicial.
- Rollout sensivel permanece bloqueado.

## Score atual

| Categoria                     | Peso | Score | Status |
| ----------------------------- | ---: | ----: | ------ |
| Rastreabilidade PRD/SPEC      |   15 |    15 | PASS   |
| Plano deterministico de build |   15 |    15 | PASS   |
| Runtime executavel baseline   |   15 |    15 | PASS   |
| Testes e coverage             |   15 |    15 | PASS   |
| Seguranca e fail-closed       |   15 |    15 | PASS   |
| CI e reprodutibilidade        |   10 |    10 | PASS   |
| Contrato de persistencia      |   10 |    10 | PASS   |
| Rollout e controle de risco   |    5 |     5 | PASS   |

Total atualizado apos CC-S11: **100/100** para entrada e continuidade da construcao controlada.

## Atualizacao CC-S1 — 2026-04-29

Os 5% residuais foram fechados sem liberar producao irrestrita:

- Persistencia PostgreSQL exercitada contra Docker `postgres:16-alpine` com migration em schema isolado.
- Repository PostgreSQL controlado adicionado sem remover fallback in-memory.
- Web console deixou de usar fixtures estaticas no `App` e passou a consumir API client real com loading, empty e error states.
- API passou a emitir logs estruturados com `correlationId` para inbound, approval, task e audit.
- CI passou a executar Postgres service e `npm run test:postgres`.

## Atualizacao CC-S2 — 2026-04-29

O API runtime agora possui modo PostgreSQL controlado por env:

- `buildServerFromEnv` ativa PostgreSQL apenas com `API_PERSISTENCE_MODE=postgres` e `DATABASE_URL`.
- Sem `DATABASE_URL`, o modo PostgreSQL falha fechado.
- O modo default permanece in-memory.
- `POSTGRES_AUTO_MIGRATE` e opt-in.
- `npm run test:postgres` valida persistence smoke e API persistence mode contra PostgreSQL efemero.

## Atualizacao CC-S3 — 2026-04-29

O console operacional deixou de depender de IDs controlados de bootstrap:

- `GET /v1/conversations` retorna listagem paginada com `items` e `pageInfo`.
- Repositories in-memory e PostgreSQL implementam a mesma listagem desacoplada.
- Parametros invalidos de paginacao falham com envelope seguro `invalid_pagination`.
- Web console carrega conversas pela API e usa `conversationId`/`openSessionId` reais da listagem para timeline e audit.
- Testes confirmam ausencia de fallback para `conv_demo_controlled` e `sess_demo_controlled`.

## Atualizacao CC-S4 — 2026-04-29

O console operacional passou a executar decisoes controladas de approvals/handoffs:

- `ApprovalsPanel` renderiza acoes de aprovar, rejeitar e assumir handoff para approvals pendentes.
- API client envia decisions para `/v1/approvals/:approvalRequestId/decision` com role controlada.
- Decisao `assumed` por `Supervisor` gera audit event `handoff` com `correlationId`.
- Payload de handoff registra `effect: handoff_only`, sem executar integracao externa.
- Testes confirmam que a UI nao chama endpoints externos de agenda.

## Atualizacao CC-S5 — 2026-04-29

O lifecycle de tarefas internas passou a ser operavel no console:

- `PATCH /v1/tasks/:taskId/status` valida status, operador e role `Operator`.
- Repositories in-memory e PostgreSQL atualizam status de tarefas.
- Transicoes terminais invalidas retornam envelope seguro `invalid_action`.
- Auditoria registra `fromStatus`, `toStatus`, `taskId`, `sessionId` e `effect: internal_task_state_only`.
- Web console permite iniciar, concluir e cancelar tarefas sem chamar integracoes externas.

## Atualizacao CC-S6 — 2026-04-29

O runtime passou a exigir identidade operacional controlada para acoes internas sensiveis:

- `OperatorIdentitySchema` valida `operatorId` e role operacional humana.
- `POST /v1/approvals/:approvalRequestId/decision` exige `x-operator-id` e `x-operator-role`.
- `PATCH /v1/tasks/:taskId/status` exige role `Operator` e identidade explicita.
- Ausencia de identidade falha com `unauthorized` e role sem permissao falha com `forbidden`.
- Console web removeu operadores fixos e passou a enviar a identidade selecionada por headers.
- Auditoria registra `actorId` e `actorType` da identidade operacional.

## Atualizacao CC-S7 — 2026-04-29

A observabilidade runtime passou a expor evidencia de auditoria consultavel de forma controlada:

- `GET /v1/observability/audit-evidence` exige identidade com permissao `audit:view_full`.
- Filtros por `sessionId`, `correlationId`, `type` e `actorId` sao validados e falham fechado.
- Resposta inclui pagina de eventos, resumo agregado e metadata de export JSON.
- Export permanece interno, com `controlled: true` e `externalDispatch: false`.
- Repositories in-memory e PostgreSQL implementam a mesma superficie de consulta.
- Testes cobrem RBAC, validacao, paginacao, summary e smoke PostgreSQL.

## Atualizacao CC-S8 — 2026-04-29

O console operacional passou a revisar evidencia de auditoria de forma controlada:

- `apiClient.getAuditEvidence` consulta `GET /v1/observability/audit-evidence` com identidade operacional.
- Painel de auditoria exibe total de eventos controlados, formato JSON, status de despacho externo e eventos correlacionados.
- `Supervisor` e `Admin` podem revisar evidencia; `Operator` e `Approver` ficam bloqueados na UI e nao chamam o endpoint.
- `externalDispatch: false` permanece visivel no console como `Sem despacho externo`.
- Coverage V8 foi estabilizado com serializacao apenas para runs `--coverage`, mantendo thresholds acima de 80%.

## Atualizacao CC-S9 — 2026-04-29

A evidencia de auditoria passou a carregar governanca de retencao e payload minimizado:

- `auditEvidenceGovernance` declara `controlled-construction-audit-retention-v1`.
- `approvedForRealData` permanece `false` e `humanSignoffRequired` permanece `true`.
- `sanitizeAuditEvidencePayload` remove campos sensiveis antes da resposta do endpoint.
- Auditoria CC-S9 reforcou redacao de PII comum como email, CPF/documento, nome de paciente e endereco ficticios.
- `GET /v1/observability/audit-evidence` retorna `governance.payload.redactedFields`.
- Console exibe a policy de retencao e `Dados reais bloqueados`.
- Migration adiciona indices para `type`, `actor_id` e `(payload->>'sessionId')`.

## Atualizacao CC-S10 — 2026-04-29

O console de audit evidence passou a indicar completude operacional da pagina revisada:

- Painel mostra a faixa atual `Evidencias <inicio>-<fim> de <total>`.
- Controles `Anterior` e `Proxima` usam `pageInfo.offset`, `limit` e `hasNextPage`.
- Web client mantem identidade operacional em todas as chamadas de evidence review.
- Pedido de export controlado cria aprovacao interna `audit_evidence_export_review` com risco `high`.
- Nenhum endpoint de export externo e chamado; despacho externo continua bloqueado.

## Atualizacao CC-S11 — 2026-04-30

A evidencia final de construcao controlada foi reconciliada:

- `npm run verify` inclui `npm run format:check`.
- `npm run format:check` passa em todo o workspace.
- Traceability matrix agora falha se apontar para arquivo de teste inexistente.
- Testes de feature web e testes de fluxo/repository faltantes foram criados para os `required_tests` da matriz.
- Idempotencia PostgreSQL de inbound usa chave transacional `inbound:<channel>:<externalMessageId>` em `idempotency`.
- `TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:55432/cvg_test npm run test:postgres` passou sem skips contra Docker `postgres:16-alpine`.
- HTTP smoke real passou em `/health` e webhook inbound.
- Todos os itens P0/P1 do backlog de debug correction estao `completed`.

## Condicoes para entrar na construcao

- `npm run verify` deve passar.
- `npm run test:e2e` deve passar.
- `npm run readiness` deve passar.
- Nenhum RF pode ficar sem mapping em `0304_traceability_matrix.json`.
- Nenhuma task pode ficar sem teste e comando de validacao em `0308_task_catalog.json`.
- `.github/workflows/verify.yml` deve executar `npm ci`, `npm run verify` e `npm run test:e2e`.
- Migration inicial deve conter tabelas operacionais e auditoria.

## Limites explicitos

95% de certeza aqui significa alta confianca de que a **fase de construcao** consegue produzir um programa funcional seguindo o plano. Nao significa que o produto ja esta liberado para producao irrestrita.

Continuam proibidos ate nova decisao PRD/SPEC:

- confirmar, cancelar ou reagendar consulta real automaticamente;
- responder RAG com fonte nao aprovada;
- usar dados reais sem politica de retencao;
- executar acoes clinicas, financeiras ou de prontuario definitivo;
- remover aprovacao humana de qualquer acao sensivel.
