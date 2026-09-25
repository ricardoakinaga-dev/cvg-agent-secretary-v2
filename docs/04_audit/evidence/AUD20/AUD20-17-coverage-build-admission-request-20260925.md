# Pedido de admissão — BUILD de coverage C06 (só testes novos) — 2026-09-25

Status deste documento: **PEDIDO**, não admissão. Nenhum teste é escrito por este arquivo; a execução só existe após admissão hash-bound.

## 1. Objeto

Adicionar testes de comportamento ao **mesmo código** para fechar o gap de functions (89,27% → ≥90%, ≈17 funções) e os branches críticos do módulo `request-context` (92% observado vs piso aplicável de 95%), conforme [diagnóstico](../AUD-20260925-REPO/b25-03-coverage-gap-diagnosis.md).

## 2. Escopo proposto (só testes)

- Allowlist: arquivos `*__tests__*`/`tests/**` novos ou estendidos; **nenhum fonte de produto alterado**, nenhum threshold/denominador/registry tocado.
- Alvos prioritários (top do diagnóstico): `postgres-role-preflight` (0/10, exige DB descartável), `runtime-approval-store` (7/62), `bootstrap-persistence` (8/28), `retention` (22/56), `kernel-composition` (29/50) e branches descobertos de `request-context`.
- Verificação: `test:coverage` no mesmo denominador (functions 2.360); comparação "sem redução" só vale com baseline candidate-bound (hoje `NOT_RUN`).

## 3. Limites

- Cobrir ≠ adjudicar: o aceite de C06 exige ainda binding, `MUT-TENANT-01` e desbloqueio de `AUD20-11`.
- Sem Koreção de produto disfarçada de teste; teste que exigir mudança de fonte sai do escopo e exige SPEC própria.
- Sem este BUILD admitido, functions segue 89,27% e C06 segue `FAIL`. Staging/produção `NO_GO`.
