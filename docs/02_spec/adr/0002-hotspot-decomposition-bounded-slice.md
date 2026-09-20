# ADR 0002 — Decomposição de hotspots em fatia limitada com fronteiras executáveis

- Status: `ACCEPTED` (decisão técnica de AUD19-07; não altera contratos públicos).
- Data: 2026-09-20. Programa: `AUD19-REM`. Task: `AUD19-07`.
- Contexto normativo: auditoria [0566](../../04_audit/0566_full_repository_gauntlet_audit_2026-09-19.md) (P2-MAINT-01), [backlog 0332](../../03_build/0332_aud20260919_backlog.md) (AUD19-07), [ADR 0001](0001-langgraph-frontier-decision.md) (fronteira de composição), baseline [AUD19-07-baseline](../../04_audit/evidence/AUD19/AUD19-07-baseline.md).

## Contexto

`apps/api/src/server.ts` (6.215 linhas) e `packages/persistence/src/postgres.ts`
(4.221 linhas) concentravam schema/RLS, papéis PostgreSQL, composição de
persistência, migrações e suporte de outbox em dois arquivos. O backlog exige
decompor sem big-bang, sem mudar contratos, com architecture tests contra
dependências proibidas/ciclos e com redução mensurável do hotspot.

Restrições vigentes: sem dependência nova, sem remover caminhos legacy, sem
reduzir cobertura, sem alterar mensagens/thresholds observados por testes.

## Decisão

1. **Extração mecânica em cinco módulos coesos + um arquivo de tipos
   compartilhados**, com re-export dos arquivos originais preservando exatamente a
   superfície pública (snapshot antes/depois em `tests/architecture.test.js`):
   - `apps/api/src/server/tenant-isolation.ts` — verificação de schema/RLS/migração
     e replay de webhook (3 funções públicas).
   - `apps/api/src/server/postgres-role-checks.ts` — separação de papéis runtime/
     migração (3 funções públicas + 2 helpers internos).
   - `apps/api/src/server/bootstrap-persistence.ts` — composição de persistência e
     hooks default do agent runtime; passou a declarar
     `AgentRuntimeOptions`/`InboundRuntimeCompletion` e o tipo interno
     `RuntimePersistence`.
   - `packages/persistence/src/postgres/migrations.ts` — runner de migrações com
     checksum, baseline legacy 0000 e manifestos legacy.
   - `packages/persistence/src/postgres/outbox-support.ts` — mapeamento/validação/
     sanitização de outbox, lease/backoff e auditoria de outbox.
   - `packages/persistence/src/postgres/types.ts` — contratos de tipo
     compartilhados (`PostgresQueryable`, `PostgresTransactionClient`,
     `DurableOutboxStatus`, `DurableOutboxEventRecord`).
2. **Architecture tests executáveis** em `tests/architecture.test.js`, sem
   dependências novas: fronteira LangGraph (ADR 0001), imports profundos entre
   workspaces, ciclos de import (runtime proibido; tipo com allowlist congelada),
   hotspots que não crescem com responsabilidade declarada, e snapshot de exports.
3. **Cobertura neutra**: os módulos extraídos de PostgreSQL herdam a exclusão já
   justificada de `packages/persistence/src/postgres.ts`
   (`packages/persistence/src/postgres/**` em `vitest.config.mts`), pois têm o
   mesmo gate PostgreSQL dedicado e não inflam o denominador unitário.
4. **Nada além da fatia**: `apps/worker/src/kernel-composition.ts` (1.900 linhas),
   `packages/agent-runtime/src/composition.ts` (340) e os caminhos
   legacy/governed em si não são decompostos nem removidos nesta rodada.

## Alternativas consideradas

- **Big-bang por domínio em um único PR**: rejeitado; o roadmap exige fatias
  mensuráveis e a janela concorrente é compartilhada.
- **Remover caminhos legacy agora**: rejeitado; a task proíbe remoção e a
  auditoria registra a coexistência como risco documentado, não como autorização
  de deleção.
- **Adicionar `dependency-cruiser`/parser AST de terceiros**: rejeitado por
  "sem novas dependências"; a análise estática regex/grafo cobre os gates
  pedidos e é verificável no próprio teste.
- **Mover código sem re-export**: rejeitado; quebraria consumidores e o requisito
  de entrypoints estáveis.

## Consequências

- Redução medida: `server.ts` 6.215 → 4.958 linhas (−20,2%); `postgres.ts`
  4.221 → 3.441 (−18,5%), sem alteração de comportamento observado pela suíte.
- Exports públicos idênticos (17 em `server.ts`, 24 em `postgres.ts`); nenhum
  símbolo novo foi adicionado a esses arquivos.
- Os ciclos **somente de tipo** pré-existentes (`schema.ts` ↔
  `audit-evidence-checkpoint.ts`; `plugin-gateway.ts` ↔ `event-bus.ts`;
  `plugin-gateway.ts` ↔ `tool-invocation-boundary.ts`) permanecem em allowlist
  congelada e documentados; qualquer ciclo de runtime novo falha o teste.
- Imports profundos cross-workspace em produção passam a falhar; as exceções
  atuais são apenas fixtures de teste e entrypoints/testes compartilhando
  `scripts/lib/*` (registradas no teste).
- Toda futura extração deve atualizar o snapshot de exports e a lista de módulos
  no teste; remoção de símbolo público falha o gate.

## Pendências explícitas

- `kernel-composition.ts` e `composition.ts`: decomposição não executada nesta
  fatia (fronteira ADR 0001 preservada).
- Hooks de identidade/observabilidade dentro de `server.ts`: extração adiada.
- Caminhos legacy/governed coexistentes: isolados por documentação/testes, sem
  deleção.
- Limpeza dos ciclos de tipo allowlistados depende de mudança de assinatura em
  `packages/persistence`/`packages/platform`, fora do escopo desta task.
