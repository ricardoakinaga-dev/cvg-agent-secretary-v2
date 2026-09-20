#!/usr/bin/env node
/**
 * AUD19-08 executable skip inventory.
 *
 * Runs the vitest suite (or parses a previously written JSON report) and
 * classifies every skipped test as `required` or `optional` against the frozen
 * manifest in docs/03_build/tracking/aud19-required-skips.json.
 * A skip is only optional when a rule matches the exact test under the exact
 * execution context; everything else fails closed as required.
 *
 * Usage:
 *   node scripts/skip-inventory.mjs --gate=unit
 *   node scripts/skip-inventory.mjs --gate=postgres --files=a.test.ts,b.test.ts
 *   node scripts/skip-inventory.mjs --gate=unit --report=path/to/report.json
 *   node scripts/skip-inventory.mjs --gate=unit --merge
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DEFAULT_SKIP_MANIFEST_PATH,
  loadSkipManifest,
  readPostgresScopedFiles,
  skipInventoryArtifact
} from './lib/skip-policy.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const option = (name, fallback = null) => {
  const prefix = `--${name}=`
  const found = args.find((argument) => argument.startsWith(prefix))
  return found ? found.slice(prefix.length) : fallback
}
const has = (name) => args.includes(`--${name}`)

const gate = option('gate', 'unit')
const reportOption = option('report')
const filesOption = option('files')
const outJson = path.resolve(
  root,
  option(
    'out-json',
    'docs/04_audit/evidence/AUD19/AUD19-08-skip-inventory.json'
  )
)
const outMd = path.resolve(
  root,
  option('out-md', 'docs/04_audit/evidence/AUD19/AUD19-08-skip-inventory.md')
)
const merge = has('merge')
const failOnRequired = has('fail-on-required')

const manifestPath = option('manifest', DEFAULT_SKIP_MANIFEST_PATH)
const manifest = loadSkipManifest(root, manifestPath)
if (!manifest) {
  process.stderr.write(
    `[skip-inventory] manifest missing or invalid: ${manifestPath}\n`
  )
  process.exitCode = 2
  process.exit()
}

const databaseAvailable = Boolean(process.env.TEST_DATABASE_URL)
const postgresScopedFiles = readPostgresScopedFiles(root)

function runVitest() {
  const temporaryReport = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'aud19-skip-inventory-')),
    'vitest-report.json'
  )
  const selectedFiles = filesOption
    ? filesOption.split(/[,\s]+/).filter(Boolean)
    : []
  const vitestArgs = [
    'vitest',
    'run',
    ...selectedFiles,
    '--no-file-parallelism',
    '--maxWorkers=2',
    '--reporter=json',
    `--outputFile=${temporaryReport}`
  ]
  const command = `npx ${vitestArgs.join(' ')}`
  const startedAt = Date.now()
  const result = spawnSync('npx', vitestArgs, {
    cwd: root,
    encoding: 'utf8',
    timeout: 3_600_000,
    maxBuffer: 128 * 1024 * 1024,
    env: { ...process.env, CI: process.env.CI ?? 'true' }
  })
  const durationMs = Date.now() - startedAt
  if (!fs.existsSync(temporaryReport)) {
    process.stderr.write(
      `[skip-inventory] vitest did not write a JSON report (exit ${result.status ?? 1})\n${(result.stderr ?? '').slice(-2000)}\n`
    )
    process.exitCode = 1
    process.exit()
  }
  const generated = {
    report: JSON.parse(fs.readFileSync(temporaryReport, 'utf8')),
    command,
    exitCode: result.status ?? 1,
    durationMs
  }
  fs.rmSync(path.dirname(temporaryReport), { recursive: true, force: true })
  return generated
}

let report
let command
let exitCode = 0
let durationMs = null
if (reportOption) {
  const absolute = path.resolve(root, reportOption)
  if (!fs.existsSync(absolute)) {
    process.stderr.write(`[skip-inventory] report not found: ${reportOption}\n`)
    process.exitCode = 2
    process.exit()
  }
  report = JSON.parse(fs.readFileSync(absolute, 'utf8'))
  command = option('command', `parsed:${reportOption}`)
} else {
  const generated = runVitest()
  report = generated.report
  command = generated.command
  exitCode = generated.exitCode
  durationMs = generated.durationMs
}

const context = skipInventoryArtifact({
  gate,
  command,
  databaseAvailable,
  report,
  manifest,
  postgresScopedFiles,
  root
})
context.exitCode = exitCode
if (durationMs !== null) context.durationMs = durationMs
context.source = reportOption ? `report:${reportOption}` : 'fresh vitest run'

let artifact
if (merge && fs.existsSync(outJson)) {
  artifact = JSON.parse(fs.readFileSync(outJson, 'utf8'))
  const contexts = (artifact.contexts ?? []).filter(
    (entry) =>
      !(
        entry.gate === context.gate &&
        entry.databaseAvailable === context.databaseAvailable
      )
  )
  contexts.push(context)
  artifact.contexts = contexts
} else {
  artifact = {
    schemaVersion: 1,
    kind: 'aud19-skip-inventory',
    program: 'AUD19-REM',
    task: 'AUD19-08',
    generatedAt: new Date().toISOString(),
    node: process.versions.node,
    manifest: manifestPath,
    contexts: [context]
  }
}
artifact.contexts.sort((left, right) =>
  `${left.gate}:${left.databaseAvailable}` <
  `${right.gate}:${right.databaseAvailable}`
    ? -1
    : 1
)
const summary = artifact.contexts.reduce(
  (total, entry) => ({
    totalSkips: total.totalSkips + entry.counts.total,
    required: total.required + entry.counts.required,
    optional: total.optional + entry.counts.optional
  }),
  { totalSkips: 0, required: 0, optional: 0 }
)
artifact.summary = {
  ...summary,
  status: summary.required === 0 ? 'PASS' : 'REQUIRED_SKIPS_FOUND'
}
fs.mkdirSync(path.dirname(outJson), { recursive: true })
fs.writeFileSync(outJson, `${JSON.stringify(artifact, null, 2)}\n`)

function renderMarkdown(document) {
  const lines = []
  lines.push('# AUD19-08 — inventário executável de skips')
  lines.push('')
  lines.push(
    `Gerado em \`${document.generatedAt}\` (Node \`${document.node}\`) pelo script \`scripts/skip-inventory.mjs\`.`
  )
  lines.push('')
  lines.push(`Manifesto congelado: \`${document.manifest}\`.`)
  lines.push('')
  lines.push('## Resumo')
  lines.push('')
  lines.push('| Gate | DB disponível | Skips | Required | Optional | Origem |')
  lines.push('| --- | --- | ---: | ---: | ---: | --- |')
  for (const entry of document.contexts) {
    lines.push(
      `| ${entry.gate} | ${entry.databaseAvailable ? 'sim' : 'não'} | ${entry.counts.total} | **${entry.counts.required}** | ${entry.counts.optional} | ${entry.source} |`
    )
  }
  lines.push('')
  lines.push(
    `Status agregado: **${document.summary.status}** — required=${document.summary.required}, optional=${document.summary.optional}, total=${document.summary.totalSkips}.`
  )
  lines.push('')
  lines.push('## Contextos')
  for (const entry of document.contexts) {
    lines.push('')
    lines.push(
      `### Gate \`${entry.gate}\` (DB ${entry.databaseAvailable ? 'disponível' : 'ausente'})`
    )
    lines.push('')
    lines.push(`Comando: \`${entry.command}\``)
    lines.push('')
    lines.push(
      `Totais do runner: arquivos=${entry.totals.testFiles}, testes=${entry.totals.tests ?? 'n/d'}, passados=${entry.totals.passed ?? 'n/d'}, falhos=${entry.totals.failed ?? 'n/d'}, skips=${entry.totals.skipped ?? 'n/d'}.`
    )
    if (entry.files.length === 0) {
      lines.push('')
      lines.push('Nenhum skip observado neste contexto.')
      continue
    }
    lines.push('')
    lines.push('| Arquivo | Skips | Required | Optional |')
    lines.push('| --- | ---: | ---: | ---: |')
    for (const file of entry.files) {
      lines.push(
        `| \`${file.file}\` | ${file.total} | ${file.required} | ${file.optional} |`
      )
    }
    if (entry.required.length > 0) {
      lines.push('')
      lines.push('**Skips required (bloqueiam o gate):**')
      lines.push('')
      for (const record of entry.required) {
        lines.push(
          `- \`${record.file}\` — ${record.name || '(sem nome)'} — regra \`${record.ruleId}\`: ${record.reason}`
        )
      }
    }
    if (entry.optional.length > 0) {
      lines.push('')
      lines.push('**Skips optional (justificativa congelada):**')
      lines.push('')
      for (const record of entry.optional) {
        lines.push(
          `- \`${record.file}\` — ${record.name || '(sem nome)'} — regra \`${record.ruleId}\`${record.coveredByGate ? `, coberto por \`${record.coveredByGate}\`` : ''}: ${record.reason}`
        )
      }
    }
  }
  lines.push('')
  lines.push('## Método e limites')
  lines.push('')
  lines.push(
    '- A classificação é feita por regra congelada + contexto de execução; um `skipJustification` textual nunca rebaixa um skip required.'
  )
  lines.push(
    '- O gate PostgreSQL exige zero skips quando executa com banco disponível; o inventário do gate `unit` apenas reconhece como optional os arquivos efetivamente selecionados por `scripts.test:postgres`, que é onde esses testes são executados.'
  )
  lines.push(
    '- Skips não cobertos por nenhuma regra são classificados como required (fail-closed) e permanecem como gap explícito até triagem.'
  )
  return `${lines.join('\n')}\n`
}

fs.writeFileSync(outMd, renderMarkdown(artifact))
process.stdout.write(
  `${JSON.stringify(
    {
      kind: 'aud19-skip-inventory-summary',
      gate,
      databaseAvailable,
      counts: context.counts,
      status: artifact.summary.status,
      outJson: path.relative(root, outJson),
      outMd: path.relative(root, outMd)
    },
    null,
    2
  )}\n`
)
if (failOnRequired && artifact.summary.required > 0) {
  process.exitCode = 1
}
