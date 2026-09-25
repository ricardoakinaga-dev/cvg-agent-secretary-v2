import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import {
  candidateFingerprint,
  findBuilderJustificationKeys,
  verifyCriticReport
} from '../scripts/lib/critic-evidence.mjs'
import { sha256Bytes } from '../scripts/lib/certification-rules.mjs'

const fixtures = []
const candidateId = 'a'.repeat(64)
const commit = 'b'.repeat(40)
const treeHash = 'c'.repeat(64)
const fingerprint = 'd'.repeat(64)

afterAll(() => {
  for (const root of fixtures.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aud19-critic-'))
  fixtures.push(root)
  execFileSync('git', ['init', '-q'], { cwd: root })
  execFileSync('git', ['config', 'user.email', 'aud19@test.invalid'], {
    cwd: root
  })
  execFileSync('git', ['config', 'user.name', 'AUD19 Fixture'], { cwd: root })
  fs.mkdirSync(path.join(root, 'certification/logs'), { recursive: true })
  fs.writeFileSync(
    path.join(root, 'certification/logs/unit.log'),
    ' Test Files  1 passed (1)\n      Tests  5 passed (5)\n'
  )
  return root
}

function artifact(root, relativePath) {
  const content = fs.readFileSync(path.join(root, relativePath))
  return {
    path: relativePath,
    sha256: sha256Bytes(content),
    size: content.byteLength
  }
}

function goodReport(root) {
  return {
    schemaVersion: 1,
    kind: 'phase11-critic-report',
    critic: {
      identity: 'critic.agent.independent',
      freshContext: true,
      builderIdentity: 'builder.agent',
      independence: {
        criteria: [
          'fresh-context',
          'separate-identity',
          'artifact-only-input',
          'no-worktree-write',
          'no-builder-justification'
        ],
        builderJustificationIncluded: false,
        builderConclusionReused: false,
        writeAccessToWorktree: false
      }
    },
    binding: { candidateId, commit, treeHash },
    fingerprint: {
      algorithm: 'sha256-candidate-v1',
      before: fingerprint,
      after: fingerprint
    },
    verdict: { status: 'PASS', summary: 'independent behavioral review' },
    findings: { P0: 0, P1: 0, P2: 1 },
    checks: [
      {
        id: 'CHK-UNIT-LOG',
        status: 'PASS',
        method: 're-derived the vitest summary from the raw log',
        evidence: ['certification/logs/unit.log']
      }
    ],
    artifacts: [artifact(root, 'certification/logs/unit.log')],
    disclaimers: { syntheticOnly: true, productionBlocked: true }
  }
}

function verify(root, overrides = {}) {
  const report = goodReport(root)
  const reportPath = 'docs/04_audit/evidence/AUD19/AUD19-08-critic-report.json'
  return verifyCriticReport({
    report,
    reportBytes: Buffer.from(JSON.stringify(report)),
    reportPath,
    root,
    artifactReader: (relativePath) =>
      fs.existsSync(path.join(root, relativePath))
        ? fs.readFileSync(path.join(root, relativePath))
        : undefined,
    currentCandidate: { candidateId, commit, treeHash },
    currentFingerprint: fingerprint,
    ...overrides
  })
}

describe('AUD19-08 behavioral independent-critic verification', () => {
  it('accepts a bound, fingerprinted, digest-verified critic report', () => {
    const root = fixture()
    const result = verify(root)
    expect(result.status).toBe('PASS')
    expect(result.pass).toBe(true)
  })

  it('rejects a critic report without candidate binding', () => {
    const root = fixture()
    const report = goodReport(root)
    delete report.binding
    const result = verifyCriticReport({
      report,
      reportPath: 'docs/critic.json',
      root,
      currentCandidate: { candidateId, commit, treeHash }
    })
    expect(result.pass).toBe(false)
    expect(result.failures).toContainEqual(
      expect.stringContaining('CRITIC:schema')
    )
  })

  it('rejects a critic that declares the builder identity', () => {
    const root = fixture()
    const report = goodReport(root)
    report.critic.identity = report.critic.builderIdentity
    const result = verifyCriticReport({ report, root })
    expect(result.failures).toContainEqual(
      expect.stringContaining('CRITIC:identity')
    )
  })

  it('rejects a critic bound to a different candidate than the analyzed tree', () => {
    const root = fixture()
    const report = goodReport(root)
    report.binding.candidateId = 'f'.repeat(64)
    const result = verifyCriticReport({
      report,
      root,
      currentCandidate: { candidateId, commit, treeHash }
    })
    expect(result.pass).toBe(false)
    expect(
      result.failures.some((entry) => entry.startsWith('CRITIC:binding'))
    ).toBe(true)
  })

  it('rejects a critic that copied the builder conclusion', () => {
    const root = fixture()
    const report = goodReport(root)
    report.critic.independence.builderConclusionReused = true
    const result = verifyCriticReport({ report, root })
    expect(result.pass).toBe(false)
    expect(result.failures).toContainEqual(
      expect.stringContaining('CRITIC:schema')
    )
    expect(
      findBuilderJustificationKeys({
        builderJustification: 'builder said pass'
      })
    ).toEqual(['$.builderJustification'])
  })

  it('rejects evidence whose digest diverges from the cited artifact', () => {
    const root = fixture()
    const report = goodReport(root)
    report.artifacts[0].sha256 = '0'.repeat(64)
    const result = verifyCriticReport({ report, root })
    expect(result.pass).toBe(false)
    expect(
      result.failures.some((entry) => entry.startsWith('CRITIC:artifacts'))
    ).toBe(true)
  })

  it('rejects a tampered critic report through its recorded digest', () => {
    const root = fixture()
    const report = goodReport(root)
    const tampered = JSON.stringify({
      ...report,
      verdict: { status: 'PASS', summary: 'edited later' }
    })
    const result = verifyCriticReport({
      report: JSON.parse(tampered),
      reportBytes: Buffer.from(tampered),
      root,
      expectedReportSha256: 'e'.repeat(64)
    })
    expect(result.pass).toBe(false)
    expect(result.failures).toContainEqual(
      expect.stringContaining('CRITIC:report_digest')
    )
  })

  it('rejects a critic that wrote to the worktree during review', () => {
    const root = fixture()
    const report = goodReport(root)
    report.fingerprint.after = 'e'.repeat(64)
    const result = verifyCriticReport({ report, root })
    expect(result.pass).toBe(false)
    expect(
      result.failures.some((entry) => entry.startsWith('CRITIC:fingerprint'))
    ).toBe(true)
  })

  it('rejects a worktree that changed after the critic report', () => {
    const root = fixture()
    const report = goodReport(root)
    const result = verifyCriticReport({
      report,
      root,
      currentFingerprint: 'e'.repeat(64)
    })
    expect(result.pass).toBe(false)
    expect(
      result.failures.some((entry) => entry.startsWith('CRITIC:fingerprint'))
    ).toBe(true)
  })

  it('rejects a PASS verdict that its own checks do not support', () => {
    const root = fixture()
    const report = goodReport(root)
    report.checks[0].status = 'FAIL'
    const result = verifyCriticReport({ report, root })
    expect(result.pass).toBe(false)
    expect(
      result.failures.some((entry) => entry.startsWith('CRITIC:verdict'))
    ).toBe(true)
  })

  it('computes a stable candidate fingerprint excluding the critic package', () => {
    const root = fixture()
    const before = candidateFingerprint(root)
    fs.writeFileSync(path.join(root, 'src-extra.js'), 'export const x = 1\n')
    const after = candidateFingerprint(root)
    expect(after).not.toBe(before)
    const excluded = candidateFingerprint(root, {
      excludePaths: ['src-extra.js']
    })
    expect(excluded).toBe(before)
  })
})
