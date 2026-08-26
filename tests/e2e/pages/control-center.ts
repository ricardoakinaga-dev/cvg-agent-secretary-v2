import type { Page } from '@playwright/test'

export class ControlCenterPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/')
    await this.page.getByText('CVG Agent Secretary').waitFor()
  }

  async authenticateAsAdmin(tenantId: string): Promise<void> {
    await this.page.getByLabel('ID do operador').fill('admin.e2e')
    await this.page.getByLabel('Papel operacional').selectOption('Admin')
    await this.page.getByLabel('Tenant ID').fill(tenantId)
    await this.page.getByText('Control Center').waitFor()
  }

  async createDraft(input: {
    slug: string
    name: string
    greeting: string
    knowledgeSource: string
    handoff: {
      clarifyThreshold: string
      handoffThreshold: string
      maxClarifications: string
      destinations: string
      priority: 'low' | 'medium' | 'high'
    }
  }): Promise<void> {
    await this.page.getByLabel('Slug do agente').fill(input.slug)
    await this.page.getByLabel('Nome do agente').fill(input.name)
    await this.page.getByLabel('Saudação').fill(input.greeting)
    await this.page
      .getByLabel('Fonte de knowledge controlada')
      .fill(input.knowledgeSource)
    await this.page
      .getByLabel('Threshold de clarificação')
      .fill(input.handoff.clarifyThreshold)
    await this.page
      .getByLabel('Threshold de handoff')
      .fill(input.handoff.handoffThreshold)
    await this.page
      .getByLabel('Máximo de clarificações')
      .fill(input.handoff.maxClarifications)
    await this.page
      .getByLabel('Destinos de handoff')
      .fill(input.handoff.destinations)
    await this.page
      .getByLabel('Prioridade de handoff')
      .selectOption(input.handoff.priority)
    await this.page.getByRole('button', { name: 'Criar rascunho' }).click()
    await this.page.getByText(/Rascunho v\d+ criado\./).waitFor()
  }

  async startNewAgent(): Promise<void> {
    await this.page.getByRole('button', { name: 'Novo agente' }).click()
  }

  async selectAgent(slug: string): Promise<void> {
    await this.page.getByText(slug, { exact: true }).locator('..').click()
  }

  async publishCurrentVersion(): Promise<void> {
    await this.page.getByRole('button', { name: 'Enviar para teste' }).click()
    await this.page.getByText('Versão movida para TESTING.').waitFor()
    await this.page.getByRole('button', { name: 'Aprovar versão' }).click()
    await this.page.getByText('Versão movida para APPROVED.').waitFor()
    await this.createAndValidateReleaseCandidate()
    await this.page.getByRole('button', { name: 'Publicar versão' }).click()
    await this.page
      .getByText('Versão publicada como snapshot imutável.')
      .waitFor()
  }

  async runDryRun(message: string): Promise<void> {
    await this.page.getByLabel('Mensagem fictícia para Test Lab').fill(message)
    await this.page.getByRole('button', { name: 'Executar dry-run' }).click()
    await this.page
      .getByText('Dry-run concluído sem chamada externa.')
      .waitFor()
  }

  async saveEditedVersion(greeting: string): Promise<void> {
    await this.page.getByLabel('Saudação').fill(greeting)
    const promptBlocks = JSON.parse(
      await this.page.getByLabel('Prompt blocks JSON').inputValue()
    ) as Array<Record<string, unknown>>
    promptBlocks.push({
      id: 'e2e-behavior',
      kind: 'instruction',
      content: 'Responda com linguagem simples e controlada.',
      priority: 20,
      enabled: true
    })
    await this.page
      .getByLabel('Prompt blocks JSON')
      .fill(JSON.stringify(promptBlocks, null, 2))
    const responseTemplates = JSON.parse(
      await this.page.getByLabel('Response templates JSON').inputValue()
    ) as Record<string, string>
    responseTemplates.low_confidence =
      'Pode esclarecer sua solicitação para a equipe controlada?'
    await this.page
      .getByLabel('Response templates JSON')
      .fill(JSON.stringify(responseTemplates, null, 2))
    await this.page.getByRole('button', { name: 'Salvar nova versão' }).click()
    await this.page.getByText(/Nova versão v\d+ criada\./).waitFor()
  }

  async createAndApproveKnowledgeSource(source: string): Promise<void> {
    await this.page.getByLabel('Fonte controlada para catálogo').fill(source)
    await this.page
      .getByRole('button', {
        name: 'Carregar catálogo de fontes de knowledge'
      })
      .click()
    await this.page
      .getByRole('button', { name: 'Criar metadata da fonte' })
      .click()
    await this.page
      .getByText('Metadata da fonte criada como DRAFT; sem conteúdo/RAG.')
      .waitFor()
    await this.page
      .getByRole('button', { name: 'Aprovar fonte de knowledge' })
      .click()
    await this.page
      .getByText('Fonte de knowledge aprovada; catálogo metadata-only.')
      .waitFor()
  }

  async createAndValidateReleaseCandidate(): Promise<void> {
    await this.page
      .getByRole('button', { name: 'Carregar ledger de release candidates' })
      .click()
    await this.page
      .getByRole('button', { name: 'Registrar evidência do release candidate' })
      .click()
    await this.page
      .getByRole('button', { name: 'Validar atestação controlada' })
      .click()
    await this.page
      .getByText(
        'Atestação controlada validada; isto não é publish nem deploy.'
      )
      .waitFor()
  }
}
