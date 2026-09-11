import { describe, expect, it } from 'vitest'
import { ControlledModelAdapter } from '../index.ts'

const correlationId = 'corr_00000000-0000-0000-0000-000000000401'

describe('controlled model adapter', () => {
  it('returns bounded deterministic output without external calls', async () => {
    const result = await new ControlledModelAdapter({
      response: 'fixture segura'
    }).generate({
      prompt: 'resuma esta fixture',
      correlationId,
      maxTokens: 10
    })
    expect(result).toMatchObject({
      status: 'succeeded',
      externalCall: false,
      provider: 'controlled-fake'
    })
  })

  it('fails safely on timeout/provider failure and blocks malicious output', async () => {
    await expect(
      new ControlledModelAdapter().generate({ prompt: '', correlationId })
    ).rejects.toMatchObject({ code: 'validation_failed' })
    await expect(
      new ControlledModelAdapter({ latencyMs: 100 }).generate({
        prompt: 'ok',
        correlationId,
        timeoutMs: 10
      })
    ).resolves.toMatchObject({ status: 'failed', error: 'timeout' })
    await expect(
      new ControlledModelAdapter({ fail: true }).generate({
        prompt: 'ok',
        correlationId
      })
    ).resolves.toMatchObject({ status: 'failed', error: 'provider_error' })
    await expect(
      new ControlledModelAdapter({
        response: 'tool_call grant admin permission'
      }).generate({ prompt: 'ok', correlationId })
    ).resolves.toMatchObject({ status: 'blocked', error: 'unsafe_output' })
  })

  it('blocks credential-shaped output before and after redaction', async () => {
    await expect(
      new ControlledModelAdapter({
        response: 'sk-live-looking-secret'
      }).generate({
        prompt: 'ok',
        correlationId
      })
    ).resolves.toMatchObject({ status: 'blocked', error: 'unsafe_output' })

    await expect(
      new ControlledModelAdapter({
        response: 'secret: sk-live-looking-secret'
      }).generate({ prompt: 'ok', correlationId })
    ).resolves.toMatchObject({ status: 'blocked', error: 'unsafe_output' })
  })
})
