# Pedido de admissão — gate PostgreSQL NQP-02/AUD20-11 — 2026-09-25

Status deste documento: **PEDIDO**, não admissão. Nenhum banco é tocado por este arquivo; a execução só existe após admissão hash-bound da autoridade competente.

## 1. Objeto

Execução do gate obrigatório de persistência/PostgreSQL (NQP-02) para `AUD20-11/IMP50-07`: rodar o seletor `test:postgres` (30 arquivos; 29 com guards condicionais + 1 com client em memória, conforme [inventário v2](nqp02-static-skip-inventory-v2-20260924.md)) contra PostgreSQL descartável local, com teardown e critério zero-required-skip.

## 2. Baseline de partida (sem reexecução neste pedido)

- Recorte unitário com URL vazia: 30 arquivos/354 testes (162 PASS, 192 skipped, 0 falhas) — [relatório](nqp02-unit-no-db-round1-20260924.md), [receipt](nqp02-unit-no-db-round1-20260924.receipt.json); crítica `CONDITIONAL` em [parecer](nqp02-unit-no-db-critic-v1-20260924.md).
- Atribuição por arquivo ao run histórico segue sem prova; skips não contam como aprovados.

## 3. Escopo proposto de execução

- Banco descartável local exclusivo da task; `TEST_DATABASE_URL` apontando somente a ele; nunca staging, produção ou dados reais.
- Teardown com remoção de schemas/`aud20_19_*` e papéis residuais; catálogo final `0/0` exigido.
- Classificação de skips em condicionais vs required; gate só fecha com zero required skip e atribuição por arquivo registrada.
- Comandos: `npm run test:postgres` (+ `load:aud20-19:postgres` somente se admitido em separado).

## 4. Dependências

`AUD20-11` está `BLOCKED` por `AUD20-07/10/19` (ver task oficial em `docs/03_build/0337_aud20260921_backlog.md`); a admissão deste gate não destrava essas dependências nem libera Q2/AUD20-10. Recomenda-se executar após R1 (binding) para que o resultado seja adjudicável.

## 5. O que este pedido NÃO autoriza

Tocar qualquer banco fora do descartável, usar dados reais, declarar `AUD20-11` desbloqueada, aceitar NQP-02/C06 por antecipação, ou dispensar teardown. Sem admissão hash-bound registrada em 0190/0337, o gate permanece `NOT_RUN`.
