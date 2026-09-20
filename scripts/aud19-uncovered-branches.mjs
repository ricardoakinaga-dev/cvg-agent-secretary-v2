#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const option = (name, fallback = null) => {
  const prefix = `--${name}=`
  const found = args.find((argument) => argument.startsWith(prefix))
  return found ? found.slice(prefix.length) : fallback
}

const reportPath = option('report', 'coverage/aud19-json/coverage-final.json')
const filter = option('file', '')
const absolute = path.join(root, reportPath)
if (!fs.existsSync(absolute)) {
  process.stderr.write(`coverage report not found: ${reportPath}\n`)
  process.exitCode = 2
  process.exit()
}

const report = JSON.parse(fs.readFileSync(absolute, 'utf8'))
const output = []
for (const [file, data] of Object.entries(report)) {
  const relative = path.relative(root, file)
  if (filter && !relative.includes(filter)) continue
  const uncovered = []
  for (const [branchId, counts] of Object.entries(data.b ?? {})) {
    const meta = data.branchMap?.[branchId]
    if (!meta) continue
    counts.forEach((count, index) => {
      if (count > 0) return
      const location = meta.locations?.[index] ?? meta.loc
      uncovered.push({
        line: location?.start?.line ?? meta.line ?? null,
        type: meta.type ?? 'branch',
        index
      })
    })
  }
  uncovered.sort((left, right) => (left.line ?? 0) - (right.line ?? 0))
  const byLine = new Map()
  for (const entry of uncovered) {
    const key = `${entry.line}:${entry.type}`
    byLine.set(key, (byLine.get(key) ?? 0) + 1)
  }
  const functions = Object.entries(data.f ?? {})
    .filter(([, count]) => count === 0)
    .map(([id]) => data.fnMap?.[id]?.loc?.start?.line ?? null)
  output.push({
    file: relative,
    uncoveredBranches: uncovered.length,
    branchTypes: [...byLine.entries()].map(([key, count]) => ({ key, count })),
    uncoveredFunctions: functions
  })
}
output.sort((left, right) => right.uncoveredBranches - left.uncoveredBranches)
process.stdout.write(`${JSON.stringify(output, null, 2)}\n`)
