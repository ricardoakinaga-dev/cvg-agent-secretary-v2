# AUD17-05 — persistência, migrations e fencing

**Status:** NOT_EXECUTED_NO_TEST_DATABASE
**Ambiente:** Node `22.23.2`; sem `TEST_DATABASE_URL`; nenhum banco criado ou alterado.

## Implementação verificada

- migration `0023_orchestrator_replan_fencing.sql` adiciona a chave composta de avaliação, o check de pareamento e a FK Goal/Plan/evaluation;
- API e worker exigem a migration `0023` no conjunto mínimo;
- preflight de worker consulta `schema_migrations` antes de consumir a fila;
- store PostgreSQL aplica CAS de lease, budget antes do claim e linhagem no mesmo tenant.

## Prova executada

| Comando | Resultado |
| --- | --- |
| `npm run test:postgres` | 14 arquivos PASS, 9 skips; 86 testes PASS, 115 skips. |
| `npx vitest run packages/persistence/src/__tests__/postgres-migration-smoke.test.ts` | PASS no smoke textual/mock; integração de banco não executada. |
| `git diff --check` | PASS. |

## Limitação obrigatória

Sem banco descartável não há prova atual de constraint aplicada, `convalidated`, RLS efetivo, double claim, corrida de CAS, migração interrompida ou restore físico. RPO/RTO físico continua externo e não pode ser inferido do código.
