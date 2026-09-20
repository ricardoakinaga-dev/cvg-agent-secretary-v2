# AUD19-07 — Decomposição de hotspots: evidência de execução

- Programa: `AUD19-REM`; task: `AUD19-07` (P2-MAINT-01); status desta fatia: `IMPLEMENTED`.
- Data: 2026-09-20. Node: `22.23.2`. Baseline: [AUD19-07-baseline.md](AUD19-07-baseline.md).
- Decisão: [ADR 0002](../../../02_spec/adr/0002-hotspot-decomposition-bounded-slice.md).
- Escopo: movimentação mecânica com re-export; nenhum contrato, threshold, mensagem de erro
  ou caminho legacy alterado; nenhuma dependência nova.

## 1. Contagem antes/depois (`wc -l`)

| Arquivo                                         |  Antes | Depois | Δ linhas | Δ %    |
| ----------------------------------------------- | -----: | -----: | -------: | -----: |
| `apps/api/src/server.ts`                        |   6215 |   4958 |    −1257 | −20,2% |
| `packages/persistence/src/postgres.ts`          |   4221 |   3441 |     −780 | −18,5% |
| **Hotspots somados**                            |  10436 |   8399 |    −2037 | −19,5% |

Módulos extraídos (novos):

| Módulo                                                | Linhas | Responsabilidade declarada no header |
| ----------------------------------------------------- | -----: | ------------------------------------ |
| `apps/api/src/server/tenant-isolation.ts`             |    651 | schema/RLS/migração e replay webhook |
| `apps/api/src/server/postgres-role-checks.ts`         |    332 | separação de papéis runtime/migração |
| `apps/api/src/server/bootstrap-persistence.ts`        |    358 | composição de persistência + hooks   |
| `packages/persistence/src/postgres/types.ts`          |     46 | contratos de tipo compartilhados     |
| `packages/persistence/src/postgres/migrations.ts`     |    488 | runner de migrações/checksum/baseline |
| `packages/persistence/src/postgres/outbox-support.ts` |    341 | suporte de outbox durável            |

`kernel-composition.ts` (1900) e `agent-runtime/composition.ts` (340) não foram
alterados; a decomposição deles permanece pendente conforme ADR 0002.

## 2. Símbolos movidos e superfície pública

- `server.ts` re-exporta exatamente os 17 nomes pré-extração; `postgres.ts`, os 24
  pré-extração (verificado por parser estático no teste; zero faltando, zero
  adicionados).
- Movidos com re-export: `assertTenantIsolationMigrationState`,
  `assertTenantIsolationSchema`, `assertWebhookReplaySchema`,
  `assertRuntimeRoleIsLeastPrivilege`, `assertMigrationRoleIsLeastPrivilege`,
  `assertMigrationRoleSecurityBoundary`, `AgentRuntimeOptions`,
  `InboundRuntimeCompletion`, `RuntimePersistence` (interno),
  `readInitialMigrationSql`, `readPostgresMigrationSql`,
  `runInitialPostgresMigration`, `runPostgresMigrations`,
  `baselineLegacyPostgresMigration`, `legacyRequiredColumns`,
  `legacyRequiredIndexes`, `PostgresMigrationOptions`,
  `LegacyMigrationBaselineApproval`, `PostgresQueryable`,
  `PostgresTransactionClient`, `DurableOutboxStatus`, `DurableOutboxEventRecord`,
  `OUTBOX_MAX_ATTEMPTS`, `OUTBOX_DEFAULT_LEASE_MS`, `OUTBOX_BASE_BACKOFF_MS`,
  `OUTBOX_MAX_BACKOFF_MS`.
- Equivalência mecânica conferida por comparação de bloco: os trechos movidos são
  idênticos aos originais, exceto (a) palavras-chave `export` adicionadas, (b)
  `BuildServerOptions['persistence']` → `ServerPersistenceConfig | undefined` no
  módulo de composição (mesmo tipo estrutural) e (c) reflow do Prettier.

## 3. Architecture tests (`tests/architecture.test.js`)

Executáveis, sem dependência nova (`node:fs`, `node:path`, `vitest`):

1. **Fronteira LangGraph (ADR 0001)**: nenhum import de `langgraph`/`@langchain*`
   fora de `packages/agent-runtime/src/composition.ts`.
2. **Imports profundos**: proibido importar `packages/x/src/...`, `apps/x/src/...`,
   `@cvg/x/src` ou caminho relativo que escape do workspace. Exceções justificadas:
   fixtures de teste que compõem outro app e entrypoints/testes que compartilham
   `scripts/lib/*` (regra explícita no teste).
3. **Ciclos**: zero ciclo de runtime em todos os workspaces; ciclos apenas de tipo
   existentes (`schema↔audit-evidence-checkpoint`, `plugin-gateway↔event-bus`,
   `plugin-gateway↔tool-invocation-boundary`) em allowlist congelada.
4. **Hotspots não crescem** contra o baseline congelado (`6215`/`4221`) e cada
   módulo extraído declara `Responsibility:` no header.
5. **Snapshot de exports**: igualdade exata antes/depois para os dois hotspots.

Validação negativa executada com arquivos temporários (removidos em seguida):
import de `langgraph` + `@langchain/core` e import profundo de
`packages/shared/src/index.ts` fizeram os testes 1 e 2 falharem; dois módulos
temporários importando-se mutualmente fizeram o teste 3 falhar. Sem os arquivos
temporários, os 5 testes passam.

## 4. Verificação obrigatória (Node 22.23.2)

| Comando                                                                 | Resultado |
| ----------------------------------------------------------------------- | --------- |
| `npx tsc -p tsconfig.typecheck.json --noEmit`                           | exit 0    |
| `npx eslint <arquivos alterados>`                                       | exit 0    |
| `npx prettier --check <arquivos alterados>`                             | exit 0    |
| `vitest run tests/architecture.test.js`                                 | 1 arquivo / 5 testes PASS |
| `vitest run apps/api/src`                                               | 61 arquivos PASS, 1 SKIP; 306 testes PASS, 22 SKIP |
| `vitest run packages/persistence/src/__tests__ apps/worker/.../kernel-composition-state.test.ts` | 30 arquivos PASS, 7 SKIP; 195 testes PASS, 82 SKIP |
| `npm test` (suíte integral)                                             | exit 0; 265 arquivos PASS, 12 SKIP; 1879 testes PASS, 131 SKIP; 342 s |
| `npm run test:coverage`                                                 | exit 0; 88,81% stmts / 82,48% branch / 88,02% funcs / 89,34% lines (pisos 80%) |
| `npm run docs:check` + `tests/docs-integrity.test.js`/`docs-readiness.test.js` | exit 0; 12 testes PASS |

`TEST_DATABASE_URL` não estava definida; os testes PostgreSQL ficaram em SKIP,
como esperado. Uma tentativa de baseline de cobertura em worktree temporário do
HEAD foi interrompida por limpeza externa do diretório temporário (`/tmp/opencode`);
a neutralidade é garantida por construção: os módulos extraídos de
`postgres.ts` herdam a mesma exclusão de gate PostgreSQL
(`packages/persistence/src/postgres/**` em `vitest.config.mts`) e os módulos de
`server.ts` permanecem dentro de `apps/api/src`, já incluído no denominador.

## 5. Arquivos desta task

- Alterados: `apps/api/src/server.ts`, `packages/persistence/src/postgres.ts`,
  `vitest.config.mts`.
- Novos: `apps/api/src/server/{tenant-isolation,postgres-role-checks,bootstrap-persistence}.ts`,
  `packages/persistence/src/postgres/{types,migrations,outbox-support}.ts`,
  `tests/architecture.test.js`, este documento, o baseline e a ADR 0002.
- Intocados (por restrição): `docs/99_runtime_state.md`,
  `docs/20_master_execution_log.md`, `docs/30_backlog_master.md`,
  `certification/**`, `package.json`, `scripts/lib/phase11-rules.mjs`.
- Alterações de outras lanes no worktree foram preservadas (ex.: `apps/web`,
  `scripts/lib/certification-rules.mjs`, `playwright.config.ts`, `package.json`).

## 6. Riscos e pendências

- `kernel-composition.ts` e `composition.ts` seguem monolíticos (fora da fatia).
- Hooks de identidade observabilidade dentro de `server.ts` não foram extraídos.
- Caminhos legacy/governed continuam coexistindo; a remoção não é autorizada
  nesta rodada e não foi feita.
- Allowlist de ciclos de tipo é dívida técnica registrada; novos ciclos (de
  runtime ou de tipo) falham o gate.
- `npm test`/coverage foram executados enquanto outras lanes editavam `apps/web`;
  se o lead quiser um veredito final candidate-bound, repetir a suíte no digest
  final do programa.

## 7. Rollback

Reverter apenas: `apps/api/src/server.ts`, `packages/persistence/src/postgres.ts`,
`vitest.config.mts`, e remover os diretórios/módulos novos, o teste de
arquitetura e os documentos desta task. Nenhuma migration, contrato ou dado é
afetado.
