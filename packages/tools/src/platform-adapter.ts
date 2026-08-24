import { createCorrelationId } from '@cvg/shared'
import type {
  CapabilityExecutionInput,
  CapabilityExecutionResult,
  CapabilityGateway
} from '@cvg/platform'
import type { ToolRegistry } from './registry.ts'

export const CONTROLLED_LEGACY_TOOL = 'find_available_slots'

export type ControlledLegacyToolExecutionInput = Omit<
  CapabilityExecutionInput,
  'toolName'
> & {
  toolName: string
}

export class ControlledLegacyToolAdapter {
  constructor(
    private readonly legacyRegistry: ToolRegistry,
    private readonly gateway: CapabilityGateway
  ) {}

  async execute(
    input: ControlledLegacyToolExecutionInput
  ): Promise<CapabilityExecutionResult> {
    if (input.toolName !== CONTROLLED_LEGACY_TOOL) {
      return this.blocked('legacy_tool_not_allowlisted')
    }
    if (input.dryRun !== true) return this.blocked('dry_run_required')
    if (!this.legacyRegistry.has(input.toolName)) {
      return this.blocked('legacy_tool_not_registered')
    }
    return this.gateway.execute(input)
  }

  private blocked(reason: string): CapabilityExecutionResult {
    return { status: 'blocked', reason, correlationId: createCorrelationId() }
  }
}
