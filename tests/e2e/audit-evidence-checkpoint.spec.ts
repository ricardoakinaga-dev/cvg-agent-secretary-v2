import { expect, test } from '@playwright/test'

test('seals and archives an audit evidence checkpoint without payload export', async ({
  page,
  request
}) => {
  await page.addInitScript({
    content:
      "window.__CVG_OPERATOR_CONTEXT__ = { operatorId: 'supervisor.e2e', role: 'Supervisor', tenantId: 'tenant_00000000-0000-4000-8000-000000000001' }"
  })
  await request.post('/v1/webhooks/channels/whatsapp/messages', {
    data: {
      externalMessageId: `e2e-checkpoint-${Date.now()}`,
      senderRef: '+5511999991111',
      body: 'Fixture controlada de auditoria',
      receivedAt: '2026-04-29T17:00:00-03:00'
    }
  })

  await page.goto('/')
  await page.getByText('CVG Agent Secretary').waitFor()
  await expect(page.getByText('Evidencias de auditoria')).toBeVisible()
  await expect(page.getByText(/eventos controlados/)).toBeVisible()

  await page.getByRole('button', { name: 'Selar checkpoint' }).click()
  await expect(
    page.getByText(
      'Checkpoint selado com IDs e digest; nenhum payload foi persistido.'
    )
  ).toBeVisible()
  await expect(page.getByText(/eventos \/ SEALED/)).toBeVisible()

  await page.getByRole('button', { name: 'Arquivar checkpoint' }).click()
  await expect(page.getByText('Checkpoint arquivado com CAS.')).toBeVisible()
  await expect(page.getByText(/eventos \/ ARCHIVED/)).toBeVisible()
  await expect(page.getByText(/Digest [a-f0-9]{64}/)).toBeVisible()
})
