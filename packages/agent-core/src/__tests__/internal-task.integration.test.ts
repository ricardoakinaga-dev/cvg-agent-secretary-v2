import { InMemoryDatabase, TaskRepository } from '@cvg/persistence'
import { describe, expect, it } from 'vitest'
import { createInternalTask } from '../index.ts'

describe('internal task integration', () => {
  it('creates internal tasks idempotently by session, source and key', () => {
    const tasks = new TaskRepository(new InMemoryDatabase())
    const input = {
      sessionId: 'sess_task_trace',
      title: 'Retorno',
      description: 'Ligar para tutor ficticio',
      priority: 'medium' as const,
      source: 'traceability-test',
      idempotencyKey: 'trace-task-1'
    }

    const first = createInternalTask({ tasks }, input)
    const duplicate = createInternalTask({ tasks }, input)

    expect(first).toEqual(duplicate)
    expect(tasks.list()).toHaveLength(1)
  })
})
