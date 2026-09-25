# Pedido de desbloqueio — task AUD20-11 — 2026-09-25

Status deste documento: **PEDIDO**, não desbloqueio. A task só sai de `BLOCKED` por decisão própria da autoridade competente.

## 1. Fundamento

Gate NQP-02 executado 2× com reprodução em banco descartável: 30 arquivos passed (30), 354 testes passed (354), zero skips, teardown comprovado — ver [relatório](AUD20-11-postgres-gate-report-20260925.md), [log](AUD20-11-postgres-gate-20260925.log) e [receipt](AUD20-11-postgres-gate-receipt-20260925.json).

## 2. Dependências originais do bloqueio

`AUD20-11` está `BLOCKED` por `AUD20-07/10/19` (task oficial em `docs/03_build/0337_aud20260921_backlog.md`). Este pedido propõe o desbloqueio **condicionado**: a evidência do gate existe e é adjudicável, mas `AUD20-10` segue enfileirada após `AUD20-17`, `AUD20-19` aguarda sessão (adiada) e `AUD20-07` depende do restante do DAG.

## 3. Efeito proposto do desbloqueio

- Reconhecer NQP-02 como gate executado (zero required skip) para fins de C06.
- Não autoriza: novo BUILD, staging/produção, dados reais, dispensa de binding/coverage/mutation, ou conclusão de `AUD20-17`.
- Sem decisão, `AUD20-11` permanece `BLOCKED` e a evidência segue como suporte, não como gate fechado.
