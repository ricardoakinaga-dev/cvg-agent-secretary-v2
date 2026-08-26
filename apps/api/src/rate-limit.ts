export interface RateLimitPolicy {
  max: number
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds: number
}

export interface InMemoryRateLimiterOptions {
  now?: () => number
  maxBuckets?: number
}

export interface RateLimitSnapshot {
  bucketCount: number
  maxBuckets: number
}

export const DEFAULT_MAX_BUCKETS = 4_096
export const MAX_ALLOWED_BUCKETS = 65_536
export const MAX_RATE_LIMIT_WINDOW_MS = 86_400_000
export const MAX_RATE_LIMIT_REQUESTS = 1_000_000
export const MAX_RATE_LIMIT_KEY_LENGTH = 256

interface RateLimitBucket {
  count: number
  resetAt: number
}

export class InMemoryRateLimiter {
  private buckets = new Map<string, RateLimitBucket>()
  private readonly now: () => number
  private readonly maxBuckets: number

  constructor(
    nowOrOptions: (() => number) | InMemoryRateLimiterOptions = Date.now
  ) {
    const options =
      typeof nowOrOptions === 'function' ? { now: nowOrOptions } : nowOrOptions
    this.now = options.now ?? Date.now
    this.maxBuckets = validateMaxBuckets(options.maxBuckets)
  }

  check(key: string, policy: RateLimitPolicy): RateLimitResult {
    const normalizedKey = normalizeRateLimitKey(key)
    validateRateLimitPolicy(policy)
    const currentTime = this.now()
    if (!Number.isFinite(currentTime)) {
      throw new RangeError('Rate limit clock must return a finite number')
    }

    let nextBuckets = withoutExpiredBuckets(this.buckets, currentTime)
    const existing = nextBuckets.get(normalizedKey)
    if (!existing) {
      if (nextBuckets.size >= this.maxBuckets) {
        nextBuckets = evictEarliestReset(nextBuckets)
      }
      nextBuckets = new Map(nextBuckets).set(normalizedKey, {
        count: 1,
        resetAt: currentTime + policy.windowMs
      })
      this.buckets = nextBuckets
      return { allowed: true, retryAfterSeconds: 0 }
    }
    if (existing.count >= policy.max) {
      this.buckets = nextBuckets
      return {
        allowed: false,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((existing.resetAt - currentTime) / 1000)
        )
      }
    }
    this.buckets = new Map(nextBuckets).set(normalizedKey, {
      count: existing.count + 1,
      resetAt: existing.resetAt
    })
    return { allowed: true, retryAfterSeconds: 0 }
  }

  snapshot(): RateLimitSnapshot {
    return {
      bucketCount: this.buckets.size,
      maxBuckets: this.maxBuckets
    }
  }
}

function validateMaxBuckets(value: number | undefined): number {
  const maxBuckets = value ?? DEFAULT_MAX_BUCKETS
  if (
    !Number.isSafeInteger(maxBuckets) ||
    maxBuckets < 1 ||
    maxBuckets > MAX_ALLOWED_BUCKETS
  ) {
    throw new RangeError(
      `Rate limit maxBuckets must be an integer between 1 and ${MAX_ALLOWED_BUCKETS}`
    )
  }
  return maxBuckets
}

function normalizeRateLimitKey(key: string): string {
  if (typeof key !== 'string') {
    throw new RangeError('Rate limit key must be a non-empty string')
  }
  const normalizedKey = key.trim()
  if (
    normalizedKey.length === 0 ||
    normalizedKey.length > MAX_RATE_LIMIT_KEY_LENGTH
  ) {
    throw new RangeError(
      `Rate limit key must contain between 1 and ${MAX_RATE_LIMIT_KEY_LENGTH} characters`
    )
  }
  return normalizedKey
}

function validateRateLimitPolicy(policy: RateLimitPolicy): void {
  if (
    !policy ||
    !Number.isSafeInteger(policy.max) ||
    policy.max < 1 ||
    policy.max > MAX_RATE_LIMIT_REQUESTS ||
    !Number.isSafeInteger(policy.windowMs) ||
    policy.windowMs < 1 ||
    policy.windowMs > MAX_RATE_LIMIT_WINDOW_MS
  ) {
    throw new RangeError(
      `Rate limit policy max must be between 1 and ${MAX_RATE_LIMIT_REQUESTS} and windowMs must be between 1 and ${MAX_RATE_LIMIT_WINDOW_MS}`
    )
  }
}

function withoutExpiredBuckets(
  buckets: Map<string, RateLimitBucket>,
  currentTime: number
): Map<string, RateLimitBucket> {
  const activeBuckets = new Map<string, RateLimitBucket>()
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt > currentTime) {
      activeBuckets.set(key, bucket)
    }
  }
  return activeBuckets
}

function evictEarliestReset(
  buckets: Map<string, RateLimitBucket>
): Map<string, RateLimitBucket> {
  let candidateKey: string | undefined
  let candidateResetAt = Number.POSITIVE_INFINITY
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < candidateResetAt) {
      candidateKey = key
      candidateResetAt = bucket.resetAt
    }
  }
  return candidateKey === undefined
    ? buckets
    : new Map([...buckets].filter(([key]) => key !== candidateKey))
}
