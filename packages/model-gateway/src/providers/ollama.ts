import { z } from 'zod'
import { evaluateOutboundUrl } from '@cvg/shared'
import type {
  ModelProvider,
  ProviderRequest,
  ProviderResult
} from '../contracts.ts'
import { ModelProviderError } from '../errors.ts'
import {
  assertResponseSize,
  networkError,
  providerHttpError
} from './http-errors.ts'
import {
  DEFAULT_MAX_RESPONSE_BYTES,
  combineTimeoutSignal,
  type FetchLike
} from './openai-compatible.ts'

export interface OllamaProviderOptions {
  id?: string
  baseUrl?: string
  model: string
  apiKey?: string
  fetchImpl?: FetchLike
  maxResponseBytes?: number
  allowHttp?: boolean
}

const OllamaResponseSchema = z.object({
  message: z.object({ content: z.string().optional() }).optional(),
  response: z.string().optional(),
  prompt_eval_count: z.number().int().nonnegative().optional(),
  eval_count: z.number().int().nonnegative().optional(),
  done: z.boolean().optional()
})

/**
 * Local Ollama provider. Defaults to loopback; remote deployment must provide
 * an explicit base URL and API key. Never exposed publicly by default.
 */
export class OllamaProvider implements ModelProvider {
  readonly id: string
  readonly location = 'local' as const
  readonly models: readonly string[]
  readonly #baseUrl: string
  readonly #model: string
  readonly #apiKey?: string
  readonly #fetch: FetchLike
  readonly #maxResponseBytes: number
  readonly #allowedHosts: string[]

  constructor(options: OllamaProviderOptions) {
    const baseUrl = (options.baseUrl ?? 'http://127.0.0.1:11434')
      .trim()
      .replace(/\/+$/, '')
    const guard = evaluateOutboundUrl(baseUrl, {
      allowedHosts: [new URL(baseUrl).hostname.toLowerCase()],
      allowedProtocols: ['https:', 'http:']
    })
    if (!guard.allowed) {
      throw new ModelProviderError(
        options.id ?? 'ollama',
        'invalid_request',
        `Ollama base URL rejected: ${guard.reason}`
      )
    }
    this.id = options.id ?? 'ollama'
    this.models = [options.model]
    this.#baseUrl = baseUrl
    this.#model = options.model
    if (options.apiKey !== undefined) this.#apiKey = options.apiKey
    this.#fetch = options.fetchImpl ?? (globalThis.fetch as FetchLike)
    this.#maxResponseBytes =
      options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES
    this.#allowedHosts = [new URL(baseUrl).hostname.toLowerCase()]
  }

  async execute(request: ProviderRequest): Promise<ProviderResult> {
    const endpoint = `${this.#baseUrl}/api/chat`
    const guarded = evaluateOutboundUrl(endpoint, {
      allowedHosts: this.#allowedHosts,
      allowedProtocols: ['https:', 'http:']
    })
    if (!guarded.allowed) {
      throw new ModelProviderError(
        this.id,
        'invalid_request',
        `Ollama endpoint rejected: ${guarded.reason}`
      )
    }

    const signal = combineTimeoutSignal(request.signal, request.timeoutMs)
    const messages = [
      ...(request.input.system
        ? [{ role: 'system' as const, content: request.input.system }]
        : []),
      ...request.input.messages
    ]
    const body: Record<string, unknown> = {
      model: this.#model,
      messages,
      stream: false,
      options: {
        temperature: request.temperature,
        num_predict: request.maxTokens
      }
    }
    if (request.structuredSchemaName) {
      body.format = 'json'
    }

    let response: Response
    try {
      response = await this.#fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(this.#apiKey ? { authorization: `Bearer ${this.#apiKey}` } : {})
        },
        body: JSON.stringify(body),
        signal,
        redirect: 'error'
      })
    } catch (error) {
      throw networkError(this.id, error)
    }

    if (!response.ok) {
      throw providerHttpError(this.id, response.status)
    }

    let rawBody: string
    try {
      rawBody = await response.text()
    } catch (error) {
      throw networkError(this.id, error)
    }
    assertResponseSize(this.id, rawBody, this.#maxResponseBytes)

    let parsedJson: unknown
    try {
      parsedJson = JSON.parse(rawBody)
    } catch {
      throw new ModelProviderError(
        this.id,
        'malformed_response',
        'Ollama returned invalid JSON'
      )
    }
    const parsed = OllamaResponseSchema.safeParse(parsedJson)
    if (!parsed.success) {
      throw new ModelProviderError(
        this.id,
        'malformed_response',
        'Ollama response did not match the expected contract'
      )
    }
    const text = parsed.data.message?.content ?? parsed.data.response ?? ''
    return {
      text,
      usage: {
        inputTokens: parsed.data.prompt_eval_count ?? 0,
        outputTokens: parsed.data.eval_count ?? 0
      },
      providerId: this.id,
      model: this.#model,
      externalCall: false
    }
  }
}
