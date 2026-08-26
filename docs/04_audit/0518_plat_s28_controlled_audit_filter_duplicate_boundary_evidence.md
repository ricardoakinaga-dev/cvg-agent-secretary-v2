# Evidência — PLAT-S28 controlled audit filter duplicate boundary

## Identificação

- task: `PLAT-S28-001_CONTROLLED_AUDIT_FILTER_DUPLICATE_BOUNDARY`
- sprint: `PLAT-S28_CONTROLLED_AUDIT_FILTER_DUPLICATE_BOUNDARY`
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- checkout: `f9e0096` + alterações controladas do checkout, não publicado
- fechamento: `2026-08-25T18:57:03-03:00`
- dados: somente fixtures e valores fictícios
- resultado: `COMPLETED_CONTROLLED`

## Descoberta e contrato

`parseOptionalAuditFilter` aceitava arrays de query e escolhia silenciosamente o
primeiro valor. A reprodução `sessionId=a&sessionId=b` retornou 200 e passou
somente `a` ao repositório. O lane foi limitado aos filtros `sessionId`,
`correlationId`, `actorId` e `type` da consulta de audit evidence.

Filtros repetidos agora falham com `validation_failed`/400 antes de
`summarizeEvidence` e `listEvidence`; filtros únicos, paginação, auth, tenant,
identidade, Secretary, persistência estrutural, provider/canal, RAG, dado real,
deploy e side effect permanecem fora do escopo.

## TDD observado

- RED `2026-08-25T18:47:07-03:00`: a suíte
  `apps/api/src/audit-filter-duplicate-boundary.test.ts` falhou antes do BUILD
  porque `audit-filter-duplicate-boundary.ts` não existia; nenhum teste foi
  considerado PASS.
- GREEN `2026-08-25T18:48:48-03:00`: o classificador foi implementado e a
  suíte focada passou 1 arquivo/6 testes.
- Regressão próxima `2026-08-25T18:49:25-03:00`: S28, S27, audit-evidence e
  audit-route passaram 4 arquivos/16 testes.
- Crítica lead-only: a inspeção confirmou que o write set S28 se limita ao
  classificador, à função de parsing e aos testes; revisão física independente
  não estava disponível e não é declarada.

## Implementação

- `apps/api/src/audit-filter-duplicate-boundary.ts` classifica arrays como
  inválidos com mensagem constante.
- `apps/api/src/server.ts` rejeita valores repetidos antes de construir filtros
  ou chamar os dois repositórios; o primeiro valor não é mais escolhido.
- `apps/api/src/audit-filter-duplicate-boundary.test.ts` cobre os quatro filtros,
  envelope 400, ausência de chamadas aos repositórios e regressão de filtro
  único com `limit=1&offset=0`.

## Gates

- `npm run verify`: PASS — 106 arquivos; 382 testes pass; 18 skips; 400 total.
- Coverage: 85,45% statements; 80,83% branches; 85,26% functions; 86,45%
  lines.
- `npm run readiness`: PASS — 1 arquivo/4 testes.
- `npm run test:e2e`: PASS — 3/3 fluxos Playwright.
- `npm run test:postgres`: PASS — 5 arquivos; 51 testes pass; 18 skips em 7
  arquivos selecionados.
- `npm audit --audit-level=high`: PASS — 0 vulnerabilidades.
- `npm run format:check` e `git diff --check`: PASS.

## Limite de release

O fechamento é somente `CONTROLLED_MVP_READY`. Não houve deploy, rollout,
provider, canal, RAG, dado real, agenda, confirmação/cancelamento/reagendamento,
ação clínica/financeira/prontuário ou outro side effect. Produção real permanece
`NO-GO`/`WAITING_HUMAN_APPROVAL`.
