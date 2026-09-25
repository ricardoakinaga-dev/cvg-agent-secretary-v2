# 0342 — Roadmap incremental pós-query-parser

Fontes: [auditoria incremental 0571](../04_audit/0571_implementation_state_review_2026-09-23.md), [melhorias 0572](../04_audit/0572_next_improvement_round_2026-09-23.md), [backlog 0343](0343_post_query_backlog_20260923.md), [roadmap PLAN50 0340](0340_plan50_roadmap_20260923.md) e [backlog operacional 0337](0337_aud20260921_backlog.md). Este documento atualiza a sequência **a partir do estado observado**; 0340 continua como plano de referência dos 50 itens. Ondas são dependências, não datas.

## Atualização Q1 e FU1 — 2026-09-24T12:13Z

O usuário decidiu que o piso crítico de branches de 95% se aplica a
`apps/api/src/server/request-context.ts`; ver [recibo Q1](../04_audit/evidence/AUD20/AUD20-17-branch-floor-human-decision-20260924.md).
Essa decisão não altera o registry, não promove os 92% `REPORT_ONLY` a gate e
não libera Q2/AUD20-10. C06/C07 permanecem `FAIL` enquanto o binding e os
demais requisitos não forem demonstrados. Separadamente, AUD20-19-FU1/IMP50-18
teve SPEC aprovada e somente o BUILD local do harness admitido; a sessão humana
continua sem autorização. Ver [recibo](../04_audit/evidence/AUD20/AUD20-19-FU1-human-approval-admission-20260924.md).

| Onda                            | Entrega verificável                                                                          | Itens NQP             | Entrada                                                               | Saída/gate                                                                                                                                     |
| ------------------------------- | -------------------------------------------------------------------------------------------- | --------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Q0 — estado reconciliado        | PASS local query-parser e bloqueios descritos corretamente; controles correntes consistentes | 06, 11                | Relatórios AUD20-17-FU1 e estado real                                 | `docs:check`, formatação, links/JSON, nenhuma aceitação retroativa.                                                                            |
| Q1 — disposição AUD20-17        | Parecer próprio de request-context C01–C07, separando v1 do candidato integrado              | 03                    | Q0, SPEC/parecer v1 e manifesto FU1                                   | Aceite limitado com prova suficiente, emenda SPEC aprovada, ou blocker explícito; `AUD20-17` só fecha se todos os critérios próprios passarem. |
| Q2 — observabilidade controlada | Collector API→worker e negativos sintéticos da SPEC admitida                                 | 04, 10                | Q1 com liberação pelo DAG; hash e allowlist aprovados de AUD20-10     | Telemetria correlacionada sem PII; owner/SLO continuam pendentes até decisão humana.                                                           |
| H — acessibilidade humana       | Sessão AUD20-19 adjudicada por pessoas autorizadas                                           | IMP50-18              | Consentimento, participantes, equipamento e revisão humana            | Gate humano satisfeito ou `WAITING_HUMAN_APPROVAL`; bloqueia saídas dependentes R3–R6 do roadmap 0340.                                         |
| Q3 — qualidade e integração     | Coverage ≥90% functions, inventário de skips, PostgreSQL descartável, boundary integrado     | 01, 02, 08            | Tasks/gates próprios; Q1/Q2 e H quando o DAG exigir                   | Pisos contratuais e zero required skip; resultados do mesmo código, falhas preservadas.                                                        |
| Q4 — candidato final local      | Imagens, SBOM, composição, revisão, manifesto e re-selo Phase 11                             | 05                    | Q2/Q3, H e AUD20-18/07/11/12 admitidas e concluídas                   | P3–P5 do plano 0339; qualquer write aplicável exige nova prova.                                                                                |
| Q5 — externo e humano           | Oito dossiês externos/humanos e decisão de release                                           | itens IMP50-11..17/20 | Q4, owners, ambientes e autorizações específicas                      | P6/P7; produção continua `NO_GO` até sign-off e deploy separado.                                                                               |
| D — governança em paralelo      | Checker, política de evidências e DX versionados                                             | 07, 09, 12            | Gates Discovery/PRD/SPEC próprios e decisões humanas quando materiais | Drift detectado; 141 vínculos sem adjudicação até prova; snapshots v1/v2 preservados.                                                          |

**Caminho crítico agora:** Q0 → Q1 → Q2 → Q3 → Q4 → Q5, com H obrigatório antes dos marcos que dependem do gate humano no DAG. A sessão `AUD20-19` pode ser preparada em paralelo, mas não declarada concluída por automação. Se Q1 não liberar o DAG, Q2 permanece enfileirado; não se infere autorização de BUILD adicional. O trabalho D não autoriza reabrir `AUD20-08` nem altera o status de release. `AUD20-20` permanece dependente de R2/R3 e `AUD20-18` conforme 0337.

A revisão documental request-context foi concluída sem aceite. Q1 tem decisão
humana de aplicabilidade, mas C06/C07 permanecem `FAIL`; por isso `AUD20-10`
continua enfileirado e o DAG não foi liberado. Qualquer emenda SPEC precisa de
validação e decisão/admissão antes de código. Use somente dados sintéticos
localmente; staging real, produção e efeitos externos seguem `NO_GO`.

## Resultado Q1 inicial — revisão NQP-03 request-context v1 (histórico) — 2026-09-24

A revisão independente separou request-context v1 do query-parser FU1: C01 e
C03–C05 têm suporte `PASS`, C02 falha em `4.745/4.708` (+37), C06 falha em
89,25% functions e C07 não aceita a primeira fatia. Q1 resulta em blocker
explícito e não libera o DAG. O usuário direcionou uma emenda SPEC que amplie
somente request-context até atingir o cap; isso não aprova a emenda nem libera
outro BUILD. Q2/AUD20-10 continua enfileirada. Evidência:
[parecer NQP-03](../04_audit/evidence/PLAN50-20260923/nqp03-request-context-review-20260924.md).
A proposta v1 de emenda SPEC recebeu crítica `CONDITIONAL`; sua sucessora v2
(SHA-256 `1cb72b0e097ad19539c1f14fbdc892542ae9ddabf716bba00eef20b1c4cb237c`)
recebeu `PASS_FOR_HUMAN_REVIEW` da crítica fresh-context v2. Q1 não libera Q2
enquanto não houver decisão humana da emenda, admissão de BUILD e C01–C07
comprovados. Ver
[crítica v2](../04_audit/evidence/AUD20/AUD20-17-request-context-spec-amendment-critic-v2-20260924.md).

## Resultado Q1 após BUILD request-context v2 (registro histórico) — 2026-09-24T04:42Z

> Snapshot anterior à reconciliação de binding e à errata posterior. A decisão
> Q1 atual continua pendente somente sobre aplicabilidade do piso de 95%. A
> [rota C06](../04_audit/evidence/AUD20/AUD20-17-C06-gate-route-proposal-20260924.md)
> recebeu correção editorial posterior; o parecer v4 cobre apenas o hash
> explicitado no registro histórico de 0337. No momento desta captura, a versão
> corrigida aguardava revisão; a crítica I6 posterior deu `PASS` documental
> DOC-01–DOC-05, sem alterar os gates. Ver [I6](../04_audit/evidence/AUD20/AUD20-17-nqp03-disposition-critic-v6-20260924.md).
> A [errata de interpretação](../04_audit/evidence/AUD20/AUD20-17-request-context-branch-floor-erratum-20260924.md)
> permanece vigente para a leitura de 92%.

A crítica fresh-context após o BUILD v2 atribuiu C01–C05 `PASS`, C06 `FAIL` e
C07 `FAIL`; request-context continua sem aceite. C02 passou conforme a emenda
v2 aprovada: a reconstrução v1 fica separada (`server.ts=4.707`) do integrado
(`server.ts=4.584`, context 328, query 138, soma 5.050). A suíte integrada teve
2.256 PASS/192 skips/0 falhas; coverage foi reportada em 90,84% statements, 87,00%
branches, 89,27% functions e 91,43% lines. O módulo request-context tem 92%
branches reportados. Como o registry crítico não enumera esse módulo, a
aplicabilidade do piso de 95% segue sem adjudicação; não tratar 92% como falha
autônoma de threshold. Mutation selecionada, baseline válida e gate PostgreSQL
com zero skips não foram demonstrados; os skips não contam como aprovados.
Ver a [errata de interpretação](../04_audit/evidence/AUD20/AUD20-17-request-context-branch-floor-erratum-20260924.md).
O manifesto e a falta do inventário integrado completo mantêm as métricas em
`REPORT_ONLY`; baseline “sem redução” permanece `NOT_RUN`.

Q1 continua bloqueando o DAG e não libera Q2/AUD20-10. A rota C06 v4 não é
admissão e não executa gates; qualquer execução adicional continua dependendo
de sua própria autorização e dos gates aplicáveis. Ver [parecer independente](../04_audit/evidence/AUD20/AUD20-17-request-context-v2-independent-critic-20260924.md),
[relatório BUILD](../04_audit/evidence/AUD20/AUD20-17-request-context-v2-build-report-20260924.md)
e [fingerprint pré/pós](../04_audit/evidence/AUD20/AUD20-17-request-context-v2-review-fingerprint-20260924.json).
