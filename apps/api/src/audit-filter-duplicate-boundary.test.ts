import { describe, expect, it, vi } from 'vitest'
import { buildServer } from './server.ts'
import {
  AUDIT_FILTER_DUPLICATE_ERROR_MESSAGE,
  classifyAuditFilterValue
} from './audit-filter-duplicate-boundary.ts'

const supervisorHeaders = {
  'x-operator-id': 'supervisor.audit-filter',
  'x-operator-role': 'Supervisor',
  'x-tenant-id': 'tenant_00000000-0000-4000-8000-000000000091'
}

const duplicateFilters = [
  ['sessionId', 'session_00000000-0000-4000-8000-000000000001'],
  ['correlationId', 'corr_00000000-0000-4000-8000-000000000001'],
  ['actorId', 'operator.audit-filter'],
  ['type', 'tool_call']
] as const

describe('controlled audit filter duplicate boundary', () => {
  it('classifies single-valued filters and rejects arrays', () => {
    expect(classifyAuditFilterValue('single')).toBeNull()
    expect(classifyAuditFilterValue(undefined)).toBeNull()
    expect(classifyAuditFilterValue(['first', 'second'])).toEqual({
      code: 'validation_failed',
      message: AUDIT_FILTER_DUPLICATE_ERROR_MESSAGE
    })
  })

  it.each(duplicateFilters)(
    'rejects repeated %s before summary and page repository calls',
    async (filterName, firstValue) => {
      const app = buildServer()
      const listEvidence = vi.spyOn(app.persistence.audit, 'listEvidence')
      const summarizeEvidence = vi.spyOn(
        app.persistence.audit,
        'summarizeEvidence'
      )
      const response = await app.inject({
        method: 'GET',
        url: `/v1/observability/audit-evidence?limit=1&${filterName}=${firstValue}&${filterName}=second-value`,
        headers: supervisorHeaders
      })
      await app.close()

      expect(response.statusCode).toBe(400)
      expect(response.json()).toMatchObject({
        success: false,
        error: {
          code: 'validation_failed',
          message: AUDIT_FILTER_DUPLICATE_ERROR_MESSAGE
        }
      })
      expect(listEvidence).not.toHaveBeenCalled()
      expect(summarizeEvidence).not.toHaveBeenCalled()
    }
  )

  it('preserves a single audit filter and pagination', async () => {
    const app = buildServer()
    const response = await app.inject({
      method: 'GET',
      url: '/v1/observability/audit-evidence?limit=1&offset=0&type=tool_call',
      headers: supervisorHeaders
    })
    await app.close()

    expect(response.statusCode).toBe(200)
    expect(response.json().data.page.pageInfo).toMatchObject({
      limit: 1,
      offset: 0
    })
  })
})
