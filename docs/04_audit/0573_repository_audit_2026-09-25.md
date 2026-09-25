# 0573 — Auditoria do repositório — 2026-09-25

## Escopo e critério

- **ID:** `AUD-20260925-REPO`.
- **Objeto:** documentação canônica, aplicação, persistência, segurança, testes, operação e cadeia de release na árvore local, comparada ao estado registrado em [CURRENT](../CURRENT.md), [runtime state](../99_runtime_state.md), [execution log](../20_master_execution_log.md) e [backlog master](../30_backlog_master.md).
- **Baseline:** [auditoria 0569](0569_repository_audit_2026-09-23.md) e [revisão incremental 0571](0571_implementation_state_review_2026-09-23.md); esta rodada **recalcula** as notas à luz do trabalho de 2026-09-24 (BUILD request-context v2 executado sem aceite, BUILD AUD20-19-FU1 verificado sem aceite, decisão humana Q1 recebida, 141 vínculos IMP50-49 mantidos sem adjudicação).
- **Método:** leitura das instruções CVG e das fontes canônicas; inspeção de código e gates Discovery/PRD/SPEC; execução de checks locais sob Node `22.23.2` (`docs:check`, `typecheck`, `lint`, `git diff --check`, Prettier). Sem BUILD novo, sem dados reais, sem integração externa, sem sessão humana, sem commit/push/deploy.
- **Escala:** 90–100 forte e comprovado localmente; 75–89 bom com lacunas; 60–74 parcial; 40–59 frágil; 0–39 sem qualificação suficiente. As notas são julgamento técnico do escopo observado. Nenhuma média substitui um gate obrigatório.

## Verificações desta rodada

| Verificação                                           | Resultado                                                                                                 |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `docs:check` com Node 22.23.2                         | PASS; 1.875 links, zero quebrados, 634 JSONs, estado/semântica/nextAction válidos.                        |
| `docs:check` no Node 24 do shell padrão               | FAIL esperado: `node_runtime_mismatch` (pin `.nvmrc`/`.node-version` = `22.23.2`).                        |
| `typecheck`                                           | PASS, exit 0.                                                                                             |
| `lint`                                                | PASS, exit 0.                                                                                             |
| `git diff --check`                                    | PASS.                                                                                                     |
| Prettier nos documentos correntes                     | PASS.                                                                                                     |
| Medição C02 (allowlist integrada)                     | `server.ts=4.584/4.708`, `request-context.ts=328/450`, `request-query.ts=138/160`, total `5.050/5.050`.   |
| Suíte completa / coverage / PostgreSQL / E2E / imagem | Não reexecutados; valem os recibos vigentes de 2026-09-24 (suíte 2.256 PASS/192 skips; functions 89,27%). |

## Notas

|   # | Item analisado                              | Nota / 100 | Base da avaliação                                                                                                                                 |
| --: | ------------------------------------------- | ---------: | ------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | Governança e gates                          |     **78** | Pipeline e bloqueios explícitos; decisão Q1 recebida e crítica I6 `PASS` documental; binding candidate-bound e C06/C07 seguem abertos.            |
|   2 | Documentação e rastreabilidade              |     **72** | `docs:check` 1.875/634 PASS e I6 DOC-01–DOC-05 PASS; persistem erratas históricas e divergência de manifesto (`11f061…` citado vs `6b86…` atual). |
|   3 | Arquitetura e limites de módulo             |     **78** | Decomposição query-parser reduziu `server.ts` de 4.958 para 4.584; hotspot central persiste.                                                      |
|   4 | Backend e API                               |     **86** | Typecheck/lint PASS; query-parser AC01–AC06 `PASS_LOCAL`; falta composição de staging representativa.                                             |
|   5 | Orquestração e agentes                      |     **86** | Sem mudança na rodada; qualificação externa e selo corrente seguem abertos.                                                                       |
|   6 | Persistência, retenção e migrações          |     **78** | NQP-02 unitário confere contagens, mas gate PostgreSQL `NOT_RUN` e atribuição histórica por arquivo não provada.                                  |
|   7 | Segurança e privacidade                     |     **81** | Políticas fail-closed preservadas; identidade real e atestação externa faltam; `npm audit` não reexecutado nesta rodada.                          |
|   8 | Safety, approval e handoff                  |     **91** | Policy e approval têm contratos, negativos e trilha; ações sensíveis permanecem bloqueadas no escopo controlado.                                  |
|   9 | Testes e QA                                 |     **82** | Functions 89,27% abaixo do piso AAA ≥90%; 192 skips condicionais; métricas integradas `REPORT_ONLY`.                                              |
|  10 | Confiabilidade e recuperação                |     **80** | Baseline "sem redução" `NOT_RUN`; mutation separada e não executada.                                                                              |
|  11 | Observabilidade operacional                 |     **60** | SPEC AUD20-10 aprovada e BUILD admitido, porém enfileirado sem execução; sem collector/alerta/SLO provados.                                       |
|  12 | UX e acessibilidade                         |     **82** | FU1 com unit 21/21, verify isolado 2/2 e suíte repetida PASS; crítica R2 e sessão humana pendentes.                                               |
|  13 | RAG e integrações externas                  |     **38** | Sem fonte institucional aprovada e sem homologação real; produto mantém handoff/bloqueio.                                                         |
|  14 | Supply chain                                |     **65** | Worktree sujo e certificação stale; SBOM/licenças não revinculados ao candidato corrente.                                                         |
|  15 | Operação e release                          |     **45** | Certificação FAIL e `promotion:check` inelegível (fail-closed correto); oito gates externos/humanos pendentes.                                    |
|  16 | Manutenibilidade                            |     **68** | Extração de parsers aliviou o hotspot; `server.ts` com 4.584 linhas ainda concentra responsabilidade.                                             |
|  17 | Experiência de desenvolvimento e reprodução |     **80** | Pin Node respeitado e gates documentais íntegros; shell padrão em Node 24 causa FAIL espúrio em `docs:check`.                                     |
|  18 | Prontidão para produção (gate)              |     **20** | Oito gates externos/humanos pendentes; sem staging real, sem restore físico, sem sign-off.                                                        |

**Maturidade técnica local:** `74/100`, média arredondada dos itens 1–17. **Prontidão de produção:** `20/100`, apresentada à parte por ser gate; **veredito: `NO_GO` para staging real e produção**.

## Achados prioritários

1. **A25-01 — P0 qualificação — functions 89,27% < piso AAA ≥90%.** O `vitest.config.mts` aplica 80%, de modo que seu exit 0 não prova o piso contratual ([contrato AAA §9.1](../02_spec/aaa_quality_contract.md)). **Rota:** `AUD20-12/17`; diagnosticar funções/ramos faltantes sem alterar denominador ou threshold. Faltariam ~18 funções cobertas no denominador atual.
2. **A25-02 — P0 evidência — binding incompleto do run integrado.** O BUILD report cita manifesto `11f061…`, o arquivo atual mede `6b86…`, e não há inventário hash-bound das 301 fontes do run integrado; métricas seguem `REPORT_ONLY` e a comparação "sem redução" segue `NOT_RUN`. Ver [reconciliação](evidence/AUD20/AUD20-17-manifest-baseline-reconciliation-20260924.md). **Rota:** `AUD20-17` (C06); recuperar binding candidate-bound válido.
3. **A25-03 — P0 release — candidato não selado.** Worktree sujo e `certification:verify:phase11` / `promotion:check` rejeitando o pacote é comportamento seguro do gate, não aprovação. **Rota:** `AUD20-07/12`; congelar candidato antes de reconstruir certificação.
4. **A25-04 — P1 governança — piso de 95% aplicável, métrica 92% `REPORT_ONLY`.** A decisão humana Q1 resolveu a aplicabilidade a `apps/api/src/server/request-context.ts` (ver [recibo Q1](evidence/AUD20/AUD20-17-branch-floor-human-decision-20260924.md)), mas não adjudica C06. **Rota:** manter sem adjudicação de gate até binding válido; não alterar registry/threshold.
5. **A25-05 — P1 operação — observabilidade enfileirada.** SPEC AUD20-10 aprovada/admitida, execução pendente da liberação do caminho crítico AUD20-17. **Rota:** `AUD20-10` após Q1/C06 liberarem o DAG.
6. **A25-06 — P2 humano — sessão de acessibilidade pendente.** FU1 tem BUILD local verificado, mas R2 independente e sessão humana seguem sem autorização em gate separado. **Rota:** `AUD20-19`; nenhuma automação substitui a sessão.
7. **A25-07 — P2 evidência — 141 vínculos IMP50-49 sem adjudicação.** Decisão humana vigente: manter sem adjudicação até suporte suficiente; v1 baseline, v2 suplemento imutável; Discovery 0022 `IN_PROGRESS`, sem `DISCOVERY_READY`. **Rota:** `AUD20-08-FU3`.

## Decisão e limite

O sistema demonstra boa capacidade **local e sintética**, com typecheck, lint, checks documentais e fatias controladas exercitadas. A evidência não autoriza afirmar operação hospitalar real, disponibilidade, capacidade de produção ou aprovação clínica/financeira. A task corrente permanece `AUD20-17` (`WAITING_HUMAN_APPROVAL`, C06/C07 `FAIL`); `AUD20-10` segue enfileirada; staging real e produção permanecem `NO_GO`.

O desdobramento desta auditoria está no [roadmap 0344](../03_build/0344_post_audit_roadmap_20260925.md) e no [backlog 0345](../03_build/0345_post_audit_backlog_20260925.md). Nenhum item deste relatório autoriza BUILD além das allowlists já admitidas, nem altera thresholds, registry ou gates humanos/externos.

Nesta rodada não foram reexecutados suíte completa, coverage, PostgreSQL, E2E multibrowser, build de imagens, mutação, carga, restore físico ou homologações externas; as referências a essas áreas usam recibos vigentes ou código inspecionado, identificados acima. Não houve revisão independente nova deste relatório.
