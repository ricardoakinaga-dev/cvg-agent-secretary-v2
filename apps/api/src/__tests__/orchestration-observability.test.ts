import { afterEach, describe, expect, it } from 'vitest'
import { buildServer } from '../server.ts'
import {
  loadOrchestrationGoalDetail,
  toOrchestrationGoalDetailView
} from '../orchestration-observability.ts'
import {
  InMemoryGoalPlanStore,
  validatePlanGraph,
  type GoalPlanStore,
  type PlanStepDraft
} from '@cvg/agent-runtime'

const TENANT = 'tenant_00000000-0000-4000-8000-000000000731'
const OTHER_TENANT = 'tenant_00000000-0000-4000-8000-000000000732'

const headers = (tenantId = TENANT, role = 'Supervisor') => ({
  'x-operator-id': 'operator.orchestration.test',
  'x-operator-role': role,
  'x-tenant-id': tenantId
})

describe('durable orchestration observability API', () => {
  let app: ReturnType<typeof buildServer> | undefined

  afterEach(async () => {
    await app?.close()
    app = undefined
  })

  it('lists and details Goals without exposing step inputs or lease tokens', async () => {
    app = buildServer()
    const store = app.persistence.orchestration as GoalPlanStore
    const goal = await store.createGoal({
      tenantId: TENANT,
      objective: 'Fixture objective with synthetic data only',
      successCriteria: [
        {
          kind: 'STATE',
          resourceType: 'synthetic_resource',
          field: 'status',
          expected: 'ready',
          source: 'operational_state'
        }
      ],
      correlationId: 'corr_00000000-0000-4000-8000-000000000731'
    })

    const list = await app.inject({
      method: 'GET',
      url: '/v1/orchestration/goals?limit=10',
      headers: headers()
    })
    expect(list.statusCode).toBe(200)
    expect(list.json().data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: goal.id, status: 'OBSERVING' })
      ])
    )

    const detail = await app.inject({
      method: 'GET',
      url: `/v1/orchestration/goals/${goal.id}`,
      headers: headers()
    })
    expect(detail.statusCode).toBe(200)
    expect(detail.json().data).toMatchObject({
      id: goal.id,
      objective: 'Fixture objective with synthetic data only',
      plans: [],
      observations: [],
      evaluations: []
    })
    expect(JSON.stringify(detail.json().data)).not.toContain('leaseToken')
    expect(JSON.stringify(detail.json().data)).not.toContain('expected')
  })

  it('falls back to singular reads without changing the detail view', async () => {
    const inner = new InMemoryGoalPlanStore()
    const goal = await inner.createGoal({
      tenantId: TENANT,
      objective: 'Bulk fallback fixture',
      successCriteria: [
        {
          kind: 'STATE',
          resourceType: 'synthetic_resource',
          field: 'status',
          expected: 'ready',
          source: 'operational_state'
        }
      ],
      correlationId: 'corr_00000000-0000-4000-8000-000000000734'
    })
    const draft: PlanStepDraft = {
      id: 'fallback-step',
      type: 'synthetic',
      description: 'fallback step',
      requiredCapabilities: ['appointment.create'],
      riskLevel: 'MEDIUM_RISK_WRITE',
      approvalRequirement: 'none',
      input: { fixture: true },
      expectedOutcome: { verified: true },
      timeoutMs: 1_000,
      intent: {
        capability: 'appointment.create',
        action: 'synthetic.read',
        resource: {
          type: 'synthetic_resource',
          id: 'resource_1',
          tenantId: TENANT
        },
        dataClassification: 'INTERNAL',
        modelMessages: null,
        structuredOutput: null,
        idempotencyKey: 'synthetic:fallback-step'
      },
      toolId: 'synthetic',
      toolVersion: '1.0.0'
    }
    const steps = [draft]
    const graph = validatePlanGraph(
      { id: 'plan_draft', goalId: goal.id, tenantId: TENANT, version: 1 },
      steps
    )
    await inner.activatePlan({
      tenantId: TENANT,
      goalId: goal.id,
      expectedGoalVersion: goal.version,
      planVersion: 1,
      parentPlanId: null,
      reason: 'fallback plan',
      steps,
      consumeReplan: false,
      fingerprint: graph.fingerprint
    })
    const singularOnly = new Proxy(inner, {
      get(target, property, receiver) {
        if (
          property === 'listStepsByPlan' ||
          property === 'listAttemptsByStep'
        ) {
          return undefined
        }
        const value = Reflect.get(target, property, receiver)
        return typeof value === 'function' ? value.bind(target) : value
      }
    }) as GoalPlanStore

    const bulk = await loadOrchestrationGoalDetail(inner, TENANT, goal)
    const fallback = await loadOrchestrationGoalDetail(
      singularOnly,
      TENANT,
      goal
    )
    expect(fallback).toEqual(bulk)
    expect(JSON.stringify(fallback)).toContain('fallback-step')
  })

  it('requires supervisor or admin identity and keeps tenant scope', async () => {
    app = buildServer()
    const store = app.persistence.orchestration as GoalPlanStore
    const goal = await store.createGoal({
      tenantId: TENANT,
      objective: 'Tenant scoped synthetic Goal',
      successCriteria: [],
      correlationId: 'corr_00000000-0000-4000-8000-000000000732'
    })

    const operator = await app.inject({
      method: 'GET',
      url: '/v1/orchestration/goals',
      headers: headers(TENANT, 'Operator')
    })
    expect(operator.statusCode).toBe(403)

    const otherTenant = await app.inject({
      method: 'GET',
      url: `/v1/orchestration/goals/${goal.id}`,
      headers: headers(OTHER_TENANT)
    })
    expect(otherTenant.statusCode).toBe(404)
  })

  it('redacts sensitive metadata across the complete read model', async () => {
    app = buildServer()
    const store = app.persistence.orchestration as GoalPlanStore
    const goal = await store.createGoal({
      tenantId: TENANT,
      objective: 'Synthetic metadata redaction fixture',
      successCriteria: [
        {
          kind: 'EVENT',
          eventType: 'api_key=criterion-event-secret',
          source: 'audit'
        },
        {
          kind: 'STATE',
          resourceType: 'api_key=criterion-resource-secret',
          field: 'api_key=criterion-field-secret',
          expected: 'ready',
          source: 'operational_state'
        },
        {
          kind: 'FACT',
          key: 'api_key=criterion-key-secret',
          expected: true,
          source: 'human_record'
        },
        {
          kind: 'SEMANTIC',
          description: 'api_key=criterion-description-secret',
          requiredEvidenceKeys: [],
          source: 'audit'
        }
      ],
      correlationId: 'corr_00000000-0000-4000-8000-000000000733',
      executionSnapshot: {
        agentVersion: 'api_key=agent-secret',
        promptVersion: 'prompt@example.com',
        policyVersion: 'Bearer policy-secret',
        modelProfile: 'deterministic',
        toolVersions: { 'api_key=tool-secret': 'token=version-secret' }
      }
    })
    const createdAt = new Date('2026-09-17T10:00:00.000Z')
    const detail = toOrchestrationGoalDetailView({
      goal,
      plans: [],
      stepsByPlan: new Map(),
      observations: [
        {
          id: 'observation_redaction_1',
          tenantId: TENANT,
          goalId: goal.id,
          planId: 'plan_redaction_1',
          stepId: null,
          kind: 'step_result',
          resultDigest: 'api_key=observation-secret',
          evidence: [
            {
              source: 'operational_state',
              reference: 'api_key=reference-secret',
              verified: true,
              key: 'api_key=key-secret',
              digest: 'token=digest-secret'
            }
          ],
          createdAt
        }
      ],
      evaluations: [],
      attemptsByStep: new Map()
    })

    const serialized = JSON.stringify(detail)
    expect(serialized).not.toContain('agent-secret')
    expect(serialized).not.toContain('prompt@example.com')
    expect(serialized).not.toContain('policy-secret')
    expect(serialized).not.toContain('tool-secret')
    expect(serialized).not.toContain('observation-secret')
    expect(serialized).not.toContain('reference-secret')
    expect(serialized).not.toContain('key-secret')
    expect(serialized).not.toContain('digest-secret')
    expect(serialized).not.toContain('criterion-event-secret')
    expect(serialized).not.toContain('criterion-resource-secret')
    expect(serialized).not.toContain('criterion-field-secret')
    expect(serialized).not.toContain('criterion-key-secret')
    expect(serialized).not.toContain('criterion-description-secret')
    expect(detail.successCriteria).toMatchObject([
      { kind: 'EVENT', eventType: '[redacted-secret]' },
      {
        kind: 'STATE',
        resourceType: '[redacted-secret]',
        field: '[redacted-secret]'
      },
      { kind: 'FACT', key: '[redacted-secret]' },
      { kind: 'SEMANTIC', description: '[redacted-secret]' }
    ])
    expect(detail.executionSnapshot.toolVersions).toEqual({
      '[redacted-secret]': '[redacted-secret]'
    })
  })

  it('rejects invalid Goal status filters without a broad query surface', async () => {
    app = buildServer()
    const response = await app.inject({
      method: 'GET',
      url: '/v1/orchestration/goals?status=not-a-goal-state',
      headers: headers()
    })
    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({
      success: false,
      data: null,
      meta: { correlationId: expect.any(String) }
    })
    expect(response.json().error.code).toBe('invalid_pagination')
    expect(response.json().error.message).toBe(
      'limit must be between 1 and 50 and status must be a valid Goal state'
    )
  })
})
