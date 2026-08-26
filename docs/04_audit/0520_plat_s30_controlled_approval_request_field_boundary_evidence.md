# Evidência de auditoria — PLAT-S30 Approval Request Field Boundary

- task: `PLAT-S30-001_CONTROLLED_APPROVAL_REQUEST_FIELD_BOUNDARY`
- sprint: `PLAT-S30_CONTROLLED_APPROVAL_REQUEST_FIELD_BOUNDARY`
- fechamento: `2026-08-25T19:40:47-03:00`
- modo: `DISCOVERY -> PRD -> SPEC -> BUILD -> AUDIT`
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- base: checkout local controlado; sem commit, push, deploy ou publicação

## Lacuna reproduzida

`RequestHumanApprovalSchema` aceitava campos livres sem máximos. Com sessão e
tenant fictícios em memória, `POST /v1/approvals` respondeu 200 e persistiu
`summary` com 5.000 caracteres em um approval pending controlado.

## TDD observado

- RED — `2026-08-25T19:30:53-03:00`: a suíte
  `apps/api/src/approval-request-field-boundary.test.ts` apresentou 5 testes,
  1 PASS e 4 FAIL antes da implementação; `summary` e `proposedAction` longos
  chegavam a `approvals.save` e `sessionId` excedente falhava tardiamente como
  `invalid_action`.
- GREEN — `2026-08-25T19:31:49-03:00`: `RequestHumanApprovalSchema` passou a
  limitar `sessionId` a 160, `proposedAction` a 200 e `summary` a 4.000
  caracteres; focused passou 1 arquivo/5 testes.
- regressão próxima — `2026-08-25T19:32:39-03:00`: 9 arquivos/30 testes PASS,
  cobrindo approvals, tenant/RBAC, Secretary, Agent Core e policy.

## Implementação auditada

- `packages/shared/src/schemas/application.ts`: máximos aplicados no schema
  compartilhado, antes de `approvals.save` na rota de approval.
- `apps/api/src/approval-request-field-boundary.test.ts`: casos por campo acima
  do limite, ausência de chamada a `approvals.save`, ausência de echo e valores
  exatamente no limite com status `pending`.
- A decisão de approval, handoff, auth, tenant binding, persistência estrutural,
  Secretary, provider, canal, RAG e side effects não foram alterados.

## Gates executáveis

- `npm run verify`: PASS
  - 108 arquivos; 394 testes pass; 18 skips condicionais
  - coverage: 85,45% statements; 80,83% branches; 85,26% functions;
    86,45% lines
  - build, typecheck, lint, format e `npm audit --audit-level=high`: PASS;
    0 vulnerabilidades
- readiness: 4/4 PASS
- E2E: 3/3 PASS
- PostgreSQL controlado: 51 pass/18 skips
- `git diff --check`: PASS

## Auditoria de segurança e limites

- A validação ocorre antes de `approvals.save`; entradas excedentes retornam
  `validation_failed`/400 sem executar o repositório.
- O envelope não reflete o conteúdo excedente.
- O teste de criação confirma que valores nos máximos continuam válidos e que
  o approval permanece `pending`, sem decisão automática.
- A revisão foi lead-only porque não há runtime de agente filho independente
  disponível nesta sessão; não foi alegada revisão independente.
- Todos os dados usados são fixtures fictícias. Produção real permanece
  `NO-GO`/`WAITING_HUMAN_APPROVAL`; nenhum provider, canal, RAG, dado real,
  deploy ou ação sensível foi ativado.

## Veredito

`PLAT-S30-001_CONTROLLED_APPROVAL_REQUEST_FIELD_BOUNDARY` =
`COMPLETED_CONTROLLED`. CTRL-117..119 = `PASS controlled`. O release controlado
permanece `CONTROLLED_MVP_READY`; o próximo passo seguro é novo SPEC.
