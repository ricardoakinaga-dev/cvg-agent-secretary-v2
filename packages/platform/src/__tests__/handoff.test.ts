import { describe, expect, it } from 'vitest'
import { canBotRespond, transitionHumanTakeover } from '../handoff.ts'

describe('human takeover state machine', () => {
  it('moves through request, human ownership, resolution and bot release', () => {
    const requested = transitionHumanTakeover('BOT_ACTIVE', 'request_handoff')
    const active = transitionHumanTakeover(requested, 'accept_handoff')
    const resolved = transitionHumanTakeover(active, 'resolve_handoff')
    const released = transitionHumanTakeover(resolved, 'release_to_bot')

    expect(requested).toBe('HANDOFF_REQUESTED')
    expect(active).toBe('HUMAN_ACTIVE')
    expect(resolved).toBe('RESOLVED')
    expect(released).toBe('BOT_ACTIVE')
    expect(canBotRespond(requested)).toBe(false)
    expect(canBotRespond(active)).toBe(false)
    expect(canBotRespond(resolved)).toBe(false)
    expect(canBotRespond(released)).toBe(true)
  })

  it('rejects events that would bypass human ownership', () => {
    expect(() =>
      transitionHumanTakeover('BOT_ACTIVE', 'resolve_handoff')
    ).toThrow('Takeover cannot transition')
    expect(() =>
      transitionHumanTakeover('HUMAN_ACTIVE', 'release_to_bot')
    ).toThrow('Takeover cannot transition')
  })
})
