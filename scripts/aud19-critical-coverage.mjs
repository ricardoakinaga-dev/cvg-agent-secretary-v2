#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const CRITICAL_COVERAGE_MANIFEST_PATH =
  'docs/03_build/tracking/aud19-critical-coverage.json'

export function loadCriticalCoverageManifest(
  root,
  relativePath = CRITICAL_COVERAGE_MANIFEST_PATH
) {
  const absolute = path.join(root, relativePath)
  if (!fs.existsSync(absolute)) return null
  try {
    const manifest = JSON.parse(fs.readFileSync(absolute, 'utf8'))
    if (manifest?.kind !== 'aud19-critical-coverage') return null
    if (!Number.isFinite(manifest.floorBranchesPct)) return null
    if (
      !manifest.criticalModules ||
      typeof manifest.criticalModules !== 'object'
    )
      return null
    return manifest
  } catch {
    return null
  }
}

export function evaluateCriticalCoverage({ summary, manifest }) {
  const floor = manifest.floorBranchesPct
  const modules = []
  for (const [moduleName, entries] of Object.entries(
    manifest.criticalModules
  )) {
    let total = 0
    let covered = 0
    const missing = []
    for (const [file, metrics] of Object.entries(summary)) {
      if (file === 'total') continue
      const matches = entries.some((entry) => {
        if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
          return file.endsWith(`/${entry}`) || file === entry
        }
        return file.includes(entry)
      })
      if (!matches) continue
      total += metrics.branches.total
      covered += metrics.branches.covered
      if (metrics.branches.total > 0 && metrics.branches.pct < floor) {
        missing.push({
          file,
          pct: metrics.branches.pct,
          missed: metrics.branches.total - metrics.branches.covered
        })
      }
    }
    const pct = total === 0 ? 0 : (covered / total) * 100
    modules.push({
      module: moduleName,
      files: entries,
      branches: total,
      covered,
      pct,
      pass: total > 0 && pct >= floor,
      filesBelowFloor: missing.sort((left, right) => right.missed - left.missed)
    })
  }
  const failed = modules.filter((module) => !module.pass)
  return {
    schemaVersion: 1,
    kind: 'aud19-critical-coverage-report',
    floorBranchesPct: floor,
    valid: modules.length > 0 && failed.length === 0,
    modules,
    blockers: failed.map(
      (module) =>
        `critical_branch_coverage:${module.module}:${module.pct.toFixed(2)}`
    )
  }
}

const isMain =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const summaryArgument =
    process.argv
      .find((argument) => argument.startsWith('--summary='))
      ?.slice(10) ?? 'coverage/coverage-summary.json'
  const summaryPath = path.join(root, summaryArgument)
  const manifest = loadCriticalCoverageManifest(root)
  if (!manifest) {
    process.stderr.write(
      `${JSON.stringify({ event: 'critical_coverage.failed', reason: 'manifest_missing_or_invalid' })}\n`
    )
    process.exitCode = 1
  } else if (!fs.existsSync(summaryPath)) {
    process.stderr.write(
      `${JSON.stringify({ event: 'critical_coverage.failed', reason: 'summary_missing', summaryPath })}\n`
    )
    process.exitCode = 1
  } else {
    const report = evaluateCriticalCoverage({
      summary: JSON.parse(fs.readFileSync(summaryPath, 'utf8')),
      manifest
    })
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
    process.exitCode = report.valid ? 0 : 1
  }
}
