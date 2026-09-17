# AUD17-04 — runtime de orquestração e limites

**Status:** VERIFIED_LOCAL_WITH_PG_GAP
**Ambiente:** Node `22.23.2`; store em memória e testes de contrato; dados sintéticos.

## Hardening integrado

- `recoverExpiredLease` recebe o snapshot de `leaseToken` e `stepVersion` e só faz CAS quando o claim ainda é o mesmo;
- budget de steps/model/tool/custo é verificado antes do claim/executor;
- limites restantes e o menor prazo entre `deadline` e `maxDurationMs` chegam ao executor governado;
- fingerprint semântico usa chaves estruturais do DAG e não IDs/ordenação;
- replan exige `parentPlanId` e `triggeringEvaluationId` pareados e vinculados ao mesmo Goal/Plan.

## Prova executada

| Comando | Resultado |
| --- | --- |
| `npx vitest run packages/agent-runtime/src/__tests__/orchestration.test.ts packages/persistence/src/__tests__/orchestrator-postgres.test.ts packages/persistence/src/__tests__/postgres-migration-smoke.test.ts` | PASS; 23 testes, 5 skips de integração PostgreSQL. |
| `npm test` | PASS; 255 arquivos, 1.783 testes, 117 skips. |
| `npm run typecheck` | PASS. |
| `npm run lint` | PASS. |

Os testes cobrem permutação/renomeação do DAG, lease stale, budget antes do executor, deadline efetivo, replan cross-Goal/Plan e continuidade de estado.

## Lacuna

Não há `TEST_DATABASE_URL` neste host. Race real entre processos, isolamento RLS e recuperação após restart no Postgres permanecem `NOT_EXECUTED`; não são substituídos pelos testes em memória.
