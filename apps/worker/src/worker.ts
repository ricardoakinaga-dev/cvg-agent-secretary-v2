import { runAgentTurn } from '@cvg/agent-core'

export async function processAgentTurnJob(input: {
  sessionId: string
  triggerMessageId: string
}) {
  return runAgentTurn({ ...input, autonomyLevel: 'level_2_suggest' })
}
