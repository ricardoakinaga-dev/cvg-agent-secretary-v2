import { describe, expect, it } from 'vitest'
import {
  AgentConfigSchema,
  DeterministicModelProvider,
  ModelProviderRegistry,
  createDryRunModelProvider
} from '../index.ts'

const model = AgentConfigSchema.shape.model.parse({
  provider: 'fake',
  model: 'deterministic-v1',
  temperature: 0,
  maxTokens: 128,
  timeoutMs: 1000,
  retries: 0,
  secretRef: 'secret://controlled/fake'
})

describe('model provider abstraction', () => {
  it('keeps dry-runs deterministic and external-call free', async () => {
    const provider = createDryRunModelProvider(model)
    await expect(
      provider.complete({
        prompt: 'system prompt',
        fallbackText: 'fake answer'
      })
    ).resolves.toEqual({
      text: 'fake answer',
      provider: 'fake',
      model: 'deterministic-v1',
      externalCall: false
    })
    expect(provider).toBeInstanceOf(DeterministicModelProvider)
  })

  it('registers providers immutably and rejects duplicate names', () => {
    const provider = createDryRunModelProvider(model)
    const registry = new ModelProviderRegistry().register(provider)
    expect(new ModelProviderRegistry().list()).toHaveLength(0)
    expect(registry.resolve('fake')).toBe(provider)
    expect(registry.list()).toEqual([provider])
    expect(() => registry.register(provider)).toThrow('already registered')
    expect(registry.resolve('missing')).toBeNull()
  })
})
