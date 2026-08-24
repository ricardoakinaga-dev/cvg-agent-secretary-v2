import { expect, test } from '@playwright/test'
import { ControlCenterPage } from './pages/control-center.ts'

test('configures, publishes and dry-runs an agent through the real web/API boundary', async ({
  page
}) => {
  const controlCenter = new ControlCenterPage(page)
  await controlCenter.goto()
  await controlCenter.authenticateAsAdmin(
    'tenant_00000000-0000-4000-8000-000000000051'
  )

  const slug = `e2e-controlled-agent-${Date.now()}`
  await controlCenter.createDraft({
    slug,
    name: 'E2E Controlled Agent',
    greeting: 'Olá, resposta fictícia.',
    knowledgeSource: 'controlled://e2e-hours'
  })
  await controlCenter.runDryRun('Qual o horário de funcionamento?')
  await expect(page.getByText('externalCall: false')).toBeVisible()
  await expect(page.getByLabel('Trace Viewer')).toContainText('TEST_LAB')
  await controlCenter.publishCurrentVersion()
  await expect(
    page.getByText('Versão publicada como snapshot imutável.')
  ).toBeVisible()
  await controlCenter.saveEditedVersion('Olá, nova versão fictícia.')
  await expect(page.getByText('Versão 2 — DRAFT')).toBeVisible()
})
