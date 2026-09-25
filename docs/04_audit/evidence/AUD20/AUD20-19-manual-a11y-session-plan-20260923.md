# AUD20-19 — roteiro proposto para sessão manual de acessibilidade

- estado: `PROPOSED`; sessão humana não realizada e segue
  `WAITING_HUMAN_APPROVAL`.
- finalidade: preparar a execução humana do gate F28/IMP50-18 com observações
  reproduzíveis, sem fabricar participante, consentimento, tecnologia ou
  resultado.
- fonte da interface: `tests/e2e/accessibility.spec.ts` e
  `tests/e2e/visual-shell.spec.ts`; os testes automatizados continuam sendo
  evidência separada e não substituem esta sessão.

## Pré-condições

1. Obter autorização específica para a sessão, participante voluntário,
   consentimento informado e equipamento/tecnologia assistiva escolhidos pela
   pessoa. Não registrar nome, contato, prontuário ou outro identificador.
2. Anotar navegador/versão, sistema operacional, tecnologia assistiva/versão,
   viewport e zoom. Não incluir informação que identifique a pessoa.
3. Usar um harness interativo headed que injete
   `window.__CVG_OPERATOR_CONTEXT__` antes do startup, carregue as fixtures
   `SYNTHETIC_SUPERVISOR`, `SYNTHETIC_APPROVER` e
   `synthetic_sender_0001`, intercepte requests globalmente no contexto do
   browser: permitir somente assets do Vite local e fixtures `/v1/**` e
   `/health/**`, abortar qualquer outra URL e registrar zero requests fora do
   app local. O helper existente
   `installSyntheticA11yRoutes()` só intercepta `/v1/**`; `vite.config.mts`
   encaminha `/v1` e `/health` ao API local, portanto `vite dev` normal não é
   setup válido. O harness deve injetar antes da tarefa um marcador visível e
   legível por tecnologia assistiva, por exemplo `role="note"` com o texto
   “Sandbox sintético: nenhum sistema real será alterado”. A sessão só começa
   se participante e facilitador conseguirem localizar esse marcador. Esse
   harness interativo ainda não existe; até implementá-lo, revisá-lo, verificar
   a captura de rede e confirmar o marcador, a sessão não pode começar.
4. Fixar o candidato local e calcular o `candidateId` antes e depois da sessão
   com o mesmo `buildPhase11Candidate(root)` usado por
   `scripts/aud20-19-qualify.mjs` (implementado em
   `scripts/lib/phase11-rules.mjs`). Os dois valores devem ser iguais. Calcular
   também o digest do JSON humano e do registro suplementar; uma revisão
   independente deve conferir esses vínculos antes de tratar a evidência como
   candidate-bound. O runner atual não compara o candidato do relatório com o
   JSON humano; mudança no `candidateId` invalida a sessão para este candidato.
5. Manter captura e armazenamento no diretório temporário desta sessão. Capturas
   não devem conter identidade da pessoa; referenciá-las por um `captureId`
   opaco no relatório. Screenshots só podem ser capturados e retidos se o
   consentimento cobrir explicitamente screenshots. Não gravar áudio ou vídeo
   sem consentimento específico.

## Passos e resultados esperados

| ID | Rota/estado e tarefa | Resultado observável esperado |
| --- | --- | --- |
| H01 | `/`, console do supervisor. Localizar o título, landmarks e link “Pular para o console operacional” com tecnologia assistiva. | Título e regiões têm nomes compreensíveis; o link é o primeiro foco e move o foco ao console. |
| H02 | Percorrer a shell com Tab/Shift+Tab; abrir e fechar o disclosure de identidade; revisar indicação de foco. | Registrar separadamente a ordem de leitura anunciada pela tecnologia assistiva e a ordem de foco por teclado; controles anunciam nome/estado, foco permanece visível e não fica preso. |
| H03 | Heading “Conversas” na página `/`; localizar e abrir `synthetic_sender_0001` com Enter. | A linha expõe `aria-pressed` e mantém o foco. Inspecionar se a atualização da timeline é anunciada ou se requer navegação adicional; silêncio/inacessibilidade é um finding, não PASS presumido. |
| H04 | Estado de aprovação com `SYNTHETIC_APPROVER`; focar “Aprovar synthetic_appointment_draft_review” e ativar uma vez com Enter. | A mensagem “Aprovação registrada; a continuação permanece no outbox controlado.” é anunciada. O mock não envia pedido real nem agenda consulta. |
| H05 | Estado de loading e, depois, erro sintético recuperável; operar “Tentar novamente carregar conversas”. | Loading e erro são anunciados; retry é focável; a fixture recupera sem perda ou chamada externa. A fixture atual tem delay fixo de 30 segundos; só executar com pause/release controlado pelo harness. Se essa pausa não existir, marcar `BLOCKED` e não iniciar o passo. |
| H06 | Supervisor localiza `synthetic_goal_uncertain` e abre o detalhe com Enter. | “Reconciliação necessária” e “nenhuma repetição automática está autorizada” ficam visíveis/anunciadas; nenhuma ação de retry é ativada. |
| H07 | Supervisor ativa “Assumir handoff synthetic_appointment_draft_review” com Enter. | É anunciada “Handoff assumido; a automação permanece suspensa.”; nenhum retry ou efeito externo é iniciado. |
| H08 | Refluxo em 320 CSS px e zoom de 200%/400%; cores forçadas quando suportadas. | Conteúdo/controles permanecem alcançáveis e legíveis, sem perda de ação por overflow; registrar qualquer limite do navegador/AT. |
| H09 | `#platform-panel` com `SYNTHETIC_ADMIN`; percorrer navegação e atalhos sem acionar controles de configuração. | Região e atalhos têm nomes/estados compreensíveis e foco permanece visível; nenhum setting ou política é alterado. |

Não orientar a pessoa a usar controles fora desses fluxos sintéticos. Não
confirmar, cancelar ou reagendar consulta; não executar efeito clínico,
financeiro ou de prontuário.

## Registro por passo

No template operacional, cada passo deve manter o contrato atual do validador:
`id`, `status` (`PASS | FAIL | BLOCKED`) e `observation`. `NOT_RUN`/parada usa
`BLOCKED` com razão; um finding usa `FAIL` e um objeto em `issues`, sem o status
não suportado `ISSUE`. O objeto de finding deve conter impacto/severidade,
barreira concreta, reprodução, elemento/estado e triagem
`OPEN | ACCEPTED | FIX_REQUIRED`; não presumir correção ou aceite.

Quando os campos obrigatórios e passos forem válidos, o validador retorna
`READY_FOR_HUMAN_REVIEW`. Esse estado apenas habilita revisão humana da
evidência; não aprova F28, não encerra `AUD20-19` e não libera promoção.

Um registro suplementar da sessão deve vincular cada `id` ao `candidateId`,
digest do candidato, rota/âncora, papel e fixture, estado antes/depois,
navegador, viewport/zoom e `captureId` (ou `none`). Esse vínculo não existe no
JSON nem é validado pelo `validateHumanAccessibilityEvidence` atual; portanto,
uma sessão não pode ser chamada candidate-bound até uma verificação/revisão
independente do registro suplementar. Capturas e notas nunca incluem identidade
do participante.

## Critérios de parada

- parar imediatamente se houver dado real, endpoint remoto, efeito externo,
  request não allowlisted, ação fora dos passos, desconforto ou retirada de
  consentimento;
- ao parar, interromper a captura, colocar artifacts afetados em quarentena ou
  apagá-los conforme o consentimento, e registrar somente uma razão de parada
  sem identificação pessoal. Não reter screenshot salvo quando o consentimento
  o autorizar explicitamente;
- suspender se a tecnologia assistiva não puder ser identificada, o candidato
  mudar durante a sessão ou a fixture deixar de ser determinística;
- passo ausente, `FAIL` ou `BLOCKED` preserva o gate para revisão; não converter
  em PASS por avaliação automatizada. O schema atual não aceita `NOT_RUN` ou
  `ISSUE` como status de passo.

O template JSON operacional permanece vazio até uma sessão autorizada. Este
roteiro não preenche consentimento, participante, tecnologia, timestamps,
issues ou resultado e não torna o candidato elegível para release.
