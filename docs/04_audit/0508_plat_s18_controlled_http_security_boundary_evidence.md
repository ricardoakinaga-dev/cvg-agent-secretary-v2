# Evidência — PLAT-S18 Controlled HTTP Security Boundary

## Identificação

- task: `PLAT-S18-001_CONTROLLED_HTTP_SECURITY_BOUNDARY`
- sprint: `PLAT-S18_CONTROLLED_HTTP_SECURITY_BOUNDARY`
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- fechamento controlado: `2026-08-25T14:31:48-03:00`
- pipeline: `DISCOVERY -> PRD -> SPEC -> BUILD -> AUDIT`
- dados: somente fixtures fictícias; nenhum deploy, provider, canal, RAG,
  dado real ou side effect
- resultado: `COMPLETED_CONTROLLED`

## Lacuna e escopo executado

O API possuía headers defensivos, mas não tinha enforcement executável de
Origin/CORS/preflight nem de transporte HTTPS confiando somente em saltos de
proxy explicitamente configurados. O lane implementou apenas essa fronteira:

- normalização exact-match de origins `http`/`https`, sem wildcard, `null`,
  path, query, fragmento ou credencial;
- preflight `OPTIONS` fail-closed com methods `GET`, `POST`, `PATCH` e
  `OPTIONS`, headers allowlisted, `Vary: Origin`, max-age bounded e sem
  `Access-Control-Allow-Credentials`;
- ausência de `Origin` preservada para chamadas server-to-server; origin
  inválida ou desconhecida retorna envelope `403` antes do handler;
- enforcement HTTPS `426` com `trustedProxyHops` explícito e bounded, sem
  confiar em `X-Forwarded-Proto` quando o proxy não foi configurado;
- CSP, `nosniff`, `DENY`, `no-referrer` e políticas cross-domain fixas; HSTS
  somente em request HTTPS;
- bootstrap de produção exigindo `API_ALLOWED_ORIGINS` não vazio e
  `API_REQUIRE_HTTPS=true`.

Durante a auditoria do diff foi corrigida uma incompatibilidade: o fluxo
existente de atualização de tarefas usa `PATCH`, portanto esse método passou a
ser allowlisted e coberto pelo preflight sem relaxar wildcard, credentials ou
origins desconhecidas.

## RED / GREEN

Os testes focados foram escritos antes da implementação. O RED esperado
confirmou que `http-security.ts` não existia e que o env ainda não exigia nem
expunha `API_ALLOWED_ORIGINS`, `API_REQUIRE_HTTPS` e
`API_TRUSTED_PROXY_HOPS`. O GREEN implementou o módulo puro, hooks Fastify,
bootstrap/env, integração no server factory e E2E.

Arquivos centrais:

- `apps/api/src/http-security.ts`
- `apps/api/src/http-security.test.ts`
- `apps/api/src/server.ts`
- `packages/shared/src/env.ts`
- `packages/shared/src/errors.ts`
- `packages/shared/src/__tests__/http-security-env.test.ts`
- `tests/e2e/http-security.spec.ts`
- `playwright.config.ts`

## Matriz de aceite

| Critério                                                             | Evidência                                                         | Resultado |
| -------------------------------------------------------------------- | ----------------------------------------------------------------- | --------- |
| Origin normalizada, exact-match, sem wildcard/`null`/path/credencial | testes unitários e integração Fastify                             | PASS      |
| Preflight allowlisted e sem execução de handler                      | testes `204`/`403` com origin, method e headers                   | PASS      |
| `PATCH` preserva o fluxo atual do Secretary                          | preflight Vitest e E2E com `access-control-request-method: PATCH` | PASS      |
| HTTPS fail-closed com proxy explícito                                | teste de `426`, `x-forwarded-proto` e `trustedProxyHops`          | PASS      |
| Headers fixos e HSTS HTTPS-only                                      | assertions de CSP, nosniff, frame, referrer, cross-domain e HSTS  | PASS      |
| Bootstrap production exige origins e HTTPS                           | testes de `parseEnv`/`parseHttpSecurityEnv`                       | PASS      |
| Nenhuma persistência/provider/canal/RAG/side effect alterado         | diff dirigido, smoke PostgreSQL e auditoria lead-only             | PASS      |

## Gates executados

- `npm run verify`: PASS
  - `npm run format:check`: PASS
  - `npm run typecheck`: PASS
  - `npm run lint`: PASS
  - `npm run build`: PASS
  - `npm test`: 97 arquivos pass, 2 skips; 330 testes pass, 18 skips
  - `npm run test:coverage`: PASS — 85,16% statements, 80,44% branches,
    84,75% functions, 86,06% lines
  - `npm run audit:security`: PASS — 0 vulnerabilidades
- `npm run readiness`: PASS — 1 arquivo, 4 testes pass
- `npm run test:e2e`: PASS — 3/3 fluxos Playwright
- `npm run test:postgres`: PASS — 5 arquivos pass, 2 skips; 51 testes pass,
  18 skips
- `npm audit --audit-level=high`: PASS — 0 vulnerabilidades
- `git diff --check`: PASS
- testes focados S18: PASS — 2 arquivos, 13 testes

Os skips PostgreSQL são condicionais à ausência de `TEST_DATABASE_URL` neste
ambiente e não são tratados como prova de infraestrutura real.

## Limites e decisão operacional

O boundary de aplicação está controlado e verificável, mas isso não prova a
configuração de Caddy/CDN/ingress/TLS do host, CSP do console, IdP, cookies ou
CSRF, limiter distribuído, HA, retenção/PII, role mapping ou change control em
produção. O API continua sem provider/canal/RAG/agenda real e nenhuma ação
clínica, financeira, de prontuário ou sensível foi liberada.

`CONTROLLED_MVP_READY` permanece válido para fixtures e ambiente controlado.
`PRODUCTION_REAL_DATA_READY: NO-GO` e `WAITING_HUMAN_APPROVAL` permanecem
inalterados.

O fechamento desta rodada foi lead-only porque child agents independentes não
estavam disponíveis nesta execução; isso é evidência de auditoria do checkout,
não aprovação independente nem autorização de produção.
