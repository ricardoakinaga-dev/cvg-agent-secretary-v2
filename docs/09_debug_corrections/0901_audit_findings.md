# 0901 - Audit Findings For Debug Corrections

## Decisao de auditoria

```txt
DECISAO: NAO_APROVAR_ENTERPRISE_PREMIUM_FECHADO
PERMITIDO: continuidade de construcao controlada
BLOQUEADO: producao irrestrita e uso real sensivel
```

## Findings obrigatorios

### DBG-F01 - Evidencia de runtime esta desatualizada

- Severidade: HIGH.
- Arquivos:
  - `docs/03_build/0311_controlled_construction_sprint_01.md`
  - `docs/04_audit/0491_runtime_evidence.md`
  - `docs/03_build/0310_construction_readiness_95.json`
- Evidencia auditada:
  - Documentos antigos declaram `19 files, 51 passed, 1 skipped` e cobertura perto de 90%.
  - Estado auditado apos CC-S2: `20 files, 52 passed, 2 skipped`.
  - Cobertura auditada: statements `82.22%`, branches `84.85%`, functions `80.89%`, lines `82.35%`.
- Correcao exigida:
  - Atualizar documentos de evidencia.
  - Rebaixar ou justificar `current_confidence_percent`.
  - Proibir score 100 enquanto houver gaps abertos nesta pasta.

### DBG-F02 - Readiness 100% nao e defensavel

- Severidade: HIGH.
- Arquivo:
  - `docs/03_build/0310_construction_readiness_95.json`
- Evidencia:
  - `current_confidence_percent` esta em `100`.
  - Ainda existem gaps de console, formatacao, rastreabilidade e idempotencia.
- Correcao exigida:
  - Enquanto qualquer item `P0` ou `P1` em `0903_correction_backlog.json` estiver aberto, readiness nao pode ser `100`.

### DBG-F03 - Matriz aponta para testes inexistentes

- Severidade: HIGH.
- Arquivo:
  - `docs/03_build/0304_traceability_matrix.json`
- Evidencia:
  - A matriz exige testes que nao existem:
    - `apps/web/src/features/conversations/conversations.test.tsx`
    - `apps/web/src/features/conversations/timeline.test.tsx`
    - `apps/web/src/features/approvals/approvals.test.tsx`
    - `apps/web/src/features/tasks/tasks.test.tsx`
    - `apps/web/src/features/audit/audit-view.test.tsx`
- Correcao exigida:
  - Criar os testes listados ou atualizar a matriz para apontar para testes reais equivalentes.
  - A solucao preferida e criar testes focados por feature para manter a matriz executavel.

### DBG-F04 - Console web ainda depende de IDs fixos

- Severidade: HIGH.
- Arquivo:
  - `apps/web/src/App.tsx`
- Evidencia:
  - `defaultConversationId = 'conv_demo_controlled'`
  - `defaultSessionId = 'sess_demo_controlled'`
- Correcao exigida:
  - Criar endpoint real de listagem de conversas.
  - Conectar o web console ao endpoint.
  - Selecionar a primeira conversa disponivel ou mostrar empty state real.
  - Remover dependencia de IDs hardcoded.

### DBG-F05 - Idempotencia PostgreSQL nao esta blindada no banco para canal + mensagem externa

- Severidade: HIGH.
- Arquivos:
  - `packages/persistence/migrations/0000_initial.sql`
  - `packages/persistence/src/postgres.ts`
  - `packages/persistence/src/__tests__/postgres-migration-smoke.test.ts`
  - `apps/api/src/__tests__/postgres-persistence-mode.test.ts`
- Evidencia:
  - Codigo consulta duplicidade por `conversations.channel + messages.external_message_id`.
  - Constraint atual protege apenas `UNIQUE (conversation_id, external_message_id)`.
- Correcao exigida:
  - Introduzir protecao transacional de idempotencia por `channel + externalMessageId`.
  - Testar duplicidade real em PostgreSQL efemero.

### DBG-F06 - Formatacao falha e nao participa do verify

- Severidade: MEDIUM.
- Arquivo:
  - `package.json`
- Evidencia:
  - `npm run format:check` falhou com multiplos arquivos.
  - `npm run verify` nao executa `format:check`.
- Correcao exigida:
  - Corrigir formatacao.
  - Adicionar `npm run format:check` ao `verify`.
  - Atualizar CI/readiness se necessario.

### DBG-F07 - Teste postgres sem env pode passar pulando caminho real

- Severidade: MEDIUM.
- Arquivos:
  - `packages/persistence/src/__tests__/postgres-migration-smoke.test.ts`
  - `apps/api/src/__tests__/postgres-persistence-mode.test.ts`
  - `.github/workflows/verify.yml`
- Evidencia:
  - Sem `TEST_DATABASE_URL`, parte dos testes reais e pulada.
  - CI fornece `TEST_DATABASE_URL`, mas evidencia local precisa diferenciar skip de execucao real.
- Correcao exigida:
  - Documentar explicitamente quando o teste e skip.
  - Na evidencia final, registrar comando com PostgreSQL efemero real.

### DBG-F08 - Reads operacionais sem identidade controlada

- Severidade: HIGH.
- Arquivos:
  - `apps/api/src/server.ts`
  - `apps/web/src/api/client.ts`
  - `apps/web/src/App.tsx`
- Evidencia:
  - A CC-S6 exigia identidade para decisoes de approval e transicoes de task, mas os reads de painel ainda aceitavam request sem `x-operator-id` e `x-operator-role`.
  - A SPEC exige autenticacao/autorizacao para endpoints de painel e auditoria.
- Correcao aplicada:
  - Reads de conversas, timeline, approvals, tasks e audit session agora falham fechado sem identidade operacional.
  - Client web envia identidade em todos os reads operacionais.
  - Teste negativo confirma HTTP 401 e envelope `unauthorized` para reads sem identidade.

### DBG-F09 - Resumo declarado por sessao/correlation nao estava exposto

- Severidade: MEDIUM.
- Arquivos:
  - `packages/persistence/src/schema.ts`
  - `packages/persistence/src/repositories/audit-repository.ts`
  - `apps/api/src/__tests__/audit-evidence.test.ts`
  - `packages/persistence/src/__tests__/postgres-migration-smoke.test.ts`
- Evidencia:
  - CC-S7 declarou resumo por tipo, ator, correlationId e sessao.
  - O contrato expunha apenas `byType` e `byActorType`.
- Correcao aplicada:
  - Adicionados `byCorrelationId` e `bySessionId` ao resumo.
  - Testes focados passaram em `audit-evidence.test.ts` e `postgres-migration-smoke.test.ts`.

### DBG-F10 - Payload bruto ainda e retornado na evidencia

- Severidade: HIGH.
- Status: CORRIGIDO em CC-S9.
- Arquivos:
  - `apps/api/src/server.ts`
  - `packages/persistence/src/schema.ts`
  - `packages/shared/src/audit-governance.ts`
- Evidencia:
  - `AuditEvidencePage.items[].payload` e retornado sem redacao.
  - A baseline de seguranca proibe expor segredo, token, payload clinico integral ou dado pessoal desnecessario.
- Correcao aplicada:
  - Endpoint de audit evidence agora retorna payload minimizado.
  - `governance.payload.rawPayloadReturned` permanece `false`.
  - Campos sensiveis e PII comuns sao redigidos antes da resposta.

### DBG-F11 - Cobertura de filtros do endpoint ainda e parcial

- Severidade: MEDIUM.
- Status: CORRIGIDO em CC-S9.
- Arquivo:
  - `apps/api/src/__tests__/audit-evidence.test.ts`
- Evidencia:
  - Testes atuais cobrem correlationId, invalid type e invalid pagination.
  - Faltam testes positivos dedicados para `sessionId`, `type` e `actorId` validando page e summary.
- Correcao aplicada:
  - Teste positivo combinado cobre `sessionId`, `type` e `actorId`.
  - Auditoria CC-S9 adicionou assercao explicita de consistencia entre `summary.totalEvents` e `page.pageInfo.total`.

### DBG-F12 - Indices PostgreSQL de audit evidence ainda nao cobrem todos os filtros

- Severidade: MEDIUM.
- Status: CORRIGIDO em CC-S9.
- Arquivo:
  - `packages/persistence/migrations/0000_initial.sql`
- Evidencia:
  - Existe indice para `correlation_id`, mas nao para `type`, `actor_id` ou `(payload->>'sessionId')`.
- Correcao aplicada:
  - Migration inclui `idx_audit_events_type`, `idx_audit_events_actor_id` e `idx_audit_events_payload_session_id`.
  - Smoke documental verifica a presenca dos indices.

### DBG-F13 - Cobertura web de RBAC de evidence review estava incompleta

- Severidade: MEDIUM.
- Arquivo:
  - `apps/web/src/__tests__/app.test.tsx`
- Evidencia:
  - CC-S8 declarou revisao liberada para `Supervisor` ou `Admin`.
  - O teste web cobria `Supervisor` liberado e `Operator` bloqueado, mas nao exercitava explicitamente `Admin` liberado nem `Approver` bloqueado.
- Correcao aplicada:
  - Teste parametrizado cobre `Supervisor` e `Admin` liberados.
  - Teste parametrizado cobre `Operator` e `Approver` bloqueados.

### DBG-F14 - Serializacao de coverage reconhecia apenas `--coverage` literal

- Severidade: LOW.
- Arquivo:
  - `vitest.config.ts`
- Evidencia:
  - A protecao contra corrida do V8 usava `process.argv.includes('--coverage')`.
  - Invocacoes equivalentes como `--coverage=true` nao ativariam a serializacao.
- Correcao aplicada:
  - A deteccao agora aceita `--coverage` e argumentos iniciados por `--coverage=`.

### DBG-F15 - Console mostra apenas a primeira pagina de audit evidence

- Severidade: MEDIUM.
- Status: CORRIGIDO em CC-S10.
- Arquivos:
  - `apps/web/src/api/client.ts`
  - `apps/web/src/features/audit/index.tsx`
  - `apps/web/src/App.tsx`
- Evidencia:
  - CC-S8 chama audit evidence com `limit=10&offset=0`.
  - A UI nao exibe `pageInfo` nem controles de navegacao para `hasNextPage`.
- Correcao aplicada:
  - Console exibe faixa de pagina e navega por `offset`, `limit` e `hasNextPage`.
  - Teste web cobre `hasNextPage: true` e ausencia de despacho externo.

### DBG-F16 - Filtro positivo nao comprovava consistencia de total no caso combinado

- Severidade: MEDIUM.
- Status: CORRIGIDO em auditoria CC-S9.
- Arquivo:
  - `apps/api/src/__tests__/audit-evidence.test.ts`
- Evidencia:
  - O teste combinado por `sessionId`, `type` e `actorId` nao verificava explicitamente igualdade entre `summary.totalEvents` e `page.pageInfo.total`.
- Correcao aplicada:
  - Adicionadas assercoes de total para o filtro combinado.

### DBG-F17 - Sanitizacao precisava cobrir identificadores pessoais comuns

- Severidade: HIGH.
- Status: CORRIGIDO em auditoria CC-S9.
- Arquivos:
  - `packages/shared/src/audit-governance.ts`
  - `packages/shared/src/__tests__/shared-contracts.test.ts`
- Evidencia:
  - CC-S9 ja redigia tokens, secrets, body, phone, senderRef, externalMessageId e campos clinicos.
  - Identificadores pessoais comuns como email, CPF/documento, nome de paciente e endereco ainda precisavam de cobertura explicita.
- Correcao aplicada:
  - Sanitizer passou a redigir `email`, `cpf`, `cnpj`, `document`, `patientName`, `address`, datas de nascimento e identificadores equivalentes.
  - Teste compartilhado cobre exemplos ficticios desses campos.

### DBG-F18 - Pedido de export controlado nao exigia identidade no endpoint de approvals

- Severidade: HIGH.
- Status: CORRIGIDO em auditoria CC-S10.
- Arquivos:
  - `apps/api/src/server.ts`
  - `apps/api/src/__tests__/operator-identity-rbac.test.ts`
- Evidencia:
  - O console enviava identidade operacional ao criar `audit_evidence_export_review`.
  - O endpoint `POST /v1/approvals` nao exigia identidade para esse proposedAction e registrava a auditoria como `System/api`.
- Correcao aplicada:
  - `audit_evidence_export_review` agora exige identidade com `audit:view_full`.
  - Sem identidade retorna `401`; role sem permissao retorna `403`.
  - A auditoria de criacao registra `actorId`/`actorType` do operador humano.

### DBG-F19 - Evidencia de gates CC-S10 nao e reproduzivel no estado atual

- Severidade: HIGH.
- Status: PENDENTE para CC-S11.
- Arquivos:
  - `docs/03_build/0320_controlled_construction_sprint_10.md`
  - `docs/03_build/0310_construction_readiness_95.json`
  - `docs/09_debug_corrections/0903_correction_backlog.json`
  - `package.json`
  - `packages/persistence/migrations/0000_initial.sql`
  - `docs/03_build/0304_traceability_matrix.json`
- Evidencia:
  - Reexecucao auditada de `npm run verify` falhou com 5 testes falhando.
  - `npm run readiness` e `npm run test:postgres` falharam no smoke de migration/idempotencia.
  - `docs-readiness` ainda acusa traceability para teste inexistente e readiness 100 com P0/P1 abertos.
  - `workspace-scripts` ainda exige `npm run format:check` dentro de `verify`.
- Correcao exigida:
  - Executar CC-S11 para reconciliar evidence/readiness, traceability executavel, idempotencia PostgreSQL, format gate e validacao final.

## Gates auditados como PASS na ultima verificacao

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run test:e2e`
- `npm run test:coverage`
- `npm run audit:security`
- `npm run readiness`
- `npm run verify`
- `TEST_DATABASE_URL=... npm run test:postgres` contra Docker `postgres:16-alpine`
- HTTP smoke `/health` + webhook
- `npm run verify` apos DBG-F08: PASS com 25 files, 71 passed, 2 skipped; coverage statements 83.90%, branches 83.04%, functions 82.84%, lines 84.97%
- `npx vitest run apps/api/src/__tests__/audit-evidence.test.ts packages/persistence/src/__tests__/postgres-migration-smoke.test.ts` apos DBG-F09: PASS com 2 files, 5 passed, 1 skip condicional
- `npx vitest run apps/web/src/__tests__/app.test.tsx` apos DBG-F13/DBG-F14: PASS com 1 file, 11 passed
- `npm run verify` apos DBG-F13/DBG-F14: PASS com 25 files, 77 passed, 2 skipped; coverage statements 84.94%, branches 83.66%, functions 83.65%, lines 86.01%; audit 0 vulnerabilities
- `npm run test:e2e`, `npm run readiness` e `npm run test:postgres` apos DBG-F13/DBG-F14: PASS; Postgres local com 3 passed e 2 skips condicionais sem `TEST_DATABASE_URL`
- `npx vitest run apps/api/src/__tests__/audit-evidence.test.ts packages/shared/src/__tests__/shared-contracts.test.ts packages/persistence/src/__tests__/postgres-migration-smoke.test.ts` apos DBG-F16/DBG-F17: PASS com 3 files, 15 passed, 1 skip condicional
- `npx vitest run apps/api/src/__tests__/operator-identity-rbac.test.ts apps/web/src/__tests__/app.test.tsx` apos DBG-F18: PASS com 2 files, 18 passed
- `npm run verify` apos DBG-F18: FAIL com 5 testes falhando por debitos historicos de `DBG-COR-01`, `DBG-COR-02`, `DBG-COR-04`, `DBG-COR-05` e `DBG-COR-06`

## Condicao para fechar a pasta

Todos os itens `P0` e `P1` de `0903_correction_backlog.json` devem estar `completed`, com evidencia em `0904_validation_matrix.json`, `docs/04_audit/0491_runtime_evidence.md`, `docs/03_build/0310_construction_readiness_95.json` e `docs/20_master_execution_log.md`.
