import { describe, expect, it } from 'vitest'
import { workerHealth } from '../health.ts'
import { processAgentTurnJob } from '../jobs/process-agent-turn.ts'
import { processOutboxEvent } from '../jobs/process-outbox-event.ts'

describe('worker runtime', () => {
  it('reports health and processes deterministic jobs', async () => {
    await expect(
      processAgentTurnJob({ sessionId: 'sess_1', triggerMessageId: 'msg_1' })
    ).resolves.toMatchObject({
      nextState: 'active',
      proposedActions: ['classify_intent']
    })
    await expect(
      processOutboxEvent({ id: 'outbox_1', type: 'message.outbound' })
    ).resolves.toEqual({
      id: 'outbox_1',
      type: 'message.outbound',
      status: 'processed'
    })
    expect(workerHealth()).toEqual({ status: 'ok' })
  })
})
