import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { AgentConfigSchema, TestLabCaseSchema } from '../contracts.ts'
import { InMemoryControlPlaneStore } from '../control-plane-store.ts'
import {
  createTraceId,
  createTestSuiteRunId,
  type AgentId,
  type TenantId
} from '../ids.ts'
import {
  sanitizeTestSuiteRunTraces,
  sanitizeTraceForPersistence
} from '../trace-governance.ts'
import type { TestRunTrace, TestSuiteRunRecord } from '../contracts.ts'
import {
  createControlledTraceTiming,
  executeConfiguredAgent,
  runTestLab
} from '../test-lab.ts'
import {
  CapabilityGateway,
  PluginRegistry,
  type CapabilityExecutionInput,
  type RegisteredPlugin
} from '../plugin-gateway.ts'
import { InMemoryCapabilityApprovalAuthority } from '../approval-authority.ts'

const TENANT = 'tenant_00000000-0000-4000-8000-000000000911' as TenantId
const OTHER_TENANT = 'tenant_00000000-0000-4000-8000-000000000912' as TenantId

function agentConfig() {
  return AgentConfigSchema.parse({
    persona: { name: 'Branches B Agent', role: 'assistant', tone: 'calm' },
    greeting: 'Controlled greeting.',
    promptBlocks: [],
    responseTemplates: { unknown: 'Controlled unknown.' },
    model: {
      provider: 'fake',
      model: 'deterministic-v1',
      temperature: 0,
      maxTokens: 128,
      timeoutMs: 1000,
      retries: 0,
      secretRef: 'secret://controlled/branches-b'
    },
    policies: {
      version: 'branches-b-v1',
      minConfidence: 0.7,
      lowConfidence: 'clarify',
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
}

const KNOWLEDGE_INPUT = {
  source: 'controlled://branches-b-hours',
  version: 'v1',
  label: 'Branches B fixture',
  description: 'Fixture metadata without document content.'
}

const GATE_RESULTS = [
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

function pluginManifest(version = '1.0.0') {
  return {
    name: 'branches.calendar',
    version,
    capabilities: ['calendar.read'],
    permissions: ['scheduling:read'],
    tools: [
      {
        name: 'calendar.read',
        permission: 'scheduling:read',
        risk: 'low' as const,
        requiresApproval: false
      }
    ],
    hooks: [],
    dependencies: [],
    configSchemaVersion: 'v1'
  }
}

function validTrace(): TestRunTrace {
  const startedAt = new Date('2026-09-01T09:00:00.000Z')
  const completedAt = new Date('2026-09-01T09:00:01.000Z')
  return {
    traceId: createTraceId(),
    tenantId: TENANT,
    agentId: 'agent_00000000-0000-4000-8000-000000000911' as AgentId,
    versionId: 'agent_version_00000000-0000-4000-8000-000000000911' as never,
    input: { message: 'Hello fixture', historySize: 0 },
    intent: { name: 'unknown', confidence: 0.32 },
    policy: [],
    knowledge: { status: 'not_requested' },
    tools: [],
    handoff: { requested: false, reason: null, state: 'BOT_ACTIVE' },
    response: { text: 'Controlled answer.', mode: 'answer' },
    outputPolicy: {
      decision: 'allowed',
      reason: 'output_allowed',
      mode: 'answer',
      redacted: false
    },
    provider: {
      provider: 'fake',
      model: 'deterministic-v1',
      externalCall: false
    },
    prompt: { version: 'prompt-v1', blockIds: ['safety'] },
    configVersion: 'config-v1',
    executionMode: 'TEST_LAB',
    status: 'completed',
    startedAt,
    completedAt,
    latencyMs: 1000,
    tokenUsage: { prompt: 4, completion: 3, total: 7, estimated: true },
    spans: [{ name: 'model', status: 'completed', durationMs: 1 }],
    createdAt: completedAt
  }
}

describe('control plane store branches without database', () => {
  it('enforces agent slug uniqueness and tenant isolation', async () => {
    const store = new InMemoryControlPlaneStore()
    const agent = await store.createAgent(
      { tenantId: TENANT },
      { slug: 'branches-b-agent', name: 'Branches B', description: 'Fixture' }
    )
    await expect(
      store.createAgent(
        { tenantId: TENANT },
        { slug: 'branches-b-agent', name: 'Duplicate', description: 'Fixture' }
      )
    ).rejects.toMatchObject({ code: 'invalid_action' })
    expect(await store.getAgent({ tenantId: TENANT }, agent.id)).toMatchObject({
      id: agent.id
    })
    expect(
      await store.getAgent({ tenantId: OTHER_TENANT }, agent.id)
    ).toBeNull()
    expect(await store.listAgents({ tenantId: OTHER_TENANT })).toEqual([])
    expect(await store.listAgents({ tenantId: TENANT })).toHaveLength(1)
  })

  it('rejects invalid actors and guards version transitions', async () => {
    const store = new InMemoryControlPlaneStore()
    const agent = await store.createAgent(
      { tenantId: TENANT },
      { slug: 'version-agent', name: 'Version Agent', description: 'Fixture' }
    )
    await expect(
      store.createVersion({ tenantId: TENANT }, agent.id, agentConfig(), 'x')
    ).rejects.toMatchObject({ code: 'validation_failed' })
    const version = await store.createVersion(
      { tenantId: TENANT },
      agent.id,
      agentConfig(),
      'admin.branches-b'
    )
    expect(
      await store.getVersion({ tenantId: TENANT }, version.id)
    ).toMatchObject({
      id: version.id
    })
    expect(
      await store.getVersion({ tenantId: OTHER_TENANT }, version.id)
    ).toBeNull()
    expect(
      await store.listVersions({ tenantId: TENANT }, agent.id)
    ).toHaveLength(1)
    await expect(
      store.listVersions({ tenantId: OTHER_TENANT }, agent.id)
    ).rejects.toMatchObject({ code: 'forbidden' })

    const testing = await store.transitionVersion(
      { tenantId: TENANT },
      version.id,
      'TESTING'
    )
    expect(testing.status).toBe('TESTING')
    await expect(
      store.transitionVersion({ tenantId: TENANT }, version.id, 'PUBLISHED')
    ).rejects.toMatchObject({ code: 'invalid_action' })
    await expect(
      store.transitionVersion(
        { tenantId: TENANT },
        version.id,
        'APPROVED',
        'DRAFT'
      )
    ).rejects.toMatchObject({ code: 'conflict' })
    const approved = await store.transitionVersion(
      { tenantId: TENANT },
      version.id,
      'APPROVED',
      'TESTING'
    )
    expect(approved.status).toBe('APPROVED')
  })

  it('requires release authority for publish and rollback branches', async () => {
    const store = new InMemoryControlPlaneStore()
    const agent = await store.createAgent(
      { tenantId: TENANT },
      { slug: 'publish-agent', name: 'Publish Agent', description: 'Fixture' }
    )
    const version = await store.createVersion(
      { tenantId: TENANT },
      agent.id,
      agentConfig(),
      'admin.branches-b'
    )
    await store.transitionVersion({ tenantId: TENANT }, version.id, 'TESTING')
    await store.transitionVersion({ tenantId: TENANT }, version.id, 'APPROVED')
    await expect(
      store.publishVersion(
        { tenantId: TENANT },
        version.id,
        'release_candidate_00000000-0000-4000-8000-000000000911'
      )
    ).rejects.toMatchObject({ code: 'invalid_action' })

    const candidate = await store.createReleaseCandidate(
      { tenantId: TENANT },
      {
        agentId: agent.id,
        versionId: version.id,
        gateResults: [...GATE_RESULTS]
      },
      'admin.branches-b'
    )
    await store.transitionReleaseCandidate(
      { tenantId: TENANT },
      candidate.id,
      'VALIDATED',
      'approver.branches-b',
      'DRAFT'
    )
    const published = await store.publishVersion(
      { tenantId: TENANT },
      version.id,
      candidate.id
    )
    expect(published.status).toBe('PUBLISHED')
    expect(
      await store.resolvePublished({ tenantId: TENANT }, agent.id)
    ).toMatchObject({ id: published.id })

    const otherAgent = await store.createAgent(
      { tenantId: TENANT },
      { slug: 'other-agent', name: 'Other', description: 'Fixture' }
    )
    await expect(
      store.rollback(
        { tenantId: TENANT },
        otherAgent.id,
        version.id,
        'admin.branches-b',
        candidate.id
      )
    ).rejects.toMatchObject({ code: 'invalid_action' })

    const draft = await store.createVersion(
      { tenantId: TENANT },
      agent.id,
      agentConfig(),
      'admin.branches-b'
    )
    await expect(
      store.rollback(
        { tenantId: TENANT },
        agent.id,
        draft.id,
        'admin.branches-b',
        candidate.id
      )
    ).rejects.toMatchObject({ code: 'invalid_action' })

    const rolled = await store.rollback(
      { tenantId: TENANT },
      agent.id,
      published.id,
      'admin.branches-b',
      candidate.id
    )
    expect(rolled.status).toBe('PUBLISHED')
  })

  it('guards knowledge source lifecycle branches', async () => {
    const store = new InMemoryControlPlaneStore()
    const created = await store.createKnowledgeSource(
      { tenantId: TENANT },
      KNOWLEDGE_INPUT,
      'admin.branches-b'
    )
    await expect(
      store.createKnowledgeSource(
        { tenantId: TENANT },
        KNOWLEDGE_INPUT,
        'admin.branches-b'
      )
    ).rejects.toMatchObject({ code: 'invalid_action' })
    expect(
      await store.getKnowledgeSource({ tenantId: OTHER_TENANT }, created.id)
    ).toBeNull()
    expect(await store.listKnowledgeSources({ tenantId: TENANT })).toHaveLength(
      1
    )
    await expect(
      store.transitionKnowledgeSource(
        { tenantId: TENANT },
        'knowledge_source_00000000-0000-4000-8000-000000000911',
        'APPROVED',
        'admin.branches-b'
      )
    ).rejects.toMatchObject({ code: 'invalid_action' })
    await expect(
      store.transitionKnowledgeSource(
        { tenantId: TENANT },
        created.id,
        'ARCHIVED',
        'admin.branches-b',
        'APPROVED'
      )
    ).rejects.toMatchObject({ code: 'conflict' })
    await expect(
      store.transitionKnowledgeSource(
        { tenantId: TENANT },
        created.id,
        'APPROVED',
        'admin.branches-b',
        'ARCHIVED'
      )
    ).rejects.toMatchObject({ code: 'conflict' })
    const approved = await store.transitionKnowledgeSource(
      { tenantId: TENANT },
      created.id,
      'APPROVED',
      'approver.branches-b'
    )
    expect(approved.approvedBy).toBe('approver.branches-b')
  })

  it('guards release candidate lifecycle branches', async () => {
    const store = new InMemoryControlPlaneStore()
    const agent = await store.createAgent(
      { tenantId: TENANT },
      { slug: 'rc-agent', name: 'RC Agent', description: 'Fixture' }
    )
    const version = await store.createVersion(
      { tenantId: TENANT },
      agent.id,
      agentConfig(),
      'admin.branches-b'
    )
    const candidate = await store.createReleaseCandidate(
      { tenantId: TENANT },
      {
        agentId: agent.id,
        versionId: version.id,
        gateResults: [...GATE_RESULTS]
      },
      'admin.branches-b'
    )
    await expect(
      store.createReleaseCandidate(
        { tenantId: TENANT },
        {
          agentId: agent.id,
          versionId: version.id,
          gateResults: [...GATE_RESULTS]
        },
        'admin.branches-b'
      )
    ).rejects.toMatchObject({ code: 'invalid_action' })
    expect(
      await store.getReleaseCandidate({ tenantId: OTHER_TENANT }, candidate.id)
    ).toBeNull()
    expect(
      await store.listReleaseCandidates({ tenantId: TENANT }, agent.id)
    ).toHaveLength(1)
    await expect(
      store.transitionReleaseCandidate(
        { tenantId: TENANT },
        'release_candidate_00000000-0000-4000-8000-000000000911',
        'ARCHIVED',
        'admin.branches-b'
      )
    ).rejects.toMatchObject({ code: 'invalid_action' })
    await expect(
      store.transitionReleaseCandidate(
        { tenantId: TENANT },
        candidate.id,
        'ARCHIVED',
        'admin.branches-b',
        'VALIDATED'
      )
    ).rejects.toMatchObject({ code: 'conflict' })
    const rejected = await store.transitionReleaseCandidate(
      { tenantId: TENANT },
      candidate.id,
      'REJECTED',
      'reviewer.branches-b'
    )
    expect(rejected.status).toBe('REJECTED')
    await expect(
      store.transitionReleaseCandidate(
        { tenantId: TENANT },
        candidate.id,
        'VALIDATED',
        'approver.branches-b'
      )
    ).rejects.toMatchObject({ code: 'invalid_action' })
  })

  it('guards plugin catalog branches and version ordering', async () => {
    const store = new InMemoryControlPlaneStore()
    const scope = { tenantId: TENANT }
    const draft = await store.createPluginCatalogEntry(
      scope,
      { manifest: pluginManifest('1.0.0') },
      'admin.branches-b'
    )
    await expect(
      store.createPluginCatalogEntry(
        scope,
        { manifest: pluginManifest('1.0.0') },
        'admin.branches-b'
      )
    ).rejects.toMatchObject({ code: 'invalid_action' })
    expect(await store.getPluginCatalogEntry(scope, draft.id)).toMatchObject({
      id: draft.id
    })
    expect(
      await store.getPluginCatalogEntry(
        scope,
        'plugin_catalog_00000000-0000-4000-8000-000000000911'
      )
    ).toBeNull()
    await expect(
      store.listPluginCatalogEntries(scope, '   ')
    ).rejects.toMatchObject({ code: 'validation_failed' })
    await expect(
      store.transitionPluginCatalogEntry(
        scope,
        'plugin_catalog_00000000-0000-4000-8000-000000000911',
        'ARCHIVED',
        'admin.branches-b'
      )
    ).rejects.toMatchObject({ code: 'invalid_action' })
    await expect(
      store.transitionPluginCatalogEntry(
        scope,
        draft.id,
        'ARCHIVED',
        'admin.branches-b',
        'APPROVED'
      )
    ).rejects.toMatchObject({ code: 'conflict' })
    await store.transitionPluginCatalogEntry(
      scope,
      draft.id,
      'APPROVED',
      'approver.branches-b'
    )
    expect(
      await store.resolveApprovedPlugin(scope, 'branches.calendar', '1.0.0')
    ).toMatchObject({ version: '1.0.0' })
    expect(
      await store.resolveApprovedPlugin(scope, 'branches.calendar', '9.9.9')
    ).toBeNull()
    await expect(
      store.resolveApprovedPlugin(scope, '   ')
    ).rejects.toMatchObject({ code: 'validation_failed' })

    const numeric = await store.createPluginCatalogEntry(
      scope,
      { manifest: pluginManifest('1.0.1') },
      'admin.branches-b'
    )
    await store.transitionPluginCatalogEntry(
      scope,
      numeric.id,
      'APPROVED',
      'approver.branches-b'
    )
    expect(
      (await store.resolveApprovedPlugin(scope, 'branches.calendar'))?.version
    ).toBe('1.0.1')

    const opaque = await store.createPluginCatalogEntry(
      scope,
      { manifest: pluginManifest('beta') },
      'admin.branches-b'
    )
    await store.transitionPluginCatalogEntry(
      scope,
      opaque.id,
      'APPROVED',
      'approver.branches-b'
    )
    expect(
      await store.resolveApprovedPlugin(scope, 'branches.calendar')
    ).toBeDefined()
  })

  it('validates trace persistence scope and limits without database', async () => {
    const store = new InMemoryControlPlaneStore()
    const agent = await store.createAgent(
      { tenantId: TENANT },
      { slug: 'trace-agent', name: 'Trace Agent', description: 'Fixture' }
    )
    const version = await store.createVersion(
      { tenantId: TENANT },
      agent.id,
      agentConfig(),
      'admin.branches-b'
    )
    const base = validTrace()
    const trace = {
      ...base,
      agentId: agent.id,
      versionId: version.id
    }
    const stored = await store.recordTestRun({ tenantId: TENANT }, trace)
    expect(stored.traceId).toBe(trace.traceId)
    await expect(
      store.recordTestRun({ tenantId: OTHER_TENANT }, trace)
    ).rejects.toMatchObject({ code: 'forbidden' })
    await expect(
      store.recordTestRun(
        { tenantId: TENANT },
        {
          ...trace,
          agentId: 'agent_00000000-0000-4000-8000-000000000912' as AgentId
        }
      )
    ).rejects.toMatchObject({ code: 'invalid_action' })

    const execution = await store.recordExecutionTrace(
      { tenantId: TENANT },
      trace
    )
    expect(execution.traceId).toBe(trace.traceId)
    await expect(
      store.recordExecutionTrace({ tenantId: OTHER_TENANT }, trace)
    ).rejects.toMatchObject({ code: 'forbidden' })

    expect(await store.listTestRuns({ tenantId: TENANT }, 0)).toHaveLength(1)
    expect(await store.listTestRuns({ tenantId: TENANT }, 1000)).toHaveLength(1)
    expect(
      await store.listExecutionTraces({ tenantId: TENANT }, 0)
    ).toHaveLength(1)
    expect(await store.listTestRuns({ tenantId: OTHER_TENANT })).toEqual([])
  })

  it('validates suite run scope branches without database', async () => {
    const store = new InMemoryControlPlaneStore()
    const agent = await store.createAgent(
      { tenantId: TENANT },
      { slug: 'suite-agent', name: 'Suite Agent', description: 'Fixture' }
    )
    const version = await store.createVersion(
      { tenantId: TENANT },
      agent.id,
      agentConfig(),
      'admin.branches-b'
    )
    const testCase = TestLabCaseSchema.parse({
      id: 'case-1',
      message: 'Hello',
      expectedResponseMode: 'clarify',
      expectedHandoff: false
    })
    const suite = await store.createTestSuite(
      { tenantId: TENANT },
      {
        slug: 'branches-suite',
        name: 'Branches Suite',
        description: 'Fixture',
        agentId: agent.id,
        versionId: version.id,
        cases: [testCase]
      },
      'admin.branches-b'
    )
    await expect(
      store.createTestSuite(
        { tenantId: TENANT },
        {
          slug: 'branches-suite',
          name: 'Duplicate',
          description: 'Fixture',
          agentId: agent.id,
          versionId: version.id,
          cases: [testCase]
        },
        'admin.branches-b'
      )
    ).rejects.toMatchObject({ code: 'invalid_action' })
    expect(
      await store.getTestSuite({ tenantId: OTHER_TENANT }, suite.id)
    ).toBeNull()
    expect(await store.listTestSuites({ tenantId: OTHER_TENANT })).toEqual([])
    await expect(
      store.listTestSuites(
        { tenantId: TENANT },
        'agent_00000000-0000-4000-8000-000000000912' as AgentId
      )
    ).rejects.toMatchObject({ code: 'invalid_action' })

    const clone = await store.cloneTestSuite(
      { tenantId: TENANT },
      suite.id,
      {},
      'admin.branches-b'
    )
    expect(clone.version).toBe(2)
    expect(clone.previousSuiteId).toBe(suite.id)

    const evaluated = await store.listTestSuiteRuns(
      { tenantId: TENANT },
      suite.id,
      0
    )
    expect(evaluated).toEqual([])

    const trace = {
      ...validTrace(),
      agentId: agent.id,
      versionId: version.id
    }
    const run: TestSuiteRunRecord = {
      id: createTestSuiteRunId(),
      tenantId: TENANT,
      suiteId: suite.id,
      agentId: agent.id,
      variants: [
        {
          label: 'A',
          versionId: version.id,
          passed: true,
          results: [
            {
              caseId: 'case-1',
              passed: true,
              failures: [],
              trace
            }
          ]
        }
      ],
      passed: true,
      createdBy: 'admin.branches-b',
      createdAt: new Date()
    }
    const recorded = await store.recordTestSuiteRun({ tenantId: TENANT }, run)
    expect(recorded.variants).toHaveLength(1)

    await expect(
      store.recordTestSuiteRun(
        { tenantId: OTHER_TENANT },
        { ...run, id: createTestSuiteRunId() }
      )
    ).rejects.toMatchObject({ code: 'forbidden' })

    await expect(
      store.recordTestSuiteRun(
        { tenantId: TENANT },
        {
          ...run,
          id: createTestSuiteRunId(),
          variants: [
            {
              label: 'A',
              versionId: version.id,
              passed: true,
              results: [
                {
                  caseId: 'case-1',
                  passed: true,
                  failures: [],
                  trace
                }
              ]
            },
            {
              label: 'A',
              versionId: version.id,
              passed: true,
              results: [
                {
                  caseId: 'case-1',
                  passed: true,
                  failures: [],
                  trace
                }
              ]
            }
          ],
          passed: true
        }
      )
    ).rejects.toMatchObject({ code: 'invalid_action' })

    await expect(
      store.recordTestSuiteRun(
        { tenantId: TENANT },
        {
          ...run,
          id: createTestSuiteRunId(),
          variants: [
            {
              label: 'C' as 'A',
              versionId: version.id,
              passed: true,
              results: [
                {
                  caseId: 'case-1',
                  passed: true,
                  failures: [],
                  trace
                }
              ]
            }
          ],
          passed: true
        }
      )
    ).rejects.toMatchObject({ code: 'invalid_action' })

    await expect(
      store.recordTestSuiteRun(
        { tenantId: TENANT },
        { ...run, id: createTestSuiteRunId(), passed: false }
      )
    ).rejects.toMatchObject({ code: 'invalid_action' })
  })

  it('rejects malformed scopes and actors without database', async () => {
    const store = new InMemoryControlPlaneStore()
    await expect(
      store.listAgents({ tenantId: 'not-a-tenant' } as never)
    ).rejects.toThrow()
    await expect(
      store.createAgent(
        { tenantId: TENANT },
        { slug: 'bad-actor', name: 'Bad', description: 'Fixture' }
      )
    ).resolves.toBeDefined()
    const agent = await store.createAgent(
      { tenantId: TENANT },
      { slug: 'bad-actor-2', name: 'Bad 2', description: 'Fixture' }
    )
    await expect(
      store.createVersion({ tenantId: TENANT }, agent.id, agentConfig(), '  ')
    ).rejects.toMatchObject({ code: 'validation_failed' })
  })
})

describe('trace governance branches without database', () => {
  it('accepts a minimal valid trace and strips unknown fields', () => {
    const sanitized = sanitizeTraceForPersistence(validTrace())
    expect(sanitized.traceId).toBe(
      validTrace().traceId.slice(0, 0) + sanitized.traceId
    )
    const polluted = sanitizeTraceForPersistence({
      ...validTrace(),
      extra: 'stripped'
    } as unknown as TestRunTrace)
    expect(polluted).not.toHaveProperty('extra')
  })

  it('rejects handoff, token usage and timing inconsistencies', () => {
    expect(() =>
      sanitizeTraceForPersistence({
        ...validTrace(),
        handoff: { requested: true, reason: null, state: 'HANDOFF_REQUESTED' }
      } as unknown as TestRunTrace)
    ).toThrowError(expect.objectContaining({ code: 'validation_failed' }))
    expect(() =>
      sanitizeTraceForPersistence({
        ...validTrace(),
        tokenUsage: { prompt: 4, completion: 3, total: 8, estimated: true }
      } as unknown as TestRunTrace)
    ).toThrowError(expect.objectContaining({ code: 'validation_failed' }))
    expect(() =>
      sanitizeTraceForPersistence({
        ...validTrace(),
        startedAt: new Date('2026-09-01T09:00:00.000Z'),
        completedAt: undefined,
        latencyMs: 1000
      } as unknown as TestRunTrace)
    ).toThrowError(expect.objectContaining({ code: 'validation_failed' }))
    expect(() =>
      sanitizeTraceForPersistence({
        ...validTrace(),
        startedAt: new Date('2026-09-01T09:00:02.000Z'),
        completedAt: new Date('2026-09-01T09:00:01.000Z'),
        latencyMs: 1000
      } as unknown as TestRunTrace)
    ).toThrowError(expect.objectContaining({ code: 'validation_failed' }))
    expect(() =>
      sanitizeTraceForPersistence({
        ...validTrace(),
        latencyMs: 999
      } as unknown as TestRunTrace)
    ).toThrowError(expect.objectContaining({ code: 'validation_failed' }))
  })

  it('rejects tool container mismatches', () => {
    expect(() =>
      sanitizeTraceForPersistence({
        ...validTrace(),
        tools: [{ name: 'tool-a', status: 'succeeded' }],
        toolResults: []
      } as unknown as TestRunTrace)
    ).toThrowError(expect.objectContaining({ code: 'validation_failed' }))
    expect(() =>
      sanitizeTraceForPersistence({
        ...validTrace(),
        tools: [{ name: 'tool-a', status: 'succeeded' }],
        toolResults: [
          { name: 'tool-b', status: 'succeeded', output: { redacted: true } }
        ]
      } as unknown as TestRunTrace)
    ).toThrowError(expect.objectContaining({ code: 'validation_failed' }))
    expect(() =>
      sanitizeTraceForPersistence({
        ...validTrace(),
        tools: [{ name: 'tool-a', status: 'succeeded' }],
        toolResults: [{ name: 'tool-a', status: 'succeeded', output: null }]
      } as unknown as TestRunTrace)
    ).toThrowError(expect.objectContaining({ code: 'validation_failed' }))
    expect(() =>
      sanitizeTraceForPersistence({
        ...validTrace(),
        tools: [{ name: 'tool-a', status: 'blocked' }],
        toolResults: [
          { name: 'tool-a', status: 'blocked', output: { redacted: true } }
        ]
      } as unknown as TestRunTrace)
    ).toThrowError(expect.objectContaining({ code: 'validation_failed' }))
  })

  it('rejects span ordering, overflow and derived status drift', () => {
    expect(() =>
      sanitizeTraceForPersistence({
        ...validTrace(),
        spans: [
          { name: 'model', status: 'completed', durationMs: 1 },
          { name: 'intent', status: 'completed', durationMs: 1 }
        ]
      } as unknown as TestRunTrace)
    ).toThrowError(expect.objectContaining({ code: 'validation_failed' }))
    expect(() =>
      sanitizeTraceForPersistence({
        ...validTrace(),
        policy: [
          {
            decision: 'blocked',
            layer: 'hard_safety',
            reason: 'blocked',
            policyVersion: 'v1'
          }
        ],
        spans: [{ name: 'policy', status: 'completed', durationMs: 1 }]
      } as unknown as TestRunTrace)
    ).toThrowError(expect.objectContaining({ code: 'validation_failed' }))
    expect(() =>
      sanitizeTraceForPersistence({
        ...validTrace(),
        knowledge: { status: 'not_requested' },
        spans: [{ name: 'knowledge', status: 'completed', durationMs: 1 }]
      } as unknown as TestRunTrace)
    ).toThrowError(expect.objectContaining({ code: 'validation_failed' }))
    expect(() =>
      sanitizeTraceForPersistence({
        ...validTrace(),
        handoff: { requested: false, reason: null, state: 'BOT_ACTIVE' },
        spans: [{ name: 'handoff', status: 'completed', durationMs: 1 }]
      } as unknown as TestRunTrace)
    ).toThrowError(expect.objectContaining({ code: 'validation_failed' }))
    expect(() =>
      sanitizeTraceForPersistence({
        ...validTrace(),
        spans: [{ name: 'delivery', status: 'completed', durationMs: 0 }]
      } as unknown as TestRunTrace)
    ).toThrowError(expect.objectContaining({ code: 'validation_failed' }))
  })

  it('rejects inconsistent output policy metadata', () => {
    expect(() =>
      sanitizeTraceForPersistence({
        ...validTrace(),
        outputPolicy: {
          decision: 'allowed',
          reason: 'output_allowed',
          mode: 'clarify',
          redacted: false
        }
      } as unknown as TestRunTrace)
    ).toThrowError(expect.objectContaining({ code: 'validation_failed' }))
    expect(() =>
      sanitizeTraceForPersistence({
        ...validTrace(),
        outputPolicy: {
          decision: 'allowed',
          reason: 'output_redacted',
          mode: 'answer',
          redacted: false
        }
      } as unknown as TestRunTrace)
    ).toThrowError(expect.objectContaining({ code: 'validation_failed' }))
    expect(() =>
      sanitizeTraceForPersistence({
        ...validTrace(),
        outputPolicy: {
          decision: 'allowed',
          reason: 'unsafe_output_rejected',
          mode: 'answer',
          redacted: false
        }
      } as unknown as TestRunTrace)
    ).toThrowError(expect.objectContaining({ code: 'validation_failed' }))
  })

  it('rejects malformed suite run envelopes without throwing raw errors', () => {
    expect(() =>
      sanitizeTestSuiteRunTraces({} as unknown as TestSuiteRunRecord)
    ).toThrowError(expect.objectContaining({ code: 'validation_failed' }))
    expect(() =>
      sanitizeTestSuiteRunTraces({
        tenantId: TENANT,
        id: createTestSuiteRunId(),
        suiteId: 'test_suite_00000000-0000-4000-8000-000000000911',
        agentId: 'agent_00000000-0000-4000-8000-000000000911',
        variants: [],
        passed: true,
        createdBy: '',
        createdAt: new Date()
      } as unknown as TestSuiteRunRecord)
    ).toThrowError(expect.objectContaining({ code: 'validation_failed' }))
    expect(() =>
      sanitizeTestSuiteRunTraces({
        tenantId: TENANT,
        id: createTestSuiteRunId(),
        suiteId: 'test_suite_00000000-0000-4000-8000-000000000911',
        agentId: 'agent_00000000-0000-4000-8000-000000000911',
        variants: [
          {
            label: 'A',
            versionId: 'agent_version_00000000-0000-4000-8000-000000000911',
            passed: true,
            results: [
              {
                caseId: '',
                passed: true,
                failures: [],
                trace: validTrace()
              }
            ]
          }
        ],
        passed: true,
        createdBy: 'admin',
        createdAt: new Date()
      } as unknown as TestSuiteRunRecord)
    ).toThrowError(expect.objectContaining({ code: 'validation_failed' }))
    expect(() =>
      sanitizeTestSuiteRunTraces({
        tenantId: TENANT,
        id: createTestSuiteRunId(),
        suiteId: 'test_suite_00000000-0000-4000-8000-000000000911',
        agentId: 'agent_00000000-0000-4000-8000-000000000911',
        variants: [
          {
            label: 'A',
            versionId: 'agent_version_00000000-0000-4000-8000-000000000911',
            passed: true,
            results: [
              {
                caseId: 'case-1',
                passed: true,
                failures: [''],
                trace: validTrace()
              }
            ]
          }
        ],
        passed: true,
        createdBy: 'admin',
        createdAt: new Date()
      } as unknown as TestSuiteRunRecord)
    ).toThrowError(expect.objectContaining({ code: 'validation_failed' }))
  })
})

describe('test lab branches without database', () => {
  it('validates trace timing clocks and bounds', () => {
    expect(() =>
      createControlledTraceTiming('not-a-function' as never)
    ).toThrowError(expect.objectContaining({ code: 'validation_failed' }))
    const nonFinite = createControlledTraceTiming(() => Number.NaN)
    expect(() => nonFinite.measure('normalize', () => 1)).toThrowError(
      expect.objectContaining({ code: 'validation_failed' })
    )
    let clock = 10
    const backward = createControlledTraceTiming(() => clock)
    backward.measure('normalize', () => 1)
    clock = 5
    expect(() => backward.measure('intent', () => 1)).toThrowError(
      expect.objectContaining({ code: 'validation_failed' })
    )
    let tick = 0
    const timing = createControlledTraceTiming(() => tick)
    expect(
      timing.measure('normalize', () => {
        tick = 3
        return 'ok'
      })
    ).toBe('ok')
    timing.measure('normalize', () => {
      tick = 5
      return 'again'
    })
    expect(timing.snapshot().normalize).toBe(5)
    expect(() =>
      timing.measure('model', () => {
        throw new Error('operation failed')
      })
    ).toThrow(/operation failed/)
    expect(timing.snapshot().model).toBe(0)
  })

  it('rejects out-of-bound stage durations without database', async () => {
    let tick = 0
    const timing = createControlledTraceTiming(() => tick)
    expect(() =>
      timing.measure('normalize', () => {
        tick = 90000000
        return 1
      })
    ).toThrowError(expect.objectContaining({ code: 'validation_failed' }))
    const asyncTiming = createControlledTraceTiming(() => 0)
    await expect(
      asyncTiming.measureAsync('model', async () => {
        throw new Error('async failed')
      })
    ).rejects.toThrow(/async failed/)
    const measured = await asyncTiming.measureAsync('model', async () => 7)
    expect(measured).toBe(7)
  })

  it('rejects invalid execution inputs without database', async () => {
    const store = new InMemoryControlPlaneStore()
    const agent = await store.createAgent(
      { tenantId: TENANT },
      { slug: 'lab-agent', name: 'Lab Agent', description: 'Fixture' }
    )
    const version = await store.createVersion(
      { tenantId: TENANT },
      agent.id,
      agentConfig(),
      'admin.branches-b'
    )
    await expect(
      runTestLab({
        store,
        tenantId: TENANT,
        agentId: agent.id,
        versionId: version.id,
        message: '   ',
        history: []
      })
    ).rejects.toMatchObject({ code: 'validation_failed' })
    await expect(
      runTestLab({
        store,
        tenantId: TENANT,
        agentId: agent.id,
        versionId: version.id,
        message: 'Hello',
        history: new Array(51).fill('hi')
      })
    ).rejects.toMatchObject({ code: 'validation_failed' })
    await expect(
      runTestLab({
        store,
        tenantId: TENANT,
        agentId: agent.id,
        versionId: 'agent_version_00000000-0000-4000-8000-000000000912',
        message: 'Hello',
        history: []
      })
    ).rejects.toMatchObject({ code: 'invalid_action' })
    await expect(
      executeConfiguredAgent({
        store,
        tenantId: TENANT,
        agentId: agent.id,
        versionId: version.id,
        message: 'Hello',
        history: [],
        executionMode: 'TEST_LAB',
        traceId: 'not-a-trace' as never
      })
    ).rejects.toMatchObject({ code: 'validation_failed' })
    await expect(
      runTestLab({
        store,
        tenantId: TENANT,
        agentId: agent.id,
        versionId: version.id,
        message: 'Hello',
        history: ['x'.repeat(4001)],
        approvedKnowledge: {
          source: 'bad',
          version: 'v1',
          answer: 'x'
        } as never
      })
    ).rejects.toMatchObject({ code: 'validation_failed' })
  })

  it('covers intent, knowledge and response branches without database', async () => {
    const store = new InMemoryControlPlaneStore()
    const agent = await store.createAgent(
      { tenantId: TENANT },
      { slug: 'branch-agent', name: 'Branch Agent', description: 'Fixture' }
    )
    const version = await store.createVersion(
      { tenantId: TENANT },
      agent.id,
      agentConfig(),
      'admin.branches-b'
    )
    const base = {
      store,
      tenantId: TENANT,
      agentId: agent.id,
      versionId: version.id,
      history: []
    }
    const medication = await runTestLab({
      ...base,
      message: 'Preciso de dipirona agora'
    })
    expect(medication.handoff.requested).toBe(true)
    expect(medication.response.mode).toBe('handoff')

    const scheduling = await runTestLab({
      ...base,
      message: 'Quero agendar uma consulta'
    })
    expect(scheduling.intent.name).toBe('scheduling')

    const institutional = await runTestLab({
      ...base,
      message: 'Qual o endereco da clinica?'
    })
    expect(institutional.knowledge.status).toBe('approved_source_missing')
    expect(institutional.handoff.requested).toBe(true)

    const unknown = await runTestLab({ ...base, message: 'Ola, tudo bem?' })
    expect(unknown.intent.name).toBe('unknown')
    expect(unknown.provider.externalCall).toBe(false)
    expect(unknown.spans).toHaveLength(11)
  })

  it('emits platform events without failing when the bus throws', async () => {
    const store = new InMemoryControlPlaneStore()
    const agent = await store.createAgent(
      { tenantId: TENANT },
      { slug: 'event-agent', name: 'Event Agent', description: 'Fixture' }
    )
    const version = await store.createVersion(
      { tenantId: TENANT },
      agent.id,
      agentConfig(),
      'admin.branches-b'
    )
    const throwingBus = {
      emit: async () => {
        throw new Error('bus offline')
      }
    }
    const trace = await runTestLab({
      store,
      tenantId: TENANT,
      agentId: agent.id,
      versionId: version.id,
      message: 'Hello events',
      history: [],
      eventBus: throwingBus as never
    })
    expect(trace.traceId).toMatch(/^trace_/)
  })
})

describe('plugin gateway branches without database', () => {
  const inputSchema = z.object({ value: z.string().min(1).max(80) }).strict()
  const outputSchema = z.union([
    z.string().max(4000),
    z.object({ ok: z.boolean().optional() }).strict()
  ])

  function fixturePlugin(
    overrides: Partial<RegisteredPlugin> = {}
  ): RegisteredPlugin {
    const manifest = {
      name: 'branches.gateway',
      version: '1.0.0',
      capabilities: ['branches.read'],
      permissions: ['branches:read'],
      tools: [
        {
          name: 'read',
          permission: 'branches:read',
          risk: 'low' as const,
          requiresApproval: false,
          intents: ['schedule']
        }
      ],
      hooks: [],
      dependencies: [],
      configSchemaVersion: '1'
    }
    return {
      manifest,
      handlers: {
        read: async () => ({ status: 'succeeded' as const })
      },
      inputValidators: { read: inputSchema },
      outputValidators: { read: outputSchema },
      ...overrides
    } as RegisteredPlugin
  }

  function fixtureConfig(plugins?: Array<Record<string, unknown>>) {
    return AgentConfigSchema.parse({
      persona: { name: 'Gateway', role: 'assistant', tone: 'calm' },
      greeting: 'Controlled.',
      promptBlocks: [],
      responseTemplates: {},
      model: {
        provider: 'fake',
        model: 'deterministic-v1',
        temperature: 0,
        maxTokens: 128,
        timeoutMs: 1000,
        retries: 0,
        secretRef: 'secret://controlled/branches-gateway'
      },
      featureFlags: { testLab: true, realChannels: false },
      policies: {
        version: 'branches-v1',
        minConfidence: 0.7,
        lowConfidence: 'clarify',
        maxClarifications: 2,
        enabledActions: ['respond'],
        approvalActions: [],
        blockedActions: []
      },
      plugins: plugins ?? [
        {
          plugin: 'branches.gateway',
          version: '1.0.0',
          enabled: true,
          allowedTools: ['read'],
          config: {}
        }
      ],
      knowledge: [],
      handoff: {
        lowConfidenceDestination: 'controlled-reception',
        destinations: ['controlled-reception'],
        maxClarifications: 2
      }
    })
  }

  function executionInput(
    overrides: Partial<CapabilityExecutionInput> = {}
  ): CapabilityExecutionInput {
    return {
      tenantId: TENANT,
      agentId: 'agent_00000000-0000-4000-8000-000000000911' as AgentId,
      versionId: 'agent_version_00000000-0000-4000-8000-000000000911' as never,
      config: fixtureConfig(),
      toolName: 'read',
      input: { value: 'controlled' },
      actor: {
        id: 'operator.gateway',
        role: 'Operator',
        permissions: ['branches:read']
      },
      policy: { decision: 'allowed', reason: 'controlled' },
      dryRun: true,
      ...overrides
    }
  }

  it('registers, deduplicates and sorts plugins without database', () => {
    const registry = new PluginRegistry([fixturePlugin()])
    const extended = registry.register(
      fixturePlugin({
        manifest: {
          name: 'branches.gateway',
          version: '1.0.1',
          capabilities: ['branches.read'],
          permissions: ['branches:read'],
          tools: [
            {
              name: 'read',
              permission: 'branches:read',
              risk: 'low' as const,
              requiresApproval: false,
              intents: ['schedule']
            }
          ],
          hooks: [],
          dependencies: [],
          configSchemaVersion: '1'
        }
      })
    )
    expect(extended.list()).toHaveLength(2)
    expect(() => extended.register(fixturePlugin())).toThrow(
      /already registered/
    )
    expect(registry.get('missing.plugin', '1.0.0')).toBeNull()
    expect(registry.getLatest('missing.plugin')).toBeNull()
    expect(registry.getLatest('branches.gateway')?.manifest.version).toBe(
      '1.0.0'
    )
    expect(extended.getLatest('branches.gateway')?.manifest.version).toBe(
      '1.0.1'
    )
  })

  it('resolves tool bindings and validator gaps without database', () => {
    const gateway = new CapabilityGateway(new PluginRegistry([fixturePlugin()]))
    expect(
      gateway.resolveConfiguredTool(
        fixtureConfig([
          {
            plugin: 'branches.gateway',
            version: '1.0.0',
            enabled: true,
            allowedTools: ['read'],
            config: {}
          }
        ]),
        'read'
      )
    ).toMatchObject({ status: 'resolved' })

    const missingInput = fixturePlugin({ inputValidators: {} as never })
    expect(missingInput).toBeDefined()
    expect(
      () =>
        new PluginRegistry([
          {
            ...fixturePlugin(),
            inputValidators: undefined
          } as never
        ])
    ).toThrow(/input validator/)
    expect(
      () =>
        new PluginRegistry([
          {
            ...fixturePlugin(),
            outputValidators: undefined
          } as never
        ])
    ).toThrow(/output validator/)

    const badPermission = fixturePlugin()
    badPermission.manifest = {
      ...badPermission.manifest,
      permissions: ['other:permission']
    }
    expect(() => new PluginRegistry([badPermission])).toThrow(
      /permission must be declared/i
    )
    expect(gateway.permissionForConfiguredTool(fixtureConfig(), 'read')).toBe(
      'branches:read'
    )
    expect(
      gateway.permissionForConfiguredTool(fixtureConfig([]), 'read')
    ).toBeNull()
  })

  it('blocks malformed execution shapes without side effects', async () => {
    const gateway = new CapabilityGateway(
      new PluginRegistry([fixturePlugin()]),
      {
        actorAuthorizer: ({ requiredPermission }) => [requiredPermission]
      }
    )
    await expect(
      gateway.execute('not-a-record' as never)
    ).resolves.toMatchObject({
      status: 'blocked',
      reason: 'invalid_execution_input'
    })
    await expect(
      gateway.execute(executionInput({ traceId: 'bad-trace' as never }))
    ).resolves.toMatchObject({
      status: 'blocked',
      reason: 'invalid_execution_input'
    })
    await expect(
      gateway.execute(executionInput({ agentId: 'bad-agent' as never }))
    ).resolves.toMatchObject({ status: 'blocked', reason: 'invalid_scope_id' })
    await expect(
      gateway.execute(
        executionInput({
          actor: { id: 'x', role: 'Operator', permissions: [] }
        })
      )
    ).resolves.toMatchObject({ status: 'blocked', reason: 'invalid_actor' })
    await expect(
      gateway.execute(executionInput({ input: {} }))
    ).resolves.toMatchObject({
      status: 'blocked',
      reason: 'tool_input_invalid'
    })
  })

  it('enforces authorization, policy and approval branches without database', async () => {
    const registry = new PluginRegistry([fixturePlugin()])
    const noAuthorizer = new CapabilityGateway(registry)
    await expect(noAuthorizer.execute(executionInput())).resolves.toMatchObject(
      {
        status: 'blocked',
        reason: 'actor_authorization_unavailable'
      }
    )
    const denied = new CapabilityGateway(registry, {
      actorAuthorizer: () => null
    })
    await expect(denied.execute(executionInput())).resolves.toMatchObject({
      status: 'blocked',
      reason: 'actor_authorization_denied'
    })
    const authorized = new CapabilityGateway(registry, {
      actorAuthorizer: ({ requiredPermission }) => [requiredPermission]
    })
    await expect(
      authorized.execute(
        executionInput({ policy: { decision: 'blocked', reason: 'no' } })
      )
    ).resolves.toMatchObject({ status: 'blocked', reason: 'policy_blocked' })
    await expect(
      authorized.execute(
        executionInput({ policy: { decision: 'handoff', reason: 'handoff' } })
      )
    ).resolves.toMatchObject({ status: 'blocked', reason: 'policy_handoff' })
    await expect(
      authorized.execute(
        executionInput({
          requireApproval: true,
          approval: {
            id: 'approval_00000000-0000-4000-8000-000000000911',
            tenantId: TENANT,
            agentId: 'agent_00000000-0000-4000-8000-000000000911' as AgentId,
            versionId:
              'agent_version_00000000-0000-4000-8000-000000000911' as never,
            toolName: 'read',
            actorId: 'operator.gateway',
            expiresAt: new Date(Date.now() + 60000)
          }
        })
      )
    ).resolves.toMatchObject({ status: 'blocked', reason: 'approval_required' })
  })

  it('executes handlers and reports audit availability without database', async () => {
    const onAudit = vi.fn()
    const gateway = new CapabilityGateway(
      new PluginRegistry([fixturePlugin()]),
      {
        actorAuthorizer: ({ requiredPermission }) => [requiredPermission]
      }
    )
    const ok = await gateway.execute(executionInput({ onAudit }))
    expect(ok.status).toBe('succeeded')
    expect(onAudit).toHaveBeenCalledWith(
      expect.objectContaining({ toolName: 'read', status: 'succeeded' })
    )

    const failing = new CapabilityGateway(
      new PluginRegistry([
        fixturePlugin({
          handlers: {
            read: async () => {
              throw new Error('handler failed')
            }
          }
        })
      ]),
      { actorAuthorizer: ({ requiredPermission }) => [requiredPermission] }
    )
    await expect(failing.execute(executionInput())).resolves.toMatchObject({
      status: 'failed',
      reason: 'tool_execution_failed'
    })
    await expect(
      failing.execute(
        executionInput({
          onAudit: () => {
            throw new Error('audit offline')
          }
        })
      )
    ).resolves.toMatchObject({ status: 'failed', reason: 'audit_unavailable' })

    const approvedGateway = new CapabilityGateway(
      new PluginRegistry([fixturePlugin()]),
      {
        actorAuthorizer: ({ requiredPermission }) => [requiredPermission],
        approvalAuthority: new InMemoryCapabilityApprovalAuthority()
      }
    )
    const issued = await (
      approvedGateway as unknown as {
        options: { approvalAuthority: InMemoryCapabilityApprovalAuthority }
      }
    ).options.approvalAuthority.issue({
      tenantId: TENANT,
      agentId: 'agent_00000000-0000-4000-8000-000000000911' as AgentId,
      versionId: 'agent_version_00000000-0000-4000-8000-000000000911' as never,
      toolName: 'read',
      input: { value: 'controlled' },
      actorId: 'operator.gateway',
      issuer: 'approver.branches-b',
      expiresAt: new Date(Date.now() + 60000)
    })
    const approved = await approvedGateway.execute(
      executionInput({
        requireApproval: true,
        approval: {
          id: issued.id,
          tenantId: TENANT,
          agentId: 'agent_00000000-0000-4000-8000-000000000911' as AgentId,
          versionId:
            'agent_version_00000000-0000-4000-8000-000000000911' as never,
          toolName: 'read',
          actorId: 'operator.gateway',
          expiresAt: new Date(Date.now() + 60000)
        }
      })
    )
    expect(approved.status).toBe('succeeded')
  })
})
