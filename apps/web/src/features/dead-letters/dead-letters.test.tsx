import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DeadLettersPanel } from './index.tsx'

afterEach(() => cleanup())

const deadLetter = {
  id: 'outbox_dlq_1',
  type: 'inbound.process',
  status: 'dead_letter',
  correlationId: 'corr_dlq_1',
  traceId: 'trace_dlq_1',
  conversationId: 'conv_dlq_1',
  sessionId: 'sess_dlq_1',
  inboundMessageId: 'msg_dlq_1',
  attempts: 3,
  lastError: '[redacted-outbox-error]',
  createdAt: '2026-09-14T12:00:00.000Z',
  availableAt: '2026-09-14T12:01:00.000Z',
  deadLetteredAt: '2026-09-14T12:02:00.000Z'
} as const

describe('DeadLettersPanel', () => {
  it('shows disposition metadata without payload and permits authorized requeue', () => {
    const onRequeue = vi.fn()
    render(
      <DeadLettersPanel
        deadLetters={[deadLetter]}
        canRequeue
        onRequeue={onRequeue}
      />
    )

    expect(screen.getByText('inbound.process')).toBeTruthy()
    expect(screen.getByText('Dead-letter')).toBeTruthy()
    expect(screen.getByText('[redacted-outbox-error]')).toBeTruthy()
    expect(screen.getByText('corr_dlq_1')).toBeTruthy()
    expect(screen.getByText('trace_dlq_1')).toBeTruthy()
    expect(screen.getByText(/conteúdo omitido/)).toBeTruthy()
    expect(screen.queryByText('fixture secret payload')).toBeNull()

    fireEvent.click(
      screen.getByRole('button', { name: 'Reenfileirar inbound.process' })
    )
    expect(onRequeue).toHaveBeenCalledWith('outbox_dlq_1')
  })

  it('keeps requeue disabled outside the authorized role and exposes retry failures', () => {
    const onRetry = vi.fn()
    render(
      <DeadLettersPanel
        deadLetters={[]}
        error="Falha de leitura controlada."
        onRetry={onRetry}
      />
    )

    expect(
      screen.getByRole('button', {
        name: 'Tentar novamente carregar dead letters'
      })
    ).toBeTruthy()
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Tentar novamente carregar dead letters'
      })
    )
    expect(onRetry).toHaveBeenCalledTimes(1)
    cleanup()
    render(<DeadLettersPanel deadLetters={[deadLetter]} />)
    expect(
      screen
        .getByRole('button', { name: 'Reenfileirar inbound.process' })
        .hasAttribute('disabled')
    ).toBe(true)
  })

  it('restores focus to the panel after an asynchronous requeue result', () => {
    const { rerender } = render(
      <DeadLettersPanel
        deadLetters={[deadLetter]}
        actionId="outbox_dlq_1"
        canRequeue
      />
    )
    const panel = screen.getByRole('region', { name: 'Dead letters' })

    rerender(
      <DeadLettersPanel
        deadLetters={[]}
        canRequeue
        message="Evento reenfileirado."
        messageTone="success"
      />
    )

    expect(panel.getAttribute('aria-busy')).toBe('false')
    expect(document.activeElement).toBe(panel)
  })

  it('redacts credential-shaped diagnostics at the client boundary', () => {
    render(
      <DeadLettersPanel
        deadLetters={[
          {
            ...deadLetter,
            lastError: 'Authorization: Bearer live-secret-token'
          }
        ]}
      />
    )

    expect(screen.getByText('Authorization: [redacted]')).toBeTruthy()
    expect(screen.queryByText(/live-secret-token/)).toBeNull()
  })
})
