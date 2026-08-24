import { createHmac, timingSafeEqual } from 'node:crypto'
import { OperatorIdentitySchema, type OperatorIdentity } from '@cvg/shared'

export const TRUSTED_OPERATOR_TOKEN_HEADER = 'x-cvg-operator-token'
const TRUSTED_OPERATOR_TOKEN_AUDIENCE = 'cvg-api'
const DEFAULT_TOKEN_LIFETIME_SECONDS = 300
const DEFAULT_CLOCK_SKEW_SECONDS = 30

interface TrustedOperatorTokenClaims extends OperatorIdentity {
  aud: typeof TRUSTED_OPERATOR_TOKEN_AUDIENCE
  iat: number
  exp: number
}

export interface TrustedOperatorIdentityResolverOptions {
  secret: string
  now?: () => number
  maxLifetimeSeconds?: number
  clockSkewSeconds?: number
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
    exp: issuedAt + lifetimeSeconds
  }
  const encodedClaims = encodeJson(claims)
  return `${encodedClaims}.${sign(encodedClaims, secret)}`
}

export function createTrustedOperatorIdentityResolver(
  options: TrustedOperatorIdentityResolverOptions
): (headers: Record<string, unknown>) => OperatorIdentity {
  assertSigningSecret(options.secret)
  const now = options.now ?? Date.now
  const maxLifetimeSeconds =
    options.maxLifetimeSeconds ?? DEFAULT_TOKEN_LIFETIME_SECONDS
  const clockSkewSeconds =
    options.clockSkewSeconds ?? DEFAULT_CLOCK_SKEW_SECONDS
  assertTokenWindow(maxLifetimeSeconds, clockSkewSeconds)

  return (headers) => {
    const token = headers[TRUSTED_OPERATOR_TOKEN_HEADER]
    if (typeof token !== 'string' || token.trim() === '') {
      throw new Error('Trusted operator token is required')
    }
    const [encodedClaims, encodedSignature, ...extraParts] = token.split('.')
    if (!encodedClaims || !encodedSignature || extraParts.length > 0) {
      throw new Error('Trusted operator token format is invalid')
    }
    const expectedSignature = sign(encodedClaims, options.secret)
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8')
    const receivedBuffer = Buffer.from(encodedSignature, 'utf8')
    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
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
