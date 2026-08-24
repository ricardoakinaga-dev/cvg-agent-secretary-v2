export interface ApprovalsPanelProps {
  approvals: Array<{
    id: string
    proposedAction: string
    riskLevel: string
    status: string
  }>
  error?: string | null
  isLoading?: boolean
  actionId?: string | null
  canApproveReject?: boolean
  canAssumeHandoff?: boolean
  onApprove?: (approvalId: string) => void
  onReject?: (approvalId: string) => void
  onAssumeHandoff?: (approvalId: string) => void
}

export function ApprovalsPanel({
  approvals,
  error = null,
  isLoading = false,
  actionId = null,
  canApproveReject = false,
  canAssumeHandoff = false,
  onApprove,
  onReject,
  onAssumeHandoff
}: ApprovalsPanelProps) {
  return (
    <section className="panel" aria-labelledby="approvals-title">
      <header className="panelHeader">
        <h2 id="approvals-title">Aprovacoes</h2>
        <span className="counter">
          {approvals.filter((approval) => approval.status === 'pending').length}
        </span>
      </header>
      <div className="list">
        {isLoading ? <p className="state">Carregando...</p> : null}
        {!isLoading && error ? (
          <p className="state stateError">{error}</p>
        ) : null}
        {!isLoading && !error && approvals.length === 0 ? (
          <p className="state">Nenhuma aprovacao pendente.</p>
        ) : null}
        {!isLoading && !error
          ? approvals.map((approval) => {
              const isPending = approval.status === 'pending'
              const isActing = actionId === approval.id
              return (
                <article className="row" key={approval.id}>
                  <strong>{approval.proposedAction}</strong>
                  <span>
                    {approval.riskLevel} / {approval.status}
                  </span>
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
