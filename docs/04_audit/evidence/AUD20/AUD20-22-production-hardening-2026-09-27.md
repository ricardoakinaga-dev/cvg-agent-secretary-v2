# AUD20-22 — Hardening de produção (P1/P2 remanescentes) — 2026-09-27

- Rodada: `AUD20-22`, continuação autorizada da `AUD20-21` ("continuar até
  pronto para produção").
- Escopo: journal de efeito em perda de lease, tolerância a falhas
  transitórias de heartbeat, `ROLLBACK` que mascarava o erro original, fan-out
  N+1 do detalhe de Goal e listas sem limite; reexecução integral dos gates
  locais e do gate PostgreSQL descartável.
- Nenhum dado real, efeito externo, commit, push ou deploy. Staging/produção
  permanecem `NO_GO`.

## Correções aplicadas

| #   | Achado                                                                                                                                                                                                                                        | Onde                                                                                                                              | Correção e evidência                                                                                                                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Journal de efeito descartado na perda de lease (P1)**: o `INSERT` do journal acontecia dentro da transação do CAS final; se o lease expirasse/perdesse, o rollback apagava o journal e o retry **reexecutava o efeito**.                       | `packages/persistence/src/postgres.ts` (ack)                                                                                      | O journal passa a ser commitado em transação própria **antes** do CAS final; o retry encontra `hasJournal` e não reexecuta. Teste novo em `outbox-durability.test.ts` (lease expira durante o efeito; journal preservado, efeito roda 1×). 3 testes que fixavam o comportamento antigo foram atualizados para a semântica correta. |
| 2   | **Heartbeat transitório virava perda de lease (P2)**: qualquer `throw` no renew marcava `leaseLost`, abortava a tentativa e queimava um retry, mesmo em falha de infraestrutura (pool/rede).                                                   | `apps/worker/src/continuous-worker.ts`                                                                                            | `WORKER_HEARTBEAT_MAX_FAILURES = 3`: só a 3ª falha consecutiva declara a perda; renew retornando `false` (lease realmente negado) continua imediato. Teste novo: 2 throws seguidos não perdem o lease e o evento processa. |
| 3   | **`ROLLBACK` mascarava o erro original (P2)**: em 19 pontos o rollback de um `catch` podia falhar (conexão quebrada) e substituir a causa raiz antes do rethrow.                                                                                | `postgres.ts` (8), `postgres/migrations.ts` (3), `platform-approval-repository.ts` (1), `platform-control-plane-repository.ts` (7) | `await client.query('ROLLBACK').catch(() => undefined)` em todos os pontos, preservando o erro original (mesmo padrão já usado em `withOutboxTransaction`).                                                          |
| 4   | **Fan-out N+1 no detalhe de Goal (P1)**: `GET /v1/orchestration/goals/:goalId` fazia 1 query por plano e 1 por step.                                                                                                                          | `packages/agent-runtime/src/orchestration.ts` (porta), `packages/persistence/src/orchestrator-postgres.ts`, `apps/api/src/orchestration-observability.ts`, `apps/api/src/server.ts` | Métodos bulk opcionais `listStepsByPlan`/`listAttemptsByStep` (memória + PostgreSQL com `= ANY($2::text[])`, escopo de tenant preservado); o loader usa bulk com fallback. Teste novo PostgreSQL de bulk/tenant. |
| 5   | **Listas sem limite (P1)**: `GET /v1/tasks`, `GET /v1/approvals`, `GET /v1/audit/sessions/:id` e drafts retornavam linhas sem teto.                                                                                                             | `packages/persistence/src/list-limits.ts` (novo), `postgres.ts`, `journeys-postgres.ts`, repositórios em memória e `journeys.ts`   | Teto `MAX_UNPAGINATED_LIST_ROWS = 500` em todas as leituras sem paginação (comportamento/expiração lazy preservados). Teste novo em memória (600 registros → 500). Paginação real permanece mudança de contrato própria. |

## Verificado e não corrigido (documentado)

| Severidade | Achado                                                                                                                                                                       | Disposição                                                                                                                                                             |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P2         | SIGTERM que descarta um claim recém-obtido pode levar a `dead_letter` sem nunca ter despachado o evento (o `claimNext` já incrementou `attempts` e `fail` aplica o limiar). | Correção exige um caminho de release no port do outbox (`releaseClaim`/flag no `fail`); é mudança de interface com recertificação própria. Regra de recuperação: operador usa `requeueDeadLetter` (visível, não silencioso). |
| P2         | Observabilidade da API (`runtimeCollector`, alertas em processo).                                                                                                            | O coletor é **harness-only por contrato** (`BuildServerOptions.runtimeCollector`); ligar sinks de produção exige SPEC e nova superfície de configuração — task própria. |
| P2         | Paginação real das listas de tasks/approvals/drafts.                                                                                                                          | O teto de 500 é mitigação; paginação muda o contrato da API e o cliente web.                                                                                            |

## Adjudicação da crítica independente (fresh-context) e remediação

A crítica independente do diff deu `PASS_WITH_FINDINGS` (nenhum P0/P1 provado).
Disposição de cada achado:

| Achado                                                                 | Disposição                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P2-1 trunca silenciosamente a trilha de auditoria sem sinalizar          | **Corrigido**: header `x-result-truncated: true` quando a leitura atinge o teto em `/v1/tasks`, `/v1/approvals` e `/v1/audit/sessions/:sessionId`; paginação real segue como task própria.                                              |
| P2-2 ramo do webhook em que `commit()` **lança** não era testado e a reserva ficava presa | **Corrigido**: no `catch` do commit a reserva é liberada (reenvio reconhecido como duplicado) e o teste cobre explicitamente o `throw` (além do retorno `false`).                                                                      |
| P2-3 falha de `markReady` deixaria o processo vivo                      | **Falso positivo verificado em runtime**: listeners de sinal não seguram o event loop (exit code 1 imediato em experimento isolado) e o servidor de health é `unref()`; worker parado + pool encerrado ⇒ processo encerra.               |
| P3-1 o teste fake de fronteira não provava a ordem journal-antes-do-CAS | **Corrigido**: o fake agora mantém a linha em `processing` até o CAS, tornando o ramo alcançável, e asserta `journaled === true` dentro do CAS (a ordem oposta falharia o teste).                                                        |
| P3-2 correções sem teste                                                | **Corrigido**: testes novos para `resolveWorkerPoolMax`, 3ª falha consecutiva de heartbeat, timeout do `sweeps.stop()` e fallback do loader (store sem bulk produz view idêntica).                                                       |
| P3-3 pool ignorava override explícito de tuning                         | **Corrigido**: `resolveWorkerPoolMax(env, concurrencyOverride)` e `createPostgresContinuousWorker` repassa `tuning.concurrency`.                                                                                                       |
| P3-4 hipótese de deadlock FK × CAS (takeover)                           | **Falso positivo**: o `INSERT` em `outbox_effects` adquire `FOR KEY SHARE` no evento (checagem de FK) antes de tocar a linha do journal; a transação do CAS adquire evento (`FOR UPDATE`) e depois journal — mesma ordem event→journal. |
| P3-5 caps                                                               | Conferidos com `wc -l` após a remediação: `server.ts` 4.570 ≤ 4.708; agregado 5.036 ≤ 5.050; `postgres.ts` 3.441 = 3.441.                                                                                                              |
| P3-6 rollback manual não destrói/liberá a conexão em falha              | Pré-existente ao diff; registrado no backlog como hardening.                                                                                                                                                                           |
| P3-7 detecção de perda de lease pode atrasar ~1 intervalo               | Trade-off intencional da tolerância a falhas transitórias; o CAS final continua fenced.                                                                                                                                                |
| P3-8 `ApprovalError` com código desconhecido → 409                      | Defensivo; os 17 códigos reais estão mapeados.                                                                                                                                                                                         |

## Observações de execução

- Uma execução do gate PostgreSQL sob contenção (suíte unitária rodando em
  paralelo) falhou de forma temporal em
  `channel-effect-journal-postgres.test.ts` ("marks an expired SENDING lease
  uncertain"): o teste passou isolado (`12/12`) e na reexecução completa —
  flakiness por relógio real sob carga, registrada para determinismo futuro.

## Verificação

- Estáticos: `typecheck`, `lint`, Prettier, `docs:check` e `build` PASS sob Node
  `22.23.2`; `tests/architecture.test.js` PASS com os caps preservados
  (`server.ts` 4.570 ≤ 4.708 / agregado 5.036 ≤ 5.050; `postgres.ts` 3.441 =
  3.441).
- Suíte integral (execução final, pós-crítica): `307` arquivos PASS /
  `2.681` testes PASS / `194` skips / `0` falhas.
- Cobertura (`npm run test:coverage`): statements `93,01%`, branches `90,18%`,
  functions `91,23%`, lines `93,49%` — acima dos pisos AAA de 90%.
- Gate PostgreSQL descartável (`postgres:16-alpine`, loopback, senha throwaway,
  container removido): `npm run test:postgres` → `30/30` arquivos, `356/356`
  testes, `0` skips, exit `0`. Resíduos do runner antes do teardown: `3` papéis,
  `0` schemas.
- E2E Playwright (chromium + firefox + webkit): `75/75` PASS.
- `npm audit --audit-level=high`: `0` vulnerabilidades (inalterado; nenhuma
  dependência adicionada).
- Crítica independente fresh-context: `PASS_WITH_FINDINGS`; achados P2/P3
  adjudicados acima (2 falsos positivos verificados, 5 corrigidos com teste).
- Testes novos/ajustados: journal em perda de lease (Postgres real), heartbeat
  transitório e fronteira da 3ª falha, bulk de steps/attempts por tenant
  (Postgres real), teto de listas (memória), fronteiras de commit do ack (fake
  client com prova de ordem), fallback do loader, tamanho do pool, timeout do
  sweep e ramo de exceção do commit de replay de webhook.
