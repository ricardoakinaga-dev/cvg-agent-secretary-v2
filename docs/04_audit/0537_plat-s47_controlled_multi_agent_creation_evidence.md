# Evidência — PLAT-S47 criação de múltiplos agentes no Control Center

## Identificação

- task: `PLAT-S47-001_CONTROLLED_MULTI_AGENT_CREATION_MODE`
- status: `COMPLETED_CONTROLLED`
- fase: `AUDIT`
- timestamp de registro: `2026-08-26T11:39:07-03:00`
- timestamp de fechamento controlado: `2026-08-26T15:59:02-03:00`
- owner: `platform/control-center`
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`

## Discovery

O Control Center inicia com o editor em modo de criação somente quando não há
agente selecionado. Depois que o primeiro agente é criado, o estado mantém esse
agente selecionado, os campos de slug/nome/descrição ficam `readOnly` e o botão
passa a clonar uma versão (`Salvar nova versão`). Não existe ação explícita para
limpar a seleção e voltar ao modo `Novo agente`. Portanto, a API consegue criar
mais de um agente, mas a jornada exigida pela UI não consegue criar Agent A e
Agent B sem recarregar ou sair do painel.

## Contrato aprovado para BUILD

O painel terá uma ação explícita `Novo agente` que inicia um editor vazio
tenant-scoped, limpa apenas o estado derivado do agente/versão selecionado e
preserva a identidade do operador. O modo de edição de agente existente
continuará criando uma nova `AgentVersion` por clone. A jornada A/B deverá usar
o mesmo Control Center e a mesma API controlada, com snapshots e configurações
independentes, sem alterar o kernel ou habilitar efeitos externos.

## Critérios de auditoria

- [x] `Novo agente` retorna o editor ao modo de criação sem deixar campos ou
      trace/suite/ledger do agente anterior;
- [x] Agent A e Agent B podem ser criados pela UI no mesmo tenant e sessão, com
      IDs/slugs e configurações distintas;
- [x] selecionar um agente existente mantém edição versionada por clone e não
      transforma a ação em mutação in-place;
- [x] troca de agente carrega somente versões e estado derivados do alvo, com
      API tenant-aware e regressão sem chamadas externas;
- [x] focused, regressão, coverage, typecheck, lint, readiness, worker smoke,
      E2E, PostgreSQL, audit, build, format e diff check permanecem verdes;
- [x] crítica independente read-only é registrada quando o runtime permitir.

## RED observado — 2026-08-26T11:39:07-03:00

- comando: `npx vitest run apps/web/src/features/platform/multi-agent-creation.test.tsx --no-file-parallelism --maxWorkers=2`
- resultado: `RED_OBSERVED`; 1 arquivo/1 teste falhou como esperado.
- falha reproduzida: depois de criar Agent A, o painel manteve `selectedAgent`,
  deixou slug/nome/descrição `readOnly` e não expôs o botão `Novo agente`.
- escopo: somente fixture tenant-scoped e estado local do Control Center; sem
  provider, canal, rede, dado real ou side effect.
- próximo passo: implementar o reset explícito e rerodar o focused em GREEN.

## GREEN corretivo — 2026-08-26T12:02:42-03:00

- implementação: `Novo agente` retorna ao modo `create-agent`, substitui o
  formulário por `initialForm` e limpa estado derivado; seleção de outro agente
  aplica o mesmo reset sem apagar a identidade do operador.
- concorrência: um token de escopo local invalida respostas tardias de versões,
  suites, trace, catálogos e ledger; re-selecionar o agente atual preserva o
  modo de clone. Durante gravação, a lista de agentes fica desabilitada.
- focused: 4 arquivos/9 testes `PASS`, incluindo A/B com greetings distintos,
  headers tenant-aware, re-seleção do agente atual e resposta tardia de suite.
- browser E2E: `npx playwright test tests/e2e/platform-control-center.spec.ts`
  passou 1/1, criando A, usando `Novo agente`, criando B e voltando a A antes
  do fluxo de Test Lab/publicação.
- nenhum provider, canal, RAG, rede, dado real ou side effect foi ativado.

## AUDIT corretivo final — 2026-08-26T15:49:19-03:00

- RED corretivo: a crítica independente reproduziu um P1 em que o Trace Viewer
  exibiu o histórico inteiro quando `Novo agente` deixava `selectedAgent` nulo;
  também reproduziu a ausência de defesa para `agentId` vazio e apontou a
  possibilidade de reutilização de escopo após A→B→A. Uma prova negativa
  adicional reproduziu `spans: {}` causando `TypeError` no painel.
- correções: histórico do Trace Viewer fica vazio sem agente selecionado e é
  filtrado pelo agente corrente; leituras de suites/ledger exigem `agentId`
  não vazio no cliente e na rota HTTP; o cliente redige recursivamente textos
  de traces antes de expô-los ao painel, e a UI aplica redaction/fallback
  também a metadados opcionais; tokens de view têm geração monotônica e
  invalidam callbacks antigos mesmo quando a seleção retorna à mesma chave
  textual; spans não-array são normalizados como trace legado.
- TDD/regressão: App focused `15/15`; focused combinado de platform/client
  `4 arquivos/18 testes PASS`; a suíte integral fechou `127 arquivos PASS/2
skipped`, `534 testes PASS/19 skipped`.
- coverage V8: statements `84,86%`, branches `80,12%`, functions `84,97%`,
  lines `85,97%`.
- gates finais: readiness `4/4`; worker startup smoke `PASS`; PostgreSQL
  controlado `8 arquivos/72 testes PASS`; E2E `4/4 PASS`; build `158 módulos
transformados PASS`; `npm audit` `0 vulnerabilities`; typecheck, lint,
  format e diff check `PASS`.
- nenhum provider, canal, RAG, rede, dado real, segredo ou side effect foi
  ativado.

## Veredito independente final — 2026-08-26T15:59:02-03:00

- revisor: agente compatível independente, somente leitura; nenhum arquivo foi
  alterado pelo revisor;
- resultado: `PASS_CONTROLLED` para o MVP controlado;
- severidade: P0 `0`, P1 `0`, P2 `0`, P3 `0`;
- conferência: o revisor validou agent scope HTTP/UI, filtragem e tolerância do
  Trace Viewer, redaction recursiva, geração de UUID no browser e proteção de
  callbacks A→B→A, em conjunto com os gates executáveis registrados acima;
- produção: `NO-GO` / `WAITING_HUMAN_APPROVAL`, por identidade/tenant real,
  infraestrutura, retenção/PII, providers/canais/RAG e decisões sensíveis;
- fechamento: `PLAT-S47-001` está `COMPLETED_CONTROLLED` em `AUDIT`; a próxima
  ação segura é nova `DISCOVERY -> PRD -> SPEC` controlada.

## GREEN final e gates controlados — 2026-08-26T12:48:37-03:00

- correção final: o token de escopo agora incorpora `operatorId`, `role` e
  `tenantId`; respostas pendentes do tenant/identidade anterior não podem
  aplicar estado no painel remounted. O reset por agente preserva os catálogos
  tenant-wide de plugins e knowledge, enquanto a troca de tenant os limpa e
  recarrega.
- concorrência: `runIfCurrent` concentra a validação de escopo para loading,
  sucesso, erro, finalização e continuações de escrita; `isSaving` também é
  liberado ao reset de escopo para não deixar o editor travado.
- focused web: 7 arquivos/18 testes `PASS`; focused específico S47: 1 arquivo/
  5 testes `PASS`.
- regressão integral: 127 arquivos `PASS`/2 skipped; 528 testes `PASS`/19
  skipped.
- coverage V8: statements `84,99%`, branches `80,36%`, functions `84,80%`,
  lines `85,98%` — todos acima do limiar de 80%.
- readiness `4/4 PASS`; worker startup smoke `PASS`; PostgreSQL controlado
  `8 arquivos/72 testes PASS`; E2E `4/4 PASS`; build `70 módulos PASS`;
  `npm audit` encontrou `0 vulnerabilities`; typecheck, lint, format e diff
  check `PASS`.
- nenhum provider, canal, RAG, rede, dado real ou side effect foi ativado.

## Correções após crítica independente — 2026-08-26

A primeira crítica pós-GREEN retornou `NO-GO` por dois achados: resposta
pendente durante troca de tenant/identidade ainda podia chegar ao painel e o
reset descartava catálogos tenant-wide. O BUILD corrigiu ambos e adicionou
testes deferred para troca de tenant e preservação de catálogos; a revisão
independente final desta versão está pendente de registro abaixo.

## Limites

Somente a jornada de criação/seleção no Control Center e a prova de isolamento
de estado entre agentes fictícios. Sem provider/canal real, RAG, broker, rede,
deploy, dado real, ação clínica/financeira, segredo ou side effect.

## Próximo passo

Abrir nova `DISCOVERY -> PRD -> SPEC` controlada e preservar o limite
`NO-GO` para produção real, mesmo com o slice controlado aprovado.
