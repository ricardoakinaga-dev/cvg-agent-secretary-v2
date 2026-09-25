# Relatório do BUILD de branches + binding de coverage (admitido) — 2026-09-25

Segunda rodada do BUILD de coverage (admissão nº 1 do [recibo nº 2](AUD20-20250925-human-decisions-2-20260925.md)). Escopo: arquivos novos de teste; zero fontes de produto alteradas; thresholds/denominador intactos.

## Execução

- Lanes B1/B2/B3: 7 arquivos, 231 testes novos (worker/API/platform/runtime/evals/persistence/observability).
- Lead: 1 arquivo de alto rendimento, 22 testes, fake pool sem DB para `apps/worker/src/postgres-role-preflight.ts` (0% → **100%**, 80/80 branches), com 2 correções no próprio teste (expressão de policy espelhando o fonte; preservação das linhas nas variantes).
- Correções de integração (só testes): 15× `noUncheckedIndexedAccess`, 2× cast via `unknown`, 2× import/arg não usados, 1× `exactOptionalPropertyTypes`.
- Verificação final: `typecheck` PASS, `lint` PASS, `test:coverage` integral PASS.
- Log: [AUD20-17-coverage-branches2-20260925.log](AUD20-17-coverage-branches2-20260925.log) (SHA-256 `6f3de5d9cea6cda02923bf84f38f32483027ebec202f8d5c3441261f5b80f9d0`); resumo: `coverage/coverage-summary.json` (SHA-256 `c72af2e391bbb9faaca127f8217fba080c4e9c1b63475dea55860cb701c3ad19`).

## Resultado — todos os pisos AAA ≥90% atingidos

| Métrica | Início (24/09) | Rodada 1 | **Rodada 2 (atual)** | Piso AAA |
|---------|----------------|----------|----------------------|----------|
| Statements | 90,84% | 91,18% | **92,99%** (11.769/12.656) | ≥90% ✅ |
| Branches | 87,00% | 89,41% | **90,19%** (9.174/10.171) | ≥90% ✅ |
| Functions | 89,27% | 90,04% | **91,35%** (2.156/2.360) | ≥90% ✅ |
| Lines | 91,43% | 91,78% | **93,49%** (11.168/11.945) | ≥90% ✅ |

- Suíte: 304 arquivos passed / 12 skipped (316); 2.634 testes passed / 192 skipped (2.826); exit 0. Skips são os 192 condicionais sem DB (o gate PostgreSQL é executado em separado, com zero skip quando configurado).
- Denominador inalterado (2.360 functions / 10.171 branches); nenhum threshold/registry tocado; nenhuma exclusão artificial.

## Binding do run (candidato de adjudicação)

- Fontes do denominador: [inventário hash-bound](AUD20-17-coverage-sources-inventory-20260925.json) — 210 arquivos com sha256; v1 revisado pela crítica = `2d6b63d880debba2560bfe7381f2067517d24aaecdceffe23aec68f4eb20c6db`; v2 pós-remediação MINOR (vincula este log/resumo) = `dc9b95b058ff596faaa3bf6ccc296d73c461fe5c7527e7481a764b840076f5ec`; 0 ausentes, 210/210 recomputados contra disco pelo revisor.
- Log do run: `6f3de5d9…`; resumo do run: `c72af2e3…`.
- Fontes de produto não mudaram entre o inventário e este run (somente testes/doc novos); os quatro pisos acima pertencem a este run e a este conjunto de fontes.

## Disposição para C06

Os quatro pisos AAA estão demonstrados no mesmo run com fontes inventariadas, e a crítica independente deu `PASS` ao pilar (2 MINORs, um remediado: metadado do inventário v2). Ver [parecer](AUD20-17-coverage-branches-critic-v1-20260925.md). Este relatório não adjudica a task; C06/C07 seguem `FAIL` até a disposição formal. Staging/produção `NO_GO`.
