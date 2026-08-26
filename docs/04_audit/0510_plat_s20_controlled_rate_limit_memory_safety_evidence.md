# Evidência — PLAT-S20 Controlled Rate Limit Memory Safety

- sprint: `PLAT-S20_CONTROLLED_RATE_LIMIT_MEMORY_SAFETY`
- task: `PLAT-S20-001_CONTROLLED_RATE_LIMIT_MEMORY_SAFETY`
- pipeline: `DISCOVERY -> PRD -> SPEC -> BUILD -> AUDIT`
- fechamento controlado: `2026-08-25T15:15:48-03:00`
- dados: somente fixtures e chaves sintéticas; nenhum segredo, dado real ou
  chamada externa
- decisão: `CONTROLLED_MVP_READY`; produção real permanece `NO-GO` /
  `WAITING_HUMAN_APPROVAL`

## Escopo

O lane tratou somente o risco de crescimento de memória do limiter process-local
do API. O contrato passou a validar `maxBuckets`, `max`, `windowMs` e chaves
bounded; purgar buckets expirados; evictar deterministicamente o bucket ativo
com menor `resetAt`; retornar snapshot sem chaves; e marcar respostas 429 como
`Cache-Control: no-store`. A assinatura legada de allow/deny e `Retry-After` foi
preservada.

Fora do escopo permaneceram Redis, edge, limiter distribuído, fairness entre
instâncias, IdP, tenant binding operacional, HA, provider, canal, RAG, dados
reais, deploy, migration, persistência nova e side effect.

## RED / GREEN

- RED: testes focados executados em `2026-08-25T15:06:42-03:00`; 3 testes novos
  falharam conforme esperado e 2 testes legados passaram porque as opções,
  snapshot, validações, evicção e `no-store` ainda não existiam.
- GREEN: `apps/api/src/rate-limit.ts` implementou estado por substituição,
  limites explícitos, purge/evicção e snapshot key-free; `server.ts` adicionou
  somente `Cache-Control: no-store` ao caminho 429; a suíte focada terminou com
  5/5 testes.

## Arquivos centrais

- `apps/api/src/rate-limit.ts`
- `apps/api/src/__tests__/rate-limit.test.ts`
- `apps/api/src/server.ts`
- `docs/platform/05-platform-prd.md`
- `docs/platform/06-platform-spec.md`
- `docs/platform/07-platform-execplan.md`

## Matriz de aceite

| Critério                                                 | Evidência                                                                    | Resultado       |
| -------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------- |
| policy/key inválidas falham dentro de limites explícitos | testes de `maxBuckets`, `max`, `windowMs`, chave vazia e chave > 256         | PASS controlled |
| buckets expirados são purgados e capacidade é bounded    | teste de expiração e snapshot `bucketCount <= maxBuckets`                    | PASS controlled |
| evicção é determinística                                 | teste com reset de 10s/20s e confirmação do bucket sobrevivente              | PASS controlled |
| snapshot não expõe chave nem muta estado                 | serialização sem chave sintética e mutação defensiva negativa                | PASS controlled |
| 429 mantém envelope/retry e não é cacheável              | integração API com `rate_limited`, `Retry-After` e `Cache-Control: no-store` | PASS controlled |
| Secretary e fronteiras externas permanecem sem alteração | verify, readiness, E2E, PostgreSQL, audit e diff check                       | PASS controlled |

## Gates executáveis

- focused rate-limit: PASS — 1 arquivo, 5 testes
- `npm run verify`: PASS — 98 arquivos, 335 testes pass, 18 skips; coverage
  85,31% statements / 80,72% branches / 85,07% functions / 86,23% lines;
  audit 0 vulnerabilidades
- `npm run readiness`: PASS — 1 arquivo, 4 testes
- `npm run test:e2e`: PASS — 3/3
- `npm run test:postgres`: PASS — 5 arquivos pass, 2 skips; 51 testes pass,
  18 skips
- `npm audit --audit-level=high`: PASS — 0 vulnerabilidades
- `git diff --check`: PASS

## Auditoria e limites

O snapshot expõe somente `bucketCount` e `maxBuckets`; nenhuma chave, IP,
token, header ou identidade é retornada. O mapa não excede a capacidade
configurada, mas a solução continua local à instância e não fornece fairness,
replicação, proteção no edge, HA ou rate limiting distribuído. O fechamento foi
lead-only; os child agents permaneceram indisponíveis por limite de modelo/conta
e nenhuma aprovação independente é reivindicada.

Nenhuma ativação de produção, provider, canal, RAG, dado real ou ação sensível
foi autorizada.
