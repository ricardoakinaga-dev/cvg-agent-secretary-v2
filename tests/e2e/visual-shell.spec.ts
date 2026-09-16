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

test('orchestration console exposes the synthetic state matrix read-only', async ({
  page
}) => {
  const timestamp = '2026-09-15T12:00:00.000Z'
  const budget = {
    maxSteps: 12,
    maxReplans: 3,
    maxIterations: 256,
    maxModelCalls: 8,
    maxToolCalls: 10,
    maxDurationMs: 120000,
    maxCostUsd: 2,
    usage: {
      steps: 2,
      replans: 1,
      iterations: 4,
      modelCalls: 1,
      toolCalls: 2,
      costUsd: 0.04
    }
  }
  const makeGoal = (id: string, status: string, reason: string) => ({
    id,
    status,
    objective: `Objetivo sintético ${id}`,
    correlationId: `corr_${id}`,
    inboundMessageId: `msg_${id}`,
    conversationId: `conv_${id}`,
    sessionId: null,
    activePlanId: id === 'goal_matrix_executing' ? 'plan_matrix_1' : null,
    version: 7,
    lastReason: reason,
    lastError: status === 'FAILED' ? 'synthetic_failure_diagnostic' : null,
    deadline: status === 'BUDGET_EXHAUSTED' ? timestamp : null,
    createdAt: timestamp,
    updatedAt: timestamp,
    budget
  })
  const goals = [
    makeGoal('goal_matrix_executing', 'EXECUTING', 'step_claimed:step_1'),
    makeGoal('goal_matrix_replanning', 'REPLANNING', 'evaluation_failed'),
    makeGoal('goal_matrix_approval', 'WAITING_APPROVAL', 'approval_pending'),
    makeGoal('goal_matrix_handoff', 'HUMAN_HANDOFF', 'human_handoff_required'),
    makeGoal('goal_matrix_budget', 'BUDGET_EXHAUSTED', 'budget_exhausted'),
    makeGoal('goal_matrix_failed', 'FAILED', 'execution_failed')
  ]
  const detail = {
    ...goals[0],
    successCriteria: [],
    executionSnapshot: {
      agentVersion: 'synthetic-agent-v1',
      promptVersion: 'synthetic-prompt-v1',
      policyVersion: 'synthetic-policy-v1',
      modelProfile: 'deterministic',
      toolVersions: { 'synthetic-tool': '1.0.0' }
    },
    replanCount: 1,
    operatorState: {
      state: 'EXECUTING',
      reason: 'step_claimed:step_1',
      error: null,
      deadline: null,
      deadlineExpired: false,
      activePlanVersion: 1,
      currentStepId: 'step_1',
      currentStepStatus: 'EXECUTING',
      leaseOwner: 'worker.synthetic',
      leaseUntil: timestamp,
      approvalId: null,
      handoffRequired: false,
      evidenceCount: 1,
      verifiedEvidenceCount: 1,
      lastObservationAt: timestamp,
      lastEvaluation: {
        result: 'not_satisfied',
        reason: 'remaining plan steps are not complete',
        createdAt: timestamp
      }
    },
    plans: [
      {
        id: 'plan_matrix_1',
        goalId: 'goal_matrix_executing',
        version: 1,
        parentPlanId: null,
        status: 'ACTIVE',
        reason: 'synthetic controlled plan',
        fingerprint: 'a'.repeat(64),
        createdAt: timestamp,
        updatedAt: timestamp,
        steps: [
          {
            id: 'step_1',
            goalId: 'goal_matrix_executing',
            planId: 'plan_matrix_1',
            type: 'synthetic_controlled_step',
            description: 'Verificar estado operacional sintético',
            dependencies: [],
            requiredCapabilities: ['synthetic.read'],
            riskLevel: 'LOW_RISK_READ',
            approvalRequirement: 'none',
            status: 'EXECUTING',
            attemptCount: 1,
            approvalId: null,
            toolId: 'synthetic-tool',
            toolVersion: '1.0.0',
            resultHash: null,
            lastError: null,
            startedAt: timestamp,
            completedAt: null,
            version: 2,
            createdAt: timestamp,
            updatedAt: timestamp,
            attempts: [
              {
                id: 'attempt_1',
                workerId: 'worker.synthetic',
                correlationId: 'corr_goal_matrix_executing',
                startedAt: timestamp,
                finishedAt: null,
                outcome: null,
                errorClass: null
              }
            ]
          },
          {
            id: 'step_2',
            goalId: 'goal_matrix_executing',
            planId: 'plan_matrix_1',
            version: 1,
            type: 'synthetic_controlled_step',
            description: 'Aguardar avaliação',
            dependencies: ['step_1'],
            requiredCapabilities: ['synthetic.read'],
            riskLevel: 'MEDIUM_RISK_READ',
            approvalRequirement: 'approval',
            status: 'PENDING',
            attemptCount: 0,
            approvalId: null,
            toolId: 'synthetic-tool',
            toolVersion: '1.0.0',
            resultHash: null,
            lastError: null,
            startedAt: null,
            completedAt: null,
            createdAt: timestamp,
            updatedAt: timestamp,
            attempts: []
          }
        ]
      }
    ],
    observations: [
      {
        id: 'observation_1',
        planId: 'plan_matrix_1',
        stepId: 'step_1',
        kind: 'step_result',
        resultDigest: 'digest_synthetic_1',
        evidence: [
          {
            source: 'operational_state',
            reference: 'synthetic:state:1',
            verified: true,
            key: 'state.verified',
            digest: 'e'.repeat(64)
          }
        ],
        createdAt: timestamp
      }
    ],
    evaluations: [
      {
        id: 'evaluation_1',
        planId: 'plan_matrix_1',
        stepId: null,
        evaluatorType: 'deterministic',
        result: 'not_satisfied',
        reason: 'remaining plan steps are not complete',
        evidence: [],
        createdAt: timestamp
      }
    ]
  }

  await page.addInitScript({
    content:
      "window.__CVG_OPERATOR_CONTEXT__ = { operatorId: 'supervisor.synthetic', role: 'Supervisor', tenantId: 'tenant_00000000-0000-4000-8000-0000000002c1' }"
  })
  await page.route('**/v1/orchestration/goals**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/goals')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { items: goals, pageInfo: { limit: 25, hasNextPage: false } }
        })
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: detail })
    })
  })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/', { waitUntil: 'networkidle' })

  const panel = page.locator('#orchestration-panel')
  await expect(panel).toBeVisible()
  await expect(
    panel.getByText('Passo atual', { exact: true }).first()
  ).toBeVisible()
  await expect(
    panel
      .getByText('Verificar estado operacional sintético', { exact: true })
      .first()
  ).toBeVisible()
  await expect(
    panel.getByText('Replanejando', { exact: true }).first()
  ).toBeVisible()
  await expect(
    panel.getByText('Handoff humano', { exact: true }).first()
  ).toBeVisible()
  await expect(
    panel.getByText('Orçamento esgotado', { exact: true }).first()
  ).toBeVisible()
  await expect(panel.getByText('Falhou', { exact: true }).first()).toBeVisible()
  await expect(panel.getByText('Iterações', { exact: true })).toBeVisible()
  await expect(panel).toHaveScreenshot('orchestration-state-matrix.png', {
    animations: 'disabled',
    caret: 'hide',
    maxDiffPixelRatio: 0.02
  })
})
