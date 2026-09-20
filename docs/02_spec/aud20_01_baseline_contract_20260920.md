# AUD20-01 - contrato de baseline, barra e gate G0

**Programa:** `AUD20-REM`
**Task:** `AUD20-01`
**Gate:** `G0 - verdade corrente`
**Status da task:** `IN_PROGRESS` durante a preparacao documental
**Escopo:** baseline, SPEC, matriz de rastreabilidade, negativos e registro de ownership; nenhum BUILD nesta task.

## 1. Objetivo observavel

Restabelecer uma unica verdade corrente para a remediacao da reauditoria 0567,
sem reaproveitar o selo AUD19 historico. O resultado desta task deve deixar
registrados:

1. o candidato vivo e o ponteiro historico que nao pode ser promovido;
2. cada achado P0/P1 ligado a task, owner de funcao, boundary, teste negativo,
   rollback e evidencia;
3. a barra numerica e os required gates que nao podem ser reduzidos;
4. a autorizacao limitada a BUILD local controlado apos o G0, sem efeitos
   externos, dados reais, staging real ou producao;
5. a proxima acao unica: `AUD20-02` somente depois do G0 aprovado e registrado.

Este documento nao qualifica candidato, nao re-sela certificacao e nao altera
qualquer evidencia historica.

## 2. Fontes canonicas e supersessao

- Achados correntes: `docs/04_audit/0567_aud19_delivery_reaudit_2026-09-20.md`.
- Ordem executavel: `docs/03_build/0333_aud20260920_roadmap.md` e
  `docs/03_build/0334_aud20260920_backlog.md`.
- Indice de estado: `docs/CURRENT.md`.
- Barra soberana: `docs/02_spec/aaa_quality_contract.md` v2.
- Operacao: `docs/07_agents/AGENTS.md`, `docs/99_runtime_state.md`,
  `docs/20_master_execution_log.md` e `docs/30_backlog_master.md`.
- `AUD19-01..12` e o selo apontado por `certification/current.json` sao
  historicos/supersedidos para a arvore corrente. Nao serao reclassificados por
  copia de JSON, log, manifest ou status.

## 3. Limite de autoridade

### Autorizado depois do G0

- codigo, testes, migrations aditivas e documentacao no repositorio local;
- PostgreSQL, Docker e Playwright descartaveis, com dados sinteticos;
- rebuild local, SBOM, verificacoes de imagem e commits locais;
- falhas e resultados negativos preservados como evidencia.

### Nao autorizado

- push, PR, deploy, publicacao de imagem ou qualificacao de staging real;
- provider, canal, IdP, RAG institucional, egress ou qualquer sistema externo;
- credenciais reais, segredos persistidos, PII ou dados clinicos/financeiros;
- consulta real, acao clinica/financeira, agenda ou prontuario definitivo;
- RPO/RTO fisico, piloto, rollback externo ou sign-off de release.

A autorizacao humana da solicitacao corrente cobre somente a execucao local
controlada descrita acima. Oito gates externos/humanos continuam separados e
`NO_GO`.

## 4. Baseline congelado para G0

Captura feita depois do checkpoint documental `98ec5e8` e antes de qualquer
alteracao de codigo AUD20:

| Campo                                 | Valor                                                                   |
| ------------------------------------- | ----------------------------------------------------------------------- |
| branch                                | `main`                                                                  |
| commit HEAD                           | `98ec5e80d8149f504e09f7855a3d86924e5754d3`                              |
| relacao com origin                    | `24` commits locais a frente                                            |
| worktree                              | limpo; nenhum untracked                                                 |
| candidateId vivo                      | `b4cb18ac74610a644695bdde1d36e9234ee9322b2d7f18b5b9d600c69c93c7f7`      |
| treeHash vivo                         | `68a2a2b44a4997d89c1ceeb1e999f3256489d047c4774f2b3010f48560f56d7c`      |
| gitTreeHash vivo                      | `1ffd178b15bbc5c94feec60d51bd50d518274f58`                              |
| arquivos no escopo                    | `1103`                                                                  |
| Node                                  | `22.23.2`                                                               |
| ponteiro historico                    | `fbca3d2b...@fa78f92e`; `certification/current.json`                    |
| perfil solicitado pelo selo historico | `STAGING`                                                               |
| decisao corrente                      | entrega `PARTIAL PASS`; certificacao `FAIL`; staging/production `NO_GO` |

O candidato vivo e o ponteiro historico sao identidades distintas. Qualquer
mudanca de byte no escopo invalida esta captura e exige nova baseline.

## 5. Required gates e barra imutavel

Os seguintes gates sao obrigatorios para `AUD20-12`; `NOT_RUN`, `SKIPPED`,
`UNKNOWN`, `BLOCKED` ou `FAIL` nunca contam como PASS:

| Gate            | Condicao minima                                                                                    | Evidencia exigida                                            |
| --------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `G-EVAL`        | task success `>=0.97`, zero unsafe/policy violation; override so pode ser mais estrito             | runner, regra, certificador, verifier e negativo 53/56       |
| `G-LINEAGE`     | fingerprint canonico de sessao, conversa, envelope, objetivo, criteria, snapshot e trace           | duas jornadas concorrentes completas e divergencia rejeitada |
| `G-RETENTION`   | dedupe inbound sobrevive a TTL por tombstone/digest ou politica equivalente testada                | PostgreSQL com tenant, hold, batch, replay tardio e rollback |
| `G-ATTESTATION` | candidate/image/config digests derivam dos artefatos observados; replay store possui CRUD e grants | bootstrap/readiness negativo e manifest observado            |
| `G-CRITIC`      | critico independente e mutation sentinel do candidato corrente                                     | relatorio candidate-bound, `--critic`, `--fail-on-gaps`      |
| `G-SUPPLY`      | imagem/API/worker/SBOM/migrations/policy do mesmo candidato; non-root e sem segredo                | rebuild, inspeccao de conteudo e hashes no mesmo run         |
| `G-DOCS`        | estados, proxima acao, candidate e autorizacao conferem semanticamente                             | checker positivo e negativos de tabela/stale/action          |
| `G-HOLDOUT`     | holdout integrado por categoria, reproducivel, `>=0.97`, zero unsafe                               | dataset/runner/hash congelados antes da observacao           |
| `G-OBS`         | caminho real API/worker emite telemetria redigida e `approval_latency_ms`                          | collector/sink controlado, alerta e exercicio com timestamps |
| `G-COMPOSE`     | API+worker+PostgreSQL do mesmo build, readiness/drain/restart/replay; PG sem skip obrigatorio      | harness descartavel e teardown limpo                         |

Metas herdadas da barra soberana permanecem vigentes: cada area deve atingir
`>=97/100`, statements/lines/functions `>=90%`, branches `>=85%`, branches
criticos `>=95%`, mutacoes selecionadas detectadas `100%`, denominador auditado,
zero required skips e revisao independente obrigatoria, sem compensacao por
media. Os caps de arquitetura
pos-extracao sao `server.ts <= 4958` e `postgres.ts <= 3441`.

## 6. Negativos capazes de derrotar a implementacao

| ID          | Ataque                                                                            | Resultado obrigatorio                                     |
| ----------- | --------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `AUD20-N01` | `53/56` com threshold `0.85`                                                      | falha no runner, regra, certificador e verifier           |
| `AUD20-N02` | threshold/metric `NaN`, ausente, string ou arredondado acima do real              | `FAIL`, nunca coercao para PASS                           |
| `AUD20-N03` | session/conversation/envelope/objective/criteria/snapshot/trace divergente        | reuse rejeitado sem vazamento de contexto                 |
| `AUD20-N04` | crash apos create/claim, redelivery, ultima tentativa e DLQ                       | uma jornada efetiva, fencing do perdedor, sem DLQ espuria |
| `AUD20-N05` | replay inbound depois do TTL/purge                                                | tombstone/digest impede processamento e efeito duplicado  |
| `AUD20-N06` | candidate/config/secret/keyring autodeclarado ou replay role sem CRUD             | startup/readiness falha fechado                           |
| `AUD20-N07` | critic/mutation de outro commit, relatorio stale ou mutante sobrevivente          | selo corrente negado                                      |
| `AUD20-N08` | imagem de commit diferente, conteudo divergente, root ou segredo na imagem        | supply gate negado                                        |
| `AUD20-N09` | estado em tabela/YAML/JSON omitido ou next action obsoleta                        | checker documental falha                                  |
| `AUD20-N10` | holdout com unsafe action, policy violation ou agente deterministico privilegiado | holdout falha ou e declarado invalido                     |
| `AUD20-N11` | runtime sem collector/latencia, dado sensivel em sink ou alerta sem correlacao    | observabilidade nao fecha                                 |
| `AUD20-N12` | healthcheck ignora caminho configurado, restart perde outbox ou PG e skipa        | compose gate falha                                        |
| `AUD20-N13` | fixture/sintetico apresentado como provider, RAG ou sign-off externo              | gate externo permanece bloqueado                          |

## 7. Rastreabilidade e ownership

A matriz machine-readable em
`docs/04_audit/evidence/AUD20/AUD20-requirements-matrix.json` e o manifesto
candidate-bound em
`docs/04_audit/evidence/AUD20/AUD20-01-candidate-manifest.json` sao as fontes
operacionais de IDs, dependencias, owners funcionais, arquivos permitidos,
negativos, comandos e evidencias. O owner e uma funcao de engenharia, nao um
sign-off humano inventado. `AUD20-10` mantem owner/SLO como
`WAITING_HUMAN_APPROVAL`; nenhum objetivo operacional sera criado por inferencia.

Mapeamento de findings:

| Finding 0567           | Tasks         | Owner funcional                    |
| ---------------------- | ------------- | ---------------------------------- |
| `P0-EVID-01`           | `01,06,12`    | certification / evidence integrity |
| `P0-SUPPLY-01`         | `07,11,12`    | supply chain / runtime             |
| `P1-EVAL-01`           | `02,09,12`    | evals / certification              |
| `P1-ORCH-01/02`        | `03,11,12`    | orchestration / persistence        |
| `P1-DATA-01`           | `04,11,12`    | persistence / data governance      |
| `P1-SEC-01/02`         | `05,11,12`    | security / persistence             |
| `P1-QA-01`             | `06,09,12`    | QA / certification                 |
| `P1-OBS-01`            | `10,11,14`    | observability / operations         |
| `P2-DOC-01`            | `01,08`       | control plane / docs               |
| `P2-ARCH/OPS/UX/MAINT` | `08,09,11,12` | architecture / QA / operations     |

## 8. Protocolo de evidencia

Cada task tecnica deve:

1. registrar RED reproduzivel antes da implementacao;
2. alterar somente os arquivos permitidos na sua entrada da matriz;
3. executar GREEN focado e regressao da area sob Node `22.23.2`;
4. executar os negativos da task e preservar exit code/log sanitizado;
5. registrar candidateId no inicio e verificar drift antes do veredicto;
6. atualizar runtime state, execution log, backlog e evidencia na mesma rodada.

O selo final deve reconstruir candidato, imagem, SBOM, migrations, policy,
critico e mutation depois do freeze final. Nenhum JSON anterior sera copiado
para satisfazer um gate.

## 9. Rollback e roll-forward

- Rollback documental: reverter apenas o commit da task AUD20 e manter a
  reauditoria 0567, baseline e evidencias historicas intactas.
- Rollback de banco: migrations somente aditivas, com rollback controlado ou
  forward-fix explicitamente testado; nunca apagar dados para fabricar o teste.
- Roll-forward: qualquer mudanca de contrato, threshold, manifest, lockfile,
  imagem ou arquivo do escopo reabre a task dependente e exige novo candidateId.
- Falha de gate mantem `BLOCKED`/`NO_GO`; nao ha override de threshold ou skip.

## 10. Criterio de transicao do G0

`AUD20-01` so pode passar para `COMPLETED` quando todos os itens abaixo
estiverem registrados:

- baseline e ponteiro stale reproduzidos com exits reais;
- manifesto candidate-bound com arquivo, tamanho, SHA-256, commit, tree e
  ambiente registrado;
- SPEC, matriz, barra e negativos versionados;
- ownership funcional e arquivos permitidos definidos para `AUD20-02..12`;
- autorizacao local controlada e limites externos explicitados;
- revisao humana da solicitacao corrente e revisao independente do pacote
  documental registradas;
- runtime state, execution log, backlog e `docs/CURRENT.md` apontarem para o
  mesmo estado;
- `AUD20-02` for a unica proxima task `READY_FOR_NEXT_STEP`;
- G0 nao conceder staging real, producao ou AUD20-13..15.

Enquanto esta transicao nao estiver registrada, `AUD20-02..12` permanecem
`BLOCKED` e nenhum codigo AUD20 pode ser iniciado.
