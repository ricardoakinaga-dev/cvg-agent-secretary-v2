import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  PHASE11_2_PROMPT_SHA256,
  PHASE11_2_REQUIRED_GATES,
  PHASE11_REQUIRED_INVARIANTS,
  Phase11CandidateSchema,
  buildEvidenceGraph,
  buildPhase11Candidate,
  verifyEvidenceGraph,
  verifyPromptIntegrity
} from '../scripts/lib/phase11-rules.mjs'

const repositoryRoot = path.resolve(import.meta.dirname, '..')
const fixtures = []

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
}

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phase11-2-'))
  fixtures.push(root)
  git(root, ['init', '-q'])
  git(root, ['config', 'user.email', 'phase11-2@test.invalid'])
  git(root, ['config', 'user.name', 'Phase 11.2 Fixture'])
  fs.writeFileSync(path.join(root, 'source.txt'), 'stable\n')
  git(root, ['add', 'source.txt'])
  git(root, ['commit', '-qm', 'source anchor'])
  return root
}

afterEach(() => {
  for (const root of fixtures.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

describe('Phase 11.2 formal closure', () => {
  it('binds the exact six-source intake while preserving historical sets', () => {
    expect(Object.keys(PHASE11_2_PROMPT_SHA256)).toHaveLength(6)
    expect(verifyPromptIntegrity(repositoryRoot, 'phase11_2')).toMatchObject({
      sourceSet: 'phase11_2',
      expectedCount: 6,
      observedCount: 6,
      status: 'PASS'
    })
  })

  it('keeps behavior hash stable when a tracked canonical package is committed later', () => {
    const root = fixture()
    const source = buildPhase11Candidate(root)

    fs.mkdirSync(path.join(root, 'certification/phase11'), { recursive: true })
    fs.writeFileSync(path.join(root, 'certification/current.json'), '{}\n')
    fs.writeFileSync(
      path.join(root, 'certification/phase11/result.json'),
      '{}\n'
    )
    git(root, ['add', 'certification'])
    git(root, ['commit', '-qm', 'seal canonical package'])
    const packaged = buildPhase11Candidate(root)

    expect(packaged.commit).not.toBe(source.commit)
    expect(packaged.gitTreeHash).not.toBe(source.gitTreeHash)
    expect(packaged.candidateId).toBe(source.candidateId)
    expect(packaged.treeHash).toBe(source.treeHash)
    expect(packaged.files).toEqual(source.files)
    expect(Phase11CandidateSchema.safeParse(packaged).success).toBe(true)

    fs.writeFileSync(path.join(root, 'source.txt'), 'behavior mutation\n')
    git(root, ['add', 'source.txt'])
    git(root, ['commit', '-qm', 'behavior mutation'])
    const mutated = buildPhase11Candidate(root)
    expect(mutated.candidateId).not.toBe(source.candidateId)
    expect(mutated.treeHash).not.toBe(source.treeHash)
  })

  it('requires the complete Phase 11.2 gate and invariant contract', () => {
    expect(PHASE11_2_REQUIRED_GATES).toContain('PHASE11_FORMAL_CLOSURE')
    expect(PHASE11_2_REQUIRED_GATES).toContain('production_preflight')
    expect(PHASE11_REQUIRED_INVARIANTS).toEqual(
      Array.from(
        { length: 16 },
        (_, index) => `INV-${String(index + 1).padStart(3, '0')}`
      )
    )
  })

  it('materializes the requirement-to-invariant evidence chain and runtime stages', () => {
    const gates = PHASE11_2_REQUIRED_GATES.map((id) => ({
      id,
      command: `fixture:${id}`,
      status: 'PASS',
      exitCode: 0,
      durationMs: 1
    }))
    const graph = buildEvidenceGraph(
      [
        {
          id: 'P11.2-FIXTURE',
          implementation: ['scripts/phase11-2-redteam.mjs'],
          tests: ['tests/phase11-2-certification.test.js'],
          evidence: ['certification/phase11/negative-validation.json'],
          gates: ['certification_redteam'],
          status: 'PASS'
        }
      ],
      gates,
      { files: [] },
      {
        candidateId: 'a'.repeat(64),
        invariants: PHASE11_REQUIRED_INVARIANTS.map((id) => ({
          id,
          status: 'PASS',
          evidence: ['fixture']
        }))
      }
    )

    expect(graph.evidenceChain).toBe(true)
    expect(verifyEvidenceGraph(graph)).toEqual({ valid: true, errors: [] })
  })
})
