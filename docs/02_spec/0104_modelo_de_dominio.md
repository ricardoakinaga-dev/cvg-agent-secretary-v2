# 0104 — Modelo de Dominio

## Entidades

- Conversation: agrupamento de mensagens por canal e contato.
- Message: mensagem recebida ou enviada.
- Session: janela operacional de atendimento.
- AgentRun: execucao do agente em uma sessao.
- ToolCall: chamada de tool com status e resultado.
- ApprovalRequest: solicitacao de decisao humana.
- HandoffEvent: evento de transferencia para humano.
- Task: tarefa interna derivada de conversa.
- Contact: tutor ou contato conhecido.
- PatientLink: vinculo entre contato e pet.
- MemoryFact: fato aprovado para memoria.
- SafetyEvent: bloqueio, risco ou politica aplicada.
- IntegrationEvent: evento de integracao externa.

## Value objects

- ConversationId
- SessionId
- ContactId
- PatientId
- CorrelationId
- ChannelRef
- Intent
- RiskLevel
- AutonomyLevel
- ToolName
- ApprovalDecision
- TaskPriority
- IntegrationProvider

## Agregados

- Conversation Aggregate: Conversation, Message e Session.
- AgentExecution Aggregate: AgentRun e ToolCall.
- Approval Aggregate: ApprovalRequest e HandoffEvent.
- Task Aggregate: Task e vinculos operacionais.
- Audit Aggregate: SafetyEvent e IntegrationEvent.

## Relacionamentos

- Conversation possui muitas Messages e Sessions.
- Session possui muitos AgentRuns.
- AgentRun possui muitos ToolCalls.
- ApprovalRequest pertence a Session e pode gerar HandoffEvent.
- Task pode nascer de Session, ApprovalRequest ou HandoffEvent.
- MemoryFact pode referenciar Contact, PatientLink ou Conversation.

## Invariantes

- Toda Message pertence a uma Conversation.
- Toda Session pertence a uma Conversation.
- Toda ToolCall pertence a um AgentRun.
- Toda acao sensivel exige decisao de Policy antes da execucao.
- Toda ApprovalRequest deve terminar em approved, rejected, expired ou assumed.
- Toda HandoffEvent deve conter resumo minimo.
- SafetyEvent nao pode ser apagado.

## Limites de alteracao de estado

- Conversation pode ser aberta, ativa, aguardando humano, resolvida ou arquivada.
- ApprovalRequest so pode sair de pending para approved, rejected, expired ou assumed.
- Task so pode sair de open para in_progress, done ou canceled.
- Mensagens e tool calls sao append-only para auditoria.
