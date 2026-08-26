import { createCorrelationId, fail } from '@cvg/shared'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { CORRELATION_RESPONSE_HEADER } from './response-correlation.ts'

export const HTTP_SECURITY_ALLOWED_METHODS = [
  'GET',
  'POST',
  'PATCH',
  'OPTIONS'
] as const

export const HTTP_SECURITY_ALLOWED_HEADERS = [
  'accept',
  'content-type',
  'x-cvg-operator-token',
  'x-operator-id',
  'x-operator-role',
  'x-tenant-id',
  'x-cvg-webhook-id',
  'x-cvg-webhook-signature',
  'x-cvg-webhook-timestamp'
] as const

const DEFAULT_HSTS_MAX_AGE_SECONDS = 31_536_000
const HSTS_MIN_AGE_SECONDS = 300
const HSTS_MAX_AGE_SECONDS = 31_536_000
const MAX_TRUSTED_PROXY_HOPS = 4
const CORS_MAX_AGE_SECONDS = 600

export const API_CONTENT_SECURITY_POLICY =
  "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"

export interface HttpSecurityOptions {
  allowedOrigins?: readonly string[]
  enforceHttps?: boolean
  trustedProxyHops?: number
  hstsMaxAgeSeconds?: number
}

export interface NormalizedHttpSecurityOptions {
  allowedOrigins: readonly string[]
  enforceHttps: boolean
  trustedProxyHops: number
  hstsMaxAgeSeconds: number
}

export function normalizeOrigin(rawOrigin: string): string {
  const value = rawOrigin.trim()
  if (!value || value === '*' || value.toLowerCase() === 'null') {
    throw new Error('HTTP security origin is invalid')
  }

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error('HTTP security origin is invalid')
  }

  if (
    !['http:', 'https:'].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== '/' ||
    parsed.search ||
    parsed.hash ||
    parsed.origin === 'null'
  ) {
    throw new Error('HTTP security origin is invalid')
  }

  return parsed.origin
}

export function parseAllowedOrigins(rawOrigins?: string): string[] {
  if (rawOrigins === undefined || rawOrigins.trim() === '') return []
  const values = rawOrigins.split(',').map((origin) => origin.trim())
  if (values.some((origin) => origin.length === 0)) {
    throw new Error('API_ALLOWED_ORIGINS contains an empty origin')
  }
  return [...new Set(values.map(normalizeOrigin))]
}

export function normalizeHttpSecurityOptions(
  options: HttpSecurityOptions = {}
): NormalizedHttpSecurityOptions {
  const allowedOrigins = [
    ...new Set((options.allowedOrigins ?? []).map(normalizeOrigin))
  ]
  const enforceHttps = options.enforceHttps ?? false
  const trustedProxyHops = options.trustedProxyHops ?? 0
  const hstsMaxAgeSeconds =
    options.hstsMaxAgeSeconds ?? DEFAULT_HSTS_MAX_AGE_SECONDS

  if (
    !Number.isInteger(trustedProxyHops) ||
    trustedProxyHops < 0 ||
    trustedProxyHops > MAX_TRUSTED_PROXY_HOPS
  ) {
    throw new Error('trustedProxyHops must be an integer between 0 and 4')
  }
  if (
    !Number.isInteger(hstsMaxAgeSeconds) ||
    hstsMaxAgeSeconds < HSTS_MIN_AGE_SECONDS ||
    hstsMaxAgeSeconds > HSTS_MAX_AGE_SECONDS
  ) {
    throw new Error('hstsMaxAgeSeconds is outside the allowed range')
  }

  return {
    allowedOrigins,
    enforceHttps,
    trustedProxyHops,
    hstsMaxAgeSeconds
  }
}

export function parseHttpSecurityEnv(
  env: NodeJS.ProcessEnv,
  overrides: HttpSecurityOptions = {}
): NormalizedHttpSecurityOptions {
  if (env.NODE_ENV === 'production') {
    const allowedOrigins = parseAllowedOrigins(env.API_ALLOWED_ORIGINS)
    const requireHttps = parseBooleanEnv(env.API_REQUIRE_HTTPS, false)
    if (allowedOrigins.length === 0) {
      throw new Error(
        'Production requires a non-empty API_ALLOWED_ORIGINS allowlist'
      )
    }
    if (!requireHttps) {
      throw new Error('Production requires API_REQUIRE_HTTPS=true')
    }
    return normalizeHttpSecurityOptions({
      allowedOrigins,
      enforceHttps: true,
      trustedProxyHops: parseTrustedProxyHops(env.API_TRUSTED_PROXY_HOPS)
    })
  }

  return normalizeHttpSecurityOptions({
    ...overrides,
    ...(env.API_ALLOWED_ORIGINS !== undefined
      ? { allowedOrigins: parseAllowedOrigins(env.API_ALLOWED_ORIGINS) }
      : {}),
    ...(env.API_REQUIRE_HTTPS !== undefined
      ? { enforceHttps: parseBooleanEnv(env.API_REQUIRE_HTTPS, false) }
      : {}),
    ...(env.API_TRUSTED_PROXY_HOPS !== undefined
      ? { trustedProxyHops: parseTrustedProxyHops(env.API_TRUSTED_PROXY_HOPS) }
      : {})
  })
}

export function installHttpSecurityHooks(
  app: FastifyInstance,
  options: NormalizedHttpSecurityOptions
): void {
  app.addHook('onRequest', async (request, reply) => {
    if (options.enforceHttps && request.protocol !== 'https') {
      reply.code(426).header('upgrade', 'TLS/1.2')
      return reply.send(
        fail(
          'secure_transport_required',
          'Secure transport is required',
          createCorrelationId()
        )
      )
    }

    const originResult = readOrigin(request)
    if (!originResult.valid) {
      return sendForbidden(reply, 'Origin header is invalid')
    }

    if (request.method === 'OPTIONS') {
      const preflight = validatePreflight(request, originResult.origin, options)
      if (!preflight.valid || !preflight.origin) {
        return sendForbidden(reply, 'CORS preflight is not allowed')
      }
      applyCorsHeaders(reply, preflight.origin, true)
      reply.code(204)
      return reply.send()
    }

    if (originResult.origin) {
      if (!options.allowedOrigins.includes(originResult.origin)) {
        return sendForbidden(reply, 'Origin is not allowed')
      }
      applyCorsHeaders(reply, originResult.origin, false)
    }
  })

  app.addHook('onSend', async (request, reply, payload) => {
    reply.header('content-security-policy', API_CONTENT_SECURITY_POLICY)
    reply.header('x-content-type-options', 'nosniff')
    reply.header('x-frame-options', 'DENY')
    reply.header('referrer-policy', 'no-referrer')
    reply.header('x-permitted-cross-domain-policies', 'none')
    if (request.protocol === 'https') {
      reply.header(
        'strict-transport-security',
        `max-age=${options.hstsMaxAgeSeconds}`
      )
    }
    return payload
  })
}

function readOrigin(request: FastifyRequest): {
  valid: boolean
  origin: string | null
} {
  const rawOrigin = request.headers.origin
  if (rawOrigin === undefined) return { valid: true, origin: null }
  if (Array.isArray(rawOrigin) || typeof rawOrigin !== 'string') {
    return { valid: false, origin: null }
  }
  try {
    return { valid: true, origin: normalizeOrigin(rawOrigin) }
  } catch {
    return { valid: false, origin: null }
  }
}

function validatePreflight(
  request: FastifyRequest,
  origin: string | null,
  options: NormalizedHttpSecurityOptions
): { valid: boolean; origin: string | null } {
  if (!origin || !options.allowedOrigins.includes(origin)) {
    return { valid: false, origin: null }
  }
  const requestedMethod = readSingleHeader(
    request.headers['access-control-request-method']
  )
  if (
    !requestedMethod ||
    !HTTP_SECURITY_ALLOWED_METHODS.includes(
      requestedMethod.toUpperCase() as (typeof HTTP_SECURITY_ALLOWED_METHODS)[number]
    )
  ) {
    return { valid: false, origin: null }
  }

  const rawHeaders = request.headers['access-control-request-headers']
  if (rawHeaders !== undefined) {
    const requestedHeaders = readSingleHeader(rawHeaders)
    if (!requestedHeaders) return { valid: false, origin: null }
    const allAllowed = requestedHeaders
      .split(',')
      .map((header) => header.trim().toLowerCase())
      .every((header) =>
        (HTTP_SECURITY_ALLOWED_HEADERS as readonly string[]).includes(header)
      )
    if (!allAllowed) return { valid: false, origin: null }
  }

  return { valid: true, origin }
}

function applyCorsHeaders(
  reply: FastifyReply,
  origin: string,
  preflight: boolean
): void {
  reply.header('access-control-allow-origin', origin)
  reply.header('vary', 'Origin')
  if (!preflight) {
    reply.header('access-control-expose-headers', CORRELATION_RESPONSE_HEADER)
    return
  }
  reply.header(
    'access-control-allow-methods',
    HTTP_SECURITY_ALLOWED_METHODS.join(', ')
  )
  reply.header(
    'access-control-allow-headers',
    HTTP_SECURITY_ALLOWED_HEADERS.join(', ')
  )
  reply.header('access-control-max-age', String(CORS_MAX_AGE_SECONDS))
}

function sendForbidden(reply: FastifyReply, message: string) {
  reply.code(403)
  return reply.send(fail('forbidden', message, createCorrelationId()))
}

function readSingleHeader(value: unknown): string | null {
  if (Array.isArray(value) || typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized ? normalized : null
}

function parseBooleanEnv(
  value: string | undefined,
  fallback: boolean
): boolean {
  if (value === undefined) return fallback
  if (value === 'true') return true
  if (value === 'false') return false
  throw new Error('HTTP security boolean environment value is invalid')
}

function parseTrustedProxyHops(value: string | undefined): number {
  if (value === undefined) return 0
  if (!/^\d+$/.test(value)) {
    throw new Error('API_TRUSTED_PROXY_HOPS must be an integer between 0 and 4')
  }
  const hops = Number(value)
  if (!Number.isSafeInteger(hops) || hops > MAX_TRUSTED_PROXY_HOPS) {
    throw new Error('API_TRUSTED_PROXY_HOPS must be an integer between 0 and 4')
  }
  return hops
}
