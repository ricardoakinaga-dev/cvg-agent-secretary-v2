import { describe, expect, it } from 'vitest'
import {
  ConversationRepository,
  InMemoryDatabase,
  OutboxRepository,
  TaskRepository
} from '@cvg/persistence'
import {
  createHandoffSummary,
  createInboundIdempotencyKey,
  createInternalTask,
  getConversationTimeline,
  isSessionOpen,
  receiveInboundMessage,
  requestHumanApproval,
  resolveApproval,
  runAgentTurn
} from '../index.ts'

function messageInput(overrides: Record<string, unknown> = {}) {
  return {
    tenantId: 'tenant_00000000-0000-4000-8000-000000000075',
    channel: 'whatsapp',
    externalMessageId: 'ext-1',
    senderRef: '+5511999999999',
    body: 'Preciso agendar consulta',
    receivedAt: new Date(),
    ...overrides
  }
}

describe('agent-core commands', () => {
  it('hashes opaque provider identifiers before durable key construction', () => {
    const key = createInboundIdempotencyKey(
      'whatsapp',
      'owner@example.com/+5511999999999'
    )

    expect(key).toMatch(/^inbound:whatsapp:sha256:[a-f0-9]{64}$/)
    expect(key).not.toContain('owner@example.com')
    expect(key).not.toContain('+5511999999999')
  })

  it('receives inbound messages idempotently and exposes timeline', async () => {
    const conversations = new ConversationRepository(new InMemoryDatabase())
    const first = await receiveInboundMessage({ conversations }, messageInput())
    const duplicate = await receiveInboundMessage(
      { conversations },
      messageInput()
    )

    expect(first.accepted).toBe(true)
    expect(duplicate.accepted).toBe(false)
    expect(duplicate.conversationId).toBe(first.conversationId)
    expect(duplicate.correlationId).toBe(first.correlationId)
    expect(duplicate.sessionId).toBe(first.sessionId)
    expect(
      (
        await getConversationTimeline(
          conversations,
          messageInput().tenantId,
          first.conversationId
        )
      ).messages
    ).toHaveLength(1)
  })

  it('propagates a trusted trace root into the durable inbound envelope', async () => {
    const database = new InMemoryDatabase()
    const conversations = new ConversationRepository(database)
    const outbox = new OutboxRepository(database)
    const traceId = '0123456789abcdef0123456789abcdef'

    const result = await receiveInboundMessage(
      { conversations, outbox, traceId },
      messageInput({ externalMessageId: 'ext-trace-1' })
    )

    expect(result.outbox).toMatchObject({
      type: 'inbound.process',
      traceId,
      correlationId: result.correlationId
    })
    expect(
      database.state.messages.find((message) => message.id === result.messageId)
    ).toMatchObject({ runtimeTraceId: traceId })
  })

  it('preserves the trusted HTTP correlation root in the conversation and outbox', async () => {
    const database = new InMemoryDatabase()
    const conversations = new ConversationRepository(database)
    const outbox = new OutboxRepository(database)
    const correlationId = 'corr_00000000-0000-4000-8000-000000000076'

    const result = await receiveInboundMessage(
      { conversations, outbox, correlationId },
      messageInput({ externalMessageId: 'ext-correlation-1' })
    )

    expect(result.correlationId).toBe(correlationId)
    expect(result.outbox).toMatchObject({ correlationId })
    expect(database.state.conversations[0]?.correlationId).toBe(correlationId)
  })

  it('rejects empty bodies and creates idempotent internal tasks', async () => {
    const tasks = new TaskRepository(new InMemoryDatabase())

    await expect(
      receiveInboundMessage(
        { conversations: new ConversationRepository(new InMemoryDatabase()) },
        messageInput({ body: '   ' })
      )
    ).rejects.toThrow(/Message body/)
    const task = await createInternalTask(
      { tasks },
      {
        sessionId: 'sess_1',
        title: 'Retorno',
        description: 'Ligar',
        priority: 'medium',
        source: 'agent',
        idempotencyKey: 'task-key-1'
      }
    )

    expect(task.status).toBe('open')
  })

  it('converts a concurrent PostgreSQL unique conflict into a duplicate result', async () => {
    const duplicateMessage = {
      id: 'msg_00000000-0000-4000-8000-000000000001',
      conversationId: 'conv_00000000-0000-4000-8000-000000000001',
      externalMessageId: 'concurrent-1',
      direction: 'inbound' as const,
      body: 'Mensagem já persistida',
      correlationId: 'corr_00000000-0000-4000-8000-000000000001',
      sessionId: 'sess_00000000-0000-4000-8000-000000000001',
      runtimeTraceId: '0123456789abcdef0123456789abcdef',
      createdAt: new Date()
    }
    const conversations = {
      findByExternalMessage: async () => duplicateMessage,
      createWithSession: async () => {
        const error = Object.assign(new Error('duplicate key'), {
          code: '23505'
        })
        throw error
      }
    }

    await expect(
      receiveInboundMessage(
        { conversations },
        messageInput({ externalMessageId: 'concurrent-1' })
      )
    ).resolves.toMatchObject({
      accepted: false,
      conversationId: duplicateMessage.conversationId,
      messageId: duplicateMessage.id,
      sessionId: duplicateMessage.sessionId,
      correlationId: duplicateMessage.correlationId,
      traceId: duplicateMessage.runtimeTraceId
    })
  })

  it('runs policy-aware agent turns and approval commands', () => {
    const turn = runAgentTurn({
      sessionId: 'sess_1',
      triggerMessageId: 'msg_1',
      autonomyLevel: 'level_2_suggest'
    })
    const approval = requestHumanApproval({
      sessionId: 'sess_1',
      proposedAction: 'create_appointment_draft',
      summary: 'Horario sugerido',
      riskLevel: 'medium'
    })
    const decided = resolveApproval(approval, 'Approver', {
      approvalRequestId: approval.id,
      decision: 'approved',
      operatorId: 'op_1'
    })

    expect(turn.proposedActions).toEqual(['classify_intent'])
    expect(approval.status).toBe('pending')
    expect(decided.status).toBe('approved')
  })

  it('builds handoff summaries only when required context is present', () => {
    expect(() => createHandoffSummary({ intent: 'triage' })).toThrow(
      /Handoff requires/
    )
    expect(
      createHandoffSummary({
        tutor: 'Ana',
        pet: 'Bolt',
        intent: 'triage',
        risk: 'medium',
        collectedData: ['vomito'],
        recommendedNextStep: 'Operador assumir'
      })
    ).toContain('Next: Operador assumir')
    expect(
      isSessionOpen({
        id: 'sess_1',
        conversationId: 'conv_1',
        status: 'open',
        takeoverState: 'BOT_ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      })
    ).toBe(true)
  })
})
