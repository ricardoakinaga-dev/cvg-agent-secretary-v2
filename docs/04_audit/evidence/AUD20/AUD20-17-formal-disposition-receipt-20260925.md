# Recibo de disposição formal — AUD20-17 C06/C07 — 2026-09-25

Meio: respostas diretas do usuário nesta sessão (3 quesitos). Decisões vinculadas aos artefatos vigentes; a execução do aceite **condiciona-se ao parecer final PASS** da crítica fresh-context solicitada.

## Decisões

| # | Questão | Decisão | Efeito |
|---|---------|---------|--------|
| 1 | Disposição C06/C07 | **Crítica final consolidada → aceite limitado se PASS** | Solicitar parecer fresh-context sobre o pacote consolidado; só registrar aceite do slice request-context em escopo controlado local se `PASS` em C06 e C07 |
| 2 | Critério "sem redução" | **Comparação reference-only** | Executada em [relatório](AUD20-17-coverage-no-regression-report-20260925.md) e [JSON](AUD20-17-coverage-no-regression-comparison-20260925.json): 0 regressões em 210 arquivos; baseline 24/09 marcada `REFERENCE_ONLY` |
| 3 | Q2/AUD20-10 | **Liberar** | Collector admitido/enfileirado passa a `READY` para execução controlada após a disposição de AUD20-17 |

## Pacote consolidado submetido à crítica final

- Pilares C06: [coverage](AUD20-17-coverage-branches-report-20260925.md) + [parecer](AUD20-17-coverage-branches-critic-v1-20260925.md) + [inventário v2](AUD20-17-coverage-sources-inventory-20260925.json) + [sem redução](AUD20-17-coverage-no-regression-report-20260925.md); [PostgreSQL](AUD20-11-postgres-gate-report-20260925.md) + [receipt](AUD20-11-postgres-gate-receipt-20260925.json); [mutation](AUD20-17-mutation-report-20260925.md) + [sentinel](AUD20-17-mutation-sentinel-20260925.json) + [refresh](AUD20-17-mutant-refresh-20260925.json).
- Contexto governamental: [rota C06 v4](AUD20-17-C06-gate-route-critic-v4-20260924.md), [errata/Q1](AUD20-17-branch-floor-human-decision-20260924.md), [BUILD v2](AUD20-17-request-context-v2-build-report-20260924.md), [crítica C01–C05](AUD20-17-request-context-v2-independent-critic-20260924.md).
- Tarefas separadas não incluídas: R2 de FU1 (concluída, `PASS` do harness), sessão humana (adiada).

## Limites

Nenhuma decisão autoriza staging, produção, dados reais, commit/push/deploy, alteração de thresholds/registry, ou aceite além do slice request-context em escopo controlado local. Se o parecer final não der `PASS` em C06 e C07, nada é aceito e o resultado é registrado como falha explícita.
