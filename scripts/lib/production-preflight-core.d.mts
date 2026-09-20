export interface ProductionBootstrapCheck {
  id: string
  status: 'PASS' | 'FAIL'
  detail: string
}

export interface ExternalAttestationEvaluation {
  valid: boolean
  reason: string
  owner: string | null
  expiresAt: string | null
  signals: Record<string, 'APPROVED' | null>
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
  externalAttestation: {
    status: 'PASS' | 'FAIL'
    reason: string
    owner: string | null
    expiresAt: string | null
    signals: Record<string, 'APPROVED' | null>
  }
}

export const REQUIRED_PRODUCTION_MIGRATIONS: readonly string[]
export const EXTERNAL_ATTESTATION_ENV: {
  readonly file: 'CVG_EXTERNAL_ATTESTATION_FILE'
  readonly sha256: 'CVG_EXTERNAL_ATTESTATION_SHA256'
  readonly hmacKey: 'CVG_EXTERNAL_ATTESTATION_HMAC_KEY'
}
export const EXTERNAL_ATTESTATION_SCHEMA_VERSION: 1
export const EXTERNAL_ATTESTATION_KIND: 'cvg-external-signals-attestation'
export const EXTERNAL_ATTESTATION_SIGNAL_KEYS: readonly string[]
export const EXTERNAL_CANDIDATE_DIGEST_ENV: 'CVG_RELEASE_CANDIDATE_DIGEST'
export const EXTERNAL_ATTESTATION_CONFIG_KEYS: readonly string[]

export function computeExternalAttestationConfigDigest(
  env?: NodeJS.ProcessEnv
): string

export function computeExternalAttestationSignature(
  attestation: Record<string, unknown>,
  key: string
): string

export function evaluateExternalSignalsAttestation(input?: {
  env?: NodeJS.ProcessEnv
  root?: string
  profile?: string
}): ExternalAttestationEvaluation

export function evaluateProductionBootstrap(input?: {
  env?: NodeJS.ProcessEnv
  root?: string
  profile?: string
}): ProductionBootstrapResult

export function assertProductionBootstrap(
  env?: NodeJS.ProcessEnv,
  root?: string
): void
