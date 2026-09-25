/**
 * Responsibility: own request context, tenant, identity, timing and raw bodies.
 */
import {
  ChannelSchema,
  DomainError,
  parseOperatorIdentity,
  roleHasPermission,
  type Channel,
  type IdentityMode,
  type OperatorIdentity,
  type OperatorIdentityResolver
} from '@cvg/shared'
import { TenantIdSchema, type TenantId } from '@cvg/platform'
import { createInvalidJsonBodyError } from '../http-request-boundary.ts'
import type { ControlledRequestMetrics } from '../request-metrics.ts'

type RequestMetricRoute = { url?: string | undefined }
type RequestMetricRequest = { method: string; routeOptions: RequestMetricRoute }
type RequestMetricsSink = Pick<ControlledRequestMetrics, 'record'>
type RequestMetricHook = (request: RequestMetricRequest) => void | Promise<void>
type RequestResponseHook = (
  request: RequestMetricRequest,
  reply: { statusCode: number }
) => void | Promise<void>
type ParserDone = (error: Error | null, value?: unknown) => void
type JsonParser = (request: object, body: string, done: ParserDone) => void
type RequestHeaders = Record<string, unknown>
type OperatorResolver = OperatorIdentityResolver | undefined
export interface RequestContextRegistrar {
  addHook(name: 'onRequest', handler: RequestMetricHook): unknown
  addHook(name: 'onResponse', handler: RequestResponseHook): unknown
  removeContentTypeParser(contentType: 'application/json'): unknown
  addContentTypeParser(
    contentType: 'application/json',
    options: { parseAs: 'string' },
    parser: JsonParser
  ): unknown
}
function installRequestMetricsHooks(
  app: RequestContextRegistrar,
  requestMetrics: RequestMetricsSink,
  now: () => number
): void {
  const startsAt = new WeakMap<object, number>()
  app.addHook('onRequest', async (request) => void startsAt.set(request, now()))
  app.addHook('onResponse', async (request, reply) => {
    const startedAt = startsAt.get(request) ?? now()
    requestMetrics.record({
      method: request.method,
      routeTemplate: request.routeOptions.url,
      statusCode: reply.statusCode,
      latencyMs: Math.max(0, now() - startedAt)
    })
    startsAt.delete(request)
  })
}
function installRawBodyParser(app: RequestContextRegistrar) {
  const rawBodyByRequest = new WeakMap<object, string>()
  app.removeContentTypeParser('application/json')
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (request, body, done) => {
      rawBodyByRequest.set(request, body)
      try {
        done(null, JSON.parse(body))
      } catch {
        done(createInvalidJsonBodyError())
      }
    }
  )
  return (request: object) => rawBodyByRequest.get(request)
}
export type InboundTenantResolver = (input: {
  headers: Record<string, unknown>
  body: unknown
  channel: Channel
}) => TenantId | Promise<TenantId>

export function createRequestContext(input: {
  nodeEnv: string | undefined
  controlledTenantId: TenantId
}) {
  const { nodeEnv, controlledTenantId } = input

  function parseInboundChannel(rawChannel: string): Channel {
    const parsed = ChannelSchema.safeParse(rawChannel)
    if (!parsed.success) {
      throw new DomainError('validation_failed', 'Channel is invalid')
    }
    return parsed.data
  }

  async function resolveInboundTenant(
    request: Parameters<InboundTenantResolver>[0],
    resolver?: InboundTenantResolver
  ): Promise<TenantId> {
    if (resolver) return TenantIdSchema.parse(await resolver(request))
    if (nodeEnv !== 'test') {
      throw new DomainError(
        'unauthorized',
        'A trusted inbound tenant resolver is required in production'
      )
    }
    const rawHeader = request.headers['x-tenant-id']
    const candidate = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader
    const parsed = TenantIdSchema.safeParse(candidate)
    return parsed.success ? parsed.data : controlledTenantId
  }

  function resolveDataPlaneTenant(
    headers: Record<string, unknown>,
    identity: OperatorIdentity
  ): TenantId {
    const rawHeader = headers['x-tenant-id']
    const candidate = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader
    const parsedHeader = TenantIdSchema.safeParse(candidate)
    if (
      identity.tenantId &&
      parsedHeader.success &&
      identity.tenantId !== parsedHeader.data
    ) {
      throw new DomainError(
        'forbidden',
        'Operator identity cannot access this tenant scope'
      )
    }
    if (nodeEnv !== 'test' && !identity.tenantId) {
      throw new DomainError(
        'unauthorized',
        'Trusted operator tenant scope is required in production'
      )
    }
    return (
      identity.tenantId ??
      (parsedHeader.success ? parsedHeader.data : controlledTenantId)
    )
  }

  function journeyAuditContext(
    identity: OperatorIdentity | null,
    correlationId: string
  ): {
    actorType: 'Operator' | 'System'
    actorId: string
    correlationId: string
  } {
    if (!identity) {
      return {
        actorType: 'System',
        actorId: 'system.journey-repository',
        correlationId
      }
    }
    return {
      actorType: 'Operator',
      actorId: identity.operatorId,
      correlationId
    }
  }

  function resolveOptionalRequestTenant(
    headers: Record<string, unknown>
  ): TenantId {
    const rawHeader = headers['x-tenant-id']
    const candidate = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader
    const parsed = TenantIdSchema.safeParse(candidate)
    if (nodeEnv !== 'test' && !parsed.success) {
      throw new DomainError(
        'unauthorized',
        'Trusted tenant scope is required for this mutation'
      )
    }
    return parsed.success ? parsed.data : controlledTenantId
  }

  function resolveOperatorIdentity(
    headers: Record<string, unknown>,
    resolver?: OperatorIdentityResolver
  ): OperatorIdentity {
    if (resolver) return resolver(headers)
    if (nodeEnv !== 'test') {
      throw new DomainError(
        'unauthorized',
        'A trusted operator identity resolver is required in production'
      )
    }
    return parseOperatorIdentity(headers)
  }

  /**
   * Trusted mode fails closed and requires a tenant-bound resolver result.
   * Memoization stays scoped to this API composition and keys each request by
   * its headers object so a replay in another request reaches the resolver.
   */
  function createEffectiveOperatorIdentityResolver(
    identityMode: IdentityMode,
    resolver: OperatorIdentityResolver | undefined
  ): OperatorIdentityResolver | undefined {
    if (!resolver) {
      if (identityMode === 'trusted') {
        return () => {
          throw new DomainError(
            'unauthorized',
            'A trusted operator identity resolver is required in production'
          )
        }
      }
      return undefined
    }
    if (identityMode === 'simulation') return resolver
    const memo = new WeakMap<object, OperatorIdentity>()
    return (headers) => {
      const cached = memo.get(headers)
      if (cached) return cached
      const identity = resolver(headers)
      if (!identity.tenantId) {
        throw new DomainError(
          'unauthorized',
          'Trusted operator identity must be tenant-bound'
        )
      }
      memo.set(headers, identity)
      return identity
    }
  }

  function requireOperatorIdentity(
    headers: Record<string, unknown>,
    permission: string,
    resolver?: OperatorIdentityResolver
  ): OperatorIdentity {
    try {
      const identity = resolveOperatorIdentity(headers, resolver)
      if (!roleHasPermission(identity.role, permission)) {
        throw new DomainError('forbidden', `Role cannot perform ${permission}`)
      }
      return identity
    } catch (error) {
      if (error instanceof DomainError) throw error
      throw new DomainError(
        'unauthorized',
        'Valid operator identity headers are required'
      )
    }
  }
  function requireAnyOperatorPermission(
    headers: Record<string, unknown>,
    permissions: string[],
    resolver?: OperatorIdentityResolver
  ): OperatorIdentity {
    try {
      const identity = resolveOperatorIdentity(headers, resolver)
      if (
        !permissions.some((permission) =>
          roleHasPermission(identity.role, permission)
        )
      ) {
        throw new DomainError('forbidden', 'Role cannot access this resource')
      }
      return identity
    } catch (error) {
      if (error instanceof DomainError) throw error
      throw new DomainError(
        'unauthorized',
        'Valid operator identity headers are required'
      )
    }
  }
  const bindOperatorAuthorization = (resolver: OperatorResolver) => ({
    requireIdentity: (headers: RequestHeaders, permission: string) =>
      requireOperatorIdentity(headers, permission, resolver),
    requireAnyIdentity: (headers: RequestHeaders, permissions: string[]) =>
      requireAnyOperatorPermission(headers, permissions, resolver)
  })
  function requirePlatformScope(
    headers: Record<string, unknown>,
    permission: string,
    resolver?: OperatorIdentityResolver
  ): { tenantId: TenantId } {
    const identity = requireOperatorIdentity(headers, permission, resolver)
    const rawTenant = Array.isArray(headers['x-tenant-id'])
      ? headers['x-tenant-id'][0]
      : headers['x-tenant-id']
    const tenant = TenantIdSchema.safeParse(rawTenant)
    if (!tenant.success) {
      throw new DomainError(
        'unauthorized',
        'Valid tenant scope headers are required'
      )
    }
    if (identity.tenantId && identity.tenantId !== tenant.data) {
      throw new DomainError(
        'forbidden',
        'Operator identity cannot access this tenant scope'
      )
    }
    if (nodeEnv !== 'test' && !identity.tenantId) {
      throw new DomainError(
        'unauthorized',
        'Trusted operator tenant scope is required in production'
      )
    }
    return { tenantId: tenant.data }
  }

  return {
    bindOperatorAuthorization,
    createEffectiveOperatorIdentityResolver,
    installRawBodyParser,
    installRequestMetricsHooks,
    journeyAuditContext,
    parseInboundChannel,
    requireAnyOperatorPermission,
    requireOperatorIdentity,
    requirePlatformScope,
    resolveDataPlaneTenant,
    resolveInboundTenant,
    resolveOperatorIdentity,
    resolveOptionalRequestTenant,
    requiresAuthenticatedMutations: (
      identityMode: IdentityMode,
      override: boolean | undefined
    ): boolean =>
      nodeEnv !== 'test' || identityMode !== 'simulation' || (override ?? false)
  }
}
