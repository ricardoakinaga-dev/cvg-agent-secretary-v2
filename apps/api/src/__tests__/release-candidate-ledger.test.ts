import { describe, expect, it } from 'vitest'
import { buildServer } from '../server.ts'

const tenantA = 'tenant_00000000-0000-0000-0000-000000000201'
const tenantB = 'tenant_00000000-0000-0000-0000-000000000202'

const headers = (tenantId: string) => ({
  'x-operator-id': 'admin.release',
  'x-operator-role': 'Admin',
  'x-tenant-id': tenantId
})

const config = {
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
]

interface Envelope<T> {
  success: boolean
  data: T | null
  error: { code: string; message: string } | null
}

describe('controlled release candidate evidence ledger API', () => {
  it('creates and validates a tenant-scoped attestation without mutating the version', async () => {
    const app = buildServer()
    const agentResponse = await app.inject({
      method: 'POST',
      url: '/v1/admin/agents',
      headers: headers(tenantA),
      payload: {
        slug: 'release-candidate-agent',
        name: 'Release Candidate Agent',
        description: 'Fixture'
      }
    })
    const agent = (agentResponse.json() as Envelope<{ id: string }>).data
    const versionResponse = await app.inject({
      method: 'POST',
      url: `/v1/admin/agents/${agent?.id}/versions`,
      headers: headers(tenantA),
      payload: { config }
    })
    const version = (versionResponse.json() as Envelope<{ id: string }>).data
    const created = await app.inject({
      method: 'POST',
      url: '/v1/admin/release-candidates',
      headers: headers(tenantA),
      payload: {
        agentId: agent?.id,
        versionId: version?.id,
        gateResults
      }
    })
    const candidate = (
      created.json() as Envelope<{ id: string; evidenceDigest: string }>
    ).data
    expect(created.statusCode).toBe(200)
    expect(candidate?.id).toMatch(/^release_candidate_/)
    expect(candidate?.evidenceDigest).toMatch(/^[a-f0-9]{64}$/)

    const selfValidation = await app.inject({
      method: 'POST',
      url: `/v1/admin/release-candidates/${candidate?.id}/transition`,
      headers: headers(tenantA),
      payload: { target: 'VALIDATED', expectedStatus: 'DRAFT' }
    })
    expect(selfValidation.statusCode).toBe(400)

    const validated = await app.inject({
      method: 'POST',
      url: `/v1/admin/release-candidates/${candidate?.id}/transition`,
      headers: { ...headers(tenantA), 'x-operator-id': 'approver.release' },
      payload: { target: 'VALIDATED', expectedStatus: 'DRAFT' }
    })
    expect(validated.statusCode).toBe(200)
    expect(
      (validated.json() as Envelope<{ status: string }>).data?.status
    ).toBe('VALIDATED')

    const stale = await app.inject({
      method: 'POST',
      url: `/v1/admin/release-candidates/${candidate?.id}/transition`,
      headers: headers(tenantA),
      payload: { target: 'ARCHIVED', expectedStatus: 'DRAFT' }
    })
    expect(stale.statusCode).toBe(409)

    const currentVersion = await app.inject({
      method: 'GET',
      url: `/v1/admin/agents/${agent?.id}/versions`,
      headers: headers(tenantA)
    })
    expect(
      (currentVersion.json() as Envelope<Array<{ status: string }>>).data?.[0]
        ?.status
    ).toBe('DRAFT')

    const scopedCandidates = await app.inject({
      method: 'GET',
      url: `/v1/admin/release-candidates?agentId=${agent?.id}`,
      headers: headers(tenantA)
    })

    const otherTenant = await app.inject({
      method: 'GET',
      url: '/v1/admin/release-candidates',
      headers: headers(tenantB)
    })
    expect(scopedCandidates.statusCode).toBe(200)
    expect((scopedCandidates.json() as Envelope<unknown[]>).data).toHaveLength(
      1
    )
    expect(otherTenant.statusCode).toBe(400)
    expect(JSON.stringify(validated.json())).not.toContain(
      'Resposta controlada'
    )
    await app.close()
  })

  it('does not validate a candidate with a failed gate and rejects unsafe refs', async () => {
    const app = buildServer()
    const agentResponse = await app.inject({
      method: 'POST',
      url: '/v1/admin/agents',
      headers: headers(tenantA),
      payload: {
        slug: 'failed-release-candidate-agent',
        name: 'Failed Release Candidate Agent',
        description: 'Fixture'
      }
    })
    const agent = (agentResponse.json() as Envelope<{ id: string }>).data
    const versionResponse = await app.inject({
      method: 'POST',
      url: `/v1/admin/agents/${agent?.id}/versions`,
      headers: headers(tenantA),
      payload: { config }
    })
    const version = (versionResponse.json() as Envelope<{ id: string }>).data
    const created = await app.inject({
      method: 'POST',
      url: '/v1/admin/release-candidates',
      headers: headers(tenantA),
      payload: {
        agentId: agent?.id,
        versionId: version?.id,
        gateResults: gateResults.map((gate, index) =>
          index === 0 ? { ...gate, status: 'FAIL' } : gate
        )
      }
    })
    const candidate = (created.json() as Envelope<{ id: string }>).data
    expect(created.statusCode).toBe(200)
    const rejectedValidation = await app.inject({
      method: 'POST',
      url: `/v1/admin/release-candidates/${candidate?.id}/transition`,
      headers: headers(tenantA),
      payload: { target: 'VALIDATED', expectedStatus: 'DRAFT' }
    })
    expect(rejectedValidation.statusCode).toBe(400)

    const unsafe = await app.inject({
      method: 'POST',
      url: '/v1/admin/release-candidates',
      headers: headers(tenantA),
      payload: {
        agentId: agent?.id,
        versionId: version?.id,
        gateResults: gateResults.map((gate, index) =>
          index === 1
            ? { ...gate, evidenceRef: 'https://external.example/evidence' }
            : gate
        )
      }
    })
    expect(unsafe.statusCode).toBe(400)
    await app.close()
  })
})
