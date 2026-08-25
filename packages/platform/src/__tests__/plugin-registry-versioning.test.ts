import { describe, expect, it, vi } from 'vitest'
import { AgentConfigSchema, PluginManifestSchema } from '../contracts.ts'
import {
  CapabilityGateway,
  PluginRegistry,
  type PluginHandler
} from '../plugin-gateway.ts'

const tenantId = 'tenant_00000000-0000-0000-0000-000000000081' as const
const agentId = 'agent_00000000-0000-0000-0000-000000000081' as const
const versionId = 'agent_version_00000000-0000-0000-0000-000000000081' as const

function manifest(version: string) {
  return {
    name: 'fixture.versioned',
    version,
    capabilities: ['fixture.read'],
    permissions: ['fixture:read'],
    tools: [
      {
        name: 'read',
        permission: 'fixture:read',
        risk: 'low' as const,
        requiresApproval: false
      }
    ],
    hooks: [],
    dependencies: [],
    configSchemaVersion: '1'
  }
}

function config(version?: string) {
  return AgentConfigSchema.parse({
    persona: { name: 'Fixture', role: 'assistant', tone: 'calm' },
    greeting: 'Olá',
    promptBlocks: [],
    responseTemplates: {},
    model: {
      provider: 'fake',
      model: 'deterministic-v1',
      temperature: 0,
      maxTokens: 64,
      timeoutMs: 1000,
      retries: 0,
      secretRef: 'secret://controlled/versioned'
    },
    featureFlags: { testLab: true, realChannels: false },
    policies: {
      version: 'policy-versioned-v1',
      minConfidence: 0.7,
      lowConfidence: 'handoff',
      maxClarifications: 1,
      enabledActions: ['respond'],
      approvalActions: [],
      blockedActions: []
    },
    plugins: [
      {
        plugin: 'fixture.versioned',
        ...(version ? { version } : {}),
        enabled: true,
        allowedTools: ['read'],
        config: {}
      }
    ],
    knowledge: [],
    handoff: {
      lowConfidenceDestination: 'controlled-reception',
      destinations: ['controlled-reception'],
      maxClarifications: 1
    }
  })
}

describe('plugin manifest and registry versioning', () => {
  it('rejects ambiguous or semantically inconsistent manifests', () => {
    expect(() =>
      PluginManifestSchema.parse({
        ...manifest('1.0.0'),
        tools: [manifest('1.0.0').tools[0], manifest('1.0.0').tools[0]]
      })
    ).toThrow()

    expect(() =>
      PluginManifestSchema.parse({
        ...manifest('1.0.0'),
        permissions: [],
        dependencies: ['fixture.versioned']
      })
    ).toThrow()
  })

  it('keeps multiple immutable versions and resolves the highest version deterministically', () => {
    const handler = vi.fn<PluginHandler>(async (_input, context) => ({
      status: 'succeeded',
      data: { version: context.versionId }
    }))
    const registry = new PluginRegistry()
      .register({ manifest: manifest('1.0.0'), handlers: { read: handler } })
      .register({ manifest: manifest('2.0.0'), handlers: { read: handler } })

    expect(registry.list()).toHaveLength(2)
    expect(registry.get('fixture.versioned', '1.0.0')?.manifest.version).toBe(
      '1.0.0'
    )
    expect(registry.get('fixture.versioned')?.manifest.version).toBe('2.0.0')

    const snapshot = registry.get('fixture.versioned', '1.0.0')
    if (!snapshot) throw new Error('Expected plugin snapshot')
    snapshot.manifest.tools[0]!.name = 'mutated'
    expect(
      registry.get('fixture.versioned', '1.0.0')?.manifest.tools[0]?.name
    ).toBe('read')
    expect(() =>
      registry.register({
        manifest: manifest('1.0.0'),
        handlers: { read: handler }
      })
    ).toThrow('already registered')
  })

  it('pins exact versions and fails closed when the pinned version is missing', async () => {
    const v1Handler = vi.fn<PluginHandler>(async () => ({
      status: 'succeeded',
      data: 'v1'
    }))
    const v2Handler = vi.fn<PluginHandler>(async () => ({
      status: 'succeeded',
      data: 'v2'
    }))
    const gateway = new CapabilityGateway(
      new PluginRegistry()
        .register({
          manifest: manifest('1.0.0'),
          handlers: { read: v1Handler }
        })
        .register({
          manifest: manifest('2.0.0'),
          handlers: { read: v2Handler }
        })
    )
    const base = {
      tenantId,
      agentId,
      versionId,
      toolName: 'read',
      input: { request: 'controlled' },
      actor: {
        id: 'operator.versioned',
        role: 'Admin',
        permissions: ['fixture:read']
      },
      policy: { decision: 'allowed' as const, reason: 'controlled' },
      dryRun: true
    }

    await expect(
      gateway.execute({ ...base, config: config('1.0.0') })
    ).resolves.toMatchObject({ status: 'succeeded', data: 'v1' })
    await expect(
      gateway.execute({ ...base, config: config() })
    ).resolves.toMatchObject({ status: 'succeeded', data: 'v2' })
    await expect(
      gateway.execute({ ...base, config: config('9.0.0') })
    ).resolves.toMatchObject({
      status: 'blocked',
      reason: 'plugin_version_not_registered'
    })
    expect(v1Handler).toHaveBeenCalledTimes(1)
    expect(v2Handler).toHaveBeenCalledTimes(1)
  })
})
