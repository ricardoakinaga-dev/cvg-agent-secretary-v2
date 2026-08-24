import { createDomainId, RunAgentTurnSchema } from '@cvg/shared'
import { evaluatePolicy } from '@cvg/policy'

export function runAgentTurn(rawInput: unknown) {
  const input = RunAgentTurnSchema.parse(rawInput)
  const policy = evaluatePolicy({
    action: 'run_agent_turn',
    autonomyLevel: input.autonomyLevel
  })
  return {
    agentRunId: createDomainId('run'),
    nextState: policy.decision === 'handoff' ? 'waiting_human' : 'active',
    proposedActions:
      policy.decision === 'allowed' ? ['classify_intent'] : ['handoff'],
    policy
  }
}
