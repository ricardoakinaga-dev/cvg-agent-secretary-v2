export type PersistenceMode = 'memory' | 'postgres' | 'postgres-pool'

export interface ReadinessInput {
  persistenceMode: PersistenceMode
  durableInbound: boolean
  production: boolean
}

export interface ReadinessCheck {
  name: string
  status: 'ok' | 'degraded' | 'failed'
  detail: string
}

export interface ReadinessResult {
  ready: boolean
  checks: ReadinessCheck[]
}

export function evaluateReadiness(input: ReadinessInput): ReadinessResult {
  const checks: ReadinessCheck[] = [
    {
      name: 'process',
      status: 'ok',
      detail: 'process is responding'
    }
  ]

  if (input.persistenceMode === 'memory') {
    checks.push({
      name: 'persistence',
      status: input.production ? 'failed' : 'degraded',
      detail: 'in-memory persistence is not durable'
    })
  } else {
    checks.push({
      name: 'persistence',
      status: 'ok',
      detail: `${input.persistenceMode} persistence configured`
    })
  }

  if (input.durableInbound) {
    checks.push({
      name: 'durability',
      status: 'ok',
      detail: 'durable inbound processing configured'
    })
  } else {
    checks.push({
      name: 'durability',
      status: input.production ? 'failed' : 'degraded',
      detail: 'inline inbound processing is not durable'
    })
  }

  return {
    ready: checks.every((check) => check.status !== 'failed'),
    checks
  }
}
