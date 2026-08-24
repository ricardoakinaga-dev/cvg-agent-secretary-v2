import { describe, expect, it } from 'vitest'
import { runSchedulingDraftWorkflow } from '../index.ts'

describe('scheduling draft flow', () => {
  it('keeps scheduling as draft and blocks real confirmation or cancellation', () => {
    const result = runSchedulingDraftWorkflow()

    expect(result.nextState).toBe('waiting_approval')
    expect(result.proposedActions).toContain('request_human_approval')
    expect(result.blockedActions).toEqual(
      expect.arrayContaining(['confirm_appointment', 'cancel_appointment'])
    )
  })
})
