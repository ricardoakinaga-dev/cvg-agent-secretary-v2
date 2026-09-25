# Relatório do BUILD de coverage (admitido, só testes) — 2026-09-25

Admissão em [pedido admitido](AUD20-17-coverage-build-admission-request-20260925.md) e [recibo de decisões nº 2](AUD20-20250925-human-decisions-2-20260925.md). Escopo: 7 arquivos novos de teste, 125 testes, zero fontes de produto alteradas, thresholds/denominador intactos.

## Execução

- Lanes T1/T2/T3 (testes novos, Node `22.23.2`, sem DB/rede); integração pelo lead com typecheck PASS, lint PASS e `test:coverage` integral.
- Correções do lead nos testes novos (só testes): 15× `noUncheckedIndexedAccess` em observability, 2× cast via `unknown` em kernel, 1× arg não usado em agent-core. Vitest dos 7 arquivos: 125/125 após o fix.
- Log integral: [AUD20-17-coverage-build-20260925.log](AUD20-17-coverage-build-20260925.log) (SHA-256 `31687eeaa9927fc93f953b6c16e3089f74b736d7fd4dcbc19e79f6aafa10348c`).

## Resultado (antes → depois, mesmo denominador)

| Métrica | Antes (resumo `94abe9…`) | Depois | Piso AAA ≥90% |
|---------|--------------------------|--------|---------------|
| Statements | 90,84% (11.497/12.656) | **91,18%** (11.540/12.656) | Acima |
| Branches | 87,00% (8.849/10.171) | **87,62%** (8.912/10.171) | **Abaixo (−2,38 pp)** |
| Functions | 89,27% (2.107/2.360) | **90,04%** (2.125/2.360) | **Acima (piso ATINGIDO, +1 acima do teto)** |
| Lines | 91,43% (10.922/11.945) | **91,78%** (10.964/11.945) | Acima |

- Suíte: 296 arquivos passed / 12 skipped (308); 2.381 testes passed / 192 skipped (2.573), exit 0. Skips inalterados (192 condicionais sem DB; gate PostgreSQL cobre o com-banco em separado).
- `request-context.ts`: **100%** em lines/functions/statements/branches (**75/75 branches**) — o pilar de branches do módulo está medido acima do piso aplicável de 95% (Q1). Falta binding candidate-bound para adjudicação de C06.
- Integridade: denominador de functions inalterado (2.360); nenhum threshold/registry tocado; nenhuma exclusão artificial.

## Disposição

Piso global de functions **ATINGIDO**; branches do módulo em 100%. Resta para C06: branches global 87,62% (<90%), binding candidate-bound e registro do desbloqueio de `AUD20-11`. C06 segue `FAIL` até lá. Staging/produção `NO_GO`.
