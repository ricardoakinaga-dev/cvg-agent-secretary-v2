# SPEC AUD20-17 — extração do contexto de request da API

## Estado

- task: `AUD20-17`
- fase: `SPEC`
- status: `WAITING_HUMAN_APPROVAL`
- execução proposta: `CONTROLLED_LOCAL`
- staging/produção: `NO_GO`

## Decisão técnica

Selecionar uma extração de módulo dentro do monólito. Criar
`apps/api/src/server/request-context.ts` como único owner de:

- parsing do canal inbound e resolução do tenant inbound;
- resolução obrigatória/opcional de tenant de data plane;
- identidade efetiva trusted/simulation e memoização por request;
- checks de uma ou várias permissões e platform scope;
- contexto de auditoria de journeys.

`server.ts` permanece composition root e consumidor. O módulo extraído pode
depender de `@cvg/shared`, `@cvg/platform` e tipos locais estáveis; não pode
importar `server.ts`, Fastify, stores, banco ou adapters externos. A constante
sintética controlada passa explicitamente por uma factory/dependência quando
necessário, evitando estado implícito circular.

## Invariantes e compatibilidade

1. Default deny em trusted mode, inclusive ausência de resolver ou tenant.
2. Identidade é autoridade; header não amplia tenant.
3. Memoização usa `WeakMap` por objeto de headers e não atravessa requests.
4. `DomainError.code`, mensagens e status produzidos pelo boundary permanecem.
5. Nenhum export público atual é removido e nenhuma rota muda.
6. Não há persistência, transação, retry, side effect ou migration na fatia.

## BUILD incremental

1. RED: adicionar contract tests diretos do novo boundary e teste arquitetural
   que exige owner único/direção de dependência.
2. Extrair tipos e helpers sem modificar callers.
3. Migrar `buildServer` e rotas para imports do módulo; remover duplicatas.
4. Medir linhas: `server.ts <= 4708`, novo módulo `<=450`, soma sem crescimento
   estrutural injustificado e zero ciclo.
5. Rodar focused de identidade/tenant/server/arquitetura, depois regressão,
   cobertura e gates estáticos.
6. Submeter bytes finais a crítica independente e registrar inventário
   priorizado das próximas fatias (`orchestration`, `postgres`, `runtime`, web).

## Negativos obrigatórios

- trusted sem resolver; resolver sem tenant; role sem permission;
- header tenant diferente da identidade; platform scope inválido;
- mesmo token em request diferente deve atravessar novamente o replay guard;
- import reverso/ciclo, helper duplicado ou cap de linha excedido;
- alteração de status/mensagem/shape nos endpoints cobertos.

## Rollback

Reverter somente imports e mover os helpers de volta para `server.ts`. Como não
há schema, dado ou efeito, não existe rollback operacional. Se qualquer
contrato divergir, não avançar a próxima fatia.

## Critérios C01–C07

- C01: owner único e boundary acíclico;
- C02: redução mensurável dos caps;
- C03: identidade/tenant/default deny invariantes;
- C04: compatibilidade HTTP e exports;
- C05: negativos e arquitetura falham fechado;
- C06: regressão/cobertura sem redução;
- C07: crítica independente aprova os bytes finais.

## Gate

`TECHNICALLY_SPECIFIED`: desenho mínimo suficiente, contratos, negativos,
medição e rollback definidos. O BUILD local ainda requer confirmação humana
explícita; não autoriza commit, push, deploy, staging ou produção.

## Adendo proposto — IMP50-40 / primeira fatia

- revisão: `DRAFT_PENDING_HUMAN_REVIEW` em `2026-09-23`; a reativação para
  trabalho local não substitui a revisão desta delimitação.
- escopo: apenas mover o boundary de contexto de request de
  `apps/api/src/server.ts` para `apps/api/src/server/request-context.ts`. Não
  extrair orchestration, persistence, runtime ou web nesta fatia; IMP50-40
  continua parcial.
- donos a mover como unidade: `resolveInboundTenant`,
  `parseInboundChannel`, `resolveDataPlaneTenant`, `resolveOptionalRequestTenant`,
  `resolveOperatorIdentity`, `createEffectiveOperatorIdentityResolver`,
  `requireOperatorIdentity`, `requireAnyOperatorPermission`,
  `requirePlatformScope` e `journeyAuditContext`, junto dos tipos e dependências
  que esses helpers usam. A nova unidade não importa `server.ts`, Fastify,
  store, banco ou adapter externo.
- dependências de request: `NODE_ENV` e `CONTROLLED_TENANT_ID` entram por
  configuração explícita do composition root; o módulo não lê `process.env` nem
  importa estado global. A configuração deve conservar a distinção trusted /
  simulation e o default deny fora de test mode.
- arquivos permitidos: o módulo novo, `apps/api/src/server.ts`,
  `apps/api/src/__tests__/request-context.test.ts`, ajustes nos testes de
  boundary listados abaixo e a asserção arquitetural correspondente em
  `tests/architecture.test.js`. Mudança em outra rota, contrato ou pacote
  exige voltar à revisão.
- matriz de regressão: identity/memoization —
  `identity-trusted-resolver.test.ts`, `operator-replay-guard.test.ts` e
  `identity-composition-wiring.test.ts`; tenant/default deny/production —
  `production-boundary.test.ts`, `build-server-from-env-boundary.test.ts` e
  `postgres-persistence-mode.test.ts`; inbound tenant/channel/security —
  `tenant-inbound-isolation.test.ts`, `inbound-runtime-edges.test.ts` e
  `webhook-security.test.ts`; scope/permission/HTTP —
  `server-boundary-envelope.test.ts` e `journey-routes-coverage.test.ts`;
  direção/ciclo/owner único — `tests/architecture.test.js`.
- inbound-channel: o contract test cobre canal válido/inválido e preserva o
  erro/status da rota `POST /v1/webhooks/channels/:channel/messages`.
- compatibilidade por grupo de chamadas: resolução de tenant inbound em
  `POST /v1/webhooks/channels/:channel/messages`; identidade, tenant data-plane,
  permissionamento e platform scope em todas as rotas existentes de operator,
  journeys, orchestration e platform; contexto de auditoria nos handlers de
  journeys. O conjunto de métodos, paths, status, schemas, mensagens de erro,
  headers e ordem de autorização deve permanecer idêntico ao baseline.
- negativos: trusted sem resolver/tenant; header tenant divergente; role sem
  permissão; platform scope inválido; memoização não atravessa objetos de
  headers; modo e tenant controlados injetados sem leitura de `process.env` no
  módulo; rejeição de import reverso/ciclo e helper duplicado; cada cenário deve
  falhar com o mesmo `DomainError.code`, mensagem e status do baseline.
- pronto para esta fatia: os testes diretos cobrem cada helper e dependência
  injetada; a matriz acima passa; `server.ts <= 4708`, módulo novo `<= 450`,
  zero ciclos e redução mensurável; nenhum endpoint ou export público muda;
  regressão completa, typecheck, lint, coverage, format, `docs:check`,
  `git diff --check` e crítica independente fresca passam.
- rollback: reverter apenas imports e recolocar os helpers em `server.ts`; os
  testes de contrato ficam como proteção da fronteira.

Este adendo apenas torna o slice revisável. O status continua
`TECHNICALLY_SPECIFIED`; não tratar como `SPEC_APPROVED_CONTROLLED_BUILD` até a
revisão ser registrada em `0190_spec_validation.md`.
