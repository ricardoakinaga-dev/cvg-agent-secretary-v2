import { describe, expect, it } from 'vitest'
import {
  ApprovalRepository,
  AuditRepository,
  ConversationRepository,
  IdempotencyRepository,
  InMemoryDatabase,
  OutboxRepository,
  TaskRepository
} from '../index.ts'

describe('persistence repositories', () => {
  it('creates conversation, session, message and prevents duplicate inbound messages', () => {
    const db = new InMemoryDatabase()
    const conversations = new ConversationRepository(db)
    const tenantId = 'tenant_00000000-0000-4000-8000-000000000077'
    const created = conversations.createWithSession({
      tenantId,
      channel: 'whatsapp',
      senderRef: '+5511999999999',
      externalMessageId: 'ext-1',
      body: 'Preciso agendar'
    })

    expect(created.conversation.status).toBe('active')
    expect(created.conversation.senderRef).toBe('[redacted-phone]')
    expect(
      db.state.conversations.find(
        (conversation) => conversation.id === created.conversation.id
      )?.senderRef
    ).not.toContain('5511999999999')
    expect(
      conversations.findByExternalMessage(tenantId, 'whatsapp', 'ext-1')?.id
    ).toBe(created.message.id)
    expect(
      conversations.timeline(tenantId, created.conversation.id).messages
    ).toHaveLength(1)
    expect(
      conversations.timeline(tenantId, created.conversation.id).sessions
    ).toHaveLength(1)
  })

  it('continues an existing tenant session and persists human takeover transitions', () => {
    const db = new InMemoryDatabase()
    const conversations = new ConversationRepository(db)
    const tenantId = 'tenant_00000000-0000-4000-8000-000000000076'
    const first = conversations.createWithSession({
      tenantId,
      channel: 'web',
      senderRef: 'fixture-sender',
      externalMessageId: 'continuation-1',
      body: 'Olá'
    })

    const continued = conversations.createWithSession({
      tenantId,
      channel: 'web',
      senderRef: 'fixture-sender',
      externalMessageId: 'continuation-2',
      body: 'Ainda preciso de ajuda',
      conversationId: first.conversation.id,
      sessionId: first.session.id
    })
    const requested = conversations.transitionTakeover(
      tenantId,
      first.session.id,
      'request_handoff'
    )
    const active = conversations.transitionTakeover(
      tenantId,
      first.session.id,
      'accept_handoff'
    )

    expect(continued.conversation.id).toBe(first.conversation.id)
    expect(continued.session.id).toBe(first.session.id)
    expect(
      conversations.timeline(tenantId, first.conversation.id).messages
    ).toHaveLength(2)
    expect(requested?.takeoverState).toBe('HANDOFF_REQUESTED')
    expect(active?.takeoverState).toBe('HUMAN_ACTIVE')
    expect(
      conversations.timeline(tenantId, first.conversation.id).sessions[0]
        ?.takeoverState
    ).toBe('HUMAN_ACTIVE')
  })

  it('persists redacted outbound runtime messages for future history', () => {
    const db = new InMemoryDatabase()
    const conversations = new ConversationRepository(db)
    const tenantId = 'tenant_00000000-0000-4000-8000-000000000075'
    const created = conversations.createWithSession({
      tenantId,
      channel: 'web',
      senderRef: 'fixture-sender',
      externalMessageId: 'outbound-1',
      body: 'Pergunta fictícia'
    })

    const outbound = conversations.appendOutboundMessage({
      tenantId,
      conversationId: created.conversation.id,
      externalMessageId: 'runtime:trace-1',
      body: 'Resposta para ana@example.com'
    })

    expect(outbound.direction).toBe('outbound')
    expect(outbound.body).toBe('Resposta para [redacted-email]')
    expect(
      conversations.timeline(tenantId, created.conversation.id).messages
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ direction: 'outbound' })
      ])
    )
  })

  it('rejects unsafe continuation and cross-tenant takeover attempts', () => {
    const db = new InMemoryDatabase()
    const conversations = new ConversationRepository(db)
    const tenantA = 'tenant_00000000-0000-4000-8000-000000000073'
    const tenantB = 'tenant_00000000-0000-4000-8000-000000000074'
    const created = conversations.createWithSession({
      tenantId: tenantA,
      channel: 'web',
      senderRef: 'fixture-sender',
      externalMessageId: 'unsafe-1',
      body: 'Olá'
    })

    expect(() =>
      conversations.createWithSession({
        tenantId: tenantB,
        channel: 'web',
        senderRef: 'fixture-sender',
        externalMessageId: 'unsafe-2',
        body: 'Escopo cruzado',
        conversationId: created.conversation.id,
        sessionId: created.session.id
      })
    ).toThrow(/not found/i)
    expect(() =>
      conversations.createWithSession({
        tenantId: tenantA,
        channel: 'web',
        senderRef: 'other-sender',
        externalMessageId: 'unsafe-3',
        body: 'Remetente divergente',
        conversationId: created.conversation.id,
        sessionId: created.session.id
      })
    ).toThrow(/not eligible/i)
    db.state.sessions = db.state.sessions.map((session) => ({
      ...session,
      status: 'closed'
    }))
    expect(() =>
      conversations.createWithSession({
        tenantId: tenantA,
        channel: 'web',
        senderRef: 'fixture-sender',
        externalMessageId: 'unsafe-4',
        body: 'Sessão fechada',
        conversationId: created.conversation.id,
        sessionId: created.session.id
      })
    ).toThrow(/not eligible/i)
    db.state.sessions = db.state.sessions.map((session) => ({
      ...session,
      status: 'open'
    }))
    db.state.conversations = db.state.conversations.map((conversation) => ({
      ...conversation,
      status: 'resolved'
    }))
    expect(() =>
      conversations.createWithSession({
        tenantId: tenantA,
        channel: 'web',
        senderRef: 'fixture-sender',
        externalMessageId: 'unsafe-5',
        body: 'Conversa resolvida',
        conversationId: created.conversation.id,
        sessionId: created.session.id
      })
    ).toThrow(/not eligible/i)
    expect(
      conversations.transitionTakeover(
        tenantB,
        created.session.id,
        'request_handoff'
      )
    ).toBeNull()
    expect(
      conversations.transitionTakeover(
        tenantA,
        created.session.id,
        'accept_handoff'
      )
    ).toBeNull()
  })

  it('redacts conversation and audit payloads before in-memory persistence', () => {
    const db = new InMemoryDatabase()
    const conversations = new ConversationRepository(db)
    const audit = new AuditRepository(db)
    const tenantId = 'tenant_00000000-0000-4000-8000-000000000071'
    const created = conversations.createWithSession({
      tenantId,
      channel: 'web',
      senderRef: 'fixture-sender',
      externalMessageId: 'redaction-1',
      body: 'Meu nome é Ana Silva, email ana@example.com, CPF 123.456.789-09'
    })
    const event = audit.append({
      type: 'safety_event',
      actorType: 'System',
      actorId: 'redaction-test',
      correlationId: created.conversation.correlationId,
      policyVersion: 'test',
      payload: {
        sessionId: created.session.id,
        body: 'não persistir',
        safeStatus: 'kept'
      }
    })

    expect(
      conversations.timeline(tenantId, created.conversation.id).messages[0]
        ?.body
    ).toContain('[redacted-email]')
    expect(event.payload).toEqual({
      sessionId: created.session.id,
      safeStatus: 'kept'
    })
  })

  it('stores tasks idempotently by session source and idempotency key', () => {
    const tasks = new TaskRepository(new InMemoryDatabase())
    const input = {
      sessionId: 'sess_1',
      title: 'Retorno',
      description: 'Ligar para tutor',
      priority: 'high' as const,
      source: 'agent',
      idempotencyKey: 'retorno-1'
    }

    const first = tasks.create(input)
    const second = tasks.create(input)

    expect(second.id).toBe(first.id)
    expect(tasks.list()).toHaveLength(1)
  })

  it('stores approvals, audit events, outbox events and idempotency keys immutably', () => {
    const db = new InMemoryDatabase()
    const approvals = new ApprovalRepository(db)
    const audit = new AuditRepository(db)
    const outbox = new OutboxRepository(db)
    const idempotency = new IdempotencyRepository(db)

    const approval = approvals.save({
      id: 'approval_1',
      sessionId: 'sess_1',
      proposedAction: 'create_appointment_draft',
      summary: 'Horario sugerido',
      riskLevel: 'medium',
      status: 'pending',
      decidedBy: null,
      decidedAt: null,
      createdAt: new Date()
    })
    approvals.save({
      ...approval,
      status: 'approved',
      decidedBy: 'op_1',
      decidedAt: new Date()
    })

    const event = audit.append({
      type: 'approval_decision',
      actorType: 'Approver',
      actorId: 'op_1',
      correlationId: 'corr_00000000-0000-4000-8000-000000000000',
      policyVersion: 'test',
      payload: { sessionId: 'sess_1', approvalRequestId: approval.id }
    })
    const queued = outbox.enqueue('message.outbound', { sessionId: 'sess_1' })
    idempotency.save('key-1', queued.id)
    idempotency.save('key-1', 'different')

    expect(approvals.findById(approval.id)?.status).toBe('approved')
    expect(audit.listBySession('sess_1')).toEqual([event])
    expect(outbox.pending()).toEqual([queued])
    expect(idempotency.find('key-1')).toBe(queued.id)
  })
})
