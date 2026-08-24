export interface ConversationsPanelProps {
  conversations: Array<{
    id: string
    channel: string
    senderRef: string
    status: string
    openSessionId: string | null
    lastMessageBody: string | null
  }>
  selectedConversationId: string | null
  messages: Array<{ id: string; direction: string; body: string }>
  error?: string | null
  isLoading?: boolean
  isTimelineLoading?: boolean
  onSelectConversation: (
    conversation: ConversationsPanelProps['conversations'][number]
  ) => void
}

export function ConversationsPanel({
  conversations,
  selectedConversationId,
  messages,
  error = null,
  isLoading = false,
  isTimelineLoading = false,
  onSelectConversation
}: ConversationsPanelProps) {
  return (
    <section className="panel" aria-labelledby="conversations-title">
      <header className="panelHeader">
        <h2 id="conversations-title">Conversas</h2>
        <span className="counter">{conversations.length}</span>
      </header>
      <div className="list">
        {isLoading ? <p className="state">Carregando...</p> : null}
        {!isLoading && error ? (
          <p className="state stateError">{error}</p>
        ) : null}
        {!isLoading && !error && conversations.length === 0 ? (
          <p className="state">Nenhuma conversa carregada.</p>
        ) : null}
        {!isLoading && !error
          ? conversations.map((conversation) => (
              <button
                className={
                  conversation.id === selectedConversationId
                    ? 'row rowButton rowSelected'
                    : 'row rowButton'
                }
                key={conversation.id}
                type="button"
                onClick={() => onSelectConversation(conversation)}
              >
                <strong>{conversation.senderRef}</strong>
                <span>
                  {conversation.channel} / {conversation.status}
                </span>
                <span>{conversation.lastMessageBody ?? 'Sem mensagens'}</span>
              </button>
            ))
          : null}
        {!isLoading && !error && conversations.length > 0 ? (
          <div className="timeline" aria-label="Timeline selecionada">
            {isTimelineLoading ? <p className="state">Carregando...</p> : null}
            {!isTimelineLoading && messages.length === 0 ? (
              <p className="state">Nenhuma mensagem na conversa.</p>
            ) : null}
            {!isTimelineLoading
              ? messages.map((message) => (
                  <article className="row rowCompact" key={message.id}>
                    <strong>{message.direction}</strong>
                    <span>{message.body}</span>
                  </article>
                ))
              : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}
