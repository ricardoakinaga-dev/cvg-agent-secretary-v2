# Aceite da fatia AUD20-10 C02/C04/C05 — 2026-09-25

Aceite limitado da fatia admitida pelo [recibo](AUD20-10-next-slice-human-approval-20260925.md) (`dc123bbe…`), com base no [relatório do BUILD](AUD20-10-alerts-ledger-build-report-20260925.md), na crítica v1 `CONDITIONAL` (remediada) e na **crítica delta fresh-context `PASS`**.

## Escopo aceito (limitado)

- **C02**: `approval_latency_ms` real no owner da transição, com nome estável, valor em ms e atributos allowlisted (`decision`, `outcome`, `operation`), sem IDs/conteúdo.
- **C04**: delivery ledger local append-only com transições `detected -> acknowledged -> closed` fail-closed e cadeia de hash verificável.
- **C05**: exercício lê batches reais dos collectors, avalia `DEFAULT_ALERT_RULES` e fecha o ciclo com relógio injetado; status exige entrega completa + ledger válido.
- C01–C07 de `AUD20-10` **permanecem abertos**; owner/SLO continuam decisão humana pendente.

## Evidência

- Suíte final: 306 arquivos / **2.657 PASS** / 192 skips ([log v2](AUD20-10-alerts-ledger-coverage-v2-20260925.log) `20d180f4…`); coverage 4/4 ≥90% (93,02/90,20/91,36/93,51); focados 14/14.
- Mutation dirigida na árvore final: **26/26 detected** ([JSON](AUD20-10-alerts-ledger-mutation-20260925.json) `69c2f982…`); manifesto v3 `f6a2b7e9…`.
- `typecheck`/`lint`/Prettier repo-wide/`docs:check`/`git diff --check` PASS.

## Condições e limitações declaradas

1. Fonte de produto alterada reabre a fatia (rerun de mutation/coverage).
2. Manifesto de mutantes v3 está fora da allowlist congelada do recibo (é o gate de mutation dirigida da admissão); o pin canônico `MUTATION_MANIFEST_SHA256 = 545ba85f…` segue obsoleto e deve ser reconciliado no reseal aprovado.
3. Guarda `decidedAt === undefined` é inalcançável pela API pública (coberto por construção).
4. A allowlist citou `audit-ledger.test.ts` inexistente (falha de admissão, não do BUILD); testes do ledger vivem em `observability.test.ts`/`observability-coverage.test.ts`.
5. Owner/SLO não preenchidos; sem rede/OTLP, PostgreSQL, dados reais, staging, produção, commit de produto fora desta rodada ou deploy.
