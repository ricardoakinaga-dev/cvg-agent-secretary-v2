import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App.tsx'

const envelope = <T,>(data: T) =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        success: true,
        data,
        error: null,
        meta: { correlationId: 'corr_00000000-0000-4000-8000-000000000001' }
      })
  } as Response)

const legacyBootstrapSuffix = ['demo', 'controlled'].join('_')
const legacyConversationTimelinePath = `/v1/conversations/conv_${legacyBootstrapSuffix}/timeline`
const legacyAuditPath = `/v1/audit/sessions/sess_${legacyBootstrapSuffix}`

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function enterOperatorIdentity(
  operatorId = 'operator.shift-a',
  role = 'Operator'
) {
  fireEvent.change(screen.getByLabelText('ID do operador'), {
    target: { value: operatorId }
  })
  if (role !== 'Operator') {
    fireEvent.change(screen.getByLabelText('Papel operacional'), {
      target: { value: role }
    })
  }
}

describe('web console', () => {
  it('renders loading and then API-backed operational data for conversations, approvals, tasks and audit', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input)
      if (url === '/v1/conversations?limit=25&offset=0') {
        return envelope({
          items: [
            {
              id: 'conv_api_1',
              channel: 'whatsapp',
              senderRef: 'fixture-sender',
              status: 'active',
              correlationId: 'corr_00000000-0000-4000-8000-000000000001',
              openSessionId: 'sess_api_1',
              lastMessageBody: 'Mensagem via API',
              lastMessageAt: '2026-04-29T12:00:00-03:00',
              updatedAt: '2026-04-29T12:00:00-03:00'
            }
          ],
          pageInfo: { limit: 25, offset: 0, total: 1, hasNextPage: false }
        })
      }
      if (url === '/v1/conversations/conv_api_1/timeline') {
        return envelope({
          messages: [
            {
              id: 'msg_api_1',
              direction: 'inbound',
              body: 'Mensagem via API',
              createdAt: '2026-04-29T12:00:00-03:00'
            }
          ]
        })
      }
      if (url.includes('/approvals')) {
        return envelope([
          {
            id: 'approval_api_1',
            sessionId: 'sess_api',
            proposedAction: 'create_appointment_draft',
            summary: 'Revisar',
            riskLevel: 'medium',
            status: 'pending'
          }
        ])
      }
      if (url.includes('/tasks')) {
        return envelope([
          {
            id: 'task_api_1',
            title: 'Tarefa via API',
            priority: 'high',
            status: 'open'
          }
        ])
      }
      if (url === '/v1/audit/sessions/sess_api_1') {
        return envelope({
          events: [
            {
              id: 'audit_api_1',
              type: 'integration_event',
              actorType: 'System',
              createdAt: '2026-04-29T12:00:00-03:00'
            }
          ]
        })
      }
      return Promise.reject(new Error(`Unexpected URL ${url}`))
    })

    render(<App />)
    enterOperatorIdentity()

    expect(screen.getByText('CVG Agent Secretary')).toBeTruthy()
    expect(screen.getAllByText('Carregando...')).toHaveLength(4)
    expect(await screen.findByText('fixture-sender')).toBeTruthy()
    expect(await screen.findByText('Mensagem via API')).toBeTruthy()
    expect(await screen.findByText('create_appointment_draft')).toBeTruthy()
    expect(await screen.findByText('Tarefa via API')).toBeTruthy()
    expect(await screen.findByText('integration_event')).toBeTruthy()
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/v1/approvals',
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-operator-id': 'operator.shift-a',
          'x-operator-role': 'Operator'
        })
      })
    )
    expect(globalThis.fetch).not.toHaveBeenCalledWith(
      legacyConversationTimelinePath
    )
    expect(globalThis.fetch).not.toHaveBeenCalledWith(legacyAuditPath)
  })

  it('renders empty states when the API returns no operational records', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input)
      if (url === '/v1/conversations?limit=25&offset=0')
        return envelope({
          items: [],
          pageInfo: { limit: 25, offset: 0, total: 0, hasNextPage: false }
        })
      if (url.includes('/approvals')) return envelope([])
      if (url.includes('/tasks')) return envelope([])
      return Promise.reject(new Error(`Unexpected URL ${url}`))
    })

    render(<App />)
    enterOperatorIdentity()

    expect(await screen.findByText('Nenhuma conversa carregada.')).toBeTruthy()
    expect(await screen.findByText('Nenhuma aprovacao pendente.')).toBeTruthy()
    expect(await screen.findByText('Nenhuma tarefa interna.')).toBeTruthy()
    expect(await screen.findByText('Nenhum evento de auditoria.')).toBeTruthy()
    expect(globalThis.fetch).not.toHaveBeenCalledWith(
      legacyConversationTimelinePath
    )
    expect(globalThis.fetch).not.toHaveBeenCalledWith(legacyAuditPath)
  })

  it('loads timeline and audit for the selected API conversation', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input)
      if (url === '/v1/conversations?limit=25&offset=0') {
        return envelope({
          items: [
            {
              id: 'conv_api_1',
              channel: 'whatsapp',
              senderRef: 'sender-one',
              status: 'active',
              correlationId: 'corr_00000000-0000-4000-8000-000000000001',
              openSessionId: 'sess_api_1',
              lastMessageBody: 'Preview um',
              lastMessageAt: '2026-04-29T12:00:00-03:00',
              updatedAt: '2026-04-29T12:00:00-03:00'
            },
            {
              id: 'conv_api_2',
              channel: 'web',
              senderRef: 'sender-two',
              status: 'waiting_human',
              correlationId: 'corr_00000000-0000-4000-8000-000000000002',
              openSessionId: 'sess_api_2',
              lastMessageBody: 'Preview dois',
              lastMessageAt: '2026-04-29T12:05:00-03:00',
              updatedAt: '2026-04-29T12:05:00-03:00'
            }
          ],
          pageInfo: { limit: 25, offset: 0, total: 2, hasNextPage: false }
        })
      }
      if (url === '/v1/conversations/conv_api_1/timeline') {
        return envelope({
          messages: [
            {
              id: 'msg_api_1',
              direction: 'inbound',
              body: 'Mensagem um',
              createdAt: '2026-04-29T12:00:00-03:00'
            }
          ]
        })
      }
      if (url === '/v1/conversations/conv_api_2/timeline') {
        return envelope({
          messages: [
            {
              id: 'msg_api_2',
              direction: 'inbound',
              body: 'Mensagem dois',
              createdAt: '2026-04-29T12:05:00-03:00'
            }
          ]
        })
      }
      if (url === '/v1/audit/sessions/sess_api_1') {
        return envelope({
          events: [
            {
              id: 'audit_api_1',
              type: 'integration_event',
              actorType: 'System',
              createdAt: '2026-04-29T12:00:00-03:00'
            }
          ]
        })
      }
      if (url === '/v1/audit/sessions/sess_api_2') {
        return envelope({
          events: [
            {
              id: 'audit_api_2',
              type: 'handoff',
              actorType: 'System',
              createdAt: '2026-04-29T12:05:00-03:00'
            }
          ]
        })
      }
      if (url.includes('/approvals')) return envelope([])
      if (url.includes('/tasks')) return envelope([])
      return Promise.reject(new Error(`Unexpected URL ${url}`))
    })

    render(<App />)
    enterOperatorIdentity()

    expect(await screen.findByText('sender-two')).toBeTruthy()
    fireEvent.click(screen.getByText('sender-two'))

    expect(await screen.findByText('Mensagem dois')).toBeTruthy()
    expect(await screen.findByText('handoff')).toBeTruthy()
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/v1/conversations/conv_api_2/timeline',
      expect.any(Object)
    )
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/v1/audit/sessions/sess_api_2',
      expect.any(Object)
    )
  })

  it('submits controlled approval and handoff decisions from the operator console', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = String(input)
      if (url === '/v1/conversations?limit=25&offset=0') {
        return envelope({
          items: [
            {
              id: 'conv_api_1',
              channel: 'whatsapp',
              senderRef: 'fixture-sender',
              status: 'waiting_approval',
              correlationId: 'corr_00000000-0000-4000-8000-000000000001',
              openSessionId: 'sess_api_1',
              lastMessageBody: 'Aguardando decisao',
              lastMessageAt: '2026-04-29T12:00:00-03:00',
              updatedAt: '2026-04-29T12:00:00-03:00'
            }
          ],
          pageInfo: { limit: 25, offset: 0, total: 1, hasNextPage: false }
        })
      }
      if (url === '/v1/conversations/conv_api_1/timeline')
        return envelope({ messages: [] })
      if (url === '/v1/tasks') return envelope([])
      if (url === '/v1/audit/sessions/sess_api_1') {
        return envelope({
          events: [
            {
              id: 'audit_api_1',
              type: 'approval_decision',
              actorType: 'Approver',
              createdAt: '2026-04-29T12:01:00-03:00'
            }
          ]
        })
      }
      if (url === '/v1/approvals' && !init?.method) {
        return envelope([
          {
            id: 'approval_api_1',
            sessionId: 'sess_api_1',
            proposedAction: 'create_appointment_draft',
            summary: 'Criar apenas rascunho de agenda',
            riskLevel: 'medium',
            status: 'pending'
          },
          {
            id: 'approval_api_2',
            sessionId: 'sess_api_1',
            proposedAction: 'handoff_to_operator',
            summary: 'Assumir conversa sem acao externa',
            riskLevel: 'high',
            status: 'pending'
          }
        ])
      }
      if (url === '/v1/approvals/approval_api_1/decision') {
        expect(init).toMatchObject({
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-operator-id': 'approver.shift-a',
            'x-operator-role': 'Approver'
          },
          body: JSON.stringify({
            decision: 'approved',
            note: 'controlled_console_action'
          })
        })
        return envelope({
          id: 'approval_api_1',
          sessionId: 'sess_api_1',
          proposedAction: 'create_appointment_draft',
          summary: 'Criar apenas rascunho de agenda',
          riskLevel: 'medium',
          status: 'approved'
        })
      }
      if (url === '/v1/approvals/approval_api_2/decision') {
        expect(init).toMatchObject({
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-operator-id': 'supervisor.shift-a',
            'x-operator-role': 'Supervisor'
          },
          body: JSON.stringify({
            decision: 'assumed',
            note: 'controlled_handoff_only'
          })
        })
        return envelope({
          id: 'approval_api_2',
          sessionId: 'sess_api_1',
          proposedAction: 'handoff_to_operator',
          summary: 'Assumir conversa sem acao externa',
          riskLevel: 'high',
          status: 'assumed'
        })
      }
      return Promise.reject(new Error(`Unexpected URL ${url}`))
    })

    render(<App />)
    enterOperatorIdentity('approver.shift-a', 'Approver')

    expect(await screen.findByText('create_appointment_draft')).toBeTruthy()
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Aprovar create_appointment_draft'
      })
    )
    fireEvent.change(screen.getByLabelText('ID do operador'), {
      target: { value: 'supervisor.shift-a' }
    })
    fireEvent.change(screen.getByLabelText('Papel operacional'), {
      target: { value: 'Supervisor' }
    })
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Assumir handoff handoff_to_operator'
      })
    )

    expect(await screen.findByText('approval_decision')).toBeTruthy()
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/v1/approvals/approval_api_1/decision',
      expect.any(Object)
    )
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/v1/approvals/approval_api_2/decision',
      expect.any(Object)
    )
    expect(globalThis.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/appointments'),
      expect.anything()
    )
  })

  it('submits controlled task lifecycle transitions from the operator task board', async () => {
    let taskStatus = 'open'
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = String(input)
      if (url === '/v1/conversations?limit=25&offset=0') {
        return envelope({
          items: [
            {
              id: 'conv_api_1',
              channel: 'whatsapp',
              senderRef: 'fixture-sender',
              status: 'active',
              correlationId: 'corr_00000000-0000-4000-8000-000000000001',
              openSessionId: 'sess_api_1',
              lastMessageBody: 'Tarefa interna',
              lastMessageAt: '2026-04-29T12:00:00-03:00',
              updatedAt: '2026-04-29T12:00:00-03:00'
            }
          ],
          pageInfo: { limit: 25, offset: 0, total: 1, hasNextPage: false }
        })
      }
      if (url === '/v1/conversations/conv_api_1/timeline')
        return envelope({ messages: [] })
      if (url === '/v1/approvals') return envelope([])
      if (url === '/v1/audit/sessions/sess_api_1') {
        return envelope({
          events: [
            {
              id: 'audit_api_1',
              type: 'integration_event',
              actorType: 'Operator',
              createdAt: '2026-04-29T12:02:00-03:00'
            }
          ]
        })
      }
      if (url === '/v1/tasks' && !init?.method) {
        return envelope([
          {
            id: 'task_api_1',
            sessionId: 'sess_api_1',
            title: 'Tarefa via API',
            priority: 'high',
            status: taskStatus
          }
        ])
      }
      if (url === '/v1/tasks/task_api_1/status') {
        const body = JSON.parse(String(init?.body)) as { status: string }
        expect(init).toMatchObject({
          method: 'PATCH',
          headers: {
            'content-type': 'application/json',
            'x-operator-id': 'operator.shift-a',
            'x-operator-role': 'Operator'
          }
        })
        expect(body).not.toHaveProperty('operatorId')
        taskStatus = body.status
        return envelope({
          id: 'task_api_1',
          sessionId: 'sess_api_1',
          title: 'Tarefa via API',
          priority: 'high',
          status: taskStatus
        })
      }
      return Promise.reject(new Error(`Unexpected URL ${url}`))
    })

    render(<App />)
    enterOperatorIdentity()

    expect(await screen.findByText('Tarefa via API')).toBeTruthy()
    fireEvent.click(
      await screen.findByRole('button', { name: 'Iniciar Tarefa via API' })
    )

    expect(await screen.findByText('high / in_progress')).toBeTruthy()
    fireEvent.click(
      screen.getByRole('button', { name: 'Concluir Tarefa via API' })
    )

    expect(await screen.findByText('high / done')).toBeTruthy()
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/v1/tasks/task_api_1/status',
      expect.any(Object)
    )
    expect(globalThis.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/integrations'),
      expect.anything()
    )
  })

  it('submits controlled task cancel transitions from the operator task board', async () => {
    let taskStatus = 'open'
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = String(input)
      if (url === '/v1/conversations?limit=25&offset=0') {
        return envelope({
          items: [
            {
              id: 'conv_api_1',
              channel: 'whatsapp',
              senderRef: 'fixture-sender',
              status: 'active',
              correlationId: 'corr_00000000-0000-4000-8000-000000000001',
              openSessionId: 'sess_api_1',
              lastMessageBody: 'Tarefa interna',
              lastMessageAt: '2026-04-29T12:00:00-03:00',
              updatedAt: '2026-04-29T12:00:00-03:00'
            }
          ],
          pageInfo: { limit: 25, offset: 0, total: 1, hasNextPage: false }
        })
      }
      if (url === '/v1/conversations/conv_api_1/timeline')
        return envelope({ messages: [] })
      if (url === '/v1/approvals') return envelope([])
      if (url === '/v1/audit/sessions/sess_api_1')
        return envelope({ events: [] })
      if (url === '/v1/tasks' && !init?.method) {
        return envelope([
          {
            id: 'task_api_2',
            sessionId: 'sess_api_1',
            title: 'Cancelar tarefa',
            priority: 'medium',
            status: taskStatus
          }
        ])
      }
      if (url === '/v1/tasks/task_api_2/status') {
        expect(init).toMatchObject({
          method: 'PATCH',
          headers: {
            'content-type': 'application/json',
            'x-operator-id': 'operator.shift-a',
            'x-operator-role': 'Operator'
          },
          body: JSON.stringify({ status: 'canceled' })
        })
        taskStatus = 'canceled'
        return envelope({
          id: 'task_api_2',
          sessionId: 'sess_api_1',
          title: 'Cancelar tarefa',
          priority: 'medium',
          status: 'canceled'
        })
      }
      return Promise.reject(new Error(`Unexpected URL ${url}`))
    })

    render(<App />)
    enterOperatorIdentity()

    expect(await screen.findByText('Cancelar tarefa')).toBeTruthy()
    fireEvent.click(
      await screen.findByRole('button', { name: 'Cancelar Cancelar tarefa' })
    )

    expect(await screen.findByText('medium / canceled')).toBeTruthy()
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/v1/tasks/task_api_2/status',
      expect.any(Object)
    )
  })

  it.each([
    ['Supervisor', 'supervisor.audit'],
    ['Admin', 'admin.audit']
  ])(
    'loads controlled audit evidence review for a %s identity',
    async (role, operatorId) => {
      vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
        const url = String(input)
        if (url === '/v1/conversations?limit=25&offset=0') {
          return envelope({
            items: [
              {
                id: 'conv_api_1',
                channel: 'whatsapp',
                senderRef: 'fixture-sender',
                status: 'active',
                correlationId: 'corr_00000000-0000-4000-8000-000000000001',
                openSessionId: 'sess_api_1',
                lastMessageBody: 'Evidencia operacional',
                lastMessageAt: '2026-04-29T12:00:00-03:00',
                updatedAt: '2026-04-29T12:00:00-03:00'
              }
            ],
            pageInfo: { limit: 25, offset: 0, total: 1, hasNextPage: false }
          })
        }
        if (url === '/v1/conversations/conv_api_1/timeline')
          return envelope({ messages: [] })
        if (url === '/v1/approvals') return envelope([])
        if (url === '/v1/tasks') return envelope([])
        if (url === '/v1/audit/sessions/sess_api_1') {
          return envelope({
            events: [
              {
                id: 'audit_api_1',
                type: 'integration_event',
                actorType: 'System',
                createdAt: '2026-04-29T12:00:00-03:00'
              }
            ]
          })
        }
        if (
          url ===
          '/v1/observability/audit-evidence?sessionId=sess_api_1&limit=10&offset=0'
        ) {
          return envelope({
            summary: {
              totalEvents: 2,
              byType: { integration_event: 1, approval_decision: 1 },
              byActorType: { System: 1, Approver: 1 },
              byCorrelationId: {
                'corr_00000000-0000-4000-8000-000000000001': 2
              },
              bySessionId: { sess_api_1: 2 }
            },
            page: {
              items: [
                {
                  id: 'evidence_api_1',
                  type: 'approval_decision',
                  actorId: 'approver.shift-a',
                  actorType: 'Approver',
                  correlationId: 'corr_00000000-0000-4000-8000-000000000001',
                  createdAt: '2026-04-29T12:03:00-03:00',
                  payload: {
                    sessionId: 'sess_api_1',
                    effect: 'approval_state_only'
                  }
                }
              ],
              pageInfo: {
                limit: 10,
                offset: 0,
                total: 2,
                hasNextPage: false
              }
            },
            export: {
              format: 'json',
              controlled: true,
              externalDispatch: false,
              requestedBy: operatorId
            },
            governance: {
              retention: {
                policyId: 'controlled-construction-audit-retention-v1',
                approvedForRealData: false,
                humanSignoffRequired: true
              },
              payload: {
                mode: 'minimized',
                rawPayloadReturned: false,
                redactedFields: ['body']
              },
              export: {
                externalDispatch: false,
                externalExportRequiresApproval: true
              }
            }
          })
        }
        return Promise.reject(new Error(`Unexpected URL ${url}`))
      })

      render(<App />)
      enterOperatorIdentity(operatorId, role)

      expect(await screen.findByText('Evidencias de auditoria')).toBeTruthy()
      expect(await screen.findByText('2 eventos controlados')).toBeTruthy()
      expect(await screen.findByText('Export JSON controlado')).toBeTruthy()
      expect(await screen.findByText('Sem despacho externo')).toBeTruthy()
      expect(await screen.findByText(/Dados reais bloqueados/)).toBeTruthy()
      expect(await screen.findByText('approval_decision')).toBeTruthy()
      expect(
        await screen.findByText('corr_00000000-0000-4000-8000-000000000001')
      ).toBeTruthy()
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/v1/observability/audit-evidence?sessionId=sess_api_1&limit=10&offset=0',
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-operator-id': operatorId,
            'x-operator-role': role
          })
        })
      )
      expect(globalThis.fetch).not.toHaveBeenCalledWith(
        expect.stringContaining('/export'),
        expect.anything()
      )
    }
  )

  it('paginates controlled audit evidence and requests export through approval workflow only', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = String(input)
      if (url === '/v1/conversations?limit=25&offset=0') {
        return envelope({
          items: [
            {
              id: 'conv_api_1',
              channel: 'whatsapp',
              senderRef: 'fixture-sender',
              status: 'active',
              correlationId: 'corr_00000000-0000-4000-8000-000000000001',
              openSessionId: 'sess_api_1',
              lastMessageBody: 'Evidencia paginada',
              lastMessageAt: '2026-04-29T12:00:00-03:00',
              updatedAt: '2026-04-29T12:00:00-03:00'
            }
          ],
          pageInfo: { limit: 25, offset: 0, total: 1, hasNextPage: false }
        })
      }
      if (url === '/v1/conversations/conv_api_1/timeline')
        return envelope({ messages: [] })
      if (url === '/v1/tasks') return envelope([])
      if (url === '/v1/audit/sessions/sess_api_1') {
        return envelope({
          events: [
            {
              id: 'audit_api_1',
              type: 'integration_event',
              actorType: 'System',
              createdAt: '2026-04-29T12:00:00-03:00'
            }
          ]
        })
      }
      if (url === '/v1/approvals' && !init?.method) return envelope([])
      if (url === '/v1/approvals' && init?.method === 'POST') {
        expect(init).toMatchObject({
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-operator-id': 'supervisor.audit',
            'x-operator-role': 'Supervisor'
          }
        })
        expect(JSON.parse(String(init.body))).toEqual({
          sessionId: 'sess_api_1',
          proposedAction: 'audit_evidence_export_review',
          summary:
            'Solicitar revisao humana para export controlado de audit evidence da sessao sess_api_1 sem despacho externo.',
          riskLevel: 'high'
        })
        return envelope({
          id: 'approval_export_1',
          sessionId: 'sess_api_1',
          proposedAction: 'audit_evidence_export_review',
          summary: 'Export controlado sem despacho externo',
          riskLevel: 'high',
          status: 'pending'
        })
      }
      if (
        url ===
        '/v1/observability/audit-evidence?sessionId=sess_api_1&limit=10&offset=0'
      ) {
        return envelope({
          summary: {
            totalEvents: 12,
            byType: { integration_event: 10, policy_decision: 2 },
            byActorType: { System: 12 },
            byCorrelationId: {
              'corr_00000000-0000-4000-8000-000000000001': 12
            },
            bySessionId: { sess_api_1: 12 }
          },
          page: {
            items: [
              {
                id: 'evidence_api_1',
                type: 'integration_event',
                actorType: 'System',
                correlationId: 'corr_00000000-0000-4000-8000-000000000001',
                createdAt: '2026-04-29T12:00:00-03:00'
              }
            ],
            pageInfo: {
              limit: 10,
              offset: 0,
              total: 12,
              hasNextPage: true
            }
          },
          export: {
            format: 'json',
            controlled: true,
            externalDispatch: false,
            requestedBy: 'supervisor.audit'
          }
        })
      }
      if (
        url ===
        '/v1/observability/audit-evidence?sessionId=sess_api_1&limit=10&offset=10'
      ) {
        return envelope({
          summary: {
            totalEvents: 12,
            byType: { integration_event: 10, policy_decision: 2 },
            byActorType: { System: 12 },
            byCorrelationId: {
              'corr_00000000-0000-4000-8000-000000000001': 12
            },
            bySessionId: { sess_api_1: 12 }
          },
          page: {
            items: [
              {
                id: 'evidence_api_11',
                type: 'policy_decision',
                actorType: 'System',
                correlationId: 'corr_00000000-0000-4000-8000-000000000001',
                createdAt: '2026-04-29T12:10:00-03:00'
              }
            ],
            pageInfo: {
              limit: 10,
              offset: 10,
              total: 12,
              hasNextPage: false
            }
          },
          export: {
            format: 'json',
            controlled: true,
            externalDispatch: false,
            requestedBy: 'supervisor.audit'
          }
        })
      }
      return Promise.reject(new Error(`Unexpected URL ${url}`))
    })

    render(<App />)
    enterOperatorIdentity('supervisor.audit', 'Supervisor')

    expect(await screen.findByText('Evidencias 1-10 de 12')).toBeTruthy()
    expect(await screen.findAllByText('integration_event')).toHaveLength(2)
    fireEvent.click(
      screen.getByRole('button', { name: 'Proxima pagina de evidencias' })
    )

    expect(await screen.findByText('Evidencias 11-12 de 12')).toBeTruthy()
    expect(await screen.findByText('policy_decision')).toBeTruthy()
    fireEvent.click(
      screen.getByRole('button', { name: 'Pagina anterior de evidencias' })
    )
    expect(await screen.findByText('Evidencias 1-10 de 12')).toBeTruthy()

    fireEvent.click(
      screen.getByRole('button', { name: 'Solicitar export controlado' })
    )

    expect(
      await screen.findByText(
        'Solicitacao de export registrada para aprovacao humana.'
      )
    ).toBeTruthy()
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/v1/observability/audit-evidence?sessionId=sess_api_1&limit=10&offset=10',
      expect.any(Object)
    )
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/v1/approvals',
      expect.objectContaining({ method: 'POST' })
    )
    expect(globalThis.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/export'),
      expect.anything()
    )
  })

  it.each([
    ['Operator', 'operator.audit'],
    ['Approver', 'approver.audit']
  ])(
    'keeps audit evidence review locked for %s identities',
    async (role, operatorId) => {
      vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
        const url = String(input)
        if (url === '/v1/conversations?limit=25&offset=0') {
          return envelope({
            items: [
              {
                id: 'conv_api_1',
                channel: 'whatsapp',
                senderRef: 'fixture-sender',
                status: 'active',
                correlationId: 'corr_00000000-0000-4000-8000-000000000001',
                openSessionId: 'sess_api_1',
                lastMessageBody: 'Auditoria limitada',
                lastMessageAt: '2026-04-29T12:00:00-03:00',
                updatedAt: '2026-04-29T12:00:00-03:00'
              }
            ],
            pageInfo: { limit: 25, offset: 0, total: 1, hasNextPage: false }
          })
        }
        if (url === '/v1/conversations/conv_api_1/timeline')
          return envelope({ messages: [] })
        if (url === '/v1/approvals') return envelope([])
        if (url === '/v1/tasks') return envelope([])
        if (url === '/v1/audit/sessions/sess_api_1')
          return envelope({ events: [] })
        return Promise.reject(new Error(`Unexpected URL ${url}`))
      })

      render(<App />)
      enterOperatorIdentity(operatorId, role)

      expect(
        await screen.findByText(
          'Revisao de evidencia restrita a Supervisor/Admin.'
        )
      ).toBeTruthy()
      expect(globalThis.fetch).not.toHaveBeenCalledWith(
        expect.stringContaining('/v1/observability/audit-evidence'),
        expect.anything()
      )
    }
  )

  it('renders error states without falling back to static fixtures', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new Error('API indisponivel')
    )

    render(<App />)
    enterOperatorIdentity()

    expect(screen.getAllByText('Conversas')).toHaveLength(1)
    expect(screen.getAllByText('Aprovacoes')).toHaveLength(1)
    expect(screen.getAllByText('Tarefas')).toHaveLength(1)
    expect(screen.getAllByText('Auditoria')).toHaveLength(1)
    expect(
      await screen.findAllByText('Erro ao carregar dados operacionais.')
    ).toHaveLength(4)
  })
})
