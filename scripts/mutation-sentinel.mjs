#!/usr/bin/env node
/**
 * AUD19-08 mutation sentinel CLI.
 *
 * Runs pre-selected critical mutants against focused tests inside a throwaway
 * sandbox. The working tree is never modified. `--out` persists the raw report
 * as evidence; undetected or non-applicable mutants are reported honestly as
 * gaps instead of being counted as detected.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runMutationSentinel } from './lib/mutation-sentinel.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const option = (name, fallback = null) => {
  const prefix = `--${name}=`
  const found = args.find((argument) => argument.startsWith(prefix))
  return found ? found.slice(prefix.length) : fallback
}
const has = (name) => args.includes(`--${name}`)

const only = option('only')
  ? option('only')
      .split(/[,\s]+/)
      .filter(Boolean)
  : null
const max = option('max') ? Number(option('max')) : null
const outPath = option(
  'out',
  'docs/04_audit/evidence/AUD19/AUD19-08-mutation-sentinel-report.json'
)
const report = runMutationSentinel({
  root,
  manifestPath: option(
    'manifest',
    'docs/04_audit/evidence/AUD19/AUD19-08-mutants.json'
  ),
  only,
  max,
  timeoutMs: option('timeout-ms') ? Number(option('timeout-ms')) : 180_000,
  keepSandbox: has('keep')
})

const absoluteOut = path.resolve(root, outPath)
fs.mkdirSync(path.dirname(absoluteOut), { recursive: true })
fs.writeFileSync(absoluteOut, `${JSON.stringify(report, null, 2)}\n`)
for (const entry of report.results) {
  process.stdout.write(
    `[mutation] ${entry.status.padEnd(14)} ${entry.id} ${entry.target ?? ''}\n`
  )
}
process.stdout.write(
  `[mutation] status=${report.status} detected=${report.summary.detected}/${report.summary.total} notDetected=${report.summary.notDetected} notApplicable=${report.summary.notApplicable}\n`
)
if (has('fail-on-gaps') && report.status !== 'PASS') {
  process.exitCode = 1
}
