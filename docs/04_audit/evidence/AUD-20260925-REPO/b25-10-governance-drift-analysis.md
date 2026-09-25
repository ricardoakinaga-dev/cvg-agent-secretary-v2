# B25-10 — Análise de drift semântico entre estado canônico e resumos (onda D)

- Data: 2026-09-25. Lane C (builder), somente leitura dos topos e seções correntes.
- Escopo: coerência de status/próxima ação de AUD20-10/17/19-FU1 entre CURRENT, runtime state, execution log, backlog master, 0337, 0342/0343 e 0300.
- Veredito: **DRIFT_FOUND** — 2 drifts P1, 2 drifts P2.

## Tabela de coerência por task/fonte

| Task / item | CURRENT.md | 99_runtime_state.md (1ª entrada) | 20_master_execution_log.md (1ª entrada) | 30_backlog_master.md (1ª entrada) | 0337 (seção corrente) | 0342 / 0343 (topo) | 0300 (topo) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AUD20-17 status | `WAITING_HUMAN_APPROVAL`, Q1 decidida, C06/C07 `FAIL`, sem aceite | `WAITING_HUMAN_APPROVAL` (ok) mas next_action com Q1 pendente (**D1**) | Q1 decidida, sem aceite, ação primária | Q1 decidida, ação primária | Aberto, não aceito; Q1 decidida | Q1 decidida (12:13Z) | `WAITING_HUMAN_APPROVAL` (ok) mas próxima ação com Q1 pendente (**D3**) |
| AUD20-10 status | `READY_FOR_NEXT_STEP`, SPEC/BUILD admitidos, enfileirada após AUD20-17 | Enfileirada (ok) | Enfileirada (ok) | Enfileirada (ok) | `READY_FOR_NEXT_STEP`, admitida, enfileirada | Enfileirada (ok) | Enfileirada (ok) |
| AUD20-19-FU1 status | Tabela: BUILD local executado, aguardando R2, sessão sem autorização (ok); porém § corrente afirma `DRAFT_PENDING_HUMAN_REVIEW` sem BUILD admitido (**D2**) | Omite BUILD executado; congela estado em 10:14Z (**D1**) | BUILD local verificado 13:01Z, sem aceite até R2, sessão sem autorização | BUILD local verificado 13:01Z, sem aceite até R2 | Aprovada, BUILD executado, aguardando R2, sessão sem autorização | SPEC aprovada + BUILD admitido (12:13Z, anterior à execução — carimbo temporal explica, sem drift) | — |
| next_action canônico | Manter AUD20-17 sem aceite até binding candidate-bound; Q2/AUD20-10 enfileirada; FU1 só BUILD local; `NO_GO` | "Decidir aplicabilidade do piso de 95%" (Q1 pendente) — **diverge (D1)** | Aponta para CURRENT (ok) | Alinhado a CURRENT (ok) | Alinhado a CURRENT (ok) | Alinhado a CURRENT (ok) | "Obter decisão humana Q1" — **diverge (D3)** |

## Drifts (só o apresentado como corrente; histórico rotulado não conta)

### D1 — P1 — `docs/99_runtime_state.md`, 1ª entrada (2026-09-24T10:14Z)
- Observado: status `WAITING_HUMAN_APPROVAL` com `next_action` pedindo para "decidir a aplicabilidade do piso de branches críticos de 95%", tratando Q1 como pendente.
- Esperado: Q1 foi decidida (recibo registrado; execution log 12:41Z; atualização 0342/0343 12:13Z); o next_action corrente é manter AUD20-17 sem aceite até binding candidate-bound e gates C06 restantes (texto de `docs/CURRENT.md` § "Próxima ação" e `docs/03_build/tracking/current_state.json`). O runtime tampouco registra o BUILD FU1 verificado às 13:01Z (o BUILD request-context v2 consta nas linhas 21–22; o omitido é o FU1).
- Impacto: o documento que deveria ser a fonte operacional corrente está ~3h defasado e orienta a próxima ação errada.

### D2 — P1 — `docs/CURRENT.md`, § "Tasks correntes", parágrafo `AUD20-19-FU1/IMP50-18` ("Continua `DRAFT_PENDING_HUMAN_REVIEW`: nenhum BUILD ou sessão humana foi admitido ou autorizado")
- Observado: parágrafo apresentado como corrente nega admissão/execução de BUILD.
- Esperado: SPEC v4 aprovada e BUILD local controlado admitido (recibo de admissão 20260924) e executado/verificado (execution log e backlog master 13:01Z; § "Estado do programa" de 0337; a própria tabela de tasks de CURRENT, linha AUD20-19). O correto corrente é: BUILD local executado, aguardando crítica R2, sem aceite; sessão humana sem autorização em gate separado.
- Impacto: contradição interna no índice canônico sobre o status de FU1.

### D3 — P2 — `docs/03_build/0300_build_engineer_master.md`, § "Estado incremental pós-query-parser — 2026-09-24"
- Observado: "Próxima ação: obter decisão humana Q1 sobre a aplicabilidade do piso de 95%".
- Esperado: Q1 já decidida; próxima ação corrente é binding candidate-bound + gates C06 (CURRENT § "Próxima ação").
- Não-drift verificado no mesmo arquivo: "AUD20-08 é a próxima task" (§ checkpoint histórico 21/09) e "AUD20-03 é a próxima task" (§ programa 20/09) estão em seções explicitamente históricas — não apontados como drift.

### D4 — P2 — `docs/03_build/0343_post_query_backlog_20260923.md`, item NQP-03 (corpo do "Estado:")
- Observado: corpo afirma que `AUD20-17` "aguarda a decisão de aplicabilidade" e que "a aplicabilidade do piso de 95% permanece sem adjudicação".
- Esperado: o próprio topo do arquivo ("Atualização corrente — 2026-09-24T12:13Z") registra Q1 decidida (piso aplica-se a `request-context.ts`, 92% `REPORT_ONLY`, C06/C07 `FAIL`).
- Impacto: detalhe defasado dentro de arquivo cujo cabeçalho já reflete a decisão. NQP-04 (`PROPOSTO/ENFILEIRADO`, "BUILD ainda não iniciado") permanece coerente com AUD20-10 admitida-não-executada — sem drift.

## Coerências confirmadas (sem drift)
- AUD20-17 `WAITING_HUMAN_APPROVAL` / aberto / sem aceite em todas as fontes correntes; matriz `aud20_v2_findings_matrix.json` confere (`WAITING_HUMAN_APPROVAL`).
- AUD20-10 `READY_FOR_NEXT_STEP`, SPEC aprovada + BUILD admitido, enfileirada após AUD20-17, em CURRENT, 0337 (§ AUD20-10 e cauda), execution log, backlog master e topos 0342/0343.
- Registros 0337 rotulados como históricos ("Disposição inicial NQP-03 (histórica)", "registro histórico de 2026-09-24T04:42Z", "Decisões humanas (registro histórico) — 20:44Z") com `IN_PROGRESS` interno não contam como drift.
- 0340/0341 (baseline de planejamento 2026-09-23, ex. "adendo SPEC aguarda revisão") são snapshots rotulados como baseline, não estado corrente — sem drift.
- 0342 topo cobre Q1 decidida + FU1 admitido às 12:13Z, anterior à verificação do BUILD (13:01Z); o carimbo temporal explica a ausência de "executado" — sem drift.

## Próximos passos
1. Sincronizar `99_runtime_state.md` com Q1 decidida e BUILD FU1 verificado (nova entrada P1, sem reescrever a 10:14Z).
2. Corrigir o parágrafo stale de FU1 em `CURRENT.md` para "BUILD local executado, aguardando R2, sessão sem autorização" (via gate documental próprio, fora desta lane read-only).
3. Atualizar a próxima ação no topo de 0300 (Q1 → binding candidate-bound) e o corpo de NQP-03 em 0343 (aplicabilidade decidida).
4. Revalidar `docs:check` semântico após as correções.

## Limites
- Leitura dos topos + seções correntes (tabelas de estado, primeiras entradas, § "Próxima ação"); histórico profundo não relido linha a linha.
- Nenhum master editado por esta análise; nenhuma execução de teste/BUILD; sem acesso a rede.
