import { describe, expect, it } from 'vitest'
import { buildServer } from '../server.ts'
import { AgentConfigSchema, InMemoryControlPlaneStore } from '@cvg/platform'

const tenantId = 'tenant_00000000-0000-0000-0000-000000000301'

const headers = {
  'x-operator-id': 'admin.authority',
  'x-operator-role': 'Admin',
  'x-tenant-id': tenantId
}

const config = {
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
}

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

interface Envelope<T> {
  success: boolean
  data: T | null
  error: { code: string; message: string } | null
}

async function createApprovedVersion(
  app: Awaited<ReturnType<typeof buildServer>>
) {
  const agentResponse = await app.inject({
    method: 'POST',
    url: '/v1/admin/agents',
    headers,
    payload: {
      slug: `authority-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: 'Authority Agent',
      description: 'Controlled authority fixture'
    }
  })
  const agent = (agentResponse.json() as Envelope<{ id: string }>).data
  const versionResponse = await app.inject({
    method: 'POST',
    url: `/v1/admin/agents/${agent?.id}/versions`,
    headers,
    payload: { config }
  })
  const version = (versionResponse.json() as Envelope<{ id: string }>).data
  for (const target of ['TESTING', 'APPROVED']) {
    await app.inject({
      method: 'POST',
      url: `/v1/admin/agents/${agent?.id}/versions/${version?.id}/transition`,
      headers,
      payload: { target }
    })
  }
  return { agentId: agent?.id as string, versionId: version?.id as string }
}

async function createValidatedCandidate(
  app: Awaited<ReturnType<typeof buildServer>>,
  agentId: string,
  versionId: string
) {
  const created = await app.inject({
    method: 'POST',
    url: '/v1/admin/release-candidates',
    headers,
    payload: { agentId, versionId, gateResults }
  })
  const candidate = (created.json() as Envelope<{ id: string }>).data
  const validated = await app.inject({
    method: 'POST',
    url: `/v1/admin/release-candidates/${candidate?.id}/transition`,
    headers: { ...headers, 'x-operator-id': 'approver.authority' },
    payload: { target: 'VALIDATED', expectedStatus: 'DRAFT' }
  })
  expect(created.statusCode).toBe(200)
  expect(validated.statusCode).toBe(200)
  return candidate?.id as string
}

describe('publish evidence authority API', () => {
  it('rejects publish and rollback without a release candidate before mutation', async () => {
    const app = buildServer()
    const { agentId, versionId } = await createApprovedVersion(app)

    const publish = await app.inject({
      method: 'POST',
      url: `/v1/admin/agents/${agentId}/versions/${versionId}/publish`,
      headers,
      payload: {}
    })
    const rollback = await app.inject({
      method: 'POST',
      url: `/v1/admin/agents/${agentId}/rollback`,
      headers,
      payload: { versionId }
    })
    const versions = await app.inject({
      method: 'GET',
      url: `/v1/admin/agents/${agentId}/versions`,
      headers
    })

    expect(publish.statusCode).toBe(400)
    expect(rollback.statusCode).toBe(400)
    expect(
      (versions.json() as Envelope<Array<{ id: string; status: string }>>).data
    ).toEqual([expect.objectContaining({ id: versionId, status: 'APPROVED' })])
    await app.close()
  })

  it('publishes and rolls back only with a validated candidate for the exact source version', async () => {
    const app = buildServer()
    const { agentId, versionId } = await createApprovedVersion(app)
    const releaseCandidateId = await createValidatedCandidate(
      app,
      agentId,
      versionId
    )

    const publish = await app.inject({
      method: 'POST',
      url: `/v1/admin/agents/${agentId}/versions/${versionId}/publish`,
      headers,
      payload: { releaseCandidateId, expectedStatus: 'APPROVED' }
    })
    const rollback = await app.inject({
      method: 'POST',
      url: `/v1/admin/agents/${agentId}/rollback`,
      headers,
      payload: { versionId, releaseCandidateId, expectedStatus: 'PUBLISHED' }
    })

    expect(publish.statusCode).toBe(200)
    expect((publish.json() as Envelope<{ status: string }>).data?.status).toBe(
      'PUBLISHED'
    )
    expect(rollback.statusCode).toBe(200)
    expect((rollback.json() as Envelope<{ status: string }>).data?.status).toBe(
      'PUBLISHED'
    )
    await app.close()
  })

  it('rejects HTTP publish when persisted validation is self-attested', async () => {
    const store = new InMemoryControlPlaneStore()
    const { scope, agent, approved } =
      await createApprovedVersionFromStore(store)
    const candidate = await createValidatedCandidateFromStore(
      store,
      agent.id,
      approved.id
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

    const app = buildServer({ platform: store })
    const publish = await app.inject({
      method: 'POST',
      url: `/v1/admin/agents/${agent.id}/versions/${approved.id}/publish`,
      headers,
      payload: {
        releaseCandidateId: candidate.id,
        expectedStatus: 'APPROVED'
      }
    })

    expect(publish.statusCode).toBe(400)
    await expect(store.getVersion(scope, approved.id)).resolves.toMatchObject({
      status: 'APPROVED'
    })
    await app.close()
  })
})

async function createApprovedVersionFromStore(
  store: InMemoryControlPlaneStore
) {
  const scope = { tenantId }
  const agent = await store.createAgent(scope, {
    slug: `authority-store-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: 'Authority Store Agent',
    description: 'Controlled authority fixture'
  })
  const draft = await store.createVersion(
    scope,
    agent.id,
    AgentConfigSchema.parse(config),
    'test.authority'
  )
  const testing = await store.transitionVersion(scope, draft.id, 'TESTING')
  const approved = await store.transitionVersion(scope, testing.id, 'APPROVED')
  return { scope, agent, approved }
}

async function createValidatedCandidateFromStore(
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
