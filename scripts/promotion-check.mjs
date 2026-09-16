#!/usr/bin/env node
/** Read-only promotion gate backed by the current Phase 11 verifier. */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DEPLOYMENT_PROFILES,
  PHASE11_2_REQUIRED_GATES,
  Phase11CurrentResultSchema,
  computePromotionDecision
} from './lib/phase11-rules.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const requestedIndex = process.argv.indexOf('--requested')
const requestedProfile =
  requestedIndex >= 0 && process.argv[requestedIndex + 1]
    ? process.argv[requestedIndex + 1]
    : 'PRODUCTION'
const resultRelative = 'certification/phase11/phase11-result.json'
const resultPath = path.join(root, resultRelative)
const verifier = spawnSync(
  process.execPath,
  [path.join(root, 'scripts/phase11-verify.mjs'), '--evidence-only'],
  {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, CVG_ALLOW_REAL_EFFECTS: '0' }
  }
)
const verifierPassed = verifier.status === 0
let result = null
try {
  result = Phase11CurrentResultSchema.parse(
    JSON.parse(fs.readFileSync(resultPath, 'utf8'))
  )
} catch {
  result = null
}

const invalidProfile = !DEPLOYMENT_PROFILES.includes(requestedProfile)
const promotion =
  result && !invalidProfile
    ? computePromotionDecision({
        result,
        requestedProfile,
        requiredGates: PHASE11_2_REQUIRED_GATES
      })
    : {
        eligible: false,
        currentProfile: result?.deploymentProfile ?? 'UNKNOWN',
        requestedProfile,
        blockingGates: ['current_certification_unavailable'],
        blockingFindings: [],
        blockingInvariants: [],
        externalBlockers: [],
        reason: invalidProfile
          ? 'requested_profile_invalid'
          : 'current_certification_unavailable'
      }
const eligible = verifierPassed && promotion.eligible
const output = {
  schemaVersion: 1,
  kind: 'phase11-promotion-check',
  eligible,
  verifier: verifierPassed ? 'PASS' : 'FAIL',
  currentProfile: promotion.currentProfile,
  requestedProfile,
  blockingGates: promotion.blockingGates,
  blockingFindings: promotion.blockingFindings,
  blockingInvariants: promotion.blockingInvariants,
  externalBlockers: promotion.externalBlockers,
  reason: eligible
    ? 'promotion_eligible'
    : verifierPassed
      ? promotion.reason
      : 'current_certification_invalid',
  noProductionEffect: true
}
process.stdout.write(`${JSON.stringify(output, null, 2)}\n`)
process.exitCode = eligible ? 0 : 1
