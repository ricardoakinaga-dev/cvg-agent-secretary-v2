# 0110 — Consistencia, Integridade e Migracoes

## Regras de integridade

- `messages.conversation_id` obrigatorio.
- `sessions.conversation_id` obrigatorio.
- `agent_runs.session_id` obrigatorio.
- `tool_calls.agent_run_id` obrigatorio.
- `approval_requests.session_id` obrigatorio.
- `handoff_events.session_id` obrigatorio.
- `tasks.source_ref` obrigatorio.
- `safety_events.correlation_id` obrigatorio.

## Campos criticos

- `correlation_id`
- `idempotency_key`
- `status`
- `created_at`
- `updated_at`
- `decided_at`
- `workflow_version`
- `policy_version`
- `tool_name`
- `integration_provider`

## Nulabilidade conceitual

- Message pode nao ter contactId no inicio.
- PatientLink pode ser nulo ate identificacao.
- Approval decision e nula enquanto request estiver pending.
- Integration result pode ser nulo em falha.

## Estrategia de migracao

- Migracoes pequenas e reversiveis quando possivel.
- Backfill explicito para campos obrigatorios novos.
- Compatibilidade de leitura para eventos antigos.
- Seeds apenas para configuracao operacional minima, nunca para dados reais de tutor.

## Compatibilidade

- Backward compatibility para leitores do painel.
- Forward compatibility por campos extras ignoraveis nos payloads.
- Versionamento de contratos de tool quando output mudar.
