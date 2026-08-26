# Evidência de auditoria — PLAT-S29 Internal Task Field Boundary

- task: `PLAT-S29-001_CONTROLLED_INTERNAL_TASK_FIELD_BOUNDARY`
- sprint: `PLAT-S29_CONTROLLED_INTERNAL_TASK_FIELD_BOUNDARY`
- fechamento: `2026-08-25T19:21:22-03:00`
- modo: `DISCOVERY -> PRD -> SPEC -> BUILD -> AUDIT`
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- base: checkout local controlado; sem commit, push, deploy ou publicação

## Lacuna reproduzida

`CreateInternalTaskSchema` aceitava campos livres sem máximos. Com uma sessão e
um tenant fictícios em memória, `POST /v1/tasks` respondeu 200 e persistiu
`title`, `description`, `source` e `idempotencyKey` com 5.000 caracteres.

## TDD observado

- RED — `2026-08-25T19:09:13-03:00`: a suíte
  `apps/api/src/internal-task-field-boundary.test.ts` apresentou 7 testes,
  1 PASS e 6 FAIL antes da implementação; os valores longos chegavam à rota e
  `sessionId` excedente falhava tardiamente como `invalid_action`.
- GREEN — `2026-08-25T19:10:24-03:00`: `CreateInternalTaskSchema` passou a
  limitar `sessionId` a 160, `title` a 200, `description` a 4.000, `source` a
  120 e `idempotencyKey` a 200 caracteres, preservando o mínimo 8 da chave;
  focused passou 1 arquivo/7 testes.
- regressão próxima — `2026-08-25T19:12:55-03:00`: 5 arquivos/25 testes PASS,
  cobrindo API, schema compartilhado, task lifecycle e Agent Core.

## Implementação auditada

- `packages/shared/src/schemas/application.ts`: máximos aplicados no schema
  compartilhado, antes da chamada ao repositório em
  `packages/agent-core/src/commands/create-internal-task.ts`.
- `apps/api/src/internal-task-field-boundary.test.ts`: casos por campo acima do
  limite, ausência de chamada a `tasks.create`, ausência de echo e valores
  exatamente no limite.
- Não houve alteração em auth, tenant binding, identidade, auditoria,
  persistência estrutural, Secretary, provider, canal, RAG ou side effect.

## Gates executáveis

- `npm run verify`: PASS
  - 107 arquivos; 389 testes pass; 18 skips condicionais
  - coverage: 85,45% statements; 80,83% branches; 85,26% functions;
    86,45% lines
  - build, typecheck, lint, format e `npm audit --audit-level=high`: PASS;
    0 vulnerabilidades
- readiness: 4/4 PASS
- E2E: 3/3 PASS
- PostgreSQL controlado: 51 pass/18 skips
- `git diff --check`: PASS

## Auditoria de segurança e limites

- A validação ocorre antes de `tasks.create`; entradas excedentes retornam
  `validation_failed`/400 sem executar o repositório.
- O envelope não reflete o conteúdo excedente.
- O teste de criação confirma que valores nos máximos continuam válidos.
- A revisão foi lead-only porque não há runtime de agente filho independente
  disponível nesta sessão; não foi alegada revisão independente.
- Todos os dados usados são fixtures fictícias. Produção real permanece
  `NO-GO`/`WAITING_HUMAN_APPROVAL`; nenhum provider, canal, RAG, dado real,
  deploy ou ação sensível foi ativado.

## Veredito

`PLAT-S29-001_CONTROLLED_INTERNAL_TASK_FIELD_BOUNDARY` =
`COMPLETED_CONTROLLED`. CTRL-114..116 = `PASS controlled`. O release controlado
permanece `CONTROLLED_MVP_READY`; o próximo passo seguro é novo SPEC.
