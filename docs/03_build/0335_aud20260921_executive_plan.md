# Plano executivo — remediação integral pós-auditoria 0568

**Programa:** `AUD20-REM v2` · **estado deste artefato:** `COMPLETED`
(planejamento) · **execução de produto:** `AUD20-04` `IN_PROGRESS` · **perfil:**
`CONTROLLED_LOCAL` · **staging/produção:** `NO_GO`.

Fontes: [auditoria 0568](../04_audit/0568_full_repository_audit_2026-09-21.md),
[contrato AUD20](../02_spec/aud20_01_baseline_contract_20260920.md),
[quality bar](../04_audit/evidence/AUD20/AUD20-quality-bar.json),
[roadmap 0336](0336_aud20260921_roadmap.md) e
[backlog 0337](0337_aud20260921_backlog.md). O
[prompt 0338](0338_aud20260921_codex_execution_prompt.md) é a entrada operacional
para um agente Codex. A relação machine-readable F01–F30 está na
[matriz v2](tracking/aud20_v2_findings_matrix.json).

## 1. Resultado esperado

Eliminar ou encaminhar corretamente os 30 achados F01–F30 da auditoria 0568,
produzir um candidato local único e reproduzível e deixar cada gate externo ou
humano em um estado verdadeiro e verificável. O programa termina em um destes
resultados:

1. `READY_FOR_NEXT_STEP` local: zero P0/P1 técnico aberto, candidato selado e
   elegível apenas para qualificação externa autorizada;
2. `WAITING_HUMAN_APPROVAL`: dossiê externo completo, aguardando autoridade
   real; ou
3. `BLOCKED`: critério obrigatório falhou ou input/ambiente necessário não
   existe.

Uma nota média nunca substitui required gate. `COMPLETED` técnico local não
autoriza staging real, produção, deploy, publicação de imagem, uso de dados
reais ou integração externa.

## 2. Escopo e autoridade

### Dentro do escopo

- Retenção, tombstones, batelamento, concorrência, lifecycle e migration segura.
- Integridade de receipts, manifests, critic, mutation, SBOM e certificação.
- Attestation, replay store, grants e preflight fail-closed.
- Checker documental semântico, pinning de runtime e limpeza de metadados.
- Holdout integrado, observabilidade, staging-like local e hardening Docker.
- Decomposição incremental de hotspots e redução de branch chasing.
- Chaos/load representativos em ambiente descartável e acessibilidade manual
  documentada quando houver pessoa/equipamento autorizados.
- Preparação de dossiês para provider, canal, IdP, RAG, restore, RPO/RTO,
  rollback, piloto e sign-off.

### Fora do escopo sem nova autoridade

- Commit, push, merge, publicação em registry, deploy ou alteração de ambiente
  compartilhado.
- Dados ou usuários reais, produção irrestrita e segredos versionados.
- Confirmar, cancelar ou reagendar consulta real automaticamente.
- Resposta RAG sem fonte institucional aprovada.
- Ação clínica, financeira ou de prontuário definitivo.
- Aceitar risco P0/P1, inventar owner/SLO/sign-off ou simular gate externo.

O prompt 0338 pode conceder BUILD **somente local e controlado** quando o usuário
o enviar ao executor. Ele não concede autoridade externa ou de release.

## 3. Classificação e estratégia

- **Tipo:** brownfield, remediação, schema/data migration, segurança, supply
  chain, observabilidade e release engineering.
- **Tier:** T4 pelo alcance multi-boundary, sensibilidade, migration e gates de
  release.
- **Risco:** alto; crítico para qualquer alegação de release/produção.
- **Blast radius:** repositório inteiro, com execução local e dados sintéticos.
- **Pipeline:** `AUDIT -> EVOLUTION -> SPEC -> PLAN -> BUILD <-> AUDIT`.

Estratégia: um único agente integrador, uma task ativa por vez quando houver
arquivos compartilhados. Cada task começa por recuperar o estado real, congelar
aceite e negativo, reproduzir a falha, aplicar a menor mudança coerente, executar
teste focado, regressão proporcional, revisão do diff e registrar evidência. Só
então o backlog e os controles mestres avançam.

## 4. Baseline que não pode ser confundido com conclusão

- HEAD observado pela 0568: `25434811334f5cec92ee0741079302271b82b7cb` com
  worktree dirty; novas mudanças exigem nova identidade de candidato.
- Maturidade local: `72/100`; produção: `20/100`; gate: `NO_GO`.
- Suites frescas da auditoria: unit `2.178` passes, PostgreSQL `332/332`,
  retenção `31/31`, E2E `75/75`, architecture `5/5`, evals `24/24`.
- O binding AUD20-04 falha em oito artefatos; Phase 11 e promoção rejeitam o
  candidato atual. Isso é baseline/negativo, não autorização para apagar logs.
- `AUD20-01..03` preservam seus resultados históricos; `AUD20-04` permanece
  aberta e deve ser corrigida antes de avançar o caminho crítico.

## 5. Invariantes do programa

1. Tenant, identidade, authority, approval, lineage e idempotência falham
   fechado em qualquer dúvida.
2. Tombstone nunca permite recriar processamento ou efeito; legal hold e tenant
   isolation permanecem invariantes.
3. Backfills/sweeps usam seleção estável, lote limitado, checkpoint/restart,
   métricas de progresso e contenção de locks.
4. Migration é expand/compatible quando possível; medir lock/duração em banco
   descartável antes de qualquer proposta de rollout real.
5. Logs brutos são fechados antes do receipt; receipt/manifest é gerado uma vez,
   depois verificado por processo separado. Qualquer write posterior invalida.
6. Candidato, código, testes, imagens, SBOM, migrations, policies, critic e
   mutation resultam dos mesmos bytes.
7. Required skips são zero no gate que depende do ambiente; skips são visíveis
   e nunca convertidos em PASS silencioso.
8. Segurança não aceita flags ou digests autodeclarados quando o recurso pode
   ser observado diretamente.
9. Evidência sintética nunca satisfaz provider/canal/IdP/RAG, restore físico,
   piloto ou sign-off.
10. Toda ação sensível exige approval ou handoff; nenhum gate técnico amplia a
    autonomia clínica/financeira/prontuário/agenda.

## 6. Frentes de execução

| Frente                   | Objetivo                                                      | Tasks            | Achados                           |
| ------------------------ | ------------------------------------------------------------- | ---------------- | --------------------------------- |
| A — dados e retenção     | Fechar escala, locks, lifecycle, minimização e semântica      | AUD20-04, 16     | F01, F04, F11–F14                 |
| B — controle e segurança | Reconciliar fontes e observar recursos reais                  | AUD20-05, 08, 20 | F07, F15–F18, F26, F30            |
| C — QA e confiança       | Tornar critic/mutation/holdout/scans obrigatórios             | AUD20-06, 09     | F08, F19, F21, F25                |
| D — operação             | Ligar telemetria, reduzir hotspots e qualificar comportamento | AUD20-10, 17, 19 | F10, F20, F27, F28                |
| E — supply/staging-like  | Produzir imagens e composição do mesmo candidato              | AUD20-07, 11, 18 | F03, F09, F22–F24, F29            |
| F — selo local           | Certificar somente bytes congelados                           | AUD20-12         | F02 e regressão de F01–F30 locais |
| G — externo/humano       | Qualificar sistemas/restore/piloto e decidir release          | AUD20-13..15     | F05, F06 e riscos residuais       |

## 7. Barra de qualidade

Mantém-se a barra `aud20-v1`: task success `>=97%`, safety/policy violation `0`,
coverage global statements/lines/functions `>=90%`, branches `>=85%`, branches
críticas `>=95%`, mutantes selecionados `100%` detectados, zero required skip,
revisão fresca e manifest candidate-bound.

Critérios adicionais da 0568:

- retenção processa mais de um lote e prova restart, concorrência e limite de
  lock/memória;
- migration possui estratégia/medição de lock e roll-forward;
- checker rejeita matriz/status/next action/candidate/Node divergentes;
- imagem não contém `*.test.*`, roda non-root e usa bases imutáveis aprovadas;
- healthcheck respeita `CVG_WORKER_READINESS_FILE`;
- chaos/load identificam perfil, skips, hardware e limitações;
- runtime integrado produz holdout por categoria e telemetria correlacionável;
- cada F01–F30 possui uma relação task→mudança→teste→resultado ou um blocker
  externo/humano explícito.

## 8. Gates e decisões de saída

| Gate                  | Escopo               | Prova mínima                                                     | Decisão se falhar                     |
| --------------------- | -------------------- | ---------------------------------------------------------------- | ------------------------------------- |
| G0R — plano revisado  | 0568 → tasks         | 30/30 achados mapeados, DAG e critérios                          | corrigir planejamento; sem BUILD novo |
| G1R — retenção segura | AUD20-04/16          | batch/restart/lock/replay/hold/rollback/lifecycle                | bloquear tasks dependentes            |
| G2R — confiança       | AUD20-05/06/08/09/20 | negativos de attestation, critic, mutation, docs, Node e holdout | manter candidato não qualificável     |
| G3R — operação local  | AUD20-10/17/18/19    | telemetria, decomposição, Docker e perfis representativos        | não criar staging candidate           |
| G4R — composição      | AUD20-07/11          | API+worker+PG/imagens/SBOM do mesmo build                        | `NO_GO` para staging                  |
| G5R — re-selo         | AUD20-12             | suíte integral, zero P0/P1 local, crítico fresco                 | reabrir task de origem                |
| G6R — externo         | AUD20-13/14          | quatro integrações + restore/RPO/RTO/rollback/piloto autorizados | `BLOCKED`/`WAITING_HUMAN_APPROVAL`    |
| G7R — release         | AUD20-15             | dossiê hash-bound e sign-off real                                | produção `NO_GO`                      |

## 9. Método de execução por task

1. Ler `AGENTS.md`, controles mestres, 0568, este plano, roadmap e backlog.
2. Conferir `git status` e preservar alterações existentes; nunca resetar para
   obter uma árvore artificialmente limpa.
3. Validar dependências e gate da task. Se SPEC/aceite material estiver ausente,
   criá-lo/revisá-lo antes do código e não assumir decisão de produto.
4. Registrar baseline e negativo que falha pelo motivo esperado.
5. Implementar a menor fatia vertical, com rollback/roll-forward definido.
6. Executar testes focados e depois a regressão exigida pela task.
7. Inspecionar diff, artefato e boundary pública; não usar cobertura isolada
   como prova de comportamento.
8. Produzir evidência com ambiente, comando, exit code, hashes, limitações e
   identidade do candidato.
9. Atualizar task/backlog, execution log e runtime state por último.
10. Avançar apenas se todos os critérios obrigatórios estiverem atuais e PASS.

## 10. Riscos, controles e recovery

| Risco                               | Controle                                                | Recovery/stop                                                     |
| ----------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------- |
| Perda de mudanças no worktree dirty | patch focado, status/diff antes e depois                | parar em conflito; nunca reset/checkout destrutivo                |
| Lock ou degradação da migration     | lote, timeout, medição, banco descartável               | abortar, preservar evidência e usar roll-forward                  |
| Receipt race/stale                  | outputs fechados, receipt por último, verifier separado | invalidar pacote e regenerar; nunca editar log para fazê-lo bater |
| Cross-tenant/replay                 | testes PostgreSQL de duas conexões e invariantes        | fail-closed e rollback transacional                               |
| Score mascarar falha                | gates não compensáveis                                  | `BLOCKED` na task de origem                                       |
| Evidência externa fictícia          | dossiê exige ambiente/owner/authority reais             | `WAITING_HUMAN_APPROVAL`, sem simulação                           |
| Refactor amplo                      | fatias pequenas e contract tests                        | reverter apenas a fatia; preservar testes/achados                 |
| Imagem não reproduzível             | pin digest, lockfile, conteúdo e SBOM                   | descartar imagem local e rebuild do candidato                     |

## 11. Definição de conclusão

### Conclusão técnica local

- AUD20-04..12 e 16, 17, 18, 19, 20 têm evidência fresca e nenhuma P0/P1
  técnica aberta.
- Os 30 achados estão fechados ou explicitamente bloqueados por autoridade
  externa; nenhum fica sem owner, task e critério de aceite.
- Candidato local final é reproduzível, verificado, image/SBOM-bound e mantém
  produção `NO_GO`.

### Conclusão integral de release

- Além da conclusão local, AUD20-13/14 possuem evidência real autorizada.
- AUD20-15 registra revisão independente e sign-off para digest/config exatos.
- Deploy continua uma ação separada e requer autorização própria.

## 12. Estado e próxima ação

Este documento conclui somente o planejamento. Não altera a task de produto
vigente. A próxima ação única continua sendo `AUD20-04`: especificar e
implementar batelamento limitado/concorrente e rollout seguro da migration,
reexecutar seus negativos e só depois regenerar a evidência de binding.
