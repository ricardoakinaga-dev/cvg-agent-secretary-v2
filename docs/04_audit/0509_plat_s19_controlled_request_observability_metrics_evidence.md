# Evidência — PLAT-S19 Controlled Request Observability Metrics

## Identificação

- task: `PLAT-S19-001_CONTROLLED_REQUEST_OBSERVABILITY_METRICS`
- sprint: `PLAT-S19_CONTROLLED_REQUEST_OBSERVABILITY_METRICS`
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- fechamento controlado: `2026-08-25T14:51:53-03:00`
- pipeline: `DISCOVERY -> PRD -> SPEC -> BUILD -> AUDIT`
- dados: somente fixtures fictícias; sem provider, canal, RAG, deploy, dado
  real ou side effect
- resultado: `COMPLETED_CONTROLLED`

## Lacuna e escopo executado

O API já emitia logs de domínio com `correlationId`, mas não havia visão
agregada bounded para respostas de rota, 404, rejeições de segurança, método,
status e latência. O lane implementou um collector process-local efetivamente
usado pelo Fastify:

- `ControlledRequestMetrics` substitui o estado por novos objetos a cada
  registro e devolve snapshots defensivos;
- templates de rota são limitados; rotas excedentes entram em `__other__`,
  rotas não casadas em `__unmatched__` e o contador de descarte é bounded;
- métodos são normalizados para um conjunto HTTP fixo ou `OTHER`;
- status é agregado em `2xx`, `3xx`, `4xx`, `5xx` e `other`, com latência total
  e máxima arredondada;
- `onResponse` conta respostas de rota, 404 e respostas rejeitadas antes do
  handler, sem usar `request.url`;
- `GET /health/metrics` é read-only e retorna envelope controlado sem path,
  query, body, token, PII ou identidade.

O collector é deliberadamente process-local. Não foi apresentado como
Prometheus/OTel, broker, storage distribuído, alerting ou prova de HA.

## RED / GREEN

Os testes focados foram escritos antes da implementação. O RED confirmou que
`request-metrics.ts` não existia e que não havia integração do collector com
hooks/endpoint Fastify. O GREEN implementou o collector, hooks `onRequest`/
`onResponse`, rota de métricas, cobertura de E2E e limites de cardinalidade.

Arquivos centrais:

- `apps/api/src/request-metrics.ts`
- `apps/api/src/request-metrics.test.ts`
- `apps/api/src/server.ts`
- `tests/e2e/http-security.spec.ts`

## Matriz de aceite

| Critério                                             | Evidência                                                            | Resultado |
| ---------------------------------------------------- | -------------------------------------------------------------------- | --------- |
| Estado immutable-by-replacement e snapshot defensivo | teste de mutação de métodos/rotas                                    | PASS      |
| Cardinalidade e métodos bounded                      | overflow para `__other__`, fallback `__unmatched__` e método `OTHER` | PASS      |
| Status/latência agregados por rota e globalmente     | testes unitários e integração de 200/403/404                         | PASS      |
| 404 e rejeição de segurança são contabilizados       | integração Fastify sem handler adicional                             | PASS      |
| Endpoint read-only não expõe dados sensíveis         | API/E2E e assertions contra path/query/token                         | PASS      |
| Nenhum efeito fora do boundary controlado            | diff dirigido, smoke PostgreSQL e auditoria lead-only                | PASS      |

## Gates executados

- `npm run verify`: PASS
  - `npm run format:check`: PASS
  - `npm run typecheck`: PASS
  - `npm run lint`: PASS
  - `npm run build`: PASS
  - `npm test`: 98 arquivos pass, 2 skips; 333 testes pass, 18 skips
  - `npm run test:coverage`: PASS — 85,24% statements, 80,63% branches,
    84,99% functions, 86,16% lines
  - `npm run audit:security`: PASS — 0 vulnerabilidades
- `npm run readiness`: PASS — 1 arquivo, 4 testes pass
- `npm run test:e2e`: PASS — 3/3 fluxos Playwright
- `npm run test:postgres`: PASS — 5 arquivos pass, 2 skips; 51 testes pass,
  18 skips
- `npm audit --audit-level=high`: PASS — 0 vulnerabilidades
- `git diff --check`: PASS
- testes focados S19: PASS — 1 arquivo, 3 testes

Os skips PostgreSQL são condicionais à ausência de `TEST_DATABASE_URL` neste
ambiente e não são tratados como prova de infraestrutura real.

## Limites e decisão operacional

O collector não resolve rate limiting distribuído, replay/HA, retenção/PII,
alerting, SLO, exportação de métricas, IdP, host TLS/CSRF/CSP, provider/canal,
RAG institucional ou ações sensíveis. Não há persistência nova nem alteração
do data plane legado.

`CONTROLLED_MVP_READY` permanece válido para fixtures e ambiente controlado.
`PRODUCTION_REAL_DATA_READY: NO-GO` e `WAITING_HUMAN_APPROVAL` permanecem
inalterados.

O fechamento foi lead-only porque child agents independentes não estavam
disponíveis nesta execução; isso é evidência do checkout, não aprovação
independente nem autorização de produção.
