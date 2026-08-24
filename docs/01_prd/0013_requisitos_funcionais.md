# 0013 — Requisitos Funcionais

## Atendimento e sessoes

- RF-001: receber mensagem de canal conectado por adapter.
- RF-002: criar conversa.
- RF-003: criar ou retomar sessao.
- RF-004: registrar mensagens recebidas e enviadas.
- RF-005: manter historico consultavel.

## Classificacao e workflows

- RF-010: identificar intencao.
- RF-011: executar workflow LangGraph correspondente.
- RF-012: manter estado do workflow.
- RF-013: registrar agent run.
- RF-014: interromper fluxo quando policy exigir handoff.

## Tutor e pet

- RF-020: buscar tutor por telefone.
- RF-021: criar draft de tutor.
- RF-022: buscar paciente.
- RF-023: criar draft de paciente.
- RF-024: vincular paciente a conversa quando a confianca for suficiente.

## Triagem

- RF-030: coletar dados basicos da demanda.
- RF-031: classificar risco operacional.
- RF-032: bloquear diagnostico e prescricao.
- RF-033: orientar escalonamento de emergencia quando aplicavel.

## Agendamento

- RF-040: consultar slots disponiveis.
- RF-041: sugerir horario.
- RF-042: criar draft de appointment.
- RF-043: solicitar aprovacao para confirmacao quando regra exigir.

## Handoff e approvals

- RF-050: criar resumo de handoff.
- RF-051: criar approval request.
- RF-052: registrar aprovacao, rejeicao ou assuncao humana.
- RF-053: escalar conversa para humano.

## Tarefas

- RF-060: criar tarefa interna.
- RF-061: vincular tarefa a conversa, sessao e contato.
- RF-062: registrar status da tarefa.

## Auditoria

- RF-070: registrar tool calls.
- RF-071: registrar safety events.
- RF-072: registrar integration events.
- RF-073: permitir investigacao por conversa, sessao, tool call e approval.

## Painel minimo

- RF-080: listar conversas.
- RF-081: exibir fila de approvals.
- RF-082: exibir tarefas internas.
- RF-083: permitir acao humana sobre approvals.
- RF-084: exibir resumo de handoff.
