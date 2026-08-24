# 0106 — Contratos de Aplicacao

## Comandos

### `ReceiveInboundMessage`

- Input: channel, externalMessageId, senderRef, body, receivedAt.
- Output: conversationId, sessionId, messageId, accepted.
- Validacoes: deduplicacao por canal e mensagem externa.
- Erros: duplicate_message, invalid_channel, empty_body.

### `RunAgentTurn`

- Input: sessionId, triggerMessageId, autonomyLevel.
- Output: agentRunId, nextState, proposedActions.
- Validacoes: sessao ativa, policy disponivel.
- Erros: session_not_found, policy_unavailable, workflow_failed.

### `ExecuteTool`

- Input: agentRunId, toolName, payload, idempotencyKey.
- Output: toolCallId, status, result.
- Validacoes: tool registrada, payload valido, policy permite.
- Erros: tool_not_found, validation_failed, action_requires_approval.

### `RequestHumanApproval`

- Input: sessionId, proposedAction, summary, riskLevel.
- Output: approvalRequestId, status.
- Validacoes: acao sensivel, resumo presente.
- Erros: invalid_action, missing_summary.

### `ResolveApproval`

- Input: approvalRequestId, decision, operatorId, note.
- Output: status, decidedAt.
- Validacoes: request pendente, operador autorizado.
- Erros: approval_not_pending, operator_not_allowed.

### `CreateInternalTask`

- Input: sessionId, title, description, priority, source.
- Output: taskId, status.
- Validacoes: titulo e origem.
- Erros: invalid_priority, missing_context.

### `CreateHandoffSummary`

- Input: sessionId, reason.
- Output: handoffEventId, summary.
- Validacoes: sessao com contexto minimo.
- Erros: insufficient_context.

## Queries

- `GetConversationTimeline`
- `ListApprovalQueue`
- `ListInternalTasks`
- `GetAgentRunDetails`
- `GetAuditTrail`
- `SearchContacts`
- `SearchPatientLinks`

## Idempotencia

Comandos de mensagem, tool call, task e approval devem aceitar idempotency key ou chave natural para evitar duplicidade.
