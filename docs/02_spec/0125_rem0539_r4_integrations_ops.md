# 0125 — SPEC R4: seams de integração e operação

Data: 2026-09-05. Programa: `REM-0539`. Onda: R4. Estado: `SPEC_APPROVED_CONTROLLED_BUILD`.

## Contratos locais

`createTrustedOperatorIdentityResolver` aceita uma lista ordenada de segredos para rotação; cada token contém `aud`, `iat`, `exp` e tenant. `ControlledModelAdapter.generate` é bounded, determinístico e sempre marca `externalCall=false`; timeout e output inseguro retornam falha segura. `ControlledDeliveryAdapter.send` exige tenant/idempotency, mantém journal em memória e silencia se `takeoverActive` estiver ativo. `VersionedKnowledgeCatalog` só responde com fonte publicada e não revogada.

`RetentionLedger` agrega contadores sem texto bruto e remove itens expirados em operação explícita. `createDatabaseSnapshot`/`restoreDatabaseSnapshot` usam JSON redigido, digest SHA-256 e conferem ownership de todos os registros; o restore é atômico em uma cópia. Nenhuma função local confirma appointment ou chama rede.

## Observabilidade e gates

Cada adapter expõe `externalCall`, `correlationId`, status e erro codificado. Falha de auditoria ou validação aborta a operação. Os testes cobrem replay, timeout, segredo, fonte revogada, cross-tenant, takeover, purge e digest. O gate R4 separa evidência controlada da aprovação de qualquer sandbox externo.
