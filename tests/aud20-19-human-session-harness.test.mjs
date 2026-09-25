import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import {
  compareCandidateBinding,
  containsSensitiveValue,
  createSessionSupplement,
  isSessionId,
  validateRegisteredApproval,
  validateSessionApproval,
  validateSessionAuthorization,
  validateSessionSupplement
} from '../scripts/lib/aud20-19-human-session-binding.mjs'
import {
  authorizeViteRequest,
  createPauseReleaseGate,
  createRedactedRecorder,
  ensureSessionOutputDirectory,
  expectedEmptyApiPayload,
  inspectNamespaceOutput,
  matchApiFixture,
  parseRawQuery,
  sanitizeProxyEnvironment,
  validateNoSensitiveEventValues,
  writeJsonExclusive
} from '../scripts/lib/aud20-19-human-session-harness.mjs'

const temporaryDirectories = []
const fixtureDir = () => {
  const value = fs.mkdtempSync(path.join(os.tmpdir(), 'aud20-19-test-'))
  fs.chmodSync(value, 0o700)
  temporaryDirectories.push(value)
  return value
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

describe('AUD20-19-FU1 request boundary', () => {
  it('accepts only fixed loopback assets and the pinned query grammar', () => {
    expect(
      authorizeViteRequest({
        method: 'GET',
        url: 'http://127.0.0.1:4174/src/main.tsx'
      }).allowed
    ).toBe(true)
    expect(
      authorizeViteRequest({
        method: 'GET',
        url: 'http://127.0.0.1:4174/src/main.tsx?import'
      })
    ).toMatchObject({ allowed: true, ruleId: 'module_import' })
    expect(
      authorizeViteRequest({
        method: 'GET',
        url: 'http://127.0.0.1:4174/node_modules/.vite/deps/react.js?v=deadbeef',
        browserHash: 'deadbeef'
      })
    ).toMatchObject({ allowed: true, ruleId: 'optimized_hash' })
  })

  it.each([
    ['duplicate', '/src/main.tsx?import&import'],
    ['encoded key', '/src/main.tsx?%69mport'],
    ['plus', '/src/main.tsx?import+direct'],
    ['unknown key', '/src/main.tsx?t=1'],
    ['invalid hash', '/node_modules/.vite/deps/react.js?v=DEADBEEF'],
    ['hash mismatch', '/node_modules/.vite/deps/react.js?v=deadbeef'],
    ['query on root', '/?import'],
    ['direct on module', '/src/main.tsx?direct'],
    ['wrong method', '/src/main.tsx']
  ])('denies invalid query/asset combination: %s', (_name, pathname) => {
    const method = pathname === '/src/main.tsx' ? 'POST' : 'GET'
    expect(
      authorizeViteRequest({
        method,
        url: `http://127.0.0.1:4174${pathname}`,
        browserHash: 'cafebabe'
      }).allowed
    ).toBe(false)
  })

  it('allows only exact synthetic API reads and the two fixture writes', () => {
    expect(
      matchApiFixture({
        method: 'GET',
        url: 'http://127.0.0.1:4174/v1/admin/test-lab/runs?limit=10'
      })
    ).toMatchObject({ allowed: true, ruleId: 'admin_test_runs' })
    expect(
      matchApiFixture({
        method: 'GET',
        url: 'http://127.0.0.1:4174/v1/admin/test-lab/runs?limit=11'
      }).allowed
    ).toBe(false)
    expect(
      matchApiFixture({
        method: 'POST',
        url: 'http://127.0.0.1:4174/v1/approvals/synthetic_approval_1/decision',
        rawBody: '{"decision":"approved","note":"controlled_console_action"}'
      }).allowed
    ).toBe(true)
    expect(
      matchApiFixture({
        method: 'POST',
        url: 'http://127.0.0.1:4174/v1/approvals/synthetic_approval_1/decision',
        rawBody: '{"decision":"rejected","note":"anything"}'
      }).allowed
    ).toBe(false)
    expect(expectedEmptyApiPayload('admin_execution_traces')).toMatchObject({
      items: [],
      pageInfo: { limit: 10, offset: 0, total: 0, hasNextPage: false }
    })
  })

  it('rejects unknown raw query syntax without normalizing it', () => {
    expect(parseRawQuery('?limit=10')).toMatchObject({ valid: false })
    expect(parseRawQuery('?import&v=deadbeef')).toMatchObject({
      valid: true,
      entries: [
        ['import', null],
        ['v', 'deadbeef']
      ]
    })
    expect(parseRawQuery('?import&')).toMatchObject({ valid: false })
  })
})

describe('AUD20-19-FU1 network and interlock contracts', () => {
  it('accepts only a loopback namespace without a non-loopback route', () => {
    expect(
      inspectNamespaceOutput({
        interfacesText:
          'lo               UNKNOWN        00:00:00:00:00:00 <LOOPBACK>',
        routesText: ''
      }).allowed
    ).toBe(true)
    expect(
      inspectNamespaceOutput({
        interfacesText: 'lo UNKNOWN\net0 UP',
        routesText: 'default via 192.0.2.1 dev eth0'
      }).allowed
    ).toBe(false)
  })

  it('removes inherited proxy configuration', () => {
    const result = sanitizeProxyEnvironment({
      HTTP_PROXY: 'http://proxy.invalid',
      https_proxy: 'http://proxy.invalid',
      ALL_PROXY: 'socks5://proxy.invalid',
      PATH: '/usr/bin'
    })
    expect(result.HTTP_PROXY).toBeUndefined()
    expect(result.https_proxy).toBeUndefined()
    expect(result.ALL_PROXY).toBeUndefined()
    expect(result.NO_PROXY).toBe('127.0.0.1,localhost')
    expect(result.PATH).toBe('/usr/bin')
  })

  it('requires explicit facilitator release and supports stop without auto-advance', async () => {
    const gate = createPauseReleaseGate()
    expect(gate.state).toBe('WAITING')
    const pending = gate.wait()
    expect(gate.state).toBe('WAITING')
    expect(gate.release()).toBe(true)
    await expect(pending).resolves.toBe('RELEASED')
    expect(gate.state).toBe('RELEASED')

    const stopped = createPauseReleaseGate()
    const stopResult = stopped.wait().catch((error) => error.message)
    expect(stopped.stop()).toBe(true)
    await expect(stopResult).resolves.toBe('session_stopped')
    expect(stopped.state).toBe('STOPPED')
  })

  it('records only fixed event classes/rule ids and no raw URLs or identifiers', () => {
    const recorder = createRedactedRecorder()
    recorder.record({
      eventClass: 'api_fixture',
      ruleId: 'admin_test_runs',
      decision: 'allow'
    })
    expect(recorder.snapshot()).toHaveLength(1)
    expect(validateNoSensitiveEventValues(recorder.snapshot())).toBe(true)
    expect(() =>
      recorder.record({
        eventClass: 'api_fixture',
        ruleId: '/v1/conversations?owner=1',
        decision: 'allow'
      })
    ).toThrow('rule_id_invalid')
    expect(containsSensitiveValue({ patientName: 'synthetic' })).toBe(true)
  })
})

describe('AUD20-19-FU1 session binding and storage', () => {
  const now = '2026-09-24T12:00:00.000Z'
  const authorization = {
    schemaVersion: 1,
    decision: 'APPROVED',
    specSha256:
      'decb8d441c2a17678026c6305fb71a9c31a2069d6836ad010362f9c3b9179688',
    candidateId: 'a'.repeat(64),
    candidateTreeHash: 'b'.repeat(64),
    allowedSteps: ['H01', 'H09'],
    facilitatorRole: 'AUTHORIZED_FACILITATOR',
    validFrom: now,
    validUntil: '2026-09-25T12:00:00.000Z',
    capture: { screenshots: false, audio: false, video: false }
  }
  const approval = {
    schemaVersion: 1,
    decision: 'APPROVED_SESSION',
    authorizationSha256: 'c'.repeat(64),
    specSha256: authorization.specSha256,
    candidateId: authorization.candidateId,
    candidateTreeHash: authorization.candidateTreeHash,
    allowedSteps: authorization.allowedSteps,
    facilitatorRole: 'AUTHORIZED_FACILITATOR',
    validFrom: authorization.validFrom,
    validUntil: authorization.validUntil,
    screenshots: false,
    audio: false,
    video: false,
    externalFacilitatorCheck: 'CONFIRMED'
  }

  it('validates strict authorization and approval schemas and their negative cases', () => {
    expect(validateSessionAuthorization(authorization)).toEqual([])
    expect(validateSessionApproval(approval)).toEqual([])
    expect(
      validateSessionAuthorization({ ...authorization, extra: true })
    ).toContain('authorization_shape_invalid')
    expect(
      validateSessionApproval({ ...approval, screenshots: true })
    ).toContain('capture_must_be_disabled')
  })

  it('binds the clean candidate, exact hashes, and registered session approval', () => {
    expect(
      compareCandidateBinding(
        {
          dirty: false,
          untrackedFiles: [],
          candidateId: authorization.candidateId,
          treeHash: authorization.candidateTreeHash
        },
        authorization
      )
    ).toEqual([])
    expect(
      compareCandidateBinding(
        {
          dirty: true,
          untrackedFiles: ['x'],
          candidateId: 'd'.repeat(64),
          treeHash: 'e'.repeat(64)
        },
        authorization
      )
    ).toEqual(
      expect.arrayContaining([
        'candidate_dirty',
        'candidate_untracked_files',
        'candidate_id_mismatch',
        'candidate_tree_hash_mismatch'
      ])
    )
    expect(
      validateRegisteredApproval(
        'c'.repeat(64),
        `approvalSha256=${'c'.repeat(64)}`
      )
    ).toBe(true)
    expect(validateRegisteredApproval('c'.repeat(64), 'not registered')).toBe(
      false
    )
  })

  it('creates a PENDING supplement and rejects personal fields', () => {
    expect(isSessionId('f'.repeat(32))).toBe(true)
    expect(isSessionId('not-a-session')).toBe(false)
    const supplement = createSessionSupplement({
      sessionId: 'f'.repeat(32),
      candidateId: authorization.candidateId,
      candidateTreeHash: authorization.candidateTreeHash
    })
    expect(validateSessionSupplement(supplement)).toEqual([])
    expect(
      validateSessionSupplement({ ...supplement, participantName: 'synthetic' })
    ).toContain('supplement_shape_invalid')
    expect(containsSensitiveValue({ note: 'controlled' })).toBe(true)
  })

  it('uses exclusive 0700/0600 storage and refuses collisions or unsafe names', () => {
    const root = fixtureDir()
    const directory = ensureSessionOutputDirectory(root, 'f'.repeat(32))
    expect(fs.statSync(directory).mode & 0o777).toBe(0o700)
    const target = writeJsonExclusive(directory, 'blocked-receipt.json', {
      status: 'BLOCKED',
      ruleId: 'session_gate_missing'
    })
    expect(fs.statSync(target).mode & 0o777).toBe(0o600)
    expect(() => writeJsonExclusive(directory, 'unexpected.json', {})).toThrow(
      'session_output_name_denied'
    )
    expect(() =>
      writeJsonExclusive(directory, 'blocked-receipt.json', {})
    ).toThrow()
    expect(() => ensureSessionOutputDirectory(root, 'f'.repeat(32))).toThrow(
      'session_destination_exists'
    )
  })

  it('keeps the session mode closed without a separate authorization', () => {
    const projectRoot = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '..'
    )
    const node = '/home/ricardo/.nvm/versions/node/v22.23.2/bin/node'
    const result = spawnSync(
      node,
      ['scripts/aud20-19-human-session-harness.mjs', 'session'],
      { cwd: projectRoot, encoding: 'utf8', timeout: 10000 }
    )
    expect(result.status).toBe(2)
    expect(result.stderr).toContain('separate_session_authorization_required')
  })
})
