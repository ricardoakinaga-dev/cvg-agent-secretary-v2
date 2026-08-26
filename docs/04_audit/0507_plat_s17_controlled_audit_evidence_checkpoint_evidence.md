# Evidência de auditoria — PLAT-S17 Controlled Audit Evidence Checkpoint

## Identificação

- data: `2026-08-25`
- fechamento: `2026-08-25T13:24:09-03:00`
- sprint: `PLAT-S17_CONTROLLED_AUDIT_EVIDENCE_CHECKPOINT`
- task: `PLAT-S17-001_CONTROLLED_AUDIT_EVIDENCE_CHECKPOINT`
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- pipeline: `DISCOVERY -> PRD -> SPEC -> BUILD -> AUDIT`
- dados: somente fixtures e valores fictícios
- resultado: `COMPLETED_CONTROLLED`

## Escopo entregue

O slice adiciona um checkpoint tenant-aware, metadata-only, para até 200 IDs de
eventos de auditoria já revisados. O servidor valida identidade, tenant,
existência e filtros; calcula o digest SHA-256 canônico e não aceita digest do
caller. O lifecycle é `SEALED -> ARCHIVED` com `expectedStatus` e compare-and-
swap.

Somente IDs, filtros, contagem, digest, status, atores e timestamps são
persistidos. Payload bruto, export externo, retenção/purge, alteração de
eventos, provider, canal, RAG, dado real e side effect permanecem fora do
escopo.

## Implementação verificada

- contrato e digest: `packages/persistence/src/audit-evidence-checkpoint.ts`;
- memória e schema: `packages/persistence/src/repositories/audit-repository.ts`,
  `packages/persistence/src/schema.ts` e `packages/persistence/src/db.ts`;
- PostgreSQL: migration `0007_audit_evidence_checkpoint.sql`, repository e
  wrapper tenant-scoped;
- API: rotas de create/list/get/transition em `apps/api/src/server.ts`, com
  audit operacional redigido e respostas em envelope;
- client/UI: `apps/web/src/api/client.ts`, `apps/web/src/App.tsx` e
  `apps/web/src/features/audit/index.tsx`;
- testes de boundary: contrato, memória, API, client, UI, Postgres fake e
  E2E browser/API.

## RED/GREEN/AUDIT

- RED: testes focados foram executados antes da implementação; contrato/store,
  rotas, client e controles UI falharam conforme esperado.
- GREEN: fluxo de selagem e arquivamento, conflitos, cross-tenant, filtros,
  ausência de payload e digest server-side passaram em memória, API, client,
  UI e PostgreSQL fake.
- AUDIT: inspeção temporal do diff, `git diff --check`, segurança, limites de
  produção e documentação operacional foram revisados.

## Gates executáveis

| Gate                           | Resultado                                                                 |
| ------------------------------ | ------------------------------------------------------------------------- |
| `npm run verify`               | PASS                                                                      |
| `npm test`                     | PASS — 95 arquivos; 317 testes pass; 18 skips condicionais                |
| `npm run test:coverage`        | PASS — 84,95% statements; 80,00% branches; 84,52% functions; 85,82% lines |
| `npm run readiness`            | PASS — 4/4                                                                |
| `npm run test:e2e`             | PASS — 2/2 fluxos Playwright                                              |
| `npm run test:postgres`        | PASS — 5 arquivos; 51 testes pass; 18 skips condicionais                  |
| `npm audit --audit-level=high` | PASS — 0 vulnerabilidades                                                 |
| `git diff --check`             | PASS                                                                      |

Os skips PostgreSQL são condicionais à ausência de `TEST_DATABASE_URL`; não
foram tratados como evidência de infraestrutura real.

## Matriz de aceite

| Controle                              | Evidência                                            | Estado          |
| ------------------------------------- | ---------------------------------------------------- | --------------- |
| input strict, IDs únicos e limite 200 | schema e testes negativos                            | PASS controlado |
| tenant/event/filter verification      | repository, API boundary e isolamento                | PASS controlado |
| digest canônico server-side           | digest ordenado/sanitizado e teste sem digest caller | PASS controlado |
| lifecycle/CAS                         | memória, API e Postgres fake; stale conflict         | PASS controlado |
| migration/RLS/compatibilidade         | smoke de migration, tenant isolation, verify/e2e     | PASS controlado |

## Veredito e limites

`CONTROLLED_MVP_READY` permanece válido. `PRODUCTION_REAL_DATA_READY` continua
`NO-GO` / `WAITING_HUMAN_APPROVAL`. O checkpoint não é assinatura externa,
retenção legal, prova de infraestrutura, export de dados ou autorização de
produção. IdP/tenant binding operacional, rollout RLS/backfill, roles/secrets,
limiter/replay/HA distribuídos, host security, retenção/PII, coordenação
multioperador, providers/canais, RAG institucional e decisões humanas seguem
bloqueios explícitos.

O fechamento é lead-only porque o runtime de child agents permaneceu
indisponível por limites de conta/modelo; nenhuma aprovação independente é
reivindicada.
