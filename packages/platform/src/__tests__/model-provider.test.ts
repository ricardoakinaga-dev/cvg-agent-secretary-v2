import { describe, expect, it } from 'vitest'
import {
  AgentConfigSchema,
  createControlledModelProviderRegistry,
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
    expect(() => new ModelProviderRegistry([provider, provider])).toThrow(
      'already registered'
    )
    expect(registry.resolve('missing')).toBeNull()
    expect(Object.isFrozen(provider)).toBe(true)
    expect(Object.isFrozen(provider.supportedModels)).toBe(true)
    const listed = registry.list()
    listed.pop()
    expect(registry.list()).toHaveLength(1)
  })

  it('resolves only the exact identity from the compiled controlled registry', () => {
    const registry = createControlledModelProviderRegistry()

    expect(registry.resolveForConfig(model)).toBeInstanceOf(
      DeterministicModelProvider
    )
    expect(() =>
      registry.resolveForConfig({ ...model, provider: 'openai' })
    ).toThrow(/controlled|provider|model/i)
    expect(() =>
      registry.resolveForConfig({ ...model, model: 'deterministic-v2' })
    ).toThrow(/controlled|provider|model/i)
    expect(registry.list()).toHaveLength(1)
  })
})
