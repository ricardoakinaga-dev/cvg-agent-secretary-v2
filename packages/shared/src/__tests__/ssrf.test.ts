import { describe, expect, it } from 'vitest'
import {
  assertSafeOutboundUrl,
  evaluateOutboundUrl,
  evaluateResolvedAddresses,
  isPrivateIpAddress,
  UnsafeUrlError
} from '../ssrf.ts'

describe('isPrivateIpAddress', () => {
  const privateAddresses = [
    '0.0.0.0',
    '10.0.0.1',
    '100.64.1.1',
    '127.0.0.1',
    '169.254.169.254',
    '172.16.0.1',
    '172.31.255.255',
    '192.0.2.10',
    '192.168.1.1',
    '198.18.0.1',
    '224.0.0.1',
    '255.255.255.255',
    '::1',
    '::',
    'fc00::1',
    'fd12:3456::1',
    'fe80::1',
    'ff02::1',
    '::ffff:10.0.0.1',
    '2001:db8::1'
  ]

  const publicAddresses = [
    '8.8.8.8',
    '1.1.1.1',
    '172.32.0.1',
    '203.0.114.7',
    '2606:4700:4700::1111'
  ]

  it.each(privateAddresses)('flags %s as private', (address) => {
    expect(isPrivateIpAddress(address)).toBe(true)
  })

  it.each(publicAddresses)('accepts %s as public', (address) => {
    expect(isPrivateIpAddress(address)).toBe(false)
  })
})

describe('evaluateOutboundUrl', () => {
  it('allows public HTTPS endpoints by default', () => {
    const result = evaluateOutboundUrl('https://api.example.com/v1/models')
    expect(result.allowed).toBe(true)
  })

  it('blocks plain HTTP unless explicitly allowed', () => {
    expect(evaluateOutboundUrl('http://api.example.com').allowed).toBe(false)
    expect(
      evaluateOutboundUrl('http://api.example.com', { allowHttp: true }).allowed
    ).toBe(true)
  })

  it('blocks loopback, private and link-local hosts', () => {
    for (const host of [
      'https://localhost:11434',
      'https://127.0.0.1',
      'https://10.1.2.3',
      'https://172.20.0.1',
      'https://192.168.0.10',
      'https://169.254.169.254/latest/meta-data',
      'https://[::1]:8080'
    ]) {
      expect(evaluateOutboundUrl(host).allowed, host).toBe(false)
    }
  })

  it('supports an explicit host allowlist with wildcard suffixes', () => {
    const options = {
      allowedHosts: ['api.openai.com', '*.internal.cvg.example']
    }
    expect(
      evaluateOutboundUrl('https://api.openai.com/v1/chat', options).allowed
    ).toBe(true)
    expect(
      evaluateOutboundUrl(
        'https://ollama.internal.cvg.example/generate',
        options
      ).allowed
    ).toBe(true)
    expect(
      evaluateOutboundUrl('https://attacker.example/v1', options).allowed
    ).toBe(false)
  })

  it('rejects embedded credentials, malformed and oversized URLs', () => {
    expect(
      evaluateOutboundUrl('https://user:pass@api.example.com').allowed
    ).toBe(false)
    expect(evaluateOutboundUrl('not a url').allowed).toBe(false)
    expect(evaluateOutboundUrl('   ').allowed).toBe(false)
    expect(
      evaluateOutboundUrl(`https://api.example.com/${'a'.repeat(4096)}`).allowed
    ).toBe(false)
  })

  it('throws a typed error from assertSafeOutboundUrl', () => {
    expect(() => assertSafeOutboundUrl('http://169.254.169.254')).toThrow(
      UnsafeUrlError
    )
  })
})

describe('evaluateResolvedAddresses', () => {
  it('denies resolutions that include private addresses', () => {
    expect(
      evaluateResolvedAddresses(['93.184.216.34', '10.0.0.2']).allowed
    ).toBe(false)
  })

  it('allows public-only resolutions', () => {
    expect(evaluateResolvedAddresses(['93.184.216.34']).allowed).toBe(true)
  })

  it('denies empty DNS resolution', () => {
    expect(evaluateResolvedAddresses([]).allowed).toBe(false)
  })
})
