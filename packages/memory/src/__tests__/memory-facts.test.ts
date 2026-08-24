import { describe, expect, it } from 'vitest'
import { createApprovedMemoryFact } from '../index.ts'

describe('memory facts', () => {
  it('creates approved facts without mutating input payloads', () => {
    const input = {
      subjectId: 'owner_1',
      key: 'preferred_channel',
      value: 'whatsapp'
    }
    const fact = createApprovedMemoryFact(input)

    expect(fact).toEqual({ ...input, approved: true })
    expect(input).not.toHaveProperty('approved')
  })
})
