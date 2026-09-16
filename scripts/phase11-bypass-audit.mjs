#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const scopedPrefixes = [
  'apps/api/src',
  'apps/worker/src',
  'packages/agent-core/src'
]
const ignoredName = /(?:\.test\.|\.spec\.)/
const forbidden = [
  { id: 'direct_fetch', pattern: /\bfetch\s*\(/g },
  { id: 'direct_evolution', pattern: /EvolutionAPI/g },
  { id: 'direct_chatwoot', pattern: /Chatwoot/g },
  { id: 'direct_channel_send', pattern: /\bsendMessage\s*\(/g },
  { id: 'direct_external_http', pattern: /\b(?:axios|got|undici)\s*\(/g },
  { id: 'direct_sql_write', pattern: /\b(?:INSERT|UPDATE|DELETE)\s+INTO?\b/gi }
]

const allowedBoundary = (relativePath, findingId) => {
  if (findingId === 'direct_fetch') return false
  if (findingId === 'direct_evolution' || findingId === 'direct_chatwoot')
    return false
  if (findingId === 'direct_channel_send') return false
  if (findingId === 'direct_external_http') return false
  if (findingId === 'direct_sql_write') {
    return relativePath === 'apps/api/src/webhook-security.ts'
  }
  return relativePath.startsWith('packages/channel-gateway/src/adapters/')
}

const listed = spawnSync('git', ['ls-files', '-z', '--', ...scopedPrefixes], {
  cwd: root,
  encoding: 'utf8'
})
const files = (listed.stdout ?? '')
  .split('\0')
  .filter(Boolean)
  .filter((file) => !ignoredName.test(file))
  .filter((file) => /\.(?:ts|tsx|js|mjs|cjs)$/.test(file))

const findings = []
for (const relativePath of files) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8')
  for (const rule of forbidden) {
    rule.pattern.lastIndex = 0
    let match
    while ((match = rule.pattern.exec(source)) !== null) {
      if (allowedBoundary(relativePath, rule.id)) continue
      const line = source.slice(0, match.index).split('\n').length
      findings.push({ id: rule.id, path: relativePath, line })
    }
  }
}

const report = {
  schemaVersion: 1,
  kind: 'phase11-bypass-audit',
  status: findings.length === 0 ? 'PASS' : 'FAIL',
  scannedFiles: files.length,
  findings,
  allowedEffectBoundaries: [
    'packages/channel-gateway/src/adapters/',
    'packages/model-gateway/src/providers/',
    'packages/adapters/src/fake/'
  ],
  note: 'Application and worker entrypoints must route through the governed kernel; adapter implementations are the only outbound boundary.'
}
console.log(JSON.stringify(report, null, 2))
process.exitCode = findings.length === 0 ? 0 : 1
