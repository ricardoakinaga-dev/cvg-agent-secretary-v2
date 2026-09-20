import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  PHASE10_REQUIRED_LOCAL_GATES,
  computeDecision,
  sha256Bytes,
  verifyGateEvidence
} from '../scripts/lib/certification-rules.mjs'
import {
  classifySkip,
  loadSkipManifest,
  readPostgresScopedFiles
} from '../scripts/lib/skip-policy.mjs'

const repositoryRoot = path.resolve(import.meta.dirname, '..')
const candidateId = 'a'.repeat(64)
const runId = 'run-aud19-skip-fixture'

function record(path, content, kind, extra = {}) {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content)
  return {
    path,
    sha256: sha256Bytes(buffer),
    size: buffer.byteLength,
    kind,
    ...extra
  }
}

function vitestLog(gate, body) {
  return [
    `$ fixture ${gate}`,
    `# runId=${runId} candidateId=${candidateId} gate=${gate} command=fixture ${gate}`,
    '# exitCode=0 durationMs=1 database=absent',
    '',
    body,
    ''
  ].join('\n')
}

function inventory(entries, pending) {
  return {
    numTotalTests: entries.length + 4,
    numPassedTests: 4,
    numFailedTests: 0,
    numPendingTests: pending,
    testResults: entries
  }
}

function skipFixture({ inventoryReport, requiredManifest, skipContext }) {
  const unitLog = vitestLog(
    'unit',
    ' Test Files  1 passed (1)\n      Tests  4 passed | 2 skipped (6)'
  )
  const postgresLog = vitestLog('postgres', 'no execution in this fixture')
  const unitReport = JSON.stringify(inventoryReport)
  const postgresReport = JSON.stringify(inventory([], 0))
  const logEvidence = record('certification/logs/unit.log', unitLog, 'log', {
    runId
  })
  const unitReportEvidence = record(
    'certification/logs/unit-report.json',
    unitReport,
    'result',
    { runId }
  )
  const postgresLogEvidence = record(
    'certification/logs/postgres.log',
    postgresLog,
    'log',
    { runId }
  )
  const postgresReportEvidence = record(
    'certification/logs/postgres-report.json',
    postgresReport,
    'result',
    { runId }
  )
  const result = {
    runId,
    candidate: { candidateId },
    gates: [
      {
        id: 'unit',
        command: 'fixture unit',
        status: 'PASS',
        exitCode: 0,
        durationMs: 1,
        evidence: [logEvidence, unitReportEvidence],
        metrics: {
          filesPassed: 1,
          filesFailed: 0,
          filesSkipped: 0,
          testsPassed: 4,
          testsFailed: 0,
          testsSkipped: 2
        },
        skipJustification:
          'conditional skips reported by the raw runner inventory'
      },
      {
        id: 'postgres',
        command: 'fixture postgres',
        status: 'NOT_EXECUTED',
        exitCode: 0,
        durationMs: 1,
        evidence: [postgresLogEvidence, postgresReportEvidence]
      }
    ]
  }
  const manifest = {
    runId,
    candidateId,
    artifacts: [
      { ...logEvidence, producer: 'fixture', gateId: 'unit' },
      { ...unitReportEvidence, producer: 'fixture', gateId: 'unit' },
      { ...postgresLogEvidence, producer: 'fixture', gateId: 'postgres' },
      { ...postgresReportEvidence, producer: 'fixture', gateId: 'postgres' }
    ]
  }
  const content = new Map([
    [logEvidence.path, Buffer.from(unitLog)],
    [unitReportEvidence.path, Buffer.from(unitReport)],
    [postgresLogEvidence.path, Buffer.from(postgresLog)],
    [postgresReportEvidence.path, Buffer.from(postgresReport)]
  ])
  return verifyGateEvidence({
    result,
    manifest,
    artifactReader: (target) => content.get(target),
    requiredSkips: requiredManifest,
    skipContext
  })
}

const requiredManifest = {
  schemaVersion: 1,
  kind: 'aud19-required-skips',
  required: [
    {
      id: 'REQ-CRITICAL-AUTHORITY',
      gate: '*',
      filePattern: '**/authority.test.ts',
      when: 'always',
      reason: 'critical authority tests can never skip'
    }
  ],
  optional: [
    {
      id: 'OPT-DATABASE-CONDITIONAL-UNIT',
      gate: 'unit',
      filePattern: '**',
      when: 'database_absent',
      requiresPostgresScope: true,
      coveredByGate: 'postgres',
      reason: 'covered by the dedicated PostgreSQL gate'
    }
  ]
}

describe('AUD19-08 required-skip policy', () => {
  it('fails a gate whose raw inventory contains a required skip even with skipJustification', () => {
    const failures = skipFixture({
      inventoryReport: inventory(
        [
          {
            name: `${repositoryRoot}/packages/policy-engine/src/__tests__/authority.test.ts`,
            assertionResults: [
              { fullName: 'authority guard denies', status: 'skipped' }
            ]
          },
          {
            name: `${repositoryRoot}/packages/persistence/src/__tests__/goal-concurrency-postgres.test.ts`,
            assertionResults: [
              { fullName: 'concurrent goal creation', status: 'skipped' }
            ]
          }
        ],
        2
      ),
      requiredManifest,
      skipContext: {
        root: repositoryRoot,
        postgresScopedFiles: [
          'packages/persistence/src/__tests__/goal-concurrency-postgres.test.ts'
        ]
      }
    })
    expect(failures).toContain(
      'required_skip:unit:packages/policy-engine/src/__tests__/authority.test.ts::authority guard denies'
    )
  })

  it('accepts a declared conditional skip covered by the PostgreSQL gate', () => {
    const failures = skipFixture({
      inventoryReport: inventory(
        [
          {
            name: `${repositoryRoot}/packages/persistence/src/__tests__/outbox-durability.test.ts`,
            assertionResults: [
              { fullName: 'outbox survives restart', status: 'skipped' }
            ]
          },
          {
            name: `${repositoryRoot}/packages/persistence/src/__tests__/goal-concurrency-postgres.test.ts`,
            assertionResults: [
              { fullName: 'concurrent goal creation', status: 'skipped' }
            ]
          }
        ],
        2
      ),
      requiredManifest,
      skipContext: {
        root: repositoryRoot,
        postgresScopedFiles: [
          'packages/persistence/src/__tests__/outbox-durability.test.ts',
          'packages/persistence/src/__tests__/goal-concurrency-postgres.test.ts'
        ]
      }
    })
    expect(
      failures.filter((failure) => failure.startsWith('required_skip:'))
    ).toEqual([])
  })

  it('rejects an inventory that hides skipped tests from the summary', () => {
    const failures = skipFixture({
      inventoryReport: inventory(
        [
          {
            name: `${repositoryRoot}/packages/persistence/src/__tests__/outbox-durability.test.ts`,
            assertionResults: [
              { fullName: 'outbox survives restart', status: 'skipped' }
            ]
          }
        ],
        1
      ),
      requiredManifest,
      skipContext: {
        root: repositoryRoot,
        postgresScopedFiles: [
          'packages/persistence/src/__tests__/outbox-durability.test.ts'
        ]
      }
    })
    expect(
      failures.some((failure) => failure.startsWith('skip_inventory_mismatch:'))
    ).toBe(true)
  })

  it('classifies an unknown skip as required (fail closed)', () => {
    const classification = classifySkip(
      { file: 'tests/new-suite.test.js', name: 'brand new test' },
      { gate: 'unit', databaseAvailable: false, postgresScopedFiles: [] },
      requiredManifest
    )
    expect(classification.classification).toBe('required')
    expect(classification.ruleId).toBe('unclassified-skip-fail-closed')
  })

  it('keeps the versioned manifest frozen and fail-closed', () => {
    const manifest = loadSkipManifest(repositoryRoot)
    expect(manifest).not.toBeNull()
    expect(manifest.defaultClassification).toBe('required')
    expect(manifest.policy.justificationCannotWaive).toBe(true)
    expect(
      manifest.required.some((rule) => rule.id === 'REQ-POSTGRES-GATE-ANY')
    ).toBe(true)
  })

  it('selects the PostgreSQL gate files from package.json instead of a second copy', () => {
    const scoped = readPostgresScopedFiles(repositoryRoot)
    expect(scoped).toContain(
      'packages/persistence/src/__tests__/goal-concurrency-postgres.test.ts'
    )
    expect(scoped.length).toBeGreaterThan(20)
  })
})

describe('AUD19-08 certification decision guards', () => {
  const gates = PHASE10_REQUIRED_LOCAL_GATES.map((id) => ({
    id,
    command: `fixture ${id}`,
    status: 'PASS',
    exitCode: 0,
    durationMs: 1
  }))
  const externalGates = {
    modelProvider: 'NOT_VALIDATED',
    channel: 'NOT_VALIDATED',
    externalIdentity: 'NOT_VALIDATED',
    humanSignoff: 'NOT_VALIDATED'
  }
  const finding = (id) => ({
    id,
    title: id,
    owner: 'synthetic',
    status: 'OPEN',
    riskAccepted: false,
    mitigation: 'synthetic'
  })

  it('blocks GO with an open P1 finding', () => {
    const decision = computeDecision({
      gates,
      findings: { P0: [], P1: [finding('F-P1-01')], P2: [] },
      externalGates
    })
    expect(decision.decision).toBe('NO_GO')
  })

  it('blocks GO with an open P0 finding', () => {
    const decision = computeDecision({
      gates,
      findings: { P0: [finding('F-P0-01')], P1: [], P2: [] },
      externalGates
    })
    expect(decision.decision).toBe('NO_GO')
  })

  it('stays fail-closed without fabricating a GO', () => {
    const decision = computeDecision({
      gates: gates.filter((gate) => gate.id !== 'unit'),
      findings: { P0: [], P1: [], P2: [] },
      externalGates
    })
    expect(decision.decision).not.toBe('GO')
  })
})
