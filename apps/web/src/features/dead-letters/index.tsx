import { useEffect, useRef } from 'react'
import {
  formatDiagnostic,
  formatStatus,
  formatTimestamp
} from '../../ui/formatters.ts'
import type { DeadLetterView } from '../../api/client.ts'

export interface DeadLettersPanelProps {
  deadLetters: DeadLetterView[]
  error?: string | null
  isLoading?: boolean
  actionId?: string | null
  canRequeue?: boolean
  message?: string | null
  messageTone?: 'success' | 'info' | 'error'
  onRetry?: () => void
  onRequeue?: (eventId: string) => void
}

export function DeadLettersPanel({
  deadLetters,
  error = null,
  isLoading = false,
  actionId = null,
  canRequeue = false,
  message = null,
  messageTone = 'info',
  onRetry,
  onRequeue
}: DeadLettersPanelProps) {
  const panelRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (message && !actionId) panelRef.current?.focus()
  }, [actionId, message])

  return (
    <section
      className="panel deadLetterPanel"
      id="dead-letters-panel"
      aria-labelledby="dead-letters-title"
      aria-busy={Boolean(actionId)}
      ref={panelRef}
      tabIndex={-1}
    >
      <header className="panelHeader">
        <div>
          <h2 id="dead-letters-title">Dead letters</h2>
          <p>
            Falhas terminais inspecionáveis; o payload fica fora do console.
          </p>
        </div>
        <span
          className="counter"
          aria-label={`${deadLetters.length} dead letters`}
        >
          {deadLetters.length}
        </span>
      </header>
      <div className="list">
        {message ? (
          <p
            className={`state stateMessage stateMessage-${messageTone}`}
            role={messageTone === 'error' ? 'alert' : 'status'}
            aria-live={messageTone === 'error' ? 'assertive' : 'polite'}
          >
            {message}
          </p>
        ) : null}
        {isLoading ? (
          <p className="state" role="status">
            Carregando dead letters...
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
                aria-label="Tentar novamente carregar dead letters"
              >
                Tentar novamente
              </button>
            ) : null}
          </div>
        ) : null}
        {!isLoading && !error && deadLetters.length === 0 ? (
          <p className="state" role="status">
            Nenhum dead letter pendente de inspeção.
          </p>
        ) : null}
        {!isLoading && !error
          ? deadLetters.map((deadLetter) => {
              const isActing = actionId === deadLetter.id
              const createdAt = formatTimestamp(deadLetter.createdAt)
              const deadLetteredAt = formatTimestamp(deadLetter.deadLetteredAt)
              return (
                <article
                  className="row recordRow"
                  key={deadLetter.id}
                  data-status={deadLetter.status}
                >
                  <div className="recordTitle">
                    <strong>{deadLetter.type}</strong>
                    <span
                      className="stateBadge"
                      data-status={deadLetter.status}
                    >
                      {formatStatus(deadLetter.status)}
                    </span>
                  </div>
                  <span className="recordStatus">
                    {deadLetter.attempts} tentativa
                    {deadLetter.attempts === 1 ? '' : 's'} · conteúdo omitido
                  </span>
                  {formatDiagnostic(deadLetter.lastError) ? (
                    <p className="recordSummary">
                      {formatDiagnostic(deadLetter.lastError)}
                    </p>
                  ) : null}
                  <dl className="recordMeta">
                    <div>
                      <dt>Correlation</dt>
                      <dd>
                        <code>{deadLetter.correlationId}</code>
                      </dd>
                    </div>
                    {deadLetter.traceId ? (
                      <div>
                        <dt>Trace</dt>
                        <dd>
                          <code>{deadLetter.traceId}</code>
                        </dd>
                      </div>
                    ) : null}
                    {deadLetter.conversationId ? (
                      <div>
                        <dt>Conversa</dt>
                        <dd>
                          <code>{deadLetter.conversationId}</code>
                        </dd>
                      </div>
                    ) : null}
                    {deadLetter.sessionId ? (
                      <div>
                        <dt>Sessão</dt>
                        <dd>
                          <code>{deadLetter.sessionId}</code>
                        </dd>
                      </div>
                    ) : null}
                    {createdAt ? (
                      <div>
                        <dt>Criado</dt>
                        <dd>
                          <time dateTime={deadLetter.createdAt}>
                            {createdAt}
                          </time>
                        </dd>
                      </div>
                    ) : null}
                    {deadLetteredAt ? (
                      <div>
                        <dt>Em dead-letter</dt>
                        <dd>
                          <time
                            dateTime={deadLetter.deadLetteredAt ?? undefined}
                          >
                            {deadLetteredAt}
                          </time>
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                  <div
                    className="actions"
                    aria-label={`Ações ${deadLetter.type}`}
                  >
                    <button
                      type="button"
                      aria-label={`Reenfileirar ${deadLetter.type}`}
                      disabled={isActing || !canRequeue}
                      onClick={() => onRequeue?.(deadLetter.id)}
                    >
                      {isActing ? 'Reenfileirando...' : 'Reenfileirar'}
                    </button>
                  </div>
                </article>
              )
            })
          : null}
      </div>
    </section>
  )
}
