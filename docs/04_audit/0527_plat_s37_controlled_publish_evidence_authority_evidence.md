# Evidência — PLAT-S37-001

## Identificação

- task: `PLAT-S37-001_CONTROLLED_PUBLISH_EVIDENCE_AUTHORITY_BOUNDARY`
- data: `2026-08-26`
- pipeline: `DISCOVERY -> PRD -> SPEC -> BUILD -> AUDIT`
- ambiente: fixtures fictícias, memória, PostgreSQL 16 descartável e browser
  local; nenhum dado real, deploy ou efeito externo
- resultado: `COMPLETED_CONTROLLED`

## Boundary verificado

Publish e rollback agora exigem `releaseCandidateId` e revalidam, no servidor,
um candidato do mesmo tenant, agente e versão. A autoridade compartilhada exige
status `VALIDATED`, metadados de validação, os quatro gates fixos em `PASS` e
digest recomputável idêntico ao armazenado. A API executa o preflight crítico
server-side e o store/repositório repete as invariantes antes da mutação.

No rollback, a evidência autoriza somente a versão fonte; a operação cria um
novo snapshot, percorre `DRAFT -> TESTING -> APPROVED` e publica internamente o
snapshot derivado. O candidato não é usado como grant de produção nem libera
provider, canal, RAG, egress, broker, outbox ou side effect.

Arquivos principais:

- `packages/platform/src/release-candidate.ts`
- `packages/platform/src/control-plane-store.ts`
- `packages/persistence/src/platform-control-plane-repository.ts`
- `packages/persistence/src/tenant-scoped-postgres.ts`
- `apps/api/src/server.ts`
- `apps/web/src/api/client.ts`
- `apps/web/src/features/platform/index.tsx`

## RED e GREEN

O RED foi executado antes do BUILD com:

```text
npx vitest run packages/platform/src/__tests__/publish-evidence-authority.test.ts apps/api/src/__tests__/publish-evidence-authority.test.ts
```

Resultado RED: 2 arquivos, 4 testes com falhas esperadas. Publish/rollback sem
candidato atravessavam o boundary e o contrato da API ainda não aceitava o
campo obrigatório.

Após a implementação, o focused GREEN passou em 2 arquivos/5 testes,
cobrindo ausência de candidato, candidato `VALIDATED`, status inválido,
binding divergente e digest adulterado. A regressão de persistence e runtime
também passou.

## Gates executáveis

| Gate                                                                                                  | Resultado                                                                 |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `npm test`                                                                                            | PASS — 119 arquivos; 427 testes pass; 19 skips condicionais               |
| `npm run test:coverage`                                                                               | PASS — statements 84,92%; branches 80,08%; functions 85,08%; lines 85,92% |
| `npm run readiness`                                                                                   | PASS — 1 arquivo; 4 testes                                                |
| `npm run test:worker:startup`                                                                         | PASS — `worker.startup_smoke_passed`, `queue_adapter_missing`             |
| `TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/cvg_his_v2_test npm run test:postgres` | PASS — 8 arquivos; 71 testes                                              |
| `npm run test:e2e`                                                                                    | PASS — 4 testes Playwright                                                |
| `npm run typecheck` / `npm run lint`                                                                  | PASS                                                                      |
| `npm run build`                                                                                       | PASS — typecheck e bundle web Vite                                        |
| `npm run audit:security`                                                                              | PASS — 0 vulnerabilidades                                                 |
| `npm run format:check` / `git diff --check`                                                           | PASS                                                                      |

## Auditoria

A revisão estática local percorreu todas as implementações e chamadas de
`publishVersion`/`rollback`, confirmou body strict na API, filtros
`tenant_id`, lock do candidato na mesma transação PostgreSQL, repetição da
validação no store e seleção fail-closed na UI. Duas tentativas de crítica por
subagente não concluíram por indisponibilidade/timeout do ambiente; por isso
esta evidência não atribui aprovação a um revisor externo inexistente. O
resultado controlado baseia-se nos testes acima e nessa auditoria explícita.

## Limites e decisão

`CONTROLLED_MVP_READY` permanece válido para fixtures controladas.
`PRODUCTION_REAL_DATA_READY` permanece `NO-GO` / `WAITING_HUMAN_APPROVAL`.
Ainda são proibidos dados reais, migração destrutiva, rollout, provider/canal,
RAG, agenda, financeiro, clínico, prontuário e qualquer ação sensível sem
aprovação humana e infraestrutura operacional comprovada.
