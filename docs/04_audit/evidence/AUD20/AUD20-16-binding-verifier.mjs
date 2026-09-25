#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../..')
const evidenceRoot = path.join(repoRoot, 'docs/04_audit/evidence/AUD20')
const rawReceiptPath = path.join(evidenceRoot, 'AUD20-16-raw-artifact-receipt.json')
const commandReceiptPath = path.join(evidenceRoot, 'AUD20-16-command-receipt.json')

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function canonicalSourceDigest(scope) {
  const records = scope
    .map((relativePath) => {
      const absolutePath = path.join(repoRoot, relativePath)
      const contents = fs.readFileSync(absolutePath)
      return `${relativePath}\0${sha256(contents)}\n`
    })
    .sort()
    .join('')
  return sha256(records)
}

function candidateId(binding) {
  const unsignedBinding = {
    algorithm: binding.algorithm,
    baseCommit: binding.baseCommit,
    gitTreeHash: binding.gitTreeHash,
    sourceDiffSha256: binding.sourceDiffSha256,
    scope: binding.scope,
    dirtyWorktree: binding.dirtyWorktree,
    untrackedIncluded: binding.untrackedIncluded,
    externalEffects: binding.externalEffects
  }
  return sha256(JSON.stringify(unsignedBinding))
}

function verifyGitBinding(binding) {
  const baseCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: repoRoot,
    encoding: 'utf8'
  }).trim()
  const gitTreeHash = execFileSync('git', ['rev-parse', 'HEAD^{tree}'], {
    cwd: repoRoot,
    encoding: 'utf8'
  }).trim()
  assert(binding.baseCommit === baseCommit, 'baseCommit does not match HEAD')
  assert(binding.gitTreeHash === gitTreeHash, 'gitTreeHash does not match HEAD')
}

function verifyRawArtifacts(rawReceipt, commandReceipt) {
  const artifacts = new Map()
  for (const artifact of rawReceipt.artifacts) {
    assert(!artifacts.has(artifact.path), `duplicate raw artifact: ${artifact.path}`)
    const absolutePath = path.join(repoRoot, artifact.path)
    const contents = fs.readFileSync(absolutePath)
    assert(
      contents.byteLength === artifact.bytes,
      `byte count mismatch: ${artifact.path}`
    )
    assert(sha256(contents) === artifact.sha256, `SHA mismatch: ${artifact.path}`)
    artifacts.set(artifact.path, artifact.sha256)
  }

  for (const command of commandReceipt.commands) {
    assert(artifacts.has(command.rawArtifact), `unlisted command artifact: ${command.id}`)
    assert(
      artifacts.get(command.rawArtifact) === command.rawArtifactSha256,
      `command SHA mismatch: ${command.id}`
    )
  }
}

function main() {
  const rawReceipt = readJson(rawReceiptPath)
  const commandReceipt = readJson(commandReceiptPath)
  const binding = rawReceipt.candidateBinding

  assert(binding !== undefined, 'raw receipt has no candidateBinding')
  assert(
    JSON.stringify(binding) === JSON.stringify(commandReceipt.candidateBinding),
    'raw and command receipts have different candidateBinding values'
  )
  assert(binding.algorithm === 'aud20-16-worktree-binding-v1', 'unexpected binding algorithm')
  assert(binding.dirtyWorktree === true, 'dirtyWorktree must be explicit')
  assert(binding.untrackedIncluded === true, 'untrackedIncluded must be explicit')
  assert(binding.externalEffects === false, 'externalEffects must be false')
  assert(Array.isArray(binding.scope) && binding.scope.length > 0, 'binding scope is empty')
  assert(
    new Set(binding.scope).size === binding.scope.length,
    'binding scope contains duplicates'
  )
  verifyGitBinding(binding)
  assert(
    canonicalSourceDigest(binding.scope) === binding.sourceDiffSha256,
    'sourceDiffSha256 does not match the scoped worktree contents'
  )
  assert(candidateId(binding) === binding.candidateId, 'candidateId does not match binding')
  verifyRawArtifacts(rawReceipt, commandReceipt)

  process.stdout.write(
    `${JSON.stringify({
      status: 'PASS',
      candidateId: binding.candidateId,
      scopedFiles: binding.scope.length,
      rawArtifacts: rawReceipt.artifacts.length,
      commandRawLinks: commandReceipt.commands.length
    })}\n`
  )
}

try {
  main()
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
}
