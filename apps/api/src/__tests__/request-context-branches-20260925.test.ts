import { describe, expect, it } from 'vitest'
import { DomainError, type OperatorIdentity } from '@cvg/shared'
import { TenantIdSchema } from '@cvg/platform'
import {
  createRequestContext,
  type RequestContextRegistrar
} from '../server/request-context.ts'

const tenantBranchA = TenantIdSchema.parse(
  'tenant_00000000-0000-4000-8000-0000000000b1'
)
const tenantBranchB = TenantIdSchema.parse(
  'tenant_00000000-0000-4000-8000-0000000000b2'
)
const controlledBranch = TenantIdSchema.parse(
  'tenant_00000000-0000-4000-8000-0000000000b3'
)

function branchContext(nodeEnv = 'test') {
  return createRequestContext({
    nodeEnv,
    controlledTenantId: controlledBranch
  })
}

function branchIdentity(
  tenantId: OperatorIdentity['tenantId'] = tenantBranchA
): OperatorIdentity {
  return {
    operatorId: 'operator.branch.20260925',
    role: 'Supervisor',
    tenantId
  }
}

function expectBranchError(run: () => unknown, code: string, message: string) {
  let caught: unknown
  try {
    run()
  } catch (error) {
    caught = error
  }
  expect(caught).toBeInstanceOf(DomainError)
  expect(caught).toMatchObject({ code, message })
}

type BranchParser = Parameters<
  RequestContextRegistrar['addContentTypeParser']
>[2]

class BranchRegistrar implements RequestContextRegistrar {
  jsonParser?: BranchParser

  addHook(): unknown {
    return undefined
  }

  removeContentTypeParser(): unknown {
    return undefined
  }

  addContentTypeParser(
    _contentType: 'application/json',
    _options: { parseAs: 'string' },
    parser: BranchParser
  ): unknown {
    this.jsonParser = parser
    return undefined
  }
}

describe('request context branch coverage 20260925', () => {
  it('resolves data-plane tenant from array headers and unbound valid headers', () => {
    const requestContext = branchContext()

    expect(
      requestContext.resolveDataPlaneTenant(
        { 'x-tenant-id': [tenantBranchA] },
        branchIdentity(tenantBranchA)
      )
    ).toBe(tenantBranchA)

    expect(
      requestContext.resolveDataPlaneTenant(
        { 'x-tenant-id': tenantBranchB },
        {
          operatorId: 'operator.branch.20260925',
          role: 'Supervisor'
        }
      )
    ).toBe(tenantBranchB)

    expect(
      requestContext.resolveDataPlaneTenant(
        { 'x-tenant-id': 'branch-invalid-tenant' },
        {
          operatorId: 'operator.branch.20260925',
          role: 'Supervisor'
        }
      )
    ).toBe(controlledBranch)

    expect(
      requestContext.resolveDataPlaneTenant(
        { 'x-tenant-id': 'branch-invalid-tenant' },
        branchIdentity(tenantBranchA)
      )
    ).toBe(tenantBranchA)
  })

  it('keeps production data-plane tenant bound to identity', () => {
    const production = branchContext('production')

    expect(
      production.resolveDataPlaneTenant(
        { 'x-tenant-id': tenantBranchA },
        branchIdentity(tenantBranchA)
      )
    ).toBe(tenantBranchA)

    expectBranchError(
      () =>
        production.resolveDataPlaneTenant(
          { 'x-tenant-id': [tenantBranchB] },
          branchIdentity(tenantBranchA)
        ),
      'forbidden',
      'Operator identity cannot access this tenant scope'
    )
  })

  it('resolves optional tenant from array headers and production values', () => {
    expect(
      branchContext().resolveOptionalRequestTenant({
        'x-tenant-id': [tenantBranchA]
      })
    ).toBe(tenantBranchA)

    expect(
      branchContext().resolveOptionalRequestTenant({
        'x-tenant-id': 'branch-invalid-tenant'
      })
    ).toBe(controlledBranch)

    expect(
      branchContext('production').resolveOptionalRequestTenant({
        'x-tenant-id': tenantBranchB
      })
    ).toBe(tenantBranchB)

    expectBranchError(
      () =>
        branchContext('production').resolveOptionalRequestTenant({
          'x-tenant-id': ['branch-invalid-tenant']
        }),
      'unauthorized',
      'Trusted tenant scope is required for this mutation'
    )
  })

  it('passes simulation resolvers through and honors production resolvers', () => {
    const requestContext = branchContext()
    const resolver = () => branchIdentity(tenantBranchA)

    expect(
      requestContext.createEffectiveOperatorIdentityResolver(
        'simulation',
        resolver
      )
    ).toBe(resolver)

    expect(
      branchContext('production').resolveOperatorIdentity({}, resolver)
    ).toEqual(branchIdentity(tenantBranchA))

    expect(
      branchContext('production').resolveOperatorIdentity(
        {},
        () => branchIdentity(undefined)
      )
    ).toEqual(branchIdentity(undefined))
  })

  it('resolves inbound tenant from production resolvers and invalid headers', async () => {
    const requestContext = branchContext()

    await expect(
      requestContext.resolveInboundTenant({
        headers: { 'x-tenant-id': 'branch-invalid-tenant' },
        body: { branch: '20260925' },
        channel: 'web'
      })
    ).resolves.toBe(controlledBranch)

    await expect(
      requestContext.resolveInboundTenant(
        {
          headers: { 'x-tenant-id': [tenantBranchA] },
          body: { branch: '20260925' },
          channel: 'web'
        },
        async () => tenantBranchB
      )
    ).resolves.toBe(tenantBranchB)

    await expect(
      branchContext('production').resolveInboundTenant(
        {
          headers: {},
          body: { branch: '20260925' },
          channel: 'web'
        },
        async () => tenantBranchA
      )
    ).resolves.toBe(tenantBranchA)
  })

  it('wraps non-domain failures for any-permission checks', () => {
    expectBranchError(
      () =>
        branchContext().requireAnyOperatorPermission({}, ['task:view'], () => {
          throw new Error('branch resolver failure 20260925')
        }),
      'unauthorized',
      'Valid operator identity headers are required'
    )

    expectBranchError(
      () =>
        branchContext().requireOperatorIdentity({}, 'task:view', () => {
          throw new RangeError('branch range failure 20260925')
        }),
      'unauthorized',
      'Valid operator identity headers are required'
    )
  })

  it('validates platform scope array headers and production binding', () => {
    const requestContext = branchContext()
    const bound = () => branchIdentity(tenantBranchA)
    const unbound = (): OperatorIdentity => ({
      operatorId: 'operator.branch.20260925',
      role: 'Supervisor'
    })

    expect(
      requestContext.requirePlatformScope(
        { 'x-tenant-id': [tenantBranchA] },
        'task:view',
        bound
      )
    ).toEqual({ tenantId: tenantBranchA })

    expect(
      requestContext.requirePlatformScope(
        { 'x-tenant-id': tenantBranchB },
        'task:view',
        unbound
      )
    ).toEqual({ tenantId: tenantBranchB })

    expectBranchError(
      () =>
        branchContext('production').requirePlatformScope(
          { 'x-tenant-id': tenantBranchB },
          'task:view',
          unbound
        ),
      'unauthorized',
      'Trusted operator tenant scope is required in production'
    )
  })

  it('preserves distinct raw JSON bytes and invalid payloads', () => {
    const registrar = new BranchRegistrar()
    const getRawBody = branchContext().installRawBodyParser(registrar)
    const parser = registrar.jsonParser
    if (!parser) throw new Error('branch JSON parser was not registered')

    const validRequest = {}
    let valid: { error: Error | null; value?: unknown } | undefined
    parser(validRequest, 'null', (error, value) => {
      valid = { error, value }
    })
    expect(valid).toEqual({ error: null, value: null })
    expect(getRawBody(validRequest)).toBe('null')

    const invalidRequest = {}
    const invalidBody = 'not-json-branch-20260925{'
    let invalidError: Error | null | undefined
    parser(invalidRequest, invalidBody, (error) => {
      invalidError = error
    })
    expect(getRawBody(invalidRequest)).toBe(invalidBody)
    expect(invalidError).toMatchObject({
      code: 'FST_ERR_CTP_INVALID_JSON_BODY',
      message: 'Invalid JSON body'
    })
  })
})
