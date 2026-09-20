/**
 * AUD19-10 — Accessibility and multibrowser evidence for the operator console.
 *
 * Every fixture used here is synthetic (see ./fixtures/synthetic-a11y-fixtures.ts)
 * and served through Playwright route interception; no real backend, tenant,
 * patient, provider or clinical/financial action is exercised. Screen-reader
 * coverage is explicitly limited to sampled manual review, not a full SR test.
 */
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type TestInfo } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import {
  installSyntheticA11yRoutes,
  SYNTHETIC_ADMIN,
  SYNTHETIC_APPROVER,
  SYNTHETIC_SUPERVISOR,
  SYNTHETIC_UNCERTAIN_DETAIL,
  type SyntheticA11yIdentity,
  type SyntheticA11yRouteOptions
} from './fixtures/synthetic-a11y-fixtures.ts'

interface AxeFinding {
  id: string
  impact: string | null
  description: string
  helpUrl: string
  nodes: Array<{
    target: string[]
    html: string
    failureSummary: string | undefined
  }>
}

/**
 * Frozen, justified exceptions to the `critical`/`serious` axe gate. An entry
 * is only valid with a human-verifiable justification and a follow-up owner.
 * Do not add entries to silence a real defect.
 */
const FROZEN_AXE_EXCEPTIONS: Array<{
  ruleId: string
  target: string
  justification: string
  followUp: string
}> = []

const OPERATIONAL_TEXT_SELECTORS = [
  'p',
  '.eyebrow',
  '.state',
  '.recordSummary',
  '.row span',
  '.recordMeta dt',
  '.recordMeta dd',
  '.stateBadge',
  '.counter',
  '.identityMeta dt',
  '.identityMeta dd',
  '.sectionNav a',
  '.orchestrationStat',
  '.orchestrationBudgetMetric dt',
  '.orchestrationBudgetMetric dd',
  '.orchestrationStepMeta',
  '.orchestrationAttempt',
  '.orchestrationPlanLineage',
  '.journeyProgress li',
  '.journeyMeta',
  'button'
] as const

const ADMIN_TEXT_SELECTORS = [
  '#platform-panel p',
  '#platform-panel label',
  '#platform-panel h3',
  '#platform-panel button',
  '#platform-panel .platformNav a',
  '#platform-panel .platformTrace span'
] as const

let evidenceSequence = 0

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)
}

async function recordEvidence(
  testInfo: TestInfo,
  kind: string,
  label: string,
  data: unknown
): Promise<void> {
  evidenceSequence += 1
  const payload = {
    synthetic: true,
    note: 'Synthetic AUD19-10 accessibility evidence; no real data.',
    kind,
    label,
    project: testInfo.project.name,
    test: testInfo.titlePath.join(' > '),
    recordedAt: new Date().toISOString(),
    data
  }
  const body = JSON.stringify(payload, null, 2)
  await testInfo.attach(`${kind}:${label}`, {
    body,
    contentType: 'application/json'
  })
  const evidenceRoot = process.env.AUD19_A11Y_EVIDENCE
    ? path.resolve(process.cwd(), 'docs/04_audit/evidence/AUD19/raw')
    : null
  if (!evidenceRoot) return
  fs.mkdirSync(evidenceRoot, { recursive: true })
  const sequence = String(evidenceSequence).padStart(3, '0')
  const file = `${testInfo.project.name}--${slugify(testInfo.title)}--${slugify(label)}--${sequence}.json`
  fs.writeFileSync(path.join(evidenceRoot, file), body)
}

async function openSyntheticConsole(
  page: Page,
  identity: SyntheticA11yIdentity,
  options: SyntheticA11yRouteOptions = {},
  waitUntil: 'load' | 'domcontentloaded' | 'networkidle' = 'networkidle',
  media: { forcedColors?: 'active' } = {}
): Promise<void> {
  // Reduced motion removes 140ms color transitions, so axe never samples a
  // mid-transition contrast frame; the app's reduced-motion rules are honored.
  await page.emulateMedia({
    reducedMotion: 'reduce',
    forcedColors: media.forcedColors ?? null
  })
  await page.addInitScript({
    content: `window.__CVG_OPERATOR_CONTEXT__ = ${JSON.stringify(identity)}`
  })
  await installSyntheticA11yRoutes(page, options)
  await page.goto('/', { waitUntil })
  await expect(
    page.getByRole('heading', { name: 'CVG Agent Secretary' })
  ).toBeVisible()
}

async function scanWithAxe(
  page: Page,
  testInfo: TestInfo,
  label: string
): Promise<AxeFinding[]> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  const findings: AxeFinding[] = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact ?? null,
    description: violation.description,
    helpUrl: violation.helpUrl,
    nodes: violation.nodes.map((node) => ({
      target: node.target.map(String),
      html: node.html,
      failureSummary: node.failureSummary
    }))
  }))
  await recordEvidence(testInfo, 'axe', label, {
    violations: findings,
    incompleteCount: results.incomplete.length,
    passesCount: results.passes.length
  })
  return findings
}

function gateFindings(findings: AxeFinding[]): {
  blocking: AxeFinding[]
  exempt: AxeFinding[]
} {
  const blocking: AxeFinding[] = []
  const exempt: AxeFinding[] = []
  for (const finding of findings) {
    const blockingNodes = finding.nodes.filter((node) => {
      const target = node.target.join(' ')
      return !FROZEN_AXE_EXCEPTIONS.some(
        (exception) =>
          exception.ruleId === finding.id && target.includes(exception.target)
      )
    })
    if (blockingNodes.length > 0) {
      blocking.push({ ...finding, nodes: blockingNodes })
    } else {
      exempt.push(finding)
    }
  }
  return { blocking, exempt }
}

async function expectNoCriticalOrSerious(
  page: Page,
  testInfo: TestInfo,
  label: string
): Promise<AxeFinding[]> {
  const findings = await scanWithAxe(page, testInfo, label)
  const { blocking, exempt } = gateFindings(findings)
  const criticalOrSerious = blocking.filter(
    (finding) => finding.impact === 'critical' || finding.impact === 'serious'
  )
  await recordEvidence(testInfo, 'axe-gate', label, {
    blocking: criticalOrSerious.map((finding) => ({
      id: finding.id,
      impact: finding.impact,
      nodes: finding.nodes.map((node) => node.target)
    })),
    exemptedByFrozenList: exempt.map((finding) => finding.id),
    frozenExceptions: FROZEN_AXE_EXCEPTIONS
  })
  expect(
    criticalOrSerious,
    `axe critical/serious violations on ${label}`
  ).toEqual([])
  return findings
}

interface ProbeMeasurement {
  probe: number
  tag: string
  label: string
  width: number
  height: number
  inlineException: boolean
}

async function focusIndicator(page: Page): Promise<{
  probe: string | null
  outlineStyle: string
  outlineWidth: number
  boxShadow: string
}> {
  return page.evaluate(() => {
    const active = document.activeElement as HTMLElement | null
    if (!active) {
      return {
        probe: null,
        outlineStyle: 'none',
        outlineWidth: 0,
        boxShadow: 'none'
      }
    }
    const style = getComputedStyle(active)
    return {
      probe: active.getAttribute('data-a11y-probe'),
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth) || 0,
      boxShadow: style.boxShadow
    }
  })
}

async function tagFocusableControls(page: Page): Promise<number> {
  return page.evaluate(() => {
    const selector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'
    let index = 0
    for (const node of Array.from(
      document.querySelectorAll<HTMLElement>(selector)
    )) {
      const style = getComputedStyle(node)
      if (style.display === 'none' || style.visibility === 'hidden') continue
      if (node.closest('[aria-hidden="true"]')) continue
      if (node.getClientRects().length === 0) continue
      node.setAttribute('data-a11y-probe', String(index))
      index += 1
    }
    return index
  })
}

test.describe('A11Y-01 axe scan on main operator screens', () => {
  test('operations console (Supervisor, synthetic fixtures)', async ({
    page
  }, testInfo) => {
    await openSyntheticConsole(page, SYNTHETIC_SUPERVISOR)
    await expect(page.locator('#orchestration-panel')).toBeVisible()
    await expect(page.getByText('synthetic_sender_0001')).toBeVisible()
    await expectNoCriticalOrSerious(page, testInfo, 'console-desktop')
    await page.setViewportSize({ width: 375, height: 812 })
    await expect(page.locator('#orchestration-panel')).toBeVisible()
    await expectNoCriticalOrSerious(page, testInfo, 'console-mobile')
  })

  test('admin control center (Admin, synthetic fixtures)', async ({
    page
  }, testInfo) => {
    await openSyntheticConsole(page, SYNTHETIC_ADMIN)
    await expect(page.locator('#platform-panel')).toBeVisible()
    await expect(page.getByText('Agente sintético a11y')).toBeVisible()
    await expectNoCriticalOrSerious(page, testInfo, 'admin-control-center')
  })

  test('unchanged read-only states: empty and error', async ({
    page
  }, testInfo) => {
    await openSyntheticConsole(page, SYNTHETIC_SUPERVISOR, { empty: true })
    await expect(page.getByText('Nenhuma conversa carregada.')).toBeVisible()
    await expect(
      page.getByText('Nenhum Goal durável neste tenant.')
    ).toBeVisible()
    await expectNoCriticalOrSerious(page, testInfo, 'console-empty')

    await page.unroute('**/v1/**')
    await openSyntheticConsole(page, SYNTHETIC_SUPERVISOR, { failAll: 503 })
    await expect(
      page.getByText('Erro ao carregar dados operacionais.').first()
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Tentar novamente carregar conversas' })
    ).toBeVisible()
    await expectNoCriticalOrSerious(page, testInfo, 'console-error')
  })
})

test.describe('A11Y-02 WCAG AA contrast for operational text', () => {
  test('no color-contrast violation on console or admin screens', async ({
    page
  }, testInfo) => {
    await openSyntheticConsole(page, SYNTHETIC_SUPERVISOR)
    await expect(page.locator('#orchestration-panel')).toBeVisible()
    for (const label of ['console-full', 'console-uncertain']) {
      if (label === 'console-uncertain') {
        await page
          .getByRole('button', { name: /synthetic_goal_uncertain/ })
          .click()
        await expect(
          page.getByText('Reconciliação necessária', { exact: true })
        ).toBeVisible()
      }
      const results = await new AxeBuilder({ page })
        .withRules(['color-contrast'])
        .analyze()
      await recordEvidence(testInfo, 'contrast', label, {
        violations: results.violations.map((violation) => ({
          id: violation.id,
          impact: violation.impact ?? null,
          nodes: violation.nodes.map((node) => ({
            target: node.target.map(String),
            html: node.html,
            summary: node.failureSummary
          }))
        })),
        incomplete: results.incomplete.length
      })
      expect(
        results.violations,
        `color-contrast violations on ${label}`
      ).toEqual([])
    }

    await page.unroute('**/v1/**')
    await openSyntheticConsole(page, SYNTHETIC_ADMIN)
    await expect(page.locator('#platform-panel')).toBeVisible()
    const adminResults = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze()
    await recordEvidence(testInfo, 'contrast', 'admin-control-center', {
      violations: adminResults.violations.map((violation) => ({
        id: violation.id,
        nodes: violation.nodes.map((node) => node.target.map(String))
      }))
    })
    expect(adminResults.violations).toEqual([])
  })
})

test.describe('A11Y-03 keyboard navigation and focus order', () => {
  test('skip link, complete tab order, visible focus and activation', async ({
    page
  }, testInfo) => {
    await openSyntheticConsole(page, SYNTHETIC_SUPERVISOR)
    await expect(page.locator('#orchestration-panel')).toBeVisible()

    // Tag every visible focusable control with its DOM order before traversal.
    const probeCount = await tagFocusableControls(page)
    expect(probeCount).toBeGreaterThanOrEqual(15)

    // Skip link is the first focusable control and moves focus to the console.
    await page.keyboard.press('Tab')
    const firstStop = await focusIndicator(page)
    expect(firstStop.probe).toBe('0')
    const skipLinkText = await page.evaluate(
      () => document.activeElement?.textContent?.trim() ?? ''
    )
    expect(skipLinkText).toContain('Pular para o console operacional')
    await page.keyboard.press('Enter')
    await expect(page.locator('#console-operacional')).toBeFocused()

    // Reload resets the sequential focus starting point to the document start.
    await page.reload({ waitUntil: 'networkidle' })
    const traversalProbeCount = await tagFocusableControls(page)
    expect(traversalProbeCount).toBeGreaterThanOrEqual(15)
    const visited: number[] = []
    const missingFocusIndicator: Array<{ probe: number; label: string }> = []
    for (let step = 0; step < traversalProbeCount + 8; step += 1) {
      await page.keyboard.press('Tab')
      const indicator = await focusIndicator(page)
      if (indicator.probe === null) continue
      const probe = Number(indicator.probe)
      visited.push(probe)
      const hasIndicator =
        (indicator.outlineStyle !== 'none' && indicator.outlineWidth >= 2) ||
        indicator.boxShadow !== 'none'
      if (!hasIndicator) {
        const label = await page.evaluate(
          () =>
            (document.activeElement as HTMLElement | null)?.getAttribute(
              'aria-label'
            ) ??
            document.activeElement?.textContent?.trim().slice(0, 60) ??
            ''
        )
        missingFocusIndicator.push({ probe, label })
      }
      if (visited.length >= traversalProbeCount) break
    }

    const uniqueVisited = new Set(visited)
    const unreached = Array.from(
      { length: traversalProbeCount },
      (_, index) => index
    )
      .filter((probe) => !uniqueVisited.has(probe))
      .map((probe) => probe)
    const labels = await page.evaluate(
      (probes) =>
        probes.map((probe) => {
          const node = document.querySelector<HTMLElement>(
            `[data-a11y-probe="${probe}"]`
          )
          return {
            probe,
            label:
              node?.getAttribute('aria-label') ??
              node?.textContent?.trim().slice(0, 80) ??
              ''
          }
        }),
      unreached
    )
    await recordEvidence(testInfo, 'keyboard-order', 'console-full', {
      probeCount: traversalProbeCount,
      visited,
      unreached: labels,
      missingFocusIndicator,
      strictlyDomOrdered: visited.every(
        (probe, index) => index === 0 || probe > (visited[index - 1] ?? -1)
      )
    })

    expect(unreached, 'focusable controls unreachable by Tab').toEqual([])
    expect(
      missingFocusIndicator,
      'controls without a visible focus indicator'
    ).toEqual([])
    expect(
      visited.every(
        (probe, index) => index === 0 || probe > (visited[index - 1] ?? -1)
      ),
      `tab order must follow DOM order: ${JSON.stringify(visited)}`
    ).toBe(true)

    // Activation through the keyboard in an existing flow.
    await page.getByRole('button', { name: /synthetic_sender_0001/ }).focus()
    await page.keyboard.press('Enter')
    await expect(
      page.getByRole('button', { name: /synthetic_sender_0001/ })
    ).toHaveAttribute('aria-pressed', 'true')

    const detailsSummary = page.locator('.identityDetails > summary')
    if (await detailsSummary.isVisible()) {
      await detailsSummary.focus()
      await page.keyboard.press('Enter')
    }
  })

  test('approval decision is keyboard operable and preserves state', async ({
    page
  }, testInfo) => {
    await openSyntheticConsole(page, SYNTHETIC_APPROVER)
    const approve = page.getByRole('button', {
      name: /Aprovar synthetic_appointment_draft_review/
    })
    await approve.focus()
    await page.keyboard.press('Enter')
    await expect(
      page.getByText(
        'Aprovação registrada; a continuação permanece no outbox controlado.'
      )
    ).toBeVisible()
    await recordEvidence(testInfo, 'keyboard-activation', 'approval', {
      action: 'approve-with-enter',
      result: 'success-message-visible'
    })
  })
})

test.describe('A11Y-04 preserved operational states', () => {
  test('loading state remains readable and scannable', async ({
    page
  }, testInfo) => {
    await openSyntheticConsole(
      page,
      SYNTHETIC_SUPERVISOR,
      {
        delayMs: 30000
      },
      'load'
    )
    await expect(page.getByText('Carregando...').first()).toBeVisible()
    await expect(page.getByText('Carregando Goals duráveis...')).toBeVisible()
    await expectNoCriticalOrSerious(page, testInfo, 'console-loading')
  })

  test('error state exposes retry and recovers without data loss', async ({
    page
  }, testInfo) => {
    // First response per path fails, later ones succeed: retry must recover.
    await page.addInitScript({
      content: `window.__CVG_OPERATOR_CONTEXT__ = ${JSON.stringify(SYNTHETIC_SUPERVISOR)}`
    })
    await installSyntheticA11yRoutes(page)
    const failedOnce = new Set<string>()
    await page.route('**/v1/**', async (route) => {
      const url = new URL(route.request().url())
      const failureBody = JSON.stringify({
        success: false,
        data: null,
        error: {
          code: 'synthetic_failure',
          message: 'Falha sintética controlada; nenhum backend real respondeu.'
        }
      })
      if (!failedOnce.has(url.pathname)) {
        failedOnce.add(url.pathname)
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: failureBody
        })
        return
      }
      await route.fallback()
    })
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(
      page.getByText('Erro ao carregar dados operacionais.').first()
    ).toBeVisible()
    const retry = page.getByRole('button', {
      name: 'Tentar novamente carregar conversas'
    })
    await expect(retry).toBeVisible()
    await retry.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByText('synthetic_sender_0001')).toBeVisible()
    await recordEvidence(testInfo, 'state-retry', 'console-error-to-loaded', {
      initialState: 'error-with-retry',
      recovered: true
    })
  })

  test('handoff and UNCERTAIN remain read-only and clearly announced', async ({
    page
  }, testInfo) => {
    await openSyntheticConsole(page, SYNTHETIC_SUPERVISOR)
    await page.getByRole('button', { name: /synthetic_goal_uncertain/ }).focus()
    await page.keyboard.press('Enter')
    await expect(
      page.getByText('Reconciliação necessária', { exact: true })
    ).toBeVisible()
    await expect(
      page.getByText(/nenhuma repetição automática está autorizada/i)
    ).toBeVisible()
    await expectNoCriticalOrSerious(page, testInfo, 'console-uncertain')

    // Handoff decision with a Supervisor identity.
    await page.unroute('**/v1/**')
    await openSyntheticConsole(page, SYNTHETIC_SUPERVISOR)
    const handoff = page.getByRole('button', {
      name: /Assumir handoff synthetic_appointment_draft_review/
    })
    await handoff.focus()
    await page.keyboard.press('Enter')
    await expect(
      page.getByText('Handoff assumido; a automação permanece suspensa.')
    ).toBeVisible()
    await recordEvidence(testInfo, 'state-handoff', 'supervisor-handoff', {
      action: 'assume-handoff-with-enter',
      result: 'success-message-visible'
    })
  })
})

test.describe('A11Y-05 zoom and reflow (320 CSS px, 200% and 400%)', () => {
  const scenarios = [
    { name: '320csspx', width: 320, height: 800, zoom: '100%' },
    { name: 'zoom-200', width: 640, height: 800, zoom: '200%' },
    { name: 'zoom-400', width: 320, height: 800, zoom: '400%' }
  ] as const

  for (const scenario of scenarios) {
    test(`${scenario.name}: no horizontal scroll and no content loss`, async ({
      page
    }, testInfo) => {
      await page.setViewportSize({
        width: scenario.width,
        height: scenario.height
      })
      await openSyntheticConsole(page, SYNTHETIC_SUPERVISOR)
      await expect(page.locator('#orchestration-panel')).toBeVisible()
      await expect(page.locator('#journeys-panel')).toBeVisible()

      const metrics = await page.evaluate(() => {
        const panels = Array.from(
          document.querySelectorAll<HTMLElement>('.panel')
        ).map((panel) => ({
          id: panel.id || panel.getAttribute('aria-labelledby') || 'panel',
          clientWidth: panel.clientWidth,
          scrollWidth: panel.scrollWidth
        }))
        return {
          viewport: window.innerWidth,
          documentScrollWidth: document.documentElement.scrollWidth,
          bodyScrollWidth: document.body.scrollWidth,
          panels
        }
      })
      await recordEvidence(testInfo, 'zoom-reflow', scenario.name, {
        emulation: {
          zoom: scenario.zoom,
          equivalentScreenWidth:
            scenario.width * (Number.parseInt(scenario.zoom, 10) / 100)
        },
        metrics
      })
      expect(
        metrics.documentScrollWidth,
        `${scenario.name}: document horizontal overflow`
      ).toBeLessThanOrEqual(metrics.viewport + 1)
      expect(
        metrics.bodyScrollWidth,
        `${scenario.name}: body horizontal overflow`
      ).toBeLessThanOrEqual(metrics.viewport + 1)
      for (const panel of metrics.panels) {
        expect(
          panel.scrollWidth,
          `${scenario.name}: panel ${panel.id} overflows horizontally`
        ).toBeLessThanOrEqual(panel.clientWidth + 1)
      }

      // Critical content and actions survive the reflow.
      for (const locator of [
        page.getByRole('heading', { name: 'CVG Agent Secretary' }),
        page.getByRole('heading', { name: 'Goals duráveis' }),
        page.getByRole('heading', { name: 'Conversas' }),
        page.getByRole('heading', { name: 'Aprovacoes' }),
        page.getByRole('heading', { name: 'Tarefas' }),
        page.getByRole('heading', { name: 'Auditoria', exact: true }),
        page.getByRole('button', { name: /synthetic_sender_0001/ }),
        page.getByText('synthetic_session_1', { exact: false }).first()
      ]) {
        await expect(locator).toBeVisible()
      }
    })
  }
})

test.describe('A11Y-06 forced colors', () => {
  test('content, actions and focus survive forced-colors emulation', async ({
    page
  }, testInfo) => {
    await openSyntheticConsole(page, SYNTHETIC_SUPERVISOR, {}, 'networkidle', {
      forcedColors: 'active'
    })
    const forcedColorsActive = await page.evaluate(
      () => window.matchMedia('(forced-colors: active)').matches
    )
    await recordEvidence(testInfo, 'forced-colors', 'emulation-support', {
      forcedColorsActive
    })
    test.skip(
      !forcedColorsActive,
      'browser engine did not honor forced-colors emulation'
    )

    await expect(page.locator('#orchestration-panel')).toBeVisible()
    const row = page.getByRole('button', { name: /synthetic_sender_0001/ })
    await expect(row).toBeVisible()
    await row.focus()
    await page.keyboard.press('Enter')
    await expect(row).toHaveAttribute('aria-pressed', 'true')

    const selectedStyles = await page.evaluate(() => {
      const selected = document.querySelector<HTMLElement>(
        '.rowButton[aria-pressed="true"]'
      )
      if (!selected) return null
      const style = getComputedStyle(selected)
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: Number.parseFloat(style.outlineWidth) || 0,
        borderTopStyle: style.borderTopStyle,
        borderTopWidth: Number.parseFloat(style.borderTopWidth) || 0
      }
    })
    const focusStyles = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null
      if (!active) return null
      const style = getComputedStyle(active)
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: Number.parseFloat(style.outlineWidth) || 0,
        boxShadow: style.boxShadow
      }
    })
    await recordEvidence(testInfo, 'forced-colors', 'selection-and-focus', {
      selectedStyles,
      focusStyles
    })
    expect(selectedStyles, 'selected row measurable').not.toBeNull()
    expect(
      (selectedStyles?.outlineWidth ?? 0) >= 2 ||
        (selectedStyles?.borderTopWidth ?? 0) >= 2,
      'selected row must stay distinguishable in forced colors'
    ).toBe(true)
    expect(focusStyles, 'focused control measurable').not.toBeNull()
    expect(
      focusStyles?.outlineStyle !== 'none' &&
        (focusStyles?.outlineWidth ?? 0) >= 2,
      'focused control must expose an outline in forced colors'
    ).toBe(true)

    await page.getByRole('button', { name: /synthetic_goal_uncertain/ }).focus()
    await page.keyboard.press('Enter')
    await expect(
      page.getByText('Reconciliação necessária', { exact: true })
    ).toBeVisible()
    await expectNoCriticalOrSerious(page, testInfo, 'console-forced-colors')
  })
})

async function measureInteractiveTargets(
  page: Page
): Promise<ProbeMeasurement[]> {
  return page.evaluate(() => {
    const selector =
      'button, a[href], input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"]'
    const items: ProbeMeasurement[] = []
    for (const node of Array.from(
      document.querySelectorAll<HTMLElement>(selector)
    )) {
      const style = getComputedStyle(node)
      if (style.display === 'none' || style.visibility === 'hidden') continue
      const inputType = node instanceof HTMLInputElement ? node.type : null
      const wrapsControl = inputType === 'checkbox' || inputType === 'radio'
      const target = wrapsControl ? (node.closest('label') ?? node) : node
      const rect = target.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) continue
      items.push({
        probe: items.length,
        tag: node.tagName.toLowerCase(),
        label:
          node.getAttribute('aria-label') ??
          node.textContent?.trim().slice(0, 80) ??
          '',
        width: Math.round(rect.width * 100) / 100,
        height: Math.round(rect.height * 100) / 100,
        inlineException: node.tagName === 'A' && style.display === 'inline'
      })
    }
    return items
  })
}

test.describe('A11Y-07 touch targets and operational typography', () => {
  test('interactive controls are >= 44x44 CSS px', async ({
    page
  }, testInfo) => {
    await openSyntheticConsole(page, SYNTHETIC_SUPERVISOR)
    await expect(page.locator('#orchestration-panel')).toBeVisible()
    const measurements = await measureInteractiveTargets(page)
    const tooSmall = measurements.filter(
      (item) => !item.inlineException && (item.width < 44 || item.height < 44)
    )
    const inlineExceptions = measurements.filter((item) => item.inlineException)
    await recordEvidence(testInfo, 'touch-targets', 'console-full', {
      total: measurements.length,
      tooSmall,
      inlineExceptions,
      wcagReference:
        'WCAG 2.5.5/2.5.8 with the inline-link exception recorded explicitly'
    })
    expect(tooSmall, 'console controls below 44x44 CSS px').toEqual([])

    await page.unroute('**/v1/**')
    await openSyntheticConsole(page, SYNTHETIC_ADMIN)
    await expect(page.locator('#platform-panel')).toBeVisible()
    const adminMeasurements = await measureInteractiveTargets(page)
    const adminTooSmall = adminMeasurements.filter(
      (item) => !item.inlineException && (item.width < 44 || item.height < 44)
    )
    await recordEvidence(testInfo, 'touch-targets', 'admin-control-center', {
      total: adminMeasurements.length,
      tooSmall: adminTooSmall,
      inlineExceptions: adminMeasurements.filter((item) => item.inlineException)
    })
    expect(adminTooSmall, 'admin controls below 44x44 CSS px').toEqual([])
  })

  test('operational typography is >= 12px with >= 1.4 line-height', async ({
    page
  }, testInfo) => {
    await openSyntheticConsole(page, SYNTHETIC_SUPERVISOR)
    await expect(page.locator('#orchestration-panel')).toBeVisible()

    const measure = async (selectors: readonly string[]) =>
      page.evaluate((selectorList) => {
        return selectorList.flatMap((selector) => {
          const nodes = Array.from(
            document.querySelectorAll<HTMLElement>(selector)
          ).slice(0, 12)
          return nodes.map((node) => {
            const style = getComputedStyle(node)
            const fontSize = Number.parseFloat(style.fontSize)
            const lineHeight =
              style.lineHeight === 'normal'
                ? null
                : Number.parseFloat(style.lineHeight)
            return {
              selector,
              text:
                node.textContent?.trim().replace(/\s+/g, ' ').slice(0, 60) ??
                '',
              fontSize,
              lineHeight,
              ratio:
                lineHeight === null
                  ? null
                  : Math.round((lineHeight / fontSize) * 100) / 100
            }
          })
        })
      }, selectors as string[])

    const consoleSamples = await measure(OPERATIONAL_TEXT_SELECTORS)
    const consoleFailures = consoleSamples.filter(
      (sample) =>
        sample.fontSize < 12 ||
        sample.lineHeight === null ||
        sample.lineHeight < sample.fontSize * 1.4 - 0.01
    )
    await recordEvidence(testInfo, 'typography', 'console-full', {
      samples: consoleSamples,
      failures: consoleFailures
    })
    expect(consoleFailures, 'console text below 12px/1.4').toEqual([])

    await page.unroute('**/v1/**')
    await openSyntheticConsole(page, SYNTHETIC_ADMIN)
    await expect(page.locator('#platform-panel')).toBeVisible()
    const adminSamples = await measure(ADMIN_TEXT_SELECTORS)
    const adminFailures = adminSamples.filter(
      (sample) =>
        sample.fontSize < 12 ||
        sample.lineHeight === null ||
        sample.lineHeight < sample.fontSize * 1.4 - 0.01
    )
    await recordEvidence(testInfo, 'typography', 'admin-control-center', {
      samples: adminSamples,
      failures: adminFailures
    })
    expect(adminFailures, 'admin text below 12px/1.4').toEqual([])
  })
})

test.describe('A11Y-08 UNCERTAIN read model detail', () => {
  test('synthetic UNCERTAIN detail exposes no unsafe automatic retry action', async ({
    page
  }, testInfo) => {
    await openSyntheticConsole(page, SYNTHETIC_SUPERVISOR)
    await page.getByRole('button', { name: /synthetic_goal_uncertain/ }).click()
    await expect(
      page.getByText('Reconciliação necessária', { exact: true })
    ).toBeVisible()
    const uncertainSection = page.locator('.orchestrationUncertainty')
    const content = (await uncertainSection.textContent()) ?? ''
    expect(content).toContain('Reconciliação necessária')
    expect(content).toContain('Retomada automática suspensa')
    expect(
      await uncertainSection.locator('button').count(),
      'UNCERTAIN reconciliation must remain read-only'
    ).toBe(0)
    await recordEvidence(testInfo, 'uncertain-readonly', 'uncertain-detail', {
      text: content,
      buttons: 0,
      syntheticDetailId: SYNTHETIC_UNCERTAIN_DETAIL.id
    })
  })
})
