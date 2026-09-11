import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  createTrustedOperatorIdentityResolver,
  createTrustedOperatorIdentityToken
} from '../operator-identity.ts'

const NOW_MS = 1_700_000_000_000
const NOW_SECONDS = Math.floor(NOW_MS / 1000)
const SECRET = 'trusted-operator-signing-secret-for-tests'
const IDENTITY = {
  operatorId: 'operator.test',
  role: 'Supervisor' as const,
  tenantId: 'tenant_00000000-0000-4000-8000-000000000001'
}

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url')
}

function sign(encodedClaims: string, secret = SECRET): string {
  return createHmac('sha256', secret)
    .update(encodedClaims, 'utf8')
    .digest('base64url')
}

function signedToken(claims: unknown, secret = SECRET): string {
  const encodedClaims = encode(claims)
  return `${encodedClaims}.${sign(encodedClaims, secret)}`
}

function validClaims(overrides: Record<string, unknown> = {}) {
  return {
    ...IDENTITY,
    aud: 'cvg-api',
    iat: NOW_SECONDS,
    exp: NOW_SECONDS + 300,
    jti: 'jti_00000000-0000-4000-8000-000000000001',
    ...overrides
  }
}

describe('trusted operator identity tokens', () => {
  it('creates and resolves a tenant-bound identity token', () => {
    const token = createTrustedOperatorIdentityToken(
      IDENTITY,
      SECRET,
      () => NOW_MS,
      120
    )
    const resolve = createTrustedOperatorIdentityResolver({
      secret: SECRET,
      now: () => NOW_MS,
      maxLifetimeSeconds: 120,
      clockSkewSeconds: 30
    })

    expect(resolve({ 'x-cvg-operator-token': token })).toEqual(IDENTITY)
  })

  it('uses default resolver windows and accepts a token created with default lifetime', () => {
    const token = createTrustedOperatorIdentityToken(
      IDENTITY,
      SECRET,
      () => NOW_MS
    )
    const resolve = createTrustedOperatorIdentityResolver({
      secret: SECRET,
      now: () => NOW_MS
    })

    expect(resolve({ 'x-cvg-operator-token': token })).toEqual(IDENTITY)
  })

  it('accepts the previous secret only during an explicit rotation window', () => {
    const previous = 'previous-operator-secret-2026-long-enough-xxxxxxxx'
    const active = 'active-operator-secret-2026-long-enough-yyyyyyyy'
    const token = createTrustedOperatorIdentityToken(
      IDENTITY,
      previous,
      () => NOW_MS
    )
    const resolve = createTrustedOperatorIdentityResolver({
      secret: [active, previous],
      now: () => NOW_MS
    })
    expect(resolve({ 'x-cvg-operator-token': token })).toEqual(IDENTITY)
    expect(() => createTrustedOperatorIdentityResolver({ secret: [] })).toThrow(
      /secret/
    )
  })

  it('rejects a replayed token while accepting a distinct token ID', () => {
    const resolve = createTrustedOperatorIdentityResolver({
      secret: SECRET,
      now: () => NOW_MS
    })
    const token = createTrustedOperatorIdentityToken(
      IDENTITY,
      SECRET,
      () => NOW_MS
    )

    expect(resolve({ 'x-cvg-operator-token': token })).toEqual(IDENTITY)
    expect(() => resolve({ 'x-cvg-operator-token': token })).toThrow(/replay/i)

    const distinctToken = createTrustedOperatorIdentityToken(
      IDENTITY,
      SECRET,
      () => NOW_MS
    )
    expect(resolve({ 'x-cvg-operator-token': distinctToken })).toEqual(IDENTITY)
  })

  it('expires replay entries and fails closed when the bounded cache is full', () => {
    let now = NOW_MS
    const resolve = createTrustedOperatorIdentityResolver({
      secret: SECRET,
      now: () => now,
      replayCacheSize: 1
    })
    const first = createTrustedOperatorIdentityToken(
      IDENTITY,
      SECRET,
      () => now,
      1
    )
    const second = createTrustedOperatorIdentityToken(
      IDENTITY,
      SECRET,
      () => now,
      1
    )

    expect(resolve({ 'x-cvg-operator-token': first })).toEqual(IDENTITY)
    expect(() => resolve({ 'x-cvg-operator-token': second })).toThrow(/full/i)

    now += 2_000
    const postExpiryToken = createTrustedOperatorIdentityToken(
      IDENTITY,
      SECRET,
      () => now,
      1
    )
    expect(resolve({ 'x-cvg-operator-token': postExpiryToken })).toEqual(
      IDENTITY
    )
    expect(() => resolve({ 'x-cvg-operator-token': postExpiryToken })).toThrow(
      /replay/i
    )
  })

  it('rejects weak or placeholder signing secrets', () => {
    expect(() =>
      createTrustedOperatorIdentityToken(IDENTITY, 'too-short')
    ).toThrow(/signing secret/)
    expect(() =>
      createTrustedOperatorIdentityToken(
        IDENTITY,
        'replace_me_with_a_long_but_invalid_secret'
      )
    ).toThrow(/signing secret/)
    expect(() =>
      createTrustedOperatorIdentityResolver({ secret: 'too-short' })
    ).toThrow(/signing secret/)
  })

  it('rejects identities without a tenant and invalid token windows', () => {
    expect(() =>
      createTrustedOperatorIdentityToken(IDENTITYWithoutTenant, SECRET)
    ).toThrow(/tenant-bound/)
    expect(() =>
      createTrustedOperatorIdentityToken(IDENTITY, SECRET, () => NOW_MS, 0)
    ).toThrow(/token window/)
    expect(() =>
      createTrustedOperatorIdentityResolver({
        secret: SECRET,
        maxLifetimeSeconds: 901
      })
    ).toThrow(/token window/)
    expect(() =>
      createTrustedOperatorIdentityResolver({
        secret: SECRET,
        clockSkewSeconds: -1
      })
    ).toThrow(/token window/)
    expect(() =>
      createTrustedOperatorIdentityResolver({
        secret: SECRET,
        replayCacheSize: 0
      })
    ).toThrow(/replay cache/)
  })

  it('rejects missing, malformed, and tampered headers', () => {
    const resolve = createTrustedOperatorIdentityResolver({
      secret: SECRET,
      now: () => NOW_MS
    })
    const token = signedToken(validClaims())
    const sameLengthBadSignature = `${'a'.repeat(sign(token.split('.')[0]!).length)}`

    expect(() => resolve({})).toThrow(/required/)
    expect(() => resolve({ 'x-cvg-operator-token': '   ' })).toThrow(/required/)
    expect(() => resolve({ 'x-cvg-operator-token': ['not-a-token'] })).toThrow(
      /required/
    )
    expect(() =>
      resolve({ 'x-cvg-operator-token': 'missing-separator' })
    ).toThrow(/format/)
    expect(() => resolve({ 'x-cvg-operator-token': `${token}.extra` })).toThrow(
      /format/
    )
    expect(() =>
      resolve({
        'x-cvg-operator-token': `${token.split('.')[0]}.${sameLengthBadSignature}`
      })
    ).toThrow(/signature/)
    expect(() =>
      resolve({
        'x-cvg-operator-token': `${token.split('.')[0]}.wrong`
      })
    ).toThrow(/signature/)
  })

  it('rejects invalid encoded claims and invalid identity claims', () => {
    const resolve = createTrustedOperatorIdentityResolver({
      secret: SECRET,
      now: () => NOW_MS
    })
    const invalidEncoding = 'not*base64url'

    expect(() =>
      resolve({
        'x-cvg-operator-token': `${invalidEncoding}.${sign(invalidEncoding)}`
      })
    ).toThrow(/payload/)
    const malformedJson = Buffer.from('not-json', 'utf8').toString('base64url')
    expect(() =>
      resolve({
        'x-cvg-operator-token': `${malformedJson}.${sign(malformedJson)}`
      })
    ).toThrow(/payload/)
    expect(() => resolve({ 'x-cvg-operator-token': signedToken([]) })).toThrow(
      /claims/
    )
    expect(() =>
      resolve({
        'x-cvg-operator-token': signedToken(validClaims({ role: 'Invalid' }))
      })
    ).toThrow()
    expect(() =>
      resolve({
        'x-cvg-operator-token': signedToken(
          validClaims({ tenantId: undefined })
        )
      })
    ).toThrow(/tenant/)
    expect(() =>
      resolve({
        'x-cvg-operator-token': signedToken(validClaims({ jti: undefined }))
      })
    ).toThrow(/claims/)
  })

  it('rejects invalid audience, time claims, future tokens, and expired tokens', () => {
    const resolve = createTrustedOperatorIdentityResolver({
      secret: SECRET,
      now: () => NOW_MS,
      maxLifetimeSeconds: 300,
      clockSkewSeconds: 30
    })

    expect(() =>
      resolve({
        'x-cvg-operator-token': signedToken(validClaims({ aud: 'other-api' }))
      })
    ).toThrow(/claims/)
    expect(() =>
      resolve({
        'x-cvg-operator-token': signedToken(validClaims({ exp: NOW_SECONDS }))
      })
    ).toThrow(/claims/)
    expect(() =>
      resolve({
        'x-cvg-operator-token': signedToken(
          validClaims({ exp: NOW_SECONDS + 301 })
        )
      })
    ).toThrow(/claims/)
    expect(() =>
      resolve({
        'x-cvg-operator-token': signedToken(
          validClaims({ iat: NOW_SECONDS + 31, exp: NOW_SECONDS + 100 })
        )
      })
    ).toThrow(/expired or not active/)
    expect(() =>
      resolve({
        'x-cvg-operator-token': signedToken(
          validClaims({ iat: NOW_SECONDS - 301, exp: NOW_SECONDS - 1 })
        )
      })
    ).toThrow(/expired or not active/)
  })
})

const IDENTITYWithoutTenant = {
  operatorId: IDENTITY.operatorId,
  role: IDENTITY.role
}
