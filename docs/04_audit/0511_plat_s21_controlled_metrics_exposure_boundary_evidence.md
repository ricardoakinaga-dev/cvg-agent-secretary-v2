# Evidência — PLAT-S21 Controlled Metrics Exposure Boundary

- sprint: `PLAT-S21_CONTROLLED_METRICS_EXPOSURE_BOUNDARY`
- task: `PLAT-S21-001_CONTROLLED_METRICS_EXPOSURE_BOUNDARY`
- pipeline: `DISCOVERY -> PRD -> SPEC -> BUILD -> AUDIT`
- fechamento controlado: `2026-08-25T15:36:38-03:00`
- dados: somente fixtures e valores sintéticos; nenhum segredo, dado real ou
  chamada externa
- decisão: `CONTROLLED_MVP_READY`; produção real permanece `NO-GO` /
  `WAITING_HUMAN_APPROVAL`

## Escopo

O lane fechou a exposição acidental de `GET /health/metrics`. A rota é habilitada
somente em `NODE_ENV=test` ou `NODE_ENV=development`, pode ser desligada em
fixtures por `requestMetricsEnabled: false`, e não pode ser reabilitada em
`production`, `staging`, `qa` ou ambiente desconhecido. A resposta habilitada ou
desabilitada emite `Cache-Control: no-store`; a desabilitada retorna 404 genérico
sem snapshot.

`GET /health` não foi alterado. Não foram adicionados IdP, auth operacional,
allowlist de rede, Prometheus/OTel, broker, HA, provider, canal, RAG, dado real,
persistência ou side effect.

## RED / GREEN

- RED: testes focados executados em `2026-08-25T15:27:31-03:00`; 3 assertions
  falharam conforme esperado porque a opção não existia, ambientes não
  controlados retornavam 200 e não havia `no-store`.
- GREEN: `BuildServerOptions.requestMetricsEnabled` e o gate de ambiente foram
  implementados em `apps/api/src/server.ts`; a rota retorna 404 sem snapshot
  fora do ambiente controlado e sempre define `Cache-Control: no-store`.
- testes focados S21 + regressão S19: PASS — 2 arquivos, 5 testes

## Matriz de aceite

| Critério                                                   | Evidência                                                         | Resultado       |
| ---------------------------------------------------------- | ----------------------------------------------------------------- | --------------- |
| test/development habilitados preservam inspeção controlada | regressão do endpoint S19 em Vitest                               | PASS controlled |
| controlled fixture pode desligar a rota                    | `metrics-exposure.test.ts` com `requestMetricsEnabled: false`     | PASS controlled |
| production/staging/qa não reabilitam com override          | loop de ambientes não controlados e `requestMetricsEnabled: true` | PASS controlled |
| resposta disabled não inclui snapshot e é no-store         | 404 genérico, ausência de `totalRequests`, header assertion       | PASS controlled |
| `/health`/collector/Secretary permanecem estáveis          | readiness, E2E, PostgreSQL e suíte completa                       | PASS controlled |

## Gates executáveis

- focused S21/S19: PASS — 2 arquivos, 5 testes
- `npm run verify`: PASS — 99 arquivos, 337 testes pass, 18 skips; coverage
  85,33% statements / 80,74% branches / 85,07% functions / 86,25% lines;
  audit 0 vulnerabilidades
- `npm run readiness`: PASS — 1 arquivo, 4 testes
- `npm run test:e2e`: PASS — 3/3
- `npm run test:postgres`: PASS — 5 arquivos pass, 2 skips; 51 testes pass,
  18 skips
- `npm audit --audit-level=high`: PASS — 0 vulnerabilidades
- `git diff --check`: PASS

## Auditoria e limites

O gate usa o ambiente do processo como autoridade e não aceita um override para
transformar production/staging/unknown em ambiente controlado. O endpoint ainda
não possui autenticação/allowlist operacional nem exporta métricas de produção;
essa próxima camada depende de infraestrutura e decisão aprovadas. O fechamento
foi lead-only; nenhuma aprovação independente é reivindicada.

Nenhuma ativação de produção, provider, canal, RAG, dado real ou ação sensível
foi autorizada.
