# Evidência — PLAT-S27 controlled pagination offset boundary

## Identificação

- task: `PLAT-S27-001_CONTROLLED_PAGINATION_OFFSET_BOUNDARY`
- sprint: `PLAT-S27_CONTROLLED_PAGINATION_OFFSET_BOUNDARY`
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- checkout: `f9e0096` + alterações controladas do checkout, não publicado
- fechamento: `2026-08-25T18:36:17-03:00`
- dados: somente fixtures e valores fictícios
- resultado: `COMPLETED_CONTROLLED`

## Descoberta e contrato

`parsePagination` aceitava `offset=1e100` e
`offset=9007199254740992` como inteiros e o valor chegava ao `OFFSET`
parametrizado do PostgreSQL. O lane foi limitado a conversas e audit evidence:
offset ausente vira 0; somente inteiros seguros de 0 a 10.000 são aceitos;
valores negativos, fracionários, não seguros ou acima do teto falham com
`invalid_pagination`/400 antes de qualquer repositório.

Limit, cursor, auth, tenant, identidade, Secretary, persistência estrutural,
provider/canal, RAG, dado real, deploy e side effect permaneceram fora do
escopo.

## TDD observado

- RED `2026-08-25T18:22:35-03:00`: a suíte
  `apps/api/src/pagination-boundary.test.ts` falhou antes do BUILD porque
  `pagination-boundary.ts` não existia; nenhum teste foi considerado PASS.
- GREEN `2026-08-25T18:24:45-03:00`: o classificador foi implementado e a
  suíte focada passou 1 arquivo/5 testes.
- Regressão próxima `2026-08-25T18:27:07-03:00`: boundary, conversation list e
  audit evidence/route passaram 4 arquivos/12 testes.
- Crítica lead-only: a inspeção confirmou que o write set S27 se limita ao
  classificador, à integração de `parsePagination`, às mensagens bounded e aos
  testes; revisão física independente não estava disponível e não é declarada.

## Implementação

- `apps/api/src/pagination-boundary.ts` declara o teto seguro inclusivo e
  classifica `unknown` sem refletir o valor recebido.
- `apps/api/src/server.ts` valida o offset bruto antes de converter e chamar
  `listPage`/`listEvidence`; a mensagem externa permanece constante e sem
  payload.
- `apps/api/src/pagination-boundary.test.ts` cobre limites inclusivos, valores
  negativos/fracionários/unsafe/acima do teto, envelopes 400, ausência de
  chamadas ao repositório em entradas inválidas e preservação de `limit=1`.

## Gates

- `npm run verify`: PASS — 105 arquivos; 376 testes pass; 18 skips; 394 total.
- Coverage: 85,43% statements; 80,80% branches; 85,25% functions; 86,44%
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
