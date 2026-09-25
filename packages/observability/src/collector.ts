import { appendFileSync, lstatSync, mkdirSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, sep } from 'node:path'
import { redactSensitiveText } from '@cvg/shared'
import type {
  AttributeValue,
  LogLevel,
  RecordedLog,
  RecordedMetric,
  RecordedSpan
} from './telemetry.ts'

export type CollectorAdapterKind = 'in_process' | 'file' | 'otlp_json'

export interface CollectorResource {
  serviceName: string
  serviceVersion: string
  environment: string
}

export interface CollectedSpan {
  traceId: string
  spanId: string
  parentSpanId?: string
  correlationId: string
  name: string
  startedAt: string
  endedAt: string
  durationMs: number
  status: 'ok' | 'error'
  errorCode?: string
  attributes: Record<string, AttributeValue>
}

export interface CollectedMetric {
  name: string
  value: number
  attributes: Record<string, AttributeValue>
  timestamp: string
}

export interface CollectedLog {
  level: LogLevel
  event: string
  timestamp: string
  fields: Record<string, AttributeValue>
}

export interface CollectorRedactionReport {
  exportedSpans: number
  exportedMetrics: number
  exportedLogs: number
  droppedRecords: number
  droppedAttributes: number
  droppedLogFields: number
  replacedNames: number
  blockedCanaries: number
}

export interface CollectorExport {
  schemaVersion: 1
  kind: 'cvg-observability-export'
  enabled: boolean
  resource: CollectorResource
  exportedAt: string
  spans: CollectedSpan[]
  metrics: CollectedMetric[]
  logs: CollectedLog[]
  redaction: CollectorRedactionReport
}

/**
 * Controlled collector contract. Implementations must never receive raw
 * payloads: every record crosses the sanitizer in this module first, so the
 * port only ever carries identifiers, counters, durations and classifications.
 * There is no network transport in this package; the file and OTLP-shaped
 * adapters are inert until explicitly enabled.
 */
export interface ObservabilityCollectorPort {
  readonly kind: CollectorAdapterKind
  readonly enabled: boolean
  recordSpan(span: RecordedSpan): void
  recordMetric(metric: RecordedMetric): void
  recordLog(log: RecordedLog): void
  flush(): Promise<CollectorExport>
  redaction(): CollectorRedactionReport
  close(): Promise<void>
}

/**
 * Attribute keys a collector export may carry. Anything else is dropped at the
 * boundary, which keeps objectives, prompts, payloads and free text out of the
 * sink even if a caller forgot to redact before emitting.
 */
export const COLLECTOR_ATTRIBUTE_ALLOWLIST: readonly string[] = [
  'operation',
  'channel',
  'provider',
  'model',
  'profile',
  'status',
  'decision',
  'capability',
  'agentProfile',
  'risk',
  'outcome',
  'errorCode',
  'phase',
  'correlationId',
  'traceId',
  'spanId',
  'parentSpanId',
  'tenantId',
  'conversationId',
  'sessionId',
  'agentId',
  'agentVersion',
  'eventId',
  'workerId',
  'goalId',
  'planId',
  'stepId',
  'approvalId',
  'attempt',
  'leaseId',
  'effectId',
  'jobId'
]

const SAFE_VALUE_PATTERN = /^[A-Za-z0-9_.:/@-]{1,160}$/
const SAFE_NAME_PATTERN = /^[A-Za-z0-9_.:-]{1,120}$/
const REPLACED_NAME = '[redacted-name]'

/**
 * Synthetic canary marker used by redaction tests and as a defensive guard.
 * Any scalar that still carries it is dropped instead of exported.
 */
export const COLLECTOR_CANARY_PATTERN = /SENSITIVE-/i

export interface CollectorSanitizeResult {
  value: AttributeValue | undefined
  reason: 'ok' | 'dropped' | 'canary' | 'unsafe'
}

export function sanitizeCollectorValue(
  value: unknown
): CollectorSanitizeResult {
  if (
    typeof value !== 'string' &&
    typeof value !== 'number' &&
    typeof value !== 'boolean'
  ) {
    return { value: undefined, reason: 'dropped' }
  }
  if (typeof value === 'number') {
    return Number.isFinite(value)
      ? { value, reason: 'ok' }
      : { value: undefined, reason: 'unsafe' }
  }
  if (typeof value === 'boolean') return { value, reason: 'ok' }
  const redacted = redactSensitiveText(value)
  if (COLLECTOR_CANARY_PATTERN.test(redacted)) {
    return { value: undefined, reason: 'canary' }
  }
  if (!SAFE_VALUE_PATTERN.test(redacted)) {
    return { value: undefined, reason: 'unsafe' }
  }
  return { value: redacted, reason: 'ok' }
}

function sanitizeCollectorName(name: string): string {
  if (!SAFE_NAME_PATTERN.test(name)) return REPLACED_NAME
  if (COLLECTOR_CANARY_PATTERN.test(name)) return REPLACED_NAME
  return name
}

interface SanitizedAttributes {
  attributes: Record<string, AttributeValue>
  dropped: number
  replaced: number
  blockedCanaries: number
}

function sanitizeCollectorAttributes(
  attributes: Record<string, AttributeValue> | undefined
): SanitizedAttributes {
  const result: SanitizedAttributes = {
    attributes: {},
    dropped: 0,
    replaced: 0,
    blockedCanaries: 0
  }
  if (!attributes) return result
  for (const [key, raw] of Object.entries(attributes)) {
    if (!COLLECTOR_ATTRIBUTE_ALLOWLIST.includes(key)) {
      result.dropped += 1
      continue
    }
    const sanitized = sanitizeCollectorValue(raw)
    if (sanitized.reason === 'ok' && sanitized.value !== undefined) {
      result.attributes[key] = sanitized.value
      continue
    }
    if (sanitized.reason === 'canary') {
      result.blockedCanaries += 1
      result.dropped += 1
      continue
    }
    if (sanitized.reason === 'unsafe') {
      result.replaced += 1
      continue
    }
    result.dropped += 1
  }
  return result
}

interface CollectorBufferState {
  spans: CollectedSpan[]
  metrics: CollectedMetric[]
  logs: CollectedLog[]
}

function emptyRedactionReport(): CollectorRedactionReport {
  return {
    exportedSpans: 0,
    exportedMetrics: 0,
    exportedLogs: 0,
    droppedRecords: 0,
    droppedAttributes: 0,
    droppedLogFields: 0,
    replacedNames: 0,
    blockedCanaries: 0
  }
}

/**
 * Shared sanitizer/buffer used by every adapter. Records are only handed to an
 * adapter through `take()`; when the collector is disabled records are counted
 * and discarded (fail-closed) rather than exported. Bounded limits are opt-in:
 * the in-process, file and OTLP adapters keep their unbounded behavior, while
 * the controlled-local factory caps both the buffer and every flushed batch.
 */
class CollectorBuffer {
  readonly #clock: () => Date
  readonly #enabled: boolean
  readonly #resource: CollectorResource
  readonly #maxRecords: number
  readonly #maxBatchRecords: number
  readonly #state: CollectorBufferState = {
    spans: [],
    metrics: [],
    logs: []
  }
  readonly #report = emptyRedactionReport()
  #sealed = false

  constructor(
    enabled: boolean,
    resource: CollectorResource,
    clock: () => Date,
    limits: { maxRecords?: number; maxBatchRecords?: number } = {}
  ) {
    this.#enabled = enabled
    this.#resource = resource
    this.#clock = clock
    this.#maxRecords = limits.maxRecords ?? Number.POSITIVE_INFINITY
    this.#maxBatchRecords = limits.maxBatchRecords ?? Number.POSITIVE_INFINITY
  }

  get enabled(): boolean {
    return this.#enabled
  }

  get size(): number {
    return (
      this.#state.spans.length +
      this.#state.metrics.length +
      this.#state.logs.length
    )
  }

  /**
   * Stop accepting records without dropping what is already buffered. A sealed
   * buffer still drains through `take()` so `close()` can flush the bounded
   * remainder before the sink is released.
   */
  seal(): void {
    this.#sealed = true
  }

  #acceptsRecords(): boolean {
    return this.#enabled && !this.#sealed && this.size < this.#maxRecords
  }

  recordSpan(span: RecordedSpan): void {
    if (!this.#acceptsRecords()) {
      this.#report.droppedRecords += 1
      return
    }
    const sanitized = sanitizeCollectorAttributes(span.attributes)
    this.#report.droppedAttributes += sanitized.dropped
    this.#report.replacedNames += sanitized.replaced
    this.#report.blockedCanaries += sanitized.blockedCanaries
    const errorCode = span.errorCode
      ? sanitizeCollectorValue(span.errorCode)
      : undefined
    if (errorCode?.reason === 'canary') this.#report.blockedCanaries += 1
    const name = sanitizeCollectorName(span.name)
    if (name !== span.name) this.#report.replacedNames += 1
    this.#state.spans.push({
      traceId: span.traceId,
      spanId: span.spanId,
      ...(span.parentSpanId !== undefined
        ? { parentSpanId: span.parentSpanId }
        : {}),
      correlationId: span.correlationId,
      name,
      startedAt: span.startedAt,
      endedAt: span.endedAt,
      durationMs: span.durationMs,
      status: span.status,
      ...(errorCode?.value !== undefined && errorCode.reason === 'ok'
        ? { errorCode: String(errorCode.value) }
        : {}),
      attributes: sanitized.attributes
    })
  }

  recordMetric(metric: RecordedMetric): void {
    if (!this.#acceptsRecords()) {
      this.#report.droppedRecords += 1
      return
    }
    const sanitized = sanitizeCollectorAttributes(metric.attributes)
    this.#report.droppedAttributes += sanitized.dropped
    this.#report.replacedNames += sanitized.replaced
    this.#report.blockedCanaries += sanitized.blockedCanaries
    const name = sanitizeCollectorName(metric.name)
    if (name !== metric.name) this.#report.replacedNames += 1
    this.#state.metrics.push({
      name,
      value: Number.isFinite(metric.value) ? metric.value : 0,
      attributes: sanitized.attributes,
      timestamp: metric.timestamp
    })
  }

  recordLog(log: RecordedLog): void {
    if (!this.#acceptsRecords()) {
      this.#report.droppedRecords += 1
      return
    }
    const event = sanitizeCollectorName(log.message)
    if (event !== log.message) this.#report.replacedNames += 1
    const fields: Record<string, AttributeValue> = {}
    for (const [key, raw] of Object.entries(log.fields)) {
      if (!COLLECTOR_ATTRIBUTE_ALLOWLIST.includes(key)) {
        this.#report.droppedLogFields += 1
        continue
      }
      const sanitized = sanitizeCollectorValue(raw)
      if (sanitized.reason === 'ok' && sanitized.value !== undefined) {
        fields[key] = sanitized.value
        continue
      }
      if (sanitized.reason === 'canary') {
        this.#report.blockedCanaries += 1
      } else if (sanitized.reason === 'unsafe') {
        this.#report.replacedNames += 1
      }
      this.#report.droppedLogFields += 1
    }
    this.#state.logs.push({
      level: log.level,
      event,
      timestamp: log.timestamp,
      fields
    })
  }

  take(limit: number = this.#maxBatchRecords): CollectorExport {
    const spans = this.#state.spans.splice(
      0,
      Math.min(limit, this.#state.spans.length)
    )
    const remainingAfterSpans = limit - spans.length
    const metrics =
      remainingAfterSpans > 0
        ? this.#state.metrics.splice(
            0,
            Math.min(remainingAfterSpans, this.#state.metrics.length)
          )
        : []
    const remainingAfterMetrics = remainingAfterSpans - metrics.length
    const logs =
      remainingAfterMetrics > 0
        ? this.#state.logs.splice(
            0,
            Math.min(remainingAfterMetrics, this.#state.logs.length)
          )
        : []
    this.#report.exportedSpans += spans.length
    this.#report.exportedMetrics += metrics.length
    this.#report.exportedLogs += logs.length
    return {
      schemaVersion: 1,
      kind: 'cvg-observability-export',
      enabled: this.#enabled,
      resource: this.#resource,
      exportedAt: this.#clock().toISOString(),
      spans,
      metrics,
      logs,
      redaction: { ...this.#report }
    }
  }

  redaction(): CollectorRedactionReport {
    return { ...this.#report }
  }
}

export const DEFAULT_COLLECTOR_RESOURCE: CollectorResource = {
  serviceName: 'cvg-agent-secretary-v2',
  serviceVersion: '1.0.0',
  environment: 'controlled-local'
}

export interface InProcessCollectorOptions {
  resource?: CollectorResource
  clock?: () => Date
  /** Keep every flushed batch for deterministic inspection. */
  keepBatches?: boolean
}

/**
 * Deterministic in-process collector. This is the default adapter for tests,
 * evals and local exercises: no socket, no filesystem, no background timers.
 */
export class InProcessCollector implements ObservabilityCollectorPort {
  readonly kind = 'in_process' as const
  readonly enabled = true
  readonly #buffer: CollectorBuffer
  readonly #batches: CollectorExport[] = []
  readonly #keepBatches: boolean

  constructor(options: InProcessCollectorOptions = {}) {
    this.#buffer = new CollectorBuffer(
      true,
      options.resource ?? DEFAULT_COLLECTOR_RESOURCE,
      options.clock ?? (() => new Date())
    )
    this.#keepBatches = options.keepBatches ?? true
  }

  recordSpan(span: RecordedSpan): void {
    this.#buffer.recordSpan(span)
  }

  recordMetric(metric: RecordedMetric): void {
    this.#buffer.recordMetric(metric)
  }

  recordLog(log: RecordedLog): void {
    this.#buffer.recordLog(log)
  }

  async flush(): Promise<CollectorExport> {
    const exported = this.#buffer.take()
    if (this.#keepBatches) this.#batches.push(exported)
    return exported
  }

  batches(): CollectorExport[] {
    return [...this.#batches]
  }

  redaction(): CollectorRedactionReport {
    return this.#buffer.redaction()
  }

  async close(): Promise<void> {}
}

export interface FileCollectorOptions {
  /** Explicit opt-in flag. When false the collector drops every record. */
  enabled: boolean
  filePath: string
  resource?: CollectorResource
  clock?: () => Date
}

/**
 * JSONL file adapter. Inert unless `enabled` is exactly `true`; it never opens
 * a socket and never writes a file that was not explicitly configured. Each
 * flushed batch is one redacted JSON line.
 */
export function createFileCollector(
  options: FileCollectorOptions
): ObservabilityCollectorPort {
  const buffer = new CollectorBuffer(
    options.enabled === true,
    options.resource ?? DEFAULT_COLLECTOR_RESOURCE,
    options.clock ?? (() => new Date())
  )
  return {
    kind: 'file',
    enabled: options.enabled === true,
    recordSpan: (span) => buffer.recordSpan(span),
    recordMetric: (metric) => buffer.recordMetric(metric),
    recordLog: (log) => buffer.recordLog(log),
    async flush() {
      const exported = buffer.take()
      if (
        !exported.enabled ||
        exported.spans.length +
          exported.metrics.length +
          exported.logs.length ===
          0
      ) {
        return exported
      }
      mkdirSync(dirname(options.filePath), { recursive: true })
      appendFileSync(options.filePath, `${JSON.stringify(exported)}\n`, 'utf8')
      return exported
    },
    redaction: () => buffer.redaction(),
    async close() {}
  }
}

export interface OtlpKeyValue {
  key: string
  value: {
    stringValue?: string
    intValue?: string
    doubleValue?: number
    boolValue?: boolean
  }
}

export interface OtlpSpanPayload {
  traceId: string
  spanId: string
  parentSpanId?: string
  name: string
  startTimeUnixNano: string
  endTimeUnixNano: string
  attributes: OtlpKeyValue[]
  status: { code: number }
}

export interface OtlpJsonExport {
  resourceSpans: Array<{
    resource: { attributes: OtlpKeyValue[] }
    scopeSpans: Array<{
      scope: { name: string; version: string }
      spans: OtlpSpanPayload[]
    }>
  }>
  resourceMetrics: Array<{
    resource: { attributes: OtlpKeyValue[] }
    scopeMetrics: Array<{
      scope: { name: string; version: string }
      metrics: Array<{
        name: string
        unit: string
        gauge: {
          dataPoints: Array<{
            timeUnixNano: string
            attributes: OtlpKeyValue[]
          }>
        }
      }>
    }>
  }>
}

export interface OtlpJsonCollectorOptions {
  /** Explicit opt-in flag. When false the collector drops every record. */
  enabled: boolean
  /**
   * Injected transport. The collector never creates a network client; callers
   * must pass an explicit local sink (file, buffer, test double).
   */
  transport: (payload: OtlpJsonExport, exported: CollectorExport) => void
  resource?: CollectorResource
  clock?: () => Date
}

function toOtlpAttributes(
  attributes: Record<string, AttributeValue>
): OtlpKeyValue[] {
  return Object.entries(attributes).map(([key, value]) => {
    if (typeof value === 'number') {
      return Number.isInteger(value)
        ? { key, value: { intValue: String(value) } }
        : { key, value: { doubleValue: value } }
    }
    if (typeof value === 'boolean') return { key, value: { boolValue: value } }
    return { key, value: { stringValue: value } }
  })
}

function toUnixNano(timestamp: string): string {
  const parsed = Date.parse(timestamp)
  if (!Number.isFinite(parsed)) return '0'
  return `${parsed}000000`
}

function resourceAttributes(resource: CollectorResource): OtlpKeyValue[] {
  return [
    { key: 'service.name', value: { stringValue: resource.serviceName } },
    {
      key: 'service.version',
      value: { stringValue: resource.serviceVersion }
    },
    {
      key: 'deployment.environment',
      value: { stringValue: resource.environment }
    }
  ]
}

/**
 * OTLP/JSON-shaped adapter with an injected transport. No exporter package and
 * no network access: the payload is deterministic and stays wherever the
 * caller's transport puts it.
 */
export function createOtlpJsonCollector(
  options: OtlpJsonCollectorOptions
): ObservabilityCollectorPort {
  const resource = options.resource ?? DEFAULT_COLLECTOR_RESOURCE
  const buffer = new CollectorBuffer(
    options.enabled === true,
    resource,
    options.clock ?? (() => new Date())
  )
  return {
    kind: 'otlp_json',
    enabled: options.enabled === true,
    recordSpan: (span) => buffer.recordSpan(span),
    recordMetric: (metric) => buffer.recordMetric(metric),
    recordLog: (log) => buffer.recordLog(log),
    async flush() {
      const exported = buffer.take()
      if (!exported.enabled) return exported
      if (
        exported.spans.length +
          exported.metrics.length +
          exported.logs.length ===
        0
      ) {
        return exported
      }
      options.transport(
        {
          resourceSpans: [
            {
              resource: { attributes: resourceAttributes(resource) },
              scopeSpans: [
                {
                  scope: { name: '@cvg/observability', version: '1.0.0' },
                  spans: exported.spans.map((span) => ({
                    traceId: span.traceId,
                    spanId: span.spanId,
                    ...(span.parentSpanId !== undefined
                      ? { parentSpanId: span.parentSpanId }
                      : {}),
                    name: span.name,
                    startTimeUnixNano: toUnixNano(span.startedAt),
                    endTimeUnixNano: toUnixNano(span.endedAt),
                    attributes: toOtlpAttributes(span.attributes),
                    status: { code: span.status === 'error' ? 2 : 1 }
                  }))
                }
              ]
            }
          ],
          resourceMetrics: [
            {
              resource: { attributes: resourceAttributes(resource) },
              scopeMetrics: [
                {
                  scope: { name: '@cvg/observability', version: '1.0.0' },
                  metrics: exported.metrics.map((metric) => ({
                    name: metric.name,
                    unit: '1',
                    gauge: {
                      dataPoints: [
                        {
                          timeUnixNano: toUnixNano(metric.timestamp),
                          attributes: toOtlpAttributes(metric.attributes)
                        }
                      ]
                    }
                  }))
                }
              ]
            }
          ]
        },
        exported
      )
      return exported
    },
    redaction: () => buffer.redaction(),
    async close() {}
  }
}

/**
 * Bridges `InMemoryTelemetry` callbacks to a collector. Use as the telemetry's
 * `onSpan`/`onMetric`/`onLog` options so every emitted record is sanitized
 * before it reaches the sink.
 */
export function collectorTelemetryHooks(
  collector: ObservabilityCollectorPort
): {
  onSpan: (span: RecordedSpan) => void
  onMetric: (metric: RecordedMetric) => void
  onLog: (log: RecordedLog) => void
} {
  return {
    onSpan: (span) => collector.recordSpan(span),
    onMetric: (metric) => collector.recordMetric(metric),
    onLog: (log) => collector.recordLog(log)
  }
}

/** Harness profile for the controlled local collector. Not a deployment mode. */
export const CONTROLLED_LOCAL_SYNTHETIC_PROFILE = 'CONTROLLED_LOCAL_SYNTHETIC'

/** Constant sink names; callers can never choose a file path. */
export const CONTROLLED_LOCAL_COLLECTOR_FILE_NAMES = Object.freeze({
  api: 'api.jsonl',
  worker: 'worker.jsonl'
})

export const CONTROLLED_LOCAL_MAX_BUFFER_RECORDS = 512
export const CONTROLLED_LOCAL_MAX_BATCH_RECORDS = 256

export type ControlledLocalCollectorRole = 'api' | 'worker'
export type ControlledLocalCollectorMode = 'disabled' | 'local_file'

export interface ControlledLocalCollectorContext {
  profile: typeof CONTROLLED_LOCAL_SYNTHETIC_PROFILE
  mode: ControlledLocalCollectorMode
  root: string
  role: ControlledLocalCollectorRole
}

export interface ControlledLocalCollectorOptions {
  clock?: () => Date
  resource?: CollectorResource
  maxBufferRecords?: number
  maxBatchRecords?: number
}

const CONTROLLED_LOCAL_CONTEXT_KEYS = [
  'profile',
  'mode',
  'root',
  'role'
] as const

function assertControlledLocalContext(
  context: ControlledLocalCollectorContext
): void {
  if (typeof context !== 'object' || context === null) {
    throw new Error('Controlled local collector context is required')
  }
  const keys = Object.keys(context)
  if (
    keys.some((key) => !CONTROLLED_LOCAL_CONTEXT_KEYS.includes(key as never))
  ) {
    throw new Error(
      'Controlled local collector rejects caller-supplied file paths or extra keys'
    )
  }
  if (context.profile !== CONTROLLED_LOCAL_SYNTHETIC_PROFILE) {
    throw new Error(
      'Controlled local collector requires the CONTROLLED_LOCAL_SYNTHETIC profile'
    )
  }
  if (context.mode !== 'disabled' && context.mode !== 'local_file') {
    throw new Error(
      'Controlled local collector mode must be disabled or local_file'
    )
  }
  if (context.role !== 'api' && context.role !== 'worker') {
    throw new Error('Controlled local collector role must be api or worker')
  }
  if (context.mode === 'local_file') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Controlled local collector cannot write files in production'
      )
    }
    if (typeof context.root !== 'string' || context.root.trim().length === 0) {
      throw new Error('Controlled local collector root is required')
    }
  }
}

/**
 * Canonicalizes the exclusive temporary root and fails closed on any path that
 * is not a real directory strictly inside the process temporary directory.
 * Symlinked roots, traversal and missing directories are rejected.
 */
export function resolveControlledLocalRoot(root: string): string {
  if (typeof root !== 'string' || !isAbsolute(root)) {
    throw new Error('Controlled local collector root must be an absolute path')
  }
  if (root.split(/[\\/]/).includes('..')) {
    throw new Error(
      'Controlled local collector root must not contain traversal segments'
    )
  }
  const stats = lstatSync(root)
  if (stats.isSymbolicLink() || !stats.isDirectory()) {
    throw new Error(
      'Controlled local collector root must be a directory, not a symlink'
    )
  }
  const canonical = realpathSync(root)
  const temporaryBase = realpathSync(tmpdir())
  const insideTemporary = canonical.startsWith(`${temporaryBase}${sep}`)
  if (!insideTemporary) {
    throw new Error(
      'Controlled local collector root must live inside the temporary directory'
    )
  }
  return canonical
}

/**
 * Harness-only sink used by the AUD20-10 composition slice. It is created from
 * an immutable context, writes only constant file names below an exclusive
 * temporary root and bounds both the buffer and every flushed batch. Network
 * transports, timers and caller-chosen paths do not exist here: `disabled`
 * creates no file and `local_file` fails closed outside the harness profile.
 */
export function createControlledLocalCollector(
  context: ControlledLocalCollectorContext,
  options: ControlledLocalCollectorOptions = {}
): ObservabilityCollectorPort {
  assertControlledLocalContext(context)
  const enabled = context.mode === 'local_file'
  const maxBufferRecords =
    options.maxBufferRecords ?? CONTROLLED_LOCAL_MAX_BUFFER_RECORDS
  const maxBatchRecords =
    options.maxBatchRecords ?? CONTROLLED_LOCAL_MAX_BATCH_RECORDS
  if (
    !Number.isInteger(maxBufferRecords) ||
    maxBufferRecords < 1 ||
    maxBufferRecords > CONTROLLED_LOCAL_MAX_BUFFER_RECORDS
  ) {
    throw new Error(
      'Controlled local collector buffer limit cannot exceed the harness cap'
    )
  }
  if (
    !Number.isInteger(maxBatchRecords) ||
    maxBatchRecords < 1 ||
    maxBatchRecords >
      Math.min(CONTROLLED_LOCAL_MAX_BATCH_RECORDS, maxBufferRecords)
  ) {
    throw new Error(
      'Controlled local collector batch limit cannot exceed the harness cap'
    )
  }
  const buffer = new CollectorBuffer(
    enabled,
    options.resource ?? DEFAULT_COLLECTOR_RESOURCE,
    options.clock ?? (() => new Date()),
    enabled ? { maxRecords: maxBufferRecords, maxBatchRecords } : {}
  )
  const filePath = enabled
    ? join(
        resolveControlledLocalRoot(context.root),
        CONTROLLED_LOCAL_COLLECTOR_FILE_NAMES[context.role]
      )
    : undefined
  let closed = false

  const writeBatch = (): CollectorExport => {
    const exported = buffer.take()
    const total =
      exported.spans.length + exported.metrics.length + exported.logs.length
    if (!enabled || total === 0) return exported
    const sinkPath = filePath as string
    if (lstatSync(sinkPath, { throwIfNoEntry: false })?.isSymbolicLink()) {
      throw new Error('Controlled local collector rejects symlinked sink files')
    }
    appendFileSync(sinkPath, `${JSON.stringify(exported)}\n`, 'utf8')
    return exported
  }

  return {
    kind: 'file',
    enabled,
    recordSpan: (span) => buffer.recordSpan(span),
    recordMetric: (metric) => buffer.recordMetric(metric),
    recordLog: (log) => buffer.recordLog(log),
    async flush() {
      return writeBatch()
    },
    redaction: () => buffer.redaction(),
    async close() {
      if (closed) return
      closed = true
      buffer.seal()
      if (!enabled) return
      writeBatch()
      writeBatch()
    }
  }
}
