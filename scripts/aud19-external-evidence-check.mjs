#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import {
  EXTERNAL_ATTESTATION_ENV,
  EXTERNAL_ATTESTATION_SIGNAL_KEYS,
  EXTERNAL_CANDIDATE_DIGEST_ENV,
  evaluateExternalSignalsAttestation
} from './lib/production-preflight-core.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const option = (name, fallback = null) => {
  const prefix = `--${name}=`
  const found = args.find((argument) => argument.startsWith(prefix))
  return found ? found.slice(prefix.length) : fallback
}

const gate = option('gate')
const attestation = option('attestation')
const profile = (option('profile', 'PRODUCTION') ?? 'PRODUCTION').toUpperCase()
const expectation = (option('expect', 'APPROVE') ?? 'APPROVE').toUpperCase()

const emit = (payload) => {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`)
}

if (
  gate === null ||
  !EXTERNAL_ATTESTATION_SIGNAL_KEYS.includes(gate) ||
  attestation === null ||
  !['PRODUCTION', 'STAGING'].includes(profile) ||
  !['APPROVE', 'REJECT'].includes(expectation)
) {
  emit({
    schemaVersion: 1,
    kind: 'aud19-external-evidence-check',
    status: 'INVALID_INVOCATION',
    gate,
    profile,
    expectation,
    allowedGates: EXTERNAL_ATTESTATION_SIGNAL_KEYS,
    note: 'External attestations are never promoted from fixtures; the check is read-only and never contacts external systems.'
  })
  process.exitCode = 2
  process.exit()
}

const absolute = path.isAbsolute(attestation)
  ? attestation
  : path.join(root, attestation)
const rejected = (reason) => ({
  schemaVersion: 1,
  kind: 'aud19-external-evidence-check',
  status: 'REJECTED',
  gate,
  profile,
  expectation,
  sideEffects: false,
  exchangedWithExternalSystem: false,
  reason
})

if (!fs.existsSync(absolute)) {
  emit(rejected(`attestation file not found: ${attestation}`))
  process.exitCode = expectation === 'REJECT' ? 0 : 1
  process.exit()
}

const bytes = fs.readFileSync(absolute)
const digest = createHash('sha256').update(bytes).digest('hex')
const env = {
  ...process.env,
  [EXTERNAL_ATTESTATION_ENV.file]: absolute,
  [EXTERNAL_ATTESTATION_ENV.sha256]: digest,
  [EXTERNAL_CANDIDATE_DIGEST_ENV]:
    option('candidate-digest') ??
    process.env[EXTERNAL_CANDIDATE_DIGEST_ENV] ??
    ''
}
const evaluation = evaluateExternalSignalsAttestation({ env, root, profile })
const signal = evaluation.valid ? evaluation.signals[gate] : null
const approved = evaluation.valid && signal === 'APPROVED'
const result = approved
  ? {
      schemaVersion: 1,
      kind: 'aud19-external-evidence-check',
      status: 'APPROVED',
      gate,
      profile,
      expectation,
      sideEffects: false,
      exchangedWithExternalSystem: false,
      owner: evaluation.owner,
      expiresAt: evaluation.expiresAt,
      attestationSha256: digest,
      note: 'Structural validation only; the owning authority and dossier remain required for the external gate.'
    }
  : rejected(evaluation.reason ?? 'attestation rejected')
emit(result)
process.exitCode = (expectation === 'APPROVE') === approved ? 0 : 1
