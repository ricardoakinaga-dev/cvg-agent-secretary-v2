import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient, type OperatorIdentity } from './client.ts'

const identity: OperatorIdentity & { tenantId: string } = {
  operatorId: 'admin.release',
  role: 'Admin',
  tenantId: 'tenant_00000000-0000-0000-0000-000000000231'
}

const gates = [
  {
    key: 'safety_preflight' as const,
    status: 'PASS' as const,
    evidenceRef: 'controlled://evidence/safety-preflight-v1'
  },
  {
    key: 'test_lab_regression' as const,
    status: 'PASS' as const,
    evidenceRef: 'controlled://evidence/test-lab-regression-v1'
  },
  {
    key: 'snapshot_integrity' as const,
    status: 'PASS' as const,
    evidenceRef: 'controlled://evidence/snapshot-integrity-v1'
  },
  {
    key: 'external_boundary' as const,
    status: 'PASS' as const,
    evidenceRef: 'controlled://evidence/external-boundary-v1'
  }
]

const envelope = <T>(data: T) =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ success: true, data, error: null })
  } as Response)

afterEach(() => vi.restoreAllMocks())

describe('release candidate evidence client', () => {
  it('refuses unscoped suite and release-candidate reads', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => envelope([]))

    await expect(
      apiClient.listPlatformTestSuites(identity, ' ')
    ).rejects.toThrow(/agentId is required/)
    await expect(
      apiClient.listPlatformReleaseCandidates(identity, '')
    ).rejects.toThrow(/agentId is required/)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('redacts every trace text field before exposing the payload to the UI', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      envelope({
        items: [
          {
            traceId: 'trace_00000000-0000-0000-0000-000000000231',
            agentId: 'agent_00000000-0000-0000-0000-000000000231',
            versionId: 'agent_version_00000000-0000-0000-0000-000000000231',
            configVersion: 'v1',
            executionMode: 'TEST_LAB',
            intent: { name: 'intent alice@example.com', confidence: 0.5 },
            risk: { level: 'medium', reason: 'risk alice@example.com' },
            policy: [
              { decision: 'handoff', reason: 'policy alice@example.com' }
            ],
            knowledge: { status: 'not_requested' },
            tools: [],
            handoff: {
              requested: true,
              reason: 'handoff alice@example.com',
              state: 'HANDOFF_REQUESTED'
            },
            response: { text: 'response alice@example.com', mode: 'handoff' },
            outputPolicy: {
              decision: 'rewritten',
              reason: 'output alice@example.com',
              mode: 'handoff',
              redacted: true
            },
            provider: {
              provider: 'fake',
              model: 'deterministic-v1',
              externalCall: false
            }
          }
        ],
        pageInfo: { limit: 10, offset: 0, total: 1, hasNextPage: false }
      })
    )

    const [trace] = await apiClient.listPlatformExecutionTraces(identity)
    expect(trace?.intent.name).toBe('intent [redacted-email]')
    expect(trace?.risk?.reason).toBe('risk [redacted-email]')
    expect(trace?.policy[0]?.reason).toBe('policy [redacted-email]')
    expect(trace?.handoff.reason).toBe('handoff [redacted-email]')
    expect(trace?.response.text).toBe('response [redacted-email]')
    expect(trace?.outputPolicy?.reason).toBe('output [redacted-email]')
  })

  it('sends only bounded evidence metadata with tenant identity and expected status', async () => {
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = []
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      calls.push([input, init])
      return envelope([])
    })
    await apiClient.listPlatformReleaseCandidates(
      identity,
      'agent_00000000-0000-0000-0000-000000000231'
    )
    await apiClient.createPlatformReleaseCandidate({
      identity,
      agentId: 'agent_00000000-0000-0000-0000-000000000231',
      versionId: 'agent_version_00000000-0000-0000-0000-000000000231',
      gateResults: gates
    })
    await apiClient.transitionPlatformReleaseCandidate({
      identity,
      candidateId: 'release_candidate_00000000-0000-0000-0000-000000000231',
      target: 'VALIDATED',
      expectedStatus: 'DRAFT'
    })
    expect(calls[0]?.[0]).toBe(
      '/v1/admin/release-candidates?agentId=agent_00000000-0000-0000-0000-000000000231'
    )
    for (const [, init] of calls) {
      expect(init?.headers).toMatchObject({
        'x-operator-id': identity.operatorId,
        'x-operator-role': identity.role,
        'x-tenant-id': identity.tenantId
      })
    }
    const createBody = JSON.parse(String(calls[1]?.[1]?.body)) as Record<
      string,
      unknown
    >
    expect(createBody).toEqual({
      agentId: 'agent_00000000-0000-0000-0000-000000000231',
      versionId: 'agent_version_00000000-0000-0000-0000-000000000231',
      gateResults: gates
    })
    expect(JSON.stringify(createBody)).not.toMatch(
      /https?:\/\/|secret|token|payload|content/i
    )
    expect(JSON.parse(String(calls[2]?.[1]?.body))).toEqual({
      target: 'VALIDATED',
      expectedStatus: 'DRAFT'
    })
  })
})
