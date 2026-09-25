# Aceite limitado — AUD20-17 slice request-context (C06/C07) — 2026-09-25

Registro de aceite **limitado** do slice request-context de `AUD20-17/IMP50-40` em escopo controlado local, decorrente da decisão humana ([recibo de disposição](AUD20-17-formal-disposition-receipt-20260925.md)) e do parecer final `PASS` ([crítica final](AUD20-17-final-critic-c06-c07-v1-20260925.md): C06 PASS, C07 PASS, `ACCEPT_LIMITED`).

## Bytes aceitos (binding)

- Fontes: [inventário v2](AUD20-17-coverage-sources-inventory-20260925.json) — SHA-256 `dc9b95b058ff596faaa3bf6ccc296d73c461fe5c7527e7481a764b840076f5ec` (210 arquivos, 210/210 conferidos contra disco).
- Métricas: `coverage/coverage-summary.json` — SHA-256 `c72af2e391bbb9faaca127f8217fba080c4e9c1b63475dea55860cb701c3ad19`; log do run `6f3de5d9cea6cda02923bf84f38f32483027ebec202f8d5c3441261f5b80f9d0`.
- Caps: `server.ts=4.584/4.708`, `request-context.ts=328/450`, `request-query.ts=138/160`, soma `5.050/5.050`.
- Pilares: coverage 4/4 (92,99/90,19/91,35/93,49); módulo 100% (75/75) vs piso Q1 de 95%; PostgreSQL [30/354, zero-skip](AUD20-11-postgres-gate-report-20260925.md); mutation [16/16](AUD20-17-mutation-report-20260925.md); sem redução [reference-only, 0 regressões/210](AUD20-17-coverage-no-regression-report-20260925.md).

## Condições (vinculantes)

1. Qualquer alteração em fonte de produto reabre C06 e exige rerun de PostgreSQL/mutation com novo binding.
2. A comparação "sem redução" permanece `REFERENCE_ONLY`; não é gate.
3. O piso de 95% de branches do módulo (Q1) permanece vinculante; registry/thresholds intactos.
4. `AUD20-11` mantém registro formal próprio (desbloqueio por decisão humana, recibo nº 2); staging/produção `NO_GO`; sem commit/push/deploy, dados reais ou release.
5. Limitações declaradas: manifest v2 do BUILD report com hash de arquivo stale (`11f061…` vs `6b86…`, já em errata); `purpose` do inventário nomeando log antigo; digests working-tree dos gates PG/mutation (moment-bound); teardown agregado no receipt.

## Efeito

- `AUD20-17` (decomposição de hotspot): critérios C01–C07 do slice aceitos em escopo controlado local; query-parser FU1 `PASS_LOCAL` preservado. Registro formal em `0337` e `CURRENT`.
- `IMP50-40`: ambas as subfatias (request-context e query-parser) com aceite local; a reconciliação da contagem PLAN50 permanece item próprio.
- Liberação de `AUD20-10` (Q2) para execução admitida, conforme decisão nº 3 do recibo.
