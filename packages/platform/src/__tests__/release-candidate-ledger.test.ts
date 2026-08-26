import { describe, expect, it } from 'vitest'
import {
  AgentConfigSchema,
  InMemoryControlPlaneStore,
  ReleaseCandidateCreateInputSchema,
  ReleaseCandidateTransitionInputSchema,
  computeReleaseCandidateEvidenceDigest,
  hasAllReleaseCandidateGatesPassed,
  type ReleaseCandidateRecord
} from '../index.ts'

const tenantA = 'tenant_00000000-0000-4000-8000-000000000201'
const tenantB = 'tenant_00000000-0000-4000-8000-000000000202'

const gateResults = [
  {
    key: 'safety_preflight',
    status: 'PASS',
    evidenceRef: 'controlled://evidence/safety-preflight-v1'
  },
  {
    key: 'test_lab_regression',
    status: 'PASS',
    evidenceRef: 'controlled://evidence/test-lab-regression-v1'
  },
  {
    key: 'snapshot_integrity',
    status: 'PASS',
    evidenceRef: 'controlled://evidence/snapshot-integrity-v1'
  },
  {
    key: 'external_boundary',
    status: 'PASS',
    evidenceRef: 'controlled://evidence/external-boundary-v1'
  }
] as const

function config() {
  return AgentConfigSchema.parse({
    persona: { name: 'Controlled Agent', role: 'assistant', tone: 'calm' },
    greeting: 'Resposta controlada.',
    promptBlocks: [],
    responseTemplates: { unknown: 'Vou encaminhar.' },
    model: {
      provider: 'fake',
      model: 'deterministic-v1',
      temperature: 0,
      maxTokens: 128,
      timeoutMs: 1000,
      retries: 0,
      secretRef: 'secret://controlled/fake'
    },
    policies: {
      version: 'policy-v1',
      minConfidence: 0.7,
      lowConfidence: 'handoff',
      maxClarifications: 2,
      enabledActions: ['respond'],
      approvalActions: [],
      blockedActions: []
    },
    plugins: [],
    knowledge: [],
    handoff: {
      lowConfidenceDestination: 'controlled-reception',
      destinations: ['controlled-reception'],
      maxClarifications: 2
    }
  })
}

describe('controlled release candidate evidence ledger', () => {
  it('requires exactly four bounded controlled gates and computes a stable digest', () => {
    const input = {
      agentId: 'agent_00000000-0000-4000-8000-000000000201',
      versionId: 'agent_version_00000000-0000-4000-8000-000000000201',
      gateResults
    }
    expect(ReleaseCandidateCreateInputSchema.parse(input)).toEqual(input)
    expect(
      computeReleaseCandidateEvidenceDigest({ tenantId: tenantA, ...input })
    ).toMatch(/^[a-f0-9]{64}$/)
    expect(
      computeReleaseCandidateEvidenceDigest({ tenantId: tenantA, ...input })
    ).toBe(
      computeReleaseCandidateEvidenceDigest({ tenantId: tenantA, ...input })
    )
    expect(() =>
      ReleaseCandidateCreateInputSchema.parse({
        ...input,
        gateResults: gateResults.slice(0, 3)
      })
    ).toThrow()
    expect(() =>
      ReleaseCandidateCreateInputSchema.parse({
        ...input,
        gateResults: gateResults.map((gate, index) =>
          index === 0
            ? { ...gate, evidenceRef: 'https://external.example/evidence' }
            : gate
        )
      })
    ).toThrow(/controlled|evidence/i)
    expect(() =>
      ReleaseCandidateCreateInputSchema.parse({
        ...input,
        gateResults: gateResults.map((gate, index) =>
          index === 0
            ? { ...gate, evidenceRef: 'controlled://evidence/token-secret' }
            : gate
        )
      })
    ).toThrow(/secret|evidence/i)
    expect(() =>
      ReleaseCandidateTransitionInputSchema.parse({
        target: 'VALIDATED',
        expectedStatus: 'DRAFT',
        ignored: true
      })
    ).toThrow()
  })

  it('evaluates every fixed gate-shape failure before validation', () => {
    expect(hasAllReleaseCandidateGatesPassed(gateResults)).toBe(true)
    expect(hasAllReleaseCandidateGatesPassed(gateResults.slice(0, 3))).toBe(
      false
    )
    expect(
      hasAllReleaseCandidateGatesPassed([
        ...gateResults.slice(0, 3),
        { ...gateResults[0] }
      ])
    ).toBe(false)
    expect(
      hasAllReleaseCandidateGatesPassed([
        ...gateResults.slice(0, 3),
        {
          ...gateResults[0],
          key: 'unknown_gate'
        } as never
      ])
    ).toBe(false)
    expect(
      hasAllReleaseCandidateGatesPassed(
        gateResults.map((gate, index) =>
          index === 0 ? { ...gate, status: 'FAIL' as const } : gate
        )
      )
    ).toBe(false)
  })

  it('binds the candidate to one tenant/version, keeps copies defensive and guards lifecycle', async () => {
    const store = new InMemoryControlPlaneStore()
    const agent = await store.createAgent(
      { tenantId: tenantA },
      {
        slug: 'controlled-candidate',
        name: 'Candidate',
        description: 'Fixture'
      }
    )
    const version = await store.createVersion(
      { tenantId: tenantA },
      agent.id,
      config(),
      'admin.release'
    )
    const candidate = await store.createReleaseCandidate(
      { tenantId: tenantA },
      {
        agentId: agent.id,
        versionId: version.id,
        gateResults: [...gateResults]
      },
      'admin.release'
    )

    expect(candidate).toMatchObject({
      tenantId: tenantA,
      agentId: agent.id,
      versionId: version.id,
      status: 'DRAFT',
      createdBy: 'admin.release',
      validatedBy: null,
      validatedAt: null
    })
    expect(candidate.evidenceDigest).toMatch(/^[a-f0-9]{64}$/)
    expect(candidate.gateResults).toHaveLength(4)
    expect(
      await store.listReleaseCandidates({ tenantId: tenantA }, agent.id)
    ).toHaveLength(1)
    await expect(
      store.getReleaseCandidate(
        { tenantId: tenantA },
        'release_candidate_00000000-0000-4000-8000-000000000299'
      )
    ).resolves.toBeNull()
    candidate.gateResults[0]!.evidenceRef = 'controlled://evidence/tampered'
    expect(
      (await store.getReleaseCandidate({ tenantId: tenantA }, candidate.id))
        ?.gateResults[0]?.evidenceRef
    ).toBe(gateResults[0].evidenceRef)

    await expect(
      store.createReleaseCandidate(
        { tenantId: tenantA },
        {
          agentId: agent.id,
          versionId: version.id,
          gateResults: [...gateResults]
        },
        'admin.release'
      )
    ).rejects.toMatchObject({ code: 'invalid_action' })

    await expect(
      store.transitionReleaseCandidate(
        { tenantId: tenantA },
        candidate.id,
        'VALIDATED',
        'admin.release',
        'DRAFT'
      )
    ).rejects.toMatchObject({ code: 'invalid_action' })

    const validated = await store.transitionReleaseCandidate(
      { tenantId: tenantA },
      candidate.id,
      'VALIDATED',
      'approver.release',
      'DRAFT'
    )
    expect(validated).toMatchObject({
      status: 'VALIDATED',
      validatedBy: 'approver.release'
    })
    expect(
      (await store.getVersion({ tenantId: tenantA }, version.id))?.status
    ).toBe('DRAFT')
    await expect(
      store.transitionReleaseCandidate(
        { tenantId: tenantA },
        candidate.id,
        'ARCHIVED',
        'admin.release',
        'DRAFT'
      )
    ).rejects.toMatchObject({ code: 'conflict' })
    await expect(
      store.transitionReleaseCandidate(
        { tenantId: tenantA },
        candidate.id,
        'ARCHIVED',
        'admin.release',
        'VALIDATED'
      )
    ).resolves.toMatchObject({ status: 'ARCHIVED' })
    await expect(
      store.getReleaseCandidate({ tenantId: tenantB }, candidate.id)
    ).resolves.toBeNull()
    await expect(
      store.listReleaseCandidates({ tenantId: tenantB })
    ).resolves.toEqual([])
  })

  it('refuses validation when any gate failed and rejects invalid binding', async () => {
    const store = new InMemoryControlPlaneStore()
    const agent = await store.createAgent(
      { tenantId: tenantA },
      {
        slug: 'failed-candidate',
        name: 'Failed Candidate',
        description: 'Fixture'
      }
    )
    const version = await store.createVersion(
      { tenantId: tenantA },
      agent.id,
      config(),
      'admin.release'
    )
    const failedGates = gateResults.map((gate, index) =>
      index === 2 ? { ...gate, status: 'FAIL' as const } : gate
    )
    const candidate = await store.createReleaseCandidate(
      { tenantId: tenantA },
      { agentId: agent.id, versionId: version.id, gateResults: failedGates },
      'admin.release'
    )
    await expect(
      store.transitionReleaseCandidate(
        { tenantId: tenantA },
        candidate.id,
        'VALIDATED',
        'approver.release',
        'DRAFT'
      )
    ).rejects.toMatchObject({ code: 'invalid_action' })
    await expect(
      store.transitionReleaseCandidate(
        { tenantId: tenantA },
        candidate.id,
        'REJECTED',
        'reviewer.release'
      )
    ).resolves.toMatchObject({ status: 'REJECTED' })
    await expect(
      store.transitionReleaseCandidate(
        { tenantId: tenantA },
        candidate.id,
        'ARCHIVED',
        'reviewer.release',
        'REJECTED'
      )
    ).resolves.toMatchObject({ status: 'ARCHIVED' })
    await expect(
      store.createReleaseCandidate(
        { tenantId: tenantA },
        {
          agentId: 'agent_00000000-0000-4000-8000-000000000299',
          versionId: version.id,
          gateResults: [...gateResults]
        },
        'admin.release'
      )
    ).rejects.toMatchObject({ code: 'invalid_action' })
  })

  it('refuses validation when the stored evidence digest was tampered with', async () => {
    const store = new InMemoryControlPlaneStore()
    const agent = await store.createAgent(
      { tenantId: tenantA },
      {
        slug: 'tampered-candidate',
        name: 'Tampered Candidate',
        description: 'Fixture'
      }
    )
    const version = await store.createVersion(
      { tenantId: tenantA },
      agent.id,
      config(),
      'admin.release'
    )
    const candidate = await store.createReleaseCandidate(
      { tenantId: tenantA },
      {
        agentId: agent.id,
        versionId: version.id,
        gateResults: [...gateResults]
      },
      'admin.release'
    )
    const internal = store as unknown as {
      releaseCandidates: ReleaseCandidateRecord[]
    }
    internal.releaseCandidates = internal.releaseCandidates.map((record) =>
      record.id === candidate.id
        ? { ...record, evidenceDigest: '0'.repeat(64) }
        : record
    )

    await expect(
      store.transitionReleaseCandidate(
        { tenantId: tenantA },
        candidate.id,
        'VALIDATED',
        'approver.release',
        'DRAFT'
      )
    ).rejects.toMatchObject({ code: 'invalid_action' })
    await expect(
      store.getReleaseCandidate({ tenantId: tenantA }, candidate.id)
    ).resolves.toMatchObject({
      status: 'DRAFT',
      validatedBy: null,
      validatedAt: null,
      evidenceDigest: '0'.repeat(64)
    })
  })
})
