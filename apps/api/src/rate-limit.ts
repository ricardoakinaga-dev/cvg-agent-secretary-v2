export interface RateLimitPolicy {
  max: number
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds: number
}

interface RateLimitBucket {
  count: number
  resetAt: number
}

export class InMemoryRateLimiter {
  private buckets = new Map<string, RateLimitBucket>()

  constructor(private readonly now: () => number = Date.now) {}

  check(key: string, policy: RateLimitPolicy): RateLimitResult {
    const currentTime = this.now()
    const existing = this.buckets.get(key)
    if (!existing || existing.resetAt <= currentTime) {
      this.buckets = new Map(this.buckets).set(key, {
        count: 1,
        resetAt: currentTime + policy.windowMs
      })
      return { allowed: true, retryAfterSeconds: 0 }
    }
    if (existing.count >= policy.max) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((existing.resetAt - currentTime) / 1000)
        )
      }
    }
    this.buckets = new Map(this.buckets).set(key, {
      count: existing.count + 1,
      resetAt: existing.resetAt
    })
    return { allowed: true, retryAfterSeconds: 0 }
  }
}
