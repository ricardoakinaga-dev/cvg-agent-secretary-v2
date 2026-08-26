import { describe, expect, it } from 'vitest'
import {
  AgentConfigSchema,
  CONTROLLED_KERNEL_PROMPT_BLOCK,
  assertPromptProfileClone,
  assertPromptProfileIntegrity
} from '@cvg/platform'
import { buildServer } from './server.ts'

const tenantId = 'tenant_00000000-0000-4000-8000-000000000081'

const adminHeaders = {
  'x-operator-id': 'admin.controlled',
  'x-operator-role': 'Admin',
  'x-tenant-id': tenantId
}

function createConfig() {
  return AgentConfigSchema.parse({
    persona: { name: 'S26 Agent', role: 'secretary', tone: 'calm' },
    greeting: 'Resposta controlada.',
    promptBlocks: [
      CONTROLLED_KERNEL_PROMPT_BLOCK,
      {
        id: 'agent-behavior',
        kind: 'instruction',
        content: 'Seja claro e objetivo.',
        priority: 20,
        enabled: true
      }
    ],
    responseTemplates: {
      handoff: 'Vou encaminhar sua solicitação.'
    },
    model: {
      provider: 'fake',
      model: 'deterministic-v1',
      temperature: 0,
      maxTokens: 128,
      timeoutMs: 1000,
      retries: 0,
      secretRef: 'secret://controlled/fake'
    },
    featureFlags: { testLab: true, realChannels: false },
    policies: {
      version: 'policy-s26-v1',
      minConfidence: 0.7,
      lowConfidence: 'clarify',
      maxClarifications: 2,
      enabledActions: ['respond'],
      approvalActions: [],
      blockedActions: []
    },
    plugins: [],
    knowledge: [],
    handoff: {
      lowConfidenceDestination: 'controlled-reception',
      destinations: ['controlled-reception'],
      maxClarifications: 2
    }
  })
}

interface Envelope<T> {
  success: boolean
  data: T | null
  error: { code: string; message: string } | null
  meta: { correlationId: string }
}

describe('controlled Prompt Profile error-message boundary', () => {
  it('uses a constant message for an invalid response-template key', () => {
    const sentinel = 'token=fixture-secret<script>'

    expect(() =>
      assertPromptProfileIntegrity({
        ...createConfig(),
        responseTemplates: { [sentinel]: 'fixture response' }
      })
    ).toThrowError('Response template key is invalid')
  })

  it('uses a constant message for a duplicate prompt-block id', () => {
    const sentinel = 'token-secret-id'
    const config = createConfig()

    expect(() =>
      assertPromptProfileIntegrity({
        ...config,
        promptBlocks: [
          ...config.promptBlocks,
          {
            id: sentinel,
            kind: 'instruction',
            content: 'Fixture',
            priority: 30,
            enabled: true
          },
          {
            id: sentinel,
            kind: 'instruction',
            content: 'Fixture duplicado',
            priority: 31,
            enabled: true
          }
        ]
      })
    ).toThrowError('Prompt block id must be unique')
  })

  it('uses a constant message when a protected block is changed', () => {
    const base = createConfig()
    const protectedId = 'token-protected-id'
    const source = AgentConfigSchema.parse({
      ...base,
      promptBlocks: [
        ...base.promptBlocks,
        {
          id: protectedId,
          kind: 'system',
          content: 'Fixture protegido',
          priority: 10,
          enabled: true
        }
      ]
    })
    const changed = AgentConfigSchema.parse({
      ...source,
      promptBlocks: source.promptBlocks.filter(
        (block) => block.id !== protectedId
      )
    })

    expect(() => assertPromptProfileClone(source, changed)).toThrowError(
      'Protected prompt block must be preserved'
    )
  })

  it('does not echo an invalid key through the clone API or create a version', async () => {
    const app = buildServer()
    const sentinel = 'token=fixture-secret<script>'
    const created = await app.inject({
      method: 'POST',
      url: '/v1/admin/agents',
      headers: adminHeaders,
      payload: {
        slug: 's26-error-boundary-agent',
        name: 'S26 Error Boundary Agent',
        description: 'Controlled fixture'
      }
    })
    const agentId = (created.json() as Envelope<{ id: string }>).data?.id
    const original = await app.inject({
      method: 'POST',
      url: `/v1/admin/agents/${agentId}/versions`,
      headers: adminHeaders,
      payload: { config: createConfig() }
    })
    const versionId = (original.json() as Envelope<{ id: string }>).data?.id
    const clone = await app.inject({
      method: 'POST',
      url: `/v1/admin/agents/${agentId}/versions/${versionId}/clone`,
      headers: adminHeaders,
      payload: {
        config: {
          ...createConfig(),
          responseTemplates: { [sentinel]: 'fixture response' }
        }
      }
    })
    const versions = await app.inject({
      method: 'GET',
      url: `/v1/admin/agents/${agentId}/versions`,
      headers: adminHeaders
    })
    await app.close()

    const cloneBody = clone.json() as Envelope<null>
    expect(clone.statusCode).toBe(400)
    expect(cloneBody.error).toMatchObject({
      code: 'validation_failed',
      message: 'Response template key is invalid'
    })
    expect(JSON.stringify(cloneBody)).not.toContain(sentinel)
    expect((versions.json() as Envelope<unknown[]>).data).toHaveLength(1)
  })
})
