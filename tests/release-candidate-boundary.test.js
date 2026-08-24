import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8')
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath))
}

function exists(relativePath) {
  return fs.existsSync(path.join(rootDir, relativePath))
}

describe('controlled pilot boundary release candidate', () => {
  it('keeps every rollout artifact required by P10 present', () => {
    const boundary = readJson('docs/08_runtime/release_candidate_boundary.json')

    for (const artifact of boundary.artifacts) {
      expect(exists(artifact.path), `${artifact.path} must exist`).toBe(true)
    }
  })

  it('does not authorize real pilot, production, real channels or sensitive automation', () => {
    const boundary = readJson('docs/08_runtime/release_candidate_boundary.json')
    const blocked = new Set(boundary.decision.blockedCapabilities)

    expect(boundary.status).toBe('RELEASE_CANDIDATE_AUDITED_WITH_RESTRICTIONS')
    expect(boundary.decision.releaseCandidateAllowed).toBe(true)
    expect(boundary.decision.realPilotAllowed).toBe(false)
    expect(boundary.decision.productionAllowed).toBe(false)
    expect(boundary.decision.externalChannelsAllowed).toBe(false)
    expect(boundary.decision.realRagAllowed).toBe(false)
    expect(boundary.decision.externalAuditExportAllowed).toBe(false)
    expect(boundary.decision.sensitiveAutomationAllowed).toBe(false)
    expect(blocked).toEqual(
      new Set([
        'real_data',
        'real_channels',
        'real_rag',
        'external_audit_export',
        'appointment_confirmation',
        'appointment_cancellation',
        'appointment_reschedule',
        'clinical_action',
        'financial_action',
        'medical_record_final_write'
      ])
    )
  })

  it('requires unresolved human signoffs before any real rollout', () => {
    const boundary = readJson('docs/08_runtime/release_candidate_boundary.json')
    const signoffIds = new Set(
      boundary.requiredSignoffs.map((signoff) => signoff.id)
    )

    expect(signoffIds).toEqual(
      new Set([
        'RETENTION_REAL_DATA',
        'REAL_HOSPITAL_ROLE_MAPPING',
        'APPROVED_INSTITUTIONAL_RAG_SOURCE',
        'REAL_CHANNEL_CONFIGURATION',
        'SENSITIVE_ACTION_POLICY'
      ])
    )
    expect(
      boundary.requiredSignoffs.every(
        (signoff) =>
          signoff.status === 'NOT_APPROVED' &&
          signoff.humanDecisionRequired === true
      )
    ).toBe(true)
  })

  it('keeps pilot report and remediation templates decision-oriented', () => {
    const pilotReport = read('docs/04_audit/pilot_report_template.md')
    const remediationLoop = read('docs/04_audit/remediation_loop_template.md')

    expect(pilotReport).toContain('APPROVED_FOR_REAL_DATA: false')
    expect(pilotReport).toContain('GO_NO_GO_DECISION')
    expect(pilotReport).toContain('EVIDENCE_LINKS')
    expect(remediationLoop).toContain('SEVERITY')
    expect(remediationLoop).toContain('OWNER')
    expect(remediationLoop).toContain('REVALIDATION_COMMANDS')
  })

  it('links the release candidate audit to executed gate evidence', () => {
    const audit = read('docs/04_audit/0492_release_candidate_audit.md')
    const evidence = read('docs/04_audit/0491_runtime_evidence.md')

    expect(audit).toContain('CC-S12')
    expect(audit).toContain('RELEASE_CANDIDATE_WITH_RESTRICTIONS')
    expect(audit).toContain('npm run verify')
    expect(evidence).toContain('Release candidate boundary')
    expect(evidence).toContain(
      'docs/08_runtime/release_candidate_boundary.json'
    )
  })
})
