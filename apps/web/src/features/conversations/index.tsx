import { formatStatus, formatTimestamp } from '../../ui/formatters.ts'

export interface ConversationsPanelProps {
  conversations: Array<{
    id: string
    channel: string
    senderRef: string
    status: string
    openSessionId: string | null
    lastMessageBody: string | null
    correlationId?: string
    lastMessageAt?: string | null
    updatedAt?: string
  }>
  selectedConversationId: string | null
  messages: Array<{
    id: string
    direction: string
    body: string
    createdAt?: string
  }>
  error?: string | null
  isLoading?: boolean
  isTimelineLoading?: boolean
  onRetry?: () => void
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
  onRetry,
  onSelectConversation
}: ConversationsPanelProps) {
  const selectedConversation = conversations.find(
    (conversation) => conversation.id === selectedConversationId
  )

  return (
    <section className="panel" aria-labelledby="conversations-title">
      <header className="panelHeader">
        <div>
          <h2 id="conversations-title">Conversas</h2>
          <p>Contexto por canal, sessao e correlation para cada atendimento.</p>
        </div>
        <span
          className="counter"
          aria-label={`${conversations.length} conversas`}
        >
          {conversations.length}
        </span>
      </header>
      <div className="list">
        {isLoading ? (
          <p className="state" role="status">
            Carregando...
          </p>
        ) : null}
        {!isLoading && error ? (
          <div className="stateErrorBlock">
            <p className="state stateError" role="alert">
              {error}
            </p>
            {onRetry ? (
              <button
                className="stateRetry"
                type="button"
                onClick={onRetry}
                aria-label="Tentar novamente carregar conversas"
              >
                Tentar novamente
              </button>
            ) : null}
          </div>
        ) : null}
        {!isLoading && !error && conversations.length === 0 ? (
          <p className="state" role="status">
            Nenhuma conversa carregada.
          </p>
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
                aria-pressed={conversation.id === selectedConversationId}
                aria-label={[
                  conversation.senderRef,
                  conversation.channel,
                  formatStatus(conversation.status),
                  conversation.correlationId
                    ? `correlation ${conversation.correlationId}`
                    : null
                ]
                  .filter((value): value is string => Boolean(value))
                  .join(', ')}
                onClick={() => onSelectConversation(conversation)}
              >
                <div className="recordTitle">
                  <strong>{conversation.senderRef}</strong>
                  <span
                    className="stateBadge"
                    data-status={conversation.status}
                  >
                    {formatStatus(conversation.status)}
                  </span>
                </div>
                <span className="recordStatus">
                  {conversation.channel} / {conversation.status}
                </span>
                <span className="recordSummary">
                  {conversation.lastMessageBody ?? 'Sem mensagens'}
                </span>
                <dl className="recordMeta">
                  {conversation.openSessionId ? (
                    <div>
                      <dt>Sessao</dt>
                      <dd>
                        <code>{conversation.openSessionId}</code>
                      </dd>
                    </div>
                  ) : null}
                  {conversation.correlationId ? (
                    <div>
                      <dt>Correlation</dt>
                      <dd>
                        <code>{conversation.correlationId}</code>
                      </dd>
                    </div>
                  ) : null}
                  {formatTimestamp(
                    conversation.lastMessageAt ?? conversation.updatedAt
                  ) ? (
                    <div>
                      <dt>Atualizada</dt>
                      <dd>
                        <time
                          dateTime={
                            conversation.lastMessageAt ?? conversation.updatedAt
                          }
                        >
                          {formatTimestamp(
                            conversation.lastMessageAt ?? conversation.updatedAt
                          )}
                        </time>
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </button>
            ))
          : null}
        {!isLoading && !error && conversations.length > 0 ? (
          <div className="timeline" aria-label="Timeline selecionada">
            {selectedConversation ? (
              <div
                className="selectionContext"
                aria-label="Contexto da conversa selecionada"
              >
                <span>Atendimento selecionado</span>
                <code>
                  {selectedConversation.openSessionId ?? 'Sessao indisponivel'}
                </code>
              </div>
            ) : null}
            {isTimelineLoading ? (
              <p className="state" role="status">
                Carregando...
              </p>
            ) : null}
            {!isTimelineLoading && messages.length === 0 ? (
              <p className="state">Nenhuma mensagem na conversa.</p>
            ) : null}
            {!isTimelineLoading
              ? messages.map((message) => (
                  <article className="row rowCompact" key={message.id}>
                    <div className="recordTitle">
                      <strong>{message.direction}</strong>
                      {message.createdAt ? (
                        <time dateTime={message.createdAt}>
                          {formatTimestamp(message.createdAt)}
                        </time>
                      ) : null}
                    </div>
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
