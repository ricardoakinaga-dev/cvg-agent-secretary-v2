import {
  InMemoryTelemetry,
  redactFields,
  type Telemetry
} from '@cvg/observability'

export type WorkerLogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface WorkerTelemetry {
  log(
    event: string,
    fields?: Record<string, unknown>,
    level?: WorkerLogLevel
  ): void
  metric(
    name: string,
    value: number,
    attributes?: Record<string, string | number | boolean>
  ): void
}

export interface JsonWorkerTelemetryOptions {
  clock?: () => Date
  write?: (line: string) => void
}

/**
 * Structured JSON sink for the worker process. Log fields and metric
 * attributes pass through the centralized redaction before serialization;
 * payloads, bodies and identities are never recorded by convention, and the
 * redaction layer is the second line of defense.
 */
export function createJsonWorkerTelemetry(
  options: JsonWorkerTelemetryOptions = {}
): WorkerTelemetry {
  const clock = options.clock ?? (() => new Date())
  const write =
    options.write ?? ((line: string) => process.stdout.write(`${line}\n`))

  return {
    log(event, fields = {}, level = 'info') {
      write(
        JSON.stringify({
          event,
          level,
          timestamp: clock().toISOString(),
          ...redactFields(fields)
        })
      )
    },
    metric(name, value, attributes = {}) {
      write(
        JSON.stringify({
          event: 'worker.metric',
          name,
          value,
          attributes: redactFields(attributes) as Record<string, unknown>,
          timestamp: clock().toISOString()
        })
      )
    }
  }
}

/**
 * Adapter for `@cvg/observability` telemetry. Metric attribute names are
 * restricted by the caller to the allowlist shared with the runtime
 * (`status`, `outcome`, `operation`) to avoid high-cardinality sinks.
 */
export function createTelemetryWorkerSink(
  telemetry: Pick<Telemetry, 'log' | 'recordMetric'>
): WorkerTelemetry {
  return {
    log(event, fields = {}, level = 'info') {
      telemetry.log(level, event, fields)
    },
    metric(name, value, attributes = {}) {
      telemetry.recordMetric(name, value, attributes)
    }
  }
}

/**
 * Bridges the governed runtime's bounded telemetry into the worker's
 * structured process sink. Runtime spans and metrics otherwise remain only in
 * the worker heap, which makes a restart blind to the evidence needed to
 * diagnose a queue replay or approval continuation.
 */
export function createRuntimeTelemetrySink(
  telemetry: WorkerTelemetry
): InMemoryTelemetry {
  return new InMemoryTelemetry({
    onSpan: (span) => {
      telemetry.log(
        'worker.runtime.span',
        {
          name: span.name,
          traceId: span.traceId,
          spanId: span.spanId,
          ...(span.parentSpanId !== undefined
            ? { parentSpanId: span.parentSpanId }
            : {}),
          status: span.status,
          durationMs: span.durationMs,
          attributes: span.attributes,
          ...(span.errorCode !== undefined ? { errorCode: span.errorCode } : {})
        },
        'debug'
      )
    },
    onMetric: (metric) => {
      telemetry.metric(metric.name, metric.value, metric.attributes)
    },
    onLog: (log) => {
      telemetry.log(
        'worker.runtime.log',
        { message: log.message, ...log.fields },
        log.level
      )
    }
  })
}
