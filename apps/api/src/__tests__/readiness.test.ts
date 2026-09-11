import { describe, expect, it } from 'vitest'
import { evaluateReadiness } from '../readiness.ts'

describe('readiness probe', () => {
  it('is ready for production only with durable PostgreSQL configuration', () => {
    const result = evaluateReadiness({
      persistenceMode: 'postgres',
      durableInbound: true,
      production: true
    })
    expect(result.ready).toBe(true)
    expect(result.checks.every((check) => check.status === 'ok')).toBe(true)
  })

  it('fails closed in production with memory persistence or inline inbound', () => {
    expect(
      evaluateReadiness({
        persistenceMode: 'memory',
        durableInbound: true,
        production: true
      }).ready
    ).toBe(false)
    expect(
      evaluateReadiness({
        persistenceMode: 'postgres',
        durableInbound: false,
        production: true
      }).ready
    ).toBe(false)
  })

  it('marks non-production memory mode as degraded but ready', () => {
    const result = evaluateReadiness({
      persistenceMode: 'memory',
      durableInbound: false,
      production: false
    })
    expect(result.ready).toBe(true)
    expect(
      result.checks.filter((check) => check.status === 'degraded')
    ).toHaveLength(2)
  })
})
