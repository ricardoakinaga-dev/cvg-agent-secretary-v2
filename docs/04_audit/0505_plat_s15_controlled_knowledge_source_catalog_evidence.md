# Evidência — PLAT-S15-001 Controlled Knowledge Source Catalog

## Identificação

- task: `PLAT-S15-001_CONTROLLED_KNOWLEDGE_SOURCE_CATALOG`
- timestamp do fechamento controlado: `2026-08-25T11:03:13-03:00`
- pipeline: `DISCOVERY -> PRD -> SPEC -> BUILD -> AUDIT`
- base: `f9e0096` (`main`) + checkout controlado não publicado
- revisão: lead-only; child agents rejeitaram execução por limite de uso/modelo
- dados: fixtures fictícias; nenhum provider, canal, conteúdo institucional ou
  efeito externo foi usado

## Resultado

O lane implementou um catálogo tenant-aware de identidade de fontes de
knowledge, sem conteúdo. Cada registro contém apenas `source`, `version`,
`label`, `description`, status, actor e timestamps. `source` aceita somente
`controlled://`; URI externa, campos extras, padrões de segredo e valores fora
dos limites falham na fronteira.

O lifecycle permitido é `DRAFT -> APPROVED -> ARCHIVED` ou
`DRAFT -> ARCHIVED`. `expectedStatus` mantém compare-and-swap e retorna
conflito quando o snapshot está stale. `APPROVED` é somente metadata de
governança: não altera `AgentVersion`, não alimenta RAG, não cria conteúdo e
não libera provider, canal, capability ou dispatch.

## Implementação verificada

- `packages/platform/src/ids.ts`: `KnowledgeSourceId` bounded.
- `packages/platform/src/contracts.ts`: schemas strict de criação/transição e
  record metadata-only, incluindo proteção contra padrões de segredo.
- `packages/platform/src/control-plane-store.ts`: store em memória com cópia
  defensiva, unique por tenant e matriz de lifecycle fail-closed.
- `packages/persistence/migrations/0005_knowledge_source_catalog.sql`:
  constraints, unique `(tenant_id, source, version)`, trigger de identidade e
  status, índice, `FORCE ROW LEVEL SECURITY` e política tenant-aware.
- `packages/persistence/src/platform-control-plane-repository.ts` e
  `tenant-scoped-postgres.ts`: SQL parametrizado, transição transacional e
  contexto de tenant.
- `apps/api/src/server.ts`: rotas admin de criação, listagem, detalhe e
  transição; identidade `agent:configure`; audit sem descrição/conteúdo.
- `apps/web/src/api/client.ts` e `apps/web/src/features/platform/index.tsx`:
  catálogo sob demanda, campos metadata-only, criação/aprovação/arquivamento e
  mensagens explícitas de ausência de RAG.

## Evidência RED/GREEN

- RED inicial falhou nos três boundaries esperados: schema/store ausentes,
  endpoint 404 e Control Center sem a superfície de catálogo.
- GREEN cobriu schema, duplicidade, cópia defensiva, lifecycle, stale 409,
  isolamento entre tenants, API, UI, adapter PostgreSQL stateful e E2E.
- A regressão de cobertura causada pelo formulário que reutilizava a versão do
  snapshot foi corrigida separando os campos metadata-only do editor do agente.

## Gates executáveis

| Gate                           | Resultado                                                                        |
| ------------------------------ | -------------------------------------------------------------------------------- |
| `npm run verify`               | PASS após o fechamento; format, typecheck, lint, build, testes, coverage e audit |
| `npm test`                     | PASS — 83 arquivos, 294 testes pass, 17 skips, 311 total                         |
| `npm run test:coverage`        | PASS — 85,03% statements, 80,26% branches, 85,41% functions, 85,88% lines        |
| `npm run readiness`            | PASS — 1 arquivo, 4 testes                                                       |
| `npm run test:e2e`             | PASS — 1 fluxo Playwright; catálogo criado/aprovado sem editar snapshot          |
| `npm run test:postgres`        | PASS — 49 testes pass, 17 skips condicionais sem `TEST_DATABASE_URL`             |
| `npm audit --audit-level=high` | PASS — 0 vulnerabilidades                                                        |
| `git diff --check`             | PASS                                                                             |

## Segurança e limites preservados

- Nenhum conteúdo documental, upload, crawler, URL externa, embedding, vector
  store ou resposta RAG foi adicionado.
- Nenhuma fonte aprovada é conectada automaticamente ao Test Lab ou a um
  `AgentVersion`.
- Nenhum segredo é aceito em URI, versão, label ou descrição; os audit events
  carregam apenas identidade da fonte, versão e status.
- Nenhuma chamada de provider/canal, confirmação/cancelamento/reagendamento,
  ação clínica/financeira/prontuário ou dispatch foi executada.
- O release controlado permanece `CONTROLLED_MVP_READY`; produção real é
  `NO-GO`/`WAITING_HUMAN_APPROVAL` e exige novo SPEC, IdP/infraestrutura e
  decisões humanas.
