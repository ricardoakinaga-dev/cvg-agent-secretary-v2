# Proposta SPEC — IMP50-21 reconciliação de masters

## Estado e limite deste draft

- status: `DRAFT_NOT_REGISTERED`; preparado para revisão documental, sem gate
  aprovado e sem admissão de BUILD;
- task-mãe: `AUD20-08`, concluída; a aprovação do pai não se estende a novo
  follow-up;
- sequência: o registro vigente de IMP50-21 orienta registrar um follow-up
  delimitado após a fatia crítica atual e exige revisão SPEC se snapshots
  históricos forem rotulados. Enquanto `AUD20-17`/`IMP50-40` continuar sendo a
  próxima ação crítica no estado canônico, não registrar nem admitir este
  follow-up. Este draft não registra nem admite a task;
- Discovery/PRD de referência: [Discovery 0017](../00_discovery/0017_aud20_08_state_node_reconciliation.md)
  (`DISCOVERY_READY`) e [PRD 0028](../01_prd/0028_aud20_08_state_node_reconciliation.md)
  (`PRODUCT_DEFINED`);
- referência operacional: [IMP50-21 no registro por item](../04_audit/evidence/PLAN50-20260923/imp50-status-20260923.md)
  e item 21 do [backlog candidato 0341](../03_build/0341_plan50_backlog_20260923.md).

Nenhuma alteração nos masters, ponteiros, rótulos, status ou task-mãe é
autorizada por este documento.

## Problema delimitado

`docs/CURRENT.md` e `current_state.json` identificam o estado operacional
vigente, mas alguns resumos nos masters 0300/0301/0302 ainda chamam snapshots de
21/09 correntes ou dizem que AUD20-08 é a próxima task. O topo do 0300 também
mantém `AUD20-10/17/20` como adiadas, embora o estado operacional de 23/09 tenha
reativado 10/17 e mantenha 20 bloqueada. A tabela de supersessão em CURRENT
ainda descreve os masters como apontando para 0333/0334, apesar de os masters já
apontarem no topo para 0335/0336/0337.

Esta proposta reconcilia somente a navegação/status atual e identifica
explicitamente os trechos datados como snapshots históricos. Não interpreta ou
reescreve decisões passadas.

## Fonte de autoridade e contrato

1. `docs/03_build/tracking/current_state.json` continua sendo a fonte
   machine-readable de `currentTask`, `currentStatus`, `nextAction` e release
   boundary.
2. `docs/CURRENT.md` e a última seção de `docs/99_runtime_state.md` continuam
   sendo as projeções humanas correntes verificadas por `docs:check`.
3. `docs/03_build/0337_aud20260921_backlog.md` continua sendo a fonte
   operacional das tasks e de sua ordem. Os planos 0335/roadmap 0336 continuam
   sendo as referências executivas e de sequência.
4. `0300`, `0301` e `0302` apontam para essas fontes. Cada seção datada anterior
   que ainda descreve status deve ser marcada como snapshot histórico com sua
   data; o corpo e os claims originais permanecem preservados.
5. Logs permanecem append-only. Não copiar para eles um novo estado como se
   fosse histórico anterior, nem alterar receipts/certificação.

Valores vigentes devem ser lidos novamente de `current_state.json` na execução
autorizada; este draft não congela task, status ou next action futuros.

## Escopo proposto para eventual BUILD documental

### Arquivos permitidos

- `docs/CURRENT.md` — corrigir a linha de supersessão dos masters para apontar
  aos documentos vigentes 0335/0336/0337 e descrever cada papel;
- `docs/03_build/0300_build_engineer_master.md` — corrigir o resumo operacional
  do topo, remover a afirmação de adiamento como presente e rotular o bloco
  21/09 como snapshot histórico, apontando o leitor para CURRENT/0335–0337;
- `docs/03_build/0301_roadmap.md` — rotular snapshots 20/09 e 21/09 conforme
  sua data e deixar o ponteiro inicial para CURRENT/0335–0337 inequívoco;
- `docs/03_build/0302_backlog_master.md` — corrigir o ponteiro inicial e
  rotular o resumo de 21/09 como snapshot histórico sem substituir seus fatos;
- `docs/03_build/0337_aud20260921_backlog.md` — somente registrar follow-up,
  limites, evidência e resultado depois de gate próprio; preservar todas as
  entradas anteriores;
- `docs/02_spec/0190_spec_validation.md` — somente registrar o status/hash da
  revisão humana e a admissão depois de cumpridos os gates; não antecipar
  aprovação no arquivo de validação;
- `docs/99_runtime_state.md`, `docs/20_master_execution_log.md` e
  `docs/30_backlog_master.md` — apenas os registros append-only/corrente
  exigidos para fechar a rodada, sem reescrever checkpoints anteriores.

### Fora de escopo

- código, checker, testes, schema ou JSON de estado;
- alterar tarefa/status/next action vigentes para fazer a reconciliação parecer
  coerente; qualquer divergência real deve ser encaminhada ao gate que a
  governa;
- reabrir `AUD20-08`, mudar seus resultados C01–C07 ou ampliar autorização de
  BUILD do pai;
- modificar corpos históricos, timestamps, resultados, critérios ou decisões;
- `docs/README.md` e navegação geral (`IMP50-43`), dependente separada;
- `docs/04_audit/evidence/**`, snapshots IMP50-49, payloads raw ou manifests;
- dados reais, rede, banco, serviços, staging, produção, commit, push ou deploy.

## Invariantes

- `current_state.json`, CURRENT, runtime state e 0337 concordam em task/status/
  next action conforme o checker existente;
- 0335/0336/0337 são os ponteiros operacionais correntes do programa AUD20;
  0333/0334 permanecem preservados e rotulados históricos;
- a seção corrente no topo não contém status de task incompatível com a fonte
  canônica; texto conflitante mantido em seção histórica é acompanhado por um
  rótulo com data que esclarece seu contexto;
- estados oficiais e limites `staging=NO_GO`, `production=NO_GO` permanecem
  inalterados;
- nenhuma classe de linhagem IMP50-49 ou inventário de evidências é afetado.

## Aceitação proposta

- AC01: cada master aponta para CURRENT e para o documento 0335/0336/0337
  correspondente; a tabela de supersessão CURRENT deixa de dizer que 0300/01/02
  apontam para 0333/0334;
- AC02: os seis resumos datados abaixo recebem rótulo histórico com data e
  ponteiro para o estado atual; nenhum claim histórico é removido ou reescrito:
  `0300` (programas 21/09 e 20/09), `0301` (roadmaps 21/09 e 20/09) e `0302`
  (backlogs 21/09 e 20/09). Se a comparação pré-BUILD encontrar outro bloco
  datado que afirme estado corrente, parar e voltar à revisão SPEC;
- AC03: os resumos atuais deixam de apresentar `AUD20-08` como próxima task ou
  `AUD20-10/17/20` como adiadas; o estado corrente é projetado da fonte
  canônica, sem hardcode no draft;
- AC04: `docs:check` passa e uma comparação manual, campo a campo, confirma a
  projeção atual. Capturar `currentTask`, `currentStatus` e `nextAction` do
  `current_state.json`; confirmar que CURRENT mostra o mesmo task/status e a
  mesma string única de ação, que o último bloco corrente de runtime mantém os
  três valores, e que 0337 mostra o mesmo task/status e contém a string
  `nextAction` exata na sua seção única de próxima ação. Se a projeção em 0337
  divergir, corrigir somente esse resumo, sem alterar a fonte canônica. Confirmar
  ainda que os resumos iniciais dos masters apontam para CURRENT/0335–0337 e não
  copiam status próprio. `git diff --check` também passa. O checker continua o
  existente e não é alegado como verificador de 0337 ou dos masters (`IMP50-22`
  é separado);
- AC05: diff limitado aos arquivos permitidos; nenhum código, status
  operacional, release boundary ou arquivo de evidência candidate-bound muda;
- AC06: conclusão registrada como reconciliação documental somente; não é
  aceite de produto, conclusão de AUD20-08 ou autorização de release.

## Método e rollback

A preparação deste draft pode ocorrer em paralelo, mas a sequência de execução
é estrita: (0) aguardar o estado canônico liberar `AUD20-17`/`IMP50-40` como
ação crítica; uma reafirmação da aprovação existente não satisfaz esse
pré-requisito; (1) registrar em 0337 um follow-up delimitado e ainda não
admitido; (2) obter revisão/aprovação humana desta SPEC pelo hash exato e
registrar o gate em 0190; (3) registrar admissão documental separada em
0337/0190; (4) somente então executar o BUILD documental.

1. recapturar os valores correntes do JSON canônico, CURRENT, runtime state e
   0337;
2. atualizar apenas os ponteiros/resumos do topo e inserir rótulos datados sem
   alterar o corpo dos snapshots;
3. verificar links, docs-check, formatação e diff allowlist; comparar task,
   status e next action com as fontes autoritativas;
4. registrar resultado e limites em 0337, runtime state, execution log,
   backlog master e CURRENT conforme necessário.

Rollback reverte somente as linhas de ponteiro/rótulo adicionadas nesta fatia;
preserva o corpo histórico e todas as mudanças preexistentes no worktree.

## Gate proposto

Este documento solicita revisão técnica do recorte e de sua compatibilidade com
Discovery 0017/PRD 0028. O registro formal do follow-up em 0337 espera até que a
fonte canônica libere a ação crítica `AUD20-17`/`IMP50-40`; a linha de status
vigente deve ser relida antes de satisfazer esse gate. Depois, a ordem é:
registrar o follow-up não admitido em 0337, obter aprovação humana vinculada ao
hash final desta SPEC e anotá-la em 0190, e só então registrar admissão
documental exata antes de editar masters. Este draft não é admissão nem
aprovação de BUILD.
