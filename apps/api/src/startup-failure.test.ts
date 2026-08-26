import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  STARTUP_FAILURE_EVENT,
  STARTUP_FAILURE_MAX_MESSAGE_LENGTH,
  formatStartupFailure,
  serializeStartupFailure
} from './startup-failure.ts'

describe('controlled startup failure boundary', () => {
  it('keeps an actionable bootstrap message when it contains no sensitive data', () => {
    expect(formatStartupFailure(new Error('DATABASE_URL is required'))).toEqual(
      {
        event: STARTUP_FAILURE_EVENT,
        code: 'startup_failed',
        message: 'DATABASE_URL is required'
      }
    )
  })

  it('redacts credentials from connection URLs and key-value diagnostics', () => {
    const result = formatStartupFailure(
      new Error(
        'connect postgresql://operator:super-secret@db.example.test/cvg?password=query-secret password=plain-secret secret:another-secret token=token-value apiKey=api-value {"password":"json-secret"}'
      )
    )

    expect(result.message).not.toContain('super-secret')
    expect(result.message).not.toContain('query-secret')
    expect(result.message).not.toContain('plain-secret')
    expect(result.message).not.toContain('another-secret')
    expect(result.message).not.toContain('token-value')
    expect(result.message).not.toContain('api-value')
    expect(result.message).not.toContain('json-secret')
    expect(result.message).toContain('[redacted]')
  })

  it('redacts bearer/basic credentials and existing PII classes', () => {
    const result = formatStartupFailure(
      new Error(
        'Authorization Bearer very-secret-token Basic dXNlcjpwYXNz; contact ana@example.com +5511999999999'
      )
    )

    expect(result.message).not.toContain('very-secret-token')
    expect(result.message).not.toContain('dXNlcjpwYXNz')
    expect(result.message).not.toContain('ana@example.com')
    expect(result.message).not.toContain('+5511999999999')
  })

  it('normalizes log controls and bounds oversized messages', () => {
    const result = formatStartupFailure(
      new Error(`line one\n{"event":"forged"}\r\n${'x'.repeat(2000)}`)
    )

    expect(result.message).not.toMatch(/[\r\n]/)
    expect(result.message.length).toBeLessThanOrEqual(
      STARTUP_FAILURE_MAX_MESSAGE_LENGTH
    )
    expect(serializeStartupFailure(new Error(result.message))).not.toContain(
      '"event":"forged"'
    )
  })

  it('uses generic output for validation and unknown failures', () => {
    const validationError = (() => {
      try {
        z.object({ required: z.string() }).parse({ required: 42 })
        throw new Error('unreachable')
      } catch (error) {
        return error
      }
    })()
    const unknown = { stack: 'secret stack', cause: 'secret cause' }

    expect(formatStartupFailure(validationError)).toEqual({
      event: STARTUP_FAILURE_EVENT,
      code: 'configuration_invalid',
      message: 'Startup configuration is invalid'
    })
    expect(formatStartupFailure(unknown)).toEqual({
      event: STARTUP_FAILURE_EVENT,
      code: 'startup_failed',
      message: 'API startup failed'
    })
    expect(JSON.stringify(formatStartupFailure(unknown))).not.toContain(
      'secret'
    )
  })

  it('fails safely when an Error-like value exposes a non-string message', () => {
    const malformed = Object.create(Error.prototype) as Error
    Object.defineProperty(malformed, 'message', { value: 42 })

    expect(formatStartupFailure(malformed)).toEqual({
      event: STARTUP_FAILURE_EVENT,
      code: 'startup_failed',
      message: 'API startup failed'
    })
  })

  it('serializes only the bounded public failure contract', () => {
    const serialized = serializeStartupFailure(
      Object.assign(new Error('safe failure'), {
        stack: 'private stack',
        cause: 'private cause'
      })
    )

    expect(serialized).not.toMatch(/[\r\n]/)
    expect(JSON.parse(serialized)).toEqual({
      event: STARTUP_FAILURE_EVENT,
      code: 'startup_failed',
      message: 'safe failure'
    })
    expect(serialized).not.toContain('private stack')
    expect(serialized).not.toContain('private cause')
  })

  it('uses the safe formatter at the API entrypoint', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'apps/api/src/main.ts'),
      'utf8'
    )

    expect(source).toContain('serializeStartupFailure(error)')
    expect(source).toContain('process.exit(1)')
    expect(source).not.toContain('console.error(error)')
  })
})
