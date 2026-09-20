# Reauditoria da entrega AUD19 — 2026-09-20

## Decisão executiva

A entrega corrigiu parte importante dos problemas encontrados na auditoria 0566 e ampliou de forma material testes, persistência, segurança, acessibilidade e empacotamento. Entretanto, a afirmação de que `AUD19-01..12` estão integralmente concluídas é rejeitada.

- **Maturidade técnica local/controlada:** `72/100`.
- **Integridade do pacote atual:** `FAIL`.
- **Elegibilidade para staging real:** `NO_GO`.
- **Produção:** `NO_GO`.
- **Confiança do parecer:** `0,94`.
- **Achados:** 2 P0, 8 P1, 5 P2 e 1 P3.

A média é apenas descritiva. Os P0 de vínculo candidato–crítico–imagem e os P1 de correctness impedem que a evidência local seja promovida.

## Identidade e escopo

- Baseline anterior à entrega: `843c927`.
- HEAD auditado: `bb898f8fc8c02751353d84aa7f1986625855b2ec` (`main`, 23 commits locais à frente de `origin/main`).
- Worktree: limpo antes e depois da inspeção read-only.
- Pacote canônico observado: `candidateId fbca3d2b…`, commit-âncora `fa78f92`, perfil solicitado `STAGING`.
- Escopo: código, testes, migrations, documentação, certificação, API, worker, persistência, observabilidade, frontend e imagens locais.
- Fora do escopo: qualquer provider/canal/IdP/RAG real, deploy, dado real, restore físico, piloto ou efeito clínico, financeiro, de agenda ou prontuário.

## Método e barra congelada

A rodada combinou inspeção direta de `843c927..bb898f8`, verificações frescas, dois críticos read-only de contexto separado e adjudicação final. A barra exigiu:

1. cada aceite de `AUD19-01..12` comprovado no boundary prometido;
2. candidato, crítico, imagem e manifest ligados aos mesmos bytes;
3. nenhum threshold obrigatório rebaixável;
4. idempotência preservada durante retenção e concorrência;
5. ausência de P0/P1 para elegibilidade de staging;
6. gates externos/humanos separados de prova local.

## Notas por dimensão

| Dimensão                   | Nota | Síntese                                                                                                                |
| -------------------------- | ---: | ---------------------------------------------------------------------------------------------------------------------- |
| Governança                 |   68 | Pipeline e bloqueio produtivo fortes; estados e selo corrente apresentam deriva.                                       |
| Requisitos/rastreabilidade |   72 | Matriz ampla; vários critérios de pronto foram satisfeitos apenas parcialmente.                                        |
| Documentação               |   65 | Links/JSON verdes; identidade do selo, próxima ação e validação de estados estão incorretas/incompletas.               |
| Arquitetura                |   76 | Extrações reais reduziram hotspots; gates ainda permitem regressão ampla.                                              |
| API/backend                |   82 | Boundaries e fail-closed robustos no local; sem vertical implantado.                                                   |
| Orquestração               |   70 | Get-or-create atômico no SQL; compatibilidade de contexto e prova E2E concorrente insuficientes.                       |
| Dados                      |   68 | Retenção e ledger existem; purge de idempotência reabre duplicação tardia e grande parte do catálogo aguarda política. |
| Segurança                  |   78 | Replay distribuído e preflight melhoraram; atestação e privilégios do replay ainda têm gaps.                           |
| Safety/approval            |   85 | Handoff, approval, fencing e ausência de efeitos reais permanecem fortes.                                              |
| Testes/QA                  |   82 | Suíte extensa e cobertura alta; mutation não é gate do selo e há branch chasing/fixtures extensas.                     |
| Confiabilidade             |   70 | Leases/recovery sólidos; concorrência completa e dedupe pós-retenção não estão provados.                               |
| Observabilidade            |   58 | Collector/alertas existem, mas runtime usa JSON local e não há owner/SLO/pager.                                        |
| UX/acessibilidade          |   82 | E2E e a11y multibrowser fortes; sem leitor de tela real/revisão humana.                                                |
| RAG/integrações            |   45 | Contratos fail-closed; integrações autorizadas ainda sem inputs e sem execução.                                        |
| Operações                  |   55 | Topologia API+worker existe; imagens não pertencem ao candidato final e smoke não é staging-like completo.             |
| Manutenibilidade           |   70 | Tipagem/lint fortes; hotspots e testes de branch muito grandes permanecem.                                             |

Média simples: **72/100**. O gate de release é binário e permanece `FAIL`.

## Achados priorizados

### P0-EVID-01 — o crítico obrigatório falha no HEAD atual

`node scripts/phase11-2-evidence-check.mjs --critic` retorna `FAIL`: o relatório está ligado a `fa78f92`, enquanto o HEAD é `bb898f8`, e o digest declarado de `AUD19-12-final-seal-outcome.md` não corresponde ao arquivo atual. Ao mesmo tempo, `certification:verify:phase11` passa porque aceita a âncora ancestral e os statuses já armazenados.

Consequência: as alegações “34/34”, “crítico fresco PASS” e “verificadores PASS no mesmo candidato” não governam o HEAD auditado. O verificador geral precisa executar/verificar o gate de crítico corrente, não apenas confiar no resultado armazenado.

### P0-SUPPLY-01 — imagens de outro commit foram atribuídas ao candidato final

`AUD19-11-digests.json` registra imagens construídas em `67065a1` com uma alteração dirty. O release manifest associa esses digests ao candidato `fa78f92`. `package.json` e outros bytes copiados pelo Dockerfile diferem entre os dois commits; o certificador apenas transfere os valores do JSON anterior e o verificador não reinspeciona as imagens.

Consequência: não existe prova de que API e worker certificados contêm os bytes do candidato. Staging permanece `NO_GO` até rebuild candidate-bound, inspeção de conteúdo e assinatura/attestation coerente.

### P1-EVAL-01 — o runner ainda aceita reduzir o piso de 97%

`packages/agent-evals/src/runner.ts` mescla `input.thresholds` sobre o default. Uma chamada com `taskSuccessRate: 0.85` pode declarar `53/56` como `PASS`. A camada posterior de certificação detecta o relatório inválido, mas o critério de que runner, contrato e certificador compartilham um piso único não foi satisfeito.

### P1-ORCH-01 — Goal incompatível pode ser reaproveitado

`assertGoalReuseCompatibility` compara tenant, inbound message e correlation, mas não compara sessão, conversa, envelope, objetivo, success criteria ou trace. O worker grava esses campos no planner context, porém o adapter PostgreSQL passa apenas três campos à validação. A atomicidade do `ON CONFLICT` está correta; a compatibilidade semântica do vencedor não está.

### P1-ORCH-02 — o teste concorrente não cobre a jornada prometida

O teste PostgreSQL disputa criação/claim, mas não executa duas jornadas completas de `runDurableGoal` com redelivery de outbox, crash entre criação/claim, última tentativa e efeito. O cenário denominado “sem retry/DLQ” mantém attempts/observations/evaluations em zero. Portanto, a ausência de DLQ espúria ponta a ponta não foi demonstrada.

### P1-DATA-01 — a retenção remove a única barreira de deduplicação inbound

O catálogo define `inbound_idempotency` como `delete` após 30 dias. A ingestão usa a PK dessa tabela como única barreira e recria a chave após a eliminação. Um replay tardio pode ser processado de novo, contrariando a decisão de que a purga nunca reintroduz duplicidade. É necessário tombstone/identity digest durável ou uma política de janela comprovadamente segura.

### P1-SEC-01 — atestação não está ligada aos bytes executados

O `candidateDigest` é comparado com outro valor fornecido pelo ambiente, não com `certification/current.json`, a imagem ou o manifest observado. O config digest também omite identidade do keyring/replay store e referências estáveis dos secrets críticos. Alterações relevantes podem não invalidar a atestação.

### P1-SEC-02 — readiness do replay distribuído não prova privilégios

`PostgresOperatorReplayStore.assertReady()` verifica somente a existência da tabela. A checagem de least privilege cobre `webhook_replay_events`, mas não `operator_replay_events`. Uma role sem `INSERT/UPDATE/DELETE` pode passar no startup e rejeitar tokens posteriormente.

### P1-QA-01 — mutation sentinel não é gate candidate-bound

O histórico `9/9` é plausível, mas não existe command gate próprio em `phase11-certify.mjs`; o CLI só falha por gaps com `--fail-on-gaps`. O relatório também não está ligado aos bytes atuais pelo verificador geral. Mutation precisa ser executada, falhar fechado e integrar o manifest do mesmo candidato.

### P1-OBS-01 — observabilidade não está conectada à operação

Collector, regras e exercício sintético existem, porém o worker produtivo instancia telemetria JSON local. Não há collector hospedado, dashboard, pager, owner/SLO aprovado nem emissão real de `approval_latency_ms`. O claim de detecção ponta a ponta por um operador não foi satisfeito.

### P2-DOC-01 — control plane corrente apresenta drift

- `docs/CURRENT.md` e backlog 0332 apontam para `9988762d…@cc28bfb`; o pacote aponta para `fbca3d2b…@fa78f92`.
- `scripts/docs-check.mjs` procura `status:` em texto, mas os estados correntes estão em tabela; a saída `declared: []` é aceita como válida.
- A próxima ação ainda diz “obter autorização”, embora o documento de AUD19-13 registre Opção A; faltam inputs, owners e ambiente, não a escolha inicial.
- O registro de Opção A não contém referência imutável à instrução humana; ele é contexto, não dossiê nem sign-off.

### P2-ARCH-01 — gate de hotspot permite regressão

O architecture test usa os baselines anteriores à extração (`6215/4221`) em vez dos tamanhos pós-extração (`4958/3441`). Os arquivos podem crescer substancialmente sem falhar o gate.

### P2-OPS-01 — smoke não é composição staging-like completa

API e worker têm targets non-root e healthchecks, mas os smokes são separados e executados em `NODE_ENV=test`. O healthcheck do worker usa caminho fixo embora o readiness file seja configurável. Não há prova conjunta API+worker+DB do mesmo artefato final.

### P2-UX-01 — a11y automatizada tem limites explícitos

Os `48/48` checks e `75/75` E2E multibrowser são confirmados, mas não incluem leitor de tela real, zoom nativo, revisão humana ou plataforma fora de Linux. Isso não reabre a fatia local, mas impede claim de fechamento pleno.

### P2-MAINT-01 — cobertura foi elevada com testes muito volumosos

Os novos testes exercitam comportamento, mas três suites de branch hardening concentram milhares de linhas, muitos doubles e casts. A cobertura é útil, porém precisa de revisão de redundância, fixtures tipadas e mutantes adicionais para reduzir overfitting ao branch graph.

### P3-HYGIENE-01 — whitespace em logs selados

`git diff --check 843c927..HEAD` identifica espaços/linhas em branco em logs de coverage, verify e E2E. Não afeta runtime, mas deve ser tratado sem adulterar evidência histórica.

## Claims confirmados

- Eval atual `56/56` e certificador rejeitando relatório abaixo de `0,97`.
- Get-or-create PostgreSQL linearizável no nível do índice/UPSERT.
- Retenção tenant-scoped, transacional, hold-aware e fail-closed sem política.
- Replay PostgreSQL atômico cross-instance.
- Redução real dos hotspots `server.ts` e `postgres.ts`.
- Cobertura crítica registrada acima de 95% e skip policy com zero required skips.
- Acessibilidade automatizada e E2E em Chromium, Firefox e WebKit.
- Targets API/worker locais, non-root, com readiness/drain.
- Preflight e promotion recusando produção sem side effects e com oito gates externos/humanos abertos.
- Nenhum provider/canal/IdP/RAG real, dado real ou efeito sensível foi usado.

## Verificações frescas

- Node `22.23.2`.
- `npm test`: `282` arquivos PASS, `12` SKIP; `2.146` testes PASS, `172` SKIP condicionais.
- Foco local sem PostgreSQL: `4` arquivos PASS, `2` SKIP; `21` testes PASS, `14` SKIP.
- `format:check`, `docs:check`, `typecheck` e `lint`: PASS antes desta atualização documental.
- `certification:verify:phase11` e `evidence:verify:phase11`: PASS, com a limitação estrutural descrita em P0-EVID-01.
- `phase11-2-evidence-check --critic`: FAIL no HEAD atual.
- `production:preflight`: FAIL esperado, 32 bloqueios e `sideEffects:false`.
- `promotion:check`: `eligible:false`, oito external blockers.
- PostgreSQL, coverage, Docker rebuild e Playwright completos não foram reexecutados nesta auditoria; a evidência selada foi inspecionada e contestada onde não era candidate-bound.

Após a persistência deste relatório/roadmap/backlog, `format:check`, `docs:check` (`719` links, `557` JSONs, estado/next action coerentes) e `tests/docs-integrity.test.js` (`5/5`) passaram. `certification:verify`, `evidence:verify` e `--critic` falharam fechado por candidate/tree/digest drift, resultado esperado e correto para a nova árvore documental. Nenhum re-selo foi executado.

## Status corrigido

- `AUD19-01`, `AUD19-02`, `AUD19-03`, `AUD19-04`, `AUD19-05`, `AUD19-06`, `AUD19-08`, `AUD19-09` e `AUD19-11`: reabertas via programa `AUD20-REM`.
- `AUD19-07` e `AUD19-10`: entregas locais preservadas, com limitações/P2 incorporados ao programa novo.
- `AUD19-12`: `BLOCKED`; o selo permanece histórico, não elegível para staging.
- `AUD19-13..15`: `BLOCKED`; Opção A registrada, mas faltam inputs operacionais, owners, ambiente e evidência.

## Parecer final

- **Uso local para desenvolvimento/diagnóstico:** `PARTIAL PASS`.
- **Certificação local/controlada:** `FAIL / NO_GO`; a afirmação de conclusão integral está rejeitada.
- **Staging real:** `NO_GO` por P0/P1 locais e ausência de execução implantada.
- **Produção:** `NO_GO` por P0/P1 locais e oito gates externos/humanos não validados.

O plano de correção está no [roadmap 0333](../03_build/0333_aud20260920_roadmap.md) e no [backlog 0334](../03_build/0334_aud20260920_backlog.md).

## Limites de autoridade

Esta auditoria e o planejamento associado não autorizam BUILD, re-selo, push, deploy, publicação de imagem, uso de credenciais/dados reais ou execução externa. Toda ação sensível continua exigindo approval ou handoff.
