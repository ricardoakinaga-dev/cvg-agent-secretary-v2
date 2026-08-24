import type { ModelConfig } from './contracts.ts'

export interface ModelProviderRequest {
  prompt: string
  fallbackText: string
}

export interface ModelProviderResponse {
  text: string
  provider: string
  model: string
  externalCall: false
}

export interface ModelProvider {
  readonly name: string
  complete(input: ModelProviderRequest): Promise<ModelProviderResponse>
}

export class DeterministicModelProvider implements ModelProvider {
  readonly name: string

  constructor(private readonly config: ModelConfig) {
    this.name = config.provider
  }

  async complete(input: ModelProviderRequest): Promise<ModelProviderResponse> {
    void input.prompt
    return {
      text: input.fallbackText,
      provider: this.config.provider,
      model: this.config.model,
      externalCall: false
    }
  }
}

export class ModelProviderRegistry {
  private readonly providers: ModelProvider[]

  constructor(providers: ModelProvider[] = []) {
    this.providers = [...providers]
  }

  register(provider: ModelProvider): ModelProviderRegistry {
    if (this.resolve(provider.name)) {
      throw new Error(`Model provider already registered: ${provider.name}`)
    }
    return new ModelProviderRegistry([...this.providers, provider])
  }

  resolve(name: string): ModelProvider | null {
    return this.providers.find((provider) => provider.name === name) ?? null
  }

  list(): ModelProvider[] {
    return [...this.providers]
  }
}

export function createDryRunModelProvider(config: ModelConfig): ModelProvider {
  return new DeterministicModelProvider(config)
}
