import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  PHASE11_REQUIRED_GATES,
  Phase11ManifestSchema,
  evaluatePhase11
} from '../scripts/lib/phase11-rules.mjs'
import { candidateWorktreeDirty } from '../scripts/lib/certification-rules.mjs'

const commit = 'a'.repeat(40)

function candidate(dirty = false) {
  return {
    git: { head: commit, branch: 'test', dirty },
    files: [],
    candidateId: 'b'.repeat(64)
  }
}

function gates() {
  return PHASE11_REQUIRED_GATES.map((id) => ({
    id,
    command: `fixture:${id}`,
    status: 'PASS',
    exitCode: 0,
    durationMs: 1
  }))
}

function requirements() {
  return [
    {
      id: 'P11-TEST',
      title: 'Certification fixture',
      promptItems: 'test',
      implementation: ['test'],
      tests: ['test'],
      evidence: ['test'],
      gates: ['unit'],
      status: 'IMPLEMENTED',
      blocking: false
    }
  ]
}

describe('Phase 11 certification integrity', () => {
  it('treats a dirty candidate as a hard NO_GO blocker', () => {
    const decision = evaluatePhase11({
      candidate: candidate(true),
      gates: gates(),
      promptIntegrity: { status: 'PASS' },
      engine: { status: 'PASS' },
      externalGates: {
        modelProvider: 'VALIDATED',
        channel: 'VALIDATED',
        externalIdentity: 'VALIDATED',
        humanSignoff: 'VALIDATED'
      },
      requirements: requirements()
    })

    expect(decision.decision).toBe('NO_GO')
    expect(decision.blockers).toContain('candidate_worktree_dirty')
  })

  it('requires the certified commit in the manifest schema', () => {
    const manifest = {
      schemaVersion: 1,
      phase: '11',
      kind: 'phase11-manifest',
      candidateId: 'b'.repeat(64),
      result: { path: 'result.json', sha256: 'c'.repeat(64), size: 1 },
      artifacts: []
    }

    expect(() => Phase11ManifestSchema.parse(manifest)).toThrow()
    expect(Phase11ManifestSchema.parse({ ...manifest, commit })).toMatchObject({
      commit
    })
  })

  it('ignores generated certification output when calculating candidate dirtiness', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phase11-candidate-'))
    execFileSync('git', ['init', '-q'], { cwd: root })
    execFileSync('git', ['config', 'user.email', 'phase11@test.invalid'], {
      cwd: root
    })
    execFileSync('git', ['config', 'user.name', 'Phase 11 Test'], { cwd: root })
    fs.mkdirSync(path.join(root, 'certification'), { recursive: true })
    fs.writeFileSync(path.join(root, 'source.txt'), 'stable\n')
    fs.writeFileSync(
      path.join(root, 'certification/phase11-result.json'),
      '{}\n'
    )
    execFileSync('git', ['add', '.'], { cwd: root })
    execFileSync('git', ['commit', '-qm', 'fixture'], { cwd: root })

    fs.writeFileSync(
      path.join(root, 'certification/phase11-result.json'),
      '{"changed":true}\n'
    )
    expect(candidateWorktreeDirty(root)).toBe(false)

    fs.writeFileSync(path.join(root, 'source.txt'), 'changed\n')
    expect(candidateWorktreeDirty(root)).toBe(true)
  })
})
