import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  validateHumanAccessibilityEvidence,
  validateProfileReport,
  validateQualificationInput
} from '../scripts/lib/aud20-19-qualification.mjs'

const manifest = JSON.parse(
  fs.readFileSync(
    path.resolve('docs/03_build/tracking/aud20_19_profiles.json'),
    'utf8'
  )
)
const candidateId = 'a'.repeat(64)
const command = (id) => ({
  id,
  status: 'PASS',
  exitCode: 0,
  stdoutArtifact: `raw/${id}.stdout.txt`,
  stderrArtifact: `raw/${id}.stderr.txt`,
  stdoutSha256: 'b'.repeat(64),
  stderrSha256: 'c'.repeat(64)
})
const verifyArtifact = () => true

describe('AUD20-19 qualification contracts', () => {
  it('accepts bounded postgres input and rejects missing prerequisites', () => {
    expect(
      validateQualificationInput(
        {
          profile: 'postgres_durable',
          candidateId,
          events: 250,
          concurrency: 4,
          durationMs: 30_000,
          databaseAvailable: true
        },
        manifest
      )
    ).toEqual([])
    expect(
      validateQualificationInput(
        {
          profile: 'postgres_durable',
          candidateId: 'bad',
          events: 99,
          concurrency: 17,
          durationMs: 0,
          databaseAvailable: false
        },
        manifest
      )
    ).toEqual(
      expect.arrayContaining([
        'candidate_invalid',
        'events_out_of_bounds',
        'concurrency_out_of_bounds',
        'duration_out_of_bounds',
        'postgres_required'
      ])
    )
  })

  it('rejects hidden skips, failed commands and overstated memory claims', () => {
    const report = {
      profile: 'memory_smoke',
      candidateId,
      claim: 'LOCAL_MEMORY_SMOKE',
      releaseEligible: false,
      environment: { node: 'v22.23.2', cpuModel: 'synthetic-cpu' },
      configuration: { events: 250, concurrency: 4, durationMs: 30_000 },
      skips: { total: 0, required: 0, optional: 0, unknown: 0 },
      commands: [command('load_memory')],
      metrics: { throughputPerSecond: 1, latencyMs: {}, loss: 0, duplicates: 0 }
    }
    expect(
      validateProfileReport(report, manifest, candidateId, verifyArtifact)
    ).toEqual([])
    expect(
      validateProfileReport(
        {
          ...report,
          skips: { total: 1, required: 1, optional: 0, unknown: 0 }
        },
        manifest,
        candidateId,
        verifyArtifact
      )
    ).toContain('required_or_unknown_skips')
    expect(
      validateProfileReport(
        {
          ...report,
          commands: [{ ...command('load_memory'), exitCode: 1 }]
        },
        manifest,
        candidateId,
        verifyArtifact
      )
    ).toContain('command_failed')
    expect(
      validateProfileReport(
        {
          ...report,
          commands: [...report.commands, command('unapproved_command')]
        },
        manifest,
        candidateId,
        verifyArtifact
      )
    ).toContain('command_not_allowlisted')
    expect(
      validateProfileReport(
        {
          ...report,
          environment: { ...report.environment, node: 'v24.20.0' }
        },
        manifest,
        candidateId,
        verifyArtifact
      )
    ).toContain('runtime_node_mismatch')
    expect(
      validateProfileReport(
        {
          ...report,
          skips: { total: 1, required: 0, optional: 0, unknown: 0 }
        },
        manifest,
        candidateId,
        verifyArtifact
      )
    ).toContain('required_or_unknown_skips')
    expect(
      validateProfileReport(report, manifest, 'd'.repeat(64), verifyArtifact)
    ).toContain('candidate_mismatch')
    expect(validateProfileReport(report, manifest, candidateId)).toContain(
      'command_artifact_receipt_invalid'
    )
  })

  it('keeps the human gate pending without fabricating evidence', () => {
    expect(
      validateHumanAccessibilityEvidence({ status: 'PENDING_HUMAN_SESSION' })
    ).toEqual({ status: 'PENDING', failures: [] })
    const invalid = validateHumanAccessibilityEvidence({
      status: 'COMPLETED',
      synthetic: true,
      consentConfirmed: false,
      steps: [],
      issues: []
    })
    expect(invalid.status).toBe('FAIL')
    expect(invalid.failures).toEqual(
      expect.arrayContaining([
        'consent_required',
        'participant_role_required',
        'assistive_technology_required',
        'steps_required'
      ])
    )
  })

  it('rejects semantically invalid postgres metrics and failed cleanup', () => {
    const report = {
      profile: 'postgres_durable',
      candidateId,
      claim: 'LOCAL_POSTGRES_DURABLE',
      releaseEligible: false,
      environment: { node: 'v22.23.2', cpuModel: 'synthetic-cpu' },
      configuration: { events: 250, concurrency: 4, durationMs: 30_000 },
      skips: { total: 0, required: 0, optional: 0, unknown: 0 },
      commands: [
        command('chaos_postgres'),
        command('safety_postgres'),
        command('load_postgres')
      ],
      metrics: {
        processed: 250,
        throughputPerSecond: 100,
        latencyMs: { p50: 1, p95: 2, p99: 3 },
        errors: 0,
        retries: 0,
        backlog: 0,
        recoveryMs: 1,
        recoveryTerminationCount: 1,
        recoveryPoolErrors: 1,
        recoveryQueryFailures: 0,
        cleanup: 'FAIL'
      }
    }
    expect(
      validateProfileReport(report, manifest, candidateId, verifyArtifact)
    ).toContain('postgres_metrics_invalid')
  })

  it('routes complete, ordered human evidence to human review, never PASS', () => {
    const valid = validateHumanAccessibilityEvidence({
      status: 'COMPLETED',
      synthetic: true,
      consentConfirmed: true,
      participantRole: 'authorized accessibility reviewer',
      assistiveTechnology: { name: 'screen reader', version: 'test-version' },
      startedAt: '2026-09-22T12:00:00.000Z',
      finishedAt: '2026-09-22T12:30:00.000Z',
      steps: [{ id: 'keyboard-nav', status: 'PASS', observation: 'completed' }],
      issues: []
    })
    expect(valid).toEqual({ status: 'READY_FOR_HUMAN_REVIEW', failures: [] })

    const reversed = validateHumanAccessibilityEvidence({
      status: 'COMPLETED',
      synthetic: true,
      consentConfirmed: true,
      participantRole: 'reviewer',
      assistiveTechnology: { name: 'reader', version: '1' },
      startedAt: '2026-09-22T12:30:00.000Z',
      finishedAt: '2026-09-22T12:00:00.000Z',
      steps: [{ id: 'step', status: 'PASS', observation: 'observed' }],
      issues: []
    })
    expect(reversed.failures).toContain('timestamps_out_of_order')
  })
})
