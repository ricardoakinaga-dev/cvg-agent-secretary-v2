# AUD17-05 — persistência, migrations e fencing

**Status:** `VERIFIED_LOCAL_WITH_PHYSICAL_GAP`

**Ambiente:** Node `22.23.2`; PostgreSQL `16.4-alpine` descartável e dedicado
(`cvg-aud17-pg-20260917`, `127.0.0.1:55432`); role sintético temporário
`cvg_aud17_runner`; nenhum dado real, provider, canal, IdP, RAG ou efeito
externo. O modo de certificação manteve `CVG_REAL_EFFECTS=0`.

## Implementação verificada

- migration `0023_orchestrator_replan_fencing.sql` preserva a chave composta de
  avaliação, o check de pareamento e a FK Goal/Plan/evaluation;
- migration aditiva `0024_tenant_isolation_constraint_validation.sql` valida as
  constraints de tenant/safety que ficaram `NOT VALID` no histórico e aborta
  fail-closed quando encontra linhas incompatíveis; nenhuma migration histórica
  foi reescrita;
- API, worker, preflight e composição durável exigem `0023` e `0024` antes de
  iniciar ou consumir trabalho;
- store PostgreSQL aplica CAS de lease, budget antes do claim, fencing,
  lineage e isolamento no mesmo tenant;
- o teste legado de quarentena confirma que uma linha incompatível não é
  normalizada silenciosamente: a validação `0024` bloqueia a base até a
  remediação autorizada.

## Prova executada

| Comando | Resultado |
| --- | --- |
| `TEST_DATABASE_URL=... npm run test:postgres` | 23 arquivos PASS; 202 testes PASS; 0 falhas. |
| `npx vitest run packages/persistence/src/__tests__/postgres-migration-smoke.test.ts` | PASS; smoke da migration `0024`, incluindo `VALIDATE CONSTRAINT` e fencing de outbox. |
| `npx vitest run packages/chaos/src/__tests__/chaos-postgres.test.ts` | 2/2 PASS; terminação de backend limitada às conexões do ensaio. |
| `npx vitest run packages/persistence/src/__tests__/tenant-isolation.test.ts` | 14/14 PASS; RLS/tenant e caminho fail-closed exercitados. |
| `npm run certification:verify:phase11` | PASS; `INV-007..010` e `PHASE11_FORMAL_CLOSURE` passaram no selo local. |
| `npm run evidence:verify:phase11` | PASS. |

## Limitação obrigatória

O ensaio prova a fronteira lógica em PostgreSQL descartável: migrations,
constraints, RLS/tenant, double claim, CAS, fencing, replay/outbox e restore
lógico. Ele não prova backup/restore físico, durabilidade de infraestrutura ou
metas RPO/RTO; isso permanece a task externa `AUD17-14`. Os oito gates externos
e humanos continuam `NOT_VALIDATED`/`PENDING`, e produção permanece `NO_GO`.
