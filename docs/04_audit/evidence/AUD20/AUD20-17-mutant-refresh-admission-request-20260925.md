# Pedido de refresh — mutante MUT-TENANT-01 obsoleto — 2026-09-25

Status deste documento: **PEDIDO**, não admissão. Nada é alterado por este arquivo.

## 1. Objeto

Atualizar o alvo textual de `MUT-TENANT-01` (hoje `not_applicable`, motivo `mutation_target_stale` em [JSON](AUD20-17-mutation-sentinel-20260925.json)) para o código vigente e reexecutar o sentinel sobre ele.

## 2. Escopo proposto

- Editar **somente** a entrada `MUT-TENANT-01` em `docs/04_audit/evidence/AUD19/AUD19-08-mutants.json` (novo `find`/`replace` no alvo atual + rationale); nenhum outro mutante, threshold ou registry tocado. O manifesto editado passa a ser nova versão com hash registrado — o original permanece no histórico Git.
- Reexecutar `node scripts/mutation-sentinel.mjs --out=<novo path AUD20>` (forma com `=`) em sandbox; worktree intacto.
- Critério: mutante `detected` (teste o captura) ou `not_detected` honesto (gap a tratar, sem PASS).

## 3. Limites

- Refresh ≠ aceite de C06; compõe com demais pilares.
- Sem admissão, `MUT-TENANT-01` segue `not_applicable` e o pilar de mutation segue incompleto.
