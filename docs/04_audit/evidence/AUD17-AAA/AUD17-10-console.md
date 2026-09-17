# AUD17-10 — console operacional

**Status:** VERIFIED_LOCAL
**Ambiente:** Chromium local; dados sintéticos; sem API externa.

## Prova renderizada

`tests/e2e/visual-shell.spec.ts` passou 9/9 E2E e os snapshots atuais cobrem 375/768/1024/1440 px, foco de teclado, overflow, tenant scope, dead letters e a matriz de estados `EXECUTING`, `REPLANNING`, `WAITING_APPROVAL`, `HUMAN_HANDOFF`, `BUDGET_EXHAUSTED`, `FAILED` e `UNCERTAIN`.

O snapshot adicional `orchestration-uncertain-reconciliation-chromium-linux.png` é obtido após selecionar o Goal sintético UNCERTAIN e mostra:

- “Reconciliação necessária”;
- ausência de repetição automática;
- próxima ação segura explícita;
- última tentativa, outcome, worker, erro redigido e lease;
- painel somente leitura.

Os testes de componente também cobrem empty state por tenant, erro/retry, permissão por papel e seleção por teclado.

## Limitação

O fixture E2E é sintético e intercepta o read model. Headers, paginação e falhas do backend real ainda exigem prova de ambiente autorizado.
