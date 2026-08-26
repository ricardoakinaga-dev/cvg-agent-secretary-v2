# Evidência de auditoria — PLAT-S42

## Identificação

- task: `PLAT-S42-001_CONTROLLED_TRACE_PROVENANCE_BOUNDARY`
- status: `COMPLETED_CONTROLLED`
- phase: `AUDIT`
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- data: `2026-08-26`
- escopo: contrato e proveniência de `TestRunTrace` no MVP controlado

## Problema e contrato

O `TestRunTrace` era somente uma interface TypeScript. A sanitização anterior
preservava spreads arbitrários, traces aninhados de suite não passavam pela
mesma regra e leituras PostgreSQL devolviam JSONB sem revalidação. O contrato
S42 exigiu uma projeção runtime allowlist/bounded, com IDs e enums oficiais,
datas válidas, coerência estrutural, redaction, output policy consistente,
provider exatamente `fake/deterministic-v1` e `externalCall: false`.

Dados extras são omitidos. Dados inválidos falham com `validation_failed` antes
de INSERT, de efeitos transacionais ou de retorno. Para rows PostgreSQL, os
campos `tenant_id`, `trace_id`, `agent_id`, `version_id` e `created_at` também
são confrontados com o corpo JSONB antes da devolução.

## Evidência TDD

### RED

Comando:

```text
npx vitest run packages/platform/src/__tests__/trace-governance.test.ts packages/platform/src/__tests__/test-suite-catalog.test.ts packages/persistence/src/__tests__/platform-control-plane-repository.test.ts --no-file-parallelism --maxWorkers=2
```

Resultado: 3 arquivos/16 testes, 9 falhas esperadas. Campo extra, provider
externo, estrutura/data inválida, trace aninhado de suite e JSON PostgreSQL
corrompido atravessavam a boundary anterior.

### GREEN focado

Comando executado com os seis arquivos focados da lane:

```text
npx vitest run packages/platform/src/__tests__/trace-governance.test.ts packages/platform/src/__tests__/test-suite-catalog.test.ts packages/platform/src/__tests__/platform-foundation.test.ts packages/platform/src/__tests__/output-policy.test.ts packages/platform/src/__tests__/critical-safety-preflight.test.ts packages/persistence/src/__tests__/platform-control-plane-repository.test.ts --no-file-parallelism --maxWorkers=2
```

Resultado: 6 arquivos/76 testes PASS. O conjunto cobre projeção de campos
desconhecidos, provider/external call, redaction, datas serializadas, spans,
usage, handoff/tool containers, suite nested, InMemory, PostgreSQL, ausência de
INSERT e divergência entre referências SQL e JSONB.

## Implementação auditada

- `packages/platform/src/trace-governance.ts`: schema runtime, projeção
  allowlist/bounded, coerência de output/handoff/tools/usage/spans e sanitização
  de suites;
- `packages/platform/src/control-plane-store.ts`: sanitização de traces diretos
  e de resultados de suite antes de armazenar;
- `packages/persistence/src/platform-control-plane-repository.ts`: sanitização
  de writes, mapper/suites, leitura fail-closed e comparação corpo/colunas;
- `packages/persistence/src/postgres.ts` e `apps/api/src/server.ts`: trace
  canonicalizado antes da continuação de efeitos runtime;
- fixtures e testes de InMemory, PostgreSQL, API e suite.

Não houve migração estrutural: o formato JSONB existente permanece compatível,
mas agora é validado na fronteira de leitura/escrita.

## Gates executáveis

| Gate                                                         | Resultado                                                          |
| ------------------------------------------------------------ | ------------------------------------------------------------------ |
| focused S42                                                  | 6 arquivos/76 testes PASS                                          |
| `npm test`                                                   | 124 arquivos PASS, 2 skipped; 492 testes PASS, 19 skipped          |
| `npm run test:coverage`                                      | 84,99% statements; 80,24% branches; 85,41% functions; 86,00% lines |
| `npm run typecheck`                                          | PASS                                                               |
| `npm run lint`                                               | PASS                                                               |
| `npm run format:check`                                       | PASS                                                               |
| `git diff --check`                                           | PASS                                                               |
| `npm run readiness`                                          | 4/4 PASS                                                           |
| `npm run test:worker:startup`                                | PASS — `queue_adapter_missing` smoke controlado                    |
| `npm run audit:security`                                     | 0 vulnerabilidades                                                 |
| `TEST_DATABASE_URL=...cvg_his_v2_test npm run test:postgres` | 8 arquivos/72 testes PASS                                          |
| `npm run test:e2e`                                           | 4/4 PASS                                                           |
| `npm run build`                                              | PASS — 70 módulos; 278,88 kB/gzip 81,99 kB                         |

O PostgreSQL usado na validação foi exclusivamente o banco de teste
`cvg_his_v2_test`. Os testes E2E usaram o servidor local controlado.

## Revisão e decisão

A tentativa de revisão independente final não foi executada porque o modelo
configurado não era suportado pela conta; ela não foi tratada como aprovação.
A inspeção estática local, os testes adversariais e os gates executáveis não
deixaram achado aberto conhecido dentro do escopo S42.

O lane está aprovado somente como `COMPLETED_CONTROLLED`. Não é autorização
para produção, dado real, IdP/tenant operacional, provider ou canal real, RAG,
agenda, financeiro, clínico, prontuário, broker, outbox, egress ou ação
sensível. Esses itens continuam bloqueados por decisão humana e infraestrutura
operacional.
