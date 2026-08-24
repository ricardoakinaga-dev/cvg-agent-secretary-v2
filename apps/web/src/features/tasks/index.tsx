export interface TasksPanelProps {
  tasks: Array<{ id: string; title: string; priority: string; status: string }>
  error?: string | null
  isLoading?: boolean
  actionId?: string | null
  canUpdateTasks?: boolean
  onStart?: (taskId: string) => void
  onComplete?: (taskId: string) => void
  onCancel?: (taskId: string) => void
}

export function TasksPanel({
  tasks,
  error = null,
  isLoading = false,
  actionId = null,
  canUpdateTasks = false,
  onStart,
  onComplete,
  onCancel
}: TasksPanelProps) {
  return (
    <section className="panel" aria-labelledby="tasks-title">
      <header className="panelHeader">
        <h2 id="tasks-title">Tarefas</h2>
        <span className="counter">{tasks.length}</span>
      </header>
      <div className="list">
        {isLoading ? <p className="state">Carregando...</p> : null}
        {!isLoading && error ? (
          <p className="state stateError">{error}</p>
        ) : null}
        {!isLoading && !error && tasks.length === 0 ? (
          <p className="state">Nenhuma tarefa interna.</p>
        ) : null}
        {!isLoading && !error
          ? tasks.map((task) => {
              const isActing = actionId === task.id
              const canStart = task.status === 'open'
              const canComplete =
                task.status === 'open' || task.status === 'in_progress'
              const canCancel =
                task.status === 'open' || task.status === 'in_progress'
              return (
                <article className="row" key={task.id}>
                  <strong>{task.title}</strong>
                  <span>
                    {task.priority} / {task.status}
                  </span>
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
