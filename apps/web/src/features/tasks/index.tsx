import { formatStatus, formatTimestamp } from '../../ui/formatters.ts'

export interface TasksPanelProps {
  tasks: Array<{
    id: string
    sessionId?: string
    title: string
    description?: string
    priority: string
    status: string
    correlationId?: string
    createdAt?: string
    updatedAt?: string
    dueAt?: string
  }>
  message?: string | null
  messageTone?: 'success' | 'info' | 'error'
  error?: string | null
  isLoading?: boolean
  actionId?: string | null
  canUpdateTasks?: boolean
  onRetry?: () => void
  onStart?: (taskId: string) => void
  onComplete?: (taskId: string) => void
  onCancel?: (taskId: string) => void
}

export function TasksPanel({
  tasks,
  message = null,
  messageTone = 'info',
  error = null,
  isLoading = false,
  actionId = null,
  canUpdateTasks = false,
  onRetry,
  onStart,
  onComplete,
  onCancel
}: TasksPanelProps) {
  return (
    <section className="panel" aria-labelledby="tasks-title">
      <header className="panelHeader">
        <div>
          <h2 id="tasks-title">Tarefas</h2>
          <p>Fila interna, vinculada a sessao e sem efeitos externos.</p>
        </div>
        <span className="counter" aria-label={`${tasks.length} tarefas`}>
          {tasks.length}
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
                aria-label="Tentar novamente carregar tarefas"
              >
                Tentar novamente
              </button>
            ) : null}
          </div>
        ) : null}
        {!isLoading && !error && tasks.length === 0 ? (
          <p className="state" role="status" aria-live="polite">
            Nenhuma tarefa interna.
          </p>
        ) : null}
        {!isLoading && !error
          ? tasks.map((task) => {
              const isActing = actionId === task.id
              const canStart = task.status === 'open'
              const canComplete =
                task.status === 'open' || task.status === 'in_progress'
              const canCancel =
                task.status === 'open' || task.status === 'in_progress'
              const updatedAt = formatTimestamp(
                task.updatedAt ?? task.createdAt
              )
              const dueAt = formatTimestamp(task.dueAt)
              return (
                <article
                  className="row recordRow"
                  key={task.id}
                  data-status={task.status}
                >
                  <div className="recordTitle">
                    <strong>{task.title}</strong>
                    <span className="stateBadge" data-status={task.status}>
                      {formatStatus(task.status)}
                    </span>
                  </div>
                  <span className="recordStatus">
                    {task.priority} / {task.status}
                  </span>
                  {task.description ? (
                    <p className="recordSummary">{task.description}</p>
                  ) : null}
                  <dl className="recordMeta">
                    {task.sessionId ? (
                      <div>
                        <dt>Sessao</dt>
                        <dd>
                          <code>{task.sessionId}</code>
                        </dd>
                      </div>
                    ) : null}
                    {task.correlationId ? (
                      <div>
                        <dt>Correlation</dt>
                        <dd>
                          <code>{task.correlationId}</code>
                        </dd>
                      </div>
                    ) : null}
                    {updatedAt ? (
                      <div>
                        <dt>Atualizada</dt>
                        <dd>
                          <time dateTime={task.updatedAt ?? task.createdAt}>
                            {updatedAt}
                          </time>
                        </dd>
                      </div>
                    ) : null}
                    {dueAt ? (
                      <div>
                        <dt>Prazo</dt>
                        <dd>
                          <time dateTime={task.dueAt}>{dueAt}</time>
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                  {canStart || canComplete || canCancel ? (
                    <div className="actions" aria-label={`Acoes ${task.title}`}>
                      {canStart ? (
                        <button
                          type="button"
                          aria-label={`Iniciar ${task.title}`}
                          disabled={isActing || !canUpdateTasks}
                          onClick={() => onStart?.(task.id)}
                        >
                          Iniciar
                        </button>
                      ) : null}
                      {canComplete ? (
                        <button
                          type="button"
                          aria-label={`Concluir ${task.title}`}
                          disabled={isActing || !canUpdateTasks}
                          onClick={() => onComplete?.(task.id)}
                        >
                          Concluir
                        </button>
                      ) : null}
                      {canCancel ? (
                        <button
                          type="button"
                          aria-label={`Cancelar ${task.title}`}
                          disabled={isActing || !canUpdateTasks}
                          onClick={() => onCancel?.(task.id)}
                        >
                          Cancelar
                        </button>
                      ) : null}
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
