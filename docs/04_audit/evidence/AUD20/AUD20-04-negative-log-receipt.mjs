import crypto from 'node:crypto'
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const root = process.cwd()
const rawPath = path.join(
  root,
  'docs/04_audit/evidence/AUD20/AUD20-04-raw/retention-focused-20260921T1828Z.log'
)
const verifier = path.join(
  root,
  'docs/04_audit/evidence/AUD20/AUD20-04-binding-verifier.mjs'
)
const hash = (value) =>
  crypto.createHash('sha256').update(value).digest('hex')
const original = fs.readFileSync(rawPath)
let child = null
let verifierRejectedMutation = false

try {
  fs.writeFileSync(
    rawPath,
    Buffer.concat([
      original,
      Buffer.from('\n# synthetic AUD20-N-log-mutation\n', 'utf8')
    ])
  )
  child = spawnSync(process.execPath, [verifier], {
    cwd: root,
    encoding: 'utf8'
  })
  const output = `${child.stdout ?? ''}\n${child.stderr ?? ''}`
  verifierRejectedMutation =
    child.status !== 0 && /"match": false/.test(output)
} finally {
  fs.writeFileSync(rawPath, original)
}

const restored = hash(fs.readFileSync(rawPath)) === hash(original)
const result = {
  schemaVersion: 1,
  kind: 'aud20-negative-log-receipt',
  negative: 'AUD20-N-LOG-AFTER-RECEIPT',
  mutatedArtifact: path.relative(root, rawPath),
  verifierRejectedMutation,
  verifierExitCode: child?.status ?? null,
  restored,
  status: verifierRejectedMutation && restored ? 'PASS' : 'FAIL'
}

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
process.exitCode = result.status === 'PASS' ? 0 : 1
