import type { AgentId, AgentVersionId } from '@cvg/platform'
import { describe, expect, it } from 'vitest'
import { InMemoryDatabase } from '../db.ts'
import { ConversationRepository } from '../repositories/conversation-repository.ts'

const tenantId = 'tenant_00000000-0000-4000-8000-000000000081'
const otherTenantId = 'tenant_00000000-0000-4000-8000-000000000082'
const agentId = 'agent_00000000-0000-4000-8000-000000000081' as AgentId
const versionId =
  'agent_version_00000000-0000-4000-8000-000000000081' as AgentVersionId

describe('controlled session agent-version pinning', () => {
  it('binds a session once and preserves the original pair', () => {
    const conversations = new ConversationRepository(new InMemoryDatabase())
    const created = conversations.createWithSession({
      tenantId,
      channel: 'web',
      senderRef: 'fixture-sender',
      externalMessageId: 'pinning-memory-1',
      body: 'Mensagem fictícia'
    })

    const bound = conversations.bindSessionAgentVersion(
      tenantId,
      created.session.id,
      agentId,
      versionId
    )
    const repeated = conversations.bindSessionAgentVersion(
      tenantId,
      created.session.id,
      agentId,
      versionId
    )

    expect(bound).toMatchObject({ agentId, agentVersionId: versionId })
    expect(repeated).toMatchObject({ agentId, agentVersionId: versionId })
  })

  it('rejects replacement and cross-tenant binding without changing the session', () => {
    const conversations = new ConversationRepository(new InMemoryDatabase())
    const created = conversations.createWithSession({
      tenantId,
      channel: 'web',
      senderRef: 'fixture-sender',
      externalMessageId: 'pinning-memory-2',
      body: 'Mensagem fictícia'
    })
    conversations.bindSessionAgentVersion(
      tenantId,
      created.session.id,
      agentId,
      versionId
    )

    let replacementError: unknown
    try {
      conversations.bindSessionAgentVersion(
        tenantId,
        created.session.id,
        agentId,
        'agent_version_00000000-0000-4000-8000-000000000082' as AgentVersionId
      )
    } catch (error) {
      replacementError = error
    }
    expect(replacementError).toMatchObject({ code: 'conflict' })
    expect(() =>
      conversations.bindSessionAgentVersion(
        otherTenantId,
        created.session.id,
        agentId,
        versionId
      )
    ).toThrow(/session/i)

    expect(
      conversations.timeline(tenantId, created.conversation.id).sessions[0]
    ).toMatchObject({
      agentId,
      agentVersionId: versionId
    })
  })
})
