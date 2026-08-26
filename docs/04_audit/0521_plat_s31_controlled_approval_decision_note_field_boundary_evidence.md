# Evidência de auditoria — PLAT-S31 Approval Decision Note Field Boundary

- task: `PLAT-S31-001_CONTROLLED_APPROVAL_DECISION_NOTE_FIELD_BOUNDARY`
- sprint: `PLAT-S31_CONTROLLED_APPROVAL_DECISION_NOTE_FIELD_BOUNDARY`
- fechamento: `2026-08-25T20:06:15-03:00`
- modo: `DISCOVERY -> PRD -> SPEC -> BUILD -> AUDIT`
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- base: checkout local controlado; sem commit, push, deploy ou publicação

## Lacuna reproduzida

`ResolveApprovalSchema.note` era opcional e não tinha máximo. Com approval,
sessão e tenant fictícios em memória, uma requisição para
`POST /v1/approvals/:approvalRequestId/decision` com `note` de 5.000 caracteres
respondeu 200 e persistiu a decisão como `approved`. A nota não foi ecoada nem
persistida.

## TDD observado

- registro — `2026-08-25T19:51:14-03:00`: o lane foi registrado antes do BUILD
  com gate `SPEC_APPROVED_CONTROLLED_BUILD` e limite proposto de 4.000
  caracteres para `note`.
- RED — `2026-08-25T19:55:57-03:00`: a suíte
  `apps/api/src/approval-decision-note-field-boundary.test.ts` apresentou 3
  testes, 1 PASS e 2 FAIL; `note` de 4.001 caracteres atravessava o schema,
  alcançava `approvals.save` e a rota retornava 200. O caso no limite já era
  válido.
- GREEN — `2026-08-25T19:56:51-03:00`: `ResolveApprovalSchema.note` passou a
  usar `.max(4000).optional()`; focused passou 1 arquivo/3 testes.
- regressão próxima — `2026-08-25T19:57:31-03:00`: 9 arquivos/31 testes PASS,
  cobrindo S31/S30, approval actions, RBAC, tenant isolation, health,
  observability, audit evidence e `agent-core`.

## Implementação auditada

- `packages/shared/src/schemas/application.ts`: máximo de 4.000 caracteres
  aplicado somente ao campo opcional `note` do schema compartilhado.
- `apps/api/src/approval-decision-note-field-boundary.test.ts`: teste direto
  do schema; teste HTTP com spy em `approvals.save`, ausência de echo e estado
  `pending` preservado quando a nota excede o limite; e teste de nota no limite
  mantendo o fluxo de decisão `approved`.
- `packages/agent-core/src/commands/resolve-approval.ts` e a rota de decisão
  não foram alterados. Auth, tenant binding, identidade do operador, decisão,
  handoff, persistência estrutural, Secretary, provider, canal, RAG e side
  effects permanecem inalterados.

## Gates executáveis

- `npm run verify`: PASS
  - 109 arquivos; 397 testes pass; 18 skips condicionais
  - coverage: 85,45% statements; 80,83% branches; 85,26% functions;
    86,45% lines
  - build, typecheck, lint, format e `npm audit --audit-level=high`: PASS;
    0 vulnerabilidades
- readiness: 4/4 PASS
- E2E Playwright: 3/3 PASS
- PostgreSQL controlado: 5 arquivos PASS/2 skips; 51 testes pass/18 skips
- `git diff --check`: PASS
- `docs/03_build/tracking/build_tracking.json`: JSON válido

## Auditoria de segurança e limites

- A validação ocorre dentro de `resolveApproval` antes de
  `approvals.save`; nota excedente retorna `validation_failed`/400 e não muda
  o approval pending.
- O envelope de erro não reflete o sentinel excedente.
- Nota exatamente no limite mantém o fluxo existente de decisão `approved`;
  nenhuma semântica nova de persistência ou auditoria da nota foi introduzida.
- A revisão foi lead-only porque não há runtime de agente filho independente
  disponível nesta sessão; não foi alegada revisão independente.
- Todos os dados usados são fixtures fictícias. Produção real permanece
  `NO-GO`/`WAITING_HUMAN_APPROVAL`; nenhum provider, canal, RAG, dado real,
  deploy ou ação sensível foi ativado.

## Veredito

`PLAT-S31-001_CONTROLLED_APPROVAL_DECISION_NOTE_FIELD_BOUNDARY` =
`COMPLETED_CONTROLLED`. CTRL-120..122 = `PASS controlled`. O release controlado
permanece `CONTROLLED_MVP_READY`; nenhum status de produção foi alterado.
