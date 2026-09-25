import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const root = process.cwd()
const bootstrap = process.argv.includes('--bootstrap')
const manifestPath = 'docs/04_audit/evidence/AUD20/AUD20-03-candidate-manifest.json'
const commandReceiptPath =
  'docs/04_audit/evidence/AUD20/AUD20-03-command-receipt.json'
const rawReceiptPath =
  'docs/04_audit/evidence/AUD20/AUD20-03-raw-artifact-receipt.json'
const sourceDiffExclusions = [
  ':!docs/04_audit/evidence/**',
  ':!docs/CURRENT.md',
  ':!docs/20_master_execution_log.md',
  ':!docs/99_runtime_state.md',
  ':!docs/03_build/0334_aud20260920_backlog.md',
  ':!docs/30_backlog_master.md'
]

const readJson = (filePath) =>
  JSON.parse(fs.readFileSync(path.resolve(root, filePath), 'utf8'))
const sha256Bytes = (value) =>
  crypto.createHash('sha256').update(value).digest('hex')
const sha256File = (filePath) =>
  sha256Bytes(fs.readFileSync(path.resolve(root, filePath)))
const fileBytes = (filePath) =>
  fs.statSync(path.resolve(root, filePath)).size

const manifest = readJson(manifestPath)
const commandReceipt = readJson(commandReceiptPath)
const rawReceipt = readJson(rawReceiptPath)
const candidate = manifest.candidate
const commandReceiptCandidateMatch =
  commandReceipt.candidateId === candidate.candidateId
const rawReceiptCandidateMatch = rawReceipt.candidateId === candidate.candidateId
const commandStatusesPass = commandReceipt.commands.every(
  (command) => command.status === 'PASS' && command.exitCode === 0
)
const baseCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: root,
  encoding: 'utf8'
}).trim()
const gitTreeHash = execFileSync('git', ['rev-parse', 'HEAD^{tree}'], {
  cwd: root,
  encoding: 'utf8'
}).trim()
const sourceDiff = execFileSync(
  'git',
  ['diff', '--binary', '--', ...sourceDiffExclusions],
  { cwd: root }
)
const sourceDiffSha256 = sha256Bytes(sourceDiff)
const sourceFiles = manifest.sourceFiles.map(({ path: filePath }) => ({
  path: filePath,
  sha256: sha256File(filePath)
}))
const candidatePayload = {
  schemaVersion: 'aud20-candidate-v2',
  baseCommit,
  gitTreeHash,
  sourceDiffSha256,
  sourceFiles
}
const candidateId = sha256Bytes(JSON.stringify(candidatePayload))
const sourceFilesMatch = sourceFiles.every(
  (file, index) => file.sha256 === manifest.sourceFiles[index].sha256
)

const rawArtifacts = rawReceipt.artifacts.map((artifact) => ({
  path: artifact.path,
  bytes: fileBytes(artifact.path),
  expectedBytes: artifact.bytes,
  sha256: sha256File(artifact.path),
  expectedSha256: artifact.sha256,
  match:
    fileBytes(artifact.path) === artifact.bytes &&
    sha256File(artifact.path) === artifact.sha256
}))
const commandArtifactsMatch = commandReceipt.commands
  .filter((command) => command.rawArtifact !== undefined)
  .every((command) => {
    const artifact = rawReceipt.artifacts.find(
      (entry) => entry.path === command.rawArtifact
    )
    return artifact !== undefined && artifact.sha256 === command.rawArtifactSha256
  })
// The existing binding output is checked before callers capture the next one.
// Capture through a temporary path so stdout-only execution cannot truncate it.
const verificationArtifacts = rawReceipt.verificationArtifacts.map((artifact) => {
  const command = commandReceipt.commands.find(
    (entry) => entry.verificationArtifact === artifact.path
  )
  let previousResult = null
  try {
    previousResult = readJson(artifact.path)
  } catch {
    previousResult = null
  }
  const bytesMatch = fileBytes(artifact.path) === artifact.bytes
  const sha256Match = sha256File(artifact.path) === artifact.sha256
  const commandReceiptMatch =
    command !== undefined && command.verificationArtifactSha256 === artifact.sha256
  const resultCandidateMatch =
    previousResult?.candidateId === candidate.candidateId &&
    previousResult?.candidateIdMatch === true
  const resultSourceDiffMatch = previousResult?.sourceDiffMatch === true
  const resultSourceFilesMatch = previousResult?.sourceFilesMatch === true
  const resultCommandArtifactsMatch =
    previousResult?.commandArtifactsMatch === true
  const resultRawArtifactsMatch =
    Array.isArray(previousResult?.rawArtifacts) &&
    previousResult.rawArtifacts.every((entry) => entry.match === true)
  return {
    path: artifact.path,
    role: artifact.role,
    bytesMatch,
    sha256Match,
    commandReceiptMatch,
    resultCandidateMatch,
    resultSourceDiffMatch,
    resultSourceFilesMatch,
    resultCommandArtifactsMatch,
    resultRawArtifactsMatch,
    match:
      bytesMatch &&
      sha256Match &&
      commandReceiptMatch &&
      resultCandidateMatch &&
      resultSourceDiffMatch &&
      resultSourceFilesMatch &&
      resultCommandArtifactsMatch &&
      resultRawArtifactsMatch
  }
})
const verificationArtifactsMatch = verificationArtifacts.every(
  (artifact) => artifact.match
)
const result = {
  verifier: 'AUD20-03-binding-verifier-v2',
  baseCommit,
  baseCommitMatch: baseCommit === candidate.baseCommit,
  gitTreeHash,
  gitTreeHashMatch: gitTreeHash === candidate.gitTreeHash,
  sourceDiffExclusions,
  sourceDiffSha256,
  sourceDiffMatch: sourceDiffSha256 === candidate.sourceDiffSha256,
  sourceFiles,
  sourceFilesMatch,
  candidateId,
  candidateIdMatch: candidateId === candidate.candidateId,
  commandReceiptCandidateMatch,
  rawReceiptCandidateMatch,
  commandStatusesPass,
  commandArtifactsMatch,
  rawArtifacts,
  verificationArtifacts,
  verificationArtifactsMatch
}
const failed = [
  result.baseCommitMatch,
  result.gitTreeHashMatch,
  result.sourceDiffMatch,
  result.sourceFilesMatch,
  result.candidateIdMatch,
  result.commandReceiptCandidateMatch,
  result.rawReceiptCandidateMatch,
  result.commandStatusesPass,
  result.commandArtifactsMatch,
  result.verificationArtifactsMatch,
  ...rawArtifacts.map((artifact) => artifact.match),
  ...verificationArtifacts.map((artifact) => artifact.match)
].some((value) => value !== true)
if (failed && !bootstrap) throw new Error(JSON.stringify(result, null, 2))

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
