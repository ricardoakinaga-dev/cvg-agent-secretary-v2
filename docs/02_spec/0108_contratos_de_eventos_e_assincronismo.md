# 0108 — Contratos de Eventos e Assincronismo

## Eventos emitidos

- `message.received`
- `session.created`
- `intent.classified`
- `tool.call.requested`
- `tool.call.completed`
- `tool.call.failed`
- `policy.action.blocked`
- `approval.requested`
- `approval.resolved`
- `handoff.created`
- `task.created`
- `integration.failed`
- `safety.event.created`

## Consumidores

- Worker de workflows.
- Worker de integracoes.
- Auditoria.
- Painel web em tempo quase real.
- Notificador de operadores.

## Garantias minimas

- Eventos criticos devem ser persistidos antes de processamento externo.
- Consumidores devem ser idempotentes.
- Falhas externas devem gerar `integration.failed`.

## Retry

- Retry com backoff para integracoes temporariamente indisponiveis.
- Nao repetir acao sensivel se idempotency key indicar execucao anterior.
- Apos limite de retry, criar tarefa ou handoff.

## DLQ e reprocessamento conceitual

Eventos que falham repetidamente devem ir para fila de revisao operacional com motivo, payload seguro e correlation id.
