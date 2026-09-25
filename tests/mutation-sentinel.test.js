import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { afterAll, describe, expect, it } from 'vitest'
import {
  MUTATION_MANIFEST_PATH,
  MUTATION_MANIFEST_SHA256,
  runMutationSentinel,
  verifyMutationReport
} from '../scripts/lib/mutation-sentinel.mjs'

const repositoryRoot = path.resolve(import.meta.dirname, '..')
const sandboxes = []

function executionEvidence(report) {
  const reportBytes = Buffer.from(`${JSON.stringify(report, null, 2)}\n`)
  const digest = createHash('sha256').update(reportBytes).digest('hex')
  return {
    reportBytes,
    executionLog: `[mutation] reportSha256=${digest}`,
    gateExitCode: 0
  }
}

afterAll(() => {
  for (const sandbox of sandboxes.splice(0)) {
    fs.rmSync(sandbox, { recursive: true, force: true })
  }
})

describe('AUD19-08 mutation sentinel harness', () => {
  it('keeps the canonical manifest pin in sync with the manifest on disk', () => {
    const manifestBytes = fs.readFileSync(
      path.join(repositoryRoot, MUTATION_MANIFEST_PATH)
    )
    expect(createHash('sha256').update(manifestBytes).digest('hex')).toBe(
      MUTATION_MANIFEST_SHA256
    )
  })

  it('rejects gaps, stale bindings and an empty catalog at the certification boundary', () => {
    const candidate = {
      candidateId: 'a'.repeat(64),
      commit: 'b'.repeat(40),
      treeHash: 'c'.repeat(64)
    }
    const manifest = {
      mutants: [
        {
          id: 'MUT-ONE',
          target: 'src/guard.ts',
          test: { files: ['tests/guard.test.ts'] }
        }
      ]
    }
    const report = {
      schemaVersion: 1,
      kind: 'aud19-mutation-sentinel',
      status: 'PASS',
      generatedAt: '2026-09-22T00:00:00.000Z',
      manifestSha256: 'd'.repeat(64),
      candidate,
      summary: { total: 1, detected: 1, notDetected: 0, notApplicable: 0 },
      results: [
        {
          id: 'MUT-ONE',
          target: 'src/guard.ts',
          focusedTests: ['tests/guard.test.ts'],
          status: 'detected',
          exitCode: 1,
          timedOut: false,
          tests: { total: 1, passed: 0, failed: 1, pending: 0 },
          outputTail: 'one focused test failed'
        }
      ]
    }

    expect(
      verifyMutationReport({
        report,
        ...executionEvidence(report),
        manifest,
        manifestSha256: 'd'.repeat(64),
        expectedManifestSha256: 'd'.repeat(64),
        currentCandidate: candidate,
        minGeneratedAt: '2026-09-21T23:59:00.000Z',
        maxGeneratedAt: '2026-09-22T00:01:00.000Z'
      })
    ).toEqual({ status: 'PASS', failures: [] })

    expect(
      verifyMutationReport({
        report: {
          ...report,
          candidate: { ...candidate, candidateId: 'e'.repeat(64) },
          summary: { ...report.summary, detected: 0, notDetected: 1 },
          results: [{ id: 'MUT-ONE', status: 'not_detected' }]
        },
        ...executionEvidence(report),
        manifest,
        manifestSha256: 'd'.repeat(64),
        expectedManifestSha256: 'd'.repeat(64),
        currentCandidate: candidate
      }).failures
    ).toEqual(
      expect.arrayContaining([
        'mutation_candidate_candidateId_mismatch',
        'mutation_results_incomplete_or_gapped'
      ])
    )

    expect(
      verifyMutationReport({
        report: { ...report, manifestSha256: 'f'.repeat(64) },
        ...executionEvidence(report),
        manifest,
        manifestSha256: 'd'.repeat(64),
        expectedManifestSha256: 'd'.repeat(64),
        currentCandidate: candidate,
        minGeneratedAt: '2026-09-22T00:01:00.000Z'
      }).failures
    ).toEqual(
      expect.arrayContaining([
        'mutation_manifest_digest_mismatch',
        'mutation_report_stale'
      ])
    )

    expect(
      verifyMutationReport({
        report: {
          ...report,
          summary: { total: 0, detected: 0, notDetected: 0, notApplicable: 0 },
          results: []
        },
        ...executionEvidence(report),
        manifest: { mutants: [] },
        manifestSha256: 'd'.repeat(64),
        expectedManifestSha256: 'd'.repeat(64),
        currentCandidate: candidate
      }).status
    ).toBe('FAIL')

    expect(
      verifyMutationReport({
        report,
        ...executionEvidence(report),
        manifest,
        manifestSha256: 'd'.repeat(64),
        expectedManifestSha256: 'e'.repeat(64),
        currentCandidate: candidate
      }).failures
    ).toContain('mutation_manifest_not_canonical')

    expect(
      verifyMutationReport({
        report: {
          ...report,
          results: report.results.map((entry) => ({
            ...entry,
            exitCode: 0,
            tests: { failed: 0 }
          }))
        },
        ...executionEvidence(report),
        manifest,
        manifestSha256: 'd'.repeat(64),
        expectedManifestSha256: 'd'.repeat(64),
        currentCandidate: candidate
      }).failures
    ).toContain('mutation_execution_evidence_invalid:MUT-ONE')

    expect(
      verifyMutationReport({
        report,
        reportBytes: Buffer.from('{}\n'),
        executionLog: `[mutation] reportSha256=${'0'.repeat(64)}`,
        gateExitCode: 0,
        manifest,
        manifestSha256: 'd'.repeat(64),
        expectedManifestSha256: 'd'.repeat(64),
        currentCandidate: candidate
      }).failures
    ).toContain('mutation_execution_receipt_invalid')

    const forgedReport = {
      ...report,
      results: report.results.map((entry) => {
        const forged = { ...entry, exitCode: 1, timedOut: false }
        delete forged.tests
        delete forged.outputTail
        return forged
      })
    }
    expect(
      verifyMutationReport({
        report: forgedReport,
        ...executionEvidence(forgedReport),
        manifest,
        manifestSha256: 'd'.repeat(64),
        expectedManifestSha256: 'd'.repeat(64),
        currentCandidate: candidate
      }).failures
    ).toContain('mutation_execution_evidence_invalid:MUT-ONE')
  })

  it(
    'detects the frozen eval-threshold mutant without touching the worktree',
    { timeout: 300_000 },
    () => {
      const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'aud19-mut-test-'))
      sandboxes.push(sandbox)
      const contractBefore = fs.readFileSync(
        path.join(repositoryRoot, 'scripts/lib/eval-contract.mjs'),
        'utf8'
      )
      const report = runMutationSentinel({
        root: repositoryRoot,
        manifestPath: 'docs/04_audit/evidence/AUD19/AUD19-08-mutants.json',
        only: ['MUT-EVAL-01'],
        timeoutMs: 240_000,
        sandboxRoot: sandbox
      })
      expect(report.status).toBe('PASS')
      expect(report.summary).toMatchObject({
        total: 1,
        detected: 1,
        notDetected: 0
      })
      expect(report.results[0]).toMatchObject({
        id: 'MUT-EVAL-01',
        status: 'detected'
      })
      const contractAfter = fs.readFileSync(
        path.join(repositoryRoot, 'scripts/lib/eval-contract.mjs'),
        'utf8'
      )
      expect(contractAfter).toBe(contractBefore)
    }
  )

  it(
    'reports a drifted target as a gap instead of inventing detection',
    { timeout: 300_000 },
    () => {
      const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'aud19-mut-test-'))
      sandboxes.push(sandbox)
      const fixtureManifest = path.join(sandbox, 'fixture-mutants.json')
      fs.writeFileSync(
        fixtureManifest,
        `${JSON.stringify(
          {
            schemaVersion: 1,
            kind: 'aud19-critical-mutants',
            mutants: [
              {
                id: 'MUT-FIXTURE-STALE',
                category: 'certification',
                target: 'scripts/lib/eval-contract.mjs',
                find: 'this string does not exist anywhere',
                replace: 'anything',
                test: { files: ['tests/phase11-eval-contract.test.js'] },
                rationale: 'fixture'
              }
            ]
          },
          null,
          2
        )}\n`
      )
      const report = runMutationSentinel({
        root: repositoryRoot,
        manifestPath: fixtureManifest,
        timeoutMs: 240_000,
        sandboxRoot: sandbox
      })
      expect(report.status).toBe('GAPS_FOUND')
      expect(report.results[0]).toMatchObject({
        id: 'MUT-FIXTURE-STALE',
        status: 'not_applicable',
        reason: 'mutation_target_stale'
      })
    }
  )

  it(
    'returns a non-zero process exit when --fail-on-gaps finds a surviving gap',
    { timeout: 300_000 },
    () => {
      const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'aud20-mut-cli-'))
      sandboxes.push(sandbox)
      const fixtureManifest = path.join(sandbox, 'fixture-mutants.json')
      const outputPath = path.join(sandbox, 'report.json')
      fs.writeFileSync(
        fixtureManifest,
        `${JSON.stringify(
          {
            schemaVersion: 1,
            kind: 'aud19-critical-mutants',
            mutants: [
              {
                id: 'MUT-FIXTURE-CLI-GAP',
                category: 'certification',
                target: 'scripts/lib/eval-contract.mjs',
                find: 'this string does not exist anywhere',
                replace: 'anything',
                test: { files: ['tests/phase11-eval-contract.test.js'] },
                rationale: 'fixture proving fail-on-gaps exit propagation'
              }
            ]
          },
          null,
          2
        )}\n`
      )

      const result = spawnSync(
        process.execPath,
        [
          'scripts/mutation-sentinel.mjs',
          `--manifest=${fixtureManifest}`,
          `--out=${outputPath}`,
          '--fail-on-gaps'
        ],
        { cwd: repositoryRoot, encoding: 'utf8' }
      )

      expect(result.status).toBe(1)
      expect(JSON.parse(fs.readFileSync(outputPath, 'utf8'))).toMatchObject({
        status: 'GAPS_FOUND',
        summary: { total: 1, detected: 0, notApplicable: 1 }
      })
    }
  )
})
