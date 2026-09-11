import { describe, expect, it } from 'vitest'
import {
  CHAOS_SCENARIO_IDS,
  ChaosLedger,
  abortableDelay,
  sequenceFetch
} from '../index.ts'

describe('chaos fault primitives', () => {
  it('scripts fetch responses and exhausts deterministically', async () => {
    const fetchImpl = sequenceFetch([
      { status: 200, body: '{"ok":true}' },
      { status: 503 },
      { error: new Error('connection reset') }
    ])
    expect((await fetchImpl('https://x')).status).toBe(200)
    expect((await fetchImpl('https://x')).status).toBe(503)
    await expect(fetchImpl('https://x')).rejects.toThrow('connection reset')
    await expect(fetchImpl('https://x')).rejects.toThrow('exhausted')
  })

  it('delays and aborts', async () => {
    await abortableDelay(1)
    const controller = new AbortController()
    controller.abort()
    await expect(
      abortableDelay(1_000, controller.signal)
    ).rejects.toMatchObject({
      name: 'AbortError'
    })
  })

  it('records pass, fail and not-executed scenarios', () => {
    const ledger = new ChaosLedger()
    ledger.pass('CHAOS-01', 'a', 'ok')
    ledger.fail('CHAOS-02', 'b', 'bad')
    ledger.notExecuted('CHAOS-03', 'c', 'no env')
    expect(ledger.get('CHAOS-01')?.status).toBe('PASS')
    expect(ledger.get('CHAOS-02')?.status).toBe('FAIL')
    expect(ledger.summary()).toEqual({
      executed: 2,
      passed: 1,
      failed: 1,
      notExecuted: 14
    })
    expect(ledger.all()).toHaveLength(CHAOS_SCENARIO_IDS.length)
  })
})
