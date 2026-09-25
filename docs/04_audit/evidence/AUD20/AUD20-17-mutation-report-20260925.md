# Relatório de mutation — sentinel selecionado (admitido) — 2026-09-25

Admissão em [pedido admitido](AUD20-17-mutation-admission-request-20260925.md) e [recibo de decisões](AUD20-20250925-human-decisions-20260925.md). Escopo: somente o sentinel pré-selecionado, em sandbox descartável; worktree do produto nunca mutado; pisos/registry intactos.

## Execução

- Comando: `node scripts/mutation-sentinel.mjs` sob Node `22.23.2`, manifesto `docs/04_audit/evidence/AUD19/AUD19-08-mutants.json` (16 mutantes).
- Nota de forma: o CLI só aceita `--out=<path>` (com `=`); a forma com espaço foi ignorada e a saída caiu no caminho padrão histórico. O relatório histórico `AUD19-08-mutation-sentinel-report.json` foi **restaurado ao HEAD** e o resultado desta rodada foi preservado em arquivo novo — histórico intacto, sem reescrita.
- Relatório bruto: [JSON](AUD20-17-mutation-sentinel-20260925.json) (SHA-256 `e8d14efa9f99673d80e5fca016526eb9c766c292ac96f9422cb07b59e3390f8f`).

## Resultado

`status=GAPS_FOUND`: **15/16 detected, 0 not_detected, 1 not_applicable**.

- Detectados (15): MUT-AUTH-01/02, MUT-FENCE-01, MUT-APPROVAL-01, MUT-JOURNAL-01, MUT-EVAL-01–08, MUT-CERT-01/02.
- `MUT-TENANT-01` (tenant): `not_applicable`, motivo `mutation_target_stale` — o alvo textual do mutante não existe mais no código atual. Registrado como gap honesto, **não** contado como detectado e **não** promovido a PASS.

## Disposição para C06

Mutation executada sobre o admitido, mas o pilar segue incompleto: `MUT-TENANT-01` exige decisão (atualizar o mutante para o código vigente e reexecutar, ou justificar a obsolescência com trilha). C06 permanece `FAIL`; nada aqui adjudica gate. Staging/produção `NO_GO`.
