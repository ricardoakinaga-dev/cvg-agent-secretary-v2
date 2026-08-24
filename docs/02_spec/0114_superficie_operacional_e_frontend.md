# 0114 — Superficie Operacional e Frontend

## Superficies do sistema

- Painel de conversas.
- Timeline de conversa.
- Fila de approvals.
- Tarefas internas.
- Auditoria de sessao.
- Configuracao basica de policy e canais.

## Painel de conversas

- Objetivo: acompanhar conversas e status.
- Dados: conversationId, canal, contato, status, ultima mensagem, risco.
- Acoes: abrir timeline, assumir conversa.
- Estados: vazio, carregando, erro de API, lista paginada.

## Timeline

- Objetivo: investigar atendimento.
- Dados: mensagens, sessoes, agent runs, tool calls, approvals e handoffs.
- Acoes: criar handoff, criar tarefa, assumir.
- Validacoes: operador autorizado.

## Fila de approvals

- Objetivo: decidir acoes sensiveis.
- Dados: acao proposta, resumo, risco, contexto, horario.
- Acoes: aprovar, rejeitar, assumir.
- Validacoes: permissao de approver e status pending.

## Tarefas internas

- Objetivo: acompanhar pendencias.
- Dados: titulo, prioridade, origem, status, responsavel sugerido.
- Acoes: iniciar, concluir, cancelar.

## Auditoria

- Objetivo: entender o sistema sem ler codigo.
- Dados: correlation id, eventos, policy, workflow, tool calls e erros.
- Acoes: filtrar, exportar relatorio quando permitido.

## Riscos de inconsistencia

- UI permitir acao nao autorizada pela API.
- Timeline omitir safety event.
- Approval mostrar contexto insuficiente.
- Tarefa nao vinculada a sessao.
