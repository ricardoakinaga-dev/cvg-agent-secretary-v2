#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const repoRoot = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '../../../..'
)
const manifestPath = path.join(
  repoRoot,
  'docs/04_audit/evidence/AUD20/AUD20-16-v2-candidate-manifest.json'
)

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function sourceDigest(scope) {
  return sha256(
    scope
      .map((relativePath) => {
        const contents = fs.readFileSync(path.join(repoRoot, relativePath))
        return `${relativePath}\0${sha256(contents)}\n`
      })
      .sort()
      .join('')
  )
}

function candidateId(binding) {
  return sha256(
    JSON.stringify({
      algorithm: binding.algorithm,
      baseCommit: binding.baseCommit,
      gitTreeHash: binding.gitTreeHash,
      sourceDigest: binding.sourceDigest,
      scope: binding.scope,
      dirtyWorktree: binding.dirtyWorktree,
      untrackedIncluded: binding.untrackedIncluded,
      externalEffects: binding.externalEffects
    })
  )
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const binding = manifest.candidateBinding
assert(manifest.task === 'AUD20-16', 'unexpected task')
assert(manifest.policyVersion === 'AUD20-16-LIFECYCLE-v1', 'unexpected policy')
assert(binding.algorithm === 'aud20-16-worktree-binding-v2', 'unexpected algorithm')
assert(binding.dirtyWorktree === true, 'dirty worktree must be explicit')
assert(binding.untrackedIncluded === true, 'untracked files must be included')
assert(binding.externalEffects === false, 'external effects must be false')
assert(new Set(binding.scope).size === binding.scope.length, 'duplicate scope path')
assert(
  binding.baseCommit ===
    execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim(),
  'base commit mismatch'
)
assert(
  binding.gitTreeHash ===
    execFileSync('git', ['rev-parse', 'HEAD^{tree}'], {
      cwd: repoRoot,
      encoding: 'utf8'
    }).trim(),
  'git tree mismatch'
)
assert(sourceDigest(binding.scope) === binding.sourceDigest, 'source digest mismatch')
assert(candidateId(binding) === binding.candidateId, 'candidate id mismatch')

process.stdout.write(
  `${JSON.stringify({ status: 'PASS', candidateId: binding.candidateId, scopedFiles: binding.scope.length })}\n`
)
