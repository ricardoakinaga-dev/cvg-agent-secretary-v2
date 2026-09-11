import { describe, expect, it } from 'vitest'
import {
  CANONICAL_JSON_MAX_DEPTH,
  CanonicalJsonError,
  canonicalizeJson
} from '../canonical.ts'

describe('canonicalizeJson', () => {
  it('sorts object keys deterministically regardless of insertion order', () => {
    const left = canonicalizeJson({ b: 2, a: 1, nested: { z: true, a: null } })
    const right = canonicalizeJson({ nested: { a: null, z: true }, a: 1, b: 2 })
    expect(left).toBe(right)
    expect(left).toBe('{"a":1,"b":2,"nested":{"a":null,"z":true}}')
  })

  it('preserves array order and maps undefined entries to null', () => {
    expect(canonicalizeJson([1, undefined, 'x'])).toBe('[1,null,"x"]')
  })

  it('omits undefined object members and normalizes negative zero', () => {
    expect(canonicalizeJson({ keep: 1, drop: undefined })).toBe('{"keep":1}')
    expect(canonicalizeJson({ value: -0 })).toBe('{"value":0}')
  })

  it('escapes strings with JSON semantics', () => {
    expect(canonicalizeJson({ text: 'a\n"b"' })).toBe('{"text":"a\\n\\"b\\""}')
  })

  it('fails closed on non-finite numbers', () => {
    expect(() => canonicalizeJson({ value: Number.NaN })).toThrow(
      CanonicalJsonError
    )
    expect(() => canonicalizeJson({ value: Number.POSITIVE_INFINITY })).toThrow(
      'Canonical JSON does not allow non-finite numbers'
    )
  })

  it('fails closed on cycles', () => {
    const cyclic: Record<string, unknown> = { name: 'root' }
    cyclic.self = cyclic
    expect(() => canonicalizeJson(cyclic)).toThrow('cyclic')
  })

  it('fails closed on unsupported objects and values', () => {
    expect(() => canonicalizeJson({ when: new Date() })).toThrow(
      'only accepts plain objects'
    )
    expect(() => canonicalizeJson({ fn: () => undefined })).toThrow(
      'does not support function'
    )
    expect(() => canonicalizeJson({ value: 10n })).toThrow(
      'does not support bigint'
    )
  })

  it('fails closed when the depth budget is exceeded', () => {
    let deep: Record<string, unknown> = { leaf: true }
    for (let index = 0; index < CANONICAL_JSON_MAX_DEPTH + 2; index += 1) {
      deep = { child: deep }
    }
    expect(() => canonicalizeJson(deep)).toThrow('depth budget')
  })

  it('produces stable hashes for reordered payloads', () => {
    const first = canonicalizeJson({ action: 'cancel', id: 'a1' })
    const second = canonicalizeJson({ id: 'a1', action: 'cancel' })
    expect(first).toBe(second)
  })
})
