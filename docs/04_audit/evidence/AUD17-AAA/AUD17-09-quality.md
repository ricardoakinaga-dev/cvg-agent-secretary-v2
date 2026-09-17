# AUD17-09 — qualidade, cobertura e perturbação

**Status:** VERIFIED_LOCAL_WITH_REQUIRED_PG_SKIPS
**Ambiente:** Node `22.23.2`; dados sintéticos.

## Gate matrix atual

| Gate | Resultado |
| --- | --- |
| `npm run format:check` | PASS |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS; Vite produziu o bundle web |
| `npm test` | PASS; 255 files, 1.783 tests; 10 files/117 tests skipped |
| `npm run test:coverage` | PASS; statements 89.52%, branches 82.77%, functions 88.59%, lines 90.06% |
| `npm run test:e2e` | PASS; 9/9 |
| `npm run test:evals` | PASS; 8/8 |
| `npm run test:chaos` | PASS; 18/18; 2 skips |
| `npm run audit:security` | PASS; 0 high+ vulnerabilities |
| `npm run licenses:check` | PASS; 372 componentes, 0 denied/unclassified |
| `npm run test:postgres` | 14 files/86 tests PASS; 9 files/115 tests skipped |

Os skips PostgreSQL foram preservados como não prova. E2E visual usa dados sintéticos interceptados e snapshots atualizados para as mudanças intencionais; isso não é confundido com read model populado de produção.

## Lacunas

Não foi autorizado banco descartável neste host e não há mutation runner independente configurado no package script. O score de maturidade deve refletir essas lacunas; nenhum threshold foi reduzido.
