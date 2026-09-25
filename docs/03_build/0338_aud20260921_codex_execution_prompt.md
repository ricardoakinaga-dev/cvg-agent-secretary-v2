# Prompt de execução Codex — AUD20-REM v2

Copie integralmente o bloco abaixo para o agente Codex. O prompt autoriza
somente implementação local controlada; não autoriza commit, push, deploy,
produção, dados reais ou integrações externas.

```text
Você é o agente Codex responsável por executar integralmente o programa de
remediação AUD20-REM v2 no repositório:

/home/ricardo/cvg-agent-secretary-v2

OBJETIVO

Implemente todas as melhorias técnicas e documentais planejadas a partir da
auditoria 0568, seguindo o plano, o roadmap e o backlog abaixo até concluir
todo o trabalho local verificável. Prepare também os dossiês das etapas
externas/humanas, mas não simule nem execute validações para as quais não há
ambiente, credenciais, owner ou autorização real.

AUTORIZAÇÃO

Eu autorizo BUILD somente local e controlado das tasks técnicas do backlog
0337, incluindo criação/revisão das SPECs técnicas necessárias, alterações de
código, migrations aditivas, testes, Docker local descartável e evidências.
Esta autorização não inclui commit, push, merge, publicação em registry,
deploy, staging real, produção, dados reais, contato com provider/canal/IdP,
uso de credenciais reais, piloto real ou qualquer efeito externo. Qualquer
decisão material de produto, privacidade, retenção, SLO, risco residual ou
release que não esteja aprovada deve parar em WAITING_HUMAN_APPROVAL.

LEITURA OBRIGATÓRIA ANTES DE ALTERAR QUALQUER ARQUIVO

1. AGENTS.md
2. docs/07_agents/AGENTS.md
3. docs/99_runtime_state.md
4. docs/20_master_execution_log.md
5. docs/30_backlog_master.md
6. docs/CURRENT.md
7. docs/04_audit/0568_full_repository_audit_2026-09-21.md
8. docs/03_build/0335_aud20260921_executive_plan.md
9. docs/03_build/0336_aud20260921_roadmap.md
10. docs/03_build/0337_aud20260921_backlog.md
11. docs/02_spec/aud20_01_baseline_contract_20260920.md
12. docs/04_audit/evidence/AUD20/AUD20-quality-bar.json
13. docs/04_audit/evidence/AUD20/AUD20-requirements-matrix.json
14. docs/03_build/0300_build_engineer_master.md
15. docs/03_build/0301_roadmap.md
16. docs/03_build/0302_backlog_master.md

Use o skill engineering-framework, se disponível, para recuperação, SPEC,
execução, verificação, migrations, risco e rastreabilidade. Siga sempre a
instrução mais específica do repositório.

ESTADO INICIAL

- O worktree já contém alterações de AUD20-03/AUD20-04. Elas pertencem ao
  usuário e devem ser preservadas.
- AUD20-01..03 estão concluídas no histórico aplicável.
- AUD20-04 está IN_PROGRESS e é a primeira task.
- AUD20-05..20 estão bloqueadas pelo DAG até suas dependências serem fechadas.
- A certificação corrente é stale e deve falhar até o candidato final.
- Staging real e produção permanecem NO_GO.

REGRAS ABSOLUTAS

- Siga DISCOVERY -> PRD -> SPEC -> BUILD -> AUDIT na profundidade aplicável.
- Não inicie código de uma task sem SPEC/aceite, allowed paths, negativo,
  rollback/roll-forward e gate local registrados.
- Não use dados reais.
- Não confirme, cancele ou reagende consulta real automaticamente.
- Não responda RAG sem fonte institucional aprovada.
- Não execute ação clínica, financeira ou de prontuário definitivo.
- Toda ação sensível exige approval ou handoff.
- Não reduza thresholds, não remova teste para obter verde e não transforme
  skip obrigatório em PASS.
- Não reutilize evidência de outro candidato, commit, tree ou imagem.
- Não use git reset --hard, git checkout -- ou qualquer operação destrutiva
  para limpar o worktree. Não sobrescreva mudanças do usuário.
- Não faça commit, push, deploy ou publicação sem nova autorização explícita.
- Use Node v22.23.2 e PostgreSQL/Docker somente em recursos descartáveis locais.
- Use fixtures sintéticas e mantenha efeitos externos desabilitados.

MODO DE EXECUÇÃO

Execute uma task por vez na ordem do caminho crítico do roadmap 0336:

AUD20-04 -> AUD20-16 -> AUD20-05 -> AUD20-06 -> AUD20-08 -> AUD20-20
-> AUD20-09 -> AUD20-17 -> AUD20-10 -> AUD20-19 -> AUD20-18
-> AUD20-07 -> AUD20-11 -> AUD20-12 -> AUD20-13 -> AUD20-14 -> AUD20-15

Para cada task:

1. Recupere o estado real com git status, arquivos correntes, dependências e
   evidências; trate qualquer drift antes de confiar no next action.
2. Confirme ou crie a SPEC técnica da task. Se surgir decisão material não
   coberta pela autorização, registre opções e pare somente a parte dependente.
3. Registre baseline e um teste negativo que falhe pelo motivo esperado.
4. Implemente a menor fatia vertical coerente dentro dos allowed paths.
5. Execute o teste focado e inspecione o comportamento/artefato real.
6. Execute a regressão proporcional descrita no backlog. Para mudanças de
   banco, prove mixed-version quando aplicável, batch, restart, concorrência,
   lock/duração, rollback ou roll-forward e invariantes tenant-scoped.
7. Revise o diff e procure regressões, dados sensíveis, bypass de authority,
   acoplamento e evidência stale.
8. Grave evidência com comando, ambiente, exit code, hashes, resultado e
   limitações. Um PASS antigo não qualifica bytes novos.
9. Atualize primeiro o artefato/task, depois o backlog, depois execution log e
   por último runtime state/CURRENT. Mantenha uma única próxima ação executável.
10. Só marque COMPLETED quando todos os critérios obrigatórios tiverem evidência
    fresca. Caso contrário use IN_PROGRESS, BLOCKED ou WAITING_HUMAN_APPROVAL.

REGRAS DE EVIDÊNCIA E SELO

- Durante AUD20-04, corrija primeiro batch/locks/lifecycle/semântica. Não tente
  fabricar o receipt atual.
- Feche todos os processos que escrevem logs antes de gerar raw receipt,
  candidate receipt ou manifest.
- Gere receipts/manifests por último e execute o binding verifier em um processo
  separado, somente leitura.
- Qualquer alteração depois do freeze invalida critic, coverage, imagens, SBOM,
  receipts e selo dependentes.
- No re-selo AUD20-12, código, testes, migrations, policies, API/worker/web,
  imagens, SBOM, critic e mutation devem derivar do mesmo candidato.
- O perfil máximo local é STAGING_CANDIDATE. Nunca declare staging real ou
  produção prontos com fixtures locais.

GATES MÍNIMOS

Quando aplicável, execute sob Node 22.23.2:

- npm run typecheck
- npm run lint
- npm run format:check
- npm run build
- npm run docs:check
- npm test
- npm run test:postgres com PostgreSQL descartável e zero required skip
- npm run test:e2e nos browsers configurados
- npm run test:evals
- suites de chaos, readiness, worker startup, architecture e retention
- npm audit --audit-level high
- licenças, SBOM, secret scan/CodeQL disponível no ambiente
- critic --fail-on-gaps e mutation sentinel candidate-bound
- certification/evidence verifiers e promotion check
- git diff --check

Não execute cegamente comandos inexistentes: descubra os scripts reais em
package.json e registre NOT_RUN/BLOCKED quando o ambiente não oferecer um gate.

CRITÉRIOS ESPECIAIS

- AUD20-04 deve provar múltiplos lotes, concorrência, restart, replay tardio,
  legal hold, tenant isolation, ledger rollback e limite de locks.
- AUD20-05 deve observar recursos e grants reais do ambiente descartável, não
  apenas flags.
- AUD20-08 deve fazer docs:check falhar em drift entre JSON, tabela, next action,
  candidate e Node.
- AUD20-09 deve produzir holdout integrado por categoria com safety zero.
- AUD20-10 deve demonstrar collector/sink/alerta/runbook correlacionados sem PII.
- AUD20-18 deve excluir *.test.* das imagens, pin bases por digest, respeitar
  CVG_WORKER_READINESS_FILE e decidir/documentar tsx versus build compilado.
- AUD20-11 deve subir API+worker+PostgreSQL do mesmo build e provar
  readiness/drain/restart/replay/teardown.
- AUD20-12 exige zero P0/P1 local e revisão fresca do candidato final.

FRONTEIRAS EXTERNAS E HUMANAS

Em AUD20-13..15, não invente evidência. Sem os inputs reais:

- prepare checklists, scripts seguros, templates de dossiê e critérios;
- registre exatamente owner, ambiente, credencial ref, janela ou decisão que
  falta;
- marque BLOCKED ou WAITING_HUMAN_APPROVAL conforme o estado verdadeiro;
- mantenha provider, canal, IdP, RAG, restore físico, RPO/RTO, rollback, piloto,
  sign-off, staging real e produção como NO_GO;
- não continue para ação externa nem peça segredo em texto.

DEFINIÇÃO DE CONCLUSÃO

O trabalho local termina somente quando:

- os 30 achados F01–F30 possuem task, implementação/evidência ou blocker de
  autoridade explícito;
- zero P0/P1 técnico local permanece aberto;
- todos os gates locais obrigatórios passam no mesmo candidato;
- os controles mestres e a matriz concordam;
- o relatório final registra resultados reais, limitações e risco residual;
- a próxima ação para qualquer gate externo é única e executável.

PERSISTÊNCIA E COMUNICAÇÃO

Mantenha atualizações curtas durante a execução. Não pare apenas porque o
trabalho é longo; use os arquivos de estado para continuidade. Ao final de cada
task, informe o que mudou, testes executados, resultado, limitações, status e
próxima ação. Ao final do programa local, entregue um resumo consolidado, links
para evidências e o veredicto honesto. Produção permanece NO_GO até decisão
humana válida e deploy separado.

Comece agora recuperando o estado e executando AUD20-04. Não inicie AUD20-05
antes de AUD20-04 e AUD20-16 satisfazerem seus gates.
```
