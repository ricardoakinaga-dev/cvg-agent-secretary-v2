# AUD20-21 — Auditoria completa de produção e correção de bugs — 2026-09-27

- Rodada: `AUD20-21`, autorizada pelo usuário ("auditoria completa, corrigir e
  deixar funcional para produção, qualidade TripleAAA").
- Escopo: rotas HTTP da API, worker/outbox, persistence/Postgres, frontend,
  shutdown/observabilidade, contrato de erro; correção dos defeitos P1
  verificados e reexecução de todos os gates locais sob Node `22.23.2`.
- Baseline de entrada: suíte `307` arquivos / `2.673` testes PASS / `192` skips
  (`0` falhas); typecheck, lint, Prettier, `npm audit` (`0` vulnerabilidades)
  PASS. A única falha inicial de gate era ambiental: `docs:check` sob Node
  `v24.20.0` acusa `node_runtime_mismatch` (runtime pinado é `22.23.2`).
- Nenhum dado real, efeito externo, commit, push ou deploy. Staging/produção
  permanecem `NO_GO`.

## Método

1. Reexecução dos gates de entrada (typecheck, lint, Prettier, `npm audit`,
   suíte integral) sob o runtime pinado.
2. Varredura estática das 72 rotas registradas em `apps/api/src/server.ts`,
   cruzando cada caminho do cliente web (`apps/web/src/api/client.ts`) contra as
   rotas do servidor: **0 rotas ausentes** e **0 rotas de servidor sem
   consumidor** no cruzamento.
3. Auditoria dirigida de `apps/worker/src/**` e `packages/persistence/src/**`
   (outbox/lease/CAS/SQL/transações/shutdown) e dos módulos de borda HTTP
   (identidade, webhook, rate limit, request-context).
4. Verificação manual de cada achado candidato antes da correção; achados não
   confirmados foram descartados.
5. Correção mínima dos defeitos P1 confirmados, com teste de regressão quando
   aplicável, e reexecução de gates + gate PostgreSQL descartável.

## Achados e disposição

### Corrigidos (P1)

| #   | Achado                                                                                                                                                                                                                                                                                                              | Onde                                                      | Correção                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1   | Sinal repetido durante o drain encerra o processo pelo comportamento default do SO, porque `once` remove o listener após o primeiro sinal (a docstring prometia "repeated signals are ignored").                                                                                                                        | `packages/shared/src/lifecycle.ts:91`                     | `once` → `on`; interface `SignalSource` e fakes atualizados; teste de regressão de sinal repetido.                           |
| 2   | `pool.end()` chamado duas vezes no worker controlado run-once (shutdown + `finally`), virando `worker.controlled_failed` intermitente num shutdown limpo.                                                                                                                                                            | `apps/worker/src/main.ts:149,193`                         | Guard idempotente `closePool()` compartilhado entre shutdown e `finally`.                                                    |
| 3   | Pool do worker sem `max` (default 10) e sem `connectionTimeoutMillis`: com concorrência ≥ 6 o `ack` esgota o pool, o heartbeat fica enfileirado para sempre, o lease expira e o efeito pode rodar duas vezes.                                                                                                          | `apps/worker/src/postgres-controlled.ts:182`              | `max = min(32, 2×concorrência+4)` (`resolveWorkerPoolMax`) e `connectionTimeoutMillis = 5_000` (falha rápida em vez de pendurar). |
| 4   | `health.markReady()` roda depois de `worker.start()`: falha ao escrever o readiness file deixa worker zumbi consumindo a fila sem nunca ficar pronto.                                                                                                                                                                | `apps/worker/src/main.ts:252`                             | `try/catch` que para o worker e encerra o pool antes de propagar a falha.                                                     |
| 5   | `stop()` retornava `released`/`releaseFailed` constantes `0`, mascarando o descarte de claims e falhas de liberação no shutdown.                                                                                                                                                                                      | `apps/worker/src/continuous-worker.ts:628`                | Retorna `counters.released` real e incrementa `releaseFailedCount` no caminho de falha do descarte.                          |
| 6   | `sweeps.stop()` aguardava o tick corrente sem limite: um tick travado bloqueia o shutdown até o timeout global.                                                                                                                                                                                                      | `apps/worker/src/sweeps.ts:192`                           | `stopTimeoutMs` (default `5_000`) com `Promise.race` e log `worker.sweep_stop_timeout`.                                       |
| 7   | `ApprovalError` (approval-engine) atravessava `toSafeError` como erro desconhecido: aprovação inexistente virava **500** em vez de 404, `self_approval_denied` 500 em vez de 403 e `invalid_state` 500 em vez de 409.                                                                                                   | `packages/shared/src/errors.ts:44`                        | Mapa estrutural `ApprovalError.code` → `ErrorCode` público (`not_found`/`forbidden`/`conflict`/`validation_failed`), sem criar ciclo shared→approval-engine; teste dedicado. |
| 8   | Validações de capability approval lançavam `Error` cru (nonce duplicado, expiry, binding, issuer=executor, data inválida): input inválido do cliente virava 500.                                                                                                                                                       | `packages/platform/src/approval-authority.ts:125-141` e `packages/persistence/src/platform-approval-repository.ts:92,279-285,380` | `DomainError('validation_failed' \| 'conflict', ...)` preservando as mensagens (400/409 em vez de 500).                        |
| 9   | Falha do commit de replay do webhook lançava `Error` **depois** de a mensagem já ter sido aceita/auditada: o remetente recebia 500 e reenviava uma entrega concluída.                                                                                                                                                  | `apps/api/src/webhook-security.ts:274`                    | Commit best-effort: a reserva expira em `expiresAtMs` e a deduplicação por idempotency key cobre o reenvio; teste ajustado.  |
| 10  | `PATCH /v1/tasks/:taskId/status` fazia read-check-write sem CAS: dois writers concorrentes podiam aplicar transições inválidas (ex.: reabrir tarefa cancelada).                                                                                                                                                        | `apps/api/src/server.ts:1194`, `packages/persistence/src/postgres.ts:2809`, `repositories/task-repository.ts:70`, `tenant-scoped-postgres.ts:537` | `expectedStatus` opcional com UPDATE condicional (`AND tasks.status = COALESCE($3::text, tasks.status)`); corrida perdida agora é `409 conflict`; testes em memória e Postgres real. |
| 11  | Round-trip no-op no ack: o outbox relia `outbox_effects.result` com `FOR UPDATE`, revalidava e regravava os mesmos bytes na mesma transação (P3 da varredura).                                                                                                                                                        | `packages/persistence/src/postgres.ts:706-730`           | Removido o `UPDATE` no-op; a validação/INSERT original permanece. Ganho de performance no caminho de ack e linha devolvida ao cap congelado do hotspot (`postgres.ts` ≤ 3441). |

### Verificados e descartados (sem correção)

- **Rotas**: todas as rotas do cliente web existem no servidor (4 falsos
  positivos de query string conferidos manualmente: `catalog${query}`,
  `release-candidates${query}`, `suites${query}`, `patients/search${suffix}`).
- **Autenticação**: nenhuma rota mutante sem `requireIdentity`; identidade
  confiável falha em 401 (não 500) por envolver qualquer erro não-domínio em
  `DomainError('unauthorized')`; webhook com assinatura inválida retorna 401.
- **SQL**: sem injeção — identificadores dinâmicos validados por regex
  (`retention.ts`, `postgres-controlled.ts`) e demais `${}` são constantes.
- **Lease/ack**: `claimNext` com `FOR UPDATE SKIP LOCKED`, heartbeat sem rotação
  de token e CAS final com fencing de `lease_until` estão corretos.
- **Frontend**: 45 caminhos do cliente casam com rotas registradas; `apps/web`
  sem chamadas a rotas inexistentes.

### Não corrigidos nesta rodada (documentados)

| Severidade | Achado                                                                                                                                                    | Motivo de não corrigir agora                                                                                             |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| P1         | `GET /v1/orchestration/goals/:goalId` faz fan-out N+1 sem LIMIT (`server.ts:1435-1472`).                                                                    | Exige revisão de contrato/repositório; registrado como item próprio (não é defeito de correção local segura).            |
| P1         | Listas sem `LIMIT` (`listTasks`, `listApprovals`, `listAuditBySession`, drafts) — risco de payload ilimitado.                                              | Mudança de contrato com paginação; requer decisão de produto/API e atualização de clientes e testes.                     |
| P2         | Journal de efeito é descartado no rollback quando o CAS final perde o lease (`postgres.ts:689-755`), permitindo reexecução.                                | Correção exige journal em transação própria antes do CAS — mudança sensível de outbox; requer recertificação dedicada.  |
| P2         | `P2-7..P2-11` da varredura do worker (ROLLBACK manual mascarando erro original, métricas fora de ordem, dead-letter por SIGTERM).                          | Backlog de hardening; sem impacto P0 comprovado no perfil `externalEffects:false`.                                       |
| P3         | Código morto (`tool-invocation-boundary.ts`, asserts sem chamadores), `access-control-allow-headers` sem `authorization`, etc.                            | Débito de limpeza; não afeta o caminho de produção.                                                                      |

## Verificação executada

- Tipo/lint/format/documentação: `typecheck`, `lint`, Prettier e `docs:check`
  PASS sob Node `22.23.2`.
- Suíte integral: `307` arquivos PASS / `2.675` testes PASS / `192` skips /
  `0` falhas.
- Cobertura (`npm run test:coverage`): statements `92,93%`, branches `90,13%`,
  functions `91,21%`, lines `93,43%` — acima dos pisos AAA de 90%.
- Gates PostgreSQL descartável (`postgres:16-alpine`, loopback, senha
  throwaway, containers removidos ao final): `npm run test:postgres` executado
  duas vezes (após as correções e novamente após a forma final do CAS e a
  remoção do `UPDATE` no-op) → `30/30` arquivos, `354/354` testes, `0` skips,
  exit `0` nas duas execuções. Resíduos do runner: `3` papéis e `0` schemas no
  catálogo antes do teardown (mesmo P2 já registrado do runner de testes não
  aplicar `DROP ROLE`).
- E2E Playwright (`npx playwright test`, chromium + firefox + webkit):
  `75/75` PASS; servidores dev encerrados ao final.
- `npm audit --audit-level=high`: `0` vulnerabilidades.
- Regressões adicionadas: sinal repetido no shutdown, mapeamento
  `ApprovalError`, CAS de status (memória + Postgres real).
- Caps de arquitetura preservados: `tests/architecture.test.js` PASS
  (`server.ts` 4.583 ≤ 4.708; agregado 5.049 ≤ 5.050; `postgres.ts` 3.438 ≤
  3.441) — o CAS foi implementado na forma mais curta e o `UPDATE` no-op pago
  como redução de linha.

## Limitações

- Auditoria estática + gates locais; nenhum teste de carga, sessão humana,
  provider externo, canal real, RAG institucional ou ambiente de staging.
- A varredura cobre as superfícies de entrada (API/worker/persistence); não
  substitui a recertificação Phase 11 do candidato final.
- Staging/produção continuam `NO_GO`; a liberação exige os 8 gates
  externos/humanos conforme `certification/current.json`.
