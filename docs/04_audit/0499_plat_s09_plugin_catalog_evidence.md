# Evidência de auditoria — PLAT-S09 catálogo declarativo de plugins

## Identificação

- timestamp do fechamento: `2026-08-24T20:23:51-03:00`
- task: `PLAT-S09-001_TENANT_AWARE_PLUGIN_MANIFEST_CATALOG`
- fase: `DISCOVERY -> PRD -> SPEC -> BUILD -> AUDIT`
- release máximo: `CONTROLLED_MVP_READY`
- dados: fixtures e manifests fictícios; nenhum provider, canal ou handler externo

## Entrega controlada

- `PluginCatalogRecord`, `PluginCatalogId` e schemas Zod validam snapshots declarativos antes da persistência.
- A store em memória e o repository PostgreSQL mantêm cópias defensivas, unicidade `(tenant, name, version)` e lifecycle `DRAFT -> APPROVED/ARCHIVED -> ARCHIVED`.
- `expectedStatus` falha com `conflict` sem mutação parcial; `APPROVED` registra somente o actor de revisão de metadata.
- A migration `0004_plugin_manifest_catalog.sql` adiciona JSONB, constraints de identidade, índice, trigger de imutabilidade e `FORCE ROW LEVEL SECURITY`.
- O wrapper tenant-scoped aplica contexto de conexão; a API admin expõe apenas create/list/get/transition e audita metadata após sucesso.
- Nenhum caminho do catálogo chama `PluginRegistry`, handler, provider, canal, rede, instalação ou side effect.

## Evidência de testes

- `packages/platform/src/__tests__/plugin-catalog.test.ts`: lifecycle, cópia defensiva, duplicate name/version, isolamento, filtros, estados terminais e stale precondition.
- `packages/persistence/src/__tests__/plugin-catalog-repository.test.ts`: SQL parametrizado, cópia defensiva, unique violation, rollback e conflito transacional.
- `apps/api/src/__tests__/plugin-catalog.test.ts`: envelope admin, isolamento entre tenants, filtro, aprovação e HTTP 409.
- `packages/persistence/src/__tests__/platform-postgres-smoke.test.ts`: smoke condicional de migration/RLS/lifecycle PostgreSQL.

## Gates finais

| Gate                           | Resultado                                                                               |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| `npm run verify`               | PASS — format, typecheck, lint, build, testes, coverage e audit                         |
| `npm test`                     | PASS — 71 arquivos; 253 testes pass; 16 skips condicionais; 269 total                   |
| `npm run test:coverage`        | PASS — statements 84,73%; branches 80,11%; functions 84,40%; lines 85,67%               |
| `npm run readiness`            | PASS — 1 arquivo; 4 testes                                                              |
| `npm run test:e2e`             | PASS — 1 fluxo Playwright                                                               |
| `npm run test:postgres`        | PASS — 6 arquivos; 49 testes pass; 16 skips condicionais; banco externo não configurado |
| `npm audit --audit-level=high` | PASS — 0 vulnerabilidades                                                               |
| `git diff --check`             | PASS                                                                                    |

## Decisão e limites

`PLAT-S09-001 = COMPLETED_CONTROLLED`. O catálogo é governança de metadata, não catálogo de código executável. `PRODUCTION_REAL_DATA_READY` permanece `NO-GO`/`WAITING_HUMAN_APPROVAL`; marketplace aberto, instalação de terceiros, handlers persistentes, provider/canal real, dados reais e ações clínicas/financeiras continuam bloqueados.

A revisão independente não foi reivindicada: os child agents configurados permaneceram indisponíveis por limite de conta/incompatibilidade de modelo. O fechamento é lead-only, apoiado por testes RED/GREEN, gates executáveis, inspeção de segurança e diff controlado.
