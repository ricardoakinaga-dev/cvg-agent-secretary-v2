#!/usr/bin/env node
/**
 * Dependency license review for package-lock.json. Denies copyleft licenses
 * that are incompatible with the project distribution model and records the
 * full report at certification/license-report.json.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const lock = JSON.parse(
  fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8')
)

const DENIED_PATTERNS = [
  /\bAGPL\b/i,
  /^GPL-/i,
  /^GPL\b/i,
  /SSPL/i,
  /BUSL/i,
  /^CPAL/i,
  /^OSL/i,
  /Commons-Clause/i
]

const packages = []
for (const [packagePath, meta] of Object.entries(lock.packages ?? {})) {
  if (!packagePath.startsWith('node_modules/')) continue
  const name = meta.name ?? packagePath.replace(/^node_modules\//, '')
  const license =
    typeof meta.license === 'string'
      ? meta.license
      : Array.isArray(meta.licenses)
        ? meta.licenses.join(' OR ')
        : null
  const denied = license
    ? DENIED_PATTERNS.some((pattern) => pattern.test(license))
    : false
  packages.push({
    name,
    version: meta.version ?? '0.0.0',
    license,
    dev: meta.dev === true,
    denied
  })
}

const denied = packages.filter((entry) => entry.denied)
const unknown = packages.filter((entry) => entry.license === null)
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  total: packages.length,
  deniedCount: denied.length,
  unknownCount: unknown.length,
  denied,
  unknown: unknown.map((entry) => `${entry.name}@${entry.version}`)
}

fs.mkdirSync(path.join(root, 'certification'), { recursive: true })
fs.writeFileSync(
  path.join(root, 'certification', 'license-report.json'),
  `${JSON.stringify(report, null, 2)}\n`
)

console.log(
  JSON.stringify({
    event: 'licenses.checked',
    total: packages.length,
    denied: denied.length,
    unknown: unknown.length
  })
)
if (denied.length > 0) {
  process.exitCode = 1
}
