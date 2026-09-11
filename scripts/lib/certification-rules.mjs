import { z } from 'zod'

export const PHASE10_REQUIRED_LOCAL_GATES = [
  'format',
  'typecheck',
  'lint',
  'build',
  'unit',
  'coverage',
  'security',
  'worker_startup',
  'e2e',
  'evals',
  'chaos',
  'load',
  'restore',
  'sbom',
  'licenses'
]

export const PHASE10_ENVIRONMENT_GATES = ['postgres']

export const ExternalGateStatusSchema = z.enum([
  'VALIDATED',
  'NOT_VALIDATED',
  'PENDING',
  'NOT_APPLICABLE'
])

export const ExternalGatesSchema = z.object({
  modelProvider: ExternalGateStatusSchema,
  channel: ExternalGateStatusSchema,
  externalIdentity: ExternalGateStatusSchema,
  humanSignoff: ExternalGateStatusSchema
})

export const FindingSchema = z.object({
  id: z.string().min(3),
  title: z.string().min(3),
  owner: z.string().min(1),
  status: z.string().min(1),
  riskAccepted: z.boolean(),
  mitigation: z.string().min(3)
})

export const GateResultSchema = z.object({
  id: z.string().min(1),
  command: z.string().min(1),
  status: z.enum(['PASS', 'FAIL', 'NOT_EXECUTED']),
  exitCode: z.number().int(),
  durationMs: z.number().int().nonnegative(),
  log: z.string().optional(),
  logSha256: z.string().optional()
})

export const ScoresSchema = z.record(z.string(), z.number().min(0).max(100))

export const Phase10ResultSchema = z.object({
  schemaVersion: z.literal(1),
  phase: z.literal('10'),
  kind: z.literal('phase10-result'),
  commit: z.string().min(7),
  timestamp: z.string().datetime(),
  scores: ScoresSchema,
  findings: z.object({
    P0: z.array(FindingSchema),
    P1: z.array(FindingSchema),
    P2: z.array(FindingSchema)
  }),
  gates: z.array(GateResultSchema),
  externalGates: ExternalGatesSchema,
  metrics: z.object({
    unit: z.record(z.string(), z.unknown()).optional(),
    coverage: z.record(z.string(), z.unknown()).nullable().optional(),
    evals: z.record(z.string(), z.unknown()).optional(),
    chaos: z.record(z.string(), z.unknown()).optional(),
    load: z.record(z.string(), z.unknown()).optional(),
    restore: z.record(z.string(), z.unknown()).optional()
  }),
  certification: z.enum([
    'STATE_OF_ART_TRIPLE_AAA',
    'AAA_CANDIDATE',
    'AAA_CONTROLLED',
    'CONDITIONAL_GO',
    'NO_GO'
  ]),
  decision: z.enum(['GO', 'CONDITIONAL_GO', 'NO_GO']),
  remainingBlockers: z.array(z.string())
})

export const ArtifactRecordSchema = z.object({
  path: z.string().min(1),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  size: z.number().int().nonnegative(),
  producer: z.string().min(1),
  recordedAt: z.string().datetime()
})

export const CertificationManifestSchema = z.object({
  schemaVersion: z.literal(1),
  phase: z.literal('10'),
  kind: z.literal('phase10-manifest'),
  commit: z.string().min(7),
  timestamp: z.string().datetime(),
  artifacts: z.array(ArtifactRecordSchema),
  decision: z.enum(['GO', 'CONDITIONAL_GO', 'NO_GO']),
  certification: z.string().min(3)
})

/**
 * Deterministic GO/NO-GO calculus. No score or label can override a failed
 * required gate, an open P0/P1 finding, a missing external validation or a
 * pending human signoff.
 */
export function computeDecision(input) {
  const p0 = input.findings.P0.length
  const p1 = input.findings.P1.length
  const localGates = input.gates.filter((gate) =>
    PHASE10_REQUIRED_LOCAL_GATES.includes(gate.id)
  )
  const localFailed = localGates.filter((gate) => gate.status === 'FAIL')
  const externalPending =
    input.externalGates.modelProvider !== 'VALIDATED' ||
    input.externalGates.channel !== 'VALIDATED' ||
    input.externalGates.externalIdentity !== 'VALIDATED'
  const humanPending = input.externalGates.humanSignoff !== 'VALIDATED'
  const environmentNotExecuted = input.gates
    .filter((gate) => PHASE10_ENVIRONMENT_GATES.includes(gate.id))
    .some((gate) => gate.status !== 'PASS')

  if (p0 > 0 || p1 > 0 || localFailed.length > 0) {
    return {
      decision: 'NO_GO',
      certification: 'NO_GO',
      blockers: buildBlockers(
        input,
        localFailed,
        environmentNotExecuted,
        externalPending,
        humanPending,
        { hardFail: true }
      )
    }
  }
  if (environmentNotExecuted || externalPending || humanPending) {
    return {
      decision: 'CONDITIONAL_GO',
      certification: 'AAA_CONTROLLED',
      blockers: buildBlockers(
        input,
        localFailed,
        environmentNotExecuted,
        externalPending,
        humanPending,
        { hardFail: false }
      )
    }
  }
  return {
    decision: 'GO',
    certification: 'STATE_OF_ART_TRIPLE_AAA',
    blockers: []
  }
}

function buildBlockers(
  input,
  localFailed,
  environmentNotExecuted,
  externalPending,
  humanPending,
  { hardFail }
) {
  const blockers = []
  if (
    !hardFail &&
    input.findings.P0.length === 0 &&
    input.findings.P1.length === 0
  ) {
    blockers.push('P0=0 and P1=0 (controlled scope)')
  }
  for (const gate of localFailed) {
    blockers.push(`required gate failed: ${gate.id}`)
  }
  if (environmentNotExecuted) {
    blockers.push(
      'PostgreSQL environment gate not executed (TEST_DATABASE_URL)'
    )
  }
  if (externalPending) {
    blockers.push(
      'external integrations not validated (provider/channel/identity)'
    )
  }
  if (humanPending) {
    blockers.push('human signoff pending')
  }
  return blockers
}
