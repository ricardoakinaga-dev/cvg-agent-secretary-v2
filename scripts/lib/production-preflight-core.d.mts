export interface ProductionBootstrapCheck {
  id: string
  status: 'PASS' | 'FAIL'
  detail: string
}

export interface ProductionBootstrapResult {
  schemaVersion: 1
  kind: 'production-bootstrap-preflight'
  profile: string
  status: 'PASS' | 'FAIL'
  actualStatus: 'PASS' | 'FAIL'
  sideEffects: false
  checks: ProductionBootstrapCheck[]
  blocking: string[]
}

export function evaluateProductionBootstrap(input?: {
  env?: NodeJS.ProcessEnv
  root?: string
  profile?: string
}): ProductionBootstrapResult

export function assertProductionBootstrap(
  env?: NodeJS.ProcessEnv,
  root?: string
): void
