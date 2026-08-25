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
  await controlCenter.runDryRun(
    'Meu cachorro está vomitando. Posso dar dipirona?'
  )
  await expect(page.getByLabel('Resultado do Test Lab')).toContainText(
    'medication_advice'
  )
  await expect(page.getByLabel('Resultado do Test Lab')).toContainText(
    'médico-veterinário'
  )
  await expect(page.getByLabel('Resultado do Test Lab')).toContainText(
    'externalCall: false'
  )
  await page.getByRole('button', { name: 'Criar suite do agente' }).click()
  await expect(
    page.getByText('E2E Controlled Agent Smoke Suite v1')
  ).toBeVisible()
  await page.getByRole('button', { name: 'Comparar A/B' }).click()
  await expect(page.getByLabel('Resultado da suite do Test Lab')).toContainText(
    'PASS'
  )
  await controlCenter.publishCurrentVersion()
  await expect(
    page.getByText('Versão publicada como snapshot imutável.')
  ).toBeVisible()
  await controlCenter.saveEditedVersion('Olá, nova versão fictícia.')
  await expect(page.getByText('Versão 2 — DRAFT')).toBeVisible()

  const catalogPluginName = `e2e.catalog.${Date.now()}`
  await page
    .getByRole('textbox', { name: 'Plugin lógico' })
    .fill(catalogPluginName)
  await page.getByLabel('Versão pinned do plugin (opcional)').fill('1.0.0')
  await page.getByLabel('Tools do plugin').fill('metadata.read')
  await page
    .getByRole('button', { name: 'Carregar catálogo de plugins' })
    .click()
  await page.getByRole('button', { name: 'Criar metadata do plugin' }).click()
  await expect(
    page.getByText('Metadata do plugin criada como DRAFT.')
  ).toBeVisible()
  await page.getByRole('button', { name: 'Aprovar metadata do plugin' }).click()
  await expect(
    page.getByText('Metadata do plugin aprovada; execução continua bloqueada.')
  ).toBeVisible()
})
