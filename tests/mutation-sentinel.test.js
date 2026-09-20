import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { runMutationSentinel } from '../scripts/lib/mutation-sentinel.mjs'

const repositoryRoot = path.resolve(import.meta.dirname, '..')
const sandboxes = []

afterAll(() => {
  for (const sandbox of sandboxes.splice(0)) {
    fs.rmSync(sandbox, { recursive: true, force: true })
  }
})

describe('AUD19-08 mutation sentinel harness', () => {
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
})
