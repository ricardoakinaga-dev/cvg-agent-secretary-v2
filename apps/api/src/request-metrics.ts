const DEFAULT_MAX_ROUTES = 64
const MAX_ALLOWED_ROUTES = 256
const MAX_LATENCY_MS = 86_400_000

export const UNMATCHED_ROUTE_TEMPLATE = '__unmatched__'
export const OTHER_ROUTE_TEMPLATE = '__other__'
export const OTHER_METHOD = 'OTHER'
export const REQUEST_METRIC_METHODS = [
  'CONNECT',
  'DELETE',
  'GET',
  'HEAD',
  'OPTIONS',
  'PATCH',
  'POST',
  'PUT',
  'TRACE'
] as const

export const REQUEST_STATUS_BUCKETS = [
  '2xx',
  '3xx',
  '4xx',
  '5xx',
  'other'
] as const

export type RequestStatusBucket = (typeof REQUEST_STATUS_BUCKETS)[number]

export interface RequestMetricRecord {
  method: string
  routeTemplate?: unknown
  statusCode: number
  latencyMs: number
}

export interface RequestMetricsOptions {
  maxRoutes?: number
  now?: () => string
}

export interface RequestMetricsRouteSnapshot {
  routeTemplate: string
  requestCount: number
  methodCounts: Readonly<Record<string, number>>
  statusBuckets: Readonly<Record<RequestStatusBucket, number>>
  totalLatencyMs: number
  maxLatencyMs: number
}

export interface RequestMetricsSnapshot {
  schemaVersion: 'v1'
  startedAt: string
  totalRequests: number
  droppedRouteCount: number
  methods: Readonly<Record<string, number>>
  statusBuckets: Readonly<Record<RequestStatusBucket, number>>
  totalLatencyMs: number
  maxLatencyMs: number
  routes: readonly RequestMetricsRouteSnapshot[]
}

type RequestMetricsRouteState = RequestMetricsRouteSnapshot

interface RequestMetricsState {
  totalRequests: number
  droppedRouteCount: number
  methods: Record<string, number>
  statusBuckets: Record<RequestStatusBucket, number>
  totalLatencyMs: number
  maxLatencyMs: number
  routes: Record<string, RequestMetricsRouteState>
}

export class ControlledRequestMetrics {
  private readonly maxRoutes: number
  private readonly startedAt: string
  private state: RequestMetricsState

  constructor(options: RequestMetricsOptions = {}) {
    const maxRoutes = options.maxRoutes ?? DEFAULT_MAX_ROUTES
    if (
      !Number.isInteger(maxRoutes) ||
      maxRoutes < 1 ||
      maxRoutes > MAX_ALLOWED_ROUTES
    ) {
      throw new Error('maxRoutes must be an integer between 1 and 256')
    }

    const now = options.now ?? (() => new Date().toISOString())
    const startedAt = now()
    if (!startedAt || typeof startedAt !== 'string') {
      throw new Error('request metrics clock must return a timestamp')
    }

    this.maxRoutes = maxRoutes
    this.startedAt = startedAt
    this.state = createEmptyState()
  }

  record(input: RequestMetricRecord): void {
    const method = normalizeMethod(input.method)
    const routeTemplate = normalizeRouteTemplate(input.routeTemplate)
    const statusBucket = statusBucketFor(input.statusCode)
    const latencyMs = normalizeLatency(input.latencyMs)
    const existingRoute = this.state.routes[routeTemplate]
    const routeKey = existingRoute
      ? routeTemplate
      : this.shouldAggregateRoute(routeTemplate)
        ? OTHER_ROUTE_TEMPLATE
        : routeTemplate
    const route = this.state.routes[routeKey]

    this.state = {
      totalRequests: this.state.totalRequests + 1,
      droppedRouteCount:
        this.state.droppedRouteCount +
        (routeKey === OTHER_ROUTE_TEMPLATE && routeTemplate !== routeKey
          ? 1
          : 0),
      methods: incrementCounter(this.state.methods, method),
      statusBuckets: incrementCounter(this.state.statusBuckets, statusBucket),
      totalLatencyMs: this.state.totalLatencyMs + latencyMs,
      maxLatencyMs: Math.max(this.state.maxLatencyMs, latencyMs),
      routes: {
        ...this.state.routes,
        [routeKey]: updateRoute(
          route ?? createRouteState(routeKey),
          method,
          statusBucket,
          latencyMs
        )
      }
    }
  }

  snapshot(): RequestMetricsSnapshot {
    return {
      schemaVersion: 'v1',
      startedAt: this.startedAt,
      totalRequests: this.state.totalRequests,
      droppedRouteCount: this.state.droppedRouteCount,
      methods: { ...this.state.methods },
      statusBuckets: { ...this.state.statusBuckets },
      totalLatencyMs: this.state.totalLatencyMs,
      maxLatencyMs: this.state.maxLatencyMs,
      routes: Object.values(this.state.routes)
        .sort((left, right) =>
          left.routeTemplate.localeCompare(right.routeTemplate)
        )
        .map((route) => ({
          ...route,
          methodCounts: { ...route.methodCounts },
          statusBuckets: { ...route.statusBuckets }
        }))
    }
  }

  private shouldAggregateRoute(routeTemplate: string): boolean {
    if (
      routeTemplate === UNMATCHED_ROUTE_TEMPLATE ||
      routeTemplate === OTHER_ROUTE_TEMPLATE
    ) {
      return false
    }
    const explicitRouteCount = Object.keys(this.state.routes).filter(
      (key) => key !== UNMATCHED_ROUTE_TEMPLATE && key !== OTHER_ROUTE_TEMPLATE
    ).length
    return explicitRouteCount >= this.maxRoutes
  }
}

export function normalizeRouteTemplate(value: unknown): string {
  if (typeof value !== 'string') return UNMATCHED_ROUTE_TEMPLATE
  const routeTemplate = value.trim()
  if (
    !routeTemplate ||
    routeTemplate.length > 256 ||
    !routeTemplate.startsWith('/') ||
    routeTemplate.includes('?') ||
    routeTemplate.includes('#')
  ) {
    return UNMATCHED_ROUTE_TEMPLATE
  }
  return routeTemplate
}

export function normalizeMethod(value: unknown): string {
  if (typeof value !== 'string') return OTHER_METHOD
  const method = value.trim().toUpperCase()
  return (REQUEST_METRIC_METHODS as readonly string[]).includes(method)
    ? method
    : OTHER_METHOD
}

function createEmptyState(): RequestMetricsState {
  return {
    totalRequests: 0,
    droppedRouteCount: 0,
    methods: {},
    statusBuckets: createStatusBuckets(),
    totalLatencyMs: 0,
    maxLatencyMs: 0,
    routes: {}
  }
}

function createRouteState(routeTemplate: string): RequestMetricsRouteState {
  return {
    routeTemplate,
    requestCount: 0,
    methodCounts: {},
    statusBuckets: createStatusBuckets(),
    totalLatencyMs: 0,
    maxLatencyMs: 0
  }
}

function updateRoute(
  route: RequestMetricsRouteState,
  method: string,
  statusBucket: RequestStatusBucket,
  latencyMs: number
): RequestMetricsRouteState {
  return {
    ...route,
    requestCount: route.requestCount + 1,
    methodCounts: incrementCounter(route.methodCounts, method),
    statusBuckets: incrementCounter(route.statusBuckets, statusBucket),
    totalLatencyMs: route.totalLatencyMs + latencyMs,
    maxLatencyMs: Math.max(route.maxLatencyMs, latencyMs)
  }
}

function createStatusBuckets(): Record<RequestStatusBucket, number> {
  return {
    '2xx': 0,
    '3xx': 0,
    '4xx': 0,
    '5xx': 0,
    other: 0
  }
}

function incrementCounter<TKey extends string>(
  counters: Readonly<Record<TKey, number>>,
  key: TKey
): Record<TKey, number> {
  return {
    ...counters,
    [key]: (counters[key] ?? 0) + 1
  } as Record<TKey, number>
}

function statusBucketFor(statusCode: number): RequestStatusBucket {
  if (!Number.isInteger(statusCode)) return 'other'
  if (statusCode >= 200 && statusCode <= 299) return '2xx'
  if (statusCode >= 300 && statusCode <= 399) return '3xx'
  if (statusCode >= 400 && statusCode <= 499) return '4xx'
  if (statusCode >= 500 && statusCode <= 599) return '5xx'
  return 'other'
}

function normalizeLatency(value: number): number {
  if (!Number.isFinite(value) || value < 0 || value > MAX_LATENCY_MS) {
    throw new Error('latencyMs must be a finite number between 0 and 86400000')
  }
  return Math.round(value)
}
