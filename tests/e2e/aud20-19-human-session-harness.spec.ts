import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { installSyntheticA11ySessionRoutes } from './fixtures/synthetic-a11y-fixtures'

type RuntimeHarness = {
  authorizeViteRequest: (input: {
    method: string
    url: string
    browserHash?: string | null
  }) => { allowed: boolean }
  matchApiFixture: (input: {
    method: string
    url: string
    rawBody?: string
  }) => { allowed: boolean; ruleId?: string }
  makePageInterlockScript: () => string
  SESSION_ORIGIN: string
}

async function loadRuntimeHarness(): Promise<RuntimeHarness> {
  // @ts-expect-error: this allowlisted JavaScript helper is exercised as a runtime contract.
  return (await import('../../scripts/lib/aud20-19-human-session-harness.mjs')) as RuntimeHarness
}

function viteBrowserHash(): string | null {
  const metadataPath = path.resolve('node_modules/.vite/deps/_metadata.json')
  try {
    const metadata = JSON.parse(readFileSync(metadataPath, 'utf8')) as {
      browserHash?: string
    }
    return /^[a-f0-9]{8}$/.test(metadata.browserHash ?? '')
      ? (metadata.browserHash ?? null)
      : null
  } catch {
    return null
  }
}

test('verify loads only the synthetic app and exposes the sandbox interlock', async ({
  browser
}) => {
  const {
    authorizeViteRequest,
    matchApiFixture,
    makePageInterlockScript,
    SESSION_ORIGIN
  } = await loadRuntimeHarness()
  const context = await browser.newContext({
    serviceWorkers: 'block',
    acceptDownloads: false
  })
  await context.routeWebSocket('**/*', (socket) => {
    socket.close({ code: 1008, reason: 'blocked_by_synthetic_harness' })
  })
  await context.route('**/*', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname.startsWith('/v1/') || url.pathname === '/health') {
      const api = matchApiFixture({
        method: request.method(),
        url: request.url(),
        rawBody: request.postData() ?? ''
      })
      if (!api.allowed) {
        await route.abort('blockedbyclient')
        return
      }
      await route.fallback()
      return
    }
    const vite = authorizeViteRequest({
      method: request.method(),
      url: request.url(),
      browserHash: viteBrowserHash()
    })
    if (!vite.allowed) {
      await route.abort('blockedbyclient')
      return
    }
    await route.continue()
  })
  await context.addInitScript({ content: makePageInterlockScript() })
  const page = await context.newPage()
  await installSyntheticA11ySessionRoutes(page)

  try {
    await page.goto(SESSION_ORIGIN, { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('status')).toHaveText(
      'Sandbox sintético: nenhum sistema real será alterado'
    )
    const identity = await page.evaluate(() => {
      return (
        window as typeof window & {
          __CVG_HARNESS_IDENTITY__?: {
            actor?: string
            tenant?: string
            role?: string
          }
        }
      ).__CVG_HARNESS_IDENTITY__
    })
    expect(identity).toEqual({
      actor: 'SYNTHETIC_SUPERVISOR',
      tenant: 'SYNTHETIC_TENANT',
      role: 'SYNTHETIC_SUPERVISOR'
    })

    const adminPayloads = await page.evaluate(async () => {
      const [runs, traces] = await Promise.all([
        fetch('/v1/admin/test-lab/runs?limit=10'),
        fetch('/v1/admin/execution-traces?limit=10')
      ])
      return Promise.all([runs.json(), traces.json()])
    })
    expect(adminPayloads).toEqual([
      {
        success: true,
        data: {
          items: [],
          pageInfo: { limit: 10, offset: 0, total: 0, hasNextPage: false }
        },
        error: null
      },
      {
        success: true,
        data: {
          items: [],
          pageInfo: { limit: 10, offset: 0, total: 0, hasNextPage: false }
        },
        error: null
      }
    ])

    const unknownReadWasDenied = await page.evaluate(async () => {
      try {
        await fetch('/v1/admin/test-lab/runs?limit=11')
        return false
      } catch {
        return true
      }
    })
    expect(unknownReadWasDenied).toBe(true)
  } finally {
    await context.close()
  }
})

test('verify rejects a non-local destination before the browser request is sent', async ({
  browser
}) => {
  const { authorizeViteRequest } = await loadRuntimeHarness()
  const context = await browser.newContext({
    serviceWorkers: 'block',
    acceptDownloads: false
  })
  await context.routeWebSocket('**/*', (socket) => {
    socket.close({ code: 1008, reason: 'blocked_by_synthetic_harness' })
  })
  await context.route('**/*', async (route) => {
    const policy = authorizeViteRequest({
      method: route.request().method(),
      url: route.request().url()
    })
    if (!policy.allowed) {
      await route.abort('blockedbyclient')
      return
    }
    await route.continue()
  })
  const page = await context.newPage()
  try {
    let blockedBeforeEgress = false
    try {
      await page.goto('https://example.invalid/pixel', { waitUntil: 'commit' })
    } catch {
      blockedBeforeEgress = true
    }
    expect(blockedBeforeEgress).toBe(true)
  } finally {
    await context.close()
  }
})
