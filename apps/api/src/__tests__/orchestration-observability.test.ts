import { afterEach, describe, expect, it } from 'vitest'
import { buildServer } from '../server.ts'
import type { GoalPlanStore } from '@cvg/agent-runtime'

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

  it('rejects invalid Goal status filters without a broad query surface', async () => {
    app = buildServer()
    const response = await app.inject({
      method: 'GET',
      url: '/v1/orchestration/goals?status=not-a-goal-state',
      headers: headers()
    })
    expect(response.statusCode).toBe(400)
    expect(response.json().error.code).toBe('invalid_pagination')
  })
})
