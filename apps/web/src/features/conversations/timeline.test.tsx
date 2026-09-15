import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConversationsPanel } from './index.tsx'

afterEach(() => cleanup())

describe('conversation timeline', () => {
  it('renders selected conversation messages', () => {
    render(
      <ConversationsPanel
        conversations={[
          {
            id: 'conv_1',
            channel: 'whatsapp',
            senderRef: 'fixture-sender',
            status: 'active',
            openSessionId: 'sess_1',
            lastMessageBody: 'Preview',
            correlationId: 'corr_1',
            updatedAt: '2026-09-14T12:00:00.000Z'
          }
        ]}
        messages={[
          {
            id: 'msg_1',
            direction: 'inbound',
            body: 'Mensagem',
            createdAt: '2026-09-14T12:01:00.000Z'
          }
        ]}
        onSelectConversation={() => undefined}
        selectedConversationId="conv_1"
      />
    )

    expect(screen.getByLabelText('Timeline selecionada')).toBeTruthy()
    expect(screen.getByText('Mensagem')).toBeTruthy()
    expect(screen.getByText('corr_1')).toBeTruthy()
    expect(screen.getAllByText('sess_1').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Ativa')).toBeTruthy()
    expect(
      document.querySelector('time[datetime="2026-09-14T12:01:00.000Z"]')
    ).toBeTruthy()
  })

  it('offers a keyboard-reachable retry for conversation failures', () => {
    const onRetry = vi.fn()
    render(
      <ConversationsPanel
        conversations={[]}
        messages={[]}
        selectedConversationId={null}
        error="Falha de leitura controlada."
        onRetry={onRetry}
        onSelectConversation={() => undefined}
      />
    )

    expect(screen.getByRole('alert').textContent).toContain(
      'Falha de leitura controlada.'
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Tentar novamente carregar conversas'
      })
    )
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
