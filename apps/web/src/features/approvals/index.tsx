import { formatStatus, formatTimestamp } from '../../ui/formatters.ts'

export interface ApprovalsPanelProps {
  approvals: Array<{
    id: string
    sessionId?: string
    proposedAction: string
    summary?: string
    riskLevel: string
    status: string
    correlationId?: string
    createdAt?: string
    updatedAt?: string
  }>
  message?: string | null
  messageTone?: 'success' | 'info' | 'error'
  error?: string | null
  isLoading?: boolean
  actionId?: string | null
  canApproveReject?: boolean
  canAssumeHandoff?: boolean
  onRetry?: () => void
  onApprove?: (approvalId: string) => void
  onReject?: (approvalId: string) => void
  onAssumeHandoff?: (approvalId: string) => void
}

export function ApprovalsPanel({
  approvals,
  message = null,
  messageTone = 'info',
  error = null,
  isLoading = false,
  actionId = null,
  canApproveReject = false,
  canAssumeHandoff = false,
  onRetry,
  onApprove,
  onReject,
  onAssumeHandoff
}: ApprovalsPanelProps) {
  const isPendingStatus = (status: string): boolean =>
    status.trim().toLowerCase() === 'pending'
  const pendingCount = approvals.filter((approval) =>
    isPendingStatus(approval.status)
  ).length

  return (
    <section className="panel" aria-labelledby="approvals-title">
      <header className="panelHeader">
        <div>
          <h2 id="approvals-title">Aprovacoes</h2>
          <p>Decisoes humanas com risco e sessao sempre visiveis.</p>
        </div>
        <span className="counter" aria-label={`${pendingCount} pendentes`}>
          {pendingCount}
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
                aria-label="Tentar novamente carregar aprovacoes"
              >
                Tentar novamente
              </button>
            ) : null}
          </div>
        ) : null}
        {!isLoading && !error && approvals.length === 0 ? (
          <p className="state" role="status" aria-live="polite">
            Nenhuma aprovacao pendente.
          </p>
        ) : null}
        {!isLoading && !error
          ? approvals.map((approval) => {
              const normalizedStatus = approval.status.trim().toLowerCase()
              const isPending = isPendingStatus(approval.status)
              const isActing = actionId === approval.id
              const updatedAt = formatTimestamp(
                approval.updatedAt ?? approval.createdAt
              )
              return (
                <article
                  className="row recordRow"
                  key={approval.id}
                  data-status={normalizedStatus}
                >
                  <div className="recordTitle">
                    <strong>{approval.proposedAction}</strong>
                    <span className="stateBadge" data-status={normalizedStatus}>
                      {formatStatus(approval.status)}
                    </span>
                  </div>
                  <span className="recordStatus">
                    {approval.riskLevel} / {formatStatus(approval.status)}
                  </span>
                  {approval.summary ? (
                    <p className="recordSummary">{approval.summary}</p>
                  ) : null}
                  <dl className="recordMeta">
                    {approval.sessionId ? (
                      <div>
                        <dt>Sessao</dt>
                        <dd>
                          <code>{approval.sessionId}</code>
                        </dd>
                      </div>
                    ) : null}
                    {approval.correlationId ? (
                      <div>
                        <dt>Correlation</dt>
                        <dd>
                          <code>{approval.correlationId}</code>
                        </dd>
                      </div>
                    ) : null}
                    {updatedAt ? (
                      <div>
                        <dt>Atualizada</dt>
                        <dd>
                          <time
                            dateTime={approval.updatedAt ?? approval.createdAt}
                          >
                            {updatedAt}
                          </time>
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                  {isPending ? (
                    <div
                      className="actions"
                      aria-label={`Acoes ${approval.proposedAction}`}
                    >
                      <button
                        type="button"
                        aria-label={`Aprovar ${approval.proposedAction}`}
                        disabled={isActing || !canApproveReject}
                        onClick={() => onApprove?.(approval.id)}
                      >
                        Aprovar
                      </button>
                      <button
                        type="button"
                        aria-label={`Rejeitar ${approval.proposedAction}`}
                        disabled={isActing || !canApproveReject}
                        onClick={() => onReject?.(approval.id)}
                      >
                        Rejeitar
                      </button>
                      <button
                        type="button"
                        aria-label={`Assumir handoff ${approval.proposedAction}`}
                        disabled={isActing || !canAssumeHandoff}
                        onClick={() => onAssumeHandoff?.(approval.id)}
                      >
                        Assumir handoff
                      </button>
                    </div>
                  ) : null}
                </article>
              )
            })
          : null}
      </div>
    </section>
  )
}
