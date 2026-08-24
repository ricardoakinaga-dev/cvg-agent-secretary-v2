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
  }): Promise<void> {
    await this.page.getByLabel('Slug do agente').fill(input.slug)
    await this.page.getByLabel('Nome do agente').fill(input.name)
    await this.page.getByLabel('Saudação').fill(input.greeting)
    await this.page
      .getByLabel('Fonte de knowledge controlada')
      .fill(input.knowledgeSource)
    await this.page.getByRole('button', { name: 'Criar rascunho' }).click()
    await this.page.getByText(/Rascunho v\d+ criado\./).waitFor()
  }

  async publishCurrentVersion(): Promise<void> {
    await this.page.getByRole('button', { name: 'Enviar para teste' }).click()
    await this.page.getByText('Versão movida para TESTING.').waitFor()
    await this.page.getByRole('button', { name: 'Aprovar versão' }).click()
    await this.page.getByText('Versão movida para APPROVED.').waitFor()
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
    await this.page.getByRole('button', { name: 'Salvar nova versão' }).click()
    await this.page.getByText(/Nova versão v\d+ criada\./).waitFor()
  }
}
