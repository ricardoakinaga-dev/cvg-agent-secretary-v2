import { expect, test } from '@playwright/test'

const viewports = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 900 },
  { name: 'desktop', width: 1440, height: 900 }
] as const

test('console shell preserves layout, focus and control sizing across viewports', async ({
  page
}) => {
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

    const sessionButton = page.getByRole('button', { name: 'Encerrar sessão' })
    await sessionButton.focus()
    await expect
      .poll(() =>
        sessionButton.evaluate(
          (element) => getComputedStyle(element).outlineStyle
        )
      )
      .toBe('solid')
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
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.getByLabel('ID do operador').fill('operator.fixture')
  await page.getByLabel('Papel operacional').selectOption('Admin')
  await page
    .getByLabel('Tenant ID')
    .fill('tenant_00000000-0000-4000-8000-000000000199')

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
