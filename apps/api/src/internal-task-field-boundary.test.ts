import { CreateInternalTaskSchema } from '@cvg/shared'
import { describe, expect, it, vi } from 'vitest'
import { buildServer } from './server.ts'

interface Envelope<T> {
  success: boolean
  data: T
  error: { code: string; message: string } | null
  meta: { correlationId: string }
}

const TENANT_ID = 'tenant_00000000-0000-4000-8000-000000000091' as const

const LIMITS = {
  sessionId: 160,
  title: 200,
  description: 4000,
  source: 120,
  idempotencyKey: 200
} as const

type TaskField = keyof typeof LIMITS

function buildTaskPayload(sessionId: string) {
  return {
    sessionId,
    title: 'Tarefa controlada',
    description: 'Descricao controlada',
    priority: 'medium' as const,
    source: 'internal-task-boundary-test',
    idempotencyKey: 'internal-task-boundary-1'
  }
}

async function createFixtureSession(app: ReturnType<typeof buildServer>) {
  const created = await app.persistence.conversations.createWithSession({
    tenantId: TENANT_ID,
    channel: 'internal',
    senderRef: 'fixture-task-boundary',
    externalMessageId: `task-boundary-${crypto.randomUUID()}`,
    body: 'fixture controlada'
  })
  return created.session.id
}

describe('internal task field boundary', () => {
  it('rejects every over-limit field at the shared schema boundary', () => {
    const base = buildTaskPayload('sess_fixture')

    for (const field of Object.keys(LIMITS) as TaskField[]) {
      const result = CreateInternalTaskSchema.safeParse({
        ...base,
        [field]: 'x'.repeat(LIMITS[field] + 1)
      })

      expect(result.success, `${field} should be bounded`).toBe(false)
    }
  })

  it.each(Object.entries(LIMITS) as Array<[TaskField, number]>)(
    'rejects over-limit %s before tasks.create',
    async (field, limit) => {
      const app = buildServer()
      const sessionId = await createFixtureSession(app)
      const create = vi.spyOn(app.persistence.tasks, 'create')
      const payload = {
        ...buildTaskPayload(sessionId),
        [field]: 'x'.repeat(limit + 1)
      }

      const response = await app.inject({
        method: 'POST',
        url: '/v1/tasks',
        headers: { 'x-tenant-id': TENANT_ID },
        payload
      })
      const body = response.json() as Envelope<never>
      await app.close()

      expect(response.statusCode).toBe(400)
      expect(body).toMatchObject({
        success: false,
        error: { code: 'validation_failed' }
      })
      expect(create).not.toHaveBeenCalled()
      expect(body.error?.message).not.toContain('x'.repeat(limit + 1))
    }
  )

  it('accepts values at the configured maxima and preserves normal creation', async () => {
    const app = buildServer()
    const sessionId = await createFixtureSession(app)
    const payload = {
      ...buildTaskPayload(sessionId),
      title: 'T'.repeat(LIMITS.title),
      description: 'D'.repeat(LIMITS.description),
      source: 'S'.repeat(LIMITS.source),
      idempotencyKey: 'K'.repeat(LIMITS.idempotencyKey)
    }

    const response = await app.inject({
      method: 'POST',
      url: '/v1/tasks',
      headers: { 'x-tenant-id': TENANT_ID },
      payload
    })
    const body = response.json() as Envelope<{
      title: string
      description: string
      source: string
      idempotencyKey: string
    }>
    await app.close()

    expect(response.statusCode).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toMatchObject({
      title: payload.title,
      description: payload.description,
      source: payload.source,
      idempotencyKey: payload.idempotencyKey
    })
  })
})
