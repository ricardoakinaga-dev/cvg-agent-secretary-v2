# Relatório do gate PostgreSQL NQP-02/AUD20-11 (admitido) — 2026-09-25

Admissão em [pedido admitido](../PLAN50-20260923/nqp02-postgres-gate-admission-request-20260925.md) e [recibo de decisões](AUD20-20250925-human-decisions-20260925.md). Escopo: somente o seletor `test:postgres` contra banco descartável exclusivo, com teardown.

## Ambiente

- Contêiner descartável `pg-disposable-20260925` (imagem `postgres:16`), porta loopback `127.0.0.1:55434`, banco `descartavel`, senha throwaway; `TEST_DATABASE_URL` apontando somente a ele. Nenhum outro banco, dado real ou staging/produção tocado.
- Node `22.23.2`. Comando exato: `npm run test:postgres` (30 arquivos do inventário v2 + client em memória).

## Execução (2 rodadas, resultado reproduzido)

| Rodada | Início | Duração | Arquivos | Testes | Skips | Falhas | Exit |
|--------|--------|---------|----------|--------|-------|--------|------|
| 1 | 23:47:56 | 79,34 s | 30 passed (30) | 354 passed (354) | 0 | 0 | 0 |
| 2 | 23:49:33 | 79,56 s | 30 passed (30) | 354 passed (354) | 0 | 0 | 0 |

- Log integral da rodada 2: [AUD20-11-postgres-gate-20260925.log](AUD20-11-postgres-gate-20260925.log) (SHA-256 `d211a3951a5bf17089241eb89e214278a8014137262fc18066cf4b2c802e43d0`).
- Limite de atribuição: o reporter padrão registra o agregado (30/30, 354/354, zero skips); qualquer arquivo com skip apareceria na contagem — não apareceu. Contagens por arquivo individuais não enumeradas neste formato.

## Teardown

- Após as rodadas: 6 papéis residuais de teste (`cvg_chan_role_*`, `cvg_eff_role_*`, `cvg_journeys_rls_*`, 2 rodadas × 3 papéis) encontrados no catálogo — os testes não deram `DROP ROLE` (achado de higiene P2, sem impacto no veredito do gate).
- Papéis removidos manualmente (`DROP ROLE`, 6/6), catálogo final `0` papéis residuais; contêiner destruído (`docker rm -f`), sem resíduo na máquina.

## Disposição

Gate PostgreSQL **EXECUTADO** com zero required skip e teardown comprovado; NQP-02 sai de `UNIT_SUBSET_PASS; POSTGRES_NOT_RUN`. O fechamento integral de C06 ainda exige: functions ≥90%, branches do módulo (92% `REPORT_ONLY` vs piso aplicável de 95%), binding candidate-bound e disposição de `MUT-TENANT-01`. `AUD20-11` permanece formalmente `BLOCKED` até decisão própria de desbloqueio — este relatório é evidência do gate, não destravamento de task.
