import {
  CapabilityGateway,
  PluginRegistry,
  type CapabilityGatewayOptions,
  type RegisteredPlugin
} from './plugin-gateway.ts'

export const CONTROLLED_SCHEDULING_PLUGIN = 'scheduling.controlled'
export const CONTROLLED_SCHEDULING_TOOL = 'find_available_slots'

export function createControlledSchedulingPlugin(): RegisteredPlugin {
  return {
    manifest: {
      name: CONTROLLED_SCHEDULING_PLUGIN,
      version: '1.0.0',
      capabilities: ['scheduling.read'],
      permissions: ['scheduling:read'],
      tools: [
        {
          name: CONTROLLED_SCHEDULING_TOOL,
          permission: 'scheduling:read',
          risk: 'low',
          requiresApproval: false
        }
      ],
      hooks: [],
      dependencies: [],
      configSchemaVersion: '1'
    },
    handlers: {
      [CONTROLLED_SCHEDULING_TOOL]: (_input, context) => ({
        status: 'succeeded',
        data: {
          slots: ['2026-09-01T10:00:00-03:00', '2026-09-01T14:00:00-03:00'],
          controlled: true,
          dryRun: context.dryRun
        }
      })
    }
  }
}

export function createControlledCapabilityGateway(
  options: CapabilityGatewayOptions = {}
): CapabilityGateway {
  return new CapabilityGateway(
    new PluginRegistry().register(createControlledSchedulingPlugin()),
    options
  )
}
