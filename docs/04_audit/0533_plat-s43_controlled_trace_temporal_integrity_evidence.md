# Evidência de auditoria — PLAT-S43

## Identificação

- task: `PLAT-S43-001_CONTROLLED_TRACE_TEMPORAL_INTEGRITY`
- status: `COMPLETED_CONTROLLED`
- phase: `AUDIT`
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- data: `2026-08-26`
- escopo: integridade temporal e ordinal do `TestRunTrace` no MVP controlado

## Gap e contrato

Após S42, o trace já era allowlisted e bounded, mas `createTraceSpans` emitia
durações estáticas e a boundary não relacionava `startedAt`, `completedAt`,
`latencyMs`, ordem ou status dos spans. S43 adicionou invariantes
determinísticas sem inventar telemetria externa:

- timestamps e latência, quando presentes, aparecem juntos; o intervalo é
  ordenado e `latencyMs` é exatamente a diferença em milissegundos;
- spans continuam opcionais, seguem ordem canônica, têm soma não superior à
  latência e status derivado coerente com policy, knowledge, tools, handoff e
  delivery;
- traces legados sem esses campos opcionais continuam válidos;
- não há OTel, exporter, broker, rede, provider/canal real ou side effect.

## Evidência TDD

### RED

Comando:

```text
npx vitest run packages/platform/src/__tests__/trace-governance.test.ts --no-file-parallelism --maxWorkers=2
```

Resultado: 1 arquivo/14 testes, com 6 falhas esperadas. A boundary anterior
aceitava timing parcial/invertido, latência incompatível, spans fora da ordem,
duração acumulada excessiva e status derivado divergente.

### GREEN focado

O mesmo comando passou 1 arquivo/14 testes. Typecheck, lint e `git diff --check`
passaram. O focused cobre também a compatibilidade de traces sem telemetria
opcional.

## Implementação auditada

`packages/platform/src/trace-governance.ts` valida o conjunto temporal completo,
ordena spans pela sequência canônica, limita a duração acumulada à latência e
deriva os status esperados. `packages/platform/src/__tests__/trace-governance.test.ts`
contém os casos RED/GREEN e regressões de compatibilidade.

A lane não alterou provider, canal, event exporter ou persistência estrutural.
As durações que ainda sejam zero representam telemetria não medida do MVP
controlado; a instrumentação monotônica dos estágios é um próximo lane
separado, não uma inferência fabricada por S43.

## Gates executáveis

| Gate                                                         | Resultado                                                          |
| ------------------------------------------------------------ | ------------------------------------------------------------------ |
| focused S43                                                  | 1 arquivo/14 testes PASS                                           |
| `npm test`                                                   | 124 arquivos PASS, 2 skipped; 499 testes PASS, 19 skipped          |
| `npm run test:coverage`                                      | 85,08% statements; 80,41% branches; 85,45% functions; 86,08% lines |
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

Os testes PostgreSQL usaram exclusivamente `cvg_his_v2_test`; E2E usou o
servidor local controlado.

## Revisão e decisão

A revisão independente final não foi executada porque o modelo configurado não
era suportado pela conta; não foi tratada como aprovação. A inspeção estática
local, os testes adversariais e os gates executáveis não deixaram achado aberto
conhecido dentro do escopo S43.

Resultado máximo: `COMPLETED_CONTROLLED`. Produção real continua `NO-GO`/
`WAITING_HUMAN_APPROVAL`; nenhum dado real, ação clínica/financeira/de
prontuário, agenda, RAG, provider/canal, egress ou side effect foi ativado.
