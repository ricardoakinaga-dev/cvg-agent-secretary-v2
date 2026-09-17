# AUD17-09 — qualidade, cobertura e perturbação

**Status:** `VERIFIED_LOCAL`
**Ambiente:** Node `22.23.2`; dados sintéticos; PostgreSQL descartável dedicado
para a matriz persistente.

## Gate matrix atual

| Gate | Resultado |
| --- | --- |
| `npm run format:check` | PASS |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS; Vite produziu o bundle web |
| `npm test` | PASS; 255 files, 1.792 tests; 10 files/117 tests skipped |
| `npm run test:coverage` | PASS; statements 89.45%, branches 82.76%, functions 88.68%, lines 89.99% |
| `npm run test:e2e` | PASS; 9/9 |
| `npm run test:evals` | PASS; 8/8 |
| `npm run test:chaos` | PASS; 18/18; 2 skips |
| `npm run audit:security` | PASS; 0 high+ vulnerabilities |
| `npm run licenses:check` | PASS; 372 componentes, 0 denied/unclassified |
| `npm run test:postgres` | PASS; 23 files/202 tests; nenhum teste PostgreSQL foi pulado nessa execução |

Os skips da suíte unitária continuam explicitamente não prova de cenários não
exercitados. A execução PostgreSQL desta emissão foi feita em banco descartável
isolado. E2E visual usa dados sintéticos interceptados e snapshots atualizados;
isso não é confundido com read model populado de produção.

## Lacunas

Não há mutation runner independente configurado no package script. O score de
maturidade deve manter essa limitação e não há redução de threshold. A cobertura
física de backup/restore e RPO/RTO segue externa.
