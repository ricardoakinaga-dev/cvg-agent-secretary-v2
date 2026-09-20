# Auditoria integral do repositório — Gauntlet — 2026-09-19

## Decisão executiva

O programa possui implementação local/sintética substancial, porém não atende ao próprio contrato de certificação AAA e não está pronto para staging real ou produção.

- **Maturidade técnica em ambiente controlado:** `66/100`.
- **Certificação contra o contrato vigente:** `FAIL / NO_GO`.
- **Prontidão de produção:** `0/100` como gate obrigatório.
- **Confiança do parecer:** `0,91`.
- **Defeitos P0 exploráveis encontrados:** nenhum.
- **Bloqueadores P0 de release:** oito gates externos/humanos sem validação.

A média é somente descritiva. Nenhuma nota compensa falha em critério obrigatório.

## Identidade, escopo e fronteiras

- Revisão inspecionada: `843c92777e393675871e7f25376a3746678b4625`, branch `main`, inicialmente alinhada a `origin/main` e limpa.
- Ambiente de verificação fresca: Node `22.23.2`, dados sintéticos e efeitos reais desabilitados.
- Incluído: documentação, código conectado, testes, CI, migrations, pacote de certificação, API, worker, web, runtime, policy, approval, persistência, observabilidade, RAG e operação.
- Excluído: provider, canal, IdP, RAG institucional, staging implantado, produção, backup/restore físico, piloto e qualquer ação clínica, financeira, de agenda ou prontuário real.
- O certificado corrente aponta para o candidato funcional `9c373bf1d2fcd43632da09d60b87455da6a18a09`; commits posteriores até a revisão inspecionada são de certificação/documentação. Isso não transforma o pacote em atestado de deployment.

## Método e rubrica congelada

A auditoria combinou inventário integral do corpus, leitura semântica dos documentos canônicos/correntes, inspeção do código alcançável, execução fresca da suíte unitária e checks estáticos, verificação do pacote selado, dois críticos independentes com contexto fresco e uma adjudicação das divergências.

Rubrica:

- `0`: ausente;
- `25`: conceito/documentação sem implementação significativa;
- `50`: implementação parcial significativa;
- `75`: robusta em ambiente controlado/sintético com evidência executável corrente;
- `90+`: comprovada externamente ou em produção.

Um required gate falho ou não executado mantém `NO_GO`, independentemente da média.

## Notas por item

| Item                         | Nota /100 | Evidência e limite dominante                                                                                                              |
| ---------------------------- | --------: | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Governança                   |        68 | Pipeline, aprovação e fail-closed fortes; vocabulário de estado e gate de eval divergem do contrato.                                      |
| Requisitos e rastreabilidade |        70 | Matrizes amplas e candidate binding; existem fontes concorrentes e requisitos `PARTIAL/BLOCKED`.                                          |
| Qualidade documental         |        55 | Corpus extenso, mas com drift, 15 links locais quebrados, um JSON inválido e histórico/current pouco explícitos.                          |
| Arquitetura                  |        70 | Bons limites API/worker/runtime/persistência; composição produtiva incompleta, hotspots grandes e adapter LangGraph real não demonstrado. |
| Backend/API                  |        75 | Validação, tenant binding, autenticação e approvals robustos no ambiente controlado; sem tráfego implantado real.                         |
| Orquestração de agentes      |        68 | Goal/Plan/Step, budgets, leases, lineage e recovery são reais; corrida de idempotência reduz a nota.                                      |
| Dados e persistência         |        72 | PostgreSQL, RLS, constraints, migrations e fencing substanciais; sem restore físico/RPO-RTO e sem retenção aplicada.                      |
| Segurança e privacidade      |        76 | Bom isolamento e red-team local; IdP externo, scanners CI atuais e ciclo de retenção/eliminação não comprovados.                          |
| Safety, handoff e approvals  |        78 | Handoff, takeover, aprovação e `UNCERTAIN` fortes no sintético; nenhuma autoridade real validada.                                         |
| Testes e QA                  |        72 | Suíte extensa e corrente; 117 skips, cobertura desigual, E2E Chromium-only e eval abaixo do contrato.                                     |
| Confiabilidade e recuperação |        63 | Retry, leases, fencing e recovery presentes; carga in-memory, corrida concorrente e ausência de failover/restore real.                    |
| Observabilidade              |        62 | Logs estruturados, correlação e audit chain; sem collector hospedado, alertas, SLOs ou operação comprovada.                               |
| Frontend e UX                |        68 | Responsividade, estados e teclado testados; faltam axe/contraste, leitor de tela, zoom/forced-colors e multibrowser.                      |
| RAG e integrações            |        42 | Fail-closed local correto; provider, canal, IdP e fonte institucional não validados.                                                      |
| Operações                    |        50 | Runbooks, preflight e PostgreSQL descartável existem; deploy, rollback, plantão, piloto e RPO/RTO não foram exercitados.                  |
| Manutenibilidade             |        62 | TypeScript estrito, lint e testes fortes; arquivos monolíticos, caminhos paralelos e higiene documental insuficiente.                     |
| Prontidão de produção — gate |         0 | O pacote marca `Production Readiness` como `BLOCKED`; oito gates externos/humanos permanecem abertos.                                     |

Nota média simples dos 16 critérios de maturidade: **66/100**. O gate de produção fica separado porque sua natureza é binária e soberana.

## Achados priorizados

### P0-RELEASE-01 — produção obrigatoriamente bloqueada

Provider, canal, identidade externa, RAG institucional, RPO/RTO, piloto, rollback e sign-off humano estão `NOT_VALIDATED/PENDING`. O manifesto nega autoridade produtiva em `certification/phase11/release-manifest.json` e a promoção para `PRODUCTION` é corretamente recusada.

### P1-EVAL-01 — o selo AAA viola o contrato de qualidade

`docs/02_spec/aaa_quality_contract.md` exige task success `>=97%` e proíbe compensação entre gates. O relatório mede `53/56`, ou `94,64%`, mas usa threshold `85%` e declara `PASS`. As regras então emitem `AAA_CANDIDATE`.

Consequência: os rótulos `AAA_CANDIDATE`, `CONDITIONAL_GO` e elegibilidade para staging são rejeitados contra o contrato soberano. O estado correto até correção/reexecução é `FAIL / NO_GO`.

### P1-ORCH-01 — criação de Goal não é linearizável

`runDurableGoal` executa `getGoalByInboundMessage` e, se ausente, chama `createGoal` em outra operação. O store usa `INSERT` simples, sem `ON CONFLICT` ou tratamento de `23505`, sob índice único parcial por `(tenant_id, inbound_message_id)`.

Dois executores concorrentes podem ler ausência; um insere e o outro falha com unique violation. O índice evita Goal duplicado, mas o perdedor pode entrar em retry e eventualmente DLQ. Os testes localizados são sequenciais.

### P1-OPS-01 — não existe vertical produtivo executável completo

O worker PostgreSQL rejeita `NODE_ENV=production`, enquanto o preflight exige kernel durável/PostgreSQL nesse perfil. A imagem Docker publicada inicia apenas a API. Mesmo após os gates externos, o artefato atual ainda não formaria uma topologia produtiva completa.

### P1-EVID-01 — certificação e preflight superestimam a evidência

- Scores automáticos atribuem `100` a áreas locais enquanto o mesmo resultado contém `Auditability=40/FAIL`, `Data Governance=70/FAIL` e `Production Readiness=0/BLOCKED`.
- O gate denominado `independent_critic` confirma presença textual em Markdown, não independência de identidade/contexto.
- Sinais externos do preflight são booleanos de configuração e não dossiês assinados vinculados ao release.
- `implementationComplete` e `evidenceComplete` são aceitáveis apenas com qualificador local; sem ele, são claims rejeitados.

### P1-DATA-01 — privacidade e retenção são principalmente declarativas

Classificação e tempos de retenção existem, mas não foi encontrado um ciclo conectado de expiração, purge/erasure, minimização e auditoria da eliminação. Objective e planner context podem permanecer persistidos sem lifecycle demonstrado.

### P1-OBS-01 — telemetria produtiva não foi demonstrada

O worker emite JSON/stdout e há tracing/correlação local, porém não há collector, dashboard, alertas, SLOs ou exercício operacional externo. As métricas HTTP não constituem prova de observabilidade produtiva.

### P2-DOC-01 — control plane documental apresenta drift

- `docs/03_build/0302_backlog_master.md` preservava um estado anterior de AUD17-12, anterior à rodada PostgreSQL.
- README, SPEC/master, matrizes Phase 11 e AUD17 e relatórios históricos usam linguagem concorrente de “atual/vigente”.
- Há 15 links locais quebrados e `docs/04_audit/evidence/AAA/AAA-07/rework-fencing-c6/probe-after.json` está vazio/inválido.

### P2-MAINT-01 — hotspots e caminhos paralelos

`apps/api/src/server.ts` possui aproximadamente 6.158 linhas e `packages/persistence/src/postgres.ts`, 4.219. Runtime, orquestração e composição também concentram responsabilidades. Caminhos legacy e governed coexistem, ampliando a superfície de regressão.

### P2-UX-01 — evidência de acessibilidade incompleta

Há screenshots responsivas e testes de teclado/estados, mas não foram demonstrados axe/contraste, leitores de tela, forced-colors, zoom/reflow 200–400%, Firefox ou WebKit. Parte da tipografia operacional usa tamanhos muito pequenos.

## Verificações observadas

### Executadas frescas nesta auditoria

- Node `22.23.2`.
- `npm test`: `255` arquivos PASS, `10` SKIP; `1.792` testes PASS, `117` SKIP.
- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `npm run format:check`: PASS.
- Regressão focada: `5` arquivos / `24` testes PASS.
- `npm run certification:verify:phase11`: PASS para o pacote corrente antes desta persistência documental.
- `npm run evidence:verify:phase11`: PASS para o mesmo pacote.
- Preflight negativo de produção: configuração insegura recusada, sem side effect.
- Promotion check de produção: exit `1` esperado, `eligible=false`, `production_assurance_incomplete`.
- Mutation sentinel da crítica independente: digest antes/depois idêntico; worktree limpo.

### Evidência selada, não reexecutada integralmente nesta rodada

- PostgreSQL descartável: `23` arquivos / `202` testes PASS.
- E2E: `9/9` Chromium.
- Coverage: aproximadamente `89,45%` statements, `82,76%` branches, `88,68%` functions e `89,99%` lines.
- Evals: `53/56`, task success `0,946428...`.
- Chaos: `18` PASS e `2` skips PostgreSQL naquele runner; casos PostgreSQL têm gate separado.
- Load: 10 mil eventos de outbox em memória, sem perda/duplicidade reportada.
- Recovery: `87` PASS.

### Não executado

Deploy, build/scan de imagem, PostgreSQL/E2E/coverage completos frescos, CodeQL/gitleaks hospedados, provider, canal, IdP, RAG institucional, staging real, soak, failover, backup/restore, rollback, piloto ou sign-off.

## Cobertura documental

- `2.362/2.362` arquivos inventariados, aproximadamente `26,7 MB`.
- `469/469` Markdown processados estruturalmente; `53.932` linhas.
- `382/382` JSON tentados; `381` válidos e `1` inválido.
- `631` referências locais examinadas; `15` ausentes.
- Leitura semântica dirigida aos documentos canônicos/correntes e amostragem orientada por risco dos artefatos históricos.

Não se afirma leitura humana linha a linha dos aproximadamente 27 MB de logs e evidências históricas. A cobertura integral desses artefatos foi mecânica; a leitura semântica foi seletiva e explícita.

## Claims rejeitados

- `Triple AAA`, `state of the art` ou nota `90+`.
- `Staging validado`; existe somente execução local sintética.
- `Implementation/evidence complete` sem qualificador local.
- `Independent critic PASS` como prova automática de independência.
- `Evals PASS` como satisfação do contrato de `97%`.
- PostgreSQL descartável como prova de durabilidade física/RPO-RTO.
- Preflight negativo aprovado como prova de prontidão produtiva.

## Parecer final

- **Ambiente local controlado:** implementação útil para desenvolvimento, mas `FAIL / NO_GO` no gate AAA vigente.
- **Staging real:** `NO_GO` até alinhar o threshold, atingir `>=97%`, fechar a corrida e certificar um vertical representativo.
- **Produção:** `FAIL / NO_GO` obrigatório.

O plano de remediação está em [roadmap 0331](../03_build/0331_aud20260919_roadmap.md) e [backlog 0332](../03_build/0332_aud20260919_backlog.md).

## Limites de autoridade

Este relatório não autoriza BUILD, integração real, uso de dados reais, staging, deploy, publicação, ação clínica/financeira/prontuário, confirmação/cancelamento/reagendamento de consulta ou produção. Toda ação sensível continua exigindo approval ou handoff.
