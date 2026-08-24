# 0321 — Controlled Construction Sprint 11

## Status

```txt
STATUS: COMPLETED
DATA: 2026-04-30T00:10:00-03:00
SPRINT: CC-S11 — Debug Correction Backlog Reconciliation and Runtime Evidence Consistency
ESCOPO: reconciliar evidence/readiness, traceability executavel, idempotencia PostgreSQL, format gate e validacao final reproduzivel
```

## Objetivo

Fechar os debitos P0/P1 restantes do backlog de debug correction antes de qualquer uso real ou gate final enterprise: `DBG-COR-01`, `DBG-COR-02`, `DBG-COR-04`, `DBG-COR-05`, `DBG-COR-06` e `DBG-COR-15`.

## Tasks executadas

### CC-S11-T01 — Readiness e evidence sincronizados

- Arquivos principais:
  - `docs/03_build/0310_construction_readiness_95.json`
  - `docs/03_build/0310_construction_readiness_95.md`
  - `docs/04_audit/0491_runtime_evidence.md`
- Evidencia:
  - Readiness agora possui politica machine-readable para impedir 100 enquanto houver P0/P1 aberto.
  - Apos fechamento do backlog P0/P1, score voltou a `100/100`.
  - Runtime evidence registra contagens atuais: 41 test files, 97 passed, 2 skipped; coverage 85.60% statements, 84.22% branches, 84.15% functions e 87.31% lines.
  - Evidence diferencia `npm run test:postgres` isolado com skips condicionais de PostgreSQL real efemero sem skips.

### CC-S11-T02 — Traceability executavel

- Arquivos principais:
  - `tests/docs-readiness.test.js`
  - testes adicionados sob `apps/web/src/features/*`
  - testes adicionados sob `packages/*/src/__tests__`
- Evidencia:
  - `tests/docs-readiness.test.js` valida que arquivos em `required_tests` da matriz existem.
  - Feature tests web foram criados para conversations, timeline, approvals, tasks e audit view.
  - Testes de workflows, tools, policy, agent-core, persistence e API foram adicionados para alinhar a matriz de traceability.

### CC-S11-T03 — Idempotencia PostgreSQL hardening

- Arquivos principais:
  - `packages/persistence/migrations/0000_initial.sql`
  - `packages/persistence/src/postgres.ts`
  - `packages/persistence/src/__tests__/postgres-migration-smoke.test.ts`
  - `apps/api/src/__tests__/postgres-persistence-mode.test.ts`
- Evidencia:
  - Migration documenta chave `inbound:<channel>:<externalMessageId>` em `idempotency`.
  - `PostgresRuntimeRepository.createWithSession` insere a chave de idempotencia dentro da mesma transacao que conversa, sessao e mensagem.
  - Duplicidade no mesmo canal e protegida por primary key de `idempotency`.
  - Mesmo `externalMessageId` em canal diferente e permitido.
  - PostgreSQL efemero real passou sem skips.

### CC-S11-T04 — Format gate e validacao final

- Arquivos principais:
  - `package.json`
  - `.github/workflows/verify.yml`
  - workspace formatado por Prettier
  - `docs/09_debug_corrections/0904_validation_matrix.json`
- Evidencia:
  - `npm run verify` agora executa `npm run format:check`.
  - `npm run format:check` passa em todo o workspace.
  - CI continua chamando `npm run verify`.
  - Matriz de validacao final registra todos os gates como PASS.

## Gates executados

| Gate                                                                                            | Resultado                                                                 |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `npm run format:check`                                                                          | PASS                                                                      |
| `npm run typecheck`                                                                             | PASS                                                                      |
| `npm run lint`                                                                                  | PASS                                                                      |
| `npm test`                                                                                      | PASS — 41 files, 97 passed, 2 skipped                                     |
| `npm run test:coverage`                                                                         | PASS — statements 85.60%, branches 84.22%, functions 84.15%, lines 87.31% |
| `npm run audit:security`                                                                        | PASS — 0 vulnerabilities                                                  |
| `npm run verify`                                                                                | PASS                                                                      |
| `npm run test:e2e`                                                                              | PASS — 1 file, 1 test                                                     |
| `npm run readiness`                                                                             | PASS — 1 file, 4 tests                                                    |
| `npm run test:postgres` sem `TEST_DATABASE_URL`                                                 | PASS — 2 files, 3 passed, 2 skipped condicionais                          |
| `TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:55432/cvg_test npm run test:postgres` | PASS — 2 files, 5 passed, 0 skips                                         |
| `PORT=3100 npx tsx apps/api/src/main.ts` + `/health` + webhook                                  | PASS — `success=true` em ambos                                            |

## Correcoes fechadas

- `DBG-COR-01`: readiness/evidence sincronizados.
- `DBG-COR-02`: traceability matrix executavel.
- `DBG-COR-04`: idempotencia PostgreSQL por chave transacional.
- `DBG-COR-05`: format gate integrado ao verify.
- `DBG-COR-06`: validacao final e runtime evidence atualizados.
- `DBG-COR-15`: evidencia CC-S10 reconciliada com gates reproduziveis.

## Limites preservados

- Sem dados reais.
- Sem producao irrestrita.
- Sem canais reais.
- Sem RAG real.
- Sem confirmacao, cancelamento ou reagendamento real.
- Sem acao clinica, financeira ou prontuario definitivo.
- Sem exporter externo de observabilidade.

## Proxima sprint recomendada

`CC-S12 — Controlled Pilot Boundary and Release Candidate Audit`: preparar auditoria de release candidate controlado, ainda sem liberar dados reais, canais reais, RAG real ou automacoes sensiveis.
