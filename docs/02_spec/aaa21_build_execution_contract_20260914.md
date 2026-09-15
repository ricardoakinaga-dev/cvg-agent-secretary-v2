# SPEC AAA-21 — execução controlada da composição API → worker → kernel

- Task: `AAA-21-EXEC-20260914` (task canônica: `AAA-21`).
- Programa: `AAA-20260912`.
- Data de congelamento: `2026-09-14`.
- Gate: `SPEC_APPROVED_CONTROLLED_BUILD` para este slice, autorizado pela
  solicitação atual do usuário e limitado a fixtures/adapters locais.
- Bar: `docs/04_audit/evidence/AAA/AAA-21/quality-bar-v1.json`.
- Produção: `NO-GO`. Este contrato não autoriza IdP, provider, canal, RAG
  institucional, dados reais, migração operacional, deploy ou efeito externo.

## Objetivo verificável

Entregar e qualificar o caminho público controlado que recebe uma mensagem HTTP
sintética, persiste o contexto e o outbox, entrega o evento a um worker
durável, converte o envelope em `GovernedTurnInput`, atravessa policy,
approval/journal e modelo/tool falsos, grava audit e produz somente uma
notificação outbox suprimida/controlada. A mesma operação reapresentada deve
ser idempotente e não pode produzir um segundo efeito.

O caminho deve manter o mesmo `correlationId` e o mesmo `traceId` lógico entre
webhook, outbox, worker, runtime, modelo, ferramenta, outbox de saída e audit.
Quando uma fronteira não puder carregar o contexto, ela deve falhar fechado;
não é permitido criar uma segunda árvore de autoridade silenciosamente.

## Escopo de escrita

Paths permitidos nesta task, sob coordenação do lead:

- `apps/api/src/` — composição e emissão segura do inbound controlado;
- `apps/worker/src/` — seleção do runtime, consumer, handlers e observabilidade;
- `packages/agent-runtime/src/` — contrato/mapeamento e runtime canônico;
- `packages/observability/src/` — contexto de trace, spans, métricas e redaction;
- `packages/persistence/src/` e `packages/persistence/migrations/` — campos e
  adapters duráveis somente quando necessários para preservar a identidade da
  operação;
- testes unitários, de integração controlada e E2E sintéticos diretamente
  relacionados aos paths acima;
- `docs/02_spec/`, `docs/03_build/`, `docs/04_audit/evidence/AAA/AAA-21/`,
  `docs/20_master_execution_log.md`, `docs/30_backlog_master.md` e
  `docs/99_runtime_state.md` para rastreabilidade desta rodada.

Qualquer path fora desta lista exige nova atribuição e registro antes da
edição. Nenhum segredo, credencial operacional, paciente, prontuário, valor
financeiro real ou payload clínico deve entrar no código, fixture, log ou
evidência.

## Invariantes de implementação

1. `WORKFLOW_COORDINATOR` ausente seleciona `governed-kernel`; frontier sem
   adapter e valores desconhecidos falham no startup.
2. O coordenador só produz plano/etapa. Ele nunca importa, instancia ou chama
   executor de ferramenta, outbox, journal, approval store ou credencial.
3. A proposta aprovada é a única fonte do payload executado; alteração de
   envelope, hash, tenant, sessão, ação ou chave falha fechado.
4. O runtime controlado exige journal de efeito e approval authority duráveis
   quando o caminho PostgreSQL for selecionado. Ausência de configuração não
   injeta memória silenciosamente.
5. O efeito permitido nesta task é `controlled_fake`; mensagens de saída são
   sintéticas e suprimidas antes de qualquer canal externo.
6. Replay, crash entre efeito e confirmação, lease vencido e takeover mantêm
   estado honesto (`UNCERTAIN`, handoff ou retry idempotente) e não duplicam
   efeito.
7. `tenantId`, `correlationId`, `traceId`, `conversationId`, `sessionId` e
   `inboundMessageId` são validados em cada fronteira; cross-tenant é negado.
8. Logs e métricas não carregam corpo bruto, sender, segredo ou identificador
   de alta cardinalidade fora da allowlist.

## Aceite e evidência

- Teste público HTTP → persistência → worker → kernel com modelo/tool
  determinísticos e evidência de policy, journal, audit, trace e outbox.
- Reexecução da mesma mensagem e replay após restart não executam uma segunda
  ferramenta nem enfileiram uma segunda operação equivalente.
- Testes negativos F01–F05/F15/T-19 e fronteiras de tenant/correlação/trace
  falham fechado.
- `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` e os testes
  PostgreSQL/E2E disponíveis são executados e têm resultado bruto com hash.
  Testes condicionais sem `TEST_DATABASE_URL` permanecem `BLOCKED`, nunca
  `PASS` por inferência.
- Um crítico fresco, read-only e independente reexecuta os critérios contra o
  fingerprint do candidato; o builder não emite `VERIFIED` nem `DONE`.

## Rollback e limites

O rollback seguro é selecionar `CVG_WORKER_RUNTIME=published-agent` somente em
fixture controlada compatível, ou remover o adapter do frontier. Não há
rollback destrutivo de migration nem alteração de banco compartilhado. A
qualificação desta task pode resultar no máximo em
`CONTROLLED_MVP_READY`; não altera `G_EXTERNAL`, `G_HUMAN`, D04, RF-011,
homologação ou autorização de produção.
