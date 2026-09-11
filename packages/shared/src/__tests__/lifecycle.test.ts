import { describe, expect, it, vi } from 'vitest'
import {
  createShutdownController,
  type ShutdownEvent,
  type SignalSource
} from '../lifecycle.ts'

function fakeSignalSource() {
  const listeners = new Map<string, () => void>()
  const source: SignalSource = {
    once(event, listener) {
      listeners.set(event, listener)
      return source
    }
  }
  return {
    source,
    fire(event: 'SIGTERM' | 'SIGINT') {
      listeners.get(event)?.()
    }
  }
}

describe('graceful shutdown controller', () => {
  it('closes, flushes and exits cleanly on the first signal', async () => {
    const events: ShutdownEvent[] = []
    const close = vi.fn(async () => undefined)
    const flush = vi.fn(async () => undefined)
    const exit = vi.fn()
    const controller = createShutdownController({
      close,
      flush,
      exit,
      log: (event) => events.push(event)
    })
    const signals = fakeSignalSource()
    controller.install(signals.source)
    signals.fire('SIGTERM')
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0))
    expect(close).toHaveBeenCalledTimes(1)
    expect(flush).toHaveBeenCalledTimes(1)
    expect(events.map((event) => event.type)).toEqual([
      'shutdown.started',
      'shutdown.completed'
    ])
  })

  it('ignores repeated signals once shutdown started', async () => {
    const exit = vi.fn()
    const events: ShutdownEvent[] = []
    const controller = createShutdownController({
      close: async () => undefined,
      exit,
      log: (event) => events.push(event)
    })
    await controller.shutdown('SIGTERM')
    await controller.shutdown('SIGTERM')
    expect(exit).toHaveBeenCalledTimes(1)
    expect(
      events.filter((event) => event.type === 'shutdown.ignored')
    ).toHaveLength(1)
  })

  it('exits non-zero when close fails', async () => {
    const exit = vi.fn()
    const events: ShutdownEvent[] = []
    const controller = createShutdownController({
      close: async () => {
        throw new Error('pool close failed')
      },
      exit,
      log: (event) => events.push(event)
    })
    await controller.shutdown('SIGINT')
    expect(exit).toHaveBeenCalledWith(1)
    expect(events.some((event) => event.type === 'shutdown.failed')).toBe(true)
  })

  it('bounds a hung close with a timeout exit', async () => {
    vi.useFakeTimers()
    try {
      const exit = vi.fn()
      const events: ShutdownEvent[] = []
      const controller = createShutdownController({
        close: () => new Promise(() => undefined),
        exit,
        timeoutMs: 1_000,
        log: (event) => events.push(event)
      })
      void controller.shutdown('SIGTERM')
      await vi.advanceTimersByTimeAsync(1_001)
      expect(exit).toHaveBeenCalledWith(1)
      expect(events.some((event) => event.type === 'shutdown.timeout')).toBe(
        true
      )
    } finally {
      vi.useRealTimers()
    }
  })
})
