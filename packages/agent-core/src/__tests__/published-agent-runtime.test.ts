import { AgentConfigSchema, InMemoryControlPlaneStore } from '@cvg/platform'
import { describe, expect, it } from 'vitest'
import { executePublishedAgent } from '../index.ts'

const tenantId = 'tenant_00000000-0000-4000-8000-000000000071'

function config() {
  return AgentConfigSchema.parse({
    persona: { name: 'Luna', role: 'secretary', tone: 'calm' },
    greeting: 'Olá, resposta controlada.',
    promptBlocks: [
      {
        id: 'runtime-safety',
        kind: 'safety',
        content: 'Use apenas fixtures fictícias.',
        priority: 1,
        enabled: true
      }
    ],
    responseTemplates: {
      institutional_question: 'Resposta institucional publicada.'
    },
    model: {
      provider: 'fake',
      model: 'deterministic-v1',
      temperature: 0,
      maxTokens: 128,
      timeoutMs: 1000,
      retries: 0,
      secretRef: 'secret://controlled/runtime'
    },
    policies: {
      version: 'runtime-policy-v1',
      minConfidence: 0.7,
      lowConfidence: 'clarify',
      maxClarifications: 2,
      enabledActions: ['respond', 'institutional_question'],
      approvalActions: [],
      blockedActions: []
    },
    plugins: [],
    knowledge: [
      {
        source: 'controlled://institutional',
        version: 'knowledge-v1',
        enabled: true,
        requiresApprovedSource: true
      }
    ],
    handoff: {
      lowConfidenceDestination: 'controlled-reception',
      destinations: ['controlled-reception'],
      maxClarifications: 2
    }
  })
}

async function publishedFixture() {
  const store = new InMemoryControlPlaneStore()
  const agent = await store.createAgent(
    { tenantId },
    {
      slug: 'runtime-secretary',
      name: 'Runtime Secretary',
      description: 'Fixture'
    }
  )
  const draft = await store.createVersion(
    { tenantId },
    agent.id,
    config(),
    'admin.runtime'
  )
  const testing = await store.transitionVersion(
    { tenantId },
    draft.id,
    'TESTING'
  )
  const approved = await store.transitionVersion(
    { tenantId },
    testing.id,
    'APPROVED'
  )
  const published = await store.publishVersion({ tenantId }, approved.id)
  return { store, agent, published }
}

describe('published agent runtime adapter', () => {
  it('resolves the published version and executes the configured behavior', async () => {
    const { store, agent, published } = await publishedFixture()

    const result = await executePublishedAgent({
      store,
      tenantId,
      agentId: agent.id,
      message: 'Qual endereço?',
      history: [],
      context: {
        conversationId: 'conv_runtime_fixture',
        sessionId: 'sess_runtime_fixture'
      },
      approvedKnowledge: {
        version: 'knowledge-v1',
        answer: 'Rua fictícia, 100.',
        source: 'controlled://institutional'
      }
    })

    expect(result.status).toBe('completed')
    expect(result.trace).toMatchObject({
      agentId: agent.id,
      versionId: published.id,
      executionMode: 'CONTROLLED_RUNTIME',
      conversationId: 'conv_runtime_fixture',
      sessionId: 'sess_runtime_fixture',
      provider: { externalCall: false },
      response: { text: '[redacted-address].', mode: 'answer' }
    })
    expect(result.trace?.input.message).not.toContain('+5511999999999')
  })

  it('fails closed without a published version and does not invent a response', async () => {
    const store = new InMemoryControlPlaneStore()
    const agent = await store.createAgent(
      { tenantId },
      { slug: 'unpublished-agent', name: 'Unpublished', description: 'Fixture' }
    )

    const result = await executePublishedAgent({
      store,
      tenantId,
      agentId: agent.id,
      message: 'Mensagem sem versão',
      history: []
    })

    expect(result).toEqual({
      status: 'not_configured',
      trace: null,
      reason: 'published_version_missing'
    })
  })
})
