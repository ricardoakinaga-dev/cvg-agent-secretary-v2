# Evidência de auditoria — PLAT-S44

## Identificação

- task: `PLAT-S44-001_CONTROLLED_TRACE_STAGE_TIMING`
- status: `COMPLETED_CONTROLLED`
- phase: `AUDIT`
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- data: `2026-08-26`
- escopo: medição local de duração dos estágios do trace controlado

## Gap e contrato

S43 tornou timing e ordem verificáveis, mas `createTraceSpans` ainda preenchia
`durationMs: 0` estático. S44 adicionou `createControlledTraceTiming`, um
ledger bounded com clock monotônico injetável, e integrou-o ao executor:

- clock fake permite testes determinísticos; o clock default usa
  `globalThis.performance.now()`;
- cada medição é finita, não negativa e bounded; snapshots são cópias e não
  permitem mutação do ledger interno;
- etapas executadas alimentam os spans; etapas skipped permanecem em zero e a
  soma é ajustada para permanecer compatível com a latência do trace;
- clock inválido/não monotônico falha com `validation_failed`, sem payload,
  policy nova, exporter ou efeito externo.

## Evidência TDD

### RED

Comando:

```text
npx vitest run packages/platform/src/__tests__/test-lab-events.test.ts --no-file-parallelism --maxWorkers=2
```

Resultado: 2 testes, 1 falha esperada: `createControlledTraceTiming` não
existia e os spans não tinham ledger/clock injetável.

### GREEN focado

Comando:

```text
npx vitest run packages/platform/src/__tests__/test-lab-events.test.ts packages/platform/src/__tests__/trace-governance.test.ts --no-file-parallelism --maxWorkers=2
```

Resultado: 2 arquivos/17 testes PASS (a última execução focada após adicionar
os casos de clock foi validada em 2 arquivos/17 testes). Typecheck e lint
passaram.

## Implementação auditada

- `packages/platform/src/test-lab.ts`: `ControlledTraceTiming`, clock
  monotônico, medição sync/async, snapshot defensivo e integração das etapas
  normalize/context/intent/policy/knowledge/prompt/model/response/handoff/tool;
- `packages/platform/src/__tests__/test-lab-events.test.ts`: clock fake,
  medição async, monotonicidade e isolamento de snapshot;
- `packages/platform/src/__tests__/trace-governance.test.ts`: invariantes S43
  preservam soma e coerência das durações;
- `packages/platform/src/index.ts`: export público segue coberto pelo teste.

Não foi criado exporter, integração OTel, broker, canal/provider real, rede,
payload de usuário ou migração estrutural.

## Gates executáveis

| Gate                                                         | Resultado                                                          |
| ------------------------------------------------------------ | ------------------------------------------------------------------ |
| focused S44                                                  | 2 arquivos/17 testes PASS                                          |
| `npm test`                                                   | 124 arquivos PASS, 2 skipped; 501 testes PASS, 19 skipped          |
| `npm run test:coverage`                                      | 85,18% statements; 80,44% branches; 85,70% functions; 86,16% lines |
| `npm run typecheck`                                          | PASS                                                               |
| `npm run lint`                                               | PASS                                                               |
| `npm run format:check`                                       | PASS                                                               |
| `git diff --check`                                           | PASS                                                               |
| `npm run readiness`                                          | 4/4 PASS                                                           |
| `npm run test:worker:startup`                                | PASS — smoke controlado                                            |
| `npm run audit:security`                                     | 0 vulnerabilidades                                                 |
| `TEST_DATABASE_URL=...cvg_his_v2_test npm run test:postgres` | 8 arquivos/72 testes PASS                                          |
| `npm run test:e2e`                                           | 4/4 PASS                                                           |
| `npm run build`                                              | PASS — 70 módulos; 278,88 kB/gzip 81,99 kB                         |

PostgreSQL usou somente `cvg_his_v2_test`; E2E usou o servidor local
controlado. Não houve dado real ou side effect.

## Revisão e decisão

A revisão independente final não foi executada porque o modelo configurado não
era suportado pela conta; não foi tratada como aprovação. A inspeção estática,
os testes adversariais e os gates executáveis não deixaram achado aberto
conhecido no escopo S44.

Resultado máximo: `COMPLETED_CONTROLLED`. Produção real continua `NO-GO`/
`WAITING_HUMAN_APPROVAL`; ações clínicas, financeiras, de prontuário, agenda,
RAG, provider/canal, egress e rollout continuam bloqueados.
