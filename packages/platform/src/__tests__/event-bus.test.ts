import { describe, expect, it, vi } from 'vitest'
import {
  PLATFORM_EVENT_NAMES,
  PlatformEventBus,
  PluginManifestSchema,
  PluginRegistry,
  type PlatformHookAuditEvent,
  type PlatformEventEnvelope,
  type PluginHookHandler,
  type PluginManifest
} from '../index.ts'
import type { TenantId } from '../ids.ts'
import type { TraceId } from '../ids.ts'

const tenantA = 'tenant_00000000-0000-4000-8000-000000000201' as TenantId
const tenantB = 'tenant_00000000-0000-4000-8000-000000000202' as TenantId
const eventName = 'policy.input.after' as const

function createManifest(
  overrides: Partial<PluginManifest> = {}
): PluginManifest {
  return PluginManifestSchema.parse({
    name: 'observer.controlled',
    version: '1.0.0',
    capabilities: [],
    permissions: [],
    tools: [],
    hooks: [eventName],
    dependencies: [],
    configSchemaVersion: '1',
    ...overrides
  })
}

function createPlugin(
  manifest: PluginManifest,
  hooks: Record<string, PluginHookHandler> = {}
) {
  return { manifest, handlers: {}, hooks }
}

describe('PlatformEventBus', () => {
  it('accepts only manifest-declared hooks and preserves them through registry snapshots', async () => {
    const observed: PlatformEventEnvelope[] = []
    const handler: PluginHookHandler = (event) => {
      observed.push(event)
    }
    const plugin = createPlugin(createManifest(), { [eventName]: handler })
    const registry = new PluginRegistry().register(plugin)
    const registered = registry.get('observer.controlled', '1.0.0')

    expect(registered?.hooks?.[eventName]).toBe(handler)

    const bus = new PlatformEventBus().registerPlugin({
      tenantId: tenantA,
      plugin: registered!
    })
    const result = await bus.emit({
      name: eventName,
      tenantId: tenantA,
      payload: { decision: 'allowed' }
    })

    expect(observed).toHaveLength(1)
    expect(result.deliveries).toEqual([
      expect.objectContaining({
        plugin: 'observer.controlled',
        version: '1.0.0',
        status: 'succeeded'
      })
    ])
    expect(bus.listSubscriptions()).toEqual([
      {
        tenantId: tenantA,
        plugin: 'observer.controlled',
        version: '1.0.0',
        eventName
      }
    ])

    await expect(
      bus.emit({
        name: 'event.unknown' as never,
        tenantId: tenantA,
        payload: {}
      })
    ).rejects.toMatchObject({ code: 'validation_failed' })
  })

  it('propagates the execution trace parent while keeping event ids local', async () => {
    const observed: PlatformEventEnvelope[] = []
    const audits: PlatformHookAuditEvent[] = []
    const plugin = createPlugin(createManifest(), {
      [eventName]: (event) => {
        observed.push(event)
      }
    })
    const traceId = 'trace_00000000-0000-4000-8000-000000000201' as TraceId
    const bus = new PlatformEventBus({
      onAudit: (audit) => {
        audits.push(audit)
      }
    }).registerPlugin({ tenantId: tenantA, plugin })

    const result = await bus.emit({
      name: eventName,
      tenantId: tenantA,
      traceId,
      payload: { decision: 'allowed' }
    })

    expect(result.event.traceId).toBe(traceId)
    expect(observed[0]?.traceId).toBe(traceId)
    expect(audits[0]?.traceId).toBe(traceId)
    expect(audits[0]?.correlationId).toBe(result.event.id)
    expect(result.event.id).not.toBe(traceId)
    expect(result.event.id).toMatch(/^corr_/)
  })

  it('rejects an invalid execution trace before delivering a hook', async () => {
    const handler = vi.fn<PluginHookHandler>(() => undefined)
    const bus = new PlatformEventBus().registerPlugin({
      tenantId: tenantA,
      plugin: createPlugin(createManifest(), { [eventName]: handler })
    })

    await expect(
      bus.emit({
        name: eventName,
        tenantId: tenantA,
        traceId: 'trace-invalid' as never,
        payload: {}
      })
    ).rejects.toMatchObject({ code: 'validation_failed' })
    expect(handler).not.toHaveBeenCalled()
  })

  it('rejects undeclared or missing hook handlers before subscribing', () => {
    const undeclared = createPlugin(createManifest(), {
      'message.received': vi.fn()
    })
    expect(() =>
      new PlatformEventBus().registerPlugin({
        tenantId: tenantA,
        plugin: undeclared
      })
    ).toThrow(/declared|manifest/i)

    const missing = createPlugin(createManifest())
    expect(() =>
      new PlatformEventBus().registerPlugin({
        tenantId: tenantA,
        plugin: missing
      })
    ).toThrow(/handler/i)
  })

  it('redacts payloads, freezes nested values and does not mutate the source', async () => {
    const original = {
      email: 'patient@example.com',
      nested: { body: 'raw clinical content', safe: 'kept' },
      safe: ['one', 'two']
    }
    const observed: PlatformEventEnvelope[] = []
    const handler: PluginHookHandler = (event) => {
      observed.push(event)
      Reflect.set(event.payload as object, 'mutated', true)
      Reflect.set((event.payload.nested as object) ?? {}, 'safe', 'changed')
    }
    const bus = new PlatformEventBus().registerPlugin({
      tenantId: tenantA,
      plugin: createPlugin(createManifest(), { [eventName]: handler })
    })

    const result = await bus.emit({
      name: eventName,
      tenantId: tenantA,
      payload: original
    })

    expect(result.event.payload).toEqual({
      nested: { safe: 'kept' },
      safe: ['one', 'two']
    })
    expect(result.event.payload).not.toHaveProperty('email')
    expect(JSON.stringify(result.event)).not.toContain('patient@example.com')
    expect(Object.isFrozen(observed[0])).toBe(true)
    expect(Object.isFrozen(observed[0]?.payload)).toBe(true)
    expect(Object.isFrozen(observed[0]?.payload.nested)).toBe(true)
    expect(Object.isFrozen(observed[0]?.payload.safe)).toBe(true)
    expect(original).toEqual({
      email: 'patient@example.com',
      nested: { body: 'raw clinical content', safe: 'kept' },
      safe: ['one', 'two']
    })
  })

  it('isolates hook failures, sanitizes audit errors and keeps subscriptions immutable', async () => {
    const audits: PlatformHookAuditEvent[] = []
    const failing: PluginHookHandler = () => {
      throw new Error('hook failed for plugin@example.com token=sk-live-secret')
    }
    const succeeding = vi.fn<PluginHookHandler>(() => undefined)
    const firstBus = new PlatformEventBus({
      onAudit: (audit) => {
        audits.push(audit)
      }
    })
    const bus = firstBus
      .registerPlugin({
        tenantId: tenantA,
        plugin: createPlugin(createManifest({ name: 'failing.observer' }), {
          [eventName]: failing
        })
      })
      .registerPlugin({
        tenantId: tenantA,
        plugin: createPlugin(createManifest({ name: 'succeeding.observer' }), {
          [eventName]: succeeding
        })
      })

    expect(firstBus.listSubscriptions()).toHaveLength(0)
    const result = await bus.emit({
      name: eventName,
      tenantId: tenantA,
      payload: { safe: true }
    })

    expect(succeeding).toHaveBeenCalledOnce()
    expect(result.deliveries.map((delivery) => delivery.status)).toEqual([
      'failed',
      'succeeded'
    ])
    expect(audits).toHaveLength(2)
    expect(audits[0]).toMatchObject({
      type: 'plugin_hook',
      plugin: 'failing.observer',
      status: 'failed'
    })
    expect(audits[0]?.error).toContain('[redacted-email]')
    expect(audits[0]?.error).not.toContain('plugin@example.com')
    expect(audits[0]?.error).not.toContain('sk-live-secret')
  })

  it('enforces tenant and scope validation before delivery', async () => {
    const handler = vi.fn<PluginHookHandler>(() => undefined)
    const bus = new PlatformEventBus().registerPlugin({
      tenantId: tenantA,
      plugin: createPlugin(createManifest(), { [eventName]: handler })
    })

    const otherTenant = await bus.emit({
      name: eventName,
      tenantId: tenantB,
      payload: {}
    })
    expect(otherTenant.deliveries).toEqual([])
    expect(handler).not.toHaveBeenCalled()

    expect(() =>
      new PlatformEventBus().registerPlugin({
        tenantId: 'tenant-invalid' as TenantId,
        plugin: createPlugin(createManifest(), { [eventName]: handler })
      })
    ).toThrow(/tenant/i)

    await expect(
      bus.emit({
        name: eventName,
        tenantId: tenantA,
        agentId: 'agent-invalid' as never,
        payload: {}
      })
    ).rejects.toMatchObject({ code: 'validation_failed' })
  })

  it('exposes the complete controlled event allowlist as a stable contract', () => {
    expect(PLATFORM_EVENT_NAMES).toEqual(
      expect.arrayContaining([
        'message.received',
        'message.normalized',
        'conversation.loaded',
        'context.loaded',
        'agent.resolved',
        'policy.input.before',
        'policy.input.after',
        'policy.output.before',
        'policy.output.after',
        'intent.before',
        'intent.after',
        'knowledge.before',
        'knowledge.after',
        'prompt.before',
        'prompt.after',
        'model.before',
        'model.after',
        'model.error',
        'tool.before',
        'tool.after',
        'tool.error',
        'response.before',
        'response.after',
        'handoff.requested',
        'handoff.created',
        'handoff.failed',
        'human_takeover.started',
        'human_takeover.ended',
        'message.delivery.before',
        'message.delivery.after',
        'conversation.completed',
        'security.blocked',
        'plugin.started',
        'plugin.stopped',
        'plugin.error'
      ])
    )
  })
})
