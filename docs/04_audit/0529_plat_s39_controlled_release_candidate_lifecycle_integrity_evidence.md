# Evidência — PLAT-S39-001

## Identificação

- task: `PLAT-S39-001_CONTROLLED_RELEASE_CANDIDATE_LIFECYCLE_INTEGRITY`
- data: `2026-08-26`
- pipeline: `DISCOVERY -> PRD -> SPEC -> BUILD -> AUDIT`
- ambiente: fixtures fictícias, memória, PostgreSQL 16 descartável e browser
  local; nenhum dado real, provider, canal, RAG, deploy ou efeito externo
- resultado: `COMPLETED_CONTROLLED`

## Gap e contrato

A transição `DRAFT -> VALIDATED` aceitava gates formalmente válidos sem
recomputar o `evidenceDigest` do registro carregado. O mapper PostgreSQL ainda
convertia `gate_results` não-array em lista vazia, e uma RC já persistida como
`VALIDATED` poderia carregar `validatedBy === createdBy`.

O contrato final exige, antes de qualquer mutação:

- schema strict dos quatro gates fixos, todos `PASS`;
- digest canônico recomputado com tenant, agente, versão e gates do próprio
  candidate;
- validador diferente de `createdBy` na transição e na autoridade de
  publish/rollback;
- parser compartilhado fail-closed para `gate_results` no PostgreSQL;
- constraint aditiva no banco que rejeita `validated_by = created_by`.

## RED, correção e GREEN

RED inicial, executado antes do BUILD:

```text
npx vitest run packages/platform/src/__tests__/release-candidate-ledger.test.ts packages/persistence/src/__tests__/release-candidate-repository.test.ts
```

Resultado: 2 arquivos/6 testes; 4 passaram e 2 falharam como esperado. Tanto
InMemory quanto PostgreSQL aceitaram digest adulterado ao escrever
`VALIDATED`, sem produzir qualquer efeito externo.

Após o primeiro GREEN, a revisão independente encontrou um risco HIGH de
autoatestação pelo criador e um risco MEDIUM de mascaramento de JSON corrompido
no mapper. Os testes corretivos reproduziram esses casos antes da correção.

GREEN final:

```text
npx vitest run packages/platform/src/__tests__/release-candidate-ledger.test.ts packages/platform/src/__tests__/publish-evidence-authority.test.ts packages/persistence/src/__tests__/release-candidate-repository.test.ts packages/persistence/src/__tests__/postgres-migration-smoke.test.ts apps/api/src/__tests__/release-candidate-ledger.test.ts apps/api/src/__tests__/publish-evidence-authority.test.ts apps/web/src/features/platform/release-candidate-ledger.test.tsx
```

Resultado: 7 arquivos/23 testes aprovados/1 skip condicional. A cobertura inclui
transição íntegra, digest adulterado, self-validation no core e HTTP, RC
persistida auto-atestada na autoridade de publish, JSON PostgreSQL malformado,
constraint da migration, fixture controlada e UI com identidade de validador
distinta.

## Implementação

- `packages/platform/src/release-candidate.ts`: parser bounded, digest
  recomputável, independência do validador e autoridade comum de
  publish/rollback;
- `packages/platform/src/control-plane-store.ts`: validação independente e de
  evidência antes de preencher metadata de `VALIDATED`;
- `packages/persistence/src/platform-control-plane-repository.ts`: mesma
  regra sob `FOR UPDATE`/CAS e mapper sem fallback para JSON inválido;
- `packages/persistence/migrations/0009_release_candidate_validator_integrity.sql`:
  constraint aditiva `validated_by IS DISTINCT FROM created_by`;
- `packages/platform/src/secretary-preset.ts` e
  `apps/web/src/features/platform/index.tsx`: fixtures/control center usam
  identidade de revisão distinta e exibem criador/validador;
- testes em platform, persistence, API, UI e PostgreSQL comprovam falha sem
  mutação.

## Gates executáveis

| Gate                                                                                                  | Resultado                                                                 |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `npm test`                                                                                            | PASS — 120 arquivos; 438 testes; 19 skips condicionais                    |
| `npm run test:coverage`                                                                               | PASS — statements 85,08%; branches 80,16%; functions 85,18%; lines 86,08% |
| `npm run readiness`                                                                                   | PASS — 4 testes                                                           |
| `npm run test:worker:startup`                                                                         | PASS — `worker.startup_smoke_passed`, `queue_adapter_missing`             |
| `TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/cvg_his_v2_test npm run test:postgres` | PASS — 8 arquivos; 72 testes                                              |
| `npm run test:e2e`                                                                                    | PASS — 4 testes Playwright                                                |
| `npm run build` / `npm run typecheck`                                                                 | PASS                                                                      |
| `npm run lint` / `npm run format:check`                                                               | PASS                                                                      |
| `npm run audit:security`                                                                              | PASS — 0 vulnerabilidades                                                 |
| `git diff --check`                                                                                    | PASS                                                                      |

## Revisão e decisão

A revisão independente final retornou `PASS sem achados`, após a correção do
boundary de autoridade persistida. O resultado máximo desta lane é
`CONTROLLED_MVP_READY`.

Esta evidência não autoriza IdP real, tenant binding operacional, rollout RLS
em banco real, limiter/replay distribuído, host security, retenção/PII,
providers, canais, RAG, egress, broker, outbox, deploy, agenda, financeiro,
clínico, prontuário ou qualquer side effect. Produção real permanece
`NO-GO` / `WAITING_HUMAN_APPROVAL`.
