import { processAgentTurnJob } from './worker.ts'

void processAgentTurnJob({
  sessionId: 'sess_bootstrap',
  triggerMessageId: 'msg_bootstrap'
})
