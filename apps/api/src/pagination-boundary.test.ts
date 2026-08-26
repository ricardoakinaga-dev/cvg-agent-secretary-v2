import { describe, expect, it, vi } from 'vitest'
import { buildServer } from './server.ts'
import {
  HTTP_PAGINATION_MAX_OFFSET,
  classifyPaginationOffset
} from './pagination-boundary.ts'

const tenantId = 'tenant_00000000-0000-4000-8000-000000000091'

const operatorHeaders = {
  'x-operator-id': 'operator.pagination',
  'x-operator-role': 'Operator',
  'x-tenant-id': tenantId
}

const supervisorHeaders = {
  'x-operator-id': 'supervisor.pagination',
  'x-operator-role': 'Supervisor',
  'x-tenant-id': tenantId
}

describe('controlled pagination offset boundary', () => {
  it('declares a safe inclusive offset limit', () => {
    expect(HTTP_PAGINATION_MAX_OFFSET).toBe(10_000)
    expect(classifyPaginationOffset(0)).toBeNull()
    expect(classifyPaginationOffset(HTTP_PAGINATION_MAX_OFFSET)).toBeNull()
    expect(classifyPaginationOffset(HTTP_PAGINATION_MAX_OFFSET + 1)).toEqual({
      code: 'invalid_pagination',
      message: 'offset must be between 0 and 10000'
    })
  })

  it('rejects negative, fractional and unsafe offsets', () => {
    for (const value of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, '1e100']) {
      expect(classifyPaginationOffset(value)).toEqual({
        code: 'invalid_pagination',
        message: 'offset must be between 0 and 10000'
      })
    }
  })

  it('rejects an oversized conversation offset with a safe envelope', async () => {
    const app = buildServer()
    const response = await app.inject({
      method: 'GET',
      url: '/v1/conversations?limit=1&offset=10001',
      headers: operatorHeaders
    })
    await app.close()

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({
      success: false,
      error: {
        code: 'invalid_pagination',
        message:
          'limit must be between 1 and 100 and offset must be between 0 and 10000'
      }
    })
  })

  it('applies the offset boundary to audit evidence and preserves the limit', async () => {
    const invalidApp = buildServer()
    const listEvidence = vi.spyOn(invalidApp.persistence.audit, 'listEvidence')
    const summarizeEvidence = vi.spyOn(
      invalidApp.persistence.audit,
      'summarizeEvidence'
    )
    const invalid = await invalidApp.inject({
      method: 'GET',
      url: '/v1/observability/audit-evidence?limit=1&offset=10001',
      headers: supervisorHeaders
    })
    await invalidApp.close()

    const validApp = buildServer()
    const valid = await validApp.inject({
      method: 'GET',
      url: '/v1/observability/audit-evidence?limit=1&offset=10000',
      headers: supervisorHeaders
    })
    await validApp.close()

    expect(invalid.statusCode).toBe(400)
    expect(invalid.json().error).toMatchObject({
      code: 'invalid_pagination',
      message:
        'limit must be between 1 and 100 and offset must be between 0 and 10000'
    })
    expect(listEvidence).not.toHaveBeenCalled()
    expect(summarizeEvidence).not.toHaveBeenCalled()
    expect(valid.statusCode).toBe(200)
    expect(valid.json().data.page.pageInfo).toMatchObject({
      limit: 1,
      offset: 10000
    })
  })

  it('rejects an unsafe conversation offset before a successful page response', async () => {
    const app = buildServer()
    const listPage = vi.spyOn(app.persistence.conversations, 'listPage')
    const response = await app.inject({
      method: 'GET',
      url: '/v1/conversations?limit=1&offset=1e100',
      headers: operatorHeaders
    })
    await app.close()

    expect(response.statusCode).toBe(400)
    expect(response.json().error).toMatchObject({
      code: 'invalid_pagination',
      message:
        'limit must be between 1 and 100 and offset must be between 0 and 10000'
    })
    expect(listPage).not.toHaveBeenCalled()
  })
})
