# Evidência de auditoria — PLAT-S10 Control Center do catálogo declarativo

## Identificação

- timestamp do fechamento: `2026-08-24T21:13:45-03:00`
- task: `PLAT-S10-001_PLUGIN_CATALOG_CONTROL_CENTER`
- fase: `DISCOVERY -> PRD -> SPEC -> BUILD -> AUDIT`
- release máximo: `CONTROLLED_MVP_READY`
- base: `4c83c13` (`main`), snapshot controlado publicado no remoto
- dados: fixtures e manifests fictícios; nenhuma chamada externa ou side effect

## Gap e entrega controlada

A auditoria S09 encontrou uma lacuna real de superfície: o catálogo tenant-aware
de manifests tinha contratos, persistência e API, mas não estava disponível no
Control Center. O S10 fechou somente essa superfície, mantendo o boundary
metadata-only.

- `apps/web/src/api/client.ts` agora tipa `PlatformPluginCatalogView` e expõe
  list/create/transition pelas rotas S09 existentes.
- Cada chamada usa `x-operator-id`, `x-operator-role` e `x-tenant-id`; transições
  enviam `expectedStatus` e não fazem retry automático.
- `apps/web/src/features/platform/index.tsx` agora lista sob demanda, cria
  manifests validados e exibe DRAFT/APPROVED/ARCHIVED, actor e versão.
- O manifest criado pelo formulário contém somente `name`, `version`,
  capabilities, permissions, tools, hooks, dependencies e
  `configSchemaVersion`; campos de segredo, handler, código executável,
  provider, canal e instalação não são construídos nem enviados.
- `APPROVED` é exibido como metadata revisada com execução ainda bloqueada;
  nenhuma aprovação conecta o catálogo ao registry/gateway.
- `409/conflict` é diferenciado de erro de validação e orienta recarregar o
  catálogo.
- O E2E browser/API cobre criação e aprovação de um manifest fictício.

## Evidência TDD

### RED antes do BUILD

Com os testes adicionados e sem a implementação do client/UI, o comando focado
falhou de forma esperada:

```text
npx vitest run --no-file-parallelism --maxWorkers=2 \
  apps/web/src/api/client.test.ts \
  apps/web/src/__tests__/platform-panel.test.tsx

Test Files  2 failed (2)
Tests       3 failed | 3 passed (6)
Falhas: botões do catálogo ausentes e
apiClient.listPlatformPluginCatalog is not a function
```

### GREEN após o BUILD

O mesmo foco, após implementação e correções de tipagem/formatação:

```text
Test Files  2 passed (2)
Tests       7 passed (7)
```

Os testes cobrem headers tenant-aware, lista vazia, criação metadata-only sem
segredo/código, aprovação com `expectedStatus`, arquivamento no client,
conflito stale e validação local de nome/versão/tool antes de chamar a API.

## Gates finais

| Gate                           | Resultado                                                                 |
| ------------------------------ | ------------------------------------------------------------------------- |
| `npm run verify`               | PASS — format, typecheck, lint, build, 257 testes, coverage e audit       |
| `npm test`                     | PASS — 72 arquivos; 257 testes pass; 16 skips condicionais; 273 total     |
| `npm run test:coverage`        | PASS — statements 84,97%; branches 80,21%; functions 84,93%; lines 85,90% |
| `npm run readiness`            | PASS — 1 arquivo; 4 testes                                                |
| `npm run test:e2e`             | PASS — 1 fluxo Playwright; criação/aprovação de catálogo incluída         |
| `npm run test:postgres`        | PASS — 4 arquivos; 49 testes pass; 16 skips condicionais                  |
| `npm audit --audit-level=high` | PASS — 0 vulnerabilidades                                                 |
| `git diff --check`             | PASS — nenhum erro de whitespace                                          |

Os skips PostgreSQL permanecem condicionais à infraestrutura local e não são
tratados como evidência de rollout real, HA, RLS de produção ou dados reais.

## Auditoria de segurança e efeitos

- não foram adicionadas migrations, downloads, marketplace, health probes,
  handlers persistentes, provider/canal, rede ou dispatcher;
- o payload de criação é derivado de campos metadata-only e os testes rejeitam
  a presença textual de `apiKey`, `secret`, `handler`, `sourceCode` e
  `executable`;
- o cliente não usa o estado `APPROVED` para habilitar plugin lógico ou gateway;
- o Control Center mantém `realChannels`, `realRag`, `realPayments` e
  `realMedicalRecords` desabilitados no fluxo legado de configuração;
- nenhuma confirmação, cancelamento, reagendamento, ação clínica, financeira,
  prontuário, RAG sem fonte aprovada ou despacho real foi criado.

## Decisão

`PLAT-S10-001 = COMPLETED_CONTROLLED`.

O máximo autorizado continua `CONTROLLED_MVP_READY`. O release real permanece
`PRODUCTION_REAL_DATA_READY = NO-GO`/`WAITING_HUMAN_APPROVAL` por IdP e tenant
binding operacional, rollout/RLS do data plane legado, roles e secret manager,
limiter/replay distribuídos, host security, retenção/PII, providers/canais,
knowledge institucional, marketplace/handlers executáveis e decisões humanas.

A revisão independente não foi reivindicada: child agents permaneceram
indisponíveis por limite de conta/incompatibilidade de modelo. O fechamento foi
lead-only, apoiado por RED/GREEN, inspeção temporal do diff, gates executáveis,
E2E e revisão de segurança estática.
