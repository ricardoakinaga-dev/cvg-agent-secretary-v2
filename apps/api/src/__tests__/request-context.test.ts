import { describe, expect, it, vi } from 'vitest'
import { DomainError, type Channel, type OperatorIdentity } from '@cvg/shared'
import { TenantIdSchema } from '@cvg/platform'
import {
  createRequestContext,
  type RequestContextRegistrar
} from '../server/request-context.ts'
import type { RequestMetricRecord } from '../request-metrics.ts'

const tenantA = TenantIdSchema.parse(
  'tenant_00000000-0000-4000-8000-0000000000a1'
)
const tenantB = TenantIdSchema.parse(
  'tenant_00000000-0000-4000-8000-0000000000a2'
)
const controlledTenant = TenantIdSchema.parse(
  'tenant_00000000-0000-4000-8000-0000000000a3'
)
type RequestMetricRoute = { url?: string | undefined }
type RequestMetricRequest = { method: string; routeOptions: RequestMetricRoute }
type RequestMetricReply = { statusCode: number }

function context(nodeEnv = 'test') {
  return createRequestContext({ nodeEnv, controlledTenantId: controlledTenant })
}

function identity(
  role: OperatorIdentity['role'] = 'Supervisor',
  tenantId: OperatorIdentity['tenantId'] = tenantA
): OperatorIdentity {
  return { operatorId: 'operator.request-context', role, tenantId }
}

function unboundIdentity(): OperatorIdentity {
  return { operatorId: 'operator.request-context', role: 'Supervisor' }
}

function expectDomainError(run: () => unknown, code: string, message: string) {
  let caught: unknown
  try {
    run()
  } catch (error) {
    caught = error
  }
  expect(caught).toBeInstanceOf(DomainError)
  expect(caught).toMatchObject({ code, message })
}

type JsonParserCallback = Parameters<
  RequestContextRegistrar['addContentTypeParser']
>[2]

class TestRegistrar implements RequestContextRegistrar {
  hookOrder: string[] = []
  bodyParserOperations: string[] = []
  onRequestHandler?: (request: RequestMetricRequest) => void | Promise<void>
  onResponseHandler?: (
    request: RequestMetricRequest,
    reply: RequestMetricReply
  ) => void | Promise<void>
  jsonParser?: JsonParserCallback
  parserMode?: 'string'

  addHook(
    name: 'onRequest',
    handler: (request: RequestMetricRequest) => void | Promise<void>
  ): unknown
  addHook(
    name: 'onResponse',
    handler: (
      request: RequestMetricRequest,
      reply: RequestMetricReply
    ) => void | Promise<void>
  ): unknown
  addHook(
    name: 'onRequest' | 'onResponse',
    handler:
      | ((request: RequestMetricRequest) => void | Promise<void>)
      | ((
          request: RequestMetricRequest,
          reply: RequestMetricReply
        ) => void | Promise<void>)
  ): unknown {
    this.hookOrder.push(name)
    if (name === 'onRequest') {
      this.onRequestHandler = handler as (
        request: RequestMetricRequest
      ) => void | Promise<void>
    } else {
      this.onResponseHandler = handler as (
        request: RequestMetricRequest,
        reply: RequestMetricReply
      ) => void | Promise<void>
    }
    return undefined
  }

  removeContentTypeParser(contentType: 'application/json'): unknown {
    this.bodyParserOperations.push(`remove:${contentType}`)
    return undefined
  }

  addContentTypeParser(
    contentType: 'application/json',
    options: { parseAs: 'string' },
    parser: JsonParserCallback
  ): unknown {
    this.bodyParserOperations.push(`add:${contentType}`)
    this.parserMode = options.parseAs
    this.jsonParser = parser
    return undefined
  }
}

describe('request-context direct contracts', () => {
  it('records bounded timing dimensions and cleans request state', async () => {
    const registrar = new TestRegistrar()
    const times = [100, 95, 200, 204]
    const now = vi.fn(() => times.shift() ?? 0)
    const records: RequestMetricRecord[] = []
    const requestContext = context()
    requestContext.installRequestMetricsHooks(
      registrar,
      { record: (input) => records.push(input) },
      now
    )
    const request = {
      method: 'POST',
      routeOptions: { url: '/v1/webhooks/channels/:channel/messages' },
      headers: { authorization: 'synthetic-secret' },
      body: { payload: 'synthetic' }
    }

    expect(registrar.hookOrder).toEqual(['onRequest', 'onResponse'])
    await registrar.onRequestHandler?.(request)
    await registrar.onResponseHandler?.(request, { statusCode: 202 })
    await registrar.onResponseHandler?.(request, { statusCode: 500 })

    expect(records).toEqual([
      {
        method: 'POST',
        routeTemplate: '/v1/webhooks/channels/:channel/messages',
        statusCode: 202,
        latencyMs: 0
      },
      {
        method: 'POST',
        routeTemplate: '/v1/webhooks/channels/:channel/messages',
        statusCode: 500,
        latencyMs: 4
      }
    ])
    expect(now).toHaveBeenCalledTimes(4)
  })

  it('preserves exact JSON bytes and maps parser errors through the boundary', () => {
    const registrar = new TestRegistrar()
    const getRawBody = context().installRawBodyParser(registrar)
    const request = {}
    const rawRequest = {}
    const rawJson = '{ "synthetic" : true }\n'
    let parsed: { error: Error | null; value?: unknown } | undefined
    const parser = registrar.jsonParser
    if (!parser) throw new Error('synthetic JSON parser was not registered')

    expect(registrar.bodyParserOperations).toEqual([
      'remove:application/json',
      'add:application/json'
    ])
    expect(registrar.parserMode).toBe('string')
    parser(request, rawJson, (error, value) => {
      parsed = { error, value }
    })

    expect(parsed).toEqual({ error: null, value: { synthetic: true } })
    expect(getRawBody(request)).toBe(rawJson)
    expect(getRawBody(rawRequest)).toBeUndefined()

    const malformedRequest = {}
    const malformedBody = '{"broken":'
    let parseError: Error | null | undefined
    parser(malformedRequest, malformedBody, (error) => {
      parseError = error
    })
    expect(getRawBody(malformedRequest)).toBe(malformedBody)
    expect(parseError).toMatchObject({
      code: 'FST_ERR_CTP_INVALID_JSON_BODY',
      message: 'Invalid JSON body'
    })
  })

  it('parses supported inbound channels and preserves the validation error', () => {
    const requestContext = context()

    expect(requestContext.parseInboundChannel('whatsapp')).toBe('whatsapp')
    expect(requestContext.parseInboundChannel('web')).toBe('web')
    expect(requestContext.parseInboundChannel('internal')).toBe('internal')
    expectDomainError(
      () => requestContext.parseInboundChannel('unsupported'),
      'validation_failed',
      'Channel is invalid'
    )
  })

  it('resolves inbound tenant from its resolver, then controlled test inputs', async () => {
    const requestContext = context()
    const input = {
      headers: { 'x-tenant-id': [tenantA] },
      body: { fixture: true },
      channel: 'web' as Channel
    }

    await expect(
      requestContext.resolveInboundTenant(input, async () => tenantB)
    ).resolves.toBe(tenantB)
    await expect(requestContext.resolveInboundTenant(input)).resolves.toBe(
      tenantA
    )
    await expect(
      requestContext.resolveInboundTenant({ ...input, headers: {} })
    ).resolves.toBe(controlledTenant)

    await expect(
      context('production').resolveInboundTenant(input)
    ).rejects.toMatchObject({
      code: 'unauthorized',
      message: 'A trusted inbound tenant resolver is required in production'
    })
  })

  it('binds data-plane tenant to identity and keeps default deny', () => {
    const requestContext = context()

    expect(
      requestContext.resolveDataPlaneTenant(
        { 'x-tenant-id': tenantA },
        identity('Supervisor', tenantA)
      )
    ).toBe(tenantA)
    expect(requestContext.resolveDataPlaneTenant({}, unboundIdentity())).toBe(
      controlledTenant
    )
    expectDomainError(
      () =>
        requestContext.resolveDataPlaneTenant(
          { 'x-tenant-id': tenantB },
          identity('Supervisor', tenantA)
        ),
      'forbidden',
      'Operator identity cannot access this tenant scope'
    )
    expectDomainError(
      () =>
        context('production').resolveDataPlaneTenant(
          { 'x-tenant-id': tenantA },
          unboundIdentity()
        ),
      'unauthorized',
      'Trusted operator tenant scope is required in production'
    )
  })

  it('resolves optional mutation tenant with the existing trusted failure', () => {
    expect(context().resolveOptionalRequestTenant({})).toBe(controlledTenant)
    expect(
      context().resolveOptionalRequestTenant({ 'x-tenant-id': tenantA })
    ).toBe(tenantA)
    expectDomainError(
      () => context('production').resolveOptionalRequestTenant({}),
      'unauthorized',
      'Trusted tenant scope is required for this mutation'
    )
  })

  it('resolves identity, checks permissions, and preserves denied-role errors', () => {
    const requestContext = context()
    const headers = {
      'x-operator-id': 'operator.header-fixture',
      'x-operator-role': 'Operator',
      'x-tenant-id': tenantA
    }

    expect(requestContext.resolveOperatorIdentity(headers).operatorId).toBe(
      'operator.header-fixture'
    )
    expect(
      requestContext.requireOperatorIdentity(headers, 'task:view').role
    ).toBe('Operator')
    expect(
      requestContext.requireAnyOperatorPermission(headers, [
        'approval:decide',
        'task:view'
      ]).role
    ).toBe('Operator')
    expectDomainError(
      () => requestContext.requireOperatorIdentity(headers, 'approval:decide'),
      'forbidden',
      'Role cannot perform approval:decide'
    )
    expectDomainError(
      () =>
        requestContext.requireAnyOperatorPermission(headers, [
          'approval:decide'
        ]),
      'forbidden',
      'Role cannot access this resource'
    )
    expectDomainError(
      () =>
        requestContext.requireOperatorIdentity({}, 'task:view', () => {
          throw new Error('synthetic resolver failure')
        }),
      'unauthorized',
      'Valid operator identity headers are required'
    )
    expectDomainError(
      () => context('production').resolveOperatorIdentity({}),
      'unauthorized',
      'A trusted operator identity resolver is required in production'
    )
  })

  it('binds authorization helpers to the supplied identity resolver', () => {
    const operatorResolver = vi.fn(() => identity('Operator'))
    const authorization = context().bindOperatorAuthorization(operatorResolver)

    expect(authorization.requireIdentity({}, 'task:view')).toEqual(
      identity('Operator')
    )
    expect(authorization.requireAnyIdentity({}, ['task:view'])).toEqual(
      identity('Operator')
    )
    expect(operatorResolver).toHaveBeenCalledTimes(2)
    expectDomainError(
      () => authorization.requireIdentity({}, 'approval:decide'),
      'forbidden',
      'Role cannot perform approval:decide'
    )
    expectDomainError(
      () => authorization.requireAnyIdentity({}, ['approval:decide']),
      'forbidden',
      'Role cannot access this resource'
    )
  })

  it('keeps authenticated-mutation defaults across environment and identity modes', () => {
    const overrides = [undefined, false, true] as const
    const cases = [
      { nodeEnv: 'test', simulation: [false, false, true] },
      { nodeEnv: 'development', simulation: [true, true, true] },
      { nodeEnv: 'production', simulation: [true, true, true] },
      { nodeEnv: undefined, simulation: [true, true, true] }
    ] as const

    for (const { nodeEnv, simulation } of cases) {
      const requestContext = createRequestContext({
        nodeEnv,
        controlledTenantId: controlledTenant
      })
      overrides.forEach((override, index) => {
        expect(
          requestContext.requiresAuthenticatedMutations('simulation', override)
        ).toBe(simulation[index])
        expect(
          requestContext.requiresAuthenticatedMutations('trusted', override)
        ).toBe(true)
      })
    }
  })

  it('validates platform tenant headers against identity scope', () => {
    const requestContext = context()
    const resolver = () => identity('Supervisor', tenantA)

    expect(
      requestContext.requirePlatformScope(
        { 'x-tenant-id': tenantA },
        'task:view',
        resolver
      )
    ).toEqual({ tenantId: tenantA })
    expectDomainError(
      () => requestContext.requirePlatformScope({}, 'task:view', resolver),
      'unauthorized',
      'Valid tenant scope headers are required'
    )
    expectDomainError(
      () =>
        requestContext.requirePlatformScope(
          { 'x-tenant-id': tenantB },
          'task:view',
          resolver
        ),
      'forbidden',
      'Operator identity cannot access this tenant scope'
    )
  })

  it('maps journey audit context to the operator or system actor', () => {
    const requestContext = context()

    expect(requestContext.journeyAuditContext(null, 'corr-synthetic')).toEqual({
      actorType: 'System',
      actorId: 'system.journey-repository',
      correlationId: 'corr-synthetic'
    })
    expect(
      requestContext.journeyAuditContext(identity(), 'corr-synthetic')
    ).toEqual({
      actorType: 'Operator',
      actorId: 'operator.request-context',
      correlationId: 'corr-synthetic'
    })
  })

  it('memoizes trusted identity only per headers object and rejects unbound tenants', () => {
    const requestContext = context()
    let resolverCalls = 0
    const resolver = () => {
      resolverCalls += 1
      return identity()
    }
    const effective = requestContext.createEffectiveOperatorIdentityResolver(
      'trusted',
      resolver
    )

    expect(effective).toBeTypeOf('function')
    const headers = { 'x-cvg-operator-token': 'synthetic-token' }
    const first = effective?.(headers)
    const second = effective?.(headers)
    const replayedInNewRequest = effective?.({
      'x-cvg-operator-token': 'synthetic-token'
    })
    expect(first).toBe(second)
    expect(replayedInNewRequest).toEqual(first)
    expect(resolverCalls).toBe(2)

    const simulationWithoutResolver =
      requestContext.createEffectiveOperatorIdentityResolver(
        'simulation',
        undefined
      )
    expect(simulationWithoutResolver).toBeUndefined()
    const trustedWithoutResolver =
      requestContext.createEffectiveOperatorIdentityResolver(
        'trusted',
        undefined
      )
    expect(() => trustedWithoutResolver?.(headers)).toThrowError(
      expect.objectContaining({
        code: 'unauthorized',
        message:
          'A trusted operator identity resolver is required in production'
      })
    )
    const unbound = requestContext.createEffectiveOperatorIdentityResolver(
      'trusted',
      unboundIdentity
    )
    expect(() => unbound?.(headers)).toThrowError(
      expect.objectContaining({
        code: 'unauthorized',
        message: 'Trusted operator identity must be tenant-bound'
      })
    )
  })
})
