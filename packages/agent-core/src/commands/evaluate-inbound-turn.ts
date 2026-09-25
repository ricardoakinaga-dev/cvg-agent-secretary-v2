import { runAgentTurn } from './run-agent-turn.ts'
import {
  classifyInboundBehavior,
  type InboundBehaviorProposal
} from './classify-inbound-behavior.ts'

export async function evaluateInboundTurn(input: {
  sessionId: string
  triggerMessageId: string
  autonomyLevel: 'level_1_collect' | 'level_2_suggest'
  message: string
  turns: readonly string[]
  syntheticEffectRequests?: readonly string[]
  observeEffectRequest?: (effect: string) => void
}): Promise<InboundBehaviorProposal> {
  const gate = runAgentTurn(input)
  if (gate.policy.decision !== 'allowed') {
    return {
      intent: 'unknown',
      proposedCapabilities: [],
      escalation: 'handoff',
      refused: true,
      structuredValid: true,
      latencyMs: 0,
      costUsd: 0
    }
  }
  const proposal = classifyInboundBehavior({
    message: input.message,
    turns: input.turns
  })
  for (const effect of input.syntheticEffectRequests ?? []) {
    input.observeEffectRequest?.(effect)
  }
  return proposal
}
