import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TasksPanel } from './index.tsx'

afterEach(() => cleanup())

describe('TasksPanel', () => {
  it('renders task lifecycle controls without external side effects', () => {
    const onStart = vi.fn()
    render(
      <TasksPanel
        canUpdateTasks
        onStart={onStart}
        tasks={[
          {
            id: 'task_1',
            sessionId: 'session_1',
            title: 'Retorno',
            description: 'Revisar a resposta com o operador.',
            priority: 'high',
            status: 'open',
            correlationId: 'corr_task_1',
            updatedAt: '2026-09-14T12:00:00.000Z'
          }
        ]}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Retorno' }))

    expect(screen.getByText('high / open')).toBeTruthy()
    expect(screen.getByText('Revisar a resposta com o operador.')).toBeTruthy()
    expect(screen.getByText('session_1')).toBeTruthy()
    expect(screen.getByText('corr_task_1')).toBeTruthy()
    expect(screen.getByText('Aberta')).toBeTruthy()
    expect(onStart).toHaveBeenCalledWith('task_1')
  })

  it('exposes task loading failures as alerts with an explicit retry action', () => {
    const onRetry = vi.fn()
    render(
      <TasksPanel
        tasks={[]}
        error="Falha de leitura controlada."
        onRetry={onRetry}
      />
    )

    expect(screen.getByRole('alert').textContent).toContain(
      'Falha de leitura controlada.'
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Tentar novamente carregar tarefas' })
    )
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
