# REM-0539 R2 — Contratos de processamento durável

Estado: `SPEC_APPROVED_CONTROLLED_BUILD`; deriva da Discovery 0012 e do PRD 0023. REM-08 foi fechada com PostgreSQL local; a solicitação explícita do usuário registra a revisão humana para BUILD controlado. Nenhuma integração externa ou operação real é autorizada.

## Modelo de evento

O contrato lógico de `OutboxEventRecord` deve evoluir sem quebrar fixtures existentes para incluir `tenantId`, `correlationId`, `idempotencyKey`, `envelopeVersion`, `conversationId`, `sessionId`, `agentId`, `agentVersionId`, `inboundMessageId`, `availableAt`, `attempts`, `leaseOwner`, `leaseUntil`, `lastError`, `processedAt`, `deadLetteredAt` e `parentEventId`. Estados permitidos: `pending`, `processing`, `processed`, `failed`, `dead_letter`. `failed` significa retry agendado e sempre tem `availableAt`; `dead_letter` é terminal. Campos de lease e resultado são escritos pelo repositório, nunca aceitos como autoridade do caller.

O envelope mínimo é `{ eventId, tenantId, type, envelopeVersion, correlationId, idempotencyKey, conversationId, sessionId, agentId, agentVersionId, inboundMessageId, payload }`. O payload é validado por tipo, limitado em tamanho e redigido na observabilidade. Um evento original nunca é apagado para “limpar” retry ou dead-letter.

O banco mantém uma restrição única `(tenant_id, idempotency_key)` em `outbox_events` e um journal `outbox_effects(tenant_id, idempotency_key, event_id, result, applied_at)` com a mesma chave. `enqueue` consulta essa chave e devolve o evento existente; não insere uma segunda intenção. O journal registra o resultado do handler local antes de permitir nova observação de sucesso. O reprocessamento de dead-letter reutiliza o mesmo evento e a mesma chave, em-place; não cria uma segunda linha que viole a unicidade. `parentEventId` só é preenchido quando uma migração ou comando futuro criar uma nova intenção com chave deliberadamente diferente.

## Operações de persistência

1. `enqueue({ tenantId, ...input }, tx?)`: aplica a unicidade por tenant/chave idempotente, cria evento com `pending`/`availableAt=now` e retorna o existente em duplicata; a chamada inbound deve incluir mensagem, efeito de aceite e outbox no mesmo commit quando houver banco transacional.
2. `claimNext({ tenantId, workerId, now, leaseMs })`: em uma transação tenant-scoped, seleciona evento elegível (`pending`, `failed` disponível ou `processing` expirado), usa `WHERE tenant_id = $tenant` e `FOR UPDATE SKIP LOCKED`, incrementa attempts e grava lease; retorna `null` quando não há trabalho.
3. `ack({ tenantId, eventId, workerId, effect, result, now })`: exige `WHERE tenant_id = $tenant`, lease vigente do mesmo worker e autorização do tenant; executa o único handler local recebido como operação `effect` dentro da transação de persistência, faz `INSERT ... ON CONFLICT DO NOTHING` no journal de efeito, grava resultado/audit e muda para `processed` na mesma transação. Se a escrita do efeito não for transacional, ela não pertence ao contrato R2 e o evento permanece retryable.
4. `fail({ tenantId, eventId, workerId, error, now })`: exige ownership tenant-scoped, redige erro e calcula o próximo estado a partir de configuração autoritativa (`maxAttempts=5`, backoff bounded e relógio do repositório). Vai para `failed` com `availableAt` enquanto houver tentativas; excedido o limite ou erro terminal, vai para `dead_letter`. O caller não fornece `retryAt` nem altera attempts.
5. `requeueDeadLetter({ tenantId, eventId, operatorId, correlationId })`: comando explícito, autorizado no tenant e auditado; preserva o evento e os registros em `outbox_attempts`, limpa o lease e retorna o mesmo id para `pending` com a mesma chave idempotente. Não cria uma segunda linha; `parentEventId` permanece nulo no fluxo normal.

## Invariantes

- `tenantId` do evento, sessão, mensagem, auditoria, comando e conexão é o mesmo; payload não pode mudar ownership. `claim`, `ack`, `fail` e `requeueDeadLetter` exigem tenant explícito e filtros de tenant no SQL.
- Um lease válido possui exatamente um `leaseOwner`; lease expirado pode ser retomado, mas a tentativa anterior permanece auditável.
- `processed` exige `processedAt`, resultado persistido e linha no journal; `failed` exige `availableAt` futuro e attempts dentro do limite; `dead_letter` exige causa redigida e `attempts > 0`.
- Cada claim cria uma linha em `outbox_attempts(event_id, attempt, tenant_id, worker_id, claimed_at, outcome, error)`; requeue in-place acrescenta histórico sem apagar tentativas anteriores.
- `ack`, efeito local transacional, journal e auditoria são atômicos; se a auditoria ou o journal falhar, nenhum estado terminal é confirmado.
- Uma chave idempotente não produz dois efeitos locais, mesmo após crash entre efeito e ack; o executor consulta o journal durável antes de repetir. Efeitos não transacionais ficam fora do aceite R2.
- Takeover humano vence qualquer resposta automática ainda não confirmada; o worker encerra como handoff sem enviar resposta.

## Matriz de falhas obrigatória

| Ponto da falha                    | Estado esperado                                                                | Próxima ação                         |
| --------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------ |
| Antes do commit de inbound/outbox | nenhuma mensagem aceita                                                        | retry seguro do aceite               |
| Depois do commit e antes do claim | `pending`                                                                      | claim após reinício                  |
| Durante execução antes do efeito  | `processing` até lease expirar                                                 | novo worker retoma                   |
| Depois do efeito antes do ack     | journal local idempotente registrado na transação ou evento continua retryable | retry consulta journal e não duplica |
| Depois do ack                     | `processed` + resultado + audit                                                | nenhuma nova execução                |
| Falha terminal/limite             | `dead_letter` + audit                                                          | reprocessamento explícito            |
| Takeover durante execução         | handoff + sem outbound automático                                              | operador assume                      |

## Adapter e worker

O worker recebe uma interface `DurableOutboxAdapter` injetável. O adapter em memória serve somente para testes determinísticos e deve implementar as mesmas invariantes. O adapter PostgreSQL usa conexão retirada do pool por transação; `pool.query` não é suficiente para `BEGIN/COMMIT`. A configuração seleciona explicitamente o adapter e falha fechada se o ambiente declarar persistência sem implementação.

`processOutboxEvent` deixa de fabricar `processed`: ele deve reivindicar o evento e delegar a operação `effect` exatamente uma vez ao `ack` transacional; não executa o handler antes nem depois de `ack`. O `ack` persiste resultado, emite auditoria e encerra a transação; falhas passam por `fail`. Handlers desconhecidos são falhas terminais redigidas. Nenhum handler envia para provider/canal real.

## Migração e compatibilidade

Adicionar migração aditiva versionada somente após o gate. Colunas legadas recebem defaults seguros; `attempts` ausente recebe `0` antes da classificação e recebe `1` ao marcar um evento como `dead_letter`, satisfazendo o invariante sem inventar uma entrega. Eventos antigos sem tenant são rejeitados/quarentenados pelo isolamento existente. Antes de exigir os novos invariantes, a migração copia para `outbox_quarantine(event_id, tenant_id, reason, captured_at)` qualquer `processed` sem linha em `outbox_effects` (`legacy_processed_without_effect_journal`) e qualquer `failed` sem `available_at` (`legacy_failed_without_retry_time`), define `attempts = GREATEST(COALESCE(attempts, 0), 1)`, marca o evento original como `dead_letter` com causa redigida e emite auditoria. Nenhum evento é apagado. A migração inclui unicidade `(tenant_id, idempotency_key)`, `outbox_effects`, `outbox_attempts` e índice em `(tenant_id, status, available_at)`. O smoke deve verificar ownership, journal, quarentena e a ausência de alterações destrutivas.

## Observabilidade e testes

Testes obrigatórios: memória, PostgreSQL com duas conexões, unicidade e journal de idempotência, expiração de lease, retry/backoff com cinco tentativas e relógio injetado, dead-letter/requeue, crash failpoints, tenant negativo, pinning, takeover e contrato API inbound. Logs usam correlationId/eventId/workerId e contagens; nenhum payload bruto. Antes do audit R2, executar typecheck, lint, format, suíte integrada, `test:postgres`, worker smoke, readiness e diff check.

## Gate SPEC

`SPEC_APPROVED_CONTROLLED_BUILD`: o contrato está aprovado para REM-10/11/12 em fixtures e PostgreSQL local, com evidência específica e sem promessa de exactly-once externo. A evidência deve distinguir cada teste executado de qualquer prontidão de integração externa.
