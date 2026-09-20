/**
 * AUD19-09 synthetic observability exercise.
 *
 * Runs the deterministic local exercise (webhook -> outbox -> worker failure ->
 * DLQ -> UNCERTAIN -> operator replay -> effect), exercises all three collector
 * adapters with an injected canary and writes the redaction evidence. It never
 * contacts the network, never uses real data and never writes outside the
 * evidence directory (or a temporary directory for the file-adapter proof).
 *
 * Usage:
 *   npx tsx scripts/aud19-09-observability-exercise.ts --dry-run
 *   npx tsx scripts/aud19-09-observability-exercise.ts --alert AUD19-09-ALERT-DLQ --json
 *   npx tsx scripts/aud19-09-observability-exercise.ts
 */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  InProcessCollector,
  createFileCollector,
  createOtlpJsonCollector,
  runObservabilityExercise,
  type CollectorExport,
  type CollectorRedactionReport,
  type ObservabilityCollectorPort,
  type OtlpJsonExport
} from '@cvg/observability'
import { createCollectorWorkerTelemetry } from '../apps/worker/src/worker-observability.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const evidenceDirectory = join(root, 'docs/04_audit/evidence/AUD19')
const exercisePath = join(
  evidenceDirectory,
  'AUD19-09-observability-exercise.json'
)
const redactionPath = join(evidenceDirectory, 'AUD19-09-redaction-report.json')
const CANARY = 'SENSITIVE-AUD19-09-CANARY'

const args = process.argv.slice(2)

function flagValue(name: string): string | undefined {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}

function canaryHits(content: string): number {
  return content.includes(CANARY) ? 1 : 0
}

interface AdapterCheck {
  adapter: string
  enabled: boolean
  canaryHits: number
  exportedSpans: number
  exportedMetrics: number
  exportedLogs: number
  blockedCanaries: number
  detail: string
}

function adapterCheck(
  adapter: string,
  exported: CollectorExport,
  serialized: string,
  detail: string
): AdapterCheck {
  return {
    adapter,
    enabled: exported.enabled,
    canaryHits: canaryHits(serialized),
    exportedSpans: exported.redaction.exportedSpans,
    exportedMetrics: exported.redaction.exportedMetrics,
    exportedLogs: exported.redaction.exportedLogs,
    blockedCanaries: exported.redaction.blockedCanaries,
    detail
  }
}

function injectCanary(collector: ObservabilityCollectorPort): void {
  collector.recordSpan({
    name: 'worker.outbox.failed',
    traceId: 'e'.repeat(32),
    spanId: '9'.repeat(16),
    correlationId: 'corr_aud19_09_canary',
    startedAt: new Date(0).toISOString(),
    endedAt: new Date(0).toISOString(),
    durationMs: 1,
    status: 'error',
    attributes: { operation: 'outbox', objective: CANARY, status: CANARY }
  })
  collector.recordMetric({
    name: 'worker_outbox_failed_total',
    value: 1,
    attributes: { status: CANARY, outcome: CANARY },
    timestamp: new Date(0).toISOString()
  })
  collector.recordLog({
    level: 'error',
    message: 'worker.outbox.failed',
    fields: {
      eventId: 'outbox_aud19_09_canary',
      error: CANARY,
      payload: { note: CANARY },
      status: CANARY
    },
    timestamp: new Date(0).toISOString()
  })
}

async function runAdapterProofs(
  workerExport: CollectorExport
): Promise<AdapterCheck[]> {
  const checks: AdapterCheck[] = []
  checks.push(
    adapterCheck(
      'in_process_worker_sink',
      workerExport,
      JSON.stringify(workerExport),
      'sink do worker ligado ao collector in-process durante o exercício'
    )
  )

  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'aud19-09-evidence-'))
  try {
    const filePath = join(temporaryDirectory, 'collector.jsonl')
    const fileCollector = createFileCollector({ enabled: true, filePath })
    injectCanary(fileCollector)
    const fileExport = await fileCollector.flush()
    const fileContent = existsSync(filePath)
      ? readFileSync(filePath, 'utf8')
      : ''
    checks.push(
      adapterCheck(
        'file_jsonl',
        fileExport,
        fileContent,
        'adapter de arquivo habilitado explicitamente, gravado em diretório temporário'
      )
    )
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true })
  }

  const otlpPayloads: OtlpJsonExport[] = []
  const otlpCollector = createOtlpJsonCollector({
    enabled: true,
    transport: (payload) => otlpPayloads.push(payload)
  })
  injectCanary(otlpCollector)
  const otlpExport = await otlpCollector.flush()
  checks.push(
    adapterCheck(
      'otlp_json_memory_transport',
      otlpExport,
      JSON.stringify(otlpPayloads),
      'payload OTLP/JSON com transporte injetado em memória; nenhuma rede'
    )
  )

  return checks
}

function mergeReports(
  reports: readonly CollectorRedactionReport[]
): CollectorRedactionReport {
  return reports.reduce<CollectorRedactionReport>(
    (total, entry) => ({
      exportedSpans: total.exportedSpans + entry.exportedSpans,
      exportedMetrics: total.exportedMetrics + entry.exportedMetrics,
      exportedLogs: total.exportedLogs + entry.exportedLogs,
      droppedRecords: total.droppedRecords + entry.droppedRecords,
      droppedAttributes: total.droppedAttributes + entry.droppedAttributes,
      droppedLogFields: total.droppedLogFields + entry.droppedLogFields,
      replacedNames: total.replacedNames + entry.replacedNames,
      blockedCanaries: total.blockedCanaries + entry.blockedCanaries
    }),
    {
      exportedSpans: 0,
      exportedMetrics: 0,
      exportedLogs: 0,
      droppedRecords: 0,
      droppedAttributes: 0,
      droppedLogFields: 0,
      replacedNames: 0,
      blockedCanaries: 0
    }
  )
}

async function main(): Promise<void> {
  const dryRun = args.includes('--dry-run')
  const jsonOnly = args.includes('--json')
  const alertFilter = flagValue('--alert')
  const workerCollector = new InProcessCollector()
  const report = await runObservabilityExercise({
    workerSink: createCollectorWorkerTelemetry(workerCollector)
  })
  const workerExport = await workerCollector.flush()
  const workerCanaryHits = canaryHits(JSON.stringify(workerExport))

  if (dryRun) {
    console.log(
      `AUD19-09 dry-run status=${report.status} alert=${alertFilter ?? 'all'} ` +
        `firing=${report.alerts.detection.firing.length} ` +
        `sustainedFiring=${report.alerts.recoverySustained.firing.length} ` +
        `canaryHits=${report.redaction.canaryHits + workerCanaryHits} ` +
        `exportedSpans=${report.redaction.exportedSpans} ` +
        `exportedMetrics=${report.redaction.exportedMetrics}`
    )
    console.log('dry-run: nenhuma evidência foi escrita')
    return
  }

  if (jsonOnly) {
    console.log(JSON.stringify(report, null, 2))
    return
  }

  const adapterChecks = await runAdapterProofs(workerExport)
  const redaction = mergeReports([
    {
      ...report.redaction,
      exportedSpans:
        report.redaction.exportedSpans + workerExport.redaction.exportedSpans,
      exportedMetrics:
        report.redaction.exportedMetrics +
        workerExport.redaction.exportedMetrics,
      exportedLogs:
        report.redaction.exportedLogs + workerExport.redaction.exportedLogs,
      droppedAttributes:
        report.redaction.droppedAttributes +
        workerExport.redaction.droppedAttributes,
      droppedLogFields:
        report.redaction.droppedLogFields +
        workerExport.redaction.droppedLogFields,
      replacedNames:
        report.redaction.replacedNames + workerExport.redaction.replacedNames,
      blockedCanaries:
        report.redaction.blockedCanaries +
        workerExport.redaction.blockedCanaries
    }
  ])
  const allCanaryHits =
    report.redaction.canaryHits +
    workerCanaryHits +
    adapterChecks.reduce((total, check) => total + check.canaryHits, 0)
  const redactionStatus: 'PASS' | 'FAIL' =
    allCanaryHits === 0 && adapterChecks.every((check) => check.enabled)
      ? 'PASS'
      : 'FAIL'

  const generatedAt = new Date().toISOString()
  mkdirSync(evidenceDirectory, { recursive: true })
  writeFileSync(exercisePath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  writeFileSync(
    redactionPath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        kind: 'aud19-09-redaction-report',
        program: 'AUD19-REM',
        task: 'AUD19-09',
        generatedAt,
        canary: CANARY,
        status: redactionStatus,
        canaryHits: allCanaryHits,
        exercise: {
          status: report.status,
          exportedSpans: report.redaction.exportedSpans,
          exportedMetrics: report.redaction.exportedMetrics,
          exportedLogs: report.redaction.exportedLogs,
          blockedCanaries: report.redaction.blockedCanaries,
          canaryHits: report.redaction.canaryHits
        },
        adapterChecks,
        totals: redaction,
        scanScope:
          'export batches and adapter payloads only; raw process stdout is a debug sink and is not part of this proof',
        limitations: [
          'Nenhum collector hospedado ou entrega externa; a prova é local e determinística.',
          'O canary é sintético (SENSITIVE-AUD19-09-CANARY) e não representa dado real.',
          'approval_latency_ms é instrumentação proposta; o exercício injeta amostras.',
          'SLOs permanecem PROPOSED_NOT_APPROVED; nenhum owner foi inventado.'
        ]
      },
      null,
      2
    )}\n`,
    'utf8'
  )
  console.log(
    `AUD19-09 exercise status=${report.status} redaction=${redactionStatus} ` +
      `firing=${report.alerts.detection.firing.length} canaryHits=${allCanaryHits}`
  )
  console.log(`evidence: ${exercisePath}`)
  console.log(`evidence: ${redactionPath}`)
  if (report.status !== 'PASS' || redactionStatus !== 'PASS') {
    process.exitCode = 1
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'AUD19-09 exercise failed'
  )
  process.exitCode = 1
})
