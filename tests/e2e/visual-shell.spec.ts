import { expect, test } from '@playwright/test'

const viewports = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 900 },
  { name: 'wide-tablet', width: 1024, height: 900 },
  { name: 'desktop', width: 1440, height: 900 }
] as const

test('console shell preserves layout, focus and control sizing across viewports', async ({
  page
}) => {
  await page.addInitScript({
    content:
      "window.__CVG_OPERATOR_CONTEXT__ = { operatorId: 'supervisor.synthetic', role: 'Supervisor', tenantId: 'tenant_00000000-0000-4000-8000-0000000002c1' }"
  })
  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    await page.goto('/', { waitUntil: 'networkidle' })

    await expect(
      page.getByRole('heading', { name: 'CVG Agent Secretary' })
    ).toBeVisible()
    const skipLink = page.getByRole('link', {
      name: 'Pular para o console operacional'
    })
    await expect(skipLink).toBeAttached()
    await skipLink.focus()
    await skipLink.press('Enter')
    await expect(page.locator('#console-operacional')).toBeFocused()
    await expect(page.locator('#console-operacional')).toBeInViewport()

    const metrics = await page.evaluate(() => ({
      viewport: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      actionMinHeights: Array.from(
        document.querySelectorAll('.actions button, .sessionButton')
      ).map((element) => Number.parseFloat(getComputedStyle(element).minHeight))
    }))
    expect(
      metrics.scrollWidth,
      `${viewport.name} horizontal overflow`
    ).toBeLessThanOrEqual(metrics.viewport)
    expect(metrics.actionMinHeights.every((height) => height >= 40)).toBe(true)

    const identityDetails = page.locator('.identityDetails')
    const sessionButton = page.getByRole('button', { name: 'Encerrar sessão' })
    if ((await identityDetails.getAttribute('open')) === null) {
      const summary = identityDetails.locator('summary')
      await summary.focus()
      await summary.press('Enter')
      await page.keyboard.press('Tab')
    } else {
      await sessionButton.focus()
    }
    await expect
      .poll(() =>
        sessionButton.evaluate((element) => {
          const styles = getComputedStyle(element)
          return (
            document.activeElement === element &&
            (styles.outlineStyle !== 'none' || styles.boxShadow !== 'none')
          )
        })
      )
      .toBe(true)
    await expect(page).toHaveScreenshot(`console-${viewport.name}.png`, {
      animations: 'disabled',
      caret: 'hide',
      fullPage: false,
      maxDiffPixelRatio: 0.02
    })
  }
})

test('admin control center remains navigable on a narrow viewport', async ({
  page
}) => {
  await page.addInitScript({
    content:
      "window.__CVG_OPERATOR_CONTEXT__ = { operatorId: 'admin.synthetic', role: 'Admin', tenantId: 'tenant_00000000-0000-4000-8000-000000000199' }"
  })
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/', { waitUntil: 'networkidle' })

  await expect(page.locator('#platform-panel')).toBeVisible()
  await expect(
    page.getByRole('navigation', { name: 'Atalhos do Control Center' })
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Release ledger' })).toBeVisible()

  const metrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth
  }))
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewport)
})

test('dead-letter diagnostics wrap long errors and remain tenant scoped', async ({
  page
}) => {
  await page.addInitScript({
    content:
      "window.__CVG_OPERATOR_CONTEXT__ = { operatorId: 'supervisor.synthetic', role: 'Supervisor', tenantId: 'tenant_00000000-0000-4000-8000-0000000002c1' }"
  })
  await page.route('**/v1/outbox/dead-letters', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            id: 'outbox_dlq_visual_1',
            type: 'inbound.process',
            status: 'dead_letter',
            correlationId: 'corr_dlq_visual_1',
            traceId: 'trace_dlq_visual_1',
            conversationId: null,
            sessionId: null,
            inboundMessageId: 'msg_dlq_visual_1',
            attempts: 3,
            lastError: 'x'.repeat(1201),
            createdAt: '2026-09-14T12:00:00.000Z',
            availableAt: null,
            deadLetteredAt: '2026-09-14T12:02:00.000Z'
          }
        ]
      })
    })
  })
  for (const viewport of [
    { width: 375, height: 812 },
    { width: 1024, height: 900 }
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/', { waitUntil: 'networkidle' })

    const panel = page.locator('#dead-letters-panel')
    await expect(panel).toBeVisible()
    await expect(panel.locator('.recordSummary')).toBeVisible()
    const metrics = await panel.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth
    }))
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth)
    await expect(panel).toHaveScreenshot(
      `dead-letter-panel-${viewport.width}.png`,
      {
        animations: 'disabled',
        caret: 'hide',
        maxDiffPixelRatio: 0.02
      }
    )
  }
})

test('tenantless privileged sessions do not render or request the dead-letter queue', async ({
  page
}) => {
  await page.addInitScript({
    content:
      "window.__CVG_OPERATOR_CONTEXT__ = { operatorId: 'supervisor.no-tenant', role: 'Supervisor' }"
  })
  const deadLetterRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/v1/outbox/dead-letters'))
      deadLetterRequests.push(request.url())
  })
  await page.goto('/', { waitUntil: 'networkidle' })

  await expect(page.locator('#dead-letters-panel')).toHaveCount(0)
  expect(deadLetterRequests).toHaveLength(0)
})
