import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const evidenceDirectory = path.dirname(fileURLToPath(import.meta.url))
const repositoryRoot = path.resolve(evidenceDirectory, '../../../..')
const manifestPath = path.join(
  evidenceDirectory,
  'AUD20-05-v1-candidate-manifest.json'
)
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const failures = []

for (const entry of manifest.candidateBinding.files) {
  const actual = sha256(readFileSync(path.join(repositoryRoot, entry.path)))
  if (actual !== entry.sha256) failures.push(`digest:${entry.path}`)
}

const sourceDigest = sha256(
  manifest.candidateBinding.files
    .map((entry) => `${entry.path}\0${entry.sha256}\n`)
    .join('')
)
if (sourceDigest !== manifest.candidateBinding.sourceDigest) {
  failures.push('sourceDigest')
}

const baseCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: repositoryRoot,
  encoding: 'utf8'
}).trim()
if (baseCommit !== manifest.candidateBinding.baseCommit) {
  failures.push('baseCommit')
}

const candidateId = sha256(
  `AUD20-05\0${baseCommit}\0${sourceDigest}`
)
if (candidateId !== manifest.candidateBinding.candidateId) {
  failures.push('candidateId')
}

const result = {
  schemaVersion: 1,
  kind: 'aud20-05-binding-verification',
  status: failures.length === 0 ? 'PASS' : 'FAIL',
  candidateId,
  filesChecked: manifest.candidateBinding.files.length,
  failures,
  releaseEligible: false
}
console.log(JSON.stringify(result, null, 2))
if (failures.length > 0) process.exitCode = 1
