# 0416 — Data Integrity Audit

## Validacoes

- Toda message pertence a conversation.
- Toda session pertence a conversation.
- Toda tool call pertence a agent run.
- Todo approval pertence a session.
- Todo handoff contem resumo.
- Todo safety event possui correlation id.
- Idempotency keys evitam duplicidade.

## Dados orfaos a procurar

- Message sem conversation.
- AgentRun sem session.
- ToolCall sem agentRun.
- Task sem origem.
- Approval pendente expirado sem status final.

## Dados invalidos a procurar

- Status fora da maquina de estados.
- Decision sem operador.
- ToolCall concluida sem resultado ou erro.
- Handoff sem motivo.

## Status atual

Aguardando banco e dados reais.
