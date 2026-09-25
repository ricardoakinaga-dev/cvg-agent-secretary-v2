# Comparação "sem redução" — reference-only — 2026-09-25

Critério C06 executado como comparação **reference-only**: a baseline de 24/09 não é candidate-bound (o manifesto citado `11f061…` nunca foi localizado), o que fica registrado como limite da comparação. Escopo: leitura e recomputo; nada executado.

- Candidato: `coverage/coverage-summary.json` (SHA-256 `c72af2e391bbb9faaca127f8217fba080c4e9c1b63475dea55860cb701c3ad19`), run do log `6f3de5d9…`.
- Baseline: [resumo integrado de 24/09](AUD20-17-request-context-v2-integrated-coverage-summary-20260924.json) (SHA-256 `94abe96ed88109b890c4d30d5ef387cb002fbf30e170fc622560f166df23802b`), `REFERENCE_ONLY`.
- Dados: [JSON](AUD20-17-coverage-no-regression-comparison-20260925.json).

## Resultado por arquivo (210 comuns)

| Situação | Arquivos |
|---|---:|
| Melhoraram (≥1 métrica) | 25 |
| Inalterados | 185 |
| **Regressões** | **0** |
| Só no candidato | 0 |

## Totais (antes → depois)

| Métrica | 24/09 | Atual |
|---|---:|---:|
| Statements | 90,84% | 92,99% |
| Branches | 87,00% | 90,19% |
| Functions | 89,27% | 91,35% |
| Lines | 91,43% | 93,49% |

Nenhuma regressão por arquivo; nenhuma redução de denominador (12.656/10.171/2.360/11.945 idênticos). Disposição: critério **satisfeito como reference-only**, sem conversão em gate além do escopo declarado; C06 formal permanece sujeito à crítica final consolidada.
