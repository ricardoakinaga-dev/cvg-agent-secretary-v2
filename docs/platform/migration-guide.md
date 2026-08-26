# Migration Guide

## Princípio

As migrations do control plane são aditivas, checksum-guarded e executadas em
transação. O fixture PostgreSQL local é descartável; nenhum comando deste guia
autoriza backfill ou alteração destrutiva em banco real.

## Ordem

| Migration                             | Conteúdo                                   |
| ------------------------------------- | ------------------------------------------ |
| `0000_initial.sql`                    | schema legado inicial                      |
| `0001_tenant_isolation.sql`           | tenant columns, relações, RLS e quarentena |
| `0002_platform_control_plane.sql`     | agents, versions e configurações           |
| `0003_test_suite_catalog.sql`         | suites e runs do Test Lab                  |
| `0004_plugin_manifest_catalog.sql`    | catálogo metadata-only de plugins          |
| `0005_knowledge_source_catalog.sql`   | fontes controladas sem conteúdo            |
| `0006_release_candidate_evidence.sql` | ledger de quatro gates/digest              |
| `0007_audit_evidence_checkpoint.sql`  | checkpoint de IDs/digest de audit          |
| `0008_session_agent_version_pin.sql`  | pinning tenant-aware de sessão             |

## Execução controlada

Use `runInitialPostgresMigration` somente para compatibilidade do schema legado
controlado; use `runPostgresMigrations` para o catálogo completo. O runner lê
`schema_migrations`, compara checksum e não reaplica uma versão divergente.
Depois valide tabelas, constraints, índices, RLS e roles com os checks do
bootstrap.

```text
TEST_DATABASE_URL=postgres://... npm run test:postgres
```

## Produção bloqueada até signoff

Antes de qualquer banco real: backup/restore ensaiado, janela de lock, plano de
rollback, owner de DDL separado, role runtime sem superuser/BYPASSRLS, contexto
tenant, mapeamento IdP, quarentena de órfãos e aprovação humana. Não executar
backfill de tenant nulo nem `DROP`, `TRUNCATE` ou reset destrutivo como atalho.
