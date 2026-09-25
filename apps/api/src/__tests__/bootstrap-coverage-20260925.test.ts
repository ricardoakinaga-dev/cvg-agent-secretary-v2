import { describe, expect, it, vi } from 'vitest'
import { InMemoryCapabilityApprovalAuthority } from '@cvg/platform'
import { PostgresApprovalAuthority } from '@cvg/persistence'
import {
  createCapabilityApprovalAuthority,
  createPersistence,
  createRuntimeApprovalAuthority,
  withDefaultCapabilityGateway,
  withDefaultInboundCompletion,
  withDefaultKnowledgeResolver
} from '../server/bootstrap-persistence.ts'

function fakeQueryable() {
  return {
    query: async () => {
      throw new Error('query must not run without database')
    }
  } as never
}

function fakePool() {
  return {
    connect: async () => {
      throw new Error('connect must not run without database')
    }
  } as never
}

describe('bootstrap persistence memory composition without database', () => {
  it('composes in-memory adapters for undefined config', () => {
    const persistence = createPersistence(undefined)

    expect(persistence.sessionVersionPinning).toBe(true)
    expect(persistence.outbox).toBeDefined()
    expect(persistence.orchestration).not.toBeNull()
    expect(persistence.journeys).not.toBeNull()
    expect(persistence.conversations).toBeDefined()
    expect(persistence.tasks.create).toBeTypeOf('function')
    expect(persistence.tasks.list).toBeTypeOf('function')
    expect(persistence.tasks.findById).toBeTypeOf('function')
    expect(persistence.tasks.updateStatus).toBeTypeOf('function')
    expect(persistence.approvals.save).toBeTypeOf('function')
    expect(persistence.approvals.decideWithAudit).toBeTypeOf('function')
    expect(persistence.audit.append).toBeTypeOf('function')
  })

  it('composes in-memory adapters for explicit memory kind', () => {
    const persistence = createPersistence({ kind: 'memory' })

    expect(persistence.sessionVersionPinning).toBe(true)
    expect(persistence.orchestration).not.toBeNull()
    expect(persistence.journeys).not.toBeNull()
  })

  it('honors an injected journey repository in memory mode', () => {
    const journeys = { kind: 'injected' }
    const persistence = createPersistence(undefined, journeys as never)

    expect(persistence.journeys).toBe(journeys)
  })

  it('honors an explicit null journey repository in memory mode', () => {
    const persistence = createPersistence(undefined, null)

    expect(persistence.journeys).toBeNull()
  })
})

describe('bootstrap persistence postgres composition without database', () => {
  it('composes postgres adapters without opening a connection', () => {
    const persistence = createPersistence({
      kind: 'postgres',
      client: fakeQueryable()
    })

    expect(persistence.sessionVersionPinning).toBe(false)
    expect(persistence.outbox).toBeDefined()
    expect(persistence.orchestration).toBeNull()
    expect(persistence.journeys).toBeDefined()
    expect(persistence.conversations).toBeDefined()
    expect(persistence.tasks.create).toBeTypeOf('function')
    expect(persistence.audit.append).toBeTypeOf('function')
  })

  it('composes tenant-scoped pool adapters without opening a connection', () => {
    const persistence = createPersistence({
      kind: 'postgres-pool',
      pool: fakePool()
    })

    expect(persistence.sessionVersionPinning).toBe(true)
    expect(persistence.orchestration).not.toBeNull()
    expect(persistence.journeys).toBeDefined()
  })

  it('honors an injected journey repository in postgres modes', () => {
    const journeys = { kind: 'injected-postgres' }
    const fromClient = createPersistence(
      { kind: 'postgres', client: fakeQueryable() },
      journeys as never
    )
    const fromPool = createPersistence(
      { kind: 'postgres-pool', pool: fakePool() },
      journeys as never
    )

    expect(fromClient.journeys).toBe(journeys)
    expect(fromPool.journeys).toBe(journeys)
  })

  it('fails closed when the postgres client cannot query', () => {
    expect(() =>
      createPersistence({ kind: 'postgres', client: {} as never })
    ).toThrow(/queryable persistence client/)
  })

  it('fails closed when the postgres pool cannot connect', () => {
    expect(() =>
      createPersistence({ kind: 'postgres-pool', pool: {} as never })
    ).toThrow(/pool adapter with connect/)
  })

  it('rejects a direct-client audit append without tenant scope before any query', async () => {
    const persistence = createPersistence({
      kind: 'postgres',
      client: fakeQueryable()
    })

    await expect(
      persistence.audit.append({} as never, undefined)
    ).rejects.toMatchObject({ code: 'unauthorized' })
  })
})

describe('bootstrap runtime approval authority without database', () => {
  it('returns undefined for memory persistence', () => {
    expect(createRuntimeApprovalAuthority(undefined)).toBeUndefined()
    expect(createRuntimeApprovalAuthority({ kind: 'memory' })).toBeUndefined()
  })

  it('wraps a pool without opening a connection', () => {
    const authority = createRuntimeApprovalAuthority({
      kind: 'postgres-pool',
      pool: fakePool()
    })

    expect(authority).toBeInstanceOf(PostgresApprovalAuthority)
  })

  it('wraps a single client without opening a connection', () => {
    const authority = createRuntimeApprovalAuthority({
      kind: 'postgres',
      client: fakeQueryable()
    })

    expect(authority).toBeInstanceOf(PostgresApprovalAuthority)
  })
})

describe('bootstrap capability and knowledge defaults without database', () => {
  it('leaves undefined runtime and existing gateways untouched', () => {
    const authority = { kind: 'authority' } as never
    const authorizer = { kind: 'authorizer' } as never

    expect(
      withDefaultCapabilityGateway(undefined, authority, authorizer)
    ).toBeUndefined()
    const configured = { capabilityGateway: { kind: 'existing' } }
    expect(
      withDefaultCapabilityGateway(configured as never, authority, authorizer)
    ).toBe(configured)
  })

  it('installs a controlled gateway when none is configured', () => {
    const runtime = { resolveAgentId: () => null }
    const result = withDefaultCapabilityGateway(
      runtime as never,
      { kind: 'authority' } as never,
      { kind: 'authorizer' } as never
    )

    expect(result).not.toBe(runtime)
    expect(result?.capabilityGateway).toBeDefined()
  })

  it('leaves knowledge resolution untouched without a resolver', () => {
    expect(withDefaultKnowledgeResolver(undefined, undefined)).toBeUndefined()
    const runtime = { resolveAgentId: () => null }
    expect(
      withDefaultKnowledgeResolver(runtime as never, undefined)
    ).toBe(runtime)
    const withResolver = { resolveApprovedKnowledge: vi.fn() }
    expect(
      withDefaultKnowledgeResolver(
        withResolver as never,
        vi.fn() as never
      )
    ).toBe(withResolver)
  })

  it('installs a knowledge resolver when one is provided', () => {
    const runtime = { resolveAgentId: () => null }
    const resolver = vi.fn()
    const result = withDefaultKnowledgeResolver(
      runtime as never,
      resolver as never
    )

    expect(result?.resolveApprovedKnowledge).toBe(resolver)
  })

  it('prefers a configured capability authority without touching pools', () => {
    const configured = { kind: 'configured-authority' } as never

    expect(
      createCapabilityApprovalAuthority(configured, undefined)
    ).toBe(configured)
    expect(
      createCapabilityApprovalAuthority(configured, {
        kind: 'postgres-pool',
        pool: fakePool()
      })
    ).toBe(configured)
  })

  it('selects pool-backed or in-memory capability authority by config', () => {
    const pooled = createCapabilityApprovalAuthority(undefined, {
      kind: 'postgres-pool',
      pool: fakePool()
    })
    const memory = createCapabilityApprovalAuthority(undefined, undefined)
    const explicitMemory = createCapabilityApprovalAuthority(undefined, {
      kind: 'memory'
    })
    const directClient = createCapabilityApprovalAuthority(undefined, {
      kind: 'postgres',
      client: fakeQueryable()
    })

    expect(pooled).toBeDefined()
    expect(pooled).not.toBeInstanceOf(InMemoryCapabilityApprovalAuthority)
    expect(memory).toBeInstanceOf(InMemoryCapabilityApprovalAuthority)
    expect(explicitMemory).toBeInstanceOf(InMemoryCapabilityApprovalAuthority)
    expect(directClient).toBeInstanceOf(InMemoryCapabilityApprovalAuthority)
  })
})

describe('bootstrap inbound completion without database', () => {
  it('leaves non-pool runtimes untouched without connecting', () => {
    expect(withDefaultInboundCompletion(undefined, undefined)).toBeUndefined()
    const runtime = { resolveAgentId: () => null }
    expect(
      withDefaultInboundCompletion(runtime as never, undefined)
    ).toBe(runtime)
    expect(
      withDefaultInboundCompletion(runtime as never, { kind: 'memory' })
    ).toBe(runtime)
    expect(
      withDefaultInboundCompletion(runtime as never, {
        kind: 'postgres',
        client: fakeQueryable()
      })
    ).toBe(runtime)
    const completed = {
      ...runtime,
      completeInboundRuntime: vi.fn()
    }
    expect(
      withDefaultInboundCompletion(completed as never, {
        kind: 'postgres-pool',
        pool: fakePool()
      })
    ).toBe(completed)
  })

  it('installs a pool-backed completion hook without opening a connection', () => {
    const runtime = { resolveAgentId: () => null }
    const result = withDefaultInboundCompletion(runtime as never, {
      kind: 'postgres-pool',
      pool: fakePool()
    })

    expect(result).not.toBe(runtime)
    expect(result?.completeInboundRuntime).toBeTypeOf('function')
  })
})
