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
    knowledgeSource: 'controlled://e2e-hours',
    handoff: {
      clarifyThreshold: '0.7',
      handoffThreshold: '0',
      maxClarifications: '3',
      destinations: 'controlled-reception, controlled-supervisor',
      priority: 'low'
    }
  })
  await expect(page.getByRole('button', { name: 'Novo agente' })).toBeVisible()
  await controlCenter.startNewAgent()
  await expect(page.getByLabel('Slug do agente')).toHaveValue('')
  const secondSlug = `${slug}-b`
  await controlCenter.createDraft({
    slug: secondSlug,
    name: 'E2E Controlled Agent B',
    greeting: 'Olá, resposta do Agent B.',
    knowledgeSource: 'controlled://e2e-hours-b',
    handoff: {
      clarifyThreshold: '0.7',
      handoffThreshold: '0',
      maxClarifications: '3',
      destinations: 'controlled-reception, controlled-supervisor',
      priority: 'low'
    }
  })
  await expect(page.getByText('E2E Controlled Agent B')).toBeVisible()
  await controlCenter.selectAgent(slug)
  await expect(page.getByLabel('Saudação')).toHaveValue(
    'Olá, resposta fictícia.'
  )
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
    'handoff destination: controlled-reception'
  )
  await expect(page.getByLabel('Resultado do Test Lab')).toContainText(
    'handoff priority: high'
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
  await controlCenter.runDryRun('Olá')
  await expect(page.getByLabel('Resultado do Test Lab')).toContainText(
    'Pode esclarecer sua solicitação para a equipe controlada?'
  )
  await expect(page.getByLabel('Resultado do Test Lab')).toContainText(
    'prompt status: DRAFT'
  )
  await expect(page.getByLabel('Resultado do Test Lab')).toContainText(
    /prompt checksum: [a-f0-9]{64}/
  )

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
  await controlCenter.createAndApproveKnowledgeSource(
    'controlled://e2e-institutional-hours'
  )
  await controlCenter.createAndValidateReleaseCandidate()
  await expect(
    page.getByText(
      'Atestação controlada validada; isto não é publish nem deploy.'
    )
  ).toBeVisible()
  await expect(page.getByText('Versão 2 — DRAFT')).toBeVisible()
})
