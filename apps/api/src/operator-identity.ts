import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { OperatorIdentitySchema, type OperatorIdentity } from '@cvg/shared'

export const TRUSTED_OPERATOR_TOKEN_HEADER = 'x-cvg-operator-token'
const TRUSTED_OPERATOR_TOKEN_AUDIENCE = 'cvg-api'
const DEFAULT_TOKEN_LIFETIME_SECONDS = 300
const DEFAULT_CLOCK_SKEW_SECONDS = 30
const DEFAULT_REPLAY_CACHE_SIZE = 4_096
const MAX_REPLAY_CACHE_SIZE = 100_000

interface TrustedOperatorTokenClaims extends OperatorIdentity {
  aud: typeof TRUSTED_OPERATOR_TOKEN_AUDIENCE
  iat: number
  exp: number
  jti: string
}

export interface TrustedOperatorIdentityResolverOptions {
  /** Active secret first; previous secrets may remain during a bounded rotation. */
  secret: string | readonly string[]
  now?: () => number
  maxLifetimeSeconds?: number
  clockSkewSeconds?: number
  /** Maximum number of unexpired token IDs retained for replay protection. */
  replayCacheSize?: number
}

export function createTrustedOperatorIdentityToken(
  identity: OperatorIdentity,
  secret: string,
  now: () => number = Date.now,
  lifetimeSeconds = DEFAULT_TOKEN_LIFETIME_SECONDS
): string {
  assertSigningSecret(secret)
  assertTokenWindow(lifetimeSeconds, DEFAULT_CLOCK_SKEW_SECONDS)
  if (!identity.tenantId) {
    throw new Error('Trusted operator tokens require a tenant-bound identity')
  }

  const issuedAt = Math.floor(now() / 1000)
  const claims: TrustedOperatorTokenClaims = {
    ...OperatorIdentitySchema.parse(identity),
    aud: TRUSTED_OPERATOR_TOKEN_AUDIENCE,
    iat: issuedAt,
    exp: issuedAt + lifetimeSeconds,
    jti: `jti_${randomUUID()}`
  }
  const encodedClaims = encodeJson(claims)
  return `${encodedClaims}.${sign(encodedClaims, secret)}`
}

export function createTrustedOperatorIdentityResolver(
  options: TrustedOperatorIdentityResolverOptions
): (headers: Record<string, unknown>) => OperatorIdentity {
  const secrets = (
    Array.isArray(options.secret) ? options.secret : [options.secret]
  ).map((secret) => secret.trim())
  if (secrets.length === 0)
    throw new Error('At least one signing secret is required')
  secrets.forEach(assertSigningSecret)
  const now = options.now ?? Date.now
  const maxLifetimeSeconds =
    options.maxLifetimeSeconds ?? DEFAULT_TOKEN_LIFETIME_SECONDS
  const clockSkewSeconds =
    options.clockSkewSeconds ?? DEFAULT_CLOCK_SKEW_SECONDS
  const replayCacheSize = options.replayCacheSize ?? DEFAULT_REPLAY_CACHE_SIZE
  assertTokenWindow(maxLifetimeSeconds, clockSkewSeconds)
  assertReplayCacheSize(replayCacheSize)
  const replayedTokenIds = new Map<string, number>()

  return (headers) => {
    const token = headers[TRUSTED_OPERATOR_TOKEN_HEADER]
    if (typeof token !== 'string' || token.trim() === '') {
      throw new Error('Trusted operator token is required')
    }
    const [encodedClaims, encodedSignature, ...extraParts] = token.split('.')
    if (!encodedClaims || !encodedSignature || extraParts.length > 0) {
      throw new Error('Trusted operator token format is invalid')
    }
    const receivedBuffer = Buffer.from(encodedSignature, 'utf8')
    const signatureMatches = secrets.some((secret) => {
      const expectedBuffer = Buffer.from(sign(encodedClaims, secret), 'utf8')
      return (
        expectedBuffer.length === receivedBuffer.length &&
        timingSafeEqual(expectedBuffer, receivedBuffer)
      )
    })
    if (!signatureMatches) {
      throw new Error('Trusted operator token signature is invalid')
    }

    const claims = decodeClaims(encodedClaims)
    const identity = OperatorIdentitySchema.parse({
      operatorId: claims.operatorId,
      role: claims.role,
      tenantId: claims.tenantId
    })
    if (!identity.tenantId) {
      throw new Error('Trusted operator token must include a tenant')
    }
    if (
      claims.aud !== TRUSTED_OPERATOR_TOKEN_AUDIENCE ||
      !Number.isInteger(claims.iat) ||
      !Number.isInteger(claims.exp) ||
      !isTrustedOperatorTokenId(claims.jti) ||
      claims.exp <= claims.iat ||
      claims.exp - claims.iat > maxLifetimeSeconds
    ) {
      throw new Error('Trusted operator token claims are invalid')
    }

    const currentTime = Math.floor(now() / 1000)
    if (
      claims.iat > currentTime + clockSkewSeconds ||
      claims.exp <= currentTime
    ) {
      throw new Error('Trusted operator token is expired or not active')
    }

    pruneReplayedTokenIds(replayedTokenIds, currentTime)
    if (replayedTokenIds.has(claims.jti)) {
      throw new Error('Trusted operator token replay detected')
    }
    if (replayedTokenIds.size >= replayCacheSize) {
      throw new Error('Trusted operator replay cache is full')
    }
    replayedTokenIds.set(claims.jti, claims.exp)
    return identity
  }
}

function assertSigningSecret(secret: string): void {
  const normalized = secret.trim()
  if (
    normalized.length < 32 ||
    /replace[_-]?me|change[_-]?me|example/i.test(normalized)
  ) {
    throw new Error(
      'Trusted operator identity signing secret must contain at least 32 non-placeholder characters'
    )
  }
}

function assertTokenWindow(
  lifetimeSeconds: number,
  clockSkewSeconds: number
): void {
  if (
    !Number.isInteger(lifetimeSeconds) ||
    lifetimeSeconds <= 0 ||
    lifetimeSeconds > 900 ||
    !Number.isInteger(clockSkewSeconds) ||
    clockSkewSeconds < 0 ||
    clockSkewSeconds > 300
  ) {
    throw new Error('Trusted operator token window is invalid')
  }
}

function assertReplayCacheSize(size: number): void {
  if (
    !Number.isSafeInteger(size) ||
    size <= 0 ||
    size > MAX_REPLAY_CACHE_SIZE
  ) {
    throw new Error('Trusted operator replay cache size is invalid')
  }
}

function isTrustedOperatorTokenId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^jti_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      value
    )
  )
}

function pruneReplayedTokenIds(
  entries: Map<string, number>,
  currentTime: number
): void {
  for (const [jti, expiresAt] of entries) {
    if (expiresAt <= currentTime) entries.delete(jti)
  }
}

function encodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url')
}

function sign(encodedClaims: string, secret: string): string {
  return createHmac('sha256', secret.trim())
    .update(encodedClaims, 'utf8')
    .digest('base64url')
}

function decodeClaims(encodedClaims: string): TrustedOperatorTokenClaims {
  if (!/^[A-Za-z0-9_-]+$/.test(encodedClaims)) {
    throw new Error('Trusted operator token payload is invalid')
  }
  let decoded: unknown
  try {
    decoded = JSON.parse(
      Buffer.from(encodedClaims, 'base64url').toString('utf8')
    )
  } catch {
    throw new Error('Trusted operator token payload is invalid')
  }
  if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) {
    throw new Error('Trusted operator token claims are invalid')
  }
  return decoded as TrustedOperatorTokenClaims
}
