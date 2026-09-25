# Aceite do slice AUD20-10/IMP50-09 — BUILD local do collector conectado — 2026-09-25

Registro do aceite do slice (escopo `IMP50-09`), com base na SPEC aprovada (hash `83130cdf…`), no [relatório do BUILD](AUD20-10-composition-build-report-20260925.md), na crítica v1 `CONDITIONAL` (remediada) e na **crítica delta fresh-context `PASS`**.

## Escopo aceito (limitado)

- Conectar API e worker ao mesmo contrato de collector e exercitar correlação sintética, na allowlist aprovada.
- C01–C07 de `AUD20-10` **permanecem abertos**: `approval_latency_ms`, alertas/`DEFAULT_ALERT_RULES`, delivery ledger, owner/SLO e as demais fatias exigem decisões/admissões próprias.

## Evidência do aceite

- Suíte final: 305 arquivos passed / 12 skipped; **2.647 PASS** / 192 skips ([log](AUD20-10-composition-final-test-20260925.log) `5b8f5b11…`); coverage 4/4 ≥90% ([log](AUD20-10-composition-coverage-final-20260925.log) `9c0f69d8…`); focados 33/33.
- Mutation dirigida na árvore final: **22/22 detected, 0 notDetected, 0 notApplicable** ([JSON](AUD20-10-directed-mutation-20260925.json) `83fbe5cb…`); manifesto v2 (`a0e647e2…`).
- typecheck/lint/Prettier/`docs:check`/`git diff --check` PASS; cap de arquitetura `5050/5050`.

## Condições

1. Qualquer alteração em fonte de produto reabre o slice (e exige rerun de PostgreSQL/mutation quando aplicável).
2. Owner/SLO não podem ser preenchidos sem decisão humana; alertas/delivery ledger ficam em fatia própria.
3. O pin `MUTATION_MANIFEST_SHA256` obsoleto (`545ba85f…`) permanece fora desta allowlist e deve ser reconciliado no reseal aprovado.
4. Staging/produção `NO_GO`; sem dados reais, commit/push/deploy ou efeito externo.
5. MINORs registrados da crítica delta: teste do symlink não prova o "inert"; relatório de mutation não byte-bound ao candidato (mitigado por reexecução integral); negativo `lote > buffer` adicionado após a rodada de coverage (sem alterar contagens).
