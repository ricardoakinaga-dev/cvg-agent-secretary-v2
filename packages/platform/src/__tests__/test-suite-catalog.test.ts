import { describe, expect, it } from 'vitest'
import {
  AgentConfigSchema,
  InMemoryControlPlaneStore,
  TestLabCaseSchema,
  createTestSuiteRunId,
  evaluateTestLabSuite,
  type TestSuiteRunRecord
} from '../index.ts'

const tenantId = 'tenant_00000000-0000-4000-8000-000000000071'

function config() {
  return AgentConfigSchema.parse({
    persona: { name: 'Suite Agent', role: 'assistant', tone: 'calm' },
    greeting: 'Resposta fictícia.',
    promptBlocks: [],
    responseTemplates: { unknown: 'Handoff fictício.' },
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
      version: 'suite-policy-v1',
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

const testCase = TestLabCaseSchema.parse({
  id: 'unknown-case',
  message: 'Olá',
  expectedResponseMode: 'clarify',
  expectedHandoff: false
})

describe('persistent controlled Test Lab suite catalog', () => {
  it('creates immutable suite versions and isolates tenants', async () => {
    const store = new InMemoryControlPlaneStore()
    const agent = await store.createAgent(
      { tenantId },
      { slug: 'suite-agent', name: 'Suite Agent', description: 'Fictício' }
    )
    const version = await store.createVersion(
      { tenantId },
      agent.id,
      config(),
      'admin.suite'
    )
    const suite = await store.createTestSuite(
      { tenantId },
      {
        slug: 'smoke-suite',
        name: 'Smoke Suite',
        description: 'Suite fictícia',
        agentId: agent.id,
        versionId: version.id,
        cases: [testCase]
      },
      'admin.suite'
    )
    const clone = await store.cloneTestSuite(
      { tenantId },
      suite.id,
      { cases: [{ ...testCase, id: 'updated-case' }] },
      'admin.suite'
    )

    expect(suite).toMatchObject({
      slug: 'smoke-suite',
      version: 1,
      cases: [testCase]
    })
    expect(clone).toMatchObject({
      slug: 'smoke-suite',
      version: 2,
      previousSuiteId: suite.id,
      cases: [{ id: 'updated-case' }]
    })
    expect((await store.getTestSuite({ tenantId }, suite.id))?.cases).toEqual([
      testCase
    ])
    const redacted = await store.cloneTestSuite(
      { tenantId },
      suite.id,
      {
        cases: [
          {
            ...testCase,
            id: 'redaction-case',
            message: 'Contato ana@example.com e +5511999999999'
          }
        ]
      },
      'admin.suite'
    )
    expect(redacted.cases[0]?.message).toBe(
      'Contato [redacted-email] e [redacted-phone]'
    )
    await expect(
      store.listTestSuites({
        tenantId: 'tenant_00000000-0000-4000-8000-000000000072'
      })
    ).resolves.toEqual([])
  })

  it('records redacted single-version and A/B evaluation history', async () => {
    const store = new InMemoryControlPlaneStore()
    const agent = await store.createAgent(
      { tenantId },
      {
        slug: 'evaluation-agent',
        name: 'Evaluation Agent',
        description: 'Fictício'
      }
    )
    const version = await store.createVersion(
      { tenantId },
      agent.id,
      config(),
      'admin.suite'
    )
    const suite = await store.createTestSuite(
      { tenantId },
      {
        slug: 'evaluation-suite',
        name: 'Evaluation Suite',
        description: 'Fictícia',
        agentId: agent.id,
        versionId: version.id,
        cases: [testCase]
      },
      'admin.suite'
    )
    const result = await evaluateTestLabSuite({
      store,
      tenantId,
      agentId: agent.id,
      versionId: version.id,
      cases: suite.cases
    })
    const run: TestSuiteRunRecord = {
      id: createTestSuiteRunId(),
      tenantId,
      suiteId: suite.id,
      agentId: agent.id,
      variants: [
        {
          label: 'A',
          versionId: version.id,
          passed: result.passed,
          results: result.results
        },
        {
          label: 'B',
          versionId: version.id,
          passed: result.passed,
          results: result.results
        }
      ],
      passed: result.passed,
      createdBy: 'admin.suite',
      createdAt: new Date()
    }
    await store.recordTestSuiteRun({ tenantId }, run)

    const listed = await store.listTestSuiteRuns({ tenantId }, suite.id)
    expect(listed[0]).toMatchObject({
      suiteId: suite.id,
      variants: [
        { label: 'A', versionId: version.id },
        { label: 'B', versionId: version.id }
      ]
    })
    expect(
      listed[0]?.variants[0]?.results[0]?.trace.provider.externalCall
    ).toBe(false)
    await expect(
      store.recordTestSuiteRun(
        { tenantId },
        {
          ...run,
          id: createTestSuiteRunId(),
          passed: false,
          variants: [
            {
              ...run.variants[0]!,
              label: 'A',
              passed: true
            }
          ]
        }
      )
    ).rejects.toMatchObject({ code: 'invalid_action' })
    await expect(
      store.recordTestSuiteRun(
        { tenantId },
        {
          ...run,
          id: createTestSuiteRunId(),
          variants: [
            {
              ...run.variants[0]!,
              label: 'C' as 'A'
            }
          ]
        }
      )
    ).rejects.toMatchObject({ code: 'invalid_action' })
  })
})
