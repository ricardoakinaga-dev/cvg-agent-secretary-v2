import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlatformPanel } from '../features/platform/index.tsx'

const tenantId = 'tenant_00000000-0000-4000-8000-000000000051'
const agentId = 'agent_00000000-0000-4000-8000-000000000051'
const versionId = 'agent_version_00000000-0000-4000-8000-000000000051'

const config = {
  persona: { name: 'Agente', role: 'assistant', tone: 'calm' },
  greeting: 'Saudação original.',
  promptBlocks: [],
  responseTemplates: { unknown: 'Resposta fictícia.' },
  model: {
    provider: 'fake',
    model: 'deterministic-v1',
    temperature: 0,
    maxTokens: 128,
    timeoutMs: 1000,
    retries: 0,
    secretRef: 'secret://controlled/fake'
  },
  featureFlags: { testLab: true, realChannels: true },
  policies: {
    version: 'policy-ui-v1',
    minConfidence: 0.7,
    lowConfidence: 'clarify',
    maxClarifications: 2,
    enabledActions: ['respond'],
    approvalActions: [],
    blockedActions: []
  },
  plugins: [
    {
      plugin: 'fake.echo',
      enabled: false,
      allowedTools: ['echo'],
      config: { mode: 'controlled' }
    }
  ],
  knowledge: [],
  handoff: {
    lowConfidenceDestination: 'controlled-reception',
    destinations: ['controlled-reception'],
    maxClarifications: 2
  }
}

const envelope = <T,>(data: T) =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        success: true,
        data,
        error: null,
        meta: { correlationId: 'corr_00000000-0000-4000-8000-000000000051' }
      })
  } as Response)

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('platform control center', () => {
  it('loads a version into the editor and saves edits as a new draft', async () => {
    let clonedConfig: Record<string, unknown> | null = null
    const originalVersion = {
      id: versionId,
      agentId,
      version: 1,
      status: 'PUBLISHED',
      config
    }
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = String(input)
      if (url === '/v1/admin/agents') {
        return envelope([
          {
            id: agentId,
            slug: 'ui-agent',
            name: 'Agente UI',
            description: 'Fixture UI',
            activeVersionId: versionId
          }
        ])
      }
      if (url === '/v1/admin/test-lab/runs?limit=10') {
        return envelope({ items: [], pageInfo: {} })
      }
      if (url === '/v1/admin/execution-traces?limit=10') {
        return envelope({ items: [], pageInfo: {} })
      }
      if (url === `/v1/admin/agents/${agentId}/versions`) {
        return envelope([originalVersion])
      }
      if (url === `/v1/admin/agents/${agentId}/versions/${versionId}/clone`) {
        clonedConfig = JSON.parse(String(init?.body)).config as Record<
          string,
          unknown
        >
        return envelope({
          ...originalVersion,
          id: 'agent_version_00000000-0000-4000-8000-000000000052',
          version: 2,
          status: 'DRAFT',
          config: clonedConfig
        })
      }
      return Promise.reject(new Error(`Unexpected URL ${url}`))
    })

    render(
      <PlatformPanel
        identity={{
          operatorId: 'admin.ui',
          role: 'Admin',
          tenantId
        }}
      />
    )

    const greeting = await screen.findByDisplayValue('Saudação original.')
    fireEvent.change(greeting, { target: { value: 'Saudação editada.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nova versão' }))

    await waitFor(() => {
      expect(clonedConfig).toMatchObject({ greeting: 'Saudação editada.' })
    })
    const capturedConfig = clonedConfig as unknown as Record<string, unknown>
    expect(capturedConfig.plugins).toEqual([
      expect.objectContaining({
        plugin: 'fake.echo',
        enabled: false,
        config: { mode: 'controlled' }
      })
    ])
    expect(capturedConfig.featureFlags).toMatchObject({ realChannels: false })
    expect(await screen.findByText('Nova versão v2 criada.')).toBeTruthy()
  })

  it('shows the snapshot identity in the redacted Trace Viewer', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input)
      if (url === '/v1/admin/agents') return envelope([])
      if (url === '/v1/admin/test-lab/runs?limit=10') {
        return envelope({ items: [], pageInfo: {} })
      }
      if (url === '/v1/admin/execution-traces?limit=10') {
        return envelope({
          items: [
            {
              traceId: 'trace_00000000-0000-4000-8000-000000000051',
              agentId,
              versionId,
              configVersion: `${versionId}:v7`,
              executionMode: 'TEST_LAB',
              intent: { name: 'unknown', confidence: 0.3 },
              policy: [{ decision: 'handoff', reason: 'controlled' }],
              knowledge: { status: 'not_requested' },
              tools: [],
              handoff: {
                requested: true,
                reason: 'controlled',
                state: 'HANDOFF_REQUESTED'
              },
              response: { text: '[redacted]', mode: 'handoff' },
              provider: {
                provider: 'fake',
                model: 'deterministic-v1',
                externalCall: false
              }
            }
          ],
          pageInfo: {}
        })
      }
      return Promise.reject(new Error(`Unexpected URL ${url}`))
    })

    render(
      <PlatformPanel
        identity={{ operatorId: 'admin.ui', role: 'Admin', tenantId }}
      />
    )

    expect(await screen.findByText(`${versionId}:v7`)).toBeTruthy()
  })
})
