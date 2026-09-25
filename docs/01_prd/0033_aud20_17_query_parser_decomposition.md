# PRD proposta AUD20-17-FU1 — extração de parsers de query

## Estado e relação com IMP50-40

- task-mãe: `AUD20-17`, `IN_PROGRESS`;
- candidato: segunda fatia proposta de `IMP50-40`, ainda não admitida;
- Discovery: [0023](../00_discovery/0023_aud20_17_imp50_40_query_parsers.md);
- SPEC: [proposta separada](../02_spec/aud20_17_imp50_40_query_parsers_20260923.md);
- BUILD: não autorizado por este PRD.

O BUILD v1 aprovado de `request-context` continua não aceito por C02. Este PRD
não reclassifica seus critérios, não muda seu hash-bound scope e não declara
aceitação retroativa. A segunda fatia é uma alternativa prospectiva para
preservar C02 `server.ts <=4708` sem misturar parsers de query ao contexto de
identidade/tenant.

## Objetivo

Dar ownership interno único aos parsers de query já usados pelas rotas de
conversas, orquestração, evidência de auditoria e traces, reduzindo
`server.ts` o suficiente para cumprir o cap C02 e mantendo os contratos HTTP
atuais.

## Dentro do escopo proposto

- `parsePagination`;
- `parseTraceLimit`;
- `OrchestrationGoalQuerySchema` e `parseOrchestrationGoalQuery`;
- `auditEventTypes`, `parseAuditEvidenceQuery` e
  `parseOptionalAuditFilter`;
- novo módulo interno `apps/api/src/server/request-query.ts` e testes diretos;
- consumidores limitados a trocar referências locais por imports do módulo;
- assertions de ownership, direção, ausência de ciclo e caps em
  `tests/architecture.test.js`.

## Fora do escopo

Alterar rotas, contratos públicos, schemas de API, status/mensagens de erro,
autorização, persistência, busca de auditoria, database/runtime wiring,
orquestração, web ou os parsers de contexto de `request-context.ts`. Nenhuma
migration, chamada externa ou dado real. O resultado da primeira fatia não será
editado nem revertido.

## Requisitos funcionais

- FR01: um único módulo passa a declarar os sete parsers/schema/lista acima; o
  `server.ts` deixa de declará-los e somente os consome.
- FR02: defaults, coerção e strictness atuais de limit/offset/status/event
  type/filtros ficam idênticos, inclusive a rejeição de parâmetros repetidos.
- FR03: `DomainError.code`, mensagem, status e envelope dos handlers cobertos
  permanecem idênticos.
- FR04: o módulo não importa `server.ts`, Fastify, `pg`, stores, adapters nem
  ambiente global; nenhum ciclo é introduzido.
- FR05: o `server.ts` final permanece `<=4708`; `request-context.ts` permanece
  `<=450`; `request-query.ts` permanece `<=160`; a soma dos três módulos fica
  `<=5050` linhas.
- FR06: parsers passam a ter testes diretos e a matriz de rota existente segue
  passando; nenhum parser duplicado fica no servidor.

## Aceite proposto

- AC01: valores válidos e defaults de paginação, traces, goals e filtros de
  auditoria retornam os mesmos objetos que antes.
- AC02: coerção e limites inválidos, query repetida, os seis tipos de evento
  aceitos, tipo inválido, filtros inválidos e `GoalStatus` inválido preservam
  resultado/erro/código/mensagem. `parseTraceLimit` e
  `parseOrchestrationGoalQuery` seguem estritos; `parsePagination` e
  `parseAuditEvidenceQuery` continuam ignorando chaves desconhecidas.
- AC03: testes de rota existentes preservam `DomainError.code`, mensagem,
  status HTTP e envelope; testes diretos cobrem cada branch do módulo novo.
- AC04: arquitetura comprova owner único, imports permitidos, zero ciclo,
  `server.ts <=4708`, `request-context.ts <=450`,
  `request-query.ts <=160` e soma `<=5050`.
- AC05: `npm test`, coverage, typecheck, lint, format, `docs:check`,
  `git diff --check` e crítica independente fresca passam no candidato local.
- AC06: rollback remove somente a nova extração/imports e restaura os parsers
  anteriores em `server.ts`; a primeira fatia permanece byte-for-byte fora do
  rollback.

## Gate

`PRODUCT_DEFINED` é apenas a proposta desta revisão. A Discovery e o SPEC
precisam de revisão e registro próprios. Nenhum BUILD começa sem SPEC aprovado,
admissão exata em 0337 e autorização humana hash-bound. Commit, push, deploy,
staging e produção permanecem `NO_GO`.
