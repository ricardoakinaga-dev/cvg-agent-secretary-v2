# SPEC proposta AUD20-19-FU1 / IMP50-18 — harness para sessão humana

## Estado

- task proposta: `AUD20-19-FU1`, subordinada a `AUD20-19` e restrita às
  pré-condições locais de `IMP50-18`.
- fase: `SPEC`.
- status: `DRAFT_PENDING_HUMAN_REVIEW`.
- BUILD: não admitido; esta proposta não autoriza código.
- sessão humana: continua `WAITING_HUMAN_APPROVAL`; não foi autorizada nem
  executada.
- staging/produção: `NO_GO`.

A autorização anterior de `AUD20-19` cobriu somente tooling sintético local
C01–C07, hoje `PASS_LOCAL`. Este follow-up acrescenta o harness headed com
boundary de rede global e registro suplementar candidate-bound descritos no
[roteiro manual](../04_audit/evidence/AUD20/AUD20-19-manual-a11y-session-plan-20260923.md).
Os limites da autorização anterior estão no
[relatório BUILD](../04_audit/evidence/AUD20/AUD20-19-build-audit-20260922.md)
e na [crítica independente](../04_audit/evidence/AUD20/AUD20-19-independent-critic-final-20260922.md).
O gate-review registrou que isso excede a autorização anterior e exige SPEC e
task próprios. A aprovação desta SPEC não autorizaria a sessão humana: ela
continuaria a exigir autorização específica, consentimento, participante
voluntário, equipamento/tecnologia assistiva escolhidos pela pessoa e revisão
humana.

## Base aprovada e objetivo

Reusa, sem alterar seus claims, o [Discovery 0021](../00_discovery/0021_aud20_19_chaos_load_human_a11y.md)
e o [PRD 0032](../01_prd/0032_aud20_19_chaos_load_human_a11y.md): FR06/FR07 e
AC04 pedem roteiro e evidência humana sem inventar resultado; a validação
humana continua separada de `PASS_LOCAL`. A SPEC existente
[aud20_19_chaos_load_human_a11y_20260922.md](aud20_19_chaos_load_human_a11y_20260922.md)
cobre os perfis e o dossiê, mas sua autorização anterior não inclui este
harness nem o registro suplementar. O objetivo aqui é deixar o preparo seguro,
repetível e verificável; não é produzir a sessão nem seu resultado.

## Fronteira e exclusões

- Somente navegador Chromium local, Vite local e fixtures sintéticas
  allowlisted; `verify` é headless e `session` só pode ser headed depois dos
  gates humanos separados.
- Nenhuma chamada a API real, banco, provider, canal, IdP, RAG, staging ou
  produção. Nenhum dado real, efeito clínico/financeiro, consulta ou prontuário.
- Nenhuma captura de áudio, vídeo ou imagem neste FU1; screenshots ficam
  sempre desabilitados e não existe flag/config para habilitá-los. Se uma
  rodada futura precisar de mídia, deve voltar à SPEC para política própria de
  consentimento, armazenamento, retenção e exclusão.
- Não alterar componentes, estilos ou código da aplicação. Não mudar schema/API,
  `scripts/lib/phase11-rules.mjs` ou o validador humano existente.
- Não preencher participante, consentimento, tecnologia assistiva, timestamps,
  observações, findings ou qualquer resultado humano.
- Um harness aprovado e construído ainda não autoriza sessão. A sessão só pode
  começar após o gate humano separado e todas as pré-condições deste documento.

## Arquivos propostos para BUILD

| Arquivo                                                                                                                                                                                                                                                               | Mudança permitida                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `scripts/aud20-19-human-session-harness.mjs`                                                                                                                                                                                                                          | Novo launcher headed local, com preflight e parada fechada.                                                                                                                                                                                                        |
| `scripts/lib/aud20-19-human-session-harness.mjs`                                                                                                                                                                                                                      | Nova allowlist de rede, marcador acessível, controle H05, audit log redigido e lifecycle de sessão.                                                                                                                                                                |
| `scripts/lib/aud20-19-human-session-binding.mjs`                                                                                                                                                                                                                      | Novo schema/validador e comparação candidate/evidence por SHA-256.                                                                                                                                                                                                 |
| `tests/e2e/fixtures/synthetic-a11y-fixtures.ts`                                                                                                                                                                                                                       | Adicionar instalador session-only com mapa exato method/path, respostas sintéticas para health/API, deny de qualquer endpoint desconhecido e pause/release somente no GET de loading. Manter `installSyntheticA11yRoutes()` e seus defaults/respostas inalterados. |
| `tests/aud20-19-human-session-harness.test.mjs`                                                                                                                                                                                                                       | Novos testes unitários do allowlist, binding, redaction, estados e cleanup.                                                                                                                                                                                        |
| `tests/e2e/aud20-19-human-session-harness.spec.ts`                                                                                                                                                                                                                    | Novos testes automatizados headless do harness; não executa sessão humana.                                                                                                                                                                                         |
| `playwright.aud20-19-human-session.config.ts`                                                                                                                                                                                                                         | Nova configuração Playwright isolada: Chromium único, captura desligada, sem API, sem reuso de processo/servidor e com `webServer` de Vite do harness. Nunca carregar `playwright.config.ts`.                                                                      |
| `vite.aud20-19-human-session.config.mts`                                                                                                                                                                                                                              | Nova configuração Vite da app sem bloco proxy, com host `127.0.0.1`, porta fixa e `strictPort`; HMR/WebSocket desativado. Não alterar o Vite padrão.                                                                                                               |
| `docs/04_audit/evidence/AUD20/AUD20-19-human-session-supplement.schema.json`                                                                                                                                                                                          | Novo contrato do registro suplementar, sem conteúdo de sessão.                                                                                                                                                                                                     |
| `docs/04_audit/evidence/AUD20/AUD20-19-human-session-supplement-template.json`                                                                                                                                                                                        | Novo template vazio; nenhum campo pessoal ou resultado pré-preenchido.                                                                                                                                                                                             |
| `docs/04_audit/evidence/AUD20/AUD20-19-session-authorization.schema.json`                                                                                                                                                                                             | Schema da autorização de sessão separada, com SPEC/candidato/passos exatos e captura de mídia explicitamente desabilitada.                                                                                                                                         |
| `docs/04_audit/evidence/AUD20/AUD20-19-session-approval.schema.json`                                                                                                                                                                                                  | Schema fechado do registro humano de aprovação de sessão, ligado por hashes à autorização, SPEC, candidato e passos.                                                                                                                                               |
| `docs/04_audit/evidence/AUD20/human-sessions/<sessionId>/{human-report.json,session-supplement.json,network-receipt.json,manifest.json}`                                                                                                                              | Saída local somente após sessão separadamente autorizada e consentida; nunca criada por `verify` ou pelo BUILD do harness.                                                                                                                                         |
| `docs/03_build/0337_aud20260921_backlog.md`, `docs/02_spec/0190_spec_validation.md`, `docs/04_audit/evidence/PLAN50-20260923/imp50-status-20260923.md`, `docs/CURRENT.md`, `docs/99_runtime_state.md`, `docs/20_master_execution_log.md`, `docs/30_backlog_master.md` | Registrar draft, decisão, resultados locais e próximo gate.                                                                                                                                                                                                        |

Nenhum arquivo de produção faz parte da allowlist. Qualquer necessidade de
ampliá-la retorna a SPEC para revisão antes de código.

## Contrato do harness

### 1. Rede fail-closed

- Suportar somente Linux com `unshare` de user/network namespace e `ip` que
  permita criar namespace vazio e ativar somente `lo`. O launcher inicia Vite,
  Playwright/browser e harness dentro desse mesmo namespace, limpa variáveis de
  proxy e verifica que não há interface nem rota não-loopback. Ausência de
  ferramenta, permissão ou prova de isolamento encerra em `BLOCKED`; não há
  fallback para roteamento Playwright como garantia de egress.
- Usar exclusivamente `playwright.aud20-19-human-session.config.ts` e
  `vite.aud20-19-human-session.config.mts`; nunca carregar a configuração raiz
  que sobe API e Vite, reutilizar processo já existente, ou ligar `dev:web` no
  host `0.0.0.0`. O setup inicia somente Vite em origem, host e porta fixos
  `http://127.0.0.1:4174`, sem proxy API e sem HMR. A API não é iniciada. A
  configuração Playwright define somente Chromium, `reuseExistingServer: false`,
  `headless: true` no modo `verify`, `serviceWorkers: 'block'`,
  `acceptDownloads: false` e `trace`/vídeo/screenshot desligados. A origem
  aprovada serve apenas os assets de desenvolvimento que a UI exige; todos
  passam pelo mesmo namespace sem egress externo.
- Instalar `browserContext.route()` e `browserContext.routeWebSocket()` antes
  de criar qualquer página; criar o contexto com `serviceWorkers: 'block'` e
  downloads desativados. Playwright documenta que o route não intercepta
  requests já tratados por service worker e recomenda bloqueá-los; o roteamento
  de WebSocket deve ser instalado antes de criar a página. O lockfile resolve
  `@playwright/test` para `1.59.1`
  ([BrowserContext](https://playwright.dev/docs/api/class-browsercontext),
  [Page](https://playwright.dev/docs/api/class-page)).
- Permitir assets apenas em `GET`/`HEAD` no host/porta Vite exatos e nos paths
  raiz, `/@vite/client`, `/src/**`, `/node_modules/.vite/**` e `/assets/**` que
  o build local efetivamente servir. O contrato fica preso ao Vite `8.2.2`
  resolvido pelo lockfile atual; trocar a versão exige revisão desta SPEC. A
  query é analisada como lista bruta de pares antes de qualquer normalização:
  somente os nomes ASCII `import`, `direct` e `v` são admitidos; cada chave
  pode aparecer no máximo uma vez; chave duplicada, chave desconhecida, nome
  percent-encoded, `+`, valor percent-encoded e separador vazio são negados.
  `import` e `direct` só são aceitos sem `=` e sem valor; `import` aplica-se
  somente a paths `/src/**` ou `/node_modules/.vite/**`, e `direct` somente a
  asset CSS allowlisted. `v` só é aceito em `/node_modules/.vite/**` como
  exatamente oito dígitos hexadecimais minúsculos e precisa ser igual ao
  `browserHash` calculado pelo processo Vite isolado para a execução atual; sem
  metadata local correspondente, negar. Combinações de flags só são válidas
  onde o path correspondente as emitiu no grafo estático da UI; não se aceita
  qualquer combinação por inferência. A chave `t` é sempre negada porque HMR
  está desligado. Query em `/`, `/@vite/client` e `/assets/**` é negada. Testes
  positivos devem usar as URLs literais observadas no grafo estático da build
  fixada; testes negativos cobrem cada valor inválido, duplicata, alias ou
  combinação não emitida. Registrar somente o ID estático da regra, nunca valor
  de query.
- A tabela inicial de API fixture é fechada: `GET /health`;
  `GET /v1/conversations?limit=25&offset=0`;
  `GET /v1/conversations/synthetic_conversation_1/timeline`;
  `GET /v1/approvals`; `GET /v1/tasks`;
  `GET /v1/outbox/dead-letters`;
  `GET /v1/orchestration/goals?limit=25` e detalhe somente para IDs presentes
  em `SYNTHETIC_GOALS`;
  `GET /v1/audit/sessions/synthetic_session_1`;
  `GET /v1/observability/audit-evidence?sessionId=synthetic_session_1&limit=10&offset=0`;
  `GET /v1/observability/audit-evidence/checkpoints`;
  `GET /v1/admin/agents` e
  `GET /v1/admin/agents/synthetic_agent_1/versions`;
  `GET /v1/admin/test-lab/runs?limit=10` e
  `GET /v1/admin/execution-traces?limit=10`;
  `GET /v1/journeys/owner-drafts`, `GET /v1/journeys/patient-drafts`,
  `GET /v1/journeys/slots` e `GET /v1/journeys/appointment-drafts`.
  Cada query acima é comparada como conjunto exato de pares chave/valor; paths
  parametrizados aceitam somente o ID sintético indicado. Qualquer endpoint
  adicional que o fluxo H01–H09 passe a exigir requer retorno à SPEC antes do
  BUILD, não ampliação ad hoc da tabela. Os dois endpoints adicionados para H09
  respondem somente com envelope de sucesso e `{items: [], pageInfo:
{limit: 10, offset: 0, total: 0, hasNextPage: false}}`; não leem nem simulam
  histórico real.
- A única escrita fixture permitida é
  `POST /v1/approvals/synthetic_approval_1/decision` com JSON exatamente
  `{"decision":"approved","note":"controlled_console_action"}` ou
  `{"decision":"assumed","note":"controlled_handoff_only"}`. O efeito é
  efêmero e em memória; rejeição, requeue, appointment, drafts, status update,
  admin, plugin, RAG ou qualquer outra escrita é negada. Qualquer método/path/
  query/body fora da tabela é abortado; não há `continue`, fallback genérico,
  resposta aceita genérica ou passagem ao proxy. A rota `/health` é respondida
  pela fixture, nunca pelo processo API.
- Permitir somente a origem Vite e essas fixtures; abortar todo outro protocolo,
  host, porta, redirect, navegação, popup/frame, fetch/XHR, worker, download ou
  WebSocket. Não iniciar outro browser/contexto sem instalar as mesmas regras.
  A namespace sem rota externa é a barreira primária; os hooks Playwright são
  defesa adicional e evidência de intenção. Se um tipo não puder ser observado
  e bloqueado, o preflight falha e a sessão não começa.
- O HMR está desligado para que nenhuma conexão WebSocket seja necessária;
  todos os WebSockets são negados pelo context guard. Negativos usam URLs
  reservadas/documentação e nunca resolvem DNS nem tentam alcançar um endpoint
  público; a namespace deve provar ausência de rota externa antes desses casos.
- Registrar somente enum de classe (`asset`, `api_fixture`, `health_fixture`,
  `deny`, `redirect`, `download`, `websocket`), ID estático da regra, decisão e
  timestamp. Nunca persistir URL crua, query, fragmento, header, cookie, corpo,
  nome de host externo ou caminho dinâmico; segmentos dinâmicos são omitidos ou
  substituídos pelo marcador fixo `[id]` antes de qualquer serialização.
- Produzir receipt local contendo versão/hash da configuração, namespace
  ativo, inventário de interfaces/rotas sem dados pessoais, prova de API
  ausente, tentativas observadas por classe e total zero de requests externos
  concluídos. Um request externo tentado, classe não observável, dúvida sobre
  cobertura ou qualquer saída detectada deixa o resultado `BLOCKED` e impede
  `READY_FOR_HUMAN_REVIEW`.

### 2. Identidade e aviso de sandbox

- Aceitar somente as identidades constantes existentes
  `SYNTHETIC_SUPERVISOR`, `SYNTHETIC_APPROVER` e `SYNTHETIC_ADMIN`; rejeitar
  entrada livre ou valores de ambiente para ator, tenant e papel.
- Injetar a identidade antes do primeiro script da aplicação e comprovar isso
  em teste de ordem de inicialização. Todas as rotas API permanecem mocks.
- Antes de liberar qualquer passo, inserir no DOM do harness um aviso visível e
  navegável por tecnologia assistiva com o texto
  `Sandbox sintético: nenhum sistema real será alterado` e sem sobreposição que
  oculte controles.
- Exibir um interlock do facilitador: a sessão não pode começar enquanto o
  aviso não estiver presente na árvore de acessibilidade e o participante e o
  facilitador não confirmarem que o localizaram. O interlock registra somente
  `acknowledged: true/false`, sem identificação.

### 3. Loading H05 pause/release

- Substituir, apenas no novo modo de sessão, o delay fixo de 30 segundos por
  gate local determinístico com `WAITING`, `RELEASED` e `STOPPED`.
- O gate só segura o método/path exato da consulta sintética de conversas que
  produz o loading H05. Nenhuma outra resposta recebe delay; os defaults da
  fixture antiga permanecem idênticos.
- Somente o facilitador controla release/stop; não usar timer automático ou
  timeout que avance o passo sem comando humano.
- O receipt registra início, release/stop e resultado usando relógio monotônico
  e timestamps UTC, sem capturar fala ou identidade.
- Sem gate ativo ou se a fixture sair do estado esperado, marcar `BLOCKED` e
  impedir H05; nunca tentar repetir/avançar automaticamente.

### 4. Binding do candidato e do registro

- Usar o `buildPhase11Candidate(root)` existente. Antes de iniciar, exigir
  candidato congelado, `dirty: false`, `untrackedFiles: []` e hash/candidateId
  explicitamente aprovado para a sessão.
- O launcher não cria commit, stage, stash, reset, checkout ou worktree e não
  limpa alterações existentes. `buildPhase11Candidate(root)` precisa retornar
  `dirty: false`, `untrackedFiles: []` e os hashes presentes na autorização.
  Isso exige candidato já existente e limpo, formado por processo separado
  cuja disposição tenha sido autorizada fora desta FU1. Se o BUILD local ainda
  estiver em worktree dirty, faltar autorização para produzir o commit do
  candidato ou os hashes não coincidirem, `session` fica `BLOCKED` antes do
  browser. Esta SPEC não autoriza commit nem cria caminho alternativo para
  contornar o helper de candidato.
- Capturar `candidateId`, `treeHash` e a lista de arquivos/hash do candidate
  manifest antes e depois. Qualquer diferença interrompe/invalida a sessão.
- Criar registro suplementar por passo com: `stepId`, `candidateId`,
  `candidateTreeHash`, papel/fixture sintético, rota/âncora, estado inicial/final,
  browser/versão, viewport/zoom, início/fim, status e `captureId` sempre igual a
  `none`. Não incluir nome, email, contato, fala, screenshot, cookie, token,
  prontuário ou conteúdo de request.
- No receipt de sessão, registrar `approvalSha256`,
  `facilitatorConfirmation` e `consentDecision` como enums
  (`confirmed|declined|withdrawn`) e timestamp UTC; não incluir identidade ou
  texto de consentimento. Recusa/ausência deve gerar `BLOCKED` sem abrir página.
- Calcular SHA-256 dos bytes do relatório humano, registro suplementar e receipt
  de rede. Verificador independente deve confirmar os três hashes e o mesmo
  `candidateId/treeHash` antes de qualquer revisão humana.
- Aceitar somente estados `PASS`, `FAIL` ou `BLOCKED` conforme o schema existente;
  ausência, finding ou interrupção não podem ser convertidos em `PASS`.
  `READY_FOR_HUMAN_REVIEW` só significa que o pacote pode ser revisado; não
  aprova finding, F28 ou AUD20-19.

### 5. Autorização humana, consentimento e cleanup

- O modo `session` exige um registro de autorização separado, validado pelo
  schema proposto `AUD20-19-session-authorization.schema.json`, com
  `additionalProperties: false` e campos obrigatórios `schemaVersion: 1`,
  `decision: APPROVED`, `specSha256`, `candidateId`, `candidateTreeHash`,
  `allowedSteps` (subconjunto único não vazio de H01–H09),
  `facilitatorRole: AUTHORIZED_FACILITATOR`, `validFrom`, `validUntil` e
  `capture: {screenshots: false, audio: false, video: false}`. O runner recebe
  `--session-authorization` e `--session-approval`; valida os dois schemas e
  compara o SHA-256 do arquivo de autorização, `specSha256`, candidato, passos,
  validade e política de captura. O approval schema tem
  `additionalProperties: false` e campos obrigatórios `schemaVersion: 1`,
  `decision: APPROVED_SESSION`, `authorizationSha256`, `specSha256`,
  `candidateId`, `candidateTreeHash`, `allowedSteps`,
  `facilitatorRole: AUTHORIZED_FACILITATOR`, `validFrom`, `validUntil`,
  `screenshots: false`, `audio: false`, `video: false` e
  `externalFacilitatorCheck: CONFIRMED`. O registro de aprovação precede a
  sessão; o seu SHA-256 e os hashes/escopo nele declarados precisam constar de
  decisão humana específica registrada em 0190. Aprovação da SPEC ou do BUILD
  não serve como essa decisão de sessão.
- Antes de abrir Chromium headed ou qualquer página, um revisor humano distinto
  do facilitador verifica fora do harness a proveniência da decisão e a
  identidade/atribuição do facilitador, compara o hash do approval com 0190 e
  confirma o candidato e os passos autorizados. O harness não autentica
  identidade humana: recebe somente a confirmação booleana desse revisor e a
  registra como enum; nenhum nome, usuário do sistema, credencial ou token é
  armazenado. Depois dessa conferência, o terminal interativo exige que o
  facilitador autorizado confirme que explicou o escopo sintético, os limites e
  a política de retenção. Só então o facilitador registra se o participante
  deu consentimento livre e informado também para reter o relatório redigido;
  qualquer resposta negativa/ausente retorna `BLOCKED` antes de abrir browser.
  Retirada durante a sessão fecha o contexto imediatamente. Só o facilitador
  autorizado pode registrar a decisão de consentimento; o participante pode
  interromper a qualquer momento. Registrar apenas enums (`confirmed`,
  `declined`, `withdrawn`) e timestamp UTC, sem nome, contato, fala ou texto
  livre. Essa confirmação local não substitui a aprovação humana registrada.
- Esta fatia não grava mídia. Logs de rede ficam em memória. O diretório
  temporário e o diretório de destino usam permissão POSIX `0700`; cada arquivo
  final usa `0600` e criação exclusiva, sem symlink. Pais que o harness criar
  também usam `0700`; destino preexistente/colisão falha fechado. Ao concluir
  com sucesso e confirmar consentimento para retenção, o harness valida e grava
  somente `human-report.json`,
  `session-supplement.json`, `network-receipt.json` e `manifest.json` em
  `docs/04_audit/evidence/AUD20/human-sessions/<sessionId>/`, onde `sessionId`
  são 32 dígitos hexadecimais aleatórios sem semântica pessoal. O manifest
  contém somente caminhos e SHA-256 desses arquivos e os vínculos
  SPEC/candidato/autorização. A gravação não faz commit. Esses quatro artefatos
  redigidos ficam como evidência local append-only até adjudicação humana da
  sessão e fechamento do item; depois seguem somente uma decisão de
  retenção/exclusão humana registrada. Não há retenção automática por prazo nem
  sync externo. No encerramento, apagar o diretório temporário e todo log bruto.
  Em parada/retirada, não escrever pacote de sucesso: remover temporários e
  persistir somente `blocked-receipt.json` com estado `BLOCKED`, classe da
  parada e timestamp em diretório local `0700`. Relatório, suplemento e receipts
  permitem somente enums, anchors e metadados desta SPEC; observação humana
  pessoal ou conteúdo livre identificador é recusado antes da serialização.

## Critérios de aceitação propostos

- **H01.** Preflight comprova namespace só com loopback e sem rota externa; Vite
  usa config sem proxy, bind loopback/porta fixa, Playwright não carrega o
  config raiz nem inicia/reutiliza API; host, protocolo, redirect e method/path
  não allowlisted são abortados.
- **H02.** Testes adversariais cobrem popup/frame/navegação, redirect, fetch/XHR,
  worker, registro de service worker, download, API method/path/query
  desconhecido ou próximo, chaves de query duplicadas, valores percent-encoded
  e WebSocket. `serviceWorkers: 'block'` e `context.routeWebSocket` são
  instalados antes da primeira página. Qualquer classe não observável mantém
  `BLOCKED`.
- **H03.** Identidade só pode vir das fixtures sintéticas e está instalada antes
  do primeiro script da aplicação.
- **H04.** Aviso de sandbox está visível e exposto na árvore acessível; sessão
  não passa do interlock sem confirmação do participante e facilitador.
- **H05.** Gate pause/release controla loading de forma determinística, não
  avança sozinho e permite parada imediata.
- **H06.** Mudança de `candidateId/treeHash`, candidate dirty ou arquivo
  untracked faz preflight/final binding falhar sem
  `READY_FOR_HUMAN_REVIEW`.
- **H07.** Registro suplementar e receipts são schema-valid, redigidos,
  hash-bound ao candidato e não contêm identidade/artefato pessoal. Em sucesso,
  os quatro arquivos exatos são persistidos sob
  `human-sessions/<sessionId>/` com diretório `0700`, arquivos `0600`, sem
  overwrite/symlink; hashes/schema/binding são revisáveis após remover temp.
- **H08.** Testes negativos cobrem cada deny path, interlock ausente, identidade
  inválida, aprovação ausente/vencida ou com hash divergente, verificação
  externa do facilitador ausente, consentimento de retenção recusado/ausente,
  pause sem release, candidate dirty/drift, campo pessoal, colisão de
  `sessionId`, symlink/permissão incorreta e cleanup. Falha no preflight de
  aprovação/consentimento impede abrir página; finding, drift ou erro durante
  a sessão impede `READY_FOR_HUMAN_REVIEW` e pacote de sucesso. Relatório
  automatizado mantém `human_a11y: PENDING` e `releaseEligible: false`.
- **H09.** Admin panel carrega somente as quatro leituras exatas permitidas;
  os fixtures de `/v1/admin/test-lab/runs?limit=10` e
  `/v1/admin/execution-traces?limit=10` entregam páginas sintéticas vazias,
  e variantes de método/path/query, duplicata `limit`, valor fora de `10` ou
  qualquer endpoint de escrita são negados. A navegação não altera setting nem
  política.

## Verificação, evidência e rollback

- Unit tests: helpers de allowlist/query, identity, marker/interlock,
  pause/release, schemas de autorização/aprovação e registro suplementar,
  hashing, redaction, consentimento, escrita `0700`/`0600`, colisão de caminho,
  symlink e cleanup, namespace/proxy sanitization e mapa method/path; cobrir
  positivos e negativos sem iniciar API ou enviar tráfego.
- Playwright: executar somente por
  `node scripts/aud20-19-human-session-harness.mjs verify` em modo headless. O
  launcher deve chamar `playwright test --config
playwright.aud20-19-human-session.config.ts
tests/e2e/aud20-19-human-session-harness.spec.ts --project=chromium
--workers=1 --grep-invert @human-session`, dentro do namespace, com servidor Vite não reutilizável, sem
  vídeo, screenshot ou trace. A chamada não carrega configuração raiz, não
  inicia API, não abre sessão headed nem cria evidência humana.
- Gates de encerramento da fatia com código: `npm test`, `npm run typecheck`,
  `npm run lint`, `npm run test:coverage`, `npm run docs:check` e
  `npm run format:check`, em Node `22.23.2`; falhas preexistentes precisam ser
  identificadas e não podem ser atribuídas ou ocultadas nesta fatia.
- Após o último write: congelar candidato exato, gerar manifest/receipts por
  último, fazer verificação em processo separado e crítica fresh-context dos
  bytes/scope; qualquer write posterior invalida os receipts afetados. No modo
  `session`, a revisão independente reabre o pacote persistido em
  `human-sessions/<sessionId>/` e confere hashes, schema, permissões e binding
  antes de adjudicar finding ou status humano.
- Rollback remove somente os novos helpers, runner, schemas/templates e testes;
  reverte a extensão pause/release da fixture mantendo seu comportamento
  anterior. Não altera dados operacionais nem remove pacote de evidência humana
  já gravado; serviço externo ou aplicação não é alterado.
- Encerrar `AUD20-19-FU1` não fecha `IMP50-18`: o resultado humano continua
  pendente até sessão especificamente autorizada, consentida, realizada,
  candidate-bound e revisada por pessoa responsável. Produção/release seguem
  `NO_GO`.

## Modos de execução

- `verify`: exclusivamente headless, sem consentimento ou participante, usa a
  configuração Playwright isolada e o Vite da allowlist dentro do namespace.
  Produz somente evidência automatizada do harness e mantém
  `human_a11y: PENDING` / `releaseEligible: false`.
- `session`: headed e indisponível por padrão. Só aceita autorização humana
  separada cujo digest esteja registrado para esta sessão, `candidateId`/
  `treeHash` exatos, validade ativa, decisão de sessão, confirmação do
  facilitador, consentimento confirmado e todas as pré-condições do roteiro.
  Usa a mesma configuração isolada, egress bloqueado e tabela de fixtures; não
  oferece captura de mídia. Sem qualquer gate, terminal interativo ou candidato
  Git limpo, retorna `BLOCKED` antes de abrir browser ou página. Esta SPEC não
  concede essas entradas; nenhum modo `session` foi autorizado ou executado.

## Gate solicitado

Esta preparação em paralelo não substitui a próxima ação crítica PLAN50 já
registrada para `AUD20-17-FU1`/`IMP50-40` nem reordena 0336/0340. Solicita-se
revisão humana **desta SPEC final e do registro proposto de `AUD20-19-FU1`**
antes de qualquer BUILD, depois da crítica independente fresh-context. A
aprovação, se concedida, deverá ser registrada por hash e cobrir somente o
harness local descrito nesta allowlist; não concede consentimento, não nomeia
participante/equipamento, não inicia sessão humana e não autoriza staging ou
produção. Até esse gate e admissão explícitos, a task é proposta e BUILD não
admitido.
