#!/usr/bin/env node
/**
 * Independent verification of the Phase 10 certification.
 *
 * Reads certification/phase10-result.json and certification/manifest.json,
 * validates schemas, re-hashes every artifact, recomputes the GO/NO-GO
 * decision from gate evidence and exits 0 only when the stored state is
 * coherent and every required local gate passed.
 *
 * Usage: npm run certification:verify
 */
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CertificationManifestSchema,
  PHASE10_REQUIRED_LOCAL_GATES,
  Phase10ResultSchema,
  computeDecision
} from './lib/certification-rules.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const failures = []

function fail(message) {
  failures.push(message)
  process.stderr.write(`[verify] FAIL ${message}\n`)
}

function ok(message) {
  process.stderr.write(`[verify] PASS ${message}\n`)
}

const resultPath = path.join(root, 'certification', 'phase10-result.json')
const manifestPath = path.join(root, 'certification', 'manifest.json')

if (!fs.existsSync(resultPath))
  fail('certification/phase10-result.json missing')
if (!fs.existsSync(manifestPath)) fail('certification/manifest.json missing')
if (failures.length > 0) {
  process.exit(1)
}

let result
let manifest
try {
  result = Phase10ResultSchema.parse(
    JSON.parse(fs.readFileSync(resultPath, 'utf8'))
  )
  ok('phase10-result.json matches schema')
} catch (error) {
  fail(`phase10-result.json schema invalid: ${error.message}`)
}

try {
  manifest = CertificationManifestSchema.parse(
    JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  )
  ok('manifest.json matches schema')
} catch (error) {
  fail(`manifest.json schema invalid: ${error.message}`)
}

if (!result || !manifest) {
  process.exit(1)
}

for (const artifact of manifest.artifacts) {
  const absolute = path.join(root, artifact.path)
  if (!fs.existsSync(absolute)) {
    fail(`artifact missing: ${artifact.path}`)
    continue
  }
  const content = fs.readFileSync(absolute)
  const sha256 = createHash('sha256').update(content).digest('hex')
  if (sha256 !== artifact.sha256) {
    fail(`artifact hash mismatch: ${artifact.path}`)
  }
  if (content.byteLength !== artifact.size) {
    fail(`artifact size mismatch: ${artifact.path}`)
  }
}
ok(`verified ${manifest.artifacts.length} artifact hashes`)

const recomputed = computeDecision({
  gates: result.gates,
  findings: result.findings,
  externalGates: result.externalGates
})
if (recomputed.decision !== result.decision) {
  fail(
    `decision mismatch: stored ${result.decision}, recomputed ${recomputed.decision}`
  )
} else {
  ok(`decision is coherent: ${result.decision}`)
}
if (recomputed.certification !== result.certification) {
  fail(
    `certification mismatch: stored ${result.certification}, recomputed ${recomputed.certification}`
  )
} else {
  ok(`certification is coherent: ${result.certification}`)
}

for (const id of PHASE10_REQUIRED_LOCAL_GATES) {
  const gate = result.gates.find((candidate) => candidate.id === id)
  if (!gate) {
    fail(`required gate missing: ${id}`)
    continue
  }
  if (gate.status !== 'PASS') {
    fail(`required gate not PASS: ${id} (${gate.status})`)
  }
}

const executedChaos = result.metrics?.chaos?.executed ?? 0
const failedChaos = result.metrics?.chaos?.failed ?? 0
if (failedChaos > 0) fail(`chaos scenarios failed: ${failedChaos}`)
if (executedChaos < 14) {
  fail(`chaos executed scenarios below minimum: ${executedChaos}`)
}

const evalVerdict = result.metrics?.evals?.verdict
if (evalVerdict !== 'PASS') {
  fail(`agent eval verdict is ${evalVerdict ?? 'missing'}`)
}

const load = result.metrics?.load
if (!load || load.loss !== 0 || load.duplicates !== 0) {
  fail(
    `load check inconsistent: loss=${load?.loss}, duplicates=${load?.duplicates}`
  )
}
const restore = result.metrics?.restore
if (!restore || restore.integrity?.digestMatches !== true) {
  fail('restore integrity check missing or failing')
}

if (result.decision === 'GO') {
  fail('GO requires validated external gates and human signoff; not satisfied')
}

if (failures.length > 0) {
  process.stderr.write(`[verify] ${failures.length} failure(s)\n`)
  process.exit(1)
}

process.stderr.write(
  `[verify] certification coherent: ${result.decision} / ${result.certification}\n`
)
process.exit(0)
