import { createDomainId } from '@cvg/shared'
import type { InMemoryDatabase } from './db.ts'
import type { OutboxEventRecord } from './schema.ts'

export class OutboxRepository {
  constructor(private readonly db: InMemoryDatabase) {}

  enqueue(type: string, payload: unknown): OutboxEventRecord {
    const event: OutboxEventRecord = {
      id: createDomainId('outbox'),
      type,
      payload,
      status: 'pending',
      createdAt: new Date()
    }
    this.db.state.outbox = [...this.db.state.outbox, event]
    return event
  }

  pending(): OutboxEventRecord[] {
    return this.db.state.outbox.filter((event) => event.status === 'pending')
  }
}
