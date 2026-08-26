import { describe, expect, it, vi } from 'vitest'
import {
  createControlledCapabilityGateway,
  AgentConfigSchema
} from '@cvg/platform'
import { ToolRegistry } from '../registry.ts'
import {
  CONTROLLED_LEGACY_TOOL,
  ControlledLegacyToolAdapter
} from '../platform-adapter.ts'

const tenantId = 'tenant_00000000-0000-4000-8000-000000000121' as const
const agentId = 'agent_00000000-0000-4000-8000-000000000121' as const
const versionId = 'agent_version_00000000-0000-4000-8000-000000000121' as const

const config = AgentConfigSchema.parse({
  persona: { name: 'Fixture', role: 'secretary', tone: 'calm' },
  greeting: 'Fixture',
  promptBlocks: [],
  responseTemplates: {},
  model: {
    provider: 'fake',
    model: 'fixture',
    temperature: 0,
    maxTokens: 64,
    timeoutMs: 1000,
    retries: 0,
    secretRef: 'secret://controlled/adapter'
  },
  policies: {
    version: 'adapter-v1',
    minConfidence: 0.7,
    lowConfidence: 'handoff',
    maxClarifications: 1,
    enabledActions: ['respond'],
    approvalActions: [],
    blockedActions: []
  },
  plugins: [
    {
      plugin: 'scheduling.controlled',
      version: '1.0.0',
      enabled: true,
      allowedTools: ['find_available_slots'],
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

describe('controlled legacy tool adapter', () => {
  it('allowlists only the safe dry-run read and never executes unknown legacy handlers', async () => {
    const dangerousHandler = vi.fn(async () => ({
      status: 'succeeded' as const,
      data: 'side effect'
    }))
    const safeLegacyHandler = vi.fn(async () => ({
      status: 'succeeded' as const,
      data: 'legacy side effect'
    }))
    const registry = new ToolRegistry()
      .register('confirm_appointment', dangerousHandler)
      .register(CONTROLLED_LEGACY_TOOL, safeLegacyHandler)
    const adapter = new ControlledLegacyToolAdapter(
      registry,
      createControlledCapabilityGateway()
    )
    const base = {
      tenantId,
      agentId,
      versionId,
      config,
      actor: {
        id: 'system.fixture',
        role: 'System',
        permissions: ['scheduling:read']
      },
      policy: { decision: 'allowed' as const, reason: 'fixture' },
      input: { requestedDate: '2026-09-01' }
    }

    await expect(
      adapter.execute({
        ...base,
        toolName: 'confirm_appointment',
        dryRun: true
      })
    ).resolves.toMatchObject({
      status: 'blocked',
      reason: 'legacy_tool_not_allowlisted'
    })
    expect(dangerousHandler).not.toHaveBeenCalled()
    await expect(
      adapter.execute({
        ...base,
        toolName: CONTROLLED_LEGACY_TOOL,
        dryRun: false
      })
    ).resolves.toMatchObject({ status: 'blocked', reason: 'dry_run_required' })
    await expect(
      new ControlledLegacyToolAdapter(
        new ToolRegistry(),
        createControlledCapabilityGateway()
      ).execute({
        ...base,
        toolName: CONTROLLED_LEGACY_TOOL,
        dryRun: true
      })
    ).resolves.toMatchObject({
      status: 'blocked',
      reason: 'legacy_tool_not_registered'
    })
    await expect(
      adapter.execute({
        ...base,
        toolName: CONTROLLED_LEGACY_TOOL,
        dryRun: true
      })
    ).resolves.toMatchObject({ status: 'succeeded' })
    expect(safeLegacyHandler).not.toHaveBeenCalled()
  })
})
