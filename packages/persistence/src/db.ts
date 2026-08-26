import type { DatabaseState } from './schema.ts'

export function createInMemoryState(): DatabaseState {
  return {
    conversations: [],
    messages: [],
    sessions: [],
    agentRuns: [],
    toolCalls: [],
    approvals: [],
    tasks: [],
    auditEvents: [],
    auditEvidenceCheckpoints: [],
    idempotency: [],
    outbox: []
  }
}

export class InMemoryDatabase {
  readonly state: DatabaseState

  constructor(state: DatabaseState = createInMemoryState()) {
    this.state = state
  }
}
