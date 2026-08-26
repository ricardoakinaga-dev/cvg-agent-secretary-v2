import { describe, expect, it } from 'vitest'
import { AgentConfigSchema, InMemoryControlPlaneStore } from '../index.ts'

const tenantId = 'tenant_00000000-0000-4000-8000-000000000301'

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
    persona: { name: 'Authority Agent', role: 'assistant', tone: 'calm' },
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

async function approvedVersion(store: InMemoryControlPlaneStore) {
  const scope = { tenantId }
  const agent = await store.createAgent(scope, {
    slug: `authority-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: 'Authority Agent',
    description: 'Controlled authority fixture'
  })
  const draft = await store.createVersion(
    scope,
    agent.id,
    config(),
    'test.authority'
  )
  const testing = await store.transitionVersion(scope, draft.id, 'TESTING')
  const approved = await store.transitionVersion(scope, testing.id, 'APPROVED')
  return { scope, agent, approved }
}

async function validatedCandidate(
  store: InMemoryControlPlaneStore,
  agentId: string,
  versionId: string
) {
  const candidate = await store.createReleaseCandidate(
    { tenantId },
    {
      agentId: agentId as never,
      versionId: versionId as never,
      gateResults: [...gateResults]
    },
    'test.authority'
  )
  return store.transitionReleaseCandidate(
    { tenantId },
    candidate.id,
    'VALIDATED',
    'test.approver',
    'DRAFT'
  )
}

describe('controlled publish evidence authority', () => {
  it('rejects publish without evidence and accepts only the validated candidate', async () => {
    const store = new InMemoryControlPlaneStore()
    const { scope, agent, approved } = await approvedVersion(store)

    await expect(
      store.publishVersion(scope, approved.id, undefined as never)
    ).rejects.toMatchObject({ code: 'invalid_action' })
    await expect(store.getVersion(scope, approved.id)).resolves.toMatchObject({
      status: 'APPROVED'
    })

    const candidate = await validatedCandidate(store, agent.id, approved.id)
    await expect(
      store.publishVersion(scope, approved.id, candidate.id)
    ).resolves.toMatchObject({ status: 'PUBLISHED' })
  })

  it('rejects rollback without evidence bound to the source version', async () => {
    const store = new InMemoryControlPlaneStore()
    const { scope, agent, approved } = await approvedVersion(store)

    await expect(
      store.rollback(
        scope,
        agent.id,
        approved.id,
        'test.authority',
        undefined as never
      )
    ).rejects.toMatchObject({ code: 'invalid_action' })
    await expect(store.getVersion(scope, approved.id)).resolves.toMatchObject({
      status: 'APPROVED'
    })
  })

  it('rejects a draft, mismatched, or tampered candidate without mutating versions', async () => {
    const store = new InMemoryControlPlaneStore()
    const first = await approvedVersion(store)
    const second = await approvedVersion(store)
    const draftCandidate = await store.createReleaseCandidate(
      first.scope,
      {
        agentId: first.agent.id,
        versionId: first.approved.id,
        gateResults: [...gateResults]
      },
      'test.authority'
    )

    await expect(
      store.publishVersion(first.scope, first.approved.id, draftCandidate.id)
    ).rejects.toMatchObject({ code: 'invalid_action' })

    const secondCandidate = await validatedCandidate(
      store,
      second.agent.id,
      second.approved.id
    )
    await expect(
      store.publishVersion(first.scope, first.approved.id, secondCandidate.id)
    ).rejects.toMatchObject({ code: 'invalid_action' })

    const firstCandidate = await store.transitionReleaseCandidate(
      first.scope,
      draftCandidate.id,
      'VALIDATED',
      'test.approver',
      'DRAFT'
    )
    const records = (
      store as unknown as {
        releaseCandidates: Array<{ id: string; evidenceDigest: string }>
      }
    ).releaseCandidates
    const stored = records.find(
      (candidate) => candidate.id === firstCandidate.id
    )
    if (!stored) throw new Error('stored release candidate missing')
    stored.evidenceDigest = '0'.repeat(64)

    await expect(
      store.publishVersion(first.scope, first.approved.id, firstCandidate.id)
    ).rejects.toMatchObject({ code: 'invalid_action' })
    await expect(
      store.getVersion(first.scope, first.approved.id)
    ).resolves.toMatchObject({ status: 'APPROVED' })
  })

  it('rejects a persisted self-attested candidate from publish authority', async () => {
    const store = new InMemoryControlPlaneStore()
    const first = await approvedVersion(store)
    const candidate = await validatedCandidate(
      store,
      first.agent.id,
      first.approved.id
    )
    const records = (
      store as unknown as {
        releaseCandidates: Array<{
          id: string
          createdBy: string
          validatedBy: string | null
        }>
      }
    ).releaseCandidates
    const stored = records.find((record) => record.id === candidate.id)
    if (!stored) throw new Error('stored release candidate missing')
    stored.validatedBy = stored.createdBy

    await expect(
      store.publishVersion(first.scope, first.approved.id, candidate.id)
    ).rejects.toMatchObject({ code: 'invalid_action' })
    await expect(
      store.getVersion(first.scope, first.approved.id)
    ).resolves.toMatchObject({ status: 'APPROVED' })
  })
})
