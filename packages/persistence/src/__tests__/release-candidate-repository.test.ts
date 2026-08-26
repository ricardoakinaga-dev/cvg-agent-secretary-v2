import type { QueryResult, QueryResultRow } from 'pg'
import { describe, expect, it } from 'vitest'
import {
  AgentConfigSchema,
  type AgentVersionStatus,
  type ReleaseCandidateGateResult
} from '@cvg/platform'
import { PostgresControlPlaneRepository } from '../platform-control-plane-repository.ts'
import type { PostgresQueryable } from '../postgres.ts'

const tenantId = 'tenant_00000000-0000-4000-8000-000000000211'
const agentId = 'agent_00000000-0000-4000-8000-000000000211'
const versionId = 'agent_version_00000000-0000-4000-8000-000000000211'

const gates: ReleaseCandidateGateResult[] = [
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

const config = AgentConfigSchema.parse({
  persona: { name: 'DB Candidate', role: 'assistant', tone: 'calm' },
  greeting: 'Fixture controlada.',
  promptBlocks: [],
  responseTemplates: { unknown: 'Handoff controlado.' },
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
    maxClarifications: 1,
    enabledActions: ['respond'],
    approvalActions: [],
    blockedActions: []
  },
  plugins: [],
  knowledge: [],
  handoff: {
    lowConfidenceDestination: 'controlled-reception',
    destinations: ['controlled-reception'],
    maxClarifications: 1
  }
})

interface CandidateRow {
  tenant_id: string
  id: string
  agent_id: string
  version_id: string
  evidence_digest: string
  gate_results: unknown
  status: 'DRAFT' | 'VALIDATED' | 'REJECTED' | 'ARCHIVED'
  created_by: string
  validated_by: string | null
  created_at: Date
  updated_at: Date
  validated_at: Date | null
}

function rows<T extends QueryResultRow>(items: T[]): QueryResult<T> {
  return {
    command: 'SELECT',
    fields: [],
    oid: 0,
    rowCount: items.length,
    rows: items
  }
}

class ReleaseCandidateClient implements PostgresQueryable {
  readonly queries: string[] = []
  private candidates: CandidateRow[] = []

  tamperDigest(candidateId: string, evidenceDigest: string): void {
    this.candidates = this.candidates.map((candidate) =>
      candidate.id === candidateId
        ? { ...candidate, evidence_digest: evidenceDigest }
        : candidate
    )
  }

  tamperGateResults(candidateId: string, gateResults: unknown): void {
    this.candidates = this.candidates.map((candidate) =>
      candidate.id === candidateId
        ? { ...candidate, gate_results: gateResults }
        : candidate
    )
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values: unknown[] = []
  ): Promise<QueryResult<T>> {
    this.queries.push(text)
    if (/^(BEGIN|COMMIT|ROLLBACK)$/.test(text)) return rows<T>([])
    if (text.includes('FROM platform_agents')) {
      return rows<T>(
        values[1] === agentId
          ? ([
              {
                tenant_id: tenantId,
                id: agentId,
                slug: 'candidate-agent',
                name: 'Candidate Agent',
                description: 'Fixture',
                active_version_id: null,
                created_at: new Date(),
                updated_at: new Date()
              }
            ] as unknown as T[])
          : []
      )
    }
    if (text.includes('FROM platform_agent_versions')) {
      return rows<T>(
        values[1] === versionId
          ? ([
              {
                tenant_id: tenantId,
                id: versionId,
                agent_id: agentId,
                version: 1,
                status: 'DRAFT' as AgentVersionStatus,
                config,
                created_by: 'admin.release',
                created_at: new Date(),
                published_at: null
              }
            ] as unknown as T[])
          : []
      )
    }
    if (text.includes('INSERT INTO platform_release_candidates')) {
      this.candidates.push({
        tenant_id: String(values[0]),
        id: String(values[1]),
        agent_id: String(values[2]),
        version_id: String(values[3]),
        evidence_digest: String(values[4]),
        gate_results: JSON.parse(String(values[5])),
        status: values[6] as CandidateRow['status'],
        created_by: String(values[7]),
        validated_by: (values[8] as string | null) ?? null,
        created_at: values[9] as Date,
        updated_at: values[10] as Date,
        validated_at: (values[11] as Date | null) ?? null
      })
      return rows<T>([])
    }
    if (text.includes('FROM platform_release_candidates')) {
      const result = this.candidates.filter((candidate) => {
        if (candidate.tenant_id !== String(values[0])) return false
        if (text.includes('AND id = $2'))
          return candidate.id === String(values[1])
        return values[1] === null || candidate.agent_id === String(values[1])
      })
      return rows<T>(result as unknown as T[])
    }
    if (text.includes('UPDATE platform_release_candidates')) {
      const candidate = this.candidates.find(
        (item) =>
          item.tenant_id === String(values[0]) &&
          item.id === String(values[1]) &&
          item.status === values[6]
      )
      if (!candidate) return rows<T>([])
      candidate.status = values[2] as CandidateRow['status']
      candidate.validated_by = (values[3] as string | null) ?? null
      candidate.validated_at = (values[4] as Date | null) ?? null
      candidate.updated_at = values[5] as Date
      return rows<T>([candidate] as unknown as T[])
    }
    return rows<T>([])
  }
}

describe('Postgres release candidate evidence repository', () => {
  it('persists, reads and transitions an immutable tenant-scoped ledger', async () => {
    const client = new ReleaseCandidateClient()
    const repository = new PostgresControlPlaneRepository(client)
    const scope = { tenantId }
    const candidate = await repository.createReleaseCandidate(
      scope,
      { agentId, versionId, gateResults: [...gates] },
      'admin.release'
    )
    expect(candidate).toMatchObject({
      tenantId,
      agentId,
      versionId,
      status: 'DRAFT',
      validatedBy: null
    })
    expect(candidate.evidenceDigest).toMatch(/^[a-f0-9]{64}$/)
    expect(await repository.listReleaseCandidates(scope)).toHaveLength(1)
    await expect(
      repository.createReleaseCandidate(
        scope,
        { agentId, versionId, gateResults: [...gates] },
        'admin.release'
      )
    ).rejects.toMatchObject({ code: 'invalid_action' })

    client.tamperDigest(candidate.id, '0'.repeat(64))
    await expect(
      repository.transitionReleaseCandidate(
        scope,
        candidate.id,
        'VALIDATED',
        'approver.release',
        'DRAFT'
      )
    ).rejects.toMatchObject({ code: 'invalid_action' })
    await expect(
      repository.getReleaseCandidate(scope, candidate.id)
    ).resolves.toMatchObject({
      status: 'DRAFT',
      validatedBy: null,
      validatedAt: null,
      evidenceDigest: '0'.repeat(64)
    })
    client.tamperDigest(candidate.id, candidate.evidenceDigest)

    const validated = await repository.transitionReleaseCandidate(
      scope,
      candidate.id,
      'VALIDATED',
      'approver.release',
      'DRAFT'
    )
    expect(validated).toMatchObject({
      status: 'VALIDATED',
      validatedBy: 'approver.release'
    })
    await expect(
      repository.transitionReleaseCandidate(
        scope,
        candidate.id,
        'ARCHIVED',
        'admin.release',
        'DRAFT'
      )
    ).rejects.toMatchObject({ code: 'conflict' })
    expect(client.queries).toContain('BEGIN')
    expect(client.queries.some((query) => query.includes('FOR UPDATE'))).toBe(
      true
    )
  })

  it('rejects self-validation of a release candidate', async () => {
    const client = new ReleaseCandidateClient()
    const repository = new PostgresControlPlaneRepository(client)
    const scope = { tenantId }
    const candidate = await repository.createReleaseCandidate(
      scope,
      { agentId, versionId, gateResults: [...gates] },
      'admin.release'
    )

    await expect(
      repository.transitionReleaseCandidate(
        scope,
        candidate.id,
        'VALIDATED',
        'admin.release',
        'DRAFT'
      )
    ).rejects.toMatchObject({ code: 'invalid_action' })
    await expect(
      repository.getReleaseCandidate(scope, candidate.id)
    ).resolves.toMatchObject({ status: 'DRAFT', validatedBy: null })
  })

  it('fails closed when stored gate results are malformed', async () => {
    const client = new ReleaseCandidateClient()
    const repository = new PostgresControlPlaneRepository(client)
    const scope = { tenantId }
    const candidate = await repository.createReleaseCandidate(
      scope,
      { agentId, versionId, gateResults: [...gates] },
      'admin.release'
    )
    client.tamperGateResults(candidate.id, { corrupted: true })

    await expect(
      repository.getReleaseCandidate(scope, candidate.id)
    ).rejects.toMatchObject({ code: 'invalid_action' })
  })
})
