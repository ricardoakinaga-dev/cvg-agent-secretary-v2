import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApprovalsPanel } from './index.tsx'

afterEach(() => cleanup())

describe('ApprovalsPanel', () => {
  it('renders pending approvals and submits controlled decisions', () => {
    const onApprove = vi.fn()
    render(
      <ApprovalsPanel
        approvals={[
          {
            id: 'approval_1',
            sessionId: 'session_1',
            proposedAction: 'create_appointment_draft',
            summary: 'Criar somente o rascunho controlado.',
            riskLevel: 'medium',
            status: 'PENDING',
            correlationId: 'corr_approval_1',
            createdAt: '2026-09-14T12:00:00.000Z'
          }
        ]}
        canApproveReject
        onApprove={onApprove}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Aprovar/ }))

    expect(screen.getByText('create_appointment_draft')).toBeTruthy()
    expect(
      screen.getByText('Criar somente o rascunho controlado.')
    ).toBeTruthy()
    expect(screen.getByText('session_1')).toBeTruthy()
    expect(screen.getByText('corr_approval_1')).toBeTruthy()
    expect(screen.getByText('Pendente')).toBeTruthy()
    expect(
      document.querySelector('time[datetime="2026-09-14T12:00:00.000Z"]')
    ).toBeTruthy()
    expect(onApprove).toHaveBeenCalledWith('approval_1')
  })

  it('keeps a resolved approval contextual and free of decision controls', () => {
    render(
      <ApprovalsPanel
        approvals={[
          {
            id: 'approval_2',
            sessionId: 'session_2',
            proposedAction: 'handoff_to_operator',
            summary: 'Handoff controlado',
            riskLevel: 'high',
            status: 'rejected',
            correlationId: 'corr_approval_2',
            updatedAt: '2026-09-14T13:00:00.000Z'
          }
        ]}
      />
    )

    expect(screen.getByText('Rejeitada')).toBeTruthy()
    expect(screen.getByText('corr_approval_2')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Aprovar/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Rejeitar/ })).toBeNull()
  })

  it('localizes durable approval lifecycle states', () => {
    render(
      <ApprovalsPanel
        approvals={[
          {
            id: 'approval_3',
            proposedAction: 'create_draft',
            riskLevel: 'medium',
            status: 'APPROVED',
            updatedAt: '2026-09-14T13:00:00.000Z'
          },
          {
            id: 'approval_4',
            proposedAction: 'execute_draft',
            riskLevel: 'high',
            status: 'UNCERTAIN',
            updatedAt: '2026-09-14T13:01:00.000Z'
          }
        ]}
      />
    )

    expect(screen.getByText('Aprovada')).toBeTruthy()
    expect(screen.getByText('Requer reconciliação')).toBeTruthy()
    expect(screen.getAllByText(/Aprovada|Requer reconciliação/)).toHaveLength(4)
  })
})
