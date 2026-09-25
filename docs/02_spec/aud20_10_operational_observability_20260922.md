# SPEC AUD20-10 — wiring local de observabilidade

## Estado

- task: `AUD20-10`
- fase: `SPEC`
- status: `WAITING_HUMAN_APPROVAL`
- execução proposta: `CONTROLLED_LOCAL_SYNTHETIC`
- staging/produção: `NO_GO`

## Desenho

Criar uma factory de configuração em `packages/observability` que aceite modo
desabilitado ou arquivo local explicitamente permitido. API e worker recebem o
mesmo contrato de collector por injeção; entrypoints não criam destino de rede.
Flush/shutdown devem ser limitados e observáveis.

Instrumentar a decisão de approval no owner da transição, calculando latência
somente quando `requestedAt` e `decidedAt` forem válidos. Emitir nome estável,
valor em ms e atributos allowlisted (`decision`, `outcome`, `operation`), sem
IDs pessoais ou conteúdo.

Adicionar delivery ledger local append-only para alertas sintéticos. O
exercício lê batches reais do collector, avalia `DEFAULT_ALERT_RULES`, entrega
ao ledger e exige transições `detected -> acknowledged -> closed` com relógio
injetado. Falha de sink/delivery invalida o exercício; não há retry infinito.

## Negativos e verificação

- collector ausente/desabilitado; path não permitido; write/flush falha;
- latência ausente, inválida ou negativa; PII/canary no export;
- correlação ausente entre API/worker; regra `no_data` tratada como OK;
- entrega ou ack ausente e timestamps fora de ordem;
- owner/SLO preenchido sem decisão humana.

Executar contract tests, exercício integrado sintético, full suite, coverage,
typecheck/lint/format/docs, mutation dirigida e crítica independente.

## Rollback

Desabilitar a factory por configuração e remover somente wiring/instrumentação
nova. Preservar collectors, regras e runbooks históricos. Nenhum schema do
produto ou efeito externo existe.

## Critérios C01–C07

- C01: collector ligado aos entrypoints e runtime;
- C02: approval latency real e correta;
- C03: redaction/correlação preservadas;
- C04: alert evaluation e delivery local fail-closed;
- C05: exercício fecha ciclo com timestamps;
- C06: regressão e compatibilidade passam;
- C07: crítica independente aprova, com owner/SLO ainda pendentes.

## Gate

`TECHNICALLY_SPECIFIED`: desenho, contratos, negativos, rollback e evidência
estão definidos. BUILD local exige confirmação humana; serviços externos,
staging, produção, commit, push e deploy não estão autorizados.

## Adendo proposto — IMP50-09 / collector conectado

- revisão: `DRAFT_PENDING_HUMAN_REVIEW` em `2026-09-23`; o usuário reativou a
  task para trabalho local, mas essa decisão não aprova este adendo nem inicia
  BUILD.
- escopo desta fatia: somente conectar API e worker ao mesmo contrato de
  collector e exercitar correlação sintética. `approval_latency_ms`, alertas,
  delivery ledger operacional, owner e SLO continuam em fatias posteriores de
  `AUD20-10`; nenhuma delas é concluída por este slice.
- arquivos candidatos: `packages/observability/src/collector.ts` e
  `packages/observability/src/index.ts`; `apps/api/src/server.ts`;
  `apps/worker/src/main.ts` e
  `worker-observability.ts` e novo
  `apps/worker/src/controlled-memory-runtime.ts`;
  `packages/observability/src/observability-exercise.ts`;
  testes existentes `collector.test.ts`, `observability-exercise.test.ts`,
  `apps/api/src/__tests__/observability.test.ts` e
  `apps/worker/src/__tests__/worker-observability.test.ts`, e novo teste de
  composição `tests/aud20-10-composition.test.ts`, limitado a factory,
  wiring/correlação/encerramento. `controlled-memory-runtime.ts` será uma
  função import-safe usada pelo ramo `controlled-memory` de `main.ts`; o teste
  importa somente essa função, sem importar o entrypoint que tem efeitos no
  processo. Ela recebe o adapter compartilhado e o collector; o entrypoint
  continuará usando seu adapter local por padrão. A API pública, rotas e
  schemas permanecem fora do escopo. Qualquer outra
  expansão da allowlist ou superfície precisa de nova revisão.
- caminho de composição — estado `CURRENT`: `buildServer` recebe um
  `runtimeLogger` injetável e a rota
  `POST /v1/webhooks/channels/:channel/messages` cria o correlation ID e pode
  colocar `inbound.process` em um `DurableOutboxAdapter`; `createControlledWorker`
  consome esse contrato, e `createCollectorWorkerTelemetry` já adapta logs ao
  collector. Hoje esses seams não formam um exercício conectado: API escreve
  no logger de processo, o ramo `controlled-memory` cria sua própria outbox e
  não recebe collector, e o `main.ts` do worker executa seleção no import.
- caminho de composição — decisão `PROPOSED`: o harness compõe
  `buildServerFromEnv` com `NODE_ENV=test`, persistência/outbox em memória,
  `durableInbound: true`, tenant sintético fixo e collector API injetado por
  novo `runtimeCollector?: ObservabilityCollectorPort` em
  `BuildServerOptions`. `emitRuntimeLog` mantém o callback existente e faz
  projeção para o collector de somente `event`, `correlationId`, `operation`
  constante e `outcome`; `buildServer` registra `onClose` que aguarda
  `flush()`/`close()`. O harness envia a fixture por `app.inject` à rota
  indicada, sem chamar `listen()` nem compor PostgreSQL. Em seguida,
  `controlled-memory-runtime.ts` drena o mesmo outbox com o
  `createControlledWorker` real e handler sem efeito externo, registra no
  collector worker o correlation ID recebido no evento e sempre fecha o
  collector no `finally`. Não inicia listener, PostgreSQL, provider, socket ou
  processo separado. O teste verifica que a correlação emitida pela API chega
  inalterada ao worker, que ambos os sinks escrevem seus batches finais e que
  `app.close()`/encerramento do worker aguardam `flush()` e `close()` inclusive
  na falha. Os IDs exportados são opacos e gerados pela própria fixture/API.
- injeção: uma factory recebe o contexto
  `{ profile: CONTROLLED_LOCAL_SYNTHETIC, mode: disabled | local_file, root,
role: api | worker }`. O sink usa somente nomes de arquivo constantes
  (`api.jsonl` e `worker.jsonl`); não aceita `filePath` livre. `local_file`
  falha fechado fora do perfil
  `CONTROLLED_LOCAL_SYNTHETIC`, exige diretório canônico dentro de uma raiz
  temporária exclusiva da execução e rejeita caminho, symlink ou destino fora
  dela. `disabled` não cria arquivo.
- enforcement de `CONTROLLED_LOCAL_SYNTHETIC` — este nome identifica somente
  um perfil do harness, não uma variável de deployment nem autorização runtime.
  O harness cria contexto imutável e a raiz exclusiva via `mkdtemp()` abaixo de
  `tmpdir()`; o factory valida canonicalização, contenção e ausência de symlink.
  O runner recusa iniciar se o perfil não for exato,
  `process.env.NODE_ENV` e o env da API não forem `test`, a persistência/outbox
  não forem em memória, o worker não usar o ramo `controlled-memory`, ou o
  sink não for local. A fixture usa valores sintéticos fixos; o
  worker não recebe handlers/provider com efeito externo; `app.inject` não abre
  listener. Testes negativos cobrem `NODE_ENV=production`, PostgreSQL,
  adaptador de rede, raiz fora de temp, symlink, traversal e nome de arquivo
  fornecido por caller. O perfil não afirma segurança para deployment e não é
  aceito por entrypoints de staging/produção. API `main.ts` e entrypoints
  operacionais ficam fora desta fatia; somente o harness injeta `local_file`
  nos builders testáveis, e a configuração default dos processos não é
  alterada.
- dados exportáveis: correlação opaca criada para a fixture, trace/span IDs
  sintéticos, nome de evento e classificações enumeradas. Não exportar
  `tenantId`, `conversationId`, `sessionId`, `agentId`, `approvalId`, nomes,
  conteúdo, payload, texto livre ou IDs vindos de requests. O adapter local
  usa projeção estrita além da sanitização atual.
- limites: buffer total máximo de 512 registros por collector e flush máximo
  de 256 registros por linha; excesso incrementa `droppedRecords` e a
  qualificação falha. `close()` é idempotente, drena no máximo dois batches de
  256 registros e descarta/contabiliza chamadas recebidas depois do fechamento;
  falha de escrita rejeita o exercício, sem retry em loop. Não usar timers,
  sockets, OTLP ou qualquer transporte de rede nesta fatia.
- ciclo de vida: o harness cria a raiz descartável com permissão restrita,
  injeta a mesma raiz às duas composições, fecha os dois collectors em
  `finally`, verifica que API e worker emitiram a mesma correlação sintética e
  remove a raiz. Evidência persistida contém somente contagens, checks e
  digests do fixture; nenhum arquivo JSONL fica no repositório.
- encerramento de runtime: no API memory, `buildServer` registra o hook que
  aguarda `flush()`/`close()` e `app.close()` serve como boundary do shutdown.
  `controlled-memory-runtime.ts` drena o mesmo adapter compartilhado e fecha
  seu collector em `finally` antes de resolver ou propagar erro. Os testes
  verificam último batch, ordem, `close()` aguardado, falha propagada e cleanup,
  sem flush por timer. Shutdown de PostgreSQL controlled/continuous e ordem
  relativa a `pool.end()` ficam fora desta fatia e exigem task/admissão própria;
  nenhum pool é criado aqui.
- negativos obrigatórios: modo local em produção; raiz ausente ou fora de
  temp; symlink e traversal; tentativa de nome de arquivo fornecido pelo
  chamador; rede/socket; canary e texto livre; IDs pessoais/de tenant; correlação
  divergente API/worker; buffer/flush excedido; erro de escrita; close sem
  flush; cleanup ausente.
- rollback: voltar à injeção desabilitada nos entrypoints e remover somente o
  wiring novo. Preservar APIs públicas, schema, migrations, comportamento de
  rotas e entregas anteriores; apagar o sink temporário após o exercício.
- aceite do slice: contract tests da factory/limites; testes de wiring API e
  worker somente para memória e de flush no shutdown; exercício integrado
  sintético que inicia as composições API/worker pelo caminho especificado
  acima e verifica a mesma correlação atravessando request, outbox e dispatch;
  negativos acima; regressão, typecheck,
  lint, coverage, format, `docs:check`, `git diff --check`, mutation dirigida
  com todos os mutantes selecionados detectados e crítica independente fresca.
  C01–C07 de `AUD20-10` permanecem abertos até as demais fatias e decisões
  humanas.

O adendo é uma proposta em refinamento após crítica condicional. O status
continua `DRAFT_PENDING_HUMAN_REVIEW`; o BUILD não está admitido. Não tratar
como `SPEC_APPROVED_CONTROLLED_BUILD` até crítica fresca, decisão humana
hash-bound e admissão explícita da fatia em `0190_spec_validation.md`/0337.
